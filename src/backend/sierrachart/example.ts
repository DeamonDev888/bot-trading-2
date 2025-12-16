import { MarketDataManager } from './MarketDataManager';
import { TradingManager } from './TradingManager';
import { SierraChartService } from './SierraChartService';
import { SierraChartConfig } from './types';

// Configuration pour SierraChart
const config: SierraChartConfig = {
  host: 'localhost',
  port: 11099, // Port par défaut de SierraChart
  username: 'votre_utilisateur', // Optionnel
  password: 'votre_motdepasse', // Optionnel
  autoReconnect: true,
  heartbeatInterval: 30000,
  timeout: 10000
};

async function exampleMarketDataUsage() {
  console.log('=== Exemple d\'utilisation du Market Data Manager ===');

  const marketDataManager = new MarketDataManager(config);

  try {
    // Initialiser le gestionnaire de données de marché
    await marketDataManager.initialize();

    // S'abonner aux données de marché pour plusieurs symboles
    const symbols = [
      { symbol: 'ES', exchange: 'CME' },   // S&P 500 E-mini
      { symbol: 'NQ', exchange: 'CME' },   // NASDAQ 100 E-mini
      { symbol: 'YM', exchange: 'CBOT' },  // Dow Jones E-mini
      { symbol: 'GC', exchange: 'COMEX' }, // Gold
      { symbol: 'CL', exchange: 'NYMEX' }  // Crude Oil
    ];

    // S'abonner à chaque symbole
    symbols.forEach(({ symbol, exchange }) => {
      marketDataManager.subscribeToMarketData(
        symbol,
        exchange,
        (data) => {
          console.log(`${symbol}: Price=${data.LastTradePrice}, Volume=${data.Volume}, Bid=${data.BidPrice}, Ask=${data.AskPrice}`);
        },
        1 // Intervalle de 1 minute
      );
    });

    // Écouter les mises à jour de marché
    marketDataManager.on('marketDataUpdate', (data) => {
      console.log(`Market Update: ${data.Symbol} - Last: ${data.LastTradePrice}, Volume: ${data.Volume}`);
    });

    // Écouter les changements de connexion
    marketDataManager.on('connectionStatusChange', (status) => {
      console.log(`Connection status: ${status.isConnected ? 'Connected' : 'Disconnected'}`);
    });

    // Attendre un peu pour recevoir des données
    await new Promise(resolve => setTimeout(resolve, 60000));

    // Afficher les statistiques
    const stats = marketDataManager.getMarketDataStats();
    console.log('Statistics:', stats);

    // Obtenir les données actuelles pour un symbole
    const currentData = marketDataManager.getCurrentMarketData('ES', 'CME');
    if (currentData) {
      console.log('Current ES data:', currentData);

      // Calculer les indicateurs techniques
      const indicators = marketDataManager.calculateTechnicalIndicators('ES', 'CME', 20);
      console.log('ES Technical Indicators:', indicators);
    }

    // Obtenir l'historique récent
    const history = marketDataManager.getHistoricalMarketData('ES', 'CME', 10);
    console.log(`Last 10 ES updates:`, history.length);

  } catch (error) {
    console.error('Error in market data example:', error);
  } finally {
    marketDataManager.disconnect();
  }
}

async function exampleTradingUsage() {
  console.log('=== Exemple d\'utilisation du Trading Manager ===');

  const tradingManager = new TradingManager(config);

  try {
    // Initialiser le gestionnaire de trading
    await tradingManager.initialize();

    // Obtenir les informations du compte
    const accountInfo = tradingManager.getAccountInfo();
    if (accountInfo) {
      console.log('Account Info:', {
        balance: accountInfo.AccountBalance,
        available: accountInfo.AvailableFunds,
        currency: accountInfo.AccountCurrency
      });
    }

    // Activer le trading
    tradingManager.setTradingEnabled(true);

    // Écouter les événements de trading
    tradingManager.on('orderPlaced', (order) => {
      console.log(`Order placed: ${order.orderId} - ${order.buySell} ${order.quantity} ${order.symbol}`);
    });

    tradingManager.on('orderUpdate', (update) => {
      console.log(`Order update: ${update.OrderID} - Status: ${update.OrderStatus}, Filled: ${update.FilledQuantity}`);
    });

    tradingManager.on('positionUpdate', (position) => {
      console.log(`Position: ${position.Symbol} - Qty: ${position.PositionQuantity}, P&L: ${position.UnrealizedProfitLoss}`);
    });

    // Exemple d'ordres (désactivés pour éviter les trades réels)
    const tradingEnabled = false; // Mettre à true pour activer les trades réels

    if (tradingEnabled) {
      // Ordre au marché
      const marketOrderId = await tradingManager.placeOrder({
        symbol: 'ES',
        exchange: 'CME',
        side: 'BUY',
        orderType: 'MARKET',
        quantity: 1,
        clientId: 'MARKET_BUY_EXAMPLE'
      });

      // Ordre limite
      const limitOrderId = await tradingManager.placeOrder({
        symbol: 'NQ',
        exchange: 'CME',
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: 1,
        price: 15000, // Prix limite fictif
        timeInForce: 'DAY',
        clientId: 'LIMIT_BUY_EXAMPLE'
      });

      // Ordre stop
      const stopOrderId = await tradingManager.placeOrder({
        symbol: 'YM',
        exchange: 'CBOT',
        side: 'SELL',
        orderType: 'STOP',
        quantity: 1,
        stopPrice: 35000, // Prix stop fictif
        clientId: 'STOP_SELL_EXAMPLE'
      });

      console.log('Orders placed:', { marketOrderId, limitOrderId, stopOrderId });

      // Attendre un peu
      await new Promise(resolve => setTimeout(resolve, 30000));

      // Annuler tous les ordres actifs
      const activeOrders = tradingManager.getActiveOrders();
      for (const order of activeOrders) {
        await tradingManager.cancelOrder(order.orderId);
      }

      // Fermer toutes les positions
      await tradingManager.closeAllPositions();
    }

    // Afficher les statistiques de trading
    const stats = tradingManager.getTradingStatistics();
    console.log('Trading Statistics:', stats);

    // Afficher les positions actuelles
    const positions = tradingManager.getPositions();
    console.log('Current positions:', positions.length);

  } catch (error) {
    console.error('Error in trading example:', error);
  } finally {
    tradingManager.disconnect();
  }
}

async function exampleCombinedUsage() {
  console.log('=== Exemple d\'utilisation combinée ===');

  const marketDataManager = new MarketDataManager(config);
  const tradingManager = new TradingManager(config);

  try {
    // Initialiser les deux gestionnaires
    await Promise.all([
      marketDataManager.initialize(),
      tradingManager.initialize()
    ]);

    // Système de trading simple basé sur les indicateurs techniques
    const symbol = 'ES';
    const exchange = 'CME';

    // S'abonner aux données de marché
    marketDataManager.subscribeToMarketData(
      symbol,
      exchange,
      async (data) => {
        console.log(`${symbol} Update: Price=${data.LastTradePrice}, Bid=${data.BidPrice}, Ask=${data.AskPrice}`);

        // Calculer les indicateurs techniques
        const indicators = marketDataManager.calculateTechnicalIndicators(symbol, exchange, 20);

        if (indicators && indicators.sma && indicators.rsi) {
          console.log(`Indicators: SMA=${indicators.sma.toFixed(2)}, RSI=${indicators.rsi.toFixed(2)}`);

          // Stratégie simple: acheter quand RSI < 30 et prix > SMA, vendre quand RSI > 70
          const currentPrice = data.LastTradePrice;
          const tradingEnabled = false; // Mettre à true pour activer les trades automatiques

          if (tradingEnabled && currentPrice) {
            const currentPositions = tradingManager.getPositions();
            const currentPosition = tradingManager.getPosition(symbol, exchange);

            if (indicators.rsi < 30 && currentPrice > indicators.sma && (!currentPosition || currentPosition.PositionQuantity <= 0)) {
              // Signal d'achat
              console.log('BUY SIGNAL - RSI oversold and price above SMA');
              await tradingManager.placeOrder({
                symbol,
                exchange,
                side: 'BUY',
                orderType: 'MARKET',
                quantity: 1,
                clientId: `RSI_BUY_${Date.now()}`
              });
            } else if (indicators.rsi > 70 && currentPosition && currentPosition.PositionQuantity > 0) {
              // Signal de vente
              console.log('SELL SIGNAL - RSI overbought');
              await tradingManager.placeOrder({
                symbol,
                exchange,
                side: 'SELL',
                orderType: 'MARKET',
                quantity: Math.abs(currentPosition.PositionQuantity),
                clientId: `RSI_SELL_${Date.now()}`
              });
            }
          }
        }
      },
      1 // Intervalle de 1 minute
    );

    // Laisser tourner pendant un certain temps
    console.log('Trading system running... Press Ctrl+C to stop');
    await new Promise(resolve => setTimeout(resolve, 300000)); // 5 minutes

  } catch (error) {
    console.error('Error in combined example:', error);
  } finally {
    marketDataManager.disconnect();
    tradingManager.disconnect();
  }
}

// Exécuter les exemples
async function runExamples() {
  console.log('Démarrage des exemples SierraChart...\n');

  try {
    // Exécuter chaque exemple
    await exampleMarketDataUsage();
    await new Promise(resolve => setTimeout(resolve, 5000));

    await exampleTradingUsage();
    await new Promise(resolve => setTimeout(resolve, 5000));

    await exampleCombinedUsage();

  } catch (error) {
    console.error('Error running examples:', error);
  }

  console.log('\nExemples terminés.');
}

// Exporter les exemples pour utilisation externe
export {
  exampleMarketDataUsage,
  exampleTradingUsage,
  exampleCombinedUsage,
  runExamples,
  config
};

// Exécuter les exemples si ce fichier est lancé directement
if (require.main === module) {
  runExamples().catch(console.error);
}