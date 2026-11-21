import { $, sleep } from '../core/02-util.js';
import { N, SQ } from '../rules/03-services.js';
import { S } from '../engine/07-state.js';
import { __set_MOVE_TO, callout } from '../ui/27a-board.js';
import { SQFX, fxChip, fxGain, rentFx } from '../ui/27b-arch-notes.js';
import { renderBoard } from '../ui/27c-center.js';
import { sfx } from '../ui/32-sfx.js';
import { FX } from '../ui/33-fx3d.js';
import { MP } from './40-host-sync.js';
// ---- 联机：远端照着房主重播动画 ----
// 走棋的 3D 棋子、飞行、User Group 活动、几个小特效（升级方块、免疫护盾、冲击波、DDoS 连线、奖池金币）、格子气泡和落点闪一下，原来只在房主那台播，
// 远端只看得到状态变了：棋子一格格瞬移、飞行直接换了格、UG 活动什么都没有。现在房主播的时候把事件发过来，只带座位号、格子号、毫秒数和字符串，
// 远端自己找格子和玩家卡来播，两边屏幕大小不一样也对得上。走棋、飞行、UG 活动只在房主真播了的时候发：房主那边没等动画，远端演了反而落后。
// 远端排成一队按先后播，收消息的地方只管排队、不等动画；状态照常收、照常重画，正在演的那颗棋子按 MOVE_TO 画（见 toksAt）。
// 本机播不了 3D 的（减少动态效果、WebGL 建不起来、页面在后台）不演，棋子照状态画；气泡和格子动画照旧
const okSq = i => Number.isInteger(i) && i >= 0 && i < SQ.length;
export const fxCast = (k, d) => {
  if (MP.role !== 'host') return;
  // 能力协商：旧客户端仍收逐格事件，新客户端只收分段路径；we 两边共用。
  [...Object.values(MP.seats), ...Object.values(MP.viewers || {})].forEach(x => {
    if (k === 'walk' ? !x.walk : (k === 'ws' || k === 'wh') && x.walk) return;
    MP.send(x.conn, { t: 'fx', k, ...d });
  });
};
// 房主：小特效、音效、格子气泡、格子动画本机照旧播，同一份发给远端
export function fxAll(m) { MPFX.small(m); fxCast('sm', m); }
// 游戏逻辑里的音效（买服务、收钱、抽奖、技能、盲盒、破产、重构）：本机照响，同一份发给远端
export function sfxAll(k) { sfx(k); fxCast('sm', { s: k }); }
// 金币从奖池飞到拿钱的人那里（UG 活动抽奖、拿走奖池）
export function fxPot(p, n) { MPFX.pot(p.id, n); fxCast('pot', { p: p.id, n }); }
export const MPFX = {
  q: [], busy: false, cur: null, wait: [], stateN: 0, tm: 0, epoch: 0, lastWalk: 0,
  // mv：正在演的那颗棋子 { id, ghost（DOM 上画成看不见的占位）, to（落点）, done（演完了，等房主收尾）, rx（收到收尾事件时已经收了几份状态）, t（最近一次动静） }
  // pawnOf：3D 棋子（FX.pawn）是谁的；F：座位 → 飞到一半的飞行（起飞到落地 fs、收起 fe 分两条来）
  mv: null, pawnOf: null, F: {},
  MOVES: ['walk', 'ws', 'wh', 'we', 'fs', 'fe'], SM: ['block', 'shield', 'shock', 'splash', 'arcs', 'rise'], SND: ['fail', 'magic', 'buy', 'coin', 'pay'],
  can() { return FX.ok() && !document.hidden; },
  // 播一份小特效（房主本机、远端重播共用）：3D 的 FX 自己看能不能播；音效、气泡、格子动画照旧
  small(m) {
    if (m.s) sfx(m.s);
    if (m.f) { const go = () => FX[m.f](...m.a); if (m.d) setTimeout(go, m.d); else go(); }
    if (m.co) callout(...m.co);
    if (m.sq) { const [i, c, ms] = m.sq, el = $('#sq' + i); SQFX[i] = [c, Date.now() + ms]; if (el) { el.classList.remove(c); void el.offsetWidth; el.classList.add(c); } }
  },
  pot(id, n) { const q = S.players[id]; if (q) FX.burst($('#center .potbox'), fxChip(q), n).then(() => fxGain(q)); },
  // 远端收到的小特效只认白名单：哪个特效、格子号、颜色、气泡的样式和时长、哪种音效
  clean(m) {
    const a = Array.isArray(m.a) ? m.a.slice(0, 2) : [], col = c => c == null || (typeof c === 'string' && /^#[0-9a-f]{3,8}$/i.test(c));
    const f = this.SM.includes(m.f) && (m.f === 'arcs' ? Array.isArray(a[0]) && a[0].length <= 16 && a[0].every(okSq) : okSq(a[0])) && col(a[1]) ? m.f : null;
    const co = Array.isArray(m.co) && okSq(m.co[0]) && typeof m.co[1] === 'string' ? [m.co[0], m.co[1].slice(0, 800), ['org', 'warn', 'ok'].includes(m.co[2]) ? m.co[2] : 'org', Math.max(800, Math.min(6000, +m.co[3] || 2200))] : null;
    const sq = Array.isArray(m.sq) && okSq(m.sq[0]) && ['fx-land', 'fx-combo'].includes(m.sq[1]) ? [m.sq[0], m.sq[1], Math.max(100, Math.min(3000, +m.sq[2] || 900))] : null;
    return { f, a, d: Math.max(0, Math.min(2000, +m.d || 0)), co, sq, s: this.SND.includes(m.s) ? m.s : null };
  },
  push(m) {
    if (!S || !S.players || $('#game').hidden || MP.gone || MP.kicked || MP.resync) return;
    if (m.k === 'walk') {
      if (!this.validWalk(m) || m.seq <= this.lastWalk) return;
      this.lastWalk = m.seq;
    }
    if (m.k === 'we' || m.k === 'fe') m.rx = this.stateN;
    if (this.q.length > 40) { this.cancel(); }   // 落后太多（页面卡过一阵）：不再一条条补播，收掉正在演的，棋子照状态画
    this.q.push({ ...m, epoch: this.epoch }); if (!this.busy) this.pump();
  },
  async pump() {
    this.busy = true;
    while (this.q.length) {
      const m = this.cur = this.q.shift();
      let timer;
      try { await Promise.race([this.play(m), new Promise(r => { timer = setTimeout(() => { this.cancel(); r(); }, 8000); })]); } catch (e) { this.cancel(); } finally { clearTimeout(timer); }   // 每段最多等 8 秒：哪里卡住了也不让后面的一直排着
      this.cur = null; this.settle();
    }
    this.busy = false;
    const w = this.wait; this.wait = []; w.forEach(f => f());
  },
  // 房主的弹窗是动画播完才弹的：这边还在演就等演完再开，最多等 2.5 秒
  after(fn) {
    const epoch = this.epoch;
    let done = false; const go = () => { if (!done) { done = true; if (epoch === this.epoch) fn(); } };
    if (!this.busy) return void Promise.resolve().then(go);
    this.wait.push(go); setTimeout(go, 2500);
  },
  // 这颗棋子交给动画：DOM 上只画在 at 格（null 哪格都不画），ghost 画成看不见的占位。每半秒看一次能不能交回给状态（settle）
  hold(id, at, ghost) {
    if (this.mv && this.mv.id !== id) this.release(true);
    this.mv = { id, ghost, to: this.mv ? this.mv.to : null, done: false, t: Date.now() }; __set_MOVE_TO(at); renderBoard();
    if (!this.tm) this.tm = setInterval(() => { this.settle(); if (!this.mv) { clearInterval(this.tm); this.tm = 0; } }, 500);
  },
  // 演完：落点上画回真的棋子，等房主收尾的那份状态
  landed(id, rx) {
    const v = this.mv; if (!v || v.id !== id) return;
    Object.assign(v, { ghost: false, done: true, rx, t: Date.now() }); __set_MOVE_TO(v.to != null ? v.to : S.players[id].pos); renderBoard();
  },
  drop(id) { if (this.mv && this.mv.id === id) this.release(); },
  // 收掉动画（3D 棋子、飞到一半的人物），棋子交回给状态
  release(noRender) {
    const v = this.mv; this.mv = null; __set_MOVE_TO(null);
    if (this.pawnOf != null) { this.pawnOf = null; FX.pawnEnd(); }
    Object.keys(this.F).forEach(k => { const F = this.F[k]; delete this.F[k]; if (!F.going) FX.flyEnd(F); });   // 正在飞的那段由 fs 自己播完再收
    if (v && !noRender && S && S.players && !$('#game').hidden) renderBoard();
  },
  // 什么时候交回给状态：演完了、房主收尾的那份状态也到了（收尾事件之后来的状态里 S.moving 不再是他）。
  // 兜底，免得棋子一直藏着：房主那边已经不在动他、却等了 3 秒没等来收尾（中途加入、房主刷新过）；半分钟没动静、也没有弹窗在等人选（房主卡住了）；和房主断开了
  settle(fromState) {
    const v = this.mv; if (!v) return;
    if ((this.cur && this.cur.p === v.id) || this.q.some(m => m.p === v.id && this.MOVES.includes(m.k))) return;
    const idle = Date.now() - v.t, hostMv = !!S && S.moving === v.id;
    if ((v.done && !hostMv && this.stateN > v.rx) || (!hostMv && idle > 3000) || (idle > 30000 && $('#modal').hidden) || MP.gone) this.release(fromState);
  },
  // 取消只清展示层；S 始终只由房主 state 消息替换。
  cancel() { this.epoch++; this.q = []; this.wait = []; this.release(); },
  validWalk(m) {
    if (!Number.isSafeInteger(m.seq) || m.seq < 1 || !okSq(m.from) || !Array.isArray(m.path) || !m.path.length || m.path.length > N || !Number.isFinite(m.ms) || m.ms < 1 || m.ms > 600 || typeof m.last !== 'boolean') return false;
    if (!Number.isInteger(m.p) || !S.players[m.p]) return false;
    let from = m.from, dir = 0;
    return m.path.every(to => {
      if (!okSq(to)) return false;
      const d = (to - from + N) % N, step = d === 1 ? 1 : d === N - 1 ? -1 : 0;
      if (!step || (dir && step !== dir)) return false;
      dir = step; from = to; return true;
    });
  },
  async walk(m) {
    const live = () => m.epoch === this.epoch && this.can() && !MP.gone && !MP.kicked && !MP.resync && !!S && !!S.players[m.p];
    if (!live()) return;
    // 整段本地连续播放，不再等待下一格网络消息，也不修改权威玩家位置。
    if (this.pawnOf !== m.p || !this.mv || this.mv.to !== m.from) await this.play({ k: 'ws', p: m.p, from: m.from });
    if (!live() || this.pawnOf !== m.p) return;
    for (let j = 0; j < m.path.length; j++) {
      if (m.epoch !== this.epoch) return;
      if (!live() || !this.mv || this.mv.id !== m.p) { this.drop(m.p); return; }
      await this.play({ k: 'wh', p: m.p, to: m.path[j], ms: m.ms, last: m.last && j === m.path.length - 1 });
    }
  },
  async play(m) {
    if (m.epoch != null && m.epoch !== this.epoch) return;
    if (m.k === 'walk') return this.walk(m);
    const id = m.p, q = Number.isInteger(id) ? S.players[id] : null;
    if (this.mv && this.mv.id === id) this.mv.t = Date.now();
    if (m.k === 'rent') { if (S.players[m.to] && Array.isArray(m.arcs)) rentFx(m); return; }
    if (m.k === 'sm') return this.small(this.clean(m));
    if (!q) return;
    if (m.k === 'pot') return this.pot(id, Math.max(1, Math.min(30, m.n | 0)));
    if (m.k === 'ug') { if (okSq(m.i) && this.can()) await FX.ug(q, m.i); return; }
    // 走棋：ws 起步，wh 每一跳（最后一跳带 last），we 落地。没赶上起步（中途加入）就从这一跳的起点接着演
    if (m.k === 'ws' || (m.k === 'wh' && this.pawnOf !== id)) {
      if (!okSq(m.from) || !this.can()) return this.drop(id);
      const epoch = this.epoch;
      this.hold(id, m.from, false);   // 先把 DOM 棋子画在起点（状态里他可能已经往前走了）：3D 棋子照它的位置和大小长出来
      // 房主是骰子落定才起步的；这边的骰子是收到状态才开始转，晚一点停，等它停了再走（最多等 2 秒），后面排着的几跳会跳快一点追上
      for (let t0 = Date.now(); FX.diceSpin && Date.now() - t0 < 2000;) await sleep(30);
      if (epoch !== this.epoch) return;
      if (!this.can() || !this.mv || this.mv.id !== id) return this.drop(id);
      if (!FX.pawnStart({ ...q, pos: m.from })) return this.drop(id);
      this.pawnOf = id; this.hold(id, null, true);
      if (m.k === 'ws') return;
    }
    if (m.k === 'wh') {
      if (!okSq(m.to) || !FX.pawn || document.hidden) return this.drop(id);   // 走到一半切到后台：不再补播，棋子照状态画
      this.mv.to = m.to; if (m.last) this.hold(id, m.to, true);   // 最后一跳前在终点格放占位，3D 棋子落在占位上
      const more = this.q.filter(x => x.k === 'wh' && x.p === id).length;   // 落后了（后面还排着两跳以上）就跳快一点追上
      await FX.pawnHop(m.to, Math.max(30, Math.min(600, +m.ms || 150)) * (more > 1 ? 0.5 : 1)); sfx('step');
      return;
    }
    if (m.k === 'we') { const epoch = this.epoch; if (this.pawnOf === id) { this.pawnOf = null; await FX.pawnEnd(); } if (epoch === this.epoch) this.landed(id, m.rx); return; }
    // 飞行：fs 起飞到落地，fe 收起。两条之间房主可能还在结算路过的起点、UG 活动（可能有弹窗），人物停在落点上
    if (m.k === 'fs') {
      if (!okSq(m.from) || !okSq(m.to) || !this.can()) return this.drop(id);
      const epoch = this.epoch;
      this.hold(id, m.from, false);
      const F = FX.flyStart({ ...q, pos: m.from }); if (!F) return this.drop(id);
      this.F[id] = F; this.mv.to = m.to; this.hold(id, m.to, true); sfx('fly');
      F.going = 1; try { await FX.flyGo(F, m.to, String(m.why || '').slice(0, 40), !!m.back); } finally { F.going = 0; }
      if (this.F[id] !== F) await FX.flyEnd(F);   // 飞的时候被收掉了（release）：落地后在这里收起
      return;
    }
    if (m.k === 'fe') { const F = this.F[id]; delete this.F[id]; if (F) await FX.flyEnd(F); return this.landed(id, m.rx); }
  },
};
document.addEventListener('visibilitychange', () => { if (document.hidden && MP.role === 'client') MPFX.cancel(); });
