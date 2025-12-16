/**
 * 📊 CME-Specific Data Consumer
 *
 * Specialized consumer for CME Group symbols from SierraChart
 * Focuses on futures, options, and commodities from Chicago Mercantile Exchange
 */

import { SierraChartDataConsumer, TickData, DailyData, SymbolInfo, DataAnalysis } from './SierraChartDataConsumer';

export interface CMESymbolInfo extends SymbolInfo {
    symbol: string;
    contractMonth: string;
    year: string;
    productType: 'Futures' | 'Options' | 'Commodity' | 'Index';
    sector: string;
    product: string;
    tickSize: number;
    tickValue: number;
    tradingHours: string;
    marginRequirement?: number;
}

export interface CMEAnalysis extends DataAnalysis {
    openInterestTrend: string;
    volumeAnalysis: string;
    contractExpiration: string;
    rolloverRecommendation?: string;
}

export class CMEDataConsumer extends SierraChartDataConsumer {
    private cmeSymbols: Map<string, CMESymbolInfo> = new Map();
    private cmeSectors: Set<string> = new Set();

    constructor(dataPath: string = 'C:/SierraChart/Data/') {
        super(dataPath);
        this.initializeCMESymbols();
    }

    /**
     * Initialize CME-specific symbol information
     */
    private initializeCMESymbols(): void {
        // CME Futures Symbol Patterns - Updated to match actual data format (2 letters + 2 digits)
        const cmePatterns = [
            // Equity Index Futures - Updated patterns
            { pattern: /^ES([A-Z]{1}[0-9]{2})-CME$/, type: 'Futures', sector: 'Equity Index', product: 'E-mini S&P 500' },
            { pattern: /^NQ([A-Z]{1}[0-9]{2})-CME$/, type: 'Futures', sector: 'Equity Index', product: 'E-mini Nasdaq-100' },
            { pattern: /^YM([A-Z]{1}[0-9]{2})-CME$/, type: 'Futures', sector: 'Equity Index', product: 'E-mini Dow Jones' },
            { pattern: /^RTY([A-Z]{1}[0-9]{2})-CME$/, type: 'Futures', sector: 'Equity Index', product: 'E-mini Russell 2000' },
            { pattern: /^MES([A-Z]{1}[0-9]{2})-CME$/, type: 'Futures', sector: 'Equity Index', product: 'Micro E-mini S&P 500' },
            { pattern: /^MNQ([A-Z]{1}[0-9]{2})-CME$/, type: 'Futures', sector: 'Equity Index', product: 'Micro E-mini Nasdaq-100' },
            { pattern: /^MYM([A-Z]{1}[0-9]{2})-CME$/, type: 'Futures', sector: 'Equity Index', product: 'Micro E-mini Dow Jones' },
            { pattern: /^M2K([A-Z]{1}[0-9]{2})-CME$/, type: 'Futures', sector: 'Equity Index', product: 'Micro E-mini Russell 2000' },

            // Cryptocurrency Futures - Updated patterns
            { pattern: /^BTC([A-Z]{1}[0-9]{2})-CME$/, type: 'Futures', sector: 'Crypto', product: 'Bitcoin' },
            { pattern: /^ETH([A-Z]{1}[0-9]{2})-CME$/, type: 'Futures', sector: 'Crypto', product: 'Ethereum' },

            // Commodity Futures - Updated patterns
            { pattern: /^GC([A-Z]{1}[0-9]{2})-CME$/, type: 'Futures', sector: 'Commodity', product: 'Gold' },
            { pattern: /^SI([A-Z]{1}[0-9]{2})-CME$/, type: 'Futures', sector: 'Commodity', product: 'Silver' },
            { pattern: /^CL([A-Z]{1}[0-9]{2})-CME$/, type: 'Futures', sector: 'Energy', product: 'Crude Oil' },
            { pattern: /^NG([A-Z]{1}[0-9]{2})-CME$/, type: 'Futures', sector: 'Energy', product: 'Natural Gas' },

            // Interest Rate Futures - Updated patterns
            { pattern: /^ZB([A-Z]{1}[0-9]{2})-CME$/, type: 'Futures', sector: 'Rates', product: 'T-Bond' },
            { pattern: /^ZN([A-Z]{1}[0-9]{2})-CME$/, type: 'Futures', sector: 'Rates', product: '10-Year T-Note' },
            { pattern: /^ZF([A-Z]{1}[0-9]{2})-CME$/, type: 'Futures', sector: 'Rates', product: '5-Year T-Note' },
            { pattern: /^ZT([A-Z]{1}[0-9]{2})-CME$/, type: 'Futures', sector: 'Rates', product: '2-Year T-Note' },

            // FX Futures - Updated patterns
            { pattern: /^GE([A-Z]{1}[0-9]{2})-CME$/, type: 'Futures', sector: 'FX', product: 'Euro FX' },
            { pattern: /^JY([A-Z]{1}[0-9]{2})-CME$/, type: 'Futures', sector: 'FX', product: 'Japanese Yen' },
            { pattern: /^BP([A-Z]{1}[0-9]{2})-CME$/, type: 'Futures', sector: 'FX', product: 'British Pound' },
            { pattern: /^CD([A-Z]{1}[0-9]{2})-CME$/, type: 'Futures', sector: 'FX', product: 'Canadian Dollar' },
            { pattern: /^AD([A-Z]{1}[0-9]{2})-CME$/, type: 'Futures', sector: 'FX', product: 'Australian Dollar' },
            { pattern: /^SF([A-Z]{1}[0-9]{2})-CME$/, type: 'Futures', sector: 'FX', product: 'Swiss Franc' }
        ];

        // Get all symbols from parent class
        const allSymbols = this.getAvailableSymbols();

        // Filter and categorize CME symbols
        allSymbols.forEach(symbolInfo => {
            for (const pattern of cmePatterns) {
                if (pattern.pattern.test(symbolInfo.symbol)) {
                    const match = symbolInfo.symbol.match(pattern.pattern);
                    if (match) {
                        const contractCode = match[1] || '';
                        const year = contractCode.match(/[0-9]{2}/)?.[0] || '';
                        const fullYear = '20' + year;
                        const monthCode = contractCode.match(/[A-Z]/)?.[0] || '';

                        const monthMap: {[key: string]: string} = {
                            'F': 'January', 'G': 'February', 'H': 'March',
                            'J': 'April', 'K': 'May', 'M': 'June',
                            'N': 'July', 'Q': 'August', 'U': 'September',
                            'V': 'October', 'X': 'November', 'Z': 'December'
                        };

                        const monthName = monthMap[monthCode] || 'Unknown';
                        const expiration = `${monthName} ${fullYear}`;

                        const cmeSymbol: CMESymbolInfo = {
                            ...symbolInfo,
                            contractMonth: monthCode,
                            year: fullYear,
                            productType: pattern.type as 'Futures' | 'Options' | 'Commodity' | 'Index',
                            sector: pattern.sector,
                            tickSize: this.getTickSize(pattern.sector),
                            tickValue: this.getTickValue(pattern.sector),
                            tradingHours: this.getTradingHours(pattern.sector),
                            marginRequirement: this.getMarginRequirement(pattern.sector),
                            product: pattern.product
                        };

                        this.cmeSymbols.set(symbolInfo.symbol, cmeSymbol);
                        this.cmeSectors.add(pattern.sector);
                        break;
                    }
                }
            }
        });

        console.log(`🎯 CME Data Consumer initialized with ${this.cmeSymbols.size} CME symbols`);
    }

    /**
     * Get all CME symbols
     */
    public getCMESymbols(): CMESymbolInfo[] {
        return Array.from(this.cmeSymbols.values());
    }

    /**
     * Get CME symbols by sector
     */
    public getCMESymbolsBySector(sector: string): CMESymbolInfo[] {
        return Array.from(this.cmeSymbols.values())
            .filter(symbol => symbol.sector === sector);
    }

    /**
     * Get available sectors
     */
    public getAvailableSectors(): string[] {
        return Array.from(this.cmeSectors.values());
    }

    /**
     * Get active CME symbols (recently updated)
     */
    public getActiveCMESymbols(): CMESymbolInfo[] {
        return Array.from(this.cmeSymbols.values())
            .filter(symbol => symbol.isActive)
            .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    }

    /**
     * Get CME-specific analysis
     */
    public analyzeCMESymbol(symbol: string): CMEAnalysis | null {
        const baseAnalysis = super.analyzeSymbol(symbol);
        if (!baseAnalysis) return null;

        const cmeSymbol = this.cmeSymbols.get(symbol);
        if (!cmeSymbol) return null;

        // Get additional CME-specific metrics
        const openInterestTrend = this.analyzeOpenInterest(symbol);
        const volumeAnalysis = this.analyzeVolumePattern(symbol);
        const rolloverRecommendation = this.checkRollover(symbol);

        const cmeAnalysis: CMEAnalysis = {
            ...baseAnalysis,
            openInterestTrend,
            volumeAnalysis,
            contractExpiration: cmeSymbol.year + ' ' + this.getMonthName(cmeSymbol.contractMonth),
            rolloverRecommendation
        };

        return cmeAnalysis;
    }

    /**
     * Get CME symbol info with contract details
     */
    public getCMESymbolInfo(symbol: string): CMESymbolInfo | null {
        return this.cmeSymbols.get(symbol) || null;
    }

    // ==================== PRIVATE METHODS ====================

    private getTickSize(sector: string): number {
        const tickSizes: {[key: string]: number} = {
            'Equity Index': 0.25,
            'Crypto': 5.0,
            'Commodity': 0.10,
            'Energy': 0.01,
            'Rates': 0.015625,
            'FX': 0.0001
        };
        return tickSizes[sector] || 0.01;
    }

    private getTickValue(sector: string): number {
        const tickValues: {[key: string]: number} = {
            'Equity Index': 12.50,
            'Crypto': 25.00,
            'Commodity': 10.00,
            'Energy': 10.00,
            'Rates': 15.625,
            'FX': 12.50
        };
        return tickValues[sector] || 10.00;
    }

    private getTradingHours(sector: string): string {
        const tradingHours: {[key: string]: string} = {
            'Equity Index': 'Sun-Fri 6:00 PM - 5:00 PM ET (next day)',
            'Crypto': 'Sun-Fri 6:00 PM - 5:00 PM ET (next day)',
            'Commodity': 'Sun-Fri 6:00 PM - 5:00 PM ET (next day)',
            'Energy': 'Sun-Fri 6:00 PM - 5:00 PM ET (next day)',
            'Rates': 'Sun-Fri 5:00 PM - 4:00 PM ET (next day)',
            'FX': 'Sun-Fri 5:00 PM - 4:00 PM ET (next day)'
        };
        return tradingHours[sector] || 'Standard CME hours';
    }

    private getMarginRequirement(sector: string): number {
        const margins: {[key: string]: number} = {
            'Equity Index': 5000,
            'Crypto': 10000,
            'Commodity': 3000,
            'Energy': 4000,
            'Rates': 2000,
            'FX': 2500
        };
        return margins[sector] || 3000;
    }

    private getMonthName(monthCode: string): string {
        const months: {[key: string]: string} = {
            'F': 'January', 'G': 'February', 'H': 'March',
            'J': 'April', 'K': 'May', 'M': 'June',
            'N': 'July', 'Q': 'August', 'U': 'September',
            'V': 'October', 'X': 'November', 'Z': 'December'
        };
        return months[monthCode] || 'Unknown';
    }

    private analyzeOpenInterest(symbol: string): string {
        // This would analyze open interest trends
        // For now, return a placeholder
        return 'Stable';
    }

    private analyzeVolumePattern(symbol: string): string {
        // This would analyze volume patterns
        // For now, return a placeholder
        return 'Normal trading volume';
    }

    private checkRollover(symbol: string): string | undefined {
        const cmeSymbol = this.cmeSymbols.get(symbol);
        if (!cmeSymbol) return undefined;

        // Check if contract is near expiration
        const now = new Date();
        const expYear = parseInt(cmeSymbol.year);
        const expMonth = this.getMonthNumber(cmeSymbol.contractMonth);

        const expDate = new Date(expYear, expMonth, 1);
        const monthsToExpiry = (expDate.getFullYear() - now.getFullYear()) * 12 +
                              (expDate.getMonth() - now.getMonth());

        if (monthsToExpiry <= 1) {
            return `Contract expiring soon (${monthsToExpiry} months). Consider rolling to next contract.`;
        }

        return undefined;
    }

    private getMonthNumber(monthCode: string): number {
        const months: {[key: string]: number} = {
            'F': 0, 'G': 1, 'H': 2,
            'J': 3, 'K': 4, 'M': 5,
            'N': 6, 'Q': 7, 'U': 8,
            'V': 9, 'X': 10, 'Z': 11
        };
        return months[monthCode] || 0;
    }
}

// Export for usage
export default CMEDataConsumer;