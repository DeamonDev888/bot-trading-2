# 🎮 Guide de Test - Bot Claude Code

## ✅ **État du Bot**
- **Status** : 🟢 **EN LIGNE**
- **PID** : 9692
- **Nom** : Sniper Analyste Financier#5860
- **Claude Code** : ✅ Intégré et Opérationnel

---

## 🧪 **Tests dans Discord**

### **1. Commandes Slash**

#### **Test /profile**
```
/profile
```
**Résultat attendu** : Affiche les informations de profil et capacités de Claude Code

#### **Test /new**
```
/new Test de nouvelle tâche
```
**Résultat attendu** : Démarre une nouvelle session avec état propre

---

### **2. Chat Classic (Sans Persistance)**

```
Bonjour Claude ! Comment ça va ?
```
**Résultat attendu** : Réponse directe, pas de mémoire

```
Analyse le marché Bitcoin stp
```
**Résultat attendu** : Analyse financière avec Claude Code

---

### **3. Chat Persistant (Avec Mémoire)**

#### **Premier Message**
```
Mon nom est [TonNom]
```
**Résultat attendu** : Claude enregistre le nom

#### **Deuxième Message**
```
Quel est mon nom ?
```
**Résultat attendu** : Claude se souvient et répond avec le nom

#### **Test de Contexte**
```
Je suis intéressé par le trading d'actions
```
```
Quelles sont tes recommandations aujourd'hui ?
```
**Résultat attendu** : Claude fait le lien avec le trading

---

### **4. Tests Avancés**

#### **Test avec Code**
```
Peux-tu écrire un script Python qui calcule une moyenne mobile ?
```
**Résultat attendu** : Claude génère du code avec formatage

#### **Test d'Analyse Financière**
```
Analyse les dernières nouvelles sur l'IA et donne-moi un sentiment
```
**Résultat attendu** : Analyse complète avec sentiment

---

## 📊 **Indicateurs de Fonctionnement**

### ✅ **Signes Positifs**
- ✅ Bot répond rapidement (< 50ms en session)
- ✅ Claude se souvient entre les messages
- ✅ Parsing JSON fonctionne (pas de caractères bizarre)
- ✅ Commandes `/profile` et `/new` opérationnelles
- ✅ Code formaté correctement dans les réponses

### ⚠️ **Signes d'Alerte**
- ⚠️ Réponses très lentes (> 30s)
- ⚠️ "Session Created but NO ID" (persistance dégradée)
- ⚠️ Erreurs JSON dans les réponses
- ⚠️ Bot ne répond plus

---

## 🔧 **Commandes de Gestion**

### **Voir le statut**
```bash
cat sniper_bot.pid
ps -p $(cat sniper_bot.pid)
```

### **Voir les logs**
```bash
tail -f bot_debug.log
```

### **Redémarrer le bot**
```bash
# Arrêter
kill $(cat sniper_bot.pid)

# Relancer
node scripts/launch-bot-from-dist.mjs
```

---

## 🎯 **Métriques Attendues**

| **Action** | **Temps de Réponse** | **Status** |
|-----------|---------------------|------------|
| `/profile` | 10-60s | ✅ |
| `/new` | 5-30s | ✅ |
| Chat Classic | 10-50ms | ✅ |
| Chat Persistant | 5-20s | ✅ |
| Créer Session | 10-15s | ✅ |

---

## 🏆 **Tests de Validation Complète**

### **Scénario 1 : Nouveau Utilisateur**
1. Taper `/profile` → ✅ Doit afficher infos Claude
2. Taper `Bonjour !` → ✅ Réponse de bienvenue
3. Vérifier : Pas de mémoire, chaque message est indépendant

### **Scénario 2 : Session Persistante**
1. Taper `/new` → ✅ Nouvelle session
2. Taper `Mon nom est Test` → ✅ Enregistre
3. Attendre 10s
4. Taper `Comment je m'appelle ?` → ✅ Se souvient
5. Vérifier : Mémoire partagée entre messages

### **Scénario 3 : Analyse Financière**
1. Taper `Analyse le S&P 500` → ✅ Analyse avec données
2. Taper `Plus de détails sur l'IA` → ✅ Contexte maintenu
3. Vérifier : Claude fait des liens entre les sujets

---

## 📝 **Rapport de Test**

**Copiez-collez ce template pour rapporter les résultats :**

```
✅ TESTS DISCORD - Bot Claude Code

Tests Effectués :
- [ ] /profile : ✅/❌ (Temps: Xs)
- [ ] /new : ✅/❌ (Temps: Xs)
- [ ] Chat Classic : ✅/❌ (Temps: Xms)
- [ ] Chat Persistant : ✅/❌ (Temps: Xms)

Problèmes Rencontrés :
- Aucun / Problème 1 / Problème 2

Notes :
[Vos observations...]
```

---

**Auteur** : Claude Code Integration
**Date** : 2025-12-13
**Version** : 1.0.0
