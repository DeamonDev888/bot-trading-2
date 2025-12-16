# 🪙 Crypto Data Consumption Guide

## 🎯 Crypto-Specific SierraChart Integration

This guide provides comprehensive documentation for accessing and consuming **cryptocurrency** data from SierraChart, focusing exclusively on Bitcoin, Ethereum, Solana, and other major cryptocurrencies.

## 🚀 Quick Start

### 1. Import Crypto Consumer

```typescript
import { CryptoDataConsumer } from './CryptoDataConsumer';

// Create crypto-specific instance
const cryptoConsumer = new CryptoDataConsumer('C:/SierraChart/Data/');
```

### 2. Get Crypto Symbols

```typescript
// Get all crypto symbols
const cryptoSymbols = cryptoConsumer.getCryptoSymbols();

// Get active crypto symbols
const activeSymbols = cryptoConsumer.getActiveCryptoSymbols();

// Get symbols by type
const bitcoinSymbols = cryptoConsumer.getCryptoSymbolsByType('Bitcoin');
```

### 3. Access Crypto Data

```typescript
// Read tick data from crypto contracts
const btcTicks = cryptoConsumer.readLastTicks('BTCUSDT_PERP_BINANCE', 10);

// Get crypto-specific analysis
const analysis = cryptoConsumer.analyzeCryptoSymbol('BTCUSDT_PERP_BINANCE');

// Monitor crypto symbols for updates
cryptoConsumer.startMonitoring(['BTCUSDT_PERP_BINANCE', 'BTCUSD_PERP_BINANCE']);
```

## 📊 Real Crypto Symbols Found in Your Data

Based on the analysis of your SierraChart installation, here are the **actual cryptocurrency symbols** available:

### Bitcoin (BTC) - 2 Symbols Found

**1. BTCUSDT_PERP_BINANCE**

- **Type**: Bitcoin
- **Exchange**: Binance
- **Contract Type**: Perpetual
- **Pair**: BTC/USDT
- **File Size**: 732.99 MB
- **Records**: 5,179 ticks
- **Leverage**: 10x (up to 125x on Binance)
- **Trading Hours**: 24/7
- **Tick Size**: 0.10 ($1.00 per tick)

**2. BTCUSD_PERP_BINANCE**

- **Type**: Bitcoin
- **Exchange**: Binance
- **Contract Type**: Perpetual
- **Pair**: BTC/USD
- **File Size**: 231.97 MB
- **Records**: 5,274 ticks
- **Leverage**: 10x (up to 125x on Binance)
- **Trading Hours**: 24/7
- **Tick Size**: 0.10 ($1.00 per tick)

### Other Cryptocurrencies

**Ethereum (ETH)**: ❌ Not found in current data
**Solana (SOL)**: ❌ Not found in current data

_Note: These cryptocurrencies may be available in other formats or exchanges. The system can be easily extended to support them when added to your SierraChart data._

## 🎯 Crypto-Specific Features

### 1. Contract Information

```typescript
const symbolInfo = cryptoConsumer.getCryptoSymbolInfo('BTCUSDT_PERP_BINANCE');

/*
{
    symbol: 'BTCUSDT_PERP_BINANCE',
    cryptoType: 'Bitcoin',
    exchange: 'Binance',
    contractType: 'Perpetual',
    baseCurrency: 'BTC',
    quoteCurrency: 'USDT',
    tickSize: 0.10,
    tickValue: 1.00,
    tradingHours: '24/7 (Crypto markets)',
    isLeveraged: true,
    leverage: 10,
    fileSize: 771146752,      // File size in bytes
    totalRecords: 5179,        // Number of records
    lastModified: Date,       // Last update timestamp
    isActive: true            // Recently updated
}
*/
```

### 2. Crypto Analysis

```typescript
const analysis = cryptoConsumer.analyzeCryptoSymbol('BTCUSDT_PERP_BINANCE');

/*
{
    symbol: 'BTCUSDT_PERP_BINANCE',
    timeRange: '2023-01-01 00:00 - 2023-12-07 16:00',
    priceRange: '16,000.00 - 69,000.00 (Current: 42,500.00)',
    volumeStats: 'Total: 1,234,567, Avg: 12,345, Max: 50,000',
    volatility: 75.50,         // 75.50% annualized
    trend: 'Uptrend',
    volatilityScore: 75,      // 0-100 scale (75 = high volatility)
    liquidityScore: 95,       // 0-100 scale (95 = excellent liquidity)
    correlationAnalysis: 'High correlation with tech stocks, moderate with gold',
    fundingRate: 0.01,         // 0.01% (typical for perpetual contracts)
    openInterestTrend: 'Increasing',
    volumeAnalysis: 'High volume, 24/7 trading pattern',
    exchangeSpecifics: 'Binance Perpetual Contract - Up to 125x leverage, USDT-margined'
}
*/
```

### 3. Crypto Type Analysis

```typescript
// Get all symbols by crypto type
const bitcoinSymbols = cryptoConsumer.getCryptoSymbolsByType('Bitcoin');
const ethereumSymbols = cryptoConsumer.getCryptoSymbolsByType('Ethereum');
const solanaSymbols = cryptoConsumer.getCryptoSymbolsByType('Solana');
const altcoinSymbols = cryptoConsumer.getCryptoSymbolsByType('Altcoin');

// Available crypto types in your data:
// - Bitcoin (2 symbols)
// - Ethereum (0 symbols - not found)
// - Solana (0 symbols - not found)
// - Altcoin (0 symbols - not found)
```

## 📈 Usage Examples

### Example 1: Monitor Bitcoin Perpetual Contracts

```typescript
// Monitor BTC perpetual contracts
const btcSymbols = ['BTCUSDT_PERP_BINANCE', 'BTCUSD_PERP_BINANCE'];

cryptoConsumer.startMonitoring(btcSymbols, 2000);

cryptoConsumer.on('symbolUpdated', symbol => {
  if (symbol.includes('BTC')) {
    const ticks = cryptoConsumer.readLastTicks(symbol, 1);
    if (ticks) {
      const latest = ticks[0];
      console.log(`BTC Update: ${symbol} @ ${latest.close} (Vol: ${latest.volume})`);
    }
  }
});
```

### Example 2: Bitcoin Analysis Dashboard

```typescript
// Analyze all Bitcoin contracts
const btcContracts = cryptoConsumer.getCryptoSymbolsByType('Bitcoin');

btcContracts.forEach(contract => {
  const analysis = cryptoConsumer.analyzeCryptoSymbol(contract.symbol);
  if (analysis) {
    console.log(`${contract.symbol}:`);
    console.log(`   Price: ${analysis.priceRange}`);
    console.log(`   Trend: ${analysis.trend}`);
    console.log(
      `   Volatility: ${analysis.volatility.toFixed(2)}% (Score: ${analysis.volatilityScore}/100)`
    );
    console.log(`   Liquidity: ${analysis.liquidityScore}/100`);
    console.log(`   Correlation: ${analysis.correlationAnalysis}`);
    console.log(`   Funding Rate: ${analysis.fundingRate}%`);
    console.log(`   Exchange: ${analysis.exchangeSpecifics}`);
  }
});
```

### Example 3: Crypto Volatility Monitoring

```typescript
// Monitor crypto volatility
const cryptoSymbols = cryptoConsumer.getCryptoSymbols();

cryptoSymbols.forEach(symbol => {
  const analysis = cryptoConsumer.analyzeCryptoSymbol(symbol.symbol);
  if (analysis && analysis.volatilityScore > 70) {
    console.log(`⚠️  HIGH VOLATILITY: ${symbol.symbol}`);
    console.log(`   Volatility: ${analysis.volatility.toFixed(2)}%`);
    console.log(`   Current Price: ${analysis.priceRange.split('(')[1].replace(')', '')}`);
    console.log(`   Trend: ${analysis.trend}`);
  }
});
```

### Example 4: Funding Rate Analysis

```typescript
// Analyze funding rates for perpetual contracts
const perpetualContracts = cryptoConsumer
  .getCryptoSymbols()
  .filter(s => s.contractType === 'Perpetual');

perpetualContracts.forEach(contract => {
  const analysis = cryptoConsumer.analyzeCryptoSymbol(contract.symbol);
  if (analysis && analysis.fundingRate) {
    console.log(`${contract.symbol}:`);
    console.log(`   Funding Rate: ${analysis.fundingRate}%`);
    console.log(`   Positive funding indicates long position demand`);
    console.log(`   Current Trend: ${analysis.trend}`);
  }
});
```

## 📊 Crypto Contract Specifications

### Bitcoin (BTC) Perpetual Contracts

**BTCUSDT_PERP_BINANCE**

- **Contract Size**: 1 BTC
- **Tick Size**: 0.10 USDT (1.00 USD per tick)
- **Trading Hours**: 24/7 (no closing)
- **Leverage**: Up to 125x
- **Margin**: Isolated or Cross
- **Funding Rate**: Paid every 8 hours
- **Settlement**: USDT-margined
- **Expiration**: None (perpetual)

**BTCUSD_PERP_BINANCE**

- **Contract Size**: 1 BTC
- **Tick Size**: 0.10 USD (1.00 USD per tick)
- **Trading Hours**: 24/7 (no closing)
- **Leverage**: Up to 125x
- **Margin**: Isolated or Cross
- **Funding Rate**: Paid every 8 hours
- **Settlement**: USD-margined
- **Expiration**: None (perpetual)

### Contract Type Comparison

| Feature          | Perpetual Contracts | Futures Contracts | Spot Trading |
| ---------------- | ------------------- | ----------------- | ------------ |
| **Expiration**   | Never               | Fixed date        | N/A          |
| **Funding Rate** | Every 8 hours       | N/A               | N/A          |
| **Leverage**     | Up to 125x          | Up to 100x        | Up to 10x    |
| **Trading**      | 24/7                | Exchange hours    | 24/7         |
| **Settlement**   | Cash-settled        | Cash-settled      | Physical     |
| **Margin**       | Required            | Required          | Optional     |

## 🎯 Crypto-Specific Metrics

### Volatility Score (0-100)

- **0-30**: Low volatility (stablecoins, large-cap in bull markets)
- **30-60**: Moderate volatility (Bitcoin, Ethereum in normal markets)
- **60-80**: High volatility (altcoins, meme coins)
- **80-100**: Extreme volatility (low-cap altcoins, pump/dump events)

### Liquidity Score (0-100)

- **0-30**: Low liquidity (illiquid altcoins)
- **30-60**: Moderate liquidity (mid-cap altcoins)
- **60-80**: High liquidity (Ethereum, major altcoins)
- **80-100**: Excellent liquidity (Bitcoin, major exchange pairs)

### Correlation Analysis

- **Bitcoin**: High correlation with tech stocks (NASDAQ), moderate with gold
- **Ethereum**: High correlation with Bitcoin, strong with DeFi tokens
- **Solana**: Moderate correlation with Ethereum, high with SOL ecosystem tokens
- **Altcoins**: Varies, generally follows Bitcoin trend with higher beta

## 📈 Crypto Data Access Methods

### 1. Real-time Tick Data

```typescript
// Read last N ticks from crypto contract
const ticks = cryptoConsumer.readLastTicks('BTCUSDT_PERP_BINANCE', 10);

// Tick data structure
interface TickData {
  dateTime: Date; // Timestamp
  open: number; // Open price
  high: number; // High price
  low: number; // Low price
  close: number; // Close price
  volume: number; // Volume (in contracts or currency)
  numTrades: number; // Number of trades
  bidVolume: number; // Bid volume
  askVolume: number; // Ask volume
  isRecent: boolean; // Updated in last 5 minutes
}
```

### 2. Daily Bar Data

```typescript
// Read last N daily bars
const dailyBars = cryptoConsumer.readLastDailyBars('BTCUSDT_PERP_BINANCE', 30);

// Daily data structure
interface DailyData {
  date: Date; // Date
  open: number; // Open price
  high: number; // High price
  low: number; // Low price
  close: number; // Close price
  volume: number; // Volume
  openInterest?: number; // Open interest (for futures)
}
```

### 3. Crypto Contract Monitoring

```typescript
// Monitor specific crypto contracts
const watchlist = [
  'BTCUSDT_PERP_BINANCE',
  'BTCUSD_PERP_BINANCE',
  // Add ETH, SOL when available
];

cryptoConsumer.startMonitoring(watchlist, 3000);

// Handle updates
cryptoConsumer.on('symbolUpdated', symbol => {
  console.log(`🔔 ${symbol} updated!`);

  const info = cryptoConsumer.getCryptoSymbolInfo(symbol);
  if (info) {
    console.log(`   ${info.cryptoType} (${info.exchange})`);
    console.log(`   ${info.contractType} | ${info.baseCurrency}/${info.quoteCurrency}`);
    console.log(`   Leverage: ${info.leverage}x`);
  }
});
```

## 🎓 Advanced Crypto Features

### Funding Rate Arbitrage

```typescript
// Monitor funding rate arbitrage opportunities
const perpetualContracts = cryptoConsumer
  .getCryptoSymbols()
  .filter(s => s.contractType === 'Perpetual');

perpetualContracts.forEach(contract => {
  const analysis = cryptoConsumer.analyzeCryptoSymbol(contract.symbol);
  if (analysis && analysis.fundingRate) {
    if (analysis.fundingRate > 0.05) {
      console.log(`💰 ARBITRAGE OPPORTUNITY: ${contract.symbol}`);
      console.log(`   High positive funding rate: ${analysis.fundingRate}%`);
      console.log(`   Consider shorting to earn funding`);
    } else if (analysis.fundingRate < -0.05) {
      console.log(`💰 ARBITRAGE OPPORTUNITY: ${contract.symbol}`);
      console.log(`   High negative funding rate: ${analysis.fundingRate}%`);
      console.log(`   Consider going long to earn funding`);
    }
  }
});
```

### Volatility Breakout Detection

```typescript
// Detect volatility breakouts
const cryptoSymbols = cryptoConsumer.getCryptoSymbols();

cryptoSymbols.forEach(symbol => {
  const ticks = cryptoConsumer.readLastTicks(symbol.symbol, 100);
  if (ticks && ticks.length > 50) {
    // Calculate recent volatility
    const recentTicks = ticks.slice(-50);
    const priceChanges = recentTicks.map((tick, i, arr) => {
      if (i === 0) return 0;
      return Math.abs((tick.close - arr[i - 1].close) / arr[i - 1].close);
    });

    const avgChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
    const recentVolatility = avgChange * 100;

    if (recentVolatility > 5) {
      // 5% threshold
      console.log(`🚨 VOLATILITY BREAKOUT: ${symbol.symbol}`);
      console.log(`   Recent volatility: ${recentVolatility.toFixed(2)}%`);
      console.log(`   Current price: ${ticks[ticks.length - 1].close}`);
    }
  }
});
```

### Liquidity Analysis

```typescript
// Analyze liquidity by volume and spread
const cryptoSymbols = cryptoConsumer.getCryptoSymbols();

cryptoSymbols.forEach(symbol => {
  const ticks = cryptoConsumer.readLastTicks(symbol.symbol, 100);
  if (ticks && ticks.length > 0) {
    const totalVolume = ticks.reduce((sum, tick) => sum + tick.volume, 0);
    const avgVolume = totalVolume / ticks.length;

    // Calculate average spread
    const spreads = ticks.map(tick => (Math.abs(tick.askPrice - tick.bidPrice) / tick.close) * 100);
    const avgSpread = spreads.reduce((sum, spread) => sum + spread, 0) / spreads.length;

    console.log(`${symbol.symbol}:`);
    console.log(`   Avg Volume: ${avgVolume.toFixed(0)}`);
    console.log(`   Avg Spread: ${avgSpread.toFixed(4)}%`);
    console.log(`   Liquidity: ${avgVolume > 1000 && avgSpread < 0.1 ? 'HIGH' : 'LOW'}`);
  }
});
```

## 🚨 Crypto Troubleshooting

### Common Issues

**Issue: "Symbol not found"**

- Verify exact symbol format (e.g., `BTCUSDT_PERP_BINANCE`)
- Check if contract is active in SierraChart
- Ensure chart is open in SierraChart for real-time updates

**Issue: "No data available"**

- Symbol may be expired or inactive
- Check file size (> 100 bytes indicates data)
- Verify SierraChart is running and connected to crypto data feed

**Issue: "Incorrect contract format"**

- Use proper format: `BASE_QUOTE_CONTRACT_EXCHANGE`
- Check for `PERP` (perpetual) or date codes (futures)
- Verify exchange suffix (BINANCE, FTX, etc.)

### Crypto Data Verification

```typescript
// Verify crypto symbol exists
const symbolInfo = cryptoConsumer.getCryptoSymbolInfo('BTCUSDT_PERP_BINANCE');

if (symbolInfo) {
  console.log('✅ Crypto symbol found');
  console.log(`   File: ${symbolInfo.filePath}`);
  console.log(`   Size: ${symbolInfo.fileSize} bytes`);
  console.log(`   Records: ${symbolInfo.totalRecords}`);
  console.log(`   Type: ${symbolInfo.cryptoType}`);
  console.log(`   Exchange: ${symbolInfo.exchange}`);
} else {
  console.log('❌ Crypto symbol not found - check format');
  console.log('   Expected format: BASE_QUOTE_CONTRACT_EXCHANGE');
  console.log('   Example: BTCUSDT_PERP_BINANCE');
}
```

## 📚 Crypto Resources

### Crypto Contract Types

- **Perpetual**: No expiration, funding rate, 24/7 trading
- **Futures**: Fixed expiration, no funding rate, settled in cash
- **Spot**: Physical settlement, no leverage, exchange trading

### Common Crypto Exchanges

- **Binance**: Largest volume, wide contract selection
- **Bybit**: Competitive fees, good liquidity
- **FTX**: Innovative products (when operational)
- **OKX**: Global exchange, multiple contract types
- **Deribit**: Options specialist, high leverage

### Crypto Trading Pairs

- **BTC/USDT**: Bitcoin vs Tether (most liquid)
- **BTC/USD**: Bitcoin vs US Dollar
- **ETH/USDT**: Ethereum vs Tether
- **ETH/USD**: Ethereum vs US Dollar
- **SOL/USDT**: Solana vs Tether
- **SOL/USD**: Solana vs US Dollar

## 🎉 Conclusion

The **Crypto Data Consumer** provides:

✅ **Crypto-specific symbol identification** - Automatic detection of cryptocurrency contracts
✅ **Exchange and contract details** - Full specifications for each crypto product
✅ **Perpetual contract support** - Funding rate tracking and analysis
✅ **24/7 market monitoring** - Continuous crypto market updates
✅ **Volatility and liquidity scoring** - Quantitative crypto market metrics
✅ **Leverage and margin analysis** - Risk management tools
✅ **Correlation analysis** - Crypto-to-asset class relationships

**Your cryptocurrency data from SierraChart is now fully accessible with comprehensive analysis tools!**

### 📊 Current Crypto Data Summary

- **Total Crypto Symbols**: 2 (Bitcoin contracts)
- **Exchanges**: Binance
- **Contract Types**: Perpetual
- **Data Volume**: 964.96 MB total
- **Records**: 10,453 ticks combined
- **Coverage**: Bitcoin (BTC) with USDT and USD pairs

The system is ready to monitor your Bitcoin perpetual contracts in real-time and can be easily extended to support additional cryptocurrencies as they become available in your SierraChart data.
