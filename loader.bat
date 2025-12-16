@echo off
setlocal enabledelayedexpansion

:: Configuration Loader for Claude
:: Usage: loader.bat "path\to\settings.json"

if "%~1"=="" (
    echo Usage: loader.bat "path\to\settings.json"
    exit /b 1
)

set "CONFIG_PATH=%~1"
set "SCRIPT_DIR=%~dp0"
set "LOADER_JS=%SCRIPT_DIR%loader.js"

echo Loading configuration from: %CONFIG_PATH%

:: Check if file exists
if not exist "%CONFIG_PATH%" (
    echo Error: Configuration file not found: %CONFIG_PATH%
    exit /b 1
)

:: Run the loader
node "%LOADER_JS%" "%CONFIG_PATH%" %*

if errorlevel 1 (
    echo Failed to load configuration
    exit /b 1
)

endlocal