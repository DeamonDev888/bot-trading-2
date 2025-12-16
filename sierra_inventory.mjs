/**
 * INVENTAIRE COMPLET DES DONNÉES SIERRACHART LOCALES
 * 
 * Analyse détaillée de toutes les données SCID stockées
 */

console.log('');
console.log('╔' + '═'.repeat(68) + '╗');
console.log('║' + '  📊 INVENTAIRE DES DONNÉES SIERRACHART  '.padStart(50).padEnd(68) + '║');
console.log('╚' + '═'.repeat(68) + '╝');
console.log('');

import * as fs from 'fs';
import * as path from 'path';

const DATA_PATH = 'C:/SierraChart/Data/';

// Catégorisation des symboles
function categorizeSymbol(symbol) {
  const upper = symbol.toUpperCase();
  
  if (upper.includes('BTC') || upper.includes('ETH') || upper.includes('XBT')) return 'Crypto';
  if (upper.includes('ES') || upper.includes('MES')) return 'S&P 500 Futures';
  if (upper.includes('NQ') || upper.includes('MNQ')) return 'Nasdaq Futures';
  if (upper.includes('YM') || upper.includes('MYM')) return 'Dow Jones Futures';
  if (upper.includes('GC') || upper.includes('XAU')) return 'Gold';
  if (upper.includes('CL') || upper.includes('OIL')) return 'Crude Oil';
  if (upper.includes('EUR') || upper.includes('GBP') || upper.includes('JPY') || upper.includes('6E') || upper.includes('6B')) return 'Forex';
  if (upper.includes('VIX')) return 'Volatilité (VIX)';
  if (upper.includes('ZN') || upper.includes('ZB') || upper.includes('TY')) return 'Bonds/Taux';
  if (upper.includes('TICK')) return 'Market Breadth';
  if (upper.includes('AAPL') || upper.includes('AMZN') || upper.includes('GOOG') || upper.includes('MSFT') || upper.includes('TSLA')) return 'Actions Tech';
  
  return 'Autres';
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function formatDuration(startDate, endDate) {
  const days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
  if (days < 30) return `${days} jours`;
  if (days < 365) return `${Math.floor(days / 30)} mois`;
  return `${(days / 365).toFixed(1)} ans`;
}

function analyzeFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  const stats = fs.statSync(filePath);
  
  const headerSize = buffer.readUInt32LE(4) || 56;
  const recordSize = buffer.readUInt32LE(8) || 40;
  const totalRecords = Math.floor((buffer.length - headerSize) / recordSize);
  
  // Lire première et dernière barre pour les dates
  let firstDate = null, lastDate = null;
  let firstPrice = 0, lastPrice = 0;
  let highestPrice = 0, lowestPrice = Infinity;
  
  // Première barre
  if (totalRecords > 0) {
    try {
      const offset = headerSize;
      const dt = buffer.readBigInt64LE(offset);
      firstDate = new Date(new Date(1899, 11, 30).getTime() + Number(dt / BigInt(86400000000)) * 86400000);
      firstPrice = buffer.readFloatLE(offset + 20);  // close
    } catch(e) {}
  }
  
  // Dernière barre et stats
  if (totalRecords > 0) {
    try {
      const offset = headerSize + ((totalRecords - 1) * recordSize);
      const dt = buffer.readBigInt64LE(offset);
      lastDate = new Date(new Date(1899, 11, 30).getTime() + Number(dt / BigInt(86400000000)) * 86400000);
      lastPrice = buffer.readFloatLE(offset + 20);
      
      // Scanner un échantillon pour high/low
      const sampleSize = Math.min(1000, totalRecords);
      const startSample = Math.max(0, totalRecords - sampleSize);
      
      for (let i = startSample; i < totalRecords; i++) {
        const off = headerSize + (i * recordSize);
        const h = buffer.readFloatLE(off + 12);
        const l = buffer.readFloatLE(off + 16);
        if (h > 0 && h < 1e10) highestPrice = Math.max(highestPrice, h);
        if (l > 0 && l < 1e10) lowestPrice = Math.min(lowestPrice, l);
      }
    } catch(e) {}
  }
  
  return {
    symbol: path.basename(filePath, '.scid'),
    sizeBytes: stats.size,
    totalBars: totalRecords,
    modified: stats.mtime,
    firstDate,
    lastDate,
    firstPrice,
    lastPrice,
    highestPrice: highestPrice > 0 ? highestPrice : null,
    lowestPrice: lowestPrice < Infinity ? lowestPrice : null
  };
}

// Main
async function main() {
  const files = fs.readdirSync(DATA_PATH).filter(f => f.endsWith('.scid'));
  
  console.log(`📂 Chemin: ${DATA_PATH}`);
  console.log(`📊 Fichiers trouvés: ${files.length}`);
  console.log('');
  
  const analyses = [];
  let totalSize = 0;
  let totalBars = 0;
  const categories = {};
  
  for (const file of files) {
    const filePath = path.join(DATA_PATH, file);
    const analysis = analyzeFile(filePath);
    analyses.push(analysis);
    totalSize += analysis.sizeBytes;
    totalBars += analysis.totalBars;
    
    const cat = categorizeSymbol(analysis.symbol);
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(analysis);
  }
  
  // Trier par taille
  analyses.sort((a, b) => b.sizeBytes - a.sizeBytes);
  
  // Résumé global
  console.log('═'.repeat(70));
  console.log('📊 RÉSUMÉ GLOBAL');
  console.log('═'.repeat(70));
  console.log(`   💾 Taille totale:     ${formatSize(totalSize)}`);
  console.log(`   📈 Barres totales:    ${totalBars.toLocaleString()}`);
  console.log(`   📁 Symboles:          ${files.length}`);
  console.log(`   📂 Catégories:        ${Object.keys(categories).length}`);
  console.log('');
  
  // Par catégorie
  console.log('═'.repeat(70));
  console.log('📊 DONNÉES PAR CATÉGORIE');
  console.log('═'.repeat(70));
  
  for (const [cat, items] of Object.entries(categories).sort((a, b) => b[1].length - a[1].length)) {
    const catSize = items.reduce((sum, i) => sum + i.sizeBytes, 0);
    const catBars = items.reduce((sum, i) => sum + i.totalBars, 0);
    
    console.log('');
    console.log(`   📁 ${cat.toUpperCase()}`);
    console.log('   ' + '─'.repeat(60));
    console.log(`   Symboles: ${items.length} | Taille: ${formatSize(catSize)} | Barres: ${catBars.toLocaleString()}`);
    console.log('');
    
    for (const item of items.sort((a, b) => b.sizeBytes - a.sizeBytes)) {
      const priceStr = item.lastPrice > 0 
        ? (item.lastPrice > 1000 
          ? `$${item.lastPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
          : `$${item.lastPrice.toFixed(4)}`)
        : 'N/A';
      
      const dateRange = item.firstDate && item.lastDate
        ? formatDuration(item.firstDate, item.lastDate)
        : 'N/A';
      
      console.log(`      ${item.symbol.padEnd(28)} ${formatSize(item.sizeBytes).padStart(10)} | ${item.totalBars.toLocaleString().padStart(12)} barres | ${priceStr.padStart(12)} | ${dateRange}`);
    }
  }
  
  // Détails par symbole
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('📊 DÉTAILS PAR SYMBOLE (Top 10 par taille)');
  console.log('═'.repeat(70));
  
  for (const a of analyses.slice(0, 10)) {
    console.log('');
    console.log(`   📈 ${a.symbol}`);
    console.log('   ' + '─'.repeat(55));
    console.log(`      💾 Taille:         ${formatSize(a.sizeBytes)}`);
    console.log(`      📊 Barres:         ${a.totalBars.toLocaleString()}`);
    
    if (a.firstDate) {
      console.log(`      📅 Première date:  ${a.firstDate.toLocaleDateString()}`);
    }
    if (a.lastDate) {
      console.log(`      📅 Dernière date:  ${a.lastDate.toLocaleDateString()}`);
    }
    if (a.firstDate && a.lastDate) {
      console.log(`      ⏱️ Période:        ${formatDuration(a.firstDate, a.lastDate)}`);
    }
    if (a.lastPrice > 0) {
      const priceStr = a.lastPrice > 1000 
        ? `$${a.lastPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
        : `$${a.lastPrice.toFixed(4)}`;
      console.log(`      💰 Dernier prix:   ${priceStr}`);
    }
    if (a.highestPrice && a.lowestPrice) {
      const rangeHigh = a.highestPrice > 1000 ? Math.round(a.highestPrice) : a.highestPrice.toFixed(4);
      const rangeLow = a.lowestPrice > 1000 ? Math.round(a.lowestPrice) : a.lowestPrice.toFixed(4);
      console.log(`      📈 Range récent:   $${rangeLow} - $${rangeHigh}`);
    }
    
    // Estimation du type de données
    const barsPerDay = Math.round(a.totalBars / (a.lastDate && a.firstDate ? (a.lastDate - a.firstDate) / 86400000 : 1));
    let dataType = 'Daily';
    if (barsPerDay > 1000) dataType = 'Tick';
    else if (barsPerDay > 100) dataType = 'Secondes';
    else if (barsPerDay > 20) dataType = 'Minutes';
    else if (barsPerDay > 5) dataType = 'Horaire';
    console.log(`      📋 Type estimé:    ${dataType} (~${barsPerDay} barres/jour)`);
  }
  
  // Utilisation des données
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('💡 UTILISATION DES DONNÉES');
  console.log('═'.repeat(70));
  console.log('');
  console.log('   Ces données peuvent être utilisées pour:');
  console.log('');
  console.log('   ✅ Backtesting de stratégies de trading');
  console.log('   ✅ Analyse technique historique');
  console.log('   ✅ Machine Learning / Prédictions');
  console.log('   ✅ Calcul d\'indicateurs sur l\'historique');
  console.log('   ✅ Détection de patterns');
  console.log('');
  console.log('   📌 Pour le temps réel via DTC:');
  console.log('      Ouvrez les charts de ces symboles dans SierraChart');
  console.log('');
  
  console.log('═'.repeat(70));
  console.log('🏁 INVENTAIRE TERMINÉ');
  console.log('═'.repeat(70));
}

main().catch(console.error);
