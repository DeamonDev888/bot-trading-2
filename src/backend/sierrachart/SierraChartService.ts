import { EventEmitter } from 'events';
import * as net from 'net';
import {
  SierraChartConfig,
  SierraChartConnectionStatus,
  SierraChartEventHandlers,
  MarketDataRequest,
  MarketDataUpdate,
  OrderRequest,
  PositionData,
  TradeAccount,
  OrderUpdateReport,
  OrderStatus
} from './types';

export class SierraChartService extends EventEmitter {
  private socket: net.Socket | null = null;
  private config: SierraChartConfig;
  private connectionStatus: SierraChartConnectionStatus;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private eventHandlers: SierraChartEventHandlers = {};
  private requestId = 1;

  // DTC Protocol constants
  private readonly PROTOCOL_VERSION = 1;
  private readonly MSG_TYPE = {
    LOGON_REQUEST: 1,
    LOGON_RESPONSE: 2,
    HEARTBEAT: 3,
    MARKET_DATA_REQUEST: 10,
    MARKET_DATA_UPDATE: 11,
    TRADE_ACCOUNT_REQUEST: 20,
    TRADE_ACCOUNT_RESPONSE: 21,
    ORDER_ACTION_REQUEST: 30,
    ORDER_UPDATE_REPORT: 31,
    POSITION_UPDATE_REPORT: 32,
  };

  constructor(config: SierraChartConfig) {
    super();
    this.config = {
      host: config.host || 'localhost',
      port: config.port || 11099,
      username: config.username,
      password: config.password,
      autoReconnect: config.autoReconnect ?? true,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      timeout: config.timeout ?? 10000,
    };

    this.connectionStatus = {
      isConnected: false,
      reconnectAttempts: 0,
    };
  }

  /**
   * Connect to SierraChart server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new net.Socket();

        this.socket.connect(this.config.port!, this.config.host!, () => {
          console.log(`Connected to SierraChart at ${this.config.host}:${this.config.port}`);
          this.sendLogonRequest();
        });

        this.socket.on('data', (data: Buffer) => {
          this.handleMessage(data);
        });

        this.socket.on('error', (error: Error) => {
          this.handleError(error);
          if (!this.connectionStatus.isConnected) {
            reject(error);
          }
        });

        this.socket.on('close', () => {
          this.handleDisconnect();
        });

        // Set timeout
        if (this.config.timeout) {
          this.socket.setTimeout(this.config.timeout);
          this.socket.on('timeout', () => {
            this.socket?.destroy();
            reject(new Error('Connection timeout'));
          });
        }

        this.on('authenticated', () => {
          this.connectionStatus.isConnected = true;
          this.connectionStatus.lastHeartbeat = new Date();
          this.connectionStatus.reconnectAttempts = 0;
          this.startHeartbeat();
          this.notifyConnectionStatusChange();
          resolve();
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from SierraChart server
   */
  disconnect(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    this.connectionStatus.isConnected = false;
    this.notifyConnectionStatusChange();
  }

  /**
   * Set event handlers
   */
  setEventHandlers(handlers: SierraChartEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  /**
   * Request market data for a symbol
   */
  requestMarketData(request: MarketDataRequest): void {
    if (!this.connectionStatus.isConnected) {
      throw new Error('Not connected to SierraChart');
    }

    const message = this.encodeMarketDataRequest(request);
    this.sendMessage(message);
  }

  /**
   * Place an order
   */
  placeOrder(order: OrderRequest): void {
    if (!this.connectionStatus.isConnected) {
      throw new Error('Not connected to SierraChart');
    }

    const message = this.encodeOrderRequest(order);
    this.sendMessage(message);
  }

  /**
   * Request account information
   */
  requestAccountInfo(): void {
    if (!this.connectionStatus.isConnected) {
      throw new Error('Not connected to SierraChart');
    }

    const message = this.encodeTradeAccountRequest();
    this.sendMessage(message);
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): SierraChartConnectionStatus {
    return { ...this.connectionStatus };
  }

  // Private methods

  private sendLogonRequest(): void {
    const message = this.encodeLogonRequest();
    this.sendMessage(message);
  }

  private sendMessage(message: Buffer): void {
    if (this.socket && this.connectionStatus.isConnected) {
      this.socket.write(message);
    }
  }

  private handleMessage(data: Buffer): void {
    try {
      // Simple message parsing - in real implementation, this would be more sophisticated
      const messageType = this.readMessageType(data);

      switch (messageType) {
        case this.MSG_TYPE.LOGON_RESPONSE:
          this.handleLogonResponse(data);
          break;
        case this.MSG_TYPE.HEARTBEAT:
          this.handleHeartbeat();
          break;
        case this.MSG_TYPE.MARKET_DATA_UPDATE:
          this.handleMarketDataUpdate(data);
          break;
        case this.MSG_TYPE.TRADE_ACCOUNT_RESPONSE:
          this.handleTradeAccountResponse(data);
          break;
        case this.MSG_TYPE.ORDER_UPDATE_REPORT:
          this.handleOrderUpdate(data);
          break;
        case this.MSG_TYPE.POSITION_UPDATE_REPORT:
          this.handlePositionUpdate(data);
          break;
        default:
          console.warn(`Unknown message type: ${messageType}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  private readMessageType(data: Buffer): number {
    // Assuming message type is the first 2 bytes (little endian)
    return data.readUInt16LE(0);
  }

  private handleLogonResponse(data: Buffer): void {
    // Parse logon response
    const success = data.readUInt8(2) === 1;
    if (success) {
      this.emit('authenticated');
    } else {
      const error = new Error('Authentication failed');
      this.handleError(error);
    }
  }

  private handleHeartbeat(): void {
    this.connectionStatus.lastHeartbeat = new Date();

    // Respond with heartbeat
    const message = this.encodeHeartbeat();
    this.sendMessage(message);
  }

  private handleMarketDataUpdate(data: Buffer): void {
    // Parse market data update
    const update = this.parseMarketDataUpdate(data);
    this.eventHandlers.onMarketDataUpdate?.(update);
    this.emit('marketDataUpdate', update);
  }

  private handleTradeAccountResponse(data: Buffer): void {
    // Parse account response
    const account = this.parseTradeAccountResponse(data);
    this.emit('accountInfo', account);
  }

  private handleOrderUpdate(data: Buffer): void {
    // Parse order update
    const orderUpdate = this.parseOrderUpdate(data);
    this.eventHandlers.onOrderUpdate?.(orderUpdate);
    this.emit('orderUpdate', orderUpdate);
  }

  private handlePositionUpdate(data: Buffer): void {
    // Parse position update
    const position = this.parsePositionUpdate(data);
    this.eventHandlers.onPositionUpdate?.(position);
    this.emit('positionUpdate', position);
  }

  private handleError(error: Error): void {
    this.connectionStatus.lastError = error.message;
    this.eventHandlers.onError?.(error);
    this.emit('error', error);
  }

  private handleDisconnect(): void {
    this.connectionStatus.isConnected = false;
    this.notifyConnectionStatusChange();

    if (this.config.autoReconnect) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    const delay = Math.min(1000 * Math.pow(2, this.connectionStatus.reconnectAttempts), 30000);

    this.reconnectTimer = setTimeout(() => {
      this.connectionStatus.reconnectAttempts++;
      this.reconnectTimer = null;

      console.log(`Attempting to reconnect (${this.connectionStatus.reconnectAttempts})...`);
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) return;

    this.heartbeatTimer = setInterval(() => {
      const message = this.encodeHeartbeat();
      this.sendMessage(message);
    }, this.config.heartbeatInterval);
  }

  private notifyConnectionStatusChange(): void {
    this.eventHandlers.onConnectionStatusChange?.(this.connectionStatus);
    this.emit('connectionStatusChange', this.connectionStatus);
  }

  // Message encoding methods (simplified)
  private encodeLogonRequest(): Buffer {
    const message = Buffer.alloc(64);
    message.writeUInt16LE(this.MSG_TYPE.LOGON_REQUEST, 0);
    message.writeUInt16LE(this.PROTOCOL_VERSION, 2);

    // Write username and password if provided
    if (this.config.username) {
      message.write(this.config.username, 4, 32, 'utf8');
    }
    if (this.config.password) {
      message.write(this.config.password, 36, 32, 'utf8');
    }

    return message;
  }

  private encodeHeartbeat(): Buffer {
    const message = Buffer.alloc(2);
    message.writeUInt16LE(this.MSG_TYPE.HEARTBEAT, 0);
    return message;
  }

  private encodeMarketDataRequest(request: MarketDataRequest): Buffer {
    const message = Buffer.alloc(128);
    message.writeUInt16LE(this.MSG_TYPE.MARKET_DATA_REQUEST, 0);
    message.writeUInt16LE(request.RequestID, 2);
    message.write(request.Symbol, 4, 32, 'utf8');
    message.write(request.Exchange, 36, 16, 'utf8');
    message.writeUInt16LE(request.Interval, 52);

    return message;
  }

  private encodeOrderRequest(order: OrderRequest): Buffer {
    const message = Buffer.alloc(128);
    message.writeUInt16LE(this.MSG_TYPE.ORDER_ACTION_REQUEST, 0);
    message.writeUInt16LE(this.requestId++, 2);
    message.write(order.Symbol, 4, 32, 'utf8');
    message.write(order.Exchange, 36, 16, 'utf8');
    message.write(order.TradeAccount, 52, 32, 'utf8');
    message.write(order.OrderType, 84, 16, 'utf8');
    message.writeUInt32LE(order.OrderQuantity, 100);

    if (order.Price1 !== undefined) {
      message.writeDoubleLE(order.Price1, 104);
    }
    if (order.Price2 !== undefined) {
      message.writeDoubleLE(order.Price2, 112);
    }

    message.write(order.BuySell, 120, 4, 'utf8');
    message.write(order.TimeInForce, 124, 4, 'utf8');

    return message;
  }

  private encodeTradeAccountRequest(): Buffer {
    const message = Buffer.alloc(2);
    message.writeUInt16LE(this.MSG_TYPE.TRADE_ACCOUNT_REQUEST, 0);
    return message;
  }

  // Message parsing methods (simplified)
  private parseMarketDataUpdate(data: Buffer): MarketDataUpdate {
    const update: MarketDataUpdate = {
      Symbol: data.toString('utf8', 4, 36).replace(/\0/g, ''),
      Exchange: data.toString('utf8', 36, 52).replace(/\0/g, ''),
    };

    // Parse other fields based on their positions
    const lastTradePrice = data.readDoubleLE(52);
    if (lastTradePrice !== 0) update.LastTradePrice = lastTradePrice;

    const lastTradeVolume = data.readUInt32LE(60);
    if (lastTradeVolume !== 0) update.LastTradeVolume = lastTradeVolume;

    const bidPrice = data.readDoubleLE(64);
    if (bidPrice !== 0) update.BidPrice = bidPrice;

    const askPrice = data.readDoubleLE(72);
    if (askPrice !== 0) update.AskPrice = askPrice;

    return update;
  }

  private parseOrderUpdate(data: Buffer): OrderUpdateReport {
    const update: OrderUpdateReport = {
      OrderID: data.toString('utf8', 4, 36).replace(/\0/g, ''),
      Symbol: data.toString('utf8', 36, 68).replace(/\0/g, ''),
      Exchange: data.toString('utf8', 68, 84).replace(/\0/g, ''),
      OrderStatus: this.parseOrderStatus(data.readUInt16LE(84)),
      FilledQuantity: data.readUInt32LE(86),
      RemainingQuantity: data.readUInt32LE(90),
    };

    const avgFillPrice = data.readDoubleLE(94);
    if (avgFillPrice !== 0) update.AverageFillPrice = avgFillPrice;

    return update;
  }

  private parsePositionUpdate(data: Buffer): PositionData {
    const position: PositionData = {
      Symbol: data.toString('utf8', 4, 36).replace(/\0/g, ''),
      Exchange: data.toString('utf8', 36, 52).replace(/\0/g, ''),
      TradeAccount: data.toString('utf8', 52, 84).replace(/\0/g, ''),
      PositionQuantity: data.readInt32LE(84),
      AveragePrice: data.readDoubleLE(88),
      UnrealizedProfitLoss: data.readDoubleLE(96),
      RealizedProfitLoss: data.readDoubleLE(104),
    };

    return position;
  }

  private parseTradeAccountResponse(data: Buffer): TradeAccount {
    const account: TradeAccount = {
      TradeAccount: data.toString('utf8', 4, 36).replace(/\0/g, ''),
      AccountBalance: data.readDoubleLE(36),
      AvailableFunds: data.readDoubleLE(44),
      AccountCurrency: data.toString('utf8', 52, 56).replace(/\0/g, ''),
    };

    const margin = data.readDoubleLE(60);
    if (margin !== 0) account.MarginRequirement = margin;

    return account;
  }

  private parseOrderStatus(statusCode: number): OrderStatus {
    switch (statusCode) {
      case 1: return OrderStatus.NEW;
      case 2: return OrderStatus.PENDING;
      case 3: return OrderStatus.FILLED;
      case 4: return OrderStatus.CANCELLED;
      case 5: return OrderStatus.REJECTED;
      case 6: return OrderStatus.PARTIALLY_FILLED;
      default: return OrderStatus.NEW;
    }
  }
}