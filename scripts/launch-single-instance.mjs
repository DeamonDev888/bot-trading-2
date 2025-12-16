#!/usr/bin/env node

/**
 * Enhanced Bot Launcher with Single Instance Enforcement
 * Kills any existing sniper bot processes before starting
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

class SingleInstanceBotLauncher {
  constructor() {
    this.botProcess = null;
    this.pidFile = path.resolve('sniper_bot.pid');
  }

  /**
   * Kill all existing sniper bot processes
   */
  async killAllSniperBots() {
    console.log('🧹 Killing all existing Sniper bot processes...');

    const isWindows = process.platform === 'win32';

    try {
      if (isWindows) {
        // Kill any Node processes that might be related to sniper bots
        await execAsync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq *sniper*" 2>nul || echo No sniper processes');
        await execAsync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq *discord*" 2>nul || echo No discord processes');
        await execAsync('wmic process where "commandline like \'%sniper_financial_bot%\'" delete 2>nul || echo No sniper processes in commandline');
      }
    } catch (error) {
      // Ignore errors - command might not find any processes
    }

    // Remove PID file
    try {
      await fs.unlink(this.pidFile);
    } catch (error) {
      // PID file might not exist
    }

    console.log('✅ Cleanup completed');
  }

  /**
   * Start the bot
   */
  async start(profile = null) {
    // First, enforce single instance
    await this.killAllSniperBots();

    console.log('🚀 Starting Sniper Financial Bot - 100% PERSISTANT MODE (NO FALLBACKS)');

    // Set up environment variables if profile specified
    const env = { ...process.env };

    // Ensure npm PATH is available for claude command
    const npmPath = process.platform === 'win32'
        ? `${process.env.APPDATA}\\npm`
        : `${process.env.HOME}/.npm-global/bin`;

    // Ensure Node.js PATH is available
    const nodePath = process.platform === 'win32'
        ? `${process.env.ProgramFiles}\\nodejs`
        : '/usr/local/bin';

    // Add both npm and node paths
    const pathsToAdd = [npmPath, nodePath].filter(p => p && p !== 'undefined');
    if (env.PATH) {
        env.PATH = `${pathsToAdd.join(';')};${env.PATH}`;
    } else {
        env.PATH = pathsToAdd.join(';');
    }

    console.log(`🔧 Added to PATH: ${pathsToAdd.join(', ')}`);

    if (profile) {
      console.log(`⚙️  Profile: ${profile}`);

      if (profile === 'm') {
        // Profil M: MiniMax optimisé pour mode persistant 100%
        const settingsFile = path.resolve(`.claude/settingsM.json`);
        const fallbackSettings = path.resolve(`.claude/settingsM_backup.json`);
        const agentsFile = path.resolve(`.claude/agents/discord-agent-simple.json`);
        env.CLAUDE_PROFILE = profile;
        env.CLAUDE_SETTINGS_PATH = settingsFile;
        env.CLAUDE_AGENTS_PATH = agentsFile;
        env.CLAUDE_MODEL = 'MiniMax-M2';
        env.CLAUDE_FALLBACK_SETTINGS = fallbackSettings;
        console.log(`🔧 MiniMax Profile: ${settingsFile} with model MiniMax-M2`);
        console.log(`🤖 Agents file: ${agentsFile}`);
        console.log(`⚡ 100% PERSISTANT: echo | claude --print --output-format json`);
        console.log(`🔄 Fallback settings: ${fallbackSettings} (only if rate-limited)`);
      } else if (profile === 'z') {
        // Profil Z: Utiliser settingsZ.json avec modèle GLM (+ fallback si solde insuffisant)
        const settingsFile = path.resolve(`.claude/settingsZ.json`);
        const fallbackSettings = path.resolve(`.claude/settingsZ_fallback.json`);
        const agentsFile = path.resolve(`.claude/agents/discord-agent-simple.json`);
        env.CLAUDE_PROFILE = profile;
        env.CLAUDE_SETTINGS_PATH = settingsFile;
        env.CLAUDE_AGENTS_PATH = agentsFile;
        env.CLAUDE_FALLBACK_SETTINGS = fallbackSettings;
        console.log(`🔧 Using GLM settings: ${settingsFile} with default model mappings (glm-4.6/glm-4.5-air)`);
        console.log(`🤖 Agents file: ${agentsFile}`);
        console.log(`🔄 Fallback available: ${fallbackSettings} (Claude Sonnet)`);
      }
    }

    // Start the bot process - 100% PERSISTENT MODE
    const botFile = 'dist/discord_bot/sniper_financial_bot.js';
    const command = 'node';
    const args = [botFile];

    console.log(`🎯 Starting in 100% PERSISTANT mode with command: ${command} ${args.join(' ')}`);

    this.botProcess = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ['inherit', 'inherit', 'inherit'],
      env: env
    });

    // Save PID
    if (this.botProcess.pid) {
      await fs.writeFile(this.pidFile, this.botProcess.pid.toString());
      console.log(`✅ Bot started with PID: ${this.botProcess.pid}`);
    } else {
      console.log('⚠️ Bot started but PID not available');
    }

    // Handle process exit
    this.botProcess.on('close', (code) => {
      console.log(`🛑 Bot process exited with code: ${code}`);
      this.cleanup();
    });

    this.botProcess.on('error', (error) => {
      console.error('❌ Bot process error:', error);
      this.cleanup();
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('🛑 Received SIGINT, shutting down gracefully...');
      this.shutdown();
    });

    process.on('SIGTERM', () => {
      console.log('🛑 Received SIGTERM, shutting down gracefully...');
      this.shutdown();
    });

    return this.botProcess;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      await fs.unlink(this.pidFile);
    } catch (error) {
      // Ignore
    }
  }

  /**
   * Shutdown the bot
   */
  async shutdown() {
    if (this.botProcess && !this.botProcess.killed) {
      console.log('🔫 Terminating bot process...');
      this.botProcess.kill();

      // Force kill if it doesn't terminate gracefully
      setTimeout(async () => {
        if (this.botProcess && !this.botProcess.killed) {
          const isWindows = process.platform === 'win32';
          if (isWindows) {
            await execAsync(`taskkill /F /PID ${this.botProcess.pid}`);
          } else {
            await execAsync(`kill -9 ${this.botProcess.pid}`);
          }
        }
      }, 5000);
    }

    await this.cleanup();
    process.exit(0);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let profile = null;

if (args.includes('-m') || args.includes('m')) {
  profile = 'm';
} else if (args.includes('-z') || args.includes('z')) {
  profile = 'z';
}

// Create and start launcher
const launcher = new SingleInstanceBotLauncher();

// Start the bot
launcher.start(profile).catch(error => {
  console.error('❌ Failed to start bot:', error);
  process.exit(1);
});