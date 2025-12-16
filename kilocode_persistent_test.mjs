#!/usr/bin/env node

/**
 * KiloCode Persistent Session Tester
 * Teste la persistance de KiloCode en mode JSON bidirectionnel
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const SESSION_FILE = './kilocode_session.json';
const HISTORY_DIR = './kilocode_history';

// Configuration
const KILOCODE_MODEL = 'x-ai/grok-code-fast-1';
const TIMEOUT = 120000; // 2 minutes

/**
 * Charge la session existante ou crée une nouvelle
 */
function loadSession() {
  if (existsSync(SESSION_FILE)) {
    try {
      const session = JSON.parse(readFileSync(SESSION_FILE, 'utf-8'));
      console.log('✅ Session chargée:', session.messages.length, 'messages');
      return session;
    } catch (error) {
      console.warn('⚠️ Erreur lors du chargement de la session:', error.message);
    }
  }

  // Créer le dossier d'historique
  if (!existsSync(HISTORY_DIR)) {
    mkdirSync(HISTORY_DIR, { recursive: true });
  }

  return {
    id: Date.now().toString(),
    created: new Date().toISOString(),
    messages: []
  };
}

/**
 * Sauvegarde la session
 */
function saveSession(session) {
  writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2));
  console.log('💾 Session sauvegardée');
}

/**
 * Lance KiloCode en mode JSON persistant
 */
function startKiloCodeSession() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Démarrage de KiloCode en mode JSON persistant...');
    console.log(`📝 Modèle: ${KILOCODE_MODEL}`);
    console.log(`💬 Mode: Bidirectional JSON (sans TUI)\n`);

    // Vérifier si 'kil' est disponible
    const kilProcess = spawn('kil', [
      '-i',                    // Mode JSON bidirectionnel
      '--model', KILOCODE_MODEL,
      '--session-id', 'test-session-' + Date.now()
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let buffer = '';
    let isReady = false;
    const messages = [];

    kilProcess.stdout.on('data', (data) => {
      buffer += data.toString();

      // Traiter les lignes complètes
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Garder la dernière ligne incomplète

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const response = JSON.parse(line);
          handleResponse(response);
          messages.push(response);
        } catch (error) {
          console.error('❌ Erreur parsing JSON:', line);
        }
      }
    });

    kilProcess.stderr.on('data', (data) => {
      const error = data.toString().trim();
      if (error) {
        console.log('🔍 Debug:', error);
      }
    });

    kilProcess.on('error', (error) => {
      console.error('❌ Erreur lancement KiloCode:', error);
      reject(error);
    });

    kilProcess.on('exit', (code) => {
      console.log(`\n⏹️ KiloCode s\'est arrêté avec le code: ${code}`);
      resolve({ code, messages });
    });

    // Fonction pour envoyer un message
    function sendMessage(content, metadata = {}) {
      const message = {
        type: 'user',
        content: content,
        timestamp: new Date().toISOString(),
        ...metadata
      };

      console.log(`\n📤 Envoi message: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);

      kilProcess.stdin.write(JSON.stringify(message) + '\n');
      return message;
    }

    // Fonction pour gérer les réponses
    function handleResponse(response) {
      if (response.type === 'ready') {
        isReady = true;
        console.log('✅ KiloCode prêt!');
        return;
      }

      if (response.type === 'response') {
        console.log('\n📥 Réponse reçue:');
        if (response.content) {
          console.log(response.content);
        }
        if (response.metadata) {
          console.log('📊 Métadonnées:', response.metadata);
        }
      }

      if (response.type === 'error') {
        console.error('❌ Erreur KiloCode:', response.error);
      }
    }

    // Fonction pour fermer proprement
    function close() {
      console.log('\n🔚 Fermeture de la session...');
      kilProcess.stdin.end();
    }

    // Exposer les fonctions
    resolve({
      process: kilProcess,
      sendMessage,
      close,
      isReady: () => isReady
    });
  });
}

/**
 * Test de persistance avec plusieurs messages
 */
async function testPersistence() {
  console.log('='.repeat(60));
  console.log('🧪 TEST DE PERSISTANCE KILOCODE');
  console.log('='.repeat(60) + '\n');

  const session = loadSession();

  try {
    // Démarrer KiloCode
    const kilSession = await startKiloCodeSession();

    // Attendre que KiloCode soit prêt
    while (!kilSession.isReady()) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n' + '-'.repeat(60));
    console.log('📝 TEST 1: Premier message');
    console.log('-'.repeat(60));

    // Test 1: Premier message
    const msg1 = kilSession.sendMessage(
      'Bonjour! Je suis un test de persistance. Peux-tu te rappeler de moi dans les messages suivants?',
      { test: 'message-1' }
    );
    session.messages.push(msg1);

    await sleep(3000);

    console.log('\n' + '-'.repeat(60));
    console.log('📝 TEST 2: Deuxième message (test de mémoire)');
    console.log('-'.repeat(60));

    // Test 2: Deuxième message - vérifier la mémoire
    const msg2 = kilSession.sendMessage(
      'Quel était mon premier message? Peux-tu me le répéter?',
      { test: 'message-2' }
    );
    session.messages.push(msg2);

    await sleep(3000);

    console.log('\n' + '-'.repeat(60));
    console.log('📝 TEST 3: Troisième message (analyse simple)');
    console.log('-'.repeat(60));

    // Test 3: Troisième message
    const msg3 = kilSession.sendMessage(
      'Fais une analyse simple du marché ES (E-mini S&P 500) pour aujourd\'hui. ' +
      'Contexte: nous sommes en 2025, inflation en baisse, taux stables.',
      { test: 'message-3' }
    );
    session.messages.push(msg3);

    await sleep(5000);

    console.log('\n' + '-'.repeat(60));
    console.log('📝 TEST 4: Quatrième message (suivi)');
    console.log('-'.repeat(60));

    // Test 4: Quatrième message
    const msg4 = kilSession.sendMessage(
      'Basé sur ton analyse précédente, quel est ton sentiment général? Optimiste ou pessimiste?',
      { test: 'message-4' }
    );
    session.messages.push(msg4);

    await sleep(3000);

    console.log('\n' + '-'.repeat(60));
    console.log('📝 TEST 5: Message JSON complexe');
    console.log('-'.repeat(60));

    // Test 5: Message avec données structurées
    const msg5 = kilSession.sendMessage(
      JSON.stringify({
        type: 'structured_data',
        data: {
          symbol: 'ES',
          price: 4750.50,
          volume: 1500000,
          sentiment: 'bullish'
        },
        question: 'Que penses-tu de ces données?'
      }),
      { test: 'message-5' }
    );
    session.messages.push(msg5);

    await sleep(5000);

    console.log('\n' + '='.repeat(60));
    console.log('✅ TESTS TERMINÉS');
    console.log('='.repeat(60));

    // Sauvegarder la session
    session.ended = new Date().toISOString();
    session.totalMessages = session.messages.length;
    saveSession(session);

    // Sauvegarder aussi dans l'historique
    const historyFile = join(HISTORY_DIR, `session-${session.id}.json`);
    writeFileSync(historyFile, JSON.stringify(session, null, 2));
    console.log(`📁 Historique sauvegardé: ${historyFile}`);

    // Fermer proprement
    kilSession.close();

    // Attendre la fermeture
    await sleep(1000);

  } catch (error) {
    console.error('❌ Erreur durant le test:', error);
    process.exit(1);
  }
}

/**
 * Affiche l'aide
 */
function showHelp() {
  console.log(`
KiloCode Persistent Session Tester
===================================

Usage: node kilocode_persistent_test.mjs [options]

Options:
  --model MODEL     Modèle KiloCode (défaut: ${KILOCODE_MODEL})
  --timeout MS     Timeout en ms (défaut: ${TIMEOUT})
  --help, -h       Affiche cette aide

Fichiers générés:
  - ./kilocode_session.json    Session active
  - ./kilocode_history/        Historique des sessions

Exemples:
  node kilocode_persistent_test.mjs
  node kilocode_persistent_test.mjs --model x-ai/grok-beta
  node kilocode_persistent_test.mjs --timeout 60000
`);
}

/**
 * Utilitaire pour attendre
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Point d'entrée
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  // Parser les arguments
  const modelIndex = args.indexOf('--model');
  const timeoutIndex = args.indexOf('--timeout');

  if (modelIndex !== -1 && modelIndex + 1 < args.length) {
    console.log('🔧 Modèle personnalisé:', args[modelIndex + 1]);
  }

  if (timeoutIndex !== -1 && timeoutIndex + 1 < args.length) {
    console.log('🔧 Timeout personnalisé:', args[timeoutIndex + 1], 'ms');
  }

  await testPersistence();
}

// Exécuter
main().catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});
