const fs=require('fs');const m=JSON.parse(fs.readFileSync('modelo.json'));
const [nivel,y0,out]=[process.argv[2],+process.argv[3],process.argv[4]];
// base: plano original de la banda
const {execSync}=require('child_process');
execSync(`node svg.js 74 ${y0} 98 ${y0+12} tmp.svg 70`);
let base=fs.readFileSync('tmp.svg','utf8');
const S=70,OX=74.5,OY=107.0, bx=74, by1=y0+12, dy=y0-105;
const X=x=>((x+OX-bx)*S),Y=y=>((by1-(y+OY+dy))*S);
const col={columna:'rgba(220,0,0,.55)',viga:'rgba(0,90,255,.35)',tabique:'rgba(0,160,0,.5)',losa:'rgba(255,200,0,.25)',escalera:'rgba(160,0,200,.3)'};
let g='';
for(const e of m.elementos.filter(e=>e.nivel===nivel)){for(const c of e.cajas){
 const cx=X(c.x),cy=Y(c.y);g+=`<rect x="${-c.dx*S/2}" y="${-c.dy*S/2}" width="${c.dx*S}" height="${c.dy*S}" fill="${col[e.tipo]}" stroke="none" transform="translate(${cx} ${cy}) rotate(${-c.ang*180/Math.PI})"/>`;}
 const c=e.cajas[0];if(e.tipo!=='losa')g+=`<text x="${X(c.x)}" y="${Y(c.y)}" font-size="11" fill="#000" font-weight="bold">${e.nombre}</text>`;
 else g+=`<text x="${X(c.x)}" y="${Y(c.y)+20}" font-size="12" fill="#850">${e.nombre} ${e.area}m²</text>`}
base=base.replace('</svg>',g+'</svg>');fs.writeFileSync(out+'.svg',base);
require('sharp')(out+'.svg').png().toFile(out+'.png').then(()=>console.log('ok'));
