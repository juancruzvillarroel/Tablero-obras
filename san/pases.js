// Pases en losa del plano del ingeniero (capa PASES), agrupados en rectángulos, por losa.
const fs = require('fs');
const est = JSON.parse(fs.readFileSync('../dxf.json'));
const FILAS = [['S/B', 105], ['S/1-2', 90], ['S/3', 75], ['S/4', 60], ['S/medio SM', 45], ['S/SM', 30]];
const segs = [];
for (const e of est.entities.filter(e => e.layer === 'PASES')) {
  if (e.type === 'LINE') segs.push([e.vertices[0], e.vertices[1]]);
  else if (e.vertices) { const v = e.vertices; for (let i = 1; i < v.length; i++) segs.push([v[i - 1], v[i]]); if (e.shape) segs.push([v[v.length - 1], v[0]]); }
}
// Componentes conexas por extremos compartidos (tolerancia 2 mm)
const k = p => Math.round(p.x * 500) + ',' + Math.round(p.y * 500);
const padre = {}; const f = a => padre[a] === a ? a : (padre[a] = f(padre[a]));
const u = (a, b) => { padre[a] ??= a; padre[b] ??= b; padre[f(a)] = f(b); };
segs.forEach(([a, b]) => u(k(a), k(b)));
const g = {}; segs.forEach(s => (g[f(k(s[0]))] ||= []).push(s));
const rects = Object.values(g).map(ss => { const xs = ss.flatMap(s => [s[0].x, s[1].x]), ys = ss.flatMap(s => [s[0].y, s[1].y]); return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; })
  .filter(r => r.x1 - r.x0 > 0.03 && r.y1 - r.y0 > 0.03 && r.x1 - r.x0 < 2 && r.y1 - r.y0 < 2);
// Se fusionan rectángulos superpuestos (la cruz interna a veces queda como otra componente)
const fus = [];
for (const r of rects) { const o = fus.find(q => r.x0 < q.x1 + 0.005 && r.x1 > q.x0 - 0.005 && r.y0 < q.y1 + 0.005 && r.y1 > q.y0 - 0.005); if (o) { o.x0 = Math.min(o.x0, r.x0); o.x1 = Math.max(o.x1, r.x1); o.y0 = Math.min(o.y0, r.y0); o.y1 = Math.max(o.y1, r.y1); } else fus.push({ ...r }); }
const res = {};
for (const r of fus) {
  const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
  const fila = FILAS.find(([, y0]) => cy >= y0 && cy < y0 + 15); if (!fila || cx < 100 || cx > 135) continue;
  (res[fila[0]] ||= []).push({ x0: +(r.x0 - 60).toFixed(3), x1: +(r.x1 - 60).toFixed(3), y0: +(r.y0 - fila[1]).toFixed(3), y1: +(r.y1 - fila[1]).toFixed(3) });
}
for (const [n, l] of Object.entries(res)) console.log(n, l.length, 'pases; medidas:', [...new Set(l.map(r => Math.round((r.x1 - r.x0) * 100) + 'x' + Math.round((r.y1 - r.y0) * 100)))].join(' '));
fs.writeFileSync('pases.json', JSON.stringify(res));
