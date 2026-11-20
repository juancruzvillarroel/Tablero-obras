@echo off
rem Abre el tablero local de obras. Si el servidor no está andando, lo levanta en una ventana minimizada
rem ("Servidor del tablero"; cerrarla lo apaga) y después abre el navegador en http://localhost:5180.
cd /d "%~dp0"
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://127.0.0.1:5180/api/estado | Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  start "Servidor del tablero" /min node servidor-tablero.js
  timeout /t 2 /nobreak >nul
)
start "" http://localhost:5180
