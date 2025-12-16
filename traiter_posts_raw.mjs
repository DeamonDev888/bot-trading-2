#!/usr/bin/env node

/**
 * Script pour traiter les posts raw accumulés
 * Utilise NewsFilterAgentOptimized pour traiter un lot de posts raw
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runRawProcessing() {
  console.log('🔄 === TRAITEMENT DES POSTS RAW ACCUMULÉS ===\n');

  const agentScriptPath = path.resolve(__dirname, 'src', 'backend', 'agents', 'NewsFilterAgentOptimized.ts');

  console.log(`📂 Script: ${agentScriptPath}`);
  console.log('⏰ Début:', new Date().toLocaleTimeString());
  console.log('');

  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', `"${agentScriptPath}"`], {
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
        console.log('✅ Traitement terminé avec succès (code: 0)');
        resolve(true);
      } else {
        console.error(`❌ Traitement terminé avec erreur (code: ${code})`);
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
console.log('🚀 Lancement du traitement des posts raw...');

runRawProcessing()
  .then(() => {
    console.log('\n✅ === TRAITEMENT TERMINÉ ===');
    console.log('Vous pouvez maintenant vérifier les résultats avec:');
    console.log('  node audit_complet_pipeline.mjs');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ === ERREUR LORS DU TRAITEMENT ===');
    console.error(error);
    process.exit(1);
  });