# Discord Rich Messages - Format Exact Bot Sniper

## 🎯 Structure JSON Correcte
Le bot Sniper utilise une structure spécifique pour les messages enrichis Discord.

## 📋 Format JSON Réel du Bot
```json
{
  "discordMessage": {
    "type": "message_enrichi",
    "data": {
      "content": "Message principal d'accompagnement",
      "embeds": [
        {
          "title": "📊 Analyse ES Futures",
          "description": "Analyse technique complète",
          "color": 3447003,
          "fields": [
            {
              "name": "Niveau Actuel",
              "value": "4502.50",
              "inline": true
            },
            {
              "name": "Sentiment",
              "value": "Haussier 📈",
              "inline": true
            }
          ],
          "footer": {
            "text": "Sniper Bot - ES Futures Trading"
          },
          "timestamp": "2025-12-14T22:00:00.000Z"
        }
      ]
    }
  },
  "messages": ["Analyse des ES Futures en cours..."]
}
```

---

## 📋 Guide de Référence Rapide - Tous les Formats

### 1. 📊 Sondage (Poll)
```json
{
  "poll": {
    "question": "Question ?",
    "options": [
      {"text": "Option 1", "emoji": "1️⃣"},
      {"text": "Option 2", "emoji": "2️⃣"}
    ],
    "duration": 3600,
    "allowMultiselect": false
  },
  "messages": ["Description"]
}
```

### 2. 🎨 Message Enrichi (Embed)
```json
{
  "discordMessage": {
    "type": "message_enrichi",
    "data": {
      "content": "Texte d'accompagnement",
      "embeds": [
        {
          "title": "Titre",
          "description": "Description",
          "color": 3447003,
          "fields": [
            {"name": "Champ", "value": "Valeur", "inline": true}
          ]
        }
      ]
    }
  },
  "messages": ["Message principal"]
}
```

### 3. 📁 Upload de Fichier
```json
{
  "fileUpload": {
    "type": "file_upload",
    "fichier": {
      "name": "monfichier.py",
      "content": "code ou contenu",
      "type": "python"
    },
    "message": {
      "contenu": "Fichier généré"
    }
  },
  "messages": ["Message d'accompagnement"]
}
```

### 4. 💻 Code + Upload (Combiné)
```json
{
  "messages": [
    "Code Python :",
    "```python\nprint('Hello')\n```"
  ],
  "fileUpload": {
    "type": "file_upload",
    "fichier": {
      "name": "script.py",
      "content": "print('Hello')",
      "type": "python"
    },
    "message": {"contenu": "Code uploadé"}
  }
}
```

### 5. 🎨 Embed Complet (Multi-champs)
```json
{
  "discordMessage": {
    "type": "message_enrichi",
    "data": {
      "content": "Analyse complète",
      "embeds": [
        {
          "title": "📊 ES Futures Analysis",
          "description": "Rapport détaillé",
          "color": 65280,
          "fields": [
            {"name": "Prix", "value": "4502.50", "inline": true},
            {"name": "RSI", "value": "65.2", "inline": true},
            {"name": "MACD", "value": "Signal haussier", "inline": false}
          ],
          "footer": {"text": "Sniper Bot"}
        }
      ]
    }
  },
  "messages": ["Rapport d'analyse généré"]
}
```

---

## ⚠️ Points Critiques
1. **Poll** : `poll.question`, `poll.options` (min 2), `duration` en secondes
2. **Embed** : `discordMessage.type = "message_enrichi"`, `data.embeds` (array)
3. **File** : `fileUpload.fichier.name`, `fileUpload.fichier.content`
4. **Messages** : Toujours inclure `messages` (array de strings)

## 🚫 Erreurs Fréquentes
- ❌ `content` → ✅ `messages`
- ❌ `allow_multiselect` → ✅ `allowMultiselect`
- ❌ `embed` directement → ✅ `discordMessage.data.embeds`
- ❌ Pas de `messages` → ✅ Toujours inclure

**🎯 Rappel** : Ces formats sont **détectés automatiquement** par le bot Sniper !

## 🎨 Structure Embed Réelle
```json
{
  "discordMessage": {
    "type": "message_enrichi",
    "data": {
      "content": "Texte d'accompagnement du message",
      "embeds": [
        {
          "title": "Analyse ES Futures",
          "description": "Analyse technique complète",
          "color": 3447003,
          "fields": [
            {
              "name": "Niveau Actuel",
              "value": "4502.50",
              "inline": true
            },
            {
              "name": "Sentiment",
              "value": "Haussier 📈",
              "inline": true
            }
          ],
          "footer": {
            "text": "Sniper Bot - ES Futures Trading"
          },
          "timestamp": "2025-01-15T10:30:00Z"
        }
      ]
    }
  },
  "messages": ["Analyse technique en cours..."]
}
```

## 💻 Combinaison Message + Code (Structure Réelle)
```json
{
  "messages": [
    "Voici le code Python pour calculer le RSI :",
    "```python\ndef calculate_rsi(prices, period=14):\n    delta = prices.diff()\n    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()\n    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()\n    rs = gain / loss\n    rsi = 100 - (100 / (1 + rs))\n    return rsi\n```"
  ],
  "discordMessage": {
    "type": "message_enrichi",
    "data": {
      "content": "Code RSI généré avec succès",
      "embeds": [
        {
          "title": "📊 Calculateur RSI",
          "description": "Code Python pour l'indicateur RSI",
          "color": 0x00ff00,
          "fields": [
            {
              "name": "Période",
              "value": "14 (standard)",
              "inline": true
            },
            {
              "name": "Fichier",
              "value": "rsi_calculator.py",
              "inline": true
            }
          ]
        }
      ]
    }
  }
}
```

## 🎯 Examples d'utilisation Réels

### 1. Rapport d'analyse complet
```
User: "Sniper, rapport complet ES Futures avec embed"
Response correct:
{
  "messages": ["Voici l'analyse complète des ES Futures"],
  "discordMessage": {
    "type": "message_enrichi",
    "data": {
      "content": "📊 Rapport d'analyse ES Futures",
      "embeds": [
        {
          "title": "📊 Analyse ES Futures",
          "description": "Analyse technique et sentiment du marché",
          "color": 3447003,
          "fields": [
            {
              "name": "Prix Actuel",
              "value": "4502.50",
              "inline": true
            },
            {
              "name": "RSI",
              "value": "65.2",
              "inline": true
            },
            {
              "name": "MACD",
              "value": "Signal haussier",
              "inline": false
            }
          ],
          "footer": {
            "text": "Sniper Bot - ES Futures Trading"
          }
        }
      ]
    }
  }
}
```

### 2. Signal de trading avec embed
```
User: "Sniper, signal d'achat détecté"
Response correct:
{
  "messages": ["🚨 SIGNAL D'ACHAT DÉTECTÉ SUR ES FUTURES"],
  "discordMessage": {
    "type": "message_enrichi",
    "data": {
      "content": "Alerte trading",
      "embeds": [
        {
          "title": "📈 SIGNAL D'ACHAT",
          "description": "Breakout confirmé au-dessus de 4500",
          "color": 65280,
          "fields": [
            {
              "name": "Prix d'entrée",
              "value": "4502.50",
              "inline": true
            },
            {
              "name": "Stop Loss",
              "value": "4485.00",
              "inline": true
            },
            {
              "name": "Objectif",
              "value": "4520.00",
              "inline": true
            }
          ],
          "footer": {
            "text": "ES Futures - Signal automatique"
          }
        }
      ]
    }
  }
}
```

## 🎨 Couleurs disponibles
- **Vert (Haussier)**: 65280 (0x00FF00)
- **Rouge (Baissier)**: 16711680 (0xFF0000)
- **Bleu (Neutre)**: 3447003 (0x3498db)
- **Jaune (Alerte)**: 16776960 (0xFFFF00)
- **Violet (VIP)**: 10181038 (0x9B59B6)