#!/usr/bin/env node

console.log('🔍 DEBUG PIPELINE CALENDRIER -', new Date().toISOString());

// Activer les logs détaillés
process.env.DEBUG = 'calendar_pipeline';

async function debugCalendarPipeline() {
    let scraper = null;
    let rougePulse = null;
    let publisher = null;

    try {
        console.log('\n📦 [1/5] Importation des modules...');

        // Import des modules
        const { TradingEconomicsScraper } = await import('./dist/backend/ingestion/TradingEconomicsScraper.js');
        const { RougePulseAgent } = await import('./dist/backend/agents/RougePulseAgent.js');
        const { CalendarPublisher } = await import('./dist/backend/agents/CalendarPublisher.js');

        console.log('✅ Modules importés avec succès');

        console.log('\n🏗️ [2/5] Initialisation des instances...');

        scraper = new TradingEconomicsScraper();
        rougePulse = new RougePulseAgent();
        publisher = new CalendarPublisher();

        console.log('✅ Instances initialisées');

        console.log('\n🌐 [3/5] Test scraping Trading Economics...');

        const events = await scraper.scrapeUSCalendar();
        console.log(`📊 Récupéré: ${events.length} événements`);

        if (events.length > 0) {
            console.log('💾 Sauvegarde en base de données...');
            await scraper.saveEvents(events);
            console.log('✅ Sauvegarde terminée');
        } else {
            console.warn('⚠️ Aucun événement trouvé');
        }

        console.log('\n🔍 [4/5] Test filtrage RougePulse...');

        const filtered = await rougePulse.filterCalendarEvents();
        console.log(`📊 Filtré: ${filtered.critical_events.length} critiques, ${filtered.high_impact_events.length} forts`);
        console.log(`📊 Score volatilité: ${filtered.volatility_score}/10`);

        console.log('\n📢 [5/5] Test publication...');

        const publishResult = await publisher.publishDailyCalendar();
        if (publishResult.success) {
            console.log('✅ Publication réussie');
        } else {
            console.warn('⚠️ Publication échouée:', publishResult.error);
        }

        console.log('\n🎉 PIPELINE TERMINÉ AVEC SUCCÈS !');
        return true;

    } catch (error) {
        console.error('\n💥 ERREUR PIPELINE:');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        console.error('Type:', error.constructor.name);

        return false;
    } finally {
        // Nettoyage
        console.log('\n🧹 Nettoyage...');

        try {
            if (scraper) await scraper.close();
            if (rougePulse) await rougePulse.close();
            if (publisher) await publisher.close();
            console.log('✅ Nettoyage terminé');
        } catch (cleanupError) {
            console.warn('⚠️ Erreur nettoyage:', cleanupError.message);
        }
    }
}

// Démarrage avec timeout de 5 minutes
debugCalendarPipeline().then(success => {
    console.log(`\n🏁 RÉSULTAT FINAL: ${success ? 'SUCCÈS' : 'ÉCHEC'}`);
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
});

// Timeout global
setTimeout(() => {
    console.error('⏰ TIMEOUT 5 MINUTES - PIPELINE TROP LONG');
    process.exit(1);
}, 300000);