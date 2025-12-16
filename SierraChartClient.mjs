/**
 * SierraChart DTC Client - Version Production
 * 
 * Ce client gère correctement le protocole DTC de SierraChart:
 * - Détecte si le serveur accepte JSON automatiquement (envoie Heartbeat)
 * - Gère l'authentification et les données de marché
 */

console.log('🚀 SierraChart DTC Client v2.0\n');

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

class SierraChartClient extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.socket = null;
    this.isConnected = false;
    this.isAuthenticated = false;
    this.buffer = '';
    this.requestId = 1;
    this.symbolMap = new Map();
    this.marketData = new Map();
    this.heartbeatInterval = null;
    this.logonSent = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log(`📡 Connexion à ${this.config.host}:${this.config.port}...`);

      this.socket = new net.Socket();
      this.socket.setNoDelay(true);
      this.socket.setKeepAlive(true, 30000);
      this.socket.setEncoding('utf8');

      const timeout = setTimeout(() => {
        this.socket.destroy();
        reject(new Error('Timeout de connexion (15s)'));
      }, 15000);

      this.socket.connect(this.config.port, this.config.host, () => {
        console.log('✅ Socket TCP connecté');
        this.isConnected = true;
        
        // Envoyer EncodingRequest pour demander JSON
        this.sendEncodingRequest();
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
        if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
        }
      });

      this.once('authenticated', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.once('authFailed', (reason) => {
        clearTimeout(timeout);
        reject(new Error(reason));
      });
    });
  }

  handleData(data) {
    this.buffer += data;

    // Séparer par null byte ou newline
    let parts = this.buffer.split(/\x00/);
    this.buffer = parts.pop() || '';

    for (const part of parts) {
      if (part.trim()) {
        this.processMessage(part.trim());
      }
    }
  }

  processMessage(raw) {
    try {
      const msg = JSON.parse(raw);
      const type = msg.Type;

      switch (type) {
        case 7:  // EncodingResponse
        case 'EncodingResponse':
          this.handleEncodingResponse(msg);
          break;

        case 3:  // Heartbeat
        case 'Heartbeat':
          this.handleHeartbeat(msg);
          break;

        case 2:  // LogonResponse
        case 'LogonResponse':
          this.handleLogonResponse(msg);
          break;

        case 104: // MarketDataSnapshot
        case 'MarketDataSnapshot':
          this.handleMarketDataSnapshot(msg);
          break;

        case 107: // MarketDataUpdateTrade
        case 'MarketDataUpdateTrade':
          this.handleMarketDataTrade(msg);
          break;

        case 108: // MarketDataUpdateBidAsk  
        case 'MarketDataUpdateBidAsk':
          this.handleMarketDataBidAsk(msg);
          break;

        case 103: // MarketDataReject
        case 'MarketDataReject':
          this.handleMarketDataReject(msg);
          break;

        case 507: // SecurityDefinitionResponse
        case 'SecurityDefinitionResponse':
          this.handleSecurityDefinition(msg);
          break;

        case 701: // GeneralLogMessage
        case 'GeneralLogMessage':
          console.log(`📝 Server: ${msg.MessageText || JSON.stringify(msg)}`);
          break;

        default:
          console.log(`📋 Message Type ${type}:`, JSON.stringify(msg).substring(0, 150));
      }
    } catch (e) {
      // Ignorer les messages non-JSON
      if (raw.length > 10) {
        console.log('⚠️ Non-JSON:', raw.substring(0, 80));
      }
    }
  }

  sendEncodingRequest() {
    console.log('📤 Envoi EncodingRequest...');
    this.sendJSON({
      Type: 'EncodingRequest',
      ProtocolVersion: 8,
      Encoding: 2,  // JSON
      ProtocolType: 'DTC'
    });
  }

  handleEncodingResponse(msg) {
    console.log('✅ EncodingResponse reçu');
    this.sendLogonRequest();
  }

  handleHeartbeat(msg) {
    // Si on reçoit un Heartbeat avant le Logon, le serveur a accepté l'encodage
    if (!this.logonSent) {
      console.log('💓 Heartbeat reçu - Serveur actif, envoi Logon...');
      this.sendLogonRequest();
    } else {
      // Répondre au heartbeat
      this.sendJSON({
        Type: 'Heartbeat',
        NumDroppedMessages: 0,
        CurrentDateTime: Math.floor(Date.now() / 1000)
      });
    }
  }

  sendLogonRequest() {
    if (this.logonSent) return;
    this.logonSent = true;

    console.log('📤 Envoi LogonRequest...');
    this.sendJSON({
      Type: 'LogonRequest',
      ProtocolVersion: 8,
      Username: this.config.username,
      Password: this.config.password,
      GeneralTextData: 'NodeJS SierraChart Client',
      Integer_1: 0,
      Integer_2: 0,
      HeartbeatIntervalInSeconds: 30,
      TradeMode: 0,
      TradeAccount: '',
      HardwareIdentifier: '',
      ClientName: 'FinancialAnalyst'
    });
  }

  handleLogonResponse(msg) {
    const result = msg.Result ?? msg.ResultCode ?? -1;
    const resultText = msg.ResultText || '';
    const serverName = msg.ServerName || '';

    console.log('');
    console.log('🔐 ═══════════════════════════════════════');
    console.log(`   LOGON RESPONSE`);
    console.log('   ═══════════════════════════════════════');
    console.log(`   Result: ${result}`);
    if (resultText) console.log(`   Message: ${resultText}`);
    if (serverName) console.log(`   Serveur: ${serverName}`);
    console.log('');

    // Result = 1 signifie succès
    if (result === 1) {
      console.log('   ✅ AUTHENTIFICATION RÉUSSIE!');
      console.log('');
      this.isAuthenticated = true;
      this.startHeartbeat();
      this.emit('authenticated');
    } else if (result === 0) {
      // Parfois 0 = succès aussi
      console.log('   ✅ Connexion acceptée (Result=0)');
      this.isAuthenticated = true;
      this.startHeartbeat();
      this.emit('authenticated');
    } else {
      console.log('   ❌ AUTHENTIFICATION ÉCHOUÉE');
      console.log('');
      console.log('   Vérifiez Username/Password dans:');
      console.log('   - Fichier .env');
      console.log('   - SierraChart > File > Connect > Data > DTC Server');
      this.emit('authFailed', resultText || `Code ${result}`);
    }
  }

  startHeartbeat() {
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

    console.log(`📊 Souscription: ${symbol}`);
    
    this.sendJSON({
      Type: 'MarketDataRequest',
      RequestAction: 1,  // Subscribe
      SymbolID: symbolId,
      Symbol: symbol,
      Exchange: exchange,
      IntervalForSnapshotUpdatesInMilliseconds: 0
    });

    return symbolId;
  }

  handleMarketDataSnapshot(msg) {
    const symbolId = msg.SymbolID;
    const symbol = this.symbolMap.get(symbolId) || msg.Symbol || `ID:${symbolId}`;
    
    const data = {
      symbol,
      lastPrice: msg.LastTradePrice || 0,
      bidPrice: msg.BidPrice || 0,
      askPrice: msg.AskPrice || 0,
      volume: msg.LastTradeVolume || 0,
      high: msg.High || 0,
      low: msg.Low || 0,
      timestamp: new Date()
    };

    this.marketData.set(symbol, data);

    console.log('');
    console.log(`📈 ═══════════════════════════════════════`);
    console.log(`   ${symbol} - MARKET DATA`);
    console.log(`   ═══════════════════════════════════════`);
    if (data.lastPrice > 0) console.log(`   💰 Last:   $${data.lastPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    if (data.bidPrice > 0)  console.log(`   📗 Bid:    $${data.bidPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    if (data.askPrice > 0)  console.log(`   📕 Ask:    $${data.askPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    if (data.high > 0)      console.log(`   📈 High:   $${data.high.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    if (data.low > 0)       console.log(`   📉 Low:    $${data.low.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    if (data.volume > 0)    console.log(`   📊 Volume: ${data.volume.toLocaleString()}`);
    console.log('');

    this.emit('marketData', data);
  }

  handleMarketDataTrade(msg) {
    const symbolId = msg.SymbolID;
    const symbol = this.symbolMap.get(symbolId) || `ID:${symbolId}`;
    const price = msg.Price || 0;
    const volume = msg.Volume || 0;

    console.log(`📈 TRADE: ${symbol} @ $${price.toLocaleString()} (${volume})`);
    this.emit('trade', { symbol, price, volume });
  }

  handleMarketDataBidAsk(msg) {
    const symbolId = msg.SymbolID;
    const symbol = this.symbolMap.get(symbolId) || `ID:${symbolId}`;
    const bid = msg.BidPrice || 0;
    const ask = msg.AskPrice || 0;

    console.log(`📊 ${symbol}: Bid $${bid} / Ask $${ask}`);
    this.emit('bidask', { symbol, bid, ask });
  }

  handleMarketDataReject(msg) {
    const symbolId = msg.SymbolID;
    const symbol = this.symbolMap.get(symbolId) || `ID:${symbolId}`;
    const reason = msg.RejectText || 'Unknown';

    console.log(`❌ REJECT ${symbol}: ${reason}`);
    this.emit('reject', { symbol, reason });
  }

  handleSecurityDefinition(msg) {
    console.log(`📋 Security: ${msg.Symbol} (${msg.Exchange}) - ${msg.Description || ''}`);
  }

  sendJSON(obj) {
    const json = JSON.stringify(obj) + '\x00';
    this.socket.write(json);
  }

  getMarketData(symbol) {
    return this.marketData.get(symbol);
  }

  getAllMarketData() {
    return Object.fromEntries(this.marketData);
  }

  disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
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
  console.log(`   Username: ${sierraConfig.username ? sierraConfig.username : '(vide)'}`);
  console.log('');

  const client = new SierraChartClient(sierraConfig);

  try {
    await client.connect();
    console.log('🎉 Connexion DTC établie avec succès!\n');

    // Attendre un peu après l'auth
    await new Promise(r => setTimeout(r, 2000));

    // Souscrire aux symboles futures populaires
    const symbols = [
      { symbol: 'ESH25', name: 'E-mini S&P 500 Mar 2025' },
      { symbol: 'NQH25', name: 'E-mini Nasdaq Mar 2025' },
      { symbol: '@ES#', name: 'E-mini S&P Continuous' },
      { symbol: '@NQ#', name: 'E-mini Nasdaq Continuous' },
      { symbol: 'ES', name: 'E-mini S&P' }
    ];

    console.log('📊 Souscription aux symboles futures...\n');
    
    for (const s of symbols) {
      console.log(`   → ${s.symbol} (${s.name})`);
      client.requestMarketData(s.symbol);
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log('\n🔄 En attente des données (60 secondes)...');
    console.log('   Appuyez Ctrl+C pour arrêter\n');

    // Garder actif
    setTimeout(() => {
      console.log('\n🏁 Test terminé');
      console.log('\n📊 Résumé des données:');
      const allData = client.getAllMarketData();
      for (const [sym, data] of Object.entries(allData)) {
        console.log(`   ${sym}: $${data.lastPrice?.toLocaleString() || 'N/A'}`);
      }
      client.disconnect();
      process.exit(0);
    }, 60000);

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    
    console.log('\n🔧 Dépannage:');
    console.log('═'.repeat(50));
    console.log('');
    console.log('1. VÉRIFIER SIERRACHART:');
    console.log('   File > Connect > Data > onglet "DTC Server"');
    console.log('   ☑️ Enable DTC Server');
    console.log('   📍 Port: 11099');
    console.log('   ☑️ Allow connections from external tools');
    console.log('   Cliquer "Start"');
    console.log('');
    console.log('2. VÉRIFIER .ENV:');
    console.log('   SIERRACHART_HOST=localhost');
    console.log('   SIERRACHART_PORT=11099');
    console.log('   SIERRACHART_USERNAME=votre_username');
    console.log('   SIERRACHART_PASSWORD=votre_password');
    console.log('');
    console.log('3. TESTER LE PORT:');
    console.log('   netstat -an | findstr :11099');
    console.log('   (Doit montrer LISTENING)');
    
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt demandé');
  process.exit(0);
});

// Export pour utilisation comme module
export { SierraChartClient };
export default SierraChartClient;

main().catch(console.error);
