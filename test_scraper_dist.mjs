#!/usr/bin/env node

/**
 * TEST DU XNEWS SCRAPER (version compilée)
 */

import { XNewsScraper } from './dist/x_scraper/XNewsScraper.js';

console.log('🧪 TEST XNewsScraper (compilé)');
console.log('='.repeat(40));

async function testScraper() {
  let scraper;
  try {
    console.log('🚀 Initialisation du scraper...');
    scraper = new XNewsScraper();
    await scraper.init();
    console.log('✅ Browser Playwright initialisé');

    // Test de scraping simple
    console.log('📡 Test de scraping...');

    // Créer un feed de test manuellement pour éviter les problèmes OPML
    const testFeed = {
      title: 'Test Feed',
      xmlUrl: 'https://nitter.net/elonmusk/rss',
      htmlUrl: 'https://nitter.net/elonmusk'
    };

    console.log('📋 Test avec feed manuel...');

    // Test avec un scrape simple
    const result = await scraper.scrapeFeed(testFeed);

    console.log(`📊 Résultat:`);
    console.log(`   Items trouvés: ${result.length}`);

    if (result.length > 0) {
      console.log('\n📝 Premier item:');
      const item = result[0];
      console.log(`   Titre: ${item.title?.substring(0, 100)}...`);
      console.log(`   Source: ${item.source}`);
      console.log(`   URL: ${item.url}`);
      console.log(`   Date: ${item.published_at}`);
      console.log(`   Contenu: ${item.content?.substring(0, 150)}...`);
    }

    await scraper.close();
    return result.length > 0;

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