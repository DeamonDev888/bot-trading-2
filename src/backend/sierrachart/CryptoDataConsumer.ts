/**
 * 🪙 Crypto-Specific Data Consumer
 *
 * Specialized consumer for cryptocurrency symbols from SierraChart
 * Focuses on Bitcoin, Ethereum, Solana, and other major cryptocurrencies
 */

import { SierraChartDataConsumer, TickData, DailyData, SymbolInfo, DataAnalysis } from './SierraChartDataConsumer';

export interface CryptoSymbolInfo extends SymbolInfo {
    symbol: string;
    cryptoType: 'Bitcoin' | 'Ethereum' | 'Solana' | 'Altcoin' | 'Stablecoin' | 'Exchange';
    exchange: string;
    contractType: 'Perpetual' | 'Futures' | 'Spot';
    baseCurrency: string;
    quoteCurrency: string;
    tickSize: number;
    tickValue: number;
    tradingHours: string;
    isLeveraged: boolean;
    leverage?: number;
}

export interface CryptoAnalysis extends DataAnalysis {
    volatilityScore: number;
    liquidityScore: number;
    correlationAnalysis: string;
    fundingRate?: number;
    openInterestTrend: string;
    volumeAnalysis: string;
    exchangeSpecifics: string;
}

export class CryptoDataConsumer extends SierraChartDataConsumer {
    private cryptoSymbols: Map<string, CryptoSymbolInfo> = new Map();
    private cryptoTypes: Set<string> = new Set();

    constructor(dataPath: string = 'C:/SierraChart/Data/') {
        super(dataPath);
        this.initializeCryptoSymbols();
    }

    /**
     * Initialize crypto-specific symbol information
     */
    private initializeCryptoSymbols(): void {
        // Crypto Symbol Patterns - Based on actual data analysis
        const cryptoPatterns = [
            // Bitcoin patterns
            { pattern: /BTCUSDT_PERP_BINANCE/, type: 'Bitcoin', exchange: 'Binance', contractType: 'Perpetual', base: 'BTC', quote: 'USDT' },
            { pattern: /BTCUSD_PERP_BINANCE/, type: 'Bitcoin', exchange: 'Binance', contractType: 'Perpetual', base: 'BTC', quote: 'USD' },
            { pattern: /BTC.*PERP.*/, type: 'Bitcoin', exchange: 'Various', contractType: 'Perpetual', base: 'BTC', quote: 'USD/USDT' },
            { pattern: /BTC.*FUT.*/, type: 'Bitcoin', exchange: 'Various', contractType: 'Futures', base: 'BTC', quote: 'USD' },

            // Ethereum patterns (to be added when found)
            { pattern: /ETHUSDT_PERP.*/, type: 'Ethereum', exchange: 'Various', contractType: 'Perpetual', base: 'ETH', quote: 'USDT' },
            { pattern: /ETHUSD_PERP.*/, type: 'Ethereum', exchange: 'Various', contractType: 'Perpetual', base: 'ETH', quote: 'USD' },
            { pattern: /ETH.*PERP.*/, type: 'Ethereum', exchange: 'Various', contractType: 'Perpetual', base: 'ETH', quote: 'USD/USDT' },

            // Solana patterns (to be added when found)
            { pattern: /SOLUSDT_PERP.*/, type: 'Solana', exchange: 'Various', contractType: 'Perpetual', base: 'SOL', quote: 'USDT' },
            { pattern: /SOLUSD_PERP.*/, type: 'Solana', exchange: 'Various', contractType: 'Perpetual', base: 'SOL', quote: 'USD' },
            { pattern: /SOL.*PERP.*/, type: 'Solana', exchange: 'Various', contractType: 'Perpetual', base: 'SOL', quote: 'USD/USDT' },

            // Other major cryptos
            { pattern: /XRP.*PERP.*/, type: 'Altcoin', exchange: 'Various', contractType: 'Perpetual', base: 'XRP', quote: 'USD/USDT' },
            { pattern: /ADA.*PERP.*/, type: 'Altcoin', exchange: 'Various', contractType: 'Perpetual', base: 'ADA', quote: 'USD/USDT' },
            { pattern: /DOGE.*PERP.*/, type: 'Altcoin', exchange: 'Various', contractType: 'Perpetual', base: 'DOGE', quote: 'USD/USDT' },
            { pattern: /DOT.*PERP.*/, type: 'Altcoin', exchange: 'Various', contractType: 'Perpetual', base: 'DOT', quote: 'USD/USDT' },
            { pattern: /LTC.*PERP.*/, type: 'Altcoin', exchange: 'Various', contractType: 'Perpetual', base: 'LTC', quote: 'USD/USDT' },

            // Stablecoins
            { pattern: /USDT.*/, type: 'Stablecoin', exchange: 'Various', contractType: 'Spot', base: 'USDT', quote: 'USD' },
            { pattern: /USDC.*/, type: 'Stablecoin', exchange: 'Various', contractType: 'Spot', base: 'USDC', quote: 'USD' },

            // General crypto patterns
            { pattern: /.*PERP.*/, type: 'Altcoin', exchange: 'Various', contractType: 'Perpetual', base: 'VARIOUS', quote: 'USD/USDT' },
            { pattern: /.*BINANCE.*/, type: 'Exchange', exchange: 'Binance', contractType: 'Perpetual', base: 'VARIOUS', quote: 'USD/USDT' }
        ];

        // Get all symbols from parent class
        const allSymbols = this.getAvailableSymbols();

        // Filter and categorize crypto symbols
        allSymbols.forEach(symbolInfo => {
            for (const pattern of cryptoPatterns) {
                if (pattern.pattern.test(symbolInfo.symbol)) {
                    const cryptoSymbol: CryptoSymbolInfo = {
                        ...symbolInfo,
                        cryptoType: pattern.type as 'Bitcoin' | 'Ethereum' | 'Solana' | 'Altcoin' | 'Stablecoin' | 'Exchange',
                        exchange: pattern.exchange,
                        contractType: pattern.contractType as 'Perpetual' | 'Futures' | 'Spot',
                        baseCurrency: pattern.base,
                        quoteCurrency: pattern.quote,
                        tickSize: this.getCryptoTickSize(pattern.type),
                        tickValue: this.getCryptoTickValue(pattern.type),
                        tradingHours: '24/7 (Crypto markets)',
                        isLeveraged: pattern.contractType === 'Perpetual' || pattern.contractType === 'Futures',
                        leverage: pattern.contractType === 'Perpetual' ? 10 : undefined
                    };

                    this.cryptoSymbols.set(symbolInfo.symbol, cryptoSymbol);
                    this.cryptoTypes.add(pattern.type);
                    break;
                }
            }
        });

        console.log(`🪙 Crypto Data Consumer initialized with ${this.cryptoSymbols.size} crypto symbols`);
    }

    /**
     * Get all crypto symbols
     */
    public getCryptoSymbols(): CryptoSymbolInfo[] {
        return Array.from(this.cryptoSymbols.values());
    }

    /**
     * Get crypto symbols by type
     */
    public getCryptoSymbolsByType(type: string): CryptoSymbolInfo[] {
        return Array.from(this.cryptoSymbols.values())
            .filter(symbol => symbol.cryptoType === type);
    }

    /**
     * Get available crypto types
     */
    public getAvailableCryptoTypes(): string[] {
        return Array.from(this.cryptoTypes.values());
    }

    /**
     * Get active crypto symbols (recently updated)
     */
    public getActiveCryptoSymbols(): CryptoSymbolInfo[] {
        return Array.from(this.cryptoSymbols.values())
            .filter(symbol => symbol.isActive)
            .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    }

    /**
     * Get crypto-specific analysis
     */
    public analyzeCryptoSymbol(symbol: string): CryptoAnalysis | null {
        const baseAnalysis = super.analyzeSymbol(symbol);
        if (!baseAnalysis) return null;

        const cryptoSymbol = this.cryptoSymbols.get(symbol);
        if (!cryptoSymbol) return null;

        // Get additional crypto-specific metrics
        const volatilityScore = this.calculateVolatilityScore(symbol);
        const liquidityScore = this.calculateLiquidityScore(symbol);
        const correlationAnalysis = this.analyzeCorrelation(symbol);
        const fundingRate = this.getFundingRate(symbol);
        const openInterestTrend = this.analyzeOpenInterest(symbol);
        const volumeAnalysis = this.analyzeVolumePattern(symbol);
        const exchangeSpecifics = this.getExchangeSpecifics(symbol);

        const cryptoAnalysis: CryptoAnalysis = {
            ...baseAnalysis,
            volatilityScore,
            liquidityScore,
            correlationAnalysis,
            fundingRate,
            openInterestTrend,
            volumeAnalysis,
            exchangeSpecifics
        };

        return cryptoAnalysis;
    }

    /**
     * Get crypto symbol info with contract details
     */
    public getCryptoSymbolInfo(symbol: string): CryptoSymbolInfo | null {
        return this.cryptoSymbols.get(symbol) || null;
    }

    // ==================== PRIVATE METHODS ====================

    private getCryptoTickSize(cryptoType: string): number {
        const tickSizes: {[key: string]: number} = {
            'Bitcoin': 0.10,
            'Ethereum': 0.01,
            'Solana': 0.001,
            'Altcoin': 0.0001,
            'Stablecoin': 0.0001,
            'Exchange': 0.01
        };
        return tickSizes[cryptoType] || 0.0001;
    }

    private getCryptoTickValue(cryptoType: string): number {
        const tickValues: {[key: string]: number} = {
            'Bitcoin': 1.00,
            'Ethereum': 0.10,
            'Solana': 0.01,
            'Altcoin': 0.01,
            'Stablecoin': 0.01,
            'Exchange': 0.10
        };
        return tickValues[cryptoType] || 0.01;
    }

    private calculateVolatilityScore(symbol: string): number {
        // This would calculate a volatility score (0-100)
        // For now, return a placeholder based on crypto type
        const cryptoSymbol = this.cryptoSymbols.get(symbol);
        if (!cryptoSymbol) return 50;

        const volatilityScores: {[key: string]: number} = {
            'Bitcoin': 75,
            'Ethereum': 85,
            'Solana': 90,
            'Altcoin': 80,
            'Stablecoin': 10,
            'Exchange': 60
        };

        return volatilityScores[cryptoSymbol.cryptoType] || 50;
    }

    private calculateLiquidityScore(symbol: string): number {
        // This would calculate a liquidity score (0-100)
        // For now, return a placeholder
        const cryptoSymbol = this.cryptoSymbols.get(symbol);
        if (!cryptoSymbol) return 50;

        const liquidityScores: {[key: string]: number} = {
            'Bitcoin': 95,
            'Ethereum': 90,
            'Solana': 75,
            'Altcoin': 60,
            'Stablecoin': 99,
            'Exchange': 80
        };

        return liquidityScores[cryptoSymbol.cryptoType] || 50;
    }

    private analyzeCorrelation(symbol: string): string {
        // This would analyze correlation with other assets
        // For now, return a placeholder
        const cryptoSymbol = this.cryptoSymbols.get(symbol);
        if (!cryptoSymbol) return 'Unknown';

        if (cryptoSymbol.cryptoType === 'Bitcoin') {
            return 'High correlation with tech stocks, moderate with gold';
        } else if (cryptoSymbol.cryptoType === 'Ethereum') {
            return 'High correlation with Bitcoin, strong with DeFi tokens';
        } else if (cryptoSymbol.cryptoType === 'Solana') {
            return 'Moderate correlation with Ethereum, high with DeFi/SOL ecosystem';
        } else {
            return 'Varies by altcoin, generally follows Bitcoin trend';
        }
    }

    private getFundingRate(symbol: string): number | undefined {
        // This would get current funding rate for perpetual contracts
        // For now, return a placeholder
        const cryptoSymbol = this.cryptoSymbols.get(symbol);
        if (!cryptoSymbol || cryptoSymbol.contractType !== 'Perpetual') return undefined;

        // Typical funding rates
        if (cryptoSymbol.cryptoType === 'Bitcoin') return 0.01; // 0.01%
        if (cryptoSymbol.cryptoType === 'Ethereum') return 0.015; // 0.015%
        return 0.02; // 0.02% for altcoins
    }

    private analyzeOpenInterest(symbol: string): string {
        // This would analyze open interest trends
        // For now, return a placeholder
        return 'Stable';
    }

    private analyzeVolumePattern(symbol: string): string {
        // This would analyze volume patterns
        // For now, return a placeholder
        const cryptoSymbol = this.cryptoSymbols.get(symbol);
        if (!cryptoSymbol) return 'Normal';

        if (cryptoSymbol.cryptoType === 'Bitcoin') {
            return 'High volume, 24/7 trading pattern';
        } else if (cryptoSymbol.cryptoType === 'Ethereum') {
            return 'High volume, follows Bitcoin volume trends';
        } else {
            return 'Moderate volume, altcoin trading patterns';
        }
    }

    private getExchangeSpecifics(symbol: string): string {
        // This would get exchange-specific information
        // For now, return a placeholder
        const cryptoSymbol = this.cryptoSymbols.get(symbol);
        if (!cryptoSymbol) return 'Unknown exchange';

        if (cryptoSymbol.exchange === 'Binance') {
            return 'Binance Perpetual Contract - Up to 125x leverage, USDT-margined';
        } else if (cryptoSymbol.contractType === 'Perpetual') {
            return 'Perpetual Contract - No expiration, funding rate every 8h';
        } else {
            return 'Spot/Futures Contract - Exchange: ' + cryptoSymbol.exchange;
        }
    }
}

// Export for usage
export default CryptoDataConsumer;