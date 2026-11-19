const fs = require('fs');
const d = JSON.parse(fs.readFileSync('dxf.json'));
const [y0, filtroW] = [+process.argv[2], process.argv[3]];
const limpiar = s => (s || '').replace(/\\P/g, ' ').replace(/\{|\}|\\[A-Za-z][^;]*;/g, '').replace(/%%C/gi, 'Ø').trim();
const textos = d.entities.filter(e => (e.type === 'MTEXT' || e.type === 'TEXT')).map(e => ({ p: e.position || e.startPoint, t: limpiar(e.text) }));
const dSeg = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy; let t = L ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / L : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy); };
for (const e of d.entities.filter(e => e.type === 'LWPOLYLINE' || e.type === 'POLYLINE')) {
  const v = e.vertices; if (!(v[0].x > 44 && v[0].x < 72 && v[0].y >= y0 && v[0].y < y0 + 15)) continue;
  const w = (e.width || v[0].startWidth || 0).toFixed(3);
  if (filtroW && !filtroW.split(',').includes(w)) continue;
  let L = 0; for (let i = 1; i < v.length; i++) L += Math.hypot(v[i].x - v[i - 1].x, v[i].y - v[i - 1].y);
  const cerca = textos.filter(t => v.some((p, i) => i && dSeg(t.p, v[i - 1], p) < 0.45)).map(t => t.t.slice(0, 40));
  const bul = v.some(p => p.bulge);
  console.log(e.layer.padEnd(18), 'w', w, 'n', v.length, 'L', L.toFixed(2), e.shape ? 'cerrada' : '', bul ? 'arcos' : '', '|', v.map(p => p.x.toFixed(2) + ',' + p.y.toFixed(2)).join(' ').slice(0, 90), '|', cerca.join(' / '));
}
