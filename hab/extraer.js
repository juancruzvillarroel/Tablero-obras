// Habana 3329: arma los datos del tablero a partir del volcado del SketchUp (skp.json).
// El modelo tiene un grupo por losa ("01_SOBRE PLANTA BAJA", "03_SOBRE 5°"…) con COLUMNAS, VIGAS y LOSAS adentro.
// Las plantas tipo 2° a 4° son tres copias del mismo componente dentro de "02_SOBRE PLANTA TIPO 1° a 4°": a qué losa
// pertenece cada pieza se decide por su altura. Las columnas y tabiques van con la losa que sostienen (su cara de arriba).
const fs = require('fs');
const s = JSON.parse(fs.readFileSync('skp.json'));
// Caras hacia afuera en todas las piezas (hay caras invertidas y grupos espejados en el modelo).
const orientacion = require('../skp/orientar.js')(s);
console.log('caras orientadas en', orientacion.cambiadas, 'de', orientacion.mallas, 'mallas;', orientacion.abiertas, 'abiertas sin tocar');

const NIVELES = [
  { id: 'base', nombre: 'Fundación', z: -2.5, piso: 'Fundación' },
  { id: 'sPB', nombre: 'Losa s/ PB', z: 3.15, piso: 'Planta baja' },
  { id: 's1', nombre: 'Losa s/ 1° piso', z: 6.05, piso: '1° piso' },
  { id: 's2', nombre: 'Losa s/ 2° piso', z: 8.95, piso: '2° piso' },
  { id: 's3', nombre: 'Losa s/ 3° piso', z: 11.85, piso: '3° piso' },
  { id: 's4', nombre: 'Losa s/ 4° piso', z: 14.75, piso: '4° piso' },
  { id: 's5', nombre: 'Losa s/ 5° piso', z: 17.65, piso: '5° piso' },
  { id: 's6', nombre: 'Losa s/ 6° piso', z: 20.55, piso: '6° piso' },
  { id: 's7', nombre: 'Losa s/ 7° piso', z: 23.45, piso: '7° piso' },
  { id: 's8', nombre: 'Losa s/ azotea (8°)', z: 26.30, piso: 'Azotea (8°)' },
  { id: 'sSM', nombre: 'Techo S.M.', z: 28.90, piso: 'Sala de máquinas (9°)' },
];
const GRUPO = { '00_FUNDACIONES': 'base', '01_SOBRE PLANTA BAJA': 'sPB', '03_SOBRE 5°': 's5', '04_SOBRE 6°': 's6', '05_SOBRE 7°': 's7', '06_SOBRE 8°': 's8', '07_SOBRE SM': 'sSM' };
const CAT = { COLUMNAS: 'columna', VIGAS: 'viga', LOSAS: 'losa' };

const caja = tris => { const b = [[1e9, -1e9], [1e9, -1e9], [1e9, -1e9]]; tris.forEach(t => t.forEach(p => p.forEach((v, i) => { b[i][0] = Math.min(b[i][0], v); b[i][1] = Math.max(b[i][1], v); }))); return b; };
const volMalla = tris => tris.reduce((a, [p, q, r]) => a + (p[0] * (q[1] * r[2] - q[2] * r[1]) - p[1] * (q[0] * r[2] - q[2] * r[0]) + p[2] * (q[0] * r[1] - q[1] * r[0])) / 6, 0);
// Losa a la que pertenece una pieza de la planta tipo: la de cota más cercana a su cara superior.
const nivelPorZ = z => NIVELES.filter(n => n.id !== 'base').sort((a, b) => Math.abs(a.z - z) - Math.abs(b.z - z))[0].id;

function parsear(hoja, tipo) {
  let n = hoja.trim().replace(/\(|\)/g, '').replace(/X/g, 'x');
  if (/^B\s/.test(n)) n = n.replace(/^B\s+/, 'B');                      // "B T7" -> "BT7", "B 16" -> "B16"
  const m = n.match(/^(\S+)\s*(.*)$/); let nombre = m[1], seccion = (m[2] || '').replace(/^-\s*/, '');
  if (/^h\d+/.test(seccion)) seccion = 'h=' + seccion.slice(1);
  if (tipo === 'columna' && /^[TM]\d/.test(nombre)) tipo = 'tabique';    // T = tabique de H°A
  return { nombre, seccion, tipo };
}

const elementos = {};
const agregar = (clave, datos, tris) => { (elementos[clave] ||= { ...datos, tris: [] }).tris.push(...tris); };
const avisos = [];
for (const m of s.mallas) {
  if (!m.tris.length) continue;
  const r = m.ruta, b = caja(m.tris), zTop = b[2][1];
  if (r[0] === '00_FUNDACIONES') {
    // Bases, la platea del núcleo (L2 h100), la viga de fundación y las vigas de encadenado / tensores (Grupo#187).
    if (r[1] === 'BASES' && /^L\d/.test(r[2])) agregar(`base|${r[2]}`, { nivel: 'base', ...parsear(r[2], 'base'), tipo: 'base' }, m.tris);
    else if (r[1] === 'BASES') agregar(`base|${r[2]}`, { nivel: 'base', ...parsear(r[2], 'base'), tipo: 'base' }, m.tris);
    else agregar(`base|${r[1]}|${r[2]}`, { nivel: 'base', ...parsear(r[2], 'viga'), tipo: 'viga_fundacion' }, m.tris);
    continue;
  }
  let nivel = GRUPO[r[0]], cat, hoja, prof = 1;
  if (r[0] === '02_SOBRE PLANTA TIPO 1° a 4°') { prof = 2; nivel = r[1] === 'S1°' ? 's1' : null; }
  if (nivel === undefined) continue;                                      // referencias del CAD y piezas sueltas
  cat = r[prof]; hoja = r[prof + 1];
  if (!CAT[cat]) {
    // Pieza suelta dentro del nivel (Componente#19 de la sala de máquinas): escalera si está inclinada.
    hoja = r[prof]; cat = 'SUELTO';
  }
  if (!nivel) nivel = nivelPorZ(zTop);
  let p;
  if (cat === 'SUELTO') p = { nombre: 'Esc', seccion: '', tipo: 'escalera' };
  else p = parsear(hoja, CAT[cat]);
  agregar(`${nivel}|${cat}|${hoja}|${cat === 'SUELTO' ? '' : ''}`, { nivel, ...p }, m.tris);
}

// Piezas con el mismo nombre en el mismo nivel pero separadas (T1a son cuatro tabiques cortos): cada una aparte.
const lista = [];
for (const e of Object.values(elementos)) {
  const grupos = [];
  for (let i = 0; i < e.tris.length; i++) {
    const t = e.tris[i], bt = caja([t]);
    let g = grupos.find(g => bt[0][0] <= g.b[0][1] + 0.01 && bt[0][1] >= g.b[0][0] - 0.01 && bt[1][0] <= g.b[1][1] + 0.01 && bt[1][1] >= g.b[1][0] - 0.01 && bt[2][0] <= g.b[2][1] + 0.01 && bt[2][1] >= g.b[2][0] - 0.01);
    if (!g) { g = { tris: [], b: bt.map(x => x.slice()) }; grupos.push(g); }
    g.tris.push(t); for (let k = 0; k < 3; k++) { g.b[k][0] = Math.min(g.b[k][0], bt[k][0]); g.b[k][1] = Math.max(g.b[k][1], bt[k][1]); }
  }
  // fusionar grupos que se tocan (la búsqueda de arriba es golosa)
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
  if (grupos.length === 1 || e.tipo === 'base' && e.nombre.startsWith('L')) lista.push(e);
  else grupos.sort((a, b) => a.b[0][0] - b.b[0][0] || a.b[1][0] - b.b[1][0]).forEach((g, i) => lista.push({ ...e, nombre: e.nombre + '-' + (i + 1), tris: g.tris }));
}
// Escaleras: nombre por nivel
for (const nv of NIVELES) {
  const esc = lista.filter(e => e.nivel === nv.id && e.tipo === 'escalera');
  esc.forEach((e, i) => { e.nombre = `Esc ${nv.piso}${esc.length > 1 ? ' tramo ' + (i + 1) : ''}`; });
}

const r2 = x => Math.round(x * 100) / 100;
const ORDEN = NIVELES.map(n => n.id);
lista.sort((a, b) => ORDEN.indexOf(a.nivel) - ORDEN.indexOf(b.nivel) || a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
const vistos = {};
const els = lista.map(e => {
  const b = caja(e.tris), tris = e.tris;
  const vol = Math.round(Math.abs(volMalla(tris)) * 1000) / 1000;
  // Encofrado aproximado: caras verticales y fondos; nunca la cara superior (se hormigona contra el aire).
  let enc = 0, area = 0;
  for (const [p, q, t] of tris) {
    const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = t[0] - p[0], vy = t[1] - p[1], vz = t[2] - p[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const a = Math.hypot(nx, ny, nz) / 2; if (a < 1e-6) continue;
    const cz = (p[2] + q[2] + t[2]) / 3, vert = Math.abs(nz) / (2 * a) < 0.3, abajo = cz < (b[2][0] + b[2][1]) / 2;
    if (e.tipo === 'base' || e.tipo === 'viga_fundacion') { if (vert) enc += a; }
    else if (vert || (abajo && e.tipo !== 'columna' && e.tipo !== 'tabique')) enc += a;
    if (e.tipo === 'losa' && Math.abs(p[2] - b[2][1]) < 0.005 && Math.abs(q[2] - b[2][1]) < 0.005 && Math.abs(t[2] - b[2][1]) < 0.005) area += a;
  }
  const lx = b[0][1] - b[0][0], ly = b[1][1] - b[1][0], lz = b[2][1] - b[2][0];
  const base = `${e.nivel}-${e.nombre}`; vistos[base] = (vistos[base] || 0) + 1;
  return {
    id: vistos[base] > 1 ? `${base}-${vistos[base]}` : base, n: e.nombre, t: e.tipo, l: e.nivel, s: e.seccion,
    vol, enc: r2(enc), area: e.tipo === 'losa' ? r2(area) : undefined,
    largo: ['viga', 'viga_fundacion', 'tabique'].includes(e.tipo) ? r2(Math.max(lx, ly)) : undefined,
    alto: ['columna', 'tabique'].includes(e.tipo) ? r2(lz) : undefined,
    zc: r2((b[2][0] + b[2][1]) / 2),
    v: tris.flat(2).map(x => Math.round(x * 100)),
  };
});
const out = {
  proyecto: { nombre: 'Habana 3329', fuente: 'HAB_MODELADO ESTRUCTURAL edificio.skp', plano: 'HAB_ES.dwg' },
  niveles: NIVELES.map(n => ({ id: n.id, nombre: n.nombre, z: n.z, corto: n.id === 'base' ? 'Fundación' : n.id === 'sSM' ? 'Techo S.M.' : n.nombre.replace('Losa s/ ', 'S/ ').replace(' piso', ''), piso: n.piso })),
  notas: [],
  elementos: els,
};
fs.writeFileSync('tablero-datos.json', JSON.stringify(out));
const res = {}; els.forEach(e => { const k = e.l.padEnd(4) + ' ' + e.t; res[k] ||= [0, 0]; res[k][0]++; res[k][1] += e.vol; });
Object.keys(res).sort((a, b) => ORDEN.indexOf(a.split(' ')[0]) - ORDEN.indexOf(b.split(' ')[0])).forEach(k => console.log(k.padEnd(22), String(res[k][0]).padStart(3), res[k][1].toFixed(2)));
console.log(els.length, 'elementos', els.reduce((a, e) => a + e.vol, 0).toFixed(1), 'm³', (fs.statSync('tablero-datos.json').size / 1024).toFixed(0) + ' KB');
console.log('fundación:', els.filter(e => e.l === 'base').map(e => e.n + ' ' + e.s + ' ' + e.vol).join(' | '));

// Hormigón compartido entre piezas: se descuenta una sola vez (ver superposiciones.js).
require('child_process').execFileSync(process.execPath, [require('path').join(__dirname, '..', 'superposiciones.js'), 'tablero-datos.json'], { cwd: __dirname, stdio: 'inherit' });
