/**
 * SierraChart DTC Protocol - Version JSON
 * 
 * Cette version utilise le format JSON qui est plus facile à déboguer
 * et souvent plus compatible avec les nouvelles versions de SierraChart.
 */

console.log('🚀 SierraChart DTC Protocol - Format JSON\n');

import * as net from 'net';
import { config } from 'dotenv';
import { EventEmitter } from 'events';

config({ path: '.env' });

// Charger configuration depuis .env
const sierraConfig = {
  host: process.env.SIERRACHART_HOST || 'localhost',
  port: parseInt(process.env.SIERRACHART_PORT) || 11099,
  username: process.env.SIERRACHART_USERNAME || '',
  password: process.env.SIERRACHART_PASSWORD || ''
};

class SierraChartJSONClient extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.socket = null;
    this.isConnected = false;
    this.isAuthenticated = false;
    this.buffer = '';
    this.requestId = 1;
    this.symbolMap = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log(`🔌 Connexion à ${this.config.host}:${this.config.port}...`);

      this.socket = new net.Socket();
      this.socket.setNoDelay(true);
      this.socket.setKeepAlive(true, 30000);
      this.socket.setEncoding('utf8');

      const connectionTimeout = setTimeout(() => {
        this.socket.destroy();
        reject(new Error('Timeout de connexion (15s)'));
      }, 15000);

      this.socket.connect(this.config.port, this.config.host, () => {
        clearTimeout(connectionTimeout);
        console.log('✅ Socket TCP connecté');
        this.isConnected = true;
        
        // Étape 1: Demander l'encodage JSON
        this.sendEncodingRequest();
      });

      this.socket.on('data', (data) => {
        this.handleData(data);
      });

      this.socket.on('error', (error) => {
        console.error('❌ Erreur socket:', error.message);
        this.isConnected = false;
        reject(error);
      });

      this.socket.on('close', () => {
        console.log('🔌 Connexion fermée');
        this.isConnected = false;
        if (!this.isAuthenticated) {
          reject(new Error('Connexion fermée avant authentification'));
        }
      });

      this.once('authenticated', () => {
        clearTimeout(connectionTimeout);
        resolve();
      });

      this.once('authFailed', (reason) => {
        clearTimeout(connectionTimeout);
        reject(new Error(`Authentification échouée: ${reason}`));
      });
    });
  }

  handleData(data) {
    this.buffer += data;

    // Traiter les messages JSON (séparés par \n ou \x00)
    let messages = this.buffer.split(/[\n\x00]/);
    this.buffer = messages.pop() || '';

    for (const msg of messages) {
      if (msg.trim()) {
        this.processMessage(msg.trim());
      }
    }
  }

  processMessage(rawMessage) {
    try {
      // Log le message brut pour debug
      if (rawMessage.length < 500) {
        console.log('📥 RAW:', rawMessage.substring(0, 200));
      }

      const msg = JSON.parse(rawMessage);
      const type = msg.Type;

      console.log(`📨 Message Type: ${type}`);

      switch (type) {
        case 'EncodingResponse':
          this.handleEncodingResponse(msg);
          break;

        case 'LogonResponse':
          this.handleLogonResponse(msg);
          break;

        case 'Heartbeat':
          this.handleHeartbeat(msg);
          break;

        case 'MarketDataSnapshot':
        case 'MarketDataSnapshot_Int':
          this.handleMarketDataSnapshot(msg);
          break;

        case 'MarketDataUpdateTrade':
        case 'MarketDataUpdateTrade_Int':
          this.handleMarketDataTrade(msg);
          break;

        case 'MarketDataUpdateBidAsk':
        case 'MarketDataUpdateBidAsk_Int':
          this.handleMarketDataBidAsk(msg);
          break;

        case 'MarketDataReject':
          this.handleMarketDataReject(msg);
          break;

        case 'SecurityDefinitionResponse':
          this.handleSecurityDefinition(msg);
          break;

        case 'GeneralLogMessage':
          console.log(`📝 LOG: ${msg.MessageText || msg.Text || JSON.stringify(msg)}`);
          break;

        default:
          console.log(`📋 Type non géré: ${type}`, JSON.stringify(msg).substring(0, 200));
      }

    } catch (e) {
      // Si ce n'est pas du JSON, c'est peut-être du binaire
      console.log('⚠️ Message non-JSON:', rawMessage.substring(0, 100));
      this.handleBinaryFallback(rawMessage);
    }
  }

  handleBinaryFallback(data) {
    // Essayer d'interpréter comme binaire
    const buf = Buffer.from(data, 'utf8');
    if (buf.length >= 4) {
      const size = buf.readUInt16LE(0);
      const type = buf.readUInt16LE(2);
      console.log(`   Binary: Size=${size}, Type=${type}`);
    }
  }

  // Étape 1: Demander encodage JSON
  sendEncodingRequest() {
    console.log('📤 Envoi EncodingRequest (JSON)...');

    const request = {
      Type: 'EncodingRequest',
      ProtocolVersion: 8,
      Encoding: 2,  // 2 = JSON Encoding
      ProtocolType: 'DTC'
    };

    this.sendJSON(request);
  }

  handleEncodingResponse(msg) {
    console.log(`✅ EncodingResponse: Encoding=${msg.Encoding}, Version=${msg.ProtocolVersion}`);
    
    // Étape 2: Envoyer Logon
    setTimeout(() => {
      this.sendLogonRequest();
    }, 100);
  }

  sendLogonRequest() {
    console.log('📤 Envoi LogonRequest...');

    const request = {
      Type: 'LogonRequest',
      ProtocolVersion: 8,
      Username: this.config.username,
      Password: this.config.password,
      GeneralTextData: 'NodeJS DTC Client',
      Integer_1: 0,
      Integer_2: 0,
      HeartbeatIntervalInSeconds: 30,
      TradeMode: 0,  // Demo
      TradeAccount: '',
      HardwareIdentifier: '',
      ClientName: 'FinancialAnalyst'
    };

    this.sendJSON(request);
  }

  handleLogonResponse(msg) {
    const result = msg.Result || msg.ResultCode || 0;
    const resultText = msg.ResultText || msg.Text || '';
    const serverName = msg.ServerName || '';

    console.log(`🔐 LogonResponse: Result=${result}`);
    if (resultText) console.log(`   Message: ${resultText}`);
    if (serverName) console.log(`   Serveur: ${serverName}`);

    // Result: 1 = Success, 0 = Success aussi parfois
    if (result === 1 || result === 'LogonSuccess' || msg.Success === true || 
        resultText.toLowerCase().includes('success')) {
      console.log('✅ AUTHENTIFICATION RÉUSSIE!');
      this.isAuthenticated = true;
      this.emit('authenticated');
      this.startHeartbeat();
    } else {
      console.error(`❌ ÉCHEC AUTHENTIFICATION: ${resultText || result}`);
      this.emit('authFailed', resultText || `Code ${result}`);
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.isAuthenticated) {
        this.sendJSON({
          Type: 'Heartbeat',
          NumDroppedMessages: 0,
          CurrentDateTime: Date.now()
        });
      }
    }, 30000);
  }

  handleHeartbeat(msg) {
    console.log('💓 Heartbeat reçu');
  }

  // Demander données de marché
  requestMarketData(symbol, exchange = '') {
    console.log(`📊 Souscription: ${symbol}`);

    const symbolId = this.requestId++;
    this.symbolMap.set(symbolId, symbol);

    const request = {
      Type: 'MarketDataRequest',
      RequestAction: 1,  // Subscribe
      SymbolID: symbolId,
      Symbol: symbol,
      Exchange: exchange,
      IntervalForSnapshotUpdatesInMilliseconds: 0  // Real-time
    };

    this.sendJSON(request);
    return symbolId;
  }

  handleMarketDataSnapshot(msg) {
    const symbolId = msg.SymbolID;
    const symbol = this.symbolMap.get(symbolId) || `ID:${symbolId}`;
    
    const lastPrice = msg.LastTradePrice || msg.LastTradePriceInt || 0;
    const bidPrice = msg.BidPrice || msg.BidPriceInt || 0;
    const askPrice = msg.AskPrice || msg.AskPriceInt || 0;
    const volume = msg.LastTradeVolume || msg.Volume || 0;

    console.log(`\n📈 SNAPSHOT: ${symbol}`);
    if (lastPrice > 0) console.log(`   💰 Last: $${lastPrice.toLocaleString()}`);
    if (bidPrice > 0) console.log(`   📗 Bid: $${bidPrice.toLocaleString()}`);
    if (askPrice > 0) console.log(`   📕 Ask: $${askPrice.toLocaleString()}`);
    if (volume > 0) console.log(`   📊 Volume: ${volume.toLocaleString()}`);

    this.emit('marketData', { symbol, lastPrice, bidPrice, askPrice, volume });
  }

  handleMarketDataTrade(msg) {
    const symbolId = msg.SymbolID;
    const symbol = this.symbolMap.get(symbolId) || `ID:${symbolId}`;
    const price = msg.Price || msg.PriceInt || 0;
    const volume = msg.Volume || 0;

    console.log(`📈 TRADE: ${symbol} @ $${price.toLocaleString()} (Vol: ${volume})`);
  }

  handleMarketDataBidAsk(msg) {
    const symbolId = msg.SymbolID;
    const symbol = this.symbolMap.get(symbolId) || `ID:${symbolId}`;
    const bid = msg.BidPrice || 0;
    const ask = msg.AskPrice || 0;

    console.log(`📊 BID/ASK: ${symbol} - Bid: $${bid} / Ask: $${ask}`);
  }

  handleMarketDataReject(msg) {
    const symbolId = msg.SymbolID;
    const symbol = this.symbolMap.get(symbolId) || `ID:${symbolId}`;
    const reason = msg.RejectText || msg.Text || 'Unknown';

    console.error(`❌ REJECT ${symbol}: ${reason}`);
  }

  handleSecurityDefinition(msg) {
    console.log(`📋 Security: ${msg.Symbol} (${msg.Exchange}) - ${msg.Description || ''}`);
  }

  sendJSON(obj) {
    const json = JSON.stringify(obj) + '\x00';  // Null-terminated
    this.socket.write(json);
    console.log('📤 Envoyé:', obj.Type);
  }

  disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.socket && this.isConnected) {
      this.sendJSON({ Type: 'Logoff', Reason: 'Client disconnect' });
      setTimeout(() => {
        this.socket.destroy();
      }, 500);
    }
  }
}

// ==================== MAIN ====================

async function main() {
  console.log('📋 Configuration:');
  console.log(`   Host: ${sierraConfig.host}`);
  console.log(`   Port: ${sierraConfig.port}`);
  console.log(`   Username: ${sierraConfig.username ? '***' : '(vide)'}`);
  console.log('');

  const client = new SierraChartJSONClient(sierraConfig);

  try {
    await client.connect();
    console.log('\n✅ Connexion établie!\n');

    client.on('marketData', (data) => {
      console.log('📊 Event marketData:', data);
    });

    // Souscrire à quelques symboles
    console.log('📊 Souscription aux symboles...\n');
    
    const symbols = [
      'ES',      // E-mini S&P 500
      '@ES#',    // E-mini S&P continuous 
      'ESZ24',   // E-mini S&P Dec 2024
      'NQ',      // E-mini Nasdaq
      '@NQ#',    // E-mini Nasdaq continuous
    ];

    for (const sym of symbols) {
      client.requestMarketData(sym);
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log('\n🔄 En attente des données (90 secondes)...');
    console.log('   Ctrl+C pour arrêter\n');

    setTimeout(() => {
      console.log('\n🏁 Test terminé');
      client.disconnect();
      process.exit(0);
    }, 90000);

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    
    console.log('\n🔧 Vérifications SierraChart:');
    console.log('');
    console.log('1. File > Connect > Data > onglet "DTC Server"');
    console.log('2. Vérifier:');
    console.log('   ☑️  Enable DTC Server');
    console.log('   📍 Port: 11099');
    console.log('   ☑️  Allow connections from external tools');
    console.log('   ☑️  JSON Encoding (si disponible)');
    console.log('');
    console.log('3. Credentials dans .env:');
    console.log('   SIERRACHART_USERNAME=votre_user');
    console.log('   SIERRACHART_PASSWORD=votre_pass');
    console.log('');
    console.log('4. Cliquer "Start" et vérifier que le statut passe à "Stop"');
    
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt');
  process.exit(0);
});

main().catch(console.error);
