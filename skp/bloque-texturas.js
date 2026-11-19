// ---------- Texturas dibujadas ----------
// No buscan fotorrealismo: son el "dibujo" de cada material. Hormigón: gris con punteado y los triangulitos del
// rayado de hormigón de plano. Ladrillo: hiladas en traba con juntas. Las coordenadas de textura se calculan en
// metros sobre la cara de cada pieza, así el ladrillo mide lo mismo en cualquier muro (33 × 18 cm + junta de 1 cm).
function azar(semilla) { let s = semilla; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function canvasHormigon() {
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), r = azar(11);
  g.fillStyle = '#d6d5d0'; g.fillRect(0, 0, N, N);
  const repetir = (x, y, m, f) => { for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) if (x + dx > -m && x + dx < N + m && y + dy > -m && y + dy < N + m) f(x + dx, y + dy); };
  for (let i = 0; i < 140; i++) { const x = r() * N, y = r() * N, rad = 20 + r() * 50; repetir(x, y, rad, (px, py) => { g.fillStyle = `rgba(${r() < .5 ? '120,118,112' : '235,234,230'},0.06)`; g.beginPath(); g.arc(px, py, rad, 0, 7); g.fill(); }); }
  for (let i = 0; i < 1600; i++) { const x = r() * N, y = r() * N, rad = 0.5 + r() * 1.5, a = 0.2 + r() * 0.35; repetir(x, y, 3, (px, py) => { g.fillStyle = `rgba(85,84,80,${a})`; g.beginPath(); g.arc(px, py, rad, 0, 7); g.fill(); }); }
  for (let i = 0; i < 60; i++) {
    const x = r() * N, y = r() * N, t = 5 + r() * 7, ang = r() * 6.28;
    repetir(x, y, t + 2, (px, py) => { g.strokeStyle = 'rgba(78,77,73,.6)'; g.lineWidth = 1.3; g.beginPath(); for (let k = 0; k < 3; k++) { const an = ang + k * 2.094, qx = px + Math.cos(an) * t, qy = py + Math.sin(an) * t; k ? g.lineTo(qx, qy) : g.moveTo(qx, qy); } g.closePath(); g.stroke(); });
  }
  return c;
}
function canvasLadrillo() {
  // 800 px por metro: ladrillo de 33 × 18 cm, junta de 1 cm; el mosaico tiene 2 ladrillos × 2 hiladas (0,68 × 0,38 m)
  const PX = 800, L = 0.33 * PX, H = 0.18 * PX, J = 0.01 * PX, W = 2 * (L + J), A = 2 * (H + J);
  const c = document.createElement('canvas'); c.width = Math.round(W); c.height = Math.round(A); const g = c.getContext('2d'), r = azar(5);
  g.fillStyle = '#d9d0c3'; g.fillRect(0, 0, c.width, c.height);
  for (let fila = 0; fila < 2; fila++) {
    const y = fila * (H + J) + J / 2, desf = fila ? (L + J) / 2 : 0;
    for (let k = -1; k < 3; k++) {
      const x = desf + k * (L + J) + J / 2, tono = r();
      g.fillStyle = `rgb(${186 + tono * 22 | 0},${98 + tono * 18 | 0},${60 + tono * 12 | 0})`; g.fillRect(x, y, L, H);
      for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${r() < .5 ? '120,55,30' : '230,160,120'},${0.08 + r() * 0.12})`; g.fillRect(x + r() * L, y + r() * H, 1 + r() * 2, 1 + r() * 2); }
      g.strokeStyle = 'rgba(110,50,25,.35)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, L - 1, H - 1);
    }
  }
  return c;
}
const LIENZOS = { hormigon: canvasHormigon(), ladrillo: canvasLadrillo() };
const TAM_TEX = { hormigon: [1, 1], ladrillo: [0.68, 0.38] };
const TEX = {};
for (const k of Object.keys(LIENZOS)) {
  const t = new THREE.CanvasTexture(LIENZOS[k]); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / TAM_TEX[k][0], 1 / TAM_TEX[k][1]); t.anisotropy = renderer.capabilities.getMaxAnisotropy(); TEX[k] = t;
}
const NOM_TEX = { hormigon: 'Hormigón', ladrillo: 'Ladrillo cerámico', liso: 'Color liso' };
// Coordenadas de textura en metros, proyectando cada triángulo sobre su plano dominante
function uvMundo(geo) {
  const p = geo.attributes.position, n = p.count, uv = new Float32Array(n * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3();
  for (let i = 0; i + 2 < n; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    ab.subVectors(b, a); ac.subVectors(c, a); ab.cross(ac);
    const ax = Math.abs(ab.x), ay = Math.abs(ab.y), az = Math.abs(ab.z);
    [a, b, c].forEach((q, k) => { let u, v; if (ay >= ax && ay >= az) { u = q.x; v = q.z; } else if (ax >= az) { u = q.z; v = q.y; } else { u = q.x; v = q.y; } uv[(i + k) * 2] = u; uv[(i + k) * 2 + 1] = v; });
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geo;
}

// ---------- Capas: grupo > elemento, con encendido, color y textura (se guardan en este navegador) ----------
const CAPAS_DEF = [
  { id: 'estructura', nombre: 'Estructura', capas: [['columna', 'Columnas', 'hormigon', '#ffffff'], ['viga', 'Vigas', 'hormigon', '#f2f2f2'], ['losa', 'Losas', 'hormigon', '#fbfbfb'], ['escalera', 'Escaleras', 'hormigon', '#ffffff'], ['tabique', 'Tabiques H°A', 'hormigon', '#ededed'], ['base', 'Bases', 'hormigon', '#e4e4e4'], ['viga_fundacion', 'Vigas de fundación', 'hormigon', '#e4e4e4']] },
  { id: 'albanileria', nombre: 'Albañilería', capas: [['portante12', 'Ladrillo portante 12', 'ladrillo', '#ffffff'], ['hueco12', 'Ladrillo hueco 12', 'ladrillo', '#ffdcc6'], ['hueco8', 'Ladrillo hueco 8', 'ladrillo', '#ffeedd']] },
  { id: 'sanitaria', nombre: 'Instalación sanitaria', capas: [['primaria', 'Cloacal primaria', 'liso', null], ['secundaria', 'Cloacal secundaria', 'liso', null], ['pluvial', 'Pluvial', 'liso', null], ['ventilacion', 'Ventilación y extractores', 'liso', null], ['aire', 'Desagüe aire acond.', 'liso', null], ['artefactos', 'Artefactos', 'liso', '#f3f4f6'], ['numeros', 'N° de bajada'], ['pases', 'Faltan pases'], ['cruces', 'Cruces con vigas']] },
];
const CAPA_GRUPO = {}; const CAPA_DEF = {};
for (const g of CAPAS_DEF) for (const [id, nombre, tex, color] of g.capas) { CAPA_GRUPO[id] = g.id; CAPA_DEF[id] = { id, nombre, tex: tex || null, color: color || (tex ? css('--i-' + id) || '#888888' : null) }; }
const capaEstado = {};
{ const g = leer('capas', {}); for (const id of Object.keys(CAPA_DEF)) capaEstado[id] = { on: true, tex: CAPA_DEF[id].tex, color: CAPA_DEF[id].color, ...(g[id] || {}) }; }
const guardarCapas = () => guardar('capas', capaEstado);
const capaOn = id => capaEstado[id] ? capaEstado[id].on : true;
// Aplica color y textura de una capa a un material (con texturas solo en el modo Capas y si la pieza tiene coordenadas)
function vestir(mat, id, conTextura = true) {
  const c = capaEstado[id]; if (!c) return;
  const mapa = conTextura && c.tex && c.tex !== 'liso' ? TEX[c.tex] : null;
  if (mat.map !== mapa) { mat.map = mapa; mat.needsUpdate = true; }
  mat.color.set(c.color || '#ffffff');
}
// Muestra de la capa: la textura teñida, o el color liso
function muestraCSS(id) {
  const c = capaEstado[id]; if (!c || !c.color) return 'background:var(--fg2)';
  if (c.tex && c.tex !== 'liso') return `background-color:${c.color};background-image:url(${LIENZOS[c.tex].toDataURL()});background-size:${c.tex === 'ladrillo' ? '28px 16px' : '40px 40px'};background-blend-mode:multiply`;
  return `background:${c.color}`;
}
