/**
 * Diagnostic SierraChart - Sauvegarde les résultats dans logs/
 */

import * as net from 'net';
import * as fs from 'fs';
import { config } from 'dotenv';

config({ path: '.env' });

const logFile = 'logs/sierra_diagnostic_result.txt';
let logContent = '';

function log(msg) {
  console.log(msg);
  logContent += msg + '\n';
}

function saveLog() {
  fs.writeFileSync(logFile, logContent);
  console.log(`\n📄 Résultats sauvegardés dans: ${logFile}`);
}

const sierraConfig = {
  host: process.env.SIERRACHART_HOST || 'localhost',
  port: parseInt(process.env.SIERRACHART_PORT) || 11099,
  username: process.env.SIERRACHART_USERNAME || '',
  password: process.env.SIERRACHART_PASSWORD || ''
};

log('='.repeat(60));
log('DIAGNOSTIC SIERRACHART DTC');
log('='.repeat(60));
log(`Date: ${new Date().toISOString()}`);
log(`Host: ${sierraConfig.host}`);
log(`Port: ${sierraConfig.port}`);
log(`Username: ${sierraConfig.username || '(vide)'}`);
log('');

const socket = new net.Socket();
let messageCount = 0;

socket.connect(sierraConfig.port, sierraConfig.host, () => {
  log('[OK] Socket TCP connecté');
  log('');
  log('>> Envoi EncodingRequest (JSON)...');
  
  const jsonRequest = JSON.stringify({
    Type: 'EncodingRequest',
    ProtocolVersion: 8,
    Encoding: 2,
    ProtocolType: 'DTC'
  }) + '\x00';
  
  socket.write(jsonRequest);
});

socket.on('data', (data) => {
  messageCount++;
  log('');
  log(`[MESSAGE ${messageCount}] ${data.length} bytes`);
  
  // Hex dump (premiers 64 bytes)
  const hex = Array.from(data.slice(0, 64)).map(b => b.toString(16).padStart(2, '0')).join(' ');
  log(`HEX: ${hex}`);
  
  // ASCII
  const ascii = data.toString('utf8').replace(/[\x00-\x1F]/g, ' ').substring(0, 500);
  log(`ASCII: ${ascii}`);
  
  // Essayer JSON
  const text = data.toString('utf8').replace(/\x00/g, '');
  if (text.includes('{')) {
    try {
      const jsonStr = text.split(/\x00|\n/).filter(s => s.includes('{')).pop() || text;
      const json = JSON.parse(jsonStr);
      log(`JSON Type: ${json.Type}`);
      log(`JSON Full: ${JSON.stringify(json, null, 2)}`);
      
      if (json.Type === 'EncodingResponse') {
        log('');
        log('[OK] EncodingResponse reçu!');
        log('>> Envoi LogonRequest...');
        
        setTimeout(() => {
          const logon = JSON.stringify({
            Type: 'LogonRequest',
            ProtocolVersion: 8,
            Username: sierraConfig.username,
            Password: sierraConfig.password,
            GeneralTextData: 'NodeJS Diagnostic',
            HeartbeatIntervalInSeconds: 30
          }) + '\x00';
          socket.write(logon);
        }, 500);
      }
      
      if (json.Type === 'LogonResponse') {
        log('');
        log('='.repeat(40));
        log('LOGON RESPONSE');
        log('='.repeat(40));
        log(`Result: ${json.Result}`);
        log(`ResultText: ${json.ResultText}`);
        log(`ServerName: ${json.ServerName}`);
        
        if (json.Result === 1) {
          log('[OK] AUTHENTIFICATION REUSSIE!');
          
          setTimeout(() => {
            log('');
            log('>> Envoi MarketDataRequest ES...');
            const md = JSON.stringify({
              Type: 'MarketDataRequest',
              RequestAction: 1,
              SymbolID: 1,
              Symbol: 'ES',
              Exchange: ''
            }) + '\x00';
            socket.write(md);
          }, 1000);
        } else {
          log('[ECHEC] Authentification échouée');
          log('');
          log('VERIFICATIONS:');
          log('1. Username/Password dans .env match ceux de SierraChart');
          log('2. DTC Server est activé dans SierraChart');
        }
      }
      
      if (json.Type === 'MarketDataSnapshot') {
        log('');
        log('='.repeat(40));
        log('MARKET DATA SNAPSHOT');
        log('='.repeat(40));
        log(`Symbol: ${json.Symbol || json.SymbolID}`);
        log(`Last: ${json.LastTradePrice}`);
        log(`Bid: ${json.BidPrice}`);
        log(`Ask: ${json.AskPrice}`);
      }
      
      if (json.Type === 'MarketDataReject') {
        log('[REJECT] MarketData refusé: ' + json.RejectText);
      }
      
    } catch (e) {
      log(`JSON Parse Error: ${e.message}`);
    }
  }
  
  // Binary DTC
  if (data.length >= 4) {
    const size = data.readUInt16LE(0);
    const type = data.readUInt16LE(2);
    log(`Binary DTC: Size=${size}, Type=${type}`);
  }
});

socket.on('error', (error) => {
  log(`[ERREUR] ${error.message}`);
  saveLog();
});

socket.on('close', () => {
  log('');
  log('[FIN] Connexion fermée');
  log(`Total messages reçus: ${messageCount}`);
  saveLog();
});

setTimeout(() => {
  log('');
  log('[TIMEOUT] 20 secondes écoulées');
  saveLog();
  socket.destroy();
}, 20000);

process.on('SIGINT', () => {
  saveLog();
  socket.destroy();
});
