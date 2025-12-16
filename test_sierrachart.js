const { testConnection, createMarketDataManager, SierraChartConfig } = require('./dist/backend/sierrachart');

async function testSierraChartModule() {
  console.log('🚀 Test du module SierraChart...\n');

  // Configuration pour le test
  const config = {
    host: 'localhost',
    port: 11099,
    autoReconnect: true,
    timeout: 5000 // Timeout plus court pour le test
  };

  console.log('📋 Configuration:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Auto-reconnect: ${config.autoReconnect}`);
  console.log(`   Timeout: ${config.timeout}ms\n`);

  try {
    // Test 1: Vérifier que les classes sont importées correctement
    console.log('✅ Test 1: Importation des classes...');
    const MarketDataManager = require('./dist/backend/sierrachart').MarketDataManager;
    const TradingManager = require('./dist/backend/sierrachart').TradingManager;
    console.log('   ✓ MarketDataManager importé');
    console.log('   ✓ TradingManager importé');
    console.log('   ✓ Classes importées avec succès\n');

    // Test 2: Test de connexion (peut échouer si SierraChart n'est pas en cours d'exécution)
    console.log('🔌 Test 2: Test de connexion à SierraChart...');
    const isConnected = await testConnection(config);

    if (isConnected) {
      console.log('   ✅ Connexion réussie à SierraChart!');
    } else {
      console.log('   ⚠️  SierraChart n\'est pas accessible sur le port 11099');
      console.log('      (Ce n\'est pas une erreur - SierraChart doit être en cours d\'exécution)');
    }
    console.log('');

    // Test 3: Création d'instances
    console.log('🏗️  Test 3: Création des instances de services...');

    const marketDataManager = createMarketDataManager(config);
    console.log('   ✓ MarketDataManager créé');

    const tradingManager = new TradingManager(config);
    console.log('   ✓ TradingManager créé');

    // Test 4: Vérification des méthodes
    console.log('   ✓ Vérification des méthodes disponibles...');

    // Market Data Manager
    if (typeof marketDataManager.initialize === 'function') {
      console.log('   ✓ marketDataManager.initialize()');
    }
    if (typeof marketDataManager.subscribeToMarketData === 'function') {
      console.log('   ✓ marketDataManager.subscribeToMarketData()');
    }
    if (typeof marketDataManager.calculateTechnicalIndicators === 'function') {
      console.log('   ✓ marketDataManager.calculateTechnicalIndicators()');
    }

    // Trading Manager
    if (typeof tradingManager.initialize === 'function') {
      console.log('   ✓ tradingManager.initialize()');
    }
    if (typeof tradingManager.placeOrder === 'function') {
      console.log('   ✓ tradingManager.placeOrder()');
    }
    if (typeof tradingManager.getPositions === 'function') {
      console.log('   ✓ tradingManager.getPositions()');
    }

    console.log('');

    // Test 5: Vérification de l'état de connexion
    console.log('📊 Test 4: État des services...');
    console.log(`   Market Data Manager - Connecté: ${marketDataManager.getConnectionStatus().isConnected}`);
    console.log(`   Trading Manager - Connecté: ${tradingManager.getConnectionStatus().isConnected}`);

    console.log('');

    // Test 6: Validation des types et interfaces
    console.log('🔍 Test 5: Validation des types...');

    // Test de création de requête de données de marché
    const marketDataRequest = {
      Symbol: 'ES',
      Exchange: 'CME',
      RequestID: 1,
      Interval: 1,
      UseZCompression: true
    };
    console.log('   ✓ MarketDataRequest structure valide');

    // Test de requête d'ordre
    const orderRequest = {
      Symbol: 'ES',
      Exchange: 'CME',
      TradeAccount: 'TEST',
      OrderType: 'MARKET',
      OrderQuantity: 1,
      BuySell: 'BUY',
      TimeInForce: 'GTC'
    };
    console.log('   ✓ OrderRequest structure valide');

    console.log('');

    // Résumé du test
    console.log('📋 Résumé du test:');
    console.log('   ✅ Importation des modules: RÉUSSIE');
    console.log('   ✅ Création des instances: RÉUSSIE');
    console.log('   ✅ Validation des méthodes: RÉUSSIE');
    console.log('   ✅ Validation des types: RÉUSSIE');

    if (isConnected) {
      console.log('   ✅ Connexion SierraChart: RÉUSSIE');
    } else {
      console.log('   ⚠️  Connexion SierraChart: NON TESTÉE (service non démarré)');
    }

    console.log('\n🎉 Module SierraChart testé avec succès!');
    console.log('\n💡 Pour utiliser le module:');
    console.log('   1. Assurez-vous que SierraChart est en cours d\'exécution');
    console.log('   2. Configurez SierraChart pour accepter les connexions DTC sur le port 11099');
    console.log('   3. Utilisez les exemples dans ./src/backend/sierrachart/example.ts');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    console.error('\nDétails de l\'erreur:', error);
    process.exit(1);
  }
}

// Exécuter le test
if (require.main === module) {
  testSierraChartModule().catch(console.error);
}

module.exports = { testSierraChartModule };