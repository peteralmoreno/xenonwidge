@echo off
setlocal
node "%~dp0open-setup.mjs"
if errorlevel 1 pause
