#!/usr/bin/env node

import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'financial_analyst',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '9022'
});

async function runMaintenance() {
  const client = await pool.connect();
  try {
    console.log('🔧 Maintenance du pipeline -', new Date().toLocaleString());

    // 1. Nettoyer les anciens posts bruts (plus de 7 jours)
    const oldRawCleanup = await client.query(`
      UPDATE news_items
      SET processing_status = 'archived'
      WHERE processing_status = 'raw'
        AND created_at < NOW() - INTERVAL '7 days'
    `);

    if (oldRawCleanup.rowCount > 0) {
      console.log(`🗑️  ${oldRawCleanup.rowCount} posts bruts anciens archivés`);
    }

    // 2. Archiver les anciens posts publiés (plus de 90 jours)
    const archivePublished = await client.query(`
      UPDATE news_items
      SET processing_status = 'archived'
      WHERE published_to_discord = true
        AND published_at < NOW() - INTERVAL '90 days'
    `);

    if (archivePublished.rowCount > 0) {
      console.log(`📦 ${archivePublished.rowCount} posts publiés archivés`);
    }

    // 3. Optimiser la table (VACUUM ANALYZE)
    await client.query('VACUUM ANALYZE news_items');
    console.log('🧹 Table optimisée');

    console.log('✅ Maintenance terminée');

  } finally {
    client.release();
    await pool.end();
  }
}

runMaintenance().catch(console.error);
