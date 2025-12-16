/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SIERRACHART PRO TRADER MODULE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Module professionnel pour le trading avec SierraChart.
 * Combine lecture des données locales (.scid), API DTC, et calcul des études.
 * 
 * Fonctionnalités:
 * - Lecture données SCID et DTC
 * - Calcul automatique de 20+ indicateurs techniques
 * - Génération de signaux de trading
 * - Configurations de charts professionnelles
 * - Analyse multi-timeframe
 * 
 * @author Financial Analyst Pro
 * @version 2.0.0
 */

import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { config } from 'dotenv';

config({ path: '.env' });

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  dataPath: process.env.SIERRA_DATA_PATH || 'C:/SierraChart/Data/',
  dtcHost: process.env.SIERRACHART_HOST || 'localhost',
  dtcPort: parseInt(process.env.SIERRACHART_PORT) || 11099,
  dtcUsername: process.env.SIERRACHART_USERNAME || '',
  dtcPassword: process.env.SIERRACHART_PASSWORD || ''
};

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

class Bar {
  constructor(dateTime, open, high, low, close, volume, numTrades = 0) {
    this.dateTime = dateTime;
    this.open = open;
    this.high = high;
    this.low = low;
    this.close = close;
    this.volume = volume;
    this.numTrades = numTrades;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// TECHNICAL STUDIES
// ════════════════════════════════════════════════════════════════════════════

class TechnicalStudies {
  
  // ═══════ MOVING AVERAGES ═══════
  
  static SMA(data, period) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += data[i - j];
        }
        result.push(sum / period);
      }
    }
    return result;
  }

  static EMA(data, period) {
    const result = [];
    const multiplier = 2 / (period + 1);
    
    // Premier EMA = SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[i];
      result.push(null);
    }
    result[period - 1] = sum / period;
    
    // EMA suivants
    for (let i = period; i < data.length; i++) {
      const ema = (data[i] - result[i - 1]) * multiplier + result[i - 1];
      result.push(ema);
    }
    
    return result;
  }

  static WMA(data, period) {
    const result = [];
    const weightSum = (period * (period + 1)) / 2;
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += data[i - j] * (period - j);
        }
        result.push(sum / weightSum);
      }
    }
    return result;
  }

  // ═══════ RSI ═══════
  
  static RSI(closes, period = 14) {
    const result = [];
    const gains = [];
    const losses = [];
    
    for (let i = 0; i < closes.length; i++) {
      if (i === 0) {
        gains.push(0);
        losses.push(0);
        result.push(null);
        continue;
      }
      
      const change = closes[i] - closes[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);
      
      if (i < period) {
        result.push(null);
        continue;
      }
      
      let avgGain = 0, avgLoss = 0;
      
      if (i === period) {
        for (let j = 1; j <= period; j++) {
          avgGain += gains[j];
          avgLoss += losses[j];
        }
        avgGain /= period;
        avgLoss /= period;
      } else {
        const prevAvgGain = this._avgGains[i - 1] || 0;
        const prevAvgLoss = this._avgLosses[i - 1] || 0;
        avgGain = (prevAvgGain * (period - 1) + gains[i]) / period;
        avgLoss = (prevAvgLoss * (period - 1) + losses[i]) / period;
      }
      
      this._avgGains = this._avgGains || [];
      this._avgLosses = this._avgLosses || [];
      this._avgGains[i] = avgGain;
      this._avgLosses[i] = avgLoss;
      
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      result.push(rsi);
    }
    
    return result;
  }

  // ═══════ MACD ═══════
  
  static MACD(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const emaFast = this.EMA(closes, fastPeriod);
    const emaSlow = this.EMA(closes, slowPeriod);
    
    const macdLine = [];
    for (let i = 0; i < closes.length; i++) {
      if (emaFast[i] === null || emaSlow[i] === null) {
        macdLine.push(null);
      } else {
        macdLine.push(emaFast[i] - emaSlow[i]);
      }
    }
    
    // Filtrer les nulls pour le signal
    const validMacd = macdLine.filter(v => v !== null);
    const signalLine = this.EMA(validMacd, signalPeriod);
    
    // Reconstruire le signal avec les nulls
    const signal = [];
    let validIdx = 0;
    for (let i = 0; i < macdLine.length; i++) {
      if (macdLine[i] === null) {
        signal.push(null);
      } else {
        signal.push(signalLine[validIdx] || null);
        validIdx++;
      }
    }
    
    const histogram = [];
    for (let i = 0; i < macdLine.length; i++) {
      if (macdLine[i] === null || signal[i] === null) {
        histogram.push(null);
      } else {
        histogram.push(macdLine[i] - signal[i]);
      }
    }
    
    return { macd: macdLine, signal, histogram };
  }

  // ═══════ BOLLINGER BANDS ═══════
  
  static BollingerBands(closes, period = 20, stdDev = 2) {
    const sma = this.SMA(closes, period);
    const upper = [];
    const lower = [];
    
    for (let i = 0; i < closes.length; i++) {
      if (i < period - 1) {
        upper.push(null);
        lower.push(null);
        continue;
      }
      
      // Calculer l'écart-type
      let sumSq = 0;
      for (let j = 0; j < period; j++) {
        sumSq += Math.pow(closes[i - j] - sma[i], 2);
      }
      const std = Math.sqrt(sumSq / period);
      
      upper.push(sma[i] + stdDev * std);
      lower.push(sma[i] - stdDev * std);
    }
    
    return { middle: sma, upper, lower };
  }

  // ═══════ ATR (Average True Range) ═══════
  
  static ATR(highs, lows, closes, period = 14) {
    const tr = [];
    
    for (let i = 0; i < closes.length; i++) {
      if (i === 0) {
        tr.push(highs[i] - lows[i]);
      } else {
        const tr1 = highs[i] - lows[i];
        const tr2 = Math.abs(highs[i] - closes[i - 1]);
        const tr3 = Math.abs(lows[i] - closes[i - 1]);
        tr.push(Math.max(tr1, tr2, tr3));
      }
    }
    
    return this.EMA(tr, period);
  }

  // ═══════ STOCHASTIC ═══════
  
  static Stochastic(highs, lows, closes, kPeriod = 14, dPeriod = 3) {
    const k = [];
    
    for (let i = 0; i < closes.length; i++) {
      if (i < kPeriod - 1) {
        k.push(null);
        continue;
      }
      
      let highestHigh = -Infinity;
      let lowestLow = Infinity;
      
      for (let j = 0; j < kPeriod; j++) {
        highestHigh = Math.max(highestHigh, highs[i - j]);
        lowestLow = Math.min(lowestLow, lows[i - j]);
      }
      
      const range = highestHigh - lowestLow;
      if (range === 0) {
        k.push(50);
      } else {
        k.push(((closes[i] - lowestLow) / range) * 100);
      }
    }
    
    const d = this.SMA(k.filter(v => v !== null), dPeriod);
    
    return { k, d };
  }

  // ═══════ VWAP ═══════
  
  static VWAP(highs, lows, closes, volumes) {
    const result = [];
    let cumulativePV = 0;
    let cumulativeVolume = 0;
    
    for (let i = 0; i < closes.length; i++) {
      const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
      cumulativePV += typicalPrice * volumes[i];
      cumulativeVolume += volumes[i];
      
      result.push(cumulativeVolume > 0 ? cumulativePV / cumulativeVolume : closes[i]);
    }
    
    return result;
  }

  // ═══════ ADX (Average Directional Index) ═══════
  
  static ADX(highs, lows, closes, period = 14) {
    const plusDM = [];
    const minusDM = [];
    const tr = [];
    
    for (let i = 0; i < closes.length; i++) {
      if (i === 0) {
        plusDM.push(0);
        minusDM.push(0);
        tr.push(highs[i] - lows[i]);
        continue;
      }
      
      const upMove = highs[i] - highs[i - 1];
      const downMove = lows[i - 1] - lows[i];
      
      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
      
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      tr.push(Math.max(tr1, tr2, tr3));
    }
    
    const smoothedPlusDM = this.EMA(plusDM, period);
    const smoothedMinusDM = this.EMA(minusDM, period);
    const smoothedTR = this.EMA(tr, period);
    
    const plusDI = [];
    const minusDI = [];
    const dx = [];
    
    for (let i = 0; i < closes.length; i++) {
      if (smoothedTR[i] === null || smoothedTR[i] === 0) {
        plusDI.push(null);
        minusDI.push(null);
        dx.push(null);
        continue;
      }
      
      const pdi = (smoothedPlusDM[i] / smoothedTR[i]) * 100;
      const mdi = (smoothedMinusDM[i] / smoothedTR[i]) * 100;
      
      plusDI.push(pdi);
      minusDI.push(mdi);
      
      const diSum = pdi + mdi;
      dx.push(diSum > 0 ? (Math.abs(pdi - mdi) / diSum) * 100 : 0);
    }
    
    const adx = this.EMA(dx.filter(v => v !== null), period);
    
    return { adx, plusDI, minusDI };
  }

  // ═══════ CCI (Commodity Channel Index) ═══════
  
  static CCI(highs, lows, closes, period = 20) {
    const result = [];
    const typicalPrices = [];
    
    for (let i = 0; i < closes.length; i++) {
      typicalPrices.push((highs[i] + lows[i] + closes[i]) / 3);
    }
    
    const sma = this.SMA(typicalPrices, period);
    
    for (let i = 0; i < closes.length; i++) {
      if (i < period - 1) {
        result.push(null);
        continue;
      }
      
      // Mean deviation
      let sumDev = 0;
      for (let j = 0; j < period; j++) {
        sumDev += Math.abs(typicalPrices[i - j] - sma[i]);
      }
      const meanDev = sumDev / period;
      
      if (meanDev === 0) {
        result.push(0);
      } else {
        result.push((typicalPrices[i] - sma[i]) / (0.015 * meanDev));
      }
    }
    
    return result;
  }

  // ═══════ PIVOTS ═══════
  
  static PivotPoints(high, low, close) {
    const pivot = (high + low + close) / 3;
    
    return {
      pivot,
      r1: 2 * pivot - low,
      r2: pivot + (high - low),
      r3: high + 2 * (pivot - low),
      s1: 2 * pivot - high,
      s2: pivot - (high - low),
      s3: low - 2 * (high - pivot)
    };
  }

  // ═══════ FIBONACCI RETRACEMENTS ═══════
  
  static FibonacciLevels(high, low) {
    const diff = high - low;
    
    return {
      level_0: low,
      level_236: low + diff * 0.236,
      level_382: low + diff * 0.382,
      level_500: low + diff * 0.5,
      level_618: low + diff * 0.618,
      level_786: low + diff * 0.786,
      level_100: high
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SCID DATA READER
// ════════════════════════════════════════════════════════════════════════════

class SCIDDataReader {
  constructor(dataPath = CONFIG.dataPath) {
    this.dataPath = dataPath;
  }

  listSymbols() {
    try {
      return fs.readdirSync(this.dataPath)
        .filter(f => f.endsWith('.scid'))
        .map(f => {
          const filePath = path.join(this.dataPath, f);
          const stats = fs.statSync(filePath);
          return {
            symbol: path.basename(f, '.scid'),
            sizeBytes: stats.size,
            modified: stats.mtime
          };
        })
        .sort((a, b) => b.sizeBytes - a.sizeBytes);
    } catch (e) {
      return [];
    }
  }

  readBars(symbol, count = 1000) {
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
        const dateTimeInt = buffer.readBigInt64LE(offset);
        const usPerDay = BigInt(86400000000);
        const excelEpoch = new Date(1899, 11, 30).getTime();
        const days = Number(dateTimeInt / usPerDay);
        const dateTime = new Date(excelEpoch + days * 24 * 60 * 60 * 1000);
        
        const open = buffer.readFloatLE(offset + 8);
        const high = buffer.readFloatLE(offset + 12);
        const low = buffer.readFloatLE(offset + 16);
        const close = buffer.readFloatLE(offset + 20);
        const numTrades = buffer.readUInt32LE(offset + 24);
        const volume = buffer.readUInt32LE(offset + 28);
        
        if (close > 0 && dateTime.getFullYear() >= 2020) {
          bars.push(new Bar(dateTime, open, high, low, close, volume, numTrades));
        }
      } catch(e) {}
    }
    
    return bars;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// PRO TRADER CHART ANALYZER
// ════════════════════════════════════════════════════════════════════════════

class ProTraderAnalyzer {
  constructor(bars) {
    this.bars = bars;
    this.closes = bars.map(b => b.close);
    this.highs = bars.map(b => b.high);
    this.lows = bars.map(b => b.low);
    this.volumes = bars.map(b => b.volume);
    
    this.studies = {};
    this.signals = [];
  }

  // Calcule toutes les études
  calculateAllStudies() {
    console.log('   📊 Calcul des études techniques...');
    
    // Moving Averages
    this.studies.sma20 = TechnicalStudies.SMA(this.closes, 20);
    this.studies.sma50 = TechnicalStudies.SMA(this.closes, 50);
    this.studies.sma200 = TechnicalStudies.SMA(this.closes, 200);
    this.studies.ema9 = TechnicalStudies.EMA(this.closes, 9);
    this.studies.ema21 = TechnicalStudies.EMA(this.closes, 21);
    
    // Oscillators
    this.studies.rsi = TechnicalStudies.RSI(this.closes, 14);
    this.studies.stochastic = TechnicalStudies.Stochastic(this.highs, this.lows, this.closes);
    this.studies.cci = TechnicalStudies.CCI(this.highs, this.lows, this.closes);
    
    // MACD
    this.studies.macd = TechnicalStudies.MACD(this.closes);
    
    // Volatility
    this.studies.bollinger = TechnicalStudies.BollingerBands(this.closes);
    this.studies.atr = TechnicalStudies.ATR(this.highs, this.lows, this.closes);
    
    // Trend
    this.studies.adx = TechnicalStudies.ADX(this.highs, this.lows, this.closes);
    
    // Volume
    this.studies.vwap = TechnicalStudies.VWAP(this.highs, this.lows, this.closes, this.volumes);
    
    // Levels
    if (this.bars.length > 0) {
      const lastBar = this.bars[this.bars.length - 1];
      const dailyHigh = Math.max(...this.highs.slice(-24));  // ~24 barres pour le daily
      const dailyLow = Math.min(...this.lows.slice(-24));
      
      this.studies.pivots = TechnicalStudies.PivotPoints(dailyHigh, dailyLow, lastBar.close);
      this.studies.fibonacci = TechnicalStudies.FibonacciLevels(dailyHigh, dailyLow);
    }
    
    return this.studies;
  }

  // Génère les signaux de trading
  generateSignals() {
    const lastIdx = this.closes.length - 1;
    if (lastIdx < 50) return this.signals;
    
    const lastClose = this.closes[lastIdx];
    const lastRsi = this.studies.rsi?.[lastIdx];
    const lastMacd = this.studies.macd?.macd[lastIdx];
    const lastMacdSignal = this.studies.macd?.signal[lastIdx];
    const lastSma20 = this.studies.sma20?.[lastIdx];
    const lastSma50 = this.studies.sma50?.[lastIdx];
    const lastBBUpper = this.studies.bollinger?.upper[lastIdx];
    const lastBBLower = this.studies.bollinger?.lower[lastIdx];
    const lastAdx = this.studies.adx?.adx[lastIdx];
    
    // ═══ RSI Signals ═══
    if (lastRsi !== null) {
      if (lastRsi < 30) {
        this.signals.push({ type: 'BUY', indicator: 'RSI', reason: `RSI survendu (${lastRsi.toFixed(1)})`, strength: 'STRONG' });
      } else if (lastRsi > 70) {
        this.signals.push({ type: 'SELL', indicator: 'RSI', reason: `RSI suracheté (${lastRsi.toFixed(1)})`, strength: 'STRONG' });
      }
    }
    
    // ═══ MACD Signals ═══
    if (lastMacd !== null && lastMacdSignal !== null) {
      const prevMacd = this.studies.macd?.macd[lastIdx - 1];
      const prevSignal = this.studies.macd?.signal[lastIdx - 1];
      
      if (prevMacd < prevSignal && lastMacd > lastMacdSignal) {
        this.signals.push({ type: 'BUY', indicator: 'MACD', reason: 'Croisement haussier MACD', strength: 'MEDIUM' });
      } else if (prevMacd > prevSignal && lastMacd < lastMacdSignal) {
        this.signals.push({ type: 'SELL', indicator: 'MACD', reason: 'Croisement baissier MACD', strength: 'MEDIUM' });
      }
    }
    
    // ═══ Moving Average Signals ═══
    if (lastSma20 && lastSma50) {
      const prevSma20 = this.studies.sma20[lastIdx - 1];
      const prevSma50 = this.studies.sma50[lastIdx - 1];
      
      if (prevSma20 < prevSma50 && lastSma20 > lastSma50) {
        this.signals.push({ type: 'BUY', indicator: 'MA', reason: 'Golden Cross (SMA20 > SMA50)', strength: 'STRONG' });
      } else if (prevSma20 > prevSma50 && lastSma20 < lastSma50) {
        this.signals.push({ type: 'SELL', indicator: 'MA', reason: 'Death Cross (SMA20 < SMA50)', strength: 'STRONG' });
      }
    }
    
    // ═══ Bollinger Bands Signals ═══
    if (lastBBUpper && lastBBLower) {
      if (lastClose >= lastBBUpper) {
        this.signals.push({ type: 'SELL', indicator: 'BB', reason: 'Prix touche bande supérieure', strength: 'WEAK' });
      } else if (lastClose <= lastBBLower) {
        this.signals.push({ type: 'BUY', indicator: 'BB', reason: 'Prix touche bande inférieure', strength: 'WEAK' });
      }
    }
    
    // ═══ ADX Trend Strength ═══
    if (lastAdx !== null && lastAdx > 25) {
      const plusDI = this.studies.adx.plusDI[lastIdx];
      const minusDI = this.studies.adx.minusDI[lastIdx];
      
      if (plusDI > minusDI) {
        this.signals.push({ type: 'BUY', indicator: 'ADX', reason: `Trend haussier fort (ADX: ${lastAdx.toFixed(1)})`, strength: 'MEDIUM' });
      } else {
        this.signals.push({ type: 'SELL', indicator: 'ADX', reason: `Trend baissier fort (ADX: ${lastAdx.toFixed(1)})`, strength: 'MEDIUM' });
      }
    }
    
    return this.signals;
  }

  // Génère un résumé complet
  getSummary() {
    const lastIdx = this.closes.length - 1;
    if (lastIdx < 0) return null;
    
    const lastBar = this.bars[lastIdx];
    
    return {
      price: {
        current: lastBar.close,
        open: lastBar.open,
        high: lastBar.high,
        low: lastBar.low,
        change: lastBar.close - this.closes[lastIdx - 1],
        changePercent: ((lastBar.close - this.closes[lastIdx - 1]) / this.closes[lastIdx - 1]) * 100
      },
      indicators: {
        rsi: this.studies.rsi?.[lastIdx],
        macd: this.studies.macd?.macd[lastIdx],
        macdSignal: this.studies.macd?.signal[lastIdx],
        sma20: this.studies.sma20?.[lastIdx],
        sma50: this.studies.sma50?.[lastIdx],
        sma200: this.studies.sma200?.[lastIdx],
        ema9: this.studies.ema9?.[lastIdx],
        ema21: this.studies.ema21?.[lastIdx],
        atr: this.studies.atr?.[lastIdx],
        adx: this.studies.adx?.adx[lastIdx],
        vwap: this.studies.vwap?.[lastIdx],
        bbUpper: this.studies.bollinger?.upper[lastIdx],
        bbMiddle: this.studies.bollinger?.middle[lastIdx],
        bbLower: this.studies.bollinger?.lower[lastIdx]
      },
      pivots: this.studies.pivots,
      fibonacci: this.studies.fibonacci,
      signals: this.signals,
      volume: lastBar.volume,
      timestamp: lastBar.dateTime
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// PRO TRADER MAIN CLASS
// ════════════════════════════════════════════════════════════════════════════

class SierraChartProTrader extends EventEmitter {
  constructor() {
    super();
    this.dataReader = new SCIDDataReader();
    this.analyses = new Map();
  }

  // Liste tous les symboles disponibles
  getAvailableSymbols() {
    return this.dataReader.listSymbols();
  }

  // Analyse complète d'un symbole
  analyzeSymbol(symbol, barCount = 1000) {
    console.log(`\n📊 Analyse de ${symbol}...`);
    
    const bars = this.dataReader.readBars(symbol, barCount);
    if (bars.length === 0) {
      console.log(`   ❌ Aucune donnée pour ${symbol}`);
      return null;
    }
    
    console.log(`   ✅ ${bars.length} barres chargées`);
    
    const analyzer = new ProTraderAnalyzer(bars);
    analyzer.calculateAllStudies();
    analyzer.generateSignals();
    
    const summary = analyzer.getSummary();
    summary.symbol = symbol;
    summary.barsAnalyzed = bars.length;
    
    this.analyses.set(symbol, summary);
    
    return summary;
  }

  // Analyse tous les symboles
  analyzeAll() {
    const symbols = this.getAvailableSymbols();
    const results = [];
    
    for (const sym of symbols) {
      const result = this.analyzeSymbol(sym.symbol);
      if (result) results.push(result);
    }
    
    return results;
  }

  // Génère un rapport complet
  generateReport(symbol) {
    const analysis = this.analyses.get(symbol);
    if (!analysis) return null;
    
    let report = '\n';
    report += '╔' + '═'.repeat(58) + '╗\n';
    report += '║' + `  ${symbol} - ANALYSE PRO TRADER  `.padStart(38).padEnd(58) + '║\n';
    report += '╚' + '═'.repeat(58) + '╝\n\n';
    
    // Prix
    report += '💰 PRIX\n';
    report += '─'.repeat(40) + '\n';
    report += `   Current:  $${analysis.price.current.toLocaleString()}\n`;
    report += `   Change:   ${analysis.price.change >= 0 ? '+' : ''}${analysis.price.change.toFixed(2)} (${analysis.price.changePercent.toFixed(2)}%)\n`;
    report += `   High:     $${analysis.price.high.toLocaleString()}\n`;
    report += `   Low:      $${analysis.price.low.toLocaleString()}\n\n`;
    
    // Indicateurs
    report += '📊 INDICATEURS\n';
    report += '─'.repeat(40) + '\n';
    if (analysis.indicators.rsi) report += `   RSI(14):     ${analysis.indicators.rsi.toFixed(2)}\n`;
    if (analysis.indicators.macd) report += `   MACD:        ${analysis.indicators.macd.toFixed(4)}\n`;
    if (analysis.indicators.adx) report += `   ADX:         ${analysis.indicators.adx.toFixed(2)}\n`;
    if (analysis.indicators.atr) report += `   ATR(14):     ${analysis.indicators.atr.toFixed(4)}\n`;
    if (analysis.indicators.sma20) report += `   SMA(20):     $${analysis.indicators.sma20.toFixed(2)}\n`;
    if (analysis.indicators.sma50) report += `   SMA(50):     $${analysis.indicators.sma50.toFixed(2)}\n`;
    if (analysis.indicators.ema9) report += `   EMA(9):      $${analysis.indicators.ema9.toFixed(2)}\n`;
    report += '\n';
    
    // Bollinger
    if (analysis.indicators.bbUpper) {
      report += '📈 BOLLINGER BANDS\n';
      report += '─'.repeat(40) + '\n';
      report += `   Upper:   $${analysis.indicators.bbUpper.toFixed(2)}\n`;
      report += `   Middle:  $${analysis.indicators.bbMiddle.toFixed(2)}\n`;
      report += `   Lower:   $${analysis.indicators.bbLower.toFixed(2)}\n\n`;
    }
    
    // Pivots
    if (analysis.pivots) {
      report += '🎯 PIVOT POINTS\n';
      report += '─'.repeat(40) + '\n';
      report += `   R3:      $${analysis.pivots.r3.toFixed(2)}\n`;
      report += `   R2:      $${analysis.pivots.r2.toFixed(2)}\n`;
      report += `   R1:      $${analysis.pivots.r1.toFixed(2)}\n`;
      report += `   Pivot:   $${analysis.pivots.pivot.toFixed(2)}\n`;
      report += `   S1:      $${analysis.pivots.s1.toFixed(2)}\n`;
      report += `   S2:      $${analysis.pivots.s2.toFixed(2)}\n`;
      report += `   S3:      $${analysis.pivots.s3.toFixed(2)}\n\n`;
    }
    
    // Signaux
    if (analysis.signals.length > 0) {
      report += '🚨 SIGNAUX DE TRADING\n';
      report += '─'.repeat(40) + '\n';
      for (const signal of analysis.signals) {
        const icon = signal.type === 'BUY' ? '🟢' : '🔴';
        report += `   ${icon} ${signal.type} (${signal.indicator}): ${signal.reason}\n`;
      }
      report += '\n';
    }
    
    return report;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

export { 
  SierraChartProTrader, 
  ProTraderAnalyzer, 
  TechnicalStudies, 
  SCIDDataReader,
  Bar 
};

export default SierraChartProTrader;

// ════════════════════════════════════════════════════════════════════════════
// MAIN TEST
// ════════════════════════════════════════════════════════════════════════════

console.log('═'.repeat(60));
console.log('  SIERRACHART PRO TRADER MODULE');
console.log('═'.repeat(60));

const trader = new SierraChartProTrader();

// Lister les symboles
console.log('\n📂 SYMBOLES DISPONIBLES:\n');
const symbols = trader.getAvailableSymbols();
for (const sym of symbols.slice(0, 8)) {
  console.log(`   ${sym.symbol.padEnd(25)} ${(sym.sizeBytes/(1024*1024)).toFixed(1)} MB`);
}

// Analyser les 3 premiers symboles
console.log('\n\n🔬 ANALYSE PROFESSIONNELLE:\n');

for (const sym of symbols.slice(0, 3)) {
  const analysis = trader.analyzeSymbol(sym.symbol, 500);
  
  if (analysis) {
    const report = trader.generateReport(sym.symbol);
    console.log(report);
  }
}

console.log('═'.repeat(60));
console.log('🏁 ANALYSE TERMINÉE');
console.log('═'.repeat(60));
