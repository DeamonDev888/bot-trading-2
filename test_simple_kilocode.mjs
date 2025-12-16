#!/usr/bin/env node

/**
 * TEST SIMPLE - Vérifier si KiloCode fonctionne en mode JSON
 * Usage: node test_simple_kilocode.mjs
 */

import { spawn } from 'child_process';

console.log('🧪 TEST SIMPLE - Mode JSON KiloCode\n');

try {
  const kil = spawn('kil', ['-i'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  console.log('✅ KiloCode lancé\n');

  let output = '';

  kil.stdout.on('data', (data) => {
    const str = data.toString();
    output += str;
    console.log('📥 Réponse:', str);
  });

  kil.stderr.on('data', (data) => {
    console.log('🔍 Debug:', data.toString());
  });

  // Test 1: Message simple
  console.log('\n📤 Test 1: Envoi message simple');
  kil.stdin.write(JSON.stringify({
    type: 'user',
    content: 'Hello'
  }) + '\n');

  // Test 2: Demande de rappel
  setTimeout(() => {
    console.log('\n📤 Test 2: Test mémoire');
    kil.stdin.write(JSON.stringify({
      type: 'user',
      content: 'Quel était mon message précédent?'
    }) + '\n');
  }, 3000);

  // Fermer après 10 secondes
  setTimeout(() => {
    console.log('\n🔚 Fermeture...');
    kil.stdin.end();
    setTimeout(() => kil.kill(), 1000);
  }, 10000);

} catch (error) {
  console.log('❌ Erreur:', error.message);
  console.log('\n💡 Solution: npm install -g @kilocode/cli');
}
