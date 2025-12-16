#!/usr/bin/env node

/**
 * SOLUTION 1: Pipes nommés (FIFO)
 * Utilise des pipes Linux pour la communication
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { mkfifo, unlink } from 'fs/promises';

class KiloCodeFIFO {
  constructor() {
    this.inputPipe = '/tmp/kilo_input.fifo';
    this.outputPipe = '/tmp/kilo_output.fifo';
    this.sessionId = null;
    this.running = false;
  }

  async init() {
    console.log('🔧 Initialisation des pipes FIFO...');

    // Créer les pipes
    await this.createPipes();

    // Lancer KiloCode en arrière-plan
    await this.startKiloCode();

    this.running = true;
  }

  async createPipes() {
    try {
      // Nettoyer les anciens pipes
      try { await unlink(this.inputPipe); } catch {}
      try { await unlink(this.outputPipe); } catch {}

      // Créer les nouveaux pipes
      await mkfifo(this.inputPipe, 0o666);
      await mkfifo(this.outputPipe, 0o666);

      console.log('✅ Pipes créés:', this.inputPipe, this.outputPipe);
    } catch (error) {
      console.error('❌ Erreur création pipes:', error.message);
    }
  }

  async startKiloCode() {
    console.log('🚀 Lancement de KiloCode...');

    // Lancer KiloCode avec redirection vers les pipes
    const cmd = `kilo -i -m ask --auto < ${this.inputPipe} > ${this.outputPipe}`;

    spawn('bash', ['-c', cmd], {
      detached: true,
      stdio: 'ignore'
    });

    // Attendre un peu que KiloCode démarre
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('✅ KiloCode lancé');
  }

  async send(message) {
    if (!this.running) {
      throw new Error('KiloCode non initialisé');
    }

    // Écrire le message dans le pipe d'entrée
    writeFileSync(this.inputPipe, JSON.stringify({ type: 'user', content: message }) + '\n');

    // Lire la réponse depuis le pipe de sortie
    // Note: Dans un vrai implémentation, il faudrait un watcher sur le pipe
    await new Promise(resolve => setTimeout(resolve, 3000));

    return { status: 'sent', message };
  }

  async cleanup() {
    try {
      await unlink(this.inputPipe);
      await unlink(this.outputPipe);
      console.log('✅ Pipes nettoyés');
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error.message);
    }
  }
}

// Test
async function testFIFO() {
  console.log('🧪 TEST: Pipes FIFO (KiloCode)');
  console.log('==============================\n');

  const kf = new KiloCodeFIFO();

  try {
    await kf.init();

    console.log('\n📤 Envoi message 1');
    await kf.send('Mon nom est Claude');

    console.log('\n📤 Envoi message 2');
    await kf.send('Quel est mon nom?');

    await kf.cleanup();

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testFIFO().catch(console.error);
