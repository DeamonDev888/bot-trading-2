#!/usr/bin/env node
/**
 * 🔍 DTC Protocol Explorer - Test différents formats de requêtes
 */

import net from 'net';

const DTC_HOST = 'localhost';
const DTC_PORT = 11099;

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║           📡 DTC PROTOCOL EXPLORER                                 ║
╚════════════════════════════════════════════════════════════════════╝
`);

const SYMBOLS = ['AAPL', 'BTCUSDT_PERP_BINANCE', 'XAUUSD'];

const client = new net.Socket();
let buffer = '';
let testPhase = 0;

function parseMessages(data) {
    buffer += data.toString('utf8');
    const parts = buffer.split('\0');
    buffer = parts.pop() || '';
    
    for (const part of parts) {
        if (!part.trim()) continue;
        try {
            const msg = JSON.parse(part);
            handleMessage(msg);
        } catch (e) {
            console.log('📦 Raw:', part.slice(0, 200));
        }
    }
}

function handleMessage(msg) {
    const type = msg.Type;
    console.log(`\n📥 Message Type ${type}:`, JSON.stringify(msg, null, 2).slice(0, 500));
    
    switch (type) {
        case 7: // ENCODING_RESPONSE
            console.log('\n✅ Encoding OK, envoi Logon...');
            sendMessage({
                Type: 1,
                ProtocolVersion: 8,
                Username: "",
                Password: "",
                HeartbeatIntervalInSeconds: 60,
                ClientName: "DTC Explorer"
            });
            break;
            
        case 2: // LOGON_RESPONSE
            console.log('\n✅ Logon OK!');
            setTimeout(runTests, 1000);
            break;
            
        case 3: // HEARTBEAT
            sendMessage({ Type: 3 });
            break;
            
        case 103: // MARKET_DATA_REJECT
            console.log(`\n❌ REJECT: ${msg.RejectText}`);
            break;
            
        case 104: // MARKET_DATA_SNAPSHOT
            console.log(`\n🎯 SNAPSHOT REÇU! Symbol: ${msg.Symbol}, Last: ${msg.LastTradePrice}`);
            break;
            
        case 507: // SECURITY_DEFINITION_RESPONSE
            console.log(`\n📋 Security: ${msg.Symbol} | Exchange: ${msg.SecurityExchange}`);
            if (msg.Symbol) {
                // Essayer de s'abonner à ce symbole
                console.log('   -> Tentative d\'abonnement...');
                sendMessage({
                    Type: 101,
                    RequestAction: 1,
                    SymbolID: 100,
                    Symbol: msg.Symbol,
                    Exchange: msg.SecurityExchange || ""
                });
            }
            break;
    }
}

function sendMessage(obj) {
    const json = JSON.stringify(obj) + '\0';
    client.write(json);
    console.log(`📤 Envoyé Type ${obj.Type}:`, JSON.stringify(obj).slice(0, 200));
}

function runTests() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🧪 TESTS DES DIFFÉRENTS FORMATS DE REQUÊTES');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Test 1: Security Definition Request
    console.log('📋 Test 1: SECURITY_DEFINITION_FOR_SYMBOL_REQUEST...');
    sendMessage({
        Type: 506,
        RequestID: 1,
        Symbol: "AAPL",
        Exchange: ""
    });
    
    setTimeout(() => {
        // Test 2: Market Data Request avec différents RequestAction
        console.log('\n📋 Test 2: MARKET_DATA_REQUEST avec RequestAction=1 (Subscribe)...');
        sendMessage({
            Type: 101,
            RequestAction: 1,
            SymbolID: 1,
            Symbol: "AAPL",
            Exchange: ""
        });
    }, 2000);
    
    setTimeout(() => {
        // Test 3: Market Data Request format alternatif
        console.log('\n📋 Test 3: MARKET_DATA_REQUEST format alternatif...');
        sendMessage({
            Type: 101,
            SymbolID: 2,
            Symbol: "BTCUSDT_PERP_BINANCE",
            Exchange: "",
            RequestAction: 1,
            IntervalForSnapshotUpdatesInMilliseconds: 0
        });
    }, 4000);
    
    setTimeout(() => {
        // Test 4: Market Depth Request
        console.log('\n📋 Test 4: MARKET_DEPTH_REQUEST (Type 102)...');
        sendMessage({
            Type: 102,
            RequestAction: 1,
            SymbolID: 3,
            Symbol: "XAUUSD",
            Exchange: "",
            NumLevels: 10
        });
    }, 6000);
    
    setTimeout(() => {
        // Test 5: Historical Data Request
        console.log('\n📋 Test 5: HISTORICAL_PRICE_DATA_REQUEST (Type 800)...');
        sendMessage({
            Type: 800,
            RequestID: 10,
            Symbol: "AAPL",
            Exchange: "",
            RecordInterval: 60, // 1 minute
            StartDateTime: Date.now() / 1000 - 3600, // 1 hour ago
            EndDateTime: Date.now() / 1000,
            MaxDaysToReturn: 1,
            UseZLibCompression: 0
        });
    }, 8000);
    
    setTimeout(() => {
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('📊 TESTS TERMINÉS');
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        console.log('Observation des réponses pendant 20 secondes supplémentaires...\n');
    }, 10000);
    
    setTimeout(() => {
        console.log('\n🏁 Fin du test');
        client.destroy();
        process.exit(0);
    }, 30000);
}

client.connect(DTC_PORT, DTC_HOST, () => {
    console.log('✅ Connecté à', DTC_HOST + ':' + DTC_PORT);
    
    // Demander encoding JSON
    sendMessage({
        Type: 6,
        ProtocolVersion: 8,
        Encoding: 2,
        ProtocolType: "DTC"
    });
});

client.on('data', parseMessages);

client.on('error', (err) => {
    console.log('❌ Erreur:', err.message);
});

client.on('close', () => {
    console.log('🔌 Connexion fermée');
});
