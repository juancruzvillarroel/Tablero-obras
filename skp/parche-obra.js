const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 90)); t = t.replace(a, b); };
const cortar = (desde, hasta, nuevo) => { const i0 = t.indexOf(desde), i1 = t.indexOf(hasta, i0); if (i0 < 0 || i1 < 0) throw new Error('marcas ' + desde.slice(0, 40)); t = t.slice(0, i0) + nuevo + t.slice(i1); };

// --- estado: hecho / no hecho, para todos los rubros (sin ejemplo precargado) ---
r(`// Avance: si no hay nada guardado, se carga un ejemplo marcado como tal.
let estados = leer('estados', null), ejemplo = false;
if (!estados) {
  estados = {}; ejemplo = true;
  for (const e of EL) estados[e.id] = ['base', 'sPB', 's1'].includes(e.l) ? 'hormigonado' : e.l === 's2' ? (e.t === 'columna' || e.t === 'tabique' ? 'hormigonado' : 'ejecucion') : 'pendiente';
}
const est = id => estados[id] || 'pendiente';`,
`// Avance de obra: cada elemento de cualquier rubro está hecho o no (se tilda en Elementos o en su ficha).
const hechos = leer('hechos', {});
{ const viejos = leer('estados', null); if (viejos) { for (const [id, v] of Object.entries(viejos)) if (v === 'hormigonado') hechos[id] = true; } }
const hecho = id => !!hechos[id];
const est = id => hecho(id) ? 'hormigonado' : 'pendiente';`);

// --- pintar: en Avance, textura normal y lo pendiente transparente ---
r("    if (modo === 'tipo') vestir(mat, e.t);", "    if (modo === 'tipo' || modo === 'avance') vestir(mat, e.t);");
r("(modo === 'avance' && est(e.id) === 'pendiente' ? 0.55 : 1);\n    mat.transparent = mat.opacity < 1; mat.depthWrite = modo !== 'instalacion';",
  "(modo === 'avance' && !hecho(e.id) ? 0.15 : 1);\n    mat.transparent = mat.opacity < 1; mat.depthWrite = modo !== 'instalacion' && mat.opacity === 1;");
r("  else items = ESTADOS.slice().reverse().map(s => [css(s[2]), s[1]]);", "  else items = [[css('--ok'), 'Hecho: se ve normal'], [css('--idle'), 'Pendiente: transparente']];");

// --- pestañas por rubro ---
r("const PEST = [['resumen', 'Resumen'], ['elementos', 'Elementos'], ['computo', 'Cómputo'], ['avance', 'Avance'], ['sanitaria', 'Sanitaria'], ['albanileria', 'Albañilería']];",
  "const PEST = [['resumen', 'Resumen'], ['elementos', 'Elementos'], ['computo', 'Estructura H°A'], ['albanileria', 'Albañilería'], ['sanitaria', 'Sanitaria'], ['avance', 'Avance']];");
r("  b.innerHTML = n + (k === 'elementos' ? `<span class=\"cuenta\">${EL.length}</span>` : '');", "  b.innerHTML = n + (k === 'elementos' ? `<span class=\"cuenta\"></span>` : '');");
r("El detalle por rubro está en <b>Cómputo</b>.", "El detalle está en <b>Estructura H°A</b>.");
r("<h2>Cómputo de estructura <small id=\"alcanceComp\"></small></h2>", "<h2>Cómputo de estructura de H°A <small id=\"alcanceComp\"></small></h2>");

// --- indicadores ---
r(`function avance(lista) {
  const t = lista.reduce((a, e) => a + e.vol, 0) || 1;
  const r = { pendiente: 0, ejecucion: 0, hormigonado: 0 }; lista.forEach(e => r[est(e.id)] += e.vol);
  return { t, ...r, pct: r.hormigonado / t * 100 };
}`, `function avance(lista) { const t = lista.reduce((a, e) => a + e.vol, 0) || 1, h = lista.filter(e => hecho(e.id)).reduce((a, e) => a + e.vol, 0); return { t, hormigonado: h, pct: h / t * 100 }; }`);

// --- ficha de estructura: tilde de hecho ---
r("    const e = porId[seleccion], st = est(e.id);", "    const e = porId[seleccion];");
r("      <div><h2 style=\"margin-bottom:6px\">Estado</h2><div class=\"estado-sel\">${ESTADOS.map(([k, n, c]) => `<button type=\"button\" data-est=\"${k}\" aria-pressed=\"${st === k}\"><span class=\"punto\" style=\"background:var(${c})\"></span>${n}</button>`).join('')}</div></div>",
  "      <div>${casillaHecho(e.id)}</div>");
r("  p.querySelectorAll('[data-est]').forEach(b => b.onclick = () => ponerEstado([seleccion], b.dataset.est));\n", '');

// --- fichas de muros, caños y artefactos: tilde de hecho ---
r("    <div class=\"medidas\">${med.map(([k, v]) => `<div><span>${k}</span><b style=\"font-family:var(--f-body);font-size:13.5px\">${esc(v)}</b></div>`).join('')}</div>${extra}</div>`;",
  "    <div class=\"medidas\">${med.map(([k, v]) => `<div><span>${k}</span><b style=\"font-family:var(--f-body);font-size:13.5px\">${esc(v)}</b></div>`).join('')}</div>${['muro', 'tramo', 'artefacto'].includes(s.k) ? `<div>${casillaHecho(id)}</div>` : ''}${extra}</div>`;");

// --- se reemplazan las viejas pestañas Elementos y Avance ---
cortar('// ---------- Elementos ----------', '// ---------- Cómputo ----------', '');
cortar('// ---------- Avance ----------', '// ---------- Instalación sanitaria (cloacal y pluvial) ----------', '');
r('// ---------- Arranque ----------', fs.readFileSync('bloque-obra.js', 'utf8') + '\n// ---------- Arranque ----------');

// --- muros, caños y artefactos en modo Avance (pendiente transparente) ---
r(`    const b = mesh.userData.base;
    mesh.material = !hay ? b : mesh.userData.id === seleccion ? resaltado(b) : tenue(b);`,
`    let b = mesh.userData.base;
    const idObra = mesh.userData.id;
    if (modo === 'avance' && (idObra.startsWith('muro:') || idObra.startsWith('san:') || idObra.startsWith('art:')) && !hecho(idObra)) b = pendiente(b);
    mesh.material = !hay ? b : mesh.userData.id === seleccion ? resaltado(b) : tenue(b);`);
r('function aplicarFoco() {', `const _pend = new Map();
function pendiente(mat) { let f = _pend.get(mat); if (!f) { f = mat.clone(); _pend.set(mat, f); } f.map = mat.map; if (f.color && mat.color) f.color.copy(mat.color); f.transparent = true; f.opacity = 0.15; f.depthWrite = false; return f; }
function aplicarFoco() {`);
// pintarMuros: en Avance los muros llevan su textura
r("    vestir(mesh.material, s.o.tipo, !inst);", "    vestir(mesh.material, s.o.tipo, !inst);");
fs.writeFileSync('tablero.template.html', t); console.log('ok');
