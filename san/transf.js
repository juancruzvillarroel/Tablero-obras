// Diferencia entre el sistema local del DXF de estructura (modelo.json) y el del SketchUp (tablero-datos.json).
const dx = require('../modelo.json'), sk = require('../skp/tablero-datos.json');
const cen = v => { let x = 0, y = 0, n = 0; for (let i = 0; i < v.length; i += 3) { x += v[i]; y += v[i + 1]; n++; } return [x / n / 100, y / n / 100]; };
const difs = [];
for (const e of sk.elementos.filter(e => e.l === 'sPB' && e.t === 'columna')) {
  const d = dx.elementos.find(z => z.nivel === 'sPB' && z.tipo === 'columna' && z.nombre === e.n); if (!d) continue;
  const [sx, sy] = cen(e.v); const c = d.cajas[0];
  difs.push([e.n, +(sx - c.x).toFixed(3), +(sy - c.y).toFixed(3)]);
}
console.log(difs);
const med = i => { const a = difs.map(d => d[i]).sort((p, q) => p - q); return a[a.length >> 1]; };
console.log('offset mediano', med(1), med(2));
