#!/usr/bin/env node

// Debug du parsing JSON KiloCode
import { DiscordChatBotAgent } from './dist/backend/agents/DiscordChatBotAgent.js';

// Simulation d'une réponse JSON KiloCode complète
const kilocodeJsonOutput = `
{"timestamp":1,"source":"cli","id":"msg-123","type":"welcome","content":"","metadata":{"welcomeOptions":{"clearScreen":false,"showInstructions":false}}}
{"timestamp":1765321870314,"source":"extension","type":"say","say":"text","content":"Salut ! Comment puis-je t'aider ?"}
{"timestamp":1765321878147,"source":"extension","type":"say","say":"completion_result","partial":false,"content":"Salut ! Je suis Sniper, ton expert financier. Comment puis-je t'aider aujourd'hui avec tes analyses ou tes projets ?"}
`;

console.log('🔍 DEBUG DU PARSING JSON KILOCODE\n');

async function debugJsonParsing() {
  console.log('📝 CONTENU JSON À TESTER:');
  console.log(kilocodeJsonOutput.substring(0, 200) + '...');
  console.log('\n' + '='.repeat(60) + '\n');

  const agent = new DiscordChatBotAgent();

  try {
    // Tester parseJsonEvents directement
    console.log('🔍 TEST: parseJsonEvents...');

    const parseResult = agent['parseJsonEvents'](kilocodeJsonOutput);

    if (parseResult) {
      console.log('✅ SUCCÈS parseJsonEvents:');
      console.log(`   Texte: "${parseResult.text}"`);
      console.log(`   Longueur: ${parseResult.text.length} caractères`);
    } else {
      console.log('❌ ÉCHEC parseJsonEvents: retourne null');
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Tester le parsing complet
    console.log('🔍 TEST: parseChatResponse complet...');

    const chatResponse = agent.parseChatResponse(kilocodeJsonOutput);

    console.log('✅ RÉPONSE CHAT:');
    console.log(`   Messages: ${chatResponse.messages.length}`);
    chatResponse.messages.forEach((msg, i) => {
      console.log(`   [${i + 1}] "${msg}"`);
    });

  } catch (error) {
    console.error('❌ ERREUR:', error);
  }
}

// Exécuter le test
debugJsonParsing().catch(console.error);