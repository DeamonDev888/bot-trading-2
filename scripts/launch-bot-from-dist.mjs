#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

console.log('🚀 LANCEMENT BOT DEPUIS DIST/');
console.log('='.repeat(60));
console.log(`📁 Project root: ${PROJECT_ROOT}`);
console.log(`📁 Dist path: ${PROJECT_ROOT}/dist`);
console.log('');

// Lancer le bot depuis dist/
const botPath = path.join(PROJECT_ROOT, 'dist', 'discord_bot', 'sniper_financial_bot.js');

console.log('🔄 Lancement du bot...');
console.log(`📄 Fichier: ${botPath}`);
console.log('');

const bot = spawn('node', [botPath], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    env: {
        ...process.env,
        NODE_PATH: path.join(PROJECT_ROOT, 'dist')
    }
});

bot.on('close', (code) => {
    console.log('');
    console.log(`📴 Bot arrêté avec code: ${code}`);
    process.exit(code);
});

bot.on('error', (error) => {
    console.error('❌ Erreur lors du lancement:', error);
    process.exit(1);
});

// Gestion graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt en cours...');
    bot.kill('SIGINT');
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Arrêt en cours...');
    bot.kill('SIGTERM');
});
