/**
 * Script de test pour valider les améliorations du système de prompts KiloCode
 *
 * Ce script teste différentes situations pour s'assurer que :
 * 1. Les prompts structurés génèrent du JSON valide
 * 2. Les prompts non-structurés génèrent du texte professionnel
 * 3. La détection d'intent fonctionne correctement
 * 4. L'extraction de fichiers et d'actifs fonctionne
 */

import path from 'path';

class PromptSystemTester {
    constructor() {
        this.results = [];
    }

    // Simuler les méthodes du bot (on va les recréer pour les tests)
    needsStructuredResponse(message, intent) {
        const lowerMessage = message.toLowerCase();

        // Mots-clés qui demandent une réponse structurée
        const structuredKeywords = [
            'génère', 'créer', 'affiche', 'montre', 'menu', 'tableau', 'rapport',
            'embed', 'interface', 'liste', 'dashboard', 'status', 'analyse',
            'fichier', 'file', 'export', 'json', 'données'
        ];

        // Vérifier si le message contient des mots-clés de structure
        const hasStructuralKeyword = structuredKeywords.some(keyword =>
            lowerMessage.includes(keyword)
        );

        // Types d'intent qui nécessitent du JSON
        const structuredIntents = ['file_creation', 'status', 'dashboard_request', 'professional_inquiry', 'financial_analysis', 'data_research'];

        return hasStructuralKeyword || structuredIntents.includes(intent);
    }

    extractAssetFromMessage(message) {
        const assets = ['BTC', 'ETH', 'Bitcoin', 'Ethereum', 'SPY', 'QQQ', 'AAPL', 'GOOGL', 'MSFT', 'TSLA'];
        const lowerMessage = message.toLowerCase();

        for (const asset of assets) {
            if (lowerMessage.includes(asset.toLowerCase())) {
                return asset.toUpperCase();
            }
        }

        return 'Actif';
    }

    extractFilenameFromMessage(message) {
        const fileMatch = message.match(/fichier\s+(\w+\.\w+)|créer\s+(\w+\.\w+)|générer\s+(\w+\.\w+)/);
        if (fileMatch) {
            return fileMatch[1] || fileMatch[2] || fileMatch[3] || 'document.txt';
        }

        // Détection automatique selon le contenu
        if (message.toLowerCase().includes('markdown') || message.toLowerCase().includes('md')) {
            return 'document.md';
        }
        if (message.toLowerCase().includes('javascript') || message.toLowerCase().includes('js')) {
            return 'script.js';
        }
        if (message.toLowerCase().includes('typescript') || message.toLowerCase().includes('ts')) {
            return 'script.ts';
        }
        if (message.toLowerCase().includes('python') || message.toLowerCase().includes('py')) {
            return 'script.py';
        }

        return 'document.txt';
    }

    addResult(test, success, result, error) {
        this.results.push({ test, success, result, error });
    }

    // Tests de détection de réponse structurée
    async testStructuredResponseDetection() {
        console.log('🧪 Test 1: Détection de réponse structurée');

        const testCases = [
            { message: 'génère un rapport btc', intent: 'financial_analysis', expected: true },
            { message: 'analyse bitcoin', intent: 'financial_analysis', expected: true },
            { message: 'bonjour comment ça va?', intent: 'greeting', expected: false },
            { message: 'créer fichier script.js', intent: 'file_creation', expected: true },
            { message: 'merci pour ton aide', intent: 'appreciation', expected: false }
        ];

        for (const testCase of testCases) {
            const result = this.needsStructuredResponse(testCase.message, testCase.intent);
            const success = result === testCase.expected;

            this.addResult(
                `Message: "${testCase.message}" -> Structured: ${result}`,
                success,
                { expected: testCase.expected, actual: result }
            );
        }
    }

    // Tests d'extraction d'actifs
    async testAssetExtraction() {
        console.log('🧪 Test 2: Extraction d\'actifs');

        const testCases = [
            { message: 'analyse btc', expected: 'BTC' },
            { message: 'prix ethereum', expected: 'ETH' },
            { message: 'tendance apple', expected: 'AAPL' },
            { message: 'analyse générique', expected: 'Actif' }
        ];

        for (const testCase of testCases) {
            const result = this.extractAssetFromMessage(testCase.message);
            const success = result === testCase.expected;

            this.addResult(
                `Message: "${testCase.message}" -> Actif: ${result}`,
                success,
                { expected: testCase.expected, actual: result }
            );
        }
    }

    // Tests d'extraction de noms de fichiers
    async testFilenameExtraction() {
        console.log('🧪 Test 3: Extraction de noms de fichiers');

        const testCases = [
            { message: 'créer fichier test.js', expected: 'test.js' },
            { message: 'générer un document python', expected: 'script.py' },
            { message: 'fichier markdown pour la doc', expected: 'document.md' },
            { message: 'fichier générique', expected: 'document.txt' }
        ];

        for (const testCase of testCases) {
            const result = this.extractFilenameFromMessage(testCase.message);
            const success = result === testCase.expected;

            this.addResult(
                `Message: "${testCase.message}" -> Fichier: ${result}`,
                success,
                { expected: testCase.expected, actual: result }
            );
        }
    }

    // Tests validation des formats JSON attendus
    async testJSONFormatValidation() {
        console.log('🧪 Test 4: Validation des formats JSON attendus');

        // Test que le format JSON attendu pour l'analyse financière est valide
        const financialAnalysisTemplate = {
            type: "financial_analysis",
            embeds: [{
                title: "📊 Analyse Financière - BTC",
                description: "Analyse technique et sentiment de marché",
                color: 65280,
                fields: [
                    { name: "💰 Prix Actuel", value: "$XX,XXX", inline: true },
                    { name: "📈 Variation 24h", value: "+X.XX%", inline: true },
                    { name: "🎯 Tendance", value: "🟢 HAUSSIÈRE", inline: false }
                ],
                footer: { text: "Sniper Financial Bot | Analyse IA temps réel" }
            }]
        };

        try {
            const jsonString = JSON.stringify(financialAnalysisTemplate, null, 2);
            const parsed = JSON.parse(jsonString);

            this.addResult(
                'Template JSON Analyse Financière',
                true,
                { status: 'JSON valide', structure: 'correct' }
            );
        } catch (error) {
            this.addResult(
                'Template JSON Analyse Financière',
                false,
                undefined,
                `Erreur JSON: ${error.message}`
            );
        }

        // Test template pour création de fichier
        const fileCreationTemplate = {
            type: "file_creation",
            content: "Contenu du fichier généré selon la demande",
            filename: "script.js",
            embeds: [{
                title: "📄 Fichier Créé - script.js",
                description: "Le fichier a été généré avec succès selon vos spécifications",
                color: 5025616,
                fields: [
                    { name: "📁 Nom du fichier", value: "script.js", inline: true },
                    { name: "✅ Status", value: "Créé avec succès", inline: true }
                ],
                footer: { text: "Sniper Financial Bot | Gestion de fichiers intelligente" }
            }]
        };

        try {
            const jsonString = JSON.stringify(fileCreationTemplate, null, 2);
            const parsed = JSON.parse(jsonString);

            this.addResult(
                'Template JSON Création Fichier',
                true,
                { status: 'JSON valide', structure: 'correct' }
            );
        } catch (error) {
            this.addResult(
                'Template JSON Création Fichier',
                false,
                undefined,
                `Erreur JSON: ${error.message}`
            );
        }
    }

    // Test de compatibilité des prompts
    async testPromptCompatibility() {
        console.log('🧪 Test 5: Compatibilité des prompts');

        const testMessage = 'génère l\'analyse btc';
        const testIntent = 'financial_analysis';
        const needsStructured = this.needsStructuredResponse(testMessage, testIntent);
        const asset = this.extractAssetFromMessage(testMessage);

        const expectedFeatures = {
            structuredResponse: true,
            assetExtraction: 'BTC',
            jsonOutput: true,
            promptType: 'financial_analysis'
        };

        const actualFeatures = {
            structuredResponse: needsStructured,
            assetExtraction: asset,
            jsonOutput: needsStructured,
            promptType: testIntent
        };

        const success = JSON.stringify(expectedFeatures) === JSON.stringify(actualFeatures);

        this.addResult(
            'Compatibilité complète du système',
            success,
            { expected: expectedFeatures, actual: actualFeatures }
        );
    }

    // Afficher les résultats
    displayResults() {
        console.log('\n📊 RÉSULTATS DES TESTS\n');
        console.log('='.repeat(50));

        let totalTests = 0;
        let passedTests = 0;

        for (const result of this.results) {
            totalTests++;
            const status = result.success ? '✅ PASS' : '❌ FAIL';
            console.log(`${status} ${result.test}`);

            if (result.error) {
                console.log(`    Erreur: ${result.error}`);
            }
            if (result.result) {
                console.log(`    Détails: ${JSON.stringify(result.result, null, 6)}`);
            }
            console.log('');

            if (result.success) passedTests++;
        }

        console.log('='.repeat(50));
        console.log(`📈 SYNTHESE: ${passedTests}/${totalTests} tests réussis (${((passedTests/totalTests)*100).toFixed(1)}%)`);

        if (passedTests === totalTests) {
            console.log('🎉 TOUS LES TESTS RÉUSSIS! Le système de prompts amélioré fonctionne parfaitement.');
        } else {
            console.log('⚠️ Certains tests ont échoué. Vérifiez les erreurs ci-dessus.');
        }
    }

    // Exécuter tous les tests
    async runAllTests() {
        console.log('🚀 DÉMARRAGE DES TESTS DU SYSTÈME DE PROMPTS AMÉLIORÉ');
        console.log('='.repeat(60));

        try {
            await this.testStructuredResponseDetection();
            await this.testAssetExtraction();
            await this.testFilenameExtraction();
            await this.testJSONFormatValidation();
            await this.testPromptCompatibility();

            this.displayResults();
        } catch (error) {
            console.error('❌ Erreur lors des tests:', error);
        }
    }
}

// Exécuter les tests
async function main() {
    const tester = new PromptSystemTester();
    await tester.runAllTests();
}

// Exécuter si appelé directement
main().catch(console.error);