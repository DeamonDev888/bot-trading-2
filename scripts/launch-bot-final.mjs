#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

console.log('🚀 LANCEMENT BOT FINAL - Claude Code');
console.log('='.repeat(60));

const botPath = path.join(PROJECT_ROOT, 'dist', 'discord_bot', 'sniper_financial_bot.js');
const pidFile = path.join(PROJECT_ROOT, 'sniper_bot.pid');

// Tuer l'ancien
try {
    const oldPid = parseInt(fs.readFileSync(pidFile, 'utf8').trim());
    if (oldPid) {
        try { process.kill(oldPid, 'SIGTERM'); console.log(`🧹 Ancien PID ${oldPid} terminé`); } catch (e) {}
    }
} catch (e) {}

// Wrapper qui maintient le processus en vie
const wrapperCode = `
import { pathToFileURL } from 'url';
import path from 'path';

// Charger le bot
const botPath = '${botPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}';
const bot = await import(pathToFileURL(botPath).href);

// Attendre la connexion
const client = bot.client || bot.default?.client;

if (!client) {
    console.error('❌ Client Discord non trouvé');
    process.exit(1);
}

// Écouter l'événement ready
client.once('ready', () => {
    console.log('✅ Bot connecté, maintenant en vie...');
});

// Maintenir le processus en vie
console.log('🔄 Maintien du processus en vie...');
const keepAlive = setInterval(() => {
    // Ne rien faire, juste maintenir en vie
}, 10000);

// Gestion arrêt propre
process.on('SIGINT', () => {
    console.log('\\n🛑 Arrêt demandé...');
    clearInterval(keepAlive);
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\\n🛑 Arrêt demandé...');
    clearInterval(keepAlive);
    process.exit(0);
});
`;

const wrapperPath = path.join(PROJECT_ROOT, 'bot_wrapper.mjs');
fs.writeFileSync(wrapperPath, wrapperCode);

console.log('🔧 Wrapper créé');
console.log('🔄 Lancement...');

const bot = spawn('node', ['--no-warnings', wrapperPath], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    env: {
        ...process.env,
        NODE_PATH: path.join(PROJECT_ROOT, 'dist')
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
        try { fs.unlinkSync(pidFile); } catch (e2) {}
        process.exit(0);
    }
}, 10000);

bot.unref();
