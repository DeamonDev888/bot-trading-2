/**
 * SierraChart DTC Client - Version Finale
 * 
 * Ce client gère le cas où SierraChart n'envoie pas de LogonResponse explicite
 * mais accepte la connexion via Heartbeats.
 */

console.log('🚀 SierraChart DTC Client - Final Version\n');

import * as net from 'net';
import { config } from 'dotenv';
import { EventEmitter } from 'events';

config({ path: '.env' });

const sierraConfig = {
  host: process.env.SIERRACHART_HOST || 'localhost',
  port: parseInt(process.env.SIERRACHART_PORT) || 11099,
  username: process.env.SIERRACHART_USERNAME || '',
  password: process.env.SIERRACHART_PASSWORD || ''
};

class SierraChartDTCFinal extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.socket = null;
    this.isConnected = false;
    this.isReady = false;  // Prêt à recevoir des données
    this.buffer = '';
    this.requestId = 1;
    this.symbolMap = new Map();
    this.marketData = new Map();
    this.heartbeatInterval = null;
    this.heartbeatCount = 0;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log(`📡 Connexion à ${this.config.host}:${this.config.port}...`);

      this.socket = new net.Socket();
      this.socket.setNoDelay(true);
      this.socket.setKeepAlive(true, 30000);
      this.socket.setEncoding('utf8');

      const timeout = setTimeout(() => {
        if (!this.isReady) {
          this.socket.destroy();
          reject(new Error('Timeout (15s)'));
        }
      }, 15000);

      this.socket.connect(this.config.port, this.config.host, () => {
        console.log('✅ Socket TCP connecté');
        this.isConnected = true;
        
        // Envoyer EncodingRequest JSON
        this.sendJSON({
          Type: 'EncodingRequest',
          ProtocolVersion: 8,
          Encoding: 2,
          ProtocolType: 'DTC'
        });
        console.log('📤 EncodingRequest envoyé');
      });

      this.socket.on('data', (data) => {
        this.handleData(data);
      });

      this.socket.on('error', (error) => {
        clearTimeout(timeout);
        console.error('❌ Erreur socket:', error.message);
        reject(error);
      });

      this.socket.on('close', () => {
        console.log('🔌 Connexion fermée');
        this.isConnected = false;
        this.isReady = false;
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      });

      // Considérer connecté après le premier Heartbeat reçu
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

    for (const part of parts) {
      if (part.trim()) this.processMessage(part.trim());
    }
  }

  processMessage(raw) {
    try {
      const msg = JSON.parse(raw);
      const type = msg.Type;

      // Debug
      if (type !== 'Heartbeat' && type !== 3) {
        console.log(`📨 ${type}:`, JSON.stringify(msg).substring(0, 150));
      }

      switch (type) {
        case 'EncodingResponse':
        case 7:
          console.log('✅ EncodingResponse - Envoi LogonRequest...');
          this.sendLogonRequest();
          break;

        case 'Heartbeat':
        case 3:
          this.handleHeartbeat(msg);
          break;

        case 'LogonResponse':
        case 2:
          this.handleLogonResponse(msg);
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
          console.log(`❌ Reject SymbolID ${msg.SymbolID}: ${msg.RejectText || 'Unknown'}`);
          break;

        case 'SecurityDefinitionResponse':
        case 507:
          this.handleSecurityDefinition(msg);
          break;

        default:
          // Ignorer les autres types
          break;
      }
    } catch(e) {
      // Message non-JSON ignoré
    }
  }

  sendLogonRequest() {
    this.sendJSON({
      Type: 'LogonRequest',
      ProtocolVersion: 8,
      Username: this.config.username,
      Password: this.config.password,
      GeneralTextData: 'NodeJS SierraChart Client v1.0',
      Integer_1: 0,
      Integer_2: 0,
      HeartbeatIntervalInSeconds: 30,
      TradeMode: 0,
      TradeAccount: '',
      HardwareIdentifier: '',
      ClientName: 'FinancialAnalyst'
    });
    console.log('📤 LogonRequest envoyé');
  }

  handleHeartbeat(msg) {
    this.heartbeatCount++;
    
    // Après le 1er heartbeat, considérer que la connexion est établie
    if (this.heartbeatCount === 1) {
      console.log('💓 Premier Heartbeat reçu - Connexion acceptée!');
      
      // Envoyer LogonRequest si pas encore fait suite à EncodingResponse
      this.sendLogonRequest();
      
      // Démarrer notre heartbeat
      this.startHeartbeat();
    }
    
    // Après 2 heartbeats (3 secondes), considérer prêt
    if (this.heartbeatCount === 2 && !this.isReady) {
      console.log('✅ Connexion établie et stable');
      this.isReady = true;
      this.emit('ready');
    }
    
    // Répondre au heartbeat
    this.sendJSON({
      Type: 'Heartbeat',
      NumDroppedMessages: 0,
      CurrentDateTime: Math.floor(Date.now() / 1000)
    });
  }

  handleLogonResponse(msg) {
    const result = msg.Result || msg.ResultCode || 0;
    console.log(`🔐 LogonResponse: Result=${result}, Server=${msg.ServerName || 'N/A'}`);
    
    if (result === 1 || result === 0) {
      console.log('✅ Authentification confirmée!');
      this.isReady = true;
      this.emit('ready');
    } else {
      console.log(`❌ Échec auth: ${msg.ResultText || 'Code ' + result}`);
    }
  }

  startHeartbeat() {
    if (this.heartbeatInterval) return;
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendJSON({
          Type: 'Heartbeat',
          NumDroppedMessages: 0,
          CurrentDateTime: Math.floor(Date.now() / 1000)
        });
      }
    }, 30000);
  }

  requestMarketData(symbol, exchange = '') {
    const symbolId = this.requestId++;
    this.symbolMap.set(symbolId, symbol);

    this.sendJSON({
      Type: 'MarketDataRequest',
      RequestAction: 1,  // Subscribe
      SymbolID: symbolId,
      Symbol: symbol,
      Exchange: exchange,
      IntervalForSnapshotUpdatesInMilliseconds: 0
    });

    console.log(`📊 Souscription #${symbolId}: ${symbol}`);
    return symbolId;
  }

  handleMarketData(msg) {
    const symbolId = msg.SymbolID;
    const symbol = this.symbolMap.get(symbolId) || msg.Symbol || `ID:${symbolId}`;
    
    const data = {
      symbol,
      lastPrice: msg.LastTradePrice || 0,
      bidPrice: msg.BidPrice || 0,
      askPrice: msg.AskPrice || 0,
      volume: msg.LastTradeVolume || msg.Volume || 0,
      high: msg.SessionHighPrice || msg.High || 0,
      low: msg.SessionLowPrice || msg.Low || 0,
      open: msg.SessionOpenPrice || msg.Open || 0,
      timestamp: new Date()
    };

    this.marketData.set(symbol, data);
    
    console.log('');
    console.log(`📈 ${symbol} ════════════════════════`);
    if (data.lastPrice > 0) console.log(`   💰 Last:  $${this.formatPrice(data.lastPrice)}`);
    if (data.bidPrice > 0)  console.log(`   📗 Bid:   $${this.formatPrice(data.bidPrice)}`);
    if (data.askPrice > 0)  console.log(`   📕 Ask:   $${this.formatPrice(data.askPrice)}`);
    if (data.high > 0)      console.log(`   📈 High:  $${this.formatPrice(data.high)}`);
    if (data.low > 0)       console.log(`   📉 Low:   $${this.formatPrice(data.low)}`);

    this.emit('marketData', data);
  }

  handleTrade(msg) {
    const symbol = this.symbolMap.get(msg.SymbolID) || `ID:${msg.SymbolID}`;
    const price = msg.Price || 0;
    const volume = msg.Volume || 0;
    console.log(`📈 TRADE ${symbol}: $${this.formatPrice(price)} x${volume}`);
  }

  handleBidAsk(msg) {
    const symbol = this.symbolMap.get(msg.SymbolID) || `ID:${msg.SymbolID}`;
    const bid = msg.BidPrice || 0;
    const ask = msg.AskPrice || 0;
    console.log(`📊 ${symbol}: Bid $${this.formatPrice(bid)} / Ask $${this.formatPrice(ask)}`);
    
    // Mettre à jour marketData
    const existing = this.marketData.get(symbol) || { symbol };
    existing.bidPrice = bid;
    existing.askPrice = ask;
    existing.timestamp = new Date();
    this.marketData.set(symbol, existing);
  }

  handleSecurityDefinition(msg) {
    console.log(`📋 Security: ${msg.Symbol} - ${msg.Description || ''}`);
  }

  formatPrice(price) {
    if (typeof price !== 'number' || isNaN(price)) return 'N/A';
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  sendJSON(obj) {
    if (!this.socket || !this.isConnected) return;
    this.socket.write(JSON.stringify(obj) + '\x00');
  }

  getMarketData(symbol) {
    return this.marketData.get(symbol);
  }

  getAllMarketData() {
    return Object.fromEntries(this.marketData);
  }

  disconnect() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.socket && this.isConnected) {
      this.sendJSON({ Type: 'Logoff', Reason: 'Client disconnect' });
      setTimeout(() => this.socket.destroy(), 500);
    }
  }
}

// ==================== MAIN ====================

async function main() {
  console.log('📋 Configuration:');
  console.log(`   Host: ${sierraConfig.host}`);
  console.log(`   Port: ${sierraConfig.port}`);
  console.log(`   Username: ${sierraConfig.username}`);
  console.log('');

  const client = new SierraChartDTCFinal(sierraConfig);

  client.on('marketData', (data) => {
    // Event handler
  });

  try {
    await client.connect();
    console.log('\n🎉 CONNEXION DTC RÉUSSIE!\n');

    // Attendre un peu
    await new Promise(r => setTimeout(r, 2000));

    // Symboles à surveiller
    const symbols = [
      '@ES#',   // E-mini S&P continuous
      '@NQ#',   // E-mini Nasdaq continuous
      'ESH25',  // E-mini S&P Mar 2025
      'NQH25',  // E-mini Nasdaq Mar 2025
      'YMH25',  // Mini Dow Mar 2025
      'GCG25',  // Gold Feb 2025
      'CLG25',  // Crude Oil Feb 2025
    ];

    console.log('📊 Souscription aux symboles futures:');
    for (const sym of symbols) {
      client.requestMarketData(sym);
      await new Promise(r => setTimeout(r, 500));
    }

    console.log('\n🔄 En attente des données (60 secondes)...');
    console.log('   Appuyez Ctrl+C pour arrêter\n');

    setTimeout(() => {
      console.log('\n' + '═'.repeat(50));
      console.log('🏁 RÉSUMÉ DES DONNÉES');
      console.log('═'.repeat(50));
      
      const allData = client.getAllMarketData();
      for (const [sym, data] of Object.entries(allData)) {
        console.log(`   ${sym.padEnd(8)} : $${client.formatPrice(data.lastPrice)} (Bid: $${client.formatPrice(data.bidPrice)} / Ask: $${client.formatPrice(data.askPrice)})`);
      }
      
      console.log('\n✅ Test terminé avec succès!');
      client.disconnect();
      process.exit(0);
    }, 60000);

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.log('\n🔧 Vérifiez:');
    console.log('   1. SierraChart > File > Connect > Data > DTC Server');
    console.log('   2. "Enable DTC Server" doit être coché');
    console.log('   3. Port 11099 et cliquer "Start"');
    console.log('   4. netstat -an | findstr :11099 (doit montrer LISTENING)');
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt');
  process.exit(0);
});

export { SierraChartDTCFinal };
export default SierraChartDTCFinal;

main().catch(console.error);