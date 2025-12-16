/**
 * Diagnostic DTC - Test des deux modes (Binaire et JSON)
 */

console.log('🔍 DIAGNOSTIC DTC MODES\n');

import * as net from 'net';
import { config } from 'dotenv';

config({ path: '.env' });

const sierraConfig = {
  host: process.env.SIERRACHART_HOST || 'localhost',
  port: parseInt(process.env.SIERRACHART_PORT) || 11099,
  username: process.env.SIERRACHART_USERNAME || '',
  password: process.env.SIERRACHART_PASSWORD || ''
};

console.log('📋 Config:', sierraConfig.host, sierraConfig.port, sierraConfig.username);
console.log('');

// Test mode BINAIRE
async function testBinaryMode() {
  return new Promise((resolve) => {
    console.log('═'.repeat(50));
    console.log('TEST MODE BINAIRE');
    console.log('═'.repeat(50));
    
    const socket = new net.Socket();
    let step = 'connect';
    
    socket.connect(sierraConfig.port, sierraConfig.host, () => {
      console.log('✅ Connecté');
      step = 'encoding';
      
      // EncodingRequest binaire: demander encodage binaire (0)
      // Format: Size(2) + Type(2) + ProtocolVersion(4) + Encoding(4) + ProtocolType(32)
      const msg = Buffer.alloc(44);
      msg.writeUInt16LE(44, 0);  // Size
      msg.writeUInt16LE(6, 2);   // Type = ENCODING_REQUEST
      msg.writeInt32LE(8, 4);    // ProtocolVersion = 8
      msg.writeInt32LE(0, 8);    // Encoding = 0 (Binary)
      msg.write('DTC', 12, 'ascii'); // ProtocolType
      
      console.log('📤 EncodingRequest binaire envoyé');
      socket.write(msg);
    });
    
    socket.on('data', (data) => {
      console.log(`\n📥 Reçu ${data.length} bytes`);
      
      // Afficher hex
      const hex = Array.from(data.slice(0, 40)).map(b => b.toString(16).padStart(2, '0')).join(' ');
      console.log('HEX:', hex);
      
      // Parser binaire
      if (data.length >= 4) {
        const size = data.readUInt16LE(0);
        const type = data.readUInt16LE(2);
        console.log(`Binaire: Size=${size}, Type=${type}`);
        
        if (type === 7) {
          console.log('✅ EncodingResponse reçu!');
          if (data.length >= 12) {
            const encoding = data.readInt32LE(8);
            console.log(`   Encoding accepté: ${encoding}`);
          }
          
          // Envoyer LogonRequest binaire
          step = 'logon';
          const logon = Buffer.alloc(188);
          logon.writeUInt16LE(188, 0);  // Size
          logon.writeUInt16LE(1, 2);    // Type = LOGON_REQUEST
          logon.writeInt32LE(8, 4);     // ProtocolVersion
          // Username at offset 8 (32 bytes)
          logon.write(sierraConfig.username || '', 8, 32, 'ascii');
          // Password at offset 40 (32 bytes)  
          logon.write(sierraConfig.password || '', 40, 32, 'ascii');
          // GeneralTextData at offset 72 (64 bytes)
          logon.write('NodeJS Client', 72, 64, 'ascii');
          // HeartbeatIntervalInSeconds at offset 144
          logon.writeInt32LE(30, 144);
          
          console.log('📤 LogonRequest binaire envoyé');
          socket.write(logon);
        }
        
        if (type === 2) {
          console.log('🔐 LogonResponse reçu!');
          if (data.length >= 8) {
            const result = data.readInt32LE(4);
            console.log(`   Result: ${result}`);
            
            // Lire ResultText
            if (data.length > 8) {
              let text = '';
              for (let i = 8; i < Math.min(104, data.length); i++) {
                if (data[i] === 0) break;
                text += String.fromCharCode(data[i]);
              }
              if (text) console.log(`   Text: ${text}`);
            }
            
            if (result === 1) {
              console.log('✅ AUTHENTIFICATION BINAIRE RÉUSSIE!');
            }
          }
        }
        
        if (type === 3) {
          console.log('💓 Heartbeat binaire');
        }
      }
      
      // Aussi essayer de parser comme JSON
      const text = data.toString('utf8').trim();
      if (text.startsWith('{')) {
        try {
          const json = JSON.parse(text.split('\x00')[0]);
          console.log('JSON:', json.Type);
        } catch(e) {}
      }
    });
    
    socket.on('error', (e) => {
      console.log('❌ Erreur:', e.message);
    });
    
    socket.on('close', () => {
      console.log('🔌 Fermé');
      resolve();
    });
    
    setTimeout(() => {
      console.log('\n⏱️ Timeout binaire (10s)');
      socket.destroy();
      resolve();
    }, 10000);
  });
}

// Test mode JSON
async function testJSONMode() {
  return new Promise((resolve) => {
    console.log('\n');
    console.log('═'.repeat(50));
    console.log('TEST MODE JSON');
    console.log('═'.repeat(50));
    
    const socket = new net.Socket();
    socket.setEncoding('utf8');
    
    let gotLogonResponse = false;
    
    socket.connect(sierraConfig.port, sierraConfig.host, () => {
      console.log('✅ Connecté');
      
      // EncodingRequest JSON
      const req = JSON.stringify({
        Type: 'EncodingRequest',
        ProtocolVersion: 8,
        Encoding: 2,  // JSON
        ProtocolType: 'DTC'
      }) + '\x00';
      
      console.log('📤 EncodingRequest JSON envoyé');
      socket.write(req);
    });
    
    let buffer = '';
    socket.on('data', (data) => {
      buffer += data;
      
      // Parser messages séparés par \x00
      const parts = buffer.split('\x00');
      buffer = parts.pop() || '';
      
      for (const part of parts) {
        if (!part.trim()) continue;
        
        console.log(`\n📥 Message:`, part.substring(0, 200));
        
        try {
          const msg = JSON.parse(part);
          console.log('Type:', msg.Type);
          
          if (msg.Type === 'EncodingResponse' || msg.Type === 7) {
            console.log('✅ EncodingResponse JSON!');
            
            // Envoyer LogonRequest
            const logon = JSON.stringify({
              Type: 'LogonRequest',
              ProtocolVersion: 8,
              Username: sierraConfig.username,
              Password: sierraConfig.password,
              GeneralTextData: 'NodeJS',
              HeartbeatIntervalInSeconds: 30
            }) + '\x00';
            
            console.log('📤 LogonRequest JSON envoyé');
            socket.write(logon);
          }
          
          if (msg.Type === 'LogonResponse' || msg.Type === 2) {
            gotLogonResponse = true;
            console.log('🔐 LogonResponse JSON!');
            console.log('   Result:', msg.Result);
            console.log('   Text:', msg.ResultText);
            
            if (msg.Result === 1) {
              console.log('✅ AUTHENTIFICATION JSON RÉUSSIE!');
            }
          }
          
          if (msg.Type === 'Heartbeat' || msg.Type === 3) {
            console.log('💓 Heartbeat JSON');
            
            // Si pas encore de LogonResponse, envoyer Logon
            if (!gotLogonResponse) {
              const logon = JSON.stringify({
                Type: 'LogonRequest',
                ProtocolVersion: 8,
                Username: sierraConfig.username,
                Password: sierraConfig.password,
                GeneralTextData: 'NodeJS',
                HeartbeatIntervalInSeconds: 30
              }) + '\x00';
              
              console.log('📤 LogonRequest JSON (après Heartbeat)');
              socket.write(logon);
            }
          }
          
        } catch(e) {
          console.log('⚠️ Parse error');
        }
      }
    });
    
    socket.on('error', (e) => {
      console.log('❌ Erreur:', e.message);
    });
    
    socket.on('close', () => {
      console.log('🔌 Fermé');
      resolve();
    });
    
    setTimeout(() => {
      console.log('\n⏱️ Timeout JSON (10s)');
      socket.destroy();
      resolve();
    }, 10000);
  });
}

async function main() {
  await testBinaryMode();
  await testJSONMode();
  
  console.log('\n');
  console.log('═'.repeat(50));
  console.log('FIN DES TESTS');
  console.log('═'.repeat(50));
}

main().catch(console.error);
