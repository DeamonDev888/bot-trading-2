#!/usr/bin/env node

/**
 * Dashboard de surveillance de la boucle vertueuse
 * Affiche les métriques en temps réel
 */

import { logAnalyzer } from './dist/discord_bot/LogAnalyzer.js';
import { discordLogger } from './dist/discord_bot/DiscordLogger.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const CLEAR_SCREEN = '\x1bc';
const MOVE_TO_TOP = '\x1b[H';

function clearScreen() {
    process.stdout.write(CLEAR_SCREEN + MOVE_TO_TOP);
}

function createSpinner(frame, delay = 100) {
    let i = 0;
    return setInterval(() => {
        process.stdout.write('\r' + frame[i % frame.length]);
        i++;
    }, delay);
}

function stopSpinner(spinner) {
    clearInterval(spinner);
    process.stdout.write('\n');
}

async function getSystemStats() {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join('logs', 'discord', `discord_${today}.log`);

    try {
        const content = await fs.readFile(logFile, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line);
        return lines.length;
    } catch {
        return 0;
    }
}

async function displayDashboard() {
    clearScreen();

    while (true) {
        try {
            // Analyser les logs
            const analysis = await logAnalyzer.analyze(1);

            // Obtenir les stats système
            const logCount = await getSystemStats();

            // Afficher le dashboard
            clearScreen();
            console.log('╔════════════════════════════════════════════════════════════════╗');
            console.log('║         🚀 DASHBOARD BOUCLE VERTUEUSE - TEMPS RÉEL            ║');
            console.log('╚════════════════════════════════════════════════════════════════╝');
            console.log('');
            console.log('📊 MÉTRIQUES PRINCIPALES:');
            console.log('   ┌─────────────────────────────────────────────────────────────┐');
            console.log(`   │ Total Interactions: ${analysis.summary.totalInteractions.toString().padStart(3)}                              │`);
            console.log(`   │ Taux de Succès:    ${analysis.summary.successRate.toFixed(1).toString().padStart(5)}%                            │`);
            console.log(`   │ Temps Moyen:       ${Math.round(analysis.summary.averageResponseTime).toString().padStart(3)}ms                              │`);
            console.log('   └─────────────────────────────────────────────────────────────┘');
            console.log('');

            console.log('🤖 PERFORMANCE CLAUDE:');
            console.log('   ┌─────────────────────────────────────────────────────────────┐');
            console.log(`   │ Temps Analyse:    ${Math.round(analysis.performance.claudePerformance.averageTime).toString().padStart(3)}ms                              │`);
            console.log(`   │ Taux Succès:      ${analysis.performance.claudePerformance.successRate.toFixed(1).toString().padStart(5)}%                            │`);
            console.log(`   │ Timeouts:         ${analysis.performance.claudePerformance.timeouts.toString().padStart(3)}                              │`);
            console.log('   └─────────────────────────────────────────────────────────────┘');
            console.log('');

            console.log('👥 TOP 3 UTILISATEURS:');
            if (analysis.summary.topUsers.length > 0) {
                analysis.summary.topUsers.slice(0, 3).forEach((user, i) => {
                    const bar = '█'.repeat(Math.min(user.count, 20));
                    console.log(`   ${i + 1}. ${user.username.padEnd(12)} ${bar} (${user.count})`);
                });
            } else {
                console.log('   Aucun utilisateur enregistré');
            }
            console.log('');

            console.log('⚠️ ALERTES:');
            if (analysis.summary.errorRate > 10) {
                console.log('   🔴 Taux d\'erreur élevé: ' + analysis.summary.errorRate.toFixed(1) + '%');
            } else if (analysis.summary.errorRate > 5) {
                console.log('   🟡 Taux d\'erreur modéré: ' + analysis.summary.errorRate.toFixed(1) + '%');
            } else {
                console.log('   🟢 Taux d\'erreur normal: ' + analysis.summary.errorRate.toFixed(1) + '%');
            }

            if (analysis.summary.averageResponseTime > 5000) {
                console.log('   🔴 Temps de réponse élevé: ' + Math.round(analysis.summary.averageResponseTime) + 'ms');
            } else if (analysis.summary.averageResponseTime > 2000) {
                console.log('   🟡 Temps de réponse modéré: ' + Math.round(analysis.summary.averageResponseTime) + 'ms');
            } else {
                console.log('   🟢 Temps de réponse normal: ' + Math.round(analysis.summary.averageResponseMode) + 'ms');
            }
            console.log('');

            console.log('💡 RECOMMANDATIONS:');
            if (analysis.recommendations.length > 0) {
                analysis.recommendations.slice(0, 2).forEach((rec, i) => {
                    const shortRec = rec.length > 60 ? rec.substring(0, 57) + '...' : rec;
                    console.log(`   ${i + 1}. ${shortRec}`);
                });
            } else {
                console.log('   ✅ Aucune recommandation');
            }
            console.log('');

            console.log('📁 LOGS: ' + logCount + ' entrées aujourd\'hui');
            console.log('');
            console.log('⏰ Dernière MAJ: ' + new Date().toLocaleTimeString('fr-FR'));
            console.log('🔄 Actualisation dans 5 secondes... (Ctrl+C pour quitter)');

            // Attendre 5 secondes
            await new Promise(resolve => setTimeout(resolve, 5000));

        } catch (error) {
            console.error('❌ Erreur:', error.message);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

async function main() {
    console.log('🚀 Démarrage du dashboard...');
    console.log('📊 Surveillance de la boucle vertueuse en temps réel\n');

    const spinner = createSpinner(['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']);

    // Test initial
    try {
        await logAnalyzer.analyze(1);
        stopSpinner(spinner);
        console.log('✅ Connexion établie\n');
        await displayDashboard();
    } catch (error) {
        stopSpinner(spinner);
        console.error('❌ Erreur de connexion:', error.message);
        process.exit(1);
    }
}

// Gestion de l'interruption Ctrl+C
process.on('SIGINT', () => {
    console.log('\n\n👋 Dashboard arrêté');
    process.exit(0);
});

// Démarrer
main().catch(error => {
    console.error('💥 Erreur critique:', error);
    process.exit(1);
});
