// Albañilería desde RICH_ALB_MUROS (DXF). Método por recintos en grilla de 1 cm:
// todas las líneas de muros y de estructura son bordes; cada recinto cerrado angosto (≤ 20 cm) es un muro,
// y su tipo sale de la capa de las líneas que lo rodean. Así se respetan los filos dibujados aunque los contornos
// estén abiertos, y los nichos o ambientes (recintos anchos) no se confunden con muros.
const fs = require('fs');
const d = require('./muros.json');
const tab = JSON.parse(fs.readFileSync('../skp/tablero-datos.json'));
const Z = Object.fromEntries(tab.niveles.map(n => [n.id, n.z]));
const CAPAS = ['1.4 ESTRUCTURA', '1.3 LAD 12 PORTANTE', '1.2 LAD 12', '1.1 LAD 8'];
const TIPOS = [null, { tipo: 'portante12', nombre: 'Ladrillo portante 12', esp: 0.15 }, { tipo: 'hueco12', nombre: 'Ladrillo hueco 12', esp: 0.15 }, { tipo: 'hueco8', nombre: 'Ladrillo hueco 8', esp: 0.10 }];
const BANDAS = [
  { y0: 105, pisos: [{ id: 'PB', z: 0, techo: 'sPB' }] },
  { y0: 90, pisos: [{ id: 'P1', z: Z.sPB, techo: 's1' }, { id: 'P2', z: Z.s1, techo: 's2' }, { id: 'P3', z: Z.s2, techo: 's3' }] },
  { y0: 75, pisos: [{ id: 'P4', z: Z.s3, techo: 's4' }] },
  { y0: 60, pisos: [{ id: 'P5', z: Z.s4, techo: 's5', libre: 2.0 }] },
  { y0: 45, pisos: [{ id: 'SM', z: Z.s5, techo: 'sSM' }] },
];
const R = 0.01, GX0 = 46.4, GX1 = 66.6;
const aM = (x, y, y0) => [x - 41.511, y - y0 + 25.589];

// --- fondo de losa/viga sobre un punto (para la altura del muro) ---
const TRI = {};
for (const e of tab.elementos.filter(e => ['losa', 'viga', 'escalera'].includes(e.t))) {
  const v = e.v, L = TRI[e.l] ||= [];
  for (let i = 0; i < v.length; i += 9) { const t = [0, 3, 6].map(o => [v[i + o] / 100, v[i + o + 1] / 100, v[i + o + 2] / 100]); L.push({ t, x0: Math.min(...t.map(p => p[0])), x1: Math.max(...t.map(p => p[0])), y0: Math.min(...t.map(p => p[1])), y1: Math.max(...t.map(p => p[1])) }); }
}
function fondoEn(nivel, x, y) {
  let z = Infinity;
  for (const { t, x0, x1, y0, y1 } of TRI[nivel] || []) {
    if (x < x0 || x > x1 || y < y0 || y > y1) continue;
    const [a, b, c] = t, den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]); if (Math.abs(den) < 1e-12) continue;
    const l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / den, l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / den, l3 = 1 - l1 - l2;
    if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
    z = Math.min(z, l1 * a[2] + l2 * b[2] + l3 * c[2]);
  }
  return z;
}

const muros = [], avisos = [];
for (const B of BANDAS) {
  const W = Math.round((GX1 - GX0) / R), H = Math.round(15 / R);
  const capa = new Int8Array(W * H).fill(-1);          // -1 vacío; 0..3 línea de esa capa
  const gx = x => Math.round((x - GX0) / R), gy = y => Math.round((y - B.y0) / R);
  const trazar = (a, b, k) => { const n = Math.ceil(Math.max(Math.abs(gx(b.x) - gx(a.x)), Math.abs(gy(b.y) - gy(a.y)))) + 1; for (let i = 0; i <= n; i++) { const x = gx(a.x + (b.x - a.x) * i / n), y = gy(a.y + (b.y - a.y) * i / n); if (x >= 0 && y >= 0 && x < W && y < H) { const j = y * W + x; if (capa[j] < 0 || k > 0) capa[j] = k; } } };
  for (const e of d.entities.filter(e => e.type === 'LWPOLYLINE' && CAPAS.includes(e.layer) && e.vertices[0].y >= B.y0 && e.vertices[0].y < B.y0 + 15)) {
    const k = CAPAS.indexOf(e.layer), v = e.vertices;
    for (let i = 1; i < v.length; i++) trazar(v[i - 1], v[i], k);
    const c = Math.hypot(v[0].x - v[v.length - 1].x, v[0].y - v[v.length - 1].y);
    if (e.shape || c <= 0.2) trazar(v[v.length - 1], v[0], k);   // cierre corto: el filo contra otro muro
  }
  // Distancia de cada celda vacía a la línea más cercana (chamfer 3-4, en tercios de cm)
  const dist = new Uint16Array(W * H);
  for (let i = 0; i < W * H; i++) dist[i] = capa[i] >= 0 ? 0 : 60000;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!dist[i]) continue; let m = dist[i]; if (x) m = Math.min(m, dist[i - 1] + 3); if (y) { m = Math.min(m, dist[i - W] + 3); if (x) m = Math.min(m, dist[i - W - 1] + 4); if (x < W - 1) m = Math.min(m, dist[i - W + 1] + 4); } dist[i] = m; }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (!dist[i]) continue; let m = dist[i]; if (x < W - 1) m = Math.min(m, dist[i + 1] + 3); if (y < H - 1) { m = Math.min(m, dist[i + W] + 3); if (x < W - 1) m = Math.min(m, dist[i + W + 1] + 4); if (x) m = Math.min(m, dist[i + W - 1] + 4); } dist[i] = m; }
  // Recintos (4-conectados)
  const comp = new Int32Array(W * H).fill(-1); let nc = 0; const info = [];
  for (let s = 0; s < W * H; s++) {
    if (capa[s] >= 0 || comp[s] >= 0) continue;
    const pila = [s]; comp[s] = nc; const celdas = []; let borde = false, dmax = 0; const votos = [0, 0, 0, 0];
    while (pila.length) {
      const i = pila.pop(); celdas.push(i); const x = i % W, y = (i / W) | 0;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) borde = true;
      dmax = Math.max(dmax, dist[i]);
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (j < 0) continue;
        if (capa[j] >= 0) { votos[capa[j]]++; continue; }
        if (comp[j] < 0) { comp[j] = nc; pila.push(j); }
      }
    }
    info.push({ celdas, borde, dmax, votos }); nc++;
  }
  // Muros: recintos cerrados, angostos (medio espesor ≤ 10,5 cm) y no rodeados por estructura
  for (const c of info) {
    if (c.borde || c.celdas.length < 40) continue;
    const anchoMax = c.dmax / 3 * 2 * R;                         // espesor del recinto (m)
    if (anchoMax > 0.215 || anchoMax < 0.05) continue;
    const k = [1, 2, 3].sort((a, b) => c.votos[b] - c.votos[a])[0];
    if (c.votos[0] > c.votos[k]) continue;                       // recinto de estructura (columna, tabique H°A)
    const T = TIPOS[k];
    // Rectángulos por corridas. El filo del muro es el eje de la línea dibujada, que ocupa la celda vecina: se suma una
    // celda entera por lado (con media celda el muro salía 1 cm más corto y 1 cm más fino que en el CAD).
    const filas = new Map();
    for (const i of c.celdas) { const y = (i / W) | 0; (filas.get(y) || filas.set(y, []).get(y)).push(i % W); }
    const rects = [], abiertos = new Map(); let prev = null;
    for (const y of [...filas.keys()].sort((a, b) => a - b)) {
      const xs = filas.get(y).sort((a, b) => a - b), corr = []; let a = xs[0], p = xs[0];
      for (const x of xs.slice(1)) { if (x !== p + 1) { corr.push([a, p]); a = x; } p = x; } corr.push([a, p]);
      const nuevos = new Map();
      for (const [a0, a1] of corr) { const kk = a0 + ',' + a1, r = abiertos.get(kk); if (r && prev === y - 1) { r.y1 = y; nuevos.set(kk, r); } else { const n = { x0: a0, x1: a1, y0: y, y1: y }; rects.push(n); nuevos.set(kk, n); } }
      abiertos.clear(); nuevos.forEach((v, kk) => abiertos.set(kk, v)); prev = y;
    }
    // Un recinto rectangular más grueso que el muro de su capa no es un muro: es un nicho (ej. el del equipo de aire) o
    // el hueco vacío que queda entre dos muros (ej. entre el muro en L y el portante en las esquinas de los pisos 1 a 4).
    // Se mira el rectángulo que lo encierra y no la cantidad de rectángulos: cuando una línea del CAD está corrida 1 cm,
    // el recinto se parte en dos rectángulos y antes se escapaba de esta regla y se contaba como muro.
    { const x0 = Math.min(...rects.map(r => r.x0)), x1 = Math.max(...rects.map(r => r.x1)), y0 = Math.min(...rects.map(r => r.y0)), y1 = Math.max(...rects.map(r => r.y1));
      const lleno = c.celdas.length / ((x1 - x0 + 1) * (y1 - y0 + 1));
      if (lleno > 0.9 && (Math.min(x1 - x0, y1 - y0) + 2) * R > T.esp + 0.04) {
        const [ax, ay] = aM(GX0 + (x0 - 1) * R, B.y0 + (y0 - 1) * R, B.y0), [bx, by] = aM(GX0 + (x1 + 1) * R, B.y0 + (y1 + 1) * R, B.y0);
        avisos.push(`Hueco o nicho descartado en ${B.pisos.map(p => p.id).join('/')}: x ${ax.toFixed(2)}–${bx.toFixed(2)}, y ${ay.toFixed(2)}–${by.toFixed(2)}`); continue; } }
    for (const P of B.pisos) {
      const cajas = rects.map(r => { const [ax, ay] = aM(GX0 + (r.x0 - 1) * R, B.y0 + (r.y0 - 1) * R, B.y0), [bx, by] = aM(GX0 + (r.x1 + 1) * R, B.y0 + (r.y1 + 1) * R, B.y0); return [ax, ay, bx, by].map(v => +v.toFixed(3)); });
      const planta = cajas.reduce((a, r) => a + (r[2] - r[0]) * (r[3] - r[1]), 0);
      // altura: valor más repetido del fondo de estructura sobre el muro
      // Si la estructura de arriba cubre al menos un tercio de los puntos del muro, manda ella aunque sea más angosta
      // que el muro (ej. la viga V716 de 15 cm sobre el muro de 14 cm de la sala de máquinas, corrida unos centímetros).
      const tops = {}, libres = {}; let nHit = 0, nTot = 0;
      for (const r of cajas) for (let x = r[0] + 0.02; x < r[2]; x += 0.1) for (let y = r[1] + 0.02; y < r[3]; y += 0.1) {
        let z = fondoEn(P.techo, x, y), hit = true; if (!isFinite(z) || z - P.z > 4 || z <= P.z + 0.3) { z = P.z + (P.libre || 2.6); hit = false; }
        const kk = Math.round(z * 100); nTot++; if (hit) { nHit++; tops[kk] = (tops[kk] || 0) + 1; } else libres[kk] = (libres[kk] || 0) + 1;
      }
      if (nHit < nTot / 3) for (const k in libres) tops[k] = (tops[k] || 0) + libres[k] + nTot;
      const top = Object.keys(tops).length ? +Object.entries(tops).sort((a, b) => b[1] - a[1])[0][0] / 100 : P.z + (P.libre || 2.6);
      const alto = top - P.z, largo = planta / T.esp;
      muros.push({ piso: P.id, tipo: T.tipo, nombreTipo: T.nombre, esp: T.esp, espDib: +anchoMax.toFixed(3), cajas, z0: +P.z.toFixed(3), z1: +top.toFixed(3), alto: +alto.toFixed(3),
        planta: +planta.toFixed(4), largo: +largo.toFixed(2), sup: +(largo * alto).toFixed(2), vol: +(planta * alto).toFixed(3), sinLosa: !!P.libre && Math.abs(alto - P.libre) < 0.01 });
    }
  }
}
// Nombres por piso, de adelante hacia el fondo
const porPiso = {};
for (const m of muros.sort((a, b) => a.piso.localeCompare(b.piso) || a.cajas[0][0] - b.cajas[0][0] || a.cajas[0][1] - b.cajas[0][1])) { porPiso[m.piso] = (porPiso[m.piso] || 0) + 1; m.id = `${m.piso}-${String(porPiso[m.piso]).padStart(2, '0')}`; m.nombre = 'M-' + m.id; }
fs.writeFileSync('albanileria.json', JSON.stringify({ muros, avisos }));
const res = {}; muros.forEach(m => { const k = m.piso.padEnd(3) + ' ' + m.tipo; res[k] ||= [0, 0, 0]; res[k][0]++; res[k][1] += m.sup; res[k][2] += m.alto; });
for (const k of Object.keys(res).sort()) console.log(k.padEnd(16), String(res[k][0]).padStart(3), 'muros', res[k][1].toFixed(1).padStart(7), 'm²', ' alto medio', (res[k][2] / res[k][0]).toFixed(2));
console.log('total', muros.length, 'muros', muros.reduce((a, m) => a + m.sup, 0).toFixed(1), 'm²');
const espRaros = muros.filter(m => Math.abs(m.espDib - m.esp) > 0.04); console.log('espesor dibujado distinto del nominal:', espRaros.length, espRaros.slice(0, 6).map(m => m.id + ' ' + m.tipo + ' ' + m.espDib).join(', '));
