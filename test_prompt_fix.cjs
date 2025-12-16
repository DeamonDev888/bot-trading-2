#!/usr/bin/env node

/**
 * Test pour vérifier si le nouveau prompt évite les questions de clarification
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = util.promisify(exec);

async function testPromptFix() {
  console.log('🧪 TEST DU PROMPT AVEC DIRECTIVE ANTI-CLARIFICATION');
  console.log('=' .repeat(60));

  // Créer un prompt simple qui devrait générer des questions de clarification normalement
  const testPrompt = `You are "Sniper" 🤖, an intelligent Discord chatbot.

## 💡 RÉPONSE ATTENDUE
Réponds au message de l'utilisateur de manière naturelle et personnalisée.

**IMPORTANT**: Réponds directement et complètement sans poser de questions de clarification. Fais des hypothèses raisonnables si nécessaire et donne une réponse utile immédiatement.

**Message utilisateur**: "analyse l eth"

Ta réponse (naturelle, pas de formatage spécial):`;

  console.log('📝 Prompt envoyé:');
  console.log(testPrompt);
  console.log('\n' + '-'.repeat(50) + '\n');

  try {
    // Écrire le prompt dans un fichier temporaire
    const tempPromptPath = path.join(process.cwd(), 'temp_prompt_fix.txt');
    await fs.writeFile(tempPromptPath, testPrompt, 'utf-8');

    // Exécuter KiloCode
    const command = `kilocode -m ask --auto --json < "${tempPromptPath}"`;
    console.log('🔄 Exécution de KiloCode...');

    const { stdout, stderr } = await execAsync(command, {
      timeout: 60000,
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024
    });

    console.log('📤 Résultat de KiloCode:');
    console.log('-'.repeat(30));

    // Chercher les questions de clarification
    const hasClarificationQuestions = stdout.includes('Pourriez-vous') ||
                                     stdout.includes('pourriez-vous') ||
                                     stdout.includes('Que voulez-vous dire') ||
                                     stdout.includes('Que signifie');

    // Chercher les completion_result
    const completionMatches = [...stdout.matchAll(/"say":"completion_result"/g)];

    console.log(`📊 Statistiques:`);
    console.log(`   - Questions de clarification: ${hasClarificationQuestions ? '❌ OUI' : '✅ NON'}`);
    console.log(`   - Nombre de completion_result: ${completionMatches.length}`);

    if (completionMatches.length > 0) {
      console.log(`   - Dernier completion_result: ${completionMatches.length > 0 ? 'Trouvé' : 'Non trouvé'}`);
    }

    // Extraire le contenu du dernier completion_result
    const lastCompletionMatch = [...stdout.matchAll(/"say":"completion_result"[^}]*"content":"([^"]+)"/g)].pop();
    if (lastCompletionMatch && lastCompletionMatch[1]) {
      const content = lastCompletionMatch[1];
      console.log(`\n📝 Dernier contenu trouvé (${content.length} chars):`);
      console.log(content.substring(0, 300) + (content.length > 300 ? '...' : ''));

      if (content.toLowerCase().includes('ethereum') || content.toLowerCase().includes('eth')) {
        console.log(`\n✅ SUCCÈS: Contenu pertinent trouvé !`);
      } else {
        console.log(`\n❌ ÉCHEC: Contenu non pertinent ou générique`);
      }
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

testPromptFix().catch(console.error);