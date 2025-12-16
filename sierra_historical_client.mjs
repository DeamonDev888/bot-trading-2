#!/usr/bin/env node
/**
 * 📜 SierraChart Historical Data Client
 * 
 * Connecte au port 11098 (HistoricalDataServer) pour obtenir les données
 */

import net from 'net';

const DTC_HOST = 'localhost';
const DTC_PORT = 11098; // Historical Data Port!

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║           📜 SIERRACHART HISTORICAL DATA CLIENT                    ║
╚════════════════════════════════════════════════════════════════════╝

   Port: ${DTC_PORT} (Historical Data Server)
`);

const SYMBOLS = ['BTCUSDT_PERP_BINANCE', 'AAPL', 'XAUUSD'];

const client = new net.Socket();
let buffer = '';
let historicalRecords = [];

function sendMessage(obj) {
    client.write(JSON.stringify(obj) + '\0');
    console.log(`📤 Envoyé Type ${obj.Type}`);
}

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
    switch (msg.Type) {
        case 7: // ENCODING_RESPONSE
            console.log('✅ Encoding accepté');
            sendMessage({
                Type: 1,
                ProtocolVersion: 8,
                HeartbeatIntervalInSeconds: 60,
                ClientName: "Historical Client"
            });
            break;
            
        case 2: // LOGON_RESPONSE
            console.log(`✅ Logon OK: ${msg.ServerName}`);
            console.log(`   HistoricalPriceDataSupported: ${msg.HistoricalPriceDataSupported}`);
            console.log(`   MarketDataSupported: ${msg.MarketDataSupported}`);
            
            setTimeout(requestHistoricalData, 1000);
            break;
            
        case 3: // HEARTBEAT
            sendMessage({ Type: 3 });
            break;
            
        case 801: // HISTORICAL_PRICE_DATA_HEADER_RESPONSE
            console.log(`\n📜 HISTORICAL HEADER:`);
            console.log(`   RequestID: ${msg.RequestID}`);
            console.log(`   RecordInterval: ${msg.RecordInterval}`);
            console.log(`   UseZLibCompression: ${msg.UseZLibCompression}`);
            console.log(`   NoRecordsToReturn: ${msg.NoRecordsToReturn}`);
            break;
            
        case 802: // HISTORICAL_PRICE_DATA_REJECT
            console.log(`\n❌ HISTORICAL REJECT:`);
            console.log(`   RejectText: ${msg.RejectText}`);
            console.log(`   RejectReasonCode: ${msg.RejectReasonCode}`);
            break;
            
        case 803: // HISTORICAL_PRICE_DATA_RECORD_RESPONSE
            const date = new Date(msg.StartDateTime * 1000);
            historicalRecords.push({
                time: date.toISOString(),
                open: msg.OpenPrice,
                high: msg.HighPrice,
                low: msg.LowPrice,
                close: msg.LastPrice,
                volume: msg.Volume
            });
            
            if (historicalRecords.length <= 5 || historicalRecords.length % 100 === 0) {
                console.log(`   📊 Record #${historicalRecords.length}: ${date.toISOString()} | O:${msg.OpenPrice} H:${msg.HighPrice} L:${msg.LowPrice} C:${msg.LastPrice}`);
            }
            break;
            
        case 804: // HISTORICAL_PRICE_DATA_FINAL (fin des données)
            console.log(`\n✅ Téléchargement terminé!`);
            console.log(`   Total records: ${historicalRecords.length}`);
            
            if (historicalRecords.length > 0) {
                console.log(`\n   Premiers records:`);
                historicalRecords.slice(0, 5).forEach((r, i) => {
                    console.log(`   ${i+1}. ${r.time} | C: ${r.close}`);
                });
                console.log(`\n   Derniers records:`);
                historicalRecords.slice(-5).forEach((r, i) => {
                    console.log(`   ${historicalRecords.length - 4 + i}. ${r.time} | C: ${r.close}`);
                });
            }
            break;
            
        default:
            if (msg.Type !== 3) {
                console.log(`📦 Type ${msg.Type}:`, JSON.stringify(msg).slice(0, 200));
            }
    }
}

function requestHistoricalData() {
    const symbol = SYMBOLS[0];
    const now = Math.floor(Date.now() / 1000);
    const oneHourAgo = now - 3600;
    
    console.log(`\n═══════════════════════════════════════════════════════════════`);
    console.log(`📜 Demande données historiques: ${symbol}`);
    console.log(`   Période: dernière heure`);
    console.log(`   Interval: 1 minute`);
    console.log(`═══════════════════════════════════════════════════════════════\n`);
    
    sendMessage({
        Type: 800, // HISTORICAL_PRICE_DATA_REQUEST
        RequestID: 1,
        Symbol: symbol,
        Exchange: "",
        RecordInterval: 60, // 1 minute
        StartDateTime: oneHourAgo,
        EndDateTime: now,
        MaxDaysToReturn: 1,
        UseZLibCompression: 0,
        RequestDividendAdjustedStockData: 0,
        Integer_1: 0
    });
    
    // Deuxieme symbole après 3 secondes
    setTimeout(() => {
        const symbol2 = SYMBOLS[1];
        console.log(`\n📜 Demande données historiques: ${symbol2}`);
        historicalRecords = [];
        
        sendMessage({
            Type: 800,
            RequestID: 2,
            Symbol: symbol2,
            Exchange: "",
            RecordInterval: 60,
            StartDateTime: oneHourAgo,
            EndDateTime: now,
            MaxDaysToReturn: 1,
            UseZLibCompression: 0
        });
    }, 5000);
    
    // Terminer après 15 secondes
    setTimeout(() => {
        console.log(`\n🏁 Test terminé`);
        client.destroy();
        process.exit(0);
    }, 15000);
}

client.connect(DTC_PORT, DTC_HOST, () => {
    console.log(`✅ Connecté à ${DTC_HOST}:${DTC_PORT}`);
    
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
    console.log('🔌 Déconnecté');
});
