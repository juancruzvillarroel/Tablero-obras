const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 90)); t = t.replace(a, b); };
r(`  for (const p of pasesPorLosa[e.l]) {
    const esq = [[p.x0, p.y0], [p.x1, p.y0], [p.x1, p.y1], [p.x0, p.y1]];
    if (!esq.every(([x, y]) => dentroPol(x, y, ext)) || internos.some(l => esq.some(([x, y]) => dentroPol(x, y, l)))) continue;
    if (rects.some(q => p.x0 < q.x1 && p.x1 > q.x0 && p.y0 < q.y1 && p.y1 > q.y0)) continue;
    rects.push(p);
  }
  rects.forEach(p => p.cortado = true);`,
`  // Un pase dibujado contra una viga o un tabique suele pisarlos 1 a 3 cm por tolerancia del dibujo: se recorta
  // hasta 6 cm por lado para que el agujero quede dentro de la losa (se elige el recorte que deja más superficie).
  const entra = q => { const pts = [[q.x0, q.y0], [q.x1, q.y0], [q.x1, q.y1], [q.x0, q.y1], [(q.x0 + q.x1) / 2, q.y0], [(q.x0 + q.x1) / 2, q.y1], [q.x0, (q.y0 + q.y1) / 2], [q.x1, (q.y0 + q.y1) / 2]];
    return pts.every(([x, y]) => dentroPol(x, y, ext)) && !internos.some(l => pts.some(([x, y]) => dentroPol(x, y, l))); };
  const PASOS = [0, 0.02, 0.04, 0.06];
  for (const p of pasesPorLosa[e.l]) {
    let mejor = null;
    if (entra(p)) mejor = { x0: p.x0, y0: p.y0, x1: p.x1, y1: p.y1 };
    else for (const a of PASOS) for (const b of PASOS) for (const c of PASOS) for (const d of PASOS) {
      const q = { x0: p.x0 + a, x1: p.x1 - b, y0: p.y0 + c, y1: p.y1 - d };
      if (q.x1 - q.x0 < 0.04 || q.y1 - q.y0 < 0.04 || !entra(q)) continue;
      if (!mejor || (q.x1 - q.x0) * (q.y1 - q.y0) > (mejor.x1 - mejor.x0) * (mejor.y1 - mejor.y0)) mejor = q;
    }
    if (!mejor || rects.some(q => mejor.x0 < q.x1 && mejor.x1 > q.x0 && mejor.y0 < q.y1 && mejor.y1 > q.y0)) continue;
    rects.push(mejor); p.cortado = true;
  }`);
fs.writeFileSync('tablero.template.html', t); console.log('ok');
