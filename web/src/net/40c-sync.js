import { _tf } from '../core/01-i18n-runtime.js';
import { $, CLK, actKey, esc, unesc } from '../core/02-util.js';
import { S, cur } from '../engine/07-state.js';
import { doRoll, endTurn, jailAct, uiAction } from '../engine/14-turn.js';
import { capHere, upHere } from '../engine/15-land.js';
import { refactorDebt } from '../engine/17-health.js';
import { buyReinvent, incAll, incOne, incRand } from '../engine/18-reinvent.js';
import { declareBankrupt } from '../engine/20-bankrupt.js';
import { setRsRate, useRoleSkill, wildDialog } from '../engine/21-skills.js';
import { speedMenu } from '../engine/22-speed.js';
import { manage } from '../engine/23-manage.js';
import { activeAction } from '../engine/24-actions.js';
import { edpDialog, quizAll, quizChallenge, trade } from '../engine/25-trade.js';
import { render } from '../ui/27d-side.js';
import { AI_PAUSE } from '../engine/36-ai.js';
import { MP } from './40-host-sync.js';
Object.assign(MP, {
  // 房主：每次渲染后把状态推给大家（合并 60ms 内的多次渲染）。lite：走棋时只重画了棋盘，60ms 里全是 lite 的话远端也只重画棋盘
  afterRender(lite) {
    if (this.role === 'host' && S && S.players && this.isRemote(S.cur) && this.seats[S.cur].online && this.seats[S.cur].idleTake !== S.turnStartAt) {
      document.querySelectorAll('#center button:is([onclick], [data-act]), #mbar button:is([onclick], [data-act])').forEach(b => { if (this.ONCLICK[actKey(b)]) b.disabled = true; });
      const st = $('#center .stage .st'), x = this.seats[S.cur], idle = Date.now() - (S.turnStartAt || Date.now());
      if (st) st.textContent = _tf(4080, "等 {$0} 在自己的设备上操作…", unesc(S.players[S.cur].name));
      if ((S.phase === 'roll' || S.phase === 'post') && !S.over) {
        if (idle >= 30000 && st && !st.parentNode.querySelector('.idletk')) st.insertAdjacentHTML('afterend', _tf(4973, "<button type=\"button\" class=\"sm idletk\" data-act=\"MP.idleTake\">{$0} 半天没动，我来替他操作</button>", esc(unesc(S.players[S.cur].name))));
        else if (idle < 30000 && this.idleArm !== S.turnStartAt) { this.idleArm = S.turnStartAt; setTimeout(() => render(), 30000 - idle + 50); }
      }
    }
    if (this.role === 'host') {
      if (!lite) this.full = true;
      // 推送节奏和渲染解耦：以前是「渲染完才起一个 60ms 定时器」，房主渲染慢（弱机、动画卡）
      // 推送机会就少，全桌延迟。现在主机挂一个 60ms 心跳，状态脏了就推，和渲染频率无关。
      this.dirty = true;
      if (!this.pushIv) { this.pushIv = 1; this.pumpPush(++this.pushGen); }
    } else if (this.role === 'client') this.lockUI();
  },
  // 主机推送心跳：只有状态变了才推；pushState 自己还会按座位去重（内容没变不发）。
  // 心跳在渲染之外跑，房主渲染慢、动画卡的时候也不会少推；页面隐藏时浏览器会节流定时器，属于浏览器限制。
  flushPush() {
    if (this.role !== 'host') { this.pushIv = 0; this.dirty = false; return; }
    if (!this.dirty) return;
    this.dirty = false;
    this.pushState();
  },
  // 推送心跳：60ms 一拍，用 Worker 时钟自循环（隐藏标签页里 setInterval 会被压到 1s）
  pumpPush(gen) {
    if (gen !== this.pushGen || this.role !== 'host' || !this.pushIv) return;   // 过期的那一拍（期间回过开局页、又开了新的一局）就地停掉，不然心跳越开越多
    this.flushPush();
    CLK.set(60).then(() => this.pumpPush(gen));
  },
  // 把状态推给每个远端。日志和格子历史占整份状态的九成，认得增量的远端只发它上次收到之后新增的那些；
  // 同样的内容只序列化一次，大家共用一个字符串；跟上次发给这个人的一样就不发（本机只是重画了一下）。full：远端要整页重画（弹窗前、重连）
  pushState(full, only) {
    const lite = !full && !this.full; if (!only) this.full = false;
    if (!S || !S.players) return;
    // 只有房主这台知道的也带给远端：电脑暂停了没有、哪些联机座位掉线了（远端据此写「已暂停」「掉线了」）。每次推都按此刻重算，进了 core，只按了暂停也会推过去。
    // now：房主此刻的时间，远端拿来对齐限时倒计时；不放进 core，不影响「内容没变就不发」
    S.aiPause = AI_PAUSE || undefined; { const off = Object.keys(this.seats).map(Number).filter(k => !this.seats[k].online && S.players[k]); S.mpOff = off.length ? off : undefined; }
    const seq = S.logSeq || 0, core = JSON.stringify({ ...S, log: undefined, hist: undefined, diceQ: undefined }), out = {};   // 掷骰前定好的点数（diceQ）不发给远端
    (only ? [only] : this.recipients()).forEach(x => {
      if (!x.conn || !x.conn.open) return;
      const b = x.base && x.base.S === S ? x.base : null;   // 没发过、换了一局（新开、读档）、远端要求补发：发整份
      if (b && b.seq === seq && b.core === core && (lite || !b.lite)) return;
      const k = !x.delta ? 'old' : b ? 'd' + b.seq : 'all';
      if (!out[k]) out[k] = k === 'old' ? { t: 'state', S: { ...S, diceQ: undefined }, now: Date.now() } : k === 'all' ? JSON.stringify({ t: 'state', S: { ...S, diceQ: undefined }, now: Date.now() }) : `{"t":"state","now":${Date.now()},"S":${core},"lite":${lite ? 1 : 0},"delta":${JSON.stringify(this.deltaSince(b.seq, seq))}}`;   // old：老版本页面照旧收整份对象
      this.send(x.conn, out[k]); x.base = { S, seq, core, lite: k !== 'old' && k !== 'all' && lite };   // 整份的远端总是整页重画
    });
  },
  // 第 from 条之后新增的日志（新的在前，跟 S.log 一样）和这期间改过的格子历史（整格发）
  deltaSince(from, seq) {
    const hist = {}; Object.entries(S.histAt || {}).forEach(([i, s]) => { if (s > from && S.hist && S.hist[i]) hist[i] = S.hist[i]; });
    return { from, log: S.log.slice(0, seq - from), hist };
  },
  openModal(spec, who, box, onAnswer) {
    // 先把最新状态推过去，远端才有棋盘可以垫在弹窗下面
    this.pushState(true);
    const id = ++this.mid;
    this.cur = { id, who, box, onAnswer };
    const clean = { title: spec.title, html: spec.html, cls: spec.cls, aiMin: !!spec.aiMin, hold: spec.hold || 0, inputs: spec.inputs, noAI: !!spec.noAI, hp: this.hostPlays(who), buttons: spec.buttons.map(b => ({ label: b.label, desc: b.desc, cls: b.cls || '', disabled: !!b.disabled })) };
    this.cur.msg = { t: 'modal', id, who, spec: clean };
    this.broadcast(this.cur.msg);
  },
  closeModal() { if (this.cur) { this.broadcast({ t: 'modalClose', id: this.cur.id }); this.cur = null; } },
  answer(id, ans, inp) { this.send(this.hostConn, { t: 'ans', id, ...('k' in ans ? { k: ans.k } : { v: String(ans.v) }), inp }); },
  // 远端玩家点的按钮 → 房主这边执行（只认白名单里的操作，而且必须轮到他）
  ACTS: {
    roll: () => doRoll(), end: () => endTurn(), 'jail:roll': () => jailAct('stay'), 'jail:stay': () => jailAct('stay'), 'jail:pay': () => jailAct('pay'), 'jail:es': () => jailAct('es'),
    manage: () => uiAction(() => manage(cur())), trade: () => uiAction(trade), sp: () => uiAction(edpDialog), action: () => uiAction(activeAction), bankrupt: () => uiAction(declareBankrupt), buyrei: () => uiAction(buyReinvent), refactor: () => uiAction(refactorDebt),
    skill: () => uiAction(useRoleSkill), wild: () => uiAction(wildDialog), challenge: () => uiAction(quizChallenge), challengeall: () => uiAction(quizAll), incone: () => uiAction(incOne), incrand: () => uiAction(incRand), incall: () => uiAction(incAll), uphere: () => uiAction(upHere), caphere: () => uiAction(capHere), tradefor: m => { const to = m && m.to, w = m && m.want; if (Number.isInteger(to) && S.players[to] && S.players[to].alive && to !== S.cur && Number.isInteger(w) && S.props[w] && S.props[w].owner === to) uiAction(() => trade({ to, want: w })); }, speed: () => uiAction(speedMenu), rsrate: () => uiAction(setRsRate),
  },
  ONCLICK: { 'doRoll()': 'roll', 'endTurn()': 'end', "jailAct('stay')": 'jail:stay', "jailAct('pay')": 'jail:pay', "jailAct('es')": 'jail:es',
    'uiAction(manage)': 'manage', 'uiAction(trade)': 'trade', 'uiAction(edpDialog)': 'sp', 'uiAction(activeAction)': 'action', 'uiAction(declareBankrupt)': 'bankrupt', 'uiAction(buyReinvent)': 'buyrei', 'uiAction(refactorDebt)': 'refactor', 'uiAction(useRoleSkill)': 'skill', 'uiAction(wildDialog)': 'wild', 'uiAction(quizChallenge)': 'challenge', 'uiAction(quizAll)': 'challengeall', 'uiAction(incOne)': 'incone', 'uiAction(incRand)': 'incrand', 'uiAction(incAll)': 'incall', 'uiAction(upHere)': 'uphere', 'uiAction(capHere)': 'caphere', 'uiAction(speedMenu)': 'speed', 'uiAction(setRsRate)': 'rsrate' },
  scalar(value) { return value == null || ['string', 'number', 'boolean'].includes(typeof value); },
});
