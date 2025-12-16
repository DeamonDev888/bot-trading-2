#!/usr/bin/env node

/**
 * TEST COMPLET DU MODULE X SCRAPER
 * Test orchestrator XScraperService
 */

import { XScraperService } from './dist/x_scraper/XScraperService.js';

console.log('🧪 TEST MODULE X SCRAPER');
console.log('='.repeat(40));

async function testXScraperModule() {
  let service;
  try {
    console.log('🚀 Initialisation du service XScraper...');
    service = new XScraperService();
    console.log('✅ Service initialisé');

    // Test des fichiers OPML
    console.log('\n📁 Vérification fichiers OPML:');

    const iaExists = await service.opmlFileExists('./ia.opml');
    const financeExists = await service.opmlFileExists('./finance-x.opml');

    console.log(`   ia.opml: ${iaExists ? '✅' : '❌'}`);
    console.log(`   finance-x.opml: ${financeExists ? '✅' : '❌'}`);

    if (!iaExists && !financeExists) {
      console.log('❌ Aucun fichier OPML disponible');
      return false;
    }

    // Test avec le premier OPML disponible
    const testOpml = iaExists ? './ia.opml' : './finance-x.opml';
    const category = iaExists ? 'IA' : 'FINANCE';

    console.log(`\n🚀 Test scraping avec ${testOpml} (${category})...`);

    // Limiter à 2 feeds pour le test
    const result = await service.runScraping(testOpml, category, null, 2);

    console.log(`\n📊 Résultats:`);
    console.log(`   Succès: ${result.success}`);
    console.log(`   Feeds traités: ${result.processedFeeds}`);
    console.log(`   Items trouvés: ${result.items.length}`);
    console.log(`   Erreurs: ${result.errors.length}`);

    if (result.items.length > 0) {
      console.log('\n📝 Exemples d\'items:');
      result.items.slice(0, 3).forEach((item, i) => {
        console.log(`   ${i+1}. ${item.title?.substring(0, 60)}...`);
        console.log(`      Source: ${item.source}`);
        console.log(`      Catégorie: ${item.category}`);
        console.log(`      Sentiment: ${item.sentiment || 'non défini'}`);
        console.log(`      Contenu: ${item.content?.substring(0, 80)}...`);
        console.log('');
      });

      // Analyser la qualité
      const avgTitleLength = Math.round(result.items.reduce((sum, item) => sum + (item.title?.length || 0), 0) / result.items.length);
      const avgContentLength = Math.round(result.items.reduce((sum, item) => sum + (item.content?.length || 0), 0) / result.items.length);
      const withContent = result.items.filter(item => item.content && item.content.length > 20).length;

      console.log('📈 Qualité des items:');
      console.log(`   Titre moyen: ${avgTitleLength} caractères`);
      console.log(`   Contenu moyen: ${avgContentLength} caractères`);
      console.log(`   Avec contenu: ${withContent}/${result.items.length} (${Math.round(withContent/result.items.length*100)}%)`);
    }

    if (result.errors.length > 0) {
      console.log('\n⚠️ Erreurs:');
      result.errors.slice(0, 5).forEach(error => {
        console.log(`   • ${error}`);
      });
    }

    // Test de sauvegarde JSON
    if (result.items.length > 0) {
      console.log('\n💾 Test sauvegarde JSON...');
      try {
        await service.saveToJson(result.items, './test_xscraper_output.json');
        console.log('✅ JSON sauvegardé dans test_xscraper_output.json');
      } catch (saveError) {
        console.log(`❌ Erreur sauvegarde: ${saveError.message}`);
      }
    }

    await service.close();
    return result.success || result.items.length > 0;

  } catch (error) {
    console.error('❌ Erreur service:', error.message);
    console.error('Stack:', error.stack);

    if (service) {
      try {
        await service.close();
      } catch (closeError) {
        console.error('❌ Erreur fermeture service:', closeError.message);
      }
    }

    return false;
  }
}

// Exécuter le test
testXScraperModule()
  .then(success => {
    console.log('\n' + '='.repeat(40));
    console.log(`📊 TEST TERMINÉ: ${success ? 'SUCCÈS' : 'ÉCHEC'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });