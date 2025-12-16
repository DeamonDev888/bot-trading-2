#!/usr/bin/env node

// Test direct du pipeline de traitement des messages
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Test direct du pipeline de traitement\n');

async function testPipeline() {
    try {
        console.log('📦 Import des modules...');

        // Charger les modules du bot (version compilée)
        const { ClaudeChatBotAgent } = await import('./dist/backend/agents/ClaudeChatBotAgent.js');
        const { PersistentSessionManager } = await import('./dist/discord_bot/PersistentSessionManager.js');

        console.log('✅ Modules chargés');

        // Créer l'agent
        const chatAgent = new ClaudeChatBotAgent();
        console.log('✅ Agent créé');

        // Créer le session manager
        const sessionManager = new PersistentSessionManager(chatAgent);
        console.log('✅ SessionManager créé');

        // Tester l'appel direct
        console.log('\n📞 Test appel sessionManager.processMessage...');
        const startTime = Date.now();

        const response = await sessionManager.processMessage(
            'test_user',
            'TestUser',
            'allo',
            undefined
        );

        const duration = Date.now() - startTime;
        console.log(`⏱️ Durée: ${duration}ms`);
        console.log(`📊 Réponse: ${response.messages.length} messages`);
        console.log(`📝 Premier message: "${response.messages[0].substring(0, 100)}..."`);

        return true;

    } catch (error) {
        console.error('❌ ERREUR dans le test:', error);
        console.error('📋 Stack:', error.stack);
        return false;
    }
}

testPipeline().then(success => {
    console.log('\n' + '='.repeat(50));
    console.log('RÉSULTAT:', success ? '✅ PIPELINE FONCTIONNE' : '❌ PIPELINE CASSÉ');
    process.exit(success ? 0 : 1);
});
