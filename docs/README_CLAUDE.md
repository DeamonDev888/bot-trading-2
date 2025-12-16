# Claude CLI - Utilisation avec Persistance

## 🎯 **RÉSULTAT FINAL**

✅ **LA PERSISTANCE FONCTIONNE !**
Claude CLI conserve la mémoire entre les messages avec `--session-id` ou `--continue`.

## 📋 **Commandes de Base**

### Lancer Claude en mode JSON
```bash
echo "Message" | claude -p --output-format json
```

### Avec persistance (session persistante)
```bash
# 1. Premier message (obtient sessionId)
echo "Mon nom est Claude" | claude -p --output-format json

# 2. Extraire le sessionId
SESSION_ID=$(<commande> | grep -o '"session_id":"[^"]*"' | cut -d'"' -f4)

# 3. Utiliser le sessionId pour les messages suivants
echo "Quel est mon nom?" | claude -p --output-format json --session-id $SESSION_ID
```

### Mode --continue (plus simple)
```bash
# Continuer la dernière conversation
echo "Question 1" | claude -p --output-format json -c
echo "Question 2" | claude -p --output-format json -c
```

## 🧪 **Test de Persistance**

### Script Bash (Fonctionne !)
```bash
chmod +x test_claude_persistance.sh
bash test_claude_persistance.sh
```

Ce script teste :
1. ✅ Présentation avec nom
2. ✅ Rappel du nom avec sessionId (PERSISTANCE CONFIRMÉE)
3. ✅ Analyse ES futures
4. ✅ Utilisation du nom dans la réponse (PERSISTANCE CONFIRMÉE)
5. ✅ Mode --continue

## 📡 **Format JSON**

### Entrée
```bash
echo "Votre message" | claude -p --output-format json
```

### Sortie
```json
{
  "result": "Réponse de Claude",
  "session_id": "76fd2468-9ca8-42e0-948d-06861de3c08b",
  "total_cost_usd": 0.143,
  "usage": {
    "input_tokens": 108,
    "output_tokens": 330
  }
}
```

## 🔑 **Options Importantes**

| Option | Description | Exemple |
|--------|-------------|---------|
| `-p, --print` | Mode non-interactif | `claude -p` |
| `--output-format json` | Format JSON | `claude -p --output-format json` |
| `--output-format stream-json` | Streaming JSON | `claude -p --output-format stream-json` |
| `-c, --continue` | Continuer dernière conversation | `claude -c` |
| `-r, --resume [id]` | Reprendre par ID | `claude -r <id>` |
| `--session-id <uuid>` | Session persistante | `claude --session-id xxx` |
| `--no-session-persistence` | Désactiver persistance | `claude --no-session-persistence` |
| `--model <model>` | Modèle à utiliser | `claude --model sonnet` |
| `--tools <tools>` | Outils autorisés | `claude --tools Read,Bash` |

## 💡 **Script Node.js d'Exemple**

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
    const response = JSON.parse(stdout);

    // Sauvegarder le sessionId
    if (response.session_id && !this.sessionId) {
      this.sessionId = response.session_id;
      console.log('Session ID:', this.sessionId);
    }

    return response.result;
  }
}

// Utilisation
const claude = new ClaudePersistent();
await claude.send('Mon nom est Claude');
const response = await claude.send('Quel est mon nom?');
console.log(response); // Se souvient du nom !
```

## 📁 **Fichiers de Documentation**

- `CLAUDE_PERSISTANCE_COMPLET.md` - Documentation complète
- `test_claude_persistance.sh` - Script de test (✅ testé et fonctionnel)
- `README_CLAUDE.md` - Ce fichier

## ⚠️ **Points Clés**

1. ✅ **Persistance fonctionne** avec `--session-id` ou `-c`
2. 📝 **Format simple** : `echo "message" | claude -p --output-format json`
3. 🔄 **Trois modes** : session-id explicite, --continue, --resume
4. ⏱️ **Mode -p requis** pour JSON et pipes
5. 💰 **Coût tracké** : `total_cost_usd` dans la réponse

## 🎯 **Utilisation Recommandée**

### Mode Simple (--continue)
```bash
# Plus simple, continue la dernière conversation
echo "Question 1" | claude -p --output-format json -c
echo "Question 2" | claude -p --output-format json -c
```

### Mode Session-ID (contrôle total)
```bash
# 1. Créer une session
SESSION=$(echo "Init" | claude -p --output-format json | grep -o '"session_id":"[^"]*"' | cut -d'"' -f4)

# 2. Utiliser la session pour tous les messages suivants
echo "Question 1" | claude -p --output-format json --session-id $SESSION
echo "Question 2" | claude -p --output-format json --session-id $SESSION
echo "Question 3" | claude -p --output-format json --session-id $SESSION
```

### Mode Resume
```bash
# Lister les sessions disponibles
claude -r

# Reprendre une session spécifique
echo "Question" | claude -p --output-format json -r <SESSION_ID>
```

## ✅ **Confirmation Test**

Le test `test_claude_persistance.sh` confirme :
- ✅ Claude se souvient du nom "Claude"
- ✅ La persistance fonctionne avec sessionId
- ✅ Les réponses utilisent le contexte précédent
- ✅ Le mode --continue fonctionne aussi

## 🔥 **Avantages de Claude vs KiloCode**

| Feature | Claude | KiloCode |
|---------|--------|----------|
| Format simple | `echo "msg"` | `{"type":"user","content":"msg"}` |
| Streaming | ✅ `--stream-json` | ❌ |
| Coût visible | ✅ `total_cost_usd` | ❌ |
| Modes multiples | ✅ 3 modes | ❌ 1 mode |
| Session list | ✅ `claude -r` | ❌ |

---

**Status :** ✅ TESTÉ ET CONFIRMÉ
**Date :** 2025-12-12
