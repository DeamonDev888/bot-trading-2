#!/usr/bin/env node

/**
 * Test d'intégration complet de la boucle vertueuse
 * Simule une session Discord complète avec bot
 */

import { discordLogger } from './dist/discord_bot/DiscordLogger.js';
import { logAnalyzer } from './dist/discord_bot/LogAnalyzer.js';

console.log('🧪 TEST D\'INTÉGRATION COMPLET');
console.log('================================\n');

async function simulateDiscordSession() {
    console.log('📱 Simulation d\'une session Discord complète...\n');

    const sessionId = discordLogger.startConversation('USER123', 'DeaMon888');
    console.log(`✅ Session démarrée: ${sessionId}\n`);

    // 1. Salutation
    console.log('👤 Utilisateur: "Sniper, bonjour !"');
    const cmd1 = await discordLogger.logCommand('USER123', 'DeaMon888', 'CHANNEL1', 'Sniper, bonjour !');
    await discordLogger.logResponse(new Date().toISOString(), 'USER123', 'DeaMon888', 'CHANNEL1', 'Bonjour ! Comment puis-je vous aider ?', 1200);

    // 2. Analyse financière
    console.log('👤 Utilisateur: "Analyse le marché S&P 500"');
    const claudeReq1 = await discordLogger.logClaudeRequest('USER123', 'DeaMon888', 'Analyser S&P 500', sessionId);
    await discordLogger.logClaudeResponse(claudeReq1, 'USER123', 'Le S&P 500 présente une tendance haussière...', 3500);
    const cmd2 = await discordLogger.logCommand('USER123', 'DeaMon888', 'CHANNEL1', 'Analyse le marché S&P 500');
    await discordLogger.logResponse(new Date().toISOString(), 'USER123', 'DeaMon888', 'CHANNEL1', 'Le S&P 500 présente une tendance haussière...', 3600);

    // 3. Sondage
    console.log('👤 Utilisateur: "Crée un sondage sur lescrypto"');
    const cmd3 = await discordLogger.logCommand('USER123', 'DeaMon888', 'CHANNEL1', 'Crée un sondage sur les crypto');
    await discordLogger.logResponse(new Date().toISOString(), 'USER123', 'DeaMon888', 'CHANNEL1', '✅ Sondage créé : "Quel est votre sentiment sur Bitcoin ?"', 800);

    // 4. Erreur simulée
    console.log('👤 Utilisateur: "Test erreur"');
    const cmd4 = await discordLogger.logCommand('USER123', 'DeaMon888', 'CHANNEL1', 'Test erreur');
    await discordLogger.logError('USER123', 'DeaMon888', 'CHANNEL1', 'Simulated error for testing', 'integration_test');

    // 5. Question technique
    console.log('👤 Utilisateur: "Comment ça marche ?"');
    const claudeReq2 = await discordLogger.logClaudeRequest('USER123', 'DeaMon888', 'Expliquer fonctionnement', sessionId);
    await discordLogger.logClaudeResponse(claudeReq2, 'USER123', 'Je fonctionne avec Claude Code et Discord.js...', 2100);
    const cmd5 = await discordLogger.logCommand('USER123', 'DeaMon888', 'CHANNEL1', 'Comment ça marche ?');
    await discordLogger.logResponse(new Date().toISOString(), 'USER123', 'DeaMon888', 'CHANNEL1', 'Je fonctionne avec Claude Code...', 2200);

    // Terminer la session
    await discordLogger.endConversation('USER123');
    console.log(`\n✅ Session terminée\n`);

    return sessionId;
}

async function analyzeResults() {
    console.log('📊 ANALYSE DES RÉSULTATS');
    console.log('=========================\n');

    const analysis = await logAnalyzer.analyze(1);

    console.log('📈 MÉTRIQUES GLOBALES:');
    console.log(`   • Total interactions: ${analysis.summary.totalInteractions}`);
    console.log(`   • Temps de réponse moyen: ${Math.round(analysis.summary.averageResponseTime)}ms`);
    console.log(`   • Taux de succès: ${analysis.summary.successRate.toFixed(1)}%`);
    console.log(`   • Taux d'erreur: ${analysis.summary.errorRate.toFixed(1)}%`);

    console.log('\n🤖 PERFORMANCE CLAUDE:');
    console.log(`   • Temps moyen: ${Math.round(analysis.performance.claudePerformance.averageTime)}ms`);
    console.log(`   • Taux de succès: ${analysis.performance.claudePerformance.successRate.toFixed(1)}%`);
    console.log(`   • Timeouts: ${analysis.performance.claudePerformance.timeouts}`);

    console.log('\n👥 UTILISATEURS:');
    analysis.summary.topUsers.forEach((user, i) => {
        console.log(`   ${i + 1}. ${user.username} (${user.count} interactions)`);
    });

    console.log('\n❌ ERREURS:');
    if (analysis.summary.commonErrors.length > 0) {
        analysis.summary.commonErrors.forEach((error, i) => {
            console.log(`   ${i + 1}. ${error.error} (${error.count} occurrences)`);
        });
    } else {
        console.log('   Aucune erreur');
    }

    console.log('\n⏱️ PERFORMANCE DÉTAILLÉE:');
    if (analysis.performance.slowestResponses.length > 0) {
        console.log(`   • Plus lente: ${analysis.performance.slowestResponses[0].duration}ms`);
    }
    if (analysis.performance.fastestResponses.length > 0) {
        console.log(`   • Plus rapide: ${analysis.performance.fastestResponses[0].duration}ms`);
    }

    console.log('\n💡 RECOMMANDATIONS:');
    analysis.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
    });

    return analysis;
}

async function generateReport(analysis) {
    console.log('\n📋 GÉNÉRATION DE RAPPORT...\n');

    // Rapport JSON
    const reportPath = await logAnalyzer.saveReport(analysis);
    console.log(`✅ Rapport JSON: ${reportPath}`);

    // Rapport Markdown
    const humanReport = logAnalyzer.generateHumanReadableReport(analysis);
    const humanPath = `logs/discord/reports/integration_test_${Date.now()}.md`;
    const fs = await import('fs/promises');
    await fs.mkdir('logs/discord/reports', { recursive: true });
    await fs.writeFile(humanPath, humanReport, 'utf-8');
    console.log(`✅ Rapport Markdown: ${humanPath}`);

    // Rapport DiscordLogger
    const discordReport = await discordLogger.generateReport(1);
    console.log(`✅ Rapport DiscordLogger: Généré (${JSON.parse(discordReport).summary.totalCommands} commandes)`);

    return { reportPath, humanPath };
}

async function validateLogStructure() {
    console.log('\n🔍 VALIDATION DE LA STRUCTURE DES LOGS...\n');

    const fs = await import('fs/promises');
    const path = await import('path');

    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join('logs', 'discord', `discord_${today}.log`);

    try {
        const content = await fs.readFile(logFile, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line);

        console.log(`📁 Fichier de log: ${logFile}`);
        console.log(`📊 Nombre d'entrées: ${lines.length}`);

        let validJson = 0;
        let types = {};

        for (const line of lines) {
            try {
                const entry = JSON.parse(line);
                validJson++;
                types[entry.type] = (types[entry.type] || 0) + 1;
            } catch (e) {
                console.log(`❌ Ligne invalide: ${line.substring(0, 50)}...`);
            }
        }

        console.log(`✅ Lignes JSON valides: ${validJson}/${lines.length}`);

        console.log('\n📋 TYPES D\'ENTRÉES:');
        Object.entries(types).forEach(([type, count]) => {
            console.log(`   • ${type}: ${count}`);
        });

        return validJson === lines.length;
    } catch (error) {
        console.log(`❌ Erreur lecture log: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('🚀 DÉMARRAGE DU TEST D\'INTÉGRATION\n');

    try {
        // 1. Simulation session Discord
        await simulateDiscordSession();

        // 2. Analyse des résultats
        const analysis = await analyzeResults();

        // 3. Génération des rapports
        const { reportPath, humanPath } = await generateReport(analysis);

        // 4. Validation structure
        const isValid = await validateLogStructure();

        // 5. Résumé final
        console.log('\n' + '='.repeat(60));
        console.log('🎯 RÉSUMÉ FINAL');
        console.log('='.repeat(60));

        if (analysis.summary.totalInteractions >= 5 &&
            analysis.summary.successRate >= 80 &&
            isValid) {
            console.log('✅ TEST D\'INTÉGRATION: RÉUSSI');
            console.log('\n📊 CAPTURES VALIDÉES:');
            console.log(`   ✅ ${analysis.summary.totalInteractions} interactions loggées`);
            console.log(`   ✅ ${Object.keys(analysis.summary.topUsers).length} utilisateurs trackés`);
            console.log(`   ✅ ${analysis.summary.commonErrors.length} erreurs capturées`);
            console.log(`   ✅ ${analysis.performance.claudePerformance.averageTime > 0 ? 'Claude' : 'Pas de'} requêtes Claude`);
            console.log('\n📋 RAPPORTS GÉNÉRÉS:');
            console.log(`   ✅ JSON: ${reportPath}`);
            console.log(`   ✅ Markdown: ${humanPath}`);
            console.log('\n🎉 LA BOUCLE VERTUEUSE EST 100% FONCTIONNELLE !');
            process.exit(0);
        } else {
            console.log('⚠️ TEST PARTIELLEMENT RÉUSSI');
            console.log('Vérifiez les logs pour plus de détails');
            process.exit(1);
        }

    } catch (error) {
        console.error('\n💥 ERREUR CRITIQUE:', error);
        console.error(error.stack);
        process.exit(2);
    }
}

// Exécuter
main();
