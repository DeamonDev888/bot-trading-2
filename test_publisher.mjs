#!/usr/bin/env node

/**
 * TEST DU SIMPLEPUBLISHEROPTIMIZED
 * Test du publisher Discord
 */

import { SimplePublisherOptimized } from './dist/discord_bot/SimplePublisherOptimized.js';

console.log('🧪 TEST SimplePublisherOptimized');
console.log('='.repeat(40));

async function testPublisher() {
  try {
    console.log('🚀 Initialisation du publisher...');
    const publisher = new SimplePublisherOptimized();
    console.log('✅ Publisher initialisé');

    // Test de récupération des news
    console.log('📊 Test récupération des news non publiées...');
    const news = await publisher.getUnpublishedNewsOptimized();

    console.log(`📰 ${news.length} news non publiées trouvées`);

    if (news.length > 0) {
      // Test de formatage avec quelques exemples
      console.log('\n📝 Test formatage messages:');
      const samples = news.slice(0, 3);

      for (let i = 0; i < samples.length; i++) {
        const item = samples[i];
        const formatted = publisher.formatDiscordMessageOptimized(item);

        console.log(`\n${i + 1}. ${item.title?.substring(0, 50)}...`);
        console.log(`   Source: ${item.source}`);
        console.log(`   Score: ${item.relevance_score}/10`);
        console.log(`   Message: ${formatted.length} caractères`);

        if (i === 0) {
          console.log('   Preview:');
          const preview = formatted.substring(0, 200) + (formatted.length > 200 ? '...' : '');
          console.log(`   ${preview}`);
        }
      }

      // Test du cycle de publication (avec seuil élevé pour éviter publication réelle)
      console.log('\n🔄 Test cycle de publication (seuil: 999)...');
      const result = await publisher.runPublishingCycleOptimized(999);

      console.log(`📊 Résultat publication:`);
      console.log(`   Succès: ${result.success}`);
      console.log(`   Publiés: ${result.published}`);
      console.log(`   Ignorés: ${result.skipped}`);
      if (result.errors && result.errors.length > 0) {
        console.log(`   Erreurs: ${result.errors.length}`);
        result.errors.slice(0, 3).forEach(error => {
          console.log(`     • ${error}`);
        });
      }

    } else {
      console.log('ℹ️ Aucune news à publier (normal si pas de scraping récent)');
    }

    // Test du dashboard de monitoring
    console.log('\n📊 Test dashboard de monitoring...');
    publisher.printMonitoringDashboard();

    console.log('\n✅ Tests publisher terminés avec succès');
    return true;

  } catch (error) {
    console.error('❌ Erreur publisher:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Exécuter le test
testPublisher()
  .then(success => {
    console.log('\n' + '='.repeat(40));
    console.log(`📊 TEST TERMINÉ: ${success ? 'SUCCÈS' : 'ÉCHEC'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });