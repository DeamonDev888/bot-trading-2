/**
 * SIERRACHART AUTO CHART OPENER
 * 
 * Ce script lance SierraChart et ouvre automatiquement des charts
 * pour les symboles spécifiés, activant ainsi le streaming temps réel.
 * 
 * Méthode: Utilise l'API de ligne de commande de SierraChart
 */

console.log('');
console.log('╔' + '═'.repeat(68) + '╗');
console.log('║' + '  📊 SIERRACHART AUTO CHART OPENER  '.padStart(50).padEnd(68) + '║');
console.log('╚' + '═'.repeat(68) + '╝');
console.log('');

import { spawn, exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configuration
const SIERRA_CHART_PATHS = [
  'C:\\SierraChart\\SierraChart_64.exe',
  'C:\\SierraChart\\SierraChart.exe',
  'C:\\Program Files\\SierraChart\\SierraChart_64.exe',
  'C:\\Program Files (x86)\\SierraChart\\SierraChart.exe',
  'D:\\SierraChart\\SierraChart_64.exe'
];

// Symboles à ouvrir pour le temps réel
const SYMBOLS_TO_OPEN = [
  // Crypto - 24/7
  { symbol: 'BTCUSDT_PERP_BINANCE', exchange: 'Binance', priority: 1 },
  
  // Indices US
  { symbol: 'MESZ25-CME', exchange: 'CME', priority: 2 },
  { symbol: 'YMZ25-CBOT', exchange: 'CBOT', priority: 2 },
  
  // Forex/Commodities
  { symbol: 'XAUUSD', exchange: '', priority: 2 },
  { symbol: 'EURUSD', exchange: '', priority: 3 },
];

async function findSierraChart() {
  console.log('🔍 Recherche de SierraChart...\n');
  
  for (const exePath of SIERRA_CHART_PATHS) {
    if (fs.existsSync(exePath)) {
      console.log(`   ✅ Trouvé: ${exePath}`);
      return exePath;
    }
  }
  
  // Essayer de trouver via le registre Windows
  try {
    const { stdout } = await execAsync('reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Sierra Chart" /v InstallPath 2>nul');
    const match = stdout.match(/InstallPath\s+REG_SZ\s+(.+)/);
    if (match) {
      const installPath = match[1].trim();
      const exePath = path.join(installPath, 'SierraChart_64.exe');
      if (fs.existsSync(exePath)) {
        console.log(`   ✅ Trouvé via registre: ${exePath}`);
        return exePath;
      }
    }
  } catch(e) {}
  
  console.log('   ❌ SierraChart non trouvé');
  return null;
}

async function isSierraChartRunning() {
  try {
    const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq SierraChart_64.exe" 2>nul');
    return stdout.includes('SierraChart_64.exe');
  } catch(e) {
    return false;
  }
}

async function launchSierraChart(exePath) {
  console.log('\n🚀 Lancement de SierraChart...\n');
  
  const process = spawn(exePath, [], {
    detached: true,
    stdio: 'ignore',
    windowsHide: false
  });
  
  process.unref();
  
  // Attendre que SierraChart démarre
  console.log('   ⏳ Attente du démarrage...');
  await new Promise(r => setTimeout(r, 5000));
  
  const isRunning = await isSierraChartRunning();
  if (isRunning) {
    console.log('   ✅ SierraChart est démarré');
    return true;
  }
  
  console.log('   ⚠️ Impossible de confirmer le démarrage');
  return false;
}

async function createChartbook(symbols) {
  // Créer un fichier chartbook temporaire avec les symboles
  const chartbookPath = 'C:\\SierraChart\\Data\\TempChartbook.Cht';
  
  console.log('\n📝 Création du chartbook...\n');
  
  // SierraChart utilise un format binaire pour les chartbooks
  // Alternative: utiliser les fichiers .txt pour importer des symboles
  
  const symbolListPath = 'C:\\SierraChart\\Data\\RealtimeSymbols.txt';
  const symbolList = symbols.map(s => s.symbol).join('\n');
  
  try {
    fs.writeFileSync(symbolListPath, symbolList);
    console.log(`   ✅ Liste créée: ${symbolListPath}`);
    console.log(`   📊 Symboles: ${symbols.length}`);
    return symbolListPath;
  } catch(e) {
    console.log('   ❌ Erreur création liste:', e.message);
    return null;
  }
}

async function openChartsViaDDE() {
  // SierraChart supporte DDE pour la communication
  console.log('\n📡 Tentative d\'ouverture via DDE...');
  console.log('   (Cette méthode nécessite que SierraChart soit déjà ouvert)');
  
  // DDE n'est pas facilement accessible depuis Node.js
  // Alternative: utiliser les scripts ACSIL
  return false;
}

async function createACSILScript(symbols) {
  // Créer un script ACSIL (Sierra Chart Script) pour ouvrir les charts
  const scriptPath = 'C:\\SierraChart\\ACS_Source\\OpenRealTimeCharts.cpp';
  
  const symbolDefs = symbols.map((s, i) => `    "${s.symbol}"`).join(',\n');
  
  const scriptContent = `
// Script ACSIL pour ouvrir des charts en temps réel
// Généré automatiquement

#include "sierrachart.h"

SCDLLName("OpenRealTimeCharts")

SCSFExport scsf_OpenRealTimeCharts(SCStudyInterfaceRef sc)
{
    if (sc.SetDefaults)
    {
        sc.GraphName = "Open Realtime Charts";
        sc.AutoLoop = 0;
        return;
    }
    
    // Liste des symboles à ouvrir
    const char* Symbols[] = {
${symbolDefs}
    };
    
    int NumSymbols = sizeof(Symbols) / sizeof(Symbols[0]);
    
    for (int i = 0; i < NumSymbols; i++)
    {
        // Ouvrir un nouveau chart
        sc.OpenChartOrGetChartReference(Symbols[i], "");
    }
}
`;

  try {
    fs.writeFileSync(scriptPath, scriptContent);
    console.log(`\n   ✅ Script ACSIL créé: ${scriptPath}`);
    return scriptPath;
  } catch(e) {
    console.log('   ❌ Erreur création script:', e.message);
    return null;
  }
}

async function main() {
  console.log('📋 Ce script va:\n');
  console.log('   1. Vérifier si SierraChart est installé');
  console.log('   2. Lancer SierraChart si nécessaire');
  console.log('   3. Créer les fichiers nécessaires pour ouvrir les charts');
  console.log('   4. Vous guider pour finaliser la configuration');
  console.log('');
  
  // 1. Trouver SierraChart
  const sierraPath = await findSierraChart();
  
  if (!sierraPath) {
    console.log('\n❌ SierraChart n\'est pas installé ou introuvable.');
    console.log('   Veuillez installer SierraChart depuis https://www.sierrachart.com/');
    return;
  }
  
  // 2. Vérifier si déjà en cours d'exécution
  const isRunning = await isSierraChartRunning();
  console.log(`\n📊 SierraChart en cours d'exécution: ${isRunning ? 'Oui' : 'Non'}`);
  
  // 3. Lancer si nécessaire
  if (!isRunning) {
    await launchSierraChart(sierraPath);
  }
  
  // 4. Créer la liste de symboles
  await createChartbook(SYMBOLS_TO_OPEN);
  
  // 5. Créer le script ACSIL
  await createACSILScript(SYMBOLS_TO_OPEN);
  
  // Instructions finales
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('📖 INSTRUCTIONS POUR OUVRIR LES CHARTS');
  console.log('═'.repeat(70));
  console.log('');
  console.log('   MÉTHODE 1: Manuelle (Recommandée)');
  console.log('   ─────────────────────────────────');
  console.log('   1. Dans SierraChart, allez dans: File > New/Open Chart');
  console.log('   2. Tapez le symbole (ex: BTCUSDT_PERP_BINANCE)');
  console.log('   3. Répétez pour chaque symbole');
  console.log('');
  console.log('   Symboles à ouvrir:');
  for (const sym of SYMBOLS_TO_OPEN) {
    console.log(`      • ${sym.symbol}`);
  }
  console.log('');
  console.log('   MÉTHODE 2: Via Import');
  console.log('   ──────────────────────');
  console.log('   1. File > Open Symbol List');
  console.log('   2. Sélectionnez: C:\\SierraChart\\Data\\RealtimeSymbols.txt');
  console.log('   3. Double-cliquez sur chaque symbole pour ouvrir un chart');
  console.log('');
  console.log('   MÉTHODE 3: Chartbook Sauvegardé');
  console.log('   ────────────────────────────────');
  console.log('   1. Ouvrez les charts une fois manuellement');
  console.log('   2. File > Save Chartbook As...');
  console.log('   3. Nommez-le "RealtimeTrading.Cht"');
  console.log('   4. La prochaine fois, ouvrez directement ce chartbook');
  console.log('');
  console.log('═'.repeat(70));
  console.log('');
  console.log('📡 Une fois les charts ouverts, relancez:');
  console.log('   node sierra_realtime_test.mjs');
  console.log('');
  console.log('   pour vérifier que le temps réel fonctionne!');
  console.log('');
  console.log('🏁 Script terminé');
}

main().catch(console.error);
