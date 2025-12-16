// Test SierraChart avec format JSON (découvert!)
console.log('🚀 Test SierraChart avec format JSON...\n');

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

class SierraChartJSON {
  constructor(config) {
    this.config = config;
    this.socket = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log(`🔌 Connexion JSON à ${this.config.host}:${this.config.port}`);

      this.socket = new net.Socket();

      this.socket.connect(this.config.port, this.config.host, () => {
        console.log('✅ Socket connecté');
        // Envoyer un message JSON simple
        this.sendJSONMessage({
          Type: 1, // Logon
          Username: this.config.username,
          Password: this.config.password,
          ProtocolVersion: 1
        });
      });

      this.socket.on('data', (data) => {
        this.handleJSONData(data);
      });

      this.socket.on('error', (error) => {
        console.error('❌ Erreur socket:', error.message);
        reject(error);
      });

      this.socket.on('close', () => {
        console.log('🔌 Connexion fermée');
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

  sendJSONMessage(message) {
    const jsonString = JSON.stringify(message) + '\n';
    console.log('📤 Message JSON envoyé:', jsonString.trim());
    this.socket.write(jsonString, 'utf8');
  }

  handleJSONData(data) {
    const dataStr = data.toString('utf8').trim();
    console.log(`📥 Données JSON reçues:`, dataStr);

    try {
      const message = JSON.parse(dataStr);
      console.log(`📋 Message parsé:`, message);

      switch (message.Type) {
        case 2: // Logon Response
          this.handleLogonResponse(message);
          break;
        case 100: // Error
          this.handleError(message);
          break;
        default:
          console.log(`⚠️ Type de message: ${message.Type}`);
      }
    } catch (error) {
      console.error('❌ Erreur parsing JSON:', error.message);
      console.log('Données brutes:', dataStr);
    }
  }

  handleLogonResponse(message) {
    console.log(`🔐 Réponse Logon:`, message);

    if (message.Status === 1 || message.Result === 1) {
      console.log('✅ AUTHENTIFICATION JSON RÉUSSIE!');
      isConnected = true;

      if (this.resolvePromise) {
        this.resolvePromise();
        this.resolvePromise = null;
      }

      // Demander les données BTC
      setTimeout(() => {
        this.requestBTCData();
      }, 1000);
    } else {
      console.log('❌ AUTHENTIFICATION ÉCHOUÉE');
      console.log('Message:', message);
    }
  }

  handleError(message) {
    console.error('❌ Erreur SierraChart:', message);
  }

  requestBTCData() {
    console.log('📈 Demande des données BTC en JSON...');

    this.sendJSONMessage({
      Type: 10, // Market Data Request
      Symbol: 'BTCUSD',
      Exchange: '',
      RequestID: 1,
      Interval: 1
    });
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

  const jsonClient = new SierraChartJSON(sierraConfig);

  try {
    await jsonClient.connect();
    console.log('✅ Connexion JSON établie!');

    // Garder la connexion active
    setTimeout(() => {
      console.log('\n🏁 Test JSON terminé');
      jsonClient.disconnect();
      process.exit(0);
    }, 30000); // 30 secondes

  } catch (error) {
    console.error('❌ Erreur de connexion JSON:', error.message);

    console.log('\n🔧 Dans SierraChart assurez-vous:');
    console.log('1. File > Connect > Data');
    console.log('2. Onglet "DTC Server"');
    console.log('3. ✅ Enable DTC Server');
    console.log('4. ✅ Allow connections from external tools');
    console.log('5. Port: 11099');

    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt demandé');
  process.exit(0);
});

main().catch(console.error);