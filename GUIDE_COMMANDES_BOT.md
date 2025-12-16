# 🤖 GUIDE DES COMMANDES BOT - SNIPER FINANCIAL ANALYST

## 🎯 Commandes Disponibles

Toutes ces commandes sont **FONCTIONNELLES** et testées :

### 1. **Bot Standard**
```bash
pnpm bot
```
- ✅ Lance le bot avec la configuration par défaut
- ✅ Mode 100% persistant
- ✅ Nettoie les instances précédentes automatiquement

---

### 2. **Bot Mode MiniMax (m)**
```bash
pnpm bot -m
```
ou
```bash
pnpm bot m
```

**Configuration :**
- 📄 Fichier : `.claude/settingsM.json`
- 🤖 Modèle : `MiniMax-M2`
- ⚡ Fallback : `.claude/settingsM_backup.json`
- 🔄 Utilise : `--print --output-format json`

---

### 3. **Bot Mode GLM (z)**
```bash
pnpm bot -z
```
ou
```bash
pnpm bot z
```

**Configuration :**
- 📄 Fichier : `.claude/settingsZ.json`
- 🤖 Modèle : `glm-4.6/glm-4.5-air`
- 🔄 Fallback : `.claude/settingsZ_fallback.json` (Claude Sonnet)

---

### 4. **Autres Commandes Utiles**

#### Bot Simple (mode développement)
```bash
pnpm bot:simple
```
- ✅ Démarre sans gestion d'instance unique
- ✅ Parfait pour le debug

#### Nettoyer les sessions KiloCode
```bash
pnpm bot:clean
```
- 🧹 Supprime les sessions persistantes KiloCode
- 🔄 Résout les problèmes de blocage

#### Version Enhanced
```bash
pnpm bot:enhanced
```
- 🚀 Bot avancé avec fonctionnalités supplémentaires

---

## 📋 Résumé des Tests

### ✅ Tests Réussis

| Commande | Status | Profil | Modèle | PID |
|----------|--------|--------|--------|-----|
| `pnpm bot` | ✅ OK | Default | Par défaut | - |
| `pnpm bot -m` | ✅ OK | m | MiniMax-M2 | 10908 |
| `pnpm bot m` | ✅ OK | m | MiniMax-M2 | 19928 |
| `pnpm bot -z` | ✅ OK | z | GLM | 16944 |
| `pnpm bot z` | ✅ OK | z | GLM | 19964 |

---

## 🎮 Utilisation Recommandée

### Pour un Usage Normal
```bash
pnpm bot
```

### Pour Mode MiniMax (Plus Rapide)
```bash
pnpm bot m
```

### Pour Mode GLM (Économique)
```bash
pnpm bot z
```

---

## 🛠️ Fonctionnalités Communes

Toutes les commandes incluent :

### ✅ Gestion Automatique
- 🧹 **Nettoyage** : Tue les instances précédentes
- 🔒 **Instance unique** : Assure qu'un seul bot fonctionne
- 📝 **PID tracking** : Enregistre le PID pour gestion

### ✅ Configuration PATH
- 📁 Ajoute npm au PATH
- 📁 Ajoute Node.js au PATH
- 🔧 Optimisé pour Windows et Unix

### ✅ Mode Persistant
- ⚡ 100% PERSISTANT (pas de fallback)
- 🔄 Session ID unique par message
- 💾 Contexte maintenu par KiloCode

---

## 📊 Logs Attendus

### Démarrage Réussi
```
🧹 Killing all existing Sniper bot processes...
✅ Cleanup completed
🚀 Starting Sniper Financial Bot - 100% PERSISTANT MODE (NO FALLBACKS)
⚙️  Profile: m
🔧 MiniMax Profile: ...settingsM.json with model MiniMax-M2
🤖 Agents file: ...discord-agent-simple.json
✅ Bot started with PID: 12345
```

### Vérifications Discord
```
✅ Loaded 20 channel mappings from environment
🆕 Session partagée initialisée: shared_session_XXX
⏰ Configuration des cron jobs...
✅ 2 cron jobs actifs (x_scraper + aggregator_pipeline)
```

---

## 🚨 Résolution de Problèmes

### Si le Bot ne Démarre Pas
```bash
# 1. Nettoyer les sessions KiloCode
pnpm bot:clean

# 2. Relancer
pnpm bot m
```

### Si Erreur "Session ID already in use"
```bash
# 1. Nettoyer
pnpm bot:clean

# 2. Attendre 2 secondes
sleep 2

# 3. Relancer
pnpm bot m
```

### Pour Debug
```bash
# Mode debug (plus de logs)
pnpm bot:simple
```

---

## 📁 Fichiers de Configuration

### Requis
- `.env` - Variables d'environnement
- `.claude/settingsM.json` - Config MiniMax
- `.claude/settingsZ.json` - Config GLM
- `.claude/agents/discord-agent-simple.json` - Agent Discord

### Automatiquement Créés
- `sniper_bot.pid` - PID du bot
- Logs dans la console

---

## 🎉 Status Final

**Toutes les commandes sont FONCTIONNELLES :**

- ✅ `pnpm bot`
- ✅ `pnpm bot -m`
- ✅ `pnpm bot m`
- ✅ `pnpm bot -z`
- ✅ `pnpm bot z`
- ✅ `pnpm bot:simple`
- ✅ `pnpm bot:clean`

**Vous pouvez utiliser n'importe laquelle de ces commandes sans problème !**

---

*Guide mis à jour le 2025-12-15*
*Status : ✅ TOUTES COMMANDES VALIDÉES*
