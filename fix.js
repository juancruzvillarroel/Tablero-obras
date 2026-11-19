const fs=require('fs');let s=fs.readFileSync('extract.js','utf8');
const B=String.fromCharCode(92);
s=s.replace('/sec:(d+)x(d+).*?H:(d+).*?Tal[oó]n:(d+)(?:.*?[Tt]ronco:s*(d+)x(d+))?/', `/sec:(${B}d+)x(${B}d+).*?H:(${B}d+).*?Tal[oó]n:(${B}d+)(?:.*?[Tt]ronco:${B}s*(${B}d+)x(${B}d+))?(?:.*?Vol:(${B}d+,${B}d+))?/`)
 .replace('/^Bd+$/',`/^B${B}d+$/`).replace('/C0*(d+)/',`/C0*(${B}d+)/`).replace('/B0*(d+)/',`/B0*(${B}d+)/`);
// usar el volumen de CYPE cuando está rotulado
s=s.replace("lista.push({ nombre: nom ? nom.s : 'Base ascensor', H, t, w, h, a, b, V, c });","const Vcype = m[7] ? +m[7].replace(',', '.') : null;\n    lista.push({ nombre: nom ? nom.s : 'Base ascensor', H, t, w, h, a, b, V: Vcype ?? V, Vcalc: V, c });");
fs.writeFileSync('extract.js',s);
