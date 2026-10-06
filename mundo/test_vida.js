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
console.log('ok vida');
