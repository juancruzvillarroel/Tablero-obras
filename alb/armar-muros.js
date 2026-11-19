// Albañilería desde RICH_ALB_MUROS.dwg (convertido a DXF con accoreconsole).
// Capas: "1.3 LAD 12 PORTANTE" (rosa), "1.2 LAD 12" (celeste), "1.1 LAD 8" (naranja); "1.4 ESTRUCTURA" ya existe.
// Mismo sistema de coordenadas que la sanitaria: x_modelo = x − 41,511; y_modelo = y − y0_banda + 25,589.
// Cada polilínea es el contorno exacto del muro (se respetan sus filos). Las abiertas se cierran uniendo
// el último punto con el primero (el tramo que falta es el que apoya contra otro muro o columna).
const fs = require('fs');
const d = require('./muros.json');
const tab = JSON.parse(fs.readFileSync('../skp/tablero-datos.json'));
const Z = Object.fromEntries(tab.niveles.map(n => [n.id, n.z]));
const TIPOS = {
  '1.3 LAD 12 PORTANTE': { tipo: 'portante12', nombre: 'Ladrillo portante 12', esp: 0.15 },
  '1.2 LAD 12': { tipo: 'hueco12', nombre: 'Ladrillo hueco 12', esp: 0.15 },
  '1.1 LAD 8': { tipo: 'hueco8', nombre: 'Ladrillo hueco 8', esp: 0.10 },
};
const BANDAS = [
  { y0: 105, pisos: [{ id: 'PB', z: 0, techo: 'sPB' }] },
  { y0: 90, pisos: [{ id: 'P1', z: Z.sPB, techo: 's1' }, { id: 'P2', z: Z.s1, techo: 's2' }, { id: 'P3', z: Z.s2, techo: 's3' }] },
  { y0: 75, pisos: [{ id: 'P4', z: Z.s3, techo: 's4' }] },
  { y0: 60, pisos: [{ id: 'P5', z: Z.s4, techo: 's5', libre: 2.0 }] },     // azotea: sin losa arriba, muro de 2,00 m
  { y0: 45, pisos: [{ id: 'SM', z: Z.s5, techo: 'sSM' }] },                // sala de máquinas
];
const aM = (x, y, y0) => [+(x - 41.511).toFixed(4), +(y - y0 + 25.589).toFixed(4)];
const area = l => l.reduce((a, p, i) => { const q = l[(i + 1) % l.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
const dentro = (x, y, l) => { let c = false; for (let i = 0, j = l.length - 1; i < l.length; j = i++) { const [xi, yi] = l[i], [xj, yj] = l[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };

// Estructura: triángulos por nivel para medir el fondo de losas y vigas sobre cada punto del muro
const TRI = {};
for (const e of tab.elementos.filter(e => ['losa', 'viga', 'escalera'].includes(e.t))) {
  const v = e.v; const lista = TRI[e.l] ||= [];
  for (let i = 0; i < v.length; i += 9) {
    const t = [[v[i] / 100, v[i + 1] / 100, v[i + 2] / 100], [v[i + 3] / 100, v[i + 4] / 100, v[i + 5] / 100], [v[i + 6] / 100, v[i + 7] / 100, v[i + 8] / 100]];
    lista.push({ t, x0: Math.min(t[0][0], t[1][0], t[2][0]), x1: Math.max(t[0][0], t[1][0], t[2][0]), y0: Math.min(t[0][1], t[1][1], t[2][1]), y1: Math.max(t[0][1], t[1][1], t[2][1]) });
  }
}
function fondoEn(nivel, x, y) {   // z más baja de la estructura de ese nivel sobre el punto (fondo de losa o de viga)
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
  const pl = d.entities.filter(e => e.type === 'LWPOLYLINE' && TIPOS[e.layer] && e.vertices[0].y >= B.y0 && e.vertices[0].y < B.y0 + 15);
  // Polígonos (en coordenadas del modelo), cerrando los abiertos
  let polis = pl.map(e => {
    let v = e.vertices.map(p => aM(p.x, p.y, B.y0)).filter((p, i, a) => !i || Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > 1e-4);
    if (v.length > 2 && Math.hypot(v[0][0] - v[v.length - 1][0], v[0][1] - v[v.length - 1][1]) < 1e-4) v.pop();
    if (!e.shape && v.length >= 2) {
      // Contorno abierto: el tramo que falta se cierra corto y recto; si es diagonal, en ángulo recto (como sigue
      // el muro); si es largo y recto, el contorno marca un nicho entre muros y no es un muro.
      const [x0, y0] = v[0], [x1, y1] = v[v.length - 1], dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
      if (Math.hypot(dx, dy) > 0.2) {
        if (dx > 0.03 && dy > 0.03) {
          const c1 = [...v, [x0, y1]], c2 = [...v, [x1, y0]];
          v = Math.abs(area(c1)) >= Math.abs(area(c2)) ? c1 : c2;
        } else { avisos.push(`Banda ${B.y0}: contorno abierto de ${e.layer} tomado como nicho (no muro).`); return null; }
      }
    }
    return { capa: e.layer, v, cerrada: !!e.shape, huecos: [] };
  }).filter(p => p && p.v.length >= 3 && Math.abs(area(p.v)) > 1e-4);
  // Polígonos dentro de otro de la misma capa: son huecos (ej. la caja de la sala de máquinas)
  polis.sort((a, b) => Math.abs(area(b.v)) - Math.abs(area(a.v)));
  for (const p of polis.slice()) {
    const madre = polis.find(q => q !== p && q.capa === p.capa && !q.esHueco && Math.abs(area(q.v)) > Math.abs(area(p.v)) && p.v.every(([x, y]) => dentro(x, y, q.v)));
    if (madre) { madre.huecos.push(p.v); p.esHueco = true; }
  }
  polis = polis.filter(p => !p.esHueco);
  for (const P of B.pisos) {
    let n = 0;
    for (const p of polis) {
      const T = TIPOS[p.capa];
      const sup = Math.abs(area(p.v)) - p.huecos.reduce((a, h) => a + Math.abs(area(h)), 0);
      // Altura: se toma el fondo de la estructura de arriba en puntos del muro y se usa el valor más repetido
      const xs = p.v.map(q => q[0]), ys = p.v.map(q => q[1]);
      const bx0 = Math.min(...xs), bx1 = Math.max(...xs), by0 = Math.min(...ys), by1 = Math.max(...ys);
      const paso = Math.max(0.04, Math.sqrt((bx1 - bx0) * (by1 - by0) / 600));
      const tops = {};
      for (let x = bx0 + paso / 2; x < bx1; x += paso) for (let y = by0 + paso / 2; y < by1; y += paso) {
        if (!dentro(x, y, p.v) || p.huecos.some(h => dentro(x, y, h))) continue;
        let z = fondoEn(P.techo, x, y);
        if (!isFinite(z) || z - P.z > 4 || z <= P.z + 0.3) z = P.z + (P.libre || 2.6);
        const k = Math.round(z * 100); tops[k] = (tops[k] || 0) + 1;
      }
      const top = Object.keys(tops).length ? +Object.entries(tops).sort((a, b) => b[1] - a[1])[0][0] / 100 : P.z + (P.libre || 2.6);
      const alto = top - P.z, largo = sup / T.esp;
      muros.push({
        id: `${P.id}-${String(++n).padStart(2, '0')}`, nombre: `M-${P.id}-${String(n).padStart(2, '0')}`, piso: P.id, tipo: T.tipo, nombreTipo: T.nombre, esp: T.esp,
        v: p.v, huecos: p.huecos, z0: +P.z.toFixed(3), z1: +top.toFixed(3), alto: +alto.toFixed(3), planta: +sup.toFixed(4),
        largo: +largo.toFixed(2), sup: +(largo * alto).toFixed(2), vol: +(sup * alto).toFixed(3), cerrada: p.cerrada,
        sinLosa: !!P.libre && Math.abs(alto - P.libre) < 0.01,
      });
    }
  }
}
fs.writeFileSync('albanileria.json', JSON.stringify({ muros, avisos }));
const res = {}; muros.forEach(m => { const k = m.piso.padEnd(3) + ' ' + m.tipo; res[k] ||= [0, 0, 0]; res[k][0]++; res[k][1] += m.sup; res[k][2] += m.alto; });
for (const k of Object.keys(res).sort()) console.log(k.padEnd(16), String(res[k][0]).padStart(3), 'muros', res[k][1].toFixed(1).padStart(7), 'm²', ' alto medio', (res[k][2] / res[k][0]).toFixed(2));
console.log('total', muros.length, 'muros', muros.reduce((a, m) => a + m.sup, 0).toFixed(1), 'm²');
console.log('abiertas cerradas a mano:', muros.filter(m => !m.cerrada).length);
