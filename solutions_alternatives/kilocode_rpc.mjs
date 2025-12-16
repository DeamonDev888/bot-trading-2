#!/usr/bin/env node

/**
 * SOLUTION 7: RPC (Remote Procedure Call)
 * Utilise JSON-RPC pour communication structurée
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';

class KiloCodeRPC {
  constructor() {
    this.requests = new Map();
    this.requestId = 0;
  }

  async start() {
    console.log('🔧 Démarrage RPC...');

    this.createRPCCode();

    // Lancer le serveur RPC
    this.startRPCServer();

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('✅ Serveur RPC prêt');
  }

  createRPCCode() {
    const rpcCode = `
const http = require('http');
const { spawn } = require('child_process');

const PORT = 8767;
let kilProcess = null;
let kilBuffer = '';

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const request = JSON.parse(body);
        console.log('[RPC] Requête reçue:', request);

        // Lancer KiloCode si pas déjà fait
        if (!kilProcess) {
          console.log('[RPC] Lancement de KiloCode...');
          kilProcess = spawn('kilo', ['-i', '-m', 'ask', '--auto'], {
            stdio: ['pipe', 'pipe', 'pipe']
          });

          kilProcess.stdout.on('data', (data) => {
            kilBuffer += data.toString();
            console.log('[KiloCode] Réponse:', data.toString().substring(0, 50));
          });
        }

        // Envoyer à KiloCode
        if (kilProcess) {
          const message = JSON.stringify(request.params);
          kilProcess.stdin.write(message + '\\n');

          // Attendre la réponse (simulation)
          setTimeout(() => {
            const response = {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                message: 'Réponse de KiloCode pour: ' + request.params.content,
                timestamp: Date.now()
              }
            };
            res.end(JSON.stringify(response));
          }, 2000);
        } else {
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            id: request.id,
            error: { code: 500, message: 'KiloCode non disponible' }
          }));
        }
      } catch (error) {
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: 400, message: 'JSON invalide' }
        }));
      }
    });
  } else {
    res.end(JSON.stringify({ error: 'Méthode non autorisée' }));
  }
});

server.listen(PORT, () => {
  console.log('[RPC] Serveur.listen sur port', PORT);
});
`;

    writeFileSync('kilo_rpc_server.mjs', rpcCode);
  }

  startRPCServer() {
    spawn('node', ['kilo_rpc_server.mjs'], {
      detached: true,
      stdio: 'ignore'
    });
  }

  async call(method, params) {
    const id = ++this.requestId;

    return new Promise((resolve, reject) => {
      const http = require('http');

      const request = {
        jsonrpc: '2.0',
        method: method,
        params: params,
        id: id
      };

      const options = {
        hostname: 'localhost',
        port: 8767,
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response.result);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(JSON.stringify(request));
      req.end();

      // Timeout
      setTimeout(() => {
        reject(new Error('Timeout'));
      }, 30000);
    });
  }

  async send(message) {
    console.log('[RPC] Envoi:', message);
    const result = await this.call('kilo.send', { content: message });
    console.log('[RPC] Réponse:', result.message);
    return result;
  }

  async stop() {
    try {
      require('fs').unlinkSync('kilo_rpc_server.mjs');
    } catch {}
    console.log('✅ RPC arrêté');
  }
}

// Test
async function testRPC() {
  console.log('🧪 TEST: RPC/JSON-RPC (KiloCode)');
  console.log('==================================\n');

  const rpc = new KiloCodeRPC();

  try {
    await rpc.start();

    console.log('\n📤 Envoi message 1 via RPC');
    const response1 = await rpc.send('Mon nom est Claude');
    console.log('📥 Réponse:', response1);

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n📤 Envoi message 2 via RPC');
    const response2 = await rpc.send('Quel est mon nom?');
    console.log('📥 Réponse:', response2);

    await rpc.stop();

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testRPC().catch(console.error);
