# 🤖 Sniper Financial Bot - Skills Schema

Cette documentation décrit les schémas JSON utilisés par **Sniper Financial Bot** pour structurer les réponses Discord et gérer les données financières.

## 📁 Fichiers de Skills Sniper

### 1. **sniper-financial-skills.json** - Schema Principal ✅
Schema complet pour les réponses Discord du bot financier avec support avancé du trading.

#### Types de Réponses Supportées :
- **market_analysis** - Analyses de marché techniques
- **trading_signal** - Signaux de trading structurés
- **sentiment_report** - Rapports de sentiment de marché
- **price_alert** - Alertes de prix en temps réel
- **embed** - Messages embed Discord riches
- **poll** - Sondages interactifs
- **file_upload** - Fichiers de données financières

#### Exemple de Réponse Trading Signal :
```json
{
  "type": "trading_signal",
  "content": "Signal d'achat détecté sur ES Futures",
  "trading_signal": {
    "action": "BUY",
    "symbol": "ES",
    "confidence": 85,
    "entry_price": 4785.50,
    "stop_loss": 4765.00,
    "take_profit": 4820.00,
    "position_size": "medium",
    "reasoning": "Croisement haussier MACD + RAI sur support",
    "technical_signals": ["MACD bullish cross", "RSI oversold recovery"],
    "timeframe": "day_trading"
  }
}
```

### 2. **sniper-trading-commands.json** - Commands Trading ✅
Schema pour les commandes de trading et analyses financières.

#### Commandes Supportées :
- **analyze** - Analyse technique/fondamentale
- **sentiment** - Analyse de sentiment
- **signal** - Génération de signaux
- **price** - Prix et cotations
- **alert** - Configuration d'alertes
- **portfolio** - Gestion de portefeuille
- **risk** - Analyse de risque
- **backtest** - Backtesting de stratégies

#### Exemple de Commande :
```json
{
  "command": "analyze",
  "symbols": ["ES", "NQ", "SPY"],
  "timeframe": "1h",
  "parameters": {
    "indicators": ["rsi", "macd", "bollinger"],
    "risk_level": "moderate"
  },
  "response_format": "detailed"
}
```

### 3. **sniper-market-data.json** - Données de Marché ✅
Schema pour les données de marché en temps réel et historiques.

#### Types de Données :
- **real_time_quote** - Cotations en temps réel
- **historical_data** - Séries historiques
- **technical_analysis** - Indicateurs techniques
- **fundamental_data** - Données fondamentales
- **options_chain** - Chaînes d'options
- **market_depth** - Carnet d'ordres

## 🚀 Utilisation dans le Bot

### Configuration dans ClaudeChatBotAgent.ts :
```typescript
// Activer le schema Sniper Financial
const sniperSkillsPath = path.resolve(PROJECT_ROOT, '.claude', 'skills', 'sniper-financial-skills.json');
if (fsSync.existsSync(sniperSkillsPath)) {
    command += ` --schema "${sniperSkillsPath}"`;
    console.log(`[claude-chatbot] ✅ Sniper Financial Skills enabled: ${sniperSkillsPath}`);
}
```

### Validation des Réponses
Le bot utilise ces schémas pour :
1. **Valider** les réponses générées par KiloCode
2. **Structurer** les données financières
3. **Générer** les embeds Discord
4. **Créer** des signaux de trading valides

## 📊 Cas d'Usage Typiques

### 1. Analyse de Marché Complète
```json
{
  "type": "market_analysis",
  "content": "Analyse ES Futures - Tendance haussière confirmée",
  "market_analysis": {
    "symbol": "ES",
    "current_price": 4789.25,
    "trend": "bullish",
    "technical_indicators": {
      "rsi": 68.5,
      "macd": 15.2,
      "moving_average_50": 4765.30,
      "moving_average_200": 4720.15
    },
    "support_levels": [4775, 4760, 4745],
    "resistance_levels": [4800, 4825, 4850]
  },
  "embed": {
    "title": "📈 ES Futures Analysis",
    "color": 65280,
    "fields": [
      {"name": "Signal", "value": "🟢 BUY", "inline": true},
      {"name": "Confiance", "value": "75%", "inline": true}
    ]
  }
}
```

### 2. Signal de Trading Actif
```json
{
  "type": "trading_signal",
  "content": "🚨 Signal Trading: ES - Opportunité d'achat",
  "trading_signal": {
    "action": "BUY",
    "symbol": "ES",
    "confidence": 90,
    "entry_price": 4788.50,
    "stop_loss": 4768.00,
    "take_profit": 4835.00,
    "risk_reward_ratio": 2.8,
    "position_size": "large"
  },
  "buttons": [
    {
      "type": 2,
      "style": 3,
      "label": "✅ Valider Signal",
      "custom_id": "validate_signal_ES",
      "emoji": "✅"
    }
  ]
}
```

### 3. Rapport de Sentiment
```json
{
  "type": "sentiment_report",
  "content": "Sentiment de marché actuel",
  "sentiment_report": {
    "overall_score": 65,
    "sentiment_label": "bullish",
    "news_sources_analyzed": 156,
    "key_topics": ["Fed", "inflation", "earnings"],
    "market_impact": "high",
    "time_period": "24h"
  },
  "embed": {
    "title": "📊 Market Sentiment Report",
    "color": 32768,
    "fields": [
      {"name": "Score Global", "value": "65/100 (Bullish)", "inline": true},
      {"name": "Sources", "value": "156 articles", "inline": true}
    ]
  }
}
```

## 🎯 Skills Discord Légataires (Référence)

Les skills originaux sont toujours disponibles pour référence :

### 📁 **discord-file-upload.md**
Upload de fichiers dans Discord

### 💬 **discord-rich-messages.md**
Messages enrichis (embeds) Discord

### 📊 **discord-polls.md**
Sondages interactifs Discord

### 💻 **discord-code-formatting.md**
Formatage de code avec syntaxe highlighting

## 🔧 Maintenance et Évolutions

### Ajout de Nouveaux Types de Réponses :
1. Modifier `nova-financial-skills.json`
2. Ajouter les nouveaux types dans `enum`
3. Définir les propriétés dans `$defs`
4. Mettre à jour le code de parsing

### Extension des Commandes :
1. Modifier `nova-trading-commands.json`
2. Ajouter nouvelles commandes dans `enum`
3. Définir les paramètres attendus
4. Implémenter la logique dans le bot

### Tests de Validation :
```bash
# Tester la validité des schémas
npx ajv validate -s nova-financial-skills.json -d test-response.json

# Valider toutes les réponses du bot
npm run validate:responses
```

## 📈 Architecture Sniper

```
.claude/
├── skills/
│   ├── sniper-financial-skills.json    # ✅ Schema principal trading
│   ├── sniper-trading-commands.json   # ✅ Commandes trading
│   ├── sniper-market-data.json        # ✅ Données de marché
│   ├── discord-file-upload.md         # 📁 Upload fichiers
│   ├── discord-rich-messages.md       # 💬 Messages enrichis
│   ├── discord-polls.md               # 📊 Sondages
│   ├── discord-code-formatting.md     # 💻 Formatage code
│   ├── discord-skills.json            # 📋 Schema original
│   ├── discord-skills-simple.json     # 📋 Schema simplifié
│   └── README.md                      # 📖 Cette documentation
├── agents/
│   └── discord-agent-simple.json      # 🤖 Configuration Sniper
└── settingsM.json                     # ⚙️ Profile MiniMax-M2
```

---

🚀 **Sniper Financial Bot** utilise ces schémas pour fournir des réponses structurées, validées et adaptées au trading financier !

**Version** : 2.0.0 - Sniper Financial Edition
**Date** : 2025-12-14
**Status** : ✅ Production Ready