const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 80)); t = t.replace(a, b); };
// Estructura: con un elemento elegido, el resto queda opaco y más claro (no transparente)
r(`    const inst = modo === 'instalacion' && !VIGAS_CRUZADAS.has(e.id);
    const fantasma = (seleccion && seleccion !== e.id) || inst;
    mat.opacity = modo === 'instalacion' ? (VIGAS_CRUZADAS.has(e.id) ? 0.45 : e.t === 'losa' ? 0.28 : 0.08) : fantasma ? 0.14 : (modo === 'avance' && est(e.id) === 'pendiente' ? 0.55 : (e.t === 'losa' ? 0.9 : 1));
    mat.depthWrite = !fantasma && modo !== 'instalacion';
    mat.emissive.set(e.id === hover ? 0x2a2a2a : (e.id === seleccion ? 0x1a1a1a : 0x000000));
    m.children[0].visible = !fantasma || inst;`,
`    const inst = modo === 'instalacion' && !VIGAS_CRUZADAS.has(e.id);
    // Con un elemento elegido, el resto se aclara pero sigue opaco (se lee como sólido, no como rayos X).
    // La transparencia queda solo para el modo Instalación, donde sirve para ver los caños.
    const aclarado = !!seleccion && seleccion !== e.id;
    const fantasma = modo === 'instalacion' && (aclarado || inst);
    mat.opacity = modo === 'instalacion' ? (VIGAS_CRUZADAS.has(e.id) ? 0.45 : e.t === 'losa' ? 0.28 : 0.08) : (modo === 'avance' && est(e.id) === 'pendiente' ? 0.55 : 1);
    mat.transparent = mat.opacity < 1; mat.depthWrite = modo !== 'instalacion';
    if (aclarado && modo !== 'instalacion') { mat.color.lerp(BLANCO, 0.5); mat.emissive.set(0x6e6e6e); }
    else mat.emissive.set(e.id === hover ? 0x2a2a2a : (e.id === seleccion ? 0x1c2a40 : 0x000000));
    m.children[0].visible = !fantasma || inst;`);
r('function pintar() {', 'const BLANCO = new THREE.Color(0xffffff);\nfunction pintar() {');
// Muros, caños, piezas y artefactos: aclarado opaco; se respeta la transparencia propia del modo Instalación
r(`function tenue(mat) {
  let f = _tenue.get(mat); if (!f) { f = mat.clone(); _tenue.set(mat, f); }
  f.map = mat.map; if (f.color && mat.color) f.color.copy(mat.color).lerp(new THREE.Color(0xffffff), 0.35);
  f.transparent = true; f.opacity = 0.14; f.depthWrite = false; return f;
}`,
`function tenue(mat) {
  let f = _tenue.get(mat); if (!f) { f = mat.clone(); _tenue.set(mat, f); }
  f.map = mat.map; if (f.color && mat.color) f.color.copy(mat.color).lerp(BLANCO, 0.5);
  if (f.emissive) f.emissive.set(0x6e6e6e);                  // levanta los oscuros: textura con menos contraste
  f.transparent = mat.transparent; f.opacity = mat.opacity; f.depthWrite = mat.depthWrite; return f;
}`);
fs.writeFileSync('tablero.template.html', t); console.log('ok');
