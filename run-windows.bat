@echo off
TITLE Al-Masar Switchgear ERP Launcher
COLOR 0B

echo =====================================================================
echo           ⚡ AL-MASAR SWITCHGEAR FACTORY ERP SYSTEM ⚡
echo          Electrical Panel Manufacturing ERP (Local Windows)
echo =====================================================================
echo.

cd /d "%~dp0"

:: 1. Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found on your system!
    echo Please install Node.js (version 18 or higher) from https://nodejs.org
    pause
    exit /b 1
)

:: 2. Check if node_modules exists
if not exist "node_modules\" (
    echo [*] First time setup: Installing project dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
)

:: 3. Open browser after short delay
echo [*] Launching Al-Masar Switchgear ERP at http://localhost:3000 ...
start "" http://localhost:3000

:: 4. Start Next.js Development Server
echo [*] Starting Next.js Local Server... Press Ctrl+C to stop.
echo.
call npm run dev

pause
