#!/usr/bin/env node

/**
 * Test Simple - ClaudeChatBotAgent
 * Test minimal pour identifier le problème
 */

import { ClaudeChatBotAgent } from './dist/backend/agents/ClaudeChatBotAgent.js';

console.log('🧠 === TEST SIMPLE CLAUDE CHATBOT ===\n');

async function testMinimal() {
    try {
        console.log('1️⃣ Création du cerveau...');
        const agent = new ClaudeChatBotAgent();
        console.log('   ✅ Cerveau créé');

        console.log('\n2️⃣ Initialisation...');
        await agent.initializeClaudeSession();
        console.log('   ✅ Session initialisée');

        console.log('\n3️⃣ Test chat ultra-simple...');
        const request = {
            message: 'Réponds simplement "OK"',
            username: 'Test'
        };

        console.log('   📤 Envoi message:', request.message);

        const response = await agent.chat(request);

        console.log('   ✅ Réponse reçue!');
        console.log('   📥 Contenu:', response.messages?.[0] || 'Aucune réponse');

        console.log('\n🧹 Arrêt...');
        await agent.stopPersistentClaude();
        console.log('   ✅ Arrêt propre');

        console.log('\n🎉 TEST RÉUSSI !');
        return true;

    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error('\n📋 Stack trace:');
        console.error(error.stack);
        return false;
    }
}

// Exécution
testMinimal().then(success => {
    process.exit(success ? 0 : 1);
});
