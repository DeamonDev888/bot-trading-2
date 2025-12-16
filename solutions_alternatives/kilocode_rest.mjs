#!/usr/bin/env node

/**
 * SOLUTION 8: REST API Gateway
 * Créé une API REST qui encapsule KiloCode
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';

class KiloCodeREST {
  constructor() {
    this.port = 8768;
    this.messages = [];
    this.process = null;
  }

  async start() {
    console.log('🔧 Démarrage REST API...');

    this.createRESTCode();

    // Lancer le serveur REST
    this.startRESTServer();

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('✅ API REST prête sur port', this.port);
  }

  createRESTCode() {
    const restCode = `
const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();
const PORT = ${this.port};

app.use(cors());
app.use(express.json());

let kilProcess = null;
let sessionActive = false;

app.post('/api/kilo/start', (req, res) => {
  if (!sessionActive) {
    console.log('[REST] Démarrage de KiloCode...');
    kilProcess = spawn('kilo', ['-i', '-m', 'ask', '--auto'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let buffer = '';
    kilProcess.stdout.on('data', (data) => {
      buffer += data.toString();
      console.log('[KiloCode] Réponse:', data.toString().substring(0, 50));
    });

    kilProcess.stderr.on('data', (data) => {
      console.log('[KiloCode] Debug:', data.toString().trim());
    });

    sessionActive = true;
    res.json({ status: 'started', message: 'KiloCode démarré' });
  } else {
    res.json({ status: 'active', message: 'KiloCode déjà actif' });
  }
});

app.post('/api/kilo/send', (req, res) => {
  const { message } = req.body;

  if (!sessionActive) {
    return res.status(400).json({ error: 'KiloCode non démarré' });
  }

  console.log('[REST] Envoi message:', message);

  if (kilProcess) {
    const jsonMessage = JSON.stringify({ type: 'user', content: message });
    kilProcess.stdin.write(jsonMessage + '\\n');

    // Simulation de réponse
    setTimeout(() => {
      res.json({
        status: 'success',
        response: 'Réponse simulée pour: ' + message,
        timestamp: Date.now()
      });
    }, 2000);
  } else {
    res.status(500).json({ error: 'KiloCode non disponible' });
  }
});

app.get('/api/kilo/status', (req, res) => {
  res.json({
    active: sessionActive,
    uptime: process.uptime(),
    pid: process.pid
  });
});

app.post('/api/kilo/stop', (req, res) => {
  if (kilProcess) {
    kilProcess.kill();
    sessionActive = false;
    console.log('[REST] KiloCode arrêté');
  }
  res.json({ status: 'stopped' });
});

app.listen(PORT, () => {
  console.log('[REST] Serveur.listen sur port', PORT);
});
`;

    writeFileSync('kilo_rest_server.mjs', restCode);

    // Créer package.json pour les dépendances
    const pkg = {
      name: 'kilo-rest-server',
      version: '1.0.0',
      dependencies: {
        express: '^4.18.0',
        cors: '^2.8.0'
      }
    };

    writeFileSync('kilo_rest_package.json', JSON.stringify(pkg, null, 2));
  }

  startRESTServer() {
    spawn('bash', ['-c', 'npm install express cors > /dev/null 2>&1 && node kilo_rest_server.mjs > /tmp/kilo_rest.log 2>&1 &']);
  }

  async send(message) {
    const http = require('http');

    return new Promise((resolve, reject) => {
      const data = JSON.stringify({ message: message });

      const options = {
        hostname: 'localhost',
        port: this.port,
        path: '/api/kilo/send',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      };

      const req = http.request(options, (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            resolve(response);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(data);
      req.end();

      // Timeout
      setTimeout(() => {
        reject(new Error('Timeout'));
      }, 30000);
    });
  }

  async stop() {
    const http = require('http');
    const req = http.request({
      hostname: 'localhost',
      port: this.port,
      path: '/api/kilo/stop',
      method: 'POST'
    }, (res) => {
      res.on('data', () => {});
    });

    req.end();

    // Nettoyer les fichiers
    try { require('fs').unlinkSync('kilo_rest_server.mjs'); } catch {}
    try { require('fs').unlinkSync('kilo_rest_package.json'); } catch {}

    console.log('✅ REST API arrêtée');
  }
}

// Test
async function testREST() {
  console.log('🧪 TEST: REST API Gateway (KiloCode)');
  console.log('=====================================\n');

  const rest = new KiloCodeREST();

  try {
    await rest.start();

    console.log('\n📤 Envoi message 1 via REST API');
    const response1 = await rest.send('Mon nom est Claude');
    console.log('📥 Réponse:', response1.response);

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n📤 Envoi message 2 via REST API');
    const response2 = await rest.send('Quel est mon nom?');
    console.log('📥 Réponse:', response2.response);

    await rest.stop();

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testREST().catch(console.error);
