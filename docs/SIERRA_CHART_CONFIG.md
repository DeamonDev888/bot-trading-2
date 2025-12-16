# Configuration Détaillée - Sierra Chart Integration

## Table des matières
1. [Configuration de Sierra Chart](#configuration-de-sierra-chart)
2. [Symboles supportés](#symboles-supportés)
3. [Format des fichiers](#format-des-fichiers)
4. [API et connexions](#api-et-connexions)
5. [Optimisation des performances](#optimisation-des-performances)
6. [Script de lecture automatisé](#script-de-lecture-automatisé)
7. [Dépannage Sierra Chart](#dépannage-sierra-chart)

## Configuration de Sierra Chart

### 1. Installation initiale

#### Téléchargement et installation
1. Téléchargez Sierra Chart depuis [sierrachart.com](https://www.sierrachart.com/)
2. Choisissez la version **64-bit** pour Windows Server
3. Installez dans `C:\SierraChart\` (recommandé)
4. Lancez Sierra Chart et complétez l'inscription

#### Configuration de base
1. **File** > **Open Global Settings**
2. Configurez les paramètres suivants:
   - **Data Files Location**: `C:\SierraChart\Data\`
   - **Number of days to maintain**: 365
   - **Save chart data**: Coché
   - **Intraday data storage**: 1 minute

### 2. Configuration des connexions Data Feed

#### BitMEX Configuration
```
Menu: File > Connect to Data Feed
Service: BitMEX
API Key: [Votre clé API BitMEX]
API Secret: [Votre secret BitMEX]
Symbols supportés: XBTUSD, ETHUSD, ADAUSD, etc.
```

#### Binance Configuration
```
Menu: File > Connect to Data Feed
Service: Binance
API Key: [Votre clé API Binance]
API Secret: [Votre secret Binance]
Symbols: BTCUSDT, ETHUSDT, ADAUSDT, etc.
```

#### FRED Integration
```
Menu: File > Connect to Data Feed
Service: FRED (Federal Reserve Economic Data)
API Key: YOUR_FRED_API_KEY_HERE
Symbols: GDP, UNRATE, DGS10, etc.
```

## Symboles supportés

### Cryptomonnaies - BitMEX
| Symbole | Description | Fichier Sierra Chart |
|---------|-------------|---------------------|
| XBTUSD-BMEX | Bitcoin/USD Perpetual | XBTUSD-BMEX.scid |
| ETHUSD-BMEX | Ethereum/USD Perpetual | ETHUSD-BMEX.scid |
| ADAUSD-BMEX | Cardano/USD Perpetual | ADAUSD-BMEX.scid |
| SOLUSD-BMEX | Solana/USD Perpetual | SOLUSD-BMEX.scid |

### Cryptomonnaies - Binance
| Symbole | Description | Fichier Sierra Chart |
|---------|-------------|---------------------|
| BTCUSDT_PERP_BINANCE | Bitcoin/USDT Perpetual | BTCUSDT_PERP_BINANCE.scid |
| ETHUSDT_PERP_BINANCE | Ethereum/USDT Perpetual | ETHUSDT_PERP_BINANCE.scid |
| ADAUSDT_PERP_BINANCE | Cardano/USDT Perpetual | ADAUSDT_PERP_BINANCE.scid |

### Indices et Économie
| Symbole | Description | Source |
|---------|-------------|--------|
| SPX | S&P 500 | FRED/Données gratuites |
| DXY | Dollar Index | FRED |
| VIX | CBOE Volatility Index | CBOE |
| USDOLLAR | USD Index | Sierra Chart |

### Ajout de symboles
1. **File** > **New/Open Chart**
2. Entrez le symbole (ex: `XBTUSD-BMEX`)
3. Sélectionnez l'exchange (BitMEX)
4. Configurez le timeframe (1-minute recommandé pour intraday)
5. Cliquez **OK**

## Format des fichiers

### Structure des données
Les données Sierra Chart sont sauvegardées dans:
```
C:\SierraChart\Data\
├── SYMB.scid     # Données intraday (1-minute)
├── SYMB.dly      # Données daily
├── SYMB.m1       # Données minute
├── SYMB.m5       # Données 5-minute
└── SYMB.h1       # Données hour
```

### Format fichier .scid (Intraday)
```
Header: 'SCID' (4 bytes)
Version: (4 bytes)
Symbol Name: (variable)
Records:
  - Date/Time (8 bytes)
  - Open Price (4 bytes float)
  - High Price (4 bytes float)
  - Low Price (4 bytes float)
  - Close Price (4 bytes float)
  - Volume (4 bytes integer)
  - Bid/Ask spread (4 bytes)
```

### Format fichier .dly (Daily)
```
Header: 'DLY' (3 bytes)
Version: (4 bytes)
Symbol Name: (variable)
Records:
  - Date (4 bytes)
  - OHLC prices (4x4 bytes float)
  - Volume (4 bytes)
  - Open Interest (4 bytes)
```

## API et connexions

### API Keys requises

#### BitMEX API
```python
# Génération depuis https://www.bitmex.com/app/apiKeys
Permissions:
- Read: Coché
- Order: Décoché
- Withdraw: Décoché
```

#### Binance API
```python
# Génération depuis https://www.binance.com/en/my/settings/api-management
Permissions:
- Enable Reading: Coché
- Enable Spot & Margin Trading: Décoché
- Enable Futures: Coché (si nécessaire)
```

### Connexions multiples
Configurez plusieurs data feeds pour la redondance:
1. **Primary**: BitMEX (crypto)
2. **Secondary**: Binance (backup crypto)
3. **Economic**: FRED (macro-économie)
4. **Stock**: Données gratuites pour indices

## Optimisation des performances

### Paramètres de collecte
```
Global Settings > Data/Trade Service Settings:
- Intraday Data Storage Time: 1 second
- Number of Days to Maintain Intraday: 30
- Update Frequency: Real-time
- Max Records per Chart: 50000
```

### Gestion de la mémoire
```
Global Settings > General Settings:
- Memory Usage: High (si RAM > 16GB)
- Chart Update Interval: 250ms
- Number of Charts to Keep Loaded: 10
```

### Optimisation réseau
```
Global Settings > Network Settings:
- Connection Timeout: 10000ms
- Reconnect Attempts: 5
- Reconnect Interval: 2000ms
- Use Data Compression: Coché
```

## Script de lecture automatisé

### Configuration du lecteur de fichiers
```typescript
// crypto_sierra_file_reader.ts configuration
const sierraConfig = {
  dataPath: 'C:/SierraChart/Data/',
  watchInterval: 2000,        // Vérification toutes les 2s
  cryptoKeywords: [           // Mots-clés pour filtrer
    'BTC', 'ETH', 'XBT', 'DOGE', 'SOL', 'BNB',
    'USDT', 'BITMEX', 'BINANCE', 'PERP'
  ],
  priceRanges: {              // Plages de prix par crypto
    'BTC': { min: 20000, max: 200000 },
    'ETH': { min: 1000, max: 10000 },
    'DOGE': { min: 0.0001, max: 10 },
    'SOL': { min: 10, max: 1000 }
  }
};
```

### Surveillance continue
```javascript
// Démarrage de la surveillance
const cryptoReader = new CryptoFileReader('C:/SierraChart/Data/');

cryptoReader.on('cryptoData', (data) => {
  console.log(`${data.symbol}: $${data.lastPrice} (${data.changePercent}%)`);
  // Envoyer vers la base de données
  // Publier sur Discord si changement significatif
});

cryptoReader.startWatching(2000); // 2 secondes interval
```

### Intégration avec la base de données
```sql
-- Table de stockage des données Sierra Chart
CREATE TABLE sierra_chart_data (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(50) NOT NULL,
  exchange VARCHAR(20),
  last_price DECIMAL(20, 8),
  change_percent DECIMAL(10, 4),
  volume BIGINT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  source VARCHAR(50),
  INDEX idx_symbol_time (symbol, timestamp)
);
```

## Dépannage Sierra Chart

### Erreurs communes

#### 1. "No data files found"
**Cause**: Aucun symbole configuré ou pas de données reçues
**Solution**:
```bash
# Vérifier les fichiers dans le dossier
dir C:\SierraChart\Data\*.scid

# Ajouter des symboles dans Sierra Chart
File > New/Open Chart > XBTUSD-BMEX
```

#### 2. "Connection timeout"
**Cause**: Problème réseau ou API keys invalides
**Solution**:
1. Vérifier la connexion internet
2. Valider les clés API
3. Configurer le pare-feu Windows

#### 3. "Permission denied"
**Cause**: Droits d'accès au dossier Data
**Solution**:
```powershell
# Donner les droits au dossier
icacls "C:\SierraChart\Data" /grant Users:F
```

#### 4. Performance dégradée
**Cause**: Trop de données ou mémoire insuffisante
**Solution**:
- Limiter le nombre de symboles
- Optimiser les paramètres mémoire
- Nettoyer les anciennes données

### Scripts de diagnostic

#### Vérification des fichiers
```bash
node -e "
const reader = require('./dist/backend/scripts/crypto_sierra_file_reader');
const cryptoReader = new reader.CryptoFileReader();
cryptoReader.checkFilesStatus();
"
```

#### Test de connexion API
```bash
# Test BitMEX
curl -H "Content-Type: application/json" -H "api-key: YOUR_KEY" -H "api-secret: YOUR_SECRET" https://www.bitmex.com/api/v1/instrument?symbol=XBTUSD

# Test Binance
curl -H "X-MBX-APIKEY: YOUR_KEY" "https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=BTCUSDT"
```

### Maintenance régulière

#### Nettoyage des données
```javascript
// Script de nettoyage mensuel
const fs = require('fs');
const path = require('path');

function cleanOldData(dataPath, daysToKeep = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  // Nettoyer les fichiers anciens
  fs.readdirSync(dataPath).forEach(file => {
    const filePath = path.join(dataPath, file);
    const stats = fs.statSync(filePath);

    if (stats.mtime < cutoffDate && file.endsWith('.scid')) {
      fs.unlinkSync(filePath);
      console.log(`Supprimé: ${file}`);
    }
  });
}
```

#### Surveillance de l'espace disque
```powershell
# Script PowerShell pour surveiller l'espace
$drive = Get-WmiObject Win32_LogicalDisk -Filter "DeviceID='C:'"
$freeSpace = [math]::Round($drive.FreeSpace / 1GB, 2)
Write-Host "Espace libre sur C: : $freeSpace GB"

if ($freeSpace -lt 10) {
  Write-Host "⚠️ Espace disque critique!"
  # Envoyer alerte
}
```

---

## Références utiles

- **Documentation Sierra Chart**: [https://www.sierrachart.com/index.php?page=doc/](https://www.sierrachart.com/index.php?page=doc/)
- **API BitMEX**: [https://www.bitmex.com/app/apiOverview](https://www.bitmex.com/app/apiOverview)
- **API Binance**: [https://binance-docs.github.io/apidocs/](https://binance-docs.github.io/apidocs/)
- **Support Discord**: `#finances` (1444800481250644069)

Cette configuration assure une collecte fiable et performante des données de marché depuis Sierra Chart vers votre base de données financière.