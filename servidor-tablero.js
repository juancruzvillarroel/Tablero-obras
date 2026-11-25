// Servidor local del tablero (http://localhost:5180). Sin dependencias.
// Además de servir el HTML, deja actualizar los archivos de cada obra desde el menú Archivos:
//   GET  /api/archivos            estado de los archivos de cada obra, revisado en el momento
//   POST /api/actualizar          { proyecto, indice }: vuelve a cargar ese archivo (actualizar.js), de a uno por vez
//   GET  /api/estado              progreso de la actualización en curso o el resultado de la última
//   GET  /api/carpeta?proyecto=   archivos de la carpeta de la obra que se pueden agregar
//   POST /api/quitar              { proyecto, indice }: saca el archivo de la obra (no lo borra de OneDrive)
//   POST /api/agregar             { proyecto, ruta, proceso, rol }: suma un archivo de la carpeta de la obra
//   POST /api/subir               el archivo en el cuerpo; X-Proyecto, X-Nombre, X-Proceso, X-Rol: sube un archivo
//                                 desde la compu (va a la carpeta TABLERO de la obra en OneDrive) y lo carga
// Solo escucha en 127.0.0.1 y solo atiende pedidos hechos a localhost. Los POST piden el encabezado X-Tablero, que
// obliga al navegador a consultar antes: se acepta solo desde la página online del tablero (GitHub Pages), así esa
// página puede subir, quitar y actualizar archivos usando la compu de quien la está mirando, y ninguna otra página
// abierta en el navegador puede hacerlo.
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const ORIGENES = ['https://juancruzvillarroel.github.io'];
const MAX_SUBIDA = 300 * 1024 * 1024;
const ARCHIVO = path.join(__dirname, 'argerich-estructura.html');
const PUERTO = 5180;
let trabajo = null;   // { proyecto, indice, archivo, pasos: [], fin, ok, error, resultado }

const json = (res, cod, obj) => { res.writeHead(cod, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
function leerBinario(req, max) { return new Promise((ok, mal) => { const partes = []; let n = 0; req.on('data', c => { n += c.length; if (n > max) { mal(new Error('El archivo es demasiado grande')); req.destroy(); } else partes.push(c); }); req.on('end', () => ok(Buffer.concat(partes))); req.on('error', mal); }); }
function leerCuerpo(req) { return new Promise(ok => { let b = ''; req.on('data', c => { b += c; if (b.length > 1e4) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch (e) { ok({}); } }); }); }
const fresco = m => { delete require.cache[require.resolve(m)]; return require(m); };

// Un error en un pedido (por ejemplo, un archivo de OneDrive bloqueado justo cuando se guarda desde SketchUp o
// AutoCAD) no puede tirar el servidor: antes cortaba el proceso entero y el tablero local dejaba de responder.
// Se responde con el error y se anota en respaldo/servidor.log.
const LOG = path.join(__dirname, 'respaldo', 'servidor.log');
function anotar(...a) {
  try { fs.mkdirSync(path.dirname(LOG), { recursive: true }); fs.appendFileSync(LOG, new Date().toISOString() + ' ' + a.map(x => (x && x.stack) ? x.stack : String(x)).join(' ') + '\n'); } catch (e) { /* sin registro, sigue igual */ }
}
process.on('uncaughtException', e => anotar('error sin atrapar:', e));
process.on('unhandledRejection', e => anotar('promesa rechazada:', e));

// Actualización automática: los archivos marcados "auto": true en proyectos.json se vuelven a cargar solos cuando
// cambian en OneDrive, igual que con el botón Actualizar (convierte, rearma y publica). Se revisa cada 2 minutos y se
// espera a que el archivo lleve 2 minutos sin cambiar, para no leerlo a mitad de un guardado o de la sincronización.
// Si falla, no se reintenta hasta que el archivo vuelva a cambiar (el error queda en el menú Archivos y en el log).
const fallidos = new Map();   // proyecto/ruta → fecha de modificación con la que falló
function revisarAuto() {
  if (trabajo && !trabajo.fin) return;
  try {
    const { estadoArchivos } = fresco('./armar-tablero.js');
    for (const p of fresco('./obras.js').leerObras()) {
      const est = estadoArchivos(p);
      for (const [i, a] of (p.archivos || []).entries()) {
        const e = est[i];
        if (!a.auto || e.estado !== 'cambio' || Date.now() - new Date(e.modificado).getTime() < 120e3) continue;
        const clave = p.id + '/' + a.ruta; if (fallidos.get(clave) === e.modificado) continue;
        trabajo = { proyecto: p.id, indice: i, archivo: path.basename(a.ruta), auto: true, pasos: [], inicio: Date.now(), fin: null };
        const t = trabajo; anotar('actualización automática:', clave);
        fresco('./actualizar.js').actualizar(p.id, i, m => t.pasos.push(m))
          .then(r => { t.ok = true; t.resultado = r; fallidos.delete(clave); }, err => { t.ok = false; t.error = err.message; fallidos.set(clave, e.modificado); anotar('actualización automática falló:', clave, err.message); })
          .finally(() => { t.fin = Date.now(); });
        return;   // de a uno por vez: el próximo, en la revisión siguiente
      }
    }
  } catch (err) { anotar('actualización automática:', err); }
}
setInterval(revisarAuto, 120e3); setTimeout(revisarAuto, 20e3);

// En una compu recién instalada todavía no está armada la página: se arma al arrancar (antes daba error 500)
if (!fs.existsSync(ARCHIVO)) require('child_process').execFile(process.execPath, ['armar-tablero.js'], { cwd: __dirname, windowsHide: true }, err => err && anotar('armar la página al arrancar:', err));

http.createServer((req, res) => atender(req, res).catch(e => {
  anotar(req.method, req.url, e);
  try { if (!res.headersSent) json(res, 500, { error: 'Error del servidor local: ' + e.message }); else res.end(); } catch (e2) { /* la conexión ya se cerró */ }
})).on('error', e => anotar('servidor:', e)).listen(PUERTO, '127.0.0.1', () => { console.log(`Tablero en http://localhost:${PUERTO}`); anotar('arranca en el puerto', PUERTO); });

async function atender(req, res) {
  const ruta = req.url.split('?')[0], origen = req.headers.origin;
  // solo pedidos dirigidos a localhost (evita que otro nombre que apunte a esta compu lo use)
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '')) { res.writeHead(403); return res.end(); }
  if (origen && ORIGENES.includes(origen)) { res.setHeader('Access-Control-Allow-Origin', origen); res.setHeader('Vary', 'Origin'); res.setHeader('Access-Control-Allow-Private-Network', 'true'); }
  if (req.method === 'OPTIONS') {
    if (!origen || !ORIGENES.includes(origen)) { res.writeHead(403); return res.end(); }
    res.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type, X-Tablero, X-Proyecto, X-Proceso, X-Rol, X-Nombre', 'Access-Control-Max-Age': '600' }); return res.end();
  }
  if (ruta === '/api/subir' && req.method === 'POST') {
    if (req.headers['x-tablero'] !== '1') return json(res, 403, { error: 'Pedido no permitido' });
    if (trabajo && !trabajo.fin) return json(res, 409, { error: 'Hay una actualización en curso: ' + trabajo.archivo });
    const datos = await leerBinario(req, MAX_SUBIDA), dec = h => { try { return decodeURIComponent(req.headers[h] || ''); } catch (e) { return ''; } };
    const proyecto = dec('x-proyecto'), nombre = dec('x-nombre'), A = fresco('./actualizar.js');
    trabajo = { tipo: 'agregar', proyecto, indice: null, archivo: path.basename(nombre), pasos: [], inicio: Date.now(), fin: null };
    const t = trabajo;
    A.subir(proyecto, nombre, datos, dec('x-proceso'), dec('x-rol'), m => t.pasos.push(m))
      .then(r => { t.ok = true; t.resultado = r; }, e => { t.ok = false; t.error = e.message; })
      .finally(() => { t.fin = Date.now(); });
    return json(res, 202, { trabajo });
  }
  if (ruta === '/api/archivos' && req.method === 'GET') {
    const { estadoArchivos } = fresco('./armar-tablero.js'), A = fresco('./actualizar.js');
    const P = fresco('./obras.js').leerObras();
    return json(res, 200, {
      proyectos: Object.fromEntries(P.map(p => [p.id, estadoArchivos(p).map((e, i) => ({ ...e, noQuitar: A.motivoNoQuitar(p.id, p.archivos[i]) }))])),
      opciones: Object.fromEntries(P.map(p => [p.id, A.opciones(p.id)])), trabajo, compu: os.hostname(), programas: A.programas(),
      carpetas: Object.fromEntries(P.map(p => [p.id, !!p.raiz])),
    });
  }
  if (ruta === '/api/carpeta' && req.method === 'GET') {
    const id = new URL(req.url, 'http://x').searchParams.get('proyecto');
    return json(res, 200, { archivos: fresco('./actualizar.js').carpeta(id) });
  }
  if ((ruta === '/api/quitar' || ruta === '/api/agregar') && req.method === 'POST') {
    if (req.headers['x-tablero'] !== '1') return json(res, 403, { error: 'Pedido no permitido' });
    if (trabajo && !trabajo.fin) return json(res, 409, { error: 'Hay una actualización en curso: ' + trabajo.archivo });
    const c = await leerCuerpo(req), A = fresco('./actualizar.js');
    if (ruta === '/api/quitar') {
      try { return json(res, 200, await A.quitar(c.proyecto, c.indice)); } catch (e) { return json(res, 400, { error: e.message }); }
    }
    trabajo = { tipo: 'agregar', proyecto: c.proyecto, indice: null, archivo: path.basename(String(c.ruta || '')), pasos: [], inicio: Date.now(), fin: null };
    const t = trabajo;
    A.agregar(c.proyecto, String(c.ruta || ''), c.proceso, c.rol, m => t.pasos.push(m))
      .then(r => { t.ok = true; t.resultado = r; }, e => { t.ok = false; t.error = e.message; })
      .finally(() => { t.fin = Date.now(); });
    return json(res, 202, { trabajo });
  }
  if (ruta === '/api/estado' && req.method === 'GET') return json(res, 200, { trabajo });
  if (ruta === '/api/actualizar' && req.method === 'POST') {
    if (req.headers['x-tablero'] !== '1') return json(res, 403, { error: 'Pedido no permitido' });
    if (trabajo && !trabajo.fin) return json(res, 409, { error: 'Ya hay una actualización en curso: ' + trabajo.archivo });
    const { proyecto, indice } = await leerCuerpo(req);
    const P = fresco('./obras.js').leerObras().find(p => p.id === proyecto);
    const a = P && P.archivos[indice]; if (!a) return json(res, 400, { error: 'No existe ese archivo' });
    trabajo = { proyecto, indice, archivo: path.basename(a.ruta), pasos: [], inicio: Date.now(), fin: null };
    const t = trabajo;
    fresco('./actualizar.js').actualizar(proyecto, indice, m => t.pasos.push(m))
      .then(r => { t.ok = true; t.resultado = r; }, e => { t.ok = false; t.error = e.message; })
      .finally(() => { t.fin = Date.now(); });
    return json(res, 202, { trabajo });
  }
  if (ruta !== '/' && ruta !== '/index.html' && ruta !== '/argerich-estructura.html') { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('No encontrado'); return; }
  fs.readFile(ARCHIVO, (err, datos) => {
    if (err) { res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('No se pudo leer el tablero'); return; }
    // Se lee en cada pedido: si el tablero se actualiza, alcanza con recargar la página.
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui,sans-serif}[hidden]{display:none!important}img{max-width:100%}</style></head><body>' + datos + '</body></html>');
  });
}
