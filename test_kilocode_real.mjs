#!/usr/bin/env node

/**
 * Test RÉEL de la persistance KiloCode
 * Ce script log toutes les commandes JSON envoyées pour vérifier la persistance
 */

import { spawn } from 'child_process';
import { writeFileSync, existsSync } from 'fs';

const LOG_FILE = './kilocode_commands_log.json';

let commandLog = [];

async function testRealKiloCode() {
  console.log('🔍 TEST RÉEL - Vérification des commandes KiloCode\n');

  console.log('📋 Format des commandes envoyées:\n');

  // Commande 1
  const cmd1 = {
    type: 'user',
    content: 'Bonjour! Premier message test',
    timestamp: new Date().toISOString(),
    test: 'message-1'
  };
  logCommand(cmd1);
  displayCommand(cmd1, 1);

  // Commande 2
  const cmd2 = {
    type: 'user',
    content: 'Quel était mon premier message?',
    timestamp: new Date().toISOString(),
    test: 'message-2'
  };
  logCommand(cmd2);
  displayCommand(cmd2, 2);

  // Commande 3
  const cmd3 = {
    type: 'user',
    content: 'Analyse ES futures 2025',
    timestamp: new Date().toISOString(),
    test: 'message-3'
  };
  logCommand(cmd3);
  displayCommand(cmd3, 3);

  console.log('\n' + '='.repeat(60));
  console.log('💾 Log des commandes sauvegardé dans:', LOG_FILE);
  console.log('='.repeat(60) + '\n');

  // Vérifier si kil est installé
  let hasKiloCode = false;
  try {
    require('child_process').execSync('where kil', { stdio: 'ignore' });
    console.log('✅ KiloCode CLI trouvé\n');
    hasKiloCode = true;
  } catch {
    console.log('❌ KiloCode CLI non installé');
    console.log('Installation: npm install -g @kilocode/cli\n');
  }

  if (!hasKiloCode) {
    console.log('⚠️ Impossible de tester la persistance réelle sans KiloCode CLI');
    console.log('📊 Mais les commandes ci-dessus montrent le format exact utilisé\n');
    return;
  }

  // Tenter de lancer KiloCode pour voir les erreurs réelles
  console.log('🚀 Tentative de lancement...\n');

  try {
    const kil = spawn('kil', [
      '-i',
      '--model', 'x-ai/grok-code-fast-1',
      '--session-id', 'test-' + Date.now()
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let buffer = '';

    kil.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        console.log('📥 Réponse KiloCode:', line);
      }
    });

    kil.stderr.on('data', (data) => {
      console.log('🔍 Debug:', data.toString());
    });

    // Envoyer les commandes une par une
    for (let i = 0; i < commandLog.length; i++) {
      const cmd = commandLog[i];
      console.log(`\n📤 Envoi commande ${i + 1}:`);
      const jsonStr = JSON.stringify(cmd);
      console.log(jsonStr);

      kil.stdin.write(jsonStr + '\n');

      await sleep(2000);
    }

    await sleep(2000);
    kil.stdin.end();

    setTimeout(() => kil.kill(), 1000);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

function logCommand(command) {
  commandLog.push(command);
  writeFileSync(LOG_FILE, JSON.stringify(commandLog, null, 2));
}

function displayCommand(cmd, num) {
  console.log(`Commande ${num}:`);
  console.log(JSON.stringify(cmd, null, 2));
  console.log();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

testRealKiloCode().catch(console.error);
