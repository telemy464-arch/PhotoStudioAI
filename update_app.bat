@echo off
chcp 65001 >nul
title PhotoStudio AI — Auto Updater
color 0b

echo ========================================================
echo        PhotoStudio AI — অটো আপডেটার (Auto Updater)
echo ========================================================
echo.
echo [1/3] আপডেটের খোঁজ করা হচ্ছে...

cd /d "%~dp0"

:: Check if git repository
if exist ".git" (
    where git >nul 2>&1
    if %errorlevel% equ 0 (
        echo [*] Git রিপোজিটরি শনাক্ত হয়েছে। Git Pull চালানো হচ্ছে...
        git fetch origin main
        git pull origin main
        goto SYNC_DIST
    )
)

:: Standalone downloader via PowerShell
echo [*] ক্লাউড গিটহাব রিপোজিটরি থেকে ফাইল ডাউনলোড করা হচ্ছে...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$rawBase = 'https://raw.githubusercontent.com/telemy464-arch/PhotoStudioAI/main';" ^
    "try {" ^
    "    $verJson = (Invoke-RestMethod -Uri \"$rawBase/version.json\" -TimeoutSec 10);" ^
    "    Write-Host \"[OK] রিমোট ভার্সন পাওয়া গেছে: v$($verJson.version)\" -ForegroundColor Green;" ^
    "    foreach ($f in $verJson.files_to_update) {" ^
    "        if ($f -eq 'update_app.bat') { continue; }" ^
    "        $dir = Split-Path $f -Parent;" ^
    "        if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }" ^
    "        Write-Host \"[*] আপডেট হচ্ছে: $f ...\";" ^
    "        Invoke-WebRequest -Uri \"$rawBase/$f\" -OutFile $f -TimeoutSec 15;" ^
    "    }" ^
    "    Write-Host \"[OK] সকল ফাইল সফলভাবে ডাউনলোড হয়েছে!\" -ForegroundColor Green;" ^
    "} catch {" ^
    "    Write-Host \"[!] ইন্টারনেট সংযোগ বা গিটহাব কানেকশন ব্যর্থ হয়েছে: $_\" -ForegroundColor Red;" ^
    "}"

:SYNC_DIST
if exist "dist\PhotoStudioAI\_internal" (
    echo.
    echo [2/3] পোর্টেবল ডিস্ট্রিবিউশন সিঙ্ক করা হচ্ছে...
    if exist "index.html" copy /y "index.html" "dist\PhotoStudioAI\_internal\index.html" >nul
    if exist "version.json" copy /y "version.json" "dist\PhotoStudioAI\_internal\version.json" >nul
    if exist "js" xcopy /y /e /i "js" "dist\PhotoStudioAI\_internal\js" >nul
    if exist "css" xcopy /y /e /i "css" "dist\PhotoStudioAI\_internal\css" >nul
    echo [OK] পোর্টেবল বিল্ড সিঙ্ক সম্পন্ন।
)

echo.
echo ========================================================
echo   [OK] PhotoStudio AI সফলভাবে সর্বশেষ ভার্সনে আপডেট হয়েছে!
echo ========================================================
echo.
echo অ্যাপ চালাতে run_app.bat ডাবল-ক্লিক করুন।
echo.
pause
