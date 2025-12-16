export interface DTCProtocol {
  // Message types
  LOGON_REQUEST: number;
  LOGON_RESPONSE: number;
  HEARTBEAT: number;
  MARKET_DATA_REQUEST: number;
  MARKET_DATA_UPDATE: number;
  TRADE_ACCOUNT_REQUEST: number;
  TRADE_ACCOUNT_RESPONSE: number;
  ORDER_ACTION_REQUEST: number;
  ORDER_UPDATE_REPORT: number;
  POSITION_UPDATE_REPORT: number;
}

export interface SierraChartConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  autoReconnect?: boolean;
  heartbeatInterval?: number;
  timeout?: number;
}

export interface MarketDataRequest {
  Symbol: string;
  Exchange: string;
  RequestID: number;
  Interval: number;
  UseZCompression?: boolean;
}

export interface MarketDataUpdate {
  Symbol: string;
  Exchange: string;
  LastTradePrice?: number;
  LastTradeVolume?: number;
  BidPrice?: number;
  AskPrice?: number;
  BidVolume?: number;
  AskVolume?: number;
  Open?: number;
  High?: number;
  Low?: number;
  Close?: number;
  Volume?: number;
  NumberOfTrades?: number;
  BidAskSize?: number;
  DateTime?: number;
}

export interface OrderRequest {
  Symbol: string;
  Exchange: string;
  TradeAccount: string;
  OrderType: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  OrderQuantity: number;
  Price1?: number; // Limit price or Stop price
  Price2?: number; // Stop limit price (second price)
  BuySell: 'BUY' | 'SELL';
  TimeInForce: 'DAY' | 'GTC' | 'IOC' | 'FOK';
  OrderID?: string;
  ClientOrderID?: string;
}

export interface PositionData {
  Symbol: string;
  Exchange: string;
  TradeAccount: string;
  PositionQuantity: number;
  AveragePrice: number;
  UnrealizedProfitLoss: number;
  RealizedProfitLoss: number;
  MarginRequirement?: number;
  PositionType?: 'LONG' | 'SHORT';
}

export interface TradeAccount {
  TradeAccount: string;
  AccountBalance: number;
  AvailableFunds: number;
  MarginRequirement?: number;
  AccountCurrency: string;
}

export enum OrderStatus {
  NEW = 'NEW',
  PENDING = 'PENDING',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED'
}

export interface SierraChartConnectionStatus {
  isConnected: boolean;
  lastHeartbeat?: Date;
  reconnectAttempts: number;
  lastError?: string;
}

export interface SierraChartEventHandlers {
  onMarketDataUpdate?: (data: MarketDataUpdate) => void;
  onOrderUpdate?: (order: OrderUpdateReport) => void;
  onPositionUpdate?: (position: PositionData) => void;
  onConnectionStatusChange?: (status: SierraChartConnectionStatus) => void;
  onError?: (error: Error) => void;
}

export interface OrderUpdateReport {
  OrderID: string;
  ClientOrderID?: string;
  Symbol: string;
  Exchange: string;
  OrderStatus: OrderStatus;
  FilledQuantity: number;
  RemainingQuantity: number;
  AverageFillPrice?: number;
  FillPrice?: number;
  LastFillDateTime?: number;
  TotalFillQuantity?: number;
  RejectMessage?: string;
}