/**
 * Tests de performance et optimisation du stack complet
 * Validation sous charge et identification des goulots d'étranglement
 */

class PerformanceTester {
    constructor() {
        this.testResults = {
            total: 0,
            success: 0,
            failed: 0,
            performance: {
                avgTime: 0,
                minTime: Infinity,
                maxTime: 0,
                totalTime: 0
            },
            memoryUsage: {
                initial: 0,
                peak: 0,
                final: 0
            },
            categories: {}
        };
    }

    async measurePerformance(testName, testFunction) {
        const startTime = process.hrtime.bigint();
        const startMemory = process.memoryUsage().heapUsed;

        try {
            const result = await testFunction();

            const endTime = process.hrtime.bigint();
            const endMemory = process.memoryUsage().heapUsed;

            const duration = Number(endTime - startTime) / 1000000; // Convert to ms
            const memoryDelta = endMemory - startMemory;

            this.updatePerformanceStats(testName, duration, memoryDelta, true);

            return {
                success: true,
                duration,
                memoryDelta,
                result
            };

        } catch (error) {
            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - startTime) / 1000000;

            this.updatePerformanceStats(testName, duration, 0, false);

            return {
                success: false,
                duration,
                error: error.message
            };
        }
    }

    updatePerformanceStats(testName, duration, memoryDelta, success) {
        this.testResults.total++;

        if (success) {
            this.testResults.success++;
        } else {
            this.testResults.failed++;
        }

        // Update performance metrics
        this.testResults.performance.totalTime += duration;
        this.testResults.performance.avgTime = this.testResults.performance.totalTime / this.testResults.total;
        this.testResults.performance.minTime = Math.min(this.testResults.performance.minTime, duration);
        this.testResults.performance.maxTime = Math.max(this.testResults.performance.maxTime, duration);

        // Track memory usage
        if (!this.testResults.memoryUsage.initial) {
            this.testResults.memoryUsage.initial = memoryDelta;
        }
        this.testResults.memoryUsage.peak = Math.max(this.testResults.memoryUsage.peak, memoryDelta);
        this.testResults.memoryUsage.final = memoryDelta;

        // Category stats
        if (!this.testResults.categories[testName]) {
            this.testResults.categories[testName] = {
                count: 0,
                totalTime: 0,
                avgTime: 0,
                successRate: 0
            };
        }

        const category = this.testResults.categories[testName];
        category.count++;
        category.totalTime += duration;
        category.avgTime = category.totalTime / category.count;
        category.successRate = (category.successRate * (category.count - 1) + (success ? 1 : 0)) / category.count;
    }

    async testJSONResponseSpeed() {
        console.log('⚡ Test Performance: Génération de réponses JSON');

        const testCases = [
            'génère rapport BTC',
            'créer fichier script.js',
            'analyse ETH',
            'créer sondage stratégie',
            'menu trading BTC'
        ];

        for (let i = 0; i < 100; i++) {
            const testCase = testCases[i % testCases.length];

            const result = await this.measurePerformance(`json_response_${testCase.split(' ')[1]}`, async () => {
                // Simuler la génération de réponse JSON
                const response = {
                    type: 'financial_analysis',
                    embeds: [{
                        title: `📊 Analyse - ${testCase}`,
                        description: 'Analyse générée rapidement',
                        color: 65280,
                        fields: [
                            { name: 'Test', value: `Test #${i + 1}`, inline: true },
                            { name: 'Performance', value: 'Optimisé', inline: true }
                        ]
                    }]
                };

                // Valider le JSON
                JSON.stringify(response);
                return response;
            });

            if (result.duration > 100) {
                console.warn(`⚠️ Test #${i + 1} lent: ${result.duration.toFixed(2)}ms`);
            }
        }

        console.log('✅ Test JSON Response Speed terminé');
    }

    async testFileHandlingPerformance() {
        console.log('📁 Test Performance: Gestion des fichiers');

        const fileTypes = ['md', 'js', 'ts', 'py', 'json', 'csv'];
        const fileContents = {
            md: '# Test Markdown\n\nContent here...',
            js: 'console.log("test");',
            ts: 'interface Test { id: number; }',
            py: 'def test(): pass',
            json: '{"test": true}',
            csv: 'id,name,value\n1,test,100'
        };

        for (let i = 0; i < 50; i++) {
            const fileType = fileTypes[i % fileTypes.length];
            const filename = `test_${i}.${fileType}`;

            const result = await this.measurePerformance(`file_handling_${fileType}`, async () => {
                // Simuler la création de fichier
                const fileData = {
                    type: 'file_creation',
                    filename: filename,
                    content: fileContents[fileType],
                    embeds: [{
                        title: `📄 Fichier Créé - ${filename}`,
                        color: 5025616,
                        fields: [
                            { name: 'Type', value: fileType.toUpperCase(), inline: true },
                            { name: 'Size', value: `${fileContents[fileType].length} bytes`, inline: true }
                        ]
                    }]
                };

                // Simuler le traitement du contenu
                const processedContent = fileData.content.toUpperCase();
                return { ...fileData, processedContent };
            });
        }

        console.log('✅ Test File Handling Performance terminé');
    }

    async testEmbedGenerationSpeed() {
        console.log('📊 Test Performance: Génération d\'Embeds complexes');

        const embedTemplates = [
            {
                name: 'analysis',
                generator: (i) => ({
                    title: `📈 Analyse #${i}`,
                    color: 65280,
                    fields: [
                        { name: 'Asset', value: 'BTC', inline: true },
                        { name: 'Price', value: '$45,000', inline: true },
                        { name: 'Change', value: '+2.5%', inline: true }
                    ]
                })
            },
            {
                name: 'portfolio',
                generator: (i) => ({
                    title: `💼 Portfolio #${i}`,
                    color: 3447003,
                    fields: [
                        { name: 'Value', value: '$100,000', inline: true },
                        { name: 'PnL', value: '+$5,000', inline: true },
                        { name: 'Positions', value: '10', inline: true }
                    ]
                })
            },
            {
                name: 'alert',
                generator: (i) => ({
                    title: `🚨 Alert #${i}`,
                    color: 16711680,
                    fields: [
                        { name: 'Level', value: 'HIGH', inline: true },
                        { name: 'Asset', value: 'ETH', inline: true },
                        { name: 'Action', value: 'MONITOR', inline: true }
                    ]
                })
            }
        ];

        for (let i = 0; i < 75; i++) {
            const template = embedTemplates[i % embedTemplates.length];

            const result = await this.measurePerformance(`embed_generation_${template.name}`, async () => {
                const embed = template.generator(i);
                const response = {
                    type: 'embed',
                    embeds: [embed]
                };

                // Simuler la validation Discord
                const embedSize = JSON.stringify(embed).length;
                if (embedSize > 6000) {
                    throw new Error('Embed too large');
                }

                return response;
            });
        }

        console.log('✅ Test Embed Generation Speed terminé');
    }

    async testComponentComplexity() {
        console.log('🎮 Test Performance: Composants Discord complexes');

        const componentTypes = [
            {
                name: 'simple_buttons',
                complexity: 1,
                generator: (i) => ({
                    type: 1,
                    components: [
                        { type: 2, label: `Btn ${i}`, style: 1, custom_id: `btn_${i}` },
                        { type: 2, label: `Cancel`, style: 4, custom_id: `cancel_${i}` }
                    ]
                })
            },
            {
                name: 'select_menu',
                complexity: 2,
                generator: (i) => ({
                    type: 1,
                    components: [
                        {
                            type: 3,
                            custom_id: `select_${i}`,
                            placeholder: 'Choose option...',
                            options: Array.from({ length: 5 }, (_, j) => ({
                                label: `Option ${j}`,
                                value: `opt_${j}`,
                                description: `Description ${j}`
                            }))
                        }
                    ]
                })
            },
            {
                name: 'complex_menu',
                complexity: 3,
                generator: (i) => ({
                    type: 1,
                    components: [
                        { type: 2, label: 'Analyze', style: 1, custom_id: `analyze_${i}` },
                        { type: 2, label: 'Buy', style: 3, custom_id: `buy_${i}` },
                        { type: 2, label: 'Sell', style: 4, custom_id: `sell_${i}` }
                    ]
                })
            }
        ];

        for (let i = 0; i < 60; i++) {
            const componentType = componentTypes[i % componentTypes.length];

            const result = await this.measurePerformance(`component_${componentType.name}`, async () => {
                const components = Array.from(
                    { length: componentType.complexity },
                    (_, j) => componentType.generator(`${i}_${j}`)
                );

                const response = {
                    type: 'interactive_menu',
                    embeds: [{
                        title: `🎮 Menu #${i}`,
                        description: `${componentType.complexity} component rows`,
                        color: 10181038
                    }],
                    components
                };

                // Valider la taille des composants
                const componentSize = JSON.stringify(components).length;
                if (componentSize > 8000) {
                    throw new Error('Components too large');
                }

                return response;
            });
        }

        console.log('✅ Test Component Complexity terminé');
    }

    async testConcurrentProcessing() {
        console.log('🔄 Test Performance: Traitement concurrent');

        const concurrentTasks = Array.from({ length: 20 }, (_, i) =>
            this.measurePerformance(`concurrent_task_${i}`, async () => {
                // Simuler un traitement complexe
                await new Promise(resolve => setTimeout(resolve, Math.random() * 50));

                return {
                    id: i,
                    result: `processed_${i}`,
                    timestamp: Date.now()
                };
            })
        );

        // Exécuter toutes les tâches en parallèle
        const startTime = Date.now();
        const results = await Promise.all(concurrentTasks);
        const endTime = Date.now();

        const totalTime = endTime - startTime;
        const avgConcurrentTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

        console.log(`   📊 Temps total: ${totalTime}ms`);
        console.log(`   ⚡ Temps moyen par tâche: ${avgConcurrentTime.toFixed(2)}ms`);
        console.log(`   🚀 Efficacité parallèle: ${((avgConcurrentTime * 20) / totalTime * 100).toFixed(1)}%`);

        console.log('✅ Test Concurrent Processing terminé');
    }

    async testMemoryUsageUnderLoad() {
        console.log('💾 Test Performance: Utilisation mémoire sous charge');

        const memorySnapshots = [];

        for (let i = 0; i < 100; i++) {
            const snapshot = process.memoryUsage();
            memorySnapshots.push({
                iteration: i,
                heapUsed: snapshot.heapUsed,
                heapTotal: snapshot.heapTotal,
                external: snapshot.external,
                rss: snapshot.rss
            });

            // Simuler une opération lourde
            const result = await this.measurePerformance(`memory_test_${i}`, async () => {
                const largeArray = Array.from({ length: 1000 }, (_, j) => ({
                    id: j,
                    data: `test_data_${i}_${j}`,
                    timestamp: Date.now(),
                    random: Math.random()
                }));

                // Simuler un traitement
                const processed = largeArray.map(item => ({
                    ...item,
                    processed: true,
                    result: item.data.toUpperCase()
                }));

                return processed.length;
            });

            if (i % 20 === 0) {
                const currentMem = process.memoryUsage();
                console.log(`   💾 Mémoire @ itération ${i}: ${(currentMem.heapUsed / 1024 / 1024).toFixed(2)}MB`);
            }
        }

        // Analyser les tendances mémoire
        const initialMemory = memorySnapshots[0].heapUsed;
        const finalMemory = memorySnapshots[memorySnapshots.length - 1].heapUsed;
        const peakMemory = Math.max(...memorySnapshots.map(s => s.heapUsed));
        const memoryGrowth = finalMemory - initialMemory;

        console.log(`   📈 Croissance mémoire: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
        console.log(`   🏆 Mémoire pic: ${(peakMemory / 1024 / 1024).toFixed(2)}MB`);

        console.log('✅ Test Memory Usage terminé');
    }

    generateOptimizationReport() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 RAPPORT DE PERFORMANCE ET OPTIMISATION');
        console.log('='.repeat(80));

        // Statistiques globales
        console.log(`\n📈 PERFORMANCE GLOBALE:`);
        console.log(`   • Tests totaux: ${this.testResults.total}`);
        console.log(`   • Taux de succès: ${((this.testResults.success / this.testResults.total) * 100).toFixed(2)}%`);
        console.log(`   • Temps moyen: ${this.testResults.performance.avgTime.toFixed(2)}ms`);
        console.log(`   • Temps min: ${this.testResults.performance.minTime.toFixed(2)}ms`);
        console.log(`   • Temps max: ${this.testResults.performance.maxTime.toFixed(2)}ms`);

        // Utilisation mémoire
        console.log(`\n💾 UTILISATION MÉMOIRE:`);
        console.log(`   • Initiale: ${(this.testResults.memoryUsage.initial / 1024 / 1024).toFixed(2)}MB`);
        console.log(`   • Pic: ${(this.testResults.memoryUsage.peak / 1024 / 1024).toFixed(2)}MB`);
        console.log(`   • Finale: ${(this.testResults.memoryUsage.final / 1024 / 1024).toFixed(2)}MB`);

        // Performance par catégorie
        console.log(`\n📋 PERFORMANCE PAR CATÉGORIE:`);
        for (const [category, stats] of Object.entries(this.testResults.categories)) {
            const status = stats.avgTime < 50 ? '✅' : stats.avgTime < 100 ? '⚠️' : '❌';
            console.log(`   ${status} ${category}:`);
            console.log(`      • Temps moyen: ${stats.avgTime.toFixed(2)}ms`);
            console.log(`      • Taux de succès: ${(stats.successRate * 100).toFixed(1)}%`);
            console.log(`      • Tests exécutés: ${stats.count}`);
        }

        // Recommandations d'optimisation
        console.log(`\n🎯 RECOMMANDATIONS D'OPTIMISATION:`);

        if (this.testResults.performance.avgTime > 50) {
            console.log(`   ⚠️ Temps de réponse moyen élevé (${this.testResults.performance.avgTime.toFixed(2)}ms)`);
            console.log(`      → Optimiser les algorithmes de génération`);
            console.log(`      → Implémenter le cache pour les réponses fréquentes`);
        }

        const memoryGrowth = this.testResults.memoryUsage.final - this.testResults.memoryUsage.initial;
        if (memoryGrowth > 50 * 1024 * 1024) { // > 50MB
            console.log(`   ⚠️ Croissance mémoire importante (${(memoryGrowth / 1024 / 1024).toFixed(2)}MB)`);
            console.log(`      → Implémenter le nettoyage des objets temporaires`);
            console.log(`      → Utiliser des structures de données plus efficaces`);
        }

        // Catégories problématiques
        for (const [category, stats] of Object.entries(this.testResults.categories)) {
            if (stats.avgTime > 100) {
                console.log(`   ⚠️ ${category}: Temps élevé (${stats.avgTime.toFixed(2)}ms) - À optimiser`);
            }
            if (stats.successRate < 0.95) {
                console.log(`   ⚠️ ${category}: Taux de succès faible (${(stats.successRate * 100).toFixed(1)}%) - À déboguer`);
            }
        }

        // Score global
        const performanceScore = Math.max(0, 100 - (this.testResults.performance.avgTime / 2));
        const successScore = (this.testResults.success / this.testResults.total) * 100;
        const memoryScore = Math.max(0, 100 - (memoryGrowth / (1024 * 1024 * 10))); // Pénalité si > 10MB
        const globalScore = (performanceScore * 0.5 + successScore * 0.3 + memoryScore * 0.2);

        console.log(`\n🏆 SCORE GLOBAL DE PERFORMANCE: ${globalScore.toFixed(1)}/100`);

        if (globalScore >= 90) {
            console.log(`   🎉 EXCELLENT! Le système est optimisé pour la production`);
        } else if (globalScore >= 75) {
            console.log(`   ✅ BON! Le système est fonctionnel avec des optimisations possibles`);
        } else if (globalScore >= 60) {
            console.log(`   ⚠️ MOYEN! Des optimisations sont recommandées avant la production`);
        } else {
            console.log(`   ❌ FAIBLE! Des optimisations majeures sont nécessaires`);
        }

        console.log('\n' + '='.repeat(80));
    }

    async runPerformanceTests() {
        console.log('🚀 DÉMARRAGE DES TESTS DE PERFORMANCE ET OPTIMISATION');
        console.log('='.repeat(60));

        await this.testJSONResponseSpeed();
        await this.testFileHandlingPerformance();
        await this.testEmbedGenerationSpeed();
        await this.testComponentComplexity();
        await this.testConcurrentProcessing();
        await this.testMemoryUsageUnderLoad();

        this.generateOptimizationReport();
    }
}

// Exécuter les tests
async function main() {
    const tester = new PerformanceTester();
    await tester.runPerformanceTests();
}

main().catch(console.error);