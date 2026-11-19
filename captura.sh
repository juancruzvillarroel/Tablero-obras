#!/bin/sh
# Arma el HTML del tablero y saca una captura con Chrome headless.
# uso: sh captura.sh <hash> <salida.png> [ancho] [alto]
S="$(cd "$(dirname "$0")" && pwd)"
cd "$S" && node armar-tablero.js >/dev/null
cd "$S"
timeout 60 "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --user-data-dir="$(cygpath -w "$S/chrome-perfil")" \
  --use-angle=swiftshader --enable-unsafe-swiftshader --window-size=${3:-1440},${4:-900} --virtual-time-budget=8000 \
  --enable-logging=stderr --v=0 --screenshot="$(cygpath -w "$S/$2")" "file:///$S/argerich-estructura.html#$1" 2>&1 \
  | grep -E "CONSOLE|Uncaught" | head -10
echo "listo $2"
