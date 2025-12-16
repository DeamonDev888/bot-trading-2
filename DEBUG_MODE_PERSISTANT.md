# 🔥 DEBUG MODE PERSISTANT - Logs Détaillés Ajoutés

## 🎯 Objectif

**Identifier exactement où ça bloque** dans le mode persistant avec du debug ultra-détaillé.

---

## 🔧 Debug Ajouté

### 1. **Vérification des Streams**
```javascript
console.log(`[claude-chatbot] 🔍 DEBUG: processStdin available = ${!!this.processStdin}`);
console.log(`[claude-chatbot] 🔍 DEBUG: processStdout available = ${!!this.processStdout}`);
console.log(`[claude-chatbot] 🔍 DEBUG: claudeProcess running = ${this.claudeProcess && !this.claudeProcess.killed}`);
```

### 2. **Envoi du Message + EOF**
```javascript
console.log(`[claude-chatbot] 📤 Envoi du message: "${message}"`);
this.processStdin.write(message + '\n');
console.log(`[claude-chatbot] 📤 Envoi du caractère EOF (Ctrl+D)...`);
this.processStdin.write('\u0004'); // Ctrl+D = EOF
console.log(`[claude-chatbot] ✅ Message + EOF envoyés, attente de la réponse...`);
```

### 3. **Détection onData (ULTRA-DÉTAILLÉ)**
```javascript
console.log(`[claude-chatbot] 🔍 DEBUG: Attaching onData listener to stdout...`);
// ...
console.log(`[claude-chatbot] 🔥🔥🔥 onData APPELÉ ! Size: ${data.length} bytes`);
console.log(`[claude-chatbot] 🔥🔥🔥 dataStr: "${dataStr.substring(0, 200)}"`);
console.log(`[claude-chatbot] 🔍 DEBUG: responseBuffer total length = ${responseBuffer.length}`);
console.log(`[claude-chatbot] 🔍 DEBUG: hasResponse = ${hasResponse}`);
console.log(`[claude-chatbot] 🔍 DEBUG: hasResponseContent = ${hasResponseContent}`);
```

### 4. **Timeout Réduit (30s au lieu de 5min)**
```javascript
console.log(`[claude-chatbot] 🔍 DEBUG: Setting 30s timeout for testing...`);
timeoutId = setTimeout(() => {
    console.log(`[claude-chatbot] 🔥🔥🔥 TIMEOUT RÉVEILLÉ ! hasResponse = ${hasResponse}`);
    console.log(`[claude-chatbot] 🔥🔥🔥 responseBuffer length = ${responseBuffer.length}`);
    console.log(`[claude-chatbot] 🔥🔥🔥 responseBuffer content = "${responseBuffer}"`);
    // ...
}, 30000); // 30 secondes
```

---

## 🎯 Ce qu'On Va Voir dans les Logs

### Scénario Normal (✅) :
```
[claude-chatbot] 🔍 DEBUG: processStdin available = true
[claude-chatbot] 🔍 DEBUG: processStdout available = true
[claude-chatbot] 🔍 DEBUG: claudeProcess running = true
[claude-chatbot] 📤 Envoi du message: "allo"
[claude-chatbot] 📤 Envoi du caractère EOF (Ctrl+D)...
[claude-chatbot] ✅ Message + EOF envoyés, attente de la réponse...
[claude-chatbot] 🔍 DEBUG: Attaching onData listener to stdout...
[claude-chatbot] 🔥🔥🔥 onData APPELÉ ! Size: XXX bytes
[claude-chatbot] 🔥🔥🔥 dataStr: "..."
[claude-chatbot] 🔍 DEBUG: responseBuffer total length = XXX
[claude-chatbot] 🔍 DEBUG: hasResponseContent = true
[claude-chatbot] ✅ Response detected (XXX chars)
[claude-chatbot] ✅ Complete response via stdin/stdout in XXXms
[claude-chatbot] ✅ FINAL RESPONSE: "..."
```

### Scénario Problématique (❌) :
```
[claude-chatbot] 🔍 DEBUG: processStdin available = true
[claude-chatbot] 🔍 DEBUG: processStdout available = true
[claude-chatbot] 🔍 DEBUG: claudeProcess running = true
[claude-chatbot] 📤 Envoi du message: "allo"
[claude-chatbot] 📤 Envoi du caractère EOF (Ctrl+D)...
[claude-chatbot] ✅ Message + EOF envoyés, attente de la réponse...
[claude-chatbot] 🔥🔥🔥 TIMEOUT RÉVEILLÉ ! hasResponse = false
[claude-chatbot] 🔥🔥🔥 responseBuffer length = 0
[claude-chatbot] 🔥🔥🔥 responseBuffer content = ""
```

---

## 🔍 Diagnostic Possible

### Si `onData` n'est JAMAIS appelé :
- ❌ KiloCode ne répond pas (problème avec le processus)
- ❌ `processStdout` n'écoute pas correctement
- ❌ KiloCode attend quelque chose (config, auth, etc.)

### Si `onData` est appelé mais `hasResponseContent = false` :
- ⚠️ KiloCode répond mais le contenu est trop court
- ⚠️ Problème de détection (seuil trop élevé)

### Si `responseBuffer = ""` au timeout :
- ❌ Aucune donnée reçue de KiloCode
- ❌ Le processus KiloCode ne fonctionne pas

---

## 🚀 Test Immédiat

### 1. Redémarrer le bot :
```bash
pnpm bot -m
```

### 2. Envoyer un message :
```
User: "sniper allo"
```

### 3. Observer les logs :
Chercher les logs avec `🔥🔥🔥` pour voir exactement où ça bloque.

---

## 📊 Résultats Attendus

| Résultat | Diagnostic | Action |
|----------|------------|--------|
| `onData` jamais appelé | KiloCode ne répond pas | Vérifier processus |
| `responseBuffer = ""` au timeout | Pas de données | Vérifier KiloCode |
| `hasResponseContent = false` | Détection trop stricte | Ajuster seuil |
| Réponse reçue | ✅ Mode persistant OK ! | - |

---

## 💡 Actions Post-Diagnostic

### Si KiloCode ne répond pas :
1. Vérifier que KiloCode fonctionne en standalone
2. Tester avec un message simple
3. Vérifier l'agent discord-agent

### Si données reçues mais pas détectées :
1. Ajuster le seuil de détection
2. Modifier les critères `hasResponseContent`

### Si timeout systématique :
1. Le processus KiloCode est bloqué
2. Vérifier la configuration KiloCode
3. Tester sans agent (mode basique)

---

*Debug ajouté le $(date)*
*Status : 🔥 PRÊT POUR DIAGNOSTIC*
