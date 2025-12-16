# KiloCode Persistent Mode - Guide d'utilisation

## 🎯 Vue d'ensemble

KiloCode peut être utilisé en mode persistant sans interface TUI en utilisant l'option `-i` (JSON bidirectionnel). Cela permet :

- Conversation continue sans redémarrage
- Persistance de l'historique
- Intégration dans des scripts
- Contrôle programmatique
- Mode headless (sans interface graphique)

## 📁 Fichiers créés

1. **`kilocode_persistent_test.mjs`** - Script complet de test avec persistance
2. **`kilocode_simple_chat.mjs`** - Version simplifiée pour chat interactif

## 🚀 Utilisation

### Test complet de persistance

```bash
node kilocode_persistent_test.mjs
```

Ce script :
- ✅ Lance KiloCode en mode JSON
- ✅ Envoie 5 messages de test
- ✅ Vérifie la mémoire entre les messages
- ✅ Sauvegarde la session dans `kilocode_session.json`
- ✅ Crée un historique dans `kilocode_history/`

### Chat simple interactif

```bash
node kilocode_simple_chat.mjs
```

Tapez vos messages directement dans le terminal.

### Options avancées

```bash
# Changer le modèle
node kilocode_persistent_test.mjs --model x-ai/grok-beta

# Changer le timeout
node kilocode_persistent_test.mjs --timeout 60000

# Afficher l'aide
node kilocode_persistent_test.mjs --help
```

## 📊 Structure de session

### kilocode_session.json

```json
{
  "id": "1703123456789",
  "created": "2025-12-12T10:30:00.000Z",
  "messages": [
    {
      "type": "user",
      "content": "Bonjour! Je suis un test...",
      "timestamp": "2025-12-12T10:30:01.000Z",
      "test": "message-1"
    }
  ],
  "ended": "2025-12-12T10:35:00.000Z",
  "totalMessages": 5
}
```

### kilocode_history/

Les sessions complètes sont sauvegardées avec timestamp :
- `session-1703123456789.json`
- `session-1703123999000.json`
- etc.

## 🔧 Intégration dans votre code

### Exemple basique

```javascript
import { spawn } from 'child_process';

function startKiloCode(model = 'x-ai/grok-code-fast-1') {
  return spawn('kil', ['-i', '--model', model], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
}

// Utilisation
const kil = startKiloCode();

// Envoyer un message
kil.stdin.write(JSON.stringify({
  type: 'user',
  content: 'Votre message ici'
}) + '\n');

// Recevoir la réponse
kil.stdout.on('data', (data) => {
  const response = JSON.parse(data.toString());
  console.log(response.content);
});
```

### Exemple avec persistance

```javascript
import { readFileSync, writeFileSync } from 'fs';

class KiloCodePersistent {
  constructor(sessionFile = './session.json') {
    this.sessionFile = sessionFile;
    this.session = this.loadSession();
    this.process = null;
  }

  loadSession() {
    try {
      return JSON.parse(readFileSync(this.sessionFile, 'utf-8'));
    } catch {
      return { messages: [] };
    }
  }

  saveSession() {
    writeFileSync(this.sessionFile, JSON.stringify(this.session, null, 2));
  }

  start() {
    this.process = spawn('kil', ['-i'], { stdio: 'pipe' });

    this.process.stdout.on('data', (data) => {
      const response = JSON.parse(data.toString());
      this.session.messages.push(response);
      this.saveSession();
    });
  }

  send(message) {
    this.process.stdin.write(JSON.stringify(message) + '\n');
  }

  close() {
    this.process.kill();
  }
}

// Utilisation
const chat = new KiloCodePersistent();
chat.start();
chat.send({ type: 'user', content: 'Hello' });
```

## 🎛️ Options KiloCode utiles

| Option | Description | Exemple |
|--------|-------------|---------|
| `-i` | Mode JSON bidirectionnel | `kil -i` |
| `--model` | Sélectionner le modèle | `kil -i --model x-ai/grok-beta` |
| `--session-id` | ID de session persistant | `kil -i --session-id mon-id` |
| `--timeout` | Timeout en secondes | `kil -i --timeout 120` |
| `--buffer-size` | Taille buffer en MB | `kil -i --buffer-size 10` |

## 📡 Format JSON

### Message d'entrée (stdin)

```json
{
  "type": "user",
  "content": "Votre message",
  "timestamp": "2025-12-12T10:30:00.000Z",
  "metadata": {
    "custom": "data"
  }
}
```

### Réponse de sortie (stdout)

```json
{
  "type": "response",
  "content": "Réponse de KiloCode",
  "metadata": {
    "model": "x-ai/grok-code-fast-1",
    "tokens": 150,
    "duration": 2.3
  }
}
```

### Types supportés

- `user` - Message utilisateur
- `response` - Réponse de KiloCode
- `error` - Erreur
- `ready` - Signal prêt
- `ping` - Ping/pong
- `system` - Message système

## 🔍 Debug et logs

Le script de test affiche :
- ✅ Messages envoyés
- 📥 Réceptions
- ⚠️ Erreurs
- 💾 Sauvegardes
- 🔍 Debug info (stderr)

## ⚡ Bonnes pratiques

1. **Gestion d'erreurs** : Toujours catcher les erreurs de parsing JSON
2. **Timeout** : Définir un timeout pour éviter les blocages
3. **Buffer** : Surveiller la taille du buffer de sortie
4. **Fermeture propre** : Utiliser `stdin.end()` avant `kill()`
5. **Persistance** : Sauvegarder régulièrement l'état de la session

## 🐛 Dépannage

### "kil: command not found"
```bash
# Vérifier l'installation
which kil

# Reinstaller si nécessaire
npm install -g @kilocode/cli
```

### "JSON parse error"
- Vérifier que chaque ligne se termine par `\n`
- Ne pas envoyer plusieurs JSON sur une seule ligne
- Valider le JSON avant envoi

### Session ne persiste pas
- Vérifier les permissions d'écriture
- S'assurer que le `--session-id` est identique
- Contrôler la taille du fichier de session

### Timeout
- Augmenter le timeout : `--timeout 300`
- Vérifier la connectivité
- Réduire la complexité des prompts

## 📚 Exemples d'utilisation

### 1. Analyse financière continue

```javascript
const kil = spawn('kil', ['-i', '--model', 'x-ai/grok-code-fast-1']);

// Analyse 1
kil.stdin.write(JSON.stringify({
  type: 'user',
  content: 'Analyse ES futures, contexte: inflation 3.2%'
}) + '\n');

// Analyse 2 (contexte persistant)
kil.stdin.write(JSON.stringify({
  type: 'user',
  content: 'Maintenant, comment cela affecte-t-il le VIX?'
}) + '\n');
```

### 2. Chat Discord

```javascript
// Intégration Discord
bot.on('message', async (msg) => {
  if (msg.content.startsWith('!ai ')) {
    const kil = spawn('kil', ['-i']);
    const prompt = msg.content.substring(4);

    kil.stdout.on('data', (data) => {
      const response = JSON.parse(data.toString());
      msg.reply(response.content);
    });

    kil.stdin.write(JSON.stringify({
      type: 'user',
      content: prompt
    }) + '\n');
  }
});
```

## 🔐 Sécurité

- Ne jamais exposer la clé API dans le code
- Utiliser des variables d'environnement
- Valider les entrées utilisateur
- Limiter la taille des messages
- Implémenter un rate limiting

## 📞 Support

Pour plus d'informations :
- Documentation KiloCode : https://kilocode.dev
- GitHub : https://github.com/kilocode/cli
- Discord : https://discord.gg/kilocode
