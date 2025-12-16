#!/usr/bin/env node

/**
 * Test direct pour simuler une requête d'analyse et voir les logs de debug
 */

const { execSync } = require('child_process');

console.log('🧪 Test direct d\'analyse financière');
console.log('===================================');

// Simuler une requête Discord
const testRequest = {
  message: 'sniper analyse nvidia',
  username: 'TestUser',
  channelId: 'test-channel'
};

console.log(`📝 Requête de test: "${testRequest.message}"`);
console.log('');

// Créer un fichier temporaire pour le test
const testFile = 'temp_discord_test.json';

try {
  // Préparer la requête pour le bot
  const requestData = {
    type: 'chat',
    message: testRequest.message,
    username: testRequest.username,
    channelId: testRequest.channelId,
    outputFile: 'test_output.json'
  };

  require('fs').writeFileSync(testFile, JSON.stringify(requestData, null, 2));

  console.log('🔧 Exécution du test avec le bot...');
  console.log('');

  // Simuler la création de prompt (version simplifiée)
  function createDiscordBotPrompt(request) {
    const userMessage = request.message.toLowerCase();

    console.log(`[discord-chatbot] 🔍 DEBUG createDiscordBotPrompt: "${request.message}"`);
    console.log(`[discord-chatbot] 🔍 Keywords - analyse: ${userMessage.includes('analyse')}, bitcoin: ${userMessage.includes('bitcoin')}, nvidia: ${userMessage.includes('nvidia')}, tesla: ${userMessage.includes('tesla')}, btc: ${userMessage.includes('btc')}, eth: ${userMessage.includes('eth')}`);

    // Mode simplifié pour les analyses financières directes
    if (userMessage.includes('analyse') &&
        (userMessage.includes('bitcoin') || userMessage.includes('btc') ||
         userMessage.includes('nvidia') || userMessage.includes('tesla') ||
         userMessage.includes('eth') || userMessage.includes('ethereum'))) {

      console.log(`[discord-chatbot] ✅ Using SIMPLE prompt for analysis`);
      return `Analyse financière demandée: ${request.message}

En tant qu'expert financier, fournis une analyse directe et complète en français.
Focus sur: données actuelles, tendances, perspectives, risques.
Sois concis mais informatif.`;
    }

    console.log(`[discord-chatbot] ⚙️ Using COMPLEX prompt`);
    return `# SNIPER - Bot Analyste Financier Discord
[... prompts complexes ...]`;
  }

  // Tester la fonction
  const promptResult = createDiscordBotPrompt(testRequest);

  console.log('');
  console.log('📊 RÉSULTAT DU TEST:');
  console.log('==================');
  console.log(`Type de prompt: ${promptResult.includes('Analyse financière demandée:') ? 'SIMPLE' : 'COMPLEX'}`);
  console.log('');
  console.log('Prompt généré:');
  console.log('---------------');
  console.log(promptResult);
  console.log('---------------');

  // Nettoyer
  if (require('fs').existsSync(testFile)) {
    require('fs').unlinkSync(testFile);
  }

} catch (error) {
  console.error('❌ Erreur lors du test:', error.message);

  // Nettoyer en cas d'erreur
  try {
    if (require('fs').existsSync(testFile)) {
      require('fs').unlinkSync(testFile);
    }
  } catch {}
}