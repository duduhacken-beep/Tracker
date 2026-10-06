// app/mundo/vida.js — decisões dos agentes do Mundo (mesmas regras da Taverna; sem Phaser, testável no Node)
(function (raiz) {
  // o que o agente quer agora, a partir do estado (vindo do agentes_status pelas regras da Taverna)
  function desejo(estado) {
    if (estado === 'trabalhando' || estado === 'erro') return 'posto';
    if (estado === 'dormindo' || estado === 'desligado' || estado === 'preso') return 'dormir';
    return 'vagar';
  }
  // descansando: no horário dele fica mais no posto (85%); fora, passeia pelos pontos livres do Salão
  function proximoDestino(ag, pois, ocupados, rnd) {
    if (rnd() < (ag.noHorario ? .85 : .25)) return { tile: ag.posto, poi: null };
    const livres = pois.filter(p => !ocupados.has(p.c + ',' + p.r));
    if (!livres.length) return { tile: ag.posto, poi: null };
    const p = livres[Math.floor(rnd() * livres.length)];
    return { tile: [p.c, p.r], poi: p };
  }
  // o que você fez desde a última visita → quem reage (sem visita anterior, ninguém: não comemora o passado)
  function reacoes(antes, agora) {
    if (!antes) return [];
    const r = [];
    if (agora.treino > antes.treino) r.push('jefrey');
    if (agora.receita > antes.receita) r.push('maria');
    if (agora.livro > antes.livro) r.push('mosley');
    return r;
  }
  function escolherCena(cenas, livre, rnd) {
    const ok = cenas.filter(c => livre(c.a) && livre(c.b));
    return ok.length ? ok[Math.floor(rnd() * ok.length)] : null;
  }
  // a rotina começou de verdade agora (a primeira leitura não conta)
  const chegouTrabalho = (antes, agora) => !!antes && antes !== 'trabalhando' && agora === 'trabalhando';

  // ── Ambiente (Fase 5B) — mesmas regras da Taverna ──
  const ceu = hora => hora >= 6 && hora < 17 ? 'dia' : hora >= 17 && hora < 19 ? 'tarde' : 'noite';
  // lareira = fogo da sequência: calmo antes de 21/10; brasa com 0; cresce com 3/7; azul a partir de 21 (luz = raio da claridade)
  function fogo(antes, seq) {
    if (antes) return { tipo: 'fogo', escala: 1.5, cor: 'laranja', faiscas: false, luz: 70 };
    if (!seq) return { tipo: 'brasa', escala: 1, cor: 'laranja', faiscas: false, luz: 18 };
    const escala = seq < 3 ? 1.5 : 2;
    return { tipo: 'fogo', escala, cor: seq >= 21 ? 'azul' : 'laranja', faiscas: seq >= 7, luz: seq >= 21 ? 110 : seq >= 7 ? 95 : seq >= 3 ? 80 : 60 };
  }
  const ENFEITES = [[2, 'bandeiras'], [3, 'lustre'], [5, 'vasos'], [8, 'trono'], [11, 'tapeteReal'], [13, 'estatua']];
  const enfeites = nivel => ENFEITES.filter(([lv]) => nivel >= lv).map(([, id]) => id);
  // dezembro = Natal; virada = 31/12 das 20h até 01/01 às 3h
  const epoca = d => ({ natal: d.getMonth() === 11,
    virada: (d.getMonth() === 11 && d.getDate() === 31 && d.getHours() >= 20) || (d.getMonth() === 0 && d.getDate() === 1 && d.getHours() < 3) });

  // reformas do castelo pelo nível do Modo Caverna: paliçada de madeira → muralha de pedra (4) → torres (6) → estandartes nas torres (9) → jardim (12)
  const reformas = nivel => ({ muralha: nivel >= 4 ? 'pedra' : 'palicada', torres: nivel >= 6, estandartes: nivel >= 9, jardim: nivel >= 12 });

  // objetos que refletem dados reais
  const estantes = (livros, n, cap = 24) => Array.from({ length: n }, (_, i) => Math.max(0, Math.min(cap, livros - i * cap)));   // livros por estante, enchendo em ordem
  const pilhasMoedas = (sobra, livre) => sobra == null || !(livre > 0) ? 0 : Math.max(0, Math.min(5, Math.ceil(5 * sobra / livre)));   // quanto do "livre" do mês ainda sobra
  const surrado = treinos => treinos >= 30 ? 3 : treinos >= 10 ? 2 : treinos >= 1 ? 1 : 0;   // boneco de treino vai ficando gasto

  // cor por cima do castelo ao longo do dia (sem degraus): madrugada azul, amanhecer rosado, dia limpo, pôr do sol laranja, noite
  const CEU = [[0, 0x08081e, .62], [5, 0x0a0a2a, .58], [6, 0x5a2a4a, .34], [7.5, 0xffb070, .1], [9, 0x000000, 0], [16, 0x000000, 0],
    [17.5, 0xff8a30, .14], [18.5, 0x8a3a40, .3], [19.5, 0x2a1440, .48], [21, 0x08081e, .62], [24, 0x08081e, .62]];
  function corDoCeu(hora) {
    const i = CEU.findIndex(([h], k) => k < CEU.length - 1 && hora >= h && hora < CEU[k + 1][0]), [h0, c0, a0] = CEU[i], [h1, c1, a1] = CEU[i + 1];
    const f = (hora - h0) / (h1 - h0), mix = (a, b, s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * f);
    const cor = c0 === 0 ? c1 : c1 === 0 ? c0 : (mix(c0, c1, 16) << 16) | (mix(c0, c1, 8) << 8) | mix(c0, c1, 0);   // de/para "sem cor" mantém o tom
    return { cor, alfa: Math.round((a0 + (a1 - a0) * f) * 1000) / 1000 };
  }

  const api = { desejo, proximoDestino, reacoes, escolherCena, chegouTrabalho, ceu, fogo, enfeites, epoca, reformas, estantes, pilhasMoedas, surrado, corDoCeu };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else raiz.VidaMundo = api;
})(typeof window !== 'undefined' ? window : globalThis);
