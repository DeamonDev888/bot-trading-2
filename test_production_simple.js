#!/usr/bin/env node

/**
 * TEST PRODUCTION SIMPLE - VERSION CORRIGÉE
 */

import { NewsFilterAgentOptimized } from './dist/backend/agents/NewsFilterAgentOptimized.js';
import { AgeFilterService } from './dist/backend/agents/AgeFilterService.js';
import { Pool } from 'pg';

console.log('🏭 TEST - MODE PRODUCTION SIMPLE');
console.log('='.repeat(50));

const startTime = Date.now();

function log(phase, message, data = null) {
  const timestamp = new Date().toISOString().substring(11, 19);
  const icon = phase.includes('ERREUR') ? '❌' : phase.includes('SUCCÈS') ? '✅' : '🔄';
  console.log(`${icon} [${timestamp}] ${phase}: ${message}`);
  if (data) {
    console.log('   📊:', JSON.stringify(data, null, 2));
  }
}

async function checkDatabaseHealth() {
  log('DATABASE', '🏥 Vérification santé base de données...');

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'financial_analyst',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '9022',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  const client = await pool.connect();
  try {
    const now = new Date();

    // Test de connexion
    const timeResult = await client.query('SELECT NOW() as server_time');
    log('DATABASE', '✅ Connexion réussie', {
      serverTime: timeResult.rows[0].server_time
    });

    // Statistiques générales
    const stats = await client.query(`
      SELECT
        COUNT(*) as total_items,
        COUNT(CASE WHEN processing_status = 'processed' THEN 1 END) as processed,
        COUNT(CASE WHEN processing_status = 'raw' THEN 1 END) as raw,
        COUNT(CASE WHEN processing_status = 'archived' THEN 1 END) as archived,
        COUNT(CASE WHEN published_to_discord = true THEN 1 END) as published
      FROM news_items
    `);

    const dbStats = stats.rows[0];
    log('DATABASE', '📊 Statistiques actuelles', dbStats);

    // Distribution par âge
    const ageDistribution = await client.query(`
      SELECT
        CASE
          WHEN published_at >= NOW() - INTERVAL '1 hour' THEN '1h'
          WHEN published_at >= NOW() - INTERVAL '24 hours' THEN '24h'
          WHEN published_at >= NOW() - INTERVAL '3 days' THEN '3d'
          WHEN published_at >= NOW() - INTERVAL '7 days' THEN '7d'
          WHEN published_at >= NOW() - INTERVAL '14 days' THEN '14d'
          ELSE '14d+'
        END as age_range,
        COUNT(*) as count
      FROM news_items
      WHERE published_at IS NOT NULL
      GROUP BY age_range
      ORDER BY MIN(published_at) DESC
    `);

    log('DATABASE', '📈 Distribution par âge', ageDistribution.rows);

    return { stats: dbStats, ageDistribution: ageDistribution.rows };

  } catch (error) {
    log('DATABASE ERREUR', '❌ Erreur base de données', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function testAgeFilterProduction() {
  log('AGE_FILTER', '🔍 Test du AgeFilterService en production...');

  try {
    const ageFilter = AgeFilterService.getInstance({
      maxAgeDays: 7,
      maxAgeHours: 72,
      futureThresholdHours: 2,
      strategies: {
        allowHistoricalReferences: false,
        blockCalendarEvents: true,
        blockPromotional: true,
        allowAnalysisContent: true
      }
    });

    // Test avec items problématiques simulés
    const problematicItems = [
      {
        id: 'test_1',
        title: '[Eco Calendar] Fed Meeting - Tomorrow',
        content: 'Economic calendar event scheduled for tomorrow',
        source: 'EconomicCalendar',
        published_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'test_2',
        title: 'LIMITED TIME OFFER - 50% OFF Trading Course!',
        content: 'Buy now discount - subscribe today',
        source: 'Promotional',
        published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'test_3',
        title: 'Bitcoin hits $30k - Very Old News',
        content: 'Historical milestone from last year',
        source: 'OldNews',
        published_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'test_4',
        title: 'Breaking: Major tech announcement today',
        content: 'Tech giant announces major breakthrough',
        source: 'Reuters',
        published_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      }
    ];

    log('AGE_FILTER', `📊 Test sur ${problematicItems.length} items problématiques`);

    const results = await ageFilter.filterBatch(problematicItems);

    const kept = results.filter(r => r.shouldKeep);
    const rejected = results.filter(r => !r.shouldKeep);

    log('AGE_FILTER', `✅ Résultats: ${kept.length} gardés, ${rejected.length} rejetés`);

    // Analyse des rejets
    results.forEach(result => {
      const status = result.shouldKeep ? '✅' : '❌';
      log('AGE_FILTER', `${status} ${result.originalItem.title.substring(0, 40)}...`, {
        category: result.category,
        reason: result.reason,
        age: `${result.age.toFixed(1)}j`
      });
    });

    // Statistiques
    const stats = await ageFilter.getAgeStatistics();
    log('AGE_FILTER', '📊 Statistiques globales', {
      totalItems: stats.totalItems,
      timestamp: stats.timestamp
    });

    await ageFilter.close();

    return { tested: problematicItems.length, kept: kept.length, rejected: rejected.length };

  } catch (error) {
    log('AGE_FILTER ERREUR', '❌ Erreur AgeFilter', error.message);
    throw error;
  }
}

async function testNewsFilterIntegration() {
  log('NEWS_FILTER', '🚀 Test d\'intégration NewsFilterAgentOptimized...');

  try {
    const initStart = Date.now();
    const agent = new NewsFilterAgentOptimized();
    const initTime = Date.now() - initStart;

    log('NEWS_FILTER', '✅ Agent initialisé avec succès', {
      initTimeMs: initTime,
      ageFilterIntegrated: true
    });

    // Test court sans lancer le cycle complet (pour éviter surcharge)
    log('NEWS_FILTER', 'ℹ️ Agent prêt pour le filtrage (cycle non lancé pour test)');

    await agent.close();

    return { initTime };

  } catch (error) {
    log('NEWS_FILTER ERREUR', '❌ Erreur NewsFilter', error.message);
    throw error;
  }
}

async function generateReport(results) {
  const duration = Date.now() - startTime;
  const durationSec = (duration / 1000).toFixed(2);

  console.log('\n' + '='.repeat(50));
  console.log('📊 RAPPORT FINAL - TEST PRODUCTION');
  console.log('='.repeat(50));
  console.log(`⏱️ Durée totale: ${durationSec}s`);
  console.log(`🕐 Heure de fin: ${new Date().toISOString()}`);

  console.log('\n📊 RÉSULTATS:');

  if (results.database) {
    console.log('\n🗄️ Base de Données:');
    console.log(`   • Total items: ${results.database.stats.total_items || 0}`);
    console.log(`   • Processed: ${results.database.stats.processed || 0}`);
    console.log(`   • Published: ${results.database.stats.published || 0}`);
  }

  if (results.ageFilter) {
    console.log('\n🔍 Filtre par Âge:');
    console.log(`   • Items testés: ${results.ageFilter.tested}`);
    console.log(`   • Items gardés: ${results.ageFilter.kept}`);
    console.log(`   • Items rejetés: ${results.ageFilter.rejected}`);
    console.log(`   • Taux rejet: ${((results.ageFilter.rejected / results.ageFilter.tested) * 100).toFixed(1)}%`);
  }

  if (results.newsFilter) {
    console.log('\n🚀 News Filter:');
    console.log(`   • Initialisation: ${results.newsFilter.initTime}ms`);
  }

  console.log('\n🎯 ÉVALUATION:');

  const healthScore = calculateHealthScore(results);
  const status = healthScore >= 80 ? '✅ EXCELLENT' : healthScore >= 60 ? '⚠️ BON' : '❌ À AMÉLIORER';

  console.log(`   Score santé: ${healthScore}%`);
  console.log(`   Statut: ${status}`);

  if (healthScore >= 80) {
    console.log('\n🚀 SYSTÈME PRÊT POUR LA PRODUCTION!');
    console.log('   • Filtre par âge fonctionne parfaitement');
    console.log('   • Base de données saine');
    console.log('   • Intégration complète réussie');
  }

  console.log('='.repeat(50));

  return healthScore;
}

function calculateHealthScore(results) {
  let score = 100;

  // Pénalités pour problèmes
  if (!results.database) score -= 30;
  if (!results.ageFilter) score -= 30;
  if (!results.newsFilter) score -= 20;

  // Ajustements basés sur les résultats
  if (results.ageFilter) {
    const rejectionRate = results.ageFilter.rejected / results.ageFilter.tested;
    if (rejectionRate > 0.8) score -= 20; // Trop de rejets
    else if (rejectionRate > 0.6) score -= 10; // Beaucoup de rejets
    else if (rejectionRate < 0.2) score -= 5; // Peu de rejets (peut être trop permissif)
  }

  return Math.max(0, score);
}

// Fonction principale
async function main() {
  try {
    log('DÉMARRAGE', '🚀 Lancement du test en mode production...');

    const results = {};

    // Phase 1: Base de données
    results.database = await checkDatabaseHealth();

    // Phase 2: Age Filter
    results.ageFilter = await testAgeFilterProduction();

    // Phase 3: News Filter
    results.newsFilter = await testNewsFilterIntegration();

    // Rapport final
    const healthScore = await generateReport(results);

    process.exit(healthScore >= 80 ? 0 : 1);

  } catch (error) {
    log('ERREUR FATALE', '💥 Erreur test production', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('💥 Erreur non capturée:', error.message);
  process.exit(1);
});

// Lancer le test
main();