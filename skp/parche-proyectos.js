const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 90)); t = t.replace(a, b); };
// Varios proyectos en el mismo tablero: cada uno trae su estructura y, si los tiene, sanitaria y albañilería.
r(`const D = /*DATOS*/null;
const SAN = /*SAN*/null;
const ALB = /*ALB*/null;`,
`// ---------- Proyectos ----------
// El tablero trae varios edificios. El elegido se recuerda en este navegador y cambiar de proyecto recarga la página,
// porque toda la escena se arma una sola vez al abrir. Cada proyecto guarda su avance y sus ediciones por separado.
const PROYECTOS = /*PROYECTOS*/[];
const PROY = (() => {
  let id = null; try { id = localStorage.getItem('tablero.proyecto'); } catch (e) {}
  return PROYECTOS.find(p => p.id === id) || PROYECTOS[0];
})();
const D = PROY.datos;
// Un proyecto sin instalación o sin muros cargados funciona igual, con esas secciones vacías.
const SAN = PROY.san || { tramos: [], pases: [], pasesSinUso: [], cruces: [], notas: [], avisos: [], pasesIng: [], artefactos: [], piezas: [], uniones: [], pisos: [],
  sistemas: { primaria: 'Cloacal primaria', secundaria: 'Cloacal secundaria', pluvial: 'Pluvial', ventilacion: 'Ventilación', extraccion: 'Extracción baños', aire: 'Desagüe aire acond.' } };
const ALB = PROY.alb || { muros: [], avisos: [] };`);
r(`      <h1>Argerich 2984</h1>
      <p>Estructura de H°A · PB + 4 pisos + sala de máquinas · modelo <span id="fuente"></span></p>`,
`      <div class="proy-sel"><h1 id="proyNombre"></h1><select id="proyecto" class="campo" aria-label="Cambiar de proyecto"></select></div>
      <p><span id="proyDesc"></span> · modelo <span id="fuente"></span></p>`);
r(`$('#fuente').textContent = D.proyecto.fuente;`,
`$('#fuente').textContent = D.proyecto.fuente;
$('#proyNombre').textContent = PROY.nombre; $('#proyDesc').textContent = PROY.descripcion; document.title = 'Modelo ' + PROY.nombre;
{ const s = $('#proyecto'); s.innerHTML = PROYECTOS.map(p => \`<option value="\${p.id}"\${p === PROY ? ' selected' : ''}>\${esc(p.nombre)}</option>\`).join('');
  s.hidden = PROYECTOS.length < 2;
  s.addEventListener('change', () => { try { localStorage.setItem('tablero.proyecto', s.value); location.reload(); } catch (e) { alert('Este navegador no deja guardar el proyecto elegido.'); } }); }`);
r(`const guardar = (k, v) => { try { localStorage.setItem('arg2984.' + k, JSON.stringify(v)); } catch (e) {} };
const leer = (k, def) => { try { const v = localStorage.getItem('arg2984.' + k); return v ? JSON.parse(v) : def; } catch (e) { return def; } };`,
`const PREF = (PROY.clave || PROY.id) + '.';
const guardar = (k, v) => { try { localStorage.setItem(PREF + k, JSON.stringify(v)); } catch (e) {} };
const leer = (k, def) => { try { const v = localStorage.getItem(PREF + k); return v ? JSON.parse(v) : def; } catch (e) { return def; } };`);
// origen del dibujo: el centro de la planta del edificio (o el fijado en el proyecto) y la grilla en la fundación
r(`grilla.position.y = -2.53; escena.add(grilla);`, `grilla.position.y = Math.min(...NIV.map(n => n.z)); escena.add(grilla);`);
r(`const OX = 14.2, OY = 32.4;`,
`const [OX, OY] = PROY.origen || (() => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const e of EL) for (let i = 0; i < e.v.length; i += 3) { const x = e.v[i] / 100, y = e.v[i + 1] / 100; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return [(x0 + x1) / 2, (y0 + y1) / 2]; })();`);
r(`.obra-id h1 {`, `.proy-sel { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.proy-sel select { font-size: 13px; padding: 3px 6px; }
.obra-id h1 {`);
fs.writeFileSync('tablero.template.html', t); console.log('ok');
