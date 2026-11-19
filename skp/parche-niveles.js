const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 90)); t = t.split(a).join(b); };
// Panel derecho blanco, como antes; y los paneles sobre el modelo, macizos.
r(`.panel { background: var(--surface);`, `.panel { background: var(--raised);`);
r(`border-bottom: 1px solid var(--line); background: var(--surface); padding-left: 12px;`, `border-bottom: 1px solid var(--line); background: var(--raised); padding-left: 12px;`);
r(`.flota { position: absolute; background: var(--vidrio); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);`, `.flota { position: absolute; background: var(--raised);`);
// Niveles plegables dentro de cada rubro
r(`.nivel-el { border-top: 1px solid var(--line2); }
.nivel-cab { display: flex;`, `.nivel-el { border-top: 1px solid var(--line2); }
.nivel-el > summary { list-style: none; cursor: pointer; }
.nivel-el > summary::-webkit-details-marker { display: none; }
.nivel-el > summary .flecha { width: 12px; height: 12px; flex: none; color: var(--muted); transition: transform .15s; }
.nivel-el[open] > summary .flecha { transform: rotate(90deg); }
.nivel-el > summary:hover { background: var(--hover); }
.nivel-cab .izq { display: flex; align-items: center; gap: 8px; min-width: 0; }
.nivel-cab { display: flex;`);
r(`const abiertos = new Set(['estructura']);`, `const abiertos = new Set(['estructura']);
// Cada nivel de un rubro se pliega solo; arranca cerrado para que la lista sea corta. Se abre solo al buscar
// o cuando el elemento elegido en el modelo está en ese nivel.
const nivAbiertos = new Set();`);
r(`      h += \`<div class="nivel-el"><div class="nivel-cab"><label><input type="checkbox" data-todo="\${r}|\${n.id}"\${todosH ? ' checked' : ''}\${!todosH && algunos ? ' data-mixto' : ''}> \${esc(n.corto)}</label><span class="num">\${N.length} · \${fmt(sub, un === 'm³' ? 2 : 1)} \${un}</span></div>`,
  `      const clave = r + '|' + n.id, nivAbierto = q || nivAbiertos.has(clave) || N.some(i => i.id === seleccion);
      h += \`<details class="nivel-el" data-niv="\${clave}"\${nivAbierto ? ' open' : ''}><summary class="nivel-cab"><span class="izq"><svg class="flecha" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5l4.5 4.5L6 12.5"/></svg><label><input type="checkbox" data-todo="\${clave}"\${todosH ? ' checked' : ''}\${!todosH && algunos ? ' data-mixto' : ''} aria-label="Marcar todo \${esc(n.corto)} como hecho"> \${esc(n.corto)}</label></span><span class="num">\${N.length} · \${fmt(sub, un === 'm³' ? 2 : 1)} \${un}</span></summary>`);
r(`.join('')}</tbody></table></div>\`;
    }
    if (!L.length)`, `.join('')}</tbody></table></details>\`;
    }
    if (!L.length)`);
r(`  cont.querySelectorAll('[data-mixto]').forEach(c => c.indeterminate = true);`, `  cont.querySelectorAll('[data-mixto]').forEach(c => c.indeterminate = true);
  // el tilde del nivel marca lo hecho; no pliega ni despliega
  cont.querySelectorAll('.nivel-el label').forEach(l => l.onclick = ev => ev.stopPropagation());
  cont.querySelectorAll('details.nivel-el').forEach(d => d.ontoggle = () => { if (d.open) nivAbiertos.add(d.dataset.niv); else nivAbiertos.delete(d.dataset.niv); });`);
r(`function marcarFilaSel() { document.querySelectorAll('#listaObra tr[data-id]').forEach(tr => tr.classList.toggle('sel', tr.dataset.id === seleccion)); }`,
  `function marcarFilaSel() { document.querySelectorAll('#listaObra tr[data-id]').forEach(tr => { const si = tr.dataset.id === seleccion; tr.classList.toggle('sel', si); if (si) { const d = tr.closest('details.nivel-el'); if (d && !d.open) d.open = true; } }); }`);
fs.writeFileSync('tablero.template.html', t); console.log('ok');
