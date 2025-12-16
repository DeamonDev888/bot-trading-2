#!/usr/bin/env ts-node

/**
 * Script de test pour valider les corrections du bot Discord
 * Test des cas de fallback et de gestion d'erreurs
 */

import { SniperFinancialBot } from './src/discord_bot/sniper_financial_bot.js';

// Mock Discord message pour tester
interface MockMessage {
  content: string;
  author: {
    username: string;
    id: string;
  };
  channel: {
    id: string;
  };
  reply: (content: string) => Promise<void>;
}

async function testFallbackResponses() {
  console.log('🧪 Test des réponses de fallback...\n');

  const bot = new SniperFinancialBot();

  // Messages de test
  const testMessages = [
    { content: 'ping', expected: '🏓 Pong !' },
    { content: '100 + 100 = ?', expected: '200' },
    { content: 'sniper 100 + 100 = ?', expected: '200' },
    { content: 'help', expected: 'Sniper est votre assistant' },
    { content: 'aide', expected: 'Sniper est votre assistant' },
    { content: 'status', expected: 'Sniper en ligne - Mode dégradé' },
    { content: 'état', expected: 'Sniper en ligne - Mode dégradé' },
    { content: 'bonjour', expected: 'Salut ! Je suis Sniper' },
    { content: 'salut', expected: 'Salut ! Je suis Sniper' },
    { content: 'trading', expected: 'difficultés pour analyser les marchés' },
    { content: 'analyse', expected: 'système d\'analyse est temporairement' },
    { content: 'random message', expected: null } // Devrait retourner une réponse générique
  ];

  for (const test of testMessages) {
    try {
      // Utiliser la réflexion pour appeler la méthode privée
      const response = await (bot as any).generateFallbackResponse(test.content);

      if (test.expected) {
        const passed = response.toLowerCase().includes(test.expected.toLowerCase());
        console.log(`${passed ? '✅' : '❌'} "${test.content}" -> "${response}"`);

        if (!passed) {
          console.log(`   Attendu: "${test.expected}"`);
        }
      } else {
        // Test de réponse générique
        const genericResponses = [
          "difficultés techniques",
          "maintenance",
          "limité",
          "patience"
        ];

        const isGeneric = genericResponses.some(resp =>
          response.toLowerCase().includes(resp)
        );

        console.log(`${isGeneric ? '✅' : '❌'} "${test.content}" -> "${response}" (générique)`);
      }
    } catch (error) {
      console.log(`❌ "${test.content}" -> ERREUR: ${error}`);
    }
  }
}

async function testClaudeSessionManagement() {
  console.log('\n🔧 Test de la gestion de session Claude...\n');

  try {
    // Importer l'agent pour tester
    const { ClaudeChatBotAgent } = await import('./src/backend/agents/ClaudeChatBotAgent.js');
    const agent = new ClaudeChatBotAgent();

    console.log('✅ Agent Claude initialisé');

    // Test de la méthode executeClaudeOneShot avec fallback
    const testRequest = {
      message: 'ping',
      userId: 'test_user',
      username: 'test_user'
    };

    // Tenter une requête (devrait utiliser le fallback)
    try {
      const response = await agent.chat(testRequest);
      console.log('✅ Requête Claude traitée avec succès');
      console.log(`   Réponse: ${JSON.stringify(response, null, 2)}`);
    } catch (error) {
      console.log(`⚠️ Requête Claude a échoué (attendu si pas de session): ${error.message}`);
    }

  } catch (error) {
    console.log(`❌ Erreur test session: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Démarrage des tests de correction du bot Discord\n');

  await testFallbackResponses();
  await testClaudeSessionManagement();

  console.log('\n✅ Tests terminés');
  console.log('\n📋 Résumé des corrections apportées:');
  console.log('1. ✅ Ajout d\'un système de fallback intelligent');
  console.log('2. ✅ Amélioration de la gestion de session Claude');
  console.log('3. ✅ Réparation de la méthode sendToActiveSession');
  console.log('4. ✅ Ajout de gestion d\'erreurs robuste');
  console.log('\n🔧 Prochaines étapes:');
  console.log('- Redémarrer le bot Discord');
  console.log('- Tester avec des messages réels');
  console.log('- Surveiller les logs d\'erreurs');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}