import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import * as path from 'path';
import { discordLogger } from './DiscordLogger.js';

const execAsync = promisify(exec);

export interface CommandResult {
    success: boolean;
    output: string;
    error?: string;
    command: string;
}

export class ClaudeCommandHandler {
    private static instance: ClaudeCommandHandler;

    // Chemins de configuration
    private readonly SETTINGS_PATH: string;
    private readonly AGENTS_PATH: string;

    private constructor() {
        this.SETTINGS_PATH = process.env.CLAUDE_SETTINGS_PATH ||
            path.resolve(process.cwd(), '.claude', 'settingsM.json');
        this.AGENTS_PATH = process.env.CLAUDE_AGENTS_PATH ||
            path.resolve(process.cwd(), '.claude', 'agents', 'discord-agent-simple.json');
    }

    static getInstance(): ClaudeCommandHandler {
        if (!ClaudeCommandHandler.instance) {
            ClaudeCommandHandler.instance = new ClaudeCommandHandler();
        }
        return ClaudeCommandHandler.instance;
    }

    /**
     * Exécute une commande Claude CLI avec timeout et gestion d'erreur améliorée
     */
    private async executeClaudeCommand(
        message: string,
        options: {
            sessionId?: string;
            agent?: string;
            timeout?: number;
            userId?: string;
            username?: string;
        } = {}
    ): Promise<CommandResult> {
        const { sessionId, agent = 'discord-agent', timeout = 120000, userId, username } = options;

        // === BOUCLE VERTUEUSE: Log de la requête Claude ===
        const claudeRequestTimestamp = await discordLogger.logClaudeRequest(
            userId || 'unknown',
            username || 'unknown',
            message,
            sessionId
        );

        try {
            // Vérifier l'existence des fichiers de configuration
            console.log(`🔍 Vérification des fichiers de config:`);
            console.log(`   Settings: ${this.SETTINGS_PATH}`);
            console.log(`   Agents: ${this.AGENTS_PATH}`);

            try {
                await fs.access(this.SETTINGS_PATH);
                console.log(`   ✅ Settings file exists`);
            } catch (error) {
                console.log(`   ❌ Settings file not accessible: ${error}`);
            }

            try {
                await fs.access(this.AGENTS_PATH);
                console.log(`   ✅ Agents file exists`);
            } catch (error) {
                console.log(`   ❌ Agents file not accessible: ${error}`);
            }

            // Construire la commande Claude
            let command = `claude `;
            command += `--dangerously-skip-permissions `;
            command += `--settings "${this.SETTINGS_PATH}" `;
            command += `--agents "${this.AGENTS_PATH}" `;
            command += `--agent ${agent} `;

            // Ajouter le modèle si spécifié dans les variables d'environnement
            const claudeModel = process.env.CLAUDE_MODEL;
            if (claudeModel) {
                command += `--model ${claudeModel} `;
                console.log(`🎯 Using model: ${claudeModel}`);
            }

            command += `--output-format json `;

            if (sessionId) {
                command += `--session-id ${sessionId} `;
            }

            console.log(`🔧 Claude CLI: Exécution avec agent="${agent}", sessionId="${sessionId || 'none'}"`);
            console.log(`📂 CWD: ${process.cwd()}`);

            const escapedMessage = message.replace(/"/g, '\\"');
            const fullCommand = `echo "${escapedMessage}" | ${command}`;

            console.log(`🚀 Commande complète: ${fullCommand}`);

            let stdout, stderr;

            try {
                const result = await execAsync(fullCommand, {
                    timeout,
                    cwd: process.cwd(),
                    maxBuffer: 50 * 1024 * 1024, // 50MB buffer
                    killSignal: 'SIGTERM',
                    env: {
                        ...process.env,
                        // Variables pour éviter les problèmes d'encodage
                        LANG: 'fr_FR.UTF-8',
                        LC_ALL: 'fr_FR.UTF-8'
                    }
                });
                stdout = result.stdout;
                stderr = result.stderr;
            } catch (primaryError) {
                // Gérer le rate limit et les erreurs de solde avec fallback
                const errorMessage = primaryError instanceof Error ? primaryError.message : String(primaryError);
                if ((errorMessage.includes('rate_limit_error') ||
                     errorMessage.includes('Insufficient balance') ||
                     errorMessage.includes('no resource package') ||
                     errorMessage.includes('Please recharge')) &&
                    process.env.CLAUDE_FALLBACK_SETTINGS) {
                    if (errorMessage.includes('Insufficient balance') || errorMessage.includes('Please recharge')) {
                    console.log('💰 Solde GLM insuffisant, basculement vers le fallback...');
                } else {
                    console.log('🔄 Rate limit détecté, tentative avec le fallback...');
                }

                    // Reconstruire la commande avec les settings de fallback
                    const fallbackCommand = command.replace(
                        `--settings "${this.SETTINGS_PATH}"`,
                        `--settings "${process.env.CLAUDE_FALLBACK_SETTINGS}"`
                    ).replace(
                        `--model ${process.env.CLAUDE_MODEL}`,
                        '--model claude-3-5-sonnet-20241022'
                    );

                    const fallbackFullCommand = `echo "${escapedMessage}" | ${fallbackCommand}`;
                    console.log(`🔄 Commande fallback: ${fallbackFullCommand}`);

                    const fallbackResult = await execAsync(fallbackFullCommand, {
                        timeout,
                        cwd: process.cwd(),
                        maxBuffer: 50 * 1024 * 1024,
                        killSignal: 'SIGTERM',
                        env: {
                            ...process.env,
                            LANG: 'fr_FR.UTF-8',
                            LC_ALL: 'fr_FR.UTF-8'
                        }
                    });

                    stdout = fallbackResult.stdout;
                    stderr = fallbackResult.stderr;
                    console.log('✅ Fallback réussi !');
                } else {
                    throw primaryError;
                }
            }

            const result: CommandResult = {
                success: true,
                output: stdout,
                command: fullCommand
            };

            if (stderr) {
                result.error = stderr;
                console.warn(`⚠️ Claude CLI Warning:`, stderr);
            }

            // === BOUCLE VERTUEUSE: Log de la réponse Claude (succès) ===
            await discordLogger.logClaudeResponse(
                claudeRequestTimestamp,
                userId || 'unknown',
                stdout,
                Date.now() - new Date(claudeRequestTimestamp).getTime()
            );

            return result;

        } catch (error: any) {
            console.error(`❌ Claude CLI Erreur:`, error);

            // Gestion spécifique des timeouts
            if (error.signal === 'SIGTERM' || error.signal === 'SIGKILL') {
                console.log(`⏰ Claude timeout - utilisation du fallback`);

                // === BOUCLE VERTUEUSE: Log de l'erreur timeout ===
                await discordLogger.logClaudeResponse(
                    claudeRequestTimestamp,
                    userId || 'unknown',
                    this.getTimeoutFallback(message),
                    Date.now() - new Date(claudeRequestTimestamp).getTime(),
                    'Timeout - fallback utilisé'
                );

                return {
                    success: true,
                    output: this.getTimeoutFallback(message),
                    command: `claude (fallback)`,
                    error: 'Timeout - fallback utilisé'
                };
            }

            // Gestion des erreurs de commande non trouvée
            if (error.code === 'ENOENT') {

                // === BOUCLE VERTUEUSE: Log de l'erreur ENOENT ===
                await discordLogger.logClaudeResponse(
                    claudeRequestTimestamp,
                    userId || 'unknown',
                    this.getCommandNotFoundFallback(message),
                    Date.now() - new Date(claudeRequestTimestamp).getTime(),
                    'Commande Claude non trouvée - fallback utilisé'
                );

                return {
                    success: true,
                    output: this.getCommandNotFoundFallback(message),
                    command: `claude (fallback)`,
                    error: 'Commande Claude non trouvée - fallback utilisé'
                };
            }

            // === BOUCLE VERTUEUSE: Log de l'erreur générale ===
            await discordLogger.logClaudeResponse(
                claudeRequestTimestamp,
                userId || 'unknown',
                '',
                Date.now() - new Date(claudeRequestTimestamp).getTime(),
                error.message || 'Erreur inconnue'
            );

            return {
                success: false,
                output: '',
                error: error.message || 'Erreur inconnue',
                command: 'claude'
            };
        }
    }

    /**
     * Commande /profile - Affiche les informations du profil Claude
     */
    async getProfileInfo(): Promise<CommandResult> {
        try {
            const result = await this.executeClaudeCommand(
                'Afficher les informations de profil et les capacités de Claude Code',
                { agent: 'discord-agent' }
            );

            if (result.success && result.output.trim()) {
                console.log(`✅ Profil Claude obtenu`);
                return {
                    ...result,
                    output: this.formatProfileOutput(result.output)
                };
            }

            // Si aucune commande ne fonctionne, retourner un message par défaut
            return {
                success: true,
                output: this.getDefaultProfileMessage(),
                command: 'profile (fallback)',
                error: 'Profil par défaut utilisé'
            };

        } catch (error) {
            return {
                success: true,
                output: this.getDefaultProfileMessage(),
                command: 'profile (fallback)',
                error: 'Erreur profil - fallback utilisé'
            };
        }
    }

    /**
     * Commande /new - Démarre une nouvelle tâche avec un état propre
     */
    async startNewTask(taskDescription?: string): Promise<CommandResult> {
        try {
            // Démarrer la nouvelle tâche
            const prompt = taskDescription
                ? `Nouvelle tâche: ${taskDescription}. Commence avec un état propre et prêt à aider.`
                : 'Commence une nouvelle session avec un état propre. Prêt à aider.';

            const result = await this.executeClaudeCommand(prompt, {
                agent: 'discord-agent'
            });

            return {
                success: true,
                output: this.formatNewTaskOutput(result.output, taskDescription),
                command: 'claude /new',
                error: result.error
            };

        } catch (error: any) {
            return {
                success: false,
                output: '',
                error: error.message || 'Impossible de démarrer la nouvelle tâche',
                command: 'new task'
            };
        }
    }

    /**
     * Formate la sortie du profil pour une meilleure lisibilité dans Discord
     */
    private formatProfileOutput(output: string): string {
        if (!output || !output.trim()) {
            return this.getDefaultProfileMessage();
        }

        const lines = output.split('\n').filter(line => line.trim());
        let formatted = '👤 **Profil Claude Code**\n\n';

        // Nettoyer et formater les informations pertinentes
        for (const line of lines) {
            const trimmed = line.trim();

            // Ignorer les lignes de debug/technique
            if (trimmed.includes('[debug]') || trimmed.includes('Loading') || trimmed.includes('✓')) {
                continue;
            }

            // Ajouter des emojis pour les types d'information
            if (trimmed.toLowerCase().includes('user') || trimmed.toLowerCase().includes('name')) {
                formatted += `🆔 ${trimmed}\n`;
            } else if (trimmed.toLowerCase().includes('email')) {
                formatted += `📧 ${trimmed}\n`;
            } else if (trimmed.toLowerCase().includes('plan') || trimmed.toLowerCase().includes('subscription')) {
                formatted += `💳 ${trimmed}\n`;
            } else if (trimmed.toLowerCase().includes('usage') || trimmed.toLowerCase().includes('quota')) {
                formatted += `📊 ${trimmed}\n`;
            } else if (trimmed.length > 10) {
                formatted += `ℹ️ ${trimmed}\n`;
            }
        }

        if (formatted === '👤 **Profil Claude Code**\n\n') {
            formatted += this.getDefaultProfileMessage();
        }

        return formatted;
    }

    /**
     * Formate la sortie de nouvelle tâche
     */
    private formatNewTaskOutput(output: string, taskDescription?: string): string {
        // Nettoyage agressif des artefacts de console (ANSI codes, headers bizarres)
        // eslint-disable-next-line no-control-regex
        let cleanOutput = output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '') // Remove ANSI colors
                               .replace(/]0;.*?\x07/g, '')             // Remove window title set
                               .replace(/\x1B]0;.*?\x07/g, '')        // Remove window title set (alt)
                               .replace(/\[\d+J/g, '')                // Remove clear screen codes
                               .replace(/\[\d+;?\d*H/g, '')           // Remove cursor move codes
                               .replace(/[⠀-⣿]/g, '')                 // Remove Braille characters (often used in CLI spinners/logos)
                               .trim();

        // Si le nettoyage laisse une chaine vide ou presque, mettre un message par défaut
        if (cleanOutput.length < 5) cleanOutput = "Session initialisée avec succès.";

        const message = taskDescription
            ? `🆕 **Nouvelle Tâche Démarrée**\n\n📝 **Description**: ${taskDescription}\n\n✅ Claude Code est prêt avec un état propre !\n\n**Réponse de Claude**:\n${cleanOutput.substring(0, 500)}${cleanOutput.length > 500 ? '...' : ''}`
            : `🆕 **Nouvelle Session Démarrée**\n\n✅ Claude Code est prêt avec un état propre !\n\n**Réponse de Claude**:\n${cleanOutput.substring(0, 500)}${cleanOutput.length > 500 ? '...' : ''}`;

        return message;
    }

    /**
     * Message par défaut quand aucune information de profil n'est disponible
     */
    private getDefaultProfileMessage(): string {
        return `👤 **Profil Claude Code**

📊 **Statut**: Connecté et opérationnel
🤖 **Service**: Assistant IA financier avec Claude Sonnet
💡 **Capacité**: Analyse de données, rapports financiers, prédictions de marché

✅ *Votre profil Claude Code est actif et prêt à vous aider !*

*Intégration complète avec Discord et le système skills Claude.*`;
    }

    /**
     * Fallback pour timeout de Claude
     */
    private getTimeoutFallback(command: string): string {
        if (command.includes('new') || command.includes('session')) {
            return `🆕 **Nouvelle Session Démarrée**

✅ Sniper est prêt avec un état propre !
🔄 La communication avec Claude a pris trop de temps, mais je reste opérationnel.

Je suis là pour vous aider avec :
- 📊 Analyse financière et données de marché
- 💻 Développement TypeScript et architecture
- 🤖 Agents IA et scrapers financiers
- 📚 Documentation et explications de code

Comment puis-je vous assister aujourd'hui ? 😊`;
        }

        if (command.includes('profile')) {
            return this.getDefaultProfileMessage();
        }

        return `⏰ **Claude Timeout**

La commande a pris trop de temps à s'exécuter.
Je reste disponible pour vous aider avec mes capacités locales.

Comment puis-je vous assister ? 🤖`;
    }

    /**
     * Fallback quand Claude n'est pas trouvé
     */
    private getCommandNotFoundFallback(command: string): string {
        if (command.includes('new') || command.includes('session')) {
            return `🆕 **Nouvelle Session Démarrée**

✅ Sniper est opérationnel !
📝 Claude n'est pas installé sur ce système, mais je peux toujours aider.

Je peux vous assister avec :
- 📊 Analyse de données financières locales
- 💻 Développement et debugging TypeScript
- 📖 Documentation et explications de code
- 🔍 Recherche dans les fichiers du projet

Posez-moi votre question ! 😊`;
        }

        if (command.includes('profile')) {
            return `👤 **Profil Sniper Bot**

🤖 **Identité**: Bot Analyste Financier
📊 **Spécialité**: Finance, TypeScript, Agents IA
💡 **Capacités**: Analyse, développement, documentation

✅ *Je suis prêt à vous aider !*`;
        }

        return `❓ **KiloCode Non Disponible**

L'interface KiloCode n'est pas accessible sur ce système.
Je reste disponible pour vous aider avec mes capacités intégrées.

Comment puis-je vous assister ? 🤖`;
    }

    /**
     * Vérifie si Claude est disponible (PLUS DE TEST PING)
     */
    async checkClaudeAvailability(): Promise<boolean> {
        // Plus de test "ping" - le système persistant gère sa propre disponibilité
        // Si le bot a démarré, Claude est considéré comme disponible
        return true;
    }

    /**
     * Liste des commandes Claude disponibles
     */
    getAvailableCommands(): { command: string; description: string }[] {
        return [
            { command: '/profile', description: 'Affiche vos informations de profil Claude Code' },
            { command: '/new', description: 'Démarre une nouvelle tâche avec un état propre' },
            { command: '/new <description>', description: 'Démarre une nouvelle tâche avec une description spécifique' }
        ];
    }
}