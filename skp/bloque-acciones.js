// ---------- Eliminar elementos, deshacer (Ctrl+Z) y rehacer (Ctrl+Y) ----------
// Cualquier elemento elegido se elimina con Supr o con el botón de su ficha. Lo eliminado sale del modelo y de
// los cómputos y se recuerda en este navegador. Eliminar, dibujar, estirar y mover muros se pueden deshacer.
const eliminados = new Set(leer('eliminados', []));
const guardarEliminados = () => guardar('eliminados', [...eliminados]);
const historial = [], rehechos = [];
function registrar(acc) { historial.push(acc); if (historial.length > 200) historial.shift(); rehechos.length = 0; }
function avisoBreve(t) { const a = $('#avisoAccion'); a.textContent = t; a.hidden = false; clearTimeout(avisoBreve.t); avisoBreve.t = setTimeout(() => a.hidden = true, 1800); }
function refrescarTodo() {
  pintar(); refrescarKpis(); refrescarElementos(); refrescarAvance(); refrescarComputo(); refrescarResumen();
  if (pestana === 'albanileria') refrescarAlbanileria(); if (pestana === 'sanitaria') refrescarSanitaria();
}
function deshacer() { const a = historial.pop(); if (!a) { avisoBreve('No hay nada para deshacer'); return; } a.deshacer(); rehechos.push(a); refrescarTodo(); avisoBreve('Deshecho: ' + a.nombre); }
function rehacer() { const a = rehechos.pop(); if (!a) { avisoBreve('No hay nada para rehacer'); return; } a.rehacer(); historial.push(a); refrescarTodo(); avisoBreve('Rehecho: ' + a.nombre); }
const estadoMuro = m => ({ cajas: m.cajas.map(r => r.slice()), z1: m.z1 });
const mismoEstado = (a, b) => a.z1 === b.z1 && a.cajas.length === b.cajas.length && a.cajas.every((r, i) => r.every((v, j) => Math.abs(v - b.cajas[i][j]) < 1e-5));
function ponerEstadoMuro(m, s) { m.cajas = s.cajas.map(r => r.slice()); m.z1 = s.z1; recalcularMuro(m); rehacerMuro(m); guardarEdicion(m); ponerFlechas(); }
function nombreDe(id) {
  const s = SANP[id]; if (s) return s.k === 'muro' ? s.o.nombre : s.k === 'tramo' ? `Ø${Math.round(s.o.d * 1000)} ${SAN.sistemas[s.o.sis]}` : s.k === 'artefacto' ? NOM_ART[s.o.tipo] : id;
  return porId[id] ? porId[id].n : id;
}
// Saca un elemento del modelo y devuelve la función que lo repone
function quitar(id) {
  if (id.startsWith('muro:')) {
    const m = muroPorId[id.slice(5)]; if (!m || !ALB.muros.includes(m)) return null;
    const mesh = mallaMuro[m.id], s = SANP[id], i = ALB.muros.indexOf(m), j = MUROS.indexOf(mesh), k = sanMallas.indexOf(mesh);
    ALB.muros.splice(i, 1); MUROS.splice(j, 1); sanMallas.splice(k, 1); delete SANP[id]; escena.remove(mesh);
    if (m.nuevo) guardarNuevos(); else { eliminados.add(id); guardarEliminados(); }
    return () => { ALB.muros.splice(i, 0, m); MUROS.splice(j, 0, mesh); sanMallas.splice(k, 0, mesh); SANP[id] = s; escena.add(mesh); if (m.nuevo) guardarNuevos(); else { eliminados.delete(id); guardarEliminados(); } };
  }
  if (porId[id]) {
    const e = porId[id], i = EL.indexOf(e); if (i < 0) return null;
    EL.splice(i, 1); e.malla.visible = false; eliminados.add(id); guardarEliminados();
    return () => { EL.splice(i, 0, e); eliminados.delete(id); guardarEliminados(); };
  }
  if (SANP[id] && (SANP[id].k === 'tramo' || SANP[id].k === 'artefacto')) {
    const s = SANP[id]; delete SANP[id]; s.m.visible = false; eliminados.add(id); guardarEliminados();
    return () => { SANP[id] = s; eliminados.delete(id); guardarEliminados(); };
  }
  return null;
}
function eliminar(id) {
  if (!id) return;
  const nombre = nombreDe(id); let reponer = quitar(id); if (!reponer) { avisoBreve('Este elemento no se puede eliminar'); return; }
  enEdicion = null; seleccion = null; marcarFilaSel();
  registrar({ nombre: 'eliminar ' + nombre, deshacer: () => reponer(), rehacer: () => { reponer = quitar(id); } });
  refrescarTodo(); avisoBreve(`Eliminado ${nombre} · Ctrl+Z para deshacer`);
}
document.addEventListener('click', ev => { const b = ev.target.closest('[data-eliminar]'); if (b) eliminar(b.dataset.eliminar); });
addEventListener('keydown', ev => {
  if (ev.target.closest && ev.target.closest('input, select, textarea')) return;
  const ctrl = ev.ctrlKey || ev.metaKey, k = ev.key.toLowerCase();
  if (ctrl && k === 'z' && !ev.shiftKey) { ev.preventDefault(); deshacer(); }
  else if (ctrl && (k === 'y' || (k === 'z' && ev.shiftKey))) { ev.preventDefault(); rehacer(); }
  else if ((ev.key === 'Delete' || ev.key === 'Supr') && seleccion) { ev.preventDefault(); eliminar(seleccion); }
});
{ const a = document.createElement('div'); a.id = 'avisoAccion'; a.className = 'flota'; a.hidden = true; Object.assign(a.style, { position: 'absolute', left: '50%', bottom: '58px', transform: 'translateX(-50%)', padding: '6px 12px', fontSize: '12.5px', zIndex: 7 }); lienzo.parentElement.append(a); }

// ---------- Mover un muro con enganche ----------
// En edición (doble clic) aparece una manija arriba del muro: arrastrándola, el muro se mueve en planta y sus
// caras se enganchan con caras de columnas, tabiques, vigas y otros muros del piso (Alt: sin enganche).
function puntoPlano(ev, y) { rayoDesde(ev); const p = new THREE.Vector3(); return ray2.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), p) ? [p.x + OX, -p.z + OY] : null; }
function moverMuro(ev) {
  const { m, base, cajas0, f } = arrastre, p = puntoPlano(ev, f.position.y); if (!p) return;
  let dx = p[0] - base[0], dy = p[1] - base[1];
  if (ev.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }          // Shift: solo en una dirección
  const tol = Math.max(0.05, camara.position.distanceTo(f.position) * 0.01);
  const bx0 = Math.min(...cajas0.map(r => r[0])), bx1 = Math.max(...cajas0.map(r => r[2])), by0 = Math.min(...cajas0.map(r => r[1])), by1 = Math.max(...cajas0.map(r => r[3]));
  const txt = []; let refX = null, refY = null;
  if (!ev.altKey) {
    const zOk = b => b.z1 > m.z0 + 0.05 && b.z0 < m.z1 - 0.05;
    const refs = [...REFS_EST.filter(zOk), ...ALB.muros.filter(o => o !== m && o.piso === m.piso).flatMap(o => o.cajas.map(q => ({ nombre: o.nombre, tipo: 'Muro', x0: q[0], x1: q[2], y0: q[1], y1: q[3], z0: o.z0, z1: o.z1 })))];
    let bx = null, by = null;
    for (const b of refs) for (const c of [b.x0, b.x1]) for (const fc of [bx0, bx1]) { const d = c - (fc + dx); if (Math.abs(d) <= tol && (!bx || Math.abs(d) < Math.abs(bx.d))) bx = { d, ref: b }; }
    for (const b of refs) for (const c of [b.y0, b.y1]) for (const fc of [by0, by1]) { const d = c - (fc + dy); if (Math.abs(d) <= tol && (!by || Math.abs(d) < Math.abs(by.d))) by = { d, ref: b }; }
    if (bx) { dx += bx.d; refX = bx.ref; txt.push(`x alineado con <b>${esc(bx.ref.nombre)}</b>`); }
    if (by) { dy += by.d; refY = by.ref; txt.push(`y alineado con <b>${esc(by.ref.nombre)}</b>`); }
  }
  m.cajas = cajas0.map(r => [r[0] + dx, r[1] + dy, r[2] + dx, r[3] + dy].map(v => +v.toFixed(3)));
  rehacerMuro(m); ponerFlechas();
  const ref = refX || refY;
  if (ref) { cajaRef.box.set(v3(ref.x0, ref.y1, ref.z0), v3(ref.x1, ref.y0, ref.z1)); cajaRef.visible = true; } else cajaRef.visible = false;
  guia.visible = false;
  etqEdicion.innerHTML = `Moviendo <b class="num">${fmt(Math.hypot(dx, dy), 2)} m</b>${txt.length ? ' · ' + txt.join(' · ') : ''} <span style="color:var(--muted)">· Shift: una dirección · Alt: sin enganche</span>`;
  const rc = lienzo.getBoundingClientRect(); etqEdicion.hidden = false;
  etqEdicion.style.left = Math.min(ev.clientX - rc.left + 16, rc.width - etqEdicion.offsetWidth - 8) + 'px'; etqEdicion.style.top = Math.max(8, ev.clientY - rc.top - 34) + 'px';
}
const geoManija = merge([new THREE.SphereGeometry(0.045, 12, 8), ...[0, 1, 2, 3].map(i => new THREE.ConeGeometry(0.04, 0.09, 10).translate(0, 0.11, 0).rotateZ(-Math.PI / 2).rotateY(i * Math.PI / 2))]);
