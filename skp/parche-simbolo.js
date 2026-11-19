const fs = require('fs'); let t = fs.readFileSync('tablero.template.html', 'utf8');
const r = (a, b) => { if (!t.includes(a)) throw new Error('no encontrado: ' + a.slice(0, 90)); t = t.replace(a, b); };
// Símbolo como en el CAD: círculo con el color del sistema y el número adentro (el sistema y el diámetro van en el tooltip).
r(`.etq-bajada { position: absolute; left: 0; top: 0; padding: 2px 7px; border-radius: 999px; font: 600 11.5px var(--f-mono); white-space: nowrap;
  background: var(--raised); color: var(--fg); border: 2px solid var(--c); box-shadow: 0 1px 2px rgb(0 0 0 / .15); pointer-events: auto; cursor: default; }`,
`/* Símbolo de bajada igual al del CAD: círculo del color del sistema con el número adentro */
.etq-bajada { position: absolute; left: 0; top: 0; width: 24px; height: 24px; display: grid; place-items: center; border-radius: 50%;
  font: 700 12px var(--f-mono); line-height: 1; background: var(--raised); color: var(--fg); border: 2.5px solid var(--c);
  box-shadow: 0 1px 2px rgb(0 0 0 / .2); pointer-events: auto; cursor: default; }`);
r("el.textContent = `${PREF_BAJADA[b.sis]} ${b.num}`;", "el.textContent = b.num;");
r("el.title = `${SAN.sistemas[b.sis]} Ø", "el.title = `${PREF_BAJADA[b.sis]} ${b.num} · ${SAN.sistemas[b.sis]} Ø");
fs.writeFileSync('tablero.template.html', t); console.log('ok');
