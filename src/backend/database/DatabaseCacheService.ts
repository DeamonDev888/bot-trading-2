#!/usr/bin/env node

import { Pool } from 'pg';
import { optimizedDb } from './OptimizedDatabaseService.js';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Service de cache utilisant PostgreSQL comme backend
 * - Pas de Redis requis
 * - Cache intelligent avec TTL
 * - Auto-cleanup des entrées expirées
 */
export class DatabaseCacheService {
  private pool: Pool;

  constructor() {
    this.pool = optimizedDb['pool']; // Accéder au pool privé

    // Créer table cache au démarrage
    this.createCacheTable();

    // Nettoyage automatique toutes les 10 minutes
    setInterval(() => {
      this.cleanupExpired();
    }, 10 * 60 * 1000);
  }

  /**
   * Créer la table cache si n'existe pas
   */
  private async createCacheTable(): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS pipeline_cache (
          cache_key VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          expires_at TIMESTAMP WITH TIME ZONE,
          access_count INTEGER DEFAULT 0,
          last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Index pour les requêtes de cache
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_pipeline_cache_expires
        ON pipeline_cache(expires_at)
        WHERE expires_at IS NOT NULL
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_pipeline_cache_access
        ON pipeline_cache(last_accessed)
      `);

      console.log('✅ Pipeline cache table ready');

    } finally {
      client.release();
    }
  }

  /**
   * Récupérer des données depuis le cache
   */
  async get<T>(key: string): Promise<T | null> {
    const client = await this.pool.connect();

    try {
      // Mise à jour du compteur d'accès dans une transaction
      await client.query('BEGIN');

      const result = await client.query(`
        SELECT data, expires_at, access_count
        FROM pipeline_cache
        WHERE cache_key = $1
          AND (expires_at IS NULL OR expires_at > NOW())
        FOR UPDATE
      `, [key]);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        console.log(`📦 Cache miss: ${key}`);
        return null;
      }

      const row = result.rows[0];
      const data = row.data as T;

      // Mettre à jour les stats d'accès
      await client.query(`
        UPDATE pipeline_cache
        SET access_count = access_count + 1,
            last_accessed = NOW()
        WHERE cache_key = $1
      `, [key]);

      await client.query('COMMIT');

      console.log(`📦 Cache hit: ${key} (access #${row.access_count + 1})`);
      return data;

    } catch (error) {
      await this.pool.query('ROLLBACK');
      console.error('❌ Cache get error:', error);
      return null;
    } finally {
      client.release();
    }
  }

  /**
   * Sauvegarder des données dans le cache
   */
  async set<T>(key: string, data: T, ttlMinutes: number = 5): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query(`
        INSERT INTO pipeline_cache (cache_key, data, expires_at)
        VALUES ($1, $2, NOW() + INTERVAL '${ttlMinutes} minutes')
        ON CONFLICT (cache_key)
        DO UPDATE SET
          data = EXCLUDED.data,
          expires_at = EXCLUDED.expires_at,
          access_count = 0,
          last_accessed = NOW()
      `, [key, JSON.stringify(data)]);

      console.log(`📦 Cache set: ${key} (TTL: ${ttlMinutes}m)`);

    } finally {
      client.release();
    }
  }

  /**
   * Cache spécialisé pour les posts prêts
   */
  async getReadyPosts(): Promise<any[]> {
    const cacheKey = 'ready_posts_5_days';

    // Vérifier cache d'abord
    const cached = await this.get<any[]>(cacheKey);
    if (cached) {
      console.log('📦 Cache hit - returning cached ready posts');
      return cached;
    }

    // Sinon, requêter DB avec le service optimisé
    const posts = await optimizedDb.getReadyPostsOptimized();

    // Mettre en cache (TTL 5 minutes)
    await this.set(cacheKey, posts, 5);

    return posts;
  }

  /**
   * Cache spécialisé pour le comptage
   */
  async getReadyPostsCount(): Promise<number> {
    const cacheKey = 'ready_posts_count';

    const cached = await this.get<number>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const count = await optimizedDb.getReadyPostsCount();
    await this.set(cacheKey, count, 2); // TTL 2 minutes pour le count

    return count;
  }

  /**
   * Invalider une clé de cache
   */
  async invalidate(key: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('DELETE FROM pipeline_cache WHERE cache_key = $1', [key]);
      console.log(`🗑️ Cache invalidated: ${key}`);

    } finally {
      client.release();
    }
  }

  /**
   * Nettoyage des entrées expirées
   */
  private async cleanupExpired(): Promise<void> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(`
        DELETE FROM pipeline_cache
        WHERE expires_at < NOW()
      `);

      if (result.rowCount && result.rowCount > 0) {
        console.log(`🧹 Cleanup: removed ${result.rowCount} expired cache entries`);
      }

      // Nettoyer aussi les entrées peu utilisées (> 7 jours, < 5 accès)
      const cleanupResult = await client.query(`
        DELETE FROM pipeline_cache
        WHERE last_accessed < NOW() - INTERVAL '7 days'
          AND access_count < 5
      `);

      if (cleanupResult.rowCount && cleanupResult.rowCount > 0) {
        console.log(`🧹 Cleanup: removed ${cleanupResult.rowCount} low-usage cache entries`);
      }

    } finally {
      client.release();
    }
  }

  /**
   * Statistiques du cache
   */
  async getCacheStats(): Promise<any> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(`
        SELECT
          COUNT(*) as total_entries,
          COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_entries,
          AVG(access_count) as avg_access_count,
          MAX(last_accessed) as last_access
        FROM pipeline_cache
      `);

      const stats = result.rows[0];

      // Compter par clé
      const keyStats = await client.query(`
        SELECT cache_key, access_count, expires_at
        FROM pipeline_cache
        ORDER BY access_count DESC
        LIMIT 5
      `);

      return {
        totalEntries: parseInt(stats.total_entries),
        activeEntries: parseInt(stats.active_entries),
        avgAccessCount: parseFloat(stats.avg_access_count).toFixed(2),
        lastAccess: stats.last_access,
        topKeys: keyStats.rows
      };

    } finally {
      client.release();
    }
  }

  /**
   * Vider complètement le cache
   */
  async clear(): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('DELETE FROM pipeline_cache');
      console.log('🗑️ Cache cleared completely');

    } finally {
      client.release();
    }
  }
}

// Export singleton
export const databaseCache = new DatabaseCacheService();
