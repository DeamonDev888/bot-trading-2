#!/usr/bin/env node

/**
 * Debug script pour tester la réponse de KiloCode directement
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = util.promisify(exec);

async function testKiloCodeResponse() {
  console.log('🧪 TEST DE RÉPONSE KILOCODE');
  console.log('=' .repeat(50));

  // Créer un prompt simple
  const testPrompt = `Tu es Sniper, expert financier.

Question: analyse l eth

Réponds de manière naturelle et professionnelle en français.`;

  console.log('📝 Prompt envoyé:');
  console.log(testPrompt);
  console.log('\n' + '-'.repeat(50) + '\n');

  try {
    // Écrire le prompt dans un fichier temporaire
    const tempPromptPath = path.join(process.cwd(), 'temp_debug_prompt.txt');
    await fs.writeFile(tempPromptPath, testPrompt, 'utf-8');

    // Exécuter KiloCode
    const command = `kilocode -m ask --auto --json < "${tempPromptPath}"`;
    console.log('🔄 Exécution de KiloCode...');

    const { stdout, stderr } = await execAsync(command, {
      timeout: 60000,
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024
    });

    console.log('📤 STDOUT de KiloCode:');
    console.log('-'.repeat(30));
    console.log(stdout);
    console.log('-'.repeat(30));

    if (stderr) {
      console.log('\n⚠️ STDERR de KiloCode:');
      console.log('-'.repeat(30));
      console.log(stderr);
      console.log('-'.repeat(30));
    }

    // Nettoyer
    try {
      await fs.unlink(tempPromptPath);
    } catch (e) {
      // Ignorer erreur de nettoyage
    }

    // Analyser la réponse
    console.log('\n🔍 ANALYSE DE LA RÉPONSE:');
    console.log('-'.repeat(30));

    // Chercher les patterns JSON
    const jsonPatterns = [
      /"say":"completion_result"[^}]*"partial":false[^}]*"content":"([^"]*)"/g,
      /"type":"poll"/g,
      /"type":"message_enrichi"/g,
      /"text":/g
    ];

    jsonPatterns.forEach((pattern, index) => {
      const matches = [...stdout.matchAll(pattern)];
      console.log(`Pattern ${index + 1}: ${matches.length} match(s) trouvé(s)`);
      if (matches.length > 0 && index === 0) {
        matches.forEach((match, i) => {
          console.log(`  Match ${i + 1}: "${match[1]?.substring(0, 100)}..."`);
        });
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testKiloCodeResponse().catch(console.error);