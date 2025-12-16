#!/usr/bin/env node

/**
 * Test de persistance VRAIE avec KiloCode
 * Utilise le format JSON correct découvert
 */

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

const SESSION_FILE = './test_persistance_log.json';
let log = [];

console.log('🧪 TEST DE PERSISTANCE VRAIE\n');

const kil = spawn('cmd.exe', [
  '/c',
  'test_kilo_cmd.bat',
  '-i',                    // JSON bidirectional
  '-m', 'ask',             // Mode ask
  '--auto'                 // Autonomous mode
], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let buffer = '';

kil.stdout.on('data', (data) => {
  const str = data.toString();
  buffer += str;

  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const json = JSON.parse(line);
      handleResponse(json);
    } catch (error) {
      // Ignorer les caractères de contrôle
      if (!line.startsWith('\x1b[')) {
        console.log('📄 Non-JSON:', line.substring(0, 50));
      }
    }
  }
});

kil.stderr.on('data', (data) => {
  const str = data.toString().trim();
  if (str && !str.startsWith('\x1b[')) {
    console.log('🔍 Debug:', str);
  }
});

function handleResponse(response) {
  log.push(response);
  writeFileSync(SESSION_FILE, JSON.stringify(log, null, 2));

  if (response.content) {
    console.log('\n📥 Réponse:');
    console.log(response.content);
  }

  if (response.type === 'say' && response.say === 'completion_result') {
    console.log('\n✅ Réponse complète reçue');
  }
}

async function runTests() {
  await sleep(2000);

  // Test 1
  console.log('\n' + '='.repeat(60));
  console.log('📤 TEST 1: Présentation');
  console.log('='.repeat(60));

  sendMessage('Mon nom est Claude. Peux-tu te rappeler de moi dans tes réponses suivantes?');

  await sleep(8000);

  // Test 2
  console.log('\n' + '='.repeat(60));
  console.log('📤 TEST 2: Vérification mémoire');
  console.log('='.repeat(60));

  sendMessage('Quel est mon nom?');

  await sleep(8000);

  // Test 3
  console.log('\n' + '='.repeat(60));
  console.log('📤 TEST 3: Analyse ES futures');
  console.log('='.repeat(60));

  sendMessage('Fais une analyse rapide du marché ES pour aujourd\'hui.');

  await sleep(10000);

  // Test 4
  console.log('\n' + '='.repeat(60));
  console.log('📤 TEST 4: Suivi personnalisé');
  console.log('='.repeat(60));

  sendMessage('Basé sur ton analyse, donne-moi ton sentiment (utilise mon nom dans la réponse).');

  await sleep(8000);

  console.log('\n' + '='.repeat(60));
  console.log('✅ TESTS TERMINÉS');
  console.log('='.repeat(60));
  console.log(`📊 Messages logués: ${log.length}`);
  console.log(`💾 Log sauvegardé: ${SESSION_FILE}`);

  kil.stdin.end();
  setTimeout(() => kil.kill(), 1000);
}

function sendMessage(content) {
  const message = {
    type: 'user',
    content: content
  };

  console.log(`\n📤 Envoi: ${content}`);

  try {
    kil.stdin.write(JSON.stringify(message) + '\n');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

runTests().catch(error => {
  console.error('💥 Erreur:', error);
  kil.kill();
});
