// Test rapide du JSON enrichi pour Sniper
import { DiscordChatBotAgent } from './src/backend/agents/DiscordChatBotAgent.js';

const agent = new DiscordChatBotAgent();

async function testJsonEnrichi() {
  try {
    console.log('🧪 Test de réponse JSON enrichi...\n');

    const response = await agent.quickChat(
      'quel model utilise tu?',
      'TestUser'
    );

    console.log('📊 Réponse générée:');
    console.log('Messages:', response.messages.length);

    if (response.discordMessage) {
      console.log('\n✅ Message Discord enrichi détecté:');
      console.log(JSON.stringify(response.discordMessage, null, 2));
    }

    if (response.poll) {
      console.log('\n📊 Sondage détecté:');
      console.log(JSON.stringify(response.poll, null, 2));
    }

    console.log('\n🎯 Test complété!');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testJsonEnrichi();