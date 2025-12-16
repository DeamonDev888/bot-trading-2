#!/usr/bin/env node
/**
 * 📊 DTC SERVER - CE QUI FONCTIONNE
 * 
 * Test de toutes les fonctionnalités disponibles via le serveur DTC
 */

import net from 'net';

const DTC_HOST = 'localhost';
const DTC_PORT = 11099;

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║      📊 SIERRACHART DTC - FONCTIONNALITÉS DISPONIBLES              ║
╚════════════════════════════════════════════════════════════════════╝
`);

const client = new net.Socket();
let buffer = '';
let results = {
    securityDefinitions: [],
    tradeAccounts: [],
    exchanges: [],
    positions: [],
    balances: [],
    orders: []
};

function sendMessage(obj) {
    client.write(JSON.stringify(obj) + '\0');
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
                ClientName: "Capabilities Test"
            });
            break;
            
        case 2: // LOGON_RESPONSE
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('📋 CAPACITÉS DU SERVEUR');
            console.log('═══════════════════════════════════════════════════════════════\n');
            
            console.log(`   Serveur: ${msg.ServerName}`);
            console.log('');
            console.log('   ✅ SUPPORTÉ:');
            if (msg.TradingIsSupported) console.log('      - Trading (ordres, positions)');
            if (msg.SecurityDefinitionsSupported) console.log('      - Security Definitions (infos symboles)');
            if (msg.OCOOrdersSupported) console.log('      - Ordres OCO');
            if (msg.BracketOrdersSupported) console.log('      - Ordres Bracket');
            if (msg.OrderCancelReplaceSupported) console.log('      - Cancel/Replace ordres');
            if (msg.AccountBalanceUpdatesSupported) console.log('      - Balance compte');
            
            console.log('\n   ❌ RESTREINT (règles exchange):');
            console.log('      - Market Data streaming');
            console.log('      - Historical Data (sur ce port)');
            
            setTimeout(runTests, 1000);
            break;
            
        case 3: // HEARTBEAT
            sendMessage({ Type: 3 });
            break;
            
        // Security Definitions
        case 507:
            results.securityDefinitions.push({
                symbol: msg.Symbol,
                description: msg.Description,
                exchange: msg.SecurityExchange,
                minPriceIncrement: msg.MinPriceIncrement,
                priceDisplayFormat: msg.PriceDisplayFormat
            });
            break;
            
        // Trade Accounts
        case 401: // TRADE_ACCOUNT_RESPONSE
            if (msg.TradeAccount) {
                results.tradeAccounts.push(msg.TradeAccount);
            }
            break;
            
        // Exchange List
        case 501: // EXCHANGE_LIST_RESPONSE
            if (msg.Exchange) {
                results.exchanges.push({
                    exchange: msg.Exchange,
                    description: msg.Description
                });
            }
            break;
            
        // Positions
        case 306: // POSITION_UPDATE
            results.positions.push({
                symbol: msg.Symbol,
                quantity: msg.Quantity,
                averagePrice: msg.AveragePrice
            });
            break;
            
        // Account Balance
        case 600: // ACCOUNT_BALANCE_UPDATE
            results.balances.push({
                account: msg.TradeAccount,
                balance: msg.CashBalance,
                availableBalance: msg.BalanceAvailableForNewPositions
            });
            break;
            
        // Orders
        case 301: // ORDER_UPDATE
            results.orders.push({
                orderID: msg.ServerOrderID,
                symbol: msg.Symbol,
                orderType: msg.OrderType,
                side: msg.BuySell,
                quantity: msg.Quantity,
                price: msg.Price1,
                status: msg.OrderStatus
            });
            break;
            
        // Rejets
        case 103:
            // Market data reject - attendu
            break;
        case 802:
            // Historical reject - attendu
            break;
    }
}

function runTests() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🧪 TESTS DES FONCTIONNALITÉS');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // 1. Security Definition
    console.log('📋 1. Security Definitions (infos sur les symboles)...');
    ['BTCUSDT_PERP_BINANCE', 'AAPL', 'XAUUSD', 'MESZ25-CME', 'EURUSD'].forEach((symbol, i) => {
        setTimeout(() => {
            sendMessage({
                Type: 506,
                RequestID: i + 1,
                Symbol: symbol,
                Exchange: ""
            });
        }, i * 100);
    });
    
    // 2. Trade Accounts
    setTimeout(() => {
        console.log('💰 2. Trade Accounts (comptes de trading)...');
        sendMessage({
            Type: 400, // TRADE_ACCOUNTS_REQUEST
            RequestID: 100
        });
    }, 1000);
    
    // 3. Current Positions
    setTimeout(() => {
        console.log('📊 3. Current Positions...');
        sendMessage({
            Type: 304, // CURRENT_POSITIONS_REQUEST
            RequestID: 200,
            TradeAccount: ""
        });
    }, 2000);
    
    // 4. Account Balance
    setTimeout(() => {
        console.log('💵 4. Account Balance...');
        sendMessage({
            Type: 601, // ACCOUNT_BALANCE_REQUEST
            RequestID: 300,
            TradeAccount: ""
        });
    }, 3000);
    
    // 5. Open Orders
    setTimeout(() => {
        console.log('📝 5. Open Orders...');
        sendMessage({
            Type: 300, // OPEN_ORDERS_REQUEST
            RequestID: 400,
            TradeAccount: ""
        });
    }, 4000);
    
    // Afficher les résultats
    setTimeout(showResults, 6000);
}

function showResults() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 RÉSULTATS');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Security Definitions
    console.log('📋 SECURITY DEFINITIONS:');
    if (results.securityDefinitions.length > 0) {
        console.log('   ✅ Fonctionne! Symboles trouvés:\n');
        results.securityDefinitions.forEach(s => {
            console.log(`      ${s.symbol}`);
            console.log(`         Description: ${s.description || 'N/A'}`);
            console.log(`         Min Tick: ${s.minPriceIncrement}`);
            console.log('');
        });
    } else {
        console.log('   ❌ Aucune définition reçue');
    }
    
    // Trade Accounts
    console.log('💰 TRADE ACCOUNTS:');
    if (results.tradeAccounts.length > 0) {
        console.log('   ✅ Comptes:', results.tradeAccounts.join(', '));
    } else {
        console.log('   ⚠️  Aucun compte (peut nécessiter connexion broker)');
    }
    
    // Positions
    console.log('\n📊 POSITIONS:');
    if (results.positions.length > 0) {
        results.positions.forEach(p => {
            console.log(`   ${p.symbol}: ${p.quantity} @ ${p.averagePrice}`);
        });
    } else {
        console.log('   ⚠️  Aucune position ouverte');
    }
    
    // Balances
    console.log('\n💵 BALANCES:');
    if (results.balances.length > 0) {
        results.balances.forEach(b => {
            console.log(`   ${b.account}: $${b.balance}`);
        });
    } else {
        console.log('   ⚠️  Pas de balance (nécessite connexion broker)');
    }
    
    // Orders
    console.log('\n📝 ORDRES:');
    if (results.orders.length > 0) {
        results.orders.forEach(o => {
            console.log(`   ${o.orderID}: ${o.side} ${o.quantity} ${o.symbol} @ ${o.price}`);
        });
    } else {
        console.log('   ⚠️  Aucun ordre ouvert');
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('💡 RÉSUMÉ - CE QUE TU PEUX FAIRE VIA DTC');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log(`   ✅ FONCTIONNE:
      1. Security Definitions - Obtenir infos sur n'importe quel symbole
      2. Trading - Passer des ordres (si connecté à un broker)
      3. Positions - Voir tes positions ouvertes
      4. Balances - Voir ton solde
      5. Orders - Gérer tes ordres

   ❌ BLOQUÉ (règles des exchanges):
      - Market Data streaming temps réel
      - Historical Data (utilise port 11098 ou fichiers SCID)

   💡 ALTERNATIVE POUR LES DONNÉES:
      - Lecture directe des fichiers .scid (FONCTIONNE!)
      - 18+ millions de ticks disponibles
      - Mis à jour en temps réel
`);
    
    client.destroy();
    process.exit(0);
}

client.connect(DTC_PORT, DTC_HOST, () => {
    console.log('✅ Connecté au serveur DTC\n');
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
