# 🚀 Guide Production - Financial Analyst Bot

## ⚡ Démarrage Rapide

### **npm (Recommandé - Projet actuel)**

```bash
# 1. Installer les dépendances
npm install

# 2. Compiler le projet
npm run build

# 3. Lancer le bot Discord
npm run bot

# 4. Mode debug (recommandé pour tests)
npm run bot:simple
```

### **pnpm (Alternative)**

```bash
# Installer pnpm
npm install -g pnpm

# Migrer le projet
rm -rf node_modules package-lock.json
pnpm install

# Compiler
pnpm run build

# Lancer
pnpm run bot
pnpm run bot:simple
```

---

## 📋 Scripts Disponibles

| Commande | Description |
|----------|-------------|
| `npm run build` | Compiler TypeScript + Fix imports |
| `npm run bot` | Lancer bot Discord complet |
| `npm run bot:simple` | Version simple pour debug |
| `npm run bot:enhanced` | Bot avec fonctionnalités avancées |
| `npm run analyze` | Analyse de marché |
| `npm run status` | Statut du système |
| `npm run refresh` | Rafraîchir les données |
| `npm run lint` | Vérifier le code |
| `npm run bot:clean` | Nettoyer les sessions |

---

## 🧪 Tests de Validation

### **Test Complet**
```bash
# Script automatique
bash validate_production.sh
```

### **Tests Manuels**

1. **Vérifier la compilation**
   ```bash
   npm run build
   ls -la dist/discord_bot/ClaudeCommandHandler.js
   ls -la dist/backend/agents/ClaudeChatBotAgent.js
   ```

2. **Tester Claude CLI**
   ```bash
   claude --version
   ```

3. **Vérifier la configuration**
   ```bash
   cat .claude/settingsZ.json
   cat .claude/agents/financial-agents.json
   ```

4. **Lancer un test rapide**
   ```bash
   npm run bot:simple
   ```

---

## 🔍 Validation Claude Code

### **Commandes à tester dans Discord**

1. **Test /profile**
   ```
   /profile
   ```
   ✅ Doit afficher les infos Claude Code

2. **Test /new**
   ```
   /new
   ```
   ✅ Doit démarrer une nouvelle session

3. **Test chat classique**
   ```
   Bonjour Claude !
   ```
   ✅ Doit répondre normalement

4. **Test chat persistant**
   ```
   Mon nom est TestUser
   ```
   ```
   Quel est mon nom ?
   ```
   ✅ Doit se souvenir du nom

---

## 📊 Monitoring Production

### **Logs à surveiller**

- **Connexion Claude** : Vérifier l'authentification
- **Sessions** : S'assurer que les sessionId sont créés
- **Parsing JSON** : Vérifier l'extraction des réponses
- **Discord** : Monitorer les commandes et réponses

### **Métriques importantes**

- **Temps de réponse** : < 50ms pour messages en session
- **Créations de session** : < 15s pour nouvelle session
- **Taux de succès** : 100% des commandes répondent

---

## 🛠️ Dépannage

### **Erreur : Module non trouvé**
```bash
npm run build
# Puis relancer
npm run bot
```

### **Erreur : Claude CLI non trouvé**
```bash
# Vérifier l'installation
which claude
claude --version

# Réinstaller si nécessaire
npm install -g @anthropic/claude-cli
```

### **Erreur : Configuration manquante**
```bash
# Vérifier les fichiers
ls -la .claude/settingsZ.json
ls -la .claude/agents/financial-agents.json
```

### **Bot ne répond pas**
```bash
# Mode debug
npm run bot:simple

# Vérifier les logs
tail -f bot_logs.txt
```

---

## ✅ Checklist Production

- [ ] Dépendances installées (`npm install`)
- [ ] Projet compilé (`npm run build`)
- [ ] Claude CLI accessible (`claude --version`)
- [ ] Configuration chargée (`.claude/settingsZ.json`)
- [ ] Bot démarre sans erreur (`npm run bot:simple`)
- [ ] Commandes Discord fonctionnelles (`/profile`, `/new`)
- [ ] Chat persistant opérationnel
- [ ] Parsing JSON validé

---

## 🎯 Prochaines Étapes

1. ✅ Migration KiloCode → Claude Code **TERMINÉE**
2. ✅ Tests d'intégration **VALIDÉS**
3. 🚀 Déploiement production **EN COURS**
4. ⏳ Monitoring et optimisation **À FAIRE**

---

**Auteur** : Claude Code Integration
**Date** : 2025-12-13
**Version** : 1.0.0
