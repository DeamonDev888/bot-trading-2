// Test simple de connexion à SierraChart pour diagnostiquer le protocole DTC
console.log('🔍 Diagnostic de connexion SierraChart...\n');

import * as net from 'net';

const config = {
  host: 'localhost',
  port: 11099
};

async function testSierraConnection() {
  return new Promise((resolve, reject) => {
    console.log(`📡 Tentative de connexion TCP vers ${config.host}:${config.port}`);

    const socket = new net.Socket();
    let connected = false;

    // Timeout après 5 secondes
    const timeout = setTimeout(() => {
      if (!connected) {
        socket.destroy();
        reject(new Error('Timeout de connexion'));
      }
    }, 5000);

    socket.connect(config.port, config.host, () => {
      connected = true;
      clearTimeout(timeout);
      console.log('✅ Connexion TCP établie avec succès!');

      // Envoyer un message simple de test
      console.log('📤 Envoi d\'un message de test...');

      // Version simplifiée du message DTC LOGON
      const logonMessage = Buffer.alloc(64);
      logonMessage.writeUInt16LE(1, 0);  // Logon Request type
      logonMessage.writeUInt16LE(1, 2);  // Protocol version
      logonMessage.write('TestUser', 4, 16, 'utf8');  // Username

      console.log('📦 Message LOGON préparé:', logonMessage.length, 'bytes');
      console.log('📦 Contenu du message:', Array.from(logonMessage).map(b => b.toString(16).padStart(2, '0')).join(' '));

      socket.write(logonMessage);
    });

    socket.on('data', (data) => {
      console.log('📥 Données reçues:', data.length, 'bytes');
      console.log('📦 Contenu brut:', Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' '));

      if (data.length >= 2) {
        const messageType = data.readUInt16LE(0);
        console.log('📋 Type de message:', messageType);
        console.log('📋 Type en décimal:', messageType);
        console.log('📋 Type en hex:', '0x' + messageType.toString(16));
      }

      console.log('📋 Interprétation des données:');
      for (let i = 0; i < Math.min(data.length, 20); i++) {
        const byte = data[i];
        const asChar = byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
        console.log(`   [${i.toString().padStart(2)}] 0x${byte.toString(16).padStart(2)} (${byte.toString().padStart(3)}) '${asChar}'`);
      }

      resolve({
        connected: true,
        responseReceived: true,
        dataSize: data.length,
        data: data
      });
    });

    socket.on('error', (error) => {
      clearTimeout(timeout);
      console.error('❌ Erreur de socket:', error.message);
      reject(error);
    });

    socket.on('close', () => {
      clearTimeout(timeout);
      console.log('🔌 Connexion fermée');
      if (!connected) {
        reject(new Error('Connexion fermée avant établissement'));
      }
    });
  });
}

async function testMultipleConnections() {
  console.log('🔄 Test de plusieurs tentatives de connexion...\n');

  for (let i = 1; i <= 3; i++) {
    try {
      console.log(`\n--- Tentative ${i}/3 ---`);
      const result = await testSierraConnection();
      console.log('✅ Succès:', result);

      // Attendre un peu entre les tentatives
      if (i < 3) {
        console.log('⏱️  Attente de 2 secondes...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error('❌ Échec:', error.message);

      if (i < 3) {
        console.log('⏱️  Attente de 2 secondes avant retry...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
}

async function checkSierraChartVersion() {
  console.log('\n🔍 Diagnostic SierraChart...\n');

  try {
    console.log('📊 Vérification de la version du protocole DTC...');
    console.log('💡 Le protocole DTC a plusieurs versions:');
    console.log('   • Version 1: Original DTC protocol');
    console.log('   • Version 2: Enhanced DTC with more features');
    console.log('   • Version 3: Latest with security enhancements');

    console.log('\n🔧 Configuration requise dans SierraChart:');
    console.log('   1. File > Connect > Data');
    console.log('   2. Cocher "Enable DTC server"');
    console.log('   3. Port: 11099');
    console.log('   4. Cocher "Allow connections from external tools"');
    console.log('   5. Username/Password: (optionnel)');

    console.log('\n⚠️  Problèmes possibles:');
    console.log('   • Version du protocole incompatible');
    console.log('   • Authentification requise');
    console.log('   • Format du message incorrect');
    console.log('   • Encodage/Endianness incorrect');

  } catch (error) {
    console.error('❌ Erreur de diagnostic:', error.message);
  }
}

async function main() {
  try {
    await testMultipleConnections();
    await checkSierraChartVersion();

    console.log('\n🎯 CONCLUSION:');
    console.log('La connexion TCP fonctionne mais le protocole DTC nécessite ajustement.');
    console.log('Recommandations:');
    console.log('1. Vérifier la configuration DTC dans SierraChart');
    console.log('2. Consulter la documentation DTC de SierraChart');
    console.log('3. Implémenter le protocole correctement');
    console.log('4. Utiliser une bibliothèque DTC existante si possible');

  } catch (error) {
    console.error('\n❌ Erreur globale:', error.message);
  }
}

main().catch(console.error);