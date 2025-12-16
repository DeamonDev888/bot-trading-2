/**
 * SierraChart SCID Reader - Version Finale
 * 
 * Lit les fichiers .scid et affiche les dernières données
 */

console.log('📊 SIERRACHART DATA READER - Final\n');
console.log('═'.repeat(60));

import * as fs from 'fs';
import * as path from 'path';

const DATA_PATH = 'C:/SierraChart/Data/';

function readScidFile(filePath, numRecords = 10) {
  const buffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath, '.scid');
  
  // Header
  const headerSize = buffer.readUInt32LE(4) || 56;
  const recordSize = buffer.readUInt32LE(8) || 40;
  
  const dataSize = buffer.length - headerSize;
  const totalRecords = Math.floor(dataSize / recordSize);
  
  // Lire les derniers records
  const records = [];
  const startRecord = Math.max(0, totalRecords - numRecords);
  
  for (let i = startRecord; i < totalRecords; i++) {
    const offset = headerSize + (i * recordSize);
    if (offset + recordSize > buffer.length) break;
    
    try {
      // DateTime (int64 microsecondes)
      const dateTimeInt = buffer.readBigInt64LE(offset);
      const usPerDay = BigInt(86400000000);
      const excelEpoch = new Date(1899, 11, 30).getTime();
      const days = Number(dateTimeInt / usPerDay);
      const timestamp = excelEpoch + days * 24 * 60 * 60 * 1000;
      const date = new Date(timestamp);
      
      // OHLCV
      const open = buffer.readFloatLE(offset + 8);
      const high = buffer.readFloatLE(offset + 12);
      const low = buffer.readFloatLE(offset + 16);
      const close = buffer.readFloatLE(offset + 20);
      const numTrades = buffer.readUInt32LE(offset + 24);
      const volume = buffer.readUInt32LE(offset + 28);
      
      if (close > 0 && date.getFullYear() >= 2020) {
        records.push({ date, open, high, low, close, numTrades, volume });
      }
    } catch(e) {}
  }
  
  return {
    symbol: fileName,
    totalRecords,
    records,
    sizeBytes: buffer.length,
    lastModified: fs.statSync(filePath).mtime
  };
}

function formatPrice(price, symbol) {
  if (price > 10000) return price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (price > 100) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 5 });
}

// Main
async function main() {
  const files = fs.readdirSync(DATA_PATH)
    .filter(f => f.endsWith('.scid'))
    .map(f => ({
      name: f,
      path: path.join(DATA_PATH, f),
      stats: fs.statSync(path.join(DATA_PATH, f))
    }))
    .sort((a, b) => b.stats.mtime - a.stats.mtime);

  console.log(`📂 ${files.length} fichiers trouvés dans ${DATA_PATH}\n`);
  
  const allData = [];

  for (const file of files.slice(0, 10)) {
    const data = readScidFile(file.path, 5);
    allData.push(data);
    
    if (data.records.length > 0) {
      const last = data.records[data.records.length - 1];
      
      console.log(`\n📈 ${data.symbol}`);
      console.log('─'.repeat(40));
      console.log(`   📊 Barres totales: ${data.totalRecords.toLocaleString()}`);
      console.log(`   💾 Taille: ${(data.sizeBytes / (1024*1024)).toFixed(1)} MB`);
      console.log(`   📅 Modifié: ${data.lastModified.toLocaleString()}`);
      console.log('');
      console.log(`   🔴 DERNIÈRE BARRE:`);
      console.log(`   ├─ Date:   ${last.date.toLocaleString()}`);
      console.log(`   ├─ Open:   $${formatPrice(last.open)}`);
      console.log(`   ├─ High:   $${formatPrice(last.high)}`);
      console.log(`   ├─ Low:    $${formatPrice(last.low)}`);
      console.log(`   ├─ Close:  $${formatPrice(last.close)}`);
      console.log(`   └─ Volume: ${last.volume.toLocaleString()}`);
    }
  }

  // Résumé
  console.log('\n\n');
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║' + '  RÉSUMÉ DES PRIX  '.padStart(32).padEnd(58) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');
  console.log('');

  for (const data of allData) {
    if (data.records.length > 0) {
      const last = data.records[data.records.length - 1];
      const symbol = data.symbol.padEnd(25);
      const price = formatPrice(last.close).padStart(15);
      console.log(`   ${symbol} : $${price}`);
    }
  }

  console.log('\n');
  console.log('💡 Ces données sont stockées localement dans SierraChart.');
  console.log('   Pour des données en temps réel, ouvrez les charts correspondants.');
  console.log('');
  
  console.log('🏁 Lecture terminée!');
}

main().catch(console.error);
