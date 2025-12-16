# 📊 SierraChart Data Consumption Guide

## 🎯 Overview

This guide provides a complete framework for accessing and consuming SierraChart data from `.scid` (intraday) and `.dly` (daily) files. This approach bypasses DTC protocol restrictions and provides direct access to SierraChart's data files.

## 🚀 Quick Start

### 1. Installation

The data consumer is already integrated in your project at:

```
src/backend/sierrachart/SierraChartDataConsumer.ts
```

### 2. Basic Usage

```typescript
import { SierraChartDataConsumer } from './SierraChartDataConsumer';

// Create consumer instance
const dataConsumer = new SierraChartDataConsumer('C:/SierraChart/Data/');

// Get available symbols
const symbols = dataConsumer.getAvailableSymbols();

// Read tick data
const ticks = dataConsumer.readLastTicks('BTCUSDT_PERP_BINANCE', 10);

// Read daily data
const dailyBars = dataConsumer.readLastDailyBars('AAPL', 30);

// Get analysis
const analysis = dataConsumer.analyzeSymbol('XAUUSD');
```

## 📂 File Structure

```
src/backend/sierrachart/
├── SierraChartDataConsumer.ts    # Main data consumer class
├── data_consumer_example.ts      # Comprehensive usage example
└── types.ts                      # Type definitions
```

## 🔧 Configuration

### Data Path

The consumer uses the standard SierraChart data directory:

```
C:/SierraChart/Data/
```

### File Types Supported

- **`.scid` files**: Intraday tick data (40 bytes per record)
- **`.dly` files**: Daily bar data (32 bytes per record)

## 📊 Core Features

### 1. Symbol Discovery

```typescript
// Get all available symbols
const allSymbols = dataConsumer.getAvailableSymbols();

// Get only active (recently updated) symbols
const activeSymbols = dataConsumer.getActiveSymbols();

// Get specific symbol info
const symbolInfo = dataConsumer.getSymbolInfo('BTCUSDT_PERP_BINANCE');
```

### 2. Data Reading

#### Intraday Tick Data

```typescript
// Read last N ticks
const ticks = dataConsumer.readLastTicks('BTCUSDT_PERP_BINANCE', 10);

// Tick data structure
interface TickData {
  dateTime: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  numTrades: number;
  bidVolume: number;
  askVolume: number;
  isRecent: boolean; // Updated in last 5 minutes
}
```

#### Daily Bar Data

```typescript
// Read last N daily bars
const dailyBars = dataConsumer.readLastDailyBars('AAPL', 30);

// Daily data structure
interface DailyData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  openInterest?: number;
}
```

### 3. Data Analysis

```typescript
// Comprehensive symbol analysis
const analysis = dataConsumer.analyzeSymbol('XAUUSD');

// Analysis includes:
interface DataAnalysis {
  symbol: string;
  timeRange: string; // "MM/DD/YYYY HH:MM - MM/DD/YYYY HH:MM"
  priceRange: string; // "min - max (current)"
  volumeStats: string; // "Total: X, Avg: Y, Max: Z"
  volatility: number; // Annualized volatility %
  trend: string; // "Strong Uptrend", "Uptrend", "Neutral", etc.
}
```

### 4. Real-time Monitoring

```typescript
// Start monitoring symbols for updates
dataConsumer.startMonitoring(['BTCUSDT_PERP_BINANCE', 'AAPL'], 3000);

// Listen for updates
dataConsumer.on('symbolUpdated', (symbol: string) => {
  console.log(`${symbol} has new data!`);
  const analysis = dataConsumer.analyzeSymbol(symbol);
  // Handle update...
});
```

## 📈 Advanced Usage Examples

### Example 1: Real-time Price Monitoring

```typescript
const dataConsumer = new SierraChartDataConsumer();

// Monitor BTC price
setInterval(() => {
  const ticks = dataConsumer.readLastTicks('BTCUSDT_PERP_BINANCE', 1);
  if (ticks && ticks.length > 0) {
    const latest = ticks[0];
    console.log(`BTC: $${latest.close} | Vol: ${latest.volume}`);
  }
}, 1000);
```

### Example 2: Volatility Analysis

```typescript
const symbols = ['BTCUSDT_PERP_BINANCE', 'AAPL', 'XAUUSD'];

symbols.forEach(symbol => {
  const analysis = dataConsumer.analyzeSymbol(symbol);
  if (analysis) {
    console.log(`${symbol}: ${analysis.trend} | Volatility: ${analysis.volatility.toFixed(2)}%`);
  }
});
```

### Example 3: Volume Analysis

```typescript
const ticks = dataConsumer.readLastTicks('AAPL', 100);
if (ticks) {
  const totalVolume = ticks.reduce((sum, tick) => sum + tick.volume, 0);
  const avgVolume = totalVolume / ticks.length;
  console.log(`AAPL - Avg Volume: ${avgVolume.toFixed(0)} shares per tick`);
}
```

## 🔍 Technical Details

### File Format Specifications

#### SCID File Format (Intraday)

- **Header**: 56 bytes
- **Record Size**: 40 bytes per tick
- **Record Structure**:
  - 8 bytes: SCDateTime (double)
  - 4 bytes: Open (float)
  - 4 bytes: High (float)
  - 4 bytes: Low (float)
  - 4 bytes: Close (float)
  - 4 bytes: NumTrades (uint32)
  - 4 bytes: Volume (uint32)
  - 4 bytes: BidVolume (uint32)
  - 4 bytes: AskVolume (uint32)

#### DLY File Format (Daily)

- **Header**: 56 bytes
- **Record Size**: 32 bytes per day
- **Record Structure**:
  - 8 bytes: SCDateTime (double)
  - 4 bytes: Open (float)
  - 4 bytes: High (float)
  - 4 bytes: Low (float)
  - 4 bytes: Close (float)
  - 4 bytes: Volume (float)
  - 4 bytes: OpenInterest (float)
  - 4 bytes: Padding

### SCDateTime Conversion

SierraChart uses OLE Automation date format:

- Days since 1899-12-30
- Fractional part represents time of day

## 🎯 Best Practices

### 1. Performance Optimization

```typescript
// Cache symbol info to avoid repeated file stats
const symbolInfo = dataConsumer.getSymbolInfo('BTCUSDT_PERP_BINANCE');
if (symbolInfo && symbolInfo.isActive) {
  // Only read data from active symbols
  const ticks = dataConsumer.readLastTicks('BTCUSDT_PERP_BINANCE', 10);
}
```

### 2. Error Handling

```typescript
try {
  const ticks = dataConsumer.readLastTicks('INVALID_SYMBOL', 10);
  if (!ticks) {
    console.warn('Symbol not found or no data available');
  }
} catch (error) {
  console.error('Error reading data:', error);
}
```

### 3. Memory Management

```typescript
// For large datasets, process in batches
const batchSize = 1000;
let offset = 0;

while (offset < totalRecords) {
  const batch = readRecords(symbol, batchSize, offset);
  processBatch(batch);
  offset += batchSize;
}
```

## 🚨 Troubleshooting

### Common Issues

**Issue: "File not found"**

- Verify SierraChart is running
- Check data directory path
- Ensure symbols are correctly spelled

**Issue: "No data available"**

- Symbol may not be active
- Check if chart is open in SierraChart
- Verify file has data (size > 56 bytes)

**Issue: "Permission denied"**

- Run application as administrator
- Check file permissions
- Ensure SierraChart isn't locking files

## 📊 Integration with Existing System

### Using with DTC Protocol

```typescript
// Combine file reading with DTC for complete solution
import { SierraChartService } from './SierraChartService';
import { SierraChartDataConsumer } from './SierraChartDataConsumer';

// Real-time via DTC
const dtcService = new SierraChartService(config);
dtcService.connect();

// Historical via files
const fileConsumer = new SierraChartDataConsumer();
const historicalData = fileConsumer.readLastDailyBars('AAPL', 90);
```

### Event Integration

```typescript
// Forward file updates to your event system
dataConsumer.on('symbolUpdated', symbol => {
  eventBus.emit('marketDataUpdate', {
    symbol,
    data: dataConsumer.readLastTicks(symbol, 1),
  });
});
```

## 🎓 Advanced Topics

### Custom Analysis

Extend the `DataAnalysis` interface and override analysis methods:

```typescript
class CustomDataConsumer extends SierraChartDataConsumer {
  analyzeSymbol(symbol: string): CustomAnalysis {
    const baseAnalysis = super.analyzeSymbol(symbol);
    return {
      ...baseAnalysis,
      customMetric: this.calculateCustomMetric(symbol),
    };
  }
}
```

### Data Export

```typescript
// Export data to CSV
function exportToCSV(symbol: string, count: number): string {
  const ticks = dataConsumer.readLastTicks(symbol, count);
  if (!ticks) return '';

  return ticks
    .map(
      tick =>
        `${tick.dateTime.toISOString()},${tick.open},${tick.high},${tick.low},${tick.close},${tick.volume}`
    )
    .join('\n');
}
```

## 📚 API Reference

### SierraChartDataConsumer Class

#### Constructor

```typescript
new SierraChartDataConsumer(dataPath?: string)
```

#### Methods

```typescript
// Symbol management
getAvailableSymbols(): SymbolInfo[]
getActiveSymbols(): SymbolInfo[]
getSymbolInfo(symbol: string): SymbolInfo | null

// Data reading
readLastTicks(symbol: string, count: number = 10): TickData[] | null
readLastDailyBars(symbol: string, count: number = 30): DailyData[] | null

// Analysis
analyzeSymbol(symbol: string): DataAnalysis | null

// Monitoring
startMonitoring(symbols: string[], interval: number = 5000): void
```

#### Events

```typescript
// Error handling
dataConsumer.on('error', (error: Error) => {});

// Symbol updates
dataConsumer.on('symbolUpdated', (symbol: string) => {});

// Monitoring control
dataConsumer.on('monitoringStarted', (intervalId: NodeJS.Timeout) => {});
```

## 🎯 Conclusion

This comprehensive data consumption framework provides:

✅ **Direct file access** - No DTC protocol limitations
✅ **Real-time monitoring** - Detects file updates instantly
✅ **Comprehensive analysis** - Built-in metrics and indicators
✅ **Flexible integration** - Works with existing DTC infrastructure
✅ **Performance optimized** - Efficient file reading and caching

The system is ready to use with your existing SierraChart installation and provides a robust foundation for building trading algorithms, analytics, and monitoring systems.
