#!/usr/bin/env node
/**
 * 🔍 SierraChart DTC - Test avec différentes configurations
 * 
 * Essaie plusieurs approches pour obtenir les données temps réel
 */

import net from 'net';

const DTC_HOST = 'localhost';

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║           📡 DTC MULTI-PORT SCANNER                                ║
╚════════════════════════════════════════════════════════════════════╝
`);

// Ports à tester (port principal + historical data port potentiel)
const PORTS_TO_TEST = [11097, 11098, 11099, 11100];

async function testPort(port) {
    return new Promise((resolve) => {
        console.log(`\n═══════════════════════════════════════════════════════════════`);
        console.log(`🔍 Test du port ${port}...`);
        console.log(`═══════════════════════════════════════════════════════════════\n`);
        
        const client = new net.Socket();
        let buffer = '';
        let logonResponse = null;
        let marketDataReceived = false;
        let connectTimeout;
        
        function cleanup() {
            clearTimeout(connectTimeout);
            client.destroy();
            resolve({ port, logonResponse, marketDataReceived });
        }
        
        connectTimeout = setTimeout(() => {
            console.log(`   ⏱️ Timeout sur port ${port}`);
            cleanup();
        }, 10000);
        
        client.connect(port, DTC_HOST, () => {
            console.log(`   ✅ Connecté au port ${port}`);
            
            // Demander JSON encoding
            client.write(JSON.stringify({
                Type: 6,
                ProtocolVersion: 8,
                Encoding: 2,
                ProtocolType: "DTC"
            }) + '\0');
        });
        
        client.on('data', (data) => {
            buffer += data.toString('utf8');
            const parts = buffer.split('\0');
            buffer = parts.pop() || '';
            
            for (const part of parts) {
                if (!part.trim()) continue;
                try {
                    const msg = JSON.parse(part);
                    
                    if (msg.Type === 7) { // ENCODING_RESPONSE
                        console.log(`   ✅ Encoding accepté`);
                        // Logon
                        client.write(JSON.stringify({
                            Type: 1,
                            ProtocolVersion: 8,
                            HeartbeatIntervalInSeconds: 60,
                            ClientName: "Port Scanner"
                        }) + '\0');
                    }
                    
                    if (msg.Type === 2) { // LOGON_RESPONSE
                        logonResponse = msg;
                        console.log(`   ✅ Logon OK: ${msg.ServerName}`);
                        console.log(`      MarketDataSupported: ${msg.MarketDataSupported}`);
                        console.log(`      HistoricalPriceDataSupported: ${msg.HistoricalPriceDataSupported}`);
                        
                        // Essayer market data request
                        setTimeout(() => {
                            console.log(`   📡 Tentative abonnement BTCUSDT_PERP_BINANCE...`);
                            client.write(JSON.stringify({
                                Type: 101,
                                RequestAction: 1,
                                SymbolID: 1,
                                Symbol: "BTCUSDT_PERP_BINANCE",
                                Exchange: ""
                            }) + '\0');
                        }, 500);
                        
                        // Essayer historical data request sur ce port
                        setTimeout(() => {
                            console.log(`   📜 Tentative historical data...`);
                            client.write(JSON.stringify({
                                Type: 800,
                                RequestID: 1,
                                Symbol: "BTCUSDT_PERP_BINANCE",
                                Exchange: "",
                                RecordInterval: 60,
                                StartDateTime: Math.floor(Date.now() / 1000) - 3600,
                                EndDateTime: Math.floor(Date.now() / 1000),
                                MaxDaysToReturn: 1,
                                UseZLibCompression: 0
                            }) + '\0');
                        }, 1000);
                        
                        // Terminer après tests
                        setTimeout(cleanup, 5000);
                    }
                    
                    if (msg.Type === 103) { // MARKET_DATA_REJECT
                        console.log(`   ❌ Market Data Reject: ${msg.RejectText}`);
                    }
                    
                    if (msg.Type === 104) { // MARKET_DATA_SNAPSHOT
                        console.log(`   🎯 MARKET DATA SNAPSHOT REÇU!`);
                        console.log(`      Last: ${msg.LastTradePrice}`);
                        marketDataReceived = true;
                    }
                    
                    if (msg.Type === 107 || msg.Type === 108) {
                        console.log(`   📈 Market Update reçu!`);
                        marketDataReceived = true;
                    }
                    
                    if (msg.Type === 801) { // HISTORICAL_PRICE_DATA_HEADER
                        console.log(`   📜 Historical Header reçu!`);
                    }
                    
                    if (msg.Type === 802) { // HISTORICAL_PRICE_DATA_REJECT
                        console.log(`   ❌ Historical Reject: ${msg.RejectText}`);
                    }
                    
                    if (msg.Type === 803) { // HISTORICAL_PRICE_DATA_RECORD
                        console.log(`   📜 Historical Record reçu!`);
                    }
                    
                } catch (e) {}
            }
        });
        
        client.on('error', (err) => {
            console.log(`   ❌ Erreur port ${port}: ${err.message}`);
            cleanup();
        });
    });
}

async function main() {
    const results = [];
    
    for (const port of PORTS_TO_TEST) {
        const result = await testPort(port);
        results.push(result);
    }
    
    console.log(`
═══════════════════════════════════════════════════════════════════
📊 RÉSUMÉ DES PORTS
═══════════════════════════════════════════════════════════════════
`);
    
    for (const r of results) {
        if (r.logonResponse) {
            console.log(`   Port ${r.port}: ✅ Actif`);
            console.log(`      Server: ${r.logonResponse.ServerName}`);
            console.log(`      Market Data: ${r.marketDataReceived ? '✅' : '❌'}`);
        } else {
            console.log(`   Port ${r.port}: ❌ Non disponible`);
        }
    }
    
    console.log(`
═══════════════════════════════════════════════════════════════════
💡 CONFIGURATION SIERRACHART NÉCESSAIRE
═══════════════════════════════════════════════════════════════════

   Le serveur DTC est actif mais les requêtes market data sont bloquées.
   
   Dans SierraChart, vérifie:
   
   1. Global Settings > Sierra Chart Server Settings
   2. DTC Protocol Server section:
      - ✅ Enable DTC Protocol Server
      - ✅ Historical Data Port (peut être différent)
      - Vérifie s'il y a une option "Allow Market Data"
   
   3. Essaie aussi de redémarrer SierraChart après changement

`);
    
    process.exit(0);
}

main();
