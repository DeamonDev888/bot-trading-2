# Guide : Intégration Claude Code avec Arguments -z et -m

## 🎯 Résumé

Le bot Discord utilise maintenant **Claude Code CLI** au lieu de KiloCode, avec support complet des arguments `-z` et `-m` pour changer de profil de configuration.

## 🚀 Utilisation

### Commandes de lancement

```bash
# Lance avec profil Z (settingsZ.json)
pnpm bot -z

# Lance avec profil M (settingsM.json)
pnpm bot -m

# Lance sans profil (défaut)
pnpm bot
```

## 🔧 Fonctionnement

### 1. **Script de lancement** (`scripts/launch-bot-fixed.mjs`)

Définit les variables d'environnement :
- `CLAUDE_PROFILE` : Profil à utiliser (`z`, `m`, ou `default`)
- `CLAUDE_CONFIG_FILE` : Chemin vers le fichier de configuration

### 2. **ClaudeChatBotAgent** (`src/backend/agents/ClaudeChatBotAgent.ts`)

Récupère les variables et construit la commande :

```typescript
// Récupération des variables
const profile = process.env.CLAUDE_PROFILE || 'default';
const configFile = process.env.CLAUDE_CONFIG_FILE || CLAUDE_SETTINGS_PATH;

// Construction de la commande
let command = 'claude -m ask --auto';

if (profile === 'z') {
    command += ' -z';
} else if (profile === 'm') {
    command += ' -m';
}

if (configFile) {
    command += ` --config "${configFile}"`;
}

// Exécution
const fullCommand = `echo "${message}" | ${command}`;
```

## 📋 Flux complet

```
1. pnpm bot -z
   ↓
2. launch-bot-fixed.mjs parsing
   ↓
3. Variables d'env définies :
   - CLAUDE_PROFILE = 'z'
   - CLAUDE_CONFIG_FILE = '.claude/settingsZ.json'
   ↓
4. Bot démarre avec ces variables
   ↓
5. ClaudeChatBotAgent.chat() appelé
   ↓
6. executeClaudeOneShot() récupère variables
   ↓
7. Commande construite : 'claude -m ask --auto -z --config ".claude/settingsZ.json"'
   ↓
8. Claude Code CLI exécuté avec profil Z
```

## 🎛️ Profils supportés

### Profil Z (`-z`)
- **Config** : `.claude/settingsZ.json`
- **Base URL** : `https://api.z.ai/api/anthropic`
- **Token** : Token API Z

### Profil M (`-m`)
- **Config** : `.claude/settingsM.json`
- **Base URL** : `https://api.minimax.io/anthropic`
- **Token** : Token API MiniMax

### Profil par défaut
- **Pas d'argument** `-z` ou `-m`
- Utilise la configuration système par défaut

## 📊 Logs

Lors du lancement, vous verrez :

```
🎯 Variables ClaudeChatBotAgent: CLAUDE_PROFILE=z, CLAUDE_CONFIG_FILE=C:\Users\...\settingsZ.json
```

Lors de l'exécution :

```
[claude-chatbot] ⚙️ Profile: z
[claude-chatbot] 📄 Config file: C:\Users\...\settingsZ.json
[claude-chatbot] 🛠️ Command: claude -m ask --auto -z --config "C:\Users\...\settingsZ.json"
```

## ⚙️ Personnalisation

### Modifier la commande Claude

Dans `src/backend/agents/ClaudeChatBotAgent.ts`, méthode `executeClaudeOneShot()` :

```typescript
// Ajouter d'autres arguments
command += ' --timeout 60';
command += ' --verbose';
```

### Changer les variables d'environnement

Dans `scripts/launch-bot-fixed.mjs` :

```typescript
botEnv.CLAUDE_CUSTOM_VAR = 'valeur';
```

## ✅ Vérification

Pour vérifier que le bon profil est utilisé :

1. Lancer : `pnpm bot -z`
2. Vérifier les logs :
   ```
   [claude-chatbot] ⚙️ Profile: z
   [claude-chatbot] 🛠️ Command: claude -m ask --auto -z --config "..."
   ```

## ⚠️ Notes

- Le fichier de configuration est lu depuis les variables d'environnement
- Les tokens sont passés via le fichier de configuration
- La commande Claude Code est construite dynamiquement
- Support complet des arguments `-z` et `-m` comme demandé

---

**Statut** : ✅ **FONCTIONNEL**
**Support** : Profils Z, M, et défaut
