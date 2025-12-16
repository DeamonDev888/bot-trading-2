import { BaseAgentSimple, AgentRequest } from './BaseAgentSimple.js';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

// Get project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../../');

// Chemins de configuration Claude
const CLAUDE_SETTINGS_PATH = process.env.CLAUDE_SETTINGS_PATH ||
    path.resolve(PROJECT_ROOT, '.claude', 'settingsM.json');
const CLAUDE_AGENTS_PATH = process.env.CLAUDE_AGENTS_PATH ||
    path.resolve(PROJECT_ROOT, '.claude', 'agents', 'discord-agent-simple.json');
const CLAUDE_SCHEMA_PATH = process.env.CLAUDE_SCHEMA_PATH ||
    path.resolve(PROJECT_ROOT, '.claude', 'skills', 'discord-skills-simple.json');

// Import du système de message builder Discord
import {
    DiscordMessageBuilder,
    DiscordMessageFactory
} from '../../discord_bot/DiscordMessageBuilder.js';

// Import du système d'upload de fichiers
import {
    DiscordFileUploader,
    DiscordFileFactory,
    FileUploadData,
    FileUploadOptions
} from '../../discord_bot/DiscordFileUploader.js';

// Import des nouvelles fonctionnalités
import {
    CodeFormatter,
    CodeBlock,
    FormattedMessage
} from '../../discord_bot/CodeFormatter.js';
import {
    CodeFileManager,
    GeneratedFile
} from '../../discord_bot/CodeFileManager.js';

// Import du système de logging pour boucle vertueuse
import { discordLogger } from '../../discord_bot/DiscordLogger.js';

// Import du validateur JSON Schema
// fsSync is already imported above

const execAsync = promisify(exec);

// Configuration des timeouts adaptatifs
const TIMEOUT_CONFIG = {
    DEFAULT: 300000,  // 5 minutes pour MiniMax-M2
    MIN: 300000,      // 5 minutes minimum pour les modèles IA
    MAX: 600000,      // Maximum 10 minutes
    MULTIPLIER: 1.5
};

// Fonction de retry avec backoff exponentiel
async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;
            console.log(`[claude-chatbot] 🔄 Retry attempt ${attempt}/${maxRetries}: ${lastError.message}`);

            if (attempt === maxRetries) {
                throw lastError;
            }

            // Backoff exponentiel avec jitter
            const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError!;
}

interface MemberProfile {
    username: string;
    id: string;
    discriminator: string;
    nickname?: string;
    joinedAt: string;
    messages?: Array<{
        channelName: string;
        channelId: string;
        timestamp: string;
        content: string;
        messageId: string;
    }>;
    extended_conversations?: any;
    key_developments?: any;
    skills_and_interests?: any;
    personality_traits?: any;
    challenges_identified?: any;
    future_prospects?: any;
}

export interface ChatRequest {
    message: string;
    userId?: string;
    username?: string;
    channelId?: string;
    attachmentContent?: string;
    isFirstMessage?: boolean;
    context?: string;
}

export interface PollOption {
    text: string;
    emoji?: string;
}

export interface PollData {
    question: string;
    options: PollOption[];
    duration: number;
    allowMultiselect: boolean;
    channelId?: string; // 🔥 NOUVEAU: Channel Discord spécifique (optionnel)
}

export interface DiscordEmbedOptions {
    title?: string;
    description?: string;
    color?: number | string;
    url?: string;
    timestamp?: boolean | Date;
    footer?: {
        text: string;
        iconUrl?: string;
    };
    image?: {
        url: string;
    };
    thumbnail?: {
        url: string;
    };
    author?: {
        name: string;
        iconUrl?: string;
        url?: string;
    };
    fields?: Array<{
        name: string;
        value: string;
        inline?: boolean;
    }>;
}

export interface DiscordButtonOptions {
    label: string;
    style?: 'Primary' | 'Secondary' | 'Success' | 'Danger' | 'Link';
    customId?: string;
    url?: string;
    emoji?: string;
    disabled?: boolean;
}

export interface DiscordMessageData {
    type: 'poll' | 'message_enrichi';
    content?: string;
    poll?: PollData;
    embed?: DiscordEmbedOptions;
    buttons?: DiscordButtonOptions[];
    reactions?: string[];
    modal?: any; // Modal data for Discord
}

export interface ChatResponse {
    messages: string[];
    poll?: PollData;
    discordMessage?: DiscordMessageData;
    fileUpload?: FileUploadData;
}

export class ClaudeChatBotAgent extends BaseAgentSimple {
    private memberProfiles: Map<string, MemberProfile> = new Map();

    // Session IDs par utilisateur (pour persistance sans stdin/stdout)
    private userSessions: Map<string, string> = new Map();

    // Propriétés pour le mode persistant (legacy - non utilisé en mode one-shot)
    private currentSessionId: string | null = null;
    private isPersistentMode: boolean = false;
    private claudeProcess: any = null;
    private processStdin: any = null;
    private processStdout: any = null;
    private outputBuffer: string = '';

    constructor() {
        super('claude-chatbot');
        this.loadMemberProfiles();
    }

    /**
     * Gestionnaire de persistance simple avec --continue
     * Pas besoin de session ID !
     * - Premier message : pas d'options spéciales
     * - Messages suivants : ajouter --continue
     */
    private isFirstMessage(userId?: string): boolean {
        if (!userId) {
            return true; // Messages anonymes : toujours premier
        }
        return !this.userSessions.has(userId);
    }

    /**
     * Marquer qu'on a reçu au moins un message de cet utilisateur
     */
    private markMessageReceived(userId?: string): void {
        if (userId) {
            this.userSessions.set(userId, 'received');
            console.log(`[claude-chatbot] 📝 Marked message received for user ${userId}`);
        }
    }

    /**
     * Initializes a persistent Claude Code session with discord-agent
     */
    async initializeClaudeSession(): Promise<void> {
        // DÉTRUIRE TOUTES LES SESSIONS EXISTANTES
        if (this.currentSessionId && this.isPersistentMode) {
            console.log(`[claude-chatbot] 🗑️ Stopping existing session: ${this.currentSessionId}`);
            await this.stopPersistentClaude();

            // Attendre un peu pour que KiloCode libère l'ID
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log('[claude-chatbot] 🚀 Initializing Claude Code Session with discord-agent...');

        try {
            // Get profile from environment variables
            const profile = process.env.CLAUDE_PROFILE || 'default';
            const settingsFile = CLAUDE_SETTINGS_PATH;
            const agentsFile = CLAUDE_AGENTS_PATH;

            console.log(`[claude-chatbot] ⚙️ Profile: ${profile}`);
            console.log(`[claude-chatbot] 📄 Settings file: ${settingsFile}`);
            console.log(`[claude-chatbot] 🤖 Agents file: ${agentsFile}`);

            // Build the REAL Claude Code command with all required arguments
            // Use forward slashes for cross-platform compatibility
            const settingsPath = settingsFile.replace(/\\/g, '/');
            const agentsPath = agentsFile.replace(/\\/g, '/');

            // Use claude.cmd on Windows, claude on Unix
            const claudeCmd = process.platform === 'win32' ? 'claude.cmd' : 'claude';
            let command = `${claudeCmd} --dangerously-skip-permissions`;

            // Add settings file
            if (settingsFile && fsSync.existsSync(settingsFile)) {
                command += ` --settings "${settingsPath}"`;
            }

            // Add agents file
            if (agentsFile && fsSync.existsSync(agentsFile)) {
                command += ` --agents "${agentsPath}"`;
            }

            // JSON Schema - Non supporté directement par KiloCode CLI
            // Le schema est géré dans le prompt de l'agent discord-agent-simple.json
            // Pas besoin d'option --schema (non supportée par cette version)
            console.log(`[claude-chatbot] 💡 JSON Schema handled via agent prompt`);

            // Add agent name - USE discord-agent from discord-agent-simple.json
            command += ' --agent discord-agent';

            // 🔥 MODE PERSISTANT: PAS de --print pour garder le mode interactif
            // Le mode interactif permet d'envoyer plusieurs messages via stdin
            console.log(`[claude-chatbot] 💡 Mode persistant interactif activé (sans --print)`);

            console.log(`[claude-chatbot] 🛠️ Starting Claude Code with command:`);
            console.log(`[claude-chatbot]    ${command}`);

            // Start persistent Claude Code process with better error handling
            this.claudeProcess = spawn(command, {
                shell: true,
                stdio: ['pipe', 'pipe', 'pipe'],
                detached: false,
                env: {
                    ...process.env,
                }
            });

            this.processStdin = this.claudeProcess.stdin;
            this.processStdout = this.claudeProcess.stdout;
            this.isPersistentMode = true;

            // Clear buffer on initialization
            this.outputBuffer = '';

            // Set up stdout listener for parsing responses
            this.processStdout.on('data', (data: Buffer) => {
                const dataStr = data.toString();
                console.log(`[claude-chatbot] 📥 RAW STDOUT (${dataStr.length} chars): ${JSON.stringify(dataStr.substring(0, 200))}`);
                this.outputBuffer += dataStr;
                this.parseClaudeOutput();
            });

            this.claudeProcess.stderr.on('data', (data: Buffer) => {
                const stderr = data.toString();
                console.log(`[claude-chatbot] 📤 STDERR: ${stderr}`);
            });

            this.claudeProcess.on('close', (code: number) => {
                console.log(`[claude-chatbot] 🛑 Claude Code process closed with code: ${code}`);
                this.isPersistentMode = false;
                this.currentSessionId = null;
                this.processStdin = null;
                this.processStdout = null;
                this.outputBuffer = '';
            });

            this.claudeProcess.on('error', (error: any) => {
                console.error(`[claude-chatbot] ❌ Claude Code process error:`, error);
                this.isPersistentMode = false;
            });

            // Create session ID
            this.currentSessionId = `claude_session_${Date.now()}`;
            console.log(`[claude-chatbot] ✅ Claude Code Session Created: ${this.currentSessionId}`);

            // Send initial system prompt
            await this.sendSystemPrompt();

        } catch (e) {
            console.error(`[claude-chatbot] ❌ Failed to initialize Claude Code session:`, e);
            throw new Error(`Claude Code initialization failed: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    /**
     * Send system prompt to initialize the agent
     */
    private async sendSystemPrompt(): Promise<void> {
        if (!this.processStdin || !this.isPersistentMode) {
            console.log('[claude-chatbot] ⚠️ Cannot send system prompt: not in persistent mode');
            return;
        }

        try {
            // Don't send system prompt - the agent is already configured in discord-agent-simple.json
            // Sending a system prompt can cause the session to crash
            console.log('[claude-chatbot] 💡 Skipping system prompt (agent already configured)');
            console.log('[claude-chatbot] ✅ Session ready to receive messages');
        } catch (error) {
            console.error('[claude-chatbot] ❌ Failed to send system prompt:', error);
        }
    }

    /**
     * Stop the persistent Claude Code session
     */
    async stopPersistentClaude(): Promise<void> {
        if (this.currentSessionId) {
            console.log(`[claude-chatbot] 🛑 Stopping persistent Claude Code session: ${this.currentSessionId}`);

            // Kill the Claude Code process
            if (this.claudeProcess) {
                this.claudeProcess.kill();
                this.claudeProcess = null;
            }

            this.currentSessionId = null;
            this.isPersistentMode = false;
            this.processStdin = null;
            this.processStdout = null;
            this.outputBuffer = '';
        }
    }

    /**
     * Parses output from persistent Claude Code process
     */
    private parseClaudeOutput(): void {
        // Look for complete responses in the buffer
        // This is a simplified parser - you may need to adjust based on actual Claude Code output format
        const lines = this.outputBuffer.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                console.log(`[claude-chatbot] 📥 Received: ${line.substring(0, 100)}...`);
            }
        }
        this.outputBuffer = '';
    }

    /**
     * Sends a message to the persistent Claude Code process
     */
    private async sendToPersistentClaude(message: string, userId?: string, username?: string): Promise<string> {
        const startTime = Date.now();
        let claudeRequestTimestamp: string | undefined;

        // Log la requête Claude
        if (userId) {
            claudeRequestTimestamp = await discordLogger.logClaudeRequest(
                userId,
                username || 'unknown',
                message
            );
        }

        return new Promise((resolve, reject) => {
            if (!this.isPersistentMode || !this.processStdin || !this.processStdout) {
                const error = 'Claude Code is not in persistent mode';
                if (userId) {
                    discordLogger.logError(userId, username || 'unknown', 'claude', error, 'sendToPersistentClaude');
                }
                reject(new Error(error));
                return;
            }

            console.log(`[claude-chatbot] 📤 Sending to persistent Claude Code: "${message.substring(0, 50)}..."`);

            let responseBuffer = '';
            let hasResponse = false;

            // Set up stdout listener for this specific message
            const onData = (data: Buffer) => {
                responseBuffer += data.toString();
                console.log(`[claude-chatbot] 📥 Received data: ${data.toString().substring(0, 100)}...`);

                // Check if we have a complete response
                if (responseBuffer.includes('\n') && !hasResponse) {
                    hasResponse = true;
                    this.processStdout?.off('data', onData);

                    const duration = Date.now() - startTime;
                    const response = responseBuffer.trim();

                    // Log la réponse Claude
                    if (userId && claudeRequestTimestamp) {
                        discordLogger.logClaudeResponse(
                            claudeRequestTimestamp,
                            userId,
                            response,
                            duration
                        );
                    }

                    resolve(response);
                }
            };

            this.processStdout.on('data', onData);

            // Send message to stdin
            this.processStdin.write(message + '\n');

            // Set timeout for response
            setTimeout(() => {
                this.processStdout?.off('data', onData);
                if (!hasResponse) {
                    const error = 'Timeout waiting for Claude Code response';
                    console.log(`[claude-chatbot] ⏰ ${error}`);

                    if (userId && claudeRequestTimestamp) {
                        discordLogger.logClaudeResponse(
                            claudeRequestTimestamp,
                            userId,
                            '',
                            Date.now() - startTime,
                            error
                        );
                    }

                    reject(new Error(error));
                }
            }, 240000); // 240 second timeout (4 minutes) pour MiniMax-M2
        });
    }

    /**
     * Execute Claude CLI using exec (plus stable que spawn)
     */
    private async executeClaudeExec(command: string, timeoutMs: number): Promise<{ stdout: string, duration: number }> {
        const startTime = Date.now();

        try {
            console.log(`[claude-chatbot] 🚀 Starting exec execution...`);

            const { stdout, stderr } = await execAsync(command, {
                timeout: timeoutMs,
                maxBuffer: 1024 * 1024 * 10, // 10MB
                env: {
                    ...process.env,
                }
            });

            const duration = Date.now() - startTime;
            console.log(`[claude-chatbot] ✅ Exec completed in ${duration}ms`);

            if (stderr) {
                console.log(`[claude-chatbot] ⚠️ STDERR: ${stderr}`);
            }

            return {
                stdout: stdout.trim(),
                duration
            };

        } catch (error: any) {
            const duration = Date.now() - startTime;
            console.error(`[claude-chatbot] ❌ Exec failed after ${duration}ms:`, error);

            if (error.signal === 'SIGTERM') {
                throw new Error(`Claude process was killed (timeout after ${timeoutMs}ms)`);
            } else if (error.code === 'ETIMEDOUT') {
                throw new Error(`Claude timeout after ${timeoutMs}ms`);
            } else {
                throw new Error(`Claude execution failed: ${error.message}`);
            }
        }
    }

    /**
     * Execute Claude CLI using spawn with intelligent response detection
     */
    private async executeClaudeWithSpawn(command: string, timeoutMs: number): Promise<{ stdout: string, duration: number }> {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            console.log(`[claude-chatbot] 🚀 Starting spawn execution...`);

            const child = spawn(command, {
                shell: true,
                stdio: ['pipe', 'pipe', 'pipe'],
                detached: false,
                env: {
                    ...process.env,
                }
            });

            let accumulatedStdout = '';
            let accumulatedStderr = '';
            let responseComplete = false;
            let lastDataTime = Date.now();

            child.stdout.on('data', (data: Buffer) => {
                const chunk = data.toString();
                accumulatedStdout += chunk;
                lastDataTime = Date.now();

                console.log(`[claude-chatbot] 📥 Received chunk (${chunk.length} chars): ${chunk.substring(0, 100)}...`);

                // Check if we have a meaningful response - detection STRICTE pour éviter les échos
                if (accumulatedStdout.length > 10 && !responseComplete) {
                    // 🔥 CORRECTION: Détection STRICTE - Ne accepter que le JSON Claude complet
                    const hasCompleteThought =
                        // Claude Code JSON complet avec "result" field
                        accumulatedStdout.includes('{"type":"result"') ||
                        accumulatedStdout.includes('{"result"') ||
                        // Ou une vraie réponse longue (pas un echo)
                        (accumulatedStdout.length > 100 && accumulatedStdout.includes('Bonjour')) ||
                        (accumulatedStdout.length > 100 && accumulatedStdout.includes('Salut')) ||
                        (accumulatedStdout.length > 100 && accumulatedStdout.includes('Je suis'));

                    // 🔥 ANTI-ECHO: Rejeter les échos et continuer à attendre
                    const isEcho = accumulatedStdout.length < 100 ||
                                   accumulatedStdout.includes('peu tu recrie') ||
                                   accumulatedStdout.includes('echo ') ||
                                   // L'écho du message echo
                                   (accumulatedStdout.split('\n').length === 1 && accumulatedStdout.length < 80);

                    if (hasCompleteThought && !isEcho) {
                        responseComplete = true;
                        const duration = Date.now() - startTime;
                        console.log(`[claude-chatbot] ✅ Response detected complete in ${duration}ms (${accumulatedStdout.length} chars)`);
                        console.log(`[claude-chatbot] 📝 Response preview: "${accumulatedStdout.substring(0, 100)}..."`);

                        // Kill immediately - we have enough content
                        if (!child.killed) {
                            child.kill('SIGTERM');
                        }
                    } else if (isEcho) {
                        console.log(`[claude-chatbot] ⚠️ Detected echo (${accumulatedStdout.length} chars), waiting for real Claude response...`);
                        // NE PAS MARQUER COMME COMPLET - continuer à attendre
                    } else {
                        console.log(`[claude-chatbot] ⏳ Partial response (${accumulatedStdout.length} chars), continuing to wait...`);
                    }
                }
            });

            child.stderr.on('data', (data: Buffer) => {
                const chunk = data.toString();
                accumulatedStderr += chunk;
                console.log(`[claude-chatbot] 📤 STDERR: ${chunk}`);
            });

            child.on('close', (code: number) => {
                const duration = Date.now() - startTime;
                console.log(`[claude-chatbot] 🛑 Process closed with code: ${code} after ${duration}ms`);

                // 🔥 ANTI-ECHO: Vérifier si c'est un echo avant d'accepter
                const isEcho = accumulatedStdout.length < 100 ||
                               accumulatedStdout.includes('peu tu recrie') ||
                               accumulatedStdout.includes('echo ') ||
                               (accumulatedStdout.split('\n').length === 1 && accumulatedStdout.length < 80);

                console.log(`[claude-chatbot] 🔍 Close event: responseComplete=${responseComplete}, isEcho=${isEcho}, length=${accumulatedStdout.length}`);

                // 🔥 CORRECTION: Si on a reçu du contenu VALIDE, on l'utilise
                // Mais PAS si c'est un echo
                if (responseComplete && !isEcho) {
                    console.log(`[claude-chatbot] ✅ Using complete response (${accumulatedStdout.length} chars)`);
                    resolve({
                        stdout: accumulatedStdout.trim(),
                        duration
                    });
                } else if (accumulatedStdout.length > 10 && !isEcho) {
                    console.log(`[claude-chatbot] ✅ Using response (${accumulatedStdout.length} chars) despite exit code ${code}`);
                    resolve({
                        stdout: accumulatedStdout.trim(),
                        duration
                    });
                } else if (isEcho) {
                    console.log(`[claude-chatbot] ❌ REJECTING ECHO response (${accumulatedStdout.length} chars)`);
                    reject(new Error('Echo response detected, Claude may not have responded'));
                } else if (accumulatedStderr && accumulatedStdout.length < 10) {
                    // Only reject if there's stderr AND no useful stdout
                    reject(new Error(`Claude process failed: ${accumulatedStderr}`));
                } else {
                    // 🔥 NOUVELLE LOGIQUE: Même si code d'erreur, si on a du contenu et pas un echo
                    if (accumulatedStdout.length > 5 && !isEcho) {
                        console.log(`[claude-chatbot] ⚠️ Using partial response (${accumulatedStdout.length} chars) from failed process`);
                        resolve({
                            stdout: accumulatedStdout.trim(),
                            duration
                        });
                    } else {
                        reject(new Error(`Claude process exited with code ${code} - no valid content received`));
                    }
                }
            });

            child.on('error', (error: any) => {
                console.error(`[claude-chatbot] ❌ Process error:`, error);
                reject(error);
            });

            // Safety timeout - but check for content first
            const timeoutId = setTimeout(() => {
                if (!child.killed) {
                    console.log(`[claude-chatbot] ⏰ Safety timeout - killing process`);
                    child.kill('SIGTERM');
                }

                // 🔥 ANTI-ECHO: Vérifier si c'est un echo avant d'accepter
                const isEcho = accumulatedStdout.length < 100 ||
                               accumulatedStdout.includes('peu tu recrie') ||
                               accumulatedStdout.includes('echo ') ||
                               (accumulatedStdout.split('\n').length === 1 && accumulatedStdout.length < 80);

                // Check if we have ANY content before rejecting, mais PAS si c'est un echo
                if (accumulatedStdout.length > 5 && !isEcho) {
                    const duration = Date.now() - startTime;
                    console.log(`[claude-chatbot] ⏰ Using received content after timeout (${accumulatedStdout.length} chars, not echo)`);
                    resolve({
                        stdout: accumulatedStdout.trim(),
                        duration
                    });
                } else if (isEcho) {
                    console.log(`[claude-chatbot] ❌ TIMEOUT: Rejecting echo response (${accumulatedStdout.length} chars)`);
                    reject(new Error(`Claude timeout after ${timeoutMs}ms - only echo received, no real response`));
                } else {
                    reject(new Error(`Claude timeout after ${timeoutMs}ms - no content received`));
                }
            }, timeoutMs);

            // Inactivity timeout disabled - rely on response detection and global timeout
            // const inactivityId = setInterval(() => {
            //     if (Date.now() - lastDataTime > 20000 && !responseComplete) { // 20 seconds inactivity
            //         clearInterval(inactivityId);
            //         clearTimeout(timeoutId);
            //
            //         if (!child.killed) {
            //             console.log(`[claude-chatbot] ⏱️ Inactivity timeout - killing process`);
            //             child.kill('SIGTERM');
            //         }
            //
            //         if (stdout.length > 20) {
            //             const duration = Date.now() - startTime;
            //             console.log(`[claude-chatbot] ⏱️ Using response after inactivity`);
            //             resolve({
            //                 stdout: stdout.trim(),
            //                 duration
            //             });
            //         } else {
            //             reject(new Error(`Claude inactivity timeout`));
            //         }
            //     }
            // }, 5000);

            // Cleanup timeout on close
            child.on('close', () => {
                clearTimeout(timeoutId);
            });
        });
    }

    /**
     * Executes a single Claude request using ONE-SHOT SPAWN with --continue
     * Full command execution for each request (KiloCode compatible)
     * - First message: sans --continue
     * - Following messages: avec --continue pour maintenir le contexte
     */
    private async executeClaudeOneShot(
        message: string,
        isFirstMessage?: boolean,
        userId?: string,
        username?: string
    ): Promise<{ stdout: string }> {
        const startTime = Date.now();

        // Log la requête Claude
        let claudeRequestTimestamp: string | undefined;
        if (userId) {
            claudeRequestTimestamp = await discordLogger.logClaudeRequest(
                userId,
                username || 'unknown',
                message
            );
        }

        try {
            // Build the complete command like in initializeClaudeSession
            const profile = process.env.CLAUDE_PROFILE || 'default';
            const settingsFile = CLAUDE_SETTINGS_PATH;
            const agentsFile = CLAUDE_AGENTS_PATH;

            const settingsPath = settingsFile.replace(/\\/g, '/');
            const agentsPath = agentsFile.replace(/\\/g, '/');

            const claudeCmd = process.platform === 'win32' ? 'claude.cmd' : 'claude';

            // 🔥 CORRECTION: Passer le message directement en argument avec échappement
            const escapedMessage = message.replace(/"/g, '\\"');
            let command = `${claudeCmd} --dangerously-skip-permissions "${escapedMessage}"`;

            if (settingsFile && fsSync.existsSync(settingsFile)) {
                command += ` --settings "${settingsPath}"`;
            }

            if (agentsFile && fsSync.existsSync(agentsFile)) {
                command += ` --agents "${agentsPath}"`;
            }

            command += ' --agent discord-agent --print --output-format json';
            if (!isFirstMessage) {
                // Messages suivants : ajouter --continue pour maintenir le contexte
                command += ' --continue';
            }

            console.log(`[claude-chatbot] 🚀 One-shot command: ${command.substring(0, 100)}...`);

            // Use spawn with intelligent response detection
            const { stdout, duration } = await this.executeClaudeWithSpawn(command, 300000);

            // Log la réponse Claude
            if (userId && claudeRequestTimestamp) {
                discordLogger.logClaudeResponse(
                    claudeRequestTimestamp,
                    userId,
                    stdout,
                    duration
                );
            }

            return { stdout };

        } catch (error) {
            console.error(`[claude-chatbot] ❌ Error in one-shot execution:`, error);
            throw new Error(`One-shot execution failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Send message via PERSISTENT stdin/stdout streams ONLY
     * No process spawning, no command resending
     */
    private async sendToPersistentStdin(message: string, startTime: number): Promise<{ response: string, duration: number }> {
        return new Promise((resolve, reject) => {
            if (!this.processStdin || !this.processStdout || !this.claudeProcess) {
                reject(new Error('Persistent stdin/stdout streams not available'));
                return;
            }

            let responseBuffer = '';
            let hasResponse = false;
            let timeoutId: NodeJS.Timeout;

            console.log(`[claude-chatbot] 📤 Writing to STDIN: "${message.substring(0, 50)}..."`);

            // Écouter la réponse via STDOUT
            console.log(`[claude-chatbot] 🔍 DEBUG: Attaching onData listener to stdout...`);
            const onData = (data: Buffer) => {
                console.log(`[claude-chatbot] 🔥🔥🔥 onData APPELÉ ! Size: ${data.length} bytes`);
                const dataStr = data.toString();
                console.log(`[claude-chatbot] 🔥🔥🔥 dataStr: "${dataStr.substring(0, 200)}"`);
                responseBuffer += dataStr;
                console.log(`[claude-chatbot] 📥 Received via STDOUT (${dataStr.length} chars): ${JSON.stringify(dataStr.substring(0, 150))}`);
                console.log(`[claude-chatbot] 🔍 DEBUG: responseBuffer total length = ${responseBuffer.length}`);
                console.log(`[claude-chatbot] 🔍 DEBUG: hasResponse = ${hasResponse}`);

                // 🔥 MODE INTERACTIF: Détection ULTRA-PERMISSIVE pour le mode interactif
                // En mode interactif (sans --print), KiloCode répond puis attend EOF
                // On accepte toute réponse qui a du contenu substantiel
                const hasResponseContent = responseBuffer.length > 30 &&
                    responseBuffer.split('\n').filter(l => l.trim().length > 5).length >= 1;
                console.log(`[claude-chatbot] 🔍 DEBUG: hasResponseContent = ${hasResponseContent}`);

                if (hasResponseContent && !hasResponse) {
                    console.log(`[claude-chatbot] ✅ Response detected (${responseBuffer.length} chars, ${responseBuffer.split('\n').length} lines)`);
                    hasResponse = true;
                    clearTimeout(timeoutId);
                    this.processStdout.off('data', onData);
                    this.claudeProcess.off('error', onError);
                    this.claudeProcess.off('close', onClose);

                    const duration = Date.now() - startTime;
                    const response = responseBuffer.trim();

                    console.log(`[claude-chatbot] ✅ Complete response via stdin/stdout in ${duration}ms`);
                    console.log(`[claude-chatbot] ✅ FINAL RESPONSE: "${response.substring(0, 200)}..."`);
                    resolve({ response, duration });
                }
            };

            const onError = (error: any) => {
                if (!hasResponse) {
                    clearTimeout(timeoutId);
                    this.processStdout?.off('data', onData);
                    this.claudeProcess?.off('error', onError);
                    this.claudeProcess?.off('close', onClose);
                    reject(error);
                }
            };

            const onClose = (code: number) => {
                if (!hasResponse) {
                    clearTimeout(timeoutId);
                    this.processStdout?.off('data', onData);
                    this.claudeProcess?.off('error', onError);
                    this.claudeProcess?.off('close', onClose);

                    // Marquer la session comme morte
                    this.isPersistentMode = false;
                    this.claudeProcess = null;
                    this.processStdin = null;
                    this.processStdout = null;
                    this.currentSessionId = null;

                    if (responseBuffer.length > 10) {
                        const duration = Date.now() - startTime;
                        console.log(`[claude-chatbot] ⏰ Process closed, using partial response after ${duration}ms`);
                        resolve({ response: responseBuffer.trim(), duration });
                    } else {
                        reject(new Error(`Claude process closed with code ${code} - insufficient response`));
                    }
                }
            };

            // Attacher les écouteurs
            this.processStdout.on('data', onData);
            this.claudeProcess.on('error', onError);
            this.claudeProcess.on('close', onClose);

            // ÉCRIRE DIRECTEMENT DANS STDIN - PAS DE COMMANDE
            console.log(`[claude-chatbot] 🔍 DEBUG: processStdin available = ${!!this.processStdin}`);
            console.log(`[claude-chatbot] 🔍 DEBUG: processStdout available = ${!!this.processStdout}`);
            console.log(`[claude-chatbot] 🔍 DEBUG: claudeProcess running = ${this.claudeProcess && !this.claudeProcess.killed}`);
            console.log(`[claude-chatbot] 📤 Envoi du message: "${message}"`);
            this.processStdin.write(message + '\n');
            console.log(`[claude-chatbot] 📤 Envoi du caractère EOF (Ctrl+D)...`);
            this.processStdin.write('\u0004'); // Ctrl+D = EOF
            console.log(`[claude-chatbot] ✅ Message + EOF envoyés, attente de la réponse...`);
            console.log(`[claude-chatbot] 🔍 DEBUG: responseBuffer initial = "${responseBuffer}"`);

            // Timeout de sécurité - RÉDUIT pour debug
            console.log(`[claude-chatbot] 🔍 DEBUG: Setting 30s timeout for testing...`);
            timeoutId = setTimeout(() => {
                console.log(`[claude-chatbot] 🔥🔥🔥 TIMEOUT RÉVEILLÉ ! hasResponse = ${hasResponse}, responseBuffer = "${responseBuffer}"`);
                if (!hasResponse) {
                    console.log(`[claude-chatbot] 🔥🔥🔥 TIMEOUT - Pas de réponse reçue !`);
                    console.log(`[claude-chatbot] 🔥🔥🔥 responseBuffer length = ${responseBuffer.length}`);
                    console.log(`[claude-chatbot] 🔥🔥🔥 responseBuffer content = "${responseBuffer}"`);
                    this.processStdout?.off('data', onData);
                    this.claudeProcess?.off('error', onError);
                    this.claudeProcess?.off('close', onClose);

                    // ACCEPTATION plus permissive pour KiloCode - seuil plus bas
                    if (responseBuffer.length > 5) {
                        const duration = Date.now() - startTime;
                        console.log(`[claude-chatbot] ⏰ Timeout, using partial response after ${duration}ms (${responseBuffer.length} chars)`);
                        resolve({ response: responseBuffer.trim(), duration });
                    } else {
                        console.log(`[claude-chatbot] 🔥🔥🔥 REJET - Pas assez de contenu dans responseBuffer`);
                        reject(new Error('Claude timeout - no response received'));
                    }
                }
            }, 30000); // 30 secondes pour debug (plus rapide)
        });
    }


    /**
     * Main chat method with PERSISTENT MODE using session-id
     * CONFORME À LA DOC: docs/README_CLAUDE.md
     * - Mode one-shot avec --session-id pour maintenir le contexte
     * - Premier message: obtenir session_id de la réponse
     * - Messages suivants: réutiliser le même session_id
     */
    async chat(request: ChatRequest): Promise<ChatResponse> {
        console.log(`[claude-chatbot] 🚀 CHAT START pour ${request.username || 'User'}: "${request.message.substring(0, 50)}..."`);

        try {
            let rawOutput: string;
            const startTime = Date.now();

            // 🔥 MODE PERSISTANT AVEC --CONTINUE (CONFORME DOC)
            console.log(`[claude-chatbot] 🔄 MODE --CONTINUE - Persistance avec continue`);

            // Vérifier si c'est le premier message
            const isFirst = this.isFirstMessage(request.userId);
            console.log(`[claude-chatbot] 📝 First message: ${isFirst}`);

            // Exécuter en mode one-shot avec --continue si pas premier
            const result = await this.executeClaudeOneShot(
                request.message,
                isFirst,
                request.userId,
                request.username
            );
            rawOutput = result.stdout;

            // Marquer qu'on a reçu un message (pour les suivants)
            this.markMessageReceived(request.userId);

            console.log(`[claude-chatbot] ✅ Réponse session-id reçue en ${Date.now() - startTime}ms (${rawOutput.length} chars)`);

            console.log(`[claude-chatbot] ✅ Response received (${rawOutput.length} chars)`);

            // Clean and parse the JSON response from Claude
            console.log(`[claude-chatbot] 🧹 Appel cleanAndParseClaudeStream...`);
            let cleanResponse = this.cleanAndParseClaudeStream(rawOutput);

            // 🔥 ANTI-ECHO: Si on détecte un écho, c'est que le processus s'est terminé trop tôt
            // On ne peut pas relancer ici facilement, donc on retourne un message d'erreur
            if (cleanResponse === '[ECHO_DETECTED_WAIT_FOR_REAL_RESPONSE]') {
                console.log(`[claude-chatbot] 🚫 Echo détecté - le processus s'est terminé trop tôt`);
                console.log(`[claude-chatbot] 💡 Solution: Modifier la commande pour éviter l'écho`);
                throw new Error('ECHO_DETECTED - Claude process terminated too early. Need to fix command to avoid echo.');
            }

            console.log(`[claude-chatbot] 🧹 Clean Response: "${cleanResponse.substring(0, 50)}..."`);

            // Parse the response - passer le message original pour l'extraction de sondages
            console.log(`[claude-chatbot] 🔄 Appel parseChatResponse...`);
            const finalResponse = await this.parseChatResponse(cleanResponse, request.message);
            console.log(`[claude-chatbot] ✅ CHAT END - Réponse prête (${finalResponse.messages.length} messages)`);

            return finalResponse;

        } catch (error) {
            console.error('[claude-chatbot] ❌ Erreur chat:', error);
            console.error('[claude-chatbot] 📋 Stack:', error instanceof Error ? error.stack : 'No stack');
            throw new Error(`Chat failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // PAS DE MODE CLASSIC - UNIQUEMENT MODE PERSISTANT
// chatClassic supprimé - PAS DE FALLBACK EN DÉVELOPPEMENT

    /**
     * Clean and parse Claude JSON stream output
     */
    private cleanAndParseClaudeStream(rawOutput: string): string {
        console.log(`[claude-chatbot] 🔍 RAW OUTPUT: ${rawOutput.substring(0, 500)}...`);

        // Remove ANSI codes (colors, cursor movements)
        const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
        const cleanRaw = rawOutput.replace(ansiRegex, '');

        console.log(`[claude-chatbot] 🧹 Clean raw: ${cleanRaw.substring(0, 500)}...`);

        // 🔥 ANTI-ECHO: Détecter et rejeter les échos du echo "message" | claude.cmd
        const isEcho = cleanRaw.includes('echo ') && cleanRaw.includes('| claude.cmd') ||
                       cleanRaw.includes('peu tu recrie') ||
                       cleanRaw.includes('peu tu recrire') ||
                       (cleanRaw.trim().startsWith('"') && cleanRaw.trim().endsWith('"') && cleanRaw.length < 200);

        if (isEcho) {
            console.log(`[claude-chatbot] 🚫 ECHO DETECTED - Returning special marker`);
            console.log(`[claude-chatbot] 🔍 Echo content: ${cleanRaw.substring(0, 100)}...`);
            // Retourner une chaîne avec un marqueur spécial pour signaler que c'est un écho
            return '[ECHO_DETECTED_WAIT_FOR_REAL_RESPONSE]';
        }

        // 🔥 CORRECTION: Chercher directement le JSON complet d'abord
        if (cleanRaw.trim().startsWith('{') && cleanRaw.trim().endsWith('}')) {
            try {
                const event = JSON.parse(cleanRaw.trim());
                console.log(`[claude-chatbot] 📋 Full JSON parsed:`, Object.keys(event));

                // Format Claude Code: {"type":"result","result":"content",...}
                if (event.result && typeof event.result === 'string') {
                    console.log(`[claude-chatbot] ✅ Found result string (${event.result.length} chars)`);
                    return event.result;
                }

                // Format alternatif: {"content":"..."}
                if (event.content && typeof event.content === 'string') {
                    console.log(`[claude-chatbot] ✅ Found content string (${event.content.length} chars)`);
                    return event.content;
                }

                // Format alternatif: {"text":"..."}
                if (event.text && typeof event.text === 'string') {
                    console.log(`[claude-chatbot] ✅ Found text string (${event.text.length} chars)`);
                    return event.text;
                }
            } catch (error) {
                console.log(`[claude-chatbot] ⚠️ Failed to parse full JSON:`, error instanceof Error ? error.message : String(error));
            }
        }

        const lines = cleanRaw.split('\n');
        let finalContent = '';

        console.log(`[claude-chatbot] 🔍 cleanAndParseClaudeStream: processing ${lines.length} lines`);

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            try {
                // Look for valid JSON (sometimes attached to remaining text)
                const jsonMatch = trimmed.match(/(\{[\s\S]*?\})/);
                if (jsonMatch) {
                    const jsonStr = jsonMatch[1];
                    console.log(`[claude-chatbot] 🔍 JSON match found: ${jsonStr.substring(0, 200)}...`);
                    const event = JSON.parse(jsonStr);

                    console.log(`[claude-chatbot] 📋 Parsed JSON event:`, Object.keys(event));

                    // Claude format: {"result": "...", "session_id": "..."}
                    if (event.result && typeof event.result === 'string') {
                        finalContent = event.result;
                        console.log(`[claude-chatbot] ✅ Found result content (${finalContent.length} chars)`);
                        break;
                    }

                    // Also check for content field
                    if (event.content && typeof event.content === 'string') {
                        finalContent = event.content;
                        console.log(`[claude-chatbot] ✅ Found content field (${finalContent.length} chars)`);
                        break;
                    }

                    // Check for text field
                    if (event.text && typeof event.text === 'string') {
                        finalContent = event.text;
                        console.log(`[claude-chatbot] ✅ Found text field (${finalContent.length} chars)`);
                        break;
                    }
                }
            } catch (error) {
                console.log(`[claude-chatbot] ⚠️ Failed to parse JSON on line: ${trimmed.substring(0, 100)}...`);
                // Continue to next line if JSON parsing fails
                continue;
            }
        }

        if (!finalContent) {
            console.log(`[claude-chatbot] ❌ No structured content found in Claude response`);
            console.log(`[claude-chatbot] 🔍 Available lines:`);
            lines.forEach((line, i) => {
                if (line.trim()) console.log(`  ${i}: ${line.substring(0, 100)}`);
            });
            finalContent = cleanRaw.trim();
        }

        console.log(`[claude-chatbot] 🏁 Final content length: ${finalContent.length}`);
        console.log(`[claude-chatbot] 🏁 Final content preview: ${finalContent.substring(0, 100)}...`);
        return finalContent;
    }

    /**
     * Validate JSON response against Discord skills schema
     */
    private validateJsonSchema(response: any): { isValid: boolean; errors?: string[]; data?: any } {
        try {
            // Type definitions in constants (not hardcoded in validation)
            const ALLOWED_TYPES = ['message', 'poll', 'file_upload', 'embed', 'modal', 'buttons', 'rich_message'];

            // Basic validation
            if (!response || typeof response !== 'object') {
                return { isValid: false, errors: ['Response is not an object'] };
            }

            if (!response.type || !ALLOWED_TYPES.includes(response.type)) {
                return {
                    isValid: false,
                    errors: [`Invalid or missing type field. Allowed types: ${ALLOWED_TYPES.join(', ')}`]
                };
            }

            if (!response.content || typeof response.content !== 'string') {
                return { isValid: false, errors: ['Invalid or missing content field'] };
            }

            // Type-specific validation
            const errors: string[] = [];

            switch (response.type) {
                case 'poll':
                    if (!response.poll || !response.poll.question || !response.poll.options) {
                        errors.push('Poll missing required fields (question, options)');
                    }
                    if (response.poll.options && (!Array.isArray(response.poll.options) || response.poll.options.length < 2)) {
                        errors.push('Poll must have at least 2 options');
                    }
                    break;

                case 'file_upload':
                    if (!response.file || !response.file.name || !response.file.content) {
                        errors.push('File upload missing required fields (name, content)');
                    }
                    break;

                case 'embed':
                    if (response.embed && typeof response.embed !== 'object') {
                        errors.push('Embed must be an object');
                    }
                    break;

                case 'buttons':
                    if (!response.buttons || !response.buttons.buttons || !Array.isArray(response.buttons.buttons)) {
                        errors.push('Buttons missing required buttons array');
                    }
                    break;
            }

            if (errors.length > 0) {
                return { isValid: false, errors };
            }

            console.log(`[claude-chatbot] ✅ JSON Schema validation passed for type: ${response.type}`);
            return { isValid: true, data: response };

        } catch (error) {
            console.error(`[claude-chatbot] ❌ JSON Schema validation error:`, error);
            return { isValid: false, errors: [`Validation error: ${error instanceof Error ? error.message : String(error)}`] };
        }
    }

    /**
     * Extract and validate JSON from Claude response
     */
    private extractAndValidateJson(text: string): { isValid: boolean; data?: any; errors?: string[] } {
        // Look for JSON in the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return { isValid: false, errors: ['No JSON found in response'] };
        }

        try {
            const jsonData = JSON.parse(jsonMatch[0]);
            const validation = this.validateJsonSchema(jsonData);

            if (validation.isValid) {
                console.log(`[claude-chatbot] ✅ JSON extracted and validated successfully`);
                return { isValid: true, data: validation.data };
            } else {
                console.log(`[claude-chatbot] ⚠️ JSON extracted but validation failed:`, validation.errors);
                return { isValid: false, errors: validation.errors };
            }
        } catch (parseError) {
            console.error(`[claude-chatbot] ❌ JSON parsing error:`, parseError);
            return { isValid: false, errors: [`JSON parsing error: ${parseError instanceof Error ? parseError.message : String(parseError)}`] };
        }
    }

    /**
     * Parse chat response and extract structured data
     * @param response - La réponse de l'IA
     * @param originalUserMessage - Le message original de l'utilisateur (pour extraction de sondages)
     */
    private async parseChatResponse(response: unknown, originalUserMessage?: string): Promise<ChatResponse> {
        let textToClean = "";
        let hasStructured = false;
        let jsonBlocks: any[] | undefined;

        console.log(`[claude-chatbot] 🔍 parseChatResponse: input type=${typeof response}`);

        // If response is an object with text
        if (typeof response === 'object' && response !== null) {
            const resp = response as Record<string, unknown>;

            // Look for text in different possible properties
            if (resp.text && typeof resp.text === 'string') {
                textToClean = resp.text;
                hasStructured = resp.hasStructured === true;
                jsonBlocks = resp.jsonBlocks as any[];
                console.log(`[claude-chatbot] ✅ Found text field in object (${textToClean.length} chars)`);
            }
            else if (resp.content && typeof resp.content === 'string') {
                textToClean = resp.content;
                console.log(`[claude-chatbot] ✅ Found content field in object (${textToClean.length} chars)`);
            }
            else if (resp.result && typeof resp.result === 'string') {
                textToClean = resp.result;
                console.log(`[claude-chatbot] ✅ Found result field in object (${textToClean.length} chars)`);
            }
        }
        else if (typeof response === 'string') {
            textToClean = response;
            console.log(`[claude-chatbot] ✅ Response is string (${textToClean.length} chars)`);
        }

        // If still no content, throw error - no fallback
        if (!textToClean) {
            console.log(`[claude-chatbot] ❌ No content found in Claude response`);
            throw new Error('No content found in Claude response');
        }

        console.log(`[claude-chatbot] 🔄 parseChatResponse: text length=${textToClean.length}, hasStructured=${hasStructured}`);
        console.log(`[claude-chatbot] 📝 Content preview: "${textToClean.substring(0, 100)}..."`);

        // Try to extract and validate JSON Schema response first
        const jsonValidation = this.extractAndValidateJson(textToClean);
        if (jsonValidation.isValid && jsonValidation.data) {
            console.log(`[claude-chatbot] 🎯 Using validated JSON Schema response: ${jsonValidation.data.type}`);
            return await this.convertJsonToChatResponse(jsonValidation.data);
        }

        // Check if this is raw JSON from Claude that needs to be parsed (legacy format)
        if (textToClean.trim().startsWith('{') && textToClean.includes('"result"')) {
            console.log(`[claude-chatbot] 🔍 Detecting raw JSON response, parsing...`);
            try {
                const parsed = JSON.parse(textToClean);
                if (parsed.result && typeof parsed.result === 'string') {
                    console.log(`[claude-chatbot] ✅ Extracted result from JSON (${parsed.result.length} chars)`);
                    textToClean = parsed.result;

                    // Try to validate the extracted result
                    const resultValidation = this.extractAndValidateJson(parsed.result);
                    if (resultValidation.isValid && resultValidation.data) {
                        return await this.convertJsonToChatResponse(resultValidation.data);
                    }
                }
            } catch (error) {
                console.log(`[claude-chatbot] ⚠️ Failed to parse JSON response, using as-is`);
            }
        }

        return await this.cleanChatResponse(textToClean, jsonBlocks, originalUserMessage);
    }

    /**
     * Convert validated JSON Schema data to ChatResponse format
     */
    private async convertJsonToChatResponse(jsonData: any): Promise<ChatResponse> {
        console.log(`[claude-chatbot] 🔄 Converting JSON Schema response: ${jsonData.type}`);

        const baseResponse: ChatResponse = {
            messages: [jsonData.content || '']
        };

        switch (jsonData.type) {
            case 'poll':
                if (jsonData.poll) {
                    baseResponse.poll = {
                        question: jsonData.poll.question,
                        options: jsonData.poll.options.map((opt: any) => ({
                            text: opt.text,
                            emoji: opt.emoji
                        })),
                        duration: jsonData.poll.duration || 3600,
                        allowMultiselect: jsonData.poll.allow_multiselect || false
                    };
                }
                break;

            case 'file_upload':
                if (jsonData.file) {
                    baseResponse.fileUpload = {
                        type: 'file_upload',
                        fichier: {
                            name: jsonData.file.name,
                            content: jsonData.file.content,
                            type: jsonData.file.type || 'text'
                        }
                    };
                }
                break;

            case 'embed':
                if (jsonData.embed) {
                    baseResponse.discordMessage = {
                        type: 'message_enrichi',
                        embed: jsonData.embed
                    };
                }
                break;

            case 'buttons':
                if (jsonData.buttons) {
                    baseResponse.discordMessage = {
                        type: 'message_enrichi',
                        buttons: jsonData.buttons.buttons || []
                    };
                }
                break;

            case 'rich_message':
                if (jsonData.embed || jsonData.buttons || jsonData.code_blocks) {
                    baseResponse.discordMessage = {
                        type: 'message_enrichi',
                        embed: jsonData.embed,
                        buttons: jsonData.buttons?.buttons || []
                    };

                    // Handle code blocks in rich messages
                    if (jsonData.code_blocks && jsonData.code_blocks.length > 0) {
                        baseResponse.fileUpload = {
                            type: 'file_upload',
                            fichier: {
                                name: `sniper_code_${Date.now()}.${jsonData.code_blocks[0].language}`,
                                content: jsonData.code_blocks[0].code,
                                type: jsonData.code_blocks[0].language as 'python' | 'javascript' | 'typescript' | 'json' | 'txt'
                            }
                        };
                    }
                }
                break;

            case 'modal':
                if (jsonData.modal) {
                    baseResponse.discordMessage = {
                        type: 'message_enrichi',
                        modal: jsonData.modal
                    };
                }
                break;
        }

        // Add mentions if present
        if (jsonData.mentions && jsonData.mentions.length > 0) {
            // Add mentions to content
            baseResponse.messages[0] += ' ' + jsonData.mentions.join(' ');
        }

        // Add reactions if present
        if (jsonData.reactions && jsonData.reactions.length > 0) {
            // Store reactions for later processing by Discord bot
            (baseResponse as any).reactions = jsonData.reactions;
        }

        console.log(`[claude-chatbot] ✅ JSON conversion completed for type: ${jsonData.type}`);
        return baseResponse;
    }

    /**
     * Extract structured data from text for export
     */
    private extractStructuredData(text: string): any | null {
        try {
            // Chercher des patterns de données structurées
            const lines = text.split('\n');
            const data: any = {
                timestamp: new Date().toISOString(),
                source: 'Sniper Bot Analysis',
                data: []
            };

            for (const line of lines) {
                // Pattern: prix: 4500.25
                const priceMatch = line.match(/(?:prix|price|level)[\s:]*([\d.]+)/i);
                if (priceMatch) {
                    data.data.push({
                        type: 'price',
                        value: parseFloat(priceMatch[1]),
                        timestamp: new Date().toISOString()
                    });
                }

                // Pattern: RSI: 65.4
                const indicatorMatch = line.match(/(RSI|MACD|VOLUME)[\s:]*([\d.]+)/i);
                if (indicatorMatch) {
                    data.data.push({
                        type: 'indicator',
                        name: indicatorMatch[1],
                        value: parseFloat(indicatorMatch[2]),
                        timestamp: new Date().toISOString()
                    });
                }

                // Pattern: Signal: BUY/SELL
                const signalMatch = line.match(/(?:signal|alerte)[\s:]*(BUY|SELL|HOLD|ACHAT|VENTE|ATTENTE)/i);
                if (signalMatch) {
                    data.data.push({
                        type: 'signal',
                        value: signalMatch[1],
                        timestamp: new Date().toISOString()
                    });
                }
            }

            return data.data.length > 0 ? data : null;
        } catch (error) {
            console.warn(`[claude-chatbot] ⚠️ Error extracting structured data:`, error);
            return null;
        }
    }

    /**
     * Clean chat response and extract structured data with validation
     * @param text - La réponse de l'IA
     * @param jsonBlocks - Blocs JSON extraits
     * @param originalUserMessage - Le message original de l'utilisateur (pour extraction de sondages)
     */
    private async cleanChatResponse(text: string, jsonBlocks?: any[], originalUserMessage?: string): Promise<ChatResponse> {
        console.log(`[claude-chatbot] 🧹 Starting cleanChatResponse with ${text.length} chars`);
        if (originalUserMessage) {
            console.log(`[claude-chatbot] 📝 Original user message: "${originalUserMessage.substring(0, 100)}..."`);
        }

        let content = text;
        let pollData: PollData | undefined;
        let messageEnrichi: any = undefined;
        let discordMessageData: any = undefined;
        let fileUploadData: FileUploadData | undefined;

        // 🎯 DÉTECTION AUTOMATIQUE DES INTENTIONS DISCORD
        console.log(`[claude-chatbot] 🔍 Analysing Discord intents in response...`);

        // Détection de blocs de code
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        const codeMatches = [...text.matchAll(codeBlockRegex)];

        if (codeMatches.length > 0) {
            console.log(`[claude-chatbot] 📝 Detected ${codeMatches.length} code blocks`);
            const codeBlocks = codeMatches.map(match => ({
                language: match[1] || 'text',
                code: match[2].trim()
            }));

            fileUploadData = {
                type: 'file_upload',
                fichier: {
                    name: `sniper_code_${Date.now()}.${codeBlocks[0].language}`,
                    content: codeBlocks[0].code,
                    type: codeBlocks[0].language as 'python' | 'javascript' | 'typescript' | 'json' | 'txt'
                }
            };
        }

        // Détection de demande d'embed/rapport
        const embedKeywords = ['rapport', 'analyse', 'signal', 'alerte', 'résumé', 'présentation'];
        if (embedKeywords.some(keyword => text.toLowerCase().includes(keyword))) {
            console.log(`[claude-chatbot] 🎨 Detected embed intent`);

            // Détection de couleur basée sur le sentiment
            let color = 0x3498db; // Bleu par défaut
            if (text.toLowerCase().includes('haussier') || text.toLowerCase().includes('achat') || text.toLowerCase().includes('buy')) {
                color = 0x2ecc71; // Vert
            } else if (text.toLowerCase().includes('baissier') || text.toLowerCase().includes('vente') || text.toLowerCase().includes('sell')) {
                color = 0xe74c3c; // Rouge
            } else if (text.toLowerCase().includes('alerte') || text.toLowerCase().includes('attention')) {
                color = 0xf39c12; // Jaune
            }

            discordMessageData = {
                type: 'message_enrichi',
                embed: {
                    title: 'Analyse Sniper',
                    description: text.substring(0, 2048),
                    color: color,
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: 'Sniper Bot - ES Futures Trading'
                    }
                }
            };
        }

        // Détection de sondage
        const pollKeywords = ['sondage', 'vote', 'question', 'avis', 'poll'];
        const optionsMatch = text.match(/(?:option|choix)[\s:]*([^\n]+)/gi);

        if (pollKeywords.some(keyword => text.toLowerCase().includes(keyword)) && optionsMatch && optionsMatch.length >= 2) {
            console.log(`[claude-chatbot] 📊 Detected poll intent with ${optionsMatch.length} options`);

            pollData = {
                question: text.split('\n')[0].replace(/[📊🗳️]/g, '').trim(),
                options: optionsMatch.slice(0, 4).map((opt, i) => ({
                    text: opt.replace(/(?:option|choix)[\s:]*/i, '').trim(),
                    emoji: ['📈', '📉', '⏸️', '🔄'][i] || '📊'
                })),
                duration: 3600, // 1 heure
                allowMultiselect: false
            };
        }

        // Détection de demande d'export de données
        const exportKeywords = ['exporte', 'csv', 'json', 'tableau', 'données'];
        if (exportKeywords.some(keyword => text.toLowerCase().includes(keyword))) {
            console.log(`[claude-chatbot] 📤 Detected data export intent`);

            // Créer un contenu structuré pour l'export
            const structuredData = this.extractStructuredData(text);
            if (structuredData) {
                fileUploadData = {
                    type: 'file_upload',
                    fichier: {
                        name: `sniper_data_${Date.now()}.json`,
                        content: JSON.stringify(structuredData, null, 2),
                        type: 'json'
                    }
                };
            }
        }

        // 🔥 NOUVEAU: Détection intelligente des sondages basée sur le MESSAGE ORIGINAL DE L'UTILISATEUR
        // On utilise originalUserMessage car c'est là que l'utilisateur demande un sondage
        const messageToCheck = originalUserMessage || text;
        if (messageToCheck.toLowerCase().includes('sondage') && !pollData) {
            console.log(`[claude-chatbot] 📊 Détection de demande de sondage - Extraction depuis le message ORIGINAL`);
            pollData = this.extractPollFromText(messageToCheck);

            // 🔥 NOUVEAU: Désactiver fileUpload quand il y a un sondage
            console.log(`[claude-chatbot] ⏭️ Sondage détecté - Suppression du fileUpload`);
            fileUploadData = undefined;
        }

        // Try to parse JSON blocks if present
        // 🔥 Mais SEULEMENT si on n'a pas déjà détecté un sondage (pour éviter les fileUploads parasites)
        const pollAlreadyDetected = !!pollData;
        if (jsonBlocks && jsonBlocks.length > 0) {
            try {
                for (const block of jsonBlocks) {
                    if (block.type === 'poll' && block.data) {
                        pollData = block.data as PollData;
                    }
                    else if (block.type === 'file' && block.data && !pollAlreadyDetected) {
                        // 🔥 N'attribuer le fileUpload que si pas de sondage détecté
                        fileUploadData = block.data as FileUploadData;
                    }
                    else if (block.type === 'embed' && block.data) {
                        discordMessageData = {
                            type: 'message_enrichi',
                            embed: block.data
                        };
                    }
                }
            } catch (error) {
                console.warn('[claude-chatbot] ⚠️ Error parsing JSON blocks:', error);
            }
        }

        // Return the response with all extracted data
        return {
            messages: [content],
            poll: pollData,
            discordMessage: discordMessageData,
            fileUpload: fileUploadData
        };
    }

    /**
     * Create Discord bot prompt with full context
     */
    private createDiscordBotPrompt(request: ChatRequest): string {
        return `# SNIPER - Bot Discord Analyste Financier


## 🤖 IDENTITÉ
Tu es **Sniper**, un bot Discord intelligent, expert en finance et administrateur du serveur.
Tu es direct, efficace, et tu maîtrises parfaitement tes outils.

## 💼 TES COMPÉTENCES PRINCIPALES
1. **Analyste Financier**: Tu analyses les marchés, cryptos, et actus économiques avec précision.
2. **Développeur Expert**: Tu peux générer, lire et MODIFIER du code.
3. **Admin Discord**: Tu gères les sondages et la modération.

## 📋 RÈGLES D'OR
- **Réponds TOUJOURS en français** (sauf si l'utilisateur demande autre chose).
- **SOIS CONCIS**: Pas de bla-bla inutile.
- **SOIS DIRECT**: Va droit au but.
- **UTILISE LES OUTILS**: Tu as accès à Discord pour sondages, fichiers, etc.

## 🛠️ TES OUTILS DISCORD
- **Sondages**: Création de sondages interactifs avec boutons et durée
- **Messages enrichis**: Emojis, couleurs, fields, images
- **Upload de fichiers**: Code, CSV, JSON, Markdown avec extension automatique
- **Rôles et permissions**: Gestion des membres et réputation

## 💡 RÉPONSE ATTENDUE
Réponds au message de l'utilisateur de manière naturelle et personnalisée. Sois utile, amical et adapté au contexte technique du serveur.

**Message utilisateur**: "${request.message}"
**IMPORTANT**: Réponds directement et complètement sans poser de questions de clarification. Fais des hypothèses raisonnables si nécessaire et donne une réponse utile immédiatement.

Ta réponse (naturelle, pas de formatage spécial):
`;
    }

    /**
     * Get system prompt (sent once at startup for persistent mode)
     */
    private getSystemPrompt(): string {
        return `# SNIPER - Bot Discord Analyste Financier


## 🤖 IDENTITÉ
Tu es **Sniper**, un bot Discord intelligent, expert en finance et administrateur du serveur.
Tu es direct, efficace, et tu maîtrises parfaitement tes outils.

## 💼 TES COMPÉTENCES PRINCIPALES
1. **Analyste Financier**: Tu analyses les marchés, cryptos, et actus économiques avec précision.
2. **Développeur Expert**: Tu peux générer, lire et MODIFIER du code.
3. **Admin Discord**: Tu gères les sondages et la modération.

## 📋 RÈGLES D'OR
- **Réponds TOUJOURS en français** (sauf si l'utilisateur demande autre chose).
- **SOIS CONCIS**: Pas de bla-bla inutile.
- **SOIS DIRECT**: Va droit au but.
- **UTILISE LES OUTILS**: Tu as accès à Discord pour sondages, fichiers, etc.

## 🛠️ TES OUTILS DISCORD
- **Sondages**: Création de sondages interactifs avec boutons et durée
- **Messages enrichis**: Emojis, couleurs, fields, images
- **Upload de fichiers**: Code, CSV, JSON, Markdown avec extension automatique
- **Rôles et permissions**: Gestion des membres et réputation

Tu commences une nouvelle session. Sois prêt à aider avec toutes ces capacités !
`;
    }

    /**
     * Load member profiles from disk with validation
     */
    private async loadMemberProfiles(): Promise<void> {
        try {
            const profilesPath = process.env.MEMBER_PROFILES_PATH ||
                path.join(PROJECT_ROOT, 'member_profiles');

            await fs.mkdir(profilesPath, { recursive: true });

            const files = await fs.readdir(profilesPath);
            let validProfiles = 0;
            let invalidProfiles = 0;

            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(profilesPath, file);

                    try {
                        const data = await fs.readFile(filePath, 'utf-8');
                        const profile = JSON.parse(data);

                        // Validate required fields
                        if (this.validateMemberProfile(profile)) {
                            this.memberProfiles.set(profile.id, profile);
                            validProfiles++;
                        } else {
                            console.warn(`[claude-chatbot] ⚠️ Invalid profile in ${file}: missing required fields`);
                            invalidProfiles++;
                        }
                    } catch (parseError) {
                        console.warn(`[claude-chatbot] ⚠️ Failed to parse ${file}:`, parseError);
                        invalidProfiles++;
                    }
                }
            }

            console.log(`[claude-chatbot] 📊 Loaded ${validProfiles} member profiles (${invalidProfiles} invalid)`);
        } catch (error) {
            console.warn('[claude-chatbot] ⚠️ Could not load member profiles:', error);
        }
    }

    /**
     * Validate member profile structure
     */
    private validateMemberProfile(profile: any): profile is MemberProfile {
        // Check required fields
        if (!profile ||
            typeof profile !== 'object' ||
            typeof profile.username !== 'string' ||
            typeof profile.id !== 'string' ||
            typeof profile.discriminator !== 'string' ||
            typeof profile.joinedAt !== 'string') {
            return false;
        }

        // Validate optional fields if present
        if (profile.nickname && typeof profile.nickname !== 'string') {
            return false;
        }

        if (profile.messages && !Array.isArray(profile.messages)) {
            return false;
        }

        // All checks passed
        return true;
    }

    /**
     * 🔥 NOUVEAU: Extrait intelligemment les données d'un sondage depuis le texte
     * Cette fonction retourne toujours un PollData (jamais null/undefined)
     */
    private extractPollFromText(text: string): PollData {
        console.log(`[claude-chatbot] 🔍 Extraction de sondage depuis: "${text.substring(0, 150)}..."`);

        // Patterns améliorés pour extraire la question
        const patterns = [
            // Pattern 1: "sondage: "question" avec options"
            /sondage[:\s]*["']([^"']+)["']/i,
            // Pattern 2: "sondage sur X avec Y options" - extrait "X" comme sujet
            /sondage\s+(?:sur|concernant|à propos de)\s+(.+?)\s+avec\s+\d+\s+options?/i,
            // Pattern 3: "sondage sur X" sans options spécifiées
            /sondage\s+(?:sur|concernant|à propos de)\s+([^,]+?)(?:\s+avec|\s+options|\s+durée|$)/i,
            // Pattern 4: "sondage: question" (sans guillemets, avant "avec")
            /sondage[:\s]+([^"']+?)\s+avec/i,
            // Pattern 5: Fallback "sondage X"
            /sondage[:\s]+(.+?)(?:\s+avec|\s+options|\s+durée|$)/i
        ];

        let question = '';
        let match;

        for (let i = 0; i < patterns.length; i++) {
            const pattern = patterns[i];
            match = text.match(pattern);
            if (match && match[1] && match[1].trim().length > 3) {
                question = match[1].trim();
                console.log(`✅ Question extraite avec pattern ${i + 1}: "${question}"`);
                break;
            }
        }

        if (!question) {
            // Fallback: créer une question générique basée sur le contexte
            console.log(`⚠️ Pas de pattern trouvé, création générique`);
            if (text.toLowerCase().includes('vix')) {
                question = "Le VIX va-t-il dépasser 25 cette semaine ?";
            } else if (text.toLowerCase().includes('es futures') || text.toLowerCase().includes('sp500') || text.toLowerCase().includes('marché')) {
                question = "Quelle est la direction du marché cette semaine ?";
            } else if (text.toLowerCase().includes('bitcoin') || text.toLowerCase().includes('btc')) {
                question = "Quelle est votre prévision pour Bitcoin ?";
            } else {
                question = "Votre opinion ?";
            }
        } else {
            // Nettoyer la question
            question = question.replace(/^(crée un sondage sur|un sondage sur|sur|regarding|concernant|à propos de)\s+/i, '');
            question = question.replace(/['"']/g, '').trim();

            // Ajouter un point d'interrogation si absent
            if (!question.endsWith('?') && !question.endsWith('!')) {
                question += ' ?';
            }

            // Si la question est trop longue, la tronquer
            if (question.length > 300) {
                console.log(`⚠️ Question trop longue (${question.length} chars), troncature`);
                question = question.substring(0, 297) + '...';
            }
        }

        console.log(`✅ Question finale: "${question}"`);

        // Extraire la durée si spécifiée (résultat en HEURES pour Discord)
        let durationHours = 48; // 2 jours par défaut
        const durationMatch = text.match(/durée\s+(\d+)\s*(h|heure|heures|min|minutes?|j|jour|jours)?/i);
        if (durationMatch) {
            const value = parseInt(durationMatch[1]);
            const unit = durationMatch[2]?.toLowerCase() || 'h';
            if (unit.startsWith('min')) {
                durationHours = Math.max(1, Math.ceil(value / 60)); // minimum 1 heure
            } else if (unit.startsWith('j')) {
                durationHours = value * 24;
            } else {
                durationHours = value;
            }
            console.log(`✅ Durée extraite: ${value} ${unit} = ${durationHours} heures`);
        }

        // 🔥 NOUVEAU: Extraire le channel mentionné (optionnel)
        const channelMention = this.extractChannelFromText(text);

        // Extraire les options
        const options = this.extractOptionsFromText(text);

        // Créer l'objet poll
        const pollData: PollData = {
            question: question,
            options: options,
            duration: durationHours, // Durée en heures pour Discord
            allowMultiselect: false,
            channelId: channelMention
        };

        if (channelMention) {
            console.log(`✅ Sondage sera envoyé dans le channel: ${channelMention}`);
        }

        console.log(`✅ Sondage extrait: "${pollData.question}" avec ${options.length} options`);
        return pollData;
    }

    /**
     * Extrait les options depuis le texte
     */
    private extractOptionsFromText(text: string): PollOption[] {
        const options: PollOption[] = [];
        console.log(`[claude-chatbot] 🔍 Extraction d'options depuis: "${text.substring(0, 150)}..."`);

        // Pattern 1: "avec X options: a, b, c" ou "avec X options a, b, c"
        const optionsPattern1 = /avec\s+(\d+)\s+options?[:\s]+(.+?)(?:\s+durée|\s+duration|$)/i;
        const match1 = text.match(optionsPattern1);

        if (match1) {
            console.log(`✅ Pattern 1 match: ${match1[1]} options -> "${match1[2]}"`);
            const optionsText = match1[2];
            // Diviser par virgules, "/" ou "et"
            const optionList = optionsText.split(/[,;\/]|\s+et\s+/i)
                .map(opt => opt.trim())
                .filter(opt => opt.length > 0 && opt.length < 80); // Filtrer les options trop longues

            for (const opt of optionList) {
                if (options.length < 10) { // Max 10 options Discord
                    options.push({
                        text: opt,
                        emoji: this.getOptionEmoji(options.length)
                    });
                }
            }
            console.log(`✅ ${options.length} options extraites avec pattern 1`);
        }

        // Pattern 2: "options: a, b, c" ou "options a, b, c"
        if (options.length === 0) {
            const optionsPattern2 = /options?[:\s]+(.+?)(?:\s+durée|\s+duration|$)/i;
            const match2 = text.match(optionsPattern2);
            if (match2) {
                console.log(`✅ Pattern 2 match: "${match2[1]}"`);
                const optionsText = match2[1];
                const optionList = optionsText.split(/[,;\/]|\s+et\s+/i)
                    .map(opt => opt.trim())
                    .filter(opt => opt.length > 0 && opt.length < 80);

                for (const opt of optionList) {
                    if (options.length < 10) {
                        options.push({
                            text: opt,
                            emoji: this.getOptionEmoji(options.length)
                        });
                    }
                }
                console.log(`✅ ${options.length} options extraites avec pattern 2`);
            }
        }

        // Pattern 3: "oui/non" format
        if (options.length === 0) {
            const yesNoMatch = text.match(/oui\s*[\/,]\s*non/i);
            if (yesNoMatch) {
                console.log(`✅ Pattern oui/non détecté`);
                options.push({ text: "Oui", emoji: "✅" });
                options.push({ text: "Non", emoji: "❌" });
            }
        }

        // Fallback: options génériques
        if (options.length === 0) {
            console.log(`⚠️ Aucune option extraite, utilisation des options par défaut (Oui/Non)`);
            options.push({ text: "Oui", emoji: "✅" });
            options.push({ text: "Non", emoji: "❌" });
        }

        return options;
    }

    /**
     * 🔥 NOUVEAU: Extrait la mention de channel depuis le texte
     * Supporte: #channel, dans #channel, sur #channel, ID: 123456789
     */
    private extractChannelFromText(text: string): string | undefined {
        // Patterns pour détecter les mentions de channel
        const channelPatterns = [
            /dans\s+#([a-zA-Z0-9-]+)/i,           // "dans #trading"
            /sur\s+#([a-zA-Z0-9-]+)/i,            // "sur #general"
            /à\s+#([a-zA-Z0-9-]+)/i,              // "à #annonces"
            /<#(\d{18,19})>/,                      // Mention Discord directe: <#123456789>
            /ID:\s*(\d{18,19})/i,                  // "ID: 123456789"
            /channel\s+#([a-zA-Z0-9-]+)/i         // "channel #test"
        ];

        for (const pattern of channelPatterns) {
            const match = text.match(pattern);
            if (match) {
                const channelId = match[1];
                console.log(`✅ Channel détecté: ${channelId}`);
                return channelId;
            }
        }

        console.log(`ℹ️ Aucun channel spécifié, utilisation du channel par défaut`);
        return undefined;
    }

    /**
     * Retourne un emoji valide pour Discord Polls
     * Note: Discord n'accepte que certains emojis Unicode simples pour les sondages
     */
    private getOptionEmoji(index: number): string {
        // Emojis valides pour les sondages Discord (pas les emojis numériques composés)
        const emojis = ["🔵", "🟢", "🟡", "🟠", "🔴", "🟣", "⚪", "⚫", "🟤", "💎"];
        return emojis[index] || "📊";
    }
}
