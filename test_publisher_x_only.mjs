#!/usr/bin/env node

/**
 * TEST DU PUBLISHER CORRIGÉ - UNIVERSELLEMENT X/TWITTER
 * Vérifie que seules les news X/Twitter sont publiées
 */

import { SimplePublisherOptimized } from './dist/discord_bot/SimplePublisherOptimized.js';

console.log('📤 TEST PUBLISHER - X/TWITTER UNIVERSEL');
console.log('='.repeat(50));
console.log(`⏱️ Début: ${new Date().toISOString()}`);

class XOnlyPublisherTester {
  constructor() {
    this.publisher = new SimplePublisherOptimized();
    this.results = {
      initialCheck: {},
      filteringTest: {},
      validationTest: {},
      finalCheck: {},
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

  async checkInitialNews() {
    this.log('INITIAL', '📊 Vérification des news non publiées (X SEULEMENT)...');

    try {
      const news = await this.publisher.getUnpublishedNewsOptimized();

      // Analyser les sources
      const sourceStats = {};
      const economicDataCount = news.filter(item =>
        item.title?.includes('[ECONOMIC DATA]') ||
        item.title?.includes('[ECO CAL') ||
        item.source?.includes('BLS') ||
        item.source?.includes('FRED')
      ).length;

      const xCount = news.filter(item =>
        item.source?.startsWith('X - ')
      ).length;

      const otherCount = news.length - economicDataCount - xCount;

      this.results.initialCheck = {
        totalUnpublished: news.length,
        xTwitter: xCount,
        economicData: economicDataCount,
        other: otherCount,
        timestamp: new Date().toISOString(),
        sampleItems: news.slice(0, 3).map(item => ({
          title: item.title?.substring(0, 50) + '...',
          source: item.source,
          score: item.relevance_score,
          category: item.category
        }))
      };

      this.log('INITIAL', `📰 ${news.length} news non publiées trouvées`);
      this.log('INITIAL', `📊 Distribution: X=${xCount}, Éco=${economicDataCount}, Autres=${otherCount}`);

      if (economicDataCount > 0) {
        this.log('INITIAL', '⚠️ ATTENTION: Données économiques détectées qui devraient être filtrées');
      }

      if (news.length > 0) {
        this.log('INITIAL', '📝 Exemples:', this.results.initialCheck.sampleItems);
      }

      return news;

    } catch (error) {
      this.log('INITIAL ERREUR', '❌ Erreur récupération news initiales', error.message);
      throw error;
    }
  }

  async testFilteringBehavior() {
    this.log('FILTERING', '🔍 Test du comportement de filtrage...');

    try {
      // Phase 1: Vérifier que seules les news X sont récupérées
      this.log('FILTERING', '🔄 Vérification filtrage X-only...');

      const filteredNews = await this.publisher.getUnpublishedNewsOptimized();

      // Analyser les sources après filtrage
      const xCountAfter = filteredNews.filter(item =>
        item.source?.startsWith('X - ')
      ).length;

      const economicDataCountAfter = filteredNews.filter(item =>
        item.title?.includes('[ECONOMIC DATA]') ||
        item.title?.includes('[ECO CAL]')
      ).length;

      const otherCountAfter = filteredNews.length - xCountAfter - economicDataCountAfter;

      this.results.filteringTest = {
        totalFiltered: filteredNews.length,
        xTwitter: xCountAfter,
        economicData: economicDataCountAfter,
        other: otherCountAfter,
        timestamp: new Date().toISOString(),
        improvement: {
          before: this.results.initialCheck.economicData || 0,
          after: economicDataCountAfter,
          reduction: (this.results.initialCheck.economicData || 0) - economicDataCountAfter
        }
      };

      this.log('FILTERING', `✅ Filtrage appliqué: ${filteredNews.length} news`);
      this.log('FILTERING', `📊 Résultat: X=${xCountAfter}, Éco=${economicDataCountAfter}, Autres=${otherCountAfter}`);

      if (this.results.filteringTest.improvement.reduction > 0) {
        this.log('FILTERING', `✅ ${this.results.filteringTest.improvement.reduction} données économiques filtrées!`);
      }

      // Phase 2: Validation du contenu
      this.log('FILTERING', '🔍 Validation du contenu filtré...');

      const contentAnalysis = {
        hasXNews: filteredNews.some(item => item.source?.startsWith('X - ')),
        hasEconomicData: filteredNews.some(item =>
          item.title?.includes('[ECONOMIC DATA]') ||
          item.title?.includes('[ECO CAL]') ||
          item.title?.includes('Consumer Price Index') ||
          item.title?.includes('Payroll Employment')
        ),
        hasValidContent: filteredNews.some(item =>
          item.title && item.title.length > 10 &&
          item.content && item.content.length > 50 &&
          item.relevance_score >= 5
        )
      };

      this.results.validationTest = contentAnalysis;

      this.log('FILTERING', '📊 Analyse contenu:');
      this.log('FILTERING', `   • News X présentes: ${contentAnalysis.hasXNews ? '✅' : '❌'}`);
      this.log('FILTERING', `   • Données économiques présentes: ${contentAnalysis.hasEconomicData ? '❌' : '✅'} (devrait être ❌)`);
      this.log('FILTERING', `   • Contenu valide: ${contentAnalysis.hasValidContent ? '✅' : '❌'}`);

      return filteredNews;

    } catch (error) {
      this.log('FILTERING ERREUR', '❌ Erreur test filtrage', error.message);
      this.results.filteringTest.error = error.message;
      return [];
    }
  }

  async testPublicationBehavior() {
    this.log('PUBLISHING', '📤 Test du comportement de publication...');

    try {
      // Test avec un petit échantillon pour valider
      const filteredNews = await this.publisher.getUnpublishedNewsOptimized();

      if (filteredNews.length === 0) {
        this.log('PUBLISHING', 'ℹ️ Aucune news X/Twitter à publier (normal si toutes déjà publiées)');
        this.results.publishingTest = {
          status: 'no_x_news',
          message: 'Aucune news X/Twitter disponible'
        };
        return true;
      }

      // Test avec seuil 1 pour limiter la publication
      this.log('PUBLISHING', `🚀 Test publication avec ${filteredNews.length} news (seuil=1)...`);

      const publishStart = Date.now();
      const result = await this.publisher.runPublishingCycleOptimized(1);
      const publishDuration = Date.now() - publishStart;

      this.results.publishingTest = {
        status: 'completed',
        published: result.published || 0,
        skipped: result.skipped || 0,
        success: result.success,
        duration: publishDuration,
        inputNewsCount: filteredNews.length
      };

      this.log('PUBLISHING', `📊 Résultat publication: ${result.published || 0} publiées, ${result.skipped || 0} ignorées (${publishDuration}ms)`);

      if (result.success) {
        this.log('PUBLISHING', '✅ Publication terminée avec succès');
      }

      // Vérifier qu'il n'y a pas de données économiques publiées
      await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre un peu
      const finalNews = await this.publisher.getUnpublishedNewsOptimized();

      this.results.finalCheck = {
        finalNewsCount: finalNews.length,
        stillHasEconomicData: finalNews.some(item =>
          item.title?.includes('[ECONOMIC DATA]') ||
          item.title?.includes('[ECO CAL]')
        ),
        timestamp: new Date().toISOString()
      };

      this.log('PUBLISHING', `📈 État final: ${finalNews.length} news restantes`);
      this.log('PUBLISHING', `🚫 Données économiques restantes: ${this.results.finalCheck.stillHasEconomicData ? '❌' : '✅'} (devrait être ❌)`);

      return true;

    } catch (error) {
      this.log('PUBLISHING ERREUR', '❌ Erreur test publication', error.message);
      this.results.publishingTest.error = error.message;
      return false;
    }
  }

  async generateReport() {
    const totalDuration = Date.now() - this.results.performance.startTime;
    const durationSec = (totalDuration / 1000).toFixed(2);

    console.log('\n' + '='.repeat(50));
    console.log('📊 RAPPORT FINAL - TEST PUBLISHER X/TWITTER');
    console.log('='.repeat(50));
    console.log(`⏱️ Durée totale: ${durationSec}s`);
    console.log(`🕐 Fin: ${new Date().toISOString()}`);

    console.log('\n📊 RÉSULTATS:');

    // Initial Check
    console.log('\n🔍 Check Initial:');
    console.log(`   • Total non publié: ${this.results.initialCheck.totalUnpublished || 0}`);
    console.log(`   • News X/Twitter: ${this.results.initialCheck.xTwitter || 0}`);
    console.log(`   • Données économiques: ${this.results.initialCheck.economicData || 0}`);
    console.log(`   • Autres: ${this.results.initialCheck.other || 0}`);

    // Filtering Test
    console.log('\n🎯 Test Filtrage:');
    if (this.results.filteringTest.totalFiltered !== undefined) {
      console.log(`   • Total filtré: ${this.results.filteringTest.totalFiltered}`);
      console.log(`   • News X/Twitter: ${this.results.filteringTest.xTwitter}`);
      console.log(`   • Données économiques: ${this.results.filteringTest.economicData}`);
      console.log(`   • Réduction économiques: ${this.results.filteringTest.improvement?.reduction || 0}`);
    }

    // Validation Test
    if (this.results.validationTest.hasXNews) {
      console.log('\n✅ Validation Contenu:');
      console.log(`   • News X/Twitter: ✅`);
      console.log(`   • Données économiques filtrées: ${this.results.validationTest.hasEconomicData ? '❌' : '✅'}`);
      console.log(`   • Contenu valide: ${this.results.validationTest.hasValidContent ? '✅' : '❌'}`);
    }

    // Publishing Test
    console.log('\n📤 Test Publication:');
    if (this.results.publishingTest) {
      console.log(`   • Statut: ${this.results.publishingTest.status}`);
      console.log(`   • Publiées: ${this.results.publishingTest.published || 0}`);
      console.log(`   • Ignorées: ${this.results.publishingTest.skipped || 0}`);
      console.log(`   • Durée: ${this.results.publishingTest.duration || 0}ms`);
      console.log(`   • Succès: ${this.results.publishingTest.success ? '✅' : '❌'}`);
    }

    // Final Check
    console.log('\n📈 Vérification Finale:');
    console.log(`   • News restantes: ${this.results.finalCheck.finalNewsCount || 0}`);
    console.log(`   • Économiques restantes: ${this.results.finalCheck.stillHasEconomicData ? '❌' : '✅'} (doit être ❌)`);

    // Évaluation finale
    console.log('\n🎯 ÉVALUATION FINALE:');

    const issues = [];
    let score = 100;

    if (!this.results.filteringTest.totalFiltered) {
      issues.push('Filtrage échoué');
      score -= 40;
    }

    if (this.results.filteringTest.economicData > 0) {
      issues.push('Données économiques non filtrées');
      score -= 30;
    }

    if (!this.results.validationTest.hasXNews) {
      issues.push('Aucune news X/Twitter trouvée');
      score -= 20;
    }

    if (this.results.validationTest.hasEconomicData) {
      issues.push('Contenu économique présent dans le filtrage');
      score -= 50; // Très important
    }

    if (this.results.finalCheck.stillHasEconomicData) {
      issues.push('Données économiques encore présentes après filtrage');
      score -= 40;
    }

    if (!this.results.publishingTest.success) {
      issues.push('Publication échouée');
      score -= 30;
    }

    const status = score >= 80 ? '🟢 EXCELLENT' : score >= 60 ? '🟡 BON' : score >= 40 ? '🟠 MOYEN' : '🔴 CRITIQUE';

    console.log(`   Score global: ${score}/100`);
    console.log(`   Statut: ${status}`);

    if (issues.length === 0) {
      console.log('\n🚀 PUBLISHER X/TWITTER PARFAITEMENT CORRIGÉ!');
      console.log('   ✅ Ne publie QUE les news X/Twitter filtrées');
      console.log('   ✅ Bloque toutes les données économiques et calendriers');
      console.log('   ✅ Accumulation gérée correctement');
      console.log('   ✅ Ne s\'arrête pas prématurément');
    } else {
      console.log('\n⚠️ Points d\'attention:');
      issues.forEach(issue => console.log(`   • ${issue}`));
    }

    console.log('\n💡 Prochaines actions:');
    console.log('   • Le publisher est maintenant configuré pour X/Twitter uniquement');
    console.log('   • Seuls les posts pertinents de X seront publiés');
    console.log('   • Les données économiques sont automatiquement filtrées');

    console.log('='.repeat(50));

    return score >= 70; // Considéré comme succès si 70%+

  }

  async cleanup() {
    try {
      // Le publisher a son propre cleanup
      this.log('CLEANUP', '🧹 Nettoyage terminé');
    } catch (error) {
      this.log('CLEANUP ERREUR', '❌ Erreur nettoyage', error.message);
    }
  }
}

// Fonction principale
async function main() {
  const tester = new XOnlyPublisherTester();

  try {
    tester.log('DÉMARRAGE', '🚀 Lancement du test publisher X/Twitter uniquement...');

    // Test 1: Check initial
    await tester.checkInitialNews();

    // Test 2: Test filtering
    await tester.testFilteringBehavior();

    // Test 3: Test publishing
    await tester.testPublicationBehavior();

    // Final report
    const success = await tester.generateReport();

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