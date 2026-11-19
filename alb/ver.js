// Dibuja los muros por capa sobre una banda (con relleno) para revisar
const fs = require('fs'), sharp = require('../node_modules/sharp');
const d = require('./muros.json');
const [y0, out] = [+process.argv[2], process.argv[3]];
const x0 = 45, x1 = 68, S = 70, Y1 = y0 + 13;
const X = x => ((x - x0) * S).toFixed(1), Y = y => ((Y1 - y) * S).toFixed(1);
const col = { '1.3 LAD 12 PORTANTE': '#e0f', '1.2 LAD 12': '#0bd', '1.1 LAD 8': '#f80', '1.4 ESTRUCTURA': '#888' };
let s = '';
for (const e of d.entities.filter(e => e.type === 'LWPOLYLINE' && col[e.layer] && e.vertices[0].y >= y0 && e.vertices[0].y < y0 + 15)) {
  const pts = e.vertices.map(v => X(v.x) + ',' + Y(v.y)).join(' ');
  s += `<poly${e.shape ? 'gon' : 'line'} points="${pts}" fill="${e.shape ? col[e.layer] : 'none'}" fill-opacity=".45" stroke="${col[e.layer]}" stroke-width="1"/>`;
}
fs.writeFileSync(out + '.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="${(x1 - x0) * S}" height="${13 * S}" style="background:#fff">${s}</svg>`);
sharp(out + '.svg').png().toFile(out + '.png').then(() => console.log('ok'));
