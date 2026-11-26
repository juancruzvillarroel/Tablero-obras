' Arranca el servidor del tablero sin ventana. Lo usa el inicio de Windows (acceso directo en la carpeta Inicio):
' asi el tablero de la compu esta siempre andando y el menu Archivos puede actualizar sin abrir nada a mano.
' Si ya esta andando, no hace nada. Lo que el servidor escribe queda en respaldo\servidor-salida.log.
' (Sin acentos a proposito: Windows lee este archivo con la codificacion vieja.)
Option Explicit
Dim sh, fs, dir, http
Set sh = CreateObject("WScript.Shell")
Set fs = CreateObject("Scripting.FileSystemObject")
dir = fs.GetParentFolderName(WScript.ScriptFullName)
On Error Resume Next
Set http = CreateObject("MSXML2.ServerXMLHTTP")
http.setTimeouts 2000, 2000, 2000, 2000
http.open "GET", "http://127.0.0.1:5180/api/estado", False
http.send
If Err.Number = 0 Then
  If http.status = 200 Then WScript.Quit
End If
Err.Clear
On Error GoTo 0
If Not fs.FolderExists(dir & "\respaldo") Then fs.CreateFolder dir & "\respaldo"
sh.CurrentDirectory = dir
sh.Run "cmd /c node servidor-tablero.js >> respaldo\servidor-salida.log 2>&1", 0, False
