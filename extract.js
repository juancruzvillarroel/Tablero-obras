// Extrae elementos estructurales de las plantas del ingeniero (CYPECAD) del DXF de Argerich 2984.
// Unidades del DXF: metros. Cada planta está en una "banda" de 15 m de alto, con el mismo x.
const fs = require('fs');
const d = JSON.parse(fs.readFileSync('dxf.json'));

const ALTURA_PISO = +(process.env.ALTURA_PISO || 2.90);
const X0 = 73, X1 = 100;
// Bandas (y inferior) y niveles que representan. S/1-3 es la misma losa repetida tres veces.
const BANDAS = [
  { id: 'SB', y0: 105, niveles: [{ id: 'sPB', nombre: 'Losa s/ PB', z: ALTURA_PISO * 1 }] },
  { id: 'S13', y0: 90, niveles: [
    { id: 's1', nombre: 'Losa s/ 1° piso', z: ALTURA_PISO * 2 },
    { id: 's2', nombre: 'Losa s/ 2° piso', z: ALTURA_PISO * 3 },
    { id: 's3', nombre: 'Losa s/ 3° piso', z: ALTURA_PISO * 4 }] },
  { id: 'S4', y0: 75, niveles: [{ id: 's4', nombre: 'Losa s/ 4° piso', z: ALTURA_PISO * 5 }] },
  { id: 'SM', y0: 60, niveles: [{ id: 'sSM', nombre: 'Losa medio nivel S.M.', z: ALTURA_PISO * 5.5 }] },
  { id: 'S5', y0: 45, niveles: [{ id: 's5', nombre: 'Losa s/ 5° (S.M.)', z: ALTURA_PISO * 6 }] },
];
// Origen común de planta: la banda S/B. Todo se lleva a coordenadas locales.
const OX = 74.5, OY = 107.0;

const pt = e => e.startPoint || e.position || (e.vertices && e.vertices[0]) || e.center;
const centroTexto = e => (e.endPoint && e.halign) ? { x: (e.startPoint.x + e.endPoint.x) / 2, y: (e.startPoint.y + e.endPoint.y) / 2 } : pt(e);
const limpiar = s => (s || '').replace(/\\P/g, ' ').replace(/\{|\}|\\[A-Za-z][^;]*;/g, '').trim();

function segmentos(ents) {
  const s = [];
  for (const e of ents) {
    if (e.type === 'LINE') s.push([e.vertices[0], e.vertices[1]]);
    else if (e.vertices && (e.type === 'POLYLINE' || e.type === 'LWPOLYLINE')) {
      const v = e.vertices;
      for (let i = 0; i < v.length - 1; i++) s.push([v[i], v[i + 1]]);
      if (e.shape) s.push([v[v.length - 1], v[0]]);
    }
  }
  return s.map(([a, b]) => [{ x: a.x, y: a.y }, { x: b.x, y: b.y }]);
}

function enBanda(b) {
  return e => { const p = pt(e); return p && p.x > X0 && p.x < X1 && p.y >= b.y0 && p.y < b.y0 + 15; };
}

const loc = (p, b) => ({ x: p.x - OX, y: p.y - (b.y0 - 105) - OY });

// ---------- Columnas: rectángulos armados con líneas sueltas -> componentes conexas ----------
function rectangulos(segs) {
  const k = p => p.x.toFixed(3) + ',' + p.y.toFixed(3);
  const padre = {};
  const f = a => (padre[a] === a ? a : (padre[a] = f(padre[a])));
  const u = (a, b) => { padre[a] ??= a; padre[b] ??= b; padre[f(a)] = f(b); };
  segs.forEach(([a, b]) => u(k(a), k(b)));
  const grupos = {};
  segs.forEach(s => { const r = f(k(s[0])); (grupos[r] ||= []).push(s); });
  return Object.values(grupos).map(g => {
    const xs = g.flatMap(s => [s[0].x, s[1].x]), ys = g.flatMap(s => [s[0].y, s[1].y]);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  }).filter(r => r.x1 - r.x0 > 0.05 && r.y1 - r.y0 > 0.05);
}
const distRect = (p, r) => Math.hypot(Math.max(r.x0 - p.x, 0, p.x - r.x1), Math.max(r.y0 - p.y, 0, p.y - r.y1));

// ---------- Vigas y tabiques: pares de caras paralelas separadas por el ancho ----------
function caraPar(label, ancho, segs, columnas) {
  const th = (label.rot || 0) * Math.PI / 180;
  const u = { x: Math.cos(th), y: Math.sin(th) }, n = { x: -u.y, y: u.x };
  const dot = (p, a) => p.x * a.x + p.y * a.y;
  const lu = dot(label.c, u), lv = dot(label.c, n);
  const grupos = {};
  for (const [a, b] of segs) {
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
    if (L < 0.02 || Math.abs(dx * n.x + dy * n.y) / L > 0.03) continue;
    const v = (dot(a, n) + dot(b, n)) / 2;
    const key = Math.round(v * 200);
    const iv = [Math.min(dot(a, u), dot(b, u)), Math.max(dot(a, u), dot(b, u))];
    (grupos[key] ||= { v, ivs: [] }).ivs.push(iv);
  }
  // Une tramos de una misma cara salvo que el hueco esté ocupado por una columna
  // (ahí termina la viga); los huecos por vigas perpendiculares se saltan.
  const colsUV = columnas.map(r => {
    const cs = [[r.x0, r.y0], [r.x1, r.y0], [r.x0, r.y1], [r.x1, r.y1]].map(([x, y]) => ({ x, y }));
    const us = cs.map(c => dot(c, u)), vs = cs.map(c => dot(c, n));
    return { u0: Math.min(...us), u1: Math.max(...us), v0: Math.min(...vs), v1: Math.max(...vs) };
  });
  const lineas = Object.values(grupos).map(g => {
    const ivs = g.ivs.sort((a, b) => a[0] - b[0]); const m = [];
    for (const iv of ivs) {
      const ult = m[m.length - 1];
      if (ult && iv[0] - ult[1] < 2.0) {
        const hueco = [ult[1], iv[0]];
        const col = iv[0] - ult[1] > 0.005 && colsUV.some(c => c.u0 <= hueco[0] + 0.02 && c.u1 >= hueco[1] - 0.02 && c.v0 - 0.05 <= g.v && c.v1 + 0.05 >= g.v);
        if (!col) { ult[1] = Math.max(ult[1], iv[1]); continue; }
      }
      m.push([...iv]);
    }
    return { v: g.v, ivs: m };
  });
  let mejor = null;
  for (let i = 0; i < lineas.length; i++) for (let j = i + 1; j < lineas.length; j++) {
    const A = lineas[i], B = lineas[j];
    if (Math.abs(Math.abs(A.v - B.v) - ancho) > 0.02) continue;
    const vm = (A.v + B.v) / 2; const dv = Math.abs(vm - lv);
    if (dv > 1.0) continue;
    const ia = A.ivs.find(iv => iv[0] - 0.3 <= lu && iv[1] + 0.3 >= lu);
    const ib = B.ivs.find(iv => iv[0] - 0.3 <= lu && iv[1] + 0.3 >= lu);
    if (!ia || !ib) continue;
    // Extensión: la cara más larga (la exterior suele ser continua), recortada a la superposición razonable.
    const u0 = Math.min(ia[0], ib[0]), u1 = Math.max(ia[1], ib[1]);
    if (!mejor || dv < mejor.dv) mejor = { dv, vm, u0, u1 };
  }
  if (!mejor) return null;
  const cu = (mejor.u0 + mejor.u1) / 2;
  return { cx: u.x * cu + n.x * mejor.vm, cy: u.y * cu + n.y * mejor.vm, largo: mejor.u1 - mejor.u0, ang: th, u, n, vm: mejor.vm, u0: mejor.u0, u1: mejor.u1, lu };
}

// ---------- Losas: relleno sobre una grilla de 2 cm con vigas, columnas y tabiques como bordes ----------
function losas(barreras, etiquetas, bbox) {
  const R = 0.02, W = Math.ceil((bbox.x1 - bbox.x0) / R) + 2, H = Math.ceil((bbox.y1 - bbox.y0) / R) + 2;
  const g = new Uint8Array(W * H);
  const gx = x => Math.round((x - bbox.x0) / R) + 1, gy = y => Math.round((y - bbox.y0) / R) + 1;
  for (const [a, b] of barreras) {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (R / 2)) + 1;
    for (let i = 0; i <= n; i++) {
      const x = gx(a.x + (b.x - a.x) * i / n), y = gy(a.y + (b.y - a.y) * i / n);
      for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (x + ox < W && y + oy < H) g[(y + oy) * W + x + ox] = 1;
    }
  }
  const region = new Int32Array(W * H).fill(-1);
  const res = [];
  for (const et of etiquetas) {
    const sx = gx(et.p.x), sy = gy(et.p.y);
    if (sx < 1 || sy < 1 || sx >= W - 1 || sy >= H - 1) continue;
    let si = sy * W + sx;
    if (g[si]) continue;
    if (region[si] >= 0) { res[region[si]].etiquetas.push(et); continue; }
    const id = res.length; const pila = [si]; region[si] = id; const celdas = []; let borde = false;
    while (pila.length) {
      const i = pila.pop(); celdas.push(i);
      const x = i % W, y = (i / W) | 0;
      if (x <= 1 || y <= 1 || x >= W - 2 || y >= H - 2) borde = true;
      for (const j of [i - 1, i + 1, i - W, i + W]) if (j >= 0 && j < W * H && !g[j] && region[j] < 0) { region[j] = id; pila.push(j); }
    }
    // Rectángulos por corridas de filas, fusionando filas iguales consecutivas.
    const filas = {};
    for (const i of celdas) { const y = (i / W) | 0; (filas[y] ||= []).push(i % W); }
    const abiertos = {}; const rects = [];
    const ys = Object.keys(filas).map(Number).sort((a, b) => a - b);
    let prevY = null;
    for (const y of ys) {
      const xs = filas[y].sort((a, b) => a - b); const corr = [];
      let s = xs[0], p = xs[0];
      for (const x of xs.slice(1)) { if (x !== p + 1) { corr.push([s, p]); s = x; } p = x; }
      corr.push([s, p]);
      const nuevos = {};
      for (const [a, b] of corr) {
        const k = a + '-' + b;
        if (abiertos[k] && prevY === y - 1) { abiertos[k].y1 = y; nuevos[k] = abiertos[k]; }
        else { const r = { x0: a, x1: b, y0: y, y1: y }; rects.push(r); nuevos[k] = r; }
      }
      Object.keys(abiertos).forEach(k => delete abiertos[k]); Object.assign(abiertos, nuevos); prevY = y;
    }
    // Se agranda cada celda media celda para cerrar el hueco que deja el trazo de la barrera.
    const r2 = rects.map(r => ({
      x0: bbox.x0 + (r.x0 - 1) * R - R, x1: bbox.x0 + (r.x1 - 1) * R + R,
      y0: bbox.y0 + (r.y0 - 1) * R - R, y1: bbox.y0 + (r.y1 - 1) * R + R,
    }));
    res.push({ etiquetas: [et], area: celdas.length * R * R, borde, rects: r2 });
  }
  return res;
}

const salida = { proyecto: 'Argerich 2984', fuente: 'RICH_ES.dxf (plantas del ingeniero)', alturaPiso: ALTURA_PISO, niveles: [], elementos: [], avisos: [] };
// ================= Fundaciones (planta del ingeniero, abajo de las ETAPAS) =================
const NF = -2.50;
const basesInfo = (() => {
  const zona = e => { const p = pt(e); return p && p.x > 44 && p.x < 68 && p.y > 142 && p.y < 161; };
  const ents = d.entities.filter(zona);
  // Referencia: el tabique C14 (15x300) en S/B y en fundaciones.
  const c14f = rectangulos(segmentos(ents.filter(e => e.layer === 'PILAR_HORMIGON')))
    .find(r => Math.abs(r.x1 - r.x0 - 0.15) < 0.01 && Math.abs(r.y1 - r.y0 - 3.0) < 0.01);
  const sb = d.entities.filter(enBanda(BANDAS[0]));
  const c14p = rectangulos(segmentos(sb.filter(e => e.layer === 'PILAR_HORMIGON')))
    .find(r => Math.abs(r.x1 - r.x0 - 0.15) < 0.01 && Math.abs(r.y1 - r.y0 - 3.0) < 0.01);
  const dx = c14p.x0 - c14f.x0, dy = c14p.y0 - c14f.y0;
  const aLoc = p => ({ x: p.x + dx - OX, y: p.y + dy - OY });
  const rects = ents.filter(e => e.layer === 'Bases' && e.vertices && e.vertices.length >= 4).map(e => {
    const xs = e.vertices.map(v => v.x), ys = e.vertices.map(v => v.y);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  }).filter(r => r.x1 - r.x0 >= 0.9 && r.y1 - r.y0 >= 0.9);
  const textos = ents.filter(e => e.layer === 'Bases' && (e.type === 'TEXT' || e.type === 'MTEXT')).map(e => ({ s: limpiar(e.text), p: pt(e) }));
  const secs = textos.filter(t => /^sec:/.test(t.s));
  const usados = new Set(); const lista = [];
  for (const sc of secs) {
    const m = sc.s.match(/sec:(\d+)x(\d+).*?H:(\d+).*?Tal[oó]n:(\d+)(?:.*?[Tt]ronco:\s*(\d+)x(\d+))?(?:.*?Vol:(\d+,\d+))?/);
    if (!m) continue;
    const nom = textos.find(t => /^B\d+$/.test(t.s) && Math.hypot(t.p.x - sc.p.x, t.p.y - sc.p.y) < 0.4);
    const A = +m[1] / 100, B = +m[2] / 100;
    let mejor = null;
    rects.forEach((r, i) => {
      if (usados.has(i)) return;
      const w = r.x1 - r.x0, h = r.y1 - r.y0;
      if (!(Math.abs(w - A) < 0.03 && Math.abs(h - B) < 0.03) && !(Math.abs(w - B) < 0.03 && Math.abs(h - A) < 0.03)) return;
      const dd = distRect(sc.p, r); if (!mejor || dd < mejor.d) mejor = { d: dd, i, r };
    });
    // B14 (tabique C14) tiene la base dibujada más larga que el rótulo: se toma el rectángulo más cercano.
    if (!mejor) rects.forEach((r, i) => { if (usados.has(i)) return; const dd = distRect(sc.p, r); if (dd < 0.6 && (!mejor || dd < mejor.d)) mejor = { d: dd, i, r }; });
    if (!mejor) { salida.avisos.push(`Fundación: no ubiqué la base ${nom ? nom.s : sc.s.slice(0, 20)}.`); continue; }
    usados.add(mejor.i);
    const H = +m[3] / 100, t = +m[4] / 100;
    const w = mejor.r.x1 - mejor.r.x0, h = mejor.r.y1 - mejor.r.y0;
    // El tronco viene como "a x b" sin orientación: se orienta igual que la base.
    let a = m[5] ? +m[5] / 100 + 0.10 : w * 0.4, b = m[6] ? +m[6] / 100 + 0.10 : h * 0.4;
    if ((w >= h) !== (a >= b)) [a, b] = [b, a];
    a = Math.min(a, w); b = Math.min(b, h);
    const V = w * h * t + (H - t) / 3 * (w * h + a * b + Math.sqrt(w * h * a * b));
    const c = aLoc({ x: (mejor.r.x0 + mejor.r.x1) / 2, y: (mejor.r.y0 + mejor.r.y1) / 2 });
    const Vcype = m[7] ? +m[7].replace(',', '.') : null;
    lista.push({ nombre: nom ? nom.s : 'Base ascensor', H, t, w, h, a, b, V, Vcype, c });
  }
  return lista;
})();
const arranquePB = nombreCol => {
  const n = (nombreCol || '').match(/C0*(\d+)/); if (!n) return 0;
  const b = basesInfo.find(b => b.nombre.match(/B0*(\d+)/)?.[1] === n[1]);
  return b ? NF + b.H : 0;
};

// ================= Recorrido de bandas =================
const r3 = x => Math.round(x * 1000) / 1000;
const nombresPorBanda = {};
const datos = BANDAS.map(b => {
  const ents = d.entities.filter(enBanda(b));
  const capa = l => ents.filter(e => e.layer === l);
  const txt = l => capa(l).filter(e => e.type === 'TEXT' || e.type === 'MTEXT').map(e => ({ s: limpiar(e.text), c: loc(centroTexto(e), b), p: loc(pt(e), b), rot: e.rotation || 0 }));
  const segL = l => segmentos(capa(l)).map(([a, c]) => [loc(a, b), loc(c, b)]);
  const colsRect = rectangulos(segL('PILAR_HORMIGON'));
  const apeados = rectangulos(segL('PILAR_HORMIGON_APEADO'));
  const refs = txt('COLUMNA_REF');
  const nombrar = r => { let m = null; for (const t of refs) { const dd = distRect(t.c, r); if (!m || dd < m.d) m = { d: dd, s: t.s }; } return m && m.d < 1.0 ? m.s : null; };
  const nombresApeados = new Set(apeados.map(nombrar).filter(Boolean));
  // Una columna con rectángulo "apeado" en esta planta nace sobre una viga de esta losa: no tiene tramo debajo.
  const columnas = colsRect.map(r => ({ ...r, nombre: nombrar(r) })).filter(c => !nombresApeados.has(c.nombre));
  nombresPorBanda[b.id] = new Set([...columnas, ...apeados.map(r => ({ nombre: nombrar(r) }))].map(c => c.nombre).filter(Boolean));
  return { b, txt, segL, columnas, apeados, nombrar };
});

// Orden de niveles para saber de dónde arranca cada tramo de columna.
const nivelesOrden = BANDAS.flatMap(b => b.niveles.map(n => ({ ...n, banda: b.id })));
salida.niveles = [{ id: 'base', nombre: 'Fundación', z: NF }, ...nivelesOrden].map(n => ({ id: n.id, nombre: n.nombre, z: r3(n.z) }));

for (const b of basesInfo) {
  // El rótulo de CYPE suele dar algo más que la geometría (incluye el tronco); solo se avisa cuando es imposible.
  if (b.Vcype && b.Vcype > b.w * b.h * b.H * 1.05) salida.avisos.push(`Base ${b.nombre}: el rótulo dice ${b.Vcype} m³, más que un prisma macizo de ${Math.round(b.w*100)}x${Math.round(b.h*100)}x${Math.round(b.H*100)} (${r3(b.w*b.h*b.H)} m³). Parece un rótulo copiado.`);
  salida.elementos.push({
    id: 'base-' + b.nombre, tipo: 'base', nombre: b.nombre, nivel: 'base',
    seccion: `${Math.round(b.w * 100)}x${Math.round(b.h * 100)} H=${Math.round(b.H * 100)}`, volumen: r3(b.V), volumenRotulo: b.Vcype,
    cajas: [
      { x: r3(b.c.x), y: r3(b.c.y), z: r3(NF + b.t / 2), dx: r3(b.w), dy: r3(b.h), dz: r3(b.t), ang: 0 },
      { x: r3(b.c.x), y: r3(b.c.y), z: r3(NF + b.t + (b.H - b.t) / 2), dx: r3(b.w), dy: r3(b.h), dz: r3(b.H - b.t), ang: 0, arriba: [r3(b.a), r3(b.b)] },
    ],
  });
}
datos.forEach(({ b, txt, segL, columnas, apeados }) => {
  const segVigas = segL('VIG_CARAS'), segMuros = segL('MUR_CARAS_HORMIGON');
  const todasCols = [...columnas, ...apeados];
  for (const nivel of b.niveles) {
    const idx = nivelesOrden.findIndex(n => n.id === nivel.id);
    // ---- Columnas: tramo desde el nivel inferior más cercano donde la columna aparece ----
    for (const c of columnas) {
      let z0 = idx === 0 ? arranquePB(c.nombre) : 0;
      for (let i = idx - 1; i >= 0; i--) {
        const ni = nivelesOrden[i];
        if (nombresPorBanda[ni.banda].has(c.nombre) || i === idx - 1 && !c.nombre) { z0 = ni.z; break; }
      }
      if (idx > 0 && z0 === 0 && c.nombre) continue; // nace sobre esta losa: su primer tramo está en el nivel siguiente
      const bx = c.x1 - c.x0, by = c.y1 - c.y0, h = nivel.z - z0;
      salida.elementos.push({
        id: `${nivel.id}-${c.nombre || 'C?'}-${r3(c.x0)}`, tipo: 'columna', nombre: c.nombre || 'C sin nombre', nivel: nivel.id,
        seccion: `${Math.round(Math.min(bx, by) * 100)}x${Math.round(Math.max(bx, by) * 100)}`,
        volumen: r3(bx * by * h),
        cajas: [{ x: r3((c.x0 + c.x1) / 2), y: r3((c.y0 + c.y1) / 2), z: r3(z0 + h / 2), dx: r3(bx), dy: r3(by), dz: r3(h), ang: 0 }],
      });
    }
    // ---- Vigas ----
    const vigasNivel = [];
    for (const t of txt('VIG_DIM_VIGAS')) {
      const m = t.s.match(/^(.+?):\s*(\d+)(?:-(\d+))?x(\d+)(?:-(\d+))?/);
      if (!m) { salida.avisos.push(`${nivel.nombre}: viga "${t.s}" sin sección reconocible.`); continue; }
      const ancho = m[3] ? (+m[2] + +m[3]) / 200 : +m[2] / 100;
      const alto = m[5] ? (+m[4] + +m[5]) / 200 : +m[4] / 100;
      const anchoBusq = m[3] ? +m[2] / 100 : ancho;
      let geo = caraPar(t, anchoBusq, [...segVigas, ...segMuros], todasCols);
      if (!geo && m[3]) geo = caraPar(t, +m[3] / 100, [...segVigas, ...segMuros], todasCols);
      if (!geo) { salida.avisos.push(`${nivel.nombre}: no encontré las caras de ${m[1]} (${t.s}).`); continue; }
      vigasNivel.push({ m, ancho, alto, geo });
    }
    // Dos rótulos sobre la misma línea pueden haber tomado el mismo tramo de cara: se corta
    // en el apoyo perpendicular (cara de viga, tabique o columna) más cercano al punto medio.
    const perp = [...segVigas, ...segMuros, ...segL('PILAR_HORMIGON')];
    for (let i = 0; i < vigasNivel.length; i++) for (let j = i + 1; j < vigasNivel.length; j++) {
      const A = vigasNivel[i].geo, B = vigasNivel[j].geo;
      if (Math.abs(A.ang - B.ang) > 0.05 || Math.abs(A.vm - B.vm) > 0.05) continue;
      if (Math.min(A.u1, B.u1) - Math.max(A.u0, B.u0) < 0.05) continue;
      const [I, D] = A.lu < B.lu ? [A, B] : [B, A];
      const medio = (I.lu + D.lu) / 2; let corte = medio, mejor = Infinity;
      for (const [p, q] of perp) {
        const pu = p.x * I.u.x + p.y * I.u.y, qu = q.x * I.u.x + q.y * I.u.y;
        if (Math.abs(pu - qu) > 0.03) continue;
        const pv = p.x * I.n.x + p.y * I.n.y, qv = q.x * I.n.x + q.y * I.n.y;
        if (Math.min(pv, qv) > I.vm + 0.1 || Math.max(pv, qv) < I.vm - 0.1) continue;
        const cu = (pu + qu) / 2;
        if (cu > I.lu && cu < D.lu && Math.abs(cu - medio) < mejor) { mejor = Math.abs(cu - medio); corte = cu; }
      }
      I.u1 = Math.min(I.u1, corte); D.u0 = Math.max(D.u0, corte);
    }
    for (const { m, ancho, alto, geo: g } of vigasNivel) {
      const cu = (g.u0 + g.u1) / 2;
      const geo = { cx: g.u.x * cu + g.n.x * g.vm, cy: g.u.y * cu + g.n.y * g.vm, largo: g.u1 - g.u0, ang: g.ang };
      salida.elementos.push({
        id: `${nivel.id}-${m[1]}-${r3(geo.cx)}`, tipo: 'viga', nombre: m[1], nivel: nivel.id, seccion: `${m[2]}${m[3] ? '-' + m[3] : ''}x${m[4]}${m[5] ? '-' + m[5] : ''}`,
        largo: r3(geo.largo), volumen: r3(ancho * alto * geo.largo),
        cajas: [{ x: r3(geo.cx), y: r3(geo.cy), z: r3(nivel.z - alto / 2), dx: r3(geo.largo), dy: r3(ancho), dz: r3(alto), ang: r3(geo.ang) }],
      });
    }
    // ---- Tabiques de H°A (caja de ascensor) ----
    const idxPrev = idx > 0 ? nivelesOrden[idx - 1].z : 0;
    for (const t of txt('MUR_REF_MUROS')) {
      const m = t.s.match(/^(M\d+):\s*(\d+)/); if (!m) continue;
      const e = +m[2] / 100;
      const geo = caraPar(t, e, segMuros, []);
      if (!geo) { salida.avisos.push(`${nivel.nombre}: no encontré las caras del tabique ${m[1]}.`); continue; }
      const h = nivel.z - idxPrev;
      salida.elementos.push({
        id: `${nivel.id}-${m[1]}`, tipo: 'tabique', nombre: m[1], nivel: nivel.id, seccion: `e=${m[2]}`, largo: r3(geo.largo),
        volumen: r3(e * geo.largo * h),
        cajas: [{ x: r3(geo.cx), y: r3(geo.cy), z: r3(idxPrev + h / 2), dx: r3(geo.largo), dy: r3(e), dz: r3(h), ang: r3(geo.ang) }],
      });
    }
    // ---- Losas ----
    const alt = txt('PA_NUM_ALTURA');
    const nombresL = alt.filter(t => /^(L\d+|ESC)$/.test(t.s));
    const hs = alt.filter(t => /^h=\d+/.test(t.s));
    const etiquetas = nombresL.map(t => {
      let mh = null; for (const h of hs) { const dd = Math.hypot(h.c.x - t.c.x, h.c.y - t.c.y); if (!mh || dd < mh.d) mh = { d: dd, h: +h.s.slice(2) }; }
      return { nombre: t.s, h: mh && mh.d < 0.6 ? mh.h / 100 : null, p: t.c };
    });
    const desn = txt('PA_DESNIVEL').map(t => ({ v: parseFloat(t.s.replace(',', '.')), p: t.c }));
    const vigueta = txt('COTAS-50');
    const barreras = [...segVigas, ...segMuros, ...segL('PILAR_HORMIGON'), ...segL('PILAR_HORMIGON_APEADO')];
    const regs = losas(barreras, etiquetas, { x0: -2, y0: -2, x1: 24, y1: 12 });
    for (const rg of regs) {
      const et = rg.etiquetas[0];
      if (rg.borde || rg.area > 80) { salida.avisos.push(`${nivel.nombre}: losa ${et.nombre} no tiene contorno cerrado; la salteo.`); continue; }
      const dentro = p => rg.rects.some(r => p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1);
      const dz = (desn.find(dd => dentro(dd.p)) || {}).v || 0;
      const esVig = vigueta.some(v => dentro(v.p));
      const h = et.h || 0.12;
      const nombre = rg.etiquetas.length > 1 ? [...new Set(rg.etiquetas.map(e => e.nombre))].join('+') : et.nombre;
      salida.elementos.push({
        id: `${nivel.id}-${nombre}`, tipo: et.nombre === 'ESC' ? 'escalera' : 'losa', nombre, nivel: nivel.id,
        seccion: `h=${Math.round(h * 100)}${esVig ? ' (viguetas)' : ''}`, area: r3(rg.area), desnivel: dz || undefined,
        volumen: r3(rg.area * h),
        cajas: rg.rects.map(r => ({ x: r3((r.x0 + r.x1) / 2), y: r3((r.y0 + r.y1) / 2), z: r3(nivel.z + dz - h / 2), dx: r3(r.x1 - r.x0), dy: r3(r.y1 - r.y0), dz: r3(h), ang: 0 })),
      });
    }
  }
});

fs.writeFileSync('modelo.json', JSON.stringify(salida));
const res = {};
for (const e of salida.elementos) { const k = e.nivel + ' ' + e.tipo; res[k] ||= { n: 0, v: 0 }; res[k].n++; res[k].v += e.volumen; }
for (const k in res) console.log(k.padEnd(22), res[k].n, res[k].v.toFixed(2) + ' m3');
console.log('avisos:\n' + salida.avisos.join('\n'));
