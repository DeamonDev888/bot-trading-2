# 🚀 Guide de Démarrage Rapide - Bot Discord Enhanced

## ⚡ Démarrage Immédiat

### 1. Démarrer le Bot
```bash
npm run bot
```

### 2. Tester dans Discord
Envoyez `sniper coucou` dans un channel Discord.

---

## 🔍 Vérifications

### ✅ Connexion Réussie
Vous devriez voir :
```
🤖 Sniper Financial Bot (Sniper Analyste Financier#5860) est connecté !
✅ Bot Claude Code connecté et opérationnel !
```

### ✅ Agent Enhanced Actif
Les logs montreront :
```
[claude-enhanced] 🔄 Attempt 1/3 for chat
[claude-enhanced] 🚀 req_* Starting execution
[claude-enhanced] ✅ req_* Success
```

---

## 🎯 Patterns de Robustesse Actifs

| Pattern | Status | Description |
|---------|--------|-------------|
| **Circuit Breaker** | ✅ ACTIF | Protection contre surcharge |
| **Retry + Backoff** | ✅ ACTIF | 3 tentatives avec délai croissant |
| **Rate Limiting** | ✅ ACTIF | 100ms entre requêtes |
| **Timeout** | ✅ ACTIF | 30s par requête |
| **Queue** | ✅ ACTIF | Traitement séquentiel |
| **Health Check** | ✅ ACTIF | Monitoring en temps réel |

---

## 📊 Monitoring

### Health Check en Temps Réel
```bash
npm run bot 2>&1 | grep "Health\|circuitBreaker"
```

### Logs Détaillés
```bash
npm run bot 2>&1 | grep "claude-enhanced"
```

---

## 🛠️ Commandes Utiles

### Redémarrer le Bot
```bash
# Tuer le processus existant si nécessaire
pkill -f "sniper_financial_bot"
npm run bot
```

### Voir les Processus Actifs
```bash
ps aux | grep sniper
```

### Vérifier les Logs
```bash
tail -f bot_logs.txt 2>/dev/null || npm run bot 2>&1
```

---

## 🐛 Dépannage

### Bot ne répond pas
1. Vérifiez la connexion Discord :
   ```
   ✅ Bot Claude Code connecté et opérationnel !
   ```

2. Vérifiez l'agent :
   ```
   ✅ Agent type: ClaudeChatBotAgentEnhanced
   ```

3. Testez manuellement :
   ```bash
   node -e "
   import('./dist/backend/agents/ClaudeChatBotAgentEnhanced.js').then(m => {
     const agent = new m.ClaudeChatBotAgentEnhanced();
     agent.chat('test').then(r => console.log('OK')).catch(e => console.error('ERR', e.message));
   });
   "
   ```

### Erreur "Unknown Model"
→ Problème de configuration KiloCode (hors scope code)

### Erreur de connexion
1. Vérifiez `.env` :
   - `DISCORD_TOKEN` défini
   - `ADMIN_USER_ID` défini
   - `DISCORD_CHANNEL_ID` défini

2. Redémarrez :
   ```bash
   pkill -f "sniper"
   npm run bot
   ```

---

## 📈 Performance

### Métriques Actives
- **Circuit Breaker** : État CLOSED/OPEN/HALF_OPEN
- **Queue Length** : Messages en attente (normal: 0)
- **Retry Count** : Tentatives effectuées
- **Response Time** : Durée des requêtes

### Optimisation
Les paramètres par défaut sont optimisés pour :
- **Usage normal** : rateLimitMs=100ms
- **Charge élevée** : Augmenter à 200ms
- **Timeout** : 30s (ajuster selon besoins)

---

## 🎓 Utilisation Avancée

### Configuration Personnalisée
```typescript
// Dans sniper_financial_bot.ts ligne 306
this.discordAgent = new ClaudeChatBotAgentEnhanced({
  timeoutMs: 45000,    // 45s timeout
  maxRetries: 5,       // 5 tentatives
  rateLimitMs: 200     // 200ms delay
});
```

### Health Check Manuel
```bash
node -e "
import('./dist/discord_bot/sniper_financial_bot.js').then(m => {
  const bot = new m.SniperFinancialBot();
  const health = bot.discordAgent.getHealthStatus();
  console.log(JSON.stringify(health, null, 2));
});
"
```

### Reset Circuit Breaker
```bash
node -e "
import('./dist/discord_bot/sniper_financial_bot.js').then(m => {
  const bot = new m.SniperFinancialBot();
  bot.discordAgent.resetCircuitBreaker();
  console.log('Circuit breaker reset');
});
"
```

---

## ✨ Résumé

**Bot Status** : ✅ Opérationnel avec Agent Enhanced

**Patterns** : Circuit Breaker + Retry + Rate Limiting + Monitoring

**Prêt pour** : Utilisation en production

**Pour tester** : Envoyez `sniper coucou` dans Discord

---

*Guide v1.0 - Bot Discord Enhanced*
