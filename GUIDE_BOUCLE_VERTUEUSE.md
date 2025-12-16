# 🚀 Guide de Référence - Boucle Vertueuse

## ⚡ Démarrage Rapide

### 1. Lancer le Bot Discord
```bash
# Profil par défaut (M)
npm run bot

# Profil Z
npm run bot -z

# Avec nettoyage forcé
npm run bot --force
```

### 2. Surveiller en Temps Réel
```bash
node dashboard_boucle_vertueuse.mjs
```
**Interface** : Dashboard avec métriques mises à jour toutes les 5 secondes

### 3. Générer un Rapport
```bash
# Rapport des 7 derniers jours
node -e "
const { logAnalyzer } = require('./dist/discord_bot/LogAnalyzer.js');
logAnalyzer.analyze(7).then(a => {
    console.log(logAnalyzer.generateHumanReadableReport(a));
});
"

# Rapport JSON
node -e "
const { logAnalyzer } = require('./dist/discord_bot/LogAnalyzer.js');
logAnalyzer.analyze(7).then(a => console.log(JSON.stringify(a, null, 2)));
"
```

### 4. Consulter les Logs
```bash
# Logs du jour en temps réel
tail -f logs/discord/discord_$(date +%Y-%m-%d).log

# Chercher les erreurs
grep '"type":"error"' logs/discord/discord_$(date +%Y-%m-%d).log

# Analyser un utilisateur
grep '"userId":"USER123"' logs/discord/discord_$(date +%Y-%m-%d).log

# Top 10 des utilisateurs
grep '"type":"command"' logs/discord/discord_*.log | jq -r '.username' | sort | uniq -c | sort -rn | head -10
```

---

## 📊 Métriques Clés

### Performance du Bot
- **Temps de réponse moyen** : < 2s (objectif)
- **Taux de succès** : > 90% (objectif)
- **Taux d'erreur** : < 10% (objectif)

### Performance Claude
- **Temps d'analyse moyen** : < 10s (objectif)
- **Taux de succès** : > 85% (objectif)
- **Timeouts** : < 5% (objectif)

### Exemple de Bonnes Métriques
```
📈 RÉSUMÉ:
   Total interactions: 156
   Temps de réponse moyen: 1,234ms
   Taux de succès: 94.2%
   Taux d'erreur: 5.8%

🤖 PERFORMANCE CLAUDE:
   Temps moyen: 2,456ms
   Taux de succès: 91.3%
   Timeouts: 3
```

---

## 🔍 Analyse Avancée

### Scripts Prédéfinis

#### Analyse des Erreurs
```bash
node -e "
const { logAnalyzer } = require('./dist/discord_bot/LogAnalyzer.js');
logAnalyzer.analyze(7).then(a => {
    console.log('❌ TOP 5 ERREURS:');
    a.summary.commonErrors.slice(0, 5).forEach((e, i) => {
        console.log(\`\${i+1}. \${e.error} (\${e.count} fois)\`);
    });
});
"
```

#### Top Utilisateurs
```bash
node -e "
const { logAnalyzer } = require('./dist/discord_bot/LogAnalyzer.js');
logAnalyzer.analyze(7).then(a => {
    console.log('👥 TOP 5 UTILISATEURS:');
    a.summary.topUsers.slice(0, 5).forEach((u, i) => {
        console.log(\`\${i+1}. \${u.username} (\${u.count} interactions)\`);
    });
});
"
```

#### Performance Claude
```bash
node -e "
const { logAnalyzer } = require('./dist/discord_bot/LogAnalyzer.js');
logAnalyzer.analyze(7).then(a => {
    const p = a.performance.claudePerformance;
    console.log('🤖 PERFORMANCE CLAUDE:');
    console.log(\`   Temps moyen: \${Math.round(p.averageTime)}ms\`);
    console.log(\`   Taux de succès: \${p.successRate.toFixed(1)}%\`);
    console.log(\`   Timeouts: \${p.timeouts}\`);
});
"
```

#### Recommandations
```bash
node -e "
const { logAnalyzer } = require('./dist/discord_bot/LogAnalyzer.js');
logAnalyzer.analyze(7).then(a => {
    console.log('💡 RECOMMANDATIONS:');
    a.recommendations.forEach((r, i) => {
        console.log(\`\${i+1}. \${r}\`);
    });
});
"
```

---

## 📁 Structure des Fichiers

```
logs/
└── discord/
    ├── discord_2025-12-14.log          # Logs quotidiens (JSON lines)
    │   ├── {"type":"command", ...}
    │   ├── {"type":"response", ...}
    │   ├── {"type":"claude_request", ...}
    │   └── {"type":"claude_response", ...}
    │
    ├── sessions/                       # Sessions complètes
    │   └── session_1736937600000_USER123_2025-12-14.json
    │
    └── reports/                        # Rapports d'analyse
        ├── analysis_2025-12-14.json    # Rapport JSON
        └── integration_test_*.md       # Rapports Markdown
```

---

## 🎯 Types de Logs

### 1. Commande Discord
```json
{
  "timestamp": "2025-12-14T10:30:00.123Z",
  "type": "command",
  "userId": "USER123",
  "username": "DeaMon888",
  "channelId": "CHANNEL1",
  "message": "Sniper, bonjour !",
  "success": true
}
```

### 2. Réponse du Bot
```json
{
  "timestamp": "2025-12-14T10:30:01.345Z",
  "type": "response",
  "userId": "USER123",
  "username": "DeaMon888",
  "channelId": "CHANNEL1",
  "response": "Bonjour ! Comment puis-je vous aider ?",
  "duration": 1222,
  "success": true
}
```

### 3. Requête Claude
```json
{
  "timestamp": "2025-12-14T10:30:01.456Z",
  "type": "claude_request",
  "userId": "USER123",
  "username": "DeaMon888",
  "channelId": "claude",
  "claudeCommand": "Analyser la demande",
  "success": true
}
```

### 4. Réponse Claude
```json
{
  "timestamp": "2025-12-14T10:30:04.789Z",
  "type": "claude_response",
  "userId": "USER123",
  "username": "claude",
  "channelId": "claude",
  "claudeOutput": "Le sentiment du marché est...",
  "duration": 3333,
  "success": true
}
```

### 5. Erreur
```json
{
  "timestamp": "2025-12-14T10:30:05.000Z",
  "type": "error",
  "userId": "USER123",
  "username": "DeaMon888",
  "channelId": "CHANNEL1",
  "success": false,
  "error": "Connection timeout"
}
```

---

## 🛠️ Dépannage

### Logs vides
```bash
# Vérifier les permissions
ls -la logs/discord/

# Vérifier la date du fichier
ls -la logs/discord/discord_*.log

# Vérifier le contenu
head -5 logs/discord/discord_$(date +%Y-%m-%d).log
```

### Erreurs de compilation
```bash
# Recompiler les fichiers TypeScript
npx tsc src/discord_bot/DiscordLogger.ts --outDir dist/discord_bot --module esnext --target es2022 --moduleResolution node
npx tsc src/discord_bot/LogAnalyzer.ts --outDir dist/discord_bot --module esnext --target es2022 --moduleResolution node

# Ou recompiler tout
npm run build
```

### Dashboard ne se met pas à jour
```bash
# Vérifier les logs
tail -f logs/discord/discord_$(date +%Y-%m-%d).log

# Tester l'analyse manuellement
node -e "logAnalyzer.analyze(1).then(console.log)"
```

---

## 💡 Exemples d'Utilisation

### Surveiller un utilisateur spécifique
```bash
grep '"username":"DeaMon888"' logs/discord/discord_*.log | jq '{timestamp: .timestamp, type: .type, message: .message}'
```

### Analyser les erreurs d'une période
```bash
grep '"type":"error"' logs/discord/discord_*.log | jq '.error' | sort | uniq -c | sort -rn
```

### Calculer le temps de réponse moyen
```bash
grep '"type":"response"' logs/discord/discord_*.log | jq '.duration' | awk '{sum+=$1; count++} END {print "Moyenne:", sum/count "ms"}'
```

### Identifier les heures de pointe
```bash
grep '"type":"command"' logs/discord/discord_*.log | jq -r '.timestamp[:13]' | cut -d'T' -f2 | cut -d':' -f1 | sort | uniq -c | sort -rn
```

---

## 📞 Support

### Fichiers de Documentation
- `BOUCLE_VERTUEUSE_IMPLEMENTATION.md` - Documentation complète
- `RAPPORT_BOUCLE_VERTUEUSE_FINAL.md` - Rapport final d'implémentation
- `TESTS_BOUCLE_VERTUEUSE_RAPPORT.md` - Rapport de tests
- `GUIDE_BOUCLE_VERTUEUSE.md` - Ce guide

### Scripts de Test
- `test_boucle_vertueuse.mjs` - Test unitaire
- `test_integration_complete.mjs` - Test d'intégration
- `dashboard_boucle_vertueuse.mjs` - Dashboard temps réel

### Commandes de Diagnostic
```bash
# Test complet
node test_boucle_vertueuse.mjs

# Test d'intégration
node test_integration_complete.mjs

# Vérification des logs
ls -la logs/discord/

# Analyse rapide
node -e "logAnalyzer.analyze(1).then(a => console.log(JSON.stringify(a.summary, null, 2)))"
```

---

## 🎉 Conclusion

La **boucle vertueuse** est votre outil d'amélioration continue :

1. 📊 **Mesure** - Capture toutes les interactions
2. 🔍 **Analyse** - Calcule les métriques de performance
3. 💡 **Recommande** - Suggère des améliorations
4. 🔄 **Améliore** - Le système s'améliore en continu

**Utilisez-la pour optimiser votre bot Discord ! 🚀**
