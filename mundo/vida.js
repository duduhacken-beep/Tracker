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

  const api = { desejo, proximoDestino, reacoes, escolherCena, chegouTrabalho };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else raiz.VidaMundo = api;
})(typeof window !== 'undefined' ? window : globalThis);
