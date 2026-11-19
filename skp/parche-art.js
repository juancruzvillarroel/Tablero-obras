const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 70)); t = t.replace(a, b); };
r('// --- Pases: agujeros reales en la losa', fs.readFileSync('bloque-artefactos.js', 'utf8') + '// --- Pases: agujeros reales en la losa');
r("sanOn.pases = true; sanOn.cruces = true; sanOn.numeros = true;", "sanOn.pases = true; sanOn.cruces = true; sanOn.numeros = true; sanOn.artefactos = true;");
r("    else if (s.k === 'pieza') on = true;", "    else if (s.k === 'pieza') on = true;\n    else if (s.k === 'artefacto') on = sanOn.artefactos;");
// tooltip
r("  if (s.k === 'pieza') return `<b>${NOM_PIEZA[s.o.tipo]}</b>${esc(NOM_PISO[s.o.piso])}`;",
  "  if (s.k === 'pieza') return `<b>${NOM_PIEZA[s.o.tipo]}</b>${esc(NOM_PISO[s.o.piso])}`;\n" +
  "  if (s.k === 'artefacto') { const a = s.o; return `<b>${NOM_ART[a.tipo]}</b>${esc(NOM_PISO[a.piso])}${a.sinDescarga ? ' · sin descarga ubicada' : ` · descarga Ø${Math.round(a.d * 1000)} a ${esc(SAN.sistemas[a.sis])}`}`; }");
// ficha
r("  } else if (s.k === 'pase') {\n    const q = s.o; titulo = `Pase Ø",
  "  } else if (s.k === 'artefacto') {\n    const a = s.o; titulo = NOM_ART[a.tipo]; sub = NOM_PISO[a.piso]; color = 'var(--fg2)';\n" +
  "    med = [['Descarga', a.sinDescarga ? 'no ubicada' : `Ø${Math.round(a.d * 1000)}`], ['Va a', a.sinDescarga ? '—' : SAN.sistemas[a.sis]], ['Nivel de piso', fmt(a.z) + ' m']];\n" +
  "    extra = `<div class=\"comparar\"><span>Ubicado por el rótulo del plano sanitario; la orientación es aproximada (el plano no trae los bloques de artefactos).</span></div>`;\n" +
  "  } else if (s.k === 'pase') {\n    const q = s.o; titulo = `Pase Ø");
// chip
r("[['primaria', 'Primaria', '--i-primaria'],", "[['artefactos', 'Artefactos', '--fg2'], ['primaria', 'Primaria', '--i-primaria'],");
// cómo se armó
r("    <li>Cada caída a artefacto y cada montante", "    <li>Artefactos: se ubican con los rótulos del plano (INODORO, BIDET, BACHA, DUCHA, PC…) sobre la descarga compatible más cercana; la orientación es aproximada.</li>\n    <li>Cada caída a artefacto y cada montante");
fs.writeFileSync('tablero.template.html', t); console.log('ok');
