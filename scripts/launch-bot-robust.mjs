#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

console.log('🚀 LANCEMENT BOT ROBUSTE - Claude Code');
console.log('='.repeat(60));
console.log(`📁 Project root: ${PROJECT_ROOT}`);

const botPath = path.join(PROJECT_ROOT, 'dist', 'discord_bot', 'sniper_financial_bot.js');

console.log(`📄 Bot: ${botPath}`);
console.log('');

// Nettoyer l'ancien PID si existant
const pidFile = path.join(PROJECT_ROOT, 'sniper_bot.pid');
try {
    const oldPid = parseInt(fs.readFileSync(pidFile, 'utf8').trim());
    if (oldPid && oldPid !== process.pid) {
        try {
            process.kill(oldPid, 'SIGTERM');
            console.log(`🧹 Ancien PID ${oldPid} terminé`);
        } catch (e) {
            console.log(`ℹ️ PID ${oldPid} déjà mort`);
        }
    }
} catch (e) {
    // Pas d'ancien PID
}

console.log('🔄 Démarrage du bot...');
console.log('');

const bot = spawn('node', [botPath], {
    cwd: PROJECT_ROOT,
    stdio: 'ignore',
    env: {
        ...process.env,
        NODE_PATH: path.join(PROJECT_ROOT, 'dist'),
        // Désactiver le canal de logs pour éviter les erreurs
        DISCORD_CHANNEL_LOGS: ''
    },
    detached: true
});

// Sauvegarder le PID
fs.writeFileSync(pidFile, bot.pid.toString());

console.log(`✅ Bot démarré avec PID: ${bot.pid}`);
console.log('');
console.log('📋 Commandes utiles:');
console.log(`   Voir statut: ps -p ${bot.pid}`);
console.log(`   Arrêter: kill ${bot.pid}`);
console.log(`   Logs: tail -f bot_debug.log`);
console.log('');

// Surveiller le processus
let aliveCheck = setInterval(() => {
    try {
        process.kill(bot.pid, 0); // Vérifie si le processus existe
    } catch (e) {
        console.log('');
        console.log(`❌ Bot arrêté (PID ${bot.pid})`);
        clearInterval(aliveCheck);
        fs.unlinkSync(pidFile);
        process.exit(0);
    }
}, 5000);

// Détacher le processus
bot.unref();

// Garder ce script vivant
process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt...');
    try {
        process.kill(bot.pid, 'SIGTERM');
    } catch (e) {}
    clearInterval(aliveCheck);
    fs.unlinkSync(pidFile);
    process.exit(0);
});

console.log('🎯 Bot en arrière-plan. Utilisez les commandes ci-dessus pour le gérer.');
