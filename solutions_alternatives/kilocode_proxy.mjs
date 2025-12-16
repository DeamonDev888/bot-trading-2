#!/usr/bin/env node

/**
 * SOLUTION 2: Proxy/Middleware
 * Utilise un processus intermediaire qui maintient l'état
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';

class KiloCodeProxy {
  constructor() {
    this.proxyPort = 8765;
    this.messages = [];
    this.currentSession = null;
    this.proxyProcess = null;
  }

  async start() {
    console.log(`🔧 Démarrage du proxy sur le port ${this.proxyPort}...`);

    // Créer le script proxy
    this.createProxyScript();

    // Lancer le proxy
    this.proxyProcess = spawn('node', ['proxy_server.mjs'], {
      stdio: 'pipe'
    });

    this.proxyProcess.stdout.on('data', (data) => {
      console.log('[Proxy]', data.toString());
    });

    // Attendre que le proxy soit prêt
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('✅ Proxy démarré');
  }

  createProxyScript() {
    const proxyCode = `
const net = require('net');
const { spawn } = require('child_process');

const PORT = ${this.proxyPort};
let kilProcess = null;
let sessionId = null;

const server = net.createServer((socket) => {
  console.log('[Proxy] Client connecté');

  // Lancer KiloCode au premier message
  if (!kilProcess) {
    console.log('[Proxy] Lancement de KiloCode...');
    kilProcess = spawn('kilo', ['-i', '-m', 'ask', '--auto'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    kilProcess.stdout.on('data', (data) => {
      const response = data.toString();
      socket.write(response);
      console.log('[Proxy] Réponse KiloCode:', response.substring(0, 50));
    });

    kilProcess.stderr.on('data', (data) => {
      console.log('[Proxy] Debug:', data.toString());
    });
  }

  socket.on('data', (data) => {
    const message = data.toString();
    console.log('[Proxy] Message reçu:', message);

    if (kilProcess) {
      kilProcess.stdin.write(message);
    }
  });

  socket.on('end', () => {
    console.log('[Proxy] Client déconnecté');
  });
});

server.listen(PORT, () => {
  console.log('[Proxy] Serveur.listen sur port', PORT);
});
`;

    writeFileSync('proxy_server.mjs', proxyCode);
  }

  async send(message) {
    return new Promise((resolve, reject) => {
      const net = require('net');
      const client = net.createConnection({ port: this.proxyPort }, () => {
        console.log('[Client] Connecté au proxy');
        client.write(JSON.stringify({ type: 'user', content: message }) + '\n');
      });

      let response = '';

      client.on('data', (data) => {
        response += data.toString();
      });

      client.on('end', () => {
        console.log('[Client] Déconnecté');
        resolve(response);
      });

      client.on('error', (error) => {
        console.error('[Client] Erreur:', error.message);
        reject(error);
      });

      // Timeout après 30 secondes
      setTimeout(() => {
        client.destroy();
        reject(new Error('Timeout'));
      }, 30000);
    });
  }

  async stop() {
    if (this.proxyProcess) {
      this.proxyProcess.kill();
    }

    try {
      require('fs').unlinkSync('proxy_server.mjs');
    } catch {}

    console.log('✅ Proxy arrêté');
  }
}

// Test
async function testProxy() {
  console.log('🧪 TEST: Proxy/Middleware (KiloCode)');
  console.log('====================================\n');

  const proxy = new KiloCodeProxy();

  try {
    await proxy.start();

    console.log('\n📤 Envoi message 1 via proxy');
    const response1 = await proxy.send('Mon nom est Claude via proxy');
    console.log('📥 Réponse:', response1.substring(0, 100));

    console.log('\n📤 Envoi message 2 via proxy');
    const response2 = await proxy.send('Quel est mon nom?');
    console.log('📥 Réponse:', response2.substring(0, 100));

    await proxy.stop();

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testProxy().catch(console.error);
