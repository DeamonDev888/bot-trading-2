# 📝 Commandes Exactes Claude Code

## 📅 Date : 2025-01-14
## ❓ Question : Quelle commande exacte est envoyée à Claude Code ?

---

## 🎯 **RÉPONSE : 2 COMMANDES DIFFÉRENTES**

**ClaudeChatBotAgent** envoie **2 commandes distinctes** à Claude Code :

---

## 1️⃣ **COMMANDE D'INITIALISATION (Mode Persistant)**

### **Commande exacte exécutée :**
```bash
claude --dangerously-skip-permissions --settings "C:/Users/Deamon/Desktop/Backup/financial analyst/.claude/settingsM.json" --agents "C:/Users/Deamon/Desktop/Backup/financial analyst/.claude/agents/discord-agent-simple.json" --agent discord-agent --print --output-format json
```

### **Décomposée :**
```bash
claude \
  --dangerously-skip-permissions \
  --settings "C:/Users/Deamon/Desktop/Backup/financial analyst/.claude/settingsM.json" \
  --agents "C:/Users/Deamon/Desktop/Backup/financial analyst/.claude/agents/discord-agent-simple.json" \
  --agent discord-agent \
  --print \
  --output-format json
```

### **Utilisation :**
- ✅ Démarre le processus Claude Code persistant
- ✅ Garde le processus ouvert pour les messages suivants
- ✅ Reçoit le system prompt après le démarrage

---

## 2️⃣ **COMMANDE D'ENVOI MESSAGE (Mode Echo Pipe)**

### **Commande exacte exécutée :**
```bash
echo "Réponds simplement \"OK\"" | claude --dangerously-skip-permissions --settings "C:/Users/Deamon/Desktop/Backup/financial analyst/.claude/settingsM.json" --agents "C:/Users/Deamon/Desktop/Backup/financial analyst/.claude/agents/discord-agent-simple.json" --agent discord-agent --print --output-format json
```

### **Décomposée :**
```bash
echo "Réponds simplement \"OK\"" | \
  claude \
  --dangerously-skip-permissions \
  --settings "C:/Users/Deamon/Desktop/Backup/financial analyst/.claude/settingsM.json" \
  --agents "C:/Users/Deamon/Desktop/Backup/financial analyst/.claude/agents/discord-agent-simple.json" \
  --agent discord-agent \
  --print \
  --output-format json
```

### **Utilisation :**
- ✅ Envoie un message via echo pipe
- ✅ Utilise une nouvelle instance Claude Code
- ✅ Pas de persistance (pour tests ou fallback)

---

## 📊 **PARAMÈTRES DÉTAILLÉS**

### **`--dangerously-skip-permissions`**
- Contourne les vérifications de permissions
- Permet l'exécution automatique

### **`--settings "path"`**
- Chemin vers le fichier de configuration
- `settingsM.json` : Configuration principale

### **`--agents "path"`**
- Chemin vers le fichier d'agents
- `discord-agent-simple.json` : Définition de l'agent Discord

### **`--agent discord-agent`**
- Nom de l'agent à utiliser
- Défini dans `discord-agent-simple.json`

### **`--print`**
- Force la sortie en format texte/JSON
- Pas d'interface interactive

### **`--output-format json`**
- Force la sortie en JSON
- Plus facile à parser

---

## 🔄 **UTILISATION DANS LE CODE**

### Dans `initializeClaudeSession()` (lignes 194-219)
```typescript
let command = 'claude --dangerously-skip-permissions';

if (settingsFile && fsSync.existsSync(settingsFile)) {
    command += ` --settings "${settingsPath}"`;
}

if (agentsFile && fsSync.existsSync(agentsFile)) {
    command += ` --agents "${agentsPath}"`;
}

command += ' --agent discord-agent';
command += ' --print --output-format json';

console.log(`[claude-chatbot] 🛠️ Starting Claude Code with command:`);
console.log(`[claude-chatbot]    ${command}`);

this.claudeProcess = spawn(command, {
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: false,
    // ...
});
```

### Dans `executeClaudeOneShot()` (ligne 660)
```typescript
const escapedMessage = message.replace(/"/g, '\\"');
const settingsPath = CLAUDE_SETTINGS_PATH;
const agentsPath = CLAUDE_AGENTS_PATH;

const command = `echo "${escapedMessage}" | claude --dangerously-skip-permissions --settings "${settingsPath}" --agents "${agentsPath}" --agent discord-agent --print --output-format json`;

const { stdout, duration } = await this.executeClaudeExec(command, 45000);
```

---

## 🎯 **DIFFÉRENCES ENTRE LES MODES**

| Aspect | Mode Persistant | Mode Echo Pipe |
|--------|----------------|----------------|
| **Processus** | Un seul, maintenu | Nouveau à chaque fois |
| **Performance** | Plus rapide | Plus lent |
| **Contexte** | Préservé entre messages | Pas de contexte |
| **Utilisation** | Production | Tests/Fallback |

---

## 📄 **FICHIERS DE CONFIGURATION**

### `settingsM.json`
- Configuration principale de Claude
- API keys, modèles, paramètres globaux

### `discord-agent-simple.json`
- Définition de l'agent Discord
- Prompt système, instructions spécifiques

---

## 🔥 **POINTS IMPORTANTS**

1. **Deux modes** : Persistant (recommandé) et Echo Pipe (fallback)
2. **Sortie JSON** : Obligatoire pour parsing automatique
3. **Agent spécifique** : `discord-agent` défini dans le fichier
4. **Chemins absolus** : Utilisés pour la compatibilité
5. **Échappement** : Messages échappés pour éviter les conflits

---

## 🏁 **COMMANDE LA PLUS COURANTE**

**En production, le mode persistant est utilisé :**

```bash
claude --dangerously-skip-permissions --settings "C:/Users/Deamon/Desktop/Backup/financial analyst/.claude/settingsM.json" --agents "C:/Users/Deamon/Desktop/Backup/financial analyst/.claude/agents/discord-agent-simple.json" --agent discord-agent --print --output-format json
```

**Puis les messages sont envoyés via stdin du processus persistant.**

---

*Documentation des commandes Claude Code - 2025-01-14*
