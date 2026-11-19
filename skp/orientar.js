// Limpia y orienta las mallas del volcado de SketchUp para que el volumen sea exacto.
// Problemas que aparecen en los modelos: caras dadas vuelta, grupos espejados, caras duplicadas, caras sueltas
// adentro de la pieza (dividen el sólido en dos) y algún agujero chico. Con eso, sumar tetraedros da cualquier cosa.
// Método, malla por malla:
//  1. Se sacan los triángulos repetidos (misma terna de vértices).
//  2. Cada triángulo se clasifica tirando rayos desde su centro hacia los dos lados (tres direcciones levemente
//     distintas, por mayoría): si de un lado está adentro de la pieza y del otro afuera, es piel; se orienta con la
//     normal hacia afuera. Si los dos lados están adentro, es una cara interna y se descarta. Si los dos están afuera
//     es una cara suelta (una lámina sin espesor) y también se descarta.
//  3. Control independiente: el volumen se integra además con rayos verticales cada 1 cm (largo adentro de la pieza
//     por la superficie de cada celda). Si los dos cálculos no coinciden se informa.
const volMalla = tris => tris.reduce((a, [p, q, r]) => a + (p[0] * (q[1] * r[2] - q[2] * r[1]) - p[1] * (q[0] * r[2] - q[2] * r[0]) + p[2] * (q[0] * r[1] - q[1] * r[0])) / 6, 0);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// Möller–Trumbore: distancia a lo largo del rayo, o null
function corta(o, d, [a, b, c]) {
  const e1 = sub(b, a), e2 = sub(c, a), p = cruz(d, e2), det = punto(e1, p); if (Math.abs(det) < 1e-12) return null;
  const inv = 1 / det, s = sub(o, a), u = punto(s, p) * inv; if (u < -1e-9 || u > 1 + 1e-9) return null;
  const q = cruz(s, e1), v = punto(d, q) * inv; if (v < -1e-9 || u + v > 1 + 1e-9) return null;
  const t = punto(e2, q) * inv; return t > 1e-7 ? t : null;
}
// Cantidad de cruces de un rayo con la malla (cruces casi en el mismo punto cuentan una vez: aristas compartidas)
function cruces(o, d, tris, salvo) {
  const ts = [];
  for (let i = 0; i < tris.length; i++) if (i !== salvo) { const t = corta(o, d, tris[i]); if (t != null) ts.push(t); }
  ts.sort((a, b) => a - b); let n = 0, ult = -1; for (const t of ts) { if (t - ult > 1e-6) n++; ult = t; } return n;
}
const DESVIOS = [[0.0123, 0.0071, 0.0037], [-0.0089, 0.0131, -0.0057], [0.0047, -0.0103, 0.0113]];
// Suelda vértices a menos de 2 mm (rendijas de dibujo) y saca triángulos que quedan sin superficie.
function soldar(tris, tol = 0.002) {
  const pts = [], celda = new Map(), c = v => Math.floor(v / tol);
  const unico = p => {
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++)
      for (const q of celda.get([c(p[0]) + dx, c(p[1]) + dy, c(p[2]) + dz].join(',')) || []) if (Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) <= tol) return q;
    const k = [c(p[0]), c(p[1]), c(p[2])].join(','); (celda.get(k) || celda.set(k, []).get(k)).push(p); pts.push(p); return p;
  };
  return tris.map(t => t.map(unico)).filter(([a, b, c2]) => a !== b && b !== c2 && a !== c2 && Math.hypot(...cruz(sub(b, a), sub(c2, a))) > 1e-10);
}
// Tapa los agujeros: encadena las aristas de borde (las que tienen un solo triángulo) en contornos y los cierra en
// abanico. La orientación de la tapa no importa: la arregla la clasificación por rayos.
function tapar(tris) {
  const id = new Map(), key = p => p.join(','); const pid = p => { const k = key(p); if (!id.has(k)) id.set(k, p); return k; };
  const cuenta = new Map(), sig = new Map();
  for (const t of tris) for (let j = 0; j < 3; j++) { const a = pid(t[j]), b = pid(t[(j + 1) % 3]), e = a < b ? a + '>' + b : b + '>' + a; cuenta.set(e, (cuenta.get(e) || 0) + 1); }
  for (const [e, n] of cuenta) if (n === 1) { const [a, b] = e.split('>'); (sig.get(a) || sig.set(a, []).get(a)).push(b); (sig.get(b) || sig.set(b, []).get(b)).push(a); }
  const usado = new Set(), tapas = [];
  for (const ini of sig.keys()) {
    if (usado.has(ini)) continue;
    const lazo = [ini]; usado.add(ini); let prev = null, cur = ini;
    for (let paso = 0; paso < 1000; paso++) {
      const n = (sig.get(cur) || []).find(x => x !== prev && (!usado.has(x) || (x === ini && lazo.length > 2)));
      if (!n || n === ini) break; lazo.push(n); usado.add(n); prev = cur; cur = n;
    }
    if (lazo.length >= 3) for (let i = 1; i + 1 < lazo.length; i++) tapas.push([id.get(lazo[0]), id.get(lazo[i]), id.get(lazo[i + 1])]);
  }
  return { tris: tapas.length ? tris.concat(tapas) : tris, tapas: tapas.length };
}
function limpiar(trisIn, conTapas = true) {
  // 1. soldar, sacar repetidos y tapar agujeros
  const k = p => p.map(v => Math.round(v * 1e4)).join(','), vistos = new Set(); let tris = [];
  for (const t of soldar(trisIn)) { const c = t.map(k).sort().join('|'); if (!vistos.has(c)) { vistos.add(c); tris.push(t); } }
  const tap = conTapas ? tapar(tris) : { tris, tapas: 0 }; tris = tap.tris;
  // 2. clasificar
  const out = []; let internas = 0, sueltas = 0;
  for (let i = 0; i < tris.length; i++) {
    const [a, b, c] = tris[i], n = cruz(sub(b, a), sub(c, a)), L = Math.hypot(...n); if (L < 1e-12) continue;
    const nu = n.map(x => x / L), cen = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
    let votoAfueraPos = 0, votoAdentroPos = 0, votoAdentroNeg = 0;
    for (const dv of DESVIOS) {
      const dp = nu.map((x, j) => x + dv[j]), dn = nu.map((x, j) => -x + dv[j]);
      const op = cen.map((x, j) => x + nu[j] * 1e-5), on = cen.map((x, j) => x - nu[j] * 1e-5);
      const adentroPos = cruces(op, dp, tris, i) % 2 === 1, adentroNeg = cruces(on, dn, tris, i) % 2 === 1;
      if (adentroPos) votoAdentroPos++; else votoAfueraPos++;
      if (adentroNeg) votoAdentroNeg++;
    }
    const pos = votoAdentroPos >= 2, neg = votoAdentroNeg >= 2;
    if (pos && neg) { internas++; continue; }
    if (!pos && !neg) { sueltas++; continue; }
    out.push(pos ? [a, c, b] : [a, b, c]);          // la normal tiene que apuntar al lado de afuera
  }
  return { tris: out, internas, sueltas, repetidas: Math.max(0, trisIn.length + tap.tapas - tris.length), tapas: tap.tapas };
}
// Volumen por rayos verticales cada 1 cm (control)
function volRayos(tris, paso = 0.01) {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const t of tris) for (const p of t) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const tri2 = tris.map(t => ({ t, x0: Math.min(t[0][0], t[1][0], t[2][0]), x1: Math.max(t[0][0], t[1][0], t[2][0]), y0: Math.min(t[0][1], t[1][1], t[2][1]), y1: Math.max(t[0][1], t[1][1], t[2][1]) }));
  let v = 0; const area = paso * paso;
  for (let x = x0 + paso / 2; x < x1; x += paso) {
    const col = tri2.filter(q => q.x0 <= x && q.x1 >= x);
    for (let y = y0 + paso / 2; y < y1; y += paso) {
      const zs = [];
      for (const q of col) {
        if (q.y0 > y || q.y1 < y) continue;
        const [a, b, c] = q.t, den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]); if (Math.abs(den) < 1e-14) continue;
        const l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / den, l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / den, l3 = 1 - l1 - l2;
        if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
        zs.push(l1 * a[2] + l2 * b[2] + l3 * c[2]);
      }
      zs.sort((a, b) => a - b); const u = []; for (const z of zs) if (!u.length || z - u[u.length - 1] > 1e-6) u.push(z);
      for (let i = 0; i + 1 < u.length; i += 2) v += (u[i + 1] - u[i]) * area;
    }
  }
  return v;
}
// Limpia s.mallas en el lugar. Se saltean las referencias del CAD que vienen dentro del SketchUp (no se computan).
module.exports = function orientar(s, { saltear = r => /\.dwg/i.test(r.join('|')) } = {}) {
  let cambiadas = 0, internas = 0, sueltas = 0, repetidas = 0, tapas = 0;
  const dudosas = [];
  for (const m of s.mallas) {
    if (!m.tris.length || saltear(m.ruta)) continue;
    // Variantes: sin tapar agujeros y tapándolos. Vale la que da lo mismo con los dos métodos de cálculo.
    const vars = [limpiar(m.tris, false), limpiar(m.tris, true)].map(L => ({ L, v: volMalla(L.tris) }));
    const control = x => { if (x.vr != null) return x.vr; let vr = volRayos(x.L.tris); if (Math.abs(vr - x.v) > 0.005 * Math.max(Math.abs(x.v), 0.01) + 0.001) vr = volRayos(x.L.tris, 0.002); return (x.vr = vr); };
    const ok = x => x.v > 0 && Math.abs(control(x) - x.v) <= 0.005 * Math.max(x.v, 0.01) + 0.001;
    const simple = !vars[0].L.internas && !vars[0].L.sueltas && !vars[0].L.repetidas && vars[1].L.tapas === 0 && m.tris.length <= 12;
    let elegida = simple ? vars[0] : (ok(vars[0]) ? vars[0] : ok(vars[1]) ? vars[1] : null);
    if (!elegida) {
      // Ninguna cierra: pieza con la geometría rota en el SketchUp. Se usa el volumen por rayos de la versión sin
      // tapas (o con tapas si esa da positivo y la otra no) y se marca para revisar en el modelo.
      // Los rayos verticales no ven las caras verticales: un hueco en una cara lateral no los afecta. Se miden sobre
      // la malla original sin repetidos, que conserva todas las tapas horizontales.
      const k = p => p.map(v => Math.round(v * 1e4)).join(','), vistas = new Set(), crudo = [];
      for (const tr of m.tris) { const c = tr.map(k).sort().join('|'); if (!vistas.has(c)) { vistas.add(c); crudo.push(tr); } }
      const vr = volRayos(crudo, 0.002);
      elegida = { L: { internas: 0, sueltas: 0, repetidas: m.tris.length - crudo.length, tapas: 0, tris: crudo }, v: vr }; m.dudoso = true;
      dudosas.push(`${m.ruta.slice(-3).join(' > ')}: ${vr.toFixed(4)} m³ por rayos (la malla no cierra)`);
      m.tris = crudo; m.vol = vr;
    } else { m.tris = elegida.L.tris; m.vol = elegida.v; }
    m.tris.vol = m.vol; m.tris.dudoso = !!m.dudoso;
    const L = elegida.L;
    internas += L.internas; sueltas += L.sueltas; repetidas += L.repetidas; tapas += L.tapas;
    if (L.internas || L.sueltas || L.repetidas || L.tapas || Math.abs(elegida.v - volMalla(m.tris)) > 1e-6) cambiadas++;
  }
  return { mallas: s.mallas.length, cambiadas, internas, sueltas, repetidas, tapas, difieren: dudosas, dudosas, abiertas: 0 };
};
module.exports.volMalla = volMalla;
module.exports.volRayos = volRayos;
module.exports.limpiar = limpiar;
