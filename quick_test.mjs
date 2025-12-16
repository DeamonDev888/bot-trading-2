#!/usr/bin/env node

/**
 * TEST RAPIDE DE LA PILE X SCRAPING
 * Vérification basique des composants sans dépendances complexes
 */

import fs from 'fs/promises';
import { execSync } from 'child_process';
import path from 'path';

console.log('🧪 TEST RAPIDE - PILE DE SCRAPING X/TWITTER');
console.log('='.repeat(50));

let testsPassed = 0;
let testsTotal = 0;

function test(name, condition, message) {
  testsTotal++;
  const status = condition ? '✅' : '❌';
  console.log(`${status} ${name}: ${message}`);
  if (condition) testsPassed++;
}

// Test 1: Structure des fichiers
console.log('\n📁 1. Structure des fichiers');

async function checkFileStructure() {
  const files = [
    'src/x_scraper/XNewsScraper.ts',
    'src/x_scraper/XScraperService.ts',
    'src/x_scraper/interfaces.ts',
    'src/backend/agents/NewsFilterAgentOptimized.ts',
    'src/discord_bot/SimplePublisherOptimized.ts'
  ];

  for (const file of files) {
    try {
      await fs.access(file);
      test(`Fichier ${path.basename(file)}`, true, 'Présent');
    } catch {
      test(`Fichier ${path.basename(file)}`, false, 'Manquant');
    }
  }
}

// Test 2: Package.json et dépendances
console.log('\n📦 2. Dépendances');

async function checkDependencies() {
  try {
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    const criticalDeps = ['playwright', 'discord.js', 'pg', 'dotenv', 'cheerio', 'axios'];

    for (const dep of criticalDeps) {
      test(`Dépendance ${dep}`, !!deps[dep], deps[dep] ? `v${deps[dep]}` : 'Manquante');
    }

    test('Package.json valide', true, `${Object.keys(deps).length} dépendances`);
  } catch (error) {
    test('Package.json valide', false, 'Erreur lecture');
  }
}

// Test 3: Variables d'environnement
console.log('\n🔧 3. Configuration');

function checkEnvironment() {
  const requiredVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER'];
  const discordVars = ['DISCORD_BOT_TOKEN', 'DISCORD_CHANNEL_ID'];

  let requiredCount = 0;
  for (const envVar of requiredVars) {
    if (process.env[envVar]) {
      requiredCount++;
      test(`Env ${envVar}`, true, 'Définie');
    } else {
      test(`Env ${envVar}`, false, 'Non définie');
    }
  }

  test('Env requises (4)', requiredCount >= 3, `${requiredCount}/4 définies`);
}

// Test 4: Outils externes
console.log('\n🛠️  4. Outils externes');

function checkExternalTools() {
  // Test KiloCode
  try {
    const version = execSync('kilocode --version', { encoding: 'utf8', stdio: 'pipe', timeout: 3000 });
    test('KiloCode CLI', true, version.trim());
  } catch {
    test('KiloCode CLI', false, 'Non disponible');
  }

  // Test Node.js
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8', stdio: 'pipe' });
    test('Node.js', true, nodeVersion.trim());
  } catch {
    test('Node.js', false, 'Non disponible');
  }

  // Test npm
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8', stdio: 'pipe' });
    test('npm', true, npmVersion.trim());
  } catch {
    test('npm', false, 'Non disponible');
  }
}

// Test 5: Fichiers OPML
console.log('\n📄 5. Fichiers OPML');

async function checkOPMLFiles() {
  const opmlFiles = ['ia.opml', 'finance-x.opml'];

  for (const file of opmlFiles) {
    try {
      const stats = await fs.stat(file);
      const content = await fs.readFile(file, 'utf-8');
      const feedCount = (content.match(/<outline/gi) || []).length;

      test(`OPML ${file}`, true, `${feedCount} feeds, ${(stats.size/1024).toFixed(1)}KB`);
    } catch {
      test(`OPML ${file}`, false, 'Non trouvé');
    }
  }
}

// Test 6: Mémoire et disque
console.log('\n💾 6. Système');

async function checkSystem() {
  // Test écriture
  try {
    const testFile = '.quick_test.tmp';
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);
    test('Écriture disque', true, 'OK');
  } catch {
    test('Écriture disque', false, 'Erreur');
  }

  // Mémoire
  const usage = process.memoryUsage();
  const usedMB = Math.round(usage.rss / 1024 / 1024);
  test('Mémoire disponible', usedMB < 1000, `${usedMB}MB utilisés`);
}

// Exécuter tous les tests
async function runQuickTest() {
  await checkFileStructure();
  await checkDependencies();
  checkEnvironment();
  checkExternalTools();
  await checkOPMLFiles();
  await checkSystem();

  // Résultats finaux
  console.log('\n' + '='.repeat(50));
  console.log('📊 RÉSULTATS FINAUX');
  console.log('='.repeat(50));

  const successRate = Math.round((testsPassed / testsTotal) * 100);
  const status = successRate >= 80 ? '🟢 EXCELLENT' : successRate >= 60 ? '🟡 BON' : '🔴 À AMÉLIORER';

  console.log(`🎯 Score: ${testsPassed}/${testsTotal} (${successRate}%)`);
  console.log(`📈 Statut: ${status}`);

  if (successRate < 100) {
    console.log('\n💡 Suggestions d\'amélioration:');

    if (testsPassed < testsTotal) {
      console.log('   • Corrigez les erreurs identifiées ci-dessus');
    }

    if (!process.env.KILOCODE_API_KEY) {
      console.log('   • Installez KiloCode: npm install -g @kilocode/cli');
    }

    console.log('   • Vérifiez votre fichier .env');
    console.log('   • Assurez-vous que les OPML sont présents');
  }

  console.log('\n🚀 Prochaines étapes:');
  if (successRate >= 80) {
    console.log('   • npm run test:x:scraper    (tester le scraper)');
    console.log('   • npm run test:x:service   (tester le service)');
    console.log('   • npm run test:x           (tous les composants)');
  } else {
    console.log('   • Corrigez les problèmes ci-dessus');
    console.log('   • Relancez: node quick_test.mjs');
  }

  process.exit(successRate >= 60 ? 0 : 1);
}

// Gestion des erreurs globales
process.on('uncaughtException', (error) => {
  console.error('💥 Erreur non capturée:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 Promesse rejetée:', reason);
  process.exit(1);
});

// Lancer le test
runQuickTest().catch(error => {
  console.error('💥 Erreur durant le test:', error);
  process.exit(1);
});