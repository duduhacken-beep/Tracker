// app/mundo/mundo.js — cena Phaser do Mundo (Fase 2: mundo vazio navegável)
(function () {
  const ANCORA = { balcao: [24, 55], mesa_longa: [32, 50], banco: [11, 27], estante: [16, 79], armario_arquivo: [16, 71],
    lareira: [22, 90], escrivaninha: [16, 38], bau: [13, 26], cofre: [15, 38], cama: [22, 46], escada: [18, 62], jaula: [32, 70] };
  let jogo = null;

  class CenaMundo extends Phaser.Scene {
    constructor() { super('mundo'); }
    preload() {
      this.load.atlas('cenario', 'mundo/cenario.png', 'mundo/cenario.json');
      this.load.atlas('personagens', 'mundo/personagens.png', 'mundo/personagens.json');
    }
    create() {
      this.cameras.main.setBackgroundColor('#120d08');
      this.desenharChao();
      this.desenharParedes();
      this.desenharMoveis();
      this.desenharPlacas();
      const todos = MapaMundo.SALAS.flatMap(s => [Iso.paraTela(s.x, s.y), Iso.paraTela(s.x + s.w, s.y + s.h), Iso.paraTela(s.x, s.y + s.h), Iso.paraTela(s.x + s.w, s.y)]);
      const xs = todos.map(p => p.x), ys = todos.map(p => p.y);
      this.cameras.main.setBounds(Math.min(...xs) - 200, Math.min(...ys) - 200, Math.max(...xs) - Math.min(...xs) + 400, Math.max(...ys) - Math.min(...ys) + 400);
      this.cameras.main.setZoom(2);
      const p = Iso.paraTela(...MapaMundo.PARTIDA); this.cameras.main.centerOn(p.x, p.y);
    }
    desenharChao() {
      const tiles = new Set();
      for (const s of MapaMundo.SALAS) for (let c = s.x; c < s.x + s.w; c++) for (let r = s.y; r < s.y + s.h; r++) tiles.add(c + ',' + r);
      for (const p of MapaMundo.PASSAGENS) for (const [c, r] of p.tiles) tiles.add(c + ',' + r);
      for (const k of tiles) {
        const [c, r] = k.split(',').map(Number), { x, y } = Iso.paraTela(c, r);
        this.add.image(x, y, 'cenario', MapaMundo.chaoDe(c, r)).setDepth(-100000);
      }
      for (const p of MapaMundo.PASSAGENS.filter(p => p.escada)) {
        const [c, r] = p.tiles[0], { x, y } = Iso.paraTela(c, r);
        this.add.image(x, y + Iso.TH / 2, 'cenario', 'escada').setOrigin(ANCORA.escada[0] / 64, ANCORA.escada[1] / 64).setDepth(y - 1);
      }
    }
    desenharMoveis() {
      this.moveis = MapaMundo.MOVEIS.map(m => {
        const { x, y } = Iso.paraTela(m.c, m.r), base = y + Iso.TH / 2;
        const fr = this.textures.getFrame('cenario', m.item), [ax, ay] = ANCORA[m.item] || [fr.width / 2, fr.height - 1];
        return this.add.image(x, base, 'cenario', m.item).setOrigin(ax / fr.width, ay / fr.height).setDepth(base);
      });
    }
    desenharPlacas() {
      this.placas = MapaMundo.SALAS.map(s => {
        const { x, y } = Iso.paraTela(s.x + s.w / 2 - .5, s.y + .2);
        return this.add.text(x, y - 70, s.nome, { fontFamily: '"Alegreya Sans", sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#f3e3bb',
          backgroundColor: '#4a2c16', padding: { x: 5, y: 2 }, stroke: '#140f18', strokeThickness: 3, resolution: 4 }).setOrigin(.5, 1).setDepth(100000);
      });
    }
    desenharParedes() {
      const ehPassagem = (c, r) => !!MapaMundo.passagemDe(c, r);
      for (const s of MapaMundo.SALAS.filter(s => s.parede)) {
        const esq = s.parede === 'pedra' ? 'parede_esq_pedra' : 'parede_esq', dir = s.parede === 'pedra' ? 'parede_dir_pedra' : 'parede_dir';
        for (let r = s.y; r < s.y + s.h; r++) {                       // parede do lado esquerdo (oeste)
          if (ehPassagem(s.x - 1, r)) continue;
          const { x, y } = Iso.paraTela(s.x, r);
          this.add.image(x - 32, y - 80, 'cenario', r % 4 === 2 && s.parede === 'madeira' ? 'parede_esq_janela' : esq).setOrigin(0, 0).setDepth(y - 16);
        }
        for (let c = s.x; c < s.x + s.w; c++) {                       // parede do fundo (norte)
          const { x, y } = Iso.paraTela(c, s.y);
          const porta = ehPassagem(c, s.y - 1);
          this.add.image(x, y - 80, 'cenario', porta ? 'parede_dir_porta' : dir).setOrigin(0, 0).setDepth(y - 16);
        }
      }
    }
  }

  window.MundoTracker = {
    iniciar(el, opcoes = {}) {
      if (jogo) return jogo;
      jogo = new Phaser.Game({ type: Phaser.AUTO, parent: el, pixelArt: true, backgroundColor: '#120d08',
        scale: { mode: Phaser.Scale.RESIZE, width: el.clientWidth || 800, height: el.clientHeight || 600 },
        fps: { forceSetTimeOut: !!opcoes.teste }, scene: [CenaMundo] });
      return jogo;
    },
    pausar() { if (jogo) jogo.loop.sleep(); },
    retomar() { if (jogo) jogo.loop.wake(); },
    cena() { return jogo && jogo.scene.getScene('mundo'); },
    irPara(id) { const c = this.cena(); if (c && c.irPara) c.irPara(id); },
    andarAte(col, lin) { const c = this.cena(); if (c && c.andarAte) c.andarAte(col, lin); },
  };
})();
