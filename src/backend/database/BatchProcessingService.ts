#!/usr/bin/env node

import { Pool } from 'pg';
import { optimizedDb } from './OptimizedDatabaseService.js';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Service de batch processing optimisé
 * - Remplace les opérations 1 par 1
 * - Transactions groupées
 * - Retry intelligent
 * - Monitoring des performances
 */
export class BatchProcessingService {
  private pool: Pool;
  private defaultBatchSize = 100;
  private retryAttempts = 3;
  private retryDelay = 1000; // 1 seconde

  constructor() {
    this.pool = optimizedDb['pool'];
  }

  /**
   * Marquer des posts comme publiés en batch
   * BEAUCOUP plus rapide que les updates individuels
   */
  async markAsPublishedBatch(ids: number[]): Promise<void> {
    if (ids.length === 0) return;

    const startTime = Date.now();

    try {
      await this.executeWithRetry(async () => {
        const client = await this.pool.connect();

        try {
          await client.query('BEGIN');

          // Batch update - O(N) au lieu de O(N²)
          const result = await client.query(`
            UPDATE news_items
            SET published_to_discord = TRUE,
                published_at_discord = NOW()
            WHERE id = ANY($1)
          `, [ids]);

          await client.query('COMMIT');

          const duration = Date.now() - startTime;
          const throughput = Math.round((ids.length / duration) * 1000); // posts/seconde

          console.log(`✅ Batch publish: ${ids.length} posts in ${duration}ms (${throughput} posts/sec)`);

          return result;

        } finally {
          client.release();
        }
      });

    } catch (error) {
      console.error(`❌ Batch publish failed after ${this.retryAttempts} attempts:`, error);
      throw error;
    }
  }

  /**
   * Marquer des posts comme erreur en batch
   */
  async markAsErrorBatch(ids: number[], errorMessage: string): Promise<void> {
    if (ids.length === 0) return;

    try {
      await this.executeWithRetry(async () => {
        const client = await this.pool.connect();

        try {
          await client.query('BEGIN');

          await client.query(`
            UPDATE news_items
            SET processing_status = 'error',
                content = COALESCE(content, '') || $2
            WHERE id = ANY($1)
          `, [ids, ` [ERROR: ${errorMessage}]`]);

          await client.query('COMMIT');

          console.log(`❌ Batch error: ${ids.length} posts marked as error`);

        } finally {
          client.release();
        }
      });

    } catch (error) {
      console.error(`❌ Batch error marking failed:`, error);
      throw error;
    }
  }

  /**
   * Mettre à jour les scores de pertinence en batch
   */
  async updateRelevanceScoresBatch(updates: Array<{ id: number; score: number; status: string }>): Promise<void> {
    if (updates.length === 0) return;

    const startTime = Date.now();

    try {
      await this.executeWithRetry(async () => {
        const client = await this.pool.connect();

        try {
          await client.query('BEGIN');

          // Préparer les données pour le batch update
          const ids = updates.map(u => u.id);
          const scores = updates.map(u => u.score);
          const statuses = updates.map(u => u.status);

          // Batch update avec arrays
          const result = await client.query(`
            UPDATE news_items
            SET relevance_score = data.score,
                processing_status = data.status,
                updated_at = NOW()
            FROM (
              SELECT unnest($1::int[]) as id,
                     unnest($2::float[]) as score,
                     unnest($3::varchar[]) as status
            ) as data
            WHERE news_items.id = data.id
          `, [ids, scores, statuses]);

          await client.query('COMMIT');

          const duration = Date.now() - startTime;
          console.log(`📊 Batch scores: ${updates.length} posts updated in ${duration}ms`);

        } finally {
          client.release();
        }
      });

    } catch (error) {
      console.error(`❌ Batch score update failed:`, error);
      throw error;
    }
  }

  /**
   * Supprimer les doublons en batch
   */
  async removeDuplicatesBatch(items: Array<{ title: string; source: string; published_at: string }>): Promise<void> {
    if (items.length === 0) return;

    const startTime = Date.now();

    try {
      await this.executeWithRetry(async () => {
        const client = await this.pool.connect();

        try {
          await client.query('BEGIN');

          // Extraire les données normalisées pour la détection
          const titles = items.map(i => this.normalizeTitle(i.title));
          const sources = items.map(i => i.source);
          const dates = items.map(i => i.published_at);

          // Supprimer les doublons en une seule requête
          const result = await client.query(`
            DELETE FROM news_items
            WHERE id IN (
              SELECT n1.id
              FROM news_items n1
              JOIN (
                SELECT unnest($1::text[]) as title,
                       unnest($2::varchar[]) as source,
                       unnest($3::timestamp[]) as published_at
              ) as new_items
              ON lower(trim(n1.title)) = lower(trim(new_items.title))
                AND n1.source = new_items.source
                AND date(n1.published_at) = date(new_items.published_at)
              WHERE n1.processing_status = 'raw'
            )
          `, [titles, sources, dates]);

          await client.query('COMMIT');

          const duration = Date.now() - startTime;
          console.log(`🔄 Batch deduplication: ${result.rowCount} duplicates removed in ${duration}ms`);

        } finally {
          client.release();
        }
      });

    } catch (error) {
      console.error(`❌ Batch deduplication failed:`, error);
      throw error;
    }
  }

  /**
   * Archiver les posts anciens en batch
   */
  async archiveOldPostsBatch(daysOld: number = 30): Promise<void> {
    const startTime = Date.now();

    try {
      await this.executeWithRetry(async () => {
        const client = await this.pool.connect();

        try {
          await client.query('BEGIN');

          const result = await client.query(`
            UPDATE news_items
            SET processing_status = 'archived',
                relevance_score = 0
            WHERE published_at < NOW() - INTERVAL '${daysOld} days'
              AND processing_status = 'raw'
          `);

          await client.query('COMMIT');

          const duration = Date.now() - startTime;
          console.log(`🗄️ Batch archive: ${result.rowCount} old posts archived in ${duration}ms`);

        } finally {
          client.release();
        }
      });

    } catch (error) {
      console.error(`❌ Batch archive failed:`, error);
      throw error;
    }
  }

  /**
   * Découper un array en batches
   */
  chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Exécuter une opération avec retry intelligent
   */
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Attempt ${attempt}/${this.retryAttempts} failed:`, error instanceof Error ? error.message : String(error));

        if (attempt < this.retryAttempts) {
          // Backoff exponentiel
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Normaliser un titre pour la détection de doublons
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Obtenir les statistiques de performance
   */
  async getPerformanceStats(): Promise<any> {
    const client = await this.pool.connect();

    try {
      // Statistiques de traitement par jour
      const dailyStats = await client.query(`
        SELECT
          DATE(created_at) as date,
          processing_status,
          COUNT(*) as count
        FROM news_items
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at), processing_status
        ORDER BY date DESC, processing_status
      `);

      // Temps moyen de traitement
      const processingTime = await client.query(`
        SELECT
          processing_status,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_seconds
        FROM news_items
        WHERE updated_at IS NOT NULL
          AND created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY processing_status
      `);

      return {
        dailyStats: dailyStats.rows,
        processingTime: processingTime.rows
      };

    } finally {
      client.release();
    }
  }
}

// Export singleton
export const batchProcessor = new BatchProcessingService();
