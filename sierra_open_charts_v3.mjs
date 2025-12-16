/**
 * SIERRACHART CHART OPENER - Méthode Ligne de Commande
 * 
 * SierraChart supporte l'ouverture de charts via ligne de commande
 * et via des fichiers chartbook (.Cht)
 */

console.log('');
console.log('╔' + '═'.repeat(68) + '╗');
console.log('║' + '  📊 SIERRACHART CHART OPENER v3  '.padStart(50).padEnd(68) + '║');
console.log('╚' + '═'.repeat(68) + '╝');
console.log('');

import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const SIERRA_EXE = 'C:\\SierraChart\\SierraChart_64.exe';
const SIERRA_DATA = 'C:\\SierraChart\\Data\\';

const SYMBOLS = [
  'BTCUSDT_PERP_BINANCE',
  'MESZ25-CME',
  'YMZ25-CBOT',
  'XAUUSD',
  'EURUSD'
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function killSierraChart() {
  try {
    execSync('taskkill /F /IM SierraChart_64.exe 2>nul', { encoding: 'utf8' });
    console.log('   ✅ SierraChart fermé');
    return true;
  } catch {
    return false;
  }
}

function createChartbook() {
  /**
   * Créer un fichier chartbook .Cht basique
   * Format: Le fichier .Cht est un format binaire/propriétaire
   * Alternative: Créer un fichier de définition de symboles
   */
  
  const symbolListFile = path.join(SIERRA_DATA, 'AutoOpen_Symbols.txt');
  const content = SYMBOLS.join('\n');
  
  fs.writeFileSync(symbolListFile, content);
  console.log(`✅ Liste de symboles créée: ${symbolListFile}`);
  
  return symbolListFile;
}

function launchWithSymbol(symbol) {
  /**
   * Lancer SierraChart avec un symbole spécifique
   * Paramètres de ligne de commande SierraChart:
   * 
   * SierraChart.exe /Symbol=SYMBOL /Exchange=EXCHANGE
   * SierraChart.exe /Chartbook=path.Cht
   * SierraChart.exe /DataFile=path.scid
   */
  
  console.log(`\n🚀 Ouverture: ${symbol}`);
  
  // Essayer avec /Symbol
  const args = [`/Symbol=${symbol}`];
  
  try {
    const proc = spawn(SIERRA_EXE, args, {
      detached: true,
      stdio: 'ignore'
    });
    proc.unref();
    
    console.log(`   ✅ Lancé avec args: ${args.join(' ')}`);
    return true;
  } catch (e) {
    console.log(`   ❌ Erreur: ${e.message}`);
    return false;
  }
}

function launchWithDataFile(symbol) {
  /**
   * Ouvrir directement le fichier SCID
   */
  
  const scidFile = path.join(SIERRA_DATA, `${symbol}.scid`);
  
  if (!fs.existsSync(scidFile)) {
    console.log(`   ⚠️ Fichier non trouvé: ${scidFile}`);
    return false;
  }
  
  console.log(`\n📂 Ouverture fichier: ${symbol}.scid`);
  
  try {
    // Méthode 1: Via start
    execSync(`start "" "${SIERRA_EXE}" "${scidFile}"`, { shell: 'cmd.exe' });
    console.log('   ✅ Commande envoyée');
    return true;
  } catch (e) {
    console.log(`   ❌ Erreur: ${e.message}`);
    return false;
  }
}

function openWithShellExecute(symbol) {
  /**
   * Utiliser l'association de fichier Windows
   * Les fichiers .scid sont associés à SierraChart
   */
  
  const scidFile = path.join(SIERRA_DATA, `${symbol}.scid`);
  
  if (!fs.existsSync(scidFile)) {
    return false;
  }
  
  console.log(`\n📂 Ouverture via association: ${symbol}`);
  
  try {
    // Ouvrir le fichier .scid directement (Windows l'associe à SierraChart)
    execSync(`start "" "${scidFile}"`, { shell: 'cmd.exe' });
    console.log('   ✅ Fichier ouvert');
    return true;
  } catch (e) {
    console.log(`   ❌ Erreur: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('📋 Méthodes d\'ouverture des charts:\n');
  console.log('   1. Paramètres ligne de commande (/Symbol=)');
  console.log('   2. Ouverture directe fichiers .scid');
  console.log('   3. Association de fichiers Windows');
  console.log('');

  // Vérifier SierraChart
  if (!fs.existsSync(SIERRA_EXE)) {
    console.log('❌ SierraChart non trouvé');
    return;
  }
  console.log('✅ SierraChart trouvé\n');

  // Créer la liste de symboles
  createChartbook();

  // Vérifier quels fichiers SCID existent
  console.log('\n📂 Fichiers SCID disponibles:');
  for (const sym of SYMBOLS) {
    const scidPath = path.join(SIERRA_DATA, `${sym}.scid`);
    const exists = fs.existsSync(scidPath);
    console.log(`   ${exists ? '✅' : '❌'} ${sym}.scid`);
  }

  // Méthode: Ouvrir les fichiers SCID directement
  console.log('\n═'.repeat(60));
  console.log('📊 OUVERTURE DES FICHIERS SCID');
  console.log('═'.repeat(60));

  for (const symbol of SYMBOLS) {
    const opened = openWithShellExecute(symbol);
    if (opened) {
      await sleep(3000); // Attendre entre chaque ouverture
    }
  }

  // Instructions
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('📋 RÉSULTAT');
  console.log('═'.repeat(60));
  console.log('');
  console.log('   Si les charts se sont ouverts dans SierraChart:');
  console.log('   1. ✅ Le temps réel devrait fonctionner');
  console.log('   2. 💾 Sauvegardez: File > Save Chartbook As');
  console.log('');
  console.log('   Si ça n\'a pas fonctionné:');
  console.log('   1. Ouvrez SierraChart manuellement');
  console.log('   2. File > Open Data File');
  console.log('   3. Naviguez vers C:\\SierraChart\\Data\\');
  console.log('   4. Ouvrez les fichiers .scid un par un');
  console.log('');
  console.log('   OU:');
  console.log('   1. File > New/Open Chart');
  console.log('   2. Tapez le symbole (copier-coller):');
  for (const sym of SYMBOLS) {
    console.log(`      ${sym}`);
  }
  console.log('');
  
  console.log('═'.repeat(60));
  console.log('🏁 Terminé');
  console.log('═'.repeat(60));
}

main().catch(console.error);
