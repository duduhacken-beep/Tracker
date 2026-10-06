// app/mundo/mundo.js — cena Phaser do Mundo (castelo-taverna isométrico com os agentes vivos)
(function () {
  const ANCORA = { balcao: [24, 55], mesa_longa: [32, 50], banco: [11, 27], estante: [16, 79], armario_arquivo: [16, 71],
    lareira: [22, 90], escrivaninha: [16, 38], arvore: [32, 94], poco: [24, 62], bancada: [32, 62], forno: [28, 62], poltrona: [18, 38],
    bau_aberto: [18, 34], caixas: [18, 38], cama_dossel: [26, 92], estante_livros: [16, 79], bau: [13, 26], cofre: [15, 38], cama: [22, 46], escada: [18, 62], jaula: [32, 70],
    jaula_chao: [32, 70], jaula_grades: [32, 70], estandarte: [4, 54], quadro: [16, 46] };
  // ícones de pixel acima da cabeça (os mesmos da Taverna + "zz" de dormir)
  const ICONES = {
    caneca: ['.WWWW.', '.EEEEe', '.EEEEe', '.EEEE.'], nota: ['..kk', '..k.', '..k.', 'kkk.', 'kk..'], coracao: ['RR.RR', 'RRRRR', '.RRR.', '..R..'],
    fala: ['k.k.k'], erro: ['R', 'R', 'R', '.', 'R'], ok: ['....G', '...G.', 'G.G..', '.G...'], livro: ['RRRRR', 'RWWWR', 'RRRRR'], zz: ['BBB', '..B', '.B.', 'BBB'],
  };
  // medalhas da parede de troféus (mesma máscara e cores da Evolução) e cores do fogo da lareira
  const MEDALHA = ['.bb..bb.', '..bbbb..', '..cccc..', '.cyyyyc.', 'cyywyyyc', 'cyyyyyyc', '.cyyyyc.', '..cccc..'];
  const MEDALHA_COR = { bronze: { b: 0xd94848, c: 0x7a4a1e, y: 0xcd7f32, w: 0xf0c08a }, prata: { b: 0x3b6fd8, c: 0x6b7280, y: 0xc0c6d0, w: 0xf3f4f6 },
    ouro: { b: 0x22a06b, c: 0xa16207, y: 0xf5c542, w: 0xfff3b0 } };
  const FOGO_COR = { laranja: [0xf97316, 0xfbbf24, 0xfff7c2], azul: [0x3b82f6, 0x93c5fd, 0xe0f2fe] };
  const PALETA = { W: 0xfff7c2, E: 0xc99a1f, e: 0x8a6a1f, k: 0x140f18, R: 0xd94848, G: 0x2f8a4a, B: 0x3b4a9a };
  // partículas da atividade de cada agente (cor, subida); "alvo" = tile de onde saem (vapor do caldeirão)
  const PARTICULAS = { mexer: { cor: 0xd7dbe2, vy: -34, alvo: [6, 16], dy: 26 }, contar: { cor: 0xf5c542, vy: -24 }, ler: { cor: 0xefe2c2, vy: -20 },
    escrever: { cor: 0x1b1d24, vy: -10 }, treinar: { cor: 0xf4f4f4, vy: -14 }, anunciar: { cor: 0xf5c542, vy: -38 }, estudar: { cor: 0x8fc4e8, vy: -24 } };
  let jogo = null, ops = {};
  // posição na tela de um tile, já com a altura do piso (Quarto em cima, Porão embaixo)
  // `chao` = y no nível do chão: a profundidade (quem cobre quem) usa ele, senão a sala de cima ficaria atrás da muralha
  const tela = (c, r) => { const p = Iso.paraTela(c, r); p.chao = p.y; p.y -= MapaMundo.altura(Math.round(c), Math.round(r)); return p; };
  const alturaDe = ([c, r]) => MapaMundo.altura(Math.round(c), Math.round(r));

  class CenaMundo extends Phaser.Scene {
    constructor() { super('mundo'); }
    preload() {
      this.load.atlas('cenario', 'mundo/cenario.png?v=10', 'mundo/cenario.json?v=10');   // ?v: o navegador guardava o atlas antigo
      this.load.atlas('personagens', 'mundo/personagens.png?v=10', 'mundo/personagens.json?v=10');
    }
    create() {
      this.cameras.main.setBackgroundColor('#120d08');
      this.desenharChao();
      this.desenharExterior();
      this.desenharParedes();
      this.desenharMoveis();
      this.desenharPlacas();
      this.desenharObjetos();
      const Mu = MapaMundo.MURALHA, B = 6;                                    // terreno em volta da muralha
      const todos = [Iso.paraTela(Mu.x - B, Mu.y - B), Iso.paraTela(Mu.x + Mu.w + B, Mu.y + Mu.h + B), Iso.paraTela(Mu.x - B, Mu.y + Mu.h + B), Iso.paraTela(Mu.x + Mu.w + B, Mu.y - B)];
      const xs = todos.map(p => p.x), ys = todos.map(p => p.y);
      this.lim = { x: Math.min(...xs), y: Math.min(...ys) - 200, w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) + 200 };
      this.cameras.main.setBounds(this.lim.x, this.lim.y, this.lim.w, this.lim.h);
      this.cameras.main.setZoom(2);
      const p = tela(...MapaMundo.PARTIDA); this.cameras.main.centerOn(p.x, p.y);
      this.configurarCamera();
      this.criarRei();
      this.gerarIcones();
      this.criarDonos();
      this.criarGato(); this.proxConversa = 15; this.proxCena = 40;
      this.reagir();
      this.criarAmbiente();
      this.salaVista = 'salao';
    }
    criarRei() {
      const mk = (k, fs) => this.anims.create({ key: k, frames: fs.map(f => ({ key: 'personagens', frame: f })), frameRate: 6, repeat: -1 });
      mk('rei_frente', ['eu_rei_f1', 'eu_rei_f2']); mk('rei_costas', ['eu_rei_c1', 'eu_rei_c2']);
      this.reiTile = MapaMundo.PARTIDA.slice();
      const { x, y } = tela(...this.reiTile);
      this.rei = this.add.sprite(x, y, 'personagens', 'eu_rei_f').setOrigin(.5, 46 / 48).setDepth(y + alturaDe(this.reiTile));
      this.rei.sombra = this.sombra(x, y, 22);
      this.input.on('pointerup', (p, sobre) => {
        if (this.arrastou || sobre.length) return;
        const w = this.cameras.main.getWorldPoint(p.x, p.y), t = this.telaParaTile(w.x, w.y);
        this.andarAte(t.c, t.r);
      });
      this.atualizarParedes();
    }
    atualizarParedes() {
      const rb = this.rei.getBounds();
      for (const p of this.paredes) p.setAlpha(p.depth > this.rei.depth && Phaser.Geom.Intersects.RectangleToRectangle(p.getBounds(), rb) ? .35 : 1);
      for (const p of this.placas) p.setAlpha(Phaser.Geom.Intersects.RectangleToRectangle(p.getBounds(), rb) ? .35 : 1);   // placa fica sempre por cima
    }
    naParede(item, c, r, lado, alt) {   // objeto preso na parede do fundo (arte já inclinada no plano da parede)
      const { x, y, chao } = tela(c, r), [px, py] = lado === 'norte' ? [x + 16, y - 8] : [x - 16, y - 8];
      const s = this.add.image(px, py - alt, 'cenario', item), w = s.width, h = s.height - Math.floor(w / 2);
      const ay = lado === 'norte' ? h - 1 + Math.floor(w / 4) : h - 1 + Math.floor((w - 1 - w / 2) / 2);
      return s.setOrigin(.5, ay / s.height).setDepth(chao - 16 + .6);
    }
    desenharObjetos() {   // objetos soltos, de parede e os que refletem dados (pratos, calendário, gráfico, missões); rato e goteira no porão
      for (const d of MapaMundo.DECOR) {
        const { x, y, chao } = tela(d.c, d.r), s = this.add.image(x + (d.dx || 0), y + Iso.TH / 2 + (d.dy || 0), 'cenario', d.item);
        s.setOrigin((d.ax != null ? d.ax : s.width / 2) / s.width, (d.ay != null ? d.ay : s.height - 1) / s.height).setFlipX(!!d.flip);
        s.setDepth(d.chao ? -99997 : d.dy ? chao + Iso.TH / 2 + 2 : chao - 1);   // palco no nível do chão; em cima de móvel, logo à frente dele
      }
      for (const d of MapaMundo.PAREDE_DECOR) {
        const s = this.naParede(d.item, d.c, d.r, d.lado, d.alt);
        if (d.dados) (this.objDados[d.dados] = this.objDados[d.dados] || [])[0] = s;
      }
      const b = tela(MapaMundo.PRATOS.c, MapaMundo.PRATOS.r);   // pratos das receitas ativas na bancada
      this.pratos = [0, 1, 2, 3, 4].map(i => this.add.image(b.x + 2 + i * 10, b.y + Iso.TH / 2 - 28 - i * 5, 'cenario', 'prato').setDepth(b.chao + Iso.TH / 2 + 2).setVisible(false));
      const cal = this.objDados.calendario[0];
      this.calendario = this.add.text(cal.x, cal.y - 20, '', { fontFamily: '"Alegreya Sans", sans-serif', fontSize: '9px', fontStyle: 'bold', color: '#3a1512', align: 'center', resolution: 4, lineSpacing: -3 }).setOrigin(.5, .5).setDepth(cal.depth + .1);
      this.grafico = this.add.graphics().setDepth(this.objDados.grafico[0].depth + .1);
      const mural = this.moveis.find(m => m.frame.name === 'mural_missoes');
      this.missoes = this.add.graphics().setDepth(mural.depth + .1); this.mural = mural;
      mural.setInteractive({ useHandCursor: true }).on('pointerup', () => { if (!this.arrastou && ops.abrirLivro) ops.abrirLivro('evolucao'); });
      const g = tela(31, 10); this.goteira = { x: g.x, y: g.y, prof: g.chao + 1 };
      const r0 = tela(28, 9), r1 = tela(28, 11);
      this.rato = this.add.sprite(r0.x, r0.y + 4, 'cenario', 'rato_0').setDepth(r1.chao);
      if (!this.calmo) this.tweens.add({ targets: this.rato, x: r1.x, y: r1.y + 4, duration: 2600, yoyo: true, repeat: -1, hold: 900, repeatDelay: 1400,
        onYoyo: () => this.rato.setFlipX(true), onRepeat: () => this.rato.setFlipX(false) });
    }
    atualizarDados() {   // objetos que mostram dados reais: estantes, moedas, boneco, pratos, tapeçaria, calendário, gráfico, missões
      const D = ops.dados ? ops.dados() : null, p = this.prog || {};
      if (!D) return;
      VidaMundo.estantes(D.livros, this.objDados.estante.length).forEach((n, i) => this.objDados.estante[i].setFrame('estante_livros_' + n));
      this.objDados.moedas[0].setFrame('moedas_' + VidaMundo.pilhasMoedas(D.sobra, D.livre));
      this.objDados.boneco[0].setFrame('boneco_treino_' + VidaMundo.surrado(D.treinos));
      this.objDados.tapecaria[0].setFrame('tapecaria_' + (p.classe || 'andarilho'));
      this.pratos.forEach((s, i) => { s.setVisible(i < D.pratos.length); if (i < D.pratos.length) s.setFrame(D.pratos[i] ? 'prato_tampa' : 'prato'); });
      this.calendario.setText(D.dia + '\n' + D.mes);
      const gr = this.grafico, base = this.objDados.grafico[0], mx = Math.max(1, ...D.gastos);
      gr.clear();
      D.gastos.forEach((v, i) => {                                       // gastos dos últimos 6 meses, inclinados como a parede
        const h = Math.round(16 * v / mx), x = base.x - 10 + i * 4, y = base.y - 8 + (i * 4) / 2;
        gr.fillStyle(i === D.gastos.length - 1 ? 0xb0392e : 0xd98030).fillRect(x, y - h, 3, h);
      });
      const ms = this.missoes, M = this.mural; ms.clear();
      D.metas.slice(0, 6).forEach((m, i) => {                           // um pergaminho por meta do Modo Caverna, com a barrinha de progresso
        const x = M.x - 17 + (i % 3) * 12, y = M.y - 52 + Math.floor(i / 3) * 14;
        ms.fillStyle(0xefe2c2).fillRect(x, y, 10, 10).fillStyle(0xb0392e).fillRect(x + 4, y - 1, 2, 2);
        ms.fillStyle(0x8a6a3e).fillRect(x + 1, y + 7, 8, 2).fillStyle(0x2f8a4a).fillRect(x + 1, y + 7, Math.round(8 * Math.min(1, m.feitas / Math.max(1, m.alvo))), 2);
        ms.fillStyle(0x8a6a3e).fillRect(x + 2, y + 2, 6, 1).fillRect(x + 2, y + 4, 4, 1);
      });
    }
    desenharExterior() {   // pátio de calçada dentro da muralha, caminho até o portão, fosso, grama e árvores do lado de fora; muralha que evolui
      const Mu = MapaMundo.MURALHA, B = 6, dentro = (c, r) => c >= Mu.x && c < Mu.x + Mu.w && r >= Mu.y && r < Mu.y + Mu.h;
      this.agua = []; this.reforma = { palicada: [], pedra: [], torres: [], estandartes: [], jardim: [] };
      const deco = (frame, c, r, ay) => { const { x, y } = Iso.paraTela(c, r), s = this.add.image(x, y + 8, 'cenario', frame).setOrigin(.5, ay).setDepth(y + 8); this.sombra(x, y + 6, s.width * .7); return s; };
      for (let c = Mu.x - B; c < Mu.x + Mu.w + B; c++) for (let r = Mu.y - B; r < Mu.y + Mu.h + B; r++) {
        if (MapaMundo.salaDe(c, r) || MapaMundo.passagemDe(c, r)) continue;
        const { x, y } = Iso.paraTela(c, r), fosso = !dentro(c, r) && c >= Mu.x - 1 && c <= Mu.x + Mu.w && r >= Mu.y - 1 && r <= Mu.y + Mu.h;
        const ponte = fosso && r === Mu.y + Mu.h && MapaMundo.PORTAO.includes(c);
        const frame = dentro(c, r) ? this.piso(MapaMundo.noCaminho(c, r) ? 'caminho' : 'calcada', c, r) : ponte ? 'piso_ponte_0' : fosso ? 'agua_0' : this.piso('grama', c, r);
        const img = this.add.image(x, y, 'cenario', frame).setDepth(-100000);
        if (fosso && !ponte) this.agua.push(img);
        if (!dentro(c, r) && !fosso) {                                    // lado de fora: árvores, arbustos e pedras sorteados
          const k = this.sorteio(c, r, 23);
          if (k === 0) deco('arvore', c, r, 1); else if (k < 3) deco(k === 1 ? 'arbusto' : 'pedra_grande', c, r, 1);
        } else if (dentro(c, r) && !MapaMundo.noCaminho(c, r) && this.sorteio(c, r, 6) === 0) {   // jardim (nível 12): flores no pátio de calçada
          this.reforma.jardim.push(this.add.image(x, y, 'cenario', 'flores_' + this.sorteio(c, r, 3)).setDepth(-99998));
        }
      }
      for (const seg of this.bordas(Mu)) {                              // muralha: fundo alta, frente baixa; vão no portão
        if (seg.lado === 'sul' && MapaMundo.PORTAO.includes(seg.c)) continue;
        const frente = seg.lado === 'sul' || seg.lado === 'leste', tipo = seg.lado === 'norte' || seg.lado === 'sul' ? 'dir' : 'esq';
        this.reforma.palicada.push(this.pecaNaBorda(`muralha_${tipo}_palicada${frente ? '_baixa' : ''}`, seg, frente ? 36 : 64, 0));
        this.reforma.pedra.push(this.pecaNaBorda(`muralha_${tipo}_pedra${frente ? '_baixa' : ''}`, seg, frente ? 44 : 96, 0));
      }
      { const { x, y } = Iso.paraTela(MapaMundo.PORTAO[0], Mu.y + Mu.h - 1);   // portão com grade levadiça (2 bordas de largura)
        this.add.image(x - 32, y - 87, 'cenario', 'portao').setOrigin(0, 0).setDepth(y + 32); }
      const cantos = [[Mu.x, Mu.y, 0, -16], [Mu.x + Mu.w - 1, Mu.y, 32, 0], [Mu.x, Mu.y + Mu.h - 1, -32, 0], [Mu.x + Mu.w - 1, Mu.y + Mu.h - 1, 0, 16]];
      for (const [c, r, dx, dy] of cantos) {                            // cantos: poste (paliçada) ou torre com estandarte
        const p = Iso.paraTela(c, r), x = p.x + dx, y = p.y + dy;
        this.reforma.palicada.push(this.add.image(x, y + 2, 'cenario', 'poste_canto').setOrigin(.5, 1).setDepth(y + 1));
        this.reforma.torres.push(this.add.image(x, y + 6, 'cenario', 'torre').setOrigin(.5, 1).setDepth(y + 1));
        this.reforma.estandartes.push(this.add.image(x + 2, y + 6 - 170, 'cenario', 'estandarte_andarilho').setOrigin(4 / 24, 54 / 56).setDepth(y + 2));
      }
    }
    sorteio(c, r, n) { return (((c * 73856093) ^ (r * 19349663)) >>> 0) % n; }
    piso(estilo, c, r) { return 'piso_' + estilo + '_' + this.sorteio(c, r, estilo === 'caminho' ? 2 : 4); }
    bordas(s) {   // segmentos das 4 bordas de uma sala — norte/oeste = fundo; sul/leste = frente
      const b = [];
      for (let c = s.x; c < s.x + s.w; c++) b.push({ lado: 'norte', c, r: s.y }, { lado: 'sul', c, r: s.y + s.h - 1 });
      for (let r = s.y; r < s.y + s.h; r++) b.push({ lado: 'oeste', c: s.x, r }, { lado: 'leste', c: s.x + s.w - 1, r });
      return b;
    }
    telaParaTile(x, y) {   // inverso do tela(): tenta cada altura e fica com o tile que tem aquela altura (preferindo o mais alto)
      const alts = new Set([0, ...MapaMundo.SALAS.map(s => s.alt || 0), ...MapaMundo.PASSAGENS.flatMap(p => p.alts || [])]);
      let melhor = null;
      for (const a of alts) {
        const t = Iso.paraTile(x, y + a);
        if ((MapaMundo.salaDe(t.c, t.r) || MapaMundo.passagemDe(t.c, t.r)) && MapaMundo.altura(t.c, t.r) === a && (!melhor || a > melhor.a)) melhor = { c: t.c, r: t.r, a };
      }
      return melhor || Iso.paraTile(x, y);
    }
    foraDe(seg) { return seg.lado === 'norte' ? [seg.c, seg.r - 1] : seg.lado === 'oeste' ? [seg.c - 1, seg.r] : seg.lado === 'sul' ? [seg.c, seg.r + 1] : [seg.c + 1, seg.r]; }
    pecaNaBorda(frame, seg, alt, altura = MapaMundo.altura(seg.c, seg.r)) {   // peça de altura `alt` em pé numa borda (mesma geometria das paredes: 'dir' em norte/sul, 'esq' em oeste/leste)
      const { x, y } = Iso.paraTela(seg.c, seg.r); const yy = y - altura, dz = altura;   // profundidade pelo chão (dz devolve a altura)
      const [x0, yAlto, prof] = seg.lado === 'norte' ? [x, yy - 16, yy - 16] : seg.lado === 'oeste' ? [x - 32, yy - 16, yy - 16] : seg.lado === 'sul' ? [x - 32, yy, yy + 16] : [x, yy, yy + 16];
      return this.add.image(x0, yAlto - (alt - 16), 'cenario', frame).setOrigin(0, 0).setDepth(prof + dz);
    }
    sombra(x, y, larg) {   // sombra de contato: elipse escura logo acima do piso (abaixo de tudo que fica em pé)
      return this.add.ellipse(x, y, larg, larg * .42, 0x000000, .28).setDepth(-99000);
    }
    gerarIcones() {
      for (const [nome, m] of Object.entries(ICONES)) {
        const w = m[0].length + 4, h = m.length + 4, g = this.make.graphics({ add: false });
        g.fillStyle(0x140f18).fillRect(0, 0, w + 2, h + 2).fillRect(Math.floor(w / 2), h + 2, 2, 2);   // borda + rabinho
        g.fillStyle(0xefe2c2).fillRect(1, 1, w, h);
        m.forEach((l, y) => [...l].forEach((ch, x) => { if (ch !== '.') g.fillStyle(PALETA[ch]).fillRect(3 + x, 3 + y, 1, 1); }));
        g.generateTexture('icone_' + nome, w + 2, h + 4); g.destroy();
      }
      for (const [tier, cor] of Object.entries(MEDALHA_COR)) {
        const g = this.make.graphics({ add: false });
        MEDALHA.forEach((l, y) => [...l].forEach((ch, x) => { if (ch !== '.') g.fillStyle(cor[ch]).fillRect(x, y, 1, 1); }));
        g.generateTexture('medalha_' + tier, 8, 8); g.destroy();
      }
      const g = this.make.graphics({ add: false });                 // gancho vazio: conquista ainda não desbloqueada
      g.fillStyle(0x24170c).fillRect(3, 0, 2, 2); g.fillStyle(0x000000, .25).fillRect(2, 3, 4, 4); g.generateTexture('gancho', 8, 8); g.destroy();
      const luz = this.textures.createCanvas('luz', 128, 128), ctx = luz.getContext(), gr = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, 128, 128); luz.refresh();
    }
    criarAmbiente() {   // Fase 5B: enfeites por nível, troféus, velas, lareira = sequência, noite com luzes, Natal e virada
      const sp = (frame, c, r, ax, ay) => { const { x, y, chao } = tela(c, r), base = y + Iso.TH / 2, s = this.add.sprite(x, base, 'cenario', frame); s.sombra = this.sombra(x, y + 2, 20);
        return s.setOrigin(ax / s.width, ay / s.height).setDepth(chao + Iso.TH / 2); };
      const E = id => MapaMundo.ENFEITES.find(e => e.id === id).tiles;
      const meio = tela(19, 19);
      this.enf = {
        bandeiras: E('bandeiras').map(([c, r]) => sp('estandarte_andarilho', c, r, 4, 54)),
        vasos: E('vasos').map(([c, r]) => sp('vaso', c, r, 8, 22)),
        trono: [sp('trono', ...E('trono')[0], 16, 46)],
        estatua: [sp('estatua_andarilho', ...E('estatua')[0], 16, 62)],
        tapeteReal: MapaMundo.TAPETE_REAL.map(([c, r]) => { const { x, y } = tela(c, r); return this.add.image(x, y, 'cenario', 'tapete_vermelho').setDepth(-99999); }),
        lustre: [this.add.image(meio.x, meio.y - 120, 'cenario', 'lustre').setDepth(99990),   // pendurado alto sobre o Salão…
          this.add.rectangle(meio.x, meio.y - 196, 1, 140, 0x2a1e12).setDepth(99990)],          // …pela corrente
        arvore: [sp('arvore_natal_0', ...E('arvore')[0], 16, 53)],
      };
      this.velas = MapaMundo.VELAS.map(([c, r]) => { const { x, y, chao } = tela(c, r); return this.add.image(x, y - 14, 'cenario', 'vela_0').setOrigin(.5, 1).setDepth(chao + Iso.TH / 2 + 1); });
      // troféus: uma medalha por conquista na parede norte do Salão (pulando as portas e o quadro de avisos)
      const pts = [13, 14, 18, 19, 20, 23, 24].flatMap(c => [.2, .5, .8].map(f => { const { x, y } = tela(c, 13); return [x + 32 * f, y - 16 + 16 * f - 44, y - 16]; }));
      this.trofeus = pts.slice(0, 20).map(([x, y, prof]) => this.add.image(Math.round(x), Math.round(y), 'gancho').setDepth(prof + .5).setInteractive({ useHandCursor: true }));
      this.trofeus.forEach(s => s.on('pointerup', () => { if (!this.arrastou) this.falar(this.trofeus[9], ops.texto && ops.texto('trofeus'), 4); }));
      for (const m of this.moveis) {                                   // lareira e estantes contam seus números
        const id = m.frame.name === 'lareira' ? 'lareira' : m.frame.name === 'estante' ? 'estante' : null;
        if (id) m.setInteractive({ useHandCursor: true }).on('pointerup', () => { if (!this.arrastou) this.falar(m, ops.texto && ops.texto(id), 5); });
      }
      this.lareira = this.moveis.find(m => m.frame.name === 'lareira');
      this.tochas = MapaMundo.TOCHAS.map(t => {                         // tocha presa na parede, no meio da borda
        const { x, y, chao } = tela(t.c, t.r), [px, py] = t.lado === 'norte' ? [x + 16, y - 8] : [x - 16, y - 8];
        return this.add.image(px, py - 40, 'cenario', 'tocha_0').setOrigin(.5, 1).setDepth(chao - 16 + 1);
      });
      this.luzImg = this.make.image({ key: 'luz', add: false });
      this.escuro = this.add.renderTexture(this.lim.x, this.lim.y, this.lim.w, this.lim.h).setOrigin(0).setDepth(99995);   // noite: abaixo de placas, ícones e falas
      this.proxNoite = 0; this.proxFogos = 0; this.proxPortas = 0; this.proxGota = 2; this.proxFumaca = 0;
      this.feixes = this.add.graphics().setDepth(-99996); this.feixesAtivos = [];
      const forno = this.moveis.find(m => m.frame.name === 'forno');
      this.chamines = [[this.lareira.x + 18, this.lareira.y - 70, this.lareira.depth + 1], ...(forno ? [[forno.x + 12, forno.y - 60, forno.depth + 1]] : [])];
      this.atualizarAmbiente();
      this.time.addEvent({ delay: 60000, loop: true, callback: () => this.atualizarAmbiente() });
    }
    atualizarAmbiente() {
      const p = this.prog = ops.progresso ? ops.progresso() : { antes: true, seq: 0, nivel: 1, classe: 'andarilho', conquistas: [] };
      const lib = new Set(VidaMundo.enfeites(p.nivel)), ep = this.epoca = VidaMundo.epoca(new Date());
      for (const [id, lista] of Object.entries(this.enf)) lista.forEach(s => { s.setVisible(id === 'arvore' ? ep.natal : lib.has(id)); if (s.sombra) s.sombra.setVisible(s.visible); });
      this.enf.bandeiras.forEach(s => s.setFrame('estandarte_' + p.classe));
      this.enf.estatua[0].setFrame('estatua_' + p.classe);
      this.trofeus.forEach((s, i) => { const c = p.conquistas[i]; s.setTexture(c && c.ok ? 'medalha_' + c.tier : 'gancho'); });
      this.fogo = VidaMundo.fogo(p.antes, p.seq);
      const rf = VidaMundo.reformas(p.nivel), R = this.reforma;   // o castelo evolui com o nível
      R.palicada.forEach(o => o.setVisible(rf.muralha === 'palicada')); R.pedra.forEach(o => o.setVisible(rf.muralha === 'pedra'));
      R.torres.forEach(o => o.setVisible(rf.torres)); R.estandartes.forEach(o => o.setVisible(rf.estandartes).setFrame('estandarte_' + p.classe));
      R.jardim.forEach(o => o.setVisible(rf.jardim));
      this.atualizarDados();
      this.ceu = VidaMundo.ceu(new Date().getHours());
    }
    passoAmbiente(time, dt) {
      const f = this.fogo, L = this.lareira;
      if (L && !this.calmo) {                                          // fogo da lareira = sua sequência
        const bx = L.x + 18, by = L.y - 26;
        if (f.tipo === 'brasa') { if (Math.random() < .15) this.faisca(bx + Math.random() * 16 - 8, by + 2, Math.random() < .5 ? 0xa8322a : 0xe86a3a, 0, 700, L.depth + 1, 1.5); }
        else {
          const cores = FOGO_COR[f.cor];
          if (Math.random() < .55 * f.escala) this.faisca(bx + (Math.random() * 12 - 6) * f.escala / 2, by, cores[Math.floor(Math.random() * 3)], -10 * f.escala, 450 + Math.random() * 250, L.depth + 1, f.escala);
          if (f.faiscas && Math.random() < .05) this.faisca(bx + Math.random() * 10 - 5, by - 6, cores[1], -30, 900, L.depth + 1, 1);
        }
      }
      if (this.epoca.natal) this.enf.arvore[0].setFrame('arvore_natal_' + (Math.floor(time / 800) % 2));
      if (!this.calmo) {
        const qa = Math.floor(time / 700) % 2, qt = Math.floor(time / 140) % 3;   // água do fosso e chama das tochas
        if (qa !== this.quadroAgua) { this.quadroAgua = qa; this.agua.forEach(a => a.setFrame('agua_' + qa)); }
        if (qt !== this.quadroTocha) { this.quadroTocha = qt; this.tochas.forEach((t, i) => t.setFrame('tocha_' + ((qt + i) % 3))); }
      }
      if (!this.calmo) {                                                 // goteira no porão
        if ((this.proxGota -= dt) <= 0) { this.proxGota = 2 + Math.random() * 2.5; const g = this.goteira;
          const d = this.add.rectangle(g.x, g.y - 96, 1.5, 3, 0x8fb0f0).setDepth(g.prof);
          this.tweens.add({ targets: d, y: g.y, duration: 700, ease: 'Quad.easeIn', onComplete: () => { d.destroy(); for (const s of [-1, 1]) this.faisca(g.x + s * 2, g.y, 0x8fb0f0, -3, 300, g.prof, 1); } }); }
        this.rato.setFrame('rato_' + (Math.floor(time / 150) % 2));
      }
      if ((this.proxPortas -= dt) <= 0) {                               // portas abrem com alguém por perto
        this.proxPortas = .2;
        const quem = [this.reiTile, ...this.agentes.filter(a => !a.d.preso).map(a => a.tile)];
        for (const p of this.portas) p.folha.setVisible(!quem.some(([qc, qr]) => p.tiles.some(([c, r]) => Math.abs(qc - c) <= 1 && Math.abs(qr - r) <= 1)));
      }
      if (this.epoca.virada && !this.calmo && (this.proxFogos -= dt) <= 0) { this.proxFogos = .6 + Math.random() * .8; this.fogosArtificio(); }
      if (!this.calmo) {                                                 // chama das velas, fumaça da lareira e do forno, vapor do caldeirão, poeira na luz
        const qv = Math.floor(time / 160) % 3;
        if (qv !== this.quadroVela) { this.quadroVela = qv; this.velas.forEach((v, i) => v.setFrame('vela_' + ((qv + i) % 3))); }
        if ((this.proxFumaca -= dt) <= 0) { this.proxFumaca = .5; for (const [x, y, prof] of this.chamines) this.fumaca(x, y, prof); }
        if (Math.random() < .08) { const c = tela(6, 16); this.faisca(c.x + Math.random() * 10 - 5, c.y - 24, 0xe8ecf2, -18, 1200, c.chao + 20, 1.5); }
        if (this.feixesAtivos.length && Math.random() < .25) this.poeira();
      }
      if ((this.proxNoite -= dt) > 0) return;                          // céu: cor contínua pela hora; escuro com buracos de luz (10x por segundo)
      this.proxNoite = .1;
      const agora = new Date(), hora = this.horaForcada != null ? this.horaForcada : agora.getHours() + agora.getMinutes() / 60;
      const ceu = this.corCeu = VidaMundo.corDoCeu(hora);
      this.desenharFeixes(ceu, hora);
      if (ceu.alfa < .02) { this.escuro.setVisible(false); return; }
      this.escuro.setVisible(true).clear().fill(ceu.cor, ceu.alfa);
      if (ceu.alfa < .2) return;                                         // só acende as luzes quando escurece de verdade
      const tremor = 1 + Math.sin(time / 160) * .04;
      for (const [x, y, r] of this.luzes()) this.escuro.erase(this.luzImg.setPosition(x - this.lim.x, y - this.lim.y).setScale(r * 2 * tremor / 128));
    }
    luzes() {
      const l = [];
      if (this.lareira) l.push([this.lareira.x + 18, this.lareira.y - 26, this.fogo.luz * 2]);
      for (const v of this.velas) l.push([v.x, v.y - 6, 70]);
      const cald = tela(6, 16); l.push([cald.x, cald.y - 10, 60]);
      const lustre = this.enf.lustre[0], arvore = this.enf.arvore[0];
      if (lustre.visible) l.push([lustre.x, lustre.y + 60, 220]);
      if (arvore.visible) l.push([arvore.x, arvore.y - 30, 70]);
      for (const t of this.tochas) l.push([t.x, t.y - 18, 80]);
      return l;
    }
    desenharFeixes(ceu, hora) {   // de dia, feixes de luz entram pelas janelas; o ângulo muda com a hora
      const g = this.feixes; g.clear(); this.feixesAtivos = [];
      const forca = hora < 6.5 || hora > 18 ? 0 : Math.max(0, 1 - ceu.alfa * 4);
      if (!forca) return;
      const L = 1.4 + Math.abs(hora - 12) / 3.5, lado = (hora - 12) / 6 * .6;   // manhã/tarde: feixe mais comprido e enviesado
      const dx = L * 32 - lado * 32, dy = L * 16 + lado * 16;
      for (const seg of this.janelas) {
        const { x, y } = tela(seg.c, seg.r), A = [x - 32 + 8, y - 4], B = [x - 8, y - 12];   // pedaço da borda onde fica a janela
        const pts = [A, B, [B[0] + dx, B[1] + dy], [A[0] + dx, A[1] + dy]];
        g.fillStyle(0xfff0c0, .16 * forca).fillPoints(pts.map(([px, py]) => ({ x: px, y: py })), true);
        this.feixesAtivos.push(pts);
      }
    }
    poeira() {   // grão de poeira flutuando dentro de um feixe
      const [A, B, C] = this.feixesAtivos[Math.floor(Math.random() * this.feixesAtivos.length)], u = Math.random(), v = Math.random();
      const x = A[0] + (B[0] - A[0]) * u + (C[0] - B[0]) * v, y = A[1] + (B[1] - A[1]) * u + (C[1] - B[1]) * v;
      const p = this.add.rectangle(x, y, 1, 1, 0xfff2c0, .8).setDepth(y + 30);
      this.tweens.add({ targets: p, y: y - 8, x: x + (Math.random() - .5) * 6, alpha: 0, duration: 1800, onComplete: () => p.destroy() });
    }
    fumaca(x, y, prof) {   // baforada de fumaça subindo e abrindo
      const f = this.add.circle(x + Math.random() * 4 - 2, y, 2.5, 0x9a948c, .35).setDepth(prof);
      this.tweens.add({ targets: f, y: y - 34, x: f.x + (Math.random() - .5) * 10, scale: 2.4, alpha: 0, duration: 2200, onComplete: () => f.destroy() });
    }
    faisca(x, y, cor, sobe, dur, prof, tam) {
      const r = this.add.rectangle(x, y, tam, tam, cor).setDepth(prof);
      this.tweens.add({ targets: r, y: y + sobe, alpha: 0, duration: dur, onComplete: () => r.destroy() });
    }
    fogosArtificio() {   // virada do ano: estouros no céu acima do castelo
      const x = this.lim.x + 200 + Math.random() * (this.lim.w - 400), y = this.lim.y + 120 + Math.random() * 120;
      const cor = [0xf5c542, 0xd94848, 0x8fd3ff, 0x4f9a63][Math.floor(Math.random() * 4)];
      for (let a = 0; a < 12; a++) {
        const r = this.add.rectangle(x, y, 3, 3, cor).setDepth(99996);
        this.tweens.add({ targets: r, x: x + Math.cos(a * Math.PI / 6) * 40, y: y + Math.sin(a * Math.PI / 6) * 40 + 10, alpha: 0, duration: 1000, ease: 'Quad.easeOut', onComplete: () => r.destroy() });
      }
    }
    criarDonos() {   // donos-objeto (estandarte, quadro) e os personagens vivos (donos + moradores)
      this.calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.donos = {}; this.agentes = [];
      for (const d of [...MapaMundo.DONOS, ...MapaMundo.MORADORES]) {
        const { x, y } = tela(d.c, d.r);
        if (d.objeto) {
          const s = this.add.sprite(x, y + Iso.TH / 2, 'cenario', ops.quadro(d.id)).setDepth(y + alturaDe([d.c, d.r]) + Iso.TH / 2);
          s.setOrigin(ANCORA[d.id][0] / s.width, ANCORA[d.id][1] / s.height).setInteractive({ useHandCursor: true });
          s.on('pointerup', () => { if (!this.arrastou) this.abrirDono(d); });
          this.sombra(x, y + 4, 18); this.donos[d.id] = s; continue;
        }
        const spr = d.id;
        for (const [k, fs] of [['_frente', ['_f1', '_f2']], ['_costas', ['_c1', '_c2']]])
          if (!this.anims.exists(spr + k)) this.anims.create({ key: spr + k, frames: fs.map(f => ({ key: 'personagens', frame: spr + f })), frameRate: 6, repeat: -1 });
        const s = this.add.sprite(x, y, 'personagens', spr + '_f').setOrigin(.5, 46 / 48).setDepth(y + alturaDe([d.c, d.r])).setInteractive({ useHandCursor: true });
        const ag = { d, s, spr, id: d.agente || d.id, posto: [d.c, d.r], tile: [d.c, d.r], t: 0, poi: null, missao: null, emote: null, emoteT: 0 };
        ag.icone = this.add.image(x, y, 'icone_fala').setOrigin(.5, 1).setDepth(100001).setVisible(false);
        s.on('pointerup', () => { if (!this.arrastou) this.clicarAgente(ag); });
        if (d.preso && !this.calmo) ag.ronda = this.tweens.add({ targets: s, x: x + 12, duration: 1600, yoyo: true, repeat: -1,
          onYoyo: () => s.setFlipX(true), onRepeat: () => s.setFlipX(false) });   // Kobe anda de um lado pro outro na jaula
        s.sombra = this.sombra(x, y, 22); this.donos[d.id] = s; this.agentes.push(ag);
      }
      this.vida = null; this.lerVida();
      this.time.addEvent({ delay: 30000, loop: true, callback: () => this.lerVida() });
    }
    lerVida() {
      const antes = this.vida;
      this.vida = ops.vida ? ops.vida() : { agentes: {}, noite: false };
      if (!antes || this.calmo) return;
      for (const ag of this.agentes) {                           // a rotina começou agora: entra correndo pela porta
        if (ag.d.preso || ag.d.fixo) continue;
        if (VidaMundo.chegouTrabalho((antes.agentes[ag.id] || {}).estado, (this.vida.agentes[ag.id] || {}).estado)) {
          this.teleportar(ag, MapaMundo.PARTIDA); ag.rapido = true; ag.missao = null;
          this.falar(ag.s, 'Chegou trabalho! Com licença!', 3);
        }
      }
    }
    reagir() {
      if (!ops.reacoes || this.calmo) return;
      const { quem, agora } = ops.reacoes(), porId = id => this.agentes.find(a => a.id === id);
      for (const id of quem) {
        const ag = porId(id);
        if (!ag) continue;
        if (id === 'jefrey') ag.missao = { alvo: this.vizinhoDoRei(), chegar: () => { this.falar(ag.s, 'Treino feito! É disso que eu tô falando!', 5); this.emote(ag, 'coracao', 4);
          this.tweens.add({ targets: ag.s, y: ag.s.y - 6, duration: 160, yoyo: true, repeat: 3 }); } };
        if (id === 'maria') ag.missao = { alvo: [19, 21], chegar: () => this.falar(ag.s, `Prontinho${agora.receitaNome ? ': ' + agora.receitaNome : ''}! Bom apetite.`, 5) };
        if (id === 'mosley') ag.missao = { alvo: this.vizinhoDoRei(), chegar: () => {
          this.falar(ag.s, `${agora.livroNome ? '"' + agora.livroNome + '"' : 'Esse livro'} vai pra estante.`, 4); this.emote(ag, 'livro', 6);
          ag.missao = { alvo: ag.posto, chegar: () => this.falar(ag.s, 'Guardado. A estante cresce.', 4) }; } };
      }
    }
    estadoDe(ag) {
      if (ag.d.fixo) return this.vida.noite ? 'dormindo' : 'guardando';   // Escrivão: guardião do arquivo
      return (this.vida.agentes[ag.id] || {}).estado || 'descansando';
    }
    teleportar(ag, tile) {
      this.tweens.killTweensOf(ag.s); ag.andando = false;
      const { x, y, chao } = tela(...tile); ag.s.setPosition(x, y).setDepth(chao); ag.tile = tile.slice();
    }
    irAgente(ag, alvo, rapido, chegar) {
      const passos = Iso.caminho(MapaMundo.andavelAgente, ag.tile, alvo);
      if (!passos.length) { if (chegar) chegar(); return; }
      ag.andando = true;
      const proximo = () => {
        const p = passos.shift();
        if (!p) {
          ag.andando = false; ag.s.anims.stop();
          const noPosto = ag.tile[0] === ag.posto[0] && ag.tile[1] === ag.posto[1];
          ag.s.setFrame(ag.spr + (ag.costas && !noPosto ? '_c' : '_f')); if (noPosto) ag.s.setFlipX(false);
          if (chegar) chegar(); return;
        }
        const de = tela(...ag.tile), para = tela(...p);
        ag.costas = para.y < de.y;
        ag.s.setFlipX(para.x < de.x).play(ag.spr + (ag.costas ? '_costas' : '_frente'), true);
        const dz = alturaDe(p);
        this.tweens.add({ targets: ag.s, x: para.x, y: para.y, duration: rapido ? 130 : 260, onUpdate: () => ag.s.setDepth(ag.s.y + dz),
          onComplete: () => { ag.tile = p; proximo(); } });
      };
      proximo();
    }
    passoAgente(ag, dt) {
      if (ag.emoteT > 0 && (ag.emoteT -= dt) <= 0) ag.emote = null;
      if (ag.d.preso || ag.andando) return;
      const quer = VidaMundo.desejo(this.estadoDe(ag));
      if (quer !== 'vagar' || this.calmo || ag.d.fixo) {          // trabalha, erra ou dorme no posto
        if (ag.tile[0] !== ag.posto[0] || ag.tile[1] !== ag.posto[1]) {
          if (this.calmo) this.teleportar(ag, ag.posto); else { const r = ag.rapido; ag.rapido = false; this.irAgente(ag, ag.posto, r); }
        }
        ag.poi = null; return;
      }
      if (ag.missao) { const m = ag.missao; ag.missao = null; ag.poi = null; ag.t = 6; return this.irAgente(ag, m.alvo, false, m.chegar); }   // cena ou reação
      if ((ag.t -= dt) > 0) return;
      const ocupados = new Set(this.agentes.filter(o => o !== ag && o.poi).map(o => o.poi.c + ',' + o.poi.r));
      const dst = VidaMundo.proximoDestino({ posto: ag.posto, noHorario: (this.vida.agentes[ag.id] || {}).noHorario }, MapaMundo.POIS, ocupados, Math.random);
      ag.poi = dst.poi; ag.t = 6 + Math.random() * 8;
      this.irAgente(ag, dst.tile, false, () => this.chegouPoi(ag));
    }
    emote(ag, nome, seg) { ag.emote = nome; ag.emoteT = seg; }
    chegouPoi(ag) {
      const a = ag.poi && ag.poi.a;
      if (a === 'beber') this.emote(ag, 'caneca', 3);
      else if (a === 'aquecer') this.emote(ag, 'coracao', 2.5);
      else if ((a === 'comer' || a === 'sentar') && this.agentes.some(o => o !== ag && Math.abs(o.tile[0] - ag.tile[0]) + Math.abs(o.tile[1] - ag.tile[1]) <= 2)) this.emote(ag, 'fala', 4);
    }
    tentarCena() {
      const porId = id => this.agentes.find(a => a.id === id);
      const livre = id => { const a = porId(id); return a && !a.missao && !a.d.fixo && VidaMundo.desejo(this.estadoDe(a)) === 'vagar'; };
      const c = VidaMundo.escolherCena(MapaMundo.CENAS, livre, Math.random);
      if (!c) return;
      const A = porId(c.a), B = porId(c.b);
      A.missao = { alvo: c.ta, chegar: () => { this.falar(A.s, c.fa, 4); this.emote(A, c.emote, 4); } };
      B.missao = { alvo: c.tb, chegar: () => this.time.delayedCall(1200, () => { this.falar(B.s, c.fb, 4); this.emote(B, c.emote, 4); }) };
    }
    vizinhoDoRei() {
      return [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([dc, dr]) => [this.reiTile[0] + dc, this.reiTile[1] + dr]).find(t => MapaMundo.andavel(...t)) || this.reiTile.slice();
    }
    criarGato() {
      const { x, y } = tela(16, 16);
      this.gato = { tile: [16, 16], t: 3, s: this.add.sprite(x, y, 'cenario', 'gato_pe').setOrigin(.5, 1).setDepth(y).setInteractive({ useHandCursor: true }) };
      this.gato.s.sombra = this.sombra(x, y, 12);
      this.gato.s.on('pointerup', () => { if (!this.arrastou) this.falar(this.gato.s, 'Miau.', 2.5); });
    }
    passoGato(dt) {
      const g = this.gato;
      if (this.calmo || g.andando || (g.t -= dt) > 0) return;
      const salao = MapaMundo.SALAS.find(s => s.id === 'salao');
      const alvo = this.vida.noite || Math.random() < .3 ? [16, 15]                       // dorme perto da lareira
        : Math.random() < .3 ? this.vizinhoDoRei()                                      // vai atrás do Rei
        : [salao.x + Math.floor(Math.random() * salao.w), salao.y + Math.floor(Math.random() * salao.h)];
      const passos = Iso.caminho(MapaMundo.andavel, g.tile, alvo);
      if (!passos.length) { g.t = 2; return; }
      g.andando = true; g.s.setFrame('gato_pe');
      const prox = () => {
        const p = passos.shift();
        if (!p) { g.andando = false; g.t = 6 + Math.random() * 10; if (this.vida.noite || Math.random() < .5) g.s.setFrame('gato_dorme'); return; }
        const de = tela(...g.tile), para = tela(...p);
        g.s.setFlipX(para.x < de.x);
        this.tweens.add({ targets: g.s, x: para.x, y: para.y, duration: 300, onUpdate: () => g.s.setDepth(g.s.y), onComplete: () => { g.tile = p; prox(); } });
      };
      prox();
    }
    desenharAgente(ag, time) {
      const s = ag.s, est = this.estadoDe(ag), dorme = est === 'dormindo' || est === 'desligado' || (ag.d.preso && this.vida.noite);
      if (ag.ronda) { if (dorme && !ag.ronda.isPaused()) ag.ronda.pause(); else if (!dorme && ag.ronda.isPaused()) ag.ronda.resume(); }
      const parado = !ag.andando, trab = est === 'trabalhando' && parado;
      const bob = parado && !dorme ? Math.floor(time / (trab ? 200 : 900)) % 2 : 0;          // respira 1px mexendo a origem (não briga com os tweens)
      s.setOrigin(.5, (46 + bob) / 48).setAlpha(dorme ? .85 : 1);
      const st = this.vida.agentes[ag.id] || {};
      const icone = s.balao ? null : dorme ? 'zz' : est === 'erro' ? 'erro' : trab ? 'fala' : ag.emote || (st.recente && est === 'descansando' ? 'ok' : null);
      ag.icone.setVisible(!!icone);
      if (icone) ag.icone.setTexture('icone_' + icone).setPosition(Math.round(s.x), Math.round(s.getTopCenter().y - 1));
      if (s.balao) s.balao.setPosition(s.x, s.getTopCenter().y - 4);
      const noPosto = ag.tile[0] === ag.posto[0] && ag.tile[1] === ag.posto[1];
      if (!this.calmo && parado && !dorme && (trab || noPosto) && Math.random() < (trab ? .1 : .03)) this.particula(ag);
    }
    particula(ag) {
      const p = PARTICULAS[(this.vida.agentes[ag.id] || {}).acao];
      if (!p) return;
      let x = ag.s.x + (ag.s.flipX ? -7 : 7), y = ag.s.y - 30;
      if (p.alvo) { const t = tela(...p.alvo); x = t.x; y = t.y - p.dy; }
      const r = this.add.rectangle(x + Math.random() * 6 - 3, y, 1.5, 1.5, p.cor).setDepth(ag.s.depth + 1);
      this.tweens.add({ targets: r, y: y + p.vy, x: r.x + (Math.random() - .5) * 7, alpha: 0, duration: 1200, onComplete: () => r.destroy() });
    }
    clicarAgente(ag) {
      if (MapaMundo.DONOS.includes(ag.d)) return this.abrirDono(ag.d);
      this.falar(ag.s, ops.frase && ops.frase(ag.id), 5);
    }
    update(time, delta) {
      if (!this.vida) return;
      const dt = Math.min(.1, delta / 1000);
      for (const ag of this.agentes) { this.passoAgente(ag, dt); this.desenharAgente(ag, time); }
      this.passoGato(dt);
      this.passoAmbiente(time, dt);
      for (const s of [this.rei, this.gato.s, ...this.agentes.map(a => a.s)]) s.sombra.setPosition(s.x, s.y).setVisible(s.visible);
      if (this.gato.s.balao) this.gato.s.balao.setPosition(this.gato.s.x, this.gato.s.getTopCenter().y - 4);
      if (this.calmo) return;
      if ((this.proxConversa -= dt) <= 0) {                     // alguém acordado fala sozinho de vez em quando
        this.proxConversa = 12 + Math.random() * 10;
        const quem = this.agentes.filter(a => !a.s.balao && !['dormindo', 'desligado'].includes(this.estadoDe(a)) && !(a.d.preso && this.vida.noite));
        const ag = quem[Math.floor(Math.random() * quem.length)];
        if (ag && ops.frase) this.falar(ag.s, ops.frase(ag.id), 4.5);
      }
      if ((this.proxCena -= dt) <= 0) { this.proxCena = 35 + Math.random() * 35; if (!this.vida.noite) this.tentarCena(); }
    }
    abrirDono(d) {
      this.mostrarBalao(d);
      const ag = this.agentes.find(a => a.d === d);
      this.andarPor(Iso.caminhoAteVizinho(MapaMundo.andavel, this.reiTile, ag ? ag.tile : [d.c, d.r]));
      if (ops.abrirSala) ops.abrirSala(d.sala);
    }
    andarAte(c, r) { this.andarPor(Iso.caminho(MapaMundo.andavel, this.reiTile, [c, r])); }
    andarPor(passos) {
      if (!passos.length) return;
      this.tweens.killTweensOf(this.rei);
      const proximo = () => {
        const alvo = passos.shift();
        if (!alvo) { const costas = this.rei.anims.currentAnim?.key === 'rei_costas'; this.rei.anims.stop(); this.rei.setFrame(costas ? 'eu_rei_c' : 'eu_rei_f'); return; }
        const de = tela(...this.reiTile), para = tela(...alvo);
        const costas = para.y < de.y;
        this.rei.setFlipX(para.x < de.x).play(costas ? 'rei_costas' : 'rei_frente', true);
        const dz = alturaDe(alvo);
        this.tweens.add({ targets: this.rei, x: para.x, y: para.y, duration: 220, onUpdate: () => { this.rei.setDepth(this.rei.y + dz); this.atualizarParedes(); },
          onComplete: () => { this.reiTile = alvo; proximo(); } });
      };
      proximo();
    }
    zoomPara(n) { this.cameras.main.setZoom(Math.max(1, Math.min(4, Math.round(n)))); }
    irPara(id) {
      const [c, r] = MapaMundo.centro(id), { x, y } = tela(c, r);
      this.cameras.main.pan(x, y, 600, 'Sine.easeInOut', true, (cam, prog) => { if (prog === 1) this.aoPararCamera(); });
    }
    aoPararCamera() {
      const m = this.cameras.main.midPoint, t = this.telaParaTile(m.x, m.y), s = MapaMundo.salaDe(t.c, t.r), id = s && s.id;
      if (id === this.salaVista) return;
      this.salaVista = id;
      const d = id && MapaMundo.DONOS.find(x => x.sala === id);
      if (d) this.mostrarBalao(d);
    }
    falar(s, texto, seg = 6) {
      if (!texto) return;
      if (s.balao) s.balao.destroy();
      const topo = s.getTopCenter();
      const b = s.balao = this.add.text(topo.x, topo.y - 4, texto, { fontFamily: '"Alegreya Sans", sans-serif', fontSize: '10px', color: '#2a1e12',
        backgroundColor: '#f3e3bb', padding: { x: 6, y: 4 }, wordWrap: { width: 140 }, align: 'center', resolution: 4 }).setOrigin(.5, 1).setDepth(100002);
      this.time.delayedCall(seg * 1000, () => { b.destroy(); if (s.balao === b) s.balao = null; });
    }
    mostrarBalao(d) {
      const texto = ops.resumo && ops.resumo(d.sala), s = this.donos[d.id];
      if (!texto) return;
      if (d.objeto && ops.quadro) s.setFrame(ops.quadro(d.id));    // classe e papéis do quadro podem ter mudado
      this.falar(s, texto, 6);
    }
    configurarCamera() {
      const cam = this.cameras.main;
      this.input.addPointer(1);
      let ini = null, base = null;
      this.input.on('pointerdown', p => { ini = { x: p.x, y: p.y, sx: cam.scrollX, sy: cam.scrollY }; this.arrastou = false; });
      this.input.on('pointermove', p => {
        const a = this.input.pointer1, b = this.input.pointer2;
        if (a.isDown && b.isDown) {                                   // pinça: degraus inteiros
          const d = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
          if (!base) base = d;
          if (d / base > 1.3) { this.zoomPara(cam.zoom + 1); base = d; } else if (d / base < .77) { this.zoomPara(cam.zoom - 1); base = d; }
          this.arrastou = true; ini = null; return;               // sem ini: o dedo que sobrar não dá pulo
        }
        if (!p.isDown || !ini) return;
        if (Math.hypot(p.x - ini.x, p.y - ini.y) > 6) this.arrastou = true;
        if (this.arrastou) { cam.scrollX = ini.sx - (p.x - ini.x) / cam.zoom; cam.scrollY = ini.sy - (p.y - ini.y) / cam.zoom; }
      });
      this.input.on('pointerup', () => {
        if (!this.input.pointer1.isDown && !this.input.pointer2.isDown) base = null;
        if (this.arrastou) this.aoPararCamera();
      });
      this.input.on('wheel', (p, objs, dx, dy) => this.zoomPara(cam.zoom + (dy < 0 ? 1 : -1)));
    }
    desenharChao() {
      const tiles = new Set();
      for (const s of MapaMundo.SALAS) for (let c = s.x; c < s.x + s.w; c++) for (let r = s.y; r < s.y + s.h; r++) tiles.add(c + ',' + r);
      for (const p of MapaMundo.PASSAGENS) for (const [c, r] of p.tiles) tiles.add(c + ',' + r);
      for (const k of tiles) {                                            // piso pintado contínuo, variante sorteada pela posição
        const [c, r] = k.split(',').map(Number), { x, y } = tela(c, r);
        const chao = this.add.image(x, y, 'cenario', this.piso(MapaMundo.chaoDe(c, r), c, r)).setDepth(-100000);
        if (MapaMundo.altura(c, r) < 0) chao.setTint(0xb4b4c4);           // porão afundado: mais escuro
        const s = MapaMundo.salaDe(c, r);                                 // flores no gramado do Pátio
        if (s && s.chao === 'grama' && MapaMundo.chaoDe(c, r) === 'grama' && this.sorteio(c, r, 7) < 2) this.add.image(x, y, 'cenario', 'flores_' + this.sorteio(c, r, 3)).setDepth(-99998);
      }
      for (const t of MapaMundo.TAPETES) {                                // tapetes por sala (decalque no chão)
        const { x, y } = tela(t.c, t.r), img = this.add.image(x, y - Iso.TH / 2, 'cenario', t.item).setDepth(-99998.5);
        img.setOrigin(t.m * 32 / img.width, 0);
      }
      for (const s of MapaMundo.SALAS.filter(s => !s.parede))            // cerca de madeira em volta do Pátio (com vão na entrada)
        for (const seg of this.bordas(s)) {
          const fora = this.foraDe(seg);
          if (MapaMundo.passagemDe(...fora)) continue;
          this.pecaNaBorda(seg.lado === 'norte' || seg.lado === 'sul' ? 'cerca_dir' : 'cerca_esq', seg, 40);
        }
      for (const p of MapaMundo.PASSAGENS.filter(p => p.escada)) {
        const [c, r] = p.tiles[0], { x, y } = tela(c, r);
        this.add.image(x, y + Iso.TH / 2, 'cenario', 'escada').setOrigin(ANCORA.escada[0] / 64, ANCORA.escada[1] / 64).setDepth(y + alturaDe([c, r]) - 1);
      }
    }
    desenharMoveis() {
      for (const m of MapaMundo.MOVEIS) {                                   // sombra de contato no centro do que o móvel ocupa
        const oc = m.ocupa || [[0, 0]], cc = m.c + oc.reduce((s, o) => s + o[0], 0) / oc.length, rr = m.r + oc.reduce((s, o) => s + o[1], 0) / oc.length;
        const { x, y } = tela(cc, rr), fr = this.textures.getFrame('cenario', m.item === 'jaula' ? 'jaula_chao' : m.item);
        this.sombra(x, y + 2, Math.min(fr.width * .8, 30 + 26 * (oc.length - 1)));
      }
      this.objDados = {};
      this.moveis = MapaMundo.MOVEIS.flatMap(m => {
        const { x, y, chao } = tela(m.c, m.r), base = y + Iso.TH / 2, prof = chao + Iso.TH / 2;   // desenha na altura do piso, ordena pelo chão
        const img = (item, d) => { const fr = this.textures.getFrame('cenario', item), [ax, ay] = ANCORA[item] || ANCORA[item.replace(/_\d+$/, '')] || [fr.width / 2, fr.height - 1];
          const s = this.add.image(x, base, 'cenario', item).setOrigin((m.flip ? fr.width - ax : ax) / fr.width, ay / fr.height).setDepth(d).setFlipX(!!m.flip);
          if (m.dados) (this.objDados[m.dados] = this.objDados[m.dados] || [])[m.ordem || 0] = s;   // muda de quadro conforme os dados
          return s; };
        return m.item === 'jaula' ? [img('jaula_chao', prof - 48), img('jaula_grades', prof)] : [img(m.item, prof)];   // Kobe fica entre o chão e as grades
      });
    }
    desenharPlacas() {
      this.placas = MapaMundo.SALAS.map(s => {
        const { x, y } = tela(s.x + s.w / 2 - .5, s.y + .2);
        return this.add.text(x, y - 70, s.nome, { fontFamily: '"Alegreya Sans", sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#f3e3bb',
          backgroundColor: '#4a2c16', padding: { x: 5, y: 2 }, stroke: '#140f18', strokeThickness: 3, resolution: 4 }).setOrigin(.5, 1).setDepth(100000);
      });
    }
    desenharParedes() {   // paredes do fundo (com acabamento e estilo da sala), mureta de meia altura na frente, fundação sob a sala elevada
      this.paredes = []; this.portas = []; this.janelas = [];
      for (const s of MapaMundo.SALAS.filter(s => s.parede)) {
        const suf = s.alta ? '_alta' : '', H = s.alta ? 112 : 80, pedra = s.parede.startsWith('pedra');
        for (const seg of this.bordas(s)) {
          const fora = this.foraDe(seg), passagem = !!MapaMundo.passagemDe(...fora), vizinha = MapaMundo.salaDe(...fora);
          if (seg.lado === 'oeste' || seg.lado === 'norte') {
            const tipo = seg.lado === 'oeste' ? 'esq' : 'dir', janela = tipo === 'esq' && seg.r % 4 === 2 && !pedra && !passagem;
            const parede = this.pecaNaBorda(`parede_${tipo}_${s.parede}${passagem ? '_porta' : janela ? '_janela' : ''}${suf}`, seg, H);
            if (janela) this.janelas.push(seg);
            this.paredes.push(parede);
            if (passagem) {                                             // porta de madeira que abre quando alguém chega perto
              const folha = this.pecaNaBorda(`porta_${tipo}${suf}`, seg, H).setDepth(parede.depth + .5);
              this.paredes.push(folha); this.portas.push({ folha, tiles: MapaMundo.passagemDe(...fora).tiles });
            }
          } else {                                                      // frente: vão nas passagens, nada onde a sala vizinha já tem parede, porta principal do Salão
            if (passagem || vizinha || (s.id === 'salao' && seg.lado === 'sul' && (seg.c === 18 || seg.c === 19))) continue;
            this.paredes.push(this.pecaNaBorda(`mureta_${seg.lado === 'sul' ? 'dir' : 'esq'}_${s.parede}`, seg, 36));
          }
        }
        if (s.alt > 0) for (const seg of this.bordas(s).filter(g => g.lado === 'sul' || g.lado === 'leste'))   // a sala de cima fica sobre uma base de pedra
          this.pecaNaBorda(seg.lado === 'sul' ? 'fundacao_dir' : 'fundacao_esq', seg, s.alt + 16, 0).setDepth(-99500);
      }
    }
  }

  window.MundoTracker = {
    iniciar(el, opcoes = {}) {
      if (jogo) return jogo;
      ops = opcoes;
      jogo = new Phaser.Game({ type: Phaser.AUTO, parent: el, pixelArt: true, backgroundColor: '#120d08',
        scale: { mode: Phaser.Scale.RESIZE, width: el.clientWidth || 800, height: el.clientHeight || 600 },
        fps: { forceSetTimeOut: !!opcoes.teste }, scene: [CenaMundo] });
      return jogo;
    },
    pausar() { if (jogo) jogo.loop.sleep(); },
    retomar() {
      if (!jogo) return;
      jogo.loop.wake();
      const c = this.cena(); if (c && c.vida) { c.lerVida(); c.reagir(); c.atualizarAmbiente(); }   // voltou pro Mundo: reage ao que você fez nesse meio-tempo
    },
    cena() { return jogo && jogo.scene.getScene('mundo'); },
    irPara(id) { const c = this.cena(); if (c && c.irPara) c.irPara(id); },
    andarAte(col, lin) { const c = this.cena(); if (c && c.andarAte) c.andarAte(col, lin); },
  };
})();
