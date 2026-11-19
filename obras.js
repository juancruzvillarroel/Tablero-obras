// Lista de obras del tablero. proyectos.json va al repositorio; la carpeta de cada obra en esta compu (en OneDrive)
// está en carpetas.local.json, que no se sube: así el repositorio público no tiene rutas personales.
const fs = require('fs'), path = require('path');
const ARCH = path.join(__dirname, 'proyectos.json'), LOCAL = path.join(__dirname, 'carpetas.local.json');
function leerObras() {
  const P = JSON.parse(fs.readFileSync(ARCH, 'utf8'));
  let L = {}; try { L = JSON.parse(fs.readFileSync(LOCAL, 'utf8')); } catch (e) {}
  for (const p of P) if (L[p.id]) p.raiz = L[p.id];
  return P;
}
function escribirObras(P) { fs.writeFileSync(ARCH, JSON.stringify(P.map(({ raiz, ...p }) => p), null, 2)); }
module.exports = { leerObras, escribirObras };
