#!/usr/bin/env node

/**
 * Script de nettoyage des instances KiloCode résiduelles
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🧹 Nettoyage des instances KiloCode résiduelles...');

async function killKiloCodeInstances() {
  try {
    // Windows
    if (process.platform === 'win32') {
      console.log('🪠 Recherche des processus KiloCode sur Windows...');

      // Tuer les processus kilocode.exe
      try {
        const { stdout } = await execAsync('tasklist /fi "imagename eq kilocode.exe" /fo csv | find "kilocode.exe"', {
          encoding: 'utf8',
          shell: true
        });

        if (stdout.trim()) {
          console.log('💀 KiloCode instances found, killing...');
          await execAsync('taskkill /f /im kilocode.exe', { shell: true });
          console.log('✅ KiloCode.exe instances tuées');
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
            console.log(`💀 Found ${pids.length} Node+KiloCode processes, killing...`);
            for (const pidMatch of pids) {
              const pid = pidMatch.split('=')[1];
              await execAsync(`taskkill /f /pid ${pid}`, { shell: true });
            }
            console.log('✅ Node+KiloCode processes tués');
          }
        }
      } catch (error) {
        console.log('✅ Aucun processus Node+KiloCode trouvé');
      }

    } else {
      // Linux/Mac
      console.log('🪠 Recherche des processus KiloCode sur Linux/Mac...');

      try {
        const { stdout } = await execAsync('pgrep -f kilocode', { encoding: 'utf8' });
        if (stdout.trim()) {
          const pids = stdout.trim().split('\n');
          console.log(`💀 Found ${pids.length} KiloCode processes, killing...`);
          await execAsync(`pkill -f kilocode`, { shell: true });
          console.log('✅ KiloCode processes tués');
        } else {
          console.log('✅ Aucune instance KiloCode trouvée');
        }
      } catch (error) {
        console.log('✅ Aucune instance KiloCode trouvée');
      }
    }

    // Attendre un peu pour que les processus se terminent
    await new Promise(resolve => setTimeout(resolve, 2000));

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  }
}

async function cleanupTempFiles() {
  try {
    console.log('🗑️  Nettoyage des fichiers temporaires...');

    // Nettoyer les fichiers PID
    if (process.platform === 'win32') {
      await execAsync('del /f *.pid 2>nul', { shell: true });
    } else {
      await execAsync('rm -f *.pid 2>/dev/null', { shell: true });
    }

    console.log('✅ Fichiers temporaires nettoyés');
  } catch (error) {
    console.log('ℹ️  Pas de fichiers temporaires à nettoyer');
  }
}

async function main() {
  console.log('🚀 Démarrage du nettoyage KiloCode...');

  await killKiloCodeInstances();
  await cleanupTempFiles();

  console.log('✅ Nettoyage terminé !');
  console.log('🎯 Prêt à démarrer une nouvelle instance KiloCode propre');
}

main().catch(console.error);