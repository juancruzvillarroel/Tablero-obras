const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 90)); t = t.replace(a, b); };
// bloque nuevo, después del lápiz
r('// --- Pases: agujeros reales en la losa', fs.readFileSync('bloque-acciones.js', 'utf8') + '\n// --- Pases: agujeros reales en la losa');
// manija de mover en la edición
r("  nueva(v3((r[0] + r[2]) / 2, (r[1] + r[3]) / 2, m.z1), new THREE.Vector3(0, 1, 0), { k, ej: 2, lado: 1 });",
  "  nueva(v3((r[0] + r[2]) / 2, (r[1] + r[3]) / 2, m.z1), new THREE.Vector3(0, 1, 0), { k, ej: 2, lado: 1 });\n" +
  "  // Manija de mover: arriba del muro, a un costado de la flecha de altura\n" +
  "  { const f = new THREE.Mesh(geoManija, matFlecha); f.renderOrder = 10; const c = v3((r[0] + r[2]) / 2, (r[1] + r[3]) / 2, m.z1 + 0.35); f.position.copy(c); f.userData = { muro: m.id, ej: 'mover', dir: new THREE.Vector3(1, 0, 0) }; grupoFlechas.add(f); flechas.push(f); }");
// al agarrar: la manija mueve; las flechas guardan el estado previo para deshacer
r("  arrastre = { f, m, desfase: caraDe(m, f.userData) - puntoEnEje(ev, f) };",
  "  if (f.userData.ej === 'mover') arrastre = { f, m, mover: true, base: puntoPlano(ev, f.position.y), cajas0: m.cajas.map(r => r.slice()), antes: estadoMuro(m) };\n  else arrastre = { f, m, desfase: caraDe(m, f.userData) - puntoEnEje(ev, f), antes: estadoMuro(m) };");
r("  ev.stopImmediatePropagation();\n  const { f, m } = arrastre, { k, ej, lado } = f.userData;",
  "  ev.stopImmediatePropagation();\n  if (arrastre.mover) { moverMuro(ev); return; }\n  const { f, m } = arrastre, { k, ej, lado } = f.userData;");
r("    if (hit) { lienzo.style.cursor = hit.object.userData.ej === 2 ? 'ns-resize' : 'ew-resize';",
  "    if (hit) { lienzo.style.cursor = hit.object.userData.ej === 'mover' ? 'move' : hit.object.userData.ej === 2 ? 'ns-resize' : 'ew-resize';");
// al soltar: se registra para deshacer
r("  const { m } = arrastre; arrastre = null; ctrl.enabled = true;",
  "  const { m, antes, mover } = arrastre; arrastre = null; ctrl.enabled = true;\n  if (mover) recalcularMuro(m);\n  const despues = estadoMuro(m);\n  if (!mismoEstado(antes, despues)) registrar({ nombre: (mover ? 'mover ' : 'modificar ') + m.nombre, deshacer: () => ponerEstadoMuro(m, antes), rehacer: () => ponerEstadoMuro(m, despues) });");
// lápiz: dibujar se puede deshacer
r("  agregarMuroNuevo(m); guardarNuevos();", "  agregarMuroNuevo(m); guardarNuevos();\n  { let reponer = null; registrar({ nombre: 'dibujar ' + m.nombre, deshacer: () => { reponer = quitar('muro:' + id); }, rehacer: () => reponer && reponer() }); }");
// el viejo botón de eliminar muros nuevos usa el eliminar general
r("function eliminarMuro(id) {", "function eliminarMuro(id) { eliminar('muro:' + id); }\nfunction eliminarMuroViejo(id) {");
// fichas: botón Eliminar junto al tilde de hecho
r("const casillaHecho = id => `<label class=\"hecho\"><input type=\"checkbox\" data-hecho=\"${id}\"${hecho(id) ? ' checked' : ''}> Hecho</label>`;",
  "const casillaHecho = id => `<div style=\"display:flex;gap:8px;flex-wrap:wrap\"><label class=\"hecho\"><input type=\"checkbox\" data-hecho=\"${id}\"${hecho(id) ? ' checked' : ''}> Hecho</label><button type=\"button\" class=\"btn\" data-eliminar=\"${id}\" title=\"Tecla Supr · Ctrl+Z deshace\">Eliminar</button></div>`;");
// la tabla de metros de la sanitaria no cuenta lo eliminado
r("const met = {}; SAN.tramos.forEach(t => { const k = t.sis + '|' + Math.round(t.d * 1000); met[k] = (met[k] || 0) + t.largo; });",
  "const met = {}; Object.values(SANP).filter(s => s.k === 'tramo').map(s => s.o).forEach(t => { const k = t.sis + '|' + Math.round(t.d * 1000); met[k] = (met[k] || 0) + t.largo; });");
// al arrancar se sacan los eliminados guardados
r("armarElementos(); armarComputo(); armarSanitaria(); armarCapas(); aplicarCapas();", "for (const id of [...eliminados]) quitar(id);\narmarElementos(); armarComputo(); armarSanitaria(); armarCapas(); aplicarCapas();");
fs.writeFileSync('tablero.template.html', t); console.log('ok');
