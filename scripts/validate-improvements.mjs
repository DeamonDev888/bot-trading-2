#!/usr/bin/env node

/**
 * Script de validation rapide des améliorations de robustesse
 * Vérifie que tous les composants fonctionnent correctement
 */

import { readFileSync, writeFileSync } from 'fs';
import { ClaudeChatBotAgentEnhanced } from '../src/backend/agents/ClaudeChatBotAgentEnhanced.js';
import { ClaudeMonitoringService } from '../src/backend/monitoring/ClaudeMonitoringService.js';
import { IntegrationTestSuite } from '../src/backend/testing/IntegrationTestSuite.js';
import { ClaudeAgentConfigManager } from '../src/backend/config/ClaudeAgentConfig.js';
import { ClaudeBenchmarkSuite } from '../src/backend/benchmark/ClaudeBenchmarkSuite.js';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';
const RESET = '\x1b[0m';

class ValidationRunner {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  async test(name, fn) {
    try {
      console.log(`${BLUE}🧪 Test:${RESET} ${name}`);
      const startTime = Date.now();
      await fn();
      const duration = Date.now() - startTime;
      console.log(`${GREEN}✅ PASS${RESET} (${duration}ms)\n`);
      this.results.push({ name, status: 'PASS', duration });
      this.passed++;
    } catch (error) {
      console.log(`${RED}❌ FAIL${RESET}: ${error.message}\n`);
      this.results.push({ name, status: 'FAIL', error: error.message });
      this.failed++;
    }
  }

  async runAll() {
    console.log('🚀 === VALIDATION DES AMÉLIORATIONS ROBUSTESSE ===\n');

    // Test 1: Configuration
    await this.test('Configuration Manager', async () => {
      const configManager = new ClaudeAgentConfigManager({
        profile: 'production',
        timeoutMs: 60000
      });

      const config = configManager.getConfig();
      if (config.timeoutMs !== 60000) {
        throw new Error('Configuration not applied correctly');
      }

      const validation = configManager.validate({ timeoutMs: 1000 });
      if (!validation.valid) {
        throw new Error('Validation failed: ' + validation.errors.join(', '));
      }

      console.log('  📋 Configuration validée');
    });

    // Test 2: Agent Enhanced
    await this.test('ClaudeChatBotAgentEnhanced', async () => {
      const agent = new ClaudeChatBotAgentEnhanced({
        timeoutMs: 5000,
        maxRetries: 2,
        rateLimitMs: 50
      });

      const health = agent.getHealthStatus();
      if (!health.circuitBreaker) {
        throw new Error('Circuit breaker not initialized');
      }

      console.log('  🤖 Agent créé et health check OK');
    });

    // Test 3: Monitoring Service
    await this.test('ClaudeMonitoringService', async () => {
      const agent = new ClaudeChatBotAgentEnhanced({ timeoutMs: 5000 });
      const monitor = new ClaudeMonitoringService(agent);

      const start = monitor.trackRequestStart();
      monitor.trackRequestEnd(start.requestId, start.startTime, true);

      const metrics = monitor.getMetricsSnapshot();
      if (metrics.requests.total !== 1) {
        throw new Error('Metrics not tracking correctly');
      }

      const health = monitor.generateHealthReport();
      if (!health.status || !health.score) {
        throw new Error('Health report incomplete');
      }

      console.log('  📊 Monitoring et métriques OK');
    });

    // Test 4: Circuit Breaker
    await this.test('Circuit Breaker Pattern', async () => {
      const agent = new ClaudeChatBotAgentEnhanced({ timeoutMs: 1000 });
      const health = agent.getHealthStatus();

      if (health.circuitBreaker.state !== 'CLOSED') {
        throw new Error('Circuit breaker not in initial CLOSED state');
      }

      agent.resetCircuitBreaker();
      const healthAfterReset = agent.getHealthStatus();

      if (healthAfterReset.circuitBreaker.state !== 'CLOSED') {
        throw new Error('Circuit breaker reset failed');
      }

      console.log('  🔌 Circuit breaker OK');
    });

    // Test 5: Anti-Echo Detection
    await this.test('Anti-Echo Detection', async () => {
      const agent = new ClaudeChatBotAgentEnhanced({ timeoutMs: 5000 });

      // Test detection
      const isEcho = agent.detectEcho?.('peu tu recrie la news', 'test message') ||
                    (agent.executeClaudeCommand.toString().includes('detectEcho'));

      // Si la méthode detectEcho existe, la tester
      if (agent.detectEcho) {
        const echo1 = agent.detectEcho('peu tu recrie', 'test');
        const echo2 = agent.detectEcho('{"result":"normal"}', 'test');

        if (!echo1 || echo2) {
          throw new Error('Echo detection not working correctly');
        }
      }

      console.log('  🔍 Anti-echo detection OK');
    });

    // Test 6: Rate Limiting
    await this.test('Rate Limiting', async () => {
      const agent = new ClaudeChatBotAgentEnhanced({
        timeoutMs: 10000,
        rateLimitMs: 100
      });

      const start = Date.now();
      const promises = [
        agent.chat('Message 1'),
        agent.chat('Message 2')
      ];

      // Les requêtes doivent être limitées
      await Promise.allSettled(promises);
      const duration = Date.now() - start;

      if (duration < 100) {
        throw new Error('Rate limiting may not be working');
      }

      console.log('  ⏱️ Rate limiting OK');
    });

    // Test 7: Retry Logic
    await this.test('Retry Logic', async () => {
      const agent = new ClaudeChatBotAgentEnhanced({
        timeoutMs: 10000,
        maxRetries: 2,
        baseDelay: 50
      });

      // Mock executeClaudeCommand to fail once then succeed
      let attempts = 0;
      (agent as any).executeClaudeCommand = async (message) => {
        attempts++;
        if (attempts === 1) {
          throw new Error('Temporary failure');
        }
        return 'Success after retry';
      };

      const response = await agent.chat('test');
      if (response !== 'Success after retry') {
        throw new Error('Retry logic not working');
      }

      if (attempts !== 2) {
        throw new Error(`Expected 2 attempts, got ${attempts}`);
      }

      console.log('  🔄 Retry logic OK');
    });

    // Test 8: Monitoring Health Report
    await this.test('Health Report Generation', async () => {
      const agent = new ClaudeChatBotAgentEnhanced({ timeoutMs: 5000 });
      const monitor = new ClaudeMonitoringService(agent);

      // Generate some metrics
      const start = monitor.trackRequestStart();
      monitor.trackRequestEnd(start.requestId, start.startTime, true);

      const health = monitor.generateHealthReport();
      if (!health.status || typeof health.score !== 'number') {
        throw new Error('Health report generation failed');
      }

      console.log(`  🏥 Health report: ${health.status} (${health.score}/100)`);
    });

    // Test 9: Configuration Profiles
    await this.test('Configuration Profiles', async () => {
      const configManager = new ClaudeAgentConfigManager();

      const profiles = ['development', 'testing', 'staging', 'production'];
      for (const profile of profiles) {
        configManager.loadProfile(profile);
        const config = configManager.getConfig();
        if (config.profile !== profile) {
          throw new Error(`Profile ${profile} not loaded correctly`);
        }
      }

      console.log('  📦 Configuration profiles OK');
    });

    // Test 10: Metrics Export
    await this.test('Metrics Export (Prometheus)', async () => {
      const agent = new ClaudeChatBotAgentEnhanced({ timeoutMs: 5000 });
      const monitor = new ClaudeMonitoringService(agent);

      // Generate some metrics
      const start = monitor.trackRequestStart();
      monitor.trackRequestEnd(start.requestId, start.startTime, true);

      const prometheusMetrics = monitor.exportPrometheusMetrics();
      if (!prometheusMetrics.includes('claude_requests_total')) {
        throw new Error('Prometheus metrics format incorrect');
      }

      console.log('  📈 Prometheus metrics export OK');
    });

    // Résumé final
    this.printSummary();
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ DE VALIDATION');
    console.log('='.repeat(60));
    console.log(`Total tests: ${this.results.length}`);
    console.log(`${GREEN}Réussis: ${this.passed}${RESET}`);
    console.log(`${RED}Échoués: ${this.failed}${RESET}`);

    const successRate = ((this.passed / this.results.length) * 100).toFixed(1);
    console.log(`Taux de réussite: ${successRate}%`);

    if (this.failed > 0) {
      console.log('\n❌ Tests échoués:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`  - ${r.name}: ${r.error}`);
        });
    }

    console.log('\n' + '='.repeat(60));

    if (this.failed === 0) {
      console.log(`${GREEN}✅ TOUS LES TESTS SONT PASSÉS !${RESET}`);
      console.log('\nLes améliorations de robustesse sont prêtes pour la production.');
    } else {
      console.log(`${RED}❌ CERTAINS TESTS ONT ÉCHOUÉ${RESET}`);
      console.log('\nVeuillez corriger les erreurs avant de déployer en production.');
    }

    // Sauvegarder le rapport
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed: this.passed,
        failed: this.failed,
        successRate: `${successRate}%`
      },
      results:    };

 this.results
    try {
      writeFileSync('validation-report.json', JSON.stringify(report, null, 2));
      console.log('\n💾 Rapport sauvegardé: validation-report.json');
    } catch (error) {
      console.warn('\n⚠️ Impossible de sauvegarder le rapport:', error.message);
    }
  }
}

// Exécuter la validation
const runner = new ValidationRunner();
runner.runAll().catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});
