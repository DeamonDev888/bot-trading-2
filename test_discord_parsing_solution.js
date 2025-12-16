#!/usr/bin/env node

// Script de test pour vérifier la solution de parsing Discord
import { DiscordChatBotAgent } from './dist/backend/agents/DiscordChatBotAgent.js';

console.log('🔍 TEST DE LA SOLUTION DE PARSING DISCORD\n');

// Simuler la réponse problématique que reçoit le bot
const sampleKiloCodeOutput = `
     █████   ████  ███  ████                █████████               █████
    ░░███   ███░  ░░░  ░░███               ███░░░░░███             ░░███
     ░███  ███    ████  ░███   ██████     ███     ░░░     ██████   ░███ 
     ░███ ░███   ░░███  ░███  ░░░░░███   ░███          ░░░░░███  ░███ 
     ░███ ░███    ████  ░███  ███████   ░███   █████  ███████  ░███ 
     ░███ ░███   ░░███  ░███ █████░█    ░░███  ░░░░  █████░░   ░███ 
     ░░░  ░░███████ ░░░  ░░███████ ████   ░░███████████████ ██ ░░░  
           ░░░░░░░           ░░░░░░░        ░░░░░░░░░░░░░░░░    ░░   

Salut ! Comment puis-je t'aider aujourd'hui avec tes analyses financières ou tes projets TypeScript ? 😊

{"type":"message_enrichi","contenu":"Réponse générée automatiquement","embeds":[{"title":"Sniper Analyste Financier","description":"Je suis un bot spécialisé en analyse financière","color":"0x0099ff","footer":{"text":"Sniper Financial Bot"}}]}

✓ API Request
✓ API Request - Cost: $0.0000
💾 Checkpoint Saved (864efd2742046c7c68c8189f409e52fdc5ba8ea1)
✓ Task Completed
`;

async function testParsing() {
  console.log('📝 ÉCHANTILLON DE RÉPONSE KILOCODE:');
  console.log(sampleKiloCodeOutput.substring(0, 200) + '...');
  console.log('\n' + '='.repeat(60) + '\n');

  const agent = new DiscordChatBotAgent();
  
  try {
    // Tester la nouvelle méthode d'extraction
    console.log('🔍 TEST: Extraction extended text response...');
    
    // Simuler le parsing que fait le bot
    const parsedResponse = agent.parseSimpleKiloCodeOutput
      ? agent.parseSimpleKiloCodeOutput(sampleKiloCodeOutput)
      : null;
    
    if (parsedResponse) {
      console.log('✅ RÉPONSE EXTRAITE AVEC SUCCÈS:');
      console.log(`   Texte: "${parsedResponse.text}"`);
      console.log(`   Longueur: ${parsedResponse.text.length} caractères`);
    } else {
      console.log('❌ ÉCHEC: Aucune réponse extraite');
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Tester avec la méthode de chat
    console.log('🔍 TEST: Méthode chat complète...');
    
    const chatRequest = {
      message: 'salut',
      username: 'demon6660699'
    };
    
    const chatResponse = await agent.chat(chatRequest);
    
    console.log('✅ RÉPONSE CHAT:');
    console.log(`   Messages: ${chatResponse.messages.length}`);
    chatResponse.messages.forEach((msg, i) => {
      console.log(`   [${i + 1}] ${msg.substring(0, 100)}...`);
    });
    
    if (chatResponse.poll) {
      console.log(`   Poll: ${chatResponse.poll.question}`);
    }
    
    if (chatResponse.discordMessage) {
      console.log(`   Embed: ${chatResponse.discordMessage.embed?.title || 'Sans titre'}`);
    }
    
    console.log('\n🎉 TEST TERMINÉ AVEC SUCCÈS!');
    
  } catch (error) {
    console.error('❌ ERREUR LORS DU TEST:', error);
  }
}

// Exécuter le test
testParsing().catch(console.error);