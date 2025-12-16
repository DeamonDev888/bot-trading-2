# 🎯 Discord Skills - Guide Complet

## 📋 Vue d'ensemble
Ce dossier contient les **skills Discord** du bot Sniper. Ces skills expliquent comment utiliser les fonctionnalités avancées pour créer des sondages, messages enrichis, uploads de fichiers, et formatage de code.

---

## 📚 Liste des Skills

### 1. 📊 [discord-polls.md](./discord-polls.md)
**Créer des sondages Discord interactifs**
- Sondages simple Oui/Non
- Sondages multi-options (trading, sentiment)
- Sondages multi-sélection
- Thèmes prédéfinis (Trading, Économique)
- **🆕 Sélection de channel** : Spécifier où envoyer le sondage
- **Format clé** : `{"poll": {"question": "...", "options": [...]}}`

### 2. 🎨 [discord-rich-messages.md](./discord-rich-messages.md)
**Messages Discord enrichis avec embeds**
- Embeds avec titres, descriptions, couleurs
- Champs multiples (inline/non-inline)
- Footers et timestamps
- Combinaison messages + embeds
- **Format clé** : `{"discordMessage": {"type": "message_enrichi", "data": {...}}}`

### 3. 📁 [discord-file-upload.md](./discord-file-upload.md)
**Upload de fichiers vers Discord**
- Fichiers de code (Python, JavaScript, etc.)
- Fichiers de données (CSV, JSON)
- Configuration et paramètres
- Upload automatique depuis le code
- **Format clé** : `{"fileUpload": {"fichier": {"name": "...", "content": "..."}}}`

### 4. 💻 [discord-code-formatting.md](./discord-code-formatting.md)
**Formatage et coloration syntaxique**
- Support de 20+ langages de programmation
- Code inline et blocs de code
- Détection automatique des langages
- Intégration avec file upload
- **Format clé** : Messages avec ```langage``` blocks

### 5. 📖 [INSTRUCTIONS_CLAUDE.md](./INSTRUCTIONS_CLAUDE.md)
**Guide d'instruction pour Claude**
- Comment utiliser les skills
- Exemples concrets d'utilisation
- Détection automatique des intentions
- **Utile pour** : Comprendre comment Claude doit répondre

---

## 🚀 Démarrage Rapide

### Pour créer un sondage :
```json
{
  "poll": {
    "question": "Direction du marché ES Futures ?",
    "options": [
      {"text": "📈 Haussier", "emoji": "🚀"},
      {"text": "➡️ Neutre", "emoji": "⚖️"},
      {"text": "📉 Baissier", "emoji": "🔻"}
    ],
    "duration": 3600,
    "allowMultiselect": false,
    "channelId": "trading" // 🔥 NOUVEAU: Channel spécifique
  },
  "messages": ["Sondage créé"]
}
```

### Pour un message enrichi :
```json
{
  "discordMessage": {
    "type": "message_enrichi",
    "data": {
      "content": "Analyse technique",
      "embeds": [{
        "title": "📊 ES Futures",
        "description": "Prix: 4502.50",
        "color": 65280
      }]
    }
  },
  "messages": ["Rapport généré"]
}
```

### Pour uploader un fichier :
```json
{
  "fileUpload": {
    "type": "file_upload",
    "fichier": {
      "name": "script.py",
      "content": "print('Hello')",
      "type": "python"
    }
  },
  "messages": ["Fichier créé"]
}
```

---

## 🔍 Détection Automatique

Le bot Sniper **détecte automatiquement** ces structures dans vos réponses :

1. **Mots-clés de sondage** : "sondage", "vote", "poll"
2. **Patterns JSON** : Structures avec `poll`, `discordMessage`, `fileUpload`
3. **Fichiers mentionnés** : "uploade ce fichier", "créé un fichier"
4. **Code blocks** : Blocs avec ```langage```

---

## ⚡ Utilisation dans Claude

### Exemples de commandes :
```
"Sniper, crée un sondage dans #trading sur le SP500"
"Sniper, affiche un rapport avec embed"
"Sniper, uploade ce code Python"
"Sniper, montre ce code avec coloration"
```

### L'agent IA peut :
✅ Créer des sondages interactifs avec sélection de channel
✅ Générer des messages enrichis avec embeds
✅ Uploader des fichiers automatiquement
✅ Formater le code avec coloration syntaxique
✅ Combiner plusieurs fonctionnalités

---

## 📐 Structure Générale des Réponses

Toutes les réponses peuvent combiner :

```json
{
  "messages": ["Message principal", "Message 2"],
  "poll": { /* Sondage si demandé */ },
  "discordMessage": { /* Embed si demandé */ },
  "fileUpload": { /* Fichier si demandé */ }
}
```

---

## 🎯 Points Importants

### ✅ Obligatoire
- **Poll** : `poll.question` + `poll.options` (min 2)
- **Embed** : `discordMessage.type = "message_enrichi"`
- **File** : `fileUpload.fichier.name` + `fileUpload.fichier.content`
- **Messages** : Toujours inclure `messages` (array)
- **Channel** : Optionnel, détecté automatiquement

### ⏱️ Durées des Sondages
- **Flash** : 60-300 secondes
- **Standard** : 900-3600 secondes
- **Analyse** : 3600-7200 secondes
- **Max** : 768 heures (32 jours)

### 🚫 Erreurs Fréquentes
- ❌ `"content"` → ✅ `"messages"`
- ❌ `"allow_multiselect"` → ✅ `"allowMultiselect"`
- ❌ `embed` direct → ✅ `discordMessage.data.embeds`
- ❌ Pas de `messages`

### 🔥 NOUVEAU: Channel Selection
- **Langage naturel** : "sondage dans #trading" → Détection automatique
- **JSON direct** : `"channelId": "123456789"`
- **Par défaut** : Channel actuel si pas spécifié

---

## 🔗 Liens Utiles

- **[discord-polls.md](./discord-polls.md)** → Guide détaillé des sondages
- **[discord-rich-messages.md](./discord-rich-messages.md)** → Guide des embeds
- **[discord-file-upload.md](./discord-file-upload.md)** → Guide des uploads
- **[discord-code-formatting.md](./discord-code-formatting.md)** → Guide du code
- **[INSTRUCTIONS_CLAUDE.md](./INSTRUCTIONS_CLAUDE.md)** → Instructions pour Claude

---

## 💡 Tips

1. **Combinez les skills** : Un sondage + un embed + un fichier
2. **Utilisez les émojis** : 🎯📊📈 pour améliorer l'expérience
3. **Soyez descriptifs** : Les messages d'accompagnement aident
4. **Testez simple d'abord** : Commencez avec des structures basiques
5. **Consultez les exemples** : Chaque skill contient des exemples réels
6. **Spécifiez les channels** : Utilisez "dans #channel" pour les sondages ciblés

---

**🎯 Rappel** : Le bot Sniper rend ces fonctionnalités **transparentes** - utilisez les mots-clés naturels et l'IA s'occupe du reste !
