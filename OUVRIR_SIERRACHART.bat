@echo off
chcp 65001 >nul
cls
echo.
echo ╔════════════════════════════════════════════════════════════════════╗
echo ║              📊 SIERRACHART TRADING CHARTS SETUP                   ║
echo ╚════════════════════════════════════════════════════════════════════╝
echo.
echo Ce script va ouvrir SierraChart pour creer votre chartbook.
echo.
echo ═══════════════════════════════════════════════════════════════════
echo 📋 SYMBOLES A AJOUTER (dans cet ordre):
echo ═══════════════════════════════════════════════════════════════════
echo.
echo    1. BTCUSDT_PERP_BINANCE   (Bitcoin Binance Perp)
echo    2. MESZ25-CME             (Micro E-mini S^&P 500)
echo    3. YMZ25-CBOT             (Micro E-mini Dow)
echo    4. XAUUSD                 (Gold)
echo    5. EURUSD                 (Euro/Dollar)
echo.
echo ═══════════════════════════════════════════════════════════════════
echo 📖 INSTRUCTIONS:
echo ═══════════════════════════════════════════════════════════════════
echo.
echo  ETAPE 1: Creer un nouveau chartbook
echo    - File ^> New Chartbook
echo    - Nom: TradingCharts
echo.
echo  ETAPE 2: Ajouter chaque symbole
echo    - File ^> Find Symbol (ou Ctrl+F)
echo    - Tapez le symbole
echo    - Cliquez "Open Intraday Chart"
echo    - Repetez pour tous les symboles
echo.
echo  ETAPE 3: Sauvegarder
echo    - File ^> Save Chartbook
echo    - Chemin: C:\SierraChart\Data\TradingCharts.Cht
echo.
echo  ETAPE 4: Ouverture automatique (optionnel)
echo    - Global Settings ^> General Settings
echo    - "Files To Open on Startup" ^> Add
echo    - Selectionnez TradingCharts.Cht
echo.
echo ═══════════════════════════════════════════════════════════════════
echo.
pause
echo.
echo 🚀 Lancement de SierraChart...
start "" "C:\SierraChart\SierraChart.exe"
echo.
echo ✅ SierraChart lance! Suivez les instructions ci-dessus.
echo.
timeout /t 5
