const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b, todos) => { if (!t.includes(a)) throw new Error('no: ' + a.slice(0, 80)); t = todos ? t.split(a).join(b) : t.replace(a, b); };
// --- Cámara paralela que acompaña a la de perspectiva
r(`const ctrl = new THREE.OrbitControls(camara, lienzo); ctrl.enableDamping = true; ctrl.dampingFactor = 0.12;`,
`const ctrl = new THREE.OrbitControls(camara, lienzo); ctrl.enableDamping = true; ctrl.dampingFactor = 0.12;
// Proyección paralela: se dibuja con una cámara ortográfica que copia la posición y la orientación de la de
// perspectiva, con el tamaño de lo que ve la de perspectiva a la distancia del punto que se mira. Así acercar,
// desplazar y orbitar funcionan igual en los dos modos; solo cambia cómo se proyecta. Todo lo que mira o elige en
// pantalla (dibujo, clics, etiquetas) usa camVista().
const orto = new THREE.OrthographicCamera(-1, 1, 1, -1, -4000, 4000);
let paralela = !!leer('paralela', false);
function camVista() {
  if (!paralela) return camara;
  const h = camara.position.distanceTo(ctrl.target) * Math.tan(THREE.MathUtils.degToRad(camara.fov / 2));
  orto.position.copy(camara.position); orto.quaternion.copy(camara.quaternion);
  orto.top = h; orto.bottom = -h; orto.left = -h * camara.aspect; orto.right = h * camara.aspect;
  orto.updateProjectionMatrix(); orto.updateMatrixWorld(); return orto;
}`);
r(`ray.setFromCamera(ptr, camara);`, `ray.setFromCamera(ptr, camVista());`);
r(`ray2.setFromCamera(ptr2, camara);`, `ray2.setFromCamera(ptr2, camVista());`);
r(`rayC.setFromCamera(ptrC, camara);`, `rayC.setFromCamera(ptrC, camVista());`);
r(`_v.copy(b.ancla).project(camara);`, `_v.copy(b.ancla).project(camVista());`);
r(`else renderer.render(escena, camara);`, `else renderer.render(escena, camVista());`);
r(`  renderer.render(escena, camara);
  if (corte) { renderer.clippingPlanes = []; renderer.autoClear = false; renderer.render(escenaCorte, camara);`, `  const cv = camVista(); renderer.render(escena, cv);
  if (corte) { renderer.clippingPlanes = []; renderer.autoClear = false; renderer.render(escenaCorte, cv);`);
// --- Botones
r(`<div class="flota acciones3d"><button id="encuadrar" type="button">Encuadrar</button><button id="planta" type="button">Planta</button></div>`,
  `<div class="flota acciones3d"><button id="encuadrar" type="button">Encuadrar</button><button id="planta" type="button" title="Planta en 2D, orientada como los planos">Planta</button><button id="iso" type="button" title="Axonométrica isométrica. Otro clic: girar 90°">Isométrica</button><span class="sep" aria-hidden="true"></span><div class="seg" role="group" aria-label="Proyección"><button type="button" data-proyeccion="p">Perspectiva</button><button type="button" data-proyeccion="o">Paralela</button></div></div>`);
r(`.acciones3d button:hover { background: var(--hover); }`, `.acciones3d button:hover { background: var(--hover); }
.acciones3d .sep { width: 1px; background: var(--line); margin: 4px 3px; }
.acciones3d .seg { padding: 0; }`);
r(`$('#planta').onclick = () => {
  const z = nivelSel ? NIV[nivIdx[nivelSel]].z : 3.18;
  volarA(new THREE.Vector3(0.01, z + 30, 0.01), new THREE.Vector3(0, z, 0));
};`, `function ponerProyeccion(o) {
  paralela = !!o; guardar('paralela', paralela);
  document.querySelectorAll('[data-proyeccion]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.proyeccion === 'o') === paralela)));
}
document.querySelectorAll('[data-proyeccion]').forEach(b => b.onclick = () => ponerProyeccion(b.dataset.proyeccion === 'o'));
ponerProyeccion(paralela);
// Distancia para que un rectángulo de ancho a y alto b (en pantalla) entre con un poco de aire
const distPara = (a, b) => Math.max(b / 2, a / 2 / Math.max(camara.aspect, 0.3)) * 1.1 / Math.tan(THREE.MathUtils.degToRad(camara.fov / 2));
// Planta: desde arriba, en proyección paralela (un dibujo 2D, sin fugas), con la misma orientación que los planos
// del CAD: x hacia la derecha e y hacia arriba (en la escena, y del plano = -z). PROY.giroPlanta (grados) la gira
// si algún proyecto lo necesita. Se mira el nivel elegido o, sin nivel, el edificio entero desde arriba.
$('#planta').onclick = () => {
  ponerProyeccion(true);
  const g = THREE.MathUtils.degToRad(PROY.giroPlanta || 0), arriba = new THREE.Vector3(Math.sin(g), 0, -Math.cos(g)), der = new THREE.Vector3(Math.cos(g), 0, Math.sin(g));
  const s = CAJA.getSize(new THREE.Vector3()), c = CAJA.getCenter(new THREE.Vector3());
  const ancho = Math.abs(der.x) * s.x + Math.abs(der.z) * s.z, alto = Math.abs(arriba.x) * s.x + Math.abs(arriba.z) * s.z;
  const z = nivelSel ? NIV[nivIdx[nivelSel]].z : CAJA.max.y, d = distPara(ancho, alto);
  // La cámara apenas corrida hacia "abajo" de la pantalla define hacia dónde queda "arriba" (desvío de 0,0001 m por metro: nada a la vista).
  const tgt = new THREE.Vector3(c.x, z, c.z);
  volarA(tgt.clone().add(new THREE.Vector3(0, d, 0)).addScaledVector(arriba, -d * 1e-4), tgt);
};
// Isométrica: proyección paralela con la vista a 45° en planta y 35,26° de inclinación (los tres ejes con la misma
// escala). Cada clic gira 90° alrededor del edificio.
let esquinaIso = -1;
$('#iso').onclick = () => {
  ponerProyeccion(true);
  const ESQ = [[-1, 1], [1, 1], [1, -1], [-1, -1]];
  const vista = camara.position.clone().sub(ctrl.target).normalize(), esIso = Math.abs(Math.abs(vista.y) - 1 / Math.sqrt(3)) < 0.01;
  esquinaIso = esIso ? (esquinaIso + 1) % 4 : 0;
  const [sx, sz] = ESQ[esquinaIso], dir = new THREE.Vector3(sx, 1, sz).normalize();
  const c = CAJA.getCenter(new THREE.Vector3()), radio = CAJA.getSize(new THREE.Vector3()).length() / 2;
  volarA(c.clone().addScaledVector(dir, distPara(radio * 1.6, radio * 1.6)), c);
};`);
fs.writeFileSync('tablero.template.html', t); console.log('ok');
