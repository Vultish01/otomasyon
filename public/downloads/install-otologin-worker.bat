@echo off
setlocal

cd /d "%~dp0"
echo OtoLogin Worker kurulumu baslatiliyor...

powershell -ExecutionPolicy Bypass -File "%~dp0install-otologin-worker.ps1"

if errorlevel 1 (
  echo Kurulum sirasinda hata olustu.
  pause
  exit /b 1
)

echo Kurulum tamamlandi.
echo worker-config.json dosyasini duzenleyip start-otologin-worker.bat ile calistirabilirsin.
pause
