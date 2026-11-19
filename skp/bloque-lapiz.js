// ---------- Lápiz: dibujar un muro nuevo ----------
// Con un piso aislado: primer clic = inicio, segundo clic = fin. El muro sale recto (en x o en y), con el espesor
// de su tipo, centrado en la línea dibujada y con la altura hasta el fondo de la losa o viga de arriba.
// Los puntos se enganchan a caras de columnas, tabiques, vigas y muros, y a ejes y filos de muros.
const PISO_DE_NIVEL = Object.fromEntries(Object.entries(PISO_MURO).map(([p, n]) => [n, p]));
const ESP_TIPO = { portante12: 0.15, hueco12: 0.15, hueco8: 0.10 };
const murosNuevos = leer('murosNuevos', []);
function crearMallaMuro(m) {
  const gs = m.cajas.map(([x0, y0, x1, y1]) => new THREE.BoxGeometry(x1 - x0, m.z1 - m.z0, y1 - y0).translate((x0 + x1) / 2 - OX, (m.z0 + m.z1) / 2, -((y0 + y1) / 2 - OY)));
  const geo = uvMundo(merge(gs)), mesh = new THREE.Mesh(geo, mM(m.tipo)), id = 'muro:' + m.id;
  mesh.userData.id = id; mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), bordeMuro));
  escena.add(mesh); sanMallas.push(mesh); MUROS.push(mesh); mallaMuro[m.id] = mesh; muroPorId[m.id] = m;
  const r = m.cajas[0];
  SANP[id] = { k: 'muro', o: m, m: mesh, ppal: mesh, nivel: PISO_MURO[m.piso], centro: v3((r[0] + r[2]) / 2, (r[1] + r[3]) / 2, (m.z0 + m.z1) / 2) };
}
function agregarMuroNuevo(m) {
  m.cajasOrig = m.cajas.map(r => r.slice()); m.z1Orig = m.z1; m.nuevo = true;
  ALB.muros.push(m); recalcularMuro(m); crearMallaMuro(m);
}
for (const d of murosNuevos) agregarMuroNuevo({ ...d, cajas: d.cajas.map(r => r.slice()) });
const guardarNuevos = () => guardar('murosNuevos', ALB.muros.filter(m => m.nuevo).map(m => ({ id: m.id, nombre: m.nombre, piso: m.piso, tipo: m.tipo, nombreTipo: m.nombreTipo, esp: m.esp, cajas: m.cajas, z0: m.z0, z1: m.z1 })));
function eliminarMuro(id) {
  const m = muroPorId[id]; if (!m || !m.nuevo) return;
  const mesh = mallaMuro[id]; escena.remove(mesh); mesh.geometry.dispose();
  MUROS.splice(MUROS.indexOf(mesh), 1); sanMallas.splice(sanMallas.indexOf(mesh), 1);
  ALB.muros.splice(ALB.muros.indexOf(m), 1); delete SANP['muro:' + id]; delete mallaMuro[id]; delete muroPorId[id]; delete hechos['muro:' + id];
  guardarNuevos(); enEdicion = null; elegir(null); refrescarKpis(); refrescarElementos(); if (pestana === 'albanileria') refrescarAlbanileria();
}
document.addEventListener('click', ev => { const b = ev.target.closest('[data-eliminar-muro]'); if (b) eliminarMuro(b.dataset.eliminarMuro); });

// Estado del lápiz
let lapiz = null;            // { piso, tipo, z0, a: [x,y] | null }
const matPrevia = new THREE.MeshBasicMaterial({ color: css('--accent'), transparent: true, opacity: 0.45, depthTest: false });
const previa = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), matPrevia); previa.visible = false; previa.renderOrder = 12; escena.add(previa);
const marca = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: css('--accent'), depthTest: false, side: THREE.DoubleSide }));
marca.visible = false; marca.renderOrder = 13; escena.add(marca);
const barraLapiz = document.createElement('div'); barraLapiz.className = 'flota barra-lapiz'; barraLapiz.hidden = true;
barraLapiz.innerHTML = `<b>Dibujar muro</b><select id="lapizTipo" aria-label="Tipo de muro"><option value="hueco8">Ladrillo hueco 8</option><option value="hueco12">Ladrillo hueco 12</option><option value="portante12">Ladrillo portante 12</option></select><span id="lapizAyuda"></span><button type="button" class="btn" id="lapizSalir">Terminar</button>`;
lienzo.parentElement.append(barraLapiz);
const pisoFloor = piso => { const n = PISO_MURO[piso], i = nivIdx[n]; return piso === 'PB' ? 0 : NIV[i - 1].z; };
function empezarLapiz() {
  if (!nivelSel || !PISO_DE_NIVEL[nivelSel] || hastaAca) { avisoLapiz('Elegí un piso en el corte de niveles (sin “mostrar también los de abajo”) para dibujar sobre él.'); return; }
  const piso = PISO_DE_NIVEL[nivelSel];
  enEdicion = null; elegir(null);
  lapiz = { piso, tipo: $('#lapizTipo').value, z0: pisoFloor(piso), a: null };
  barraLapiz.hidden = false; $('#botonLapiz').setAttribute('aria-pressed', 'true'); lienzo.style.cursor = 'crosshair';
  $('#lapizAyuda').textContent = `${NIV[nivIdx[nivelSel]].corto}: clic en el inicio`;
}
function terminarLapiz() { lapiz = null; previa.visible = false; marca.visible = false; barraLapiz.hidden = true; etqEdicion.hidden = true; $('#botonLapiz').setAttribute('aria-pressed', 'false'); lienzo.style.cursor = ''; }
function avisoLapiz(t) { etqEdicion.innerHTML = esc(t); etqEdicion.hidden = false; etqEdicion.style.left = '12px'; etqEdicion.style.top = '60px'; setTimeout(() => { if (!lapiz && !arrastre) etqEdicion.hidden = true; }, 3500); }
$('#lapizTipo').onchange = () => { if (lapiz) lapiz.tipo = $('#lapizTipo').value; };
$('#lapizSalir').onclick = terminarLapiz;
// Candidatos de enganche en x y en y para el piso
function candidatosLapiz(piso, z0, z1, esp) {
  const cx = [], cy = [];
  const add = (arr, v, ref, tipo) => arr.push({ v, ref, tipo });
  for (const b of REFS_EST) { if (b.z1 <= z0 + 0.05 || b.z0 >= z1 - 0.05) continue; for (const [arr, a0, a1] of [[cx, b.x0, b.x1], [cy, b.y0, b.y1]]) { add(arr, a0, b.nombre, 'cara'); add(arr, a1, b.nombre, 'cara'); add(arr, a0 + esp / 2, b.nombre, 'filo'); add(arr, a1 - esp / 2, b.nombre, 'filo'); } }
  for (const o of ALB.muros) { if (o.piso !== piso) continue; for (const q of o.cajas) for (const [arr, a0, a1] of [[cx, q[0], q[2]], [cy, q[1], q[3]]]) { add(arr, a0, o.nombre, 'cara'); add(arr, a1, o.nombre, 'cara'); add(arr, (a0 + a1) / 2, o.nombre, 'eje'); add(arr, a0 + esp / 2, o.nombre, 'filo'); add(arr, a1 - esp / 2, o.nombre, 'filo'); } }
  return { cx, cy };
}
const masCerca = (arr, v, tol) => { let m = null; for (const c of arr) { const d = Math.abs(c.v - v); if (d <= tol && (!m || d < m.d)) m = { ...c, d }; } return m; };
function puntoPiso(ev) {
  rayoDesde(ev);
  const p = new THREE.Vector3(); if (!ray2.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -lapiz.z0), p)) return null;
  return [p.x + OX, -p.z + OY];
}
function techoMuro(r, z0) {
  let z = Infinity;
  for (const b of REFS_ARRIBA) if (b.z0 > z0 + 0.3 && Math.min(r[2], b.x1) - Math.max(r[0], b.x0) > 0.01 && Math.min(r[3], b.y1) - Math.max(r[1], b.y0) > 0.01) z = Math.min(z, b.z0);
  return isFinite(z) && z - z0 < 4 ? z : z0 + 2.6;
}
let estadoLapiz = null;
function moverLapiz(ev) {
  const p = puntoPiso(ev); if (!p) return;
  const esp = ESP_TIPO[lapiz.tipo], tol = Math.max(0.05, camara.position.distanceTo(ctrl.target) * 0.012);
  const C = candidatosLapiz(lapiz.piso, lapiz.z0, lapiz.z0 + 2.5, esp);
  let [x, y] = p, txt = [];
  if (!lapiz.a) {
    const sx = masCerca(C.cx, x, tol), sy = masCerca(C.cy, y, tol);
    if (sx) { x = sx.v; txt.push(sx.ref); } if (sy) { y = sy.v; if (!sx || sy.ref !== sx.ref) txt.push(sy.ref); }
    marca.position.copy(v3(x, y, lapiz.z0 + 0.01)); marca.visible = true; previa.visible = false;
    estadoLapiz = { p: [x, y] };
    etqEdicion.innerHTML = `Inicio${txt.length ? ' · enganchado a <b>' + txt.map(esc).join(', ') + '</b>' : ''}`;
  } else {
    const [ax, ay] = lapiz.a, ej = Math.abs(x - ax) >= Math.abs(y - ay) ? 0 : 1;      // recto: el eje dominante
    let u = ej ? y : x; const s = masCerca(ej ? C.cy : C.cx, u, tol); if (s) { u = s.v; txt.push(`${s.tipo === 'eje' ? 'eje de' : s.tipo === 'filo' ? 'filo de' : 'contra'} ${s.ref}`); }
    const a0 = ej ? ay : ax, lo = Math.min(a0, u), hi = Math.max(a0, u);
    const r = ej ? [ax - esp / 2, lo, ax + esp / 2, hi] : [lo, ay - esp / 2, hi, ay + esp / 2];
    const z1 = techoMuro(r, lapiz.z0);
    previa.scale.set(Math.max(r[2] - r[0], 0.01), z1 - lapiz.z0, Math.max(r[3] - r[1], 0.01));
    previa.position.copy(v3((r[0] + r[2]) / 2, (r[1] + r[3]) / 2, (lapiz.z0 + z1) / 2)); previa.visible = hi - lo > 0.02;
    marca.position.copy(v3(ej ? ax : u, ej ? u : ay, lapiz.z0 + 0.01)); marca.visible = true;
    estadoLapiz = { r, z1, largo: hi - lo };
    etqEdicion.innerHTML = `<b class="num">${fmt(hi - lo, 2)} m</b> · alto ${fmt(z1 - lapiz.z0, 2)} m${txt.length ? ' · ' + txt.map(esc).join(', ') : ''}`;
  }
  const rc = lienzo.getBoundingClientRect(); etqEdicion.hidden = false;
  etqEdicion.style.left = Math.min(ev.clientX - rc.left + 16, rc.width - etqEdicion.offsetWidth - 8) + 'px'; etqEdicion.style.top = Math.max(8, ev.clientY - rc.top - 34) + 'px';
}
function clicLapiz() {
  if (!estadoLapiz) return;
  if (!lapiz.a) { lapiz.a = estadoLapiz.p; $('#lapizAyuda').textContent = 'clic en el final (Esc: cancelar)'; return; }
  if (!estadoLapiz.r || estadoLapiz.largo < 0.1) return;
  const n = ALB.muros.filter(m => m.nuevo).reduce((a, m) => Math.max(a, +m.id.split('-N')[1] || 0), 0) + 1;
  const id = `${lapiz.piso}-N${n}`;
  const m = { id, nombre: `M-${id}`, piso: lapiz.piso, tipo: lapiz.tipo, nombreTipo: TIPO_MURO[lapiz.tipo], esp: ESP_TIPO[lapiz.tipo], cajas: [estadoLapiz.r.map(v => +v.toFixed(3))], z0: lapiz.z0, z1: +estadoLapiz.z1.toFixed(3) };
  agregarMuroNuevo(m); guardarNuevos();
  terminarLapiz(); pintar(); editarMuro('muro:' + id);
  refrescarKpis(); refrescarElementos(); if (pestana === 'albanileria') refrescarAlbanileria();
}
let bajoLapiz = null;
lienzo.addEventListener('pointerdown', ev => { if (!lapiz) return; bajoLapiz = [ev.clientX, ev.clientY]; }, { capture: true });
lienzo.addEventListener('pointermove', ev => { if (!lapiz || ev.buttons) return; ev.stopImmediatePropagation(); tip.hidden = true; moverLapiz(ev); }, { capture: true });
lienzo.addEventListener('pointerup', ev => {
  if (!lapiz) return;
  if (bajoLapiz && Math.hypot(ev.clientX - bajoLapiz[0], ev.clientY - bajoLapiz[1]) <= 5) { ev.stopImmediatePropagation(); abajo = null; moverLapiz(ev); clicLapiz(); }
  bajoLapiz = null;
}, { capture: true });
lienzo.addEventListener('dblclick', ev => { if (lapiz) ev.stopImmediatePropagation(); }, { capture: true });
addEventListener('keydown', ev => { if (ev.key === 'Escape' && lapiz) { ev.stopImmediatePropagation(); if (lapiz.a) { lapiz.a = null; previa.visible = false; $('#lapizAyuda').textContent = 'clic en el inicio'; } else terminarLapiz(); } }, true);
{ // botón del lápiz junto a Encuadrar / Planta
  const b = document.createElement('button'); b.type = 'button'; b.id = 'botonLapiz'; b.setAttribute('aria-pressed', 'false'); b.textContent = '✎ Dibujar muro';
  b.onclick = () => lapiz ? terminarLapiz() : empezarLapiz();
  document.querySelector('.acciones3d').prepend(b);
}
