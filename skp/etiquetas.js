// --- Números de bajada: una etiqueta por bajada, afuera del edificio, con una línea que la señala ---
// Las montantes de todos los pisos que caen en el mismo lugar (±30 cm) y son del mismo sistema forman una bajada.
// Su número es el que más se repite en las plantas (cada hoja numera las suyas).
const capaEtq = document.createElement('div'); capaEtq.className = 'etiquetas'; lienzo.after(capaEtq); // debajo de los paneles flotantes
const BAJADAS = [];
for (const t of SAN.tramos.filter(t => t.modo === 'montante' && PREF_BAJADA[t.sis])) {
  const x = t.p[0] / 100, y = t.p[1] / 100;
  let b = BAJADAS.find(b => b.sis === t.sis && Math.hypot(b.x - x, b.y - y) < 0.3);
  if (!b) BAJADAS.push(b = { sis: t.sis, x, y, tramos: [], nums: {}, z1: -99 });
  b.tramos.push(t); b.z1 = Math.max(b.z1, t.p[5] / 100);
  if (t.num) b.nums[t.num] = (b.nums[t.num] || 0) + 1;
}
// Contorno del edificio en planta (para sacar las etiquetas afuera)
let bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
for (const e of EL) if (e.t !== 'base' && e.t !== 'viga_fundacion') for (let i = 0; i < e.v.length; i += 3) { bx0 = Math.min(bx0, e.v[i] / 100); bx1 = Math.max(bx1, e.v[i] / 100); by0 = Math.min(by0, e.v[i + 1] / 100); by1 = Math.max(by1, e.v[i + 1] / 100); }
const zTecho = Math.max(...NIV.map(n => n.z));
const ETQ = BAJADAS.filter(b => Object.keys(b.nums).length).map(b => {
  b.num = Object.entries(b.nums).sort((p, q) => q[1] - p[1] || p[0] - q[0])[0][0];
  b.lado = b.y - by0 < by1 - b.y ? -1 : 1;                       // sale por la medianera más cercana
  return b;
});
// Escalonado: si dos etiquetas del mismo lado quedan cerca, la siguiente sube un renglón.
for (const lado of [-1, 1]) {
  const l = ETQ.filter(b => b.lado === lado).sort((p, q) => p.x - q.x);
  l.forEach((b, i) => { b.renglon = 0; for (let j = 0; j < i; j++) if (Math.abs(l[j].x - b.x) < 1.6 && l[j].renglon >= b.renglon) b.renglon = l[j].renglon + 1; });
}
const matLinea = {};
for (const b of ETQ) {
  const z = zTecho + 1.2 + b.renglon * 0.9;
  const yFuera = b.lado < 0 ? by0 - 1.6 : by1 + 1.6;
  b.ancla = v3(b.x, yFuera, z);
  // Línea: sube desde la punta de la bajada y sale horizontal hacia afuera del edificio.
  const puntos = [v3(b.x, b.y, b.z1), v3(b.x, b.y, z), b.ancla];
  const linea = new THREE.Line(new THREE.BufferGeometry().setFromPoints(puntos), matLinea[b.sis] ||= new THREE.LineBasicMaterial({ color: css('--i-' + b.sis) }));
  const punto = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), mS(b.sis)); punto.position.copy(puntos[0]);
  escena.add(linea, punto); b.linea = linea; b.punto = punto;
  const el = document.createElement('div'); el.className = 'etq-bajada'; el.style.setProperty('--c', `var(--i-${b.sis})`);
  el.textContent = `${PREF_BAJADA[b.sis]} ${b.num}`;
  const pisos = [...new Set(b.tramos.map(t => NOM_PISO[t.piso]))];
  el.title = `${SAN.sistemas[b.sis]} Ø${Math.round(Math.max(...b.tramos.map(t => t.d)) * 1000)} · baja por ${pisos.join(', ')}`;
  capaEtq.append(el); b.el = el;
}
const _v = new THREE.Vector3();
window.__etq = () => {
  const w = lienzo.clientWidth, h = lienzo.clientHeight;
  for (const b of ETQ) {
    const ver = sanOn.numeros && sanOn[b.sis] && b.tramos.some(t => SANP['san:' + t.id]?.m.visible);
    b.linea.visible = b.punto.visible = ver;
    if (!ver) { b.el.hidden = true; continue; }
    _v.copy(b.ancla).project(camara);
    if (_v.z > 1 || Math.abs(_v.x) > 1.05 || Math.abs(_v.y) > 1.05) { b.el.hidden = true; continue; }
    b.el.hidden = false;
    b.el.style.transform = `translate(${((_v.x + 1) / 2 * w).toFixed(1)}px, ${((1 - _v.y) / 2 * h).toFixed(1)}px) translate(-50%, -50%)`;
  }
};

