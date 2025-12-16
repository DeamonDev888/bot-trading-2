# KiloCode - Mode Persistance

## Utilisation de base

### Lancer KiloCode en mode persistant

```bash
kil -i
```

### Avec modèle spécifique

```bash
kil -i --model x-ai/grok-code-fast-1
```

### Avec ID de session

```bash
kil -i --session-id ma-session-123
```

## Options disponibles

| Option | Description | Exemple |
|--------|-------------|---------|
| `-i` | Mode JSON bidirectionnel (stdin/stdout) | `kil -i` |
| `--model` | Sélectionner le modèle | `kil -i --model x-ai/grok-beta` |
| `--session-id` | ID pour persistance de session | `kil -i --session-id my-session` |
| `--timeout` | Timeout en secondes | `kil -i --timeout 120` |
| `--buffer-size` | Taille buffer en MB | `kil -i --buffer-size 10` |

## Format JSON

### Envoi de message (stdin)

```json
{
  "type": "user",
  "content": "Votre message",
  "timestamp": "2025-12-12T23:00:00.000Z"
}
```

### Réception de réponse (stdout)

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

## Scripts de test

### Test complet avec persistance

```bash
node kilocode_persistent_test_fixed.mjs --simulate
```

### Chat interactif simple

```bash
node kilocode_simple_chat.mjs
```

### Exemple d'intégration

```bash
node integration_kilocode_example.mjs workflow
```

## Intégration dans votre code

```javascript
import { spawn } from 'child_process';

const kil = spawn('kil', ['-i', '--model', 'x-ai/grok-code-fast-1'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Envoyer un message
kil.stdin.write(JSON.stringify({
  type: 'user',
  content: 'Analyse ES futures'
}) + '\n');

// Recevoir la réponse
kil.stdout.on('data', (data) => {
  const response = JSON.parse(data.toString());
  console.log(response.content);
});
```

## Classe avec persistance

```javascript
import { spawn } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';

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

  send(content) {
    const message = { type: 'user', content, timestamp: new Date().toISOString() };
    this.process.stdin.write(JSON.stringify(message) + '\n');
    this.session.messages.push(message);
    this.saveSession();
  }

  close() {
    this.process.kill();
  }
}

// Utilisation
const chat = new KiloCodePersistent();
chat.start();
chat.send('Bonjour!');
```

## Installation

```bash
npm install -g @kilocode/cli
```

## Fichiers générés

- `./session.json` - Session active
- `./kilocode_history/` - Historique des sessions

## Points clés

- ✅ Mode `-i` active JSON bidirectionnel
- ✅ Persistance automatique avec `--session-id`
- ✅ Chaque ligne = un message JSON
- ✅ Fermeture propre avec `stdin.end()`
- ✅ Sauvegarde des sessions recommandée

## Bonnes pratiques

1. Toujours fermer proprement avec `stdin.end()`
2. Valider le JSON avant envoi
3. Sauvegarder régulièrement l'état
4. Gérer les timeouts
5. Utiliser des session-id uniques pour isoler les conversations
