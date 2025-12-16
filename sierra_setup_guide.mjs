#!/usr/bin/env node
/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║              📊 SIERRACHART SETUP GUIDE & HELPER                   ║
 * ╚════════════════════════════════════════════════════════════════════╝
 * 
 * Ce script vous guide pour configurer SierraChart afin que les charts
 * s'ouvrent automatiquement au démarrage.
 */

import { exec, execSync } from 'child_process';
import { existsSync, readdirSync, copyFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import readline from 'readline';

// Symboles à trader
const SYMBOLS = [
    'BTCUSDT_PERP_BINANCE',
    'MESZ25-CME',
    'YMZ25-CBOT',
    'XAUUSD',
    'EURUSD',
];

const SIERRACHART_PATH = 'C:\\SierraChart';
const DATA_PATH = join(SIERRACHART_PATH, 'Data');

console.clear();
console.log(`
╔════════════════════════════════════════════════════════════════════╗
║              📊 SIERRACHART SETUP GUIDE & HELPER                   ║
╚════════════════════════════════════════════════════════════════════╝
`);

// Vérifier SierraChart
if (!existsSync(SIERRACHART_PATH)) {
    console.log('❌ SierraChart non trouvé dans C:\\SierraChart');
    process.exit(1);
}

console.log('✅ SierraChart trouvé\n');

// Lister les fichiers .scid disponibles
console.log('═══════════════════════════════════════════════════════════');
console.log('📂 FICHIERS DE DONNÉES DISPONIBLES (.scid)');
console.log('═══════════════════════════════════════════════════════════\n');

const scidFiles = readdirSync(DATA_PATH).filter(f => f.endsWith('.scid'));
console.log(`   Trouvé ${scidFiles.length} fichiers de données\n`);

SYMBOLS.forEach(symbol => {
    const found = scidFiles.find(f => f.toLowerCase().includes(symbol.toLowerCase().split('_')[0]));
    if (found) {
        console.log(`   ✅ ${symbol} -> ${found}`);
    } else {
        console.log(`   ⚠️  ${symbol} -> Non trouvé`);
    }
});

// Lister les chartbooks existants
console.log('\n═══════════════════════════════════════════════════════════');
console.log('📚 CHARTBOOKS EXISTANTS (.cht)');
console.log('═══════════════════════════════════════════════════════════\n');

const chtFiles = readdirSync(DATA_PATH).filter(f => f.endsWith('.cht') || f.endsWith('.Cht'));
chtFiles.forEach(f => {
    console.log(`   📊 ${f}`);
});

console.log(`
═══════════════════════════════════════════════════════════
📋 INSTRUCTIONS POUR CRÉER UN CHARTBOOK AVEC VOS SYMBOLES
═══════════════════════════════════════════════════════════

🔴 Le format .cht est PROPRIÉTAIRE (compressé), donc on ne peut
   pas le créer programmatiquement. Suivez ces étapes manuelles:

┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 1: OUVRIR SIERRACHART                                 │
├─────────────────────────────────────────────────────────────┤
│ 1. Lancez SierraChart.exe                                   │
│ 2. Fermez les chartbooks existants (File > Close Chartbook) │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 2: CRÉER UN NOUVEAU CHARTBOOK                         │
├─────────────────────────────────────────────────────────────┤
│ 1. File > New Chartbook                                     │
│ 2. Nommez-le "TradingCharts" ou similaire                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 3: AJOUTER LES CHARTS                                 │
├─────────────────────────────────────────────────────────────┤
│ Pour CHAQUE symbole, répétez:                               │
│                                                             │
│ 1. File > Find Symbol (ou Ctrl+F)                           │
│ 2. Tapez le symbole (voir liste ci-dessous)                 │
│ 3. Cliquez "Open Intraday Chart"                            │
│ 4. Le chart s'ouvre dans le chartbook                       │
└─────────────────────────────────────────────────────────────┘

📋 SYMBOLES À AJOUTER (copier-coller):
`);

SYMBOLS.forEach((s, i) => {
    console.log(`   ${i+1}. ${s}`);
});

console.log(`
┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 4: SAUVEGARDER LE CHARTBOOK                           │
├─────────────────────────────────────────────────────────────┤
│ 1. File > Save Chartbook                                    │
│ 2. Choisissez un nom (ex: TradingCharts.Cht)                │
│ 3. Sauvegardez dans C:\\SierraChart\\Data\\                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 5: CONFIGURER L'OUVERTURE AUTOMATIQUE                 │
├─────────────────────────────────────────────────────────────┤
│ 1. Global Settings > General Settings                       │
│ 2. Trouvez "Files To Open on Startup"                       │
│ 3. Cliquez "Add"                                            │
│ 4. Sélectionnez votre chartbook TradingCharts.Cht          │
│ 5. Cliquez OK                                               │
│                                                             │
│ ✅ Au prochain démarrage, vos charts s'ouvriront auto!      │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════
🚀 ALTERNATIVE: OUVRIR SIERRACHART MAINTENANT
═══════════════════════════════════════════════════════════
`);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Voulez-vous ouvrir SierraChart maintenant? (o/n): ', (answer) => {
    if (answer.toLowerCase() === 'o' || answer.toLowerCase() === 'y') {
        console.log('\n🚀 Lancement de SierraChart...');
        exec(`start "" "${join(SIERRACHART_PATH, 'SierraChart.exe')}"`, (err) => {
            if (err) {
                console.log('❌ Erreur:', err.message);
            } else {
                console.log('✅ SierraChart lancé!');
                console.log('\n📋 Suivez les étapes ci-dessus pour configurer vos charts.');
            }
            rl.close();
        });
    } else {
        console.log('\n👋 À bientôt!');
        rl.close();
    }
});

// Créer un fichier batch pour l'utilisateur
const batchContent = `@echo off
echo ====================================================
echo   SIERRACHART TRADING CHARTS SETUP
echo ====================================================
echo.
echo Ce script va vous aider a creer votre chartbook.
echo.
echo SYMBOLES A AJOUTER:
echo   1. BTCUSDT_PERP_BINANCE
echo   2. MESZ25-CME
echo   3. YMZ25-CBOT
echo   4. XAUUSD
echo   5. EURUSD
echo.
echo ====================================================
echo INSTRUCTIONS:
echo ====================================================
echo.
echo 1. SierraChart va s'ouvrir
echo 2. File ^> New Chartbook (nommez-le TradingCharts)
echo 3. Pour chaque symbole:
echo    - File ^> Find Symbol (Ctrl+F)
echo    - Tapez le symbole
echo    - Cliquez "Open Intraday Chart"
echo 4. File ^> Save Chartbook
echo 5. Global Settings ^> General Settings
echo    - Trouvez "Files To Open on Startup"
echo    - Ajoutez votre chartbook
echo.
pause
start "" "C:\\SierraChart\\SierraChart.exe"
`;

const batchPath = join(process.cwd(), 'open_sierrachart.bat');
writeFileSync(batchPath, batchContent);
console.log(`\n📄 Fichier batch créé: ${batchPath}`);
