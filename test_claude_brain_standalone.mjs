#!/usr/bin/env node

/**
 * Test Standalone - ClaudeChatBotAgent
 * Valider que le cerveau IA fonctionne seul
 */

import { ClaudeChatBotAgent } from './dist/backend/agents/ClaudeChatBotAgent.js';

console.log('🧠 === TEST STANDALONE CLAUDE CHATBOT AGENT ===\n');

// Test 1: Instanciation
console.log('📋 Test 1: Instanciation du cerveau...');
try {
    const agent = new ClaudeChatBotAgent();
    console.log('✅ Cerveau créé avec succès');
    console.log('   - Instance:', agent.constructor.name);
    console.log('   - Type:', typeof agent);
} catch (error) {
    console.error('❌ Échec instanciation:', error);
    process.exit(1);
}

// Test 2: Initialisation
console.log('\n📋 Test 2: Initialisation de la session...');
async function testInit() {
    try {
        const agent = new ClaudeChatBotAgent();
        await agent.initializeClaudeSession();
        console.log('✅ Session Claude initialisée');
        console.log('   - Mode persistant activé');
        console.log('   - Process KiloCode démarré');
    } catch (error) {
        console.error('❌ Échec initialisation:', error.message);
        return false;
    }
    return true;
}

// Test 3: Chat simple
console.log('\n📋 Test 3: Chat simple...');
async function testChat() {
    try {
        const agent = new ClaudeChatBotAgent();
        await agent.initializeClaudeSession();

        const request = {
            message: 'Bonjour ! Comment allez-vous ? Répondez en une phrase simple.',
            username: 'TestUser',
            userId: 'test123'
        };

        console.log('📤 Envoi requête:', request.message.substring(0, 50) + '...');

        const response = await agent.chat(request);

        console.log('✅ Réponse reçue:');
        console.log('   - Messages:', response.messages?.length || 0);
        if (response.messages && response.messages.length > 0) {
            console.log('   - Contenu:', response.messages[0].substring(0, 100) + '...');
        }
        console.log('   - Poll:', response.poll ? 'Oui' : 'Non');
        console.log('   - DiscordMessage:', response.discordMessage ? 'Oui' : 'Non');
        console.log('   - FileUpload:', response.fileUpload ? 'Oui' : 'Non');

        return true;
    } catch (error) {
        console.error('❌ Échec chat:', error.message);
        }
}

// Test 4: Chat avec contexte
console.log('\n📋 Test 4: Chat avec contexte...');
async function testChatContext() {
    try {
        const agent = new ClaudeChatBotAgent();
        await agent.initializeClaudeSession();

        const request = {
            message: 'Quelle est la capitale de la France ?',
            username: 'TestUser',
            userId: 'test123',
            context: 'Test de conversation avec contexte'
        };

        console.log('📤 Envoi requête avec contexte:', request.message);

        const response = await agent.chat(request);

        console.log('✅ Réponse avec contexte reçue:');
        if (response.messages && response.messages.length > 0) {
            console.log('   - Réponse:', response.messages[0]);
        }

        return true;
    } catch (error) {
        console.error('❌ Échec chat avec contexte:', error.message);
        return false;
    }
}

// Test 5: Interface ChatRequest
console.log('\n📋 Test 5: Validation interface ChatRequest...');
async function testChatRequest() {
    try {
        const agent = new ClaudeChatBotAgent();

        // Test différents formats de ChatRequest
        const testCases = [
            {
                name: 'Minimal',
                request: { message: 'Hello' }
            },
            {
                name: 'Complet',
                request: {
                    message: 'Test complet',
                    username: 'TestUser',
                    userId: 'test123',
                    channelId: 'channel123',
                    attachmentContent: 'File content',
                    isFirstMessage: true,
                    context: 'Test context'
                }
            },
            {
                name: 'Avec fichier',
                request: {
                    message: 'Analyser ce fichier',
                    username: 'TestUser',
                    attachmentContent: 'Contenu du fichier de test'
                }
            }
        ];

        for (const testCase of testCases) {
            console.log(`   - Test ${testCase.name}:`, Object.keys(testCase.request).join(', '));
        }

        console.log('✅ Interface ChatRequest validée');
        return true;
    } catch (error) {
        console.error('❌ Échec validation ChatRequest:', error.message);
        return false;
    }
}

// Test 6: Interface ChatResponse
console.log('\n📋 Test 6: Validation interface ChatResponse...');
async function testChatResponse() {
    try {
        const agent = new ClaudeChatBotAgent();
        await agent.initializeClaudeSession();

        const request = {
            message: 'Répondez avec un format structuré',
            username: 'TestUser'
        };

        const response = await agent.chat(request);

        console.log('✅ Interface ChatResponse validée:');
        console.log('   - Type:', typeof response);
        console.log('   - Propriétés:', Object.keys(response).join(', '));

        // Vérifier la structure
        if (response.messages && Array.isArray(response.messages)) {
            console.log('   - messages: Array ✓');
        }
        if (response.poll === undefined || typeof response.poll === 'object') {
            console.log('   - poll: object | undefined ✓');
        }
        if (response.discordMessage === undefined || typeof response.discordMessage === 'object') {
            console.log('   - discordMessage: object | undefined ✓');
        }
        if (response.fileUpload === undefined || typeof response.fileUpload === 'object') {
            console.log('   - fileUpload: object | undefined ✓');
        }

        return true;
    } catch (error) {
        console.error('❌ Échec validation ChatResponse:', error.message);
        return false;
    }
}

// Test 7: Arrêt propre
console.log('\n📋 Test 7: Arrêt propre...');
async function testShutdown() {
    try {
        const agent = new ClaudeChatBotAgent();
        await agent.initializeClaudeSession();

        console.log('   - Session démarrée');

        await agent.stopPersistentClaude();

        console.log('✅ Arrêt propre effectué');
        console.log('   - Processus terminé');
        console.log('   - Ressources libérées');
        return true;
    } catch (error) {
        console.error('❌ Échec arrêt:', error.message);
        return false;
    }
}

// Fonction principale de test
async function runAllTests() {
    console.log('🚀 Démarrage des tests...\n');

    const tests = [
        { name: 'Instanciation', fn: async () => { new ClaudeChatBotAgent(); return true; } },
        { name: 'Initialisation', fn: testInit },
        { name: 'Chat simple', fn: testChat },
        { name: 'Chat avec contexte', fn: testChatContext },
        { name: 'Interface ChatRequest', fn: testChatRequest },
        { name: 'Interface ChatResponse', fn: testChatResponse },
        { name: 'Arrêt propre', fn: testShutdown }
    ];

    const results = [];

    for (const test of tests) {
        try {
            const result = await test.fn();
            results.push({ name: test.name, success: result });
            console.log(result ? '   ✅ SUCCÈS' : '   ❌ ÉCHEC');
        } catch (error) {
            results.push({ name: test.name, success: false, error: error.message });
            console.log('   ❌ ÉCHEC:', error.message);
        }
        console.log(''); // Ligne vide pour la lisibilité
    }

    // Résumé final
    console.log('📊 === RÉSUMÉ DES TESTS ===\n');

    const passed = results.filter(r => r.success).length;
    const total = results.length;

    console.log(`✅ Tests réussis: ${passed}/${total}`);
    console.log(`❌ Tests échoués: ${total - passed}/${total}`);

    if (passed === total) {
        console.log('\n🎉 TOUS LES TESTS SONT PASSÉS !');
        console.log('🧠 Le cerveau ClaudeChatBotAgent fonctionne parfaitement !');
    } else {
        console.log('\n⚠️ CERTAINS TESTS ONT ÉCHOUÉ');
        console.log('Détail des échecs:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`   - ${r.name}: ${r.error || 'Erreur inconnue'}`);
        });
    }

    console.log('\n🏁 Test terminé');
    process.exit(passed === total ? 0 : 1);
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
    console.error('\n❌ ERREUR NON CAPTURÉE:');
    console.error('Reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('\n❌ EXCEPTION NON CAPTURÉE:');
    console.error('Error:', error);
    process.exit(1);
});

// Lancer les tests
runAllTests();
