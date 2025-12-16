import { BaseAgentSimple } from './BaseAgentSimple';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import { appendFileSync } from 'fs';
import pathModule from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { XScraperService } from '../../x_scraper/XScraperService.js';
import { XNewsItem, XScrapingResult } from '../../x_scraper/interfaces.js';
import { XNewsScraper } from '../../x_scraper/XNewsScraper.js';
import { SimplePublisherOptimized } from '../../discord_bot/SimplePublisherOptimized.js';
import { AgeFilterService } from './AgeFilterService.js';

dotenv.config();

interface NewsItemToFilter {
  id: string;
  title: string;
  content: string;
  source: string;
  relevance_score?: number;
  processing_status?: string;
  category?: string;
  published_at?: string;
}

interface FilterResult {
  id: string;
  relevance_score: number;
  processing_status: 'RELEVANT' | 'IRRELEVANT';
  summary: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export class NewsFilterAgentOptimized extends BaseAgentSimple {
  private pool: Pool;
  private xScraperService: XScraperService;
  private logPath = pathModule.join(process.cwd(), 'logs', 'agent_errors.jsonl');

  // Configuration optimisée
  private readonly BATCH_SIZE = 15; // Augmenté de 3 à 15
  private readonly PARALLEL_BATCHES = 3; // Traitement parallèle
  private readonly MIN_RELEVANCE_SCORE = 4; // Éliminer les scores < 4 (harmonisé avec publisher)
  private readonly MAX_POSTS_PER_SOURCE_PER_HOUR = 3; // Quota par source
  private readonly PROCESSING_DELAY = 1000; // Delay between batches
  private scraper: XNewsScraper;
  private publisher: SimplePublisherOptimized;
  private ageFilter: AgeFilterService;
  private isProcessing: boolean = false;
  private isTestMode: boolean = false;

  constructor() {
    super('NewsFilterAgentOptimized');
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'financial_analyst',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '9022',
    });

    // Check for Test Mode flag
    this.isTestMode = process.argv.includes('--test-mode');
    if (this.isTestMode) {
        console.log('🧪 RUNNING IN TEST MODE: Limited scraping, strict logging.');
    }

    this.xScraperService = new XScraperService();
    this.scraper = new XNewsScraper();
    this.publisher = new SimplePublisherOptimized();
    this.ageFilter = AgeFilterService.getInstance({
      maxAgeDays: 5,              // 5 jours max par défaut
      maxAgeHours: 48,             // 2 jours pour posts récents
      strategies: {
        allowHistoricalReferences: false,
        blockCalendarEvents: true,
        blockPromotional: true,
        allowAnalysisContent: true
      }
    });
  }

  private logError(context: string, error: string, itemId?: string) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'AGENT_ERROR',
      agent: 'NewsFilterAgentOptimized',
      context: context,
      itemId: itemId || null,
      error: error
    };
    try {
      appendFileSync(this.logPath, JSON.stringify(logEntry) + '\n');
    } catch (e) {
      console.error(`[${this.agentName}] ❌ Failed to write to error log:`, e);
    }
  }

  public async runFilterCycle(opmlFile?: string): Promise<void> {
    console.log(`[${this.agentName}] Starting OPTIMIZED filter cycle with enhanced logic...`);

    try {
      // Step 1: Scrape fresh X/Twitter news first
      console.log(`[${this.agentName}] 🐦 Scraping fresh X/Twitter news...`);
      await this.scrapeAndSaveXNews(opmlFile);

      // Step 2: Pre-filter items before processing
      console.log(`[${this.agentName}] 🎯 Pre-filtering items before AI processing...`);
      await this.preFilterLowQualityItems();

      // Step 3: Process pending items with enhanced batching
      console.log(`[${this.agentName}] 📋 Fetching pending items for optimized filtering...`);
      const pendingItems = await this.fetchPendingItems();
      if (pendingItems.length === 0) {
        console.log(`[${this.agentName}] No pending items to filter.`);
        // STILL TRIGGER PUBLISHER to check existing processed items
        console.log(`[${this.agentName}] 🔄 Still triggering publisher check...`);
        await this.checkAndTriggerPublisherOptimized();
        return;
      }

      console.log(`[${this.agentName}] Found ${pendingItems.length} pending items for filtering.`);

      // Step 4: Process with larger parallel batches
      await this.processBatchParallelOptimized(pendingItems);

      console.log(
        `[${this.agentName}] ✅ OPTIMIZED filter cycle completed: ${pendingItems.length} items processed`
      );

      // Step 5: Check and trigger publisher with lower threshold
      console.log(`[${this.agentName}] 🔄 TRIGGERING PUBLISHER CHECK...`);
      await this.checkAndTriggerPublisherOptimized();
      console.log(`[${this.agentName}] ✅ Publisher check completed`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logError('runFilterCycle', errorMsg);
      console.error(`[${this.agentName}] ❌ Error in optimized filter cycle:`, error);
    }
  }

  /**
   * Pre-filter low quality items before AI processing
   */
  private async preFilterLowQualityItems(): Promise<void> {
    const client = await this.pool.connect();
    try {
      console.log(`[${this.agentName}] 🗑️  Pre-filtering low quality items (score < ${this.MIN_RELEVANCE_SCORE})...`);

      // Archive items with very low potential scores based on simple heuristics
      const result = await client.query(`
        UPDATE news_items
        SET processing_status = 'archived',
            relevance_score = 1
        WHERE processing_status = 'raw'
          AND (
            LENGTH(title) < 20
            OR LENGTH(content) < 50
            OR title ~* '^(test|hello|wow|lol|omg|test message|sample|example)'
            OR content ~* '^(test|hello|wow|lol|omg|test message|sample|example)'
            OR title ~* '(bot|automatic|generated|auto).*post'
            OR source IN ('Test', 'Sample', 'Demo')
          )
        RETURNING id
      `);

      if (result.rowCount && result.rowCount > 0) {
        console.log(`[${this.agentName}] 🗑️  Archived ${result.rowCount} low-quality items before AI processing`);
      }

    } finally {
      client.release();
    }
  }

  /**
   * Enhanced source quota management
   */
  private async applySourceQuota(items: NewsItemToFilter[]): Promise<NewsItemToFilter[]> {
    const client = await this.pool.connect();
    try {
      const filteredItems: NewsItemToFilter[] = [];
      const sourceCounts = new Map<string, number>();

      for (const item of items) {
        const sourceKey = item.source || 'unknown';
        const currentCount = sourceCounts.get(sourceKey) || 0;

        // Check quota per source
        const recentPostsFromSource = await client.query(`
          SELECT COUNT(*) as count
          FROM news_items
          WHERE source = $1
            AND created_at >= NOW() - INTERVAL '1 hour'
            AND processing_status = 'processed'
            AND relevance_score >= 6
        `, [sourceKey]);

        const recentCount = parseInt(recentPostsFromSource.rows[0]?.count || '0');

        // Allow item if within quota or if it has high potential
        if (recentCount < this.MAX_POSTS_PER_SOURCE_PER_HOUR ||
            this.isHighPriorityItem(item)) {
          filteredItems.push(item);
          sourceCounts.set(sourceKey, currentCount + 1);
        } else {
          console.log(`[${this.agentName}] 🚫 Skipping ${item.source} - quota exceeded (${recentCount}/${this.MAX_POSTS_PER_SOURCE_PER_HOUR})`);
        }
      }

      console.log(`[${this.agentName}] 📊 Source quota applied: ${filteredItems.length}/${items.length} items kept`);
      return filteredItems;

    } finally {
      client.release();
    }
  }

  /**
   * Check if an item is high priority based on heuristics
   */
  private isHighPriorityItem(item: NewsItemToFilter): boolean {
    const title = (item.title || '').toLowerCase();
    const content = (item.content || '').toLowerCase();

    // High priority keywords
    const highPriorityKeywords = [
      'breaking', 'urgent', 'alert', 'exclusive', 'developing',
      'fed', 'ecb', 'inflation', 'rate cut', 'hike', 'gdp',
      'earnings', 'merger', 'acquisition', 'ipo', 'bankruptcy',
      'launch', 'release', 'announcement', 'unveiling', 'released'
    ];

    return highPriorityKeywords.some(keyword =>
      title.includes(keyword) || content.includes(keyword)
    );
  }

  /**
   * Check if a news item has a future date (common with TradingEconomics calendar events)
   */
  private isFutureDatedPost(item: NewsItemToFilter): boolean {
    try {
      // Get the published_at date or use current date as fallback
      const publishedAt = item.published_at ? new Date(item.published_at) : new Date();
      const now = new Date();

      // Consider a post future-dated if it's more than 1 hour in the future
      // This handles timezone issues and slight clock differences
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      return publishedAt > oneHourFromNow;
    } catch (error) {
      // If date parsing fails, assume it's not future-dated
      console.warn(`[${this.agentName}] Failed to parse date for future check:`, item.published_at);
      return false;
    }
  }

  /**
   * Get dynamic cutoff date (5 days before today)
   */
  private getDynamicCutoffDate(): Date {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    cutoffDate.setHours(0, 0, 0, 0); // Start of day
    return cutoffDate;
  }

  /**
   * Check if a news item is too old (> 5 days) - ULTRA STRICT FILTER
   */
  private isTooOldPost(item: NewsItemToFilter): boolean {
    try {
      const content = (item.content || '').toLowerCase();
      const title = (item.title || '').toLowerCase();
      const publishedAt = item.published_at ? new Date(item.published_at) : null;

      // DYNAMIC CUTOFF: 5 days before today
      if (publishedAt) {
        const cutoffDate = this.getDynamicCutoffDate();

        if (publishedAt < cutoffDate) {
          console.log(`[${this.agentName}] 🗑️ ULTRA REJECT: Post trop ancien (${publishedAt.toISOString()} < ${cutoffDate.toISOString()}): ${item.title.substring(0, 40)}...`);
          return true;
        }
      }

      // Also reject ECO CALENDAR posts (they pollute the feed)
      const isEcoCalendar = title.includes('[eco cal') || title.includes('eco calendar') ||
                           content.includes('eco calendar') || content.includes('calendar event');
      if (isEcoCalendar) {
        console.log(`[${this.agentName}] 🗑️ ULTRA REJECT: ECO CALENDAR post: ${item.title.substring(0, 40)}...`);
        return true;
      }

      return false;
    } catch (error) {
      // If date parsing fails, reject to be safe
      console.warn(`[${this.agentName}] ⚠️ Date parse failed, rejecting post:`, item.published_at);
      return true;
    }
  }

  /**
   * Optimized parallel batch processing
   */
  private async processBatchParallelOptimized(items: NewsItemToFilter[]): Promise<void> {
    // Apply source quota filtering first
    const quotaFilteredItems = await this.applySourceQuota(items);

    // Create batches of increased size
    const batches: NewsItemToFilter[][] = [];
    for (let i = 0; i < quotaFilteredItems.length; i += this.BATCH_SIZE) {
      batches.push(quotaFilteredItems.slice(i, i + this.BATCH_SIZE));
    }

    console.log(`[${this.agentName}] 📦 Processing ${batches.length} optimized batches of ${this.BATCH_SIZE} items each`);

    // Process batches with limited parallelism
    const promises: Promise<void>[] = [];
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      // Add delay between starting batches
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, this.PROCESSING_DELAY));
      }

      const promise = this.processBatchOptimized(batch, i + 1, batches.length);
      promises.push(promise);

      // Limit parallel batches
      if (promises.length >= this.PARALLEL_BATCHES) {
        await Promise.all(promises);
        promises.length = 0; // Clear promises
      }
    }

    // Process remaining promises
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }

  /**
   * Optimized batch processing with enhanced logic
   */
  private async processBatchOptimized(batch: NewsItemToFilter[], batchNum: number, totalBatches: number): Promise<void> {
    console.log(
      `[${this.agentName}] Processing optimized batch ${batchNum}/${totalBatches} (${batch.length} items)`
    );

    // ENHANCED AGE FILTERING with AgeFilterService
    console.log(`[${this.agentName}] 🔍 Applying enhanced age filtering...`);
    const ageFilterResults = await this.ageFilter.filterBatch(batch);

    const validItems = ageFilterResults
      .filter(result => result.shouldKeep)
      .map(result => result.originalItem);

    const rejectedItems = ageFilterResults
      .filter(result => !result.shouldKeep);

    if (rejectedItems.length > 0) {
      console.log(`[${this.agentName}] 🗑️ Enhanced filter rejected ${rejectedItems.length} items:`);

      // Group by reason for clearer logging
      const reasons: Record<string, number> = {};
      for (const rejected of rejectedItems) {
        const reason = rejected.reason || 'Unknown';
        reasons[reason] = (reasons[reason] || 0) + 1;

        // Log first few items for debugging
        if (Object.values(reasons).reduce((a, b) => a + b, 0) <= 10) {
          console.log(`   • ${reason} - ${rejected.originalItem.title?.substring(0, 40)}...`);
        }
      }

      // Summary by reason
      for (const [reason, count] of Object.entries(reasons)) {
        console.log(`   ${reason}: ${count} items`);
      }
    }

    // Archiving rejected items in database
    if (rejectedItems.length > 0) {
      console.log(`[${this.agentName}] 🗄️ Archiving ${rejectedItems.length} rejected items...`);
      const client = await this.pool.connect();
      try {
        for (const rejected of rejectedItems) {
          const item = rejected.originalItem;
          await client.query(`
            UPDATE news_items
            SET processing_status = 'archived',
                relevance_score = 0,
                content = COALESCE(content, $1)
            WHERE id = $2
          `, [`${rejected.reason} - Archived by age filter`, item.id]);
        }
      } catch (e) {
        console.error(`[${this.agentName}] Error archiving rejected items:`, e);
      } finally {
        client.release();
      }
    }

    if (validItems.length === 0) {
        console.log(`[${this.agentName}] No valid items remaining in batch after future/old check.`);
        return;
    }

    const prompt = this.buildOptimizedPrompt(validItems);

    const req = {
      prompt,
      outputFile: `data/agent-data/${this.agentName}/batch_${Date.now()}_${batchNum}.json`,
    };

    try {
      const results = await this.executeAndParseOptimized(req);
      await this.updateDatabaseOptimized(results);
    } catch (error) {
      console.error(`[${this.agentName}] Failed to process optimized batch ${batchNum}:`, error);
      // Mark items as error instead of leaving them raw
      await this.markBatchAsError(validItems);
    }
  }

  /**
   * Optimized prompt with better instructions
   */
  private buildOptimizedPrompt(batch: NewsItemToFilter[]): string {
    const itemsJson = JSON.stringify(
      batch.map(b => ({
        id: b.id,
        title: b.title,
        content: b.content?.substring(0, 800) || b.title, // Increased content limit
        source: b.source,
        published_at: b.published_at,
      })),
      null,
      2
    );

    return `
You are an expert financial content curator with access to real-time market intelligence.
Your task is to filter and prioritize the following news items based on their relevance to:

1. HIGH IMPACT MARKET NEWS (Fed decisions, earnings, M&A, economic data)
2. ARTIFICIAL INTELLIGENCE breakthroughs (major releases, research, funding)
3. SIGNIFICANT TECH DEVELOPMENTS (product launches, partnerships, regulations)

SCORING SYSTEM (STRICT):
- 💎 MUST READ (9-10): Major market-moving events, breakthrough research, critical Fed announcements
- 🔥 HIGH VALUE (7-8): Important earnings, notable product launches, significant economic data
- 📊 RELEVANT (5-6): Routine earnings, minor product updates, standard economic reports
- 🗑️ NOISE (0-4): General commentary, routine posts, non-critical updates

IMMEDIATE REJECTION RULES:
- Score 0-2: Obvious spam, test posts, "hello world", motivational quotes
- Score 0-2: Recruitment posts, personal achievements, birthday messages
- Score 0-2: Generic "thoughts on..." without specific news
- Score 0-2: Engagement bait ("like if you agree", "what do you think?")
- Score 0-2: Duplicate content, rehashed old news

PRIORITY CLASSIFICATION:
- HIGH: Time-sensitive market news, major announcements, breaking developments
- MEDIUM: Important but not time-critical information
- LOW: Routine updates, background information

Input Items:
${itemsJson}

CRITICAL JSON OUTPUT REQUIREMENTS:
- ONLY output valid JSON, no conversation, no markdown
- Use proper escaping for all quotes and special characters
- Start immediately with { and end immediately with }

Output Format:
{
  "results": [
    {
      "id": "item_id_here",
      "relevance_score": 8,
      "processing_status": "RELEVANT",
      "summary": "Brief summary without special characters",
      "priority": "HIGH"
    }
  ]
}

Remember: Quality over quantity. Be selective and prioritize truly valuable information. For real-time trading, current news is MORE valuable than future calendar predictions.
`;
  }

  /**
   * Optimized execution and parsing
   */
  private async executeAndParseOptimized(req: any): Promise<FilterResult[]> {
    const execAsync = promisify(exec);

    const cacheDir = pathModule.join(process.cwd(), 'cache');
    try {
      await fs.mkdir(cacheDir, { recursive: true });
    } catch (_e) {
      // ignore if exists
    }

    const tempPromptPath = pathModule.join(cacheDir, `temp_prompt_opt_${Date.now()}.txt`);
    const cachePath = pathModule.join(cacheDir, `kilocode_cache_opt_${Date.now()}.md`);

    await fs.writeFile(tempPromptPath, req.prompt, 'utf-8');
    console.log(`\n📝 OPTIMIZED PROMPT (${req.prompt.length} chars)...`);

    const command = `type "${tempPromptPath}" | kilocode -m ask --auto --json > "${cachePath}"`;

    try {
      await execAsync(command, { timeout: 150000 }); // Increased timeout for larger batches

      const rawOutput = await fs.readFile(cachePath, 'utf-8');

      // Enhanced parsing with better error handling
      const results = this.parseKiloCodeOutputOptimized(rawOutput);

      // Validate results
      const validResults = results.filter(result =>
        result.id &&
        typeof result.relevance_score === 'number' &&
        result.processing_status &&
        result.summary
      );

      console.log(`✅ Parsed ${validResults.length}/${results.length} valid results`);
      return validResults;

    } catch (error) {
      console.error(`❌ Execution failed:`, error);
      return [];
    } finally {
      try {
        await fs.unlink(tempPromptPath);
      } catch {
        // Ignore cleanup errors
      }
      // Keep cache file for debugging if needed
    }
  }

  /**
   * Enhanced output parsing
   */
  private parseKiloCodeOutputOptimized(rawOutput: string): FilterResult[] {
    try {
      // Debug logging to understand the raw output structure
      console.log('🔍 DEBUG: Raw output length:', rawOutput.length);
      console.log('🔍 DEBUG: Raw output preview:', rawOutput.substring(0, 500));

      // Enhanced JSON extraction - try multiple patterns
      const jsonPatterns = [
        /\{[\s\S]*?\}\s*$/, // JSON at end of output
        /\{["']results["']:\s*\[[\s\S]*?\]\}/, // JSON with results array
        /\{[\s\S]*?"results"[\s\S]*?\}/, // JSON containing results field
        /\{[\s\S]*?\}/ // Any JSON object
      ];

      let jsonStr = '';
      let jsonMatchFound = false;

      // Try each pattern until we find valid JSON
      for (const pattern of jsonPatterns) {
        const jsonMatch = rawOutput.match(pattern);
        if (jsonMatch) {
          jsonStr = jsonMatch[0]
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();
          
          console.log('🔍 DEBUG: Found JSON candidate with pattern:', pattern.toString().substring(0, 30));
          console.log('🔍 DEBUG: Candidate length:', jsonStr.length);
          console.log('🔍 DEBUG: Candidate preview:', jsonStr.substring(0, 200));
          
          // Validate this looks like real JSON
          if (jsonStr.length > 20 && jsonStr.startsWith('{') && (jsonStr.endsWith('}') || jsonStr.includes('"results"'))) {
            jsonMatchFound = true;
            break;
          }
        }
      }

      if (!jsonMatchFound) {
        console.log('❌ No valid JSON found in output after trying all patterns');
        
        // Enhanced fallback: try to extract JSON from anywhere in the output
        const allJsonMatches = rawOutput.match(/\{[\s\S]*?\}/g);
        if (allJsonMatches) {
          console.log('🔍 DEBUG: Found', allJsonMatches.length, 'JSON-like structures in output');
          
          // Try each JSON match
          for (const match of allJsonMatches) {
            const candidate = match.replace(/```json/g, '').replace(/```/g, '').trim();
            if (candidate.length > 20 && candidate.includes('"results"')) {
              jsonStr = candidate;
              jsonMatchFound = true;
              console.log('🔧 Using fallback JSON extraction');
              break;
            }
          }
        }

        if (!jsonMatchFound) {
          console.log('❌ No JSON found in output - raw output may not contain expected JSON structure');
          return [];
        }
      }

      // Debug logging to see the extracted JSON
      console.log('🔍 DEBUG: Extracted JSON length:', jsonStr.length);
      console.log('🔍 DEBUG: Extracted JSON preview:', jsonStr.substring(0, 500));
      console.log('🔍 DEBUG: JSON ends with:', JSON.stringify(jsonStr.slice(-20)));

      // Additional validation: ensure JSON ends properly
      const lastChar = jsonStr.slice(-1);
      if (lastChar !== '}') {
        console.log('❌ JSON does not end with } - attempting to find proper JSON boundary');
        // Try to find the last complete JSON object
        const lastBraceIndex = jsonStr.lastIndexOf('}');
        if (lastBraceIndex !== -1) {
          const fixedJsonStr = jsonStr.substring(0, lastBraceIndex + 1);
          console.log('🔧 Fixed JSON by truncating at last }');
          try {
            const parsed = JSON.parse(fixedJsonStr);
            return this.validateAndReturnResults(parsed);
          } catch (fixError) {
            console.error('❌ Failed to parse fixed JSON:', fixError);
          }
        }
      }

      try {
        const parsed = JSON.parse(jsonStr);
        return this.validateAndReturnResults(parsed);
      } catch (parseError) {
        console.error('❌ Final JSON parsing failed:', parseError);
        
        // Last resort: try to extract results array manually
        const resultsMatch = jsonStr.match(/"results"\s*:\s*\[([\s\S]*?)\]/);
        if (resultsMatch) {
          console.log('🔧 Attempting manual results extraction');
          try {
            const resultsArray = JSON.parse('[' + resultsMatch[1] + ']');
            return this.validateAndReturnResults({ results: resultsArray });
          } catch (manualError) {
            console.error('❌ Manual results extraction failed:', manualError);
          }
        }

        return [];
      }

    } catch (error) {
      console.error('❌ JSON parsing failed:', error);
      return [];
    }
  }

  /**
   * Validate and return results after JSON parsing
   */
  private validateAndReturnResults(parsed: any): FilterResult[] {
    if (!parsed.results || !Array.isArray(parsed.results)) {
      console.log('❌ Invalid JSON structure - missing results array');
      return [];
    }

    return parsed.results.map((result: any) => ({
      id: result.id,
      relevance_score: Math.min(10, Math.max(0, result.relevance_score || 0)),
      processing_status: result.processing_status || 'IRRELEVANT',
      summary: result.summary || 'No summary',
      priority: result.priority || (result.relevance_score >= 8 ? 'HIGH' : result.relevance_score >= 6 ? 'MEDIUM' : 'LOW')
    }));
  }

  /**
   * Optimized database update with priority handling
   */
  private async updateDatabaseOptimized(results: FilterResult[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const result of results) {
        // Only update items with score >= MIN_RELEVANCE_SCORE or mark others as archived
        const finalStatus = result.relevance_score >= this.MIN_RELEVANCE_SCORE
          ? 'processed'
          : 'archived';

        await client.query(`
          UPDATE news_items
          SET
            relevance_score = $1,
            processing_status = $2,
            content = CASE WHEN content IS NULL OR LENGTH(content) < 10 THEN $3 ELSE content END
          WHERE id = $4
        `, [
          result.relevance_score,
          finalStatus,
          result.summary,
          result.id
        ]);

        console.log(
          `[${this.agentName}] Updated item ${result.id}: (${result.relevance_score}/10) -> ${finalStatus} [${result.priority}]`
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Mark failed batch as error
   */
  private async markBatchAsError(batch: NewsItemToFilter[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      for (const item of batch) {
        await client.query(`
          UPDATE news_items
          SET processing_status = 'error'
          WHERE id = $1
        `, [item.id]);
      }
    } finally {
      client.release();
    }
  }

  /**
   * Enhanced publisher trigger with lower threshold
   */
  private async checkAndTriggerPublisherOptimized(): Promise<void> {
    console.log(`[${this.agentName}] 🔍 DEBUG: checkAndTriggerPublisherOptimized() called`);

    try {
      // ULTRA STRICT: score >= 7, posts des 5 derniers jours seulement ( cutoff dynamique )
      const cutoffDate = this.getDynamicCutoffDate();
      const countQuery = `
        SELECT COUNT(*) as total
        FROM news_items
        WHERE processing_status = 'processed'
          AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
          AND relevance_score >= 7 -- ✅ SEULEMENT LES POSTS AVEC NOTE >= 7
          AND published_at >= $1 -- ✅ ULTRA STRICT: Pas avant cutoff dynamique (5 jours)
          AND published_at <= NOW() + INTERVAL '1 day' -- ✅ Pas de posts futurs (tolérance 24h)
          AND title NOT LIKE '%[ECO CAL%' -- 🚫 EXCLURE ECO CALENDAR
          AND source != 'TradingEconomics' -- 🚫 EXCLURE TRADINGECONOMICS
      `;
      const result = await this.pool.query(countQuery, [cutoffDate.toISOString()]);
      const totalReady = parseInt(result.rows[0]?.total || '0');

      console.log(`[${this.agentName}] 📊 Posts prêts à publier: ${totalReady} (seuil: 3, score ≥ 7, cutoff: ${cutoffDate.toISOString().split('T')[0]}, bourse temps réel)`);

      if (totalReady >= 1) { // Réduit de 3 à 1 pour publication plus fréquente
        console.log(`[${this.agentName}] 🚀 Seuil atteint (${totalReady} >= 1)! Lancement du SimplePublisherOptimized...`);
        console.log(`[${this.agentName}] 🔍 DEBUG: Publisher instance:`, !!this.publisher);

        // Use the initialized publisher instance
        const publishResult = await this.publisher.runPublishingCycleOptimized(0); // threshold 0 = publish all

        if (publishResult.success) {
          console.log(`[${this.agentName}] ✅ Publisher terminé: ${publishResult.published || 0} posts publiés`);
        } else {
          console.log(`[${this.agentName}] ⚠️ Publisher erreur: ${publishResult.errors?.join(', ')}`);
        }
      } else {
        console.log(`[${this.agentName}] ⏳ En attente: ${totalReady}/1 posts (seuil réduit pour bourse temps réel)`);
        console.log(`[${this.agentName}] 🔧 DEBUG: Total ready (${totalReady}) < threshold (1) - skipping publisher`);
      }
    } catch (error) {
      console.error(`[${this.agentName}] ❌ Erreur check publisher optimisé:`, error);
      console.error(`[${this.agentName}] 🔍 DEBUG: Error stack:`, error instanceof Error ? error.stack : '');
    }
  }

  /**
   * Scrape X/Twitter news from OPML feeds
   */
  /**
   * Scrape and Save X News (Optimized with Flux Strategy & Test Mode)
   */
  private async scrapeAndSaveXNews(opmlFile?: string): Promise<void> {
    try {
      console.log(`[${this.agentName}] 🐦 Initializing X scraper service...`);
      const maxFeeds = this.isTestMode ? 3 : undefined;
      
      if (this.isTestMode) {
          console.log(`[${this.agentName}] 🧪 TEST MODE: Limiting Scraper to 3 feeds per category`);
      }

      // Define batch handler for incremental processing
      const handleBatch = async (batchItems: XNewsItem[]) => {
        if (batchItems.length === 0) return;
        console.log(`[${this.agentName}] 🔄 Flux: Processing batch of ${batchItems.length} items immediately...`);
        const savedItems = await this.saveXNewsToDatabase(batchItems);
        if (savedItems.length > 0) {
          console.log(`[${this.agentName}] 🧠 Flux: Filtering ${savedItems.length} new items with AI...`);
          await this.processBatchOptimizedForScraping(savedItems);
        }
      };

      // 1. Scrape AI News
      const aiOpmlPath = pathModule.join(process.cwd(), 'ia.opml');
      if (await this.xScraperService.opmlFileExists(aiOpmlPath)) {
        console.log(`[${this.agentName}] 🐦 Scraping IA news...`);
        const resultAI = await this.xScraperService.runScraping(aiOpmlPath, 'IA', handleBatch, maxFeeds);
        await this.processScrapingResult(resultAI);
      }

      // 2. Scrape Finance News
      const financeOpmlPath = pathModule.join(process.cwd(), 'finance-x.opml');
      if (await this.xScraperService.opmlFileExists(financeOpmlPath)) {
        console.log(`[${this.agentName}] 🐦 Scraping Finance news...`);
        const resultFinance = await this.xScraperService.runScraping(financeOpmlPath, 'FINANCE', handleBatch, maxFeeds);
        await this.processScrapingResult(resultFinance);
      }

    } catch (error) {
      console.error(`[${this.agentName}] ❌ Error during X news scraping:`, error);
    }
  }

  /**
   * Process scraping result from X/Twitter
   */
  private async processScrapingResult(result: XScrapingResult): Promise<void> {
    const startTime = Date.now();
    console.log(`[${this.agentName}] 📥 Processing scraping result: ${result.items.length} items from ${result.processedFeeds} feeds`);

    if (result.success && result.items.length > 0) {
      // Convert XNewsItem to database format
      const xNewsItems = result.items.map((xItem: XNewsItem) => ({
        title: xItem.title,
        source: xItem.source,
        url: xItem.url,
        content: xItem.content,
        sentiment: xItem.sentiment || 'neutral',
        category: xItem.category,
        published_at: new Date(xItem.published_at),
      }));

      // Save to database with author filtering
      await this.saveXNewsToDatabase(xNewsItems);

      // Also save to JSON for backup
      await this.xScraperService.saveToJson(result.items);

      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
      if (result.errors && result.errors.length > 0) {
         console.log(`[${this.agentName}] ⚠️  Some feeds failed but processing continued`);
      }
    } else {
      console.log(`[${this.agentName}] ⚠️ X scraping returned no items or failed`);
      if (result.errors.length > 0) {
        console.log(`[${this.agentName}] ❌ X scraper errors:`, result.errors.slice(0, 5)); // Show first 5 errors
      }
    }
  }

  /**
   * Save X news items to the same database table as other news
   */
  private async saveXNewsToDatabase(xNewsItems: any[]): Promise<NewsItemToFilter[]> {
    if (!xNewsItems || xNewsItems.length === 0) return [];

    // Filter out generic profile pages and login walls BEFORE saving
    const validXNewsItems = xNewsItems.filter(item => {
      const content = (item.content || '').toLowerCase();
      const title = (item.title || '').toLowerCase();

      // Reject if content contains generic X login/signup boilerplate
      if (content.includes('people on x are the first to know') ||
          (content.includes('log in') && content.includes('sign up') && content.includes('don\'t miss what\'s happening'))) {
        console.log(`[${this.agentName}] 🗑️ Dropping generic X profile/login page: ${item.title}`);
        return false;
      }

      // Reject if title looks like a profile page "Name (@handle) / X" AND content is short/generic
      if (title.endsWith('/ x') && content.length < 500 && content.includes('posts')) {
         // Check if it actually has post content or just bio
         if (!content.includes('·') && !content.includes('ago')) { // Crude check for timestamps in posts
            console.log(`[${this.agentName}] 🗑️ Dropping likely empty profile page: ${item.title}`);
            return false;
         }
      }

      return true;
    });

    if (validXNewsItems.length === 0) return [];

    // Apply author diversity filtering using the XScraperService method
    const xNewsItemsWithAuthors = validXNewsItems.map(item => ({
      title: item.title,
      source: item.source,
      url: item.url,
      content: item.content,
      sentiment: item.sentiment || 'neutral',
      category: item.category,
      published_at: typeof item.published_at === 'string' ? item.published_at : item.published_at.toISOString(),
      timestamp: new Date(item.published_at),
    }));

    // Use the XScraperService's author diversity filtering
    const filteredItems = this.xScraperService['applyAuthorDiversityFilter'](xNewsItemsWithAuthors);
    const savedItems: NewsItemToFilter[] = [];

    if (filteredItems.length === 0) return [];

    const client = await this.pool.connect();
    try {
      // TRANSACTION START - Évite les race conditions
      await client.query('BEGIN');

      // Create table if not exists (same as NewsAggregator)
      await client.query(`
        CREATE TABLE IF NOT EXISTS news_items (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            title VARCHAR(1000) NOT NULL,
            source VARCHAR(100) NOT NULL,
            url TEXT,
            content TEXT,
            sentiment VARCHAR(20),
            published_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            processing_status VARCHAR(20) DEFAULT 'raw',
            UNIQUE(title, source, published_at)
        );
      `);

      // 1. Fetch recent items (last 48h) for multi-criteria duplicate detection
      const sources = [...new Set(filteredItems.map(i => i.source))];
      const existingRes = await client.query(`
          SELECT title, url
          FROM news_items
          WHERE (source = ANY($1) OR category LIKE 'X-%')
            AND created_at > NOW() - INTERVAL '48 hours'
      `, [sources]);

      // Créer des Sets pour la détection rapide de doublons
      const existingTitles = new Set(existingRes.rows.map(r => this.normalizeTitle(r.title)));
      const existingUrls = new Set(existingRes.rows.map(r => this.normalizeUrl(r.url)));

      let savedCount = 0;
      let duplicateCount = 0;

      for (const item of filteredItems) {
         const normalizedTitle = this.normalizeTitle(item.title);
         const normalizedUrl = this.normalizeUrl(item.url);

         // Vérification multi-critères: URL OU titre normalisé déjà existant
         if (existingUrls.has(normalizedUrl)) {
             console.log(`[${this.agentName}] 🔄 Skipped duplicate (URL match): ${item.title.substring(0,40)}...`);
             duplicateCount++;
             continue;
         }

         if (existingTitles.has(normalizedTitle)) {
             console.log(`[${this.agentName}] 🔄 Skipped duplicate (Title match): ${item.title.substring(0,40)}...`);
             duplicateCount++;
             continue;
         }

         // 2. Insert new item with 'raw' status (will be processed later)
         const insertQuery = `
           INSERT INTO news_items (title, source, url, content, sentiment, category, published_at, processing_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'raw')
           ON CONFLICT (title, source, published_at) DO NOTHING
           RETURNING id, title, source
         `;

         const insertValues = [
           item.title,
           item.source,
           item.url,
           item.content,
           item.sentiment,
           item.category,
           item.timestamp
         ];

         const insertRes = await client.query(insertQuery, insertValues);

         if (insertRes.rowCount && insertRes.rowCount > 0) {
           const newItem = insertRes.rows[0];
           savedItems.push({
             id: newItem.id,
             title: newItem.title,
             source: newItem.source,
             content: item.content || item.title
           });

           savedCount++;

           // Add to our Sets to avoid duplicates within this batch
           existingTitles.add(normalizedTitle);
           existingUrls.add(normalizedUrl);
         }
      }

      // TRANSACTION COMMIT
      await client.query('COMMIT');

      console.log(`[${this.agentName}] 💾 Saved ${savedCount} new X news items (${duplicateCount} duplicates skipped)`);

    } catch (error) {
      // TRANSACTION ROLLBACK on error
      await client.query('ROLLBACK');
      console.error(`[${this.agentName}] ❌ Error saving X news to database:`, error);
      throw error;
    } finally {
      client.release();
    }

    return savedItems;
  }

  /**
   * Normalize title for duplicate detection
   */
  private normalizeTitle(title: string): string {
    if (!title) return '';
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Normalize URL for duplicate detection
   */
  private normalizeUrl(url: string): string {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      // Remove tracking parameters and normalize
      urlObj.search = '';
      return urlObj.toString().toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  /**
   * Process a batch of items for scraping (optimized version)
   */
  private async processBatchOptimizedForScraping(items: NewsItemToFilter[]): Promise<void> {
    if (items.length === 0) return;

    // Use the existing processBatchOptimized method with a smaller batch size
    const batchSize = Math.min(items.length, this.BATCH_SIZE);
    const batches: NewsItemToFilter[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`[${this.agentName}] Processing scraping batch ${i + 1}/${batches.length} (${batch.length} items)`);
      await this.processBatchOptimized(batch, i + 1, batches.length);
    }
  }

  // Keep existing methods for X scraping (unchanged)

  private async fetchPendingItems(): Promise<NewsItemToFilter[]> {
    const client = await this.pool.connect();
    try {
      const res = await client.query(`
        SELECT id, title, content, source
        FROM news_items
        WHERE processing_status IN ('PENDING', 'raw')
        ORDER BY created_at DESC
        LIMIT 200 -- Increased limit for better batching
      `);
      return res.rows;
    } finally {
      client.release();
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
    if (this.ageFilter) {
      await this.ageFilter.close();
    }
    if (this.scraper) {
      await this.scraper.close();
    }
    if (this.xScraperService) {
      await this.xScraperService.close();
    }
  }
}

// Standalone execution
const isRunningDirectly =
  process.argv[1] && (
    process.argv[1].endsWith('NewsFilterAgentOptimized.ts') ||
    process.argv[1].endsWith('NewsFilterAgentOptimized.js')
  );

if (isRunningDirectly) {
  console.log('🚀 [NewsFilterAgentOptimized] Starting optimized execution...');
  const agent = new NewsFilterAgentOptimized();
  const opmlFile = process.argv[2];
  console.log(`📁 [NewsFilterAgentOptimized] OPML file: ${opmlFile || 'none provided'}`);

  agent.runFilterCycle(opmlFile)
    .then(() => {
      console.log('✅ [NewsFilterAgentOptimized] Optimized execution completed successfully');
      return agent.close();
    })
    .catch((error) => {
      console.error('❌ [NewsFilterAgentOptimized] Optimized execution failed:', error);
      return agent.close();
    });
}