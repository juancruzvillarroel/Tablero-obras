// ---------- Elementos y avance de obra por rubro ----------
// Cada elemento (estructura, muro, caño o artefacto) se tilda como hecho. El avance de cada rubro se mide en su
// unidad: estructura en m³ de hormigón, albañilería en m² de muro y sanitaria en metros de caño.
const RUBROS = [['estructura', 'Estructura H°A', 'm³'], ['albanileria', 'Albañilería', 'm²'], ['sanitaria', 'Instalación sanitaria', 'm']];
function itemsObra() {
  const it = [];
  for (const e of EL) it.push({ id: e.id, rubro: 'estructura', nivel: e.l, nombre: e.n, tipo: NOM_TIPO[e.t], det: e.s || '', cant: e.vol, un: 'm³', color: `var(--s-${e.t})` });
  for (const m of ALB.muros) it.push({ id: 'muro:' + m.id, rubro: 'albanileria', nivel: PISO_MURO[m.piso], nombre: m.nombre, tipo: TIPO_MURO[m.tipo].replace('Ladrillo ', ''), det: `${fmt(m.largo, 2)} × ${fmt(m.alto, 2)} m`, cant: m.sup, un: 'm²', color: `var(--a-${m.tipo})` });
  for (const [id, s] of Object.entries(SANP)) {
    if (s.k === 'tramo') { const t = s.o; it.push({ id, rubro: 'sanitaria', nivel: s.nivel, nombre: `Ø${Math.round(t.d * 1000)} ${SAN.sistemas[t.sis]}`, tipo: NOM_MODO[t.modo], det: t.num ? `${PREF_BAJADA[t.sis]} ${t.num}` : '', cant: t.largo, un: 'm', color: `var(--i-${t.sis})` }); }
    else if (s.k === 'artefacto') it.push({ id, rubro: 'sanitaria', nivel: s.nivel, nombre: NOM_ART[s.o.tipo], tipo: 'Artefacto', det: '', cant: 0, un: 'u', color: 'var(--fg2)' });
  }
  return it;
}
function avanceDe(lista) { const t = lista.reduce((a, i) => a + i.cant, 0), h = lista.filter(i => hecho(i.id)).reduce((a, i) => a + i.cant, 0); return { t, h, pct: t ? h / t * 100 : 0 }; }
function marcarHecho(ids, valor) {
  ids.forEach(id => { if (valor) hechos[id] = true; else delete hechos[id]; });
  guardar('hechos', hechos);
  pintar(); refrescarKpis(); refrescarAvance(); refrescarElementos(); if (seleccion) { refrescarResumen(); if (pestana === 'albanileria') refrescarAlbanileria(); if (pestana === 'sanitaria') refrescarSanitaria(); }
}
// Tilde de "hecho" en cualquier ficha o lista
document.addEventListener('change', ev => { const c = ev.target.closest('[data-hecho]'); if (c) marcarHecho([c.dataset.hecho], c.checked); });
const casillaHecho = id => `<label class="hecho"><input type="checkbox" data-hecho="${id}"${hecho(id) ? ' checked' : ''}> Hecho</label>`;

// Pestaña Elementos: rubro > nivel > elementos
let filtroTexto = '', soloPendientes = false;
const abiertos = new Set(['estructura']);
function armarElementos() {
  $('#p-elementos').innerHTML = `<section>
    <div class="fila-ctl"><input id="buscar" class="campo" style="flex:1" type="search" placeholder="Buscar: C04, V-115, M-P1-05, Ø110…" aria-label="Buscar elemento">
      <label><input type="checkbox" id="soloPend"> Solo lo pendiente</label></div>
    <div id="listaObra" style="margin-top:10px;display:grid;gap:8px"></div></section>`;
  $('#buscar').oninput = ev => { filtroTexto = ev.target.value; refrescarElementos(); };
  $('#soloPend').onchange = ev => { soloPendientes = ev.target.checked; refrescarElementos(); };
}
function refrescarElementos() {
  const cont = $('#listaObra'); if (!cont) return;
  const q = filtroTexto.trim().toLowerCase();
  const todos = itemsObra();
  const l = todos.filter(i => (!q || (i.nombre + ' ' + i.tipo + ' ' + i.det).toLowerCase().includes(q)) && (!soloPendientes || !hecho(i.id)) && (!nivelSel || visibleNivel(i.nivel)));
  let h = '';
  for (const [r, nombre, un] of RUBROS) {
    const L = l.filter(i => i.rubro === r), av = avanceDe(todos.filter(i => i.rubro === r && i.cant > 0));
    const abierto = abiertos.has(r) || q;
    h += `<details class="rubro" data-rubro="${r}"${abierto ? ' open' : ''}><summary><b>${nombre}</b><span class="num">${L.length} · ${fmt(av.pct, 0)}% hecho</span></summary>`;
    for (const n of NIV.slice().reverse()) {
      const N = L.filter(i => i.nivel === n.id); if (!N.length) continue;
      const todosH = N.every(i => hecho(i.id)), algunos = N.some(i => hecho(i.id)), sub = N.reduce((a, i) => a + i.cant, 0);
      h += `<div class="nivel-el"><div class="nivel-cab"><label><input type="checkbox" data-todo="${r}|${n.id}"${todosH ? ' checked' : ''}${!todosH && algunos ? ' data-mixto' : ''}> ${esc(n.corto)}</label><span class="num">${N.length} · ${fmt(sub, un === 'm³' ? 2 : 1)} ${un}</span></div>
        <table class="obra"><tbody>${N.map(i => `<tr class="clic${i.id === seleccion ? ' sel' : ''}" data-id="${i.id}"><td style="width:22px"><input type="checkbox" data-hecho="${i.id}"${hecho(i.id) ? ' checked' : ''} aria-label="${esc(i.nombre)} hecho"></td>
          <td><span class="sw" style="display:inline-block;vertical-align:-1px;margin-right:6px;background:${i.color}"></span>${esc(i.nombre)}</td><td class="sec">${esc(i.tipo)}${i.det ? ' · ' + esc(i.det) : ''}</td><td class="r num">${i.cant ? fmt(i.cant, un === 'm³' ? 3 : 2) : ''}</td></tr>`).join('')}</tbody></table></div>`;
    }
    if (!L.length) h += `<p class="nota" style="padding:4px 8px">Nada para mostrar con este filtro.</p>`;
    h += `</details>`;
  }
  cont.innerHTML = h;
  cont.querySelectorAll('[data-mixto]').forEach(c => c.indeterminate = true);
  cont.querySelectorAll('details.rubro').forEach(d => d.ontoggle = () => { if (d.open) abiertos.add(d.dataset.rubro); else abiertos.delete(d.dataset.rubro); });
  cont.querySelectorAll('[data-todo]').forEach(c => c.onchange = () => { const [r, n] = c.dataset.todo.split('|'); marcarHecho(l.filter(i => i.rubro === r && i.nivel === n).map(i => i.id), c.checked); });
  cont.querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = ev => { if (ev.target.closest('input')) return; const id = tr.dataset.id; if (SANP[id] && !SANP[id].m.visible && nivelSel) elegirNivel(null); elegir(id, true); });
  $('#t-elementos .cuenta').textContent = todos.length;
}
function marcarFilaSel() { document.querySelectorAll('#listaObra tr[data-id]').forEach(tr => tr.classList.toggle('sel', tr.dataset.id === seleccion)); }

// Pestaña Avance
function refrescarAvance() {
  const todos = itemsObra().filter(i => i.cant > 0);
  let h = `<section><p class="nota" style="margin:0">En el modelo, mientras estás en esta pestaña, lo que no está hecho se ve transparente. Tildá lo hecho desde <b>Elementos</b> o desde la ficha de cada elemento.</p></section>`;
  for (const [r, nombre, un] of RUBROS) {
    const L = todos.filter(i => i.rubro === r), a = avanceDe(L);
    h += `<section class="avance-total"><h2>${nombre}</h2>
      <div class="big">${fmt(a.pct, 0)}%<small>${fmt(a.h, 1)} de ${fmt(a.t, 1)} ${un} hechos</small></div>
      <div class="barra-av"><i style="width:${a.pct}%;background:var(--ok)"></i></div>
      <div class="lista-av">${NIV.slice().reverse().map(n => { const N = L.filter(i => i.nivel === n.id); if (!N.length) return ''; const x = avanceDe(N);
        return `<div class="fila-av"><span>${esc(n.corto)}</span><div class="barra-av"><i style="width:${x.pct}%;background:var(--ok)"></i></div><span class="pct">${fmt(x.pct, 0)}%</span>
          <button type="button" class="btn" data-av="${r}|${n.id}|${x.pct < 100 ? 1 : 0}">${x.pct < 100 ? 'Marcar todo' : 'Desmarcar'}</button></div>`; }).join('')}</div></section>`;
  }
  h += `<p class="nota">Prototipo: el avance se guarda solo en este navegador. En la app quedaría en la base, con fecha y quién lo marcó.</p>`;
  $('#p-avance').innerHTML = h;
  $('#p-avance').querySelectorAll('[data-av]').forEach(b => b.onclick = () => { const [r, n, v] = b.dataset.av.split('|'); marcarHecho(itemsObra().filter(i => i.rubro === r && i.nivel === n).map(i => i.id), v === '1'); });
}
