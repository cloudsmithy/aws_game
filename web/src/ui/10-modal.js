import { _t, _tf, _tr } from '../core/01-i18n-runtime.js';
import { $, BOT, SIM, SIM_AI, actKey, clean, esc } from '../core/02-util.js';
import { UI } from '../core/02b-ui-port.js';
import { P, S, log, nm } from '../engine/07-state.js';
import { showCard } from './11-cards-deeds.js';
import { fitArch } from './27b-arch-notes.js';
import { render } from './27d-side.js';
import { placeSqPop } from './27e-square-gallery.js';
import { botAct } from '../dev/29-bot.js';
import { simAct } from '../dev/30-sim.js';
import { AI_PAUSE, aiDecide, aiPaused, aiWhenRunning, isAI, toggleAiPause } from '../engine/36-ai.js';
import { MP } from '../net/40-host-sync.js';
// ================= 弹窗 =================
export let MODAL_CUR = null;
export let VIEW_CUR = null;   // 开着的查资料窗口（view）：和流程弹窗 MODAL_CUR 分开管，互不顶掉
export const viewOpen = () => !!VIEW_CUR && !$('#vmodal').hidden;
export let CARD_DEAL = null;   // 抽到但还没亮出来的 Health 卡 { id, who }：留给「要抵消吗」那个窗一起亮（见 drawIncident0）
// 推迟亮的卡还没走到「要抵消吗」就要结算（飞回起点、领钱扣钱、没受影响）：先补亮原来的发牌窗，免得效果跑在卡前面
export async function dealNow() { if (!CARD_DEAL) return; const d = CARD_DEAL; CARD_DEAL = null; await showCard('inc', d.id, P(d.who)); }
// 手册、图鉴这种长文档：顶部放一排章节标签，点了跳过去，滚动时高亮当前章节
function docToc(box) {
  const hs = [...box.querySelectorAll('.mb h4')]; if (hs.length < 3) return;
  const nav = document.createElement('nav'); nav.className = 'mtoc'; nav.setAttribute('aria-label', _t(2708, "章节"));
  nav.innerHTML = hs.map((h, k) => `<button type="button" class="sm" data-h="${k}">${h.textContent.replace(_tr(2709, "^[一二三四五六七八九十]+、", ""), '').replace(_tr(2710, "^附录\\s*[A-Z]?[：:]\\s*", ""), _t(2711, "附录 · ")).replace(_tr(2712, "（.*?）$", ""), '').replace(_tr(2713, "^(?!附录)(.*?)：.*$", ""), '$1')}</button>`).join('');
  box.querySelector('.mb').before(nav);
  const top = () => box.querySelector('h3').offsetHeight + nav.offsetHeight + 8;
  nav.style.top = box.querySelector('h3').offsetHeight + 'px';
  nav.onclick = e => { const b = e.target.closest('[data-h]'); if (!b) return; const h = hs[+b.dataset.h]; box.scrollTo({ top: box.scrollTop + h.getBoundingClientRect().top - box.getBoundingClientRect().top - top(), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); nav.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); };
  // 关窗时 box.innerHTML 被清空、nav 跟着离开页面，可 .box 是所有弹窗共用的，onscroll 还挂着这个 mark：
  // 打开长文档时 box.scrollTop = 0 排下的 scroll 事件，赶上下一帧之前就关窗（按 g 马上 Esc、点「看完整版」马上关）会落到空框上，h3 没了就报错
  const mark = () => { if (!nav.isConnected) return; const y = box.getBoundingClientRect().top + top() + 4; let k = 0; hs.forEach((h, n) => { if (h.getBoundingClientRect().top <= y) k = n; }); let on; nav.querySelectorAll('button').forEach((b, n) => { if (n === k && !b.classList.contains('on')) on = b; b.classList.toggle('on', n === k); }); if (on && nav.scrollWidth > nav.clientWidth) { const l = on.offsetLeft - 20, r = on.offsetLeft + on.offsetWidth + 20; if (l < nav.scrollLeft) nav.scrollLeft = l; else if (r > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = r - nav.clientWidth; } };
  box.onscroll = mark; mark();
}
// 手机布局（和 #mbar 同一条媒体查询）：页面能上下滚，主按钮固定在屏幕底部
export const PHONE_MQ = matchMedia('(max-width:900px),(max-height:500px) and (orientation:landscape)');
export const TABP_MQ = matchMedia('(min-width:740px) and (max-width:900px) and (orientation:portrait)');   // 竖着的平板：还是手机那套布局，但格子上有字（见 CSS 同名段）；PHONE_MQ 不能改，弹窗收起、格子面板还按手机布局摆
// 收起的弹窗横条：桌面端棋盘正好占满一屏，按视口贴底会压住底排格子的主人和过路费，改放到棋盘中间区域的底部
// （盖住的是图例和行动按钮，收起时本来就不该点）。手机布局、或中间区域没整块露在屏幕里时，还是按原样贴底
// 手机横屏主按钮是右边一竖条（同 CSS 里那段媒体查询）
const LAND_MQ = matchMedia('(max-height:500px) and (orientation:landscape)');
export function minPlace() {
  const m = $('#modal');
  if (m.hidden || !m.classList.contains('min')) return void (m.style.padding = '');   // 每次 render 都会调，没收起就不量，省一次排版
  const c = $('#center'), r = c && c.getBoundingClientRect();
  const ok = !PHONE_MQ.matches && r && r.height > 120 && r.top >= 0 && r.bottom <= m.clientHeight;
  // 手机横屏：按钮个数、折行都会变，横条贴在最上面那个按钮上方，不压按钮
  const b = !ok && LAND_MQ.matches && [...$('#mbar').children].find(e => e.getClientRects().length);
  m.style.padding = ok ? `0 ${Math.round(m.clientWidth - r.right + 12)}px ${Math.round(m.clientHeight - r.bottom + 10)}px ${Math.round(r.left + 12)}px` : b ? `0 0 ${Math.round(m.clientHeight - b.getBoundingClientRect().top + 8)}px` : '';
}
addEventListener('resize', minPlace); addEventListener('scroll', minPlace, { passive: true });
// 竖屏底栏的实际高度写进 --mbar-h，页面底部留白、收起的横条、toast、格子面板都按它让开；横屏按钮在右边一竖条、不占底部，不写。
// 转屏时 resize 比这里先到，那时量的还是旧栏高：收起的横条、开着的格子面板在这里再摆一次
if (window.ResizeObserver) new ResizeObserver(() => {
  const mb = $('#mbar'), h = LAND_MQ.matches ? 0 : mb.offsetHeight, st = document.documentElement.style;
  if (h) st.setProperty('--mbar-h', h + 'px'); else st.removeProperty('--mbar-h');
  minPlace(); placeSqPop();
}).observe($('#mbar'));
// 弹窗、新手引导开着时，背后的开局页、棋盘、底部主按钮栏都设 inert：Tab 出不去、读屏读不到，回车也落不到被盖住的按钮上（实测会替玩家点主按钮误买）；收起看棋盘时放开
export function bgInert() {
  const m = $('#modal'), v = viewOpen(), on = v || (!m.hidden && !m.classList.contains('min')) || !!$('#tour');
  ['#setup', '#game', '#mbar', '#sqpop'].forEach(s => { const el = $(s); if (el) el.inert = on; });
  m.inert = v;
}
// 只记键盘（Tab）停上去的焦点；鼠标点的不记，不然关掉弹窗后按空格会去点刚才那个按钮，不再是掷骰子
export const kbdFocus = () => { const a = document.activeElement; return a && a !== document.body && a.matches(':focus-visible') ? a : null; };
// 按钮被重画掉以后，按 data-fk 或 actKey（onclick 原文 / data-act 拼回的原文）找新画出来的同一个。键不能撞：灰按钮的 data-fk 是它能点时的 onclick（onclick 全是 toast），右栏的按钮带 cr: 前缀，和「更多操作」里同名的分开
const focusKey = el => el && (el.dataset.fk || actKey(el) || el.textContent.trim());
export const canFocus = el => el && el.isConnected && !el.disabled && !el.closest('[inert],[hidden]') && el.getClientRects().length;
export const sameEl = el => el && [...document.querySelectorAll(':is(#center, #mbar, #side) :is(button, summary)')].find(x => canFocus(x) && focusKey(x) === focusKey(el));
export const mainBtn = () => [...document.querySelectorAll('#mbar button.pri, #center .stage .row:not(.more) button.pri')].find(canFocus);
// 关掉弹窗 / 引导后焦点还回去：回打开前的按钮，没了就落到主按钮；紧接着又开了下一个弹窗就不动，免得把焦点从新弹窗里拽出来
export function focusBack(back) {
  if (BOT) return;
  setTimeout(() => {
    if (!$('#modal').hidden || $('#tour') || viewOpen()) return;
    const a = document.activeElement; if (a && a !== document.body && a.isConnected) return;
    const t = [back, sameEl(back), mainBtn()].find(canFocus);
    if (t) t.focus({ preventScroll: true });
  }, 30);
}
// 灰按钮为什么不能选：大多是钱不够，按钮上写着价钱就算给玩家看
export function greyWhy(b, box) {
  const lb = (b.querySelector('b') || b).textContent.trim(), n = +((lb.match(/\$(\d+)/) || [])[1] || 0), w = box.dataset.who, p = w !== '' && S && S.players ? S.players[+w] : null;
  return _tf(2714, "「{$0}」现在不能选", lb) + (n && p && p.cash < n ? _tf(2715, "：现金 ${$0}，不够 ${$1}", p.cash, n) : '');
}
// cancelable：房主本机自己看的窗口（玩法、图鉴、明细、大图、改名字、新游戏 / 退出 / 现在结算的确认），轮到的远端玩家点了掷骰子或操作时替房主关掉，最后一个按钮必须是关闭 / 取消。
// hp：远端收到的弹窗里带着，表示房主点了「他回来之前都由我来选」，正在替掉线的那个座位选
export function modal({ title, html = '', inputs = [], buttons = [{ label: _t(2716, "确定"), value: true, cls: 'pri' }], cls = '', who, _mp, local = false, noAI = false, aiMin = false, deal = false, hold = 0, cancelable = false, hp = false, view = false }) {
  // 推迟亮的卡还没亮出来，中间却要先弹别的窗（选哪一块挂了、借 Session Manager……）：先补一个原来的发牌窗，再弹这个
  if (CARD_DEAL && !local && !deal) { const spec = arguments[0]; return dealNow().then(() => modal(spec)); }
  return new Promise(res => {
    // view：查资料的窗口（明细、图鉴、玩法、格子介绍、快捷键）开在单独一层 #vmodal，不占 MODAL_CUR。
    // 流程弹窗照常开在下面的 #modal（电脑照样选、联机照样发给远端），不会把正在看的资料顶掉；再开一个查资料窗只换掉上一个查资料窗
    const back = view ? (VIEW_CUR ? VIEW_CUR.back : kbdFocus()) : MODAL_CUR ? MODAL_CUR.back : kbdFocus();   // 一个弹窗直接换成下一个时，沿用最早打开前的焦点
    if (view) { if (VIEW_CUR) VIEW_CUR.cancel(); } else if (MODAL_CUR) MODAL_CUR.kill();
    // 联机：房主这边轮到远端玩家选时只显示、不能点；远端只有轮到自己时能点
    const mpWho = who ?? MP.actor ?? (S && S.players ? S.cur : null);
    const clientView = MP.role === 'client' && !!_mp;
    // 本机电脑的弹窗也只能看：电脑要等 0.9 秒才选，这段时间真人按空格、点按钮会替它做决定（实测把它的钱花到见底）
    // noAI 的窗口（角色分配）没有电脑代点，谁在看谁点：不然全是电脑的局按钮是灰的，又没人替它点，谁也关不掉
    const aiSeat = !noAI && !BOT && !local && !clientView && !(MP.role === 'host' && MP.isRemote(mpWho)) && isAI(mpWho);
    const interactive = !aiSeat && (local || (clientView ? _mp.interactive : !(MP.role === 'host' && MP.isRemote(mpWho) && !MP.hostPlays(mpWho))));   // hostPlays：房主接手了的掉线座位，按本机座位处理
    const m = view ? $('#vmodal') : $('#modal'), box = m.querySelector('.box');
    box.className = 'box ' + cls + (buttons.some(b => b.desc) ? ' opts' : '');
    m.classList.remove('min'); m.style.padding = '';
    let h = `<h3><span>${clean(title)}</span>${view ? '' : _t(2717, "<button class=\"sm minbtn\" type=\"button\" title=\"先收起这个窗口看看棋盘，再点一下展开（快捷键 H，也可以点窗口外面的空白处）\">收起看棋盘</button>")}</h3><div class="mb">${html}</div>`;
    if (inputs.length) {
      h += '<div class="inps">' + inputs.map(inp => {
        if (inp.type === 'header') return `<div class="ih">${inp.label}</div>`;
        if (inp.type === 'checkbox') return `<label class="cb"><input type="checkbox" id="in_${inp.id}" ${inp.value ? 'checked' : ''} ${inp.disabled ? 'disabled' : ''}> ${inp.label}</label>`;
        if (inp.type === 'textarea') return `<label style="display:block">${inp.label}<textarea id="in_${inp.id}" rows="2"></textarea></label>`;
        if (inp.type === 'select') return `<label>${inp.label} <select id="in_${inp.id}">${inp.options.map(o => `<option value="${esc(o.value)}" ${String(o.value) === String(inp.value) ? 'selected' : ''}>${clean(o.label)}</option>`).join('')}</select></label>`;
        if (inp.type === 'text') return `<label style="display:block">${inp.label}<input type="text" id="in_${inp.id}"${inp.af ? ' data-af enterkeyhint="done"' : ''} maxlength="${inp.max ?? 12}" value="${esc(inp.value ?? '')}" style="display:block;width:100%;margin-top:6px"></label>`;
        return `<label>${inp.label} <input type="number" inputmode="numeric" id="in_${inp.id}"${inp.af ? ' data-af enterkeyhint="done"' : ''} min="${inp.min ?? 0}" ${inp.max != null ? `max="${inp.max}"` : ''} step="${inp.step ?? 1}" value="${inp.value ?? 0}"></label>`;
      }).join('') + '</div>';
    }
    h += `<div class="btns">${buttons.map((b, k) => `<button data-k="${k}" class="${b.cls || ''}${b.desc ? ' opt' : ''}" ${b.disabled ? 'disabled' : ''}>${b.desc ? `<b>${clean(b.label)}</b><small class="bd">${clean(b.desc)}</small>` : clean(b.label)}</button>`).join('')}</div>`;
    box.innerHTML = h; m.hidden = false; box.scrollTop = 0; box.dataset.who = mpWho ?? ''; bgInert();
    box.onscroll = null; if (box.classList.contains('doc')) docToc(box);
    requestAnimationFrame(() => fitArch(box));   // 架构图一行放不下就整体缩小，一眼看全
    // 收起时背后放开（能点格子、能 Tab 到棋盘），焦点留在「展开窗口」上；展开时焦点回到弹窗的主按钮
    const toggleMin = () => {
      const on = m.classList.toggle('min'), mb = box.querySelector('.minbtn'); mb.textContent = on ? _t(2718, "展开窗口") : _t(2719, "收起看棋盘"); minPlace(); bgInert(); box.setAttribute('aria-modal', String(!on));
      if (!on) (box.querySelector('.btns button.pri:not(:disabled)') || box.querySelector('.btns button:not(:disabled)') || mb).focus({ preventScroll: true });
      else if (box.contains(document.activeElement) || document.activeElement === document.body) mb.focus({ preventScroll: true });
    };
    if (!view) box.querySelector('.minbtn').onclick = toggleMin;
    // aiMin：电脑的买地窗只能看、0.9 秒就关，摊开只会盖住棋盘，开着收起的横条（标题照样看得到，点「展开窗口」能细看）；联机远端看电脑选时也收起
    if (aiMin && (aiSeat || (clientView && isAI(mpWho)))) toggleMin();
    // hold 期间点到遮罩也不收：双击「卖回亚马逊云科技」时第二下落在确认框外面，别把确认框收成横条（openAt 在下面定义，点击只会在这之后才到）
    // 查资料窗没有「收起」：点窗口外面就是关掉（按下和松开都在外面才算，在窗口里拖选文字拖到外面松手不关）
    if (view) { m.onpointerdown = e => { m._down = e.target === m; }; m.onclick = e => { if (e.target === m && m._down) pick({ k: buttons.length - 1 }); }; }
    else {
    m.onclick = e => { if (e.target === m && !m.classList.contains('min') && !(hold && performance.now() - openAt < hold)) toggleMin(); };
    m.toggleMin = toggleMin;
    }
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', clean(title).replace(/<[^>]+>/g, '')); box.tabIndex = -1;
    // 读屏：打开就念说明，答题弹窗只念题干（不把解释和错题本标签一起念）；手册、图鉴这种长文不挂，免得一打开念几千字
    { const d = box.querySelector('.mb [data-desc]') || box.querySelector('.mb .q') || box.querySelector('.mb'); if (d && d.textContent.trim() && d.textContent.length < 400) { d.id = 'mdesc'; box.setAttribute('aria-describedby', 'mdesc'); } else box.removeAttribute('aria-describedby'); }
    if (!interactive) {
      box.classList.add('mpwait');
      const nmw = S && S.players && S.players[mpWho] ? S.players[mpWho].name : _t(2720, "对方"), nmAI = _tr(2721, "电脑", "").test(nmw) ? nmw : nmw + _t(2722, "（电脑）");
      // 远端看房主那台上轮流玩的座位（不是房主、也不在 mpSeats 里）：他们没有自己的设备，别写「在自己的设备上」
      const where = clientView && S && mpWho > 0 && !(S.mpSeats || []).includes(mpWho) ? _t(2723, "在房主那台设备上") : _t(2724, "在自己的设备上");
      // 远端看电脑在选也写「X（电脑） 在选…」，不写「等 X 在自己的设备上选择」；电脑在房主那台跑，暂停按钮只放在房主那边，房主暂停后远端这里跟着写「已暂停」（S.aiPause 随状态推过来，lockUI 里刷新）
      // 远端看掉线的座位（S.mpOff）：房主接手了写「房主替他选」，还没接手写「等他连回来或房主替他选」，不再写「等 X 在自己的设备上选择」
      // 房主看远端的弹窗：对方连着时不放「替他选」，免得替在线的人做了决定；掉线了（conn close）或者 30 秒没动再露出来
      const off = !(MP.seats[mpWho] && MP.seats[mpWho].online);
      box.querySelector('h3').insertAdjacentHTML('afterend', aiSeat ? '<div class="mpnote"><span></span><button class="sm" data-aip></button></div>' : clientView && isAI(mpWho) ? `<div class="mpnote">${nmAI} <span data-aipn>${aiPaused() ? _t(2725, "已暂停") : _t(2726, "在选…")}</span></div>` : clientView && hp ? _tf(2727, "<div class=\"mpnote\">{$0} 掉线了，房主替他选…</div>", nmw) : clientView && (S.mpOff || []).includes(mpWho) ? _tf(2728, "<div class=\"mpnote\">{$0} 掉线了，等他连回来或房主替他选…</div>", nmw) : _tf(2730, "<div class=\"mpnote\">等 {$0} {$1}选择…{$2}</div>", nmw, where, MP.role === 'host' ? _tf(2729, "<button class=\"sm\" data-mptake{$0}>对方掉线了，我来替他选</button><button class=\"sm\" data-mpall{$1}>他回来之前都由我来选</button>", off ? '' : ' hidden', off ? '' : ' hidden') : ''));
      // 电脑的弹窗：想多看一会儿就点暂停（和中间那个「暂停 / 继续」是同一个开关），它不会替电脑选
      const ap = box.querySelector('[data-aip]');
      if (ap) { const upd = () => { ap.previousElementSibling.innerHTML = AI_PAUSE ? _tf(2731, "{$0} 已暂停，点「继续」它再选", nmAI) : _tf(2732, "{$0} 在选…", nmAI); ap.textContent = AI_PAUSE ? _t(2461, "继续") : _t(2733, "暂停"); }; upd(); ap._upd = upd; ap.onclick = toggleAiPause; }
      box.querySelectorAll('.btns button,[data-v],.inps input,.inps textarea,.inps select').forEach(el => { el._d0 = el.disabled; el.disabled = true; });
      const tk = box.querySelector('[data-mptake]');
      if (tk) tk.onclick = () => { box.classList.remove('mpwait'); tk.parentNode.remove(); box.querySelectorAll('.btns button,[data-v],.inps input,.inps textarea,.inps select').forEach(el => { el.disabled = !!el._d0; }); buttons.forEach((b, k) => { if (b.disabled) box.querySelector(`button[data-k="${k}"]`).disabled = true; }); };
      // 人走了不回来：点一次「他回来之前都由我来选」，之后他的买地、抽卡、竞价、投票、交易确认都直接在房主这台选，不用每个窗再点。
      // 只认真掉线的座位（hostPlays 还要求 !online，30 秒没动的计时只露出上面那个按钮）；他用同一个名字连回来，admit 换掉整个座位对象，标记跟着没了
      const ta = box.querySelector('[data-mpall]');
      if (ta) ta.onclick = () => { const x = MP.seats[mpWho]; if (!x || x.online) return; x.hp = true; log(_tf(2734, "{$0} 掉线了，他回来之前由房主替他选", nm(S.players[mpWho]))); tk.onclick(); render(); };
      // 对方显示在线却一直没动（手机锁屏、Wi-Fi 断了：PeerJS 遇到 ICE disconnected 不关连接，房主这边会好几十秒都当他在线）：30 秒后也给一条出路（nmw 是转义过的名字，用 innerHTML）
      // 计时挂在按钮上：掉线又连回来时 admit 会把按钮重新藏起来，要从头再计 30 秒，不然连回来的手机再锁屏，房主手上就一个按钮都没有了
      if (tk) { tk._arm = () => { clearTimeout(tk._t); tk._t = setTimeout(() => { if (!finished && tk.isConnected && tk.hidden) { tk.innerHTML = _tf(2735, "{$0} 半天没动，我来替他选", nmw); tk.hidden = false; } }, /\bquiz\b/.test(cls) ? 90000 : 30000); }; if (tk.hidden) tk._arm(); }
    }
    // 只能看的弹窗（远端、电脑在选）把焦点放在弹窗本身：读屏能念到，背后又是 inert，焦点不会丢到页面外
    // 竞价、Spot 出价、改名字（输入框带 af）：有鼠标键盘的设备上焦点直接放进框里、选中原来的数，打开就能输、回车提交，不会先按 1 把 $0 交掉。
    // 触屏不自动放，免得一开窗软键盘先弹出来盖住半个窗口。抢 Spot、抵消窗的框不带 af：主选项是按钮，数字键还要用来选按钮
    if (!BOT) setTimeout(() => { const af = interactive && matchMedia('(pointer: fine)').matches && box.querySelector('.inps [data-af]:not(:disabled)'), f = interactive && (af || box.querySelector('.btns button.pri:not(:disabled)') || box.querySelector('.btns button:not(:disabled)')); if (view ? VIEW_CUR === me : MODAL_CUR === me && !viewOpen()) { (f || box).focus({ preventScroll: true }); if (af) af.select(); } }, 0);
    let finished = false;
    const collect = () => {
      const o = {};
      inputs.forEach(inp => {
        if (!inp.id) return;
        const el = box.querySelector('#in_' + inp.id); if (!el) return;
        o[inp.id] = inp.type === 'checkbox' ? el.checked : inp.type === 'textarea' || inp.type === 'text' || inp.type === 'select' ? el.value : (parseInt(el.value, 10) || 0);
      });
      return o;
    };
    // cancel：替房主关掉他自己开着看的窗口（远端轮到的人点了操作），选最后一个按钮。done 在后面才声明，只在 me 建好以后才调，碰不到 TDZ
    const me = { back, local, cancelable, ro: !interactive, view, cancel: () => done(buttons[buttons.length - 1].value), kill: () => { finished = true; document.removeEventListener('keydown', onKey); } };
    if (view) VIEW_CUR = me; else { MODAL_CUR = me; viewNote(); }
    const done = v => { if (finished) return; finished = true; if (view) { if (VIEW_CUR === me) VIEW_CUR = null; } else if (MODAL_CUR === me) MODAL_CUR = null; document.removeEventListener('keydown', onKey); const vals = collect(); m.hidden = true; box.innerHTML = ''; m.classList.remove('min'); bgInert();
      // 关掉查资料窗：下面还开着流程弹窗就把焦点交给它，没有就回打开前的地方；关掉流程弹窗：查资料窗上的提示条跟着去掉
      if (view && !VIEW_CUR && !$('#modal').hidden && !$('#modal').classList.contains('min')) { const gb = $('#modal .box'); setTimeout(() => { if (!viewOpen() && gb.isConnected && !$('#modal').hidden) (gb.querySelector('.btns button.pri:not(:disabled)') || gb.querySelector('.btns button:not(:disabled)') || gb).focus({ preventScroll: true }); }, 0); } else focusBack(back);
      if (!view) viewNote(); if (MP.role === 'host' && MP.cur && MP.cur.box === box) MP.closeModal(); if (local && MP.peek) setTimeout(() => MP.showPeek(), 120); res({ v, inp: vals }); };   // peek：远端开着自己的窗口时别人的只读窗没顶上来，关掉后还开着就补上。等 120ms：手册切完整版这类马上又开的窗口先开，补开的留到它也关掉
    if (clientView) MP.closeLocal = () => { finished = true; document.removeEventListener('keydown', onKey); m.hidden = true; box.innerHTML = ''; m.classList.remove('min'); bgInert(); focusBack(back); };
    // 远端玩家的选择：k 是第几个按钮，v 是 data-v 的值，inp 是输入框
    const pick = (ans) => {
      if (clientView) { MP.answer(_mp.id, ans, collect()); box.querySelectorAll('.btns button,[data-v]').forEach(el => { el.disabled = true; }); return; }
      if ('k' in ans) { if (buttons[ans.k] && !buttons[ans.k].disabled) done(buttons[ans.k].value); }
      else done(ans.v);
    };
    if (MP.role === 'host' && !BOT && !local) MP.openModal({ title, html, inputs, buttons, cls, noAI, aiMin, hold }, mpWho, box, (ans, inp) => {
      Object.entries(inp || {}).forEach(([id, val]) => { const el = box.querySelector('#in_' + CSS.escape(id)); if (el) { if (el.type === 'checkbox') el.checked = !!val; else el.value = String(val).slice(0, 200); } });
      if ('v' in ans) { const el = [...box.querySelectorAll('[data-v]')].find(e => e.dataset.v === String(ans.v)); if (!el || (el._d0 ?? el.disabled)) return; }   // 认的是加 mpwait 之前的状态：mpwait 把房主这边的按钮全灰了，不能拿来判断远端点得对不对
      pick(ans);
    });
    // 只有一个按钮的提示框可以按 Esc 关掉；要做选择的弹窗不能用 Esc 跳过
    const onKey = e => {
      if (view ? VIEW_CUR !== me : MODAL_CUR !== me || viewOpen()) return;   // 查资料窗开着时，按键都归它，下面的流程弹窗不收
      if (view && e.key === 'Escape') { e.preventDefault(); pick({ k: buttons.length - 1 }); return; }
      // Tab 只在弹窗里转一圈（收起看棋盘时不管，要能 Tab 到棋盘上）
      if (e.key === 'Tab' && !m.classList.contains('min')) {
        const f = [...box.querySelectorAll('button, [href], input, textarea, select, summary, [tabindex]:not([tabindex="-1"])')].filter(el => !el.disabled && el.getClientRects().length), i = f.indexOf(document.activeElement);
        if (!f.length || (e.shiftKey ? i <= 0 : i < 0 || i === f.length - 1)) { e.preventDefault(); if (f.length) f[e.shiftKey ? f.length - 1 : 0].focus(); }
        return;
      }
      // 输入框里按回车（手机键盘上的「完成 / 前往」也是回车）＝点主按钮：走按钮自己的 onclick，hold 照样生效，联机远端走 pick 里的 MP.answer。
      // 只认 .inps 里的数字框和文字框（根因的多行框要能换行）；交易窗（有勾选框，两边都没服务时也有「X 交出」分组标题）不管，免得对方是电脑时一回车就成交；没有主按钮的窗（抵消窗）不管。
      // 输入法选字时的回车（isComposing，Safari 是 keyCode 229）不算，不然拼音打英文按回车上屏会连名字一起交掉；按住不放的自动重复也不算，免得连着交掉后面几个人的竞价
      if (e.key === 'Enter' && !e.repeat && !e.isComposing && e.keyCode !== 229 && interactive && !m.classList.contains('min') && e.target.matches && e.target.matches('#modal .box .inps input[type=number], #modal .box .inps input[type=text]') && !box.querySelector('.inps input[type=checkbox], .inps .ih')) { e.preventDefault(); const pb = box.querySelector('.btns button.pri:not(:disabled)'); if (pb) pb.click(); return; }
      if (e.key === 'Escape' && interactive && buttons.length === 1 && !inputs.length) pick({ k: 0 });
    };
    document.addEventListener('keydown', onKey);
    const openAt = performance.now();   // 单调时钟：系统校时往回拨也不会把 hold 拉长
    // hold：刚打开这一小会儿不收点击（等卡翻面、防按老习惯的空格把 ES 花掉）。按钮先变淡，免得以为卡住了再连点；
    // 不用 disabled：初始焦点和 Tab 都会跳过 disabled 的按钮，焦点就落不到主按钮上了。联机远端也走这里（spec 带着 hold）
    // 正文里的 data-v 按钮（资产管理表）一起挡、一起变淡。class 挂在每次重建的 .btns、.mb 上，不挂 .box：.box 是复用的，上一个窗的计时会提前去掉下一个窗的 hold
    if (hold) { const hs = box.querySelectorAll('.btns, .mb'); hs.forEach(e => e.classList.add('hold')); setTimeout(() => hs.forEach(e => e.classList.remove('hold')), hold); }
    box.querySelectorAll('button[data-k]').forEach(b => b.onclick = () => { if (hold && performance.now() - openAt < hold) return; pick({ k: +b.dataset.k }); });
    // 资产管理每做一件事整个窗口重画，双击的第二下会落在下一级同一位置的按钮上（连升两级、连加两个容量）：
    // hold 期间不收；e.detail > 1 是系统认定的双击第二下（按系统的双击间隔算，慢一点的双击、双击入口按钮落进新窗口也能挡住），键盘触发的是 0 不受影响
    box.querySelectorAll('[data-v]').forEach(b => b.onclick = e => { if (b.disabled || e.detail > 1 || (hold && performance.now() - openAt < hold)) return; pick({ v: b.dataset.v }); });
    // noAI：要等真人看完再关的窗口（角色分配），座位是电脑也不替人点。座位是电脑时（全电脑局、房主把自己设成电脑）就让本机看的人点，所以上面 aiSeat 不锁它
    if (BOT) setTimeout(() => (SIM ? (SIM_AI ? (b, i, bt, d) => aiAct(b, i, bt, d, mpWho) : simAct) : botAct)(box, inputs, buttons, done), 0);
    // 抽卡窗（Health、re:Invent、FIS 都带 .deal）：发牌动画 3D 版约 1.25 秒、CSS 版连抖动约 1.55 秒，放完再留一秒给人读卡面；不然电脑点得太快，卡还没翻过来窗口就没了。
    // 减少动效时没有发牌动画，卡面一打开就摆好了，留 1.6 秒读卡（和平时翻好以后能读的时间差不多），不用再等动画那一段
    else if (!local && !clientView && !noAI && isAI(mpWho)) setTimeout(() => aiWhenRunning(() => { if (!finished && MODAL_CUR === me) aiAct(box, inputs, buttons, done, mpWho); }), box.querySelector('.deal') ? (matchMedia('(prefers-reduced-motion: reduce)').matches ? 1600 : 2600) : 900);
  });
}
// 电脑替座位点弹窗：从页面读出电脑要看的东西交给 aiDecide（engine/36-ai.js，只看数据），再把它要填的输入框写回页面、按它选的值关窗
function aiAct(box, inputs, buttons, done, who) {
  const view = { title: (box.querySelector('h3 span') || box.querySelector('h3') || {}).textContent || '', get text() { return box.textContent; }, quiz: box.classList.contains('quiz'), inputs: {} };
  for (const inp of inputs) { const el = box.querySelector('#in_' + inp.id); if (el) view.inputs[inp.id] = { type: inp.type, min: el.min, max: el.max, nOpt: el.options ? el.options.length : 0 }; }
  // 出价、复盘这两个输入框电脑按 id 直接找（不在 inputs 里也照找，和以前一样）
  for (const id of ['bid', 't']) if (!view.inputs[id]) { const el = box.querySelector('#in_' + id); if (el) view.inputs[id] = { type: el.type, min: el.min, max: el.max, nOpt: 0 }; }
  const { v, set } = aiDecide(view, inputs, buttons, who);
  for (const [id, val] of Object.entries(set)) { const el = box.querySelector('#in_' + id); if (!el) continue; if (val && typeof val === 'object') el.selectedIndex = val.selectedIndex; else el.value = val; }
  done(v);
}
export const ask = async spec => (await modal(spec)).v;
// 查资料窗开着、下面的流程弹窗要这台设备上的人选（自己的买地、竞价、投票、答题……）：查资料窗顶上挂一条提示，点「去处理」关掉查资料窗。
// 别人或电脑在选的只读窗不提示，照常在下面走完
function viewNote() {
  const vb = viewOpen() && $('#vmodal .box'); if (!vb) return;
  const g = !$('#modal').hidden && MODAL_CUR && !MODAL_CUR.ro && !MODAL_CUR.local, t = g ? (($('#modal .box h3 span') || {}).textContent || '').trim() : '';
  let n = vb.querySelector('.vnote');
  if (!g) { if (n) n.remove(); return; }
  if (!n) { vb.querySelector('h3').insertAdjacentHTML('afterend', _t(2736, "<div class=\"vnote\" role=\"status\"><span></span><button type=\"button\" class=\"sm pri\">去处理</button></div>")); n = vb.querySelector('.vnote'); n.style.top = (vb.querySelector('h3').offsetHeight + 6) + 'px'; n.querySelector('button').onclick = () => { if (VIEW_CUR) VIEW_CUR.cancel(); }; }
  n.querySelector('span').textContent = _tf(2738, "下面有个窗口在等你选{$0}。看完点「去处理」，或者直接关掉这个窗口", t ? _tf(2737, "：「{$0}」", t) : '');
}
export const info = (title, html, local = false) => ask({ local, title, html, buttons: [{ label: _t(2478, "知道了"), value: true, cls: 'pri' }] });

// 别的文件要改这些变量（import 进来是只读的），走这里
export const __set_MODAL_CUR = v => (MODAL_CUR = v);
export const __set_CARD_DEAL = v => (CARD_DEAL = v);
// （从 engine/14-turn.js 挪来）
// 有弹窗挡着、这一下不该做时返回 true。收起的图鉴、玩法、明细这类自己查资料的窗（cancelable）不算挡：替玩家关掉、接着做，
// 不然主按钮看着能点、点了按空格都没反应。收起的是别的窗（「这局在别处接着打了」）就提示先处理。机器人自测不看弹窗，同原来的 !BOT
export function modalBlocks(peek = false) {
  const m = $('#modal'); if (BOT || m.hidden) return false;
  const t = (m.querySelector('h3 span') || {}).textContent || _t(2908, "弹窗");
  // 远端看别人在选（只读窗）时查资料：只读窗记进 peek 先收掉，查完关掉时 done 里的 showPeek 补回来（别人已经选完就不补）
  if (peek && MP.role === 'client' && UI.MODAL_CUR && UI.MODAL_CUR.ro && MP.shown && MP.openMid === MP.shown.id) { MP.peek = MP.shown; if (MP.closeLocal) MP.closeLocal(); MP.closeLocal = null; UI.__set_MODAL_CUR(null); return false; }
  if (!m.classList.contains('min')) return true;
  if (UI.MODAL_CUR && UI.MODAL_CUR.cancelable) { UI.MODAL_CUR.cancel(); return false; }
  UI.toast(UI.MODAL_CUR && UI.MODAL_CUR.ro ? _tf(2909, "「{$0}」是别人在选，等他选完再开", t) : _tf(2910, "先处理收起的「{$0}」：点「展开窗口」", t)); return true;
}
// 游戏逻辑要知道的弹窗、引导状态（经 UI.xxx 调，engine/ 不碰页面）
export const modalHidden = () => $('#modal').hidden;
export const modalMin = () => $('#modal').classList.contains('min');
export const tourOpen = () => !!$('#tour');
export const aipBtnUpd = () => { const ap = $('#modal [data-aip]'); if (ap && ap._upd) ap._upd(); };   // 弹窗里的「电脑暂停 / 继续」按钮跟着刷新
