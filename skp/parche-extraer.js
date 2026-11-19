const fs = require('fs'); let t = fs.readFileSync('extraer-skp.js', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 90)); t = t.replace(a, b); };
r(`  if (r[0] === 'ESTRUCTURA' && NIVELES[r[1]] && r.length >= 4) {
    const version = c0[1] < 20 ? 'A' : 'B';
    const nivel = NIVELES[r[1]].id;
    const cat = r[2], hoja = r[3];
    const p = parsear(hoja, cat);
    agregar(\`\${version}|\${nivel}|\${cat}|\${hoja}\`, { version, nivel, ...p }, m.tris);
  } else if (r[0] === 'Grupo#225') {
    const tris = m.tris.map(t => t.map(([x, y, z]) => [+(x - 20).toFixed(4), y, z]));`,
`  if (r[0] === 'ESTRUCTURA' && NIVELES[r[1]] && r.length >= 3) {
    const version = c0[1] < 20 ? 'A' : 'B';
    let nivel = NIVELES[r[1]].id;
    // Desde la versión del 17/11 el modelo ya no trae 07_SOBRE SM: el techo de la sala de máquinas quedó dentro de
    // 06_SOBRE 5°. Las vigas y losas que están por arriba del medio nivel (16,08) se pasan al techo S.M.
    const zTop = caja(m.tris)[2][1];
    let cat, hoja;
    if (['COLUMNAS', 'VIGAS', 'LOSAS'].includes(r[2]) && r.length >= 4) { cat = r[2]; hoja = r[3]; }
    else {
      // Elementos sueltos dentro del nivel: vigas, losas y tabiques con nombre, y escaleras en grupos sin nombre.
      hoja = r.length >= 5 ? r[r.length - 1] : r[2];
      cat = /^V/.test(hoja) ? 'VIGAS' : /^L\d/.test(hoja) ? 'LOSAS' : /^[MC]\d/.test(hoja) ? 'COLUMNAS' : 'SUELTO';
    }
    if (nivel === 's5' && cat !== 'COLUMNAS' && zTop > 16.5) nivel = 'sSM';
    let p = parsear(hoja, cat);
    if (cat === 'SUELTO') {
      const b = caja(m.tris);
      p = b[2][1] - b[2][0] > 1 ? { nombre: 'Esc', seccion: '', tipo: 'escalera' } : { nombre: 'V s/n', seccion: \`\${Math.round(Math.min(b[0][1] - b[0][0], b[1][1] - b[1][0]) * 100)}x\${Math.round((b[2][1] - b[2][0]) * 100)}\`, tipo: 'viga' };
    }
    agregar(\`\${version}|\${nivel}|\${cat}|\${hoja}\`, { version, nivel, ...p }, m.tris);
  } else if (r[0] === 'Grupo#225' || (r[0] === 'ESTRUCTURA' && /^Componente#/.test(r[1]))) {
    // Antes las fundaciones estaban corridas 20 m en x; si siguen corridas se acomodan, si no se usan tal cual.
    const corr = Math.min(...s.mallas.filter(q => q.ruta[0] === 'Grupo#225').flatMap(q => q.tris.flat().map(p => p[0]))) > 20 ? 20 : 0;
    const tris = r[0] === 'Grupo#225' ? m.tris.map(t => t.map(([x, y, z]) => [+(x - corr).toFixed(4), y, z])) : m.tris;`);
r("agregar(`B|base|${r[1]}|${r.length}`", "agregar(`B|base|${r.join('/')}|${r.length}`");
// escaleras: nombre por nivel y tramo, de abajo hacia arriba
r("for (const e of lista.filter(e => e.nombre === 'Componente#33'))",
`const CORTO = { sPB: 'PB', s1: '1°', s2: '2°', s3: '3°', s4: '4°', s5: '5°', sSM: 'S.M.' };
for (const nv of Object.keys(CORTO)) {
  const esc = lista.filter(e => e.nivel === nv && e.tipo === 'escalera').sort((a, b) => caja(a.tris)[2][0] - caja(b.tris)[2][0]);
  esc.forEach((e, i) => { e.nombre = esc.length > 1 ? \`Esc \${CORTO[nv]} tramo \${i + 1}\` : \`Esc \${CORTO[nv]}\`; e.seccion = ''; });
}
for (const e of lista.filter(e => e.nombre === 'Componente#33'))`);
fs.writeFileSync('extraer-skp.js', t); console.log('ok');
