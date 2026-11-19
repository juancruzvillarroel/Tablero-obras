// Busca los círculos de referencia de bajadas (polilínea cerrada con arcos) y el número escrito al lado.
const fs = require('fs');
const d = JSON.parse(fs.readFileSync('dxf.json'));
const limpiar = s => (s || '').replace(/\\P/g, ' ').replace(/\{|\}|\\[A-Za-z][^;]*;/g, '').replace(/%%C/gi, 'Ø').trim();
const HOJAS = [['PB', 120], ['1°', 105], ['2y3°', 90], ['4°', 75], ['5°', 60]];
const textos = d.entities.filter(e => e.type === 'TEXT' || e.type === 'MTEXT').map(e => ({ p: e.position || e.startPoint, t: limpiar(e.text), l: e.layer, h: e.height || e.textHeight }));
for (const [n, y0] of HOJAS) {
  const marcas = d.entities.filter(e => (e.type === 'LWPOLYLINE') && e.shape && e.vertices.some(v => v.bulge) && e.vertices[0].x > 44 && e.vertices[0].x < 72 && e.vertices[0].y >= y0 && e.vertices[0].y < y0 + 15);
  console.log('==', n);
  for (const m of marcas) {
    const c = { x: (m.vertices[0].x + m.vertices[1].x) / 2, y: (m.vertices[0].y + m.vertices[1].y) / 2 };
    const num = textos.filter(t => /^\d+$/.test(t.t) && Math.hypot(t.p.x - c.x, t.p.y - c.y) < 0.5).map(t => t.t + '@' + t.p.x.toFixed(2) + ',' + t.p.y.toFixed(2));
    const desc = textos.filter(t => /CDV|CV|PVC/.test(t.t) && Math.hypot(t.p.x - c.x, t.p.y - c.y) < 1.6).map(t => t.t);
    console.log(m.layer.padEnd(16), 'centro', c.x.toFixed(2), c.y.toFixed(2), '| n°', num.join(' '), '|', desc.join(' / '));
  }
  // números sueltos (sin círculo): las referencias de ventilación y pluvial son un número con una raya
  const sueltos = textos.filter(t => /^\d+$/.test(t.t) && t.p.x > 44 && t.p.x < 72 && t.p.y >= y0 && t.p.y < y0 + 15);
  console.log('   números:', sueltos.map(t => t.t + '(' + t.l + ')@' + t.p.x.toFixed(2) + ',' + t.p.y.toFixed(2)).join('  '));
}
