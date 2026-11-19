const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 90)); t = t.split(a).join(b); };
// --- Sin barra de color: el modelo se pinta por capas; lo que se quiera ver se elige apagando capas.
r(`    <div class="flota modo"><span>Color</span><div class="seg" role="group" aria-label="Colorear el modelo por" id="modos"></div></div>
`, ``);
r(`.modo { top: 12px; left: max(12px, env(safe-area-inset-left, 0px)); display: flex; align-items: center; gap: 6px; padding-left: 10px; max-width: calc(100% - 290px); overflow-x: auto; scrollbar-width: none; }
.modo .seg { flex: none; }
.modo > span { font-size: 12px; color: var(--muted); }`, ``);
t = t.replace(/\/\* La barra de color no se mete debajo[^\n]*\n/, '');
r(`const modosDiv = $('#modos');
for (const [k, n] of [['tipo', 'Capas'], ['nivel', 'Nivel'], ['avance', 'Avance'], ['instalacion', 'Instalación']]) {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = n; b.dataset.k = k; b.setAttribute('aria-pressed', k === modo);
  b.onclick = () => { modo = k; modosDiv.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x.dataset.k === k)); pintar(); };
  modosDiv.append(b);
}`, `// Ya no hay botones de color: el modelo va siempre por capas, salvo mientras está abierta la pestaña Avance,
// donde lo pendiente se ve transparente.
const ponerModo = k => { if (modo === k) return; modo = k; pintar(); };`);
r(`  if (k === 'avance' && modo !== 'avance') modosDiv.querySelector('[data-k="avance"]').click();`, `  ponerModo(k === 'avance' ? 'avance' : 'tipo');`);
r(`  if (k === 'albanileria') { refrescarAlbanileria(); if (modo === 'instalacion' || modo === 'avance') modosDiv.querySelector('[data-k="tipo"]').click(); }
  if (k === 'sanitaria' && modo !== 'instalacion') modosDiv.querySelector('[data-k="instalacion"]').click();`, `  if (k === 'albanileria') refrescarAlbanileria();`);
// --- Niveles y capas juntos, en una columna a la izquierda
r(`    <div class="flota capas" id="capas" aria-label="Capas del modelo"></div>
    <nav class="flota corte" aria-label="Niveles">
      <h3>Niveles <button id="verTodo" type="button">Ver todo</button></h3>
      <div id="niveles" style="display:grid;gap:2px"></div>
      <label class="alcance"><input type="checkbox" id="hastaAca"> Mostrar también los de abajo</label>
    </nav>`, `    <div class="columna-izq">
      <nav class="flota corte" aria-label="Niveles">
        <h3>Niveles <button id="verTodo" type="button">Ver todo</button></h3>
        <div id="niveles" style="display:grid;gap:2px"></div>
        <label class="alcance"><input type="checkbox" id="hastaAca"> Mostrar también los de abajo</label>
      </nav>
      <div class="flota capas" id="capas" aria-label="Capas del modelo"></div>
    </div>`);
r(`.capas { top: 12px; right: 12px; width: 250px; max-height: calc(100% - 70px); overflow-y: auto; padding: 6px 8px 8px; font-size: 12.5px; }`,
  `/* Columna izquierda: niveles arriba y capas abajo; si no entra, se desplazan las capas. */
.columna-izq { position: absolute; top: 12px; left: max(12px, env(safe-area-inset-left, 0px)); bottom: 60px; width: 230px; display: flex; flex-direction: column; gap: 8px; pointer-events: none; z-index: 2; }
.columna-izq > .flota { position: static; pointer-events: auto; }
.capas { flex: 0 1 auto; min-height: 0; overflow-y: auto; padding: 6px 8px 8px; font-size: 12.5px; }`);
r(`.corte { left: max(12px, env(safe-area-inset-left, 0px)); top: 58px; padding: 6px; display: grid; gap: 2px; width: 168px; }`, `.corte { flex: none; padding: 6px; display: grid; gap: 2px; }`);
r(`  .corte { width: 132px; top: 56px; }`, `  .columna-izq { width: 190px; }`);
r(`  .capas { width: 210px; max-height: calc(100% - 120px); }`, ``);
r(`.barra-corte { left: 50%; transform: translateX(-50%); top: 56px;`, `.barra-corte { left: 50%; transform: translateX(-50%); top: 12px;`);
r(`.barra-lapiz { left: 50%; transform: translateX(-50%); top: 56px;`, `.barra-lapiz { left: 50%; transform: translateX(-50%); top: 12px;`);
r(`.leyenda { left: max(12px, env(safe-area-inset-left, 0px)); bottom: 12px;`, `.leyenda { left: max(12px, env(safe-area-inset-left, 0px)); bottom: 12px; z-index: 3;`);
// --- Tildes en negro (en modo oscuro, claros)
r(`:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`, `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
input[type=checkbox] { accent-color: var(--ink); }`);
r(`label.hecho input { width: 16px; height: 16px; accent-color: var(--ok); }`, `label.hecho input { width: 16px; height: 16px; accent-color: var(--ink); }`);
fs.writeFileSync('tablero.template.html', t); console.log('ok');
