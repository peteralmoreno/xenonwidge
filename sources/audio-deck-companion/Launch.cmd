@echo off
setlocal
cd /d "%~dp0"
if not exist "%~dp0AudioDeck.Companion.exe" (
  echo Audio Deck Companion is missing. Extract the entire companion release first.
  pause
  exit /b 1
)
"%~dp0AudioDeck.Companion.exe" %*
set "audioDeckExit=%errorlevel%"
if not "%audioDeckExit%"=="0" pause
exit /b %audioDeckExit%
