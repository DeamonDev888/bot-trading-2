import * as fs from 'fs/promises';
import * as path from 'path';
import { discordLogger, DiscordLogEntry } from './DiscordLogger.js';

export interface AnalysisResult {
    summary: {
        totalInteractions: number;
        averageResponseTime: number;
        successRate: number;
        errorRate: number;
        topUsers: Array<{ userId: string; username: string; count: number }>;
        commonErrors: Array<{ error: string; count: number }>;
    };
    performance: {
        slowestResponses: Array<{ duration: number; message: string; user: string }>;
        fastestResponses: Array<{ duration: number; message: string; user: string }>;
        claudePerformance: {
            averageTime: number;
            successRate: number;
            timeouts: number;
        };
    };
    usage: {
        peakHours: Array<{ hour: number; count: number }>;
        messageLength: {
            average: number;
            min: number;
            max: number;
        };
    };
    recommendations: string[];
}

export class LogAnalyzer {
    private logDir: string;

    constructor(logDir: string = 'logs/discord') {
        this.logDir = logDir;
    }

    /**
     * Analyser les logs des N derniers jours
     */
    async analyze(days: number = 7): Promise<AnalysisResult> {
        const allEntries: DiscordLogEntry[] = [];
        const userStats = new Map<string, { count: number; username: string }>();
        const errorStats = new Map<string, number>();
        const responseTimes: number[] = [];
        const messageLengths: number[] = [];
        const hourlyUsage = new Array(24).fill(0);

        // Lire tous les logs des derniers jours
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
                    allEntries.push(entry);

                    // Statistiques utilisateurs
                    const userKey = `${entry.userId}:${entry.username}`;
                    if (!userStats.has(userKey)) {
                        userStats.set(userKey, { count: 0, username: entry.username });
                    }
                    userStats.get(userKey)!.count++;

                    // Erreurs communes
                    if (entry.error) {
                        errorStats.set(entry.error, (errorStats.get(entry.error) || 0) + 1);
                    }

                    // Temps de réponse
                    if (entry.duration) {
                        responseTimes.push(entry.duration);
                    }

                    // Longueur des messages
                    if (entry.message) {
                        messageLengths.push(entry.message.length);
                    }

                    // Utilisation par heure
                    const hour = new Date(entry.timestamp).getHours();
                    hourlyUsage[hour]++;
                }
            } catch {
                // Fichier non trouvé, continuer
            }
        }

        // Calculer les statistiques
        const totalInteractions = allEntries.length;
        const successfulInteractions = allEntries.filter(e => e.success).length;
        const errorInteractions = allEntries.filter(e => !e.success).length;

        const averageResponseTime = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0;

        const successRate = totalInteractions > 0
            ? (successfulInteractions / totalInteractions) * 100
            : 0;

        const errorRate = totalInteractions > 0
            ? (errorInteractions / totalInteractions) * 100
            : 0;

        // Top utilisateurs
        const topUsers = Array.from(userStats.entries())
            .map(([key, stats]) => {
                const [userId] = key.split(':');
                return { userId, username: stats.username, count: stats.count };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Erreurs communes
        const commonErrors = Array.from(errorStats.entries())
            .map(([error, count]) => ({ error, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Réponses lentes/rapides
        const responsesWithTime = allEntries
            .filter(e => e.duration && e.message)
            .map(e => ({
                duration: e.duration!,
                message: e.message!.substring(0, 50),
                user: e.username
            }))
            .sort((a, b) => b.duration - a.duration);

        const slowestResponses = responsesWithTime.slice(0, 10);
        const fastestResponses = responsesWithTime.slice(-10).reverse();

        // Performance Claude
        const claudeEntries = allEntries.filter(e =>
            e.type === 'claude_request' || e.type === 'claude_response'
        );

        const claudeTimes = claudeEntries
            .filter(e => e.duration)
            .map(e => e.duration!);

        const claudeAverageTime = claudeTimes.length > 0
            ? claudeTimes.reduce((a, b) => a + b, 0) / claudeTimes.length
            : 0;

        const claudeSuccesses = claudeEntries.filter(e => e.success).length;
        const claudeSuccessRate = claudeEntries.length > 0
            ? (claudeSuccesses / claudeEntries.length) * 100
            : 0;

        const claudeTimeouts = claudeEntries.filter(e =>
            e.error && e.error.includes('timeout')
        ).length;

        // Longueur des messages
        const messageLength = {
            average: messageLengths.length > 0
                ? messageLengths.reduce((a, b) => a + b, 0) / messageLengths.length
                : 0,
            min: messageLengths.length > 0 ? Math.min(...messageLengths) : 0,
            max: messageLengths.length > 0 ? Math.max(...messageLengths) : 0
        };

        // Heures de pointe
        const peakHours = hourlyUsage
            .map((count, hour) => ({ hour, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Générer des recommandations
        const recommendations = this.generateRecommendations({
            successRate,
            errorRate,
            averageResponseTime,
            claudeAverageTime,
            commonErrors,
            slowestResponses,
            topUsers
        });

        return {
            summary: {
                totalInteractions,
                averageResponseTime,
                successRate,
                errorRate,
                topUsers,
                commonErrors
            },
            performance: {
                slowestResponses,
                fastestResponses,
                claudePerformance: {
                    averageTime: claudeAverageTime,
                    successRate: claudeSuccessRate,
                    timeouts: claudeTimeouts
                }
            },
            usage: {
                peakHours,
                messageLength
            },
            recommendations
        };
    }

    /**
     * Générer des recommandations d'amélioration
     */
    private generateRecommendations(data: any): string[] {
        const recommendations: string[] = [];

        // Performance
        if (data.averageResponseTime > 5000) {
            recommendations.push(
                `⚠️ Temps de réponse moyen élevé (${Math.round(data.averageResponseTime)}ms). ` +
                `Considérez optimiser les requêtes ou augmenter les timeouts.`
            );
        }

        if (data.claudeAverageTime > 10000) {
            recommendations.push(
                `🐌 Claude Code est lent (${Math.round(data.claudeAverageTime)}ms en moyenne). ` +
                `Vérifiez la connexion réseau et la charge du serveur.`
            );
        }

        // Taux de succès
        if (data.successRate < 90) {
            recommendations.push(
                `📉 Taux de succès faible (${data.successRate.toFixed(1)}%). ` +
                `Analysez les erreurs communes et corrigez les problèmes récurrents.`
            );
        }

        if (data.errorRate > 10) {
            recommendations.push(
                `❌ Taux d'erreur élevé (${data.errorRate.toFixed(1)}%). ` +
                `Priorisez la correction des erreurs les plus fréquentes.`
            );
        }

        // Erreurs communes
        if (data.commonErrors.length > 0) {
            const topError = data.commonErrors[0];
            recommendations.push(
                `🔧 Erreur principale à corriger: "${topError.error}" (${topError.count} occurrences).`
            );
        }

        // Réponses lentes
        if (data.slowestResponses.length > 0) {
            const slowest = data.slowestResponses[0];
            recommendations.push(
                `⏱️ Réponse la plus lente: ${slowest.duration}ms pour "${slowest.message}". ` +
                `Investiguer cette requête spécifique.`
            );
        }

        // Utilisateurs actifs
        if (data.topUsers.length > 0) {
            const topUser = data.topUsers[0];
            recommendations.push(
                `👤 Utilisateur le plus actif: ${topUser.username} (${topUser.count} interactions). ` +
                `Envisagez un support personnalisé.`
            );
        }

        if (recommendations.length === 0) {
            recommendations.push('✅ Système performant ! Aucune amélioration critique détectée.');
        }

        return recommendations;
    }

    /**
     * Sauvegarder un rapport d'analyse
     */
    async saveReport(analysis: AnalysisResult, outputPath?: string): Promise<string> {
        const date = new Date().toISOString().split('T')[0];
        const reportPath = outputPath || path.join(
            this.logDir,
            'reports',
            `analysis_${date}.json`
        );

        await fs.mkdir(path.dirname(reportPath), { recursive: true });
        await fs.writeFile(reportPath, JSON.stringify(analysis, null, 2), 'utf-8');

        return reportPath;
    }

    /**
     * Générer un rapport lisible par l'humain
     */
    generateHumanReadableReport(analysis: AnalysisResult): string {
        let report = '# 📊 Rapport d\'Analyse Discord Bot\n\n';
        report += `**Période**: ${new Date().toISOString().split('T')[0]}\n\n`;

        // Résumé
        report += '## 📈 Résumé\n\n';
        report += `- **Total interactions**: ${analysis.summary.totalInteractions}\n`;
        report += `- **Temps de réponse moyen**: ${Math.round(analysis.summary.averageResponseTime)}ms\n`;
        report += `- **Taux de succès**: ${analysis.summary.successRate.toFixed(1)}%\n`;
        report += `- **Taux d'erreur**: ${analysis.summary.errorRate.toFixed(1)}%\n\n`;

        // Performance Claude
        report += '## 🤖 Performance Claude Code\n\n';
        report += `- **Temps moyen**: ${Math.round(analysis.performance.claudePerformance.averageTime)}ms\n`;
        report += `- **Taux de succès**: ${analysis.performance.claudePerformance.successRate.toFixed(1)}%\n`;
        report += `- **Timeouts**: ${analysis.performance.claudePerformance.timeouts}\n\n`;

        // Top utilisateurs
        report += '## 👥 Top Utilisateurs\n\n';
        analysis.summary.topUsers.slice(0, 5).forEach((user, i) => {
            report += `${i + 1}. **${user.username}** (${user.count} interactions)\n`;
        });
        report += '\n';

        // Erreurs communes
        if (analysis.summary.commonErrors.length > 0) {
            report += '## ❌ Erreurs Communes\n\n';
            analysis.summary.commonErrors.slice(0, 5).forEach((error, i) => {
                report += `${i + 1}. \`${error.error}\` (${error.count} occurrences)\n`;
            });
            report += '\n';
        }

        // Recommandations
        report += '## 💡 Recommandations\n\n';
        analysis.recommendations.forEach((rec, i) => {
            report += `${i + 1}. ${rec}\n\n`;
        });

        return report;
    }
}

// Instance globale
export const logAnalyzer = new LogAnalyzer();
