@echo off
echo ==========================================
echo  PRS Sport Day -- Deploy to Cloudflare
echo ==========================================
echo.

if "%CLOUDFLARE_API_TOKEN%"=="" (
    echo [WARN] CLOUDFLARE_API_TOKEN is not set.
    echo        Set it in Windows environment variables,
    echo        or run: wrangler login
    echo.
)

cd /d "%~dp0app"
echo [1/2] Building + deploying to Cloudflare...
echo.
call npm run deploy
if errorlevel 1 (
    echo.
    echo [ERROR] Deploy failed - check output above
    pause
    exit /b 1
)

echo.
cd /d "%~dp0"
echo [2/2] Pushing to GitHub...
call git push origin main
if errorlevel 1 (
    echo.
    echo [ERROR] Git push failed - check output above
    pause
    exit /b 1
)

echo.
echo ==========================================
echo  Done! Deploy + push complete.
echo ==========================================
pause
