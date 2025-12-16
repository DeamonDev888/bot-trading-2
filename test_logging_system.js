#!/usr/bin/env node

/**
 * Script de test pour le système de logging amélioré du DiscordChatBotAgent
 *
 * Ce script simule une interaction avec le bot pour tester:
 * 1. La capture du temps d'exécution
 * 2. Le logging structuré de la réponse KiloCode
 * 3. L'affichage des métriques de parsing
 * 4. La détection des erreurs
 */

import { DiscordChatBotAgent } from './dist/backend/agents/DiscordChatBotAgent.js';

async function testLoggingSystem() {
  console.log('🧪 DÉMARRAGE DU TEST DE LOGGING AMÉLIORÉ\n');

  // Créer une instance du bot
  const bot = new DiscordChatBotAgent();

  // Test 1: Question simple
  console.log('=== TEST 1: Question simple ===');
  try {
    const startTime = Date.now();
    const response1 = await bot.chat({
      message: 'Bonjour Sniper, comment ça va ?',
      username: 'TestUser',
      userId: 'test123',
      channelId: 'test-channel'
    });
    const duration = Date.now() - startTime;

    console.log(`✅ Test 1 réussi en ${duration}ms`);
    console.log(`📊 Nombre de messages: ${response1.messages.length}`);
    console.log(`📄 Premier message: "${response1.messages[0]?.substring(0, 100)}..."`);
    console.log('');

  } catch (error) {
    console.error('❌ Test 1 a échoué:', error.message);
  }

  // Attendre un peu entre les tests
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Question plus complexe (pour tester le parsing)
  console.log('=== TEST 2: Question complexe ===');
  try {
    const startTime = Date.now();
    const response2 = await bot.chat({
      message: 'Peux-tu me donner une analyse complète du marché S&P 500 avec des recommandations d\'investissement ?',
      username: 'TestUser',
      userId: 'test123',
      channelId: 'test-channel'
    });
    const duration = Date.now() - startTime;

    console.log(`✅ Test 2 réussi en ${duration}ms`);
    console.log(`📊 Nombre de messages: ${response2.messages.length}`);
    console.log(`📄 Premier message: "${response2.messages[0]?.substring(0, 100)}..."`);
    if (response2.messages.length > 1) {
      console.log(`📄 Nombre total de messages générés: ${response2.messages.length}`);
    }
    console.log('');

  } catch (error) {
    console.error('❌ Test 2 a échoué:', error.message);
  }

  // Attendre un peu entre les tests
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: Question avec demande de sondage (pour tester les structures JSON)
  console.log('=== TEST 3: Question avec demande de sondage ===');
  try {
    const startTime = Date.now();
    const response3 = await bot.chat({
      message: 'Crée un sondage: "Quel est votre indice boursier préféré ?" avec options S&P 500, NASDAQ, DOW JONES',
      username: 'TestUser',
      userId: 'test123',
      channelId: 'test-channel'
    });
    const duration = Date.now() - startTime;

    console.log(`✅ Test 3 réussi en ${duration}ms`);
    console.log(`📊 Nombre de messages: ${response3.messages.length}`);
    console.log(`📊 Sondage généré: ${response3.poll ? 'OUI' : 'NON'}`);
    if (response3.poll) {
      console.log(`📊 Question du sondage: ${response3.poll.question}`);
      console.log(`📊 Nombre d'options: ${response3.poll.options.length}`);
    }
    console.log('');

  } catch (error) {
    console.error('❌ Test 3 a échoué:', error.message);
  }

  console.log('🎉 TESTS TERMINÉS');
  console.log('\nVérifiez les logs ci-dessus pour:');
  console.log('1. Les sections claires avec === TITRE ===');
  console.log('2. Les métriques de performance (durée, nombre de caractères)');
  console.log('3. L\'analyse des messages Discord générés');
  console.log('4. Les recommandations si le parsing est trop fragmenté');
}

// Gérer les erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Erreur non capturée:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exception non capturée:', error);
  process.exit(1);
});

// Exécuter le test
testLoggingSystem().then(() => {
  console.log('✅ Script de test terminé avec succès');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script de test a échoué:', error);
  process.exit(1);
});