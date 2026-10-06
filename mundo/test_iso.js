// app/mundo/test_iso.js — rodar: node mundo/test_iso.js
const assert = require('assert');
const Iso = require('./iso.js');

// projeção: andar +1 coluna = desce pra direita; +1 linha = desce pra esquerda
assert.deepStrictEqual(Iso.paraTela(0, 0), { x: 0, y: 0 });
assert.deepStrictEqual(Iso.paraTela(1, 0), { x: 32, y: 16 });
assert.deepStrictEqual(Iso.paraTela(0, 1), { x: -32, y: 16 });

// ida e volta: qualquer ponto dentro do losango cai no mesmo tile
for (const [c, r] of [[0, 0], [5, 3], [12, 20], [30, 7]]) {
  const { x, y } = Iso.paraTela(c, r);
  for (const [dx, dy] of [[0, 0], [20, 0], [-20, 0], [0, 10], [0, -10], [10, 5]])
    assert.deepStrictEqual(Iso.paraTile(x + dx, y + dy), { c, r }, `${c},${r} +${dx},${dy}`);
}

// caminho: desvia de parede, devolve [] se não dá
const parede = new Set(['2,0', '2,1', '2,2']);
const andavel = (c, r) => c >= 0 && r >= 0 && c < 6 && r < 6 && !parede.has(`${c},${r}`);
const p = Iso.caminho(andavel, [0, 0], [4, 0]);
assert.deepStrictEqual(p[p.length - 1], [4, 0]);
assert.ok(p.every(([c, r]) => andavel(c, r)), 'só pisa em tile andável');
for (let i = 1; i < p.length; i++) assert.strictEqual(Math.abs(p[i][0] - p[i - 1][0]) + Math.abs(p[i][1] - p[i - 1][1]), 1, 'passos de 1 tile');
assert.strictEqual(p.length, 10, 'caminho mais curto contornando a parede (desce 3, anda 4, sobe 3)');
assert.deepStrictEqual(Iso.caminho(andavel, [0, 0], [0, 0]), []);
assert.deepStrictEqual(Iso.caminho(andavel, [0, 0], [2, 1]), [], 'destino bloqueado');
console.log('ok iso');
