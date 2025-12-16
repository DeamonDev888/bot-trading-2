#!/usr/bin/env node

// Test complet du mode persistant comme le bot
import { spawn } from 'child_process';

console.log('🧪 Test mode persistant complet\n');

async function testPersistentMode() {
    const startTime = Date.now();

    // Commande de démarrage persistant
    const command = `claude.cmd --dangerously-skip-permissions --settings "C:/Users/Deamon/Desktop/Backup/financial analyst/.claude/settingsM.json" --agents "C:/Users/Deamon/Desktop/Backup/financial analyst/.claude/agents/discord-agent-simple.json" --agent discord-agent --print --output-format json`;

    console.log('🚀 Démarrage session persistante...');
    console.log('Commande:', command.substring(0, 80) + '...');

    const child = spawn('cmd.exe', ['/c', command], {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
    });

    let outputBuffer = '';
    let hasResponse = false;

    // Écouter les données
    child.stdout.on('data', (data) => {
        const chunk = data.toString();
        outputBuffer += chunk;
        console.log(`📥 Reçu (${chunk.length} chars):`, chunk.substring(0, 100));

        // Détection comme dans le bot
        const hasMeaningfulContent = outputBuffer.length > 3 && (
            outputBuffer.includes('{') ||
            outputBuffer.includes('"') ||
            outputBuffer.includes('type') ||
            outputBuffer.includes('result') ||
            outputBuffer.length > 20
        );

        console.log(`🔍 Détection: length=${outputBuffer.length}, meaningful=${hasMeaningfulContent}`);

        if (hasMeaningfulContent && !hasResponse) {
            hasResponse = true;
            console.log('✅ Réponse détectée !');
        }
    });

    child.stderr.on('data', (data) => {
        console.log(`📤 STDERR:`, data.toString().substring(0, 100));
    });

    // Envoyer un message après 2 secondes
    setTimeout(() => {
        console.log('\n📤 Envoi message "allo"...');
        child.stdin.write('allo\n');
    }, 2000);

    // Kill après 10 secondes
    setTimeout(() => {
        console.log('\n⏰ Timeout - killing process');
        child.kill();
    }, 10000);

    return new Promise((resolve) => {
        child.on('close', (code) => {
            const duration = Date.now() - startTime;
            console.log(`\n🏁 Process closed with code ${code} after ${duration}ms`);
            console.log(`📊 Total buffer: ${outputBuffer.length} chars`);

            if (hasResponse) {
                console.log('✅ RÉUSSI: Réponse détectée');
                console.log('Content sample:', outputBuffer.substring(0, 200));
            } else {
                console.log('❌ ÉCHEC: Aucune réponse détectée');
            }

            resolve({ code, duration, hasResponse, outputLength: outputBuffer.length });
        });
    });
}

testPersistentMode().then(result => {
    console.log('\n' + '='.repeat(50));
    console.log('RÉSULTAT:', result.hasResponse ? '✅ SUCCÈS' : '❌ ÉCHEC');
    process.exit(result.hasResponse ? 0 : 1);
});
