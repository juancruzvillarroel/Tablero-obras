const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const i0 = t.indexOf('// Archivos de la obra: nombre, carpeta'), i1 = t.indexOf('// ---------- Persistencia local');
if (i0 < 0 || i1 < i0) throw new Error('marcas');
t = t.slice(0, i0) + fs.readFileSync('bloque-archivos.js', 'utf8') + t.slice(i1);
const r = (a, b) => { if (!t.includes(a)) throw new Error('no: ' + a); t = t.replace(a, b); };
r(`.arch-pie { margin: 6px 10px 6px;`, `.arch-quitar { all: unset; cursor: pointer; font-size: 12px; color: #a8a8a8; border: 1px solid #333; border-radius: 7px; padding: 3px 9px; }
.arch-quitar:hover { color: #ff8a80; border-color: #5c2420; }
.arch-quitar:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.arch-quitar[disabled] { opacity: .35; cursor: default; color: #a8a8a8; border-color: #333; }
.arch-mas { all: unset; cursor: pointer; display: block; margin: 6px 10px 2px; font-size: 12.5px; font-weight: 600; color: #fff; border: 1px dashed #444; border-radius: 8px; padding: 8px 10px; text-align: center; }
.arch-mas:hover { background: #1a1a1a; border-color: #666; }
.arch-mas[disabled] { opacity: .35; cursor: default; }
.arch-agregar { margin: 6px 4px 2px; padding: 10px; border: 1px solid #2a2a2a; border-radius: 10px; display: grid; gap: 8px; background: #0b0b0b; }
.arch-agr-cab { display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; }
.arch-x { all: unset; cursor: pointer; color: #8a8a8a; padding: 0 4px; }
.arch-x:hover { color: #fff; }
.arch-buscar { width: 100%; box-sizing: border-box; background: #161616; border: 1px solid #333; border-radius: 7px; color: #fff; padding: 6px 8px; font-size: 12.5px; }
.arch-lista { max-height: 220px; overflow-y: auto; display: grid; gap: 1px; }
.arch-lista button { all: unset; cursor: pointer; display: grid; gap: 1px; padding: 6px 8px; border-radius: 6px; }
.arch-lista button:hover { background: #1c1c1c; }
.arch-lista button[aria-selected="true"] { background: #fff; color: #111; }
.arch-lista button[aria-selected="true"] .carp { color: #555; }
.arch-lista .nom { font-size: 12.5px; font-weight: 600; word-break: break-word; }
.arch-lista .carp { font-size: 11px; color: #7a7a7a; word-break: break-word; }
.arch-rol { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #bdbdbd; }
.arch-rol select { flex: 1; background: #161616; color: #fff; border: 1px solid #333; border-radius: 7px; padding: 5px 6px; font-size: 12.5px; }
.arch-agregar .arch-act { justify-self: start; }
.arch-pie { margin: 6px 10px 6px;`);
fs.writeFileSync('tablero.template.html', t); console.log('ok');
