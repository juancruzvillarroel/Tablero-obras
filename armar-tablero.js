// Arma el HTML del tablero con todos los proyectos de proyectos.json (o el que se pase como 2° argumento).
// uso: node armar-tablero.js [salida.html] [proyectos.json]
// Archivos de cada obra: se miran en la carpeta del proyecto (raiz) al armar el tablero, para mostrar su última
// modificación y avisar si cambiaron después de cargarlos. Al HTML va solo la ruta dentro de la carpeta de la obra.
const fs = require('fs'), path = require('path');
const raiz = __dirname, salida = process.argv[2] || 'argerich-estructura.html', lista = process.argv[3] || 'proyectos.json';
const leer = f => f ? JSON.parse(fs.readFileSync(path.join(raiz, f), 'utf8')) : null;
function archivo(p, a) {
  const ruta = p.raiz ? path.join(p.raiz, a.ruta) : null, out = { rol: a.rol, nombre: path.basename(a.ruta), leido: a.leido, carpeta: path.dirname(a.ruta).split(path.sep).join(' / ').split('/').map(s => s.trim()).filter(Boolean).join(' / '), cargado: a.cargado };
  let st = null; try { st = ruta && fs.statSync(ruta); } catch (e) {}
  if (!st) {
    out.estado = 'falta';
    // OneDrive deja copias con el nombre de la PC cuando hay conflicto: se avisa si aparece alguna
    try { const dir = path.dirname(ruta), b = path.parse(ruta).name; out.parecidos = fs.readdirSync(dir).filter(f => f !== path.basename(ruta) && f.startsWith(b) && path.extname(f) === path.extname(ruta)).map(f => ({ nombre: f, modificado: fs.statSync(path.join(dir, f)).mtime.toISOString() })); } catch (e) {}
    return out;
  }
  out.modificado = st.mtime.toISOString();
  // Agregado desde el menú pero sin un proceso que lo lea todavía: figura en la lista, sin datos en el modelo
  if (a.pendiente) { out.estado = 'pendiente'; return out; }
  const mismo = a.tam != null && st.size === a.tam, despues = st.mtime > new Date(new Date(a.cargado).getTime() + 2 * 60e3);
  out.estado = despues && !mismo ? 'cambio' : 'al dia';
  return out;
}
function estadoArchivos(p) { return (p.archivos || []).map((a, i) => ({ ...archivo(p, a), indice: i })); }
module.exports = { estadoArchivos };
if (require.main !== module) return;
const proyectos = (process.argv[3] ? leer(lista) : require('./obras.js').leerObras()).map(p => {
  const { raiz: _r, archivos = [], ...resto } = p;
  return { ...resto, archivos: estadoArchivos(p), datos: leer(p.datos), san: leer(p.san), alb: leer(p.alb) };
});
const B = String.fromCharCode(92), esc = s => s.split('</').join('<' + B + '/');
const t = fs.readFileSync(path.join(raiz, 'skp/tablero.template.html'), 'utf8');
const armado = new Date().toISOString();
const pagina = t.replace('/*PROYECTOS*/[]', () => esc(JSON.stringify(proyectos))).replace('/*ARMADO*/null', () => JSON.stringify(armado));
fs.writeFileSync(path.join(raiz, salida), pagina);
// docs/index.html: la misma página como documento completo, para GitHub Pages (la publica tal cual, sin compilar)
fs.mkdirSync(path.join(raiz, 'docs'), { recursive: true });
fs.writeFileSync(path.join(raiz, 'docs', 'index.html'), '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui,sans-serif}[hidden]{display:none!important}img{max-width:100%}</style></head><body>' + pagina + '</body></html>');
fs.writeFileSync(path.join(raiz, 'docs', '.nojekyll'), '');
console.log('proyectos:', proyectos.map(p => p.nombre + ' (' + p.archivos.map(a => a.nombre + ': ' + a.estado).join(', ') + ')').join(' | '), '→', salida);
