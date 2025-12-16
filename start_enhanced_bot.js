#!/usr/bin/env node

/**
 * Lanceur du NovaQuote Enhanced Bot
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Démarrage NovaQuote Enhanced Bot...');
console.log('📡 Connexion à Discord...');

// Démarrer le bot
const botProcess = spawn('node', [path.join(__dirname, 'dist', 'discord_bot', 'EnhancedNovaBot.js')], {
  stdio: 'inherit',
  env: process.env
});

botProcess.on('error', (error) => {
  console.error('❌ Erreur démarrage bot:', error);
});

botProcess.on('close', (code) => {
  console.log(`Bot arrêté avec code: ${code}`);
});

// Gérer l'arrêt propre
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt du bot...');
  botProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Arrêt forcé du bot...');
  botProcess.kill('SIGTERM');
});

console.log('✅ Bot NovaQuote Enhanced démarré !');
console.log('📋 Commandes disponibles: !aide, !profil, !classement, !analyse, !sondage, !roles, !stats');
console.log('⚡ Arrêt: Ctrl+C');

// Maintenir le processus actif
process.stdin.resume();