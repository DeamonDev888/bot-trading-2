#!/usr/bin/env node

/**
 * CYCLE DE PRODUCTION COMPLET
 * Test du pipeline complet en conditions réelles
 */

import { NewsFilterAgentOptimized } from './dist/backend/agents/NewsFilterAgentOptimized.js';
import { SimplePublisherOptimized } from './dist/discord_bot/SimplePublisherOptimized.js';

console.log('🚀 CYCLE DE PRODUCTION COMPLET');
console.log('='.repeat(50));
console.log(`⏱️ Début: ${new Date().toISOString()}`);

class ProductionCycleManager {
  constructor() {
    this.results = {
      scraping: {},
      filtering: {},
      publishing: {},
      performance: {
        startTime: Date.now()
      }
    };
  }

  log(phase, message, data = null) {
    const timestamp = new Date().toISOString().substring(11, 19);
    const icon = phase.includes('ERREUR') ? '❌' : phase.includes('SUCCÈS') ? '✅' : '🔄';
    console.log(`${icon} [${timestamp}] ${phase}: ${message}`);
    if (data && typeof data === 'object') {
      console.log('   📊:', JSON.stringify(data, null, 2));
    }
  }

  async runScrapingCycle() {
    this.log('SCRAPING', '🌐 Lancement du cycle de scraping...');

    const agent = new NewsFilterAgentOptimized();
    const scrapingStart = Date.now();

    try {
      // Lancer le cycle complet de scraping et filtrage
      this.log('SCRAPING', '🔄 Exécution du cycle NewsFilterAgentOptimized...');

      // Note: runFilterCycle inclut le scraping X/Twitter
      await agent.runFilterCycle();

      const scrapingDuration = Date.now() - scrapingStart;
      this.results.scraping = {
        success: true,
        duration: scrapingDuration,
        timestamp: new Date().toISOString()
      };

      this.log('SCRAPING', '✅ Cycle scraping terminé avec succès', {
        duration: `${scrapingDuration}ms`
      });

    } catch (error) {
      const scrapingDuration = Date.now() - scrapingStart;
      this.results.scraping = {
        success: false,
        duration: scrapingDuration,
        error: error.message,
        timestamp: new Date().toISOString()
      };

      this.log('SCRAPING ERREUR', '❌ Erreur durant le scraping', error.message);
    } finally {
      try {
        await agent.close();
        this.log('SCRAPING', '✅ Agent fermé correctement');
      } catch (closeError) {
        this.log('SCRAPING', '⚠️ Erreur fermeture agent', closeError.message);
      }
    }
  }

  async runPublishingCycle() {
    this.log('PUBLISHING', '📤 Lancement du cycle de publication...');

    const publisher = new SimplePublisherOptimized();
    const publishingStart = Date.now();

    try {
      // Récupérer les news non publiées
      const news = await publisher.getUnpublishedNewsOptimized();
      this.log('PUBLISHING', `📰 ${news.length} news non publiées trouvées`);

      if (news.length > 0) {
        // Lancer le cycle de publication
        const result = await publisher.runPublishingCycleOptimized(5); // Seuil de 5

        const publishingDuration = Date.now() - publishingStart;
        this.results.publishing = {
          success: true,
          duration: publishingDuration,
          unpublishedFound: news.length,
          published: result.published,
          skipped: result.skipped,
          timestamp: new Date().toISOString()
        };

        this.log('PUBLISHING', '✅ Cycle publication terminé', {
          published: result.published,
          skipped: result.skipped,
          duration: `${publishingDuration}ms`
        });

      } else {
        const publishingDuration = Date.now() - publishingStart;
        this.results.publishing = {
          success: true,
          duration: publishingDuration,
          unpublishedFound: 0,
          published: 0,
          skipped: 0,
          timestamp: new Date().toISOString()
        };

        this.log('PUBLISHING', 'ℹ️ Aucune news à publier (normal)');
      }

    } catch (error) {
      const publishingDuration = Date.now() - publishingStart;
      this.results.publishing = {
        success: false,
        duration: publishingDuration,
        error: error.message,
        timestamp: new Date().toISOString()
      };

      this.log('PUBLISHING ERREUR', '❌ Erreur durant la publication', error.message);
    }

    // Afficher le dashboard de monitoring
    try {
      this.log('PUBLISHING', '📊 Dashboard de monitoring...');
      publisher.printMonitoringDashboard();
    } catch (dashboardError) {
      this.log('PUBLISHING', '⚠️ Erreur dashboard', dashboardError.message);
    }
  }

  async checkSystemHealth() {
    this.log('HEALTH', '🏥 Vérification santé du système...');

    try {
      // Vérifier si les processus sont actifs
      const healthCheck = await fetch('http://localhost:3000/health', {
        method: 'GET',
        timeout: 5000
      });

      if (healthCheck.ok) {
        this.log('HEALTH', '✅ Système en ligne');
      } else {
        this.log('HEALTH', '⚠️ Système partiellement disponible');
      }

    } catch (error) {
      this.log('HEALTH', 'ℹ️ Pas de serveur de santé (normal pour test local)');
    }

    // Statistiques de performance
    const totalDuration = Date.now() - this.results.performance.startTime;
    this.results.performance.totalDuration = totalDuration;
    this.results.performance.endTime = new Date().toISOString();

    this.log('HEALTH', '📊 Performance du cycle', {
      totalDuration: `${totalDuration}ms`,
      scrapingStatus: this.results.scraping.success ? '✅' : '❌',
      publishingStatus: this.results.publishing.success ? '✅' : '❌'
    });
  }

  async generateFinalReport() {
    const totalDuration = Date.now() - this.results.performance.startTime;
    const durationSec = (totalDuration / 1000).toFixed(2);

    console.log('\n' + '='.repeat(50));
    console.log('📊 RAPPORT FINAL - CYCLE DE PRODUCTION');
    console.log('='.repeat(50));
    console.log(`⏱️ Durée totale: ${durationSec}s`);
    console.log(`🕐 Fin: ${new Date().toISOString()}`);

    console.log('\n📊 RÉSULTATS PAR PHASE:');

    // Scraping
    console.log('\n🌐 Phase Scraping:');
    if (this.results.scraping.success) {
      console.log(`   ✅ Statut: SUCCÈS`);
      console.log(`   ⏱️ Durée: ${this.results.scraping.duration}ms`);
    } else {
      console.log(`   ❌ Statut: ÉCHEC`);
      console.log(`   ⏱️ Durée: ${this.results.scraping.duration}ms`);
      console.log(`   ❌ Erreur: ${this.results.scraping.error}`);
    }

    // Publishing
    console.log('\n📤 Phase Publication:');
    if (this.results.publishing.success) {
      console.log(`   ✅ Statut: SUCCÈS`);
      console.log(`   ⏱️ Durée: ${this.results.publishing.duration}ms`);
      console.log(`   📰 News trouvées: ${this.results.publishing.unpublishedFound || 0}`);
      console.log(`   ✅ Publiées: ${this.results.publishing.published || 0}`);
      console.log(`   ⏭️ Ignorées: ${this.results.publishing.skipped || 0}`);
    } else {
      console.log(`   ❌ Statut: ÉCHEC`);
      console.log(`   ⏱️ Durée: ${this.results.publishing.duration}ms`);
      console.log(`   ❌ Erreur: ${this.results.publishing.error}`);
    }

    // Performance globale
    console.log('\n⚡ Performance Globale:');
    const successRate = [
      this.results.scraping.success ? 1 : 0,
      this.results.publishing.success ? 1 : 0
    ].reduce((a, b) => a + b, 0) / 2;

    console.log(`   📊 Taux de succès: ${(successRate * 100).toFixed(0)}%`);
    console.log(`   ⚡ Performance: ${totalDuration < 30000 ? '✅ Rapide' : totalDuration < 60000 ? '⚠️ Moyenne' : '❌ Lent'}`);

    // Évaluation finale
    console.log('\n🎯 ÉVALUATION FINALE:');

    if (successRate === 1) {
      console.log('   🟢 EXCELLENT: Cycle terminé avec succès');
      console.log('   🚀 Système prêt pour production continue');
      console.log('   ✅ Pipeline complet fonctionnel');
    } else if (successRate >= 0.5) {
      console.log('   🟡 BON: Cycle partiellement réussi');
      console.log('   ⚠️ Vérifier les erreurs ci-dessus');
      console.log('   🔧 Réglages nécessaires avant production continue');
    } else {
      console.log('   🔴 CRITIQUE: Cycle échoué');
      console.log('   ❌ Réparations obligatoires');
      console.log('   🚨 Ne pas utiliser en production');
    }

    console.log('\n💡 Prochaines actions:');
    if (successRate === 1) {
      console.log('   • Configurer l\'automatisation (cron job)');
      console.log('   • Monitorer les logs en continu');
      console.log('   • Configurer les alertes de santé');
    } else {
      console.log('   • Analyser les erreurs dans les logs');
      console.log('   • Corriger les problèmes identifiés');
      console.log('   • Relancer le test après corrections');
    }

    console.log('='.repeat(50));

    return successRate >= 0.8; // Considéré comme succès si 80%+ réussi
  }
}

// Fonction principale
async function main() {
  const cycleManager = new ProductionCycleManager();

  try {
    cycleManager.log('DÉMARRAGE', '🚀 Lancement du cycle de production complet...');

    // Phase 1: Scraping + Filtrage
    await cycleManager.runScrapingCycle();

    // Phase 2: Publication
    await cycleManager.runPublishingCycle();

    // Phase 3: Vérification santé
    await cycleManager.checkSystemHealth();

    // Phase 4: Rapport final
    const success = await cycleManager.generateFinalReport();

    process.exit(success ? 0 : 1);

  } catch (error) {
    console.error('💥 Erreur fatale cycle production:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Gestion des erreurs
process.on('uncaughtException', (error) => {
  console.error('💥 Erreur non capturée:', error.message);
  process.exit(1);
});

// Lancer le cycle de production
main();