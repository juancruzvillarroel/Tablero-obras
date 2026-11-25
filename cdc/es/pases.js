// Condarco 3187: pases en losa de la lámina "PASES EN LOSA" del plano de estructura (CDC 3187_ES.dwg).
// uso (en cdc/es): node pases.js es.dxf  →  pases.json con los pases de cada losa, en coordenadas del SketchUp.
// - La lámina es una columna de plantas apiladas cada 20 m (x 40..80 del dibujo), en las mismas filas que las plantas
//   de estructura. Cada fila es una planta (PB, tipo 1°-6°, 7°, 8°, 9°, 10°, sala de máquinas) y sus pases son los de
//   la losa de piso de esa planta: lo confirman las caídas de artefactos de la sanitaria, que atraviesan solo la losa
//   de piso (las del 1° caen en los pases de la fila tipo, no en los de la fila de PB).
// - Los pases están en la capa PASES: algunos dibujados sueltos (rectángulo con su cruz) y la mayoría como bloques
//   (PASE 15X15, PASE 20X20, PASE ESCALERA…) cuyo dibujo está en coordenadas absolutas: el pase es el dibujo del
//   bloque corrido por el punto de inserción.
// - Alineación con el modelo: x - 40, y - (base de la fila); la misma que las plantas de estructura de al lado, que
//   coinciden con las columnas del SketchUp corridas (-120, -100) y (-160, -100).
const fs = require('fs');
const P = require('../../node_modules/dxf-parser');
const d = new P().parseSync(fs.readFileSync(process.argv[2] || 'es.dxf', 'utf8'));

const X0 = 40, X1 = 80, DX = -40;
// Fila (base y del dibujo) → losas de piso a las que corresponde (la planta tipo vale para los pisos 1° a 6°, que
// se apoyan en las losas s/ PB a s/ 5°)
const FILAS = [[120, ['sSS']], [100, ['sPB', 's1', 's2', 's3', 's4', 's5']], [80, ['s6']], [60, ['s7']], [40, ['s8']], [20, ['s9']], [0, ['s10']]];

// Segmentos de la capa PASES: sueltos y dentro de bloques insertados
const segs = [];
const agregar = (e, mover) => {
  if (e.layer !== 'PASES' || !e.vertices) return;
  const v = e.vertices.map(mover);
  for (let i = 1; i < v.length; i++) segs.push([v[i - 1], v[i]]);
  if (e.shape && v.length > 2) segs.push([v[v.length - 1], v[0]]);
};
for (const e of d.entities) {
  if (e.type !== 'INSERT') { agregar(e, p => p); continue; }
  const b = d.blocks[e.name]; if (!b || !b.entities) continue;
  const sx = e.xScale || 1, sy = e.yScale || 1, r = (e.rotation || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const bx = (b.position && b.position.x) || 0, by = (b.position && b.position.y) || 0;
  const mover = p => { const x = (p.x - bx) * sx, y = (p.y - by) * sy; return { x: e.position.x + x * c - y * s, y: e.position.y + x * s + y * c }; };
  // Los bloques de pase tienen su dibujo en la capa PASES aunque el bloque esté insertado en otra
  for (const be of b.entities) agregar(be, mover);
}
// Componentes conexas por extremos compartidos (tolerancia 2 mm) → rectángulo de cada pase
const k = p => Math.round(p.x * 500) + ',' + Math.round(p.y * 500);
const padre = {}; const f = a => padre[a] === a ? a : (padre[a] = f(padre[a]));
const u = (a, b) => { padre[a] ??= a; padre[b] ??= b; padre[f(a)] = f(b); };
segs.forEach(([a, b]) => u(k(a), k(b)));
const g = {}; segs.forEach(s => (g[f(k(s[0]))] ||= []).push(s));
const rects = Object.values(g).map(ss => { const xs = ss.flatMap(s => [s[0].x, s[1].x]), ys = ss.flatMap(s => [s[0].y, s[1].y]); return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; })
  .filter(r => r.x0 > X0 && r.x1 < X1 && r.x1 - r.x0 > 0.03 && r.y1 - r.y0 > 0.03 && r.x1 - r.x0 < 2.5 && r.y1 - r.y0 < 2.5);
// Se fusionan rectángulos superpuestos (la cruz interna a veces queda como otra componente)
const fus = [];
for (const r of rects) { const o = fus.find(q => r.x0 < q.x1 + 0.005 && r.x1 > q.x0 - 0.005 && r.y0 < q.y1 + 0.005 && r.y1 > q.y0 - 0.005); if (o) { o.x0 = Math.min(o.x0, r.x0); o.x1 = Math.max(o.x1, r.x1); o.y0 = Math.min(o.y0, r.y0); o.y1 = Math.max(o.y1, r.y1); } else fus.push({ ...r }); }
const r3 = v => Math.round(v * 1000) / 1000;
const res = {};
for (const r of fus) {
  const cy = (r.y0 + r.y1) / 2, fila = FILAS.find(([b]) => cy >= b && cy < b + 20); if (!fila) continue;
  const q = { x0: r3(r.x0 + DX), x1: r3(r.x1 + DX), y0: r3(r.y0 - fila[0]), y1: r3(r.y1 - fila[0]) };
  for (const l of fila[1]) (res[l] ||= []).push(q);
}
for (const [l, v] of Object.entries(res)) console.log(l.padEnd(4), v.length, 'pases; medidas:', [...new Set(v.map(r => Math.round((r.x1 - r.x0) * 100) + 'x' + Math.round((r.y1 - r.y0) * 100)))].join(' '));
fs.writeFileSync('pases.json', JSON.stringify(res));
