#!/usr/bin/env node

/**
 * SERVICE DE FILTRAGE PAR ÂGE DES NEWS
 * Gestion configurable de l'âge des posts
 * Support pour différents types de contenus et stratégies
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export interface AgeFilterConfig {
  // Configuration principale
  maxAgeDays: number;                // Âge maximum en jours
  maxAgeHours: number;               // Âge maximum en heures (pour posts récents)
  futureThresholdHours: number;      // Seuil pour posts futurs

  // Filtrage par type de contenu
  contentTypes: {
    [key: string]: {
      maxAgeDays: number;
      importance: 'critical' | 'important' | 'normal' | 'low';
      keywords: string[];
    };
  };

  // Stratégies spéciales
  strategies: {
    allowHistoricalReferences: boolean;
    blockCalendarEvents: boolean;
    blockPromotional: boolean;
    allowAnalysisContent: boolean;
  };

  // Périodes spéciales (breaking news, etc.)
  specialPeriods: {
    breakingNewsMultiplier: number;  // Multiplicateur d'âge pour breaking news
    weekendMultiplier: number;       // Multiplicateur d'âge pour weekends
    holidayMultiplier: number;        // Multiplicateur d'âge pour vacances
  };
}

export interface FilterResult {
  shouldKeep: boolean;
  reason: string;
  age: number;
  category: string;
  originalItem: any;
}

export class AgeFilterService {
  private pool: Pool;
  private config: AgeFilterConfig;
  private static instance: AgeFilterService;

  constructor(config?: Partial<AgeFilterConfig>) {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'financial_analyst',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '9022',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Configuration par défaut
    this.config = {
      maxAgeDays: 7,                    // 7 jours par défaut
      maxAgeHours: 72,                   // 3 jours pour posts très récents
      futureThresholdHours: 1,           // 1 heure dans le futur

      contentTypes: {
        'breaking_news': {
          maxAgeDays: 3,
          importance: 'critical',
          keywords: ['breaking', 'urgent', 'alert', 'flash', 'critical', 'emergency']
        },
        'market_data': {
          maxAgeDays: 2,
          importance: 'important',
          keywords: ['market', 'trading', 'price', 'volume', 'stocks', 'bonds', 'commodities']
        },
        'earnings': {
          maxAgeDays: 5,
          importance: 'important',
          keywords: ['earnings', 'quarterly', 'revenue', 'profit', 'guidance', 'results']
        },
        'fed_policy': {
          maxAgeDays: 14,
          importance: 'critical',
          keywords: ['fed', 'federal reserve', 'interest rate', 'inflation', 'monetary policy', 'powell']
        },
        'tech_launches': {
          maxAgeDays: 5,
          importance: 'important',
          keywords: ['launch', 'release', 'product', 'feature', 'update', 'announcement']
        },
        'ai_research': {
          maxAgeDays: 10,
          importance: 'important',
          keywords: ['research', 'paper', 'study', 'model', 'ai', 'machine learning', 'gpt']
        },
        'analysis_opinion': {
          maxAgeDays: 3,
          importance: 'normal',
          keywords: ['analysis', 'opinion', 'commentary', 'perspective', 'view', 'thoughts']
        },
        'promotional': {
          maxAgeDays: 1,
          importance: 'low',
          keywords: ['promo', 'discount', 'sale', 'offer', 'deal', 'buy now', 'subscribe']
        }
      },

      strategies: {
        allowHistoricalReferences: false,
        blockCalendarEvents: true,
        blockPromotional: true,
        allowAnalysisContent: true
      },

      specialPeriods: {
        breakingNewsMultiplier: 3,      // Breaking news: 3x plus vieux autorisé
        weekendMultiplier: 1.5,          // Weekend: 1.5x plus vieux autorisé
        holidayMultiplier: 2             // Vacances: 2x plus vieux autorisé
      }
    };

    // Appliquer la configuration personnalisée
    if (config) {
      this.applyCustomConfig(config);
    }
  }

  /**
   * Obtenir l'instance singleton
   */
  static getInstance(config?: Partial<AgeFilterConfig>): AgeFilterService {
    if (!AgeFilterService.instance) {
      AgeFilterService.instance = new AgeFilterService(config);
    }
    return AgeFilterService.instance;
  }

  /**
   * Appliquer une configuration personnalisée
   */
  private applyCustomConfig(customConfig: Partial<AgeFilterConfig>): void {
    if (customConfig.maxAgeDays) this.config.maxAgeDays = customConfig.maxAgeDays;
    if (customConfig.maxAgeHours) this.config.maxAgeHours = customConfig.maxAgeHours;
    if (customConfig.futureThresholdHours) this.config.futureThresholdHours = customConfig.futureThresholdHours;

    if (customConfig.contentTypes) {
      Object.assign(this.config.contentTypes, customConfig.contentTypes);
    }

    if (customConfig.strategies) {
      Object.assign(this.config.strategies, customConfig.strategies);
    }

    if (customConfig.specialPeriods) {
      Object.assign(this.config.specialPeriods, customConfig.specialPeriods);
    }
  }

  /**
   * Détecter la catégorie du contenu
   */
  private detectContentCategory(title: string, content: string): string {
    const text = `${title} ${content}`.toLowerCase();

    for (const [category, config] of Object.entries(this.config.contentTypes)) {
      const hasKeyword = config.keywords.some(keyword => text.includes(keyword));
      if (hasKeyword) {
        return category;
      }
    }

    return 'general';
  }

  /**
   * Calculer le multiplicateur d'âge selon la période actuelle
   */
  private calculateAgeMultiplier(item: any): number {
    let multiplier = 1;
    const now = new Date();

    // Weekend multiplier
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Saturday or Sunday
      multiplier = this.config.specialPeriods.weekendMultiplier;
    }

    // Breaking news check
    const text = `${item.title || ''} ${item.content || ''}`.toLowerCase();
    const hasBreakingKeyword = this.config.contentTypes.breaking_news.keywords.some(keyword =>
      text.includes(keyword)
    );
    if (hasBreakingKeyword) {
      multiplier = Math.max(multiplier, this.config.specialPeriods.breakingNewsMultiplier);
    }

    return multiplier;
  }

  /**
   * Vérifier si un item doit être bloqué pour des raisons spéciales
   */
  private checkSpecialBlocking(item: any): { blocked: boolean; reason: string } {
    const title = (item.title || '').toLowerCase();
    const content = (item.content || '').toLowerCase();
    const text = `${title} ${content}`;

    // Calendar events
    if (this.config.strategies.blockCalendarEvents) {
      const calendarPatterns = [
        '[eco cal', 'eco calendar', 'calendar event', 'economic calendar',
        'event:', 'conference:', 'webinar:', 'meeting:', 'scheduled'
      ];
      const hasCalendarPattern = calendarPatterns.some(pattern => text.includes(pattern));
      if (hasCalendarPattern) {
        return { blocked: true, reason: 'Calendar/event post blocked' };
      }
    }

    // Promotional content
    if (this.config.strategies.blockPromotional) {
      const promoPatterns = [
        '% off', 'discount', 'sale', 'buy now', 'limited time', 'subscribe',
        'promotional', 'advertisement', 'sponsored', 'affiliate'
      ];
      const hasPromoPattern = promoPatterns.some(pattern => text.includes(pattern));
      if (hasPromoPattern) {
        return { blocked: true, reason: 'Promotional content blocked' };
      }
    }

    // Generic content
    const genericPatterns = [
      'thoughts on', 'my opinion', 'just thinking', 'random thought',
      'hello world', 'test post', 'first tweet', 'welcome', 'thank you'
    ];
    const hasGenericPattern = genericPatterns.some(pattern => text.includes(pattern));
    if (hasGenericPattern && text.length < 200) {
      return { blocked: true, reason: 'Generic/low-effort content blocked' };
    }

    return { blocked: false, reason: '' };
  }

  /**
   * Filtrer un item unique
   */
  async filterItem(item: any): Promise<FilterResult> {
    const now = new Date();
    const publishedAt = item.published_at ? new Date(item.published_at) : now;
    const ageInHours = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60);
    const ageInDays = ageInHours / 24;

    // Vérification spéciale (future posts, promotional, etc.)
    const specialCheck = this.checkSpecialBlocking(item);
    if (specialCheck.blocked) {
      return {
        shouldKeep: false,
        reason: specialCheck.reason,
        age: ageInDays,
        category: 'blocked',
        originalItem: item
      };
    }

    // Vérification des posts futurs
    if (ageInHours < -this.config.futureThresholdHours) {
      return {
        shouldKeep: false,
        reason: `Future post (${ageInHours.toFixed(1)}h in future)`,
        age: ageInDays,
        category: 'future',
        originalItem: item
      };
    }

    // Détection de catégorie et configuration
    const category = this.detectContentCategory(item.title || '', item.content || '');
    const categoryConfig = this.config.contentTypes[category] || {
      maxAgeDays: this.config.maxAgeDays,
      importance: 'normal' as const,
      keywords: []
    };

    // Calcul du multiplicateur d'âge
    const ageMultiplier = this.calculateAgeMultiplier(item);
    const effectiveMaxAge = categoryConfig.maxAgeDays * ageMultiplier;

    // Filtrage par âge principal
    if (ageInDays > effectiveMaxAge) {
      return {
        shouldKeep: false,
        reason: `Too old (${ageInDays.toFixed(1)}d > ${effectiveMaxAge}d) for ${category}`,
        age: ageInDays,
        category: category,
        originalItem: item
      };
    }

    // Filtrage par importance
    const isImportant = categoryConfig.importance === 'critical' || categoryConfig.importance === 'important';
    if (!isImportant && ageInDays > this.config.maxAgeHours / 24) {
      return {
        shouldKeep: false,
        reason: `Low importance content too old (${ageInDays.toFixed(1)}d)`,
        age: ageInDays,
        category: category,
        originalItem: item
      };
    }

    return {
      shouldKeep: true,
      reason: `Content acceptable (${category}, ${ageInDays.toFixed(1)}d old)`,
      age: ageInDays,
      category: category,
      originalItem: item
    };
  }

  /**
   * Filtrer un lot d'items
   */
  async filterBatch(items: any[]): Promise<FilterResult[]> {
    const results: FilterResult[] = [];

    for (const item of items) {
      try {
        const result = await this.filterItem(item);
        results.push(result);

        // Logging pour débogage
        if (!result.shouldKeep) {
          console.log(`[AgeFilter] ❌ Blocked: ${result.reason} - ${item.title?.substring(0, 50)}...`);
        } else {
          console.log(`[AgeFilter] ✅ Kept: ${result.category} (${result.age.toFixed(1)}d) - ${item.title?.substring(0, 50)}...`);
        }
      } catch (error) {
        console.error(`[AgeFilter] Error filtering item:`, error);
        results.push({
          shouldKeep: false,
          reason: `Filter error: ${error instanceof Error ? error.message : String(error)}`,
          age: 0,
          category: 'error',
          originalItem: item
        });
      }
    }

    return results;
  }

  /**
   * Nettoyer les anciens items de la base de données
   */
  async cleanupOldItems(dryRun: boolean = true): Promise<{ deleted: number; details: any[] }> {
    const client = await this.pool.connect();
    let deleted = 0;
    const details: any[] = [];

    try {
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - this.config.maxAgeDays * 24 * 60 * 60 * 1000);

      console.log(`[AgeFilter] Starting cleanup (dry run: ${dryRun})`);
      console.log(`[AgeFilter] Cutoff date: ${cutoffDate.toISOString()}`);

      // Récupérer les items qui seront supprimés
      const itemsToDelete = await client.query(`
        SELECT id, title, source, published_at, created_at, processing_status
        FROM news_items
        WHERE published_at < $1
          AND processing_status IN ('raw', 'processed', 'error')
        ORDER BY published_at ASC
        LIMIT 100
      `, [cutoffDate]);

      for (const item of itemsToDelete.rows) {
        details.push({
          id: item.id,
          title: item.title?.substring(0, 50) + '...',
          age: Math.round((now.getTime() - new Date(item.published_at).getTime()) / (1000 * 60 * 60 * 24)),
          source: item.source,
          status: item.processing_status
        });
      }

      if (!dryRun && itemsToDelete.rows.length > 0) {
        // Supprimer les anciens items
        const deleteResult = await client.query(`
          DELETE FROM news_items
          WHERE published_at < $1
            AND processing_status IN ('raw', 'processed', 'error')
        `, [cutoffDate]);

        deleted = deleteResult.rowCount || 0;
      }

      console.log(`[AgeFilter] ${dryRun ? 'Would delete' : 'Deleted'} ${itemsToDelete.rows.length} old items`);

    } finally {
      client.release();
    }

    return { deleted, details };
  }

  /**
   * Obtenir des statistiques sur l'âge des items
   */
  async getAgeStatistics(): Promise<any> {
    const client = await this.pool.connect();

    try {
      const now = new Date();

      // Distribution par âge
      const ageDistribution = await client.query(`
        SELECT
          CASE
            WHEN published_at >= NOW() - INTERVAL '1 hour' THEN '1h'
            WHEN published_at >= NOW() - INTERVAL '24 hours' THEN '24h'
            WHEN published_at >= NOW() - INTERVAL '3 days' THEN '3d'
            WHEN published_at >= NOW() - INTERVAL '7 days' THEN '7d'
            WHEN published_at >= NOW() - INTERVAL '14 days' THEN '14d'
            WHEN published_at >= NOW() - INTERVAL '30 days' THEN '30d'
            ELSE '30d+'
          END as age_range,
          COUNT(*) as count
        FROM news_items
        WHERE published_at IS NOT NULL
        GROUP BY
          CASE
            WHEN published_at >= NOW() - INTERVAL '1 hour' THEN '1h'
            WHEN published_at >= NOW() - INTERVAL '24 hours' THEN '24h'
            WHEN published_at >= NOW() - INTERVAL '3 days' THEN '3d'
            WHEN published_at >= NOW() - INTERVAL '7 days' THEN '7d'
            WHEN published_at >= NOW() - INTERVAL '14 days' THEN '14d'
            WHEN published_at >= NOW() - INTERVAL '30 days' THEN '30d'
            ELSE '30d+'
          END
        ORDER BY MIN(published_at) DESC
      `);

      // Items par statut
      const statusDistribution = await client.query(`
        SELECT processing_status, COUNT(*) as count
        FROM news_items
        GROUP BY processing_status
        ORDER BY count DESC
      `);

      // Items par source (top 10)
      const sourceDistribution = await client.query(`
        SELECT source, COUNT(*) as count
        FROM news_items
        WHERE source IS NOT NULL
        GROUP BY source
        ORDER BY count DESC
        LIMIT 10
      `);

      return {
        timestamp: now.toISOString(),
        config: this.config,
        ageDistribution: ageDistribution.rows,
        statusDistribution: statusDistribution.rows,
        sourceDistribution: sourceDistribution.rows,
        totalItems: await client.query('SELECT COUNT(*) FROM news_items').then(r => parseInt(r.rows[0].count || '0'))
      };

    } finally {
      client.release();
    }
  }

  /**
   * Mettre à jour la configuration
   */
  updateConfig(newConfig: Partial<AgeFilterConfig>): void {
    this.applyCustomConfig(newConfig);
  }

  /**
   * Obtenir la configuration actuelle
   */
  getConfig(): AgeFilterConfig {
    return { ...this.config };
  }

  /**
   * Fermer la connexion à la base de données
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Exécution en mode test
if (import.meta.url === `file://${process.argv[1]}`) {
  const ageFilter = AgeFilterService.getInstance({
    maxAgeDays: 5,
    strategies: {
      allowHistoricalReferences: false,
      blockCalendarEvents: true,
      blockPromotional: true,
      allowAnalysisContent: true
    }
  });

  ageFilter.getAgeStatistics()
    .then(stats => {
      console.log('📊 Age Filter Statistics:');
      console.log(JSON.stringify(stats, null, 2));
    })
    .catch(error => {
      console.error('❌ Error getting statistics:', error);
    })
    .finally(() => {
      ageFilter.close();
    });
}

export default AgeFilterService;