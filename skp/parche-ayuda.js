const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 90)); t = t.replace(a, b); };
r("arrastrá las flechas de las puntas (largo) o la de arriba (altura); se engancha con columnas, vigas, losas y otros muros. Alt: sin enganche. Esc: terminar.",
  "arrastrá las flechas de las puntas (largo), la de arriba (altura) o la manija de cuatro puntas (mover); se engancha con columnas, vigas, losas y otros muros. Shift: mover en una sola dirección. Alt: sin enganche. Esc: terminar. Ctrl+Z deshace.");
r("<button type=\"button\" class=\"btn\" data-eliminar-muro=\"${m.id}\" style=\"justify-self:start;margin-top:4px\">Eliminar muro</button>", "");
fs.writeFileSync('tablero.template.html', t); console.log('ok');
