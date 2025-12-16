#!/usr/bin/env node

/**
 * SOLUTION 3: WebSocket Server
 * Utilise WebSockets pour communication persistante
 */

import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

class KiloCodeWebSocket {
  constructor() {
    this.port = 8766;
    this.kilProcess = null;
    this.clients = [];
  }

  async start() {
    console.log(`🔧 Démarrage du serveur WebSocket sur le port ${this.port}...`);

    // Créer le serveur HTTP de base
    const server = createServer();

    // Créer le serveur WebSocket
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws) => {
      console.log('[WS] Client connecté');
      this.clients.push(ws);

      ws.on('message', (message) => {
        console.log('[WS] Message reçu:', message.toString());
        this.handleMessage(message.toString());
      });

      ws.on('close', () => {
        console.log('[WS] Client déconnecté');
        this.clients = this.clients.filter(c => c !== ws);
      });

      ws.send(JSON.stringify({ type: 'connected', message: 'Connecté au serveur KiloCode' }));
    });

    // Lancer KiloCode
    await this.startKiloCode();

    // Démarrer le serveur
    server.listen(this.port, () => {
      console.log('✅ Serveur WebSocket démarré sur port', this.port);
    });
  }

  async startKiloCode() {
    console.log('🚀 Lancement de KiloCode...');

    this.kilProcess = spawn('kilo', ['-i', '-m', 'ask', '--auto'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let buffer = '';

    this.kilProcess.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        console.log('[KiloCode] Réponse:', line.substring(0, 50));
        this.broadcast({ type: 'response', data: line });
      }
    });

    this.kilProcess.stderr.on('data', (data) => {
      console.log('[KiloCode] Debug:', data.toString());
    });

    this.kilProcess.on('error', (error) => {
      console.error('[KiloCode] Erreur:', error.message);
      this.broadcast({ type: 'error', error: error.message });
    });

    console.log('✅ KiloCode lancé');
  }

  handleMessage(message) {
    if (this.kilProcess) {
      console.log('[WS] Envoi à KiloCode:', message);
      this.kilProcess.stdin.write(message + '\n');
    }
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    this.clients.forEach(client => {
      try {
        client.send(message);
      } catch (error) {
        console.error('[WS] Erreur envoi:', error.message);
      }
    });
  }

  async stop() {
    if (this.kilProcess) {
      this.kilProcess.kill();
    }
    console.log('✅ Serveur arrêté');
  }
}

// Test simple sans serveur
async function testWebSocketClient() {
  console.log('🧪 TEST: WebSocket Client (KiloCode)');
  console.log('====================================\n');

  // Créer un serveur simple pour test
  const kc = new KiloCodeWebSocket();

  try {
    await kc.start();

    // Simuler un client
    console.log('\n📤 Test: Simulation d\'envoi de message');
    kc.handleMessage('Mon nom est Claude');

    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n📤 Test: Deuxième message');
    kc.handleMessage('Quel est mon nom?');

    await new Promise(resolve => setTimeout(resolve, 5000));

    await kc.stop();

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testWebSocketClient().catch(console.error);
