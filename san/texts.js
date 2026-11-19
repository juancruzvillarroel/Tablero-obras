const d=JSON.parse(require('fs').readFileSync('dxf.json'));
const t=d.entities.filter(e=>e.type==='TEXT'||e.type==='MTEXT').map(e=>{const p=e.startPoint||e.position||{};return {x:+p.x.toFixed(1),y:+p.y.toFixed(1),h:+(e.textHeight||e.height||0).toFixed(2),l:e.layer,s:(e.text||'').replace(/\P/g,' | ').replace(/\{|\}|\[A-Za-z][^;]*;/g,'').slice(0,90)}});
require('fs').writeFileSync('texts.json',JSON.stringify(t));
t.filter(x=>x.h>=0.25).sort((a,b)=>b.y-a.y||a.x-b.x).forEach(x=>console.log(x.x,x.y,x.h,x.l,'|',x.s));
