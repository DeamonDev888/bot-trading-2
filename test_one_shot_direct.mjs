#!/usr/bin/env node

// Test direct du mode one-shot comme le bot
import { spawn } from 'child_process';

console.log('🧪 Test mode one-shot (comme le bot)\n');

async function testOneShot() {
    const startTime = Date.now();

    // Construire la commande comme dans executeClaudeOneShot
    const message = 'allo';
    const settingsFile = 'C:/Users/Deamon/Desktop/Backup/financial analyst/.claude/settingsM.json';
    const agentsFile = 'C:/Users/Deamon/Desktop/Backup/financial analyst/.claude/agents/discord-agent-simple.json';

    const command = `echo "${message}" | claude.cmd --dangerously-skip-permissions --settings "${settingsFile}" --agents "${agentsFile}" --agent discord-agent --print --output-format json`;

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

    // Timeout après 20 secondes
    setTimeout(() => {
        if (!child.killed) {
            console.log('⏰ Timeout - killing process');
            child.kill();
        }
    }, 20000);

    return new Promise((resolve) => {
        child.on('close', (code) => {
            const duration = Date.now() - startTime;
            console.log(`\n🏁 Process closed with code ${code} after ${duration}ms`);
            console.log(`📊 Total STDOUT: ${stdout.length} chars`);
            console.log(`📊 Total STDERR: ${stderr.length} chars`);

            // Tenter de parser la réponse
            if (stdout.includes('"result"')) {
                console.log('✅ Réponse avec champ "result" détectée !');
                const resultMatch = stdout.match(/"result":"([^"]*)"/);
                if (resultMatch) {
                    console.log('📝 Contenu result:', resultMatch[1]);
                }
            }

            resolve({ code, duration, stdout, stderr });
        });
    });
}

testOneShot().then(result => {
    console.log('\n' + '='.repeat(50));
    console.log('RÉSULTAT:', result.code === 0 && result.stdout.length > 0 ? '✅ SUCCÈS' : '❌ ÉCHEC');
    process.exit(result.code === 0 ? 0 : 1);
});
