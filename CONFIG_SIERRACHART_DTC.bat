@echo off
chcp 65001 >nul
cls
echo.
echo ╔════════════════════════════════════════════════════════════════════╗
echo ║      🔧 CONFIGURATION SIERRACHART POUR DONNÉES VIA DTC            ║
echo ╚════════════════════════════════════════════════════════════════════╝
echo.
echo Le serveur DTC est actif mais bloque les requêtes de données.
echo.
echo ═══════════════════════════════════════════════════════════════════
echo 📋 CONFIGURATION À FAIRE DANS SIERRACHART:
echo ═══════════════════════════════════════════════════════════════════
echo.
echo  1. Ouvrez SierraChart
echo.
echo  2. Allez dans: Global Settings ^> Sierra Chart Server Settings
echo.
echo  3. Dans la section "DTC Protocol Server":
echo.
echo     a) Verifiez que "Enable DTC Protocol Server" = Yes
echo.
echo     b) IMPORTANT: Changez "Allowed Incoming IPs" de "Any IP" 
echo        vers "127.0.0.1" (localhost seulement)
echo.
echo        Cela peut desactiver la restriction sur les donnees!
echo.
echo     c) Optionnel: Decochez "Require Authentication"
echo.
echo  4. Cliquez OK et REDEMARREZ SierraChart
echo.
echo ═══════════════════════════════════════════════════════════════════
echo.
echo Apres ces changements, relancez: node sierra_historical_client.mjs
echo.
pause
