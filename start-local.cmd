@echo off
setlocal
cd /d "%~dp0"
set "ASTRO_TELEMETRY_DISABLED=1"
set "PAUSE_ON_EXIT=0"
set "COMMAND=%~1"

if not defined COMMAND (
  set "COMMAND=preview"
  set "PAUSE_ON_EXIT=1"
)

if /i "%COMMAND%"=="preview" goto preview
if /i "%COMMAND%"=="build" goto build
if /i "%COMMAND%"=="check" goto check
if /i "%COMMAND%"=="diagrams" goto diagrams
if /i "%COMMAND%"=="distribute" goto distribute
if /i "%COMMAND%"=="stop" goto stop
if /i "%COMMAND%"=="help" goto help
if /i "%COMMAND%"=="--help" goto help
if /i "%COMMAND%"=="-h" goto help

echo [ERROR] Unknown command: %COMMAND%
echo.
call :print_help
exit /b 2

:preview
call :prepare
if errorlevel 1 goto command_failed
echo [PREVIEW] Generating diagrams, site pages, and the search index...
call npm run local
if errorlevel 1 goto command_failed
echo.
echo The local site is ready. If the browser did not open, use the localhost URL shown above.
if "%PAUSE_ON_EXIT%"=="1" pause
exit /b 0

:build
call :prepare
if errorlevel 1 goto command_failed
echo [BUILD] Generating the production site...
call npm run build
if errorlevel 1 goto command_failed
echo [DONE] The production site is available in the dist directory.
exit /b 0

:check
call :prepare
if errorlevel 1 goto command_failed
echo [CHECK] Running type checks...
call npm run check
if errorlevel 1 goto command_failed
echo [CHECK] Building the production site...
call npm run build
if errorlevel 1 goto command_failed
echo [CHECK] Verifying generated pages and links...
call npm run verify
if errorlevel 1 goto command_failed
echo [DONE] All checks passed.
exit /b 0

:diagrams
call :prepare
if errorlevel 1 goto command_failed
echo [DIAGRAMS] Generating PlantUML and draw.io diagrams...
call npm run diagrams
if errorlevel 1 goto command_failed
echo [DONE] Diagrams generated.
exit /b 0

:distribute
call :prepare
if errorlevel 1 goto command_failed
echo [DISTRIBUTE] Generating platform-ready Markdown...
call npm run distribute -- %2 %3 %4 %5 %6 %7 %8 %9
if errorlevel 1 goto command_failed
echo [DONE] Distribution output is available in the .distribution directory.
exit /b 0

:stop
call :require_tools
if errorlevel 1 goto command_failed
echo [PREVIEW] Stopping the local site...
call npm run stop:local
if errorlevel 1 goto command_failed
exit /b 0

:help
call :print_help
exit /b 0

:prepare
call :require_tools
if errorlevel 1 exit /b 1
if not exist "node_modules\astro\bin\astro.mjs" (
  echo [SETUP] Installing dependencies for the first run...
  call npm ci
  if errorlevel 1 exit /b 1
)
exit /b 0

:require_tools
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found. Install Node.js 22.12 or newer and try again.
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found. Reinstall Node.js with npm and try again.
  exit /b 1
)
exit /b 0

:print_help
echo Usage: start-local.cmd [command]
echo.
echo   preview    Build the local site with drafts and open it in a browser (default)
echo   build      Build the production site
echo   check      Run type, production build, and link checks
echo   diagrams   Generate PlantUML and draw.io diagrams
echo   distribute Generate Markdown for all configured distribution platforms
echo   stop       Stop the local preview
echo   help       Show this help
exit /b 0

:command_failed
echo.
echo [ERROR] Command "%COMMAND%" failed. Review the log above.
if "%PAUSE_ON_EXIT%"=="1" pause
exit /b 1
