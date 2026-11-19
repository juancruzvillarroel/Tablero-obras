const fs = require('fs'), sharp = require('../node_modules/sharp');
const { muros } = require('./albanileria.json');
const [piso, out] = process.argv.slice(2);
const x0 = 3, x1 = 26, y0 = 27.5, y1 = 37.5, S = 70;
const X = x => ((x - x0) * S).toFixed(1), Y = y => ((y1 - y) * S).toFixed(1);
const col = { portante12: '#e0f', hueco12: '#0bd', hueco8: '#f80' };
let s = '';
for (const m of muros.filter(m => m.piso === piso)) {
  const path = [m.v, ...m.huecos].map(l => 'M' + l.map(p => X(p[0]) + ',' + Y(p[1])).join('L') + 'Z').join('');
  s += `<path d="${path}" fill="${col[m.tipo]}" fill-rule="evenodd" fill-opacity="${m.cerrada ? .5 : .85}" stroke="#000" stroke-width=".6"/>`;
  const c = m.v.reduce((a, p) => [a[0] + p[0] / m.v.length, a[1] + p[1] / m.v.length], [0, 0]);
  s += `<text x="${X(c[0])}" y="${Y(c[1])}" font-size="9" fill="#000">${m.id.split('-')[1]}${m.cerrada ? '' : '*'}</text>`;
}
fs.writeFileSync(out + '.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="${(x1 - x0) * S}" height="${(y1 - y0) * S}" style="background:#fff">${s}</svg>`);
sharp(out + '.svg').png().toFile(out + '.png').then(() => console.log('ok'));
