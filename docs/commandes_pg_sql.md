# Commandes SQL pour pgAdmin 4 - Financial Analyst

## 🔍 Requête complète d'analyse

Copiez-collez cette requête complète dans le **Query Tool** de pgAdmin 4 pour voir toutes les données de votre application Financial Analyst :

```sql
-- ==========================================
-- ANALYSE COMPLÈTE FINALE (JSON corrigé)
-- ==========================================

-- 1. STATISTIQUES DES TABLES
SELECT
    '=== STATISTIQUES DES TABLES ===' as section,
    '' as table_name,
    '' as count,
    '' as details
UNION ALL
SELECT
    'News Items',
    'news_items',
    (SELECT COUNT(*) FROM news_items)::text,
    'Articles financiers analysés'
UNION ALL
SELECT
    'Sentiment Analyses',
    'sentiment_analyses',
    (SELECT COUNT(*) FROM sentiment_analyses)::text,
    'Analyses de sentiment réalisées'
UNION ALL
SELECT
    'Daily News Summary',
    'daily_news_summary',
    COALESCE((SELECT COUNT(*) FROM daily_news_summary), 0)::text,
    'Résumés quotidiens'
UNION ALL
SELECT
    'Latest News',
    'latest_news',
    COALESCE((SELECT COUNT(*) FROM latest_news), 0)::text,
    'Dernières news mises en cache'

ORDER BY section;

-- Séparateur
SELECT '=================================================================', '', '', '';

-- 2. DERNIÈRES ANALYSES (JSON corrigé)
SELECT
    '=== DERNIÈRES ANALYSES DE SENTIMENT ===' as info,
    overall_sentiment,
    score,
    risk_level,
    LEFT(catalysts::text, 80) || '...' as catalysts_preview,
    LEFT(summary, 100) || '...' as summary_preview,
    EXTRACT(HOUR FROM created_at) || 'h' || EXTRACT(MINUTE FROM created_at) as time
FROM sentiment_analyses
ORDER BY created_at DESC
LIMIT 10;

-- Séparateur
SELECT '=================================================================', '', '', '';

-- 3. NEWS RÉCENTES PAR SOURCE
SELECT
    '=== NEWS RÉCENTES PAR SOURCE ===' as section,
    source,
    LEFT(title, 60) || '...' as title_preview,
    EXTRACT(DAY FROM created_at) || '/' || EXTRACT(MONTH FROM created_at) as date,
    EXTRACT(HOUR FROM created_at) || 'h' as time
FROM news_items
ORDER BY created_at DESC
LIMIT 20;

-- Séparateur
SELECT '=================================================================', '', '', '';

-- 4. RÉPARTITION DES SOURCES
SELECT
    '=== RÉPARTITION DES SOURCES ===' as info,
    source,
    COUNT(*) as news_count,
    ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM news_items) * 100, 1) || '%' as percentage,
    CASE
        WHEN COUNT(*) >= 10 THEN '🔥 ACTIVE'
        WHEN COUNT(*) >= 5 THEN '⚡ MOYENNE'
        ELSE '📝 FAIBLE'
    END as activity_level
FROM news_items
GROUP BY source
ORDER BY news_count DESC;

-- Séparateur
SELECT '=================================================================', '', '', '';

-- 5. ÉVOLUTION DU SENTIMENT (par ordre chronologique)
SELECT
    '=== ÉVOLUTION DU SENTIMENT ===' as evolution,
    EXTRACT(HOUR FROM created_at) as hour,
    EXTRACT(MINUTE FROM created_at) as minute,
    overall_sentiment,
    score,
    risk_level,
    CASE
        WHEN score > 10 THEN '🟢 HAUSSIER'
        WHEN score < -10 THEN '🔴 BAISSIER'
        ELSE '🟡 NEUTRE'
    END as trend_indicator
FROM sentiment_analyses
WHERE created_at >= CURRENT_DATE
ORDER BY created_at;

-- Séparateur
SELECT '=================================================================', '', '', '';

-- 6. DONNÉES MARCHÉ EN TEMPS RÉEL (VIX + CRYPTO)
SELECT
    '=== DONNÉES MARCHÉ TEMPS RÉEL ===' as market_data,
    asset_type,
    symbol,
    price,
    change,
    change_percent,
    volume,
    source,
    EXTRACT(HOUR FROM timestamp) || 'h' || EXTRACT(MINUTE FROM timestamp) as time
FROM market_data
ORDER BY timestamp DESC
LIMIT 20;

-- Séparateur
SELECT '=================================================================', '', '', '';

-- 7. VIX - DERNIÈRES DONNÉES VOLATILITÉ
SELECT
    '=== VIX - INDICE DE VOLATILITÉ ===' as vix_title,
    price as vix_price,
    change as vix_change,
    change_percent as vix_change_percent,
    source as vix_source,
    CASE
        WHEN price > 30 THEN '🔴 TRÈS ÉLEVÉ - Forte crainte'
        WHEN price > 25 THEN '🟠 ÉLEVÉ - Nerveux'
        WHEN price > 20 THEN '🟡 MODÉRÉ - Incertain'
        WHEN price > 15 THEN '🟢 FAIBLE - Calme'
        ELSE '🟢 TRÈS FAIBLE - Très calme'
    END as vix_level,
    timestamp
FROM market_data
WHERE asset_type = 'VIX'
ORDER BY timestamp DESC
LIMIT 10;

-- Séparateur
SELECT '=================================================================', '', '', '';

-- 8. CRYPTOMONNAIES - PRIX EN TEMPS RÉEL
SELECT
    '=== CRYPTOMONNAIES - PRIX ACTUELS ===' as crypto_title,
    symbol,
    price as crypto_price,
    change as crypto_change,
    change_percent as crypto_change_percent,
    volume,
    source as crypto_source,
    CASE
        WHEN change_percent > 2 THEN '🟢 FORTE HAUSSE'
        WHEN change_percent > 0.5 THEN '📈 HAUSSE MODÉRÉE'
        WHEN change_percent > -0.5 THEN '➡️ STABLE'
        WHEN change_percent > -2 THEN '📉 BAISSE MODÉRÉE'
        ELSE '🔴 FORTE BAISSE'
    END as crypto_trend,
    timestamp
FROM market_data
WHERE asset_type = 'CRYPTO'
ORDER BY timestamp DESC
LIMIT 15;

-- Séparateur
SELECT '=================================================================', '', '', '';

-- 9. STATISTIQUES MARCHÉ DU JOUR
SELECT
    '=== STATISTIQUES MARCHÉ - AUJOURD\'HUI ===' as daily_stats,
    asset_type,
    COUNT(*) as data_points,
    ROUND(AVG(price), 2) as avg_price,
    ROUND(AVG(change_percent), 2) as avg_change_percent,
    MAX(price) as highest_price,
    MIN(price) as lowest_price,
    CASE
        WHEN AVG(change_percent) > 0 THEN '🟢 HAUSSIER'
        WHEN AVG(change_percent) < 0 THEN '🔴 BAISSIER'
        ELSE '🟡 NEUTRE'
    END as daily_trend
FROM market_data
WHERE DATE(timestamp) = CURRENT_DATE
GROUP BY asset_type
ORDER BY asset_type;

-- Séparateur
SELECT '=================================================================', '', '', '';

-- 10. CORRÉLATION VIX / BTC (7 derniers jours)
SELECT
    '=== CORRÉLATION VIX / BTC - 7 DERNIERS JOURS ===' as correlation,
    DATE(vix.timestamp) as trading_date,
    ROUND(vix.price, 2) as vix_price,
    ROUND(btc.price, 2) as btc_price,
    ROUND(vix.change_percent, 2) as vix_change_pct,
    ROUND(btc.change_percent, 2) as btc_change_pct,
    CASE
        WHEN vix.change_percent < -1 AND btc.change_percent > 1 THEN '💡 INVERSE (VIX↓, BTC↑)'
        WHEN vix.change_percent > 1 AND btc.change_percent < -1 THEN '💡 INVERSE (VIX↑, BTC↓)'
        WHEN vix.change_percent > 0 AND btc.change_percent > 0 THEN '🟢 HAUSSE COMMUNE'
        WHEN vix.change_percent < 0 AND btc.change_percent < 0 THEN '🔴 BAISSE COMMUNE'
        ELSE '➡️ MIXTE'
    END as correlation_pattern
FROM market_data vix
JOIN market_data btc ON DATE(vix.timestamp) = DATE(btc.timestamp)
WHERE vix.asset_type = 'VIX'
  AND btc.asset_type = 'CRYPTO'
  AND btc.symbol LIKE '%BTC%'
  AND vix.timestamp >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY trading_date DESC, vix.timestamp DESC;

-- Séparateur
SELECT '=================================================================', '', '', '';

-- 11. DERNIÈRES NEWS PONDÉRÉES PAR IMPORTANCE
SELECT
    '=== NEWS LES PLUS RÉCENTES ===' as latest,
    source,
    title,
    url,
    CASE
        WHEN source = 'ZeroHedge' THEN '⚡ MARKET'
        WHEN source = 'CNBC' THEN '💰 TRADING'
        WHEN source = 'FinancialJuice' THEN '📈 FUTURES'
        WHEN source = 'FRED' THEN '📊 MACRO'
        WHEN source = 'Finnhub' THEN '🏢 EARNINGS/NEWS'
        WHEN source = 'CME_VIX' THEN '📉 VOLATILITY'
        ELSE '📰 GENERAL'
    END as source_type,
    created_at
FROM news_items
ORDER BY created_at DESC
LIMIT 15;
```

## 📋 Utilisation dans pgAdmin 4

1. **Ouvrir pgAdmin 4**
2. **Se connecter** au serveur PostgreSQL avec les identifiants :

   - Host: `localhost`
   - Port: `5432`
   - Database: `financial_analyst`
   - Username: `postgres`
   - Password: `9022`

3. **Accéder au Query Tool** :

   - Clic droit sur la base `financial_analyst`
   - Sélectionner **Query Tool**

4. **Exécuter la requête** :
   - Copier-coller la requête ci-dessus
   - Appuyer sur **F5** ou cliquer sur l'icône ⚡ **Execute**

## 🎯 Ce que la requête montre

- ✅ **Statistiques des tables** : Nombre d'enregistrements par table
- ✅ **Analyses de sentiment récentes** : Scores, tendances, catalysts
- ✅ **News récentes** : Articles par source avec horodatage
- ✅ **Répartition des sources** : Pourcentage par source de news
- ✅ **Évolution chronologique** : Progression du sentiment dans le temps
- ✅ **News importantes** : Articles récents catégorisés par importance

## 🔧 Requêtes rapides utiles

### Voir les 5 dernières analyses

```sql
SELECT overall_sentiment, score, risk_level, created_at
FROM sentiment_analyses
ORDER BY created_at DESC
LIMIT 5;
```

### Compter les articles par source

```sql
SELECT source, COUNT(*) as count
FROM news_items
GROUP BY source
ORDER BY count DESC;
```

### Voir les données macro-économiques (FRED)

```sql
SELECT title, created_at
FROM news_items
WHERE source = 'FRED'
ORDER BY created_at DESC
LIMIT 10;
```

### Voir les news Finnhub

```sql
SELECT title, created_at
FROM news_items
WHERE source = 'Finnhub'
ORDER BY created_at DESC
LIMIT 10;
```

### Voir la Volatilité (VIX) et FedWatch

```sql
SELECT title, created_at
FROM news_items
WHERE source IN ('CME_VIX', 'CME_FEDWATCH')
ORDER BY created_at DESC
LIMIT 10;
```

### Voir les dernières news (Toutes sources)

```sql
SELECT title, source, created_at
FROM news_items
ORDER BY created_at DESC
LIMIT 10;
```

## 📈 Requêtes spécifiques VIX et Crypto

### Derniers prix VIX

```sql
SELECT
    price as vix_price,
    change_percent as vix_change_pct,
    CASE
        WHEN price > 30 THEN '🔴 Très élevé - Panique'
        WHEN price > 25 THEN '🟠 Élevé - Nerveux'
        WHEN price > 20 THEN '🟡 Modéré - Incertain'
        ELSE '🟢 Faible - Calme'
    END as vix_level,
    timestamp
FROM market_data
WHERE asset_type = 'VIX'
ORDER BY timestamp DESC
LIMIT 5;
```

### Prix crypto actuels

```sql
SELECT
    symbol,
    price,
    change_percent,
    volume,
    source,
    timestamp
FROM market_data
WHERE asset_type = 'CRYPTO'
ORDER BY timestamp DESC
LIMIT 10;
```

### Alerte VIX élevé (>25)

```sql
SELECT * FROM market_data
WHERE asset_type = 'VIX' AND price > 25
ORDER BY timestamp DESC;
```

### Crypto avec forte variation (>3%)

```sql
SELECT symbol, price, change_percent, source, timestamp
FROM market_data
WHERE asset_type = 'CRYPTO' AND ABS(change_percent) > 3
ORDER BY ABS(change_percent) DESC
LIMIT 10;
```

### Corrélation VIX/BTC du jour

```sql
SELECT
    DATE(vix.timestamp) as date,
    AVG(vix.price) as avg_vix,
    AVG(btc.price) as avg_btc,
    AVG(vix.change_percent) as vix_pct,
    AVG(btc.change_percent) as btc_pct
FROM market_data vix
JOIN market_data btc ON DATE(vix.timestamp) = DATE(btc.timestamp)
WHERE vix.asset_type = 'VIX'
  AND btc.asset_type = 'CRYPTO'
  AND btc.symbol LIKE '%BTC%'
  AND DATE(vix.timestamp) = CURRENT_DATE
GROUP BY DATE(vix.timestamp);
```

### Dernières données par type d'actif

```sql
SELECT DISTINCT ON (asset_type, symbol)
    asset_type,
    symbol,
    price,
    change_percent,
    source,
    timestamp
FROM market_data
ORDER BY asset_type, symbol, timestamp DESC;
```

### Volume de trading crypto (24h)

```sql
SELECT
    symbol,
    SUM(volume) as total_volume_24h,
    AVG(price) as avg_price,
    COUNT(*) as data_points
FROM market_data
WHERE asset_type = 'CRYPTO'
  AND timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY symbol
ORDER BY total_volume_24h DESC;
```

### VIX trend analysis (semaine)

```sql
SELECT
    DATE(timestamp) as date,
    AVG(price) as avg_vix,
    MIN(price) as min_vix,
    MAX(price) as max_vix,
    COUNT(*) as data_points
FROM market_data
WHERE asset_type = 'VIX'
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

---

_Document généré pour le projet Financial Analyst_
