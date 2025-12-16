import { EventEmitter } from 'events';
import { SierraChartService } from './SierraChartService';
import {
  OrderRequest,
  OrderUpdateReport,
  OrderStatus,
  PositionData,
  TradeAccount,
  SierraChartConfig,
  SierraChartEventHandlers
} from './types';

export interface OrderTracker {
  orderId: string;
  clientOrderId?: string;
  symbol: string;
  exchange: string;
  orderType: string;
  quantity: number;
  buySell: string;
  status: OrderStatus;
  filledQuantity: number;
  remainingQuantity: number;
  averageFillPrice?: number;
  createTime: Date;
  lastUpdateTime: Date;
}

export interface OrderParameters {
  symbol: string;
  exchange: string;
  side: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  quantity: number;
  price?: number; // For LIMIT orders
  stopPrice?: number; // For STOP orders
  stopLimitPrice?: number; // For STOP_LIMIT orders
  timeInForce?: 'DAY' | 'GTC' | 'IOC' | 'FOK';
  clientId?: string;
}

export interface TradingStatistics {
  totalOrders: number;
  successfulOrders: number;
  cancelledOrders: number;
  rejectedOrders: number;
  totalVolume: number;
  totalCommission: number;
  netProfit: number;
  winRate: number;
}

export class TradingManager extends EventEmitter {
  private sierraService: SierraChartService;
  private activeOrders: Map<string, OrderTracker> = new Map();
  private orderHistory: OrderTracker[] = [];
  private positions: Map<string, PositionData> = new Map();
  private tradeAccount: TradeAccount | null = null;
  private orderCounter = 1;
  private tradingEnabled = false;

  constructor(config: SierraChartConfig) {
    super();
    this.sierraService = new SierraChartService(config);
    this.setupEventHandlers();
  }

  /**
   * Initialize the trading manager
   */
  async initialize(): Promise<void> {
    await this.sierraService.connect();
    await this.loadAccountInfo();
    this.tradingEnabled = true;
    console.log('Trading Manager initialized and ready');
  }

  /**
   * Enable or disable trading
   */
  setTradingEnabled(enabled: boolean): void {
    this.tradingEnabled = enabled;
    console.log(`Trading ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if trading is enabled
   */
  isTradingEnabled(): boolean {
    return this.tradingEnabled;
  }

  /**
   * Place a new order
   */
  async placeOrder(params: OrderParameters): Promise<string> {
    if (!this.tradingEnabled) {
      throw new Error('Trading is disabled');
    }

    if (!this.sierraService.getConnectionStatus().isConnected) {
      throw new Error('Not connected to SierraChart');
    }

    const clientOrderId = params.clientId || `CLIENT_${this.orderCounter++}_${Date.now()}`;
    const orderId = `ORDER_${this.orderCounter++}_${Date.now()}`;

    const orderTracker: OrderTracker = {
      orderId,
      clientOrderId,
      symbol: params.symbol,
      exchange: params.exchange,
      orderType: params.orderType,
      quantity: params.quantity,
      buySell: params.side,
      status: OrderStatus.NEW,
      filledQuantity: 0,
      remainingQuantity: params.quantity,
      createTime: new Date(),
      lastUpdateTime: new Date()
    };

    this.activeOrders.set(orderId, orderTracker);

    const orderRequest: OrderRequest = {
      Symbol: params.symbol,
      Exchange: params.exchange,
      TradeAccount: this.tradeAccount?.TradeAccount || '',
      OrderType: params.orderType,
      OrderQuantity: params.quantity,
      BuySell: params.side,
      TimeInForce: params.timeInForce || 'GTC',
      OrderID: orderId,
      ClientOrderID: clientOrderId
    };

    // Set prices based on order type
    switch (params.orderType) {
      case 'LIMIT':
        if (!params.price) {
          throw new Error('Price is required for limit orders');
        }
        orderRequest.Price1 = params.price;
        break;
      case 'STOP':
        if (!params.stopPrice) {
          throw new Error('Stop price is required for stop orders');
        }
        orderRequest.Price1 = params.stopPrice;
        break;
      case 'STOP_LIMIT':
        if (!params.stopPrice || !params.stopLimitPrice) {
          throw new Error('Both stop price and stop limit price are required for stop limit orders');
        }
        orderRequest.Price1 = params.stopPrice;
        orderRequest.Price2 = params.stopLimitPrice;
        break;
    }

    try {
      this.sierraService.placeOrder(orderRequest);
      console.log(`Order placed: ${orderId} - ${params.side} ${params.quantity} ${params.symbol}`);
      this.emit('orderPlaced', orderTracker);
      return orderId;
    } catch (error) {
      this.activeOrders.delete(orderId);
      throw error;
    }
  }

  /**
   * Cancel an existing order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.activeOrders.get(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    if (order.status === OrderStatus.FILLED || order.status === OrderStatus.CANCELLED) {
      throw new Error(`Cannot cancel order in ${order.status} status`);
    }

    // In a real implementation, you would send a cancel request
    // For now, we'll simulate the cancellation
    order.status = OrderStatus.CANCELLED;
    order.lastUpdateTime = new Date();

    this.activeOrders.delete(orderId);
    this.orderHistory.push(order);

    console.log(`Order cancelled: ${orderId}`);
    this.emit('orderCancelled', order);
    return true;
  }

  /**
   * Modify an existing order
   */
  async modifyOrder(
    orderId: string,
    modifications: Partial<Pick<OrderParameters, 'quantity' | 'price' | 'stopPrice' | 'stopLimitPrice'>>
  ): Promise<boolean> {
    const order = this.activeOrders.get(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    if (order.status !== OrderStatus.NEW && order.status !== OrderStatus.PENDING) {
      throw new Error(`Cannot modify order in ${order.status} status`);
    }

    // Cancel the original order and create a new one with modifications
    await this.cancelOrder(orderId);

    const newParams: OrderParameters = {
      symbol: order.symbol,
      exchange: order.exchange,
      side: order.buySell as 'BUY' | 'SELL',
      orderType: order.orderType as 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT',
      quantity: modifications.quantity || order.quantity,
      price: modifications.price,
      stopPrice: modifications.stopPrice,
      stopLimitPrice: modifications.stopLimitPrice,
      clientId: order.clientOrderId
    };

    return this.placeOrder(newParams).then(() => true);
  }

  /**
   * Get active orders
   */
  getActiveOrders(): OrderTracker[] {
    return Array.from(this.activeOrders.values());
  }

  /**
   * Get order by ID
   */
  getOrder(orderId: string): OrderTracker | null {
    return this.activeOrders.get(orderId) ||
           this.orderHistory.find(o => o.orderId === orderId || o.clientOrderId === orderId) || null;
  }

  /**
   * Get order history
   */
  getOrderHistory(limit?: number): OrderTracker[] {
    const history = [...this.orderHistory].reverse(); // Most recent first
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get current positions
   */
  getPositions(): PositionData[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get position for a specific symbol
   */
  getPosition(symbol: string, exchange: string): PositionData | null {
    const key = `${symbol}|${exchange}`;
    return this.positions.get(key) || null;
  }

  /**
   * Get account information
   */
  getAccountInfo(): TradeAccount | null {
    return this.tradeAccount;
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return this.sierraService.getConnectionStatus();
  }

  /**
   * Get trading statistics
   */
  getTradingStatistics(): TradingStatistics {
    const allOrders = [...this.activeOrders.values(), ...this.orderHistory];

    const stats: TradingStatistics = {
      totalOrders: allOrders.length,
      successfulOrders: allOrders.filter(o => o.status === OrderStatus.FILLED).length,
      cancelledOrders: allOrders.filter(o => o.status === OrderStatus.CANCELLED).length,
      rejectedOrders: allOrders.filter(o => o.status === OrderStatus.REJECTED).length,
      totalVolume: allOrders.reduce((sum, o) => sum + o.filledQuantity, 0),
      totalCommission: 0, // Would be calculated from order data
      netProfit: Array.from(this.positions.values())
        .reduce((sum, p) => sum + p.UnrealizedProfitLoss + p.RealizedProfitLoss, 0),
      winRate: 0 // Would be calculated from profitable trades
    };

    if (stats.totalOrders > 0) {
      stats.winRate = (stats.successfulOrders / stats.totalOrders) * 100;
    }

    return stats;
  }

  /**
   * Close all positions for a symbol
   */
  async closePosition(symbol: string, exchange: string): Promise<boolean> {
    const position = this.getPosition(symbol, exchange);
    if (!position || position.PositionQuantity === 0) {
      return false;
    }

    const side: 'BUY' | 'SELL' = position.PositionQuantity > 0 ? 'SELL' : 'BUY';
    const quantity = Math.abs(position.PositionQuantity);

    return this.placeOrder({
      symbol,
      exchange,
      side,
      orderType: 'MARKET',
      quantity,
      clientId: `CLOSE_POSITION_${Date.now()}`
    }).then(() => true);
  }

  /**
   * Close all positions
   */
  async closeAllPositions(): Promise<boolean> {
    const promises = [];
    for (const position of this.positions.values()) {
      if (position.PositionQuantity !== 0) {
        promises.push(this.closePosition(position.Symbol, position.Exchange));
      }
    }

    await Promise.allSettled(promises);
    return true;
  }

  /**
   * Risk check before placing an order
   */
  private performRiskCheck(params: OrderParameters): { valid: boolean; reason?: string } {
    if (!this.tradeAccount) {
      return { valid: false, reason: 'Account information not available' };
    }

    // Check if we have enough buying power
    const requiredMargin = this.calculateRequiredMargin(params);
    if (requiredMargin > this.tradeAccount.AvailableFunds) {
      return { valid: false, reason: 'Insufficient buying power' };
    }

    // Check position size limits
    const maxPositionSize = this.tradeAccount.AccountBalance * 0.1; // 10% of account per position
    if (params.quantity * (params.price || 100) > maxPositionSize) {
      return { valid: false, reason: 'Position size exceeds limit' };
    }

    return { valid: true };
  }

  /**
   * Calculate required margin for an order
   */
  private calculateRequiredMargin(params: OrderParameters): number {
    const price = params.price || params.stopPrice || 100; // Default estimate
    return params.quantity * price * 0.1; // Assume 10% margin requirement
  }

  /**
   * Load account information
   */
  private async loadAccountInfo(): Promise<void> {
    return new Promise((resolve) => {
      const handleAccountInfo = (account: TradeAccount) => {
        this.tradeAccount = account;
        this.sierraService.off('accountInfo', handleAccountInfo);
        resolve();
      };

      this.sierraService.on('accountInfo', handleAccountInfo);
      this.sierraService.requestAccountInfo();
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    const handlers: SierraChartEventHandlers = {
      onOrderUpdate: (orderUpdate: OrderUpdateReport) => {
        this.handleOrderUpdate(orderUpdate);
      },
      onPositionUpdate: (position: PositionData) => {
        this.handlePositionUpdate(position);
      },
      onError: (error: Error) => {
        this.emit('error', error);
      }
    };

    this.sierraService.setEventHandlers(handlers);
  }

  /**
   * Handle order updates from SierraChart
   */
  private handleOrderUpdate(orderUpdate: OrderUpdateReport): void {
    const order = this.activeOrders.get(orderUpdate.OrderID);
    if (!order) {
      // New order we didn't track, create a new tracker
      const newOrder: OrderTracker = {
        orderId: orderUpdate.OrderID,
        clientOrderId: orderUpdate.ClientOrderID,
        symbol: orderUpdate.Symbol,
        exchange: orderUpdate.Exchange,
        orderType: '', // Would need to be tracked separately
        quantity: orderUpdate.FilledQuantity + orderUpdate.RemainingQuantity,
        buySell: '', // Would need to be tracked separately
        status: orderUpdate.OrderStatus,
        filledQuantity: orderUpdate.FilledQuantity,
        remainingQuantity: orderUpdate.RemainingQuantity,
        averageFillPrice: orderUpdate.AverageFillPrice,
        createTime: new Date(),
        lastUpdateTime: new Date()
      };

      if (orderUpdate.OrderStatus === OrderStatus.FILLED ||
          orderUpdate.OrderStatus === OrderStatus.CANCELLED) {
        this.orderHistory.push(newOrder);
      } else {
        this.activeOrders.set(orderUpdate.OrderID, newOrder);
      }
    } else {
      // Update existing order
      order.status = orderUpdate.OrderStatus;
      order.filledQuantity = orderUpdate.FilledQuantity;
      order.remainingQuantity = orderUpdate.RemainingQuantity;
      order.averageFillPrice = orderUpdate.AverageFillPrice;
      order.lastUpdateTime = new Date();

      if (order.status === OrderStatus.FILLED || order.status === OrderStatus.CANCELLED) {
        this.activeOrders.delete(orderUpdate.OrderID);
        this.orderHistory.push(order);
      }
    }

    console.log(`Order update: ${orderUpdate.OrderID} - ${orderUpdate.OrderStatus}`);
    this.emit('orderUpdate', orderUpdate);
  }

  /**
   * Handle position updates from SierraChart
   */
  private handlePositionUpdate(position: PositionData): void {
    const key = `${position.Symbol}|${position.Exchange}`;
    this.positions.set(key, position);

    console.log(`Position update: ${position.Symbol} - ${position.PositionQuantity} @ ${position.AveragePrice}`);
    this.emit('positionUpdate', position);
  }

  /**
   * Disconnect from SierraChart
   */
  disconnect(): void {
    this.tradingEnabled = false;
    this.sierraService.disconnect();
  }
}