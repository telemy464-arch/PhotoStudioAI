@echo off
title PhotoStudio AI - Passport and Stamp Photo Studio
cd /d "%~dp0"

echo ===================================================
echo   PhotoStudio AI - Passport and Stamp Studio
echo ===================================================
echo   Starting local server and opening web browser...
echo   Please keep this window open while using the app.
echo ===================================================
echo.

if exist "PhotoStudioAI.exe" (
    PhotoStudioAI.exe
) else if exist "dist\PhotoStudioAI\PhotoStudioAI.exe" (
    cd dist\PhotoStudioAI
    PhotoStudioAI.exe
) else (
    echo Error: PhotoStudioAI.exe not found!
    pause
)
