// Arma el modelo por elementos a partir del volcado de SketchUp (skp.json).
// El edificio está modelado dos veces en planta: versión A (y < 20) y versión B (y > 20).
// Las bases y vigas de fundación (Grupo#225) están corridas +20 m en x respecto de la versión B.
const fs = require('fs');
const s = JSON.parse(fs.readFileSync('skp.json'));
// Caras hacia afuera en todas las piezas (hay caras invertidas y grupos espejados en el modelo).
const orientacion = require('./orientar.js')(s);
console.log('caras orientadas en', orientacion.cambiadas, 'de', orientacion.mallas, 'mallas;', orientacion.abiertas, 'abiertas sin tocar');

const NIVELES = {
  '01_SOBRE PB': { id: 'sPB', nombre: 'Losa s/ PB' },
  '02_SOBRE 1°': { id: 's1', nombre: 'Losa s/ 1° piso' },
  '03_SOBRE 2°': { id: 's2', nombre: 'Losa s/ 2° piso' },
  '04_SOBRE 3°': { id: 's3', nombre: 'Losa s/ 3° piso' },
  '05_SOBRE 4°': { id: 's4', nombre: 'Losa s/ 4° piso' },
  '06_SOBRE 5°': { id: 's5', nombre: 'Losa s/ 5° (S.M.)' },
  '07_SOBRE SM': { id: 'sSM', nombre: 'Techo S.M.' },
};
const ORDEN = ['base', 'sPB', 's1', 's2', 's3', 's4', 's5', 'sSM'];

// Cota del nivel: la cara superior de losa más repetida (hay losas rebajadas y vigas invertidas).
const moda = a => { const c = {}; a.forEach(v => c[v] = (c[v] || 0) + 1); return +Object.entries(c).sort((x, y) => y[1] - x[1] || y[0] - x[0])[0][0]; };
const volMalla = tris => tris.reduce((a, [p, q, r]) =>
  a + (p[0] * (q[1] * r[2] - q[2] * r[1]) - p[1] * (q[0] * r[2] - q[2] * r[0]) + p[2] * (q[0] * r[1] - q[1] * r[0])) / 6, 0);
const centro = tris => { let x = 0, y = 0, z = 0, n = 0; tris.forEach(t => t.forEach(p => { x += p[0]; y += p[1]; z += p[2]; n++; })); return [x / n, y / n, z / n]; };
const caja = tris => { const b = [[1e9, -1e9], [1e9, -1e9], [1e9, -1e9]]; tris.forEach(t => t.forEach(p => p.forEach((v, i) => { b[i][0] = Math.min(b[i][0], v); b[i][1] = Math.max(b[i][1], v); }))); return b; };

function parsear(nombreGrupo, categoria) {
  let n = nombreGrupo.trim().replace(/\(|\)/g, '').replace(/X/g, 'x');
  const m = n.match(/^(\S+)\s*(.*)$/);
  let nombre = m[1], seccion = m[2] || '';
  nombre = nombre.replace(/^C0(\d\d)$/, 'C$1');           // C012 -> C12
  seccion = seccion.replace(/^-\s*/, '');                 // "L2 - h12" -> sección "h12"
  if (/^h\d+/.test(seccion)) seccion = 'h=' + seccion.slice(1);
  let tipo = { COLUMNAS: 'columna', VIGAS: 'viga', LOSAS: 'losa' }[categoria] || 'otro';
  if (/^M\d/.test(nombre) && tipo === 'columna') tipo = 'tabique';
  if (/^Esc/i.test(nombre)) { tipo = 'escalera'; seccion = ''; }
  return { nombre, seccion, tipo };
}

// ---- Agrupar mallas en elementos ----
const elementos = {};
function agregar(clave, datos, tris) {
  const e = elementos[clave] ||= { ...datos, tris: [] };
  e.tris.push(...tris);
  // Volumen ya verificado de cada malla (ver orientar.js); las mallas que no cierran se marcan como dudosas.
  e.volMallas = (e.volMallas || 0) + (tris.vol || 0); if (tris.vol == null) e.sinVol = true; if (tris.dudoso) e.dudoso = true;
}
for (const m of s.mallas) {
  if (!m.tris.length) continue;
  const [c0] = [centro(m.tris)];
  const r = m.ruta;
  if (r[0] === 'ESTRUCTURA' && NIVELES[r[1]] && r.length >= 3) {
    const version = c0[1] < 20 ? 'A' : 'B';
    let nivel = NIVELES[r[1]].id;
    // Desde la versión del 17/11 el modelo ya no trae 07_SOBRE SM: el techo de la sala de máquinas quedó dentro de
    // 06_SOBRE 5°. Las vigas y losas que están por arriba del medio nivel (16,08) se pasan al techo S.M.
    const zTop = caja(m.tris)[2][1];
    let cat, hoja;
    if (['COLUMNAS', 'VIGAS', 'LOSAS'].includes(r[2]) && r.length >= 4) { cat = r[2]; hoja = r[3]; }
    else {
      // Elementos sueltos dentro del nivel: vigas, losas y tabiques con nombre, y escaleras en grupos sin nombre.
      hoja = r.length >= 5 ? r[r.length - 1] : r[2];
      cat = /^V/.test(hoja) ? 'VIGAS' : /^L\d/.test(hoja) ? 'LOSAS' : /^[MC]\d/.test(hoja) ? 'COLUMNAS' : 'SUELTO';
    }
    if (nivel === 's5' && cat !== 'COLUMNAS' && zTop > 16.5) nivel = 'sSM';
    let p = parsear(hoja, cat);
    if (cat === 'SUELTO') {
      const b = caja(m.tris);
      p = b[2][1] - b[2][0] > 1 ? { nombre: 'Esc', seccion: '', tipo: 'escalera' } : { nombre: 'V s/n', seccion: `${Math.round(Math.min(b[0][1] - b[0][0], b[1][1] - b[1][0]) * 100)}x${Math.round((b[2][1] - b[2][0]) * 100)}`, tipo: 'viga' };
    }
    agregar(`${version}|${nivel}|${cat}|${hoja}`, { version, nivel, ...p }, m.tris);
  } else if (r[0] === 'Grupo#225' || (r[0] === 'ESTRUCTURA' && /^Componente#/.test(r[1]))) {
    // Antes las fundaciones estaban corridas 20 m en x; si siguen corridas se acomodan, si no se usan tal cual.
    const corr = Math.min(...s.mallas.filter(q => q.ruta[0] === 'Grupo#225').flatMap(q => q.tris.flat().map(p => p[0]))) > 20 ? 20 : 0;
    const tris = r[0] === 'Grupo#225' ? Object.assign(m.tris.map(t => t.map(([x, y, z]) => [+(x - corr).toFixed(4), y, z])), { vol: m.tris.vol, dudoso: m.tris.dudoso }) : m.tris;
    const b = caja(tris);
    // Base: apoya en el fondo y es más o menos cuadrada; lo alargado es viga de fundación o tensor.
    const lx = b[0][1] - b[0][0], ly = b[1][1] - b[1][0];
    const tipo = b[2][0] < -1.5 && Math.min(lx, ly) >= 0.9 && Math.max(lx, ly) / Math.min(lx, ly) < 4 ? 'base' : 'viga_fundacion';
    agregar(`B|base|${r.join('/')}|${r.length}`, { version: 'B', nivel: 'base', nombre: r[1], seccion: '', tipo }, tris);
  } else if (/^Componente#3[123]$/.test(r[0])) {
    const b = caja(m.tris);
    const tipo = b[2][1] - b[2][0] > 1 ? 'columna' : 'losa';
    agregar(`B|sPB|${r[0]}`, { version: 'B', nivel: 'sPB', nombre: r[0], seccion: '', tipo }, m.tris);
  } else if (r[0] === 'Componente#2') {
    agregar(`B|s5|esc`, { version: 'B', nivel: 's5', nombre: 'Esc 4°-5°', seccion: '', tipo: 'escalera' }, m.tris);
  }
}

// ---- Nombres para lo que vino sin nombre ----
const lista = Object.values(elementos);
const colsPB_B = lista.filter(e => e.version === 'B' && e.nivel === 'sPB' && e.tipo === 'columna' && /^C\d/.test(e.nombre));
for (const e of lista.filter(e => e.version === 'B' && /^Componente#3[12]$/.test(e.nombre))) {
  const c = centro(e.tris); e.nombre = c[1] > 32 ? 'C90' : 'C91';
  const b = caja(e.tris); e.seccion = `${Math.round((b[0][1] - b[0][0]) * 100)}x${Math.round((b[1][1] - b[1][0]) * 100)}`;
}
// Las vigas se numeran por losa (V-1xx sobre PB, V-2xx sobre 1°, …), como en el plano del ingeniero. En el modelo
// del 17/11 las losas s/ 2° y s/ 3° vinieron copiadas de la s/ 1° con las vigas V-2xx: se renumeran por nivel.
const CENTENA = { sPB: 1, s1: 2, s2: 3, s3: 4, s4: 5, s5: 6, sSM: 7 };
const renumeradas = [];
for (const e of lista.filter(e => e.tipo === 'viga' && /^V-\d{3}$/.test(e.nombre) && CENTENA[e.nivel])) {
  const n = `V-${CENTENA[e.nivel]}${e.nombre.slice(3)}`; if (n !== e.nombre) { renumeradas.push(`${e.nivel} ${e.nombre}→${n}`); e.nombre = n; }
}
// Un "tabique" de menos de 1 m de alto colgado de la losa (M117) trabaja como viga: se computa como viga en todos los pisos.
for (const e of lista.filter(e => e.tipo === 'tabique')) { const b = caja(e.tris); if (b[2][1] - b[2][0] < 1) e.tipo = 'viga'; }
if (renumeradas.length) console.log('vigas renumeradas:', renumeradas.length, renumeradas.slice(0, 4).join(', '), '…');
const CORTO = { sPB: 'PB', s1: '1°', s2: '2°', s3: '3°', s4: '4°', s5: '5°', sSM: 'S.M.' };
for (const nv of Object.keys(CORTO)) {
  const esc = lista.filter(e => e.nivel === nv && e.tipo === 'escalera').sort((a, b) => caja(a.tris)[2][0] - caja(b.tris)[2][0]);
  esc.forEach((e, i) => { e.nombre = esc.length > 1 ? `Esc ${CORTO[nv]} tramo ${i + 1}` : `Esc ${CORTO[nv]}`; e.seccion = ''; });
}
for (const e of lista.filter(e => e.nombre === 'Componente#33')) { e.nombre = 'L fondo'; e.seccion = 'h=12'; }
// Bases: se nombran por la columna que tienen encima (Bnn bajo Cnn); el tabique del ascensor no tiene columna.
let nvf = 0;
for (const e of lista.filter(e => e.nivel === 'base')) {
  const b = caja(e.tris);
  if (e.tipo === 'base') {
    const cols = [...colsPB_B, ...lista.filter(x => x.version === 'B' && x.nivel === 'sPB' && /^C9\d/.test(x.nombre))];
    const dentro = cols.filter(c => { const cc = centro(c.tris); return cc[0] >= b[0][0] && cc[0] <= b[0][1] && cc[1] >= b[1][0] && cc[1] <= b[1][1]; });
    e.nombre = dentro.length ? dentro.map(c => c.nombre.replace(/^C/, 'B')).join('+') : 'Base ascensor';
    e.seccion = `${Math.round((b[0][1] - b[0][0]) * 100)}x${Math.round((b[1][1] - b[1][0]) * 100)} H=${Math.round((b[2][1] - b[2][0]) * 100)}`;
  } else {
    const dx = b[0][1] - b[0][0], dy = b[1][1] - b[1][0];
    e.nombre = 'VF-' + String(++nvf).padStart(2, '0');
    e.seccion = `${Math.round(Math.min(dx, dy) * 100)}x${Math.round((b[2][1] - b[2][0]) * 100)}`;
  }
}

// ---- Salida compacta: vértices en cm (enteros) ----
const salida = {
  proyecto: 'Argerich 2984', fuente: 'MODELADO ESTRUCTURAL.skp (SketchUp 2023)',
  versiones: { A: 'Copia en y≈3,6–11,4 (con plenos de instalaciones)', B: 'Copia en y≈28,6–36,4 (con bases, C90/C91 y losa de fondo)' },
  niveles: [], elementos: [],
};
const zNivel = {};
for (const e of lista) {
  e.volumen = Math.round((e.sinVol ? Math.abs(volMalla(e.tris)) : e.volMallas) * 1000) / 1000;
  const b = caja(e.tris);
  if (e.tipo === 'losa') (zNivel[e.nivel] ||= []).push(Math.round(b[2][1] * 100) / 100);
  if (e.tipo === 'losa') e.area = Math.round((b[0][1] - b[0][0]) * (b[1][1] - b[1][0]) * 100) / 100; // aprox. por caja; se reemplaza abajo
}
// Superficie de losa: área de las caras horizontales superiores.
for (const e of lista.filter(e => e.tipo === 'losa')) {
  const zTop = caja(e.tris)[2][1];
  let a = 0;
  for (const [p, q, r] of e.tris) {
    if (Math.abs(p[2] - zTop) < 0.005 && Math.abs(q[2] - zTop) < 0.005 && Math.abs(r[2] - zTop) < 0.005)
      a += Math.abs((q[0] - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (q[1] - p[1])) / 2;
  }
  e.area = Math.round(a * 100) / 100;
}
salida.niveles = ORDEN.map(id => ({ id, nombre: id === 'base' ? 'Fundación' : Object.values(NIVELES).find(n => n.id === id).nombre, z: id === "base" ? -2.53 : Math.max(...zNivel[id]) }));
lista.sort((a, b) => ORDEN.indexOf(a.nivel) - ORDEN.indexOf(b.nivel) || a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
const vistos = {};
for (const e of lista) {
  const base = `${e.version}-${e.nivel}-${e.nombre}`; vistos[base] = (vistos[base] || 0) + 1;
  salida.elementos.push({
    id: vistos[base] > 1 ? `${base}-${vistos[base]}` : base,
    version: e.version, nivel: e.nivel, tipo: e.tipo, nombre: e.nombre, seccion: e.seccion,
    volumen: e.volumen, area: e.area, dudoso: e.dudoso || undefined,
    v: e.tris.flat(2).map(x => Math.round(x * 100)),
  });
}
fs.writeFileSync('modelo-skp.json', JSON.stringify(salida));

const res = {};
for (const e of salida.elementos) { const k = `${e.version} ${e.nivel.padEnd(4)} ${e.tipo}`; res[k] ||= { n: 0, v: 0 }; res[k].n++; res[k].v += e.volumen; }
for (const k of Object.keys(res).sort()) console.log(k.padEnd(28), String(res[k].n).padStart(3), res[k].v.toFixed(2));
console.log('niveles', salida.niveles.map(n => n.id + ' ' + n.z).join(', '));
console.log('tamaño', (fs.statSync('modelo-skp.json').size / 1024).toFixed(0) + ' KB');
console.log(salida.elementos.filter(e => e.nivel === 'base').map(e => `${e.nombre} ${e.seccion} ${e.volumen}`).join('\n'));
