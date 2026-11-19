const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b, todas) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 70)); t = todas ? t.split(a).join(b) : t.replace(a, b); };
// datos
r('const SAN = /*SAN*/null;', 'const SAN = /*SAN*/null;\nconst ALB = /*ALB*/null;');
// colores (como el CAD, un poco más suaves para el 3D)
r('--i-primaria: #e34948; --i-secundaria: #94552a;', '--a-portante12: #d97ad3; --a-hueco12: #62c6e0; --a-hueco8: #f0a35a;\n  --i-primaria: #e34948; --i-secundaria: #94552a;');
r('--i-primaria: #e34948; --i-secundaria: #9a5b2c;', '--a-portante12: #b55fb0; --a-hueco12: #3fa3bd; --a-hueco8: #c98440; --i-primaria: #e34948; --i-secundaria: #9a5b2c;', true);
// panel y pestaña
r('<div class="cuerpo" id="p-sanitaria" role="tabpanel" hidden></div>', '<div class="cuerpo" id="p-sanitaria" role="tabpanel" hidden></div>\n    <div class="cuerpo" id="p-albanileria" role="tabpanel" hidden></div>');
r("['avance', 'Avance'], ['sanitaria', 'Sanitaria']];", "['avance', 'Avance'], ['sanitaria', 'Sanitaria'], ['albanileria', 'Albañilería']];");
// bloque
r('// --- Pases: agujeros reales en la losa', fs.readFileSync('bloque-alb.js', 'utf8') + '\n// --- Pases: agujeros reales en la losa');
// pintado, refresco y fichas
r('  pintarSan();\n  pintarLeyenda();', '  pintarSan();\n  pintarMuros();\n  pintarLeyenda();');
r("    else if (s.k === 'artefacto') on = sanOn.artefactos;", "    else if (s.k === 'artefacto') on = sanOn.artefactos;\n    else if (s.k === 'muro') continue;");
r("  if (pestana === 'sanitaria') refrescarSanitaria();", "  if (pestana === 'sanitaria') refrescarSanitaria();\n  if (pestana === 'albanileria') refrescarAlbanileria();");
r("  pintar(); refrescarElementos(); refrescarComputo();\n}", "  pintar(); refrescarElementos(); refrescarComputo(); if (pestana === 'albanileria') refrescarAlbanileria();\n}");
r("  if (k === 'sanitaria' && modo !== 'instalacion')", "  if (k === 'albanileria') { refrescarAlbanileria(); if (modo === 'instalacion' || modo === 'avance') modosDiv.querySelector('[data-k=\"tipo\"]').click(); }\n  if (k === 'sanitaria' && modo !== 'instalacion')");
r("  if (s.k === 'artefacto') { const a = s.o;", "  if (s.k === 'muro') { const m = s.o; return `<b>${m.nombre}</b>${TIPO_MURO[m.tipo]} · ${NOM_PISO_MURO[m.piso]} · ${fmt(m.largo, 2)} × ${fmt(m.alto, 2)} m · <span class=\"num\">${fmt(m.sup, 2)} m²</span>`; }\n  if (s.k === 'artefacto') { const a = s.o;");
r("  } else if (s.k === 'artefacto') {\n    const a = s.o; titulo", "  } else if (s.k === 'muro') {\n    const m = s.o; titulo = m.nombre; sub = `${TIPO_MURO[m.tipo]} · ${NOM_PISO_MURO[m.piso]}`; color = `var(--a-${m.tipo})`;\n    med = [['Espesor', fmt(m.esp * 100, 0) + ' cm'], ['Largo', fmt(m.largo, 2) + ' m'], ['Alto', fmt(m.alto, 2) + ' m'], ['Superficie', fmt(m.sup, 2) + ' m²'], ['Volumen', fmt(m.vol, 3) + ' m³'], ['Ladrillos', fmt(ladrillosDe(m), 0)]];\n    extra = m.sinLosa ? `<div class=\"comparar\"><span>Sin losa arriba: se tomó una altura de ${fmt(m.alto, 2)} m (muro de azotea).</span></div>` : '';\n  } else if (s.k === 'artefacto') {\n    const a = s.o; titulo");
// ficha en Resumen también para muros (fichaSan ya lo resuelve); KPI de albañilería
r("`<div class=\"kpi\"><span>Hormigonado</span>", "`<div class=\"kpi\"><span>Albañilería</span><b>${fmt(ALB.muros.reduce((a, m) => a + m.sup, 0), 0)}<small>m²</small></b></div>` +\n    `<div class=\"kpi\"><span>Hormigonado</span>");
fs.writeFileSync('tablero.template.html', t); console.log('ok');
