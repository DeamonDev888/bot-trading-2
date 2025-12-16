#!/bin/bash

# Script de déploiement pour la correction du bot Discord
echo "🚀 DÉPLOIEMENT DE LA CORRECTION DISCORD BOT"
echo "============================================="

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "src/discord_bot/sniper_financial_bot.ts" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis le répertoire racine du projet"
    exit 1
fi

echo "📋 VÉRIFICATIONS PRÉLIMINAIRES..."

# Vérifier TypeScript
echo "🔍 Vérification TypeScript..."
if command -v npx &> /dev/null; then
    npx tsc --noEmit
    if [ $? -eq 0 ]; then
        echo "✅ TypeScript: OK"
    else
        echo "⚠️  TypeScript: Erreurs détectées (vérifiez les logs ci-dessus)"
    fi
else
    echo "⚠️  npx non disponible, vérification TypeScript ignorée"
fi

echo ""
echo "📁 FICHIERS MODIFIÉS:"
echo "- src/backend/agents/DiscordChatBotAgent.ts"
echo "- simple_parsing_test.js (test de validation)"
echo "- discord_parsing_fix_guide.md (documentation)"

echo ""
echo "🧪 TEST DE LA SOLUTION..."
node simple_parsing_test.js

echo ""
echo "📋 PROCHAINES ÉTAPES:"
echo "1. Redémarrez votre bot Discord:"
echo "   node manage_bot.mjs stop sniper"
echo "   node manage_bot.mjs start sniper"
echo ""
echo "2. Testez en conditions réelles:"
echo "   - Envoyez 'salut' à votre bot"
echo "   - Vérifiez que la réponse est maintenant complète"
echo ""
echo "3. Surveillez les logs pour confirmer:"
echo "   [discord-chatbot] ✅ Selected best response: ..."
echo "   [discord-chatbot] 🎯 Final response: 1 messages"

echo ""
echo "🎉 DÉPLOIEMENT TERMINÉ!"
echo "Consultez 'discord_bot_fix_summary.md' pour plus de détails."

# Optionnel: proposer de redémarrer le bot
read -p "Voulez-vous redémarrer le bot maintenant ? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Redémarrage du bot..."
    if command -v node &> /dev/null; then
        node manage_bot.mjs stop sniper 2>/dev/null || echo "⚠️  Impossible d'arrêter le bot (vérifiez s'il est en cours)"
        sleep 2
        node manage_bot.mjs start sniper
        echo "✅ Bot redémarré!"
    else
        echo "❌ node non disponible, redémarrage manuel requis"
    fi
fi