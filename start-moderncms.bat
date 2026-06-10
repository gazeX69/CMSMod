@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install Node.js before starting ModernCMS.
  pause
  exit /b 1
)

where pnpm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] PNPM not found. Install pnpm before starting ModernCMS.
  pause
  exit /b 1
)

pnpm start:dev

if errorlevel 1 (
  echo.
  echo [ERROR] ModernCMS development launcher failed.
  pause
)

endlocal
