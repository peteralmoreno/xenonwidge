@echo off
setlocal
where omp >nul 2>nul
if errorlevel 1 (
  echo Oh My Pi is not on PATH. Install OMP and confirm that omp runs in your terminal first.
  pause
  exit /b 1
)
if not "%~1"=="" (
  pushd "%~1"
  if errorlevel 1 exit /b 1
)
call omp --extension "%~dp0extension.mjs"
set "ompBotExit=%errorlevel%"
if not "%~1"=="" popd
if not "%ompBotExit%"=="0" pause
exit /b %ompBotExit%
