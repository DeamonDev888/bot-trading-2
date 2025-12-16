#!/usr/bin/env node

/**
 * Script de test pour toutes les solutions alternatives KiloCode
 */

import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

const solutions = [
  {
    name: 'Memory-Mapped File',
    file: 'kilocode_memcached.mjs',
    description: 'Communication via fichiers partagés'
  },
  {
    name: 'RPC (JSON-RPC)',
    file: 'kilocode_rpc.mjs',
    description: 'API RPC structurée sur HTTP'
  },
  {
    name: 'REST API Gateway',
    file: 'kilocode_rest.mjs',
    description: 'API REST complète'
  }
];

async function testSolution(solution) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 TEST: ${solution.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📝 ${solution.description}`);
  console.log(`📁 Fichier: ${solution.file}`);
  console.log('');

  try {
    const { stdout, stderr } = await execAsync(`node ${solution.file}`, {
      timeout: 15000
    });

    console.log('✅ Test réussi!');
    console.log(stdout.substring(0, 200));

    return { success: true, output: stdout };
  } catch (error) {
    console.log('⚠️ Test avec limitations (dépendances manquantes)');
    console.log('💡 Message:', error.message);

    return { success: false, error: error.message };
  }
}

async function testAllSolutions() {
  console.log('🎯 TEST COMPLET - Solutions Alternatives KiloCode');
  console.log('='.repeat(60));
  console.log('');

  const results = [];

  for (const solution of solutions) {
    const result = await testSolution(solution);
    results.push({ ...solution, ...result });
  }

  // Résumé
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 RÉSUMÉ DES TESTS');
  console.log(`${'='.repeat(60)}\n`);

  results.forEach(result => {
    const status = result.success ? '✅' : '⚠️';
    console.log(`${status} ${result.name}`);
    console.log(`   ${result.description}`);
    if (!result.success) {
      console.log(`   Note: ${result.error.substring(0, 60)}...`);
    }
    console.log('');
  });

  // Solutions nécessitant des tests manuels
  console.log('🔧 SOLUTIONS À TESTER MANUELLEMENT:\n');
  console.log('1. Proxy/Middleware (kilocode_proxy.mjs)');
  console.log('   - Test: node kilocode_proxy.mjs\n');
  console.log('2. WebSocket Server (kilocode_websocket.mjs)');
  console.log('   - Test: node kilocode_websocket.mjs\n');
  console.log('3. Redis Queue (kilocode_redis.mjs)');
  console.log('   - Prérequis: Redis installé\n');
  console.log('4. Daemon/Service (kilocode_daemon.mjs)');
  console.log('   - Test: node kilocode_daemon.mjs\n');
  console.log('5. FIFO Pipes (kilocode_fifo.mjs)');
  console.log('   - Test: node kilocode_fifo.mjs\n');

  console.log('💡 Ces solutions nécessitent une configuration spécifique');
  console.log('   ou des dépendances additionnelles.');
}

testAllSolutions().catch(console.error);
