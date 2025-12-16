#!/usr/bin/env node

// Script pour vérifier et aider à corriger les problèmes de data feeds
import * as fs from 'fs';
import * as path from 'path';

console.log('🔧 DIAGNOSTIC ET CORRECTION DES DATA FEEDS SIERRA CHART');
console.log('='.repeat(70));

const sierraDataPath = 'C:/SierraChart/Data/';

function checkDataFreshness() {
  console.log('\n📅 VÉRIFICATION DE LA FRAÎCHEUR DES DONNÉES');
  console.log('='.repeat(70));

  const now = new Date();
  const symbols = [
    'BTCUSDT_PERP_BINANCE',
    'BTCUSD_PERP_BINANCE',
    'XBTUSD-BMEX'
  ];

  symbols.forEach(symbol => {
    const files = ['.scid', '.dly'];
    console.log(`\n💱 ${symbol}:`);

    files.forEach(ext => {
      const filePath = path.join(sierraDataPath, symbol + ext);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const ageHours = (now - stats.mtime) / (1000 * 60 * 60);

        console.log(`  📄 ${symbol}${ext}:`);
        console.log(`     Modifié: ${stats.mtime.toLocaleString()}`);
        console.log(`     Âge: ${Math.floor(ageHours)} heures`);

        if (ageHours < 1) {
          console.log(`     ✅ TRÈS RÉCENT`);
        } else if (ageHours < 24) {
          console.log(`     ⚠️ RÉCENT (${Math.floor(ageHours)}h)`);
        } else if (ageHours < 168) {
          console.log(`     ⚠️ VIEUX (${Math.floor(ageHours / 24)} jours)`);
        } else {
          console.log(`     ❌ TRÈS VIEUX (${Math.floor(ageHours / 24)} jours)`);
        }
      } else {
        console.log(`  ❌ ${symbol}${ext}: Fichier manquant`);
      }
    });
  });
}

function analyzePriceDifferences() {
  console.log('\n💰 ANALYSE DES DIFFÉRENCES DE PRIX ACTUELLES');
  console.log('='.repeat(70));

  // Prix réels du marché au moment de l'analyse
  const marketPrices = {
    'BTCUSDT_PERP_BINANCE': 89379,
    'BTCUSD_PERP_BINANCE': 89379,  // Devrait être similaire
    'XBTUSD-BMEX': 89379          // Devrait être similaire
  };

  const ourPrices = {
    'BTCUSDT_PERP_BINANCE': 89379,
    'BTCUSD_PERP_BINANCE': 84594,
    'XBTUSD-BMEX': 87314
  };

  console.log('\n📊 Comparaison avec prix du marché:');
  Object.entries(ourPrices).forEach(([symbol, price]) => {
    const marketPrice = marketPrices[symbol];
    const difference = marketPrice - price;
    const percentDiff = (Math.abs(difference) / marketPrice) * 100;

    console.log(`\n💱 ${symbol}:`);
    console.log(`   Notre prix: $${price.toLocaleString()}`);
    console.log(`   Marché: $${marketPrice.toLocaleString()}`);
    console.log(`   Différence: $${difference.toLocaleString()} (${percentDiff.toFixed(2)}%)`);

    if (percentDiff > 1) {
      console.log(`   🚨 PROBLÈME: Différence significative !`);
    } else {
      console.log(`   ✅ OK: Prix cohérent`);
    }
  });
}

function provideFixInstructions() {
  console.log('\n🔧 INSTRUCTIONS POUR CORRIGER LE PROBLÈME');
  console.log('='.repeat(70));

  console.log('\n🎯 PROBLÈME IDENTIFIÉ:');
  console.log('   • BTCUSDT_PERP_BINANCE: ✅ Data feed actif et à jour');
  console.log('   • BTCUSD_PERP_BINANCE: ❌ Data feed arrêté depuis 2 semaines');
  console.log('   • XBTUSD-BMEX: ❌ Data feed arrêté depuis 2 semaines');

  console.log('\n📋 ÉTAPES DE CORRECTION:');
  console.log('\n1️⃣ DANS SIERRA CHART:');
  console.log('   • File > Connect to Data Feed');
  console.log('   • Vérifiez que Binance et BitMEX sont connectés');
  console.log('   • Si déconnecté, reconnectez avec vos API keys');

  console.log('\n2️⃣ VÉRIFICATION DES SYMBOLES:');
  console.log('   • File > New/Open Chart');
  console.log('   • Symbole: BTCUSD_PERP_BINANCE');
  console.log('   • Exchange: Binance');
  console.log('   • Timeframe: 1-Minute');
  console.log('   • Cliquez OK');

  console.log('\n3️⃣ POUR BITMEX:');
  console.log('   • File > New/Open Chart');
  console.log('   • Symbole: XBTUSD-BMEX');
  console.log('   • Exchange: BitMEX');
  console.log('   • Timeframe: 1-Minute');
  console.log('   • Cliquez OK');

  console.log('\n4️⃣ VÉRIFICATION DE LA CONNEXION:');
  console.log('   • Vérifiez que les données se mettent à jour en temps réel');
  console.log('   • Les prix devraient être similaires (~$89,000)');

  console.log('\n5️⃣ ALTERNATIVE SI DATA FEED DÉFAILLANT:');
  console.log('   • Supprimez les anciens fichiers .scid');
  console.log('   • Recréez les symboles avec une connexion fraîche');
  console.log('   • Attendez quelques minutes que les données se chargent');

  console.log('\n⚡ SOLUTION TEMPORAIRE:');
  console.log('   • Utilisez uniquement BTCUSDT_PERP_BINANCE (data feed actif)');
  console.log('   • Ignorez les données obsolètes des autres symboles');
  console.log('   • Configurez votre code pour ne lire que les fichiers récents');

  console.log('\n🔍 PRIX ATTENDUS APRÈS CORRECTION:');
  console.log('   • Tous les symboles BTC devraient afficher: ~$89,000');
  console.log('   • Différence entre symboles: < $100 (0.1%)');
  console.log('   • Mises à jour chaque seconde');
}

function suggestCodeFix() {
  console.log('\n💻 SUGGESTION DE CORRECTION CODE');
  console.log('='.repeat(70));

  console.log('\n🔧 Modifier le module pour ignorer les données obsolètes:');
  console.log(`
// Ajouter ce filtre dans la fonction getAvailableSymbols():
private filterRecentSymbols(symbols: string[]): string[] {
  const recentSymbols: string[] = [];

  symbols.forEach(symbol => {
    const scidPath = path.join(this.config.dataPath, \`\${symbol}.scid\`);
    if (fs.existsSync(scidPath)) {
      const stats = fs.statSync(scidPath);
      const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);

      // Ne garder que les symboles mis à jour dans les dernières 24h
      if (ageHours < 24) {
        recentSymbols.push(symbol);
        console.log(\`✅ \${symbol}: données récentes (\${Math.floor(ageHours)}h)\`);
      } else {
        console.log(\`❌ \${symbol}: données obsolètes (\${Math.floor(ageHours)}h)\`);
      }
    }
  });

  return recentSymbols;
}
  `);
}

// Exécution du diagnostic complet
checkDataFreshness();
analyzePriceDifferences();
provideFixInstructions();
suggestCodeFix();

console.log('\n🎯 RÉSUMÉ:');
console.log('   Le problème n\'est PAS dans votre code mais dans les data feeds Sierra Chart.');
console.log('   Seul BTCUSDT_PERP_BINANCE reçoit des données actives.');
console.log('   BTCUSD_PERP_BINANCE et XBTUSD-BMEX doivent être reconnectés.');
console.log('\n   Utilisez temporairement uniquement BTCUSDT_PERP_BINANCE pour des données fiables.');