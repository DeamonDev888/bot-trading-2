// Test simple BitMEX WebSocket pour BTC
console.log('🚀 Test WebSocket BitMEX pour données BTC...\n');

import WebSocket from 'ws';

const bitmexWS = 'wss://ws.bitmex.com/realtime?subscribe=trade:XBTUSD';

console.log('📡 Connexion à BitMEX WebSocket...');

const ws = new WebSocket(bitmexWS);

ws.on('open', () => {
  console.log('✅ Connecté à BitMEX!');
  console.log('   Symbol: XBTUSD (Bitcoin/USD)');
});

ws.on('message', (data) => {
  try {
    const parsed = JSON.parse(data.toString());

    if (parsed.data && parsed.data.length > 0) {
      const trade = parsed.data[parsed.data.length - 1];

      if (trade.trg === 'buy' || trade.trg === 'sell') {
        const sideSymbol = trade.trg === 'buy' ? '🟢' : '🔴';
        const timestamp = new Date(trade.timestamp).toLocaleTimeString();

        console.log(`${sideSymbol} [${timestamp}] XBT/USD: $${parseFloat(trade.price).toLocaleString()} | Size: ${trade.size}`);
      }
    }
  } catch (error) {
    // Ignorer les erreurs
  }
});

ws.on('error', (error) => {
  console.error('❌ Erreur BitMEX:', error.message);
});

ws.on('close', () => {
  console.log('🔌 Déconnecté de BitMEX');
});

// Arrêter après 30 secondes
setTimeout(() => {
  ws.close();
  console.log('\n🏁 Test terminé');
  process.exit(0);
}, 30000);

process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt demandé');
  ws.close();
  process.exit(0);
});