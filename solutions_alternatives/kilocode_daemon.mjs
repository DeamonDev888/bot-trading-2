#!/usr/bin/env node

/**
 * SOLUTION 5: Daemon/Service Persistant
 * Lance KiloCode comme un service qui reste en vie
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { createInterface } from 'readline';

class KiloCodeDaemon {
  constructor() {
    this.pidFile = '/tmp/kilo_daemon.pid';
    this.socketFile = '/tmp/kilo_daemon.sock';
    this.process = null;
    this.running = false;
  }

  async start() {
    console.log('🔧 Démarrage du daemon KiloCode...');

    // Vérifier si déjà en cours
    if (this.isRunning()) {
      console.log('⚠️ Daemon déjà en cours d\'exécution');
      return this.connect();
    }

    // Créer le script daemon
    this.createDaemonScript();

    // Lancer en arrière-plan
    this.launchDaemon();

    // Attendre que le daemon soit prêt
    await new Promise(resolve => setTimeout(resolve, 2000));

    this.running = true;
    console.log('✅ Daemon démarré (PID:', this.getPID(), ')');
  }

  createDaemonScript() {
    const daemonCode = `
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');

const PID_FILE = '${this.pidFile}';
const SOCKET_FILE = '${this.socketFile}';

// Écrire le PID
fs.writeFileSync(PID_FILE, process.pid.toString());

// Créer le socket Unix
const server = net.createServer((socket) => {
  console.log('[Daemon] Client connecté');

  // Lancer KiloCode si pas déjà fait
  let kilProcess = null;

  socket.on('data', (data) => {
    const message = data.toString().trim();
    console.log('[Daemon] Message:', message);

    if (!kilProcess) {
      console.log('[Daemon] Lancement de KiloCode...');
      kilProcess = spawn('kilo', ['-i', '-m', 'ask', '--auto'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let buffer = '';
      kilProcess.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          console.log('[Daemon] Réponse KiloCode:', line.substring(0, 50));
          socket.write(line + '\\n');
        }
      });

      kilProcess.stderr.on('data', (data) => {
        console.log('[Daemon] KiloCode debug:', data.toString().trim());
      });
    }

    if (kilProcess) {
      kilProcess.stdin.write(message + '\\n');
    }
  });

  socket.on('end', () => {
    console.log('[Daemon] Client déconnecté');
  });
});

// Nettoyer à l'arrêt
process.on('SIGINT', () => {
  console.log('[Daemon] Arrêt...');
  try { fs.unlinkSync(PID_FILE); } catch {}
  try { fs.unlinkSync(SOCKET_FILE); } catch {}
  process.exit(0);
});

// Démarrer le serveur
server.listen(SOCKET_FILE, () => {
  console.log('[Daemon] Serveur prêt sur', SOCKET_FILE);
});
`;

    writeFileSync('kilo_daemon_server.mjs', daemonCode);
  }

  launchDaemon() {
    // Lancer en arrière-plan
    spawn('bash', ['-c', 'node kilo_daemon_server.mjs > /tmp/kilo_daemon.log 2>&1 &']);
  }

  isRunning() {
    try {
      const pid = readFileSync(this.pidFile, 'utf8').trim();
      return process.kill(pid, 0) === true;
    } catch {
      return false;
    }
  }

  getPID() {
    try {
      return readFileSync(this.pidFile, 'utf8').trim();
    } catch {
      return null;
    }
  }

  async connect() {
    const net = require('net');
    const client = net.createConnection({ path: this.socketFile });

    return new Promise((resolve, reject) => {
      client.on('connect', () => {
        console.log('[Daemon] Connecté au daemon');
        resolve(client);
      });

      client.on('error', (error) => {
        console.error('[Daemon] Erreur connexion:', error.message);
        reject(error);
      });
    });
  }

  async send(message) {
    const client = await this.connect();

    return new Promise((resolve, reject) => {
      let response = '';

      client.on('data', (data) => {
        response += data.toString();
      });

      client.on('end', () => {
        resolve(response);
      });

      client.write(message + '\n');

      // Timeout
      setTimeout(() => {
        client.destroy();
        reject(new Error('Timeout'));
      }, 30000);
    });
  }

  async stop() {
    if (this.isRunning()) {
      const pid = this.getPID();
      process.kill(parseInt(pid), 'SIGTERM');
      console.log('✅ Daemon arrêté');
    }

    // Nettoyer les fichiers
    try { require('fs').unlinkSync(this.pidFile); } catch {}
    try { require('fs').unlinkSync(this.socketFile); } catch {}
    try { require('fs').unlinkSync('kilo_daemon_server.mjs'); } catch {}
  }
}

// Test
async function testDaemon() {
  console.log('🧪 TEST: Daemon/Service (KiloCode)');
  console.log('===================================\n');

  const daemon = new KiloCodeDaemon();

  try {
    await daemon.start();

    console.log('\n📤 Envoi message 1 via daemon');
    const response1 = await daemon.send('Mon nom est Claude');
    console.log('📥 Réponse:', response1.substring(0, 100));

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n📤 Envoi message 2 via daemon');
    const response2 = await daemon.send('Quel est mon nom?');
    console.log('📥 Réponse:', response2.substring(0, 100));

    await daemon.stop();

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testDaemon().catch(console.error);
