/**
 * SierraChart Expert Module
 * 
 * Module unifié pour l'intégration SierraChart dans le projet Financial Analyst.
 * Combine lecture des données locales (.scid) et connexion DTC temps réel.
 * 
 * @author Financial Analyst Bot
 * @version 1.0.0
 */

import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { config } from 'dotenv';

config({ path: '.env' });

// ============================================
// TYPES
// ============================================

export interface SierraChartConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  dataPath?: string;
}

export interface MarketDataBar {
  dateTime: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  numTrades?: number;
}

export interface MarketQuote {
  symbol: string;
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  volume: number;
  timestamp: Date;
}

export interface SymbolInfo {
  symbol: string;
  exchange?: string;
  description?: string;
  hasLocalData: boolean;
  localBars?: number;
  localSizeBytes?: number;
  lastModified?: Date;
}

// ============================================
// SCID FILE READER
// ============================================

export class SCIDReader {
  private dataPath: string;
  
  constructor(dataPath: string = 'C:/SierraChart/Data/') {
    this.dataPath = dataPath;
  }

  /**
   * Liste tous les symboles avec données locales
   */
  listAvailableSymbols(): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];
    
    try {
      const files = fs.readdirSync(this.dataPath)
        .filter(f => f.endsWith('.scid') || f.endsWith('.dly'));
      
      for (const file of files) {
        const filePath = path.join(this.dataPath, file);
        const stats = fs.statSync(filePath);
        const buffer = fs.readFileSync(filePath);
        
        const headerSize = buffer.length >= 8 ? buffer.readUInt32LE(4) : 56;
        const recordSize = buffer.length >= 12 ? buffer.readUInt32LE(8) : 40;
        const totalRecords = Math.floor((buffer.length - headerSize) / recordSize);
        
        symbols.push({
          symbol: path.basename(file, path.extname(file)),
          hasLocalData: true,
          localBars: totalRecords,
          localSizeBytes: stats.size,
          lastModified: stats.mtime
        });
      }
    } catch (e) {
      console.error('Erreur lecture répertoire:', e);
    }
    
    return symbols.sort((a, b) => (b.localSizeBytes || 0) - (a.localSizeBytes || 0));
  }

  /**
   * Lit les dernières barres d'un symbole
   */
  readLastBars(symbol: string, count: number = 100): MarketDataBar[] {
    const files = [
      path.join(this.dataPath, `${symbol}.scid`),
      path.join(this.dataPath, `${symbol}.dly`),
    ];
    
    for (const filePath of files) {
      if (!fs.existsSync(filePath)) continue;
      
      try {
        const buffer = fs.readFileSync(filePath);
        const headerSize = buffer.readUInt32LE(4) || 56;
        const recordSize = buffer.readUInt32LE(8) || 40;
        const totalRecords = Math.floor((buffer.length - headerSize) / recordSize);
        
        const bars: MarketDataBar[] = [];
        const startRecord = Math.max(0, totalRecords - count);
        
        for (let i = startRecord; i < totalRecords; i++) {
          const offset = headerSize + (i * recordSize);
          if (offset + recordSize > buffer.length) break;
          
          try {
            // DateTime
            const dateTimeInt = buffer.readBigInt64LE(offset);
            const usPerDay = BigInt(86400000000);
            const excelEpoch = new Date(1899, 11, 30).getTime();
            const days = Number(dateTimeInt / usPerDay);
            const timestamp = excelEpoch + days * 24 * 60 * 60 * 1000;
            const dateTime = new Date(timestamp);
            
            // OHLCV
            const open = buffer.readFloatLE(offset + 8);
            const high = buffer.readFloatLE(offset + 12);
            const low = buffer.readFloatLE(offset + 16);
            const close = buffer.readFloatLE(offset + 20);
            const numTrades = buffer.readUInt32LE(offset + 24);
            const volume = buffer.readUInt32LE(offset + 28);
            
            if (close > 0 && dateTime.getFullYear() >= 2020) {
              bars.push({ dateTime, open, high, low, close, volume, numTrades });
            }
          } catch(e) {}
        }
        
        return bars;
      } catch (e) {
        console.error(`Erreur lecture ${symbol}:`, e);
      }
    }
    
    return [];
  }

  /**
   * Obtient le dernier prix connu pour un symbole
   */
  getLastPrice(symbol: string): number | null {
    const bars = this.readLastBars(symbol, 1);
    return bars.length > 0 ? bars[0].close : null;
  }

  /**
   * Obtient un résumé des prix actuels
   */
  getPriceSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    const symbols = this.listAvailableSymbols();
    
    for (const sym of symbols) {
      const price = this.getLastPrice(sym.symbol);
      if (price !== null) {
        summary[sym.symbol] = price;
      }
    }
    
    return summary;
  }
}

// ============================================
// DTC CLIENT
// ============================================

export class DTCClient extends EventEmitter {
  private config: SierraChartConfig;
  private socket: net.Socket | null = null;
  private isConnected: boolean = false;
  private isReady: boolean = false;
  private buffer: string = '';
  private requestId: number = 1;
  private symbolMap: Map<number, string> = new Map();
  private marketData: Map<string, MarketQuote> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(config: SierraChartConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();
      this.socket.setNoDelay(true);
      this.socket.setEncoding('utf8');

      const timeout = setTimeout(() => {
        if (!this.isReady) {
          this.socket?.destroy();
          reject(new Error('Connection timeout'));
        }
      }, 15000);

      this.socket.connect(this.config.port, this.config.host, () => {
        this.isConnected = true;
        this.sendJSON({
          Type: 'EncodingRequest',
          ProtocolVersion: 8,
          Encoding: 2,
          ProtocolType: 'DTC'
        });
      });

      this.socket.on('data', (data: Buffer) => this.handleData(data.toString()));
      
      this.socket.on('error', (e) => {
        clearTimeout(timeout);
        reject(e);
      });
      
      this.socket.on('close', () => {
        this.isConnected = false;
        this.isReady = false;
        if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
        }
      });

      this.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  private handleData(data: string): void {
    this.buffer += data;
    const parts = this.buffer.split('\x00');
    this.buffer = parts.pop() || '';
    
    for (const p of parts) {
      if (p.trim()) this.processMessage(p.trim());
    }
  }

  private processMessage(raw: string): void {
    try {
      const msg = JSON.parse(raw);
      
      switch (msg.Type) {
        case 'Heartbeat':
        case 3:
          this.handleHeartbeat();
          break;
          
        case 'LogonResponse':
        case 2:
          if (msg.Result === 1 || msg.Result === 0) {
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
        case 'MarketDataUpdateBidAsk':
        case 108:
          this.handleTradeUpdate(msg);
          break;
      }
    } catch(e) {}
  }

  private handleHeartbeat(): void {
    if (!this.isReady) {
      this.sendJSON({
        Type: 'LogonRequest',
        ProtocolVersion: 8,
        Username: this.config.username || '',
        Password: this.config.password || '',
        GeneralTextData: 'Financial Analyst Bot',
        HeartbeatIntervalInSeconds: 30
      });
      
      setTimeout(() => {
        if (!this.isReady) {
          this.isReady = true;
          this.emit('ready');
        }
      }, 2000);
    }
    
    this.sendJSON({
      Type: 'Heartbeat',
      NumDroppedMessages: 0,
      CurrentDateTime: Math.floor(Date.now() / 1000)
    });
  }

  private handleMarketData(msg: any): void {
    const symbolId = msg.SymbolID;
    const symbol = this.symbolMap.get(symbolId) || `ID:${symbolId}`;
    
    const quote: MarketQuote = {
      symbol,
      lastPrice: msg.LastTradePrice || 0,
      bidPrice: msg.BidPrice || 0,
      askPrice: msg.AskPrice || 0,
      volume: msg.LastTradeVolume || 0,
      timestamp: new Date()
    };
    
    this.marketData.set(symbol, quote);
    this.emit('marketData', quote);
  }

  private handleTradeUpdate(msg: any): void {
    const symbol = this.symbolMap.get(msg.SymbolID);
    if (!symbol) return;
    
    const existing = this.marketData.get(symbol) || {
      symbol,
      lastPrice: 0,
      bidPrice: 0,
      askPrice: 0,
      volume: 0,
      timestamp: new Date()
    };
    
    if (msg.Price) existing.lastPrice = msg.Price;
    if (msg.BidPrice) existing.bidPrice = msg.BidPrice;
    if (msg.AskPrice) existing.askPrice = msg.AskPrice;
    existing.timestamp = new Date();
    
    this.marketData.set(symbol, existing);
    this.emit('trade', existing);
  }

  subscribe(symbol: string, exchange: string = ''): number {
    const symbolId = this.requestId++;
    this.symbolMap.set(symbolId, symbol);
    
    this.sendJSON({
      Type: 'MarketDataRequest',
      RequestAction: 1,
      SymbolID: symbolId,
      Symbol: symbol,
      Exchange: exchange
    });
    
    return symbolId;
  }

  unsubscribe(symbolId: number): void {
    this.sendJSON({
      Type: 'MarketDataRequest',
      RequestAction: 2,  // Unsubscribe
      SymbolID: symbolId
    });
    this.symbolMap.delete(symbolId);
  }

  getQuote(symbol: string): MarketQuote | null {
    return this.marketData.get(symbol) || null;
  }

  getAllQuotes(): Record<string, MarketQuote> {
    return Object.fromEntries(this.marketData);
  }

  private sendJSON(obj: any): void {
    if (this.socket && this.isConnected) {
      this.socket.write(JSON.stringify(obj) + '\x00');
    }
  }

  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.socket) {
      this.sendJSON({ Type: 'Logoff' });
      setTimeout(() => this.socket?.destroy(), 500);
    }
  }

  get connected(): boolean {
    return this.isConnected && this.isReady;
  }
}

// ============================================
// SIERRA CHART EXPERT (UNIFIED)
// ============================================

export class SierraChartExpert extends EventEmitter {
  private config: SierraChartConfig;
  private scidReader: SCIDReader;
  private dtcClient: DTCClient | null = null;
  
  constructor(config?: Partial<SierraChartConfig>) {
    super();
    
    this.config = {
      host: config?.host || process.env.SIERRACHART_HOST || 'localhost',
      port: config?.port || parseInt(process.env.SIERRACHART_PORT || '11099'),
      username: config?.username || process.env.SIERRACHART_USERNAME,
      password: config?.password || process.env.SIERRACHART_PASSWORD,
      dataPath: config?.dataPath || process.env.SIERRA_DATA_PATH || 'C:/SierraChart/Data/'
    };
    
    this.scidReader = new SCIDReader(this.config.dataPath!);
  }

  /**
   * Obtient les symboles disponibles (données locales)
   */
  getAvailableSymbols(): SymbolInfo[] {
    return this.scidReader.listAvailableSymbols();
  }

  /**
   * Lit les données historiques locales
   */
  getHistoricalData(symbol: string, bars: number = 100): MarketDataBar[] {
    return this.scidReader.readLastBars(symbol, bars);
  }

  /**
   * Obtient le dernier prix connu (local)
   */
  getLastKnownPrice(symbol: string): number | null {
    return this.scidReader.getLastPrice(symbol);
  }

  /**
   * Obtient un résumé de tous les prix locaux
   */
  getAllPrices(): Record<string, number> {
    return this.scidReader.getPriceSummary();
  }

  /**
   * Se connecte au serveur DTC pour le temps réel
   */
  async connectRealtime(): Promise<boolean> {
    try {
      this.dtcClient = new DTCClient(this.config);
      
      this.dtcClient.on('marketData', (quote: MarketQuote) => {
        this.emit('realtime', quote);
      });
      
      this.dtcClient.on('trade', (quote: MarketQuote) => {
        this.emit('trade', quote);
      });
      
      await this.dtcClient.connect();
      return true;
    } catch (e) {
      console.error('Erreur connexion DTC:', e);
      return false;
    }
  }

  /**
   * S'abonne à un symbole en temps réel
   */
  subscribeRealtime(symbol: string): number | null {
    if (!this.dtcClient || !this.dtcClient.connected) {
      return null;
    }
    return this.dtcClient.subscribe(symbol);
  }

  /**
   * Déconnexion
   */
  disconnect(): void {
    this.dtcClient?.disconnect();
  }

  /**
   * Status de la connexion DTC
   */
  get realtimeConnected(): boolean {
    return this.dtcClient?.connected || false;
  }
}

// ============================================
// EXPORT PAR DÉFAUT
// ============================================

export default SierraChartExpert;

// ============================================
// TEST AUTONOME
// ============================================

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    console.log('🚀 Test SierraChart Expert Module\n');
    
    const expert = new SierraChartExpert();
    
    // 1. Lister les symboles disponibles
    console.log('📊 Symboles avec données locales:');
    const symbols = expert.getAvailableSymbols();
    for (const sym of symbols.slice(0, 5)) {
      console.log(`   ${sym.symbol}: ${sym.localBars?.toLocaleString()} barres`);
    }
    
    // 2. Lire quelques prix
    console.log('\n💰 Derniers prix:');
    const prices = expert.getAllPrices();
    for (const [symbol, price] of Object.entries(prices).slice(0, 5)) {
      console.log(`   ${symbol}: $${price.toLocaleString()}`);
    }
    
    // 3. Test DTC
    console.log('\n📡 Test connexion DTC...');
    const connected = await expert.connectRealtime();
    console.log(`   Connecté: ${connected ? 'Oui' : 'Non'}`);
    
    if (connected) {
      // S'abonner à quelques symboles
      for (const sym of symbols.slice(0, 3)) {
        expert.subscribeRealtime(sym.symbol);
      }
      
      // Attendre un peu
      await new Promise(r => setTimeout(r, 5000));
    }
    
    expert.disconnect();
    console.log('\n🏁 Test terminé!');
  })();
}
