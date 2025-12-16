#!/usr/bin/env node
/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║      📊 SIERRACHART SCID READER - LECTURE DIRECTE                  ║
 * ╚════════════════════════════════════════════════════════════════════╝
 * 
 * Lit les fichiers .scid de SierraChart directement du disque.
 * Ces fichiers sont mis à jour EN TEMPS RÉEL par SierraChart quand
 * les charts sont ouverts !
 * 
 * AVANTAGE: Fonctionne sans aucune config DTC !
 */

import { existsSync, statSync, openSync, readSync, closeSync, readdirSync } from 'fs';
import { join } from 'path';

const SIERRACHART_DATA = 'C:\\SierraChart\\Data';

// Header SCID (56 bytes)
const SCID_HEADER_SIZE = 56;
// Record SCID (40 bytes)
const SCID_RECORD_SIZE = 40;

/**
 * Parse un record SCID (40 bytes)
 * Format: SCDateTime(8) + OHLC(16) + NumTrades(4) + Volume(4) + BidVol(4) + AskVol(4)
 */
function parseScidRecord(buffer) {
    const dateTime = buffer.readDoubleLE(0);
    const open = buffer.readFloatLE(8);
    const high = buffer.readFloatLE(12);
    const low = buffer.readFloatLE(16);
    const close = buffer.readFloatLE(20);
    const numTrades = buffer.readUInt32LE(24);
    const volume = buffer.readUInt32LE(28);
    const bidVolume = buffer.readUInt32LE(32);
    const askVolume = buffer.readUInt32LE(36);
    
    // SCDateTime = jours depuis 1899-12-30 (format OLE)
    const baseDate = new Date(1899, 11, 30);
    const days = Math.floor(dateTime);
    const fraction = dateTime - days;
    const ms = fraction * 24 * 60 * 60 * 1000;
    const jsDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000 + ms);
    
    return {
        dateTime: jsDate,
        open, high, low, close,
        numTrades, volume, bidVolume, askVolume
    };
}

/**
 * Lit les N derniers records d'un fichier SCID
 */
function readLastRecords(filePath, count = 10) {
    if (!existsSync(filePath)) return null;
    
    const stats = statSync(filePath);
    const totalRecords = Math.floor((stats.size - SCID_HEADER_SIZE) / SCID_RECORD_SIZE);
    
    if (totalRecords < 1) return null;
    
    const recordsToRead = Math.min(count, totalRecords);
    const startRecord = totalRecords - recordsToRead;
    const offset = SCID_HEADER_SIZE + startRecord * SCID_RECORD_SIZE;
    
    const fd = openSync(filePath, 'r');
    const buffer = Buffer.alloc(recordsToRead * SCID_RECORD_SIZE);
    readSync(fd, buffer, 0, recordsToRead * SCID_RECORD_SIZE, offset);
    closeSync(fd);
    
    const records = [];
    for (let i = 0; i < recordsToRead; i++) {
        const recordBuffer = buffer.slice(i * SCID_RECORD_SIZE, (i + 1) * SCID_RECORD_SIZE);
        records.push(parseScidRecord(recordBuffer));
    }
    
    return records;
}

/**
 * Obtenir les infos d'un symbole
 */
function getSymbolInfo(symbol) {
    const filePath = join(SIERRACHART_DATA, `${symbol}.scid`);
    
    if (!existsSync(filePath)) {
        return { exists: false };
    }
    
    const stats = statSync(filePath);
    const totalRecords = Math.floor((stats.size - SCID_HEADER_SIZE) / SCID_RECORD_SIZE);
    const records = readLastRecords(filePath, 5);
    
    return {
        exists: true,
        filePath,
        fileSize: stats.size,
        totalRecords,
        lastModified: stats.mtime,
        lastRecords: records
    };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║      📊 SIERRACHART SCID READER - LECTURE DIRECTE                  ║
╚════════════════════════════════════════════════════════════════════╝

   📂 Dossier: ${SIERRACHART_DATA}
   📋 Format: Fichiers .scid (tick data)
   ⚡ Avantage: Pas besoin de config DTC !
`);

// Lister tous les fichiers SCID disponibles
console.log('═══════════════════════════════════════════════════════════════');
console.log('📂 FICHIERS SCID DISPONIBLES');
console.log('═══════════════════════════════════════════════════════════════\n');

const scidFiles = readdirSync(SIERRACHART_DATA)
    .filter(f => f.endsWith('.scid'))
    .sort((a, b) => {
        const statA = statSync(join(SIERRACHART_DATA, a));
        const statB = statSync(join(SIERRACHART_DATA, b));
        return statB.mtime.getTime() - statA.mtime.getTime(); // Plus récent en premier
    });

console.log(`   Trouvé ${scidFiles.length} fichiers .scid\n`);

// Afficher les 10 plus récemment modifiés
console.log('   Les 10 plus récemment modifiés:\n');
scidFiles.slice(0, 10).forEach((file, i) => {
    const stats = statSync(join(SIERRACHART_DATA, file));
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    const modified = stats.mtime.toLocaleString();
    const symbol = file.replace('.scid', '');
    console.log(`   ${(i+1).toString().padStart(2)}. ${symbol.padEnd(30)} | ${sizeMB.padStart(8)} MB | ${modified}`);
});

// Symboles à analyser en détail
const SYMBOLS_TO_ANALYZE = [
    'BTCUSDT_PERP_BINANCE',
    'AAPL',
    'XAUUSD',
    'MESZ25-CME'
];

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('📊 DONNÉES TEMPS RÉEL (Derniers ticks)');
console.log('═══════════════════════════════════════════════════════════════\n');

for (const symbol of SYMBOLS_TO_ANALYZE) {
    const info = getSymbolInfo(symbol);
    
    if (!info.exists) {
        console.log(`❌ ${symbol}: Fichier non trouvé\n`);
        continue;
    }
    
    const timeSinceUpdate = Math.floor((Date.now() - info.lastModified.getTime()) / 1000);
    const isRecent = timeSinceUpdate < 60;
    
    console.log(`📊 ${symbol}`);
    console.log(`   📁 Taille: ${(info.fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   📈 Total ticks: ${info.totalRecords.toLocaleString()}`);
    console.log(`   🕐 Dernière MAJ: ${info.lastModified.toLocaleString()} (${timeSinceUpdate}s ago) ${isRecent ? '🟢' : '🔴'}`);
    
    if (info.lastRecords && info.lastRecords.length > 0) {
        console.log(`   📋 Derniers ticks:`);
        info.lastRecords.slice(-3).forEach(record => {
            const time = record.dateTime.toLocaleTimeString();
            console.log(`      ${time} | O:${record.open.toFixed(2)} H:${record.high.toFixed(2)} L:${record.low.toFixed(2)} C:${record.close.toFixed(2)} | Vol:${record.volume}`);
        });
    }
    console.log('');
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('💡 CONCLUSION');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log(`   ✅ Les fichiers SCID contiennent des données temps réel!
   
   Quand un chart est ouvert dans SierraChart:
   - Le fichier .scid est mis à jour EN TEMPS RÉEL
   - Vous pouvez le lire à tout moment
   - Pas besoin de passer par le DTC server!

   📚 Utilisez ce reader pour obtenir les données tick
      dans votre système de trading.
`);

// Export pour utilisation comme module
export { readLastRecords, getSymbolInfo, parseScidRecord };
