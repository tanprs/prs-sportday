@echo off
chcp 65001 >nul
echo ========================================
echo  PRS Sport Day — Deploy to Cloudflare
echo ========================================
echo.

cd /d "%~dp0app"
echo [1/2] Building + deploying to Cloudflare Workers...
echo.
call npm run deploy
if errorlevel 1 (
    echo.
    echo [ERROR] Deploy failed. กด Enter เพื่อปิด
    pause >nul
    exit /b 1
)

echo.
cd /d "%~dp0"
echo [2/2] Pushing to GitHub...
git push origin main
if errorlevel 1 (
    echo.
    echo [ERROR] Git push failed. กด Enter เพื่อปิด
    pause >nul
    exit /b 1
)

echo.
echo ========================================
echo  Deploy สำเร็จ!
echo ========================================
echo กด Enter เพื่อปิด
pause >nul
