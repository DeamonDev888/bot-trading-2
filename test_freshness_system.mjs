#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function testFreshnessSystem() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'financial_analyst',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '9022',
  });

  const client = await pool.connect();

  try {
    console.log('🔍 === TEST SYSTÈME FRAÎCHEUR BOURSE TEMPS RÉEL ===\n');

    // 1. Posts score >= 7 dernière 24h par ancienneté
    console.log('⏰ === POSTS SCORE >= 7 (24H) PAR ÂGE ===');
    const freshnessQuery = `
      SELECT
        CASE
          WHEN EXTRACT(EPOCH FROM (NOW() - published_at))/3600 <= 1 THEN '1h'
          WHEN EXTRACT(EPOCH FROM (NOW() - published_at))/3600 <= 3 THEN '3h'
          WHEN EXTRACT(EPOCH FROM (NOW() - published_at))/3600 <= 6 THEN '6h'
          WHEN EXTRACT(EPOCH FROM (NOW() - published_at))/3600 <= 12 THEN '12h'
          WHEN EXTRACT(EPOCH FROM (NOW() - published_at))/3600 <= 24 THEN '24h'
          ELSE '24h+'
        END as age_group,
        COUNT(*) as count,
        AVG(relevance_score) as avg_score,
        MIN(published_at) as oldest,
        MAX(published_at) as newest
      FROM news_items
      WHERE processing_status = 'processed'
        AND relevance_score >= 7
        AND published_at >= NOW() - INTERVAL '24 hours'
        AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
      GROUP BY age_group
      ORDER BY MIN(EXTRACT(EPOCH FROM (NOW() - published_at))/3600)
    `;
    const freshnessResult = await client.query(freshnessQuery);
    freshnessResult.rows.forEach(row => {
      console.log(`  ${row.age_group}: ${row.count} posts (score moy: ${Number(row.avg_score).toFixed(1)})`);
      console.log(`    📅 Du ${row.oldest} au ${row.newest}`);
    });

    // 2. Simulation nouvelle priorisation
    console.log('\n🎯 === SIMULATION NOUVELLE PRIORISATION ===');
    const priorityStats = { URGENT: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };

    // Récupérer tous les posts pour analyse
    const allPostsQuery = `
      SELECT
        relevance_score,
        published_at
      FROM news_items
      WHERE processing_status = 'processed'
        AND relevance_score >= 7
        AND published_at >= NOW() - INTERVAL '24 hours'
        AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
    `;
    const allPostsResult = await client.query(allPostsQuery);

    allPostsResult.rows.forEach(row => {
      const hoursAgo = (Date.now() - new Date(row.published_at).getTime()) / 3600000;
      if (row.relevance_score >= 9 && hoursAgo <= 6) {
        priorityStats.URGENT++;
      } else if (row.relevance_score >= 8 && hoursAgo <= 12) {
        priorityStats.HIGH++;
      } else if (row.relevance_score >= 7 && hoursAgo <= 6) {
        priorityStats.MEDIUM++;
      } else if (row.relevance_score >= 7 && hoursAgo <= 12) {
        priorityStats.MEDIUM++;
      } else {
        priorityStats.LOW++;
      }
    });

    console.log(`  URGENT (< 6h, score ≥ 9): ${priorityStats.URGENT} posts`);
    console.log(`  HIGH (< 12h, score ≥ 8): ${priorityStats.HIGH} posts`);
    console.log(`  MEDIUM (score ≥ 7): ${priorityStats.MEDIUM} posts`);
    console.log(`  LOW: ${priorityStats.LOW} posts`);
    console.log(`  TOTAL: ${allPostsResult.rows.length} posts`);

    // 3. Top 10 posts les plus frais
    console.log('\n📝 === TOP 10 POSTS LES PLUS FRAIS (SCORE >= 7) ===');
    const topFreshQuery = `
      SELECT
        id,
        title,
        source,
        relevance_score,
        published_at,
        EXTRACT(EPOCH FROM (NOW() - published_at))/3600 as hours_ago,
        CASE
          WHEN relevance_score >= 9 AND EXTRACT(EPOCH FROM (NOW() - published_at))/3600 <= 6 THEN 'URGENT'
          WHEN relevance_score >= 8 AND EXTRACT(EPOCH FROM (NOW() - published_at))/3600 <= 12 THEN 'HIGH'
          WHEN relevance_score >= 7 THEN 'MEDIUM'
          ELSE 'LOW'
        END as priority
      FROM news_items
      WHERE processing_status = 'processed'
        AND relevance_score >= 7
        AND published_at >= NOW() - INTERVAL '24 hours'
        AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
      ORDER BY
        -- PRIORITÉ 1: Posts URGENTS (< 6h, score >= 9)
        CASE
          WHEN relevance_score >= 9 AND EXTRACT(EPOCH FROM (NOW() - published_at))/3600 <= 6 THEN 1
          -- PRIORITÉ 2: Posts HIGH (< 12h, score >= 8)
          WHEN relevance_score >= 8 AND EXTRACT(EPOCH FROM (NOW() - published_at))/3600 <= 12 THEN 2
          -- PRIORITÉ 3: Posts très récents (< 6h, score >= 7)
          WHEN relevance_score >= 7 AND EXTRACT(EPOCH FROM (NOW() - published_at))/3600 <= 6 THEN 3
          -- PRIORITÉ 4: Posts récents (< 12h, score >= 7)
          WHEN relevance_score >= 7 AND EXTRACT(EPOCH FROM (NOW() - published_at))/3600 <= 12 THEN 4
          -- PRIORITÉ 5: Autres posts score >= 7
          ELSE 5
        END,
        published_at DESC
      LIMIT 10
    `;
    const topFreshResult = await client.query(topFreshQuery);
    topFreshResult.rows.forEach((row, idx) => {
      console.log(`\n${idx + 1}. [${row.priority}] ${row.title.substring(0, 70)}...`);
      console.log(`   📊 Score: ${row.relevance_score} | 📡 Source: ${row.source}`);
      console.log(`   📅 Il y a ${Number(row.hours_ago).toFixed(1)}h (${row.published_at})`);
    });

    // 4. Posts qui seraient publiés maintenant
    console.log('\n🚀 === POSTS QUI SERAIENT PUBLICS MAINTENANT (30 MAX) ===');
    const publishableQuery = `
      SELECT
        id,
        title,
        source,
        relevance_score,
        published_at,
        EXTRACT(EPOCH FROM (NOW() - published_at))/3600 as hours_ago,
        CASE
          WHEN relevance_score >= 9 AND EXTRACT(EPOCH FROM (NOW() - published_at))/3600 <= 6 THEN 'URGENT'
          WHEN relevance_score >= 8 AND EXTRACT(EPOCH FROM (NOW() - published_at))/3600 <= 12 THEN 'HIGH'
          WHEN relevance_score >= 7 THEN 'MEDIUM'
          ELSE 'LOW'
        END as priority
      FROM news_items
      WHERE processing_status = 'processed'
        AND relevance_score >= 7
        AND published_at >= NOW() - INTERVAL '24 hours'
        AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
      ORDER BY
        CASE
          WHEN relevance_score >= 9 AND EXTRACT(EPOCH FROM (NOW() - published_at))/3600 <= 6 THEN 1
          WHEN relevance_score >= 8 AND EXTRACT(EPOCH FROM (NOW() - published_at))/3600 <= 12 THEN 2
          WHEN relevance_score >= 7 AND EXTRACT(EPOCH FROM (NOW() - published_at))/3600 <= 6 THEN 3
          WHEN relevance_score >= 7 AND EXTRACT(EPOCH FROM (NOW() - published_at))/3600 <= 12 THEN 4
          ELSE 5
        END,
        published_at DESC
      LIMIT 30
    `;
    const publishableResult = await client.query(publishableQuery);
    const priorities = { URGENT: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    publishableResult.rows.forEach(row => {
      priorities[row.priority]++;
    });
    console.log(`  URGENT (< 6h, score ≥ 9): ${priorities.URGENT} posts`);
    console.log(`  HIGH (< 12h, score ≥ 8): ${priorities.HIGH} posts`);
    console.log(`  MEDIUM (score ≥ 7): ${priorities.MEDIUM} posts`);
    console.log(`  LOW: ${priorities.LOW} posts`);
    console.log(`  TOTAL: ${publishableResult.rows.length} posts`);

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testFreshnessSystem().then(() => {
  console.log('\n✅ Test terminé.');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});
