const fs = require('fs');
let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 70)); t = t.replace(a, b); };

// ---- color por modo: "Instalación" deja la estructura en fantasma y marca las vigas cruzadas ----
r(`function colorDe(e) {
  if (modo === 'tipo') return css('--s-' + e.t);`, `function colorDe(e) {
  if (modo === 'instalacion') return VIGAS_CRUZADAS.has(e.id) ? css('--crit') : css('--ghost');
  if (modo === 'tipo') return css('--s-' + e.t);`);
r(`const cache = {}; const col = e => { const k = modo === 'tipo' ? e.t : modo === 'nivel' ? e.l : est(e.id); return cache[k] ??= colorDe(e); };`,
  `const cache = {}; const col = e => { const k = modo === 'instalacion' ? (VIGAS_CRUZADAS.has(e.id) ? 'x' : 'g') : modo === 'tipo' ? e.t : modo === 'nivel' ? e.l : est(e.id); return cache[k] ??= colorDe(e); };`);
r(`    const fantasma = seleccion && seleccion !== e.id;
    mat.opacity = fantasma ? 0.16 : (modo === 'avance' && est(e.id) === 'pendiente' ? 0.55 : (e.t === 'losa' ? 0.9 : 1));`,
  `    const inst = modo === 'instalacion' && !VIGAS_CRUZADAS.has(e.id);
    const fantasma = (seleccion && seleccion !== e.id) || inst;
    mat.opacity = inst ? (e.t === 'losa' ? 0.1 : 0.22) : fantasma ? 0.16 : (modo === 'avance' && est(e.id) === 'pendiente' ? 0.55 : (e.t === 'losa' ? 0.9 : 1));`);
r(`    m.children[0].visible = !fantasma;
  }
  pintarLeyenda();`, `    m.children[0].visible = !fantasma || inst;
  }
  pintarSan();
  pintarLeyenda();`);
r(`for (const [k, n] of [['tipo', 'Tipo'], ['nivel', 'Nivel'], ['avance', 'Avance']]) {`, `for (const [k, n] of [['tipo', 'Tipo'], ['nivel', 'Nivel'], ['avance', 'Avance'], ['instalacion', 'Instalación']]) {`);
r(`  else items = ESTADOS.slice().reverse().map(s => [css(s[2]), s[1]]);`, `  else if (modo === 'instalacion') items = [...SIS_ORDEN.filter(s => s !== 'extraccion').map(s => [css('--i-' + s), SAN.sistemas[s]]), [css('--ok'), 'Pase OK'], [css('--crit'), 'Falta pase / cruce con viga']];
  else items = ESTADOS.slice().reverse().map(s => [css(s[2]), s[1]]);`);
r(`  if (seleccion && !visible(porId[seleccion])) elegir(null);`, `  if (seleccion && porId[seleccion] && !visible(porId[seleccion])) elegir(null);`);

// ---- picking y tooltip ----
r(`  const cand = mallas.filter(m => m.visible);`, `  const cand = [...mallas, ...sanMallas].filter(m => m.visible);`);
r(`    const e = porId[id], r = lienzo.getBoundingClientRect();
    tip.innerHTML = \`<b>\${esc(e.n)}</b>\${esc(NOM_TIPO[e.t])} · \${esc(e.s)} · <span class="num">\${fmt(e.vol, 2)} m³</span>\`;`,
  `    const e = porId[id], r = lienzo.getBoundingClientRect();
    tip.innerHTML = e ? \`<b>\${esc(e.n)}</b>\${esc(NOM_TIPO[e.t])} · \${esc(e.s)} · <span class="num">\${fmt(e.vol, 2)} m³</span>\` : tipSan(id);`);
r(`    const e = porId[id]; const off = camara.position.clone().sub(ctrl.target).setLength(Math.max(8, Math.min(16, camara.position.distanceTo(ctrl.target))));
    volarA(e.centro.clone().add(off), e.centro.clone());`,
  `    const c = porId[id] ? porId[id].centro : centroSan(id); const off = camara.position.clone().sub(ctrl.target).setLength(Math.max(6, Math.min(14, camara.position.distanceTo(ctrl.target))));
    volarA(c.clone().add(off), c.clone());`);
r(`  if (id && pestana !== 'resumen' && pestana !== 'elementos') abrir('resumen');`, `  if (id && porId[id] && pestana !== 'resumen' && pestana !== 'elementos') abrir('resumen');
  if (pestana === 'sanitaria') refrescarSanitaria();`);

// ---- pestañas ----
r(`const PEST = [['resumen', 'Resumen'], ['elementos', 'Elementos'], ['computo', 'Cómputo'], ['avance', 'Avance']];`,
  `const PEST = [['resumen', 'Resumen'], ['elementos', 'Elementos'], ['computo', 'Cómputo'], ['avance', 'Avance'], ['sanitaria', 'Sanitaria']];`);
r(`  if (k === 'avance' && modo !== 'avance') modosDiv.querySelector('[data-k="avance"]').click();`,
  `  if (k === 'avance' && modo !== 'avance') modosDiv.querySelector('[data-k="avance"]').click();
  if (k === 'sanitaria' && modo !== 'instalacion') modosDiv.querySelector('[data-k="instalacion"]').click();`);

// ---- resumen: ficha de caños, pases y cruces ----
r(`  const p = $('#p-resumen'); let h = '<section><h2>Elemento</h2>';
  if (seleccion) {`, `  const p = $('#p-resumen'); let h = '<section><h2>Elemento</h2>';
  if (seleccion && !porId[seleccion]) {
    h += fichaSan(seleccion);
  } else if (seleccion) {`);

// ---- bloque de instalación sanitaria, antes del arranque ----
r(`// ---------- Arranque ----------`, fs.readFileSync('bloque-san.js', 'utf8') + `\n// ---------- Arranque ----------`);
r(`armarElementos(); armarComputo();`, `armarElementos(); armarComputo(); armarSanitaria();`);
fs.writeFileSync('tablero.template.html', t);
console.log('ok');
