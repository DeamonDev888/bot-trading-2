/**
 * Identify all crypto symbols in SierraChart data
 * Focus on BTC, ETH, SOL and other cryptocurrencies
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SIERRA_DATA_PATH = 'C:/SierraChart/Data/';

console.log('🔍 Identifying Crypto Symbols in SierraChart...\n');

try {
    if (!existsSync(SIERRA_DATA_PATH)) {
        console.log('❌ SierraChart data directory not found!');
        process.exit(1);
    }

    const files = readdirSync(SIERRA_DATA_PATH);
    const scidFiles = files.filter(f => f.endsWith('.scid'));

    console.log(`📊 Found ${scidFiles.length} .scid files`);

    // Look for crypto patterns
    const cryptoPatterns = [
        { pattern: /BTC/i, description: 'Bitcoin' },
        { pattern: /ETH/i, description: 'Ethereum' },
        { pattern: /SOL/i, description: 'Solana' },
        { pattern: /XRP/i, description: 'XRP' },
        { pattern: /ADA/i, description: 'Cardano' },
        { pattern: /DOGE/i, description: 'Dogecoin' },
        { pattern: /DOT/i, description: 'Polkadot' },
        { pattern: /LTC/i, description: 'Litecoin' },
        { pattern: /CRYPTO/i, description: 'Crypto-related' },
        { pattern: /COIN/i, description: 'Crypto coin' },
        { pattern: /PERP/i, description: 'Perpetual contract' },
        { pattern: /BINANCE/i, description: 'Binance exchange' }
    ];

    console.log('\n📋 Crypto Symbols Found:');
    console.log('═'.repeat(100));

    const cryptoSymbols = [];

    scidFiles.forEach(file => {
        const symbol = file.replace('.scid', '');
        const filePath = join(SIERRA_DATA_PATH, file);
        const stats = statSync(filePath);

        // Check if this might be a crypto symbol
        let isCrypto = false;
        let cryptoType = 'Unknown';

        for (const pattern of cryptoPatterns) {
            if (pattern.pattern.test(symbol)) {
                isCrypto = true;
                cryptoType = pattern.description;
                break;
            }
        }

        // Also check for common crypto exchange patterns
        if (symbol.includes('PERP') || symbol.includes('BINANCE') || symbol.includes('USDT')) {
            isCrypto = true;
            cryptoType = 'Crypto Perpetual/Exchange';
        }

        if (isCrypto) {
            cryptoSymbols.push({
                symbol,
                fileSize: stats.size,
                lastModified: stats.mtime,
                cryptoType,
                isRecent: (Date.now() - stats.mtime.getTime()) < 300000 // Updated in last 5 minutes
            });
        }
    });

    // Sort by file size (larger files likely more active)
    cryptoSymbols.sort((a, b) => b.fileSize - a.fileSize);

    // Display results
    cryptoSymbols.forEach((crypto, index) => {
        const sizeMB = (crypto.fileSize / 1024 / 1024).toFixed(2);
        const ageSeconds = Math.floor((Date.now() - crypto.lastModified.getTime()) / 1000);
        const isRecent = ageSeconds < 300;

        console.log(`${(index + 1).toString().padStart(2)}. ${crypto.symbol.padEnd(30)} | ${sizeMB.padStart(8)} MB | ${crypto.cryptoType.padEnd(25)} | ${ageSeconds}s ago ${isRecent ? '🟢' : ''}`);
    });

    console.log('\n📊 Crypto Symbol Analysis:');
    console.log('═'.repeat(100));

    // Analyze crypto symbol formats
    const formatAnalysis = {};

    cryptoSymbols.slice(0, 10).forEach(crypto => {
        const symbol = crypto.symbol;

        if (symbol.includes('BTC')) {
            formatAnalysis[symbol] = 'Bitcoin (BTC)';
        } else if (symbol.includes('ETH')) {
            formatAnalysis[symbol] = 'Ethereum (ETH)';
        } else if (symbol.includes('SOL')) {
            formatAnalysis[symbol] = 'Solana (SOL)';
        } else if (symbol.includes('PERP') || symbol.includes('BINANCE')) {
            formatAnalysis[symbol] = 'Perpetual/Exchange contract';
        } else {
            formatAnalysis[symbol] = 'Other crypto asset';
        }
    });

    Object.entries(formatAnalysis).forEach(([symbol, type]) => {
        console.log(`   ${symbol.padEnd(30)} → ${type}`);
    });

    console.log('\n🎯 Crypto Symbol Identification Complete!');
    console.log(`   Total Crypto Symbols: ${cryptoSymbols.length}`);

    // Check for specific requested cryptos
    const requestedCryptos = ['BTC', 'ETH', 'SOL'];
    const foundCryptos = {};

    requestedCryptos.forEach(crypto => {
        const found = cryptoSymbols.find(s => s.symbol.includes(crypto));
        if (found) {
            foundCryptos[crypto] = found;
        }
    });

    console.log('\n🔍 Requested Crypto Analysis:');
    console.log('═'.repeat(100));

    requestedCryptos.forEach(crypto => {
        if (foundCryptos[crypto]) {
            const info = foundCryptos[crypto];
            const sizeMB = (info.fileSize / 1024 / 1024).toFixed(2);
            console.log(`✅ ${crypto}: Found ${info.symbol} (${sizeMB} MB) - ${info.cryptoType}`);
        } else {
            console.log(`❌ ${crypto}: Not found in current data`);
        }
    });

} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}