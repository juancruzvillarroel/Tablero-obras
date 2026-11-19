// ---------- Mover elementos agarrándolos ----------
// Muros y elementos de estructura se mueven directo: al pasar el mouse aparece la mano, se mantiene apretado el
// botón izquierdo, se arrastra en planta y al soltar queda. Las caras se enganchan con columnas, tabiques, vigas y
// muros del mismo nivel (Shift: en una sola dirección; Alt: sin enganche). Un clic sin arrastrar sigue eligiendo.
// Lo movido de la estructura se guarda como un corrimiento por elemento; los muros guardan sus cajas como siempre.
const movidos = leer('movidos', {});
const REF_DE = new Map(); EL.filter(e => ['columna', 'tabique', 'viga'].includes(e.t)).forEach((e, i) => REF_DE.set(e.id, REFS_EST[i]));
for (const e of EL) { const c = cajaPlano(e.v); e.caja0 = c; e.centro0 = e.centro.clone(); }
function ponerCorrimiento(e, d) {
  const [dx, dy] = d || [0, 0];
  e.malla.position.set(dx, 0, -dy); e.centro.copy(e.centro0).add(e.malla.position);
  const ref = REF_DE.get(e.id); if (ref) Object.assign(ref, { x0: e.caja0.x0 + dx, x1: e.caja0.x1 + dx, y0: e.caja0.y0 + dy, y1: e.caja0.y1 + dy });
  if (d && (Math.abs(dx) > 1e-4 || Math.abs(dy) > 1e-4)) movidos[e.id] = [+dx.toFixed(3), +dy.toFixed(3)]; else delete movidos[e.id];
}
for (const [id, d] of Object.entries(movidos)) if (porId[id]) ponerCorrimiento(porId[id], d);
const movible = id => !!id && ((id.startsWith('muro:') && muroPorId[id.slice(5)]) || (porId[id] && EL.includes(porId[id])));
const cajaMuro = m => ({ x0: Math.min(...m.cajas.map(r => r[0])), x1: Math.max(...m.cajas.map(r => r[2])), y0: Math.min(...m.cajas.map(r => r[1])), y1: Math.max(...m.cajas.map(r => r[3])), z0: m.z0, z1: m.z1 });
const cajasDeMuros = (filtro) => ALB.muros.filter(filtro).flatMap(o => o.cajas.map(q => ({ nombre: o.nombre, tipo: 'Muro', x0: q[0], x1: q[2], y0: q[1], y1: q[3], z0: o.z0, z1: o.z1 })));
// Enganche en planta de una caja corrida (dx, dy): la cara más cercana de cada eje a una cara de referencia.
function engancharCaja(b, dx, dy, refs, tol) {
  let bx = null, by = null;
  for (const r of refs) {
    for (const c of [r.x0, r.x1]) for (const f of [b.x0, b.x1]) { const d = c - (f + dx); if (Math.abs(d) <= tol && (!bx || Math.abs(d) < Math.abs(bx.d))) bx = { d, ref: r }; }
    for (const c of [r.y0, r.y1]) for (const f of [b.y0, b.y1]) { const d = c - (f + dy); if (Math.abs(d) <= tol && (!by || Math.abs(d) < Math.abs(by.d))) by = { d, ref: r }; }
  }
  return { bx, by };
}
let agarre = null;            // { id, x, y } al apretar; { ...activo: true } cuando empezó a moverse
lienzo.addEventListener('pointerdown', ev => {
  if (ev.button !== 0 || lapiz || arrastre) return;
  const id = tocar(ev); if (!movible(id)) return;
  const hit = ray.intersectObjects([id.startsWith('muro:') ? mallaMuro[id.slice(5)] : porId[id].malla], false)[0];
  agarre = { id, x: ev.clientX, y: ev.clientY, pointerId: ev.pointerId, z: hit ? hit.point.y : null };
}, { capture: true });
lienzo.addEventListener('pointermove', ev => {
  if (!agarre) {
    // Mano abierta sobre lo que se puede mover
    if (!ev.buttons && !lapiz && !arrastre && !flechas.some(f => f.material === matFlechaHover)) lienzo.style.cursor = movible(hover) ? 'grab' : '';
    return;
  }
  if (!agarre.activo) {
    if (Math.hypot(ev.clientX - agarre.x, ev.clientY - agarre.y) < 4) return;
    // Empieza el arrastre: se elige el elemento y se congela la cámara
    const { id } = agarre, esMuro = id.startsWith('muro:');
    const m = esMuro ? muroPorId[id.slice(5)] : null, e = esMuro ? null : porId[id];
    const caja = esMuro ? cajaMuro(m) : e.caja0;
    const z = agarre.z ?? (caja.z0 + caja.z1) / 2;
    const base = puntoPlano(ev, z); if (!base) { agarre = null; return; }
    Object.assign(agarre, { activo: true, m, e, base, z, caja, cajas0: m ? m.cajas.map(r => r.slice()) : null, d0: e ? (movidos[e.id] || [0, 0]).slice() : null, antes: m ? estadoMuro(m) : null });
    if (seleccion !== id) { seleccion = id; marcarFilaSel(); }
    ctrl.enabled = false; abajo = null; tip.hidden = true; try { lienzo.setPointerCapture(ev.pointerId); } catch (e) {} lienzo.style.cursor = 'grabbing';
  }
  ev.stopImmediatePropagation();
  const a = agarre, p = puntoPlano(ev, a.z); if (!p) return;
  let dx = p[0] - a.base[0], dy = p[1] - a.base[1];
  if (ev.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
  // posición de partida de la caja (la estructura ya puede venir corrida de antes)
  const b0 = a.e ? { ...a.caja, x0: a.caja.x0 + a.d0[0], x1: a.caja.x1 + a.d0[0], y0: a.caja.y0 + a.d0[1], y1: a.caja.y1 + a.d0[1] } : a.caja;
  const txt = []; let ref = null;
  if (!ev.altKey) {
    const zOk = r => r.z1 > b0.z0 + 0.05 && r.z0 < b0.z1 - 0.05;
    const refs = [...REFS_EST.filter(r => zOk(r) && r !== REF_DE.get(a.e?.id)), ...cajasDeMuros(o => o !== a.m && zOk(o))];
    const tol = Math.max(0.05, camara.position.distanceTo(ctrl.target) * 0.008);
    const { bx, by } = engancharCaja(b0, dx, dy, refs, tol);
    if (bx) { dx += bx.d; ref = bx.ref; txt.push(`x alineado con <b>${esc(bx.ref.nombre)}</b>`); }
    if (by) { dy += by.d; ref = ref || by.ref; txt.push(`y alineado con <b>${esc(by.ref.nombre)}</b>`); }
  }
  if (a.m) { a.m.cajas = a.cajas0.map(r => [r[0] + dx, r[1] + dy, r[2] + dx, r[3] + dy].map(v => +v.toFixed(3))); rehacerMuro(a.m); }
  else ponerCorrimiento(a.e, [a.d0[0] + dx, a.d0[1] + dy]);
  a.dx = dx; a.dy = dy;
  if (ref) { cajaRef.box.set(v3(ref.x0, ref.y1, ref.z0), v3(ref.x1, ref.y0, ref.z1)); cajaRef.visible = true; } else cajaRef.visible = false;
  etqEdicion.innerHTML = `Moviendo <b class="num">${fmt(Math.hypot(dx, dy), 2)} m</b>${txt.length ? ' · ' + txt.join(' · ') : ''} <span style="color:var(--muted)">· Shift: una dirección · Alt: sin enganche</span>`;
  const rc = lienzo.getBoundingClientRect(); etqEdicion.hidden = false;
  etqEdicion.style.left = Math.min(ev.clientX - rc.left + 16, rc.width - etqEdicion.offsetWidth - 8) + 'px'; etqEdicion.style.top = Math.max(8, ev.clientY - rc.top - 34) + 'px';
}, { capture: true });
function soltarAgarre(ev) {
  if (!agarre) return;
  const a = agarre; agarre = null;
  if (!a.activo) return;                                   // fue un clic: lo resuelve la selección de siempre
  ev.stopImmediatePropagation();
  ctrl.enabled = true; lienzo.style.cursor = 'grab'; cajaRef.visible = false; etqEdicion.hidden = true;
  if (!a.dx && !a.dy) { pintar(); return; }
  if (a.m) {
    recalcularMuro(a.m); guardarEdicion(a.m); const antes = a.antes, despues = estadoMuro(a.m), m = a.m;
    registrar({ nombre: 'mover ' + m.nombre, deshacer: () => ponerEstadoMuro(m, antes), rehacer: () => ponerEstadoMuro(m, despues) });
  } else {
    const e = a.e, antes = a.d0, despues = movidos[e.id] ? movidos[e.id].slice() : [0, 0];
    guardar('movidos', movidos);
    registrar({ nombre: 'mover ' + e.n, deshacer: () => { ponerCorrimiento(e, antes); guardar('movidos', movidos); }, rehacer: () => { ponerCorrimiento(e, despues); guardar('movidos', movidos); } });
  }
  refrescarTodo();
}
lienzo.addEventListener('pointerup', soltarAgarre, { capture: true });
lienzo.addEventListener('pointercancel', soltarAgarre, { capture: true });

// ---------- Navegación como en SketchUp ----------
// Ruedita apretada: orbitar alrededor del punto que está bajo el cursor. Shift + ruedita (o botón derecho): desplazar.
// Girar la ruedita: acercar o alejar hacia donde apunta el cursor. El botón izquierdo queda para elegir y mover.
// En pantallas táctiles sigue igual: un dedo orbita, dos dedos acercan y desplazan.
ctrl.mouseButtons = { LEFT: -1, MIDDLE: -1, RIGHT: THREE.MOUSE.PAN };
ctrl.enableZoom = false;
function puntoBajoCursor(ev) {
  rayoDesde(ev);
  const cand = [...mallas, ...sanMallas, ...MUROS].filter(m => { for (let o = m; o; o = o.parent) if (!o.visible) return false; return true; });
  const hit = ray2.intersectObjects(cand, false)[0];
  if (hit) return hit.point.clone();
  // Sin nada abajo: el punto del rayo a la distancia del centro de la vista
  return ray2.ray.at(camara.position.distanceTo(ctrl.target), new THREE.Vector3());
}
let nav = null;
lienzo.addEventListener('pointerdown', ev => {
  if (ev.button !== 1) return;
  ev.preventDefault(); ev.stopImmediatePropagation();
  nav = { x: ev.clientX, y: ev.clientY, pivote: puntoBajoCursor(ev), pan: ev.shiftKey };
  try { lienzo.setPointerCapture(ev.pointerId); } catch (e) {} lienzo.style.cursor = nav.pan ? 'move' : 'all-scroll'; tip.hidden = true; abajo = null;
}, { capture: true });
lienzo.addEventListener('pointermove', ev => {
  if (!nav) return;
  ev.stopImmediatePropagation();
  const mx = ev.clientX - nav.x, my = ev.clientY - nav.y; nav.x = ev.clientX; nav.y = ev.clientY;
  if (ev.shiftKey || nav.pan) {
    // Desplazar: lo que está a la profundidad del pivote sigue al cursor
    const h = lienzo.clientHeight, dist = camara.position.distanceTo(nav.pivote);
    const k = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camara.fov / 2)) / h;
    const der = new THREE.Vector3().setFromMatrixColumn(camara.matrix, 0), arr = new THREE.Vector3().setFromMatrixColumn(camara.matrix, 1);
    const mov = der.multiplyScalar(-mx * k).add(arr.multiplyScalar(my * k));
    camara.position.add(mov); ctrl.target.add(mov);
  } else {
    // Orbitar alrededor del pivote: giro horizontal sobre la vertical y giro vertical sobre el eje derecho de la cámara
    const P = nav.pivote, der = new THREE.Vector3().setFromMatrixColumn(camara.matrix, 0);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -mx * 0.006);
    const qv = new THREE.Quaternion().setFromAxisAngle(der, -my * 0.006);
    const dir = ctrl.target.clone().sub(camara.position).normalize().applyQuaternion(qv);
    if (Math.abs(dir.y) < 0.995) q.multiply(qv);              // no pasar por arriba de la vertical
    camara.position.sub(P).applyQuaternion(q).add(P); ctrl.target.sub(P).applyQuaternion(q).add(P);
  }
  camara.lookAt(ctrl.target); ctrl.update();
}, { capture: true });
const soltarNav = ev => { if (!nav) return; nav = null; ev.stopImmediatePropagation(); lienzo.style.cursor = ''; };
lienzo.addEventListener('pointerup', soltarNav, { capture: true });
lienzo.addEventListener('pointercancel', soltarNav, { capture: true });
lienzo.addEventListener('auxclick', ev => { if (ev.button === 1) ev.preventDefault(); });
lienzo.addEventListener('mousedown', ev => { if (ev.button === 1) ev.preventDefault(); });   // sin el autoscroll del navegador
lienzo.addEventListener('wheel', ev => {
  ev.preventDefault();
  const p = puntoBajoCursor(ev), f = Math.pow(1.0015, ev.deltaMode === 1 ? ev.deltaY * 33 : ev.deltaY);
  const nuevo = camara.position.clone().sub(p).multiplyScalar(f);
  if (nuevo.length() < 0.4 && f < 1) return;                // no meterse adentro del elemento
  camara.position.copy(p).add(nuevo); ctrl.target.sub(p).multiplyScalar(f).add(p);
  ctrl.update();
}, { passive: false });
