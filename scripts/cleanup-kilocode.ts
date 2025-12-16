#!/usr/bin/env ts-node

/**
 * Script de nettoyage des instances KiloCode résiduelles
 * TypeScript version
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🧹 Nettoyage des instances KiloCode résiduelles...');

interface ProcessInfo {
  pid: number;
  name: string;
  command?: string;
}

class KiloCodeCleaner {
  private isWindows: boolean;

  constructor() {
    this.isWindows = process.platform === 'win32';
    console.log(`🖥️  Plateforme détectée: ${this.isWindows ? 'Windows' : 'Linux/Mac'}`);
  }

  /**
   * Tue toutes les instances KiloCode sur Windows
   */
  private async killKiloCodeWindows(): Promise<void> {
    console.log('🪠 Recherche des processus KiloCode sur Windows...');

    try {
      // Tuer les processus kilocode.exe
      try {
        const { stdout } = await execAsync('tasklist /fi "imagename eq kilocode.exe" /fo csv | find "kilocode.exe"', {
          encoding: 'utf8',
          shell: true
        });

        if (stdout.trim()) {
          console.log('💀 Instances KiloCode.exe trouvées, suppression en cours...');
          await execAsync('taskkill /f /im kilocode.exe', { shell: true });
          console.log('✅ Instances KiloCode.exe supprimées');
        } else {
          console.log('✅ Aucune instance KiloCode.exe trouvée');
        }
      } catch (error) {
        console.log('✅ Aucune instance KiloCode.exe trouvée');
      }

      // Tuer les processus node.exe qui utilisent KiloCode
      try {
        const { stdout } = await execAsync('wmic process where "name=\'node.exe\' and commandline like \'%kilocode%\'" get processid /format:value', {
          encoding: 'utf8',
          shell: true
        });

        if (stdout.includes('ProcessId')) {
          const pids = stdout.match(/ProcessId=(\d+)/g);
          if (pids) {
            console.log(`💀 ${pids.length} processus Node+KiloCode trouvés, suppression...`);
            for (const pidMatch of pids) {
              const pid = pidMatch.split('=')[1];
              await execAsync(`taskkill /f /pid ${pid}`, { shell: true });
            }
            console.log('✅ Processus Node+KiloCode supprimés');
          }
        } else {
          console.log('✅ Aucun processus Node+KiloCode trouvé');
        }
      } catch (error) {
        console.log('✅ Aucun processus Node+KiloCode trouvé');
      }

    } catch (error) {
      console.error('❌ Erreur lors du nettoyage Windows:', error);
    }
  }

  /**
   * Tue toutes les instances KiloCode sur Linux/Mac
   */
  private async killKiloCodeUnix(): Promise<void> {
    console.log('🪠 Recherche des processus KiloCode sur Linux/Mac...');

    try {
      // Chercher les processus KiloCode
      try {
        const { stdout } = await execAsync('pgrep -f kilocode', { encoding: 'utf8' });
        if (stdout.trim()) {
          const pids = stdout.trim().split('\n');
          console.log(`💀 ${pids.length} processus KiloCode trouvés, suppression...`);
          await execAsync('pkill -f kilocode', { shell: true });
          await execAsync('pkill -f "node.*kilocode"', { shell: true });
          console.log('✅ Processus KiloCode supprimés');
        } else {
          console.log('✅ Aucune instance KiloCode trouvée');
        }
      } catch (error) {
        console.log('✅ Aucune instance KiloCode trouvée');
      }

      // Chercher aussi avec ps
      try {
        const { stdout } = await execAsync('ps aux | grep -i kilocode | grep -v grep', { encoding: 'utf8' });
        if (stdout.trim()) {
          const lines = stdout.trim().split('\n');
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length > 1) {
              const pid = parseInt(parts[1]);
              if (!isNaN(pid)) {
                console.log(`💀 Suppression du processus PID ${pid}`);
                await execAsync(`kill -9 ${pid}`, { shell: true }).catch(() => {});
              }
            }
          }
        }
      } catch (error) {
        console.log('✅ Aucun processus KiloCode additionnel trouvé');
      }

    } catch (error) {
      console.error('❌ Erreur lors du nettoyage Unix:', error);
    }
  }

  /**
   * Nettoie les fichiers temporaires
   */
  private async cleanupTempFiles(): Promise<void> {
    try {
      console.log('🗑️  Nettoyage des fichiers temporaires...');

      const fs = await import('fs/promises');
      const path = await import('path');

      // Lister les fichiers PID et .lock
      const files = await fs.readdir('.').catch(() => []);
      const tempFiles = files.filter((file: string) =>
        file.endsWith('.pid') ||
        file.endsWith('.lock') ||
        file.includes('kilocode') ||
        file.includes('nova_bot')
      );

      if (tempFiles.length > 0) {
        console.log(`🗑️  Suppression de ${tempFiles.length} fichiers temporaires:`);
        for (const file of tempFiles) {
          try {
            await fs.unlink(file);
            console.log(`   🗑️  ${file} supprimé`);
          } catch (error) {
            console.log(`   ⚠️  Impossible de supprimer ${file}`);
          }
        }
      } else {
        console.log('✅ Aucun fichier temporaire à nettoyer');
      }

    } catch (error) {
      console.log('ℹ️  Erreur lors du nettoyage des fichiers temporaires:', error);
    }
  }

  /**
   * Nettoie les ports utilisés par KiloCode
   */
  private async cleanupPorts(): Promise<void> {
    try {
      console.log('🔌 Nettoyage des ports utilisés...');

      if (this.isWindows) {
        // Vérifier les ports en écoute sur Windows
        try {
          const { stdout } = await execAsync('netstat -ano | findstr LISTENING', {
            encoding: 'utf8',
            shell: true
          });

          const lines = stdout.split('\n');
          const relevantPorts = lines.filter((line: string) =>
            line.includes('0.0.0.0:') || line.includes('127.0.0.1:')
          );

          console.log(`🔌 ${relevantPorts.length} ports trouvés`);
        } catch (error) {
          console.log('ℹ️  Impossible de vérifier les ports');
        }
      } else {
        // Vérifier les ports sur Linux/Mac
        try {
          const { stdout } = await execAsync('lsof -i :3000-3100 2>/dev/null || netstat -tlnp | grep :300', {
            encoding: 'utf8',
            shell: true
          });

          if (stdout.trim()) {
            console.log('🔌 Ports trouvés:', stdout.substring(0, 200));
          }
        } catch (error) {
          console.log('ℹ️  Aucun port pertinent trouvé');
        }
      }

    } catch (error) {
      console.log('ℹ️  Erreur lors du nettoyage des ports:', error);
    }
  }

  /**
   * Fonction principale de nettoyage
   */
  async cleanup(): Promise<void> {
    console.log('🚀 Démarrage du nettoyage KiloCode...');

    try {
      // 1. Tuer les processus
      if (this.isWindows) {
        await this.killKiloCodeWindows();
      } else {
        await this.killKiloCodeUnix();
      }

      // 2. Attendre que les processus se terminent
      console.log('⏳ Attente de la terminaison des processus...');
      await this.sleep(3000);

      // 3. Nettoyer les fichiers temporaires
      await this.cleanupTempFiles();

      // 4. Nettoyer les ports
      await this.cleanupPorts();

      // 5. Vérification finale
      console.log('🔍 Vérification finale...');
      await this.verifyCleanup();

      console.log('✅ Nettoyage terminé avec succès !');
      console.log('🎯 Prêt à démarrer une nouvelle instance KiloCode propre');

    } catch (error) {
      console.error('❌ Erreur lors du nettoyage:', error);
      process.exit(1);
    }
  }

  /**
   * Vérifie que le nettoyage a bien fonctionné
   */
  private async verifyCleanup(): Promise<void> {
    try {
      if (this.isWindows) {
        const { stdout } = await execAsync('tasklist /fi "imagename eq kilocode.exe" | find "kilocode.exe"', {
          encoding: 'utf8',
          shell: true
        });

        if (stdout.trim()) {
          console.log('⚠️  Attention: des processus KiloCode sont toujours actifs');
        } else {
          console.log('✅ Aucun processus KiloCode résiduel détecté');
        }
      } else {
        try {
          await execAsync('pgrep -f kilocode', { encoding: 'utf8' });
          console.log('⚠️  Attention: des processus KiloCode sont toujours actifs');
        } catch (error) {
          console.log('✅ Aucun processus KiloCode résiduel détecté');
        }
      }
    } catch (error) {
      console.log('✅ Vérification terminée');
    }
  }

  /**
   * Utilitaire pour attendre
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Point d'entrée principal
async function main(): Promise<void> {
  const cleaner = new KiloCodeCleaner();
  await cleaner.cleanup();
}

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non capturée:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Rejet non géré:', reason);
  process.exit(1);
});

// Lancer le nettoyage
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Erreur lors du nettoyage:', error);
    process.exit(1);
  });
}