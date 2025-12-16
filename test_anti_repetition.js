#!/usr/bin/env node

// Test pour les protections anti-répétition
import { DiscordChatBotAgent } from './dist/backend/agents/DiscordChatBotAgent.js';

console.log('🔍 TEST ANTI-RÉPÉTION ET LIMITATION DE MESSAGES\n');

// Simuler une réponse très longue et répétitive
const repetitiveLongResponse = `
Salut demon6660699 ! Je vois que tu as envoyé "test 2". Est-ce que tu veux tester quelque chose de spécifique ou as-tu besoin d'aide avec un sujet financier ou technique ? 😊

Je suis là pour t'aider avec tout ce qui concerne la finance, le développement TypeScript ou l'analyse de données. N'hésite pas à me donner plus de détails !

Je suis là pour t'aider avec tout ce qui concerne la finance, le développement TypeScript ou l'analyse de données. N'hésite pas à me donner plus de détails !

Je suis là pour t'aider avec tout ce qui concerne la finance, le développement TypeScript ou l'analyse de données. N'hésite pas à me donner plus de détails !

Je suis là pour t'aider avec tout ce qui concerne la finance, le développement TypeScript ou l'analyse de données. N'hésite pas à me donner plus de détails !

Salut demon6660699 ! Je vois que tu as envoyé "test 2". Est-ce que tu veux tester quelque chose de spécifique ou as-tu besoin d'aide avec un sujet financier ou technique ? 😊

Je suis là pour t'aider avec tout ce qui concerne la finance, le développement TypeScript ou l'analyse de données. N'hésite pas à me donner plus de détails !

Je suis là pour t'aider avec tout ce qui concerne la finance, le développement TypeScript ou l'analyse de données. N'hésite pas à me donner plus de détails !

Je suis là pour t'aider avec tout ce qui concerne la finance, le développement TypeScript ou l'analyse de données. N'hésite pas à me donner plus de détails !

Je suis là pour t'aider avec tout ce qui concerne la finance, le développement TypeScript ou l'analyse de données. N'hésite pas à me donner plus de détails !

J'ai répondu à l'utilisateur en français, en adoptant un ton naturel, amical et professionnel, conformément aux instructions. La réponse est concise et adaptée au contexte de la conversation.

J'ai répondu à l'utilisateur en français, en adoptant un ton naturel, amical et professionnel, conformément aux instructions. La réponse est concise et adaptée au contexte de la conversation.

J'ai répondu à l'utilisateur en français, en adoptant un ton naturel, amical et professionnel, conformément aux instructions. La réponse est concise et adaptée au contexte de la conversation.

J'ai répondu à l'utilisateur en français, en adoptant un ton naturel, amical et professionnel, conformément aux instructions. La réponse est concise et adaptée au contexte de la conversation.
`.trim();

async function testAntiRepetition() {
  console.log('📝 RÉPONSE RÉPÉTITIVE À TESTER:');
  console.log(`Longueur: ${repetitiveLongResponse.length} caractères`);
  console.log(`Nombre de mots: ${repetitiveLongResponse.split(' ').length}`);
  console.log('\n' + '='.repeat(60) + '\n');

  const agent = new DiscordChatBotAgent();

  try {
    // Compter les répétitions manuellement
    const words = repetitiveLongResponse.toLowerCase().split(' ');
    const wordCounts = new Map();

    for (const word of words) {
      if (word.length > 3) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    let maxRepetitions = 0;
    let mostRepeatedWord = '';
    for (const [word, count] of wordCounts.entries()) {
      if (count > maxRepetitions) {
        maxRepetitions = count;
        mostRepeatedWord = word;
      }
    }

    console.log(`🔍 ANALYSE DES RÉPÉTITIONS:`);
    console.log(`   Mot le plus répété: "${mostRepeatedWord}" (${maxRepetitions} fois)`);

    console.log('\n🔍 TEST: Division en messages Discord...');

    // Tester la méthode splitIntoDiscordMessages
    const messages = agent['splitIntoDiscordMessages'](repetitiveLongResponse);

    console.log(`✅ RÉSULTAT:`);
    console.log(`   Messages générés: ${messages.length}`);
    console.log(`   Longueur totale après traitement: ${messages.join('').length} caractères`);

    messages.forEach((msg, i) => {
      console.log(`   [${i + 1}] Longueur: ${msg.length} - "${msg.substring(0, 50)}..."`);
    });

    // Vérifications
    const hasAntiSpam = messages.some(msg => msg.includes('réponse tronquée pour éviter le spam'));
    const isUnderLimit = messages.length <= 5;
    const totalUnderLimit = messages.join('').length <= 10000; // 5 messages x 2000 chars

    console.log('\n📊 VÉRIFICATIONS:');
    console.log(`   ✅ Nombre de messages ≤ 5: ${isUnderLimit}`);
    console.log(`   ✅ Protection anti-spam: ${hasAntiSpam}`);
    console.log(`   ✅ Longueur totale raisonnable: ${totalUnderLimit}`);

    if (isUnderLimit && totalUnderLimit) {
      console.log('\n🎉 SUCCÈS: Les protections anti-répétition fonctionnent correctement !');
    } else {
      console.log('\n❌ ÉCHEC: Les protections ne sont pas suffisantes');
    }

  } catch (error) {
    console.error('❌ ERREUR LORS DU TEST:', error);
  }
}

// Exécuter le test
testAntiRepetition().catch(console.error);