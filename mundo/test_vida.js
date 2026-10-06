// app/mundo/test_vida.js — rodar: node mundo/test_vida.js
const assert = require('assert');
const V = require('./vida.js');
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };   // "aleatório" previsível

assert.strictEqual(V.desejo('trabalhando'), 'posto');
assert.strictEqual(V.desejo('erro'), 'posto');
for (const e of ['dormindo', 'desligado', 'preso']) assert.strictEqual(V.desejo(e), 'dormir', e);
assert.strictEqual(V.desejo('descansando'), 'vagar');

const pois = [{ c: 1, r: 1, a: 'beber' }, { c: 2, r: 2, a: 'comer' }];
const ag = { posto: [9, 9], noHorario: false };
assert.deepStrictEqual(V.proximoDestino(ag, pois, new Set(), seq(.1)).tile, [9, 9], '25% fica no posto fora do horário');
assert.deepStrictEqual(V.proximoDestino(ag, pois, new Set(), seq(.5, 0)).tile, [1, 1], 'senão vai a um ponto');
assert.deepStrictEqual(V.proximoDestino({ ...ag, noHorario: true }, pois, new Set(), seq(.8)).tile, [9, 9], 'no horário fica (85%)');
assert.deepStrictEqual(V.proximoDestino(ag, pois, new Set(['1,1']), seq(.5, 0)).poi, pois[1], 'pula ponto ocupado');
assert.deepStrictEqual(V.proximoDestino(ag, pois, new Set(['1,1', '2,2']), seq(.5)).tile, [9, 9], 'tudo ocupado: posto');

assert.deepStrictEqual(V.reacoes(null, { treino: 5, receita: 1, livro: 0 }), [], 'primeira visita não comemora');
assert.deepStrictEqual(V.reacoes({ treino: 1, receita: 2, livro: 3 }, { treino: 2, receita: 2, livro: 4 }), ['jefrey', 'mosley']);

const cenas = [{ a: 'jefrey', b: 'maria' }, { a: 'mosley', b: 'friday' }];
assert.strictEqual(V.escolherCena(cenas, id => id !== 'maria', seq(0)), cenas[1], 'só cena com os dois livres');
assert.strictEqual(V.escolherCena(cenas, () => false, seq(0)), null);

assert.strictEqual(V.chegouTrabalho(undefined, 'trabalhando'), false, 'primeira leitura não conta');
assert.strictEqual(V.chegouTrabalho('descansando', 'trabalhando'), true);
assert.strictEqual(V.chegouTrabalho('trabalhando', 'trabalhando'), false);

// ambiente (Fase 5B)
assert.deepStrictEqual([5, 6, 16, 17, 18, 19, 23].map(V.ceu), ['noite', 'dia', 'dia', 'tarde', 'tarde', 'noite', 'noite']);
assert.deepStrictEqual(V.fogo(true, 0), { tipo: 'fogo', escala: 1.5, cor: 'laranja', faiscas: false, luz: 70 }, 'antes de 21/10: calmo');
assert.strictEqual(V.fogo(false, 0).tipo, 'brasa');
assert.deepStrictEqual([1, 3, 7, 21].map(s => [V.fogo(false, s).escala, V.fogo(false, s).cor, V.fogo(false, s).faiscas, V.fogo(false, s).luz]),
  [[1.5, 'laranja', false, 60], [2, 'laranja', false, 80], [2, 'laranja', true, 95], [2, 'azul', true, 110]]);
assert.deepStrictEqual(V.enfeites(1), []);
assert.deepStrictEqual(V.enfeites(5), ['bandeiras', 'lustre', 'vasos']);
assert.deepStrictEqual(V.enfeites(13), ['bandeiras', 'lustre', 'vasos', 'trono', 'tapeteReal', 'estatua']);
assert.deepStrictEqual(V.epoca(new Date(2026, 11, 10, 12)), { natal: true, virada: false });
assert.deepStrictEqual(V.epoca(new Date(2026, 11, 31, 21)), { natal: true, virada: true });
assert.deepStrictEqual(V.epoca(new Date(2027, 0, 1, 2)), { natal: false, virada: true });
assert.deepStrictEqual(V.epoca(new Date(2027, 0, 1, 4)), { natal: false, virada: false });
assert.deepStrictEqual(V.epoca(new Date(2026, 9, 6, 20)), { natal: false, virada: false });
// Fase 5C bloco 4: reformas do castelo por nível
assert.deepStrictEqual(V.reformas(1), { muralha: 'palicada', torres: false, estandartes: false, jardim: false });
assert.deepStrictEqual(V.reformas(4), { muralha: 'pedra', torres: false, estandartes: false, jardim: false });
assert.deepStrictEqual(V.reformas(9), { muralha: 'pedra', torres: true, estandartes: true, jardim: false });
assert.deepStrictEqual(V.reformas(13), { muralha: 'pedra', torres: true, estandartes: true, jardim: true });
// Fase 5C bloco 5: objetos ligados a dados
assert.deepStrictEqual(V.estantes(6, 4), [6, 0, 0, 0]);
assert.deepStrictEqual(V.estantes(30, 4), [24, 6, 0, 0]);
assert.deepStrictEqual(V.estantes(200, 2), [24, 24]);
assert.strictEqual(V.pilhasMoedas(null, 3000), 0, 'sem renda cadastrada: sem pilha');
assert.strictEqual(V.pilhasMoedas(3000, 3000), 5); assert.strictEqual(V.pilhasMoedas(1, 3000), 1); assert.strictEqual(V.pilhasMoedas(0, 3000), 0);
assert.deepStrictEqual([0, 1, 9, 10, 29, 30].map(V.surrado), [0, 1, 1, 2, 2, 3]);
// Fase 5C bloco 6: céu contínuo
assert.deepStrictEqual(V.corDoCeu(12), { cor: 0, alfa: 0 }, 'meio-dia limpo');
assert.strictEqual(V.corDoCeu(23).alfa, .62); assert.ok(V.corDoCeu(2).alfa > .58 && V.corDoCeu(2).alfa < .62, 'madrugada escura');
const tarde = [16, 16.5, 17, 17.5, 18, 18.5, 19, 19.5, 20, 21].map(h => V.corDoCeu(h).alfa);
assert.ok(tarde.every((a, i) => i === 0 || a >= tarde[i - 1]), 'escurece aos poucos à tarde: ' + tarde);
const manha = [5, 6, 7, 8, 9].map(h => V.corDoCeu(h).alfa);
assert.ok(manha.every((a, i) => i === 0 || a <= manha[i - 1]), 'clareia aos poucos de manhã: ' + manha);
console.log('ok vida');
