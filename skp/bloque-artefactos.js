// --- Artefactos sanitarios: forma simplificada, apoyados en el piso y con la descarga donde baja su caño ---
// Coordenadas locales: x a lo ancho, y hacia arriba, z hacia el frente del artefacto; el origen es la descarga.
const NOM_ART = { inodoro: 'Inodoro', bidet: 'Bidet', bacha: 'Bacha / lavatorio', ducha: 'Ducha', pileta: 'Pileta de cocina', lavarropas: 'Lavarropas', lavajillas: 'Lavavajillas' };
const matPorc = new THREE.MeshLambertMaterial({ color: 0xf3f4f6 }), matMesada = new THREE.MeshLambertMaterial({ color: 0xc4c8ce });
const matMueble = new THREE.MeshLambertMaterial({ color: 0xd8d2c8 }), matOscuro = new THREE.MeshLambertMaterial({ color: 0x4a525b });
const bordeArt = new THREE.LineBasicMaterial({ color: 0x5b6570, transparent: true, opacity: 0.45 });
const caja = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const elipse = (rx, rz, h, x, y, z, rTop = 1) => { const g = new THREE.CylinderGeometry(rTop, 1, h, 24); g.scale(rx, 1, rz); return g.translate(x, y, z); };
function formaArtefacto(tipo) {
  const p = [], o = [], m = [], mu = [];   // porcelana, oscuro (bocas, rejillas), metal, mueble
  if (tipo === 'inodoro') {
    p.push(elipse(0.17, 0.24, 0.38, 0, 0.19, 0.1, 1.05), caja(0.4, 0.36, 0.17, 0, 0.56, -0.2), caja(0.42, 0.03, 0.19, 0, 0.75, -0.2));
    o.push(elipse(0.13, 0.19, 0.01, 0, 0.385, 0.12));
  } else if (tipo === 'bidet') {
    p.push(elipse(0.17, 0.25, 0.4, 0, 0.2, 0.08, 1.04)); o.push(elipse(0.12, 0.18, 0.01, 0, 0.405, 0.1));
  } else if (tipo === 'bacha') {
    mu.push(caja(0.6, 0.8, 0.45, 0, 0.4, 0.05)); p.push(caja(0.62, 0.04, 0.47, 0, 0.82, 0.05));
    o.push(elipse(0.2, 0.15, 0.01, 0, 0.845, 0.07)); m.push(cil(new THREE.Vector3(0, 0.84, -0.12), new THREE.Vector3(0, 1.0, -0.12), 0.015));
  } else if (tipo === 'ducha') {
    p.push(caja(0.8, 0.05, 0.8, 0, 0.025, 0.1)); o.push(caja(0.12, 0.01, 0.12, 0, 0.055, 0));
    m.push(cil(new THREE.Vector3(0, 0.9, -0.28), new THREE.Vector3(0, 2.05, -0.28), 0.012), cil(new THREE.Vector3(0, 2.05, -0.28), new THREE.Vector3(0, 2.05, -0.05), 0.012), elipse(0.09, 0.09, 0.02, 0, 2.03, -0.02));
  } else if (tipo === 'pileta') {
    mu.push(caja(1.2, 0.86, 0.58, 0, 0.43, 0.06)); p.push(caja(1.24, 0.04, 0.62, 0, 0.88, 0.06));
    o.push(caja(0.5, 0.01, 0.38, 0, 0.905, 0.08)); m.push(cil(new THREE.Vector3(0, 0.9, -0.17), new THREE.Vector3(0, 1.15, -0.17), 0.016));
  } else if (tipo === 'lavarropas' || tipo === 'lavajillas') {
    p.push(caja(0.6, 0.85, 0.6, 0, 0.425, 0.15));
    if (tipo === 'lavarropas') { const g = new THREE.CylinderGeometry(0.18, 0.18, 0.02, 24).rotateX(Math.PI / 2).translate(0, 0.5, 0.455); o.push(g); }
    else o.push(caja(0.5, 0.03, 0.02, 0, 0.78, 0.455));
  }
  return { p, o, m, mu };
}
const ARTE = [];
SAN.artefactos.forEach((a, i) => {
  const id = 'art:' + i, g = new THREE.Group(); g.userData.id = id;
  const f = formaArtefacto(a.tipo);
  for (const [lista, mat] of [[f.p, matPorc], [f.o, matOscuro], [f.m, matMetal], [f.mu, matMueble]]) {
    const gs = lista.filter(Boolean); if (!gs.length) continue;
    const geo = merge(gs), mesh = new THREE.Mesh(geo, mat); mesh.userData.id = id; g.add(mesh); sanMallas.push(mesh);
    if (mat === matPorc || mat === matMueble) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), bordeArt); g.add(e); }
  }
  g.position.copy(v3(a.x, a.y, a.z));
  g.rotation.y = Math.atan2(a.frente[0], -a.frente[1]);
  escena.add(g); ARTE.push(g);
  SANP[id] = { k: 'artefacto', o: a, m: g, ppal: g.children[0], nivel: PISO_NIVEL[a.piso], centro: v3(a.x, a.y, a.z + 0.4) };
});

