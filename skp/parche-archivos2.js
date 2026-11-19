const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const i0 = t.indexOf('// Archivos de la obra: nombre, carpeta'), i1 = t.indexOf('// ---------- Persistencia local');
if (i0 < 0 || i1 < i0) throw new Error('marcas');
t = t.slice(0, i0) + fs.readFileSync('bloque-archivos.js', 'utf8') + t.slice(i1);
const r = (a, b) => { if (!t.includes(a)) throw new Error('no: ' + a); t = t.replace(a, b); };
r(`.arch-pie { margin: 6px 10px 6px;`, `.arch-fila { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 4px; }
.arch-fila .arch-estado { margin-top: 0; }
.arch-act { all: unset; cursor: pointer; font-size: 12px; font-weight: 600; background: #fff; color: #111; border-radius: 7px; padding: 4px 10px; }
.arch-act:hover { background: #e6e6e6; }
.arch-act:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.arch-act[disabled] { opacity: .35; cursor: default; }
.arch-prog { flex-basis: 100%; font-size: 12px; color: #d0d0d0; line-height: 1.5; display: flex; align-items: flex-start; gap: 8px; }
.arch-prog.ok { color: #9be39b; display: block; }
.arch-prog.mal { color: #ff8a80; display: block; }
.arch-prog b { color: #fff; }
.giro { width: 12px; height: 12px; margin-top: 3px; border: 2px solid #555; border-top-color: #fff; border-radius: 50%; animation: giro .8s linear infinite; flex: none; }
@keyframes giro { to { transform: rotate(360deg); } }
.arch-pie { margin: 6px 10px 6px;`);
fs.writeFileSync('tablero.template.html', t); console.log('ok');
