// Exporter les services principaux
export { SierraChartService } from './SierraChartService';
export { MarketDataManager } from './MarketDataManager';
export { TradingManager } from './TradingManager';

// Exporter les exemples
export {
  exampleMarketDataUsage,
  exampleTradingUsage,
  exampleCombinedUsage,
  runExamples,
  config as exampleConfig
} from './example';

// Importer les dépendances pour vérification
import { SierraChartService } from './SierraChartService';
import { MarketDataManager } from './MarketDataManager';
import { TradingManager } from './TradingManager';
import { SierraChartConfig } from './types';

/**
 * Point d'entrée principal pour l'intégration SierraChart
 *
 * Cette bibliothèque fournit une interface complète pour communiquer avec
 * SierraChart via le protocole DTC (Data Trading Communication).
 *
 * Fonctionnalités principales:
 * - Connexion et authentification avec SierraChart
 * - Gestion des données de marché en temps réel
 * - Exécution d'ordres de trading
 * - Suivi des positions et du compte
 * - Calcul d'indicateurs techniques
 *
 * @example
 * ```typescript
 * import { MarketDataManager, TradingManager, SierraChartConfig } from './index';
 *
 * const config: SierraChartConfig = {
 *   host: 'localhost',
 *   port: 11099,
 *   autoReconnect: true
 * };
 *
 * // Utilisation pour les données de marché
 * const marketData = new MarketDataManager(config);
 * await marketData.initialize();
 *
 * marketData.subscribeToMarketData('ES', 'CME', (data) => {
 *   console.log(`ES Price: ${data.LastTradePrice}`);
 * });
 *
 * // Utilisation pour le trading
 * const trading = new TradingManager(config);
 * await trading.initialize();
 *
 * await trading.placeOrder({
 *   symbol: 'ES',
 *   exchange: 'CME',
 *   side: 'BUY',
 *   orderType: 'MARKET',
 *   quantity: 1
 * });
 * ```
 */

/**
 * Version de la bibliothèque
 */
export const VERSION = '1.0.0';

/**
 * Crée une instance de MarketDataManager avec configuration par défaut
 */
export function createMarketDataManager(config?: Partial<SierraChartConfig>): MarketDataManager {
  const defaultConfig: SierraChartConfig = {
    host: 'localhost',
    port: 11099,
    autoReconnect: true,
    heartbeatInterval: 30000,
    timeout: 10000,
    ...config
  };

  return new MarketDataManager(defaultConfig);
}

/**
 * Crée une instance de TradingManager avec configuration par défaut
 */
export function createTradingManager(config?: Partial<SierraChartConfig>): TradingManager {
  const defaultConfig: SierraChartConfig = {
    host: 'localhost',
    port: 11099,
    autoReconnect: true,
    heartbeatInterval: 30000,
    timeout: 10000,
    ...config
  };

  return new TradingManager(defaultConfig);
}

/**
 * Crée une instance de SierraChartService avec configuration par défaut
 */
export function createSierraChartService(config?: Partial<SierraChartConfig>): SierraChartService {
  const defaultConfig: SierraChartConfig = {
    host: 'localhost',
    port: 11099,
    autoReconnect: true,
    heartbeatInterval: 30000,
    timeout: 10000,
    ...config
  };

  return new SierraChartService(defaultConfig);
}

/**
 * Vérifie la connexion avec SierraChart
 */
export async function testConnection(config?: Partial<SierraChartConfig>): Promise<boolean> {
  const service = createSierraChartService(config);

  try {
    await service.connect();
    service.disconnect();
    return true;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
}

/**
 * Informations sur la bibliothèque
 */
export const LIBRARY_INFO = {
  name: 'SierraChart Integration',
  version: VERSION,
  description: 'Interface TypeScript pour SierraChart avec protocole DTC',
  author: 'Financial Analyst Project',
  repository: 'https://github.com/your-repo/financial-analyst',
  features: [
    'Connexion DTC à SierraChart',
    'Données de marché en temps réel',
    'Exécution d\'ordres',
    'Gestion des positions',
    'Indicateurs techniques',
    'Reconnexion automatique',
    'Gestion des erreurs',
    'Support TypeScript'
  ],
  supportedExchanges: [
    'CME', 'CBOT', 'NYMEX', 'COMEX', 'EUREX', 'LIFFE', 'SGX', 'TSE'
  ],
  supportedOrderTypes: [
    'MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT'
  ],
  supportedTimeInForce: [
    'DAY', 'GTC', 'IOC', 'FOK'
  ]
};

/**
 * Types exportés pour personnalisation
 */
export type {
  SierraChartConfig,
  MarketDataRequest,
  MarketDataUpdate,
  OrderRequest,
  PositionData,
  TradeAccount,
  OrderStatus,
  SierraChartConnectionStatus,
  SierraChartEventHandlers,
  OrderUpdateReport
} from './types';

// Types additionnels depuis les fichiers spécifiques
export type { MarketDataSubscriber, MarketDataHistory } from './MarketDataManager';
export type { OrderTracker, OrderParameters, TradingStatistics } from './TradingManager';