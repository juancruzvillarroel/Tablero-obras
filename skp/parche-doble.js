const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 90)); t = t.replace(a, b); };
// Mover solo en edición: el doble clic habilita el elemento (muro o estructura), como pasa con las flechas.
r("const movible = id => !!id && ((id.startsWith('muro:') && muroPorId[id.slice(5)]) || (porId[id] && EL.includes(porId[id])));",
  "const movible = id => !!id && enEdicion === id && ((id.startsWith('muro:') && muroPorId[id.slice(5)]) || (porId[id] && EL.includes(porId[id])));");
r("lienzo.addEventListener('dblclick', ev => { const id = tocar(ev); if (id && id.startsWith('muro:')) editarMuro(id); });",
  "lienzo.addEventListener('dblclick', ev => {\n  const id = tocar(ev); if (!id) return;\n  if (id.startsWith('muro:')) editarMuro(id);\n  else if (porId[id]) { enEdicion = id; if (seleccion !== id) elegir(id); else refrescarResumen(); avisoBreve(`${porId[id].n}: agarralo y arrastralo para moverlo · Esc termina`); }\n});");
// textos de ayuda
r("<b>Mover:</b> agarrá un muro o un elemento de estructura y arrastralo;", "<b>Mover:</b> doble clic sobre un muro o un elemento de estructura y después agarralo y arrastralo;");
r("para moverlo, agarralo y arrastralo;", "o agarrá el muro para moverlo;");
fs.writeFileSync('tablero.template.html', t); console.log('ok');
