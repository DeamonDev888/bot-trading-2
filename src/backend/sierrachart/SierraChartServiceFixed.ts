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

/**
 * Version corrigée du service SierraChart DTC
 * Implémentation correcte du protocole DTC avec les bons formats de message
 */
export class SierraChartServiceFixed extends EventEmitter {
  private socket: net.Socket | null = null;
  private config: SierraChartConfig;
  private connectionStatus: SierraChartConnectionStatus;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private eventHandlers: SierraChartEventHandlers = {};
  private requestId = 1;
  private isConnected = false;

  // DTC Protocol constants (version corrigée)
  private readonly PROTOCOL_VERSION = 1;
  private readonly MSG_TYPE = {
    // Messages envoyés
    LOGON_REQUEST: 1,
    HEARTBEAT: 3,
    MARKET_DATA_REQUEST: 10,
    TRADE_ACCOUNT_REQUEST: 20,
    ORDER_ACTION_REQUEST: 30,

    // Messages reçus
    LOGON_RESPONSE: 2,
    HEARTBEAT_RESPONSE: 3,
    MARKET_DATA_UPDATE: 11,
    TRADE_ACCOUNT_RESPONSE: 21,
    ORDER_UPDATE_REPORT: 31,
    POSITION_UPDATE_REPORT: 32,
    MARKET_DATA_REJECT: 12,
    GENERAL_ERROR: 100
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

        // Configuration du socket
        this.socket.setNoDelay(true);
        this.socket.setKeepAlive(true, 30000);

        this.socket.connect(this.config.port!, this.config.host!, () => {
          console.log('✅ Connexion TCP établie avec SierraChart');
          this.sendLogonRequest();
        });

        this.socket.on('data', (data: Buffer) => {
          this.handleMessage(data);
        });

        this.socket.on('error', (error: Error) => {
          this.handleError(error);
          if (!this.isConnected) {
            reject(error);
          }
        });

        this.socket.on('close', () => {
          this.handleDisconnect();
        });

        // Timeout
        if (this.config.timeout) {
          this.socket.setTimeout(this.config.timeout);
          this.socket.on('timeout', () => {
            this.socket?.destroy();
            reject(new Error('Connection timeout'));
          });
        }

        this.on('authenticated', () => {
          this.isConnected = true;
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

    this.isConnected = false;
    this.connectionStatus.isConnected = false;

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

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
    if (!this.isConnected) {
      throw new Error('Not connected to SierraChart');
    }

    const message = this.encodeMarketDataRequest(request);
    this.sendMessage(message);
    console.log(`📤 Demande de données de marché envoyée pour ${request.Symbol}`);
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): SierraChartConnectionStatus {
    return { ...this.connectionStatus };
  }

  // Private methods

  private sendLogonRequest(): void {
    console.log('🔐 Envoi de la demande d\'authentification...');

    // Format corrigé du message LOGON
    const message = Buffer.alloc(128); // Taille fixe

    // Header DTC
    message.writeUInt16LE(this.MSG_TYPE.LOGON_REQUEST, 0);     // Message Type
    message.writeUInt16LE(this.PROTOCOL_VERSION, 2);          // Protocol Version
    message.writeUInt32LE(128, 4);                           // Message Length

    // Username et password (64 bytes chacun, terminés par null)
    if (this.config.username) {
      const usernameBytes = Buffer.from(this.config.username, 'utf8');
      usernameBytes.copy(message, 8, 0, Math.min(usernameBytes.length, 63));
    }

    if (this.config.password) {
      const passwordBytes = Buffer.from(this.config.password, 'utf8');
      passwordBytes.copy(message, 72, 0, Math.min(passwordBytes.length, 63));
    }

    this.sendMessage(message);
  }

  private sendHeartbeat(): void {
    const message = Buffer.alloc(12);
    message.writeUInt16LE(this.MSG_TYPE.HEARTBEAT, 0);
    message.writeUInt16LE(this.PROTOCOL_VERSION, 2);
    message.writeUInt32LE(12, 4);
    message.writeUInt32LE(Date.now(), 8); // Timestamp

    this.sendMessage(message);
  }

  private encodeMarketDataRequest(request: MarketDataRequest): Buffer {
    const symbolBytes = Buffer.from(request.Symbol, 'utf8');
    const exchangeBytes = Buffer.from(request.Exchange, 'utf8');

    const message = Buffer.alloc(256);

    // Header
    message.writeUInt16LE(this.MSG_TYPE.MARKET_DATA_REQUEST, 0);
    message.writeUInt16LE(this.PROTOCOL_VERSION, 2);
    message.writeUInt32LE(256, 4);

    // Request ID
    message.writeUInt32LE(request.RequestID, 8);

    // Symbol (max 64 bytes)
    symbolBytes.copy(message, 12, 0, Math.min(symbolBytes.length, 63));

    // Exchange (max 32 bytes)
    exchangeBytes.copy(message, 76, 0, Math.min(exchangeBytes.length, 31));

    // Interval
    message.writeUInt16LE(request.Interval, 108);

    // Flags
    const flags = request.UseZCompression ? 1 : 0;
    message.writeUInt16LE(flags, 110);

    return message;
  }

  private sendMessage(message: Buffer): void {
    if (this.socket && this.isConnected) {
      this.socket.write(message);
    }
  }

  private handleMessage(data: Buffer) {
    try {
      if (data.length < 8) {
        console.warn('⚠️ Message trop court, ignoré');
        return;
      }

      // Lire le header
      const messageType = data.readUInt16LE(0);
      const protocolVersion = data.readUInt16LE(2);
      const messageLength = data.readUInt32LE(4);

      console.log(`📥 Message reçu: Type=${messageType}, Version=${protocolVersion}, Length=${messageLength}`);

      switch (messageType) {
        case this.MSG_TYPE.LOGON_RESPONSE:
          this.handleLogonResponse(data);
          break;
        case this.MSG_TYPE.HEARTBEAT_RESPONSE:
          this.handleHeartbeatResponse();
          break;
        case this.MSG_TYPE.MARKET_DATA_UPDATE:
          this.handleMarketDataUpdate(data);
          break;
        case this.MSG_TYPE.MARKET_DATA_REJECT:
          this.handleMarketDataReject(data);
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
        case this.MSG_TYPE.GENERAL_ERROR:
          this.handleGeneralError(data);
          break;
        default:
          console.warn(`⚠️ Type de message inconnu: ${messageType}`);
          // Log des premiers bytes pour debug
          const hexBytes = Array.from(data.slice(0, Math.min(32, data.length)))
            .map(b => b.toString(16).padStart(2, '0')).join(' ');
          console.log(`📦 Bytes: ${hexBytes}`);
      }
    } catch (error) {
      console.error('❌ Erreur de traitement du message:', error);
    }
  }

  private handleLogonResponse(data: Buffer) {
    if (data.length < 12) {
      console.error('❌ Réponse LOGON trop courte');
      return;
    }

    const result = data.readUInt8(8);
    const rejectReasonCode = data.readUInt8(9);

    if (result === 1) {
      console.log('✅ Authentification réussie!');
      this.isConnected = true;
      this.emit('authenticated');
    } else {
      console.log(`❌ Authentification échouée. Code erreur: ${rejectReasonCode}`);

      // Lire le message d'erreur s'il existe
      if (data.length > 12) {
        const errorMessage = data.toString('utf8', 12, Math.min(data.length, 12 + 128)).replace(/\0/g, '');
        console.log(`Message: ${errorMessage}`);
      }

      this.connectionStatus.lastError = `Authentication failed: ${rejectReasonCode}`;
      this.handleError(new Error('Authentication failed'));
    }
  }

  private handleHeartbeatResponse() {
    this.connectionStatus.lastHeartbeat = new Date();
    console.log('💓 Heartbeat reçu');
  }

  private handleMarketDataUpdate(data: Buffer) {
    if (data.length < 128) {
      console.warn('⚠️ Market data update trop court');
      return;
    }

    // Parser les données de marché
    const update: MarketDataUpdate = {
      Symbol: data.toString('utf8', 12, 76).replace(/\0/g, ''),
      Exchange: data.toString('utf8', 76, 108).replace(/\0/g, ''),
    };

    // Prix et volumes (double precision)
    const lastTradePrice = data.readDoubleLE(108);
    const lastTradeVolume = data.readUInt32LE(116);
    const bidPrice = data.readDoubleLE(120);
    const askPrice = data.readDoubleLE(128);

    if (lastTradePrice > 0) update.LastTradePrice = lastTradePrice;
    if (lastTradeVolume > 0) update.LastTradeVolume = lastTradeVolume;
    if (bidPrice > 0) update.BidPrice = bidPrice;
    if (askPrice > 0) update.AskPrice = askPrice;

    console.log(`📈 Données marché reçues: ${update.Symbol}=${update.LastTradePrice}`);

    this.eventHandlers.onMarketDataUpdate?.(update);
    this.emit('marketDataUpdate', update);
  }

  private handleMarketDataReject(data: Buffer) {
    if (data.length < 16) return;

    const requestId = data.readUInt32LE(8);
    const rejectReasonCode = data.readUInt16LE(12);

    console.warn(`⚠️ Market data request ${requestId} rejeté. Code: ${rejectReasonCode}`);
  }

  private handleTradeAccountResponse(data: Buffer) {
    // Implémentation à compléter si nécessaire
    console.log('📊 Account info reçue');
  }

  private handleOrderUpdate(data: Buffer) {
    // Implémentation à compléter si nécessaire
    console.log('📋 Order update reçu');
  }

  private handlePositionUpdate(data: Buffer) {
    // Implémentation à compléter si nécessaire
    console.log('📊 Position update reçu');
  }

  private handleGeneralError(data: Buffer) {
    if (data.length > 8) {
      const errorCode = data.readUInt16LE(8);
      const errorMessage = data.toString('utf8', 10, Math.min(data.length, 10 + 128)).replace(/\0/g, '');
      console.error(`❌ Erreur générale ${errorCode}: ${errorMessage}`);
    }
  }

  private handleError(error: Error): void {
    this.connectionStatus.lastError = error.message;
    this.eventHandlers.onError?.(error);
    this.emit('error', error);
  }

  private handleDisconnect(): void {
    this.isConnected = false;
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

      console.log(`🔄 Tentative de reconnexion ${this.connectionStatus.reconnectAttempts}...`);
      this.connect().catch(error => {
        console.error('❌ Reconnexion échouée:', error);
      });
    }, delay);
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) return;

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.sendHeartbeat();
      }
    }, this.config.heartbeatInterval);
  }

  private notifyConnectionStatusChange(): void {
    this.eventHandlers.onConnectionStatusChange?.(this.connectionStatus);
    this.emit('connectionStatusChange', this.connectionStatus);
  }
}