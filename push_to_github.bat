@echo off
chcp 65001 >nul
title PhotoStudio AI — Push to GitHub
color 0a

echo ========================================================
echo        PhotoStudio AI — গিটহাবে আপলোড (Push to GitHub)
echo ========================================================
echo.

cd /d "%~dp0"

git add .
set /p commit_msg="কমিট মেসেজ লিখুন (Enter চাপলে ডিফল্ট মেসেজ যাবে): "
if "%commit_msg%"=="" set commit_msg=Update PhotoStudio AI

git commit -m "%commit_msg%"
echo.
echo [*] গিটহাবে পুশ করা হচ্ছে...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo   [OK] সফলভাবে গিটহাবে আপলোড সম্পন্ন হয়েছে!
    echo ========================================================
) else (
    echo.
    echo [!] পুশ ব্যর্থ হয়েছে। নিশ্চিত করুন আপনি https://github.com/new এ 'PhotoStudioAI' রিপোজিটরি তৈরি করেছেন এবং সাইন ইন আছেন।
)

echo.
pause
