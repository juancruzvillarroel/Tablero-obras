// ---------- Plano de sección ----------
// Clic derecho en el espacio de trabajo: crear o borrar un plano de sección horizontal. Corta el modelo a su altura:
// lo de arriba se oculta y lo que lo atraviesa se ve cortado. Se sube y baja arrastrando su manija (se engancha en
// los niveles de losa y a 1,20 m sobre cada uno, la altura de corte de una planta) o desde la barra de arriba.
// Los cómputos cuentan solo lo que queda abajo; una pieza cortada cuenta en la proporción de su altura que queda.
var corte = null;                                   // { z } en metros, o null sin plano
const planoCorte = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
renderer.localClippingEnabled = false;
function fracZ(z0, z1) { if (!corte || z1 <= corte.z) return 1; if (z0 >= corte.z) return 0; return (corte.z - z0) / Math.max(z1 - z0, 1e-6); }
const fEl = e => fracZ(e.caja0.z0, e.caja0.z1);
const fMuro = m => fracZ(m.z0, m.z1);
function zTramo(t) { if (!t._z) { let a = 1e9, b = -1e9; for (let i = 2; i < t.p.length; i += 3) { a = Math.min(a, t.p[i] / 100); b = Math.max(b, t.p[i] / 100); } t._z = [a, b]; } return t._z; }
const fSan = s => s.k === 'tramo' ? fracZ(...zTramo(s.o)) : s.centro ? (corte && s.centro.y > corte.z ? 0 : 1) : 1;
const enCorte = e => { const f = fEl(e); return f >= 1 ? e : { ...e, vol: e.vol * f, enc: e.enc * f }; };
const enCorteMuro = m => { const f = fMuro(m); return f >= 1 ? m : { ...m, sup: m.sup * f, vol: m.vol * f, alto: m.alto * f }; };
function factorId(id) {
  if (porId[id]) return fEl(porId[id]);
  if (id.startsWith('muro:')) { const m = muroPorId[id.slice(5)]; return m ? fMuro(m) : 1; }
  return SANP[id] ? fSan(SANP[id]) : 1;
}

// Ayudas visuales (plano translúcido, contorno y manija): van en una escena aparte que no se recorta.
const escenaCorte = new THREE.Scene();
const tamCorte = CAJA.getSize(new THREE.Vector3()), cenCorte = CAJA.getCenter(new THREE.Vector3());
const lamina = new THREE.Mesh(new THREE.PlaneGeometry(tamCorte.x + 3, tamCorte.z + 3).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: css('--accent'), transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
const borde = new THREE.LineSegments(new THREE.EdgesGeometry(lamina.geometry), new THREE.LineBasicMaterial({ color: css('--accent') }));
const manija = new THREE.Mesh(merge([new THREE.ConeGeometry(0.22, 0.4, 16).translate(0, 0.45, 0), new THREE.ConeGeometry(0.22, 0.4, 16).rotateX(Math.PI).translate(0, -0.45, 0), new THREE.CylinderGeometry(0.06, 0.06, 0.6, 10)]),
  new THREE.MeshBasicMaterial({ color: css('--accent') }));
const grupoCorte = new THREE.Group(); grupoCorte.add(lamina, borde, manija); escenaCorte.add(grupoCorte);
manija.position.set(cenCorte.x + tamCorte.x / 2 + 1.5, 0, cenCorte.z - tamCorte.z / 2 - 1.5);
lamina.position.set(cenCorte.x, 0, cenCorte.z); borde.position.copy(lamina.position);
grupoCorte.visible = false;

// Barra de arriba
const barraCorte = document.createElement('div'); barraCorte.className = 'flota barra-corte'; barraCorte.hidden = true;
barraCorte.innerHTML = `<b>Plano de sección</b>
  <button type="button" class="btn" data-paso="-1" title="Bajar al nivel de abajo">▼</button>
  <input type="range" id="corteRango" aria-label="Altura del plano de sección">
  <button type="button" class="btn" data-paso="1" title="Subir al nivel de arriba">▲</button>
  <input type="number" id="corteNum" class="inline-num" step="0.05" style="width:72px" aria-label="Altura en metros"> m
  <button type="button" class="btn" id="corteBorrar">Borrar</button>`;
lienzo.parentElement.append(barraCorte);
const rango = barraCorte.querySelector('#corteRango'), num = barraCorte.querySelector('#corteNum');
const zMin = CAJA.min.y + 0.05, zMax = CAJA.max.y + 0.2;
Object.assign(rango, { min: zMin, max: zMax, step: 0.01 }); Object.assign(num, { min: zMin.toFixed(2), max: zMax.toFixed(2) });

function ponerCorte(z, guardarlo = true) {
  if (z == null) { corte = null; grupoCorte.visible = false; barraCorte.hidden = true; }
  else {
    z = Math.min(zMax, Math.max(zMin, z)); corte = { z };
    planoCorte.constant = z; grupoCorte.visible = true; lamina.position.y = borde.position.y = manija.position.y = z;
    barraCorte.hidden = false; rango.value = z; if (document.activeElement !== num) num.value = z.toFixed(2);
  }
  if (guardarlo) guardar('corte', corte);
  if (seleccion && factorId(seleccion) === 0) { seleccion = null; marcarFilaSel(); }
  pintar();
}
// Altura con nombre: nivel de losa o corte de planta (1,20 m sobre la losa)
function engancheCorte(z, tol) {
  let mejor = null;
  for (const n of NIV) for (const [c, t] of [[n.z, `nivel de losa ${n.losa}`], [n.z + 1.2, `corte de planta ${n.corto} (+1,20)`]]) {
    const d = Math.abs(c - z); if (d <= tol && (!mejor || d < mejor.d)) mejor = { d, c, t };
  }
  return mejor;
}
rango.oninput = () => ponerCorte(+rango.value);
num.onchange = () => { const v = parseFloat(String(num.value).replace(',', '.')); if (Number.isFinite(v)) ponerCorte(v); };
barraCorte.querySelectorAll('[data-paso]').forEach(b => b.onclick = () => {
  // Paso entre alturas útiles: cada losa y su corte de planta
  const alt = NIV.flatMap(n => [n.z, n.z + 1.2]).sort((a, b) => a - b), z = corte.z, s = +b.dataset.paso;
  const sig = s > 0 ? alt.find(a => a > z + 0.01) : alt.slice().reverse().find(a => a < z - 0.01);
  if (sig != null) ponerCorte(sig);
});
barraCorte.querySelector('#corteBorrar').onclick = () => { ponerCorte(null); avisoBreve('Plano de sección borrado'); };

// Arrastrar la manija (eje vertical que pasa por ella)
const rayC = new THREE.Raycaster(), ptrC = new THREE.Vector2();
function rayoCorte(ev) { const r = lienzo.getBoundingClientRect(); ptrC.set((ev.clientX - r.left) / r.width * 2 - 1, -(ev.clientY - r.top) / r.height * 2 + 1); rayC.setFromCamera(ptrC, camara); }
function zEnEje(ev) {
  rayoCorte(ev);
  const o = manija.position.clone(), d = new THREE.Vector3(0, 1, 0), w = o.clone().sub(rayC.ray.origin), rd = rayC.ray.direction;
  const b = d.dot(rd), c = rd.dot(rd), dd = d.dot(w), e = rd.dot(w), den = c - b * b;
  return o.y + (Math.abs(den) < 1e-6 ? 0 : (b * e - c * dd) / den);
}
let arrCorte = null;
lienzo.addEventListener('pointerdown', ev => {
  if (!corte || ev.button !== 0) return;
  rayoCorte(ev); manija.updateMatrixWorld(); if (!rayC.intersectObject(manija, false).length) return;
  ev.stopImmediatePropagation(); ev.preventDefault();
  arrCorte = { desfase: corte.z - zEnEje(ev) }; ctrl.enabled = false; abajo = null; try { lienzo.setPointerCapture(ev.pointerId); } catch (e) {}
}, { capture: true });
lienzo.addEventListener('pointermove', ev => {
  if (!corte) return;
  if (!arrCorte) {
    if (ev.buttons) return;
    rayoCorte(ev); manija.updateMatrixWorld();
    const sobre = rayC.intersectObject(manija, false).length > 0;
    manija.material.color.set(sobre ? css('--accent-ink') === '#fff' ? '#5aa0ff' : css('--accent') : css('--accent'));
    if (sobre) { lienzo.style.cursor = 'ns-resize'; tip.hidden = true; ev.stopImmediatePropagation(); }
    return;
  }
  ev.stopImmediatePropagation();
  let z = zEnEje(ev) + arrCorte.desfase, sn = ev.altKey ? null : engancheCorte(z, Math.max(0.06, camara.position.distanceTo(manija.position) * 0.006));
  if (sn) z = sn.c;
  ponerCorte(z, false);
  etqEdicion.innerHTML = `Corte a <b class="num">${fmt(corte.z, 2)} m</b>${sn ? ' · ' + esc(sn.t) : ' <span style="color:var(--muted)">· Alt: sin enganche</span>'}`;
  const rc = lienzo.getBoundingClientRect(); etqEdicion.hidden = false;
  etqEdicion.style.left = Math.min(ev.clientX - rc.left + 16, rc.width - etqEdicion.offsetWidth - 8) + 'px'; etqEdicion.style.top = Math.max(8, ev.clientY - rc.top - 34) + 'px';
}, { capture: true });
const soltarCorte = ev => { if (!arrCorte) return; arrCorte = null; ev.stopImmediatePropagation(); ctrl.enabled = true; etqEdicion.hidden = true; lienzo.style.cursor = ''; guardar('corte', corte); };
lienzo.addEventListener('pointerup', soltarCorte, { capture: true });
lienzo.addEventListener('pointercancel', soltarCorte, { capture: true });

// Menú del clic derecho (si el botón derecho se arrastró, fue para desplazar la vista: no hay menú)
const menuCtx = document.createElement('div'); menuCtx.className = 'flota menu-ctx'; menuCtx.hidden = true; menuCtx.setAttribute('role', 'menu');
lienzo.parentElement.append(menuCtx);
let derAbajo = null;
lienzo.addEventListener('pointerdown', ev => { if (ev.button === 2) derAbajo = [ev.clientX, ev.clientY]; menuCtx.hidden = true; }, { capture: true });
lienzo.addEventListener('contextmenu', ev => {
  ev.preventDefault();
  if (derAbajo && Math.hypot(ev.clientX - derAbajo[0], ev.clientY - derAbajo[1]) > 5) return;
  const rc = lienzo.getBoundingClientRect();
  const zAqui = (() => { const p = puntoBajoCursor(ev); return p && Number.isFinite(p.y) ? p.y : null; })();
  const ops = corte
    ? [['bajar', 'Llevar el plano a esta altura', zAqui != null], ['borrar', 'Borrar plano de sección', true]]
    : [['crear', 'Crear plano de sección', true]];
  menuCtx.innerHTML = ops.filter(o => o[2]).map(([k, t]) => `<button type="button" role="menuitem" data-op="${k}">${t}</button>`).join('');
  menuCtx.hidden = false;
  menuCtx.style.left = Math.min(ev.clientX - rc.left, rc.width - menuCtx.offsetWidth - 6) + 'px';
  menuCtx.style.top = Math.min(ev.clientY - rc.top, rc.height - menuCtx.offsetHeight - 6) + 'px';
  menuCtx.dataset.z = zAqui ?? '';
  menuCtx.querySelector('button')?.focus();
});
menuCtx.addEventListener('click', ev => {
  const b = ev.target.closest('[data-op]'); if (!b) return;
  menuCtx.hidden = true;
  const zAqui = menuCtx.dataset.z === '' ? null : +menuCtx.dataset.z;
  if (b.dataset.op === 'borrar') { ponerCorte(null); avisoBreve('Plano de sección borrado'); return; }
  // Al crear: a la altura de lo que estaba bajo el cursor, o a 1,20 m sobre la losa del nivel elegido, o a media altura
  let z = zAqui ?? (nivelSel ? NIV[nivIdx[nivelSel]].z + 1.2 : (CAJA.min.y + CAJA.max.y) / 2);
  const sn = engancheCorte(z, 0.25); if (sn) z = sn.c;
  ponerCorte(z); avisoBreve(b.dataset.op === 'crear' ? 'Plano de sección creado · arrastrá la flecha para subirlo o bajarlo' : 'Plano movido');
});
addEventListener('pointerdown', ev => { if (!menuCtx.hidden && !menuCtx.contains(ev.target)) menuCtx.hidden = true; }, true);
addEventListener('keydown', ev => { if (ev.key === 'Escape' && !menuCtx.hidden) { menuCtx.hidden = true; ev.stopImmediatePropagation(); } }, true);

// Dibujo: el modelo con el corte y después las ayudas del plano sin recortar
window.__dibujar = () => {
  renderer.clippingPlanes = corte ? [planoCorte] : [];
  renderer.render(escena, camara);
  if (corte) { renderer.clippingPlanes = []; renderer.autoClear = false; renderer.render(escenaCorte, camara); renderer.autoClear = true; }
};
{ const g = leer('corte', null); if (g && Number.isFinite(g.z)) ponerCorte(g.z, false); }
