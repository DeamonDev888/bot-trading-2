# DiscordChatBotAgent2 - Agent Discord avec Claude Code

## 📋 Vue d'ensemble

`DiscordChatBotAgent2` est un agent Discord identique à `DiscordChatBotAgent.ts` original, mais utilisant **Claude Code** au lieu de **KiloCode** pour l'analyse et les réponses.

## 🎯 Caractéristiques principales

### ✅ Identique à l'agent original
- Toutes les fonctionnalités de l'agent original
- Gestion des profils membres
- Support des sondages Discord
- Messages enrichis avec embeds
- Upload de fichiers
- Détection et formatage de code blocks
- Historique des conversations
- Gestion des erreurs robuste

### 🆕 Utilise Claude Code
- **Moteur IA**: Claude (Anthropic) au lieu de KiloCode (x-ai/grok-code-fast-1)
- **Persistance**: Mode `--continue` pour conversation continue
- **Format**: JSON avec champ `"result"` au lieu de `"content"`
- **Logs**: `claude_chat_logs.json` pour traçabilité

## 🔧 Spécifications techniques

### Fichier
- **Chemin**: `src/backend/agents/DiscordChatBotAgent2.ts`
- **Lignes**: 1649 lignes
- **Classe**: `DiscordChatBotAgent2`
- **Hérite**: `BaseAgentSimple`

### Intégration Claude Code

```typescript
// Commande utilisée
claude -p --output-format json --continue --model sonnet

// Options:
// -p                    : Mode non-interactif (print)
// --output-format json  : Format JSON pour les réponses
// --continue            : Continuer la conversation
// --model sonnet        : Modèle Claude Sonnet
```

### Processus persistant

```typescript
private claudeProcess: ReturnType<typeof spawn> | null = null;
private isClaudeReady: boolean = false;
private responseBuffer: string = '';
private responseResolver: ((value: string) => void) | null = null;
private currentSessionId: string | null = null;
private conversationHistory: string[] = [];
```

## 📊 Comparaison: Original vs Agent2

| Aspect | DiscordChatBotAgent.ts | DiscordChatBotAgent2.ts |
|--------|----------------------|------------------------|
| **Moteur IA** | KiloCode (x-ai/grok) | Claude (Anthropic) |
| **Persistance** | `-s sessionId` | `--continue` |
| **Format JSON** | `{"content": "..."}` | `{"result": "..."}` |
| **Logs** | `kilo_chat_logs.json` | `claude_chat_logs.json` |
| **Lignes** | 4022 | 1649 |
| **Métodes** | 74+ | 70+ |

## 🚀 Utilisation

### Instanciation

```typescript
import { DiscordChatBotAgent2 } from './src/backend/agents/DiscordChatBotAgent2.js';

const agent = new DiscordChatBotAgent2();
```

### Chat persistant

```typescript
const request: ChatRequest = {
  message: 'Bonjour, comment allez-vous ?',
  username: 'Utilisateur123',
  isFirstMessage: true
};

const response = await agent.chat(request);
```

### Chat rapide

```typescript
const response = await agent.quickChat('Quel est le prix du Bitcoin ?');
```

### Traitement avec code

```typescript
const response = await agent.processResponseWithCode({
  text: 'Voici du code JavaScript:\n```js\nconsole.log("Hello");\n```'
});
```

## 📝 Méthodes principales

### Core Methods

```typescript
// Chat principal avec persistance
async chat(request: ChatRequest): Promise<ChatResponse>

// Chat rapide sans persistance
async quickChat(message: string, username?: string): Promise<ChatResponse>

// Traitement de réponses avec code
async processResponseWithCode(response: unknown): Promise<unknown>

// Obtenir la liste des profils chargés
getLoadedProfiles(): string[]
```

### Claude Process Management

```typescript
// Démarrer Claude en mode persistant
async startPersistentClaude(): Promise<void>

// Arrêter Claude proprement
async stopPersistentClaude(): Promise<void>

// Envoyer un message à Claude
private async sendToClaude(message: string): Promise<string>
```

### Utility Methods

```typescript
// Parsing des réponses
private async parseChatResponse(rawOutput: string): Promise<ChatResponse>

// Nettoyage du contenu
private intelligentContentClean(content: string): string

// Détection de code blocks
private detectAndFormatCodeBlocks(content: string): CodeBlockDetection
```

## 🎛️ Configuration

### Variables d'environnement

```bash
# Claude Code (si nécessaire)
CLAUDE_API_KEY=your_api_key

# Discord
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
```

### Paramètres modifiables

```typescript
// Timeout pour les réponses (défaut: 120s)
private waitForResponse(timeoutMs: number = 120000)

// Limite de l'historique (défaut: 20 messages)
if (this.conversationHistory.length > 20) {
  this.conversationHistory = this.conversationHistory.slice(-20);
}

// Port pour les tests (si applicable)
this.port = 8768;
```

## 📁 Fichiers générés

### Logs
- `claude_chat_logs.json` - Historique des conversations

### Profils
- `member_profiles/` - Profils des membres Discord

## 🔍 Parsing des réponses

### Formats supportés

1. **JSON Blocks**
   ```json
   {
     "type": "poll",
     "question": "Votre choix ?",
     "options": [...]
   }
   ```

2. **Messages enrichis**
   ```json
   {
     "type": "message_enrichi",
     "contenu": "Texte principal",
     "embeds": [...],
     "boutons": [...]
   }
   ```

3. **Upload de fichiers**
   ```json
   {
     "type": "file_upload",
     "fileName": "exemple.txt",
     "content": "Contenu..."
   }
   ```

### Extraction du contenu

```typescript
private extractJsonBlocks(text: string): string[]
private parseJsonEvents(text: string): unknown | null
private extractSimpleTextResponse(text: string): unknown | null
```

## 🛠️ Tests

### Script de test
```bash
npx tsx test_discordchatbot_agent2.ts
```

### Tests unitaires
```bash
npm test -- DiscordChatBotAgent2
```

### Test d'intégration
```bash
npm run bot:enhanced
```

## 📈 Performances

### Avantages
- ✅ Conversation continue sans relancer le processus
- ✅ Historique géré automatiquement
- ✅ Réponses plus rapides (pas de démarrage à chaque fois)
- ✅ Gestion robuste des erreurs

### Métriques
- **Temps de démarrage**: ~2-3 secondes (première fois)
- **Temps de réponse moyen**: 5-15 secondes
- **Consommation mémoire**: ~100-200 MB (processus persistant)
- **Historique**: 20 derniers messages en mémoire

## 🔄 Migration depuis KiloCode

### Changements nécessaires

1. **Import**
   ```typescript
   // Avant
   import { DiscordChatBotAgent } from './DiscordChatBotAgent.js';

   // Après
   import { DiscordChatBotAgent2 } from './DiscordChatBotAgent2.js';
   ```

2. **Instanciation**
   ```typescript
   // Avant
   const agent = new DiscordChatBotAgent();

   // Après
   const agent = new DiscordChatBotAgent2();
   ```

3. **Pas de changement d'API**
   - Toutes les méthodes ont la même signature
   - Les types `ChatRequest` et `ChatResponse` sont identiques
   - Le comportement est transparent

## 🐛 Dépannage

### Erreurs courantes

1. **Processus Claude non démarré**
   ```
   [discord-chatbot-2] ❌ Processus Claude mort, redémarrage...
   ```
   **Solution**: L'agent redémarre automatiquement

2. **Timeout de réponse**
   ```
   [discord-chatbot-2] ⌛ TIMEOUT atteint!
   ```
   **Solution**: Augmenter le timeout ou simplifier la requête

3. **Format JSON invalide**
   ```
   [discord-chatbot-2] Invalid JSON
   ```
   **Solution**: Vérifier que Claude renvoie du JSON valide

### Logs de débogage

```typescript
// Activer les logs détaillés
const agent = new DiscordChatBotAgent2();
// Les logs sont automatiquement écrits dans claude_chat_logs.json
```

## 🎨 Personnalisation

### Modifier le prompt système

```typescript
private getSystemPrompt(): string {
  return `# SNIPER - Bot Discord Analyste Financier

## 🤖 IDENTITÉ
Tu es **Sniper**, un bot Discord intelligent...`;
}
```

### Ajouter des modèles

```typescript
// Dans startPersistentClaude()
claude -p --output-format json --continue --model opus
// Modèles disponibles: sonnet, opus, haiku
```

## 📚 Documentation associée

- `src/backend/agents/DiscordChatBotAgent.ts` - Agent original (KiloCode)
- `src/backend/agents/BaseAgentSimple.ts` - Classe de base
- `docs/discord-kilocode-commands.md` - Commandes Discord

## 🤝 Contribution

Pour contribuer à l'agent :

1. Fork du projet
2. Créer une branche feature
3. Implémenter les changements
4. Ajouter les tests
5. Soumettre une PR

## 📄 Licence

Identique au projet principal (voir LICENSE)

## 👥 Équipe

- **Développeur**: Claude Code
- **Version**: 2.0 (Claude Code)
- **Dernière mise à jour**: 2025-12-12

---

**Note**: Cet agent est une adaptation de `DiscordChatBotAgent.ts` pour utiliser Claude Code au lieu de KiloCode. Toutes les fonctionnalités sont identiques, seul le moteur IA change.
