/**
 * Identify actual CME symbol format in SierraChart data
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SIERRA_DATA_PATH = 'C:/SierraChart/Data/';

console.log('🔍 Identifying CME Symbol Format...\n');

try {
    if (!existsSync(SIERRA_DATA_PATH)) {
        console.log('❌ SierraChart data directory not found!');
        process.exit(1);
    }

    const files = readdirSync(SIERRA_DATA_PATH);
    const scidFiles = files.filter(f => f.endsWith('.scid'));

    console.log(`📊 Found ${scidFiles.length} .scid files`);

    // Look for potential CME patterns
    const potentialCMEPatterns = [
        { pattern: /-CME/i, description: 'Contains -CME suffix' },
        { pattern: /CME/i, description: 'Contains CME anywhere' },
        { pattern: /ES/i, description: 'E-mini S&P patterns' },
        { pattern: /NQ/i, description: 'Nasdaq patterns' },
        { pattern: /BTC/i, description: 'Bitcoin patterns' },
        { pattern: /GC/i, description: 'Gold patterns' },
        { pattern: /CL/i, description: 'Crude Oil patterns' },
        { pattern: /^([A-Z]{1,3})([A-Z0-9]{1,2})/, description: 'Standard futures format' }
    ];

    console.log('\n📋 Potential CME Symbols:');
    console.log('═'.repeat(80));

    const cmeCandidates = [];

    scidFiles.forEach(file => {
        const symbol = file.replace('.scid', '');
        const filePath = join(SIERRA_DATA_PATH, symbol + '.scid');
        const stats = statSync(filePath);

        // Check if this might be a CME symbol
        let isPotentialCME = false;
        let matchedPattern = '';

        for (const pattern of potentialCMEPatterns) {
            if (pattern.pattern.test(symbol)) {
                isPotentialCME = true;
                matchedPattern = pattern.description;
                break;
            }
        }

        if (isPotentialCME || symbol.length <= 10) {
            cmeCandidates.push({
                symbol,
                fileSize: stats.size,
                lastModified: stats.mtime,
                potentialPattern: matchedPattern || 'Unknown'
            });
        }
    });

    // Sort by file size (larger files likely more active)
    cmeCandidates.sort((a, b) => b.fileSize - a.fileSize);

    // Display results
    cmeCandidates.slice(0, 20).forEach((candidate, index) => {
        const sizeMB = (candidate.fileSize / 1024 / 1024).toFixed(2);
        const ageSeconds = Math.floor((Date.now() - candidate.lastModified.getTime()) / 1000);
        const isRecent = ageSeconds < 300; // Updated in last 5 minutes

        console.log(`${(index + 1).toString().padStart(2)}. ${candidate.symbol.padEnd(15)} | ${sizeMB.padStart(8)} MB | ${candidate.potentialPattern.padEnd(25)} | ${ageSeconds}s ago ${isRecent ? '🟢' : ''}`);
    });

    console.log('\n📊 Symbol Format Analysis:');
    console.log('═'.repeat(80));

    // Analyze symbol formats
    const formatAnalysis = {};

    cmeCandidates.slice(0, 10).forEach(candidate => {
        const symbol = candidate.symbol;

        // Common CME patterns
        if (/^[A-Z]{2,3}[A-Z0-9]{1,2}$/.test(symbol)) {
            formatAnalysis[symbol] = 'Standard futures format (e.g., ESH25)';
        }
        else if (/^[A-Z]{2,3}[A-Z0-9]{1,2}-[A-Z]{3}$/.test(symbol)) {
            formatAnalysis[symbol] = 'Exchange suffix format (e.g., ESH25-CME)';
        }
        else if (/^[A-Z]{2,4}$/.test(symbol)) {
            formatAnalysis[symbol] = 'Simple symbol format (e.g., ESM25)';
        }
        else {
            formatAnalysis[symbol] = 'Other format';
        }
    });

    Object.entries(formatAnalysis).forEach(([symbol, format]) => {
        console.log(`   ${symbol.padEnd(15)} → ${format}`);
    });

    console.log('\n🎯 CME Symbol Identification Complete!');
    console.log('Use these patterns to update CMEDataConsumer.ts');

} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}