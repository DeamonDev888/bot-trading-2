#!/usr/bin/env node
/**
 * 🔍 SIERRACHART DTC DEBUG - Diagnostic détaillé
 */

import net from 'net';

const DTC_HOST = 'localhost';
const DTC_PORT = 11099;

// Types de messages DTC
const DTC_MESSAGE_TYPES = {
    LOGON_REQUEST: 1,
    LOGON_RESPONSE: 2,
    HEARTBEAT: 3,
    MARKET_DATA_REQUEST: 101,
    MARKET_DATA_REJECT: 103,
    MARKET_DATA_SNAPSHOT: 104,
    MARKET_DATA_UPDATE_TRADE: 107,
    MARKET_DATA_UPDATE_BID_ASK: 108,
    SECURITY_DEFINITION_FOR_SYMBOL_REQUEST: 506,
    SECURITY_DEFINITION_RESPONSE: 507,
};

// Encodings
const DTC_ENCODING = {
    BINARY: 0,
    BINARY_VARLENGTH: 1,
    JSON: 2,
    JSON_COMPACT: 3,
    PROTOCOL_BUFFERS: 4,
};

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║               🔍 SIERRACHART DTC DEBUG                             ║
╚════════════════════════════════════════════════════════════════════╝
`);

// Symboles à tester - ceux qui fonctionnent dans SierraChart
const SYMBOLS = [
    'AAPL',
    'BTCUSDT_PERP_BINANCE',
    'XAUUSD',
    'MESZ25-CME'
];

const client = new net.Socket();
let connected = false;
let loggedIn = false;
let rawDataReceived = 0;
let messagesReceived = [];

client.connect(DTC_PORT, DTC_HOST, () => {
    console.log('✅ Socket connecté à', DTC_HOST + ':' + DTC_PORT);
    connected = true;
    
    // Essayons d'abord en encoding JSON (plus facile à débugger)
    console.log('\n📤 Envoi ENCODING_REQUEST (JSON)...');
    
    // Format: 2 bytes size + 2 bytes type + payload
    const encodingRequest = {
        Type: 6, // ENCODING_REQUEST
        ProtocolVersion: 8,
        Encoding: DTC_ENCODING.JSON,
        ProtocolType: "DTC"
    };
    
    const jsonStr = JSON.stringify(encodingRequest) + '\0';
    const buffer = Buffer.alloc(4 + jsonStr.length);
    buffer.writeUInt16LE(4 + jsonStr.length, 0); // Size
    buffer.writeUInt16LE(6, 2); // Type = ENCODING_REQUEST
    buffer.write(jsonStr, 4);
    
    client.write(buffer);
});

client.on('data', (data) => {
    rawDataReceived += data.length;
    console.log(`\n📥 Données reçues: ${data.length} bytes`);
    
    // Afficher les premiers bytes en hex
    const hexPreview = data.slice(0, Math.min(100, data.length)).toString('hex');
    console.log(`   Hex: ${hexPreview}`);
    
    // Essayer de parser comme binaire DTC
    try {
        let offset = 0;
        while (offset < data.length - 4) {
            const size = data.readUInt16LE(offset);
            const type = data.readUInt16LE(offset + 2);
            
            if (size < 4 || size > 10000) break;
            
            console.log(`\n   📦 Message: Type=${type}, Size=${size}`);
            
            // Essayer de lire le contenu
            const payload = data.slice(offset + 4, offset + size);
            
            // Si ça ressemble à du JSON
            if (payload[0] === 0x7B) { // '{'
                try {
                    const nullIdx = payload.indexOf(0);
                    const jsonEnd = nullIdx > 0 ? nullIdx : payload.length;
                    const jsonStr = payload.slice(0, jsonEnd).toString('utf8');
                    const json = JSON.parse(jsonStr);
                    console.log(`   📄 JSON:`, JSON.stringify(json, null, 2).split('\n').slice(0, 10).join('\n'));
                    messagesReceived.push({ type, json });
                    
                    // Si c'est une réponse d'encoding, envoyer logon
                    if (type === 7) { // ENCODING_RESPONSE
                        console.log('\n✅ Encoding accepté! Envoi LOGON_REQUEST...');
                        sendLogonJSON();
                    }
                    
                    // Si c'est une réponse de logon
                    if (type === 2) { // LOGON_RESPONSE
                        console.log('\n✅ Logon accepté! Envoi des abonnements...');
                        loggedIn = true;
                        setTimeout(subscribeSymbols, 500);
                    }
                    
                } catch (e) {
                    console.log(`   ⚠️ Payload non-JSON:`, payload.slice(0, 50).toString('utf8'));
                }
            } else {
                // Binaire - afficher hex
                console.log(`   📊 Binaire:`, payload.slice(0, 50).toString('hex'));
                
                // Si type 2 (LOGON_RESPONSE) en binaire
                if (type === 2 && !loggedIn) {
                    console.log('\n✅ Logon response binaire reçu');
                    loggedIn = true;
                    setTimeout(subscribeSymbols, 500);
                }
            }
            
            offset += size;
            if (size === 0) break;
        }
    } catch (e) {
        console.log(`   ❌ Parse error:`, e.message);
    }
});

function sendLogonJSON() {
    const logon = {
        Type: 1,
        ProtocolVersion: 8,
        Username: "",
        Password: "",
        GeneralTextData: "",
        Integer_1: 0,
        Integer_2: 0,
        HeartbeatIntervalInSeconds: 30,
        TradeMode: 0,
        TradePlatform: "",
        TradeAccount: "",
        HardwareIdentifier: "",
        ClientName: "NodeJS DTC Debug"
    };
    
    const jsonStr = JSON.stringify(logon) + '\0';
    const buffer = Buffer.alloc(4 + jsonStr.length);
    buffer.writeUInt16LE(4 + jsonStr.length, 0);
    buffer.writeUInt16LE(1, 2); // LOGON_REQUEST
    buffer.write(jsonStr, 4);
    
    console.log('📤 Envoi LOGON_REQUEST JSON...');
    client.write(buffer);
}

function subscribeSymbols() {
    console.log('\n📊 Abonnement aux symboles...');
    
    SYMBOLS.forEach((symbol, index) => {
        setTimeout(() => {
            // MARKET_DATA_REQUEST
            const request = {
                Type: 101,
                RequestAction: 1, // SUBSCRIBE
                SymbolID: index + 1,
                Symbol: symbol,
                Exchange: ""
            };
            
            const jsonStr = JSON.stringify(request) + '\0';
            const buffer = Buffer.alloc(4 + jsonStr.length);
            buffer.writeUInt16LE(4 + jsonStr.length, 0);
            buffer.writeUInt16LE(101, 2);
            buffer.write(jsonStr, 4);
            
            console.log(`   📡 Subscribe: ${symbol} (ID=${index + 1})`);
            client.write(buffer);
        }, index * 200);
    });
    
    // Attendre et afficher le résumé
    setTimeout(showSummary, 15000);
}

function showSummary() {
    console.log(`
═══════════════════════════════════════════════════════════════════
📊 RÉSUMÉ DEBUG
═══════════════════════════════════════════════════════════════════

   Connecté: ${connected ? '✅' : '❌'}
   Logged In: ${loggedIn ? '✅' : '❌'}
   Données reçues: ${rawDataReceived} bytes
   Messages parsés: ${messagesReceived.length}

`);

    if (messagesReceived.length > 0) {
        console.log('   Messages reçus par type:');
        const typeCounts = {};
        messagesReceived.forEach(m => {
            typeCounts[m.type] = (typeCounts[m.type] || 0) + 1;
        });
        Object.entries(typeCounts).forEach(([type, count]) => {
            const typeName = Object.entries(DTC_MESSAGE_TYPES).find(([k, v]) => v === parseInt(type))?.[0] || 'UNKNOWN';
            console.log(`      Type ${type} (${typeName}): ${count}`);
        });
    }
    
    console.log(`
═══════════════════════════════════════════════════════════════════
💡 PROCHAINES ÉTAPES
═══════════════════════════════════════════════════════════════════

   Si pas de données temps réel, vérifiez dans SierraChart:
   
   1. Global Settings > SC Server Settings
   2. Assurez-vous que "Allow Incoming Connections" = Yes
   3. Port = 11099
   4. "Remote Data Feed Mode" peut être désactivé
   
   OU essayez le port 11098 (parfois utilisé par défaut)
`);

    client.destroy();
    process.exit(0);
}

client.on('error', (err) => {
    console.log('❌ Erreur:', err.message);
});

client.on('close', () => {
    console.log('🔌 Connexion fermée');
});

// Timeout global
setTimeout(() => {
    console.log('\n⏱️ Timeout - arrêt du test');
    showSummary();
}, 20000);
