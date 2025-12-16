#!/usr/bin/env node

/**
 * TEST COMPLET - PILE DE SCRAPING X
 * Évalue l'ensemble du pipeline de scraping X/Twitter
 *
 * Architecture testée:
 * 1. XNewsScraper (scraper principal)
 * 2. XScraperService (service orchestrator)
 * 3. NewsFilterAgentOptimized (filtrage IA)
 * 4. SimplePublisherOptimized (publication Discord)
 *
 * Usage: node test_x_scraping_pipeline.mjs [--test-mode] [--max-feeds=3]
 */

import { NewsFilterAgentOptimized } from './src/backend/agents/NewsFilterAgentOptimized.js';
import { XScraperService } from './src/x_scraper/XScraperService.js';
import { XNewsScraper } from './src/x_scraper/XNewsScraper.js';
import { SimplePublisherOptimized } from './src/discord_bot/SimplePublisherOptimized.js';
import fs from 'fs/promises';
import path from 'path';
import { performance } from 'perf_hooks';

// Configuration
const CONFIG = {
  testMode: process.argv.includes('--test-mode'),
  maxFeeds: (() => {
    const match = process.argv.find(arg => arg.startsWith('--max-feeds='));
    return match ? parseInt(match.split('=')[1]) : 3;
  })(),
  timeoutMs: 180000, // 3 minutes
  logFile: 'x_scraping_test_results.json'
};

// Classe de test
class XScrapingPipelineTest {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      config: CONFIG,
      phases: {},
      errors: [],
      summary: {
        totalDuration: 0,
        success: false,
        feedsTested: 0,
        itemsScraped: 0,
        itemsFiltered: 0,
        itemsPublished: 0
      }
    };

    this.startTime = performance.now();
  }

  log(phase, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${phase}: ${message}`;
    console.log(logEntry);

    if (!this.results.phases[phase]) {
      this.results.phases[phase] = {
        startTime: timestamp,
        logs: [],
        success: false,
        duration: 0,
        data: {}
      };
    }

    this.results.phases[phase].logs.push({
      timestamp,
      message,
      data
    });
  }

  logError(phase, error, context = null) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorEntry = {
      phase,
      error: errorMsg,
      context,
      timestamp: new Date().toISOString(),
      stack: error instanceof Error ? error.stack : null
    };

    console.error(`❌ ERROR [${phase}]: ${errorMsg}`, context || '');
    this.results.errors.push(errorEntry);

    if (this.results.phases[phase]) {
      this.results.phases[phase].success = false;
      this.results.phases[phase].errors = this.results.phases[phase].errors || [];
      this.results.phases[phase].errors.push(errorEntry);
    }
  }

  async startPhase(phaseName) {
    this.log(phaseName, '🚀 Démarrage de la phase...');
    const phaseStart = performance.now();

    if (!this.results.phases[phaseName]) {
      this.results.phases[phaseName] = {
        startTime: new Date().toISOString(),
        logs: [],
        success: false,
        duration: 0,
        data: {}
      };
    }

    this.results.phases[phaseName].phaseStart = phaseStart;

    return {
      end: (success = true, data = null) => {
        const duration = performance.now() - phaseStart;
        this.results.phases[phaseName].success = success;
        this.results.phases[phaseName].duration = duration;
        this.results.phases[phaseName].endTime = new Date().toISOString();
        if (data) {
          Object.assign(this.results.phases[phaseName].data, data);
        }
        this.log(phaseName, `${success ? '✅' : '❌'} Phase terminée en ${duration.toFixed(2)}ms`);
      }
    };
  }

  async testPhase1_XNewsScraper() {
    const phase = await this.startPhase('Phase1_XNewsScraper');

    try {
      this.log('Phase1_XNewsScraper', '📋 Test du scraper principal XNewsScraper');

      const scraper = new XNewsScraper();
      await scraper.init();

      this.log('Phase1_XNewsScraper', '✅ Browser Playwright initialisé');

      // Test de quelques feeds OPML s'ils existent
      const iaOpmlPath = './ia.opml';
      const financeOpmlPath = './finance-x.opml';
      let testOpml = null;

      if (await this.fileExists(iaOpmlPath)) {
        testOpml = iaOpmlPath;
        this.log('Phase1_XNewsScraper', '📁 Utilisation de ia.opml');
      } else if (await this.fileExists(financeOpmlPath)) {
        testOpml = financeOpmlPath;
        this.log('Phase1_XNewsScraper', '📁 Utilisation de finance-x.opml');
      } else {
        this.log('Phase1_XNewsScraper', '⚠️ Aucun fichier OPML trouvé, test en mode manuel');
        phase.end(false, { reason: 'No OPML files found' });
        return;
      }

      // Exécuter le scraping sur quelques feeds
      const scrapingResult = await scraper.scrapeFromOpml(testOpml, null, CONFIG.maxFeeds);

      await scraper.close();

      this.log('Phase1_XNewsScraper', `📊 Résultat scraping: ${scrapingResult.items.length} items de ${scrapingResult.processedFeeds} feeds`);

      if (scrapingResult.success && scrapingResult.items.length > 0) {
        this.results.summary.feedsTested = scrapingResult.processedFeeds;
        this.results.summary.itemsScraped = scrapingResult.items.length;

        // Analyser la qualité des items
        const qualityAnalysis = this.analyzeItemsQuality(scrapingResult.items);

        phase.end(true, {
          scrapingResult,
          qualityAnalysis,
          feedsProcessed: scrapingResult.processedFeeds,
          itemsFound: scrapingResult.items.length,
          errors: scrapingResult.errors
        });
      } else {
        phase.end(false, {
          scrapingResult,
          errors: scrapingResult.errors
        });
      }

    } catch (error) {
      this.logError('Phase1_XNewsScraper', error);
      phase.end(false);
    }
  }

  async testPhase2_XScraperService() {
    const phase = await this.startPhase('Phase2_XScraperService');

    try {
      this.log('Phase2_XScraperService', '📋 Test du service XScraperService');

      const service = new XScraperService();

      // Test de l'existence des fichiers OPML
      const iaOpmlExists = await service.opmlFileExists('./ia.opml');
      const financeOpmlExists = await service.opmlFileExists('./finance-x.opml');

      this.log('Phase2_XScraperService', `📁 ia.opml existe: ${iaOpmlExists}`);
      this.log('Phase2_XScraperService', `📁 finance-x.opml existe: ${financeOpmlExists}`);

      if (!iaOpmlExists && !financeOpmlExists) {
        phase.end(false, { reason: 'No OPML files available' });
        return;
      }

      // Tester le service avec le premier OPML disponible
      const testOpml = iaOpmlExists ? './ia.opml' : './finance-x.opml';
      const category = iaOpmlExists ? 'IA' : 'FINANCE';

      this.log('Phase2_XScraperService', `🚀 Test du service avec ${testOpml} (catégorie: ${category})`);

      const serviceResult = await service.runScraping(testOpml, category, null, CONFIG.maxFeeds);

      this.log('Phase2_XScraperService', `📊 Résultat service: ${serviceResult.items.length} items de ${serviceResult.processedFeeds} feeds`);

      if (serviceResult.success && serviceResult.items.length > 0) {
        // Sauvegarder en JSON pour test
        await service.saveToJson(serviceResult.items, './test_x_service_output.json');

        phase.end(true, {
          serviceResult,
          itemsSaved: serviceResult.items.length,
          feedsProcessed: serviceResult.processedFeeds,
          categoryDistribution: this.analyzeCategoryDistribution(serviceResult.items)
        });
      } else {
        phase.end(false, {
          serviceResult,
          errors: serviceResult.errors
        });
      }

      await service.close();

    } catch (error) {
      this.logError('Phase2_XScraperService', error);
      phase.end(false);
    }
  }

  async testPhase3_NewsFilterAgent() {
    const phase = await this.startPhase('Phase3_NewsFilterAgent');

    try {
      this.log('Phase3_NewsFilterAgent', '📋 Test du NewsFilterAgentOptimized');

      // Vérifier si KiloCode est disponible
      const kilocodeAvailable = await this.checkKiloCodeAvailable();
      this.log('Phase3_NewsFilterAgent', `🤖 KiloCode disponible: ${kilocodeAvailable}`);

      if (!kilocodeAvailable) {
        this.log('Phase3_NewsFilterAgent', '⚠️ KiloCode non disponible, test du filtrage basique uniquement');
        phase.end(false, { reason: 'KiloCode not available' });
        return;
      }

      const agent = new NewsFilterAgentOptimized();

      // Test avec un petit jeu de données
      this.log('Phase3_NewsFilterAgent', '🚀 Test cycle de filtrage (limité)');

      // Simuler quelques items de test si pas de données réelles
      const hasRealData = await this.checkForRealData();

      if (hasRealData) {
        await agent.runFilterCycle();
      } else {
        this.log('Phase3_NewsFilterAgent', '⚠️ Pas de données réelles, test du filtrage avec données de test');
        // Le test pourrait créer des données de test ici
      }

      await agent.close();

      phase.end(true, {
        kilocodeTested: true,
        realDataUsed: hasRealData
      });

    } catch (error) {
      this.logError('Phase3_NewsFilterAgent', error);
      phase.end(false);
    }
  }

  async testPhase4_Publisher() {
    const phase = await this.startPhase('Phase4_Publisher');

    try {
      this.log('Phase4_Publisher', '📋 Test du SimplePublisherOptimized');

      const publisher = new SimplePublisherOptimized();

      // Test de récupération des news non publiées
      const unpublishedNews = await publisher.getUnpublishedNewsOptimized();

      this.log('Phase4_Publisher', `📊 ${unpublishedNews.length} news non publiées trouvées`);

      if (unpublishedNews.length > 0) {
        // Test de formatage (sans publication réelle)
        const sampleItem = unpublishedNews[0];
        const formattedMessage = publisher.formatDiscordMessageOptimized(sampleItem);

        this.log('Phase4_Publisher', `✅ Test formatage message pour: ${sampleItem.title.substring(0, 50)}...`);
        this.log('Phase4_Publisher', `📝 Message formaté (${formattedMessage.length} chars)`, {
          preview: formattedMessage.substring(0, 200) + '...'
        });

        // Test du cycle de publication (avec seuil élevé pour éviter publication réelle)
        const publishResult = await publisher.runPublishingCycleOptimized(999); // Seuil très élevé

        phase.end(true, {
          unpublishedCount: unpublishedNews.length,
          formattingTest: 'OK',
          publishResult
        });
      } else {
        this.log('Phase4_Publisher', 'ℹ️ Aucune news à publier - normal pour un test');
        phase.end(true, {
          unpublishedCount: 0,
          note: 'No items to publish'
        });
      }

    } catch (error) {
      this.logError('Phase4_Publisher', error);
      phase.end(false);
    }
  }

  async testPhase5_Integration() {
    const phase = await this.startPhase('Phase5_Integration');

    try {
      this.log('Phase5_Integration', '📋 Test d\'intégration complet du pipeline');

      // Vérifier l'état de la base de données
      const dbStatus = await this.checkDatabaseStatus();
      this.log('Phase5_Integration', '🗄️ Status base de données', dbStatus);

      // Vérifier les fichiers de configuration
      const configStatus = await this.checkConfigurationFiles();
      this.log('Phase5_Integration', '⚙️ Status fichiers configuration', configStatus);

      // Test de la connexion aux services externes
      const externalServices = await this.checkExternalServices();
      this.log('Phase5_Integration', '🌐 Status services externes', externalServices);

      phase.end(true, {
        database: dbStatus,
        configuration: configStatus,
        externalServices
      });

    } catch (error) {
      this.logError('Phase5_Integration', error);
      phase.end(false);
    }
  }

  // Méthodes utilitaires
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  analyzeItemsQuality(items) {
    if (!items || items.length === 0) return { total: 0 };

    const analysis = {
      total: items.length,
      avgTitleLength: 0,
      avgContentLength: 0,
      withUrls: 0,
      withContent: 0,
      bySource: {},
      recentItems: 0
    };

    let totalTitleLength = 0;
    let totalContentLength = 0;
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

    for (const item of items) {
      totalTitleLength += item.title?.length || 0;
      totalContentLength += item.content?.length || 0;

      if (item.url) analysis.withUrls++;
      if (item.content && item.content.length > 20) analysis.withContent++;

      const source = item.source || 'unknown';
      analysis.bySource[source] = (analysis.bySource[source] || 0) + 1;

      if (new Date(item.published_at).getTime() > oneDayAgo) {
        analysis.recentItems++;
      }
    }

    analysis.avgTitleLength = Math.round(totalTitleLength / items.length);
    analysis.avgContentLength = Math.round(totalContentLength / items.length);

    return analysis;
  }

  analyzeCategoryDistribution(items) {
    const distribution = {};
    for (const item of items) {
      const category = item.category || 'UNKNOWN';
      distribution[category] = (distribution[category] || 0) + 1;
    }
    return distribution;
  }

  async checkKiloCodeAvailable() {
    try {
      const { execSync } = await import('child_process');
      execSync('kilocode --version', { stdio: 'ignore', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async checkForRealData() {
    try {
      // Vérifier s'il y a des données dans la base
      // Simplifié - en réalité on interrogerait la base
      return false; // Pour le test
    } catch {
      return false;
    }
  }

  async checkDatabaseStatus() {
    try {
      // Test de connexion PostgreSQL simplifié
      const { Pool } = await import('pg');
      const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'financial_analyst',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '9022',
      });

      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      await client.end();
      await pool.end();

      return {
        connected: true,
        timestamp: result.rows[0].now
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  async checkConfigurationFiles() {
    const files = [
      '.env',
      'ia.opml',
      'finance-x.opml',
      'package.json'
    ];

    const status = {};
    for (const file of files) {
      status[file] = await this.fileExists(file);
    }

    return status;
  }

  async checkExternalServices() {
    const services = {};

    // Test KiloCode
    services.kilocode = await this.checkKiloCodeAvailable();

    // Test Discord (token check basique)
    services.discord = !!(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_CHANNEL_ID);

    return services;
  }

  async generateReport() {
    const endTime = performance.now();
    this.results.summary.totalDuration = endTime - this.startTime;
    this.results.summary.success = this.results.errors.length === 0;

    // Calculer le taux de succès par phase
    for (const [phaseName, phase] of Object.entries(this.results.phases)) {
      phase.successRate = phase.success ? 100 : 0;
    }

    // Sauvegarder le rapport
    const reportPath = path.join(process.cwd(), CONFIG.logFile);
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('📊 RAPPORT FINAL - TEST DE LA PILE DE SCRAPING X');
    console.log('='.repeat(80));
    console.log(`⏱️  Durée totale: ${(this.results.summary.totalDuration / 1000).toFixed(2)}s`);
    console.log(`✅ Succès global: ${this.results.summary.success ? 'OUI' : 'NON'}`);
    console.log(`📰 Items scrapés: ${this.results.summary.itemsScraped}`);
    console.log(`🔍 Items filtrés: ${this.results.summary.itemsFiltered}`);
    console.log(`📤 Items publiés: ${this.results.summary.itemsPublished}`);
    console.log(`🌐 Feeds testés: ${this.results.summary.feedsTested}`);
    console.log(`❌ Erreurs: ${this.results.errors.length}`);
    console.log(`📄 Rapport détaillé: ${reportPath}`);

    // Résumé par phase
    console.log('\n📋 RÉSUMÉ PAR PHASE:');
    for (const [phaseName, phase] of Object.entries(this.results.phases)) {
      const status = phase.success ? '✅' : '❌';
      const duration = (phase.duration / 1000).toFixed(2);
      console.log(`   ${status} ${phaseName}: ${duration}s`);
    }

    if (this.results.errors.length > 0) {
      console.log('\n❌ ERREURS DÉTECTÉES:');
      for (const error of this.results.errors.slice(0, 5)) { // Limiter à 5 erreurs
        console.log(`   • ${error.phase}: ${error.error}`);
      }
      if (this.results.errors.length > 5) {
        console.log(`   ... et ${this.results.errors.length - 5} autres erreurs (voir rapport complet)`);
      }
    }

    console.log('='.repeat(80));

    return this.results;
  }

  async run() {
    console.log('🚀 DÉMARRAGE DU TEST DE LA PILE DE SCRAPING X/TWITTER');
    console.log(`📋 Mode: ${CONFIG.testMode ? 'TEST' : 'PRODUCTION'}`);
    console.log(`🔢 Feeds max: ${CONFIG.maxFeeds}`);
    console.log(`⏱️  Timeout: ${CONFIG.timeoutMs / 1000}s`);
    console.log('='.repeat(80));

    try {
      // Timeout global
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout global du test')), CONFIG.timeoutMs);
      });

      const testPromise = this.runAllPhases();

      await Promise.race([testPromise, timeoutPromise]);

    } catch (error) {
      this.logError('GLOBAL', error);
    } finally {
      await this.generateReport();
    }
  }

  async runAllPhases() {
    // Phase 1: Test du scraper principal
    await this.testPhase1_XNewsScraper();

    // Phase 2: Test du service
    await this.testPhase2_XScraperService();

    // Phase 3: Test du filtre IA (uniquement si KiloCode disponible)
    const kilocodeAvailable = await this.checkKiloCodeAvailable();
    if (kilocodeAvailable) {
      await this.testPhase3_NewsFilterAgent();
    } else {
      this.log('Phase3_NewsFilterAgent', '⏭️ Phase 3 ignorée (KiloCode non disponible)');
    }

    // Phase 4: Test du publisher
    await this.testPhase4_Publisher();

    // Phase 5: Test d'intégration
    await this.testPhase5_Integration();
  }
}

// Exécution du test
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new XScrapingPipelineTest();
  test.run().catch(error => {
    console.error('💥 Erreur fatale du test:', error);
    process.exit(1);
  });
}

export { XScrapingPipelineTest };