// Relevamiento de artefactos en las plantas sanitarias: rótulos de texto y bloques de artefactos.
const d = require('./dxf.json');
const limpiar = s => (s || '').replace(/\\P/g, ' ').replace(/\{|\}|\\[A-Za-z][^;]*;/g, '').trim();
const HOJAS = [['PB', 120], ['1°', 105], ['2y3°', 90], ['4°', 75], ['5°', 60]];
const ARTE = /INODORO|BIDET|BACHA|DUCHA|LAVATORIO|PILETA|LAVARROPAS|LAVAJILLAS|^PC$|^BA$|^PL$|LAVADERO|BA[NÑ]ERA/i;
for (const [n, y0] of HOJAS) {
  const en = p => p && p.x > 44 && p.x < 72 && p.y >= y0 && p.y < y0 + 15;
  const tx = d.entities.filter(e => (e.type === 'MTEXT' || e.type === 'TEXT') && en(e.position || e.startPoint)).map(e => ({ t: limpiar(e.text), p: e.position || e.startPoint }));
  const arte = tx.filter(t => ARTE.test(t.t));
  const cuenta = {}; arte.forEach(t => cuenta[t.t] = (cuenta[t.t] || 0) + 1);
  console.log('==', n, JSON.stringify(cuenta));
  const bl = d.entities.filter(e => e.type === 'INSERT' && en(e.position) && /^ca_ba|DESAGUE/.test(e.name));
  for (const b of bl) console.log('   bloque', b.name, b.layer, b.position.x.toFixed(2), b.position.y.toFixed(2), 'rot', b.rotation || 0, 'esc', (b.xScale || 1).toFixed(2), (b.yScale || 1).toFixed(2));
}
