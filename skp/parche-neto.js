const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 90)); t = t.replace(a, b); };
// Volumen neto: el hormigón compartido entre piezas se cuenta una vez (ver superposiciones.js). Si se elimina la pieza
// que se quedaba con el volumen compartido, la otra lo recupera.
r(`function refrescarTodo() {`, `const activo = id => !!porId[id] && EL.includes(porId[id]);
const descActivos = e => (e.desc || []).filter(d => d.con === e.id || activo(d.con));
function recalcularNetos() { for (const e of EL) { const vb = e.volBruto ?? e.vol; e.vol = Math.round((vb - descActivos(e).reduce((s, d) => s + d.vol, 0)) * 1000) / 1000; } }
function refrescarTodo() {
  recalcularNetos();`);
r(`for (const id of [...eliminados]) quitar(id);`, `for (const id of [...eliminados]) quitar(id);
recalcularNetos();`);
// corte: bruto del lado visible menos los descuentos que caen de ese lado (cada zona en común es un prisma en z)
r(`  if (Math.abs(Math.abs(vt) - e.vol) <= 0.05 * e.vol + 0.01 && Math.abs(vt) > 1e-6) abajo = Math.min(1, Math.max(0, vb / vt));`,
  `  const vref = e.volBruto ?? e.vol;
  if (Math.abs(Math.abs(vt) - vref) <= 0.05 * vref + 0.01 && Math.abs(vt) > 1e-6) abajo = Math.min(1, Math.max(0, vb / vt));`);
r(`const enCorte = e => {`, `const fracDesc = d => { const ab = !corte || d.z1 <= corte.z ? 1 : d.z0 >= corte.z ? 0 : (corte.z - d.z0) / Math.max(d.z1 - d.z0, 1e-6); return !corte ? 1 : corte.arriba ? 1 - ab : ab; };
const volVisible = e => Math.max(0, (e.volBruto ?? e.vol) * fraccionVol(e) - descActivos(e).reduce((s, d) => s + d.vol * fracDesc(d), 0));
const enCorte = e => {`);
r(`const enCorte = e => { const fl = fEl(e); if (fl >= 1) return e; return { ...e, vol: e.vol * fraccionVol(e), enc: e.enc * fl }; };`,
  `const enCorte = e => { const fl = fEl(e); if (fl >= 1) return e; return { ...e, vol: volVisible(e), enc: e.enc * fl }; };`);
r(`  if (porId[id]) return fraccionVol(porId[id]);`, `  if (porId[id]) { const e = porId[id]; return e.vol > 0 ? volVisible(e) / e.vol : fraccionVol(e); }`);
// ficha: de dónde sale el neto
r(`  m.push(['Hormigón', fmt(e.vol, 3) + ' m³', true], ['Encofrado', fmt(e.enc) + ' m²', true], ['Acero est.', fmt(acero(e), 0) + ' kg', true]);`,
  `  m.push(['Hormigón', fmt(e.vol, 3) + ' m³', true], ['Encofrado', fmt(e.enc) + ' m²', true], ['Acero est.', fmt(acero(e), 0) + ' kg', true]);
  if (descActivos(e).length) m.push(['Hormigón bruto', fmt(e.volBruto, 3) + ' m³', true]);`);
r("      ${comp}${e.dud ?", "      ${notaComun(e)}${comp}${e.dud ?");
r(`function medidasDe(e) {`, `// Volumen compartido con otras piezas: cuánto se descuenta y con quién; y lo que esta pieza se queda de otras.
function notaComun(e) {
  const d = descActivos(e), gana = EL.filter(o => o !== e && descActivos(o).some(x => x.con === e.id));
  if (!d.length && !gana.length) return '';
  const nom = id => porId[id] ? porId[id].n : id;
  let h = '<div class="comparar">';
  if (d.length) h += \`<span>Descuenta <b>\${fmt(d.reduce((s, x) => s + x.vol, 0), 3)} m³</b> que comparte con \${d.map(x => \`\${x.con === e.id ? 'sí misma (piezas que se pisan)' : esc(nom(x.con))} (\${fmt(x.vol, 3)})\`).join(', ')}: ese hormigón se cuenta en la otra pieza.</span>\`;
  if (gana.length) h += \`<span>Incluye el hormigón que comparte con \${gana.map(o => \`\${esc(o.n)} (\${fmt(descActivos(o).filter(x => x.con === e.id).reduce((s, x) => s + x.vol, 0), 3)})\`).join(', ')}.</span>\`;
  return h + '<span style="color:var(--muted)">Criterio: base &gt; columna y tabique &gt; losa &gt; viga &gt; escalera; entre iguales, la más grande.</span></div>';
}
function medidasDe(e) {`);
fs.writeFileSync('tablero.template.html', t); console.log('ok');
