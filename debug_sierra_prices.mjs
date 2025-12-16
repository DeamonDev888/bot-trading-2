#!/usr/bin/env node

// Script de diagnostic pour analyser les fichiers Sierra Chart et trouver les bons prix
import * as fs from 'fs';
import * as path from 'path';

console.log('🔍 DIAGNOSTIC DES PRIX SIERRA CHART');
console.log('='.repeat(60));

const sierraDataPath = 'C:/SierraChart/Data/';

function analyzeFile(filePath) {
  console.log(`\n📄 Analyse du fichier: ${path.basename(filePath)}`);

  try {
    const buffer = fs.readFileSync(filePath);
    const stats = fs.statSync(filePath);

    console.log(`   Taille: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Dernière modification: ${stats.mtime.toLocaleString()}`);

    // Analyse des en-têtes
    console.log(`   En-tête: ${buffer.length >= 3 ? buffer.toString('ascii', 0, 3) : 'Trop court'}`);

    // Recherche de prix plausibles pour Bitcoin (20,000 - 150,000)
    const plausiblePrices = [];
    const searchStart = Math.max(0, buffer.length - 5000); // Derniers 5KB

    for (let i = searchStart; i < buffer.length - 8; i += 4) {
      // Lecture float (32 bits)
      const float32 = buffer.readFloatLE(i);
      if (float32 > 20000 && float32 < 150000 && !isNaN(float32) && isFinite(float32)) {
        plausiblePrices.push({ type: 'float32', value: float32, offset: i });
      }

      // Lecture double (64 bits)
      if (i + 8 < buffer.length) {
        const float64 = buffer.readDoubleLE(i);
        if (float64 > 20000 && float64 < 150000 && !isNaN(float64) && isFinite(float64)) {
          plausiblePrices.push({ type: 'float64', value: float64, offset: i });
        }
      }
    }

    // Tri par valeur pour trouver les plus réalistes
    plausiblePrices.sort((a, b) => b.value - a.value);

    console.log(`   Prix plausibles trouvés: ${plausiblePrices.length}`);

    if (plausiblePrices.length > 0) {
      console.log('   Top 5 prix plausibles:');
      plausiblePrices.slice(0, 5).forEach((price, index) => {
        console.log(`     ${index + 1}. $${price.value.toLocaleString()} (${price.type} à offset ${price.offset})`);
      });

      // Analyse statistique
      const values = plausiblePrices.map(p => p.value);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const median = values.sort((a, b) => a - b)[Math.floor(values.length / 2)];

      console.log(`   📊 Prix moyen: $${avg.toLocaleString(undefined, {maximumFractionDigits: 2})}`);
      console.log(`   📊 Prix médian: $${median.toLocaleString(undefined, {maximumFractionDigits: 2})}`);

      // Prix le plus probable (autour de 90,000 pour BTC)
      const targetPrice = 90000;
      const closestPrice = plausiblePrices.reduce((prev, curr) =>
        Math.abs(curr.value - targetPrice) < Math.abs(prev.value - targetPrice) ? curr : prev
      );

      console.log(`   🎯 Prix le plus probable (~$90k): $${closestPrice.value.toLocaleString()}`);

      return closestPrice.value;
    } else {
      console.log('   ❌ Aucun prix plausible trouvé');

      // Recherche de toutes les valeurs numériques
      console.log('   🔍 Recherche de toutes les valeurs numériques...');
      const allNumbers = [];

      for (let i = searchStart; i < buffer.length - 8; i += 4) {
        const float32 = buffer.readFloatLE(i);
        if (float32 > 0 && !isNaN(float32) && isFinite(float32) && float32 < 1000000) {
          allNumbers.push({ type: 'float32', value: float32, offset: i });
        }

        if (i + 8 < buffer.length) {
          const float64 = buffer.readDoubleLE(i);
          if (float64 > 0 && !isNaN(float64) && isFinite(float64) && float64 < 1000000) {
            allNumbers.push({ type: 'float64', value: float64, offset: i });
          }
        }
      }

      allNumbers.sort((a, b) => b.value - a.value);
      console.log(`   Total nombres: ${allNumbers.length}`);

      if (allNumbers.length > 0) {
        console.log('   Top 10 nombres trouvés:');
        allNumbers.slice(0, 10).forEach((num, index) => {
          console.log(`     ${index + 1}. ${num.value.toLocaleString()} (${num.type})`);
        });
      }
    }

  } catch (error) {
    console.error(`   ❌ Erreur lecture: ${error.message}`);
  }

  return null;
}

// Analyse des symboles Bitcoin
const btcSymbols = [
  'XBTUSD-BMEX.scid',
  'BTCUSDT_PERP_BINANCE.scid',
  'BTCUSD_PERP_BINANCE.scid'
];

console.log('🎯 ANALYSE DES SYMBOLES BITCOIN\n');

const results = {};

btcSymbols.forEach(symbol => {
  const filePath = path.join(sierraDataPath, symbol);
  if (fs.existsSync(filePath)) {
    const plausiblePrice = analyzeFile(filePath);
    if (plausiblePrice) {
      results[symbol] = plausiblePrice;
    }
  } else {
    console.log(`❌ Fichier non trouvé: ${symbol}`);
  }
});

console.log('\n' + '='.repeat(60));
console.log('📊 RÉSUMÉ DES PRIX EXTRAITS');
console.log('='.repeat(60));

Object.entries(results).forEach(([symbol, price]) => {
  const expected = symbol.includes('BMEX') ? '~100,000' : '~89,000';
  const isCorrect = symbol.includes('BMEX') ?
    (price > 80000 && price < 120000) :
    (price > 85000 && price < 95000);

  console.log(`${symbol}: $${price.toLocaleString()} ${isCorrect ? '✅' : '❌'} (attendu: ${expected})`);
});

// Recommandation
console.log('\n💡 RECOMMANDATIONS:');
if (Object.keys(results).length > 0) {
  const prices = Object.values(results);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  console.log(`   • Prix moyen extrait: $${avgPrice.toLocaleString(undefined, {maximumFractionDigits: 2})}`);
  console.log('   • L\'algorithme doit être ajusté pour trouver les prix les plus récents');
  console.log('   • Il faut probablement chercher dans les derniers enregistrements du fichier');
} else {
  console.log('   • Vérifiez que Sierra Chart reçoit des données en temps réel');
  console.log('   • Ajoutez les symboles Bitcoin dans Sierra Chart');
  console.log('   • Assurez-vous que les data feeds sont connectés');
}

console.log('\n🔧 PRIX RÉELS ACTUELS DU MARCHÉ (référence):');
console.log('   • Bitcoin/USD (BitMEX): ~$89,000 - $92,000');
console.log('   • Bitcoin/USDT (Binance): ~$89,000 - $92,000');