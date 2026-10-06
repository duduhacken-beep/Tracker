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

  const api = { desejo, proximoDestino, reacoes, escolherCena, chegouTrabalho, ceu, fogo, enfeites, epoca };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else raiz.VidaMundo = api;
})(typeof window !== 'undefined' ? window : globalThis);
