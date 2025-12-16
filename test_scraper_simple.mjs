#!/usr/bin/env node

/**
 * TEST SIMPLE DU XNEWS SCRAPER
 * Test isolé sans dépendances externes
 */

import { XNewsScraper } from './src/x_scraper/XNewsScraper.js';

console.log('🧪 TEST SIMPLE - XNewsScraper');
console.log('='.repeat(40));

async function testScraper() {
  let scraper;
  try {
    console.log('🚀 Initialisation du scraper...');
    scraper = new XNewsScraper();
    await scraper.init();
    console.log('✅ Browser Playwright initialisé');

    // Test de scraping simple avec un feed connu
    console.log('📡 Test de scraping avec un feed OPML...');

    // Vérifier si ia.opml existe
    try {
      await import('fs/promises').then(fs => fs.access('ia.opml'));
      console.log('📁 Fichier ia.opml trouvé');
    } catch {
      console.log('❌ Fichier ia.opml non trouvé');
      await scraper.close();
      return false;
    }

    // Lancer le scraping avec 1 feed seulement
    const result = await scraper.scrapeFromOpml('ia.opml', null, 1);

    console.log(`📊 Résultat scraping:`);
    console.log(`   Succès: ${result.success}`);
    console.log(`   Feeds traités: ${result.processedFeeds}`);
    console.log(`   Items trouvés: ${result.items.length}`);
    console.log(`   Erreurs: ${result.errors.length}`);

    if (result.items.length > 0) {
      console.log('\n📝 Exemples d\'items:');
      result.items.slice(0, 3).forEach((item, i) => {
        console.log(`   ${i+1}. ${item.title?.substring(0, 60)}...`);
        console.log(`      Source: ${item.source}`);
        console.log(`      URL: ${item.url}`);
        console.log(`      Contenu: ${item.content?.substring(0, 100)}...`);
        console.log('');
      });
    }

    if (result.errors.length > 0) {
      console.log('⚠️ Erreurs:');
      result.errors.slice(0, 3).forEach(error => {
        console.log(`   • ${error}`);
      });
    }

    await scraper.close();
    return result.success;

  } catch (error) {
    console.error('❌ Erreur scraper:', error.message);
    console.error('Stack:', error.stack);

    if (scraper) {
      try {
        await scraper.close();
      } catch (closeError) {
        console.error('❌ Erreur fermeture scraper:', closeError.message);
      }
    }

    return false;
  }
}

// Exécuter le test
testScraper()
  .then(success => {
    console.log('\n' + '='.repeat(40));
    console.log(`📊 TEST TERMINÉ: ${success ? 'SUCCÈS' : 'ÉCHEC'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });