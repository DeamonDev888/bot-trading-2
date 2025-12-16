#!/usr/bin/env node

/**
 * Wrapper robuste pour l'exécution du pipeline calendrier via cron
 * Gère les erreurs, timeout, et logging détaillé
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  timeout: 300000, // 5 minutes
  logFile: path.join(process.cwd(), 'calendar-pipeline.log'),
  maxLogSize: 10 * 1024 * 1024, // 10MB
  retries: 3,
  retryDelay: 5000
};

// Logger avec rotation
function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;

  try {
    fs.appendFileSync(CONFIG.logFile, logEntry);
    console.log(message);

    // Vérifier la taille du fichier et faire rotation si nécessaire
    const stats = fs.statSync(CONFIG.logFile);
    if (stats.size > CONFIG.maxLogSize) {
      const backupFile = CONFIG.logFile + '.old';
      fs.renameSync(CONFIG.logFile, backupFile);
    }
  } catch (error) {
    console.error('Erreur logging:', error.message);
  }
}

// Fonction principale avec retry
async function runCalendarPipelineWithRetry(retryCount = 0) {
  logToFile(`🔄 DÉMARRAGE PIPELINE (tentative ${retryCount + 1}/${CONFIG.retries})`);

  try {
    // Importer les modules dynamiquement
    const { TradingEconomicsScraper } = await import('./dist/backend/ingestion/TradingEconomicsScraper.js');
    const { RougePulseAgent } = await import('./dist/backend/agents/RougePulseAgent.js');
    const { CalendarPublisher } = await import('./dist/backend/agents/CalendarPublisher.js');

    // Créer les instances
    const scraper = new TradingEconomicsScraper();
    const rougePulse = new RougePulseAgent();
    const publisher = new CalendarPublisher();

    logToFile('✅ Instances créées, démarrage du pipeline...');

    // Étape 1: Scraping
    logToFile('📅 [1/3] Scraping Trading Economics...');
    const events = await scraper.scrapeUSCalendar();
    logToFile(`📊 ${events.length} événements récupérés`);

    if (events.length > 0) {
      await scraper.saveEvents(events);
      logToFile('💾 Événements sauvegardés en base');
    } else {
      logToFile('⚠️ Aucun événement trouvé');
    }

    // Pause entre étapes
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Étape 2: Filtrage
    logToFile('🔍 [2/3] Filtrage RougePulse...');
    const filtered = await rougePulse.filterCalendarEvents();
    logToFile(`📊 ${filtered.critical_events.length} critiques, ${filtered.high_impact_events.length} forts`);

    // Pause entre étapes
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Étape 3: Publication avec les données filtrées
    logToFile('📢 [3/3] Publication avec données filtrées...');

    // Passer les événements filtrés au publisher
    let result;
    if (filtered.critical_events.length > 0 || filtered.high_impact_events.length > 0) {
      // Utiliser les données filtrées par RougePulse
      result = await publisher.publishFilteredCalendar(filtered);
      logToFile(`✅ Publication avec données filtrées: ${filtered.critical_events.length + filtered.high_impact_events.length} événements`);
    } else {
      // Publication standard avec tous les événements de la base
      result = await publisher.publishDailyCalendar();
      logToFile(`📅 Publication standard: ${result.published_events || 0} événements`);
    }

    if (result.success) {
      logToFile(`✅ Publication réussie: ${result.published_events || 0} messages`);
    } else {
      logToFile(`❌ Publication échouée: ${result.error}`);
    }

    // Vérification alertes critiques
    try {
      const alertResult = await publisher.publishCriticalAlerts();
      logToFile(`🚨 Alertes critiques: ${alertResult.published_events || 0}`);
    } catch (error) {
      logToFile(`⚠️ Erreur alertes critiques: ${error.message}`);
    }

    // Nettoyage
    logToFile('🧹 Nettoyage des connexions...');
    await scraper.close();
    await rougePulse.close();
    await publisher.close();

    logToFile('🎉 PIPELINE TERMINÉ AVEC SUCCÈS');
    return true;

  } catch (error) {
    logToFile(`❌ ERREUR PIPELINE: ${error.message}`);
    logToFile(`Stack: ${error.stack}`);

    // Retry logic
    if (retryCount < CONFIG.retries - 1) {
      logToFile(`🔄 Nouvelle tentative dans ${CONFIG.retryDelay/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
      return runCalendarPipelineWithRetry(retryCount + 1);
    } else {
      logToFile(`💥 ÉCHEC APRÈS ${CONFIG.retries} tentatives`);
      return false;
    }
  }
}

// Gestion du timeout
async function runWithTimeout() {
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout du pipeline (5 minutes)'));
    }, CONFIG.timeout);

    try {
      const result = await runCalendarPipelineWithRetry();
      clearTimeout(timeout);
      resolve(result);
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

// Démarrage principal
async function main() {
  logToFile('='.repeat(50));
  logToFile('🚀 LANCEMENT DU PIPELINE CALENDRIER AUTOMATISÉ');
  logToFile(`⏰ Heure: ${new Date().toLocaleString('fr-FR')}`);
  logToFile('='.repeat(50));

  try {
    const success = await runWithTimeout();

    if (success) {
      logToFile('✅ Pipeline terminé avec succès');
      process.exit(0);
    } else {
      logToFile('❌ Pipeline terminé avec des erreurs');
      process.exit(1);
    }
  } catch (error) {
    logToFile(`💥 ERREUR FATALE: ${error.message}`);
    process.exit(1);
  }
}

// Gestion des signaux pour arrêt propre
process.on('SIGTERM', () => {
  logToFile('🛑 Signal SIGTERM reçu, arrêt...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logToFile('🛑 Signal SIGINT reçu, arrêt...');
  process.exit(0);
});

// Démarrage
main();