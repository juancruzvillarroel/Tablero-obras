const fs = require('fs');
let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 70)); t = t.replace(a, b); };

// 1) Encuadre: la cámara se ubica para que el edificio entero entre en la vista.
r(`const VISTA_INI = { pos: [-19, 17, 21], tgt: [0, 6.5, 0] };
camara.position.set(...VISTA_INI.pos); ctrl.target.set(...VISTA_INI.tgt);`,
`// Encuadre: dirección fija (vista de 3/4 desde el frente) y distancia calculada para que entre todo el edificio.
const CAJA = new THREE.Box3(); mallas.forEach(m => CAJA.expandByObject(m));
const VISTA_INI = { pos: [0, 0, 0], tgt: [0, 0, 0] };
function calcularEncuadre() {
  const c = CAJA.getCenter(new THREE.Vector3()), s = CAJA.getSize(new THREE.Vector3());
  const radio = s.length() / 2, fov = camara.fov * Math.PI / 180;
  const fovH = 2 * Math.atan(Math.tan(fov / 2) * Math.max(camara.aspect, 0.5));
  const dist = radio / Math.sin(Math.min(fov, fovH) / 2) * 0.92;
  const dir = new THREE.Vector3(-0.62, 0.48, 0.62).normalize();
  VISTA_INI.tgt = c.toArray(); VISTA_INI.pos = c.clone().add(dir.multiplyScalar(dist)).toArray();
}`);
r(`function tamanio() { const r = lienzo.parentElement.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camara.aspect = r.width / Math.max(1, r.height); camara.updateProjectionMatrix(); }
new ResizeObserver(tamanio).observe(lienzo.parentElement); tamanio();`,
`let encuadrado = false;
function tamanio() {
  const r = lienzo.parentElement.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camara.aspect = r.width / Math.max(1, r.height); camara.updateProjectionMatrix();
  // La primera vez que hay tamaño real se encuadra el edificio completo.
  if (!encuadrado && r.width > 0 && r.height > 0) { encuadrado = true; calcularEncuadre(); camara.position.set(...VISTA_INI.pos); ctrl.target.set(...VISTA_INI.tgt); }
}
new ResizeObserver(tamanio).observe(lienzo.parentElement); tamanio();`);
r(`$('#encuadrar').onclick = () => volarA(`, `$('#encuadrar').onclick = () => calcularEncuadre() || volarA(`);

// 2) Modo instalación: estructura casi invisible; las vigas cruzadas, rojas pero translúcidas.
r(`    mat.opacity = inst ? (e.t === 'losa' ? 0.1 : 0.22) : fantasma`, `    mat.opacity = modo === 'instalacion' ? (VIGAS_CRUZADAS.has(e.id) ? 0.45 : e.t === 'losa' ? 0.05 : 0.09) : fantasma`);
r(`    mat.depthWrite = !fantasma;`, `    mat.depthWrite = !fantasma && modo !== 'instalacion';`);
// 3) Caños con un grosor mínimo visible
r(`const r = Math.max(tr.d / 2, 0.018), partes = [];`, `const r = Math.max(tr.d / 2, 0.03), partes = [];`);
// 4) Textos de la cocina
r(`muro: 'embutido en muro', enterrado:`, `muro: 'embutido en muro', mesada: 'bajo mesada, baja en la pared', enterrado:`);
r(`pared: 'baja en pase (por pared)',`, `pared: 'baja en pase (por pared)', mesada: 'bajada de cocina',`);
r(`No hay un pase del ingeniero a menos de \${q.origen === 'pared' || q.origen === 'contrapiso' ? 50 : 10} cm`, `No hay un pase del ingeniero a menos de \${['pared', 'contrapiso', 'mesada'].includes(q.origen) ? 50 : 10} cm`);
// 5) Tabla de pases más angosta
r(`<thead><tr><th>Losa</th><th>Piso que desagua</th><th class="r">Necesarios</th><th class="r">Coinciden</th><th class="r">Faltan</th><th class="r">Sin caño</th></tr></thead>`,
  `<thead><tr><th>Losa</th><th>Desagua</th><th class="r">Nec.</th><th class="r">OK</th><th class="r">Faltan</th><th class="r">Sin caño</th></tr></thead>`);
// 6) Acceso visible a la instalación desde el resumen
r(`  h += '</section>';
  // Gráfico: hormigón por nivel`, `  h += '</section>';
  h += \`<section class="aviso"><span><b>Instalación sanitaria</b> · \${SAN.pases.filter(q => !q.ok).length} pases faltantes y \${SAN.cruces.length} cruces con vigas para revisar.</span><button class="btn prim" type="button" id="irSan">Ver instalación</button></section>\`;
  // Gráfico: hormigón por nivel`);
r(`  p.querySelector('#cerrarFicha')?.addEventListener('click', () => elegir(null));`, `  p.querySelector('#cerrarFicha')?.addEventListener('click', () => elegir(null));
  p.querySelector('#irSan')?.addEventListener('click', () => abrir('sanitaria'));`);
fs.writeFileSync('tablero.template.html', t);
console.log('ok');
