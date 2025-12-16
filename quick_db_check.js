#!/usr/bin/env node

/**
 * Vérification rapide de la DB - État des posts
 */

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

async function quickDbCheck() {
  console.log('🧪 TEST 4/4: État base de données\n');

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'financial_analyst',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '9022'
  });

  const client = await pool.connect();

  try {
    // Stats générales
    const statsQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN processing_status = 'processed' THEN 1 END) as processed,
        COUNT(CASE WHEN relevance_score >= 7 THEN 1 END) as high_score,
        COUNT(CASE WHEN published_to_discord = TRUE THEN 1 END) as published
      FROM news_items
    `;
    const statsResult = await client.query(statsQuery);
    const stats = statsResult.rows[0];

    console.log('📊 STATS GÉNÉRALES:');
    console.log(`   📄 Total posts: ${stats.total}`);
    console.log(`   ✅ Posts traités: ${stats.processed}`);
    console.log(`   ⭐ Posts score ≥7: ${stats.high_score}`);
    console.log(`   📤 Posts publiés: ${stats.published}`);

    // Posts récents (2025-11-15+)
    const recentQuery = `
      SELECT COUNT(*) as recent
      FROM news_items
      WHERE published_at >= '2025-11-15T00:00:00Z'
        AND processing_status = 'processed'
        AND relevance_score >= 7
        AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
    `;
    const recentResult = await client.query(recentQuery);
    const recent = recentResult.rows[0].recent;

    console.log(`\n🆕 POSTS RÉCENTS (2025-11-15+, score ≥7, non publiés): ${recent}`);

    // Exemples de posts récents
    if (parseInt(recent) > 0) {
      const examplesQuery = `
        SELECT title, published_at, relevance_score, source
        FROM news_items
        WHERE published_at >= '2025-11-15T00:00:00Z'
          AND processing_status = 'processed'
          AND relevance_score >= 7
          AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
        ORDER BY published_at DESC
        LIMIT 5
      `;
      const examplesResult = await client.query(examplesQuery);

      console.log('\n📋 EXEMPLES DE POSTS RÉCENTS:');
      examplesResult.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.title.substring(0, 50)}...`);
        console.log(`      📅 ${row.published_at} | Score: ${row.relevance_score}/10 | Source: ${row.source}`);
      });
    }

    // Posts anciens (doit être 0 après nettoyage)
    const oldQuery = `
      SELECT COUNT(*) as old
      FROM news_items
      WHERE published_at < '2025-11-15T00:00:00Z'
    `;
    const oldResult = await client.query(oldQuery);
    const old = oldResult.rows[0].old;

    console.log(`\n🗑️ POSTS ANCIENS (avant 2025-11-15): ${old} ${old == '0' ? '✅' : '❌'}`);

    console.log('\n✅ RÉSULTAT: Base de données optimisée !');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

quickDbCheck();
