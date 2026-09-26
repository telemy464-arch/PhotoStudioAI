@echo off
title PhotoStudio AI — Studio Pen-Cut Edition
echo ===================================================
echo   PhotoStudio AI - Passport & Stamp Photo Studio
echo ===================================================
echo Starting application with AI Studio Engine on http://localhost:8000 ...

if exist "%~dp0.venv\Scripts\python.exe" (
    "%~dp0.venv\Scripts\python.exe" "%~dp0server.py"
) else (
    python "%~dp0server.py"
)
pause
