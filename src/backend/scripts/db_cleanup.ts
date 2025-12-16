#!/usr/bin/env npx ts-node

/**
 * Script de nettoyage et optimisation de la base de données
 * 
 * Fonctionnalités:
 * 1. Analyse complète de l'état de la DB
 * 2. Suppression des doublons
 * 3. Nettoyage des données invalides/spam
 * 4. Normalisation des URLs
 * 5. Optimisation (VACUUM ANALYZE)
 * 
 * Usage: npx ts-node src/backend/scripts/db_cleanup.ts [--analyze-only]
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';

dotenv.config();

interface DBStats {
  totalNews: number;
  uniqueTitles: number;
  duplicateCount: number;
  bySource: Record<string, number>;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  publishedToDiscord: number;
  avgRelevanceScore: number;
  oldestItem: Date | null;
  newestItem: Date | null;
  tableSize: string;
  invalidUrls: number;
  spamItems: number;
}

interface CleanupResult {
  duplicatesRemoved: number;
  invalidRemoved: number;
  urlsNormalized: number;
  spamRemoved: number;
  orphanedRemoved: number;
  optimizationDone: boolean;
  errors: string[];
}

class DatabaseCleanup {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'financial_analyst',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '9022',
    });
  }

  /**
   * Analyse complète de la base de données
   */
  async analyzeDatabase(): Promise<DBStats> {
    const client = await this.pool.connect();
    
    try {
      console.log('\n📊 ANALYSE DE LA BASE DE DONNÉES');
      console.log('='.repeat(60));

      // 1. Statistiques générales
      const totalResult = await client.query('SELECT COUNT(*) as total FROM news_items');
      const totalNews = parseInt(totalResult.rows[0]?.total || '0');

      // 2. Titres uniques
      const uniqueResult = await client.query(`
        SELECT COUNT(DISTINCT LOWER(TRIM(title))) as unique_titles 
        FROM news_items
      `);
      const uniqueTitles = parseInt(uniqueResult.rows[0]?.unique_titles || '0');
      const duplicateCount = totalNews - uniqueTitles;

      // 3. Par source
      const sourceResult = await client.query(`
        SELECT source, COUNT(*) as count 
        FROM news_items 
        GROUP BY source 
        ORDER BY count DESC
      `);
      const bySource: Record<string, number> = {};
      sourceResult.rows.forEach(r => { bySource[r.source || 'Unknown'] = parseInt(r.count); });

      // 4. Par catégorie
      const categoryResult = await client.query(`
        SELECT category, COUNT(*) as count 
        FROM news_items 
        GROUP BY category 
        ORDER BY count DESC
      `);
      const byCategory: Record<string, number> = {};
      categoryResult.rows.forEach(r => { byCategory[r.category || 'Unknown'] = parseInt(r.count); });

      // 5. Par statut
      const statusResult = await client.query(`
        SELECT processing_status, COUNT(*) as count 
        FROM news_items 
        GROUP BY processing_status
      `);
      const byStatus: Record<string, number> = {};
      statusResult.rows.forEach(r => { byStatus[r.processing_status || 'Unknown'] = parseInt(r.count); });

      // 6. Publiés sur Discord
      const discordResult = await client.query(`
        SELECT COUNT(*) as published 
        FROM news_items 
        WHERE published_to_discord = true
      `);
      const publishedToDiscord = parseInt(discordResult.rows[0]?.published || '0');

      // 7. Score de pertinence moyen
      const scoreResult = await client.query(`
        SELECT AVG(relevance_score) as avg_score 
        FROM news_items 
        WHERE relevance_score IS NOT NULL
      `);
      const avgRelevanceScore = parseFloat(scoreResult.rows[0]?.avg_score || '0');

      // 8. Plage de dates
      const dateResult = await client.query(`
        SELECT MIN(created_at) as oldest, MAX(created_at) as newest 
        FROM news_items
      `);
      const oldestItem = dateResult.rows[0]?.oldest ? new Date(dateResult.rows[0].oldest) : null;
      const newestItem = dateResult.rows[0]?.newest ? new Date(dateResult.rows[0].newest) : null;

      // 9. Taille de la table
      const sizeResult = await client.query(`
        SELECT pg_size_pretty(pg_total_relation_size('news_items')) as size
      `);
      const tableSize = sizeResult.rows[0]?.size || 'Unknown';

      // 10. URLs invalides
      const invalidUrlResult = await client.query(`
        SELECT COUNT(*) as invalid 
        FROM news_items 
        WHERE url IS NULL 
           OR url = '' 
           OR url NOT LIKE 'http%'
      `);
      const invalidUrls = parseInt(invalidUrlResult.rows[0]?.invalid || '0');

      // 11. Items spam potentiels
      const spamResult = await client.query(`
        SELECT COUNT(*) as spam 
        FROM news_items 
        WHERE LOWER(title) LIKE '%log in%' 
           OR LOWER(title) LIKE '%sign up%'
           OR LOWER(content) LIKE '%people on x are the first to know%'
           OR title LIKE '%/ X' AND LENGTH(content) < 100
      `);
      const spamItems = parseInt(spamResult.rows[0]?.spam || '0');

      const stats: DBStats = {
        totalNews,
        uniqueTitles,
        duplicateCount,
        bySource,
        byCategory,
        byStatus,
        publishedToDiscord,
        avgRelevanceScore,
        oldestItem,
        newestItem,
        tableSize,
        invalidUrls,
        spamItems
      };

      // Afficher le rapport
      this.printAnalysisReport(stats);

      return stats;
    } finally {
      client.release();
    }
  }

  /**
   * Affiche le rapport d'analyse
   */
  private printAnalysisReport(stats: DBStats): void {
    console.log(`
📈 STATISTIQUES GÉNÉRALES
   Total items:        ${stats.totalNews.toLocaleString()}
   Titres uniques:     ${stats.uniqueTitles.toLocaleString()}
   Doublons estimés:   ${stats.duplicateCount.toLocaleString()} (${((stats.duplicateCount / stats.totalNews) * 100).toFixed(1)}%)
   Taille table:       ${stats.tableSize}
   
🔴 PROBLÈMES DÉTECTÉS
   URLs invalides:     ${stats.invalidUrls}
   Items spam:         ${stats.spamItems}
   
📊 SCORES & PUBLICATION
   Score moyen:        ${stats.avgRelevanceScore.toFixed(2)}/10
   Publiés Discord:    ${stats.publishedToDiscord.toLocaleString()}
   
📅 PÉRIODE
   Plus ancien:        ${stats.oldestItem?.toISOString().split('T')[0] || 'N/A'}
   Plus récent:        ${stats.newestItem?.toISOString().split('T')[0] || 'N/A'}
`);

    console.log('📁 PAR SOURCE:');
    Object.entries(stats.bySource).slice(0, 10).forEach(([source, count]) => {
      console.log(`   ${source.padEnd(30)} ${count.toLocaleString()}`);
    });

    console.log('\n📂 PAR CATÉGORIE:');
    Object.entries(stats.byCategory).slice(0, 10).forEach(([cat, count]) => {
      console.log(`   ${(cat || 'Unknown').padEnd(20)} ${count.toLocaleString()}`);
    });

    console.log('\n🔄 PAR STATUT:');
    Object.entries(stats.byStatus).forEach(([status, count]) => {
      console.log(`   ${(status || 'Unknown').padEnd(15)} ${count.toLocaleString()}`);
    });
  }

  /**
   * Nettoie les doublons en gardant le plus récent
   */
  async removeDuplicates(): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      console.log('\n🧹 SUPPRESSION DES DOUBLONS...');
      
      // Identifier et supprimer les doublons (garder le plus récent)
      const result = await client.query(`
        WITH duplicates AS (
          SELECT id, 
                 ROW_NUMBER() OVER (
                   PARTITION BY LOWER(TRIM(title)), source 
                   ORDER BY created_at DESC, id DESC
                 ) as rn
          FROM news_items
        )
        DELETE FROM news_items
        WHERE id IN (SELECT id FROM duplicates WHERE rn > 1)
        RETURNING id
      `);

      const removed = result.rowCount || 0;
      console.log(`   ✅ ${removed} doublons supprimés`);
      return removed;
    } finally {
      client.release();
    }
  }

  /**
   * Supprime les items spam/invalides
   */
  async removeSpamAndInvalid(): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      console.log('\n🗑️ SUPPRESSION DES ITEMS SPAM/INVALIDES...');
      
      const result = await client.query(`
        DELETE FROM news_items
        WHERE 
          -- Contenu de login/signup X
          LOWER(content) LIKE '%people on x are the first to know%'
          OR (LOWER(content) LIKE '%log in%' AND LOWER(content) LIKE '%sign up%' AND LOWER(content) LIKE '%don''t miss%')
          -- Pages de profil vides
          OR (title LIKE '%/ X' AND LENGTH(COALESCE(content, '')) < 100)
          -- URLs invalides
          OR url IS NULL 
          OR url = ''
          -- Titres trop courts
          OR LENGTH(title) < 10
          -- Contenu vide avec score bas
          OR (content IS NULL AND relevance_score IS NULL AND processing_status = 'raw')
        RETURNING id
      `);

      const removed = result.rowCount || 0;
      console.log(`   ✅ ${removed} items spam/invalides supprimés`);
      return removed;
    } finally {
      client.release();
    }
  }

  /**
   * Normalise les URLs dans la base
   */
  async normalizeUrls(): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      console.log('\n🔗 NORMALISATION DES URLs...');
      
      // Récupérer les URLs à normaliser
      const urlsResult = await client.query(`
        SELECT id, url FROM news_items 
        WHERE url IS NOT NULL 
          AND url != ''
          AND (
            url LIKE '%utm_%'
            OR url LIKE '%fbclid=%'
            OR url LIKE '%twitter.com%'
            OR url LIKE '%nitter.%'
          )
      `);

      let normalized = 0;
      
      for (const row of urlsResult.rows) {
        try {
          const normalizedUrl = this.normalizeUrl(row.url);
          if (normalizedUrl !== row.url) {
            await client.query(
              'UPDATE news_items SET url = $1 WHERE id = $2',
              [normalizedUrl, row.id]
            );
            normalized++;
          }
        } catch (e) {
          // Ignorer les URLs non parsables
        }
      }

      console.log(`   ✅ ${normalized} URLs normalisées`);
      return normalized;
    } finally {
      client.release();
    }
  }

  /**
   * Normalise une URL
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Supprimer les paramètres de tracking
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'ref', 'fbclid', 'gclid', 'msclkid', 'twclid', 'dclid', 'share', 'source'
      ];
      trackingParams.forEach(param => urlObj.searchParams.delete(param));
      
      // Unifier les domaines Twitter/X
      let hostname = urlObj.hostname.toLowerCase();
      const twitterVariants = ['twitter.com', 'nitter.net', 'fixupx.com', 'vxtwitter.com', 'fxtwitter.com'];
      const nitterInstances = ['nitter.privacydev.net', 'nitter.unixfox.eu', 'nitter.cz', 'nitter.1d4.us'];
      
      if (twitterVariants.some(v => hostname.includes(v)) || nitterInstances.some(n => hostname.includes(n))) {
        hostname = 'x.com';
      }
      
      const pathname = urlObj.pathname.replace(/\/+/g, '/').replace(/\/+$/, '').toLowerCase();
      const remainingParams = urlObj.searchParams.toString();
      
      return `https://${hostname}${pathname}${remainingParams ? '?' + remainingParams : ''}`;
    } catch {
      return url;
    }
  }

  /**
   * Supprime les anciennes données (> 30 jours) non publiées et non pertinentes
   */
  async removeOldIrrelevant(): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      console.log('\n📅 SUPPRESSION DES ANCIENS ITEMS NON PERTINENTS...');
      
      const result = await client.query(`
        DELETE FROM news_items
        WHERE created_at < NOW() - INTERVAL '30 days'
          AND (published_to_discord IS NULL OR published_to_discord = false)
          AND (relevance_score IS NULL OR relevance_score < 5)
        RETURNING id
      `);

      const removed = result.rowCount || 0;
      console.log(`   ✅ ${removed} anciens items non pertinents supprimés`);
      return removed;
    } finally {
      client.release();
    }
  }

  /**
   * Ajoute les colonnes manquantes si nécessaire
   */
  async ensureColumns(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      console.log('\n🔧 VÉRIFICATION DES COLONNES...');
      
      // Vérifier et ajouter les colonnes manquantes
      const columnsToCheck = [
        { name: 'title_hash', type: 'VARCHAR(64)' },
        { name: 'url_hash', type: 'VARCHAR(64)' },
        { name: 'relevance_score', type: 'DECIMAL(3,1)' },
        { name: 'published_to_discord', type: 'BOOLEAN DEFAULT FALSE' },
        { name: 'category', type: 'VARCHAR(100)' },
      ];

      for (const col of columnsToCheck) {
        try {
          await client.query(`
            ALTER TABLE news_items 
            ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}
          `);
        } catch (e) {
          // Colonne existe déjà
        }
      }

      console.log('   ✅ Colonnes vérifiées');
    } finally {
      client.release();
    }
  }

  /**
   * Génère les hashes manquants
   */
  async generateMissingHashes(): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      console.log('\n🔐 GÉNÉRATION DES HASHES MANQUANTS...');
      
      // Récupérer les items sans hashes
      const itemsResult = await client.query(`
        SELECT id, title, url 
        FROM news_items 
        WHERE title_hash IS NULL OR url_hash IS NULL
      `);

      let updated = 0;
      
      for (const row of itemsResult.rows) {
        const titleHash = crypto.createHash('sha256')
          .update((row.title || '').toLowerCase().trim().replace(/[^\w\s]/g, ''))
          .digest('hex');
        
        const urlHash = crypto.createHash('sha256')
          .update(this.normalizeUrl(row.url || ''))
          .digest('hex');

        await client.query(
          'UPDATE news_items SET title_hash = $1, url_hash = $2 WHERE id = $3',
          [titleHash, urlHash, row.id]
        );
        updated++;
      }

      console.log(`   ✅ ${updated} hashes générés`);
      return updated;
    } finally {
      client.release();
    }
  }

  /**
   * Optimise la base (VACUUM ANALYZE)
   */
  async optimizeDatabase(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      console.log('\n⚡ OPTIMISATION DE LA BASE (VACUUM ANALYZE)...');
      
      // Note: VACUUM ne peut pas être exécuté dans une transaction
      await client.query('VACUUM ANALYZE news_items');
      
      console.log('   ✅ Optimisation terminée');
    } finally {
      client.release();
    }
  }

  /**
   * Crée les index manquants
   */
  async createIndexes(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      console.log('\n🗂️ CRÉATION DES INDEX...');
      
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_news_title_hash ON news_items(title_hash)',
        'CREATE INDEX IF NOT EXISTS idx_news_url_hash ON news_items(url_hash)',
        'CREATE INDEX IF NOT EXISTS idx_news_created_at ON news_items(created_at DESC)',
        'CREATE INDEX IF NOT EXISTS idx_news_published ON news_items(published_to_discord)',
        'CREATE INDEX IF NOT EXISTS idx_news_status ON news_items(processing_status)',
        'CREATE INDEX IF NOT EXISTS idx_news_score ON news_items(relevance_score DESC)',
        'CREATE INDEX IF NOT EXISTS idx_news_source ON news_items(source)',
        'CREATE INDEX IF NOT EXISTS idx_news_category ON news_items(category)',
      ];

      for (const idx of indexes) {
        try {
          await client.query(idx);
        } catch (e) {
          // Index existe déjà
        }
      }

      console.log('   ✅ Index créés/vérifiés');
    } finally {
      client.release();
    }
  }

  /**
   * Exécute le nettoyage complet
   */
  async runFullCleanup(): Promise<CleanupResult> {
    console.log('\n🚀 NETTOYAGE COMPLET DE LA BASE DE DONNÉES');
    console.log('='.repeat(60));
    
    const result: CleanupResult = {
      duplicatesRemoved: 0,
      invalidRemoved: 0,
      urlsNormalized: 0,
      spamRemoved: 0,
      orphanedRemoved: 0,
      optimizationDone: false,
      errors: []
    };

    try {
      // 1. Vérifier les colonnes
      await this.ensureColumns();

      // 2. Supprimer spam et invalides
      result.spamRemoved = await this.removeSpamAndInvalid();

      // 3. Supprimer les doublons
      result.duplicatesRemoved = await this.removeDuplicates();

      // 4. Normaliser les URLs
      result.urlsNormalized = await this.normalizeUrls();

      // 5. Supprimer anciens non pertinents
      result.orphanedRemoved = await this.removeOldIrrelevant();

      // 6. Générer les hashes manquants
      await this.generateMissingHashes();

      // 7. Créer les index
      await this.createIndexes();

      // 8. Optimiser
      await this.optimizeDatabase();
      result.optimizationDone = true;

    } catch (error) {
      result.errors.push(String(error));
    }

    return result;
  }

  /**
   * Ferme la connexion
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

// =====================================
// SCRIPT PRINCIPAL
// =====================================

import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const args = process.argv.slice(2);
  const analyzeOnly = args.includes('--analyze-only') || args.includes('-a');
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        DATABASE CLEANUP & OPTIMIZATION TOOL                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n⏰ ${new Date().toLocaleString()}`);
  
  const cleanup = new DatabaseCleanup();
  const report: any = { timestamp: new Date().toISOString(), mode: analyzeOnly ? 'analyze' : 'cleanup' };

  try {
    // Toujours analyser d'abord
    const statsBefore = await cleanup.analyzeDatabase();
    report.before = {
      ...statsBefore,
      oldestItem: statsBefore.oldestItem?.toISOString(),
      newestItem: statsBefore.newestItem?.toISOString()
    };

    if (analyzeOnly) {
      console.log('\n📋 Mode analyse uniquement (--analyze-only)');
      console.log('   Pour exécuter le nettoyage, relancez sans cette option.');
    } else {
      // Exécuter le nettoyage
      const result = await cleanup.runFullCleanup();
      report.cleanupResult = result;
      
      // Ré-analyser après
      console.log('\n📊 RÉSULTAT APRÈS NETTOYAGE:');
      const statsAfter = await cleanup.analyzeDatabase();
      report.after = {
        ...statsAfter,
        oldestItem: statsAfter.oldestItem?.toISOString(),
        newestItem: statsAfter.newestItem?.toISOString()
      };
      
      // Résumé
      console.log('\n' + '='.repeat(60));
      console.log('📋 RÉSUMÉ DU NETTOYAGE');
      console.log('='.repeat(60));
      console.log(`   Doublons supprimés:     ${result.duplicatesRemoved}`);
      console.log(`   Spam/invalides supp:    ${result.spamRemoved}`);
      console.log(`   URLs normalisées:       ${result.urlsNormalized}`);
      console.log(`   Anciens orphelins:      ${result.orphanedRemoved}`);
      console.log(`   Optimisation:           ${result.optimizationDone ? '✅' : '❌'}`);
      console.log(`   Espace libéré:          ${statsBefore.totalNews - statsAfter.totalNews} items`);
      
      report.summary = {
        itemsRemoved: statsBefore.totalNews - statsAfter.totalNews,
        duplicatesRemoved: result.duplicatesRemoved,
        spamRemoved: result.spamRemoved,
        urlsNormalized: result.urlsNormalized
      };
      
      if (result.errors.length > 0) {
        console.log(`\n❌ ERREURS (${result.errors.length}):`);
        result.errors.forEach(e => console.log(`   - ${e}`));
      }
    }

    // Sauvegarder le rapport
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    
    const reportPath = path.join(logsDir, 'db_cleanup_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Rapport sauvegardé: ${reportPath}`);

    console.log('\n✅ Terminé!');
    
  } catch (error) {
    console.error('\n❌ ERREUR FATALE:', error);
    report.error = String(error);
    process.exit(1);
  } finally {
    await cleanup.close();
  }
}

main();

export { DatabaseCleanup };
