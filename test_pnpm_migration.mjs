#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🔄 MIGRATION NPM → PNPM');
console.log('='.repeat(60));

async function migrateToPnpm() {
    try {
        // Test 1: Vérifier pnpm
        console.log('\n📦 Test 1: Vérification pnpm');
        try {
            const { stdout } = await execAsync('pnpm --version');
            console.log(`✅ pnpm installé: v${stdout.trim()}`);
        } catch {
            console.log('❌ pnpm non installé');
            console.log('💡 Installer avec: npm install -g pnpm');
            return;
        }

        // Test 2: Supprimer node_modules et lock npm
        console.log('\n🧹 Test 2: Nettoyage');
        await execAsync('rm -rf node_modules package-lock.json');
        console.log('✅ Nettoyage effectué');

        // Test 3: Installation pnpm
        console.log('\n📥 Test 3: Installation pnpm');
        console.log('⏳ Installation en cours...');
        await execAsync('pnpm install', { timeout: 120000 });
        console.log('✅ Dépendances installées avec pnpm');

        // Test 4: Build
        console.log('\n🔨 Test 4: Build');
        const { stdout: buildOutput } = await execAsync('pnpm run build');
        console.log('✅ Build réussi');

        // Test 5: Scripts pnpm
        console.log('\n📋 Test 5: Scripts disponibles');
        const scripts = [
            'bot',
            'bot:simple',
            'build',
            'analyze',
            'status'
        ];

        for (const script of scripts) {
            console.log(`  • pnpm run ${script}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ MIGRATION PNPM RÉUSSIE !');
        console.log('\n🚀 Commandes de production:');
        console.log('  pnpm run bot         - Bot Discord complet');
        console.log('  pnpm run bot:simple  - Version simple');
        console.log('  pnpm run analyze     - Analyse de marché');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        process.exit(1);
    }
}

migrateToPnpm();
