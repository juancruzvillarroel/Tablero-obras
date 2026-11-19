const fs = require('fs'); let s = fs.readFileSync('armar.js', 'utf8');
const r = (a, b) => { if (!s.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 60)); s = s.replace(a, b); };

// 1) juntar los rótulos de artefactos de cada hoja
r("const caños = [], verticales = [], avisos = [], notasUsadas = [], piezas = [], ppaTextos = [];",
  "const caños = [], verticales = [], avisos = [], notasUsadas = [], piezas = [], ppaTextos = [], artTextos = [];\n" +
  "const TIPO_ART = [[/INODORO/i, 'inodoro'], [/BIDET/i, 'bidet'], [/BACHA|LAVATORIO/i, 'bacha'], [/DUCHA/i, 'ducha'], [/^PC$|PILETA/i, 'pileta'], [/LAVARROPAS/i, 'lavarropas'], [/LAVAJILLAS/i, 'lavajillas']];");
r("  const aa = textos.filter(t => /AIRE ACONDICIONADO/i.test(t.t));",
  "  const aa = textos.filter(t => /AIRE ACONDICIONADO/i.test(t.t));\n" +
  "  for (const t of textos) { const m = TIPO_ART.find(([re]) => re.test(t.t)); if (m) artTextos.push({ piso: P, tipo: m[1], p: aSKP(t.p.x, t.p.y, P.y0) }); }");

// 2) ubicar cada artefacto en su descarga
r("// Cámara de inspección de PB", `// ---------- Artefactos: cada rótulo se ubica en la descarga compatible más cercana ----------
// Inodoro: descarga de Ø110. Pileta de cocina: arranque del caño bajo mesada. El resto: descargas de Ø40/Ø63.
// El frente del artefacto mira hacia donde está escrito el rótulo (el plano no trae los bloques de artefactos).
const artefactos = [];
for (const P of PISOS) {
  const cand = [];
  for (const v of verticales.filter(v => v.piso === P && (v.tipo === 'artefacto' || v.tipo === 'inodoro'))) cand.push({ x: v.x, y: v.y, d: v.d, sis: v.sis });
  for (const c of caños.filter(c => c.piso === P && ['mesada', 'pared', 'contrapiso'].includes(c.modo))) cand.push({ x: c.p3[0][0], y: c.p3[0][1], d: c.d, sis: c.sis, mesada: c.modo === 'mesada' });
  const labels = artTextos.filter(t => t.piso === P);
  const pares = [];
  for (const [i, t] of labels.entries()) for (const [j, c] of cand.entries()) {
    const dist = Math.hypot(c.x - t.p[0], c.y - t.p[1]);
    const ok = t.tipo === 'inodoro' ? c.d >= 0.1 : c.d < 0.1;
    if (!ok || dist > 1.4) continue;
    pares.push({ i, j, puntaje: dist - (t.tipo === 'pileta' && c.mesada ? 0.6 : 0) });
  }
  pares.sort((a, b) => a.puntaje - b.puntaje);
  const usadoL = new Set(), usadoC = new Set();
  for (const p of pares) {
    if (usadoL.has(p.i) || usadoC.has(p.j)) continue;
    usadoL.add(p.i); usadoC.add(p.j);
    const t = labels[p.i], c = cand[p.j];
    let fx = t.p[0] - c.x, fy = t.p[1] - c.y; const L = Math.hypot(fx, fy);
    if (L < 0.15) { fx = 1; fy = 0; } else { fx /= L; fy /= L; }
    // Se redondea a la dirección ortogonal más cercana: los artefactos van contra paredes.
    if (Math.abs(fx) > Math.abs(fy)) { fx = Math.sign(fx); fy = 0; } else { fy = Math.sign(fy); fx = 0; }
    artefactos.push({ tipo: t.tipo, piso: P.id, x: r3(c.x), y: r3(c.y), z: P.zPiso, frente: [fx, fy], d: c.d, sis: c.sis });
  }
  labels.forEach((t, i) => { if (!usadoL.has(i)) { artefactos.push({ tipo: t.tipo, piso: P.id, x: r3(t.p[0]), y: r3(t.p[1]), z: P.zPiso, frente: [1, 0], sinDescarga: true }); } });
}
// Cámara de inspección de PB`);

// 3) salida
r("out.piezas = piezas.map(", "out.artefactos = artefactos;\nout.piezas = piezas.map(");
fs.writeFileSync('armar.js', s); console.log('ok');
