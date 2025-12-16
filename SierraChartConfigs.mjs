/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SIERRACHART PRO CONFIGURATIONS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Configurations de charts professionnelles pour différentes stratégies de trading.
 * Exportable vers SierraChart.
 * 
 * @version 1.0.0
 */

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURATIONS DE CHARTS PROFESSIONNELLES
// ════════════════════════════════════════════════════════════════════════════

const CHART_CONFIGS = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SCALPING CONFIG
  // ═══════════════════════════════════════════════════════════════════════════
  scalping: {
    name: 'Scalping Setup',
    description: 'Configuration optimisée pour le scalping (1-5 minutes)',
    timeframe: '1m',
    studies: [
      { name: 'EMA', period: 9, color: '#00FF00', width: 2 },
      { name: 'EMA', period: 21, color: '#FF0000', width: 2 },
      { name: 'VWAP', color: '#FF00FF', width: 2 },
      { name: 'Bollinger Bands', period: 20, stdDev: 2, colors: ['#888888', '#888888', '#888888'] },
      { name: 'RSI', period: 14, overbought: 70, oversold: 30, subgraph: 1 },
      { name: 'Volume', subgraph: 2 },
      { name: 'Delta Volume', subgraph: 3 }
    ],
    alerts: [
      { condition: 'RSI < 30', action: 'BUY Signal' },
      { condition: 'RSI > 70', action: 'SELL Signal' },
      { condition: 'Price crosses above EMA9', action: 'Bullish momentum' }
    ],
    settings: {
      showBidAsk: true,
      showOrderBook: true,
      showFootprint: true,
      tickSize: 'auto'
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DAY TRADING CONFIG
  // ═══════════════════════════════════════════════════════════════════════════
  dayTrading: {
    name: 'Day Trading Setup',
    description: 'Configuration pour le day trading (5-15 minutes)',
    timeframe: '5m',
    studies: [
      { name: 'SMA', period: 20, color: '#00FFFF', width: 1 },
      { name: 'SMA', period: 50, color: '#FFFF00', width: 1 },
      { name: 'SMA', period: 200, color: '#FF8800', width: 2 },
      { name: 'VWAP', color: '#FF00FF', width: 2 },
      { name: 'MACD', fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, subgraph: 1 },
      { name: 'RSI', period: 14, subgraph: 2 },
      { name: 'ATR', period: 14, subgraph: 3 },
      { name: 'Volume Profile', subgraph: 0 }
    ],
    pivots: {
      show: true,
      types: ['Daily', 'Weekly'],
      levels: ['S3', 'S2', 'S1', 'P', 'R1', 'R2', 'R3']
    },
    alerts: [
      { condition: 'MACD crosses signal', action: 'Trend change' },
      { condition: 'Price at R1/S1', action: 'Key level' }
    ],
    settings: {
      showMarketProfile: true,
      showVolumeProfile: true,
      showPOC: true
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SWING TRADING CONFIG
  // ═══════════════════════════════════════════════════════════════════════════
  swingTrading: {
    name: 'Swing Trading Setup',
    description: 'Configuration pour le swing trading (1H - Daily)',
    timeframe: '1H',
    studies: [
      { name: 'SMA', period: 50, color: '#00FF00', width: 2 },
      { name: 'SMA', period: 200, color: '#FF0000', width: 2 },
      { name: 'EMA', period: 21, color: '#00FFFF', width: 1 },
      { name: 'Bollinger Bands', period: 20, stdDev: 2 },
      { name: 'Ichimoku Cloud', settings: { tenkan: 9, kijun: 26, senkou: 52 }, subgraph: 0 },
      { name: 'MACD', subgraph: 1 },
      { name: 'Stochastic', kPeriod: 14, dPeriod: 3, subgraph: 2 },
      { name: 'ADX', period: 14, subgraph: 3 }
    ],
    fibonacci: {
      show: true,
      levels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
    },
    alerts: [
      { condition: 'Price enters Cloud', action: 'Trend uncertainty' },
      { condition: 'ADX > 25', action: 'Strong trend' },
      { condition: 'Golden Cross (SMA50 > SMA200)', action: 'Bullish signal' }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ORDER FLOW CONFIG
  // ═══════════════════════════════════════════════════════════════════════════
  orderFlow: {
    name: 'Order Flow Analysis',
    description: 'Configuration avancée Order Flow / Footprint',
    timeframe: '1m',
    studies: [
      { name: 'Footprint Chart', type: 'BidAsk', showDelta: true, showImbalance: true },
      { name: 'Cumulative Delta', subgraph: 1 },
      { name: 'Delta Volume', subgraph: 2 },
      { name: 'VWAP', color: '#FF00FF', width: 2 },
      { name: 'POC', color: '#FFFF00', width: 2 },
      { name: 'Value Area', high: '#00FF00', low: '#FF0000' }
    ],
    marketDepth: {
      show: true,
      levels: 10,
      aggregation: 'price'
    },
    settings: {
      showImbalances: true,
      imbalanceRatio: 3,
      showAbsorption: true,
      showStacking: true
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CRYPTO TRADING CONFIG
  // ═══════════════════════════════════════════════════════════════════════════
  crypto: {
    name: 'Crypto Trading Setup',
    description: 'Configuration optimisée pour le trading crypto 24/7',
    timeframe: '15m',
    studies: [
      { name: 'EMA', period: 12, color: '#00FF00', width: 2 },
      { name: 'EMA', period: 26, color: '#FF0000', width: 2 },
      { name: 'EMA', period: 50, color: '#FFFF00', width: 1 },
      { name: 'Bollinger Bands', period: 20, stdDev: 2.5 },
      { name: 'RSI', period: 14, subgraph: 1 },
      { name: 'MACD', subgraph: 2 },
      { name: 'Volume', subgraph: 3 },
      { name: 'Funding Rate', subgraph: 4 }  // Specific to perps
    ],
    liquidations: {
      show: true,
      threshold: 100000
    },
    alerts: [
      { condition: 'RSI extreme (<20 or >80)', action: 'Reversal potential' },
      { condition: 'Volume spike > 200%', action: 'Momentum alert' },
      { condition: 'Funding rate extreme', action: 'Market overheated' }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TREND FOLLOWING CONFIG
  // ═══════════════════════════════════════════════════════════════════════════
  trendFollowing: {
    name: 'Trend Following Setup',
    description: 'Configuration pour suivre les tendances majeures',
    timeframe: '4H',
    studies: [
      { name: 'SuperTrend', period: 10, multiplier: 3 },
      { name: 'Parabolic SAR', step: 0.02, max: 0.2 },
      { name: 'SMA', period: 200, color: '#FFFFFF', width: 3 },
      { name: 'ADX', period: 14, subgraph: 1 },
      { name: 'DMI', period: 14, subgraph: 1 },
      { name: 'ATR', period: 14, subgraph: 2 },
      { name: 'Donchian Channel', period: 20 }
    ],
    signals: {
      entry: 'SuperTrend flip + ADX > 25 + Price above SMA200',
      exit: 'SuperTrend flip opposite OR ATR trailing stop'
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MEAN REVERSION CONFIG
  // ═══════════════════════════════════════════════════════════════════════════
  meanReversion: {
    name: 'Mean Reversion Setup',
    description: 'Configuration pour les stratégies de retour à la moyenne',
    timeframe: '15m',
    studies: [
      { name: 'VWAP', color: '#FF00FF', width: 2 },
      { name: 'VWAP Bands', stdDev: [1, 2, 3] },
      { name: 'Bollinger Bands', period: 20, stdDev: 2 },
      { name: 'Keltner Channel', period: 20, multiplier: 1.5 },
      { name: 'RSI', period: 2, subgraph: 1 },  // Short-term RSI for MR
      { name: 'CCI', period: 20, subgraph: 2 },
      { name: 'Stochastic', kPeriod: 5, dPeriod: 3, subgraph: 3 }
    ],
    signals: {
      entry: 'Price at VWAP -2 stddev + RSI < 10',
      exit: 'Price returns to VWAP OR RSI > 50'
    }
  }
};

// ════════════════════════════════════════════════════════════════════════════
// TRADING STRATEGIES
// ════════════════════════════════════════════════════════════════════════════

const TRADING_STRATEGIES = {
  
  // Momentum Breakout
  momentumBreakout: {
    name: 'Momentum Breakout',
    type: 'TREND',
    indicators: ['ADX', 'Volume', 'ATR'],
    entryConditions: [
      'ADX > 25 (strong trend)',
      'Volume > 150% average',
      'Price breaks previous high/low'
    ],
    exitConditions: [
      'ADX < 20',
      'Price reverses below entry - 1.5 ATR'
    ],
    riskManagement: {
      stopLoss: '1.5 ATR from entry',
      takeProfit: '3 ATR from entry',
      riskReward: 2
    }
  },

  // RSI Divergence
  rsiDivergence: {
    name: 'RSI Divergence',
    type: 'REVERSAL',
    indicators: ['RSI', 'Price Action'],
    entryConditions: [
      'Bullish: Price makes lower low, RSI makes higher low',
      'Bearish: Price makes higher high, RSI makes lower high',
      'RSI in extreme zone (< 30 or > 70)'
    ],
    exitConditions: [
      'RSI crosses 50',
      'Price reaches support/resistance'
    ],
    riskManagement: {
      stopLoss: 'Below/above divergence swing',
      takeProfit: 'Previous swing level',
      riskReward: 2.5
    }
  },

  // VWAP Bounce
  vwapBounce: {
    name: 'VWAP Bounce',
    type: 'MEAN_REVERSION',
    indicators: ['VWAP', 'Volume', 'Price Action'],
    entryConditions: [
      'Price touches VWAP from above/below',
      'Rejection candle forms at VWAP',
      'Volume confirms (higher than average)'
    ],
    exitConditions: [
      'Price reaches previous high/low',
      'Price breaks VWAP opposite side'
    ],
    riskManagement: {
      stopLoss: '0.5 ATR beyond VWAP',
      takeProfit: 'Previous swing or 2R',
      riskReward: 2
    }
  },

  // Opening Range Breakout
  orbStrategy: {
    name: 'Opening Range Breakout',
    type: 'BREAKOUT',
    indicators: ['Price Range', 'Volume', 'Time'],
    entryConditions: [
      'Wait for first 15-30 min range to form',
      'Enter on breakout above/below range',
      'Volume > 120% average on breakout'
    ],
    exitConditions: [
      'Opposite side of range hit (stop)',
      'Target at 1.5x range extension'
    ],
    timing: {
      rangeFormation: '9:30 - 10:00 AM EST',
      tradingHours: '10:00 AM - 3:00 PM EST'
    },
    riskManagement: {
      stopLoss: 'Opposite side of OR',
      takeProfit: '1.5x OR extension',
      riskReward: 1.5
    }
  },

  // Golden/Death Cross
  crossover: {
    name: 'MA Crossover',
    type: 'TREND',
    indicators: ['SMA 50', 'SMA 200'],
    entryConditions: [
      'Golden Cross: SMA50 crosses above SMA200',
      'Death Cross: SMA50 crosses below SMA200',
      'ADX > 20 for trend confirmation'
    ],
    exitConditions: [
      'Opposite cross signal',
      'Price closes significantly below SMA50'
    ],
    riskManagement: {
      stopLoss: '2 ATR from entry',
      takeProfit: 'Trailing stop at SMA50',
      riskReward: 3
    }
  }
};

// ════════════════════════════════════════════════════════════════════════════
// ALERT CONFIGURATIONS
// ════════════════════════════════════════════════════════════════════════════

const ALERT_CONFIGS = {
  
  priceAlerts: [
    { type: 'PRICE_CROSS', description: 'Prix croise un niveau clé' },
    { type: 'PRICE_RANGE', description: 'Prix sort d\'une range' },
    { type: 'ATH_ATL', description: 'Nouveau plus haut/bas' }
  ],
  
  indicatorAlerts: [
    { indicator: 'RSI', conditions: ['< 30', '> 70', 'Crosses 50'] },
    { indicator: 'MACD', conditions: ['Crosses signal', 'Histogram flip'] },
    { indicator: 'Bollinger', conditions: ['Touches upper', 'Touches lower', 'Squeeze'] },
    { indicator: 'Volume', conditions: ['Spike > 200%', 'Below average'] },
    { indicator: 'ADX', conditions: ['> 25', '< 20', 'DI crossover'] }
  ],
  
  patternAlerts: [
    { pattern: 'Engulfing', type: 'Candlestick' },
    { pattern: 'Pin Bar', type: 'Candlestick' },
    { pattern: 'Double Top/Bottom', type: 'Chart Pattern' },
    { pattern: 'Head & Shoulders', type: 'Chart Pattern' },
    { pattern: 'Triangle Breakout', type: 'Chart Pattern' }
  ]
};

// ════════════════════════════════════════════════════════════════════════════
// EXPORT FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

function getChartConfig(configName) {
  return CHART_CONFIGS[configName] || null;
}

function getAllConfigs() {
  return CHART_CONFIGS;
}

function getStrategy(strategyName) {
  return TRADING_STRATEGIES[strategyName] || null;
}

function getAllStrategies() {
  return TRADING_STRATEGIES;
}

function printConfigSummary() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  SIERRACHART PRO CONFIGURATIONS');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('📊 CONFIGURATIONS DE CHARTS DISPONIBLES:\n');
  for (const [key, config] of Object.entries(CHART_CONFIGS)) {
    console.log(`   ${key.padEnd(20)} - ${config.name}`);
    console.log(`   ${''.padEnd(20)}   ${config.description}`);
    console.log(`   ${''.padEnd(20)}   📈 ${config.studies.length} études, Timeframe: ${config.timeframe}\n`);
  }
  
  console.log('\n📈 STRATÉGIES DE TRADING:\n');
  for (const [key, strategy] of Object.entries(TRADING_STRATEGIES)) {
    console.log(`   ${key.padEnd(20)} - ${strategy.name} (${strategy.type})`);
    console.log(`   ${''.padEnd(20)}   R/R: ${strategy.riskManagement.riskReward}`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

export {
  CHART_CONFIGS,
  TRADING_STRATEGIES,
  ALERT_CONFIGS,
  getChartConfig,
  getAllConfigs,
  getStrategy,
  getAllStrategies,
  printConfigSummary
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

printConfigSummary();

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('💡 Utilisez ces configurations dans votre trading SierraChart');
console.log('═══════════════════════════════════════════════════════════════\n');
