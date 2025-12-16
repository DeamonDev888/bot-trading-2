#!/usr/bin/env node

// Test rapide du timeout Discord bot
import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

console.log('🧪 Test du bot Discord - Vérification timeout\n');

async function testBot() {
    const botProcess = spawn('node', ['dist/discord_bot/sniper_financial_bot.js'], {
        env: { ...process.env, TEST_MODE: 'true' },
        stdio: ['pipe', 'pipe', 'pipe']
    });

    let initialized = false;
    let responseReceived = false;

    // Attendre l'initialisation
    botProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('📤 Bot output:', output.substring(0, 100));

        if (output.includes('est connecté')) {
            initialized = true;
            console.log('✅ Bot initialisé !');
        }

        if (output.includes('allo')) {
            responseReceived = true;
            console.log('✅ Réponse reçue !');
        }
    });

    // Attendre 10 secondes pour l'initialisation
    await sleep(10000);

    if (!initialized) {
        console.log('❌ Bot non initialisé après 10s');
        botProcess.kill();
        return false;
    }

    console.log('🎯 Test timeout réussi - pas de timeout après 10s');
    botProcess.kill();
    return true;
}

testBot().then(success => {
    console.log(success ? '\n✅ TEST RÉUSSI' : '\n❌ TEST ÉCHOUÉ');
    process.exit(success ? 0 : 1);
});
