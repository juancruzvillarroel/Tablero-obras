const fs=require('fs');const d=JSON.parse(fs.readFileSync('dxf.json'));
const [x0,y0,x1,y1,out,scale]=[+process.argv[2],+process.argv[3],+process.argv[4],+process.argv[5],process.argv[6],+(process.argv[7]||40)];
const col=l=>({COLUMNA_RAYA:'#d00',PILAR_HORMIGON:'#c00',VIG_CARAS:'#00c',MUR_CARAS_HORMIGON:'#080',OT_SECC_LOS:'#a0a',PASES:'#aaa',APEOS:'#f80',Bases:'#088','0.COTAS':'#bbb','X_Ejes de Terreno':'#9c9'}[l]||'#333');
const X=x=>((x-x0)*scale).toFixed(1),Y=y=>((y1-y)*scale).toFixed(1);
let s=[];const inb=p=>p&&p.x>=x0&&p.x<=x1&&p.y>=y0&&p.y<=y1;
function draw(e){const c=col(e.layer);
 if(e.type==='LINE'){if(!inb(e.vertices[0])&&!inb(e.vertices[1]))return;s.push(`<line x1="${X(e.vertices[0].x)}" y1="${Y(e.vertices[0].y)}" x2="${X(e.vertices[1].x)}" y2="${Y(e.vertices[1].y)}" stroke="${c}" stroke-width="0.6"/>`)}
 else if(e.type==='LWPOLYLINE'||e.type==='POLYLINE'){if(!e.vertices||!e.vertices.some(inb))return;const pts=e.vertices.map(v=>X(v.x)+','+Y(v.y)).join(' ');s.push(`<poly${e.shape?'gon':'line'} points="${pts}" fill="none" stroke="${c}" stroke-width="0.6"/>`)}
 else if(e.type==='CIRCLE'){if(!inb(e.center))return;s.push(`<circle cx="${X(e.center.x)}" cy="${Y(e.center.y)}" r="${e.radius*scale}" fill="none" stroke="${c}" stroke-width="0.6"/>`)}
 else if(e.type==='TEXT'||e.type==='MTEXT'){const p=e.startPoint||e.position;if(!inb(p))return;const t=(e.text||'').replace(/\P/g,' ').replace(/\{|\}|\[A-Za-z][^;]*;/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;');const h=(e.textHeight||e.height||0.2)*scale;s.push(`<text x="${X(p.x)}" y="${Y(p.y)}" font-size="${Math.max(h,6)}" fill="${c}" ${e.rotation?`transform="rotate(${-e.rotation} ${X(p.x)} ${Y(p.y)})"`:''}>${t}</text>`)}
}
d.entities.forEach(draw);
fs.writeFileSync(out,`<svg xmlns="http://www.w3.org/2000/svg" width="${(x1-x0)*scale}" height="${(y1-y0)*scale}" style="background:#fff">${s.join('')}</svg>`);
console.log(s.length);
