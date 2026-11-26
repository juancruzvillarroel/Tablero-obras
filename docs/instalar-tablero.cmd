@echo off
rem Instala el tablero de obras del Estudio JES en esta compu (una sola vez). Después se usa con abrir-tablero.cmd
rem o con el acceso directo "Tablero de obras" del escritorio.
rem Hace falta: Git (https://git-scm.com), Node.js (https://nodejs.org), OneDrive con las carpetas de las obras
rem sincronizadas, y SketchUp y AutoCAD para convertir los archivos. Para publicar, tu usuario de GitHub tiene que
rem tener permiso en el repositorio (pedíselo a Juan): la primera vez Git te va a pedir que entres a GitHub.
chcp 65001 >nul
setlocal
set "DESTINO=%USERPROFILE%\TABLERO"
set "REPO=https://github.com/juancruzvillarroel/Tablero-obras.git"
where git >nul 2>nul || (echo Falta Git. Instalalo desde https://git-scm.com y volve a abrir este archivo. & pause & exit /b 1)
where node >nul 2>nul || (echo Falta Node.js. Instalalo desde https://nodejs.org y volve a abrir este archivo. & pause & exit /b 1)
if exist "%DESTINO%\.git" (
  echo El tablero ya esta en %DESTINO%: lo actualizo.
  git -C "%DESTINO%" pull --rebase --autostash
) else (
  echo Descargando el tablero en %DESTINO%...
  git clone "%REPO%" "%DESTINO%" || (echo No se pudo descargar. Revisa la conexion. & pause & exit /b 1)
)
cd /d "%DESTINO%"
echo Instalando lo que necesita (puede tardar un par de minutos)...
call npm install --no-audit --no-fund
rem Acceso directo en el escritorio
powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\Tablero de obras.lnk'); $s.TargetPath='%DESTINO%\abrir-tablero.cmd'; $s.WorkingDirectory='%DESTINO%'; $s.Save()"
rem Arranque con Windows: el servidor del tablero se prende solo y sin ventana al entrar a la compu (arrancar-servidor.vbs),
rem asi el menu Archivos siempre puede actualizar. Para sacarlo, borrar "Tablero de obras (servidor)" de la carpeta Inicio.
powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Startup')+'\Tablero de obras (servidor).lnk'); $s.TargetPath=$env:WINDIR+'\System32\wscript.exe'; $s.Arguments='\"%DESTINO%\arrancar-servidor.vbs\"'; $s.WorkingDirectory='%DESTINO%'; $s.Save()"
echo El tablero va a arrancar solo cada vez que prendas la compu.
echo.
echo Listo. Se abre el tablero; la proxima vez usa el acceso directo "Tablero de obras" del escritorio.
call "%DESTINO%\abrir-tablero.cmd"
