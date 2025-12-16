# Guide d'Utilisation des Profils Bot

## 📋 Résumé

Le script `launch-bot-fixed.mjs` a été modifié pour supporter :
- Les arguments `-z` et `-m` pour charger différentes configurations KiloCode/Claude
- Les arguments `--force` et `--no-force` pour gérer les instances multiples
- Un **nettoyage intelligent des processus** pour éviter les conflits

## 🚀 Utilisation

### Commandes disponibles :

```bash
# Lance le bot (redémarrage forcé par défaut)
pnpm bot

# Lance le bot avec la configuration settingsZ.json
pnpm bot -z

# Lance le bot avec la configuration settingsM.json
pnpm bot -m

# Force le redémarrage si une instance existe
pnpm bot --force

# Refuse de démarrer si une instance existe
pnpm bot --no-force

# Combine profil et redémarrage forcé
pnpm bot -z --force
```

## ⚙️ Profils disponibles

### Profil Z (`-z`)
- **Fichier de configuration** : `.claude/settingsZ.json`
- **Base URL** : `https://api.z.ai/api/anthropic`
- **Utilisation** : Configuration alternative avec API Z

### Profil M (`-m`)
- **Fichier de configuration** : `.claude/settingsM.json`
- **Base URL** : `https://api.minimax.io/anthropic`
- **Utilisation** : Configuration MiniMax

## 🔧 Fonctionnalités

### 1. Chargement automatique des variables d'environnement
Le script charge automatiquement les variables d'environnement depuis le fichier de configuration spécifié et les applique au processus du bot.

### 2. Variables chargées
- `ANTHROPIC_AUTH_TOKEN` - Token d'authentification
- `ANTHROPIC_BASE_URL` - URL de l'API
- `ANTHROPIC_MODEL` - Modèle par défaut
- `API_TIMEOUT_MS` - Timeout des requêtes
- Et autres variables définies dans le fichier de configuration

### 3. Nettoyage intelligent des processus

Le script nettoie automatiquement avant le lancement :

#### 🖥️ Windows
- ✅ Processus `kilocode.exe`
- ✅ Processus Node.js liés à KiloCode
- ✅ Processus `sniper_financial_bot.js` (bot principal)
- ✅ Processus Node.js exécutant `DiscordChatBotAgent`
- ✅ Processus Node.js exécutant `ClaudeChatBotAgent`
- ✅ Processus orphans du projet

#### 🐧 Linux/Mac
- ✅ Processus KiloCode (`pkill -f kilocode`)
- ✅ Processus `sniper_financial_bot`
- ✅ Processus `DiscordChatBotAgent`
- ✅ Processus `ClaudeChatBotAgent`
- ✅ Processus du projet "financial analyst"

### 4. Gestion des instances multiples

Le script gère automatiquement les instances multiples via un fichier PID (`nova_bot.pid`).

#### Comportement par défaut (--force activé) :
1. ✅ Vérifie si une instance existe via le fichier PID
2. ✅ Si oui : tue l'ancienne instance (PID spécifique)
3. ✅ Supprime le fichier PID
4. ✅ Démarre la nouvelle instance

#### Avec --no-force :
1. ✅ Vérifie si une instance existe via le fichier PID
2. ✅ Si oui : affiche un message d'erreur et refuse de démarrer
3. ✅ Si non : démarre normalement

#### Détection et terminaison :
- **Vérification** : Lit le fichier `nova_bot.pid` et vérifie si le processus existe
- **Terminaison** : Utilise `taskkill /pid` (Windows) ou `kill -9` (Linux/Mac)
- **Validation** : Vérifie que le processus est bien terminé avant de continuer
- **Nettoyage** : Supprime le fichier PID après terminaison

### 5. Logs d'information
Le script affiche des informations détaillées :
- 📌 Profil détecté
- 📖 Configuration chargée
- 🔑 Nombre de variables d'environnement
- 🔐 Aperçu du token (premiers caractères)
- 🌐 Base URL utilisée
- 🤖 Modèle configuré
- 🧹 État du nettoyage des processus

## 🧪 Test

Pour tester le système :
```bash
node test-profiles.js
```

Ce script vérifie :
- Le parsing des arguments
- L'existence des fichiers de configuration
- La validité des configurations JSON

## 📁 Structure des fichiers

```
financial-analyst/
├── .claude/
│   ├── settingsZ.json    # Configuration profil Z
│   └── settingsM.json    # Configuration profil M
├── scripts/
│   └── launch-bot-fixed.mjs  # Script avec nettoyage amélioré
└── package.json
```

## 🛡️ Avantages

1. **Flexibilité** : Basculement facile entre différentes configurations
2. **Sécurité** : Pas d'exposition des tokens complets dans les logs
3. **Robustesse** : Gestion d'erreurs si les fichiers n'existent pas
4. **Compatibilité** : Fonctionne avec les commandes npm/pnpm existantes
5. **Anti-conflits** : Nettoie automatiquement les processus résiduels
6. **Cross-platform** : Gère Windows et Linux/Mac différemment
7. **Silence d'erreur** : Utilise des redirections pour éviter les erreurs non critiques
8. **Gestion d'instances** : Détecte et gère les instances multiples intelligemment
9. **Contrôle flexible** : Option --force/--no-force pour contrôler le comportement
10. **Fichier PID** : Utilise un système de fichier PID pour tracker les instances

## 🔄 Flux de démarrage

### Comportement par défaut (--force)

```
1. Parser les arguments (-z, -m, --force)
   ↓
2. Charger la configuration du profil (si spécifié)
   ↓
3. Nettoyer tous les processus résiduels (KiloCode + DiscordChatBot)
   ↓
4. Vérifier instance via fichier PID
   ↓
5. Si instance existe → La tuer par PID
   ↓
6. Supprimer le fichier PID
   ↓
7. Appliquer les variables d'environnement
   ↓
8. Lancer le bot Discord
   ↓
9. Sauvegarder le nouveau PID
   ↓
10. Surveiller et gérer les redémarrages
```

### Avec --no-force

```
1. Parser les arguments (-z, -m, --no-force)
   ↓
2. Charger la configuration du profil (si spécifié)
   ↓
3. Nettoyer tous les processus résiduels
   ↓
4. Vérifier instance via fichier PID
   ↓
5. Si instance existe → ERREUR et arrêt
   ↓
6. Si pas d'instance → Continuer
   ↓
7. Appliquer les variables d'environnement
   ↓
8. Lancer le bot Discord
   ↓
9. Sauvegarder le nouveau PID
   ↓
10. Surveiller et gérer les redémarrages
```

## ⚠️ Important

Le nettoyage automatique évite les conflits de ports et de ressources. Si vous avez des processus manuels en cours, ils seront terminés avant le nouveau lancement.
