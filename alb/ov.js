const fs = require('fs'), sharp = require('../node_modules/sharp');
const [piso, img, top, out] = process.argv.slice(2);
const a = JSON.parse(fs.readFileSync('albanileria.json')).muros.filter(m => m.piso === piso);
const S = 84.6, toPx = (x, y) => [737.5 + (x - 10.835) * S, +top + (36.40 - y) * S];
let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="1415">';
for (const m of a) { const [px0, py0] = toPx(m.x0, m.y1), [px1, py1] = toPx(m.x1, m.y0); svg += `<rect x="${px0}" y="${py0}" width="${px1 - px0}" height="${py1 - py0}" fill="${m.esp > 0.1 ? '#00f' : '#f00'}" fill-opacity=".55" stroke="#000" stroke-width=".5"/>`; }
svg += '</svg>';
(async () => { const b = await sharp('../../images/' + img).resize(2000, 1415).composite([{ input: Buffer.from(svg) }]).png().toBuffer(); await sharp(b).extract({ left: 120, top: 370, width: 1800, height: 710 }).toFile(out); console.log('ok'); })();
