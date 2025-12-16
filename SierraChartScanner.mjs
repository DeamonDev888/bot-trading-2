/**
 * SierraChart Scanner - Explore toutes les possibilités disponibles
 * 
 * Ce script scanne:
 * - Échanges disponibles
 * - Symboles/Indices
 * - Données de marché
 * - Capacités du serveur
 */

console.log('🔍 SIERRACHART SCANNER - Exploration des possibilités\n');
console.log('═'.repeat(60));

import * as net from 'net';
import * as fs from 'fs';
import { config } from 'dotenv';
import { EventEmitter } from 'events';

config({ path: '.env' });

const sierraConfig = {
  host: process.env.SIERRACHART_HOST || 'localhost',
  port: parseInt(process.env.SIERRACHART_PORT) || 11099,
  username: process.env.SIERRACHART_USERNAME || '',
  password: process.env.SIERRACHART_PASSWORD || ''
};

// Symboles populaires à tester (gratuits et payants)
const SYMBOLS_TO_TEST = {
  // === INDICES MAJEURS (souvent gratuits en démo) ===
  indices_us: [
    { symbol: 'ES', exchange: 'CME', name: 'E-mini S&P 500' },
    { symbol: '@ES#', exchange: 'CME', name: 'E-mini S&P Continuous' },
    { symbol: 'ESH25', exchange: 'CME', name: 'E-mini S&P Mar 2025' },
    { symbol: 'ESZ24', exchange: 'CME', name: 'E-mini S&P Dec 2024' },
    { symbol: 'NQ', exchange: 'CME', name: 'E-mini Nasdaq 100' },
    { symbol: '@NQ#', exchange: 'CME', name: 'E-mini Nasdaq Continuous' },
    { symbol: 'NQH25', exchange: 'CME', name: 'E-mini Nasdaq Mar 2025' },
    { symbol: 'YM', exchange: 'CBOT', name: 'Mini Dow Jones' },
    { symbol: '@YM#', exchange: 'CBOT', name: 'Mini Dow Continuous' },
    { symbol: 'RTY', exchange: 'CME', name: 'E-mini Russell 2000' },
  ],
  
  // === INDICES VIX & VOLATILITÉ ===
  volatility: [
    { symbol: 'VIX', exchange: 'CBOE', name: 'VIX Index' },
    { symbol: '$VIX', exchange: 'CBOE', name: 'VIX Cash' },
    { symbol: 'VX', exchange: 'CFE', name: 'VIX Futures' },
    { symbol: '@VX#', exchange: 'CFE', name: 'VIX Continuous' },
    { symbol: 'VXH25', exchange: 'CFE', name: 'VIX Mar 2025' },
  ],
  
  // === MATIÈRES PREMIÈRES ===
  commodities: [
    { symbol: 'GC', exchange: 'COMEX', name: 'Gold Futures' },
    { symbol: '@GC#', exchange: 'COMEX', name: 'Gold Continuous' },
    { symbol: 'SI', exchange: 'COMEX', name: 'Silver Futures' },
    { symbol: 'CL', exchange: 'NYMEX', name: 'Crude Oil' },
    { symbol: '@CL#', exchange: 'NYMEX', name: 'Crude Oil Continuous' },
    { symbol: 'NG', exchange: 'NYMEX', name: 'Natural Gas' },
  ],
  
  // === DEVISES / FOREX ===
  forex: [
    { symbol: '6E', exchange: 'CME', name: 'Euro FX Futures' },
    { symbol: '@6E#', exchange: 'CME', name: 'Euro FX Continuous' },
    { symbol: '6B', exchange: 'CME', name: 'British Pound' },
    { symbol: '6J', exchange: 'CME', name: 'Japanese Yen' },
    { symbol: 'EURUSD', exchange: '', name: 'EUR/USD Spot' },
    { symbol: 'GBPUSD', exchange: '', name: 'GBP/USD Spot' },
  ],
  
  // === CRYPTO ===
  crypto: [
    { symbol: 'BTC', exchange: 'CME', name: 'Bitcoin Futures' },
    { symbol: '@BTC#', exchange: 'CME', name: 'Bitcoin Continuous' },
    { symbol: 'MBT', exchange: 'CME', name: 'Micro Bitcoin' },
    { symbol: 'ETH', exchange: 'CME', name: 'Ethereum Futures' },
    { symbol: 'BTCUSD', exchange: '', name: 'Bitcoin USD' },
  ],
  
  // === TAUX D'INTÉRÊT ===
  rates: [
    { symbol: 'ZN', exchange: 'CBOT', name: '10-Year T-Note' },
    { symbol: '@ZN#', exchange: 'CBOT', name: '10-Year Continuous' },
    { symbol: 'ZB', exchange: 'CBOT', name: '30-Year T-Bond' },
    { symbol: 'ZF', exchange: 'CBOT', name: '5-Year T-Note' },
    { symbol: 'ZQ', exchange: 'CBOT', name: '30-Day Fed Funds' },
  ],
  
  // === MICRO FUTURES (Accessibles avec moins de capital) ===
  micro: [
    { symbol: 'MES', exchange: 'CME', name: 'Micro E-mini S&P' },
    { symbol: '@MES#', exchange: 'CME', name: 'Micro S&P Continuous' },
    { symbol: 'MNQ', exchange: 'CME', name: 'Micro E-mini Nasdaq' },
    { symbol: 'MYM', exchange: 'CBOT', name: 'Micro Mini Dow' },
    { symbol: 'M2K', exchange: 'CME', name: 'Micro Russell 2000' },
    { symbol: 'MGC', exchange: 'COMEX', name: 'Micro Gold' },
    { symbol: 'MCL', exchange: 'NYMEX', name: 'Micro Crude Oil' },
  ]
};

// DTC Message Types pour explorer
const DTC_REQUESTS = {
  EXCHANGE_LIST_REQUEST: 500,
  EXCHANGE_LIST_RESPONSE: 501,
  SYMBOLS_FOR_EXCHANGE_REQUEST: 502,
  SYMBOLS_FOR_EXCHANGE_RESPONSE: 503,
  SECURITY_DEFINITION_FOR_SYMBOL_REQUEST: 506,
  SECURITY_DEFINITION_RESPONSE: 507,
  ACCOUNT_BALANCE_REQUEST: 601,
};

class SierraChartScanner extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.socket = null;
    this.isConnected = false;
    this.isReady = false;
    this.buffer = '';
    this.requestId = 1;
    this.heartbeatCount = 0;
    
    // Résultats du scan
    this.results = {
      serverInfo: {},
      exchanges: [],
      availableSymbols: [],
      rejectedSymbols: [],
      marketData: {},
      capabilities: {},
      scanTime: new Date().toISOString()
    };
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log(`📡 Connexion à ${this.config.host}:${this.config.port}...`);

      this.socket = new net.Socket();
      this.socket.setNoDelay(true);
      this.socket.setEncoding('utf8');

      const timeout = setTimeout(() => {
        if (!this.isReady) {
          this.socket.destroy();
          reject(new Error('Timeout connexion'));
        }
      }, 15000);

      this.socket.connect(this.config.port, this.config.host, () => {
        console.log('✅ Connecté au serveur DTC');
        this.isConnected = true;
        this.sendJSON({ Type: 'EncodingRequest', ProtocolVersion: 8, Encoding: 2, ProtocolType: 'DTC' });
      });

      this.socket.on('data', (data) => this.handleData(data));
      this.socket.on('error', (e) => { clearTimeout(timeout); reject(e); });
      this.socket.on('close', () => { this.isConnected = false; });

      this.once('ready', () => { clearTimeout(timeout); resolve(); });
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
          this.handleLogonResponse(msg);
          break;

        case 'ExchangeListResponse':
        case 501:
          this.handleExchangeList(msg);
          break;

        case 'SecurityDefinitionResponse':
        case 507:
          this.handleSecurityDefinition(msg);
          break;

        case 'MarketDataSnapshot':
        case 104:
          this.handleMarketData(msg);
          break;

        case 'MarketDataReject':
        case 103:
          this.handleReject(msg);
          break;

        default:
          if (type !== 'Heartbeat' && type !== 3) {
            console.log(`📨 ${type}:`, JSON.stringify(msg).substring(0, 100));
          }
      }
    } catch(e) {}
  }

  handleHeartbeat() {
    this.heartbeatCount++;
    
    if (this.heartbeatCount === 1) {
      console.log('💓 Premier Heartbeat - Serveur actif');
      this.sendJSON({
        Type: 'LogonRequest',
        ProtocolVersion: 8,
        Username: this.config.username,
        Password: this.config.password,
        GeneralTextData: 'SierraChart Scanner',
        HeartbeatIntervalInSeconds: 30
      });
      console.log('📤 LogonRequest envoyé');
      
      // Considérer ready après le premier heartbeat + petit délai
      setTimeout(() => {
        if (!this.isReady) {
          console.log('✅ Connexion établie (pas de LogonResponse explicite)');
          this.isReady = true;
          this.emit('ready');
        }
      }, 2000);
    }
    
    this.sendJSON({ Type: 'Heartbeat', NumDroppedMessages: 0, CurrentDateTime: Math.floor(Date.now()/1000) });
  }

  handleLogonResponse(msg) {
    console.log(`🔐 LogonResponse: ${msg.Result === 1 ? 'SUCCESS' : 'Code ' + msg.Result}`);
    
    this.results.serverInfo = {
      result: msg.Result,
      serverName: msg.ServerName || 'N/A',
      resultText: msg.ResultText || '',
      marketDataSupported: msg.MarketDataSupported,
      tradingSupported: msg.TradingIsSupported,
      historicalDataSupported: msg.HistoricalPriceDataSupported,
      securityDefinitionsSupported: msg.SecurityDefinitionsSupported,
      symbolExchangeDelimiter: msg.SymbolExchangeDelimiter
    };

    this.results.capabilities = {
      marketData: msg.MarketDataSupported,
      trading: msg.TradingIsSupported,
      historicalData: msg.HistoricalPriceDataSupported,
      securityDefinitions: msg.SecurityDefinitionsSupported,
      marketDepth: msg.MarketDepthIsSupported,
      bracketOrders: msg.BracketOrdersSupported,
      ocoOrders: msg.OCOOrdersSupported
    };

    if (msg.Result === 1) {
      this.isReady = true;
      this.emit('ready');
    }
  }

  handleExchangeList(msg) {
    if (msg.Exchange) {
      this.results.exchanges.push({
        exchange: msg.Exchange,
        description: msg.Description || ''
      });
      console.log(`   📍 ${msg.Exchange}: ${msg.Description || ''}`);
    }
  }

  handleSecurityDefinition(msg) {
    console.log(`📋 Security: ${msg.Symbol} (${msg.Exchange}) - ${msg.Description || 'N/A'}`);
    
    this.results.availableSymbols.push({
      symbol: msg.Symbol,
      exchange: msg.Exchange,
      description: msg.Description,
      securityType: msg.SecurityType,
      minPriceIncrement: msg.MinPriceIncrement,
      currency: msg.Currency,
      contractSize: msg.ContractSize,
      expirationDate: msg.ContractExpirationDate
    });
  }

  handleMarketData(msg) {
    const symbol = msg.Symbol || `ID:${msg.SymbolID}`;
    
    this.results.marketData[symbol] = {
      lastPrice: msg.LastTradePrice || 0,
      bidPrice: msg.BidPrice || 0,
      askPrice: msg.AskPrice || 0,
      volume: msg.LastTradeVolume || 0,
      timestamp: new Date().toISOString()
    };

    console.log(`✅ ${symbol}: $${(msg.LastTradePrice || 0).toLocaleString()}`);
  }

  handleReject(msg) {
    const symbolId = msg.SymbolID;
    const reason = msg.RejectText || 'Unknown';
    
    this.results.rejectedSymbols.push({
      symbolId,
      reason,
      timestamp: new Date().toISOString()
    });

    // Ne pas afficher chaque reject, juste compter
  }

  sendJSON(obj) {
    if (this.socket && this.isConnected) {
      this.socket.write(JSON.stringify(obj) + '\x00');
    }
  }

  // === MÉTHODES DE SCAN ===

  async requestExchangeList() {
    console.log('\n📋 Demande liste des échanges...');
    this.sendJSON({
      Type: 'ExchangeListRequest',
      RequestID: this.requestId++
    });
    await this.wait(2000);
  }

  async requestSecurityDefinition(symbol, exchange = '') {
    this.sendJSON({
      Type: 'SecurityDefinitionForSymbolRequest',
      RequestID: this.requestId++,
      Symbol: symbol,
      Exchange: exchange
    });
  }

  async requestMarketData(symbol, exchange = '') {
    const symbolId = this.requestId++;
    this.sendJSON({
      Type: 'MarketDataRequest',
      RequestAction: 1,
      SymbolID: symbolId,
      Symbol: symbol,
      Exchange: exchange
    });
    return symbolId;
  }

  async scanSymbolCategory(categoryName, symbols) {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`📊 SCAN: ${categoryName.toUpperCase()}`);
    console.log('═'.repeat(50));

    const available = [];
    const rejected = [];

    for (const sym of symbols) {
      process.stdout.write(`   Testing ${sym.symbol}... `);
      
      const startCount = Object.keys(this.results.marketData).length;
      await this.requestMarketData(sym.symbol, sym.exchange);
      await this.wait(800);
      
      const endCount = Object.keys(this.results.marketData).length;
      
      if (endCount > startCount || this.results.marketData[sym.symbol]) {
        console.log(`✅ Disponible!`);
        available.push(sym);
      } else {
        console.log(`❌ Non disponible`);
        rejected.push(sym);
      }
    }

    return { available, rejected };
  }

  wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  async runFullScan() {
    console.log('\n🔍 DÉMARRAGE DU SCAN COMPLET...\n');

    // 1. Infos serveur
    console.log('═'.repeat(50));
    console.log('📡 INFORMATIONS SERVEUR');
    console.log('═'.repeat(50));
    console.log(`   Serveur: ${this.results.serverInfo.serverName || 'N/A'}`);
    console.log(`   MarketData: ${this.results.capabilities.marketData ? '✅' : '❌'}`);
    console.log(`   Trading: ${this.results.capabilities.trading ? '✅' : '❌'}`);
    console.log(`   Historical: ${this.results.capabilities.historicalData ? '✅' : '❌'}`);
    console.log(`   MarketDepth: ${this.results.capabilities.marketDepth ? '✅' : '❌'}`);

    // 2. Demander liste des exchanges
    await this.requestExchangeList();

    // 3. Scanner chaque catégorie
    const scanResults = {};

    for (const [category, symbols] of Object.entries(SYMBOLS_TO_TEST)) {
      scanResults[category] = await this.scanSymbolCategory(category, symbols);
      await this.wait(1000);
    }

    // 4. Générer rapport
    this.generateReport(scanResults);

    return this.results;
  }

  generateReport(scanResults) {
    console.log('\n\n');
    console.log('╔'.padEnd(60, '═') + '╗');
    console.log('║' + '  RAPPORT DE SCAN SIERRACHART  '.padStart(35).padEnd(59) + '║');
    console.log('╚'.padEnd(60, '═') + '╝');
    console.log('');
    
    console.log(`📅 Date: ${new Date().toLocaleString()}`);
    console.log(`📡 Serveur: ${this.results.serverInfo.serverName || 'SierraChart DTC'}`);
    console.log('');

    // Résumé par catégorie
    console.log('📊 SYMBOLES DISPONIBLES PAR CATÉGORIE:');
    console.log('─'.repeat(50));

    let totalAvailable = 0;
    let totalTested = 0;

    for (const [category, result] of Object.entries(scanResults)) {
      const available = result.available.length;
      const total = result.available.length + result.rejected.length;
      totalAvailable += available;
      totalTested += total;

      const categoryName = category.replace('_', ' ').toUpperCase();
      const bar = '█'.repeat(Math.round(available / total * 20)) + '░'.repeat(20 - Math.round(available / total * 20));
      
      console.log(`\n   ${categoryName}:`);
      console.log(`   ${bar} ${available}/${total}`);
      
      if (result.available.length > 0) {
        console.log(`   ✅ Disponibles: ${result.available.map(s => s.symbol).join(', ')}`);
      }
    }

    console.log('\n');
    console.log('═'.repeat(50));
    console.log(`📈 TOTAL: ${totalAvailable}/${totalTested} symboles disponibles`);
    console.log('═'.repeat(50));

    // Données de marché reçues
    const marketDataKeys = Object.keys(this.results.marketData);
    if (marketDataKeys.length > 0) {
      console.log('\n💰 DONNÉES DE MARCHÉ EN TEMPS RÉEL:');
      console.log('─'.repeat(50));
      
      for (const [symbol, data] of Object.entries(this.results.marketData)) {
        if (data.lastPrice > 0) {
          console.log(`   ${symbol.padEnd(12)} : $${data.lastPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        }
      }
    }

    // Sauvegarder le rapport
    const reportPath = 'logs/sierrachart_scan_report.json';
    try {
      fs.mkdirSync('logs', { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify({
        ...this.results,
        scanResults,
        summary: {
          totalAvailable,
          totalTested,
          percentAvailable: ((totalAvailable / totalTested) * 100).toFixed(1) + '%'
        }
      }, null, 2));
      console.log(`\n📄 Rapport sauvegardé: ${reportPath}`);
    } catch(e) {
      console.log('\n⚠️ Impossible de sauvegarder le rapport');
    }

    // Recommandations
    console.log('\n');
    console.log('💡 RECOMMANDATIONS:');
    console.log('─'.repeat(50));
    console.log('   1. Pour avoir plus de symboles, configurez un data feed dans SierraChart');
    console.log('   2. Ouvrez les charts des symboles que vous voulez streamer');
    console.log('   3. Les Micro futures (MES, MNQ) sont accessibles avec moins de capital');
    console.log('   4. Le VIX nécessite généralement un abonnement CBOE');
    console.log('');
  }

  disconnect() {
    if (this.socket) {
      this.sendJSON({ Type: 'Logoff' });
      setTimeout(() => this.socket.destroy(), 500);
    }
  }
}

// ==================== MAIN ====================

async function main() {
  console.log(`📋 Configuration: ${sierraConfig.host}:${sierraConfig.port}`);
  console.log(`👤 Username: ${sierraConfig.username}`);
  console.log('');

  const scanner = new SierraChartScanner(sierraConfig);

  try {
    await scanner.connect();
    console.log('✅ Connexion établie!\n');

    // Attendre que le serveur soit prêt
    await scanner.wait(3000);

    // Lancer le scan complet
    await scanner.runFullScan();

    console.log('\n🏁 Scan terminé!');
    scanner.disconnect();
    
    // Attendre un peu avant de quitter
    await scanner.wait(2000);
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.log('\n🔧 Vérifiez que SierraChart est ouvert avec DTC Server activé');
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt');
  process.exit(0);
});

main().catch(console.error);
