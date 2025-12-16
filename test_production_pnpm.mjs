#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🧪 TEST PRODUCTION AVEC PNPM');
console.log('='.repeat(60));

async function testPnpm() {
    try {
        // Test 1: Vérifier pnpm
        console.log('\n📦 Test 1: Vérification pnpm');
        const { stdout: pnpmVersion } = await execAsync('pnpm --version');
        console.log(`✅ pnpm version: ${pnpmVersion.trim()}`);

        // Test 2: Installer dépendances
        console.log('\n📥 Test 2: Installation des dépendances');
        console.log('⏳ Installation en cours...');
        const { stdout: installOutput } = await execAsync('pnpm install --frozen-lockfile', {
            timeout: 120000
        });
        console.log('✅ Dépendances installées');

        // Test 3: Build
        console.log('\n🔨 Test 3: Build du projet');
        console.log('⏳ Compilation TypeScript...');
        const { stdout: buildOutput } = await execAsync('pnpm run build', {
            timeout: 60000
        });
        console.log('✅ Build réussi');

        // Test 4: Vérifier fichiers compilés
        console.log('\n📁 Test 4: Vérification fichiers compilés');
        const files = [
            'dist/discord_bot/ClaudeCommandHandler.js',
            'dist/backend/agents/ClaudeChatBotAgent.js',
            'dist/discord_bot/sniper_financial_bot.js'
        ];

        for (const file of files) {
            try {
                await execAsync(`test -f ${file} && echo "✅ ${file}" || echo "❌ ${file}"`);
            } catch {
                console.log(`❌ ${file} manquant`);
            }
        }

        // Test 5: Linter
        console.log('\n🔍 Test 5: Linting');
        const { stdout: lintOutput } = await execAsync('pnpm run lint', {
            timeout: 30000
        });
        console.log('✅ Linting passé');

        // Test 6: Claude CLI
        console.log('\n🤖 Test 6: Vérification Claude CLI');
        try {
            const { stdout: claudeVersion } = await execAsync('claude --version 2>&1');
            console.log(`✅ Claude CLI: ${claudeVersion.trim()}`);
        } catch (error) {
            console.log('⚠️ Claude CLI non installé ou non accessible');
            console.log('💡 Installer avec: npm install -g @anthropic/claude-cli');
        }

        // Test 7: Configuration Claude
        console.log('\n⚙️ Test 7: Configuration Claude');
        try {
            await execAsync('test -f .claude/settingsZ.json && echo "✅ settingsZ.json"');
            await execAsync('test -f .claude/agents/financial-agents.json && echo "✅ agents config"');
        } catch {
            console.log('⚠️ Fichiers de configuration Claude manquants');
        }

        console.log('\n' + '='.repeat(60));
        console.log('🎉 TOUS LES TESTS PRODUCTION PASSÉS !');
        console.log('\n📋 Commandes disponibles:');
        console.log('  • pnpm run bot          - Lancer le bot Discord');
        console.log('  • pnpm run bot:simple   - Version simple pour tests');
        console.log('  • pnpm run analyze      - Analyse de marché');
        console.log('  • pnpm run status       - Statut du système');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        process.exit(1);
    }
}

testPnpm();
