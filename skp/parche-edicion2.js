const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 80)); t = t.replace(a, b); };
// Reemplazo del bloque de edición
const i0 = t.indexOf('// ---------- Edición de muros'), i1 = t.indexOf('// --- Pases: agujeros reales en la losa');
if (i0 < 0 || i1 < 0 || i1 < i0) throw new Error('marcas');
t = t.slice(0, i0) + fs.readFileSync('bloque-edicion.js', 'utf8') + '\n' + t.slice(i1);
// pintarMuros y pintarSan ya no resaltan: lo hace el foco
r('    mesh.material = sel || hov ? matSelSan : mM(s.o.tipo);\n    if (!sel && !hov) { vestir(mesh.material, s.o.tipo, !inst); mesh.material.opacity = inst ? 0.12 : 1; mesh.material.depthWrite = !inst; }',
  '    mesh.material = mM(s.o.tipo);\n    vestir(mesh.material, s.o.tipo, !inst); mesh.material.opacity = inst ? 0.12 : 1; mesh.material.depthWrite = !inst;');
r("    if (s.k === 'tramo') s.ppal.material = id === seleccion || id === hover ? matSelSan : mS(s.o.sis);", "    if (s.k === 'tramo') s.ppal.material = mS(s.o.sis);");
r('  pintarMuros();\n  if (window.__agarres) window.__agarres();', '  pintarMuros();\n  if (window.__foco) window.__foco();\n  if (window.__agarres) window.__agarres();');
r('window.__agarres = ponerFlechas; window.__flechas = () => escalarFlechas();', 'window.__agarres = ponerFlechas; window.__flechas = () => escalarFlechas(); window.__foco = () => aplicarFoco();');
// Estructura elegida: también se aclara el resto (ya lo hacía) y la elegida conserva su textura
r('    mat.opacity = modo === \'instalacion\' ? (VIGAS_CRUZADAS.has(e.id) ? 0.45 : e.t === \'losa\' ? 0.28 : 0.08) : fantasma ? 0.16 :',
  '    mat.opacity = modo === \'instalacion\' ? (VIGAS_CRUZADAS.has(e.id) ? 0.45 : e.t === \'losa\' ? 0.28 : 0.08) : fantasma ? 0.14 :');
// Al cambiar de elemento se sale de la edición
r('function elegir(id, enfocar = false) {\n  seleccion = id;', 'function elegir(id, enfocar = false) {\n  if (typeof enEdicion !== \'undefined\' && enEdicion && enEdicion !== id) enEdicion = null;\n  seleccion = id;');
// Texto de la ficha
r('<span>Arrastrá las flechas de las puntas para estirarlo o acortarlo; se engancha con columnas, vigas y otros muros (Alt: sin enganche).</span>',
  '<span>${enEdicion === \'muro:\' + m.id ? \'<b>Editando:</b> arrastrá las flechas de las puntas (largo) o la de arriba (altura); se engancha con columnas, vigas, losas y otros muros. Alt: sin enganche. Esc: terminar.\' : \'Doble clic sobre el muro para editar su largo y su altura.\'}</span>');
r('<span class=\"dif\">Largo modificado (original ${fmt(m.cajasOrig.reduce((a, r) => a + (r[2] - r[0]) * (r[3] - r[1]), 0) / m.esp, 2)} m).</span><button type=\"button\" class=\"btn\" data-restablecer-muro=\"${m.id}\" style=\"justify-self:start;margin-top:4px\">Volver al largo original</button>',
  '<span class=\"dif\">Modificado (original: ${fmt(largoOriginal(m), 2)} m de largo × ${fmt(m.z1Orig - m.z0, 2)} m de alto).</span><button type=\"button\" class=\"btn\" data-restablecer-muro=\"${m.id}\" style=\"justify-self:start;margin-top:4px\">Volver al original</button>');
r('${ediciones[m.id] ? `<span class="dif">', '${editado(m) ? `<span class="dif">');
r("${ediciones[m.id] ? ' <span title=\"Largo modificado\" style=\"color:var(--accent)\">✎</span>' : ''}", "${editado(m) ? ' <span title=\"Modificado\" style=\"color:var(--accent)\">✎</span>' : ''}");
fs.writeFileSync('tablero.template.html', t); console.log('ok');
