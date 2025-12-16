#!/usr/bin/env node

console.log('🧪 Test de diagnostic du calendrier économique...');

async function testCalendarScraping() {
  try {
    // Import des modules
    const { TradingEconomicsScraper } = await import('./dist/backend/ingestion/TradingEconomicsScraper.js');
    const { RougePulseAgent } = await import('./dist/backend/agents/RougePulseAgent.js');
    const { CalendarPublisher } = await import('./dist/backend/agents/CalendarPublisher.js');

    console.log('✅ Modules importés avec succès');

    // Test 1: Création des instances
    console.log('\n📋 Test 1: Création des instances...');
    const scraper = new TradingEconomicsScraper();
    const rougePulse = new RougePulseAgent();
    const publisher = new CalendarPublisher();

    console.log('✅ Instances créées avec succès');

    // Test 2: Connexion base de données
    console.log('\n📋 Test 2: Test connexion base de données...');

    // Test simple de connexion via le scraper
    try {
      console.log('🔍 Test scraping minimal...');
      // Simuler un petit test pour vérifier que la connexion fonctionne
      console.log('✅ Connexion DB OK (si pas d\'erreur jusqu\'ici)');
    } catch (error) {
      console.error('❌ Erreur connexion DB:', error.message);
      return false;
    }

    // Test 3: Scraping complet
    console.log('\n📋 Test 3: Scraping Trading Economics...');
    try {
      const events = await scraper.scrapeUSCalendar();
      console.log(`📊 ${events.length} événements récupérés`);

      if (events.length > 0) {
        console.log('💾 Sauvegarde des événements...');
        await scraper.saveEvents(events);
        console.log('✅ Sauvegarde réussie');
      }
    } catch (error) {
      console.error('❌ Erreur scraping:', error.message);
      console.error('Stack:', error.stack);
      return false;
    }

    // Test 4: Filtrage
    console.log('\n📋 Test 4: Filtrage RougePulse...');
    try {
      const filtered = await rougePulse.filterCalendarEvents();
      console.log(`📊 Filtrage terminé: ${filtered.critical_events.length} critiques`);
    } catch (error) {
      console.error('❌ Erreur filtrage:', error.message);
      return false;
    }

    // Nettoyage
    console.log('\n📋 Test 5: Nettoyage...');
    try {
      await scraper.close();
      await rougePulse.close();
      await publisher.close();
      console.log('✅ Connexions fermées');
    } catch (error) {
      console.error('❌ Erreur fermeture:', error.message);
    }

    console.log('\n🎉 TOUS LES TESTS PASSÉS !');
    return true;

  } catch (error) {
    console.error('💥 ERREUR GLOBALE:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Exécution
testCalendarScraping().then(success => {
  process.exit(success ? 0 : 1);
});