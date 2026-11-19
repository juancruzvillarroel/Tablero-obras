// Superpone una banda de la sanitaria con una planta del ingeniero desplazada.
// uso: node superponer.js x0 y0 x1 y1 dxEst dyEst salida [escala]
const fs = require('fs');
const san = JSON.parse(fs.readFileSync('dxf.json'));
const est = JSON.parse(fs.readFileSync('../dxf.json'));
const [x0, y0, x1, y1, dx, dy] = process.argv.slice(2, 8).map(Number);
const out = process.argv[8], S = +(process.argv[9] || 60);
const X = x => ((x - x0) * S).toFixed(1), Y = y => ((y1 - y) * S).toFixed(1);
const inb = p => p && p.x >= x0 - 1 && p.x <= x1 + 1 && p.y >= y0 - 1 && p.y <= y1 + 1;
const colS = l => ({ 'CLOACA PRIMARA': '#c00', 'CL_PRIMARIA': '#c00', 'CLOACA SECUNDARIA': '#e70', 'PLUVIAL': '#06c', 'VENTILACIÓN': '#0a0', 'VENTILACIONES': '#0a0', 'TEXTOS': '#222' }[l] || '#777');
const colE = l => ({ PILAR_HORMIGON: '#999', VIG_CARAS: '#bbb', MUR_CARAS_HORMIGON: '#999', PASES: '#a0a' }[l]);
let s = [];
function dib(e, c, ox, oy, w) {
  const tr = p => ({ x: p.x + ox, y: p.y + oy });
  if (e.type === 'LINE') { const a = tr(e.vertices[0]), b = tr(e.vertices[1]); if (!inb(a) && !inb(b)) return; s.push(`<line x1="${X(a.x)}" y1="${Y(a.y)}" x2="${X(b.x)}" y2="${Y(b.y)}" stroke="${c}" stroke-width="${w}"/>`); }
  else if (e.vertices && (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE')) {
    const v = e.vertices.map(tr); if (!v.some(inb)) return;
    const ancho = e.width || e.vertices[0].startWidth || 0;
    s.push(`<poly${e.shape ? 'gon' : 'line'} points="${v.map(p => X(p.x) + ',' + Y(p.y)).join(' ')}" fill="none" stroke="${c}" stroke-width="${ancho ? Math.max(1, ancho * S) : w}" stroke-opacity="${ancho ? .6 : 1}"/>`);
  } else if (e.type === 'CIRCLE') { const p = tr(e.center); if (!inb(p)) return; s.push(`<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${e.radius * S}" fill="none" stroke="${c}" stroke-width="${w}"/>`); }
  else if (e.type === 'ARC') { const p = tr(e.center); if (!inb(p)) return; s.push(`<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${e.radius * S}" fill="none" stroke="${c}" stroke-width="${w}" stroke-dasharray="2 2"/>`); }
  else if ((e.type === 'TEXT' || e.type === 'MTEXT') && c !== null) {
    const p = tr(e.startPoint || e.position); if (!inb(p)) return;
    const t = (e.text || '').replace(/\\P/g, ' ').replace(/\{|\}|\\[A-Za-z][^;]*;/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    s.push(`<text x="${X(p.x)}" y="${Y(p.y)}" font-size="${Math.max(9, (e.height || e.textHeight || .1) * S)}" fill="${c}">${t}</text>`);
  } else if (e.type === 'INSERT') { const p = tr(e.position); if (!inb(p)) return; s.push(`<rect x="${X(p.x) - 3}" y="${Y(p.y) - 3}" width="6" height="6" fill="${c}"/>`); }
}
for (const e of est.entities) { const c = colE(e.layer); if (c && e.type !== 'TEXT' && e.type !== 'MTEXT') dib(e, c, dx, dy, 1); }
for (const e of est.entities) if (e.layer === 'COLUMNA_REF' || e.layer === 'VIG_DIM_VIGAS') dib(e, '#aaa', dx, dy, 1);
for (const e of san.entities) dib(e, colS(e.layer), 0, 0, 1.4);
fs.writeFileSync(out + '.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="${(x1 - x0) * S}" height="${(y1 - y0) * S}" style="background:#fff">${s.join('')}</svg>`);
require('../node_modules/sharp')(out + '.svg').png().toFile(out + '.png').then(() => console.log('ok'));
