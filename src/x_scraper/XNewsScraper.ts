// Import dynamique pour éviter les problèmes ESM
import axios from 'axios';
import { chromium, type Browser, type Page } from 'playwright';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { XFeed, XNewsItem, XScrapingResult } from './interfaces.js';
import { XFeedParser } from './XFeedParser.js';
import { NitterManager } from './NitterManager.js';

// Statistics tracking interfaces
interface FeedStats {
  feedTitle: string;
  feedUrl: string;
  success: boolean;
  itemsFound: number;
  strategy: 'cached' | 'parallel' | 'search' | 'failed';
  winningInstance?: string;
  timeMs: number;
  error?: string;
}

interface ScrapingStats {
  startTime: Date;
  endTime?: Date;
  totalFeeds: number;
  successfulFeeds: number;
  failedFeeds: number;
  totalItems: number;
  feeds: FeedStats[];
  instanceStats: Map<string, { successes: number; failures: number }>;
  strategyStats: { cached: number; parallel: number; search: number; failed: number };
}

export class XNewsScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private pagePool: Page[] = []; // Pool of pages for parallel scraping
  private readonly POOL_SIZE = 2; // Reduced to avoid rate limits
  private readonly TIMEOUT_MS = 8000; // Reduced timeout for faster failure
  private logPath = path.join(process.cwd(), 'logs', 'scraper_errors.jsonl');
  
  // Statistics tracking
  private currentStats: ScrapingStats | null = null;

  private logError(feed: XFeed | null, instance: string, error: string, contentSnippet?: string) {
      const logEntry = {
          timestamp: new Date().toISOString(),
          type: 'SCRAPER_ERROR',
          feed: feed ? feed.title : 'system',
          url: feed ? feed.xmlUrl : '',
          instance: instance,
          error: error,
          contentSnippet: contentSnippet ? contentSnippet.substring(0, 500) : null
      };
      // Append to file (JSON Lines format) using synchronous append for safety in loops
      try {
          fs.appendFileSync(this.logPath, JSON.stringify(logEntry) + '\n');
      } catch (e) {
          console.error('❌ Failed to write to error log:', e);
      }
  }

  async init(): Promise<void> {
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ],
      });

      this.page = await this.browser.newPage();
      await this.page.setViewportSize({ width: 1920, height: 1080 });

      // Initialize page pool for parallel scraping
      console.log(`🚀 Initializing ${this.POOL_SIZE} parallel pages for fast scraping...`);
      this.pagePool = [];
      for (let i = 0; i < this.POOL_SIZE; i++) {
        const poolPage = await this.browser.newPage();
        await poolPage.setViewportSize({ width: 1920, height: 1080 });
        this.pagePool.push(poolPage);
      }

      // Load strategies and feed health
      this.loadStrategies();
      this.loadFeedHealth();
      console.log(`🧠 Loaded ${Object.keys(this.strategies).length} cached strategies`);
      console.log(`🏥 Loaded health data for ${Object.keys(this.feedHealth).length} feeds`);

      console.log(`✅ Playwright browser initialized with ${this.POOL_SIZE + 1} pages for parallel X scraping`);
    } catch (error) {
      console.error('Failed to initialize Playwright browser:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      // Close all pool pages
      for (const poolPage of this.pagePool) {
        try { await poolPage.close(); } catch {}
      }
      this.pagePool = [];
      
      if (this.page) {
        await this.page.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      console.log('Playwright browser closed');
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }


  async restartBrowser(): Promise<void> {
    console.log('🔄 Restarting Playwright browser...');
    await this.close();
    await this.init();
    console.log('✅ Browser restarted successfully');
  }

  // --- ADAPTIVE STRATEGY CACHING ---
  private strategyPath = path.join(process.cwd(), 'feed_strategies.json');
  private strategies: Record<string, { instance: string, method: 'profile' | 'search', timestamp: number }> = {};

  // --- FEED HEALTH TRACKING (skip dead feeds) ---
  private feedHealthPath = path.join(process.cwd(), 'feed_health.json');
  private feedHealth: Record<string, { 
    consecutiveFailures: number, 
    lastSuccess: number, 
    lastContentHash: string,
    pausedUntil?: number 
  }> = {};

  private loadStrategies() {
      try {
          if (fs.existsSync(this.strategyPath)) {
              this.strategies = JSON.parse(fs.readFileSync(this.strategyPath, 'utf-8'));
          }
      } catch (e) { console.warn('⚠️ Could not load strategies', e); }
  }

  private saveStrategy(feedUrl: string, instance: string, method: 'profile' | 'search') {
      try {
          this.strategies[feedUrl] = { instance, method, timestamp: Date.now() };
          fs.writeFileSync(this.strategyPath, JSON.stringify(this.strategies, null, 2));
      } catch (e) { console.warn('⚠️ Could not save strategy', e); }
  }

  private loadFeedHealth() {
      try {
          if (fs.existsSync(this.feedHealthPath)) {
              this.feedHealth = JSON.parse(fs.readFileSync(this.feedHealthPath, 'utf-8'));
          }
      } catch (e) { console.warn('⚠️ Could not load feed health', e); }
  }

  private saveFeedHealth() {
      try {
          fs.writeFileSync(this.feedHealthPath, JSON.stringify(this.feedHealth, null, 2));
      } catch (e) { console.warn('⚠️ Could not save feed health', e); }
  }

  private hashContent(content: string): string {
      // Simple hash for quick comparison
      let hash = 0;
      for (let i = 0; i < Math.min(content.length, 500); i++) {
          hash = ((hash << 5) - hash) + content.charCodeAt(i);
          hash |= 0;
      }
      return hash.toString(16);
  }

  private shouldSkipFeed(feedUrl: string): { skip: boolean, reason?: string } {
      const health = this.feedHealth[feedUrl];
      if (!health) return { skip: false };

      // Skip if paused (too many failures)
      if (health.pausedUntil && Date.now() < health.pausedUntil) {
          const pauseHoursLeft = Math.round((health.pausedUntil - Date.now()) / 3600000);
          return { skip: true, reason: `paused for ${pauseHoursLeft}h more (${health.consecutiveFailures} failures)` };
      }

      return { skip: false };
  }

  private markFeedSuccess(feedUrl: string, contentHash: string) {
      this.feedHealth[feedUrl] = {
          consecutiveFailures: 0,
          lastSuccess: Date.now(),
          lastContentHash: contentHash,
          pausedUntil: undefined
      };
  }

  private markFeedFailure(feedUrl: string) {
      const health = this.feedHealth[feedUrl] || { consecutiveFailures: 0, lastSuccess: 0, lastContentHash: '' };
      health.consecutiveFailures++;
      
      // Pause feed after 5 consecutive failures (24 hours)
      if (health.consecutiveFailures >= 5) {
          health.pausedUntil = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
          console.log(`⏸️ Feed paused for 24h after ${health.consecutiveFailures} failures`);
      }
      
      this.feedHealth[feedUrl] = health;
  }

  private isContentUnchanged(feedUrl: string, newContent: string): boolean {
      const health = this.feedHealth[feedUrl];
      if (!health || !health.lastContentHash) return false;
      
      const newHash = this.hashContent(newContent);
      return health.lastContentHash === newHash;
  }
  // ---------------------------------


  /**
   * Initialize statistics for a new scraping run
   */
  private initStats(totalFeeds: number): void {
    this.currentStats = {
      startTime: new Date(),
      totalFeeds,
      successfulFeeds: 0,
      failedFeeds: 0,
      totalItems: 0,
      feeds: [],
      instanceStats: new Map(),
      strategyStats: { cached: 0, parallel: 0, search: 0, failed: 0 }
    };
  }

  /**
   * Record stats for a single feed
   */
  private recordFeedStats(stats: FeedStats): void {
    if (!this.currentStats) return;
    
    this.currentStats.feeds.push(stats);
    
    if (stats.success) {
      this.currentStats.successfulFeeds++;
      this.currentStats.totalItems += stats.itemsFound;
      this.currentStats.strategyStats[stats.strategy]++;
      
      // Track instance success
      if (stats.winningInstance) {
        const instanceStat = this.currentStats.instanceStats.get(stats.winningInstance) || { successes: 0, failures: 0 };
        instanceStat.successes++;
        this.currentStats.instanceStats.set(stats.winningInstance, instanceStat);
      }
    } else {
      this.currentStats.failedFeeds++;
      this.currentStats.strategyStats.failed++;
    }
  }

  /**
   * Print final statistics report
   */
  private printFinalReport(): void {
    if (!this.currentStats) return;
    
    this.currentStats.endTime = new Date();
    const durationMs = this.currentStats.endTime.getTime() - this.currentStats.startTime.getTime();
    const durationSec = (durationMs / 1000).toFixed(1);
    
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                    📊 SCRAPING REPORT                            ║');
    console.log('╠══════════════════════════════════════════════════════════════════╣');
    console.log(`║ ⏱️  Duration: ${durationSec}s                                       `);
    console.log(`║ 📋 Total Feeds: ${this.currentStats.totalFeeds}                                          `);
    console.log(`║ ✅ Successful: ${this.currentStats.successfulFeeds} (${((this.currentStats.successfulFeeds / this.currentStats.totalFeeds) * 100).toFixed(1)}%)                          `);
    console.log(`║ ❌ Failed: ${this.currentStats.failedFeeds} (${((this.currentStats.failedFeeds / this.currentStats.totalFeeds) * 100).toFixed(1)}%)                              `);
    console.log(`║ 📰 Total Items: ${this.currentStats.totalItems}                                          `);
    console.log('╠══════════════════════════════════════════════════════════════════╣');
    console.log('║                    🎯 STRATEGY BREAKDOWN                         ║');
    console.log('╠══════════════════════════════════════════════════════════════════╣');
    console.log(`║ 🧠 Cached Strategy: ${this.currentStats.strategyStats.cached} feeds                       `);
    console.log(`║ 🏎️  Parallel Race: ${this.currentStats.strategyStats.parallel} feeds                        `);
    console.log(`║ 🕵️  Search Backdoor: ${this.currentStats.strategyStats.search} feeds                       `);
    console.log('╠══════════════════════════════════════════════════════════════════╣');
    console.log('║                    🌐 INSTANCE PERFORMANCE                       ║');
    console.log('╠══════════════════════════════════════════════════════════════════╣');
    
    for (const [instance, stats] of this.currentStats.instanceStats) {
      const shortInstance = instance.replace('https://', '').substring(0, 25);
      console.log(`║ ${shortInstance}: ${stats.successes} wins                        `);
    }
    
    console.log('╠══════════════════════════════════════════════════════════════════╣');
    console.log('║                    ❌ FAILED FEEDS                                ║');
    console.log('╠══════════════════════════════════════════════════════════════════╣');
    
    const failedFeeds = this.currentStats.feeds.filter(f => !f.success);
    if (failedFeeds.length === 0) {
      console.log('║ 🎉 All feeds scraped successfully!                               ║');
    } else {
      for (const feed of failedFeeds.slice(0, 10)) { // Limit to 10
        const shortTitle = feed.feedTitle.substring(0, 30).padEnd(30);
        const shortError = (feed.error || 'Unknown').substring(0, 25);
        console.log(`║ • ${shortTitle}: ${shortError}`);
      }
      if (failedFeeds.length > 10) {
        console.log(`║ ... and ${failedFeeds.length - 10} more failed feeds             `);
      }
    }
    
    console.log('╠══════════════════════════════════════════════════════════════════╣');
    console.log('║                    🏆 TOP PERFORMING FEEDS                       ║');
    console.log('╠══════════════════════════════════════════════════════════════════╣');
    
    const topFeeds = this.currentStats.feeds
      .filter(f => f.success)
      .sort((a, b) => b.itemsFound - a.itemsFound)
      .slice(0, 5);
    
    for (const feed of topFeeds) {
      const shortTitle = feed.feedTitle.substring(0, 25).padEnd(25);
      console.log(`║ 🥇 ${shortTitle}: ${feed.itemsFound} items (${feed.timeMs}ms)`);
    }
    
    console.log('╚══════════════════════════════════════════════════════════════════╝');
    console.log('\n');
    
    // Save feed health data
    this.saveFeedHealth();
    console.log(`💾 Saved feed health data for ${Object.keys(this.feedHealth).length} feeds`);
    
    // Save report to JSON
    try {
      const reportPath = path.join(process.cwd(), 'logs', 'last_scraping_report.json');
      const reportData = {
        startTime: this.currentStats.startTime.toISOString(),
        endTime: this.currentStats.endTime?.toISOString(),
        durationMs: this.currentStats.endTime ? 
          this.currentStats.endTime.getTime() - this.currentStats.startTime.getTime() : 0,
        totalFeeds: this.currentStats.totalFeeds,
        successfulFeeds: this.currentStats.successfulFeeds,
        failedFeeds: this.currentStats.failedFeeds,
        totalItems: this.currentStats.totalItems,
        strategyStats: this.currentStats.strategyStats,
        instanceStats: Object.fromEntries(this.currentStats.instanceStats),
        failedFeedsList: failedFeeds.map(f => ({ title: f.feedTitle, error: f.error })),
        topFeeds: topFeeds.map(f => ({ title: f.feedTitle, items: f.itemsFound, timeMs: f.timeMs }))
      };
      fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
      console.log(`📊 Report saved to: ${reportPath}`);
    } catch (e) {
      console.warn('⚠️ Could not save report:', e);
    }
  }

  /**
   * Fetch X/Twitter news from OPML file
   */
  async scrapeFromOpml(opmlPath?: string, onBatchComplete?: (items: XNewsItem[]) => Promise<void>, maxFeeds?: number): Promise<XScrapingResult> {
    const result: XScrapingResult = {
      success: false,
      items: [],
      errors: [],
      processedFeeds: 0,
      totalItems: 0,
    };

    try {
      if (!this.page) {
        throw new Error('Scraper not initialized');
      }

      // Use default OPML path if not provided
      const opmlFile = opmlPath || 'ia.opml';
      console.log(`🚀 Starting X/Twitter scraping from OPML: ${opmlFile}`);

      const feeds = XFeedParser.parseOpml(opmlFile);
      const prioritizedFeeds = XFeedParser.prioritizeFeeds(feeds);

      // Initialize statistics
      this.initStats(prioritizedFeeds.length);

      let feedsToScrape = prioritizedFeeds;
      if (maxFeeds && maxFeeds > 0) {
          console.log(`🧪 TEST MODE: Limiting scrape to top ${maxFeeds} feeds`);
          feedsToScrape = prioritizedFeeds.slice(0, maxFeeds);
      }

      console.log(`📋 Found ${feeds.length} feeds, selected ${feedsToScrape.length} for scraping`);

      // Process feeds in batches for resource management
      const batchSize = 5;

      for (let i = 0; i < feedsToScrape.length; i += batchSize) {
        const batch = feedsToScrape.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(feedsToScrape.length / batchSize);
        console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} feeds)`);

        const batchItems: XNewsItem[] = [];

        // Process each feed in the batch
        for (const feed of batch) {
          const feedStartTime = Date.now();
          
          // Check if feed should be skipped (too many failures)
          const skipCheck = this.shouldSkipFeed(feed.xmlUrl);
          if (skipCheck.skip) {
            console.log(`⏭️ Skipping ${feed.title}: ${skipCheck.reason}`);
            this.recordFeedStats({
              feedTitle: feed.title,
              feedUrl: feed.xmlUrl,
              success: false,
              itemsFound: 0,
              strategy: 'failed',
              timeMs: 0,
              error: `Skipped: ${skipCheck.reason}`
            });
            result.processedFeeds++;
            continue;
          }
          
          try {
            const { items: feedItems, stats } = await this.scrapeFeedWithStats(feed);
            
            // Record stats
            this.recordFeedStats({
              feedTitle: feed.title,
              feedUrl: feed.xmlUrl,
              success: feedItems.length > 0,
              itemsFound: feedItems.length,
              strategy: stats.strategy,
              winningInstance: stats.winningInstance,
              timeMs: Date.now() - feedStartTime,
              error: feedItems.length === 0 ? 'No items found' : undefined
            });
            
            if (feedItems.length > 0) {
              // Mark feed as healthy and store content hash
              const contentHash = this.hashContent(feedItems.map(i => i.title).join(''));
              this.markFeedSuccess(feed.xmlUrl, contentHash);
              
              batchItems.push(...feedItems);
              result.items.push(...feedItems);
            } else {
              // No items found counts as failure
              this.markFeedFailure(feed.xmlUrl);
            }
            result.processedFeeds++;
            
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            
            // Mark feed failure
            this.markFeedFailure(feed.xmlUrl);
            
            this.recordFeedStats({
              feedTitle: feed.title,
              feedUrl: feed.xmlUrl,
              success: false,
              itemsFound: 0,
              strategy: 'failed',
              timeMs: Date.now() - feedStartTime,
              error: errorMsg
            });
            
            result.errors.push(`${feed.title}: ${errorMsg}`);
            this.logError(feed, 'Batch Loop', errorMsg);
          }
          
          // Small delay between feeds within batch to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        // Trigger callback if provided and we have items
        if (onBatchComplete && batchItems.length > 0) {
          console.log(`🔄 Batch callback: ${batchItems.length} items`);
          try {
            await onBatchComplete(batchItems);
          } catch (e) {
            console.error('❌ Error in batch callback:', e);
          }
        }

        // Delay between batches to avoid rate limits (5 seconds)
        if (i + batchSize < prioritizedFeeds.length) {
          console.log('⏸️ Pause 5s pour éviter les rate limits...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      result.success = result.processedFeeds > 0;
      result.totalItems = result.items.length;

      // Print final report
      this.printFinalReport();

      return result;
    } catch (error) {
      result.success = false;
      const errorMsg = `Main scraping error: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      this.logError(null, 'Main Loop', errorMsg);
      console.error('X scraping failed:', error);
      
      // Still print report even on failure
      this.printFinalReport();
      
      return result;
    }
  }
  
  /**
   * Wrapper for scrapeFeed that returns stats
   */
  private async scrapeFeedWithStats(feed: XFeed): Promise<{ items: XNewsItem[], stats: { strategy: 'cached' | 'parallel' | 'search' | 'failed', winningInstance?: string } }> {
    const items = await this.scrapeFeed(feed);
    
    // Get the winning strategy from the last saved strategy
    const cached = this.strategies[feed.xmlUrl];
    let strategy: 'cached' | 'parallel' | 'search' | 'failed' = 'parallel';
    let winningInstance = cached?.instance;
    
    if (cached && items.length > 0) {
      strategy = cached.method === 'search' ? 'search' : 'cached';
    } else if (items.length === 0) {
      strategy = 'failed';
    }
    
    return { items, stats: { strategy, winningInstance } };
  }

  /**
   * Scrape individual X/Twitter RSS feed with PARALLEL optimization
   * Uses Promise.race() to try multiple instances simultaneously - first valid result wins!
   */
  private async scrapeFeed(feed: XFeed): Promise<XNewsItem[]> {
    console.log(`🚀 Starting PARALLEL scrape for: ${feed.title}`);
    
    // Ensure browser exists
    if (!this.browser || this.pagePool.length === 0) {
       console.warn('⚠️ Browser/Pool not ready, restarting...');
       await this.restartBrowser();
    }
    
    if (!this.browser || this.pagePool.length === 0) {
      throw new Error('Scraper not initialized');
    }

    // Extract username
    const username = this.extractUsername(feed);
    if (!username) {
      console.warn(`⚠️ Could not extract username from ${feed.xmlUrl}, skipping`);
      return [];
    }

    // Get working instances (reduced list for speed)
    const instances = await NitterManager.getWorkingInstances();
    console.log(`📊 Racing ${Math.min(instances.length, this.POOL_SIZE)} instances in parallel...`);

    // ⚡ FAST TRACK: Try Cached Strategy First (single attempt) ⚡
    const cached = this.strategies[feed.xmlUrl];
    if (cached) {
      console.log(`🧠 Quick try cached strategy: ${cached.method} via ${cached.instance}`);
      try {
        const items = await this.trySingleInstance(this.pagePool[0], cached.instance, username, feed, cached.method === 'search');
        if (items.length > 0) {
          console.log(`✅ Cached strategy worked! ${items.length} items`);
          return items;
        }
      } catch {
        console.log(`⚠️ Cached strategy failed, racing all instances...`);
      }
    }

    // 🏎️ PARALLEL RACE: Try up to POOL_SIZE instances simultaneously
    const instancesToTry = instances.slice(0, this.POOL_SIZE);
    
    try {
      const items = await this.raceInstances(instancesToTry, username, feed);
      if (items.length > 0) {
        return items;
      }
    } catch (e) {
      console.warn(`⚠️ All parallel attempts failed: ${e}`);
    }

    // 🕵️ FALLBACK: Search Backdoor (also parallel)
    console.log(`🕵️ Trying Search Backdoor for ${feed.title}...`);
    const nitterInstances = instances.filter(i => !i.includes('jina.ai') && !i.includes('lightbrd.com'));
    const searchItems = await this.scrapeFallbackSearchParallel(username, nitterInstances.slice(0, 3), feed);
    
    if (searchItems.length > 0) {
      console.log(`✅ Search Backdoor SUCCESS: ${searchItems.length} items`);
      return searchItems;
    }

    console.error(`❌ All strategies failed for ${feed.title} (Tried: ${instancesToTry.map(i => i.split('/')[2]).join(', ')})`);
    return [];
  }

  /**
   * Extract username from feed URL or title
   */
  private extractUsername(feed: XFeed): string {
    let username = '';
    
    try {
      const urlObj = new URL(feed.xmlUrl);
      const parts = urlObj.pathname.split('/').filter(p => p);
      username = parts[parts.length - 1];
    } catch {
      const match = feed.xmlUrl.match(/(?:x\.com|twitter\.com|nitter\.[^/]+)\/([^/]+)/);
      if (match) username = match[1];
    }

    if (!username) {
      const titleMatch = feed.title.match(/@?(\w+)/);
      if (titleMatch) username = titleMatch[1];
    }

    if (!username && feed.title && !feed.title.includes(' ')) {
      username = feed.title;
    }

    return username;
  }

  /**
   * Race multiple instances in parallel - first valid result wins!
   */
  private async raceInstances(instances: string[], username: string, feed: XFeed): Promise<XNewsItem[]> {
    // Create race promises for each instance
    const racePromises = instances.map((instance, idx) => 
      this.trySingleInstance(this.pagePool[idx % this.POOL_SIZE], instance, username, feed)
        .then(items => {
          if (items.length > 0) {
            console.log(`🏆 Winner: ${instance} with ${items.length} items!`);
            this.saveStrategy(feed.xmlUrl, instance, 'profile');
            return { success: true, items, instance };
          }
          return { success: false, items: [], instance };
        })
        .catch(err => {
          console.log(`❌ ${instance}: ${err.message?.substring(0, 50) || 'failed'}`);
          return { success: false, items: [], instance };
        })
    );

    // Race all instances with a timeout
    const results = await Promise.race([
      // First successful result wins
      new Promise<{ success: boolean, items: XNewsItem[], instance: string }>(async (resolve) => {
        const allResults = await Promise.allSettled(racePromises);
        for (const result of allResults) {
          if (result.status === 'fulfilled' && result.value.success) {
            resolve(result.value);
            return;
          }
        }
        resolve({ success: false, items: [], instance: '' });
      }),
      // Timeout fallback
      new Promise<{ success: boolean, items: XNewsItem[], instance: string }>((_, reject) => 
        setTimeout(() => reject(new Error('All instances timed out')), this.TIMEOUT_MS * 2)
      )
    ]);

    return results.items;
  }

  /**
   * Try a single instance with one page
   */
  private async trySingleInstance(
    page: Page, 
    instance: string, 
    username: string, 
    feed: XFeed,
    isSearch: boolean = false
  ): Promise<XNewsItem[]> {
    const targetUrl = isSearch 
      ? `${instance}/search?q=from%3A${username}&f=tweets`
      : instance.includes('jina.ai') 
        ? `${instance}/${username}` 
        : `${instance}/${username}/rss`;

    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: this.TIMEOUT_MS,
    });

    const content = await page.content();
    
    // Quick validation
    if (this.isBlockedContent(content)) {
      throw new Error('Blocked by Cloudflare/Login Wall');
    }

    if (!content || content.trim().length < 100) {
      throw new Error('Empty content');
    }

    return await this.parseFeedContent(content, feed, instance);
  }

  /**
   * Check if content is blocked/login wall
   */
  private isBlockedContent(content: string): boolean {
    const lowerContent = content.toLowerCase();
    return content.includes('Just a moment...') ||
           content.includes('Making sure you are not a bot') ||
           content.includes('Attention Required! | Cloudflare') ||
           content.includes('403 | Nitter') ||
           (content.includes('Log in') && content.includes('Sign up')) ||
           // New checks for bad content
           content.includes("This account doesn't exist") ||
           content.includes("This account doesn\\'t exist") ||
           content.includes('Account suspended') ||
           content.includes('upstream connect error') ||
           content.includes('reset reason: remote connection failure') ||
           content.includes('retryAfter') || // Rate limit JSON response
           content.includes('"code":429') ||  // Rate limit code
           content.includes('RateLimitTriggeredError') ||
           lowerContent.includes('try searching for another') ||
           (content.length < 200 && content.includes('Profile / X'));
  }

  /**
   * Parallel search fallback
   */
  private async scrapeFallbackSearchParallel(username: string, instances: string[], feed: XFeed): Promise<XNewsItem[]> {
    if (instances.length === 0) return [];

    const searchPromises = instances.map((instance, idx) =>
      this.trySingleInstance(this.pagePool[idx % this.POOL_SIZE], instance, username, feed, true)
        .catch(() => [] as XNewsItem[])
    );

    const results = await Promise.all(searchPromises);
    
    // Return first non-empty result
    for (const items of results) {
      if (items.length > 0) {
        return items;
      }
    }
    
    return [];
  }

  /**
   * FALLBACK STRATEGY: Scrape via Nitter Search
   * Useful when Profile pages are Login Walled
   */
  private async scrapeFallbackSearch(username: string, instances: string[], feed: XFeed): Promise<XNewsItem[]> {
      // Filter only Nitter instances (Jina usually doesn't handle search URLs well with X blocks)
      const nitterInstances = instances.filter(i => !i.includes('jina.ai') && !i.includes('lightbrd.com')); // Lightbrd is rss only usually
      
      // If no generic nitter instances, we can't use this strategy
      // We can try to force add known robust ones if list is empty
      if (nitterInstances.length === 0) {
          nitterInstances.push('https://nitter.poast.org', 'https://nitter.privacydev.net');
      }

      for (const instance of nitterInstances) {
          try {
              // Construct Search URL: from:username include:nativeretweets
              // We use simple query to maximize success chance
              const searchUrl = `${instance}/search?q=from%3A${username}&f=tweets`;
              console.log(`🕵️ Attempting Search Fallback on ${instance}: ${searchUrl}`);


              if (!this.page) continue;
              await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
              const content = await this.page.content();

              // Reuse existing parsing logic? 
              // Nitter Search results use .timeline-item class, same as profile HTML!
              // So we can manually trigger the Nitter HTML parser section of parseFeedContent
              // But parseFeedContent expects full XML or checks. Let's extract manually here to be safe and specific.

              if (content.includes('timeline-item')) {
                  const $ = cheerio.load(content);
                  const items: XNewsItem[] = [];
                  
                  $('.timeline-item').each((i, el) => {
                      if (i >= 5) return;
                      const $el = $(el);
                      
                      // Check text to ensure it's not empty
                      const text = $el.find('.tweet-content').text().trim();
                      if (!text) return;

                      const dateText = $el.find('.tweet-date a').attr('title');
                      const link = $el.find('.tweet-link').attr('href');
                      
                      let absoluteLink = link;
                      if (link && !link.startsWith('http')) {
                           // Try to reconstruct valid URL
                           absoluteLink = `https://fixupx.com${link}`; 
                      }

                      items.push({
                        title: this.cleanText(text).substring(0, 100) + '...',
                        source: `X - ${feed.title}`,
                        url: absoluteLink || '',
                        published_at: dateText ? new Date(dateText).toISOString() : new Date().toISOString(),
                        content: this.cleanText(text),
                        sentiment: 'neutral',
                        timestamp: dateText ? new Date(dateText) : new Date(),
                      });
                  });

                  if (items.length > 0) {
                      return items;
                  }
              }
          } catch (e) {
              console.warn(`⚠️ Search Fallback failed on ${instance}: ${e instanceof Error ? e.message : String(e)}`);
          }
      }


      return [];
  }

  /**
   * Robust text cleaning (Moved from Publisher to Scraper for efficiency)
   */
  private cleanText(text: string): string {
    if (!text) return '';
    
    return text
      // Remove "Pinned" marker often found at start of Nitter RSS
      .replace(/^Pinned\s+/i, '')
      .replace(/Pinned Tweet/i, '')
      // Remove common repetitive prefixes to improve title uniqueness
      .replace(/^(ICYMI|O\/N|Thread|Update|Breaking|Megathread)\s*[:|-]?\s*/yi, '') // Recursive replace might be needed, but single pass covers most start of line
      .replace(/^(ICYMI|O\/N|Thread|Update|Breaking|Megathread)\s*[:|-]?\s*/yi, '') // Run twice for combos like "ICYMI O/N"
      .replace(/^(ICYMI|O\/N|Thread|Update|Breaking|Megathread)\s*[:|-]?\s*/yi, '') // Run thrice just in case
      // NUCLEAR OPTION: Remove any line that STARTS with an image tag (common in Jina output)
      .replace(/^\s*\[?!\[[\s\S]*?\]\([\s\S]*?\).*?$/gm, '') 
      
      // Remove specific Jina artifacts by name
      .replace(/\[!\[Image \d+:.*?\]\(.*?\)/g, '')
      .replace(/\[!\[Square profile picture.*?\]\(.*?\)/g, '')
      .replace(/\[!\[Article cover image.*?\]\(.*?\)/g, '')

      // Remove nested markdown images/links (Linked Images) - Multiline aware
      .replace(/\[!\[[\s\S]*?\]\([\s\S]*?\)\]\([\s\S]*?\)/g, '')
      // Remove standalone markdown images - Multiline aware
      .replace(/!\[[\s\S]*?\]\([\s\S]*?\)/g, '')
      // SCORCHED EARTH POLICY for images: Remove anything looking like an image tag with "Image" or "picture" in it
      .replace(/\[?!\[[\s\S]*?(?:Image|picture)[\s\S]*?\]\([\s\S]*?\)(?:\]\([\s\S]*?\))?/gi, '')
      
      // Remove specific artifact "Image [digit]:" or just "Image" that might remain
      .replace(/^Image\s*\d*:?\s*/i, '')
      .replace(/\nImage\s*\d*:?\s*/gi, '\n')
      // Replace markdown links [text](url) with just 'text' key
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove timestamps at start of line e.g. "1:04 "
      .replace(/^\s*\d{1,2}:\d{2}\s+/, '')
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Decode entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Parse RSS/Atom feed content and extract items
   */
  private async parseFeedContent(content: string, feed: XFeed, instanceUrl?: string): Promise<XNewsItem[]> {
    console.log(`🔍 Parsing content for ${feed.title} (${content.length} chars)`);
    const items: XNewsItem[] = [];

    try {
      // Check if this is jina.ai content (text format)
      // We check explicit headers OR if the instance used was Jina (assuming it returns text/markdown)
      if (content.includes('Markdown Content:') || 
          content.includes('URL Source:') || 
          (instanceUrl && instanceUrl.includes('jina.ai')) ||
          content.trim().startsWith('Title:')) {
        console.log(`📝 Parsing jina.ai content for ${feed.title}`);
        return this.parseJinaAiContent(content, feed);
      }

      // Try XML parsing first
      console.log('📄 Trying XML parsing...');
      let $ = cheerio.load(content, { xmlMode: true });
      let entries = $('item').toArray();
      console.log(`📊 XML parsing found ${entries.length} entries`);

      // If no entries in XML mode, try HTML parsing
      // If no entries in XML mode, try HTML parsing
      if (entries.length === 0) {
        console.log('📄 Trying HTML parsing...');
        $ = cheerio.load(content);
        entries = $('item').toArray();
        console.log(`📊 HTML parsing found ${entries.length} entries`);

        // If still no entries, look for content in <pre> tag (common with Playwright)
        if (entries.length === 0) {
          console.log('📄 Checking <pre> tag content...');
          const preText = $('pre').text();
          if (preText) {
            const $xml = cheerio.load(preText, { xmlMode: true });
            entries = $xml('item').toArray();
            $ = $xml; // Use XML context
            console.log(`📊 <pre> tag parsing found ${entries.length} entries`);
          }
        }
      }

      // Fallback: Nitter HTML parsing (if RSS endpoint redirected to HTML profile or RSS is disabled but HTML works)
      if (entries.length === 0 && content.includes('timeline-item')) {
          console.log('📄 Detected Nitter HTML format, attempting to parse timeline...');
          const $nitter = cheerio.load(content);
          
          $nitter('.timeline-item').each((i, el) => {
              if (i >= 5) return; // Limit to 5
              
              const $el = $nitter(el);
              // Nitter structure: .tweet-date a title="date", .tweet-link href, .tweet-content
              const dateText = $el.find('.tweet-date a').attr('title'); 
              const link = $el.find('.tweet-link').attr('href');
              const contentText = $el.find('.tweet-content').text().trim();
              
              if (contentText) {
                  // Construct absolute URL (using fixupx as base to be safe)
                  let absoluteLink = link;
                  if (link && !link.startsWith('http')) {
                       // heuristic to guess base or just force fixed base
                       absoluteLink = `https://fixupx.com${link}`;
                  }

                  // Try to parse date
                  let pubDate = new Date();
                  if (dateText) {
                      try { pubDate = new Date(dateText); } catch {}
                  }

                  items.push({
                    title: this.cleanText(contentText).substring(0, 100) + '...',
                    source: `X - ${feed.title}`,
                    url: absoluteLink || '',
                    published_at: pubDate.toISOString(),
                    content: this.cleanText(contentText),
                    sentiment: 'neutral',
                    timestamp: pubDate,
                  });
              }
          });
          
          if (items.length > 0) {
              console.log(`📊 Recovered ${items.length} items from Nitter HTML`);
              return items;
          }
      }

      if (entries.length === 0) {
        console.warn(`⚠️ No entries found in feed ${feed.title}`);
        return [];
      }

      console.log(`📊 Found ${entries.length} entries in ${feed.title}`);

      // Limit to top 5 entries per feed
      entries = entries.slice(0, 5);

      for (const element of entries) {
        try {
          const title = $(element).find('title').text().trim();
          const link = $(element).find('link').text().trim();
          const pubDate = $(element).find('pubDate').text().trim();
          const description = $(element).find('description').text().trim();

          console.log(`📝 Processing entry: ${title || 'untitled'}`);

          // Skip if missing essential fields
          if (!title && !description) {
            console.warn(`⚠️ Skipping entry with no title or description`);
            continue;
          }

          // For X/Twitter RSS, the description is usually the tweet content
          const content = description || title;

          // Convert to FixupX if it's a specific status (Pre-processing for Discord)
          let finalLink = link;
          if (finalLink && finalLink.includes('/status/')) {
            finalLink = finalLink
                .replace('twitter.com', 'fixupx.com')
                .replace('x.com', 'fixupx.com')
                .replace(/nitter\.[^/]+/, 'fixupx.com');
          }

          const newsItem: XNewsItem = {
            title: this.cleanText(title || description).substring(0, 200),
            source: `X - ${feed.title}`,
            url: finalLink,
            published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            content: this.cleanText(content),
            sentiment: 'neutral',
            timestamp: pubDate ? new Date(pubDate) : new Date(),
          };

          items.push(newsItem);
        } catch (error) {
          console.warn(`⚠️ Error parsing entry in ${feed.title}:`, error);
        }
      }

      console.log(`✅ Successfully parsed ${items.length} items from ${feed.title}`);
      return items;
    } catch (error) {
      console.error(`💥 Content parsing failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(
        `💥 Content parsing failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Fallback method using axios for simple HTTP requests
   */
  private async fetchWithAxcess(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/rss+xml, application/xml, text/xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 15000,
      });

      return response.data;
    } catch (error) {
      throw new Error(
        `Axios request failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Parse jina.ai content format
   */
  private parseJinaAiContent(content: string, feed: XFeed): XNewsItem[] {
    console.log(`🔍 Debug Jina Content for ${feed.title}:`, content.substring(0, 500));
    
    let cleanContent = content;
    // If content is HTML, try to extract text from <pre> tag
    if (content.trim().startsWith('<')) {
      try {
        const $ = cheerio.load(content);
        const preText = $('pre').text();
        if (preText) {
          console.log('🧹 Extracted text from <pre> tag');
          cleanContent = preText;
        }
      } catch (e) {
        console.warn('⚠️ Failed to extract text from HTML, using raw content');
      }
    }

    const items: XNewsItem[] = [];

    try {
      // Extract title from the beginning of the content
      // Remove ^ anchor to be more robust
      const titleMatch = cleanContent.match(/Title:\s*(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : feed.title;

      // Extract URL source
      const urlMatch = cleanContent.match(/URL Source:\s*(.+)$/m);
      let url = urlMatch ? urlMatch[1].trim() : `https://x.com/${feed.title}`;

      // Extract the main content after "Markdown Content:"
      const contentMatch = cleanContent.match(/Markdown Content:\s*(.+)$/s);
      let bodyContent = contentMatch ? contentMatch[1].trim() : cleanContent;

      // VALIDATION: Check for login walls and generic content
      const lowerContent = bodyContent.toLowerCase();
      if (lowerContent.includes('people on x are the first to know') || 
          lowerContent.includes('don’t miss what’s happening') ||
          (lowerContent.includes('log in') && lowerContent.includes('sign up')) ||
          lowerContent.includes('rate limit exceeded') ||
          lowerContent.includes('"message":"per ip rate limit')
          ) {
        console.warn(`⚠️ [Scraper] Rejected login wall/error/rate-limit content for ${feed.title}`);
        return [];
      }
      
      // JSON ERROR CHECK: likely a raw JSON error response was parsed as text
      if (bodyContent.trim().startsWith('{') && bodyContent.includes('"data":null')) {
          console.warn(`⚠️ [Scraper] Rejected JSON error response for ${feed.title}`);
          return [];
      }

      // INTELLIGENT EXTRACTION: Try to skip the Bio and find the actual posts
      // Look for "Name's posts" header or dashed lines common in Jina output
      let postsSectionMatch = bodyContent.match(/(?:’s|'s) posts\s*\n-+\s*\n([\s\S]+)/i) || 
                                bodyContent.match(/={5,}\s*\n([\s\S]+)/); // Fallback to === separators
      
      // Also try standard markdown separator typical of Jina Reader
      if (!postsSectionMatch) {
          const splitByDash = bodyContent.split(/\n-{3,}\n/);
          if (splitByDash.length > 2) {
              // Usually [header] --- [pinned/first post] --- [next post]
              // Or [header] --- [bio] --- [posts]
              // We take the last part or join the last parts
              postsSectionMatch = [null as any, splitByDash.slice(1).join('\n---\n')];
          } else if (splitByDash.length === 2 && splitByDash[1].length > 50) {
              postsSectionMatch = [null as any, splitByDash[1]];
          }
      }

      let postContent = bodyContent;
      if (postsSectionMatch && postsSectionMatch[1] && postsSectionMatch[1].length > 20) {
          console.log(`✂️ Found "Posts" section for ${feed.title}, trimming bio...`);
          postContent = postsSectionMatch[1].trim();
      } else {
          // Fallback: Try to find the first timestamp or "Pinned" marker to skip header
          const firstPostIndex = Math.max(
            bodyContent.indexOf('Pinned'),
            bodyContent.search(/\d+[hm] ago/),
            bodyContent.search(/[A-Z][a-z]{2} \d{1,2}, \d{4}/) // Date like Oct 24, 2024
          );
          
          if (firstPostIndex > 50 && firstPostIndex < 1000) {
             console.log(`✂️ Found post marker at index ${firstPostIndex} for ${feed.title}, trimming header...`);
             postContent = bodyContent.substring(firstPostIndex).trim();
          }
      }

      // Final check on the extracted post content
      if (postContent.length < 50) {
         console.warn(`⚠️ [Scraper] Extracted content too short for ${feed.title}, falling back to full content`);
         // If trim failed or result is tiny, revert to full but try to skip first few lines
         const lines = bodyContent.split('\n');
         if (lines.length > 5) {
             postContent = lines.slice(3).join('\n'); // Skip title/url/empty lines
         } else {
             postContent = bodyContent;
         }
      }


      // SPLIT INTO INDIVIDUAL POSTS
      // Jina Reader traditionally uses '---' to separate tweets, but sometimes (Dec 2025) it uses no separators,
      // just a repeating header block for each tweet.
      let rawPosts = postContent.split(/\n-{3,}\n/);
      
      if (rawPosts.length <= 1) {
          console.log(`⚠️ No standard separators found in Jina content, attempting heuristic split...`);
          // Heuristic: Split by the Author Header block which appears at the start of every tweet
          // Pattern: [Name ...](profile_url) \n \n [@handle](profile_url)
          // We look for the start of the Name block.
          // Warning: The first post might strictly not have a newline before it if we trimmed too much, 
          // so we treat the whole content as "one block" then split it.
          

          // Regex to find start of a post: 
          // Newline (optional) + [Name + Image](Url) + Newlines + [@handle]
          // We use a positive lookahead for the [@handle] part to be sure
          

          // FIX: Use greedy [^\n]* inside the first [] to handle nested brackets (like images found in names)
          // AND use \s+ between the first link and the handle to handle variable whitespace/newlines.
          // AND handle http/https for x.com
          const splitRegex = /(?=\n\[[^\n]*\]\(https?:\/\/x\.com\/[^/]+\)\s+\[@)/g;
          
          const potentialPosts = postContent.split(splitRegex);
          
          // Filter out small garbage items
          if (potentialPosts.length > 1) {
               console.log(`✅ Heuristic split found ${potentialPosts.length} items (Greedy Regex + Flexible Whitespace)`);
               rawPosts = potentialPosts;
          } else {
              // Try another common pattern: [Date](status_url) is usually near the top
              // But splitting by date is risky as it might be in the middle of text (unlikely for Jina format)
              // Let's try splitting by the [Date] line if the author split failed
              // Pattern: \n[Time/Date](status_url)
              // This is usually the 3rd line of a post. So splitting here would cut the header off. 
              // Better to stick to Author header.
              
              // If Author split failed, maybe the name doesn't have an image?
              // Try simple [Name](Url)\n\n[@handle]
              // The regex above `\[.*?\]` covers `[Name]` too.
          }
      }

      
      console.log(`📊 Found ${rawPosts.length} potential posts in Jina content`);

      // Limit to 5 posts
      const validPosts = rawPosts.filter(p => p.trim().length > 20).slice(0, 5);

      for (const [index, singlePost] of validPosts.entries()) {
          let postBody = singlePost.trim();
          
          // Skip if it looks like a header artifact we missed
          if (postBody.includes('Pinned Tweet') && postBody.length < 30) continue;

          // EXTRACT SPECIFIC URL FOR THIS POST
          // Try to find the date/link line which Jina often puts at the bottom or top
          // e.g. "[Oct 24, 2024](https://x.com/.../status/...)"
          let itemUrl = url;
          const statusUrlMatch = postBody.match(/\[.*?\]\((https?:\/\/[^\s)]+\/status\/\d+)\)/) ||
                                 postBody.match(/(https?:\/\/[^\s]+\/status\/\d+)/);
          
          if (statusUrlMatch) {
              itemUrl = statusUrlMatch[1];
          } else if (index === 0 && url.includes('/status/')) {
              // If it's the first post and the main URL is a status URL, use it
               itemUrl = url;
          }


          // GENERATE TITLE
          let itemTitle = title;
          let cleanPostStart = postBody;
          
          // Remove ugly "Image 1: Opens profile photo" or raw link artifacts from start of posts
          cleanPostStart = cleanPostStart
              .replace(/^!?\[?Image \d+.*?\n?/g, '') // "Image 1: ..." lines
              .replace(/^!\[.*?\]\(.*?\)\s*/, '') // Leading markdown images
              .replace(/^Pinned\s+/i, '')
              .replace(/^Title:.*?\n/i, '')
              .replace(/^URL Source:.*?\n/i, '')
              .replace(/^Markdown Content:.*?\n/i, '')
              .replace(/\[.*?\]\(.*?\)/g, '') // Remove remaining markdown links
              .replace(/https?:\/\/\S+/g, '') // Remove raw URLs
              .replace(/\s+/g, ' ')
              .trim();
          
          // If the post starts with "](", it's a leftover artifact from a broken link parse
          if (cleanPostStart.startsWith('](')) {
              cleanPostStart = cleanPostStart.substring(2).trim();
          }

          if (cleanPostStart.length > 5) {
               itemTitle = cleanPostStart.substring(0, 100) + (cleanPostStart.length > 100 ? '...' : '');
          }

          if (index === 0) console.log(`🏷️  Title for post ${index + 1}: ${itemTitle}`);

          // Convert to FixupX if it's a specific status (Pre-processing for Discord)
          if (itemUrl.includes('/status/')) {
            itemUrl = itemUrl
                .replace('twitter.com', 'fixupx.com')
                .replace('x.com', 'fixupx.com')
                .replace(/nitter\.[^/]+/, 'fixupx.com');
          }

          const newsItem: XNewsItem = {
            title: this.cleanText(itemTitle).substring(0, 200),
            source: `X - ${feed.title}`,
            url: itemUrl,
            published_at: new Date().toISOString(), // We could try to parse date from Jina but current date is safer fallback
            content: this.cleanText(postBody).substring(0, 1000), 

            sentiment: 'neutral',
            timestamp: new Date(),
          };

          // --- FILTER BY DATE: Reject posts older than 5 days ---
          // Extract date from FixupX pattern: FixupX•2023-03-07 15:50
          const fixupxMatch = postBody.match(/FixupX•(\d{4}-\d{2}-\d{2} \d{2}:\d{2})/);
          if (fixupxMatch) {
            const postDate = new Date(fixupxMatch[1]);
            const now = new Date();
            const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

            if (postDate < fiveDaysAgo) {
                console.log(`🗑️ REJECTING: Old post (${postDate.toISOString().split('T')[0]} < 5 days): ${itemTitle.substring(0, 50)}...`);
                continue;
            }
          }

          // Also check for other old date patterns
          if (cleanPostStart.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+20[0-2][0-9]\b/)) {
              console.log(`🗑️ REJECTING: Old post (date pattern detected): ${itemTitle.substring(0, 50)}...`);
              continue;
          }

          items.push(newsItem);
      }

      console.log(`✅ Created ${items.length} item(s) from jina.ai content for ${feed.title}`);

    } catch (error) {
      console.warn(`Error parsing jina.ai content for ${feed.title}:`, error);
    }

    return items;
  }
}
