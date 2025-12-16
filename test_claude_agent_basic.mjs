#!/usr/bin/env node

import { ClaudeChatBotAgent } from './dist/backend/agents/ClaudeChatBotAgent.js';
import dotenv from 'dotenv';

dotenv.config();

async function testClaudeAgent() {
    console.log('🤖 TEST D\'INITIALISATION DE CLAUDE CHAT BOT AGENT');
    console.log('================================================');

    try {
        // Créer une instance de l'agent
        console.log('📝 Création de l\'instance...');
        const agent = new ClaudeChatBotAgent();
        console.log('✅ Instance créée avec succès');

        // Tester l'initialisation de la session Claude
        console.log('\n🚀 Initialisation de la session Claude...');
        await agent.initializeClaudeSession();
        console.log('✅ Session Claude initialisée');

        // Tester une requête simple
        console.log('\n💬 Test d\'une requête simple...');
        const response = await agent.chat({
            message: 'Bonjour, peux-tu me dire bonjour ?',
            userId: 'test-user',
            username: 'TestUser'
        });

        console.log('📨 Réponse reçue:');
        console.log('Messages:', response.messages);
        console.log('Poll:', response.poll);
        console.log('File Upload:', response.fileUpload);

        console.log('\n✅ TOUS LES TESTS SONT PASSÉS !');
        console.log('🎉 Le ClaudeChatBotAgent fonctionne correctement !');

    } catch (error) {
        console.error('\n❌ ERREUR LORS DU TEST:', error);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

testClaudeAgent();
