#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

console.log('🚀 LANCEMENT BOT SÉCURISÉ - Claude Code');
console.log('='.repeat(60));

const botPath = path.join(PROJECT_ROOT, 'dist', 'discord_bot', 'sniper_financial_bot.js');
const pidFile = path.join(PROJECT_ROOT, 'sniper_bot.pid');

// Tuer l'ancien processus
try {
    const oldPid = parseInt(fs.readFileSync(pidFile, 'utf8').trim());
    if (oldPid) {
        try {
            process.kill(oldPid, 'SIGTERM');
            console.log(`🧹 Ancien PID ${oldPid} terminé`);
        } catch (e) {
            console.log(`ℹ️ PID ${oldPid} déjà mort`);
        }
    }
} catch (e) {}

// Démarrer le bot
console.log('🔄 Lancement...');

const bot = spawn('node', [
    '-e',
    `
    // Patch pour ignorer l'erreur d'initialisation Claude
    process.on('unhandledRejection', (reason) => {
        if (reason && reason.toString().includes('initializeClaudeSession')) {
            console.warn('⚠️ Erreur Claude ignorée, continuation...');
            return;
        }
        console.error('❌ Unhandled Rejection:', reason);
    });

    // Charger et exécuter le bot
    import('${botPath.replace(/'/g, "\\'")}');
    `
], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    env: {
        ...process.env,
        NODE_PATH: path.join(PROJECT_ROOT, 'dist'),
        DISCORD_CHANNEL_LOGS: '' // Désactiver logs Discord
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
}, 10000);

bot.unref();
