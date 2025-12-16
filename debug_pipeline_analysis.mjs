#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function analyzeNewsPipeline() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'financial_analyst',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '9022',
  });

  const client = await pool.connect();

  try {
    console.log('🔍 === ANALYSE DU PIPELINE NEWS ===\n');

    // 1. Compter par statut de traitement
    console.log('📊 === RÉPARTITION PAR STATUT DE TRAITEMENT ===');
    const statusQuery = `
      SELECT
        processing_status,
        COUNT(*) as count,
        MIN(published_at) as oldest_date,
        MAX(published_at) as newest_date
      FROM news_items
      WHERE published_at >= NOW() - INTERVAL '30 days'
      GROUP BY processing_status
      ORDER BY count DESC
    `;
    const statusResult = await client.query(statusQuery);
    statusResult.rows.forEach(row => {
      console.log(`  ${row.processing_status || 'NULL'}: ${row.count} posts`);
      console.log(`    📅 Du ${row.oldest_date} au ${row.newest_date}`);
    });

    // 2. Posts non publiés par score de pertinence
    console.log('\n📈 === POSTS NON PUBLIÉS PAR SCORE DE PERTINENCE ===');
    const scoreQuery = `
      SELECT
        relevance_score,
        COUNT(*) as count,
        MIN(published_at) as oldest_date,
        MAX(published_at) as newest_date
      FROM news_items
      WHERE (published_to_discord IS FALSE OR published_to_discord IS NULL)
        AND published_at >= NOW() - INTERVAL '30 days'
      GROUP BY relevance_score
      ORDER BY relevance_score DESC
    `;
    const scoreResult = await client.query(scoreQuery);
    scoreResult.rows.forEach(row => {
      console.log(`  Score ${row.relevance_score}: ${row.count} posts`);
      console.log(`    📅 Du ${row.oldest_date} au ${row.newest_date}`);
    });

    // 3. Posts "processed" par score (ce qui pourrait être publié)
    console.log('\n✅ === POSTS TRAITÉS ET NON PUBLIÉS ===');
    const processedQuery = `
      SELECT
        relevance_score,
        COUNT(*) as count,
        MIN(published_at) as oldest_date,
        MAX(published_at) as newest_date
      FROM news_items
      WHERE processing_status = 'processed'
        AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
        AND published_at >= NOW() - INTERVAL '30 days'
      GROUP BY relevance_score
      ORDER BY relevance_score DESC
    `;
    const processedResult = await client.query(processedQuery);
    processedResult.rows.forEach(row => {
      console.log(`  Score ${row.relevance_score}: ${row.count} posts`);
      console.log(`    📅 Du ${row.oldest_date} au ${row.newest_date}`);
    });

    // 4. Posts récents (derniers 7 jours) par statut
    console.log('\n🕒 === POSTS RÉCENTS (7 JOURS) PAR STATUT ===');
    const recentQuery = `
      SELECT
        processing_status,
        relevance_score,
        COUNT(*) as count
      FROM news_items
      WHERE published_at >= NOW() - INTERVAL '7 days'
      GROUP BY processing_status, relevance_score
      ORDER BY processing_status, relevance_score DESC
    `;
    const recentResult = await client.query(recentQuery);
    recentResult.rows.forEach(row => {
      console.log(`  ${row.processing_status || 'NULL'} (score ${row.relevance_score}): ${row.count} posts`);
    });

    // 5. Top sources des posts récents
    console.log('\n📡 === TOP SOURCES (7 JOURS) ===');
    const sourcesQuery = `
      SELECT
        source,
        COUNT(*) as count,
        AVG(relevance_score) as avg_score,
        MAX(published_at) as newest_post
      FROM news_items
      WHERE published_at >= NOW() - INTERVAL '7 days'
      GROUP BY source
      ORDER BY count DESC
      LIMIT 10
    `;
    const sourcesResult = await client.query(sourcesQuery);
    sourcesResult.rows.forEach(row => {
      console.log(`  ${row.source}: ${row.count} posts (score moyen: ${Number(row.avg_score).toFixed(1)}, dernier: ${row.newest_post})`);
    });

    // 6. Posts avec category X- qui pourraient être publiés
    console.log('\n🐦 === POSTS X/TWITTER NON PUBLIÉS ===');
    const xPostsQuery = `
      SELECT
        relevance_score,
        processing_status,
        COUNT(*) as count
      FROM news_items
      WHERE (category LIKE 'X-%' OR url LIKE '%twitter%' OR url LIKE '%x.com%' OR url LIKE '%fixupx%')
        AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
        AND published_at >= NOW() - INTERVAL '30 days'
      GROUP BY relevance_score, processing_status
      ORDER BY relevance_score DESC, processing_status
    `;
    const xPostsResult = await client.query(xPostsQuery);
    xPostsResult.rows.forEach(row => {
      console.log(`  Score ${row.relevance_score}, statut ${row.processing_status || 'NULL'}: ${row.count} posts`);
    });

    // 7. Échantillon des 5 posts les plus récents non publiés
    console.log('\n📝 === ÉCHANTILLON: 5 POSTS RÉCENTS NON PUBLIÉS ===');
    const sampleQuery = `
      SELECT
        id,
        title,
        source,
        relevance_score,
        processing_status,
        published_at
      FROM news_items
      WHERE (published_to_discord IS FALSE OR published_to_discord IS NULL)
      ORDER BY published_at DESC
      LIMIT 5
    `;
    const sampleResult = await client.query(sampleQuery);
    sampleResult.rows.forEach((row, idx) => {
      console.log(`\n${idx + 1}. ${row.title.substring(0, 60)}...`);
      console.log(`   📊 Score: ${row.relevance_score}, Statut: ${row.processing_status}`);
      console.log(`   📡 Source: ${row.source}`);
      console.log(`   📅 Date: ${row.published_at}`);
    });

    // 8. Calculer combien seraient publiés avec différents seuils
    console.log('\n🎯 === SIMULATION AVEC DIFFÉRENTS SEUILS ===');
    const thresholds = [3, 4, 5, 6, 7];
    for (const threshold of thresholds) {
      const thresholdQuery = `
        SELECT COUNT(*) as count
        FROM news_items
        WHERE processing_status = 'processed'
          AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
          AND relevance_score >= $1
          AND published_at >= NOW() - INTERVAL '7 days'
          AND (category LIKE 'X-%' OR url LIKE '%twitter%' OR url LIKE '%x.com%' OR url LIKE '%fixupx%')
      `;
      const thresholdResult = await client.query(thresholdQuery, [threshold]);
      console.log(`  Seuil ${threshold}: ${thresholdResult.rows[0].count} posts éligibles (7 jours)`);
    }

    // 9. Test de déclenchement du publisher
    console.log('\n🚀 === TEST DE DÉCLENCHEMENT DU PUBLISHER ===');
    const publisherTestQuery = `
      SELECT COUNT(*) as total
      FROM news_items
      WHERE processing_status = 'processed'
        AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
        AND relevance_score >= 6
        AND published_at >= NOW() - INTERVAL '30 days'
        AND (category LIKE 'X-%' OR url LIKE '%twitter%' OR url LIKE '%x.com%' OR url LIKE '%fixupx%')
    `;
    const publisherTestResult = await client.query(publisherTestQuery);
    const totalReady = parseInt(publisherTestResult.rows[0].total || '0');
    console.log(`  Posts prêts pour le publisher (NewsFilterAgentOptimized): ${totalReady} (seuil: 3)`);

    if (totalReady >= 3) {
      console.log(`  ✅ Seuil atteint! Le publisher devrait se déclencher.`);
    } else {
      console.log(`  ❌ Seuil non atteint! En attente de ${3 - totalReady} posts supplémentaires.`);
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

analyzeNewsPipeline().then(() => {
  console.log('\n✅ Analyse terminée.');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});
