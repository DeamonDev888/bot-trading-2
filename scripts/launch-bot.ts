#!/usr/bin/env ts-node

/**
 * Bot Launcher avec nettoyage et démarrage persistant KiloCode
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

interface BotConfig {
  scriptPath: string;
  pidFile: string;
  logFile: string;
}

class BotLauncher extends EventEmitter {
  private botProcess: ChildProcess | null = null;
  private config: BotConfig;
  private isShuttingDown = false;

  constructor() {
    super();
    this.config = {
      scriptPath: path.resolve('dist/discord_bot/sniper_financial_bot.js'),
      pidFile: path.resolve('nova_bot.pid'),
      logFile: path.resolve('bot-launcher.log')
    };
  }

  /**
   * Nettoie les instances KiloCode résiduelles
   */
  private async cleanupKiloCode(): Promise<void> {
    console.log('🧹 Nettoyage des instances KiloCode résiduelles...');

    try {
      const { spawn } = await import('child_process');

      // Lancer le script de nettoyage
      const cleanupProcess = spawn('npx', ['ts-node', 'scripts/cleanup-kilocode.ts'], {
        stdio: 'inherit',
        shell: true,
        cwd: process.cwd()
      });

      await new Promise<void>((resolve, reject) => {
        cleanupProcess.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Cleanup failed with code ${code}`));
          }
        });

        cleanupProcess.on('error', reject);
      });

      console.log('✅ Nettoyage KiloCode terminé');
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage KiloCode:', error);
      throw error;
    }
  }

  /**
   * Vérifie si le bot est déjà en cours d'exécution
   */
  private async checkExistingInstance(): Promise<boolean> {
    try {
      const pidContent = await fs.readFile(this.config.pidFile, 'utf-8');
      const pid = parseInt(pidContent.trim());

      if (isNaN(pid)) {
        return false;
      }

      // Vérifier si le processus existe
      try {
        process.kill(pid, 0); // Signal 0 ne tue pas le processus, vérifie juste s'il existe
        console.log(`⚠️  Le bot est déjà en cours d'exécution (PID: ${pid})`);
        return true;
      } catch {
        // Le processus n'existe plus, on peut nettoyer le fichier PID
        await fs.unlink(this.config.pidFile);
        return false;
      }
    } catch {
      // Pas de fichier PID
      return false;
    }
  }

  /**
   * Sauvegarde le PID du processus
   */
  private async savePid(pid: number): Promise<void> {
    try {
      await fs.writeFile(this.config.pidFile, pid.toString(), 'utf-8');
      console.log(`💾 PID du bot sauvegardé: ${pid}`);
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde du PID:', error);
    }
  }

  /**
   * Supprime le fichier PID
   */
  private async removePid(): Promise<void> {
    try {
      await fs.unlink(this.config.pidFile);
      console.log('🗑️  Fichier PID supprimé');
    } catch {
      // Le fichier n'existe probablement pas
    }
  }

  /**
   * Log les messages avec timestamp
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);

    // Écrire dans le fichier de log
    fs.appendFile(this.config.logFile, logMessage + '\n').catch(() => {});
  }

  /**
   * Démarre le bot avec nettoyage préalable
   */
  async start(): Promise<void> {
    try {
      this.log('🚀 Démarrage du Sniper Financial Bot...');

      // 1. Vérifier si une instance existe déjà
      if (await this.checkExistingInstance()) {
        this.log('❌ Une instance du bot est déjà en cours d\'exécution');
        process.exit(1);
      }

      // 2. Nettoyer les instances KiloCode résiduelles
      await this.cleanupKiloCode();

      // 3. Configurer les gestionnaires de signaux pour l'arrêt propre
      this.setupSignalHandlers();

      // 4. Démarrer le bot
      await this.launchBot();

      this.log('✅ Bot démarré avec succès');

    } catch (error) {
      this.log(`❌ Erreur lors du démarrage: ${error}`);
      process.exit(1);
    }
  }

  /**
   * Démarre le processus du bot
   */
  private async launchBot(): Promise<void> {
    this.log('🤖 Lancement du processus du bot...');

    return new Promise<void>((resolve, reject) => {
      // Vérifier que le fichier compilé existe
      fs.access(this.config.scriptPath)
        .then(() => {
          this.botProcess = spawn('node', [this.config.scriptPath], {
            stdio: ['inherit', 'pipe', 'pipe'],
            shell: false,
            env: {
              ...process.env,
              FORCE_PERSISTENT_KILO: 'true' // Forcer le mode persistant
            }
          });

          // Gérer la sortie du processus
          this.botProcess.on('spawn', () => {
            this.log(`✅ Processus bot démarré (PID: ${this.botProcess?.pid})`);
            if (this.botProcess?.pid) {
              this.savePid(this.botProcess.pid);
            }
            resolve();
          });

          // Rediriger les logs
          if (this.botProcess.stdout) {
            this.botProcess.stdout.on('data', (data) => {
              const output = data.toString();
              console.log(output);
              this.log(`[BOT STDOUT] ${output.trim()}`);
            });
          }

          if (this.botProcess.stderr) {
            this.botProcess.stderr.on('data', (data) => {
              const output = data.toString();
              console.error(output);
              this.log(`[BOT STDERR] ${output.trim()}`);
            });
          }

          // Gérer la fin du processus
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
          reject(new Error(`Fichier du bot non trouvé: ${this.config.scriptPath}. Veuillez compiler avec "npm run build"`));
        });
    });
  }

  /**
   * Configure les gestionnaires de signaux pour l'arrêt propre
   */
  private setupSignalHandlers(): void {
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

    signals.forEach((signal) => {
      process.on(signal, () => {
        this.log(`🛑 Signal ${signal} reçu, arrêt propre en cours...`);
        this.gracefulShutdown();
      });
    });

    // Gérer les erreurs non capturées
    process.on('uncaughtException', (error) => {
      this.log(`❌ Erreur non capturée: ${error.message}`);
      this.gracefulShutdown(1);
    });

    process.on('unhandledRejection', (reason) => {
      this.log(`❌ Rejet non géré: ${reason}`);
      this.gracefulShutdown(1);
    });
  }

  /**
   * Arrêt propre du bot
   */
  private async gracefulShutdown(exitCode: number = 0): Promise<void> {
    if (this.isShuttingDown) {
      this.log('⚠️  Arrêt déjà en cours...');
      return;
    }

    this.isShuttingDown = true;
    this.log('🔄 Arrêt propre du bot...');

    try {
      // 1. Envoyer SIGTERM au bot pour un arrêt propre
      if (this.botProcess && !this.botProcess.killed) {
        this.log('📤 Envoi du signal SIGTERM au bot...');
        this.botProcess.kill('SIGTERM');

        // Attendre que le processus se termine
        const timeout = setTimeout(() => {
          this.log('⏱️  Timeout, force de l\'arrêt...');
          if (this.botProcess && !this.botProcess.killed) {
            this.botProcess.kill('SIGKILL');
          }
        }, 10000);

        await new Promise<void>((resolve) => {
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

      // 2. Nettoyer KiloCode
      this.log('🧹 Nettoyage final de KiloCode...');
      await this.cleanupKiloCode();

      // 3. Nettoyer les ressources
      await this.cleanup();

      this.log('✅ Arrêt propre terminé');
      process.exit(exitCode);

    } catch (error) {
      this.log(`❌ Erreur lors de l'arrêt propre: ${error}`);
      process.exit(1);
    }
  }

  /**
   * Nettoie les ressources
   */
  private async cleanup(): Promise<void> {
    this.botProcess = null;
    await this.removePid();
  }

  /**
   * Force l'arrêt du bot
   */
  async stop(): Promise<void> {
    this.log('🛑 Arrêt forcé du bot...');
    await this.gracefulShutdown();
  }
}

// Point d'entrée principal
async function main(): Promise<void> {
  const launcher = new BotLauncher();

  // Gérer les redémarrages automatiques en cas d'arrêt inattendu
  launcher.on('unexpected-stop', ({ code, signal }) => {
    console.log(`🔄 Le bot s'est arrêté inattendument (code: ${code}, signal: ${signal})`);

    // Attendre avant de redémarrer
    setTimeout(() => {
      console.log('🔄 Tentative de redémarrage...');
      launcher.start().catch((error) => {
        console.error('❌ Erreur lors du redémarrage:', error);
        process.exit(1);
      });
    }, 5000);
  });

  // Démarrer le bot
  await launcher.start();
}

// Lancer le launcher
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
}