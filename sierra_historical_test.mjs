#!/usr/bin/env node
/**
 * 📜 SERVEUR HISTORIQUE (Port 11098) - TEST COMPLET
 */

import net from 'net';

const DTC_HOST = 'localhost';
const DTC_PORT = 11098; // Historical Data Server

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║      📜 SIERRACHART HISTORICAL SERVER - TEST COMPLET               ║
╚════════════════════════════════════════════════════════════════════╝

   Port: ${DTC_PORT} (SC HistoricalDataServer)
`);

const client = new net.Socket();
let buffer = '';
let serverCapabilities = {};

function sendMessage(obj) {
    client.write(JSON.stringify(obj) + '\0');
    console.log(`📤 Type ${obj.Type}`);
}

function parseMessages(data) {
    buffer += data.toString('utf8');
    const parts = buffer.split('\0');
    buffer = parts.pop() || '';
    
    for (const part of parts) {
        if (!part.trim()) continue;
        try {
            handleMessage(JSON.parse(part));
        } catch (e) {}
    }
}

function handleMessage(msg) {
    switch (msg.Type) {
        case 7: // ENCODING_RESPONSE
            console.log('✅ Encoding JSON accepté\n');
            sendMessage({
                Type: 1,
                ProtocolVersion: 8,
                Username: "Deamon888",
                Password: "",
                HeartbeatIntervalInSeconds: 60,
                ClientName: "Historical Test"
            });
            break;
            
        case 2: // LOGON_RESPONSE
            serverCapabilities = msg;
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('📋 CAPACITÉS DU SERVEUR HISTORIQUE');
            console.log('═══════════════════════════════════════════════════════════════\n');
            
            console.log(`   Serveur: ${msg.ServerName}`);
            console.log(`   Result: ${msg.Result === 1 ? '✅ Succès' : '❌ Échec'}`);
            console.log('');
            
            // Afficher toutes les capacités
            console.log('   Capacités:');
            console.log(`      TradingIsSupported: ${msg.TradingIsSupported ? '✅' : '❌'}`);
            console.log(`      MarketDataSupported: ${msg.MarketDataSupported ? '✅' : '❌'}`);
            console.log(`      HistoricalPriceDataSupported: ${msg.HistoricalPriceDataSupported ? '✅' : '❌'}`);
            console.log(`      SecurityDefinitionsSupported: ${msg.SecurityDefinitionsSupported ? '✅' : '❌'}`);
            console.log(`      AccountBalanceUpdatesSupported: ${msg.AccountBalanceUpdatesSupported ? '✅' : '❌'}`);
            console.log(`      MarketDepthIsSupported: ${msg.MarketDepthIsSupported ? '✅' : '❌'}`);
            
            setTimeout(runTests, 1000);
            break;
            
        case 3: // HEARTBEAT
            sendMessage({ Type: 3 });
            break;
            
        case 507: // SECURITY_DEFINITION_RESPONSE
            console.log(`   📋 Security: ${msg.Symbol} - ${msg.Description}`);
            break;
            
        case 801: // HISTORICAL_PRICE_DATA_HEADER_RESPONSE
            console.log(`\n   📜 HISTORICAL HEADER:`);
            console.log(`      RequestID: ${msg.RequestID}`);
            console.log(`      RecordInterval: ${msg.RecordInterval}`);
            console.log(`      NoRecordsToReturn: ${msg.NoRecordsToReturn}`);
            break;
            
        case 802: // HISTORICAL_PRICE_DATA_REJECT
            console.log(`\n   ❌ HISTORICAL REJECT:`);
            console.log(`      RejectText: ${msg.RejectText}`);
            console.log(`      RejectReasonCode: ${msg.RejectReasonCode}`);
            break;
            
        case 803: // HISTORICAL_PRICE_DATA_RECORD_RESPONSE
            const date = new Date(msg.StartDateTime * 1000);
            console.log(`   📊 ${date.toISOString()} | O:${msg.OpenPrice?.toFixed(2)} H:${msg.HighPrice?.toFixed(2)} L:${msg.LowPrice?.toFixed(2)} C:${msg.LastPrice?.toFixed(2)} V:${msg.Volume}`);
            break;
            
        case 804: // HISTORICAL_PRICE_DATA_RECORD_FINAL
            console.log(`\n   ✅ FIN DES DONNÉES HISTORIQUES`);
            break;
            
        case 103: // MARKET_DATA_REJECT
            console.log(`   ❌ Market Data Reject: ${msg.RejectText}`);
            break;
            
        case 104: // MARKET_DATA_SNAPSHOT
            console.log(`   🎯 SNAPSHOT: ${msg.Symbol} Last=${msg.LastTradePrice}`);
            break;
            
        default:
            if (msg.Type !== 3) {
                console.log(`   📦 Type ${msg.Type}:`, JSON.stringify(msg).slice(0, 150));
            }
    }
}

function runTests() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🧪 TESTS DU SERVEUR HISTORIQUE');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Test 1: Security Definition
    console.log('📋 Test 1: Security Definition...');
    sendMessage({
        Type: 506,
        RequestID: 1,
        Symbol: "BTCUSDT_PERP_BINANCE",
        Exchange: ""
    });
    
    // Test 2: Historical Data Request
    setTimeout(() => {
        console.log('\n📜 Test 2: Historical Data Request (dernière heure)...');
        const now = Math.floor(Date.now() / 1000);
        sendMessage({
            Type: 800,
            RequestID: 10,
            Symbol: "BTCUSDT_PERP_BINANCE",
            Exchange: "",
            RecordInterval: 60, // 1 minute
            StartDateTime: now - 3600,
            EndDateTime: now,
            MaxDaysToReturn: 1,
            UseZLibCompression: 0
        });
    }, 1000);
    
    // Test 3: Market Data (probablement bloqué)
    setTimeout(() => {
        console.log('\n📡 Test 3: Market Data Request...');
        sendMessage({
            Type: 101,
            RequestAction: 1,
            SymbolID: 1,
            Symbol: "BTCUSDT_PERP_BINANCE",
            Exchange: ""
        });
    }, 3000);
    
    // Test 4: Symbols List
    setTimeout(() => {
        console.log('\n📋 Test 4: Symbols for Exchange...');
        sendMessage({
            Type: 502,
            RequestID: 20,
            Exchange: ""
        });
    }, 4000);
    
    // Résumé
    setTimeout(() => {
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('💡 RÉSUMÉ SERVEUR HISTORIQUE (Port 11098)');
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        console.log(`   HistoricalPriceDataSupported: ${serverCapabilities.HistoricalPriceDataSupported ? '✅ Oui' : '❌ Non'}`);
        console.log(`   MarketDataSupported: ${serverCapabilities.MarketDataSupported ? '✅ Oui' : '❌ Non'}`);
        console.log(`   TradingIsSupported: ${serverCapabilities.TradingIsSupported ? '✅ Oui' : '❌ Non'}`);
        
        console.log(`
   Ce serveur est spécialisé pour:
   - Données historiques (OHLCV)
   - Mais les requêtes sont souvent rejetées ("not authorized")
   
   📌 Raison probable: Les données historiques via DTC sont
      aussi restreintes par les règles des exchanges.
   
   💡 Solution: Lire les fichiers .scid directement
      (contiennent TOUTES les données historiques!)
`);
        
        client.destroy();
        process.exit(0);
    }, 8000);
}

client.connect(DTC_PORT, DTC_HOST, () => {
    console.log('✅ Connecté au serveur historique\n');
    sendMessage({
        Type: 6,
        ProtocolVersion: 8,
        Encoding: 2,
        ProtocolType: "DTC"
    });
});

client.on('data', parseMessages);
client.on('error', (err) => console.log('❌ Erreur:', err.message));
client.on('close', () => {});
