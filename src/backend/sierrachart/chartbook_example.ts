/**
 * 📊 SierraChart Chartbook Example
 *
 * Comprehensive example demonstrating how to read and work with SierraChart .Cht files
 */

import { SierraChartReader } from './SierraChartReader';
import { statSync } from 'fs';

async function main() {
    try {
        console.log('📊 SierraChart Chartbook Reader Example\n');

        // Create chartbook reader
        const chartReader = new SierraChartReader();

        // 1. Read sample chartbook from workspace
        console.log('📋 Reading Sample Chartbook:');
        console.log('═'.repeat(80));

        const sampleChartBook = chartReader.readSampleChartBook();

        if (sampleChartBook) {
            console.log(`✅ Successfully read: ${sampleChartBook.fileName}`);
            console.log(`   Size: ${(sampleChartBook.fileSize / 1024).toFixed(2)} KB`);
            console.log(`   Charts: ${sampleChartBook.charts.length}`);
            console.log(`   Last Modified: ${sampleChartBook.lastModified.toLocaleString()}`);

            // Analyze the chartbook
            const analysis = chartReader.analyzeChartBook(sampleChartBook);
            console.log('\n📊 Chartbook Analysis:');
            console.log(`   Total Charts: ${analysis.totalCharts}`);
            console.log(`   Active Charts: ${analysis.activeCharts}`);
            console.log(`   Total Studies: ${analysis.totalStudies}`);
            console.log(`   Total Alerts: ${analysis.totalAlerts}`);
            console.log(`   Chart Types: ${analysis.chartTypes.join(', ')}`);
            console.log(`   Exchanges: ${analysis.exchanges.join(', ')}`);
            console.log(`   Study Types: ${analysis.studyTypes.join(', ')}`);

            // 2. List all charts
            console.log('\n📈 Available Charts:');
            console.log('═'.repeat(80));

            const allCharts = chartReader.getAllCharts(sampleChartBook);
            allCharts.forEach((chart, index) => {
                console.log(`${(index + 1).toString().padStart(2)}. ${chart.name.padEnd(25)} | ${chart.symbol.padEnd(10)} | ${chart.exchange.padEnd(8)} | ${chart.interval.padEnd(12)} | ${chart.chartType.padEnd(12)}`);
            });

            // 3. Get specific chart by symbol
            console.log('\n🎯 Specific Chart Analysis:');
            console.log('═'.repeat(80));

            // Try to get E-mini S&P 500 chart
            const esChart = chartReader.getChartBySymbol(sampleChartBook, 'ES');
            if (esChart) {
                console.log(`✅ Found E-mini S&P 500 Chart:`);
                console.log(`   Name: ${esChart.name}`);
                console.log(`   Symbol: ${esChart.symbol}`);
                console.log(`   Exchange: ${esChart.exchange}`);
                console.log(`   Interval: ${esChart.interval}`);
                console.log(`   Chart Type: ${esChart.chartType}`);
                console.log(`   Active: ${esChart.isActive}`);

                console.log(`\n   Studies (${esChart.studies.length}):`);
                esChart.studies.forEach(study => {
                    console.log(`      • ${study.name} (${study.type}) - ${study.enabled ? 'Enabled' : 'Disabled'}`);
                });

                console.log(`\n   Settings:`);
                console.log(`      Time Range: ${esChart.settings.timeRange}`);
                console.log(`      Color Scheme: ${esChart.settings.colorScheme}`);
                console.log(`      Scale: ${esChart.settings.scale}`);
                console.log(`      Drawing Tools: ${esChart.settings.drawingTools.join(', ')}`);

                console.log(`\n   Alerts (${esChart.settings.alerts.length}):`);
                esChart.settings.alerts.forEach((alert, index) => {
                    console.log(`      ${index + 1}. ${alert.condition} → ${alert.action} (${alert.enabled ? 'Enabled' : 'Disabled'})`);
                });
            } else {
                console.log('❌ E-mini S&P 500 chart not found in sample');
            }

            // 4. Try to read ESNICO.Cht file
            console.log('\n📊 Attempting to Read ESNICO.Cht:');
            console.log('═'.repeat(80));

            const esnicoChartBook = chartReader.readESNICOChartBook();

            if (esnicoChartBook) {
                console.log(`✅ Successfully read: ${esnicoChartBook.fileName}`);
                console.log(`   Size: ${(esnicoChartBook.fileSize / 1024).toFixed(2)} KB`);
                console.log(`   Charts: ${esnicoChartBook.charts.length}`);

                // Show charts from ESNICO
                esnicoChartBook.charts.forEach((chart, index) => {
                    console.log(`${(index + 1).toString().padStart(2)}. ${chart.name.padEnd(25)} | ${chart.symbol.padEnd(10)} | ${chart.exchange.padEnd(8)}`);
                });
            } else {
                console.log('❌ ESNICO.Cht not found or could not be read');
                console.log('   Expected location: C:/SierraChart/Data/ESNICO.Cht');
                console.log('   Please ensure SierraChart is running and the file exists');
            }

            // 5. List all available chartbooks
            console.log('\n📂 Available Chartbooks:');
            console.log('═'.repeat(80));

            try {
                const chartBooks = chartReader.listAllChartBooks();
                if (chartBooks.length > 0) {
                    chartBooks.forEach((filePath, index) => {
                        try {
                            const stats = statSync(filePath);
                            const sizeKB = (stats.size / 1024).toFixed(2);
                            console.log(`${(index + 1).toString().padStart(2)}. ${filePath.split('/').pop()?.padEnd(30)} | ${sizeKB.padStart(8)} KB | ${stats.mtime.toLocaleString()}`);
                        } catch (statError) {
                            console.log(`${(index + 1).toString().padStart(2)}. ${filePath.split('/').pop()?.padEnd(30)} | Could not read stats`);
                        }
                    });
                } else {
                    console.log('   No .Cht files found in SierraChart data directory');
                }
            } catch (error) {
                console.log(`⚠️  Could not list chartbooks: ${(error as Error).message}`);
            }

            // 6. Export chartbook to JSON
            console.log('\n📥 Export Chartbook to JSON:');
            console.log('═'.repeat(80));

            const jsonExport = chartReader.exportToJSON(sampleChartBook);
            console.log('JSON Export (first 500 chars):');
            console.log(jsonExport.substring(0, 500) + '...');

            // Save to file example
            console.log('\n   To save to file:');
            console.log('   const fs = require(\'fs\');');
            console.log('   fs.writeFileSync(\'chartbook_export.json\', jsonExport);');

        } else {
            console.log('❌ Could not read sample chartbook');
        }

        // 7. Show usage with actual data files
        console.log('\n🎯 Practical Usage Example:');
        console.log('═'.repeat(80));

        console.log('// Read and analyze a specific chartbook');
        console.log('const chartReader = new SierraChartReader();');
        console.log('const chartBook = chartReader.readChartBook(\'C:/SierraChart/Data/ESNICO.Cht\');');
        console.log('');
        console.log('if (chartBook) {');
        console.log('    // Get all charts');
        console.log('    const charts = chartReader.getAllCharts(chartBook);');
        console.log('');
        console.log('    // Find specific chart');
        console.log('    const esChart = chartReader.getChartBySymbol(chartBook, \'ESM25\');');
        console.log('');
        console.log('    // Analyze chartbook');
        console.log('    const analysis = chartReader.analyzeChartBook(chartBook);');
        console.log('');
        console.log('    // Export to JSON');
        console.log('    const json = chartReader.exportToJSON(chartBook);');
        console.log('}');

        console.log('\n🏁 Chartbook Example Completed!');
        console.log('✅ SierraChart .Cht file reading is ready to use');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run the example
main().catch(console.error);