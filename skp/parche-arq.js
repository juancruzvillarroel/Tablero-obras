const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 70)); t = t.replace(a, b); };
// Ducha con la medida del plato de la planta de arquitectura
r("function formaArtefacto(tipo) {", "function formaArtefacto(tipo, a = {}) {");
r("    p.push(caja(0.8, 0.05, 0.8, 0, 0.025, 0.1)); o.push(caja(0.12, 0.01, 0.12, 0, 0.055, 0));",
  "    const w = a.w || 0.8, pr = a.p || 0.8;\n    p.push(caja(w, 0.05, pr, 0, 0.025, 0.1)); o.push(caja(0.12, 0.01, 0.12, w / 2 - 0.15, 0.055, 0.1));");
r("  const f = formaArtefacto(a.tipo);", "  const f = formaArtefacto(a.tipo, a);\n  // Con posición de arquitectura el punto es el centro del artefacto: se corre la forma para centrarla.\n  const OFF = { inodoro: 0.02, bidet: 0.08, bacha: 0.05, ducha: 0.1, pileta: 0.06, lavarropas: 0.15, lavajillas: 0.15 };\n  const cont = new THREE.Group(); if (a.centrado) cont.position.z = -(OFF[a.tipo] || 0); g.add(cont);");
r("    const geo = merge(gs), mesh = new THREE.Mesh(geo, mat); mesh.userData.id = id; g.add(mesh); sanMallas.push(mesh);\n    if (mat === matPorc || mat === matMueble) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), bordeArt); g.add(e); }",
  "    const geo = merge(gs), mesh = new THREE.Mesh(geo, mat); mesh.userData.id = id; cont.add(mesh); sanMallas.push(mesh);\n    if (mat === matPorc || mat === matMueble) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), bordeArt); cont.add(e); }");
r("  SANP[id] = { k: 'artefacto', o: a, m: g, ppal: g.children[0], nivel:", "  SANP[id] = { k: 'artefacto', o: a, m: g, ppal: cont.children[0], nivel:");
// Picking: el artefacto está dos grupos adentro
r("const cand = [...mallas, ...sanMallas].filter(m => m.visible && (!m.parent || m.parent.visible));",
  "const cand = [...mallas, ...sanMallas].filter(m => { for (let o = m; o; o = o.parent) if (!o.visible) return false; return true; });");
// Textos
r("    extra = `<div class=\"comparar\"><span>Ubicado por el rótulo del plano sanitario; la orientación es aproximada (el plano no trae los bloques de artefactos).</span></div>`;",
  "    extra = `<div class=\"comparar\"><span>${a.fuente === 'arquitectura' ? 'Posición y orientación tomadas de la planta de arquitectura.' : 'Ubicado por el rótulo del plano sanitario; la orientación es aproximada.'}</span></div>`;");
r("    <li>Artefactos: se ubican con los rótulos del plano (INODORO, BIDET, BACHA, DUCHA, PC…) sobre la descarga compatible más cercana; la orientación es aproximada.</li>",
  "    <li>Artefactos: posición y orientación de las plantas de arquitectura (PB, tipo 1°–3° y 4°), calibradas con las medianeras y el tabique C14; caen a 2–13 cm de su descarga del plano sanitario. En el 5° se ubican por los rótulos del plano sanitario.</li>");
fs.writeFileSync('tablero.template.html', t); console.log('ok');
