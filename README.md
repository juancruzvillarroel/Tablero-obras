# Tablero de obras · Estudio JES

Modelo 3D interactivo de cada obra (estructura, instalación sanitaria y albañilería) con sus cómputos y avance.
La página publicada es `docs/index.html` (GitHub Pages). Se arma a partir de los archivos de cada obra en OneDrive:
el SketchUp de estructura y los CAD de estructura, instalaciones y albañilería.

## Subir, actualizar y quitar archivos (cualquier compu del estudio)

Cualquiera que tenga el tablero instalado en su compu, con SketchUp y AutoCAD, puede subir archivos (el **+** del
menú **Archivos**), actualizarlos y quitarlos (el tacho). Sirve tanto el tablero de la compu (http://localhost:5180)
como la página online: si en la compu está andando el tablero, la página online la usa para hacer el trabajo.
Cada cambio convierte el archivo en esa compu, rearma el tablero y lo publica (la página online se actualiza en uno
o dos minutos). Antes de cambiar algo se trae lo último que publicaron los demás.

Para instalarlo en una compu nueva:

1. Instalar [Git](https://git-scm.com) y [Node.js](https://nodejs.org).
2. Tener sincronizada en OneDrive la carpeta del estudio con las obras (`01_PROYECTOS/ARGERICH 2984`, …): el
   tablero la encuentra solo.
3. Descargar `instalar-tablero.cmd` (está en el menú Archivos de la página online) y abrirlo con doble clic: baja el
   tablero a `%USERPROFILE%\TABLERO`, instala lo que necesita y deja un acceso directo "Tablero de obras" en el
   escritorio.
4. Para publicar, el usuario de GitHub tiene que tener permiso de escritura en este repositorio; la primera vez Git
   pide entrar a GitHub.

Los archivos subidos desde la compu se guardan en la carpeta `TABLERO` de cada obra en OneDrive.

## Cómo se usa

- `abrir-tablero.cmd` levanta el servidor (`node servidor-tablero.js`) y abre http://localhost:5180.
- `node armar-tablero.js` arma la página (`argerich-estructura.html` y `docs/index.html`) con los datos actuales.
- `node smoke.js` prueba que la página cargue sin errores.

## Cómo está organizado

| Carpeta / archivo | Qué hay |
| --- | --- |
| `skp/tablero.template.html` | La página del tablero (HTML, estilos y código). `armar-tablero.js` le inyecta los datos. |
| `proyectos.json` | Las obras, sus datos y los archivos con los que se armaron. |
| `carpetas.local.json` | Dónde está cada obra en esta compu (no se sube; se arma solo buscando en OneDrive). |
| `actualizar.js` | Sube, vuelve a cargar, agrega o quita un archivo y rearma lo que depende de él, con respaldo. |
| `servidor-tablero.js` | Servidor local: sirve el tablero y atiende el menú Archivos (también desde la página online). |
| `skp/`, `hab/`, `lib/`, `cdc/` | Estructura de Argerich 2984, Habana 3329, Libertador 3174 y Condarco 3187 desde SketchUp (`exportar.rb` + extracción). |
| `san/` | Instalación sanitaria de Argerich desde el CAD. |
| `alb/`, `lib/alb/` | Muros de Argerich y de Libertador desde el CAD de albañilería. |
| `superposiciones.js` | Descuenta el hormigón compartido entre piezas que se superponen. |

Necesita Node.js; para convertir archivos, SketchUp y AutoCAD (accoreconsole) instalados: se usa la versión más
nueva de cada uno que haya en la compu.
