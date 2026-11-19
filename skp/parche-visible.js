const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 90)); t = t.replace(a, b); };
// Los cómputos cuentan solo lo que se ve: capas prendidas y nivel elegido (lo eliminado ya no está).
r(`// ---------- Indicadores ----------`,
`// ---------- Qué entra en los cómputos ----------
// Todo cómputo (indicadores de arriba, Estructura H°A, Albañilería, Sanitaria y Avance) suma solo lo que está a la
// vista en el modelo: si se apaga una capa o se aísla un nivel, lo oculto deja de sumar. La lista de Elementos
// sigue mostrando todo, para poder tildar lo hecho aunque esté oculto.
const cuentaEl = e => !!tiposOn[e.t] && visibleNivel(e.l);
const cuentaMuro = m => albOn.muros && capaOn(m.tipo) && visibleNivel(PISO_MURO[m.piso]);
const cuentaSan = s => (s.k === 'tramo' ? sanOn[s.o.sis] : s.k === 'artefacto' ? sanOn.artefactos : true) && visibleNivel(s.nivel);
function seCuenta(id) {
  if (porId[id]) return cuentaEl(porId[id]);
  if (id.startsWith('muro:')) { const m = muroPorId[id.slice(5)]; return !!m && cuentaMuro(m); }
  return SANP[id] ? cuentaSan(SANP[id]) : true;
}
// Hay algo oculto: se avisa en los totales para que no se lean como los de toda la obra.
const hayOculto = () => nivelSel != null || TIPOS.some(([k]) => EL.some(e => e.t === k) && !tiposOn[k]) || !albOn.muros || Object.values(capaEstado).some(c => !c.on);
const marcaVisible = () => hayOculto() ? ' <span class="solo-visible" title="Suma solo lo que está a la vista en el modelo">· solo lo visible</span>' : '';

// ---------- Indicadores ----------`);
r(`  const s = sumas(EL), a = avance(EL);`, `  const V = EL.filter(cuentaEl), s = sumas(V), a = avance(V);`);
r("    `<div class=\"kpi\"><span>Albañilería</span><b>${fmt(ALB.muros.reduce((a, m) => a + m.sup, 0), 0)}<small>m²</small></b></div>` +",
  "    `<div class=\"kpi\"><span>Albañilería</span><b>${fmt(ALB.muros.filter(cuentaMuro).reduce((a, m) => a + m.sup, 0), 0)}<small>m²</small></b></div>` +");
r("    `<div class=\"kpi\"><span>Hormigonado</span><b>${fmt(a.pct, 0)}<small>%</small></b><div class=\"barrita\"><i style=\"width:${a.pct}%\"></i></div></div>`;",
  "    `<div class=\"kpi\"><span>Hormigonado</span><b>${fmt(a.pct, 0)}<small>%</small></b><div class=\"barrita\"><i style=\"width:${a.pct}%\"></i></div></div>`;\n  $('#kpis').classList.toggle('filtrado', hayOculto());\n  $('#kpis').title = hayOculto() ? 'Los totales suman solo lo que está a la vista en el modelo' : '';");
// gráfico del resumen: por capas prendidas (los niveles se muestran todos para poder navegar)
r(`    const l = EL.filter(e => e.l === n.id); const por = {}; l.forEach(e => por[e.t] = (por[e.t] || 0) + e.vol);`,
  `    const l = EL.filter(e => e.l === n.id && tiposOn[e.t]); const por = {}; l.forEach(e => por[e.t] = (por[e.t] || 0) + e.vol);`);
r("  const max = Math.max(...filas.map(f => f.tot));", "  const max = Math.max(...filas.map(f => f.tot), 1e-9);");
r("  const presentes = TIPOS.filter(t => EL.some(e => e.t === t[0]));\n  h += `<section><h2>Hormigón por nivel <small>m³</small></h2>",
  "  const presentes = TIPOS.filter(t => EL.some(e => e.t === t[0] && tiposOn[t[0]]));\n  h += `<section><h2>Hormigón por nivel <small>m³${marcaVisible()}</small></h2>");
// cómputo de estructura
r(`  const l = EL.filter(e => !nivelSel || (hastaAca ? nivIdx[e.l] <= nivIdx[nivelSel] : e.l === nivelSel));
  $('#alcanceComp').textContent = nivelSel ? (hastaAca ? 'hasta ' : '') + NIV[nivIdx[nivelSel]].corto : 'toda la obra';`,
`  const l = EL.filter(cuentaEl);
  const apagados = TIPOS.filter(([k]) => EL.some(e => e.t === k) && !tiposOn[k]).map(t => t[1].toLowerCase());
  $('#alcanceComp').textContent = (nivelSel ? (hastaAca ? 'hasta ' : '') + NIV[nivIdx[nivelSel]].corto : 'toda la obra') + (apagados.length ? ' · sin ' + apagados.join(', ') : '');`);
// albañilería
r(`  const M = ALB.muros.filter(m => !nivelSel || visibleNivel(PISO_MURO[m.piso]));`, `  const M = ALB.muros.filter(cuentaMuro);`);
r("toda la obra'} · ${esc(ALB.fuente || 'RICH_ALB_MUROS.dwg')}</small></h2>", "toda la obra'} · ${esc(ALB.fuente || 'RICH_ALB_MUROS.dwg')}${marcaVisible()}</small></h2>");
// sanitaria: metros de lo visible
r("const met = {}; Object.values(SANP).filter(s => s.k === 'tramo').map(s => s.o).forEach(",
  "const met = {}; Object.values(SANP).filter(s => s.k === 'tramo' && cuentaSan(s)).map(s => s.o).forEach(");
r("let h = `<section><h2>Resumen <small>cloacal y pluvial · RICH_INS_CLO.dxf</small></h2>", "let h = `<section><h2>Resumen <small>cloacal y pluvial · RICH_INS_CLO.dxf${marcaVisible()}</small></h2>");
// avance por rubro
r(`  const todos = itemsObra().filter(i => i.cant > 0);`, `  const todos = itemsObra().filter(i => i.cant > 0 && seCuenta(i.id));`);
r("  let h = `<section><p class=\"nota\" style=\"margin:0\">En el modelo, mientras estás en esta pestaña,",
  "  let h = `<section><p class=\"nota\" style=\"margin:0\">${hayOculto() ? '<b>Solo lo visible:</b> el avance suma lo que está a la vista en el modelo. ' : ''}En el modelo, mientras estás en esta pestaña,");
// Cada vez que cambia lo que se ve, se rehacen los cómputos (pintar se llama en todo cambio de vista; el hover
// también lo llama, por eso se compara una firma de la visibilidad y solo se recalcula si cambió).
r(`// ---------- Arranque ----------`,
`const firmaVis = () => JSON.stringify([nivelSel, hastaAca, tiposOn, albOn, sanOn, Object.entries(capaEstado).map(([k, c]) => k + c.on)]);
let firmaVista = null;
const pintarBase = pintar;
pintar = function () {
  pintarBase();
  const f = firmaVis(); if (f === firmaVista) return; firmaVista = f;
  refrescarKpis(); refrescarComputo();
  if (pestana === 'resumen') refrescarResumen(); else if (pestana === 'albanileria') refrescarAlbanileria();
  else if (pestana === 'sanitaria') refrescarSanitaria(); else if (pestana === 'avance') refrescarAvance();
};
// ---------- Arranque ----------`);
// estilo de la marca
r(`.proy-sel {`, `.solo-visible { color: var(--warn); font-weight: 600; }
.kpis.filtrado .kpi span::after { content: ' ·'; color: var(--warn); }
.proy-sel {`);
fs.writeFileSync('tablero.template.html', t); console.log('ok');
