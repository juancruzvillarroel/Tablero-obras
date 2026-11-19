// Planta de control de pases de un piso, en coordenadas del modelo.
const fs = require('fs');
const s = JSON.parse(fs.readFileSync('sanitaria.json'));
const [piso, out] = [process.argv[2], process.argv[3]];
const x0 = 2, x1 = 26, y0 = 27.5, y1 = 37.5, S = 60;
const X = x => ((x - x0) * S).toFixed(1), Y = y => ((y1 - y) * S).toFixed(1);
const col = { primaria: '#c00', secundaria: '#e70', pluvial: '#06c', ventilacion: '#0a0', aire: '#a0a' };
let g = [];
for (const t of s.tramos.filter(t => t.piso === piso && t.modo !== 'montante' && t.modo !== 'caida')) {
  const p = []; for (let i = 0; i < t.p.length; i += 3) p.push(X(t.p[i] / 100) + ',' + Y(t.p[i + 1] / 100));
  g.push(`<polyline points="${p.join(' ')}" fill="none" stroke="${col[t.sis]}" stroke-width="${Math.max(1.5, t.d * S)}" stroke-opacity=".55"/>`);
}
for (const p of s.pasesIng.filter(p => p.piso === piso))
  g.push(`<rect x="${X(p.x0)}" y="${Y(p.y1)}" width="${(p.x1 - p.x0) * S}" height="${(p.y1 - p.y0) * S}" fill="none" stroke="${p.usado ? '#888' : '#f0f'}" stroke-width="1.5"/>`);
for (const q of s.pases.filter(p => p.piso === piso)) {
  g.push(`<circle cx="${X(q.x)}" cy="${Y(q.y)}" r="${Math.max(3, q.d / 2 * S)}" fill="${q.ok ? '#0b0' : '#f00'}" fill-opacity=".8"/>`);
  if (!q.ok) g.push(`<text x="${+X(q.x) + 6}" y="${+Y(q.y) - 4}" font-size="10" fill="#f00">${q.origen}/${q.sis}</text>`);
}
for (const k of s.cruces.filter(k => k.piso === s.pisos.find(p => p.id === piso).nombre)) g.push(`<text x="${X(k.x)}" y="${Y(k.y)}" font-size="16" fill="#000">✕${k.viga}</text>`);
fs.writeFileSync(out + '.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="${(x1 - x0) * S}" height="${(y1 - y0) * S}" style="background:#fff">${g.join('')}</svg>`);
require('../node_modules/sharp')(out + '.svg').png().toFile(out + '.png').then(() => console.log('ok'));
