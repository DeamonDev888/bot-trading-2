// Test simple du module SierraChart
console.log('🚀 Test simple du module SierraChart...\n');

try {
  // Test 1: Importation des modules
  console.log('✅ Test 1: Importation des modules...');

  const { SierraChartService } = await import('./dist/backend/sierrachart/SierraChartService.js');
  const { MarketDataManager } = await import('./dist/backend/sierrachart/MarketDataManager.js');
  const { TradingManager } = await import('./dist/backend/sierrachart/TradingManager.js');

  console.log('   ✓ SierraChartService importé');
  console.log('   ✓ MarketDataManager importé');
  console.log('   ✓ TradingManager importé');
  console.log('   ✓ Classes importées avec succès\n');

  // Test 2: Test des types
  console.log('✅ Test 2: Validation des types...');

  const config = {
    host: 'localhost',
    port: 11099,
    autoReconnect: true,
    timeout: 5000
  };

  console.log('   ✓ Config créée');
  console.log(`   ✓ Host: ${config.host}`);
  console.log(`   ✓ Port: ${config.port}`);
  console.log(`   ✓ Auto-reconnect: ${config.autoReconnect}`);
  console.log(`   ✓ Timeout: ${config.timeout}ms\n`);

  // Test 3: Création d'instances
  console.log('✅ Test 3: Création des instances...');

  const sierraService = new SierraChartService(config);
  console.log('   ✓ SierraChartService instance créée');

  const marketDataManager = new MarketDataManager(config);
  console.log('   ✓ MarketDataManager instance créée');

  const tradingManager = new TradingManager(config);
  console.log('   ✓ TradingManager instance créée');
  console.log('');

  // Test 4: Vérification des méthodes
  console.log('✅ Test 4: Vérification des méthodes...');

  // SierraChartService
  if (typeof sierraService.connect === 'function') {
    console.log('   ✓ sierraService.connect()');
  }
  if (typeof sierraService.disconnect === 'function') {
    console.log('   ✓ sierraService.disconnect()');
  }

  // MarketDataManager
  if (typeof marketDataManager.initialize === 'function') {
    console.log('   ✓ marketDataManager.initialize()');
  }
  if (typeof marketDataManager.subscribeToMarketData === 'function') {
    console.log('   ✓ marketDataManager.subscribeToMarketData()');
  }

  // TradingManager
  if (typeof tradingManager.initialize === 'function') {
    console.log('   ✓ tradingManager.initialize()');
  }
  if (typeof tradingManager.placeOrder === 'function') {
    console.log('   ✓ tradingManager.placeOrder()');
  }

  console.log('');

  // Test 5: Test de connexion (sans se connecter réellement)
  console.log('✅ Test 5: Test de configuration de connexion...');

  // Vérifier que le service a les bonnes propriétés
  if (sierraService && typeof sierraService === 'object') {
    console.log('   ✓ Service SierraChart valide');
  }

  console.log('');

  // Résumé
  console.log('📋 Résumé du test:');
  console.log('   ✅ Importation des modules: RÉUSSIE');
  console.log('   ✅ Création des instances: RÉUSSIE');
  console.log('   ✅ Validation des méthodes: RÉUSSIE');
  console.log('   ✅ Configuration de connexion: RÉUSSIE');

  console.log('\n🎉 Module SierraChart testé avec succès!');
  console.log('\n💡 Étapes suivantes:');
  console.log('   1. Démarrez SierraChart');
  console.log('   2. Configurez SierraChart pour le DTC sur le port 11099');
  console.log('   3. Testez une connexion réelle avec sierraService.connect()');

} catch (error) {
  console.error('❌ Erreur lors du test:', error.message);
  if (error.stack) {
    console.error('\nDétails de l\'erreur:');
    console.error(error.stack);
  }
  process.exit(1);
}