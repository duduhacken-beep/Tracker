// app/mundo/test_mapa.js — rodar: node mundo/test_mapa.js
const assert = require('assert');
const Iso = require('./iso.js');
const M = require('./mapa.js');

const ids = M.SALAS.map(s => s.id);
for (const id of ['salao', 'cozinha', 'tesouro', 'biblioteca', 'escritorio', 'embaixada', 'patio', 'quarto', 'porao'])
  assert.ok(ids.includes(id), 'falta sala ' + id);

// salas não se sobrepõem
const dono = new Map();
for (const s of M.SALAS) for (let c = s.x; c < s.x + s.w; c++) for (let r = s.y; r < s.y + s.h; r++) {
  assert.ok(!dono.has(c + ',' + r), `sobreposição em ${c},${r} (${s.id} x ${dono.get(c + ',' + r)})`);
  dono.set(c + ',' + r, s.id);
}

// móveis dentro de uma sala e fora das passagens
const passagem = new Set(M.PASSAGENS.flatMap(p => p.tiles.map(([c, r]) => c + ',' + r)));
for (const m of M.MOVEIS) for (const [dc, dr] of (m.ocupa || [[0, 0]])) {
  const c = m.c + dc, r = m.r + dr;
  assert.ok(M.salaDe(c, r), `${m.item} fora de sala em ${c},${r}`);
  assert.ok(!passagem.has(c + ',' + r), `${m.item} bloqueando passagem em ${c},${r}`);
  assert.ok(!M.andavel(c, r), `${m.item} deveria bloquear ${c},${r}`);
}

// toda sala alcançável a partir da partida, e o centro de cada sala também
assert.ok(M.andavel(...M.PARTIDA), 'partida andável');
for (const s of M.SALAS) {
  const alvo = M.centro(s.id);
  assert.ok(M.andavel(...alvo), `centro de ${s.id} bloqueado`);
  if (alvo[0] !== M.PARTIDA[0] || alvo[1] !== M.PARTIDA[1])
    assert.ok(Iso.caminho(M.andavel, M.PARTIDA, alvo).length > 0, `${s.id} inalcançável`);
}

// passagens encostam nas duas salas que ligam
const vizinhoDe = (tiles, id) => tiles.some(([c, r]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => (M.salaDe(c + dc, r + dr) || {}).id === id));
for (const p of M.PASSAGENS) {
  assert.ok(vizinhoDe(p.tiles, p.de), `passagem ${p.de}->${p.para} não encosta em ${p.de}`);
  assert.ok(vizinhoDe(p.tiles, p.para), `passagem ${p.de}->${p.para} não encosta em ${p.para}`);
}
assert.ok(M.chaoDe(...M.PARTIDA));
console.log('ok mapa');
