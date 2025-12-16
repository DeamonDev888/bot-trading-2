#!/usr/bin/env node

/**
 * Test de diagnostic pour l'analyse NVIDIA et le parsing KiloCode
 * But: Identifier pourquoi les réponses NVIDIA sont coupées à 67 caractères
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 === TEST DE DIAGNOSTIC NVIDIA ===');
console.log('');

// Test 1: Exécuter KiloCode directement avec le prompt NVIDIA
console.log('📝 Test 1: Exécution KiloCode directe pour NVIDIA');
try {
  const promptNvidia = 'sniper analyse nvidia';
  console.log(`Prompt: "${promptNvidia}"`);

  const startTime = Date.now();
  const output = execSync(`cd "${__dirname}" && echo "${promptNvidia}" | kilocode --auto --json`, {
    encoding: 'utf8',
    timeout: 30000
  });
  const duration = Date.now() - startTime;

  console.log(`✅ Durée: ${duration}ms`);
  console.log(`📊 Taille de sortie: ${output.length} caractères`);
  console.log('');

  // Sauvegarder la sortie brute pour analyse
  fs.writeFileSync('nvidia_raw_output.json', output);
  console.log('💾 Sortie brute sauvegardée dans: nvidia_raw_output.json');

  // Analyser les events JSON
  const lines = output.trim().split('\n').filter(line => line.trim());
  console.log(`📋 Nombre de lignes: ${lines.length}`);

  let completionResults = [];
  let otherEvents = [];

  for (let i = 0; i < lines.length; i++) {
    try {
      const event = JSON.parse(lines[i]);

      if (event.say === 'completion_result') {
        completionResults.push({
          index: i,
          partial: event.partial,
          contentLength: event.content ? event.content.length : 0,
          content: event.content
        });
      } else {
        otherEvents.push({
          index: i,
          type: event.say,
          summary: event.summary || ''
        });
      }
    } catch (e) {
      console.warn(`⚠️ Ligne ${i} invalide: ${lines[i].substring(0, 100)}...`);
    }
  }

  console.log('');
  console.log('📊 Analyse des completion_result:');
  completionResults.forEach((result, idx) => {
    console.log(`  ${idx + 1}. Ligne ${result.index}: partial=${result.partial}, length=${result.contentLength}`);
    if (result.contentLength <= 100) {
      console.log(`     Contenu: "${result.content}"`);
    } else {
      console.log(`     Contenu: "${result.content.substring(0, 100)}..."`);
    }
  });

  // Prendre le dernier completion_result (comme dans le bot)
  if (completionResults.length > 0) {
    const lastResult = completionResults[completionResults.length - 1];
    console.log('');
    console.log('🎯 Dernier completion_result (celui que le bot devrait utiliser):');
    console.log(`   Longueur: ${lastResult.contentLength} caractères`);
    console.log(`   Contenu: "${lastResult.content}"`);

    if (lastResult.contentLength <= 67) {
      console.log('🚨 PROBLÈME DÉTECTÉ: Le contenu est très court!');
      console.log('   Cela pourrait expliquer pourquoi le bot renvoie 67 caractères');
    }
  } else {
    console.log('🚨 PROBLÈME: Aucun completion_result trouvé!');
  }

  console.log('');
  console.log('📋 Autres events détectés:');
  otherEvents.forEach(event => {
    console.log(`  Ligne ${event.index}: ${event.type} - ${event.summary}`);
  });

} catch (error) {
  console.error('❌ Erreur lors du test KiloCode:', error.message);
  if (error.status) {
    console.error(`   Code de sortie: ${error.status}`);
  }
}

console.log('');
console.log('🔧 === TEST 2: Simulation du parsing du bot ===');

// Test 2: Simuler le parsing du bot
try {
  if (fs.existsSync('nvidia_raw_output.json')) {
    const rawOutput = fs.readFileSync('nvidia_raw_output.json', 'utf8');

    // Simuler la méthode parseJsonEvents du bot
    function simulateParseJsonEvents(jsonOutput) {
      const events = jsonOutput.trim().split('\n').filter(line => line.trim());
      let completionResult = '';

      for (const line of events) {
        try {
          const event = JSON.parse(line);
          const content = event.content || '';

          // Logique actuelle du bot (fixée)
          if (event.say === 'completion_result' && content && content.length > 10) {
            completionResult = content; // Prendre toujours le dernier valide
          }
        } catch (e) {
          // Ignorer les lignes invalides
        }
      }

      return completionResult;
    }

    const parsedResult = simulateParseJsonEvents(rawOutput);
    console.log(`✅ Résultat du parsing: ${parsedResult.length} caractères`);
    console.log(`📝 Contenu: "${parsedResult}"`);

    if (parsedResult.length === 67) {
      console.log('🚨 CONFIRMÉ: Le parsing retourne exactement 67 caractères!');
      console.log('   Le problème est dans la réponse KiloCode, pas dans le parsing');
    } else if (parsedResult.length > 67) {
      console.log('✅ Le parsing fonctionne, le contenu est plus long que 67 caractères');
      console.log('   Le problème pourrait être dans le traitement après parsing');
    } else {
      console.log('🚨 Le parsing retourne un contenu très court');
    }
  } else {
    console.log('⚠️ Fichier nvidia_raw_output.json non disponible');
  }
} catch (error) {
  console.error('❌ Erreur lors du test de parsing:', error.message);
}

console.log('');
console.log('🏁 === FIN DU DIAGNOSTIC ===');

// Vérifier si le bot est en cours d'exécution
try {
  const botProcesses = execSync('tasklist | findstr node', { encoding: 'utf8' });
  if (botProcesses.includes('sniper_financial_bot')) {
    console.log('');
    console.log('🤖 Le bot Discord est actif');
    console.log('   Pour tester avec le bot: envoyez "sniper analyse nvidia" sur Discord');
  } else {
    console.log('');
    console.log('⚠️ Le bot Discord n\'est pas en cours d\'exécution');
    console.log('   Pour démarrer: pnpm bot');
  }
} catch (error) {
  console.log('');
  console.log('⚠️ Impossible de vérifier l\'état du bot');
}