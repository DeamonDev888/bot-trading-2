#!/usr/bin/env node

/**
 * KiloCode Simple Chat - Version simplifiée pour test rapide
 */

import { spawn } from 'child_process';

const MODEL = 'x-ai/grok-code-fast-1';

async function simpleChat() {
  console.log('🎯 KiloCode Simple Chat');
  console.log(`📝 Modèle: ${MODEL}`);
  console.log('💬 Mode: JSON Persistant\n');
  console.log('Tapez vos messages (exit pour quitter):\n');

  const kil = spawn('kil', ['-i', '--model', MODEL], {
    stdio: 'inherit'
  });

  // Gestionnaire pour Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n👋 Au revoir!');
    process.exit(0);
  });
}

simpleChat().catch(console.error);
