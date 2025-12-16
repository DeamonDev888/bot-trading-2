// Test universel SierraChart - essaie différents formats
console.log('🚀 Test universel SierraChart...\n');

import * as net from 'net';
import { config } from 'dotenv';

config({ path: '.env' });

const sierraConfig = {
  host: process.env.SIERRACHART_HOST || 'localhost',
  port: parseInt(process.env.SIERRACHART_PORT) || 11099,
  username: process.env.SIERRACHART_USERNAME || 'Deamon888',
  password: process.env.SIERRACHART_PASSWORD || '6Satan66'
};

class SierraChartUniversal {
  constructor(config) {
    this.config = config;
    this.socket = null;
    this.buffer = Buffer.alloc(0);
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log(`🔌 Connexion universelle à ${this.config.host}:${this.config.port}`);
      console.log(`   Username: ${this.config.username}`);

      this.socket = new net.Socket();

      this.socket.connect(this.config.port, this.config.host, () => {
        console.log('✅ Socket connecté');
        console.log('🧪 Test de différents formats de logon...');

        // Essayer format 1: JSON simple
        this.tryLogonFormat1();
      });

      this.socket.on('data', (data) => {
        this.buffer = Buffer.concat([this.buffer, data]);
        this.processBuffer();
      });

      this.socket.on('error', (error) => {
        console.error('❌ Erreur socket:', error.message);
        reject(error);
      });

      this.socket.on('close', () => {
        console.log('🔌 Connexion fermée');
      });

      // Timeout plus long pour essayer plusieurs formats
      setTimeout(() => {
        reject(new Error('Timeout de connexion universelle'));
      }, 15000);

      this.resolvePromise = resolve;
    });
  }

  tryLogonFormat1() {
    console.log('\n🧪 Test 1: JSON simple');
    const jsonMsg = JSON.stringify({
      Type: 1,
      Username: this.config.username,
      Password: this.config.password
    }) + '\n';
    this.socket.write(jsonMsg, 'utf8');
  }

  tryLogonFormat2() {
    setTimeout(() => {
      console.log('\n🧪 Test 2: Binaire DTC standard');
      const buffer = Buffer.alloc(128);
      buffer.writeUInt16LE(1, 0);     // Logon Request
      buffer.writeUInt16LE(1, 2);     // Protocol Version
      buffer.writeUInt32LE(128, 4);   // Length

      // Username
      if (this.config.username) {
        const username = Buffer.from(this.config.username, 'utf8');
        username.copy(buffer, 8, 0, Math.min(username.length, 63));
      }

      // Password
      if (this.config.password) {
        const password = Buffer.from(this.config.password, 'utf8');
        password.copy(buffer, 72, 0, Math.min(password.length, 63));
      }

      this.socket.write(buffer);
    }, 2000);
  }

  tryLogonFormat3() {
    setTimeout(() => {
      console.log('\n🧪 Test 3: Binaire avec en-tête différent');
      const buffer = Buffer.alloc(64);
      buffer.writeUInt16LE(1, 0);     // Type
      buffer.writeUInt16LE(1, 2);     // Version

      // Username et password plus courts
      const username = this.config.username || '';
      const password = this.config.password || '';
      buffer.write(username, 4, 'utf8');
      buffer.write(password, 20, 'utf8');

      this.socket.write(buffer);
    }, 4000);
  }

  tryLogonFormat4() {
    setTimeout(() => {
      console.log('\n🧪 Test 4: Binaire DTC avec taille fixe 256');
      const buffer = Buffer.alloc(256);
      buffer.writeUInt16LE(1, 0);     // Logon Request
      buffer.writeUInt16LE(1, 2);     // Protocol Version
      buffer.writeUInt32LE(256, 4);   // Length

      // Username à position différente
      if (this.config.username) {
        const username = Buffer.from(this.config.username, 'utf8');
        username.copy(buffer, 16, 0, Math.min(username.length, 31));
      }

      // Password
      if (this.config.password) {
        const password = Buffer.from(this.config.password, 'utf8');
        password.copy(buffer, 48, 0, Math.min(password.length, 31));
      }

      this.socket.write(buffer);
    }, 6000);
  }

  tryLogonFormat5() {
    setTimeout(() => {
      console.log('\n🧪 Test 5: Sans authentification');
      const buffer = Buffer.alloc(16);
      buffer.writeUInt16LE(1, 0);     // Logon Request
      buffer.writeUInt16LE(1, 2);     // Protocol Version
      buffer.writeUInt32LE(16, 4);   // Length

      this.socket.write(buffer);
    }, 8000);
  }

  processBuffer() {
    while (this.buffer.length >= 8) {
      // Essayer de parser comme JSON d'abord
      try {
        const str = this.buffer.toString('utf8');
        const jsonStart = str.indexOf('{');
        const jsonEnd = str.indexOf('}');

        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const jsonStr = str.substring(jsonStart, jsonEnd + 1);
          const message = JSON.parse(jsonStr);

          console.log(`✅ Succès JSON: ${JSON.stringify(message)}`);

          if (message.Type === 2 || message.Type === 1) {
            this.handleSuccess(message);
            return;
          }

          // Enlever la partie traitée du buffer
          this.buffer = this.buffer.slice(jsonEnd + 1);
          continue;
        }
      } catch (e) {
        // Pas du JSON, continuer avec binaire
      }

      // Essayer parsing binaire
      const messageType = this.buffer.readUInt16LE(0);
      const messageLength = this.buffer.readUInt32LE(4);

      if (this.buffer.length >= messageLength) {
        console.log(`✅ Succès Binaire: Type=${messageType}, Length=${messageLength}`);

        if (messageType === 2) { // Logon Response
          this.handleSuccessBinary(this.buffer.slice(0, messageLength));
          return;
        }

        this.buffer = this.buffer.slice(messageLength);
      } else {
        break; // Message incomplet
      }
    }
  }

  handleSuccess(message) {
    console.log('🎉 CONNEXION RÉUSSIE!');
    console.log('📋 Réponse:', message);

    if (this.resolvePromise) {
      this.resolvePromise();
      this.resolvePromise = null;
    }

    // Demander les données BTC
    setTimeout(() => {
      this.requestBTCData();
    }, 1000);
  }

  handleSuccessBinary(data) {
    if (data.length >= 12) {
      const result = data.readUInt8(8);
      console.log(`🎉 CONNEXION BINAIRE RÉUSSIE! Result=${result}`);

      if (result === 1) {
        if (this.resolvePromise) {
          this.resolvePromise();
          this.resolvePromise = null;
        }

        // Demander les données BTC
        setTimeout(() => {
          this.requestBTCData();
        }, 1000);
      }
    }
  }

  requestBTCData() {
    console.log('📈 Demande des données BTC...');

    // Essayer format JSON pour les données de marché
    const jsonMsg = JSON.stringify({
      Type: 10,
      Symbol: 'BTCUSD',
      RequestID: 1,
      Interval: 1
    }) + '\n';

    this.socket.write(jsonMsg, 'utf8');
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

  const universal = new SierraChartUniversal(sierraConfig);

  try {
    await universal.connect();
    console.log('✅ Connexion universelle établie!');

    // Garder la connexion active
    setTimeout(() => {
      console.log('\n🏁 Test universel terminé avec succès!');
      universal.disconnect();
      process.exit(0);
    }, 20000); // 20 secondes

  } catch (error) {
    console.error('❌ Erreur de connexion universelle:', error.message);

    console.log('\n🔧 Vérifiez dans SierraChart:');
    console.log('1. File > Connect > Data');
    console.log('2. Onglet "DTC Server"');
    console.log('3. ✅ Enable DTC Server');
    console.log('4. ✅ Allow connections from external tools');
    console.log('5. Port: 11099');
    console.log('6. Username/password corrects');

    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt demandé');
  process.exit(0);
});

main().catch(console.error);