// ---------- Instalación sanitaria (cloacal y pluvial) ----------
// Cada tramo trae sus puntos en cm, en el mismo sistema que la estructura. Las cañerías de un piso
// van por el cielorraso del piso de abajo, salvo las aclaraciones del plano (contrapiso, pared, desvíos).
const SIS_ORDEN = ['primaria', 'secundaria', 'pluvial', 'ventilacion', 'extraccion', 'aire'];
const PISO_NIVEL = { PB: 'base', P1: 'sPB', P2: 's1', P3: 's2', P4: 's3', P5: 's4' };
const NOM_PISO = Object.fromEntries(SAN.pisos.map(p => [p.id, p.nombre]));
const NOM_MODO = {
  cielorraso: 'colgado bajo losa', bajo_viga: 'por debajo de la viga', contrapiso: 'por contrapiso', pared: 'por pared',
  muro: 'embutido en muro', enterrado: 'enterrado', montante: 'montante', caida: 'caída de artefacto',
};
const NOM_ORIGEN = { montante: 'montante', artefacto: 'caída de artefacto', inodoro: 'inodoro', PPA: 'pileta de patio', pared: 'baja en pase (por pared)', contrapiso: 'baja en pase (por contrapiso)' };
const VIGAS_CRUZADAS = new Set(SAN.cruces.map(k => k.vigaId));
const sanOn = Object.fromEntries(SIS_ORDEN.map(s => [s, true])); sanOn.pases = true; sanOn.cruces = true;
const SANP = {}; const sanMallas = [];
const aV3 = (x, y, z) => new THREE.Vector3(x - OX, z, -(y - OY));
const matSis = {}; const mS = s => matSis[s] ||= new THREE.MeshLambertMaterial({ color: css('--i-' + s) });
const geoCil = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true), geoEsf = new THREE.SphereGeometry(1, 10, 8);
for (const tr of SAN.tramos) {
  const pts = []; for (let i = 0; i < tr.p.length; i += 3) pts.push(aV3(tr.p[i] / 100, tr.p[i + 1] / 100, tr.p[i + 2] / 100));
  const r = Math.max(tr.d / 2, 0.018), partes = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], L = a.distanceTo(b); if (L < 1e-3) continue;
    const g = geoCil.clone(); g.scale(r, L, r);
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); partes.push(g);
  }
  for (let i = 1; i < pts.length - 1; i++) { const g = geoEsf.clone(); g.scale(r, r, r); g.translate(pts[i].x, pts[i].y, pts[i].z); partes.push(g); }
  if (!partes.length) continue;
  const m = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries(partes), mS(tr.sis));
  m.userData.id = 'san:' + tr.id; escena.add(m); sanMallas.push(m);
  SANP[m.userData.id] = { k: 'tramo', o: tr, m, nivel: PISO_NIVEL[tr.piso], centro: pts[Math.floor(pts.length / 2)].clone().lerp(pts[Math.ceil((pts.length - 1) / 2)], 0.5) };
}
// Pases: anillo verde si hay pase del ingeniero, rojo si falta. Pases del ingeniero sin caño: contorno punteado.
const matOk = new THREE.MeshBasicMaterial({ color: css('--ok') }), matCrit = new THREE.MeshBasicMaterial({ color: css('--crit') });
for (const q of SAN.pases) {
  const r = q.d / 2 + (q.ok ? 0.04 : 0.08);
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, q.ok ? 0.015 : 0.03, 8, 28), q.ok ? matOk : matCrit);
  m.rotation.x = Math.PI / 2; m.position.copy(aV3(q.x, q.y, q.z + 0.02));
  m.userData.id = 'pase:' + q.id; escena.add(m); sanMallas.push(m);
  SANP[m.userData.id] = { k: 'pase', o: q, m, nivel: PISO_NIVEL[q.piso], centro: m.position.clone() };
}
const matSinUso = new THREE.LineDashedMaterial({ color: css('--fg2'), dashSize: 0.05, gapSize: 0.04 });
SAN.pasesIng.filter(p => !p.usado).forEach((p, i) => {
  const w = p.x1 - p.x0, d = p.y1 - p.y0;
  const g = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 0.02, d));
  const m = new THREE.LineSegments(g, matSinUso); m.computeLineDistances();
  m.position.copy(aV3((p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, p.z + 0.02));
  const id = 'ing:' + i; m.userData.id = id; escena.add(m);
  SANP[id] = { k: 'ing', o: p, m, nivel: PISO_NIVEL[p.piso], centro: m.position.clone() };
});
// Cruces con vigas: esfera roja en el punto donde el caño atraviesa la viga.
for (const k of SAN.cruces) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), matCrit);
  m.position.copy(aV3(k.x, k.y, k.z)); m.userData.id = 'cruce:' + k.id; escena.add(m); sanMallas.push(m);
  SANP[m.userData.id] = { k: 'cruce', o: k, m, nivel: k.nivel, centro: m.position.clone() };
}
function visibleNivel(n) { if (nivelSel == null) return true; return hastaAca ? nivIdx[n] <= nivIdx[nivelSel] : n === nivelSel; }
function pintarSan() {
  for (const [id, s] of Object.entries(SANP)) {
    const on = s.k === 'tramo' ? sanOn[s.o.sis] : s.k === 'cruce' ? sanOn.cruces : sanOn.pases;
    s.m.visible = on && visibleNivel(s.nivel);
    if (s.k === 'tramo') s.m.material = id === seleccion || id === hover ? matSelSan : mS(s.o.sis);
  }
}
const matSelSan = new THREE.MeshLambertMaterial({ color: css('--accent'), emissive: 0x222222 });
const centroSan = id => SANP[id].centro;
function tipSan(id) {
  const s = SANP[id]; if (!s) return '';
  if (s.k === 'tramo') { const t = s.o; return `<b>Ø${Math.round(t.d * 1000)}</b>${esc(SAN.sistemas[t.sis])} · ${esc(NOM_PISO[t.piso])} · ${esc(NOM_MODO[t.modo])} · <span class="num">${fmt(t.largo, 2)} m</span>`; }
  if (s.k === 'pase') { const q = s.o; return `<b>Pase Ø${Math.round(q.d * 1000)}</b>${q.ok ? 'coincide con el plano del ingeniero' : 'falta en el plano del ingeniero'} · ${esc(NOM_ORIGEN[q.origen] || q.origen)}`; }
  const k = s.o; return `<b>Cruce con ${esc(k.viga)}</b>${esc(SAN.sistemas[k.sis])} Ø${Math.round(k.d * 1000)} · viga de ${fmt(k.alto * 100, 0)} cm de alto`;
}
function fichaSan(id) {
  const s = SANP[id]; if (!s) return '';
  let titulo, sub, med = [], extra = '';
  if (s.k === 'tramo') {
    const t = s.o, z = []; for (let i = 2; i < t.p.length; i += 3) z.push(t.p[i] / 100);
    titulo = `Ø${Math.round(t.d * 1000)}`; sub = `${SAN.sistemas[t.sis]} · ${NOM_PISO[t.piso]}`;
    med = [['Recorrido', NOM_MODO[t.modo]], ['Largo', fmt(t.largo) + ' m'], ['Cota inicio', fmt(z[0]) + ' m'], ['Cota fin', fmt(z[z.length - 1]) + ' m']];
    if (t.modo !== 'montante' && t.modo !== 'caida' && t.largo > 0.2) med.push(['Pendiente', fmt(Math.abs(z[0] - z[z.length - 1]) / t.largo * 100, 1) + ' %']);
    if (t.nota) extra = `<div class="comparar"><span>Aclaración del plano: <b>“${esc(t.nota)}”</b></span></div>`;
  } else if (s.k === 'pase') {
    const q = s.o; titulo = `Pase Ø${Math.round(q.d * 1000)}`; sub = `Losa ${NIV[nivIdx[q.losa]].corto} · ${NOM_PISO[q.piso]}`;
    med = [['Para', NOM_ORIGEN[q.origen] || q.origen], ['Sistema', SAN.sistemas[q.sis]], ['Estado', q.ok ? 'Está en el plano' : 'Falta en el plano']];
    extra = q.ok ? '' : `<div class="comparar"><span class="dif">No hay un pase del ingeniero a menos de ${q.origen === 'pared' || q.origen === 'contrapiso' ? 50 : 10} cm de este punto.</span><span>Revisar si hay que agregarlo en la lámina de pases o si el caño se corre.</span></div>`;
  } else {
    const k = s.o; titulo = `Cruce con ${k.viga}`; sub = `Bajo losa ${NIV[nivIdx[k.nivel]].corto} · ${k.piso}`;
    med = [['Caño', `${SAN.sistemas[k.sis]} Ø${Math.round(k.d * 1000)}`], ['Alto de viga', fmt(k.alto * 100, 0) + ' cm'], ['Cota del caño', fmt(k.z) + ' m']];
    extra = `<div class="comparar"><span class="dif">El caño, colgado bajo la losa, atraviesa la viga.</span><span>Opciones: pase en la viga (consultar al ingeniero) o bajar el caño por debajo del fondo de viga.</span></div>`;
  }
  return `<div class="ficha"><div class="ficha-cab"><span class="sw" style="width:14px;height:14px;background:${s.k === 'tramo' ? `var(--i-${s.o.sis})` : s.k === 'cruce' || !s.o.ok ? 'var(--crit)' : 'var(--ok)'}"></span>
    <div><h3>${esc(titulo)}</h3><div class="tipo">${esc(sub)}</div></div><button class="cerrar" type="button" id="cerrarFicha">Cerrar ✕</button></div>
    <div class="medidas">${med.map(([k, v]) => `<div><span>${k}</span><b style="font-family:var(--f-body);font-size:13.5px">${esc(v)}</b></div>`).join('')}</div>${extra}</div>`;
}
// Chips de la instalación en la barra de tipos
{
  const sep = document.createElement('span'); sep.style.cssText = 'width:1px;background:var(--line);margin:2px 4px'; $('#tipos').append(sep);
  for (const [k, n, c] of [['primaria', 'Primaria', '--i-primaria'], ['secundaria', 'Secundaria', '--i-secundaria'], ['pluvial', 'Pluvial', '--i-pluvial'], ['ventilacion', 'Ventilación', '--i-ventilacion'], ['pases', 'Pases', '--ok'], ['cruces', 'Cruces', '--crit']]) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.setAttribute('aria-pressed', 'true');
    b.innerHTML = `<span class="sw" style="background:var(${c})${k === 'pases' || k === 'cruces' ? ';border-radius:50%' : ''}"></span>${n}`;
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
    <p class="nota">El modelo se colorea por instalación mientras estás en esta pestaña: la estructura queda transparente y las vigas que cruza un caño, en rojo.</p></section>`;
  h += `<section><h2>Pases en losa <small>sanitaria vs. lámina del ingeniero</small></h2><div class="tabla-wrap"><table>
    <thead><tr><th>Losa</th><th>Piso que desagua</th><th class="r">Necesarios</th><th class="r">Coinciden</th><th class="r">Faltan</th><th class="r">Sin caño</th></tr></thead><tbody>` +
    losas.map(l => { const q = P.filter(x => x.losa === l), pis = q[0].piso; const sinUso = SAN.pasesIng.filter(p => p.losa === l && !p.usado).length;
      return `<tr class="clic" data-niv="${l}"><td>${esc(NIV[nivIdx[l]].corto)}</td><td>${esc(NOM_PISO[pis])}</td><td class="r num">${q.length}</td><td class="r num">${q.filter(x => x.ok).length}</td><td class="r num"${q.some(x => !x.ok) ? ' style="color:var(--crit);font-weight:600"' : ''}>${q.filter(x => !x.ok).length}</td><td class="r num">${sinUso}</td></tr>`; }).join('') +
    `</tbody></table></div><p class="nota">"Sin caño": pases de la lámina del ingeniero por los que no pasa ningún caño sanitario. Pueden ser de otra instalación (aire, gas, electricidad); se ven como contorno punteado.</p></section>`;
  const fila = (id, a, b, c) => `<tr class="clic${id === seleccion ? ' sel' : ''}" data-san="${id}"><td>${a}</td><td>${b}</td><td class="r">${c}</td></tr>`;
  h += `<section><h2>Pases que faltan <small>${faltan.length}</small></h2><div class="tabla-wrap"><table><thead><tr><th>Dónde</th><th>Para</th><th class="r">Caño</th></tr></thead><tbody>` +
    faltan.map(q => fila('pase:' + q.id, `${esc(NIV[nivIdx[q.losa]].corto)} <span style="color:var(--muted)">(${esc(NOM_PISO[q.piso])})</span>`, esc(NOM_ORIGEN[q.origen] || q.origen), `${esc(SAN.sistemas[q.sis])} Ø${Math.round(q.d * 1000)}`)).join('') + `</tbody></table></div></section>`;
  h += `<section><h2>Caños que cruzan vigas <small>${SAN.cruces.length}</small></h2><div class="tabla-wrap"><table><thead><tr><th>Viga</th><th>Bajo losa</th><th class="r">Caño</th></tr></thead><tbody>` +
    SAN.cruces.map(k => fila('cruce:' + k.id, `<b>${esc(k.viga)}</b> <span style="color:var(--muted)">h ${fmt(k.alto * 100, 0)}</span>`, esc(NIV[nivIdx[k.nivel]].corto), `${esc(SAN.sistemas[k.sis])} Ø${Math.round(k.d * 1000)}`)).join('') + `</tbody></table></div>
    <p class="nota">Se marca cuando el caño, colgado bajo la losa con su pendiente, queda a la altura de la viga. Los tramos con "pasa por abajo de la viga" ya están bajados.</p></section>`;
  h += `<section><h2>Metros de cañería</h2><div class="tabla-wrap"><table><thead><tr><th>Sistema</th><th class="r">Ø</th><th class="r">Metros</th></tr></thead><tbody>` +
    Object.entries(met).sort((a, b) => SIS_ORDEN.indexOf(a[0].split('|')[0]) - SIS_ORDEN.indexOf(b[0].split('|')[0]) || b[0].split('|')[1] - a[0].split('|')[1])
      .map(([k, v]) => { const [s, d] = k.split('|'); return `<tr><td><span class="sw" style="display:inline-block;margin-right:6px;background:var(--i-${s})"></span>${esc(SAN.sistemas[s])}</td><td class="r num">${d}</td><td class="r num">${fmt(v, 1)}</td></tr>`; }).join('') +
    `</tbody><tfoot><tr><td>Total</td><td></td><td class="r num">${fmt(totM, 1)}</td></tr></tfoot></table></div>
    <p class="nota">Incluye tramos horizontales, montantes y caídas a artefactos. Sin accesorios.</p></section>`;
  h += `<section><h2>Cómo se armó</h2><ul class="revisar">
    <li>Diámetro de cada caño: el espesor de su polilínea en el plano (0,110 → Ø110, 0,063 → Ø63, 0,040 → Ø40).</li>
    <li>Los caños de cada piso van colgados bajo su losa, en el cielorraso del piso de abajo, con pendiente 1:60 (Ø110) o 2 % hacia la bajada.</li>
    <li>Aclaraciones del plano que se respetaron: ${SAN.notas.map(n => esc(n)).join(' · ')}.</li>
    <li>"Desvío por cielorraso de N": va bajo la losa de techo del piso N, y la montante del extremo de arriba no sigue bajando.</li>
    <li>Cada caída a artefacto y cada montante que atraviesa una losa necesita un pase; se compara con la lámina "Pases en losa" del ingeniero.</li></ul></section>`;
  if (seleccion && SANP[seleccion]) h = '<section><h2>Elemento</h2>' + fichaSan(seleccion).replace('id="cerrarFicha"', 'data-cerrar') + '</section>' + h;
  const p = $('#p-sanitaria'); p.innerHTML = h;
  p.querySelector('[data-cerrar]')?.addEventListener('click', () => elegir(null));
  p.querySelectorAll('tr[data-san]').forEach(tr => tr.onclick = () => { const s = SANP[tr.dataset.san]; if (nivelSel && !visibleNivel(s.nivel)) elegirNivel(null); elegir(tr.dataset.san, true); });
  p.querySelectorAll('tr[data-niv]').forEach(tr => tr.onclick = () => elegirNivel(tr.dataset.niv));
}
