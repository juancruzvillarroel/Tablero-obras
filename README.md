# Tablero de obras · Estudio JES

Modelo 3D interactivo de cada obra (estructura, instalación sanitaria y albañilería) con sus cómputos y avance.
La página publicada es `docs/index.html` (GitHub Pages). Se arma en la compu del estudio a partir de los archivos
de cada obra en OneDrive: el SketchUp de estructura y los CAD de estructura, instalaciones y albañilería.

## Cómo se usa

- `node servidor-tablero.js` levanta el tablero en http://localhost:5180. En esa versión local, el menú
  **Archivos** de la barra negra deja actualizar, quitar y agregar archivos de cada obra. Cada cambio rearma el
  tablero y, si el repositorio tiene GitHub configurado, sube la página nueva sola.
- `node armar-tablero.js` arma la página (`argerich-estructura.html` y `docs/index.html`) con los datos actuales.
- `node smoke.js` prueba que la página cargue sin errores.

## Cómo está organizado

| Carpeta / archivo | Qué hay |
| --- | --- |
| `skp/tablero.template.html` | La página del tablero (HTML, estilos y código). `armar-tablero.js` le inyecta los datos. |
| `proyectos.json` | Las obras, sus datos y los archivos con los que se armaron. |
| `carpetas.local.json` | Dónde está cada obra en esta compu (no se sube). |
| `actualizar.js` | Vuelve a cargar, agrega o quita un archivo y rearma lo que depende de él, con respaldo. |
| `skp/`, `hab/`, `lib/` | Estructura de Argerich 2984, Habana 3329 y Libertador 3174 desde SketchUp (`exportar.rb` + extracción). |
| `san/` | Instalación sanitaria de Argerich desde el CAD. |
| `alb/` | Muros de Argerich desde el CAD de albañilería. |
| `superposiciones.js` | Descuenta el hormigón compartido entre piezas que se superponen. |

Necesita Node.js; para actualizar archivos, además SketchUp 2023 y AutoCAD 2024 (accoreconsole) instalados.
