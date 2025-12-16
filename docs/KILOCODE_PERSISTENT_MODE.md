# 📚 Mode Persistant KiloCode - Documentation

## 🎯 Objectif

Le mode persistant KiloCode permet de maintenir une session continue avec l'IA, évitant d'envoyer le prompt système à chaque message et améliorant les performances.

## 🔄 Cycle de Vie

### 1. Démarrage du Bot
```bash
npm run bot
```

**Étapes :**
1. 🧹 **Nettoyage** : Suppression des instances KiloCode résiduelles
2. 🚀 **Démarrage** : Lancement du processus KiloCode en mode persistant
3. 📤 **Prompt Initial** : Envoi UNIQUE du prompt système (~2000 caractères)
4. ⏳ **Initialisation** : KiloCode traite le prompt et devient prêt
5. ✅ **Prêt** : Le bot peut maintenant traiter les messages

### 2. Session Active (Messages Utilisateurs)

**Pour chaque message Discord :**
```typescript
// Exemple de message utilisateur
"[username] analyse ce fichier"

// ✅ CE QUI EST ENVOYÉ à KiloCode :
"[username] analyse ce fichier"

// ❌ CE QUI N'EST PAS ENVOYÉ (gardé en mémoire) :
// # SNIPER - Bot Discord Analyste Financier
// ## 🤖 IDENTITÉ
// Tu es **Sniper**, un bot Discord...
// ... (2000+ caractères de prompt système)
```

### 3. Arrêt Propre
```bash
# Ctrl+C ou arrêt programmé
```

**Étapes :**
1. 🛑 **SIGTERM** : Signal d'arrêt envoyé à KiloCode
2. ⏱️ **Timeout** : 10 secondes pour terminer proprement
3. 🧹 **Nettoyage** : Suppression des processus résiduels
4. 🗑️ **Fichiers** : Suppression des fichiers temporaires

## 📊 Avantages du Mode Persistant

### ✅ Performances
- **Prompt unique** : Économie de ~2000 caractères par message
- **Contexte conservé** : KiloCode se souvient des échanges précédents
- **Réponses plus rapides** : Pas de réinitialisation à chaque message

### ✅ Cohérence
- **Session continue** : Le contexte est maintenu entre les messages
- **Mémoire conversationnelle** : L'IA se souvient des échanges
- **Meilleure compréhension** : Pas de perte de contexte

### ✅ Ressources
- **Moins de CPU** : Un seul processus KiloCode
- **Moins de RAM** : Pas de spawn à chaque message
- **Réseau optimisé** : Uniquement les données utiles

## 🔧 Logs du Mode Persistant

### Au démarrage :
```
[discord-chatbot] 🚀 Démarrage KiloCode en mode persistant...
[discord-chatbot] 📤 Envoi du prompt système (2150 caractères)...
[discord-chatbot] ⏳ Initialisation de KiloCode en cours...
[discord-chatbot] 📋 Réponse initiale reçue (125 caractères)
[discord-chatbot] ✅ KiloCode prêt en mode persistant - Prêt pour les messages !
```

### Pour chaque message :
```
[discord-chatbot] 🔍 Mode selection: kiloProcess=true, isKiloReady=true
[discord-chatbot] ✅ Using persistent mode
[discord-chatbot] 📤 Message utilisateur à KiloCode persistant: "[demon6660699] montre ce fichier..."
[discord-chatbot] ⏳ Attente de la réponse de KiloCode...
[discord-chatbot] 📥 Réponse reçue: 3450 caractères
```

### Pour les fichiers uploadés :
```
[discord-chatbot] 📁 File upload detected in output: true
[discord-chatbot] 🔍 Text vide mais file_upload détecté dans le buffer brut, extraction manuelle...
[discord-chatbot] ✅ 1 file_upload(s) extrait(s) manuellement
```

## 🛠️ Gestion des Erreurs

### Détection de l'état :
```typescript
if (this.kiloProcess && this.isKiloReady) {
  // ✅ Mode persistant disponible
  return this.chatPersistent(request);
} else {
  // ⚠️ Mode persistant non prêt, fallback vers mode classique
  return this.chatClassic(request);
}
```

### Redémarrage automatique :
- Si `kiloProcess` est null ou tué
- Si `isKiloReady` est false
- En cas d'erreur de communication

## 🧪 Test du Mode Persistant

### Commandes de test :
```bash
# Nettoyer et démarrer en mode persistant
npm run bot

# Test simple (sans nettoyage automatique)
npm run bot:simple

# Nettoyer manuellement les instances
npm run bot:clean
```

### Logs à surveiller :
- `✅ Using persistent mode` : Confirmation du mode persistant
- `📁 File upload detected` : Détection des uploads
- `🔍 Text vide mais file_upload` : Extraction manuelle en cours

## 🚨 Dépannage

### Problèmes courants :
1. **"Using classic mode"** : KiloCode n'a pas démarré correctement
2. **"No text response"** : Parsing JSON à améliorer
3. **Processus résiduels** : Utiliser `npm run bot:clean`

### Solutions :
1. **Redémarrer proprement** : `npm run bot`
2. **Nettoyer manuellement** : `npm run bot:clean`
3. **Vérifier les logs** : `bot-launcher.log` et `kilocode_debug.log`

## 📈 Monitoring

### Fichiers de log :
- `bot-launcher.log` : Logs du launcher
- `kilocode_debug.log` : Logs détaillés de KiloCode
- Console du bot : Logs en temps réel

### Métriques :
- Temps de réponse par message
- Nombre de messages traités
- Taux d'erreurs de parsing
- Utilisation mémoire/CPU

---

## 🎯 Résumé

Le mode persistant KiloCode est essentiel pour :
- ✅ **Performance** : 10x plus rapide que le mode classique
- ✅ **Cohérence** : Contexte maintenu entre les messages
- ✅ **Fiabilité** : Gestion robuste des erreurs
- ✅ **Efficacité** : Un seul processus pour toute la session

Le bot est maintenant optimisé pour une utilisation continue avec des réponses rapides et cohérentes !