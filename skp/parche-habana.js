const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 90)); t = t.replace(a, b); };
// Nombre de cada piso: lo trae el proyecto (Habana tiene 8° y S.M. propios); si no, el de Argerich.
r(`NIV.forEach(n => { n.losa = n.corto; n.corto = NOMBRE_PISO[n.id] || n.corto; });`,
  `NIV.forEach(n => { n.losa = n.corto; n.corto = n.piso || NOMBRE_PISO[n.id] || n.corto; });`);
// Resumen: el aviso de la instalación solo si hay instalación; si hay solo pases, lo dice así.
r("  h += `<section class=\"aviso\"><span><b>Instalación sanitaria</b> · ${SAN.pases.filter(q => !q.ok).length} pases faltantes y ${SAN.cruces.length} cruces con vigas para revisar.</span><button class=\"btn prim\" type=\"button\" id=\"irSan\">Ver instalación</button></section>`;",
  "  if (SAN.tramos.length) h += `<section class=\"aviso\"><span><b>Instalación sanitaria</b> · ${SAN.pases.filter(q => !q.ok).length} pases faltantes y ${SAN.cruces.length} cruces con vigas para revisar.</span><button class=\"btn prim\" type=\"button\" id=\"irSan\">Ver instalación</button></section>`;\n" +
  "  else if (SAN.pasesIng.length) h += `<section class=\"aviso\"><span><b>Pases en losa</b> · ${SAN.pasesIng.length} pases de la lámina del ingeniero. Todavía no está cargada la instalación sanitaria.</span><button class=\"btn prim\" type=\"button\" id=\"irSan\">Ver pases</button></section>`;");
// Pestaña Sanitaria de un proyecto que solo tiene los pases de la lámina
r(`function refrescarSanitaria() {
  const P = SAN.pases, faltan = P.filter(q => !q.ok);`,
`function refrescarSanitaria() {
  if (!SAN.tramos.length) { refrescarSoloPases(); return; }
  const P = SAN.pases, faltan = P.filter(q => !q.ok);`);
r(`// ---------- Panel de capas ----------`,
`// Proyecto sin instalación cargada: lista de pases de la lámina del ingeniero por losa.
function refrescarSoloPases() {
  const P = SAN.pasesIng, losas = NIV.map(n => n.id).filter(l => P.some(p => p.losa === l));
  let h = \`<section><h2>Pases en losa <small>\${esc(SAN.fuentePases || 'lámina del ingeniero')}</small></h2>
    <div class="medidas" style="grid-template-columns:repeat(3,minmax(0,1fr))">
      <div><span>Pases</span><b>\${P.length}</b></div><div><span>En losa</span><b>\${P.filter(p => p.cortado).length}</b></div>
      <div><span>Fuera de losa</span><b>\${P.filter(p => !p.cortado).length}</b></div></div>
    <p class="nota">Cada pase se ve como un agujero en su losa, con la medida de la lámina. Los que no caen dentro de una losa del modelo (los de terreno natural, o los que pisan una viga) se marcan con un rectángulo naranja. Todavía no está cargada la instalación sanitaria.</p></section>\`;
  h += \`<section><h2>Por losa</h2><div class="tabla-wrap"><table><thead><tr><th>Losa</th><th class="r">Pases</th><th class="r">Fuera</th><th>Medidas</th></tr></thead><tbody>\` +
    losas.map(l => { const q = P.filter(p => p.losa === l), med = {}; q.forEach(p => med[p.medida] = (med[p.medida] || 0) + 1);
      return \`<tr class="clic" data-niv="\${l}"><td>\${esc(l === 'base' ? 'Terreno natural' : NIV[nivIdx[l]].losa)}</td><td class="r num">\${q.length}</td><td class="r num">\${q.filter(p => !p.cortado).length || '–'}</td><td style="font-size:12px">\${Object.entries(med).sort((a, b) => b[1] - a[1]).map(([m, n]) => \`\${n}× \${esc(m)}\`).join(', ')}</td></tr>\`; }).join('') +
    \`</tbody></table></div><p class="nota">La lámina dibuja una sola planta tipo para 1° a 4°: sus pases se repiten en las cuatro losas.</p></section>\`;
  const p = $('#p-sanitaria'); p.innerHTML = h;
  p.querySelectorAll('tr[data-niv]').forEach(tr => tr.onclick = () => elegirNivel(tr.dataset.niv));
}

// ---------- Panel de capas ----------`);
// Marcar qué pases quedaron como agujero y dibujar el contorno de los demás
r(`  for (const p of pasesPorLosa[e.l]) {
    const esq = [[p.x0, p.y0], [p.x1, p.y0], [p.x1, p.y1], [p.x0, p.y1]];
    if (!esq.every(([x, y]) => dentroPol(x, y, ext)) || internos.some(l => esq.some(([x, y]) => dentroPol(x, y, l)))) continue;
    if (rects.some(q => p.x0 < q.x1 && p.x1 > q.x0 && p.y0 < q.y1 && p.y1 > q.y0)) continue;
    rects.push(p);
  }`,
`  for (const p of pasesPorLosa[e.l]) {
    const esq = [[p.x0, p.y0], [p.x1, p.y0], [p.x1, p.y1], [p.x0, p.y1]];
    if (!esq.every(([x, y]) => dentroPol(x, y, ext)) || internos.some(l => esq.some(([x, y]) => dentroPol(x, y, l)))) continue;
    if (rects.some(q => p.x0 < q.x1 && p.x1 > q.x0 && p.y0 < q.y1 && p.y1 > q.y0)) continue;
    rects.push(p);
  }
  rects.forEach(p => p.cortado = true);`);
r(`// --- Pases faltantes (no están en la lámina): anillo rojo; cruces con vigas: esfera roja ---`,
`// --- Pases de la lámina que no cayeron dentro de una losa (terreno natural, sobre vigas): contorno naranja ---
// Solo en proyectos sin instalación cargada; en los que tienen instalación ya se comparan en la pestaña Sanitaria.
const PASES_SUELTOS = [];
if (!SAN.tramos.length) {
  const matSuelto = new THREE.LineBasicMaterial({ color: css('--warn') });
  for (const p of SAN.pasesIng.filter(p => !p.cortado)) {
    const z = p.z + 0.02, l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([v3(p.x0, p.y0, z), v3(p.x1, p.y0, z), v3(p.x1, p.y1, z), v3(p.x0, p.y1, z)]), matSuelto);
    l.userData.nivel = p.losa; escena.add(l); PASES_SUELTOS.push(l);
  }
}
// --- Pases faltantes (no están en la lámina): anillo rojo; cruces con vigas: esfera roja ---`);
r(`function pintarSan() {`, `function pintarSan() {
  PASES_SUELTOS.forEach(l => l.visible = sanOn.pases && visibleNivel(l.userData.nivel));`);
// Albañilería vacía
r(`function refrescarAlbanileria() {`, `function refrescarAlbanileria() {
  if (!ALB.muros.length) { $('#p-albanileria').innerHTML = '<section><h2>Albañilería</h2><p class="nota">Este proyecto todavía no tiene muros cargados. Se pueden dibujar con el lápiz (abajo del modelo) o cargarlos desde el CAD de muros.</p></section>'; return; }`);
// fuentes de la sanitaria/albañilería por proyecto en los títulos
r(`RICH_ALB_MUROS.dwg</small></h2>`, `\${esc(ALB.fuente || 'RICH_ALB_MUROS.dwg')}</small></h2>`);
fs.writeFileSync('tablero.template.html', t); console.log('ok');
