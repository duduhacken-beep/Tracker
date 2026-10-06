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

// donos: na sala certa, fora de móvel/passagem, bloqueando o próprio tile, alcançáveis por um vizinho
const moveis = new Set(M.MOVEIS.flatMap(m => (m.ocupa || [[0, 0]]).map(([dc, dr]) => (m.c + dc) + ',' + (m.r + dr))));
assert.deepStrictEqual(M.DONOS.map(d => d.sala).sort(), ['biblioteca', 'cozinha', 'escritorio', 'patio', 'porao', 'quarto', 'salao', 'tesouro'], 'uma sala com função = um dono');
for (const d of M.DONOS) {
  assert.ok(M.andavel(...M.centro(d.sala)), `${d.id} tapando o centro da ${d.sala}`);
  assert.strictEqual((M.salaDe(d.c, d.r) || {}).id, d.sala, `${d.id} fora da ${d.sala}`);
  assert.ok(!moveis.has(d.c + ',' + d.r) && !passagem.has(d.c + ',' + d.r), `${d.id} em cima de móvel/passagem`);
  assert.ok(!M.andavel(d.c, d.r), `${d.id} deveria bloquear o tile`);
  assert.ok(Iso.caminhoAteVizinho(M.andavel, M.PARTIDA, [d.c, d.r]).length > 0, `${d.id} inalcançável`);
}

// Fase 5: moradores, pontos de passeio e cenas
const ehSalao = ([c, r]) => (M.salaDe(c, r) || {}).id === 'salao';
for (const m of M.MORADORES) {
  assert.strictEqual((M.salaDe(Math.floor(m.c), Math.floor(m.r)) || {}).id, m.sala, `${m.id} fora da ${m.sala}`);
  if (!m.preso) assert.ok(Iso.caminho(M.andavelAgente, M.PARTIDA, [m.c, m.r]).length > 0, `${m.id} não chega no posto`);
}
for (const d of M.DONOS.filter(d => !d.objeto)) assert.ok(Iso.caminho(M.andavelAgente, M.PARTIDA, [d.c, d.r]).length > 0, `${d.id} não chega no posto`);
for (const p of M.POIS) {
  assert.ok(ehSalao([p.c, p.r]) && M.andavel(p.c, p.r), `ponto ${p.c},${p.r} bloqueado ou fora do Salão`);
  assert.ok(Iso.caminho(M.andavelAgente, M.PARTIDA, [p.c, p.r]).length > 0 || (p.c === M.PARTIDA[0] && p.r === M.PARTIDA[1]), `ponto ${p.c},${p.r} inalcançável`);
}
const agentesIds = new Set(['tesoureiro', 'maria', 'mosley', 'monica', 'jefrey', 'friday', 'arauto']);
for (const c of M.CENAS) {
  assert.ok(agentesIds.has(c.a) && agentesIds.has(c.b), `cena com agente desconhecido ${c.a}/${c.b}`);
  for (const t of [c.ta, c.tb]) assert.ok(ehSalao(t) && M.andavel(...t), `cena ${c.a}/${c.b}: ${t} bloqueado`);
}

// Fase 5B: enfeites reservados no Salão sem fechar caminho; velas em cima de mesas
const ocupadosAntes = new Set([...M.MOVEIS.flatMap(m => (m.ocupa || [[0, 0]]).map(([dc, dr]) => (m.c + dc) + ',' + (m.r + dr))),
  ...M.DONOS.map(d => d.c + ',' + d.r), ...M.MORADORES.map(d => d.c + ',' + d.r), ...M.POIS.map(p => p.c + ',' + p.r),
  ...M.CENAS.flatMap(c => [c.ta.join(), c.tb.join()]), M.PARTIDA.join()]);
for (const e of M.ENFEITES) for (const t of e.tiles) {
  assert.ok(ehSalao(t), `${e.id} fora do Salão`);
  assert.ok(!ocupadosAntes.has(t.join()) && !passagem.has(t.join()), `${e.id} em cima de algo em ${t}`);
  assert.ok(!M.andavel(...t), `${e.id} deveria reservar ${t}`);
}
for (const t of M.TAPETE_REAL) assert.ok(ehSalao(t) && M.andavel(...t), `tapete em ${t} bloqueado`);
const mesas = new Set(M.MOVEIS.filter(m => ['mesa_redonda', 'escrivaninha'].includes(m.item)).map(m => m.c + ',' + m.r));
for (const v of M.VELAS) assert.ok(mesas.has(v.join()), `vela sem mesa em ${v}`);

// Fase 5C: pisos com estilo conhecido, terra dentro do Pátio, tapetes dentro de uma sala
const estilos = new Set(['madeira', 'madeira_escura', 'pedra', 'grama', 'terra']);
for (const s of M.SALAS) assert.ok(estilos.has(s.chao), `piso desconhecido em ${s.id}: ${s.chao}`);
assert.strictEqual(M.chaoDe(23, 28), 'terra'); assert.strictEqual(M.chaoDe(21, 27), 'grama');
for (const t of M.TAPETES) {
  const sala = (M.salaDe(t.c, t.r) || {}).id;
  for (let dc = 0; dc < t.n; dc++) for (let dr = 0; dr < t.m; dr++) assert.strictEqual((M.salaDe(t.c + dc, t.r + dr) || {}).id, sala, `${t.item} saindo da sala`);
}
// Fase 5C bloco 3: alturas — Quarto em cima, Porão embaixo, degraus em ordem
assert.strictEqual(M.altura(7, 7), 40); assert.strictEqual(M.altura(30, 8), -32); assert.strictEqual(M.altura(19, 19), 0);
assert.ok(M.altura(12, 7) < M.altura(11, 7) && M.altura(11, 7) < 40, 'escada sobe da Biblioteca pro Quarto');
assert.ok(M.altura(25, 7) > M.altura(26, 7) && M.altura(26, 7) > -32, 'escada desce do Escritório pro Porão');
const paredes = new Set(['madeira', 'madeira_escura', 'azulejo', 'pedra', 'pedra_musgo']);
for (const s of M.SALAS) assert.ok(s.parede === null || paredes.has(s.parede), `parede desconhecida em ${s.id}`);
// Fase 5C bloco 4: tudo dentro da muralha, caminho no pátio livre, tochas em paredes de verdade
const Mu = M.MURALHA, dentroMuralha = (c, r) => c >= Mu.x && c < Mu.x + Mu.w && r >= Mu.y && r < Mu.y + Mu.h;
for (const s of M.SALAS) assert.ok(dentroMuralha(s.x - 1, s.y - 1) && dentroMuralha(s.x + s.w, s.y + s.h), `${s.id} encostando na muralha`);
for (let r = 25; r < Mu.y + Mu.h; r++) for (const c of [18, 19]) assert.ok(M.noCaminho(c, r) && !M.salaDe(c, r) && !M.passagemDe(c, r), `caminho em ${c},${r}`);
for (const t of M.TOCHAS) {
  const s = M.salaDe(t.c, t.r); assert.ok(s && s.parede, `tocha ${t.c},${t.r} fora de sala com parede`);
  assert.ok(t.lado === 'norte' ? t.r === s.y : t.c === s.x, `tocha ${t.c},${t.r} não está na borda ${t.lado}`);
  const fora = t.lado === 'norte' ? [t.c, t.r - 1] : [t.c - 1, t.r];
  assert.ok(!M.passagemDe(...fora), `tocha ${t.c},${t.r} em cima de uma porta`);
}
// Fase 5C bloco 5: objetos soltos dentro de salas, objetos de parede em bordas de verdade
for (const d of M.DECOR) assert.ok(M.salaDe(d.c, d.r), `${d.item} fora de sala`);
for (const d of M.PAREDE_DECOR) {
  const s = M.salaDe(d.c, d.r); assert.ok(s && s.parede, `${d.item} sem parede`);
  assert.ok(d.lado === 'norte' ? d.r === s.y : d.c === s.x, `${d.item} fora da borda ${d.lado}`);
}
assert.strictEqual(M.MOVEIS.filter(m => m.dados === 'estante').length, 4);
console.log('ok mapa');
