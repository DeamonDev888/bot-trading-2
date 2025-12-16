#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

console.log('🔍 LANCEMENT BOT DEBUG');
console.log('='.repeat(60));
console.log(`📁 Project root: ${PROJECT_ROOT}`);

const botPath = path.join(PROJECT_ROOT, 'dist', 'discord_bot', 'sniper_financial_bot.js');
const logFile = path.join(PROJECT_ROOT, 'bot_debug.log');

// Supprimer l'ancien log
if (fs.existsSync(logFile)) {
    fs.unlinkSync(logFile);
}

console.log(`📄 Log file: ${logFile}`);
console.log('');

// Lancer le bot avec debug
const bot = spawn('node', ['--trace-warnings', '--unhandled-rejections=strict', botPath], {
    cwd: PROJECT_ROOT,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: {
        ...process.env,
        NODE_PATH: path.join(PROJECT_ROOT, 'dist')
    }
});

// Logger stdout
bot.stdout.on('data', (data) => {
    const text = data.toString();
    console.log(text);
    fs.appendFileSync(logFile, text);
});

// Logger stderr
bot.stderr.on('data', (data) => {
    const text = data.toString();
    console.error(text);
    fs.appendFileSync(logFile, text);
});

bot.on('close', (code) => {
    console.log('');
    console.log(`📴 Bot arrêté avec code: ${code}`);
    console.log(`📋 Log complet: ${logFile}`);
    process.exit(code);
});

bot.on('error', (error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
});

// Capture globale
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
    fs.appendFileSync(logFile, `\n❌ Unhandled Rejection: ${reason}\n`);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    fs.appendFileSync(logFile, `\n❌ Uncaught Exception: ${error}\n`);
});

// Gestion graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt...');
    bot.kill('SIGINT');
});
