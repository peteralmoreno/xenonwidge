@echo off
setlocal
node "%~dp0ranch-cli.mjs" %*
exit /b %ERRORLEVEL%
