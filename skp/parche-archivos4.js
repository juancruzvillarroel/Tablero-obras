const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const i0 = t.indexOf('// Archivos de la obra: nombre, carpeta'), i1 = t.indexOf('// ---------- Persistencia local');
if (i0 < 0 || i1 < i0) throw new Error('marcas');
t = t.slice(0, i0) + fs.readFileSync('bloque-archivos.js', 'utf8') + t.slice(i1);
fs.writeFileSync('tablero.template.html', t); console.log('ok');
