@echo off
title Mitsupon Docker Deploy
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1"
if %errorlevel% neq 0 (
    echo.
    echo Deployment process exited with code %errorlevel%.
)
echo.
pause
