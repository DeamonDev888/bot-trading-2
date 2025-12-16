#!/usr/bin/env node

/**
 * SimplePublisherOptimized - VERSION UNIQUE
 * Utilise les services optimisés:
 * - OptimizedDatabaseService (connection pooling)
 * - DatabaseCacheService (cache PostgreSQL)
 * - BatchProcessingService (batch updates)
 * - PipelineMonitoring (métriques)
 */

import * as dotenv from 'dotenv';
import { fileURLToPath, pathToFileURL } from 'url';
import * as path from 'path';
import { Client, GatewayIntentBits, TextChannel, NewsChannel } from 'discord.js';
import { optimizedDb } from '../backend/database/OptimizedDatabaseService.js';
import { databaseCache } from '../backend/database/DatabaseCacheService.js';
import { batchProcessor } from '../backend/database/BatchProcessingService.js';
import { pipelineMonitoring } from '../backend/monitoring/PipelineMonitoring.js';

dotenv.config();

interface NewsItem {
  id: number;
  title: string;
  content: string;
  source: string;
  url: string;
  published_at: string;
  relevance_score: number;
  category: string;
  priority?: string;
}

interface PublishResult {
  success: boolean;
  published?: number;
  skipped?: number;
  errors?: string[];
}

export class SimplePublisherOptimized {
  private channelId: string | undefined;
  private channelIA: string | undefined;
  private channelFinance: string | undefined;
  private token: string | undefined;

  // Configuration optimisée V2
  private readonly PUBLISH_THRESHOLD = 1;
  private readonly MAX_POSTS_PER_RUN = 1000;
  private readonly MAX_POSTS_PER_SOURCE_PER_RUN = 1000;
  private readonly ANTI_SPAM_DELAY = 500;
  private readonly PRIORITY_WEIGHT_HIGH = 0.6;
  private readonly PRIORITY_WEIGHT_MEDIUM = 0.3;
  private readonly PRIORITY_WEIGHT_LOW = 0.1;
  private readonly MAX_TITLE_LENGTH = 100;
  private readonly MAX_CONTENT_LENGTH = 400;

  constructor() {
    this.channelId = process.env.DISCORD_CHANNEL_ID;
    this.channelIA = process.env.DISCORD_CHANNEL_IA;
    this.channelFinance = process.env.DISCORD_CHANNEL_FINANCE;
    this.token = process.env.DISCORD_TOKEN;

    console.log('🚀 SimplePublisherOptimizedV2 initialized with optimizations:');
    console.log('   ✅ OptimizedDatabaseService (connection pooling)');
    console.log('   ✅ DatabaseCacheService (PostgreSQL cache)');
    console.log('   ✅ BatchProcessingService (batch updates)');
    console.log('   ✅ PipelineMonitoring (metrics)');
  }

  /**
   * Récupération optimisée des news avec cache
   */
  async getUnpublishedNewsOptimized(): Promise<NewsItem[]> {
    const timer = pipelineMonitoring.startTimer();

    try {
      console.log('📦 Checking cache for ready posts...');

      // Utiliser le cache PostgreSQL au lieu de requêter directement
      const cachedPosts = await databaseCache.getReadyPosts();

      if (cachedPosts && cachedPosts.length > 0) {
        pipelineMonitoring.recordCacheHit(true);
        console.log(`📦 Cache hit: ${cachedPosts.length} posts retrieved`);
        return cachedPosts;
      }

      pipelineMonitoring.recordCacheHit(false);
      console.log('📦 Cache miss: fetching from database...');

      // Requête optimisée via le service
      const timerFn = pipelineMonitoring.startTimer();
      const posts = await optimizedDb.getReadyPostsOptimized();
      timerFn(); // Call the timer function to record the duration

      console.log(`📊 Retrieved ${posts.length} posts from database`);
      return posts;

    } catch (error) {
      pipelineMonitoring.recordError();
      console.error('❌ Error getting unpublished news:', error);
      throw error;
    }
  }

  /**
   * Publication optimisée avec batch processing
   */
  async publishToDiscordOptimized(newsData: NewsItem[]): Promise<PublishResult> {
    const { items } = { items: newsData };
    if (!items || items.length === 0) {
      return { success: true, published: 0, skipped: 0 };
    }

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });

    let published = 0;
    let skipped = 0;
    const errors: string[] = [];
    const publishedIds: number[] = [];

    try {
      await client.login(this.token);

      // Pré-fetch des canaux
      let channelIA: any = null;
      let channelFinance: any = null;
      let channelDefault: any = null;

      if (this.channelIA) {
        try { channelIA = await client.channels.fetch(this.channelIA); } catch (e: any) { errors.push(`Channel IA error: ${e.message}`); }
      }
      if (this.channelFinance) {
        try { channelFinance = await client.channels.fetch(this.channelFinance); } catch (e: any) { errors.push(`Channel Finance error: ${e.message}`); }
      }
      if (this.channelId) {
        try { channelDefault = await client.channels.fetch(this.channelId); } catch (e: any) { errors.push(`Channel Default error: ${e.message}`); }
      }

      console.log(`📢 Publishing ${items.length} messages with optimizations...`);

      // Traiter par batches pour éviter de surcharger Discord
      const batches = this.chunkArray(items, 10); // 10 posts par batch

      for (const batch of batches) {
        const batchResults = await this.processBatch(batch, channelIA, channelFinance, channelDefault, errors);
        published += batchResults.published;
        skipped += batchResults.skipped;
        publishedIds.push(...batchResults.publishedIds);

        // Invalider le cache après chaque batch publié
        if (publishedIds.length > 0) {
          await databaseCache.invalidate('ready_posts_5_days');
        }

        // Délai entre batches
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Batch update des posts publiés (OPTIMISÉ)
      if (publishedIds.length > 0) {
        const timer = pipelineMonitoring.startTimer();
        await batchProcessor.markAsPublishedBatch(publishedIds);
        const batchTime = timer();
        console.log(`⚡ Batch update: ${publishedIds.length} posts marked in ${batchTime}ms`);
      }

      pipelineMonitoring.recordPostsProcessed(items.length);
      pipelineMonitoring.recordPostsPublished(published);
      pipelineMonitoring.recordPostsFailed(skipped);

      console.log(`✅ Publishing completed: ${published} published, ${skipped} skipped`);

      return {
        success: errors.length === 0,
        published,
        skipped,
        errors
      };

    } catch (error: any) {
      pipelineMonitoring.recordError();
      console.error('❌ Publishing error:', error);
      return {
        success: false,
        published,
        skipped,
        errors: [`Global error: ${error.message}`]
      };
    } finally {
      await client.destroy();
    }
  }

  /**
   * Traiter un batch de posts
   */
  private async processBatch(
    batch: NewsItem[],
    channelIA: any,
    channelFinance: any,
    channelDefault: any,
    errors: string[]
  ): Promise<{ published: number; skipped: number; publishedIds: number[] }> {
    let published = 0;
    let skipped = 0;
    const publishedIds: number[] = [];

    for (const item of batch) {
      try {
        const message = this.formatDiscordMessageOptimized(item);

        // Détermination du canal cible
        let targetChannel = channelDefault;
        const cat = (item.category || '').toLowerCase();

        if (cat.includes('ai') || cat.includes('ia') || cat.includes('robot') || cat.includes('intelligence')) {
          if (channelIA) targetChannel = channelIA;
        } else {
          if (channelFinance) targetChannel = channelFinance;
        }

        if (targetChannel && (targetChannel.isTextBased())) {
          // Anti-doublon
          try {
            const lastMessages = await targetChannel.messages.fetch({ limit: 10 });
            const isDuplicate = lastMessages.some((m: any) => m.content.includes(item.title.substring(0, 50)));

            if (isDuplicate) {
              console.log(`⚠️ Duplicate detected: ${item.title.substring(0, 40)}...`);
              skipped++;
              continue;
            }
          } catch (err) {
            console.warn('⚠️ Could not check duplicates:', err);
          }

          // Publier
          try {
            await (targetChannel as TextChannel | NewsChannel).send(message);
            console.log(`✅ Published: ${item.title.substring(0, 40)}...`);
            published++;
            publishedIds.push(item.id);

            // Délai anti-spam
            await new Promise(resolve => setTimeout(resolve, this.ANTI_SPAM_DELAY));

          } catch (publishError: any) {
            console.error(`❌ Publish error ${item.id}:`, publishError.message);
            errors.push(`Publish error for ${item.id}: ${publishError.message}`);
            skipped++;
          }

        } else {
          console.error(`❌ No channel available for: ${item.title}`);
          skipped++;
        }

      } catch (itemError: any) {
        console.error(`❌ Item processing error ${item.id}:`, itemError.message);
        errors.push(`Processing error for ${item.id}: ${itemError.message}`);
        skipped++;
      }
    }

    return { published, skipped, publishedIds };
  }

  /**
   * Formatage optimisé des messages Discord
   */
  formatDiscordMessageOptimized(item: NewsItem): string {
    const emoji = this.getCategoryEmoji(item.category);
    const aggressiveCleanup = (text: string): string => {
      return text
        .replace(/\[!\[Image[^\]]*\]\([^)]*\)\s*\([^)]*\)]/g, '')
        .replace(/\[!\[Image[^\]]*\]\([^)]*\)]/g, '')
        .replace(/!\[Image[^\]]*\]\([^)]*\)/g, '')
        .replace(/FixupX•\d{4}-\d{2}-\d{2} \d{2}:\d{2}/g, '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    let cleanTitle = aggressiveCleanup(item.title || '');
    let cleanContent = aggressiveCleanup(item.content || '');

    if (cleanTitle.length > this.MAX_TITLE_LENGTH) {
      cleanTitle = cleanTitle.substring(0, this.MAX_TITLE_LENGTH - 3) + '...';
    }

    let message = `**${emoji} ${cleanTitle}**\n\n`;

    if (item.priority === 'HIGH') {
      if (cleanContent && cleanContent !== cleanTitle && cleanContent.length > 20) {
        if (cleanContent.length > this.MAX_CONTENT_LENGTH) {
          cleanContent = cleanContent.substring(0, this.MAX_CONTENT_LENGTH) + '...';
        }
        message += `${cleanContent}\n`;
      }
    } else {
      if (cleanContent && cleanContent !== cleanTitle && cleanContent.length > 50) {
        const shortContent = cleanContent.substring(0, 250) + '...';
        message += `${shortContent}\n`;
      }
    }

    const scoreColor = this.getScoreColor(item.relevance_score);
    const priorityIcon = item.priority === 'HIGH' ? '🔥' : item.priority === 'MEDIUM' ? '⭐' : '📄';
    message += `\n*${priorityIcon} Source: ${item.source} | Score: ${item.relevance_score}/10 ${scoreColor}*\n`;

    if (item.url) {
      let finalUrl = this.convertToFixupX(item.url);
      message += finalUrl;
    }

    return message;
  }

  /**
   * Conversion URL vers FixupX
   */
  private convertToFixupX(url: string): string {
    if (!url) return url;

    let fixupUrl = url
      .replace(/(?:https?:\/\/)?(?:www\.)?twitter\.com\//g, 'https://fixupx.com/')
      .replace(/(?:https?:\/\/)?(?:www\.)?x\.com\//g, 'https://fixupx.com/')
      .replace(/(?:https?:\/\/)?(?:www\.)?nitter\.[^\/]+\//g, 'https://fixupx.com/')
      .replace(/(?:https?:\/\/)?(?:www\.)?vxtwitter\.com\//g, 'https://fixupx.com/')
      .replace(/(?:https?:\/\/)?(?:www\.)?fxtwitter\.com\//g, 'https://fixupx.com/');

    if (!fixupUrl.startsWith('http')) {
      fixupUrl = 'https://' + fixupUrl;
    }

    return fixupUrl;
  }

  /**
   * Emoji par catégorie
   */
  getCategoryEmoji(category: string | null): string {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('crypto')) return '₿';
    if (cat.includes('market')) return '📈';
    if (cat.includes('economy')) return '🏛️';
    if (cat.includes('tech') || cat.includes('ia')) return '💻';
    if (cat.includes('ai')) return '🤖';
    return '📰';
  }

  /**
   * Couleur par score
   */
  getScoreColor(score: number): string {
    if (score >= 8) return '🟢';
    if (score >= 6) return '🟡';
    if (score >= 4) return '🟠';
    return '🔴';
  }

  /**
   * Découper un array en batches
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Cycle principal optimisé V2
   */
  async runPublishingCycleOptimized(threshold: number = this.PUBLISH_THRESHOLD): Promise<PublishResult> {
    // Increment requests counter (accessing via exportMetrics)
    const metrics = pipelineMonitoring.exportMetrics();
    // Note: stats increment will be handled by individual record methods

    try {
      console.log(`🚀 SimplePublisherOptimizedV2 - Threshold: ${threshold}`);

      // 1. Récupérer les news avec cache
      const newsData = await this.getUnpublishedNewsOptimized();

      if (newsData.length === 0) {
        console.log('✅ No news to publish.');
        return { success: true, published: 0, skipped: 0 };
      }

      // 2. Vérifier le seuil
      if (threshold > 0 && newsData.length < threshold) {
        console.log(`⏳ Waiting: ${newsData.length}/${threshold} news accumulated`);
        return { success: true, published: 0, skipped: 0 };
      }

      console.log(`📝 Publishing ${newsData.length} news items`);

      // 3. Publier avec optimisations
      const result = await this.publishToDiscordOptimized(newsData);

      console.log(`✅ Publishing completed. Published: ${result.published}, Skipped: ${result.skipped}`);
      if (result.errors && result.errors.length > 0) {
        console.log(`❌ Errors: ${result.errors.length}`);
      }

      // 4. Afficher les métriques
      const metrics = pipelineMonitoring.exportMetrics();
      console.log(`📊 Metrics - Cache hit: ${metrics.requests.cacheHitRate}%, Avg query: ${metrics.performance.avgQueryTime}ms`);

      return result;

    } catch (error: any) {
      pipelineMonitoring.recordError();
      console.error('❌ Global error:', error);
      return {
        success: false,
        published: 0,
        skipped: 0,
        errors: [`Global error: ${error.message}`]
      };
    }
  }

  /**
   * Afficher le dashboard de monitoring
   */
  printMonitoringDashboard(): void {
    pipelineMonitoring.printStats();
  }
}

// Exécution directe
const isMainModule = import.meta.url === pathToFileURL(process.argv[1]).href ||
                     process.argv[1].endsWith('SimplePublisherOptimized.ts');

if (isMainModule) {
  const publisher = new SimplePublisherOptimized();
  const thresholdArg = process.argv.find(arg => arg.includes('--threshold='));
  const threshold = thresholdArg ? parseInt(thresholdArg.split('=')[1]) : undefined;

  publisher.runPublishingCycleOptimized(threshold)
    .then((result) => {
      console.log('\n📊 FINAL RESULT:');
      console.log(`✅ Success: ${result.success}`);
      console.log(`📤 Published: ${result.published}`);
      console.log(`🚫 Skipped: ${result.skipped}`);
      if (result.errors && result.errors.length > 0) {
        console.log(`❌ Errors: ${result.errors.length}`);
      }

      // Afficher le dashboard
      console.log('\n📊 MONITORING DASHBOARD:');
      publisher.printMonitoringDashboard();

      process.exit(result.success ? 0 : 1);
    })
    .catch((err) => {
      console.error('❌ Fatal error:', err);
      process.exit(1);
    });
}
