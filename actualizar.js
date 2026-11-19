// Vuelve a cargar al tablero un archivo de una obra (el SketchUp o un CAD) y rearma todo lo que depende de él.
// uso: node actualizar.js <proyecto> <índice del archivo en proyectos.json>   (también lo usa servidor-tablero.js)
//
// Pasos: 1) copia el archivo de la carpeta de la obra (OneDrive) a la carpeta de trabajo; 2) lo convierte:
// el SketchUp se abre con SketchUp 2023 y exportar.rb vuelca sus piezas a skp.json; los DWG se pasan a DXF con
// AutoCAD (accoreconsole) y se leen con dxf-parser; 3) corre la cadena de la obra (extracción, superposiciones,
// instalación, muros); 4) arma el tablero y lo prueba (smoke.js). Antes de empezar guarda un respaldo de todo
// lo que se va a pisar: si algún paso falla, vuelve todo como estaba y el tablero queda con la versión anterior.
const fs = require('fs'), path = require('path'), { execFile } = require('child_process');
const RAIZ = __dirname;
const { leerObras, escribirObras } = require('./obras.js');
const SKETCHUP = 'C:/Program Files/SketchUp/SketchUp 2023/SketchUp.exe';
const ACCORE = 'C:/Program Files/Autodesk/AutoCAD 2024/accoreconsole.exe';

// Cómo se convierte cada archivo (según su "proceso" en proyectos.json) y qué cadena se corre después.
const OBRAS = {
  argerich: {
    procesos: {
      skp: { tipo: 'skp', carpeta: 'skp', copia: 'skp/modelo.skp' },
      es: { tipo: 'dwg', copia: 'rich_es.dwg', dxf: 'rich_es.dxf', leer: [['.', 'parse.js', 'rich_es.dxf'], ['.', 'extract.js']] },
      san: { tipo: 'dwg', copia: 'san/ins.dwg', dxf: 'san/ins.dxf', leer: [['san', 'parse.js', 'ins.dxf']] },
      alb: { tipo: 'dwg', copia: 'alb/muros.dwg', dxf: 'alb/muros.dxf', leer: [['alb', 'inspeccion.js']] },
    },
    cadena: [['skp', 'extraer-skp.js'], ['skp', 'datos-tablero.js'], ['san', 'pases.js'], ['san', 'armar.js'], ['san', 'arquitectura.js'], ['alb', 'armar-muros2.js'], ['alb', 'separar.js']],
    salidas: ['skp/skp.json', 'skp/modelo-skp.json', 'skp/tablero-datos.json', 'skp/modelo.skp', 'dxf.json', 'modelo.json', 'san/dxf.json', 'san/pases.json', 'san/sanitaria.json', 'alb/muros.dxf', 'alb/muros.json', 'alb/albanileria.json'],
  },
  habana: {
    procesos: {
      skp: { tipo: 'skp', carpeta: 'hab', copia: 'hab/modelo.skp' },
      es: { tipo: 'dwg', copia: 'hab/HAB_ES.dwg', dxf: 'hab/HAB_ES.dxf', leer: [['hab', '../parse.js', 'HAB_ES.dxf']] },
    },
    cadena: [['hab', 'extraer.js'], ['hab', 'pases.js']],
    salidas: ['hab/skp.json', 'hab/tablero-datos.json', 'hab/modelo.skp', 'hab/HAB_ES.dwg', 'hab/HAB_ES.dxf', 'hab/dxf.json', 'hab/sanitaria.json'],
  },
};

const correr = (exe, args, cwd, ms = 300000) => new Promise((ok, mal) => {
  execFile(exe, args, { cwd, timeout: ms, maxBuffer: 64 * 1024 * 1024, windowsHide: true }, (err, so, se) => err ? mal(new Error((se || so || err.message).toString().trim().split('\n').slice(-3).join(' '))) : ok(so.toString()));
});
const nodo = (dir, script, ...args) => correr(process.execPath, [script, ...args], path.join(RAIZ, dir));

// Publicar: si la carpeta tiene un repositorio con GitHub configurado, después de cada cambio se suben los datos y
// la página nueva (docs/index.html, que GitHub Pages publica sola en un minuto). Si no se puede subir, el cambio
// queda hecho igual en la compu y se avisa por qué no se subió.
async function publicar(mensaje) {
  try {
    if (!(await correr('git', ['remote'], RAIZ)).trim()) return { publicado: false, motivo: 'el repositorio no tiene GitHub configurado' };
    await correr('git', ['add', '-A'], RAIZ);
    if (!(await correr('git', ['status', '--porcelain'], RAIZ)).trim()) return { publicado: true };
    await correr('git', ['commit', '-m', mensaje], RAIZ);
    await correr('git', ['push'], RAIZ, 180000);
    return { publicado: true };
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
    avisar('Copiando ' + path.basename(a.ruta));
    const copia = path.join(RAIZ, proc.copia); fs.mkdirSync(path.dirname(copia), { recursive: true }); fs.copyFileSync(origen, copia);
    const st = fs.statSync(origen);

    if (proc.tipo === 'skp') {
      avisar('Abriendo el modelo en SketchUp y exportando sus piezas (puede tardar un minuto)');
      const dir = path.join(RAIZ, proc.carpeta), log = path.join(dir, 'log.txt'), salida = path.join(dir, 'skp.json');
      try { fs.unlinkSync(log); } catch (e) {}
      const t0 = Date.now();
      await correr(SKETCHUP, ['-RubyStartup', path.join(dir, 'exportar.rb'), copia], dir, 600000).catch(() => {});   // SketchUp sale solo al terminar
      const l = fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '';
      if (!l.startsWith('ok') || fs.statSync(salida).mtimeMs < t0) throw new Error('SketchUp no pudo exportar el modelo' + (l ? ': ' + l.trim().split('\n')[0] : ''));
      avisar('SketchUp: ' + l.trim().split('\n')[0].replace(/^ok /, ''));
    } else {
      avisar('Pasando el DWG a DXF con AutoCAD');
      const dxf = path.join(RAIZ, proc.dxf), scr = path.join(path.dirname(dxf), 'a-dxf-auto.scr');
      try { fs.unlinkSync(dxf); } catch (e) {}
      fs.writeFileSync(scr, ['FILEDIA', '0', '_.DXFOUT', '"' + dxf.split('/').join('\\') + '"', '16', '_.QUIT', 'Y', ''].join('\r\n'));
      await correr(ACCORE, ['/i', copia, '/s', scr], path.dirname(dxf), 300000).catch(() => {});
      if (!fs.existsSync(dxf) || fs.statSync(dxf).size < 1000) throw new Error('AutoCAD no pudo pasar el DWG a DXF');
      for (const [dir, script, ...args] of proc.leer) { avisar('Leyendo el DXF (' + script + ')'); await nodo(dir, script, ...args); }
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
const DATOS = { argerich: { san: ['san', 'san/sanitaria.json'], alb: ['alb', 'alb/albanileria.json'] }, habana: { es: ['san', 'hab/sanitaria.json'] } };
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
module.exports = { actualizar, quitar, agregar, carpeta, opciones, motivoNoQuitar };

if (require.main === module) {
  const [id, i] = process.argv.slice(2);
  actualizar(id, +i, m => console.log('·', m)).then(r => console.log(JSON.stringify(r, null, 1)), e => { console.error('ERROR:', e.message); process.exit(1); });
}
