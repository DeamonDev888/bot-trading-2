# 💻 Discord Code Formatting Skill

## Vue d'ensemble

Ce skill explique comment formater et afficher du code avec syntaxe highlighting dans Discord avec Claude Code.

## Principe de Base

Discord utilise les **backticks triples** pour créer des blocs de code avec syntaxe highlighting.

### Format Standard
```markdown
```lang
code content
```
```

Où `lang` est le langage de programmation (python, javascript, typescript, etc.)

---

## Langages Supportés

### Langages Courants
| Langage | Extension | Backticks | Exemple |
|---------|-----------|-----------|---------|
| Python | `.py` | \`\`\`python | Code Python |
| JavaScript | `.js` | \`\`\`javascript | Code JS |
| TypeScript | `.ts` | \`\`\`typescript | Code TS |
| Markdown | `.md` | \`\`\`markdown | Formatage MD |
| JSON | `.json` | \`\`\`json | Données JSON |
| Diff | `.diff` | \`\`\`diff | Différences |
| Bash/Shell | `.sh` | \`\`\`bash | Commandes |
| SQL | `.sql` | \`\`\`sql | Requêtes SQL |
| HTML | `.html` | \`\`\`html | Markup HTML |
| CSS | `.css` | \`\`\`css | Styles CSS |
| YAML | `.yaml` | \`\`\`yaml | Configuration |
| XML | `.xml` | \`\`\`xml | Données XML |

### Autres Langages
```
```java          # Java
```cpp          # C++
```c            # C
```go           # Go
```rust         # Rust
```php           # PHP
```ruby          # Ruby
```swift         # Swift
```kotlin        # Kotlin
```scala         # Scala
```r             # R
```matlab        # MATLAB
```powershell    # PowerShell
```dockerfile    # Docker
```ini           # Config (INI)
```properties    # Properties
```makefile      # Makefile
```

---

## Utilisation dans Claude

### Exemple 1: Code Python
```
Claude, affiche cette fonction avec la syntaxe Python :

```python
def calculate_rsi(prices):
    delta = np.diff(prices)
    gain = (delta + np.abs(delta)) / 2
    loss = (np.abs(delta) - np.abs(delta)) / 2
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi
```
```

**Résultat dans Discord**:
```python
def calculate_rsi(prices):
    delta = np.diff(prices)
    gain = (delta + np.abs(delta)) / 2
    loss = (np.abs(delta) - np.abs(delta)) / 2
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi
```

### Exemple 2: JavaScript avec ES6
```
Claude, montre ce code JavaScript avec la coloration syntaxique :

```javascript
const fetchMarketData = async (symbol) => {
    try {
        const response = await fetch(`/api/market/${symbol}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};
```
```

**Résultat dans Discord**:
```javascript
const fetchMarketData = async (symbol) => {
    try {
        const response = await fetch(`/api/market/${symbol}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};
```

### Exemple 3: TypeScript avec Types
```
Claude, formate ce TypeScript :

```typescript
interface MarketData {
    symbol: string;
    price: number;
    volume: number;
    timestamp: Date;
}

const getSP500Data = async (): Promise<MarketData[]> => {
    const response = await fetch('https://api.marketdata.com/sp500');
    return response.json();
};
```
```

**Résultat dans Discord**:
```typescript
interface MarketData {
    symbol: string;
    price: number;
    volume: number;
    timestamp: Date;
}

const getSP500Data = async (): Promise<MarketData[]> => {
    const response = await fetch('https://api.marketdata.com/sp500');
    return response.json();
};
```

### Exemple 4: Configuration JSON
```
Claude, affiche cette config JSON avec coloration :

```json
{
    "database": {
        "host": "localhost",
        "port": 5432,
        "name": "financial_db",
        "ssl": true
    },
    "api": {
        "timeout": 30000,
        "retries": 3,
        "rate_limit": 100
    }
}
```
```

**Résultat dans Discord**:
```json
{
    "database": {
        "host": "localhost",
        "port": 5432,
        "name": "financial_db",
        "ssl": true
    },
    "api": {
        "timeout": 30000,
        "retries": 3,
        "rate_limit": 100
    }
}
```

### Exemple 5: Diff de Code
```
Claude, montre les différences entre les versions :

```diff
- const oldValue = 100;
+ const newValue = 200;
  const result = calculate(oldValue);
- // Old comment
+ // New comment with more info
```
```

**Résultat dans Discord**:
```diff
- const oldValue = 100;
+ const newValue = 200;
  const result = calculate(oldValue);
- // Old comment
+ // New comment with more info
```

### Exemple 6: Markdown
```
Claude, formate ce README en Markdown :

```markdown
# Financial Analyst Bot

## Fonctionnalités

- 📊 Analyse de sentiment
- 📈 Données temps réel
- 💬 Discord intégration

### Installation

```bash
npm install
npm run build
```
```
```

**Résultat dans Discord**:
```markdown
# Financial Analyst Bot

## Fonctionnalités

- 📊 Analyse de sentiment
- 📈 Données temps réel
- 💬 Discord intégration

### Installation

```bash
npm install
npm run build
```
```

---

## Techniques Avancées

### 1. Code Inline
Pour du code court dans un texte :

```
Le paramètre `timeout` doit être défini à `30000` ms.
```

### 2. Multi-Blocs
Plusieurs blocs dans un message :

```
Voici les deux fonctions :

**Python:**
```python
def func1(x):
    return x * 2
```

**JavaScript:**
```javascript
const func2 = (x) => x * 2;
```
```

### 3. Code avec Commentaires
```
Claude, explique ce code avec les commentaires :

```typescript
// Configuration du client Discord
const discordClient = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// Initialisation de la session Claude
const claudeSession = new ClaudeSession({
    model: 'sonnet',
    persistent: true  // Active la persistence
});
```
```

### 4. Code dans Embed
```
Claude, crée un embed avec du code :

{
    "title": "📊 Analyse Technique",
    "description": "Code Python pour le calcul RSI :",
    "fields": [
        {
            "name": "```python\ndef rsi(prices):\n    # Calcul du RSI\n    pass\n```",
            "value": "Fonction complète"
        }
    ]
}
```

---

## Détection Automatique

Claude détecte automatiquement le langage :

### 1. Extensions de Fichiers
```
Claude, affiche le contenu de `calculator.py`
→ Détecte .py → utilise ```python
```

### 2. Mots-Clés
```
Claude, montre cette fonction `async/await`
→ Détecte JavaScript → utilise ```javascript
```

### 3. Patterns
```
Claude, formate ce JSON
→ Détecte { "key": "value" } → utilise ```json
```

---

## Bonnes Pratiques

### ✅ À Faire
1. **Utiliser le bon langage** dans les backticks
2. **Indenter correctement** le code
3. **Ajouter des commentaires** pour la clarté
4. **Limiter la taille** (Discord a une limite)
5. **Échapper les backticks** si nécessaire

### ❌ À Éviter
1. Omettre le langage (``` au lieu de ```python)
2. Code trop long (diviser en blocs)
3. Mélanger texte et code sans structure
4. Oublier de fermer les backticks

---

## Exemple Complet

### Demande Utilisateur
```
Claude, peux-tu me montrer un exemple de bot Discord en TypeScript avec la gestion des commandes ?
```

### Réponse Claude
```
Voici un exemple de bot Discord en TypeScript avec gestion des commandes :

```typescript
import { Client, GatewayIntentBits, SlashCommandBuilder } from 'discord.js';

// Création du client
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// Définir les commandes slash
const commands = [
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Répond avec Pong!'),
    new SlashCommandBuilder()
        .setName('analyze')
        .setDescription('Analyse le marché')
        .addStringOption(option =>
            option.setName('symbol')
                .setDescription('Symbole à analyser')
                .setRequired(true)
        )
];

// Événement prêt
client.once('ready', () => {
    console.log(`🤖 Bot connecté en tant que ${client.user?.tag}`);

    // Enregistrer les commandes
    client.application?.commands.set(commands);
});

// Gestion des interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'ping') {
        await interaction.reply('🏓 Pong!');
    }

    if (commandName === 'analyze') {
        const symbol = interaction.options.getString('symbol');
        await interaction.reply(`📊 Analyse de ${symbol} en cours...`);
    }
});

// Connexion
client.login(process.env.DISCORD_TOKEN);
```

**Pour utiliser ce code :**

1. Installer les dépendances :
```bash
npm install discord.js
```

2. Créer un fichier `.env` :
```env
DISCORD_TOKEN=your_bot_token_here
```

3. Compiler et lancer :
```bash
npx tsc bot.ts
node bot.js
```

Le bot sera opérationnel et répondra aux commandes `/ping` et `/analyze` !
```

---

## Raccourcis Claude

Dans Claude Code, vous pouvez simplement dire :

```
Claude, affiche ce code Python avec la syntaxe.

Claude, formate ce JSON avec coloration.

Claude, montre un diff des changements.

Claude, markdown pour ce README.
```

Claude comprend automatiquement et utilise la bonne syntaxe de backticks !

## Intégration avec File Upload

Ce skill fonctionne parfaitement avec le skill **discord-file-upload** :

```
User: "Sniper, crée ce code Python ET uploade-le"

Réponse JSON combinée:
{
  "messages": [
    "Voici le code Python pour le calcul RSI :",
    "```python\ndef calculate_rsi(prices):\n    # Calcul du RSI\n    delta = np.diff(prices)\n    gain = (delta + np.abs(delta)) / 2\n    loss = (np.abs(delta) - np.abs(delta)) / 2\n    rs = gain / loss\n    rsi = 100 - (100 / (1 + rs))\n    return rsi\n```"
  ],
  "fileUpload": {
    "type": "file_upload",
    "fichier": {
      "name": "rsi_calculator.py",
      "content": "def calculate_rsi(prices):\n    delta = np.diff(prices)\n    gain = (delta + np.abs(delta)) / 2\n    loss = (np.abs(delta) - np.abs(delta)) / 2\n    rs = gain / loss\n    rsi = 100 - (100 / (1 + rs))\n    return rsi",
      "type": "python"
    },
    "message": {
      "contenu": "📁 Code RSI affiché et uploadé"
    }
  }
}
```

**Résultat** :
1. ✅ Code affiché dans Discord (avec ```python)
2. ✅ Fichier uploadé en pièce jointe
```

## Limites Discord

- **Longueur max**: 2000 caractères par message
- **Solution**: Diviser en plusieurs messages
- **Alternatives**: Upload de fichier pour gros code

---

## Résumé des Commandes

| Action | Commande Claude |
|--------|-----------------|
| Code Python | `Claude, affiche ce Python` |
| Code JS/TS | `Claude, formate ce JavaScript` |
| JSON | `Claude, montre ce JSON` |
| Diff | `Claude, affiche le diff` |
| Markdown | `Claude, formate ce README` |
| Bash | `Claude, commande bash` |
| SQL | `Claude, requête SQL` |

---

**💡 Conseil**: Toujours spécifier le langage pour une meilleure coloration syntaxique !

---

**Auteur**: Claude Code Integration
**Skill**: discord-code-formatting
**Version**: 1.0.0
**Date**: 2025-12-13
