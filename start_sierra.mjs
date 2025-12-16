#!/usr/bin/env node

// Script de démarrage pour Sierra Chart Module
console.log('🚀 Démarrage du module Sierra Chart...\n');

import { SierraChartModule } from './src/backend/modules/SierraChartModule.mts';

// Chargement des variables d'environnement
import dotenv from 'dotenv';
dotenv.config();

const sierraModule = new SierraChartModule();

// Gestion des événements
sierraModule.on('priceUpdate', (data) => {
  console.log(`💰 ${data.symbol}: $${data.lastPrice} (${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(2)}%)`);
});

sierraModule.on('batchUpdate', (prices) => {
  if (prices.length > 0) {
    console.log(`\n📊 Mise à jour batch: ${prices.length} cryptomonnaies`);
  }
});

sierraModule.on('started', () => {
  console.log('✅ Module Sierra Chart démarré avec succès');

  // Affichage du statut après 3 secondes
  setTimeout(() => {
    sierraModule.showStatus();
  }, 3000);
});

sierraModule.on('stopped', () => {
  console.log('🔌 Module Sierra Chart arrêté');
  process.exit(0);
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Rejet non géré:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exception non capturée:', error);
  sierraModule.stop();
  process.exit(1);
});

// Gestion de l'arrêt propre
process.on('SIGINT', () => {
  console.log('\n👋 Arrêt demandé, arrêt du module...');
  sierraModule.stop();
});

process.on('SIGTERM', () => {
  console.log('\n👋 Signal SIGTERM reçu, arrêt du module...');
  sierraModule.stop();
});

// Démarrage du module
try {
  sierraModule.start(2000); // Surveillance toutes les 2 secondes
} catch (error) {
  console.error('❌ Erreur au démarrage:', error);
  process.exit(1);
}

// Maintien du processus actif
console.log('⏱️ Surveillance en cours... (Ctrl+C pour arrêter)');