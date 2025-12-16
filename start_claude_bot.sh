#!/bin/bash
echo '🚀 Lancement Bot Claude Code...'
node --no-warnings dist/discord_bot/sniper_financial_bot.js &
BOT_PID=$!
echo "✅ Bot démarré (PID: $BOT_PID)"
echo ''
echo '📋 Commandes:'
echo "   ps -p $BOT_PID  → Statut"
echo "   kill $BOT_PID   → Arrêter"
echo ''
echo '🧪 Testez dans Discord:'
echo '   /profile'
echo '   /new'
echo '   Bonjour Claude !'
echo ''
echo 'Appuyez sur Ctrl+C pour arrêter (le bot也会 continue)...'
wait $BOT_PID

