/**
 * SierraChart DTC Protocol Implementation - Version Corrigée
 * 
 * Ce script implémente correctement le protocole DTC (Data Trading Communication)
 * selon la spécification officielle de SierraChart.
 * 
 * La séquence correcte est:
 * 1. ENCODING_REQUEST (Type 6) - Négocier le format d'encodage
 * 2. ENCODING_RESPONSE (Type 7) - Recevoir confirmation
 * 3. LOGON_REQUEST (Type 1) - S'authentifier
 * 4. LOGON_RESPONSE (Type 2) - Recevoir confirmation auth
 * 5. MARKET_DATA_REQUEST (Type 101) - Demander les données
 */

console.log('🚀 SierraChart DTC Protocol - Version Corrigée\n');

import * as net from 'net';
import { config } from 'dotenv';
import { EventEmitter } from 'events';

config({ path: '.env' });

// Types de messages DTC selon la spec officielle
const DTC_MESSAGE_TYPE = {
  // Session
  LOGON_REQUEST: 1,
  LOGON_RESPONSE: 2,
  HEARTBEAT: 3,
  LOGOFF: 5,
  ENCODING_REQUEST: 6,
  ENCODING_RESPONSE: 7,
  
  // Market Data
  MARKET_DATA_REQUEST: 101,
  MARKET_DATA_REJECT: 103,
  MARKET_DATA_SNAPSHOT: 104,
  MARKET_DATA_UPDATE_TRADE: 107,
  MARKET_DATA_UPDATE_BID_ASK: 108,
  
  // Security Definition
  SECURITY_DEFINITION_FOR_SYMBOL_REQUEST: 506,
  SECURITY_DEFINITION_RESPONSE: 507,
  
  // Errors
  GENERAL_LOG_MESSAGE: 701
};

// Types d'encodage DTC
const ENCODING_TYPE = {
  BINARY_ENCODING: 0,
  BINARY_WITH_VARIABLE_LENGTH_STRINGS: 1,
  JSON_ENCODING: 2,
  JSON_COMPACT_ENCODING: 3,
  PROTOCOL_BUFFERS: 4
};

// Charger configuration depuis .env
const sierraConfig = {
  host: process.env.SIERRACHART_HOST || 'localhost',
  port: parseInt(process.env.SIERRACHART_PORT) || 11099,
  username: process.env.SIERRACHART_USERNAME || '',
  password: process.env.SIERRACHART_PASSWORD || ''
};

class SierraChartDTCClient extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.socket = null;
    this.isConnected = false;
    this.isAuthenticated = false;
    this.encoding = ENCODING_TYPE.BINARY_ENCODING;
    this.buffer = Buffer.alloc(0);
    this.requestId = 1;
    this.subscriptions = new Map();
  }

  /**
   * Connexion au serveur DTC
   */
  async connect() {
    return new Promise((resolve, reject) => {
      console.log(`🔌 Connexion à ${this.config.host}:${this.config.port}...`);

      this.socket = new net.Socket();
      this.socket.setNoDelay(true);
      this.socket.setKeepAlive(true, 30000);

      // Timeout de connexion
      const connectionTimeout = setTimeout(() => {
        this.socket.destroy();
        reject(new Error('Timeout de connexion (10s)'));
      }, 10000);

      this.socket.connect(this.config.port, this.config.host, () => {
        clearTimeout(connectionTimeout);
        console.log('✅ Socket TCP connecté');
        this.isConnected = true;
        
        // Étape 1: Envoyer ENCODING_REQUEST
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
        this.isAuthenticated = false;
        
        if (!this.isAuthenticated) {
          reject(new Error('Connexion fermée avant authentification'));
        }
      });

      // Attendre l'authentification réussie
      this.once('authenticated', () => {
        resolve();
      });

      this.once('authFailed', (reason) => {
        reject(new Error(`Authentification échouée: ${reason}`));
      });
    });
  }

  /**
   * Gestion des données reçues avec buffering
   */
  handleData(data) {
    // Accumuler les données
    this.buffer = Buffer.concat([this.buffer, data]);

    // Traiter tous les messages complets
    while (this.buffer.length >= 4) {
      // Lire la taille du message (bytes 0-1)
      const messageSize = this.buffer.readUInt16LE(0);
      
      // Vérifier si on a assez de données
      if (this.buffer.length < messageSize) {
        break; // Attendre plus de données
      }

      // Extraire le message complet
      const message = this.buffer.slice(0, messageSize);
      this.buffer = this.buffer.slice(messageSize);

      // Traiter le message
      this.processMessage(message);
    }
  }

  /**
   * Traitement d'un message DTC complet
   */
  processMessage(data) {
    if (data.length < 4) {
      console.warn('⚠️ Message trop court:', data.length);
      return;
    }

    const messageSize = data.readUInt16LE(0);
    const messageType = data.readUInt16LE(2);

    console.log(`📥 Message DTC: Type=${messageType}, Size=${messageSize}`);

    switch (messageType) {
      case DTC_MESSAGE_TYPE.ENCODING_RESPONSE:
        this.handleEncodingResponse(data);
        break;
      
      case DTC_MESSAGE_TYPE.LOGON_RESPONSE:
        this.handleLogonResponse(data);
        break;
      
      case DTC_MESSAGE_TYPE.HEARTBEAT:
        this.handleHeartbeat(data);
        break;
      
      case DTC_MESSAGE_TYPE.MARKET_DATA_SNAPSHOT:
        this.handleMarketDataSnapshot(data);
        break;
      
      case DTC_MESSAGE_TYPE.MARKET_DATA_UPDATE_TRADE:
        this.handleMarketDataTrade(data);
        break;
      
      case DTC_MESSAGE_TYPE.MARKET_DATA_UPDATE_BID_ASK:
        this.handleMarketDataBidAsk(data);
        break;
      
      case DTC_MESSAGE_TYPE.MARKET_DATA_REJECT:
        this.handleMarketDataReject(data);
        break;
      
      case DTC_MESSAGE_TYPE.SECURITY_DEFINITION_RESPONSE:
        this.handleSecurityDefinition(data);
        break;
      
      case DTC_MESSAGE_TYPE.GENERAL_LOG_MESSAGE:
        this.handleLogMessage(data);
        break;
      
      default:
        console.log(`📋 Type ${messageType} non géré`);
        this.debugHex(data.slice(0, Math.min(32, data.length)));
    }
  }

  /**
   * Étape 1: Envoyer ENCODING_REQUEST
   */
  sendEncodingRequest() {
    console.log('📤 Envoi ENCODING_REQUEST (Binary encoding)...');

    // Format: Size(2) + Type(2) + ProtocolVersion(4) + Encoding(4) + ProtocolType(32)
    const message = Buffer.alloc(44);
    
    message.writeUInt16LE(44, 0);                           // Size
    message.writeUInt16LE(DTC_MESSAGE_TYPE.ENCODING_REQUEST, 2); // Type = 6
    message.writeInt32LE(8, 4);                             // ProtocolVersion = 8 (DTC Protocol)
    message.writeInt32LE(ENCODING_TYPE.BINARY_ENCODING, 8); // Encoding = Binary
    // ProtocolType reste vide (ou 'DTC')
    message.write('DTC', 12, 32, 'ascii');

    this.socket.write(message);
  }

  /**
   * Handler ENCODING_RESPONSE
   */
  handleEncodingResponse(data) {
    // Format: Size(2) + Type(2) + ProtocolVersion(4) + Encoding(4) + ProtocolType(32)
    if (data.length >= 12) {
      const protocolVersion = data.readInt32LE(4);
      const encoding = data.readInt32LE(8);
      
      console.log(`✅ ENCODING_RESPONSE: Version=${protocolVersion}, Encoding=${encoding}`);
      this.encoding = encoding;

      // Étape 2: Envoyer LOGON_REQUEST
      setTimeout(() => {
        this.sendLogonRequest();
      }, 100);
    } else {
      console.error('❌ ENCODING_RESPONSE trop court');
    }
  }

  /**
   * Étape 2: Envoyer LOGON_REQUEST
   */
  sendLogonRequest() {
    console.log('📤 Envoi LOGON_REQUEST...');

    // Structure LOGON_REQUEST pour Binary encoding
    // Size(2) + Type(2) + ProtocolVersion(4) + Username(32) + Password(32) + GeneralTextData(64) +
    // Integer_1(4) + Integer_2(4) + HeartbeatIntervalInSeconds(4) + Unused1(4) + TradeMode(1) +
    // TradePlatform(32) + Unused2(1) + Unused3(2)
    
    const messageSize = 188;
    const message = Buffer.alloc(messageSize);
    
    let offset = 0;
    message.writeUInt16LE(messageSize, offset);   offset += 2;  // Size
    message.writeUInt16LE(DTC_MESSAGE_TYPE.LOGON_REQUEST, offset); offset += 2; // Type = 1
    message.writeInt32LE(8, offset);              offset += 4;  // ProtocolVersion = 8
    
    // Username (32 bytes, null-terminated)
    const username = this.config.username || '';
    message.write(username, offset, 32, 'ascii');
    offset += 32;
    
    // Password (32 bytes, null-terminated) - appelé "Password" dans DTC v8
    const password = this.config.password || '';
    message.write(password, offset, 32, 'ascii');  
    offset += 32;
    
    // GeneralTextData (64 bytes) - Client name/description
    message.write('NodeJS DTC Client v1.0', offset, 64, 'ascii');
    offset += 64;
    
    // Integer_1 (4 bytes) - Unused
    message.writeInt32LE(0, offset); offset += 4;
    
    // Integer_2 (4 bytes) - Unused  
    message.writeInt32LE(0, offset); offset += 4;
    
    // HeartbeatIntervalInSeconds (4 bytes)
    message.writeInt32LE(30, offset); offset += 4;
    
    // Unused1 (4 bytes)
    message.writeInt32LE(0, offset); offset += 4;
    
    // TradeMode (1 byte) - 0=Demo, 1=Simulated, 2=Live
    message.writeUInt8(0, offset); offset += 1;
    
    // TradePlatform (32 bytes) 
    message.write('', offset, 32, 'ascii'); offset += 32;
    
    // Padding
    message.writeUInt8(0, offset); offset += 1;
    message.writeUInt16LE(0, offset);

    this.socket.write(message);
  }

  /**
   * Handler LOGON_RESPONSE
   */
  handleLogonResponse(data) {
    // Format: Size(2) + Type(2) + ProtocolVersion(4) + Result(4) + ResultText(96) + ReconnectAddress(64) +
    // Integer_1(4) + ServerName(60) + MarketDepthUpdatesBestBidAsk(1) + TradingIsSupported(1) + 
    // OCOOrdersSupported(1) + OrderCancelReplaceSupported(1) + SymbolExchangeDelimiter(4) +
    // SecurityDefinitionsSupported(1) + HistoricalPriceDataSupported(1) + ResubscribeWhenMarketDataFeedRestarted(1) +
    // MarketDepthIsSupported(1) + OneHistoricalPriceDataRequestPerConnection(1) + BracketOrdersSupported(1) +
    // UseIntegerPriceOrderMessages(1) + UsesMultiplePositionsPerSymbolAndTradeAccount(1) + MarketDataSupported(1)

    if (data.length < 12) {
      console.error('❌ LOGON_RESPONSE trop court');
      return;
    }

    const result = data.readInt32LE(4);
    
    // Lire ResultText (96 bytes starting at offset 8)
    let resultText = '';
    if (data.length >= 104) {
      const textEnd = data.indexOf(0, 8);
      const endPos = textEnd > 8 ? Math.min(textEnd, 104) : 104;
      resultText = data.toString('ascii', 8, endPos).replace(/\0/g, '').trim();
    }

    console.log(`🔐 LOGON_RESPONSE: Result=${result}`);
    if (resultText) {
      console.log(`   Message: ${resultText}`);
    }

    // Result codes: 1=Success, 0=LogonSuccess, autres=échec
    if (result === 1 || result === 0) {
      console.log('✅ AUTHENTIFICATION RÉUSSIE!');
      this.isAuthenticated = true;
      
      // Lire les capacités du serveur
      if (data.length >= 180) {
        const serverName = data.toString('ascii', 172, 232).replace(/\0/g, '').trim();
        if (serverName) {
          console.log(`   Serveur: ${serverName}`);
        }
      }
      
      this.emit('authenticated');
      
      // Démarrer le heartbeat
      this.startHeartbeat();
      
    } else {
      console.error(`❌ ÉCHEC AUTHENTIFICATION (code ${result})`);
      this.emit('authFailed', resultText || `Code ${result}`);
    }
  }

  /**
   * Heartbeat pour maintenir la connexion
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendHeartbeat();
      }
    }, 30000);
  }

  sendHeartbeat() {
    const message = Buffer.alloc(20);
    message.writeUInt16LE(20, 0);  // Size
    message.writeUInt16LE(DTC_MESSAGE_TYPE.HEARTBEAT, 2); // Type = 3
    message.writeUInt32LE(0, 4);   // NumDroppedMessages
    message.writeInt64LE ? message.writeBigInt64LE(BigInt(Date.now()), 8) : message.writeDoubleLE(Date.now(), 8);
    
    this.socket.write(message);
  }

  handleHeartbeat(data) {
    // Répondre au heartbeat
    console.log('💓 Heartbeat reçu');
  }

  /**
   * Demander les données de marché pour un symbole
   */
  requestMarketData(symbol, exchange = '') {
    console.log(`📊 Demande données marché: ${symbol}`);

    const requestId = this.requestId++;
    
    // MARKET_DATA_REQUEST (Type 101)
    // Size(2) + Type(2) + RequestAction(4) + SymbolID(2) + Symbol(64) + Exchange(16)
    const messageSize = 88;
    const message = Buffer.alloc(messageSize);
    
    let offset = 0;
    message.writeUInt16LE(messageSize, offset); offset += 2;
    message.writeUInt16LE(DTC_MESSAGE_TYPE.MARKET_DATA_REQUEST, offset); offset += 2;
    message.writeInt32LE(1, offset); offset += 4;  // RequestAction: 1=Subscribe
    message.writeUInt16LE(requestId, offset); offset += 2; // SymbolID
    message.write(symbol, offset, 64, 'ascii'); offset += 64;
    message.write(exchange, offset, 16, 'ascii');

    this.subscriptions.set(requestId, { symbol, exchange });
    this.socket.write(message);
    
    return requestId;
  }

  /**
   * Handler Market Data Snapshot
   */
  handleMarketDataSnapshot(data) {
    if (data.length < 100) return;

    const symbolId = data.readUInt16LE(4);
    const lastTradePrice = data.readDoubleLE(36);
    const lastTradeVolume = data.readDoubleLE(44);
    const bidPrice = data.readDoubleLE(52);
    const askPrice = data.readDoubleLE(60);

    const sub = this.subscriptions.get(symbolId);
    const symbol = sub ? sub.symbol : `ID:${symbolId}`;

    console.log(`\n📈 MARKET DATA SNAPSHOT: ${symbol}`);
    console.log(`   💰 Last: $${lastTradePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    if (bidPrice > 0) console.log(`   📗 Bid: $${bidPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    if (askPrice > 0) console.log(`   📕 Ask: $${askPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    if (lastTradeVolume > 0) console.log(`   📊 Volume: ${lastTradeVolume.toLocaleString()}`);

    this.emit('marketData', {
      symbolId,
      symbol,
      lastTradePrice,
      lastTradeVolume,
      bidPrice,
      askPrice
    });
  }

  handleMarketDataTrade(data) {
    if (data.length < 36) return;

    const symbolId = data.readUInt16LE(4);
    const price = data.readDoubleLE(16);
    const volume = data.readDoubleLE(24);

    const sub = this.subscriptions.get(symbolId);
    const symbol = sub ? sub.symbol : `ID:${symbolId}`;

    console.log(`📈 TRADE: ${symbol} @ $${price.toLocaleString()} (Vol: ${volume})`);
  }

  handleMarketDataBidAsk(data) {
    if (data.length < 44) return;

    const symbolId = data.readUInt16LE(4);
    const bidPrice = data.readDoubleLE(16);
    const askPrice = data.readDoubleLE(32);

    const sub = this.subscriptions.get(symbolId);
    const symbol = sub ? sub.symbol : `ID:${symbolId}`;

    console.log(`📊 BID/ASK: ${symbol} - Bid: $${bidPrice} / Ask: $${askPrice}`);
  }

  handleMarketDataReject(data) {
    const symbolId = data.readUInt16LE(4);
    const rejectText = data.toString('ascii', 8, 104).replace(/\0/g, '').trim();
    
    console.error(`❌ Market Data REJECT (ID ${symbolId}): ${rejectText}`);
  }

  handleSecurityDefinition(data) {
    if (data.length < 200) return;

    const requestId = data.readInt32LE(4);
    const symbol = data.toString('ascii', 8, 72).replace(/\0/g, '').trim();
    const exchange = data.toString('ascii', 72, 88).replace(/\0/g, '').trim();
    const description = data.toString('ascii', 152, 216).replace(/\0/g, '').trim();

    console.log(`📋 SECURITY: ${symbol} (${exchange}) - ${description}`);
  }

  handleLogMessage(data) {
    const messageText = data.toString('ascii', 8).replace(/\0/g, '').trim();
    console.log(`📝 SERVER LOG: ${messageText}`);
  }

  /**
   * Affichage debug hexadécimal
   */
  debugHex(data) {
    console.log('   HEX:', Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' '));
  }

  /**
   * Déconnexion propre
   */
  disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.socket && this.isConnected) {
      // Envoyer LOGOFF
      const message = Buffer.alloc(12);
      message.writeUInt16LE(12, 0);
      message.writeUInt16LE(DTC_MESSAGE_TYPE.LOGOFF, 2);
      this.socket.write(message);
      
      setTimeout(() => {
        this.socket.destroy();
      }, 500);
    }
    
    this.isConnected = false;
    this.isAuthenticated = false;
  }
}

// ==================== MAIN ====================

async function main() {
  console.log('📋 Configuration DTC:');
  console.log(`   Host: ${sierraConfig.host}`);
  console.log(`   Port: ${sierraConfig.port}`);
  console.log(`   Username: ${sierraConfig.username ? '***' : '(vide)'}`);
  console.log(`   Password: ${sierraConfig.password ? '***' : '(vide)'}`);
  console.log('');

  const client = new SierraChartDTCClient(sierraConfig);

  try {
    await client.connect();
    console.log('\n✅ Connexion DTC établie avec succès!\n');

    // Écouter les données de marché
    client.on('marketData', (data) => {
      console.log('📊 Données reçues:', data);
    });

    // Demander les données pour différents symboles
    console.log('📊 Souscription aux symboles...\n');
    
    // Essayer plusieurs symboles typiques
    const symbols = ['ESZ24', 'NQZ24', '@ES#', '@NQ#', 'BTCUSD'];
    
    for (const symbol of symbols) {
      client.requestMarketData(symbol);
      await new Promise(r => setTimeout(r, 500));
    }

    // Garder la connexion active
    console.log('\n🔄 En attente des données (60 secondes)...');
    console.log('   Appuyez Ctrl+C pour arrêter\n');

    setTimeout(() => {
      console.log('\n🏁 Test terminé');
      client.disconnect();
      process.exit(0);
    }, 60000);

  } catch (error) {
    console.error('\n❌ Erreur DTC:', error.message);
    
    console.log('\n🔧 Vérifications à effectuer dans SierraChart:');
    console.log('');
    console.log('1. Ouvrir: File > Connect > Data');
    console.log('2. Aller à l\'onglet "DTC Server"');
    console.log('3. Vérifier:');
    console.log('   ☑️  Enable DTC Server = Coché');
    console.log('   📍 Port = 11099');
    console.log('   ☑️  Allow connections from external tools = Coché');
    console.log('   👤 Username = celui dans votre .env');
    console.log('   🔑 Password = celui dans votre .env');
    console.log('');
    console.log('4. Cliquer sur "Start" pour démarrer le serveur');
    console.log('5. Le bouton doit changer en "Stop" (= serveur actif)');
    console.log('');
    console.log('📡 Pour vérifier que le port est ouvert:');
    console.log('   netstat -an | findstr :11099');
    
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt demandé');
  process.exit(0);
});

main().catch(console.error);
