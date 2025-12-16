import { XNewsScraper } from './XNewsScraper.js';
import { XNewsItem, XScrapingResult } from './interfaces.js';
import path from 'path';
import fs from 'fs';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export class XScraperService {
  private scraper: XNewsScraper;
  private pool: Pool;

  constructor() {
    this.scraper = new XNewsScraper();
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'financial_analyst',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
    });
  }

  /**
   * NOTE: La catégorisation est maintenant basée uniquement sur le fichier OPML source:
   * - ia.opml -> catégorie "IA"
   * - finance-x.opml -> catégorie "FINANCE"
   * Cette méthode est conservée comme fallback mais ne devrait plus être utilisée.
   */
  private getDefaultCategory(): string {
    return 'UNKNOWN';
  }

  /**
   * Run X/Twitter scraping with full lifecycle
   */
  async runScraping(opmlPath?: string, forcedCategory?: string, onBatchComplete?: (items: XNewsItem[]) => Promise<void>, maxFeeds?: number): Promise<XScrapingResult> {
    try {
      console.log(`=== Starting X/Twitter Scraper Service (Category: ${forcedCategory || 'Auto'}) ===`);

      await this.scraper.init();
      
      // Define internal callback to classify items before passing to external callback
      const internalBatchCallback = async (batchItems: XNewsItem[]) => {
        // Assigner la catégorie forcée (basée sur le fichier OPML source)
        for (const item of batchItems) {
          item.category = forcedCategory || 'UNKNOWN';
        }
        
        // Pass classified items to external callback if provided
        if (onBatchComplete) {
          await onBatchComplete(batchItems);
        }
      };

      const result = await this.scraper.scrapeFromOpml(opmlPath, internalBatchCallback, maxFeeds);

      // Assigner la catégorie finale (basée sur le fichier OPML source)
      console.log(`🏷️  Catégorie assignée: ${forcedCategory || 'UNKNOWN'}`);
      for (const item of result.items) {
        if (!item.category) {
          item.category = forcedCategory || 'UNKNOWN';
        }
      }

      console.log(`=== X Scraper Results with Categories ===`);
      console.log(`Success: ${result.success}`);
      console.log(`Total Items: ${result.totalItems}`);
      console.log(`Processed Feeds: ${result.processedFeeds}`);
      console.log(`Errors: ${result.errors.length}`);

      if (result.errors.length > 0) {
        console.log('Errors:');
        result.errors.forEach(error => console.log(` - ${error}`));
      }

      return result;
    } catch (error: any) {
      console.error('X Scraper Service failed:', error);
      return {
        success: false,
        items: [],
        errors: [`Service error: ${error instanceof Error ? error.message : String(error)}`],
        processedFeeds: 0,
        totalItems: 0,
      };
    } finally {
      await this.scraper.close();
    }
  }

  /**
   * Save scraped items to JSON file
   */
  async saveToJson(items: XNewsItem[], outputPath?: string): Promise<void> {
    const filePath = outputPath || path.join(process.cwd(), 'x_news_items_with_categories.json');

    try {
      const data = {
        scraped_at: new Date().toISOString(),
        total_items: items.length,
        items: items,
      };

      await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
      console.log(`📄 Saved ${items.length} X items with categories to ${filePath}`);
    } catch (error) {
      console.error(`Failed to save X items to ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Extract author name from X/Twitter source
   */
  private extractAuthorFromSource(source: string): string | null {
    // Try to extract author name from source string
    // Common patterns: "X - Author Name", "X - @username", "X - Full Name (@username)"
    const patterns = [
      /X\s*-\s*([^@]+)/i, // "X - Author Name"
      /X\s*-\s*@(\w+)/i, // "X - @username"
      /X\s*-\s*([^(]+)\s*\(@\w+\)/i, // "X - Full Name (@username)"
      /X\s*-\s*([^)]+)/i, // "X - Anything in parentheses"
    ];

    for (const pattern of patterns) {
      const match = source.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Apply author diversity filtering to prevent over-representation
   */
  private applyAuthorDiversityFilter(items: XNewsItem[]): XNewsItem[] {
    if (items.length <= 3) {
      return items; // No filtering for small sets
    }

    const authorCounts: Record<string, number> = {};
    const authorItems: Record<string, XNewsItem[]> = {};

    // Count items per author
    for (const item of items) {
      const author = this.extractAuthorFromSource(item.source);
      if (!author) continue;

      const normalizedAuthor = author.toLowerCase().replace(/[@()]/g, '').trim();
      authorCounts[normalizedAuthor] = (authorCounts[normalizedAuthor] || 0) + 1;
      if (!authorItems[normalizedAuthor]) {
        authorItems[normalizedAuthor] = [];
      }
      authorItems[normalizedAuthor].push(item);
    }

    // Filter out authors with too many posts
    const filteredItems: XNewsItem[] = [];
    const maxPostsPerAuthor = 2; // Limit to 2 posts per author per scrape cycle

    for (const [author, count] of Object.entries(authorCounts)) {
      if (count <= maxPostsPerAuthor) {
        // Keep all items from authors with <= max posts
        if (authorItems[author]) {
          filteredItems.push(...authorItems[author]);
        }
      } else {
        // For authors with too many posts, keep only the most recent ones
        const authorPosts = authorItems[author] || [];
        const sortedPosts = authorPosts.sort((a, b) =>
          new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
        );
        filteredItems.push(...sortedPosts.slice(0, maxPostsPerAuthor));
      }
    }

    // Add items from authors we couldn't identify
    const unidentifiedItems = items.filter(item => !this.extractAuthorFromSource(item.source));
    filteredItems.push(...unidentifiedItems);

    console.log(`🎯 Author diversity filter applied: ${items.length} → ${filteredItems.length} items`);
    console.log(`📊 Author distribution: ${Object.keys(authorCounts).length} unique authors`);

    return filteredItems;
  }

  /**
   * Save scraped items to Database with category classification
   */
  async saveToDatabase(items: XNewsItem[]): Promise<void> {
    if (items.length === 0) return;

    // Apply author diversity filtering first
    const filteredItems = this.applyAuthorDiversityFilter(items);

    const client = await this.pool.connect();
    try {
      console.log(`💾 Saving ${filteredItems.length} items to database with X-category classification...`);

      // Ensure table exists with category column
      await client.query(`
        CREATE TABLE IF NOT EXISTS news_items (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            title VARCHAR(1000) NOT NULL,
            source VARCHAR(1000) NOT NULL,
            url TEXT,
            content TEXT,
            sentiment VARCHAR(20),
            category VARCHAR(50),
            published_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            processing_status VARCHAR(50),
            relevance_score INTEGER,
            published_to_discord BOOLEAN DEFAULT FALSE,
            UNIQUE(title, source, published_at)
        );
      `);

      let savedCount = 0;
      const categoryCounts: Record<string, number> = {
        'IA': 0,
        'FINANCE': 0,
        'UNKNOWN': 0,
      };

      for (const item of filteredItems) {
        try {
          // Utiliser la catégorie déjà assignée (basée sur le fichier OPML source)
          const category = item.category || 'UNKNOWN';
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;

          // Calculate dynamic relevance score
          const text = `${item.title} ${item.content || ''}`.toLowerCase();
          let matchCount = 0;
          const allKeywords = [
            'ai',
            'artificial intelligence',
            'machine learning',
            'llm',
            'gpt',
            'openai', // AI
            'finance',
            'market',
            'stock',
            'trading',
            'crypto',
            'bitcoin',
            'economy', // Finance
            'tech',
            'software',
            'developer',
            'nvidia',
            'amd',
            'google',
            'microsoft', // Tech
            'robot',
            'tesla',
            'optimus', // Robotics
          ];

          allKeywords.forEach(k => {
            if (text.includes(k)) matchCount++;
          });

          // Base score 6, +1 for every 2 keywords found, max 9
          let dynamicScore = 6 + Math.floor(matchCount / 2);
          if (dynamicScore > 9) dynamicScore = 9;
          if (matchCount === 0) dynamicScore = 5; // Low relevance if no keywords

          await client.query(
            `
                INSERT INTO news_items (title, source, url, content, sentiment, category, published_at, processing_status, relevance_score, published_to_discord)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE)
                ON CONFLICT (title, source, published_at)
                DO UPDATE SET
                  content = EXCLUDED.content,
                  url = EXCLUDED.url,
                  category = EXCLUDED.category,
                  processing_status = EXCLUDED.processing_status,
                  relevance_score = GREATEST(news_items.relevance_score, EXCLUDED.relevance_score),
                  updated_at = NOW()
                WHERE
                  news_items.content IS NULL
                  OR length(news_items.content) < 50
                  OR length(EXCLUDED.content) > length(COALESCE(news_items.content, ''))
                  OR news_items.category IS NULL
                  OR news_items.category != EXCLUDED.category
            `,
            [
              item.title,
              item.source,
              item.url,
              item.content || null,
              item.sentiment || 'neutral',
              category,
              item.published_at,
              'processed',
              dynamicScore,
            ]
          );
          savedCount++;
        } catch (_e) {
          console.warn(`Failed to save item: ${item.title}`, _e);
        }
      }
      console.log(`✅ Successfully saved ${savedCount} items to database`);
      console.log(`📊 Category distribution:`);
      Object.entries(categoryCounts).forEach(([category, count]) => {
        if (count > 0) {
          console.log(`   • ${category}: ${count} items`);
        }
      });
    } catch (error) {
      console.error('❌ Database error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close scraper service
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Get default OPML file path
   */
  getDefaultOpmlPath(): string {
    return path.join(process.cwd(), 'ia.opml');
  }

  /**
   * Check if OPML file exists
   */
  async opmlFileExists(opmlPath?: string): Promise<boolean> {
    const pathToCheck = opmlPath || this.getDefaultOpmlPath();
    try {
      await fs.promises.access(pathToCheck);
      return true;
    } catch {
      return false;
    }
  }
}

// Standalone execution
// Standalone execution
// console.log('Checking execution context:', process.argv[1]);
const isRunningDirectly = 
  process.argv[1] && (
    process.argv[1].endsWith('XScraperService.ts') || 
    process.argv[1].endsWith('XScraperService_fixed.ts')
  );

if (isRunningDirectly) {
  const service = new XScraperService();

  const opmlPath = process.argv[2];

  service
    .opmlFileExists(opmlPath)
    .then((exists: boolean) => {
      if (!exists) {
        console.error('OPML file not found:', opmlPath || service.getDefaultOpmlPath());
        process.exit(1);
      }

      return service.runScraping(opmlPath);
    })
    .then(async (result: XScrapingResult) => {
      if (result.success && result.items.length > 0) {
        await service.saveToJson(result.items);
        await service.saveToDatabase(result.items);
        console.log('✅ X scraping with categories completed successfully');
      } else {
        console.log('⚠️  X scraping completed with no items or errors');
      }
      await service.close();
      process.exit(0);
    })
    .catch(async (error: unknown) => {
      console.error('❌ X scraping service failed:', error);
      await service.close();
      process.exit(1);
    });
}
