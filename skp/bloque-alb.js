// ---------- Albañilería (RICH_ALB_MUROS.dwg) ----------
// Cada muro es un elemento: su planta exacta (rectángulos a 1 cm de los filos dibujados) extruida desde el piso
// hasta el fondo de la losa o viga de arriba. Colores como en el CAD: rosa portante 12, celeste hueco 12, naranja hueco 8.
const TIPO_MURO = { portante12: 'Ladrillo portante 12', hueco12: 'Ladrillo hueco 12', hueco8: 'Ladrillo hueco 8' };
const PISO_MURO = { PB: 'base', P1: 'sPB', P2: 's1', P3: 's2', P4: 's3', P5: 's4', SM: 's5' };
const NOM_PISO_MURO = { PB: 'Planta baja', P1: '1° piso', P2: '2° piso', P3: '3° piso', P4: '4° piso', P5: 'Azotea', SM: 'Sala de máquinas' };
const LADRILLOS_DEF = { portante12: 15, hueco12: 15, hueco8: 15 };      // unidades por m² (ladrillo de 33 cm de largo)
let ladrillos = { ...LADRILLOS_DEF, ...leer('ladrillos', {}) };
const albOn = { muros: true };
const matMuro = {}; const mM = t => matMuro[t] ||= new THREE.MeshLambertMaterial({ color: css('--a-' + t), transparent: true });
const bordeMuro = new THREE.LineBasicMaterial({ color: 0x3a3f45, transparent: true, opacity: 0.35 });
const MUROS = [];
for (const m of ALB.muros) {
  const gs = m.cajas.map(([x0, y0, x1, y1]) => new THREE.BoxGeometry(x1 - x0, m.z1 - m.z0, y1 - y0).translate((x0 + x1) / 2 - OX, (m.z0 + m.z1) / 2, -((y0 + y1) / 2 - OY)));
  const geo = merge(gs), mesh = new THREE.Mesh(geo, mM(m.tipo));
  const id = 'muro:' + m.id; mesh.userData.id = id;
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), bordeMuro));
  escena.add(mesh); sanMallas.push(mesh); MUROS.push(mesh);
  const c = m.cajas.reduce((a, r) => a.add(new THREE.Vector3((r[0] + r[2]) / 2 - OX, (m.z0 + m.z1) / 2, -((r[1] + r[3]) / 2 - OY))), new THREE.Vector3()).divideScalar(m.cajas.length);
  SANP[id] = { k: 'muro', o: m, m: mesh, ppal: mesh, nivel: PISO_MURO[m.piso], centro: c };
}
const ladrillosDe = m => m.sup * (ladrillos[m.tipo] || 0);
function pintarMuros() {
  const inst = modo === 'instalacion';
  for (const mesh of MUROS) {
    const s = SANP[mesh.userData.id];
    mesh.visible = albOn.muros && visibleNivel(s.nivel);
    const sel = seleccion === mesh.userData.id, hov = hover === mesh.userData.id;
    mesh.material = sel || hov ? matSelSan : mM(s.o.tipo);
    if (!sel && !hov) { mesh.material.opacity = inst ? 0.12 : 0.92; mesh.material.depthWrite = !inst; }
    mesh.children[0].visible = !inst;
  }
}
// Pestaña Albañilería
function refrescarAlbanileria() {
  const M = ALB.muros.filter(m => !nivelSel || visibleNivel(PISO_MURO[m.piso]));
  const tot = M.reduce((a, m) => (a.sup += m.sup, a.vol += m.vol, a.lad += ladrillosDe(m), a.largo += m.largo, a), { sup: 0, vol: 0, lad: 0, largo: 0 });
  let h = '';
  if (seleccion && SANP[seleccion]?.k === 'muro') h += '<section><h2>Elemento</h2>' + fichaSan(seleccion).replace('id="cerrarFicha"', 'data-cerrar') + '</section>';
  h += `<section><h2>Albañilería <small>${nivelSel ? (hastaAca ? 'hasta ' : '') + NIV[nivIdx[nivelSel]].corto : 'toda la obra'} · RICH_ALB_MUROS.dwg</small></h2>
    <div class="medidas" style="grid-template-columns:repeat(4,minmax(0,1fr))">
      <div><span>Muros</span><b>${M.length}</b></div><div><span>Superficie</span><b>${fmt(tot.sup, 0)} m²</b></div>
      <div><span>Largo</span><b>${fmt(tot.largo, 0)} m</b></div><div><span>Ladrillos</span><b>${fmt(tot.lad, 0)}</b></div></div>
    <p class="nota">Superficie de muro = largo × alto (de piso al fondo de losa o viga). Clic en un nivel del corte para filtrar.</p></section>`;
  const pisosOrd = ['PB', 'P1', 'P2', 'P3', 'P4', 'P5', 'SM'];
  const tipos = Object.keys(TIPO_MURO);
  h += `<section><h2>Por piso y tipo <small>m²</small></h2><div class="tabla-wrap"><table><thead><tr><th>Piso</th>${tipos.map(t => `<th class="r"><span class="sw" style="display:inline-block;background:var(--a-${t})" title="${TIPO_MURO[t]}"></span></th>`).join('')}<th class="r">Total</th></tr></thead><tbody>` +
    pisosOrd.filter(p => M.some(m => m.piso === p)).map(p => { const s = t => M.filter(m => m.piso === p && (!t || m.tipo === t)).reduce((a, m) => a + m.sup, 0);
      return `<tr class="clic" data-nivm="${PISO_MURO[p]}"><td>${NOM_PISO_MURO[p]}</td>${tipos.map(t => `<td class="r num">${s(t) ? fmt(s(t), 1) : '–'}</td>`).join('')}<td class="r num">${fmt(s(), 1)}</td></tr>`; }).join('') +
    `</tbody><tfoot><tr><td>Total</td>${tipos.map(t => `<td class="r num">${fmt(M.filter(m => m.tipo === t).reduce((a, m) => a + m.sup, 0), 1)}</td>`).join('')}<td class="r num">${fmt(tot.sup, 1)}</td></tr></tfoot></table></div>
    <div class="leyenda-graf" style="margin-top:8px">${tipos.map(t => `<span><span class="sw" style="background:var(--a-${t})"></span>${TIPO_MURO[t]}</span>`).join('')}</div></section>`;
  h += `<section><h2>Cómputo de materiales</h2><div class="tabla-wrap"><table><thead><tr><th>Tipo</th><th class="r">m²</th><th class="r">m³</th><th class="r">u/m²</th><th class="r">Ladrillos</th></tr></thead><tbody>` +
    tipos.map(t => { const L = M.filter(m => m.tipo === t), s = L.reduce((a, m) => a + m.sup, 0), v = L.reduce((a, m) => a + m.vol, 0);
      return `<tr><td>${TIPO_MURO[t]}</td><td class="r num">${fmt(s, 1)}</td><td class="r num">${fmt(v, 2)}</td><td class="r"><input class="inline-num" style="width:56px" type="number" min="0" step="0.5" data-lad="${t}" value="${ladrillos[t]}" aria-label="Ladrillos por m² de ${TIPO_MURO[t]}"></td><td class="r num">${fmt(s * ladrillos[t], 0)}</td></tr>`; }).join('') +
    `</tbody></table></div><p class="nota">Ladrillos por m² editables (rendimiento de referencia: 15 u/m² para ladrillos de 33 cm de largo). No descuenta vanos de puertas y ventanas: el dibujo ya corta los muros en los vanos, pero no tiene dinteles.</p></section>`;
  h += `<section><h2>Muros <small>${M.length}</small></h2><div class="tabla-wrap" style="max-height:340px"><table><thead><tr><th>Muro</th><th>Tipo</th><th class="r">Largo</th><th class="r">Alto</th><th class="r">m²</th></tr></thead><tbody>` +
    M.map(m => `<tr class="clic${'muro:' + m.id === seleccion ? ' sel' : ''}" data-muro="${m.id}"><td><span class="sw" style="display:inline-block;vertical-align:-1px;margin-right:6px;background:var(--a-${m.tipo})"></span>${m.nombre}</td><td>${TIPO_MURO[m.tipo].replace('Ladrillo ', '')}</td><td class="r num">${fmt(m.largo, 2)}</td><td class="r num">${fmt(m.alto, 2)}</td><td class="r num">${fmt(m.sup, 2)}</td></tr>`).join('') + `</tbody></table></div></section>`;
  const p = $('#p-albanileria'); p.innerHTML = h;
  p.querySelector('[data-cerrar]')?.addEventListener('click', () => elegir(null));
  p.querySelectorAll('[data-lad]').forEach(i => i.onchange = () => { ladrillos[i.dataset.lad] = Math.max(0, +i.value || 0); guardar('ladrillos', ladrillos); refrescarAlbanileria(); });
  p.querySelectorAll('tr[data-muro]').forEach(tr => tr.onclick = () => elegir('muro:' + tr.dataset.muro, true));
  p.querySelectorAll('tr[data-nivm]').forEach(tr => tr.onclick = () => elegirNivel(tr.dataset.nivm));
}
{ // chip
  const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.setAttribute('aria-pressed', 'true');
  b.innerHTML = `<span class="sw" style="background:var(--a-hueco8)"></span>Albañilería`;
  b.onclick = () => { albOn.muros = !albOn.muros; b.setAttribute('aria-pressed', albOn.muros); pintar(); };
  $('#tipos').append(b);
}
