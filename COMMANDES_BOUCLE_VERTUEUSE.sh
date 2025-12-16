#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════╗
# ║          COMMANDES ESSENTIELLES - BOUCLE VERTUEUSE               ║
# ╚══════════════════════════════════════════════════════════════════╝

echo "🚀 COMMANDES BOUCLE VERTUEUSE"
echo "=============================="
echo ""

# 1. LANCEMENT DU BOT
echo "1️⃣  LANCEMENT DU BOT DISCORD"
echo "------------------------------"
echo "# Profil par défaut (M)"
echo "npm run bot"
echo ""
echo "# Profil Z"
echo "npm run bot -z"
echo ""
echo "# Avec nettoyage forcé"
echo "npm run bot --force"
echo ""
echo ""

# 2. SURVEILLANCE TEMPS RÉEL
echo "2️⃣  SURVEILLANCE TEMPS RÉEL"
echo "------------------------------"
echo "# Dashboard interactif"
echo "node dashboard_boucle_vertueuse.mjs"
echo ""
echo "# Logs en temps réel"
echo "tail -f logs/discord/discord_\$(date +%Y-%m-%d).log"
echo ""
echo ""

# 3. GÉNÉRATION DE RAPPORTS
echo "3️⃣  GÉNÉRATION DE RAPPORTS"
echo "------------------------------"
echo "# Rapport complet (7 jours)"
echo 'node -e "const { logAnalyzer } = require('./"'"'./dist/discord_bot/LogAnalyzer.js'"'"'); logAnalyzer.analyze(7).then(a => console.log(JSON.stringify(a, null, 2)))"'
echo ""
echo "# Rapport lisible"
echo 'node -e "const { logAnalyzer } = require('./"'"'./dist/discord_bot/LogAnalyzer.js'"'"'); logAnalyzer.analyze(7).then(a => console.log(logAnalyzer.generateHumanReadableReport(a)))"'
echo ""
echo ""

# 4. ANALYSE DES LOGS
echo "4️⃣  ANALYSE DES LOGS"
echo "------------------------------"
echo "# Top 10 utilisateurs"
echo 'grep '"'"'"type":"command"'"'"' logs/discord/discord_*.log | jq -r '"'"'.username'"'"' | sort | uniq -c | sort -rn | head -10'
echo ""
echo "# Erreurs les plus fréquentes"
echo 'grep '"'"'"type":"error"'"'"' logs/discord/discord_*.log | jq '"'"'.error'"'"' | sort | uniq -c | sort -rn'
echo ""
echo "# Temps de réponse moyen"
echo 'grep '"'"'"type":"response"'"'"' logs/discord/discord_*.log | jq '"'"'.duration'"'"' | awk '"'"'{sum+=$1; count++} END {print "Moyenne:", sum/count "ms"}'"'"''
echo ""
echo ""

# 5. TESTS
echo "5️⃣  TESTS ET VALIDATION"
echo "------------------------------"
echo "# Test unitaire"
echo "node test_boucle_vertueuse.mjs"
echo ""
echo "# Test d'intégration"
echo "node test_integration_complete.mjs"
echo ""
echo "# Vérifier la compilation"
echo "ls -la dist/discord_bot/"
echo ""
echo ""

# 6. MÉTRIQUES SPÉCIFIQUES
echo "6️⃣  MÉTRIQUES SPÉCIFIQUES"
echo "------------------------------"
echo "# Statistiques globales"
echo 'node -e "const { logAnalyzer } = require('./"'"'./dist/discord_bot/LogAnalyzer.js'"'"'); logAnalyzer.analyze(1).then(a => { console.log('\''Total:\'', a.summary.totalInteractions); console.log('\''Succès:\'', a.summary.successRate.toFixed(1) + '\''%'\''); console.log('\''Temps moyen:\'', Math.round(a.summary.averageResponseTime) + '\''ms'\''); })"'
echo ""
echo "# Performance Claude"
echo 'node -e "const { logAnalyzer } = require('./"'"'./dist/discord_bot/LogAnalyzer.js'"'"'); logAnalyzer.analyze(1).then(a => { const p = a.performance.claudePerformance; console.log('\''Temps moyen Claude:\'', Math.round(p.averageTime) + '\''ms'\''); console.log('\''Succès Claude:\'', p.successRate.toFixed(1) + '\''%'\''); })"'
echo ""
echo "# Top 5 utilisateurs"
echo 'node -e "const { logAnalyzer } = require('./"'"'./dist/discord_bot/LogAnalyzer.js'"'"'); logAnalyzer.analyze(1).then(a => a.summary.topUsers.slice(0, 5).forEach((u, i) => console.log((i+1) + '\''.'\'', u.username + '\'' ('\'' + u.count + '\'' interactions)'\'')))"'
echo ""
echo ""

# 7. NETTOYAGE ET MAINTENANCE
echo "7️⃣  NETTOYAGE ET MAINTENANCE"
echo "------------------------------"
echo "# Nettoyer les logs anciens (30+ jours)"
echo "find logs/discord/ -name 'discord_*.log' -mtime +30 -delete"
echo ""
echo "# Nettoyer les rapports anciens"
echo "find logs/discord/reports/ -name '*.json' -mtime +30 -delete"
echo ""
echo "# Recompiler TypeScript"
echo "npm run build"
echo ""
echo ""

# 8. DÉPANNAGE
echo "8️⃣  DÉPANNAGE"
echo "------------------------------"
echo "# Vérifier les logs"
echo "ls -la logs/discord/"
echo ""
echo "# Vérifier la structure JSON"
echo "head -3 logs/discord/discord_\$(date +%Y-%m-%d).log | jq ."
echo ""
echo "# Compter les entrées du jour"
echo "wc -l logs/discord/discord_\$(date +%Y-%m-%d).log"
echo ""
echo "# Vérifier les erreurs récentes"
echo "tail -20 logs/discord/discord_\$(date +%Y-%m-%d).log | grep '"'"'"type":"error"'"'"'"
echo ""
echo ""

# 9. EXPORT ET SAUVEGARDE
echo "9️⃣  EXPORT ET SAUVEGARDE"
echo "------------------------------"
echo "# Exporter les logs en CSV"
echo 'grep '"'"'"type":"command"'"'"' logs/discord/discord_*.log | jq -r '\''[\(.timestamp), .username, .message] | @csv'\'' > exports/commands.csv'
echo ""
echo "# Sauvegarder les rapports"
echo "cp logs/discord/reports/*.json backups/reports_\$(date +%Y%m%d)/"
echo ""
echo ""

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                      🎉 FIN DES COMMANDES                        ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📞 Documentation complète:"
echo "   • BOUCLE_VERTUEUSE_IMPLEMENTATION.md"
echo "   • GUIDE_BOUCLE_VERTUEUSE.md"
echo "   • RESUME_BOUCLE_VERTUEUSE.md"
echo ""
