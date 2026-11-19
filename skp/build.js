const fs = require('fs');
const k = JSON.parse(fs.readFileSync('modelo-skp.json'));
const d = JSON.parse(fs.readFileSync('../modelo.json'));
// En el DXF el medio nivel se llamó sSM y el techo s5; en el SketchUp es al revés.
const mapa = { s5: 'sSM', sSM: 's5' };
for (const e of k.elementos) {
  const x = d.elementos.find(z => (mapa[z.nivel] || z.nivel) === e.nivel && z.nombre === e.nombre && (z.tipo === e.tipo || e.tipo === 'base'));
  if (x) { e.dxf = { seccion: x.seccion, volumen: x.volumen }; if (x.volumenRotulo) e.rotulo = x.volumenRotulo; }
}
k.notas = [
  'Bases B90 y B91: el modelo da 0,78 m³ y el rótulo del plano dice 1,78 m³. El resto de las bases coincide con su rótulo (B01 3,56; B09 4,10; B14 4,49), así que parece un rótulo copiado.',
  'V-108 (PB): el grupo se llama "15x20" en SketchUp pero el plano dice 12x50. El volumen es el mismo (0,170 m³), así que es solo el nombre.',
  'V-126 (PB): en SketchUp es 12x50; el plano dice 20x25.',
  'Vborde (PB): SketchUp la modela de sección constante 20x82 (2,21 m³); el plano la indica variable 20-10 x 82-115.',
  'V-101 (PB): en SketchUp es el tramo corto entre el tabique del ascensor y C03 (0,054 m³); en el plano sigue sobre el tabique (0,167 m³).',
  'Versión A y B son iguales del 1° piso para arriba. En PB la versión A tiene C51 y otras vigas de transferencia (V-111, V-112, V-113, V-122), y no tiene bases, C90/C91 ni la losa del fondo.',
];
const j = JSON.stringify(k).replace(/<\//g, '<' + String.fromCharCode(92) + '/');
const out = fs.readFileSync('visor-skp.template.html', 'utf8').replace('/*MODELO*/null', () => j);
fs.writeFileSync('../argerich-estructura.html', out);
fs.writeFileSync('chk.js', out.split('<script>')[1].split('</script>')[0]);
console.log((out.length / 1024).toFixed(0) + ' KB', 'con DXF:', k.elementos.filter(e => e.dxf).length, '/', k.elementos.length);
