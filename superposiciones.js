// Superposiciones de hormigón: el mismo volumen no se cuenta dos veces.
// uso: node superposiciones.js <tablero-datos.json>   (se corre después de armar los datos de la estructura)
//
// Cada elemento se separa en sus piezas (partes conexas de la malla: una base puede ser zapata + fuste que se pisan).
// Para cada par de piezas cuyas cajas se cruzan se mide el volumen en común:
//  - si las dos son cajas alineadas con los ejes, exacto (producto de los tramos en común);
//  - si no, integrando con rayos verticales sobre la zona en común (paso de 2 mm, o algo más grueso en zonas grandes):
//    en cada rayo, largo en que está adentro de las dos piezas a la vez.
// El volumen en común se descuenta de una sola de las dos, según el criterio usual de cómputo:
//   base > columna = tabique > losa > viga = viga de fundación > escalera.
// Entre dos del mismo rango, se lo queda la más grande. Dentro de una misma pieza, se descuenta de ella misma.
// Se guardan: volBruto (el de la malla), vol (neto) y desc: [{ con, vol, x0, x1, y0, y1, z0, z1 }] con cada descuento y la
// caja de la zona en común (en metros), para repartirlo cuando un plano de sección horizontal o vertical la corta.
const fs = require('fs');
const archivo = process.argv[2];
const D = JSON.parse(fs.readFileSync(archivo, 'utf8'));
const PRIO = { base: 6, columna: 5, tabique: 5, losa: 4, viga: 3, viga_fundacion: 3, escalera: 2 };
const volMalla = tris => tris.reduce((a, [p, q, r]) => a + (p[0] * (q[1] * r[2] - q[2] * r[1]) - p[1] * (q[0] * r[2] - q[2] * r[0]) + p[2] * (q[0] * r[1] - q[1] * r[0])) / 6, 0);

// --- piezas de cada elemento ---
function piezas(e) {
  const v = e.v, tris = [];
  for (let i = 0; i < v.length; i += 9) tris.push([0, 3, 6].map(o => [v[i + o] / 100, v[i + o + 1] / 100, v[i + o + 2] / 100]));
  // partes conexas por vértices compartidos
  const k = p => p.join(','), padre = new Map(), raiz = x => { while (padre.get(x) !== x) { padre.set(x, padre.get(padre.get(x))); x = padre.get(x); } return x; };
  for (const t of tris) for (const p of t) if (!padre.has(k(p))) padre.set(k(p), k(p));
  for (const t of tris) { const a = raiz(k(t[0])); for (const p of t.slice(1)) { const b = raiz(k(p)); if (a !== b) padre.set(b, a); } }
  const grupos = new Map(); for (const t of tris) { const r = raiz(k(t[0])); (grupos.get(r) || grupos.set(r, []).get(r)).push(t); }
  return [...grupos.values()].map(T => {
    const b = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9, z0: 1e9, z1: -1e9 };
    for (const t of T) for (const p of t) { b.x0 = Math.min(b.x0, p[0]); b.x1 = Math.max(b.x1, p[0]); b.y0 = Math.min(b.y0, p[1]); b.y1 = Math.max(b.y1, p[1]); b.z0 = Math.min(b.z0, p[2]); b.z1 = Math.max(b.z1, p[2]); }
    const vol = Math.abs(volMalla(T));
    const xs = new Set(), ys = new Set(), zs = new Set(); T.forEach(t => t.forEach(p => { xs.add(p[0]); ys.add(p[1]); zs.add(p[2]); }));
    const caja = xs.size === 2 && ys.size === 2 && zs.size === 2 && Math.abs(vol - (b.x1 - b.x0) * (b.y1 - b.y0) * (b.z1 - b.z0)) < 1e-6;
    const T2 = T.map(t => ({ t, x0: Math.min(t[0][0], t[1][0], t[2][0]), x1: Math.max(t[0][0], t[1][0], t[2][0]), y0: Math.min(t[0][1], t[1][1], t[2][1]), y1: Math.max(t[0][1], t[1][1], t[2][1]) }));
    return { T: T2, b, vol, caja };
  });
}
// tramos z adentro de una pieza sobre la vertical (x, y)
function tramos(p, x, y) {
  const zs = [];
  for (const q of p.T) {
    if (q.x0 > x || q.x1 < x || q.y0 > y || q.y1 < y) continue;
    const [a, b, c] = q.t, den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]); if (Math.abs(den) < 1e-14) continue;
    const l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / den, l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / den, l3 = 1 - l1 - l2;
    if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue; zs.push(l1 * a[2] + l2 * b[2] + l3 * c[2]);
  }
  zs.sort((a, b) => a - b); const u = []; for (const z of zs) if (!u.length || z - u[u.length - 1] > 1e-6) u.push(z);
  const out = []; for (let i = 0; i + 1 < u.length; i += 2) out.push([u[i], u[i + 1]]); return out;
}
// volumen en común de dos piezas, y altura (z) de la zona en común
function comun(A, B) {
  const x0 = Math.max(A.b.x0, B.b.x0), x1 = Math.min(A.b.x1, B.b.x1), y0 = Math.max(A.b.y0, B.b.y0), y1 = Math.min(A.b.y1, B.b.y1), z0 = Math.max(A.b.z0, B.b.z0), z1 = Math.min(A.b.z1, B.b.z1);
  if (x1 - x0 < 5e-4 || y1 - y0 < 5e-4 || z1 - z0 < 5e-4) return null;
  if (A.caja && B.caja) return { vol: (x1 - x0) * (y1 - y0) * (z1 - z0), x0, x1, y0, y1, z0, z1 };
  const paso = Math.max(0.002, Math.sqrt((x1 - x0) * (y1 - y0) / 60000));
  let vol = 0, zmin = 1e9, zmax = -1e9, xa = 1e9, xb = -1e9, ya = 1e9, yb = -1e9;
  for (let x = x0 + paso / 2; x < x1; x += paso) for (let y = y0 + paso / 2; y < y1; y += paso) {
    const ta = tramos(A, x, y); if (!ta.length) continue; const tb = tramos(B, x, y);
    for (const [a0, a1] of ta) for (const [b0, b1] of tb) { const l = Math.min(a1, b1) - Math.max(a0, b0); if (l > 0) { vol += l * paso * paso; xa = Math.min(xa, x - paso / 2); xb = Math.max(xb, x + paso / 2); ya = Math.min(ya, y - paso / 2); yb = Math.max(yb, y + paso / 2); zmin = Math.min(zmin, Math.max(a0, b0)); zmax = Math.max(zmax, Math.min(a1, b1)); } }
  }
  return vol > 1e-6 ? { vol, x0: xa, x1: xb, y0: ya, y1: yb, z0: zmin, z1: zmax } : null;
}

const E = D.elementos.filter(e => PRIO[e.t]);
const P = new Map(E.map(e => [e.id, piezas(e)]));
for (const e of D.elementos) { e.volBruto = e.volBruto ?? e.vol; delete e.desc; }
const desc = new Map(), descontar = (id, d) => (desc.get(id) || desc.set(id, []).get(id)).push(d);
const r4 = x => Math.round(x * 1e4) / 1e4;
const cajaDe = c => Object.fromEntries(['x0', 'x1', 'y0', 'y1', 'z0', 'z1'].map(q => [q, r4(c[q])]));
// dentro de cada elemento
let nPropios = 0;
for (const e of E) { const ps = P.get(e.id); for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) { const c = comun(ps[i], ps[j]); if (c) { descontar(e.id, { con: e.id, vol: r4(c.vol), ...cajaDe(c) }); nPropios++; } } }
// entre elementos
const caja = e => P.get(e.id).reduce((b, p) => ({ x0: Math.min(b.x0, p.b.x0), x1: Math.max(b.x1, p.b.x1), y0: Math.min(b.y0, p.b.y0), y1: Math.max(b.y1, p.b.y1), z0: Math.min(b.z0, p.b.z0), z1: Math.max(b.z1, p.b.z1) }), { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9, z0: 1e9, z1: -1e9 });
const cajas = new Map(E.map(e => [e.id, caja(e)]));
let pares = 0;
const lista = [];
for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
  const a = E[i], b = E[j], A = cajas.get(a.id), B = cajas.get(b.id);
  if (A.x1 <= B.x0 + 5e-4 || B.x1 <= A.x0 + 5e-4 || A.y1 <= B.y0 + 5e-4 || B.y1 <= A.y0 + 5e-4 || A.z1 <= B.z0 + 5e-4 || B.z1 <= A.z0 + 5e-4) continue;
  let vol = 0; const k = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9, z0: 1e9, z1: -1e9 };
  for (const pa of P.get(a.id)) for (const pb of P.get(b.id)) { const c = comun(pa, pb); if (c) { vol += c.vol; for (const q of ['x', 'y', 'z']) { k[q + '0'] = Math.min(k[q + '0'], c[q + '0']); k[q + '1'] = Math.max(k[q + '1'], c[q + '1']); } } }
  if (vol < 1e-5) continue;
  pares++;
  // pierde el de menor rango; empate: el más chico
  const pierde = PRIO[a.t] !== PRIO[b.t] ? (PRIO[a.t] < PRIO[b.t] ? a : b) : (a.volBruto !== b.volBruto ? (a.volBruto < b.volBruto ? a : b) : (a.id > b.id ? a : b));
  const gana = pierde === a ? b : a;
  descontar(pierde.id, { con: gana.id, vol: r4(vol), ...cajaDe(k) });
  lista.push([pierde, gana, vol]);
}
for (const e of D.elementos) {
  const d = desc.get(e.id); if (!d) { e.vol = e.volBruto; continue; }
  // Una pieza que queda entera adentro de otra (un muro del subsuelo de Condarco dibujado dentro de su base) no puede
  // descontar más que lo que tiene: el redondeo de las mallas daba unos litros de más y el volumen salía negativo.
  e.desc = d; e.vol = Math.max(0, Math.round((e.volBruto - d.reduce((s, x) => s + x.vol, 0)) * 1000) / 1000);
}
fs.writeFileSync(archivo, JSON.stringify(D));
const bruto = D.elementos.reduce((s, e) => s + e.volBruto, 0), neto = D.elementos.reduce((s, e) => s + e.vol, 0);
console.log(`${archivo}: ${pares} pares de elementos superpuestos, ${nPropios} superposiciones dentro de una pieza | bruto ${bruto.toFixed(3)} m³ → neto ${neto.toFixed(3)} m³ (−${(bruto - neto).toFixed(3)})`);
const porTipo = {}; lista.forEach(([p, g, v]) => { const k = `${p.t} en ${g.t}`; porTipo[k] = (porTipo[k] || 0) + v; });
console.log(Object.entries(porTipo).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v.toFixed(3)}`).join(' | '));
console.log('mayores:', lista.sort((a, b) => b[2] - a[2]).slice(0, 8).map(([p, g, v]) => `${p.id}→${g.id} ${v.toFixed(3)}`).join(' | '));
const negativos = D.elementos.filter(e => e.vol < -1e-4); if (negativos.length) console.log('OJO volumen negativo:', negativos.map(e => e.id + ' ' + e.vol).join(', '));
