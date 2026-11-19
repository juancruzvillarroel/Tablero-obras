const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 80)); t = t.replace(a, b); };

// --- CSS: la leyenda de modos baja a la izquierda; panel de capas arriba a la derecha; chips ocultos ---
r('.leyenda { top: 12px; right: 12px; padding: 8px 10px; display: grid; gap: 4px; font-size: 12px; max-width: 200px; }',
  `.leyenda { left: max(12px, env(safe-area-inset-left, 0px)); bottom: 12px; padding: 6px 10px; display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 12px; max-width: calc(100% - 170px); }
.leyenda[hidden] { display: none; }
.capas { top: 12px; right: 12px; width: 250px; max-height: calc(100% - 70px); overflow-y: auto; padding: 6px 8px 8px; font-size: 12.5px; }
.capas-cab { display: flex; justify-content: space-between; align-items: center; padding: 2px 2px 6px; }
.capas-cab b { font: 600 11px var(--f-body); text-transform: uppercase; letter-spacing: .07em; color: var(--muted); }
.capas-cab button { border: 0; background: none; color: var(--accent); font-size: 11.5px; cursor: pointer; padding: 0; }
.capa-grupo + .capa-grupo { border-top: 1px solid var(--line2); margin-top: 4px; padding-top: 4px; }
.capa-gcab { display: flex; align-items: center; gap: 2px; font-weight: 600; }
.capa-gcab label, .capa label { display: flex; align-items: center; gap: 6px; cursor: pointer; flex: 1; min-width: 0; }
.capa-gcab .pliegue { border: 0; background: none; width: 18px; cursor: pointer; color: var(--muted); padding: 0; }
.capa { display: flex; align-items: center; gap: 6px; padding: 2px 0 2px 20px; }
.capa span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.capa .muestra { width: 26px; height: 16px; border-radius: 4px; border: 1px solid var(--line); cursor: pointer; flex: none; padding: 0; }
.capa-editor { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; padding: 4px 0 6px 40px; font-size: 12px; color: var(--fg2); }
.capa-editor[hidden] { display: none; }
.capa-editor label { display: flex; align-items: center; gap: 4px; }
.capa-editor input[type=color] { width: 30px; height: 20px; padding: 0; border: 1px solid var(--line); border-radius: 4px; background: none; }
.capa-editor select { font-size: 12px; padding: 2px 4px; border: 1px solid var(--line); border-radius: 4px; background: var(--raised); }
.capa-editor .btn { padding: 2px 8px; font-size: 11.5px; }`);
r('.tipos { left: max(12px, env(safe-area-inset-left, 0px)); bottom: 12px;', '.tipos { display: none !important; left: max(12px, env(safe-area-inset-left, 0px)); bottom: 12px;');
r('  .leyenda { display: none; }', '  .capas { width: 210px; max-height: calc(100% - 120px); }');

// --- HTML: panel de capas ---
r('<div class="flota leyenda" id="leyenda" aria-label="Referencias de color"></div>',
  '<div class="flota leyenda" id="leyenda" aria-label="Referencias de color" hidden></div>\n    <div class="flota capas" id="capas" aria-label="Capas del modelo"></div>');

// --- Texturas antes de armar la estructura (uvMundo se usa al construir) ---
r('const bordeMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16 });',
  fs.readFileSync('bloque-texturas.js', 'utf8').replace("url(${LIENZOS[c.tex].toDataURL()})", "url(${urlTex(c.tex)})") +
  "\nconst URL_TEX = {}; const urlTex = k => URL_TEX[k] ||= LIENZOS[k].toDataURL();\n" +
  'const bordeMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16 });');
r("const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.computeVertexNormals();",
  "const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.computeVertexNormals(); uvMundo(g);");
r('  e.malla.geometry.dispose(); e.malla.geometry = geo;', '  e.malla.geometry.dispose(); e.malla.geometry = uvMundo(geo);');
r('  const geo = merge(gs), mesh = new THREE.Mesh(geo, mM(m.tipo));', '  const geo = uvMundo(merge(gs)), mesh = new THREE.Mesh(geo, mM(m.tipo));');

// --- Modo "Capas" (antes "Tipo"): textura y color de la capa; los otros modos tiñen sobre la textura ---
r("for (const [k, n] of [['tipo', 'Tipo'],", "for (const [k, n] of [['tipo', 'Capas'],");
r('    mat.color.set(col(e));', `    if (modo === 'tipo') vestir(mat, e.t);
    else { const c = capaEstado[e.t], mapa = modo !== 'instalacion' && c && c.tex && c.tex !== 'liso' ? TEX[c.tex] : null; if (mat.map !== mapa) { mat.map = mapa; mat.needsUpdate = true; } mat.color.set(col(e)); }`);
r("  if (modo === 'tipo') items = TIPOS.filter(t => EL.some(e => e.t === t[0])).map(t => [css('--s-' + t[0]), t[1]]);\n  else if",
  "  $('#leyenda').hidden = modo === 'tipo';\n  if (modo === 'tipo') return;\n  if");
r("  $('#leyenda').innerHTML = items.map(([c, n]) => `<div><span class=\"sw\" style=\"background:${c}\"></span>${esc(n)}</div>`).join('');",
  "  $('#leyenda').innerHTML = items.map(([c, n]) => `<div style=\"display:flex;align-items:center;gap:6px\"><span class=\"sw\" style=\"background:${c}\"></span>${esc(n)}</div>`).join('');");

// --- Muros: capa por tipo, textura de ladrillo ---
r('    mesh.visible = albOn.muros && visibleNivel(s.nivel);', '    mesh.visible = capaOn(s.o.tipo) && visibleNivel(s.nivel);');
r('    if (!sel && !hov) { mesh.material.opacity = inst ? 0.12 : 0.92; mesh.material.depthWrite = !inst; }',
  '    if (!sel && !hov) { vestir(mesh.material, s.o.tipo, !inst); mesh.material.opacity = inst ? 0.12 : 1; mesh.material.depthWrite = !inst; }');

// --- Panel de capas al arrancar ---
r('// ---------- Arranque ----------', fs.readFileSync('bloque-capas.js', 'utf8') + '\n// ---------- Arranque ----------');
r('armarElementos(); armarComputo(); armarSanitaria();', 'armarElementos(); armarComputo(); armarSanitaria(); armarCapas(); aplicarCapas();');
fs.writeFileSync('tablero.template.html', t); console.log('ok');
