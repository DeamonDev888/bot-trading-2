
import { BaseAgentSimple } from './BaseAgentSimple';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import pathModule from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { execSync } from 'child_process';

dotenv.config();

interface NewsItemToFilter {
  id: string;
  title: string;
  content: string;
  source: string;
}

interface FilterResult {
  id: string;
  relevance_score: number;
  processing_status: 'RELEVANT' | 'IRRELEVANT';
  summary: string;
}

export class AgregatorFilterAgent extends BaseAgentSimple {
  private pool: Pool;

  constructor() {
    super('AgregatorFilterAgent');
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'financial_analyst',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '9022',
    });
  }

  public async runFilterCycle(): Promise<void> {
    console.log(`[${this.agentName}] Starting filter cycle for Aggregator News...`);

    try {
      // Step 0: Auto-process technical sources (BLS, TradingEconomics) to skip LLM
      await this.autoProcessTechnicalSources();

      // Step 1: Fetch pending items (ZeroHedge, CNBC, etc.)
      // Exclude X sources which are handled by NewsFilterAgent
      const pendingItems = await this.fetchPendingItems();

      if (pendingItems.length === 0) {
        console.log(`[${this.agentName}] No pending items found. This agent only processes existing items in database.`);
        console.log(`[${this.agentName}] ℹ️ Use NewsAggregator or NewsFilterAgentOptimized to scrape fresh data.`);
        return;
      }

      console.log(`[${this.agentName}] Found ${pendingItems.length} pending items for filtering.`);

      // Process in batches of 10 (News can be less intensive than Tweets)
      const batchSize = 10;
      let processedBatches = 0;
      for (let i = 0; i < pendingItems.length; i += batchSize) {
        const batch = pendingItems.slice(i, i + batchSize);
        console.log(
          `[${this.agentName}] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pendingItems.length / batchSize)} (${batch.length} items)`
        );
        await this.processBatch(batch);
        processedBatches++;

        if (processedBatches % 2 === 0) {
          console.log(`[${this.agentName}] ⏸️ Brief pause...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(
        `[${this.agentName}] ✅ Filter cycle completed: ${pendingItems.length} items processed`
      );
    } catch (error) {
      console.error(`[${this.agentName}] ❌ Error in filter cycle:`, error);
    }
  }

  private async autoProcessTechnicalSources(): Promise<void> {
    const client = await this.pool.connect();
    try {
        // Auto-approve TradingEconomics only (BLS excluded for now)
        const res = await client.query(`
            UPDATE news_items
            SET
                relevance_score = 8,
                processing_status = 'processed',
                sentiment = 'neutral',
                category = 'journaux'
            WHERE source = 'TradingEconomics'
              AND processing_status IN ('PENDING', 'raw')
            RETURNING id, title, source
        `);
        
        if (res.rowCount && res.rowCount > 0) {
            console.log(`[${this.agentName}] ⚡ Auto-processed ${res.rowCount} TradingEconomics calendar items without LLM.`);
            res.rows.forEach(r => console.log(`  ✅ [Auto] ${r.source}: ${r.title.substring(0,100)}...`));
        }
    } catch (e) {
        console.error(`[${this.agentName}] Error auto-processing technical sources:`, e);
    } finally {
        client.release();
    }
  }

  private async fetchPendingItems(): Promise<NewsItemToFilter[]> {
    const client = await this.pool.connect();
    try {
      // Filter out X sources, BLS, and processed items - only keep journal/news sources
      const res = await client.query(`
        SELECT id, title, content, source
        FROM news_items
        WHERE processing_status IN ('PENDING', 'raw')
        AND source NOT LIKE 'X -%'
        AND source NOT IN ('BLS', 'TradingEconomics')
        AND url NOT LIKE '%x.com%'
        AND url NOT LIKE '%twitter.com%'
        AND url NOT LIKE '%fixupx%'
        AND source IN ('MarketWatch', 'CNBC', 'ZeroHedge', 'Bloomberg', 'FinancialJuice', 'Financial Times', 'Reuters', 'Wall Street Journal', 'Finnhub', 'Kitco News', 'CoinDesk', 'Nikkei Asia')
        ORDER BY created_at DESC
        LIMIT 50
      `);
      return res.rows;
    } finally {
      client.release();
    }
  }

  private async processBatch(batch: NewsItemToFilter[]): Promise<void> {
    console.log(`[${this.agentName}] 📤 Sending ${batch.length} items to LLM:`);
    batch.forEach(b => console.log(`  - ${b.source}: ${b.title.substring(0, 100)}...`));

    const prompt = this.buildPrompt(batch);
    const req = {
      prompt,
      outputFile: `data/agent-data/${this.agentName}/last_batch.json`,
    };

    try {
      const results = await this.executeAndParse(req, batch);
      await this.updateDatabase(results, batch);

      // ⭐ NOUVEAU : Appeler le publisher pour les items pertinents
      const relevantItems = results.filter(r => r.relevance_score >= 7);
      if (relevantItems.length > 0) {
        console.log(`[${this.agentName}] 📢 Publishing ${relevantItems.length} relevant items (${relevantItems.map(r => r.id).join(', ')})...`);

        try {
          // Import dynamique pour éviter les dépendances circulaires
          const { NewsEsPublisher } = await import('../../discord_bot/news_es_publisher.js');
          const publisher = new NewsEsPublisher();

          // Récupérer les news non publiées (qui viennent d'être traitées)
          const newsData = await publisher.getUnpublishedNews();

          if (newsData.items.length > 0) {
            console.log(`[${this.agentName}] 📨 Found ${newsData.items.length} items ready for publication`);
            await publisher.publishToDiscord(newsData);
            console.log(`[${this.agentName}] ✅ Publication completed for this batch`);
          } else {
            console.log(`[${this.agentName}] ℹ️ No items to publish (may have been published already)`);
          }
        } catch (publishError) {
          console.error(`[${this.agentName}] ❌ Error during publication:`, publishError);
        }
      } else {
        console.log(`[${this.agentName}] ℹ️ No relevant items (score >= 7) in this batch, skipping publication`);
      }

    } catch (error) {
      // Vérifier si c'est une erreur de shell KiloCode
      if ((error as Error).message.includes('Shell command failed') ||
          (error as Error).message.includes('ENOENT')) {
        console.error(`[${this.agentName}] ❌ KiloCode LLM is unavailable or not responding!`);
        console.error(`[${this.agentName}] 🔧 ERROR: Cannot proceed without LLM analysis.`);
        console.error(`[${this.agentName}] 💡 Please check:`);
        console.error(`   - KiloCode CLI is installed and in PATH`);
        console.error(`   - KiloCode API key is configured`);
        console.error(`   - KiloCode service is running`);
        console.error(`[${this.agentName}] 🛑 STOPPING PIPELINE - No fallback allowed per user request.`);

        // Arrêter le processus avec une erreur
        process.exit(1);
      } else {
        // Pour les autres erreurs, afficher l'erreur normale mais continuer
        console.error(`[${this.agentName}] ❌ Failed to process batch:`, error);
        throw error; // Propager l'erreur pour arrêter le traitement
      }
    }
  }

  private buildPrompt(batch: NewsItemToFilter[]): string {
    const itemsJson = JSON.stringify(
      batch.map(b => ({
        id: b.id,
        title: b.title,
        content: b.content?.substring(0, 1000) || b.title, // News can have longer content
        source: b.source,
      })),
      null,
      2
    );

    // Créer un prompt très simple et direct
    const promptItems = batch.map((item, index) =>
      `${index + 1}. ID: ${item.id}\nTitle: ${item.title}\nSource: ${item.source}`
    ).join('\n\n');

    return `BE CONCISE. Analyze ${batch.length} financial news items:

${promptItems}

Return ONLY this JSON (no reasoning, no explanations):
{"results":[
{"id":"${batch[0].id}","relevance_score":9,"processing_status":"RELEVANT","summary":"brief summary"},
{"id":"${batch[1]?.id || 'id_2'}","relevance_score":6,"processing_status":"IRRELEVANT","summary":"brief summary"}
]}

Replace with actual scores. Be quick and direct.`;
  }

  /**
   * Simplified execution and parsing (following NewsFilterAgentOptimized pattern)
   */
  private async executeAndParse(req: any, batch?: NewsItemToFilter[]): Promise<FilterResult[]> {
    const execAsync = promisify(exec);

    const cacheDir = pathModule.join(process.cwd(), 'cache');
    try {
      await fs.mkdir(cacheDir, { recursive: true });
    } catch (_e) {
      // ignore if exists
    }

    const tempPromptPath = pathModule.join(cacheDir, `agg_prompt_${Date.now()}.txt`);
    const cachePath = pathModule.join(cacheDir, `agg_cache_${Date.now()}.md`);

    await fs.writeFile(tempPromptPath, req.prompt, 'utf-8');
    console.log(`\n📝 AGGREGATOR PROMPT (${req.prompt.length} chars)...`);

    // Essayer plusieurs approches pour exécuter KiloCode
    const approaches = [
      {
        name: 'Direct stdin approach',
        exec: async () => {
          // Approche 1: Passer le contenu directement via stdin
          const env = {
            ...process.env,
            PATH: process.platform === 'win32'
              ? `${process.env.PATH};C:\\Program Files\\Git\\cmd`
              : `${process.env.PATH}:/mnt/c/Program Files/Git/cmd`
          };
          const { exec: execAsync } = require('child_process');
          const { promisify } = require('util');
          const execAsyncPromise = promisify(execAsync);

          const command = `kilocode -m ask --auto --json > "${cachePath}"`;
          const childProcess = require('child_process').spawn(command, [], {
            shell: true,
            env: env,
            stdio: ['pipe', 'pipe', 'pipe']
          });

          childProcess.stdin.write(req.prompt);
          childProcess.stdin.end();

          return new Promise((resolve, reject) => {
            let output = '';
            childProcess.stdout.on('data', (data: Buffer) => {
              output += data.toString();
            });

            childProcess.on('close', (code: number) => {
              if (code === 0) {
                resolve(output);
              } else {
                reject(new Error(`Process exited with code ${code}`));
              }
            });

            childProcess.on('error', reject);
          });
        }
      },
      {
        name: 'File-based approach',
        exec: async () => {
          // Approche 2: Utiliser un fichier temporaire (fallback)
          const env = {
            ...process.env,
            PATH: process.platform === 'win32'
              ? `${process.env.PATH};C:\\Program Files\\Git\\cmd`
              : `${process.env.PATH}:/mnt/c/Program Files/Git/cmd`
          };
          const command = process.platform === 'win32'
            ? `set PATH=%PATH%;C:\\Program Files\\Git\\cmd & kilocode -m ask --auto --json "${tempPromptPath}" > "${cachePath}"`
            : `export PATH="$PATH:/mnt/c/Program Files/Git/cmd" && kilocode -m ask --auto --json "${tempPromptPath}" > "${cachePath}"`;
          await execAsync(command, { timeout: 60000, env });
          return await fs.readFile(cachePath, 'utf-8');
        }
      }
    ];

    let rawOutput = '';
    let lastError: Error | null = null;

    try {
      // Essayer chaque approche jusqu'à ce qu'une fonctionne
      for (const approach of approaches) {
        console.log(`🔧 Trying ${approach.name}...`);
        try {
          rawOutput = await approach.exec() as string;
          console.log(`✅ ${approach.name} succeeded!`);
          break;
        } catch (error) {
          console.log(`❌ ${approach.name} failed:`, (error as Error).message);
          lastError = error as Error;
        }
      }

      if (!rawOutput) {
        throw lastError || new Error('All approaches failed');
      }

      // Simple and robust parsing like NewsFilterAgentOptimized
      const results = this.parseKiloCodeOutputSimple(rawOutput);

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

      // Check if it's a Git error and try fallback
      if ((error as Error).message.includes('git')) {
        console.log(`⚠️ Git error detected, trying fallback command without Git features...`);
        try {
          // Utiliser le mode ask avec workspace explicite et Git dans le PATH
          const fallbackCommand = process.platform === 'win32'
            ? `set PATH=%PATH%;C:\\Program Files\\Git\\cmd & type "${tempPromptPath}" | kilocode -m ask --auto --json --nosplash --workspace "${process.cwd()}" > "${cachePath}"`
            : `export PATH="$PATH:/c/Program Files/Git/cmd" && cat "${tempPromptPath}" | kilocode -m ask --auto --json --nosplash --workspace "${process.cwd()}" > "${cachePath}"`;
          const fallbackEnv = {
            ...process.env,
            PATH: process.platform === 'win32'
              ? `${process.env.PATH};C:\\Program Files\\Git\\cmd`
              : `${process.env.PATH}:/c/Program Files/Git/cmd`
          };
          await execAsync(fallbackCommand, { timeout: 60000, env: fallbackEnv });

          const rawOutput = await fs.readFile(cachePath, 'utf-8');
          const results = this.parseKiloCodeOutputSimple(rawOutput);

          const validResults = results.filter(result =>
            result.id &&
            typeof result.relevance_score === 'number' &&
            result.processing_status &&
            result.summary
          );

          console.log(`✅ Fallback succeeded: ${validResults.length}/${results.length} valid results`);
          return validResults;

        } catch (fallbackError) {
          console.error(`❌ Fallback also failed:`, fallbackError);
        }
      }

      // Check if it's a KiloCode shell error
      if ((error as Error).message.includes('Shell command failed') ||
          (error as Error).message.includes('ENOENT')) {
        console.error(`[${this.agentName}] ❌ KiloCode LLM is unavailable or not responding!`);
        console.error(`[${this.agentName}] 🔧 ERROR: Cannot proceed without LLM analysis.`);
        console.error(`[${this.agentName}] 💡 Please check:`);
        console.error(`   - KiloCode CLI is installed and in PATH`);
        console.error(`   - KiloCode API key is configured`);
        console.error(`   - KiloCode service is running`);
        console.error(`   - Git is installed and in PATH (or use --no-git flag)`);
        console.error(`[${this.agentName}] 🛑 STOPPING PIPELINE - No fallback allowed per user request.`);
        process.exit(1);
      }

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
   * Simple output parsing (inspired by NewsFilterAgentOptimized)
   */
  private parseKiloCodeOutputSimple(rawOutput: string): FilterResult[] {
    try {
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
        return [];
      }

      // Debug logging to see the extracted JSON
      console.log('🔍 DEBUG: Extracted JSON length:', jsonStr.length);
      console.log('🔍 DEBUG: Extracted JSON preview:', jsonStr.substring(0, 500));

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

        console.log(`❌ LLM response parsing failed - no fallback allowed!`);
        throw new Error(`LLM parsing failed - Cannot proceed without valid AI analysis`);
      }

    } catch (error) {
      console.error('❌ JSON parsing failed:', error);
      console.log(`❌ LLM response parsing failed - no fallback allowed!`);
      throw new Error(`LLM parsing failed - Cannot proceed without valid AI analysis`);
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
      relevance_score: Math.min(10, Math.max(0, Number(result.relevance_score) || 0)),
      processing_status: result.processing_status || 'IRRELEVANT',
      summary: result.summary || 'No summary'
    }));
  }

  /**
   * Calculate intelligent score based on financial keywords and patterns
   */
  private calculateIntelligentScore(item: NewsItemToFilter): number {
    const title = (item.title || '').toLowerCase();
    const content = (item.content || '').toLowerCase();
    const source = item.source || '';
    const fullText = `${title} ${content}`;

    // High impact keywords (9-10)
    const highImpactKeywords = [
      'crash', 'surge', 'spike', 'plunge', 'soar', 'skyrocket', 'collapse', 'bankruptcy',
      'fed rate', 'interest rate', 'inflation', 'recession', 'bull market', 'bear market',
      'merger', 'acquisition', 'ipo', 'buyout', 'mega deal', 'takeover',
      'bitcoin', 'crypto', 'blockchain', 'ethereum', 'altcoins',
      'geopolitical', 'war', 'sanctions', 'trade war', 'tariff'
    ];

    // Medium impact keywords (7-8)
    const mediumImpactKeywords = [
      'earnings', 'revenue', 'profit', 'loss', 'dividend', 'stock split',
      'market cap', 'valuation', 'analyst', 'rating', 'upgrade', 'downgrade',
      'volatility', 'options', 'futures', 'commodities', 'oil', 'gold',
      'economic data', 'gdp', 'unemployment', 'cpi', 'pmi',
      'tech', 'ai', 'artificial intelligence', 'machine learning', 'cloud',
      'apple', 'google', 'microsoft', 'amazon', 'tesla', 'nvidia', 'meta'
    ];

    // Low impact keywords (5-6)
    const lowImpactKeywords = [
      'stock', 'shares', 'trading', 'investment', 'portfolio', 'market',
      'economy', 'finance', 'bank', 'fund', 'etf', 'index'
    ];

    // Check for keyword matches
    let score = 3; // Base score

    // High impact scoring
    const highMatches = highImpactKeywords.filter(keyword =>
      fullText.includes(keyword.toLowerCase())
    ).length;
    score += highMatches * 4;

    // Medium impact scoring
    const mediumMatches = mediumImpactKeywords.filter(keyword =>
      fullText.includes(keyword.toLowerCase())
    ).length;
    score += mediumMatches * 2;

    // Low impact scoring
    const lowMatches = lowImpactKeywords.filter(keyword =>
      fullText.includes(keyword.toLowerCase())
    ).length;
    score += lowMatches * 1;

    // Source bonuses
    if (['ZeroHedge', 'Bloomberg', 'Reuters', 'Wall Street Journal'].includes(source)) {
      score += 1;
    }

    // Breaking news indicators
    if (title.includes('breaking') || title.includes('urgent') || title.includes('just in')) {
      score += 2;
    }

    // Numbers and data indicators
    if (/\d+%|\$\d+\.?\d*[bm]|billion|million|trillion/i.test(fullText)) {
      score += 1;
    }

    // Cap the score at 10
    return Math.min(10, Math.max(0, score));
  }

  /**
   * Generate a concise summary based on the news item
   */
  private generateSummary(item: NewsItemToFilter): string {
    const title = item.title || '';

    // Try to extract the main point from title
    if (title.length > 100) {
      // Find the first sentence or clause
      const firstSentence = title.split('.')[0] || title.split(',')[0] || title;
      return firstSentence.trim();
    }

    return title.trim();
  }

  private async updateDatabase(results: FilterResult[], batch: NewsItemToFilter[]): Promise<void> {
    if (results.length === 0) return;
    const client = await this.pool.connect();
    // Map batch for quick title lookup
    const batchMap = new Map(batch.map(b => [b.id, b]));

    try {
      console.log(`[${this.agentName}] 📥 Processing LLM Results:`);
      for (const res of results) {
        await client.query(`
          UPDATE news_items
          SET relevance_score = $1, processing_status = 'processed', sentiment = CASE WHEN $1 >= 7 THEN 'bullish' WHEN $1 >= 4 THEN 'neutral' ELSE 'bearish' END, category = 'journaux', published_to_discord = FALSE
          WHERE id = $2
        `, [res.relevance_score, res.id]);
        
        const originalItem = batchMap.get(res.id);
        const title = originalItem ? originalItem.title.substring(0, 40) + '...' : 'Unknown Title';
        const icon = res.relevance_score >= 6 ? '✅' : '🗑️';
        
        console.log(`  ${icon} Score: ${res.relevance_score}/10 | ${title} | ${res.processing_status}`);
      }
    } finally {
      client.release();
    }
  }
}

// Auto-run if executed directly
(async () => {
  try {
    const { fileURLToPath } = await import('url');
    const { resolve } = await import('path');
    const currentPath = resolve(fileURLToPath(import.meta.url));
    const scriptPath = resolve(process.argv[1]);

    if (currentPath === scriptPath) {
      console.log('🚀 Démarrage auto AgregatorFilterAgent...');
      const agent = new AgregatorFilterAgent();
      await agent.runFilterCycle();
      console.log('✅ AgregatorFilterAgent terminé.');
    }
  } catch (err) {
    console.error('Fatal error running AgregatorFilterAgent:', err);
    process.exit(1);
  }
})();
