/**
 * SIERRACHART AUTO CHART OPENER - Version Corrigée
 * 
 * Ouvre automatiquement les charts dans SierraChart
 * en utilisant PowerShell pour l'automatisation.
 */

console.log('');
console.log('╔' + '═'.repeat(68) + '╗');
console.log('║' + '  🚀 SIERRACHART AUTO CHART OPENER v2  '.padStart(50).padEnd(68) + '║');
console.log('╚' + '═'.repeat(68) + '╝');
console.log('');

import { exec, spawn, execSync } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

const SIERRA_EXE = 'C:\\SierraChart\\SierraChart_64.exe';

// Symboles à ouvrir
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

async function isSierraRunning() {
  try {
    const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq SierraChart_64.exe" 2>nul');
    return stdout.includes('SierraChart_64.exe');
  } catch {
    return false;
  }
}

async function launchSierra() {
  console.log('🚀 Lancement de SierraChart...');
  
  const proc = spawn(SIERRA_EXE, [], { detached: true, stdio: 'ignore' });
  proc.unref();
  
  console.log('   ⏳ Attente du démarrage (10 secondes)...');
  await sleep(10000);
  
  return await isSierraRunning();
}

function runPowerShell(script) {
  // Créer un fichier temporaire pour le script PowerShell
  const tempFile = path.join(process.env.TEMP || 'C:\\Temp', 'sierra_auto.ps1');
  fs.writeFileSync(tempFile, script, 'utf8');
  
  try {
    execSync(`powershell -ExecutionPolicy Bypass -File "${tempFile}"`, { 
      encoding: 'utf8',
      timeout: 10000 
    });
    return true;
  } catch (e) {
    console.log('   ⚠️ Erreur PowerShell');
    return false;
  } finally {
    try { fs.unlinkSync(tempFile); } catch {}
  }
}

async function focusSierraWindow() {
  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Focus {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@

$procs = Get-Process -Name "*SierraChart*" -ErrorAction SilentlyContinue
if ($procs) {
    $hwnd = $procs[0].MainWindowHandle
    [Win32Focus]::SetForegroundWindow($hwnd) | Out-Null
}
`;
  
  return runPowerShell(script);
}

async function sendKeys(keys) {
  const script = `
Add-Type -AssemblyName System.Windows.Forms
Start-Sleep -Milliseconds 200
[System.Windows.Forms.SendKeys]::SendWait('${keys}')
`;
  
  return runPowerShell(script);
}

async function openChartForSymbol(symbol) {
  console.log(`\n📊 Ouverture du chart: ${symbol}`);
  
  // 1. Focus sur SierraChart
  await focusSierraWindow();
  await sleep(500);
  
  // 2. Ctrl+N pour nouveau chart
  console.log('   📤 Envoi Ctrl+N...');
  await sendKeys('^n');
  await sleep(1500);
  
  // 3. Taper le symbole
  console.log(`   ⌨️ Saisie: ${symbol}`);
  await sendKeys(symbol);
  await sleep(500);
  
  // 4. Entrée
  console.log('   ↩️ Validation...');
  await sendKeys('{ENTER}');
  await sleep(2000);
  
  // 5. Encore Entrée pour confirmer
  await sendKeys('{ENTER}');
  await sleep(1500);
  
  console.log('   ✅ OK');
}

async function main() {
  console.log('📋 Ce script va automatiquement:');
  console.log('   1. Lancer SierraChart si nécessaire');
  console.log('   2. Ouvrir un chart pour chaque symbole');
  console.log('');
  console.log('⚠️  IMPORTANT: Ne touchez pas au clavier/souris!');
  console.log('');
  
  // Vérifier si SierraChart existe
  if (!fs.existsSync(SIERRA_EXE)) {
    console.log('❌ SierraChart non trouvé à:', SIERRA_EXE);
    return;
  }
  console.log('✅ SierraChart trouvé');
  
  // Lancer si nécessaire
  const running = await isSierraRunning();
  if (!running) {
    const launched = await launchSierra();
    if (!launched) {
      console.log('❌ Impossible de lancer SierraChart');
      return;
    }
    console.log('✅ SierraChart démarré');
    await sleep(5000);
  } else {
    console.log('✅ SierraChart en cours d\'exécution');
  }
  
  // Focus
  console.log('\n📍 Focus sur SierraChart...');
  await focusSierraWindow();
  await sleep(2000);
  
  // Ouvrir les charts
  console.log('\n═'.repeat(50));
  console.log('📊 OUVERTURE DES CHARTS');
  console.log('═'.repeat(50));
  
  for (const symbol of SYMBOLS) {
    await openChartForSymbol(symbol);
  }
  
  // Résumé
  console.log('\n');
  console.log('═'.repeat(50));
  console.log('✅ TERMINÉ!');
  console.log('═'.repeat(50));
  console.log('');
  console.log(`   ${SYMBOLS.length} charts à ouvrir.`);
  console.log('');
  console.log('📡 Vérifiez les charts dans SierraChart!');
  console.log('');
  console.log('   Si les charts ne sont pas ouverts, ouvrez-les manuellement:');
  console.log('   File > New/Open Chart > Tapez le symbole');
  console.log('');
  console.log('💾 Sauvegardez ensuite: File > Save Chartbook As');
}

main().catch(console.error);
