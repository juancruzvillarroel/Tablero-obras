// Lista de obras del tablero. proyectos.json va al repositorio; la carpeta de cada obra en esta compu (en OneDrive)
// está en carpetas.local.json, que no se sube: así el repositorio público no tiene rutas personales.
// Si una obra no está en carpetas.local.json (por ejemplo, en la compu de un compañero recién instalada), se busca
// sola: dentro del OneDrive de la compu, una carpeta "01_PROYECTOS/<NOMBRE DE LA OBRA>" (ARGERICH 2984, …), y se
// anota en carpetas.local.json para no buscarla de nuevo.
const fs = require('fs'), path = require('path'), os = require('os');
const ARCH = path.join(__dirname, 'proyectos.json'), LOCAL = path.join(__dirname, 'carpetas.local.json');

// Carpetas raíz donde puede estar el OneDrive del estudio en esta compu
function raicesOneDrive() {
  const casa = os.homedir(), out = new Set();
  for (const v of [process.env.OneDriveCommercial, process.env.OneDriveConsumer, process.env.OneDrive]) if (v) out.add(v);
  try { for (const e of fs.readdirSync(casa, { withFileTypes: true })) if (e.isDirectory() && /^OneDrive/i.test(e.name)) out.add(path.join(casa, e.name)); } catch (e) { /* sin carpeta personal */ }
  return [...out].filter(d => { try { return fs.statSync(d).isDirectory(); } catch (e) { return false; } });
}
// Busca "<raíz>/…/01_PROYECTOS/<nombre>" hasta dos niveles debajo de cada OneDrive (ahí suele estar "Estudio JES - 2025")
function buscarCarpetaObra(nombre) {
  const objetivo = nombre.toUpperCase();
  const probar = base => { const d = path.join(base, '01_PROYECTOS'); try { for (const e of fs.readdirSync(d, { withFileTypes: true })) if (e.isDirectory() && e.name.toUpperCase() === objetivo) return path.join(d, e.name); } catch (e) { /* no existe */ } return null; };
  for (const r of raicesOneDrive()) {
    const directo = probar(r); if (directo) return directo;
    let hijos = []; try { hijos = fs.readdirSync(r, { withFileTypes: true }).filter(e => e.isDirectory()); } catch (e) { continue; }
    // primero las carpetas del estudio
    hijos.sort((a, b) => (/estudio|jes/i.test(b.name) ? 1 : 0) - (/estudio|jes/i.test(a.name) ? 1 : 0));
    for (const h of hijos) {
      const en = probar(path.join(r, h.name)); if (en) return en;
      let nietos = []; try { nietos = fs.readdirSync(path.join(r, h.name), { withFileTypes: true }).filter(e => e.isDirectory()); } catch (e) { continue; }
      for (const n of nietos) { const en2 = probar(path.join(r, h.name, n.name)); if (en2) return en2; }
    }
  }
  return null;
}
function leerLocal() { try { return JSON.parse(fs.readFileSync(LOCAL, 'utf8')); } catch (e) { return {}; } }
function leerObras() {
  const P = JSON.parse(fs.readFileSync(ARCH, 'utf8'));
  const L = leerLocal(); let nuevo = false;
  for (const p of P) {
    if (L[p.id] && fs.existsSync(L[p.id])) { p.raiz = L[p.id]; continue; }
    const hallada = buscarCarpetaObra(p.nombre);
    if (hallada) { p.raiz = L[p.id] = hallada.split(path.sep).join('/'); nuevo = true; }
  }
  if (nuevo) try { fs.writeFileSync(LOCAL, JSON.stringify(L, null, 2) + '\n'); } catch (e) { /* se vuelve a buscar la próxima */ }
  return P;
}
function escribirObras(P) { fs.writeFileSync(ARCH, JSON.stringify(P.map(({ raiz, ...p }) => p), null, 2) + '\n'); }
module.exports = { leerObras, escribirObras };
