# Documentation Windows Server - Integration Sierra Chart

## Table des matières
1. [Vue d'ensemble](#vue-densemble)
2. [Configuration requise](#configuration-requise)
3. [Installation et configuration](#installation-et-configuration)
4. [Configuration de Sierra Chart](#configuration-de-sierra-chart)
5. [Variables d'environnement](#variables-denvironnement)
6. [Utilisation du serveur](#utilisation-du-serveur)
7. [Scripts disponibles](#scripts-disponibles)
8. [Surveillance et maintenance](#surveillance-et-maintenance)
9. [Dépannage](#dépannage)

## Vue d'ensemble

Ce projet intègre Sierra Chart dans votre base de données financière pour capturer et traiter les données de marché en temps réel. Le système est configuré pour fonctionner sur un environnement Windows Server.

### Architecture actuelle
- **Base de données**: PostgreSQL (localhost:5432)
- **Plateforme de trading**: Sierra Chart
- **Sources de données**: FRED, Finnhub, Trading Economics, BitMEX, Binance
- **Bot Discord**: Intégration pour notifications et publication

## Configuration requise

### Matériel
- Windows Server 2019 ou plus récent
- Minimum 8GB RAM (16GB recommandé)
- 50GB d'espace disque disponible
- Processeur multi-cœurs recommandé

### Logiciels
- Node.js (v18.20.3 ou plus récent)
- PostgreSQL (v12 ou plus récent)
- Sierra Chart (version 64-bit)
- Git (pour le contrôle de version)
- pnpm (gestionnaire de paquets)

## Installation et configuration

### 1. Clonage du projet
```bash
git clone <votre-repo> "financial analyst"
cd "financial analyst"
```

### 2. Installation des dépendances
```bash
# Installation de Node.js (déjà présent dans node-v18.20.3/)
# Installation de pnpm si nécessaire
npm install -g pnpm

# Installation des dépendances du projet
pnpm install
```

### 3. Configuration de la base de données PostgreSQL
```sql
-- Création de la base de données
CREATE DATABASE financial_analyst;

-- Création de l'utilisateur (si nécessaire)
CREATE USER postgres WITH PASSWORD '9022';

-- Attribution des privilèges
GRANT ALL PRIVILEGES ON DATABASE financial_analyst TO postgres;
```

### 4. Compilation du projet
```bash
# Compilation TypeScript vers JavaScript
pnpm build

# Ou développement avec rechargement automatique
pnpm dev
```

## Configuration de Sierra Chart

### 1. Installation de Sierra Chart
- Téléchargez et installez Sierra Chart (version 64-bit)
- Installez dans le répertoire par défaut: `C:\SierraChart\`

### 2. Configuration des symboles
Ouvrez Sierra Chart et ajoutez les symboles suivants:

#### Cryptomonnaies
- `XBTUSD-BMEX` (Bitcoin/USD BitMEX)
- `ETHUSD-BMEX` (Ethereum/USD BitMEX)
- `BTCUSDT_PERP_BINANCE` (Bitcoin/USDT Binance Perpetual)
- `ETHUSDT_PERP_BINANCE` (Ethereum/USDT Binance Perpetual)

### 3. Configuration des connexions
1. Dans Sierra Chart: **File** > **Connect to Data Feed**
2. Configurez les connexions:
   - **BitMEX**: API Key et Secret requis
   - **Binance**: API Key et Secret requis
   - **FRED**: Clé API déjà configurée (`YOUR_FRED_API_KEY_HERE`)

### 4. Vérification des données
Assurez-vous que les données sont sauvegardées dans:
- `C:\SierraChart\Data\` (fichiers .scid pour intraday)
- `C:\SierraChart\Data\` (fichiers .dly pour daily)

## Variables d'environnement

### Configuration du fichier `.env`

```bash
# Configuration de la base de données
USE_DATABASE=true
DB_HOST=localhost
DB_PORT=5432
DB_NAME=financial_analyst
DB_USER=postgres
DB_PASSWORD=9022

# Chemin Sierra Chart
SIERRA_DATA_PATH=C:/SierraChart/Data/

# Configuration API
FRED_API_KEY=YOUR_FRED_API_KEY_HERE
FINNHUB_API_KEY=YOUR_FINNHUB_API_KEY_HERE

# Configuration Discord
DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE
DISCORD_GUILD_ID=804393160092024832
ADMIN_USER_ID=demon6660699

# Canaux Discord
DISCORD_CHANNEL_ID=1421701551080345710        # news-ai
DISCORD_CHANNEL_NEWS_AI=1421701551080345710   # news-ai
DISCORD_CHANNEL_FINANCE=1444800481250644069   # finances

# Configuration serveur
NODE_ENV=development
LOG_LEVEL=info
PORT=3000

# Performance
MAX_CONCURRENT_REQUESTS=3
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT_MS=2000
```

## Utilisation du serveur

### 1. Démarrage du service principal
```bash
# Démarrage du serveur principal
node dist/backend/index.js

# Ou avec PM2 pour la production
pm2 start ecosystem.config.js
```

### 2. Surveillance des données Sierra Chart
```bash
# Script de surveillance crypto
node dist/backend/scripts/crypto_sierra_file_reader.js

# Ou développement
pnpm run dev:crypto-sierra
```

### 3. Scripts de maintenance
```bash
# Nettoyage et optimisation de la base de données
node dist/backend/scripts/automated_maintenance.js

# Validation des données
node dist/backend/scripts/validate_simple.js
```

## Scripts disponibles

### Surveillance et collecte de données
- `crypto_sierra_file_reader.js` - Lecture des données crypto depuis Sierra Chart
- `run_rouge_pulse.js` - Exécution de l'analyse de marché
- `run_news_data_pipeline.js` - Pipeline de collecte de news

### Maintenance de la base de données
- `automated_maintenance.js` - Maintenance automatisée
- `optimize_pipeline.js` - Optimisation des performances
- `verify_db_integrity.js` - Vérification de l'intégrité

### Tests et validation
- `test_sentiment_simple.js` - Test d'analyse de sentiment
- `test_rouge_pulse_enhanced.js` - Test du système Rouge Pulse
- `validate_data_quality.js` - Validation de la qualité des données

## Surveillance et maintenance

### 1. Surveillance des processus
Utilisez le gestionnaire de tâches Windows ou PowerShell:

```powershell
# Vérifier les processus Node.js
Get-Process | Where-Object {$_.ProcessName -eq "node"}

# Surveiller l'utilisation mémoire
Get-Counter -Counter "\Process(node)\Working Set" -SampleInterval 60
```

### 2. Logs du système
- Logs de l'application: `logs/app.log`
- Logs d'erreurs: `logs/error.log`
- Logs Sierra Chart: `C:\SierraChart\Logs\`

### 3. Tâches planifiées Windows
Configurez des tâches pour:

```powershell
# Maintenance quotidienne à 2h du matin
schtasks /create /tn "FinancialAnalyst_Maintenance" /tr "node dist/backend/scripts/automated_maintenance.js" /sc daily /st 02:00

# Redémarrage hebdomadaire le dimanche à 3h du matin
schtasks /create /tn "FinancialAnalyst_Restart" /tr "pm2 restart all" /sc weekly /d SUN /st 03:00
```

## Dépannage

### Problèmes courants

#### 1. Données Sierra Chart non détectées
**Symptôme**: Le script ne trouve pas de fichiers crypto
**Solution**:
1. Vérifiez que Sierra Chart est en cours d'exécution
2. Ajoutez les symboles manuellement: File > New/Open Chart
3. Attendez que les données se chargent (quelques minutes)
4. Vérifiez le répertoire `C:\SierraChart\Data\`

#### 2. Connexion PostgreSQL refusée
**Symptôme**: Error connecting to database
**Solution**:
1. Vérifiez que PostgreSQL est en cours d'exécution
2. Validez les identifiants dans `.env`
3. Vérifiez que le port 5432 est ouvert

#### 3. API Keys expirées
**Symptôme**: Erreurs d'API 401/403
**Solution**:
1. Vérifiez les clés API dans `.env`
2. Renouvelez les clés expirées
3. Configurez les quotas API

#### 4. Performance dégradée
**Symptôme**: Lenteur du système
**Solution**:
1. Exécutez le script de maintenance: `automated_maintenance.js`
2. Vérifiez l'utilisation disque et mémoire
3. Optimisez la taille du pool de connexions

### Monitoring en temps réel
```bash
# Surveiller les processus actifs
pm2 monit

# Vérifier les logs en direct
tail -f logs/app.log

# Surveillance base de données
node dist/backend/scripts/monitoring.js
```

### Support et contacts
- **Administrateur système**: demon6660699
- **Documentation**: `docs/`
- **Issues**: GitHub Issues (si applicable)

---

## Annexe: Configuration des services Windows

Pour une production robuste, configurez les services Windows:

### Installation du service Node.js
```bash
# Installation du module node-windows
npm install -g node-windows

# Création du service
node scripts/install-service.js
```

### Configuration du service dans services.msc
1. **Nom du service**: FinancialAnalyst
2. **Type de démarrage**: Automatique
3. **Compte**: Service réseau ou utilisateur dédié
4. **Dépendances**: PostgreSQL

Cette configuration assure un fonctionnement fiable et redémarrage automatique en cas de problème.