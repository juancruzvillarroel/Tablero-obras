const fs = require('fs');
const d = JSON.parse(fs.readFileSync('dxf.json'));
const BANDAS = [['PB', 120], ['1°', 105], ['2y3°', 90], ['4°', 75], ['5°', 60]];
const banda = p => { const b = BANDAS.find(([, y0]) => p.y >= y0 && p.y < y0 + 15 && p.x > 44 && p.x < 72); return b && b[0]; };
const limpiar = s => (s || '').replace(/\\P/g, ' ').replace(/\{|\}|\\[A-Za-z][^;]*;/g, '').replace(/%%C/gi, 'Ø').trim();
const anchos = {};
for (const e of d.entities.filter(e => e.type === 'LWPOLYLINE' || e.type === 'POLYLINE')) {
  const b = banda(e.vertices[0]); if (!b) continue;
  const w = e.width || e.vertices[0].startWidth || 0;
  const k = `${b} | ${e.layer} | w=${w.toFixed(3)}`;
  anchos[k] = (anchos[k] || 0) + 1;
}
console.log(Object.entries(anchos).sort().map(([k, v]) => v + '  ' + k).join('\n'));
console.log('--- textos');
for (const e of d.entities.filter(e => e.type === 'MTEXT' || e.type === 'TEXT')) {
  const p = e.position || e.startPoint; const b = banda(p); if (!b) continue;
  const t = limpiar(e.text);
  if (/desv|contrapiso|pared|viga|cielorraso|embutid|baja|L =|pend|%|c[aá]mara/i.test(t)) console.log(b, p.x.toFixed(2), p.y.toFixed(2), '|', t);
}
console.log('--- bloques verticales');
const bl = {};
for (const e of d.entities.filter(e => e.type === 'INSERT')) { const b = banda(e.position); if (!b) continue; const k = b + ' | ' + e.name.replace('ART_IS 1$0$ART_IS-Cloacal$0$', '') + ' @' + e.layer; bl[k] = (bl[k] || 0) + 1; }
console.log(Object.entries(bl).sort().map(([k, v]) => v + '  ' + k).join('\n'));
