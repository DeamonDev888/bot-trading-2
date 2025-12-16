#!/usr/bin/env node

// Test direct de KiloCode pour diagnostiquer le problème
import { spawn } from 'child_process';

console.log('🧪 Test direct KiloCode/MiniMax-M2\n');

async function testKiloCode() {
    const startTime = Date.now();

    // Simuler la commande exact du bot
    const command = `echo "allo" | claude.cmd --dangerously-skip-permissions --settings "C:/Users/Deamon/Desktop/Backup/financial analyst/.claude/settingsM.json" --agents "C:/Users/Deamon/Desktop/Backup/financial analyst/.claude/agents/discord-agent-simple.json" --agent discord-agent --print --output-format json`;

    console.log('📤 Commande:', command.substring(0, 100) + '...');

    const child = spawn('cmd.exe', ['/c', command], {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        console.log(`📥 STDOUT (${chunk.length} chars):`, chunk.substring(0, 100));
    });

    child.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        console.log(`📤 STDERR (${chunk.length} chars):`, chunk.substring(0, 100));
    });

    // Timeout après 30 secondes
    setTimeout(() => {
        if (!child.killed) {
            console.log('⏰ Timeout - killing process');
            child.kill();
        }
    }, 30000);

    return new Promise((resolve) => {
        child.on('close', (code) => {
            const duration = Date.now() - startTime;
            console.log(`\n🏁 Process closed with code ${code} after ${duration}ms`);
            console.log(`📊 Total STDOUT: ${stdout.length} chars`);
            console.log(`📊 Total STDERR: ${stderr.length} chars`);

            if (stdout.length > 0) {
                console.log('✅ Réponse reçue !');
                console.log('Sample:', stdout.substring(0, 200));
            } else {
                console.log('❌ Aucune réponse reçue');
            }

            resolve({ code, duration, stdout, stderr });
        });
    });
}

testKiloCode().then(result => {
    console.log('\n' + '='.repeat(50));
    console.log('RÉSULTAT FINAL:', result.code === 0 ? 'SUCCÈS' : 'ÉCHEC');
    process.exit(result.code === 0 ? 0 : 1);
});
