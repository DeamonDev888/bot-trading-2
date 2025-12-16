// Script pour obtenir le prix du BTC en temps réel via SierraChart
console.log('🚀 Obtention du prix du BTC via SierraChart...\n');

import { SierraChartService } from './dist/backend/sierrachart/SierraChartService.js';

// Configuration pour SierraChart
const config = {
  host: 'localhost',
  port: 11099,
  autoReconnect: true,
  timeout: 10000
};

// Symbole Bitcoin sur SierraChart (peut varier selon votre data feed)
const BTC_SYMBOL = 'BTC';  // ou 'BTCUSD', 'BTCUSDT', 'XBTUSD' selon le data feed
const BTC_EXCHANGE = 'CRYPTO';  // ou 'BINANCE', 'COINBASE', etc.

let priceUpdates = 0;
let lastPrice = null;
let startTime = Date.now();

async function getBTCPrice() {
  console.log('📡 Connexion à SierraChart...');
  console.log(`   Host: ${config.host}:${config.port}`);
  console.log(`   Symbole: ${BTC_SYMBOL}`);
  console.log(`   Exchange: ${BTC_EXCHANGE}\n`);

  try {
    // Créer le service SierraChart
    const sierraService = new SierraChartService(config);

    // Configuration des event handlers
    sierraService.setEventHandlers({
      onConnectionStatusChange: (status) => {
        console.log(`📊 Status: ${status.isConnected ? '✅ Connecté' : '❌ Déconnecté'}`);
        if (status.lastError) {
          console.log(`   Erreur: ${status.lastError}`);
        }
        if (status.isConnected) {
          console.log('   💚 Connexion établie, demande des données BTC...');

          // Demander les données de marché pour BTC
          sierraService.requestMarketData({
            Symbol: BTC_SYMBOL,
            Exchange: BTC_EXCHANGE,
            RequestID: 1,
            Interval: 1,
            UseZCompression: true
          });
        }
      },

      onMarketDataUpdate: (data) => {
        if (data.Symbol === BTC_SYMBOL) {
          priceUpdates++;

          if (data.LastTradePrice && data.LastTradePrice !== lastPrice) {
            lastPrice = data.LastTradePrice;
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

            console.log(`📈 [${elapsed}s] BTC: $${lastPrice.toLocaleString()} | Vol: ${data.Volume || 'N/A'} | Bid: $${data.BidPrice || 'N/A'} | Ask: $${data.AskPrice || 'N/A'}`);

            // Afficher les indicateurs techniques toutes les 10 mises à jour
            if (priceUpdates % 10 === 0) {
              console.log(`📊 ${priceUpdates} mises à jour reçues | Dernière: $${lastPrice.toLocaleString()}`);
            }
          }
        }
      },

      onError: (error) => {
        console.error(`❌ Erreur: ${error.message}`);
      }
    });

    // Se connecter
    console.log('🔌 Tentative de connexion...');
    await sierraService.connect();

    // Attendre un peu puis afficher le status
    setTimeout(() => {
      const status = sierraService.getConnectionStatus();
      console.log(`\n📋 Status après 5 secondes:`);
      console.log(`   Connecté: ${status.isConnected}`);
      console.log(`   Mises à jour reçues: ${priceUpdates}`);
      console.log(`   Dernier prix: ${lastPrice ? `$${lastPrice.toLocaleString()}` : 'Non reçu'}`);

      if (!status.isConnected) {
        console.log('\n💡 Conseils:');
        console.log('   1. Vérifiez que SierraChart est en cours d\'exécution');
        console.log('   2. Vérifiez la configuration DTC sur le port 11099');
        console.log('   3. Vérifiez que le data feed crypto est activé');
        console.log('   4. Essayez d\'autres symboles: BTCUSD, XBTUSD, BTCUSDT');
      } else if (priceUpdates === 0) {
        console.log('\n💡 Conseils si pas de données:');
        console.log('   1. Le symbole BTC est peut-être incorrect pour votre data feed');
        console.log('   2. Essayez: BTCUSD, XBTUSD, BTCUSDT, BTC/USD');
        console.log('   3. Vérifiez que vous avez un data feed crypto actif');
        console.log('   4. Ajoutez BTC à votre chart dans SierraChart');
      }
    }, 5000);

    // Garder la connexion active pendant 30 secondes
    console.log('⏱️  Surveillance active pendant 30 secondes...\n');

    setTimeout(() => {
      console.log('\n🏁 Fin du test');
      console.log(`📊 Résumé:`);
      console.log(`   • Mises à jour reçues: ${priceUpdates}`);
      console.log(`   • Prix final: ${lastPrice ? `$${lastPrice.toLocaleString()}` : 'Non reçu'}`);
      console.log(`   • Durée: ${((Date.now() - startTime) / 1000).toFixed(1)} secondes`);

      sierraService.disconnect();
      process.exit(0);
    }, 30000);

  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);

    console.log('\n🔧 Dépannage:');
    console.log('1. Assurez-vous que SierraChart est en cours d\'exécution');
    console.log('2. Allez dans SierraChart: File > Connect > Data');
    console.log('3. Configurez le serveur DTC:');
    console.log('   - Cochez "Enable DTC server"');
    console.log('   - Port: 11099');
    console.log('   - Cochez "Allow connections from external tools"');
    console.log('4. Assurez-vous d\'avoir un data feed crypto actif');

    process.exit(1);
  }
}

// Gérer l'interruption (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\n\n🛑 Arrêt demandé par l\'utilisateur');
  process.exit(0);
});

// Exécuter
getBTCPrice().catch(console.error);