@echo off
REM ==================================================
REM Dashboard Auto-Start Script for Windows
REM ==================================================
REM This script starts the dashboard server in the background
REM It's designed to be run by Windows Task Scheduler at system startup

setlocal enabledelayedexpansion

REM Get the directory where this batch file is located
set SCRIPT_DIR=%~dp0

REM Navigate to the project directory
cd /d "%SCRIPT_DIR%"

REM Wait for network to be available (important for JWT auth)
timeout /t 10 /nobreak > nul

REM Check if Node.js is available
where node >nul 2>&1
if errorlevel 1 (
    echo Node.js not found in PATH >> "%SCRIPT_DIR%dashboard-startup.log"
    echo Error: Node.js is not installed or not in PATH >> "%SCRIPT_DIR%dashboard-startup.log"
    echo Attempted at %date% %time% >> "%SCRIPT_DIR%dashboard-startup.log"
    exit /b 1
)

REM Check if server.js exists
if not exist "server.js" (
    echo Error: server.js not found >> "%SCRIPT_DIR%dashboard-startup.log"
    echo Attempted at %date% %time% >> "%SCRIPT_DIR%dashboard-startup.log"
    exit /b 1
)

REM Kill any existing node process on port 3000 (to prevent port conflicts)
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000"') do (
    taskkill /F /PID %%a >nul 2>&1
)

REM Wait a moment for the port to be released
timeout /t 2 /nobreak > nul

REM Start Node.js server in the background
REM Use 'start /b /min' to run minimized without showing window
start "E2E Test Dashboard" /b /min node server.js

REM Wait for server to start
timeout /t 5 /nobreak > nul

REM Check if server started successfully
netstat -ano | find ":3000" > nul
if errorlevel 1 (
    echo Warning: Server may not have started on port 3000 >> "%SCRIPT_DIR%dashboard-startup.log"
) else (
    echo SUCCESS: Dashboard started on http://localhost:3000 >> "%SCRIPT_DIR%dashboard-startup.log"
)

REM Log the startup
echo Dashboard startup attempt at %date% %time% >> "%SCRIPT_DIR%dashboard-startup.log"

exit /b 0
