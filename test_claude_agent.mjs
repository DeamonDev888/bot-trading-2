import { ClaudeChatBotAgent } from './dist/backend/agents/ClaudeChatBotAgent.js';

const agent = new ClaudeChatBotAgent();

try {
  const response = await agent.chat({
    message: 'salut',
    userId: 'test123',
    username: 'testuser',
    isFirstMessage: true
  });

  console.log('✅ Réponse reçue :');
  console.log(JSON.stringify(response, null, 2));
} catch (error) {
  console.error('❌ Erreur :', error);
}