/**
 * Test du système de rendu Markdown et upload de fichiers
 */

const { MarkdownRenderer } = require('./dist/discord_bot/MarkdownRenderer.js');

class MarkdownRendererTest {
    constructor() {
        this.testCases = [
            {
                name: "Code JavaScript simple",
                input: "Voici le code Hello World:\n\n```javascript\n// File: hello.js\nconsole.log(\"Hello World!\");\n```\n\nCe code affiche Hello World dans la console.",
                expectedCodeBlocks: 1,
                expectedLanguage: "javascript"
            },
            {
                name: "Code TypeScript avec interface",
                input: "Analyse de données:\n\n```typescript\n// File: analysis.ts\ninterface Data {\n    id: number;\n    value: string;\n}\n\nconst data: Data = { id: 1, value: \"Hello\" };\n```",
                expectedCodeBlocks: 1,
                expectedLanguage: "typescript"
            },
            {
                name: "Multiple code blocks",
                input: "Configuration:\n\n```json\n{\n  \"name\": \"test\"\n}\n```\n\nEt le code:\n\n```python\ndef hello():\n    print(\"Hello\")\n```",
                expectedCodeBlocks: 2,
                expectedLanguages: ["json", "python"]
            },
            {
                name: "Code sans langage spécifié",
                input: "Voici le code:\n\n```\ndef function():\n    return \"test\"\n```",
                expectedCodeBlocks: 1,
                expectedLanguage: ""
            },
            {
                name: "Texte sans code",
                input: "Ceci est un message normal sans bloc de code Markdown.",
                expectedCodeBlocks: 0
            }
        ];
    }

    testCodeDetection() {
        console.log('🧪 TEST DE DÉTECTION DE CODE');
        console.log('='.repeat(40));

        let passedTests = 0;

        for (const testCase of this.testCases) {
            console.log(`\n📝 ${testCase.name}`);
            console.log(`   Input: "${testCase.input.substring(0, 50)}..."`);

            const hasCode = MarkdownRenderer.hasCodeBlocks(testCase.input);
            const actualCount = MarkdownRenderer.countCodeBlocks(testCase.input);

            console.log(`   Détecté blocs de code: ${hasCode ? '✅' : '❌'}`);
            console.log(`   Nombre de blocs: ${actualCount}/${testCase.expectedCodeBlocks} ${actualCount === testCase.expectedCodeBlocks ? '✅' : '❌'}`);

            if (hasCode === (testCase.expectedCodeBlocks > 0) && actualCount === testCase.expectedCodeBlocks) {
                passedTests++;
                console.log(`   ✅ Test réussi`);
            } else {
                console.log(`   ❌ Test échoué`);
            }
        }

        return { passedTests, totalTests: this.testCases.length };
    }

    testParsing() {
        console.log('\n🔍 TEST DE PARSING MARKDOWN');
        console.log('='.repeat(40));

        let passedTests = 0;

        for (const testCase of this.testCases) {
            if (testCase.expectedCodeBlocks === 0) continue;

            console.log(`\n📝 ${testCase.name}`);

            try {
                const parsed = MarkdownRenderer.parseMarkdownResponse(testCase.input);

                console.log(`   Blocs extraits: ${parsed.codeBlocks.length}`);
                console.log(`   Fichiers générés: ${parsed.files.length}`);

                // Vérifier le premier bloc
                if (parsed.codeBlocks.length > 0) {
                    const firstBlock = parsed.codeBlocks[0];
                    console.log(`   Langage: "${firstBlock.language}"`);
                    console.log(`   Fichier: "${firstBlock.filename || 'N/A'}"`);
                    console.log(`   Code: ${firstBlock.code.length} caractères`);

                    // Vérifications spécifiques
                    if (testCase.expectedLanguage && firstBlock.language === testCase.expectedLanguage) {
                        console.log(`   ✅ Langage correct: ${firstBlock.language}`);
                        passedTests++;
                    } else if (!testCase.expectedLanguage) {
                        console.log(`   ✅ Langage détecté: ${firstBlock.language}`);
                        passedTests++;
                    } else {
                        console.log(`   ❌ Langage incorrect. Attendu: ${testCase.expectedLanguage}, Reçu: ${firstBlock.language}`);
                    }
                }

                if (parsed.files.length > 0) {
                    const firstFile = parsed.files[0];
                    console.log(`   Premier fichier: "${firstFile.name}" (${firstFile.content.length} octets)`);
                }

            } catch (error) {
                console.log(`   ❌ Erreur parsing: ${error.message}`);
            }
        }

        return { passedTests, totalTests: this.testCases.filter(t => t.expectedCodeBlocks > 0).length };
    }

    testFileNaming() {
        console.log('\n📁 TEST DE NOMMAGE DES FICHIERS');
        console.log('='.repeat(40));

        const fileNamingTests = [
            {
                input: "```javascript\n// File: my_script.js\nconsole.log('test');\n```",
                expectedFile: "my_script.js"
            },
            {
                input: "```typescript\n/**\n * @file config.ts\n */\ninterface Config {}\n```",
                expectedFile: "config.ts"
            },
            {
                input: "```python\n# File: utils.py\ndef helper():\n    pass\n```",
                expectedFile: "utils.py"
            },
            {
                input: "```javascript\nconsole.log('no filename');\n```",
                expectedFile: "generated_1.js"
            }
        ];

        let passedTests = 0;

        for (const test of fileNamingTests) {
            console.log(`\n📝 Test: "${test.expectedFile}"`);

            const parsed = MarkdownRenderer.parseMarkdownResponse(test.input);
            const actualFile = parsed.files[0]?.name;

            console.log(`   Attendu: "${test.expectedFile}"`);
            console.log(`   Reçu: "${actualFile}"`);
            console.log(`   Résultat: ${actualFile === test.expectedFile ? '✅' : '❌'}`);

            if (actualFile === test.expectedFile) {
                passedTests++;
            }
        }

        return { passedTests, totalTests: fileNamingTests.length };
    }

    async runAllTests() {
        console.log('🎨 TEST DU SYSTÈME DE RENDU MARKDOWN');
        console.log('='.repeat(50));

        // Test de détection
        const detectionResults = this.testCodeDetection();

        // Test de parsing
        const parsingResults = this.testParsing();

        // Test de nommage de fichiers
        const namingResults = this.testFileNaming();

        console.log('\n' + '='.repeat(50));
        console.log('📊 RÉSULTATS FINAUX');

        const totalTests = detectionResults.totalTests + parsingResults.totalTests + namingResults.totalTests;
        const totalPassed = detectionResults.passedTests + parsingResults.passedTests + namingResults.passedTests;
        const successRate = ((totalPassed / totalTests) * 100).toFixed(1);

        console.log(`✅ Tests réussis: ${totalPassed}/${totalTests} (${successRate}%)`);
        console.log(`\n🎯 DÉTAILS:`);
        console.log(`   • Détection de code: ${detectionResults.passedTests}/${detectionResults.totalTests}`);
        console.log(`   • Parsing Markdown: ${parsingResults.passedTests}/${parsingResults.totalTests}`);
        console.log(`   • Nom de fichiers: ${namingResults.passedTests}/${namingResults.totalTests}`);

        if (totalPassed === totalTests) {
            console.log('\n🎉 SUCCÈS TOTAL! Le système Markdown est parfaitement fonctionnel!');
            console.log('🚀 Discord affichera correctement le code et les fichiers uploadés.');
        } else {
            console.log(`\n⚠️ Quelques ajustements nécessaires (${totalTests - totalPassed} échecs)`);
        }

        return totalPassed === totalTests;
    }
}

// Exécuter les tests
async function main() {
    const tester = new MarkdownRendererTest();
    const success = await tester.runAllTests();

    if (success) {
        console.log('\n✨ PRÊT POUR LE DÉPLOIEMENT! Le rendu Markdown est opérationnel! ✨');
    }
}

main().catch(console.error);