const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 90)); t = t.replace(a, b); };
r(`  let f = fl;
  if (Math.abs(Math.abs(vt) - e.vol) <= 0.05 * e.vol + 0.01 && Math.abs(vt) > 1e-6) { const abajo = Math.min(1, Math.max(0, vb / vt)); f = corte.arriba ? 1 - abajo : abajo; }`,
`  let abajo;
  if (Math.abs(Math.abs(vt) - e.vol) <= 0.05 * e.vol + 0.01 && Math.abs(vt) > 1e-6) abajo = Math.min(1, Math.max(0, vb / vt));
  else abajo = rayosBajo(v, h);     // pieza que no cierra en el SketchUp: se mide con rayos verticales, como su volumen
  const f = corte.arriba ? 1 - abajo : abajo;`);
r(`const enCorte = e => {`, `// Fracción del volumen bajo h medida con rayos verticales cada 1 cm (para piezas cuya malla no cierra). Los rayos solo
// cruzan caras no verticales, así que un hueco en una cara lateral no los afecta.
function rayosBajo(v, h, paso = 0.01) {
  const T = []; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let i = 0; i < v.length; i += 9) { const t = [0, 3, 6].map(o => [v[i + o] / 100, v[i + o + 1] / 100, v[i + o + 2] / 100]); T.push(t); for (const p of t) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } }
  let tot = 0, bajo = 0;
  for (let x = x0 + paso / 2; x < x1; x += paso) for (let y = y0 + paso / 2; y < y1; y += paso) {
    const zs = [];
    for (const [a, b, c] of T) {
      const den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]); if (Math.abs(den) < 1e-14) continue;
      const l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / den, l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / den, l3 = 1 - l1 - l2;
      if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue; zs.push(l1 * a[2] + l2 * b[2] + l3 * c[2]);
    }
    zs.sort((p, q) => p - q); const u = []; for (const z of zs) if (!u.length || z - u[u.length - 1] > 1e-6) u.push(z);
    for (let i = 0; i + 1 < u.length; i += 2) { tot += u[i + 1] - u[i]; bajo += Math.max(0, Math.min(u[i + 1], h) - u[i]); }
  }
  return tot > 0 ? bajo / tot : 0;
}
const enCorte = e => {`);
r(`// no es cerrada o su volumen no coincide con el del elemento, se vuelve a la proporción por altura.`, `// no es cerrada o su volumen no coincide con el del elemento, se mide con rayos verticales (rayosBajo).`);
fs.writeFileSync('tablero.template.html', t); console.log('ok');
