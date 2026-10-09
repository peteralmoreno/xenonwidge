@echo off
setlocal
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or newer is required to run Bot Ranch Companion.
  pause
  exit /b 1
)
node "%~dp0bridge.mjs"
if errorlevel 1 pause
