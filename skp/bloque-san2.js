// ---------- Instalación sanitaria (cloacal y pluvial) ----------
// Cada tramo trae sus puntos en cm, en el mismo sistema que la estructura. Las cañerías de un piso
// van por el cielorraso del piso de abajo, salvo las aclaraciones del plano (contrapiso, pared, desvíos).
// Las piezas (codos, ramales, cuplas, PPA, embudos, bocas de acceso y cámara) se dibujan con su forma real
// aproximada, más gruesas que el caño, con su campana (enchufe) en cada boca.
const SIS_ORDEN = ['primaria', 'secundaria', 'pluvial', 'ventilacion', 'extraccion', 'aire'];
const PISO_NIVEL = { PB: 'base', P1: 'sPB', P2: 's1', P3: 's2', P4: 's3', P5: 's4' };
const NOM_PISO = Object.fromEntries(SAN.pisos.map(p => [p.id, p.nombre]));
const NOM_MODO = {
  cielorraso: 'colgado bajo losa', bajo_viga: 'por debajo de la viga', contrapiso: 'por contrapiso', pared: 'por pared',
  muro: 'embutido en muro', mesada: 'bajo mesada, baja en la pared', enterrado: 'enterrado', montante: 'montante', caida: 'caída de artefacto',
};
const NOM_ORIGEN = { montante: 'montante', artefacto: 'caída de artefacto', inodoro: 'inodoro', PPA: 'pileta de patio', embudo: 'embudo pluvial', pared: 'baja en pase (por pared)', contrapiso: 'baja en pase (por contrapiso)', mesada: 'bajada de cocina' };
const NOM_PIEZA = { ppa: 'Pileta de patio abierta (PPA)', embudo: 'Embudo pluvial con rejilla', ba: 'Boca de acceso', camara: 'Cámara de inspección 60x60', codo: 'Codo', ramal: 'Ramal', cupla: 'Cupla' };
const PREF_BAJADA = { primaria: 'CDV', ventilacion: 'CV', pluvial: 'Pluvial', secundaria: 'B' };
const VIGAS_CRUZADAS = new Set(SAN.cruces.map(k => k.vigaId));
const sanOn = Object.fromEntries(SIS_ORDEN.map(s => [s, true])); sanOn.pases = true; sanOn.cruces = true; sanOn.numeros = true;
const SANP = {}; const sanMallas = [];
const v3 = (x, y, z) => new THREE.Vector3(x - OX, z, -(y - OY));
const d3 = d => new THREE.Vector3(d[0], d[2], -d[1]);            // dirección del plano -> three
const colorOsc = (c, k) => new THREE.Color(c).multiplyScalar(k);
const matSis = {}, matPza = {};
const mS = s => matSis[s] ||= new THREE.MeshLambertMaterial({ color: css('--i-' + s) });
const mP = s => matPza[s] ||= new THREE.MeshLambertMaterial({ color: colorOsc(css('--i-' + s), 0.72) });
const matMetal = new THREE.MeshLambertMaterial({ color: 0xb9c0c7 }), matRanura = new THREE.MeshLambertMaterial({ color: 0x3c434a });
const matHormigon = new THREE.MeshLambertMaterial({ color: 0x9a9fa5 });
const matSelSan = new THREE.MeshLambertMaterial({ color: css('--accent'), emissive: 0x222222 });
const merge = gs => THREE.BufferGeometryUtils.mergeBufferGeometries(gs.map(g => g.index ? g.toNonIndexed() : g));
const UP = new THREE.Vector3(0, 1, 0);
// Cilindro entre dos puntos (three)
function cil(a, b, r, seg = 12) {
  const L = a.distanceTo(b); if (L < 1e-4) return null;
  const g = new THREE.CylinderGeometry(r, r, L, seg, 1, false);
  g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, b.clone().sub(a).normalize())));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); return g;
}
// Campana de enchufe: anillo más grueso al borde de una pieza, hacia adentro de la pieza
const campana = (p, dir, d) => cil(p.clone().addScaledVector(dir, -Math.max(0.6 * d, 0.03)), p, d / 2 * 1.26 + 0.004, 14);
// Curva (codo) entre dos puntos pasando cerca de la esquina
function curva(A, P, B, r) { const g = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(A, P, B), 10, r, 12, false); return g; }
const radioVis = d => Math.max(d / 2, 0.022);
const kCodo = d => 1.1 * d + 0.03;

// Puntos con codo/ramal/cupla: el caño se recorta ahí para que la pieza cierre
const clave = p => p.map(v => Math.round(v * 100)).join(',');
const enUnion = {}; SAN.uniones.forEach(u => { enUnion[clave(u.p)] = u; });

// --- Caños ---
for (const tr of SAN.tramos) {
  const P = []; for (let i = 0; i < tr.p.length; i += 3) P.push([tr.p[i] / 100, tr.p[i + 1] / 100, tr.p[i + 2] / 100]);
  const pts = P.map(p => v3(...p)), r = radioVis(tr.d), k = kCodo(tr.d), partes = [], piezas = [];
  // recorte en extremos que llegan a un codo o cupla
  const recortar = (i, hacia) => { const u = enUnion[clave(P[i])]; if (!u || u.tipo === 'ramal') return pts[i]; return pts[i].clone().lerp(pts[hacia], Math.min(0.45, kCodo(u.d) / pts[i].distanceTo(pts[hacia]))); };
  const ini = [recortar(0, 1)], fin = recortar(pts.length - 1, pts.length - 2);
  // esquinas internas: codo con curva y campanas
  const tramosRectos = []; let desde = ini[0];
  for (let i = 1; i < pts.length - 1; i++) {
    const d1 = pts[i].clone().sub(pts[i - 1]).normalize(), d2 = pts[i + 1].clone().sub(pts[i]).normalize();
    if (d1.dot(d2) > 0.995) continue;
    const kk = Math.min(k, 0.45 * pts[i].distanceTo(pts[i - 1]), 0.45 * pts[i].distanceTo(pts[i + 1]));
    const A = pts[i].clone().addScaledVector(d1, -kk), B = pts[i].clone().addScaledVector(d2, kk);
    tramosRectos.push([desde, A]); desde = B;
    piezas.push(curva(A, pts[i], B, r * 1.13), campana(A, d1.clone().negate(), tr.d), campana(B, d2, tr.d));
  }
  tramosRectos.push([desde, fin]);
  for (const [a, b] of tramosRectos) { const g = cil(a, b, r); if (g) partes.push(g); }
  // montantes: un enchufe en cada cruce de losa
  if (tr.modo === 'montante') for (const n of NIV) { const z = n.z; if (z > P[0][2] + 0.3 && z < P[P.length - 1][2] - 0.3) { const c = v3(P[0][0], P[0][1], z + 0.25); partes.push(cil(c.clone().setY(c.y - 0.04), c.clone().setY(c.y + 0.04), r * 1.26)); } }
  if (!partes.length) continue;
  const g = new THREE.Group(); g.userData.id = 'san:' + tr.id;
  const caño = new THREE.Mesh(merge(partes), mS(tr.sis)); caño.userData.id = g.userData.id; g.add(caño);
  if (piezas.filter(Boolean).length) { const m = new THREE.Mesh(merge(piezas.filter(Boolean)), mP(tr.sis)); m.userData.id = g.userData.id; g.add(m); }
  escena.add(g); sanMallas.push(caño, ...g.children.slice(1));
  const mid = pts[Math.floor((pts.length - 1) / 2)].clone().lerp(pts[Math.ceil((pts.length - 1) / 2)], 0.5);
  SANP[g.userData.id] = { k: 'tramo', o: tr, m: g, ppal: caño, nivel: PISO_NIVEL[tr.piso], centro: mid };
}

// --- Uniones: codos, ramales y cuplas ---
SAN.uniones.forEach((u, i) => {
  const p = v3(...u.p), a = d3(u.a).normalize(), b = d3(u.b).normalize(), gs = [];
  if (u.tipo === 'codo') {
    const k = kCodo(u.d), A = p.clone().addScaledVector(a, k), B = p.clone().addScaledVector(b, k);
    gs.push(curva(A, p, B, radioVis(u.d) * 1.13), campana(A, a, u.d), campana(B, b, u.d));
  } else if (u.tipo === 'ramal') {
    const L = 1.3 * u.d + 0.04, A = p.clone().addScaledVector(a, -L), B = p.clone().addScaledVector(a, L);
    gs.push(cil(A, B, radioVis(u.d) * 1.13), campana(A, a.clone().negate(), u.d), campana(B, a, u.d));
    const C = p.clone().addScaledVector(b, u.d / 2 + 0.6 * u.dr + 0.04);
    gs.push(cil(p, C, radioVis(u.dr) * 1.13), campana(C, b, u.dr));
  } else {
    const L = 0.6 * u.d + 0.03; gs.push(cil(p.clone().addScaledVector(a, -L), p.clone().addScaledVector(a, L), radioVis(u.d) * 1.26));
  }
  const m = new THREE.Mesh(merge(gs.filter(Boolean)), mP(u.sis)); m.userData.id = 'uni:' + i; escena.add(m); sanMallas.push(m);
  SANP[m.userData.id] = { k: 'union', o: u, m, ppal: m, nivel: null, centro: p };
});

// --- Piezas especiales ---
function rejilla(c, lado, alto) { // marco + rejilla con ranuras, apoyada en el piso terminado
  const gs = [new THREE.BoxGeometry(lado, 0.012, lado).translate(c.x, c.y + 0.006, c.z)];
  const ran = []; const n = 5, paso = lado * 0.8 / n;
  for (let i = 0; i < n; i++) ran.push(new THREE.BoxGeometry(lado * 0.7, 0.004, paso * 0.35).translate(c.x, c.y + 0.0135, c.z - lado * 0.4 + paso * (i + 0.5)));
  return [merge(gs), merge(ran)];
}
SAN.piezas.forEach((pz, i) => {
  const id = 'pz:' + i, g = new THREE.Group(); g.userData.id = id;
  const top = v3(pz.x, pz.y, pz.z);
  const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.userData.id = id; g.add(m); sanMallas.push(m); };
  if (pz.tipo === 'ppa') {
    const fondo = pz.zFondo ?? pz.z - 0.3;
    add(cil(v3(pz.x, pz.y, fondo), v3(pz.x, pz.y, pz.z - 0.01), 0.085, 20), mP('secundaria'));
    add(cil(v3(pz.x, pz.y, fondo - 0.08), v3(pz.x, pz.y, fondo + 0.01), 0.06, 16), mP('secundaria'));   // salida
    for (const e of pz.entradas || []) { const dir = d3([e[0], e[1], 0]).normalize(); const c = v3(pz.x, pz.y, fondo + 0.05).addScaledVector(dir, 0.085); add(cil(c, c.clone().addScaledVector(dir, 0.06), 0.032, 12), mP('secundaria')); }
    const [marco, ranuras] = rejilla(top, 0.2); add(marco, matMetal); add(ranuras, matRanura);
  } else if (pz.tipo === 'embudo') {
    const cono = new THREE.CylinderGeometry(0.11, 0.06, 0.14, 20, 1, true).translate(top.x, top.y - 0.07, top.z);
    add(cono, mP('pluvial'));
    const [marco, ranuras] = rejilla(top, 0.2); add(marco, matMetal); add(ranuras, matRanura);
  } else if (pz.tipo === 'ba') {
    add(new THREE.BoxGeometry(0.22, 0.2, 0.22).translate(top.x, top.y - 0.1, top.z), mP('primaria'));
    add(new THREE.BoxGeometry(0.24, 0.012, 0.24).translate(top.x, top.y + 0.006, top.z), matMetal);
  } else if (pz.tipo === 'camara') {
    const c = v3(pz.x, pz.y, -0.33);
    const caja = new THREE.BoxGeometry(0.7, 0.66, 0.7).translate(c.x, c.y, c.z); add(caja, matHormigon);
    add(new THREE.BoxGeometry(0.6, 0.02, 0.6).translate(c.x, 0.01, c.z), matMetal);
  }
  if (!g.children.length) return;
  escena.add(g);
  SANP[id] = { k: 'pieza', o: pz, m: g, ppal: g.children[0], nivel: PISO_NIVEL[pz.piso], centro: top };
});

// --- Pases: agujeros reales en la losa con la medida de la lámina del ingeniero ---
// Se rehace la losa: contorno de su cara superior + agujeros, y se extruye con su espesor.
function contornos(v) {
  let zmax = -1e9; for (let i = 2; i < v.length; i += 3) zmax = Math.max(zmax, v[i]);
  let zmin = 1e9; for (let i = 2; i < v.length; i += 3) zmin = Math.min(zmin, v[i]);
  const cuenta = new Map(), arista = (a, b) => a < b ? a + '|' + b : b + '|' + a;
  let areaTop = 0;
  for (let i = 0; i < v.length; i += 9) {
    if (Math.abs(v[i + 2] - zmax) > 1 || Math.abs(v[i + 5] - zmax) > 1 || Math.abs(v[i + 8] - zmax) > 1) continue;
    const k = [0, 3, 6].map(o => v[i + o] + ',' + v[i + o + 1]);
    areaTop += Math.abs((v[i + 3] - v[i]) * (v[i + 7] - v[i + 1]) - (v[i + 6] - v[i]) * (v[i + 4] - v[i + 1])) / 2;
    for (const [a, b] of [[k[0], k[1]], [k[1], k[2]], [k[2], k[0]]]) { const kk = arista(a, b); cuenta.set(kk, (cuenta.get(kk) || 0) + 1); }
  }
  const vec = new Map();
  for (const [kk, n] of cuenta) if (n === 1) { const [a, b] = kk.split('|'); (vec.get(a) || vec.set(a, []).get(a)).push(b); (vec.get(b) || vec.set(b, []).get(b)).push(a); }
  const lazos = [], visto = new Set();
  for (const ini of vec.keys()) {
    if (visto.has(ini)) continue;
    const lazo = [ini]; visto.add(ini); let prev = null, cur = ini;
    for (let guard = 0; guard < 5000; guard++) {
      const sig = (vec.get(cur) || []).find(n => n !== prev && (!visto.has(n) || (n === ini && lazo.length > 2)));
      if (!sig || sig === ini) break;
      lazo.push(sig); visto.add(sig); prev = cur; cur = sig;
    }
    if (lazo.length >= 3) lazos.push(lazo.map(s => s.split(',').map(Number).map(c => c / 100)));
  }
  return { lazos, zmax: zmax / 100, zmin: zmin / 100, areaTop: areaTop / 1e4 };
}
const areaPol = l => l.reduce((a, p, i) => { const q = l[(i + 1) % l.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
const dentroPol = (x, y, l) => { let c = false; for (let i = 0, j = l.length - 1; i < l.length; j = i++) { const [xi, yi] = l[i], [xj, yj] = l[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const pasesPorLosa = {}; SAN.pasesIng.forEach(p => (pasesPorLosa[p.losa] ||= []).push(p));
let agujeros = 0;
for (const e of EL.filter(e => e.t === 'losa' && pasesPorLosa[e.l])) {
  const c = contornos(e.v); if (!c.lazos.length) continue;
  const lazos = c.lazos.sort((a, b) => Math.abs(areaPol(b)) - Math.abs(areaPol(a)));
  const ext = lazos[0], internos = lazos.slice(1);
  const rects = [];
  for (const p of pasesPorLosa[e.l]) {
    const esq = [[p.x0, p.y0], [p.x1, p.y0], [p.x1, p.y1], [p.x0, p.y1]];
    if (!esq.every(([x, y]) => dentroPol(x, y, ext)) || internos.some(l => esq.some(([x, y]) => dentroPol(x, y, l)))) continue;
    if (rects.some(q => p.x0 < q.x1 && p.x1 > q.x0 && p.y0 < q.y1 && p.y1 > q.y0)) continue;
    rects.push(p);
  }
  if (!rects.length) continue;
  const aV = ([x, y]) => new THREE.Vector2(x - OX, y - OY);
  const forma = new THREE.Shape((areaPol(ext) < 0 ? ext.slice().reverse() : ext).map(aV));
  for (const l of internos) forma.holes.push(new THREE.Path((areaPol(l) > 0 ? l.slice().reverse() : l).map(aV)));
  for (const p of rects) forma.holes.push(new THREE.Path([[p.x0, p.y0], [p.x0, p.y1], [p.x1, p.y1], [p.x1, p.y0]].map(aV)));
  const geo = new THREE.ExtrudeGeometry(forma, { depth: c.zmax - c.zmin, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2); geo.translate(0, c.zmin, 0);
  // Control: el área nueva tiene que dar la original menos los agujeros; si no, se deja la losa como estaba.
  const areaHuecos = rects.reduce((a, p) => a + (p.x1 - p.x0) * (p.y1 - p.y0), 0);
  if (Math.abs(Math.abs(areaPol(ext)) - internos.reduce((a, l) => a + Math.abs(areaPol(l)), 0) - c.areaTop) > 0.05 * c.areaTop) continue;
  e.malla.geometry.dispose(); e.malla.geometry = geo;
  e.malla.children[0].geometry = new THREE.EdgesGeometry(geo, 25);
  e.agujeros = rects.length; e.areaHuecos = areaHuecos; agujeros += rects.length;
}

// --- Pases faltantes (no están en la lámina): anillo rojo; cruces con vigas: esfera roja ---
const matCrit = new THREE.MeshBasicMaterial({ color: css('--crit') });
for (const q of SAN.pases.filter(q => !q.ok)) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(q.d / 2 + 0.08, 0.03, 8, 28), matCrit);
  m.rotation.x = Math.PI / 2; m.position.copy(v3(q.x, q.y, q.z + 0.03));
  m.userData.id = 'pase:' + q.id; escena.add(m); sanMallas.push(m);
  SANP[m.userData.id] = { k: 'pase', o: q, m, ppal: m, nivel: PISO_NIVEL[q.piso], centro: m.position.clone() };
}
for (const k of SAN.cruces) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), matCrit);
  m.position.copy(v3(k.x, k.y, k.z)); m.userData.id = 'cruce:' + k.id; escena.add(m); sanMallas.push(m);
  SANP[m.userData.id] = { k: 'cruce', o: k, m, ppal: m, nivel: k.nivel, centro: m.position.clone() };
}

// --- Números de bajada flotantes (como los rotula cada planta) ---
const capaEtq = document.createElement('div'); capaEtq.className = 'etiquetas'; lienzo.parentElement.append(capaEtq);
const ETQ = SAN.tramos.filter(t => t.num && t.modo === 'montante').map(t => {
  const el = document.createElement('div'); el.className = 'etq-bajada';
  el.style.setProperty('--c', `var(--i-${t.sis})`);
  el.textContent = `${PREF_BAJADA[t.sis] || ''} ${t.num}`;
  el.title = `${SAN.sistemas[t.sis]} Ø${Math.round(t.d * 1000)} · ${NOM_PISO[t.piso]} (numeración del plano de ese piso)`;
  capaEtq.append(el);
  return { el, t, pos: v3(t.p[0] / 100, t.p[1] / 100, (t.p[2] + t.p[5]) / 200) };
});
const _v = new THREE.Vector3();
window.__etq = () => {
  const w = lienzo.clientWidth, h = lienzo.clientHeight;
  for (const e of ETQ) {
    const s = SANP['san:' + e.t.id];
    const ver = sanOn.numeros && s && s.m.visible;
    if (!ver) { e.el.hidden = true; continue; }
    _v.copy(e.pos).project(camara);
    if (_v.z > 1 || Math.abs(_v.x) > 1.05 || Math.abs(_v.y) > 1.05) { e.el.hidden = true; continue; }
    e.el.hidden = false;
    e.el.style.transform = `translate(${((_v.x + 1) / 2 * w).toFixed(1)}px, ${((1 - _v.y) / 2 * h).toFixed(1)}px) translate(-50%, -50%)`;
  }
};

function visibleNivel(n) { if (n == null || nivelSel == null) return true; return hastaAca ? nivIdx[n] <= nivIdx[nivelSel] : n === nivelSel; }
function pintarSan() {
  for (const [id, s] of Object.entries(SANP)) {
    let on;
    if (s.k === 'tramo') on = sanOn[s.o.sis];
    else if (s.k === 'union') on = sanOn[s.o.sis];
    else if (s.k === 'pieza') on = true;
    else on = s.k === 'cruce' ? sanOn.cruces : sanOn.pases;
    let nivel = s.nivel;
    if (s.k === 'union') { const pis = SAN.pisos.slice().reverse().find(p => s.o.p[2] >= p.z - 0.6); nivel = pis ? PISO_NIVEL[pis.id] : 'base'; }
    s.m.visible = on && visibleNivel(nivel);
    if (s.k === 'tramo') s.ppal.material = id === seleccion || id === hover ? matSelSan : mS(s.o.sis);
  }
}
const centroSan = id => SANP[id].centro;
function tipSan(id) {
  const s = SANP[id]; if (!s) return '';
  if (s.k === 'tramo') { const t = s.o; return `<b>Ø${Math.round(t.d * 1000)}</b>${esc(SAN.sistemas[t.sis])} · ${esc(NOM_PISO[t.piso])} · ${esc(NOM_MODO[t.modo])}${t.num ? ' · ' + PREF_BAJADA[t.sis] + ' ' + t.num : ''} · <span class="num">${fmt(t.largo, 2)} m</span>`; }
  if (s.k === 'union') { const u = s.o; return `<b>${NOM_PIEZA[u.tipo]} Ø${Math.round(u.d * 1000)}${u.tipo === 'ramal' ? ' × Ø' + Math.round(u.dr * 1000) : ''}</b>${esc(SAN.sistemas[u.sis])}`; }
  if (s.k === 'pieza') return `<b>${NOM_PIEZA[s.o.tipo]}</b>${esc(NOM_PISO[s.o.piso])}`;
  if (s.k === 'pase') { const q = s.o; return `<b>Falta pase Ø${Math.round(q.d * 1000)}</b>no está en la lámina del ingeniero · ${esc(NOM_ORIGEN[q.origen] || q.origen)}`; }
  const k = s.o; return `<b>Cruce con ${esc(k.viga)}</b>${esc(SAN.sistemas[k.sis])} Ø${Math.round(k.d * 1000)} · viga de ${fmt(k.alto * 100, 0)} cm de alto`;
}
function fichaSan(id) {
  const s = SANP[id]; if (!s) return '';
  let titulo, sub, med = [], extra = '', color = 'var(--crit)';
  if (s.k === 'tramo') {
    const t = s.o, z = []; for (let i = 2; i < t.p.length; i += 3) z.push(t.p[i] / 100);
    titulo = `Ø${Math.round(t.d * 1000)}`; sub = `${SAN.sistemas[t.sis]} · ${NOM_PISO[t.piso]}${t.num ? ' · ' + PREF_BAJADA[t.sis] + ' ' + t.num : ''}`; color = `var(--i-${t.sis})`;
    med = [['Recorrido', NOM_MODO[t.modo]], ['Largo', fmt(t.largo) + ' m'], ['Cota inicio', fmt(z[0]) + ' m'], ['Cota fin', fmt(z[z.length - 1]) + ' m']];
    if (t.modo !== 'montante' && t.modo !== 'caida' && t.largo > 0.2) med.push(['Pendiente', fmt(Math.abs(z[0] - z[z.length - 1]) / t.largo * 100, 1) + ' %']);
    if (t.nota) extra = `<div class="comparar"><span>Aclaración del plano: <b>“${esc(t.nota)}”</b></span></div>`;
  } else if (s.k === 'union') {
    const u = s.o; titulo = `${NOM_PIEZA[u.tipo]} Ø${Math.round(u.d * 1000)}`; sub = SAN.sistemas[u.sis]; color = `var(--i-${u.sis})`;
    med = [['Pieza', NOM_PIEZA[u.tipo]], ['Diámetro', 'Ø' + Math.round(u.d * 1000) + (u.tipo === 'ramal' ? ' × Ø' + Math.round(u.dr * 1000) : '')], ['Cota', fmt(u.p[2]) + ' m']];
  } else if (s.k === 'pieza') {
    titulo = NOM_PIEZA[s.o.tipo]; sub = NOM_PISO[s.o.piso]; color = 'var(--fg2)'; med = [['Nivel de piso', fmt(s.o.z) + ' m']];
    if (s.o.tipo === 'ppa') med.push(['Bocas', String((s.o.entradas || []).length + 1)]);
  } else if (s.k === 'pase') {
    const q = s.o; titulo = `Pase Ø${Math.round(q.d * 1000)}`; sub = `Losa ${NIV[nivIdx[q.losa]].corto} · ${NOM_PISO[q.piso]}`;
    med = [['Para', NOM_ORIGEN[q.origen] || q.origen], ['Sistema', SAN.sistemas[q.sis]], ['Estado', 'Falta en el plano']];
    extra = `<div class="comparar"><span class="dif">No hay un pase del ingeniero a menos de ${['pared', 'contrapiso', 'mesada'].includes(q.origen) ? 50 : 10} cm de este punto.</span><span>Revisar si hay que agregarlo en la lámina de pases o si el caño se corre.</span></div>`;
  } else {
    const k = s.o; titulo = `Cruce con ${k.viga}`; sub = `Bajo losa ${NIV[nivIdx[k.nivel]].corto} · ${k.piso}`;
    med = [['Caño', `${SAN.sistemas[k.sis]} Ø${Math.round(k.d * 1000)}`], ['Alto de viga', fmt(k.alto * 100, 0) + ' cm'], ['Cota del caño', fmt(k.z) + ' m']];
    extra = `<div class="comparar"><span class="dif">El caño, colgado bajo la losa, atraviesa la viga.</span><span>Opciones: pase en la viga (consultar al ingeniero) o bajar el caño por debajo del fondo de viga.</span></div>`;
  }
  return `<div class="ficha"><div class="ficha-cab"><span class="sw" style="width:14px;height:14px;background:${color}"></span>
    <div><h3>${esc(titulo)}</h3><div class="tipo">${esc(sub)}</div></div><button class="cerrar" type="button" id="cerrarFicha">Cerrar ✕</button></div>
    <div class="medidas">${med.map(([k, v]) => `<div><span>${k}</span><b style="font-family:var(--f-body);font-size:13.5px">${esc(v)}</b></div>`).join('')}</div>${extra}</div>`;
}
// Chips de la instalación en la barra de tipos
{
  const sep = document.createElement('span'); sep.style.cssText = 'width:1px;background:var(--line);margin:2px 4px'; $('#tipos').append(sep);
  for (const [k, n, c] of [['primaria', 'Primaria', '--i-primaria'], ['secundaria', 'Secundaria', '--i-secundaria'], ['pluvial', 'Pluvial', '--i-pluvial'], ['ventilacion', 'Ventilación', '--i-ventilacion'], ['numeros', 'N° de bajada', '--fg2'], ['pases', 'Faltan pases', '--crit'], ['cruces', 'Cruces', '--crit']]) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.setAttribute('aria-pressed', 'true');
    b.innerHTML = `<span class="sw" style="background:var(${c})${['pases', 'cruces', 'numeros'].includes(k) ? ';border-radius:50%' : ''}"></span>${n}`;
    b.onclick = () => { sanOn[k] = !sanOn[k]; if (k === 'ventilacion') sanOn.extraccion = sanOn[k]; if (k === 'secundaria') sanOn.aire = sanOn[k]; b.setAttribute('aria-pressed', sanOn[k]); pintar(); };
    $('#tipos').append(b);
  }
}
// Pestaña Sanitaria
function armarSanitaria() { refrescarSanitaria(); }
function refrescarSanitaria() {
  const P = SAN.pases, faltan = P.filter(q => !q.ok);
  const losas = [...new Set(P.map(q => q.losa))];
  const met = {}; SAN.tramos.forEach(t => { const k = t.sis + '|' + Math.round(t.d * 1000); met[k] = (met[k] || 0) + t.largo; });
  const totM = Object.values(met).reduce((a, b) => a + b, 0);
  let h = `<section><h2>Resumen <small>cloacal y pluvial · RICH_INS_CLO.dxf</small></h2>
    <div class="medidas" style="grid-template-columns:repeat(4,minmax(0,1fr))">
      <div><span>Cañería</span><b>${fmt(totM, 0)} m</b></div>
      <div><span>Pases OK</span><b>${P.length - faltan.length}/${P.length}</b></div>
      <div><span>Faltan pases</span><b style="color:var(--crit)">${faltan.length}</b></div>
      <div><span>Cruces c/ viga</span><b style="color:var(--crit)">${SAN.cruces.length}</b></div></div>
    <p class="nota">Los pases de la lámina del ingeniero se ven como agujeros en la losa, con su medida (${agujeros} agujeros). Los que faltan se marcan con un anillo rojo. Los números flotantes son la numeración de bajadas de cada planta.</p></section>`;
  h += `<section><h2>Pases en losa <small>sanitaria vs. lámina del ingeniero</small></h2><div class="tabla-wrap"><table>
    <thead><tr><th>Losa</th><th>Desagua</th><th class="r">Nec.</th><th class="r">OK</th><th class="r">Faltan</th><th class="r">Sin caño</th></tr></thead><tbody>` +
    losas.map(l => { const q = P.filter(x => x.losa === l), pis = q[0].piso; const sinUso = SAN.pasesIng.filter(p => p.losa === l && !p.usado).length;
      return `<tr class="clic" data-niv="${l}"><td>${esc(NIV[nivIdx[l]].corto)}</td><td>${esc(NOM_PISO[pis])}</td><td class="r num">${q.length}</td><td class="r num">${q.filter(x => x.ok).length}</td><td class="r num"${q.some(x => !x.ok) ? ' style="color:var(--crit);font-weight:600"' : ''}>${q.filter(x => !x.ok).length}</td><td class="r num">${sinUso}</td></tr>`; }).join('') +
    `</tbody></table></div><p class="nota">"Sin caño": agujeros de la lámina del ingeniero por los que no pasa ningún caño sanitario. Pueden ser de otra instalación (aire, gas, electricidad).</p></section>`;
  const fila = (id, a, b, c) => `<tr class="clic${id === seleccion ? ' sel' : ''}" data-san="${id}"><td>${a}</td><td>${b}</td><td class="r">${c}</td></tr>`;
  h += `<section><h2>Pases que faltan <small>${faltan.length}</small></h2><div class="tabla-wrap"><table><thead><tr><th>Dónde</th><th>Para</th><th class="r">Caño</th></tr></thead><tbody>` +
    faltan.map(q => fila('pase:' + q.id, `${esc(NIV[nivIdx[q.losa]].corto)} <span style="color:var(--muted)">(${esc(NOM_PISO[q.piso])})</span>`, esc(NOM_ORIGEN[q.origen] || q.origen), `${esc(SAN.sistemas[q.sis])} Ø${Math.round(q.d * 1000)}`)).join('') + `</tbody></table></div></section>`;
  h += `<section><h2>Caños que cruzan vigas <small>${SAN.cruces.length}</small></h2><div class="tabla-wrap"><table><thead><tr><th>Viga</th><th>Bajo losa</th><th class="r">Caño</th></tr></thead><tbody>` +
    SAN.cruces.map(k => fila('cruce:' + k.id, `<b>${esc(k.viga)}</b> <span style="color:var(--muted)">h ${fmt(k.alto * 100, 0)}</span>`, esc(NIV[nivIdx[k.nivel]].corto), `${esc(SAN.sistemas[k.sis])} Ø${Math.round(k.d * 1000)}`)).join('') + `</tbody></table></div>
    <p class="nota">Se marca cuando el caño, colgado bajo la losa con su pendiente, queda a la altura de la viga. Los tramos con "pasa por abajo de la viga" ya están bajados.</p></section>`;
  // Cómputo de cañería y piezas
  const pz = {}; SAN.uniones.forEach(u => { const k = `${NOM_PIEZA[u.tipo]} Ø${Math.round(u.d * 1000)}${u.tipo === 'ramal' ? '×' + Math.round(u.dr * 1000) : ''}|${u.sis}`; pz[k] = (pz[k] || 0) + 1; });
  SAN.piezas.forEach(p => { const k = NOM_PIEZA[p.tipo] + '|'; pz[k] = (pz[k] || 0) + 1; });
  h += `<section><h2>Metros de cañería</h2><div class="tabla-wrap"><table><thead><tr><th>Sistema</th><th class="r">Ø</th><th class="r">Metros</th></tr></thead><tbody>` +
    Object.entries(met).sort((a, b) => SIS_ORDEN.indexOf(a[0].split('|')[0]) - SIS_ORDEN.indexOf(b[0].split('|')[0]) || b[0].split('|')[1] - a[0].split('|')[1])
      .map(([k, v]) => { const [s, d] = k.split('|'); return `<tr><td><span class="sw" style="display:inline-block;margin-right:6px;background:var(--i-${s})"></span>${esc(SAN.sistemas[s])}</td><td class="r num">${d}</td><td class="r num">${fmt(v, 1)}</td></tr>`; }).join('') +
    `</tbody><tfoot><tr><td>Total</td><td></td><td class="r num">${fmt(totM, 1)}</td></tr></tfoot></table></div></section>`;
  h += `<section><h2>Piezas</h2><div class="tabla-wrap"><table><thead><tr><th>Pieza</th><th>Sistema</th><th class="r">Cant.</th></tr></thead><tbody>` +
    Object.entries(pz).sort((a, b) => b[1] - a[1]).map(([k, n]) => { const [p, s] = k.split('|'); return `<tr><td>${esc(p)}</td><td>${s ? esc(SAN.sistemas[s]) : '—'}</td><td class="r num">${n}</td></tr>`; }).join('') +
    `</tbody></table></div><p class="nota">Codos y ramales salen de los encuentros entre caños del plano; no incluye accesorios que el plano no dibuja (tapas, sombreretes, abrazaderas).</p></section>`;
  h += `<section><h2>Cómo se armó</h2><ul class="revisar">
    <li>Diámetro de cada caño: el espesor de su polilínea en el plano (0,110 → Ø110, 0,063 → Ø63, 0,040 → Ø40).</li>
    <li>Los caños de cada piso van colgados bajo su losa, en el cielorraso del piso de abajo, con pendiente 1:60 (Ø110) o 2 % hacia la bajada. La ventilación de los extractores va por el cielorraso del mismo piso del extractor.</li>
    <li>Aclaraciones del plano que se respetaron: ${SAN.notas.map(n => esc(n)).join(' · ')}.</li>
    <li>"Desvío por cielorraso de N": va bajo la losa de techo del piso N, y la montante del extremo de arriba no sigue bajando.</li>
    <li>Cada caída a artefacto y cada montante que atraviesa una losa necesita un pase; se compara con la lámina "Pases en losa" del ingeniero.</li></ul></section>`;
  if (seleccion && SANP[seleccion]) h = '<section><h2>Elemento</h2>' + fichaSan(seleccion).replace('id="cerrarFicha"', 'data-cerrar') + '</section>' + h;
  const p = $('#p-sanitaria'); p.innerHTML = h;
  p.querySelector('[data-cerrar]')?.addEventListener('click', () => elegir(null));
  p.querySelectorAll('tr[data-san]').forEach(tr => tr.onclick = () => { const s = SANP[tr.dataset.san]; if (nivelSel && !visibleNivel(s.nivel)) elegirNivel(null); elegir(tr.dataset.san, true); });
  p.querySelectorAll('tr[data-niv]').forEach(tr => tr.onclick = () => elegirNivel(tr.dataset.niv));
}
