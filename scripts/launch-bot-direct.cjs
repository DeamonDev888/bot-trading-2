#!/usr/bin/env node

/**
 * Bot Launcher - Version JavaScript directe
 */

const { spawn } = require('child_process');
const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class BotLauncher extends EventEmitter {
  constructor() {
    super();
    this.botProcess = null;
    this.isShuttingDown = false;

    this.config = {
      scriptPath: path.resolve('dist/discord_bot/sniper_financial_bot.js'),
      pidFile: path.resolve('nova_bot.pid'),
      logFile: path.resolve('bot-launcher.log')
    };

    console.log('🚀 Bot Launcher initialisé');
    console.log(`📂 Script cible: ${this.config.scriptPath}`);
  }

  async cleanupKiloCode() {
    console.log('🧹 Nettoyage des instances KiloCode résiduelles...');

    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);

      const isWindows = process.platform === 'win32';

      if (isWindows) {
        try {
          await execAsync('taskkill /f /im kilocode.exe', { shell: true });
          console.log('✅ Processus kilocode.exe terminés');
        } catch {
          console.log('ℹ️ Aucun processus kilocode.exe trouvé');
        }

        try {
          await execAsync('wmic process where "name=\'node.exe\' and commandline like \'%kilocode%\'" delete', { shell: true });
          console.log('✅ Processus Node+KiloCode terminés');
        } catch {
          console.log('ℹ️ Aucun processus Node+KiloCode trouvé');
        }
      } else {
        try {
          await execAsync('pkill -f kilocode', { shell: true });
          console.log('✅ Processus KiloCode terminés');
        } catch {
          console.log('ℹ️ Aucun processus KiloCode trouvé');
        }
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ Nettoyage KiloCode terminé');
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage KiloCode:', error);
    }
  }

  async checkExistingInstance() {
    try {
      const pidContent = await fs.readFile(this.config.pidFile, 'utf-8');
      const pid = parseInt(pidContent.trim());

      if (isNaN(pid)) {
        return false;
      }

      try {
        process.kill(pid, 0);
        console.log(`⚠️  Le bot est déjà en cours d'exécution (PID: ${pid})`);
        return true;
      } catch {
        await fs.unlink(this.config.pidFile);
        return false;
      }
    } catch {
      return false;
    }
  }

  async savePid(pid) {
    try {
      await fs.writeFile(this.config.pidFile, pid.toString(), 'utf-8');
      console.log(`💾 PID du bot sauvegardé: ${pid}`);
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde du PID:', error);
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);

    fs.appendFile(this.config.logFile, logMessage + '\n').catch(() => {});
  }

  async start() {
    try {
      this.log('🚀 Démarrage du Sniper Financial Bot...');

      if (await this.checkExistingInstance()) {
        this.log('❌ Une instance du bot est déjà en cours d\'exécution');
        process.exit(1);
        return;
      }

      await this.cleanupKiloCode();
      this.setupSignalHandlers();
      await this.launchBot();

      this.log('✅ Bot démarré avec succès');

    } catch (error) {
      this.log(`❌ Erreur lors du démarrage: ${error}`);
      process.exit(1);
    }
  }

  async launchBot() {
    this.log('🤖 Lancement du processus du bot...');

    return new Promise((resolve, reject) => {
      fs.access(this.config.scriptPath)
        .then(() => {
          console.log('📋 Lancement du script:', this.config.scriptPath);

          this.botProcess = spawn('node', [this.config.scriptPath], {
            stdio: ['inherit', 'pipe', 'pipe'],
            shell: false,
            env: {
              ...process.env,
              FORCE_PERSISTENT_KILO: 'true'
            }
          });

          this.botProcess.on('spawn', () => {
            this.log(`✅ Processus bot démarré (PID: ${this.botProcess?.pid})`);
            if (this.botProcess?.pid) {
              this.savePid(this.botProcess.pid);
            }
            resolve();
          });

          if (this.botProcess.stdout) {
            this.botProcess.stdout.on('data', (data) => {
              const output = data.toString();
              console.log(output);
            });
          }

          if (this.botProcess.stderr) {
            this.botProcess.stderr.on('data', (data) => {
              const output = data.toString();
              console.error(output);
            });
          }

          this.botProcess.on('close', (code, signal) => {
            this.log(`🛑 Processus bot terminé (code: ${code}, signal: ${signal})`);

            if (!this.isShuttingDown) {
              this.log('⚠️  Le bot s\'est arrêté inattendument');
              this.emit('unexpected-stop', { code, signal });
            }

            this.cleanup();
          });

          this.botProcess.on('error', (error) => {
            this.log(`❌ Erreur processus bot: ${error.message}`);
            reject(error);
          });

        })
        .catch(() => {
          reject(new Error(`Fichier du bot non trouvé: ${this.config.scriptPath}`));
        });
    });
  }

  setupSignalHandlers() {
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

    signals.forEach((signal) => {
      process.on(signal, () => {
        this.log(`🛑 Signal ${signal} reçu, arrêt propre en cours...`);
        this.gracefulShutdown();
      });
    });

    process.on('uncaughtException', (error) => {
      this.log(`❌ Erreur non capturée: ${error.message}`);
      this.gracefulShutdown(1);
    });

    process.on('unhandledRejection', (reason) => {
      this.log(`❌ Rejet non géré: ${reason}`);
      this.gracefulShutdown(1);
    });
  }

  async gracefulShutdown(exitCode = 0) {
    if (this.isShuttingDown) {
      this.log('⚠️  Arrêt déjà en cours...');
      return;
    }

    this.isShuttingDown = true;
    this.log('🔄 Arrêt propre du bot...');

    try {
      if (this.botProcess && !this.botProcess.killed) {
        this.log('📤 Envoi du signal SIGTERM au bot...');
        this.botProcess.kill('SIGTERM');

        const timeout = setTimeout(() => {
          this.log('⏱️  Timeout, force de l\'arrêt...');
          if (this.botProcess && !this.botProcess.killed) {
            this.botProcess.kill('SIGKILL');
          }
        }, 10000);

        await new Promise((resolve) => {
          if (this.botProcess) {
            this.botProcess.on('close', () => {
              clearTimeout(timeout);
              resolve();
            });
          } else {
            clearTimeout(timeout);
            resolve();
          }
        });
      }

      await this.cleanup();
      this.log('✅ Arrêt propre terminé');
      process.exit(exitCode);

    } catch (error) {
      this.log(`❌ Erreur lors de l'arrêt propre: ${error}`);
      process.exit(1);
    }
  }

  async cleanup() {
    this.botProcess = null;
    try {
      await fs.unlink(this.config.pidFile);
      console.log('🗑️  Fichier PID supprimé');
    } catch {
      // Le fichier n'existe probablement pas
    }
  }
}

async function main() {
  console.log('🎯 Initialisation du Bot Launcher...');

  const launcher = new BotLauncher();

  launcher.on('unexpected-stop', ({ code, signal }) => {
    console.log(`🔄 Le bot s'est arrêté inattendument (code: ${code}, signal: ${signal})`);

    setTimeout(() => {
      console.log('🔄 Tentative de redémarrage...');
      launcher.start().catch((error) => {
        console.error('❌ Erreur lors du redémarrage:', error);
        process.exit(1);
      });
    }, 5000);
  });

  await launcher.start();
}

process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non capturée:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Rejet non géré:', reason);
  process.exit(1);
});

main().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});