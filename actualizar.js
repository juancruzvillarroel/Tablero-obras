// Vuelve a cargar al tablero un archivo de una obra (el SketchUp o un CAD) y rearma todo lo que depende de él.
// uso: node actualizar.js <proyecto> <índice del archivo en proyectos.json>   (también lo usa servidor-tablero.js)
//
// Pasos: 1) copia el archivo de la carpeta de la obra (OneDrive) a la carpeta de trabajo; 2) lo convierte:
// el SketchUp se abre con SketchUp 2023 y exportar.rb vuelca sus piezas a skp.json; los DWG se pasan a DXF con
// AutoCAD (accoreconsole) y se leen con dxf-parser; 3) corre la cadena de la obra (extracción, superposiciones,
// instalación, muros); 4) arma el tablero y lo prueba (smoke.js). Antes de empezar guarda un respaldo de todo
// lo que se va a pisar: si algún paso falla, vuelve todo como estaba y el tablero queda con la versión anterior.
const fs = require('fs'), path = require('path'), os = require('os'), { execFile } = require('child_process');
const RAIZ = __dirname;
const { leerObras, escribirObras } = require('./obras.js');
// SketchUp y AutoCAD: en cada compu se usa la versión más nueva instalada (los compañeros pueden tener otras que
// las de esta compu). Se pueden forzar con las variables TABLERO_SKETCHUP y TABLERO_ACCORE.
function programa(env, base, patron, exe) {
  if (process.env[env] && fs.existsSync(process.env[env])) return process.env[env];
  for (const raiz of [process.env.ProgramFiles || 'C:/Program Files', 'C:/Program Files']) {
    let dirs = []; try { dirs = fs.readdirSync(path.join(raiz, base)).filter(d => patron.test(d)); } catch (e) { continue; }
    dirs.sort((a, b) => (+(b.match(/\d{4}/) || [0])[0]) - (+(a.match(/\d{4}/) || [0])[0]));
    for (const d of dirs) { const f = path.join(raiz, base, d, exe); if (fs.existsSync(f)) return f; }
  }
  return null;
}
const SKETCHUP = programa('TABLERO_SKETCHUP', 'SketchUp', /^SketchUp \d{4}$/, 'SketchUp.exe');
const ACCORE = programa('TABLERO_ACCORE', 'Autodesk', /^AutoCAD( LT)? \d{4}$/, 'accoreconsole.exe');

// Cómo se convierte cada archivo (según su "proceso" en proyectos.json) y qué cadena se corre después.
const OBRAS = {
  argerich: {
    procesos: {
      skp: { tipo: 'skp', carpeta: 'skp', copia: 'skp/modelo.skp' },
      es: { tipo: 'dwg', copia: 'rich_es.dwg', dxf: 'rich_es.dxf', leer: [['.', 'parse.js', 'rich_es.dxf'], ['.', 'extract.js']], hecho: ['dxf.json'] },
      san: { tipo: 'dwg', copia: 'san/ins.dwg', dxf: 'san/ins.dxf', leer: [['san', 'parse.js', 'ins.dxf']], hecho: ['san/dxf.json'] },
      alb: { tipo: 'dwg', copia: 'alb/muros.dwg', dxf: 'alb/muros.dxf', leer: [['alb', 'inspeccion.js']], hecho: ['alb/muros.json'] },
    },
    cadena: [['skp', 'extraer-skp.js'], ['skp', 'datos-tablero.js'], ['san', 'pases.js'], ['san', 'armar.js'], ['san', 'arquitectura.js'], ['alb', 'armar-muros2.js'], ['alb', 'separar.js']],
    salidas: ['skp/skp.json', 'skp/modelo-skp.json', 'skp/tablero-datos.json', 'skp/modelo.skp', 'dxf.json', 'modelo.json', 'san/dxf.json', 'san/pases.json', 'san/sanitaria.json', 'alb/muros.dxf', 'alb/muros.json', 'alb/albanileria.json'],
  },
  habana: {
    procesos: {
      skp: { tipo: 'skp', carpeta: 'hab', copia: 'hab/modelo.skp' },
      es: { tipo: 'dwg', copia: 'hab/HAB_ES.dwg', dxf: 'hab/HAB_ES.dxf', leer: [['hab', '../parse.js', 'HAB_ES.dxf']], hecho: ['hab/dxf.json'] },
    },
    cadena: [['hab', 'extraer.js'], ['hab', 'pases.js']],
    salidas: ['hab/skp.json', 'hab/tablero-datos.json', 'hab/modelo.skp', 'hab/HAB_ES.dwg', 'hab/HAB_ES.dxf', 'hab/dxf.json', 'hab/sanitaria.json'],
  },  // Libertador 3174: SketchUp de estructura (los pases de losa vienen dibujados en el modelo) y CAD de albañilería,
  // donde cada polilínea es un muro (lib/alb/armar-muros.js). Los muros toman la altura de la estructura.
  libertador: {
    procesos: {
      skp: { tipo: 'skp', carpeta: 'lib', copia: 'lib/modelo.skp' },
      alb: { tipo: 'dwg', copia: 'lib/alb/muros.dwg', dxf: 'lib/alb/muros.dxf', leer: [['lib/alb', 'inspeccion.js']], hecho: ['lib/alb/muros.json'] },
    },
    cadena: [['lib', 'extraer.js'], ['lib/alb', 'armar-muros.js']],
    salidas: ['lib/skp.json', 'lib/tablero-datos.json', 'lib/modelo.skp', 'lib/alb/muros.dwg', 'lib/alb/muros.dxf', 'lib/alb/muros.json', 'lib/alb/albanileria.json'],
  },  // Condarco 3187: por ahora solo el SketchUp de estructura.
  condarco: {
    procesos: {
      skp: { tipo: 'skp', carpeta: 'cdc', copia: 'cdc/modelo.skp' },
    },
    cadena: [['cdc', 'extraer.js']],
    salidas: ['cdc/skp.json', 'cdc/tablero-datos.json', 'cdc/modelo.skp'],
  },
};

// Si un paso falla, el mensaje es la línea que dice qué pasó (la del error), no la cola del volcado de Node
const mensajeDe = txt => { const L = String(txt).trim().split('\n').map(l => l.trim()).filter(Boolean); return L.find(l => /^(\w*Error|ERROR)\b/.test(l)) || L.slice(-3).join(' '); };
// Lo que deja cada conversión (no va al repositorio: es pesado y se rehace). Si falta en esta compu, ese archivo
// de la obra nunca se convirtió acá (una compu recién instalada) y el armado de la obra no puede usarlo.
const convertido = proc => proc.hecho || (proc.tipo === 'skp' ? [path.join(proc.carpeta, 'skp.json')] : [proc.dxf]);
const correr = (exe, args, cwd, ms = 300000) => new Promise((ok, mal) => {
  execFile(exe, args, { cwd, timeout: ms, maxBuffer: 64 * 1024 * 1024, windowsHide: true }, (err, so, se) => err ? mal(new Error(mensajeDe(se || so || err.message))) : ok(so.toString()));
});
const nodo = (dir, script, ...args) => correr(process.execPath, [script, ...args], path.join(RAIZ, dir));

// Publicar: si la carpeta tiene un repositorio con GitHub configurado, después de cada cambio se suben los datos y
// la página nueva (docs/index.html, que GitHub Pages publica sola en un minuto). Si no se puede subir, el cambio
// queda hecho igual en la compu y se avisa por qué no se subió.
// Varias compus publican al mismo repositorio (la de cada compañero que sube archivos): antes de cambiar algo se trae
// lo último (sincronizar) y, si al subir otra compu ya publicó algo en el medio, se trae eso y se vuelve a intentar.
// Si los cambios se pisan (dos personas cargando la misma obra a la vez), no se fuerza nada: se avisa.
// TABLERO_SIN_PUBLICAR=1: no trae ni publica nada (para probar sin tocar GitHub)
const hayGitHub = async () => { if (process.env.TABLERO_SIN_PUBLICAR) return false; try { return !!(await correr('git', ['remote'], RAIZ)).trim(); } catch (e) { return false; } };
async function sincronizar(avisar = () => {}) {
  if (!(await hayGitHub())) return;
  avisar('Trayendo lo último que publicaron los demás');
  try { await correr('git', ['pull', '--rebase', '--autostash'], RAIZ, 180000); }
  catch (e) { try { await correr('git', ['rebase', '--abort'], RAIZ); } catch (x) { /* no había rebase */ } throw new Error('No se pudo traer lo último de GitHub (' + e.message + '). Revisá la conexión e intentá de nuevo'); }
}
async function publicar(mensaje) {
  try {
    if (!(await hayGitHub())) return { publicado: false, motivo: 'el repositorio no tiene GitHub configurado' };
    await correr('git', ['add', '-A'], RAIZ);
    if (!(await correr('git', ['status', '--porcelain'], RAIZ)).trim()) return { publicado: true };
    await correr('git', ['commit', '-m', mensaje + '\n\nCargado desde ' + os.hostname()], RAIZ);
    for (let intento = 0; ; intento++) {
      try { await correr('git', ['push'], RAIZ, 180000); return { publicado: true }; }
      catch (e) {
        if (intento >= 2) throw e;
        try { await correr('git', ['pull', '--rebase'], RAIZ, 180000); }
        catch (x) { try { await correr('git', ['rebase', '--abort'], RAIZ); } catch (y) { /* nada */ } return { publicado: false, motivo: 'otra persona publicó cambios de la misma obra al mismo tiempo. Lo tuyo quedó en esta compu: volvé a cargar el archivo para publicarlo' }; }
      }
    }
  } catch (e) { return { publicado: false, motivo: e.message }; }
}

// Resumen para comparar antes y después
function resumen(id) {
  const P = leerObras().find(p => p.id === id);
  const leerJ = f => { try { return f ? JSON.parse(fs.readFileSync(path.join(RAIZ, f), 'utf8')) : null; } catch (e) { return null; } };
  const D = leerJ(P.datos), S = leerJ(P.san), A = leerJ(P.alb);
  return {
    elementos: D ? D.elementos.length : 0, hormigon: D ? D.elementos.reduce((a, e) => a + e.vol, 0) : 0,
    pases: S ? (S.pasesIng || []).length : 0, tramos: S ? (S.tramos || []).length : 0,
    muros: A ? A.muros.length : 0, superficie: A ? A.muros.reduce((a, m) => a + m.sup, 0) : 0,
  };
}

// Copia el archivo de la carpeta de la obra a la de trabajo y lo convierte (SketchUp → skp.json; DWG → DXF y lectura)
async function convertir(P, a, proc, avisar) {
  const origen = path.join(P.raiz, a.ruta);
  if (!fs.existsSync(origen)) throw new Error('No encuentro ' + path.basename(a.ruta) + ' en la carpeta de la obra');
  avisar('Copiando ' + path.basename(a.ruta));
  const copia = path.join(RAIZ, proc.copia); fs.mkdirSync(path.dirname(copia), { recursive: true }); fs.copyFileSync(origen, copia);
  if (proc.tipo === 'skp' && !SKETCHUP) throw new Error('No encuentro SketchUp instalado en esta compu');
  if (proc.tipo !== 'skp' && !ACCORE) throw new Error('No encuentro AutoCAD instalado en esta compu (hace falta para leer los DWG)');
  if (proc.tipo === 'skp') {
    avisar('Abriendo ' + path.basename(a.ruta) + ' en SketchUp y exportando sus piezas (puede tardar un minuto)');
    const dir = path.join(RAIZ, proc.carpeta), log = path.join(dir, 'log.txt'), salida = path.join(dir, 'skp.json');
    try { fs.unlinkSync(log); } catch (e) { /* no había */ }
    const t0 = Date.now();
    await correr(SKETCHUP, ['-RubyStartup', path.join(dir, 'exportar.rb'), copia], dir, 600000).catch(() => {});   // SketchUp sale solo al terminar
    const l = fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '';
    if (!l.startsWith('ok') || !fs.existsSync(salida) || fs.statSync(salida).mtimeMs < t0) throw new Error('SketchUp no pudo exportar el modelo' + (l ? ': ' + l.trim().split('\n')[0] : ''));
    avisar('SketchUp: ' + l.trim().split('\n')[0].replace(/^ok /, ''));
  } else {
    avisar('Pasando ' + path.basename(a.ruta) + ' a DXF con AutoCAD');
    const dxf = path.join(RAIZ, proc.dxf), scr = path.join(path.dirname(dxf), 'a-dxf-auto.scr');
    try { fs.unlinkSync(dxf); } catch (e) { /* no había */ }
    fs.writeFileSync(scr, ['FILEDIA', '0', '_.DXFOUT', '"' + dxf.split('/').join('\\') + '"', '16', '_.QUIT', 'Y', ''].join('\r\n'));
    await correr(ACCORE, ['/i', copia, '/s', scr], path.dirname(dxf), 300000).catch(() => {});
    if (!fs.existsSync(dxf) || fs.statSync(dxf).size < 1000) throw new Error('AutoCAD no pudo pasar ' + path.basename(a.ruta) + ' a DXF');
    for (const [dir, script, ...args] of proc.leer) { avisar('Leyendo el DXF (' + script + ')'); await nodo(dir, script, ...args); }
  }
  return fs.statSync(origen);
}
async function actualizar(id, indice, avisar = () => {}) {
  const obra = OBRAS[id]; if (!obra) throw new Error('Obra desconocida: ' + id);
  const lista = leerObras();
  const P = lista.find(p => p.id === id), a = P.archivos[indice];
  if (!a) throw new Error('No existe ese archivo en la obra');
  const proc = obra.procesos[a.proceso]; if (!proc) throw new Error('No sé cómo cargar ' + path.basename(a.ruta));
  const origen = path.join(P.raiz, a.ruta);
  if (!fs.existsSync(origen)) throw new Error('No encuentro ' + path.basename(a.ruta) + ' en la carpeta de la obra');
  const antes = resumen(id);

  // respaldo
  const sello = new Date().toISOString().replace(/[:.]/g, '-'), resp = path.join(RAIZ, 'respaldo', id + '-' + sello);
  const guardados = [];
  for (const f of obra.salidas) { const src = path.join(RAIZ, f); if (fs.existsSync(src)) { const dst = path.join(resp, f); fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); guardados.push(f); } }
  fs.mkdirSync(resp, { recursive: true }); fs.copyFileSync(path.join(RAIZ, 'proyectos.json'), path.join(resp, 'proyectos.json'));
  const volver = () => { for (const f of guardados) fs.copyFileSync(path.join(resp, f), path.join(RAIZ, f)); fs.copyFileSync(path.join(resp, 'proyectos.json'), path.join(RAIZ, 'proyectos.json')); };

  try {
    const st = await convertir(P, a, proc, avisar);
    // En una compu recién instalada los otros archivos de la obra nunca se convirtieron acá: el armado los necesita
    // (por ejemplo, los muros de Libertador toman la altura de la estructura). Se convierten primero, con la versión
    // que hay hoy en la carpeta de la obra.
    for (const [j, otro] of P.archivos.entries()) {
      const op = j !== indice && !otro.pendiente && otro.proceso && obra.procesos[otro.proceso];
      if (!op || convertido(op).every(f => fs.existsSync(path.join(RAIZ, f)))) continue;
      avisar('En esta compu falta convertir ' + path.basename(otro.ruta) + ': lo convierto primero');
      const so = await convertir(P, otro, op, avisar); otro.cargado = new Date().toISOString(); otro.tam = so.size;
    }

    for (const [dir, script] of obra.cadena) { avisar('Rearmando: ' + dir + '/' + script); await nodo(dir, script); }

    // queda registrado qué versión se cargó
    a.cargado = new Date().toISOString(); a.tam = st.size;
    escribirObras(lista);
    avisar('Armando el tablero y probándolo');
    await nodo('.', 'armar-tablero.js');
    const prueba = await nodo('.', 'smoke.js');
    if (!/errores: ninguno/.test(prueba)) throw new Error('El tablero nuevo tiene errores: ' + prueba.trim().split('\n').slice(-2).join(' '));
    const despues = resumen(id);
    avisar('Subiendo la página online');
    const pub = await publicar(`${P.nombre}: cargar ${path.basename(a.ruta)}`);
    return { ok: true, archivo: path.basename(a.ruta), antes, despues, respaldo: path.relative(RAIZ, resp), ...pub };
  } catch (err) {
    avisar('Falló: ' + err.message + '. Vuelvo a la versión anterior');
    volver();
    try { await nodo('.', 'armar-tablero.js'); } catch (e) {}
    throw err;
  }
}

// ---------- Quitar y agregar archivos ----------
// Quitar saca el archivo de la obra en el tablero (lo que mostraba deja de verse); el archivo en OneDrive no se toca.
// Solo se pueden quitar los que alimentan una parte suelta (muros, instalación): el SketchUp es la base de la obra
// y el plano del ingeniero de Argerich lo usan la estructura y la instalación, así que esos se reemplazan agregando
// otro del mismo tipo. Agregar toma un archivo de la carpeta de la obra: si es de un tipo que la obra ya sabe leer,
// lo carga (y reemplaza al anterior de ese tipo); si no, queda en la lista como pendiente de procesar.
const ROLES = id => ({ skp: 'Modelo de estructura', es: id === 'habana' ? 'Plano de estructura y pases en losa' : 'Plano de estructura del ingeniero', san: 'Instalación sanitaria', alb: 'Albañilería' });
// Qué dato de la obra sale de cada archivo (se apaga al quitarlo y se vuelve a prender al agregarlo)
const DATOS = { argerich: { san: ['san', 'san/sanitaria.json'], alb: ['alb', 'alb/albanileria.json'] }, habana: { es: ['san', 'hab/sanitaria.json'] }, libertador: { alb: ['alb', 'lib/alb/albanileria.json'] } };
function motivoNoQuitar(id, a) {
  if (a.pendiente) return null;
  if (a.proceso === 'skp') return 'Es el modelo base de la obra. Para cambiarlo, agregá otro SketchUp como "Modelo de estructura" y reemplaza a este.';
  if (DATOS[id] && DATOS[id][a.proceso]) return null;
  return 'La estructura y la instalación usan este plano. Para cambiarlo, agregá el plano nuevo como "' + a.rol + '" y reemplaza a este.';
}
function opciones(id) {
  const o = OBRAS[id]; if (!o) return [];
  return Object.entries(o.procesos).map(([k, p]) => ({ proceso: k, rol: ROLES(id)[k], ext: p.tipo === 'skp' ? '.skp' : '.dwg' }));
}
const leerLista = leerObras, escribirLista = escribirObras;
async function rearmar(copia) {
  try {
    await nodo('.', 'armar-tablero.js');
    const prueba = await nodo('.', 'smoke.js');
    if (!/errores: ninguno/.test(prueba)) throw new Error('El tablero nuevo tiene errores: ' + prueba.trim().split('\n').slice(-2).join(' '));
  } catch (e) { escribirLista(copia); try { await nodo('.', 'armar-tablero.js'); } catch (x) {} throw e; }
}
async function quitar(id, indice) {
  const lista = leerLista(), copia = JSON.parse(JSON.stringify(lista)), P = lista.find(p => p.id === id), a = P && P.archivos[indice];
  if (!a) throw new Error('No existe ese archivo en la obra');
  const motivo = motivoNoQuitar(id, a); if (motivo) throw new Error(motivo);
  P.archivos.splice(indice, 1);
  const d = DATOS[id] && DATOS[id][a.proceso]; if (d) P[d[0]] = null;
  fs.mkdirSync(path.join(RAIZ, 'respaldo'), { recursive: true });
  fs.writeFileSync(path.join(RAIZ, 'respaldo', 'proyectos-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json'), JSON.stringify(copia, null, 2));
  escribirLista(lista); await rearmar(copia);
  return { ok: true, archivo: path.basename(a.ruta), ...(await publicar(`${P.nombre}: quitar ${path.basename(a.ruta)}`)) };
}
// Archivos de la carpeta de la obra que se pueden agregar (los más nuevos primero)
const EXT = ['.skp', '.dwg', '.dxf', '.pdf'];
function carpeta(id) {
  const P = leerLista().find(p => p.id === id); if (!P || !P.raiz) return [];
  const usados = new Set(P.archivos.map(a => path.normalize(a.ruta).toLowerCase())), out = [];
  (function recorrer(dir, rel, prof) {
    let ents = []; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const e of ents) {
      if (out.length > 3000 || e.name.startsWith('~') || e.name.startsWith('.')) continue;
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) { if (prof < 8) recorrer(path.join(dir, e.name), r, prof + 1); continue; }
      if (!EXT.includes(path.extname(e.name).toLowerCase()) || usados.has(path.normalize(r).toLowerCase())) continue;
      try { const st = fs.statSync(path.join(dir, e.name)); out.push({ ruta: r, nombre: e.name, carpeta: rel.split('/').join(' / '), modificado: st.mtime.toISOString(), tam: st.size }); } catch (x) {}
    }
  })(P.raiz, '', 0);
  return out.sort((a, b) => b.modificado.localeCompare(a.modificado));
}
async function agregar(id, ruta, proceso, rolOtro, avisar = () => {}) {
  const lista = leerLista(), copia = JSON.parse(JSON.stringify(lista)), P = lista.find(p => p.id === id);
  if (!P || !P.raiz) throw new Error('Obra desconocida');
  const abs = path.resolve(P.raiz, ruta);
  if (!abs.toLowerCase().startsWith(path.resolve(P.raiz).toLowerCase() + path.sep) || !fs.existsSync(abs)) throw new Error('El archivo no está en la carpeta de la obra');
  const rel = path.relative(P.raiz, abs).split(path.sep).join('/'), ext = path.extname(abs).toLowerCase();
  const proc = proceso && OBRAS[id] && OBRAS[id].procesos[proceso];
  if (!proc) {
    // tipo que la obra todavía no sabe leer: queda registrado para procesarlo después
    P.archivos.push({ rol: (rolOtro || '').trim() || 'Otro archivo', ruta: rel, pendiente: true, cargado: new Date().toISOString() });
    escribirLista(lista); avisar('Armando el tablero'); await rearmar(copia);
    return { ok: true, pendiente: true, archivo: path.basename(abs), ...(await publicar(`${P.nombre}: agregar ${path.basename(abs)}`)) };
  }
  const quiere = proc.tipo === 'skp' ? '.skp' : '.dwg';
  if (ext !== quiere) throw new Error('Para "' + ROLES(id)[proceso] + '" hace falta un archivo ' + quiere);
  const i = P.archivos.findIndex(a => a.proceso === proceso), previo = i >= 0 ? P.archivos[i] : null;
  const nuevo = { rol: ROLES(id)[proceso], ruta: rel, proceso, cargado: '1970-01-01T00:00:00.000Z' };
  if (previo && previo.leido) delete nuevo.leido;
  const indice = i >= 0 ? i : P.archivos.length;
  if (i >= 0) P.archivos[i] = nuevo; else P.archivos.push(nuevo);
  const d = DATOS[id] && DATOS[id][proceso]; if (d) P[d[0]] = d[1];
  escribirLista(lista);
  try {
    const r = await actualizar(id, indice, avisar);
    return { ...r, reemplaza: previo ? path.basename(previo.ruta) : null };
  } catch (e) { escribirLista(copia); try { await nodo('.', 'armar-tablero.js'); } catch (x) {} throw e; }
}
// Subir un archivo desde la compu (el + del menú Archivos): se guarda en la carpeta TABLERO de la obra en OneDrive
// (así queda junto a los demás archivos de la obra y lo ven las otras compus) y se agrega como cualquier otro.
// Si ya hay uno con ese nombre, se reemplaza: es la versión nueva.
async function subir(id, nombre, datos, proceso, rolOtro, avisar = () => {}) {
  const P = leerLista().find(p => p.id === id);
  if (!P) throw new Error('Obra desconocida');
  if (!P.raiz) throw new Error('No encuentro la carpeta de ' + P.nombre + ' en el OneDrive de esta compu');
  const limpio = path.basename(String(nombre || '')).split('').map(c => c.charCodeAt(0) < 32 || '<>:"/\|?*'.includes(c) ? '_' : c).join('').trim();
  if (!limpio || !EXT.includes(path.extname(limpio).toLowerCase())) throw new Error('Solo se pueden subir archivos ' + EXT.join(', '));
  const dir = path.join(P.raiz, 'TABLERO'); fs.mkdirSync(dir, { recursive: true });
  avisar('Guardando ' + limpio + ' en la carpeta TABLERO de la obra');
  fs.writeFileSync(path.join(dir, limpio), datos);
  return agregar(id, 'TABLERO/' + limpio, proceso, rolOtro, avisar, true);
}
// Lo que se llama desde afuera trae primero lo último de GitHub (otra compu puede haber cargado algo)
const conSync = f => async (...a) => { const avisar = typeof a.at(-1) === 'function' ? a.at(-1) : () => {}; await sincronizar(avisar); return f(...a); };
module.exports = { actualizar: conSync(actualizar), quitar: conSync(quitar), agregar: conSync(agregar), subir: conSync(subir), carpeta, opciones, motivoNoQuitar, programas: () => ({ sketchup: SKETCHUP, autocad: ACCORE }) };

if (require.main === module) {
  const [id, i] = process.argv.slice(2);
  actualizar(id, +i, m => console.log('·', m)).then(r => console.log(JSON.stringify(r, null, 1)), e => { console.error('ERROR:', e.message); process.exit(1); });
}
