const fs = require('fs'); let s = fs.readFileSync('armar.js', 'utf8');
const r = (a, b) => { if (!s.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 60)); s = s.replace(a, b); };
r("  labels.forEach((t, i) => { if (!usadoL.has(i)) {", `  // Inodoros cuya caída empalma a mitad de un caño de Ø110: se busca el caño más cercano y se agrega la caída.
  labels.forEach((t, i) => {
    if (usadoL.has(i) || t.tipo !== 'inodoro') return;
    let mejor = null;
    for (const c of caños.filter(c => c.piso === P && c.d >= 0.1 && c.sis === 'primaria' && colgados(c) && c.nivelCielo === P.piso)) {
      const p = proyectar(c, t.p[0], t.p[1]); if (p.d < 1.2 && (!mejor || p.d < mejor.p.d)) mejor = { c, p };
    }
    if (!mejor) return;
    const { c, p } = mejor; usadoL.add(i);
    const ini = c.p3[0], fin = c.p3[c.p3.length - 1];
    const extremoCerca = [[ini, 0], [fin, 1]].find(([e]) => Math.hypot(e[0] - p.x, e[1] - p.y) < 0.35);
    let x = p.x, y = p.y, z = p.z;
    if (extremoCerca) { [x, y, z] = extremoCerca[0]; uniones.push({ tipo: 'codo', sis: 'primaria', d: 0.11, p: [x, y, z], a: [0, 0, 1], b: salida(c, extremoCerca[1]) }); }
    else uniones.push({ tipo: 'ramal', sis: 'primaria', d: c.d, dr: 0.11, p: [x, y, z], a: p.dir, b: [0, 0, 1] });
    verticales.push({ piso: P, tipo: 'inodoro', sis: 'primaria', d: 0.11, x, y, z0: z, z1: P.zPiso + 0.02 });
    let fx = t.p[0] - x, fy = t.p[1] - y; if (Math.abs(fx) > Math.abs(fy)) { fx = Math.sign(fx) || 1; fy = 0; } else { fy = Math.sign(fy) || 1; fx = 0; }
    artefactos.push({ tipo: 'inodoro', piso: P.id, x: r3(x), y: r3(y), z: P.zPiso, frente: [fx, fy], d: 0.11, sis: 'primaria' });
  });
  labels.forEach((t, i) => { if (!usadoL.has(i)) {`);
fs.writeFileSync('armar.js', s); console.log('ok');
