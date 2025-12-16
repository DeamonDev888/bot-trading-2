#!/usr/bin/env node

// Script de test pour la connexion DTC
import { SierraChartDTC } from './src/backend/modules/SierraChartDTC.mjs';
import { readFileSync } from 'fs';

console.log('🚀 TEST CONNEXION SIERRA CHART DTC');

// Charger la configuration
const config = JSON.parse(readFileSync('./sierra-dtc-config.json', 'utf8'));

const dtc = new SierraChartDTC({
  host: config.sierraChart.host,
  port: config.sierraChart.port
});

async function runTest() {
  try {
    console.log('\n📡 Connexion à Sierra Chart...');
    await dtc.connect();

    console.log('\n📊 Souscription aux symboles...');
    config.subscriptions.symbols.forEach(symbolConfig => {
      dtc.subscribeToMarketData(symbolConfig.symbol, symbolConfig.exchange);
      dtc.subscribeToCommonStudies(symbolConfig.symbol);
    });

    // Attendre les données
    console.log('\n⏱️ Attente des données (30 secondes)...');
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    dtc.disconnect();
  }
}

// Configuration des événements
dtc.on('connected', () => {
  console.log('✅ Connecté !');
});

dtc.on('marketData', (data) => {
  const symbol = config.subscriptions.symbols.find(s => s.symbol === data.symbol);
  const name = symbol ? symbol.name : data.symbol;
  console.log(`📈 ${name}: $${data.lastPrice?.toLocaleString() || 'N/A'}`);
});

dtc.on('studyData', (data) => {
  const lastValue = data.values[data.values.length - 1];
  console.log(`📊 ${data.symbol} ${data.studyName}: ${lastValue?.toFixed(2) || 'N/A'}`);
});

dtc.on('error', (error) => {
  console.error('❌ Erreur DTC:', error.message);
});

dtc.on('disconnected', () => {
  console.log('🔌 Déconnecté');
  process.exit(0);
});

// Démarrer le test
runTest();
