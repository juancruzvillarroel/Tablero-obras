// Condarco 3187: arma la instalación sanitaria en 3D a partir de CDC_IS_CL.dxf y la cruza con las vigas del modelo
// de estructura (SketchUp). Es el armado de Argerich (san/armar.js) adaptado a este plano:
// - Las plantas están apiladas cada 20 m en el dibujo (de arriba hacia abajo: PB, tipo 1°-6°, 7°, 8°, 9°, 10°, sala de
//   máquinas y techos). La hoja tipo se recorre una vez por cada piso del 1° al 6°.
// - Alineación con el SketchUp (la misma en todas las hojas): el plano inserta la arquitectura (CDC 3187_ARQ) en
//   (146.552, 77.555) y el plano de estructura CDC 3187_ES la inserta en (217.603, 69.366), sobre una hoja cuyas
//   columnas coinciden con las del modelo corriéndolas (-120, -100). De ahí: x - 48.949, y - 108.190 (mod 20).
// - Hay subsuelo: lo de planta baja va colgado bajo la losa del subsuelo (no enterrado).
// - Pases del ingeniero: los de la lámina "PASES EN LOSA" del plano de estructura (cdc/es/pases.js), ya en coordenadas
//   del modelo y por losa. Si en esta compu no está cargado ese plano, no se comparan.
const fs = require('fs');
const san = JSON.parse(fs.readFileSync('dxf.json'));
const tab = JSON.parse(fs.readFileSync('../tablero-datos.json'));
const PASES = fs.existsSync('../es/pases.json') ? JSON.parse(fs.readFileSync('../es/pases.json')) : {};

// ---------- Pisos: hoja de la sanitaria, losa de piso (por donde bajan) y losa de techo ----------
const Z = Object.fromEntries(tab.niveles.map(n => [n.id, n.z]));
const PISOS = [
  { id: 'PB', nombre: 'Planta baja', y0: 130, piso: 'sSS', techo: 'sPB' },
  ...[1, 2, 3, 4, 5, 6].map(n => ({ id: 'P' + n, nombre: n + '° piso', y0: 110, piso: n === 1 ? 'sPB' : 's' + (n - 1), techo: 's' + n })),
  { id: 'P7', nombre: '7° piso', y0: 90, piso: 's6', techo: 's7' },
  { id: 'P8', nombre: '8° piso', y0: 70, piso: 's7', techo: 's8' },
  { id: 'P9', nombre: '9° piso', y0: 50, piso: 's8', techo: 's9' },
  { id: 'P10', nombre: '10° piso', y0: 30, piso: 's9', techo: 's10' },
  { id: 'SM', nombre: 'Sala de máquinas', y0: 10, piso: 's10', techo: 'sSM' },
  // Techos: sobre la losa de la sala de máquinas (lo que llega acá son las ventilaciones que salen al exterior)
  { id: 'TE', nombre: 'Techos', y0: -10, piso: 'sSM', techo: null, azotea: true },
];
// Pases de cada piso: los de su losa de piso (por donde bajan sus caños)
PISOS.forEach(p => { p.zPiso = Z[p.piso]; p.zTecho = p.techo ? Z[p.techo] : null; p.pases = PASES[p.piso] ? p.piso : null; });
const aSKP = (x, y, y0) => [x - 48.949, y - y0 + 1.810];

// ---------- Estructura: losas y vigas por nivel (cajas en planta + cotas) ----------
const cajaDe = v => { const b = [[1e9, -1e9], [1e9, -1e9], [1e9, -1e9]]; for (let i = 0; i < v.length; i += 3) for (let k = 0; k < 3; k++) { const c = v[i + k] / 100; b[k][0] = Math.min(b[k][0], c); b[k][1] = Math.max(b[k][1], c); } return b; };
const EST = tab.elementos.map(e => ({ id: e.id, n: e.n, t: e.t, l: e.l, b: cajaDe(e.v) }));
const losaEn = (nivel, x, y) => EST.find(e => e.l === nivel && e.t === 'losa' && x >= e.b[0][0] && x <= e.b[0][1] && y >= e.b[1][0] && y <= e.b[1][1]);
// Fondo de losa en un punto: si no hay losa (vacío, escalera), se toma 15 cm bajo la cota.
const fondoLosa = (nivel, x, y) => { const l = losaEn(nivel, x, y); return l ? l.b[2][0] : Z[nivel] - 0.15; };

// ---------- Lectura del DXF ----------
const limpiar = s => (s || '').replace(/\\P/g, ' ').replace(/\{|\}|\\[A-Za-z][^;]*;/g, '').replace(/%%C/gi, 'Ø').trim();
const enHoja = (p, y0) => p && p.x > 40 && p.x < 95 && p.y >= y0 && p.y < y0 + 20;
const dSeg = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy; let t = L ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / L : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy); };
const dPoli = (p, v) => Math.min(...v.slice(1).map((q, i) => dSeg(p, v[i], q)));
const SISTEMA = l => ({ 'CLOACA PRIMARA': 'primaria', 'CL_PRIMARIA': 'primaria', 'CLOACA SECUNDARIA': 'secundaria', 'PLUVIAL': 'pluvial', 'VENTILACIÓN': 'ventilacion', 'VENTILACIONES': 'ventilacion', 'ART_IS 1$0$ART_IS-Cloacal$0$IS-V': 'ventilacion' }[l]);

const caños = [], verticales = [], avisos = [], notasUsadas = [], piezas = [], ppaTextos = [], artTextos = [];
const TIPO_ART = [[/INODORO/i, 'inodoro'], [/BIDET/i, 'bidet'], [/BACHA|LAVATORIO/i, 'bacha'], [/DUCHA/i, 'ducha'], [/^P\.?C\.?$|PILETA/i, 'pileta'], [/LAVARROPAS/i, 'lavarropas'], [/LAVA?VAJILLAS|LAVAJILLAS/i, 'lavajillas']];
// "Desvío por CR de 7° piso" / "por cielorraso del 8°": la losa bajo la que corre (cielorraso del piso N = losa s/ N).
// "Desvío por CR" sin piso: el cielorraso de abajo del propio piso (lo normal). Los % de las notas no son pisos.
const losaDeNota = t => { const m = t.match(/(?:cielorraso|\bCR)\.?\s*(?:de |del )?(planta baja|\d+)\s*°/i); return m ? (/planta/i.test(m[1]) ? 'sPB' : 's' + m[1]) : null; };
for (const P of PISOS) {
  const ents = san.entities.filter(e => enHoja((e.vertices && e.vertices[0]) || e.position || e.startPoint || e.center, P.y0));
  const textos = ents.filter(e => e.type === 'MTEXT' || e.type === 'TEXT').map(e => ({ p: e.position || e.startPoint, t: limpiar(e.text) }));
  const notas = textos.filter(t => /contrapiso|por pared|hasta pared|cielorraso|\bCR\b|abajo de la viga|camara|c[aá]mara|embutid/i.test(t.t));
  const aa = textos.filter(t => /AIRE ACONDICIONADO/i.test(t.t));
  for (const t of textos) { const m = TIPO_ART.find(([re]) => re.test(t.t)); if (m) artTextos.push({ piso: P, tipo: m[1], p: aSKP(t.p.x, t.p.y, P.y0) }); }
  textos.filter(t => /(^|[^A-Z])PPA([^A-Z]|$)/.test(t.t)).forEach(t => ppaTextos.push({ piso: P, p: aSKP(t.p.x, t.p.y, P.y0) }));
  const ins = ents.filter(e => e.type === 'INSERT').map(e => ({ n: e.name.replace('ART_IS 1$0$ART_IS-Cloacal$0$', ''), l: e.layer, p: e.position }));
  const sumideros = ins.filter(i => (i.n === 'IS_110-Corte' || i.n === 'PPA' || /bacc/.test(i.n)));
  const locales = [], usadas = new Set();
  // --- tramos horizontales: polilíneas con espesor de caño ---
  for (const e of ents.filter(e => (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE'))) {
    let sis = SISTEMA(e.layer); if (!sis) continue;
    const w = +(e.width || e.vertices[0].startWidth || 0).toFixed(3);
    if (w < 0.03 || (e.shape && e.vertices.some(v => v.bulge))) continue; // símbolos y flechas
    const v = e.vertices.filter((p, i, a) => !i || Math.hypot(p.x - a[i - 1].x, p.y - a[i - 1].y) > 0.002);
    if (v.length < 2) continue;
    let L = 0; for (let i = 1; i < v.length; i++) L += Math.hypot(v[i].x - v[i - 1].x, v[i].y - v[i - 1].y);
    if (L < 0.04) continue;
    // Flechas de sentido de escurrimiento: una "V" corta con los extremos juntos.
    if (L < 0.3 && Math.hypot(v[0].x - v[v.length - 1].x, v[0].y - v[v.length - 1].y) < 0.2) continue;
    if (sis === 'secundaria' && aa.some(t => dPoli(t.p, v) < 0.6) && w <= 0.032) sis = 'aire';
    // Nota que aplica: la más cercana a menos de 40 cm (55 cm las de desvío por cielorraso, que se escriben más lejos)
    const cerca = notas.map(t => ({ ...t, d: dPoli(t.p, v) })).filter(t => t.d < (/cielorraso|\bCR\b|hasta pared/i.test(t.t) ? 0.6 : 0.4)).sort((a, b) => a.d - b.d);
    // En los techos lo que corre va sobre la losa (salidas de ventilación)
    let modo = P.azotea ? 'contrapiso' : 'cielorraso', nota = null, nivelCielo = P.piso;
    // El desagüe de aire acondicionado va embutido en muro; el ducto del extractor, en el cielorraso del propio baño.
    if (sis === 'aire') modo = 'muro';
    // La capa IS-V es la ventilación de los extractores: va siempre por el cielorraso del mismo piso donde está el
    // extractor (bajo la losa de techo), y no toma las notas de desvío de las montantes (criterio de Juan).
    if (e.layer.endsWith('IS-V')) { sis = 'extraccion'; nivelCielo = P.techo; }
    cerca.forEach(t => usadas.add(t));
    for (const t of (modo === 'muro' || sis === 'extraccion' || P.azotea ? [] : cerca)) {
      if (/contrapiso/i.test(t.t)) { modo = 'contrapiso'; nota = t.t; break; }
      if (/por pared/i.test(t.t)) { modo = 'pared'; nota = t.t; break; }
      // Cocina: va colgado por debajo de la mesada hasta la pared y ahí baja (confirmado por Juan).
      if (/hasta pared/i.test(t.t)) { modo = 'mesada'; nota = t.t; break; }
      if (/abajo de la viga/i.test(t.t)) { modo = 'bajo_viga'; nota = t.t; break; }
      if (/cielorraso|\bCR\b/i.test(t.t)) {
        const n = losaDeNota(t.t);
        modo = 'cielorraso'; nivelCielo = n && Z[n] !== undefined ? n : P.piso; nota = t.t; break;
      }
    }
    // Sentido de escurrimiento: termina en el extremo más cercano a una bajada, PPA o boca de acceso.
    const dS = p => Math.min(...sumideros.map(s => Math.hypot(s.p.x - p.x, s.p.y - p.y)), 99);
    const pts = dS(v[0]) < dS(v[v.length - 1]) ? v.slice().reverse() : v.slice();
    locales.push({ piso: P, sis, d: w, modo, nota, nivelCielo, v, pts: pts.map(p => aSKP(p.x, p.y, P.y0)), L });
  }
  // Notas de "por contrapiso" / "baja por pared" sin flecha y sin caño al lado: no se adivina a qué tramo van (se avisa
  // una vez por hoja, no en cada piso de la planta tipo).
  if (PISOS.find(q => q.y0 === P.y0) === P) for (const t of notas.filter(t => /contrapiso|por pared/i.test(t.t) && !usadas.has(t)))
    avisos.push(`${P.y0 === 110 ? 'Planta tipo 1° a 6°' : P.nombre}: la nota "${t.t}" no está junto a ningún caño; esos tramos quedaron por cielorraso.`);
  // Las montantes se desvían juntas (cloacal, ventilación y pluvial) aunque la nota esté junto a una sola:
  // la nota de desvío pasa a los Ø110 que corren a menos de 30 cm del tramo anotado.
  for (const a of locales.filter(c => c.nota && /cielorraso/i.test(c.nota))) {
    for (const b of locales) {
      if (b === a || b.nota || b.d < 0.1 || b.sis === 'extraccion' || b.modo !== a.modo && b.modo !== 'cielorraso' && b.modo !== 'enterrado') continue;
      // Corre al lado en todo su largo (no alcanza con que toque el tramo anotado en un extremo).
      const dmax = Math.max(...b.v.map(p => dPoli(p, a.v)));
      if (dmax < 0.45) { b.modo = 'cielorraso'; b.nivelCielo = a.nivelCielo; b.nota = a.nota; }
    }
  }
  for (const c of locales) {
    // "Desvío por cielorraso de 3ro" en la hoja que se repite para 2° y 3°: va una sola vez.
    if (c.nivelCielo !== P.piso && c.modo === 'cielorraso' && P.id !== 'PB' && c.sis !== 'extraccion' && Z[c.nivelCielo] !== P.zTecho) continue;
    delete c.v; caños.push(c);
    if (c.nota) notasUsadas.push(`${P.nombre}: "${c.nota}"`);
  }
  // --- verticales ---
  for (const i of ins) {
    const [x, y] = aSKP(i.p.x, i.p.y, P.y0);
    const sis = SISTEMA(i.l) || (i.l === 'CLOACA PRIMARA' ? 'primaria' : null);
    // 09145517 es el extractor del baño (va en el cielorraso, no baja): no se modela como vertical.
    // Un "IS_110-Corte" pluvial junto al texto "Embudo de lluvia" es el embudo del balcón: baja solo hasta el cielorraso.
    const embudo = (sis === 'pluvial') && textos.some(t => /embudo/i.test(t.t) && Math.hypot(t.p.x - i.p.x, t.p.y - i.p.y) < 0.8)
      && caños.some(c => c.piso === P && c.sis === 'pluvial' && [c.pts[0], c.pts[c.pts.length - 1]].some(p => Math.hypot(p[0] - x, p[1] - y) < 0.15));
    if (i.n === 'IS_110-Corte' && embudo) {
      verticales.push({ piso: P, tipo: 'embudo', sis: 'pluvial', d: 0.110, x, y }); piezas.push({ tipo: 'embudo', piso: P.id, x, y, z: P.zPiso });
      // El caño del embudo arranca en el embudo: ese extremo es aguas arriba.
      const c = caños.find(c => c.piso === P && c.sis === 'pluvial' && Math.hypot(c.pts[c.pts.length - 1][0] - x, c.pts[c.pts.length - 1][1] - y) < 0.15);
      if (c) c.pts.reverse();
    }
    else if (i.n === 'IS_110-Corte') verticales.push({ piso: P, tipo: 'montante', sis: sis || 'primaria', d: 0.110, x, y });
    else if (/bacc/.test(i.n)) piezas.push({ tipo: 'ba', piso: P.id, x, y, z: P.zPiso });
    // En este plano el Ø63 de la capa de ventilaciones es la montante CV Ø63 que acompaña a cada CDV Ø110
    else if (i.n === 'IS_CL-63' && sis === 'ventilacion') verticales.push({ piso: P, tipo: 'montante', sis, d: 0.063, x, y });
    else if (i.n === 'IS_CL-63') verticales.push({ piso: P, tipo: 'artefacto', sis: sis || 'secundaria', d: 0.063, x, y });
    else if (i.n === 'PPA') { verticales.push({ piso: P, tipo: 'PPA', sis: 'secundaria', d: 0.110, x, y }); piezas.push({ tipo: 'ppa', piso: P.id, x, y, z: P.zPiso }); }
    else if (/^ca_ba_wc/.test(i.n) && P.id !== 'PB') {
      // Inodoro: la descarga es el extremo del caño de Ø110 más cercano al artefacto.
      const c = caños.filter(c => c.piso === P && c.sis === 'primaria').flatMap(c => [c.pts[0]]).map(p => ({ p, d: Math.hypot(p[0] - x, p[1] - y) })).sort((a, b) => a.d - b.d)[0];
      if (c && c.d < 0.9) verticales.push({ piso: P, tipo: 'inodoro', sis: 'primaria', d: 0.110, x: c.p[0], y: c.p[1] });
    }
  }
  // --- números de bajada: círculo de referencia + número; cada hoja numera las suyas ---
  const SIS_MARCA = { 'CLOACA PRIMARA': 'primaria', VENTILACIONES: 'ventilacion', PLUVIAL: 'pluvial' };
  const marcas = ents.filter(e => e.type === 'LWPOLYLINE' && e.shape && e.vertices.some(v => v.bulge) && SIS_MARCA[e.layer]).map(e => {
    const c = { x: (e.vertices[0].x + e.vertices[1].x) / 2, y: (e.vertices[0].y + e.vertices[1].y) / 2 };
    const n = textos.filter(t => /^\d+$/.test(t.t)).map(t => ({ t: t.t, d: Math.hypot(t.p.x - c.x, t.p.y - c.y) })).sort((a, b) => a.d - b.d)[0];
    return n && n.d < 0.5 ? { sis: SIS_MARCA[e.layer], num: n.t, p: aSKP(c.x, c.y, P.y0) } : null;
  }).filter(Boolean);
  // Se asigna cada referencia a la montante más cercana de su sistema (la referencia se dibuja al costado).
  const libres = verticales.filter(v => v.piso === P && v.tipo === 'montante');
  for (const m of marcas.map(m => ({ ...m, cand: libres.filter(v => v.sis === m.sis).map(v => ({ v, d: Math.hypot(v.x - m.p[0], v.y - m.p[1]) })).sort((a, b) => a.d - b.d) })).sort((a, b) => (a.cand[0]?.d ?? 99) - (b.cand[0]?.d ?? 99))) {
    const c = m.cand.find(c => !c.v.num && c.d < 2.6); if (c) c.v.num = m.num; else avisos.push(`${P.nombre}: la referencia ${m.sis} ${m.num} no tiene montante cerca.`);
  }
}
// Hoja 2y3: los caños por defecto se repiten en 2° y 3° (ya están: la hoja se recorre una vez por piso).

// ---------- Desvíos de montantes por cielorraso ----------
// Un desvío por cielorraso del piso P recibe la montante que baja del piso de arriba y la corre hasta donde sigue
// bajando. Aguas arriba es el extremo donde la hoja de arriba tiene una montante. En la hoja de P, la montante
// dibujada en ese extremo no baja por el piso P: se saca.
const hojaArriba = P => PISOS.find((q, i) => i > PISOS.indexOf(P) && q.y0 !== P.y0);
const desvios = caños.filter(c => c.modo === 'cielorraso' && c.nivelCielo !== c.piso.piso && c.nota && /cielorraso/i.test(c.nota));
for (const c of desvios) {
  const A = hojaArriba(c.piso); if (!A) continue;
  const montA = verticales.filter(v => v.piso === A && v.tipo === 'montante');
  const dA = p => Math.min(...montA.map(v => Math.hypot(v.x - p[0], v.y - p[1])), 99);
  if (dA(c.pts[c.pts.length - 1]) < dA(c.pts[0])) { c.pts.reverse(); }
  const [ux, uy] = c.pts[0];
  for (let i = verticales.length - 1; i >= 0; i--) {
    const v = verticales[i];
    if (v.tipo === 'montante' && v.piso.y0 === c.piso.y0 && Math.hypot(v.x - ux, v.y - uy) < 0.25) verticales.splice(i, 1);
  }
}

// ---------- Cotas de cada tramo ----------
const pend = d => d >= 0.1 ? 1 / 60 : 0.02;
const R = c => c.d / 2;
const vigasDe = nivel => EST.filter(e => e.l === nivel && e.t === 'viga');
function cruzaRect(a, b, r) { // Liang-Barsky en planta
  let t0 = 0, t1 = 1; const dx = b[0] - a[0], dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0] - r.b[0][0]], [dx, r.b[0][1] - a[0]], [-dy, a[1] - r.b[1][0]], [dy, r.b[1][1] - a[1]]]) {
    if (p === 0) { if (q < 0) return null; } else { const t = q / p; if (p < 0) { if (t > t1) return null; if (t > t0) t0 = t; } else { if (t < t0) return null; if (t < t1) t1 = t; } }
  }
  return t1 - t0 > 1e-4 ? [t0, t1] : null;
}
for (const c of caños) {
  const P = c.piso; let z0;
  const [x0, y0] = c.pts[0];
  if (c.modo === 'enterrado') z0 = -0.30 - R(c);
  else if (c.modo === 'contrapiso') z0 = P.zPiso + 0.01 + R(c);
  else if (c.modo === 'pared') z0 = P.zPiso + 0.25;
  else if (c.modo === 'muro') z0 = P.zPiso + 0.30;
  else if (c.modo === 'mesada') z0 = P.zPiso + 0.45;
  else if (c.modo === 'cielorraso' || c.modo === 'bajo_viga') {
    const niv = c.nivelCielo || P.techo;
    z0 = fondoLosa(niv, x0, y0) - 0.03 - R(c);
    if (c.modo === 'bajo_viga') {
      let fondo = Infinity;
      for (let i = 1; i < c.pts.length; i++) for (const vg of vigasDe(niv)) if (cruzaRect(c.pts[i - 1], c.pts[i], vg)) fondo = Math.min(fondo, vg.b[2][0]);
      if (fondo < Infinity) z0 = fondo - 0.03 - R(c);
    }
  }
  // Pendiente escrita en la nota ("desvío por cielorraso de 2.5%", "1,5% de pendiente")
  const mp = c.nota && c.nota.match(/(\d+(?:[.,]\d+)?)\s*%/); if (mp) c.pend = +mp[1].replace(',', '.') / 100;
  const s = c.sis === 'ventilacion' || c.sis === 'extraccion' ? 0 : c.pend ?? (c.modo === 'contrapiso' || c.sis === 'aire' ? 0.01 : pend(c.d));
  let acc = 0; c.p3 = [[x0, y0, z0]];
  for (let i = 1; i < c.pts.length; i++) { acc += Math.hypot(c.pts[i][0] - c.pts[i - 1][0], c.pts[i][1] - c.pts[i - 1][1]); c.p3.push([...c.pts[i], z0 - s * acc]); }
}
// Cocina: el caño va bajo la mesada hasta la pared y ahí baja. La pared es el extremo con un pase del ingeniero
// más cerca; en ese extremo se agrega la bajada hasta el cielorraso de abajo.
const rectsIng = P => (PASES[P.pases] || []).map(r => ({ ...r }));
const dRect = (x, y, r) => Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.y0 - y, 0, y - r.y1));
for (const c of caños.filter(c => c.modo === 'mesada')) {
  const rs = rectsIng(c.piso), dp = p => Math.min(...rs.map(r => dRect(p[0], p[1], r)), 99);
  if (dp(c.p3[0]) < dp(c.p3[c.p3.length - 1])) { c.p3.reverse(); c.pts.reverse(); }
  const [x, y, z] = c.p3[c.p3.length - 1];
  verticales.push({ piso: c.piso, tipo: 'mesada', sis: c.sis, d: c.d, x, y, z1: z, fija: true });
}
const salidaDe = (c, fin) => { const n = c.p3.length, [a, b] = fin ? [c.p3[n - 1], c.p3[n - 2]] : [c.p3[0], c.p3[1]]; const l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l, (b[2] - a[2]) / l].map(v => Math.round(v * 1000) / 1000); };
// PPA: el plano la rotula con texto; va en el nudo (extremos de caños) más poblado a menos de 70 cm del rótulo.
for (const t of ppaTextos) {
  const P = t.piso, ext = [];
  for (const c of caños.filter(c => c.piso === P && (c.sis === 'secundaria' || c.sis === 'primaria') && c.nivelCielo === P.piso)) for (const f of [0, 1]) ext.push({ c, f, e: c.p3[f ? c.p3.length - 1 : 0] });
  let mejor = null;
  for (const a of ext) {
    if (Math.hypot(a.e[0] - t.p[0], a.e[1] - t.p[1]) > 0.7) continue;
    const grupo = ext.filter(b => Math.hypot(b.e[0] - a.e[0], b.e[1] - a.e[1]) < 0.1);
    const puntaje = grupo.length * 10 - Math.hypot(a.e[0] - t.p[0], a.e[1] - t.p[1]);
    if (!mejor || puntaje > mejor.puntaje) mejor = { puntaje, a, grupo };
  }
  if (!mejor || mejor.grupo.length < 2) { avisos.push(`${P.nombre}: no ubiqué la PPA rotulada cerca de (${t.p[0].toFixed(2)}, ${t.p[1].toFixed(2)}).`); continue; }
  const [x, y] = mejor.a.e, z = Math.min(...mejor.grupo.map(g => g.e[2]));
  for (const g of mejor.grupo) { g.e[0] = x; g.e[1] = y; g.c.ppa = (g.c.ppa || []).concat(g.f); }
  if (verticales.some(v => v.tipo === 'PPA' && v.piso === P && Math.hypot(v.x - x, v.y - y) < 0.1)) continue;
  verticales.push({ piso: P, tipo: 'PPA', sis: 'secundaria', d: 0.110, x, y, z1: P.zPiso, fija: true, zFija: z - 0.06 });
  piezas.push({ tipo: 'ppa', piso: P.id, x, y, z: P.zPiso, zFondo: z - 0.06, entradas: mejor.grupo.map(g => salidaDe(g.c, g.f)) });
}
// Verticales: montantes atraviesan el piso entero; caídas de artefactos van del artefacto al cielorraso de abajo.
for (const v of verticales) {
  if (v.fija) { v.z0 = v.zFija ?? (v.piso.piso ? fondoLosa(v.piso.piso, v.x, v.y) - 0.1 : -0.40); continue; }
  const P = v.piso;
  const bajo = P.piso ? fondoLosa(P.piso, v.x, v.y) - 0.1 : -0.40;
  if (v.tipo === 'montante') {
    v.z0 = bajo;
    // Techos: la ventilación atraviesa la losa y sale 60 cm. Sala de máquinas: donde no hay losa arriba es la
    // terraza del 10°, y la ventilación sale ahí mismo.
    if (P.azotea) v.z1 = P.zPiso + 0.6;
    else if (P.id === 'SM' && !losaEn(P.techo, v.x, v.y)) v.z1 = P.zPiso + (v.sis === 'ventilacion' ? 0.6 : 0.1);
    else v.z1 = fondoLosa(P.techo, v.x, v.y) - 0.1;
  }
  else { v.z1 = P.zPiso + (v.tipo === 'artefacto' ? 0.45 : v.tipo === 'inodoro' ? 0.02 : 0.0); v.z0 = bajo; }
  // Artefacto que descarga en un caño que va por pared o contrapiso: no atraviesa la losa ahí.
  const arriba = caños.find(c => c.piso === P && (c.modo === 'pared' || c.modo === 'contrapiso' || c.modo === 'mesada') && c.p3.some(p => Math.hypot(p[0] - v.x, p[1] - v.y) < 0.12));
  if (v.tipo !== 'montante' && arriba) v.z0 = Math.min(...arriba.p3.map(p => p[2]));
}
// Extremos libres de aguas arriba de los caños colgados: ahí sube la descarga del artefacto atravesando la losa.
const cerca = (P, x, y, salvo) => caños.some(c => c !== salvo && c.piso === P && c.pts.some((q, i) => i && dSeg({ x, y }, { x: c.pts[i - 1][0], y: c.pts[i - 1][1] }, { x: q[0], y: q[1] }) < 0.06));
for (const c of caños.filter(c => (c.modo === 'cielorraso' || c.modo === 'bajo_viga') && c.nivelCielo === c.piso.piso && c.sis !== 'extraccion')) {
  const [x, y, z] = c.p3[0];
  if (cerca(c.piso, x, y, c) || verticales.some(v => v.piso === c.piso && Math.hypot(v.x - x, v.y - y) < 0.12)) continue;
  verticales.push({ piso: c.piso, tipo: 'artefacto', sis: c.sis, d: c.d, x, y, z0: z, z1: c.piso.zPiso + 0.02 });
}

// ---------- Uniones entre caños (piezas de unión) ----------
// codo: cambio de dirección entre una vertical y un tramo; ramal: un caño acomete a otro que sigue;
// cupla: dos tramos alineados que se empalman. Las cotas se ajustan para que las piezas cierren.
const uniones = [];
const norm = v => { const l = Math.hypot(...v) || 1; return v.map(q => q / l); };
const r3 = x => Math.round(x * 1000) / 1000;
function proyectar(c, x, y) {
  let best = null;
  for (let i = 1; i < c.p3.length; i++) {
    const a = c.p3[i - 1], b = c.p3[i], dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
    let t = L ? ((x - a[0]) * dx + (y - a[1]) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(a[0] + t * dx - x, a[1] + t * dy - y);
    if (!best || d < best.d) best = { d, i, t, z: a[2] + (b[2] - a[2]) * t, dir: norm([dx, dy, b[2] - a[2]]), x: a[0] + t * dx, y: a[1] + t * dy };
  }
  return best;
}
// Dirección del tramo saliendo desde un extremo (0 = inicio, 1 = fin)
const salida = (c, fin) => { const n = c.p3.length; const [a, b] = fin ? [c.p3[n - 1], c.p3[n - 2]] : [c.p3[0], c.p3[1]]; return norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]); };
const extremo = (c, fin) => c.p3[fin ? c.p3.length - 1 : 0];
const colgados = c => ['cielorraso', 'bajo_viga', 'enterrado'].includes(c.modo) && c.sis !== 'extraccion';
// 1) Caídas de artefactos, PPA, embudos e inodoros: abajo empalman con el tramo colgado del piso.
for (const v of verticales.filter(v => ['artefacto', 'inodoro', 'embudo'].includes(v.tipo) && v.z0 < v.piso.zPiso)) {
  let mejor = null;
  for (const c of caños.filter(c => c.piso === v.piso && colgados(c) && (c.nivelCielo === v.piso.piso || c.modo === 'enterrado'))) {
    const p = proyectar(c, v.x, v.y); if (p.d < 0.15 && (!mejor || p.d < mejor.p.d)) mejor = { c, p };
  }
  if (!mejor) continue;
  const { c, p } = mejor;
  const fin = [0, 1].find(f => { const e = extremo(c, f); return Math.hypot(e[0] - v.x, e[1] - v.y) < 0.12; });
  if (fin !== undefined) {
    const e = extremo(c, fin); e[0] = v.x; e[1] = v.y; v.z0 = e[2];
    uniones.push({ tipo: 'codo', sis: c.sis, d: Math.max(c.d, v.d), p: [v.x, v.y, e[2]], a: [0, 0, 1], b: salida(c, fin) });
  } else {
    v.x = p.x; v.y = p.y; v.z0 = p.z;
    uniones.push({ tipo: 'ramal', sis: c.sis, d: c.d, dr: v.d, p: [p.x, p.y, p.z], a: p.dir, b: [0, 0, 1] });
  }
}
// 2) Extremos de tramos contra montantes: ramal en la montante (o codo si es el arranque o la llegada de la montante).
const usados = new Set();
for (const c of caños.filter(colgados)) for (const fin of [0, 1]) {
  if ((c.ppa || []).includes(fin)) continue;
  const e = extremo(c, fin);
  const m = verticales.filter(v => v.tipo === 'montante' && Math.hypot(v.x - e[0], v.y - e[1]) < 0.2 && e[2] > v.z0 - 0.4 && e[2] < v.z1 + 0.4)
    .sort((a, b) => Math.hypot(a.x - e[0], a.y - e[1]) - Math.hypot(b.x - e[0], b.y - e[1]))[0];
  if (!m) continue;
  e[0] = m.x; e[1] = m.y; usados.add(c.p3 + fin);
  const out = salida(c, fin);
  if (Math.abs(e[2] - m.z1) < 0.25) { m.z1 = e[2]; uniones.push({ tipo: 'codo', sis: c.sis, d: Math.max(c.d, m.d), p: [...e], a: [0, 0, -1], b: out }); }
  else if (Math.abs(e[2] - m.z0) < 0.25 && fin === 1) { m.z0 = e[2]; uniones.push({ tipo: 'codo', sis: c.sis, d: Math.max(c.d, m.d), p: [...e], a: [0, 0, 1], b: out }); }
  else { m.z0 = Math.min(m.z0, e[2] - 0.05); m.z1 = Math.max(m.z1, e[2] + 0.05); uniones.push({ tipo: 'ramal', sis: m.sis, d: m.d, dr: c.d, p: [...e], a: [0, 0, 1], b: out }); }
}
// 3) Extremos de tramos contra otros tramos del mismo piso y misma cota aproximada.
for (const c of caños.filter(colgados)) for (const fin of [0, 1]) {
  if (usados.has(c.p3 + fin) || (c.ppa || []).includes(fin)) continue;
  const e = extremo(c, fin);
  let mejor = null;
  for (const o of caños.filter(o => o !== c && o.piso === c.piso && colgados(o) && o.nivelCielo === c.nivelCielo)) {
    const p = proyectar(o, e[0], e[1]); if (p.d < 0.08 && Math.abs(p.z - e[2]) < 0.35 && (!mejor || p.d < mejor.p.d)) mejor = { o, p };
  }
  if (!mejor) continue;
  const { o, p } = mejor;
  // El tramo que acomete se corre en altura para llegar justo a la cota del otro (mantiene su pendiente).
  const dz = p.z - e[2]; if (Math.abs(dz) > 1e-4) c.p3.forEach(q => q[2] += dz);
  e[0] = p.x; e[1] = p.y; usados.add(c.p3 + fin);
  const enExtremo = (p.i === 1 && p.t < 0.02) || (p.i === o.p3.length - 1 && p.t > 0.98);
  const out = salida(c, fin);
  if (enExtremo) {
    const finO = p.i === 1 && p.t < 0.02 ? 0 : 1; usados.add(o.p3 + finO);
    const outO = salida(o, finO), ang = Math.acos(Math.max(-1, Math.min(1, -(out[0] * outO[0] + out[1] * outO[1] + out[2] * outO[2]))));
    uniones.push({ tipo: ang > 0.26 ? 'codo' : 'cupla', sis: c.sis, d: Math.max(c.d, o.d), p: [p.x, p.y, p.z], a: outO, b: out });
  } else uniones.push({ tipo: 'ramal', sis: o.sis, d: o.d, dr: c.d, p: [p.x, p.y, p.z], a: p.dir, b: out });
}
// ---------- Artefactos: cada rótulo se ubica en la descarga compatible más cercana ----------
// Inodoro: descarga de Ø110. Pileta de cocina: arranque del caño bajo mesada. El resto: descargas de Ø40/Ø63.
// El frente del artefacto mira hacia donde está escrito el rótulo (el plano no trae los bloques de artefactos).
const artefactos = [];
for (const P of PISOS) {
  const cand = [];
  for (const v of verticales.filter(v => v.piso === P && (v.tipo === 'artefacto' || v.tipo === 'inodoro'))) cand.push({ x: v.x, y: v.y, d: v.d, sis: v.sis });
  for (const c of caños.filter(c => c.piso === P && ['mesada', 'pared', 'contrapiso'].includes(c.modo))) cand.push({ x: c.p3[0][0], y: c.p3[0][1], d: c.d, sis: c.sis, mesada: c.modo === 'mesada' });
  const labels = artTextos.filter(t => t.piso === P);
  const pares = [];
  for (const [i, t] of labels.entries()) for (const [j, c] of cand.entries()) {
    const dist = Math.hypot(c.x - t.p[0], c.y - t.p[1]);
    const ok = t.tipo === 'inodoro' ? c.d >= 0.1 : c.d < 0.1;
    if (!ok || dist > 1.4) continue;
    pares.push({ i, j, puntaje: dist - (t.tipo === 'pileta' && c.mesada ? 0.6 : 0) });
  }
  pares.sort((a, b) => a.puntaje - b.puntaje);
  const usadoL = new Set(), usadoC = new Set();
  for (const p of pares) {
    if (usadoL.has(p.i) || usadoC.has(p.j)) continue;
    usadoL.add(p.i); usadoC.add(p.j);
    const t = labels[p.i], c = cand[p.j];
    let fx = t.p[0] - c.x, fy = t.p[1] - c.y; const L = Math.hypot(fx, fy);
    if (L < 0.15) { fx = 1; fy = 0; } else { fx /= L; fy /= L; }
    // Se redondea a la dirección ortogonal más cercana: los artefactos van contra paredes.
    if (Math.abs(fx) > Math.abs(fy)) { fx = Math.sign(fx); fy = 0; } else { fy = Math.sign(fy); fx = 0; }
    artefactos.push({ tipo: t.tipo, piso: P.id, x: r3(c.x), y: r3(c.y), z: P.zPiso, frente: [fx, fy], d: c.d, sis: c.sis });
  }
  // Inodoros cuya caída empalma a mitad de un caño de Ø110: se busca el caño más cercano y se agrega la caída.
  labels.forEach((t, i) => {
    if (usadoL.has(i) || t.tipo !== 'inodoro') return;
    let mejor = null;
    for (const c of caños.filter(c => c.piso === P && c.d >= 0.1 && c.sis === 'primaria' && colgados(c) && c.nivelCielo === P.piso)) {
      const p = proyectar(c, t.p[0], t.p[1]); if (p.d < 1.2 && (!mejor || p.d < mejor.p.d)) mejor = { c, p };
    }
    if (!mejor) return;
    const { c, p } = mejor; usadoL.add(i);
    const ini = c.p3[0], fin = c.p3[c.p3.length - 1];
    const extremoCerca = [[ini, 0], [fin, 1]].find(([e]) => Math.hypot(e[0] - p.x, e[1] - p.y) < 0.35);
    let x = p.x, y = p.y, z = p.z;
    if (extremoCerca) { [x, y, z] = extremoCerca[0]; uniones.push({ tipo: 'codo', sis: 'primaria', d: 0.11, p: [x, y, z], a: [0, 0, 1], b: salida(c, extremoCerca[1]) }); }
    else uniones.push({ tipo: 'ramal', sis: 'primaria', d: c.d, dr: 0.11, p: [x, y, z], a: p.dir, b: [0, 0, 1] });
    verticales.push({ piso: P, tipo: 'inodoro', sis: 'primaria', d: 0.11, x, y, z0: z, z1: P.zPiso + 0.02 });
    let fx = t.p[0] - x, fy = t.p[1] - y; if (Math.abs(fx) > Math.abs(fy)) { fx = Math.sign(fx) || 1; fy = 0; } else { fy = Math.sign(fy) || 1; fx = 0; }
    artefactos.push({ tipo: 'inodoro', piso: P.id, x: r3(x), y: r3(y), z: P.zPiso, frente: [fx, fy], d: 0.11, sis: 'primaria' });
  });
  labels.forEach((t, i) => { if (!usadoL.has(i)) { artefactos.push({ tipo: t.tipo, piso: P.id, x: r3(t.p[0]), y: r3(t.p[1]), z: P.zPiso, frente: [1, 0], sinDescarga: true }); } });
}
// Cámara de inspección de PB (rectángulo de 60x60 en la capa de primaria)
for (const e of san.entities.filter(e => e.layer === 'CLOACA PRIMARA' && e.type === 'LWPOLYLINE' && e.shape && e.vertices.length >= 4)) {
  const xs = e.vertices.map(v => v.x), ys = e.vertices.map(v => v.y);
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
  if (Math.abs(w - 0.6) < 0.05 && Math.abs(h - 0.6) < 0.05 && enHoja(e.vertices[0], PISOS[0].y0)) {
    const [x, y] = aSKP((Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2, PISOS[0].y0);
    piezas.push({ tipo: 'camara', piso: 'PB', x, y, z: PISOS[0].zPiso });
  }
}

// ---------- Pases requeridos vs pases del ingeniero ----------
const pasesReq = [];
for (const v of verticales) { const P = v.piso; if (!P.pases) continue; if (v.z0 < P.zPiso && v.z1 > P.zPiso - 0.05) pasesReq.push({ piso: P, x: v.x, y: v.y, d: v.d, sis: v.sis, origen: v.tipo }); }
// Tramos "por pared, baja en pase": el extremo de aguas abajo baja en un pase.
for (const c of caños.filter(c => c.modo === 'pared' || c.modo === 'contrapiso')) {
  const [x, y] = c.pts[c.pts.length - 1]; if (c.piso.pases) pasesReq.push({ piso: c.piso, x, y, d: c.d, sis: c.sis, origen: c.modo });
}
const pasesIng = [];
for (const P of PISOS.filter(p => p.pases)) for (const r of PASES[P.pases] || []) pasesIng.push({ piso: P, ...r, usado: false });
for (const q of pasesReq) {
  // "Baja en pase" no dice exactamente dónde: se acepta un pase a menos de 50 cm del extremo.
  const tol = (q.origen === 'pared' || q.origen === 'contrapiso' || q.origen === 'mesada' ? 0.5 : 0.10) + q.d / 2;
  const p = pasesIng.find(p => p.piso === q.piso && q.x >= p.x0 - tol && q.x <= p.x1 + tol && q.y >= p.y0 - tol && q.y <= p.y1 + tol);
  q.ok = !!p; if (p) p.usado = true;
}
// Un pase del ingeniero que cae sobre la traza de un caño colgado es la caída de un artefacto que empalma ahí.
for (const p of pasesIng.filter(p => !p.usado)) {
  const c = { x: (p.x0 + p.x1) / 2, y: (p.y0 + p.y1) / 2 }, r = Math.max(p.x1 - p.x0, p.y1 - p.y0) / 2;
  p.usado = caños.some(k => k.piso === p.piso && (k.modo === 'cielorraso' || k.modo === 'bajo_viga') && k.nivelCielo === p.piso.piso &&
    k.pts.some((q, i) => i && dSeg(c, { x: k.pts[i - 1][0], y: k.pts[i - 1][1] }, { x: q[0], y: q[1] }) < r + 0.05));
  if (p.usado) p.artefacto = true;
}
// Pases del ingeniero que no usa la sanitaria (pueden ser de otras instalaciones).
// Se deduplican los requeridos muy cercanos (mismo pase).
const dedup = []; for (const q of pasesReq) { if (!dedup.some(o => o.piso === q.piso && Math.hypot(o.x - q.x, o.y - q.y) < 0.06)) dedup.push(q); else { const o = dedup.find(o => o.piso === q.piso && Math.hypot(o.x - q.x, o.y - q.y) < 0.06); o.ok = o.ok || q.ok; o.d = Math.max(o.d, q.d); } }

// ---------- Cruces de caños con vigas y columnas ----------
const cruces = [];
for (const c of caños.filter(c => c.modo === 'cielorraso' || c.modo === 'bajo_viga')) {
  const niv = c.nivelCielo || c.piso.techo;
  for (let i = 1; i < c.p3.length; i++) {
    for (const vg of vigasDe(niv)) {
      const t = cruzaRect(c.p3[i - 1], c.p3[i], vg); if (!t) continue;
      const zTop = c.p3[i - 1][2] + R(c);
      if (zTop > vg.b[2][0] + 0.005 && c.p3[i - 1][2] - R(c) < vg.b[2][1]) {
        const tm = (t[0] + t[1]) / 2, x = c.p3[i - 1][0] + (c.p3[i][0] - c.p3[i - 1][0]) * tm, y = c.p3[i - 1][1] + (c.p3[i][1] - c.p3[i - 1][1]) * tm;
        if (!cruces.some(k => k.viga === vg.n && k.nivel === niv && Math.hypot(k.x - x, k.y - y) < 0.3))
          cruces.push({ piso: c.piso.nombre, nivel: niv, viga: vg.n, vigaId: vg.id, sis: c.sis, d: c.d, x, y, z: c.p3[i - 1][2], alto: +(vg.b[2][1] - vg.b[2][0]).toFixed(2) });
      }
    }
  }
}

// ---------- Salida ----------
const r2 = x => Math.round(x * 100) / 100;
const NOMSIS = { primaria: 'Cloacal primaria', secundaria: 'Cloacal secundaria', pluvial: 'Pluvial', ventilacion: 'Ventilación', extraccion: 'Extracción baños', aire: 'Desagüe aire acond.' };
const out = { tramos: [], pases: [], pasesSinUso: [], cruces: [], notas: [...new Set(notasUsadas)], avisos };
let n = 0;
for (const c of caños) out.tramos.push({ id: 'T' + (++n), piso: c.piso.id, sis: c.sis, d: c.d, modo: c.modo, nota: c.nota, largo: r2(c.p3.reduce((a, p, i) => i ? a + Math.hypot(p[0] - c.p3[i - 1][0], p[1] - c.p3[i - 1][1], p[2] - c.p3[i - 1][2]) : 0, 0)), p: c.p3.flat().map(v => Math.round(v * 100)) });
for (const v of verticales) out.tramos.push({ id: 'T' + (++n), piso: v.piso.id, sis: v.sis, d: v.d, modo: v.tipo === 'montante' ? 'montante' : 'caida', tipoV: v.tipo, num: v.num, nota: null, largo: r2(v.z1 - v.z0), p: [v.x, v.y, v.z0, v.x, v.y, v.z1].map(q => Math.round(q * 100)) });
out.pases = dedup.map((q, i) => ({ id: 'P' + (i + 1), piso: q.piso.id, losa: q.piso.piso, x: r2(q.x), y: r2(q.y), z: q.piso.zPiso, d: q.d, sis: q.sis, origen: q.origen, ok: q.ok }));
out.pasesSinUso = pasesIng.filter(p => !p.usado).map(p => ({ piso: p.piso.id, losa: p.piso.piso, x0: r2(p.x0), y0: r2(p.y0), x1: r2(p.x1), y1: r2(p.y1), z: p.piso.zPiso }));
out.pasesIng = pasesIng.map(p => ({ piso: p.piso.id, losa: p.piso.piso, x0: r2(p.x0), y0: r2(p.y0), x1: r2(p.x1), y1: r2(p.y1), z: p.piso.zPiso, usado: p.usado }));
out.cruces = cruces.map((k, i) => ({ id: 'X' + (i + 1), ...k, x: r2(k.x), y: r2(k.y), z: r2(k.z) }));
out.artefactos = artefactos;
out.piezas = piezas.map(p => ({ ...p, x: r3(p.x), y: r3(p.y) }));
out.uniones = uniones.map(u => ({ ...u, p: u.p.map(r3), a: u.a.map(r3), b: u.b.map(r3) }));
// nivel: la losa con la que se muestra cada piso en el tablero (la de su techo; los techos, con la de la sala de máquinas)
out.pisos = PISOS.map(p => ({ id: p.id, nombre: p.nombre, z: p.zPiso, nivel: p.techo || p.piso }));
out.sistemas = NOMSIS;
fs.writeFileSync('sanitaria.json', JSON.stringify(out));

// Resumen
const met = {}; out.tramos.forEach(t => { const k = `${NOMSIS[t.sis]} Ø${Math.round(t.d * 1000)}`; met[k] = (met[k] || 0) + t.largo; });
console.log('tramos', out.tramos.length, '| metros:'); Object.entries(met).sort().forEach(([k, v]) => console.log('  ', k.padEnd(30), v.toFixed(1)));
console.log('pases requeridos', out.pases.length, 'con pase del ingeniero', out.pases.filter(p => p.ok).length);
PISOS.forEach(P => { const l = out.pases.filter(p => p.piso === P.id); if (l.length) console.log('  ', P.nombre, l.length, 'req,', l.filter(p => !p.ok).length, 'sin pase |', out.pasesSinUso.filter(p => p.piso === P.id).length, 'pases ing. sin caño'); });
console.log('cruces con vigas', out.cruces.length); out.cruces.forEach(k => console.log('  ', k.piso, '| bajo', k.nivel, '|', k.viga, '(alto', k.alto + ')', '|', NOMSIS[k.sis], 'Ø' + Math.round(k.d * 1000)));
console.log('modos', JSON.stringify(caños.reduce((a, c) => (a[c.modo] = (a[c.modo] || 0) + 1, a), {})));
console.log(out.notas.join('\n'));
