// Prepara los datos del tablero: solo la versión B, con encofrado y medidas por elemento.
const fs = require('fs');
const k = JSON.parse(fs.readFileSync('modelo-skp.json'));
const d = JSON.parse(fs.readFileSync('../modelo.json'));
const mapa = { s5: 'sSM', sSM: 's5' };
const r2 = x => Math.round(x * 100) / 100, r3 = x => Math.round(x * 1000) / 1000;
const els = k.elementos.filter(e => e.version === 'B').map(e => {
  const v = e.v.map(x => x / 100);
  const tris = [];
  for (let i = 0; i < v.length; i += 9) tris.push([[v[i], v[i + 1], v[i + 2]], [v[i + 3], v[i + 4], v[i + 5]], [v[i + 6], v[i + 7], v[i + 8]]]);
  const b = [[1e9, -1e9], [1e9, -1e9], [1e9, -1e9]];
  tris.forEach(t => t.forEach(p => p.forEach((c, i) => { b[i][0] = Math.min(b[i][0], c); b[i][1] = Math.max(b[i][1], c); })));
  // Encofrado aproximado: caras verticales y fondos; nunca la cara superior (se hormigona contra el aire).
  let enc = 0;
  for (const [p, q, s] of tris) {
    const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = s[0] - p[0], vy = s[1] - p[1], vz = s[2] - p[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const a = Math.hypot(nx, ny, nz) / 2; if (a < 1e-6) continue;
    const cz = (p[2] + q[2] + s[2]) / 3, vert = Math.abs(nz) / (2 * a) < 0.3;
    const abajo = cz < (b[2][0] + b[2][1]) / 2;
    if (e.tipo === 'base' || e.tipo === 'viga_fundacion') { if (vert) enc += a; }
    else if (vert || (abajo && e.tipo !== 'columna' && e.tipo !== 'tabique')) enc += a;
  }
  const lx = b[0][1] - b[0][0], ly = b[1][1] - b[1][0], lz = b[2][1] - b[2][0];
  const x = d.elementos.find(z => (mapa[z.nivel] || z.nivel) === e.nivel && z.nombre === e.nombre && (z.tipo === e.tipo || e.tipo === 'base'));
  return {
    id: e.id.replace(/^B-/, ''), n: e.nombre, t: e.tipo, l: e.nivel, s: e.seccion,
    vol: e.volumen, enc: r2(enc), area: e.area, dud: e.dudoso || undefined,
    largo: ['viga', 'viga_fundacion', 'tabique'].includes(e.tipo) ? r2(Math.max(lx, ly)) : undefined,
    alto: ['columna', 'tabique'].includes(e.tipo) ? r2(lz) : undefined,
    zc: r2((b[2][0] + b[2][1]) / 2),
    dxf: x ? { s: x.seccion, vol: x.volumen } : undefined,
    rot: x && x.volumenRotulo ? x.volumenRotulo : undefined,
    v: e.v,
  };
});
const out = {
  proyecto: { nombre: 'Argerich 2984', fuente: 'MODELADO ESTRUCTURAL.skp', plano: 'RICH_ES.dxf (CYPECAD)' },
  niveles: k.niveles.map(n => ({ ...n, corto: { base: 'Fundación', sPB: 'S/ PB', s1: 'S/ 1°', s2: 'S/ 2°', s3: 'S/ 3°', s4: 'S/ 4°', s5: 'S/ 5° · medio nivel', sSM: 'Techo S.M.' }[n.id] })),
  notas: (() => { const b = fs.readFileSync('build.js', 'utf8'); const a = b.indexOf('k.notas = ') + 10; return eval(b.slice(a, b.indexOf('];', a) + 1)); })().filter(n => !n.startsWith('Versión A')),
  elementos: els,
};
fs.writeFileSync('tablero-datos.json', JSON.stringify(out));
const tot = els.reduce((a, e) => (a.v += e.vol, a.e += e.enc, a), { v: 0, e: 0 });
console.log(els.length, 'elementos', tot.v.toFixed(1), 'm3', tot.e.toFixed(0), 'm2 enc', (fs.statSync('tablero-datos.json').size / 1024).toFixed(0) + 'KB');
const pt = {}; els.forEach(e => { pt[e.t] ||= [0, 0]; pt[e.t][0] += e.vol; pt[e.t][1] += e.enc; }); console.log(pt);
console.log(els.filter(e => e.t === 'columna').slice(0, 2), els.filter(e => e.t === 'losa').slice(0, 1).map(({ v, ...r }) => r));

// Hormigón compartido entre piezas: se descuenta una sola vez (ver superposiciones.js).
require('child_process').execFileSync(process.execPath, [require('path').join(__dirname, '..', 'superposiciones.js'), 'tablero-datos.json'], { cwd: __dirname, stdio: 'inherit' });
