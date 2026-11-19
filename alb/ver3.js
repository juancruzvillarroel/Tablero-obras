const fs = require('fs'), sharp = require('../node_modules/sharp');
const { muros } = require('./albanileria.json');
const [piso, out] = process.argv.slice(2);
const x0 = 3, x1 = 26, y0 = 27.5, y1 = 37.5, S = 70;
const X = x => ((x - x0) * S).toFixed(1), Y = y => ((y1 - y) * S).toFixed(1);
const col = { portante12: '#e0f', hueco12: '#0bd', hueco8: '#f80' };
let s = '';
for (const m of muros.filter(m => m.piso === piso)) {
  for (const r of m.cajas) s += `<rect x="${X(r[0])}" y="${Y(r[3])}" width="${((r[2] - r[0]) * S).toFixed(1)}" height="${((r[3] - r[1]) * S).toFixed(1)}" fill="${col[m.tipo]}" fill-opacity=".75"/>`;
  const c = m.cajas[0]; s += `<text x="${X(c[0])}" y="${Y(c[3]) - 2}" font-size="9">${m.id.split('-')[1]}</text>`;
}
fs.writeFileSync(out + '.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="${(x1 - x0) * S}" height="${(y1 - y0) * S}" style="background:#fff">${s}</svg>`);
sharp(out + '.svg').png().toFile(out + '.png').then(() => console.log('ok'));
