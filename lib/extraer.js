// Libertador 3174: arma los datos del tablero a partir del volcado del SketchUp (skp.json).
// El modelo tiene un grupo por nivel ("0 FUNDACIONES (fondo -2.50)", "2 PRIMER PISO (losa s/PB +3.14)"…) y adentro
// uno por categoría (Vigas, Losas, Columnas, Tabiques, Pases; en fundaciones Bases, Tensores y Vigas de fundacion),
// con una pieza por grupo. Cada grupo de nivel trae la losa y vigas de su cota y las columnas que arrancan arriba de
// ella; en el tablero las columnas y tabiques van con la losa que sostienen, así que el nivel se decide por la cara de
// arriba de cada pieza y no por el grupo. Los pases son huecos en la losa, no hormigón: no se cuentan.
const fs = require('fs');
const s = JSON.parse(fs.readFileSync('skp.json'));
// Caras hacia afuera en todas las piezas (por si hay caras invertidas o grupos espejados).
const orientacion = require('../skp/orientar.js')(s);
console.log('caras orientadas en', orientacion.cambiadas, 'de', orientacion.mallas, 'mallas;', orientacion.abiertas, 'abiertas sin tocar');

const NIVELES = [
  { id: 'base', nombre: 'Fundación', z: -2.5, piso: 'Fundación' },
  { id: 'sPB', nombre: 'Losa s/ PB', z: 3.14, piso: 'Planta baja' },
  { id: 's1', nombre: 'Losa s/ 1° piso', z: 5.97, piso: '1° piso' },
  { id: 's2', nombre: 'Losa s/ 2° piso', z: 8.80, piso: '2° piso' },
  { id: 's3', nombre: 'Losa s/ 3° piso (azotea)', z: 11.63, piso: '3° piso' },
  { id: 'sSM', nombre: 'Techo S.M.', z: 14.43, piso: 'Azotea y sala de máquinas' },
];
const CAT = { Columnas: 'columna', Tabiques: 'tabique', Vigas: 'viga', Losas: 'losa', Bases: 'base', Tensores: 'viga_fundacion', 'Vigas de fundacion': 'viga_fundacion' };

const caja = tris => { const b = [[1e9, -1e9], [1e9, -1e9], [1e9, -1e9]]; tris.forEach(t => t.forEach(p => p.forEach((v, i) => { b[i][0] = Math.min(b[i][0], v); b[i][1] = Math.max(b[i][1], v); }))); return b; };
const volMalla = tris => tris.reduce((a, [p, q, r]) => a + (p[0] * (q[1] * r[2] - q[2] * r[1]) - p[1] * (q[0] * r[2] - q[2] * r[0]) + p[2] * (q[0] * r[1] - q[1] * r[0])) / 6, 0);
// Losa a la que pertenece una pieza: la de cota más cercana a su cara superior (las vigas invertidas de la azotea
// suben por encima de la losa, por eso es la más cercana y no la de abajo).
const nivelPorZ = z => NIVELES.filter(n => n.id !== 'base').sort((a, b) => Math.abs(a.z - z) - Math.abs(b.z - z))[0].id;

const elementos = {}, avisos = [];
const agregar = (clave, datos, tris) => { (elementos[clave] ||= { ...datos, tris: [] }).tris.push(...tris); };
for (const m of s.mallas) {
  if (!m.tris.length) continue;
  const [grupo, cat, hoja = cat] = m.ruta, tipo = CAT[cat];
  if (cat === 'Pases') continue;
  if (!tipo) { avisos.push('Sin categoría: ' + m.ruta.join(' > ')); continue; }
  const fundacion = /^0 FUNDACIONES/.test(grupo), losaTerreno = /LOSA S\/TERRENO/i.test(hoja);
  // La losa sobre terreno natural es el piso de planta baja, apoyada en el suelo: va con la fundación.
  const nivel = fundacion || losaTerreno ? 'base' : nivelPorZ(caja(m.tris)[2][1]);
  const nombre = losaTerreno ? 'Losa s/ terreno' : hoja.trim();
  agregar(`${nivel}|${tipo}|${nombre}`, { nivel, nombre, seccion: '', tipo }, m.tris);
}

// Piezas con el mismo nombre en el mismo nivel pero separadas: cada una aparte.
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
  if (grupos.length === 1) lista.push(e);
  else grupos.sort((a, b) => a.b[0][0] - b.b[0][0] || a.b[1][0] - b.b[1][0]).forEach((g, i) => lista.push({ ...e, nombre: e.nombre + '-' + (i + 1), tris: g.tris }));
}

const r2 = x => Math.round(x * 100) / 100;
const ORDEN = NIVELES.map(n => n.id);
lista.sort((a, b) => ORDEN.indexOf(a.nivel) - ORDEN.indexOf(b.nivel) || a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
const vistos = {};
const els = lista.map(e => {
  const b = caja(e.tris), tris = e.tris;
  const vol = Math.round(Math.abs(volMalla(tris)) * 1000) / 1000;
  let area = 0;
  for (const [p, q, t] of tris) {
    if (e.tipo !== 'losa' || [p, q, t].some(v => Math.abs(v[2] - b[2][1]) > 0.005)) continue;
    const ux = q[0] - p[0], uy = q[1] - p[1], vx = t[0] - p[0], vy = t[1] - p[1]; area += Math.abs(ux * vy - uy * vx) / 2;
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
  proyecto: { nombre: 'Libertador 3174', fuente: 'LIB_3D_ESTRUCTURA.skp' },
  niveles: NIVELES.map(n => ({ id: n.id, nombre: n.nombre, z: n.z, corto: n.id === 'base' ? 'Fundación' : n.id === 'sSM' ? 'Techo S.M.' : n.nombre.replace('Losa s/ ', 'S/ ').replace(' piso', '').replace(' (azotea)', ' · azotea'), piso: n.piso })),
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
