/**
 * Identify SierraChart files with fresh data
 * Find recently updated files with actual market data
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SIERRA_DATA_PATH = 'C:/SierraChart/Data/';

console.log('🔍 Identifying Fresh SierraChart Data...\n');

try {
    if (!existsSync(SIERRA_DATA_PATH)) {
        console.log('❌ SierraChart data directory not found!');
        process.exit(1);
    }

    const files = readdirSync(SIERRA_DATA_PATH);
    const scidFiles = files.filter(f => f.endsWith('.scid'));
    const dlyFiles = files.filter(f => f.endsWith('.dly'));

    console.log(`📊 Found ${scidFiles.length} .scid files and ${dlyFiles.length} .dly files`);

    // Get all files with stats
    const allFiles = [...scidFiles, ...dlyFiles].map(file => {
        const filePath = join(SIERRA_DATA_PATH, file);
        const stats = statSync(filePath);
        const symbol = file.replace('.scid', '').replace('.dly', '');

        return {
            symbol,
            file,
            filePath,
            fileSize: stats.size,
            lastModified: stats.mtime,
            ageSeconds: Math.floor((Date.now() - stats.mtime.getTime()) / 1000),
            isRecent: (Date.now() - stats.mtime.getTime()) < 300, // Updated in last 5 minutes
            hasData: stats.size > 100, // More than just header
            records: Math.floor((stats.size - 56) / (file.endsWith('.scid') ? 40 : 32)) // Estimate records
        };
    });

    // Filter for files with fresh data
    const freshFiles = allFiles.filter(file =>
        file.hasData && file.ageSeconds < 300 // Updated in last 5 minutes
    );

    // Sort by most recently updated
    freshFiles.sort((a, b) => a.ageSeconds - b.ageSeconds);

    console.log('\n🔥 FRESH DATA FILES (Updated in last 5 minutes):');
    console.log('═'.repeat(120));

    if (freshFiles.length === 0) {
        console.log('❌ No files updated in the last 5 minutes');
        console.log('   Checking files updated in the last hour...');

        // Check last hour if no recent files
        const recentFiles = allFiles.filter(file =>
            file.hasData && file.ageSeconds < 3600 // Updated in last hour
        ).sort((a, b) => a.ageSeconds - b.ageSeconds);

        if (recentFiles.length > 0) {
            console.log(`\n📊 RECENT FILES (Updated in last hour):`);
            console.log('═'.repeat(120));

            recentFiles.slice(0, 10).forEach((file, index) => {
                const sizeMB = (file.fileSize / 1024 / 1024).toFixed(2);
                console.log(`${(index + 1).toString().padStart(2)}. ${file.symbol.padEnd(25)} | ${file.file.padEnd(20)} | ${sizeMB.padStart(8)} MB | ${file.records.toLocaleString().padStart(12)} records | ${file.ageSeconds}s ago`);
            });
        } else {
            console.log('❌ No files updated in the last hour either');
        }
    } else {
        freshFiles.forEach((file, index) => {
            const sizeMB = (file.fileSize / 1024 / 1024).toFixed(2);
            console.log(`${(index + 1).toString().padStart(2)}. ${file.symbol.padEnd(25)} | ${file.file.padEnd(20)} | ${sizeMB.padStart(8)} MB | ${file.records.toLocaleString().padStart(12)} records | ${file.ageSeconds}s ago 🟢`);
        });
    }

    console.log('\n📊 LARGEST DATA FILES (Most active symbols):');
    console.log('═'.repeat(120));

    // Sort by file size (largest = most active)
    const largeFiles = allFiles
        .filter(file => file.hasData)
        .sort((a, b) => b.fileSize - a.fileSize)
        .slice(0, 10);

    largeFiles.forEach((file, index) => {
        const sizeMB = (file.fileSize / 1024 / 1024).toFixed(2);
        const ageMinutes = Math.floor(file.ageSeconds / 60);
        const isRecent = file.ageSeconds < 300;

        console.log(`${(index + 1).toString().padStart(2)}. ${file.symbol.padEnd(25)} | ${file.file.padEnd(20)} | ${sizeMB.padStart(8)} MB | ${file.records.toLocaleString().padStart(12)} records | ${ageMinutes}min ago ${isRecent ? '🟢' : ''}`);
    });

    console.log('\n📈 MOST ACTIVE SYMBOLS (By file size and update frequency):');
    console.log('═'.repeat(120));

    // Calculate activity score: size * (1/recentness)
    const activeFiles = allFiles
        .filter(file => file.hasData)
        .map(file => ({
            ...file,
            activityScore: file.fileSize * (1 / (file.ageSeconds + 1))
        }))
        .sort((a, b) => b.activityScore - a.activityScore)
        .slice(0, 10);

    activeFiles.forEach((file, index) => {
        const sizeMB = (file.fileSize / 1024 / 1024).toFixed(2);
        const ageMinutes = Math.floor(file.ageSeconds / 60);
        const isRecent = file.ageSeconds < 300;

        console.log(`${(index + 1).toString().padStart(2)}. ${file.symbol.padEnd(25)} | ${file.file.padEnd(20)} | ${sizeMB.padStart(8)} MB | ${file.records.toLocaleString().padStart(12)} records | ${ageMinutes}min ago | Score: ${file.activityScore.toFixed(0).padStart(8)} ${isRecent ? '🟢' : ''}`);
    });

    console.log('\n📊 DATA QUALITY ANALYSIS:');
    console.log('═'.repeat(120));

    // Analyze data quality
    const now = Date.now();
    const qualityStats = {
        totalFiles: allFiles.length,
        filesWithData: allFiles.filter(f => f.hasData).length,
        recentFiles: allFiles.filter(f => f.ageSeconds < 3600).length,
        freshFiles: freshFiles.length,
        totalSizeMB: allFiles.reduce((sum, f) => sum + f.fileSize, 0) / 1024 / 1024,
        avgFileSizeMB: allFiles.reduce((sum, f) => sum + f.fileSize, 0) / allFiles.length / 1024 / 1024,
        largestFileMB: Math.max(...allFiles.map(f => f.fileSize)) / 1024 / 1024
    };

    console.log(`   Total Files: ${qualityStats.totalFiles}`);
    console.log(`   Files with Data: ${qualityStats.filesWithData} (${((qualityStats.filesWithData / qualityStats.totalFiles) * 100).toFixed(1)}%)`);
    console.log(`   Recent Files (1h): ${qualityStats.recentFiles}`);
    console.log(`   Fresh Files (5min): ${qualityStats.freshFiles}`);
    console.log(`   Total Data Size: ${qualityStats.totalSizeMB.toFixed(2)} MB`);
    console.log(`   Average File Size: ${qualityStats.avgFileSizeMB.toFixed(2)} MB`);
    console.log(`   Largest File: ${qualityStats.largestFileMB.toFixed(2)} MB`);

    // Check for specific high-value symbols
    console.log('\n🎯 HIGH-VALUE SYMBOL CHECK:');
    console.log('═'.repeat(120));

    const highValueSymbols = [
        'BTCUSDT_PERP_BINANCE', 'BTCUSD_PERP_BINANCE',
        'ESH25-CME', 'ESM25-CME', 'ESU25-CME', 'ESZ25-CME',
        'ETHUSDT_PERP_BINANCE', 'SOLUSDT_PERP_BINANCE',
        'GCJ25-CME', 'CLH25-CME', 'XAUUSD', 'AAPL'
    ];

    highValueSymbols.forEach(symbol => {
        const file = allFiles.find(f => f.symbol === symbol);
        if (file) {
            const sizeMB = (file.fileSize / 1024 / 1024).toFixed(2);
            const ageMinutes = Math.floor(file.ageSeconds / 60);
            const isRecent = file.ageSeconds < 300;

            console.log(`✅ ${symbol.padEnd(25)} | ${sizeMB.padStart(8)} MB | ${file.records.toLocaleString().padStart(12)} records | ${ageMinutes}min ago ${isRecent ? '🟢' : ''}`);
        } else {
            console.log(`❌ ${symbol.padEnd(25)} | Not found in current data`);
        }
    });

    console.log('\n🎯 RECOMMENDED SYMBOLS FOR TRADING:');
    console.log('═'.repeat(120));

    // Recommend symbols based on activity and freshness
    const recommended = activeFiles
        .filter(file => file.ageSeconds < 3600 && file.fileSize > 1000000) // Updated in last hour, >1MB
        .slice(0, 5);

    if (recommended.length > 0) {
        recommended.forEach((file, index) => {
            const sizeMB = (file.fileSize / 1024 / 1024).toFixed(2);
            const ageMinutes = Math.floor(file.ageSeconds / 60);

            console.log(`${(index + 1).toString().padStart(2)}. ${file.symbol.padEnd(25)} | ${sizeMB.padStart(8)} MB | ${file.records.toLocaleString().padStart(12)} records | ${ageMinutes}min ago`);
            console.log(`   → High activity, good liquidity, recently updated`);
        });
    } else {
        console.log('   No highly active symbols found - market may be closed or data feed inactive');
    }

    console.log('\n🎉 Fresh Data Analysis Complete!');
    console.log('✅ Use these symbols for real-time trading and analysis');

} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}