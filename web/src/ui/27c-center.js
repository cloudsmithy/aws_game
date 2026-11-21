import { AWSI } from '../data/icons.js';
import { LANG, __rv, _t, _tf, _tr } from '../core/01-i18n-runtime.js';
import { $, PAWN, SAVE_FAIL, awsImg, esc } from '../core/02-util.js';
import { BAL, IX, OWNABLE, SQ, effIn, haTag, isCorner, upCost } from '../rules/03-services.js';
import { langBtn } from './03b-lang-menu.js';
import { COMBOS, cLink, comboOpen, roleOf, rsRate, slotOpen } from '../rules/04-roles-combos-cards.js';
import { DLC, dlcOn } from '../rules/05-dlc.js';
import { F, P, S, active, availCard, comboMiss, cur, hasCombo, ownedBy, wildOf, winParts } from '../engine/07-state.js';
import { netWorth } from '../engine/08c-costs.js';
import { sellZhe, trafficMul, zhe } from '../engine/09-rent.js';
import { minPlace } from './10-modal.js';
import { jailMax } from '../engine/13-move.js';
import { aiName, refactorCost } from '../engine/17-health.js';
import { STORM_TXT, skillLine, skillMulTxt, skillWhy } from '../engine/21-skills.js';
import { actionWhy } from '../engine/24-actions.js';
import { edpWhy } from '../engine/25-trade.js';
import { PILLARS, SEC_PILLAR, pillarNeed, pillarParts, pillarScore, pillarTotal, waRuleText, waTotalNeed } from '../engine/26a-pillars-win.js';
import { finHtml } from './26c-report.js';
import { SQPOP_I, callout, cellGc, cellHtml, hereHtml, sideOf, sqTip } from './27a-board.js';
import { GAIN, SQFX, SQPREV, archBtns, archTipOff, comboCheck, needLine, needSquares } from './27b-arch-notes.js';
import { lastCardHtml, playerBrief } from './27d-side.js';
import { themeControl } from './27e-square-gallery.js';
import { GMENU } from './28-setup-save.js';
import { SFX } from './32-sfx.js';
import { FX } from './33-fx3d.js';
import { cardGrowMul, cardMulBase, fmtMul, isHell, isHidden, isParty, isStudy } from '../rules/35-modes.js';
import { AI_PAUSE, aiPaused, isAI } from '../engine/36-ai.js';
import { MP } from '../net/40-host-sync.js';
export function renderBoard() {
  comboCheck();
  const need = needSquares();
  SQ.forEach((s, i) => {
    const d = $('#sq' + i), pr = S.props[i];
    const owned = pr && pr.owner !== null, gc = isHidden(i) ? '#ff9900' : cellGc(s);
    if (pr) { const prev = SQPREV[i], now = Date.now(); if (prev) { if (pr.owner !== null && pr.owner !== prev.o) { SQFX[i] = ['fx-buy', now + 800]; const a = S.aucFx && S.aucFx.i === i && S.aucFx.o === pr.owner ? S.aucFx : null; callout(i, a ? _tf(4027, "{$0} 竞价 ${$1} 拿下 <b>{$2}</b>{$3}", P(pr.owner).name, a.w, SQ[i].n, a.txt ? _tf(4026, "<small>其他出价：{$0}{$1}</small>", a.txt, a.tie ? _t(4025, "（同价时离落地的人最近的得）") : '') : '') : _tf(4028, "{$0} 拿下 <b>{$1}</b>", P(pr.owner).name, SQ[i].n), 'org', a ? 3200 : 2200); FX.splash(i, P(pr.owner).color); } else if (pr.impaired && !prev.imp) { SQFX[i] = ['fx-hit', now + 700]; callout(i, _tf(4029, "<b>{$0}</b> 变成 Impaired<small>暂停收过路费</small>", SQ[i].n), 'warn'); } } SQPREV[i] = { o: pr.owner, imp: !!pr.impaired }; }
    const fx = SQFX[i] && SQFX[i][1] > Date.now() ? SQFX[i][0] : '';
    d.className = ['sq', isCorner(i) ? 'corner' : sideOf(i), gc ? 'g' : '', isHidden(i) ? 'blind' : '', owned ? 'owned' : '', pr && pr.impaired ? 'impaired' : '', pr && pr.offline ? 'offline' : '', S.lastSq === i ? 'last' : '', SQPOP_I === i ? 'sel' : '', need[i] ? 'need' : '', fx].join(' ');
    d.style.setProperty('--k', i);
    if (SQFX[i] && SQFX[i][0] === 'fx-combo' && SQFX[i][1] > Date.now()) d.classList.add('fx-combo');
    d.style.setProperty('--gc', gc || 'transparent');
    d.style.setProperty('--oc', owned ? P(pr.owner).color : 'transparent');
    // 提示和格子内容跟上次写的一样就不再写：格子里的图标都是内嵌的，48 格整个重写一遍有两百多 KB 要重新解析。
    // 上次写的挂在格子元素自己身上，buildBoard 重建格子时跟着作废
    const tl = sqTip(i).split('\n'), nl = needLine(i, need); if (nl) tl.splice(-1, 0, nl);
    const tip = tl.join('\n');
    if (d._t !== tip) { d._t = d.title = tip; d.setAttribute('aria-label', tip.split('\n').slice(0, -1).join(_t(2698, "，"))); }   // 格子、主人、过路费读屏都要念；最后一行「点一下看记录」不用念
    const h = cellHtml(i); if (d._h !== h) { d._h = h; d.innerHTML = h; }
  });
}
// 限时还剩多少毫秒：远端按房主的钟算（MP.skew = 房主时间 − 本机时间，每次收到状态时更新），两台设备的时间不准也对得上；结束判断照旧在房主那台
export const timeLeft = () => S.endAt - Date.now() - (MP.role === 'client' ? MP.skew || 0 : 0);
export const fmtTime = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const dieHtml = n => _tf(4030, "<div class=\"die\" aria-label=\"{$0} 点\">{$1}</div>", n, Array.from({ length: 9 }, (_, k) => `<i class="${PIPS[n].includes(k) ? 'on' : ''}"></i>`).join(''));
let lastAnimRoll = 0;
export function renderCenter() {
  // 结束后台面中间显示赢家（不是最后一位行动的人），右栏写本局结果
  const over = S.phase === 'over', p = over && S.winner != null ? P(S.winner) : cur(), idle = S.phase === 'roll' || S.phase === 'post';
  const diffN = isParty() ? _t(3742, "娱乐模式") : isStudy() ? _t(3743, "学习模式") : isHell() ? _t(3744, "地狱模式") : { basic: _t(3745, "入门局"), std: _t(3746, "标准局"), full: _t(3368, "完整局") }[S.cfg.diff];
  const winN = winParts().map(([n, t]) => `<span title="${t}">${n}</span>`).join(' + ');
  let main = '';
  if (over) main = MP.role === 'client' ? _t(4031, "<button class=\"pri lg\" data-act=\"toHome\">回开局页</button>") : _t(4032, "<button class=\"pri lg\" data-act=\"backToSetup\">再来一局</button>");   // 远端没有这局的存档，不能走 backToSetup（会清掉他自己本机的存档）
  if (over) main += _t(4033, "<button class=\"lg\" data-act=\"showReport\">查看战报</button>");   // 战报关了还能再看、再导出（远端也能点，只在自己设备上开）
  else if (S.phase === 'roll' && p.jail !== null) {
    main = _tf(4036, "{$0}<button class=\"{$1}lg\" data-act=\"jailAct\" data-arg=\"stay\">停这一轮</button>", p.cash < 50 ? _t(4034, "<button class=\"lg off\" aria-disabled=\"true\" data-act=\"toast\" data-arg=\"现金不够 $50\" title=\"现金不够 $50\">付 $50 出来，照常走</button>") : _t(4035, "<button class=\"pri lg\" data-act=\"jailAct\" data-arg=\"pay\">付 $50 出来，照常走</button>"), p.cash < 50 ? 'pri ' : '');
    if (availCard(p, 'ES')) main += _t(4037, "<button class=\"lg\" data-act=\"jailAct\" data-arg=\"es\">用 Enterprise Support</button>");
  } else if (S.phase === 'roll') main = `<button class="pri lg" data-act="doRoll">${S.again ? _t(4038, "对子，再掷一次") : _t(4039, "掷骰子")}</button>`;
  else if (S.phase === 'post') main = _t(4040, "<button class=\"pri lg\" data-act=\"endTurn\">轮到下一位</button>");
  else main = _t(4041, "<button class=\"pri lg\" disabled>结算中…</button>");
  if (!over && isAI(S.cur)) main = `<button class="pri lg" disabled>${aiName(p)} ${aiPaused() ? _t(2725, "已暂停") : _t(4042, "在玩…")}</button>${MP.role === 'client' ? _tf(4043, "<button class=\"lg\" data-act=\"MP.aipause\" title=\"请房主那边的电脑停下 / 接着跑\">{$0}</button>", aiPaused() ? _t(2461, "继续") : _t(2733, "暂停")) : _tf(4044, "<button class=\"lg\" data-act=\"toggleAiPause\" title=\"暂停后电脑停在原地（弹窗也不会自动选），点继续接着跑\">{$0}</button>", AI_PAUSE ? _t(2461, "继续") : _t(2733, "暂停"))}`;
  { const mb = $('#mbar'); if (mb) mb.innerHTML = $('#game') && !$('#game').hidden ? main : ''; minPlace(); }
  let more = '';
  if (!over && !isAI(S.cur)) {
    // 按钮能点就照常；不能点就灰掉，原因放在悬停提示里，点一下也会弹 toast
    const idleWhy = idle ? '' : S.phase === 'busy' ? _t(4045, "结算中，等一下") : MP.role === 'client' && S.cur !== MP.mySeat ? _t(4046, "还没轮到你") : _t(4047, "现在不能操作");
    // 灰掉的按钮只显示标题：原因在悬停提示里，手机上点一下弹 toast
    // a 是 UI_ACTS 里的名字（data-act="uiAction"）；灰按钮的 data-fk 和能点时的 actKey 一样，重画后焦点认得回来
    const B = (why, a, title, label, short) => why ? `<button class="off" aria-disabled="true" data-fk="uiAction(${a})" data-why="${esc(why)}" data-act="toast" title="${esc(why)}${title ? '&#10;' + title : ''}">${label}</button>` : `<button data-act="uiAction" data-arg="${a}" title="${title}">${label}</button>`;
    if (F.debt() && p.techDebt > 0) more += B(idleWhy || (p.cash < refactorCost(p) ? _tf(2981, "现金不够 ${$0}", refactorCost(p)) : ''), 'refactorDebt', _t(4048, "重构清掉 1 个技术债：手上有几个就是 $50 × 几个，第 10 轮起再加 $30；随时可以做，不占主动行动"), _tf(4049, "清技术债 ${$0}（{$1}）", refactorCost(p), p.techDebt));
    if (F.actions()) more += B(idleWhy || actionWhy(p), 'activeAction', _t(4050, "每回合可以做一件事：GameDay 演练、查看后面的 Health 事件卡、重构清技术债、迁移升级"), _t(4051, "主动行动"));
    more += B(idleWhy, 'manage', _tf(4053, "给自己的服务升级、加容量；{$0}彻底不要的可以按实付 {$1}卖回亚马逊云科技", isParty() ? '' : _t(4052, "缺钱时把服务下线拿回一半周转，"), sellZhe()), _t(4054, "资产管理"));
    more += B(idleWhy, 'trade', _t(4055, "和别的玩家换服务、换现金（完整局还能换保留卡和标记）"), _t(4056, "交易"));
    // 抽卡按钮只放在右栏「这回合还能做什么」里，这里不重复
    if ((F.full() || dlcOn('finops')) && p.role !== 'indie') more += B(idleWhy || edpWhy(p), 'edpDialog', _t(4057, "Savings Plans / 预留实例：跟亚马逊云科技承诺用量，换运行费折扣"), 'SP / RI');
    if (roleOf(p).sk) more += B(idleWhy || (p.skillUsed ? _t(3372, "这局已经用过了") : BAL.noSkill ? _t(4058, "这个模式没有专属技能") : skillWhy(p)), 'useRoleSkill', _tf(4059, "{$0}「{$1}」：{$2}{$3}。现在能发动", STORM_TXT, roleOf(p).sk.n, roleOf(p).sk.d, skillMulTxt(p)), _t(4060, "专属技能"), !p.skillUsed && _tr(4061, "总资产低于", "").test(skillWhy(p)) ? _tf(4062, "总资产低于 ${$0} 才能用", skillLine(p)) : '');
    if (p.reseller) more += B(idleWhy, 'setRsRate', _t(4063, "客户从你手里买服务的价格"), _tf(4064, "转售价 {$0}", rsRate(p) === 1 ? _t(1512, "原价") : zhe(rsRate(p))));
    if (dlcOn('speed')) more += B(idleWhy, 'speedMenu', _t(4065, "花部署点数发动技能：1–12 点各有一个；6 点、12 点是 DDoS"), _tf(4066, "部署 {$0}/12<span class=\"spbar\">{$1}</span>", p.speed, Array.from({ length: 12 }, (_, k) => `<i class="${k < p.speed ? 'on' : ''}${k === 11 && p.speed >= 12 ? ' max' : ''}"></i>`).join('')));
  }
  const bk = !over ? (idle && !isAI(S.cur) ? _t(4067, "<button class=\"sm danger-lite\" data-act=\"uiAction\" data-arg=\"declareBankrupt\" title=\"主动认输：账户被暂停出局，资产交回亚马逊云科技（不能指定送人）\">宣告破产</button>") : _tf(4069, "<button class=\"sm danger-lite off\" aria-disabled=\"true\" data-act=\"toast\" data-arg=\"现在不能宣告破产：{$0}\">宣告破产</button>", isAI(S.cur) ? _t(4068, "电脑的回合，轮到你时再点") : S.phase === 'busy' ? _t(4045, "结算中，等一下") : _t(4046, "还没轮到你"))) : '';
  const d = S.lastDice;
  const rolling = S.rollId && S.rollId !== lastAnimRoll;
  if (rolling) lastAnimRoll = S.rollId;
  const status = over ? _t(4070, "游戏结束") : p.jail !== null ? (p.jail ? _tf(4071, "在维护窗口里：停了 {$0}/{$1} 轮，再停一轮或付 $50 出来", p.jail, jailMax(p)) : _tf(4072, "在维护窗口里：停{$0}轮，或付 $50 出来", jailMax(p) > 1 ? ` ${jailMax(p)} ` : _t(2874, "一"))) : S.phase === 'busy' ? _t(4073, "结算中…") : S.phase === 'post' ? _t(4074, "结算完了") : S.again ? _t(4075, "掷出对子，再掷一次") : isAI(S.cur) ? _t(4076, "掷骰子…") : MP.role === 'host' && MP.isRemote(S.cur) && !MP.seats[S.cur].online ? (MP.hostPlays(S.cur) ? _tf(4077, "{$0} 掉线了，由你替他操作", p.name) : _tf(4078, "{$0} 掉线了：你可以替他掷骰子、操作，弹窗里点「我来替他选」；或者等他连回来", p.name)) : MP.role === 'client' && S.cur !== MP.mySeat ? ((S.mpOff || []).includes(S.cur) ? _tf(4079, "{$0} 掉线了：等他连回来，或者房主替他操作", p.name) : _tf(4080, "等 {$0} 在自己的设备上操作…", p.name)) : _t(4081, "轮到你掷骰子");   // 远端看别人的回合和房主那边（afterRender）一个说法；热座的「你」是坐在屏幕前的人
  const meta = [_tf(4082, "第 {$0}{$1} 轮", S.round, S.cfg.roundLimit ? ' / ' + S.cfg.roundLimit : ''), diffN, winN, (S.cfg.dlc || []).length ? `<span class="dnl">${S.cfg.dlc.map((k, i) => `<span class="dn">${i ? '' : _t(4083, "DLC：")}${DLC[k].n}</span>`).join(_t(349, "、"))}</span>${S.cfg.dlc.length >= 6 ? _tf(4084, "<span class=\"dls\" role=\"button\" tabindex=\"0\" data-act=\"dlcToast\" data-arg=\"这局开了：\" data-act-keydown=\"clickOnKey\" title=\"{$0}\">{$1} 个 DLC</span>", S.cfg.dlc.map(k => DLC[k].n).join(_t(349, "、")), S.cfg.dlc.length) : ''}` : '', S.cfg.learn && !isStudy() ? _t(4085, "边玩边答题") : '', S.endAt ? _tf(4086, "剩余 <span id=\"timer\">{$0}</span>", fmtTime(timeLeft())) : '', F.balance() && S.round <= BAL.protect ? _tf(4087, "<span title=\"前 {$0} 轮每笔过路费最多 $50，格子上也按 $50 标；第 {$1} 轮起按原价收\">新账户保护期（过路费最多 $50）</span>", BAL.protect, BAL.protect + 1) : '', S.cfg.cardMul && S.cfg.cardMul !== 1 && S.cfg.cardMul !== '1' ? _tf(4089, "卡牌倍率 {$0}{$1}", fmtMul(cardMulBase() / cardGrowMul()), S.cfg.cardMul === 'rand' ? _t(4088, "（每轮随机）") : '') : '', cardGrowMul() > 1 ? _tf(4090, "<span title=\"卡牌上的收钱、罚款跟着流量涨\">卡牌金额 {$0}</span>", fmtMul(cardGrowMul())) : '', trafficMul() > 1 ? _tf(4091, "<span title=\"用户增长：每 {$0} 轮所有过路费再涨 {$1}%\">流量 ×{$2}</span>", BAL.growthEvery, Math.round(BAL.growth * 100), trafficMul()) : ''].filter(Boolean).map(x => `<span class="mi">${x}</span>`).join(' · ');
  $('#center').innerHTML = `
    <div class="c-head">
      <div class="gtitle"><div><h1>${_t(4111, "<span class=\"gt-pre\">亚马逊云科技 User Group </span>云上大亨")}</h1><div class="sub">${meta}</div></div></div>
      <div class="meta"><div class="tgrp" role="group" aria-label="${_t(4112, "帮助")}"><button class="sm" data-act="showManual">${_t(4113, "玩法")}</button><button class="sm" data-act="gallery">${_t(4114, "图鉴")}</button><button class="sm" data-act="playerGallery" title="${_t(4115, "玩家图鉴：所有角色卡的起始资金、能力、弱点、专属技能")}">${_t(4116, "角色")}</button><button class="sm" data-act="maybeTour" data-arg="true">${_t(4117, "新手引导")}</button><button class="sm keyshelp" data-act="keysHelp" title="${_t(4118, "键盘快捷键")}">${_t(4119, "快捷键")}</button><button class="sm" data-act="toggleSfx" title="${_t(4120, "掷骰子、抽卡、收钱的音效")}" aria-pressed="${SFX.on}">${_tf(4121, "音效：{$0}", SFX.on ? _t(4092, "开") : _t(4093, "关"))}</button>${langBtn('sm')}</div><details class="gmenu" ${GMENU.open ? 'open' : ''}><summary>${_t(4122, "对局")}</summary><div class="gm">${themeControl()}${MP.role === 'host' ? `<span data-mp-members>${MP.viewerUI()}</span>` : ''}<button class="sm" data-act="renameDialog" title="${_t(4123, "给自己（同一台电脑上谁都行）换个名字")}">${_t(4124, "改名字")}</button><button class="sm" data-act="toggleBoss" title="${_t(4125, "整页换成代码编辑器（云架构学习笔记）；再按一次 ` 键或者双击最上面的文件名回来")}">${_t(4126, "老板键（`）")}</button><button class="sm" data-act="toggleArchTip" aria-pressed="${!archTipOff()}" title="${_t(4127, "凑成有效架构时问要不要看讲解：自己凑成弹窗，别人凑成在右下角提示")}">${_tf(4128, "架构提示：{$0}", archTipOff() ? _t(4093, "关") : _t(4092, "开"))}</button>${MP.role === 'client' ? `<button class="sm off" aria-disabled="true" data-act="toast" data-arg="动画速度由房主设置" title="${_t(4097, "动画速度由房主设置，大家一起变")}">${_tf(4098, "动画速度：{$0}（房主设）", S.cfg.anim === 'fast' ? _t(4094, "快") : _t(4095, "标准"))}</button>${over ? '' : _t(4096, "<button class=\"sm\" data-act=\"MP.proposeEnd\" title=\"请房主现在按估值结算这一局\">提议现在结算</button>")}<button class="sm" data-act="MP.leave" title="${_t(4099, "离开这个房间：房主会把你的座位标成掉线，可以替你操作，你用同一个名字还能加回来")}">${_t(4100, "离开房间")}</button>` : _tf(4102, "<button class=\"sm\" data-act=\"toggleAnim\" aria-pressed=\"{$0}\" title=\"骰子、走棋、飞行都更快，画面不变；联机时房主改，大家一起变\">动画速度：{$1}</button>{$2}", S.cfg.anim === 'fast', S.cfg.anim === 'fast' ? _t(4094, "快") : _t(4095, "标准"), MP.role === 'host' && !over && Object.keys(MP.seats).length ? _t(4101, "<button class=\"sm\" data-act=\"MP.kickDialog\" title=\"把联机玩家移出房间，他的座位交给电脑接着打\">移出玩家</button>") : '')}<button class="sm" data-act="quitGame" title="${SAVE_FAIL ? _t(4103, "浏览器存储写不进去，这局没存上，退出就回不到现在这一步") : _t(4104, "对局自动保存，回开局页点「继续上一局」能接着玩")}">${_t(4129, "退出到开局页")}</button><button class="sm" data-act="confirmNew">${_t(4130, "新游戏")}</button>${over || MP.role === 'client' ? '' : idle ? _t(4105, "<button class=\"sm\" data-act=\"endNow\" title=\"时间到了、不想打了：现在按估值排名结束这一局\">现在结算</button>") : _t(4106, "<button class=\"sm off\" aria-disabled=\"true\" data-act=\"toast\" data-arg=\"结算中，等这一步做完再结算\">现在结算</button>")}${bk}</div></details></div>
    </div>
    ${over ? '' : `<div class="turnbar">${S.players.map(q => _tf(4110, "<span class=\"tb {$0} {$1} {$2}\" title=\"{$3}：现金 ${$4}，总资产 ${$5}\" data-act=\"jumpPl\" data-arg=\"{$6}\">{$7}<b>{$8}</b><span class=\"tbm\"><i>${$9}</i><small class=\"tba\" title=\"总资产：现金 − 欠款 + 服务买价 + 升级和容量的投入\">资产 ${$10}</small></span>{$11}</span>", q.id === S.cur && !over ? 'cur' : '', q.alive ? '' : 'dead', GAIN[q.id] > Date.now() ? 'gain' : '', q.name, q.cash, netWorth(q), q.id, PAWN(q.color), q.name, q.cash, netWorth(q), q.jail !== null ? _t(4107, "<em>维护窗口</em>") : q.skip ? _t(4108, "<em>停一轮</em>") : !q.alive ? _t(4109, "<em>已出局</em>") : '')).join('<span class="tbar">→</span>')}</div>`}
    <div class="cmain">
      <div class="cleft">
        <div class="stack inc" title="${_t(4131, "Health 事件牌堆")}">${_tf(4132, "{$0}<b>Health 事件</b><span>还剩 {$1} 张</span>", awsImg('health'), S.inc.length)}</div>
        <div class="stack rei" title="${_t(4133, "re:Invent 牌堆")}">${_tf(4134, "{$0}<b>re:Invent</b><span>还剩 {$1} 张</span>", awsImg('reinvent'), S.rei.length)}</div>
        <div class="potbox" title="${_t(4135, "账单格交的钱和 Health 事件的罚款都先放进奖池攒着；落在 User Group 活动可以抽奖随机拿 $100～全部，抽到 re:Invent「领到 Free Tier 额度」拿走全部")}">${_tf(4136, "{$0}<span>奖池</span><b>${$1}</b>", awsImg('savingsplans'), S.pot)}</div>
        ${lastCardHtml()}
      </div>
      <div class="stage">
        ${over ? finHtml(S.winner != null ? P(S.winner) : null) : `<div class="dice ${rolling && !FX.diceOn ? 'rolling' : ''} ${d[0] ? '' : 'idle'} ${FX.diceOn ? 'hid3d' : ''}">${dieHtml(d[0] || 5)}${dieHtml(d[1] || 6)}</div>
        <div class="who">${PAWN(p.color)}<b>${p.name}</b><span class="cash">$${p.cash}</span></div>
        <div class="st">${status}</div>`}
        ${over ? '' : hereHtml(p)}
        <div class="row">${main}</div>
        ${more ? `<div class="row more">${more}</div>` : ''}
      </div>
      <div class="cright">${playerBrief(p)}</div>
    </div>
    <div class="lower">
      <div class="legend">
        ${_tf(4137, "<span class=\"row\"><span class=\"gb2\"></span>色组</span>\n        <span class=\"row\"><span class=\"ownr\" style=\"--oc:#545b64;font-size:12px\"><i style=\"width:10px;height:10px\"></i>名字</span>= 主人</span>\n        <span class=\"row\"><span class=\"pawn\" style=\"--pc:#545b64\">1</span>= 玩家位置</span>\n        <span class=\"row\"><span class=\"lvb az\">2 AZ</span>多 AZ</span>\n        <span class=\"row\">{$0}Auto Scaling</span>\n        <span class=\"row\">{$1}多区域</span>\n        <span class=\"row\"><span class=\"lvb tx\">功能</span>服务功能</span>\n        <span class=\"row\" title=\"暂停收过路费，到主人下回合开始自动恢复\"><span class=\"imp-pill\" style=\"font-size:12px\">Impaired</span>暂停收费一轮</span>\n        <span class=\"row\"><span class=\"rent\" style=\"font-size:11px\">$245</span>过路费</span>\n        <span class=\"row\"><span class=\"rent jr\" style=\"font-size:11px\">$1022</span>整套架构联合收费</span>\n        <span class=\"row\"><span class=\"lg-ha auto\">绿字类型</span>自带跨 AZ 高可用</span>\n        <span class=\"row\"><span class=\"lg-ha glb\">蓝字</span>全局服务</span>\n        <span class=\"row\"><span class=\"lg-ha diy\">橙字</span>要自己做多 AZ</span>\n        <span class=\"row\"><span class=\"lg-ha single\">红字</span>永远单 AZ</span>", awsImg('asg'), awsImg('region'))}
      </div>
    </div></div>`;
}
const ROLE_ALIAS = { elb: ['ELB', 'ALB'], sagemaker: ['SageMaker AI', 'SageMaker'], shield: ['Shield Advanced', 'Shield'], lambda: ['Lambda@Edge', 'Lambda'] };
function roleIn(c, i) {
  const names = ROLE_ALIAS[SQ[i].k] || [SQ[i].n], depth = t => { let d = 0; return [...t].map(ch => (ch.charCodeAt(0) === 0xFF08 ? d++ : ch.charCodeAt(0) === 0xFF09 ? d-- : 0, d)); };   // 全角括号按字符码比：英文版不翻这两处，英文的流程描述用半角括号
  // 「（⇄）」整个去掉；「（入站认证，⇄）」只去掉「，⇄」，括号留着
  // 先按箭头和分号切成几段，再把段里括号外的逗号切开
  const segs = c.flow.replace(_tr(4138, "（⇄[^）]*）|，?⇄(?=）)", "g"), '').split(_tr(4139, "\\s*(?:→|⇄|←|；)\\s*|\\s\\+\\s?|\\+（", "")).flatMap(seg => { const d = depth(seg), out = []; let a = 0; [...seg].forEach((ch, k) => { if (ch.charCodeAt(0) === 0xFF0C && !d[k]) { out.push(seg.slice(a, k)); a = k + 1; } }); out.push(seg.slice(a)); return out; })
    .map(x => x.replace(_tr(4140, "^（?可选）", ""), '').replace(_tr(4141, "^（可选：?", ""), '').trim()).filter(Boolean);
  for (const n of names) { const hit = segs.filter(x => x.startsWith(n)); if (hit.length) return hit.slice(0, 2).join(LANG === 'ja' ? _t(2988, "。") : _t(408, "；")); }   // 日文两段都是完整的句子，用句号接
  for (const n of names) { const hit = segs.find(x => x.includes(n)); if (hit) return hit; }
  return '';
}
export const roleAttr = (c, i) => { const r = roleIn(c, i); return r ? ` data-role="${esc(SQ[i].n + _t(2670, "：") + r)}"` : ''; };
export function archMini(c, p) {
  const w = p ? wildOf(p, c.id) : null, lack = p ? comboMiss(p, c) : [], fill = w != null && lack.length === 1 ? lack[0] : null, fillN = fill == null ? '' : slotOpen(fill).map(i => SQ[i].n).join(_t(1815, " 或 "));
  const node = i => `<span class="an ${p && active(p, i) ? 'have' : 'miss'}"${roleAttr(c, i)}>${awsImg(SQ[i].icon)}<em>${SQ[i].n}</em></span>`;
  const wnode = t => _tf(4142, "<span class=\"an wild\" title=\"{$0} 是万能服务，{$1}\">{$2}<em>{$3}</em><small>{$4}</small></span>", SQ[w].n, t, awsImg(SQ[w].icon), SQ[w].n, t);
  const slot = n => n === fill ? wnode(_tf(4143, "顶替 {$0}", fillN)) : Array.isArray(n) ? `<span class="aor">${n.map(node).join(_t(4144, "<i>或</i>"))}</span>` : node(n);
  const flow = c.seq.map((x, k) => (k ? `<span class="aar">${cLink(c, k - 1)}</span>` : '') + (x.opt ? _tf(4145, "<span class=\"aopt\"><small>可选</small>{$0}</span>", slot(x.n)) : slot(x.n))).join('') + (w != null && fill == null ? `<span class="aar">+</span>${wnode(_t(2661, "并进来一起收"))}` : '');
  const tail = w == null ? _t(4146, "凑齐后别人落在其中任一块，按整套架构联合收费") : fill != null ? _tf(4147, "{$0} 是万能服务，顶替了缺的 {$1}，架构算凑成：别人落在这套里你的任一块（包括 {$2}），按整套联合收费；落在 {$3} 那一格照常付给它的主人", SQ[w].n, fillN, SQ[w].n, fillN) : _tf(4148, "{$0} 是万能服务，并进了这套：别人落在其中任一块，连它的过路费一起收", SQ[w].n);
  return `<div class="amini"><b>${c.n}</b><div class="aflow">${flow}</div>${c.use ? `<div class="adesc ause">${c.use}</div>` : ''}<div class="adesc">${c.flow}</div>${c.d !== '—' ? _tf(4149, "<div class=\"adesc\">另外：{$0}</div>", c.d) : ''}<div class="adesc">${tail}</div><div class="adesc ahint">${_t(4150, "鼠标移到每一块上，看它在这个架构里干什么")}</div><div class="abtnrow">${archBtns(c, p)}</div></div>`;
}
// 支柱的规则缩写（悬停卡第二行）
export let PILLAR_SHORT = __rv(() => ([_t(4151, "运维类服务每块 +1 · 写过复盘 +1"), _t(4152, "安全组服务、CloudFront 每块 +1 · 演练标记每个 +1"), _t(4153, "天生跨 AZ 的服务每块 +1 · 实例升多 AZ +1 · 多区域功能 +2"), _t(4154, "弹性扩展功能 +1 · 生效的架构每个 +1"),
  _t(4155, "降成本功能 +1 · 签 SP/RI 或用 Cost Explorer +1 · 重构技术债 +1"), _t(4156, "Serverless 每块 +1 · Graviton +1 · 数据分层 +1 · Fargate / Auto Mode +1")]), v => { PILLAR_SHORT = v; }, () => PILLAR_SHORT);
// 第 k 条支柱还能怎么补：[{ i: 服务格（有图标）, t: 做什么, c: 要花多少, g: 加几分, n: 排序用的花费 }]，便宜的在前
export function pillarItems(p, k) {
  const out = [], owned = ownedBy(p).filter(i => active(p, i) && SQ[i].upg);
  const up = (eff, g) => owned.forEach(i => { const pr = S.props[i], l = SQ[i].upg.findIndex((u, n) => n >= pr.level && effIn(u[2], eff)); if (l >= 0) { const m = l + 1 - pr.level; out.push({ i, t: _tf(4157, "{$0} 升「{$1}」", SQ[i].n, SQ[i].upg[l][0]), c: _tf(4158, "再升 {$0} 级 · ${$1}", m, Array.from({ length: m }, (_, n) => upCost(i, pr.level + 1 + n)).reduce((a, b) => a + b, 0)), g, n: Array.from({ length: m }, (_, n) => upCost(i, pr.level + 1 + n)).reduce((a, b) => a + b, 0) }); } });
  const buy = (list, g = '+1') => list.forEach(i => { const pr = S.props[i]; if (isHidden(i)) return; if (pr.owner == null) out.push({ i, t: _tf(4159, "买 {$0}", SQ[i].n), c: `$${SQ[i].p}`, g, n: SQ[i].p }); else if (pr.owner !== p.id) out.push({ i, t: `${SQ[i].n}`, c: _tf(4160, "在 {$0} 手上，要交易", S.players[pr.owner].name), g, n: 9000 + SQ[i].p }); });
  const x = pillarParts(p), canSP = (F.full() || dlcOn('finops')) && p.role !== 'indie';
  if (k === 0) { buy([IX.cloudwatch, IX.cloudtrail, IX.sfn, IX.eventbridge].filter(i => !active(p, i))); if (!p.coe.length) out.push({ t: _t(4161, "进一次维护窗口，出来时写复盘"), c: '', g: '+1', n: 50 }); }
  if (k === 1) { buy(SEC_PILLAR().filter(i => !active(p, i))); if (F.actions()) out.push({ t: _t(4162, "主动行动里做 GameDay 演练"), c: _t(4163, "每个演练标记"), g: '+1', n: 60 }); }
  if (k === 2) { up('maz', '+1'); up('mr', '+2'); buy(OWNABLE.filter(i => { const h = haTag(i); return h && (h.k === 'auto' || h.k === 'glb') && !active(p, i); })); }
  if (k === 3) { up('scale', '+1'); COMBOS.filter(comboOpen).filter(c => !hasCombo(p, c.id)).forEach(c => { const miss = c.ix.filter(n => !(Array.isArray(n) ? n : [n]).some(i => active(p, i))); if (miss.length === 1) out.push({ i: slotOpen(miss[0])[0], t: _tf(4164, "凑成「{$0}」", c.n), c: _tf(4165, "再买 {$0}", slotOpen(miss[0]).map(i => SQ[i].n).join(_t(1815, " 或 "))), g: '+1', n: SQ[slotOpen(miss[0])[0]].p }); }); }
  if (k === 4) { up('cost', '+1'); if (!x.commit) out.push({ t: canSP ? _t(4166, "签一次 Savings Plans / RI，或用掉 Cost Explorer 卡") : _t(4167, "用掉 Cost Explorer 卡"), c: '', g: '+1', n: 100 }); if (F.debt() && !p.refactored && p.techDebt) out.push({ t: _t(4168, "重构清掉 1 个技术债"), c: `$${refactorCost(p)}`, g: '+1', n: refactorCost(p) }); }
  if (k === 5) { buy(OWNABLE.filter(i => SQ[i].type === 'sls' && !active(p, i))); up('ssh', '+1'); if (!x.grav && active(p, IX.ec2)) up('cost', '+1'); }
  return out.filter((o, n, a) => a.findIndex(y => y.t === o.t) === n).sort((a, b) => a.n - b.n);
}
// 第 k 条支柱现在的分是从哪来的：[{ i, t }]
function pillarHave(p, k) {
  const x = pillarParts(p), svc = list => list.map(i => ({ i, t: SQ[i].n }));
  return [
    [...svc(x.ops), ...(p.coe.length ? [{ t: _t(2631, "写过复盘") }] : [])],
    [...svc(x.secs), ...(p.drill.length ? [{ t: _tf(2632, "演练标记 ×{$0}", p.drill.length) }] : [])],
    [...x.nat.map(i => ({ i, t: _tf(2633, "{$0} 天生跨 AZ", SQ[i].n) })), ...x.maz.map(i => ({ i, t: _tf(2634, "{$0} 升了多 AZ", SQ[i].n) })), ...x.mr.map(i => ({ i, t: _tf(4169, "{$0} 多区域（2 分）", SQ[i].n) }))],
    [...x.sc.map(i => ({ i, t: _tf(2636, "{$0} 弹性扩展", SQ[i].n) })), ...x.combos.map(c => ({ t: _tf(4170, "架构「{$0}」", c.n) }))],
    [...(p.refactored ? [{ t: _t(2638, "重构过技术债") }] : []), ...(x.commit ? [{ t: _t(2639, "签过 SP/RI 或用过 Cost Explorer") }] : []), ...x.co.map(i => ({ i, t: _tf(2640, "{$0} 降成本", SQ[i].n) }))],
    [...svc(x.sls), ...(x.grav ? [{ i: IX.ec2, t: 'EC2 Graviton' }] : []), ...x.lifecycle.map(i => ({ i, t: _tf(2641, "{$0} 数据分层", SQ[i].n) })), ...x.managedCompute.map(i => ({ i, t: _tf(2642, "{$0} 托管底层机器", SQ[i].n) }))],
  ][k];
}
export const ppRow = o => `<li>${o.i != null ? `<img src="${AWSI[SQ[o.i].icon]}" alt="">` : '<span class="ppdot"></span>'}<span class="pt">${o.t}${o.c ? `<small>${o.c}</small>` : ''}</span>${o.g ? `<b class="pg">${o.g}</b>` : ''}</li>`;
// 支柱悬停：标题、几分、够不够（要几分）、进度条、规则缩写；没达成的列 3 个最便宜的做法，已有的分是从哪来的
export function pillarPop(p, k) {
  const need = pillarNeed(), bar = (v, n, ok) => `<div class="ppbar ${ok ? 'on' : ''}"><i style="width:${Math.round(Math.min(1, v / Math.max(1, n)) * 100)}%"></i></div>`;
  if (k === 'tot') { const t = pillarTotal(p), n = waTotalNeed(), ok = t >= n; return `<div class="ppop"><div class="pph">${_tf(4173, "<b>六条总分</b><span class=\"pps\">{$0} 分</span><span class=\"ppst {$1}\">要 {$2} 分，{$3}</span>", t, ok ? 'ok' : '', n, ok ? _t(4171, "已经够了") : _tf(4172, "还差 {$0} 分", n - t))}</div>${bar(t, n, ok)}<p class="pprule">${_tf(4174, "本局要求：{$0}", waRuleText())}</p></div>`; }
  const v = pillarScore(p)[k], ok = v >= need, have = pillarHave(p, k), items = ok ? [] : pillarItems(p, k);
  return `<div class="ppop"><div class="pph">${_tf(4180, "<b>{$0}</b><span class=\"pps\">{$1} 分</span><span class=\"ppst {$2}\">要 {$3} 分，{$4}</span>", PILLARS[k], v, ok ? 'ok' : '', need, ok ? _t(4175, "已达成") : _tf(4172, "还差 {$0} 分", need - v))}</div>${bar(v, need, ok)}
    <p class="pprule">${PILLAR_SHORT[k]}</p>
    ${have.length ? _tf(4177, "<div class=\"ppsec\">已有</div><ul class=\"ppl have\">{$0}</ul>{$1}", have.slice(0, 4).map(ppRow).join(''), have.length > 4 ? _tf(4176, "<p class=\"ppmore\">还有 {$0} 项</p>", have.length - 4) : '') : ''}
    ${items.length ? _tf(4179, "<div class=\"ppsec\">怎么补（便宜的在前）</div><ul class=\"ppl\">{$0}</ul>{$1}", items.slice(0, 3).map(ppRow).join(''), items.length > 3 ? _tf(4178, "<p class=\"ppmore\">还有 {$0} 种做法，看「明细和日志」</p>", items.length - 3) : '') : ''}</div>`;
}
