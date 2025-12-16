import * as fs from 'fs/promises';
import * as path from 'path';

export interface DiscordLogEntry {
    timestamp: string;
    type: 'command' | 'response' | 'claude_request' | 'claude_response' | 'error';
    userId: string;
    username: string;
    channelId: string;
    message?: string;
    response?: string;
    claudeCommand?: string;
    claudeOutput?: string;
    duration?: number;
    success: boolean;
    error?: string;
}

export interface ConversationLog {
    sessionId: string;
    startTime: string;
    userId: string;
    username: string;
    messages: DiscordLogEntry[];
    stats: {
        totalMessages: number;
        averageResponseTime: number;
        successRate: number;
        claudeCalls: number;
    };
}

export class DiscordLogger {
    private logDir: string;
    private currentSession: Map<string, ConversationLog> = new Map();

    constructor(logDir: string = 'logs/discord') {
        this.logDir = logDir;
        this.ensureLogDirectory();
    }

    private async ensureLogDirectory(): Promise<void> {
        try {
            await fs.mkdir(this.logDir, { recursive: true });
        } catch (error) {
            console.error('❌ Failed to create log directory:', error);
        }
    }

    /**
     * Log une commande reçue sur Discord
     */
    async logCommand(
        userId: string,
        username: string,
        channelId: string,
        message: string
    ): Promise<string> {
        const entry: DiscordLogEntry = {
            timestamp: new Date().toISOString(),
            type: 'command',
            userId,
            username,
            channelId,
            message,
            success: true
        };

        await this.saveLogEntry(entry);
        return entry.timestamp;
    }

    /**
     * Log une réponse du bot
     */
    async logResponse(
        timestamp: string,
        userId: string,
        username: string,
        channelId: string,
        response: string,
        duration?: number
    ): Promise<void> {
        const entry: DiscordLogEntry = {
            timestamp: new Date().toISOString(),
            type: 'response',
            userId,
            username,
            channelId,
            response,
            duration,
            success: true
        };

        await this.saveLogEntry(entry);
    }

    /**
     * Log une requête vers Claude Code
     */
    async logClaudeRequest(
        userId: string,
        username: string,
        command: string,
        sessionId?: string
    ): Promise<string> {
        const entry: DiscordLogEntry = {
            timestamp: new Date().toISOString(),
            type: 'claude_request',
            userId,
            username,
            channelId: 'claude',
            claudeCommand: command,
            success: true
        };

        await this.saveLogEntry(entry);
        return entry.timestamp;
    }

    /**
     * Log une réponse de Claude Code
     */
    async logClaudeResponse(
        timestamp: string,
        userId: string,
        output: string,
        duration?: number,
        error?: string
    ): Promise<void> {
        const entry: DiscordLogEntry = {
            timestamp: new Date().toISOString(),
            type: 'claude_response',
            userId,
            username: 'claude',
            channelId: 'claude',
            claudeOutput: output,
            duration,
            success: !error,
            error
        };

        await this.saveLogEntry(entry);
    }

    /**
     * Log une erreur
     */
    async logError(
        userId: string,
        username: string,
        channelId: string,
        error: string,
        context?: string
    ): Promise<void> {
        const entry: DiscordLogEntry = {
            timestamp: new Date().toISOString(),
            type: 'error',
            userId,
            username,
            channelId,
            success: false,
            error: `${context ? context + ': ' : ''}${error}`
        };

        await this.saveLogEntry(entry);
    }

    /**
     * Commencer une session de conversation
     */
    startConversation(userId: string, username: string): string {
        const sessionId = `session_${Date.now()}_${userId}`;
        const conversation: ConversationLog = {
            sessionId,
            startTime: new Date().toISOString(),
            userId,
            username,
            messages: [],
            stats: {
                totalMessages: 0,
                averageResponseTime: 0,
                successRate: 0,
                claudeCalls: 0
            }
        };

        this.currentSession.set(userId, conversation);
        return sessionId;
    }

    /**
     * Ajouter un message à la session courante
     */
    addToSession(userId: string, entry: DiscordLogEntry): void {
        const session = this.currentSession.get(userId);
        if (session) {
            session.messages.push(entry);
            this.updateSessionStats(session);
        }
    }

    /**
     * Terminer une session et sauvegarder
     */
    async endConversation(userId: string): Promise<void> {
        const session = this.currentSession.get(userId);
        if (session) {
            await this.saveConversation(session);
            this.currentSession.delete(userId);
        }
    }

    /**
     * Sauvegarder une entrée de log individuelle
     */
    private async saveLogEntry(entry: DiscordLogEntry): Promise<void> {
        const date = new Date().toISOString().split('T')[0];
        const logFile = path.join(this.logDir, `discord_${date}.log`);

        const logLine = JSON.stringify(entry) + '\n';
        await fs.appendFile(logFile, logLine, 'utf-8');
    }

    /**
     * Sauvegarder une conversation complète
     */
    private async saveConversation(conversation: ConversationLog): Promise<void> {
        const date = new Date().toISOString().split('T')[0];
        const sessionFile = path.join(
            this.logDir,
            'sessions',
            `session_${conversation.sessionId}_${date}.json`
        );

        await fs.mkdir(path.dirname(sessionFile), { recursive: true });
        await fs.writeFile(sessionFile, JSON.stringify(conversation, null, 2), 'utf-8');
    }

    /**
     * Mettre à jour les statistiques de session
     */
    private updateSessionStats(session: ConversationLog): void {
        session.stats.totalMessages = session.messages.length;

        const responseTimes = session.messages
            .filter(m => m.duration)
            .map(m => m.duration!);

        session.stats.averageResponseTime = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0;

        const successful = session.messages.filter(m => m.success).length;
        session.stats.successRate = session.messages.length > 0
            ? (successful / session.messages.length) * 100
            : 0;

        session.stats.claudeCalls = session.messages.filter(
            m => m.type === 'claude_request'
        ).length;
    }

    /**
     * Générer un rapport d'analyse
     */
    async generateReport(days: number = 7): Promise<string> {
        const report = {
            period: `${days} days`,
            generatedAt: new Date().toISOString(),
            summary: {
                totalCommands: 0,
                totalResponses: 0,
                totalClaudeCalls: 0,
                totalErrors: 0,
                averageResponseTime: 0,
                successRate: 0
            },
            topUsers: [] as Array<{ userId: string; username: string; messageCount: number }>,
            recentErrors: [] as DiscordLogEntry[]
        };

        // Analyser les logs des derniers jours
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const logFile = path.join(this.logDir, `discord_${dateStr}.log`);

            try {
                const content = await fs.readFile(logFile, 'utf-8');
                const lines = content.trim().split('\n');

                for (const line of lines) {
                    const entry: DiscordLogEntry = JSON.parse(line);

                    // Compter par type
                    switch (entry.type) {
                        case 'command':
                            report.summary.totalCommands++;
                            break;
                        case 'response':
                            report.summary.totalResponses++;
                            break;
                        case 'claude_request':
                        case 'claude_response':
                            report.summary.totalClaudeCalls++;
                            break;
                        case 'error':
                            report.summary.totalErrors++;
                            if (report.recentErrors.length < 10) {
                                report.recentErrors.push(entry);
                            }
                            break;
                    }

                    // Calculer temps de réponse moyen
                    if (entry.duration) {
                        report.summary.averageResponseTime += entry.duration;
                    }
                }
            } catch {
                // Fichier non trouvé, continuer
            }
        }

        // Finaliser les calculs
        if (report.summary.totalResponses > 0) {
            report.summary.averageResponseTime /= report.summary.totalResponses;
        }

        const totalOperations = report.summary.totalCommands + report.summary.totalResponses;
        if (totalOperations > 0) {
            report.summary.successRate =
                ((totalOperations - report.summary.totalErrors) / totalOperations) * 100;
        }

        return JSON.stringify(report, null, 2);
    }
}

// Instance globale
export const discordLogger = new DiscordLogger();
