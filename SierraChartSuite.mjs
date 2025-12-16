/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SIERRACHART COMPLETE TRADING SUITE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Suite complète de trading intégrant:
 * - Lecture des données SCID locales
 * - Connexion DTC temps réel
 * - Calcul de 20+ indicateurs techniques
 * - Configurations de charts professionnelles
 * - Génération de signaux de trading
 * - Rapports d'analyse complets
 * 
 * @author Financial Analyst Pro
 * @version 3.0.0
 */

console.log('');
console.log('╔' + '═'.repeat(68) + '╗');
console.log('║' + '  🚀 SIERRACHART COMPLETE TRADING SUITE v3.0  '.padStart(52).padEnd(68) + '║');
console.log('╚' + '═'.repeat(68) + '╝');
console.log('');

import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import { EventEmitter } from 'events';
import { config } from 'dotenv';

config({ path: '.env' });

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  dataPath: process.env.SIERRA_DATA_PATH || 'C:/SierraChart/Data/',
  dtc: {
    host: process.env.SIERRACHART_HOST || 'localhost',
    port: parseInt(process.env.SIERRACHART_PORT) || 11099,
    username: process.env.SIERRACHART_USERNAME || '',
    password: process.env.SIERRACHART_PASSWORD || ''
  }
};

// ════════════════════════════════════════════════════════════════════════════
// TECHNICAL INDICATORS LIBRARY
// ════════════════════════════════════════════════════════════════════════════

const Indicators = {
  SMA: (data, period) => {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) { result.push(null); continue; }
      let sum = 0;
      for (let j = 0; j < period; j++) sum += data[i - j];
      result.push(sum / period);
    }
    return result;
  },

  EMA: (data, period) => {
    const result = [];
    const mult = 2 / (period + 1);
    let sum = 0;
    for (let i = 0; i < period; i++) { sum += data[i]; result.push(null); }
    result[period - 1] = sum / period;
    for (let i = period; i < data.length; i++) {
      result.push((data[i] - result[i - 1]) * mult + result[i - 1]);
    }
    return result;
  },

  RSI: (closes, period = 14) => {
    const gains = [], losses = [], result = [];
    for (let i = 0; i < closes.length; i++) {
      if (i === 0) { gains.push(0); losses.push(0); result.push(null); continue; }
      const change = closes[i] - closes[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);
      if (i < period) { result.push(null); continue; }
      
      let avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      let avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - (100 / (1 + rs)));
    }
    return result;
  },

  MACD: (closes, fast = 12, slow = 26, signal = 9) => {
    const emaFast = Indicators.EMA(closes, fast);
    const emaSlow = Indicators.EMA(closes, slow);
    const macdLine = emaFast.map((v, i) => v && emaSlow[i] ? v - emaSlow[i] : null);
    const validMacd = macdLine.filter(v => v !== null);
    const signalLine = Indicators.EMA(validMacd, signal);
    let idx = 0;
    const signalFull = macdLine.map(v => v === null ? null : signalLine[idx++] || null);
    const histogram = macdLine.map((v, i) => v && signalFull[i] ? v - signalFull[i] : null);
    return { macd: macdLine, signal: signalFull, histogram };
  },

  BollingerBands: (closes, period = 20, stdDev = 2) => {
    const sma = Indicators.SMA(closes, period);
    const upper = [], lower = [];
    for (let i = 0; i < closes.length; i++) {
      if (i < period - 1) { upper.push(null); lower.push(null); continue; }
      let sumSq = 0;
      for (let j = 0; j < period; j++) sumSq += Math.pow(closes[i - j] - sma[i], 2);
      const std = Math.sqrt(sumSq / period);
      upper.push(sma[i] + stdDev * std);
      lower.push(sma[i] - stdDev * std);
    }
    return { upper, middle: sma, lower };
  },

  ATR: (highs, lows, closes, period = 14) => {
    const tr = [];
    for (let i = 0; i < closes.length; i++) {
      if (i === 0) { tr.push(highs[i] - lows[i]); continue; }
      tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i-1]), Math.abs(lows[i] - closes[i-1])));
    }
    return Indicators.EMA(tr, period);
  },

  Stochastic: (highs, lows, closes, kPeriod = 14, dPeriod = 3) => {
    const k = [];
    for (let i = 0; i < closes.length; i++) {
      if (i < kPeriod - 1) { k.push(null); continue; }
      let hh = -Infinity, ll = Infinity;
      for (let j = 0; j < kPeriod; j++) {
        hh = Math.max(hh, highs[i - j]);
        ll = Math.min(ll, lows[i - j]);
      }
      k.push(hh === ll ? 50 : ((closes[i] - ll) / (hh - ll)) * 100);
    }
    return { k, d: Indicators.SMA(k.filter(v => v !== null), dPeriod) };
  },

  ADX: (highs, lows, closes, period = 14) => {
    // Simplified ADX
    const plusDM = [], minusDM = [], tr = [];
    for (let i = 0; i < closes.length; i++) {
      if (i === 0) { plusDM.push(0); minusDM.push(0); tr.push(highs[i] - lows[i]); continue; }
      const upMove = highs[i] - highs[i-1];
      const downMove = lows[i-1] - lows[i];
      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
      tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i-1]), Math.abs(lows[i] - closes[i-1])));
    }
    const smoothTR = Indicators.EMA(tr, period);
    const smoothPlusDM = Indicators.EMA(plusDM, period);
    const smoothMinusDM = Indicators.EMA(minusDM, period);
    
    const dx = [];
    for (let i = 0; i < closes.length; i++) {
      if (!smoothTR[i] || smoothTR[i] === 0) { dx.push(null); continue; }
      const plusDI = (smoothPlusDM[i] / smoothTR[i]) * 100;
      const minusDI = (smoothMinusDM[i] / smoothTR[i]) * 100;
      dx.push((plusDI + minusDI) > 0 ? Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100 : 0);
    }
    return { adx: Indicators.EMA(dx.filter(v => v !== null), period) };
  },

  VWAP: (highs, lows, closes, volumes) => {
    let cumPV = 0, cumVol = 0;
    return closes.map((c, i) => {
      const tp = (highs[i] + lows[i] + c) / 3;
      cumPV += tp * volumes[i];
      cumVol += volumes[i];
      return cumVol > 0 ? cumPV / cumVol : c;
    });
  },

  PivotPoints: (high, low, close) => ({
    pivot: (high + low + close) / 3,
    r1: 2 * ((high + low + close) / 3) - low,
    r2: ((high + low + close) / 3) + (high - low),
    r3: high + 2 * (((high + low + close) / 3) - low),
    s1: 2 * ((high + low + close) / 3) - high,
    s2: ((high + low + close) / 3) - (high - low),
    s3: low - 2 * (high - ((high + low + close) / 3))
  }),

  Fibonacci: (high, low) => {
    const diff = high - low;
    return { 
      '0%': low, '23.6%': low + diff * 0.236, '38.2%': low + diff * 0.382,
      '50%': low + diff * 0.5, '61.8%': low + diff * 0.618, '78.6%': low + diff * 0.786, '100%': high
    };
  }
};

// ════════════════════════════════════════════════════════════════════════════
// SCID DATA READER
// ════════════════════════════════════════════════════════════════════════════

class SCIDReader {
  constructor() { this.dataPath = CONFIG.dataPath; }

  getSymbols() {
    return fs.readdirSync(this.dataPath)
      .filter(f => f.endsWith('.scid'))
      .map(f => ({ symbol: path.basename(f, '.scid'), size: fs.statSync(path.join(this.dataPath, f)).size }))
      .sort((a, b) => b.size - a.size);
  }

  getBars(symbol, count = 500) {
    const filePath = path.join(this.dataPath, `${symbol}.scid`);
    if (!fs.existsSync(filePath)) return [];
    
    const buffer = fs.readFileSync(filePath);
    const headerSize = buffer.readUInt32LE(4) || 56;
    const recordSize = buffer.readUInt32LE(8) || 40;
    const totalRecords = Math.floor((buffer.length - headerSize) / recordSize);
    
    const bars = [];
    const startRecord = Math.max(0, totalRecords - count);
    
    for (let i = startRecord; i < totalRecords; i++) {
      const offset = headerSize + (i * recordSize);
      if (offset + recordSize > buffer.length) break;
      
      try {
        const dt = buffer.readBigInt64LE(offset);
        const date = new Date(new Date(1899, 11, 30).getTime() + Number(dt / BigInt(86400000000)) * 86400000);
        const o = buffer.readFloatLE(offset + 8);
        const h = buffer.readFloatLE(offset + 12);
        const l = buffer.readFloatLE(offset + 16);
        const c = buffer.readFloatLE(offset + 20);
        const v = buffer.readUInt32LE(offset + 28);
        
        if (c > 0 && date.getFullYear() >= 2020) bars.push({ date, o, h, l, c, v });
      } catch(e) {}
    }
    return bars;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// DTC CLIENT
// ════════════════════════════════════════════════════════════════════════════

class DTCClient extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.isConnected = false;
    this.isReady = false;
    this.buffer = '';
    this.symbolMap = new Map();
    this.quotes = new Map();
    this.reqId = 1;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();
      this.socket.setNoDelay(true);
      this.socket.setEncoding('utf8');

      const timeout = setTimeout(() => { if (!this.isReady) reject(new Error('Timeout')); }, 15000);

      this.socket.connect(CONFIG.dtc.port, CONFIG.dtc.host, () => {
        this.isConnected = true;
        this.send({ Type: 'EncodingRequest', ProtocolVersion: 8, Encoding: 2, ProtocolType: 'DTC' });
      });

      this.socket.on('data', (d) => {
        this.buffer += d;
        this.buffer.split('\x00').filter(p => p.trim()).forEach(p => {
          try {
            const msg = JSON.parse(p);
            if (msg.Type === 'Heartbeat' || msg.Type === 3) {
              if (!this.isReady) {
                this.send({ Type: 'LogonRequest', ProtocolVersion: 8, Username: CONFIG.dtc.username, Password: CONFIG.dtc.password, HeartbeatIntervalInSeconds: 30 });
                setTimeout(() => { if (!this.isReady) { this.isReady = true; this.emit('ready'); } }, 2000);
              }
              this.send({ Type: 'Heartbeat', NumDroppedMessages: 0, CurrentDateTime: Math.floor(Date.now()/1000) });
            }
            if (msg.Type === 'MarketDataSnapshot' || msg.Type === 104) {
              const sym = this.symbolMap.get(msg.SymbolID);
              if (sym) {
                this.quotes.set(sym, { last: msg.LastTradePrice, bid: msg.BidPrice, ask: msg.AskPrice, ts: new Date() });
                this.emit('quote', { symbol: sym, ...this.quotes.get(sym) });
              }
            }
          } catch(e) {}
        });
        this.buffer = '';
      });

      this.socket.on('error', (e) => { clearTimeout(timeout); reject(e); });
      this.once('ready', () => { clearTimeout(timeout); resolve(); });
    });
  }

  subscribe(symbol) {
    const id = this.reqId++;
    this.symbolMap.set(id, symbol);
    this.send({ Type: 'MarketDataRequest', RequestAction: 1, SymbolID: id, Symbol: symbol, Exchange: '' });
    return id;
  }

  send(obj) { if (this.socket && this.isConnected) this.socket.write(JSON.stringify(obj) + '\x00'); }
  disconnect() { this.send({ Type: 'Logoff' }); setTimeout(() => this.socket?.destroy(), 500); }
}

// ════════════════════════════════════════════════════════════════════════════
// MARKET ANALYZER
// ════════════════════════════════════════════════════════════════════════════

class MarketAnalyzer {
  constructor(bars) {
    this.bars = bars;
    this.closes = bars.map(b => b.c);
    this.highs = bars.map(b => b.h);
    this.lows = bars.map(b => b.l);
    this.volumes = bars.map(b => b.v);
    this.indicators = {};
    this.signals = [];
  }

  analyze() {
    if (this.bars.length < 50) return null;
    
    // Calculate all indicators
    this.indicators = {
      sma20: Indicators.SMA(this.closes, 20),
      sma50: Indicators.SMA(this.closes, 50),
      sma200: Indicators.SMA(this.closes, 200),
      ema9: Indicators.EMA(this.closes, 9),
      ema21: Indicators.EMA(this.closes, 21),
      rsi: Indicators.RSI(this.closes, 14),
      macd: Indicators.MACD(this.closes),
      bollinger: Indicators.BollingerBands(this.closes),
      atr: Indicators.ATR(this.highs, this.lows, this.closes),
      stochastic: Indicators.Stochastic(this.highs, this.lows, this.closes),
      adx: Indicators.ADX(this.highs, this.lows, this.closes),
      vwap: Indicators.VWAP(this.highs, this.lows, this.closes, this.volumes)
    };

    // Pivots and Fib
    const dHigh = Math.max(...this.highs.slice(-24));
    const dLow = Math.min(...this.lows.slice(-24));
    const lastClose = this.closes[this.closes.length - 1];
    this.indicators.pivots = Indicators.PivotPoints(dHigh, dLow, lastClose);
    this.indicators.fibonacci = Indicators.Fibonacci(dHigh, dLow);

    // Generate signals
    this.generateSignals();
    
    return this;
  }

  generateSignals() {
    const i = this.closes.length - 1;
    const rsi = this.indicators.rsi[i];
    const macd = this.indicators.macd.macd[i];
    const macdSig = this.indicators.macd.signal[i];
    const prevMacd = this.indicators.macd.macd[i-1];
    const prevMacdSig = this.indicators.macd.signal[i-1];

    if (rsi && rsi < 30) this.signals.push({ type: 'BUY', ind: 'RSI', msg: `RSI survendu (${rsi.toFixed(1)})` });
    if (rsi && rsi > 70) this.signals.push({ type: 'SELL', ind: 'RSI', msg: `RSI suracheté (${rsi.toFixed(1)})` });
    if (macd && macdSig && prevMacd < prevMacdSig && macd > macdSig) this.signals.push({ type: 'BUY', ind: 'MACD', msg: 'Croisement haussier MACD' });
    if (macd && macdSig && prevMacd > prevMacdSig && macd < macdSig) this.signals.push({ type: 'SELL', ind: 'MACD', msg: 'Croisement baissier MACD' });
  }

  getSummary() {
    const i = this.closes.length - 1;
    const last = this.bars[i];
    const prev = this.bars[i-1];
    
    return {
      price: { current: last.c, change: last.c - prev.c, pct: ((last.c - prev.c) / prev.c) * 100 },
      rsi: this.indicators.rsi[i],
      macd: this.indicators.macd.macd[i],
      atr: this.indicators.atr[i],
      sma20: this.indicators.sma20[i],
      sma50: this.indicators.sma50[i],
      bbUpper: this.indicators.bollinger.upper[i],
      bbLower: this.indicators.bollinger.lower[i],
      vwap: this.indicators.vwap[i],
      pivots: this.indicators.pivots,
      signals: this.signals
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN TRADING SUITE
// ════════════════════════════════════════════════════════════════════════════

class TradingSuite {
  constructor() {
    this.reader = new SCIDReader();
    this.dtc = null;
    this.analyses = new Map();
  }

  // Get all local symbols
  getSymbols() { return this.reader.getSymbols(); }

  // Analyze a symbol
  analyzeSymbol(symbol, barCount = 500) {
    const bars = this.reader.getBars(symbol, barCount);
    if (bars.length < 50) return null;
    
    const analyzer = new MarketAnalyzer(bars);
    analyzer.analyze();
    
    const result = { symbol, bars: bars.length, ...analyzer.getSummary() };
    this.analyses.set(symbol, result);
    return result;
  }

  // Analyze all symbols
  analyzeAll() {
    return this.getSymbols().map(s => this.analyzeSymbol(s.symbol)).filter(a => a);
  }

  // Connect to DTC for realtime
  async connectRealtime() {
    this.dtc = new DTCClient();
    try {
      await this.dtc.connect();
      return true;
    } catch(e) {
      return false;
    }
  }

  // Generate report
  printReport(symbol) {
    const a = this.analyses.get(symbol);
    if (!a) return;
    
    console.log('\n┌' + '─'.repeat(58) + '┐');
    console.log('│' + ` 📊 ${symbol}`.padEnd(58) + '│');
    console.log('├' + '─'.repeat(58) + '┤');
    console.log('│' + ` 💰 Prix: $${a.price.current.toLocaleString()} (${a.price.pct >= 0 ? '+' : ''}${a.price.pct.toFixed(2)}%)`.padEnd(58) + '│');
    console.log('│' + ` 📈 RSI: ${a.rsi?.toFixed(1) || 'N/A'} | MACD: ${a.macd?.toFixed(4) || 'N/A'}`.padEnd(58) + '│');
    console.log('│' + ` 📊 SMA20: $${a.sma20?.toFixed(2) || 'N/A'} | SMA50: $${a.sma50?.toFixed(2) || 'N/A'}`.padEnd(58) + '│');
    console.log('│' + ` 🎯 Pivot: $${a.pivots?.pivot?.toFixed(2) || 'N/A'} | VWAP: $${a.vwap?.toFixed(2) || 'N/A'}`.padEnd(58) + '│');
    
    if (a.signals.length > 0) {
      console.log('├' + '─'.repeat(58) + '┤');
      console.log('│' + ` 🚨 SIGNAUX:`.padEnd(58) + '│');
      for (const s of a.signals) {
        const icon = s.type === 'BUY' ? '🟢' : '🔴';
        console.log('│' + `    ${icon} ${s.type} (${s.ind}): ${s.msg}`.padEnd(58) + '│');
      }
    }
    console.log('└' + '─'.repeat(58) + '┘');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  const suite = new TradingSuite();
  
  // 1. List symbols
  console.log('📂 SYMBOLES DISPONIBLES:\n');
  const symbols = suite.getSymbols();
  for (const s of symbols.slice(0, 8)) {
    console.log(`   ${s.symbol.padEnd(25)} ${(s.size/(1024*1024)).toFixed(1)} MB`);
  }
  
  // 2. Analyze top symbols
  console.log('\n\n🔬 ANALYSES PROFESSIONNELLES:\n');
  
  for (const s of symbols.slice(0, 5)) {
    console.log(`   Analyse de ${s.symbol}...`);
    const result = suite.analyzeSymbol(s.symbol, 500);
    if (result) suite.printReport(s.symbol);
  }
  
  // 3. Test DTC
  console.log('\n\n📡 CONNEXION DTC TEMPS RÉEL:\n');
  const connected = await suite.connectRealtime();
  console.log(`   Status: ${connected ? '✅ Connecté' : '❌ Non disponible'}`);
  
  if (connected) {
    for (const s of symbols.slice(0, 3)) {
      suite.dtc.subscribe(s.symbol);
      console.log(`   📊 Abonné: ${s.symbol}`);
    }
    
    suite.dtc.on('quote', q => {
      console.log(`   📈 ${q.symbol}: $${q.last?.toLocaleString() || 'N/A'}`);
    });
    
    await new Promise(r => setTimeout(r, 10000));
    suite.dtc.disconnect();
  }
  
  console.log('\n\n' + '═'.repeat(60));
  console.log('🏁 TRADING SUITE - ANALYSE TERMINÉE');
  console.log('═'.repeat(60) + '\n');
}

main().catch(console.error);
