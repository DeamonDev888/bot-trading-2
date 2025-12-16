#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function auditPipelineComplet() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'financial_analyst',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '9022',
  });

  const client = await pool.connect();

  try {
    console.log('🔍 === AUDIT COMPLET DU PIPELINE ===\n');
    console.log('📅 Date/Heure actuelle:', new Date().toISOString());
    console.log('');

    // 1. Vue d'ensemble générale
    console.log('📊 === VUE D\'ENSEMBLE GÉNÉRALE ===');
    const overviewQuery = `
      SELECT
        processing_status,
        COUNT(*) as count,
        COUNT(CASE WHEN published_to_discord = TRUE THEN 1 END) as published,
        COUNT(CASE WHEN published_to_discord = FALSE OR published_to_discord IS NULL THEN 1 END) as not_published,
        MIN(published_at) as oldest,
        MAX(published_at) as newest
      FROM news_items
      GROUP BY processing_status
      ORDER BY count DESC
    `;
    const overviewResult = await client.query(overviewQuery);
    let totalPosts = 0;
    overviewResult.rows.forEach(row => {
      totalPosts += parseInt(row.count);
      console.log(`  ${row.processing_status || 'NULL'}: ${row.count} posts`);
      console.log(`    ✅ Publiés: ${row.published}, ⏳ Non publiés: ${row.not_published}`);
      console.log(`    📅 Du ${row.oldest} au ${row.newest}`);
    });
    console.log(`\n📊 TOTAL POSTS: ${totalPosts}`);

    // 2. Posts par statut et score (dernières 48h)
    console.log('\n📈 === POSTS DERNIÈRES 48H PAR STATUT ET SCORE ===');
    const last48hQuery = `
      SELECT
        processing_status,
        relevance_score,
        COUNT(*) as count,
        COUNT(CASE WHEN published_to_discord = TRUE THEN 1 END) as published,
        COUNT(CASE WHEN published_to_discord = FALSE OR published_to_discord IS NULL THEN 1 END) as not_published,
        MIN(published_at) as oldest,
        MAX(published_at) as newest
      FROM news_items
      WHERE published_at >= NOW() - INTERVAL '48 hours'
      GROUP BY processing_status, relevance_score
      ORDER BY processing_status, relevance_score DESC
    `;
    const last48hResult = await client.query(last48hQuery);
    last48hResult.rows.forEach(row => {
      if (parseInt(row.count) > 0) {
        console.log(`  ${row.processing_status || 'NULL'} (score ${row.relevance_score}): ${row.count} posts`);
        console.log(`    ✅ Publiés: ${row.published}, ⏳ Non publiés: ${row.not_published}`);
        console.log(`    📅 Du ${row.oldest} au ${row.newest}`);
      }
    });

    // 3. Posts qui DEVRAIENT être publiés (score >= 7, 24h)
    console.log('\n🎯 === POSTS ÉLIGIBLES PUBLICATION (SCORE >= 7, 24H) ===');
    const eligibleQuery = `
      SELECT
        source,
        COUNT(*) as count,
        COUNT(CASE WHEN published_to_discord = TRUE THEN 1 END) as published,
        COUNT(CASE WHEN published_to_discord = FALSE OR published_to_discord IS NULL THEN 1 END) as not_published,
        AVG(relevance_score) as avg_score,
        MIN(published_at) as oldest,
        MAX(published_at) as newest
      FROM news_items
      WHERE processing_status = 'processed'
        AND relevance_score >= 7
        AND published_at >= NOW() - INTERVAL '24 hours'
      GROUP BY source
      ORDER BY count DESC
    `;
    const eligibleResult = await client.query(eligibleQuery);
    let totalEligible = 0;
    let totalEligibleNotPublished = 0;
    eligibleResult.rows.forEach(row => {
      totalEligible += parseInt(row.count);
      totalEligibleNotPublished += parseInt(row.not_published);
      console.log(`  ${row.source}: ${row.count} posts (score moy: ${Number(row.avg_score).toFixed(1)})`);
      console.log(`    ✅ Publiés: ${row.published}, ⏳ Non publiés: ${row.not_published}`);
      console.log(`    📅 Du ${row.oldest} au ${row.newest}`);
    });
    console.log(`\n📊 TOTAL ÉLIGIBLES: ${totalEligible} (dont ${totalEligibleNotPublished} non publiés)`);

    // 4. Posts raw récents (problème potentiel)
    console.log('\n⚠️ === POSTS RAW RÉCENTS (À TRAITER) ===');
    const rawRecentQuery = `
      SELECT
        source,
        COUNT(*) as count,
        MIN(published_at) as oldest,
        MAX(published_at) as newest
      FROM news_items
      WHERE processing_status = 'raw'
        AND published_at >= NOW() - INTERVAL '48 hours'
      GROUP BY source
      ORDER BY count DESC
    `;
    const rawRecentResult = await client.query(rawRecentQuery);
    let totalRaw = 0;
    rawRecentResult.rows.forEach(row => {
      totalRaw += parseInt(row.count);
      console.log(`  ${row.source}: ${row.count} posts raw`);
      console.log(`    📅 Du ${row.oldest} au ${row.newest}`);
    });
    console.log(`\n📊 TOTAL RAW (48H): ${totalRaw} posts à traiter`);

    // 5. Posts publiés récemment
    console.log('\n✅ === POSTS PUBLIÉS RÉCEMMENT ===');
    const publishedRecentQuery = `
      SELECT
        source,
        COUNT(*) as count,
        MIN(published_at) as oldest,
        MAX(published_at) as newest
      FROM news_items
      WHERE published_to_discord = TRUE
        AND published_at >= NOW() - INTERVAL '24 hours'
      GROUP BY source
      ORDER BY count DESC
      LIMIT 10
    `;
    const publishedRecentResult = await client.query(publishedRecentQuery);
    let totalPublished = 0;
    publishedRecentResult.rows.forEach(row => {
      totalPublished += parseInt(row.count);
      console.log(`  ${row.source}: ${row.count} posts publiés`);
      console.log(`    📅 Du ${row.oldest} au ${row.newest}`);
    });
    console.log(`\n📊 TOTAL PUBLIES (24H): ${totalPublished} posts`);

    // 6. Analyse des sources les plus prolifiques
    console.log('\n📡 === TOP 10 SOURCES (48H) ===');
    const topSourcesQuery = `
      SELECT
        source,
        COUNT(*) as total_count,
        COUNT(CASE WHEN processing_status = 'processed' THEN 1 END) as processed_count,
        COUNT(CASE WHEN processing_status = 'raw' THEN 1 END) as raw_count,
        COUNT(CASE WHEN published_to_discord = TRUE THEN 1 END) as published_count,
        AVG(relevance_score) as avg_score
      FROM news_items
      WHERE published_at >= NOW() - INTERVAL '48 hours'
      GROUP BY source
      ORDER BY total_count DESC
      LIMIT 10
    `;
    const topSourcesResult = await client.query(topSourcesQuery);
    topSourcesResult.rows.forEach(row => {
      console.log(`  ${row.source}: ${row.total_count} posts total`);
      console.log(`    📊 Processed: ${row.processed_count}, Raw: ${row.raw_count}, Publiés: ${row.published_count}`);
      console.log(`    📈 Score moyen: ${Number(row.avg_score).toFixed(1)}`);
    });

    // 7. Posts avec score 7+ non publiés (anomalie)
    console.log('\n🚨 === ANOMALIE: POSTS SCORE >= 7 NON PUBLIES (7 JOURS) ===');
    const anomalyQuery = `
      SELECT
        id,
        title,
        source,
        relevance_score,
        published_at,
        processing_status,
        published_to_discord,
        EXTRACT(EPOCH FROM (NOW() - published_at))/3600 as hours_ago
      FROM news_items
      WHERE processing_status = 'processed'
        AND relevance_score >= 7
        AND (published_to_discord = FALSE OR published_to_discord IS NULL)
        AND published_at >= NOW() - INTERVAL '7 days'
      ORDER BY published_at DESC
      LIMIT 20
    `;
    const anomalyResult = await client.query(anomalyQuery);
    console.log(`  ${anomalyResult.rows.length} posts score >= 7 non publiés:`);
    anomalyResult.rows.forEach((row, idx) => {
      console.log(`\n${idx + 1}. ${row.title.substring(0, 60)}...`);
      console.log(`   📊 Score: ${row.relevance_score} | 📡 Source: ${row.source}`);
      console.log(`   📅 Il y a ${Number(row.hours_ago).toFixed(1)}h | Statut: ${row.processing_status}`);
      console.log(`   🔗 Publié: ${row.published_to_discord}`);
    });

    // 8. Recommandations
    console.log('\n💡 === RECOMMANDATIONS ===');
    console.log(`1. 🔄 Traiter ${totalRaw} posts raw en attente`);
    console.log(`2. 📤 Publier ${totalEligibleNotPublished} posts éligibles non publiés`);
    console.log(`3. 🎯 Vérifier le seuil de déclenchement (actuellement: 3 posts)`);
    console.log(`4. ⏰ Vérifier la fréquence du cron job (actuellement: toutes les 2h)`);

    // 9. Simulation déclenchement publisher
    console.log('\n🚀 === SIMULATION DÉCLENCHEMENT PUBLISHER ===');
    const triggerQuery = `
      SELECT COUNT(*) as count
      FROM news_items
      WHERE processing_status = 'processed'
        AND (published_to_discord = FALSE OR published_to_discord IS NULL)
        AND relevance_score >= 7
        AND published_at >= NOW() - INTERVAL '24 hours'
    `;
    const triggerResult = await client.query(triggerQuery);
    const readyCount = parseInt(triggerResult.rows[0].count || '0');
    console.log(`  Posts prêts: ${readyCount} (seuil: 3)`);
    if (readyCount >= 3) {
      console.log(`  ✅ Le publisher se déclencherait !`);
    } else {
      console.log(`  ⏳ En attente de ${3 - readyCount} posts supplémentaires`);
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'audit:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

auditPipelineComplet().then(() => {
  console.log('\n✅ Audit terminé.');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});
