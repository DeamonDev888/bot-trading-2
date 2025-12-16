
import { Client, GatewayIntentBits, Message, EmbedBuilder, ChannelType } from 'discord.js';
import { MarkdownRenderer } from './MarkdownRenderer.js';
import dotenv from 'dotenv';
import cron from 'node-cron';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { pathToFileURL } from 'url';
import { PersistentSessionManager } from './PersistentSessionManager.js';
import { ClaudeCommandHandler } from './ClaudeCommandHandler.js';
import { ChatResponse, PollData, ChatRequest, ClaudeChatBotAgentEnhanced } from '../backend/agents/ClaudeChatBotAgentEnhanced.js';
import { DiscordPollManager } from './DiscordPollManager.js';
import { DiscordInteractionHandler, PredfinedHandlers } from './DiscordInteractionHandler.js';
// import { TradingEconomicsScraper } from '../backend/ingestion/TradingEconomicsScraper.js';
import { RougePulseAgent } from '../backend/agents/RougePulseAgent.js';
// import { CalendarPublisher } from '../backend/agents/CalendarPublisher.js';
import { FileUploadData } from './DiscordFileUploader.js';
import { CodeFileManager } from './CodeFileManager.js';
import { DiscordClientManager } from './DiscordClientManager.js';
import { discordLogger } from './DiscordLogger.js';
import { logAnalyzer } from './LogAnalyzer.js';

// === GESTION DE LA BOUCLE VERTUEUSE ===
const ENABLE_BOUCLE_VERTUEUSE = process.argv.includes('--boucle');
console.log(`🔄 Boucle vertueuse: ${ENABLE_BOUCLE_VERTUEUSE ? '✅ ACTIVÉE' : '❌ DÉSACTIVÉE (utilisez --boucle pour activer)'}`);

// Charger les variables d'environnement
console.log('1. Starting bot...');
try {
    dotenv.config();
    console.log('2. Dotenv loaded successfully');
    console.log('3. Environment variables check:');
    console.log('   - DISCORD_TOKEN:', process.env.DISCORD_TOKEN ? 'Set' : 'NOT SET');
    console.log('   - ADMIN_USER_ID:', process.env.ADMIN_USER_ID ? 'Set' : 'NOT SET');
    console.log('   - DISCORD_CHANNEL_ID:', process.env.DISCORD_CHANNEL_ID ? 'Set' : 'NOT SET');
} catch (error) {
    console.error('❌ Error loading .env:', error);
    process.exit(1);
}

const execAsync = promisify(exec);
const PID_FILE = path.join(process.cwd(), 'sniper_bot.pid');

// === GESTION DU PROCESSUS UNIQUE ===
async function ensureSingleInstance() {
    console.log('🔒 Vérification instance unique...');
    try {
        // Vérifier si le fichier PID existe
        try {
            await fs.access(PID_FILE);
        } catch {
            // Pas de fichier PID, c'est la première instance
            await fs.writeFile(PID_FILE, process.pid.toString());
            console.log(`📌 PID ${process.pid} enregistré (Nouvelle instance).`);
            return;
        }

        // Lire l'ancien PID
        const pidContent = await fs.readFile(PID_FILE, 'utf-8');
        const oldPid = parseInt(pidContent.trim());

        if (oldPid && !isNaN(oldPid) && oldPid !== process.pid) {
            try {
                // Vérifier si le processus existe encore
                process.kill(oldPid, 0);
                
                console.log(`⚠️ Une autre instance tourne (PID: ${oldPid}). Arrêt forcé...`);
                try {
                    process.kill(oldPid, 'SIGKILL'); // Tuer l'ancien processus
                    console.log(`✅ Instance précédente ${oldPid} tuée.`);
                } catch (killError) {
                    console.error(`❌ Impossible de tuer ${oldPid}:`, killError);
                }
            } catch (_e: any) {
                // Le processus n'existe plus (ESRCH)
                if (_e.code === 'ESRCH') {
                    console.log(`ℹ️ L'ancien PID ${oldPid} n'est plus actif.`);
                }
            }
        }

        // Mettre à jour avec le nouveau PID
        await fs.writeFile(PID_FILE, process.pid.toString());
        console.log(`📌 PID mis à jour: ${process.pid}`);

    } catch (error) {
        console.error('❌ Erreur gestion PID:', error);
    }
}

// Types pour notre système
interface CronJob {
    name: string;
    description: string;
    schedule: string;
    status: 'active' | 'paused' | 'error';
    lastRun?: Date;
    nextRun?: Date;
    executions: number;
    errors: number;
    lastError?: string;
    task: any;
}

interface ConversationMessage {
    content: string;
    timestamp: Date;
    userId: string;
    username?: string;
}

interface ConversationContext {
    userId: string;
    messages: ConversationMessage[];
    lastInteraction: Date;
    topic?: string;
    sentiment?: string;
}

interface ClaudeProcess {
    process?: any;
    pid?: number;
    isAlive: boolean;
    lastUsed: Date;
    sessionCount: number;
}

// Gestionnaire du processus Claude persistant
export class ClaudeProcessManager {
    private process: ClaudeProcess = { isAlive: false, lastUsed: new Date(), sessionCount: 0 };
    private isFirstPrompt: boolean = true;
    private promptHistory: Array<{timestamp: Date, prompt: string, isFirst: boolean}> = [];

    /**
     * Vérifier si un processus Claude est en cours d'exécution
     */
    async checkClaudeProcess(): Promise<boolean> {
        if (!this.process.pid) {
            return false;
        }

        try {
            // Vérifier si le processus existe encore
            process.kill(this.process.pid, 0); // Signal 0 = vérifier si processus existe
            this.process.isAlive = true;
            return true;
        } catch (error) {
            console.log('💀 Processus Claude non trouvé, marqué comme inactif');
            this.process.isAlive = false;
            this.process.pid = undefined;
            return false;
        }
    }

    /**
     * Tuer le processus Claude s'il est actif
     */
    async killClaudeProcess(): Promise<void> {
        if (this.process.isAlive && this.process.pid) {
            try {
                console.log(`💀 Terminaison du processus Claude (PID: ${this.process.pid})...`);

                // Tuer le processus de manière propre
                this.process.process?.kill('SIGTERM');

                // Attendre un peu pour la terminaison
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Si toujours en vie, forcer la terminaison
                if (await this.checkClaudeProcess()) {
                    console.log('💀 Processus Claude toujours actif, force kill...');
                    this.process.process?.kill('SIGKILL');
                }

                this.process = { isAlive: false, lastUsed: new Date(), sessionCount: 0 };
                this.process.pid = undefined;

                console.log('✅ Processus Claude terminé avec succès');
            } catch (error) {
                console.error('❌ Erreur lors de la terminaison de Claude:', error);
            }
        }
    }

    /**
     * Obtenir le PID du processus si actif
     */
    getActivePid(): number | null {
        return this.process.isAlive ? (this.process.pid || null) : null;
    }

    /**
     * Mettre à jour le statut du processus
     */
    updateProcessStatus(pid: number, process?: any): void {
        this.process.pid = pid;
        this.process.process = process;
        this.process.isAlive = true;
        this.process.lastUsed = new Date();
        this.process.sessionCount++;
    }

    /**
     * Obtenir les statistiques du processus
     */
    getProcessStats(): ClaudeProcess {
        return { ...this.process };
    }

    /**
     * Marquer un prompt comme étant le premier ou non
     */
    markPromptAsFirst(isFirst: boolean): void {
        this.isFirstPrompt = isFirst;
    }

    /**
     * Vérifier si le prochain prompt est le premier
     */
    isNextPromptFirst(): boolean {
        return this.isFirstPrompt;
    }

    /**
     * Enregistrer un prompt dans l'historique
     */
    recordPrompt(prompt: string): void {
        this.promptHistory.push({
            timestamp: new Date(),
            prompt: prompt,
            isFirst: this.isFirstPrompt
        });
        // Marquer que le premier prompt a été utilisé
        if (this.isFirstPrompt) {
            this.isFirstPrompt = false;
        }
    }

    /**
     * Obtenir l'historique des prompts
     */
    getPromptHistory(): Array<{timestamp: Date, prompt: string, isFirst: boolean}> {
        return [...this.promptHistory];
    }

    /**
     * Réinitialiser l'état du premier prompt
     */
    resetFirstPromptState(): void {
        this.isFirstPrompt = true;
        this.promptHistory = [];
    }

    /**
     * Nettoyer les anciens prompts (plus de 1 heure)
     */
    cleanupOldPrompts(): void {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        this.promptHistory = this.promptHistory.filter(entry => entry.timestamp >= oneHourAgo);
    }
}


// Bot unifié Sniper Financial
export class SniperFinancialBot {
    private cooldowns: Map<string, number> = new Map();
    private memberProfiles: Map<string, any> = new Map();
    private conversationContexts: Map<string, ConversationContext> = new Map();
    private cronJobs: Map<string, CronJob> = new Map();
    private sessionManager: PersistentSessionManager;
    private claudeHandler: ClaudeCommandHandler;
    private claudeProcessManager: ClaudeProcessManager;
    public pollManager: DiscordPollManager;
    public interactionHandler: DiscordInteractionHandler;
    private discordAgent: any; // Using enhanced agent with robustness patterns
    public isInitialized = false;
    public client: Client | null = null;
    
    // === AGENTS CALENDRIER ÉCONOMIQUE ===
    // private tradingEconomicsScraper: TradingEconomicsScraper;
    private rougePulseAgent: RougePulseAgent;
            // private calendarPublisher: CalendarPublisher;

    // === MUTEX SYSTEM FOR CRON JOBS ===
    private jobLock: {
        isLocked: boolean;
        currentJob: string | null;
        startTime: Date | null;
        queue: string[];
    } = {
        isLocked: false,
        currentJob: null,
        startTime: null,
        queue: []
    };

    constructor() {
        this.claudeHandler = ClaudeCommandHandler.getInstance();
        this.claudeProcessManager = new ClaudeProcessManager();
        this.pollManager = new DiscordPollManager(null as any); // Will be set later when client is available
        this.interactionHandler = new DiscordInteractionHandler();
        // 🔥 UTILISER LE NOUVEL AGENT ROBUSTE avec tous les patterns de résilience
        this.discordAgent = new ClaudeChatBotAgentEnhanced({
          timeoutMs: 30000,
          maxRetries: 3,
          rateLimitMs: 100
        });

        // Initialiser le sessionManager avec le discordAgent pour le mode persistant
        this.sessionManager = new PersistentSessionManager(this.discordAgent);

        // Initialiser les agents du calendrier
        // this.tradingEconomicsScraper = new TradingEconomicsScraper();
        this.rougePulseAgent = new RougePulseAgent();
                   // this.calendarPublisher = new CalendarPublisher();

        this.setupCronJobs();
        this.initializeBot().catch(error => {
            console.error("❌ Sniper: Erreur initialisation:", error);
        });
    }

    /**
     * Set the Discord client for poll manager (called by DiscordClientManager)
     */
    setClient(client: Client): void {
        this.client = client;
        this.pollManager = new DiscordPollManager(client);
    }

    private async initializeBot() {
        // Charger les sessions existantes au démarrage
        await this.sessionManager.loadSessionsState();

        // 🚀 Claude sera initialisé à la première utilisation (mode one-shot)
        console.log('[sniper] 🚀 Claude mode one-shot (initialisation à la demande)...');

        // Charger les profils membres
        await this.loadMemberProfiles().catch(error => {
            console.warn("⚠️ Sniper: Erreur chargement profils:", error);
        });

        console.log("✅ Sniper: Bot initialisé avec succès");
    }

    // ====== INITIALISATION ======

    async loadMemberProfiles() {
        try {
            const profilesDir = path.resolve("member_profiles");
            // Créer le dossier s'il n'existe pas
            try {
                await fs.access(profilesDir);
            } catch {
                await fs.mkdir(profilesDir, { recursive: true });
            }
            
            const files = await fs.readdir(profilesDir);

            for (const file of files) {
                if (file.endsWith('.toon')) {
                    const filePath = path.join(profilesDir, file);
                    const content = await fs.readFile(filePath, 'utf-8');
                    const profile = this.parseProfileContent(content, file);
                    if (profile && profile.username) {
                        this.memberProfiles.set(profile.id, profile);
                        console.log(`✅ Sniper: Profil ${profile.username} (${profile.id})`);
                    }
                }
            }

            console.log(`🤖 Sniper: ${this.memberProfiles.size} profils chargés !`);
        } catch (error) {
            console.warn("⚠️ Sniper: Impossible de charger les profils:", error);
        }
    }

    parseProfileContent(content: string, filename: string): any {
        try {
            const profile: any = {};

            // Parser la ligne member{}
            const memberMatch = content.match(/member\s*\{[^:]*:?\s*([^,]+),([^,]+),([^,]*),([^,]*),([^}]*)\}/);
            if (memberMatch) {
                profile.username = memberMatch[1]?.trim() || '';
                profile.id = memberMatch[2]?.trim() || '';
                profile.discriminator = memberMatch[3]?.trim() || '0';
                profile.nickname = memberMatch[4]?.trim() || undefined;
                profile.joinedAt = memberMatch[5]?.trim() || '';
            }

            // Extraire l'ID depuis le nom de fichier si non trouvé
            const idMatch = filename.match(/_(\d+)_?/);
            if (idMatch && (!profile.id || profile.id === '')) {
                profile.id = idMatch[1];
            }

            return profile.id ? profile : null;
        } catch (error) {
            console.warn(`⚠️ Sniper: Erreur parsing ${filename}:`, error);
            return null;
        }
    }

    // ====== SYSTÈME DE MÉMOIRE DE CONVERSATION ======

    private updateConversationContext(userId: string, message: string, username?: string): ConversationContext {
        const now = new Date();
        let context = this.conversationContexts.get(userId);

        if (!context) {
            context = {
                userId,
                messages: [],
                lastInteraction: now
            };
            this.conversationContexts.set(userId, context);
        }

        // Ajouter le nouveau message
        context.messages.push({
            content: message,
            timestamp: now,
            userId,
            username
        });

        // Garder seulement les 20 derniers messages pour éviter la surcharge
        if (context.messages.length > 20) {
            context.messages = context.messages.slice(-20);
        }

        context.lastInteraction = now;

        // Nettoyer les contextes anciens (plus de 24h)
        this.cleanupOldContexts();

        return context;
    }

    private cleanupOldContexts(): void {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        for (const [userId, context] of this.conversationContexts.entries()) {
            if (context.lastInteraction < twentyFourHoursAgo) {
                this.conversationContexts.delete(userId);
            }
        }
    }

    private getConversationContext(userId: string): ConversationContext | null {
        return this.conversationContexts.get(userId) || null;
    }

    private generateConversationSummary(context: ConversationContext): string {
        if (context.messages.length === 0) return '';

        const recentMessages = context.messages.slice(-5); // 5 derniers messages
        const summary = recentMessages.map(msg => {
            const time = msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            return `[${time}] ${msg.username || 'Utilisateur'}: ${msg.content}`;
        }).join('\n');

        return summary;
    }

    // ====== SYSTÈME DE CRON JOBS ======
  
    setupCronJobs() {
        console.log('⏰ Configuration des cron jobs...');
  
        // Cron job pour X/Twitter scraping - toutes les heures (optimisé pour traiter les posts raw plus rapidement)
        this.createCronJob('x_scraper', 'X/Twitter Scraper', '0 * * * *', async () => {
            console.log('🐦 Démarrage du cycle Scraping OPTIMIZÉ...');

            // 1. SCRAPING & FILTERING (via NewsFilterAgentOptimized avec streaming des logs)
            try {
                const scriptPath = path.resolve(process.cwd(), 'src', 'backend', 'agents', 'NewsFilterAgentOptimized.ts');

                console.log(`🔄 Exécution du NewsFilterAgentOptimized (Scraping + Filtering): ${scriptPath}`);
                console.log(`🕒 Début: ${new Date().toLocaleTimeString()}`);

                // Utiliser spawn pour le streaming des logs en temps réel
                await new Promise<void>((resolve, reject) => {
                    const child = spawn('npx', ['tsx', `"${scriptPath}"`], {
                        cwd: process.cwd(),
                        shell: true,
                        env: process.env
                    });
        
                    const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
                    let timeoutId: NodeJS.Timeout;
        
                    const cleanup = () => {
                        if (timeoutId) clearTimeout(timeoutId);
                    };
        
                    timeoutId = setTimeout(() => {
                        console.log(`🔧 [CRON] Timeout reached (${TIMEOUT_MS}ms) for NewsFilterAgentOptimized, killing process`);
                        child.kill('SIGTERM');
                        setTimeout(() => {
                            if (!child.killed) {
                                console.log(`🔧 [CRON] Force killing process`);
                                child.kill('SIGKILL');
                            }
                        }, 5000);
                        cleanup();
                        reject(new Error(`NewsFilterAgentOptimized timed out after ${TIMEOUT_MS}ms`));
                    }, TIMEOUT_MS);
        
                    child.stdout.on('data', (data) => {
                        const output = data.toString().trim();
                        if (output) console.log(output);
                    });
        
                    child.stderr.on('data', (data) => {
                        const output = data.toString().trim();
                        if (output) console.error(output);
                    });
        
                    child.on('close', (code) => {
                        console.log(`🕒 Fin: ${new Date().toLocaleTimeString()}`);
                        console.log(`🔧 [CRON] Process exited with code: ${code}`);
                        if (code === 0) {
                            console.log('✅ Cycle Agent terminé avec succès.');
                        } else {
                            console.error(`⚠️ Agent terminé avec code: ${code}`);
                        }
                        cleanup();
                        resolve();
                    });
        
                    child.on('error', (err) => {
                        console.error('❌ Erreur de démarrage:', err);
                        console.log(`🔧 [CRON] Spawn error details:`, err);
                        cleanup();
                        reject(err);
                    });
                });

            } catch (error) {
                console.error('❌ Erreur critique lors de l\'exécution de l\'agent:', error);
            }
            
            console.log('🏁 Cycle Scraping terminé.');
        });

        // === CRONS DÉSACTIVÉS (peuvent être réactivés plus tard) ===
        // publisher, ia_scraper, finance_scraper, cleanup sont désactivés
        // Seuls x_scraper et aggregator_pipeline sont actifs
        
        // Cron job pour le pipeline Aggregator global - toutes les 3 heures
        this.createCronJob('aggregator_pipeline', 'Pipeline Aggregator Global', '0 */3 * * *', async () => { await this.runAggregatorPipeline(); });

        // === CRON JOB CALENDRIER ÉCONOMIQUE UNIFIÉ (DÉSACTIVÉ) ===

        // Pipeline calendrier intelligent - tous les jours à 8h ET 11h
        // DÉSACTIVÉ: Le calendrier TradingEconomics a été retiré du pipeline principal
        // this.createCronJob('calendar_pipeline', 'Pipeline Calendrier Économique', '0 8,11 * * *', async () => {
        //     const currentHour = new Date().getHours();
        //     console.log(`🔄 Exécution pipeline calendrier (${currentHour}h)...`);
        //
        //     try {
        //         // Utiliser notre wrapper robuste
        //         const child = spawn('node', [path.join(process.cwd(), 'run-calendar-wrapper.js')], {
        //             stdio: 'inherit',
        //             cwd: process.cwd(),
        //             env: { ...process.env, NODE_ENV: 'production' }
        //         });
        //
        //         child.on('exit', (code) => {
        //             if (code === 0) {
        //                 console.log(`✅ Pipeline calendrier terminé avec succès (${currentHour}h)`);
        //             } else {
        //                 console.error(`❌ Pipeline calendrier échoué avec code ${code} (${currentHour}h)`);
        //             }
        //         });
        //
        //     } catch (error) {
        //         console.error('❌ Erreur pipeline calendrier:', error);
        //     }
        // });

        console.log(`✅ ${this.cronJobs.size} cron jobs actifs (x_scraper + aggregator_pipeline)`);
    }

    async runAggregatorPipeline(): Promise<boolean> {
        console.log('🌐 Démarrage du Pipeline Aggregator Global...');
        
        const runStep = (scriptRelPath: string, stepName: string) => {
            return new Promise<void>((resolve, reject) => {
                console.log(`🚀 [${stepName}] Démarrage...`);
                const scriptPath = path.resolve(process.cwd(), scriptRelPath);

                // Use spawn for real-time output
                const child = spawn('npx', ['tsx', `"${scriptPath}"`], {
                    cwd: process.cwd(),
                    shell: true,
                    env: process.env
                });

                const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes for each step
                let timeoutId: NodeJS.Timeout;

                const cleanup = () => {
                    if (timeoutId) clearTimeout(timeoutId);
                };

                timeoutId = setTimeout(() => {
                    console.log(`🔧 [PIPELINE] Timeout reached (${TIMEOUT_MS}ms) for ${stepName}, killing process`);
                    child.kill('SIGTERM');
                    setTimeout(() => {
                        if (!child.killed) {
                            console.log(`🔧 [PIPELINE] Force killing process`);
                            child.kill('SIGKILL');
                        }
                    }, 5000);
                    cleanup();
                    reject(new Error(`${stepName} timed out after ${TIMEOUT_MS}ms`));
                }, TIMEOUT_MS);

                child.stdout.on('data', (data) => {
                     const output = data.toString();
                      // Filter out noisy npm logs from stdout too if they appear there
                    if (!output.includes('npm warn') && !output.includes('ExperimentalWarning')) {
                        process.stdout.write(output);
                    }
                });

                child.stderr.on('data', (data) => {
                     const output = data.toString();
                     // Basic filtering
                     if (!output.includes('npm warn') && !output.includes('ExperimentalWarning')) {
                         process.stderr.write(output);
                     }
                });

                child.on('error', (err) => {
                    console.error(`❌ [${stepName}] Spawn error:`, err);
                    cleanup();
                    reject(err);
                });

                child.on('close', (code) => {
                    if (code === 0) {
                        console.log(`✅ [${stepName}] Terminé.`);
                        cleanup();
                        resolve();
                    } else {
                        reject(new Error(`[${stepName}] Failed with code ${code}`));
                    }
                });
            });
        };

        try {
            console.log('📥 [1/3] Exécution NewsAggregator...');
            await runStep('src/backend/ingestion/NewsAggregator.ts', 'Aggregator');

            console.log('🧠 [2/3] Filtrage IA...');
            await runStep('src/backend/agents/agregatorfilter.ts', 'Filter');

            console.log('📢 [3/3] Publication Discord...');
            await runStep('src/discord_bot/news_es_publisher.ts', 'Publisher');

            console.log('🎉 Pipeline Aggregator terminé avec succès.');
            return true;
        } catch (error) {
            console.error('❌ Erreur critique Pipeline Aggregator:', error);
            return false;
        }
    }

    /**
     * Acquire lock for a job - returns true if lock acquired, false if another job is running
     */
    private async acquireJobLock(jobName: string): Promise<boolean> {
        if (this.jobLock.isLocked) {
            const runningFor = this.jobLock.startTime 
                ? Math.round((Date.now() - this.jobLock.startTime.getTime()) / 1000)
                : 0;
            
            console.log(`🔒 Job "${jobName}" bloqué - "${this.jobLock.currentJob}" en cours depuis ${runningFor}s`);
            
            // Add to queue if not already there
            if (!this.jobLock.queue.includes(jobName)) {
                this.jobLock.queue.push(jobName);
                console.log(`📋 "${jobName}" ajouté à la file d'attente (${this.jobLock.queue.length} en attente)`);
            }
            
            return false;
        }
        
        // Acquire lock
        this.jobLock.isLocked = true;
        this.jobLock.currentJob = jobName;
        this.jobLock.startTime = new Date();
        console.log(`🔓 Lock acquis pour "${jobName}"`);
        
        return true;
    }
    
    /**
     * Release lock and run next queued job if any
     */
    private releaseJobLock(jobName: string): void {
        if (this.jobLock.currentJob !== jobName) {
            console.warn(`⚠️ Tentative de libérer le lock par "${jobName}" mais "${this.jobLock.currentJob}" le détient`);
            return;
        }
        
        const duration = this.jobLock.startTime 
            ? Math.round((Date.now() - this.jobLock.startTime.getTime()) / 1000)
            : 0;
        
        console.log(`🔓 Lock libéré par "${jobName}" (durée: ${duration}s)`);
        
        // Reset lock
        this.jobLock.isLocked = false;
        this.jobLock.currentJob = null;
        this.jobLock.startTime = null;
        
        // Check if there are queued jobs
        if (this.jobLock.queue.length > 0) {
            const nextJob = this.jobLock.queue.shift()!;
            console.log(`📋 Exécution du job en attente: "${nextJob}" (reste ${this.jobLock.queue.length})`);
            
            // Run the next job asynchronously
            setTimeout(() => {
                this.runCronJobManually(nextJob).catch(err => {
                    console.error(`❌ Erreur job en attente "${nextJob}":`, err);
                });
            }, 1000); // Small delay before next job
        }
    }
    
    /**
     * Get current lock status
     */
    getJobLockStatus(): string {
        if (!this.jobLock.isLocked) {
            return '🔓 Aucun job en cours';
        }
        
        const runningFor = this.jobLock.startTime 
            ? Math.round((Date.now() - this.jobLock.startTime.getTime()) / 1000)
            : 0;
        
        let status = `🔒 **Job en cours**: ${this.jobLock.currentJob} (${runningFor}s)`;
        
        if (this.jobLock.queue.length > 0) {
            status += `\n📋 **File d'attente**: ${this.jobLock.queue.join(', ')}`;
        }
        
        return status;
    }

    createCronJob(name: string, description: string, schedule: string, callback: () => Promise<void>) {
        const job: CronJob = {
            name,
            description,
            schedule,
            status: 'active',
            executions: 0,
            errors: 0,
            task: (cron.schedule as any)(schedule, async () => {
                // === TRY TO ACQUIRE LOCK ===
                const hasLock = await this.acquireJobLock(name);
                if (!hasLock) {
                    console.log(`⏭️ Job "${name}" reporté (autre job en cours)`);
                    return; // Will be queued and run later
                }
                
                console.log(`⏰ Exécution du cron job: ${name}`);
                job.lastRun = new Date();
                job.executions++;

                try {
                    await callback();
                    job.status = 'active';
                    job.lastError = undefined;
                    console.log(`✅ Cron job ${name} terminé avec succès`);
                } catch (error) {
                    job.status = 'error';
                    job.errors++;
                    job.lastError = error instanceof Error ? error.message : String(error);
                    console.error(`❌ Erreur dans le cron job ${name}:`, error);
                } finally {
                    // === ALWAYS RELEASE LOCK ===
                    this.releaseJobLock(name);
                }
            }, {
                scheduled: false
            })
        };

        this.cronJobs.set(name, job);
        job.task.start();
        console.log(`📌 Cron job ${name} configuré avec: ${schedule}`);
    }

    async executeXScraperJob(opmlFile?: string): Promise<boolean> {
        console.log('🐦 Démarrage manuel du scraping X/Twitter...');
  
        try {
            // 1. Exécuter le NewsFilterAgentOptimized (comme dans le cron job automatique)
            const agentScriptPath = path.resolve(process.cwd(), 'src', 'backend', 'agents', 'NewsFilterAgentOptimized.ts');
            console.log(`🔄 [1/2] Exécution du NewsFilterAgentOptimized (Scraping + Filtering): ${agentScriptPath}`);
            console.log(`🕒 Début exécution: ${new Date().toLocaleTimeString()}`);
  
            // Utiliser spawn pour le streaming des logs en temps réel
            // IMPORTANT: On ajoute des guillemets pour gérer les espaces dans les chemins Windows
            const args = ['tsx', `"${agentScriptPath}"`];
            if (opmlFile) {
                args.push(`"${opmlFile}"`);
                console.log(`📁 Utilisation du fichier OPML spécifique: ${opmlFile}`);
            }

            await new Promise<void>((resolve, reject) => {
                const child = spawn('npx', args, {
                    cwd: process.cwd(),
                    shell: true,
                    env: process.env
                });

                const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
                let timeoutId: NodeJS.Timeout;

                const cleanup = () => {
                    if (timeoutId) clearTimeout(timeoutId);
                };

                timeoutId = setTimeout(() => {
                    console.log(`🔧 [MANUAL] Timeout reached (${TIMEOUT_MS}ms) for manual X scraper, killing process`);
                    child.kill('SIGTERM');
                    setTimeout(() => {
                        if (!child.killed) {
                            console.log(`🔧 [MANUAL] Force killing process`);
                            child.kill('SIGKILL');
                        }
                    }, 5000);
                    cleanup();
                    reject(new Error(`Manual X scraper timed out after ${TIMEOUT_MS}ms`));
                }, TIMEOUT_MS);

                child.stdout.on('data', (data) => {
                    const output = data.toString().trim();
                    if (output) console.log(output);
                });

                child.stderr.on('data', (data) => {
                    const output = data.toString().trim();
                    if (output) console.error(output);
                });

                child.on('close', (code) => {
                    console.log(`🕒 Fin exécution: ${new Date().toLocaleTimeString()}`);
                    if (code === 0) {
                        console.log(`✅ Exécution terminée avec code: 0`);
                        console.log('✅ Cycle Agent terminé.');
                        cleanup();
                        resolve();
                    } else {
                        console.error(`❌ Processus terminé avec code erreur: ${code}`);
                        // On ne reject pas pour permettre au publisher de tourner même si le scraper a eu des erreurs partielles
                        cleanup();
                        resolve();
                    }
                });

                child.on('error', (err) => {
                    console.error('❌ Erreur de démarrage du processus:', err);
                    cleanup();
                    reject(err);
                });
            });
  
            // 2. Exécuter le publisher OPTIMIZÉ (comme dans le cron job automatique)
            console.log('📢 [2/2] Démarrage du SimplePublisherOptimized Discord...');
            const publisherPath = path.resolve(process.cwd(), 'src', 'discord_bot', 'SimplePublisherOptimized.ts');
            const publisherUrl = pathToFileURL(publisherPath).href;
            const { SimplePublisherOptimized } = await import(publisherUrl);
            const publisher = new SimplePublisherOptimized();

            const result = await publisher.runPublishingCycleOptimized();
            if (result.success) {
                console.log(`✅ Cycle de publication terminé: ${result.published} messages envoyés.`);
            } else {
                console.error('❌ Erreur Publisher:', result.error);
                return false;
            }
  
            console.log('✅ Scraping X/Twitter manuel terminé avec succès');
            return true;
  
        } catch (error) {
            console.error('❌ Erreur lors de l\'exécution manuelle du scraping X:', error);
            throw error;
        }
    }

    async executeCleanupJob(): Promise<boolean> {
        console.log('🧹 Démarrage du job de nettoyage...');
  
        try {
            // Nettoyer les vieux cooldowns
            const now = Date.now();
            for (const [userId, timestamp] of this.cooldowns.entries()) {
                if (now - timestamp > 3600000) { // Plus d'une heure
                    this.cooldowns.delete(userId);
                }
            }
  
            console.log('✅ Nettoyage terminé');
            return true;
        } catch (error) {
            console.error('❌ Erreur lors du nettoyage:', error);
            return false;
        }
    }
  
    async executePublisherJob(): Promise<boolean> {
        console.log('📢 Démarrage du job de publication manuel (SANS SEUIL)...');
  
        try {
            const publisherPath = path.resolve(process.cwd(), 'src', 'discord_bot', 'SimplePublisherOptimized.ts');
            const publisherUrl = pathToFileURL(publisherPath).href;

            const { SimplePublisherOptimized } = await import(publisherUrl);
            const publisher = new SimplePublisherOptimized();

            // Exécution MANUELLE : seuil = 0 (publier tout ce qui est disponible)
            const result = await publisher.runPublishingCycleOptimized(0);
  
            if (result.success) {
                console.log(`✅ Cycle de publication terminé: ${result.published} messages envoyés.`);
                return true;
            } else {
                console.error('❌ Erreur Publisher:', result.error);
                return false;
            }
  
        } catch (pubError) {
            console.error('❌ Erreur lors du chargement/exécution du publisher:', pubError);
            return false;
        }
    }

    // ====== MÉTHODES CALENDRIER ÉCONOMIQUE ======

    /**
     * Exécute le scraping du calendrier économique
     */
    async executeCalendarScraping(): Promise<boolean> {
        console.log('📅 [SCRAPING] Démarrage du scraping du calendrier économique...');
        console.log('🔍 Vérification de la connexion à Trading Economics...');

        try {
            console.log('🌐 Démarrage du scraping de US Calendar...');
            // const events = await this.tradingEconomicsScraper.scrapeUSCalendar();
            // console.log(`📊 Récupération terminée: ${events.length} événements trouvés`);

            // if (events.length > 0) {
            //     console.log('💾 Sauvegarde des événements en base de données...');
            //     await this.tradingEconomicsScraper.saveEvents(events);
            //     console.log(`✅ [SCRAPING] Terminé avec succès: ${events.length} événements sauvegardés`);
            //     return true;
            // } else {
            //     console.log('⚠️ [SCRAPING] Aucun événement trouvé - possible maintenance site web');
            //     return false;
            // }
            console.log('ℹ️ [SCRAPING] Temporairement désactivé pour débogage');
            return true;
        } catch (error) {
            console.error('❌ [SCRAPING] Erreur détaillée:', error);
            console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
            return false;
        }
    }

    /**
     * Exécute le filtrage expert du calendrier avec RougePulse
     */
    async executeCalendarFiltering(): Promise<boolean> {
        console.log('🔍 Démarrage du filtrage expert du calendrier...');

        try {
            const filteredData = await this.rougePulseAgent.filterCalendarEvents();

            console.log(`✅ Filtrage terminé:`);
            console.log(`   - Événements critiques: ${filteredData.critical_events.length}`);
            console.log(`   - Événements forts: ${filteredData.high_impact_events.length}`);
            console.log(`   - Score volatilité: ${filteredData.volatility_score}/10`);
            console.log(`   - Confiance filtrage: ${(filteredData.metadata.filter_confidence * 100).toFixed(1)}%`);

            return filteredData.metadata.filter_confidence > 0.5;
        } catch (error) {
            console.error('❌ Erreur filtrage calendrier:', error);
            return false;
        }
    }

    /**
     * Exécute la publication du calendrier quotidien
     */
    async executeCalendarPublishing(): Promise<boolean> {
        console.log('📢 Démarrage de la publication du calendrier...');

        try {
            // const result = await this.calendarPublisher.publishDailyCalendar();

            // if (result.success) {
            //     console.log(`✅ Publication réussie: ${result.message}`);

            //     // Nettoyer les anciens messages
            //     await this.calendarPublisher.cleanupOldCalendarMessages();

            //     return true;
            // } else {
            //     console.error(`❌ Échec publication: ${result.error}`);
            // }
            console.log('ℹ️ [CALENDAR] Publication temporairement désactivée');
            return true;
        } catch (error) {
            console.error('❌ Erreur publication calendrier:', error);
            return false;
        }
    }

    /**
     * Exécute la vérification des alertes critiques
     */
    async executeCriticalAlert(): Promise<boolean> {
        console.log('🚨 Vérification des alertes critiques...');

        try {
            // const result = await this.calendarPublisher.publishCriticalAlerts();

            // if (result.success) {
            //     if (result.published_events && result.published_events > 0) {
            //         console.log(`⚠️ Alerte critique publiée: ${result.published_events} événements`);
            //     } else {
            //         console.log('✅ Aucune alerte critique à publier');
            //     }
            //     return true;
            // } else {
            //     console.error(`❌ Échec alerte critique: ${result.error}`);
            //     return false;
            // }
            console.log('ℹ️ [ALERTS] Alertes critiques temporairement désactivées');
            return true;
        } catch (error) {
            console.error('❌ Erreur alerte critique:', error);
            return false;
        }
    }

    /**
     * Pipeline complet du calendrier économique
     * Scraping -> Filtrage -> Publication
     */
    async runCalendarPipeline(): Promise<boolean> {
        console.log('🔄 Démarrage du pipeline complet du calendrier économique...');

        try {
            // Étape 1: Scraping
            console.log('📅 [1/3] Scraping du calendrier...');
            const scrapingSuccess = await this.executeCalendarScraping();
            if (!scrapingSuccess) {
                console.warn('⚠️ Scraping échoué mais continuation du pipeline...');
            }

            // Petite pause entre les étapes
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Étape 2: Filtrage
            console.log('🔍 [2/3] Filtrage expert du calendrier...');
            const filteringSuccess = await this.executeCalendarFiltering();
            if (!filteringSuccess) {
                console.warn('⚠️ Filtrage échoué mais continuation du pipeline...');
            }

            // Petite pause entre les étapes
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Étape 3: Publication
            console.log('📢 [3/3] Publication du calendrier...');
            const publishingSuccess = await this.executeCalendarPublishing();
            if (!publishingSuccess) {
                console.error('❌ Publication échouée');
            }

            // Vérification des alertes critiques
            await this.executeCriticalAlert();

            const overallSuccess = scrapingSuccess && filteringSuccess && publishingSuccess;
            console.log(`🏁 Pipeline calendrier terminé: ${overallSuccess ? 'SUCCÈS' : 'PARTIEL'}`);

            return overallSuccess;

        } catch (error) {
            console.error('❌ Erreur pipeline calendrier:', error);
            return false;
        }
    }

    /**
     * Pipeline unifié intelligent du calendrier économique
     * Toutes les 2h : scraping + alertes critiques
     * À 9h00 : scraping + filtrage + publication complète + alertes + nettoyage
     * À 2h00 : nettoyage si pas déjà fait
     */
    async runUnifiedCalendarPipeline(): Promise<boolean> {
        const now = new Date();
        const currentHour = now.getHours();
        const is9AM = currentHour === 9;
        const is2AM = currentHour === 2;

        console.log(`🔄 [PIPELINE UNIFIÉ] Exécution calendrier - ${now.toLocaleString('fr-FR')} (${currentHour}h)`);
        console.log(`🎯 Mode: ${is9AM ? 'COMPLET' : is2AM ? 'NETTOYAGE' : 'ALERTES'}`);

        try {
            let successCount = 0;
            let totalActions = 0;

            // 1. SCRAPING (toutes les 2h)
            console.log('📅 [1] Scraping du calendrier économique...');
            totalActions++;
            if (await this.executeCalendarScraping()) {
                successCount++;
                console.log('✅ Scraping réussi');
            } else {
                console.warn('⚠️ Scraping échoué, continuation...');
            }

            // 2. FILTRAGE & PUBLICATION (uniquement à 9h)
            if (is9AM) {
                console.log('🔍 [2] Filtrage expert (9h00)...');
                totalActions++;
                if (await this.executeCalendarFiltering()) {
                    successCount++;
                    console.log('✅ Filtrage réussi');

                    // Pause avant publication
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    console.log('📢 [3] Publication quotidienne...');
                    totalActions++;
                    if (await this.executeCalendarPublishing()) {
                        successCount++;
                        console.log('✅ Publication réussie');
                    } else {
                        console.warn('⚠️ Publication échouée');
                    }
                } else {
                    console.warn('⚠️ Filtrage échoué, pas de publication');
                }
            }

            // 3. ALERTES CRITIQUES (toutes les heures)
            console.log('🚨 [4] Vérification alertes critiques...');
            totalActions++;
            if (await this.executeCriticalAlert()) {
                successCount++;
                console.log('✅ Alertes vérifiées');
            } else {
                console.warn('⚠️ Vérification alertes échouée');
            }

            // 4. NETTOYAGE (à 2h OU après publication à 9h)
            if (is2AM || (is9AM && successCount >= 3)) {
                console.log('🧹 [5] Nettoyage anciens messages...');
                totalActions++;
                try {
                    // await this.calendarPublisher.cleanupOldCalendarMessages();
                    // successCount++;
                    console.log('ℹ️ [CLEANUP] Nettoyage temporairement désactivé');
                } catch (error) {
                    console.warn('⚠️ Nettoyage échoué:', error);
                }
            }

            const successRate = Math.round((successCount / totalActions) * 100);
            console.log(`🏁 [PIPELINE UNIFIÉ] Terminé: ${successCount}/${totalActions} actions réussies (${successRate}%)`);

            return successCount >= Math.floor(totalActions / 2); // Succès si >= 50% des actions

        } catch (error) {
            console.error('❌ [PIPELINE UNIFIÉ] Erreur critique:', error);
            return false;
        }
    }

    /**
     * Job cron quotidien du calendrier (version manuelle)
     * Simule exactement le même comportement que le cron job automatique de 9h00
     */
    async runDailyCalendarJob(): Promise<boolean> {
        console.log('📅 [JOB CRON MANUEL] Exécution du job calendrier quotidien à 9h00...');
        console.log('⏰ Timestamp:', new Date().toLocaleString('fr-FR'));

        try {
            // Forcer le mode complet (9h00)
            const success = await this.runUnifiedCalendarPipeline();

            if (success) {
                console.log('✅ [JOB CRON MANUEL] Calendrier quotidien publié avec succès');
                return true;
            } else {
                console.error('❌ [JOB CRON MANUEL] Échec du job calendrier quotidien');
                return false;
            }

        } catch (error) {
            console.error('❌ [JOB CRON MANUEL] Erreur critique job calendrier:', error);
            return false;
        }
    }

    // ====== FONCTIONS CHAT IA ======

    async handleMessage(message: Message): Promise<boolean> {
        console.log(`🤖 [DEBUG] handleMessage appelé avec: "${message.content}"`);
        if (message.author.bot) return false;
        if (!this.client) return false;

        const isMentioned = message.mentions.has(this.client.user!);
        const isDM = message.channel.type === 1;
        const hasSniperPrefix = message.content.toLowerCase().includes('sniper') || message.content.toLowerCase().includes('@sniper');

        console.log(`🤖 [DEBUG] Conditions: isMentioned=${isMentioned}, isDM=${isDM}, hasSniperPrefix=${hasSniperPrefix}, content="${message.content}"`);

        // 🔥 MODE DEBUG - FORCER LE TRAITEMENT POUR TEST
        const FORCE_TREATMENT = false;
        if (!isMentioned && !isDM && !hasSniperPrefix && !FORCE_TREATMENT) {
            console.log(`🤖 [DEBUG] Message non traité (conditions non remplies)`);
            return false;
        }

        if (!isMentioned && !isDM && !hasSniperPrefix && FORCE_TREATMENT) {
            console.log(`🤖 [DEBUG] ⚡ MODE DEBUG: Forçage du traitement malgré conditions non remplies`);
        }

        // === BOUCLE VERTUEUSE: Log de la commande reçue ===
        let commandTimestamp = '';
        let sessionId = '';
        if (ENABLE_BOUCLE_VERTUEUSE) {
            commandTimestamp = await discordLogger.logCommand(
                message.author.id,
                message.author.username,
                message.channelId,
                message.content
            );
            sessionId = discordLogger.startConversation(message.author.id, message.author.username);
        }

        // Cooldown réduit pour les clients payants
        const userId = message.author.id;
        const now = Date.now();
        const lastUsed = this.cooldowns.get(userId) || 0;

        if (now - lastUsed < 1000) { // 1 seconde au lieu de 3
            return true; // Ignorer silencieusement
        }

        this.cooldowns.set(userId, now);

        // PLUS DE VÉRIFICATION PING - SYSTÈME PERSISTANT FIABLE
        // La session Claude est initialisée au démarrage, pas besoin de tester à chaque message

        console.log(`🤖 [MESSAGE] Processing from ${message.author.username} (${userId}): "${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}"`);

// Mettre à jour le contexte de conversation
        this.updateConversationContext(userId, message.content, message.author.username);

        // Traiter la demande
        const cleanContent = this.cleanMessage(message.content, isMentioned);

        // Gérer la différenciation des prompts avec ClaudeProcessManager
        const isFirstPrompt = this.claudeProcessManager.isNextPromptFirst();
        this.claudeProcessManager.recordPrompt(cleanContent);

        // Commande manuelle pour le pipeline aggregator
        if (cleanContent.toLowerCase() === 'pipeline aggregator' || cleanContent.toLowerCase() === 'run aggregator') {
            await message.reply('🚀 Démarrage manuel du Pipeline Aggregator (Agg -> Filter -> Publish)...');
            // Exécuter sans await pour ne pas bloquer le bot
            this.runAggregatorPipeline().catch(err => console.error('Erreur manuelle pipeline:', err));
            return true;
        }

        // === COMMANDES CALENDRIER ÉCONOMIQUE ===

        // Scraper le calendrier économique
        if (cleanContent.toLowerCase().includes('calendrier scraper') || cleanContent.toLowerCase().includes('calendar scraper')) {
            await message.reply('📅 Démarrage du scraping du calendrier économique...');
            // Exécuter sans await pour ne pas bloquer le bot
            this.executeCalendarScraping().catch(err => console.error('Erreur scraping calendrier:', err));
            return true;
        }

        // Filtrer le calendrier avec RougePulse
        if (cleanContent.toLowerCase().includes('filtrer calendrier') || cleanContent.toLowerCase().includes('filter calendar')) {
            await message.reply('🔍 Démarrage du filtrage expert du calendrier...');
            // Exécuter sans await pour ne pas bloquer le bot
            this.executeCalendarFiltering().catch(err => console.error('Erreur filtrage calendrier:', err));
            return true;
        }

        // Publier le calendrier du jour
        if (cleanContent.toLowerCase().includes('publier calendrier') || cleanContent.toLowerCase().includes('publish calendar')) {
            await message.reply('📢 Publication du calendrier économique quotidien...');
            // Exécuter sans await pour ne pas bloquer le bot
            this.executeCalendarPublishing().catch(err => console.error('Erreur publication calendrier:', err));
            return true;
        }

        // Alerte critique du calendrier
        if (cleanContent.toLowerCase().includes('alerte critique') || cleanContent.toLowerCase().includes('critical alert')) {
            await message.reply('🚨 Vérification des alertes critiques...');
            // Exécuter sans await pour ne pas bloquer le bot
            this.executeCriticalAlert().catch(err => console.error('Erreur alerte critique:', err));
            return true;
        }

        // Pipeline complet du calendrier (scraping -> filtrage -> publication)
        if (cleanContent.toLowerCase().includes('pipeline calendrier') || cleanContent.toLowerCase().includes('calendar pipeline')) {
            await message.reply('🔄 Démarrage du pipeline complet du calendrier (Scraping -> Filtrage -> Publication)...');
            // Exécuter sans await pour ne pas bloquer le bot
            this.runCalendarPipeline().catch(err => console.error('Erreur pipeline calendrier:', err));
            return true;
        }

        // Lancer manuellement le job cron de publication du calendrier
        if (cleanContent.toLowerCase().includes('lancer calendrier') || cleanContent.toLowerCase().includes('run calendar job')) {
            await message.reply('📅 Lancement manuel du job cron calendrier quotidien...');
            // Exécuter sans await pour ne pas bloquer le bot
            this.runDailyCalendarJob().catch(err => console.error('Erreur job calendrier manuel:', err));
            return true;
        }

        // Admin: Lister les channels disponibles pour les sondages
        if ((cleanContent.toLowerCase().includes('list') || cleanContent.toLowerCase().includes('liste'))
            && (cleanContent.toLowerCase().includes('channels') || cleanContent.toLowerCase().includes('canaux') || cleanContent.toLowerCase().includes('sondages'))) {
            if (message.author.id === process.env.ADMIN_USER_ID) {
                const availableChannels = this.pollManager.getAvailableChannels();
                const channelList = availableChannels.length > 0
                    ? availableChannels.map(name => `• \`${name}\``).join('\n')
                    : 'Aucun channel configuré';

                await message.reply(`📋 **Channels disponibles pour les sondages** (${availableChannels.length}) :\n\n${channelList}\n\n💡 Utilisez : \`Sniper, crée un sondage dans [nom-du-channel] : question\``);
                return true;
            }
        }

        // Admin: Lire les derniers messages d'un channel
        if ((cleanContent.toLowerCase().includes('lis') || cleanContent.toLowerCase().includes('lit') || cleanContent.toLowerCase().includes('read'))
            && (cleanContent.toLowerCase().includes('message') || cleanContent.toLowerCase().includes('messages') || cleanContent.toLowerCase().includes('commentaire') || cleanContent.toLowerCase().includes('commentaires'))) {
            if (message.author.id === process.env.ADMIN_USER_ID) {
                try {
                    // Extraire le nom du channel et le nombre de messages
                    const channelMatch = cleanContent.match(/(?:de|du|dans)\s+([a-zA-Z0-9-]+)/i);
                    const numberMatch = cleanContent.match(/(\d+)\s*(?:derniers?|messages?|commentaires?)/i);

                    let targetChannelId = message.channelId;
                    let messageLimit = 5;
                    let channelName = "ce channel";

                    if (channelMatch) {
                        const channelId = this.pollManager.getChannelIdFromName(channelMatch[1]);
                        if (channelId) {
                            targetChannelId = channelId;
                            channelName = channelMatch[1];
                        }
                    }

                    if (numberMatch) {
                        messageLimit = Math.min(parseInt(numberMatch[1]), 25); // Maximum 25 messages
                    }

                    await message.reply(`📖 Lecture des ${messageLimit} derniers messages du channel \`${channelName}\`...`);

                    const messages = await this.pollManager.getRecentMessages(targetChannelId, messageLimit);

                    if (messages.length === 0) {
                        await message.reply(`📭 Aucun message trouvé dans \`${channelName}\``);
                        return true;
                    }

                    let response = `📋 **Derniers messages de \`${channelName}\`** (${messages.length} messages) :\n\n`;

                    messages.forEach((msg, index) => {
                        const date = msg.timestamp.toLocaleDateString('fr-FR') + ' ' + msg.timestamp.toLocaleTimeString('fr-FR');
                        response += `**${index + 1}. ${msg.author}** (${date}):\n> ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}\n\n`;
                    });

                    // Si la réponse est trop longue, la diviser
                    if (response.length > 1900) {
                        const firstPart = response.substring(0, 1800) + '\n\n*Suite...*';
                        await message.reply(firstPart);
                    } else {
                        await message.reply(response);
                    }

                } catch (error) {
                    console.error('Erreur lecture messages:', error);
                    await message.reply('❌ Impossible de lire les messages. Vérifiez que j\'ai les permissions nécessaires (ViewChannel, ReadMessageHistory).');
                }
                return true;
            }
        }

        // Admin: Analyser/résumer les messages d'un channel
        if ((cleanContent.toLowerCase().includes('analyse') || cleanContent.toLowerCase().includes('analyser') || cleanContent.toLowerCase().includes('résume') || cleanContent.toLowerCase().includes('résumer'))
            && (cleanContent.toLowerCase().includes('message') || cleanContent.toLowerCase().includes('messages') || cleanContent.toLowerCase().includes('commentaire') || cleanContent.toLowerCase().includes('commentaires'))) {
            if (message.author.id === process.env.ADMIN_USER_ID) {
                try {
                    // Extraire le nom du channel
                    const channelMatch = cleanContent.match(/(?:de|du|dans)\s+([a-zA-Z0-9-]+)/i);

                    let targetChannelId = message.channelId;
                    let channelName = "ce channel";

                    if (channelMatch) {
                        const channelId = this.pollManager.getChannelIdFromName(channelMatch[1]);
                        if (channelId) {
                            targetChannelId = channelId;
                            channelName = channelMatch[1];
                        }
                    }

                    await message.reply(`🔍 Analyse des messages du channel \`${channelName}\` en cours...`);

                    const messages = await this.pollManager.getRecentMessages(targetChannelId, 20);

                    if (messages.length === 0) {
                        await message.reply(`📭 Aucun message trouvé dans \`${channelName}\``);
                        return true;
                    }

                    // Créer un prompt pour l'agent Discord avec les messages
                    const messagesText = messages.map(msg => `${msg.author}: ${msg.content}`).join('\n');

                    const analysisRequest: ChatRequest = {
                        message: `Analyse et résume ces ${messages.length} messages du channel Discord "${channelName}":

${messagesText}

Fournis une analyse structurée avec:
- Thèmes principaux discutés
- Sentiment général
- Participants actifs
- Tendance ou conclusion
- Points notables

Sois concis mais informatif.`,
                        username: message.author.username,
                        channelId: message.channelId
                    };

                    const analysisResponse = await this.discordAgent.chat(analysisRequest);

                    if (analysisResponse.messages.length > 0) {
                        await message.reply(`📊 **Analyse des messages de \`${channelName}\`** :\n\n${analysisResponse.messages[0]}`);
                    } else {
                        await message.reply('❌ Impossible de générer une analyse.');
                    }

                } catch (error) {
                    console.error('Erreur analyse messages:', error);
                    await message.reply('❌ Impossible d\'analyser les messages. Vérifiez que j\'ai les permissions nécessaires.');
                }
                return true;
            }
        }

        if (!cleanContent.trim()) {
            await message.reply('Bonjour. Comment puis-je vous assister dans vos analyses financières ?');
            return true;
        }

        // Extraire le contenu des fichiers attachés (txt, json, md, csv, code)
        let attachmentContent: string | undefined;
        if (message.attachments.size > 0) {
            const supportedExtensions = ['.txt', '.json', '.md', '.csv', '.js', '.ts', '.py', '.log', '.xml', '.yaml', '.yml'];
            const textAttachments = message.attachments.filter(att => 
                supportedExtensions.some(ext => att.name?.toLowerCase().endsWith(ext)) && 
                att.size < 50000 // Max 50KB pour éviter les fichiers trop gros
            );

            if (textAttachments.size > 0) {
                try {
                    const attachmentContents: string[] = [];
                    for (const [, attachment] of textAttachments) {
                        console.log(`📎 Téléchargement du fichier: ${attachment.name}`);
                        const response = await fetch(attachment.url);
                        if (response.ok) {
                            const text = await response.text();
                            attachmentContents.push(`--- ${attachment.name} ---\n${text}`);
                        }
                    }
                    if (attachmentContents.length > 0) {
                        attachmentContent = attachmentContents.join('\n\n');
                        console.log(`📎 Contenu extrait de ${attachmentContents.length} fichier(s)`);
                    }
                } catch (attachError) {
                    console.error('⚠️ Erreur extraction fichier attaché:', attachError);
                }
            }
        }

        try {
            const responseObj = await this.generateProfessionalResponse(cleanContent, message.author.username, userId, attachmentContent, message.channel.id);

            console.log(`🤖 [DEBUG] responseObj reçu:`, JSON.stringify(responseObj, null, 2));

            // 🔥 NOUVEAU: Si il y a un sondage, on skip les messages (ils seront remplacés par le message de confirmation)
            if (responseObj.poll) {
                console.log(`Sniper: ⏭️ Sondage détecté - Suppression des messages redondants`);
                // On ne fait RIEN ici, le sondage sera créé en section 2
            }
            else if (responseObj.messages && responseObj.messages.length > 0) {
                for (const textResponse of responseObj.messages) {
                    if (textResponse.trim()) {
                        // 🎨 NOUVEAU: Détecter et formater le Markdown
                        // SAUF si c'est un fichier markdown affiché directement
                        const isDirectMarkdownFile = textResponse.startsWith('📄 **') && textResponse.includes('.md**');

                        if (isDirectMarkdownFile) {
                            // Fichier markdown affiché directement - Discord va le rendre nativement
                            console.log(`📄 Envoi direct du markdown (rendu natif Discord)`);
                            await message.reply(textResponse);
                        } else if (MarkdownRenderer.hasCodeBlocks(textResponse)) {
                            console.log(`📝 Détection de ${MarkdownRenderer.countCodeBlocks(textResponse)} bloc(s) de code`);

                            // 🔥 NOUVEAU: Vérifier si c'est du vrai code (avec langage) ou du markdown
                            const hasRealCode = this.hasRealCodeBlocks(textResponse);

                            if (hasRealCode) {
                                try {
                                    const parsed = MarkdownRenderer.parseMarkdownResponse(textResponse);
                                    await MarkdownRenderer.formatForDiscord(message, parsed);
                                } catch (error) {
                                    console.error('❌ Erreur formatage Markdown:', error);
                                    // Fallback: envoyer le texte brut
                                    await message.reply(textResponse);
                                }
                            } else {
                                // Markdown normal - envoyer tel quel (Discord le rendra)
                                console.log(`📄 Texte markdown détecté - envoi direct`);
                                await message.reply(textResponse);
                            }
                        } else {
                            // Pas de code blocks, envoyer normalement
                            await message.reply(textResponse);
                        }

                        // === BOUCLE VERTUEUSE: Log de la réponse du bot ===
                        const responseDuration = Date.now() - now;
                        if (ENABLE_BOUCLE_VERTUEUSE) {
                            await discordLogger.logResponse(
                                new Date().toISOString(),
                                message.author.id,
                                message.author.username,
                                message.channelId,
                                textResponse,
                                responseDuration
                            );
                        }

                        // Petit délai entre les messages
                        if (responseObj.messages.length > 1) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                    }
                }
            }

           // 2. Créer le sondage s'il est demandé
           if (responseObj.poll) {
               console.log(`📊 Création d'un sondage pour ${message.author.username}: ${responseObj.poll.question}`);
               try {
                   // 🔥 CORRECTION: Utiliser SEULEMENT le message original pour extraire le channel cible
                   // NE PAS utiliser la réponse IA qui peut contenir des IDs d'exemple (123456789...)
                   const originalMessage = message.content;

                   let targetChannelId = this.pollManager.extractTargetChannel(originalMessage);
                   let targetChannelName = "le channel spécifié";

                   // Recherche améliorée pour détecter les IDs de channel dans le MESSAGE ORIGINAL SEULEMENT
                   if (!targetChannelId) {
                       // Chercher les mentions Discord directes <#channelId> dans le message original
                       const discordMentionMatch = originalMessage.match(/<#(\d{18,19})>/);
                       if (discordMentionMatch) {
                           targetChannelId = discordMentionMatch[1];
                           targetChannelName = "le channel mentionné";
                           console.log(`🎯 Mention Discord détectée: ${targetChannelId}`);
                       }
                   }

                   // Par défaut: channel actuel
                   if (!targetChannelId) {
                       targetChannelId = message.channelId;
                       targetChannelName = "ce channel";
                   }

                   console.log(`🎯 Cible du sondage: ${targetChannelName} (${targetChannelId})`);

                   try {
                       const pollMessage = await this.pollManager.createPoll(targetChannelId, responseObj.poll);

                       if (targetChannelId === message.channelId) {
                           await message.reply(`✅ Sondage créé avec succès ici: ${responseObj.poll.question}`);
                       } else {
                           await message.reply(`✅ Sondage créé avec succès dans <#${targetChannelId}>: ${responseObj.poll.question}`);
                       }

                   } catch (pollError) {
                       console.error(`❌ Erreur création sondage dans ${targetChannelName} (${targetChannelId}):`, pollError);

                       // Si échec dans le channel spécifié, essayer le channel actuel
                       if (targetChannelId !== message.channelId) {
                           try {
                               console.log(`🔄 Tentative dans le channel actuel: ${message.channelId}`);
                               const pollMessage = await this.pollManager.createPoll(message.channelId, responseObj.poll);
                               await message.reply(`✅ Sondage créé avec succès ici: ${responseObj.poll.question}`);
                           } catch (currentChannelError) {
                               // Essayer dans le channel de discussion par défaut
                               const fallbackChannelId = process.env.DISCORD_CHANNEL_DISCUSSION;
                               if (fallbackChannelId && fallbackChannelId !== message.channelId) {
                                   try {
                                       const pollMessage = await this.pollManager.createPoll(fallbackChannelId, responseObj.poll);
                                       await message.reply(`✅ Sondage créé avec succès dans <#${fallbackChannelId}>: ${responseObj.poll.question}`);
                                   } catch (fallbackError) {
                                       await message.reply("⚠️ Je n'ai pas pu créer le sondage. Vérifiez que j'ai les permissions nécessaires pour créer des sondages.");
                                   }
                               } else {
                                   await message.reply("⚠️ Je n'ai pas pu créer le sondage. Assurez-vous que j'ai la permission `CreatePolls`.");
                               }
                           }
                       } else {
                           await message.reply("⚠️ Je n'ai pas pu créer le sondage. Assurez-vous que j'ai la permission `CreatePolls`.");
                       }
                       return false;
                   }

               } catch (pollError) {
                   console.error("❌ Erreur création sondage:", pollError);
                   await message.reply("⚠️ Je n'ai pas pu créer le sondage. Vérifiez que j'ai les permissions nécessaires.");
               }
           }

           // 2. Créer les messages Discord enrichis s'ils sont demandés
           if (responseObj.discordMessage) {
               console.log(`🎨 Création d'un message Discord enrichi pour ${message.author.username}`);
               try {
                   const discordData: any = responseObj.discordMessage;

                   // Créer le message avec les composants Discord
                   if (discordData.data?.content || (discordData.data?.embeds && discordData.data.embeds.length > 0)) {
                       await message.reply({
                           content: discordData.data.content,
                           embeds: discordData.data.embeds || [],
                           components: discordData.data.components || []
                       });
                   }
               } catch (discordError) {
                   console.error(`❌ Erreur création message Discord enrichi:`, discordError);
                   await message.reply("⚠️ Je n'ai pas pu créer le message enrichi. Vérifiez que j'ai les permissions nécessaires.");
               }
           }

           // 3. Gérer l'upload de fichiers s'il est demandé
           if (responseObj.fileUpload) {
               console.log(`📁 Upload de fichier pour ${message.author.username}: ${responseObj.fileUpload.fichier.name}`);
               try {
                   const fileData = responseObj.fileUpload;

                   // Importer AttachmentBuilder de discord.js
                   const { AttachmentBuilder } = await import('discord.js');
                   const attachment = new AttachmentBuilder(
                       Buffer.from(fileData.fichier.content as string, 'utf-8'),
                       {
                           name: fileData.fichier.name,
                           description: fileData.fichier.description
                       }
                   );

                   // Préparer le message d'accompagnement - convertir les embeds au format Discord
                   const discordEmbeds = fileData.message?.embeds?.map(embed => ({
                       title: embed.title,
                       description: embed.description,
                       color: typeof embed.color === 'string' ? parseInt(embed.color.replace('#', ''), 16) : embed.color,
                       fields: embed.fields,
                       footer: embed.footer ? { text: embed.footer.text, iconURL: embed.footer.iconUrl } : undefined,
                       thumbnail: embed.thumbnail,
                       author: embed.author ? { name: embed.author.name, iconURL: embed.author.iconUrl } : undefined
                   })) || [];

                   const messageData = {
                       content: fileData.message?.contenu,
                       embeds: discordEmbeds,
                       components: [], // Les boutons seraient traités séparément si nécessaire
                       files: [attachment]
                   };

                   await message.reply(messageData);
                   console.log(`✅ Fichier uploadé avec succès: ${fileData.fichier.name}`);

               } catch (fileError) {
                   console.error(`❌ Erreur upload fichier:`, fileError);
                   await message.reply("⚠️ Je n'ai pas pu uploader le fichier. Le fichier pourrait être trop volumineux ou le format non supporté.");
               }
           }

        } catch (error) {
            console.error('Sniper: ❌ ERREUR CRITIQUE dans handleMessage:', error);
            console.error('Sniper: 📋 Stack trace:', error instanceof Error ? error.stack : 'No stack');

            // === BOUCLE VERTUEUSE: Log de l'erreur ===
            if (ENABLE_BOUCLE_VERTUEUSE) {
                await discordLogger.logError(
                    message.author.id,
                    message.author.username,
                    message.channelId,
                    error instanceof Error ? error.message : String(error),
                    'handleMessage'
                );
            }

            await message.reply(`❌ **Erreur technique**: ${error instanceof Error ? error.message : String(error)}. Veuillez réessayer.`);
        } finally {
            // === BOUCLE VERTUEUSE: Terminer la session de conversation ===
            if (ENABLE_BOUCLE_VERTUEUSE) {
                await discordLogger.endConversation(message.author.id);
            }
        }

        return true;
    }

    cleanMessage(content: string, wasMentioned: boolean): string {
        let cleaned = content;

        if (wasMentioned) {
            cleaned = cleaned.replace(/<@!?\d+>/g, '').trim();
        }

        cleaned = cleaned.replace(/sniper\s*/gi, '').trim();
        return cleaned;
    }

    /**
     * Vérifie si le texte contient du vrai code (avec langage spécifié)
     * vs du markdown normal avec des blocs de texte
     */
    private hasRealCodeBlocks(text: string): boolean {
        // Détecter les blocs de code avec langage spécifié (```js, ```python, etc.)
        const realCodeRegex = /```(\w+)\s*\n/g;
        const matches = text.match(realCodeRegex);

        if (matches && matches.length > 0) {
            console.log(`💻 Vrai code détecté: ${matches.length} bloc(s) avec langage`);
            return true;
        }

        // Si pas de langage spécifié, c'est probablement du markdown
        console.log(`📝 Markdown détecté (pas de langage spécifié)`);
        return false;
    }

    /**
     * Découpe intelligemment le contenu markdown en plusieurs parties
     * en préservant le formatage et sans dépasser 2000 caractères par message
     */
    private splitMarkdownContent(content: string, maxLength: number = 1900): string[] {
        if (content.length <= maxLength) {
            return [content];
        }

        const parts: string[] = [];
        let currentPart = '';
        const lines = content.split('\n');
        let inCodeBlock = false;
        let codeBlockMarker = '';
        let codeBlockBuffer: string[] = [];

        const flushCodeBlock = () => {
            if (codeBlockBuffer.length > 0) {
                const codeBlock = codeBlockBuffer.join('\n');
                if (currentPart.length + codeBlock.length > maxLength) {
                    if (currentPart) {
                        parts.push(currentPart);
                        currentPart = '';
                    }
                    parts.push(codeBlock);
                    codeBlockBuffer = [];
                } else {
                    currentPart += codeBlock;
                    codeBlockBuffer = [];
                }
            }
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Détecter le début d'un bloc de code
            const codeBlockStart = line.match(/^```(\w+)?/);
            if (codeBlockStart && !inCodeBlock) {
                // Terminer la partie actuelle si elle existe
                if (currentPart.trim()) {
                    parts.push(currentPart);
                    currentPart = '';
                }

                inCodeBlock = true;
                codeBlockMarker = codeBlockStart[0];
                codeBlockBuffer = [line];
                continue;
            }

            // Détecter la fin d'un bloc de code
            if (inCodeBlock && line.trim() === '```') {
                codeBlockBuffer.push(line);
                flushCodeBlock();
                inCodeBlock = false;
                codeBlockMarker = '';
                continue;
            }

            if (inCodeBlock) {
                codeBlockBuffer.push(line);
                // Vérifier si le bloc de code complet dépasse la limite
                if (codeBlockBuffer.join('\n').length > maxLength) {
                    // Découper le bloc de code à l'intérieur (pas idéal mais nécessaire)
                    const blockText = codeBlockBuffer.slice(1, -1).join('\n');
                    if (currentPart) {
                        parts.push(currentPart);
                        currentPart = '';
                    }
                    parts.push(`${codeBlockMarker}\n${blockText.substring(0, maxLength - codeBlockMarker.length - 5)}\n... [tronqué]`);
                    codeBlockBuffer = [];
                    inCodeBlock = false;
                    codeBlockMarker = '';
                }
            } else {
                // Contenu normal
                const newLine = line + '\n';
                if (currentPart.length + newLine.length > maxLength) {
                    parts.push(currentPart);
                    currentPart = line + '\n';
                } else {
                    currentPart += newLine;
                }
            }
        }

        // Ajouter la dernière partie s'il y en a une
        if (currentPart.trim() || codeBlockBuffer.length > 0) {
            if (codeBlockBuffer.length > 0) {
                flushCodeBlock();
            } else {
                parts.push(currentPart);
            }
        }

        return parts;
    }

    /**
     * Pré-traite les références de fichiers pour les normaliser et les lire directement
     */
    private async preprocessFileReferences(message: string): Promise<{ processedMessage: string; fileUpload?: FileUploadData; pendingFileParts: any[] }> {
        // Normaliser les séparateurs de chemin (remplacer \ par /)
        const normalizedMessage = message.replace(/\\/g, '/');

        // Patterns pour détecter les références de fichiers (maintenant on n'a besoin que du /)
        const filePatterns = [
            /@([a-zA-Z_]+)\/([^\/\s]+)(?:\.([a-zA-Z0-9]+))?/g, // @folder/file.ext
            /([a-zA-Z_]+)\/([^\/\s]+)(?:\.([a-zA-Z0-9]+))?/g,   // folder/file.ext
        ];

        let processedMessage = message;
        let fileUpload: FileUploadData | undefined;

        /**
         * Échappe les backticks pour sécuriser l'insertion dans un bloc de code markdown
         */
        const escapeBackticks = (content: string): string => {
            return content.replace(/```/g, '\\`\\`\\`');
        };

        /**
         * Répare les blocs de code markdown pour Discord
         */
        const repairCodeBlocks = (content: string): string => {
            // Remplacer les backticks échappés par des backticks normaux pour les blocs de code
            return content.replace(/\\`\\`\\`/g, '```');
        };

        // Vérifier chaque pattern pour trouver une référence de fichier
        for (const pattern of filePatterns) {
            const matches = Array.from(normalizedMessage.matchAll(pattern));
            if (matches.length > 0) {
                const match = matches[0];
                const folder = match[1];
                const filename = match[2];
                const extension = match[3] || '';

                // Construire le chemin complet
                let filePath;
                if (folder.toLowerCase() === 'docs') {
                    filePath = path.resolve(process.cwd(), 'docs', filename + (extension ? '.' + extension : ''));
                } else {
                    filePath = path.resolve(process.cwd(), folder, filename + (extension ? '.' + extension : ''));
                }

                console.log(`🔍 Fichier détecté: ${filename}, Chemin: ${filePath}`);

                // Vérifier si le fichier existe
                if (fsSync.existsSync(filePath)) {
                    try {
                        const content = await fs.readFile(filePath, 'utf-8');
                        const fileName = path.basename(filePath);

                        console.log(`✅ Fichier lu avec succès: ${fileName} (${content.length} caractères)`);

                        // Déterminer le type de fichier
                        let fileType = 'txt';
                        if (fileName.endsWith('.md')) fileType = 'markdown';
                        else if (fileName.endsWith('.ts')) fileType = 'typescript';
                        else if (fileName.endsWith('.js')) fileType = 'javascript';
                        else if (fileName.endsWith('.json')) fileType = 'json';
                        else if (fileName.endsWith('.py')) fileType = 'python';

                        // Créer l'upload de fichier (pour tous les types)
                        fileUpload = {
                            type: 'file_upload',
                            fichier: {
                                name: fileName,
                                content: content,
                                type: fileType as any
                            },
                            message: {
                                contenu: `📄 Fichier chargé: ${fileName} (${content.length} caractères)`
                            }
                        };

                        // Pour les fichiers markdown, garder le rendu Discord mais réparer les blocs de code
                        if (fileType === 'markdown') {
                            // Réparer les blocs de code échappés pour qu'ils s'affichent correctement
                            const repairedContent = repairCodeBlocks(content);

                            // Découper intelligemment le contenu si nécessaire
                            const contentParts = this.splitMarkdownContent(repairedContent, 1900);

                            if (contentParts.length === 1) {
                                // Contenu court, afficher directement
                                processedMessage = `📄 **${fileName}**\n\n${contentParts[0]}\n\n_Le fichier complet est disponible en téléchargement ci-dessus._`;
                            } else {
                                // Contenu long, afficher par parties
                                const totalParts = contentParts.length;
                                processedMessage = `📄 **${fileName}** (${totalParts} parties)\n\n${contentParts[0]}\n\n_Le fichier complet est disponible en téléchargement ci-dessus._`;
                                // Stocker les parties suivantes pour envoi séparé
                                (this as any).pendingFileParts = contentParts.slice(1).map((part, index) => ({
                                    content: `${part}\n\n_Partie ${index + 2}/${totalParts}_`,
                                    partNumber: index + 2,
                                    totalParts
                                }));
                            }
                        } else {
                            // Modifier le message pour indiquer que le fichier a été trouvé
                            // Échapper les backticks dans le contenu pour éviter de casser le bloc de code
                            const escapedContent = escapeBackticks(content.substring(0, 2000));
                            const truncationNote = content.length > 2000 ? '\n... [tronqué]' : '';
                            processedMessage = `📁 J'ai trouvé et lu le fichier: ${fileName}\n\nContenu du fichier:\n\n\`\`\`${fileType}\n${escapedContent}${truncationNote}\n\`\`\`\n\nLe fichier complet est disponible en téléchargement.`;
                        }
                        break;

                    } catch (error) {
                        console.error(`❌ Erreur lecture fichier ${filePath}:`, error);
                    }
                } else {
                    console.log(`⚠️ Fichier non trouvé: ${filePath}`);
                }
            }
        }

        const pendingFileParts = (this as any).pendingFileParts || [];
        // Nettoyer la propriété temporaire
        (this as any).pendingFileParts = [];
        return { processedMessage, fileUpload, pendingFileParts };
    }

    /**
     * Détecte si le message demande d'afficher un fichier markdown
     */
    private isMarkdownFileDisplayRequest(message: string): boolean {
        const normalizedMessage = message.replace(/\\/g, '/');
        // Patterns pour détecter l'affichage de fichiers markdown
        const patterns = [
            /afficher.*\.md(\s|$)/i,
            /display.*\.md(\s|$)/i,
            /voir.*\.md(\s|$)/i,
            /montrer.*\.md(\s|$)/i,
            /\bmini-roadmap\.md\b/i
        ];

        return patterns.some(pattern => pattern.test(normalizedMessage));
    }

    /**
     * Extrait et lit un fichier markdown depuis la demande
     */
    private async extractMarkdownFile(message: string): Promise<{ path: string; content: string; name: string } | null> {
        const normalizedMessage = message.replace(/\\/g, '/');

        // Chercher mini-roadmap.md spécifiquement
        if (/mini-roadmap\.md/i.test(normalizedMessage)) {
            const filePath = path.resolve(process.cwd(), 'mini-roadmap.md');

            if (fsSync.existsSync(filePath)) {
                try {
                    const content = await fs.readFile(filePath, 'utf-8');
                    return {
                        path: filePath,
                        content,
                        name: 'mini-roadmap.md'
                    };
                } catch (error) {
                    console.error(`❌ Erreur lecture ${filePath}:`, error);
                }
            }
        }

        // Chercher d'autres fichiers .md
        const mdPattern = /\b([a-zA-Z0-9_-]+\.md)\b/;
        const match = normalizedMessage.match(mdPattern);
        if (match) {
            const filename = match[1];
            const possiblePaths = [
                path.resolve(process.cwd(), filename),
                path.resolve(process.cwd(), 'docs', filename),
                path.resolve(process.cwd(), 'src', filename)
            ];

            for (const filePath of possiblePaths) {
                if (fsSync.existsSync(filePath)) {
                    try {
                        const content = await fs.readFile(filePath, 'utf-8');
                        return {
                            path: filePath,
                            content,
                            name: filename
                        };
                    } catch (error) {
                        console.error(`❌ Erreur lecture ${filePath}:`, error);
                    }
                }
            }
        }

        return null;
    }

    async generateProfessionalResponse(message: string, username?: string, userId?: string, attachmentContent?: string, channelId?: string): Promise<ChatResponse> {
        try {
            // 🔍 VÉRIFICATION SPÉCIALE: Détecter si on demande d'afficher un fichier markdown
            const isMarkdownFileRequest = this.isMarkdownFileDisplayRequest(message);
            let markdownFileInfo: { path: string; content: string; name: string } | null = null;

            if (isMarkdownFileRequest) {
                markdownFileInfo = await this.extractMarkdownFile(message);
                if (markdownFileInfo) {
                    console.log(`📄 Fichier markdown détecté: ${markdownFileInfo.name} (${markdownFileInfo.content.length} caractères)`);
                }
            }

            console.log(`[Sniper] 🔍 PRÉ-TRAITEMENT: Analyse des références de fichiers`);
            // 🔍 PRÉ-TRAITEMENT: Détecter et normaliser les références de fichiers (sauf markdown qui est traité séparément)
            let processedMessage = message;
            let fileUpload: FileUploadData | undefined;
            let pendingFileParts: any[] = [];

            if (!markdownFileInfo) {
                const result = await this.preprocessFileReferences(message);
                processedMessage = result.processedMessage;
                fileUpload = result.fileUpload;
                pendingFileParts = result.pendingFileParts;
            }

            // UTILISATION UNIQUEMENT DE LA SESSION PERSISTANTE - PAS DE FALLBACK
            console.log(`[Sniper] 💬 Session persistante pure pour ${username}: ${processedMessage.substring(0, 50)}...`);

            const responseObj = await this.sessionManager.processMessage(
                userId || 'unknown',
                username || 'Utilisateur',
                processedMessage,
                attachmentContent
            );

            // Si on a un fichier markdown à afficher, l'afficher directement (sans passer par KiloCode)
            if (markdownFileInfo) {
                console.log(`📄 Affichage direct du fichier markdown`);
                const repairedContent = markdownFileInfo.content.replace(/```/g, '```');
                const contentParts = this.splitMarkdownContent(repairedContent, 1900);

                if (contentParts.length === 1) {
                    responseObj.messages.unshift(`📄 **${markdownFileInfo.name}**\n\n${contentParts[0]}\n\n_Le fichier complet est disponible en téléchargement ci-dessus._`);
                } else {
                    const totalParts = contentParts.length;
                    responseObj.messages.unshift(`📄 **${markdownFileInfo.name}** (${totalParts} parties)\n\n${contentParts[0]}\n\n_Le fichier complet est disponible en téléchargement ci-dessus._`);
                    for (let i = 1; i < contentParts.length; i++) {
                        responseObj.messages.push(`${contentParts[i]}\n\n_Partie ${i + 1}/${totalParts}_`);
                    }
                }

                // Uploader le vrai fichier
                responseObj.fileUpload = {
                    type: 'file_upload',
                    fichier: {
                        name: markdownFileInfo.name,
                        content: markdownFileInfo.content,
                        type: 'markdown'
                    },
                    message: {
                        contenu: `📄 Fichier chargé: ${markdownFileInfo.name} (${markdownFileInfo.content.length} caractères)`
                    }
                };
            }

            // Si on a des parties de fichier supplémentaires, les ajouter aux messages
            if (pendingFileParts && pendingFileParts.length > 0) {
                console.log(`📄 Ajout de ${pendingFileParts.length} parties supplémentaires de fichier`);
                for (const part of pendingFileParts) {
                    responseObj.messages.push(part.content);
                }
            }

            // Si on a un fichier pré-traité (non-markdown), l'ajouter à la réponse
            if (fileUpload && !markdownFileInfo) {
                console.log(`📁 Ajout du fichier pré-traité à la réponse: ${fileUpload.fichier.name}`);
                responseObj.fileUpload = fileUpload;
            }

            console.log(`Sniper: Réponses avec session persistante pour ${username}:`, responseObj.messages.length, 'messages');
            console.log(`Sniper: Poll disponible:`, !!responseObj.poll);
            console.log(`Sniper: DiscordMessage disponible:`, !!responseObj.discordMessage);
            console.log(`Sniper: FileUpload disponible:`, !!responseObj.fileUpload);

            // Retourner la réponse directement - elle contient déjà les structures Discord (poll, etc.)
            return responseObj;

        } catch (error) {
            console.error('Sniper: 💥 ERREUR SESSION PERSISTANTE - PAS DE FALLBACK:', error);

            // PAS DE FALLBACK - Renvoyer l'erreur pure
            throw new Error(`Session persistante échouée: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Vérifie si un texte contient des indices de structure JSON
     */
    protected containsJsonIndicators(text: string): boolean {
        const indicators = [
            '"type":',
            '"embeds":',
            '"boutons":',
            '"contenu":',
            '"message_enrichi"',
            '"poll"',
            'message_enrichi',
            '"fields"',
            '"name":',
            '"value":',
            '"data":',
            '"components":',
            '{"type":',
            '{"name":',
            '{"value":',
            '{"data":',
            '{"embeds":',
            '{"fields":',
            '{"discord_message":',
            '{"message_enrichi":',
            '{"poll":',
            '{"fileUpload":'
        ];

        // ====== DÉTECTION INTELLIGENTE DES SONDAGES ======
        // Patterns flexibles au lieu de mots-clés statiques
        const pollPatterns = [
            // 1. Mot "sondage" + verbe d'action
            /sondage\s+(généré|créé|demandé|proposé|préparé|réalisé)/i,
            // 2. Expressions comme "Voici le sondage"
            /(voici|voilà)\s+(le|un)?\s*sondage/i,
            // 3. "format JSON" ou "au format"
            /(format\s+json|au\s+format\s+json)/i,
            // 4. Contenu qui mentionne des options
            /(propose|offre|présente)\s+\d+\s+(options?|choix)/i,
            // 5. Réponses qui commencent par "J'ai généré"
            /^j'ai\s+(généré|créé|préparé)\s+(un\s+)?sondage/i,
            // 6. Mentions de "sondage" en général
            /sondage/i
        ];

        const found = indicators.some(indicator => text.includes(indicator));

        // Test des patterns de sondages
        const hasPollIndicator = pollPatterns.some(pattern => pattern.test(text));

        console.log(`Sniper: 🔍 Recherche indices JSON dans: "${text.substring(0, 50)}..."`);
        console.log(`Sniper: 📋 Indice JSON trouvé: ${found}`);
        console.log(`Sniper: 📊 Indice sondage trouvé (pattern): ${hasPollIndicator}`);

        // Retourner true si on trouve des indices JSON OU des indicateurs de sondage
        if (found || hasPollIndicator) {
            const foundIndicators = indicators.filter(indicator => text.includes(indicator));
            console.log(`Sniper: 🎯 Indice(s) spécifique(s): ${foundIndicators.join(', ')}`);
        }
        return found || hasPollIndicator;
    }

    /**
     * Récupère le message complet du bot depuis Discord quand la réponse est tronquée
     */
    private async getCompleteBotMessage(channelId: string, userId: string, username: string): Promise<string | null> {
        try {
            if (!this.client) {
                console.log('Sniper: ⚠️ Client not initialized');
                return null;
            }

            console.log(`Sniper: 🔍 Recherche du message complet du bot dans le channel ${channelId}`);

            // Récupérer les derniers messages du channel
            const channel = await this.client.channels.fetch(channelId) as any;
            if (!channel || !channel.messages) {
                console.log('Sniper: ⚠️ Impossible de récupérer les messages du channel');
                return null;
            }

            // Chercher le dernier message du bot (derniers 10 messages)
            const messages = await channel.messages.fetch({ limit: 10 });
            const botMessages = messages.filter((msg: any) => this.client && msg.author.id === this.client.user?.id);

            if (botMessages.size === 0) {
                console.log('Sniper: ⚠️ Aucun message du bot trouvé');
                return null;
            }

            // Prendre le message le plus récent du bot
            const latestBotMessage = botMessages.first();
            const content = latestBotMessage?.content || '';

            console.log(`Sniper: 📜 Message complet récupéré (${content.length} chars)`);
            console.log(`Sniper: 📝 Aperçu: "${content.substring(0, 100)}..."`);

            return content;
        } catch (error) {
            console.log('Sniper: ❌ Erreur lors de la récupération du message:', error);
            return null;
        }
    }

    // ====== SYSTÈME D'ANALYSE PROFESSIONNELLE ======

    analyzeIntent(message: string): string {
        const lowerMessage = message.toLowerCase();
        const trimmedMessage = message.trim();

        // Analyse financière et d'investissement
        if (lowerMessage.includes('bours') || lowerMessage.includes('action') || lowerMessage.includes('invest') ||
            lowerMessage.includes('trade') || lowerMessage.includes('crypto') || lowerMessage.includes('bitcoin') ||
            lowerMessage.includes('ethereum') || lowerMessage.includes(' marché') || lowerMessage.includes('finance') ||
            lowerMessage.includes('portefeuille') || lowerMessage.includes('dividend') || lowerMessage.includes('obligation')) {
            return 'financial_analysis';
        }

        // Recherche de données et informations
        if (lowerMessage.includes('donnée') || lowerMessage.includes('statistique') || lowerMessage.includes('rapport') ||
            lowerMessage.includes('analyse') || lowerMessage.includes('performance') || lowerMessage.includes('tendance')) {
            return 'data_research';
        }

        // Assistance technique et système
        if (lowerMessage.includes('code') || lowerMessage.includes('programmation') || lowerMessage.includes('développement') ||
            lowerMessage.includes('script') || lowerMessage.includes('bot') || lowerMessage.includes('discord') ||
            lowerMessage.includes('technique') || lowerMessage.includes('système')) {
            return 'technical_support';
        }

        // Salutations professionnelles
        if (lowerMessage.includes('bonjour') || lowerMessage.includes('hello') || lowerMessage.includes('salut') ||
            lowerMessage.includes('hey') || lowerMessage.includes('yo') || lowerMessage.includes('allo')) {
            return 'greeting';
        }

        // Remerciements
        if (lowerMessage.includes('merci') || lowerMessage.includes('thanks') || lowerMessage.includes('thank')) {
            return 'appreciation';
        }

        // Questions d'identité et capacités
        if (lowerMessage.includes('qui es') || lowerMessage.includes('quel est') || lowerMessage.includes('c est qui') ||
            lowerMessage.includes('identity') || lowerMessage.includes('présente') || lowerMessage.includes('décris')) {
            return 'identity';
        }

        // Questions sur les capacités et accès
        if (lowerMessage.includes('que peux') || lowerMessage.includes('comment fonction') || lowerMessage.includes('qu est ce') ||
            lowerMessage.includes('capability') || lowerMessage.includes('accessible') || lowerMessage.includes('disponible') ||
            lowerMessage.includes('outil') || lowerMessage.includes('ressource') || lowerMessage.includes('as tu') ||
            lowerMessage.includes('tu fais') || lowerMessage.includes('ton rôle') || lowerMessage.includes('ta mission')) {
            return 'capabilities';
        }

        // Suite conversationnelle (questions courtes comme "et?", "ok?", "ah bon?", etc.)
        if (trimmedMessage.length <= 5 &&
            (lowerMessage.includes('et') || lowerMessage.includes('donc') ||
             lowerMessage.includes('ok') || lowerMessage.includes('ah') ||
             lowerMessage.includes('hm') || lowerMessage.includes('hein') ||
             lowerMessage.includes('vraiment') || lowerMessage.match(/^[a-z]{1,3}\??$/))) {
            return 'conversation_continuation';
        }

        // Réactions et confirmations
        if (lowerMessage.includes('d accord') || lowerMessage.includes('ok') || lowerMessage.includes('bien') ||
            lowerMessage.includes('parfait') || lowerMessage.includes('super') || lowerMessage.includes('génial')) {
            return 'confirmation';
        }

        return 'professional_inquiry';
    }


    // 🔥 FALLBACKS SUPPRIMÉS COMPLÈTEMENT - PLUS AUCUN FALLBACK
    // generateProfessionalFallback supprimé - pas de réponses prédéfinies

    getMemberProfile(userId?: string, username?: string): any {
        if (userId && this.memberProfiles.has(userId)) {
            return this.memberProfiles.get(userId);
        }

        for (const profile of this.memberProfiles.values()) {
            if (profile.username === username) {
                return profile;
            }
        }

        return null;
    }

    createProfileContext(profile: any): string {
        if (!profile) return "## Utilisateur\nNouvel utilisateur ou profil non identifié";

        return `## Profil Utilisateur Connu
**Pseudo**: ${profile.username}${profile.nickname ? ` (${profile.nickname})` : ''}
**Membre depuis**: ${new Date(profile.joinedAt).toLocaleDateString('fr-FR')}`;
    }

    /**
     * Extract simple text responses like "Version: 1.0.0" or "Sniper Analyste Financier"
     */
    private extractSimpleTextResponse(text: string): string | null {
        // Clean the text first
        const cleanedText = this.stripAnsiCodes(text);

        // Look for patterns that indicate simple text responses
        const patterns = [
            /Version:\s*1\.0\.0/,  // Version: 1.0.0
            /Sniper\s+Analyste\s+Financier/,  // Sniper Analyste Financier
            /APP\s*--\s*\d{2}:\d{2}/,  // APP -- 19:26
            /Version\s*1\.0\.0/,  // Version 1.0.0
            /[\w\s]+:\s*[\w\s]+/,  // Key: Value patterns
            /Sniper\s+Analyste\s+Financier\s+APP/,  // Sniper Analyste Financier APP
            /APP\s+--\s*\d{2}:\d{2}\s+Version:\s*1\.0\.0/,  // Combined pattern
            /Sniper\s+Analyste\s+Financier\s+APP\s+--\s*\d{2}:\d{2}/,  // Full combined pattern
            /Version:\s*1\.0\.0\s+Sniper\s+Analyste\s+Financier/,  // Version + Sniper pattern
            /Sniper\s+Analyste\s+Financier\s+APP\s+--\s*\d{2}:\d{2}\s+Version:\s*1\.0\.0/,  // Full combined pattern
            /Sniper\s+Analyste\s+Financier\s+APP\s+--\s*\d{2}:\d{2}\s+Version:\s*1\.0\.0\s+Sniper\s+Analyste\s+Financier/  // Full combined pattern
        ];

        // First try to find any of our target patterns
        for (const pattern of patterns) {
            const match = cleanedText.match(pattern);
            if (match) {
                console.log(`Sniper: Found simple text pattern match: ${match[0]}`);
                return match[0].trim();
            }
        }

        // Also check for lines that look like simple responses
        const lines = cleanedText.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();

            // Skip lines that are clearly JSON or complex structures
            if (trimmedLine.includes('{') || trimmedLine.includes('}') ||
                trimmedLine.includes('[') || trimmedLine.includes(']') ||
                trimmedLine.startsWith('>') || trimmedLine.startsWith('*') ||
                trimmedLine.startsWith('⣿') || trimmedLine.startsWith('⡿') ||
                trimmedLine.includes('Checkpoint Saved') || trimmedLine.includes('API Request')) {
                continue;
            }

            // Look for our target patterns in this line
            for (const pattern of patterns) {
                if (pattern.test(trimmedLine)) {
                    console.log(`Sniper: Found target pattern in line: ${trimmedLine}`);
                    return trimmedLine;
                }
            }

            // If no specific pattern but looks like a simple response, return it
            if (trimmedLine.length > 5 && trimmedLine.length < 100 &&
                /[a-zA-Z0-9]/.test(trimmedLine)) {

                // Check for common simple response patterns
                if (trimmedLine.includes('Version:') || trimmedLine.includes('Sniper') ||
                    trimmedLine.includes('APP --') || trimmedLine.includes(':') ||
                    (trimmedLine.length > 10 && trimmedLine.length < 50)) {
                    console.log(`Sniper: Found simple text response: ${trimmedLine}`);
                    return trimmedLine;
                }
            }
        }

        return null;
    }

    parseClaudeJsonOutput(stdoutData: string): string {
        console.log(`Sniper: Parsing Claude JSON output (${stdoutData.length} chars)`);
        console.log('Raw NDJSON:', stdoutData.substring(0, 500));

        // First check for simple text responses (like "Version: 1.0.0")
        const simpleTextResponse = this.extractSimpleTextResponse(stdoutData);
        if (simpleTextResponse) {
            console.log(`Sniper: Found simple text response: ${simpleTextResponse}`);
            return simpleTextResponse;
        }

        // Nettoyer les données avant parsing
        const cleanedData = this.stripAnsiCodes(stdoutData);

        // Parser les lignes NDJSON comme BaseAgentSimple
        const lines = cleanedData.split('\n').filter(line => line.trim() !== '');

        const textContents: string[] = [];
        let jsonBuffer = '';

        for (const line of lines) {
            // Ignorer les lignes vides ou de contrôle
            if (!line.trim() || line.match(/^\[\d+[A-Z]?/)) {
                continue;
            }

            // Essayer de parser la ligne directement
            try {
                const event = JSON.parse(line);
                console.log('Parsed event type:', event.type, 'say:', event.say, 'content length:', event.content?.length || 0);

                // Réinitialiser le buffer
                jsonBuffer = '';

                // Collecter tous les contenus textuels non-reasoning
                if (event.type === 'say' && event.say !== 'reasoning' && event.content) {
                    textContents.push(event.content);
                    console.log('Found text content:', event.content.substring(0, 100));
                }

                // Priorité absolue: JSON dans metadata (le plus fiable)
                if (event.metadata && typeof event.metadata === 'object') {
                    // Chercher une réponse textuelle dans metadata
                    const response = this.extractResponseFromMetadata(event.metadata);
                    if (response) {
                        console.log('Sniper: Found response in metadata');
                        return response;
                    }
                }

                // Deuxième priorité: completion_result content
                if (event.type === 'completion_result' && event.content) {
                    const response = this.extractResponseFromContent(event.content);
                    if (response) {
                        console.log('Sniper: Found response in completion_result');
                        return response;
                    }
                }

                // NOUVEAU: Gérer les réponses Claude avec champ "result"
                if (event.type === 'result' && event.result && typeof event.result === 'string') {
                    console.log('Sniper: ✅ Found Claude result response:', event.result.substring(0, 100));
                    return event.result;
                }
            } catch (error) {
                console.log('Sniper: JSON parse failed for line:', line.substring(0, 100));

                // Si le parsing échoue, essayer de reconstruire du JSON multi-lignes
                jsonBuffer += line;

                // Si le buffer semble complet (commence par { et se termine par }), essayer de parser
                if (jsonBuffer.trim().startsWith('{') && jsonBuffer.trim().endsWith('}')) {
                    try {
                        const event = JSON.parse(jsonBuffer);
                        console.log('Parsed buffered event type:', event.type);

                        // Traiter l'événement bufferisé
                        if (event.type === 'say' && event.say !== 'reasoning' && event.content) {
                            textContents.push(event.content);
                            console.log('Found buffered text content:', event.content.substring(0, 100));
                        }

                        jsonBuffer = ''; // Reset le buffer après succès
                    } catch (bufferError) {
                        console.log('Buffer JSON parse failed, continuing to accumulate...');
                    }
                }
            }
        }

        // Si on a des contenus textuels, les utiliser
        if (textContents.length > 0) {
            console.log('Using collected text contents:', textContents.length, 'items');
            // Concaténer tous les contenus textuels
            const combinedText = textContents.join(' ').trim();
            if (combinedText.length > 10) {
                return combinedText;
            }
        }

        // Si on a des contenus textuels, les utiliser
        if (textContents.length > 0) {
            console.log('Using collected text contents:', textContents.length, 'items');
            // Concaténer tous les contenus textuels
            const combinedText = textContents.join(' ').trim();
            if (combinedText.length > 10) {
                return combinedText;
            }
        }

        // 🔥 FALLBACK AVANCÉ SUPPRIMÉ - Plus d'extraction de texte cassé
        console.log('No valid JSON found - NO FALLBACK');
        return '';
    }

    /**
     * Extrait une réponse des metadata JSON
     */
    private extractResponseFromMetadata(metadata: any): string | null {
        // Chercher différents champs possibles pour la réponse
        if (metadata.response && typeof metadata.response === 'string') {
            return metadata.response;
        }
        if (metadata.answer && typeof metadata.answer === 'string') {
            return metadata.answer;
        }
        if (metadata.message && typeof metadata.message === 'string') {
            return metadata.message;
        }
        if (metadata.text && typeof metadata.text === 'string') {
            return metadata.text;
        }
        return null;
    }

    /**
     * Extrait et traite les réponses JSON enrichies comme dans l'exemple fourni - Version améliorée
     */
    protected extractEnrichedJsonResponse(text: string): ChatResponse | null {
        try {
            // D'abord essayer d'extraire les réponses textuelles simples
            const simpleTextResponse = this.extractSimpleTextResponse(text);
            if (simpleTextResponse) {
                console.log('Sniper: ✅ Réponse textuelle simple détectée:', simpleTextResponse);
                return {
                    messages: [simpleTextResponse],
                    discordMessage: undefined
                };
            }

            // Nettoyer le texte des caractères spéciaux et des artefacts
            const cleanedText = this.cleanText(text);
            console.log('Sniper: 🧹 Texte nettoyé pour extraction JSON:', cleanedText.substring(0, 100));

            // Rechercher des structures JSON dans le texte
            const jsonMatches = cleanedText.match(/\{[\s\S]*?\}/g);
            if (jsonMatches) {
                console.log('Sniper: 🔍 Nombre de structures JSON trouvées:', jsonMatches.length);

                // Essayer chaque structure JSON trouvée
                for (const jsonStr of jsonMatches) {
                    try {
                        // Nettoyer la chaîne JSON individuelle
                        const cleanedJsonStr = this.cleanJsonString(jsonStr);

                        // Vérifier si la chaîne JSON est valide avant de parser
                        if (!this.isValidJsonString(cleanedJsonStr)) {
                            console.log('Sniper: ⚠️ Structure JSON invalide, passage à la suivante');
                            continue;
                        }

                        const parsedJson = JSON.parse(cleanedJsonStr);

                        // Si c'est une réponse JSON enrichie comme dans l'exemple
                        if (parsedJson.name && parsedJson.value) {
                            console.log('Sniper: ✅ Réponse JSON enrichie détectée:', parsedJson);

                            // Créer un message Discord enrichi basé sur la structure JSON
                            const discordMessage = {
                                type: 'message_enrichi' as const,
                                data: {
                                    content: parsedJson.name,
                                    embeds: [{
                                        title: parsedJson.name,
                                        description: parsedJson.value,
                                        color: 0x00ff00,
                                        fields: []
                                    }],
                                    components: []
                                }
                            };

                            return {
                                messages: [`${parsedJson.name}: ${parsedJson.value}`],
                                discordMessage: discordMessage
                            };
                        }

                        // Si c'est déjà un message Discord enrichi
                        if (parsedJson.type === 'message_enrichi' && parsedJson.data) {
                            console.log('Sniper: ✅ Message Discord enrichi détecté');
                            return {
                                messages: [parsedJson.data.content || 'Message enrichi'],
                                discordMessage: parsedJson
                            };
                        }

                        // Si c'est un message Discord standard
                        if (parsedJson.type === 'discord_message' && parsedJson.data) {
                            console.log('Sniper: ✅ Message Discord standard détecté');
                            return {
                                messages: [parsedJson.data.content || 'Message Discord'],
                                discordMessage: {
                                    type: 'message_enrichi' as const,
                                    data: parsedJson.data
                                } as any
                            };
                        }

                        // Si c'est un message avec type et data
                        if (parsedJson.type && parsedJson.data) {
                            console.log('Sniper: ✅ Message avec type et data détecté');
                            return {
                                messages: [parsedJson.data.content || parsedJson.data.description || 'Message détecté'],
                                discordMessage: {
                                    type: 'message_enrichi' as const,
                                    data: parsedJson.data
                                } as any
                            };
                        }

                        // Si c'est un objet JSON simple avec des propriétés utiles
                        if (typeof parsedJson === 'object' && Object.keys(parsedJson).length > 0) {
                            console.log('Sniper: ✅ Objet JSON simple détecté avec propriétés:', Object.keys(parsedJson));
                            // Extraire les informations utiles
                            let messageContent = 'Réponse JSON détectée: ';
                            for (const [key, value] of Object.entries(parsedJson)) {
                                if (typeof value === 'string' && value.length > 0 && value.length < 100) {
                                    messageContent += `${key}: ${value}, `;
                                }
                            }
                            return {
                                messages: [messageContent.trim().replace(/,$/, '')],
                                discordMessage: undefined
                            };
                        }

                    } catch (jsonError) {
                        console.log('Sniper: ⚠️ Erreur parsing JSON individuelle:', jsonError);
                        // Continuer avec la prochaine structure JSON
                        continue;
                    }
                }
            }

            // 🔥 FALLBACKS SUPPRIMÉS - Plus d'extraction de texte de fallback
            console.log('Sniper: ❌ Aucun JSON valide trouvé - PAS DE FALLBACK');
            return null;

        } catch (error) {
            console.log('Sniper: ⚠️ Erreur extraction JSON enrichi:', error);
        }
        return null;
    }

    /**
     * Nettoie le texte pour le parsing JSON - Version unifiée
     */
    private cleanText(text: string, options: {
        removeAsciiOnly?: boolean;
        balanceBrackets?: boolean;
        replaceQuotes?: boolean;
        removeTrailingCommas?: boolean;
    } = {}): string {
        const {
            removeAsciiOnly = false,
            balanceBrackets = false,
            replaceQuotes = false,
            removeTrailingCommas = false
        } = options;

        let cleaned = text;

        // 1. Supprimer les codes ANSI (TOUJOURS)
        cleaned = this.stripAnsiCodes(cleaned);

        // 2. Supprimer les caractères de contrôle et artefacts visuels
        cleaned = cleaned.replace(/[⠀-⣿]/g, ''); // Braille
        cleaned = cleaned.replace(/[■▓▒░]/g, ''); // Caractères de bloc
        cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Contrôle

        // 3. Supprimer les lignes avec seulement des caractères spéciaux
        cleaned = cleaned.replace(/^[⠀-⣿■▓▒░]+$/gm, '');

        // 4. Optionnel : Garder seulement ASCII
        if (removeAsciiOnly) {
            cleaned = cleaned.replace(/[^\x20-\x7E]/g, '');
        }

        // 5. Optionnel : Remplacer guillemets simples
        if (replaceQuotes) {
            cleaned = cleaned.replace(/'/g, '"');
        }

        // 6. Optionnel : Supprimer virgules traînantes
        if (removeTrailingCommas) {
            cleaned = cleaned.replace(/,\s*}/g, '}'); // Avant accolades
            cleaned = cleaned.replace(/,\s*]/g, ']'); // Avant crochets
        }

        // 7. Optionnel : Équilibrer brackets
        if (balanceBrackets) {
            cleaned = this.balanceJsonBrackets(cleaned);
        }

        // 8. Nettoyer les espaces
        cleaned = cleaned.replace(/\s+/g, ' ').trim();

        // 9. Supprimer artefacts spécifiques (TOUJOURS)
        cleaned = cleaned.replace(/APP\s*--\s*\d{2}:\d{2}/g, ''); // Timestamps APP
        cleaned = cleaned.replace(/Version:\s*1\.0\.0/g, ''); // Versions
        cleaned = cleaned.replace(/Sniper\s+Analyste\s+Financier/g, ''); // Titres

        return cleaned;
    }

    /**
     * Nettoie une chaîne JSON - Version simplifiée
     */
    private cleanJsonString(jsonStr: string): string {
        return this.cleanText(jsonStr, {
            removeAsciiOnly: true,
            replaceQuotes: true,
            removeTrailingCommas: true,
            balanceBrackets: true
        });
    }

    /**
     * Équilibre les accolades et les crochets dans une chaîne JSON
     */
    private balanceJsonBrackets(jsonStr: string): string {
        let result = jsonStr;

        // Compter les accolades et les crochets
        const openBraces = (result.match(/\{/g) || []).length;
        const closeBraces = (result.match(/\}/g) || []).length;
        const openBrackets = (result.match(/\[/g) || []).length;
        const closeBrackets = (result.match(/\]/g) || []).length;

        console.log(`Sniper: 🔧 Équilibrage JSON - Accolades: ${openBraces}/${closeBraces}, Crochets: ${openBrackets}/${closeBrackets}`);

        // Équilibrer les accolades
        if (openBraces > closeBraces) {
            result += '}'.repeat(openBraces - closeBraces);
            console.log(`Sniper: 🔧 Ajout de ${openBraces - closeBraces} accolades fermantes`);
        }

        // Équilibrer les crochets
        if (openBrackets > closeBrackets) {
            result += ']'.repeat(openBrackets - closeBrackets);
            console.log(`Sniper: 🔧 Ajout de ${openBrackets - closeBrackets} crochets fermants`);
        }

        return result;
    }

    /**
     * Vérifie si une chaîne JSON est potentiellement valide
     */
    private isValidJsonString(str: string): boolean {
        // Vérifier la longueur minimale
        if (str.length < 5) return false;

        // Vérifier qu'elle commence et finit par des accolades
        if (!str.trim().startsWith('{') || !str.trim().endsWith('}')) return false;

        // Vérifier qu'elle contient des caractères valides
        if (!/[a-zA-Z0-9]/.test(str)) return false;

        // Vérifier qu'elle ne contient pas trop de caractères problématiques
        const problematicChars = str.match(/[^\x20-\x7E]/g) || [];
        if (problematicChars.length > str.length * 0.1) return false;

        return true;
    }

    /**
     * Extrait du texte utile des réponses mixtes JSON/texte
     */
    // 🔥 MÉTHODES DE FALLBACK SUPPRIMÉES COMPLÈTEMENT
    // extractFallbackTextFromMixedContent supprimée
    // extractMeaningfulTextFromMixedContent supprimée

    /**
     * Extrait une réponse du content (JSON ou texte)
     */
    private extractResponseFromContent(content: string): string | null {
        // D'abord essayer de parser du JSON
        try {
            const jsonData = JSON.parse(content);
            // NOUVEAU: Gérer les réponses Claude avec champ "result"
            if (jsonData.result && typeof jsonData.result === 'string') return jsonData.result;
            if (jsonData.response) return jsonData.response;
            if (jsonData.answer) return jsonData.answer;
            if (jsonData.message) return jsonData.message;
            if (jsonData.contenu) return jsonData.contenu; // Pour message_enrichi
            if (jsonData.type === 'message_enrichi') {
                // Extraire le contenu principal du message enrichi
                if (jsonData.contenu) return jsonData.contenu;
                if (jsonData.embeds && jsonData.embeds.length > 0 && jsonData.embeds[0].description) {
                    return jsonData.embeds[0].description;
                }
            }
            // Gestion des réponses JSON enrichies comme dans l'exemple
            if (jsonData.name && jsonData.value) {
                return `${jsonData.name}: ${jsonData.value}`;
            }
            if (jsonData.data && jsonData.data.content) {
                return jsonData.data.content;
            }
            if (jsonData.data && jsonData.data.embeds && jsonData.data.embeds.length > 0) {
                return jsonData.data.embeds[0].description || jsonData.data.embeds[0].title || JSON.stringify(jsonData.data.embeds[0]);
            }
        } catch {
            // Si ce n'est pas du JSON, chercher des fragments JSON dans le content
            console.log('Sniper: Extraction de fragments JSON du content...');
            const jsonFragments = this.extractJsonFragmentsFromContent(content);
            if (jsonFragments.length > 0) {
                // Retourner le premier fragment JSON trouvé
                try {
                    const parsed = JSON.parse(jsonFragments[0]);
                    // NOUVEAU: Gérer les réponses Claude avec champ "result"
                    if (parsed.result && typeof parsed.result === 'string') return parsed.result;
                    if (parsed.contenu) return parsed.contenu;
                    if (parsed.embeds && parsed.embeds.length > 0 && parsed.embeds[0].description) {
                        return parsed.embeds[0].description;
                    }
                    // Gestion des réponses JSON enrichies comme dans l'exemple
                    if (parsed.name && parsed.value) {
                        return `${parsed.name}: ${parsed.value}`;
                    }
                    if (parsed.data && parsed.data.content) {
                        return parsed.data.content;
                    }
                    if (parsed.data && parsed.data.embeds && parsed.data.embeds.length > 0) {
                        return parsed.data.embeds[0].description || parsed.data.embeds[0].title || JSON.stringify(parsed.data.embeds[0]);
                    }
                } catch {
                    // Continuer avec le fallback
                }
            }
            // Fallback: retourner le content directement s'il est valide
            if (content && content.trim().length > 10) {
                return content.trim();
            }
        }
        return null;
    }

    /**
     * Extrait les fragments JSON d'un contenu textuel
     */
    private extractJsonFragmentsFromContent(content: string): string[] {
        const fragments: string[] = [];

        // 1. D'abord, essayer de détecter les blocs de code markdown ```json ... ```
        const codeBlockRegex = /```json\s*([\s\S]*?)\s*```/gi;
        let match;

        while ((match = codeBlockRegex.exec(content)) !== null) {
            const jsonStr = match[1].trim();
            if (jsonStr.length > 10) {
                try {
                    JSON.parse(jsonStr);
                    fragments.push(jsonStr);
                    console.log('✅ Fragment JSON trouvé dans un bloc markdown:', jsonStr.substring(0, 50) + '...');
                } catch (error) {
                    console.log('⚠️ JSON invalide dans le bloc markdown:', error);
                }
            }
        }

        // 2. Si aucun bloc markdown trouvé, chercher du JSON dans le texte brut
        if (fragments.length === 0) {
            const jsonRegex = /\{[\s\S]*\}/g;
            let braceMatch;

            while ((braceMatch = jsonRegex.exec(content)) !== null) {
                const jsonStr = braceMatch[0];
                if (jsonStr.length > 50) {
                    try {
                        // Vérifier si c'est du JSON valide
                        JSON.parse(jsonStr);
                        fragments.push(jsonStr);
                        console.log('✅ Fragment JSON trouvé (méthode fallback):', jsonStr.substring(0, 50) + '...');
                    } catch {
                        // Ignorer les fragments invalides
                    }
                }
            }
        }

        return fragments;
    }

    /**
     * Réparation simple de JSON
     */
    private attemptSimpleJsonRepair(jsonStr: string): string | null {
        let repaired = jsonStr;

        // Équilibrer les accolades
        const openBraces = (repaired.match(/\{/g) || []).length;
        const closeBraces = (repaired.match(/\}/g) || []).length;
        if (openBraces > closeBraces) {
            repaired += '}'.repeat(openBraces - closeBraces);
        }

        try {
            JSON.parse(repaired);
            return repaired;
        } catch {
            return null;
        }
    }

    /**
     * Extrait la réponse complète en cherchant des phrases complètes dans le JSON
     */
    private extractCompleteResponseAfterPosition(stdout: string, partialContent: string): string | null {
        // Nettoyer le JSON pour ne garder que le texte (retirer les séquences d'échappement)
        // eslint-disable-next-line no-control-regex
        const cleanJson = stdout.replace(/\u001b\[[0-9;]*[mGKHJABCD]/g, '').replace(/\[2K\[1A\[2K\[G/g, '');

        // Chercher des phrases complètes après le contenu partiel
        const startIndex = cleanJson.indexOf(partialContent);
        if (startIndex === -1) return null;

        // Chercher une phrase complète après cette position
        const afterContent = cleanJson.substring(startIndex + partialContent.length);

        // Patterns pour trouver des phrases complètes
        const sentencePatterns = [
            // Phrase commençant par "Je suis" et se terminant par ., !, ou ?
            /Je suis[^.!?]*[.!?]/g,
            // Phrase avec "modèle" et se terminant par ponctuation
            /modèle[^.!?]*[.!?]/g,
            // Phrase complète avec majuscule et ponctuation
            /[A-ZÀÉÈÊË][^.!?]{20,}[.!?]/g,
            // Texte français cohérent (au moins 15 caractères)
            /[a-zàéèêëâääçîïôöùüÿ]{15,}/g,
        ];

        for (const pattern of sentencePatterns) {
            const matches = [...afterContent.matchAll(pattern)];
            if (matches.length > 0) {
                const match = matches[0][0];
                if (match && match.length > partialContent.length) {
                    // Éviter la duplication : chercher si le match contient déjà le partialContent
                    if (match.includes(partialContent)) {
                        console.log('Match already contains partial content, using match directly:', match);
                        return match;
                    } else {
                        // Si le match est vraiment une extension, les combiner
                        const completeResponse = partialContent + match;
                        console.log('Reconstructed complete response:', completeResponse);
                        return completeResponse;
                    }
                }
            }
        }

        // Si rien trouvé, essayer de compléter avec un simple pattern
        const simpleExtension = afterContent.match(/[^"\\]{10,30}/);
        if (simpleExtension) {
            const extension = simpleExtension[0];
            if (extension && /[a-zA-Z]/.test(extension)) {
                const extendedResponse = partialContent + extension;
                console.log('Simple extension found:', extendedResponse);
                return extendedResponse;
            }
        }

        return null;
    }

    /**
     * Appelle Claude avec la méthode de BaseAgentSimple
     */
    private async callClaudeDirect(req: { prompt: string; outputFile: string }): Promise<unknown> {
        const fullOutputPath = path.join(process.cwd(), req.outputFile);

        console.log(`Sniper: Preparing Claude execution with simple prompt...`);

        try {
            // Pour les gros prompts, utiliser un fichier temporaire
            if (req.prompt.length > 1000) {
                return await this.executeWithFile(req, fullOutputPath);
            } else {
                return await this.executeDirect(req, fullOutputPath);
            }
        } catch (error) {
            console.error(`Sniper: Claude execution failed:`, error);
            throw error;
        }
    }

    /**
     * Exécute avec un fichier temporaire
     */
    private async executeWithFile(req: { prompt: string; outputFile: string }, fullOutputPath: string): Promise<unknown> {
        const tempPromptPath = path.join(process.cwd(), 'temp_prompt.txt');
        await fs.writeFile(tempPromptPath, req.prompt, 'utf-8');

        const command = `cat "${tempPromptPath}" | kilocode -m ask --auto --json`;
        console.log(`Sniper: Using file-based execution for prompt (${req.prompt.length} chars)`);

        try {
            const { stdout } = await execAsync(command, {
                timeout: 300000, // 5 minutes au lieu de 2
                cwd: process.cwd(),
                maxBuffer: 1024 * 1024 * 50, // 50MB buffer
                killSignal: 'SIGKILL'
            });

            await fs.writeFile(fullOutputPath, stdout, 'utf-8');
            return this.parseSimpleClaudeOutput(stdout);
        } catch (error) {
            console.error('Sniper: File-based execution failed, trying fallback...');
            // En cas d'échec avec le fichier, essayer la méthode directe
            return await this.executeDirect(req, fullOutputPath);
        } finally {
            try {
                await fs.unlink(tempPromptPath);
                console.log(`Sniper: Cleaned up temporary file`);
            } catch {
                // Ignorer les erreurs de nettoyage
            }
        }
    }

    /**
     * Exécute directement en ligne de commande avec gestion du buffer et timeout amélioré
     */
    private async executeDirect(req: { prompt: string; outputFile: string }, fullOutputPath: string): Promise<unknown> {
        const escapedPrompt = req.prompt.replace(/"/g, '\\"');
        const command = `kilocode -m ask --auto --json "${escapedPrompt}"`;

        console.log(`Sniper: Executing direct command with increased buffer and timeout`);

        try {
            // Augmentation significative du timeout et du buffer pour les analyses complexes
            const { stdout } = await execAsync(command, {
                timeout: 300000, // 5 minutes au lieu de 2 (augmenté pour les analyses financières)
                cwd: process.cwd(),
                maxBuffer: 1024 * 1024 * 50, // 50MB buffer par défaut (augmenté de 10MB)
                // Désactiver le signal SIGTERM pour permettre une exécution complète
                killSignal: 'SIGKILL' // Plus propre que SIGTERM
            });

            await fs.writeFile(fullOutputPath, stdout, 'utf-8');
            return this.parseSimpleClaudeOutput(stdout);
        } catch (error) {
            // Type guard to check if error has code property
            const isNodeError = (err: unknown): err is { code: string, message: string, signal?: string } => {
                return typeof err === 'object' && err !== null && 'code' in err && 'message' in err;
            };

            // Gestion spécifique du SIGTERM/timeout
            if (isNodeError(error) && (error.signal === 'SIGTERM' || error.signal === 'SIGKILL')) {
                console.error('Sniper: Process terminated by signal, retrying with extended timeout...');

                try {
                    const { stdout } = await execAsync(command, {
                        timeout: 600000, // 10 minutes pour la deuxième tentative
                        cwd: process.cwd(),
                        maxBuffer: 1024 * 1024 * 100, // 100MB buffer maximum
                        killSignal: 'SIGKILL'
                    });

                    await fs.writeFile(fullOutputPath, stdout, 'utf-8');
                    return this.parseSimpleClaudeOutput(stdout);
                } catch (retryError) {
                    console.error('Sniper: Extended timeout attempt failed:', retryError);
                    // 🔥 FALLBACK SUPPRIMÉ - Échec direct
                    throw new Error(`Claude execution failed after retries: ${retryError instanceof Error ? retryError.message : String(retryError)}`);
                }
            }
            else if (isNodeError(error) && error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
                console.error('Sniper: Buffer overflow detected, trying with larger buffer...');

                try {
                    const { stdout } = await execAsync(command, {
                        timeout: 600000, // 10 minutes pour les gros buffers
                        cwd: process.cwd(),
                        maxBuffer: 1024 * 1024 * 100, // 100MB buffer maximum
                        killSignal: 'SIGKILL'
                    });

                    await fs.writeFile(fullOutputPath, stdout, 'utf-8');
                    return this.parseSimpleClaudeOutput(stdout);
                } catch (retryError) {
                    console.error('Sniper: Large buffer attempt failed:', retryError);
                    throw retryError;
                }
            } else {
                console.error('Sniper: Claude execution failed (non-buffer error):', error);
                // 🔥 FALLBACK SUPPRIMÉ - Échec direct
                throw new Error(`Claude execution failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }

    /**
     * Fallback avec commande simplifiée en cas d'échec
     */
    // 🔥 MÉTHODE DE FALLBACK SUPPRIMÉE COMPLÈTEMENT
    // executeSimplifiedFallback supprimée - plus de fallback simplifié

    /**
     * Parsing simple de Claude (version améliorée pour mieux lire le JSON)
     */
    private parseSimpleClaudeOutput(stdoutData: string): unknown {
        console.log(`Sniper: Parsing Claude output (${stdoutData.length} chars) - IMPROVED JSON PARSING`);

        // First, clean the output by removing ANSI escape codes
        const cleanOutput = this.stripAnsiCodes(stdoutData);

        // Check for simple text responses first (like "Version: 1.0.0")
        const simpleTextResponse = this.extractSimpleTextResponse(cleanOutput);
        if (simpleTextResponse) {
            console.log(`Sniper: Found simple text response: ${simpleTextResponse}`);
            return simpleTextResponse;
        }

        // Check again for simple text in case the first pass missed something
        // This handles cases where simple text is embedded in complex output
        const lines = cleanOutput.split('\n');
        for (const line of lines) {
            const simpleResponse = this.extractSimpleTextResponse(line);
            if (simpleResponse) {
                console.log(`Sniper: Found simple text in line: ${simpleResponse}`);
                return simpleResponse;
            }
        }

        // Parser les lignes NDJSON avec améliorations
        const filteredLines = cleanOutput.split('\n').filter(line => line.trim() !== '');

        // Collect all non-reasoning content with better extraction
        const contentResults: string[] = [];
        const jsonEvents: any[] = []; // Store all parsed JSON events for better analysis

        for (const line of filteredLines) {
            try {
                const event = JSON.parse(line);
                jsonEvents.push(event); // Store all events for comprehensive analysis

                // Réduire le bruit des logs - seulement pour les événements importants
                if (event.type === 'say' && event.content && event.content.length > 0 && event.say !== 'reasoning') {
                    console.log(`Sniper: Parsed JSON event - type: ${event.type}, say: ${event.say}, content length: ${event.content.length}`);
                }

                // Improved content extraction logic
                if (event.type === 'say' && event.content) {
                    // Skip reasoning content as it's not the final response
                    if (event.say === 'reasoning') {
                        console.log('Sniper: Skipping reasoning content (not final response)');
                        continue;
                    }

                    // Better content validation and extraction
                    const content = event.content.trim();
                    if (content.length > 0) {
                        console.log(`Sniper: Found valid content in say event (${content.length} chars): ${content.substring(0, 80)}...`);
                        contentResults.push(content);

                        // Check if this looks like a complete response
                        if (content.length > 50 && /[.!?]$/.test(content)) {
                            console.log('Sniper: Found potential complete response in say event');
                        }
                    }
                }

                // Enhanced completion_result handling
                if (event.type === 'completion_result' && event.content) {
                    const content = event.content.trim();
                    if (content.length > 0) {
                        console.log(`Sniper: Found content in completion_result (${content.length} chars): ${content.substring(0, 80)}...`);
                        contentResults.push(content);

                        // Prioritize completion_result content
                        if (content.length > 30) {
                            console.log('Sniper: High-priority completion_result found');
                        }
                    }
                }

                // Improved metadata extraction
                if (event.metadata && typeof event.metadata === 'object') {
                    for (const field of ['response', 'answer', 'message', 'text', 'result', 'output']) {
                        if (event.metadata[field] && typeof event.metadata[field] === 'string') {
                            const metadataContent = event.metadata[field].trim();
                            if (metadataContent.length > 5) {
                                console.log(`Sniper: Found metadata field ${field} (${metadataContent.length} chars): ${metadataContent.substring(0, 60)}...`);
                                contentResults.push(metadataContent);
                            }
                        }
                    }
                }

                // Check for additional response fields
                for (const field of ['response', 'answer', 'message', 'text', 'result', 'output', 'reply']) {
                    if (event[field] && typeof event[field] === 'string') {
                        const fieldContent = event[field].trim();
                        if (fieldContent.length > 5 && !fieldContent.includes('checkpoint_saved')) {
                            console.log(`Sniper: Found additional field ${field} (${fieldContent.length} chars): ${fieldContent.substring(0, 60)}...`);
                            contentResults.push(fieldContent);
                        }
                    }
                }

            } catch (error) {
                console.log(`Sniper: JSON parse failed for line (${error}): ${line.substring(0, 100)}`);

                // Enhanced error recovery - try to extract content even from malformed JSON
                try {
                    // Look for content patterns in the raw line
                    const contentMatch = line.match(/"content":"([^"]+)"/);
                    if (contentMatch && contentMatch[1]) {
                        const extractedContent = contentMatch[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').trim();
                        if (extractedContent.length > 5) {
                            console.log(`Sniper: Recovered content from malformed JSON (${extractedContent.length} chars): ${extractedContent.substring(0, 60)}...`);
                            contentResults.push(extractedContent);
                        }
                    }
                } catch (recoveryError) {
                    console.log('Sniper: Recovery attempt failed for line');
                }
            }
        }

        // Comprehensive analysis of all collected content
        console.log(`Sniper: Collected ${contentResults.length} content items from ${jsonEvents.length} JSON events`);

        // If we have collected content, perform intelligent selection
        if (contentResults.length > 0) {
            // Priorité absolue aux completion_result les plus longs (réponses finales)
            const completionResults = contentResults.filter(content =>
                content.length > 100 &&
                /[.!?]$/.test(content) &&
                !content.includes('checkpoint_saved') &&
                !content.includes('Réponds en français')
            );

            if (completionResults.length > 0) {
                // Prendre le completion_result le plus long
                const bestCompletion = completionResults.sort((a, b) => b.length - a.length)[0];
                console.log(`Sniper: Found best completion_result (${bestCompletion.length} chars): ${bestCompletion.substring(0, 100)}...`);
                return bestCompletion;
            }

            // Sinon, trier par longueur et chercher des réponses complètes
            const filteredResults = contentResults.filter(content => content.length > 3);
            const sortedResults = filteredResults.sort((a, b) => b.length - a.length);

            console.log(`Sniper: ${sortedResults.length} valid content items after filtering`);

            // Intelligent response selection
            for (const content of sortedResults) {
                console.log(`Sniper: Evaluating content (${content.length} chars): ${content.substring(0, 100)}...`);

                // Check for complete responses (ending with punctuation)
                if (content.length > 10 && /[.!?]$/.test(content)) {
                    console.log('Sniper: Selecting complete response ending with punctuation');
                    return content;
                }

                // Check for meaningful content (not just prompt echoes)
                if (content.length > 15 &&
                    !content.includes('Réponds en français à cette question') &&
                    !content.includes('checkpoint_saved') &&
                    !content.match(/^[a-f0-9]{40}$/)) {
                    console.log('Sniper: Selecting meaningful content response');
                    return content;
                }
            }

            // If no ideal response found, return the longest one
            if (sortedResults.length > 0) {
                const longestContent = sortedResults[0];
                console.log(`Sniper: Returning longest available content (${longestContent.length} chars): ${longestContent.substring(0, 100)}...`);
                return longestContent;
            }
        }

        // Enhanced fallback with better JSON analysis
        console.log('Sniper: No valid structured content found, attempting advanced extraction');

        // Try to extract from the most promising JSON event
        if (jsonEvents.length > 0) {
            // Look for events with actual content fields
            for (const event of jsonEvents) {
                for (const field of ['content', 'response', 'answer', 'message', 'text']) {
                    if (event[field] && typeof event[field] === 'string') {
                        const fieldContent = event[field].trim();
                        if (fieldContent.length > 3) {
                            console.log(`Sniper: Extracted from event field ${field}: ${fieldContent.substring(0, 80)}...`);
                            return fieldContent;
                        }
                    }
                }
            }
        }

        // Final fallback to natural language extraction
        console.log('Sniper: Attempting natural language extraction from raw output');
        return this.extractNaturalLanguageResponse(cleanOutput);
    }

    /**
     * Génère une réponse contextuelle simple
     */
    private generateContextualResponse(message: string): string {
        const responses = [
            "Je suis Sniper, votre assistant financier professionnel. Comment puis-je vous aider?",
            "Bonjour! Je suis Sniper, votre bot spécialisé en analyse financière.",
            "Sniper à votre service! Je peux analyser les marchés et fournir des conseils financiers.",
            "Je suis votre assistant Sniper, spécialiste en données financières et marchés."
        ];

        return responses[Math.floor(Math.random() * responses.length)];
    }

    /**
     * 🔥 MÉTHODE DE FALLBACK COMPLÈTEMENT SUPPRIMÉE
     */
    // extractTextFromBrokenJson et tout son code de fallback supprimés

    /**
     * Nettoyer les codes ANSI (inspiré de Vortex500Agent)
     */
    private stripAnsiCodes(str: string): string {
        // eslint-disable-next-line no-control-regex
        return str
            // eslint-disable-next-line no-control-regex
            .replace(/\u001b\[[0-9;]*[mGKHJABCD]/g, '')
            // eslint-disable-next-line no-control-regex
            .replace(/\u001b\[[0-9]*[A-Z]/g, '')
            // eslint-disable-next-line no-control-regex
            .replace(/\u001b\[K/g, '')
            // eslint-disable-next-line no-control-regex
            .replace(/\u001b\[G/g, '')
            // eslint-disable-next-line no-control-regex
            .replace(/\u001b\[2K/g, '')
            // eslint-disable-next-line no-control-regex
            .replace(/\u001b\[1A/g, '')
            // eslint-disable-next-line no-control-regex
            .replace(/\u001b\]0;[^\u0007]*\u0007/g, '')
            // eslint-disable-next-line no-control-regex
            .replace(/\u001b\]0;[^\u0007]*\u001b\\/g, '')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');
    }

    /**
     * Clean Claude responses by removing prompt prefixes - NO FALLBACK VERSION
     */
    private cleanClaudeResponse(response: string, prompt: string): string {
        console.log(`Sniper: Cleaning response (NO FALLBACK): "${response.substring(0, 100)}..."`);

        // Remove the exact prompt first
        let cleanedResponse = response.replace(prompt, '').trim();
        console.log(`Sniper: After removing exact prompt: "${cleanedResponse.substring(0, 100)}..."`);

        // Aggressively remove any variations of the prompt that might appear
        const promptVariations = [
            'Réponds en français à cette question de manière concise:',
            'Réponds en français à cette question de manière concise :',
            'Réponds en français à cette question de manière concise : ',
            'Réponds en français à cette question de manière concise: ',
            'Réponds en français à cette question de manière concise: @',
            'Réponds en français à cette question de manière concise : @',
            'Réponds en français à cette question de manière concise',
            'Réponds en français à cette question',
            'Réponds en français',
            'Réponds à cette question'
        ];

        let finalResponse = cleanedResponse;
        for (const variation of promptVariations) {
            const beforeCleaning = finalResponse;
            finalResponse = finalResponse.replace(variation, '').trim();
            if (finalResponse !== beforeCleaning) {
                console.log(`Sniper: Removed prompt variation: "${variation}"`);
            }
        }

        // Remove any remaining prompt-like patterns including @mentions
        finalResponse = finalResponse.replace(/^@\w+\s*/, '').trim();
        finalResponse = finalResponse.replace(/^:\s*/, '').trim();
        finalResponse = finalResponse.replace(/^\s*-\s*/, '').trim();
        finalResponse = finalResponse.replace(/^[\s:;.,-]+/, '').trim();

        // Remove any Claude artifacts
        finalResponse = finalResponse.replace(/^\w+:\s*/, '').trim();
        finalResponse = finalResponse.replace(/^[\d\w]+\s*:\s*/, '').trim();

        console.log(`Sniper: Final cleaned response (NO FALLBACK): "${finalResponse.substring(0, 100)}..."`);

        // NO FALLBACK - return whatever we have, even if empty
        // This gives us the raw Claude response without any fallback interference
        if (finalResponse.length === 0) {
            console.log('Sniper: Empty response after cleaning - returning empty string (NO FALLBACK)');
            return ''; // Return empty string instead of fallback
        }

        return finalResponse;
    }

    /**
     * Extraire le JSON du contenu (inspiré de Vortex500Agent)
     */
    private extractJsonFromContent(content: string): any | null {
        const patterns = [
            /\{[\s\S]*?"response"[\s\S]*?\}/g, // JSON avec response
            /\{[\s\S]*?"type"[\s\S]*?"response"[\s\S]*?\}/g, // JSON structuré
            /\{[\s\S]*?\}/g, // N'importe quel objet JSON
        ];

        for (const pattern of patterns) {
            const matches = content.match(pattern);
            if (matches) {
                for (const match of matches) {
                    try {
                        return JSON.parse(match);
                    } catch {
                        continue;
                    }
                }
            }
        }
        return null;
    }

    /**
     * Extraire une réponse en langage naturel de manière robuste
     */
    private extractNaturalLanguageResponse(cleanOutput: string): string {
        console.log('\n=== DEBUG EXTRACTION PROCESS ===');

        // Diviser en lignes et traiter
        const lines = cleanOutput.split('\n');
        const naturalResponses: Array<{text: string, score: number}> = [];

        console.log('Processing', lines.length, 'lines for natural responses...');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // Ignorer les lignes de log, debug, et métadonnées
            if (this.isLogLine(trimmed)) {
                console.log(`Line ${i}: IGNORED (log line): "${trimmed.substring(0, 50)}..."`);
                continue;
            }

            // Accepter les phrases qui ressemblent à une réponse naturelle
            if (this.isNaturalLanguageResponse(trimmed)) {
                const score = this.scoreNaturalResponse(trimmed, i, lines.length);
                naturalResponses.push({ text: trimmed, score });
                console.log(`Line ${i}: FOUND (score ${score}): "${trimmed}"`);
            } else {
                console.log(`Line ${i}: REJECTED: "${trimmed.substring(0, 50)}..."`);
            }
        }

        console.log(`Found ${naturalResponses.length} potential responses`);

        // Si on a trouvé des réponses naturelles, retourner la MEILLEURE (plus haut score)
        if (naturalResponses.length > 0) {
            // Trier par score (du plus haut au plus bas)
            naturalResponses.sort((a, b) => b.score - a.score);

            const bestResponse = naturalResponses[0];
            console.log(`Best response selected (score ${bestResponse.score}): "${bestResponse.text}"`);

            // Nettoyer les guillemets et formatage
            let response = bestResponse.text.replace(/^["'""'']|["'""'']$/g, '').trim();

            // Limiter la longueur pour Discord
            if (response.length > 300) {
                response = response.substring(0, 297) + '...';
            }

            console.log('=== END EXTRACTION PROCESS ===\n');
            return response;
        }

        console.log('No natural response found - returning raw output');
        console.log('=== END EXTRACTION PROCESS ===\n');

        // PAS DE FALLBACK - retourner le output brut pour voir le bug
        return cleanOutput.substring(0, 500) + (cleanOutput.length > 500 ? '...' : '');
    }

    /**
     * Score une réponse naturelle pour trouver la meilleure - Version simplifiée
     */
    private scoreNaturalResponse(text: string, lineIndex: number, totalLines: number): number {
        let score = 0;

        // Critères simples et efficaces
        if (text.startsWith('> ') || text.endsWith(' ...') || text.length < 15) {
            return -100; // Rejet immédiat
        }

        // Bonus pour longueur appropriée
        if (text.length >= 30 && text.length <= 300) score += 20;
        else if (text.length > 300) score += 5;

        // Bonus pour ponctuation
        if (/[.!?]$/.test(text)) score += 20;
        if (text.split(/[.!?]/).length > 1) score += 10;

        // Bonus pour contenu riche
        const richWords = ['analyse', 'données', 'marché', 'financier', 'peut', 'capacité', 'outil'];
        const richWordCount = richWords.filter(word => text.toLowerCase().includes(word)).length;
        score += richWordCount * 3;

        // Pénalité pour texte générique
        if (text.includes('sniper') && text.includes('bot') && text.includes('Discord')) {
            score -= 15;
        }

        // Position dans le fichier
        if (lineIndex < totalLines * 0.1) score -= 10;

        return score;
    }

    /**
     * Vérifier si une ligne est un log/métadonnée à ignorer
     */
    private isLogLine(line: string): boolean {
        const logIndicators = [
            'API Request', 'Reasoning', 'Understanding', '┌', '└', '│',
            '##', 'The task is', 'Sniper - Assistant', 'Message de l\'utilisateur',
            'Instructions de réponse', 'Session', 'Type d\'analyse', 'Requête principale',
            'Directives', 'Format de réponse', '###', 'server.', "user's message",
            'Assistant Financier', 'Service Premium', 'Niveau:', 'Analyse Financière',
            'Recherche et Analyse', 'Support Technique', 'Accueil Professionnel',
            'Conseil Professionnel', 'JSON structure:', 'response:', 'type:',
            '[INST]', '[/INST]', '<script>', '</script>', '<html>', '</html>',
            'Utilisateur:', 'User:', 'Client:', 'Member:'
        ];

        // Be less aggressive - only filter obvious log lines
        if (line.length === 0) return true;
        if (line.startsWith('*')) return true;
        if (/^[A-Z]{2,}$/.test(line)) return true;
        if (/^Utilisateur:\s*\d+$/.test(line)) return true; // Pattern "Utilisateur: 123456789"
        if (/^User:\s*\d+$/.test(line)) return true; // Pattern "User: 123456789"

        // Only filter if the line contains log indicators AND doesn't look like a valid response
        const hasLogIndicator = logIndicators.some(indicator => line.includes(indicator));
        if (hasLogIndicator) {
            // Don't filter if it looks like a valid response (has punctuation, reasonable length)
            if (line.length > 20 && line.length < 200 && /[.!?]$/.test(line)) {
                return false; // This looks like a valid response, don't filter
            }
            return true;
        }

        return false;
    }

    /**
     * Vérifier si une ligne ressemble à une réponse en langage naturel
     */
    private isNaturalLanguageResponse(line: string): boolean {
        // Doit avoir une longueur raisonnable
        if (line.length < 15 || line.length > 500) return false;

        // Ne doit PAS être un format de métadonnées
        if (/^[A-Z][a-z]*:/.test(line)) return false; // "Nom:", "User:", etc.
        if (/^\w+:\d+$/.test(line)) return false; // "user:123456789"
        if (line.includes(':') && line.split(':').length === 2 && line.split(':')[1].trim().length < 5) return false;

        // Doit contenir des mots en français/anglais valides
        const hasValidWords = /\b(je|tu|il|elle|nous|vous|ils|elles|mon|ton|son|ma|ta|sa|notre|votre|leur|mes|tes|ses|nos|vos|leurs|le|la|les|un|une|des|de|du|au|aux|en|sur|pour|avec|par|dans|vers|contre|sous|chez|hors|sans|pendant|depuis|jusqu|selon|malgré|pendant|depuis|jusqu|selon|malgré|the|a|an|and|or|but|in|on|at|to|for|of|with|by|from|up|about|into|through|during|before|after|above|below|between|among|through|during|before|after|above|below|between|among)\b/i.test(line);

        // Doit avoir une structure de phrase cohérente
        const hasSentenceStructure = /[.!?]/.test(line) || /[A-ZÀÉÈÊË]/.test(line) || line.length > 30;

        return hasValidWords && hasSentenceStructure;
    }

  
  
    // ====== COMMANDES ADMIN ======

    getCronStatus(): string {
        let status = '🤖 **Sniper Financial Bot - Statut des Cron Jobs**\n\n';

        const jobs = Array.from(this.cronJobs.values());

        if (jobs.length === 0) {
            status += '❌ Aucun cron job configuré\n';
            return status;
        }

        jobs.forEach(job => {
            const emoji = job.status === 'active' ? '✅' : job.status === 'paused' ? '⏸️' : '❌';
            status += `${emoji} **${job.name}** - ${job.description}\n`;
            status += `⏰ Schedule: \`${job.schedule}\`\n`;
            status += `🔄 Exécutions: ${job.executions} | ❌ Erreurs: ${job.errors}\n`;

            if (job.lastRun) {
                status += `📅 Dernière exécution: ${job.lastRun.toLocaleString('fr-FR')}\n`;
            }

            if (job.lastError) {
                status += `❗ Dernière erreur: ${job.lastError.substring(0, 100)}...\n`;
            }

            status += '\n';
        });

        return status;
    }

    async getCronWorkflow() {
        let workflow = '📋 **Sniper Financial Bot - Workflow des Tâches**\n\n';

        workflow += '## 🔄 Jobs Actifs\n';
        const jobs = Array.from(this.cronJobs.values());

        if (jobs.length === 0) {
            workflow += '❌ Aucun cron job actif\n\n';
        } else {
            jobs.forEach(job => {
                const emoji = job.status === 'active' ? '✅' : job.status === 'paused' ? '⏸️' : '❌';
                workflow += `${emoji} **${job.name}**\n`;
                workflow += `• Description: ${job.description}\n`;
                workflow += `• Schedule: \`${job.schedule}\`\n`;
                workflow += `• Statut: ${job.status}\n`;
                workflow += `• Prochaine exécution: ${job.task.nextDate()?.toLocaleString('fr-FR') || 'Calcul en cours...'}\n\n`;
            });
        }

        workflow += '## 📊 Informations Système\n';
        workflow += `• Profils utilisateurs: ${this.memberProfiles.size}\n`;
        workflow += `• Cooldowns actifs: ${this.cooldowns.size}\n`;
        workflow += `• Uptime: ${Math.floor(process.uptime())} secondes\n\n`;

        workflow += '## 🎯 Actions Disponibles\n';
        workflow += '• Utilisez `!cron status` pour voir l\'état actuel\n';
        workflow += '• Utilisez `!cron pause <job>` pour mettre en pause un job\n';
        workflow += '• Utilisez `!cron resume <job>` pour reprendre un job\n';
        workflow += '• Utilisez `!cron run <job>` pour exécuter manuellement un job\n\n';

        return workflow;
    }

    async pauseCronJob(jobName: string): Promise<boolean> {
        const job = this.cronJobs.get(jobName);
        if (job) {
            job.task.stop();
            job.status = 'paused';
            console.log(`⏸️ Cron job ${jobName} mis en pause`);
            return true;
        }
        return false;
    }

    async resumeCronJob(jobName: string): Promise<boolean> {
        const job = this.cronJobs.get(jobName);
        if (job) {
            job.task.start();
            job.status = 'active';
            console.log(`▶️ Cron job ${jobName} repris`);
            return true;
        }
        return false;
    }

    async runCronJobManually(jobName: string): Promise<boolean> {
        const job = this.cronJobs.get(jobName);
        
        // Permettre l'exécution manuelle même si le job n'est pas enregistré comme cron automatique
        console.log(`🔄 Exécution manuelle du cron job: ${jobName}`);
        
        if (job) {
            job.lastRun = new Date();
            job.executions++;
        }
        
        try {
            let success = false;
            
            // Exécuter le job manuellement selon son nom
            if (jobName === 'x_scraper') {
                success = await this.executeXScraperJob();
            } else if (jobName === 'ia_scraper') {
                success = await this.executeXScraperJob('ia.opml');
            } else if (jobName === 'finance_scraper') {
                success = await this.executeXScraperJob('finance-x.opml');
            } else if (jobName === 'cleanup') {
                success = await this.executeCleanupJob();
            } else if (jobName === 'publisher') {
                success = await this.executePublisherJob();
            } else if (jobName === 'aggregator_pipeline') {
                success = await this.runAggregatorPipeline();
            } else if (jobName === 'calendar_pipeline') {
                // Exécuter le wrapper calendrier
                // DÉSACTIVÉ: Le calendrier TradingEconomics a été retiré du pipeline principal
                // success = await this.runCalendarPipelineWrapper();
                console.log(`⚠️ Job ${jobName} désactivé (calendrier TradingEconomics retiré)`);
                success = true; // Ne pas considérer comme une erreur
            } else {
                console.error(`❌ Job inconnu: ${jobName}`);
                return false;
            }
  
            if (success) {
                if (job) {
                    job.status = 'active';
                    job.lastError = undefined;
                }
                return true;
            } else {
                if (job) {
                    job.status = 'error';
                    job.errors++;
                    job.lastError = `Job ${jobName} a échoué sans erreur spécifique`;
                }
                console.error(`❌ Échec de l'exécution manuelle ${jobName}`);
                return false;
            }
        } catch (error) {
            if (job) {
                job.status = 'error';
                job.errors++;
                job.lastError = error instanceof Error ? error.message : String(error);
            }
            console.error(`❌ Erreur exécution manuelle ${jobName}:`, error);
            return false;
        }
    }

    // async runCalendarPipelineWrapper(): Promise<boolean> {
    //     console.log('🔄 Exécution du pipeline calendrier via wrapper...');
    //
    //     return new Promise((resolve) => {
    //         const child = spawn('node', [path.join(process.cwd(), 'run-calendar-wrapper.js')], {
    //             stdio: 'inherit',
    //             cwd: process.cwd(),
    //             env: { ...process.env, NODE_ENV: 'production' }
    //         });
    //
    //         child.on('exit', (code: number) => {
    //             if (code === 0) {
    //                 console.log('✅ Pipeline calendrier terminé avec succès');
    //                 resolve(true);
    //             } else {
    //                 console.error(`❌ Pipeline calendrier échoué avec code ${code}`);
    //                 resolve(false);
    //             }
    //         });
    //
    //         child.on('error', (err: Error) => {
    //             console.error('❌ Erreur lancement wrapper calendrier:', err.message);
    //             resolve(false);
    //         });
    //     });
    // }

    getHelpMessage(): string {
        return `
**Sniper - Assistant Financier Professionnel**
*Service Premium d'Analyse et de Conseil avec Session Persistante*

## **Assistance Financière**
• \`@Sniper [question financière]\` - Analyse et conseil professionnel
• \`@Sniper analyse [marché/actif]\` - Étude approfondie de marché
• \`@Sniper données [indicateur]\` - Recherche de données financières
• \`@Sniper tendance [secteur]\` - Analyse des tendances

## **Support Technique**
• \`@Sniper assistance [problème]\` - Support technique prioritaire
• \`@Sniper état système\` - Vérification de l'état des services

## **Gestion des Systèmes**
• \`!cron status\` - État des processus automatisés
• \`!cron workflow\` - Vue d'ensemble des opérations
• \`!cron pause <job>\` - Suspension de processus
• \`!cron resume <job>\` - Réactivation de processus
• \`!cron run <job>\` - Exécution manuelle

## **Administration**
• \`!ping\` - Vérification de connectivité
• \`!sniper_status\` - Rapport d'état complet
• \`!cleanup\` - Maintenance système
• \`!sessions\` - État des sessions actives (NOUVEAU)

## **Commandes Claude CLI**
• \`/profile\` - Affiche les informations de votre profil Claude
• \`/new\` - Démarre une nouvelle tâche avec un état propre
• \`/new <description>\` - Démarre une nouvelle tâche avec une description spécifique

## **Sondages Interactifs**
• \`!poll_zerohedge\` - Crée un sondage sur ZeroHedge (français)
• \`!zerohedge_poll_en\` - Crée un sondage sur ZeroHedge (anglais)

## **Caractéristiques Premium**
- 🧠 **Session persistante**: Sniper se souvient de vos conversations !
- 🔧 **Intégration Claude**: Accès direct aux commandes Claude depuis Discord
- Mémoire de conversation intelligente (20 derniers messages)
- Analyse financière approfondie
- Réponses structurées et précises
- Support prioritaire 24/7
- Accès aux données en temps réel

---

*Sniper maintient une session persistante pour chaque utilisateur et offre un accès direct aux commandes Claude CLI !*
        `.trim();
    }

    /**
     * Récupère le statut des sessions actives
     */
    getSessionsStatus(): string {
        const stats = this.sessionManager.getActiveSessionsStats();

        let status = '🤖 **Sniper - État des Sessions Actives**\n\n';

        if (stats.total === 0) {
            status += '❌ Aucune session active\n\n';
        } else {
            status += `📊 **Total des sessions actives**: ${stats.total}\n\n`;

            status += '**Détails des sessions**:\n';
            for (const user of stats.users) {
                status += `• **${user.username}**\n`;
                status += `  💬 Messages: ${user.messages}\n`;
                status += `  ⏱️ Durée: ${user.duration} minutes\n\n`;
            }
        }

        status += '💡 *Les sessions sont conservées pendant 30 minutes d\'inactivité*';

        return status;
    }

    /**
     * Exécute la commande /profile
     */
    async executeProfileCommand(): Promise<string> {
        try {
            const result = await this.claudeHandler.getProfileInfo();

            if (result.success) {
                return result.output;
            } else {
                return `❌ **Erreur Profil**\n\nImpossible de récupérer votre profil Claude:\n\`${result.error}\`\n\n💡 *Vérifiez que Claude est bien installé et accessible.*`;
            }

        } catch (error: any) {
            console.error('❌ Erreur commande /profile:', error);
            return `❌ **Erreur Profil**\n\nUne erreur technique est survenue lors de la récupération de votre profil:\n\`${error.message || 'Erreur inconnue'}\``;
        }
    }

    /**
     * Exécute la commande /new
     */
    async executeNewCommand(taskDescription?: string): Promise<string> {
        try {
            const result = await this.claudeHandler.startNewTask(taskDescription);

            if (result.success) {
                return result.output;
            } else {
                return `❌ **Erreur Nouvelle Tâche**\n\nImpossible de démarrer une nouvelle tâche:\n\`${result.error}\`\n\n💡 *Vérifiez que Claude est bien installé et accessible.*`;
            }

        } catch (error: any) {
            console.error('❌ Erreur commande /new:', error);
            return `❌ **Erreur Nouvelle Tâche**\n\nUne erreur technique est survenue:\n\`${error.message || 'Erreur inconnue'}\``;
        }
    }

    
    /**
     * Ferme proprement les agents du calendrier
     */
    async closeCalendarAgents(): Promise<void> {
        try {
            console.log('🔄 Fermeture des agents du calendrier économique...');

            // await this.tradingEconomicsScraper.close();
            await this.rougePulseAgent.close();
            // await this.calendarPublisher.close();

            console.log('✅ Agents calendrier fermés avec succès');
        } catch (error) {
            console.error('❌ Erreur fermeture agents calendrier:', error);
        }
    }

    /**
     * Nettoyage complet avant arrêt
     */
    async cleanup(): Promise<void> {
        console.log('🧹 Nettoyage complet avant arrêt...');

        // Fermer les agents calendrier
        await this.closeCalendarAgents();

        // Mode one-shot - pas de persistance à arrêter
        console.log('✅ Nettoyage complet terminé');
    }

    /**
     * Gérer la terminaison propre du bot
     */
    async handleShutdown(): Promise<void> {
        console.log('🛑 Détection de l\'arrêt du bot...');

        try {
            // Mode one-shot - pas de persistance à arrêter

            // Nettoyer les ressources
            await this.cleanup();

            console.log('✅ Arrêt propre du bot terminé');
        } catch (error) {
            console.error('❌ Erreur lors de l\'arrêt propre:', error);
        } finally {
            process.exit(0);
        }
    }

    /**
     * Configurer les handlers dynamiques pour les interactions créées par l'agent
     */
    setupDynamicInteractionHandlers(): void {
        console.log('🎮 Configuration des handlers intelligents...');

        // Le système intelligent dans DiscordInteractionHandler gère maintenant tous les cas
        // Plus besoin de définir manuellement chaque handler

        // Quelques handlers essentiels pour les patterns complexes si besoin
        this.interactionHandler.registerDynamicHandler('period_selection', async (interaction: any) => {
            await interaction.deferUpdate();
            const selectedPeriod = interaction.values[0];
            const embed = new EmbedBuilder()
                .setTitle('📊 Période sélectionnée')
                .setDescription(`La période d'analyse "${selectedPeriod}" a été sélectionnée.`)
                .setColor(0x0099ff)
                .addFields([
                    { name: 'Période', value: selectedPeriod, inline: true },
                    { name: 'Statut', value: 'Analyse en cours...', inline: true }
                ])
                .setTimestamp();
            await interaction.followUp({ embeds: [embed] });
        });

        this.interactionHandler.registerDynamicHandler('asset_select', async (interaction: any) => {
            await interaction.deferUpdate();
            const selectedAsset = interaction.values[0];
            const embed = new EmbedBuilder()
                .setTitle('💱 Actif sélectionné')
                .setDescription(`L'actif "${selectedAsset}" est maintenant en cours d'analyse.`)
                .setColor(0x00ff00)
                .addFields([
                    { name: 'Actif', value: selectedAsset, inline: true },
                    { name: 'Statut', value: 'Analyse en cours...', inline: true }
                ])
                .setTimestamp();
            await interaction.followUp({ embeds: [embed] });
        });

        console.log('✅ Système intelligent activé - Tous les customIds seront analysés automatiquement');
    }

    /**
     * Obtenir l'historique des prompts Claude
     */
    getClaudePromptHistory(): string {
        const history = this.claudeProcessManager.getPromptHistory();
        if (history.length === 0) {
            return '📝 **Historique des Prompts Claude**\n\nAucun prompt enregistré pour le moment.';
        }

        let result = '📝 **Historique des Prompts Claude**\n\n';
        history.forEach((entry, index) => {
            const promptType = entry.isFirst ? '🆕 PREMIER PROMPT' : '🔄 PROMPT SUIVANT';
            const timestamp = entry.timestamp.toLocaleTimeString('fr-FR');
            result += `**${index + 1}. ${promptType}** (${timestamp})\n`;
            result += `\`\`\`${entry.prompt.substring(0, 100)}${entry.prompt.length > 100 ? '...' : ''}\`\`\`\n\n`;
        });

        return result;
    }

    /**
     * Réinitialiser l'état des prompts Claude
     */
    resetClaudePromptState(): void {
        this.claudeProcessManager.resetFirstPromptState();
        console.log('🔄 État des prompts Claude réinitialisé');
    }
}

// Initialisation du bot
(async () => {
    // 1. Assurer l'instance unique
    await ensureSingleInstance();

    console.log('3. Creating sniper...');
    const sniper = new SniperFinancialBot();
    console.log('4. SniperFinancialBot created');

    console.log('5. Creating Discord client manager...');
    const clientManager = new DiscordClientManager(sniper);
    console.log('6. DiscordClientManager created');

    // Set the client in the sniper bot for poll manager
    sniper.setClient(clientManager.getClient());

    // === GESTION DES ARGUMENTS CLI ===
    const args = process.argv.slice(2);
    if (args.length > 0) {
        const command = args[0];
        console.log(`🔧 Mode CLI détecté: commande '${command}'`);

        try {
            if (command === 'run_publisher') {
                console.log('📰 Lancement manuel du SimplePublisherOptimized...');
                const publisherPath = path.resolve(process.cwd(), 'src', 'discord_bot', 'SimplePublisherOptimized.ts');
                const publisherUrl = pathToFileURL(publisherPath).href;
                const { SimplePublisherOptimized } = await import(publisherUrl);
                const publisher = new SimplePublisherOptimized();

                // Afficher le channel ID pour info
                console.log(`ℹ️ Channel cible: ${process.env.DISCORD_CHANNEL_ID || 'Non défini'}`);

                const result = await publisher.runPublishingCycleOptimized();
                if (result.success) {
                    console.log('✅ Publication terminée avec succès');
                    process.exit(0);
                } else {
                    console.error('❌ Erreur publication:', result.error);
                    process.exit(1);
                }
            }
            else if (command === 'run_pipeline') {
                console.log('🌐 Lancement manuel du pipeline aggregator...');
                const result = await sniper.runAggregatorPipeline();
                if (result) {
                    console.log('✅ Pipeline terminé avec succès');
                    process.exit(0);
                } else {
                    console.error('❌ Erreur lors de l\'exécution du pipeline');
                    process.exit(1);
                }
            }
            else if (command === 'run_x_scraper') {
                await sniper.executeXScraperJob();
                process.exit(0);
            }
            // Si c'est juste 'start' ou autre, on continue vers le lancement normal
        } catch (error) {
            console.error('💥 Erreur CLI:', error);
            process.exit(1);
        }
    }


    // Si pas d'argument bloquant, on lance le bot normalement
    if (!args.includes('run_publisher') && !args.includes('run_x_scraper') && !args.includes('run_pipeline')) {
        // 🎯 CORRECTIF MINEURE : Maintenir le bot en vie en production
        console.log('🔑 Starting Discord client...');

        try {
            await clientManager.start();
        } catch (err) {
            console.error('❌ Failed to start bot:', err);
            process.exit(1);
        }
    }
})();
