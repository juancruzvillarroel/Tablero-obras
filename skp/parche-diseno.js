const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 90)); t = t.split(a).join(b); };
const logo = 'data:image/png;base64,' + fs.readFileSync('logo-jes.png').toString('base64');

// ---------- Sin encofrado: no se usa en el estudio ----------
r(`['Hormigón', fmt(s.vol, 1), 'm³'], ['Encofrado', fmt(s.enc, 0), 'm²'], `, `['Hormigón', fmt(s.vol, 1), 'm³'], `);
r(`['Hormigón', fmt(e.vol, 3) + ' m³', true], ['Encofrado', fmt(e.enc) + ' m²', true], `, `['Hormigón', fmt(e.vol, 3) + ' m³', true], `);
r(` Encofrado: caras laterales y fondos, aproximado.</span>`, `</span>`);
r(`
      <label>Encofrado $/m² <input id="pE" class="inline-num" style="width:100px" type="number" min="0" step="any" value="\${precios.encofrado}" placeholder="—"></label>`, ``);
r(`[['pH', 'hormigon'], ['pE', 'encofrado'], ['pA', 'acero']]`, `[['pH', 'hormigon'], ['pA', 'acero']]`);
r(`const pr = { hormigon: +precios.hormigon || 0, encofrado: +precios.encofrado || 0, acero: +precios.acero || 0 };
  const hayPrecio = pr.hormigon || pr.encofrado || pr.acero;`, `const pr = { hormigon: +precios.hormigon || 0, acero: +precios.acero || 0 };
  const hayPrecio = pr.hormigon || pr.acero;`);
r(`const vTot = l.reduce((a, e) => a + e.vol, 0), eTot = l.reduce((a, e) => a + e.enc, 0);`, `const vTot = l.reduce((a, e) => a + e.vol, 0);`);
r(`  h += \`<tr class="grupo"><td colspan="5">Encofrado</td></tr>\`;
  presentes.forEach(t => { const v = suma(t[0], e => e.enc); h += \`<tr><td>\${t[1]}</td><td class="r num">\${fmt(v, 1)}</td><td>m²</td><td></td>\${sub(v, pr.encofrado)}</tr>\`; });
`, ``);
r(`\${fmt(vTot, 1)} m³ · \${fmt(eTot, 0)} m² · \${fmt(aTot / 1000, 2)} t`, `\${fmt(vTot, 1)} m³ · \${fmt(aTot / 1000, 2)} t`);

// ---------- Tipografía y paleta más sobrias ----------
r(`family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Condensed:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap`,
  `family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap`);
r(`  --bg: #eef1f5; --surface: #fbfcfd; --raised: #ffffff; --fg: #141c26; --fg2: #4a5866; --muted: #6f7d8b; --line: #d6dde5; --line2: #e7ecf1;
  --accent: #1f5fc4; --accent-ink: #ffffff; --canvas: #e3e8ee; --hover: #f1f4f8;`,
  `  --bg: #f4f4f2; --surface: #fafaf9; --raised: #ffffff; --fg: #111111; --fg2: #4d4d4d; --muted: #8a8a87; --line: #e2e2df; --line2: #eeeeec;
  --accent: #2f6fdb; --accent-ink: #ffffff; --canvas: #ececea; --hover: #f1f1ef; --ink: #111111; --ink-fg: #ffffff;
  --vidrio: rgb(255 255 255 / .86);`);
r(`  --f-head: "IBM Plex Sans Condensed", "Arial Narrow", system-ui, sans-serif;
  --f-body: "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif;`,
  `  --f-head: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  --f-body: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;`);
const oscuroViejo = `  --bg: #11161c; --surface: #161c23; --raised: #1b222b; --fg: #e6ebf0; --fg2: #b4c0cc; --muted: #8796a5; --line: #2b3541; --line2: #222a34;
  --accent: #6aa0f0; --accent-ink: #0d1520; --canvas: #0e1318; --hover: #1f2731;`;
r(oscuroViejo, `  --bg: #0e0e0f; --surface: #131314; --raised: #19191a; --fg: #ececec; --fg2: #b3b3b3; --muted: #7d7d7d; --line: #29292b; --line2: #202022;
  --accent: #6b9cf0; --accent-ink: #0d1520; --canvas: #0b0b0c; --hover: #212123; --ink: #ececec; --ink-fg: #111111;
  --vidrio: rgb(25 25 26 / .86);`);

// ---------- Barra de obra: negra, con el selector de obras y el logo ----------
r(`.obra { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: 12px 28px; background: var(--raised); border-bottom: 1px solid var(--line);
  padding-block: 12px;`, `/* Siempre negra, en modo claro y oscuro: es la "tapa" del estudio, con el logo en blanco. */
.obra { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: 12px 32px; background: #000; color: #fff; position: relative; z-index: 20;
  padding-block: 14px;`);
r(`.obra-id { display: grid; gap: 2px; min-width: 0; }`, `.obra-id { display: grid; gap: 3px; min-width: 0; }`);
r(`.proy-sel { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.proy-sel select { width: auto; font-size: 13px; padding: 3px 6px; }
.obra-id h1 { margin: 0; font: 700 22px/1.1 var(--f-head); letter-spacing: .01em; }
.obra-id p { margin: 0; color: var(--muted); font-size: 12.5px; }
.kpis { display: flex; flex-wrap: wrap; gap: 8px 26px; margin-left: auto; }
.kpi { display: grid; gap: 1px; }
.kpi span { font-size: 11px; text-transform: uppercase; letter-spacing: .07em; color: var(--muted); }
.kpi b { font: 600 19px var(--f-mono); font-variant-numeric: tabular-nums; }
.kpi b small { font: 500 12px var(--f-body); color: var(--fg2); margin-left: 3px; }
.kpi .barrita { height: 4px; border-radius: 2px; background: var(--line); overflow: hidden; margin-top: 3px; }`,
`.proy-sel { position: relative; }
.obra-id h1 { margin: 0; font: 600 21px/1.15 var(--f-head); letter-spacing: -.01em; }
.proy-boton { all: unset; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; border-radius: 6px; }
.proy-boton:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
.proy-boton svg { width: 14px; height: 14px; opacity: .55; transition: transform .15s, opacity .15s; }
.proy-boton:hover svg { opacity: 1; }
.proy-boton[aria-expanded="true"] svg { transform: rotate(180deg); opacity: 1; }
.proy-menu { position: absolute; top: calc(100% + 10px); left: -8px; min-width: 260px; background: #111; border: 1px solid #2a2a2a; border-radius: 12px; padding: 6px; display: grid; gap: 2px; z-index: 40; box-shadow: 0 12px 32px rgb(0 0 0 / .35); }
.proy-menu[hidden] { display: none; }
.proy-menu button { all: unset; display: grid; grid-template-columns: 1fr auto; gap: 1px 12px; padding: 9px 10px; border-radius: 8px; cursor: pointer; color: #fff; }
.proy-menu button:hover, .proy-menu button:focus-visible { background: #222; }
.proy-menu b { font-weight: 600; font-size: 14px; }
.proy-menu small { grid-column: 1; color: #8a8a8a; font-size: 12px; }
.proy-menu .tilde { grid-row: 1 / span 2; grid-column: 2; align-self: center; color: #fff; font-size: 13px; }
.obra-id p { margin: 0; color: #8f8f8f; font-size: 12.5px; }
.kpis { display: flex; flex-wrap: wrap; gap: 8px 28px; margin-left: auto; }
.kpi { display: grid; gap: 2px; }
.kpi span { font-size: 10.5px; text-transform: uppercase; letter-spacing: .09em; color: #8a8a8a; }
.kpi b { font: 500 18px var(--f-mono); font-variant-numeric: tabular-nums; color: #fff; }
.kpi b small { font: 400 12px var(--f-body); color: #a8a8a8; margin-left: 3px; }
.kpi .barrita { height: 3px; border-radius: 2px; background: #333; overflow: hidden; margin-top: 3px; }
.obra .solo-visible, .kpi-filtro { color: #f5c04a; }
.logo { height: 36px; width: auto; display: block; filter: brightness(0) invert(1); padding-left: 28px; border-left: 1px solid #2a2a2a; }`);

// ---------- Paneles flotantes y controles: planos, sin sombras, en tinta ----------
r(`.flota { position: absolute; background: var(--raised); border: 1px solid var(--line); border-radius: 8px; box-shadow: 0 1px 2px rgb(0 0 0 / .06); }`,
  `.flota { position: absolute; background: var(--vidrio); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid var(--line); border-radius: 12px; }`);
r(`.seg button[aria-pressed="true"] { background: var(--accent); color: var(--accent-ink); }`, `.seg button[aria-pressed="true"] { background: var(--ink); color: var(--ink-fg); }`);
r(`.capas-cab b { font: 600 11px var(--f-body); text-transform: uppercase; letter-spacing: .07em; color: var(--muted); }
.capas-cab button { border: 0; background: none; color: var(--accent);`, `.capas-cab b { font: 600 10.5px var(--f-body); text-transform: uppercase; letter-spacing: .09em; color: var(--muted); }
.capas-cab button { border: 0; background: none; color: var(--fg2); text-decoration: underline; text-underline-offset: 2px;`);
r(`.corte h3 { margin: 2px 6px 4px; font: 600 11px var(--f-body); text-transform: uppercase; letter-spacing: .07em;`, `.corte h3 { margin: 2px 6px 4px; font: 600 10.5px var(--f-body); text-transform: uppercase; letter-spacing: .09em;`);
r(`.corte h3 button { border: 0; background: none; color: var(--accent);`, `.corte h3 button { border: 0; background: none; color: var(--fg2); text-decoration: underline; text-underline-offset: 2px;`);
r(`.nivel[aria-pressed="true"] { background: var(--accent); color: var(--accent-ink); }`, `.nivel[aria-pressed="true"] { background: var(--ink); color: var(--ink-fg); }`);
r(`.acciones3d button[aria-pressed="true"] { background: var(--accent); color: var(--accent-ink); }`, `.acciones3d button[aria-pressed="true"] { background: var(--ink); color: var(--ink-fg); }`);
r(`.btn.prim { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }`, `.btn.prim { background: var(--ink); color: var(--ink-fg); border-color: var(--ink); }`);
r(`.btn { border: 1px solid var(--line); background: var(--raised); border-radius: 6px;`, `.btn { border: 1px solid var(--line); background: var(--raised); border-radius: 8px;`);

// Pestañas y títulos de sección más livianos
r(`.pestanas { scrollbar-width: none; display: flex; border-bottom: 1px solid var(--line); background: var(--raised); padding-left: 8px;`,
  `.pestanas { scrollbar-width: none; display: flex; gap: 6px; border-bottom: 1px solid var(--line); background: var(--surface); padding-left: 12px;`);
r(`.pestanas button { border: 0; background: none; padding: 12px 5px 10px; cursor: pointer; font: 600 12.5px var(--f-head); letter-spacing: .02em;`,
  `.pestanas button { border: 0; background: none; padding: 13px 6px 11px; cursor: pointer; font: 500 12.5px var(--f-head); letter-spacing: 0;`);
r(`.pestanas button[aria-selected="true"] { color: var(--fg); border-bottom-color: var(--accent); }`, `.pestanas button[aria-selected="true"] { color: var(--fg); border-bottom-color: var(--fg); }`);
r(`h2 { margin: 0 0 10px; font: 600 12px var(--f-body); text-transform: uppercase; letter-spacing: .08em;`, `h2 { margin: 0 0 12px; font: 600 10.5px var(--f-body); text-transform: uppercase; letter-spacing: .1em;`);
r(`.cuerpo { overflow-y: auto; padding-block: 16px 28px; padding-left: 16px;`, `.cuerpo { overflow-y: auto; padding-block: 20px 32px; padding-left: 20px;`);
r(`.ficha { background: var(--raised); border: 1px solid var(--line); border-radius: 10px; padding: 14px;`, `.ficha { background: var(--raised); border: 1px solid var(--line); border-radius: 12px; padding: 16px;`);
r(`.ficha-cab h3 { margin: 0; font: 700 28px/1 var(--f-head); }`, `.ficha-cab h3 { margin: 0; font: 600 26px/1 var(--f-head); letter-spacing: -.02em; }`);
r(`.estado-sel button[aria-pressed="true"] { border-color: var(--fg); font-weight: 600; }`, `.estado-sel button[aria-pressed="true"] { border-color: var(--ink); background: var(--ink); color: var(--ink-fg); font-weight: 500; }`);
r(`.tabla-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 8px;`, `.tabla-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 12px;`);
r(`tbody tr.sel { background: var(--hover); box-shadow: inset 3px 0 0 var(--accent); }`, `tbody tr.sel { background: var(--hover); box-shadow: inset 2px 0 0 var(--ink); }`);
r(`tr.grupo td { background: var(--hover); font: 600 11.5px var(--f-body); text-transform: uppercase; letter-spacing: .06em;`, `tr.grupo td { background: var(--surface); font: 600 10.5px var(--f-body); text-transform: uppercase; letter-spacing: .09em;`);
r(`details.rubro { border: 1px solid var(--line); border-radius: 8px;`, `details.rubro { border: 1px solid var(--line); border-radius: 12px; overflow: hidden;`);
r(`details.rubro > summary b { flex: 1; font-family: var(--f-head); font-size: 14.5px; }`, `details.rubro > summary b { flex: 1; font-family: var(--f-head); font-size: 14px; font-weight: 600; }`);
r(`.nivel-cab { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; background: var(--hover);`, `.nivel-cab { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; background: var(--surface);`);
r(`.fila-graf:hover .etq { color: var(--accent); }`, `.fila-graf:hover .etq { color: var(--fg); font-weight: 600; }`);
r(`.avance-total .big { font: 600 30px var(--f-mono); }`, `.avance-total .big { font: 500 30px var(--f-mono); letter-spacing: -.02em; }`);
r(`#tip b { font-family: var(--f-head); font-size: 14px; margin-right: 6px; }`, `#tip b { font-family: var(--f-head); font-size: 13.5px; font-weight: 600; margin-right: 6px; }`);
r(`  .kpis { margin-left: 0; }`, `  .kpis { margin-left: 0; order: 3; width: 100%; gap: 8px 22px; }
  .logo { order: 2; margin-left: auto; height: 30px; padding-left: 0; border-left: 0; }`);

// ---------- Marcado de la barra ----------
r(`      <div class="proy-sel"><h1 id="proyNombre"></h1><select id="proyecto" class="campo" aria-label="Cambiar de proyecto"></select></div>`,
  `      <div class="proy-sel"><h1><button type="button" class="proy-boton" id="proyBoton" aria-haspopup="true" aria-expanded="false"><span id="proyNombre"></span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 6l4.5 4.5L12.5 6"/></svg></button></h1>
        <div class="proy-menu" id="proyMenu" role="menu" aria-label="Obras" hidden></div></div>`);
r(`    <div class="kpis" id="kpis"></div>
  </header>`, `    <div class="kpis" id="kpis"></div>
    <img class="logo" src="${logo}" alt="JES &amp; arqs">
  </header>`);

// ---------- Menú de obras (reemplaza al select) ----------
r(`{ const s = $('#proyecto'); s.innerHTML = PROYECTOS.map(p => \`<option value="\${p.id}"\${p === PROY ? ' selected' : ''}>\${esc(p.nombre)}</option>\`).join('');
  s.hidden = PROYECTOS.length < 2;
  s.addEventListener('change', () => { try { localStorage.setItem('tablero.proyecto', s.value); location.reload(); } catch (e) { alert('Este navegador no deja guardar el proyecto elegido.'); } }); }`,
`// Cambiar de obra: la flecha junto al nombre abre la lista. Se cierra con Esc o tocando afuera.
{ const b = $('#proyBoton'), m = $('#proyMenu');
  m.innerHTML = PROYECTOS.map(p => \`<button type="button" role="menuitem" data-proy="\${p.id}"><b>\${esc(p.nombre)}</b><small>\${esc(p.descripcion || '')}</small>\${p === PROY ? '<span class="tilde" aria-label="Obra abierta">✓</span>' : ''}</button>\`).join('');
  const abrirMenu = si => { m.hidden = !si; b.setAttribute('aria-expanded', si); if (si) m.querySelector('button')?.focus(); };
  b.onclick = ev => { ev.stopPropagation(); abrirMenu(m.hidden); };
  m.onclick = ev => { const it = ev.target.closest('[data-proy]'); if (!it) return; abrirMenu(false);
    if (it.dataset.proy === PROY.id) return;
    try { localStorage.setItem('tablero.proyecto', it.dataset.proy); location.reload(); } catch (e) { alert('Este navegador no deja guardar la obra elegida.'); } };
  m.onkeydown = ev => { const its = [...m.querySelectorAll('button')], i = its.indexOf(document.activeElement);
    if (ev.key === 'Escape') { abrirMenu(false); b.focus(); }
    else if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); its[(i + (ev.key === 'ArrowDown' ? 1 : -1) + its.length) % its.length].focus(); } };
  document.addEventListener('pointerdown', ev => { if (!m.hidden && !ev.target.closest('.proy-sel')) abrirMenu(false); }); }`);

fs.writeFileSync('tablero.template.html', t); console.log('ok');
