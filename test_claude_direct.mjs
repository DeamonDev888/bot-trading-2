#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

const execAsync = promisify(exec);
dotenv.config();

async function testClaudeDirect() {
    console.log('🧪 TEST DIRECT DE CLAUDE EN MODE PRINT');
    console.log('=====================================');

    try {
        // Test 1: Commande simple sans config
        console.log('\n1️⃣ Test commande simple...');
        const { stdout: output1 } = await execAsync('claude -p "Bonjour, dis bonjour"');
        console.log('✅ Réponse:', output1.substring(0, 200));

        // Test 2: Avec config et agent
        console.log('\n2️⃣ Test avec agent discord...');
        const command2 = `claude -p --settings ".claude/settingsZ.json" --agents ".claude/agents/discord-agent-simple.json" --agent discord-agent "Sondage sur Bitcoin"`;
        console.log('📝 Commande:', command2);
        const { stdout: output2 } = await execAsync(command2, { timeout: 30000 });
        console.log('✅ Réponse:', output2.substring(0, 300));

        console.log('\n✅ TOUS LES TESTS SONT PASSÉS !');

    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        if (error.stdout) console.error('STDOUT:', error.stdout);
        if (error.stderr) console.error('STDERR:', error.stderr);
    }
}

testClaudeDirect();
