# 📊 CME Data Consumption Guide

## 🎯 CME-Specific SierraChart Integration

This guide provides comprehensive documentation for accessing and consuming **CME Group** data from SierraChart, focusing exclusively on CME futures, commodities, and equity index products.

## 🚀 Quick Start

### 1. Import CME Consumer

```typescript
import { CMEDataConsumer } from './CMEDataConsumer';

// Create CME-specific instance
const cmeConsumer = new CMEDataConsumer('C:/SierraChart/Data/');
```

### 2. Get CME Symbols

```typescript
// Get all CME symbols
const cmeSymbols = cmeConsumer.getCMESymbols();

// Get active CME symbols
const activeSymbols = cmeConsumer.getActiveCMESymbols();

// Get symbols by sector
const equityIndexSymbols = cmeConsumer.getCMESymbolsBySector('Equity Index');
```

### 3. Access CME Data

```typescript
// Read tick data from CME futures
const esTicks = cmeConsumer.readLastTicks('ESH25-CME', 10);

// Get CME-specific analysis
const analysis = cmeConsumer.analyzeCMESymbol('BTCF25-CME');

// Monitor CME symbols for updates
cmeConsumer.startMonitoring(['ESH25-CME', 'NQH25-CME', 'BTCF25-CME']);
```

## 📊 CME Product Categories

### Equity Index Futures

- **E-mini S&P 500 (ES)**: Most liquid equity index future
- **E-mini Nasdaq-100 (NQ)**: Tech-heavy index future
- **E-mini Dow Jones (YM)**: Blue-chip index future
- **E-mini Russell 2000 (RTY)**: Small-cap index future
- **Micro E-mini Series (MES, MNQ, MYM, M2K)**: Smaller contract sizes

### Cryptocurrency Futures

- **Bitcoin (BTC)**: CME Bitcoin futures
- **Ethereum (ETH)**: CME Ethereum futures

### Commodity Futures

- **Gold (GC)**: Precious metals
- **Silver (SI)**: Precious metals
- **Crude Oil (CL)**: Energy
- **Natural Gas (NG)**: Energy

### Interest Rate Futures

- **T-Bond (ZB)**: 30-year Treasury
- **10-Year T-Note (ZN)**: 10-year Treasury
- **5-Year T-Note (ZF)**: 5-year Treasury
- **2-Year T-Note (ZT)**: 2-year Treasury

### FX Futures

- **Euro FX (GE)**
- **Japanese Yen (JY)**
- **British Pound (BP)**
- **Canadian Dollar (CD)**
- **Australian Dollar (AD)**
- **Swiss Franc (SF)**

## 📈 CME Symbol Format

### Standard Format

```
[ROOT][MONTH][YEAR]-[EXCHANGE]
```

### Components

- **ROOT**: Product code (ES, NQ, BTC, GC, etc.)
- **MONTH**: Contract month code (F=Jan, G=Feb, H=Mar, etc.)
- **YEAR**: Last two digits of year (25=2025)
- **EXCHANGE**: Always "CME" for CME products

### Examples

- `ESH25-CME`: E-mini S&P 500 March 2025
- `NQM25-CME`: E-mini Nasdaq-100 June 2025
- `BTCF25-CME`: Bitcoin January 2025
- `GCJ25-CME`: Gold April 2025

## 🎯 CME-Specific Features

### 1. Contract Information

```typescript
const symbolInfo = cmeConsumer.getCMESymbolInfo('ESH25-CME');

/*
{
    symbol: 'ESH25-CME',
    contractMonth: 'H',      // March
    year: '2025',
    productType: 'Futures',
    sector: 'Equity Index',
    product: 'E-mini S&P 500',
    tickSize: 0.25,          // 0.25 index points
    tickValue: 12.50,        // $12.50 per tick
    tradingHours: 'Sun-Fri 6:00 PM - 5:00 PM ET',
    marginRequirement: 5000, // $5,000 initial margin
    fileSize: 12345678,      // File size in bytes
    totalRecords: 50000,     // Number of records
    lastModified: Date,      // Last update timestamp
    isActive: true           // Recently updated
}
*/
```

### 2. CME Analysis

```typescript
const analysis = cmeConsumer.analyzeCMESymbol('ESH25-CME');

/*
{
    symbol: 'ESH25-CME',
    timeRange: '2023-01-01 09:30 - 2023-12-07 16:00',
    priceRange: '3800.00 - 4200.00 (Current: 4150.50)',
    volumeStats: 'Total: 1,234,567, Avg: 12,345, Max: 50,000',
    volatility: 1.45,       // 1.45% annualized
    trend: 'Uptrend',
    openInterestTrend: 'Increasing',
    volumeAnalysis: 'Above average volume',
    contractExpiration: 'March 2025',
    rolloverRecommendation: 'Contract expiring soon. Consider rolling to June 2025.'
}
*/
```

### 3. Sector Analysis

```typescript
// Get all symbols in a sector
const cryptoSymbols = cmeConsumer.getCMESymbolsBySector('Crypto');

// Analyze sector performance
cryptoSymbols.forEach(symbol => {
  const analysis = cmeConsumer.analyzeCMESymbol(symbol.symbol);
  console.log(`${symbol.symbol}: ${analysis?.trend} | Vol: ${analysis?.volatility.toFixed(2)}%`);
});
```

## 📊 Real CME Symbols Available

Based on your SierraChart data, here are the **real CME symbols** currently available:

### Equity Index Futures

- `ESH25-CME` - E-mini S&P 500 March 2025
- `ESM25-CME` - E-mini S&P 500 June 2025
- `ESU25-CME` - E-mini S&P 500 September 2025
- `ESZ25-CME` - E-mini S&P 500 December 2025
- `NQH25-CME` - E-mini Nasdaq-100 March 2025
- `NQM25-CME` - E-mini Nasdaq-100 June 2025
- `YMH25-CME` - E-mini Dow Jones March 2025
- `RTYH25-CME` - E-mini Russell 2000 March 2025

### Cryptocurrency Futures

- `BTCF25-CME` - Bitcoin January 2025
- `BTCG25-CME` - Bitcoin February 2025
- `BTCH25-CME` - Bitcoin March 2025
- `BTCJ25-CME` - Bitcoin April 2025

### Commodity Futures

- `GCH25-CME` - Gold March 2025
- `GCJ25-CME` - Gold April 2025
- `SIM25-CME` - Silver June 2025
- `CLH25-CME` - Crude Oil March 2025
- `NGH25-CME` - Natural Gas March 2025

### Interest Rate Futures

- `ZBH25-CME` - T-Bond March 2025
- `ZNM25-CME` - 10-Year T-Note June 2025
- `ZFH25-CME` - 5-Year T-Note March 2025
- `ZTH25-CME` - 2-Year T-Note March 2025

### FX Futures

- `GEH25-CME` - Euro FX March 2025
- `JYH25-CME` - Japanese Yen March 2025
- `BPH25-CME` - British Pound March 2025

## 🎯 CME Contract Specifications

### E-mini S&P 500 (ES)

- **Contract Size**: $50 × S&P 500 Index
- **Tick Size**: 0.25 index points ($12.50 per tick)
- **Trading Hours**: Sun-Fri 6:00 PM - 5:00 PM ET
- **Margin**: ~$5,000 per contract
- **Expiration**: March, June, September, December

### E-mini Nasdaq-100 (NQ)

- **Contract Size**: $20 × Nasdaq-100 Index
- **Tick Size**: 0.25 index points ($5.00 per tick)
- **Trading Hours**: Sun-Fri 6:00 PM - 5:00 PM ET
- **Margin**: ~$5,000 per contract
- **Expiration**: March, June, September, December

### Bitcoin (BTC)

- **Contract Size**: 5 Bitcoin
- **Tick Size**: $5.00 per bitcoin ($25.00 per tick)
- **Trading Hours**: Sun-Fri 6:00 PM - 5:00 PM ET
- **Margin**: ~$10,000 per contract
- **Expiration**: Monthly contracts

### Gold (GC)

- **Contract Size**: 100 troy ounces
- **Tick Size**: $0.10 per troy ounce ($10.00 per tick)
- **Trading Hours**: Sun-Fri 6:00 PM - 5:00 PM ET
- **Margin**: ~$3,000 per contract
- **Expiration**: February, April, June, August, October, December

## 📈 Usage Examples

### Example 1: Monitor E-mini S&P 500

```typescript
// Monitor ES futures
const esSymbols = ['ESH25-CME', 'ESM25-CME', 'ESU25-CME'];

cmeConsumer.startMonitoring(esSymbols, 2000);

cmeConsumer.on('symbolUpdated', symbol => {
  if (symbol.startsWith('ES')) {
    const ticks = cmeConsumer.readLastTicks(symbol, 1);
    if (ticks) {
      const latest = ticks[0];
      console.log(`ES Update: ${symbol} @ ${latest.close} (Vol: ${latest.volume})`);
    }
  }
});
```

### Example 2: Crypto Futures Analysis

```typescript
// Analyze Bitcoin futures
const btcContracts = cmeConsumer.getCMESymbolsBySector('Crypto');

btcContracts.forEach(contract => {
  const analysis = cmeConsumer.analyzeCMESymbol(contract.symbol);
  if (analysis) {
    console.log(
      `${contract.symbol}: ${analysis.trend} | Volatility: ${analysis.volatility.toFixed(2)}%`
    );

    // Check for rollover recommendations
    if (analysis.rolloverRecommendation) {
      console.log(`   ⚠️  ${analysis.rolloverRecommendation}`);
    }
  }
});
```

### Example 3: Sector Performance Dashboard

```typescript
// Create sector performance dashboard
const sectors = cmeConsumer.getAvailableSectors();

sectors.forEach(sector => {
  const symbols = cmeConsumer.getCMESymbolsBySector(sector);
  const activeSymbols = symbols.filter(s => s.isActive);

  console.log(`${sector}: ${activeSymbols.length} active contracts`);

  // Get average volatility for sector
  const volatilities = activeSymbols
    .map(s => cmeConsumer.analyzeCMESymbol(s.symbol)?.volatility || 0)
    .filter(v => v > 0);

  const avgVolatility =
    volatilities.length > 0 ? volatilities.reduce((sum, v) => sum + v, 0) / volatilities.length : 0;

  console.log(`   Avg Volatility: ${avgVolatility.toFixed(2)}%`);
});
```

## 🔧 CME Data Access Methods

### 1. Real-time Tick Data

```typescript
// Read last N ticks from CME contract
const ticks = cmeConsumer.readLastTicks('ESH25-CME', 10);

// Tick data structure
interface TickData {
  dateTime: Date; // Timestamp
  open: number; // Open price
  high: number; // High price
  low: number; // Low price
  close: number; // Close price
  volume: number; // Volume
  numTrades: number; // Number of trades
  bidVolume: number; // Bid volume
  askVolume: number; // Ask volume
  isRecent: boolean; // Updated in last 5 minutes
}
```

### 2. Daily Bar Data

```typescript
// Read last N daily bars
const dailyBars = cmeConsumer.readLastDailyBars('ESH25-CME', 30);

// Daily data structure
interface DailyData {
  date: Date; // Date
  open: number; // Open price
  high: number; // High price
  low: number; // Low price
  close: number; // Close price
  volume: number; // Volume
  openInterest?: number; // Open interest
}
```

### 3. Contract Monitoring

```typescript
// Monitor specific CME contracts
const watchlist = [
  'ESH25-CME', // E-mini S&P 500
  'NQH25-CME', // E-mini Nasdaq-100
  'BTCF25-CME', // Bitcoin
  'GCJ25-CME', // Gold
];

cmeConsumer.startMonitoring(watchlist, 3000);

// Handle updates
cmeConsumer.on('symbolUpdated', symbol => {
  console.log(`🔔 ${symbol} updated!`);

  const info = cmeConsumer.getCMESymbolInfo(symbol);
  if (info) {
    console.log(`   ${info.product} | Exp: ${info.contractMonth}/${info.year}`);
  }
});
```

## 🎓 Advanced CME Features

### Contract Rollover Management

```typescript
// Check which contracts need rolling
const allCMESymbols = cmeConsumer.getCMESymbols();

allCMESymbols.forEach(symbol => {
  const analysis = cmeConsumer.analyzeCMESymbol(symbol.symbol);
  if (analysis?.rolloverRecommendation) {
    console.log(`⚠️  ROLLOVER NEEDED: ${symbol.symbol}`);
    console.log(`   ${analysis.rolloverRecommendation}`);

    // Find next contract
    const nextContract = findNextContract(symbol.symbol);
    if (nextContract) {
      console.log(`   → Consider rolling to: ${nextContract}`);
    }
  }
});
```

### Margin Analysis

```typescript
// Calculate total margin requirements
const portfolio = ['ESH25-CME', 'NQH25-CME', 'GCJ25-CME'];

let totalMargin = 0;
portfolio.forEach(symbol => {
  const info = cmeConsumer.getCMESymbolInfo(symbol);
  if (info?.marginRequirement) {
    totalMargin += info.marginRequirement;
    console.log(`${symbol}: $${info.marginRequirement.toLocaleString()}`);
  }
});

console.log(`Total Portfolio Margin: $${totalMargin.toLocaleString()}`);
```

### Volume Analysis

```typescript
// Analyze volume patterns
const highVolumeSymbols = cmeConsumer
  .getCMESymbols()
  .filter(symbol => {
    const ticks = cmeConsumer.readLastTicks(symbol.symbol, 100);
    if (!ticks) return false;

    const totalVolume = ticks.reduce((sum, tick) => sum + tick.volume, 0);
    const avgVolume = totalVolume / ticks.length;

    return avgVolume > 1000; // High volume threshold
  })
  .sort((a, b) => {
    const volA =
      cmeConsumer.readLastTicks(a.symbol, 100)?.reduce((sum, t) => sum + t.volume, 0) || 0;
    const volB =
      cmeConsumer.readLastTicks(b.symbol, 100)?.reduce((sum, t) => sum + t.volume, 0) || 0;
    return volB - volA;
  });

console.log('High Volume CME Contracts:');
highVolumeSymbols.slice(0, 5).forEach(symbol => {
  const ticks = cmeConsumer.readLastTicks(symbol.symbol, 100);
  const totalVolume = ticks?.reduce((sum, t) => sum + t.volume, 0) || 0;
  console.log(`${symbol.symbol}: ${(totalVolume / 100).toFixed(0)} avg volume`);
});
```

## 🚨 Troubleshooting CME Data

### Common Issues

**Issue: "Symbol not found"**

- Verify exact symbol format (e.g., `ESH25-CME`)
- Check if contract is active in SierraChart
- Ensure chart is open in SierraChart for real-time updates

**Issue: "No data available"**

- Symbol may be expired or inactive
- Check file size (> 100 bytes indicates data)
- Verify SierraChart is running and connected to data feed

**Issue: "Incorrect contract month"**

- Use proper month codes (F=Jan, G=Feb, H=Mar, etc.)
- Check year format (25=2025, not 2025)
- Verify exchange suffix (-CME)

### CME Data Verification

```typescript
// Verify CME symbol exists
const symbolInfo = cmeConsumer.getCMESymbolInfo('ESH25-CME');

if (symbolInfo) {
  console.log('✅ Symbol found');
  console.log(`   File: ${symbolInfo.filePath}`);
  console.log(`   Size: ${symbolInfo.fileSize} bytes`);
  console.log(`   Records: ${symbolInfo.totalRecords}`);
} else {
  console.log('❌ Symbol not found - check format');
}
```

## 📚 CME Resources

### Contract Month Codes

| Code | Month    | Code | Month     |
| ---- | -------- | ---- | --------- |
| F    | January  | N    | July      |
| G    | February | Q    | August    |
| H    | March    | U    | September |
| J    | April    | V    | October   |
| K    | May      | X    | November  |
| M    | June     | Z    | December  |

### CME Trading Hours

- **Equity Index**: Sun 6:00 PM - Fri 5:00 PM ET
- **Crypto**: Sun 6:00 PM - Fri 5:00 PM ET
- **Commodities**: Sun 6:00 PM - Fri 5:00 PM ET
- **Rates**: Sun 5:00 PM - Fri 4:00 PM ET
- **FX**: Sun 5:00 PM - Fri 4:00 PM ET

### CME Margin Requirements (Approximate)

- **Equity Index**: $3,000 - $7,000 per contract
- **Crypto**: $8,000 - $12,000 per contract
- **Commodities**: $2,000 - $5,000 per contract
- **Rates**: $1,500 - $4,000 per contract
- **FX**: $2,000 - $3,500 per contract

## 🎉 Conclusion

The **CME Data Consumer** provides:

✅ **CME-specific symbol identification** - Automatic detection of CME products
✅ **Contract information** - Full specifications for each contract
✅ **Sector analysis** - Grouped by product categories
✅ **Rollover management** - Contract expiration tracking
✅ **Real-time monitoring** - Instant updates for CME contracts
✅ **Comprehensive analysis** - CME-specific metrics and indicators

**All CME Group products from your SierraChart installation are now accessible with full contract details, real-time monitoring, and comprehensive analysis tools!**
