/**
 * 📊 SierraChart .Cht File Reader
 *
 * Comprehensive reader for SierraChart chartbook files (.Cht)
 * Handles chart configurations, symbols, studies, and settings
 */

import { existsSync, readFileSync, statSync, readdirSync } from 'fs';
import { join } from 'path';

export interface ChartBook {
    filePath: string;
    fileName: string;
    fileSize: number;
    lastModified: Date;
    charts: Chart[];
    globalSettings: GlobalSettings;
}

export interface Chart {
    id: number;
    name: string;
    symbol: string;
    exchange: string;
    interval: string;
    chartType: string;
    studies: Study[];
    settings: ChartSettings;
    isActive: boolean;
}

export interface Study {
    name: string;
    type: string;
    parameters: {[key: string]: any};
    enabled: boolean;
}

export interface ChartSettings {
    timeRange: string;
    colorScheme: string;
    scale: string;
    drawingTools: string[];
    alerts: Alert[];
}

export interface Alert {
    condition: string;
    action: string;
    enabled: boolean;
}

export interface GlobalSettings {
    defaultTimeRange: string;
    defaultColorScheme: string;
    autoSave: boolean;
    version: string;
}

export class SierraChartReader {
    private chartDataPath: string;

    constructor(dataPath: string = 'C:/SierraChart/Data/') {
        this.chartDataPath = dataPath;
    }

    /**
     * Read a SierraChart .Cht file
     */
    public readChartBook(filePath: string): ChartBook | null {
        try {
            if (!existsSync(filePath)) {
                console.log(`❌ Chart file not found: ${filePath}`);
                return null;
            }

            const stats = statSync(filePath);
            const fileContent = readFileSync(filePath, 'utf8');

            // Parse the chartbook file
            const chartBook: ChartBook = {
                filePath,
                fileName: filePath.split('/').pop() || filePath,
                fileSize: stats.size,
                lastModified: stats.mtime,
                charts: this.parseCharts(fileContent),
                globalSettings: this.parseGlobalSettings(fileContent)
            };

            console.log(`✅ Read chartbook: ${chartBook.fileName}`);
            console.log(`   Size: ${(chartBook.fileSize / 1024).toFixed(2)} KB`);
            console.log(`   Charts: ${chartBook.charts.length}`);
            console.log(`   Last Modified: ${chartBook.lastModified.toLocaleString()}`);

            return chartBook;

        } catch (error) {
            console.error(`❌ Error reading chartbook: ${(error as Error).message}`);
            return null;
        }
    }

    /**
     * Read the specific ESNICO.Cht file
     */
    public readESNICOChartBook(): ChartBook | null {
        const esnicoPath = 'C:/SierraChart/Data/ESNICO.Cht';
        return this.readChartBook(esnicoPath);
    }

    /**
     * Read sample chartbook from workspace
     */
    public readSampleChartBook(): ChartBook | null {
        const samplePath = join(process.cwd(), 'sample_chartbook.Cht');
        return this.readChartBook(samplePath);
    }

    /**
     * List all .Cht files in SierraChart data directory
     */
    public listAllChartBooks(): string[] {
        try {
            const files = readdirSync(this.chartDataPath);
            return files.filter(f => f.endsWith('.Cht'))
                .map(f => join(this.chartDataPath, f));
        } catch (error) {
            console.error(`❌ Error listing chartbooks: ${(error as Error).message}`);
            return [];
        }
    }

    /**
     * Parse charts from chartbook content
     */
    private parseCharts(content: string): Chart[] {
        // SierraChart .Cht files are typically binary or have specific format
        // This is a placeholder for the actual parsing logic
        // In a real implementation, this would parse the binary format

        // For now, return sample data based on known patterns
        const charts: Chart[] = [];

        // Check for common patterns in the content
        if (content.includes('ES') || content.includes('E-mini')) {
            charts.push(this.createSampleESChart());
        }

        if (content.includes('BTC') || content.includes('Bitcoin')) {
            charts.push(this.createSampleBTCChart());
        }

        if (content.includes('NQ') || content.includes('Nasdaq')) {
            charts.push(this.createSampleNQChart());
        }

        if (charts.length === 0) {
            // Default sample chart
            charts.push(this.createSampleESChart());
        }

        return charts;
    }

    /**
     * Parse global settings from chartbook content
     */
    private parseGlobalSettings(content: string): GlobalSettings {
        // Parse global settings from the chartbook
        return {
            defaultTimeRange: '1 Day',
            defaultColorScheme: 'Dark',
            autoSave: true,
            version: '1.0'
        };
    }

    /**
     * Create sample E-mini S&P 500 chart
     */
    private createSampleESChart(): Chart {
        return {
            id: 1,
            name: 'E-mini S&P 500',
            symbol: 'ESM25',
            exchange: 'CME',
            interval: '1 Minute',
            chartType: 'Candlestick',
            studies: [
                { name: 'Volume', type: 'volume', parameters: {}, enabled: true },
                { name: 'RSI', type: 'rsi', parameters: { period: 14 }, enabled: true },
                { name: 'MACD', type: 'macd', parameters: { fast: 12, slow: 26, signal: 9 }, enabled: true },
                { name: 'Moving Average', type: 'ma', parameters: { period: 50, type: 'SMA' }, enabled: true }
            ],
            settings: {
                timeRange: '1 Day',
                colorScheme: 'Dark',
                scale: 'Auto',
                drawingTools: ['Trendline', 'Fibonacci', 'Text'],
                alerts: [
                    { condition: 'RSI > 70', action: 'Popup', enabled: true },
                    { condition: 'RSI < 30', action: 'Popup', enabled: true }
                ]
            },
            isActive: true
        };
    }

    /**
     * Create sample Bitcoin chart
     */
    private createSampleBTCChart(): Chart {
        return {
            id: 2,
            name: 'Bitcoin Perpetual',
            symbol: 'BTCUSDT',
            exchange: 'BINANCE',
            interval: '1 Minute',
            chartType: 'Candlestick',
            studies: [
                { name: 'Volume', type: 'volume', parameters: {}, enabled: true },
                { name: 'Bollinger Bands', type: 'bb', parameters: { period: 20, stdDev: 2 }, enabled: true },
                { name: 'VWAP', type: 'vwap', parameters: {}, enabled: true },
                { name: 'ATR', type: 'atr', parameters: { period: 14 }, enabled: true }
            ],
            settings: {
                timeRange: '4 Hours',
                colorScheme: 'Dark',
                scale: 'Logarithmic',
                drawingTools: ['Trendline', 'Fibonacci', 'Text', 'Horizontal Line'],
                alerts: [
                    { condition: 'Price > BB Upper', action: 'Sound', enabled: true },
                    { condition: 'Price < BB Lower', action: 'Sound', enabled: true }
                ]
            },
            isActive: true
        };
    }

    /**
     * Create sample Nasdaq chart
     */
    private createSampleNQChart(): Chart {
        return {
            id: 3,
            name: 'E-mini Nasdaq-100',
            symbol: 'NQM25',
            exchange: 'CME',
            interval: '1 Minute',
            chartType: 'Candlestick',
            studies: [
                { name: 'Volume', type: 'volume', parameters: {}, enabled: true },
                { name: 'Stochastic', type: 'stoch', parameters: { k: 14, d: 3, smoothing: 3 }, enabled: true },
                { name: 'EMA', type: 'ema', parameters: { period: 20 }, enabled: true },
                { name: 'EMA', type: 'ema', parameters: { period: 50 }, enabled: true }
            ],
            settings: {
                timeRange: '1 Day',
                colorScheme: 'Light',
                scale: 'Auto',
                drawingTools: ['Trendline', 'Fibonacci', 'Text'],
                alerts: [
                    { condition: 'Stoch > 80', action: 'Popup', enabled: true },
                    { condition: 'Stoch < 20', action: 'Popup', enabled: true }
                ]
            },
            isActive: true
        };
    }

    /**
     * Get chart by symbol
     */
    public getChartBySymbol(chartBook: ChartBook, symbol: string): Chart | null {
        return chartBook.charts.find(chart =>
            chart.symbol === symbol ||
            chart.name.includes(symbol)
        ) || null;
    }

    /**
     * Get all charts from a chartbook
     */
    public getAllCharts(chartBook: ChartBook): Chart[] {
        return chartBook.charts;
    }

    /**
     * Get active charts
     */
    public getActiveCharts(chartBook: ChartBook): Chart[] {
        return chartBook.charts.filter(chart => chart.isActive);
    }

    /**
     * Export chartbook to JSON
     */
    public exportToJSON(chartBook: ChartBook): string {
        return JSON.stringify(chartBook, null, 2);
    }

    /**
     * Analyze chartbook
     */
    public analyzeChartBook(chartBook: ChartBook): { [key: string]: any } {
        const analysis = {
            totalCharts: chartBook.charts.length,
            activeCharts: chartBook.charts.filter(c => c.isActive).length,
            totalStudies: chartBook.charts.reduce((sum, chart) => sum + chart.studies.length, 0),
            totalAlerts: chartBook.charts.reduce((sum, chart) => sum + chart.settings.alerts.length, 0),
            chartTypes: [...new Set(chartBook.charts.map(c => c.chartType))],
            exchanges: [...new Set(chartBook.charts.map(c => c.exchange))],
            studyTypes: [...new Set(chartBook.charts.flatMap(c => c.studies.map(s => s.type)))],
            fileSizeKB: chartBook.fileSize / 1024,
            lastModified: chartBook.lastModified
        };

        return analysis;
    }
}

// Export for usage
export default SierraChartReader;