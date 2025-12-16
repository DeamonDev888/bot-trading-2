#!/usr/bin/env node

/**
 * Gestionnaire du bot Nova Financial
 * Usage: node manage_bot.mjs [start|stop|status|run|run_publisher]
 */

import { spawn } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const BOT_SCRIPT = 'src/discord_bot/sniper_financial_bot.ts';
const PID_FILE = 'nova_bot.pid';

async function executeCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Exécution: ${command}`);

    // On utilise npx tsx pour exécuter le fichier TypeScript directement
    const process = spawn('npx', ['tsx', BOT_SCRIPT, command], {
      stdio: 'inherit',
      shell: true
    });

    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Commande "${command}" terminée avec succès`);
        resolve(true);
      } else {
        console.log(`❌ Commande "${command}" terminée avec erreur ${code}`);
        reject(new Error(`Process exited with code ${code}`));
      }
    });

    process.on('error', (error) => {
      console.error(`❌ Erreur: ${error.message}`);
      reject(error);
    });
  });
}

async function getPid() {
  try {
    const fs = await import('fs/promises');
    if (await fs.access(PID_FILE).catch(() => false)) {
      const pid = await fs.readFile(PID_FILE, 'utf-8');
      return parseInt(pid.trim());
    }
    return null;
  } catch (_error) {
    return null;
  }
}

async function savePid(pid) {
  try {
    const fs = await import('fs/promises');
    await fs.writeFile(PID_FILE, pid.toString(), 'utf-8');
    console.log(`💾 PID ${pid} sauvegardé`);
  } catch (_error) {
    console.error(`❌ Erreur sauvegarde PID: ${_error.message}`);
  }
}

async function removePid() {
  try {
    const fs = await import('fs/promises');
    await fs.unlink(PID_FILE);
    console.log(`🗑️ Fichier PID supprimé`);
  } catch (error) {
    console.error(`❌ Erreur suppression PID: ${error.message}`);
  }
}

function checkChannels() {
  const channels = [
    { key: 'DISCORD_CHANNEL_ID', label: 'Principal' },
    { key: 'DISCORD_CHANNEL_IA', label: 'Intelligence Artificielle' },
    { key: 'DISCORD_CHANNEL_FINANCE', label: 'Finance & Marchés' },
    { key: 'DISCORD_CHANNEL_LOGS', label: 'Logs Système' }
  ];

  console.log('\n📡 Configuration des Salons Discord (.env) :');
  let definedCount = 0;

  channels.forEach(({ key, label }) => {
    const value = process.env[key];
    if (value) {
      console.log(`   ✅ ${label.padEnd(25)} : ${value}`);
      definedCount++;
    } else {
      console.log(`   ⚠️ ${label.padEnd(25)} : Non configuré (${key})`);
    }
  });
  console.log('');
}

async function showStatus() {
  const pid = await getPid();

  if (pid) {
    try {
      process.kill(pid, 0); // Signal 0 pour vérifier si le processus existe
      console.log(`✅ Bot Nova en cours d'exécution (PID: ${pid})`);
      return true;
    } catch (error) {
      console.log(`❌ Bot Nova non démarré (PID: ${pid} introuvable)`);
      return false;
    }
  } else {
    console.log('❌ Bot Nova non démarré');
    return false;
  }
}

async function main() {
  const command = process.argv[2];

  if (!command) {
    console.log(`
🤖 Nova Bot Manager - Usage:
  node manage_bot.mjs [commande]

Commandes disponibles:
  start          - Démarrer le bot Nova
  stop           - Arrêter le bot Nova
  status         - Vérifier le status du bot
  check          - Vérifier la configuration (.env)
  run            - Forcer l'exécution d'un cron job
  run_publisher  - Lancer manuellement la publication des news

Exemples:
  node manage_bot.mjs start
  node manage_bot.mjs status
  node manage_bot.mjs run_publisher
    `);
    process.exit(1);
  }

  try {
    switch (command.toLowerCase()) {
      case 'start': {
        console.log('\n🚀 Démarrage du bot Nova...');
        checkChannels();
        // Note: Pour start, on voudrait peut-être le lancer en background,
        // mais ici on garde le comportement simple pour l'instant
        await executeCommand('start');
        break;
      }

      case 'stop':
        console.log('\n🛑 Arrêt du bot Nova...');
        const pid = await getPid();
        if (pid) {
          process.kill(pid, 'SIGINT');
          await removePid();
          console.log('✅ Bot Nova arrêté');
        } else {
          console.log('❌ Bot Nova non démarré');
        }
        break;

      case 'status':
        console.log('\n📊 Vérification du status...');
        checkChannels();
        const isRunning = await showStatus();
        if (isRunning) {
          console.log('✅ Bot Nova: EN FONCTION');
        } else {
          console.log('❌ Bot Nova: NON DÉMARRÉ');
        }
        break;

      case 'run': {
        const jobName = process.argv[3];
        if (!jobName) {
          console.log('❌ Veuillez spécifier un nom de cron job (ex: x_scraper, cleanup)');
          process.exit(1);
        }

        console.log(`\n🔄 Forçage du cron job: ${jobName}...`);
        await executeCommand('run');
        break;
      }

      case 'run_publisher': {
        console.log('\n📰 Lancement du SimplePublisher via le bot...');
        checkChannels();
        await executeCommand('run_publisher');
        break;
      }

      case 'check':
        checkChannels();
        break;

      default:
        console.log(`❌ Commande inconnue: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    process.exit(1);
  }
}

main();