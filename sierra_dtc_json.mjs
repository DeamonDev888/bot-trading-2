#!/usr/bin/env node
/**
 * 🔍 SIERRACHART DTC CLIENT - Format JSON pur
 * 
 * SierraChart envoie du JSON null-terminated sans header binaire
 */

import net from 'net';

const DTC_HOST = 'localhost';
const DTC_PORT = 11099;

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║           📡 SIERRACHART DTC CLIENT (JSON Mode)                    ║
╚════════════════════════════════════════════════════════════════════╝
`);

const SYMBOLS = ['AAPL', 'BTCUSDT_PERP_BINANCE', 'XAUUSD', 'MESZ25-CME'];

const client = new net.Socket();
let buffer = '';
let loggedIn = false;
let symbolUpdates = {};
SYMBOLS.forEach(s => symbolUpdates[s] = { updates: 0, lastPrice: null });

// Parser JSON null-terminated
function parseMessages(data) {
    buffer += data.toString('utf8');
    
    // Split par null character
    const parts = buffer.split('\0');
    buffer = parts.pop() || ''; // Garder le dernier morceau incomplet
    
    for (const part of parts) {
        if (!part.trim()) continue;
        
        try {
            const msg = JSON.parse(part);
            handleMessage(msg);
        } catch (e) {
            // Peut-être plusieurs JSON concaténés
            const jsonMatches = part.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
            if (jsonMatches) {
                jsonMatches.forEach(j => {
                    try {
                        handleMessage(JSON.parse(j));
                    } catch {}
                });
            }
        }
    }
}

function handleMessage(msg) {
    const type = msg.Type;
    
    switch (type) {
        case 7: // ENCODING_RESPONSE
            console.log('✅ Encoding accepté:', msg.Encoding === 2 ? 'JSON' : msg.Encoding);
            sendLogon();
            break;
            
        case 2: // LOGON_RESPONSE
            console.log('✅ Logon accepté!');
            console.log(`   Server: ${msg.ServerName || 'SierraChart'}`);
            console.log(`   Protocol: ${msg.ProtocolVersion}`);
            loggedIn = true;
            setTimeout(subscribeSymbols, 500);
            break;
            
        case 3: // HEARTBEAT
            // Répondre au heartbeat
            client.write(JSON.stringify({ Type: 3 }) + '\0');
            break;
            
        case 103: // MARKET_DATA_REJECT
            console.log(`❌ Rejet pour SymbolID ${msg.SymbolID}: ${msg.RejectText}`);
            break;
            
        case 104: // MARKET_DATA_SNAPSHOT
            const symbol = SYMBOLS[msg.SymbolID - 1] || `ID:${msg.SymbolID}`;
            console.log(`📊 SNAPSHOT ${symbol}:`);
            console.log(`   Last: ${msg.LastTradePrice} | Bid: ${msg.BidPrice} | Ask: ${msg.AskPrice}`);
            symbolUpdates[symbol] = { updates: 1, lastPrice: msg.LastTradePrice };
            break;
            
        case 107: // MARKET_DATA_UPDATE_TRADE
            const sym1 = SYMBOLS[msg.SymbolID - 1] || `ID:${msg.SymbolID}`;
            if (symbolUpdates[sym1]) {
                symbolUpdates[sym1].updates++;
                symbolUpdates[sym1].lastPrice = msg.Price;
            }
            console.log(`📈 TRADE ${sym1}: ${msg.Price} (vol: ${msg.Volume})`);
            break;
            
        case 108: // MARKET_DATA_UPDATE_BID_ASK
            const sym2 = SYMBOLS[msg.SymbolID - 1] || `ID:${msg.SymbolID}`;
            if (symbolUpdates[sym2]) {
                symbolUpdates[sym2].updates++;
            }
            console.log(`📊 BID/ASK ${sym2}: ${msg.BidPrice} / ${msg.AskPrice}`);
            break;
            
        case 507: // SECURITY_DEFINITION_RESPONSE
            console.log(`📋 Security: ${msg.Symbol} - ${msg.SecurityExchange}`);
            break;
            
        default:
            console.log(`📦 Message Type ${type}:`, JSON.stringify(msg).slice(0, 100));
    }
}

function sendLogon() {
    console.log('📤 Envoi LOGON_REQUEST...');
    const logon = {
        Type: 1,
        ProtocolVersion: 8,
        Username: "",
        Password: "",
        HeartbeatIntervalInSeconds: 30,
        ClientName: "NodeJS DTC Client"
    };
    client.write(JSON.stringify(logon) + '\0');
}

function subscribeSymbols() {
    console.log('\n📊 Abonnement aux symboles...\n');
    
    SYMBOLS.forEach((symbol, index) => {
        setTimeout(() => {
            const request = {
                Type: 101, // MARKET_DATA_REQUEST
                RequestAction: 1, // SUBSCRIBE
                SymbolID: index + 1,
                Symbol: symbol,
                Exchange: ""
            };
            console.log(`   📡 Subscribe: ${symbol}`);
            client.write(JSON.stringify(request) + '\0');
        }, index * 300);
    });
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📡 EN ATTENTE DE DONNÉES TEMPS RÉEL (30 secondes)...');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    setTimeout(showSummary, 30000);
}

function showSummary() {
    console.log(`
═══════════════════════════════════════════════════════════════════
📊 RÉSUMÉ
═══════════════════════════════════════════════════════════════════
`);
    
    let activeCount = 0;
    for (const [symbol, data] of Object.entries(symbolUpdates)) {
        const status = data.updates > 0 ? '🟢 ACTIF' : '🔴 PAS DE DATA';
        const price = data.lastPrice ? data.lastPrice.toFixed(2) : 'N/A';
        console.log(`   ${symbol.padEnd(25)} ${status} | ${data.updates} updates | $${price}`);
        if (data.updates > 0) activeCount++;
    }
    
    console.log(`\n   📊 Total: ${activeCount}/${SYMBOLS.length} symboles actifs`);
    
    if (activeCount === 0) {
        console.log(`
⚠️  AUCUNE DONNÉE REÇUE

   Vérifiez dans SierraChart:
   1. Les marchés sont-ils ouverts?
   2. Les charts montrent-ils des prix?
   3. Global Settings > SC Server Settings
      - "Broadcast to Remote Clients" = Yes
`);
    } else {
        console.log('\n✅ Le temps réel fonctionne!');
    }
    
    client.destroy();
    process.exit(0);
}

// Connexion
client.connect(DTC_PORT, DTC_HOST, () => {
    console.log('✅ Connecté à', DTC_HOST + ':' + DTC_PORT);
    
    // Demander encoding JSON
    console.log('📤 Demande encoding JSON...');
    const encodingRequest = {
        Type: 6, // ENCODING_REQUEST
        ProtocolVersion: 8,
        Encoding: 2, // JSON
        ProtocolType: "DTC"
    };
    client.write(JSON.stringify(encodingRequest) + '\0');
});

client.on('data', parseMessages);

client.on('error', (err) => {
    console.log('❌ Erreur:', err.message);
});

client.on('close', () => {
    console.log('🔌 Connexion fermée');
});

// Timeout
setTimeout(() => {
    console.log('\n⏱️ Timeout');
    showSummary();
}, 35000);
