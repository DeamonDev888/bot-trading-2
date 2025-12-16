# Discord Polls - Format du Bot Sniper

## Format JSON Correct

Le bot Sniper utilise un format JSON spécifique pour les sondages Discord.

## Format JSON Complet
```json
{
  "type": "poll",
  "poll": {
    "question": "Quelle est votre analyse du marché ES Futures ?",
    "options": [
      {"text": "Fortement Haussier", "emoji": "🔵"},
      {"text": "Légèrement Haussier", "emoji": "🟢"},
      {"text": "Neutre", "emoji": "🟡"},
      {"text": "Légèrement Baissier", "emoji": "🟠"},
      {"text": "Fortement Baissier", "emoji": "🔴"}
    ],
    "duration": 48,
    "allowMultiselect": false
  },
  "messages": ["Sondage créé sur la direction du marché ES Futures"]
}
```

## IMPORTANT: Durée en HEURES

La durée est exprimée en **HEURES** (pas en secondes) :
- Par défaut: **48 heures** (2 jours)
- Minimum: 1 heure
- Maximum: 768 heures (32 jours)

### Exemples de durées :
| Valeur | Résultat |
|--------|----------|
| `2` | 2 heures |
| `24` | 1 jour |
| `48` | 2 jours (défaut) |
| `168` | 1 semaine |

### Extraction automatique :
```
"durée 2h" → 2 heures
"durée 30 min" → 1 heure (minimum)
"durée 1 jour" → 24 heures
"durée 3 jours" → 72 heures
```

## IMPORTANT: Emojis Valides

Discord n'accepte que certains emojis pour les sondages. **NE PAS utiliser les emojis numériques** (1️⃣, 2️⃣, etc.).

### Emojis Recommandés (valides) :
```
🔵 🟢 🟡 🟠 🔴 🟣 ⚪ ⚫ 🟤 💎
✅ ❌ 📈 📉 🚀 ⚖️ 🛡️ 🎯 ⚡ 📊
```

### Emojis à ÉVITER (invalides) :
```
1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟
```

## Sélection de Channel Discord

Tu peux spécifier le channel où envoyer le sondage :

### Formats Supportés :

#### 1. Mention par nom (détection automatique)
```
"sondage dans #trading"
"sondage sur #general"
```

#### 2. Mention Discord directe
```
"sondage <#1234567890123456789>"
```

#### 3. Channel par défaut
Si aucun channel n'est spécifié, le sondage est envoyé **dans le même channel** que la demande.

## Types de Sondages

### 1. Sondage Simple Oui/Non
```json
{
  "poll": {
    "question": "Le S&P 500 va-t-il dépasser 4,150 cette semaine ?",
    "options": [
      {"text": "Oui", "emoji": "🟢"},
      {"text": "Non", "emoji": "🔴"}
    ],
    "duration": 24,
    "allowMultiselect": false
  },
  "messages": ["Sondage rapide sur la direction du marché"]
}
```

### 2. Sondage Multi-Options Trading
```json
{
  "poll": {
    "question": "Direction des ES Futures cette semaine ?",
    "options": [
      {"text": "Très haussier", "emoji": "🔵"},
      {"text": "Haussier", "emoji": "🟢"},
      {"text": "Neutre", "emoji": "🟡"},
      {"text": "Baissier", "emoji": "🟠"},
      {"text": "Très baissier", "emoji": "🔴"}
    ],
    "duration": 48,
    "allowMultiselect": false
  },
  "messages": ["Analysez la direction du marché"]
}
```

### 3. Sondage Multi-Sélection
```json
{
  "poll": {
    "question": "Quels indicateurs techniques utilisez-vous ?",
    "options": [
      {"text": "RSI", "emoji": "🔵"},
      {"text": "MACD", "emoji": "🟢"},
      {"text": "VWAP", "emoji": "🟡"},
      {"text": "Bollinger Bands", "emoji": "🟠"},
      {"text": "Fibonacci", "emoji": "🔴"}
    ],
    "duration": 24,
    "allowMultiselect": true
  },
  "messages": ["Choisissez les indicateurs que vous suivez"]
}
```

## Exemples d'Utilisation

### Commande Utilisateur → Réponse JSON
```
User: "sniper crée un sondage sur ES Futures avec 5 options: très haussier, haussier, neutre, baissier, très baissier"

Réponse:
{
  "poll": {
    "question": "Direction des ES Futures ?",
    "options": [
      {"text": "très haussier", "emoji": "🔵"},
      {"text": "haussier", "emoji": "🟢"},
      {"text": "neutre", "emoji": "🟡"},
      {"text": "baissier", "emoji": "🟠"},
      {"text": "très baissier", "emoji": "🔴"}
    ],
    "duration": 48,
    "allowMultiselect": false
  },
  "messages": ["Sondage créé sur la direction des ES Futures"]
}
```

### Avec durée personnalisée
```
User: "sniper sondage sur Bitcoin durée 1 jour"

→ duration: 24 (heures)
```

### Avec channel spécifique
```
User: "sniper sondage dans #trading sur le VIX"

→ Sondage envoyé dans #trading
```

## Points Importants

### Obligatoire
- `poll.question` : La question du sondage
- `poll.options` : Minimum 2 options, maximum 10
- `poll.options[].text` : Max 55 caractères

### Optionnel
- `poll.duration` : En heures, défaut 48h
- `poll.allowMultiselect` : true/false, défaut false
- `poll.channelId` : ID du channel cible

### Emojis par défaut (si non spécifiés)
L'agent utilise automatiquement : 🔵 🟢 🟡 🟠 🔴 🟣 ⚪ ⚫ 🟤 💎

## Erreurs Communes à Éviter

| Erreur | Correction |
|--------|------------|
| `"duration": 3600` (secondes) | `"duration": 1` (1 heure) |
| `"emoji": "1️⃣"` (invalide) | `"emoji": "🔵"` (valide) |
| `"allow_multiselect"` | `"allowMultiselect"` |
| `"content": "..."` | `"messages": ["..."]` |
| Moins de 2 options | Minimum 2 options requises |
| > 55 caractères par option | Sera tronqué automatiquement |

## Rappel

Le bot Sniper **extrait automatiquement** les sondages depuis le message de l'utilisateur :
- Question depuis le contexte
- Options depuis "avec X options: a, b, c" ou "options oui/non"
- Durée depuis "durée 2h" ou défaut 48h
- Channel depuis "dans #channel" ou channel actuel
