#!/usr/bin/env node

// Script de test pour vérifier le fonctionnement réel du module Sierra Chart
import { SierraChartModule } from './src/backend/modules/SierraChartModule.mts';
import * as fs from 'fs';
import * as path from 'path';

console.log('🧪 TEST COMPLET - Module Sierra Chart');
console.log('='.repeat(50));

const sierraModule = new SierraChartModule();
let testResults = {
  installationOk: false,
  filesFound: false,
  pricesExtracted: false,
  databaseConnected: false,
  realTimeUpdates: false,
  dataConsistency: false
};

async function runCompleteTest() {
  console.log('\n1️⃣ Test d\'installation Sierra Chart...');

  // Test 1: Vérification installation
  const installation = sierraModule.checkSierraInstallation();
  console.log(`   Chemin: ${installation.dataPath}`);
  console.log(`   Installé: ${installation.installed ? '✅' : '❌'}`);
  console.log(`   Accessible: ${installation.accessible ? '✅' : '❌'}`);

  if (installation.accessible) {
    testResults.installationOk = true;
  }

  console.log('\n2️⃣ Test de détection des fichiers...');

  // Test 2: Recherche des fichiers de données
  const dataPath = installation.dataPath;
  try {
    const files = fs.readdirSync(dataPath);
    const cryptoFiles = files.filter(file => {
      const ext = path.extname(file);
      const base = path.basename(file, ext);
      return ['.scid', '.dly', '.m1', '.m5'].includes(ext) &&
             ['BTC', 'ETH', 'XBT', 'DOGE', 'SOL', 'BNB', 'USDT', 'BITMEX', 'BINANCE'].some(keyword =>
               base.toUpperCase().includes(keyword));
    });

    console.log(`   Fichiers trouvés: ${cryptoFiles.length}`);
    cryptoFiles.slice(0, 5).forEach(file => {
      const stats = fs.statSync(path.join(dataPath, file));
      const sizeKB = Math.round(stats.size / 1024);
      console.log(`   📄 ${file} (${sizeKB}KB, modifié: ${stats.mtime.toLocaleTimeString()})`);
    });

    if (cryptoFiles.length > 0) {
      testResults.filesFound = true;
    }

  } catch (error) {
    console.log(`   ❌ Erreur lecture dossier: ${error.message}`);
  }

  console.log('\n3️⃣ Test d\'extraction des prix...');

  // Test 3: Extraction des prix depuis les fichiers
  const symbols = sierraModule.getAvailableSymbols();
  console.log(`   Symboles détectés: ${symbols.length}`);

  if (symbols.length > 0) {
    let priceReadSuccess = 0;
    for (const symbol of symbols.slice(0, 3)) {
      const priceData = await sierraModule.getSymbolPrice(symbol);
      if (priceData && priceData.lastPrice > 0) {
        console.log(`   💰 ${symbol}: $${priceData.lastPrice.toLocaleString()} (${priceData.source})`);
        priceReadSuccess++;
      } else {
        console.log(`   ❌ ${symbol}: Prix non trouvé`);
      }
    }

    if (priceReadSuccess > 0) {
      testResults.pricesExtracted = true;
    }
  }

  console.log('\n4️⃣ Test de connexion base de données...');

  // Test 4: Connexion à la base de données
  try {
    const { default: pg } = await import('pg');
    const client = new pg.Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'financial_analyst',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '9022'
    });

    await client.connect();
    const result = await client.query('SELECT NOW() as current_time');
    await client.end();

    console.log(`   ✅ BDD connectée: ${result.rows[0].current_time}`);
    testResults.databaseConnected = true;

  } catch (error) {
    console.log(`   ⚠️ BDD non disponible: ${error.message}`);
  }

  console.log('\n5️⃣ Test de mise à jour temps réel (5 secondes)...');

  // Test 5: Surveillance en temps réel
  let updateCount = 0;
  let previousPrices = new Map();

  sierraModule.on('priceUpdate', (data) => {
    updateCount++;
    const prevPrice = previousPrices.get(data.symbol);

    if (prevPrice && prevPrice !== data.lastPrice) {
      console.log(`   🔄 ${data.symbol}: $${data.lastPrice} (changement: ${data.lastPrice > prevPrice ? '+' : ''}${(data.lastPrice - prevPrice).toFixed(2)})`);
    } else if (!prevPrice) {
      console.log(`   📊 ${data.symbol}: $${data.lastPrice} (première lecture)`);
    }

    previousPrices.set(data.symbol, data.lastPrice);
  });

  // Démarrage pour 5 secondes
  sierraModule.start(1000); // Lecture chaque seconde

  await new Promise(resolve => setTimeout(resolve, 5000));

  sierraModule.stop();

  if (updateCount >= 3) {
    console.log(`   ✅ ${updateCount} mises à jour reçues en 5 secondes`);
    testResults.realTimeUpdates = true;
  } else {
    console.log(`   ❌ Seulement ${updateCount} mises à jour reçues`);
  }

  console.log('\n6️⃣ Test de cohérence des données...');

  // Test 6: Vérification cohérence
  const finalPrices = await sierraModule.getAllCryptoPrices();
  if (finalPrices.length > 0) {
    console.log(`   📊 ${finalPrices.length} prix finaux récupérés`);

    // Vérification si les prix sont dans des plages réalistes
    let realisticPrices = 0;
    finalPrices.forEach(data => {
      if (data.symbol.includes('BTC') && data.lastPrice > 20000 && data.lastPrice < 200000) {
        realisticPrices++;
      } else if (data.symbol.includes('ETH') && data.lastPrice > 1000 && data.lastPrice < 10000) {
        realisticPrices++;
      }
    });

    console.log(`   📈 ${realisticPrices} prix dans des plages réalistes`);

    if (realisticPrices === finalPrices.length) {
      testResults.dataConsistency = true;
    }
  }

  // Résultats finaux
  console.log('\n' + '='.repeat(50));
  console.log('📋 RÉSULTATS DU TEST');
  console.log('='.repeat(50));

  const passedTests = Object.values(testResults).filter(result => result).length;
  const totalTests = Object.keys(testResults).length;

  Object.entries(testResults).forEach(([test, passed]) => {
    const testNames = {
      installationOk: 'Installation Sierra Chart',
      filesFound: 'Fichiers de données détectés',
      pricesExtracted: 'Extraction des prix',
      databaseConnected: 'Connexion base de données',
      realTimeUpdates: 'Mises à jour temps réel',
      dataConsistency: 'Cohérence des données'
    };

    console.log(`${passed ? '✅' : '❌'} ${testNames[test]}`);
  });

  console.log('='.repeat(50));
  console.log(`🏆 Score: ${passedTests}/${totalTests} tests réussis`);

  if (passedTests >= 5) {
    console.log('🎉 Module Sierra Chart fonctionne CORRECTEMENT');
    console.log('💡 Le module est prêt à être utilisé en production');
  } else if (passedTests >= 3) {
    console.log('⚠️ Module fonctionne partiellement');
    console.log('🔧 Vérifiez la configuration de Sierra Chart');
  } else {
    console.log('❌ Module ne fonctionne pas correctement');
    console.log('🚨 Vérifiez l\'installation de Sierra Chart');
  }

  // Recommandations
  console.log('\n💡 RECOMMANDATIONS:');

  if (!testResults.installationOk) {
    console.log('   • Vérifiez que Sierra Chart est installé dans C:/SierraChart/');
    console.log('   • Assurez-vous que le dossier Data/ est accessible');
  }

  if (!testResults.filesFound) {
    console.log('   • Ajoutez des symboles crypto dans Sierra Chart');
    console.log('   • File > New/Open Chart > XBTUSD-BMEX');
  }

  if (!testResults.pricesExtracted) {
    console.log('   • Attendez que les données se chargent dans Sierra Chart');
    console.log('   • Vérifiez la connexion aux data feeds');
  }

  if (!testResults.databaseConnected) {
    console.log('   • Vérifiez que PostgreSQL est en cours d\'exécution');
    console.log('   • Validez les identifiants dans le fichier .env');
  }
}

// Lancement du test
runCompleteTest().catch(console.error);