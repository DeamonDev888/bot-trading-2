# 📁 Discord File Upload - Format Exact Bot Sniper

## 🎯 Structure JSON Correcte
Le bot Sniper utilise un format JSON spécifique pour l'upload de fichiers.

## 📋 Format JSON Réel du Bot
```json
{
  "fileUpload": {
    "type": "file_upload",
    "fichier": {
      "name": "rsi_calculator.py",
      "content": "def calculate_rsi(prices, period=14):\n    delta = prices.diff()\n    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()\n    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()\n    rs = gain / loss\n    rsi = 100 - (100 / (1 + rs))\n    return rsi",
      "type": "python"
    },
    "message": {
      "contenu": "📁 Fichier RSI généré avec succès",
      "embeds": [
        {
          "title": "📊 Calculateur RSI",
          "description": "Code Python pour l'indicateur RSI",
          "color": 0x00ff00
        }
      ]
    }
  },
  "messages": ["Fichier Python créé et uploadé"]
}
```

## Utilisation dans Claude

### Exemple 1: Upload de Code Python
```
User: "Sniper, crée un fichier Python avec cette fonction RSI"

Réponse JSON correcte:
{
  "fileUpload": {
    "type": "file_upload",
    "fichier": {
      "name": "calculate_rsi.py",
      "content": "def calculate_rsi(prices):\n    delta = np.diff(prices)\n    gain = (delta + np.abs(delta)) / 2\n    loss = (np.abs(delta) - np.abs(delta)) / 2\n    rs = gain / loss\n    rsi = 100 - (100 / (1 + rs))\n    return rsi",
      "type": "python"
    },
    "message": {
      "contenu": "📁 Fichier RSI généré avec succès"
    }
  },
  "messages": ["Fonction RSI créée et uploadée"]
}
```

### Exemple 2: Upload de Données CSV
```
User: "Sniper, génère un fichier CSV avec ces données de prix"

Réponse JSON correcte:
{
  "fileUpload": {
    "type": "file_upload",
    "fichier": {
      "name": "prix_es_futures.csv",
      "content": "Date,Open,High,Low,Close,Volume\\n2025-12-14,4498.50,4505.25,4495.75,4502.50,125000\\n2025-12-13,4492.25,4500.00,4490.50,4498.50,118000",
      "type": "csv"
    },
    "message": {
      "contenu": "📊 Fichier CSV des prix ES Futures généré"
    }
  },
  "messages": ["Données CSV créées et uploadées"]
}
```

### Exemple 3: Upload de Configuration JSON
```
User: "Sniper, sauvegarde cette configuration dans un fichier JSON"

Réponse JSON correcte:
{
  "fileUpload": {
    "type": "file_upload",
    "fichier": {
      "name": "config.json",
      "content": "{\\n  \"database\": {\\n    \"host\": \"localhost\",\\n    \"port\": 5432,\\n    \"name\": \"financial_db\"\\n  },\\n  \"api\": {\\n    \"timeout\": 30000,\\n    \"retries\": 3\\n  }\\n}",
      "type": "json"
    },
    "message": {
      "contenu": "⚙️ Configuration sauvegardée dans config.json"
    }
  },
  "messages": ["Fichier de configuration créé et uploadé"]
}
```

## Formats Supportés

| Langage | Extension | MIME Type |
|---------|-----------|-----------|
| Python | `.py` | `text/x-python` |
| JavaScript | `.js` | `application/javascript` |
| TypeScript | `.ts` | `text/typescript` |
| JSON | `.json` | `application/json` |
| CSV | `.csv` | `text/csv` |
| Markdown | `.md` | `text/markdown` |
| SQL | `.sql` | `application/sql` |
| Shell | `.sh` | `text/x-shellscript` |

## Détection Automatique

Claude détecte automatiquement :
- Blocs de code markdown (```lang)
- Fichiers mentionnés ("uploade ce fichier")
- Données structurées (JSON, CSV)

## Configuration

### Taille maximale
- Discord limite : 8 MB par fichier
- Vérification automatique avant upload

### Nettoyage automatique
- Fichiers temporaires supprimés après upload
- Dossier `temp_uploads/` nettoyé périodiquement

## Erreurs Communes

### Fichier trop volumineux
```typescript
if (file.size > 8 * 1024 * 1024) {
    // Diviser en plusieurs fichiers
    // Ou utiliser un service externe (Google Drive, etc.)
}
```

### Format non supporté
```typescript
// Utiliser l'extension par défaut
const extension = languageMap[language] || '.txt';
```

## Bonnes Pratiques

1. **Nommer clairement** les fichiers
2. **Ajouter des métadonnées** (description, auteur)
3. **Vérifier la taille** avant upload
4. **Nettoyer** les fichiers temporaires
5. **Utiliser des extensions** appropriées

## Exemple Complet

```typescript
import { CodeFormatter } from './CodeFormatter.js';
import { CodeFileManager } from './CodeFileManager.js';
import { DiscordFileUploader } from './DiscordFileUploader.js';

async function uploadCodeExample(channel, messageContent) {
    // 1. Détecter le code
    const codeBlocks = CodeFormatter.detectCodeBlocks(messageContent);

    if (codeBlocks.length > 0) {
        // 2. Créer le fichier
        const file = await CodeFileManager.createUploadFile(
            codeBlocks[0],
            'Généré par Claude Code'
        );

        // 3. Uploader
        await DiscordFileUploader.uploadFile({
            channelId: channel.id,
            filePath: file.path,
            filename: file.filename,
            message: `📁 ${file.description || 'Fichier généré'}`
        });
    }
}
```

## Utilisation dans les Prompts

Dans Claude Code, vous pouvez simplement dire :

```
Claude, crée un fichier avec ce contenu et uploade-le.
```

Ou pour du code :

```
Claude, sauvegarde ce script Python et partage-le dans le canal.
```

Claude comprends automatiquement et utilise les bons outils !
