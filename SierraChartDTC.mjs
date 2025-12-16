// Test simple et direct du protocole DTC SierraChart
console.log('🚀 Test DTC SierraChart direct...\n');

import * as net from 'net';
import { config } from 'dotenv';

config({ path: '.env' });

const sierraConfig = {
  host: process.env.SIERRACHART_HOST || 'localhost',
  port: parseInt(process.env.SIERRACHART_PORT) || 11099,
  username: process.env.SIERRACHART_USERNAME || 'admin',
  password: process.env.SIERRACHART_PASSWORD || 'password'
};

let isConnected = false;
let heartbeatCount = 0;

class SierraChartDTC {
  constructor(config) {
    this.config = config;
    this.socket = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log(`🔌 Connexion à ${this.config.host}:${this.config.port}`);

      this.socket = new net.Socket();

      this.socket.connect(this.config.port, this.config.host, () => {
        console.log('✅ Socket connecté');
        this.sendLogon();
      });

      this.socket.on('data', (data) => {
        this.handleData(data);
      });

      this.socket.on('error', (error) => {
        console.error('❌ Erreur socket:', error.message);
        reject(error);
      });

      this.socket.on('close', () => {
        console.log('🔌 Connexion fermée');
        isConnected = false;
      });

      // Timeout
      setTimeout(() => {
        if (!isConnected) {
          reject(new Error('Timeout de connexion'));
        }
      }, 10000);

      this.resolvePromise = resolve;
    });
  }

  sendLogon() {
    console.log('🔐 Envoi Logon Request...');

    // Format DTC Logon Request (128 bytes)
    const buffer = Buffer.alloc(128);

    // Header
    buffer.writeUInt16LE(1, 0);     // Message Type: Logon Request
    buffer.writeUInt16LE(1, 2);     // Protocol Version
    buffer.writeUInt32LE(128, 4);   // Message Length

    // Username (64 bytes)
    if (this.config.username) {
      const username = Buffer.from(this.config.username, 'utf8');
      username.copy(buffer, 8, 0, Math.min(username.length, 63));
    }

    // Password (64 bytes)
    if (this.config.password) {
      const password = Buffer.from(this.config.password, 'utf8');
      password.copy(buffer, 72, 0, Math.min(password.length, 63));
    }

    console.log('📦 Message Logon (bytes):', Array.from(buffer.slice(0, 20)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));

    this.socket.write(buffer);
  }

  handleData(data) {
    console.log(`📥 Données reçues: ${data.length} bytes`);

    if (data.length < 8) {
      console.log('⚠️ Message trop court');
      return;
    }

    // Parser le header
    const messageType = data.readUInt16LE(0);
    const protocolVersion = data.readUInt16LE(2);
    const messageLength = data.readUInt32LE(4);

    console.log(`📋 Message: Type=${messageType} (${this.getMessageTypeName(messageType)}), Version=${protocolVersion}, Length=${messageLength}`);

    // Log des premiers bytes pour debug
    const hexBytes = Array.from(data.slice(0, Math.min(32, data.length))).map(b => b.toString(16).padStart(2, '0')).join(' ');
    console.log(`📦 Bytes: ${hexBytes}`);

    switch (messageType) {
      case 2: // Logon Response
        this.handleLogonResponse(data);
        break;
      case 3: // Heartbeat
        this.handleHeartbeat(data);
        break;
      case 11: // Market Data Update
        this.handleMarketData(data);
        break;
      default:
        console.log(`⚠️ Type de message non géré: ${messageType}`);
    }
  }

  handleLogonResponse(data) {
    if (data.length < 12) {
      console.error('❌ Réponse logon trop courte');
      return;
    }

    const result = data.readUInt8(8);
    const rejectReasonCode = data.readUInt8(9);

    console.log(`🔐 Réponse Logon: Result=${result}, RejectReason=${rejectReasonCode}`);

    if (result === 1) {
      console.log('✅ AUTHENTIFICATION RÉUSSIE!');
      isConnected = true;

      if (this.resolvePromise) {
        this.resolvePromise();
        this.resolvePromise = null;
      }

      // Demander les données BTC après authentification
      setTimeout(() => {
        this.requestBTCData();
      }, 1000);
    } else {
      console.log('❌ AUTHENTIFICATION ÉCHOUÉE');

      // Lire le message d'erreur
      if (data.length > 12) {
        const errorMsg = data.toString('utf8', 12, Math.min(data.length, 12 + 64)).replace(/\0/g, '');
        console.log(`Message: ${errorMsg}`);
      }
    }
  }

  handleHeartbeat(data) {
    heartbeatCount++;
    console.log(`💓 Heartbeat reçu (${heartbeatCount})`);

    // Répondre au heartbeat
    this.sendHeartbeatResponse();
  }

  sendHeartbeatResponse() {
    const response = Buffer.alloc(12);
    response.writeUInt16LE(3, 0);     // Message Type: Heartbeat Response
    response.writeUInt16LE(1, 2);     // Protocol Version
    response.writeUInt32LE(12, 4);   // Message Length
    response.writeUInt32LE(Date.now(), 8); // Timestamp

    this.socket.write(response);
    console.log('💓 Heartbeat response envoyé');
  }

  requestBTCData() {
    console.log('📈 Demande des données BTC...');

    const symbol = 'BTCUSD';
    const exchange = '';

    // Market Data Request (256 bytes)
    const buffer = Buffer.alloc(256);

    // Header
    buffer.writeUInt16LE(10, 0);     // Message Type: Market Data Request
    buffer.writeUInt16LE(1, 2);     // Protocol Version
    buffer.writeUInt32LE(256, 4);   // Message Length

    // Request ID
    buffer.writeUInt32LE(1, 8);

    // Symbol (64 bytes)
    const symbolBytes = Buffer.from(symbol, 'utf8');
    symbolBytes.copy(buffer, 12, 0, Math.min(symbolBytes.length, 63));

    // Exchange (32 bytes)
    const exchangeBytes = Buffer.from(exchange, 'utf8');
    exchangeBytes.copy(buffer, 76, 0, Math.min(exchangeBytes.length, 31));

    // Interval
    buffer.writeUInt16LE(1, 108);    // 1 minute

    console.log('📦 Market Data Request envoyé pour', symbol);

    this.socket.write(buffer);
  }

  handleMarketData(data) {
    if (data.length < 128) {
      console.log('⚠️ Market data trop court');
      return;
    }

    // Parser les données de marché
    const symbol = data.toString('utf8', 12, 76).replace(/\0/g, '');
    const exchange = data.toString('utf8', 76, 108).replace(/\0/g, '');

    // Lire les prix (double precision = 8 bytes)
    const lastPrice = data.readDoubleLE(108);
    const lastVolume = data.readUInt32LE(116);
    const bidPrice = data.readDoubleLE(120);
    const askPrice = data.readDoubleLE(128);

    console.log(`📈 MARKET DATA: ${symbol} | Last: $${lastPrice.toLocaleString()}`);
    if (bidPrice > 0) console.log(`   Bid: $${bidPrice.toLocaleString()}`);
    if (askPrice > 0) console.log(`   Ask: $${askPrice.toLocaleString()}`);
    if (lastVolume > 0) console.log(`   Volume: ${lastVolume}`);
  }

  getMessageTypeName(type) {
    const types = {
      1: 'LOGON_REQUEST',
      2: 'LOGON_RESPONSE',
      3: 'HEARTBEAT',
      10: 'MARKET_DATA_REQUEST',
      11: 'MARKET_DATA_UPDATE',
      12: 'MARKET_DATA_REJECT',
      20: 'TRADE_ACCOUNT_REQUEST',
      21: 'TRADE_ACCOUNT_RESPONSE',
      30: 'ORDER_ACTION_REQUEST',
      31: 'ORDER_UPDATE_REPORT',
      32: 'POSITION_UPDATE_REPORT',
      100: 'GENERAL_ERROR'
    };
    return types[type] || `UNKNOWN_${type}`;
  }

  disconnect() {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }
}

async function main() {
  console.log('📋 Configuration:');
  console.log(`   Host: ${sierraConfig.host}`);
  console.log(`   Port: ${sierraConfig.port}`);
  console.log(`   Username: ${sierraConfig.username}`);
  console.log('');

  const dtc = new SierraChartDTC(sierraConfig);

  try {
    await dtc.connect();
    console.log('✅ Connexion DTC établie!');

    // Garder la connexion active
    setTimeout(() => {
      console.log('\n🏁 Test terminé');
      console.log(`Heartbeats reçus: ${heartbeatCount}`);
      dtc.disconnect();
      process.exit(0);
    }, 60000); // 60 secondes

  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);

    console.log('\n🔧 Vérifiez dans SierraChart:');
    console.log('1. File > Connect > Data');
    console.log('2. Onglet "DTC Server"');
    console.log('3. ✅ Enable DTC Server');
    console.log('4. Port: 11099');
    console.log('5. ✅ Allow connections from external tools');
    console.log('6. Username/password si requis');
    console.log('7. Cliquez "Start"');

    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt demandé');
  process.exit(0);
});

main().catch(console.error);