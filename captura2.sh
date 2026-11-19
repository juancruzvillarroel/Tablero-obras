#!/bin/sh
# Captura con un script extra de cámara (solo para verificar; no se publica).
# uso: sh captura2.sh <salida.png> "<js>"
S="$(cd "$(dirname "$0")" && pwd)"
cd "$S" && node -e "
const fs=require('fs');const h=fs.readFileSync('argerich-estructura.html','utf8');
fs.writeFileSync('verif.html', h + '<script>setTimeout(()=>{' + process.argv[1] + '}, 300);</script>');" "$2"
timeout 60 "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --user-data-dir="$(cygpath -w "$S/chrome-perfil")" \
  --use-angle=swiftshader --enable-unsafe-swiftshader --window-size=1440,900 --virtual-time-budget=9000 \
  --enable-logging=stderr --v=0 --screenshot="$(cygpath -w "$S/$1")" "file:///$S/verif.html" 2>&1 | grep -E "Uncaught|ERROR:CONSOLE" | head -5
echo "listo $1"
