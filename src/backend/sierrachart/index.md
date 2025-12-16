# Integration SierraChart

Ce dossier contient l'implémentation complète pour intégrer SierraChart dans le projet financier via le protocole DTC (Data Trading Communication).

## 📁 Fichiers

- **`index.ts`** - Point d'entrée principal exportant tous les services
- **`SierraChartService.ts`** - Service de base pour la connexion DTC
- **`MarketDataManager.ts`** - Gestionnaire des données de marché en temps réel
- **`TradingManager.ts`** - Gestionnaire pour l'exécution d'ordres et positions
- **`types.ts`** - Types et interfaces TypeScript
- **`example.ts`** - Exemples d'utilisation complets
- **`index.md`** - Documentation

## 🚀 Démarrage Rapide

### Installation des dépendances

```bash
npm install
# ou
pnpm install
```

### Configuration de base

```typescript
import { MarketDataManager, SierraChartConfig } from './index';

const config: SierraChartConfig = {
  host: 'localhost',
  port: 11099, // Port par défaut SierraChart
  autoReconnect: true,
  heartbeatInterval: 30000
};
```

### Utilisation des données de marché

```typescript
import { createMarketDataManager } from './index';

const marketData = createMarketDataManager({
  host: 'localhost',
  port: 11099
});

// Initialisation
await marketData.initialize();

// Abonnement aux données
marketData.subscribeToMarketData('ES', 'CME', (data) => {
  console.log(`Prix ES: ${data.LastTradePrice}`);
});

// Indicateurs techniques
const indicators = marketData.calculateTechnicalIndicators('ES', 'CME', 20);
```

### Trading

```typescript
import { createTradingManager } from './index';

const trading = createTradingManager();
await trading.initialize();

// Placer un ordre
await trading.placeOrder({
  symbol: 'ES',
  exchange: 'CME',
  side: 'BUY',
  orderType: 'MARKET',
  quantity: 1
});
```

## 📋 Fonctionnalités

### ✅ Connexion DTC
- Connexion sécurisée au serveur SierraChart
- Reconnexion automatique en cas de déconnexion
- Heartbeat pour maintenir la connexion active
- Gestion des erreurs de connexion

### ✅ Données de Marché
- Abonnement à plusieurs symboles simultanément
- Données en temps réel (prix, volume, bid/ask)
- Historique des données avec limite configurable
- Calcul d'indicateurs techniques (SMA, EMA, RSI, Bollinger Bands)
- Support de plusieurs exchanges (CME, CBOT, NYMEX, COMEX)

### ✅ Trading
- Ordres MARKET, LIMIT, STOP, STOP_LIMIT
- Gestion des ordres actifs et historique
- Suivi des positions en temps réel
- Informations du compte (balance, fonds disponibles)
- Contrôles de risque et limites de position
- Annulation et modification d'ordres

### ✅ Événements
- Notifications en temps réel pour tous les événements
- Callbacks personnalisables
- Gestion centralisée des erreurs
- Événements de connexion/déconnexion

## 🔧 Configuration

### Options de configuration

```typescript
interface SierraChartConfig {
  host: string;              // 'localhost' par défaut
  port: number;              // 11099 par défaut
  username?: string;         // Optionnel
  password?: string;         // Optionnel
  autoReconnect?: boolean;   // true par défaut
  heartbeatInterval?: number;// 30000ms par défaut
  timeout?: number;          // 10000ms par défaut
}
```

### Symboles supportés

- **Indices**: ES (S&P 500), NQ (NASDAQ 100), YM (Dow Jones)
- **Matières premières**: GC (Or), CL (Pétrole), SI (Argent)
- **Devises**: 6E (EUR/USD), 6J (USD/JPY), 6B (GBP/USD)
- **Obligations**: ZB (T-Bond), ZN (10-Year Note), ZF (5-Year Note)

## 📊 Exemples d'utilisation

### Surveillance de portefeuille

```typescript
const marketData = createMarketDataManager();

const symbols = [
  { symbol: 'ES', exchange: 'CME' },
  { symbol: 'NQ', exchange: 'CME' },
  { symbol: 'GC', exchange: 'COMEX' }
];

symbols.forEach(({ symbol, exchange }) => {
  marketData.subscribeToMarketData(symbol, exchange, (data) => {
    const indicators = marketData.calculateTechnicalIndicators(symbol, exchange);
    console.log(`${symbol}: ${data.LastTradePrice} | RSI: ${indicators?.rsi?.toFixed(2)}`);
  });
});
```

### Système de trading automatique

```typescript
const trading = createTradingManager();
const marketData = createMarketDataManager();

// Stratégie basée sur RSI
marketData.subscribeToMarketData('ES', 'CME', async (data) => {
  const indicators = marketData.calculateTechnicalIndicators('ES', 'CME', 14);
  const position = trading.getPosition('ES', 'CME');

  if (indicators?.rssi) {
    if (indicators.rsi < 30 && !position) {
      // Achat quand RSI < 30 (survente)
      await trading.placeOrder({
        symbol: 'ES',
        exchange: 'CME',
        side: 'BUY',
        orderType: 'MARKET',
        quantity: 1
      });
    } else if (indicators.rsi > 70 && position?.PositionQuantity > 0) {
      // Vente quand RSI > 70 (surachat)
      await trading.placeOrder({
        symbol: 'ES',
        exchange: 'CME',
        side: 'SELL',
        orderType: 'MARKET',
        quantity: position.PositionQuantity
      });
    }
  }
});
```

### Analyse de risque

```typescript
const trading = createTradingManager();

// Obtenir les statistiques de trading
const stats = trading.getTradingStatistics();
console.log('Win Rate:', stats.winRate + '%');
console.log('Total Volume:', stats.totalVolume);
console.log('Net P&L:', stats.netProfit);

// Surveiller les positions
const positions = trading.getPositions();
positions.forEach(position => {
  const riskPercent = (position.UnrealizedProfitLoss / trading.getAccountInfo()!.AccountBalance) * 100;
  if (Math.abs(riskPercent) > 5) { // 5% de risque
    console.warn(`High risk position: ${position.Symbol} (${riskPercent.toFixed(2)}%)`);
  }
});
```

## 🔍 Monitoring et Debug

### Événements de connexion

```typescript
const marketData = createMarketDataManager();

marketData.on('connectionStatusChange', (status) => {
  console.log('Connection:', status.isConnected);
  if (status.lastError) {
    console.error('Error:', status.lastError);
  }
});
```

### Logs détaillés

```typescript
const trading = createTradingManager();

trading.on('orderPlaced', (order) => {
  console.log(`Order placed: ${order.orderId}`);
});

trading.on('orderUpdate', (update) => {
  console.log(`Order ${update.OrderID}: ${update.OrderStatus}`);
});

trading.on('positionUpdate', (position) => {
  console.log(`Position ${position.Symbol}: ${position.PositionQuantity} @ ${position.AveragePrice}`);
});
```

## ⚠️ Considérations de sécurité

1. **Test en environnement démo** avant utilisation en production
2. **Limites de position** configurées par défaut (10% du capital par position)
3. **Trading désactivé** par défaut - activation explicite requise
4. **Validation des ordres** avant envoi
5. **Surveillance des erreurs** et déconnexions

## 🔗 Intégration avec le projet principal

Pour intégrer ce module SierraChart dans votre projet principal :

```typescript
// Dans votre service principal
import { MarketDataManager, TradingManager } from './backend/sierrachart';

class FinancialDataService {
  private marketData: MarketDataManager;
  private trading: TradingManager;

  constructor() {
    this.marketData = createMarketDataManager();
    this.trading = createTradingManager();
  }

  async initialize() {
    await Promise.all([
      this.marketData.initialize(),
      this.trading.initialize()
    ]);
  }

  // Méthodes pour interagir avec SierraChart...
}
```

## 📚 Référence API

Voir les fichiers TypeScript pour une documentation complète des interfaces et méthodes disponibles.

---

**Note**: Ce module SierraChart est configuré pour se connecter au port 11099. Assurez-vous que SierraChart est bien configuré pour accepter les connexions DTC sur ce port.
