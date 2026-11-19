// Recorta una zona de la planta, la amplía y le dibuja una grilla con coordenadas de píxel originales.
const sharp = require('sharp');
const [f, x0, y0, x1, y1, out, esc] = [process.argv[2], ...process.argv.slice(3, 7).map(Number), process.argv[7], +(process.argv[8] || 3)];
(async () => {
  const w = x1 - x0, h = y1 - y0;
  const base = await sharp(f).extract({ left: x0, top: y0, width: w, height: h }).resize(Math.round(w * esc), Math.round(h * esc), { kernel: 'nearest' }).png().toBuffer();
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w * esc)}" height="${Math.round(h * esc)}">`;
  for (let x = Math.ceil(x0 / 10) * 10; x < x1; x += 10) svg += `<line x1="${(x - x0) * esc}" y1="0" x2="${(x - x0) * esc}" y2="${h * esc}" stroke="${x % 50 ? '#f008' : '#f00'}" stroke-width="${x % 50 ? .5 : 1.2}"/>` + (x % 50 ? '' : `<text x="${(x - x0) * esc + 2}" y="12" font-size="12" fill="#f00">${x}</text>`);
  for (let y = Math.ceil(y0 / 10) * 10; y < y1; y += 10) svg += `<line x1="0" y1="${(y - y0) * esc}" x2="${w * esc}" y2="${(y - y0) * esc}" stroke="${y % 50 ? '#00f8' : '#00f'}" stroke-width="${y % 50 ? .5 : 1.2}"/>` + (y % 50 ? '' : `<text x="2" y="${(y - y0) * esc - 2}" font-size="12" fill="#00f">${y}</text>`);
  svg += '</svg>';
  await sharp(base).composite([{ input: Buffer.from(svg) }]).png().toFile(out);
  console.log('ok', out);
})();
