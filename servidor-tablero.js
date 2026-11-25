// Servidor local del tablero (http://localhost:5180). Sin dependencias.
// Además de servir el HTML, deja actualizar los archivos de cada obra desde el menú Archivos:
//   GET  /api/archivos            estado de los archivos de cada obra, revisado en el momento
//   POST /api/actualizar          { proyecto, indice }: vuelve a cargar ese archivo (actualizar.js), de a uno por vez
//   GET  /api/estado              progreso de la actualización en curso o el resultado de la última
//   GET  /api/carpeta?proyecto=   archivos de la carpeta de la obra que se pueden agregar
//   POST /api/quitar              { proyecto, indice }: saca el archivo de la obra (no lo borra de OneDrive)
//   POST /api/agregar             { proyecto, ruta, proceso, rol }: suma un archivo de la carpeta de la obra
// Solo escucha en 127.0.0.1, y los POST piden el encabezado X-Tablero: así otra página abierta en el navegador
// no puede dispararlos (el encabezado obliga a una consulta previa que este servidor no acepta).
const http = require('http'), fs = require('fs'), path = require('path');
const ARCHIVO = path.join(__dirname, 'argerich-estructura.html');
const PUERTO = 5180;
let trabajo = null;   // { proyecto, indice, archivo, pasos: [], fin, ok, error, resultado }

const json = (res, cod, obj) => { res.writeHead(cod, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
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

http.createServer((req, res) => atender(req, res).catch(e => {
  anotar(req.method, req.url, e);
  try { if (!res.headersSent) json(res, 500, { error: 'Error del servidor local: ' + e.message }); else res.end(); } catch (e2) { /* la conexión ya se cerró */ }
})).on('error', e => anotar('servidor:', e)).listen(PUERTO, '127.0.0.1', () => { console.log(`Tablero en http://localhost:${PUERTO}`); anotar('arranca en el puerto', PUERTO); });

async function atender(req, res) {
  const ruta = req.url.split('?')[0];
  if (ruta === '/api/archivos' && req.method === 'GET') {
    const { estadoArchivos } = fresco('./armar-tablero.js'), A = fresco('./actualizar.js');
    const P = fresco('./obras.js').leerObras();
    return json(res, 200, {
      proyectos: Object.fromEntries(P.map(p => [p.id, estadoArchivos(p).map((e, i) => ({ ...e, noQuitar: A.motivoNoQuitar(p.id, p.archivos[i]) }))])),
      opciones: Object.fromEntries(P.map(p => [p.id, A.opciones(p.id)])), trabajo,
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
