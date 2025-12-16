/**
 * SIERRACHART REALTIME DATA STREAMING
 * 
 * Ce script montre comment obtenir des données en temps réel.
 * 
 * IMPORTANT: Pour le temps réel, vous devez:
 * 1. Ouvrir un chart du symbole dans SierraChart
 * 2. Être connecté à votre data feed
 */

console.log('');
console.log('╔' + '═'.repeat(68) + '╗');
console.log('║' + '  📡 SIERRACHART REALTIME STREAMING  '.padStart(50).padEnd(68) + '║');
console.log('╚' + '═'.repeat(68) + '╝');
console.log('');

import * as net from 'net';
import { config } from 'dotenv';
import { EventEmitter } from 'events';

config({ path: '.env' });

const DTC_CONFIG = {
  host: process.env.SIERRACHART_HOST || 'localhost',
  port: parseInt(process.env.SIERRACHART_PORT) || 11099,
  username: process.env.SIERRACHART_USERNAME || '',
  password: process.env.SIERRACHART_PASSWORD || ''
};

// Symboles à tester pour le temps réel
const REALTIME_SYMBOLS = [
  // Crypto (souvent disponible 24/7)
  'BTCUSDT_PERP_BINANCE',
  'BTCUSD_PERP_BINANCE',
  
  // Futures (disponible pendant les heures de marché)
  'MESZ25-CME',
  'YMZ25-CBOT',
  
  // Forex (disponible quasi 24/5)
  'EURUSD',
  'XAUUSD',
  
  // Actions (heures de marché US)
  'AAPL',
  'AMZN-NQTV'
];

class RealtimeClient extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.isConnected = false;
    this.isReady = false;
    this.buffer = '';
    this.reqId = 1;
    this.symbolMap = new Map();
    this.quotes = new Map();
    this.updateCounts = new Map();
    this.lastUpdate = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log(`📡 Connexion à ${DTC_CONFIG.host}:${DTC_CONFIG.port}...`);
      
      this.socket = new net.Socket();
      this.socket.setNoDelay(true);
      this.socket.setEncoding('utf8');

      const timeout = setTimeout(() => {
        if (!this.isReady) {
          this.socket.destroy();
          reject(new Error('Timeout connexion'));
        }
      }, 15000);

      this.socket.connect(DTC_CONFIG.port, DTC_CONFIG.host, () => {
        console.log('✅ Socket connecté');
        this.isConnected = true;
        this.send({ Type: 'EncodingRequest', ProtocolVersion: 8, Encoding: 2, ProtocolType: 'DTC' });
      });

      this.socket.on('data', (d) => this.handleData(d));
      this.socket.on('error', (e) => { clearTimeout(timeout); reject(e); });
      this.socket.on('close', () => { this.isConnected = false; console.log('🔌 Déconnecté'); });

      this.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  handleData(data) {
    this.buffer += data;
    const parts = this.buffer.split('\x00');
    this.buffer = parts.pop() || '';
    
    for (const p of parts) {
      if (p.trim()) this.processMessage(p.trim());
    }
  }

  processMessage(raw) {
    try {
      const msg = JSON.parse(raw);
      
      switch (msg.Type) {
        case 'Heartbeat':
        case 3:
          this.handleHeartbeat();
          break;
          
        case 'MarketDataSnapshot':
        case 104:
          this.handleSnapshot(msg);
          break;
          
        case 'MarketDataUpdateTrade':
        case 107:
          this.handleTrade(msg);
          break;
          
        case 'MarketDataUpdateBidAsk':
        case 108:
          this.handleBidAsk(msg);
          break;
          
        case 'MarketDataReject':
        case 103:
          this.handleReject(msg);
          break;
      }
    } catch(e) {}
  }

  handleHeartbeat() {
    if (!this.isReady) {
      this.send({
        Type: 'LogonRequest',
        ProtocolVersion: 8,
        Username: DTC_CONFIG.username,
        Password: DTC_CONFIG.password,
        GeneralTextData: 'Realtime Client',
        HeartbeatIntervalInSeconds: 30
      });
      
      setTimeout(() => {
        if (!this.isReady) {
          this.isReady = true;
          this.emit('ready');
        }
      }, 2000);
    }
    
    this.send({ Type: 'Heartbeat', NumDroppedMessages: 0, CurrentDateTime: Math.floor(Date.now()/1000) });
  }

  handleSnapshot(msg) {
    const symbol = this.symbolMap.get(msg.SymbolID);
    if (!symbol) return;
    
    this.updateCounts.set(symbol, (this.updateCounts.get(symbol) || 0) + 1);
    this.lastUpdate.set(symbol, new Date());
    
    this.quotes.set(symbol, {
      last: msg.LastTradePrice || 0,
      bid: msg.BidPrice || 0,
      ask: msg.AskPrice || 0,
      volume: msg.LastTradeVolume || 0,
      ts: new Date()
    });
    
    this.emit('snapshot', { symbol, ...this.quotes.get(symbol) });
  }

  handleTrade(msg) {
    const symbol = this.symbolMap.get(msg.SymbolID);
    if (!symbol) return;
    
    this.updateCounts.set(symbol, (this.updateCounts.get(symbol) || 0) + 1);
    this.lastUpdate.set(symbol, new Date());
    
    const quote = this.quotes.get(symbol) || {};
    quote.last = msg.Price || quote.last;
    quote.volume = msg.Volume || quote.volume;
    quote.ts = new Date();
    this.quotes.set(symbol, quote);
    
    this.emit('trade', { symbol, price: msg.Price, volume: msg.Volume });
  }

  handleBidAsk(msg) {
    const symbol = this.symbolMap.get(msg.SymbolID);
    if (!symbol) return;
    
    this.updateCounts.set(symbol, (this.updateCounts.get(symbol) || 0) + 1);
    this.lastUpdate.set(symbol, new Date());
    
    const quote = this.quotes.get(symbol) || {};
    quote.bid = msg.BidPrice || quote.bid;
    quote.ask = msg.AskPrice || quote.ask;
    quote.ts = new Date();
    this.quotes.set(symbol, quote);
    
    this.emit('bidask', { symbol, bid: msg.BidPrice, ask: msg.AskPrice });
  }

  handleReject(msg) {
    const symbol = this.symbolMap.get(msg.SymbolID);
    console.log(`   ❌ ${symbol || msg.SymbolID}: ${msg.RejectText || 'Rejeté'}`);
    this.emit('reject', { symbolId: msg.SymbolID, symbol, reason: msg.RejectText });
  }

  subscribe(symbol) {
    const id = this.reqId++;
    this.symbolMap.set(id, symbol);
    this.updateCounts.set(symbol, 0);
    
    this.send({
      Type: 'MarketDataRequest',
      RequestAction: 1,
      SymbolID: id,
      Symbol: symbol,
      Exchange: ''
    });
    
    return id;
  }

  send(obj) {
    if (this.socket && this.isConnected) {
      this.socket.write(JSON.stringify(obj) + '\x00');
    }
  }

  disconnect() {
    this.send({ Type: 'Logoff' });
    setTimeout(() => this.socket?.destroy(), 500);
  }

  getStats() {
    const stats = [];
    for (const [symbol, count] of this.updateCounts) {
      const quote = this.quotes.get(symbol);
      const lastUpd = this.lastUpdate.get(symbol);
      const isRealtime = count > 0 && lastUpd && (Date.now() - lastUpd.getTime()) < 5000;
      
      stats.push({
        symbol,
        updates: count,
        isRealtime,
        lastPrice: quote?.last || 0,
        lastUpdate: lastUpd
      });
    }
    return stats;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('📋 EXPLICATION DU TEMPS RÉEL:\n');
  console.log('   ┌─────────────────────────────────────────────────────────┐');
  console.log('   │ 📂 Fichiers SCID = Données HISTORIQUES (sur disque)    │');
  console.log('   │ 📡 DTC Server   = Données TEMPS RÉEL (streaming)       │');
  console.log('   │                                                         │');
  console.log('   │ ⚠️  Pour le temps réel, ouvrez un CHART du symbole     │');
  console.log('   │    dans SierraChart (pas juste le DTC server actif)    │');
  console.log('   └─────────────────────────────────────────────────────────┘');
  console.log('');
  
  const client = new RealtimeClient();
  
  try {
    await client.connect();
    console.log('✅ Connexion DTC établie\n');
    
    // Abonner aux symboles
    console.log('📊 Abonnement aux symboles...\n');
    
    for (const symbol of REALTIME_SYMBOLS) {
      client.subscribe(symbol);
      console.log(`   📡 Abonné: ${symbol}`);
    }
    
    console.log('\n');
    console.log('═'.repeat(70));
    console.log('📡 EN ATTENTE DE DONNÉES TEMPS RÉEL (30 secondes)...');
    console.log('═'.repeat(70));
    console.log('');
    console.log('   Si vous voyez des mises à jour ci-dessous, le temps réel fonctionne!');
    console.log('   Sinon, ouvrez les charts correspondants dans SierraChart.');
    console.log('');
    
    // Écouter les événements
    let tradeCount = 0;
    let bidaskCount = 0;
    
    client.on('trade', (data) => {
      tradeCount++;
      const price = data.price > 1000 
        ? `$${data.price.toLocaleString()}`
        : `$${data.price.toFixed(4)}`;
      console.log(`   📈 TRADE: ${data.symbol.padEnd(25)} ${price} (x${data.volume})`);
    });
    
    client.on('bidask', (data) => {
      bidaskCount++;
      if (bidaskCount <= 10) {  // Limiter l'affichage
        const bid = data.bid > 1000 ? Math.round(data.bid) : data.bid.toFixed(4);
        const ask = data.ask > 1000 ? Math.round(data.ask) : data.ask.toFixed(4);
        console.log(`   📊 BID/ASK: ${data.symbol.padEnd(22)} Bid: $${bid} / Ask: $${ask}`);
      }
    });
    
    client.on('snapshot', (data) => {
      if (data.last > 0) {
        const price = data.last > 1000 
          ? `$${data.last.toLocaleString()}`
          : `$${data.last.toFixed(4)}`;
        console.log(`   📋 SNAPSHOT: ${data.symbol.padEnd(22)} ${price}`);
      }
    });
    
    // Attendre 30 secondes
    await new Promise(r => setTimeout(r, 30000));
    
    // Rapport final
    console.log('\n');
    console.log('═'.repeat(70));
    console.log('📊 RAPPORT TEMPS RÉEL');
    console.log('═'.repeat(70));
    console.log('');
    
    const stats = client.getStats();
    let realtimeCount = 0;
    
    for (const stat of stats.sort((a, b) => b.updates - a.updates)) {
      const status = stat.isRealtime ? '🟢 TEMPS RÉEL' : '🔴 PAS DE DATA';
      const price = stat.lastPrice > 0 
        ? (stat.lastPrice > 1000 ? `$${stat.lastPrice.toLocaleString()}` : `$${stat.lastPrice.toFixed(4)}`)
        : 'N/A';
      
      console.log(`   ${stat.symbol.padEnd(28)} ${status.padEnd(15)} | ${stat.updates.toString().padStart(5)} updates | ${price}`);
      
      if (stat.isRealtime) realtimeCount++;
    }
    
    console.log('');
    console.log('─'.repeat(70));
    console.log(`   📊 Total: ${realtimeCount}/${stats.length} symboles en temps réel`);
    console.log(`   📈 Trades reçus: ${tradeCount}`);
    console.log(`   📊 Bid/Ask reçus: ${bidaskCount}`);
    console.log('');
    
    if (realtimeCount === 0) {
      console.log('   ⚠️  AUCUNE DONNÉE TEMPS RÉEL REÇUE');
      console.log('');
      console.log('   Pour activer le temps réel:');
      console.log('   ┌─────────────────────────────────────────────────────────┐');
      console.log('   │ 1. Dans SierraChart: File > New/Open Chart              │');
      console.log('   │ 2. Entrez le symbole (ex: BTCUSDT_PERP_BINANCE)        │');
      console.log('   │ 3. Connectez-vous à votre data feed                     │');
      console.log('   │ 4. Le chart doit montrer des données en temps réel      │');
      console.log('   │ 5. Relancez ce script                                   │');
      console.log('   └─────────────────────────────────────────────────────────┘');
    } else {
      console.log('   ✅ Temps réel fonctionnel! Les données sont streamées.');
    }
    
    client.disconnect();
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('\n⚠️ Vérifiez que SierraChart est ouvert avec DTC Server activé');
  }
  
  console.log('\n🏁 Test terminé');
}

main().catch(console.error);
