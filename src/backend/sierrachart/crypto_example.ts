/**
 * 🪙 Crypto Data Consumer Example
 *
 * Comprehensive example demonstrating crypto-specific functionality
 * Focuses on Bitcoin, Ethereum, Solana, and other major cryptocurrencies
 */

import { CryptoDataConsumer } from './CryptoDataConsumer';

// Configuration
const SIERRA_DATA_PATH = 'C:/SierraChart/Data/';

async function main() {
    console.log('🪙 Crypto Data Consumer Example\n');

    // Create crypto-specific consumer
    const cryptoConsumer = new CryptoDataConsumer(SIERRA_DATA_PATH);

    // 1. Get all crypto symbols
    console.log('📋 Crypto Symbols Available:');
    console.log('═'.repeat(80));

    const allCryptoSymbols = cryptoConsumer.getCryptoSymbols();
    console.log(`Total crypto symbols: ${allCryptoSymbols.length}`);

    // Show crypto types
    const cryptoTypes = cryptoConsumer.getAvailableCryptoTypes();
    console.log(`Crypto types: ${Array.from(cryptoTypes).join(', ')}`);

    // 2. Show active crypto symbols
    console.log('\n📈 Active Crypto Symbols:');
    console.log('═'.repeat(80));

    const activeSymbols = cryptoConsumer.getActiveCryptoSymbols();
    activeSymbols.forEach((symbol, index) => {
        const sizeMB = (symbol.fileSize / 1024 / 1024).toFixed(2);
        console.log(`${(index + 1).toString().padStart(2)}. ${symbol.symbol.padEnd(30)} | ${symbol.cryptoType.padEnd(12)} | ${symbol.contractType.padEnd(10)} | ${symbol.exchange.padEnd(10)} | ${sizeMB.padStart(8)} MB`);
    });

    // 3. Analyze specific cryptocurrencies
    console.log('\n📊 Crypto Analysis:');
    console.log('═'.repeat(80));

    // Focus on the cryptos we found
    const cryptoSymbols = ['BTCUSDT_PERP_BINANCE', 'BTCUSD_PERP_BINANCE'];

    for (const symbol of cryptoSymbols) {
        const symbolInfo = cryptoConsumer.getCryptoSymbolInfo(symbol);

        if (symbolInfo) {
            console.log(`\n🪙 ${symbol}`);
            console.log(`   Type: ${symbolInfo.cryptoType}`);
            console.log(`   Exchange: ${symbolInfo.exchange}`);
            console.log(`   Contract: ${symbolInfo.contractType}`);
            console.log(`   Pair: ${symbolInfo.baseCurrency}/${symbolInfo.quoteCurrency}`);
            console.log(`   Tick Size: ${symbolInfo.tickSize} (${symbolInfo.tickValue}$ per tick)`);
            console.log(`   Leverage: ${symbolInfo.leverage}x`);
            console.log(`   Trading: ${symbolInfo.tradingHours}`);
            console.log(`   File Size: ${(symbolInfo.fileSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   Records: ${symbolInfo.totalRecords.toLocaleString()}`);
            console.log(`   Last Updated: ${symbolInfo.lastUpdateAgeSeconds}s ago`);

            // Get crypto-specific analysis
            const analysis = cryptoConsumer.analyzeCryptoSymbol(symbol);
            if (analysis) {
                console.log(`   Trend: ${analysis.trend}`);
                console.log(`   Volatility: ${analysis.volatility.toFixed(2)}%`);
                console.log(`   Volatility Score: ${analysis.volatilityScore}/100`);
                console.log(`   Liquidity Score: ${analysis.liquidityScore}/100`);
                console.log(`   Correlation: ${analysis.correlationAnalysis}`);
                if (analysis.fundingRate) {
                    console.log(`   Funding Rate: ${analysis.fundingRate}%`);
                }
                console.log(`   Volume: ${analysis.volumeAnalysis}`);
                console.log(`   Exchange: ${analysis.exchangeSpecifics}`);
            }
        } else {
            console.log(`❌ ${symbol}: Not found or not a crypto symbol`);
        }
    }

    // 4. Crypto type analysis
    console.log('\n📊 Crypto Type Analysis:');
    console.log('═'.repeat(80));

    const typesToAnalyze = ['Bitcoin', 'Ethereum', 'Solana', 'Altcoin'];

    for (const type of typesToAnalyze) {
        const typeSymbols = cryptoConsumer.getCryptoSymbolsByType(type);

        if (typeSymbols.length > 0) {
            console.log(`\n📋 ${type} (${typeSymbols.length} symbols):`);

            // Show all symbols of this type
            typeSymbols.forEach(symbol => {
                const sizeMB = (symbol.fileSize / 1024 / 1024).toFixed(2);
                console.log(`   • ${symbol.symbol.padEnd(30)} | ${symbol.contractType.padEnd(10)} | ${symbol.exchange.padEnd(10)} | ${sizeMB.padStart(8)} MB | ${symbol.totalRecords.toLocaleString()} records`);
            });
        } else {
            console.log(`   ❌ ${type}: No symbols found`);
        }
    }

    // 5. Read actual crypto data
    console.log('\n📊 Crypto Market Data:');
    console.log('═'.repeat(80));

    // Test reading tick data from active crypto symbols
    const dataSymbols = ['BTCUSDT_PERP_BINANCE', 'BTCUSD_PERP_BINANCE'];

    for (const symbol of dataSymbols) {
        const symbolInfo = cryptoConsumer.getCryptoSymbolInfo(symbol);

        if (symbolInfo) {
            console.log(`\n🪙 ${symbol} - Last 5 Ticks:`);

            const ticks = cryptoConsumer.readLastTicks(symbol, 5);
            if (ticks && ticks.length > 0) {
                ticks.forEach((tick, index) => {
                    const time = tick.dateTime.toLocaleTimeString();
                    const age = ((Date.now() - tick.dateTime.getTime()) / 1000).toFixed(0);
                    console.log(`   ${time} | O:${tick.open.toFixed(2)} H:${tick.high.toFixed(2)} L:${tick.low.toFixed(2)} C:${tick.close.toFixed(2)} | Vol:${tick.volume} | ${age}s ago ${tick.isRecent ? '🟢' : ''}`);
                });
            } else {
                console.log(`   ❌ No tick data available`);
            }
        }
    }

    // 6. Start crypto monitoring
    console.log('\n👁️ Starting Crypto Monitoring:');
    console.log('═'.repeat(80));

    const symbolsToMonitor = ['BTCUSDT_PERP_BINANCE', 'BTCUSD_PERP_BINANCE'];
    console.log(`Monitoring: ${symbolsToMonitor.join(', ')}`);

    cryptoConsumer.startMonitoring(symbolsToMonitor, 3000);

    // Listen for crypto updates
    cryptoConsumer.on('symbolUpdated', (symbol: string) => {
        console.log(`\n🔔 CRYPTO UPDATE: ${symbol} has new data!`);

        const symbolInfo = cryptoConsumer.getCryptoSymbolInfo(symbol);
        if (symbolInfo) {
            console.log(`   ${symbolInfo.cryptoType} (${symbolInfo.exchange})`);
            console.log(`   ${symbolInfo.contractType} contract | ${symbolInfo.baseCurrency}/${symbolInfo.quoteCurrency}`);
        }

        // Get fresh analysis
        const analysis = cryptoConsumer.analyzeCryptoSymbol(symbol);
        if (analysis) {
            console.log(`   Trend: ${analysis.trend}`);
            console.log(`   Volatility: ${analysis.volatility.toFixed(2)}%`);
            console.log(`   Price Range: ${analysis.priceRange}`);
            console.log(`   Volatility Score: ${analysis.volatilityScore}/100`);
            console.log(`   Liquidity Score: ${analysis.liquidityScore}/100`);
        }

        // Get latest ticks
        const ticks = cryptoConsumer.readLastTicks(symbol, 1);
        if (ticks && ticks.length > 0) {
            const latest = ticks[0];
            console.log(`   Latest: ${latest.dateTime.toLocaleTimeString()} | C:${latest.close.toFixed(2)} | Vol:${latest.volume}`);
        }
    });

    console.log('\n🎯 Crypto Monitoring active. Press Ctrl+C to stop...');

    // Keep running
    setTimeout(() => {
        console.log('\n🏁 Crypto Example completed successfully!');

        // Show summary
        console.log('\n📊 Crypto Summary:');
        console.log(`   Total Crypto Symbols: ${allCryptoSymbols.length}`);
        console.log(`   Active Symbols: ${activeSymbols.length}`);
        console.log(`   Crypto Types: ${Array.from(cryptoTypes).length}`);

        // Show specific crypto info
        const btcSymbols = cryptoConsumer.getCryptoSymbolsByType('Bitcoin');
        console.log(`   Bitcoin Symbols: ${btcSymbols.length}`);

        const ethSymbols = cryptoConsumer.getCryptoSymbolsByType('Ethereum');
        console.log(`   Ethereum Symbols: ${ethSymbols.length}`);

        const solSymbols = cryptoConsumer.getCryptoSymbolsByType('Solana');
        console.log(`   Solana Symbols: ${solSymbols.length}`);

        process.exit(0);
    }, 30000);
}

// Handle Ctrl+C
process.on('SIGINT', () => {
    console.log('\n🛑 Crypto Monitoring stopped by user');
    process.exit(0);
});

// Run the example
main().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});