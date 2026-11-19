const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 90)); t = t.replace(a, b); };
r("      <div>${casillaHecho(e.id)}</div>\n      ${comp}</div>`;",
  "      <div>${casillaHecho(e.id)}</div>\n      ${comp}${e.dud ? `<div class=\"comparar\"><span class=\"dif\">La pieza no es un sólido cerrado en el SketchUp (le faltan caras). El volumen se midió con rayos verticales cada 2 mm; conviene corregirla en el modelo.</span></div>` : ''}</div>`;");
r("  h += `<section><h2>Para revisar</h2><ul class=\"revisar\">${D.notas.map(n => `<li>${esc(n)}</li>`).join('')}</ul></section>`;",
  "  const rotas = EL.filter(e => e.dud);\n  const notas = [...D.notas, ...(rotas.length ? [`Piezas que no cierran en el SketchUp (volumen medido con rayos): ${rotas.map(e => e.n + ' ' + NIV[nivIdx[e.l]].corto).join(', ')}. Conviene corregirlas en el modelo.`] : [])];\n  if (notas.length) h += `<section><h2>Para revisar</h2><ul class=\"revisar\">${notas.map(n => `<li>${esc(n)}</li>`).join('')}</ul></section>`;");
fs.writeFileSync('tablero.template.html', t); console.log('ok');
