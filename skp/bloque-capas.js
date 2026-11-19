// ---------- Panel de capas ----------
// Sincroniza el estado de las capas con lo que usa cada parte del modelo (visibilidad y materiales).
function aplicarCapas() {
  for (const [id] of CAPAS_DEF[0].capas) tiposOn[id] = capaOn(id);
  for (const id of ['primaria', 'secundaria', 'pluvial', 'ventilacion', 'aire', 'artefactos', 'numeros', 'pases', 'cruces']) sanOn[id] = capaOn(id);
  sanOn.extraccion = sanOn.ventilacion;
  for (const s of ['primaria', 'secundaria', 'pluvial', 'ventilacion', 'aire']) {
    const col = capaEstado[s].color; mS(s).color.set(col); mP(s).color.copy(colorOsc(col, 0.72));
    if (s === 'ventilacion') { mS('extraccion').color.set(col); mP('extraccion').color.copy(colorOsc(col, 0.72)); }
  }
  matPorc.color.set(capaEstado.artefactos.color);
}
function armarCapas() {
  const p = $('#capas');
  let h = `<div class="capas-cab"><b>Capas</b><button type="button" id="capasPlegar" aria-expanded="true">Ocultar</button></div><div id="capasCuerpo">`;
  for (const g of CAPAS_DEF) {
    h += `<div class="capa-grupo"><div class="capa-gcab"><button type="button" class="pliegue" data-pl="${g.id}" aria-expanded="true" aria-label="Plegar ${g.nombre}">▾</button>
      <label><input type="checkbox" data-grupo="${g.id}"> ${g.nombre}</label></div><div class="capa-lista" id="cl-${g.id}">`;
    for (const [id] of g.capas) {
      const c = capaEstado[id], conTex = g.id !== 'sanitaria' || id === 'artefactos';
      h += `<div class="capa"><label><input type="checkbox" data-capa="${id}"${c.on ? ' checked' : ''}> <span>${CAPA_DEF[id].nombre}</span></label>` +
        (c.color ? `<button type="button" class="muestra" data-ed="${id}" style="${muestraCSS(id)}" aria-label="Cambiar color o textura de ${CAPA_DEF[id].nombre}" aria-expanded="false"></button>` : '') + `</div>`;
      if (c.color) h += `<div class="capa-editor" id="ed-${id}" hidden>
        <label>Color <input type="color" data-col="${id}" value="${c.color}"></label>
        ${conTex ? `<label>Textura <select data-tex="${id}">${['hormigon', 'ladrillo', 'liso'].map(t => `<option value="${t}"${(c.tex || 'liso') === t ? ' selected' : ''}>${NOM_TEX[t]}</option>`).join('')}</select></label>` : ''}
        <button type="button" class="btn" data-reset="${id}">Restablecer</button></div>`;
    }
    h += `</div></div>`;
  }
  h += `</div>`;
  p.innerHTML = h;
  const marcarGrupos = () => p.querySelectorAll('[data-grupo]').forEach(cb => {
    const ids = CAPAS_DEF.find(g => g.id === cb.dataset.grupo).capas.map(c => c[0]), on = ids.filter(capaOn).length;
    cb.checked = on === ids.length; cb.indeterminate = on > 0 && on < ids.length;
  });
  const cambio = () => { guardarCapas(); aplicarCapas(); pintar(); marcarGrupos(); };
  p.querySelectorAll('[data-capa]').forEach(cb => cb.onchange = () => { capaEstado[cb.dataset.capa].on = cb.checked; cambio(); });
  p.querySelectorAll('[data-grupo]').forEach(cb => cb.onchange = () => {
    for (const [id] of CAPAS_DEF.find(g => g.id === cb.dataset.grupo).capas) { capaEstado[id].on = cb.checked; const x = p.querySelector(`[data-capa="${id}"]`); if (x) x.checked = cb.checked; }
    cambio();
  });
  p.querySelectorAll('[data-pl]').forEach(b => b.onclick = () => { const l = $('#cl-' + b.dataset.pl), abierto = l.hidden; l.hidden = !abierto; b.textContent = abierto ? '▾' : '▸'; b.setAttribute('aria-expanded', abierto); });
  p.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => { const ed = $('#ed-' + b.dataset.ed); ed.hidden = !ed.hidden; b.setAttribute('aria-expanded', !ed.hidden); });
  const refrescarMuestra = id => { const b = p.querySelector(`[data-ed="${id}"]`); if (b) b.style.cssText = muestraCSS(id); };
  p.querySelectorAll('[data-col]').forEach(i => i.oninput = () => { capaEstado[i.dataset.col].color = i.value; refrescarMuestra(i.dataset.col); cambio(); });
  p.querySelectorAll('[data-tex]').forEach(s => s.onchange = () => { capaEstado[s.dataset.tex].tex = s.value; refrescarMuestra(s.dataset.tex); cambio(); });
  p.querySelectorAll('[data-reset]').forEach(b => b.onclick = () => {
    const id = b.dataset.reset; capaEstado[id].color = CAPA_DEF[id].color; capaEstado[id].tex = CAPA_DEF[id].tex;
    const c = p.querySelector(`[data-col="${id}"]`); if (c) c.value = capaEstado[id].color;
    const s = p.querySelector(`[data-tex="${id}"]`); if (s) s.value = capaEstado[id].tex || 'liso';
    refrescarMuestra(id); cambio();
  });
  $('#capasPlegar').onclick = () => { const c = $('#capasCuerpo'), abierto = c.hidden; c.hidden = !abierto; $('#capasPlegar').textContent = abierto ? 'Ocultar' : 'Mostrar'; $('#capasPlegar').setAttribute('aria-expanded', abierto); };
  if (matchMedia('(max-width: 900px)').matches) $('#capasPlegar').click();
  marcarGrupos();
}
