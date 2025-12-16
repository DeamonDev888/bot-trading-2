# 📊 ES Futures Analysis Report

Ce script génère un rapport d'analyse technique des contrats ES (E-mini S&P 500) avec un embed Discord contenant :
- **Prix actuel** avec variation
- **RSI (Relative Strength Index)** avec statut (suracheté/survendu/normal)
- **MACD** avec signal et histogramme
- **Volume** de trading
- **Support et Résistance**
- **Analyse de marché** (tendance, momentum, volatilité)

## 📁 Fichiers

### 1. `es_futures_simple_test.ts`
**Version test** - Génère l'embed sans dépendances Discord.js
- ✅ Fonctionne parfaitement
- ✅ Affiche l'embed au format JSON
- ✅ Idéal pour tests et démos

### 2. `es_futures_analysis_report.ts`
**Version complète** - Avec intégration Discord.js
- 📝 Génère un embed Discord formaté
- 🔗 Peut publier sur un canal Discord
- ⚠️ Nécessite configuration Discord

## 🚀 Utilisation

### Mode Test (Recommandé)

```bash
# Test simple avec affichage JSON
npx ts-node --esm src/backend/scripts/es_futures_simple_test.ts
```

**Exemple de sortie :**
```
============================================================
📊 ES FUTURES ANALYSIS REPORT (TEST SIMPLE)
============================================================

1️⃣ Génération des données techniques...
📈 Génération des données techniques ES (mode simulation)...
✅ Données techniques générées:
   Prix: 4746.30
   RSI: 49.96
   MACD: -47.46
   Volume: 1 064 828
   Change: -33.53 (-0.70%)

2️⃣ Analyse du marché...

3️⃣ Création de l'embed...

============================================================
✅ RAPPORT GÉNÉRÉ AVEC SUCCÈS
============================================================

📱 EMBED DISCORD (Format JSON):
============================================================
{
  "title": "📊 Rapport d'Analyse ES Futures",
  "description": "Analyse technique en temps réel du contrat E-mini S&P 500",
  "color": 16711680,
  "timestamp": "2025-12-15T00:11:08.214Z",
  "fields": [
    {
      "name": "🔴 Prix Actuel",
      "value": "**4746.30**\n▼ -33.53 (-0.70%)",
      "inline": true
    },
    ...
  ]
}
```

### Mode Complet (avec Discord)

**1. Configuration**

Créer un fichier `.env` avec :
```bash
DISCORD_BOT_TOKEN=votre_token_bot
DISCORD_CHANNEL_ID=ID_du_canal
```

**2. Exécution**

```bash
# Affichage uniquement (sans publication)
npx ts-node --esm src/backend/scripts/es_futures_analysis_report.ts

# Publication sur Discord
npx ts-node --esm src/backend/scripts/es_futures_analysis_report.ts --publish
```

## 📊 Données Générées

### Prix
- Prix actuel du contrat ES
- Variation en points et pourcentage
- Indicateur visuel (🟢 hausse, 🔴 baisse)

### RSI (Relative Strength Index)
- Période : 14
- Statut :
  - **> 70** : ⚠️ Suracheté (signal de vente)
  - **< 30** : ⚠️ Survendu (signal d'achat)
  - **30-70** : ✅ Normal

### MACD (Moving Average Convergence Divergence)
- **MACD** : Différence entre EMA 12 et EMA 26
- **Signal** : EMA 9 du MACD
- **Histogramme** : MACD - Signal
- Indicateur visuel (🔼 haussier, 🔽 baissier)

### Volume
- Volume de trading en temps réel
- Indicateur de liquidité du marché

### Support/Résistance
- **Support** : 0.5% sous le prix actuel
- **Résistance** : 0.5% au-dessus du prix actuel

### Analyse de Marché

**Tendance :**
- 🟢 **BULLISH** : Tendance haussière
- 🔴 **BEARISH** : Tendance baissière
- 🟡 **NEUTRAL** : Marché en consolidation

**Momentum :**
- ⚡ **STRONG** : Momentum fort
- 📊 **MODERATE** : Momentum modéré
- 🐌 **WEAK** : Momentum faible

**Volatilité :**
- 🔥 **HIGH** : Volatilité élevée
- 🌡️ **MEDIUM** : Volatilité modérée
- ❄️ **LOW** : Volatilité faible

## 🎨 Format de l'Embed

L'embed Discord contient :

```
┌─────────────────────────────────────────────┐
│ 📊 Rapport d'Analyse ES Futures            │
│ Analyse technique en temps réel du          │
│ contrat E-mini S&P 500                      │
├─────────────────────────────────────────────┤
│ 🔴 Prix Actuel        📈 RSI (14)   ⚡ MACD│
│ 4746.30               49.96        -47.46 │
│ ▼ -33.53 (-0.70%)     ✅ Normal    🔽     │
├─────────────────────────────────────────────┤
│ 📊 Volume        🎯 Support   🎯 Résistance│
│ 1,064,828       4722.57     4770.03     │
├─────────────────────────────────────────────┤
│ 🔴 Analyse de Marché                       │
│ Analyse Technique ES Futures               │
│ Tendance: BEARISH                          │
│ Momentum: MODERATE                         │
│ Volatilité: MEDIUM                         │
│                                             │
│ Tendance baissière détectée                │
├─────────────────────────────────────────────┤
│ 📈 Indicateurs              ⏰ Dernière MAJ │
│ 📊 Momentum: MODERATE        <t:1765757468:R>│
│ 🌡️ Volatilité: MEDIUM                        │
└─────────────────────────────────────────────┘
```

## 🔧 Personnalisation

### Modifier les Seuil RSI

Dans `calculateRSI()` :
```typescript
if (data.rsi > 75) {  // Modifier seuil suracheté
  momentum = 'STRONG';
  trend = 'BULLISH';
} else if (data.rsi < 25) {  // Modifier seuil survendu
  momentum = 'STRONG';
  trend = 'BEARISH';
}
```

### Modifier Support/Résistance

Dans `analyzeMarket()` :
```typescript
const support = data.price * 0.995;  // 0.5% sous le prix
const resistance = data.price * 1.005;  // 0.5% au-dessus
```

### Ajouter des Indicateurs

Ajouter dans `TechnicalIndicators` :
```typescript
interface TechnicalIndicators {
  // ... existant
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
}
```

Puis mettre à jour `getTechnicalIndicators()` et `createDiscordEmbed()`.

## 📦 Intégration dans le Projet

### Ajouter au package.json

```json
{
  "scripts": {
    "es:report": "ts-node --esm src/backend/scripts/es_futures_analysis_report.ts",
    "es:report:test": "ts-node --esm src/backend/scripts/es_futures_simple_test.ts",
    "es:report:publish": "ts-node --esm src/backend/scripts/es_futures_analysis_report.ts --publish"
  }
}
```

### Utiliser avec Cron

```bash
# Toutes les heures
0 * * * * cd /path/to/project && npm run es:report:publish
```

### Intégrer dans le Discord Bot

```typescript
import { ESFuturesAnalysisReport } from './scripts/es_futures_analysis_report';

client.on('messageCreate', async (message) => {
  if (message.content === '!es') {
    const report = new ESFuturesAnalysisReport();
    await report.generateAndPublishReport();
  }
});
```

## 🔍 Dépannage

### Problème : Script se bloque

**Solution :** Utiliser le mode test sans Discord.js
```bash
npm run es:report:test
```

### Problème : Données incorrectes

**Cause :** Simulation de données (mode test)

**Solution :** Intégrer avec SierraChart ou une API de données réelles

### Problème : Embed Discord non envoyé

**Vérifications :**
1. Token Discord valide
2. Channel ID correct
3. Bot a les permissions nécessaires
4. Variables d'environnement configurées

## 🚀 Améliorations Futures

1. **Intégration SierraChart** - Données réelles de marché
2. **Calculs RSI/MACD** - Sur vraies données historiques
3. **Alertes automatiques** - Seuils d'alerte personnalisables
4. **Graphiques** - Intégration TradingView ou Chart.js
5. **Historique** - Sauvegarde des analyses
6. **Multi-timeframes** - 1m, 5m, 15m, 1h, 1d
7. **Notifications** - Alertes sur conditions spécifiques

## 📝 Notes Techniques

- **Node.js** : v18+ (testé sur v24.6.0)
- **TypeScript** : ES2022 modules
- **Discord.js** : v14.25.1
- **Simulation** : Données générées aléatoirement autour de 4750
- **Format** : JSON pour l'embed Discord

## 🎯 Exemples d'Utilisation

### Trading Intraday
```bash
# Exécution toutes les 15 minutes
*/15 * * * * npm run es:report:publish
```

### Analyse de Fin de Journée
```bash
# Exécution à 16h00 (fermeture marchés US)
0 16 * * 1-5 npm run es:report:publish
```

### Alerte de Conditions
Le script peut être modifié pour envoyer des alertes :
- RSI < 30 (survendu) → Signal d'achat
- RSI > 70 (suracheté) → Signal de vente
- MACD crossover → Changement de tendance

## 📄 Licence

ISC - Voir le fichier LICENSE du projet

## 👨‍💻 Auteur

Financial Analyst - Nova
