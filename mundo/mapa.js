// app/mundo/mapa.js — planta do castelo-taverna (só dados + consultas). Coordenadas em tiles (c = coluna, r = linha).
(function (raiz) {
  const SALAS = [
    { id: 'salao', nome: 'Salão da Taverna', x: 13, y: 13, w: 12, h: 12, chao: 'chao_madeira', parede: 'madeira' },
    { id: 'cozinha', nome: 'Cozinha', x: 5, y: 15, w: 7, h: 8, chao: 'chao_madeira', parede: 'madeira' },
    { id: 'tesouro', nome: 'Casa do Tesouro', x: 26, y: 15, w: 7, h: 8, chao: 'chao_pedra', parede: 'pedra' },
    { id: 'biblioteca', nome: 'Biblioteca', x: 13, y: 4, w: 6, h: 8, chao: 'chao_madeira', parede: 'madeira' },
    { id: 'escritorio', nome: 'Escritório', x: 19, y: 4, w: 6, h: 8, chao: 'chao_madeira', parede: 'madeira' },
    { id: 'embaixada', nome: 'Embaixada', x: 12, y: 26, w: 6, h: 6, chao: 'chao_madeira', parede: 'madeira' },
    { id: 'patio', nome: 'Pátio de Treino', x: 20, y: 26, w: 8, h: 8, chao: 'chao_grama', parede: null },
    { id: 'quarto', nome: 'Seu Quarto', x: 4, y: 4, w: 7, h: 7, chao: 'chao_madeira', parede: 'madeira' },
    { id: 'porao', nome: 'Porão: Arquivo e Masmorra', x: 27, y: 4, w: 8, h: 8, chao: 'chao_pedra', parede: 'pedra' },
  ];
  const PASSAGENS = [
    { de: 'salao', para: 'cozinha', tiles: [[12, 18], [12, 19]] },
    { de: 'salao', para: 'tesouro', tiles: [[25, 18], [25, 19]] },
    { de: 'salao', para: 'biblioteca', tiles: [[15, 12], [16, 12]] },
    { de: 'salao', para: 'escritorio', tiles: [[21, 12], [22, 12]] },
    { de: 'salao', para: 'embaixada', tiles: [[14, 25], [15, 25]] },
    { de: 'salao', para: 'patio', tiles: [[22, 25], [23, 25]] },
    { de: 'biblioteca', para: 'quarto', tiles: [[11, 7], [12, 7]], escada: true },
    { de: 'escritorio', para: 'porao', tiles: [[25, 7], [26, 7]], escada: true },
  ];
  const MOVEIS = [
    // Salão
    { item: 'lareira', c: 14, r: 14 }, { item: 'balcao', c: 22, r: 16, ocupa: [[0, 0], [0, -1]] },
    { item: 'mesa_longa', c: 18, r: 21, ocupa: [[0, 0], [0, -1]] }, { item: 'mesa_redonda', c: 15, r: 18 },
    { item: 'mesa_redonda', c: 20, r: 23 }, { item: 'barril', c: 24, r: 14 }, { item: 'barril', c: 24, r: 23 },
    // Cozinha
    { item: 'caldeirao', c: 6, r: 16 }, { item: 'mesa_redonda', c: 9, r: 19 }, { item: 'barril', c: 6, r: 21 }, { item: 'bau', c: 10, r: 16 },
    // Casa do Tesouro
    { item: 'cofre', c: 27, r: 16 }, { item: 'balanca', c: 30, r: 16 }, { item: 'bau', c: 28, r: 21 }, { item: 'escrivaninha', c: 31, r: 19 },
    // Biblioteca
    { item: 'estante', c: 14, r: 4 }, { item: 'estante', c: 17, r: 4 }, { item: 'mesa_redonda', c: 16, r: 8 },
    // Escritório
    { item: 'escrivaninha', c: 21, r: 6 }, { item: 'bau', c: 24, r: 5 },
    // Embaixada
    { item: 'mesa_redonda', c: 14, r: 28 }, { item: 'estante', c: 16, r: 26 },
    // Pátio
    { item: 'boneco_treino', c: 23, r: 28 }, { item: 'suporte_armas', c: 26, r: 27 }, { item: 'barril', c: 21, r: 32 },
    // Seu Quarto
    { item: 'cama', c: 6, r: 6 }, { item: 'espelho', c: 9, r: 5 }, { item: 'bau', c: 5, r: 9 },
    // Porão
    { item: 'armario_arquivo', c: 28, r: 5 }, { item: 'armario_arquivo', c: 30, r: 5 },
    { item: 'jaula', c: 33, r: 10, ocupa: [[0, 0], [-1, 0], [0, -1], [-1, -1]] },
  ];
  const PARTIDA = [19, 24];

  const salaDe = (c, r) => SALAS.find(s => c >= s.x && c < s.x + s.w && r >= s.y && r < s.y + s.h) || null;
  const passagemDe = (c, r) => PASSAGENS.find(p => p.tiles.some(([pc, pr]) => pc === c && pr === r)) || null;
  const bloqueado = new Set(MOVEIS.flatMap(m => (m.ocupa || [[0, 0]]).map(([dc, dr]) => (m.c + dc) + ',' + (m.r + dr))));
  const andavel = (c, r) => !bloqueado.has(c + ',' + r) && !!(salaDe(c, r) || passagemDe(c, r));
  const centro = id => { const s = SALAS.find(x => x.id === id); let c = s.x + (s.w >> 1), r = s.y + (s.h >> 1);
    if (!andavel(c, r)) for (const [dc, dr] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, -1]]) if (andavel(c + dc, r + dr)) { c += dc; r += dr; break; }
    return [c, r]; };
  const chaoDe = (c, r) => { const s = salaDe(c, r); if (s) return s.chao; const p = passagemDe(c, r); return p ? SALAS.find(x => x.id === p.de).chao : null; };

  const api = { SALAS, PASSAGENS, MOVEIS, PARTIDA, salaDe, passagemDe, andavel, centro, chaoDe };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else raiz.MapaMundo = api;
})(typeof window !== 'undefined' ? window : globalThis);
