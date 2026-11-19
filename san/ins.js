const d = JSON.parse(require('fs').readFileSync('dxf.json'));
for (const e of d.entities.filter(e => e.type === 'INSERT' && /RICH|XREF/.test(e.name)))
  console.log(e.name, '|', e.layer, e.position.x.toFixed(2), e.position.y.toFixed(2), 'rot', e.rotation || 0, 'esc', e.xScale || 1, e.yScale || 1);
for (const n of ['RICH_ES.', 'RICH 2984_ARQ', 'XREF - ARGERICH 2984']) {
  const b = d.blocks[n]; if (!b) { console.log('sin bloque', n); continue; }
  const c = {}; (b.entities || []).forEach(e => { c[e.layer + '/' + e.type] = (c[e.layer + '/' + e.type] || 0) + 1; });
  console.log('##', n, (b.entities || []).length, JSON.stringify(c).slice(0, 900));
}
