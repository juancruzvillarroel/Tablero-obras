// Separa los muros compuestos (L, T, H, +) en tramos rectos individuales, un muro por dirección.
// Criterio: primero los tramos más largos, enteros; los que llegan a ellos se recortan en el encuentro.
// Se trabaja sobre la región del muro en una grilla de 1 cm (los filos dibujados se conservan).
const fs = require('fs');
const A = JSON.parse(fs.readFileSync('albanileria.json'));
const R = 0.01;
function rectsDeCeldas(set, W, H, porFilas) {
  // corridas por filas (o por columnas) fusionadas cuando coinciden
  const out = [], abiertos = new Map();
  const [N1, N2] = porFilas ? [H, W] : [W, H];
  const en = (a, b) => porFilas ? set[a * W + b] : set[b * W + a];
  for (let a = 0; a < N1; a++) {
    const corr = []; let b = 0;
    while (b < N2) { if (en(a, b)) { const s = b; while (b < N2 && en(a, b)) b++; corr.push([s, b - 1]); } else b++; }
    const nuevos = new Map();
    for (const [s, e] of corr) { const k = s + ',' + e, r = abiertos.get(k); if (r && r.a1 === a - 1) { r.a1 = a; nuevos.set(k, r); } else { const n = { a0: a, a1: a, b0: s, b1: e }; out.push(n); nuevos.set(k, n); } }
    abiertos.clear(); nuevos.forEach((v, k) => abiertos.set(k, v));
  }
  // a = fila (y) si porFilas; b = columna (x)
  return out.map(r => porFilas ? { x0: r.b0, x1: r.b1, y0: r.a0, y1: r.a1 } : { x0: r.a0, x1: r.a1, y0: r.b0, y1: r.b1 });
}
const largoR = r => Math.max(r.x1 - r.x0 + 1, r.y1 - r.y0 + 1), cortoR = r => Math.min(r.x1 - r.x0 + 1, r.y1 - r.y0 + 1);
const salida = [];
for (const m of A.muros) {
  if (m.cajas.length === 1) { salida.push(m); continue; }
  const bx0 = Math.min(...m.cajas.map(r => r[0])), by0 = Math.min(...m.cajas.map(r => r[1]));
  const W = Math.round((Math.max(...m.cajas.map(r => r[2])) - bx0) / R), H = Math.round((Math.max(...m.cajas.map(r => r[3])) - by0) / R);
  const region = new Uint8Array(W * H);
  for (const r of m.cajas) for (let y = Math.round((r[1] - by0) / R); y < Math.round((r[3] - by0) / R); y++) for (let x = Math.round((r[0] - bx0) / R); x < Math.round((r[2] - bx0) / R); x++) region[y * W + x] = 1;
  // candidatos: barras de ambas descomposiciones, de las más largas a las más cortas
  const cand = [...rectsDeCeldas(region, W, H, true), ...rectsDeCeldas(region, W, H, false)].filter(r => largoR(r) >= 2 * cortoR(r)).sort((a, b) => largoR(b) - largoR(a));
  const tomado = new Uint8Array(W * H), piezas = [];
  for (const c of cand) {
    // celdas del candidato que todavía están libres
    const libre = new Uint8Array(W * H); let n = 0;
    for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) if (!tomado[y * W + x]) { libre[y * W + x] = 1; n++; }
    if (n < 4) continue;
    const vert = (c.y1 - c.y0) > (c.x1 - c.x0);
    for (const p of rectsDeCeldas(libre, W, H, !vert)) {
      if (largoR(p) < 3) continue;
      piezas.push(p); for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) tomado[y * W + x] = 1;
    }
  }
  // lo que quedó sin asignar (encuentros chicos) se suma a una pieza vecina si la unión es un rectángulo exacto
  const resto = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) if (region[i] && !tomado[i]) resto[i] = 1;
  for (const q of rectsDeCeldas(resto, W, H, true)) {
    const u = piezas.find(p => { const ux0 = Math.min(p.x0, q.x0), ux1 = Math.max(p.x1, q.x1), uy0 = Math.min(p.y0, q.y0), uy1 = Math.max(p.y1, q.y1); return (ux1 - ux0 + 1) * (uy1 - uy0 + 1) === (p.x1 - p.x0 + 1) * (p.y1 - p.y0 + 1) + (q.x1 - q.x0 + 1) * (q.y1 - q.y0 + 1); });
    if (u) { u.x0 = Math.min(u.x0, q.x0); u.x1 = Math.max(u.x1, q.x1); u.y0 = Math.min(u.y0, q.y0); u.y1 = Math.max(u.y1, q.y1); } else piezas.push(q);
  }
  // Trocitos de encuentro (más cortos que dos espesores): se suman al vecino que tocan, extendiéndolo.
  const esp = Math.round(m.esp / R), toca = (p, q) => p.x0 <= q.x1 + 1 && q.x0 <= p.x1 + 1 && p.y0 <= q.y1 + 1 && q.y0 <= p.y1 + 1;
  for (let i = piezas.length - 1; i >= 0; i--) {
    const q = piezas[i]; if (largoR(q) >= 2 * esp || piezas.length === 1) continue;
    // Solo se suma si la unión es un rectángulo exacto: así no se pierde ni se inventa superficie.
    const area = p => (p.x1 - p.x0 + 1) * (p.y1 - p.y0 + 1);
    const exacto = p => (Math.max(p.x1, q.x1) - Math.min(p.x0, q.x0) + 1) * (Math.max(p.y1, q.y1) - Math.min(p.y0, q.y0) + 1) === area(p) + area(q);
    const v = piezas.filter(p => p !== q && toca(p, q) && exacto(p)).sort((a, b) => largoR(b) - largoR(a))[0]; if (!v) continue;
    v.x0 = Math.min(v.x0, q.x0); v.x1 = Math.max(v.x1, q.x1); v.y0 = Math.min(v.y0, q.y0); v.y1 = Math.max(v.y1, q.y1);
    piezas.splice(i, 1);
  }
  piezas.sort((a, b) => a.x0 - b.x0 || a.y0 - b.y0);
  piezas.forEach((p, k) => {
    const r = [bx0 + p.x0 * R, by0 + p.y0 * R, bx0 + (p.x1 + 1) * R, by0 + (p.y1 + 1) * R].map(v => +v.toFixed(3));
    const planta = (r[2] - r[0]) * (r[3] - r[1]), largo = planta / m.esp, letra = String.fromCharCode(97 + k);
    salida.push({ ...m, id: m.id + letra, nombre: m.nombre + letra, cajas: [r], planta: +planta.toFixed(4), largo: +largo.toFixed(2), sup: +(largo * m.alto).toFixed(2), vol: +(planta * m.alto).toFixed(3), origen: m.nombre });
  });
}
const antes = A.muros.reduce((a, m) => a + m.sup, 0), despues = salida.reduce((a, m) => a + m.sup, 0);
A.muros = salida;
fs.writeFileSync('albanileria.json', JSON.stringify(A));
console.log('muros', salida.length, '| m² antes', antes.toFixed(1), 'después', despues.toFixed(1), '| tramos de muros compuestos', salida.filter(m => m.origen).length, '| tramos menores a 20 cm', salida.filter(m => m.largo < 0.2).length);
