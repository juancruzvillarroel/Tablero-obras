const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error(a.slice(0, 60)); t = t.replace(a, b); };
r(`const ETQ = BAJADAS.filter(b => Object.keys(b.nums).length).map(b => {
  b.num = Object.entries(b.nums).sort((p, q) => q[1] - p[1] || p[0] - q[0])[0][0];`,
`BAJADAS.forEach(b => { b.z0 = Math.min(...b.tramos.map(t => t.p[2] / 100)); b.num = Object.keys(b.nums).length ? Object.entries(b.nums).sort((p, q) => q[1] - p[1] || p[0] - q[0])[0][0] : null; });
// Una bajada desviada por cielorraso queda partida en dos tramos verticales, uno encima del otro y con el mismo
// número: se unen en una sola (la etiqueta señala la parte de arriba).
for (const a of BAJADAS.slice()) for (const b of BAJADAS.slice()) {
  if (a === b || !a.num || a.num !== b.num || a.sis !== b.sis || !BAJADAS.includes(a) || !BAJADAS.includes(b)) continue;
  const [arr, ab] = a.z0 > b.z0 ? [a, b] : [b, a];
  if (arr.z0 < ab.z1 - 0.5 || Math.hypot(a.x - b.x, a.y - b.y) > 3) continue;
  arr.tramos.push(...ab.tramos); arr.z0 = ab.z0; BAJADAS.splice(BAJADAS.indexOf(ab), 1);
}
const ETQ = BAJADAS.filter(b => b.num).map(b => {`);
r(`  const z = zTecho + 1.2 + b.renglon * 0.9;`, `  const z = b.z1 + 0.5 + b.renglon * 0.7;`);
fs.writeFileSync('tablero.template.html', t); console.log('ok');
