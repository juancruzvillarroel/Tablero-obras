const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 90)); t = t.replace(a, b); };
r('const camara = new THREE.PerspectiveCamera(38, 1, 0.1, 500);', 'const camara = new THREE.PerspectiveCamera(38, 1, 0.1, 2000);');
// La navegación propia (ruedita) no tiene los topes de OrbitControls: se limita a una distancia razonable del edificio
// y, si la cámara queda en un estado inválido, se vuelve a encuadrar en lugar de dejar la vista vacía.
r(`let nav = null;`, `const LIMITE_CAM = () => CAJA.getSize(new THREE.Vector3()).length() * 4;
function camaraValida() {
  const ok = [...camara.position.toArray(), ...ctrl.target.toArray()].every(Number.isFinite) && camara.position.distanceTo(ctrl.target) > 0.05;
  if (!ok) { calcularEncuadre(); camara.position.set(...VISTA_INI.pos); ctrl.target.set(...VISTA_INI.tgt); camara.lookAt(ctrl.target); ctrl.update(); }
  return ok;
}
const lejos = p => p.distanceTo(CAJA.getCenter(new THREE.Vector3())) > LIMITE_CAM();
let nav = null;`);
r(`    const mov = der.multiplyScalar(-mx * k).add(arr.multiplyScalar(my * k));
    camara.position.add(mov); ctrl.target.add(mov);`,
`    const mov = der.multiplyScalar(-mx * k).add(arr.multiplyScalar(my * k));
    if (!lejos(ctrl.target.clone().add(mov))) { camara.position.add(mov); ctrl.target.add(mov); }`);
r(`  camara.lookAt(ctrl.target); ctrl.update();
}, { capture: true });`, `  camara.lookAt(ctrl.target); ctrl.update(); camaraValida();
}, { capture: true });`);
r(`  if (nuevo.length() < 0.4 && f < 1) return;                // no meterse adentro del elemento
  camara.position.copy(p).add(nuevo); ctrl.target.sub(p).multiplyScalar(f).add(p);
  ctrl.update();`,
`  if (nuevo.length() < 0.4 && f < 1) return;                // no meterse adentro del elemento
  if (f > 1 && lejos(p.clone().add(nuevo))) return;          // ni alejarse hasta perder el edificio
  camara.position.copy(p).add(nuevo); ctrl.target.sub(p).multiplyScalar(f).add(p);
  ctrl.update(); camaraValida();`);
fs.writeFileSync('tablero.template.html', t); console.log('ok');
