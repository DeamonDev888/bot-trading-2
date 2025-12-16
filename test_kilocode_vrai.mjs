#!/usr/bin/env node

/**
 * TEST VRAI avec KiloCode CLI installé
 * Utilise les bonnes options découvertes
 */

import { spawn } from 'child_process';

console.log('🧪 TEST VRAI - KiloCode avec JSON-IO\n');

const sessionId = 'test-persistance-' + Date.now();

const kil = spawn('kilo', [
  '-i',                    // Bidirectional JSON mode
  '-s', sessionId,         // Session ID pour persistance
  '-m', 'ask',             // Mode ask
  '--auto',                // Autonomous mode
  '--timeout', '60'        // 60 secondes timeout
], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let buffer = '';
let messageCount = 0;

console.log(`🚀 Lancement avec session ID: ${sessionId}\n`);

kil.stdout.on('data', (data) => {
  const str = data.toString();
  buffer += str;

  // Traiter ligne par ligne
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const json = JSON.parse(line);
      handleResponse(json);
    } catch (error) {
      console.log('📄 Ligne non-JSON:', line);
    }
  }
});

kil.stderr.on('data', (data) => {
  console.log('🔍 Debug:', data.toString().trim());
});

kil.on('error', (error) => {
  console.error('❌ Erreur:', error.message);
});

function handleResponse(response) {
  messageCount++;
  console.log(`\n📥 Message ${messageCount}:`);
  console.log(JSON.stringify(response, null, 2));
}

// Envoyer les messages
async function runTests() {
  await sleep(1000);

  // Test 1: Premier message
  console.log('\n' + '='.repeat(60));
  console.log('📤 TEST 1: Premier message');
  console.log('='.repeat(60));

  sendMessage('Bonjour! Mon nom est Claude. Peux-tu te rappeler de moi?');

  await sleep(5000);

  // Test 2: Vérifier la mémoire
  console.log('\n' + '='.repeat(60));
  console.log('📤 TEST 2: Test de mémoire');
  console.log('='.repeat(60));

  sendMessage('Quel est mon nom?');

  await sleep(5000);

  // Test 3: Analyse financière
  console.log('\n' + '='.repeat(60));
  console.log('📤 TEST 3: Analyse ES futures');
  console.log('='.repeat(60));

  sendMessage('Fais une analyse rapide du marché ES (E-mini S&P 500) pour aujourd\'hui. Contexte: inflation en baisse, taux stables.');

  await sleep(8000);

  // Test 4: Suivi
  console.log('\n' + '='.repeat(60));
  console.log('📤 TEST 4: Question de suivi');
  console.log('='.repeat(60));

  sendMessage('Basé sur ton analyse, quel est ton sentiment général? Optimiste ou pessimiste?');

  await sleep(5000);

  console.log('\n' + '='.repeat(60));
  console.log('✅ TESTS TERMINÉS');
  console.log('='.repeat(60));
  console.log(`📊 Total messages reçus: ${messageCount}`);

  // Fermer proprement
  kil.stdin.end();
  setTimeout(() => kil.kill(), 1000);
}

function sendMessage(content) {
  const message = {
    type: 'user',
    content: content,
    timestamp: new Date().toISOString()
  };

  console.log(`\n📤 Envoi: ${content.substring(0, 50)}...`);

  try {
    kil.stdin.write(JSON.stringify(message) + '\n');
  } catch (error) {
    console.error('❌ Erreur envoi:', error.message);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Démarrer les tests
runTests().catch(error => {
  console.error('💥 Erreur:', error);
  kil.kill();
});
