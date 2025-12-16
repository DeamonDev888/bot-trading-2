#!/usr/bin/env node

import { optimizedDb } from '../database/OptimizedDatabaseService.js';
import { databaseCache } from '../database/DatabaseCacheService.js';
import { batchProcessor } from '../database/BatchProcessingService.js';

/**
 * Service de monitoring simple et efficace
 * - Pas d'outils externes requis
 * - Métriques en temps réel
 * - Alertes automatiques
 * - Dashboard console
 */
export class PipelineMonitoring {
  private stats = {
    // Compteurs de requêtes
    requests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    dbQueries: 0,

    // Performance
    processingTime: [] as number[],
    queryTime: [] as number[],

    // Erreurs
    errors: 0,
    retries: 0,

    // Volumes
    postsProcessed: 0,
    postsPublished: 0,
    postsFailed: 0
  };

  private alertThresholds = {
    errorRate: 0.05,        // 5% d'erreurs
    avgProcessingTime: 5000, // 5 secondes
    cacheHitRate: 0.70,     // 70% cache hit rate
    dbConnections: 15       // Alerte si > 15 connexions
  };

  constructor() {
    // Démarrer le monitoring automatique
    this.startAutoMonitoring();

    // Logger des stats toutes les 5 minutes
    setInterval(() => {
      this.printStats();
    }, 5 * 60 * 1000);

    console.log('📊 Pipeline monitoring started');
  }

  /**
   * Démarrer un timer de performance
   */
  startTimer(): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.stats.processingTime.push(duration);

      // Garder seulement les 100 dernières mesures
      if (this.stats.processingTime.length > 100) {
        this.stats.processingTime.shift();
      }
    };
  }

  /**
   * Enregistrer une requête DB
   */
  recordDbQuery(duration: number): void {
    this.stats.dbQueries++;
    this.stats.queryTime.push(duration);

    if (this.stats.queryTime.length > 100) {
      this.stats.queryTime.shift();
    }
  }

  /**
   * Enregistrer un hit/miss de cache
   */
  recordCacheHit(hit: boolean): void {
    if (hit) {
      this.stats.cacheHits++;
    } else {
      this.stats.cacheMisses++;
    }
  }

  /**
   * Enregistrer une erreur
   */
  recordError(): void {
    this.stats.errors++;
  }

  /**
   * Enregistrer un retry
   */
  recordRetry(): void {
    this.stats.retries++;
  }

  /**
   * Enregistrer des posts traités
   */
  recordPostsProcessed(count: number): void {
    this.stats.postsProcessed += count;
  }

  /**
   * Enregistrer des posts publiés
   */
  recordPostsPublished(count: number): void {
    this.stats.postsPublished += count;
  }

  /**
   * Enregistrer des posts échoués
   */
  recordPostsFailed(count: number): void {
    this.stats.postsFailed += count;
  }

  /**
   * Calculer les métriques actuelles
   */
  private calculateMetrics(): any {
    const totalRequests = this.stats.requests;
    const cacheHitRate = totalRequests > 0
      ? this.stats.cacheHits / totalRequests
      : 0;

    const errorRate = totalRequests > 0
      ? this.stats.errors / totalRequests
      : 0;

    const avgProcessingTime = this.stats.processingTime.length > 0
      ? this.stats.processingTime.reduce((a, b) => a + b, 0) / this.stats.processingTime.length
      : 0;

    const avgQueryTime = this.stats.queryTime.length > 0
      ? this.stats.queryTime.reduce((a, b) => a + b, 0) / this.stats.queryTime.length
      : 0;

    // Statistiques DB
    const poolStats = optimizedDb.getPoolStats();
    const activeConnections = poolStats.totalCount - poolStats.idleCount;

    return {
      requests: {
        total: totalRequests,
        cacheHitRate: Math.round(cacheHitRate * 100),
        cacheHits: this.stats.cacheHits,
        cacheMisses: this.stats.cacheMisses
      },

      performance: {
        avgProcessingTime: Math.round(avgProcessingTime),
        avgQueryTime: Math.round(avgQueryTime),
        totalDbQueries: this.stats.dbQueries
      },

      errors: {
        total: this.stats.errors,
        errorRate: Math.round(errorRate * 100),
        retries: this.stats.retries
      },

      database: {
        ...poolStats,
        activeConnections
      },

      volumes: {
        processed: this.stats.postsProcessed,
        published: this.stats.postsPublished,
        failed: this.stats.postsFailed,
        successRate: this.stats.postsProcessed > 0
          ? Math.round((this.stats.postsPublished / this.stats.postsProcessed) * 100)
          : 0
      }
    };
  }

  /**
   * Vérifier les seuils d'alerte
   */
  private checkAlerts(metrics: any): void {
    const alerts: string[] = [];

    // Taux d'erreur
    if (metrics.errors.errorRate > this.alertThresholds.errorRate) {
      alerts.push(`HIGH ERROR RATE: ${metrics.errors.errorRate}% (threshold: ${this.alertThresholds.errorRate * 100}%)`);
    }

    // Temps de traitement
    if (metrics.performance.avgProcessingTime > this.alertThresholds.avgProcessingTime) {
      alerts.push(`SLOW PROCESSING: ${metrics.performance.avgProcessingTime}ms (threshold: ${this.alertThresholds.avgProcessingTime}ms)`);
    }

    // Cache hit rate
    if (metrics.requests.cacheHitRate < this.alertThresholds.cacheHitRate * 100) {
      alerts.push(`LOW CACHE HIT RATE: ${metrics.requests.cacheHitRate}% (threshold: ${this.alertThresholds.cacheHitRate * 100}%)`);
    }

    // Connexions DB
    if (metrics.database.activeConnections > this.alertThresholds.dbConnections) {
      alerts.push(`HIGH DB CONNECTIONS: ${metrics.database.activeConnections} (threshold: ${this.alertThresholds.dbConnections})`);
    }

    // Afficher les alertes
    if (alerts.length > 0) {
      console.warn('\n🚨 PIPELINE ALERTS:');
      alerts.forEach(alert => console.warn(`   ⚠️ ${alert}`));
      console.warn('');
    }
  }

  /**
   * Afficher le dashboard complet
   */
  printStats(): void {
    const metrics = this.calculateMetrics();

    console.log('\n' + '='.repeat(60));
    console.log('📊 PIPELINE MONITORING DASHBOARD');
    console.log('='.repeat(60));

    // Requêtes et cache
    console.log('\n📈 REQUESTS & CACHE:');
    console.log(`   Total requests: ${metrics.requests.total}`);
    console.log(`   Cache hit rate: ${metrics.requests.cacheHitRate}% (${metrics.requests.cacheHits} hits, ${metrics.requests.cacheMisses} misses)`);

    // Performance
    console.log('\n⚡ PERFORMANCE:');
    console.log(`   Avg processing time: ${metrics.performance.avgProcessingTime}ms`);
    console.log(`   Avg query time: ${metrics.performance.avgQueryTime}ms`);
    console.log(`   Total DB queries: ${metrics.performance.totalDbQueries}`);

    // Erreurs
    console.log('\n❌ ERRORS:');
    console.log(`   Total errors: ${metrics.errors.total}`);
    console.log(`   Error rate: ${metrics.errors.errorRate}%`);
    console.log(`   Retries: ${metrics.errors.retries}`);

    // Base de données
    console.log('\n🗄️ DATABASE:');
    console.log(`   Total connections: ${metrics.database.totalCount}`);
    console.log(`   Active connections: ${metrics.database.activeConnections}`);
    console.log(`   Idle connections: ${metrics.database.idleCount}`);
    console.log(`   Waiting: ${metrics.database.waitingCount}`);

    // Volumes
    console.log('\n📊 VOLUMES (session):');
    console.log(`   Posts processed: ${metrics.volumes.processed}`);
    console.log(`   Posts published: ${metrics.volumes.published}`);
    console.log(`   Posts failed: ${metrics.volumes.failed}`);
    console.log(`   Success rate: ${metrics.volumes.successRate}%`);

    // Vérifier les alertes
    this.checkAlerts(metrics);

    console.log('='.repeat(60));
  }

  /**
   * Démarrer le monitoring automatique
   */
  private async startAutoMonitoring(): Promise<void> {
    // Surveiller la base de données toutes les minutes
    setInterval(async () => {
      try {
        const clientCount = optimizedDb.getPoolStats().totalCount;
        if (clientCount > this.alertThresholds.dbConnections) {
          console.warn(`⚠️ High DB connections: ${clientCount}`);
        }
      } catch (error) {
        console.error('❌ Monitoring error:', error);
      }
    }, 60 * 1000);

    // Statistiques du cache toutes les 5 minutes
    setInterval(async () => {
      try {
        const cacheStats = await databaseCache.getCacheStats();
        console.log(`📦 Cache: ${cacheStats.activeEntries}/${cacheStats.totalEntries} active entries`);
      } catch (error) {
        console.error('❌ Cache stats error:', error);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Reset des statistiques
   */
  reset(): void {
    this.stats = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      dbQueries: 0,
      processingTime: [],
      queryTime: [],
      errors: 0,
      retries: 0,
      postsProcessed: 0,
      postsPublished: 0,
      postsFailed: 0
    };

    console.log('📊 Pipeline monitoring stats reset');
  }

  /**
   * Exporter les métriques pour intégration externe
   */
  exportMetrics(): any {
    return this.calculateMetrics();
  }

  /**
   * Obtenir un rapport de santé
   */
  async getHealthReport(): Promise<string> {
    const metrics = this.calculateMetrics();

    let health = 'HEALTHY';
    const issues: string[] = [];

    if (metrics.errors.errorRate > 5) {
      health = 'WARNING';
      issues.push('High error rate');
    }

    if (metrics.errors.errorRate > 10) {
      health = 'CRITICAL';
      issues.push('Very high error rate');
    }

    if (metrics.database.waitingCount > 5) {
      health = 'WARNING';
      issues.push('DB connection pool saturated');
    }

    return `
HEALTH REPORT: ${health}
${issues.length > 0 ? `Issues: ${issues.join(', ')}` : 'No issues detected'}
Error Rate: ${metrics.errors.errorRate}%
DB Connections: ${metrics.database.activeConnections}/${metrics.database.totalCount}
Cache Hit Rate: ${metrics.requests.cacheHitRate}%
Avg Processing Time: ${metrics.performance.avgProcessingTime}ms
`;
  }
}

// Export singleton
export const pipelineMonitoring = new PipelineMonitoring();
