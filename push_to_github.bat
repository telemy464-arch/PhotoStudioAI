@echo off
setlocal
title PhotoStudio AI - Push to GitHub
color 0a

echo ========================================================
echo        PhotoStudio AI - GitHub Push Tool
echo ========================================================
echo.

cd /d "%~dp0"

echo [*] Staging files...
git add .

echo [*] Committing changes...
git commit -m "Update PhotoStudio AI"

echo.
echo [*] Pushing to GitHub (origin main)...
git push -u origin main

if errorlevel 1 goto PUSH_ERROR
goto PUSH_SUCCESS

:PUSH_SUCCESS
echo.
echo ========================================================
echo   [OK] Successfully uploaded to GitHub!
echo   Repository: https://github.com/telemy464-arch/PhotoStudioAI
echo ========================================================
goto FINISH

:PUSH_ERROR
echo.
echo ========================================================
echo   [!] Push failed!
echo.
echo   1. Make sure you created 'PhotoStudioAI' at:
echo      https://github.com/new
echo   2. Complete GitHub login if a browser/window pops up.
echo ========================================================
goto FINISH

:FINISH
echo.
pause
