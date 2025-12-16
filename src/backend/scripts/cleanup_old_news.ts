#!/usr/bin/env node

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'financial_analyst',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '9022',
});

async function cleanupOldNews() {
  console.log('🧹 NETTOYAGE DES VIEILLES ACTUALITÉS...');

  const client = await pool.connect();
  try {
    // 1. Compter les items avant nettoyage
    const countBefore = await client.query('SELECT COUNT(*) FROM news_items');
    console.log(`📊 Items avant nettoyage: ${countBefore.rows[0].count}`);

    // 2. Marquer les items très anciens (< 2024) comme 'archived' au lieu de les supprimer
    console.log('🗄️  Archivage des items pré-2024...');
    const archiveResult = await client.query(`
      UPDATE news_items
      SET processing_status = 'archived'
      WHERE processing_status = 'processed'
        AND published_at < '2024-01-01'
        AND relevance_score >= 6
    `);
    console.log(`✅ Items archivés: ${archiveResult.rowCount}`);

    // 3. Supprimer les items corrompus (dates 1970)
    console.log('🗑️  Suppression des items corrompus (1970)...');
    const corruptResult = await client.query(`
      DELETE FROM news_items
      WHERE published_at < '2000-01-01'
         OR (published_at < '2000-01-01' AND title LIKE '%RSS reader not yet whitelisted%')
    `);
    console.log(`✅ Items corrompus supprimés: ${corruptResult.rowCount}`);

    // 4. Compter les items après nettoyage
    const countAfter = await client.query('SELECT COUNT(*) FROM news_items');
    console.log(`📊 Items après nettoyage: ${countAfter.rows[0].count}`);

    // 5. Afficher les statistiques des items récents prêts à publier
    const recentCount = await client.query(`
      SELECT COUNT(*) as total
      FROM news_items
      WHERE processing_status = 'processed'
        AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
        AND relevance_score >= 6
        AND published_at >= NOW() - INTERVAL '30 days'
        AND (category LIKE 'X-%' OR url LIKE '%twitter%' OR url LIKE '%x.com%' OR url LIKE '%fixupx%')
    `);
    console.log(`🚀 Items récents prêts à publier (derniers 30 jours): ${recentCount.rows[0].total}`);

    // 6. Montrer la distribution par année restante
    console.log('\n📅 Distribution par année après nettoyage:');
    const yearDist = await client.query(`
      SELECT
        EXTRACT(YEAR FROM published_at) as year,
        COUNT(*) as count
      FROM news_items
      WHERE published_at >= '2020-01-01'
      GROUP BY EXTRACT(YEAR FROM published_at)
      ORDER BY year DESC
    `);

    yearDist.rows.forEach(row => {
      console.log(`  ${row.year}: ${row.count} items`);
    });

  } finally {
    client.release();
    await pool.end();
  }
}

cleanupOldNews().catch(console.error);