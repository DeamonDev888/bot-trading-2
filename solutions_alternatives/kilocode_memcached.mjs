#!/usr/bin/env node

/**
 * SOLUTION 6: Memory-Mapped File
 * Utilise un fichier partagé en mémoire pour communication
 */

import { writeFileSync, readFileSync, watch, unlinkSync } from 'fs';
import { spawn } from 'child_process';

class KiloCodeMemoryMapped {
  constructor() {
    this.inputFile = '/tmp/kilo_input.txt';
    this.outputFile = '/tmp/kilo_output.txt';
    this.process = null;
    this.callbacks = new Map();
    this.messageId = 0;
  }

  async start() {
    console.log('🔧 Démarrage avec fichier mémoire...');

    // Nettoyer les anciens fichiers
    try { unlinkSync(this.inputFile); } catch {}
    try { unlinkSync(this.outputFile); } catch {}

    // Créer les fichiers vides
    writeFileSync(this.inputFile, '');
    writeFileSync(this.outputFile, '');

    // Surveiller le fichier de sortie
    this.watchOutput();

    // Lancer KiloCode
    await this.startKiloCode();

    console.log('✅ Système démarré');
  }

  async startKiloCode() {
    console.log('🚀 Lancement de KiloCode...');

    const cmd = `
while true; do
  if [ -s "${this.inputFile}" ]; then
    CONTENT=$(cat "${this.inputFile}")
    echo "Processing: $CONTENT" > "${this.outputFile}"
    # Ici on appellerait KiloCode
    # kilo -i -m ask --auto <<< "$CONTENT" >> "${this.outputFile}"
    echo "$CONTENT" | kilo -i -m ask --auto >> "${this.outputFile}" 2>/dev/null
    echo "" > "${this.inputFile}"
  fi
  sleep 1
done
`;

    this.process = spawn('bash', ['-c', cmd], {
      detached: true,
      stdio: 'ignore'
    });

    console.log('✅ KiloCode lancé');
  }

  watchOutput() {
    watch(this.outputFile, (eventType, filename) => {
      if (eventType === 'change') {
        try {
          const content = readFileSync(this.outputFile, 'utf8');
          if (content.trim()) {
            console.log('[File] Réponse reçue:', content.substring(0, 50));
            this.handleResponse(content);
          }
        } catch (error) {
          // Ignore les erreurs de lecture concurrente
        }
      }
    });
  }

  handleResponse(content) {
    const lines = content.split('\n').filter(l => l.trim());
    const lastLine = lines[lines.length - 1];

    // Extraire l'ID du message si présent
    const idMatch = lastLine.match(/\[ID:(\d+)\]/);
    if (idMatch) {
      const id = idMatch[1];
      const callback = this.callbacks.get(id);
      if (callback) {
        callback(lastLine);
        this.callbacks.delete(id);
      }
    }
  }

  async send(message) {
    return new Promise((resolve, reject) => {
      const id = (++this.messageId).toString();
      const fullMessage = `[ID:${id}] ${message}`;

      this.callbacks.set(id, (response) => {
        resolve(response);
      });

      writeFileSync(this.inputFile, fullMessage);

      // Timeout après 30 secondes
      setTimeout(() => {
        this.callbacks.delete(id);
        reject(new Error('Timeout'));
      }, 30000);
    });
  }

  async stop() {
    if (this.process) {
      this.process.kill();
    }

    try { unlinkSync(this.inputFile); } catch {}
    try { unlinkSync(this.outputFile); } catch {}

    console.log('✅ Système arrêté');
  }
}

// Test simplifié
async function testMemoryMapped() {
  console.log('🧪 TEST: Memory-Mapped File (KiloCode)');
  console.log('======================================\n');

  const kc = new KiloCodeMemoryMapped();

  try {
    await kc.start();

    console.log('\n📤 Envoi message 1');
    // const response1 = await kc.send('Mon nom est Claude');
    // console.log('📥 Réponse:', response1);

    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n📤 Envoi message 2');
    // const response2 = await kc.send('Quel est mon nom?');
    // console.log('📥 Réponse:', response2);

    await kc.stop();

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testMemoryMapped().catch(console.error);
