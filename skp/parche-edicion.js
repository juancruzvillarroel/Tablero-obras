const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 80)); t = t.replace(a, b); };
r('// --- Pases: agujeros reales en la losa', fs.readFileSync('bloque-edicion.js', 'utf8') + '\n// --- Pases: agujeros reales en la losa');
// flechas tras pintar y escala por distancia en cada cuadro
r('  pintarSan();\n  pintarMuros();\n  pintarLeyenda();', '  pintarSan();\n  pintarMuros();\n  if (window.__agarres) window.__agarres();\n  pintarLeyenda();');
r('if (window.__etq) window.__etq(); requestAnimationFrame(loop);', 'if (window.__etq) window.__etq(); if (window.__flechas) window.__flechas(); requestAnimationFrame(loop);');
r('window.__agarres = ponerFlechas;', 'window.__agarres = ponerFlechas; window.__flechas = () => escalarFlechas();');
// ficha del muro: cómo editar y volver al original
r("    extra = m.sinLosa ? `<div class=\"comparar\"><span>Sin losa arriba: se tomó una altura de ${fmt(m.alto, 2)} m (muro de azotea).</span></div>` : '';",
  "    extra = `<div class=\"comparar\"><span>Arrastrá las flechas de las puntas para estirarlo o acortarlo; se engancha con columnas, vigas y otros muros (Alt: sin enganche).</span>${m.sinLosa ? `<span>Sin losa arriba: se tomó una altura de ${fmt(m.alto, 2)} m (muro de azotea).</span>` : ''}${ediciones[m.id] ? `<span class=\"dif\">Largo modificado (original ${fmt(m.cajasOrig.reduce((a, r) => a + (r[2] - r[0]) * (r[3] - r[1]), 0) / m.esp, 2)} m).</span><button type=\"button\" class=\"btn\" data-restablecer-muro=\"${m.id}\" style=\"justify-self:start;margin-top:4px\">Volver al largo original</button>` : ''}</div>`;");
r('// ---------- Arranque ----------', "document.addEventListener('click', ev => { const b = ev.target.closest('[data-restablecer-muro]'); if (b) restablecerMuro(b.dataset.restablecerMuro); });\n// ---------- Arranque ----------");
// la tabla de muros marca los editados
r("<td><span class=\"sw\" style=\"display:inline-block;vertical-align:-1px;margin-right:6px;background:var(--a-${m.tipo})\"></span>${m.nombre}</td>",
  "<td><span class=\"sw\" style=\"display:inline-block;vertical-align:-1px;margin-right:6px;background:var(--a-${m.tipo})\"></span>${m.nombre}${ediciones[m.id] ? ' <span title=\"Largo modificado\" style=\"color:var(--accent)\">✎</span>' : ''}</td>");
fs.writeFileSync('tablero.template.html', t); console.log('ok');
