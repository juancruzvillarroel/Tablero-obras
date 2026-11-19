// Detecta los píxeles de muro (gris medio) y devuelve perfiles por fila/columna para calibrar.
const sharp = require('sharp');
(async () => {
  const f = process.argv[2];
  const { data, info } = await sharp(f).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;
  const gris = (x, y) => { const i = (y * W + x) * C, r = data[i], g = data[i + 1], b = data[i + 2]; return Math.abs(r - g) < 8 && Math.abs(g - b) < 8 && r > 100 && r < 160; };
  let x0 = W, x1 = 0, y0 = H, y1 = 0; const col = new Array(W).fill(0), fil = new Array(H).fill(0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (gris(x, y)) { col[x]++; fil[y]++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  console.log(f.split(/[\/]/).pop(), W + 'x' + H, 'muros bbox', x0, y0, x1, y1);
  // filas con muchos píxeles grises = medianeras
  const filas = fil.map((n, y) => [y, n]).filter(([, n]) => n > W * 0.3).map(([y]) => y);
  console.log('  filas largas', filas[0], '..', filas[filas.length - 1], 'n', filas.length, JSON.stringify(filas));
})();
