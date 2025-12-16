
import { DiscordChatBotAgent } from '../src/backend/agents/DiscordChatBotAgent.js';

async function testAgent() {
    console.log('🧪 Testing DiscordChatBotAgent (Persistent Mode)...');
    
    const agent = new DiscordChatBotAgent();
    
    try {
        console.log('🔄 Starting persistent session...');
        // We need to access the private/protected method or trigger it via chat.
        // chat() calls chatPersistent internally now based on my previous edit.
        
        const response1 = await agent.chat({
            message: "Bonjour, qui es-tu ?",
            username: "Tester",
            userId: "test-user-1",
            isFirstMessage: true
        });
        
        console.log('✅ Response 1 received:');
        console.log(JSON.stringify(response1, null, 2));

        console.log('------------------------------------------------');
        
        const response2 = await agent.chat({
            message: "Peux-tu m'analyser le cours du Bitcoin ?",
            username: "Tester",
            userId: "test-user-1",
            isFirstMessage: false
        });

        console.log('✅ Response 2 received:');
        console.log(JSON.stringify(response2, null, 2));

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        console.log('🛑 Stopping agent...');
        await agent.stopPersistentKilo();
    }
}

testAgent().catch(console.error);
