// Script SierraChart pour obtenir le prix du BTC en utilisant .env
console.log('🚀 Connexion SierraChart avec configuration .env...\n');

import { SierraChartService } from './dist/backend/sierrachart/SierraChartService.js';
import { config } from 'dotenv';

// Charger les variables d'environnement
config({ path: '.env' });

// Configuration depuis le .env
const sierraConfig = {
  host: process.env.SIERRACHART_HOST || 'localhost',
  port: parseInt(process.env.SIERRACHART_PORT) || 11099,
  username: process.env.SIERRACHART_USERNAME,
  password: process.env.SIERRACHART_PASSWORD,
  autoReconnect: process.env.SIERRACHART_AUTO_RECONNECT === 'true',
  timeout: parseInt(process.env.SIERRACHART_TIMEOUT) || 10000
};

// Configuration Bitcoin
const btcConfig = {
  symbol: process.env.BTC_SYMBOL || 'BTCHUSD',
  exchange: process.env.BTC_EXCHANGE || 'CME',
  interval: parseInt(process.env.BTC_INTERVAL) || 1
};

console.log('📋 Configuration SierraChart:');
console.log(`   Host: ${sierraConfig.host}`);
console.log(`   Port: ${sierraConfig.port}`);
console.log(`   Username: ${sierraConfig.username || 'Non défini'}`);
console.log(`   Auto-reconnect: ${sierraConfig.autoReconnect}`);
console.log(`   Timeout: ${sierraConfig.timeout}ms\n`);

console.log('📋 Configuration Bitcoin:');
console.log(`   Symbole: ${btcConfig.symbol}`);
console.log(`   Exchange: ${btcConfig.exchange}`);
console.log(`   Interval: ${btcConfig.interval}\n`);

let priceUpdates = 0;
let lastPrice = null;
let startTime = Date.now();

async function connectToSierraChart() {
  console.log('🔌 Création du service SierraChart...');
  const sierraService = new SierraChartService(sierraConfig);

  // Configuration des event handlers
  sierraService.setEventHandlers({
    onConnectionStatusChange: (status) => {
      console.log(`📊 Status: ${status.isConnected ? '✅ Connecté' : '❌ Déconnecté'}`);

      if (status.lastError) {
        console.log(`   Erreur: ${status.lastError}`);
      }

      if (status.isConnected) {
        console.log('💚 Connexion établie avec succès!');
        console.log('💚 Demande des données de marché pour BTC...');

        // Demander les données de marché pour BTC
        sierraService.requestMarketData({
          Symbol: btcConfig.symbol,
          Exchange: btcConfig.exchange,
          RequestID: 1,
          Interval: btcConfig.interval,
          UseZCompression: true
        });
      }
    },

    onMarketDataUpdate: (data) => {
      if (data.Symbol === btcConfig.symbol) {
        priceUpdates++;

        if (data.LastTradePrice && data.LastTradePrice !== lastPrice) {
          lastPrice = data.LastTradePrice;
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

          console.log(`📈 [${elapsed}s] ${btcConfig.symbol}: $${lastPrice.toLocaleString()} | Vol: ${data.Volume || 'N/A'} | Bid: $${data.BidPrice || 'N/A'} | Ask: $${data.AskPrice || 'N/A'}`);

          // Afficher les indicateurs toutes les 10 mises à jour
          if (priceUpdates % 10 === 0) {
            console.log(`📊 ${priceUpdates} mises à jour reçues | Dernier: $${lastPrice.toLocaleString()}`);
          }
        }
      }
    },

    onError: (error) => {
      console.error(`❌ Erreur SierraChart: ${error.message}`);
    }
  });

  try {
    console.log('🔌 Tentative de connexion...');
    await sierraService.connect();

    // Garder la connexion active
    console.log('⏱️  Surveillance active...\n');

    setTimeout(() => {
      const status = sierraService.getConnectionStatus();
      console.log(`\n📋 Status après 10 secondes:`);
      console.log(`   Connecté: ${status.isConnected}`);
      console.log(`   Mises à jour reçues: ${priceUpdates}`);
      console.log(`   Dernier prix: ${lastPrice ? `$${lastPrice.toLocaleString()}` : 'Non reçu'}`);

      if (!status.isConnected) {
        console.log('\n🔧 Dépannage:');
        console.log('1. Vérifiez que SierraChart est en cours d\'exécution');
        console.log('2. Allez dans File > Connect > Data dans SierraChart');
        console.log('3. Configurez le serveur DTC:');
        console.log('   - Cochez "Enable DTC server"');
        console.log('   - Port: 11099');
        console.log('   - Cochez "Allow connections from external tools"');
        console.log('4. Mettez à jour votre .env avec les bons identifiants');
        console.log('5. Vérifiez que le data feed crypto est actif');
      } else if (priceUpdates === 0) {
        console.log('\n💡 Pas de données reçues:');
        console.log('1. Le symbole peut être incorrect - essayez: BTCUSD, XBTUSD, BTC/USD');
        console.log('2. Ajoutez le symbole à votre chart dans SierraChart');
        console.log('3. Vérifiez que vous avez un data feed crypto actif');
      }

      sierraService.disconnect();
      process.exit(0);
    }, 10000);

  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);

    console.log('\n🔧 Instructions de configuration SierraChart:');
    console.log('1. Ouvrez SierraChart');
    console.log('2. Allez dans: File > Connect to Data Feed');
    console.log('3. Configurez votre data feed (si pas déjà fait)');
    console.log('4. Allez dans: File > Connect > Data');
    console.log('5. Dans l\'onglet "DTC Server":');
    console.log('   - Cochez "Enable DTC server"');
    console.log('   - Port: 11099');
    console.log('   - Cochez "Allow connections from external tools"');
    console.log('   - (Optionnel) Entrez Username/Password');
    console.log('6. Cliquez sur "Start"');
    console.log('7. Ajoutez un chart avec le symbole BTC/Bitcoin');

    process.exit(1);
  }
}

// Gérer l'interruption
process.on('SIGINT', () => {
  console.log('\n\n🛑 Arrêt demandé par l\'utilisateur');
  process.exit(0);
});

// Exécuter
connectToSierraChart().catch(console.error);