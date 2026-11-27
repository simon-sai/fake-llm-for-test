@echo off
rem Double-click or run: auto-cli\start-local.bat [port]
if "%~1"=="" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\scripts\start-local.ps1"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\scripts\start-local.ps1" -Port %~1
)
