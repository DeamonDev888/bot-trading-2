#!/usr/bin/env node

/**
 * TEST DU SERVICE DE FILTRAGE PAR ÂGE (version compilée)
 */

import { AgeFilterService } from './dist/backend/agents/AgeFilterService.js';

console.log('🧪 TEST - AgeFilterService (compilé)');
console.log('='.repeat(40));

async function testAgeFilterService() {
  let ageFilter;
  try {
    console.log('🚀 Initialisation du service...');

    // Configuration de test
    ageFilter = AgeFilterService.getInstance({
      maxAgeDays: 7,                    // 7 jours max
      maxAgeHours: 48,                   // 2 jours max pour posts récents
      futureThresholdHours: 1,           // 1 heure dans le futur
      strategies: {
        allowHistoricalReferences: false,
        blockCalendarEvents: true,
        blockPromotional: true,
        allowAnalysisContent: true
      }
    });

    console.log('✅ Service initialisé avec configuration test');

    // Test simple de la configuration
    const config = ageFilter.getConfig();
    console.log(`📊 Configuration actuelle:`);
    console.log(`   Max age: ${config.maxAgeDays} days`);
    console.log(`   Block calendar events: ${config.strategies.blockCalendarEvents}`);
    console.log(`   Block promotional: ${config.strategies.blockPromotional}`);

    // Test de filtrage avec quelques items
    const testItems = [
      {
        id: '1',
        title: 'Breaking: Tech news today',
        content: 'Latest technology developments',
        source: 'TechNews',
        published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 heures ago
      },
      {
        id: '2',
        title: '50% OFF PROMO - Buy now!',
        content: 'Limited time discount offer',
        source: 'Spam',
        published_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 jour ago
      }
    ];

    console.log(`\n📊 Test de ${testItems.length} items...`);

    const results = await ageFilter.filterBatch(testItems);

    console.log('\n📋 RÉSULTATS:');
    results.forEach(result => {
      const status = result.shouldKeep ? '✅' : '❌';
      console.log(`   ${status} ${result.originalItem.title} - ${result.reason}`);
    });

    // Test des statistiques
    console.log('\n📊 STATISTIQUES:');
    try {
      const stats = await ageFilter.getAgeStatistics();
      console.log(`   Total items en base: ${stats.totalItems}`);
      console.log(`   Timestamp: ${stats.timestamp}`);
    } catch (statsError) {
      console.log(`   Stats: ${statsError.message}`);
    }

    console.log('\n✅ Tests AgeFilterService terminés avec succès');
    return true;

  } catch (error) {
    console.error('❌ Erreur test AgeFilterService:', error.message);
    console.error('Stack:', error.stack);
    return false;
  } finally {
    if (ageFilter) {
      try {
        await ageFilter.close();
        console.log('✅ Service fermé correctement');
      } catch (closeError) {
        console.error('❌ Erreur fermeture service:', closeError.message);
      }
    }
  }
}

// Exécuter le test
testAgeFilterService()
  .then(success => {
    console.log('\n' + '='.repeat(40));
    console.log(`📊 TEST TERMINÉ: ${success ? 'SUCCÈS' : 'ÉCHEC'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });