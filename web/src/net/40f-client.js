import { _t, _tf } from '../core/01-i18n-runtime.js';
import { $, actKey, esc, unesc } from '../core/02-util.js';
import { wbMark, wbValid } from '../rules/06-qbank.js';
import { P, S, __set_S } from '../engine/07-state.js';
import { MODAL_CUR, VIEW_CUR, info, modal } from '../ui/10-modal.js';
import { dealSfx } from '../ui/11-cards-deeds.js';
import { overScreens } from '../ui/26f-over-screens.js';
import { hopRender, render } from '../ui/27d-side.js';
import { enterGame, toast, tourWhenHuman } from '../ui/28-setup-save.js';
import { sfx } from '../ui/32-sfx.js';
import { FX } from '../ui/33-fx3d.js';
import { applyBal } from '../rules/35-modes.js';
import { aiPaused, isAI } from '../engine/36-ai.js';
import { MP } from './40-host-sync.js';
import { MPFX } from './41-replay.js';
import { mpUI } from './42-setup.js';
// 房主发来的弹窗里标着 data-you-seat 的地方（答题结果的「X 选的」「X 的错题本」）：是自己的座位就换成 data-you 里「你」的写法
function youView(h, seat) {
  if (typeof h !== 'string' || !h.includes('data-you-seat')) return h;
  const t = document.createElement('template'); t.innerHTML = h;
  t.content.querySelectorAll(`[data-you-seat="${seat}"]`).forEach(el => { el.textContent = el.dataset.you; });
  return t.innerHTML;
}
Object.assign(MP, {
  onClientMsg(m) {
    if (typeof m === 'string') { try { m = JSON.parse(m); } catch (e) { return; } }   // 新版房主发的状态是 JSON 字符串（序列化一次发给所有人）
    if (!m || typeof m !== 'object') return;
    // 被拒后能改了名字再点加入。hostConn 清掉：房主 300ms 后关连接，那次 close 不能再写成「连接断开了」，把「密码不对」盖掉
    // 局里掉线重连时被拒、但房主标了 retry（他还没发现旧连接断了、待确认的满了、确认超时）：不算被踢，过一会儿接着自动重连
    if (m.t === 'reject' && m.retry && this.role === 'client' && this.gone && S && S.players && !S.over) { this.hostConn = null; toast(_tf(5715, "重连被拒：{$0}。过一会儿自动再试", String(m.why || ''))); this.retryLater(); return; }
    if (m.t === 'reject') { const inGame = this.role === 'client' && S && S.players; this.role = inGame ? 'client' : null; if (inGame) { this.gone = true; this.kicked = true; MPFX.cancel(); render(); info(_t(5260, "加入失败"), `<p>${esc(String(m.why || ''))}</p>`, true); } this.hostConn = null; $('#mpstat').innerHTML = _tf(5028, "<span class=\"warn\">加入失败：{$0}</span>", esc(String(m.why || ''))); const jb = $('#mpbox .mpform button'); if (jb) jb.disabled = false; return; }
    if (m.t === 'kicked') { MPFX.cancel(); this.kicked = true; return; }
    // 房主把我移出了房间：不再自动重连；还在大厅里的，回到能重新填房间号的样子
    if (m.t === 'removed') { MPFX.cancel(); this.kicked = true; this.removed = true; this.gone = true; if (!(S && S.players)) { this.role = null; this.hostConn = null; $('#mpstat').innerHTML = _t(5029, "<span class=\"warn\">房主把你移出了房间</span>"); const jb = $('#mpbox .mpform button'); if (jb) jb.disabled = false; } else info(_t(5030, "你被移出了房间"), this.watching ? _t(5261, "<p>房主已结束你的观战或更新了邀请。请联系房主获取新邀请。</p>") : _t(5031, "<p>房主把你移出了这个房间，你的座位交给电脑接着打。</p>"), true); return; }   // 同一个浏览器的另一个页面用这个名字接手了座位，房主马上会关掉这条连接
    if (m.t === 'pending') { if ($('#mpstat')) $('#mpstat').textContent = String(m.why || _t(5262, "等待房主确认")); return; }
    if (m.t === 'welcome') { this.watching = m.mode === 'spectator'; MPFX.cancel(); MPFX.lastWalk = 0; if (this.hostConn) this.hostConn._ok = true; clearTimeout(this.rjT); if (this.gone) toast(_t(5032, "重新连上房主了")); this.role = 'client'; this.gone = false; this.kicked = false; this.removed = false; this.mySeat = m.seat; if (!this.watching && typeof m.key === 'string') this.seatKeys(this.room, m.key.slice(0, 64)); try { sessionStorage.setItem('aws-tycoon-lastjoin', JSON.stringify({ room: this.room, name: this.myName, watching: this.watching })); } catch (e) { } $('#mpstat').innerHTML = this.watching ? _tf(5263, "已加入房间 {$0}，你是只读观众，等待房主开始…", esc(this.room)) : _tf(5033, "<span class=\"ok\">已加入房间 {$0}，你是玩家 {$1}。等房主开始游戏…</span>", esc(this.room), m.seat + 1) + (S && S.players ? '' : _t(5584, " <button type=\"button\" class=\"sm\" data-act=\"MP.lobbyRenameAsk\">改名字</button>")); const sb = $('#startBtn'); if (sb) { sb.disabled = true; sb.textContent = _t(5034, "等房主开始"); } /* hero 和 UG 活动局的开局按钮也要灰掉：平板、矮屏手机首屏只看得到它们，点了会在客户端本地另开一局；「继续上一局」会读这台自己的旧存档 */ document.querySelectorAll('.hero .cta .twin.pri, .ugbar button, #resume button').forEach(b => { b.disabled = true; b.title = _t(5035, "已加入房间，等房主开始"); if (b.classList.contains('twin')) b.textContent = _t(5034, "等房主开始"); }); return; }
    if (this.role !== 'client') return;
    if (m.t === 'again') {
      MPFX.cancel();
      __set_S(null); this.gone = false; this.peek = null;
      const ef = $('#endfx'); if (ef) ef.remove();
      if (MODAL_CUR && !$('#modal').hidden) { try { MODAL_CUR.cancel(); } catch (e) { } } try { if (VIEW_CUR) VIEW_CUR.cancel(); } catch (e) { }
      $('#game').hidden = true; $('#setup').hidden = false; $('#setup').style.display = '';
      if (!$('#mpstat')) mpUI('join');
      $('#mpstat').innerHTML = this.watching ? _tf(5264, "房主开了下一局，你仍是房间 {$0} 的只读观众，等待开始…", esc(this.room)) : _tf(5036, "<span class=\"ok\">房主开了下一局，你还在房间 {$0}，是玩家 {$1}。等房主开始…</span>", esc(this.room), this.mySeat + 1);
      const sb = $('#startBtn'); if (sb) { sb.disabled = true; sb.textContent = _t(5034, "等房主开始"); }
      document.querySelectorAll('.hero .cta .twin.pri, .ugbar button, #resume button').forEach(b => { b.disabled = true; b.title = _t(5035, "已加入房间，等房主开始"); if (b.classList.contains('twin')) b.textContent = _t(5034, "等房主开始"); });
      return;
    }
    if (m.t === 'state' && m.S && Array.isArray(m.S.players)) {
      if (typeof m.now === 'number') this.skew = m.now - Date.now();   // 两台设备的时钟差（含一点传输延迟）：限时倒计时按房主的钟算。要在下面增量接不上就 return 之前记
      // 增量：只带了上次之后新增的日志和改过的格子历史，接到手上那份前面。接不上（漏了一份、本机自己记过日志）就请房主补发整份，补到之前的增量都不认
      if (m.delta) {
        if (this.resync || !S || (S.logSeq || 0) !== m.delta.from) { if (!this.resync) { MPFX.cancel(); this.resync = 1; this.send(this.hostConn, { t: 'resync' }); } return; }
        m.S.log = (m.delta.log || []).concat(S.log || []).slice(0, 1500); m.S.hist = Object.assign(S.hist || {}, m.delta.hist);
      } else this.resync = 0;
      const first = !S, rolled = S && m.S.rollId && m.S.rollId !== S.rollId, justOver = m.S.over && !(S && S.over); __set_S(m.S); applyBal(); MPFX.stateN++; MPFX.settle(true);
      if (rolled) FX.dice(S.lastDice);
      if (first || $('#game').hidden) enterGame(); else if (m.lite) hopRender(); else render();
      if (first) tourWhenHuman();   // 远端第一次进局：轮到自己掷骰子时弹新手引导（只弹一次，maybeTour 里记着）
      if (justOver) overScreens(S.winner != null ? P(S.winner) : null, S.overWhy || '');
    } else if (m.t === 'modal') {
      if (!S) return;
      this.lastMid = m.id;
      MPFX.after(() => {   // 房主那边弹窗是动画播完才弹的：这边还在重播就等播完
        if (this.lastMid !== m.id || (this.closedMid || 0) >= m.id) return;
        if (this.openMid === m.id && !$('#modal').hidden) return;   // 补状态时重发的同一个窗，已经开着就不重开（填了一半的输入不丢）
        // 自己开着看的窗口（图鉴、玩法、改名字……）时，别人的只读窗先不顶上来，不然翻到一半的图鉴、填了一半的名字都没了：记下来，关掉自己的窗口后还开着就补上。
        // 要我自己选的照旧马上顶上来。MODAL_CUR 可能是早就关掉的只读窗（closeLocal 不清它），所以还要看弹窗是不是真开着。电脑的窗 0.9 秒就关，不提示
        if (m.who !== this.mySeat && MODAL_CUR && MODAL_CUR.local && !$('#modal').hidden) { this.peek = m; const w = S.players[m.who]; if (w && !isAI(m.who)) toast(_tf(5037, "{$0} 在选：{$1}", unesc(w.name), unesc(String(m.spec.title || '').replace(/<[^>]+>/g, '')))); return; }
        this.showRemote(m);
      });
    } else if (m.t === 'wb') { if (wbValid(m.id)) wbMark(m.id, !!m.ok, true); }   // 自己答的题记进自己浏览器里的错题本
    else if (m.t === 'fx' && typeof m.k === 'string') MPFX.push(m);   // 房主那边播的动画：排队照着播（过路费、走棋、飞行、UG 活动、小特效）
    else if (m.t === 'toast' && typeof m.msg === 'string') toast(m.msg.slice(0, 120));   // 房主替远端做的事有了结果（电脑同不同意交易）、远端点的操作没执行：在他自己的设备上提示
    else if (m.t === 'renamed' && typeof m.name === 'string') { this.myName = m.name.slice(0, 12); try { sessionStorage.setItem('aws-tycoon-lastjoin', JSON.stringify({ room: this.room, name: this.myName, watching: false })); } catch (e) { } toast(_tf(5585, "改好了，现在叫 {$0}", esc(this.myName))); }
    else if (m.t === 'renameFail') info(_t(4626, "没改成"), `<p>${esc(unesc(String(m.why || '')))}</p>`, true);
    else if (m.t === 'modalClose') { this.closedMid = Math.max(this.closedMid || 0, m.id || 0); if (this.peek && this.peek.id <= this.closedMid) this.peek = null; if (this.closeLocal && this.openMid === m.id) { this.closeLocal(); this.closeLocal = null; } }
  },
  // 远端：打开房主发来的弹窗（收到时，或者自己的窗口关掉后补开）
  // 大厅里（房主还没开局）改自己的名字：发给房主查重、改座位表，回 renamed / renameFail。开局后改名走对局菜单或玩家卡上的 ✎（ui/28-setup-save.js 的 renameDialog）
  async lobbyRenameAsk() {
    if (this.role !== 'client' || this.watching || (S && S.players)) return;
    const r = await modal({ local: true, cancelable: true, title: _t(4124, "改名字"), inputs: [{ id: 'nm', type: 'text', label: _t(4624, "新名字（最多 12 个字）"), value: this.myName || '', af: true }], buttons: [{ label: _t(4625, "改好了"), value: 'ok', cls: 'pri' }, { label: _t(2465, "取消"), value: 'x' }] });
    if (r.v === 'ok' && !(S && S.players)) this.send(this.hostConn, { t: 'rename', name: String(r.inp.nm || '').slice(0, 12) });
  },
  showRemote(m) {
    this.peek = null; this.shown = m;
    const k = (m.spec.html || '').match(/class="deal (inc|rei|fis)\b/); if (k) dealSfx(k[1]);
    if (/class="rcards"/.test(m.spec.html || '') && !$('#modal .rcards')) { sfx('card'); setTimeout(() => sfx('magic'), 500); }   // 角色分配：房主开窗前响的两声
    // 带上房主给的 who：竞价这类弹窗的主人不是当前回合的人，不带的话提示条会写成「等 自己 …」，灰按钮也拿错人的现金解释
    // 要我选的弹窗来了、新手引导还开着：引导盖在弹窗上面（z-index 30 对 10），先收掉
    const sk = m.who === this.mySeat && $('#tour [data-x=skip]'); if (sk) sk.click();
    let html = typeof m.spec.html === 'string' ? m.spec.html.replace(/class="deal (inc|rei|fis)( fx)?"/g, (s, kd) => `class="deal ${kd}${FX.ok() ? ' fx' : ''}"`) : m.spec.html;
    // 自己答的题：结果窗里写「你选的」「错题本」，不写自己的名字（房主那份是按第三人称写给大家看的，标了 data-you 的地方换掉，见 rules/06-qbank.js）
    const mine = m.who === this.mySeat && !this.watching, yv = h => mine ? youView(h, this.mySeat) : h;
    html = yv(html); const bs = m.spec.buttons ? { buttons: m.spec.buttons.map(b => ({ ...b, label: yv(b.label) })) } : {};
    modal({ ...m.spec, html, ...bs, who: m.who, _mp: { id: m.id, interactive: !this.watching && m.who === this.mySeat } }); this.openMid = m.id; if (k) setTimeout(() => FX.dealIn(), 0);
  },
  // 自己的窗口关掉了：刚才没顶上来的只读窗还开着就补上；又开了别的窗口（手册切完整版）就接着等它也关掉
  showPeek() {
    const m = this.peek; if (!m || this.role !== 'client' || !$('#modal').hidden) return;
    this.peek = null;
    if (this.lastMid === m.id && (this.closedMid || 0) < m.id) this.showRemote(m);
  },
  // 远端：没轮到自己时按钮都不能点；轮到自己时点按钮变成发给房主
  lockUI() {
    const mine = !this.watching && S && S.cur === this.mySeat && !this.gone;   // 房主走了：自己的回合也锁住，点了也没人接
    if (this.gone && S && !S.over) { const st = $('#center .stage .st'); if (st) { if (this.kicked) st.textContent = this.removed ? _t(5041, "房主把你移出了房间") : _t(5042, "这个页面不再连着房间：接着在另一个页面里玩"); else st.innerHTML = _t(5043, "和房主断开了，正在自动重连… <button type=\"button\" class=\"sm\" data-rejoin data-act=\"MP.rejoin\">现在重新连接</button>"); } }
    const an = $('#modal [data-aipn]'); if (an) an.textContent = aiPaused() ? _t(2725, "已暂停") : _t(2726, "在选…");   // 房主暂停 / 继续电脑：开着的电脑弹窗跟着改（每次收到状态重画后都走到这里）
    document.querySelectorAll('#center button:is([onclick], [data-act]), #mbar button:is([onclick], [data-act])').forEach(b => {
      const a = this.ONCLICK[actKey(b)];
      if (a) { if (!mine) b.disabled = true; }
      else if (/confirmNew|quitGame|backToSetup/.test(actKey(b))) b.hidden = true;
    });
    if (this.watching) document.querySelectorAll('#game button:is([onclick], [data-act]), #mbar button:is([onclick], [data-act])').forEach(b => {
      if (/aipause|proposeEnd|renameDialog|cheat|reportCheat|maybeTour/.test(actKey(b))) b.hidden = true;
    });
    const t = $('.c-head .sub'); if (t && !t.querySelector('.mpme')) t.insertAdjacentHTML('beforeend', this.watching ? _t(5265, " · <span class=\"mpme\">受邀观战 · 只读</span>") : _tf(5044, " · <span class=\"mpme\">联机 · 你是 {$0}</span>", S.players[this.mySeat] ? S.players[this.mySeat].name : ''));
  },
});
