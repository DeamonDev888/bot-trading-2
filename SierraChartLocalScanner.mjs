/**
 * SierraChart Local Data Scanner
 * 
 * Ce script scanne les fichiers de données locaux de SierraChart
 * pour trouver quels symboles ont des données historiques disponibles.
 * 
 * SierraChart stocke les données dans:
 * - C:\SierraChart\Data\ (fichiers .scid pour intraday, .dly pour daily)
 */

console.log('🔍 SIERRACHART LOCAL DATA SCANNER\n');
console.log('═'.repeat(60));

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

config({ path: '.env' });

// Chemins possibles pour les données SierraChart
const SIERRA_DATA_PATHS = [
  'C:/SierraChart/Data/',
  'C:/SierraChart/SierraChart_Data/',
  'D:/SierraChart/Data/',
  process.env.SIERRA_DATA_PATH || ''
].filter(p => p);

// Extensions de fichiers SierraChart
const DATA_EXTENSIONS = {
  '.scid': 'Intraday Data',
  '.dly': 'Daily Data',
  '.txt': 'Text Data',
  '.csv': 'CSV Data'
};

// Catégorisation des symboles
const SYMBOL_CATEGORIES = {
  'ES': 'E-mini S&P 500',
  'NQ': 'E-mini Nasdaq 100',
  'YM': 'Mini Dow Jones',
  'RTY': 'E-mini Russell 2000',
  'CL': 'Crude Oil',
  'GC': 'Gold',
  'SI': 'Silver',
  'NG': 'Natural Gas',
  'ZN': '10-Year T-Note',
  'ZB': '30-Year T-Bond',
  '6E': 'Euro FX',
  '6B': 'British Pound',
  'VIX': 'VIX Index',
  'VX': 'VIX Futures',
  'BTC': 'Bitcoin',
  'ETH': 'Ethereum',
  'MES': 'Micro E-mini S&P',
  'MNQ': 'Micro Nasdaq',
  'MYM': 'Micro Dow',
  'MGC': 'Micro Gold',
  'MCL': 'Micro Crude Oil',
  'EUR': 'Euro',
  'USD': 'US Dollar'
};

class SierraChartLocalScanner {
  constructor() {
    this.dataPath = null;
    this.results = {
      dataPath: null,
      files: [],
      symbols: [],
      categories: {},
      totalFiles: 0,
      totalSize: 0,
      scanTime: new Date().toISOString()
    };
  }

  findDataPath() {
    console.log('📂 Recherche du dossier de données SierraChart...\n');

    for (const testPath of SIERRA_DATA_PATHS) {
      if (!testPath) continue;
      
      try {
        if (fs.existsSync(testPath)) {
          const stats = fs.statSync(testPath);
          if (stats.isDirectory()) {
            const files = fs.readdirSync(testPath);
            const dataFiles = files.filter(f => 
              ['.scid', '.dly'].some(ext => f.toLowerCase().endsWith(ext))
            );
            
            if (dataFiles.length > 0) {
              console.log(`✅ Trouvé: ${testPath}`);
              console.log(`   ${dataFiles.length} fichiers de données\n`);
              this.dataPath = testPath;
              this.results.dataPath = testPath;
              return testPath;
            }
          }
        }
      } catch (e) {
        // Ignorer les erreurs d'accès
      }
    }

    // Chercher aussi dans le répertoire courant
    const localPaths = [
      './Data/',
      '../Data/',
      '../../SierraChart/Data/'
    ];

    for (const testPath of localPaths) {
      try {
        if (fs.existsSync(testPath)) {
          const files = fs.readdirSync(testPath);
          if (files.some(f => f.endsWith('.scid') || f.endsWith('.dly'))) {
            this.dataPath = testPath;
            this.results.dataPath = testPath;
            console.log(`✅ Trouvé localement: ${testPath}`);
            return testPath;
          }
        }
      } catch (e) {}
    }

    console.log('❌ Aucun dossier de données SierraChart trouvé');
    console.log('\n💡 Vérifiez:');
    console.log('   1. SierraChart est-il installé?');
    console.log('   2. Avez-vous ouvert des charts pour télécharger des données?');
    console.log('   3. Chemin habituel: C:\\SierraChart\\Data\\');
    
    return null;
  }

  scanDataFiles() {
    if (!this.dataPath) {
      console.log('❌ Pas de chemin de données valide');
      return;
    }

    console.log(`📊 Scan des fichiers dans ${this.dataPath}...\n`);

    try {
      const files = fs.readdirSync(this.dataPath);
      
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (!DATA_EXTENSIONS[ext]) continue;

        const filePath = path.join(this.dataPath, file);
        
        try {
          const stats = fs.statSync(filePath);
          const symbolName = path.basename(file, ext);
          
          const fileInfo = {
            file: file,
            symbol: symbolName,
            extension: ext,
            type: DATA_EXTENSIONS[ext],
            size: stats.size,
            sizeFormatted: this.formatSize(stats.size),
            modified: stats.mtime,
            modifiedFormatted: stats.mtime.toLocaleString()
          };

          this.results.files.push(fileInfo);
          this.results.totalFiles++;
          this.results.totalSize += stats.size;

          // Extraire le symbole de base
          const baseSymbol = this.extractBaseSymbol(symbolName);
          if (!this.results.symbols.includes(baseSymbol)) {
            this.results.symbols.push(baseSymbol);
          }

          // Catégoriser
          const category = this.categorizeSymbol(baseSymbol);
          if (!this.results.categories[category]) {
            this.results.categories[category] = [];
          }
          if (!this.results.categories[category].includes(symbolName)) {
            this.results.categories[category].push(symbolName);
          }

        } catch (e) {
          // Ignorer les fichiers inaccessibles
        }
      }

      // Trier les résultats
      this.results.files.sort((a, b) => b.modified - a.modified);
      this.results.symbols.sort();

    } catch (e) {
      console.error('❌ Erreur lors du scan:', e.message);
    }
  }

  extractBaseSymbol(symbolName) {
    // Enlever les suffixes de date (ex: ESH25 -> ES)
    // et les préfixes @ et # (ex: @ES# -> ES)
    let base = symbolName.replace(/^[@#]/, '').replace(/[#]$/, '');
    
    // Enlever les suffixes de mois/année
    base = base.replace(/[FGHJKMNQUVXZ]\d{2}$/, '');
    
    return base.toUpperCase();
  }

  categorizeSymbol(symbol) {
    // Vérifier les catégories connues
    for (const [key, name] of Object.entries(SYMBOL_CATEGORIES)) {
      if (symbol.includes(key)) {
        return name;
      }
    }

    // Catégorisation par patterns
    if (symbol.match(/^[A-Z]{6}$/)) return 'Forex';
    if (symbol.includes('USD') || symbol.includes('EUR')) return 'Devises';
    if (symbol.match(/^\$[A-Z]+/)) return 'Indices Cash';
    if (symbol.match(/^\.?VIX/i)) return 'Volatilité';
    
    return 'Autres';
  }

  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  printReport() {
    console.log('\n');
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║' + '  RAPPORT DES DONNÉES LOCALES SIERRACHART  '.padStart(40).padEnd(58) + '║');
    console.log('╚' + '═'.repeat(58) + '╝');
    console.log('');

    console.log(`📅 Date du scan: ${new Date().toLocaleString()}`);
    console.log(`📂 Chemin: ${this.results.dataPath || 'Non trouvé'}`);
    console.log(`📊 Total fichiers: ${this.results.totalFiles}`);
    console.log(`💾 Taille totale: ${this.formatSize(this.results.totalSize)}`);
    console.log(`📈 Symboles uniques: ${this.results.symbols.length}`);
    console.log('');

    // Afficher par catégorie
    console.log('═'.repeat(50));
    console.log('📊 SYMBOLES PAR CATÉGORIE');
    console.log('═'.repeat(50));

    const sortedCategories = Object.entries(this.results.categories)
      .sort((a, b) => b[1].length - a[1].length);

    for (const [category, symbols] of sortedCategories) {
      console.log(`\n   ${category.toUpperCase()} (${symbols.length}):`);
      
      // Afficher les 10 premiers symboles
      const displaySymbols = symbols.slice(0, 10);
      console.log(`   └── ${displaySymbols.join(', ')}${symbols.length > 10 ? `, +${symbols.length - 10} autres` : ''}`);
    }

    // Fichiers les plus récents
    console.log('\n');
    console.log('═'.repeat(50));
    console.log('📅 FICHIERS LES PLUS RÉCENTS');
    console.log('═'.repeat(50));

    const recentFiles = this.results.files.slice(0, 15);
    for (const file of recentFiles) {
      const timeAgo = this.getTimeAgo(file.modified);
      console.log(`   ${file.symbol.padEnd(20)} ${file.sizeFormatted.padStart(10)} | ${timeAgo}`);
    }

    // Fichiers les plus volumineux
    const largestFiles = [...this.results.files]
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);

    console.log('\n');
    console.log('═'.repeat(50));
    console.log('💾 FICHIERS LES PLUS VOLUMINEUX');
    console.log('═'.repeat(50));

    for (const file of largestFiles) {
      console.log(`   ${file.symbol.padEnd(20)} ${file.sizeFormatted.padStart(10)} | ${file.type}`);
    }

    // Recommandations
    console.log('\n');
    console.log('═'.repeat(50));
    console.log('💡 RECOMMANDATIONS');
    console.log('═'.repeat(50));
    console.log('');

    if (this.results.totalFiles === 0) {
      console.log('   ⚠️ Aucune donnée trouvée!');
      console.log('');
      console.log('   Pour obtenir des données:');
      console.log('   1. Ouvrez SierraChart');
      console.log('   2. Configurez un data feed (File > Connect > Data)');
      console.log('   3. Ouvrez des charts pour les symboles souhaités');
      console.log('   4. Les données seront téléchargées automatiquement');
    } else {
      console.log('   ✅ Données disponibles pour exploitation!');
      console.log('');
      console.log('   Pour utiliser ces données via DTC:');
      console.log('   1. Assurez-vous que le DTC Server est activé');
      console.log('   2. Ouvrez les charts correspondants dans SierraChart');
      console.log('   3. Les symboles s\'afficheront dans notre scanner DTC');
    }

    // Données gratuites potentielles
    console.log('\n');
    console.log('   📊 Données souvent gratuites:');
    console.log('   • Données délayées (15-20 min de retard)');
    console.log('   • Données de fin de journée (EOD)');
    console.log('   • Certains indices cash ($SPX, $NDX)');
    console.log('   • Données historiques via Kinetick (gratuit)');
    console.log('');
  }

  getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'À l\'instant';
    if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)} heures`;
    if (seconds < 604800) return `Il y a ${Math.floor(seconds / 86400)} jours`;
    return date.toLocaleDateString();
  }

  saveReport() {
    const reportPath = 'logs/sierrachart_local_data_report.json';
    
    try {
      fs.mkdirSync('logs', { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
      console.log(`📄 Rapport sauvegardé: ${reportPath}`);
    } catch (e) {
      console.log('⚠️ Impossible de sauvegarder le rapport JSON');
    }
  }

  run() {
    const dataPath = this.findDataPath();
    
    if (dataPath) {
      this.scanDataFiles();
    }
    
    this.printReport();
    this.saveReport();
    
    return this.results;
  }
}

// === SCAN DES ÉTUDES DISPONIBLES ===
function scanStudiesFolder() {
  console.log('\n\n');
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║' + '  ÉTUDES (STUDIES) SIERRACHART  '.padStart(38).padEnd(58) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');
  console.log('');

  const studiesPaths = [
    'C:/SierraChart/Studies/',
    'C:/SierraChart/CustomStudies/',
    'C:/SierraChart/ACS_Source/'
  ];

  let totalStudies = 0;

  for (const studiesPath of studiesPaths) {
    try {
      if (fs.existsSync(studiesPath)) {
        const files = fs.readdirSync(studiesPath);
        const dllFiles = files.filter(f => f.endsWith('.dll'));
        const cppFiles = files.filter(f => f.endsWith('.cpp'));
        
        if (dllFiles.length > 0 || cppFiles.length > 0) {
          console.log(`📂 ${studiesPath}:`);
          console.log(`   • ${dllFiles.length} études compilées (.dll)`);
          console.log(`   • ${cppFiles.length} sources (.cpp)`);
          totalStudies += dllFiles.length;
        }
      }
    } catch (e) {}
  }

  console.log('\n📊 ÉTUDES INTÉGRÉES PAR DÉFAUT:');
  console.log('─'.repeat(50));
  
  const builtInStudies = [
    { name: 'Moving Averages (SMA, EMA, WMA)', free: true },
    { name: 'MACD', free: true },
    { name: 'RSI', free: true },
    { name: 'Bollinger Bands', free: true },
    { name: 'Volume', free: true },
    { name: 'VWAP', free: true },
    { name: 'Stochastic', free: true },
    { name: 'ATR', free: true },
    { name: 'Pivot Points', free: true },
    { name: 'Fibonacci Retracements', free: true },
    { name: 'Market Depth', free: true },
    { name: 'Delta Volume', free: true },
    { name: 'Footprint Charts', free: true },
    { name: 'Market Profile', free: true },
    { name: 'Order Flow', free: true },
    { name: 'Time and Sales', free: true },
    { name: 'Cumulative Delta', free: true },
  ];

  for (const study of builtInStudies) {
    console.log(`   ✅ ${study.name}`);
  }

  console.log('\n💡 SierraChart inclut 300+ études gratuites!');
  console.log('   Pour les voir: Analysis > Studies > Add Study');
}

// === MAIN ===
async function main() {
  const scanner = new SierraChartLocalScanner();
  const results = scanner.run();
  
  // Scanner les études
  scanStudiesFolder();

  console.log('\n\n🏁 Scan terminé!');
}

main().catch(console.error);
