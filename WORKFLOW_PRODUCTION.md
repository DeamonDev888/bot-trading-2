# 🚀 Workflow Production - Claude Code Bot

## ⚡ Commandes Rapides

### **1. Build (si changements)**
```bash
npm run build
```

### **2. Lancement Production**
```bash
node scripts/launch-bot-from-dist.mjs
```

### **3. Tests**
```bash
# Validation rapide
bash test_production_final.sh

# Tests d'intégration Claude
npx ts-node --esm test_claude_integration.ts
```

---

## 🔄 Développement vs Production

### **Développement (avec ts-node)**
```bash
npm run bot:simple
```
⚠️ **Problèmes connus** :
- Imports ES modules instables
- Résolution de modules parfois échoue
- Plus lent (compilation à la volée)

### **Production (version compilée)**
```bash
node scripts/launch-bot-from-dist.mjs
```
✅ **Avantages** :
- Stable et fiable
- Performance optimale
- Identique au déploiement final
- Tous les imports résolus

---

## 📊 Comparaison

| Aspect | ts-node | Version Compilée |
|--------|---------|------------------|
| **Stabilité** | ⚠️ Variable | ✅ Stable |
| **Performance** | ⚠️ Lente | ✅ Rapide |
| **Imports** | ⚠️ Problèmes | ✅ Résolus |
| **Production** | ❌ Non recommandé | ✅ Recommandé |

---

## 🎯 Recommandation

**Toujours utiliser la version compilée pour :**
- Tests de production
- Démonstrations
- Déploiement final
- Validation Claude Code

**Utiliser ts-node seulement pour :**
- Développement rapide (petites modifications)
- Debugging local (avec connues limitations)

---

## ✅ Commandes de Validation

```bash
# 1. Build
npm run build

# 2. Lancer bot
node scripts/launch-bot-from-dist.mjs

# 3. Tester dans Discord
# /profile
# /new
# Bonjour Claude !
```

---

**Auteur** : Claude Code Integration
**Date** : 2025-12-13
