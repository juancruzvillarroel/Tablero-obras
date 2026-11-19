const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 90)); t = t.replace(a, b); };
r('// --- Pases: agujeros reales en la losa', fs.readFileSync('bloque-lapiz.js', 'utf8') + '\n// --- Pases: agujeros reales en la losa');
// los muros nuevos guardan sus cambios en su propia lista
r(`function guardarEdicion(m) {`, `function guardarEdicion(m) {
  if (m.nuevo) { guardarNuevos(); return; }`);
// ficha: los muros nuevos se pueden eliminar
r("${editado(m) ? `<span class=\"dif\">", "${m.nuevo ? `<span class=\"dif\">Muro agregado en el tablero (no está en el CAD).</span><button type=\"button\" class=\"btn\" data-eliminar-muro=\"${m.id}\" style=\"justify-self:start;margin-top:4px\">Eliminar muro</button>` : ''}${editado(m) && !m.nuevo ? `<span class=\"dif\">");
// estilos
r('/* Elementos por rubro y nivel */', `.acciones3d button[aria-pressed="true"] { background: var(--accent); color: var(--accent-ink); }
.barra-lapiz { left: 50%; transform: translateX(-50%); top: 12px; display: flex; align-items: center; gap: 10px; padding: 6px 10px; font-size: 12.5px; }
.barra-lapiz select { font-size: 12.5px; padding: 3px 6px; border: 1px solid var(--line); border-radius: 6px; background: var(--raised); }
.barra-lapiz span { color: var(--fg2); }
/* Elementos por rubro y nivel */`);
fs.writeFileSync('tablero.template.html', t); console.log('ok');
