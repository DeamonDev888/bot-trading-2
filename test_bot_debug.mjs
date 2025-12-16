#!/usr/bin/env node

// Test automatique du bot avec logs de debugging
import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

console.log('🧪 Test automatique du bot avec debugging\n');

async function testBot() {
    const botProcess = spawn('pnpm', ['bot', '-m'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, CI: 'true' }
    });

    let initializationComplete = false;
    let messageProcessed = false;
    const logs = [];

    // Capturer les logs
    botProcess.stdout.on('data', (data) => {
        const output = data.toString();
        logs.push(output);
        console.log('📤 STDOUT:', output.substring(0, 150));

        if (output.includes('est connecté')) {
            initializationComplete = true;
            console.log('✅ Bot initialisé !');
        }

        if (output.includes('CHAT START')) {
            messageProcessed = true;
            console.log('✅ Message traité par le bot !');
        }
    });

    botProcess.stderr.on('data', (data) => {
        const output = data.toString();
        logs.push(output);
        console.log('📤 STDERR:', output.substring(0, 150));
    });

    // Attendre l'initialisation
    console.log('⏳ Attente initialisation...');
    await sleep(8000);

    if (!initializationComplete) {
        console.log('❌ Bot non initialisé après 8s');
        botProcess.kill();
        return false;
    }

    console.log('✅ Bot prêt pour test de message');
    console.log('📝 Envoyez "sniper allo" dans Discord pour tester');
    console.log('⏳ Attente traitement message...');

    // Attendre 15 secondes de plus pour voir si un message arrive
    await sleep(15000);

    if (!messageProcessed) {
        console.log('❌ Aucun message traité après 15s supplémentaires');
        console.log('📋 Derniers logs:');
        logs.slice(-10).forEach(log => console.log('  ', log.substring(0, 100)));
    } else {
        console.log('✅ Message traité !');
    }

    botProcess.kill();
    return messageProcessed;
}

testBot().then(success => {
    console.log('\n' + '='.repeat(50));
    console.log('RÉSULTAT:', success ? '✅ SUCCÈS' : '❌ ÉCHEC');
    process.exit(success ? 0 : 1);
});
