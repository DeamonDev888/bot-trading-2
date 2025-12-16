import { NewsItem } from '../ingestion/NewsAggregator';
import { Pool } from 'pg';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export interface NewsFingerprint {
  id: string;
  title_hash: string;
  content_hash?: string;
  url_hash: string;
  source: string;
  published_at: Date;
  created_at: Date;
}

export interface DeduplicationResult {
  unique: NewsItem[];
  duplicates: NewsItem[];
  duplicate_count: number;
}

export class NewsDeduplicationService {
  private pool: Pool;
  private similarityThreshold: number = 0.85; // 85% similarity threshold

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'financial_analyst',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
    });
  }

  /**
   * Initialize the deduplication database table
   */
  async initializeTable(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS news_fingerprints (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title_hash VARCHAR(64) NOT NULL,
          content_hash VARCHAR(64),
          url_hash VARCHAR(64) NOT NULL,
          source VARCHAR(500) NOT NULL,
          published_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(title_hash, source, published_at)
        );

        CREATE INDEX IF NOT EXISTS idx_news_fingerprints_title_hash ON news_fingerprints(title_hash);
        CREATE INDEX IF NOT EXISTS idx_news_fingerprints_url_hash ON news_fingerprints(url_hash);
        CREATE INDEX IF NOT EXISTS idx_news_fingerprints_published_at ON news_fingerprints(published_at);
      `);
      console.log('✅ News deduplication table initialized');
    } catch (error) {
      console.error('❌ Failed to initialize deduplication table:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Remove duplicate news items from a list
   */
  async deduplicate(newsItems: NewsItem[]): Promise<DeduplicationResult> {
    const unique: NewsItem[] = [];
    const duplicates: NewsItem[] = [];

    for (const item of newsItems) {
      const isDuplicate = await this.isDuplicate(item);
      if (isDuplicate) {
        duplicates.push(item);
      } else {
        unique.push(item);
        await this.saveFingerprint(item);
      }
    }

    return {
      unique,
      duplicates,
      duplicate_count: duplicates.length,
    };
  }

  /**
   * Check if a news item is a duplicate
   * Utilise une approche multi-critères : URL hash + Title hash + Source + Content similarity
   */
  private async isDuplicate(item: NewsItem): Promise<boolean> {
    const fingerprint = this.generateFingerprint(item);
    const client = await this.pool.connect();

    try {
      // STRATÉGIE 1: Vérification par URL normalisée (le plus fiable)
      // Un même URL = même article, peu importe les autres critères
      const urlQuery = `
        SELECT id, title_hash, source FROM news_fingerprints
        WHERE url_hash = $1
        LIMIT 1
      `;
      const urlResult = await client.query(urlQuery, [fingerprint.url_hash]);
      if (urlResult.rows.length > 0) {
        console.log(`🔄 Doublon détecté (même URL): ${item.title.substring(0, 50)}...`);
        return true;
      }

      // STRATÉGIE 2: Vérification par titre + source avec fenêtre temporelle élargie (24h)
      // Cette fenêtre permet de capturer les republications le même jour
      const publishedTime = new Date(item.timestamp);
      const timeWindowStart = new Date(publishedTime.getTime() - 24 * 60 * 60 * 1000); // 24h avant
      const timeWindowEnd = new Date(publishedTime.getTime() + 24 * 60 * 60 * 1000);   // 24h après

      const titleSourceQuery = `
        SELECT id FROM news_fingerprints
        WHERE title_hash = $1
          AND source = $2
          AND published_at >= $3
          AND published_at <= $4
        LIMIT 1
      `;
      const titleSourceResult = await client.query(titleSourceQuery, [
        fingerprint.title_hash,
        item.source,
        timeWindowStart.toISOString(),
        timeWindowEnd.toISOString(),
      ]);
      if (titleSourceResult.rows.length > 0) {
        console.log(`🔄 Doublon détecté (titre+source): ${item.title.substring(0, 50)}...`);
        return true;
      }

      // STRATÉGIE 3: Vérification par titre seul (même titre = probablement même article)
      // Fenêtre de 48h pour les reprints cross-source
      const titleOnlyQuery = `
        SELECT id, source FROM news_fingerprints
        WHERE title_hash = $1
          AND published_at >= NOW() - INTERVAL '48 hours'
        LIMIT 1
      `;
      const titleOnlyResult = await client.query(titleOnlyQuery, [fingerprint.title_hash]);
      if (titleOnlyResult.rows.length > 0) {
        console.log(`🔄 Doublon détecté (titre, source différente: ${titleOnlyResult.rows[0].source}): ${item.title.substring(0, 50)}...`);
        return true;
      }

      // STRATÉGIE 4: Vérification par contenu similaire (si contenu disponible)
      if (item.content && item.content.length > 100 && fingerprint.content_hash) {
        const contentQuery = `
          SELECT id, source FROM news_fingerprints
          WHERE content_hash = $1
            AND published_at >= NOW() - INTERVAL '72 hours'
          LIMIT 1
        `;
        const contentResult = await client.query(contentQuery, [fingerprint.content_hash]);
        if (contentResult.rows.length > 0) {
          console.log(`🔄 Doublon détecté (contenu identique): ${item.title.substring(0, 50)}...`);
          return true;
        }

        // STRATÉGIE 5: Similarité du contenu avec seuil (pour les articles légèrement modifiés)
        // Note: Cette vérification est coûteuse, donc on la fait en dernier
        const similarityQuery = `
          SELECT nf.id, nf.source, ni.content
          FROM news_fingerprints nf
          LEFT JOIN news_items ni ON ni.title_hash = nf.title_hash
          WHERE nf.published_at >= NOW() - INTERVAL '24 hours'
            AND nf.source != $1
          ORDER BY nf.published_at DESC
          LIMIT 20
        `;
        const similarityResult = await client.query(similarityQuery, [item.source]);
        
        for (const existingRow of similarityResult.rows) {
          if (existingRow.content && this.calculateSimilarity(item.content, existingRow.content) >= this.similarityThreshold) {
            console.log(`🔄 Doublon détecté (similarité ${(this.similarityThreshold * 100).toFixed(0)}%+): ${item.title.substring(0, 50)}...`);
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      // AMÉLIORATION: En cas d'erreur DB, on REJETTE l'item par précaution
      // Cela évite les doublons lors de problèmes de connexion
      console.error('❌ Erreur vérification doublons (item rejeté par précaution):', error);
      this.logDuplicationMetric('error_rejection', item.title);
      return true; // CHANGEMENT: On rejette en cas d'erreur (anciennement false)
    } finally {
      client.release();
    }
  }

  /**
   * Calcule la similarité entre deux textes (coefficient de Jaccard)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const normalize = (t: string) => t.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    const words1 = new Set(normalize(text1));
    const words2 = new Set(normalize(text2));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Log les métriques de détection de doublons pour analyse
   */
  private logDuplicationMetric(type: string, title: string): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'DEDUP_METRIC',
      metric_type: type,
      title_preview: title.substring(0, 60),
    };
    console.log(`📊 [DEDUP] ${JSON.stringify(logEntry)}`);
  }

  /**
   * Save fingerprint of a news item
   */
  private async saveFingerprint(item: NewsItem): Promise<void> {
    const fingerprint = this.generateFingerprint(item);
    const client = await this.pool.connect();

    try {
      await client.query(
        `
          INSERT INTO news_fingerprints (title_hash, content_hash, url_hash, source, published_at)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (title_hash, source, published_at) DO NOTHING
        `,
        [
          fingerprint.title_hash,
          fingerprint.content_hash,
          fingerprint.url_hash,
          item.source,
          new Date(item.timestamp).toISOString(),
        ]
      );
    } catch (error) {
      console.error('Error saving fingerprint:', error);
      // Don't throw error to avoid breaking the pipeline
    } finally {
      client.release();
    }
  }

  /**
   * Generate a fingerprint for a news item
   * Utilise une normalisation améliorée pour les URLs et les titres
   */
  private generateFingerprint(item: NewsItem): Omit<NewsFingerprint, 'id' | 'created_at'> {
    // Normalize title for consistent hashing
    const normalizedTitle = this.normalizeText(item.title);
    const titleHash = crypto.createHash('sha256').update(normalizedTitle).digest('hex');

    // Hash URL with enhanced normalization (removes tracking params, unifies domains)
    const normalizedUrl = this.normalizeUrl(item.url);
    const urlHash = crypto.createHash('sha256').update(normalizedUrl).digest('hex');

    // Hash content if available
    let contentHash: string | undefined;
    if (item.content && item.content.length > 50) {
      const normalizedContent = this.normalizeText(item.content);
      contentHash = crypto.createHash('sha256').update(normalizedContent).digest('hex');
    }

    return {
      title_hash: titleHash,
      content_hash: contentHash,
      url_hash: urlHash,
      source: item.source,
      published_at: new Date(item.timestamp),
    };
  }

  /**
   * Normalise une URL pour le hashage - Version améliorée
   * Supprime les paramètres de tracking et unifie les domaines Twitter/X/Nitter
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // 1. Supprimer les paramètres de tracking (UTM et autres)
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'ref', 'fbclid', 'gclid', 'msclkid', 'twclid', 'dclid',
        'mc_cid', 'mc_eid', 's_kwcid', 'igshid', 'share', 'source',
        '_ga', '_gid', 'trk', 'trkCampaign', 'sc_campaign', 'sc_channel'
      ];
      trackingParams.forEach(param => urlObj.searchParams.delete(param));
      
      // 2. Normaliser les domaines équivalents (Twitter/X/Nitter/FixupX)
      let hostname = urlObj.hostname.toLowerCase();
      const twitterVariants = ['twitter.com', 'x.com', 'nitter.net', 'fixupx.com', 'vxtwitter.com', 'fxtwitter.com'];
      const nitterInstances = [
        'nitter.privacydev.net', 'nitter.net', 'nitter.unixfox.eu', 'nitter.cz',
        'nitter.1d4.us', 'nitter.kavin.rocks', 'nitter.poast.org', 'nitter.moomoo.me'
      ];
      
      // Unifier tous les domaines Twitter/X vers un seul
      if (twitterVariants.some(v => hostname.includes(v)) || nitterInstances.some(n => hostname.includes(n))) {
        hostname = 'x.com';
      }
      
      // 3. Nettoyer le pathname
      const pathname = urlObj.pathname
        .replace(/\/+/g, '/') // Remplacer les slashes multiples
        .replace(/\/+$/, '') // Enlever les slashes finaux
        .toLowerCase();
      
      // 4. Reconstruire l'URL normalisée (sans query params de tracking)
      const remainingParams = urlObj.searchParams.toString();
      return `https://${hostname}${pathname}${remainingParams ? '?' + remainingParams : ''}`.toLowerCase();
    } catch {
      // Fallback: nettoyage basique
      return url
        .toLowerCase()
        .trim()
        .replace(/[?#].*$/, '') // Supprimer query et fragment
        .replace(/\/+$/, '');   // Supprimer slashes finaux
    }
  }

  /**
   * Normalize text for consistent hashing
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ') // normalize whitespace
      .replace(/[^\w\s]/g, '') // remove punctuation
      .trim();
  }

  /**
   * Clean old fingerprints (older than specified days)
   */
  async cleanOldFingerprints(daysToKeep: number = 30): Promise<number> {
    const client = await this.pool.connect();
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await client.query('DELETE FROM news_fingerprints WHERE published_at < $1', [
        cutoffDate.toISOString(),
      ]);

      console.log(`🧹 Cleaned ${result.rowCount} old fingerprints older than ${daysToKeep} days`);
      return result.rowCount || 0;
    } catch (error) {
      console.error('Error cleaning old fingerprints:', error);
      return 0;
    } finally {
      client.release();
    }
  }

  /**
   * Get deduplication statistics
   */
  async getStats(): Promise<{
    total_fingerprints: number;
    oldest_fingerprint: Date | null;
    newest_fingerprint: Date | null;
  }> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT
          COUNT(*) as total_fingerprints,
          MIN(published_at) as oldest_fingerprint,
          MAX(published_at) as newest_fingerprint
        FROM news_fingerprints
      `);

      const row = result.rows[0];
      return {
        total_fingerprints: parseInt(row.total_fingerprints),
        oldest_fingerprint: row.oldest_fingerprint ? new Date(row.oldest_fingerprint) : null,
        newest_fingerprint: row.newest_fingerprint ? new Date(row.newest_fingerprint) : null,
      };
    } catch (error) {
      console.error('Error getting deduplication stats:', error);
      return {
        total_fingerprints: 0,
        oldest_fingerprint: null,
        newest_fingerprint: null,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
