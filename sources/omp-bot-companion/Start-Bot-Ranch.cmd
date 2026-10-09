@echo off
setlocal
powershell.exe -NoProfile -WindowStyle Hidden -File "%~dp0Start-Bot-Ranch.ps1" -Project "%CD%"
if errorlevel 1 (
  echo Bot Ranch could not run its launcher. Check the PowerShell error above.
  pause
)
