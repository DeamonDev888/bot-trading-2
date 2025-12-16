#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

console.log('🚀 LANCEMENT BOT PATCHED - Claude Code');
console.log('='.repeat(60));

const botPath = path.join(PROJECT_ROOT, 'dist', 'discord_bot', 'sniper_financial_bot.js');
const pidFile = path.join(PROJECT_ROOT, 'sniper_bot.pid');

// Tuer l'ancien
try {
    const oldPid = parseInt(fs.readFileSync(pidFile, 'utf8').trim());
    if (oldPid) {
        try { process.kill(oldPid, 'SIGTERM'); } catch (e) {}
    }
} catch (e) {}

// Charger le source du bot
const botSource = fs.readFileSync(botPath, 'utf8');

// Patch: ignorer uncaughtException pour DeprecationWarning
const patchedSource = botSource.replace(
    /process\.on\('uncaughtException',\s*\(error\)\s*=>\s*\{[\s\S]*?process\.exit\(1\);\s*\}\);/,
    `process.on('uncaughtException', (error) => {
        if (error && error.message && error.message.includes('DeprecationWarning')) {
            console.warn('⚠️ DeprecationWarning ignoré:', error.message);
            return;
        }
        console.error('❌ Uncaught Exception:', error);
        process.exit(1);
    });`
);

// Sauver le patch
const patchedPath = path.join(PROJECT_ROOT, 'dist', 'discord_bot', 'sniper_financial_bot_patched.js');
fs.writeFileSync(patchedPath, patchedSource);

console.log('🔧 Patch appliqué');
console.log('🔄 Lancement...');

const bot = spawn('node', [patchedPath], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    env: {
        ...process.env,
        NODE_PATH: path.join(PROJECT_ROOT, 'dist'),
        DISCORD_CHANNEL_LOGS: ''
    }
});

fs.writeFileSync(pidFile, bot.pid.toString());

console.log(`✅ Bot démarré (PID: ${bot.pid})`);
console.log('');
console.log('📋 Commands:');
console.log(`   ps -p ${bot.pid}  → Statut`);
console.log(`   kill ${bot.pid}   → Arrêter`);
console.log('');

// Surveiller
setInterval(() => {
    try {
        process.kill(bot.pid, 0);
    } catch (e) {
        console.log(`❌ Bot arrêté (PID ${bot.pid})`);
        fs.unlinkSync(pidFile);
        process.exit(0);
    }
}, 5000);

bot.unref();
