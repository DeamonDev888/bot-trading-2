// Alternative simple pour obtenir le prix du BTC via API web
console.log('🚀 Obtention du prix du BTC via API web...\n');

import https from 'https';
import http from 'http';

// Configuration
const API_ENDPOINTS = [
  {
    name: 'CoinGecko',
    url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
    parser: (data) => ({
      price: data.bitcoin.usd,
      change24h: data.bitcoin.usd_24h_change
    })
  },
  {
    name: 'CoinAPI',
    url: 'https://rest.coinapi.io/v1/exchangerate/BTC/USD',
    headers: { 'X-CoinAPI-Key': 'YOUR_API_KEY' }, // Nécessite clé API
    parser: (data) => ({
      price: data.rate,
      change24h: null
    })
  },
  {
    name: 'Binance',
    url: 'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT',
    parser: (data) => ({
      price: parseFloat(data.lastPrice),
      change24h: parseFloat(data.priceChangePercent)
    })
  }
];

async function fetchBTCPrice(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.url);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Financial-Analyst-Bot/1.0',
        ...endpoint.headers
      },
      timeout: 5000
    };

    const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          const result = endpoint.parser(jsonData);
          resolve(result);
        } catch (error) {
          reject(new Error(`Erreur de parsing: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout de la requête'));
    });

    req.end();
  });
}

async function getBTCPriceFromMultipleSources() {
  console.log('📡 Tentative d\'obtenir le prix du BTC depuis plusieurs sources...\n');

  for (const endpoint of API_ENDPOINTS) {
    try {
      console.log(`🔄 Test avec ${endpoint.name}...`);
      const result = await fetchBTCPrice(endpoint);

      console.log(`✅ Succès avec ${endpoint.name}:`);
      console.log(`   💰 Prix BTC: $${result.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
      if (result.change24h !== null) {
        const changeSymbol = result.change24h >= 0 ? '📈' : '📉';
        console.log(`   ${changeSymbol} Change 24h: ${result.change24h.toFixed(2)}%`);
      }
      console.log('');

      // Retourner le premier résultat réussi
      return result;

    } catch (error) {
      console.log(`❌ Échec avec ${endpoint.name}: ${error.message}`);
      console.log('');
    }
  }

  throw new Error('Toutes les sources ont échoué');
}

async function simulateRealTimeUpdates(duration = 30000) {
  console.log(`🔄 Surveillance en temps réel pendant ${duration/1000} secondes...\n`);
  console.log('💡 Note: Ceci simule des mises à jour en interrogeant l\'API toutes les 2 secondes');
  console.log('💡 Pour un vrai flux en temps réel, il faudrait WebSocket ou SierraChart configuré\n');

  const startTime = Date.now();
  let updateCount = 0;
  let lastPrice = null;

  const interval = setInterval(async () => {
    try {
      const result = await getBTCPriceFromMultipleSources();
      updateCount++;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      // Afficher uniquement si le prix a changé
      if (lastPrice === null || Math.abs(result.price - lastPrice) > 0.01) {
        const changeSymbol = result.change24h >= 0 ? '📈' : '📉';
        const priceChange = lastPrice ? (result.price - lastPrice).toFixed(2) : '0.00';
        const priceChangeSymbol = result.price > lastPrice ? '⬆️' : result.price < lastPrice ? '⬇️' : '➡️';

        console.log(`📊 [${elapsed}s] BTC: $${result.price.toLocaleString()} ${priceChangeSymbol} ${priceChange} | ${changeSymbol} 24h: ${result.change24h.toFixed(2)}%`);
        lastPrice = result.price;
      }

      // Afficher un résumé toutes les 10 mises à jour
      if (updateCount % 10 === 0) {
        console.log(`📈 ${updateCount} mises à jour | Dernier prix: $${lastPrice.toLocaleString()}`);
      }

    } catch (error) {
      console.log(`❌ Erreur de mise à jour: ${error.message}`);
    }
  }, 2000); // Mise à jour toutes les 2 secondes

  // Arrêter après la durée spécifiée
  setTimeout(() => {
    clearInterval(interval);
    console.log(`\n🏁 Fin de la surveillance`);
    console.log(`📊 Résumé:`);
    console.log(`   • Mises à jour: ${updateCount}`);
    console.log(`   • Durée: ${((Date.now() - startTime) / 1000).toFixed(1)} secondes`);
    console.log(`   • Prix final: ${lastPrice ? `$${lastPrice.toLocaleString()}` : 'Non reçu'}`);

    console.log('\n💡 Intégration suggérée:');
    console.log('   1. Utiliser WebSocket pour un vrai flux en temps réel');
    console.log('   2. Configurer SierraChart correctement pour le DTC');
    console.log('   3. Ajouter cette source de prix à votre système financier');
    console.log('   4. Créer des alertes basées sur les mouvements de prix');

    process.exit(0);
  }, duration);
}

async function main() {
  try {
    // Obtenir le prix initial
    console.log('🎯 Obtention du prix initial du BTC...\n');
    const initialPrice = await getBTCPriceFromMultipleSources();

    console.log('💰 PRIX ACTUEL DU BITCOIN:');
    console.log(`   📈 Prix: $${initialPrice.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
    if (initialPrice.change24h !== null) {
      const changeSymbol = initialPrice.change24h >= 0 ? '📈' : '📉';
      console.log(`   ${changeSymbol} Change 24h: ${initialPrice.change24h.toFixed(2)}%`);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Démarrer la surveillance en temps réel simulée
    await simulateRealTimeUpdates(30000); // 30 secondes

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('\n🔧 Solutions alternatives:');
    console.log('   1. Vérifier votre connexion internet');
    console.log('   2. Essayer une autre API crypto');
    console.log('   3. Configurer SierraChart avec le bon data feed');
    console.log('   4. Utiliser WebSocket API (Binance, Kraken, etc.)');
    process.exit(1);
  }
}

// Gérer l'interruption
process.on('SIGINT', () => {
  console.log('\n\n🛑 Arrêt demandé par l\'utilisateur');
  process.exit(0);
});

main().catch(console.error);