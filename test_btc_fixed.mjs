// Test du service SierraChart corrigé pour obtenir le prix du BTC
console.log('🚀 Test SierraChart FIXED pour BTC...\n');

import { SierraChartServiceFixed } from './dist/backend/sierrachart/SierraChartServiceFixed.js';
import { config } from 'dotenv';

// Charger les variables d'environnement
config({ path: '.env' });

// Configuration depuis le .env
const sierraConfig = {
  host: process.env.SIERRACHART_HOST || 'localhost',
  port: parseInt(process.env.SIERRACHART_PORT) || 11099,
  username: process.env.SIERRACHART_USERNAME || 'admin',
  password: process.env.SIERRACHART_PASSWORD || 'password',
  autoReconnect: process.env.SIERRACHART_AUTO_RECONNECT === 'true',
  timeout: parseInt(process.env.SIERRACHART_TIMEOUT) || 10000
};

// Configuration Bitcoin
const btcConfig = {
  symbol: process.env.BTC_SYMBOL || 'BTCUSD',
  exchange: process.env.BTC_EXCHANGE || '',
  interval: parseInt(process.env.BTC_INTERVAL) || 1
};

console.log('📋 Configuration SierraChart:');
console.log(`   Host: ${sierraConfig.host}`);
console.log(`   Port: ${sierraConfig.port}`);
console.log(`   Username: ${sierraConfig.username}`);
console.log(`   Auto-reconnect: ${sierraConfig.autoReconnect}`);
console.log(`   Timeout: ${sierraConfig.timeout}ms\n`);

console.log('📋 Configuration Bitcoin:');
console.log(`   Symbole: ${btcConfig.symbol}`);
console.log(`   Exchange: ${btcConfig.exchange}`);
console.log(`   Interval: ${btcConfig.interval}\n`);

let priceUpdates = 0;
let lastPrice = null;
let startTime = Date.now();
let connectedSuccessfully = false;

async function testSierraChartFixed() {
  console.log('🔌 Création du service SierraChart FIXED...');
  const sierraService = new SierraChartServiceFixed(sierraConfig);

  // Configuration des event handlers
  sierraService.setEventHandlers({
    onConnectionStatusChange: (status) => {
      console.log(`📊 Status: ${status.isConnected ? '✅ Connecté' : '❌ Déconnecté'}`);
      if (status.lastError) {
        console.log(`   Erreur: ${status.lastError}`);
      }

      if (status.isConnected && !connectedSuccessfully) {
        connectedSuccessfully = true;
        console.log('💚 Connexion DTC établie avec succès!');
        console.log('💚 Demande des données de marché pour BTC...');

        // Demander les données de marché pour BTC
        sierraService.requestMarketData({
          Symbol: btcConfig.symbol,
          Exchange: btcConfig.exchange || '',
          RequestID: 1,
          Interval: btcConfig.interval,
          UseZCompression: false  // Commençons sans compression
        });
      }
    },

    onMarketDataUpdate: (data) => {
      priceUpdates++;

      if (data.LastTradePrice && data.LastTradePrice !== lastPrice) {
        lastPrice = data.LastTradePrice;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log(`📈 [${elapsed}s] ${data.Symbol}: $${lastPrice.toLocaleString()}`);

        if (data.BidPrice && data.AskPrice) {
          console.log(`       Bid: $${data.BidPrice.toLocaleString()} | Ask: $${data.AskPrice.toLocaleString()}`);
        }
        if (data.LastTradeVolume) {
          console.log(`       Volume: ${data.LastTradeVolume.toLocaleString()}`);
        }

        // Afficher un résumé toutes les 5 mises à jour
        if (priceUpdates % 5 === 0) {
          console.log(`📊 ${priceUpdates} prix reçus | Actuel: $${lastPrice.toLocaleString()}`);
        }
      }
    },

    onError: (error) => {
      console.error(`❌ Erreur SierraChart: ${error.message}`);
    }
  });

  try {
    console.log('🔌 Tentative de connexion avec protocole DTC corrigé...');
    await sierraService.connect();

    // Garder la connexion active pendant 30 secondes
    console.log('⏱️  Surveillance active pendant 30 secondes...\n');

    setTimeout(() => {
      const status = sierraService.getConnectionStatus();
      console.log(`\n📋 Status final:`);
      console.log(`   Connecté: ${status.isConnected}`);
      console.log(`   Mises à jour reçues: ${priceUpdates}`);
      console.log(`   Dernier prix: ${lastPrice ? `$${lastPrice.toLocaleString()}` : 'Non reçu'}`);

      if (!connectedSuccessfully) {
        console.log('\n🔧 Dépannage si non connecté:');
        console.log('1. Vérifiez "Enable DTC Server" dans SierraChart');
        console.log('2. Vérifiez "Allow connections from external tools"');
        console.log('3. Port: 11099');
        console.log('4. Username/password dans SierraChart DTC config');
      } else if (priceUpdates === 0) {
        console.log('\n💡 Si pas de données reçues:');
        console.log('1. Ajoutez le symbole BTC à un chart dans SierraChart');
        console.log('2. Essayez différents symboles: BTCUSD, BTCHUSD, XBTUSD');
        console.log('3. Vérifiez que votre data feed supporte les crypto');
      } else {
        console.log('\n🎉 SUCCÈS! Données BTC reçues en temps réel!');
      }

      sierraService.disconnect();
      process.exit(0);
    }, 30000);

  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);

    console.log('\n🔧 Instructions de configuration SierraChart:');
    console.log('1. File > Connect > Data');
    console.log('2. Onglet "DTC Server":');
    console.log('   ✅ Enable DTC Server');
    console.log('   ✅ Port: 11099');
    console.log('   ✅ Allow connections from external tools');
    console.log('   ✅ Username: admin');
    console.log('   ✅ Password: password');
    console.log('3. Cliquez "Start"');
    console.log('4. File > New/Open Chart');
    console.log('5. Symbol: BTCUSD (ou autre symbole crypto)');

    process.exit(1);
  }
}

// Gérer l'interruption
process.on('SIGINT', () => {
  console.log('\n\n🛑 Arrêt demandé par l\'utilisateur');
  process.exit(0);
});

// Exécuter
testSierraChartFixed().catch(console.error);