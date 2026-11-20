// Condarco 3187: arma los datos del tablero a partir del volcado del SketchUp (skp.json).
// El modelo tiene tres grupos de primer nivel:
// - CDC_ES: un grupo por losa ("01_SOBRE PLANTA BAJA", "03_SOBRE 7°"…) con COLUMNAS, VIGAS y LOSAS adentro. Las plantas
//   1° a 6° son seis copias del mismo componente dentro de "02_SOBRE PLANTA TIPO 1°-6°".
// - s/SS: la losa sobre el subsuelo y lo que la sostiene (muros, tabiques y vigas), casi todo sin nombre.
// - BASES: las fundaciones, casi todas sin nombre ("Componente#8"); algunas con nombre (B06) partidas en zapata y tronco.
// A qué losa pertenece cada pieza se decide por la cota de su cara de arriba: las columnas y tabiques van con la losa
// que sostienen, como en las otras obras. Las piezas sin nombre se clasifican por su forma y se nombran con el número
// de componente del SketchUp ("Base #8") para poder encontrarlas en el modelo.
const fs = require('fs');
const s = JSON.parse(fs.readFileSync('skp.json'));
// Caras hacia afuera en todas las piezas (hay caras invertidas y grupos espejados en el modelo).
const orientacion = require('../skp/orientar.js')(s);
console.log('caras orientadas en', orientacion.cambiadas, 'de', orientacion.mallas, 'mallas;', orientacion.abiertas, 'abiertas sin tocar');

const NIVELES = [
  { id: 'base', nombre: 'Fundación', z: -4.15, piso: 'Fundación' },
  { id: 'sSS', nombre: 'Losa s/ subsuelo', z: -0.30, piso: 'Subsuelo' },
  { id: 'sPB', nombre: 'Losa s/ PB', z: 3.00, piso: 'Planta baja' },
  { id: 's1', nombre: 'Losa s/ 1° piso', z: 5.84, piso: '1° piso' },
  { id: 's2', nombre: 'Losa s/ 2° piso', z: 8.68, piso: '2° piso' },
  { id: 's3', nombre: 'Losa s/ 3° piso', z: 11.52, piso: '3° piso' },
  { id: 's4', nombre: 'Losa s/ 4° piso', z: 14.36, piso: '4° piso' },
  { id: 's5', nombre: 'Losa s/ 5° piso', z: 17.20, piso: '5° piso' },
  { id: 's6', nombre: 'Losa s/ 6° piso', z: 20.04, piso: '6° piso' },
  { id: 's7', nombre: 'Losa s/ 7° piso', z: 22.88, piso: '7° piso' },
  { id: 's8', nombre: 'Losa s/ 8° piso', z: 25.72, piso: '8° piso' },
  { id: 's9', nombre: 'Losa s/ 9° piso', z: 28.64, piso: '9° piso' },
  { id: 's10', nombre: 'Losa s/ 10° piso', z: 31.49, piso: '10° piso' },
  { id: 'sSM', nombre: 'Techo S.M.', z: 34.34, piso: 'Sala de máquinas' },
];
const CAT = { COLUMNAS: 'columna', VIGAS: 'viga', LOSAS: 'losa' };

const caja = tris => { const b = [[1e9, -1e9], [1e9, -1e9], [1e9, -1e9]]; tris.forEach(t => t.forEach(p => p.forEach((v, i) => { b[i][0] = Math.min(b[i][0], v); b[i][1] = Math.max(b[i][1], v); }))); return b; };
const volMalla = tris => tris.reduce((a, [p, q, r]) => a + (p[0] * (q[1] * r[2] - q[2] * r[1]) - p[1] * (q[0] * r[2] - q[2] * r[0]) + p[2] * (q[0] * r[1] - q[1] * r[0])) / 6, 0);
// Losa a la que pertenece una pieza: la de cota más cercana a su cara superior (las losas bajadas de los baños y
// balcones, 35 cm abajo, quedan igual con la suya).
const nivelPorZ = z => NIVELES.filter(n => n.id !== 'base').sort((a, b) => Math.abs(a.z - z) - Math.abs(b.z - z))[0].id;

// "C01 100x20" → C01 y sección 100x20; "L9 h12" → L9, h=12; "M3 15" → tabique M3 de 15.
// Lo que no empieza con un código (letra y número, como "viga borde frente") queda entero como nombre.
function parsear(hoja, tipo) {
  const n = hoja.trim().replace(/\(|\)/g, '').replace(/X/g, 'x');
  const m = n.match(/^([A-Za-z]{1,3}\d+[A-Za-z]?)\s*(.*)$/);
  if (!m) return { nombre: n.charAt(0).toUpperCase() + n.slice(1), seccion: '', tipo };
  let [, nombre, seccion] = m; seccion = seccion.replace(/^-\s*/, '');
  if (/^h\d+/.test(seccion)) seccion = 'h=' + seccion.slice(1);
  if (tipo === 'columna' && /^[TM]\d/.test(nombre)) tipo = 'tabique';     // T y M = tabiques de H°A
  return { nombre, seccion, tipo };
}
const numComp = r => (r.match(/Componente#(\d+)/) || [])[1];
const avisos = [];

// Caras internas: la base "Componente#15" tiene una cara horizontal suelta adentro (entre la zapata y el tronco) que
// rompe el cálculo de volumen (daba casi cero en vez de 3,2 m³). Si una pieza da mucho menos volumen que su relleno
// medido por columnas verticales, se sacan las caras horizontales que tienen pieza arriba y abajo.
const zsEn = (tris, x, y) => { const zs = []; for (const [a, b, c] of tris) { const den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]); if (Math.abs(den) < 1e-12) continue; const l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / den, l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / den, l3 = 1 - l1 - l2; if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue; zs.push(l1 * a[2] + l2 * b[2] + l3 * c[2]); } return zs; };
function rellenoPorColumnas(tris, h = 0.05) {
  const b = caja(tris); let v = 0;
  for (let x = b[0][0] + h / 2; x < b[0][1]; x += h) for (let y = b[1][0] + h / 2; y < b[1][1]; y += h) { const zs = zsEn(tris, x, y); if (zs.length >= 2) v += (Math.max(...zs) - Math.min(...zs)) * h * h; }
  return v;
}
function sinCarasInternas(m) {
  const v = Math.abs(volMalla(m.tris)), lleno = rellenoPorColumnas(m.tris); if (v >= 0.5 * lleno) return m.tris;
  const plana = t => Math.abs(t[0][2] - t[1][2]) < 1e-4 && Math.abs(t[0][2] - t[2][2]) < 1e-4;
  const quedan = m.tris.filter(t => { if (!plana(t)) return true; const zs = zsEn(m.tris, (t[0][0] + t[1][0] + t[2][0]) / 3, (t[0][1] + t[1][1] + t[2][1]) / 3), z = t[0][2]; return !(zs.some(w => w < z - 1e-3) && zs.some(w => w > z + 1e-3)); });
  avisos.push(`${m.ruta.join(' > ')}: caras internas sacadas (${fmtN(v)} → ${fmtN(Math.abs(volMalla(quedan)))} m³)`);
  return quedan;
}
const fmtN = x => x.toFixed(2);
const solido = new Map(s.objetos.map(o => [o.ruta.join('/'), o.solido]));
for (const m of s.mallas) if (m.tris.length && solido.get(m.ruta.join('/')) === false) m.tris = sinCarasInternas(m);

// Losas partidas: en "01_SOBRE PLANTA BAJA > LOSAS" la cara de arriba de L9 está en su grupo y los costados y el
// fondo quedaron sueltos en el grupo LOSAS. Las caras sueltas se suman a la losa de ese grupo cuya planta tocan.
const sueltas = s.mallas.filter(m => m.tris.length && m.ruta[0] === 'CDC_ES' && CAT[m.ruta.at(-1)]);
for (const m of sueltas) {
  const b = caja(m.tris);
  const dueña = s.mallas.find(o => o !== m && o.tris.length && o.ruta.length === m.ruta.length + 1 && o.ruta.slice(0, -1).join('/') === m.ruta.join('/') && (() => { const c = caja(o.tris); return [0, 1].every(k => c[k][0] >= b[k][0] - 0.01 && c[k][1] <= b[k][1] + 0.01) && Math.abs(c[0][1] - c[0][0] - (b[0][1] - b[0][0])) < 0.02 && Math.abs(c[1][1] - c[1][0] - (b[1][1] - b[1][0])) < 0.02; })());
  if (dueña) {
    // Sin caras repetidas: las dos partes traen la cara de arriba
    const clave = t => t.map(p => p.join(',')).sort().join('|'), vistas = new Set();
    dueña.tris = dueña.tris.concat(m.tris).filter(t => { const k = clave(t); if (vistas.has(k)) return false; vistas.add(k); return true; });
    dueña.partida = true; m.tris = [];
  }
}

const elementos = {};
const agregar = (clave, datos, tris) => { (elementos[clave] ||= { ...datos, tris: [] }).tris.push(...tris); };
for (const m of s.mallas) {
  if (!m.tris.length) continue;
  const r = m.ruta, b = caja(m.tris), zTop = b[2][1], dx = b[0][1] - b[0][0], dy = b[1][1] - b[1][0], dz = b[2][1] - b[2][0];
  const largo = Math.max(dx, dy), ancho = Math.min(dx, dy);
  if (dz < 0.005) continue;                                               // planos sueltos (la referencia del CAD)
  if (r[0] === 'BASES') {
    // Con nombre (B06): zapata y tronco juntos. Sin nombre: alargada y baja es viga de fundación (las de abajo,
    // zapatas corridas; las de -0,35, encadenados); el resto, base con su tronco.
    if (/^B\d/.test(r[1])) { agregar(`base|${r[1]}`, { nivel: 'base', nombre: r[1], seccion: '', tipo: 'base' }, m.tris); continue; }
    const n = numComp(r[1]), vf = largo >= 2.5 * ancho && dz <= 1.4;
    agregar(`base|${r[1]}`, { nivel: 'base', nombre: `${vf ? 'VF' : 'Base'} #${n}`, seccion: '', tipo: vf ? 'viga_fundacion' : 'base' }, m.tris);
    continue;
  }
  if (r[0] === 's/SS') {
    // Losas con nombre (L1 S/SS). Sin nombre: la platea del fondo (fina y abajo), los muros y tabiques del subsuelo
    // (toda la altura) y las vigas bajo la losa.
    const n = numComp(r[1]);
    if (/^L\d/.test(r[1])) { agregar(`sSS|losa|${r[1]}`, { nivel: 'sSS', ...parsear(r[1].replace(/\s*S\/SS$/i, ''), 'losa'), tipo: 'losa' }, m.tris); continue; }
    if (dz <= 0.15 && zTop < -2) { agregar(`base|platea|${n}`, { nivel: 'base', nombre: `Platea subsuelo #${n}`, seccion: '', tipo: 'losa' }, m.tris); continue; }
    if (dz >= 2) { agregar(`sSS|tabique|${n}`, { nivel: 'sSS', nombre: `Muro SS #${n}`, seccion: '', tipo: 'tabique' }, m.tris); continue; }
    const p = /^V\d/.test(r[1]) ? parsear(r[1], 'viga') : { nombre: `Viga SS #${n}`, seccion: '' };
    agregar(`sSS|viga|${p.nombre}`, { nivel: 'sSS', ...p, tipo: 'viga' }, m.tris);
    continue;
  }
  if (r[0] !== 'CDC_ES') { avisos.push('Fuera de los grupos conocidos: ' + r.join(' > ')); continue; }
  const k = r.findIndex(x => CAT[x]);
  if (k < 0 || !r[k + 1]) { avisos.push('Sin categoría: ' + r.join(' > ')); continue; }
  const nivel = nivelPorZ(zTop), p = parsear(r[k + 1], CAT[r[k]]);
  agregar(`${nivel}|${r[k]}|${r[k + 1]}`, { nivel, ...p }, m.tris);
}

// Piezas con el mismo nombre en el mismo nivel pero separadas: cada una aparte (salvo zapata + tronco de una base).
const lista = [];
for (const e of Object.values(elementos)) {
  const grupos = [];
  for (const t of e.tris) {
    const bt = caja([t]);
    let g = grupos.find(g => [0, 1, 2].every(k => bt[k][0] <= g.b[k][1] + 0.01 && bt[k][1] >= g.b[k][0] - 0.01));
    if (!g) { g = { tris: [], b: bt.map(x => x.slice()) }; grupos.push(g); }
    g.tris.push(t); for (let k = 0; k < 3; k++) { g.b[k][0] = Math.min(g.b[k][0], bt[k][0]); g.b[k][1] = Math.max(g.b[k][1], bt[k][1]); }
  }
  for (let cambio = true; cambio;) {
    cambio = false;
    for (let i = 0; i < grupos.length && !cambio; i++) for (let j = i + 1; j < grupos.length && !cambio; j++) {
      const a = grupos[i].b, c = grupos[j].b;
      if ([0, 1, 2].every(k => a[k][0] <= c[k][1] + 0.01 && a[k][1] >= c[k][0] - 0.01)) {
        grupos[i].tris.push(...grupos[j].tris); for (let k = 0; k < 3; k++) { a[k][0] = Math.min(a[k][0], c[k][0]); a[k][1] = Math.max(a[k][1], c[k][1]); }
        grupos.splice(j, 1); cambio = true;
      }
    }
  }
  if (grupos.length === 1 || e.tipo === 'base') lista.push(e);
  else grupos.sort((a, b) => a.b[0][0] - b.b[0][0] || a.b[1][0] - b.b[1][0]).forEach((g, i) => lista.push({ ...e, nombre: e.nombre + '-' + (i + 1), tris: g.tris }));
}

const r2 = x => Math.round(x * 100) / 100;
const ORDEN = NIVELES.map(n => n.id);
lista.sort((a, b) => ORDEN.indexOf(a.nivel) - ORDEN.indexOf(b.nivel) || a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
const vistos = {};
const els = lista.map(e => {
  const b = caja(e.tris), tris = e.tris;
  let vol = Math.round(Math.abs(volMalla(tris)) * 1000) / 1000;
  let area = 0;
  for (const [p, q, t] of tris) {
    if (e.tipo !== 'losa' || [p, q, t].some(v => Math.abs(v[2] - b[2][1]) > 0.005)) continue;
    const ux = q[0] - p[0], uy = q[1] - p[1], vx = t[0] - p[0], vy = t[1] - p[1]; area += Math.abs(ux * vy - uy * vx) / 2;
  }
  // Losa que no cierra (le falta el fondo, como L9 de PB): si el espesor que da no es el de su nombre (h=12), el
  // hormigón es la planta por ese espesor.
  const h = e.tipo === 'losa' && /^h=(\d+)/.test(e.seccion) ? +e.seccion.slice(2) / 100 : null;
  if (h && area > 0 && Math.abs(vol / area - h) > 0.03) {
    // La planta se mide por muestreo (cada 2 cm), porque las dos partes traen cada una su cara de arriba
    let n = 0; const p = 0.02; for (let x = b[0][0] + p / 2; x < b[0][1]; x += p) for (let y = b[1][0] + p / 2; y < b[1][1]; y += p) if (zsEn(tris, x, y).length) n++;
    area = n * p * p;
    avisos.push(`${e.nivel} ${e.nombre}: la malla no cierra (${fmtN(vol)} m³); se toma planta × espesor = ${fmtN(area)} m² × ${h} = ${fmtN(area * h)} m³`); vol = Math.round(area * h * 1000) / 1000;
  }
  const lx = b[0][1] - b[0][0], ly = b[1][1] - b[1][0], lz = b[2][1] - b[2][0];
  const base = `${e.nivel}-${e.nombre}`; vistos[base] = (vistos[base] || 0) + 1;
  return {
    id: vistos[base] > 1 ? `${base}-${vistos[base]}` : base, n: e.nombre, t: e.tipo, l: e.nivel, s: e.seccion,
    vol, area: e.tipo === 'losa' ? r2(area) : undefined,
    largo: ['viga', 'viga_fundacion', 'tabique'].includes(e.tipo) ? r2(Math.max(lx, ly)) : undefined,
    alto: ['columna', 'tabique'].includes(e.tipo) ? r2(lz) : undefined,
    zc: r2((b[2][0] + b[2][1]) / 2),
    v: tris.flat(2).map(x => Math.round(x * 100)),
  };
});
const out = {
  proyecto: { nombre: 'Condarco 3187', fuente: 'CDC_MODELADO ESTRUCTURAL.skp' },
  niveles: NIVELES.map(n => ({ id: n.id, nombre: n.nombre, z: n.z, corto: n.id === 'base' ? 'Fundación' : n.id === 'sSM' ? 'Techo S.M.' : n.nombre.replace('Losa s/ ', 'S/ ').replace(' piso', ''), piso: n.piso })),
  notas: [],
  elementos: els,
};
fs.writeFileSync('tablero-datos.json', JSON.stringify(out));
if (avisos.length) console.log(avisos.join('\n'));
const res = {}; els.forEach(e => { const k = e.l.padEnd(4) + ' ' + e.t; res[k] ||= [0, 0]; res[k][0]++; res[k][1] += e.vol; });
Object.keys(res).sort((a, b) => ORDEN.indexOf(a.split(' ')[0]) - ORDEN.indexOf(b.split(' ')[0])).forEach(k => console.log(k.padEnd(22), String(res[k][0]).padStart(3), res[k][1].toFixed(2)));
console.log(els.length, 'elementos', els.reduce((a, e) => a + e.vol, 0).toFixed(1), 'm³', (fs.statSync('tablero-datos.json').size / 1024).toFixed(0) + ' KB');

// Hormigón compartido entre piezas: se descuenta una sola vez (ver superposiciones.js).
require('child_process').execFileSync(process.execPath, [require('path').join(__dirname, '..', 'superposiciones.js'), 'tablero-datos.json'], { cwd: __dirname, stdio: 'inherit' });
