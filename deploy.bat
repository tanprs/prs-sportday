@echo off
if "%1"=="run" goto :run
start "Deploy PRS Sportday" cmd /k "%~f0" run
exit

:run
cd /d "%~dp0app"
echo Building...
call npm run build
if %errorlevel% neq 0 (
  echo.
  echo *** Build failed! (exit code %errorlevel%) ***
  pause
  exit /b 1
)
echo.
echo Deploying...
call npm run deploy
echo.
echo Done!
pause
