// Lee los sombreados (HATCH) de un DXF, que dxf-parser descarta: devuelve capa y caja de cada contorno.
// Se usa para los pases chicos del plano de estructura, que están dibujados como sombreados.
const fs = require('fs');
module.exports = function hatches(archivo) {
  const L = fs.readFileSync(archivo, 'utf8').split(/\r?\n/), out = [];
  let i = L.findIndex(l => l.trim() === 'ENTITIES') + 1;   // pares código/valor desde la línea siguiente
  for (; i < L.length - 1; i += 2) {
    if (L[i].trim() === '0' && L[i + 1].trim() === 'ENDSEC') break;
    if (!(L[i].trim() === '0' && L[i + 1].trim() === 'HATCH')) continue;
    let capa = '', enContorno = false, x = null; const pts = [];
    for (let j = i + 2; j < L.length - 1; j += 2) {
      const c = L[j].trim(), v = L[j + 1].trim();
      if (c === '0') break;
      if (c === '8') capa = v;
      else if (c === '91') enContorno = true;          // empiezan los contornos (antes hay un punto de elevación)
      else if (c === '75') enContorno = false;         // terminan los contornos: siguen datos del patrón
      else if (enContorno && c === '10') x = +v;
      else if (enContorno && c === '20' && x !== null) { pts.push({ x, y: +v }); x = null; }
    }
    if (pts.length) {
      const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
      out.push({ capa, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) });
    }
  }
  return out;
};
