@echo off
setlocal

cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo Worker henuz kurulmamamis. Once install-otologin-worker.bat calistir.
  pause
  exit /b 1
)

if not exist "worker-config.json" (
  copy /y "worker-config.template.json" "worker-config.json" >nul
  echo worker-config.json olusturuldu. Lutfen ayarlari duzenleyip yeniden calistir.
  pause
  exit /b 1
)

echo OtoLogin Worker baslatiliyor...
call ".venv\Scripts\python.exe" "worker\runner.py" >> "worker-console.log" 2>&1
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
  echo Worker beklenmedik sekilde kapandi. Exit code: %EXIT_CODE%
  echo Loglari kontrol et:
  echo - worker-console.log
  echo - worker-runtime.log
  pause
)

exit /b %EXIT_CODE%
