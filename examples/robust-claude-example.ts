#!/usr/bin/env node

/**
 * Exemple d'utilisation du ClaudeChatBotAgent avec toutes les améliorations de robustesse
 * Ce script démontre l'utilisation des patterns avancés, monitoring, tests et benchmarks
 */

import { ClaudeChatBotAgentEnhanced } from '../src/backend/agents/ClaudeChatBotAgentEnhanced.js';
import { ClaudeMonitoringService } from '../src/backend/monitoring/ClaudeMonitoringService.js';
import { IntegrationTestSuite } from '../src/backend/testing/IntegrationTestSuite.js';
import { ClaudeBenchmarkSuite } from '../src/backend/benchmark/ClaudeBenchmarkSuite.js';
import { ClaudeAgentConfigManager } from '../src/backend/config/ClaudeAgentConfig.js';

/**
 * Démonstration de l'agent robuste
 */
async function demonstrateRobustAgent() {
  console.log('🤖 === DÉMONSTRATION AGENT ROBUSTE ===\n');

  // 1. Configuration avec profils
  const configManager = new ClaudeAgentConfigManager({
    profile: 'production',
    timeoutMs: 30000, // Plus court pour la démo
    maxRetries: 2
  });

  console.log('📋 Configuration chargée:');
  console.log(JSON.stringify(configManager.getConfig(), null, 2));

  // 2. Création de l'agent avec monitoring
  const agent = new ClaudeChatBotAgentEnhanced(configManager.getConfig());
  const monitor = new ClaudeMonitoringService(agent);

  // 3. Test de l'agent avec monitoring
  console.log('\n📊 Test de l\'agent:\n');

  const testMessages = [
    'Bonjour, comment allez-vous?',
    'Pouvez-vous expliquer le machine learning?',
    'Quelle est la capitale de la France?',
    'peu tu recrie la news : Z.ai (@Zai_org)\nGLM-4.6V Series is here' // Test anti-écho
  ];

  for (const message of testMessages) {
    console.log(`\n💬 Envoi: "${message.substring(0, 50)}..."`);

    const start = monitor.trackRequestStart();

    try {
      const response = await agent.chat(message);
      monitor.trackRequestEnd(start.requestId, start.startTime, true);

      console.log(`✅ Réponse: "${response.substring(0, 100)}..."`);
    } catch (error) {
      monitor.trackRequestEnd(start.requestId, start.startTime, false, error as Error);
      console.log(`❌ Erreur: ${error.message}`);
    }
  }

  // 4. Rapport de santé
  console.log('\n🏥 Rapport de santé:\n');
  const healthReport = monitor.generateHealthReport();
  console.log(`Status: ${healthReport.status}`);
  console.log(`Score: ${healthReport.score}/100`);
  console.log(`Problèmes: ${healthReport.issues.join(', ') || 'Aucun'}`);
  console.log(`Recommandations: ${healthReport.recommendations.join(', ') || 'Aucune'}`);

  // 5. Métriques Prometheus
  console.log('\n📊 Métriques Prometheus:\n');
  console.log(monitor.exportPrometheusMetrics());

  return { agent, monitor };
}

/**
 * Démonstration des tests d'intégration
 */
async function demonstrateIntegrationTests() {
  console.log('\n\n🧪 === DÉMONSTRATION TESTS D\'INTÉGRATION ===\n');

  const testSuite = new IntegrationTestSuite();

  // Exécuter tous les tests
  const results = await testSuite.runAllTests();

  console.log(`\n📈 Résultats des tests:`);
  console.log(`Total: ${results.total}`);
  console.log(`Réussis: ${results.passed} ✅`);
  console.log(`Échoués: ${results.failed} ❌`);

  if (results.failed > 0) {
    console.log('\n❌ Tests échoués:');
    results.results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`  - ${r.scenario}: ${r.error?.message}`);
      });
  }

  // Exporter les résultats
  const jsonResults = testSuite.exportResults();
  console.log('\n💾 Résultats exportés (JSON):');
  console.log(jsonResults.substring(0, 500) + '...');

  return results;
}

/**
 * Démonstration des benchmarks
 */
async function demonstrateBenchmarks() {
  console.log('\n\n📊 === DÉMONSTRATION BENCHMARKS ===\n');

  const benchmark = new ClaudeBenchmarkSuite();

  // Test de stress rapide (10 secondes)
  console.log('💪 Test de stress (10 secondes)...\n');
  const stressTest = await benchmark.runStressTest(
    {
      timeoutMs: 5000,
      maxRetries: 2,
      rateLimitMs: 50
    },
    10000 // 10 secondes
  );

  console.log(`\n📈 Résultat du test de stress:`);
  console.log(`Requêtes totales: ${stressTest.result.totalRequests}`);
  console.log(`Succès: ${stressTest.result.successfulRequests}`);
  console.log(`Échecs: ${stressTest.result.failedRequests}`);
  console.log(`Débit: ${stressTest.result.throughput.toFixed(2)} req/s`);
  console.log(`Latence moyenne: ${stressTest.result.latency.avg.toFixed(2)} ms`);
  console.log(`\n💡 Recommandation: ${stressTest.recommendation}`);

  // Benchmarks de configuration (version courte)
  console.log('\n⚡ Benchmarks rapides...\n');
  const quickBenchmarks = [
    {
      name: 'Configuration Agressive',
      config: {
        timeoutMs: 5000,
        maxRetries: 1,
        rateLimitMs: 10
      },
      testParams: {
        concurrentRequests: 5,
        totalRequests: 20,
        requestInterval: 50
      }
    },
    {
      name: 'Configuration Conservatrice',
      config: {
        timeoutMs: 10000,
        maxRetries: 3,
        rateLimitMs: 200
      },
      testParams: {
        concurrentRequests: 2,
        totalRequests: 20,
        requestInterval: 200
      }
    }
  ];

  for (const benchmarkConfig of quickBenchmarks) {
    console.log(`🎯 Test: ${benchmarkConfig.name}`);
    const startTime = Date.now();

    // Simuler les benchmarks
    const agent = new ClaudeChatBotAgentEnhanced(benchmarkConfig.config);
    (agent as any).executeClaudeCommand = async (message: string) => {
      const delay = Math.random() * 300 + 100; // 100-400ms
      await new Promise(resolve => setTimeout(resolve, delay));

      if (Math.random() < 0.05) { // 5% d'erreur
        throw new Error('Simulated error');
      }

      return `Response to: ${message.substring(0, 30)}...`;
    };

    let successful = 0;
    for (let i = 0; i < benchmarkConfig.testParams.totalRequests; i++) {
      try {
        await agent.chat(`Test message ${i}`);
        successful++;
      } catch (error) {
        // Ignorer les erreurs pour le benchmark
      }
    }

    const duration = Date.now() - startTime;
    const throughput = successful / (duration / 1000);

    console.log(`  ✅ Succès: ${successful}/${benchmarkConfig.testParams.totalRequests}`);
    console.log(`  ⚡ Débit: ${throughput.toFixed(2)} req/s`);
    console.log(`  ⏱️ Durée: ${duration}ms\n`);
  }

  return stressTest;
}

/**
 * Démonstration de l'optimisation de configuration
 */
async function demonstrateConfigOptimization() {
  console.log('\n\n⚙️ === DÉMONSTRATION OPTIMISATION CONFIG ===\n');

  const configManager = new ClaudeAgentConfigManager({
    profile: 'production'
  });

  console.log('📋 Configuration initiale:');
  const initialConfig = configManager.getConfig();
  console.log(`Timeout: ${initialConfig.timeoutMs}ms`);
  console.log(`Retries: ${initialConfig.maxRetries}`);
  console.log(`Rate Limit: ${initialConfig.rateLimitMs}ms`);

  // Simuler des métriques de performance
  const performanceMetrics = {
    avgLatency: 5000, // 5s (trop élevé)
    errorRate: 0.15,  // 15% (trop élevé)
    throughput: 20,   // 20 req/s (faible)
    resourceUsage: {
      cpu: 85,        // 85% CPU (élevé)
      memory: 512     // 512MB
    }
  };

  console.log('\n📊 Métriques de performance (problématiques):');
  console.log(`Latence: ${performanceMetrics.avgLatency}ms`);
  console.log(`Taux d'erreur: ${(performanceMetrics.errorRate * 100).toFixed(1)}%`);
  console.log(`Débit: ${performanceMetrics.throughput} req/s`);

  // Optimiser la configuration
  const optimizations = configManager.optimizeForPerformance(performanceMetrics);

  console.log('\n🔧 Optimisations recommandées:');
  console.log(JSON.stringify(optimizations, null, 2));

  // Appliquer les optimisations
  configManager.updateConfig(optimizations);

  console.log('\n✅ Configuration optimisée:');
  const optimizedConfig = configManager.getConfig();
  console.log(`Timeout: ${optimizedConfig.timeoutMs}ms`);
  console.log(`Retries: ${optimizedConfig.maxRetries}`);
  console.log(`Rate Limit: ${optimizedConfig.rateLimitMs}ms`);

  return { initialConfig, optimizedConfig };
}

/**
 * Démonstration du système d'alertes
 */
async function demonstrateAlertSystem() {
  console.log('\n\n🚨 === DÉMONSTRATION SYSTÈME D\'ALERTES ===\n');

  const configManager = new ClaudeAgentConfigManager({
    profile: 'testing',
    timeoutMs: 5000
  });

  const agent = new ClaudeChatBotAgentEnhanced(configManager.getConfig());
  const monitor = new ClaudeMonitoringService(agent);

  // Simuler des erreurs pour déclencher des alertes
  console.log('💥 Simulation d\'erreurs pour déclencher des alertes...\n');

  for (let i = 0; i < 10; i++) {
    const start = monitor.trackRequestStart();

    try {
      // Simuler une erreur
      throw new Error('Simulated network timeout');
    } catch (error) {
      monitor.trackRequestEnd(start.requestId, start.startTime, false, error as Error);
    }
  }

  // Vérifier le rapport de santé (devrait être dégradé)
  const healthReport = monitor.generateHealthReport();

  console.log('🏥 Rapport de santé après erreurs:');
  console.log(`Status: ${healthReport.status}`);
  console.log(`Score: ${healthReport.score}/100`);

  if (healthReport.issues.length > 0) {
    console.log('\n⚠️ Problèmes détectés:');
    healthReport.issues.forEach(issue => {
      console.log(`  - ${issue}`);
    });
  }

  if (healthReport.recommendations.length > 0) {
    console.log('\n💡 Recommandations:');
    healthReport.recommendations.forEach(rec => {
      console.log(`  - ${rec}`);
    });
  }

  // Afficher les événements récents
  console.log('\n📝 Événements récents:');
  const recentEvents = monitor.getRecentEvents(5);
  recentEvents.forEach(event => {
    console.log(`  [${event.level}] ${event.message}`);
  });

  return healthReport;
}

/**
 * Fonction principale de démonstration
 */
async function main() {
  console.log('🚀 === DÉMONSTRATION COMPLÈTE DES AMÉLIORATIONS ROBUSTESSE ===\n');
  console.log('Ce script démontre toutes les améliorations de robustesse implémentées.\n');

  try {
    // 1. Agent robuste avec monitoring
    await demonstrateRobustAgent();

    // 2. Tests d'intégration
    await demonstrateIntegrationTests();

    // 3. Benchmarks
    await demonstrateBenchmarks();

    // 4. Optimisation de configuration
    await demonstrateConfigOptimization();

    // 5. Système d'alertes
    await demonstrateAlertSystem();

    console.log('\n\n✅ === DÉMONSTRATION TERMINÉE AVEC SUCCÈS ===\n');
    console.log('Toutes les fonctionnalités de robustesse ont été démontrées.');
    console.log('Pour utiliser ces améliorations en production, consultez:');
    console.log('📖 docs/ROBUSTNESS_IMPROVEMENTS.md\n');

  } catch (error) {
    console.error('\n❌ Erreur pendant la démonstration:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Exécuter la démonstration si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export pour utilisation dans d'autres modules
export {
  demonstrateRobustAgent,
  demonstrateIntegrationTests,
  demonstrateBenchmarks,
  demonstrateConfigOptimization,
  demonstrateAlertSystem,
  main
};
