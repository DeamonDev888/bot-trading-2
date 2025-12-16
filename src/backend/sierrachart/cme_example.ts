/**
 * 📊 CME Data Consumer Example
 *
 * Comprehensive example demonstrating CME-specific functionality
 * Focuses on CME futures, commodities, and equity index products
 */

import { CMEDataConsumer } from './CMEDataConsumer';

// Configuration
const SIERRA_DATA_PATH = 'C:/SierraChart/Data/';

async function main() {
    console.log('🚀 CME Data Consumer Example\n');

    // Create CME-specific consumer
    const cmeConsumer = new CMEDataConsumer(SIERRA_DATA_PATH);

    // 1. Get all CME symbols
    console.log('📋 CME Symbols Available:');
    console.log('═'.repeat(60));

    const allCMESymbols = cmeConsumer.getCMESymbols();
    console.log(`Total CME symbols: ${allCMESymbols.length}`);

    // Show by sector
    const sectors = cmeConsumer.getAvailableSectors();
    console.log(`Sectors: ${Array.from(sectors).join(', ')}`);

    // 2. Show active CME symbols
    console.log('\n📈 Active CME Symbols:');
    console.log('═'.repeat(60));

    const activeSymbols = cmeConsumer.getActiveCMESymbols();
    activeSymbols.slice(0, 10).forEach((symbol, index) => {
        console.log(`${(index + 1).toString().padStart(2)}. ${symbol.symbol.padEnd(15)} | ${symbol.sector.padEnd(12)} | ${symbol.product.padEnd(25)} | Exp: ${symbol.contractMonth}/${symbol.year}`);
    });

    // 3. Analyze specific CME products
    console.log('\n📊 CME Product Analysis:');
    console.log('═'.repeat(60));

    const cmeProducts = [
        'ESH25-CME',  // E-mini S&P 500
        'NQH25-CME',  // E-mini Nasdaq-100
        'BTCF25-CME', // Bitcoin
        'GCJ25-CME',  // Gold
        'CLF25-CME',  // Crude Oil
        'ZBH25-CME'   // T-Bond
    ];

    for (const symbol of cmeProducts) {
        const symbolInfo = cmeConsumer.getCMESymbolInfo(symbol);

        if (symbolInfo) {
            console.log(`\n📈 ${symbol} - ${symbolInfo.product}`);
            console.log(`   Sector: ${symbolInfo.sector}`);
            console.log(`   Contract: ${symbolInfo.contractMonth} ${symbolInfo.year}`);
            console.log(`   Tick Size: ${symbolInfo.tickSize} (${symbolInfo.tickValue}$ per tick)`);
            console.log(`   Margin: $${symbolInfo.marginRequirement?.toLocaleString()}`);
            console.log(`   Trading Hours: ${symbolInfo.tradingHours}`);
            console.log(`   File Size: ${(symbolInfo.fileSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   Records: ${symbolInfo.totalRecords.toLocaleString()}`);
            console.log(`   Last Updated: ${symbolInfo.lastUpdateAgeSeconds}s ago`);

            // Get CME-specific analysis
            const analysis = cmeConsumer.analyzeCMESymbol(symbol);
            if (analysis) {
                console.log(`   Trend: ${analysis.trend}`);
                console.log(`   Volatility: ${analysis.volatility.toFixed(2)}%`);
                console.log(`   Open Interest: ${analysis.openInterestTrend}`);
                console.log(`   Volume: ${analysis.volumeAnalysis}`);
                if (analysis.rolloverRecommendation) {
                    console.log(`   ⚠️  ${analysis.rolloverRecommendation}`);
                }
            }
        } else {
            console.log(`❌ ${symbol}: Not found or not a CME product`);
        }
    }

    // 4. Sector-specific analysis
    console.log('\n📊 Sector Analysis:');
    console.log('═'.repeat(60));

    const sectorsToAnalyze = ['Equity Index', 'Crypto', 'Commodity', 'Energy', 'Rates'];

    for (const sector of sectorsToAnalyze) {
        const sectorSymbols = cmeConsumer.getCMESymbolsBySector(sector);

        if (sectorSymbols.length > 0) {
            console.log(`\n📋 ${sector} (${sectorSymbols.length} symbols):`);

            // Show top 3 most active symbols in sector
            const activeInSector = sectorSymbols
                .filter(s => s.isActive)
                .sort((a, b) => b.fileSize - a.fileSize)
                .slice(0, 3);

            activeInSector.forEach(symbol => {
                const sizeMB = (symbol.fileSize / 1024 / 1024).toFixed(1);
                console.log(`   • ${symbol.symbol.padEnd(12)} | ${symbol.product.padEnd(20)} | ${sizeMB.padStart(6)} MB | ${symbol.totalRecords.toLocaleString()} records`);
            });
        }
    }

    // 5. Read actual data from CME symbols
    console.log('\n📊 CME Market Data:');
    console.log('═'.repeat(60));

    // Test reading tick data from active CME symbols
    const dataSymbols = ['ESH25-CME', 'NQH25-CME', 'BTCF25-CME'];

    for (const symbol of dataSymbols) {
        const symbolInfo = cmeConsumer.getCMESymbolInfo(symbol);

        if (symbolInfo && symbolInfo.dataType === 'intraday') {
            console.log(`\n📈 ${symbol} - Last 5 Ticks:`);

            const ticks = cmeConsumer.readLastTicks(symbol, 5);
            if (ticks && ticks.length > 0) {
                ticks.forEach((tick, index) => {
                    const time = tick.dateTime.toLocaleTimeString();
                    const age = ((Date.now() - tick.dateTime.getTime()) / 1000).toFixed(0);
                    console.log(`   ${time} | O:${tick.open.toFixed(2)} H:${tick.high.toFixed(2)} L:${tick.low.toFixed(2)} C:${tick.close.toFixed(2)} | Vol:${tick.volume} | ${age}s ago ${tick.isRecent ? '🟢' : ''}`);
                });
            } else {
                console.log(`   ❌ No tick data available`);
            }
        } else if (symbolInfo) {
            console.log(`\n📊 ${symbol} - Last 5 Daily Bars:`);

            const dailyBars = cmeConsumer.readLastDailyBars(symbol, 5);
            if (dailyBars && dailyBars.length > 0) {
                dailyBars.forEach((bar, index) => {
                    const date = bar.date.toLocaleDateString();
                    console.log(`   ${date} | O:${bar.open.toFixed(2)} H:${bar.high.toFixed(2)} L:${bar.low.toFixed(2)} C:${bar.close.toFixed(2)} | Vol:${bar.volume}`);
                });
            } else {
                console.log(`   ❌ No daily data available`);
            }
        }
    }

    // 6. Start CME monitoring
    console.log('\n👁️ Starting CME Monitoring:');
    console.log('═'.repeat(60));

    const symbolsToMonitor = ['ESH25-CME', 'NQH25-CME', 'BTCF25-CME', 'GCJ25-CME'];
    console.log(`Monitoring: ${symbolsToMonitor.join(', ')}`);

    cmeConsumer.startMonitoring(symbolsToMonitor, 3000);

    // Listen for CME updates
    cmeConsumer.on('symbolUpdated', (symbol: string) => {
        console.log(`\n🔔 CME UPDATE: ${symbol} has new data!`);

        const symbolInfo = cmeConsumer.getCMESymbolInfo(symbol);
        if (symbolInfo) {
            console.log(`   Product: ${symbolInfo.product} (${symbolInfo.sector})`);
            console.log(`   Contract: ${symbolInfo.contractMonth}/${symbolInfo.year}`);
        }

        // Get fresh analysis
        const analysis = cmeConsumer.analyzeCMESymbol(symbol);
        if (analysis) {
            console.log(`   Trend: ${analysis.trend}`);
            console.log(`   Volatility: ${analysis.volatility.toFixed(2)}%`);
            console.log(`   Price Range: ${analysis.priceRange}`);
        }

        // Get latest ticks
        const ticks = cmeConsumer.readLastTicks(symbol, 1);
        if (ticks && ticks.length > 0) {
            const latest = ticks[0];
            console.log(`   Latest: ${latest.dateTime.toLocaleTimeString()} | C:${latest.close.toFixed(2)} | Vol:${latest.volume}`);
        }
    });

    console.log('\n🎯 CME Monitoring active. Press Ctrl+C to stop...');

    // Keep running
    setTimeout(() => {
        console.log('\n🏁 CME Example completed successfully!');

        // Show summary
        console.log('\n📊 CME Summary:');
        console.log(`   Total CME Symbols: ${allCMESymbols.length}`);
        console.log(`   Active Symbols: ${activeSymbols.length}`);
        console.log(`   Sectors: ${Array.from(sectors).length}`);

        // Note: CMEDataConsumer inherits from SierraChartDataConsumer
        // which has the disconnect method
        process.exit(0);
    }, 30000);
}

// Handle Ctrl+C
process.on('SIGINT', () => {
    console.log('\n🛑 CME Monitoring stopped by user');
    process.exit(0);
});

// Run the example
main().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});