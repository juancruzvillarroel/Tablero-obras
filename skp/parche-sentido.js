const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 90)); t = t.replace(a, b); };
// Sentido: se ve lo de abajo del plano (como una planta) o lo de arriba (como un cielorraso visto desde abajo).
r(`var corte = null;                                   // { z } en metros, o null sin plano`,
  `var corte = null;                                   // { z, arriba } en metros, o null sin plano. arriba: se ve lo de arriba`);
r(`function fracZ(z0, z1) { if (!corte || z1 <= corte.z) return 1; if (z0 >= corte.z) return 0; return (corte.z - z0) / Math.max(z1 - z0, 1e-6); }`,
  `function fracZ(z0, z1) {
  if (!corte) return 1;
  const abajo = z1 <= corte.z ? 1 : z0 >= corte.z ? 0 : (corte.z - z0) / Math.max(z1 - z0, 1e-6);
  return corte.arriba ? 1 - abajo : abajo;
}
const delLado = y => !corte || (corte.arriba ? y >= corte.z - 0.002 : y <= corte.z + 0.002);`);
r(`const fSan = s => s.k === 'tramo' ? fracZ(...zTramo(s.o)) : s.centro ? (corte && s.centro.y > corte.z ? 0 : 1) : 1;`,
  `const fSan = s => s.k === 'tramo' ? fracZ(...zTramo(s.o)) : s.centro ? (delLado(s.centro.y) ? 1 : 0) : 1;`);
r(`  <button type="button" class="btn" id="corteBorrar">Borrar</button>\`;`,
  `  <div class="seg" role="group" aria-label="Qué parte se ve"><button type="button" data-lado="abajo" aria-pressed="true">Ver abajo</button><button type="button" data-lado="arriba" aria-pressed="false">Ver arriba</button></div>
  <button type="button" class="btn" id="corteBorrar">Borrar</button>\`;`);
r(`function ponerCorte(z, guardarlo = true) {
  if (z == null) { corte = null; grupoCorte.visible = false; barraCorte.hidden = true; }
  else {
    z = Math.min(zMax, Math.max(zMin, z)); corte = { z };
    planoCorte.constant = z;`,
`function ponerCorte(z, guardarlo = true, arriba = corte ? corte.arriba : false) {
  if (z == null) { corte = null; grupoCorte.visible = false; barraCorte.hidden = true; }
  else {
    z = Math.min(zMax, Math.max(zMin, z)); corte = { z, arriba: !!arriba };
    // El plano deja del lado de su normal lo que se dibuja: hacia abajo (y <= z) o hacia arriba (y >= z).
    planoCorte.normal.set(0, arriba ? 1 : -1, 0); planoCorte.constant = arriba ? -z : z;
    barraCorte.querySelectorAll('[data-lado]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.lado === 'arriba') === !!arriba)));`);
r(`barraCorte.querySelector('#corteBorrar').onclick =`,
  `barraCorte.querySelectorAll('[data-lado]').forEach(b => b.onclick = () => ponerCorte(corte.z, true, b.dataset.lado === 'arriba'));
barraCorte.querySelector('#corteBorrar').onclick =`);
// menú del clic derecho
r(`    ? [['bajar', 'Llevar el plano a esta altura', zAqui != null], ['borrar', 'Borrar plano de sección', true]]`,
  `    ? [['bajar', 'Llevar el plano a esta altura', zAqui != null], ['sentido', corte.arriba ? 'Ver hacia abajo' : 'Ver hacia arriba', true], ['borrar', 'Borrar plano de sección', true]]`);
r(`  if (b.dataset.op === 'borrar') { ponerCorte(null); avisoBreve('Plano de sección borrado'); return; }`,
  `  if (b.dataset.op === 'borrar') { ponerCorte(null); avisoBreve('Plano de sección borrado'); return; }
  if (b.dataset.op === 'sentido') { ponerCorte(corte.z, true, !corte.arriba); avisoBreve(corte.arriba ? 'Se ve lo de arriba del plano' : 'Se ve lo de abajo del plano'); return; }`);
r(`{ const g = leer('corte', null); if (g && Number.isFinite(g.z)) ponerCorte(g.z, false); }`,
  `{ const g = leer('corte', null); if (g && Number.isFinite(g.z)) ponerCorte(g.z, false, !!g.arriba); }`);
// tocar y punto bajo el cursor: solo lo del lado que se ve
r(`.filter(h => typeof corte === 'undefined' || !corte || h.point.y <= corte.z + 0.002);`, `.filter(h => typeof corte === 'undefined' || delLado(h.point.y));`);
r(`.find(h => !corte || h.point.y <= corte.z + 0.002);`, `.find(h => delLado(h.point.y));`);
// etiquetas de bajada (flotan arriba del edificio): se ocultan solo si se ve lo de abajo
r(`!(typeof corte !== 'undefined' && corte && b.ancla.y > corte.z);`, `!(typeof corte !== 'undefined' && corte && !corte.arriba && b.ancla.y > corte.z);`);
r("(corte ? ` · bajo el corte a ${fmt(corte.z, 2)} m` : '')", "(corte ? ` · ${corte.arriba ? 'sobre' : 'bajo'} el corte a ${fmt(corte.z, 2)} m` : '')");
r(`const firmaVis = () => JSON.stringify([nivelSel, hastaAca, tiposOn, albOn, sanOn, Object.entries(capaEstado).map(([k, c]) => k + c.on), corte && corte.z]);`,
  `const firmaVis = () => JSON.stringify([nivelSel, hastaAca, tiposOn, albOn, sanOn, Object.entries(capaEstado).map(([k, c]) => k + c.on), corte && [corte.z, corte.arriba]]);`);
// comentario del bloque
r(`// Los cómputos cuentan solo lo que queda abajo; una pieza cortada cuenta en la proporción de su altura que queda.`,
  `// Se elige qué parte se ve (abajo, como una planta, o arriba). Los cómputos cuentan solo esa parte; una pieza
// cortada cuenta en la proporción de su altura que queda del lado visible.`);
r(`.barra-corte .btn { padding: 3px 8px; }`, `.barra-corte .btn { padding: 3px 8px; }
.barra-corte .seg { display: flex; gap: 2px; background: var(--hover); border-radius: 7px; padding: 2px; }
.barra-corte .seg button[aria-pressed="true"] { background: var(--raised); color: var(--fg); box-shadow: 0 1px 2px rgb(0 0 0 / .12); }`);
fs.writeFileSync('tablero.template.html', t); console.log('ok');
