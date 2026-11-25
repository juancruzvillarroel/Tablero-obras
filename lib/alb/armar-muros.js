// Albañilería de Libertador 3174 desde LIB_ALB_MUROS (DXF): cada polilínea de una capa de muro es UN muro, recto y en
// una sola dirección, tal cual está dibujado (en este CAD no hay muros unidos en L o en T). Por eso no se usa la
// grilla de recintos de Argerich: se lee cada contorno directo y se mide sobre él.
// - Largo: lo que mide el contorno sobre su lado largo. Espesor: superficie del contorno / largo.
// - Medianeras que no están a escuadra (se tuercen unos centímetros en varios metros): se dibujan como una caja
//   alineada con los ejes, centrada en el muro, con su largo y su espesor reales.
// - Algunos muros quedaron partidos en dos polilíneas abiertas de 3 puntos: se juntan las que comparten vértices.
// - Contornos de menos de 3 cm de espesor son restos de dibujo y no se cuentan (se avisan).
// Las plantas están apiladas en el CAD cada 35 m; se ubican sobre el modelo con el corrimiento que hace coincidir
// las caras de los muros con las de las columnas (calculado al cargar el archivo: x −121,138; y −13,483 − 35 × planta).
const fs = require('fs');
const d = require('./muros.json');
const tab = JSON.parse(fs.readFileSync('../tablero-datos.json'));
const Z = Object.fromEntries(tab.niveles.map(n => [n.id, n.z]));

const CAPAS = {
  'LIB. Muro 8cm': { tipo: 'hueco8', nombre: 'Ladrillo hueco 8', esp: 0.08 },
  '0. Muro 8cm': { tipo: 'hueco8', nombre: 'Ladrillo hueco 8', esp: 0.08 },
  'LIB. Muro 12cm': { tipo: 'hueco12', nombre: 'Ladrillo hueco 12', esp: 0.12 },
  'LIB. Muro 12cm Portante': { tipo: 'portante12', nombre: 'Ladrillo portante 12', esp: 0.12 },
  'LIB. Muro 18cm': { tipo: 'hueco18', nombre: 'Ladrillo hueco 18', esp: 0.18 },
};
// Plantas del CAD de abajo hacia arriba. Alto libre: el que usa el CAD en sus notas de superficie (×3 en PB,
// ×2,70 en los pisos, ×0,50 en las cargas del techo de la sala de máquinas) para los muros sin losa encima.
const DX = -121.138, DY0 = -13.483, PASO = 35;
const PISOS = [
  { id: 'PB', nivel: 'sPB', nombre: 'Planta baja', z: Z.base + 2.43, techo: 'sPB', libre: 3.0 },
  { id: 'P1', nivel: 's1', nombre: '1° piso', z: Z.sPB, techo: 's1', libre: 2.7 },
  { id: 'P2', nivel: 's2', nombre: '2° piso', z: Z.s1, techo: 's2', libre: 2.7 },
  { id: 'P3', nivel: 's3', nombre: '3° piso', z: Z.s2, techo: 's3', libre: 2.7 },
  { id: 'AZ', nivel: 'sSM', nombre: 'Azotea y sala de máquinas', z: Z.s3, techo: 'sSM', libre: 2.7 },
  { id: 'TSM', nivel: 'sSM', nombre: 'Techo de sala de máquinas', z: Z.sSM, techo: null, libre: 0.5 },
];
// La losa sobre terreno de PB está a −0,07 (Z.base es el fondo de fundación, −2,50)
PISOS[0].z = -0.07;

// --- fondo de losa o viga sobre un punto (para la altura del muro) ---
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

// --- geometría de cada contorno ---
const igual = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.002;
function limpiar(v) { const o = []; for (const p of v) if (!o.length || !igual(o.at(-1), p)) o.push(p); while (o.length > 1 && igual(o[0], o.at(-1))) o.pop(); return o; }
function casco(P) { // envolvente convexa (monotone chain)
  const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = []; for (const q of p) { while (lo.length >= 2 && cr(lo.at(-2), lo.at(-1), q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.slice().reverse()) { while (hi.length >= 2 && cr(hi.at(-2), hi.at(-1), q) <= 0) hi.pop(); hi.push(q); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
const area = v => Math.abs(v.reduce((a, p, i) => { const q = v[(i + 1) % v.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
const cruzado = v => { // polígono que se corta a sí mismo
  const seg = (a, b, c, e) => { const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b, c) * o(a, b, e) < 0 && o(c, e, a) * o(c, e, b) < 0; };
  for (let i = 0; i < v.length; i++) for (let j = i + 2; j < v.length; j++) { if (i === 0 && j === v.length - 1) continue; if (seg(v[i], v[(i + 1) % v.length], v[j], v[(j + 1) % v.length])) return true; }
  return false;
};
// Medida de un muro: la dirección es la del lado más largo del contorno; el largo, la extensión de los vértices
// sobre esa dirección; el espesor, la superficie dividida por el largo.
function medir(v) {
  let best = null; for (let i = 0; i < v.length; i++) { const a = v[i], b = v[(i + 1) % v.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (!best || L > best.L) best = { L, ux: (b[0] - a[0]) / L, uy: (b[1] - a[1]) / L }; }
  const { ux, uy } = best, s = v.map(p => p[0] * ux + p[1] * uy), n = v.map(p => -p[0] * uy + p[1] * ux);
  const largo = Math.max(...s) - Math.min(...s), A = area(v), esp = A / largo, ancho = Math.max(...n) - Math.min(...n);
  const cx = v.reduce((a, p) => a + p[0], 0) / v.length, cy = v.reduce((a, p) => a + p[1], 0) / v.length;
  // centro del muro: medio de su largo y de su ancho, en la dirección del muro
  const sm = (Math.max(...s) + Math.min(...s)) / 2, nm = (Math.max(...n) + Math.min(...n)) / 2;
  return { largo, esp, ancho, area: A, ux, uy, cx: sm * ux - nm * uy, cy: sm * uy + nm * ux, angulo: Math.atan2(uy, ux) * 180 / Math.PI };
}

const avisos = [], muros = [];
const W = d.entities.filter(e => e.type === 'LWPOLYLINE' && CAPAS[e.layer]);
// Contornos y fragmentos (polilíneas de 2 o 3 puntos), por planta y capa
const contornos = [], fragmentos = [];
for (const e of W) {
  const y = e.vertices[0].y, k = Math.floor((y - 15) / PASO); if (k < 0 || k >= PISOS.length) { avisos.push(`Muro fuera de las plantas en y ${y.toFixed(1)}`); continue; }
  const v = limpiar(e.vertices.map(p => [p.x + DX, p.y + DY0 - PASO * k]));
  (v.length >= 4 ? contornos : fragmentos).push({ k, capa: e.layer, v });
}
// Fragmentos que comparten vértices (misma planta y capa) forman un muro
const sueltos = fragmentos.slice();
while (sueltos.length) {
  const g = [sueltos.shift()];
  for (let i = 0; i < g.length; i++) for (let j = sueltos.length - 1; j >= 0; j--) { const f = sueltos[j]; if (f.k === g[i].k && f.capa === g[i].capa && f.v.some(p => g[i].v.some(q => igual(p, q)))) g.push(...sueltos.splice(j, 1)); }
  const pts = g.flatMap(f => f.v), h = casco(pts);
  if (h.length >= 4) contornos.push({ k: g[0].k, capa: g[0].capa, v: h, juntado: g.length });
  else if (g.some(f => f.v.length > 2)) avisos.push(`Trazo suelto de ${g[0].capa} en ${PISOS[g[0].k].id} sin muro: ${pts.map(p => p.map(x => x.toFixed(2)).join(',')).join(' ')}`);
}
// Contorno en L, U o T dibujado de una sola vez (pasa en la azotea): se parte en tramos rectos, de a uno por
// dirección, sobre la grilla de sus propias coordenadas (los más largos primero, enteros).
const enEje = v => v.every((p, i) => { const q = v[(i + 1) % v.length]; return Math.abs(p[0] - q[0]) < 0.01 || Math.abs(p[1] - q[1]) < 0.01; });
const dentro = (p, v) => { let c = false; for (let i = 0, j = v.length - 1; i < v.length; j = i++) { const [xi, yi] = v[i], [xj, yj] = v[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) c = !c; } return c; };
function partirEnTramos(v, huecos = []) {
  const u = a => { const o = []; for (const x of a.sort((p, q) => p - q)) if (!o.length || x - o.at(-1) > 0.005) o.push(x); return o; };
  const todos = [v, ...huecos].flat(), X = u(todos.map(p => p[0])), Y = u(todos.map(p => p[1])), nx = X.length - 1, ny = Y.length - 1;
  const lleno = [...Array(nx)].map((_, i) => [...Array(ny)].map((_, j) => { const c = [(X[i] + X[i + 1]) / 2, (Y[j] + Y[j + 1]) / 2]; return dentro(c, v) && !huecos.some(h => dentro(c, h)); }));
  const tomado = lleno.map(c => c.map(() => false)), tramos = [];
  for (;;) {
    let mejor = null;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      if (!lleno[i][j] || tomado[i][j]) continue;
      for (const enX of [true, false]) {
        // barra que arranca en (i, j): se estira en una dirección y toma todo el ancho libre en la otra
        let a = i, b = i, c = j, e = j;
        if (enX) { while (a > 0 && lleno[a - 1][j] && !tomado[a - 1][j]) a--; while (b < nx - 1 && lleno[b + 1][j] && !tomado[b + 1][j]) b++; }
        else { while (c > 0 && lleno[i][c - 1] && !tomado[i][c - 1]) c--; while (e < ny - 1 && lleno[i][e + 1] && !tomado[i][e + 1]) e++; }
        const L = enX ? X[b + 1] - X[a] : Y[e + 1] - Y[c];
        if (!mejor || L > mejor.L) mejor = { L, a, b, c, e };
      }
    }
    if (!mejor) break;
    const { a, b, c, e } = mejor;
    for (let i = a; i <= b; i++) for (let j = c; j <= e; j++) tomado[i][j] = true;
    tramos.push([[X[a], Y[c]], [X[b + 1], Y[c]], [X[b + 1], Y[e + 1]], [X[a], Y[e + 1]]]);
  }
  return tramos;
}
const listos = [];
// Contornos uno dentro del otro (misma planta y capa): el muro es lo que queda entre los dos, como el ducto de 8 cm en
// U junto a la medianera izquierda de los pisos tipo, dibujado con el borde de afuera y el de adentro. Antes cada
// rectángulo se tomaba como un muro macizo.
const contiene = (A, B) => B.v.every(p => dentro(p, A.v) || A.v.some((q, i) => { const r = A.v[(i + 1) % A.v.length], L = Math.hypot(r[0] - q[0], r[1] - q[1]); return Math.abs(Math.hypot(p[0] - q[0], p[1] - q[1]) + Math.hypot(p[0] - r[0], p[1] - r[1]) - L) < 0.003; }));
const interiores = new Set();
for (const A of contornos) {
  const hijos = contornos.filter(B => B !== A && B.k === A.k && B.capa === A.capa && !interiores.has(B) && area(B.v) < area(A.v) && contiene(A, B));
  if (!hijos.length || !enEje(A.v) || !hijos.every(h => enEje(h.v))) continue;
  hijos.forEach(h => interiores.add(h)); A.huecos = hijos.map(h => h.v);
}
for (const c of contornos) {
  if (interiores.has(c)) continue;
  if (c.huecos) { const t = partirEnTramos(c.v, c.huecos); const m0 = medir(c.v); avisos.push(`Contorno con hueco (dos rectángulos uno dentro del otro) partido en ${t.length} tramos rectos en ${PISOS[c.k].id} (${CAPAS[c.capa].nombre}), en x ${m0.cx.toFixed(2)} y ${m0.cy.toFixed(2)}`); for (const r of t) listos.push({ ...c, v: r }); continue; }
  let v = c.v; if (cruzado(v)) v = casco(v);
  const m = medir(v);
  if (m.ancho > m.esp + 0.06 && enEje(v)) { const t = partirEnTramos(v); avisos.push(`Contorno en L/U partido en ${t.length} tramos rectos en ${PISOS[c.k].id} (${CAPAS[c.capa].nombre}), en x ${m.cx.toFixed(2)} y ${m.cy.toFixed(2)}`); for (const r of t) listos.push({ ...c, v: r }); }
  else listos.push({ ...c, v });
}
for (const c of listos) {
  const T = CAPAS[c.capa], P = PISOS[c.k], v = c.v;
  const m = medir(v);
  if (m.esp < 0.03) { avisos.push(`Resto de dibujo descartado en ${P.id} (${T.nombre}): ${m.largo.toFixed(2)} m de largo y ${(m.esp * 100).toFixed(1)} cm de espesor, en x ${m.cx.toFixed(2)} y ${m.cy.toFixed(2)}`); continue; }
  if (m.ancho > m.esp + 0.06) avisos.push(`Contorno que no es un rectángulo en ${P.id} (${T.nombre}) en x ${m.cx.toFixed(2)} y ${m.cy.toFixed(2)}: ${m.largo.toFixed(2)} m, espesor ${(m.esp * 100).toFixed(1)} cm, ancho total ${(m.ancho * 100).toFixed(1)} cm`);
  // Caja alineada con los ejes: el eje más cercano a la dirección del muro
  const enX = Math.abs(m.ux) >= Math.abs(m.uy), hl = m.largo / 2, he = m.esp / 2;
  const caja = (enX ? [m.cx - hl, m.cy - he, m.cx + hl, m.cy + he] : [m.cx - he, m.cy - hl, m.cx + he, m.cy + hl]).map(x => +x.toFixed(3));
  const torcido = Math.abs(((m.angulo % 90) + 90) % 90 > 45 ? 90 - ((m.angulo % 90) + 90) % 90 : ((m.angulo % 90) + 90) % 90);
  // Altura: valor más repetido del fondo de losa o viga sobre el muro (si no hay estructura encima, el alto libre)
  const tops = {}; let nHit = 0, nTot = 0;
  for (let s = 0.05; s < m.largo; s += 0.1) {
    const x = m.cx + (s - hl) * m.ux, y = m.cy + (s - hl) * m.uy;
    let z = P.techo ? fondoEn(P.techo, x, y) : Infinity, hit = true; if (!isFinite(z) || z - P.z > 4 || z <= P.z + 0.3) { z = P.z + P.libre; hit = false; }
    nTot++; if (hit) nHit++; const kk = Math.round(z * 100); tops[kk] = (tops[kk] || 0) + (hit ? 1 : 0.999);
  }
  // El muro sube hasta el fondo de la losa (el techo más alto que tiene encima); donde pasa bajo una viga, el tablero
  // descuenta la parte que ocupa la viga con rayos cada 2 cm (netoMuro). Antes se tomaba el techo más repetido y, en un
  // muro que pasaba mayormente bajo una viga, se perdía el tramo que sube hasta la losa.
  const techos = Object.keys(tops).filter(k => Number.isInteger(tops[k])).map(k => +k / 100);
  const top = techos.length ? Math.max(...techos) : +Object.entries(tops).sort((a, b) => b[1] - a[1])[0][0] / 100, alto = +(top - P.z).toFixed(3);
  const sup = +(m.largo * alto).toFixed(2);
  muros.push({ piso: P.id, tipo: T.tipo, nombreTipo: T.nombre, esp: T.esp, espDib: +m.esp.toFixed(3), cajas: [caja], z0: +P.z.toFixed(3), z1: +top.toFixed(3), alto,
    planta: +(m.largo * m.esp).toFixed(4), largo: +m.largo.toFixed(2), sup, vol: +(m.largo * m.esp * alto).toFixed(3), sinLosa: nHit < nTot / 2, torcido: +torcido.toFixed(2), capa: c.capa });
}
// Nombres por piso, de adelante hacia el fondo
const porPiso = {};
for (const m of muros.sort((a, b) => PISOS.findIndex(p => p.id === a.piso) - PISOS.findIndex(p => p.id === b.piso) || a.cajas[0][0] - b.cajas[0][0] || a.cajas[0][1] - b.cajas[0][1])) { porPiso[m.piso] = (porPiso[m.piso] || 0) + 1; m.id = `${m.piso}-${String(porPiso[m.piso]).padStart(2, '0')}`; m.nombre = 'M-' + m.id; }
// --- Medianeras apoyadas sobre la viga ---
// Las vigas de los costados siguen la línea del terreno, que no está a escuadra (la del lado derecho se corre unos
// 35 cm en 13 m, viga por viga). Cada medianera copia esa línea: en cada altura de su largo toma el ancho de la cara
// de arriba de la viga donde apoya (entre una viga y la siguiente, sobre la columna, sigue la recta que las une) y
// arranca justo en esa cara. Como el tablero dibuja los muros con cajas a escuadra, la línea inclinada se arma con
// cajas que cambian de lugar cada centímetro de corrimiento: a la vista, el muro sigue la viga.
const cajaEl = e => { const v = e.v; let b = [1e9, -1e9, 1e9, -1e9]; for (let i = 0; i < v.length; i += 3) { b[0] = Math.min(b[0], v[i]); b[1] = Math.max(b[1], v[i]); b[2] = Math.min(b[2], v[i + 1]); b[3] = Math.max(b[3], v[i + 1]); } return b.map(x => x / 100); };
const APOYO = { PB: 'base', P1: 'sPB', P2: 's1', P3: 's2', AZ: 's3', TSM: 'sSM' };
const arribaDe = e => { const v = e.v, P = []; for (let i = 0; i < v.length; i += 3) P.push([v[i] / 100, v[i + 1] / 100, v[i + 2] / 100]); const zt = Math.max(...P.map(p => p[2])); return { zt, top: casco(P.filter(p => zt - p[2] < 0.005).map(p => [p[0], p[1]])) }; };
// ancho de un polígono convexo en la altura y: [x mínimo, x máximo] o null
function anchoEn(pol, y) {
  const xs = []; for (let i = 0; i < pol.length; i++) { const [a, b] = [pol[i], pol[(i + 1) % pol.length]]; if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) xs.push(a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1])); else if (a[1] === y) xs.push(a[0]); }
  return xs.length ? [Math.min(...xs), Math.max(...xs)] : null;
}
const XMIN = Math.min(...tab.elementos.filter(e => e.t === 'columna').map(e => cajaEl(e)[0])), XMAX = Math.max(...tab.elementos.filter(e => e.t === 'columna').map(e => cajaEl(e)[1]));
let medianeras = 0;
for (const m of muros) {
  const r = m.cajas[0], enY = r[3] - r[1] > r[2] - r[0], xc = (r[0] + r[2]) / 2;
  if (!enY || (xc > XMIN + 0.4 && xc < XMAX - 0.4)) continue;                    // solo los muros de los costados
  // vigas del nivel de apoyo, a lo largo (en y), bajo la línea del muro
  const vigas = tab.elementos.filter(e => e.l === APOYO[m.piso] && ['viga', 'viga_fundacion'].includes(e.t)).map(e => ({ e, b: cajaEl(e), ...arribaDe(e) }))
    // la viga tiene que estar debajo del muro (en planta se pisan): un murito que solo está cerca de la medianera,
    // como los ductos de 8 cm junto al lindero, no es medianera
    .filter(v => v.b[3] - v.b[2] > v.b[1] - v.b[0] && v.b[0] < r[2] - 0.01 && v.b[1] > r[0] + 0.01 && v.b[2] < r[3] && v.b[3] > r[1]).sort((a, b) => a.b[2] - b.b[2]);
  if (!vigas.length) continue;
  // ancho de apoyo en cada centímetro del muro: el de la viga, o la recta entre la viga de antes y la de después
  const tramo = y => { const v = vigas.find(v => y >= v.b[2] && y <= v.b[3]); if (v) { const w = anchoEn(v.top, y); if (w) return w; }
    const ant = vigas.filter(v => v.b[3] < y).at(-1), sig = vigas.find(v => v.b[2] > y);
    const fin = v => anchoEn(v.top, v.b[3] - 0.001) || [v.b[0], v.b[1]], ini = v => anchoEn(v.top, v.b[2] + 0.001) || [v.b[0], v.b[1]];
    if (ant && sig) { const a = fin(ant), b = ini(sig), t = (y - ant.b[3]) / (sig.b[2] - ant.b[3]); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
    return ant ? fin(ant) : ini(sig); };
  // Ancho: el de la viga. Si la viga es más ancha que el muro (las de fundación, de 30 cm, bajo la medianera de 12 de
  // PB), el muro conserva su espesor del CAD y va contra la cara de la viga que da al lindero.
  const espCAD = m.espDib, izq = xc < (XMIN + XMAX) / 2;
  const cajas = []; let act = null;
  for (let y = r[1]; y < r[3] - 1e-6; y = +(y + 0.01).toFixed(3)) {
    let [a0, a1] = tramo((y + Math.min(r[3], y + 0.01)) / 2); if (a1 - a0 > espCAD + 0.005) { if (izq) a1 = a0 + espCAD; else a0 = a1 - espCAD; }
    const y2 = Math.min(r[3], +(y + 0.01).toFixed(3)), [x0, x1] = [a0, a1].map(x => Math.round(x * 100) / 100);
    if (act && act[0] === x0 && act[2] === x1) act[3] = y2; else { act = [x0, y, x1, y2]; cajas.push(act); }
  }
  // arranca en la cara de arriba de la viga (la más repetida a lo largo del muro)
  const zs = {}; for (const v of vigas) { const k = v.zt.toFixed(3); zs[k] = (zs[k] || 0) + (Math.min(v.b[3], r[3]) - Math.max(v.b[2], r[1])); }
  const z0 = +Object.entries(zs).sort((a, b) => b[1] - a[1])[0][0];
  const planta = cajas.reduce((a, c) => a + (c[2] - c[0]) * (c[3] - c[1]), 0), largo = r[3] - r[1];
  Object.assign(m, { cajas: cajas.map(c => c.map(x => +x.toFixed(3))), z0, alto: +(m.z1 - z0).toFixed(3), espDib: +(planta / largo).toFixed(3), planta: +planta.toFixed(4), medianera: true, apoyo: vigas.map(v => v.e.n) });
  m.sup = +(m.largo * m.alto).toFixed(2); m.vol = +(planta * m.alto).toFixed(3);
  medianeras++;
}
console.log('medianeras sobre viga:', medianeras);

// --- Dinteles sobre las puertas ---
// Las cotas del CAD marcan la línea entera de cada muro, pasando por encima de las puertas. Dentro de cada cota, lo
// que no tiene muro dibujado es un vano: si no lo ocupa una columna o un tabique y mide entre 0,50 y 1,60 m, es una
// puerta y lleva dintel de mampostería desde 2,05 m sobre el piso (altura libre de paso) hasta el techo del muro.
// Cada dintel es un muro aparte (D-P1-01…), del mismo tipo y espesor que el muro donde está.
const PASO_LIBRE = 2.05;
// Caja que encierra el muro entero (una medianera inclinada tiene muchas cajas: no alcanza con la primera)
const cajaT = m => [Math.min(...m.cajas.map(r => r[0])), Math.min(...m.cajas.map(r => r[1])), Math.max(...m.cajas.map(r => r[2])), Math.max(...m.cajas.map(r => r[3]))];
const CAPA_DIM = { 'LIB. Muro 8cm': 'hueco8', 'LIB. Muro 12cm': 'hueco12', 'LIB. Muro 18cm': 'hueco18', 'LIB. Muro 12cm Portante': 'portante12' };
const dinteles = [], vistos = new Set();
for (const e of d.entities.filter(e => e.type === 'DIMENSION' && CAPA_DIM[e.layer])) {
  const k = Math.floor((e.anchorPoint.y - 15) / PASO), P = PISOS[k]; if (!P) continue;
  const a = [e.linearOrAngularPoint1.x + DX, e.linearOrAngularPoint1.y + DY0 - PASO * k], b = [e.linearOrAngularPoint2.x + DX, e.linearOrAngularPoint2.y + DY0 - PASO * k];
  // dirección de la cota: la que coincide con su medida
  const Mv = e.actualMeasurement, enX = Math.abs(Math.abs(b[0] - a[0]) - Mv) <= Math.abs(Math.abs(b[1] - a[1]) - Mv);
  const ax = enX ? 0 : 1, pe = 1 - ax, lo = Math.min(a[ax], b[ax]), hi = Math.max(a[ax], b[ax]);
  // muros del mismo tipo, en esa dirección, por los que pasa la cota
  const W = muros.filter(m => m.piso === P.id && m.tipo === CAPA_DIM[e.layer]).filter(m => {
    const r = cajaT(m), L = [r[ax], r[ax + 2]], T = [r[pe], r[pe + 2]];
    return L[1] - L[0] >= T[1] - T[0] && [a, b].some(p => p[pe] >= T[0] - 0.03 && p[pe] <= T[1] + 0.03) && L[1] > lo - 0.02 && L[0] < hi + 0.02;
  });
  // Cota de un vano entre muros de otro tipo (una puerta de 0,94 m en un tabique de 8 entre un muro de 12 y otro de 12,
  // en cada piso tipo): no hay muro de su capa en la línea. La faja del dintel sale de las mochetas de su capa que toca
  // la cota (los trocitos de 8 cm que cierran el vano); si no hay, del punto de la cota hacia el lado de los muros vecinos.
  let banda = null;
  if (!W.length) {
    if (Mv < 0.5 || Mv > 1.6) continue;
    const T = Object.values(CAPAS).find(c => c.tipo === CAPA_DIM[e.layer]), p0 = (a[pe] + b[pe]) / 2;
    // mochetas: trocitos de esa capa sobre la línea de la cota, del espesor del muro (no los muros que la cruzan)
    const moch = muros.filter(m => m.piso === P.id && m.tipo === T.tipo && !m.dintel).filter(m => { const r = cajaT(m); return r[pe + 2] - r[pe] <= T.esp + 0.03 && r[ax] < hi + 0.02 && r[ax + 2] > lo - 0.02 && r[pe] <= p0 + 0.01 && r[pe + 2] >= p0 - 0.01; });
    if (moch.length) banda = [Math.min(...moch.map(m => cajaT(m)[pe])), Math.max(...moch.map(m => cajaT(m)[pe + 2]))];
    else {
      const ext = muros.filter(m => m.piso === P.id && !m.dintel).filter(m => { const r = cajaT(m); return r[pe] <= p0 + 0.2 && r[pe + 2] >= p0 - 0.2 && ((r[ax] <= lo + 0.03 && r[ax + 2] >= lo - 0.03) || (r[ax] <= hi + 0.03 && r[ax + 2] >= hi - 0.03)); });
      const c = ext.length ? ext.reduce((s, m) => s + (cajaT(m)[pe] + cajaT(m)[pe + 2]) / 2, 0) / ext.length : p0 + 1;
      banda = c >= p0 ? [p0, p0 + T.esp] : [p0 - T.esp, p0];
    }
    banda.ref = { tipo: T.tipo, nombreTipo: T.nombre, esp: T.esp, z1: P.z + P.libre, nombre: 'vano entre muros' };
  }
  const iv = W.map(m => [cajaT(m)[ax], cajaT(m)[ax + 2], m]).sort((p, q) => p[0] - q[0]);
  let x = lo, ant = null;
  const huecos = [];
  for (const [p, q, m] of iv) { if (p > x + 0.05) huecos.push([x, Math.min(p, hi), ant, m]); if (q > x) { x = q; ant = m; } }
  if (hi > x + 0.05) huecos.push([x, hi, ant, null]);
  const cols = P.techo ? tab.elementos.filter(el => el.l === P.techo && ['columna', 'tabique'].includes(el.t)).map(cajaEl) : [];
  for (const [h0, h1, m1, m2] of huecos) {
    const ancho = h1 - h0; if (ancho < 0.5 || ancho > 1.6) continue;
    const vecinos = banda ? [banda.ref] : [m1, m2].filter(Boolean);
    const T0 = banda ? banda[0] : Math.min(...vecinos.map(m => cajaT(m)[pe])), T1 = banda ? banda[1] : Math.max(...vecinos.map(m => cajaT(m)[pe + 2]));
    const r = (enX ? [h0, T0, h1, T1] : [T0, h0, T1, h1]).map(v => +v.toFixed(3));
    if (cols.some(c => c[0] < r[2] - 0.02 && c[1] > r[0] + 0.02 && c[2] < r[3] - 0.02 && c[3] > r[1] + 0.02)) continue;   // lo ocupa la estructura
    const clave = P.id + r.map(v => v.toFixed(2)).join(','); if (vistos.has(clave)) continue; vistos.add(clave);
    // techo del dintel: el de la estructura sobre el vano; si no hay, el de los muros de al lado
    const tops = {}; for (let s = 0.05; s < ancho; s += 0.1) { const px = enX ? h0 + s : (T0 + T1) / 2, py = enX ? (T0 + T1) / 2 : h0 + s; const z = P.techo ? fondoEn(P.techo, px, py) : Infinity; if (isFinite(z) && z - P.z <= 4 && z > P.z + 0.3) { const kk = Math.round(z * 100); tops[kk] = (tops[kk] || 0) + 1; } }
    const top = Object.keys(tops).length ? +Object.entries(tops).sort((a, b) => b[1] - a[1])[0][0] / 100 : Math.max(...vecinos.map(m => m.z1));
    const z0 = +(P.z + PASO_LIBRE).toFixed(3), alto = +(top - z0).toFixed(3); if (alto < 0.05) continue;
    const ref = vecinos[0], esp = Math.min(r[2] - r[0], r[3] - r[1]);
    dinteles.push({ piso: P.id, tipo: ref.tipo, nombreTipo: ref.nombreTipo, esp: ref.esp, espDib: +esp.toFixed(3), cajas: [r], z0, z1: +top.toFixed(3), alto,
      planta: +(ancho * esp).toFixed(4), largo: +ancho.toFixed(2), sup: +(ancho * alto).toFixed(2), vol: +(ancho * esp * alto).toFixed(3), sinLosa: false, dintel: true, vano: +ancho.toFixed(2), sobre: vecinos.map(m => m.nombre) });
  }
}
const porPisoD = {};
for (const m of dinteles.sort((a, b) => PISOS.findIndex(p => p.id === a.piso) - PISOS.findIndex(p => p.id === b.piso) || a.cajas[0][0] - b.cajas[0][0] || a.cajas[0][1] - b.cajas[0][1])) { porPisoD[m.piso] = (porPisoD[m.piso] || 0) + 1; m.id = `${m.piso}-D${String(porPisoD[m.piso]).padStart(2, '0')}`; m.nombre = 'D-' + m.piso + '-' + String(porPisoD[m.piso]).padStart(2, '0'); }
muros.push(...dinteles);
console.log('dinteles:', dinteles.length, Object.entries(porPisoD).map(([p, n]) => p + ' ' + n).join(', '), '·', dinteles.reduce((a, m) => a + m.sup, 0).toFixed(1), 'm²');

const pisos = Object.fromEntries(PISOS.map(p => [p.id, { nivel: p.nivel, nombre: p.nombre }]));
fs.writeFileSync('albanileria.json', JSON.stringify({ muros, avisos, pisos }));

// Resumen por piso y tipo (largos, para comparar con las notas del CAD)
const res = {}; for (const m of muros) { const k = m.piso.padEnd(4) + m.tipo; res[k] ||= [0, 0, 0]; res[k][0]++; res[k][1] += m.largo; res[k][2] += m.sup; }
for (const k of Object.keys(res).sort((a, b) => PISOS.findIndex(p => a.startsWith(p.id)) - PISOS.findIndex(p => b.startsWith(p.id)) || a.localeCompare(b))) console.log(k.padEnd(16), String(res[k][0]).padStart(3), 'muros', res[k][1].toFixed(2).padStart(7), 'm', res[k][2].toFixed(1).padStart(7), 'm²');
console.log('total', muros.length, 'muros', muros.reduce((a, m) => a + m.sup, 0).toFixed(1), 'm²');
if (avisos.length) console.log('avisos:\n' + avisos.join('\n'));
