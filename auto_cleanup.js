#!/usr/bin/env node

/**
 * Script de nettoyage automatique - À intégrer dans le cron
 * Supprime automatiquement les posts > 35 jours (avant 2025-11-15)
 */

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

async function autoCleanup() {
  console.log('🧹 AUTO-CLEANUP: Nettoyage automatique posts > 35 jours\n');

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'financial_analyst',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '9022'
  });

  const client = await pool.connect();

  try {
    const cutoffDate = '2025-11-15T00:00:00Z';

    // Nettoyer les posts anciens
    const deleteQuery = `
      DELETE FROM news_items
      WHERE published_at < $1::timestamp
    `;
    const deleteResult = await client.query(deleteQuery, [cutoffDate]);

    console.log(`✅ SUPPRIMÉ: ${deleteResult.rowCount} posts anciens`);

    // Nettoyer aussi les analyses orphelines
    const cleanupOrphans = `
      DELETE FROM sentiment_analyses
      WHERE created_at < $1::timestamp
    `;
    const orphanResult = await client.query(cleanupOrphans, [cutoffDate]);

    if (orphanResult.rowCount > 0) {
      console.log(`✅ SUPPRIMÉ: ${orphanResult.rowCount} analyses orphelines`);
    }

  } catch (error) {
    console.error('❌ Erreur auto-cleanup:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Exécution si appelé directement
if (import.meta.url === process.argv[1] || process.argv[1].endsWith('auto_cleanup.js')) {
  autoCleanup()
    .then(() => process.exit(0))
    .catch((error) => process.exit(1));
}

export { autoCleanup };
