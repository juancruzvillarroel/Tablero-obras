// Habana 3329: pases en losa de la lámina "PASES EN LOSA" de HAB_ES.dwg.
// La lámina está dos veces (x≈-250 y x≈212, idénticas); se usa la de la derecha. Tiene una fila por losa, con la
// planta en la misma orientación y escala que el modelo: cada fila se lleva al modelo con un corrimiento en x
// (el mismo para todas) y uno en y propio de la fila. Se verificó con las columnas: cierran al centímetro.
// Cada pase es un rectángulo con su cruz (capa HAB_PASES) y la medida escrita al lado ("20x20").
const fs = require('fs');
const d = JSON.parse(fs.readFileSync('dxf.json'));
const limpiar = s => (s || '').replace(/\\P/g, ' ').replace(/\{|\}|\\[A-Za-z][^;]*;/g, '').trim();

// Filas de la lámina: borde superior de la planta (y) -> losa del modelo. La planta tipo vale para s1 a s4.
const FILAS = [
  { ytop: 214.30, losas: ['base'], nombre: 'S/ terreno natural' },
  { ytop: 194.30, losas: ['sPB'], nombre: 'S/ PB' },
  { ytop: 174.30, losas: ['s1', 's2', 's3', 's4'], nombre: 'S/ 1° a 4°' },
  { ytop: 154.30, losas: ['s5'], nombre: 'S/ 5°' },
  { ytop: 134.30, losas: ['s6'], nombre: 'S/ 6°' },
  { ytop: 114.30, losas: ['s7'], nombre: 'S/ 7°' },
  { ytop: 94.30, losas: ['s8'], nombre: 'S/ azotea (8°)' },
  { ytop: 74.30, losas: ['sSM'], nombre: 'S/ sala de máquinas (9°)' },
];
const DX = 15.44 - 211.76, YTOP_MODELO = 193.33;
const T = JSON.parse(fs.readFileSync('tablero-datos.json'));
const zLosa = Object.fromEntries(T.niveles.map(n => [n.id, n.z]));

// Segmentos de la capa de pases en la lámina derecha
const segs = [];
for (const e of d.entities) {
  if (e.layer !== 'HAB_PASES') continue;
  const v = e.type === 'LWPOLYLINE' ? e.vertices : e.type === 'LINE' ? e.vertices : null; if (!v) continue;
  if (v[0].x < 150 || v[0].x > 250) continue;
  const xs = v.map(p => p.x), ys = v.map(p => p.y);
  segs.push({ x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) });
}
// Agrupar lo que se toca: rectángulo + diagonales = un pase
const grupos = [];
for (const s of segs) {
  const toca = g => s.x0 <= g.x1 + 0.005 && s.x1 >= g.x0 - 0.005 && s.y0 <= g.y1 + 0.005 && s.y1 >= g.y0 - 0.005;
  const t = grupos.filter(toca);
  const g = { x0: Math.min(s.x0, ...t.map(q => q.x0)), x1: Math.max(s.x1, ...t.map(q => q.x1)), y0: Math.min(s.y0, ...t.map(q => q.y0)), y1: Math.max(s.y1, ...t.map(q => q.y1)), n: 1 + t.reduce((a, q) => a + q.n, 0) };
  for (const q of t) grupos.splice(grupos.indexOf(q), 1);
  grupos.push(g);
}
const textos = d.entities.filter(e => e.layer === 'HAB_PASES' && (e.type === 'MTEXT' || e.type === 'TEXT')).map(e => ({ p: e.position || e.startPoint, t: limpiar(e.text).replace(/^.*;/, '') })).filter(t => t.p.x > 150 && t.p.x < 250);

const pases = [], raros = [];
for (const g of grupos) {
  const w = g.x1 - g.x0, h = g.y1 - g.y0;
  if (w < 0.05 || h < 0.05 || w > 2 || h > 2) { raros.push(g); continue; }
  const f = FILAS.find(f => g.y1 <= f.ytop + 0.05 && g.y0 >= f.ytop - 9); if (!f) { raros.push(g); continue; }
  const dy = YTOP_MODELO - f.ytop;
  const cx = (g.x0 + g.x1) / 2, cy = (g.y0 + g.y1) / 2;
  const txt = textos.map(t => ({ ...t, d: Math.hypot(t.p.x - cx, t.p.y - cy) })).filter(t => /^\d+\s*x\s*\d+/i.test(t.t)).sort((a, b) => a.d - b.d)[0];
  for (const losa of f.losas) pases.push({
    piso: losa, losa, fila: f.nombre,
    x0: +(g.x0 + DX).toFixed(3), y0: +(g.y0 + dy).toFixed(3), x1: +(g.x1 + DX).toFixed(3), y1: +(g.y1 + dy).toFixed(3),
    z: losa === 'base' ? 0 : zLosa[losa], medida: txt && txt.d < 1.2 ? txt.t.replace(/\s/g, '') : `${Math.round(w * 100)}x${Math.round(h * 100)}`, usado: false,
  });
}
const SAN = {
  tramos: [], pases: [], pasesSinUso: [], cruces: [], notas: [], avisos: [], artefactos: [], piezas: [], uniones: [], pisos: [],
  sistemas: { primaria: 'Cloacal primaria', secundaria: 'Cloacal secundaria', pluvial: 'Pluvial', ventilacion: 'Ventilación', extraccion: 'Extracción baños', aire: 'Desagüe aire acond.' },
  pasesIng: pases, fuentePases: 'HAB_ES.dwg · lámina Pases en losa',
};
fs.writeFileSync('sanitaria.json', JSON.stringify(SAN));
const porFila = {}; pases.forEach(p => porFila[p.fila] = (porFila[p.fila] || 0) + 1);
console.log('grupos', grupos.length, '| pases', pases.length, porFila, '| descartados', raros.length, raros.slice(0, 8).map(g => `${g.x0.toFixed(1)},${g.y0.toFixed(1)} ${Math.round((g.x1 - g.x0) * 100)}x${Math.round((g.y1 - g.y0) * 100)}`).join(' | '));
const mal = pases.filter(p => { const m = p.medida.match(/^(\d+)x(\d+)/); if (!m) return true; const w = Math.round((p.x1 - p.x0) * 100), h = Math.round((p.y1 - p.y0) * 100); return !((Math.abs(w - m[1]) <= 2 && Math.abs(h - m[2]) <= 2) || (Math.abs(w - m[2]) <= 2 && Math.abs(h - m[1]) <= 2)); });
console.log('medida escrita distinta de la dibujada:', mal.length, mal.slice(0, 12).map(p => `${p.fila} ${p.medida} vs ${Math.round((p.x1 - p.x0) * 100)}x${Math.round((p.y1 - p.y0) * 100)}`).join(' | '));
