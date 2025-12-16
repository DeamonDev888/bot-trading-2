#!/usr/bin/env node

/**
 * Claude CLI avec PERSISTANCE RÉELLE
 * Utilise les sessions pour maintenir la mémoire
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const SESSION_FILE = './claude_persistant_session.json';
let sessionId = null;
let commandLog = [];

/**
 * Lance Claude avec un message
 */
async function runClaude(message) {
  console.log(`\n📤 Envoi: ${message.substring(0, 50)}...`);

  let command;

  if (sessionId) {
    // Utiliser la session existante
    command = `bash -c "echo '${message.replace(/'/g, "'\\''")}' | claude -p --output-format json --session-id ${sessionId}"`;
  } else {
    // Nouvelle session
    command = `bash -c "echo '${message.replace(/'/g, "'\\''")}' | claude -p --output-format json"`;
  }

  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 60000 });

    // Parser les réponses JSON
    const response = parseClaudeOutput(stdout);

    if (response.session_id && !sessionId) {
      sessionId = response.session_id;
      console.log(`✅ Session créée: ${sessionId}`);
      saveSession();
    }

    // Afficher la réponse
    if (response.result) {
      console.log('\n📥 Réponse:');
      console.log(response.result);
    }

    // Afficher le coût
    if (response.total_cost_usd) {
      console.log(`\n💰 Coût: $${response.total_cost_usd.toFixed(4)}`);
    }

    return response;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return null;
  }
}

/**
 * Parse la sortie de Claude
 */
function parseClaudeOutput(output) {
  try {
    const json = JSON.parse(output);
    commandLog.push(json);
    return json;
  } catch (error) {
    console.error('❌ Erreur parsing JSON:', error.message);
    return {};
  }
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
  const fs = require('fs');
  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
}

/**
 * Test de persistance
 */
async function testPersistence() {
  console.log('🧪 TEST DE PERSISTANCE CLAUDE');
  console.log('================================\n');

  // Test 1: Premier message
  console.log('='.repeat(60));
  console.log('TEST 1: Présentation');
  console.log('='.repeat(60));

  await runClaude('Mon nom est Claude. Peux-tu te rappeler de moi dans tes réponses?');

  await sleep(3000);

  // Test 2: Vérifier la mémoire
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Vérification mémoire (avec session persistante)');
  console.log('='.repeat(60));

  await runClaude('Quel est mon nom?');

  await sleep(3000);

  // Test 3: Analyse ES
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: Analyse ES futures');
  console.log('='.repeat(60));

  await runClaude('Fais une analyse rapide du marché ES pour aujourd\'hui.');

  await sleep(3000);

  // Test 4: Suivi avec nom
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: Question personnalisée (utilise mon nom)');
  console.log('='.repeat(60));

  await runClaude('Basé sur ton analyse, donne-moi ton sentiment. Utilise mon nom dans ta réponse.');

  await sleep(3000);

  // Test 5: Mode --continue
  console.log('\n' + '='.repeat(60));
  console.log('TEST 5: Mode --continue');
  console.log('='.repeat(60));

  console.log('📤 Envoi: Merci pour cette analyse!');
  const cmd = `bash -c "echo 'Merci pour cette analyse!' | claude -p --output-format json -c"`;
  try {
    const { stdout } = await execAsync(cmd, { timeout: 30000 });
    const response = JSON.parse(stdout);
    console.log('\n📥 Réponse:');
    console.log(response.result);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }

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
