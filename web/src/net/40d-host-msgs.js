import { _t, _tf } from '../core/01-i18n-runtime.js';
import { $, KEY, esc, unesc } from '../core/02-util.js';
import { wbApply, wbValid } from '../rules/06-qbank.js';
import { MAX_PLAYERS, S, cur, log, nm } from '../engine/07-state.js';
import { MODAL_CUR, ask, info } from '../ui/10-modal.js';
import { joinPlayer } from '../engine/14-turn.js';
import { rfJailTxt, rfJailed } from '../engine/17-health.js';
import { timedOver } from '../ui/26e-manual.js';
import { render } from '../ui/27d-side.js';
import { applyRename, npVal, renderNames, toast } from '../ui/28-setup-save.js';
import { AI_PAUSE, isAI, toggleAiPause } from '../engine/36-ai.js';
import { applyCheat, reportCheat } from '../engine/38-cheats.js';
import { sigLabel } from './40a-signal.js';
import { MP } from './40-host-sync.js';
Object.assign(MP, {
  onHostMsg(conn, m) {
    if (this.role !== 'host' || !conn.open || conn._closed || !m || typeof m !== 'object') return;
    const seat = conn._seat;
    // 观众只允许补发状态；伪造 seat、who、角色或游戏消息都不进入玩家处理器。
    const viewer = this.viewers[conn._viewer];
    if (viewer && viewer.conn === conn) {
      if (m.t === 'resync') { viewer.base = null; this.pushState(true, viewer); if (this.cur) this.send(conn, this.modalFor(viewer)); }
      return;
    }
    if (m.t === 'hello') return this.admit(conn, m);
    if (seat == null || !this.seats[seat] || this.seats[seat].conn !== conn || !this.seats[seat].online) return;
    if (m.t === 'resync') { this.seats[seat].base = null; this.pushState(true, this.seats[seat]); if (this.cur) this.send(conn, this.modalFor(this.seats[seat])); return; }   // 远端的增量接不上了（或刚切回前台）：补一份整的，连同当前的弹窗（切后台、重同步时排着的弹窗会被 cancel 丢掉）
    if (m.t === 'act' && typeof m.a === 'string' && S && S.cur === seat && Object.prototype.hasOwnProperty.call(this.ACTS, m.a)) {
      // 这一下能不能执行：和 doRoll / jailAct / uiAction / endTurn 开头查的阶段一样
      const a = m.a, p = cur();
      // 清技术债进的维护窗口只能停这一轮：远端（老页面、改过的页面）发来付钱、用卡出来的，直接告诉他，不悄悄改成「停一轮」替他执行
      if ((a === 'jail:pay' || a === 'jail:es') && rfJailed(p)) return void this.send(conn, { t: 'toast', msg: rfJailTxt() });
      const ok = a === 'end' ? S.phase === 'post' : a === 'roll' ? S.phase === 'roll' && p.jail === null : /^jail:/.test(a) ? S.phase === 'roll' && p.jail !== null : S.phase === 'roll' || S.phase === 'post';
      // 房主自己开着看的窗口（玩法、图鉴、明细、大图、改名字……）会挡住这些操作，远端点了却毫无反应：真能执行时先替房主关掉。「轮到下一位」不看弹窗，不用关；
      // 只认打了 cancelable 的窗口，「这局在别处接着打了」、开局页那几个问话的最后一个按钮不是取消，不能替房主点
      if (ok && a !== 'end' && MODAL_CUR && MODAL_CUR.cancelable && !$('#modal').hidden) { MODAL_CUR.cancel(); toast(_tf(4974, "{$0} 那边点了操作，先把你开着的窗口关了", unesc(S.players[seat].name))); }
      // 还是执行不了的告诉他一声，不然以为点了没反应（老版本远端不认 toast，直接忽略）
      const why = !ok ? (S.phase === 'busy' ? _t(4975, "房主那边还在结算，等这一步做完再点") : '') : a !== 'end' && !$('#modal').hidden ? _t(4976, "房主那边开着窗口，等他关掉再点") : (a === 'roll' || /^jail:/.test(a)) && Date.now() - (S.turnStartAt || 0) < 300 ? _t(4977, "刚轮到你，再点一下") : '';
      if (why) this.send(conn, { t: 'toast', msg: why });
      this.ACTS[a](m);
    }
    else if (m.t === 'aipause' && S && !S.over) { toggleAiPause(); toast(`${unesc(S.players[seat].name)} ${AI_PAUSE ? _t(4978, "暂停了电脑") : _t(4979, "让电脑接着跑")}`); }
    else if (m.t === 'endask' && S && !S.over) { const n = unesc(S.players[seat].name); if (S.phase === 'roll' || S.phase === 'post') ask({ local: true, cancelable: true, title: _tf(4980, "{$0} 提议现在结算", n), html: _t(4981, "<p>按每家的估值排名，估值最高的赢。结算后这一局就结束了，不能接着打。</p>"), buttons: [{ label: _t(4719, "现在结算"), value: true, cls: 'pri' }, { label: _t(4982, "接着打"), value: false }] }).then(v => { if (v && S && !S.over) { log(_tf(4983, "🏁 {$0} 提议、房主同意现在结算", n)); timedOver(_t(4722, "大家决定现在结算")); } else this.send(conn, { t: 'toast', msg: _t(4984, "房主选了接着打") }); }); else this.send(conn, { t: 'toast', msg: _t(4985, "房主那边还在结算，等一下再提") }); }
    else if (m.t === 'rename' && !(S && S.players) && typeof m.name === 'string') { const why = this.lobbyRename(seat, m.name); this.send(conn, why ? { t: 'renameFail', why } : { t: 'renamed', name: this.seats[seat].name }); }
    else if (m.t === 'rename' && S && !S.over && typeof m.name === 'string') { const why = applyRename(seat, m.name); if (why) this.send(conn, { t: 'renameFail', why }); }
    else if (m.t === 'cheat' && S && !S.over && typeof m.c === 'string' && Array.isArray(m.a) && m.a.slice(0, 3).every(x => this.scalar(x))) { const why = applyCheat(seat, m.c, m.a.slice(0, 3).map(x => String(x).slice(0, 20))); if (why) this.send(conn, { t: 'toast', msg: why }); }
    else if (m.t === 'report' && S && !S.over && Number.isInteger(m.id)) { const why = reportCheat(m.id, seat); if (why) this.send(conn, { t: 'toast', msg: why }); }
    else if (m.t === 'ans' && this.cur && m.id === this.cur.id && this.cur.who === seat) {
      if (m.inp != null && (typeof m.inp !== 'object' || Array.isArray(m.inp) || !Object.values(m.inp).every(x => this.scalar(x)))) return;
      const ans = Number.isInteger(m.k) ? { k: m.k } : typeof m.v === 'string' ? { v: m.v.slice(0, 80) } : null;
      if (ans) this.cur.onAnswer(ans, m.inp && typeof m.inp === 'object' ? m.inp : {});
    }
  },
  async admit(conn, m, approval) {
    if (this.role !== 'host' || !conn.open || conn._closed || conn._admitted || conn._pending) return;
    if (m.name != null && typeof m.name !== 'string') return this.reject(conn, _t(5253, "名字必须是文字"));
    const name = (m.name || '').replace(/\s+/g, ' ').trim().slice(0, 12) || _t(3861, "玩家");
    if (m.mode === 'spectator') {
      if (!this.watchToken || m.invite !== this.watchToken) return this.reject(conn, _t(5254, "观战邀请无效或已关闭"));
      if (Object.keys(this.viewers).length >= this.watchLimit) return this.reject(conn, _t(5255, "观战人数已满"));
      const id = this.newKey(); conn._viewer = id; conn._admitted = true;
      this.viewers[id] = { name, conn, online: true, delta: m.delta === 1, walk: m.walk === 1 };
      this.send(conn, { t: 'welcome', mode: 'spectator', seat: null, room: this.room });
      this.pushState(true, this.viewers[id]); if (this.cur) this.send(conn, this.modalFor(this.viewers[id]));
      this.refreshMembers(); return;
    }
    if (m.mode != null && m.mode !== 'player') return this.reject(conn, _t(5256, "不支持的入房身份"));
    if (m.auth !== this.auth) { this.reject(conn, _t(4986, "密码不对")); return; }
    if (this.banned && this.banned.has(name.replace(/\s+/g, ' ').trim())) { this.reject(conn, _t(4987, "房主把你移出了这个房间")); return; }
    // 名字定位座位，钥匙或房主确认鉴权后再认回。
    let seat = this.seatFor(name), joined = false;
    // 身份由座位钥匙证明，名字只用于定位。离线座位也不能仅凭同名接管。
    if (seat == null && S && S.players) seat = this.seatFor(name, true);
    if (seat != null) {
      const x = this.seats[seat], proven = x.key && Array.isArray(m.keys) && m.keys.slice(0, 8).includes(x.key);
      if (!proven && !(approval && approval.seat === seat && approval.previous === x)) {
        if (x.online) return this.reject(conn, _t(5257, "该玩家仍在线；请使用原浏览器，或等其离线后由房主确认身份"));
        return this.requestSeat(conn, { ...m, name }, seat, x);
      }
      const old = x.conn; if (old) { old._seat = null; old._closed = true; this.send(old, { t: 'kicked' }); try { old.close({ flush: true }); } catch (e) { } setTimeout(() => { try { old.close(); } catch (e) { } }, 5000); }
    }
    if (seat == null) {
      if (S && S.players) {
        // 开局后来的新名字：中途加入，房主同意了才排到座位最后（engine/14-turn.js 的 joinPlayer）。座位满了照旧拒绝，提示掉线的人用局里的名字回来
        const left = this.waiting(), mx = Math.min(this.seatMax || 4, MAX_PLAYERS);
        if (S.over) return this.reject(conn, _t(5578, "这局已经结束了，等房主开下一局再加入"));
        if (S.drafting) return this.reject(conn, _t(5579, "大家正在挑角色，挑完再加入"));
        if (S.players.length >= mx) return this.reject(conn, left.length ? _tf(4989, "游戏已经开始。原来的玩家用局里的名字重新加入：{$0}", left.join(_t(349, "、"))) : mx > 4 ? _tf(5303, "房间满了（最多 {$0} 人）", mx) : _t(4992, "房间满了（最多 4 人）"));
        if (S.cfg.roundLimit && S.round >= S.cfg.roundLimit) return this.reject(conn, _t(5580, "已经是最后一轮了，不能中途加入"));
        if (S.players.some(q => q.name === esc(name))) return this.reject(conn, _tf(5581, "局里已经有人叫 {$0} 了，换个名字再加入", name));
        if (!(approval && approval.join && approval.game === S)) return this.requestSeat(conn, { ...m, name }, S.players.length, null, true);
        seat = joinPlayer(name).id; joined = true;
        (S.mpSeats = S.mpSeats || []).push(seat);   // 记成联机座位：房主刷新后读档，他照样能按名字坐回来
      } else {
        // 大厅里不收重名：开局会把后来的改成「小李 2」，两人都掉线时按名字就分不清谁是谁，重连会坐到对方的座位上。
        // 不像开局后那样同名顶替：大厅里分不清是本人掉线重进还是另一个人重名，顶替会把先来的踢掉。本人没正常关页面就重进的，等 watch 发现旧连接断了、座位删掉再进
        const key = name.replace(/\s+/g, ' ');
        if (Object.values(this.seats).some(x => x.name.replace(/\s+/g, ' ') === key)) { this.reject(conn, _tf(4991, "已经有人叫 {$0} 了，换个名字再加入（刚才是你自己掉线的话，等十几秒再用这个名字进）", name)); return; }
        const used = new Set(Object.keys(this.seats).map(Number));
        // 房主刷新后还没点「继续上一局」：存档里的联机玩家按名字先坐回原座位，大厅和 welcome 里的座位号就和局里一致；对不上的照旧按先后排
        const saved = this.savedSeat(name, used);
        if (saved != null && !(approval && approval.seat === saved && approval.previous === null)) return this.requestSeat(conn, { ...m, name }, saved, null);
        // 远端座位 1…(上限 - 1)：开局页没开「多人（超过 4 人）」时最多 4 人（3 位远端），开了到 MAX_PLAYERS；观众另算，不占座位
        const mx = this.seatMax || 4;
        seat = saved ?? Array.from({ length: mx - 1 }, (_, k) => k + 1).find(k => !used.has(k));
        if (seat == null) { this.reject(conn, mx > 4 ? _tf(5303, "房间满了（最多 {$0} 人）", mx) : _t(4992, "房间满了（最多 4 人）")); return; }
      }
    }
    // key：座位钥匙，每次 welcome 换一把新的（换了设备进来以后旧设备那把就作废）。只放在房主的 MP.seats 和他本人的浏览器里，不能写进 S：S 会推给所有人
    const skey = this.newKey(); conn._admitted = true; conn._seat = seat; this.seats[seat] = { name, conn, online: true, wb: this.wbIn(m.wb), delta: m.delta === 1, walk: m.walk === 1, key: skey };   // delta：新版页面，收得了增量状态
    this.send(conn, { t: 'welcome', seat, room: this.room, key: skey });
    if (S && S.players) { if (!joined) log(_tf(4993, "🔌 {$0} 重新连上了", nm(S.players[seat]))); render(); this.pushState(true); if (this.cur) { this.send(conn, this.modalFor(this.seats[seat])); const tk = this.cur.who === seat && this.cur.box.querySelector('[data-mptake]'); if (tk) { tk.hidden = true; if (tk._arm) tk._arm(); const ta = this.cur.box.querySelector('[data-mpall]'); if (ta) ta.hidden = true; } } }
    else this.renderLobby();
  },
  // 在掉线的座位里找这个名字：开局后先按局里现在的名字（改过名就是新名字），再按当初加入时用的名字。any：在线的座位也找（顶替还没发现掉线的旧连接）
  seatFor(name, any) {
    const off = Object.keys(this.seats).map(Number).filter(k => any || !this.seats[k].online), key = esc(name.replace(/\s+/g, ' ').trim());
    return off.find(k => S && S.players && S.players[k] && S.players[k].name === key) ?? off.find(k => this.seats[k].name === name);
  },
  // 大厅阶段（S 还是空的）：存档里 k 号位的联机玩家叫这个名字、k 又空着，就给他 k
  savedSeat(name, used) {
    let sv = null; try { sv = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
    if (!sv || sv.over || !Array.isArray(sv.mpSeats) || !Array.isArray(sv.players)) return;
    const key = esc(name.replace(/\s+/g, ' ').trim());
    return sv.mpSeats.find(k => k > 0 && k < MAX_PLAYERS && !used.has(k) && sv.players[k] && sv.players[k].name === key);
  },
  // 还在等人回来的座位（局里的名字），拒绝时告诉对方该用哪个名字
  waiting() { return Object.keys(this.seats).filter(k => !this.seats[k].online && S.players[k]).map(k => unesc(S.players[k].name)); },
  // 房主刷新后点「继续上一局」：大厅里的人按名字对回存档里的座位，不按加入先后；对不上的请他换名字再进。
  // 存档里是联机玩家、这次还没回来的座位先按掉线处理，之后用局里的名字加入就能回去
  reseat() {
    const lobby = Object.values(this.seats).filter(x => x.online), saved = S.mpSeats && S.mpSeats.length ? S.mpSeats : null;
    this.seats = {};
    // 老存档、本机局没记联机座位：房主和电脑以外的座位都能按名字认领，没人认的照旧在房主这台玩
    (saved || S.players.map(q => q.id).filter(k => k > 0 && !isAI(k))).forEach(k => { if (S.players[k]) this.seats[k] = { name: unesc(S.players[k].name), conn: null, online: false }; });
    const miss = lobby.filter(x => { const k = this.seatFor(x.name); if (k == null) { x.conn._seat = null; return true; } x.conn._seat = k; this.seats[k] = { ...x, online: true }; this.send(x.conn, { t: 'welcome', seat: k, room: this.room, key: x.key }); return false; });   // x.key：大厅里 admit 给过的座位钥匙
    if (!saved) Object.keys(this.seats).forEach(k => { if (!this.seats[k].online) delete this.seats[k]; });
    const left = this.waiting();
    miss.forEach(x => { this.send(x.conn, { t: 'reject', why: _tf(4995, "存档里没有叫 {$0} 的玩家{$1}", x.name, left.length ? _tf(4994, "，请用你在上一局里的名字重新加入：{$0}", left.join(_t(349, "、"))) : '') }); setTimeout(() => x.conn.close(), 300); });
    S.mpSeats = Object.keys(this.seats).map(Number);
  },
  // 远端玩家加入时带来的错题本：只收题库里真有的题
  wbIn(w) { const o = {}; if (w && typeof w === 'object') Object.keys(w).slice(0, 2000).forEach(id => { if (wbValid(id)) o[id] = { n: w[id] && w[id].n === 1 ? 1 : 0, t: 0 }; }); return o; },
  // 远端玩家答了一道题：发给他记进自己的错题本，房主这边的副本也跟着改
  wbMark(seat, id, ok) { const x = this.seats[seat]; this.send(x.conn, { t: 'wb', id, ok: !!ok }); return wbApply(x.wb || (x.wb = {}), id, ok); },
  // 大厅里（还没开局）远端玩家改自己的名字：和入房时一样整理、查重（大厅不收重名，见 admit），被移出过的名字不能用；房主这边的座位表跟着刷新
  lobbyRename(seat, raw) {
    const x = this.seats[seat]; if (!x) return _t(5582, "你不在这个房间的座位上");
    const name = raw.replace(/\s+/g, ' ').trim().slice(0, 12); if (!name) return _t(4628, "名字不能是空的");
    if (this.banned && this.banned.has(name)) return _t(4987, "房主把你移出了这个房间");
    const host = (($('#nm0') || {}).value || '').replace(/\s+/g, ' ').trim();
    if (name === host || Object.entries(this.seats).some(([k, y]) => +k !== seat && y.name.replace(/\s+/g, ' ') === name)) return _tf(5583, "已经有人叫 {$0} 了，换一个", name);
    x.name = name; this.renderLobby(); return '';
  },
  renderLobby() {
    const watch = $('#mpallowwatch'); if (watch) { watch.checked = !!this.watchToken; watch.disabled = true; }
    const n = 1 + Math.max(0, ...Object.keys(this.seats).map(Number));   // 按最大的座位号算：按存档排座时可能只有 3 号位有人，按人数算会把玩家 4 截掉
    // 4 号以后的座位有人（开了「多人」，或者按存档排座）：renderNames 会把「多人」打开、补上 5 人以上的格子，再选人数
    if (npVal() < n) { const q = () => document.querySelector(`input[name=np][value="${Math.min(MAX_PLAYERS, n)}"]`); let r = q(); if (!r) { renderNames(); r = q(); } if (r && !r.checked) { r.checked = true; renderNames(); } }
    Object.entries(this.seats).forEach(([k, x]) => { const el = $('#nm' + k), ai = $('#ai' + k); if (el) { el.value = x.name; el.readOnly = true; el.title = x.online ? _t(4996, "联机玩家") : _t(4997, "联机玩家（已断开）"); } if (ai) { ai.checked = false; ai.disabled = true; ai.title = _t(4998, "联机玩家，不能交给电脑"); } });   // 「电脑」灰掉只是给房主看的，开局时 startFromSetup 照样把联机座位算成真人
    const list = [_tf(5000, "<li><b>玩家 1</b>：{$0}（你，房主，本机）</li>", esc((($('#nm0') || {}).value || '').trim() || _t(4999, "玩家 1")))].concat(Array.from({ length: Math.max(npVal(), n) - 1 }, (_, k) => k + 1).map(k => this.seats[k] ? _tf(5001, "<li><b>玩家 {$0}</b>：{$1}{$2} <button type=\"button\" class=\"sm\" data-act=\"MP.kick\" data-arg=\"{$3}\" title=\"把他移出房间，这个名字不能再进\">移出</button></li>", k + 1, esc(this.seats[k].name), this.seats[k].online ? '' : _t(4962, "（已断开）"), k) : _tf(5002, "<li class=\"muted\">玩家 {$0}：空位（不来人就在本机轮流玩）</li>", k + 1)));
    const watchers = Object.values(this.viewers);
    const invitation = this.watchToken ? _tf(5258, "<div class=\"mpwatch\"><p><b>受邀观战已开启</b> · 最多 {$0} 位观众，不占玩家座位</p><p>观战邀请码：<code data-watch-code style=\"overflow-wrap:anywhere;user-select:all\">{$1}</code> <button type=\"button\" class=\"sm\" data-act=\"MP.copyWatchInvite\">复制观战邀请</button></p><p class=\"muted\">将房间号和观战邀请码发给解说，选择「加入房间 → 受邀观战」，现在就能进来等待开赛。</p><p>已到场观众（{$2}/{$0}）：{$3}</p></div>", this.watchLimit, esc(this.watchToken), watchers.length, watchers.length ? watchers.map(x => esc(x.name)).join(_t(349, "、")) : _t(5259, "暂无")) : '';
    $('#mpstat').innerHTML = _tf(5003, "<div class=\"mproom\">房间号 <b>{$0}</b><span class=\"muted\">把房间号和密码发给朋友，他们在自己的设备上打开这个页面，点「加入房间」</span></div><ul class=\"mpseats\">{$1}</ul>", this.room, list.slice(0, Math.max(npVal(), n)).join('')) + `<div data-mp-members>${this.viewerUI()}</div>${invitation}`;
    $('#mpstat').insertAdjacentHTML('beforeend', `<p class="muted mpsig">${esc(sigLabel())}</p>`);   // 大家要连同一个信令服务器：写出房主这边用的是哪个
  },
  // 对方没正常关页面就没了（锁屏、断网、浏览器被系统杀掉）：数据通道不会自己关，PeerJS 只认 ICE 的 failed，Chrome 上 ICE 一直停在 disconnected。
  // 整条连接 failed（浏览器十几秒收不到对方的连通性确认）就回不来了，主动关掉，走正常的断线流程。不支持 connectionState 的浏览器照旧
  watch(conn) { const pc = conn.peerConnection; if (pc) pc.addEventListener('connectionstatechange', () => { if (pc.connectionState === 'failed') conn.close(); }); },
  onHostClose(conn) { this.closed(conn); const x = this.seats[conn._seat]; if (x && x.conn === conn) { x.online = false; if (S && S.players) { const tk = this.cur && this.cur.who === conn._seat && this.cur.box.querySelector('[data-mptake]'); if (tk) { tk.textContent = _t(5008, "对方掉线了，我来替他选"); tk.hidden = false; const ta = this.cur.box.querySelector('[data-mpall]'); if (ta) ta.hidden = false; } log(_tf(5009, "🔌 {$0} 断线了，可以用同一个名字重新加入", nm(S.players[conn._seat]))); render(); } else { delete this.seats[conn._seat]; const el = $('#nm' + conn._seat), ai = $('#ai' + conn._seat); if (el) { el.readOnly = false; el.value = ''; } if (ai) { ai.disabled = false; ai.title = ''; } this.renderLobby(); } } },
  async hash(t) {
    try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
    catch (e) { return 'plain:' + t; }
  },
  ready() { if (typeof Peer === 'undefined') { info(_t(5004, "联机不可用"), _t(5005, "<p>联机组件没有加载成功。</p>")); return false; } return true; },
});
