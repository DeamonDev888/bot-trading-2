/**
 * SierraChart Data File Reader
 * 
 * Ce script lit DIRECTEMENT les fichiers de données SierraChart (.scid)
 * sans passer par le serveur DTC. Utile pour accéder aux données historiques.
 * 
 * Format fichier .scid (SierraChart Intraday Data):
 * - Header: 56 bytes
 * - Records: 40 bytes chacun (OHLCV + DateTime + autres)
 */

console.log('📊 SIERRACHART DATA FILE READER\n');
console.log('═'.repeat(60));

import * as fs from 'fs';
import * as path from 'path';

const DATA_PATH = 'C:/SierraChart/Data/';

// Structure d'un record SCID (40 bytes)
// Offset 0: DateTime (8 bytes, double - SCDateTime format)
// Offset 8: Open (4 bytes, float)
// Offset 12: High (4 bytes, float)
// Offset 16: Low (4 bytes, float)
// Offset 20: Close (4 bytes, float)
// Offset 24: NumTrades (4 bytes, int)
// Offset 28: TotalVolume (4 bytes, int)
// Offset 32: BidVolume (4 bytes, int)
// Offset 36: AskVolume (4 bytes, int)

class SCIDReader {
  constructor(filePath) {
    this.filePath = filePath;
    this.headerSize = 56;
    this.recordSize = 40;
    this.records = [];
    this.header = {};
  }

  // Convertir SCDateTime en JavaScript Date
  // SCDateTime est le nombre de jours depuis le 30 décembre 1899
  scDateTimeToDate(scDateTime) {
    // Epoch: 30 décembre 1899
    const EPOCH = new Date(1899, 11, 30).getTime();
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    
    const timestamp = EPOCH + (scDateTime * MS_PER_DAY);
    return new Date(timestamp);
  }

  read() {
    try {
      const buffer = fs.readFileSync(this.filePath);
      const stats = fs.statSync(this.filePath);
      
      console.log(`📂 Fichier: ${path.basename(this.filePath)}`);
      console.log(`💾 Taille: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
      
      // Lire le header (56 bytes)
      if (buffer.length < this.headerSize) {
        console.log('❌ Fichier trop petit pour contenir un header');
        return null;
      }

      // Parser header SCID
      this.header = {
        fileTypeID: buffer.toString('ascii', 0, 4),  // "SCID"
        headerSize: buffer.readUInt32LE(4),
        recordSize: buffer.readUInt32LE(8),
        version: buffer.readUInt16LE(12),
      };

      console.log(`📋 Type: ${this.header.fileTypeID}`);
      console.log(`📋 Version: ${this.header.version}`);
      console.log(`📋 Record Size: ${this.header.recordSize} bytes`);

      // Calculer le nombre de records
      const dataSize = buffer.length - this.headerSize;
      const recordSize = this.header.recordSize || this.recordSize;
      const numRecords = Math.floor(dataSize / recordSize);
      
      console.log(`📊 Nombre de barres: ${numRecords.toLocaleString()}`);

      // Lire les derniers records (les plus récents sont à la fin)
      const maxRecords = Math.min(100, numRecords);
      const startRecord = numRecords - maxRecords;

      for (let i = 0; i < maxRecords; i++) {
        const recordIndex = startRecord + i;
        const offset = this.headerSize + (recordIndex * recordSize);
        
        if (offset + recordSize > buffer.length) break;

        try {
          const scDateTime = buffer.readDoubleLE(offset);
          const date = this.scDateTimeToDate(scDateTime);
          
          const record = {
            dateTime: date,
            open: buffer.readFloatLE(offset + 8),
            high: buffer.readFloatLE(offset + 12),
            low: buffer.readFloatLE(offset + 16),
            close: buffer.readFloatLE(offset + 20),
            numTrades: buffer.readUInt32LE(offset + 24),
            totalVolume: buffer.readUInt32LE(offset + 28),
            bidVolume: buffer.readUInt32LE(offset + 32),
            askVolume: buffer.readUInt32LE(offset + 36),
          };

          // Vérifier que les données sont valides
          if (record.open > 0 && record.high > 0 && !isNaN(date.getTime())) {
            this.records.push(record);
          }
        } catch (e) {
          // Ignorer les records invalides
        }
      }

      console.log(`✅ ${this.records.length} barres récentes lues`);
      
      return this.records;

    } catch (error) {
      console.error('❌ Erreur lecture:', error.message);
      return null;
    }
  }

  getLatestBars(count = 10) {
    return this.records.slice(-count);
  }

  getLastPrice() {
    if (this.records.length === 0) return null;
    return this.records[this.records.length - 1].close;
  }

  printSummary() {
    if (this.records.length === 0) {
      console.log('   ⚠️ Aucune donnée valide');
      return;
    }

    const latest = this.records[this.records.length - 1];
    const first = this.records[0];
    
    console.log('');
    console.log('   📊 DERNIÈRE BARRE:');
    console.log(`   ├─ Date:   ${latest.dateTime.toLocaleString()}`);
    console.log(`   ├─ Open:   $${latest.open.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   ├─ High:   $${latest.high.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   ├─ Low:    $${latest.low.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   ├─ Close:  $${latest.close.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   └─ Volume: ${latest.totalVolume.toLocaleString()}`);
    
    // Période couverte
    console.log('');
    console.log(`   📅 Période (dernières ${this.records.length} barres):`);
    console.log(`   ├─ De:     ${first.dateTime.toLocaleString()}`);
    console.log(`   └─ À:      ${latest.dateTime.toLocaleString()}`);
  }
}

// === MAIN ===

async function main() {
  // Lister les fichiers .scid disponibles
  console.log(`📂 Recherche des fichiers dans ${DATA_PATH}...\n`);

  let files = [];
  try {
    files = fs.readdirSync(DATA_PATH)
      .filter(f => f.endsWith('.scid'))
      .map(f => ({
        name: f,
        path: path.join(DATA_PATH, f),
        stats: fs.statSync(path.join(DATA_PATH, f))
      }))
      .sort((a, b) => b.stats.mtime - a.stats.mtime); // Plus récent en premier
  } catch (e) {
    console.log('❌ Impossible d\'accéder à:', DATA_PATH);
    console.log('   Vérifiez que SierraChart est installé');
    process.exit(1);
  }

  console.log(`✅ ${files.length} fichiers .scid trouvés\n`);
  
  // Lire les fichiers les plus récents
  const maxFiles = Math.min(8, files.length);
  const results = [];

  for (let i = 0; i < maxFiles; i++) {
    const file = files[i];
    console.log('\n' + '═'.repeat(50));
    
    const reader = new SCIDReader(file.path);
    const records = reader.read();
    
    if (records && records.length > 0) {
      reader.printSummary();
      
      results.push({
        symbol: path.basename(file.name, '.scid'),
        lastPrice: reader.getLastPrice(),
        lastDate: reader.getLatestBars(1)[0]?.dateTime,
        recordCount: records.length
      });
    }
  }

  // Résumé final
  console.log('\n\n');
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║' + '  RÉSUMÉ DES DONNÉES HISTORIQUES  '.padStart(38).padEnd(58) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');
  console.log('');

  console.log('💰 DERNIERS PRIX:');
  console.log('─'.repeat(50));
  
  for (const r of results) {
    if (r.lastPrice) {
      const price = r.lastPrice > 1000 
        ? r.lastPrice.toLocaleString('en-US', { minimumFractionDigits: 0 })
        : r.lastPrice.toLocaleString('en-US', { minimumFractionDigits: 4 });
      
      console.log(`   ${r.symbol.padEnd(25)} : $${price}`);
    }
  }

  console.log('\n');
  console.log('💡 UTILISATION:');
  console.log('─'.repeat(50));
  console.log('   Ces données historiques sont disponibles localement.');
  console.log('   Pour des données en temps réel via DTC:');
  console.log('   1. Ouvrez un chart du symbole dans SierraChart');
  console.log('   2. Connectez-vous à votre data feed');
  console.log('   3. Utilisez notre client DTC');
  console.log('');
  
  console.log('🏁 Lecture terminée!');
}

main().catch(console.error);
