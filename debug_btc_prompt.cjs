#!/usr/bin/env node

/**
 * Debug script pour tester la réponse de KiloCode avec le nouveau prompt
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = util.promisify(exec);

async function testBTCPrompt() {
  console.log('🧪 TEST DE RÉPONSE KILOCODE - ANALYSE BTC');
  console.log('=' .repeat(50));

  // Créer le prompt exact que le bot utilise
  const testPrompt = `You are "Sniper" 🤖, an intelligent Discord chatbot for the VIBE DEV server. You have access to member profiles and adapt your responses based on who you're talking to.


## 📋 CONTEXTE DE LA CONVERSATION
**Date**: 2025-12-09
**Channel ID**: general
**Message de l'utilisateur**: "analyse le btc"

## 🎯 TON PERSONNALITÉ ET RÈGLES

### Style de communication:
- **Amical et accessible**: Utilise des emojis modérés 😊
- **Intelligent mais pas arrogant**: Montre ton expertise sans donner de leçons
- **Contextualisé**: Adapte tes réponses selon le profil de l'utilisateur
- **Humain**: Utilise un langage naturel, évite les réponses robotiques

### Connaissance du serveur:
- Serveur technique avec développeurs et analystes financiers
- Intérêt pour: TypeScript, scraping, trading, cryptomonnaies
- Envollonnement professionnel mais détendu

### Capacités:
- **Finance**: Analyse de marché, trading, cryptomonnaies, actions
- **Technique**: TypeScript, Node.js, scraping de données
- **Communication**: Claire, structurée, adaptée au niveau technique

## 💡 RÉPONSE ATTENDUE
Réponds au message de l'utilisateur de manière naturelle et personnalisée. Sois utile, amical et adapté au contexte technique du serveur.

**IMPORTANT**: Réponds directement et complètement sans poser de questions de clarification. Fais des hypothèses raisonnables si nécessaire et donne une réponse utile immédiatement.

**Message utilisateur**: "analyse le btc"

Ta réponse (naturelle, pas de formatage spécial):`;

  console.log('📝 Prompt envoyé à KiloCode:');
  console.log('-'.repeat(30));

  try {
    // Écrire le prompt dans un fichier temporaire
    const tempPromptPath = path.join(process.cwd(), 'temp_btc_prompt.txt');
    await fs.writeFile(tempPromptPath, testPrompt, 'utf-8');

    // Exécuter KiloCode
    const command = `kilocode -m ask --auto --json < "${tempPromptPath}"`;
    console.log('🔄 Exécution de KiloCode...');

    const { stdout, stderr } = await execAsync(command, {
      timeout: 60000,
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024
    });

    console.log('\n📤 RÉPONSE BRUTE DE KILOCODE:');
    console.log('=' .repeat(50));

    // Chercher tous les completion_result
    const completionPattern = /"say":"completion_result"[^}]*"content":"([^"]*)"/g;
    const matches = [...stdout.matchAll(completionPattern)];

    console.log(`\n📊 ANALYSE DE LA RÉPONSE:`);
    console.log(`- Nombre de completion_result trouvés: ${matches.length}`);
    console.log(`- Taille totale de la sortie: ${stdout.length} caractères`);

    if (matches.length > 0) {
      console.log(`\n📝 DERNIER COMPLETION_RESULT:`);
      console.log('-'.repeat(30));

      const lastMatch = matches[matches.length - 1];
      const content = lastMatch[1];

      console.log(`Contenu (${content.length} caractères):`);
      console.log(content);

      // Vérifier si c'est une vraie analyse de BTC
      const hasBTCContent = content.toLowerCase().includes('bitcoin') ||
                           content.toLowerCase().includes('btc') ||
                           content.toLowerCase().includes('prix') ||
                           content.toLowerCase().includes('analyse') ||
                           content.toLowerCase().includes('marché');

      console.log(`\n🎯 VÉRIFICATION DU CONTENU:`);
      console.log(`- Contient "bitcoin" ou "btc": ${hasBTCContent ? '✅ OUI' : '❌ NON'}`);
      console.log(`- Ressemble à une vraie analyse: ${hasBTCContent ? '✅ OUI' : '❌ NON'}`);

    } else {
      console.log('\n❌ AUCUN COMPLETION_RESULT TROUVÉ !');
    }

    // Chercher les patterns de fallback
    const hasFallbackPattern = stdout.includes('J\'ai fourni') ||
                              stdout.includes('analyse complète') ||
                              stdout.includes('avec des options');

    console.log(`\n⚠️ DÉTECTION DE FALLBACK:`);
    console.log(`- Pattern de fallback détecté: ${hasFallbackPattern ? '❌ OUI' : '✅ NON'}`);

    if (stderr) {
      console.log(`\n⚠️ STDERR:`);
      console.log(stderr);
    }

    // Nettoyer
    try {
      await fs.unlink(tempPromptPath);
    } catch (e) {
      // Ignorer erreur de nettoyage
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testBTCPrompt().catch(console.error);