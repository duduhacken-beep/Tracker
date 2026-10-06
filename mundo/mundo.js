// app/mundo/mundo.js — cena Phaser do Mundo (castelo-taverna isométrico com os agentes vivos)
(function () {
  const ANCORA = { balcao: [24, 55], mesa_longa: [32, 50], banco: [11, 27], estante: [16, 79], armario_arquivo: [16, 71],
    lareira: [22, 90], escrivaninha: [16, 38], bau: [13, 26], cofre: [15, 38], cama: [22, 46], escada: [18, 62], jaula: [32, 70],
    jaula_chao: [32, 70], jaula_grades: [32, 70], estandarte: [4, 54], quadro: [16, 46] };
  // ícones de pixel acima da cabeça (os mesmos da Taverna + "zz" de dormir)
  const ICONES = {
    caneca: ['.WWWW.', '.EEEEe', '.EEEEe', '.EEEE.'], nota: ['..kk', '..k.', '..k.', 'kkk.', 'kk..'], coracao: ['RR.RR', 'RRRRR', '.RRR.', '..R..'],
    fala: ['k.k.k'], erro: ['R', 'R', 'R', '.', 'R'], ok: ['....G', '...G.', 'G.G..', '.G...'], livro: ['RRRRR', 'RWWWR', 'RRRRR'], zz: ['BBB', '..B', '.B.', 'BBB'],
  };
  const PALETA = { W: 0xfff7c2, E: 0xc99a1f, e: 0x8a6a1f, k: 0x140f18, R: 0xd94848, G: 0x2f8a4a, B: 0x3b4a9a };
  // partículas da atividade de cada agente (cor, subida); "alvo" = tile de onde saem (vapor do caldeirão)
  const PARTICULAS = { mexer: { cor: 0xd7dbe2, vy: -34, alvo: [6, 16], dy: 26 }, contar: { cor: 0xf5c542, vy: -24 }, ler: { cor: 0xefe2c2, vy: -20 },
    escrever: { cor: 0x1b1d24, vy: -10 }, treinar: { cor: 0xf4f4f4, vy: -14 }, anunciar: { cor: 0xf5c542, vy: -38 }, estudar: { cor: 0x8fc4e8, vy: -24 } };
  let jogo = null, ops = {};

  class CenaMundo extends Phaser.Scene {
    constructor() { super('mundo'); }
    preload() {
      this.load.atlas('cenario', 'mundo/cenario.png?v=4', 'mundo/cenario.json?v=4');   // ?v: o navegador guardava o atlas antigo
      this.load.atlas('personagens', 'mundo/personagens.png?v=4', 'mundo/personagens.json?v=4');
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
      this.configurarCamera();
      this.criarRei();
      this.gerarIcones();
      this.criarDonos();
      this.criarGato(); this.proxConversa = 15; this.proxCena = 40;
      this.reagir();
      this.salaVista = 'salao';
    }
    criarRei() {
      const mk = (k, fs) => this.anims.create({ key: k, frames: fs.map(f => ({ key: 'personagens', frame: f })), frameRate: 6, repeat: -1 });
      mk('rei_frente', ['eu_rei_f1', 'eu_rei_f2']); mk('rei_costas', ['eu_rei_c1', 'eu_rei_c2']);
      this.reiTile = MapaMundo.PARTIDA.slice();
      const { x, y } = Iso.paraTela(...this.reiTile);
      this.rei = this.add.sprite(x, y, 'personagens', 'eu_rei_f').setOrigin(.5, 46 / 48).setDepth(y);
      this.input.on('pointerup', (p, sobre) => {
        if (this.arrastou || sobre.length) return;
        const w = this.cameras.main.getWorldPoint(p.x, p.y), t = Iso.paraTile(w.x, w.y);
        this.andarAte(t.c, t.r);
      });
      this.atualizarParedes();
    }
    atualizarParedes() {
      const rb = this.rei.getBounds();
      for (const p of this.paredes) p.setAlpha(p.depth > this.rei.depth && Phaser.Geom.Intersects.RectangleToRectangle(p.getBounds(), rb) ? .35 : 1);
      for (const p of this.placas) p.setAlpha(Phaser.Geom.Intersects.RectangleToRectangle(p.getBounds(), rb) ? .35 : 1);   // placa fica sempre por cima
    }
    gerarIcones() {
      for (const [nome, m] of Object.entries(ICONES)) {
        const w = m[0].length + 4, h = m.length + 4, g = this.make.graphics({ add: false });
        g.fillStyle(0x140f18).fillRect(0, 0, w + 2, h + 2).fillRect(Math.floor(w / 2), h + 2, 2, 2);   // borda + rabinho
        g.fillStyle(0xefe2c2).fillRect(1, 1, w, h);
        m.forEach((l, y) => [...l].forEach((ch, x) => { if (ch !== '.') g.fillStyle(PALETA[ch]).fillRect(3 + x, 3 + y, 1, 1); }));
        g.generateTexture('icone_' + nome, w + 2, h + 4); g.destroy();
      }
    }
    criarDonos() {   // donos-objeto (estandarte, quadro) e os personagens vivos (donos + moradores)
      this.calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.donos = {}; this.agentes = [];
      for (const d of [...MapaMundo.DONOS, ...MapaMundo.MORADORES]) {
        const { x, y } = Iso.paraTela(d.c, d.r);
        if (d.objeto) {
          const s = this.add.sprite(x, y + Iso.TH / 2, 'cenario', ops.quadro(d.id)).setDepth(y + Iso.TH / 2);
          s.setOrigin(ANCORA[d.id][0] / s.width, ANCORA[d.id][1] / s.height).setInteractive({ useHandCursor: true });
          s.on('pointerup', () => { if (!this.arrastou) this.abrirDono(d); });
          this.donos[d.id] = s; continue;
        }
        const spr = d.id;
        for (const [k, fs] of [['_frente', ['_f1', '_f2']], ['_costas', ['_c1', '_c2']]])
          if (!this.anims.exists(spr + k)) this.anims.create({ key: spr + k, frames: fs.map(f => ({ key: 'personagens', frame: spr + f })), frameRate: 6, repeat: -1 });
        const s = this.add.sprite(x, y, 'personagens', spr + '_f').setOrigin(.5, 46 / 48).setDepth(y).setInteractive({ useHandCursor: true });
        const ag = { d, s, spr, id: d.agente || d.id, posto: [d.c, d.r], tile: [d.c, d.r], t: 0, poi: null, missao: null, emote: null, emoteT: 0 };
        ag.icone = this.add.image(x, y, 'icone_fala').setOrigin(.5, 1).setDepth(100001).setVisible(false);
        s.on('pointerup', () => { if (!this.arrastou) this.clicarAgente(ag); });
        if (d.preso && !this.calmo) ag.ronda = this.tweens.add({ targets: s, x: x + 12, duration: 1600, yoyo: true, repeat: -1,
          onYoyo: () => s.setFlipX(true), onRepeat: () => s.setFlipX(false) });   // Kobe anda de um lado pro outro na jaula
        this.donos[d.id] = s; this.agentes.push(ag);
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
      const { x, y } = Iso.paraTela(...tile); ag.s.setPosition(x, y).setDepth(y); ag.tile = tile.slice();
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
        const de = Iso.paraTela(...ag.tile), para = Iso.paraTela(...p);
        ag.costas = para.y < de.y;
        ag.s.setFlipX(para.x < de.x).play(ag.spr + (ag.costas ? '_costas' : '_frente'), true);
        this.tweens.add({ targets: ag.s, x: para.x, y: para.y, duration: rapido ? 130 : 260, onUpdate: () => ag.s.setDepth(ag.s.y),
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
      const { x, y } = Iso.paraTela(16, 16);
      this.gato = { tile: [16, 16], t: 3, s: this.add.sprite(x, y, 'cenario', 'gato_pe').setOrigin(.5, 1).setDepth(y).setInteractive({ useHandCursor: true }) };
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
        const de = Iso.paraTela(...g.tile), para = Iso.paraTela(...p);
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
      if (p.alvo) { const t = Iso.paraTela(...p.alvo); x = t.x; y = t.y - p.dy; }
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
        const de = Iso.paraTela(...this.reiTile), para = Iso.paraTela(...alvo);
        const costas = para.y < de.y;
        this.rei.setFlipX(para.x < de.x).play(costas ? 'rei_costas' : 'rei_frente', true);
        this.tweens.add({ targets: this.rei, x: para.x, y: para.y, duration: 220, onUpdate: () => { this.rei.setDepth(this.rei.y); this.atualizarParedes(); },
          onComplete: () => { this.reiTile = alvo; proximo(); } });
      };
      proximo();
    }
    zoomPara(n) { this.cameras.main.setZoom(Math.max(1, Math.min(4, Math.round(n)))); }
    irPara(id) {
      const [c, r] = MapaMundo.centro(id), { x, y } = Iso.paraTela(c, r);
      this.cameras.main.pan(x, y, 600, 'Sine.easeInOut', true, (cam, prog) => { if (prog === 1) this.aoPararCamera(); });
    }
    aoPararCamera() {
      const m = this.cameras.main.midPoint, t = Iso.paraTile(m.x, m.y), s = MapaMundo.salaDe(t.c, t.r), id = s && s.id;
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
      this.moveis = MapaMundo.MOVEIS.flatMap(m => {
        const { x, y } = Iso.paraTela(m.c, m.r), base = y + Iso.TH / 2;
        const img = (item, prof) => { const fr = this.textures.getFrame('cenario', item), [ax, ay] = ANCORA[item] || [fr.width / 2, fr.height - 1];
          return this.add.image(x, base, 'cenario', item).setOrigin(ax / fr.width, ay / fr.height).setDepth(prof); };
        return m.item === 'jaula' ? [img('jaula_chao', base - 48), img('jaula_grades', base)] : [img(m.item, base)];   // Kobe fica entre o chão e as grades
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
      this.paredes = [];
      const ehPassagem = (c, r) => !!MapaMundo.passagemDe(c, r);
      for (const s of MapaMundo.SALAS.filter(s => s.parede)) {
        const esq = s.parede === 'pedra' ? 'parede_esq_pedra' : 'parede_esq', dir = s.parede === 'pedra' ? 'parede_dir_pedra' : 'parede_dir';
        for (let r = s.y; r < s.y + s.h; r++) {                       // parede do lado esquerdo (oeste)
          if (ehPassagem(s.x - 1, r)) continue;
          const { x, y } = Iso.paraTela(s.x, r);
          this.paredes.push(this.add.image(x - 32, y - 80, 'cenario', r % 4 === 2 && s.parede === 'madeira' ? 'parede_esq_janela' : esq).setOrigin(0, 0).setDepth(y - 16));
        }
        for (let c = s.x; c < s.x + s.w; c++) {                       // parede do fundo (norte)
          const { x, y } = Iso.paraTela(c, s.y);
          const porta = ehPassagem(c, s.y - 1);
          this.paredes.push(this.add.image(x, y - 80, 'cenario', porta ? 'parede_dir_porta' : dir).setOrigin(0, 0).setDepth(y - 16));
        }
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
      const c = this.cena(); if (c && c.vida) { c.lerVida(); c.reagir(); }   // voltou pro Mundo: reage ao que você fez nesse meio-tempo
    },
    cena() { return jogo && jogo.scene.getScene('mundo'); },
    irPara(id) { const c = this.cena(); if (c && c.irPara) c.irPara(id); },
    andarAte(col, lin) { const c = this.cena(); if (c && c.andarAte) c.andarAte(col, lin); },
  };
})();
