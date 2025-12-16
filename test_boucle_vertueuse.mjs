#!/usr/bin/env node

/**
 * Script de test pour valider la boucle vertueuse
 * Teste le logging Discord et l'analyse des logs
 */

import { discordLogger } from './dist/discord_bot/DiscordLogger.js';
import { logAnalyzer } from './dist/discord_bot/LogAnalyzer.js';
import * as fs from 'fs/promises';
import * as path from 'path';

console.log('🧪 TEST DE LA BOUCLE VERTUEUSE');
console.log('================================\n');

async function testDiscordLogger() {
    console.log('📝 Test 1: DiscordLogger - Logging des commandes...');

    try {
        // Simuler une commande Discord
        const timestamp1 = await discordLogger.logCommand(
            '123456789',
            'TestUser',
            '987654321',
            'Sniper, bonjour ! Comment ça va ?'
        );
        console.log(`   ✅ Commande loggée: ${timestamp1}`);

        // Simuler une réponse du bot
        await discordLogger.logResponse(
            new Date().toISOString(),
            '123456789',
            'TestUser',
            '987654321',
            'Bonjour ! Je vais bien, merci. Comment puis-je vous aider ?',
            1250
        );
        console.log(`   ✅ Réponse loggée (1250ms)`);

        // Simuler une requête Claude
        const claudeReqTimestamp = await discordLogger.logClaudeRequest(
            '123456789',
            'TestUser',
            'Analyser le sentiment du marché',
            'session_123'
        );
        console.log(`   ✅ Requête Claude loggée: ${claudeReqTimestamp}`);

        // Simuler une réponse Claude
        await discordLogger.logClaudeResponse(
            claudeReqTimestamp,
            '123456789',
            'Le sentiment du marché est actuellement neutre avec une légère tendance baissière...',
            3450
        );
        console.log(`   ✅ Réponse Claude loggée (3450ms)`);

        // Simuler une erreur
        await discordLogger.logError(
            '123456789',
            'TestUser',
            '987654321',
            'Connection timeout',
            'test_boucle_vertueuse'
        );
        console.log(`   ✅ Erreur loggée`);

        // Démarrer et terminer une session
        const sessionId = discordLogger.startConversation('123456789', 'TestUser');
        console.log(`   ✅ Session démarrée: ${sessionId}`);

        await discordLogger.endConversation('123456789');
        console.log(`   ✅ Session terminée`);

        console.log('   ✅ Test DiscordLogger: SUCCÈS\n');
        return true;

    } catch (error) {
        console.error(`   ❌ Test DiscordLogger: ÉCHEC - ${error.message}\n`);
        return false;
    }
}

async function testLogAnalyzer() {
    console.log('📊 Test 2: LogAnalyzer - Analyse des logs...');

    try {
        // Attendre un peu pour que les logs soient écrits
        await new Promise(resolve => setTimeout(resolve, 500));

        // Analyser les logs du jour
        const analysis = await logAnalyzer.analyze(1);

        console.log(`   📈 Statistiques:`);
        console.log(`      - Total interactions: ${analysis.summary.totalInteractions}`);
        console.log(`      - Temps de réponse moyen: ${Math.round(analysis.summary.averageResponseTime)}ms`);
        console.log(`      - Taux de succès: ${analysis.summary.successRate.toFixed(1)}%`);
        console.log(`      - Taux d'erreur: ${analysis.summary.errorRate.toFixed(1)}%`);

        if (analysis.summary.topUsers.length > 0) {
            console.log(`   👥 Top utilisateur: ${analysis.summary.topUsers[0].username} (${analysis.summary.topUsers[0].count} interactions)`);
        }

        if (analysis.performance.claudePerformance.averageTime > 0) {
            console.log(`   🤖 Performance Claude:`);
            console.log(`      - Temps moyen: ${Math.round(analysis.performance.claudePerformance.averageTime)}ms`);
            console.log(`      - Taux de succès: ${analysis.performance.claudePerformance.successRate.toFixed(1)}%`);
        }

        console.log(`   💡 Recommandations (${analysis.recommendations.length}):`);
        analysis.recommendations.slice(0, 3).forEach((rec, i) => {
            console.log(`      ${i + 1}. ${rec}`);
        });

        // Sauvegarder le rapport
        const reportPath = await logAnalyzer.saveReport(analysis);
        console.log(`   💾 Rapport sauvegardé: ${reportPath}`);

        // Générer le rapport lisible
        const humanReport = logAnalyzer.generateHumanReadableReport(analysis);
        const reportFile = path.join('logs', 'discord', 'reports', `test_report_${Date.now()}.md`);
        await fs.mkdir(path.dirname(reportFile), { recursive: true });
        await fs.writeFile(reportFile, humanReport, 'utf-8');
        console.log(`   📄 Rapport Markdown: ${reportFile}`);

        console.log('   ✅ Test LogAnalyzer: SUCCÈS\n');
        return true;

    } catch (error) {
        console.error(`   ❌ Test LogAnalyzer: ÉCHEC - ${error.message}\n`);
        console.error(error.stack);
        return false;
    }
}

// Fonction utilitaire pour exécuter un script Node
async function runNodeScript(script) {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
        const { stdout } = await execAsync(`node -e "${script}"`);
        return stdout;
    } catch (error) {
        return `Erreur: ${error.message}`;
    }
}

async function testLogFiles() {
    console.log('📁 Test 3: Vérification des fichiers de log...');

    try {
        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join('logs', 'discord', `discord_${today}.log`);

        // Vérifier que le fichier de log existe
        await fs.access(logFile);
        console.log(`   ✅ Fichier de log trouvé: ${logFile}`);

        // Lire et vérifier le contenu
        const content = await fs.readFile(logFile, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line);

        console.log(`   📊 Nombre de lignes loggées: ${lines.length}`);

        // Vérifier que chaque ligne est un JSON valide
        let validJson = 0;
        for (const line of lines) {
            try {
                JSON.parse(line);
                validJson++;
            } catch (e) {
                // Ignorer les lignes vides
            }
        }

        console.log(`   ✅ Lignes JSON valides: ${validJson}/${lines.length}`);

        // Vérifier le dossier des sessions
        const sessionsDir = path.join('logs', 'discord', 'sessions');
        try {
            const files = await fs.readdir(sessionsDir);
            console.log(`   📂 Sessions sauvegardées: ${files.length}`);
        } catch (e) {
            console.log(`   ℹ️ Dossier sessions: non créé (normal si aucune session terminée)`);
        }

        // Vérifier le dossier des rapports
        const reportsDir = path.join('logs', 'discord', 'reports');
        try {
            const files = await fs.readdir(reportsDir);
            console.log(`   📊 Rapports générés: ${files.length}`);
        } catch (e) {
            console.log(`   ℹ️ Dossier rapports: non créé (normal si aucune analyse)`);
        }

        console.log('   ✅ Test LogFiles: SUCCÈS\n');
        return true;

    } catch (error) {
        console.error(`   ❌ Test LogFiles: ÉCHEC - ${error.message}\n`);
        return false;
    }
}

async function testGenerateReport() {
    console.log('📋 Test 4: Génération de rapport DiscordLogger...');

    try {
        const report = await discordLogger.generateReport(1);
        const reportData = JSON.parse(report);

        console.log(`   📈 Résumé du rapport:`);
        console.log(`      - Total commands: ${reportData.summary.totalCommands}`);
        console.log(`      - Total responses: ${reportData.summary.totalResponses}`);
        console.log(`      - Total Claude calls: ${reportData.summary.totalClaudeCalls}`);
        console.log(`      - Total errors: ${reportData.summary.totalErrors}`);
        console.log(`      - Average response time: ${Math.round(reportData.summary.averageResponseTime)}ms`);
        console.log(`      - Success rate: ${reportData.summary.successRate.toFixed(1)}%`);

        console.log('   ✅ Test GenerateReport: SUCCÈS\n');
        return true;

    } catch (error) {
        console.error(`   ❌ Test GenerateReport: ÉCHEC - ${error.message}\n`);
        return false;
    }
}

async function main() {
    console.log('🚀 Démarrage des tests...\n');

    const results = [];

    // Test 1: DiscordLogger
    results.push(await testDiscordLogger());

    // Test 2: LogAnalyzer
    results.push(await testLogAnalyzer());

    // Test 3: LogFiles
    results.push(await testLogFiles());

    // Test 4: GenerateReport
    results.push(await testGenerateReport());

    // Résumé final
    console.log('📊 RÉSUMÉ DES TESTS');
    console.log('===================');
    const passed = results.filter(r => r).length;
    const total = results.length;
    console.log(`✅ Tests réussis: ${passed}/${total}`);

    if (passed === total) {
        console.log('\n🎉 TOUS LES TESTS SONT PASSÉS !');
        console.log('La boucle vertueuse est pleinement fonctionnelle.\n');
        process.exit(0);
    } else {
        console.log(`\n⚠️ ${total - passed} test(s) ont échoué.`);
        console.log('Vérifiez les logs pour plus de détails.\n');
        process.exit(1);
    }
}

// Exécuter les tests
main().catch(error => {
    console.error('💥 Erreur critique lors des tests:', error);
    process.exit(2);
});
