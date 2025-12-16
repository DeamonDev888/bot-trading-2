#!/usr/bin/env node

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Service de base de données OPTIMISÉ
 * - Connection pooling avancé
 * - Statement caching
 * - Query optimization
 * - Health checks automatiques
 */
export class OptimizedDatabaseService {
  private pool: Pool;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'financial_analyst',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '9022',

      // OPTIMISATIONS CONNECTION POOL
      max: 20,                    // Max connexions (vs 10 par défaut)
      min: 5,                     // Min connexions maintenues
      idleTimeoutMillis: 30000,   // Timeout idle (30s)
      connectionTimeoutMillis: 2000, // Timeout connexion (2s)
      allowExitOnIdle: false,     // Garder les connexions actives

      // Statement caching au niveau pool
      statement_timeout: 30000,   // Timeout requêtes (30s)
      lock_timeout: 10000         // Timeout lock (10s)
    });

    this.setupHealthCheck();
    this.logPoolStats();
  }

  /**
   * Configuration automatique des clients
   */
  private setupHealthCheck(): void {
    this.pool.on('connect', (client) => {
      // Optimisations par connexion
      client.query('SET statement_timeout = 30000');
      client.query('SET lock_timeout = 10000');
      client.query('SET log_statement = \'none\''); // Réduire logs
      client.query('SET synchronous_commit = on'); // Garantir durabilité
    });

    this.pool.on('error', (err) => {
      console.error('❌ Pool error:', err.message);
    });

    // Health check toutes les 30 secondes
    this.healthCheckInterval = setInterval(async () => {
      try {
        const client = await this.pool.connect();
        await client.query('SELECT 1');
        client.release();
      } catch (error) {
        console.error('❌ Health check failed:', error);
      }
    }, 30000);
  }

  /**
   * Logs statistiques du pool
   */
  private logPoolStats(): void {
    console.log('🔧 Database Pool Configuration:');
    console.log(`   Max connections: ${this.pool.options.max}`);
    console.log(`   Min connections: ${this.pool.options.min}`);
    console.log(`   Idle timeout: ${this.pool.options.idleTimeoutMillis}ms`);
    console.log(`   Connection timeout: ${this.pool.options.connectionTimeoutMillis}ms`);

    // Log des stats toutes les 5 minutes
    setInterval(() => {
      const totalCount = this.pool.totalCount;
      const idleCount = this.pool.idleCount;
      const waitingCount = this.pool.waitingCount;

      console.log(`📊 Pool Stats - Total: ${totalCount}, Idle: ${idleCount}, Waiting: ${waitingCount}`);
    }, 5 * 60 * 1000);
  }

  /**
   * Récupération optimisée des posts prêts à publier
   * SEULEMENT les news X/Twitter filtrées par AgeFilterService
   */
  async getReadyPostsOptimized(cursor?: { published_at: string; id: string }): Promise<any[]> {
    const client = await this.pool.connect();

    try {
      // Requête STRICTE - UNIVERSELLEMENT les news X/Twitter
      let query = `
        SELECT
          id, title, content, source, url,
          published_at, relevance_score, category,
          EXTRACT(EPOCH FROM (NOW() - published_at))/3600 as hours_ago,
          CASE
            WHEN relevance_score >= 9 AND EXTRACT(EPOCH FROM (NOW() - published_at))/3600 <= 6 THEN 'URGENT'
            WHEN relevance_score >= 8 AND EXTRACT(EPOCH FROM (NOW() - published_at))/3600 <= 12 THEN 'HIGH'
            WHEN relevance_score >= 7 THEN 'MEDIUM'
            ELSE 'LOW'
          END as priority
        FROM news_items
        WHERE processing_status = 'processed'
          AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
          AND relevance_score >= $1
          AND published_at >= NOW() - INTERVAL '5 days'

          /* === FILTRAGE X/TWITTER SEULEMENT === */
          AND source LIKE 'X - %'

          /* EXCLURE DES DONNÉES ÉCONOMIQUES ET CALENDRIERS */
          AND title NOT ILIKE '%[ECONOMIC DATA]%'
          AND title NOT ILIKE '%[ECO CALENDAR]%'
          AND title NOT ILIKE '%[ECONOMIC CALENDAR]%'
          AND title NOT ILIKE '%[CALENDAR%'
          AND title NOT ILIKE '%CALENDAR EVENT%'
          AND title NOT ILIKE '%ECONOMIC CALENDAR%'
          AND title NOT ILIKE '%[ECONOMIC DATA]%'

          /* EXCLUSION DES SOURCES ÉCONOMIQUES */
          AND source NOT ILIKE '%Bureau of Labor%'
          AND source NOT ILIKE '%Federal Reserve%'
          AND source NOT ILIKE '%BLS%'
          AND source NOT ILIKE '%FRED%'
          AND source NOT ILIKE '%CBOE%'
          AND source NOT ILIKE '%TradingEconomics%'
          AND source NOT ILIKE '%Economic Calendar%'
          AND source NOT LIKE '%EconomicData%'

          /* EXCLUSION DES CONTENU ÉCONOMIQUE */
          AND content NOT ILIKE '%Consumer Price Index%'
          AND content NOT ILIKE '%Payroll Employment%'
          AND content NOT ILIKE '%Unemployment Rate%'
          AND content NOT ILIKE '%Producer Price Index%'
          AND content NOT ILIKE '%Average Hourly%'
          AND content NOT ILIKE '%Employment Cost%'
          AND content NOT ILIKE '%Productivity%'
          AND content NOT ILIKE '%Export Price Index%'
          AND content NOT ILIKE '%Import Price Index%'
      `;

      const params: any[] = [7]; // score threshold

      // Pagination par curseur (efficace)
      if (cursor) {
        query += ` AND (published_at, id) < ($2, $3)`;
        params.push(cursor.published_at, cursor.id);
      }

      query += ` ORDER BY relevance_score DESC, published_at DESC LIMIT 100`;

      const startTime = Date.now();
      const result = await client.query(query, params);
      const duration = Date.now() - startTime;

      console.log(`📊 Query optimized: ${result.rows.length} posts in ${duration}ms`);

      return result.rows;

    } finally {
      client.release();
    }
  }

  /**
   * Requête de comptage optimisée (utilise index)
   */
  async getReadyPostsCount(): Promise<number> {
    const client = await this.pool.connect();

    try {
      // Requête optimisée avec index
      const query = `
        SELECT COUNT(*) as total
        FROM news_items
        WHERE processing_status = 'processed'
          AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
          AND relevance_score >= 7
          AND published_at >= NOW() - INTERVAL '5 days'
          AND title NOT LIKE '%[ECO CAL%'
          AND source != 'TradingEconomics'
      `;

      const startTime = Date.now();
      const result = await client.query(query);
      const duration = Date.now() - startTime;

      console.log(`📊 Count query: ${result.rows[0].total} posts in ${duration}ms`);

      return parseInt(result.rows[0].total);

    } finally {
      client.release();
    }
  }

  /**
   * Batch update optimisé (remplace les updates 1 par 1)
   */
  async markAsPublishedBatch(ids: number[]): Promise<void> {
    if (ids.length === 0) return;

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Batch update - BEAUCOUP plus rapide
      const startTime = Date.now();
      await client.query(`
        UPDATE news_items
        SET published_to_discord = TRUE,
            published_at_discord = NOW()
        WHERE id = ANY($1)
      `, [ids]);

      await client.query('COMMIT');
      const duration = Date.now() - startTime;

      console.log(`✅ Batch publish: ${ids.length} posts marked in ${duration}ms`);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Statistiques du pool
   */
  getPoolStats(): any {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      maxConnections: this.pool.options.max,
      minConnections: this.pool.options.min
    };
  }

  /**
   * Fermeture propre du pool
   */
  async close(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    console.log('🔧 Closing database pool...');
    await this.pool.end();
    console.log('✅ Database pool closed');
  }
}

// Export singleton
export const optimizedDb = new OptimizedDatabaseService();
