@echo off
echo 🚀 DEMARRAGE BOT CLAUDE CODE
echo ================================
echo.

REM Lancer le bot en arrière-plan
start /B node --no-warnings dist/discord_bot/sniper_financial_bot.js > bot.log 2>&1

REM Attendre un peu
timeout /t 5 /nobreak >nul

REM Vérifier si le bot tourne
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ✅ BOT EN LIGNE !
    echo.
    echo 📋 Logs: bot.log
    echo 🛑 Pour arrêter: TASKKILL /IM node.exe /F
    echo.
    echo 🧪 Testez dans Discord:
    echo    /profile
    echo    /new
    echo    Bonjour Claude !
    echo.
    pause
) else (
    echo ❌ ERREUR: Bot non démarré
    echo 📋 Logs:
    type bot.log 2>nul
    pause
)
