@echo off
title Khordegir Studio — Offline Motion Graphics & Live OBS Studio
setlocal

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "ROOT_DIR=%%~fI"
set "STUDIO_URL=http://127.0.0.1:3000/editor/"

echo ========================================================
echo   Khordegir Studio
echo   Opening %STUDIO_URL%
echo ========================================================

:: Check if already running on port 3000
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 '%STUDIO_URL%'; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel%==0 (
  echo Studio is already running! Opening browser...
  start "" "%STUDIO_URL%"
  exit /b 0
)

if exist "%ROOT_DIR%\server.js" (
  where node >nul 2>&1
  if %errorlevel%==0 (
    cd /d "%ROOT_DIR%"
    if not exist "%ROOT_DIR%\node_modules" (
      echo First run: installing dependencies...
      call npm install --no-audit --prefer-offline
    )
    start "" cmd /c "timeout /t 2 /nobreak >nul && start \"\" \"%STUDIO_URL%\""
    echo Starting Khordegir Studio on http://127.0.0.1:3000 ...
    echo Keep this window open while using the Studio. Close it to stop.
    node server.js
    exit /b 0
  )
)

where python >nul 2>&1
if %errorlevel%==0 (
  cd /d "%SCRIPT_DIR%"
  start "" cmd /c "timeout /t 2 /nobreak >nul && start \"\" \"%STUDIO_URL%\""
  python -m khordegir editor --port 3000
  exit /b 0
)

echo ERROR: Node.js 20+ or Python 3.10+ is required.
echo Download Node.js from https://nodejs.org/
pause
