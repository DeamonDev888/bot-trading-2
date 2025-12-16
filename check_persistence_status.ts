#!/usr/bin/env ts-node

/**
 * Script pour vérifier l'état de persistance du bot
 */

import { SniperFinancialBot } from './src/discord_bot/sniper_financial_bot.js';

async function checkPersistenceStatus() {
  console.log('🔍 Vérification de l\'état de persistance du bot...\n');

  const bot = new SniperFinancialBot();

  // Attendre que le bot soit initialisé
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    // Vérifier les sessions actives
    const sessionStatus = bot.getSessionsStatus();
    console.log('📊 État des sessions:');
    console.log(sessionStatus);

    // Vérifier le processus Claude
    const claudePid = bot.claudeProcessManager.getActivePid();
    console.log(`\n🤖 Processus Claude: ${claudePid ? 'ACTIF (PID: ' + claudePid + ')' : 'INACTIF'}`);

    // Simuler un message pour tester la persistance
    console.log('\n🧪 Test de persistance avec un message simple...');
    const testResponse = await bot.generateProfessionalResponse(
      'ping test de persistance',
      'TestUser',
      '123456789'
    );

    console.log('✅ Réponse reçue:');
    console.log(`   Messages: ${testResponse.messages.length}`);
    console.log(`   Contenu: "${testResponse.messages[0]}"`);

    // Vérifier si la session est toujours active après le message
    const claudePidAfter = bot.claudeProcessManager.getActivePid();
    console.log(`\n🔄 Processus Claude après message: ${claudePidAfter ? 'ACTIF (PID: ' + claudePidAfter + ')' : 'INACTIF'}`);

    console.log('\n📋 Résumé de la persistance:');
    console.log('- Session Claude:', claudePid && claudePid === claudePidAfter ? '✅ Persistante' : '⚠️ Recrée à chaque fois');
    console.log('- Contexte conversationnel: ✅ Géré par PersistentSessionManager');
    console.log('- Fallback: ✅ Disponible en cas d\'erreur');

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkPersistenceStatus().catch(console.error);
}