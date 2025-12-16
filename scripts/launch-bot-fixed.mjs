#!/usr/bin/env node

/**
 * Bot Launcher - Version ES Modules JavaScript
 * Support des arguments -z et -m pour charger différentes configurations
 * Support des arguments --force et --no-force pour gérer les instances multiples
 *
 * Utilisation:
 *   pnpm bot                    # Lance le bot (redémarrage forcé par défaut)
 *   pnpm bot -z                 # Lance le bot avec settingsZ.json
 *   pnpm bot -m                 # Lance le bot avec settingsM.json
 *   pnpm bot --force            # Force le redémarrage si instance existe
 *   pnpm bot --no-force         # Refuse de démarrer si instance existe
 *   pnpm bot -z --force         # Combine profil et redémarrage forcé
 *
 * Les profils permettent de charger différentes configurations KiloCode/Claude:
 *   - settingsZ.json: Configuration avec ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
 *   - settingsM.json: Configuration avec ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic
 *
 * Comportement:
 *   - Par défaut: Si une instance existe, elle est tuée et remplacée
 *   - Avec --no-force: Refuse de démarrer si une instance existe
 *   - Avec --force: Force le redémarrage (identique au défaut)
 */

import { spawn, exec } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

class BotLauncher extends EventEmitter {
  constructor(profile = null, forceRestart = true) {
    super();
    this.botProcess = null;
    this.isShuttingDown = false;
    this.profile = profile;
    this.forceRestart = forceRestart;
    this.profileEnv = {};

    // Enhanced instance checking - kill any existing sniper bot processes immediately
    this.enforceSingleInstance();
  }

  /**
   * Force single instance - Kill any existing sniper bot processes
   */
  async enforceSingleInstance() {
    try {
      const isWindows = process.platform === 'win32';

      if (isWindows) {
        // Kill any Node processes that might be sniper bots
        try {
          await execAsync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq *sniper*" 2>nul || echo "No sniper processes found"');
          await execAsync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq *discord*" 2>nul || echo "No discord processes found"');
        } catch (e) {
          // Ignore errors
        }
      }

      // Remove stale PID file
      try {
        await fs.unlink(this.config.pidFile);
      } catch (e) {
        // PID file doesn't exist, that's fine
      }

      this.log('🧹 Enforced single instance - killed any existing processes');
    } catch (error) {
      this.log('⚠️ Error enforcing single instance:', error.message);
    }
  }

  this.config = {
      scriptPath: path.resolve('dist/discord_bot/sniper_financial_bot.js'),
      pidFile: path.resolve('sniper_bot.pid'),
      logFile: path.resolve('bot-launcher.log'),
      claudeConfigPath: path.resolve('.claude'),
      settingsFile: null
    };

    // Déterminer le fichier de configuration à utiliser
    if (this.profile === 'z') {
      this.config.settingsFile = path.join(this.config.claudeConfigPath, 'settingsZ.json');
    } else if (this.profile === 'm') {
      this.config.settingsFile = path.join(this.config.claudeConfigPath, 'settingsM.json');
    }

    console.log('🚀 Bot Launcher initialisé');
    console.log(`📂 Script cible: ${this.config.scriptPath}`);
    if (this.profile) {
      console.log(`⚙️  Profil: ${this.profile} (${this.config.settingsFile})`);
    }
    console.log(`🔄 Redémarrage forcé: ${this.forceRestart ? 'Activé' : 'Désactivé'}`);
  }

  /**
   * Charge la configuration depuis le fichier settings
   */
  async loadProfileConfig() {
    if (!this.config.settingsFile) {
      console.log('ℹ️  Aucun profil spécifié, utilisation de la configuration par défaut');
      return {};
    }

    try {
      console.log(`📖 Chargement de la configuration: ${this.config.settingsFile}`);
      const configData = await fs.readFile(this.config.settingsFile, 'utf-8');
      const config = JSON.parse(configData);

      // Extraire les variables d'environnement du profil
      if (config.env && typeof config.env === 'object') {
        console.log('✅ Configuration chargée avec succès');
        console.log(`🔑 Variables d'environnement trouvées: ${Object.keys(config.env).length}`);

        // Log des variables importantes (sans exposer les tokens complets)
        if (config.env.ANTHROPIC_AUTH_TOKEN) {
          const tokenPreview = config.env.ANTHROPIC_AUTH_TOKEN.substring(0, 10) + '...';
          console.log(`🔐 Token anthropique: ${tokenPreview}`);
        }
        if (config.env.ANTHROPIC_BASE_URL) {
          console.log(`🌐 Base URL: ${config.env.ANTHROPIC_BASE_URL}`);
        }
        if (config.env.ANTHROPIC_MODEL) {
          console.log(`🤖 Modèle: ${config.env.ANTHROPIC_MODEL}`);
        }

        return config.env;
      } else {
        console.log('⚠️  Aucune section "env" trouvée dans la configuration');
        return {};
      }
    } catch (error) {
      console.error(`❌ Erreur lors du chargement de la configuration: ${error.message}`);
      if (error.code === 'ENOENT') {
        console.error(`📄 Fichier non trouvé: ${this.config.settingsFile}`);
      }
      return {};
    }
  }

  /**
   * Nettoyage des instances KiloCode et des bots Discord
   */
  async cleanupKiloCode() {
    console.log('🧹 Nettoyage des processus résiduels...');

    try {
      const isWindows = process.platform === 'win32';

      if (isWindows) {
        // ====== NETTOYAGE WINDOWS ======
        console.log('🖥️  Nettoyage Windows...');

        // 1. Tuer les processus KiloCode
        try {
          await execAsync('taskkill /f /im kilocode.exe 2>nul', { shell: true });
          console.log('✅ Processus kilocode.exe terminés');
        } catch {
          console.log('ℹ️ Aucun processus kilocode.exe trouvé');
        }

        // 2. Tuer les processus Node.js liés à KiloCode
        try {
          await execAsync('wmic process where "name=\'node.exe\' and commandline like \'%kilocode%\'" delete 2>nul', { shell: true });
          console.log('✅ Processus Node+KiloCode terminés');
        } catch {
          console.log('ℹ️ Aucun processus Node+KiloCode trouvé');
        }

        // 3. NOUVEAU: Tuer les processus bot Discord (sniper_financial_bot)
        try {
          await execAsync('taskkill /f /im "sniper_financial_bot.js" 2>nul', { shell: true });
          console.log('✅ Processus sniper_financial_bot.js terminés');
        } catch {
          console.log('ℹ️ Aucun processus sniper_financial_bot.js trouvé');
        }

        // 4. NOUVEAU: Tuer les processus Node.js exécutant le bot
        try {
          await execAsync('wmic process where "name=\'node.exe\' and (commandline like \'%sniper_financial_bot%\' or commandline like \'%DiscordChatBot%\' or commandline like \'%ClaudeChatBot%\')" delete 2>nul', { shell: true });
          console.log('✅ Processus Node+DiscordBot terminés');
        } catch {
          console.log('ℹ️ Aucun processus Node+DiscordBot trouvé');
        }

        // 5. Nettoyer les processus orphans liés au projet
        try {
          await execAsync('wmic process where "name=\'node.exe\' and commandline like \'%financial analyst%\'" delete 2>nul', { shell: true });
          console.log('✅ Processus orphans du projet terminés');
        } catch {
          console.log('ℹ️ Aucun processus orphan trouvé');
        }

      } else {
        // ====== NETTOYAGE LINUX/MAC ======
        console.log('🐧 Nettoyage Linux/Mac...');

        // 1. Tuer les processus KiloCode
        try {
          await execAsync('pkill -f kilocode 2>/dev/null || true');
          console.log('✅ Processus KiloCode terminés');
        } catch {
          console.log('ℹ️ Aucun processus KiloCode trouvé');
        }

        // 2. Tuer les processus bot Discord
        try {
          await execAsync('pkill -f "sniper_financial_bot" 2>/dev/null || true');
          console.log('✅ Processus sniper_financial_bot terminés');
        } catch {
          console.log('ℹ️ Aucun processus sniper_financial_bot trouvé');
        }

        // 3. Tuer les processus DiscordChatBotAgent
        try {
          await execAsync('pkill -f "DiscordChatBotAgent" 2>/dev/null || true');
          console.log('✅ Processus DiscordChatBotAgent terminés');
        } catch {
          console.log('ℹ️ Aucun processus DiscordChatBotAgent trouvé');
        }

        // 4. Tuer les processus ClaudeChatBotAgent
        try {
          await execAsync('pkill -f "ClaudeChatBotAgent" 2>/dev/null || true');
          console.log('✅ Processus ClaudeChatBotAgent terminés');
        } catch {
          console.log('ℹ️ Aucun processus ClaudeChatBotAgent trouvé');
        }

        // 5. Tuer les processus Node.js du projet
        try {
          await execAsync('pkill -f "financial analyst" 2>/dev/null || true');
          console.log('✅ Processus du projet terminés');
        } catch {
          console.log('ℹ️ Aucun processus du projet trouvé');
        }
      }

      // Attendre un peu pour que les processus se terminent proprement
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('✅ Nettoyage complet terminé');

    } catch (error) {
      console.error('❌ Erreur lors du nettoyage:', error.message);
    }
  }

  /**
   * Vérifie si le bot est déjà en cours d'exécution
   */
  async checkExistingInstance() {
    try {
      const pidContent = await fs.readFile(this.config.pidFile, 'utf-8');
      const pid = parseInt(pidContent.trim());

      if (isNaN(pid)) {
        return false;
      }

      // Vérifier si le processus existe
      try {
        process.kill(pid, 0);
        console.log(`⚠️  Le bot est déjà en cours d'exécution (PID: ${pid})`);
        return { exists: true, pid };
      } catch {
        // Le processus n'existe plus
        await fs.unlink(this.config.pidFile).catch(() => {});
        return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Tuer une instance existante du bot
   */
  async killExistingInstance(pid) {
    console.log(`🔫 Tentative de terminaison du processus ${pid}...`);

    try {
      const isWindows = process.platform === 'win32';

      if (isWindows) {
        // Windows: utiliser taskkill
        await execAsync(`taskkill /f /pid ${pid} 2>nul`, { shell: true });
      } else {
        // Linux/Mac: utiliser kill
        await execAsync(`kill -9 ${pid} 2>/dev/null || true`);
      }

      // Attendre un peu
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Vérifier si le processus est vraiment terminé
      try {
        process.kill(pid, 0);
        console.log(`⚠️  Le processus ${pid} est toujours en cours d'exécution`);
        return false;
      } catch {
        console.log(`✅ Processus ${pid} terminé avec succès`);
        return true;
      }
    } catch (error) {
      console.error(`❌ Erreur lors de la terminaison du processus ${pid}:`, error.message);
      return false;
    }
  }

  /**
   * Sauvegarde le PID du processus
   */
  async savePid(pid) {
    try {
      await fs.writeFile(this.config.pidFile, pid.toString(), 'utf-8');
      console.log(`💾 PID du bot sauvegardé: ${pid}`);
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde du PID:', error);
    }
  }

  /**
   * Log les messages avec timestamp
   */
  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);

    // Écrire dans le fichier de log
    fs.appendFile(this.config.logFile, logMessage + '\n').catch(() => {});
  }

  /**
   * Démarre le bot avec nettoyage préalable
   */
  async start() {
    try {
      this.log('🚀 Démarrage du Sniper Financial Bot...');

      // 1. Charger la configuration du profil si spécifié
      this.profileEnv = await this.loadProfileConfig();

      // 2. Nettoyer les instances KiloCode et DiscordBot résiduelles
      await this.cleanupKiloCode();

      // 3. Vérifier si une instance existe déjà via le fichier PID
      const existingInstance = await this.checkExistingInstance();

      if (existingInstance && existingInstance.exists) {
        if (this.forceRestart) {
          this.log(`⚠️  Une instance existe déjà (PID: ${existingInstance.pid}), redémarrage forcé activé`);
          await this.killExistingInstance(existingInstance.pid);
          // Supprimer le fichier PID
          await fs.unlink(this.config.pidFile).catch(() => {});
          this.log('🗑️  Fichier PID supprimé');
        } else {
          this.log('❌ Une instance du bot est déjà en cours d\'exécution (redémarrage forcé désactivé)');
          this.log(`💡 Utilisez l'option --force pour forcer le redémarrage`);
          process.exit(1);
          return;
        }
      }

      // 4. Configurer les gestionnaires de signaux
      this.setupSignalHandlers();

      // 5. Démarrer le bot
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
  async launchBot() {
    this.log('🤖 Lancement du processus du bot...');

    return new Promise((resolve, reject) => {
      // Vérifier que le fichier compilé existe
      fs.access(this.config.scriptPath)
        .then(() => {
          console.log('📋 Lancement du script:', this.config.scriptPath);

          // Préparer les variables d'environnement
          const botEnv = {
            ...process.env,
            FORCE_PERSISTENT_KILO: 'true'
          };

          // Appliquer les variables du profil si elles existent
          if (this.profileEnv && Object.keys(this.profileEnv).length > 0) {
            console.log('🔧 Application des variables d\'environnement du profil...');
            Object.assign(botEnv, this.profileEnv);
          }

          // Ajouter les variables spécifiques pour ClaudeChatBotAgent
          if (this.profile) {
            botEnv.CLAUDE_PROFILE = this.profile;
            botEnv.CLAUDE_CONFIG_FILE = this.config.settingsFile;
            console.log(`🎯 Variables ClaudeChatBotAgent: CLAUDE_PROFILE=${this.profile}, CLAUDE_CONFIG_FILE=${this.config.settingsFile}`);
          }

          this.botProcess = spawn('node', [this.config.scriptPath], {
            stdio: ['inherit', 'pipe', 'pipe'],
            shell: false,
            env: botEnv
          });

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

  /**
   * Configure les gestionnaires de signaux pour l'arrêt propre
   */
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

  /**
   * Arrêt propre du bot
   */
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

  /**
   * Nettoie les ressources
   */
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

// Point d'entrée principal
async function main() {
  console.log('🎯 Initialisation du Bot Launcher...');

  // Parser les arguments de ligne de commande
  const args = process.argv.slice(2);
  let profile = null;
  let forceRestart = true; // Par défaut, on force le redémarrage

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-z') {
      profile = 'z';
      console.log('📌 Profil Z détecté');
    } else if (arg === '-m') {
      profile = 'm';
      console.log('📌 Profil M détecté');
    } else if (arg === '--force' || arg === '-f') {
      forceRestart = true;
      console.log('🔄 Redémarrage forcé activé');
    } else if (arg === '--no-force' || arg === '-n') {
      forceRestart = false;
      console.log('🔒 Redémarrage forcé désactivé (refusera si instance existe)');
    }
  }

  const launcher = new BotLauncher(profile, forceRestart);

  // Gérer les redémarrages automatiques
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

  // Démarrer le bot
  await launcher.start();
}

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non capturée:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Rejet non géré:', reason);
  process.exit(1);
});

// Lancer le launcher
main().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});