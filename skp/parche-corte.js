const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 90)); t = t.replace(a, b); };
r(`const firmaVis = () => JSON.stringify([nivelSel, hastaAca, tiposOn, albOn, sanOn, Object.entries(capaEstado).map(([k, c]) => k + c.on)]);`,
  fs.readFileSync('bloque-corte.js', 'utf8') + `\nconst firmaVis = () => JSON.stringify([nivelSel, hastaAca, tiposOn, albOn, sanOn, Object.entries(capaEstado).map(([k, c]) => k + c.on), corte && corte.z]);`);
// dibujo
r(`ctrl.update(); renderer.render(escena, camara); if (window.__etq)`, `ctrl.update(); if (window.__dibujar) window.__dibujar(); else renderer.render(escena, camara); if (window.__etq)`);
// lo que queda arriba del plano no se puede tocar
r(`  const hits = ray.intersectObjects(cand, false);`, `  const hits = ray.intersectObjects(cand, false).filter(h => typeof corte === 'undefined' || !corte || h.point.y <= corte.z + 0.002);`);
r(`  const hit = ray2.intersectObjects(cand, false)[0];`, `  const hit = ray2.intersectObjects(cand, false).find(h => !corte || h.point.y <= corte.z + 0.002);`);
// cómputos
r(`const cuentaEl = e => !!tiposOn[e.t] && visibleNivel(e.l);
const cuentaMuro = m => albOn.muros && capaOn(m.tipo) && visibleNivel(PISO_MURO[m.piso]);
const cuentaSan = s => (s.k === 'tramo' ? sanOn[s.o.sis] : s.k === 'artefacto' ? sanOn.artefactos : true) && visibleNivel(s.nivel);`,
`const cuentaEl = e => !!tiposOn[e.t] && visibleNivel(e.l) && fEl(e) > 0;
const cuentaMuro = m => albOn.muros && capaOn(m.tipo) && visibleNivel(PISO_MURO[m.piso]) && fMuro(m) > 0;
const cuentaSan = s => (s.k === 'tramo' ? sanOn[s.o.sis] : s.k === 'artefacto' ? sanOn.artefactos : true) && visibleNivel(s.nivel) && fSan(s) > 0;`);
r(`const hayOculto = () => nivelSel != null ||`, `const hayOculto = () => !!corte || nivelSel != null ||`);
r(`  const V = EL.filter(cuentaEl), s = sumas(V), a = avance(V);`, `  const V = EL.filter(cuentaEl).map(enCorte), s = sumas(V), a = avance(V);`);
r("${fmt(ALB.muros.filter(cuentaMuro).reduce((a, m) => a + m.sup, 0), 0)}", "${fmt(ALB.muros.filter(cuentaMuro).map(enCorteMuro).reduce((a, m) => a + m.sup, 0), 0)}");
r(`    const l = EL.filter(e => e.l === n.id && tiposOn[e.t]); const por = {};`, `    const l = EL.filter(e => e.l === n.id && tiposOn[e.t] && fEl(e) > 0).map(enCorte); const por = {};`);
r(`  const l = EL.filter(cuentaEl);
  const apagados =`, `  const l = EL.filter(cuentaEl).map(enCorte);
  const apagados =`);
r(`+ (apagados.length ? ' · sin ' + apagados.join(', ') : '');`, `+ (apagados.length ? ' · sin ' + apagados.join(', ') : '') + (corte ? \` · bajo el corte a \${fmt(corte.z, 2)} m\` : '');`);
r(`  const M = ALB.muros.filter(cuentaMuro);`, `  const M = ALB.muros.filter(cuentaMuro).map(enCorteMuro);`);
r("Object.values(SANP).filter(s => s.k === 'tramo' && cuentaSan(s)).map(s => s.o).forEach(t => { const k = t.sis + '|' + Math.round(t.d * 1000); met[k] = (met[k] || 0) + t.largo; });",
  "Object.values(SANP).filter(s => s.k === 'tramo' && cuentaSan(s)).forEach(s => { const t = s.o, k = t.sis + '|' + Math.round(t.d * 1000); met[k] = (met[k] || 0) + t.largo * fSan(s); });");
r(`  const todos = itemsObra().filter(i => i.cant > 0 && seCuenta(i.id));`, `  const todos = itemsObra().filter(i => i.cant > 0 && seCuenta(i.id)).map(i => ({ ...i, cant: i.cant * factorId(i.id) }));`);
// estilos
r(`.proy-sel {`, `.barra-corte { left: 50%; transform: translateX(-50%); top: 12px; display: flex; align-items: center; gap: 8px; padding: 6px 10px; font-size: 12.5px; z-index: 6; flex-wrap: wrap; max-width: calc(100% - 24px); }
.barra-corte input[type=range] { width: 160px; accent-color: var(--accent); }
.barra-corte .btn { padding: 3px 8px; }
.menu-ctx { z-index: 30; display: grid; padding: 4px; min-width: 200px; }
.menu-ctx button { border: 0; background: none; text-align: left; padding: 7px 10px; border-radius: 6px; font-size: 13px; cursor: pointer; color: var(--fg); }
.menu-ctx button:hover, .menu-ctx button:focus-visible { background: var(--hover); outline: none; }
.proy-sel {`);
fs.writeFileSync('tablero.template.html', t); console.log('ok');
