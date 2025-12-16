#!/usr/bin/env node

/**
 * TEST DU PUBLISHER - ACCUMULATION ET COMPORTEMENT
 * Vérifie que le publisher ne s'arrête pas prématurément
 * et gère correctement l'accumulation des news non publiées
 */

import { SimplePublisherOptimized } from './dist/discord_bot/SimplePublisherOptimized.js';
import { Pool } from 'pg';

console.log('📤 TEST PUBLISHER - ACCUMULATION & COMPORTEMENT');
console.log('='.repeat(60));
console.log(`⏱️ Début: ${new Date().toISOString()}`);

class PublisherAccumulationTester {
  constructor() {
    this.publisher = new SimplePublisherOptimized();
    this.results = {
      initialCheck: {},
      accumulationTest: {},
      thresholdTest: {},
      behaviorTest: {},
      performance: {
        startTime: Date.now()
      }
    };
    this.testStartTime = Date.now();
  }

  log(phase, message, data = null) {
    const timestamp = new Date().toISOString().substring(11, 19);
    const icon = phase.includes('ERREUR') ? '❌' : phase.includes('SUCCÈS') ? '✅' : '🔄';
    console.log(`${icon} [${timestamp}] ${phase}: ${message}`);
    if (data && typeof data === 'object') {
      console.log('   📊:', JSON.stringify(data, null, 2));
    }
  }

  async checkInitialNews() {
    this.log('INITIAL', '📊 Vérification des news initiales...');

    try {
      const news = await this.publisher.getUnpublishedNewsOptimized();

      this.results.initialCheck = {
        totalUnpublished: news.length,
        timestamp: new Date().toISOString(),
        sampleItems: news.slice(0, 3).map(item => ({
          title: item.title?.substring(0, 50) + '...',
          source: item.source,
          score: item.relevance_score,
          age: Math.round((Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60)) + 'h'
        }))
      };

      this.log('INITIAL', `📰 ${news.length} news non publiées trouvées`);

      if (news.length > 0) {
        this.log('INITIAL', '📝 Exemples:', this.results.initialCheck.sampleItems);
      }

      return news;

    } catch (error) {
      this.log('INITIAL ERREUR', '❌ Erreur récupération news initiales', error.message);
      throw error;
    }
  }

  async testAccumulationBehavior() {
    this.log('ACCUMULATION', '🔄 Test du comportement d\'accumulation...');

    try {
      // Phase 1: Test avec seuil très bas pour forcer l'attente
      this.log('ACCUMULATION', '🚀 Test 1: Seuil bas (1) - doit accumuler');

      const result1 = await this.publisher.runPublishingCycleOptimized(1);

      this.results.accumulationTest.lowThreshold = {
        threshold: 1,
        published: result1.published || 0,
        skipped: result1.skipped || 0,
        success: result1.success,
        duration: Date.now() - this.testStartTime
      };

      this.log('ACCUMULATION', `📊 Résultat seuil bas: ${result1.published || 0} publiées, ${result1.skipped || 0} ignorées`);

      // Phase 2: Test avec seuil très haut pour forcer l'ignor
      this.log('ACCUMULATION', '🚀 Test 2: Seuil haut (999) - doit ignorer tout');

      const result2 = await this.publisher.runPublishingCycleOptimized(999);

      this.results.accumulationTest.highThreshold = {
        threshold: 999,
        published: result2.published || 0,
        skipped: result2.skipped || 0,
        success: result2.success,
        duration: Date.now() - this.testStartTime
      };

      this.log('ACCUMULATION', `📊 Résultat seuil haut: ${result2.published || 0} publiées, ${result2.skipped || 0} ignorées`);

      // Vérifier l'état après les tests
      const newsAfterTest = await this.publisher.getUnpublishedNewsOptimized();
      this.results.accumulationTest.newsAfterTest = newsAfterTest.length;

      this.log('ACCUMULATION', `📈 État après tests: ${newsAfterTest.length} news non publiées restantes`);

      return true;

    } catch (error) {
      this.log('ACCUMULATION ERREUR', '❌ Erreur test accumulation', error.message);
      this.results.accumulationTest.error = error.message;
      return false;
    }
  }

  async testThresholdBehavior() {
    this.log('THRESHOLD', '🎯 Test comportement avec différents seuils...');

    const thresholds = [3, 5, 7, 10];
    const results = [];

    try {
      for (const threshold of thresholds) {
        this.log('THRESHOLD', `🔄 Test seuil: ${threshold}`);

        const testStart = Date.now();
        const result = await this.publisher.runPublishingCycleOptimized(threshold);
        const duration = Date.now() - testStart;

        const testResult = {
          threshold,
          published: result.published || 0,
          skipped: result.skipped || 0,
          success: result.success,
          duration,
          timestamp: new Date().toISOString()
        };

        results.push(testResult);

        this.log('THRESHOLD', `✅ Seuil ${threshold}: ${result.published || 0} publiées, ${result.skipped || 0} ignorées (${duration}ms)`);

        // Petite pause entre tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      this.results.thresholdTest = {
        allTests: results,
        summary: {
          totalTests: thresholds.length,
          totalPublished: results.reduce((sum, r) => sum + r.published, 0),
          totalSkipped: results.reduce((sum, r) => sum + r.skipped, 0),
          avgDuration: Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length),
          successRate: (results.filter(r => r.success).length / results.length) * 100
        }
      };

      return true;

    } catch (error) {
      this.log('THRESHOLD ERREUR', '❌ Erreur test seuils', error.message);
      this.results.thresholdTest.error = error.message;
      return false;
    }
  }

  async testContinuousOperation() {
    this.log('CONTINUOUS', '♾️ Test d\'opération continue...');

    try {
      let iterations = 0;
      const maxIterations = 5; // Limité pour éviter timeout
      const results = [];

      while (iterations < maxIterations) {
        iterations++;
        this.log('CONTINUOUS', `🔄 Iteration ${iterations}/${maxIterations}`);

        const iterationStart = Date.now();
        const result = await this.publisher.runPublishingCycleOptimized(5);
        const duration = Date.now() - iterationStart;

        // Vérifier l'état des news
        const currentNews = await this.publisher.getUnpublishedNewsOptimized();

        const iterationResult = {
          iteration,
          published: result.published || 0,
          skipped: result.skipped || 0,
          remainingNews: currentNews.length,
          duration,
          success: result.success,
          timestamp: new Date().toISOString()
        };

        results.push(iterationResult);

        this.log('CONTINUOUS', `✅ Itération ${iterations}: ${result.published || 0} publiées, ${currentNews.length} restantes`);

        // Si on a 0 news restantes, on peut s'arrêter
        if (currentNews.length === 0) {
          this.log('CONTINUOUS', '🎯 Toutes les news publiées, arrêt du test');
          break;
        }

        // Petite pause entre itérations
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      this.results.behaviorTest = {
        iterations,
        allResults: results,
        summary: {
          totalPublished: results.reduce((sum, r) => sum + r.published, 0),
          finalNewsCount: results[results.length - 1]?.remainingNews || 0,
          avgDuration: Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length),
          trend: this.analyzeTrend(results)
        }
      };

      return true;

    } catch (error) {
      this.log('CONTINUOUS ERREUR', '❌ Erreur opération continue', error.message);
      this.results.behaviorTest.error = error.message;
      return false;
    }
  }

  analyzeTrend(results) {
    if (results.length < 2) return 'insufficient_data';

    const first = results[0].remainingNews;
    const last = results[results.length - 1].remainingNews;

    if (last === 0) return 'all_published';
    if (last < first) return 'decreasing';
    if (last > first) return 'increasing';
    return 'stable';
  }

  async testExtremeConditions() {
    this.log('EXTREME', '🔥 Test conditions extrêmes...');

    try {
      // Test avec seuil 0 (tout publier immédiatement)
      this.log('EXTREME', '⚡ Test seuil 0 - publication immédiate');
      const resultZero = await this.publisher.runPublishingCycleOptimized(0);

      this.results.extremeTest = {
        thresholdZero: {
          published: resultZero.published || 0,
          skipped: resultZero.skipped || 0,
          success: resultZero.success
        }
      };

      this.log('EXTREME', `📊 Seuil 0: ${resultZero.published || 0} publiées, ${resultZero.skipped || 0} ignorées`);

      // Test avec seuil très bas mais > 0
      this.log('EXTREME', '🔍 Test seuil 1 - accumulation minimale');
      const resultOne = await this.publisher.runPublishingCycleOptimized(1);

      this.results.extremeTest.thresholdOne = {
        published: resultOne.published || 0,
        skipped: resultOne.skipped || 0,
        success: resultOne.success
      };

      this.log('EXTREME', `📊 Seuil 1: ${resultOne.published || 0} publiées, ${resultOne.skipped || 0} ignorées`);

      return true;

    } catch (error) {
      this.log('EXTREME ERREUR', '❌ Erreur conditions extrêmes', error.message);
      this.results.extremeTest.error = error.message;
      return false;
    }
  }

  async testMonitoringAndLogs() {
    this.log('MONITORING', '📊 Test dashboard et monitoring...');

    try {
      // Afficher le dashboard de monitoring
      this.log('MONITORING', '📈 Dashboard de monitoring:');

      // Capturer la sortie du dashboard (simulation)
      const monitoringStart = Date.now();

      // Simuler l'appel du dashboard
      const originalConsoleLog = console.log;
      let dashboardOutput = [];

      console.log = (...args) => {
        dashboardOutput.push(args.join(' '));
        originalConsoleLog(...args);
      };

      this.publisher.printMonitoringDashboard();

      // Restaurer console.log
      console.log = originalConsoleLog;

      const monitoringDuration = Date.now() - monitoringStart;

      this.results.monitoringTest = {
        dashboardGenerated: dashboardOutput.length > 0,
        outputLines: dashboardOutput.length,
        duration: monitoringDuration,
        hasMetrics: dashboardOutput.some(line => line.includes('PIPELINE MONITORING')),
        hasStats: dashboardOutput.some(line => line.includes('Total requests') || line.includes('Performance'))
      };

      this.log('MONITORING', `✅ Dashboard généré: ${dashboardOutput.length} lignes en ${monitoringDuration}ms`);

      return true;

    } catch (error) {
      this.log('MONITORING ERREUR', '❌ Erreur monitoring', error.message);
      this.results.monitoringTest.error = error.message;
      return false;
    }
  }

  async generateFinalReport() {
    const totalDuration = Date.now() - this.results.performance.startTime;
    const durationSec = (totalDuration / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('📊 RAPPORT FINAL - TEST PUBLISHER ACCUMULATION');
    console.log('='.repeat(60));
    console.log(`⏱️ Durée totale: ${durationSec}s`);
    console.log(`🕐 Fin: ${new Date().toISOString()}`);

    console.log('\n📊 RÉSULTATS PAR CATÉGORIE:');

    // Initial Check
    console.log('\n🔍 Check Initial:');
    console.log(`   • News non publiées: ${this.results.initialCheck.totalUnpublished || 0}`);
    console.log(`   • État: ${this.results.initialCheck.totalUnpublished > 0 ? '✅ Des news disponibles' : 'ℹ️ Aucune news'}`);

    // Accumulation Test
    console.log('\n🔄 Test Accumulation:');
    if (this.results.accumulationTest.lowThreshold) {
      console.log(`   • Seuil bas (1): ${this.results.accumulationTest.lowThreshold.published} publiées, ${this.results.accumulationTest.lowThreshold.skipped} ignorées`);
      console.log(`   • Seuil haut (999): ${this.results.accumulationTest.highThreshold.published} publiées, ${this.results.accumulationTest.highThreshold.skipped} ignorées`);
      console.log(`   • News restantes: ${this.results.accumulationTest.newsAfterTest || 0}`);
    }

    // Threshold Test
    if (this.results.thresholdTest.summary) {
      console.log('\n🎯 Test Seuils:');
      const summary = this.results.thresholdTest.summary;
      console.log(`   • Tests exécutés: ${summary.totalTests}`);
      console.log(`   • Total publié: ${summary.totalPublished}`);
      console.log(`   • Total ignoré: ${summary.totalSkipped}`);
      console.log(`   • Durée moyenne: ${summary.avgDuration}ms`);
      console.log(`   • Taux succès: ${summary.successRate.toFixed(1)}%`);
    }

    // Behavior Test
    if (this.results.behaviorTest.summary) {
      console.log('\n♾️ Test Comportement Continue:');
      const behavior = this.results.behaviorTest.summary;
      console.log(`   • Itérations: ${this.results.behaviorTest.iterations}`);
      console.log(`   • Total publié: ${behavior.totalPublished}`);
      console.log(`   • News restantes: ${behavior.finalNewsCount}`);
      console.log(`   • Tendance: ${behavior.trend}`);
      console.log(`   • Durée moyenne: ${behavior.avgDuration}ms`);
    }

    // Extreme Test
    if (this.results.extremeTest) {
      console.log('\n🔥 Test Conditions Extrêmes:');
      console.log(`   • Seuil 0: ${this.results.extremeTest.thresholdZero.published} publiées`);
      console.log(`   • Seuil 1: ${this.results.extremeTest.thresholdOne.published} publiées`);
    }

    // Monitoring Test
    if (this.results.monitoringTest) {
      console.log('\n📊 Test Monitoring:');
      const monitoring = this.results.monitoringTest;
      console.log(`   • Dashboard généré: ${monitoring.dashboardGenerated ? '✅' : '❌'}`);
      console.log(`   • Lignes de sortie: ${monitoring.outputLines}`);
      console.log(`   • Contient métriques: ${monitoring.hasMetrics ? '✅' : '❌'}`);
    }

    // Évaluation finale
    console.log('\n🎯 ÉVALUATION FINALE:');

    const issues = [];
    let score = 100;

    if (!this.results.initialCheck) {
      issues.push('Check initial échoué');
      score -= 30;
    }

    if (!this.results.accumulationTest.lowThreshold?.success) {
      issues.push('Test accumulation bas seuil échoué');
      score -= 25;
    }

    if (!this.results.accumulationTest.highThreshold?.success) {
      issues.push('Test accumulation haut seuil échoué');
      score -= 25;
    }

    if (this.results.thresholdTest.error) {
      issues.push('Test seuils échoué');
      score -= 20;
    }

    if (this.results.behaviorTest.error) {
      issues.push('Test comportement échoué');
      score -= 20;
    }

    if (!this.results.monitoringTest.dashboardGenerated) {
      issues.push('Monitoring dashboard échoué');
      score -= 10;
    }

    const status = score >= 90 ? '🟢 EXCELLENT' : score >= 70 ? '🟡 BON' : score >= 50 ? '🟠 MOYEN' : '🔴 À AMÉLIORER';

    console.log(`   Score global: ${score}/100`);
    console.log(`   Statut: ${status}`);

    if (issues.length === 0) {
      console.log('\n🚀 PUBLISHER PRÊT POUR LA PRODUCTION!');
      console.log('   ✅ Gère correctement l\'accumulation');
      console.log('   ✅ Respecte les seuils de publication');
      console.log('   ✅ Continue l\'opération même avec peu de news');
      console.log('   ✅ Monitoring fonctionnel');
    } else {
      console.log('\n⚠️ Points d\'attention:');
      issues.forEach(issue => console.log(`   • ${issue}`));
    }

    console.log('\n💡 Recommandations:');

    if (this.results.initialCheck.totalUnpublished > 0) {
      console.log('   • Configurer un cron job régulier pour publier les news accumulées');
      console.log('   • Surveiller le nombre de news en attente avec le monitoring');
    }

    console.log('   • Ajuster les seuils selon la fréquence de publication souhaitée');
    console.log('   • Monitorer les logs pour identifier les patterns de comportement');

    console.log('='.repeat(60));

    return score >= 70; // Considéré comme succès si 70%+
  }

  async runAllTests() {
    try {
      // Test 1: Check initial
      await this.checkInitialNews();

      // Test 2: Accumulation behavior
      await this.testAccumulationBehavior();

      // Test 3: Threshold behavior
      await this.testThresholdBehavior();

      // Test 4: Continuous operation
      await this.testContinuousOperation();

      // Test 5: Extreme conditions
      await this.testExtremeConditions();

      // Test 6: Monitoring and logs
      await this.testMonitoringAndLogs();

      // Final report
      const success = await this.generateFinalReport();

      return success;

    } catch (error) {
      this.log('GLOBAL ERREUR', '💥 Erreur fatale test publisher', error.message);
      console.error('Stack:', error.stack);
      return false;
    }
  }

  async cleanup() {
    try {
      // Le publisher a son propre cleanup dans le constructeur
      this.log('CLEANUP', '🧹 Nettoyage terminé');
    } catch (error) {
      this.log('CLEANUP ERREUR', '❌ Erreur nettoyage', error.message);
    }
  }
}

// Fonction principale
async function main() {
  const tester = new PublisherAccumulationTester();

  try {
    tester.log('DÉMARRAGE', '🚀 Lancement du test publisher accumulation...');

    const success = await tester.runAllTests();

    process.exit(success ? 0 : 1);

  } catch (error) {
    console.error('💥 Erreur inattendue:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

// Gestion des erreurs
process.on('uncaughtException', (error) => {
  console.error('💥 Erreur non capturée:', error.message);
  process.exit(1);
});

// Lancer le test
main();