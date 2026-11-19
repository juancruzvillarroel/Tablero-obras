const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 90)); t = t.replace(a, b); };
r('// --- Pases: agujeros reales en la losa', fs.readFileSync('bloque-arrastre.js', 'utf8') + '\n// --- Pases: agujeros reales en la losa');
// sin la manija de mover: ahora se agarra el muro directamente
const i = t.indexOf('  // Manija de mover: arriba del muro'), j = t.indexOf('\n', t.indexOf('\n', i) + 1);
t = t.slice(0, i) + t.slice(j + 1);
r('#lienzo { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; cursor: grab; }',
  '#lienzo { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; cursor: default; }');
r('aria-label="Modelo 3D de la estructura. Arrastrá para orbitar, rueda para acercar, clic para elegir un elemento."',
  'aria-label="Modelo 3D. Ruedita apretada para orbitar, Shift más ruedita para desplazar, girar la ruedita para acercar. Clic para elegir un elemento y arrastrar para moverlo."');
r('También podés buscarla en <b>Elementos</b>.</div>`;',
  'También podés buscarla en <b>Elementos</b>.<br><br><b>Mover:</b> agarrá un muro o un elemento de estructura y arrastralo; se engancha con lo que tiene cerca (Shift: en una dirección, Alt: sin enganche). <b>Navegar</b> como en SketchUp: ruedita apretada orbita, Shift + ruedita desplaza, girar la ruedita acerca hacia el cursor. Ctrl+Z deshace.</div>`;');
r("arrastrá las flechas de las puntas (largo), la de arriba (altura) o la manija de cuatro puntas (mover);", "arrastrá las flechas de las puntas (largo) o la de arriba (altura); para moverlo, agarralo y arrastralo;");
fs.writeFileSync('tablero.template.html', t); console.log('ok');
