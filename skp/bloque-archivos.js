// Archivos de la obra: nombre, carpeta dentro de la obra, última modificación y cuándo se cargó al tablero.
// El estado viene revisado de cuando se armó el tablero. Abierto desde el servidor local (localhost), además se
// revisa en el momento y cada archivo se puede actualizar o quitar, y se pueden agregar archivos de la carpeta de
// la obra: el servidor hace el trabajo (actualizar.js), rearma el tablero y la página se recarga sola.
// Publicado en claude.ai esos botones no aparecen.
{ const b = $('#archBoton'), m = $('#archMenu');
  let A = PROY.archivos || [], local = false, trabajo = null, sondeo = null, opciones = [], agregando = null;
  const CARGA = Date.now();
  const fecha = s => s ? new Date(s).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '') : '—';
  const EST = { 'al dia': ['', 'Al día'], cambio: ['cambio', 'Cambió después de cargarlo: el tablero no tiene esos cambios'], falta: ['falta', 'No está en la carpeta'], pendiente: ['', 'Agregado: falta procesarlo para verlo en el modelo'] };
  const mio = () => trabajo && trabajo.proyecto === PROY.id;
  function resultadoTxt(r) {
    if (!r || !r.antes) return '';
    const a = r.antes, d = r.despues, dif = (k, u, dd) => Math.abs(d[k] - a[k]) > 1e-6 ? `${fmt(a[k], dd)} → <b>${fmt(d[k], dd)}</b> ${u}` : `${fmt(d[k], dd)} ${u} (sin cambios)`;
    return [`Elementos: ${dif('elementos', '', 0)}`, `Hormigón: ${dif('hormigon', 'm³', 2)}`, d.tramos || a.tramos ? `Caños: ${dif('tramos', 'tramos', 0)}` : '', d.pases || a.pases ? `Pases: ${dif('pases', '', 0)}` : '', d.muros || a.muros ? `Muros: ${dif('superficie', 'm²', 1)}` : ''].filter(Boolean).join('<br>');
  }
  const progreso = () => `<div class="arch-prog"><span class="giro" aria-hidden="true"></span><span>${esc(trabajo.pasos[trabajo.pasos.length - 1] || 'Empezando')}…</span></div>`;
  const final = () => trabajo.ok ? `<div class="arch-prog ok">${trabajo.resultado && trabajo.resultado.pendiente ? 'Agregado a la lista.' : 'Listo.'} Recargando el tablero…<br>${resultadoTxt(trabajo.resultado)}${trabajo.resultado && trabajo.resultado.publicado ? '<br>Subido a la página online (se ve en un minuto).' : trabajo.resultado && trabajo.resultado.motivo ? '<br>No se subió a la página online: ' + esc(trabajo.resultado.motivo) + '.' : ''}</div>`
    : `<div class="arch-prog mal">No se pudo: ${esc(trabajo.error)}. El tablero sigue como estaba.</div>`;
  function panelAgregar() {
    if (mio() && trabajo.tipo === 'agregar') return `<div class="arch-agregar">${trabajo.fin ? final() : progreso()}</div>`;
    if (!agregando) return `<button type="button" class="arch-mas" id="archMas"${trabajo && !trabajo.fin ? ' disabled' : ''}>+ Agregar archivo</button>`;
    const q = agregando.q.trim().toLowerCase(), lista = (agregando.lista || []).filter(f => !q || (f.nombre + ' ' + f.carpeta).toLowerCase().includes(q)).slice(0, 60);
    const sel = agregando.sel, ext = sel ? sel.nombre.slice(sel.nombre.lastIndexOf('.')).toLowerCase() : '';
    const opc = opciones.filter(o => o.ext === ext);
    return `<div class="arch-agregar"><div class="arch-agr-cab"><b>Agregar un archivo de la carpeta de la obra</b><button type="button" class="arch-x" id="archCerrarAgr" aria-label="Cancelar">✕</button></div>
      <input type="search" id="archBuscar" class="arch-buscar" placeholder="Buscar por nombre o carpeta" value="${esc(agregando.q)}" aria-label="Buscar archivo">
      <div class="arch-lista" role="listbox" aria-label="Archivos de la carpeta">${agregando.lista ? (lista.length ? lista.map(f => `<button type="button" role="option" aria-selected="${sel && sel.ruta === f.ruta}" data-ruta="${esc(f.ruta)}"><span class="nom">${esc(f.nombre)}</span><span class="carp">${esc(f.carpeta || 'carpeta de la obra')} · ${fecha(f.modificado)}</span></button>`).join('') : '<p class="arch-pie">No hay archivos con ese nombre.</p>') : '<p class="arch-pie">Buscando en la carpeta…</p>'}</div>
      ${sel ? `<label class="arch-rol">Es <select id="archProceso"><option value="?"${agregando.proceso === '?' ? ' selected' : ''}>Elegí qué es…</option>${opc.map(o => `<option value="${o.proceso}"${agregando.proceso === o.proceso ? ' selected' : ''}>${esc(o.rol)}${A.some(a => a.rol === o.rol) ? ' (reemplaza al actual)' : ''}</option>`).join('')}<option value=""${agregando.proceso === '' ? ' selected' : ''}>Otro (queda en la lista, sin procesar)</option></select></label>
        <input type="text" id="archRolOtro" class="arch-buscar" placeholder="Qué es (ej.: Instalación eléctrica)"${agregando.proceso === '' ? '' : ' hidden'}>
        <button type="button" class="arch-act" id="archConfirmar"${agregando.proceso === '?' ? ' disabled' : ''}>Agregar ${esc(sel.nombre)}</button>` : ''}</div>`;
  }
  function pintarMenu() {
    const enCurso = trabajo && !trabajo.fin;
    m.innerHTML = '<h3>Archivos de la obra</h3>' + (A.length ? A.map((a, i) => {
      const [cl, tx] = EST[a.estado] || EST['al dia'];
      const esto = mio() && trabajo.tipo !== 'agregar' && trabajo.indice === i;
      let accion = '';
      if (esto && !trabajo.fin) accion = progreso(); else if (esto) accion = final();
      if (local && !(esto && (!trabajo.fin || trabajo.ok))) {
        if (a.estado !== 'falta' && a.estado !== 'pendiente') accion += `<button type="button" class="arch-act" data-actualizar="${i}"${enCurso ? ' disabled' : ''}>${a.estado === 'cambio' ? 'Actualizar' : 'Volver a cargar'}</button>`;
        accion += `<button type="button" class="arch-quitar" data-quitar="${i}"${enCurso || a.noQuitar ? ' disabled' : ''} title="${esc(a.noQuitar || 'Sacarlo de la obra en el tablero (el archivo en OneDrive no se borra)')}">Quitar</button>`;
      }
      return `<div class="arch-item"><span class="rol">${esc(a.rol)}</span><span class="nom">${esc(a.nombre)}</span><span class="carp">${esc(a.carpeta)}${a.leido ? ' · leído desde ' + esc(a.leido) : ''}</span>
        <span class="fechas"><span>Modificado <b>${a.modificado ? fecha(a.modificado) : '—'}</b></span><span>Cargado <b>${fecha(a.cargado)}</b></span></span>
        <span class="arch-fila"><span class="arch-estado ${cl}">${tx}</span>${accion}</span>${(a.parecidos || []).map(p => `<span class="carp">En la carpeta hay <b style="color:#ddd">${esc(p.nombre)}</b> (modificado ${fecha(p.modificado)}), quizás una copia de OneDrive.</span>`).join('')}</div>`;
    }).join('') : '<p class="arch-pie">Sin archivos registrados.</p>') +
      (local ? panelAgregar() : '') +
      `<p class="arch-pie">${local ? 'Fechas revisadas recién, en la carpeta de la obra. Actualizar y agregar guardan un respaldo: si algo falla, queda todo como estaba. Quitar saca el archivo del tablero; el archivo en OneDrive no se borra.' : `Fechas revisadas al armar el tablero${ARMADO ? ', el ' + fecha(ARMADO) : ''}. Para actualizar, quitar o agregar archivos, abrí el tablero local (localhost:5180).`}</p>`;
    $('#archAlerta').hidden = !A.some(a => a.estado === 'cambio' || a.estado === 'falta');
    m.querySelectorAll('[data-actualizar]').forEach(x => x.onclick = () => pedir('/api/actualizar', { indice: +x.dataset.actualizar }));
    m.querySelectorAll('[data-quitar]').forEach(x => x.onclick = () => quitarArchivo(+x.dataset.quitar));
    const mas = m.querySelector('#archMas'); if (mas) mas.onclick = abrirAgregar;
    const cerrar = m.querySelector('#archCerrarAgr'); if (cerrar) cerrar.onclick = () => { agregando = null; pintarMenu(); };
    const bus = m.querySelector('#archBuscar');
    if (bus) bus.oninput = () => { agregando.q = bus.value; const pos = bus.selectionStart; pintarMenu(); const nb = m.querySelector('#archBuscar'); nb.focus(); nb.setSelectionRange(pos, pos); };
    m.querySelectorAll('[data-ruta]').forEach(x => x.onclick = () => { agregando.sel = agregando.lista.find(f => f.ruta === x.dataset.ruta); agregando.proceso = adivinar(agregando.sel); pintarMenu(); });
    const pr = m.querySelector('#archProceso'), otro = m.querySelector('#archRolOtro');
    if (pr) pr.onchange = () => { agregando.proceso = pr.value; otro.hidden = pr.value !== ''; m.querySelector('#archConfirmar').disabled = pr.value === '?'; };
    const conf = m.querySelector('#archConfirmar');
    if (conf) conf.onclick = () => {
      const proceso = pr.value, rol = otro.value, s = agregando.sel;
      const reemplaza = proceso && A.find(a => a.rol === (opciones.find(o => o.proceso === proceso) || {}).rol);
      if (reemplaza && !confirm(`${s.nombre} va a reemplazar a ${reemplaza.nombre} y el modelo se va a rearmar con él. ¿Seguimos?`)) return;
      agregando = null; pedir('/api/agregar', { ruta: s.ruta, proceso, rol });
    };
  }
  // Tipo sugerido por el nombre del archivo (SketchUp → modelo; _ALB/MUROS → albañilería; _INS/CLO/SAN → instalación;
  // _ES → estructura). Si no se reconoce, hay que elegirlo, y al reemplazar uno que ya está se pide confirmación.
  function adivinar(f) {
    // Solo se sugiere un tipo que la obra no tiene: reemplazar uno que ya está se elige a mano.
    const n = f.nombre.toUpperCase(), ext = n.slice(n.lastIndexOf('.')).toLowerCase(), hay = p => opciones.some(o => o.proceso === p && o.ext === ext && !A.some(a => a.rol === o.rol));
    if (ext === '.skp' && hay('skp')) return 'skp';
    if (/ALB|MURO/.test(n) && hay('alb')) return 'alb';
    if (/INS|CLO|SANIT|PLUV/.test(n) && hay('san')) return 'san';
    if (/(^|[_ -])ES([_ .-]|$)|ESTRUC/.test(n) && hay('es')) return 'es';
    return opciones.some(o => o.ext === ext) ? '?' : '';
  }
  async function abrirAgregar() {
    agregando = { q: '', lista: null, sel: null }; pintarMenu();
    try { const j = await (await fetch('/api/carpeta?proyecto=' + encodeURIComponent(PROY.id), { cache: 'no-store' })).json(); if (agregando) { agregando.lista = j.archivos; pintarMenu(); } } catch (e) { if (agregando) { agregando.lista = []; pintarMenu(); } }
  }
  async function revisar() {
    if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
    try {
      const r = await fetch('/api/archivos', { cache: 'no-store' }); if (!r.ok) return;
      const j = await r.json(); local = true; A = j.proyectos[PROY.id] || A; opciones = (j.opciones || {})[PROY.id] || [];
      // Lo que terminó antes de abrir esta página ya está a la vista: solo se muestra lo que sigue en curso o terminó ahora.
      if (!trabajo || trabajo.fin) trabajo = j.trabajo && (!j.trabajo.fin || j.trabajo.fin > CARGA) ? j.trabajo : (trabajo && trabajo.fin > CARGA ? trabajo : null);
      if (trabajo && !trabajo.fin) seguir();
      pintarMenu();
    } catch (e) {}
  }
  async function pedir(url, datos) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Tablero': '1' }, body: JSON.stringify({ proyecto: PROY.id, ...datos }) });
      const j = await r.json(); if (!r.ok) { alert(j.error || 'No se pudo'); return null; }
      if (j.trabajo) { trabajo = j.trabajo; pintarMenu(); seguir(); }
      return j;
    } catch (e) { alert('No hay conexión con el servidor local del tablero.'); return null; }
  }
  async function quitarArchivo(i) {
    const a = A[i];
    if (!confirm(`¿Quitar ${a.nombre} de la obra?\n\nEl tablero deja de mostrar lo que sale de este archivo (${a.rol.toLowerCase()}). El archivo en OneDrive no se borra: se puede volver a agregar desde este menú.`)) return;
    const j = await pedir('/api/quitar', { indice: i });
    if (j && j.ok) location.reload();
  }
  function seguir() {
    clearInterval(sondeo);
    sondeo = setInterval(async () => {
      try { const j = await (await fetch('/api/estado', { cache: 'no-store' })).json(); trabajo = j.trabajo; } catch (e) { return; }
      if (!m.hidden) pintarMenu();
      if (trabajo && trabajo.fin) {
        clearInterval(sondeo);
        if (trabajo.ok && mio()) { abrirArch(true); setTimeout(() => location.reload(), 5000); } else revisar();
      }
    }, 1500);
  }
  const abrirArch = si => { m.hidden = !si; b.setAttribute('aria-expanded', si); if (si) pintarMenu(); };
  b.onclick = ev => { ev.stopPropagation(); const abrir = m.hidden; abrirArch(abrir); if (abrir) revisar(); };
  m.onkeydown = ev => { if (ev.key === 'Escape') { if (agregando) { agregando = null; pintarMenu(); } else { abrirArch(false); b.focus(); } } };
  document.addEventListener('pointerdown', ev => { if (!m.hidden && !ev.target.closest('.arch-sel')) abrirArch(false); });
  pintarMenu(); revisar(); }

