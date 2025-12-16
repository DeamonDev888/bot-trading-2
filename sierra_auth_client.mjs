#!/usr/bin/env node
/**
 * 📜 SierraChart Historical Data Client - AVEC AUTHENTIFICATION
 */

import net from 'net';
import readline from 'readline';

const DTC_HOST = 'localhost';
const DTC_PORT = 11098;

// Username trouvé dans SierraChart
const USERNAME = 'Deamon888';

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║      📜 SIERRACHART HISTORICAL DATA - AUTH CLIENT                  ║
╚════════════════════════════════════════════════════════════════════╝

   Port: ${DTC_PORT} (Historical Data Server)
   Username: ${USERNAME}
`);

// Demander le mot de passe
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Entrez votre mot de passe SierraChart (ou appuyez sur Entrée pour essayer sans): ', (password) => {
    rl.close();
    connectAndFetch(password || '');
});

function connectAndFetch(password) {
    console.log(`\n📡 Connexion avec${password ? '' : 'out'} mot de passe...`);
    
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
                    Username: USERNAME,
                    Password: password,
                    HeartbeatIntervalInSeconds: 60,
                    ClientName: "Historical Auth Client"
                });
                break;
                
            case 2: // LOGON_RESPONSE
                if (msg.Result === 1) {
                    console.log(`✅ Logon RÉUSSI!`);
                    console.log(`   Server: ${msg.ServerName}`);
                    console.log(`   HistoricalPriceDataSupported: ${msg.HistoricalPriceDataSupported}`);
                    setTimeout(() => requestHistoricalData(client, sendMessage), 1000);
                } else {
                    console.log(`❌ Logon ÉCHEC!`);
                    console.log(`   ResultText: ${msg.ResultText}`);
                    client.destroy();
                    process.exit(1);
                }
                break;
                
            case 3: // HEARTBEAT
                sendMessage({ Type: 3 });
                break;
                
            case 801: // HISTORICAL_PRICE_DATA_HEADER_RESPONSE
                console.log(`\n📜 HISTORICAL HEADER reçu pour RequestID ${msg.RequestID}`);
                break;
                
            case 802: // HISTORICAL_PRICE_DATA_REJECT
                console.log(`\n❌ HISTORICAL REJECT:`);
                console.log(`   RejectText: ${msg.RejectText}`);
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
                
                if (historicalRecords.length <= 3) {
                    console.log(`   📊 ${date.toISOString()} | O:${msg.OpenPrice} H:${msg.HighPrice} L:${msg.LowPrice} C:${msg.LastPrice}`);
                } else if (historicalRecords.length % 50 === 0) {
                    console.log(`   📊 ... ${historicalRecords.length} records reçus`);
                }
                break;
                
            case 804: // FIN
                console.log(`\n✅ Données reçues: ${historicalRecords.length} records`);
                if (historicalRecords.length > 0) {
                    const last = historicalRecords[historicalRecords.length - 1];
                    console.log(`   Dernier: ${last.time} | Close: ${last.close}`);
                }
                break;
                
            default:
                if (msg.Type !== 3) {
                    console.log(`📦 Type ${msg.Type}:`, JSON.stringify(msg).slice(0, 150));
                }
        }
    }
    
    function requestHistoricalData(client, sendMessage) {
        const symbol = 'BTCUSDT_PERP_BINANCE';
        const now = Math.floor(Date.now() / 1000);
        const oneHourAgo = now - 3600;
        
        console.log(`\n📜 Demande: ${symbol} (dernière heure, 1min)`);
        
        sendMessage({
            Type: 800,
            RequestID: 1,
            Symbol: symbol,
            Exchange: "",
            RecordInterval: 60,
            StartDateTime: oneHourAgo,
            EndDateTime: now,
            MaxDaysToReturn: 1,
            UseZLibCompression: 0
        });
        
        setTimeout(() => {
            console.log(`\n🏁 Test terminé`);
            client.destroy();
            process.exit(0);
        }, 10000);
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
    client.on('error', (err) => console.log('❌ Erreur:', err.message));
    client.on('close', () => console.log('🔌 Déconnecté'));
}
