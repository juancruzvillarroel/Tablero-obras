const fs = require('fs'); const P = require('../node_modules/dxf-parser');
const d = new P().parseSync(fs.readFileSync('muros.dxf', 'utf8'));
fs.writeFileSync('muros.json', JSON.stringify(d));
const capas = d.tables && d.tables.layer ? d.tables.layer.layers : {};
const c = {};
for (const e of d.entities) { const k = `${e.layer} | ${e.type} | color ${e.colorIndex ?? '-'}${e.color != null ? ' (' + e.color.toString(16) + ')' : ''}`; c[k] = (c[k] || 0) + 1; }
console.log('entidades', d.entities.length);
Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 60).forEach(([k, v]) => console.log(String(v).padStart(5), k));
console.log('--- capas con color');
for (const [n, l] of Object.entries(capas)) console.log(n.padEnd(30), 'color', l.colorIndex, (l.color || 0).toString(16), l.frozen ? 'congelada' : '', l.visible === false ? 'apagada' : '');
let x = [1e9, -1e9], y = [1e9, -1e9];
d.entities.forEach(e => { const p = (e.vertices && e.vertices[0]) || e.position || e.startPoint || e.center; if (!p) return; x = [Math.min(x[0], p.x), Math.max(x[1], p.x)]; y = [Math.min(y[0], p.y), Math.max(y[1], p.y)]; });
console.log('extensión', x, y);
