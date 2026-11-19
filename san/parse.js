const fs=require('fs');const P=require('../node_modules/dxf-parser');
const src=fs.readFileSync(process.argv[2],'utf8');
const d=new P().parseSync(src);
fs.writeFileSync('dxf.json',JSON.stringify(d));
const byLayer={},byType={};
for(const e of d.entities){byLayer[e.layer]=(byLayer[e.layer]||0)+1;byType[e.type]=(byType[e.type]||0)+1;}
console.log('entities',d.entities.length);console.log(byType);
console.log(Object.entries(byLayer).sort((a,b)=>b[1]-a[1]));
console.log('blocks',Object.keys(d.blocks).length);
console.log('layouts?', d.objects? Object.keys(d.objects):'none');
