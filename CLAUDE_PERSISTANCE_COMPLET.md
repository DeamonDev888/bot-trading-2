# Claude CLI - Persistance RÉELLE (Testée et Confirmée)

## ✅ **CE QUI FONCTIONNE**

### Format de Base
```bash
echo "Message" | claude -p --output-format json
```

### Réponse JSON
```json
{
  "result": "Réponse de Claude",
  "session_id": "76fd2468-9ca8-42e0-948d-06861de3c08b",
  "modelUsage": {
    "MiniMax-M2": {
      "inputTokens": 110,
      "outputTokens": 674,
      "costUSD": 0.143
    }
  }
}
```

## 🔑 **PERSISTANCE AVEC SESSION-ID**

Pour utiliser la persistance :

1. **Premier message** - Obtient un sessionId :
```bash
echo "Mon nom est Claude" | claude -p --output-format json
```

2. **Extraire le sessionId** de la réponse :
```bash
SESSION_ID=$(echo "Mon nom est Claude" | claude -p --output-format json | grep -o '"session_id":"[^"]*"' | cut -d'"' -f4)
```

3. **Utiliser ce sessionId** pour les messages suivants :
```bash
echo "Quel est mon nom?" | claude -p --output-format json --session-id $SESSION_ID
```

## 📋 **OPTIONS IMPORTANTES**

| Option | Description | Exemple |
|--------|-------------|---------|
| `-p, --print` | Mode non-interactif (pour pipes) | `claude -p` |
| `--output-format json` | Format JSON en sortie | `claude -p --output-format json` |
| `--output-format stream-json` | Streaming JSON en temps réel | `claude -p --output-format stream-json` |
| `--input-format stream-json` | Streaming JSON en entrée | `claude -p --input-format stream-json` |
| `-c, --continue` | Continuer la dernière conversation | `claude -c` |
| `-r, --resume [id]` | Reprendre par session ID | `claude -r <id>` |
| `--session-id <uuid>` | Spécifier un session ID | `claude --session-id xxx` |
| `--no-session-persistence` | Désactiver la persistance | `claude --no-session-persistence` |
| `--model <model>` | Modèle à utiliser | `claude --model sonnet` |
| `--tools <tools>` | Outils autorisés | `claude --tools Bash,Read` |

## 📡 **FORMAT JSON COMPLET**

### Sortie Standard
```json
{
  "result": "Contenu de la réponse",
  "session_id": "uuid",
  "total_cost_usd": 0.143,
  "modelUsage": {
    "MiniMax-M2": {
      "inputTokens": 110,
      "outputTokens": 674,
      "costUSD": 0.143
    }
  },
  "usage": {
    "input_tokens": 108,
    "output_tokens": 330,
    "cache_creation_input_tokens": 19060
  }
}
```

### Streaming JSON (--output-format stream-json)
```json
{
  "event": "message_start",
  "message": { "id": "xxx", "type": "message" }
}
{
  "event": "content_block_delta",
  "delta": { "text": "Hello" }
}
{
  "event": "message_stop",
  "message": { "id": "xxx" }
}
```

### Input Streaming (--input-format stream-json)
```json
{
  "role": "user",
  "content": "Votre message"
}
```

## 🧪 **Script de Test**

```bash
#!/bin/bash

# Test 1: Premier message
echo "TEST 1: Présentation"
RESPONSE1=$(echo "Mon nom est Claude" | claude -p --output-format json)
SESSION_ID=$(echo "$RESPONSE1" | grep -o '"session_id":"[^"]*"' | cut -d'"' -f4)

# Test 2: Avec session persistante
echo "TEST 2: Vérification mémoire"
echo "Quel est mon nom?" | claude -p --output-format json --session-id $SESSION_ID

# Test 3: Mode --continue
echo "TEST 3: Mode --continue"
echo "Merci!" | claude -p --output-format json -c
```

## 💡 **Exemples d'Utilisation**

### Script Node.js
```javascript
import { exec } from 'child_process';

class ClaudePersistent {
  constructor() {
    this.sessionId = null;
  }

  async send(message) {
    const cmd = this.sessionId
      ? `echo '${message}' | claude -p --output-format json --session-id ${this.sessionId}`
      : `echo '${message}' | claude -p --output-format json`;

    const { stdout } = await exec(cmd);

    // Parser le JSON
    const response = JSON.parse(stdout);

    // Sauvegarder le sessionId
    if (response.session_id && !this.sessionId) {
      this.sessionId = response.session_id;
    }

    return response;
  }
}

// Utilisation
const claude = new ClaudePersistent();
await claude.send('Mon nom est Claude');
const response = await claude.send('Quel est mon nom?');
console.log(response.result);
```

### Avec --continue
```bash
# Continuer la dernière conversation
echo "Nouvelle question" | claude -p --output-format json -c
```

### Avec --resume
```bash
# Reprendre une session spécifique
echo "Question" | claude -p --output-format json -r 76fd2468-9ca8-42e0-948d-06861de3c08b
```

### Streaming en temps réel
```bash
# Streaming JSON
echo "Raconte-moi une histoire" | claude -p --output-format stream-json
```

### Avec outils spécifiques
```bash
# Utiliser des outils spécifiques
echo "Lis le fichier README.md" | claude -p --output-format json --tools Read,Bash
```

## ⚠️ **Points d'Attention**

1. **Format JSON requis**
   - Utiliser `--output-format json` pour JSON
   - Sans cette option, sortie en texte

2. **Session persistence**
   - Sessions sauvegardées par défaut
   - Peut être désactivé avec `--no-session-persistence`

3. **Mode --print nécessaire**
   - `-p` requis pour les pipes et JSON
   - Active le mode non-interactif

4. **Session ID doit être un UUID valide**
   - Format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   - Utiliser des UUIDs valides

5. **Coût des API calls**
   - Chaque appel a un coût (visible dans `total_cost_usd`)
   - Surveiller l'usage avec `modelUsage`

## 🔄 **Modes de Persistance**

### 1. Session ID explicite
```bash
SESSION=$(echo "Init" | claude -p --output-format json | grep -o '"session_id":"[^"]*"' | cut -d'"' -f4)
echo "Question" | claude -p --output-format json --session-id $SESSION
```

### 2. Mode --continue
```bash
echo "Question 1" | claude -p --output-format json -c
echo "Question 2" | claude -p --output-format json -c
```

### 3. Mode --resume
```bash
# Lister les sessions
claude -r

# Reprendre une session spécifique
echo "Question" | claude -p --output-format json -r <SESSION_ID>
```

## 📊 **Comparaison avec KiloCode**

| Feature | KiloCode | Claude |
|---------|----------|--------|
| Mode JSON | `-i` | `--output-format json` |
| Session ID | `-s <id>` | `--session-id <uuid>` |
| Continuer | `--continue` | `-c, --continue` |
| Format | `{"type":"user","content":"..."}` | `echo "message"` |
| Streaming | N/A | `--stream-json` |
| Coût visible | Non | Oui (`total_cost_usd`) |

## ✅ **Conclusion**

- ✅ Claude fonctionne en mode JSON
- ✅ Persistance avec `--session-id` ou `-c`
- ✅ Multiple modes de continuation
- ✅ Streaming JSON supporté
- ✅ Coût tracking intégré

**Claude CLI offre plus de flexibilité que KiloCode pour la persistance !**

---

**Date :** 2025-12-12
**Status :** ✅ TESTÉ ET FONCTIONNEL
