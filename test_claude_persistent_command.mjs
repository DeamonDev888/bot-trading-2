#!/usr/bin/env node

/**
 * Test de la commande Claude exacte utilisée par le bot
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

async function testClaudeCommand() {
    console.log('🧪 Test de la commande Claude exacte du bot...\n');

    // Message test
    const testMessage = 'sa vas ?';

    // Configuration exacte du bot
    const settingsFile = path.join(process.cwd(), '.claude', 'settingsM.json');
    const agentsFile = path.join(process.cwd(), '.claude', 'agents', 'discord-agent-simple.json');

    const escapedMessage = testMessage.replace(/"/g, '\\"');

    // COMMANDE EXACTE du bot (mode persistant CORRIGÉ)
    const command = `claude --dangerously-skip-permissions --settings "${settingsFile}" --agents "${agentsFile}" --agent discord-agent --print --output-format json "${escapedMessage}"`;

    console.log('📋 Message test:', testMessage);
    console.log('⚙️ Settings:', settingsFile);
    console.log('🤖 Agents:', agentsFile);
    console.log('🚀 Commande exacte:', command);
    console.log('');

    try {
        console.log('⏱️ Exécution de la commande...');
        const startTime = Date.now();

        const { stdout, stderr } = await execAsync(command, {
            timeout: 60000,
            maxBuffer: 1024 * 1024 * 10
        });

        const duration = Date.now() - startTime;

        console.log('✅ Succès !');
        console.log(`⏱️ Durée: ${duration}ms`);
        console.log(`📏 Taille réponse: ${stdout.length} caractères`);
        console.log('');
        console.log('📤 STDOUT:');
        console.log(stdout);
        console.log('');

        if (stderr) {
            console.log('⚠️ STDERR:');
            console.log(stderr);
            console.log('');
        }

        // Analyse de la réponse
        console.log('🔍 Analyse de la réponse:');

        if (stdout.trim() === '') {
            console.log('❌ Réponse VIDE - Claude n\'a rien retourné');
        } else if (stdout.includes('{"type":"result"')) {
            console.log('✅ Format JSON détecté - Claude CLI fonctionne');
            try {
                const parsed = JSON.parse(stdout);
                console.log('✅ JSON parsable');
                console.log('📝 Contenu parsed.result:', parsed.result);
            } catch (e) {
                console.log('❌ JSON non-parsable malgré le format');
            }
        } else {
            console.log('⚠️ Format texte brut détecté');
            console.log('📝 Contenu brut:', stdout.substring(0, 200));
        }

    } catch (error) {
        console.log('❌ ERREUR:', error.message);

        if (error.code === 'ETIMEDOUT') {
            console.log('⏰ TIMEOUT - Claude ne répond pas dans le temps imparti');
        } else if (error.signal === 'SIGTERM') {
            console.log('💀 PROCESS KILLED - Processus terminé');
        } else if (error.code) {
            console.log('🔢 Code d\'erreur:', error.code);
        }

        if (error.stdout) {
            console.log('📤 Partial STDOUT:');
            console.log(error.stdout);
        }

        if (error.stderr) {
            console.log('📤 STDERR:');
            console.log(error.stderr);
        }
    }
}

// Test avec echo + pipe (mode fallback)
async function testClaudeWithEcho() {
    console.log('\n🧪 Test avec echo + pipe (mode fallback)...\n');

    const command = `echo "sa vas ?" | claude --dangerously-skip-permissions --settings ".claude/settingsM.json" --agents ".claude/agents/discord-agent-simple.json" --agent discord-agent --print --output-format json`;

    console.log('🚀 Commande echo+pipe:', command);
    console.log('');

    try {
        const startTime = Date.now();
        const { stdout, stderr } = await execAsync(command, {
            timeout: 60000,
            maxBuffer: 1024 * 1024 * 10
        });

        const duration = Date.now() - startTime;

        console.log('✅ Succès !');
        console.log(`⏱️ Durée: ${duration}ms`);
        console.log('');
        console.log('📤 STDOUT:');
        console.log(stdout);

        if (stderr) {
            console.log('⚠️ STDERR:');
            console.log(stderr);
        }

    } catch (error) {
        console.log('❌ ERREUR:', error.message);
    }
}

async function main() {
    await testClaudeCommand();
    await testClaudeWithEcho();
}

main().catch(console.error);