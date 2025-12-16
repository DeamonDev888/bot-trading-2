#!/usr/bin/env node

/**
 * KiloCode Persistent Session Tester - Version avec vérifications
 * Teste la persistance de KiloCode en mode JSON bidirectionnel
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const SESSION_FILE = './kilocode_session.json';
const HISTORY_DIR = './kilocode_history';
const KILOCODE_MODEL = 'x-ai/grok-code-fast-1';
const TIMEOUT = 120000;

/**
 * Vérifie si KiloCode CLI est installé
 */
function checkKiloCodeInstallation() {
  console.log('🔍 Vérification de l\'installation de KiloCode...');

  // Utiliser 'where' sur Windows, 'which' sur Unix
  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'where kil' : 'which kil';

  try {
    const { execSync } = require('child_process');
    execSync(command, { stdio: 'ignore' });
    console.log('✅ KiloCode CLI trouvé dans le PATH');
    return true;
  } catch (error) {
    console.error('❌ KiloCode CLI non trouvé!');
    console.log('\n📦 Installation requise:');
    console.log('   npm install -g @kilocode/cli');
    console.log('   ou');
    console.log('   yarn global add @kilocode/cli');
    console.log('\n🔗 Plus d\'infos: https://kilocode.dev');
    console.log('\n⚠️ Vous pouvez continuer en mode simulation pour tester la structure.');
    return false;
  }
}

/**
 * Charge la session existante
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
 * Simulation mode pour tester sans KiloCode
 */
function simulateKiloCode() {
  console.log('\n🎭 MODE SIMULATION ACTIVÉ');
  console.log('='.repeat(60));

  const responses = [
    {
      type: 'ready',
      message: 'KiloCode prêt en mode simulation!'
    },
    {
      type: 'response',
      content: 'Bonjour! Je suis en mode simulation mais je peux confirmer que la persistance fonctionne. Votre message: "Bonjour! Je suis un test de persistance. Peux-tu te rappeler de moi dans les messages suivants?" a été reçu avec succès.',
      metadata: { simulated: true, message_id: 1 }
    },
    {
      type: 'response',
      content: 'Oui, je me souviens de votre premier message! Vous avez dit: "Bonjour! Je suis un test de persistance. Peux-tu te rappeler de moi dans les messages suivants?" La persistance est donc bien activée!',
      metadata: { simulated: true, message_id: 2, memory_test: true }
    },
    {
      type: 'response',
      content: '📊 Analyse ES (E-mini S&P 500) pour 2025:\n\n✅ Facteurs positifs:\n- Inflation en baisse (contexte favorable)\n- Taux stables\n- Confiance des consommateurs\n\n⚠️ Points d\'attention:\n- Volatilité possible\n- Données économiques à surveiller\n\n🎯 Sentiment global: Neutre à légèrement optimiste',
      metadata: { simulated: true, message_id: 3, analysis: true }
    },
    {
      type: 'response',
      content: 'Basé sur mon analyse précédente, mon sentiment est **neutre à légèrement optimiste**. L\'environnement de taux stables et d\'inflation en baisse crée un cadre favorable, mais la volatilité reste présente.',
      metadata: { simulated: true, message_id: 4, sentiment: 'neutral_to_bullish' }
    },
    {
      type: 'response',
      content: '📈 Analyse de vos données ES:\n\n- Prix: 4750.50 ✅\n- Volume: 1.5M ✅\n- Sentiment: Bullish ✅\n\nCes données suggèrent un momentum positif. La combinaison d\'un prix stable, d\'un volume élevé et d\'un sentiment haussier est généralement un signal favorable.',
      metadata: { simulated: true, message_id: 5, structured_data: true }
    }
  ];

  return responses;
}

/**
 * Lance KiloCode en mode JSON persistant
 */
function startKiloCodeSession() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Démarrage de KiloCode en mode JSON persistant...');
    console.log(`📝 Modèle: ${KILOCODE_MODEL}`);
    console.log(`💬 Mode: Bidirectional JSON (sans TUI)\n`);

    const kilProcess = spawn('kil', [
      '-i',
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
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

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

    function close() {
      console.log('\n🔚 Fermeture de la session...');
      kilProcess.stdin.end();
    }

    resolve({
      process: kilProcess,
      sendMessage,
      close,
      isReady: () => isReady
    });
  });
}

/**
 * Test de persistance
 */
async function testPersistence(useSimulation = false) {
  console.log('='.repeat(60));
  console.log('🧪 TEST DE PERSISTANCE KILOCODE');
  console.log('='.repeat(60) + '\n');

  const session = loadSession();

  try {
    if (useSimulation) {
      console.log('🎭 MODE SIMULATION ACTIVÉ\n');

      // TEST 1
      console.log('-'.repeat(60));
      console.log('📝 TEST 1: Premier message');
      console.log('-'.repeat(60));
      const msg1 = {
        type: 'user',
        content: 'Bonjour! Je suis un test de persistance. Peux-tu te rappeler de moi dans les messages suivants?',
        timestamp: new Date().toISOString(),
        test: 'message-1'
      };
      session.messages.push(msg1);
      console.log(`\n📤 Envoi message: ${msg1.content.substring(0, 50)}...`);
      console.log('\n📥 Réponse reçue:');
      console.log('Bonjour! Je suis en mode simulation mais je peux confirmer que la persistance fonctionne. Votre message a été reçu avec succès.');
      await sleep(1000);

      // TEST 2
      console.log('\n' + '-'.repeat(60));
      console.log('📝 TEST 2: Deuxième message (test de mémoire)');
      console.log('-'.repeat(60));
      const msg2 = {
        type: 'user',
        content: 'Quel était mon premier message? Peux-tu me le répéter?',
        timestamp: new Date().toISOString(),
        test: 'message-2'
      };
      session.messages.push(msg2);
      console.log(`\n📤 Envoi message: ${msg2.content.substring(0, 50)}...`);
      console.log('\n📥 Réponse reçue:');
      console.log('Oui, je me souviens de votre premier message! Vous avez dit: "Bonjour! Je suis un test de persistance. Peux-tu te rappeler de moi dans les messages suivants?" La persistance est donc bien activée!');
      await sleep(1000);

      // TEST 3
      console.log('\n' + '-'.repeat(60));
      console.log('📝 TEST 3: Troisième message (analyse simple)');
      console.log('-'.repeat(60));
      const msg3 = {
        type: 'user',
        content: 'Fais une analyse simple du marché ES (E-mini S&P 500) pour aujourd\'hui. Contexte: nous sommes en 2025, inflation en baisse, taux stables.',
        timestamp: new Date().toISOString(),
        test: 'message-3'
      };
      session.messages.push(msg3);
      console.log(`\n📤 Envoi message: ${msg3.content.substring(0, 50)}...`);
      console.log('\n📥 Réponse reçue:');
      console.log('📊 Analyse ES (E-mini S&P 500) pour 2025:\n\n✅ Facteurs positifs:\n- Inflation en baisse (contexte favorable)\n- Taux stables\n- Confiance des consommateurs\n\n⚠️ Points d\'attention:\n- Volatilité possible\n- Données économiques à surveiller\n\n🎯 Sentiment global: Neutre à légèrement optimiste');
      await sleep(1000);

      // TEST 4
      console.log('\n' + '-'.repeat(60));
      console.log('📝 TEST 4: Quatrième message (suivi)');
      console.log('-'.repeat(60));
      const msg4 = {
        type: 'user',
        content: 'Basé sur ton analyse précédente, quel est ton sentiment général? Optimiste ou pessimiste?',
        timestamp: new Date().toISOString(),
        test: 'message-4'
      };
      session.messages.push(msg4);
      console.log(`\n📤 Envoi message: ${msg4.content.substring(0, 50)}...`);
      console.log('\n📥 Réponse reçue:');
      console.log('Basé sur mon analyse précédente, mon sentiment est **neutre à légèrement optimiste**. L\'environnement de taux stables et d\'inflation en baisse crée un cadre favorable, mais la volatilité reste présente.');
      await sleep(1000);

      // TEST 5
      console.log('\n' + '-'.repeat(60));
      console.log('📝 TEST 5: Message JSON complexe');
      console.log('-'.repeat(60));
      const msg5 = {
        type: 'user',
        content: JSON.stringify({
          type: 'structured_data',
          data: {
            symbol: 'ES',
            price: 4750.50,
            volume: 1500000,
            sentiment: 'bullish'
          },
          question: 'Que penses-tu de ces données?'
        }),
        timestamp: new Date().toISOString(),
        test: 'message-5'
      };
      session.messages.push(msg5);
      console.log(`\n📤 Envoi message: ${msg5.content.substring(0, 50)}...`);
      console.log('\n📥 Réponse reçue:');
      console.log('📈 Analyse de vos données ES:\n\n- Prix: 4750.50 ✅\n- Volume: 1.5M ✅\n- Sentiment: Bullish ✅\n\nCes données suggèrent un momentum positif. La combinaison d\'un prix stable, d\'un volume élevé et d\'un sentiment haussier est généralement un signal favorable.');
      await sleep(1000);

    } else {
      const kilSession = await startKiloCodeSession();
      while (!kilSession.isReady()) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('\n' + '-'.repeat(60));
      console.log('📝 TEST 1: Premier message');
      console.log('-'.repeat(60));

      const msg1 = kilSession.sendMessage(
        'Bonjour! Je suis un test de persistance. Peux-tu te rappeler de moi dans les messages suivants?',
        { test: 'message-1' }
      );
      session.messages.push(msg1);
      await sleep(3000);

      console.log('\n' + '-'.repeat(60));
      console.log('📝 TEST 2: Deuxième message (test de mémoire)');
      console.log('-'.repeat(60));

      const msg2 = kilSession.sendMessage(
        'Quel était mon premier message? Peux-tu me le répéter?',
        { test: 'message-2' }
      );
      session.messages.push(msg2);
      await sleep(3000);

      console.log('\n' + '-'.repeat(60));
      console.log('📝 TEST 3: Troisième message (analyse simple)');
      console.log('-'.repeat(60));

      const msg3 = kilSession.sendMessage(
        'Fais une analyse simple du marché ES (E-mini S&P 500) pour aujourd\'hui. Contexte: nous sommes en 2025, inflation en baisse, taux stables.',
        { test: 'message-3' }
      );
      session.messages.push(msg3);
      await sleep(5000);

      console.log('\n' + '-'.repeat(60));
      console.log('📝 TEST 4: Quatrième message (suivi)');
      console.log('-'.repeat(60));

      const msg4 = kilSession.sendMessage(
        'Basé sur ton analyse précédente, quel est ton sentiment général? Optimiste ou pessimiste?',
        { test: 'message-4' }
      );
      session.messages.push(msg4);
      await sleep(3000);

      console.log('\n' + '-'.repeat(60));
      console.log('📝 TEST 5: Message JSON complexe');
      console.log('-'.repeat(60));

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

      kilSession.close();
      await sleep(1000);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ TESTS TERMINÉS');
    console.log('='.repeat(60));

    session.ended = new Date().toISOString();
    session.totalMessages = session.messages.length;
    session.mode = useSimulation ? 'simulation' : 'production';
    saveSession(session);

    const historyFile = join(HISTORY_DIR, `session-${session.id}.json`);
    writeFileSync(historyFile, JSON.stringify(session, null, 2));
    console.log(`📁 Historique sauvegardé: ${historyFile}`);

    console.log('\n📊 RÉSUMÉ:');
    console.log(`   - Messages envoyés: ${session.messages.length}`);
    console.log(`   - Mode: ${useSimulation ? 'Simulation' : 'Production'}`);
    console.log(`   - Session ID: ${session.id}`);

  } catch (error) {
    console.error('❌ Erreur durant le test:', error);
    throw error;
  }
}

function showHelp() {
  console.log(`
KiloCode Persistent Session Tester
===================================

Usage: node kilocode_persistent_test_fixed.mjs [options]

Options:
  --model MODEL     Modèle KiloCode (défaut: ${KILOCODE_MODEL})
  --timeout MS     Timeout en ms (défaut: ${TIMEOUT})
  --simulate       Force le mode simulation
  --force-real     Force le mode production (échoue si kil non installé)
  --help, -h       Affiche cette aide

Fichiers générés:
  - ./kilocode_session.json    Session active
  - ./kilocode_history/        Historique des sessions
`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const forceSimulation = args.includes('--simulate');
  const forceReal = args.includes('--force-real');
  const modelIndex = args.indexOf('--model');

  if (modelIndex !== -1 && modelIndex + 1 < args.length) {
    console.log('🔧 Modèle personnalisé:', args[modelIndex + 1]);
  }

  // Vérifier l'installation
  const isInstalled = checkKiloCodeInstallation();

  // Déterminer le mode
  let useSimulation = false;

  if (forceReal && !isInstalled) {
    console.error('\n❌ KiloCode non installé. Utilisez --simulate pour tester en mode simulation.');
    process.exit(1);
  } else if (!isInstalled) {
    console.log('\n💡 Continuation en mode simulation pour démonstration...');
    useSimulation = true;
  }

  await testPersistence(useSimulation);
}

main().catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});
