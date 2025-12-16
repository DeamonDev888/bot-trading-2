/**
 * Test du module SierraChart Expert
 */

import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { EventEmitter } from 'events';

config({ path: '.env' });

const DATA_PATH = 'C:/SierraChart/Data/';
const DTC_CONFIG = {
  host: process.env.SIERRACHART_HOST || 'localhost',
  port: parseInt(process.env.SIERRACHART_PORT) || 11099,
  username: process.env.SIERRACHART_USERNAME || '',
  password: process.env.SIERRACHART_PASSWORD || ''
};

// ============ SCID READER ============

class SCIDReader {
  constructor(dataPath = DATA_PATH) {
    this.dataPath = dataPath;
  }

  listSymbols() {
    const files = fs.readdirSync(this.dataPath)
      .filter(f => f.endsWith('.scid'));
    
    return files.map(f => {
      const filePath = path.join(this.dataPath, f);
      const stats = fs.statSync(filePath);
      const buf = fs.readFileSync(filePath);
      const headerSize = buf.readUInt32LE(4) || 56;
      const recordSize = buf.readUInt32LE(8) || 40;
      const totalRecords = Math.floor((buf.length - headerSize) / recordSize);
      
      return {
        symbol: path.basename(f, '.scid'),
        bars: totalRecords,
        size: stats.size,
        modified: stats.mtime
      };
    }).sort((a, b) => b.size - a.size);
  }

  getLastPrice(symbol) {
    const filePath = path.join(this.dataPath, `${symbol}.scid`);
    if (!fs.existsSync(filePath)) return null;
    
    const buf = fs.readFileSync(filePath);
    const headerSize = buf.readUInt32LE(4) || 56;
    const recordSize = buf.readUInt32LE(8) || 40;
    const totalRecords = Math.floor((buf.length - headerSize) / recordSize);
    
    if (totalRecords === 0) return null;
    
    const lastOffset = headerSize + ((totalRecords - 1) * recordSize);
    const close = buf.readFloatLE(lastOffset + 20);
    
    return close > 0 ? close : null;
  }

  getAllPrices() {
    const symbols = this.listSymbols();
    const prices = {};
    
    for (const sym of symbols) {
      const price = this.getLastPrice(sym.symbol);
      if (price) prices[sym.symbol] = price;
    }
    
    return prices;
  }
}

// ============ DTC CLIENT ============

class DTCClient extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.socket = null;
    this.isConnected = false;
    this.isReady = false;
    this.buffer = '';
    this.requestId = 1;
    this.symbolMap = new Map();
    this.quotes = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();
      this.socket.setNoDelay(true);
      this.socket.setEncoding('utf8');

      const timeout = setTimeout(() => {
        if (!this.isReady) reject(new Error('Timeout'));
      }, 15000);

      this.socket.connect(this.config.port, this.config.host, () => {
        this.isConnected = true;
        this.sendJSON({ Type: 'EncodingRequest', ProtocolVersion: 8, Encoding: 2, ProtocolType: 'DTC' });
      });

      this.socket.on('data', (data) => {
        this.buffer += data;
        const parts = this.buffer.split('\x00');
        this.buffer = parts.pop() || '';
        for (const p of parts) if (p.trim()) this.processMessage(p.trim());
      });

      this.socket.on('error', (e) => { clearTimeout(timeout); reject(e); });
      this.socket.on('close', () => { this.isConnected = false; });

      this.once('ready', () => { clearTimeout(timeout); resolve(); });
    });
  }

  processMessage(raw) {
    try {
      const msg = JSON.parse(raw);
      
      if (msg.Type === 'Heartbeat' || msg.Type === 3) {
        if (!this.isReady) {
          this.sendJSON({
            Type: 'LogonRequest', ProtocolVersion: 8,
            Username: this.config.username, Password: this.config.password,
            GeneralTextData: 'Expert Module', HeartbeatIntervalInSeconds: 30
          });
          setTimeout(() => { if (!this.isReady) { this.isReady = true; this.emit('ready'); } }, 2000);
        }
        this.sendJSON({ Type: 'Heartbeat', NumDroppedMessages: 0, CurrentDateTime: Math.floor(Date.now()/1000) });
      }
      
      if (msg.Type === 'MarketDataSnapshot' || msg.Type === 104) {
        const symbol = this.symbolMap.get(msg.SymbolID);
        if (symbol) {
          this.quotes.set(symbol, {
            symbol, lastPrice: msg.LastTradePrice || 0, 
            bid: msg.BidPrice || 0, ask: msg.AskPrice || 0,
            timestamp: new Date()
          });
          this.emit('quote', this.quotes.get(symbol));
        }
      }
    } catch(e) {}
  }

  subscribe(symbol) {
    const id = this.requestId++;
    this.symbolMap.set(id, symbol);
    this.sendJSON({ Type: 'MarketDataRequest', RequestAction: 1, SymbolID: id, Symbol: symbol, Exchange: '' });
    return id;
  }

  sendJSON(obj) {
    if (this.socket && this.isConnected) this.socket.write(JSON.stringify(obj) + '\x00');
  }

  disconnect() {
    this.sendJSON({ Type: 'Logoff' });
    setTimeout(() => this.socket?.destroy(), 500);
  }
}

// ============ MAIN ============

async function main() {
  console.log('🚀 SIERRACHART EXPERT MODULE TEST\n');
  console.log('═'.repeat(60));

  // 1. Test données locales
  console.log('\n📂 DONNÉES LOCALES:\n');
  
  const reader = new SCIDReader();
  const symbols = reader.listSymbols();
  
  console.log(`   ${symbols.length} symboles disponibles\n`);
  console.log('   TOP 5 par taille:');
  for (const sym of symbols.slice(0, 5)) {
    console.log(`   • ${sym.symbol.padEnd(25)} ${(sym.size/(1024*1024)).toFixed(1)} MB, ${sym.bars.toLocaleString()} barres`);
  }

  console.log('\n💰 DERNIERS PRIX:\n');
  const prices = reader.getAllPrices();
  for (const [symbol, price] of Object.entries(prices).slice(0, 8)) {
    const formattedPrice = price > 1000 ? price.toLocaleString() : price.toFixed(4);
    console.log(`   ${symbol.padEnd(25)} : $${formattedPrice}`);
  }

  // 2. Test DTC
  console.log('\n\n📡 TEST DTC TEMPS RÉEL:\n');
  
  const dtc = new DTCClient(DTC_CONFIG);
  
  try {
    await dtc.connect();
    console.log('   ✅ Connecté au serveur DTC');
    
    // S'abonner aux 3 premiers symboles
    for (const sym of symbols.slice(0, 3)) {
      dtc.subscribe(sym.symbol);
      console.log(`   📊 Abonné à: ${sym.symbol}`);
    }
    
    // Écouter les quotes
    dtc.on('quote', (quote) => {
      console.log(`   📈 ${quote.symbol}: $${quote.lastPrice.toLocaleString()}`);
    });

    // Attendre 10 secondes
    console.log('\n   ⏳ Attente de données (10s)...');
    await new Promise(r => setTimeout(r, 10000));
    
    dtc.disconnect();
  } catch(e) {
    console.log(`   ❌ DTC non disponible: ${e.message}`);
    console.log('   (Ouvrez des charts dans SierraChart pour le temps réel)');
  }

  console.log('\n');
  console.log('═'.repeat(60));
  console.log('🏁 TEST TERMINÉ');
  console.log('═'.repeat(60));
  console.log('\n💡 Intégration disponible via:');
  console.log('   import { SCIDReader, DTCClient } from "./SierraChartExpert"');
  console.log('');
}

main().catch(console.error);
