#!/usr/bin/env node

// Script de configuration pour Sierra Chart DTC Protocol
import * as fs from 'fs';
import * as path from 'path';

console.log('⚙️ CONFIGURATION SIERRA CHART DTC PROTOCOL');
console.log('='.repeat(60));

function showConfigurationSteps() {
  console.log('\n📋 ÉTAPES DE CONFIGURATION DANS SIERRA CHART:');
  console.log('='.repeat(60));

  console.log('\n1️⃣ DÉMARRER SIERRA CHART:');
  console.log('   • Lancez Sierra Chart.exe');
  console.log('   • Assurez-vous qu\'il est en cours d\'exécution');
  console.log('   • Vérifiez que les data feeds sont connectés');

  console.log('\n2️⃣ ACTIVER L\'API DTC:');
  console.log('   • Menu: File > Connect to Data Feed');
  console.log('   • Cliquez sur "Settings" ou "Configuration"');
  console.log('   • Cochez "Allow API Connections"');
  console.log('   • Cochez "Allow Data Downloading"');

  console.log('\n3️⃣ CONFIGURER LE PORT:');
  console.log('   • Port DTC par défaut: 11099');
  console.log('   • Assurez-vous que le port n\'est pas bloqué par le firewall');
  console.log('   • Autorisez les connexions locales (localhost)');

  console.log('\n4️⃣ OUVRIR LES GRAPHIQUES:');
  console.log('   • Ouvrez les graphiques des symboles désirés');
  console.log('   • Ex: MES (S&P 500), BTCUSDT, etc.');
  console.log('   • Assurez-vous que les données sont reçues en temps réel');

  console.log('\n5️⃣ CONFIGURER LES STUDIES:');
  console.log('   • Ajoutez les studies sur vos graphiques');
  console.log('   • RSI, MACD, Moving Averages, etc.');
  console.log('   • Les studies seront accessibles via DTC');
}

function createConfigurationFile() {
  console.log('\n📄 CRÉATION DU FICHIER DE CONFIGURATION');
  console.log('='.repeat(60));

  const config = {
    sierraChart: {
      host: 'localhost',
      port: 11099,
      timeout: 10000,
      autoReconnect: true,
      reconnectInterval: 5000
    },
    subscriptions: {
      symbols: [
        { symbol: 'MES', exchange: 'CME', name: 'Micro E-mini S&P 500' },
        { symbol: 'YM', exchange: 'CBOT', name: 'Dow Jones Mini' },
        { symbol: 'BTCUSDT', exchange: 'BINANCE', name: 'Bitcoin/USDT' },
        { symbol: 'EURUSD', exchange: '', name: 'Euro/USD' }
      ],
      studies: [
        'RSI',
        'MACD',
        'Moving Average',
        'Bollinger Bands',
        'Volume',
        'VWAP'
      ]
    },
    data: {
      bufferSize: 1000,
      enableStudyData: true,
      enableMarketData: true,
      enableAlerts: true
    }
  };

  const configPath = path.join(process.cwd(), 'sierra-dtc-config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log(`✅ Fichier de configuration créé: ${configPath}`);
  console.log('\n📋 Configuration:');
  console.log(`   • Serveur: ${config.sierraChart.host}:${config.sierraChart.port}`);
  console.log(`   • Symboles: ${config.subscriptions.symbols.length}`);
  console.log(`   • Studies: ${config.subscriptions.studies.length}`);
  console.log(`   • Buffer: ${config.data.bufferSize} messages`);
}

function createTestScript() {
  console.log('\n🧪 CRÉATION DU SCRIPT DE TEST');
  console.log('='.repeat(60));

  const testScript = `#!/usr/bin/env node

// Script de test pour la connexion DTC
import { SierraChartDTC } from './src/backend/modules/SierraChartDTC.mjs';
import { readFileSync } from 'fs';

console.log('🚀 TEST CONNEXION SIERRA CHART DTC');

// Charger la configuration
const config = JSON.parse(readFileSync('./sierra-dtc-config.json', 'utf8'));

const dtc = new SierraChartDTC({
  host: config.sierraChart.host,
  port: config.sierraChart.port
});

async function runTest() {
  try {
    console.log('\\n📡 Connexion à Sierra Chart...');
    await dtc.connect();

    console.log('\\n📊 Souscription aux symboles...');
    config.subscriptions.symbols.forEach(symbolConfig => {
      dtc.subscribeToMarketData(symbolConfig.symbol, symbolConfig.exchange);
      dtc.subscribeToCommonStudies(symbolConfig.symbol);
    });

    // Attendre les données
    console.log('\\n⏱️ Attente des données (30 secondes)...');
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    dtc.disconnect();
  }
}

// Configuration des événements
dtc.on('connected', () => {
  console.log('✅ Connecté !');
});

dtc.on('marketData', (data) => {
  const symbol = config.subscriptions.symbols.find(s => s.symbol === data.symbol);
  const name = symbol ? symbol.name : data.symbol;
  console.log(\`📈 \${name}: $\${data.lastPrice?.toLocaleString() || 'N/A'}\`);
});

dtc.on('studyData', (data) => {
  const lastValue = data.values[data.values.length - 1];
  console.log(\`📊 \${data.symbol} \${data.studyName}: \${lastValue?.toFixed(2) || 'N/A'}\`);
});

dtc.on('error', (error) => {
  console.error('❌ Erreur DTC:', error.message);
});

dtc.on('disconnected', () => {
  console.log('🔌 Déconnecté');
  process.exit(0);
});

// Démarrer le test
runTest();
`;

  const testPath = path.join(process.cwd(), 'test-dtc-connection.mjs');
  fs.writeFileSync(testPath, testScript);

  console.log(`✅ Script de test créé: ${testPath}`);
  console.log('\n💡 Pour tester: node test-dtc-connection.mjs');
}

function showTroubleshooting() {
  console.log('\n🔧 DÉPANNAGE');
  console.log('='.repeat(60));

  console.log('\n❌ SI LA CONNEXION ÉCHOUE:');
  console.log('1. Vérifiez que Sierra Chart est en cours d\'exécution');
  console.log('2. Activez "Allow API Connections" dans Sierra Chart');
  console.log('3. Vérifiez que le port 11099 n\'est pas bloqué');
  console.log('4. Assurez-vous que les data feeds sont connectés');

  console.log('\n🔥 PROBLÈMES COMMUNS:');
  console.log('• "Connection refused" -> Sierra Chart pas démarré');
  console.log('• "Timeout" -> Port bloqué ou API désactivé');
  console.log('• "No data" -> Data feeds non connectés');

  console.log('\n💡 SOLUTIONS:');
  console.log('• Redémarrez Sierra Chart avec les droits admin');
  console.log('• Vérifiez le firewall Windows');
  console.log('• Testez avec un client telnet: telnet localhost 11099');

  console.log('\n🌐 RESSOURCES UTILES:');
  console.log('• Documentation DTC: https://www.sierrachart.com/index.php?page=doc/DTCProtocol.html');
  console.log('• Support Sierra Chart: https://www.sierrachart.com/Support.php');
}

function createRequirementsFile() {
  console.log('\n📋 CRÉATION DES PRÉREQUIS');
  console.log('='.repeat(60));

  const requirements = `# Sierra Chart DTC Requirements

## Système
- Windows 10/11 ou Server 2016+
- Node.js 18+
- Sierra Chart (version 64-bit)

## Configuration Sierra Chart
1. Installer Sierra Chart
2. Activer "Allow API Connections" dans les paramètres
3. Configurer le port DTC (11099 par défaut)
4. Connecter les data feeds

## Data Feeds Requis
- Pour indices: CME Group ou IQFeed
- Pour crypto: Binance API ou BitMEX
- Pour forex: FXCM ou autre provider

## Étapes de Vérification
1. [ ] Sierra Chart installé
2. [ ] API activée dans Sierra Chart
3. [ ] Port 11099 ouvert
4. [ ] Data feeds connectés
5. [ ] Graphiques ouverts avec données temps réel
6. [ ] Tests de connexion passés

## Fichiers à créer
- sierra-dtc-config.json (configuration)
- test-dtc-connection.mjs (test)
- src/backend/modules/SierraChartDTC.mts (module)
`;

  const reqPath = path.join(process.cwd(), 'SIERRA_DTC_REQUIREMENTS.md');
  fs.writeFileSync(reqPath, requirements);

  console.log(`✅ Fichier de prérequis créé: ${reqPath}`);
}

// Exécution du script de configuration
showConfigurationSteps();
createConfigurationFile();
createTestScript();
showTroubleshooting();
createRequirementsFile();

console.log('\n🎯 CONFIGURATION TERMINÉE !');
console.log('='.repeat(60));

console.log('\n📋 PROCHAINES ÉTAPES:');
console.log('1. Lancez Sierra Chart');
console.log('2. Activez "Allow API Connections"');
console.log('3. Configurez le port 11099');
console.log('4. Testez la connexion: node test-dtc-connection.mjs');

console.log('\n✅ Vous aurez alors:');
console.log('   • Connexion en temps réel à Sierra Chart');
console.log('   • Accès aux données de marché live');
console.log('   • Accès aux Studies et indicateurs');
console.log('   • Possibilité d\'envoyer des ordres');

console.log('\n🚀 Le module DTC est prêt pour une connexion réelle !');