const fs = require('fs'); let s = fs.readFileSync('armar.js', 'utf8');
const r = (a, b) => { if (!s.includes(a)) throw new Error(a.slice(0, 60)); s = s.replace(a, b); };
r("modo: v.tipo === 'montante' ? 'montante' : 'caida', nota: null, largo: r2(v.z1 - v.z0),", "modo: v.tipo === 'montante' ? 'montante' : 'caida', tipoV: v.tipo, num: v.num, nota: null, largo: r2(v.z1 - v.z0),");
r("out.pisos = PISOS.map(", "out.piezas = piezas.map(p => ({ ...p, x: r3(p.x), y: r3(p.y) }));\nout.uniones = uniones.map(u => ({ ...u, p: u.p.map(r3), a: u.a.map(r3), b: u.b.map(r3) }));\nout.pisos = PISOS.map(");
fs.writeFileSync('armar.js', s); console.log('ok');
