// Alternative WebSocket pour obtenir les prix BTC en temps réel
console.log('🚀 WebSocket pour BTC (alternative à SierraChart)...\n');

import WebSocket from 'ws';

const btcSources = [
  {
    name: 'Binance WebSocket',
    url: 'wss://stream.binance.com:9443/ws/btcusdt@trade',
    parser: (data) => {
      const parsed = JSON.parse(data);
      if (parsed.p) {
        return {
          symbol: 'BTC/USDT',
          price: parseFloat(parsed.p),
          volume: parseFloat(parsed.q),
          exchange: 'Binance',
          timestamp: parsed.T
        };
      }
      return null;
    }
  },
  {
    name: 'Kraken WebSocket',
    url: 'wss://ws.kraken.com/',
    parser: (data) => {
      const parsed = JSON.parse(data);
      if (parsed[3] && parsed[3].c && parsed[1] === 'XBT/USD') {
        return {
          symbol: 'BTC/USD',
          price: parseFloat(parsed[3].c[0]),
          volume: parseFloat(parsed[3].v[1]),
          exchange: 'Kraken',
          timestamp: Date.now()
        };
      }
      return null;
    }
  }
];

async function connectWebSocket(source) {
  return new Promise((resolve, reject) => {
    console.log(`🔌 Connexion à ${source.name}...`);

    const ws = new WebSocket(source.url);

    ws.on('open', () => {
      console.log(`✅ Connecté à ${source.name}`);

      // Souscription pour Kraken
      if (source.name === 'Kraken WebSocket') {
        ws.send(JSON.stringify({
          event: 'subscribe',
          pair: ['XBT/USD'],
          subscription: { name: 'trade' }
        }));
      }

      resolve(ws);
    });

    ws.on('message', (data) => {
      try {
        const parsed = source.parser(data.toString());
        if (parsed) {
          const changeSymbol = parsed.volume > 0 ? '📈' : '📊';
          console.log(`${changeSymbol} [${parsed.exchange}] ${parsed.symbol}: $${parsed.price.toLocaleString()} | Vol: ${parsed.volume.toLocaleString()}`);
        }
      } catch (error) {
        // Ignorer les erreurs de parsing
      }
    });

    ws.on('error', (error) => {
      console.error(`❌ Erreur ${source.name}:`, error.message);
      reject(error);
    });

    ws.on('close', () => {
      console.log(`🔌 Déconnecté de ${source.name}`);
    });

    setTimeout(() => {
      reject(new Error(`Timeout connexion ${source.name}`));
    }, 10000);
  });
}

async function main() {
  console.log('📋 Test WebSocket pour données BTC en temps réel\n');

  let connected = false;
  let updateCount = 0;

  // Essayer Binance d'abord
  try {
    console.log('🔄 Tentative 1: Binance WebSocket');
    const ws = await connectWebSocket(btcSources[0]);
    connected = true;

    setTimeout(() => {
      ws.close();
    }, 30000);

  } catch (error) {
    console.log(`❌ Binance échoué: ${error.message}`);

    // Essayer Kraken
    try {
      console.log('\n🔄 Tentative 2: Kraken WebSocket');
      const ws = await connectWebSocket(btcSources[1]);
      connected = true;

      setTimeout(() => {
        ws.close();
      }, 30000);

    } catch (error2) {
      console.log(`❌ Kraken échoué: ${error2.message}`);
    }
  }

  if (!connected) {
    console.log('\n💡 Alternative: API REST simple');
    await testRESTAPI();
  } else {
    console.log('\n✅ WebSocket connecté! Surveillance pendant 30 secondes...');

    const interval = setInterval(() => {
      if (updateCount++ > 14) { // 30 secondes
        clearInterval(interval);
        console.log('\n🏁 Surveillance terminée');
        process.exit(0);
      }
    }, 2000);
  }
}

async function testRESTAPI() {
  console.log('📊 Test API REST pour BTC...');

  const response = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
  const data = await response.json();

  console.log('💰 PRIX BTC ACTUEL:');
  console.log(`   Prix: $${parseFloat(data.lastPrice).toLocaleString()}`);
  console.log(`   Change 24h: ${parseFloat(data.priceChangePercent).toFixed(2)}%`);
  console.log(`   Volume 24h: ${parseFloat(data.volume).toLocaleString()}`);
  console.log(`   High 24h: $${parseFloat(data.highPrice).toLocaleString()}`);
  console.log(`   Low 24h: $${parseFloat(data.lowPrice).toLocaleString()}`);

  // Surveiller avec des requêtes toutes les 5 secondes
  console.log('\n⏱️ Surveillance via API REST...');

  let count = 0;
  const interval = setInterval(async () => {
    try {
      const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
      const priceData = await res.json();
      const price = parseFloat(priceData.price);

      count++;
      console.log(`📈 [API] BTC: $${price.toLocaleString()} (${count}/6)`);

      if (count >= 6) {
        clearInterval(interval);
        console.log('\n🏁 Test API terminé');
        process.exit(0);
      }
    } catch (error) {
      console.log('❌ Erreur API:', error.message);
    }
  }, 5000);
}

process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt demandé');
  process.exit(0);
});

main().catch(console.error);