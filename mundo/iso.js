// app/mundo/iso.js — matemática do mundo isométrico (sem Phaser; roda no navegador e no Node)
(function (raiz) {
  const TW = 64, TH = 32;
  const paraTela = (c, r) => ({ x: (c - r) * TW / 2, y: (c + r) * TH / 2 });
  function paraTile(x, y) {
    const c = (x / (TW / 2) + y / (TH / 2)) / 2, r = (y / (TH / 2) - x / (TW / 2)) / 2;
    return { c: Math.round(c) + 0, r: Math.round(r) + 0 };   // + 0 troca -0 por 0
  }
  // BFS em 4 direções; devolve a lista de tiles a pisar (sem o de partida)
  function caminho(andavel, de, para) {
    if (de[0] === para[0] && de[1] === para[1]) return [];
    if (!andavel(para[0], para[1])) return [];
    const k = (c, r) => c + ',' + r, veio = new Map([[k(de[0], de[1]), null]]), fila = [de];
    while (fila.length) {
      const [c, r] = fila.shift();
      if (c === para[0] && r === para[1]) break;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc, nr = r + dr;
        if (!andavel(nc, nr) || veio.has(k(nc, nr))) continue;
        veio.set(k(nc, nr), [c, r]); fila.push([nc, nr]);
      }
    }
    if (!veio.has(k(para[0], para[1]))) return [];
    const out = [];
    for (let at = para; at && !(at[0] === de[0] && at[1] === de[1]); at = veio.get(k(at[0], at[1]))) out.unshift(at);
    return out;
  }
  // caminho mais curto até um tile vizinho (4 direções) de `alvo` — pra parar ao lado de quem não dá pra pisar em cima
  function caminhoAteVizinho(andavel, de, alvo) {
    let melhor = null;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const v = [alvo[0] + dc, alvo[1] + dr];
      if (v[0] === de[0] && v[1] === de[1]) return [];
      const p = caminho(andavel, de, v);
      if (p.length && (!melhor || p.length < melhor.length)) melhor = p;
    }
    return melhor || [];
  }
  const api = { TW, TH, paraTela, paraTile, caminho, caminhoAteVizinho };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else raiz.Iso = api;
})(typeof window !== 'undefined' ? window : globalThis);
