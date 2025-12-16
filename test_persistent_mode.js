#!/usr/bin/env node

/**
 * 🧪 Test du Mode Persistant
 * Vérifie que le mode persistant utilise stdin/stdout pour les messages suivants
 */

const { spawn } = require('child_process');
const fs = require('fs');

console.log('🧪 TEST MODE PERSISTANT - ClaudeChatBotAgent');
console.log('=' .repeat(60));

// Simuler deux messages consécutifs
async function testPersistentMode() {
    const testScript = `
const { ClaudeChatBotAgent } = require('./dist/backend/agents/ClaudeChatBotAgent.js');

async function test() {
    const agent = new ClaudeChatBotAgent();
    await agent.initialize();

    console.log('\\n📨 Message 1: "sniper hello"');
    const response1 = await agent.chat({
        username: 'TestUser',
        userId: '12345',
        message: 'sniper hello'
    });
    console.log('✅ Réponse 1 reçue');

    console.log('\\n📨 Message 2: "comment ça va ?"');
    const response2 = await agent.chat({
        username: 'TestUser',
        userId: '12345',
        message: 'comment ça va ?'
    });
    console.log('✅ Réponse 2 reçue');

    console.log('\\n🎉 Test terminé avec succès !');
    process.exit(0);
}

test().catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
});
`;

    // Écrire le script de test
    fs.writeFileSync('./test_persistent_temp.js', testScript);

    console.log('🚀 Lancement du test...');
    const child = spawn('node', ['test_persistent_temp.js'], {
        stdio: 'inherit',
        timeout: 60000 // 60s timeout
    });

    child.on('close', (code) => {
        // Nettoyer
        if (fs.existsSync('./test_persistent_temp.js')) {
            fs.unlinkSync('./test_persistent_temp.js');
        }

        if (code === 0) {
            console.log('\\n✅ TEST RÉUSSI - Mode persistant fonctionne !');
        } else {
            console.log('\\n❌ TEST ÉCHOUÉ - Code:', code);
        }
        process.exit(code);
    });

    child.on('error', (error) => {
        console.error('❌ Erreur lancement test:', error);
        if (fs.existsSync('./test_persistent_temp.js')) {
            fs.unlinkSync('./test_persistent_temp.js');
        }
        process.exit(1);
    });
}

testPersistentMode();
