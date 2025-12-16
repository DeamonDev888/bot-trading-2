# 🎯 Générateur de Signaux Trading Discord

## 📖 Utilisation

### Script Principal
```bash
ts-node --esm src/discord_bot/signal_generator.ts [options]
```

### Options Disponibles

| Option | Alias | Description | Requis |
|--------|-------|-------------|--------|
| `--action` | `-a` | Action (ACHAT/VENTE) | ✅ |
| `--symbol` | `-s` | Symbole (ES, NQ, RTY, etc.) | ✅ |
| `--entry` | `-e` | Prix d'entrée | ✅ |
| `--stop-loss` | `--sl` | Stop Loss | ✅ |
| `--take-profit-1` | `--tp1` | Take Profit 1 | ✅ |
| `--take-profit-2` | `--tp2` | Take Profit 2 | ❌ |
| `--timeframe` | `--tf` | Timeframe (M1, M5, M15, M30, H1, H4, D1) | ✅ |
| `--confidence` | `-c` | Niveau de confiance (%) | ❌ |
| `--rrr` | `-r` | Ratio Risk/Reward | ❌ |
| `--volume` | `-v` | Volume (Faible/Moyen/Élevé) | ❌ |
| `--notes` | `-n` | Notes personnalisées | ❌ |

## 💡 Exemples d'Utilisation

### 1. Signal ES Futures Simple
```bash
ts-node --esm src/discord_bot/signal_generator.ts \
  --action ACHAT \
  --symbol ES \
  --entry 4892.50 \
  --stop-loss 4875.00 \
  --take-profit-1 4910.00 \
  --timeframe M15
```

### 2. Signal Complet avec Tous les Paramètres
```bash
ts-node --esm src/discord_bot/signal_generator.ts \
  --action ACHAT \
  --symbol ES \
  --entry 4892.50 \
  --stop-loss 4875.00 \
  --take-profit-1 4910.00 \
  --take-profit-2 4925.00 \
  --timeframe M15 \
  --confidence 85 \
  --rrr "1:2.5" \
  --volume Élevé \
  --notes "Breakout confirmé sur résistance clés"
```

### 3. Signal de Vente NQ
```bash
ts-node --esm src/discord_bot/signal_generator.ts \
  --action VENTE \
  --symbol NQ \
  --entry 17450.00 \
  --stop-loss 17480.00 \
  --take-profit-1 17420.00 \
  --timeframe M5 \
  --confidence 78 \
  --rrr "1:2" \
  --volume Moyen
```

### 4. Signal RTY (Russell 2000)
```bash
ts-node --esm src/discord_bot/signal_generator.ts \
  --action ACHAT \
  --symbol RTY \
  --entry 2085.50 \
  --stop-loss 2075.00 \
  --take-profit-1 2095.00 \
  --timeframe H1 \
  --confidence 82 \
  --rrr "1:2" \
  --volume Élevé
```

## 🎨 Fonctionnalités des Embeds

### Couleurs
- 🟢 **Vert (#00ff00)** : Signal d'achat
- 🔴 **Rouge (#ff0000)** : Signal de vente

### Boutons Interactifs
- ✅ **Acheter** / 📉 **Vendre** : Confirmer l'action
- ❌ **Ignorer** : Fermer le signal
- 📊 **TradingView** : Lien vers le graphique

### Réactions Automatiques
- 🚀 / 📉 : Action du signal
- 💰 : Profit
- 🎯 : Cible
- ⚡ : Vitesse/Opportunité

## 📊 Structure de l'Embed

```
📈 Signal d'Achat ES Futures
├── Titre avec emoji
├── Description avec timestamp
├── Couleur verte (achat) / rouge (vente)
├── Champs principaux :
│   ├── 🎯 Prix d'Entrée
│   ├── 🛑 Stop Loss
│   ├── 🎲 Confiance
│   ├── 💰 Take Profit 1
│   ├── 💰 Take Profit 2 (optionnel)
│   ├── ⏱️ Timeframe
│   ├── 📊 RRR
│   └── 📈 Volume
├── Indicateurs techniques (optionnels)
├── Notes personnalisées (optionnel)
├── Footer avec branding
└── Timestamp automatique
```

## 🔧 Scripts Pré-configurés

### 1. Signal Simple
```bash
node dist/discord_bot/signal_es_futures.js
```

### 2. Signal avec Indicateurs
```bash
node dist/discord_bot/signal_es_personalise.js
```

### 3. Générateur Manuel
```bash
ts-node --esm src/discord_bot/signal_generator.ts [options]
```

## 📝 Personnalisation Avancée

Pour ajouter des indicateurs techniques, modifiez le script `signal_generator.ts` et ajoutez :

```typescript
const signal: TradingSignal = {
    // ... autres champs
    indicators: {
        'RSI (14)': '68.5',
        'MACD': 'Signal haussier',
        'Bollinger': 'Prix proche bande supérieure',
        'SMA 20': 'Support dynamique',
        'EMA 50': 'Tendance haussière'
    }
};
```

## 🚀 Intégration Bot

Le signal peut être intégré dans le bot principal via :

```typescript
import { sendEsFuturesSignal } from './signal_es_futures.js';

// Dans une commande Discord
if (interaction.commandName === 'signal') {
    await sendEsFuturesSignal();
}
```

## ⚠️ Notes Importantes

1. **Canal Discord** : Le signal est envoyé dans le canal configuré par `DISCORD_CHANNEL_FINANCES` ou `DISCORD_CHANNEL_ANALYSIS`

2. **Permissions Bot** : Le bot doit avoir les permissions :
   - Envoyer des messages
   - Ajouter des réactions
   - Créer des boutons interactifs

3. **Limites Discord** :
   - Maximum 10 champs par embed
   - Maximum 2048 caractères par description
   - Maximum 1024 caractères par nom/valeur de champ

4. **Sécurité** :
   - Ne jamais révéler de vraies clés API
   - Valider tous les prix avant envoi
   - Ajouter des vérifications de risque
