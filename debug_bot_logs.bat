@echo off
echo 🧪 Debug Bot - Capture des logs en temps reel
echo.
echo 1. Ce script lance le bot et capture les logs
echo 2. Envoyez "sniper allo" dans Discord
echo 3. Les logs s'affichent ici en temps reel
echo 4. Copiez-collez l'erreur pour diagnostic
echo.
echo ⏳ Lancement du bot...
echo.

pnpm bot -m 2>&1 | findstr /I "DEBUG ERREUR CRITIQUE CHAT START generateProfessionalResponse"
