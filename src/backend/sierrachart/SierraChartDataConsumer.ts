/**
 * 📊 SierraChart Data Consumer - Complete Framework
 *
 * Advanced data consumption framework for SierraChart .scid and .dly files
 * Provides real-time and historical data access with comprehensive analysis tools
 */

import { existsSync, statSync, openSync, readSync, closeSync, readdirSync } from 'fs';
import { join } from 'path';
import { EventEmitter } from 'events';

export interface TickData {
    dateTime: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    numTrades: number;
    bidVolume: number;
    askVolume: number;
    isRecent: boolean;
}

export interface DailyData {
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    openInterest?: number;
}

export interface SymbolInfo {
    symbol: string;
    filePath: string;
    fileSize: number;
    totalRecords: number;
    lastModified: Date;
    lastUpdateAgeSeconds: number;
    isActive: boolean;
    dataType: 'intraday' | 'daily';
}

export interface DataAnalysis {
    symbol: string;
    timeRange: string;
    priceRange: string;
    volumeStats: string;
    volatility: number;
    trend: string;
}

export class SierraChartDataConsumer extends EventEmitter {
    private dataPath: string;
    private symbolCache: Map<string, SymbolInfo> = new Map();
    private analysisCache: Map<string, DataAnalysis> = new Map();

    constructor(dataPath: string = 'C:/SierraChart/Data/') {
        super();
        this.dataPath = dataPath;
        this.scanDataDirectory();
    }

    /**
     * Scan the SierraChart data directory and cache symbol information
     */
    public scanDataDirectory(): void {
        console.log(`🔍 Scanning SierraChart data directory: ${this.dataPath}`);

        try {
            const files = readdirSync(this.dataPath);
            const scidFiles = files.filter(f => f.endsWith('.scid'));
            const dlyFiles = files.filter(f => f.endsWith('.dly'));

            console.log(`📊 Found ${scidFiles.length} .scid files and ${dlyFiles.length} .dly files`);

            // Process .scid files (intraday data)
            scidFiles.forEach(file => {
                const symbol = file.replace('.scid', '');
                const filePath = join(this.dataPath, file);
                const stats = statSync(filePath);

                const symbolInfo: SymbolInfo = {
                    symbol,
                    filePath,
                    fileSize: stats.size,
                    totalRecords: this.calculateScidRecords(stats.size),
                    lastModified: stats.mtime,
                    lastUpdateAgeSeconds: Math.floor((Date.now() - stats.mtime.getTime()) / 1000),
                    isActive: (Date.now() - stats.mtime.getTime()) < 300000, // Updated in last 5 minutes
                    dataType: 'intraday'
                };

                this.symbolCache.set(symbol, symbolInfo);
            });

            // Process .dly files (daily data)
            dlyFiles.forEach(file => {
                const symbol = file.replace('.dly', '');
                const filePath = join(this.dataPath, file);
                const stats = statSync(filePath);

                const symbolInfo: SymbolInfo = {
                    symbol,
                    filePath,
                    fileSize: stats.size,
                    totalRecords: this.calculateDlyRecords(stats.size),
                    lastModified: stats.mtime,
                    lastUpdateAgeSeconds: Math.floor((Date.now() - stats.mtime.getTime()) / 1000),
                    isActive: (Date.now() - stats.mtime.getTime()) < 86400000, // Updated in last 24 hours
                    dataType: 'daily'
                };

                this.symbolCache.set(symbol, symbolInfo);
            });

            console.log(`✅ Cached information for ${this.symbolCache.size} symbols`);

        } catch (error) {
            console.error(`❌ Error scanning data directory: ${(error as Error).message}`);
            this.emit('error', error);
        }
    }

    /**
     * Get all available symbols with their information
     */
    public getAvailableSymbols(): SymbolInfo[] {
        return Array.from(this.symbolCache.values());
    }

    /**
     * Get active symbols (recently updated)
     */
    public getActiveSymbols(): SymbolInfo[] {
        return Array.from(this.symbolCache.values())
            .filter(symbol => symbol.isActive)
            .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    }

    /**
     * Get symbol information by name
     */
    public getSymbolInfo(symbol: string): SymbolInfo | null {
        return this.symbolCache.get(symbol) || null;
    }

    /**
     * Read last N ticks from .scid file
     */
    public readLastTicks(symbol: string, count: number = 10): TickData[] | null {
        const symbolInfo = this.getSymbolInfo(symbol);
        if (!symbolInfo || symbolInfo.dataType !== 'intraday') {
            console.warn(`⚠️ Symbol ${symbol} not found or not intraday data`);
            return null;
        }

        try {
            const stats = statSync(symbolInfo.filePath);
            const totalRecords = this.calculateScidRecords(stats.size);
            const recordsToRead = Math.min(count, totalRecords);
            const startRecord = totalRecords - recordsToRead;

            if (recordsToRead <= 0) {
                return [];
            }

            const fd = openSync(symbolInfo.filePath, 'r');
            const buffer = Buffer.alloc(recordsToRead * 40); // 40 bytes per record
            const offset = 56 + startRecord * 40; // Skip 56-byte header

            readSync(fd, buffer, 0, recordsToRead * 40, offset);
            closeSync(fd);

            const ticks: TickData[] = [];
            for (let i = 0; i < recordsToRead; i++) {
                const recordBuffer = buffer.slice(i * 40, (i + 1) * 40);
                const tick = this.parseScidRecord(recordBuffer);
                ticks.push(tick);
            }

            return ticks;

        } catch (error) {
            console.error(`❌ Error reading ticks for ${symbol}: ${(error as Error).message}`);
            this.emit('error', error);
            return null;
        }
    }

    /**
     * Read last N daily bars from .dly file
     */
    public readLastDailyBars(symbol: string, count: number = 30): DailyData[] | null {
        const symbolInfo = this.getSymbolInfo(symbol);
        if (!symbolInfo || symbolInfo.dataType !== 'daily') {
            console.warn(`⚠️ Symbol ${symbol} not found or not daily data`);
            return null;
        }

        try {
            const stats = statSync(symbolInfo.filePath);
            const totalRecords = this.calculateDlyRecords(stats.size);
            const recordsToRead = Math.min(count, totalRecords);
            const startRecord = totalRecords - recordsToRead;

            if (recordsToRead <= 0) {
                return [];
            }

            const fd = openSync(symbolInfo.filePath, 'r');
            const buffer = Buffer.alloc(recordsToRead * 32); // 32 bytes per daily record
            const offset = 56 + startRecord * 32; // Skip 56-byte header

            readSync(fd, buffer, 0, recordsToRead * 32, offset);
            closeSync(fd);

            const dailyBars: DailyData[] = [];
            for (let i = 0; i < recordsToRead; i++) {
                const recordBuffer = buffer.slice(i * 32, (i + 1) * 32);
                const dailyBar = this.parseDlyRecord(recordBuffer);
                dailyBars.push(dailyBar);
            }

            return dailyBars;

        } catch (error) {
            console.error(`❌ Error reading daily bars for ${symbol}: ${(error as Error).message}`);
            this.emit('error', error);
            return null;
        }
    }

    /**
     * Get comprehensive analysis for a symbol
     */
    public analyzeSymbol(symbol: string): DataAnalysis | null {
        const cacheKey = `analysis_${symbol}`;
        const cachedAnalysis = this.analysisCache.get(cacheKey);

        if (cachedAnalysis) {
            return cachedAnalysis;
        }

        const symbolInfo = this.getSymbolInfo(symbol);
        if (!symbolInfo) {
            return null;
        }

        try {
            let ticks: TickData[] = [];
            let dailyBars: DailyData[] = [];

            if (symbolInfo.dataType === 'intraday') {
                ticks = this.readLastTicks(symbol, 100) || [];
            } else {
                dailyBars = this.readLastDailyBars(symbol, 90) || [];
            }

            const analysis: DataAnalysis = {
                symbol: symbol,
                timeRange: this.calculateTimeRange(symbolInfo.dataType === 'intraday' ? ticks : dailyBars),
                priceRange: this.calculatePriceRange(symbolInfo.dataType === 'intraday' ? ticks : dailyBars),
                volumeStats: this.calculateVolumeStats(symbolInfo.dataType === 'intraday' ? ticks : dailyBars),
                volatility: this.calculateVolatility(symbolInfo.dataType === 'intraday' ? ticks : dailyBars),
                trend: this.determineTrend(symbolInfo.dataType === 'intraday' ? ticks : dailyBars)
            };

            this.analysisCache.set(cacheKey, analysis);
            return analysis;

        } catch (error) {
            console.error(`❌ Error analyzing ${symbol}: ${(error as Error).message}`);
            this.emit('error', error);
            return null;
        }
    }

    /**
     * Monitor symbols for real-time updates
     */
    public startMonitoring(symbols: string[], interval: number = 5000): void {
        console.log(`👁️ Starting monitoring for ${symbols.length} symbols`);

        const monitorInterval = setInterval(() => {
            symbols.forEach(symbol => {
                const symbolInfo = this.getSymbolInfo(symbol);
                if (symbolInfo) {
                    try {
                        const stats = statSync(symbolInfo.filePath);
                        const currentSize = stats.size;
                        const lastModified = stats.mtime;

                        // Check if file has been updated
                        if (lastModified > symbolInfo.lastModified) {
                            console.log(`📈 ${symbol} updated - ${currentSize} bytes`);

                            // Update cache
                            symbolInfo.fileSize = currentSize;
                            symbolInfo.lastModified = lastModified;
                            symbolInfo.lastUpdateAgeSeconds = 0;
                            symbolInfo.isActive = true;
                            symbolInfo.totalRecords = symbolInfo.dataType === 'intraday'
                                ? this.calculateScidRecords(currentSize)
                                : this.calculateDlyRecords(currentSize);

                            this.symbolCache.set(symbol, symbolInfo);
                            this.analysisCache.delete(`analysis_${symbol}`);

                            this.emit('symbolUpdated', symbol);
                        }
                    } catch (error) {
                        console.warn(`⚠️ Error monitoring ${symbol}: ${(error as Error).message}`);
                    }
                }
            });
        }, interval);

        // Store interval ID so it can be cleared later
        this.emit('monitoringStarted', monitorInterval);
    }

    // ==================== PRIVATE METHODS ====================

    private calculateScidRecords(fileSize: number): number {
        return Math.floor((fileSize - 56) / 40); // 56-byte header, 40 bytes per record
    }

    private calculateDlyRecords(fileSize: number): number {
        return Math.floor((fileSize - 56) / 32); // 56-byte header, 32 bytes per record
    }

    private parseScidRecord(buffer: Buffer): TickData {
        const dateTime = buffer.readDoubleLE(0);
        const open = buffer.readFloatLE(8);
        const high = buffer.readFloatLE(12);
        const low = buffer.readFloatLE(16);
        const close = buffer.readFloatLE(20);
        const numTrades = buffer.readUInt32LE(24);
        const volume = buffer.readUInt32LE(28);
        const bidVolume = buffer.readUInt32LE(32);
        const askVolume = buffer.readUInt32LE(36);

        // Convert SCDateTime to JavaScript Date
        const baseDate = new Date(1899, 11, 30);
        const days = Math.floor(dateTime);
        const fraction = dateTime - days;
        const ms = fraction * 24 * 60 * 60 * 1000;
        const jsDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000 + ms);

        return {
            dateTime: jsDate,
            open,
            high,
            low,
            close,
            volume,
            numTrades,
            bidVolume,
            askVolume,
            isRecent: (Date.now() - jsDate.getTime()) < 300000 // Last 5 minutes
        };
    }

    private parseDlyRecord(buffer: Buffer): DailyData {
        const dateTime = buffer.readDoubleLE(0);
        const open = buffer.readFloatLE(8);
        const high = buffer.readFloatLE(12);
        const low = buffer.readFloatLE(16);
        const close = buffer.readFloatLE(20);
        const volume = buffer.readFloatLE(24);
        const openInterest = buffer.readFloatLE(28);

        // Convert SCDateTime to JavaScript Date
        const baseDate = new Date(1899, 11, 30);
        const days = Math.floor(dateTime);
        const jsDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

        return {
            date: jsDate,
            open,
            high,
            low,
            close,
            volume,
            openInterest: openInterest > 0 ? openInterest : undefined
        };
    }

    private calculateTimeRange(data: (TickData | DailyData)[]): string {
        if (data.length === 0) return 'No data';

        const start = 'dateTime' in data[0] ? (data[0] as TickData).dateTime : (data[0] as DailyData).date;
        const end = 'dateTime' in data[data.length - 1] ? (data[data.length - 1] as TickData).dateTime : (data[data.length - 1] as DailyData).date;

        return `${start.toLocaleDateString()} ${start.toLocaleTimeString()} - ${end.toLocaleDateString()} ${end.toLocaleTimeString()}`;
    }

    private calculatePriceRange(data: (TickData | DailyData)[]): string {
        if (data.length === 0) return 'No data';

        const prices = data.map(item => 'close' in item ? item.close : (item as any).close);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const currentPrice = prices[prices.length - 1];

        return `${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)} (Current: ${currentPrice.toFixed(2)})`;
    }

    private calculateVolumeStats(data: (TickData | DailyData)[]): string {
        if (data.length === 0) return 'No data';

        const volumes = data.map(item => 'volume' in item ? item.volume : (item as any).volume);
        const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0);
        const avgVolume = totalVolume / volumes.length;
        const maxVolume = Math.max(...volumes);

        return `Total: ${totalVolume.toLocaleString()}, Avg: ${avgVolume.toLocaleString()}, Max: ${maxVolume.toLocaleString()}`;
    }

    private calculateVolatility(data: (TickData | DailyData)[]): number {
        if (data.length < 2) return 0;

        const prices = data.map(item => 'close' in item ? item.close : (item as any).close);
        const returns = [];

        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }

        const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;

        return Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility
    }

    private determineTrend(data: (TickData | DailyData)[]): string {
        if (data.length < 5) return 'Neutral';

        const prices = data.map(item => 'close' in item ? item.close : (item as any).close);
        const startPrice = prices[0];
        const endPrice = prices[prices.length - 1];
        const change = ((endPrice - startPrice) / startPrice) * 100;

        if (change > 2) return 'Strong Uptrend';
        if (change > 0.5) return 'Uptrend';
        if (change < -2) return 'Strong Downtrend';
        if (change < -0.5) return 'Downtrend';
        return 'Neutral';
    }
}

// Export for usage
export default SierraChartDataConsumer;