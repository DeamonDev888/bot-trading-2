#!/usr/bin/env node

/**
 * Script pour publier les posts éligibles non publiés
 * Utilise SimplePublisherOptimized pour publier tous les posts éligibles
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runPublication() {
  console.log('📢 === PUBLICATION DES POSTS ÉLIGIBLES NON PUBLIÉS ===\n');

  const publisherScriptPath = path.resolve(__dirname, 'src', 'discord_bot', 'SimplePublisherOptimized.ts');

  console.log(`📂 Script: ${publisherScriptPath}`);
  console.log('⏰ Début:', new Date().toLocaleTimeString());
  console.log('');

  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', `"${publisherScriptPath}"`, '--threshold=0'], {
      cwd: __dirname,
      shell: true,
      env: process.env
    });

    // Streaming des logs en temps réel
    child.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(output);
      }
    });

    child.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.error(output);
      }
    });

    child.on('close', (code) => {
      console.log('');
      console.log('⏰ Fin:', new Date().toLocaleTimeString());

      if (code === 0) {
        console.log('✅ Publication terminée avec succès (code: 0)');
        resolve(true);
      } else {
        console.error(`❌ Publication terminée avec erreur (code: ${code})`);
        reject(new Error(`Process exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      console.error('❌ Erreur de démarrage du processus:', err);
      reject(err);
    });
  });
}

// Exécution du script
console.log('🚀 Lancement de la publication des posts éligibles...');

runPublication()
  .then(() => {
    console.log('\n✅ === PUBLICATION TERMINÉE ===');
    console.log('Vous pouvez maintenant vérifier les résultats avec:');
    console.log('  node audit_complet_pipeline.mjs');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ === ERREUR LORS DE LA PUBLICATION ===');
    console.error(error);
    process.exit(1);
  });