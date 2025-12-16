#!/usr/bin/env ts-node --esm

import { ClaudeCommandHandler } from './dist/discord_bot/ClaudeCommandHandler.js';
import { ClaudeChatBotAgent } from './dist/backend/agents/ClaudeChatBotAgent.js';

// Interface pour les requêtes de chat
interface ChatRequest {
    message: string;
    username: string;
    isFirstMessage: boolean;
}

console.log('='.repeat(60));
console.log('🧪 TEST COMPLET : Claude Code Integration');
console.log('='.repeat(60));

// ============================================================================
// TEST 1: ClaudeCommandHandler - Instanciation
// ============================================================================
console.log('\n📋 TEST 1: Instanciation ClaudeCommandHandler');
console.log('-'.repeat(60));

try {
    const handler = ClaudeCommandHandler.getInstance();
    console.log('✅ ClaudeCommandHandler instancié avec succès');
    console.log('   - Instance singleton:', handler instanceof ClaudeCommandHandler);
} catch (error) {
    console.error('❌ Erreur instanciation ClaudeCommandHandler:', error);
    process.exit(1);
}

// ============================================================================
// TEST 2: ClaudeChatBotAgent - Instanciation
// ============================================================================
console.log('\n📋 TEST 2: Instanciation ClaudeChatBotAgent');
console.log('-'.repeat(60));

try {
    const agent = new ClaudeChatBotAgent();
    console.log('✅ ClaudeChatBotAgent instancié avec succès');
    console.log('   - Type:', agent.constructor.name);
    console.log('   - Superclass:', agent.constructor.super?.name);
} catch (error) {
    console.error('❌ Erreur instanciation ClaudeChatBotAgent:', error);
    process.exit(1);
}

// ============================================================================
// TEST 3: ClaudeCommandHandler - Commande /profile
// ============================================================================
console.log('\n📋 TEST 3: ClaudeCommandHandler - Commande /profile');
console.log('-'.repeat(60));

async function testProfileCommand() {
    try {
        const handler = ClaudeCommandHandler.getInstance();
        console.log('🔄 Exécution de /profile...');

        const startTime = Date.now();
        const result = await handler.getProfileInfo();
        const duration = Date.now() - startTime;

        console.log(`⏱️  Durée: ${duration}ms`);
        console.log('✅ Commande /profile exécutée');
        console.log(`   - Success: ${result.success}`);
        console.log(`   - Command: ${result.command}`);
        console.log(`   - Output length: ${result.output.length} chars`);
        console.log(`   - Has error: ${!!result.error}`);

        if (result.output) {
            console.log('\n📝 Aperçu de la sortie:');
            console.log(result.output.substring(0, 200) + '...');
        }

        if (result.error) {
            console.log('\n⚠️  Erreur:', result.error);
        }

        return result.success;
    } catch (error) {
        console.error('❌ Erreur lors du test /profile:', error);
        return false;
    }
}

const profileSuccess = await testProfileCommand();

// ============================================================================
// TEST 4: ClaudeCommandHandler - Commande /new
// ============================================================================
console.log('\n📋 TEST 4: ClaudeCommandHandler - Commande /new');
console.log('-'.repeat(60));

async function testNewCommand() {
    try {
        const handler = ClaudeCommandHandler.getInstance();
        console.log('🔄 Exécution de /new avec description...');

        const startTime = Date.now();
        const result = await handler.startNewTask('Test de la nouvelle tâche');
        const duration = Date.now() - startTime;

        console.log(`⏱️  Durée: ${duration}ms`);
        console.log('✅ Commande /new exécutée');
        console.log(`   - Success: ${result.success}`);
        console.log(`   - Command: ${result.command}`);
        console.log(`   - Output length: ${result.output.length} chars`);
        console.log(`   - Has error: ${!!result.error}`);

        if (result.output) {
            console.log('\n📝 Aperçu de la sortie:');
            console.log(result.output.substring(0, 200) + '...');
        }

        return result.success;
    } catch (error) {
        console.error('❌ Erreur lors du test /new:', error);
        return false;
    }
}

const newSuccess = await testNewCommand();

// ============================================================================
// TEST 5: ClaudeChatBotAgent - Mode Classic
// ============================================================================
console.log('\n📋 TEST 5: ClaudeChatBotAgent - Mode Classic Chat');
console.log('-'.repeat(60));

async function testClassicChat() {
    try {
        const agent = new ClaudeChatBotAgent();
        console.log('🔄 Exécution chat classic...');

        const request: ChatRequest = {
            message: 'Bonjour ! Peux-tu me dire bonjour en français ?',
            username: 'TestUser',
            isFirstMessage: false
        };

        const startTime = Date.now();
        const response = await agent.chat(request);
        const duration = Date.now() - startTime;

        console.log(`⏱️  Durée: ${duration}ms`);
        console.log('✅ Chat classic exécuté');
        console.log(`   - Messages count: ${response.messages.length}`);
        console.log(`   - Has poll: ${!!response.poll}`);
        console.log(`   - Has discordMessage: ${!!response.discordMessage}`);
        console.log(`   - Has fileUpload: ${!!response.fileUpload}`);

        if (response.messages && response.messages.length > 0) {
            console.log('\n📝 Réponse:');
            console.log(response.messages[0].substring(0, 200) + '...');
        }

        return true;
    } catch (error) {
        console.error('❌ Erreur lors du test chat classic:', error);
        return false;
    }
}

const classicSuccess = await testClassicChat();

// ============================================================================
// TEST 6: ClaudeChatBotAgent - Mode Persistant
// ============================================================================
console.log('\n📋 TEST 6: ClaudeChatBotAgent - Mode Persistant Chat');
console.log('-'.repeat(60));

async function testPersistentChat() {
    try {
        const agent = new ClaudeChatBotAgent();
        console.log('🔄 Exécution chat persistant (message initial)...');

        const request1: ChatRequest = {
            message: 'Mon nom est TestUser. Retiens-le pour la suite.',
            username: 'TestUser',
            isFirstMessage: true
        };

        const startTime1 = Date.now();
        const response1 = await agent.chat(request1);
        const duration1 = Date.now() - startTime1;

        console.log(`⏱️  Durée message 1: ${duration1}ms`);
        console.log('✅ Premier message persistant envoyé');

        // Attendre un peu pour la persistance
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('\n🔄 Exécution chat persistant (message suivant)...');

        const request2: ChatRequest = {
            message: 'Quel est mon nom ?',
            username: 'TestUser',
            isFirstMessage: false
        };

        const startTime2 = Date.now();
        const response2 = await agent.chat(request2);
        const duration2 = Date.now() - startTime2;

        console.log(`⏱️  Durée message 2: ${duration2}ms`);
        console.log('✅ Deuxième message persistant envoyé');

        if (response2.messages && response2.messages.length > 0) {
            console.log('\n📝 Réponse au deuxième message:');
            console.log(response2.messages[0].substring(0, 200) + '...');
        }

        return true;
    } catch (error) {
        console.error('❌ Erreur lors du test chat persistant:', error);
        return false;
    }
}

const persistentSuccess = await testPersistentChat();

// ============================================================================
// TEST 7: Vérification Parsing JSON
// ============================================================================
console.log('\n📋 TEST 7: Parsing des réponses JSON');
console.log('-'.repeat(60));

function testJsonParsing() {
    try {
        const testCases = [
            {
                name: 'Réponse Claude standard',
                input: '{"result": "Hello world", "session_id": "test-123"}',
                expected: "Hello world"
            },
            {
                name: 'Réponse avec ANSI codes',
                input: '\x1b[31mRed text\x1b[0m\n{"result": "Clean response"}',
                expected: "Clean response"
            },
            {
                name: 'Réponse multi-lignes',
                input: 'Some text\n{"result": "Multi\\nline\\nresponse"}\nMore text',
                expected: "Multi\nline\nresponse"
            }
        ];

        let passed = 0;
        let failed = 0;

        for (const testCase of testCases) {
            try {
                // Simuler le parsing
                const match = testCase.input.match(/(\{.*\})/);
                if (match) {
                    const json = JSON.parse(match[1]);
                    if (json.result === testCase.expected) {
                        console.log(`✅ ${testCase.name}: PARSING OK`);
                        passed++;
                    } else {
                        console.log(`❌ ${testCase.name}: Résultat incorrect`);
                        console.log(`   Expected: ${testCase.expected}`);
                        console.log(`   Got: ${json.result}`);
                        failed++;
                    }
                } else {
                    console.log(`❌ ${testCase.name}: Aucun JSON trouvé`);
                    failed++;
                }
            } catch (error) {
                console.log(`❌ ${testCase.name}: Erreur parsing - ${error.message}`);
                failed++;
            }
        }

        console.log(`\n📊 Résultats parsing: ${passed} passed, ${failed} failed`);
        return failed === 0;
    } catch (error) {
        console.error('❌ Erreur lors du test parsing:', error);
        return false;
    }
}

const parsingSuccess = testJsonParsing();

// ============================================================================
// RÉSUMÉ FINAL
// ============================================================================
console.log('\n' + '='.repeat(60));
console.log('📊 RÉSUMÉ DES TESTS');
console.log('='.repeat(60));

const results = [
    { name: 'Instanciation ClaudeCommandHandler', success: true },
    { name: 'Instanciation ClaudeChatBotAgent', success: true },
    { name: 'Commande /profile', success: profileSuccess },
    { name: 'Commande /new', success: newSuccess },
    { name: 'Chat Classic', success: classicSuccess },
    { name: 'Chat Persistant', success: persistentSuccess },
    { name: 'Parsing JSON', success: parsingSuccess }
];

let totalPassed = 0;
results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.name}`);
    if (result.success) totalPassed++;
});

console.log(`\n📈 Score: ${totalPassed}/${results.length} tests passed`);

if (totalPassed === results.length) {
    console.log('\n🎉 TOUS LES TESTS SONT PASSÉS !');
    process.exit(0);
} else {
    console.log('\n⚠️  CERTAINS TESTS ONT ÉCHOUÉ');
    process.exit(1);
}
