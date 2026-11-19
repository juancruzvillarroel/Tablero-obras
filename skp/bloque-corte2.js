// ---------- Plano de sección ----------
// Horizontal o vertical. Se crea desde el botón "Plano de sección" de abajo o con clic derecho en el espacio de trabajo.
// Corta el modelo: lo del otro lado se oculta y lo que lo atraviesa se ve cortado. Se mueve arrastrando su manija
// (el horizontal se engancha en los niveles de losa y a 1,20 m sobre cada uno, la altura de corte de una planta; el
// vertical, en las caras y ejes de columnas y tabiques) o desde la barra de arriba. Se elige qué lado se ve. Los
// cómputos cuentan solo ese lado; una pieza cortada cuenta el volumen real que queda de ese lado.
var corte = null;   // { eje, c, mas } o null. eje de la escena: 'y' horizontal, 'x' o 'z' vertical; c en metros; mas: se ve el lado de coordenadas mayores
const planoCorte = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
renderer.localClippingEnabled = false;
const esVertical = () => !!corte && corte.eje !== 'y';
// Fracción de un tramo [a0, a1] sobre el eje del corte que queda del lado visible
function fracRango(a0, a1) {
  if (!corte) return 1;
  const menos = a1 <= corte.c ? 1 : a0 >= corte.c ? 0 : (corte.c - a0) / Math.max(a1 - a0, 1e-6);
  return corte.mas ? 1 - menos : menos;
}
const delLado = p => !corte || (corte.mas ? p[corte.eje] >= corte.c - 0.002 : p[corte.eje] <= corte.c + 0.002);
// Vértices de un elemento en metros y en coordenadas de la escena, rotados con una permutación cíclica (no cambia la
// orientación de las caras) para que el eje del corte quede tercero: así el mismo cálculo sirve para cualquier plano.
const PERM = { x: [1, 2, 0], y: [2, 0, 1], z: [0, 1, 2] };
function vertsEje(e, eje) {
  e._ve ||= {}; if (e._ve[eje]) return e._ve[eje];
  const v = e.v, P = PERM[eje], out = new Float64Array(v.length); let lo = 1e9, hi = -1e9;
  for (let i = 0; i < v.length; i += 3) {
    const s = [v[i] / 100 - OX, v[i + 2] / 100, -(v[i + 1] / 100 - OY)];
    out[i] = s[P[0]]; out[i + 1] = s[P[1]]; out[i + 2] = s[P[2]]; lo = Math.min(lo, out[i + 2]); hi = Math.max(hi, out[i + 2]);
  }
  out.lo = lo; out.hi = hi; return e._ve[eje] = out;
}
const fEl = e => { if (!corte) return 1; const w = vertsEje(e, corte.eje); return fracRango(w.lo, w.hi); };
function rangoMuro(m, eje) {
  if (eje === 'y') return [m.z0, m.z1];
  let a = 1e9, b = -1e9;
  for (const [x0, y0, x1, y1] of m.cajas) for (const s of eje === 'x' ? [x0 - OX, x1 - OX] : [-(y0 - OY), -(y1 - OY)]) { a = Math.min(a, s); b = Math.max(b, s); }
  return [a, b];
}
const fMuro = m => corte ? fracRango(...rangoMuro(m, corte.eje)) : 1;
function rangoTramo(t, eje) {
  t._r ||= {};
  if (!t._r[eje]) { let a = 1e9, b = -1e9; for (let i = 0; i < t.p.length; i += 3) { const s = eje === 'x' ? t.p[i] / 100 - OX : eje === 'y' ? t.p[i + 2] / 100 : -(t.p[i + 1] / 100 - OY); a = Math.min(a, s); b = Math.max(b, s); } t._r[eje] = [a, b]; }
  return t._r[eje];
}
const fSan = s => !corte ? 1 : s.k === 'tramo' ? fracRango(...rangoTramo(s.o, corte.eje)) : s.centro ? (delLado(s.centro) ? 1 : 0) : 1;
// Volumen real del lado visible: se recorta la malla contra el plano y se integra (w - h)·nw sobre lo que queda del
// lado de abajo del eje (teorema de la divergencia con el campo (0, 0, w - h): la tapa del corte no suma). Así una
// base con la zapata abajo y el fuste angosto arriba cuenta lo que de verdad queda, no una proporción de su altura.
// Si la malla no es cerrada o su volumen no coincide con el del elemento, se mide con rayos (rayosBajo).
function fraccionVol(e) {
  const fl = fEl(e); if (!corte || fl === 0 || fl === 1) return fl;
  const clave = corte.eje + corte.c + (corte.mas ? 'a' : 'b'); if (e._fc && e._fc.k === clave) return e._fc.f;
  const v = vertsEje(e, corte.eje), h = corte.c; let vb = 0, vt = 0;
  const sa = (a, b, c) => ((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
  const tri = (a, b, c, hh) => sa(a, b, c) * ((a[2] + b[2] + c[2]) / 3 - hh);
  for (let i = 0; i < v.length; i += 9) {
    const T = [0, 3, 6].map(o => [v[i + o], v[i + o + 1], v[i + o + 2]]);
    vt += tri(T[0], T[1], T[2], 0);
    const P = [];
    for (let k = 0; k < 3; k++) { const a = T[k], b = T[(k + 1) % 3], ia = a[2] <= h, ib = b[2] <= h; if (ia) P.push(a); if (ia !== ib) { const s = (h - a[2]) / (b[2] - a[2]); P.push([a[0] + s * (b[0] - a[0]), a[1] + s * (b[1] - a[1]), h]); } }
    for (let k = 1; k + 1 < P.length; k++) vb += tri(P[0], P[k], P[k + 1], h);
  }
  let menos;
  const vref = e.volBruto ?? e.vol;
  if (Math.abs(Math.abs(vt) - vref) <= 0.05 * vref + 0.01 && Math.abs(vt) > 1e-6) menos = Math.min(1, Math.max(0, vb / vt));
  else menos = rayosBajo(v, h);     // pieza que no cierra en el SketchUp: se mide con rayos, como su volumen
  const f = corte.mas ? 1 - menos : menos;
  e._fc = { k: clave, f }; return f;
}
// Fracción del volumen con tercera coordenada menor que h, medida con rayos paralelos a ese eje cada 1 cm (para piezas
// cuya malla no cierra). Los rayos solo cruzan caras que no son paralelas a ellos, así que un hueco en esas no afecta.
function rayosBajo(v, h, paso = 0.01) {
  const T = []; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let i = 0; i < v.length; i += 9) { const t = [0, 3, 6].map(o => [v[i + o], v[i + o + 1], v[i + o + 2]]); T.push(t); for (const p of t) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } }
  let tot = 0, bajo = 0;
  for (let x = x0 + paso / 2; x < x1; x += paso) for (let y = y0 + paso / 2; y < y1; y += paso) {
    const zs = [];
    for (const [a, b, c] of T) {
      const den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]); if (Math.abs(den) < 1e-14) continue;
      const l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / den, l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / den, l3 = 1 - l1 - l2;
      if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue; zs.push(l1 * a[2] + l2 * b[2] + l3 * c[2]);
    }
    zs.sort((p, q) => p - q); const u = []; for (const z of zs) if (!u.length || z - u[u.length - 1] > 1e-6) u.push(z);
    for (let i = 0; i + 1 < u.length; i += 2) { tot += u[i + 1] - u[i]; bajo += Math.max(0, Math.min(u[i + 1], h) - u[i]); }
  }
  return tot > 0 ? bajo / tot : 0;
}
// Hormigón compartido con otra pieza (superposiciones.js guarda la caja de la zona en común): se reparte según cuánto
// de esa caja queda del lado visible. Datos viejos sin la caja en planta: la misma proporción que la pieza.
function rangoDesc(d, eje) {
  if (eje === 'y') return [d.z0, d.z1];
  if (d.x0 == null) return null;
  return eje === 'x' ? [d.x0 - OX, d.x1 - OX] : [-(d.y1 - OY), -(d.y0 - OY)];
}
const fracDesc = (d, e) => { if (!corte) return 1; const r = rangoDesc(d, corte.eje); return r ? fracRango(r[0], r[1]) : fraccionVol(e); };
const volVisible = e => Math.max(0, (e.volBruto ?? e.vol) * fraccionVol(e) - descActivos(e).reduce((s, d) => s + d.vol * fracDesc(d, e), 0));
const enCorte = e => { const fl = fEl(e); if (fl >= 1) return e; return { ...e, vol: volVisible(e), enc: e.enc * fl }; };
// Muros: con corte horizontal se recorta su alto; con uno vertical, su largo (el alto queda igual).
const enCorteMuro = m => { const f = fMuro(m); return f >= 1 ? m : { ...m, sup: m.sup * f, vol: m.vol * f, alto: esVertical() ? m.alto : m.alto * f }; };
function factorId(id) {
  if (porId[id]) { const e = porId[id]; return e.vol > 0 ? volVisible(e) / e.vol : fraccionVol(e); }
  if (id.startsWith('muro:')) { const m = muroPorId[id.slice(5)]; return m ? fMuro(m) : 1; }
  return SANP[id] ? fSan(SANP[id]) : 1;
}

// Ayudas visuales (plano translúcido, contorno y manija): van en una escena aparte que no se recorta.
const escenaCorte = new THREE.Scene();
const tamCorte = CAJA.getSize(new THREE.Vector3()), cenCorte = CAJA.getCenter(new THREE.Vector3());
const lamina = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: css('--accent'), transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
const borde = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: css('--accent') }));
const geoFlechas = merge([new THREE.ConeGeometry(0.22, 0.4, 16).translate(0, 0.45, 0), new THREE.ConeGeometry(0.22, 0.4, 16).rotateX(Math.PI).translate(0, -0.45, 0), new THREE.CylinderGeometry(0.06, 0.06, 0.6, 10)]);
const manija = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: css('--accent') }));
const grupoCorte = new THREE.Group(); grupoCorte.add(lamina, borde, manija); escenaCorte.add(grupoCorte);
grupoCorte.visible = false;
let ejeAyudas = null;
function armarAyudas(eje) {
  if (ejeAyudas === eje) return; ejeAyudas = eje;
  const m = 1.5;
  const g = eje === 'y' ? new THREE.PlaneGeometry(tamCorte.x + 2 * m, tamCorte.z + 2 * m).rotateX(-Math.PI / 2)
    : eje === 'x' ? new THREE.PlaneGeometry(tamCorte.z + 2 * m, tamCorte.y + 2 * m).rotateY(Math.PI / 2)
    : new THREE.PlaneGeometry(tamCorte.x + 2 * m, tamCorte.y + 2 * m);
  lamina.geometry.dispose(); lamina.geometry = g;
  borde.geometry.dispose(); borde.geometry = new THREE.EdgesGeometry(g);
  const f = geoFlechas.clone(); if (eje === 'x') f.rotateZ(Math.PI / 2); else if (eje === 'z') f.rotateX(Math.PI / 2);
  manija.geometry.dispose(); manija.geometry = f;
  lamina.position.copy(cenCorte); borde.position.copy(cenCorte);
  // Horizontal: la manija en una esquina, afuera del edificio. Vertical: arriba del edificio.
  if (eje === 'y') manija.position.set(cenCorte.x + tamCorte.x / 2 + m, 0, cenCorte.z - tamCorte.z / 2 - m);
  else manija.position.set(cenCorte.x, CAJA.max.y + 1.2, cenCorte.z);
}

// Barra de arriba
const barraCorte = document.createElement('div'); barraCorte.className = 'flota barra-corte'; barraCorte.hidden = true;
barraCorte.innerHTML = `<b>Plano de sección</b>
  <div class="seg" role="group" aria-label="Orientación del plano"><button type="button" data-orient="y">Horizontal</button><button type="button" data-orient="v">Vertical</button></div>
  <button type="button" class="btn" id="corteGirar" title="Girar el plano vertical 90°">Girar 90°</button>
  <button type="button" class="btn" data-paso="-1"></button>
  <input type="range" id="corteRango" aria-label="Posición del plano de sección">
  <button type="button" class="btn" data-paso="1"></button>
  <input type="number" id="corteNum" class="inline-num" step="0.05" style="width:72px"> m
  <div class="seg" role="group" aria-label="Qué lado se ve"><button type="button" data-lado="menos"></button><button type="button" data-lado="mas"></button></div>
  <button type="button" class="btn" id="corteBorrar">Borrar</button>`;
lienzo.parentElement.append(barraCorte);
const rango = barraCorte.querySelector('#corteRango'), num = barraCorte.querySelector('#corteNum');
// Límites del plano en cada eje. El número de la barra es la altura (horizontal) o la distancia al borde del edificio (vertical).
const limites = eje => eje === 'y' ? [CAJA.min.y + 0.05, CAJA.max.y + 0.2] : [CAJA.min[eje] - 0.2, CAJA.max[eje] + 0.2];
const origenNum = eje => eje === 'y' ? 0 : CAJA.min[eje];
function actualizarBarra() {
  const v = esVertical(), [lo, hi] = limites(corte.eje), o = origenNum(corte.eje);
  barraCorte.querySelectorAll('[data-orient]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.orient === 'y') !== v)));
  barraCorte.querySelector('#corteGirar').hidden = !v;
  const [bm, bp] = barraCorte.querySelectorAll('[data-paso]');
  bm.textContent = v ? '◀' : '▼'; bm.title = v ? 'Al eje de columnas anterior' : 'Bajar al nivel de abajo';
  bp.textContent = v ? '▶' : '▲'; bp.title = v ? 'Al eje de columnas siguiente' : 'Subir al nivel de arriba';
  const [lm, lp] = barraCorte.querySelectorAll('[data-lado]');
  lm.textContent = v ? 'Ver un lado' : 'Ver abajo'; lp.textContent = v ? 'Ver el otro' : 'Ver arriba';
  lm.setAttribute('aria-pressed', String(!corte.mas)); lp.setAttribute('aria-pressed', String(corte.mas));
  Object.assign(rango, { min: lo, max: hi, step: 0.01 }); rango.value = corte.c;
  Object.assign(num, { min: (lo - o).toFixed(2), max: (hi - o).toFixed(2) });
  num.setAttribute('aria-label', v ? 'Distancia al borde del edificio en metros' : 'Altura en metros');
  num.title = v ? 'Distancia al borde del edificio' : 'Altura';
  if (document.activeElement !== num) num.value = (corte.c - o).toFixed(2);
}
function ponerCorte(c, guardarlo = true, mas = corte ? corte.mas : false, eje = corte ? corte.eje : 'y') {
  if (c == null) { corte = null; grupoCorte.visible = false; barraCorte.hidden = true; }
  else {
    const [lo, hi] = limites(eje); c = Math.min(hi, Math.max(lo, c)); corte = { eje, c, mas: !!mas };
    // El plano deja del lado de su normal lo que se dibuja: coordenadas mayores (mas) o menores que c.
    planoCorte.normal.set(0, 0, 0); planoCorte.normal[eje] = mas ? 1 : -1; planoCorte.constant = mas ? -c : c;
    armarAyudas(eje); lamina.position[eje] = borde.position[eje] = manija.position[eje] = c; grupoCorte.visible = true;
    actualizarBarra(); barraCorte.hidden = false;
  }
  const bs = document.querySelector('#botonSeccion'); if (bs) bs.setAttribute('aria-pressed', String(!!corte));
  if (guardarlo) guardar('corte', corte);
  if (seleccion && factorId(seleccion) === 0) { seleccion = null; marcarFilaSel(); }
  pintar();
}
// Plano vertical: de frente a la cámara (su normal es el eje horizontal hacia donde más mira la cámara), y se ve
// el lado de atrás, así lo cortado queda a la vista.
function ejeVertical() { const d = camara.getWorldDirection(new THREE.Vector3()); return Math.abs(d.x) >= Math.abs(d.z) ? 'x' : 'z'; }
function crearCorte(eje, punto) {
  let c, mas = false;
  if (eje === 'y') {
    c = punto ? punto.y : nivelSel ? NIV[nivIdx[nivelSel]].z + 1.2 : (CAJA.min.y + CAJA.max.y) / 2;
  } else {
    c = punto ? punto[eje] : cenCorte[eje];
    mas = camara.position[eje] < c;
  }
  const sn = engancheCorte(c, eje === 'y' ? 0.25 : 0.15, eje); if (sn) c = sn.c;
  ponerCorte(c, true, mas, eje);
  avisoBreve(eje === 'y' ? 'Plano de sección horizontal · arrastrá la flecha para subirlo o bajarlo' : 'Plano de sección vertical · arrastrá la flecha para moverlo');
}
// Posiciones con nombre. Horizontal: nivel de losa o corte de planta (1,20 m sobre la losa). Vertical: caras y ejes de
// columnas y tabiques.
const ENGANCHES_V = {};
function enganchesVerticales(eje) {
  if (ENGANCHES_V[eje]) return ENGANCHES_V[eje];
  const l = [];
  for (const e of EL) if (e.t === 'columna' || e.t === 'tabique') { const w = vertsEje(e, eje); l.push([w.lo, 'cara de ' + e.n], [w.hi, 'cara de ' + e.n], [(w.lo + w.hi) / 2, 'eje de ' + e.n]); }
  return ENGANCHES_V[eje] = l;
}
function engancheCorte(c, tol, eje = corte ? corte.eje : 'y') {
  const lista = eje === 'y' ? NIV.flatMap(n => [[n.z, `nivel de losa ${n.losa}`], [n.z + 1.2, `corte de planta ${n.corto} (+1,20)`]]) : enganchesVerticales(eje);
  let mejor = null;
  for (const [p, t] of lista) { const d = Math.abs(p - c); if (d <= tol && (!mejor || d < mejor.d)) mejor = { d, c: p, t }; }
  return mejor;
}
rango.oninput = () => ponerCorte(+rango.value);
num.onchange = () => { const v = parseFloat(String(num.value).replace(',', '.')); if (Number.isFinite(v)) ponerCorte(v + origenNum(corte.eje)); };
barraCorte.querySelectorAll('[data-paso]').forEach(b => b.onclick = () => {
  // Paso entre posiciones útiles: cada losa y su corte de planta; en vertical, cada eje de columna (los muy juntos, uno solo)
  const s = +b.dataset.paso, c = corte.c;
  const alt = (esVertical() ? enganchesVerticales(corte.eje).filter(x => x[1].startsWith('eje')).map(x => x[0]) : NIV.flatMap(n => [n.z, n.z + 1.2])).sort((a, q) => a - q);
  const sig = s > 0 ? alt.find(a => a > c + 0.05) : alt.slice().reverse().find(a => a < c - 0.05);
  if (sig != null) ponerCorte(sig);
});
barraCorte.querySelectorAll('[data-lado]').forEach(b => b.onclick = () => ponerCorte(corte.c, true, b.dataset.lado === 'mas'));
barraCorte.querySelectorAll('[data-orient]').forEach(b => b.onclick = () => {
  const quiere = b.dataset.orient === 'y' ? 'y' : 'v';
  if ((quiere === 'y') === !esVertical()) return;
  crearCorte(quiere === 'y' ? 'y' : ejeVertical(), null);
});
barraCorte.querySelector('#corteGirar').onclick = () => crearCorte(corte.eje === 'x' ? 'z' : 'x', null);
barraCorte.querySelector('#corteBorrar').onclick = () => { ponerCorte(null); avisoBreve('Plano de sección borrado'); };

// Arrastrar la manija (sobre la recta que pasa por ella en la dirección del eje del corte)
const rayC = new THREE.Raycaster(), ptrC = new THREE.Vector2();
function rayoCorte(ev) { const r = lienzo.getBoundingClientRect(); ptrC.set((ev.clientX - r.left) / r.width * 2 - 1, -(ev.clientY - r.top) / r.height * 2 + 1); rayC.setFromCamera(ptrC, camara); }
function posEnEje(ev) {
  rayoCorte(ev);
  const o = manija.position.clone(), d = new THREE.Vector3(); d[corte.eje] = 1;
  const w = o.clone().sub(rayC.ray.origin), rd = rayC.ray.direction;
  const b = d.dot(rd), c = rd.dot(rd), dd = d.dot(w), e = rd.dot(w), den = c - b * b;
  return o[corte.eje] + (Math.abs(den) < 1e-6 ? 0 : (b * e - c * dd) / den);
}
let arrCorte = null;
lienzo.addEventListener('pointerdown', ev => {
  if (!corte || ev.button !== 0) return;
  rayoCorte(ev); manija.updateMatrixWorld(); if (!rayC.intersectObject(manija, false).length) return;
  ev.stopImmediatePropagation(); ev.preventDefault();
  arrCorte = { desfase: corte.c - posEnEje(ev) }; ctrl.enabled = false; abajo = null; try { lienzo.setPointerCapture(ev.pointerId); } catch (e) {}
}, { capture: true });
lienzo.addEventListener('pointermove', ev => {
  if (!corte) return;
  if (!arrCorte) {
    if (ev.buttons) return;
    rayoCorte(ev); manija.updateMatrixWorld();
    const sobre = rayC.intersectObject(manija, false).length > 0;
    manija.material.color.set(sobre ? '#e8a33c' : css('--accent'));
    if (sobre) { lienzo.style.cursor = esVertical() ? 'ew-resize' : 'ns-resize'; tip.hidden = true; ev.stopImmediatePropagation(); }
    return;
  }
  ev.stopImmediatePropagation();
  let c = posEnEje(ev) + arrCorte.desfase, sn = ev.altKey ? null : engancheCorte(c, Math.max(0.06, camara.position.distanceTo(manija.position) * 0.006));
  if (sn) c = sn.c;
  ponerCorte(c, false);
  etqEdicion.innerHTML = (esVertical() ? `A <b class="num">${fmt(corte.c - origenNum(corte.eje), 2)} m</b> del borde` : `Corte a <b class="num">${fmt(corte.c, 2)} m</b>`) + (sn ? ' · ' + esc(sn.t) : ' <span style="color:var(--muted)">· Alt: sin enganche</span>');
  const rc = lienzo.getBoundingClientRect(); etqEdicion.hidden = false;
  etqEdicion.style.left = Math.min(ev.clientX - rc.left + 16, rc.width - etqEdicion.offsetWidth - 8) + 'px'; etqEdicion.style.top = Math.max(8, ev.clientY - rc.top - 34) + 'px';
}, { capture: true });
const soltarCorte = ev => { if (!arrCorte) return; arrCorte = null; ev.stopImmediatePropagation(); ctrl.enabled = true; etqEdicion.hidden = true; lienzo.style.cursor = ''; guardar('corte', corte); };
lienzo.addEventListener('pointerup', soltarCorte, { capture: true });
lienzo.addEventListener('pointercancel', soltarCorte, { capture: true });

// Menú del plano: el mismo para el clic derecho y para el botón de abajo
// (si el botón derecho se arrastró, fue para desplazar la vista: no hay menú)
const menuCtx = document.createElement('div'); menuCtx.className = 'flota menu-ctx'; menuCtx.hidden = true; menuCtx.setAttribute('role', 'menu');
lienzo.parentElement.append(menuCtx);
let puntoMenu = null;
function opcionesCorte(punto) {
  if (!corte) return [['crear-y', 'Crear plano de sección horizontal'], ['crear-v', 'Crear plano de sección vertical']];
  const v = esVertical();
  return [
    punto && ['llevar', v ? 'Llevar el plano a este punto' : 'Llevar el plano a esta altura'],
    ['sentido', v ? 'Ver el otro lado' : corte.mas ? 'Ver hacia abajo' : 'Ver hacia arriba'],
    v && ['girar', 'Girar 90°'],
    ['orient', v ? 'Pasar a horizontal' : 'Pasar a vertical'],
    ['borrar', 'Borrar plano de sección'],
  ].filter(Boolean);
}
function abrirMenuCorte(punto, x, y, arriba = false) {
  puntoMenu = punto;
  menuCtx.innerHTML = opcionesCorte(punto).map(([k, t]) => `<button type="button" role="menuitem" data-op="${k}">${t}</button>`).join('');
  menuCtx.hidden = false;
  const rc = lienzo.getBoundingClientRect();
  menuCtx.style.left = Math.max(6, Math.min(x, rc.width - menuCtx.offsetWidth - 6)) + 'px';
  menuCtx.style.top = Math.max(6, Math.min(arriba ? y - menuCtx.offsetHeight - 6 : y, rc.height - menuCtx.offsetHeight - 6)) + 'px';
  menuCtx.querySelector('button')?.focus();
}
let derAbajo = null;
lienzo.addEventListener('pointerdown', ev => { if (ev.button === 2) derAbajo = [ev.clientX, ev.clientY]; menuCtx.hidden = true; }, { capture: true });
lienzo.addEventListener('contextmenu', ev => {
  ev.preventDefault();
  if (derAbajo && Math.hypot(ev.clientX - derAbajo[0], ev.clientY - derAbajo[1]) > 5) return;
  const rc = lienzo.getBoundingClientRect(), p = puntoBajoCursor(ev);
  abrirMenuCorte(p && Number.isFinite(p.y) ? p.clone() : null, ev.clientX - rc.left, ev.clientY - rc.top);
});
menuCtx.addEventListener('click', ev => {
  const b = ev.target.closest('[data-op]'); if (!b) return;
  menuCtx.hidden = true;
  const op = b.dataset.op;
  if (op === 'borrar') { ponerCorte(null); avisoBreve('Plano de sección borrado'); return; }
  if (op === 'sentido') { ponerCorte(corte.c, true, !corte.mas); avisoBreve(esVertical() ? 'Se ve el otro lado del plano' : corte.mas ? 'Se ve lo de arriba del plano' : 'Se ve lo de abajo del plano'); return; }
  if (op === 'girar') { crearCorte(corte.eje === 'x' ? 'z' : 'x', puntoMenu); return; }
  if (op === 'orient') { crearCorte(esVertical() ? 'y' : ejeVertical(), puntoMenu); return; }
  if (op === 'llevar') { let c = puntoMenu[corte.eje]; const sn = engancheCorte(c, 0.15); if (sn) c = sn.c; ponerCorte(c); avisoBreve('Plano movido'); return; }
  crearCorte(op === 'crear-y' ? 'y' : ejeVertical(), puntoMenu);
});
addEventListener('pointerdown', ev => { if (!menuCtx.hidden && !menuCtx.contains(ev.target) && ev.target.id !== 'botonSeccion') menuCtx.hidden = true; }, true);
addEventListener('keydown', ev => { if (ev.key === 'Escape' && !menuCtx.hidden) { menuCtx.hidden = true; ev.stopImmediatePropagation(); } }, true);
// Botón de abajo, junto a Encuadrar: abre el mismo menú hacia arriba
{ const b = document.createElement('button'); b.type = 'button'; b.id = 'botonSeccion'; b.textContent = 'Plano de sección'; b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-haspopup', 'menu');
  $('#encuadrar').before(b);
  b.onclick = () => {
    if (!menuCtx.hidden) { menuCtx.hidden = true; return; }
    const rc = lienzo.getBoundingClientRect(), rb = b.getBoundingClientRect();
    abrirMenuCorte(null, rb.left - rc.left, rb.top - rc.top, true);
  }; }

// Dibujo: el modelo con el corte y después las ayudas del plano sin recortar
window.__dibujar = () => {
  renderer.clippingPlanes = corte ? [planoCorte] : [];
  renderer.render(escena, camara);
  if (corte) { renderer.clippingPlanes = []; renderer.autoClear = false; renderer.render(escenaCorte, camara); renderer.autoClear = true; }
};
// Plano guardado (los guardados antes de los cortes verticales traen { z, arriba })
{ const g = leer('corte', null);
  if (g && Number.isFinite(g.c) && ['x', 'y', 'z'].includes(g.eje)) ponerCorte(g.c, false, !!g.mas, g.eje);
  else if (g && Number.isFinite(g.z)) ponerCorte(g.z, false, !!g.arriba, 'y'); }

