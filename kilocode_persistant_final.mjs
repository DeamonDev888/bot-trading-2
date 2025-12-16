#!/usr/bin/env node

/**
 * KiloCode avec PERSISTANCE RÉELLE
 * Utilise les sessions pour maintenir la mémoire
 */

import { writeFileSync, unlinkSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { join } from 'path';

const execAsync = promisify(exec);

const SESSION_FILE = './kilocode_persistant_session.json';
let sessionId = null;
let commandLog = [];

/**
 * Lance KiloCode avec un message
 */
async function runKiloCode(message) {
  console.log(`\n📤 Envoi: ${message.substring(0, 50)}...`);

  // Créer un fichier temporaire dans le répertoire courant
  const tmpFile = `./temp-kilo-${Date.now()}.json`;
  const jsonData = { type: 'user', content: message };
  writeFileSync(tmpFile, JSON.stringify(jsonData));

  let command;

  // Utiliser le chemin complet de kilo
  const KILO_PATH = '/c/Users/Deamon/AppData/Roaming/npm/kilo';

  if (sessionId) {
    // Utiliser la session existante avec cat
    command = `bash -c "cat ${tmpFile} | ${KILO_PATH} -i -s ${sessionId} -m ask --auto"`;
  } else {
    // Nouvelle session avec cat
    command = `bash -c "cat ${tmpFile} | ${KILO_PATH} -i -m ask --auto"`;
  }

  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 30000 });

    // Parser les réponses JSON
    const responses = parseKiloCodeOutput(stdout);

    // Extraire le sessionId de la première réponse
    if (responses.length > 0 && responses[0].event === 'session_created') {
      sessionId = responses[0].sessionId;
      console.log(`✅ Session créée: ${sessionId}`);
      saveSession();
    }

    // Afficher la dernière réponse complète
    const lastResponse = responses.filter(r => r.type === 'say' && r.say === 'completion_result' && !r.partial);
    if (lastResponse.length > 0) {
      console.log('\n📥 Réponse:');
      console.log(lastResponse[lastResponse.length - 1].content);
    }

    // Nettoyer le fichier temporaire
    unlinkSync(tmpFile);

    return responses;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    // Nettoyer en cas d'erreur
    try { unlinkSync(tmpFile); } catch {}
    return [];
  }
}

/**
 * Parse la sortie de KiloCode
 */
function parseKiloCodeOutput(output) {
  const lines = output.split('\n');
  const responses = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      // Nettoyer les caractères de contrôle
      const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
      const json = JSON.parse(cleanLine);
      responses.push(json);
      commandLog.push(json);
    } catch (error) {
      // Ignorer les lignes non-JSON
    }
  }

  return responses;
}

/**
 * Sauvegarde la session
 */
function saveSession() {
  const sessionData = {
    sessionId,
    timestamp: new Date().toISOString(),
    commands: commandLog
  };
  writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
}

/**
 * Test de persistance
 */
async function testPersistence() {
  console.log('🧪 TEST DE PERSISTANCE KILOCODE');
  console.log('================================\n');

  // Test 1: Premier message
  console.log('='.repeat(60));
  console.log('TEST 1: Présentation');
  console.log('='.repeat(60));

  await runKiloCode('Mon nom est Claude. Peux-tu te rappeler de moi dans tes réponses?');

  await sleep(3000);

  // Test 2: Vérifier la mémoire
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Vérification mémoire (avec session persistante)');
  console.log('='.repeat(60));

  await runKiloCode('Quel est mon nom?');

  await sleep(3000);

  // Test 3: Analyse ES
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: Analyse ES futures');
  console.log('='.repeat(60));

  await runKiloCode('Fais une analyse rapide du marché ES pour aujourd\'hui.');

  await sleep(3000);

  // Test 4: Suivi avec nom
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: Question personnalisée (utilise mon nom)');
  console.log('='.repeat(60));

  await runKiloCode('Basé sur ton analyse, donne-moi ton sentiment. Utilise mon nom dans ta réponse.');

  await sleep(3000);

  console.log('\n' + '='.repeat(60));
  console.log('✅ TESTS TERMINÉS');
  console.log('='.repeat(60));
  console.log(`\n📊 Statistiques:`);
  console.log(`   - Session ID: ${sessionId || 'N/A'}`);
  console.log(`   - Messages traités: ${commandLog.length}`);
  console.log(`   - Fichier: ${SESSION_FILE}`);
}

/**
 * Utilitaire
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Démarrer
testPersistence().catch(console.error);
