@echo off
echo 🚀 LAUNCHER BOT CLAUDE CODE
echo ================================
echo.

REM Créer un wrapper qui maintient le bot en vie
echo const fs = require('fs'); > wrapper.js
echo const { spawn } = require('child_process'); >> wrapper.js
echo. >> wrapper.js
echo // Lancer le bot >> wrapper.js
echo const bot = spawn('node', ['--no-warnings', 'dist/discord_bot/sniper_financial_bot.js'], { stdio: 'inherit' }); >> wrapper.js
echo. >> wrapper.js
echo // Logger le PID >> wrapper.js
echo console.log('Bot PID:', bot.pid); >> wrapper.js
echo fs.writeFileSync('bot.pid', bot.pid.toString()); >> wrapper.js
echo. >> wrapper.js
echo // Maintenir en vie >> wrapper.js
echo bot.on('exit', (code) =^> { >> wrapper.js
echo   console.log('Bot arrêté avec code:', code); >> wrapper.js
echo   fs.unlinkSync('bot.pid'); >> wrapper.js
echo }); >> wrapper.js
echo. >> wrapper.js
echo process.on('SIGINT', () =^> { >> wrapper.js
echo   console.log('\\n🛑 Arrêt demandé...'); >> wrapper.js
echo   bot.kill('SIGINT'); >> wrapper.js
echo   process.exit(0); >> wrapper.js
echo }); >> wrapper.js
echo. >> wrapper.js
echo console.log('✅ Bot en arrière-plan. Logs dans bot.log'); >> wrapper.js
echo console.log('🛑 Pour arrêter: fermez cette fenêtre ou appuyez sur Ctrl+C'); >> wrapper.js

REM Lancer le wrapper
node wrapper.js

echo.
echo Bot arrêté.
pause
