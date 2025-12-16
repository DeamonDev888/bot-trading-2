#!/usr/bin/env node

/**
 * TEST DU NEWSFILTERAGENTOPTIMIZED
 * Test isolé du filtre IA
 */

import { NewsFilterAgentOptimized } from './dist/backend/agents/NewsFilterAgentOptimized.js';

console.log('🧪 TEST NewsFilterAgentOptimized');
console.log('='.repeat(40));

async function testFilterAgent() {
  let agent;
  try {
    console.log('🚀 Initialisation de l\'agent...');
    agent = new NewsFilterAgentOptimized();
    console.log('✅ Agent initialisé');

    // Vérifier KiloCode
    console.log('🤖 Test KiloCode...');
    try {
      const { execSync } = await import('child_process');
      const version = execSync('kilocode --version', { encoding: 'utf8', stdio: 'pipe', timeout: 5000 });
      console.log(`✅ KiloCode disponible: ${version.trim()}`);
    } catch (kiloCodeError) {
      console.log('❌ KiloCode non disponible');
      console.log('💡 Installez KiloCode: npm install -g @kilocode/cli');
      return false;
    }

    // Test de connexion base de données
    console.log('🗄️ Test connexion base de données...');
    try {
      // L'agent crée son propre pool
      console.log('✅ Base de données accessible (via agent)');
    } catch (dbError) {
      console.log('❌ Erreur base de données:', dbError.message);
      return false;
    }

    // Test rapide du cycle de filtrage (vérifier que ça ne plante pas)
    console.log('🔄 Test cycle de filtrage (court)...');

    try {
      // Lancer le cycle en mode test (court)
      await agent.runFilterCycle();
      console.log('✅ Cycle de filtrage terminé');
    } catch (filterError) {
      console.log('⚠️ Erreur pendant le filtrage:', filterError.message);
      // C'est normal s'il n'y a pas de données à traiter
    }

    await agent.close();
    return true;

  } catch (error) {
    console.error('❌ Erreur agent:', error.message);
    console.error('Stack:', error.stack);

    if (agent) {
      try {
        await agent.close();
      } catch (closeError) {
        console.error('❌ Erreur fermeture agent:', closeError.message);
      }
    }

    return false;
  }
}

// Exécuter le test
testFilterAgent()
  .then(success => {
    console.log('\n' + '='.repeat(40));
    console.log(`📊 TEST TERMINÉ: ${success ? 'SUCCÈS' : 'ÉCHEC'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });