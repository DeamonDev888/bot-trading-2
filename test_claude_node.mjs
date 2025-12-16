#!/usr/bin/env node

/**
 * Test de persistance Claude avec Node.js
 */

import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

const CLAUDE_PATH = '/c/Users/Deamon/AppData/Roaming/npm/claude';

async function runClaude(message, sessionId = null) {
  const cmd = sessionId
    ? `bash -c "echo '${message.replace(/'/g, "'\\''")}' | ${CLAUDE_PATH} -p --output-format json --session-id ${sessionId}"`
    : `bash -c "echo '${message.replace(/'/g, "'\\''")}' | ${CLAUDE_PATH} -p --output-format json"`;

  const { stdout } = await execAsync(cmd);
  return JSON.parse(stdout);
}

async function testPersistence() {
  console.log('🧪 TEST DE PERSISTANCE CLAUDE (Node.js)');
  console.log('=========================================\n');

  // Test 1
  console.log('TEST 1: Premier message');
  console.log('================================');
  const response1 = await runClaude('Mon nom est Claude');
  console.log('📤 Envoi: Mon nom est Claude');
  console.log('✅ Session ID:', response1.session_id);
  console.log('📥 Réponse:', response1.result.substring(0, 150));
  console.log('');

  const sessionId = response1.session_id;

  // Test 2: Utiliser --continue au lieu de session-id
  console.log('TEST 2: Mode --continue');
  console.log('================================');
  const response2 = await runClaudeContinue('Quel est mon nom?');
  console.log('📤 Envoi: Quel est mon nom?');
  console.log('📥 Réponse:', response2.result.substring(0, 150));
  console.log('');

  if (response2.result.includes('Claude')) {
    console.log('✅ PERSISTANCE CONFIRMÉE ! Claude se souvient du nom.');
  } else {
    console.log('⚠️ Pas de référence à "Claude" dans la réponse.');
  }
  console.log('');

  // Test 3
  console.log('TEST 3: Analyse ES futures');
  console.log('================================');
  const response3 = await runClaudeContinue('Fais une analyse rapide du marché ES');
  console.log('📤 Envoi: Analyse ES futures');
  console.log('📥 Réponse:', response3.result.substring(0, 150));
  console.log('');

  // Test 4
  console.log('TEST 4: Question personnalisée');
  console.log('================================');
  const response4 = await runClaudeContinue('Utilise mon nom dans la réponse');
  console.log('📤 Envoi: Utilise mon nom dans la réponse');
  console.log('📥 Réponse:', response4.result.substring(0, 150));
  console.log('');

  if (response4.result.includes('Claude')) {
    console.log('✅ PERSISTANCE CONFIRMÉE ! Claude utilise le nom.');
  } else {
    console.log('⚠️ Pas de référence à "Claude" dans la réponse.');
  }
  console.log('');

  console.log('✅ TESTS TERMINÉS');
}

async function runClaudeContinue(message) {
  const cmd = `bash -c "echo '${message.replace(/'/g, "'\\''")}' | ${CLAUDE_PATH} -p --output-format json -c"`;
  const { stdout } = await execAsync(cmd);
  return JSON.parse(stdout);
}

testPersistence().catch(console.error);
