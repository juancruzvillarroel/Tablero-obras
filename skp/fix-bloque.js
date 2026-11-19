const fs = require('fs'); let b = fs.readFileSync('bloque-san.js', 'utf8');
const r = (x, y) => { if (!b.includes(x)) throw new Error(x.slice(0, 60)); b = b.replace(x, y); };
r(`    s.m.visible = on && visibleNivel(s.nivel);
    if (s.m.material.emissive) s.m.material = s.k === 'tramo' ? mS(s.o.sis) : s.m.material;
  }
  for (const s of Object.values(SANP)) if (s.k === 'tramo') s.m.material = (id => id === seleccion || id === hover ? matSelSan : mS(s.o.sis))(s.m.userData.id);
}`, `    s.m.visible = on && visibleNivel(s.nivel);
    if (s.k === 'tramo') s.m.material = id === seleccion || id === hover ? matSelSan : mS(s.o.sis);
  }
}`);
r(`  const p = $('#p-sanitaria'); p.innerHTML = h;`, `  if (seleccion && SANP[seleccion]) h = '<section><h2>Elemento</h2>' + fichaSan(seleccion).replace('id="cerrarFicha"', 'data-cerrar') + '</section>' + h;
  const p = $('#p-sanitaria'); p.innerHTML = h;
  p.querySelector('[data-cerrar]')?.addEventListener('click', () => elegir(null));`);
fs.writeFileSync('bloque-san.js', b); console.log('ok');
