const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no: ' + a.slice(0, 80)); t = t.replace(a, b); };

// ---------- Superficie neta de cada muro ----------
r(`const editado = m => ediciones[m.id] != null;`, `// Muros que se meten en la estructura o en otro muro: esa parte no es mampostería y no se cuenta dos veces.
// - Contra la estructura (columnas, tabiques, vigas, losas, escaleras): se recorre la planta de cada caja del muro
//   con rayos verticales cada 2 cm y se mide qué parte de su altura ocupa el hormigón (con las mallas reales).
// - Entre muros (esquinas y encuentros en T): la caja en común se descuenta del muro más chico.
// El volumen ocupado se pasa a superficie dividiendo por el espesor de la caja. El muro guarda su medida bruta
// (sup, vol, que salen del dibujo y de las ediciones); netoMuro(m) da la neta, y se recalcula si el muro cambia.
const EST_MURO = EL.filter(e => ['columna', 'tabique', 'viga', 'losa', 'escalera'].includes(e.t)).map(e => ({ e, b: cajaPlano(e.v), T: null }));
function trisEst(it) {
  if (it.T) return it.T; const v = it.e.v; it.T = [];
  for (let i = 0; i < v.length; i += 9) {
    const p = [0, 3, 6].map(o => [v[i + o] / 100, v[i + o + 1] / 100, v[i + o + 2] / 100]);
    it.T.push({ p, x0: Math.min(p[0][0], p[1][0], p[2][0]), x1: Math.max(p[0][0], p[1][0], p[2][0]), y0: Math.min(p[0][1], p[1][1], p[2][1]), y1: Math.max(p[0][1], p[1][1], p[2][1]) });
  }
  return it.T;
}
// Tramos de altura adentro de una pieza sobre la vertical (x, y)
function tramosEst(T, x, y) {
  const zs = [];
  for (const q of T) {
    if (q.x0 > x || q.x1 < x || q.y0 > y || q.y1 < y) continue;
    const [a, b, c] = q.p, den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]); if (Math.abs(den) < 1e-14) continue;
    const l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / den, l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / den, l3 = 1 - l1 - l2;
    if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue; zs.push(l1 * a[2] + l2 * b[2] + l3 * c[2]);
  }
  zs.sort((p, q) => p - q); const u = []; for (const z of zs) if (!u.length || z - u[u.length - 1] > 1e-6) u.push(z);
  const out = []; for (let i = 0; i + 1 < u.length; i += 2) out.push([u[i], u[i + 1]]); return out;
}
const cajaDeMuro = ([x0, y0, x1, y1], m) => ({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1), z0: m.z0, z1: m.z1 });
const firmaMuro = m => m.cajas.map(r => r.map(v => v.toFixed(4)).join(',')).join(';') + '|' + m.z0 + '|' + m.z1;
function estEnMuro(m) {
  const k = firmaMuro(m) + '|' + EL.length; if (m._est && m._est.k === k) return m._est.l;
  const porPieza = new Map();
  for (const r of m.cajas) {
    const c = cajaDeMuro(r, m), esp = Math.max(1e-3, Math.min(c.x1 - c.x0, c.y1 - c.y0));
    for (const it of EST_MURO) {
      const b = it.b; if (!EL.includes(it.e) || b.x1 <= c.x0 + 1e-3 || b.x0 >= c.x1 - 1e-3 || b.y1 <= c.y0 + 1e-3 || b.y0 >= c.y1 - 1e-3 || b.z1 <= c.z0 + 1e-3 || b.z0 >= c.z1 - 1e-3) continue;
      const x0 = Math.max(c.x0, b.x0), x1 = Math.min(c.x1, b.x1), y0 = Math.max(c.y0, b.y0), y1 = Math.min(c.y1, b.y1);
      const nx = Math.max(1, Math.round((x1 - x0) / 0.02)), ny = Math.max(1, Math.round((y1 - y0) / 0.02)), dx = (x1 - x0) / nx, dy = (y1 - y0) / ny, T = trisEst(it);
      let vol = 0;
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (const [z0, z1] of tramosEst(T, x0 + (i + 0.5) * dx, y0 + (j + 0.5) * dy)) vol += Math.max(0, Math.min(z1, c.z1) - Math.max(z0, c.z0)) * dx * dy;
      if (vol > 1e-5) porPieza.set(it.e.id, (porPieza.get(it.e.id) || 0) + vol / esp);
    }
  }
  const l = [...porPieza].map(([id, sup]) => ({ con: porId[id].n, sup }));
  m._est = { k, l }; return l;
}
// Encuentros entre muros: se recalculan juntos cuando cambia cualquier muro del mismo piso.
let cacheEntreMuros = { k: null, d: new Map() };
function entreMuros() {
  const k = ALB.muros.map(firmaMuro).join('#'); if (cacheEntreMuros.k === k) return cacheEntreMuros.d;
  const d = new Map(), add = (m, con, sup) => { (d.get(m.id) || d.set(m.id, []).get(m.id)).push({ con: con.nombre, sup }); };
  const L = ALB.muros;
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j]; if (a.z1 <= b.z0 || b.z1 <= a.z0) continue;
    const pierde = a.sup !== b.sup ? (a.sup < b.sup ? a : b) : (a.id > b.id ? a : b), gana = pierde === a ? b : a;
    let sup = 0;
    for (const ra of pierde.cajas) for (const rb of gana.cajas) {
      const A = cajaDeMuro(ra, pierde), B = cajaDeMuro(rb, gana);
      const dx = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0), dy = Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0), dz = Math.min(A.z1, B.z1) - Math.max(A.z0, B.z0);
      if (dx > 1e-3 && dy > 1e-3 && dz > 1e-3) sup += dx * dy * dz / Math.max(1e-3, Math.min(A.x1 - A.x0, A.y1 - A.y0));
    }
    if (sup > 1e-4) add(pierde, gana, sup);
  }
  cacheEntreMuros = { k, d }; return d;
}
function netoMuro(m) {
  const est = estEnMuro(m), mur = entreMuros().get(m.id) || [];
  const desc = Math.min(m.sup, est.reduce((a, x) => a + x.sup, 0) + mur.reduce((a, x) => a + x.sup, 0));
  const sup = m.sup - desc;
  return { sup, vol: m.sup > 0 ? m.vol * sup / m.sup : 0, est, mur, desc };
}
const editado = m => ediciones[m.id] != null;`);

// Cómputos con la superficie neta (y después, la parte del lado visible del plano de sección)
r(`const enCorteMuro = m => { const f = fMuro(m); return f >= 1 ? m : { ...m, sup: m.sup * f, vol: m.vol * f, alto: esVertical() ? m.alto : m.alto * f }; };`,
  `const enCorteMuro = m => { const n = netoMuro(m), f = fMuro(m); return { ...m, supBruto: m.sup, sup: n.sup * f, vol: n.vol * f, alto: f >= 1 || esVertical() ? m.alto : m.alto * f }; };`);
r(`cant: m.sup, un: 'm²', color: \`var(--a-\${m.tipo})\` });`, `cant: netoMuro(m).sup, un: 'm²', color: \`var(--a-\${m.tipo})\` });`);
// Ficha del muro: neta y de dónde sale el descuento
r(`['Superficie', fmt(m.sup, 2) + ' m²'], ['Volumen', fmt(m.vol, 3) + ' m³'], ['Ladrillos', fmt(ladrillosDe(m), 0)]];`,
  `['Superficie', fmt(netoMuro(m).sup, 2) + ' m²'], ['Volumen', fmt(netoMuro(m).vol, 3) + ' m³'], ['Ladrillos', fmt(ladrillosDe({ ...m, sup: netoMuro(m).sup }), 0)]];
    { const n = netoMuro(m); if (n.desc > 0.005) { med.push(['Sup. bruta', fmt(m.sup, 2) + ' m²']);
      extraMuro = \`<div class="comparar"><span>Descuenta <b>\${fmt(n.desc, 2)} m²</b> que ocupa\${n.est.length + n.mur.length > 1 ? 'n' : ''} \${[...n.est, ...n.mur].map(x => \`\${esc(x.con)} (\${fmt(x.sup, 2)})\`).join(', ')}: ahí no hay mampostería\${n.mur.length ? ' o ya se cuenta en el otro muro' : ''}.</span></div>\`; } }`);
fs.writeFileSync('tablero.template.html', t); console.log('ok');
t = fs.readFileSync('tablero.template.html', 'utf8');
r(`const m = s.o; titulo = m.nombre; sub = \`\${TIPO_MURO[m.tipo]} · \${NOM_PISO_MURO[m.piso]}\`;`, `const m = s.o; let extraMuro = ''; titulo = m.nombre; sub = \`\${TIPO_MURO[m.tipo]} · \${NOM_PISO_MURO[m.piso]}\`;`);
r(`    extra = \`<div class="comparar"><span>\${enEdicion === 'muro:' + m.id`, `    extra = extraMuro + \`<div class="comparar"><span>\${enEdicion === 'muro:' + m.id`);
// Desperdicio de ladrillos: primero el total tal cual y después lo que hay que pedir
r(`const ladrillosDe = m => m.sup * (ladrillos[m.tipo] || 0);`, `const ladrillosDe = m => m.sup * (ladrillos[m.tipo] || 0);
let despAlb = leer('despAlb', 5);`);
r(`    <p class="nota">Superficie de muro = largo × alto (de piso al fondo de losa o viga). Clic en un nivel del corte para filtrar.</p></section>\`;`,
  `    <p class="nota">Superficie de muro = largo × alto (de piso al fondo de losa o viga), sin la parte que ocupa la estructura ni los encuentros entre muros (\${fmt(ALB.muros.filter(cuentaMuro).reduce((a, m) => a + netoMuro(m).desc * fMuro(m), 0), 1)} m² descontados). Clic en un nivel del corte para filtrar.</p></section>\`;`);
r(`    \`</tbody></table></div><p class="nota">Ladrillos por m² editables`, `    \`</tbody><tfoot><tr><td>Total <span style="color:var(--muted);font-weight:400">sin desperdicio</span></td><td class="r num">\${fmt(tot.sup, 1)}</td><td class="r num">\${fmt(tot.vol, 2)}</td><td></td><td class="r num">\${fmt(tot.lad, 0)}</td></tr>
      <tr><td>A pedir <span style="color:var(--muted);font-weight:400">(+\${fmt(despAlb, 0)}%)</span></td><td></td><td></td><td></td><td class="r num">\${fmt(tot.lad * (1 + despAlb / 100), 0)}</td></tr></tfoot></table></div>
    <div class="fila-ctl" style="margin-top:10px"><label>Desperdicio ladrillos <input id="despAlb" class="inline-num" type="number" min="0" max="30" step="1" value="\${despAlb}"> %</label></div><p class="nota">Ladrillos por m² editables`);
r(`  p.querySelectorAll('[data-lad]').forEach(i => i.onchange =`, `  p.querySelector('#despAlb').onchange = ev => { despAlb = Math.max(0, +ev.target.value || 0); guardar('despAlb', despAlb); refrescarAlbanileria(); };
  p.querySelectorAll('[data-lad]').forEach(i => i.onchange =`);
fs.writeFileSync('tablero.template.html', t); console.log('ok 2');
