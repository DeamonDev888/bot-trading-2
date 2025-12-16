/**
 * Diagnostic SierraChart DTC - Analyse du protocole
 * Ce script capture et affiche les données brutes pour comprendre le format utilisé
 */

console.log('🔍 DIAGNOSTIC SierraChart DTC\n');

import * as net from 'net';
import { config } from 'dotenv';

config({ path: '.env' });

const sierraConfig = {
  host: process.env.SIERRACHART_HOST || 'localhost',
  port: parseInt(process.env.SIERRACHART_PORT) || 11099,
  username: process.env.SIERRACHART_USERNAME || '',
  password: process.env.SIERRACHART_PASSWORD || ''
};

console.log('📋 Configuration:');
console.log(`   Host: ${sierraConfig.host}`);
console.log(`   Port: ${sierraConfig.port}`);
console.log(`   Username: ${sierraConfig.username || '(vide)'}`);
console.log('');

const socket = new net.Socket();
let receivedData = [];

socket.connect(sierraConfig.port, sierraConfig.host, () => {
  console.log('✅ Connecté au serveur DTC\n');
  
  // Test 1: Envoyer EncodingRequest JSON
  console.log('📤 Test 1: EncodingRequest JSON...');
  const jsonRequest = JSON.stringify({
    Type: 'EncodingRequest',
    ProtocolVersion: 8,
    Encoding: 2,  // JSON
    ProtocolType: 'DTC'
  }) + '\x00';
  
  socket.write(jsonRequest);
  console.log('   Envoyé:', jsonRequest.replace('\x00', '\\0'));
});

socket.on('data', (data) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`\n📥 [${timestamp}] Données reçues: ${data.length} bytes`);
  
  // Afficher en hexadécimal
  const hex = Array.from(data.slice(0, Math.min(64, data.length)))
    .map(b => b.toString(16).padStart(2, '0')).join(' ');
  console.log('   HEX:', hex);
  
  // Afficher en ASCII (caractères imprimables seulement)
  const ascii = Array.from(data.slice(0, Math.min(200, data.length)))
    .map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.')
    .join('');
  console.log('   ASCII:', ascii);
  
  // Essayer de parser comme JSON
  const text = data.toString('utf8').replace(/\x00/g, '');
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      const json = JSON.parse(text.split('\x00')[0] || text);
      console.log('   JSON:', JSON.stringify(json, null, 2).substring(0, 500));
      
      // Si c'est une EncodingResponse, envoyer LogonRequest
      if (json.Type === 'EncodingResponse') {
        console.log('\n✅ EncodingResponse reçu! Encoding:', json.Encoding);
        
        setTimeout(() => {
          console.log('\n📤 Envoi LogonRequest...');
          const logonRequest = JSON.stringify({
            Type: 'LogonRequest',
            ProtocolVersion: 8,
            Username: sierraConfig.username,
            Password: sierraConfig.password,
            GeneralTextData: 'DiagnosticTool',
            HeartbeatIntervalInSeconds: 30
          }) + '\x00';
          socket.write(logonRequest);
        }, 500);
      }
      
      // Si c'est un LogonResponse
      if (json.Type === 'LogonResponse') {
        console.log('\n🔐 LogonResponse reçu!');
        console.log('   Result:', json.Result);
        console.log('   ResultText:', json.ResultText);
        console.log('   ServerName:', json.ServerName);
        
        if (json.Result === 1 || json.ResultText?.includes('Success')) {
          console.log('\n✅ AUTHENTIFICATION RÉUSSIE!');
          
          // Tester une requête MarketData
          setTimeout(() => {
            console.log('\n📤 Envoi MarketDataRequest pour ES...');
            const mdRequest = JSON.stringify({
              Type: 'MarketDataRequest',
              RequestAction: 1,
              SymbolID: 1,
              Symbol: 'ES',
              Exchange: ''
            }) + '\x00';
            socket.write(mdRequest);
          }, 1000);
        } else {
          console.log('\n❌ AUTHENTIFICATION ÉCHOUÉE');
        }
      }
      
    } catch (e) {
      console.log('   (JSON invalide):', text.substring(0, 200));
    }
  }
  
  // Essayer d'interpréter comme binaire DTC
  if (data.length >= 4) {
    const size = data.readUInt16LE(0);
    const type = data.readUInt16LE(2);
    console.log(`   Binary DTC: Size=${size}, Type=${type}`);
  }
  
  receivedData.push(data);
});

socket.on('error', (error) => {
  console.error('❌ Erreur:', error.message);
});

socket.on('close', () => {
  console.log('\n🔌 Connexion fermée');
  
  if (receivedData.length === 0) {
    console.log('\n⚠️ Aucune donnée reçue - Le serveur a peut-être fermé immédiatement');
    console.log('\n🔧 Vérifications:');
    console.log('1. Dans SierraChart: File > Connect > Data > "DTC Server"');
    console.log('2. Assurez-vous que "Enable DTC Server" est coché');
    console.log('3. Vérifiez le port (devrait être 11099)');
    console.log('4. Cliquez "Start" pour démarrer le serveur');
    console.log('5. Vérifiez username/password dans .env');
  }
  
  process.exit(0);
});

// Timeout après 30 secondes
setTimeout(() => {
  console.log('\n⏱️ Timeout - Fermeture');
  socket.destroy();
}, 30000);

process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt');
  socket.destroy();
});
