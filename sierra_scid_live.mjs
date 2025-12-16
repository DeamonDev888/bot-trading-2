#!/usr/bin/env node
/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║      📊 SIERRACHART SCID LIVE READER - Quasi-Temps Réel           ║
 * ╚════════════════════════════════════════════════════════════════════╝
 * 
 * Lit les fichiers SCID de SierraChart et surveille les changements
 * pour obtenir les données "quasi-temps réel" (polling toutes les 500ms)
 * 
 * CONTOURNE la limitation DTC de SierraChart !
 */

import { existsSync, statSync, openSync, readSync, closeSync } from 'fs';
import { join } from 'path';

const SIERRACHART_DATA = 'C:\\SierraChart\\Data';

// Symboles à surveiller
const SYMBOLS = [
    'AAPL',
    'BTCUSDT_PERP_BINANCE',
    'XAUUSD',
    'MESZ25-CME',
    'YMZ25-CBOT',
    'EURUSD'
];

// Format SCID Record (40 bytes par record)
const SCID_HEADER_SIZE = 56;
const SCID_RECORD_SIZE = 40;

// Structure d'un record SCID
function parseScidRecord(buffer) {
    const dateTime = buffer.readDoubleLE(0);      // DateTime (SCDateTime)
    const open = buffer.readFloatLE(8);            // Open
    const high = buffer.readFloatLE(12);           // High
    const low = buffer.readFloatLE(16);            // Low
    const close = buffer.readFloatLE(20);          // Close
    const numTrades = buffer.readUInt32LE(24);     // NumTrades
    const volume = buffer.readUInt32LE(28);        // TotalVolume
    const bidVolume = buffer.readUInt32LE(32);     // BidVolume
    const askVolume = buffer.readUInt32LE(36);     // AskVolume
    
    // Convertir SCDateTime en JavaScript Date
    // SCDateTime = nombre de jours depuis 1899-12-30, avec fraction pour l'heure
    const jsDate = scDateTimeToJs(dateTime);
    
    return {
        dateTime: jsDate,
        open, high, low, close,
        numTrades, volume, bidVolume, askVolume
    };
}

function scDateTimeToJs(scDateTime) {
    // Base: 1899-12-30 = Excel/OLE Automation date base
    const baseDate = new Date(1899, 11, 30);
    const days = Math.floor(scDateTime);
    const fraction = scDateTime - days;
    const ms = fraction * 24 * 60 * 60 * 1000;
    
    const date = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000 + ms);
    return date;
}

class SymbolWatcher {
    constructor(symbol) {
        this.symbol = symbol;
        this.scidPath = join(SIERRACHART_DATA, `${symbol}.scid`);
        this.lastSize = 0;
        this.lastRecord = null;
        this.updateCount = 0;
    }
    
    init() {
        if (!existsSync(this.scidPath)) {
            console.log(`   ⚠️  ${this.symbol}: fichier SCID non trouvé`);
            return false;
        }
        
        const stats = statSync(this.scidPath);
        this.lastSize = stats.size;
        
        // Lire le dernier record
        this.lastRecord = this.readLastRecord();
        
        if (this.lastRecord) {
            console.log(`   ✅ ${this.symbol}: ${this.lastRecord.close.toFixed(2)} @ ${this.lastRecord.dateTime.toISOString()}`);
        }
        
        return true;
    }
    
    readLastRecord() {
        try {
            const stats = statSync(this.scidPath);
            const numRecords = Math.floor((stats.size - SCID_HEADER_SIZE) / SCID_RECORD_SIZE);
            
            if (numRecords < 1) return null;
            
            const fd = openSync(this.scidPath, 'r');
            const buffer = Buffer.alloc(SCID_RECORD_SIZE);
            const offset = SCID_HEADER_SIZE + (numRecords - 1) * SCID_RECORD_SIZE;
            
            readSync(fd, buffer, 0, SCID_RECORD_SIZE, offset);
            closeSync(fd);
            
            return parseScidRecord(buffer);
        } catch (e) {
            return null;
        }
    }
    
    checkForUpdates() {
        try {
            const stats = statSync(this.scidPath);
            
            if (stats.size > this.lastSize) {
                // Nouveaux records !
                const newRecords = Math.floor((stats.size - this.lastSize) / SCID_RECORD_SIZE);
                this.lastSize = stats.size;
                this.lastRecord = this.readLastRecord();
                this.updateCount += newRecords;
                
                return {
                    symbol: this.symbol,
                    newRecords,
                    lastRecord: this.lastRecord
                };
            }
            
            return null;
        } catch (e) {
            return null;
        }
    }
}

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║      📊 SIERRACHART SCID LIVE READER - Quasi-Temps Réel           ║
╚════════════════════════════════════════════════════════════════════╝

   📋 Ce script lit les fichiers SCID directement
   🔄 Rafraîchissement: toutes les 500ms
   ⚡ Contourne la limitation DTC de SierraChart!

═══════════════════════════════════════════════════════════════════
📊 INITIALISATION DES SYMBOLES
═══════════════════════════════════════════════════════════════════
`);

const watchers = [];
for (const symbol of SYMBOLS) {
    const watcher = new SymbolWatcher(symbol);
    if (watcher.init()) {
        watchers.push(watcher);
    }
}

console.log(`
═══════════════════════════════════════════════════════════════════
📡 SURVEILLANCE EN COURS... (Ctrl+C pour arrêter)
═══════════════════════════════════════════════════════════════════
`);

// Compteurs
let totalUpdates = 0;
const startTime = Date.now();

// Polling loop
const pollInterval = setInterval(() => {
    for (const watcher of watchers) {
        const update = watcher.checkForUpdates();
        if (update) {
            totalUpdates += update.newRecords;
            const time = update.lastRecord.dateTime.toLocaleTimeString();
            const price = update.lastRecord.close.toFixed(2);
            console.log(`📈 ${update.symbol.padEnd(25)} | $${price.padStart(10)} | +${update.newRecords} tick(s) | ${time}`);
        }
    }
}, 500);

// Afficher un résumé périodique
const summaryInterval = setInterval(() => {
    const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
    console.log(`\n── 📊 [${elapsedSec}s] Total updates: ${totalUpdates} | Symboles actifs: ${watchers.length} ──\n`);
}, 30000);

// Arrêt propre
process.on('SIGINT', () => {
    clearInterval(pollInterval);
    clearInterval(summaryInterval);
    
    const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
    
    console.log(`
═══════════════════════════════════════════════════════════════════
📊 RÉSUMÉ FINAL
═══════════════════════════════════════════════════════════════════

   ⏱️  Durée: ${elapsedSec} secondes
   📈 Total updates: ${totalUpdates}
   📊 Symboles surveillés: ${watchers.length}

   Par symbole:
`);
    
    for (const watcher of watchers) {
        const price = watcher.lastRecord ? watcher.lastRecord.close.toFixed(2) : 'N/A';
        console.log(`      ${watcher.symbol.padEnd(25)} | ${watcher.updateCount.toString().padStart(6)} updates | $${price}`);
    }
    
    console.log('\n🏁 Arrêt');
    process.exit(0);
});

// Message d'info
setTimeout(() => {
    if (totalUpdates === 0) {
        console.log(`
⚠️  Pas de nouveaux ticks détectés.
   
   Possibilités:
   1. Les marchés sont fermés
   2. Les charts ne sont pas ouverts dans SierraChart
   3. Le data feed n'est pas actif
   
   Attendez que des trades arrivent dans SierraChart...
`);
    }
}, 10000);
