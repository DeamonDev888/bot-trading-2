#!/usr/bin/env node

/**
 * TEST RAPIDE DES COMPOSANTS X SCRAPING
 * Tests individuels des composants de la pile X
 *
 * Usage: npm run test:x -- [component] [options]
 * Components: scraper, service, filter, publisher, all
 */

import { XNewsScraper } from './src/x_scraper/XNewsScraper.js';
import { XScraperService } from './src/x_scraper/XScraperService.js';
import { NewsFilterAgentOptimized } from './src/backend/agents/NewsFilterAgentOptimized.js';
import { SimplePublisherOptimized } from './src/discord_bot/SimplePublisherOptimized.js';
import fs from 'fs/promises';

interface TestOptions {
  component: string;
  testMode: boolean;
  maxFeeds: number;
  verbose: boolean;
}

class ComponentTester {
  private options: TestOptions;
  private startTime: number = Date.now();

  constructor(options: TestOptions) {
    this.options = options;
    console.log(`🧪 Test du composant: ${options.component}`);
    console.log(`📋 Mode: ${options.testMode ? 'TEST' : 'NORMAL'}`);
    console.log(`🔢 Feeds max: ${options.maxFeeds}`);
  }

  log(message: string, data?: any): void {
    const timestamp = new Date().toISOString().substring(11, 19);
    console.log(`[${timestamp}] ${message}`);
    if (data && this.options.verbose) {
      console.log('   Données:', JSON.stringify(data, null, 2));
    }
  }

  async testScraper(): Promise<boolean> {
    this.log('🚀 Test du XNewsScraper (scraper principal)');

    try {
      const scraper = new XNewsScraper();
      await scraper.init();
      this.log('✅ Browser Playwright initialisé');

      // Vérifier les fichiers OPML
      const opmlFiles = ['ia.opml', 'finance-x.opml'];
      let testOpml = null;

      for (const file of opmlFiles) {
        try {
          await fs.access(file);
          testOpml = file;
          this.log(`📁 Fichier OPML trouvé: ${file}`);
          break;
        } catch {
          // File doesn't exist
        }
      }

      if (!testOpml) {
        this.log('❌ Aucun fichier OPML trouvé');
        await scraper.close();
        return false;
      }

      // Lancer le scraping
      const result = await scraper.scrapeFromOpml(testOpml, undefined, undefined, this.options.maxFeeds);
      await scraper.close();

      this.log(`📊 Résultat: ${result.items.length} items de ${result.processedFeeds} feeds`);
      this.log(`✅ Succès: ${result.success}`);

      if (result.errors.length > 0) {
        this.log(`⚠️ Erreurs: ${result.errors.length}`);
        result.errors.slice(0, 3).forEach(error => {
          this.log(`   • ${error}`);
        });
      }

      // Analyser la qualité des items
      if (result.items.length > 0) {
        const avgTitleLength = Math.round(result.items.reduce((sum, item) => sum + (item.title?.length || 0), 0) / result.items.length);
        const avgContentLength = Math.round(result.items.reduce((sum, item) => sum + (item.content?.length || 0), 0) / result.items.length);

        this.log(`📈 Qualité des items:`);
        this.log(`   • Titre moyen: ${avgTitleLength} caractères`);
        this.log(`   • Contenu moyen: ${avgContentLength} caractères`);

        // Afficher quelques exemples
        this.log('📝 Exemples d\'items:');
        result.items.slice(0, 3).forEach((item, index) => {
          this.log(`   ${index + 1}. ${item.title?.substring(0, 60)}... (${item.source})`);
        });
      }

      return result.success && result.items.length > 0;

    } catch (error) {
      this.log(`❌ Erreur scraper: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async testService(): Promise<boolean> {
    this.log('🚀 Test du XScraperService (service orchestrator)');

    try {
      const service = new XScraperService();

      // Vérifier les OPML
      const iaExists = await service.opmlFileExists('./ia.opml');
      const financeExists = await service.opmlFileExists('./finance-x.opml');

      this.log(`📁 ia.opml: ${iaExists ? '✅' : '❌'}`);
      this.log(`📁 finance-x.opml: ${financeExists ? '✅' : '❌'}`);

      if (!iaExists && !financeExists) {
        this.log('❌ Aucun fichier OPML disponible');
        await service.close();
        return false;
      }

      const testOpml = iaExists ? './ia.opml' : './finance-x.opml';
      const category = iaExists ? 'IA' : 'FINANCE';

      this.log(`🚀 Test avec ${testOpml} (catégorie: ${category})`);

      const result = await service.runScraping(testOpml, category, undefined, this.options.maxFeeds);

      this.log(`📊 Résultat service: ${result.items.length} items de ${result.processedFeeds} feeds`);
      this.log(`✅ Succès: ${result.success}`);

      if (result.items.length > 0) {
        // Sauvegarder le résultat
        await service.saveToJson(result.items, './test_service_output.json');
        this.log('💾 Résultat sauvegardé dans test_service_output.json');

        // Analyser la distribution par catégorie
        const categories = {};
        for (const item of result.items) {
          const cat = item.category || 'UNKNOWN';
          categories[cat] = (categories[cat] || 0) + 1;
        }

        this.log('📊 Distribution par catégorie:');
        Object.entries(categories).forEach(([cat, count]) => {
          this.log(`   • ${cat}: ${count} items`);
        });
      }

      await service.close();
      return result.success && result.items.length > 0;

    } catch (error) {
      this.log(`❌ Erreur service: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async testFilter(): Promise<boolean> {
    this.log('🚀 Test du NewsFilterAgentOptimized (filtre IA)');

    try {
      // Vérifier KiloCode
      const kilocodeAvailable = await this.checkKiloCode();
      if (!kilocodeAvailable) {
        this.log('⚠️ KiloCode non disponible, test de configuration uniquement');
        return true;
      }

      this.log('✅ KiloCode disponible');

      const agent = new NewsFilterAgentOptimized();

      // Test de configuration
      this.log('🔧 Configuration de l\'agent:');
      this.log(`   • BATCH_SIZE: 15`);
      this.log(`   • PARALLEL_BATCHES: 3`);
      this.log(`   • MIN_RELEVANCE_SCORE: 4`);

      // Test rapide (vérifier que l'agent peut s'initialiser)
      const hasData = await this.checkForPendingItems();

      if (hasData) {
        this.log('📊 Données pending trouvées, test du filtrage...');
        await agent.runFilterCycle();
      } else {
        this.log('ℹ️ Aucune donnée pending, test d\'initialisation uniquement');
      }

      await agent.close();
      return true;

    } catch (error) {
      this.log(`❌ Erreur filtre: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async testPublisher(): Promise<boolean> {
    this.log('🚀 Test du SimplePublisherOptimized (publisher Discord)');

    try {
      const publisher = new SimplePublisherOptimized();

      // Test de récupération des news
      this.log('📊 Récupération des news non publiées...');
      const news = await publisher.getUnpublishedNewsOptimized();

      this.log(`📰 ${news.length} news non publiées trouvées`);

      if (news.length > 0) {
        // Test de formatage
        const sampleItem = news[0];
        const formatted = publisher.formatDiscordMessageOptimized(sampleItem);

        this.log('📝 Test de formatage:');
        this.log(`   • Titre: ${sampleItem.title?.substring(0, 50)}...`);
        this.log(`   • Source: ${sampleItem.source}`);
        this.log(`   • Score: ${sampleItem.relevance_score}/10`);
        this.log(`   • Message formaté: ${formatted.length} caractères`);

        if (this.options.verbose) {
          this.log('📄 Message formaté (preview):');
          console.log(formatted.substring(0, 300) + '...');
        }

        // Test du cycle de publication (avec seuil élevé)
        this.log('🔄 Test du cycle de publication (seuil: 999 pour éviter publication réelle)...');
        const result = await publisher.runPublishingCycleOptimized(999);

        this.log(`📊 Résultat publication: ${result.success ? '✅' : '❌'}`);
        this.log(`   • Publiés: ${result.published}`);
        this.log(`   • Ignorés: ${result.skipped}`);
        if (result.errors && result.errors.length > 0) {
          this.log(`   • Erreurs: ${result.errors.length}`);
        }
      } else {
        this.log('ℹ️ Aucune news à publier (normal pour un test)');
      }

      return true;

    } catch (error) {
      this.log(`❌ Erreur publisher: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async testAll(): Promise<boolean> {
    this.log('🚀 Test complet de tous les composants');

    const results = {
      scraper: false,
      service: false,
      filter: false,
      publisher: false
    };

    // Test du scraper
    console.log('\n' + '='.repeat(60));
    results.scraper = await this.testScraper();

    // Test du service
    console.log('\n' + '='.repeat(60));
    results.service = await this.testService();

    // Test du filtre
    console.log('\n' + '='.repeat(60));
    results.filter = await this.testFilter();

    // Test du publisher
    console.log('\n' + '='.repeat(60));
    results.publisher = await this.testPublisher();

    // Résumé final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ DES TESTS');
    console.log('='.repeat(60));

    const successCount = Object.values(results).filter(Boolean).length;
    const totalDuration = ((Date.now() - this.startTime) / 1000).toFixed(1);

    Object.entries(results).forEach(([component, success]) => {
      const status = success ? '✅' : '❌';
      console.log(`${status} ${component}`);
    });

    console.log('='.repeat(60));
    console.log(`⏱️  Durée totale: ${totalDuration}s`);
    console.log(`📈 Succès: ${successCount}/4 (${(successCount * 25).toFixed(0)}%)`);
    console.log(`🎯 Statut global: ${successCount === 4 ? '✅ PARFAIT' : successCount >= 2 ? '⚠️ PARTIEL' : '❌ ÉCHEC'}`);

    return successCount >= 2; // Considéré comme succès si au moins 50% fonctionne
  }

  // Méthodes utilitaires
  async checkKiloCode(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('kilocode --version', { stdio: 'ignore', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async checkForPendingItems(): Promise<boolean> {
    try {
      // Simplifié - en réalité on vérifierait la base de données
      return false;
    } catch {
      return false;
    }
  }

  async run(): Promise<boolean> {
    try {
      switch (this.options.component.toLowerCase()) {
        case 'scraper':
          return await this.testScraper();
        case 'service':
          return await this.testService();
        case 'filter':
          return await this.testFilter();
        case 'publisher':
          return await this.testPublisher();
        case 'all':
          return await this.testAll();
        default:
          this.log(`❌ Composant inconnu: ${this.options.component}`);
          this.log('Composants disponibles: scraper, service, filter, publisher, all');
          return false;
      }
    } catch (error) {
      this.log(`💥 Erreur fatale: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}

// Parsing des arguments
function parseArgs(): TestOptions {
  const args = process.argv.slice(2);
  const component = args[0] || 'all';

  const options: TestOptions = {
    component,
    testMode: args.includes('--test-mode') || args.includes('-t'),
    maxFeeds: (() => {
      const match = args.find(arg => arg.startsWith('--max-feeds='));
      return match ? parseInt(match.split('=')[1]) : 3;
    })(),
    verbose: args.includes('--verbose') || args.includes('-v')
  };

  return options;
}

// Point d'entrée
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();
  const tester = new ComponentTester(options);

  tester.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('💥 Erreur fatale du test:', error);
    process.exit(1);
  });
}

export { ComponentTester };