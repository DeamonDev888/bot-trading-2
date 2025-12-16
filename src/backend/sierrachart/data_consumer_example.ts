/**
 * 📊 SierraChart Data Consumer Example
 *
 * Comprehensive example demonstrating how to use the SierraChartDataConsumer
 * to access and analyze .scid and .dly files from SierraChart
 */

import { SierraChartDataConsumer } from './SierraChartDataConsumer';

// Configuration
const SIERRA_DATA_PATH = 'C:/SierraChart/Data/';

async function main() {
    console.log('🚀 SierraChart Data Consumer Example\n');

    // Create data consumer instance
    const dataConsumer = new SierraChartDataConsumer(SIERRA_DATA_PATH);

    // 1. Get available symbols
    console.log('📋 Available Symbols:');
    console.log('═'.repeat(50));

    const allSymbols = dataConsumer.getAvailableSymbols();
    console.log(`Total symbols found: ${allSymbols.length}`);

    // Show active symbols (recently updated)
    const activeSymbols = dataConsumer.getActiveSymbols();
    console.log(`Active symbols (recently updated): ${activeSymbols.length}`);

    activeSymbols.slice(0, 10).forEach((symbol, index) => {
        console.log(`${(index + 1).toString().padStart(2)}. ${symbol.symbol.padEnd(25)} | ${symbol.dataType.padEnd(8)} | ${(symbol.fileSize / 1024 / 1024).toFixed(2)} MB | Last updated: ${symbol.lastUpdateAgeSeconds}s ago`);
    });

    console.log('');

    // 2. Analyze specific symbols
    const symbolsToAnalyze = ['BTCUSDT_PERP_BINANCE', 'AAPL', 'XAUUSD', 'MESZ25-CME', 'EURUSD'];

    console.log('📊 Symbol Analysis:');
    console.log('═'.repeat(50));

    for (const symbol of symbolsToAnalyze) {
        const symbolInfo = dataConsumer.getSymbolInfo(symbol);

        if (symbolInfo) {
            console.log(`\n📈 ${symbol}`);
            console.log(`   Type: ${symbolInfo.dataType}`);
            console.log(`   Size: ${(symbolInfo.fileSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   Records: ${symbolInfo.totalRecords.toLocaleString()}`);
            console.log(`   Last updated: ${symbolInfo.lastUpdateAgeSeconds}s ago`);
            console.log(`   Status: ${symbolInfo.isActive ? '🟢 ACTIVE' : '⚪ INACTIVE'}`);

            // Get analysis
            const analysis = dataConsumer.analyzeSymbol(symbol);
            if (analysis) {
                console.log(`   Analysis: ${analysis.trend}`);
                console.log(`   Volatility: ${analysis.volatility.toFixed(2)}%`);
                console.log(`   Price Range: ${analysis.priceRange}`);
            }
        } else {
            console.log(`❌ ${symbol}: Not found`);
        }
    }

    console.log('');

    // 3. Read tick data for active symbols
    console.log('📊 Recent Tick Data:');
    console.log('═'.repeat(50));

    const tickSymbols = ['BTCUSDT_PERP_BINANCE', 'AAPL'];
    for (const symbol of tickSymbols) {
        const ticks = dataConsumer.readLastTicks(symbol, 5);

        if (ticks && ticks.length > 0) {
            console.log(`\n📈 ${symbol} - Last ${ticks.length} ticks:`);

            ticks.forEach((tick, index) => {
                const time = tick.dateTime.toLocaleTimeString();
                const age = ((Date.now() - tick.dateTime.getTime()) / 1000).toFixed(0);
                console.log(`   ${time} | O:${tick.open.toFixed(2)} H:${tick.high.toFixed(2)} L:${tick.low.toFixed(2)} C:${tick.close.toFixed(2)} | Vol:${tick.volume} | ${age}s ago ${tick.isRecent ? '🟢' : ''}`);
            });
        } else {
            console.log(`❌ ${symbol}: No tick data available`);
        }
    }

    console.log('');

    // 4. Read daily data
    console.log('📊 Daily Data:');
    console.log('═'.repeat(50));

    const dailySymbols = ['AAPL', 'XAUUSD'];
    for (const symbol of dailySymbols) {
        const dailyBars = dataConsumer.readLastDailyBars(symbol, 5);

        if (dailyBars && dailyBars.length > 0) {
            console.log(`\n📈 ${symbol} - Last ${dailyBars.length} days:`);

            dailyBars.forEach((bar, index) => {
                const date = bar.date.toLocaleDateString();
                console.log(`   ${date} | O:${bar.open.toFixed(2)} H:${bar.high.toFixed(2)} L:${bar.low.toFixed(2)} C:${bar.close.toFixed(2)} | Vol:${bar.volume}`);
            });
        } else {
            console.log(`❌ ${symbol}: No daily data available`);
        }
    }

    console.log('');

    // 5. Start monitoring (real-time updates)
    console.log('👁️ Starting Real-time Monitoring:');
    console.log('═'.repeat(50));

    const symbolsToMonitor = ['BTCUSDT_PERP_BINANCE', 'AAPL', 'XAUUSD'];
    console.log(`Monitoring: ${symbolsToMonitor.join(', ')}`);

    dataConsumer.startMonitoring(symbolsToMonitor, 3000);

    // Listen for updates
    dataConsumer.on('symbolUpdated', (symbol: string) => {
        console.log(`\n🔔 UPDATE: ${symbol} has new data!`);

        // Get fresh analysis
        const analysis = dataConsumer.analyzeSymbol(symbol);
        if (analysis) {
            console.log(`   Trend: ${analysis.trend}`);
            console.log(`   Volatility: ${analysis.volatility.toFixed(2)}%`);
            console.log(`   Price Range: ${analysis.priceRange}`);
        }

        // Get latest ticks
        const ticks = dataConsumer.readLastTicks(symbol, 3);
        if (ticks && ticks.length > 0) {
            console.log(`   Latest ticks:`);
            ticks.forEach(tick => {
                const time = tick.dateTime.toLocaleTimeString();
                console.log(`      ${time} | C:${tick.close.toFixed(2)} | Vol:${tick.volume}`);
            });
        }
    });

    console.log('\n🎯 Monitoring active. Press Ctrl+C to stop...');

    // Keep running
    setTimeout(() => {
        console.log('\n🏁 Example completed successfully!');
        process.exit(0);
    }, 60000);
}

// Handle Ctrl+C
process.on('SIGINT', () => {
    console.log('\n🛑 Monitoring stopped by user');
    process.exit(0);
});

// Run the example
main().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});