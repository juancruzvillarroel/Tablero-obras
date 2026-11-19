// Reemplaza la ubicación deducida de los artefactos por la de las plantas de arquitectura (imágenes de Juan).
// Calibración: 84,6 px/m (medianeras: 660 px = 7,80 m). Eje x: el muro de la escalera coincide con el tabique C14
// (centro en x = 10,835 m del modelo ↔ 737,5 px). Eje y: cara exterior de la medianera de arriba = y 36,40 m.
// Dirección del frente en la imagen: +px → +x del modelo; +py → −y del modelo.
const fs = require('fs');
const s = JSON.parse(fs.readFileSync('sanitaria.json'));
const S = 84.6;
const aM = (px, py, top) => [+(10.835 + (px - 737.5) / S).toFixed(3), +(36.40 - (py - top) / S).toFixed(3)];
const F = { '+px': [1, 0], '-px': [-1, 0], '+py': [0, -1], '-py': [0, 1] };
// [tipo, px, py, frente, medidas opcionales]
const TIPO = [
  ['bacha', 1043, 568, '+py'], ['bidet', 968, 593, '+px'], ['inodoro', 972, 638, '+px'], ['ducha', 1013, 692, '-py', { w: 1.6, p: 0.78 }],
  ['bidet', 968, 912, '+px'], ['inodoro', 972, 962, '+px'], ['bacha', 1043, 1018, '-py'], ['ducha', 1050, 903, '-px', { w: 0.72, p: 0.7 }],
  ['pileta', 835, 893, '+py'], ['pileta', 215, 990, '-py'], ['pileta', 300, 452, '+py'],
];
const CUARTO = [
  ['bacha', 1043, 563, '+py'], ['bidet', 965, 590, '+px'], ['inodoro', 970, 637, '+px'], ['ducha', 1013, 690, '-py', { w: 1.6, p: 0.78 }],
  ['inodoro', 1182, 962, '-px'], ['bidet', 1185, 1030, '-px'], ['bacha', 1110, 1025, '-py'],
  ['pileta', 770, 1015, '-py'], ['lavajillas', 828, 1012, '-py'], ['pileta', 215, 987, '-py'], ['pileta', 300, 448, '+py'],
];
const PB = [['bacha', 860, 690, '+px'], ['inodoro', 885, 760, '-py']];
const PLANTAS = { P1: [TIPO, 393], P2: [TIPO, 393], P3: [TIPO, 393], P4: [CUARTO, 389], PB: [PB, 394] };
const zPiso = Object.fromEntries(s.pisos.map(p => [p.id, p.z]));
const viejos = s.artefactos;
// El 5° no tiene planta de arquitectura con sus baños: por ahora sus artefactos no se muestran (pedido de Juan).
const nuevos = [];
for (const [piso, [lista, top]] of Object.entries(PLANTAS)) {
  const usados = new Set();
  for (const [tipo, px, py, fr, med] of lista) {
    const [x, y] = aM(px, py, top);
    // Hereda la descarga (diámetro y sistema) del artefacto deducido más cercano del mismo tipo.
    const v = viejos.filter((a, i) => a.piso === piso && a.tipo === tipo && !usados.has(a) && !a.sinDescarga)
      .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
    if (v && Math.hypot(v.x - x, v.y - y) < 2.5) usados.add(v);
    nuevos.push({ tipo, piso, x, y, z: zPiso[piso], frente: F[fr], centrado: true, ...(med || {}),
      ...(v && usados.has(v) ? { d: v.d, sis: v.sis, desc: [v.x, v.y] } : { sinDescarga: true }), fuente: 'arquitectura' });
  }
}
s.artefactos = nuevos;
fs.writeFileSync('sanitaria.json', JSON.stringify(s));
const c = {}; nuevos.forEach(a => { const k = a.piso + ' ' + (a.fuente ? 'arq' : 'deducido'); c[k] = (c[k] || 0) + 1; });
console.log(c, 'sin descarga:', nuevos.filter(a => a.sinDescarga).map(a => a.piso + ' ' + a.tipo).join(', '));
