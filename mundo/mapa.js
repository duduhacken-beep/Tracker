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
  // donos das salas com função (Fase 3) — ficam parados no posto; clicar abre a janela da sala
  const DONOS = [
    { id: 'banqueiro', nome: 'Banqueiro', sala: 'tesouro', c: 30, r: 18, agente: 'tesoureiro' },   // agente = id no agentes_status
    { id: 'maria', nome: 'Maria', sala: 'cozinha', c: 7, r: 16 },   // ao lado do caldeirão (na frente dele o escondia)
    { id: 'mosley', nome: 'Mosley', sala: 'biblioteca', c: 15, r: 6 },
    { id: 'monica', nome: 'Mônica', sala: 'escritorio', c: 21, r: 5 },
    { id: 'jefrey', nome: 'Jefrey', sala: 'patio', c: 22, r: 28 },
    { id: 'escrivao', nome: 'Escrivão', sala: 'porao', c: 29, r: 8, fixo: true },   // guardião do arquivo: não passeia
    { id: 'estandarte', nome: 'Estandarte', sala: 'quarto', c: 8, r: 4, objeto: true },   // no quarto o dono é o próprio Rei: o estandarte da classe abre a Evolução
    { id: 'quadro', nome: 'Quadro de avisos', sala: 'salao', c: 17, r: 13, objeto: true },   // Salão: abre Início + agentes e crônica
  ];
  // moradores sem sala com função (Fase 5): têm posto, vivem e falam, mas não abrem janela
  const MORADORES = [
    { id: 'friday', nome: 'Friday', sala: 'embaixada', c: 13, r: 29 },
    { id: 'arauto', nome: 'Arauto', sala: 'salao', c: 14, r: 20 },
    { id: 'kobe', nome: 'Kobe', sala: 'porao', c: 32.5, r: 9.5, preso: true },   // no meio da jaula (tiles da jaula já bloqueados)
  ];
  // pontos onde os agentes livres passeiam no Salão (como na Taverna)
  const POIS = [
    { c: 21, r: 15, a: 'beber' }, { c: 21, r: 16, a: 'beber' }, { c: 15, r: 15, a: 'aquecer' },
    { c: 17, r: 20, a: 'comer' }, { c: 17, r: 21, a: 'comer' }, { c: 19, r: 20, a: 'comer' }, { c: 19, r: 21, a: 'comer' },
    { c: 16, r: 18, a: 'sentar' }, { c: 15, r: 19, a: 'sentar' }, { c: 21, r: 23, a: 'sentar' },
    { c: 19, r: 17, a: 'passear' }, { c: 22, r: 20, a: 'passear' }, { c: 20, r: 15, a: 'passear' },
  ];
  // cenas entre dois agentes livres (falas da Taverna)
  const CENAS = [
    { a: 'jefrey', b: 'maria', ta: [21, 15], tb: [21, 16], fa: 'Saúde!', fb: 'Saúde! Bebe devagar, hein.', emote: 'caneca' },
    { a: 'monica', b: 'tesoureiro', ta: [16, 18], tb: [15, 19], fa: 'O relatório que você pediu.', fb: 'Hmm... as contas fecham.', emote: 'livro' },
    { a: 'mosley', b: 'friday', ta: [19, 17], tb: [20, 17], fa: 'E então o estoico disse...', fb: 'Interesting! Tell me more.', emote: 'livro' },
    { a: 'arauto', b: 'jefrey', ta: [15, 21], tb: [16, 21], fa: 'Notícia: o campeão treinou hoje!', fb: 'Claro que treinou.', emote: 'nota' },
  ];
  const PARTIDA = [19, 24];

  const salaDe = (c, r) => SALAS.find(s => c >= s.x && c < s.x + s.w && r >= s.y && r < s.y + s.h) || null;
  const passagemDe = (c, r) => PASSAGENS.find(p => p.tiles.some(([pc, pr]) => pc === c && pr === r)) || null;
  const bloqueado = new Set(MOVEIS.flatMap(m => (m.ocupa || [[0, 0]]).map(([dc, dr]) => (m.c + dc) + ',' + (m.r + dr))));
  for (const d of [...DONOS, ...MORADORES]) bloqueado.add(d.c + ',' + d.r);
  const andavel = (c, r) => !bloqueado.has(c + ',' + r) && !!(salaDe(c, r) || passagemDe(c, r));
  // agentes podem pisar no próprio posto (que é bloqueado pro Rei)
  const postos = new Set([...DONOS, ...MORADORES].filter(d => !d.objeto && !d.preso).map(d => d.c + ',' + d.r));
  const andavelAgente = (c, r) => andavel(c, r) || postos.has(c + ',' + r);
  const centro = id => { const s = SALAS.find(x => x.id === id); let c = s.x + (s.w >> 1), r = s.y + (s.h >> 1);
    if (!andavel(c, r)) for (const [dc, dr] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, -1]]) if (andavel(c + dc, r + dr)) { c += dc; r += dr; break; }
    return [c, r]; };
  const chaoDe = (c, r) => { const s = salaDe(c, r); if (s) return s.chao; const p = passagemDe(c, r); return p ? SALAS.find(x => x.id === p.de).chao : null; };

  const api = { SALAS, PASSAGENS, MOVEIS, DONOS, MORADORES, POIS, CENAS, PARTIDA, salaDe, passagemDe, andavel, andavelAgente, centro, chaoDe };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else raiz.MapaMundo = api;
})(typeof window !== 'undefined' ? window : globalThis);
