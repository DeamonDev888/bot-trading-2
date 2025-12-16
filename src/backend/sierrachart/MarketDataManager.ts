import { EventEmitter } from 'events';
import { SierraChartService } from './SierraChartService';
import {
  MarketDataRequest,
  MarketDataUpdate,
  SierraChartConfig,
  SierraChartEventHandlers
} from './types';

export interface MarketDataSubscriber {
  symbol: string;
  exchange: string;
  callback: (data: MarketDataUpdate) => void;
  interval?: number;
}

export interface MarketDataHistory {
  symbol: string;
  exchange: string;
  data: MarketDataUpdate[];
  lastUpdated: Date;
}

export class MarketDataManager extends EventEmitter {
  private sierraService: SierraChartService;
  private subscribers: Map<string, MarketDataSubscriber[]> = new Map();
  private marketDataHistory: Map<string, MarketDataHistory> = new Map();
  private requestCounter = 1;
  private activeRequests: Map<number, MarketDataRequest> = new Map();

  constructor(config: SierraChartConfig) {
    super();
    this.sierraService = new SierraChartService(config);
    this.setupEventHandlers();
  }

  /**
   * Initialize the market data manager
   */
  async initialize(): Promise<void> {
    await this.sierraService.connect();
    console.log('Market Data Manager initialized');
  }

  /**
   * Subscribe to market data for a symbol
   */
  subscribeToMarketData(
    symbol: string,
    exchange: string,
    callback: (data: MarketDataUpdate) => void,
    interval: number = 1
  ): string {
    const subscriberId = `${symbol}_${exchange}_${Date.now()}`;
    const subscriber: MarketDataSubscriber = {
      symbol,
      exchange,
      callback,
      interval
    };

    const key = this.getSubscriberKey(symbol, exchange);
    const subscribers = this.subscribers.get(key) || [];
    subscribers.push(subscriber);
    this.subscribers.set(key, subscribers);

    // If this is the first subscriber for this symbol, request data
    if (subscribers.length === 1) {
      this.requestMarketData(symbol, exchange, interval);
    }

    return subscriberId;
  }

  /**
   * Unsubscribe from market data
   */
  unsubscribeFromMarketData(subscriberId: string): void {
    let removedSubscriber: MarketDataSubscriber | null = null;

    for (const [key, subscribers] of this.subscribers.entries()) {
      const index = subscribers.findIndex(sub =>
        `${sub.symbol}_${sub.exchange}_${sub.callback.toString()}` === subscriberId
      );

      if (index !== -1) {
        removedSubscriber = subscribers.splice(index, 1)[0];
        if (subscribers.length === 0) {
          this.subscribers.delete(key);
        }
        break;
      }
    }

    if (removedSubscriber) {
      console.log(`Unsubscribed from ${removedSubscriber.symbol}`);
    }
  }

  /**
   * Get current market data for a symbol
   */
  getCurrentMarketData(symbol: string, exchange: string): MarketDataUpdate | null {
    const key = this.getHistoryKey(symbol, exchange);
    const history = this.marketDataHistory.get(key);

    if (history && history.data.length > 0) {
      return history.data[history.data.length - 1];
    }

    return null;
  }

  /**
   * Get historical market data for a symbol
   */
  getHistoricalMarketData(
    symbol: string,
    exchange: string,
    limit?: number
  ): MarketDataUpdate[] {
    const key = this.getHistoryKey(symbol, exchange);
    const history = this.marketDataHistory.get(key);

    if (!history) {
      return [];
    }

    const data = [...history.data];
    return limit ? data.slice(-limit) : data;
  }

  /**
   * Clear historical data for a symbol
   */
  clearHistoricalData(symbol: string, exchange: string): void {
    const key = this.getHistoryKey(symbol, exchange);
    this.marketDataHistory.delete(key);
  }

  /**
   * Get list of all subscribed symbols
   */
  getSubscribedSymbols(): Array<{ symbol: string; exchange: string }> {
    const symbols = new Set<string>();

    for (const key of this.subscribers.keys()) {
      const [symbol, exchange] = key.split('|');
      symbols.add(JSON.stringify({ symbol, exchange }));
    }

    return Array.from(symbols).map(s => JSON.parse(s));
  }

  /**
   * Get statistics about market data
   */
  getMarketDataStats(): {
    totalSubscribers: number;
    symbolsSubscribed: number;
    totalDataPoints: number;
    lastUpdate: Date | null;
  } {
    let totalSubscribers = 0;
    let totalDataPoints = 0;
    let lastUpdate: Date | null = null;

    for (const subscribers of this.subscribers.values()) {
      totalSubscribers += subscribers.length;
    }

    for (const history of this.marketDataHistory.values()) {
      totalDataPoints += history.data.length;
      if (!lastUpdate || history.lastUpdated > lastUpdate) {
        lastUpdate = history.lastUpdated;
      }
    }

    return {
      totalSubscribers,
      symbolsSubscribed: this.subscribers.size,
      totalDataPoints,
      lastUpdate
    };
  }

  /**
   * Disconnect from SierraChart
   */
  disconnect(): void {
    this.sierraService.disconnect();
    this.subscribers.clear();
    this.marketDataHistory.clear();
    this.activeRequests.clear();
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return this.sierraService.getConnectionStatus();
  }

  // Private methods

  private setupEventHandlers(): void {
    const handlers: SierraChartEventHandlers = {
      onMarketDataUpdate: (data: MarketDataUpdate) => {
        this.handleMarketDataUpdate(data);
      },
      onConnectionStatusChange: (status) => {
        this.emit('connectionStatusChange', status);
        if (status.isConnected) {
          // Resubscribe to all symbols after reconnection
          this.resubscribeAllSymbols();
        }
      },
      onError: (error) => {
        this.emit('error', error);
      }
    };

    this.sierraService.setEventHandlers(handlers);
  }

  private handleMarketDataUpdate(data: MarketDataUpdate): void {
    // Store in history
    const key = this.getHistoryKey(data.Symbol, data.Exchange);
    const history = this.marketDataHistory.get(key) || {
      symbol: data.Symbol,
      exchange: data.Exchange,
      data: [],
      lastUpdated: new Date()
    };

    history.data.push(data);
    history.lastUpdated = new Date();

    // Keep only last 1000 data points to prevent memory issues
    if (history.data.length > 1000) {
      history.data = history.data.slice(-1000);
    }

    this.marketDataHistory.set(key, history);

    // Notify subscribers
    const subscriberKey = this.getSubscriberKey(data.Symbol, data.Exchange);
    const subscribers = this.subscribers.get(subscriberKey) || [];

    for (const subscriber of subscribers) {
      try {
        subscriber.callback(data);
      } catch (error) {
        console.error(`Error in subscriber callback for ${data.Symbol}:`, error);
      }
    }

    // Emit general event
    this.emit('marketDataUpdate', data);
  }

  private requestMarketData(symbol: string, exchange: string, interval: number): void {
    const requestId = this.requestCounter++;
    const request: MarketDataRequest = {
      Symbol: symbol,
      Exchange: exchange,
      RequestID: requestId,
      Interval: interval,
      UseZCompression: true
    };

    this.activeRequests.set(requestId, request);
    this.sierraService.requestMarketData(request);
  }

  private resubscribeAllSymbols(): void {
    console.log('Resubscribing to all symbols after reconnection...');

    for (const [key, subscribers] of this.subscribers.entries()) {
      if (subscribers.length > 0) {
        const [symbol, exchange] = key.split('|');
        const interval = subscribers[0].interval || 1;
        this.requestMarketData(symbol, exchange, interval);
      }
    }
  }

  private getSubscriberKey(symbol: string, exchange: string): string {
    return `${symbol}|${exchange}`;
  }

  private getHistoryKey(symbol: string, exchange: string): string {
    return `${symbol}|${exchange}`;
  }

  /**
   * Calculate technical indicators for market data
   */
  calculateTechnicalIndicators(
    symbol: string,
    exchange: string,
    period: number = 20
  ): {
    sma?: number;
    ema?: number;
    rsi?: number;
    bollingerBands?: { upper: number; middle: number; lower: number };
    volumeSMA?: number;
  } | null {
    const data = this.getHistoricalMarketData(symbol, exchange, period * 2);

    if (data.length < period) {
      return null;
    }

    const closes = data.map(d => d.LastTradePrice || 0).filter(p => p > 0);
    const volumes = data.map(d => d.Volume || 0).filter(v => v > 0);

    if (closes.length < period) {
      return null;
    }

    const indicators: any = {};

    // Simple Moving Average (SMA)
    indicators.sma = closes.slice(-period).reduce((sum, price) => sum + price, 0) / period;

    // Exponential Moving Average (EMA)
    const multiplier = 2 / (period + 1);
    let ema = closes[0];
    for (let i = 1; i < closes.length; i++) {
      ema = (closes[i] * multiplier) + (ema * (1 - multiplier));
    }
    indicators.ema = ema;

    // Relative Strength Index (RSI)
    if (closes.length >= period + 14) {
      const gains = [];
      const losses = [];

      for (let i = 1; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
      }

      const avgGain = gains.slice(-14).reduce((sum, g) => sum + g, 0) / 14;
      const avgLoss = losses.slice(-14).reduce((sum, l) => sum + l, 0) / 14;

      if (avgLoss > 0) {
        const rs = avgGain / avgLoss;
        indicators.rsi = 100 - (100 / (1 + rs));
      }
    }

    // Bollinger Bands
    if (closes.length >= period) {
      const recentCloses = closes.slice(-period);
      const middle = indicators.sma!;
      const variance = recentCloses.reduce((sum, price) => {
        return sum + Math.pow(price - middle, 2);
      }, 0) / period;
      const standardDeviation = Math.sqrt(variance);

      indicators.bollingerBands = {
        upper: middle + (2 * standardDeviation),
        middle: middle,
        lower: middle - (2 * standardDeviation)
      };
    }

    // Volume SMA
    if (volumes.length >= period) {
      indicators.volumeSMA = volumes.slice(-period).reduce((sum, vol) => sum + vol, 0) / period;
    }

    return indicators;
  }
}