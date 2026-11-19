const fs = require('fs');
let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 80)); t = t.split(a).join(b); };

// Bloque de instalación nuevo
const i0 = t.indexOf('// ---------- Instalación sanitaria (cloacal y pluvial) ----------');
const i1 = t.indexOf('// ---------- Arranque ----------');
if (i0 < 0 || i1 < 0) throw new Error('marcas del bloque');
t = t.slice(0, i0) + fs.readFileSync('bloque-san2.js', 'utf8') + '\n' + t.slice(i1);

// Colores pedidos: pluvial amarillo, secundaria naranja amarronado; la ventilación pasa a azul para no confundirse.
r('--i-primaria: #e34948; --i-secundaria: #eda100; --i-pluvial: #2a78d6; --i-ventilacion: #008300; --i-extraccion: #008300; --i-aire: #8a96a3;',
  '--i-primaria: #e34948; --i-secundaria: #94552a; --i-pluvial: #eda100; --i-ventilacion: #2a78d6; --i-extraccion: #2a78d6; --i-aire: #8a96a3;');
r('--i-primaria: #cf3f52; --i-secundaria: #c98500; --i-pluvial: #3987e5; --i-ventilacion: #008300; --i-extraccion: #008300; --i-aire: #6b7785;',
  '--i-primaria: #e34948; --i-secundaria: #9a5b2c; --i-pluvial: #c98500; --i-ventilacion: #3987e5; --i-extraccion: #3987e5; --i-aire: #6b7785;');

// Etiquetas flotantes
r('#tip { position: absolute;', `.etiquetas { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.etq-bajada { position: absolute; left: 0; top: 0; padding: 2px 7px; border-radius: 999px; font: 600 11.5px var(--f-mono); white-space: nowrap;
  background: var(--raised); color: var(--fg); border: 2px solid var(--c); box-shadow: 0 1px 2px rgb(0 0 0 / .15); pointer-events: auto; cursor: default; }
#tip { position: absolute;`);
r('ctrl.update(); renderer.render(escena, camara); requestAnimationFrame(loop);', 'ctrl.update(); renderer.render(escena, camara); if (window.__etq) window.__etq(); requestAnimationFrame(loop);');

// Picking: no tomar piezas de un grupo oculto
r('const cand = [...mallas, ...sanMallas].filter(m => m.visible);', 'const cand = [...mallas, ...sanMallas].filter(m => m.visible && (!m.parent || m.parent.visible));');

// Modo instalación: losas más presentes para que se lean los agujeros
r(`mat.opacity = modo === 'instalacion' ? (VIGAS_CRUZADAS.has(e.id) ? 0.45 : e.t === 'losa' ? 0.05 : 0.09)`, `mat.opacity = modo === 'instalacion' ? (VIGAS_CRUZADAS.has(e.id) ? 0.45 : e.t === 'losa' ? 0.28 : 0.08)`);
r(`[...SIS_ORDEN.filter(s => s !== 'extraccion').map(s => [css('--i-' + s), SAN.sistemas[s]]), [css('--ok'), 'Pase OK'], [css('--crit'), 'Falta pase / cruce con viga']]`,
  `[...SIS_ORDEN.filter(s => s !== 'extraccion').map(s => [css('--i-' + s), s === 'ventilacion' ? 'Ventilación y extractores' : SAN.sistemas[s]]), [css('--crit'), 'Falta pase / cruce con viga']]`);
fs.writeFileSync('tablero.template.html', t);
console.log('ok');
