// Prueba de humo: ejecuta el tablero en jsdom con three real y un renderer falso.
const fs = require('fs'), { JSDOM } = require('jsdom');
const html = fs.readFileSync('argerich-estructura.html', 'utf8');
const body = html.replace(/<script[\s\S]*?<\/script>/g, '');
const dom = new JSDOM(`<!doctype html><html><body>${body}</body></html>`, { pretendToBeVisual: true, runScripts: 'outside-only' });
const w = dom.window;
w.matchMedia = () => ({ matches: false, addEventListener() {} });
w.ResizeObserver = class { observe() {} };
w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (o, k) => k in o ? o[k] : () => {}, set: (o, k, v) => (o[k] = v, true) });
w.HTMLCanvasElement.prototype.toDataURL = () => 'data:,';
w.requestAnimationFrame = () => 0;
const THREE = require('three');
w.THREE = { ...THREE };
w.THREE.WebGLRenderer = class { constructor() { this.domElement = w.document.createElement('canvas'); this.capabilities = { getMaxAnisotropy: () => 1 }; } setPixelRatio() {} setSize() {} render() {} setClearColor() {} };
// OrbitControls y BufferGeometryUtils de examples/js usan el global THREE
const ex = f => fs.readFileSync('node_modules/three/examples/js/' + f, 'utf8');
w.eval(ex('controls/OrbitControls.js')); w.eval(ex('utils/BufferGeometryUtils.js'));
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const errs = []; w.addEventListener('error', e => errs.push(e.message));
try { for (const s of scripts) w.eval(s); } catch (e) { console.log('ERROR al cargar:', e.stack.split('\n').slice(0, 4).join('\n')); process.exit(1); }
const $ = s => w.document.querySelector(s);
console.log('kpis:', $('#kpis').textContent.replace(/\s+/g, ' ').slice(0, 120));
// recorrer pestañas y modos
for (const k of ['elementos', 'computo', 'sanitaria', 'albanileria', 'resumen']) { $('#t-' + k).click(); }
for (const b of w.document.querySelectorAll('#modos button')) b.click();
$('#t-sanitaria').click();
const sanTxt = $('#p-sanitaria').textContent.replace(/\s+/g, ' ');
console.log('sanitaria:', sanTxt.slice(0, 260));
// elegir un pase faltante y un cruce desde la tabla
const fila = $('#p-sanitaria tr[data-san^="pase:"]'); fila?.click();
console.log('ficha pase:', $('#p-sanitaria .ficha')?.textContent.replace(/\s+/g, ' ').slice(0, 160));
$('#p-sanitaria tr[data-san^="cruce:"]')?.click();
console.log('ficha cruce:', $('#p-sanitaria .ficha')?.textContent.replace(/\s+/g, ' ').slice(0, 160));
// nivel y chips
$('#niveles .nivel')?.click(); for (const c of w.document.querySelectorAll('#tipos .chip')) c.click();
$('#t-resumen').click(); $('#p-elementos') && $('#t-elementos').click();
w.document.querySelector('#tablaEl tr[data-id]')?.click();
console.log('resumen ficha:', $('#p-resumen .ficha')?.textContent.replace(/\s+/g, ' ').slice(0, 100));
// capas: apagar/prender grupo, cambiar color y textura
const g=w.document.querySelector('[data-grupo=estructura]'); if (g) { g.checked=false; g.dispatchEvent(new w.Event('change')); g.checked=true; g.dispatchEvent(new w.Event('change')); }
const c=w.document.querySelector('[data-col=viga]'); if (c) { c.value='#ff0000'; c.dispatchEvent(new w.Event('input')); }
const x=w.document.querySelector('[data-tex=hueco8]'); if (x) { x.value='hormigon'; x.dispatchEvent(new w.Event('change')); }
w.document.querySelector('[data-reset=viga]')?.click();
console.log('capas:', w.document.querySelectorAll('#capas .capa').length, 'filas');
console.log('errores:', errs.length ? errs : 'ninguno');
