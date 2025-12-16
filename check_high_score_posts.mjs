#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function checkHighScorePosts() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'financial_analyst',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '9022',
  });

  const client = await pool.connect();

  try {
    console.log('🔍 === VÉRIFICATION DES POSTS SCORE >= 7 ===\n');

    // 1. Posts score >= 7, toutes catégories confondues (7 jours)
    console.log('📊 === POSTS SCORE >= 7 (7 jours, toutes catégories) ===');
    const allQuery = `
      SELECT
        COUNT(*) as count,
        MIN(published_at) as oldest_date,
        MAX(published_at) as newest_date
      FROM news_items
      WHERE processing_status = 'processed'
        AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
        AND relevance_score >= 7
        AND published_at >= NOW() - INTERVAL '7 days'
    `;
    const allResult = await client.query(allQuery);
    console.log(`  Total posts score >= 7: ${allResult.rows[0].count}`);
    console.log(`  Du ${allResult.rows[0].oldest_date} au ${allResult.rows[0].newest_date}`);

    // 2. Posts score >= 7, X/Twitter seulement
    console.log('\n🐦 === POSTS SCORE >= 7 X/TWITTER (7 jours) ===');
    const xQuery = `
      SELECT
        COUNT(*) as count,
        MIN(published_at) as oldest_date,
        MAX(published_at) as newest_date
      FROM news_items
      WHERE processing_status = 'processed'
        AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
        AND relevance_score >= 7
        AND published_at >= NOW() - INTERVAL '7 days'
        AND (category LIKE 'X-%' OR url LIKE '%twitter%' OR url LIKE '%x.com%' OR url LIKE '%fixupx%')
    `;
    const xResult = await client.query(xQuery);
    console.log(`  Total posts X/Twitter score >= 7: ${xResult.rows[0].count}`);
    console.log(`  Du ${xResult.rows[0].oldest_date} au ${xResult.rows[0].newest_date}`);

    // 3. Répartition par catégorie pour les posts score >= 7
    console.log('\n📂 === RÉPARTITION PAR CATÉGORIE (score >= 7, 7 jours) ===');
    const categoryQuery = `
      SELECT
        COALESCE(category, 'NULL') as category,
        COUNT(*) as count,
        MIN(published_at) as oldest_date,
        MAX(published_at) as newest_date
      FROM news_items
      WHERE processing_status = 'processed'
        AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
        AND relevance_score >= 7
        AND published_at >= NOW() - INTERVAL '7 days'
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `;
    const categoryResult = await client.query(categoryQuery);
    categoryResult.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.count} posts`);
      console.log(`    📅 Du ${row.oldest_date} au ${row.newest_date}`);
    });

    // 4. Échantillon des posts score >= 7 par catégorie
    console.log('\n📝 === ÉCHANTILLON: 3 POSTS SCORE >= 7 PAR CATÉGORIE ===');
    const sampleQuery = `
      SELECT
        id,
        title,
        source,
        category,
        url,
        relevance_score,
        published_at
      FROM news_items
      WHERE processing_status = 'processed'
        AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
        AND relevance_score >= 7
        AND published_at >= NOW() - INTERVAL '7 days'
      ORDER BY relevance_score DESC, published_at DESC
      LIMIT 15
    `;
    const sampleResult = await client.query(sampleQuery);
    sampleResult.rows.forEach((row, idx) => {
      console.log(`\n${idx + 1}. ${row.title.substring(0, 60)}...`);
      console.log(`   📊 Score: ${row.relevance_score}, Catégorie: ${row.category || 'NULL'}`);
      console.log(`   📡 Source: ${row.source}`);
      console.log(`   🔗 URL: ${row.url || 'NULL'}`);
      console.log(`   📅 Date: ${row.published_at}`);
    });

    // 5. Vérifier si les posts TradingEconomics ont une URL twitter/x
    console.log('\n🔍 === VÉRIFICATION: POSTS TRADINGECONOMICS AVEC URL X/TWITTER ===');
    const teQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN url LIKE '%twitter%' OR url LIKE '%x.com%' OR url LIKE '%fixupx%' THEN 1 END) as with_x_url
      FROM news_items
      WHERE source = 'TradingEconomics'
        AND processing_status = 'processed'
        AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
        AND relevance_score >= 7
        AND published_at >= NOW() - INTERVAL '7 days'
    `;
    const teResult = await client.query(teQuery);
    console.log(`  Total TradingEconomics score >= 7: ${teResult.rows[0].total}`);
    console.log(`  Avec URL X/Twitter: ${teResult.rows[0].with_x_url}`);

  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkHighScorePosts().then(() => {
  console.log('\n✅ Vérification terminée.');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});
