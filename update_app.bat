@echo off
setlocal
title PhotoStudio AI - Auto Updater
color 0b

echo ========================================================
echo        PhotoStudio AI - Auto Updater
echo ========================================================
echo.
echo [*] Checking for updates...

cd /d "%~dp0"

if not exist ".git" goto DOWNLOAD_FALLBACK
where git >nul 2>&1
if errorlevel 1 goto DOWNLOAD_FALLBACK

echo [*] Git repository detected. Pulling latest updates...
git fetch origin main
git pull origin main
goto SYNC_DIST

:DOWNLOAD_FALLBACK
echo [*] Downloading latest files directly from GitHub...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$rawBase = 'https://raw.githubusercontent.com/telemy464-arch/PhotoStudioAI/main';" ^
    "try {" ^
    "    $verJson = (Invoke-RestMethod -Uri \"$rawBase/version.json\" -TimeoutSec 10);" ^
    "    Write-Host \"[OK] Latest remote version: v$($verJson.version)\" -ForegroundColor Green;" ^
    "    foreach ($f in $verJson.files_to_update) {" ^
    "        if ($f -eq 'update_app.bat') { continue; }" ^
    "        $dir = Split-Path $f -Parent;" ^
    "        if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }" ^
    "        Write-Host \"[*] Updating: $f ...\";" ^
    "        Invoke-WebRequest -Uri \"$rawBase/$f\" -OutFile $f -TimeoutSec 15;" ^
    "    }" ^
    "    Write-Host \"[OK] All files downloaded successfully!\" -ForegroundColor Green;" ^
    "} catch {" ^
    "    Write-Host \"[!] Update failed (check connection/repo): $_\" -ForegroundColor Red;" ^
    "}"

:SYNC_DIST
if not exist "dist\PhotoStudioAI\_internal" goto FINISH

echo.
echo [*] Syncing portable build...
if exist "index.html" copy /y "index.html" "dist\PhotoStudioAI\_internal\index.html" >nul
if exist "version.json" copy /y "version.json" "dist\PhotoStudioAI\_internal\version.json" >nul
if exist "js" xcopy /y /e /i "js" "dist\PhotoStudioAI\_internal\js" >nul
if exist "css" xcopy /y /e /i "css" "dist\PhotoStudioAI\_internal\css" >nul
echo [OK] Portable build synced.

:FINISH
echo.
echo ========================================================
echo   [OK] PhotoStudio AI update process completed!
echo ========================================================
echo.
echo Double-click run_app.bat to launch the application.
echo.
pause
