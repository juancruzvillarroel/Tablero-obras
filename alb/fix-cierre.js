const fs = require('fs'); let s = fs.readFileSync('armar-muros.js', 'utf8');
const a = "    return { capa: e.layer, v, cerrada: !!e.shape, huecos: [] };\n  }).filter(p => p.v.length >= 3 && Math.abs(area(p.v)) > 1e-4);";
if (!s.includes(a)) throw new Error('x');
s = s.replace(a, `    if (!e.shape && v.length >= 2) {
      // Contorno abierto: el tramo que falta se cierra corto y recto; si es diagonal, en ángulo recto (como sigue
      // el muro); si es largo y recto, el contorno marca un nicho entre muros y no es un muro.
      const [x0, y0] = v[0], [x1, y1] = v[v.length - 1], dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
      if (Math.hypot(dx, dy) > 0.2) {
        if (dx > 0.03 && dy > 0.03) {
          const c1 = [...v, [x0, y1]], c2 = [...v, [x1, y0]];
          v = Math.abs(area(c1)) >= Math.abs(area(c2)) ? c1 : c2;
        } else { avisos.push(\`Banda \${B.y0}: contorno abierto de \${e.layer} tomado como nicho (no muro).\`); return null; }
      }
    }
    return { capa: e.layer, v, cerrada: !!e.shape, huecos: [] };
  }).filter(p => p && p.v.length >= 3 && Math.abs(area(p.v)) > 1e-4);`);
fs.writeFileSync('armar-muros.js', s); console.log('ok');
