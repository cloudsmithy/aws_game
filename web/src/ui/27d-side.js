import { AWSI } from '../data/icons.js';
import { LANG, __rv, _t, _tf, _tr } from '../core/01-i18n-runtime.js';
import { $, BOT, PAWN, SIM, awsImg, esc, usd } from '../core/02-util.js';
import { BAL, OFFLINE_MIN, SQ, capU, lvFull, lvName } from '../rules/03-services.js';
import { CARDE, CARDN, CATS, COMBOS, INC, REI, comboOpen, roleOf, rsRate, slotOpen, viaOf } from '../rules/04-roles-combos-cards.js';
import { dlcOn } from '../rules/05-dlc.js';
import { F, P, S, active, comboMiss, cur, debtOf, hasCombo, lapFx, logBody, logRow, ownedBy, ownsGroup, wildFits, wildFree, wildOf, wildTargets, winWA } from '../engine/07-state.js';
import { cardAmt } from '../engine/08-money.js';
import { commitsOf, netWorth, opCost, runCost, valBreak, valTip, valuation } from '../engine/08c-costs.js';
import { canOnline, capInfo, chainTxt, downWhy, offRounds, spotMine, turnKey, upgradeInfo } from '../engine/09-rent.js';
import { mainBtn, sameEl, viewOpen } from './10-modal.js';
import { capUpTxt, lvUpTxt } from '../engine/11b-rent-info.js';
import { jailMax, mspFee } from '../engine/13-move.js';
import { landHere } from '../engine/15-land.js';
import { refactorCost, rfJailTxt, rfJailed } from '../engine/17-health.js';
import { BURY_PICK, buryOk, handOf, handOk, handWalked, incSendCost, incSendOk, reiBuyCost, reiLeft, trapsOf } from '../engine/18-reinvent.js';
import { canSkill, skillLine, skillMulTxt } from '../engine/21-skills.js';
import { SPEED, SPEED_MAX } from '../engine/22-speed.js';
import { CHA_COST, CHA_WIN, CH_COST, CH_WIN, canChallenge, canChallengeAll, chFoes, chaWait } from '../engine/25-trade.js';
import { PILLARS, pillarNeed, pillarScore, pillarTotal, pillarWhy, pillars, waDone, waRuleText, waTotalNeed } from '../engine/26a-pillars-win.js';
import { finSub } from './26c-report.js';
import { hereHtml } from './27a-board.js';
import { archMini, fmtTime, pillarPop, renderBoard, renderCenter, timeLeft } from './27c-center.js';
import { toast } from './28-setup-save.js';
import { isHell } from '../rules/35-modes.js';
import { aiKick, isAI } from '../engine/36-ai.js';
import { cheatBtns } from './38b-cheat-ui.js';
import { MP } from '../net/40-host-sync.js';
let tipEl = null;
// 架构、支柱的悬停小卡。键盘 Tab 到侧栏里的支柱、架构、带说明的字时也弹（focusin），离开就收；矮屏时小卡夹在视口里，不出上下边
function tipShow(t) {
  document.querySelectorAll('.pillar.hot').forEach(x => { if (x !== t) x.classList.remove('hot'); });
  if (t && t.dataset.pillar != null) t.classList.add('hot');
  if (!t) { if (tipEl) tipEl.hidden = true; return; }
  if (!tipEl) { tipEl = document.createElement('div'); tipEl.id = 'archtip'; document.body.appendChild(tipEl); }
  const p = S && S.players[+t.dataset.p];
  if (t.dataset.pillar != null) { if (!p) return; const k = t.dataset.pillar; tipEl.innerHTML = zhs(k === 'sum' ? pillarSumPop(p) : pillarPop(p, k === 'tot' ? 'tot' : +k)); }
  else if (t.dataset.archall != null) { if (!p) return; tipEl.innerHTML = zhs(archAllPop(p)); }
  else if (t.dataset.arch != null) { const c = COMBOS.find(x => x.id === t.dataset.arch); tipEl.innerHTML = zhs(archMini(c, p)); }
  else { tipEl.innerHTML = '<div class="ppop"></div>'; tipEl.firstChild.textContent = t.title; }
  tipEl.hidden = false; tipEl._at = t; tipEl.style.pointerEvents = tipEl.querySelector('.amini') ? 'auto' : 'none';
  // 放在那行字下面，下面放不下放上面；上下都放不下（手机横屏 844×390 这类矮屏）就放到那张玩家卡的旁边（左边放不下放右边），不盖住下一张卡。始终夹在屏幕里
  const r = t.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight, W = window.innerWidth, H = window.innerHeight;
  let left = Math.max(8, Math.min(W - w - 8, r.left)), top;
  if (r.bottom + h + 12 < H) top = r.bottom + 6;
  else if (r.top - h - 6 >= 8) top = r.top - h - 6;
  else { // 卡旁边放不下（卡占满屏宽）就放在那行字旁边，上下不超出这张卡
    const c = (t.closest('#side .pl') || t).getBoundingClientRect(), fit = x => x >= 8 && x + w <= W - 8;
    top = r.top + r.height / 2 - h / 2; if (h <= c.height) top = Math.max(c.top, Math.min(c.bottom - h, top));
    left = fit(c.left - w - 10) ? c.left - w - 10 : fit(c.right + 10) ? c.right + 10 : fit(r.right + 10) ? r.right + 10 : fit(r.left - w - 10) ? r.left - w - 10 : left; }
  tipEl.style.left = left + 'px';
  tipEl.style.top = Math.max(8, Math.min(H - Math.min(h, H - 16) - 8, top)) + 'px';
}
// 玩家栏里的架构、支柱：鼠标停 280ms 再出，滚轮翻侧栏、鼠标划过时不会一路弹出来盖住正在看的卡；已经开着一张时换一条马上换。
// 棋盘、格子面板里的照旧马上出；触屏（没有悬停）点一下马上出
let TIP_T = 0;
document.addEventListener('mouseover', e => {
  const t = e.target.closest && e.target.closest('[data-arch], [data-pillar], [data-archall]');
  clearTimeout(TIP_T);
  if (!t) {
    if (tipEl && !tipEl.hidden && tipEl.contains(e.target)) return;   // 鼠标进了架构小卡：留着，好看每一块干什么
    const f = document.activeElement; if (tipEl && f && f === tipEl._at && f.matches(':focus-visible')) return;
    if (tipEl && !tipEl.hidden && tipEl.querySelector('.amini')) { TIP_T = setTimeout(() => { if (!tipEl.matches(':hover')) tipShow(null); }, 220); return; }
    tipShow(null); return; }
  if (tipEl && !tipEl.hidden && tipEl._at === t) return;
  if (t.closest('#side') && matchMedia('(hover:hover)').matches && (!tipEl || tipEl.hidden)) { TIP_T = setTimeout(() => { if (t.isConnected && t.matches(':hover')) tipShow(t); }, 280); return; }
  tipShow(t);
});
document.addEventListener('focusin', e => { const t = e.target.closest && e.target.closest('#side :is([data-arch], [data-pillar], [data-archall], .tipx[title])'); if (t && t === e.target && t.matches(':focus-visible')) { clearTimeout(TIP_T); tipShow(t); } });
document.addEventListener('focusout', e => { if (tipEl && !tipEl.hidden && tipEl._at === e.target) { tipEl.hidden = true; e.target.classList.remove('hot'); } });
// 小卡是 position:fixed，触屏点出来后一滚动就和那行字分开、盖在玩家卡上；那行字跟着滚走了就收起。
// 只认整页和包着那行字的容器：日志自己滚、侧栏重画时写回滚动位置都不算，电脑上鼠标停着时小卡不会一闪就没
addEventListener('scroll', e => { if (tipEl && !tipEl.hidden && (e.target === document || (e.target.contains && e.target.contains(tipEl._at)))) tipEl.hidden = true; }, { passive: true, capture: true });
// 触屏没有悬停，title 弹不出来：点一下带说明的文字（保留卡、技术债、支柱、奖池…）用 toast 念出来。
// 本来就能点的（按钮、格子、开局页选项、点了会展开收起的那一行）不管，免得点一下出两样东西；支柱的说明带换行，toast 只认纯文本，换成分号
document.addEventListener('click', e => {
  if (!matchMedia('(hover:none)').matches) return;
  const t = e.target.closest && e.target.closest('[title]');
  if (t && t.title.length > 6 && !t.closest('button, a, input, select, summary, label, .sq, [onclick], [data-act], [role=button]')) toast(t.title.replace(/\n/g, _t(408, "；")), 6000);
});
// 玩家卡头部整行点了会展开收起，里面带说明的字（估值、欠款、代理商）在上一条里会被跳过：侧栏里标了 .tipx 的字在捕获阶段先拦下来，只念说明、不折卡
document.addEventListener('click', e => {
  if (!matchMedia('(hover:none)').matches) return;
  const t = e.target.closest && e.target.closest('#side .tipx[title]');
  if (!t || e.target.closest('button')) return;
  e.stopPropagation(); toast(t.title.replace(/\n/g, _t(408, "；")), 6000);
}, true);
export function lastCardHtml() {
  const c = S.lastCard;
  if (!c) return _t(4181, "<div class=\"lastcard muted\">还没有人抽过卡</div>");
  if (c.id == null) return _tf(5434, "<div class=\"lastcard {$0}\"><small>最近抽到 · {$1}</small><b>re:Invent</b><span>没公开（只有他自己看得到）</span></div>", c.kind, P(c.who).name);   // 自己抽的 re:Invent 卡还没亮出来（peekCard）
  const d = c.kind === 'inc' ? INC[c.id] : REI[c.id];
  return _tf(4182, "<div class=\"lastcard {$0}\"><small>最近抽到 · {$1}</small><b>{$2}</b><span>{$3}</span></div>", c.kind, P(c.who).name, d.n, d.e.replace(_tr(2747, "^保留：", ""), ''));
}
// 中间右栏：这回合还能做什么（现金在回合条和玩家卡上已经有了，这里不重复）
export function playerBrief(p) {
  // 结束后右栏：怎么结束的，下面是赢家的估值一项一项列出来（中间写的是估值，右边玩家卡上写的是现金，两个数对不上时看这里）
  if (S.phase === 'over') {
    const w = S.winner != null ? P(S.winner) : null, h = _tf(4183, "<h4>本局结束</h4><div class=\"briefline\">{$0}</div>", finSub(w, S.overWhy || ''));
    if (!w) return h;
    const v = valBreak(w), r = (n, x) => `<tr><th scope="row">${n}</th><td>${usd(x)}</td></tr>`;
    return h + `<h4 class="fv-h">${_tf(4184, "{$0} 的估值", w.name)}</h4><table class="fval"><caption class="sr-only">${_tf(4185, "{$0} 的估值拆分", w.name)}</caption><tbody>${r(_t(3753, "现金"), v.cash)}${r(_t(3729, "服务"), v.svc)}${r(_t(3832, "升级和容量 ×2"), v.inv * 2)}${r(_t(2607, "架构"), v.arch)}${r(_t(3754, "复盘"), v.coe)}${r(_t(3755, "技术债"), -v.debt)}</tbody><tfoot>${r(_t(3714, "估值"), v.val)}</tfoot></table>`;
  }
  const me = !isAI(p.id) && S.phase !== 'over', idle = me && (S.phase === 'roll' || S.phase === 'post');
  const btn = (label, on, ok = true, tip = '') => me ? `<button class="sm" data-fk="cr:uiAction(${on})" ${idle && ok ? '' : 'disabled'} data-act="uiAction" data-arg="${on}"${tip ? ` title="${esc(tip)}"` : ''}>${label}</button>` : '';
  // 按钮包一层：字和按钮挤不下时按钮整组换到下一行，字不再被挤成一个字一行（两个按钮的「出题考对手」那行）
  const row = (t, b = '', cls = '') => `<div class="todo ${cls}"><span>${t}</span>${b ? `<span class="tb">${b}</span>` : ''}</div>`;
  const out = [];
  if (rfJailed(p)) out.push(row(rfJailTxt(), '', 'hot'));
  else if (p.jail !== null) out.push(row(_tf(5681, "在维护窗口里：付 ${$1} 马上出来、照常掷骰子，或者停{$0}轮再出来", jailMax(p) > 1 ? _tf(4186, "满 {$0} ", jailMax(p)) : _t(2874, "一"), BAL.jailFee), '', 'hot'));
  else if (S.phase === 'roll') out.push(row(S.again ? _t(4188, "掷出了对子，再掷一次") : _t(4189, "先掷骰子"), '', 'hot'));
  const lh = S.phase === 'post' ? landHere(p) : null;
  if (lh != null) {
    const u = upgradeInfo(p, lh, true), c = capInfo(p, lh);
    if (u.ok || c.ok) out.push(row(_tf(4193, "停在自己的 {$0} 上，还能做一件事{$1}{$2}", SQ[lh].n, u.ok ? _tf(4190, "：升到{$0}（${$1}）", lvFull(lh, u.next), u.total) : '', c.ok ? _tf(4192, "{$0}加 1 个{$1}（${$2}）", u.ok ? _t(4191, "，或者") : _t(2670, "："), capU(SQ[lh].k), c.cost) : ''),
      (u.ok ? btn(_t(3848, "升级"), 'upHere', p.cash >= u.total, _tf(4195, "什么时候能点：这一回合落在自己的服务上，落地那一件事还没做。\n点了：花 ${$0} 升到{$1}：{$2}{$3}", u.total, lvFull(lh, u.next), lvUpTxt(lh, u.next), p.cash < u.total ? _tf(4194, "\n你现在只有 ${$0}，不够", p.cash) : '')) : '')
      + (c.ok ? btn(_t(4196, "加容量"), 'capHere', p.cash >= c.cost, _tf(4197, "什么时候能点：这一回合落在自己的服务上，落地那一件事还没做。\n点了：花 ${$0} 加 1 个{$1}（这是容量，不是升级）：{$2}{$3}", c.cost, capU(SQ[lh].k), capUpTxt(lh), p.cash < c.cost ? _tf(4194, "\n你现在只有 ${$0}，不够", p.cash) : '')) : '')));
  } else if (S.phase === 'post' && ownedBy(p).some(i => SQ[i].upg && S.props[i].level < 3 && !S.props[i].spot)) {
    const la = S.landAct, done = la && la.used && la.k === turnKey() && la.p === p.id && p.pos === la.i;
    out.push(row(done ? _tf(4198, "这回合落在 {$0} 上的那一件事已经做了（每次落在自己的服务上只能做一件：升一级、加容量或用 FIS）", SQ[la.i].n) : _t(4199, "升级：要落在自己的服务上才能升，这回合没停在自己的服务上"), '', 'dim'));
  }
  const caps = ownedBy(p).filter(i => SQ[i].t === 'prop' && ownsGroup(p, SQ[i].g) && capInfo(p, i).ok && p.cash >= capInfo(p, i).cost);
  if (caps.length && lh == null) out.push(row(_tf(4200, "可以加容量：{$0}", caps.slice(0, 3).map(i => SQ[i].n).join(_t(349, "、"))), btn(_t(4054, "资产管理"), 'manage')));
  // 重新上线不要钱、也不在资产管理里点了（落到那一格就拉起来，满 OFFLINE_MIN 轮自动恢复），所以这里不再列
  const r = roleOf(p);
  if (r.sk && !p.skillUsed) out.push(canSkill(p) ? row(_tf(4202, "专属技能「{$0}」可以发动了{$1}", r.sk.n, skillMulTxt(p)), btn(_t(4203, "发动"), 'useRoleSkill'), 'hot') : row(_tf(4204, "<span class=\"muted\">技能「{$0}」：总资产低于 ${$1} 时可用</span>", r.sk.n, skillLine(p))));
  if (dlcOn('speed')) { const n = SPEED.filter(x => !x.react && p.speed >= x.c && !x.ok(p, S.phase)).length; if (n) out.push(row(_tf(4205, "部署点数 {$0} 点，能发动 {$1} 个技能", p.speed, n), btn(_t(4206, "部署点数"), 'speedMenu'))); }
  if (F.debt() && p.techDebt > 0) out.push(row(_tf(4207, "技术债 {$0} 个，重构清 1 个要 ${$1}", p.techDebt, refactorCost(p)), btn(_t(4208, "清技术债"), 'refactorDebt', p.cash >= refactorCost(p))));
  if ((S.phase === 'roll' || S.phase === 'post') && p.jail === null && !S.reiBought && reiLeft() && p.cash >= reiBuyCost(p)) out.push(row(_tf(4209, "花 ${$0} 抽 re:Invent 卡", reiBuyCost(p)), btn(_t(3457, "抽卡"), 'buyReinvent')));
  if ((S.phase === 'roll' || S.phase === 'post') && handOk(p)) out.push(row(_tf(5435, "手牌 {$0} 张：打出、卖掉，或者弃牌往前走 1–3 格{$1}", handOf(p).length, handWalked(p) ? _t(5436, "（弃牌走格子这回合已经用过）") : _t(5437, "（每回合一次）")), btn(_tf(5438, "手牌（{$0}）", handOf(p).length), 'reiHand')));
  if ((S.phase === 'roll' || S.phase === 'post') && incSendOk(p)) { const one = incSendCost(p), n = chFoes(p).length;
    const tip = w => _tf(4210, "什么时候能点：自己的回合里，掷骰子前后都行；每走一圈只能发一次（经过 Startup 扶持以后才能再发）。\n{$0}价钱是你抽 re:Invent 卡的 1.5 倍，跟着总资产涨；对方抽到的卡照常结算，能用 Enterprise Support 抵消。", w);
    out.push(row(_tf(4212, "花 ${$0} 让对手抽一张 Health 卡（每圈一次）{$1}", one, n >= 2 ? _tf(4211, "；付 ${$0} 让每位对手各抽一张", one * 2) : ''),
      btn(n >= 2 ? _t(4213, "指定一人") : _t(4214, "发给他"), 'incOne', p.cash >= one, tip(_tf(4216, "点了：{$0}花 ${$1} 让他抽一张 Health 卡。", n >= 2 ? _t(4215, "选一位对手，") : '', one)))
      + (n >= 2 ? btn(_t(4217, "随机一人"), 'incRand', p.cash >= one, tip(_tf(4218, "点了：花 ${$0}，随机挑一位对手抽一张。", one))) + btn(_tf(4219, "全场（${$0}）", one * 2), 'incAll', p.cash >= one * 2, tip(_tf(4220, "点了：花 ${$0}，从你的下一位开始，每位对手各抽一张。", one * 2))) : ''))); }
  if ((S.phase === 'roll' || S.phase === 'post') && buryOk(p)) { const one = incSendCost(p);
    out.push(row(_tf(5697, "花 ${$0} 埋一张 Health 卡在这一回合刚走过的服务格上，谁停上去就翻开（自己也算；每回合一次{$1}）", one, trapsOf(p).length ? _tf(5683, "；你已经埋了 {$0} 张", trapsOf(p).length) : ''),
      btn(_t(5653, "埋卡"), 'buryIncident', p.cash >= one, _tf(5698, "什么时候能点：自己的回合里走完以后（这一回合走过的服务格才能埋），每回合一次。\n点了：花 ${$0} 从 Health 牌堆顶翻 {$1} 张挑一张扣着，在这一回合走过的服务格（路过、停下都算）里挑一块埋下去。谁停在那一格（经过不算）就翻开照常结算，你自己停上去也一样。埋在哪、是哪张只有你知道；场上埋几张不限。", one, BURY_PICK)))); }
  if ((S.phase === 'roll' || S.phase === 'post') && p.chTurn !== turnKey() && chFoes(p).length && (!p.chUsed || chFoes(p).length >= 2)) { const n = chFoes(p).length, all = n >= 2, w = chaWait(p);
    const oneTip = _tf(4222, "什么时候能点：自己的回合里，掷骰子前后都行；每局只能用一次，同一回合和考全场只能发动一个；现金至少 ${$0}{$1}。\n怎么用：选一位对手，按他所在那一格的色组从题库出一题，他在自己的设备上答。答对他拿走你 ${$2}，答错他赔你 ${$3}。不受卡牌倍率影响。", CH_COST, p.cash < CH_COST ? _tf(4221, "，你现在只有 ${$0}", p.cash) : '', CH_COST, CH_WIN);
    const allTip = _tf(4224, "什么时候能点：自己的回合里，至少两位对手；每 3 圈能用一次（按你经过 Startup 扶持的次数算，开局就能用一次）{$0}；同一回合和考一个人只能发动一个；现金至少 ${$1}（每位对手 ${$2}）{$3}。\n怎么用：从你的下一位开始按座位顺序，每位对手各答一道题。答对的拿走你 ${$4}，答错的赔你 ${$5}。不受卡牌倍率影响。", w ? _tf(4223, "，你还要再经过 {$0} 次", w) : '', CHA_COST * n, CHA_COST, p.cash < CHA_COST * n ? _tf(4221, "，你现在只有 ${$0}", p.cash) : '', CHA_COST, CHA_WIN);
    out.push(row(all ? _tf(4228, "出题考对手（同一回合只能发动一个）：考一个人每局一次{$0}；考全场每 3 圈一次，每人 ${$1}，答对拿走、答错赔你 ${$2}{$3}", p.chUsed ? _t(4225, "（已经用过）") : _tf(4226, "，${$0}，答对他拿走、答错赔你 ${$1}", CH_COST, CH_WIN), CHA_COST, CHA_WIN, w ? _tf(4227, "（还要再经过 {$0} 次 Startup 扶持）", w) : '') : _tf(4229, "花 ${$0} 出题考一位对手（每局一次）：答对他拿走 ${$1}，答错他赔你 ${$2}", CH_COST, CH_COST, CH_WIN),
      (!p.chUsed ? btn(all ? _t(4230, "考一个人") : _t(4231, "出题"), 'quizChallenge', canChallenge(p), oneTip) : '')
      + (all ? btn(w ? _tf(4232, "考全场（还差 {$0} 圈）", w) : _tf(4233, "考全场（${$0}）", CHA_COST * n), 'quizAll', canChallengeAll(p), allTip) : ''))); }
  const near = COMBOS.filter(comboOpen).filter(c => !hasCombo(p, c.id)).map(c => ({ c, miss: comboMiss(p, c) })).filter(x => x.miss.length === 1).slice(0, 2);
  near.forEach(x => out.push(row(_tf(4234, "<span data-arch=\"{$0}\" data-p=\"{$1}\" style=\"cursor:help\">「{$2}」只差 {$3}</span>", x.c.id, p.id, x.c.n, slotOpen(x.miss[0]).map(i => SQ[i].n).join(_t(1815, " 或 "))))));
  const wpair = (S.phase === 'roll' || S.phase === 'post') ? wildFree(p).flatMap(w => wildTargets(p).filter(x => wildFits(w, x.c)).map(t => ({ w, t }))).sort((a, b) => b.t.miss.length - a.t.miss.length)[0] : null;
  if (wpair) { const { w, t } = wpair;
    out.push(row(_tf(4236, "万能服务 {$0} 还没用：可以{$1}", SQ[w].n, t.miss.length ? _tf(4235, "补上「{$0}」缺的那块", t.c.n) : _tf(1817, "并进「{$0}」", t.c.n)), btn(_t(4237, "用万能服务"), 'wildDialog'), t.miss.length ? 'hot' : '')); }
  if (winWA()) { const ps = pillars(p), lack = PILLARS.filter((_, k) => !ps[k]); out.push(row(lack.length ? _tf(4238, "六大支柱还差：{$0}", lack.join(_t(349, "、"))) : (waDone(p) ? _t(4239, "六大支柱都达成了") : _tf(4240, "六大支柱总分还差 {$0} 分", waTotalNeed() - pillarTotal(p))))); }
  if (out.length < 2 && S.phase === 'post') out.push(row(_t(4241, "没有别的要做了，可以轮到下一位")));
  return `<h4>${_tf(4242, "{$0} 这回合还能做什么", p.name)}</h4>
    <div class="briefline">${_tf(4243, "总资产 <b>${$0}</b> · 每圈运行费 <b>${$1}</b> · {$2} 块服务", netWorth(p), opCost(p), ownedBy(p).length)}</div>
    ${out.join('')}`;
}
// 右侧栏是给人手动翻看的：3 人以上时玩家卡默认收起，点名字那一行展开 / 收起，不跟着回合变；重绘时保留玩家卡和日志的滚动位置（只影响本机显示）
// 卡片高度不跟着「轮到谁」、鼠标悬停变：架构进度、角色说明每张卡一样显示；角色说明平时只有一行，点「能力 · 弱点 · 技能」那一行才展开全文（PL_ROLE，也只在本机）
export const PL_OPEN = new Set(), PL_ROLE = new Set();
export function togglePl(id) { PL_OPEN.has(id) ? PL_OPEN.delete(id) : PL_OPEN.add(id); renderSide(); }
export function toggleRole(id) { PL_ROLE.has(id) ? PL_ROLE.delete(id) : PL_ROLE.add(id); renderSide(); }
// 回合条上点某位玩家：展开他的卡、滚到眼前。桌面只滚右边的玩家列表；平板、手机侧栏排在页面最下面，滚整页
export function jumpPl(id) {
  if (!S || !S.players[id]) return;
  if (S.players.length >= 3 && !PL_OPEN.has(id)) { PL_OPEN.add(id); renderSide(); }
  const el = document.querySelectorAll('#side .pl')[id], pl = el && el.closest('.plist'); if (!el) return;
  if (pl && pl.scrollHeight > pl.clientHeight + 1 && getComputedStyle(pl).overflowY === 'auto') pl.scrollTop += el.getBoundingClientRect().top - pl.getBoundingClientRect().top - 6;
  else el.scrollIntoView({ block: 'start' });
}
// 侧栏几个滚动区的位置。render() 在改棋盘之前先读：那时布局还是干净的，读 scrollTop 不会逼浏览器先把改过的棋盘重新排一遍
const SIDE_SCR = ['.plist', '.logpanel .gb', '.log'];
// 再记下视口里第一张玩家卡离顶边多远：重画后按这张卡对齐，上面的卡变高变矮时眼前这张不跳。
// 桌面滚的是玩家列表；平板、手机侧栏排在页面里，只在已经往下翻进侧栏时按整页算（还在看棋盘时不动整页）
function sideAnchor(side) {
  const pl = side.querySelector('.plist'), cards = side.querySelectorAll('.pl'); if (!pl || !cards.length) return null;
  if (pl.scrollTop > 0) { const top = pl.getBoundingClientRect().top; for (let k = 0; k < cards.length; k++) { const r = cards[k].getBoundingClientRect(); if (r.bottom > top) return { k, off: r.top - top }; } return null; }
  if (side.getBoundingClientRect().top >= 0) return null;
  for (let k = 0; k < cards.length; k++) { const r = cards[k].getBoundingClientRect(); if (r.bottom > 0) return r.top < innerHeight ? { k, off: r.top, win: true } : null; }
  return null;
}
const sideScroll = () => { const side = $('#side'), k = SIDE_SCR.map(q => { const el = side && side.querySelector(q); return el ? el.scrollTop : 0; }); k.anchor = side ? sideAnchor(side) : null; return k; };
// SIDE_CUR：上次画的时候轮到谁（换人时把他的卡滚进玩家列表的可视区）；SIDE_LOG0：日志第一行是哪条（往下翻旧日志时，新日志插在上面不把内容往下推）
let SIDE_CUR = null, SIDE_LOG0;
// 每套架构的进度：凑了几块、还缺哪几块，生效的在前，其次按完成比例
const archProg = p => COMBOS.filter(comboOpen).map(c => {
  const have = c.ix.filter(n => (Array.isArray(n) ? n : [n]).some(i => active(p, i)));
  if (!have.length) return null;
  const lack = c.ix.filter(n => !have.includes(n)), w = wildOf(p, c.id), wf = w != null && lack.length === 1;   // 万能服务顶上缺的那一块，算生效（和 hasCombo 一致）
  const nmOf = n => slotOpen(n).map(i => SQ[i].n).join(_t(1815, " 或 ")), miss = wf ? [] : lack.map(nmOf);
  return { c, done: !miss.length, n: have.length + (wf ? 1 : 0), t: c.ix.length, miss, w: w ?? null, fill: wf ? nmOf(lack[0]) : '' };
}).filter(Boolean).sort((a, b) => b.done - a.done || b.n / b.t - a.n / a.t);
// 名字、架构名夹在中文句子里：两边都是汉字时不留空格（「到韩叔下回合开始恢复」），挨着英文、数字的照常留一个（「被 Damo DDoS」「到 Yuki 下回合」）。
// 只去掉「汉字 空格 汉字」中间的空格，中间隔着标签（nm() 的 <b>、能悬停的架构名）也算挨着；换行缩进、别的空格不动。玩家卡、格子面板的状态、悬停小卡用
const ZH = '[\\u3400-\\u9fff\\u3000-\\u303f\\uff01-\\uff60]', ZH_SP = new RegExp(`(${ZH})((?:</[a-z]+>)*) +((?:<[a-z][^<>]*>)*)(?=${ZH})`, 'g');
export const zhs = h => String(h).replace(ZH_SP, '$1$2$3');
// 一块服务现在的特殊状态：head + t 是一句规则（玩家卡图标的提示、点格子面板的状态行都用这一句），按要紧程度排
// 玩家卡名字旁边的 ✎：这台设备能改的人才有（联机远端只能改自己，观众不能改；房主和同屏能改本机的真人座位，电脑不改）
const canRename = p => !!S && !S.over && p.alive && (MP.role === 'client' ? !MP.watching && p.id === MP.mySeat : !MP.isRemote(p.id) && !isAI(p.id));
export function svcState(i) {
  const s = SQ[i], pr = S.props[i], o = pr.owner == null ? null : P(pr.owner), who = o ? o.name : _t(2842, "主人"), out = [];
  if (pr.ddos != null && P(pr.ddos)) { const a = P(pr.ddos); out.push({ k: 'ddos', head: pr.ddosWhy ? _tf(5393, "因「{$0}」下线", downWhy(pr)) : _tf(4244, "被 {$0} DDoS", a.name), t: _tf(4245, "不收过路费，运行费照交，也不算持有（不凑整组、架构和支柱），{$0} 再轮到 {$1} 次时恢复", a.name, pr.ddosLeft || 1) }); }
  // 下线就是地产类桌游里的抵押：规则书第 10 节。这次拿回的一半记在 offCash（Spot 按出价的一半），不用还；同一个主人累计拿了多少记在 offDrawn
  if (pr.offline) { const n = pr.offline - 1, st = runCost(i), half = pr.offCash || 0;
    out.push({ k: 'off', head: n > 0 ? _tf(4246, "已下线 {$0} 轮", n) : _t(4247, "刚下线"), t: _tf(4251, "相当于抵押（只有 EC2、RDS、Aurora、Redshift、ECS 能下线），下线时拿回了一半价钱 ${$0}，不用还。下线期间不收过路费，也不算持有（不凑整组、架构和支柱），{$1}；下线 {$2} 轮后自动恢复{$3}，{$4} 落到这一格可以提前免费拉起来；没恢复前别人落上来，付原价 ${$5} 给亚马逊云科技就能买走，{$6} 不再拿钱", half, st ? _tf(4248, "运行费只交存储费 ${$0}/圈", st) : _t(4249, "运行费也不用交"), OFFLINE_MIN, canOnline(i) ? '' : _tf(4250, "（现在第 {$0} 轮）", offRounds(i)), who, s.p, who) }); }
  if (pr.impaired) out.push({ k: 'imp', head: 'Impaired', t: _tf(4252, "暂停收过路费，到 {$0} 下回合开始恢复", who) });
  if (pr.spot) out.push({ k: 'spot', head: spotMine(i) ? _tf(2703, "Spot 出价 ${$0}", pr.spotPaid) : 'Spot', t: spotMine(i) ? _t(4253, "别人猜的价比你多出原价 10% 就能抢走") : _t(4254, "出价多少看不到，猜得够高就能抢走") });
  out.forEach(x => { x.head = zhs(x.head); x.t = zhs(x.t); });
  return out;
}
// 图标分组：一块只归一组，按要紧程度 DDoS > 下线 > Impaired > Spot（别的状态照样写在这块图标自己的提示里）。组前那个字悬停、点一下看说明
const svGrp = i => { const pr = S.props[i]; return pr.ddos != null && P(pr.ddos) ? (pr.ddosWhy ? 'off' : 'ddos') : pr.offline ? 'off' : pr.impaired ? 'imp' : pr.spot ? 'spot' : ''; };
let SV_GRP = __rv(() => ({
  off: [_t(4255, "下线"), _t(4256, "下线就是抵押：只有 EC2、RDS、Aurora、Redshift、ECS 能下线，下线时拿回买价的一半（Spot 按出价），这笔钱不用还。下线期间不收过路费，也不算持有（不凑整组、架构和支柱），运行费只交存储费；下线固定 3 轮，满 3 轮在主人回合开始时自动恢复，主人自己落到这一格可以提前免费拉起来；没恢复前别人落上来，付原价给亚马逊云科技就能买走，主人不再拿钱")],
  imp: ['Impaired', _t(4257, "Impaired：暂停收过路费，到主人下回合开始时恢复")],
  ddos: ['DDoS', _t(4258, "被 DDoS：不收过路费，运行费照交，也不算持有（不凑整组、架构和支柱），到攻击的人第 2 个自己的回合开始时恢复")],
  spot: ['Spot', _t(4259, "Spot：按出价买的，别人落上来出价比你多出原价的 10% 就能抢走（抢的人不付这次的过路费，你拿回出价的一半）；不能升级、不能加容量")],
}), v => { SV_GRP = v; }, () => SV_GRP);
// 架构里每一环的图标：有的亮、缺的灰；万能服务顶上缺的那一环换成它的图标（加框），只是并进来的接在最后
function archIcons(p, x) {
  const im = (i, cls, t) => `<img src="${AWSI[SQ[i].icon]}" alt="" class="${cls}" title="${SQ[i].n}${t}">`;
  let used = false;
  const out = x.c.ix.map(n => { const l = Array.isArray(n) ? n : [n], h = l.find(i => active(p, i)); if (h != null) return im(h, '', ''); const o = slotOpen(n)[0] ?? l[0];
    if (x.fill && !used) { used = true; return im(x.w, 'wild', _tf(4260, "（万能服务，顶上缺的 {$0}）", SQ[o].n)); } return im(o, 'miss', _t(4261, "（还缺）")); });
  if (x.w != null && !used) out.push(im(x.w, 'wild', _t(4262, "（万能服务，并进来一起收）")));
  return `<span class="ppico">${out.join('')}</span>`;
}
// 悬停「全部 N 套」：每套架构凑了几块、还缺什么
function archAllPop(p) {
  const prog = archProg(p), near = prog.filter(x => x.done || x.n >= 2 || x.miss.length === 1), list = (near.length ? near : prog).slice(0, near.length ? 10 : 6), rest = prog.length - list.length;
  return _tf(4270, "<div class=\"ppop\"><div class=\"pph\"><b>{$0} 的架构</b><span class=\"pps\">{$1} 套生效</span></div>{$2}{$3}</div>", p.name, prog.filter(x => x.done).length, list.length ? `<ul class="ppl">${list.map(x => `<li><span class="pt">${x.c.n} ${x.n}/${x.t}${archIcons(p, x)}<small>${x.done ? _tf(4266, "已生效{$0}，别人落在其中任一块按整套联合收费{$1}", x.w == null ? '' : x.fill ? _tf(4263, "（万能服务 {$0} 顶上了缺的 {$1}）", SQ[x.w].n, x.fill) : _tf(4264, "（万能服务 {$0} 并进来一起收）", SQ[x.w].n), (t => t ? _tf(4265, "；{$0}，落在共用的那块上几套串在一起收", t) : '')(chainTxt(p, x.c))) : _tf(4267, "还缺 {$0}", x.miss.join(_t(349, "、")))}</small></span></li>`).join('')}</ul>` : '', rest ? _tf(4269, "<p class=\"ppmore\">另有 {$0} 套{$1}，看「明细和日志」</p>", rest, near.length ? _t(4268, "只凑了 1 块") : '') : '');
}
// 收起的卡上「支柱 x/6 达成」：六条各几分
function pillarSumPop(p) {
  const need = pillarNeed(), sc = pillarScore(p), n = sc.filter(v => v >= need).length;
  return `<div class="ppop"><div class="pph">${_tf(4273, "<b>六大支柱</b><span class=\"pps\">{$0}/6 达成</span><span class=\"ppst {$1}\">{$2}</span>", n, waDone(p) ? 'ok' : '', waDone(p) ? _t(4171, "已经够了") : _tf(4271, "每条要 {$0} 分", need))}</div><ul class="ppl">${PILLARS.map((x, k) => `<li><span class="pt">${x}</span><b class="pg"${sc[k] >= need ? '' : ' style="color:var(--mut)"'}>${sc[k]}/${need}</b></li>`).join('')}</ul><p class="pprule">${_tf(4274, "本局要求：{$0}{$1}", waRuleText(), waTotalNeed() ? _tf(4272, "；现在总分 {$0}", pillarTotal(p)) : '')}</p><p class="ppmore">${_t(4275, "展开卡片，悬停每条支柱看怎么补")}</p></div>`;
}
const zheTxt = r => r >= 1 ? _t(1512, "原价") : LANG === 'en' ? `${100 - Math.round(r * 100)}% off` : LANG === 'ja' ? `${100 - Math.round(r * 100)}%オフ` : _tf(2705, "{$0} 折", Math.round(r * 100) % 10 ? Math.round(r * 100) : Math.round(r * 10));
const cmTxt = cm => cm.map(c => c.type === 'sp' ? _tf(4276, "Savings Plans 每圈承诺 ${$0}（还剩 {$1} 圈）", c.amt, c.laps) : _tf(4277, "{$0} RI 免 ${$1} 运行费（还剩 {$2} 圈）", SQ[c.svc].n, c.amt, c.laps)).join(_t(349, "、"));
function plCard(p, mine, offSeats) {
  const r = roleOf(p), isCur = p.id === S.cur && S.phase !== 'over', dead = !p.alive;
  const fold = S.players.length >= 3, mini = fold && !PL_OPEN.has(p.id);
  // 状态行的一项：带说明的加 tabindex（键盘停上来时用 #archtip 念出说明，data-fk 让重画后焦点回到同一项）、触屏点一下 toast；分隔点挂在前一项末尾，不会单独折到下一行行首
  const ri = (h, title = '', cls = '', k = '') => `<span class="ri ${cls}${title ? ' tipx' : ''}"${title ? ` tabindex="0" title="${title}"${k ? ` data-fk="r${p.id}-${k}"` : ''}` : ''}>${h}</span>`;
  const lb = t => `<span class="lb">${t}</span>`;
  const cust = p.reseller ? S.players.filter(q => q.id !== p.id).map(q => ({ q, ix: viaOf(p, q) })).filter(x => x.ix.length) : [];
  // 破产只在卡里写一次「已出局（破产）」；联机掉线和维护窗口、欠款一样是红字，不和「电脑」一样灰
  const tags = [isAI(p.id) ? _t(4278, "电脑") : '', p.reseller ? _tf(4281, "<span class=\"tipx\" tabindex=\"0\" data-fk=\"rs{$0}\" title=\"代理商：转售价 {$1}{$2}\">代理商</span>", p.id, zheTxt(rsRate(p)), cust.length ? _tf(4279, "；客户 {$0}", cust.map(x => x.q.name).join(_t(349, "、"))) : _t(4280, "；还没有客户")) : '',
    (offSeats || []).includes(p.id) ? _t(4282, "<span class=\"warn\">掉线</span>") : ''].filter(Boolean);
  const nameH = fold ? `<button type="button" class="pnm plt" data-fk="pl${p.id}" aria-expanded="${!mini}" aria-controls="plb${p.id}"><span class="pla" aria-hidden="true">${mini ? '▸' : '▾'}</span>${p.name}</button>` : `<span class="pnm">${p.name}</span>`;
  const debtT = p.debt.length ? _tf(4284, "欠 {$0}：要先卖服务或拆升级来还，还不上就破产", p.debt.map(d => `${d.to === 'pot' ? _t(3238, "奖池") : typeof d.to === 'number' && P(d.to) ? P(d.to).name : _t(4283, "亚马逊云科技")} $${d.amt}`).join(_t(349, "、"))) : '';
  const head = `<div class="pacc" ${fold ? `data-act="togglePl" data-arg="${p.id}" title="${mini ? _t(4285, "展开看详情") : _t(4286, "收起")}"` : ''}>${PAWN(p.color)}<div class="pn"><b>${nameH}${canRename(p) ? _tf(5655, "<button type=\"button\" class=\"pren\" data-act=\"renameDialog\" data-arg=\"{$0}\" title=\"改名字\" aria-label=\"给 {$1} 改名字\">✎</button>", p.id, p.name) : ''}${p.id === mine ? _t(4287, "<span class=\"pme\">（你）</span>") : ''}${tags.length ? `<span class="ptags">${tags.join(' · ')}</span>` : ''}${isCur ? _t(4288, "<span class=\"now\">当前回合</span>") : ''}</b><small>${r.n}</small></div>`
    // 估值在收起的卡上写在现金下面；展开的卡（2 人局一直展开）写在下面「总资产 · 估值 · 运行费」那一行里，头部不重复
    + _tf(4290, "<span class=\"cash\"><span class=\"sr-only\">现金</span>${$0}{$1}{$2}</span></div>", p.cash, debtT ? _tf(4289, "<small class=\"pdebt tipx\" tabindex=\"0\" data-fk=\"db{$0}\" title=\"{$1}\">欠 ${$2}</small>", p.id, debtT, debtOf(p)) : '', mini ? `<small class="nw tipx" tabindex="0" data-fk="nw${p.id}" title="${valTip(p)}">${lb(_t(3714, "估值"))} $${valuation(p)}</small>` : '');
  const led = `<button type="button" class="ledbtn" data-fk="led${p.id}" data-act="showLedger" data-arg="${p.id}" title="${_tf(4294, "看 {$0} 每块服务的收费明细和相关日志", p.name)}"${mini ? _tf(4291, " aria-label=\"{$0} 的明细和日志\"", p.name) : ''}>${mini ? _t(4292, "明细") : _t(4293, "明细和日志")}</button>`;
  if (dead) return zhs(_tf(4295, "<div class=\"grp pl dead {$0}\">{$1}<div class=\"gb\" id=\"plb{$2}\"><div class=\"res\"><span class=\"ri pout\">已出局（破产）</span>{$3}</div></div></div>", mini ? 'mini' : '', head, p.id, led));
  // 服务图标：按钮，键盘能 Tab 到、回车打开格子面板，右下角一个角标写级别（蓝）和容量（灰）。每个图标一样宽：
  // 正常的排在前面，有状态的按状态分组（下线、Impaired、DDoS、Spot），组前写一个小字，悬停、点一下看这个状态是什么意思
  const svcBtn = i => {
    const s = SQ[i], pr = S.props[i], st = svcState(i);
    const tt = zhs([s.n + (s.t === 'prop' ? ' · ' + (pr.level ? _tf(4296, "升到第 {$0} 级：{$1}", pr.level, lvName(i, pr.level)) : lvName(i, 0)) : '') + (pr.cap ? _tf(4297, " · 容量 +{$0}（{$1} 个{$2}）", pr.cap, pr.cap, capU(s.k)) : '') + (pr.via != null && P(pr.via) ? _tf(4298, " · 经 {$0} 买的", P(pr.via).name) : ''), ...st.map(x => _tf(838, "{$0}：{$1}", x.head, x.t))].join(_t(2988, "。")));
    return `<button type="button" class="svc ${st.map(x => x.k).join(' ')}" data-fk="sv${i}" title="${tt}" aria-label="${tt}" data-act="showSquare" data-arg="${i}"><span class="svi">${awsImg(s.icon)}${pr.level || pr.cap ? `<span class="svb" aria-hidden="true">${pr.level ? `<b>${pr.level}</b>` : ''}${pr.cap ? `<i>+${pr.cap}</i>` : ''}</span>` : ''}</span></button>`;
  };
  const sg = { '': [], off: [], imp: [], ddos: [], spot: [] }; ownedBy(p).forEach(i => sg[svGrp(i)].push(i));
  const svcs = sg[''].map(svcBtn).join('') + ['off', 'imp', 'ddos', 'spot'].filter(k => sg[k].length).map(k => `<span class="svgrp ${k}"><span class="sgl tipx" tabindex="0" data-fk="sg${p.id}-${k}" title="${SV_GRP[k][1]}">${lb(SV_GRP[k][0])}</span>${sg[k].map(svcBtn).join('')}</span>`).join('');
  // 状态行：只写不是 0 的。要紧的（维护窗口、停几轮）在前，技能能发动时紧跟着写（不能发动的不写，角色那一行有技能名）
  const res = [], kv = [];
  if (p.jail !== null) res.push(ri(_tf(4299, "在维护窗口 {$0}/{$1} 轮", p.jail, jailMax(p)), rfJailed(p) ? rfJailTxt() : _tf(5685, "付 ${$1} 马上出来；或者停满 {$0} 轮自动出来；有 Enterprise Support 卡可以免费出来", jailMax(p), BAL.jailFee), 'warn', 'jail'));
  if (p.skip) res.push(ri(_tf(4301, "停 {$0} 轮", p.skip), _tf(4302, "下 {$0} 个自己的回合直接跳过", p.skip), 'warn', 'skip'));
  if (r.sk && canSkill(p)) res.push(ri(_tf(4304, "{$0}可以发动", lb(_t(4303, "技能"))), _tf(4305, "技能「{$0}」：{$1}{$2}。总资产 ${$3} 已经低于开局资金的一半 ${$4}，一局一次，轮到自己时点「专属技能」；发动后再战略并购：收购总资产最高的对手的一块服务", r.sk.n, r.sk.d, skillMulTxt(p), netWorth(p), skillLine(p)), 'go', 'sk'));
  // 托管费、渠道维护费也是每圈经过起点时交的：展开的卡分开写，收起的卡合成一个数，拆分在提示里
  { const oc = opCost(p), ms = mspFee(p), mf = ms.reduce((a, x) => a + 10 * x.n, 0), cf = p.role === 'rs_dist' ? 50 : 0;
    const why = [...ms.map(x => _tf(4306, "经 {$0} 买的 {$1} 块，每圈付他 ${$2} 托管费", x.r.name, x.n, 10 * x.n)), cf ? _t(4307, "总代理每圈另交 $50 渠道维护费") : ''].filter(Boolean);
    if (mini) { if (oc || mf || cf) res.push(ri(_tf(4308, "{$0} ${$1}/圈", why.length ? lb(_t(3653, "运行费")) : _t(3653, "运行费"), oc + mf + cf), why.length ? [_tf(4309, "运行费 ${$0}", oc), ...why].join(_t(408, "；")) : '', '', 'run')); }
    else {
      // 展开的卡：头部下面一行「总资产 · 估值 · 运行费」。技能条件、战略并购看总资产，排名看估值
      const v = valBreak(p);
      kv.push(ri(`${lb(_t(3843, "总资产"))} <b>$${v.net}</b>`, _tf(4312, "总资产 ${$0} = 现金 ${$1}{$2} + 服务 ${$3} + 升级和容量 ${$4}。{$5}有人发动技能时，先收购总资产最高的那位对手的一块服务（战略并购）", v.net, v.cash, p.debt.length ? _t(4310, "（扣掉欠款）") : '', v.svc, v.inv, r.sk ? _tf(4311, "角色技能要总资产低于开局资金的一半（${$0}）才能发动；", skillLine(p)) : ''), '', 'net'));
      kv.push(`<span class="ri tipx" tabindex="0" title="${valTip(p)}" data-fk="nw${p.id}">${lb(_t(3714, "估值"))} <b>$${v.val}</b></span>`);
      kv.push(ri(_tf(4316, "运行费 <b>${$0}</b>{$1}{$2}{$3}", oc, oc ? _t(4313, "/圈") : '', mf ? ` + ${lb(_t(4314, "托管费"))} <b>$${mf}</b>` : '', cf ? ` + ${lb(_t(4315, "渠道维护费"))} <b>$${cf}</b>` : ''), why.join(_t(408, "；")), '', 'run'));
    } }
  if (F.debt() && p.techDebt > 0) { const u = p.role === 'saas' ? BAL.debtLapSaas : BAL.debtLap; res.push(ri(`${lb(_t(3755, "技术债"))} ${p.techDebt}`, _tf(5708, "被 Health 事件罚到又没防护时欠 1 个：每个让每圈运行费多 ${$0}{$1}；2 个升级每级 +${$2}；3 个要大重构，交 ${$3}（抽 Health 卡时攒满的跟着卡牌倍率涨）；重构清 1 个要 ${$4} × 手上的个数（第 {$5} 轮起 +${$6}）；不管怎么清掉的，都要进维护窗口停一轮、名下服务下线一轮", u, p.role === 'saas' ? _tf(5709, "（SaaS 创业公司，别人是 ${$0}）", BAL.debtLap) : '', BAL.debtUpg, cardAmt(BAL.bigRefactor), BAL.refactorUnit, BAL.refactorLateRound, BAL.refactorLate), '', 'debt')); }
  const mark = (list, name, extra, k) => {
    const u = list.filter(t => !t.used), cats = [...new Set(u.map(t => t.cat))], cn = c => CATS[c] || c;
    return ri(`${lb(name)} ${u.length}${cats.length === 1 && !mini ? _tf(2769, "（{$0}）", cn(cats[0])) : ''}`, _tf(4322, "{$0}{$1}。每个可以抵消一张同类 Health 事件卡{$2}", u.length ? _tf(4319, "没用的 {$0} 个：{$1}", u.length, cats.map(c => `${cn(c)} ×${u.filter(t => t.cat === c).length}`).join(_t(349, "、"))) : _t(4320, "都用掉了"), list.length > u.length ? _tf(4321, "；用掉 {$0} 个", list.length - u.length) : '', extra), '', k);
  };
  if (p.coe.length) res.push(mark(p.coe, _t(4323, "复盘标记"), _t(4324, "；没用的每个估值 +$50"), 'coe'));
  if (p.drill.length) res.push(mark(p.drill, _t(4325, "演练标记"), _t(4326, "；每个也算安全性支柱 +1"), 'drill'));
  if (dlcOn('speed') && p.speed > 0) res.push(ri(`${lb(_t(4206, "部署点数"))} ${p.speed}/${SPEED_MAX}`, _tf(4327, "部署点数：每回合 +1（最多 {$0}），被事件打中 −2，进维护窗口 −4；点中间带进度条的「部署 x/{$1}」花点数发动技能", SPEED_MAX, SPEED_MAX), '', 'speed'));
  // 经代理商买的服务（展开的卡）：几块、经谁买的；运行费交给代理商，托管服务商每块每圈另收托管费
  if (!mini) { const by = new Map(); ownedBy(p).forEach(i => { const v = S.props[i].via; if (v != null && v !== p.id && P(v)) by.set(v, [...(by.get(v) || []), i]); });
    by.forEach((ix, v) => { const q = P(v), msp = q.role === 'rs_msp' && q.alive;
      res.push(ri(_tf(4329, "{$0} {$1} 块", lb(_tf(4328, "经 {$0} 买", q.name)), ix.length), _tf(4331, "{$0} 是从代理商 {$1} 手里买的：这几块的运行费交给 {$2}（他按拿货价交亚马逊云科技，赚中间的差价）{$3}", ix.map(i => SQ[i].n).join(_t(349, "、")), q.name, q.name, msp ? _tf(4330, "；{$0} 是托管服务商，每块每圈另收 $10 托管费，经过起点时和运行费一起交", q.name) : ''), '', 'via' + v)); }); }
  // re:Invent 手牌（engine/18-reinvent.js）：大家都看得到几张；是哪几张只在主人自己的提示里写（远端看本机座位；房主和不联机时看当前回合的人，房主这台还坐着别的本机座位时也一样，远端座位的手牌房主看不到）
  { const hand = handOf(p), seer = MP.role === 'client' ? p.id === mine : p.id === mine || (p.id === S.cur && !isAI(p.id) && !MP.isRemote(p.id));
    if (hand.length) res.push(ri(`${lb(_t(5439, "手牌"))} ${hand.length}`, seer && hand.every(id => REI[id]) ? _tf(5440, "没公开的 re:Invent 卡：{$0}。轮到自己时点「手牌」打出、卖掉或弃牌走 1–3 格", hand.map(id => REI[id].n).join(_t(349, "、"))) : _tf(5441, "没公开的 re:Invent 卡 {$0} 张：只有 {$1} 自己知道是什么", hand.length, p.name), '', 'hand')); }
  // 埋下的 Health 卡（engine/18-reinvent.js 的 S.traps）：大家都看得到埋了几张；埋在哪、是哪张只在主人自己的提示里写，看的人和手牌一样。联机时别人的那几条只有 by
  { const tr = trapsOf(p), seer = MP.role === 'client' ? p.id === mine : p.id === mine || (p.id === S.cur && !isAI(p.id) && !MP.isRemote(p.id));
    if (tr.length) res.push(ri(`${lb(_t(5653, "埋卡"))} ${tr.length}`, seer && tr.every(t => SQ[t.sq] && INC[t.id]) ? tr.map(t => _tf(5656, "埋在 {$0}：{$1}", SQ[t.sq].n, INC[t.id].n)).join(_t(408, "；")) : _tf(5657, "埋了 {$0} 张 Health 卡：埋在哪、是哪张只有 {$1} 自己知道", tr.length, p.name), '', 'trap')); }
  const prog = archProg(p), done = prog.filter(x => x.done);
  // 收起的卡：保留卡、承诺折扣、生效的架构、支柱只写个数，说明在提示里
  if (mini) {
    const un = p.cards.filter(c => !c.used);
    if (un.length) res.push(ri(`${lb(_t(4332, "保留卡"))} ${un.length}`, un.map(c => _tf(838, "{$0}：{$1}", CARDN[c.id], CARDE[c.id])).join(_t(408, "；")), '', 'cards'));
    const cm = commitsOf(p); if (cm.length) res.push(ri(`${lb(_t(4333, "承诺折扣"))} ${cm.length}`, cmTxt(cm), '', 'cm'));
    if (done.length) res.push(_tf(4334, "<span class=\"ri pa done\" data-archall=\"\" data-p=\"{$0}\" tabindex=\"0\" data-fk=\"pall{$1}\">架构生效 {$2}</span>", p.id, p.id, done.length));
    if (winWA()) res.push(_tf(4335, "<span class=\"ri psum {$0}\" data-pillar=\"sum\" data-p=\"{$1}\" tabindex=\"0\" data-fk=\"pps{$2}\">支柱 {$3}/6 达成</span>", waDone(p) ? 'on' : '', p.id, p.id, pillars(p).filter(Boolean).length));
  }
  // 要提防的持续状态：红字单独一行，不放进蓝色的技能效果标签里
  const warns = [];
  if (p.reGo > 0) warns.push(_tf(4336, "退回了上一圈：{$0}经过起点不领钱、不交运行费", p.reGo > 1 ? _tf(1834, "接下来 {$0} 次", p.reGo) : _t(1835, "下次")));
  { const by = new Map(); ownedBy(p).filter(i => S.props[i].ddos != null && P(S.props[i].ddos)).forEach(i => { const k = S.props[i].ddos + '|' + (S.props[i].ddosWhy || ''); by.set(k, [...(by.get(k) || []), i]); });
    by.forEach(ix => {
      const pr = S.props[ix[0]], a = P(pr.ddos), names = ix.map(i => SQ[i].n).join(_t(349, "、")), left = Math.max(...ix.map(i => S.props[i].ddosLeft || 1));
      warns.push(pr.ddosWhy ? _tf(5394, "{$0} 因「{$1}」下线：不收过路费，运行费照交，{$2} 再轮到 {$3} 次时恢复", names, downWhy(pr), a.name, left) : _tf(4337, "{$0} 被 {$1} DDoS：不收过路费，运行费照交，{$2} 再轮到 {$3} 次时恢复", names, a.name, a.name, left));
    }); }
  // 技能留下的持续效果：挂在玩家卡上，不然只在日志里，几步就被刷走了
  const fx = [], skn = r.sk ? r.sk.n + _t(2670, "：") : '';
  if (p.rentBoost) fx.push(_tf(4338, "{$0}过路费 ×{$1} · 还剩 {$2} 回合", skn, p.rentBoost, p.rentBoostTurns));
  if (p.rent3Left > 0) fx.push(_tf(4339, "爆款 ×3 · 还剩 {$0} 笔", p.rent3Left));
  if (p.immuneTill >= S.round) fx.push(_tf(4340, "监管沙盒 · 到第 {$0} 轮", p.immuneTill));
  if (p.aiBoostTill >= S.round) fx.push(_tf(4341, "AI 组 ×2 · 到第 {$0} 轮", p.aiBoostTill));
  if (p.billFree > 0) fx.push(_tf(4342, "推广 Credits：{$0}经过 Startup 扶持运行费全免", p.billFree > 1 ? _tf(1834, "接下来 {$0} 次", p.billFree) : _t(1835, "下次")));
  lapFx(p, 'rent').forEach(x => fx.push(_tf(5658, "{$0}：{$1} 过路费 ×{$2} · 这一圈", REI[x.c].n, x.ks.map(k => SQ.find(q => q.k === k).n).join(_t(349, "、")), x.m)));
  lapFx(p, 'az').forEach(x => fx.push(_tf(5659, "{$0}：{$1} 这一圈算单 AZ", REI[x.c].n, x.ks.map(k => SQ.find(q => q.k === k).n).join(_t(349, "、")))));
  [...new Set((p.runCut || []).map(x => x.c))].forEach(c => fx.push(_tf(5660, "{$0}：下次经过 Startup 扶持运行费打折", REI[c].n)));
  if (p.runLaps > 0) fx.push(_tf(4343, "{$0}运行费{$1} · 还剩 {$2} 圈", skn, p.runMul ? _t(2895, "减半") : _t(2896, "全免"), p.runLaps));
  if (p.subsTurns > 0) fx.push(_tf(4344, "{$0}订阅费 ${$1} · 还剩 {$2} 次", skn, p.subsAmt, p.subsTurns));
  const rows = [];
  if (!mini) {
    if (p.cards.length) rows.push(_tf(4346, "<div class=\"pline\">保留卡：{$0}</div>", p.cards.map((c, k) => `<span class="tipx" tabindex="0" data-fk="cd${p.id}-${k}" title="${CARDE[c.id]}${c.used ? _t(4345, "（已用掉）") : ''}">${c.used ? `<s>${CARDN[c.id]}</s>` : lb(CARDN[c.id])}</span>`).join(_t(349, "、"))));
    const cm = commitsOf(p); if (cm.length) rows.push(_tf(4347, "<div class=\"pline\">承诺折扣：{$0}</div>", cmTxt(cm)));
    if (cust.length) rows.push(_tf(4348, "<div class=\"pline\">客户：{$0}</div>", cust.map(x => _tf(3245, "{$0}（{$1}）", x.q.name, x.ix.map(i => SQ[i].n).join(_t(349, "、")))).join(_t(349, "、"))));
    // 架构：一行汇总（生效的、只差 1 块的），完整进度悬停「全部 N 套」看
    if (prog.length) {
      const near = prog.filter(x => !x.done && x.miss.length === 1), parts = [];
      const an = x => `<span class="pa ${x.done ? 'done' : ''}" data-arch="${x.c.id}" data-p="${p.id}" tabindex="0" data-fk="pa${p.id}-${x.c.id}">${x.c.n}</span>`;
      // 最后一个名字和「已生效 / 差 1 块」绑在一起，不让「块」单独折到下一行
      const grp = (xs, t) => `${xs.slice(0, -1).map(an).map(h => h + _t(349, "、")).join('')}<span class="pnw">${an(xs[xs.length - 1])} ${t}</span>`;
      const all = t => `<span class="pam" data-archall="" data-p="${p.id}" tabindex="0" data-fk="pall${p.id}">${t}</span>`;
      if (done.length) parts.push(grp(done, _t(4349, "已生效")));
      if (near.length) parts.push(grp(near.slice(0, 3), near.length > 3 ? _tf(4350, "等 {$0} 套差 1 块", near.length) : _t(4351, "差 1 块")));
      const more = prog.some(x => !x.done && x.miss.length > 1 && x.n >= 2) || near.length > 3;
      rows.push(_tf(4355, "<div class=\"parch\">架构：{$0}</div>", parts.length ? parts.join(' · ') + (more ? ` · ${all(_t(4352, "全部进度"))}` : '') : _tf(4354, "还没有快凑齐的（{$0}）", all(_t(4353, "看进度")))));
    }
    const ps = pillars(p), sc = pillarScore(p), why = pillarWhy(p), need = pillarNeed(), bar = (v, n) => `<span class="pb" aria-hidden="true"><i style="width:${Math.round(Math.min(1, v / Math.max(1, n)) * 100)}%"></i></span>`;
    rows.push(`<div class="pillars">${ps.map((ok, k) => _tf(4357, "<span class=\"pillar {$0}\" data-pillar=\"{$1}\" data-p=\"{$2}\" tabindex=\"0\" data-fk=\"pp{$3}-{$4}\">{$5} <small>{$6}/{$7}</small>{$8}<span class=\"sr-only\">{$9}。{$10}</span></span>", ok ? 'on' : '', k, p.id, p.id, k, PILLARS[k], sc[k], need, bar(sc[k], need), ok ? _t(3642, "，已达成") : _t(4356, "，未达成"), why[k])).join('')}${waTotalNeed() ? _tf(4358, "<span class=\"pillar ptot {$0}\" data-pillar=\"tot\" data-p=\"{$1}\" tabindex=\"0\" data-fk=\"pp{$2}-t\">总分 <small>{$3}/{$4}</small>{$5}</span>", pillarTotal(p) >= waTotalNeed() ? 'on' : '', p.id, p.id, pillarTotal(p), waTotalNeed(), bar(pillarTotal(p), waTotalNeed())) : ''}</div>`);
    // 角色：平时一行，点开是能力、弱点、技能三行；所有技能共用的战略并购只在展开后写一次。地狱限制一直显示
    const ro = PL_ROLE.has(p.id), skN = r.sk ? _tf(4360, "技能「{$0}」{$1}", r.sk.n, p.skillUsed ? _t(4359, "（已用）") : '') : '';
    rows.push(`<div class="prole"><div class="prow"><button type="button" class="rlt" data-fk="rl${p.id}" aria-expanded="${ro}" data-act="toggleRole" data-arg="${p.id}">${_tf(4365, "<span class=\"pla\" aria-hidden=\"true\">{$0}</span>能力 · 弱点{$1}", ro ? '▾' : '▸', skN ? ' · ' + skN : '')}</button>${led}</div>${isHell() && r.hell ? _tf(4361, "<div class=\"rlh\">地狱限制：{$0}</div>", r.hell) : ''}${ro ? _tf(4364, "<div class=\"rlb\"><p><b>能力</b>{$0}{$1}</p><p><b>弱点</b>{$2}</p>{$3}</div>", p.reseller ? _t(4362, "代理商，") : '', r.ab, r.wk, r.sk ? _tf(4363, "<p><b>{$0}</b>{$1}{$2}</p><p class=\"rln\">发动技能时先拿上面的效果，再战略并购：收购总资产最高的对手的一块服务</p>", skN, r.sk.d, p.skillUsed ? '' : skillMulTxt(p)) : '') : ''}</div>`);
  }
  // 收起的卡把状态行放在最后：「明细」贴在卡片右下角，状态行右边给它让出位置
  const resH = mini ? `<div class="res">${res.join(' ')}${led}</div>` : res.length ? `<div class="res">${res.join(' ')}</div>` : '';
  // 展开的卡：总资产 · 估值 · 运行费在服务图标上面，紧挨着头部的现金
  return zhs(`<div class="grp pl ${isCur ? 'cur' : ''} ${mini ? 'mini' : ''} ${p.id === mine ? 'me' : ''}">${head}<div class="gb" id="plb${p.id}">
      ${kv.length ? `<div class="res pkv">${kv.join(' ')}</div>` : ''}<div class="svcs">${svcs || _t(4366, "<span class=\"none\">还没有服务</span>")}</div>
      ${mini ? '' : resH}${warns.map(t => `<div class="pwarn">${t}</div>`).join('')}${fx.length ? `<div class="fxrow">${fx.map(t => `<span class="fxchip">${t}</span>`).join('')}</div>` : ''}${mini ? resH : rows.join('')}
    </div></div>`);
}
function renderSide(keep = sideScroll()) {
  const side = $('#side');
  // 侧栏整块重写：键盘停在玩家卡名字、服务图标、支柱、「明细和日志」上的焦点放回同一个元素（鼠标点的不放，空格还是掷骰子）
  const fe = document.activeElement, fk = side.contains(fe) && fe.matches(':focus-visible') && fe.dataset.fk;
  side.classList.toggle('many', S.players.length >= 3);
  side.classList.toggle('crowd', S.players.length > 4);   // 多人局：收起的卡再紧一点（index.html 的 #side.crowd），列表照样能滚
  // 本机是哪个座位，名字后面写「（你）」：远端按 mySeat；房主只在这台只有一位真人时写（同一台轮流玩的不写）；不联机不写。只看本机的 MP，各画各的
  const loc = MP.role === 'host' ? S.players.filter(q => q.alive && !isAI(q.id) && !MP.isRemote(q.id)) : [];
  const mine = MP.role === 'client' ? MP.mySeat : loc.length === 1 ? loc[0].id : null;
  const a = keep.anchor, n0 = SIDE_LOG0 === undefined ? -1 : S.log.indexOf(SIDE_LOG0);
  side.innerHTML = '<div class="plist">' + S.players.map(p => plCard(p, mine, S.mpOff)).join('') + _tf(4367, "</div><div class=\"grp logpanel\"><div class=\"gt t\">动态</div><div class=\"gb\"><div class=\"log\">{$0}</div></div></div>", S.log.slice(0, 80).map(logRow).join(''));
  SIDE_LOG0 = S.log[0];
  // 新建的列表本来就在最上面，0 不用写回：写一次就要排一次版。往下翻着旧日志时，新插进来几行就多往下滚几行的高度
  SIDE_SCR.forEach((q, k) => {
    if (!keep[k]) return; const el = side.querySelector(q); if (!el) return;
    let v = keep[k]; if (k && n0 > 0) { const rows = side.querySelector('.log').children; if (rows[n0]) v += rows[n0].offsetTop - rows[0].offsetTop; }
    el.scrollTop = v;
  });
  if (a) { const el = side.querySelectorAll('.pl')[a.k], pl = side.querySelector('.plist'); if (el && pl) { const d = el.getBoundingClientRect().top - (a.win ? 0 : pl.getBoundingClientRect().top) - a.off; if (Math.abs(d) >= 1) { if (a.win) scrollBy(0, d); else pl.scrollTop += d; } } }
  // 换人时：他的卡不在玩家列表可视区里（被底部淡出盖住或滚走了）就把列表滚到能看见，只滚列表、不展开，PL_OPEN 不变
  if (S.cur !== SIDE_CUR) {
    const was = SIDE_CUR; SIDE_CUR = S.cur;
    const pl = side.querySelector('.plist'), el = side.querySelectorAll('.pl')[S.cur];
    if (was !== null && pl && el && S.phase !== 'over' && pl.scrollHeight > pl.clientHeight + 1 && getComputedStyle(pl).overflowY === 'auto') {
      const pr = pl.getBoundingClientRect(), r = el.getBoundingClientRect(), bot = pr.bottom - 30;
      if (r.top < pr.top) pl.scrollTop -= pr.top - r.top + 4;
      else if (r.bottom > bot) pl.scrollTop += Math.min(r.top - pr.top - 4, r.bottom - bot);
    }
  }
  if (fk) { const t = side.querySelector(`[data-fk="${fk}"]`); if (t) t.focus({ preventScroll: true }); }
}
// 走棋时每走一格只重画棋盘（按格比对，实际只改两三格）和中间「谁在哪一格」那一条，侧栏和中间区别的内容走棋时不变：
// 手机上整页重画一次要 50–80ms，每格都画就一跳一顿。联机时照样推给远端（lite，远端也只重画棋盘），远端才能一格一格看到棋子走
export function hopRender() {
  if (!S || SIM) return;
  renderBoard();
  const h = $('#center .stage .here'); if (h) h.outerHTML = hereHtml(cur());
  if (MP.role) MP.afterRender(true);
}
// 读屏播报：每次重画把新进的日志念出来（掷了几点、领了多少、付给谁过路费）；联机的远端收到状态也走 render，一样能听到。第一次只记位置，不把整局历史念一遍
// 换到真人掷骰子时再接一句「轮到 X 掷骰子」：状态栏那句「轮到你掷骰子」不在 live 区域里，电脑走完读屏念的还是电脑那一步。
// 电脑的回合不念：约 0.4 秒后就念「电脑 2 掷出…」，polite 区域被整串替换，前一句多半会被吞掉。对子再掷 S.cur 不变，不重复念。
// 不写「按空格」：焦点停在格子、菜单上时空格交给那个元素；联机时看别人的回合（远端看别人、房主看在线的远端玩家）只念名字
let SR_TOP, SR_CUR;
function srLog() {
  const el = $('#srlive'); if (BOT || !el || !S.log) return;
  const top = S.log[0], tp = document.createElement('template'), say = [];
  if (SR_TOP !== undefined && top !== SR_TOP) {
    let n = S.log.indexOf(SR_TOP); if (n < 0) n = 1;   // 找不到上次那条（读档、换了一局）就只念最新一条
    say.push(...S.log.slice(0, Math.min(n, 8)).reverse().map(l => { tp.innerHTML = logBody(l); return tp.content.textContent.replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, '').trim(); }));
  }
  SR_TOP = top;
  if (S.phase === 'roll' && S.cur !== SR_CUR) {
    SR_CUR = S.cur;
    const p = cur(), wait = (MP.role === 'client' && S.cur !== MP.mySeat) || (MP.role === 'host' && MP.isRemote(S.cur) && MP.seats[S.cur].online);
    if (!isAI(S.cur)) { tp.innerHTML = p.name; say.push(_tf(4370, "轮到 {$0}{$1}", tp.content.textContent, wait ? '' : p.jail !== null ? _t(4368, "，在维护窗口里") : _t(4369, " 掷骰子"))); }   // 名字存的是转义过的，先解码，不然念出「&amp;」
  }
  if (say.length) el.textContent = say.join(_t(408, "；"));
}
// 重画会把中间操作区、底部栏的按钮整块换掉：键盘停在上面的焦点放回新画的同一个按钮（没了就放主按钮），不用每次从棋盘第一格重新 Tab
let FOCUS_K = null;
// 鼠标点过别处就不再替他找回键盘焦点：不然点了空白处再按空格，按到的是刚才 Tab 到的那个按钮，不是掷骰子
addEventListener('pointerdown', () => { FOCUS_K = null; }, true);
export function render() {
  if (!S || SIM) return;
  const a = document.activeElement; if (a && a !== document.body) FOCUS_K = a.closest('#center, #mbar') && a.matches(':focus-visible') ? a : null;
  const keep = sideScroll(); renderBoard(); renderCenter(); renderSide(keep); srLog(); cheatBtns(); if (MP.role) MP.afterRender();
  if (FOCUS_K && !FOCUS_K.isConnected && (!document.activeElement || document.activeElement === document.body) && $('#modal').hidden && !$('#tour') && !viewOpen()) { const t = sameEl(FOCUS_K) || mainBtn(); if (t) { t.focus({ preventScroll: true }); FOCUS_K = t; } }
  if ((S.phase === 'roll' || S.phase === 'post') && isAI(S.cur)) aiKick();
}
setInterval(() => { if (S && S.endAt && !S.over) { const el = $('#timer'); if (el) el.textContent = fmtTime(timeLeft()); } }, 1000);

export const __set_SIDE_CUR = v => (SIDE_CUR = v);
export const __set_SIDE_LOG0 = v => (SIDE_LOG0 = v);
