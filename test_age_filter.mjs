#!/usr/bin/env node

/**
 * TEST DU SERVICE DE FILTRAGE PAR ÂGE
 * Test du nouveau AgeFilterService
 */

import { AgeFilterService } from './src/backend/agents/AgeFilterService.js';

console.log('🧪 TEST - AgeFilterService');
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
        blockCalendarEvents: true,
        blockPromotional: true,
        allowAnalysisContent: true
      }
    });

    console.log('✅ Service initialisé avec configuration test');

    // Données de test avec différents cas
    const testItems = [
      {
        // Item récent - devrait être accepté
        id: '1',
        title: 'Breaking: Fed announces surprise rate cut',
        content: 'Federal Reserve cuts interest rates by 0.25% in unexpected move',
        source: 'CNBC',
        published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 heures ago
      },
      {
        // Item de données marché - récent
        id: '2',
        title: '[MARKET DATA] S&P 500 closes at new record high',
        content: 'S&P 500 gains 1.2% today on Fed announcement',
        source: 'Bloomberg',
        published_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() // 6 heures ago
      },
      {
        // Item promotionnel - devrait être bloqué
        id: '3',
        title: '50% OFF - Limited Time Stock Trading Course!',
        content: 'Get our premium trading course with 50% discount. Buy now!',
        source: 'TradingEducation',
        published_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 jour ago
      },
      {
        // Item calendar - devrait être bloqué
        id: '4',
        title: '[Eco Calendar] Fed Meeting - Dec 15, 2025',
        content: 'Economic calendar event: Federal Reserve monetary policy meeting',
        source: 'EconomicCalendar',
        published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 jours ago
      },
      {
        // Item ancien - devrait être bloqué
        id: '5',
        title: 'Bitcoin reaches $50,000 for first time',
        content: 'Historic milestone for cryptocurrency market',
        source: 'Reuters',
        published_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() // 15 jours ago
      },
      {
        // Item futur - devrait être bloqué
        id: '6',
        title: 'Earnings Report Q4 2025 - Coming Next Week',
        content: 'Company will release quarterly earnings next Wednesday',
        source: 'CompanyPress',
        published_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 heures dans le futur
      },
      {
        // Item générique court - devrait être bloqué
        id: '7',
        title: 'Hello world',
        content: 'Just testing',
        source: 'TestUser',
        published_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() // 12 heures ago
      },
      {
        // Item de recherche IA - plus ancien autorisé
        id: '8',
        title: 'New Research: GPT-4 model capabilities analysis',
        content: 'Comprehensive study on artificial intelligence model performance and capabilities',
        source: 'AI Research',
        published_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() // 6 jours ago
      }
    ];

    console.log(`📊 Test de ${testItems.length} items avec filtrage amélioré...`);

    const results = await ageFilter.filterBatch(testItems);

    console.log('\n📋 RÉSULTATS DÉTAILLÉS:');
    console.log('='.repeat(60));

    // Items gardés
    const keptItems = results.filter(r => r.shouldKeep);
    const rejectedItems = results.filter(r => !r.shouldKeep);

    console.log(`\n✅ Items gardés (${keptItems.length}):`);
    keptItems.forEach(result => {
      console.log(`   • ${result.category} (${result.age.toFixed(1)}j) - ${result.originalItem.title.substring(0, 50)}...`);
    });

    console.log(`\n❌ Items bloqués (${rejectedItems.length}):`);
    rejectedItems.forEach(result => {
      console.log(`   • ${result.reason} (${result.age.toFixed(1)}j) - ${result.originalItem.title.substring(0, 50)}...`);
    });

    // Test des statistiques
    console.log('\n📊 TEST STATISTIQUES:');
    const stats = await ageFilter.getAgeStatistics();
    console.log(`   Total items: ${stats.totalItems}`);
    console.log(`   Config max age: ${ageFilter.getConfig().maxAgeDays} days`);

    if (stats.ageDistribution && stats.ageDistribution.length > 0) {
      console.log('\n   Distribution par âge:');
      stats.ageDistribution.forEach(dist => {
        console.log(`     ${dist.age_range}: ${dist.count} items`);
      });
    }

    // Test de cleanup
    console.log('\n🗑️ TEST CLEANUP (dry run):');
    const cleanupResult = await ageFilter.cleanupOldItems(true);
    console.log(`   Items à supprimer: ${cleanupResult.details.length}`);
    if (cleanupResult.details.length > 0) {
      console.log('   Exemples:');
      cleanupResult.details.slice(0, 3).forEach(item => {
        console.log(`     • ${item.title} (${item.age}j old, ${item.source})`);
      });
    }

    // Test de mise à jour de configuration
    console.log('\n⚙️ TEST CONFIGURATION:');
    const oldConfig = ageFilter.getConfig();
    ageFilter.updateConfig({
      maxAgeDays: 3,
      strategies: {
        blockCalendarEvents: false  // Changer une stratégie
      }
    });

    const newConfig = ageFilter.getConfig();
    console.log(`   Max age days: ${oldConfig.maxAgeDays} → ${newConfig.maxAgeDays}`);
    console.log(`   Block calendar events: ${oldConfig.strategies.blockCalendarEvents} → ${newConfig.strategies.blockCalendarEvents}`);

    // Test avec nouvelle configuration
    console.log('\n🔄 TEST AVEC NOUVELLE CONFIG:');
    const newResults = await ageFilter.filterBatch([testItems[8]]); // Test l'item de recherche AI
    const newKept = newResults.filter(r => r.shouldKeep);
    const newRejected = newResults.filter(r => !r.shouldKeep);

    console.log(`   Recherche AI: ${newKept.length > 0 ? '✅ Gardé' : '❌ Bloqué'} (${newResults[0].reason})`);

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