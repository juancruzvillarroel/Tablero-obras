const d = require('./dxf.json');
const limpiar = s => (s || '').replace(/\\P/g, ' ').replace(/\{|\}|\\[A-Za-z][^;]*;/g, '').trim();
const enPlanta = p => p && p.x > 44 && p.x < 72 && p.y > 60 && p.y < 135;
const tx = d.entities.filter(e => (e.type === 'MTEXT' || e.type === 'TEXT') && enPlanta(e.position || e.startPoint)).map(e => ({ p: e.position || e.startPoint, t: limpiar(e.text) }));
const ppa = tx.filter(t => /\bPPA\b/.test(t.t));
console.log('textos PPA en plantas', ppa.length);
const circ = d.entities.filter(e => e.type === 'CIRCLE' && enPlanta(e.center));
console.log('círculos en plantas', circ.length, [...new Set(circ.map(c => c.layer + ' r' + c.radius.toFixed(3)))].join(' | '));
for (const t of ppa) {
  const c = circ.map(c => ({ c, d: Math.hypot(c.center.x - t.p.x, c.center.y - t.p.y) })).sort((a, b) => a.d - b.d)[0];
  const ins = d.entities.filter(e => e.type === 'INSERT' && enPlanta(e.position)).map(e => ({ n: e.name.replace('ART_IS 1$0$ART_IS-Cloacal$0$', ''), d: Math.hypot(e.position.x - t.p.x, e.position.y - t.p.y) })).sort((a, b) => a.d - b.d)[0];
  console.log('PPA @', t.p.x.toFixed(2), t.p.y.toFixed(2), '| círculo', c ? c.c.layer + ' r' + c.c.radius.toFixed(3) + ' a ' + c.d.toFixed(2) : '-', '| bloque', ins.n, ins.d.toFixed(2));
}
