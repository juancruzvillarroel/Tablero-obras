const fs = require('fs'); let s = fs.readFileSync('armar.js', 'utf8');
const r = (a, b) => { if (!s.includes(a)) throw new Error(a.slice(0, 60)); s = s.replace(a, b); };
// 1) juntar los textos "PPA" de cada hoja (en coordenadas del modelo)
r("  const aa = textos.filter(t => /AIRE ACONDICIONADO/i.test(t.t));",
  "  const aa = textos.filter(t => /AIRE ACONDICIONADO/i.test(t.t));\n  textos.filter(t => /\bPPA\b/.test(t.t)).forEach(t => ppaTextos.push({ piso: P, p: aSKP(t.p.x, t.p.y, P.y0) }));");
r("const caños = [], verticales = [], avisos = [], notasUsadas = [], piezas = [];", "const caños = [], verticales = [], avisos = [], notasUsadas = [], piezas = [], ppaTextos = [];");
// 2) ubicar cada PPA en el nudo de caños más poblado cerca del texto
r("// Verticales: montantes atraviesan el piso entero;", `// PPA: el plano la rotula con texto; va en el nudo (extremos de caños) más poblado a menos de 70 cm del rótulo.
for (const t of ppaTextos) {
  const P = t.piso, ext = [];
  for (const c of caños.filter(c => c.piso === P && (c.sis === 'secundaria' || c.sis === 'primaria') && c.nivelCielo === P.piso)) for (const f of [0, 1]) ext.push({ c, f, e: c.p3[f ? c.p3.length - 1 : 0] });
  let mejor = null;
  for (const a of ext) {
    if (Math.hypot(a.e[0] - t.p[0], a.e[1] - t.p[1]) > 0.7) continue;
    const grupo = ext.filter(b => Math.hypot(b.e[0] - a.e[0], b.e[1] - a.e[1]) < 0.1);
    const puntaje = grupo.length * 10 - Math.hypot(a.e[0] - t.p[0], a.e[1] - t.p[1]);
    if (!mejor || puntaje > mejor.puntaje) mejor = { puntaje, a, grupo };
  }
  if (!mejor || mejor.grupo.length < 2) { avisos.push(\`\${P.nombre}: no ubiqué la PPA rotulada cerca de (\${t.p[0].toFixed(2)}, \${t.p[1].toFixed(2)}).\`); continue; }
  const [x, y] = mejor.a.e, z = Math.min(...mejor.grupo.map(g => g.e[2]));
  for (const g of mejor.grupo) { g.e[0] = x; g.e[1] = y; g.c.ppa = (g.c.ppa || []).concat(g.f); }
  if (verticales.some(v => v.tipo === 'PPA' && v.piso === P && Math.hypot(v.x - x, v.y - y) < 0.1)) continue;
  verticales.push({ piso: P, tipo: 'PPA', sis: 'secundaria', d: 0.110, x, y, z1: P.zPiso, fija: true, zFija: z - 0.06 });
  piezas.push({ tipo: 'ppa', piso: P.id, x, y, z: P.zPiso, zFondo: z - 0.06, entradas: mejor.grupo.map(g => salidaDe(g.c, g.f)) });
}
// Verticales: montantes atraviesan el piso entero;`);
// las verticales "fijas" respetan su fondo si lo traen
r("  if (v.fija) { v.z0 = v.piso.piso ? fondoLosa(v.piso.piso, v.x, v.y) - 0.1 : -0.40; continue; }",
  "  if (v.fija) { v.z0 = v.zFija ?? (v.piso.piso ? fondoLosa(v.piso.piso, v.x, v.y) - 0.1 : -0.40); continue; }");
// helper de dirección disponible antes
r("// PPA: el plano la rotula con texto;", "const salidaDe = (c, fin) => { const n = c.p3.length, [a, b] = fin ? [c.p3[n - 1], c.p3[n - 2]] : [c.p3[0], c.p3[1]]; const l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l, (b[2] - a[2]) / l].map(v => Math.round(v * 1000) / 1000); };\n// PPA: el plano la rotula con texto;");
// la PPA ya es la pieza de unión: sus caños no generan codos ni ramales aparte
r("for (const v of verticales.filter(v => ['artefacto', 'inodoro', 'PPA', 'embudo'].includes(v.tipo) && v.z0 < v.piso.zPiso)) {",
  "for (const v of verticales.filter(v => ['artefacto', 'inodoro', 'embudo'].includes(v.tipo) && v.z0 < v.piso.zPiso)) {");
r("for (const c of caños.filter(colgados)) for (const fin of [0, 1]) {\n  const e = extremo(c, fin);\n  const m =", "for (const c of caños.filter(colgados)) for (const fin of [0, 1]) {\n  if ((c.ppa || []).includes(fin)) continue;\n  const e = extremo(c, fin);\n  const m =");
r("for (const c of caños.filter(colgados)) for (const fin of [0, 1]) {\n  if (usados.has(c.p3 + fin)) continue;", "for (const c of caños.filter(colgados)) for (const fin of [0, 1]) {\n  if (usados.has(c.p3 + fin) || (c.ppa || []).includes(fin)) continue;");
fs.writeFileSync('armar.js', s); console.log('ok');
