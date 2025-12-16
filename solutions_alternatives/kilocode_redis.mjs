#!/usr/bin/env node

/**
 * SOLUTION 4: Redis Queue
 * Utilise Redis pour communication persistante via pub/sub
 */

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

class KiloCodeRedis {
  constructor() {
    this.channel = 'kilo_code_channel';
    this.redisAvailable = false;
  }

  async checkRedis() {
    return new Promise((resolve) => {
      const redis = require('redis');
      const client = redis.createClient();

      client.on('error', (err) => {
        console.log('⚠️ Redis non disponible:', err.message);
        this.redisAvailable = false;
        resolve(false);
      });

      client.on('ready', () => {
        console.log('✅ Redis disponible');
        this.redisAvailable = true;
        client.quit();
        resolve(true);
      });
    });
  }

  async start() {
    console.log('🔧 Vérification de Redis...');
    await this.checkRedis();

    if (!this.redisAvailable) {
      console.log('⚠️ Redis non disponible, simulation...');
      return this.simulateRedis();
    }

    console.log('🚀 Lancement avec Redis...');
    return this.startWithRedis();
  }

  async startWithRedis() {
    const redis = require('redis');
    const subscriber = redis.createClient();
    const publisher = redis.createClient();

    // Lancer KiloCode
    const kilProcess = spawn('kilo', ['-i', '-m', 'ask', '--auto'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Souscrire au channel
    await subscriber.subscribe(this.channel);

    subscriber.on('message', (channel, message) => {
      console.log('[Redis] Message reçu:', message);
      if (kilProcess) {
        kilProcess.stdin.write(message + '\n');
      }
    });

    // Écouter les réponses de KiloCode
    let buffer = '';
    kilProcess.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        console.log('[KiloCode] Réponse:', line.substring(0, 50));
        publisher.publish(this.channel, JSON.stringify({
          type: 'response',
          data: line,
          timestamp: Date.now()
        }));
      }
    });

    // Envoyer un message test
    await publisher.publish(this.channel, JSON.stringify({
      type: 'user',
      content: 'Mon nom est Claude via Redis'
    }));

    setTimeout(() => {
      subscriber.quit();
      publisher.quit();
      kilProcess.kill();
    }, 10000);
  }

  simulateRedis() {
    console.log('🧪 SIMULATION REDIS (sans Redis réel)\n');

    // Créer un script de simulation
    const simCode = `
const EventEmitter = require('events');

class SimulatedRedis extends EventEmitter {
  constructor() {
    super();
    this.messages = [];
  }

  publish(channel, message) {
    console.log('[SimRedis] Publication:', message.substring(0, 50));
    this.messages.push({ channel, message, timestamp: Date.now() });
    this.emit('message', channel, message);
  }

  subscribe(channel) {
    console.log('[SimRedis] Abonné au channel:', channel);
    setTimeout(() => {
      this.emit('message', channel, JSON.stringify({
        type: 'user',
        content: 'Test message from simulated Redis'
      }));
    }, 1000);
  }

  quit() {
    console.log('[SimRedis] Déconnexion');
  }
}

const redis = new SimulatedRedis();

// Simuler KiloCode
const { spawn } = require('child_process');
const kil = spawn('kilo', ['-i', '-m', 'ask', '--auto'], { stdio: 'pipe' });

kil.stdout.on('data', (data) => {
  console.log('[KiloCode] Réponse:', data.toString().substring(0, 50));
});

kil.stderr.on('data', (data) => {
  console.log('[KiloCode] Debug:', data.toString().trim());
});

redis.on('message', (channel, message) => {
  console.log('[SimRedis] Redirection vers KiloCode:', message);
  kil.stdin.write(message + '\\n');
});

setTimeout(() => {
  kil.kill();
  console.log('\\n✅ Simulation terminée');
  process.exit(0);
}, 10000);
`;

    writeFileSync('simulate_redis.js', simCode);

    // Exécuter la simulation
    const { exec } = require('child_process');
    exec('node simulate_redis.js', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Erreur simulation:', error.message);
      }
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);

      // Nettoyer
      require('fs').unlinkSync('simulate_redis.js');
    });
  }
}

// Test
async function testRedis() {
  console.log('🧪 TEST: Redis Queue (KiloCode)');
  console.log('================================\n');

  const kc = new KiloCodeRedis();
  await kc.start();
}

testRedis().catch(console.error);
