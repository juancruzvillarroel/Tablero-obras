// Albañilería a partir de las plantas de arquitectura (imágenes): los muros son el relleno gris.
// Se arma una máscara de gris, se la descompone en rectángulos (muros ortogonales) y cada rectángulo es un muro
// con espesor, largo y alto. Calibración igual que los artefactos: 84,6 px/m, C14 y medianera superior.
const fs = require('fs');
const sharp = require('../node_modules/sharp');
const S = 84.6;
const aM = (px, py, top) => [10.835 + (px - 737.5) / S, 36.40 - (py - top) / S];
const tab = JSON.parse(fs.readFileSync('../skp/tablero-datos.json'));
const Z = Object.fromEntries(tab.niveles.map(n => [n.id, n.z]));
const cajaDe = v => { const b = [[1e9, -1e9], [1e9, -1e9], [1e9, -1e9]]; for (let i = 0; i < v.length; i += 3) for (let k = 0; k < 3; k++) { const c = v[i + k] / 100; b[k][0] = Math.min(b[k][0], c); b[k][1] = Math.max(b[k][1], c); } return b; };
const EST = tab.elementos.map(e => ({ n: e.n, t: e.t, l: e.l, b: cajaDe(e.v) }));
// Fondo de la losa (o viga) de arriba en un punto: el muro llega hasta ahí.
function techoEn(nivel, x, y) {
  let z = Infinity;
  for (const e of EST) if (e.l === nivel && (e.t === 'losa' || e.t === 'viga' || e.t === 'escalera') && x >= e.b[0][0] - 0.02 && x <= e.b[0][1] + 0.02 && y >= e.b[1][0] - 0.02 && y <= e.b[1][1] + 0.02) z = Math.min(z, e.b[2][0]);
  return z;
}
const PLANTAS = [
  { id: 'PB', img: '1', archivo: '4.webp', top: 394, piso: 0, techo: 'sPB', nombre: 'Planta baja' },
  { id: 'P1', archivo: '1.webp', top: 393, piso: Z.sPB, techo: 's1', nombre: '1° piso' },
  { id: 'P2', archivo: '1.webp', top: 393, piso: Z.s1, techo: 's2', nombre: '2° piso' },
  { id: 'P3', archivo: '1.webp', top: 393, piso: Z.s2, techo: 's3', nombre: '3° piso' },
  { id: 'P4', archivo: '2.webp', top: 389, piso: Z.s3, techo: 's4', nombre: '4° piso' },
  { id: 'P5', archivo: '3.webp', top: 390, piso: Z.s4, techo: 's5', nombre: 'Azotea' },
];

async function rectangulos(archivo) {
  const { data, info } = await sharp('../../images/' + archivo).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;
  const m = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * C, r = data[i], g = data[i + 1], b = data[i + 2];
    if (Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && r >= 150 && r <= 182) m[y * W + x] = 1;
  }
  // Se limpia el ruido de antialias: un píxel queda si tiene al menos 5 vecinos grises (3x3).
  const m2 = new Uint8Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (!m[y * W + x]) continue; let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) n += m[(y + dy) * W + x + dx];
    if (n >= 4) m2[y * W + x] = 1;
  }
  // Corridas horizontales fusionadas hacia abajo -> rectángulos
  const abiertos = new Map(), rects = [];
  for (let y = 0; y < H; y++) {
    const corr = []; let x = 0;
    while (x < W) { if (m2[y * W + x]) { const a = x; while (x < W && m2[y * W + x]) x++; corr.push([a, x - 1]); } else x++; }
    const nuevos = new Map();
    for (const [a, b] of corr) { const k = a + ',' + b; const r = abiertos.get(k); if (r && r.y1 === y - 1) { r.y1 = y; nuevos.set(k, r); } else { const n = { x0: a, x1: b, y0: y, y1: y }; rects.push(n); nuevos.set(k, n); } }
    abiertos.clear(); nuevos.forEach((v, k) => abiertos.set(k, v));
  }
  // Fusión horizontal de rectángulos con el mismo alto que se tocan
  let cambio = true;
  while (cambio) {
    cambio = false;
    for (let i = 0; i < rects.length && !cambio; i++) for (let j = 0; j < rects.length; j++) {
      const a = rects[i], b = rects[j]; if (i === j) continue;
      if (a.y0 === b.y0 && a.y1 === b.y1 && b.x0 === a.x1 + 1) { a.x1 = b.x1; rects.splice(j, 1); cambio = true; break; }
    }
  }
  return rects.filter(r => Math.min(r.x1 - r.x0 + 1, r.y1 - r.y0 + 1) >= 4 && Math.max(r.x1 - r.x0 + 1, r.y1 - r.y0 + 1) >= 9);
}

(async () => {
  const cache = {}, muros = [];
  for (const P of PLANTAS) {
    const rects = cache[P.archivo] ||= await rectangulos(P.archivo);
    // Estructura del nivel: columnas y tabiques del piso (están pintados igual que los muros en la planta)
    const nivEst = { PB: 'sPB', P1: 's1', P2: 's2', P3: 's3', P4: 's4', P5: 's5' }[P.id];
    const cols = EST.filter(e => (e.t === 'columna' || e.t === 'tabique') && e.l === nivEst);
    let n = 0;
    for (const r of rects) {
      const [xa, ya] = aM(r.x0, r.y1 + 1, P.top), [xb, yb] = aM(r.x1 + 1, r.y0, P.top);
      const x0 = Math.min(xa, xb), x1 = Math.max(xa, xb), y0 = Math.min(ya, yb), y1 = Math.max(ya, yb);
      // El relleno gris no incluye el contorno negro del muro (~1 px por lado): se suma al espesor.
      const w = x1 - x0, d = y1 - y0, esp = Math.min(w, d) + 2 / S, largo = Math.max(w, d);
      if (esp < 0.06 || largo < 0.1) continue;
      // Si más de la mitad del rectángulo es una columna o tabique de H°A, no es albañilería.
      const area = w * d;
      const sup = cols.reduce((a, c) => a + Math.max(0, Math.min(x1, c.b[0][1]) - Math.max(x0, c.b[0][0])) * Math.max(0, Math.min(y1, c.b[1][1]) - Math.max(y0, c.b[1][0])), 0);
      if (sup > 0.5 * area) continue;
      // Espesor normalizado a los muros habituales
      const e = esp < 0.12 ? 0.10 : esp < 0.175 ? 0.15 : esp < 0.25 ? 0.20 : 0.30;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      let zTop = techoEn(P.techo, cx, cy);
      if (!isFinite(zTop) || zTop - P.piso > 4) zTop = P.piso + (P.id === 'P5' ? 2.0 : 2.6);   // sin losa arriba: muro de azotea
      const alto = zTop - P.piso;
      if (alto < 0.5) continue;
      muros.push({ piso: P.id, nombre: `M-${P.id}-${String(++n).padStart(2, '0')}`, x0, x1, y0, y1, esp: e, largo, alto, z0: P.piso, z1: zTop, sinLosa: zTop === P.piso + (P.id === 'P5' ? 2.0 : 2.6) });
    }
  }
  const r3 = v => Math.round(v * 1000) / 1000;
  const out = muros.map(m => ({ ...m, x0: r3(m.x0), x1: r3(m.x1), y0: r3(m.y0), y1: r3(m.y1), largo: r3(m.largo), alto: r3(m.alto), z0: r3(m.z0), z1: r3(m.z1), sup: r3(m.largo * m.alto), vol: r3(m.largo * m.alto * m.esp) }));
  fs.writeFileSync('albanileria.json', JSON.stringify({ muros: out, pisos: PLANTAS.map(p => ({ id: p.id, nombre: p.nombre, z: p.piso })) }));
  const res = {}; out.forEach(m => { const k = m.piso + ' e' + Math.round(m.esp * 100); res[k] ||= [0, 0]; res[k][0]++; res[k][1] += m.sup; });
  for (const k of Object.keys(res).sort()) console.log(k.padEnd(10), res[k][0], 'muros', res[k][1].toFixed(1), 'm²');
})();
