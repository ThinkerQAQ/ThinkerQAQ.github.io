@echo off
setlocal
cd /d "%~dp0"
set "ASTRO_TELEMETRY_DISABLED=1"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js, then open this file again.
  pause
  exit /b 1
)
if not exist "node_modules\astro\bin\astro.mjs" (
  echo Dependencies are missing. Run npm ci in this folder first.
  pause
  exit /b 1
)
echo Building your local site, including full-text search...
call npm run local
if errorlevel 1 (
  echo The site could not start. See the error above.
  pause
  exit /b 1
)
echo Ready. Open the localhost URL shown above if the browser did not open.
echo The preview runs in the background. To stop it: npm run stop:local
pause
