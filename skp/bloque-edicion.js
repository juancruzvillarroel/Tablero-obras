// ---------- Edición de muros: doble clic, flechas en las puntas y arriba, con enganche (snap) ----------
// Doble clic sobre un muro entra en edición: flechas en sus puntas libres (largo) y en su cara superior (altura).
// Arrastrando, la cara se mueve sobre su eje; cerca de una referencia se engancha y se muestra con qué.
// Largo: "contra" = la pieza está sobre la línea del muro; "alineado con" = cara de otra pieza del piso.
// Altura: fondo de losa o viga arriba del muro, altura de otros muros del piso o un nivel del edificio.
const ediciones = leer('murosEditados', {});
const cajaPlano = v => { const b = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9, z0: 1e9, z1: -1e9 }; for (let i = 0; i < v.length; i += 3) { const x = v[i] / 100, y = v[i + 1] / 100, z = v[i + 2] / 100; b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y); b.z0 = Math.min(b.z0, z); b.z1 = Math.max(b.z1, z); } return b; };
const REFS_EST = EL.filter(e => ['columna', 'tabique', 'viga'].includes(e.t)).map(e => ({ nombre: e.n, tipo: NOM_TIPO[e.t], ...cajaPlano(e.v) }));
const REFS_ARRIBA = EL.filter(e => ['losa', 'viga', 'escalera'].includes(e.t)).map(e => ({ nombre: e.n, tipo: NOM_TIPO[e.t], ...cajaPlano(e.v) }));
const muroPorId = Object.fromEntries(ALB.muros.map(m => [m.id, m]));
const mallaMuro = Object.fromEntries(MUROS.map(me => [me.userData.id.slice(5), me]));
function recalcularMuro(m) {
  m.planta = m.cajas.reduce((a, r) => a + (r[2] - r[0]) * (r[3] - r[1]), 0);
  m.alto = +(m.z1 - m.z0).toFixed(3);
  m.largo = +(m.planta / m.esp).toFixed(2); m.sup = +(m.largo * m.alto).toFixed(2); m.vol = +(m.planta * m.alto).toFixed(3);
}
function rehacerMuro(m) {
  const mesh = mallaMuro[m.id];
  const gs = m.cajas.map(([x0, y0, x1, y1]) => new THREE.BoxGeometry(x1 - x0, m.z1 - m.z0, y1 - y0).translate((x0 + x1) / 2 - OX, (m.z0 + m.z1) / 2, -((y0 + y1) / 2 - OY)));
  const geo = uvMundo(merge(gs)); mesh.geometry.dispose(); mesh.geometry = geo;
  mesh.children[0].geometry.dispose(); mesh.children[0].geometry = new THREE.EdgesGeometry(geo, 30);
}
const editado = m => ediciones[m.id] != null;
for (const m of ALB.muros) {
  m.cajasOrig = m.cajas.map(r => r.slice()); m.z1Orig = m.z1;
  const ed = ediciones[m.id];
  if (ed) { const cajas = Array.isArray(ed) ? ed : ed.cajas; m.cajas = cajas.map(r => r.slice()); if (!Array.isArray(ed) && ed.z1) m.z1 = ed.z1; recalcularMuro(m); rehacerMuro(m); }
}
const largoOriginal = m => m.cajasOrig.reduce((a, r) => a + (r[2] - r[0]) * (r[3] - r[1]), 0) / m.esp;

// Puntas libres: para cada rectángulo del muro, las caras de su eje largo que no tocan otro rectángulo del mismo muro
function puntasLibres(m) {
  const out = [];
  m.cajas.forEach((r, k) => {
    const ej = (r[2] - r[0]) >= (r[3] - r[1]) ? 0 : 1;
    if (Math.max(r[2] - r[0], r[3] - r[1]) < 2 * m.esp) return;     // trozos de encuentro, no son tramos
    for (const lado of [0, 1]) {
      const pos = r[ej + lado * 2];
      const solapa = q => Math.min(r[1 - ej + 2], q[1 - ej + 2]) - Math.max(r[1 - ej], q[1 - ej]) > 0.01;
      const toca = m.cajas.some((q, j) => j !== k && Math.abs((lado ? q[ej] : q[ej + 2]) - pos) < 0.02 && solapa(q));
      const dentro = m.cajas.some((q, j) => j !== k && q[ej] < pos - 0.01 && q[ej + 2] > pos + 0.01 && solapa(q));
      if (!toca && !dentro) out.push({ k, ej, lado });
    }
  });
  return out;
}
// Flechas (más chicas; se dibujan siempre por encima)
const matFlecha = new THREE.MeshBasicMaterial({ color: css('--accent'), depthTest: false, transparent: true, opacity: 0.95 });
const matFlechaHover = new THREE.MeshBasicMaterial({ color: '#f2a900', depthTest: false, transparent: true });
const geoFlecha = merge([new THREE.CylinderGeometry(0.018, 0.018, 0.12, 8).translate(0, 0.06, 0), new THREE.ConeGeometry(0.055, 0.11, 12).translate(0, 0.175, 0)]);
const grupoFlechas = new THREE.Group(); grupoFlechas.renderOrder = 10; escena.add(grupoFlechas);
const matGuia = new THREE.LineDashedMaterial({ color: css('--accent'), dashSize: 0.12, gapSize: 0.08, depthTest: false });
const guia = new THREE.Line(new THREE.BufferGeometry(), matGuia); guia.renderOrder = 11; guia.visible = false; escena.add(guia);
const cajaRef = new THREE.Box3Helper(new THREE.Box3(), new THREE.Color(css('--accent'))); cajaRef.material.depthTest = false; cajaRef.renderOrder = 11; cajaRef.visible = false; escena.add(cajaRef);
const etqEdicion = document.createElement('div'); etqEdicion.className = 'flota'; etqEdicion.hidden = true;
Object.assign(etqEdicion.style, { position: 'absolute', padding: '4px 8px', fontSize: '12px', pointerEvents: 'none', zIndex: 6, whiteSpace: 'nowrap' });
lienzo.parentElement.append(etqEdicion);
let flechas = [], arrastre = null, enEdicion = null;
function ponerFlechas() {
  grupoFlechas.clear(); flechas = [];
  const s = enEdicion && enEdicion === seleccion && SANP[seleccion];
  if (!s || s.k !== 'muro' || !s.m.visible) return;
  const m = s.o, zc = (m.z0 + m.z1) / 2;
  const nueva = (pos, dir, datos) => { const f = new THREE.Mesh(geoFlecha, matFlecha); f.renderOrder = 10; f.position.copy(pos).addScaledVector(dir, 0.03); f.quaternion.setFromUnitVectors(UP, dir); f.userData = { muro: m.id, dir, ...datos }; grupoFlechas.add(f); flechas.push(f); };
  for (const p of puntasLibres(m)) {
    const r = m.cajas[p.k], mid = [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2]; mid[p.ej] = r[p.ej + p.lado * 2];
    nueva(v3(mid[0], mid[1], zc), p.ej === 0 ? new THREE.Vector3(p.lado ? 1 : -1, 0, 0) : new THREE.Vector3(0, 0, p.lado ? -1 : 1), p);
  }
  // Altura: flecha en la cara superior, sobre el tramo más largo
  const k = m.cajas.map((r, i) => [i, Math.max(r[2] - r[0], r[3] - r[1])]).sort((a, b) => b[1] - a[1])[0][0], r = m.cajas[k];
  nueva(v3((r[0] + r[2]) / 2, (r[1] + r[3]) / 2, m.z1), new THREE.Vector3(0, 1, 0), { k, ej: 2, lado: 1 });
  escalarFlechas(); grupoFlechas.updateMatrixWorld(true);     // para poder agarrarlas antes del próximo cuadro
}
window.__agarres = ponerFlechas; window.__flechas = () => escalarFlechas();
function escalarFlechas() { for (const f of flechas) { const d = camara.position.distanceTo(f.position); f.scale.setScalar(Math.max(0.5, Math.min(2, d / 12))); } }
function editarMuro(id) { enEdicion = id; if (seleccion !== id) elegir(id); else { ponerFlechas(); refrescarResumen(); if (pestana === 'albanileria') refrescarAlbanileria(); } }
function salirEdicion() { if (!enEdicion) return; enEdicion = null; ponerFlechas(); }

// Enganche del largo: candidatos sobre el eje que se mueve
function engancharEn(m, k, ej, u, tol) {
  const r = m.cajas[k], l0 = r[1 - ej], l1 = r[1 - ej + 2];
  let mejor = null;
  const probar = (c, ref, contacto) => { const d = Math.abs(c - u) * (contacto ? 0.6 : 1); if (Math.abs(c - u) <= tol && (!mejor || d < mejor.d)) mejor = { c, d, ref, contacto }; };
  const zOk = b => b.z1 > m.z0 + 0.05 && b.z0 < m.z1 - 0.05;
  for (const b of REFS_EST) {
    if (!zOk(b)) continue;
    const bl0 = ej ? b.x0 : b.y0, bl1 = ej ? b.x1 : b.y1, contacto = Math.min(l1, bl1) - Math.max(l0, bl0) > -0.03;
    probar(ej ? b.y0 : b.x0, b, contacto); probar(ej ? b.y1 : b.x1, b, contacto);
  }
  for (const o of ALB.muros) {
    if (o.piso !== m.piso) continue;
    o.cajas.forEach((q, j) => {
      if (o === m && j === k) return;
      const contacto = Math.min(l1, q[1 - ej + 2]) - Math.max(l0, q[1 - ej]) > -0.03;
      const ref = { nombre: o.nombre, tipo: 'Muro', x0: q[0], x1: q[2], y0: q[1], y1: q[3], z0: o.z0, z1: o.z1 };
      probar(q[ej], ref, contacto); probar(q[ej + 2], ref, contacto);
    });
  }
  return mejor;
}
// Enganche de la altura
function engancharAlto(m, u, tol) {
  let mejor = null;
  const probar = (c, ref, contacto, texto) => { const d = Math.abs(c - u) * (contacto ? 0.6 : 1); if (Math.abs(c - u) <= tol && (!mejor || d < mejor.d)) mejor = { c, d, ref, contacto, texto }; };
  const sobre = b => m.cajas.some(r => Math.min(r[2], b.x1) - Math.max(r[0], b.x0) > 0.01 && Math.min(r[3], b.y1) - Math.max(r[1], b.y0) > 0.01);
  for (const b of REFS_ARRIBA) if (b.z0 > m.z0 + 0.3 && sobre(b)) probar(b.z0, b, true, `contra el fondo de <b>${esc(b.nombre)}</b> <span style="color:var(--muted)">(${esc(b.tipo)})</span>`);
  for (const o of ALB.muros) if (o !== m && o.piso === m.piso) probar(o.z1, { nombre: o.nombre, tipo: 'Muro', x0: o.cajas[0][0], x1: o.cajas[0][2], y0: o.cajas[0][1], y1: o.cajas[0][3], z0: o.z0, z1: o.z1 }, false, `a la altura de <b>${esc(o.nombre)}</b>`);
  for (const n of NIV) if (n.z > m.z0 + 0.3) probar(n.z, null, false, `al nivel <b>${esc(n.corto)}</b> (${fmt(n.z)})`);
  return mejor;
}
const ray2 = new THREE.Raycaster(), ptr2 = new THREE.Vector2();
function rayoDesde(ev) { const r = lienzo.getBoundingClientRect(); ptr2.set((ev.clientX - r.left) / r.width * 2 - 1, -(ev.clientY - r.top) / r.height * 2 + 1); ray2.setFromCamera(ptr2, camara); return r; }
// Punto del eje de la flecha más cercano al rayo del mouse (x, y del plano o z de altura)
function puntoEnEje(ev, f) {
  rayoDesde(ev);
  const o = f.position.clone(), d = f.userData.dir.clone(), w = o.clone().sub(ray2.ray.origin), rd = ray2.ray.direction;
  const a = d.dot(d), b = d.dot(rd), c = rd.dot(rd), dd = d.dot(w), e = rd.dot(w), den = a * c - b * b;
  const t = Math.abs(den) < 1e-6 ? 0 : (b * e - c * dd) / den;
  const p = o.addScaledVector(d, t);
  return f.userData.ej === 0 ? p.x + OX : f.userData.ej === 1 ? -p.z + OY : p.y;
}
const caraDe = (m, d) => d.ej === 2 ? m.z1 : m.cajas[d.k][d.ej + d.lado * 2];
lienzo.addEventListener('pointerdown', ev => {
  if (!flechas.length) return;
  camara.updateMatrixWorld(); grupoFlechas.updateMatrixWorld(true); rayoDesde(ev);
  const hit = ray2.intersectObjects(flechas, false)[0]; if (!hit) return;
  ev.stopImmediatePropagation(); ev.preventDefault();
  ctrl.enabled = false; abajo = null; lienzo.setPointerCapture(ev.pointerId);
  const f = hit.object, m = muroPorId[f.userData.muro];
  // Se guarda la distancia entre el punto agarrado y la cara, para que no salte al empezar a arrastrar.
  arrastre = { f, m, desfase: caraDe(m, f.userData) - puntoEnEje(ev, f) };
}, { capture: true });
lienzo.addEventListener('pointermove', ev => {
  if (!arrastre) {
    if (!flechas.length || ev.buttons) return;
    rayoDesde(ev); const hit = ray2.intersectObjects(flechas, false)[0];
    flechas.forEach(f => f.material = f === hit?.object ? matFlechaHover : matFlecha);
    if (hit) { lienzo.style.cursor = hit.object.userData.ej === 2 ? 'ns-resize' : 'ew-resize'; ev.stopImmediatePropagation(); tip.hidden = true; } else lienzo.style.cursor = '';
    return;
  }
  ev.stopImmediatePropagation();
  const { f, m } = arrastre, { k, ej, lado } = f.userData;
  let u = puntoEnEje(ev, f) + arrastre.desfase, sn = null, texto;
  const tol = Math.max(0.05, camara.position.distanceTo(f.position) * 0.01);
  if (ej === 2) {
    u = Math.max(u, m.z0 + 0.3);
    sn = ev.altKey ? null : engancharAlto(m, u, tol); if (sn) u = sn.c;
    m.z1 = +u.toFixed(3);
  } else {
    const r = m.cajas[k], otro = r[ej + (1 - lado) * 2];
    u = lado ? Math.max(u, otro + 0.1) : Math.min(u, otro - 0.1);       // tramo de al menos 10 cm
    sn = ev.altKey ? null : engancharEn(m, k, ej, u, tol); if (sn) u = sn.c;
    r[ej + lado * 2] = +u.toFixed(3);
    if (sn) sn.texto = `${sn.contacto ? 'contra' : 'alineado con'} <b>${esc(sn.ref.nombre)}</b> <span style="color:var(--muted)">(${esc(sn.ref.tipo)})</span>`;
  }
  recalcularMuro(m); rehacerMuro(m); ponerFlechas();
  // Guía y referencia
  const r = m.cajas[k], zc = ej === 2 ? m.z1 : (m.z0 + m.z1) / 2;
  if (sn && sn.ref) {
    const b = sn.ref, enEje = [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2], refC = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
    if (ej < 2) { enEje[ej] = u; refC[ej] = u; }
    const pA = v3(enEje[0], enEje[1], zc), pB = v3(refC[0], refC[1], zc), ext = pB.clone().sub(pA); if (ext.length() > 1e-3) ext.setLength(0.4);
    guia.geometry.dispose(); guia.geometry = new THREE.BufferGeometry().setFromPoints([pA.clone().sub(ext), pB.clone().add(ext)]); guia.computeLineDistances(); guia.visible = true;
    cajaRef.box.set(v3(b.x0, b.y1, b.z0), v3(b.x1, b.y0, b.z1)); cajaRef.visible = true;
  } else { guia.visible = false; cajaRef.visible = false; }
  const medida = ej === 2 ? `<b class="num">${fmt(m.alto, 2)} m</b> de alto` : `<b class="num">${fmt(m.largo, 2)} m</b> de muro${m.cajas.length > 1 ? ` · tramo ${fmt(r[ej + 2] - r[ej], 2)} m` : ''}`;
  etqEdicion.innerHTML = `${medida}${sn ? ' · ' + sn.texto : ' <span style="color:var(--muted)">· Alt: sin enganche</span>'}`;
  const rc = lienzo.getBoundingClientRect(); etqEdicion.hidden = false;
  etqEdicion.style.left = Math.min(ev.clientX - rc.left + 16, rc.width - etqEdicion.offsetWidth - 8) + 'px'; etqEdicion.style.top = Math.max(8, ev.clientY - rc.top - 34) + 'px';
}, { capture: true });
function guardarEdicion(m) {
  const igualCajas = m.cajas.every((r, i) => r.every((v, j) => Math.abs(v - m.cajasOrig[i][j]) < 1e-4)), igualAlto = Math.abs(m.z1 - m.z1Orig) < 1e-4;
  if (igualCajas && igualAlto) delete ediciones[m.id]; else ediciones[m.id] = { cajas: m.cajas, z1: m.z1 };
  guardar('murosEditados', ediciones);
}
const terminarArrastre = ev => {
  if (!arrastre) return;
  ev.stopImmediatePropagation();
  const { m } = arrastre; arrastre = null; ctrl.enabled = true;
  guia.visible = false; cajaRef.visible = false; etqEdicion.hidden = true;
  guardarEdicion(m);
  refrescarKpis(); if (pestana === 'albanileria') refrescarAlbanileria(); refrescarResumen();
};
lienzo.addEventListener('pointerup', terminarArrastre, { capture: true });
lienzo.addEventListener('pointercancel', terminarArrastre, { capture: true });
// Doble clic: editar el muro que está bajo el mouse
lienzo.addEventListener('dblclick', ev => { const id = tocar(ev); if (id && id.startsWith('muro:')) editarMuro(id); });
addEventListener('keydown', ev => { if (ev.key === 'Escape' && enEdicion) { ev.stopImmediatePropagation(); salirEdicion(); refrescarResumen(); } }, true);
function restablecerMuro(id) {
  const m = muroPorId[id]; m.cajas = m.cajasOrig.map(r => r.slice()); m.z1 = m.z1Orig; delete ediciones[id]; guardar('murosEditados', ediciones);
  recalcularMuro(m); rehacerMuro(m); ponerFlechas(); refrescarKpis(); if (pestana === 'albanileria') refrescarAlbanileria(); refrescarResumen();
}

// ---------- Foco: con un elemento elegido, todo lo demás se aclara (también lo de su misma capa) ----------
const _tenue = new Map(), _resalte = new Map();
const matBordeSel = new THREE.LineBasicMaterial({ color: css('--accent'), transparent: true, opacity: 0.9 });
function tenue(mat) {
  let f = _tenue.get(mat); if (!f) { f = mat.clone(); _tenue.set(mat, f); }
  f.map = mat.map; if (f.color && mat.color) f.color.copy(mat.color).lerp(new THREE.Color(0xffffff), 0.35);
  f.transparent = true; f.opacity = 0.14; f.depthWrite = false; return f;
}
function resaltado(mat) {
  let f = _resalte.get(mat); if (!f) { f = mat.clone(); _resalte.set(mat, f); }
  f.map = mat.map; if (f.color && mat.color) f.color.copy(mat.color);
  f.transparent = false; f.opacity = 1; f.depthWrite = true; if (f.emissive) f.emissive.set(0x1c2a40); return f;
}
function aplicarFoco() {
  const hay = !!seleccion;
  for (const mesh of [...MUROS, ...sanMallas]) {
    if (!mesh.isMesh) continue;
    const base = mesh.userData.base || (mesh.userData.base = mesh.material);
    if (MUROS.includes(mesh)) mesh.userData.base = mM(SANP[mesh.userData.id].o.tipo);
    const b = mesh.userData.base;
    mesh.material = !hay ? b : mesh.userData.id === seleccion ? resaltado(b) : tenue(b);
    const borde = mesh.children.find(c => c.isLineSegments);
    if (borde) { borde.userData.base ||= borde.material; borde.material = hay && mesh.userData.id === seleccion ? matBordeSel : borde.userData.base; borde.visible = !hay || mesh.userData.id === seleccion || modo !== 'instalacion'; }
  }
}
