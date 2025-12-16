/**
 * SierraChart DTC - Test avec les symboles locaux exacts
 * 
 * Ce script utilise les noms de symboles trouvés dans C:\SierraChart\Data\
 * pour s'abonner aux données en temps réel via le serveur DTC.
 */

console.log('🚀 SIERRACHART - Test des symboles locaux\n');
console.log('═'.repeat(60));

import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { EventEmitter } from 'events';

config({ path: '.env' });

const sierraConfig = {
  host: process.env.SIERRACHART_HOST || 'localhost',
  port: parseInt(process.env.SIERRACHART_PORT) || 11099,
  username: process.env.SIERRACHART_USERNAME || '',
  password: process.env.SIERRACHART_PASSWORD || ''
};

// Symboles EXACTS trouvés dans C:\SierraChart\Data\
const LOCAL_SYMBOLS = [
  // Bitcoin - Binance Perpetual
  { symbol: 'BTCUSDT_PERP_BINANCE', exchange: '', name: 'Bitcoin USDT Perpetual (Binance)' },
  { symbol: 'BTCUSD_PERP_BINANCE', exchange: '', name: 'Bitcoin USD Perpetual (Binance)' },
  
  // E-mini S&P 500
  { symbol: 'ESZ25-CME', exchange: 'CME', name: 'E-mini S&P Dec 2025' },
  { symbol: 'ESU25-CME', exchange: 'CME', name: 'E-mini S&P Sep 2025' },
  { symbol: 'ESM25-CME', exchange: 'CME', name: 'E-mini S&P Jun 2025' },
  { symbol: 'MESZ25-CME', exchange: 'CME', name: 'Micro E-mini S&P Dec 2025' },
  { symbol: 'MESU25-CME', exchange: 'CME', name: 'Micro E-mini S&P Sep 2025' },
  
  // Mini Dow
  { symbol: 'YMZ25-CBOT', exchange: 'CBOT', name: 'Mini Dow Dec 2025' },
  { symbol: 'YMU25-CBOT', exchange: 'CBOT', name: 'Mini Dow Sep 2025' },
  
  // Forex
  { symbol: 'EURUSD', exchange: '', name: 'EUR/USD' },
  { symbol: 'XAUUSD', exchange: '', name: 'Gold XAU/USD' },
  
  // VIX
  { symbol: 'VIX', exchange: 'CBOE', name: 'VIX Index' },
  { symbol: 'VIX_CGI', exchange: '', name: 'VIX CGI' },
  
  // Autres
  { symbol: 'XBTUSD-BMEX', exchange: '', name: 'Bitcoin BitMEX' },
  { symbol: 'AAPL', exchange: '', name: 'Apple Inc.' },
  { symbol: 'AMZN-NQTV', exchange: '', name: 'Amazon NASDAQ' },
  { symbol: 'TICK-NYSE', exchange: '', name: 'NYSE TICK' },
  { symbol: 'SPX500', exchange: '', name: 'S&P 500' },
];

class SierraChartLocalTest extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.socket = null;
    this.isConnected = false;
    this.isReady = false;
    this.buffer = '';
    this.requestId = 1;
    this.symbolMap = new Map();
    this.marketData = new Map();
    this.successfulSymbols = [];
    this.failedSymbols = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log(`📡 Connexion à ${this.config.host}:${this.config.port}...`);

      this.socket = new net.Socket();
      this.socket.setNoDelay(true);
      this.socket.setEncoding('utf8');

      const timeout = setTimeout(() => {
        if (!this.isReady) {
          reject(new Error('Timeout'));
        }
      }, 20000);

      this.socket.connect(this.config.port, this.config.host, () => {
        console.log('✅ Connecté');
        this.isConnected = true;
        this.sendJSON({ Type: 'EncodingRequest', ProtocolVersion: 8, Encoding: 2, ProtocolType: 'DTC' });
      });

      this.socket.on('data', (data) => this.handleData(data));
      
      this.socket.on('error', (e) => { 
        clearTimeout(timeout); 
        reject(e); 
      });
      
      this.socket.on('close', () => { 
        this.isConnected = false; 
      });

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
    for (const p of parts) if (p.trim()) this.processMessage(p.trim());
  }

  processMessage(raw) {
    try {
      const msg = JSON.parse(raw);
      const type = msg.Type;

      switch (type) {
        case 'Heartbeat':
        case 3:
          this.handleHeartbeat();
          break;

        case 'LogonResponse':
        case 2:
          console.log(`🔐 LogonResponse: ${msg.Result === 1 ? 'OK' : msg.ResultText || msg.Result}`);
          if (msg.Result === 1) {
            this.isReady = true;
            this.emit('ready');
          }
          break;

        case 'MarketDataSnapshot':
        case 104:
          this.handleMarketData(msg);
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

        default:
          // Ignorer les autres
          break;
      }
    } catch(e) {}
  }

  handleHeartbeat() {
    if (!this.isReady) {
      this.sendJSON({
        Type: 'LogonRequest',
        ProtocolVersion: 8,
        Username: this.config.username,
        Password: this.config.password,
        GeneralTextData: 'Local Test',
        HeartbeatIntervalInSeconds: 30
      });
      
      // Ready après 2 secondes
      setTimeout(() => {
        if (!this.isReady) {
          this.isReady = true;
          this.emit('ready');
        }
      }, 2000);
    }
    
    this.sendJSON({ Type: 'Heartbeat', NumDroppedMessages: 0, CurrentDateTime: Math.floor(Date.now()/1000) });
  }

  handleMarketData(msg) {
    const symbolId = msg.SymbolID;
    const symbolInfo = this.symbolMap.get(symbolId);
    const symbol = symbolInfo?.symbol || msg.Symbol || `ID:${symbolId}`;
    
    const data = {
      symbol,
      name: symbolInfo?.name || '',
      lastPrice: msg.LastTradePrice || 0,
      bidPrice: msg.BidPrice || 0,
      askPrice: msg.AskPrice || 0,
      volume: msg.LastTradeVolume || msg.Volume || 0,
      high: msg.SessionHighPrice || 0,
      low: msg.SessionLowPrice || 0,
      timestamp: new Date()
    };

    this.marketData.set(symbol, data);
    
    if (!this.successfulSymbols.includes(symbol)) {
      this.successfulSymbols.push(symbol);
    }

    // Afficher les données
    console.log('');
    console.log(`✅ ${symbol} ═══════════════════════════════`);
    if (symbolInfo?.name) console.log(`   📋 ${symbolInfo.name}`);
    if (data.lastPrice > 0) console.log(`   💰 Last:  $${this.formatPrice(data.lastPrice)}`);
    if (data.bidPrice > 0)  console.log(`   📗 Bid:   $${this.formatPrice(data.bidPrice)}`);
    if (data.askPrice > 0)  console.log(`   📕 Ask:   $${this.formatPrice(data.askPrice)}`);
    if (data.high > 0)      console.log(`   📈 High:  $${this.formatPrice(data.high)}`);
    if (data.low > 0)       console.log(`   📉 Low:   $${this.formatPrice(data.low)}`);
  }

  handleTrade(msg) {
    const symbolInfo = this.symbolMap.get(msg.SymbolID);
    const symbol = symbolInfo?.symbol || `ID:${msg.SymbolID}`;
    const price = msg.Price || 0;
    const vol = msg.Volume || 0;
    
    console.log(`📊 TRADE ${symbol}: $${this.formatPrice(price)} x${vol}`);
    
    // Mettre à jour
    const existing = this.marketData.get(symbol) || { symbol };
    existing.lastPrice = price;
    existing.timestamp = new Date();
    this.marketData.set(symbol, existing);
  }

  handleBidAsk(msg) {
    const symbolInfo = this.symbolMap.get(msg.SymbolID);
    const symbol = symbolInfo?.symbol || `ID:${msg.SymbolID}`;
    const bid = msg.BidPrice || 0;
    const ask = msg.AskPrice || 0;
    
    console.log(`📊 ${symbol}: Bid $${this.formatPrice(bid)} / Ask $${this.formatPrice(ask)}`);
    
    const existing = this.marketData.get(symbol) || { symbol };
    existing.bidPrice = bid;
    existing.askPrice = ask;
    existing.timestamp = new Date();
    this.marketData.set(symbol, existing);
  }

  handleReject(msg) {
    const symbolInfo = this.symbolMap.get(msg.SymbolID);
    const symbol = symbolInfo?.symbol || `ID:${msg.SymbolID}`;
    const reason = msg.RejectText || 'Unknown';
    
    if (!this.failedSymbols.find(f => f.symbol === symbol)) {
      this.failedSymbols.push({ symbol, reason });
    }
    
    console.log(`❌ ${symbol}: ${reason}`);
  }

  requestMarketData(symbolInfo) {
    const symbolId = this.requestId++;
    this.symbolMap.set(symbolId, symbolInfo);

    this.sendJSON({
      Type: 'MarketDataRequest',
      RequestAction: 1,
      SymbolID: symbolId,
      Symbol: symbolInfo.symbol,
      Exchange: symbolInfo.exchange || ''
    });

    return symbolId;
  }

  formatPrice(price) {
    if (typeof price !== 'number' || isNaN(price)) return 'N/A';
    if (price > 10000) return price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    if (price > 100) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }

  sendJSON(obj) {
    if (this.socket && this.isConnected) {
      this.socket.write(JSON.stringify(obj) + '\x00');
    }
  }

  wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  async testSymbols(symbols) {
    console.log(`\n📊 Test de ${symbols.length} symboles locaux...\n`);
    console.log('═'.repeat(50));

    for (const sym of symbols) {
      process.stdout.write(`   📡 ${sym.symbol.padEnd(25)}... `);
      this.requestMarketData(sym);
      await this.wait(1000);
      
      // Vérifier si on a reçu des données
      if (this.marketData.has(sym.symbol)) {
        // Déjà affiché dans handleMarketData
      }
    }

    return {
      successful: this.successfulSymbols,
      failed: this.failedSymbols,
      data: Object.fromEntries(this.marketData)
    };
  }

  disconnect() {
    if (this.socket) {
      this.sendJSON({ Type: 'Logoff' });
      setTimeout(() => this.socket.destroy(), 500);
    }
  }

  printSummary() {
    console.log('\n\n');
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║' + '  RÉSUMÉ DES DONNÉES EN TEMPS RÉEL  '.padStart(38).padEnd(58) + '║');
    console.log('╚' + '═'.repeat(58) + '╝');
    console.log('');

    console.log(`✅ Symboles avec données: ${this.successfulSymbols.length}`);
    console.log(`❌ Symboles rejetés: ${this.failedSymbols.length}`);
    console.log('');

    if (this.successfulSymbols.length > 0) {
      console.log('📈 DONNÉES REÇUES:');
      console.log('─'.repeat(50));
      
      for (const [symbol, data] of this.marketData) {
        const price = data.lastPrice || data.bidPrice || data.askPrice || 0;
        if (price > 0) {
          console.log(`   ${symbol.padEnd(25)} : $${this.formatPrice(price)}`);
        }
      }
    }

    if (this.failedSymbols.length > 0) {
      console.log('\n❌ SYMBOLES NON DISPONIBLES:');
      console.log('─'.repeat(50));
      console.log('   (Ces symboles nécessitent un chart ouvert dans SierraChart)');
      console.log('');
      
      for (const { symbol, reason } of this.failedSymbols.slice(0, 10)) {
        console.log(`   ${symbol.padEnd(25)} : ${reason}`);
      }
      
      if (this.failedSymbols.length > 10) {
        console.log(`   ... et ${this.failedSymbols.length - 10} autres`);
      }
    }

    console.log('\n');
    console.log('💡 POUR ACTIVER UN SYMBOLE:');
    console.log('─'.repeat(50));
    console.log('   1. Dans SierraChart: File > New/Open Chart');
    console.log('   2. Entrez le symbole (ex: BTCUSDT_PERP_BINANCE)');
    console.log('   3. Le symbole sera alors disponible via DTC');
    console.log('');
  }
}

// ==================== MAIN ====================

async function main() {
  console.log(`📋 Configuration: ${sierraConfig.host}:${sierraConfig.port}`);
  console.log(`👤 Username: ${sierraConfig.username}`);
  console.log('');

  const client = new SierraChartLocalTest(sierraConfig);

  try {
    await client.connect();
    console.log('✅ Connexion établie!\n');

    // Attendre la stabilisation
    await client.wait(3000);

    // Tester tous les symboles locaux
    await client.testSymbols(LOCAL_SYMBOLS);

    // Attendre un peu pour recevoir les données
    console.log('\n⏳ Attente des données (30 secondes)...');
    await client.wait(30000);

    // Afficher le résumé
    client.printSummary();

    client.disconnect();
    await client.wait(1000);
    
    console.log('🏁 Test terminé!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.log('\n🔧 Vérifiez que SierraChart DTC Server est activé');
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt');
  process.exit(0);
});

main().catch(console.error);
