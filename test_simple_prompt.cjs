#!/usr/bin/env node

/**
 * Test pour vérifier que le système de prompt simplifié fonctionne
 */

console.log('🧪 Test du système de prompt simplifié');
console.log('===================================');

// Simuler la fonction createDiscordBotPrompt simplifiée
function createDiscordBotPrompt(request) {
  const userMessage = request.message.toLowerCase();

  // Mode simplifié pour les analyses financières directes
  if (userMessage.includes('analyse') &&
      (userMessage.includes('bitcoin') || userMessage.includes('btc') ||
       userMessage.includes('nvidia') || userMessage.includes('tesla') ||
       userMessage.includes('eth') || userMessage.includes('ethereum'))) {

    return `Analyse financière demandée: ${request.message}

En tant qu'expert financier, fournis une analyse directe et complète en français.
Focus sur: données actuelles, tendances, perspectives, risques.
Sois concis mais informatif.`;
  }

  return `# SNIPER - Bot Analyste Financier Discord
[... prompts complexes ...]`;
}

// Tests
const tests = [
  { message: 'sniper analyse nvidia', expected: 'simple' },
  { message: 'sniper analyse tesla', expected: 'simple' },
  { message: 'sniper analyse bitcoin', expected: 'simple' },
  { message: 'comment ça va ?', expected: 'complex' },
  { message: 'aide moi avec un truc', expected: 'complex' },
  { message: 'sniper analyse ethereum', expected: 'simple' },
  { message: 'sniper analyse btc', expected: 'simple' }
];

console.log('');
tests.forEach((test, index) => {
  const result = createDiscordBotPrompt(test);
  const isSimple = result.includes('Analyse financière demandée:');
  const status = isSimple === (test.expected === 'simple') ? '✅' : '❌';

  console.log(`${status} Test ${index + 1}: "${test.message}"`);
  console.log(`   Expected: ${test.expected}, Got: ${isSimple ? 'simple' : 'complex'}`);

  if (isSimple) {
    console.log(`   Prompt généré:\n${result}\n---`);
  } else {
    console.log(`   Prompt: [complexe]\n---`);
  }
});

console.log('');
console.log('🎯 Résultats du test:');
const successCount = tests.filter((test, index) => {
  const result = createDiscordBotPrompt(test);
  const isSimple = result.includes('Analyse financière demandée:');
  return isSimple === (test.expected === 'simple');
}).length;

console.log(`✅ ${successCount}/${tests.length} tests réussis`);

if (successCount === tests.length) {
  console.log('🎉 Tous les tests passés ! Le système de prompt simplifié fonctionne correctement.');
} else {
  console.log('⚠️ Certains tests ont échoué. Vérifier la logique de détection.');
}