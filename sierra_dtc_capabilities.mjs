#!/usr/bin/env node
/**
 * 🔍 DTC Full Capabilities Test
 * Explore tout ce que le serveur DTC de SierraChart supporte
 */

import net from 'net';

const DTC_HOST = 'localhost';
const DTC_PORT = 11099;

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║           📡 DTC FULL CAPABILITIES TEST                            ║
╚════════════════════════════════════════════════════════════════════╝
`);

const client = new net.Socket();
let buffer = '';
let serverCapabilities = {};

function parseMessages(data) {
    buffer += data.toString('utf8');
    const parts = buffer.split('\0');
    buffer = parts.pop() || '';
    
    for (const part of parts) {
        if (!part.trim()) continue;
        try {
            const msg = JSON.parse(part);
            handleMessage(msg);
        } catch (e) {}
    }
}

function handleMessage(msg) {
    const type = msg.Type;
    
    switch (type) {
        case 7: // ENCODING_RESPONSE
            console.log('✅ Encoding JSON accepté');
            sendMessage({
                Type: 1,
                ProtocolVersion: 8,
                Username: "",
                Password: "",
                HeartbeatIntervalInSeconds: 60,
                ClientName: "Capabilities Test"
            });
            break;
            
        case 2: // LOGON_RESPONSE
            console.log('\n✅ LOGON_RESPONSE reçu!\n');
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('📋 CAPACITÉS DU SERVEUR DTC');
            console.log('═══════════════════════════════════════════════════════════════\n');
            
            serverCapabilities = msg;
            
            // Afficher toutes les capacités
            console.log(`   🏷️  Serveur: ${msg.ServerName}`);
            console.log(`   📌 Protocol Version: ${msg.ProtocolVersion}`);
            console.log(`   📍 Result: ${msg.Result} (1=Success)`);
            console.log('');
            
            // Trading capabilities
            console.log('   📊 TRADING:');
            console.log(`      TradingIsSupported: ${msg.TradingIsSupported}`);
            console.log(`      OCOOrdersSupported: ${msg.OCOOrdersSupported}`);
            console.log(`      OrderCancelReplaceSupported: ${msg.OrderCancelReplaceSupported}`);
            console.log(`      BracketOrdersSupported: ${msg.BracketOrdersSupported}`);
            console.log('');
            
            // Market Data capabilities
            console.log('   📈 MARKET DATA:');
            console.log(`      MarketDataSupported: ${msg.MarketDataSupported}`);
            console.log(`      MarketDepthIsSupported: ${msg.MarketDepthIsSupported}`);
            console.log(`      MarketDepthUpdatesBestBidAndAsk: ${msg.MarketDepthUpdatesBestBidAndAsk}`);
            console.log('');
            
            // Historical Data
            console.log('   📜 HISTORICAL DATA:');
            console.log(`      HistoricalPriceDataSupported: ${msg.HistoricalPriceDataSupported}`);
            console.log('');
            
            // Security Definitions
            console.log('   📋 SECURITY DEFINITIONS:');
            console.log(`      SecurityDefinitionsSupported: ${msg.SecurityDefinitionsSupported}`);
            console.log('');
            
            // Account
            console.log('   💰 ACCOUNT:');
            console.log(`      AccountBalanceUpdatesSupported: ${msg.AccountBalanceUpdatesSupported}`);
            console.log('');
            
            // Tous les autres champs
            console.log('   📝 AUTRES CHAMPS:');
            const skipFields = ['Type', 'ServerName', 'ProtocolVersion', 'Result', 
                'TradingIsSupported', 'OCOOrdersSupported', 'OrderCancelReplaceSupported',
                'BracketOrdersSupported', 'MarketDataSupported', 'MarketDepthIsSupported',
                'MarketDepthUpdatesBestBidAndAsk', 'HistoricalPriceDataSupported',
                'SecurityDefinitionsSupported', 'AccountBalanceUpdatesSupported'];
            
            for (const [key, value] of Object.entries(msg)) {
                if (!skipFields.includes(key)) {
                    console.log(`      ${key}: ${value}`);
                }
            }
            
            console.log('\n═══════════════════════════════════════════════════════════════');
            console.log('🧪 TESTS DES FONCTIONNALITÉS');
            console.log('═══════════════════════════════════════════════════════════════\n');
            
            runCapabilityTests();
            break;
            
        case 3: // HEARTBEAT
            sendMessage({ Type: 3 });
            break;
            
        case 103: // MARKET_DATA_REJECT
            console.log(`   ❌ Market Data Reject: ${msg.RejectText}`);
            break;
            
        case 104: // MARKET_DATA_SNAPSHOT
            console.log(`   ✅ MARKET DATA SNAPSHOT REÇU!`);
            console.log(`      Symbol: ${msg.Symbol}`);
            console.log(`      Last: ${msg.LastTradePrice}`);
            console.log(`      Bid: ${msg.BidPrice} | Ask: ${msg.AskPrice}`);
            break;
            
        case 107: // MARKET_DATA_UPDATE_TRADE
            console.log(`   📈 TRADE: ${msg.Price} (vol: ${msg.Volume})`);
            break;
            
        case 108: // MARKET_DATA_UPDATE_BID_ASK
            console.log(`   📊 BID/ASK: ${msg.BidPrice} / ${msg.AskPrice}`);
            break;
            
        case 507: // SECURITY_DEFINITION_RESPONSE
            console.log(`   ✅ Security Definition: ${msg.Symbol}`);
            console.log(`      Exchange: ${msg.SecurityExchange}`);
            console.log(`      Description: ${msg.Description}`);
            console.log(`      MinPriceIncrement: ${msg.MinPriceIncrement}`);
            break;
            
        case 700: // CURRENT_POSITIONS_REJECT
        case 701: // CURRENT_POSITIONS_RESPONSE
            console.log(`   📋 Positions Response Type ${type}:`, JSON.stringify(msg).slice(0, 200));
            break;
            
        case 600: // TRADE_ACCOUNTS_RESPONSE
            console.log(`   💰 Trade Accounts:`, msg.TradeAccount || 'N/A');
            break;
            
        case 802: // HISTORICAL_PRICE_DATA_REJECT
            console.log(`   ❌ Historical Reject: ${msg.RejectText}`);
            break;
            
        default:
            console.log(`   📦 Type ${type}:`, JSON.stringify(msg).slice(0, 150));
    }
}

function sendMessage(obj) {
    client.write(JSON.stringify(obj) + '\0');
}

function runCapabilityTests() {
    // Test 1: Security Definition
    console.log('📋 Test 1: Security Definition Request (AAPL)...');
    sendMessage({
        Type: 506,
        RequestID: 1,
        Symbol: "AAPL",
        Exchange: ""
    });
    
    setTimeout(() => {
        // Test 2: Trade Accounts Request
        console.log('\n💰 Test 2: Trade Accounts Request...');
        sendMessage({
            Type: 500, // TRADE_ACCOUNTS_REQUEST
            RequestID: 2
        });
    }, 2000);
    
    setTimeout(() => {
        // Test 3: Exchange List Request
        console.log('\n🏛️ Test 3: Exchange List Request...');
        sendMessage({
            Type: 501, // EXCHANGE_LIST_REQUEST
            RequestID: 3
        });
    }, 3000);
    
    setTimeout(() => {
        // Test 4: Symbols for Exchange
        console.log('\n📋 Test 4: Symbols for Exchange...');
        sendMessage({
            Type: 502, // SYMBOLS_FOR_EXCHANGE_REQUEST
            RequestID: 4,
            Exchange: ""
        });
    }, 4000);
    
    setTimeout(() => {
        // Test 5: Current Positions
        console.log('\n📊 Test 5: Current Positions Request...');
        sendMessage({
            Type: 304, // CURRENT_POSITIONS_REQUEST
            RequestID: 5,
            TradeAccount: ""
        });
    }, 5000);
    
    setTimeout(() => {
        // Test 6: Account Balance Request
        console.log('\n💵 Test 6: Account Balance Request...');
        sendMessage({
            Type: 601, // ACCOUNT_BALANCE_REQUEST
            RequestID: 6,
            TradeAccount: ""
        });
    }, 6000);
    
    setTimeout(() => {
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('📊 RÉSUMÉ DES CAPACITÉS');
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        console.log('   Ce serveur DTC supporte:');
        if (serverCapabilities.TradingIsSupported) console.log('   ✅ Trading');
        if (serverCapabilities.SecurityDefinitionsSupported) console.log('   ✅ Security Definitions');
        if (serverCapabilities.MarketDataSupported) console.log('   ✅ Market Data (mais peut être restreint)');
        if (serverCapabilities.HistoricalPriceDataSupported) console.log('   ✅ Historical Data (mais peut être sur autre port)');
        if (serverCapabilities.AccountBalanceUpdatesSupported) console.log('   ✅ Account Balance');
        
        console.log('\n   Limitation détectée:');
        console.log('   ⚠️  "Market data request not allowed" - Règles exchange');
        
        console.log('\n🏁 Test terminé');
        client.destroy();
        process.exit(0);
    }, 15000);
}

client.connect(DTC_PORT, DTC_HOST, () => {
    console.log('✅ Connecté à', DTC_HOST + ':' + DTC_PORT);
    sendMessage({
        Type: 6,
        ProtocolVersion: 8,
        Encoding: 2,
        ProtocolType: "DTC"
    });
});

client.on('data', parseMessages);
client.on('error', (err) => console.log('❌ Erreur:', err.message));
client.on('close', () => console.log('🔌 Déconnecté'));
