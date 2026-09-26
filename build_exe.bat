@echo off
title PhotoStudio AI Executable Builder
echo ========================================================
echo   Building Standalone PhotoStudioAI.exe Windows Package
echo ========================================================
echo.

if not exist ".venv\Scripts\pyinstaller.exe" (
    echo Error: PyInstaller not found in .venv!
    echo Running pip install pyinstaller...
    .venv\Scripts\pip install pyinstaller
)

echo Starting PyInstaller build...
.venv\Scripts\pyinstaller --noconfirm --clean PhotoStudioAI.spec

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   BUILD SUCCESSFUL!
    echo   Executable output: dist\PhotoStudioAI\PhotoStudioAI.exe
    echo ========================================================
) else (
    echo.
    echo Build failed with error code %ERRORLEVEL%.
)
pause
