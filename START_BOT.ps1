#!/usr/bin/env pwsh

Write-Host "🚀 DEMARRAGE BOT CLAUDE CODE" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# Lancer le bot en arrière-plan
$botProcess = Start-Process -FilePath "node" -ArgumentList "--no-warnings", "dist/discord_bot/sniper_financial_bot.js" -RedirectStandardOutput "bot.log" -RedirectStandardError "bot_error.log" -PassThru -WindowStyle Hidden

Write-Host "✅ Bot démarré (PID: $($botProcess.Id))" -ForegroundColor Yellow
Write-Host ""

# Attendre 5 secondes
Start-Sleep -Seconds 5

# Vérifier si le bot tourne
if (Get-Process -Id $botProcess.Id -ErrorAction SilentlyContinue) {
    Write-Host "✅ BOT EN LIGNE !" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Commandes utiles:" -ForegroundColor Cyan
    Write-Host "   Voir logs: Get-Content bot.log -Wait -Tail 20" -ForegroundColor White
    Write-Host "   Arrêter: Stop-Process -Id $($botProcess.Id)" -ForegroundColor White
    Write-Host ""
    Write-Host "🧪 Testez dans Discord:" -ForegroundColor Cyan
    Write-Host "   /profile" -ForegroundColor White
    Write-Host "   /new" -ForegroundColor White
    Write-Host "   Bonjour Claude !" -ForegroundColor White
    Write-Host ""
    Write-Host "Appuyez sur une touche pour quitter (le bot continuera de tourner)..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
} else {
    Write-Host "❌ ERREUR: Bot non démarré" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 Logs d'erreur:" -ForegroundColor Yellow
    if (Test-Path "bot_error.log") {
        Get-Content "bot_error.log" | Write-Host -ForegroundColor Red
    } else {
        Write-Host "Aucun log d'erreur trouvé" -ForegroundColor Gray
    }
    Write-Host ""
    Read-Host "Appuyez sur une touche pour quitter"
}
