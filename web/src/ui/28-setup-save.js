import { LANG, __rv, _t, _tf } from '../core/01-i18n-runtime.js';
import { $, BOT, COLORS, DEMO, KEY, MY_REV, PAWN, REV_KEY, SAVE_FAIL, SIM, STALE, __set_MY_REV, __set_SAVE_FAIL, __set_STALE, awsImg, esc, homeUrl, revNow, rnd, shuffle, unesc } from '../core/02-util.js';
import { BAL, IX, MAX_ROUNDS, OWNABLE } from '../rules/03-services.js';
import { INC, REI, ROLES, roleOf, rsShort } from '../rules/04-roles-combos-cards.js';
import { DLC, dlcOn } from '../rules/05-dlc.js';
import { F, MAX_PLAYERS, S, __set_S, cur, debtOf, isWild, log, nm, resetProp, winParts, winTimed, winWA } from '../engine/07-state.js';
import { GAIN0 } from '../engine/08-money.js';
import { PHONE_MQ, TABP_MQ, ask, bgInert, focusBack, info, kbdFocus, modal, modalBlocks, viewOpen } from './10-modal.js';
import { endTurn } from '../engine/14-turn.js';
import { STORM_TXT, roleCash, skillLine, skillMulTxt, startCashOf } from '../engine/21-skills.js';
import { speedTurnStart } from '../engine/22-speed.js';
import { ST } from '../engine/26b-retro.js';
import { valSnap } from '../engine/26d-gameover.js';
import { timedOver } from './26e-manual.js';
import { buildBoard } from './27a-board.js';
import { SQPREV, __set_COMBOPREV } from './27b-arch-notes.js';
import { fmtTime } from './27c-center.js';
import { PL_OPEN, PL_ROLE, __set_SIDE_CUR, __set_SIDE_LOG0, render } from './27d-side.js';
import { BOTOUT } from '../dev/29-bot.js';
import { sfx } from './32-sfx.js';
import { FX } from './33-fx3d.js';
import { dealCast } from './34-cast.js';
import { applyBal, hellCfg, isHell, isParty, rollRoundMul } from '../rules/35-modes.js';
import { __set_AI_PAUSE, __set_aiTimer, aiTimer, isAI } from '../engine/36-ai.js';
import { MP } from '../net/40-host-sync.js';
import { mpUI } from '../net/42-setup.js';
export async function renameDialog() {
  if (!S || S.over || modalBlocks(true)) return;
  const list = (MP.role === 'client' ? [MP.mySeat] : S.players.map(q => q.id).filter(id => !(MP.role === 'host' && MP.isRemote(id)))).map(id => S.players[id]).filter(Boolean);
  if (!list.length) return;
  const q = list.length === 1 ? list[0] : S.players[await ask({ local: true, cancelable: true, cls: 'pick', title: _t(4622, "改谁的名字？"), buttons: [...list.map(x => ({ label: x.name, value: x.id })), { label: _t(2465, "取消"), value: -1 }] })];
  if (!q) return;
  const res = await modal({ local: true, cancelable: true, title: _tf(4623, "给 {$0} 改名字", q.name), inputs: [{ id: 'nm', type: 'text', label: _t(4624, "新名字（最多 12 个字）"), value: unesc(q.name), af: true }], buttons: [{ label: _t(4625, "改好了"), value: 'ok', cls: 'pri' }, { label: _t(2465, "取消"), value: 'x' }] });
  if (res.v !== 'ok') return;
  if (MP.role === 'client') { MP.send(MP.hostConn, { t: 'rename', name: String(res.inp.nm || '').slice(0, 12) }); return; }
  const why = applyRename(q.id, res.inp.nm);
  if (why) info(_t(4626, "没改成"), `<p>${why}</p>`, true);
}
export function applyRename(id, raw) {
  const q = S && S.players[id], name = esc(String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 12));
  if (!q) return _t(4627, "没有这个玩家");
  if (!name) return _t(4628, "名字不能是空的");
  if (name === q.name) return '';
  if (S.players.some(x => x.id !== id && x.name === name)) return _tf(4629, "已经有人叫 {$0} 了，换一个吧", name);
  const old = q.name; q.name = name; log(_tf(4630, "✏️ {$0} 改名为 {$1}", old, nm(q))); if (S.phase === 'roll' || S.phase === 'post') save(); render(); return '';   // 结算中途不存档，理由同 toggleAnim
}
// 屏幕下方的小提示条（不能点的按钮点一下，告诉你为什么）
export function toast(msg, ms = 2600) {
  let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), ms);
}
export function save() {
  if (BOT || DEMO || MP.role === 'client' || !S || S.over) return;   // 演示局不存：点一下就会把真存档盖掉
  if (STALE) return void staleTab();
  const rev = revNow();
  if (MY_REV >= 0 && rev && rev !== MY_REV) return void staleTab();   // 别的页面存过（版本号没了是存储被清空，不算）
  // 写不进去时以前悄悄吞掉，玩家一直以为存上了。第一次失败提示一下：一页只提示一次，写成功也不重置，免得存档大小在配额边上来回时反复弹
  try { S.tSave = Date.now(); localStorage.setItem(KEY, JSON.stringify(S)); localStorage.setItem(REV_KEY, rev + 1); __set_MY_REV(rev + 1); __set_SAVE_FAIL(false); }
  catch (e) { __set_SAVE_FAIL(true); if (!save.warned) { save.warned = true; toast(_t(4631, "浏览器存储写不进去（存满了或被禁用），这局没法自动保存：刷新或关掉页面会丢进度"), 8000); } }
}
// 别处接着打了这局或者开了新局：这里不再存档，只留一个回开局页的按钮。
// 这边的电脑、没走完的流程可能又弹别的窗把它顶掉，所以每次想存档都再弹一次
export function staleTab() {
  __set_STALE(true); clearTimeout(aiTimer); __set_aiTimer(0);
  if (!$('#modal').hidden && $('#modal .box.stale')) return;
  ask({ local: true, cls: 'stale', title: _t(4632, "这局在别处接着打了"), html: _t(4633, "<p>另一个标签页（或者另一份 index.html）接着打了这一局，或者开了新局。这里不再自动保存，免得把那边的进度盖掉。</p><p>回开局页后点「继续上一局」，接着打的是存档里最新的那一局。</p>"), buttons: [{ label: _t(3903, "回开局页"), value: true, cls: 'pri' }] }).then(() => { location.href = homeUrl(); });
}
export const npVal = () => +(document.querySelector('input[name=np]:checked') || { value: 3 }).value;
// 开局时实际用的轮数上限和限时分钟（输入框里的数夹到允许范围）：开局页摘要也按这个写，和进了游戏看到的一致
const setupRL = () => Math.min(MAX_ROUNDS, Math.max(5, Math.round(+$('#rounds').value) || 15)), setupMin = () => Math.min(600, Math.max(5, +$('#minutes').value || 90));   // 600 和输入框的 max 一致
// 多人（超过 4 人）：人数默认只有 2–4 人三格；打开开关才多出 5…MAX_PLAYERS 人（engine/07-state.js）。平衡和界面都按 2–4 人调的，开关旁边一直写着不推荐。
// 开关和多出来的格子由这里画（文字要跟语言走）：开关所在的 #npMore 换了语言才重画，不然点开关时焦点会被重画丢掉。
// 关掉时选着 5 人以上的退回 4 人；房主大厅里已经坐了 4 位以上远端玩家时关不掉（关了就有人没座位）
const npManyOn = () => !!($('#npMany') || {}).checked;
// 联机房间最多收几位（含房主）：没开「多人」还是 4 人，开了到 MAX_PLAYERS
const npMax = () => npManyOn() ? MAX_PLAYERS : 4;
const npMoreTile = k => `<label class="tile more"><input type="radio" name="np" value="${k}" data-act-change="renderNames"><b>${_tf(5395, "{$0} 人", k)}</b></label>`;
function renderNpMore() {
  const box = $('#npMore'), tiles = document.querySelector('.tiles.np'); if (!box || !tiles) return;
  const lang = box.dataset.lang !== LANG;
  if (lang) { const on = npManyOn(); box.dataset.lang = LANG; box.innerHTML = `<label class="switch" title="${_tf(5396, "人数可以选到 {$0} 人。规则、平衡和界面都是按 2–4 人设计的，人多了每人等得久、棋盘挤、侧栏要滚动", MAX_PLAYERS)}"><input type="checkbox" id="npMany" data-act-change="renderNames"${on ? ' checked' : ''}><span class="tg"></span><b>${_t(5397, "多人（超过 4 人）")}</b></label><span class="npwarn">${_t(5398, "不推荐：平衡和界面都按 2–4 人设计，尽量不开")}</span>`; }
  const mpNeed = MP.role === 'host' && !(S && S.players) && Object.keys(MP.seats).some(k => +k >= 4);
  if (mpNeed && !npManyOn()) $('#npMany').checked = true;
  const on = npManyOn(), more = tiles.querySelectorAll('.tile.more');
  if (on && (!more.length || lang)) { const c = (tiles.querySelector('input[name=np]:checked') || {}).value; more.forEach(x => x.remove()); tiles.insertAdjacentHTML('beforeend', Array.from({ length: MAX_PLAYERS - 4 }, (_, k) => npMoreTile(k + 5)).join('')); const el = c && tiles.querySelector(`input[name=np][value="${c}"]`); if (el) el.checked = true; }
  else if (!on && more.length) { const c = tiles.querySelector('input[name=np]:checked'); more.forEach(x => x.remove()); if (!c || +c.value > 4) tiles.querySelector('input[name=np][value="4"]').checked = true; }
  tiles.classList.toggle('more', on); box.classList.toggle('on', on);
  MP.seatMax = npMax();   // 房主收几位远端玩家跟着开关走（net/40d-host-msgs.js 的 admit）
}
export function renderNames() {
  renderNpMore();
  const n = npVal(), old = [...document.querySelectorAll('#names input[id^=nm]')].map(x => x.value), oldAi = [...document.querySelectorAll('#names input[id^=ai]')].map(x => x.checked), oldRs = [...document.querySelectorAll('#names input[id^=rs]')].map(x => x.checked);
  $('#names').innerHTML = Array.from({ length: n }, (_, k) => `<div class="nrow">${PAWN(COLORS[k])}<input id="nm${k}" placeholder="${_tf(4634, "玩家 {$0}", k + 1)}" value="${esc(old[k] || '')}" maxlength="12" aria-label="${_tf(4635, "玩家 {$0} 名字", k + 1)}"><label class="aiopt" title="${_t(4636, "这个座位交给电脑玩")}"><input type="checkbox" id="ai${k}" ${oldAi[k] ? 'checked' : ''}>${_t(4278, "电脑")}</label><label class="aiopt rsopt" title="${_t(4637, "这个座位当代理商（代理商模式，最多一半）")}" hidden><input type="checkbox" id="rs${k}" ${oldRs[k] ? 'checked' : ''}>${_t(4638, "代理商")}</label></div>`).join('');
  setupSum();
  if (MP.role === 'host' && !(S && S.players)) MP.renderLobby();   // 房主在大厅里改人数会整个重建名字栏：联机座位的名字锁定、「电脑」灰掉要重新套上
}
export function newGame(cfg) {
  // 开了代理商模式却没有座位当代理商（比如地狱模式自动勾上的）：等于没开，代理商的卡也不混进牌堆
  if ((cfg.dlc || []).includes('reseller') && !(cfg.rs || []).some(Boolean)) cfg.dlc = cfg.dlc.filter(k => k !== 'reseller');
  const rsOn = (cfg.dlc || []).includes('reseller'), isRsSeat = k => rsOn && !!(cfg.rs || [])[k];
  const custRoles = shuffle(ROLES.filter(r => !r.rs)), rsRoles = shuffle(ROLES.filter(r => r.rs));
  // 多人局角色牌不够分（客户角色 12 张、代理商 3 张）：一副发完再洗一副接着发，先把每种都发一遍才会重复。
  // 4 人以内用不到这一步，洗牌次数和以前一样，同一个种子开出来的局不变
  const deal = (pool, rs) => pool.shift() || (pool.push(...shuffle(ROLES.filter(r => !r.rs === !rs))), pool.shift());
  if (cfg.anim == null) { try { cfg.anim = localStorage.getItem('amono-anim') || ''; } catch (e) { cfg.anim = ''; } }   // 动画速度沿用上一局的选择
  __set_S({
    cfg, layoutVer: 2, players: [], props: {}, pot: 0, cur: 0, round: 1, phase: 'roll', doubles: 0, again: false,
    lastDice: [0, 0], lastSq: null, quarterCount: 0, actionUsed: false, log: [], over: false, winner: null, qSeen: {},   // qSeen：这一局出过的题号，保证一局不出重复题
    inc: shuffle(Array.from({ length: INC.length - 1 }, (_, k) => k + 1).filter(k => !INC[k].dlc || (cfg.dlc || []).includes(INC[k].dlc))), incDisc: [],
    rei: shuffle(Array.from({ length: REI.length - 1 }, (_, k) => k + 1).filter(k => !REI[k].dlc || (cfg.dlc || []).includes(REI[k].dlc))), reiDisc: [],
    endAt: (cfg.timed || cfg.win === 'timed') ? Date.now() + cfg.minutes * 60000 : null,
  });
  __set_AI_PAUSE(false);   // 联机「再来一局」不刷新页面：上一局点的「暂停电脑」不带进新局
  applyBal();
  OWNABLE.forEach(resetProp);
  cfg.names.forEach((name, k) => {
    const r = isRsSeat(k) ? deal(rsRoles, true) : deal(custRoles, false);
    S.players.push({ id: k, name: esc(name), color: COLORS[k], role: r.id, cash: roleCash(r, cfg), startCash: roleCash(r, cfg), pos: 0, jail: null, jailCat: 'sec', skip: 0, debt: [], techDebt: 0, coe: [], drill: [], cards: [], alive: true, speed: 0, reseller: isRsSeat(k), rsRate: 0.9 });
    if (r.id === 'unicorn' && cfg.mode !== 'hell' && S.props[IX.route53].owner == null) { S.props[IX.route53].owner = k; S.props[IX.route53].paid = 0; }   // 送的，没花钱：卖回、下线、Trusted Advisor 退款都按 $0 算，不按标价
  });
  // 代理商的起始资金 = 所有客户起始资金的总和（代理商只靠架构收过路费、地还会被客户买走，要本钱囤货）；娱乐模式只打 10 轮按估值排名，不加。
  // 有轮数上限（开局页默认 15 轮）时打满就按估值排名，囤货的本钱本身算进估值：给足总和（4 人局约 $4800）代理商 15 轮局里 86% 拿第一，
  // 只按角色卡又只有 8%，所以只在角色卡上加每位客户 BAL.rsLimitPer（$300）。不勾轮数上限时 roundLimit 是 50，按不限轮数算（见 rsShort）
  if (BAL.rsCashSum && cfg.mode !== 'party') { const cs = S.players.filter(q => !q.reseller), tot = cs.reduce((a, q) => a + q.startCash, 0); S.players.filter(q => q.reseller).forEach(q => { q.cash = q.startCash = rsShort(cfg) ? q.startCash + (BAL.rsLimitPer || 0) * cs.length : tot; }); }
  // 后走补贴：1 号位永远先走、先买地，模拟里 1 号位拿第一 28%、4 号位 21%；按出手顺序每晚一位多领 BAL.seatBonus（$50）就拉平了。
  // 只加现金、不改 startCash：技能门槛（开局资金一半）、独角兽融资、代理商按客户总和算的本钱都不跟着变
  S.players.forEach((q, k) => { q.seatBonus = (BAL.seatBonus || 0) * k; q.cash += q.seatBonus; });
  if (dlcOn('speed')) speedTurnStart(S.players[0]);   // 开局直接是 1 号位的回合，没走 startTurn：部署点数在这里补上 +1
  log(_tf(4639, "🎬 游戏开始：{$0}", S.players.map(p => _tf(3245, "{$0}（{$1}）", nm(p), roleOf(p).n)).join(_t(349, "、"))));
  if (S.players.some(q => q.seatBonus)) log(_tf(4640, "后走补贴：{$0}（1 号位先走，后面的人开局多领一点）", S.players.filter(q => q.seatBonus).map(q => `${nm(q)} +$${q.seatBonus}`).join(_t(349, "、"))));
  rollRoundMul();   // 「每轮随机」的卡牌倍率：第 1 轮也要掷（之后每轮在 nextTurn 里掷）；不是随机倍率时什么都不做
  // 战报新指标：开局时间、第 1 轮开始时的估值；最低现金从开局资金（含后走补贴）算起
  S.t0 = Date.now(); S.valHist = []; valSnap();
  S.cast = dealCast(S.players.length);   // 动画里的人物：这一局谁是韩叔、虫虫、Damo、Yuki，开局随机分，整局不变
  S.players.forEach(q => Object.assign(ST(q), { gain: GAIN0(), dice: { n: 0, pips: 0, dbl: 0 }, low: { cash: q.cash, r: 1 } }));
}
// 3D 小人和特效的预热（FX.warm，分小片做）：角色分配窗口开着时先不做，玩家正在看卡、要点「开始」，等窗口关了再做
export function enterGame() { PL_OPEN.clear(); PL_ROLE.clear(); __set_SIDE_CUR(null); __set_SIDE_LOG0(undefined); setTimeout(function warm() { if ($('#modal .rcards')) setTimeout(warm, 500); else FX.warm(); }, 1500); __set_COMBOPREV(null); for (const k in SQPREV) delete SQPREV[k]; $('#setup').hidden = true; $('#setup').style.display = 'none'; $('#game').hidden = false; buildBoard(); render(); if (S && !S.introDone && !BOT && !SIM) { S.introDone = true; const b = $('#board'); if (b) { b.classList.add('intro'); setTimeout(() => b.classList.remove('intro'), 2200); } } }
const ROLE_ICON = { garage: 'activate', legacy: 'mgn', unicorn: 'route53', fin: 'kms', ai: 'bedrock', ecom: 'cloudfront', saas: 'lambda', game: 'ec2', indie: 'training', data: 'athena', media: 's3', health: 'health', rs_dist: 'billing', rs_msp: 'support', rs_cons: 'wat' };
async function showRoles() {
  sfx('card');
  // 起始资金写本局实际的数，和玩家卡一致。地狱模式改的数卡上「地狱」那行已经写了；代理商按客户总和算，卡上没处说，这里注一句
  const cards = S.players.map((p, k) => { const r = roleOf(p), sc = startCashOf(p), rsSum = p.reseller && sc !== r.cash && BAL.rsCashSum && !isParty();
    return `<div class="rcard" style="--pc:${p.color};--d:${k * 0.35}s"><div class="rc-in"><div class="rc-back">${_tf(4647, "{$0}<span>角色卡</span>", awsImg('users'))}</div><div class="rc-front"><div class="rc-who">${PAWN(p.color)}<b>${nm(p)}</b></div>${awsImg(ROLE_ICON[r.id] || 'users')}<div class="rc-n">${r.n}</div>${dlcOn('reseller') ? `<div class="rc-rs ${p.reseller ? 'on' : ''}">${p.reseller ? _t(4638, "代理商") : _t(4641, "客户")}</div>` : ''}<div class="rc-cash">${_tf(4648, "起始资金 <b>${$0}</b>{$1}{$2}", sc, rsSum ? (rsShort(S.cfg) ? _tf(4642, "（角色卡 ${$0} + 每位客户 ${$1}）", r.cash, BAL.rsLimitPer) : _tf(4643, "（客户开局资金总和，角色卡 ${$0}）", r.cash)) : '', p.seatBonus ? _tf(4644, "，后走补贴 +${$0}", p.seatBonus) : '')}</div><div class="rc-ab">${_tf(4649, "<i>能力</i>{$0}", r.ab)}</div><div class="rc-wk">${_tf(4650, "<i>弱点</i>{$0}", r.wk)}</div>${r.sk ? `<div class="rc-ab">${_tf(4645, "<i>技能</i>总资产低于 ${$0}（开局资金的一半）才能发动，一局一次。{$1}「{$2}」：{$3}{$4}", skillLine(p), STORM_TXT, r.sk.n, r.sk.d, skillMulTxt(p))}</div>` : ''}${isHell() && r.hell ? _tf(4646, "<div class=\"rc-wk\"><i>地狱</i>{$0}</div>", r.hell) : ''}</div></div></div>`; }).join('');
  setTimeout(() => sfx('magic'), 500);
  // 「开始」留给第一个本机真人点，电脑不代点：1 号位是电脑时它 0.9 秒就替大家关了，4 人局后两张卡还没翻过来。
  // 联机时房主那台设备上全是电脑座位，就交给第一个远端玩家点（他掉线了房主还能「我来替他选」）；全是电脑就等看的人点
  const hw = [p => !isAI(p.id) && !MP.isRemote(p.id), p => !isAI(p.id)].map(f => S.players.findIndex(f)).find(i => i >= 0) ?? 0;
  await ask({ who: hw, noAI: true, cls: 'wide', title: _t(4651, "角色分配"), html: `<div class="rcards">${cards}</div>`, buttons: [{ label: _t(4652, "开始"), value: true, cls: 'pri' }] });
}
// ---------- 新手引导：第一次开局时一步步高亮 ----------
// 新手引导只自动弹一次，每步说的都要和眼前的界面对得上：手机上格子只有图标、也没有鼠标悬停，用 PHONE_MQ 分开写
const tourPillarTip = () => matchMedia('(hover:none)').matches ? _t(4653, "；点一下支柱能看到得分和还差什么。") : PHONE_MQ.matches ? (winWA() ? _t(4654, "；还差哪几条支柱，「这回合还能做什么」里会写。") : _t(2988, "。")) : _t(4655, "；鼠标停在支柱上能看到还差什么。");
let TOUR = __rv(() => ([
  { sel: '#center .gtitle .sub', t: _t(4656, "这局怎么赢"), d: () => _tf(4660, "标题下面这行是这局的设置。{$0}{$1}。{$2}{$3}", (S.cfg.dlc || []).length >= 6 && !PHONE_MQ.matches ? _tf(4657, "开的 DLC 多，这里只写「{$0} 个 DLC」，点一下能看是哪几个。", S.cfg.dlc.length) : '', winParts().map(x => x[1]).join(_t(408, "；")), winTimed() || S.cfg.roundLimit ? _t(4658, "估值是总资产再加上升级投入、生效的架构和没用掉的复盘标记，扣掉技术债，玩家卡上能看到。") : '', F.balance() && S.round <= BAL.protect ? _tf(4659, "前 {$0} 轮是新账户保护期：每笔过路费最多 $50。", BAL.protect) : '') },
  { sel: '#center .stage .row:not(.more) button, #mbar button', t: _t(4039, "掷骰子"), d: _t(4661, "轮到你时点这里掷骰子，按点数顺时针往前走。掷出对子可以再掷一次。") },
  { sel: '#board .sq.b', t: _t(4662, "棋盘上的服务"), d: () => TABP_MQ.matches ? _t(4663, "没人买的格子标的是买价，落上去可以买下；有主的格子标的是主人和这次落上来大概要付的过路费。橙底的数是整套架构的联合收费：落在架构里任一块，都按整套服务的过路费加起来收。停在哪一格，棋盘中间那张卡片也会写这次要付多少。点任意格子能看详情和高可用类型。") : PHONE_MQ.matches ? _t(4664, "手机上格子只显示图标，底边的色条是主人的颜色。停在哪一格，棋盘下面那张卡片会写这次要付多少，整套架构的会注明联合收费：落在架构里任一块，都按整套服务的过路费加起来收。点任意格子能看价格、过路费和高可用类型。") : _t(4665, "没人买的格子标的是买价，落上去可以买下；有主的格子标的是这次落上来大概要付的过路费。橙底的数是整套架构的联合收费：落在架构里任一块，都按整套服务的过路费加起来收。点任意格子能看详情，价格下面那一条是它的高可用类型：自带跨 AZ（绿）、全局服务（蓝）、要自己做多 AZ（橙）、永远单 AZ（红）。") },
  { sel: '#side .pl', t: _t(4666, "你的公司"), d: () => S.players.length >= 3   // 3 人以上玩家卡默认收起，总资产和支柱要点开才有
    ? _t(4667, "现金、估值、持有的服务和要注意的状态都在这里，点服务图标看这一格。3 人以上时卡片默认收起，点名字那一行展开，能看到总资产、每条支柱的分数、架构进度和角色说明") + tourPillarTip()
    : _t(4668, "现金、总资产、估值、持有的服务、运行费、技术债和六大支柱进度都在这里，点服务图标看这一格") + tourPillarTip() },
  { sel: '#center .stage .row.more', t: _t(4669, "资产管理和更多操作"), d: () => _tf(4672, "掷骰子前后都能做：加容量、去掉升级或容量、{$0}卖回亚马逊云科技、和别人交易（升级要落在自己那块服务上才能做）。「专属技能」平时是灰的，总资产低于开局资金一半才能点，一局一次。{$1}花总资产 4%（最低 $50）抽 re:Invent 卡的按钮在「这回合还能做什么」里，每回合一次。", isParty() ? '' : _t(4670, "缺钱时把服务下线周转、"), (F.full() || dlcOn('finops')) && cur().role !== 'indie' ? _t(4671, "「SP / RI」要手上有交运行费的计算类、数据库类服务才能点。") : '') },   // 娱乐模式不能下线，不提
  { sel: '#center .cleft', t: _t(4673, "牌堆和奖池"), d: _t(4674, "落在 Health 事件格、re:Invent 格就抽一张卡。罚款都攒进奖池，停在 User Group 活动可以抽奖拿走，也可以改抽 3 张 re:Invent 卡选一张。") },
  { sel: '#center .c-head .meta', t: _t(4675, "随时查规则"), d: _t(4676, "「玩法」先打开三分钟看完的速览，里面能切到完整手册；「图鉴」能看全部服务、架构和卡牌。") },
]), v => { TOUR = v; }, () => TOUR);
export function maybeTour(force) {
  if (BOT) return;   // 远端也弹：拿手机加入的多半是第一次玩的人。引导只在本机画，不发给房主
  if ($('#tour')) return;
  // 自动弹只弹一次，真弹出来了才记在浏览器里（见下面 show）；想再看点「新手引导」按钮
  try { if (!force && localStorage.getItem('amono-tour-off') === '1') return; } catch (e) { }
  let k = 0, scrolled = -1, fitted = -1, rzT = 0;
  const back = kbdFocus(), ov = document.createElement('div'); ov.id = 'tour'; document.body.appendChild(ov); bgInert();
  // 位置只在 show 时量一次：手机转屏、窗口拉伸后要按新布局重量，不然说明框留在旧坐标、可能跑到屏幕外，背后又是 inert，一个能点的都没有。
  // 转屏会连着来好几次 resize（地址栏收起展开也算），停了 150ms 再画；scrolled 清掉，新布局里目标不在屏幕内时重新滚过去
  const onRz = () => { clearTimeout(rzT); rzT = setTimeout(() => { if (ov.isConnected) { scrolled = fitted = -1; show(); } }, 150); };
  addEventListener('resize', onRz);
  // 引导开着时：Esc 退出，Tab 只在「跳过」「下一步」之间转；关掉后焦点还回去
  const key = e => { if (e.key === 'Escape') { e.preventDefault(); end(); } else if (e.key === 'Tab') { e.preventDefault(); const bs = [...ov.querySelectorAll('button')], i = bs.indexOf(document.activeElement); if (bs.length) bs[(i + (e.shiftKey ? -1 : 1) + bs.length) % bs.length].focus(); } };
  document.addEventListener('keydown', key);
  const end = () => { clearTimeout(rzT); removeEventListener('resize', onRz); ov.remove(); document.removeEventListener('keydown', key); bgInert(); focusBack(back); };
  const show = () => {
    // 手机布局里同一个按钮可能有两份（底部固定栏那份才看得见），挑看得见的；不在屏幕里就先滚过去再量位置
    const st = TOUR[k], mineI = st.sel === '#side .pl' && S && S.players ? (MP.role === 'client' ? MP.mySeat : S.cur) : null, all = [...document.querySelectorAll(st.sel)];
    const el = (mineI != null && all[mineI] && all[mineI].getClientRects().length ? all[mineI] : null) || all.find(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden');
    if (!el) { if (++k < TOUR.length) return show(); return end(); }
    const r0 = el.getBoundingClientRect();
    if ((r0.top < 0 || r0.bottom > innerHeight) && scrolled !== k) { scrolled = k; el.scrollIntoView({ block: 'center' }); return void setTimeout(show, 60); }
    const r = r0, pad = 6;
    const below = r.bottom + 190 < innerHeight;
    try { localStorage.setItem('amono-tour-off', '1'); } catch (e) { }
    ov.innerHTML = `<div class="spot" style="left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px"></div>
      <div class="tip" role="dialog" aria-label="${_t(4117, "新手引导")}" style="left:${Math.max(12, Math.min(innerWidth - 372, r.left))}px;top:${below ? r.bottom + 14 : Math.max(12, r.top - 184)}px"><div class="tk">${_tf(4679, "新手引导 {$0}/{$1}", k + 1, TOUR.length)}</div><b>${st.t}</b><p>${typeof st.d === 'function' ? st.d() : st.d}</p><div class="tb"><button class="sm ghost" data-x="skip" style="margin-right:auto">${_t(2926, "跳过")}</button><button class="sm pri" data-x="next">${k === TOUR.length - 1 ? _t(4677, "开始玩") : _t(4678, "下一步")}</button></div></div>`;
    // 各步文案长短不一，按说明框的实际高度决定放高亮框下面还是上面，别压住要看的东西
    { const tp = ov.querySelector('.tip'), th = tp.offsetHeight, dn = r.bottom + 14 + th + 12 <= innerHeight, up = r.top - pad - th - 8 >= 12;
      // 手机横屏只有三四百 px 高，上面 scrollIntoView 把目标滚到正中，上下都剩不到一个说明框：把目标滚到顶上再量一次，说明框就能放下面；
      // 320 高的小屏连这样也放不下，目标在顶上、说明框贴底，也只压住目标的下半截。另记 fitted：目标原本不在屏幕里时 scrolled 已经用掉了，共用一个标记就滚不动
      if (!dn && !up && fitted !== k && r.height + pad * 2 + 20 < innerHeight) { fitted = k; scrollBy(0, r.top - pad - 8); return void setTimeout(show, 60); }
      if (dn || up) tp.style.top = (dn ? r.bottom + 14 : r.top - pad - th - 8) + 'px';
      else {   // 还是放不下（屏幕更矮、页面滚到底）：放到目标左右空得多的那边，说明框收窄到放得下，宽度变了高度要重量
        const lw = r.left - pad - 20, rw = innerWidth - r.right - pad - 20, w = Math.min(360, Math.max(lw, rw));
        if (w >= 200) tp.style.width = w + 'px';
        if (w >= 200 && tp.offsetHeight + 24 <= innerHeight) { tp.style.left = (rw >= lw ? r.right + pad + 8 : r.left - pad - 8 - w) + 'px'; tp.style.top = Math.max(12, Math.min(innerHeight - tp.offsetHeight - 12, r.top)) + 'px'; }
        else { tp.style.width = ''; tp.style.top = (r.top + r.height / 2 < innerHeight / 2 ? Math.max(12, innerHeight - th - 12) : 12) + 'px'; }   // 两边也窄（收窄后比屏幕还高，「下一步」会出屏）：贴到离目标远的那头，少压一点
      } }
    ov.querySelector('[data-x=next]').onclick = () => { if (++k < TOUR.length) show(); else end(); };
    ov.querySelector('[data-x=skip]').onclick = () => end();
    ov.querySelector('[data-x=next]').focus();
  };
  setTimeout(show, 200);
}
// 第一次开局的自动引导，等轮到本机真人掷骰子再弹：1 号位是电脑时一开局就弹，第一步框住的是灰掉的「电脑在玩…」，电脑还在引导底下接着走
export function tourWhenHuman() {
  // 远端也用：远端每收到一份状态 S 就换一个对象，不能按对象认这一局；MP.isRemote 只在房主那边有用，远端按 mySeat 认自己
  const g = S, go = () => {
    if (!S || S.over || (MP.role !== 'client' && S !== g)) return;
    const mine = MP.role === 'client' ? S.cur === MP.mySeat : !isAI(S.cur) && !MP.isRemote(S.cur);
    if (!mine || S.phase !== 'roll' || !$('#modal').hidden || viewOpen()) return void setTimeout(go, 250);
    maybeTour();
  };
  go();
}
export function startFromSetup(force) {
  // 上一局还没打完（打完会删存档）就先问一句：手机竖屏首屏只有 hero 的「开始游戏」，「继续上一局」在下面；「一键开局」、网址带 ?ug=1 也是直接开
  if (!force && MP.role !== 'client') {
    let s = null; try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
    if (s && s.layoutVer === 2 && Array.isArray(s.players) && s.players.length) return void ask({ local: true, title: _t(4680, "上一局还没打完"), html: _tf(4681, "<p>存档里是第 {$0} 轮 · {$1}。开新局会把它丢掉。</p>", s.round, s.players.map(p => p.name).join(_t(349, "、"))), buttons: [{ label: _t(4682, "开新局"), value: 'n', cls: 'danger' }, { label: _t(4683, "继续上一局"), value: 'r', cls: 'pri' }] }).then(v => v === 'n' ? startFromSetup(true) : resumeGame());
  }
  if (!BOT && !DEMO && MP.role !== 'client') setupSave();   // 要在下面自动勾答题、补题库之前记：存的是开局页上的原始选择
  const n = npVal();
  const names = Array.from({ length: n }, (_, k) => $('#nm' + k).value.replace(/\s+/g, ' ').trim().slice(0, 12) || ($('#ai' + k).checked ? _tf(4684, "电脑 {$0}", k + 1) : _tf(4634, "玩家 {$0}", k + 1)));   // 名字到处当 HTML 拼进页面，newGame 里统一转义一次（这里再转一次就成了 &amp;amp;）
  names.forEach((x, k) => { let m = 2; while (names.slice(0, k).includes(names[k])) names[k] = `${x} ${m++}`; });
  const dlcSel = [...document.querySelectorAll('#dlcTiles input:checked')].map(x => x.value);
  if (dlcSel.some(k => DLC[k] && DLC[k].quiz)) $('#learn').checked = true;
  const mode0 = document.querySelector('input[name=diff]:checked').value;
  const mode = mode0 === 'party' ? 'party' : mode0 === 'study' ? 'study' : mode0 === 'hell' ? 'hell' : 'normal';
  const rs = dlcSel.includes('reseller') ? Array.from({ length: n }, (_, k) => !!($('#rs' + k) || {}).checked) : [];
  if (rs.filter(Boolean).length > Math.floor(n / 2)) return void info(_t(4685, "代理商太多了"), _tf(4686, "<p>{$0} 人局最多 {$1} 个代理商（不能超过一半）。</p>", n, Math.floor(n / 2)));
  // 勾了代理商模式却没有座位勾「代理商」：以前默默按没开处理，开局全是客户、看不出代理商在哪。现在开局前问一句（地狱模式自动带上的不问）
  if (rs.length && !rs.some(Boolean) && mode !== 'hell' && !BOT && !DEMO) return void ask({ local: true, title: _t(4687, "代理商模式还没选座位"), html: _tf(4688, "<p>勾了「代理商模式」，但名字后面没有哪个座位勾「代理商」。不选的话这局等于没开代理商模式，所有人都是客户。</p><p class=\"muted\">{$0} 人局最多 {$1} 个代理商。</p>", n, Math.floor(n / 2)),
    buttons: [{ label: _t(4689, "随机挑 1 位当代理商"), value: 'rand', cls: 'pri' }, { label: _t(4690, "这局不开代理商模式"), value: 'off' }, { label: _t(4691, "回去自己勾"), value: false }] }).then(v => {
    if (v === 'rand') { const el = $('#rs' + rnd(n)); if (el) el.checked = true; setupSum(); startFromSetup(true); }
    else if (v === 'off') { const t = document.querySelector('#dlcTiles input[value=reseller]'); if (t) t.checked = false; setupSum(); startFromSetup(true); }
    else { const el = $('#rs0'); if (el) { el.closest('.nrow').scrollIntoView({ block: 'center' }); el.focus(); } }
  });
  if (mode === 'study') { $('#learn').checked = true; if (!dlcSel.some(k => DLC[k] && DLC[k].quiz)) dlcSel.push('qclf'); }
  // 联机玩家坐进来的座位一律算真人：房主可能先勾了电脑再拉人进来，不清掉的话他整局只能看着电脑替他打
  const cfg = { names, mode, cardMul: ($('#cmul') || {}).value || '1', ai: Array.from({ length: n }, (_, k) => !MP.seats[k] && $('#ai' + k).checked), dlc: dlcSel, diff: mode === 'party' ? 'basic' : mode === 'study' ? 'std' : mode0, wa: $('#winWA').checked, timed: $('#winTimed').checked, roundLimit: mode === 'study' ? 0 : $('#winRounds').checked ? setupRL() : MAX_ROUNDS, minutes: setupMin(), learn: $('#learn').checked };
  cfg.rs = rs; cfg.rolePick = !!($('#rolePick') || {}).checked; if (mode === 'hell') hellCfg(cfg);
  newGame(cfg);
  if (MP.role === 'host') S.mpSeats = Object.keys(MP.seats).map(Number).filter(k => S.players[k]);   // 记下哪些座位是联机玩家：房主刷新后接着打，按名字把人对回这些座位
  __set_MY_REV(revNow()); enterGame(); save();   // 接手存档：从这里起，别的页面再存就会被发现
  (S.cfg.rolePick ? roleDraft() : Promise.resolve()).then(() => showRoles()).then(tourWhenHuman);
}
// 三选一挑角色：按座位顺序，每人从还没被挑走的角色里看 3 张（代理商看代理商的），挑一张；电脑随机挑。挑完按新角色重算开局资金
function roleCardMini(p, r) {
  return `<div class="rcard" style="--pc:${p.color}"><div class="rc-in"><div class="rc-front">${awsImg(ROLE_ICON[r.id] || 'users')}<div class="rc-n">${r.n}</div><div class="rc-cash">${_tf(4693, "起始资金 <b>${$0}</b>", roleCash(r, S.cfg))}</div><div class="rc-ab">${_tf(4649, "<i>能力</i>{$0}", r.ab)}</div><div class="rc-wk">${_tf(4650, "<i>弱点</i>{$0}", r.wk)}</div>${r.sk ? _tf(4692, "<div class=\"rc-ab\"><i>技能</i>「{$0}」{$1}</div>", r.sk.n, r.sk.d) : ''}${isHell() && r.hell ? _tf(4646, "<div class=\"rc-wk\"><i>地狱</i>{$0}</div>", r.hell) : ''}</div></div></div>`;
}
// 玩家图鉴：所有角色卡。起始资金按开局页现在选的模式算（地狱模式另有一套），代理商角色单独一节；开局前、对局里都能看
export function playerGallery() {
  const dv = (document.querySelector('input[name=diff]:checked') || {}).value || 'std', cfg = S && S.cfg ? S.cfg : { mode: dv === 'hell' || dv === 'party' || dv === 'study' ? dv : 'std' };
  const hell = cfg.mode === 'hell', modeN = { hell: _t(3744, "地狱模式"), party: _t(3742, "娱乐模式"), study: _t(3743, "学习模式"), std: '' }[cfg.mode] || '';
  const card = (r, k) => `<div class="rcard" style="--pc:${COLORS[k % COLORS.length]}"><div class="rc-in"><div class="rc-front">${awsImg(ROLE_ICON[r.id] || 'users')}<div class="rc-n">${r.n}</div><div class="rc-cash">${_tf(4693, "起始资金 <b>${$0}</b>", roleCash(r, cfg))}</div><div class="rc-ab">${_tf(4649, "<i>能力</i>{$0}", r.ab)}</div><div class="rc-wk">${_tf(4650, "<i>弱点</i>{$0}", r.wk)}</div>${r.sk ? _tf(4692, "<div class=\"rc-ab\"><i>技能</i>「{$0}」{$1}</div>", r.sk.n, r.sk.d) : ''}${hell && r.hell ? _tf(4646, "<div class=\"rc-wk\"><i>地狱</i>{$0}</div>", r.hell) : ''}</div></div></div>`;
  const cs = ROLES.filter(r => !r.rs), rs = ROLES.filter(r => r.rs);
  ask({ local: true, cancelable: true, view: true, cls: 'wide', title: _t(4694, "玩家图鉴"), html: `<p>${_tf(4697, "开局每人一张角色卡：起始资金、能力、弱点，加一个专属技能。技能在总资产低于自己开局资金的一半时、自己回合里发动，一局一次：{$0}。开局页勾「三选一挑角色」能自己挑，不勾就随机分。", STORM_TXT)}</p>${modeN ? _tf(4695, "<p class=\"muted\">起始资金按开局页现在选的{$0}算。</p>", modeN) : ''}
    <h4>${_tf(4698, "公司角色（{$0} 个）", cs.length)}</h4><div class="rcards">${cs.map(card).join('')}</div>${rs.length ? _tf(4696, "<h4>代理商角色（{$0} 个，开了代理商模式时代理商座位从这里抽）</h4><div class=\"rcards\">{$1}</div>", rs.length, rs.map((r, k) => card(r, k + cs.length)).join('')) : ''}`, buttons: [{ label: _t(2610, "关闭"), value: true, cls: 'pri' }] });
}
async function roleDraft() {
  const used = new Set(), pools = { c: shuffle(ROLES.filter(r => !r.rs)), r: shuffle(ROLES.filter(r => r.rs)) };
  for (const p of S.players) {
    const pool = p.reseller ? pools.r : pools.c;
    let opts = pool.filter(r => !used.has(r.id)).slice(0, 3);
    if (!opts.length) opts = shuffle([...pool]).slice(0, 3);   // 多人局这一类角色都被挑走了：和随机分一样允许重复，从全部里看 3 张
    let pick = opts[0];
    if (opts.length > 1 && !isAI(p.id) && !BOT && !SIM) {
      const v = await ask({ who: p.id, noAI: true, cls: 'wide', title: _tf(4699, "{$0} 挑一个角色", p.name), html: _tf(4700, "<p class=\"muted\">三张里挑一张，挑走的别人就拿不到了。</p><div class=\"rcards\">{$0}</div>", opts.map(r => roleCardMini(p, r)).join('')), buttons: opts.map((r, k) => ({ label: _tf(4701, "选「{$0}」", r.n), value: k, cls: k === 0 ? 'pri' : '' })) });
      pick = opts[+v] || opts[0];
    } else if (opts.length > 1) pick = opts[rnd(opts.length)];
    used.add(pick.id); p.role = pick.id;
  }
  rolesRecalc();
  log(_tf(4702, "🎴 三选一挑好了角色：{$0}", S.players.map(q => _tf(3245, "{$0}（{$1}）", nm(q), roleOf(q).n)).join(_t(349, "、"))));
  save(); render();
}
// 换了角色以后照 newGame 的算法重算开局资金：角色卡资金、代理商加成、后走补贴；独角兽开局送的 Route 53 跟着人走
function rolesRecalc() {
  const cfg = S.cfg;
  S.players.forEach(q => { q.cash = q.startCash = roleCash(roleOf(q), cfg); });
  if (S.round === 1) { if (S.props[IX.route53].owner != null && !S.props[IX.route53].level) { S.props[IX.route53].owner = null; delete S.props[IX.route53].paid; } const u = S.players.find(q => q.role === 'unicorn'); if (u && cfg.mode !== 'hell') { S.props[IX.route53].owner = u.id; S.props[IX.route53].paid = 0; } }
  if (BAL.rsCashSum && cfg.mode !== 'party') { const cs = S.players.filter(q => !q.reseller), tot = cs.reduce((a, q) => a + q.startCash, 0); S.players.filter(q => q.reseller).forEach(q => { q.cash = q.startCash = rsShort(cfg) ? q.startCash + (BAL.rsLimitPer || 0) * cs.length : tot; }); }
  S.players.forEach(q => { q.cash += q.seatBonus || 0; Object.assign(ST(q), { low: { cash: q.cash, r: 1 } }); });
  S.valHist = []; valSnap();
}
export async function resumeGame() {
  let s0, local = false; try { s0 = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s0 = null; }
  // 上一局有远端玩家、这台还没建房间：直接读档的话远端回不来，他们的座位变成在这台轮流玩，先问一句。
  // 存档先放在 s0 里不给 S：选了去建房间，S 还是空的，admit 才会收下大厅里来的人，之后点继续 reseat 才对得上座位
  if (s0 && s0.layoutVer === 2 && !s0.over && Array.isArray(s0.players) && Array.isArray(s0.mpSeats) && s0.mpSeats.some(k => s0.players[k]) && !MP.role) {
    if (MP.hosting && MP.peer && !MP.peer.open && !MP.peer.destroyed && !MP.peer.disconnected) return void toast(_t(4703, "房间还在创建，等房间号出来再点继续"));
    const names = s0.mpSeats.filter(k => s0.players[k]).map(k => s0.players[k].name).join(_t(349, "、"));   // 存档里的名字已经转义过
    const v = await ask({ local: true, title: _t(4704, "先建房间再继续？"), html: _tf(4705, "<p>上一局里 {$0} 是用自己的设备玩的。联机房间不跟存档一起保存，页面关掉或刷新以后原来的房间就没了：先创建房间，再点「继续上一局」，他们拿新房间号、用局里的名字加入，就回到原来的座位。</p><p class=\"muted\">不联机的话，他们的座位在这台上轮流玩，以后读档不再问。</p>", names), buttons: [{ label: _t(4706, "先去建房间"), value: 'mp', cls: 'pri' }, { label: _t(4707, "不联机，在这台上继续"), value: 'local' }] });
    if (v !== 'local') { mpUI('host'); document.querySelector('.sec.mp').scrollIntoView({ block: 'center' }); $('#mppwd').focus({ preventScroll: true }); return; }
    local = true;
  }
  __set_S(s0);
  if (S && S.layoutVer !== 2) { __set_S(null); try { localStorage.removeItem(KEY); } catch (e) { } info(_t(4708, "棋盘改版了"), _t(4709, "<p>上一局是旧版棋盘的存档，新版把同色服务打散到了棋盘四边，旧存档没法接着玩，已经清掉了，请开一局新游戏。</p>")); $('#resume').innerHTML = ''; return; }
  if (!S || typeof S.props !== 'object' || !Array.isArray(S.players) || !S.players.length || !S.cfg) { __set_S(null); try { localStorage.removeItem(KEY); } catch (e) { } info(_t(4710, "存档损坏"), _t(4711, "<p>上一局的存档读不出来，已经清掉了，请开一局新游戏。</p>")); $('#resume').innerHTML = ''; return; }
  applyBal();
  setTimeout(() => { if (S && !S.over && S.phase === 'post' && isAI(S.cur) && MP.role !== 'client') endTurn(); }, 1200);
  // 旧存档升级：补上新加的字段，删掉已经不用的
  Object.entries(S.props).forEach(([i, pr]) => {
    if (!pr) return;
    if (pr.stopped) { resetProp(+i); return; }   // 老版本的 Stop 状态：退回亚马逊云科技
    pr.offline = pr.offline || 0; pr.offCash = pr.offCash || 0; pr.cap = pr.cap || 0; pr.spotPaid = pr.spotPaid || 0;
    if (pr.wild && !isWild(+i)) pr.wild = null;   // 老存档：Config 以前是万能服务，绑过的解开
    delete pr.forced;
  });
  S.players.forEach(q => { q.cards = q.cards || []; q.coe = q.coe || []; q.drill = q.drill || []; q.debt = q.debt || []; q.speed = q.speed || 0; q.rsRate = q.rsRate || 0.9; if (q.rentBoost && !q.rentBoostTurns) q.rentBoostTurns = 1; q.startCash = q.startCash || startCashOf(q); q.rsCoupon = q.rsCoupon || 0; q.buyCoupon = q.buyCoupon || 0; q.commits = (q.commits || []).filter(c => c.laps > 0); });
  // 战报新指标：老存档没有估值走势，从读档这一刻开始记，mFrom 记下从第几轮起才有（战报据此不显示不全的钱从哪来、手气、最低现金）
  if (!Array.isArray(S.valHist)) { S.mFrom = S.round; S.valHist = []; valSnap(); }
  S.players.forEach(q => { const t = ST(q); t.gain = t.gain || GAIN0(); t.dice = t.dice || { n: 0, pips: 0, dbl: 0 }; t.low = t.low || { cash: q.cash - debtOf(q), r: S.round }; });
  if (S.t0 && S.tSave) S.tOff = (S.tOff || 0) + Math.max(0, Date.now() - S.tSave);   // 上次存档到现在页面是关着的，不算对局用时
  delete S.edp; S.moving = null;
  S.turnStartAt = Date.now();   // 存档里是当初轮到这一位的时刻：不重置的话，联机玩家刚坐回来房主就看到「半天没动，我来替他操作」
  // 只在结算中途才有的状态：卡牌倍率、正在记录的格子。读到了说明是老版本在结算中途存的档，清掉，不然之后卖服务、去掉升级也按卡牌倍率给钱
  delete S.cardMul; S.histSq = null;
  try { const a = localStorage.getItem('amono-anim'); if (a != null) S.cfg.anim = a; } catch (e) { }   // 动画速度跟这台设备最后一次的选择
  if (S.phase !== 'roll' && S.phase !== 'post') S.phase = 'post';
  if (S.phase !== 'roll') S.diceQ = null;   // 结算中途存下的档（上一行转成 post）：没用完的点数不留给下一次掷骰子
  // 点「退出到开局页」时限时停住了（quitGame 记下剩的时间）：从现在起接着计。用完就删，不然以后意外刷新又会把时间拨回去
  if (S.endAt && S.leftMs != null) S.endAt = Date.now() + S.leftMs;
  delete S.leftMs; delete S.aiPause; delete S.mpOff;   // 后两个是房主推给远端的此刻状态（pushState 里每次重写），存档里留下的旧值不算
  // 旧版本会把「房主先勾了电脑、后来联机玩家坐进来」的座位存成电脑（见 startFromSetup）：读档时改回真人
  if (S.cfg.ai) (S.mpSeats || []).forEach(k => { S.cfg.ai[k] = false; });
  // 选了不联机：这些座位从此在这台轮流玩，联机记录清掉，不然之后每次读档都再问一遍、开局页也一直提示先建房间。
  // 放在上一行后面：老存档里存成电脑的联机座位要先改回真人。以后想再联机照样先建房间再继续，reseat 会让非电脑座位按名字认领
  if (local) S.mpSeats = [];
  if (MP.role === 'host') MP.reseat();
  __set_MY_REV(revNow()); enterGame(); save();   // 接手存档：另一个标签页还开着这局的话会收到提示，不会再往回写
  // 直接关页面、刷新时没停表，回来可能已经到点了：先说一声，免得点「轮到下一位」才发现整局结束
  if (S.endAt && !S.over && Date.now() >= S.endAt) info(_t(4712, "限时已经到了"), _t(4713, "<p>这一位打完、点「轮到下一位」时就按估值结算。想马上收场，点「对局」菜单里的「现在结算」。</p>"), true);
}
export async function confirmNew() {
  if (modalBlocks()) return;
  if (S && S.over) return void backToSetup();   // 局已经结束，没有要丢弃的对局，不再问
  const ok = await ask({ local: true, cancelable: true, title: _t(4714, "开始新游戏？"), html: _t(4715, "当前对局会被丢弃。"), buttons: [{ label: _t(4716, "开始新游戏"), value: true, cls: 'danger' }, { label: _t(2465, "取消"), value: false }] });
  if (ok) backToSetup();
}
// 现在结算：时间到了或者不想打了（学习模式不限轮数，线下活动要能收场），按估值排名结束
export async function endNow() {
  if (!S || S.over || MP.role === 'client' || !(S.phase === 'roll' || S.phase === 'post') || modalBlocks()) return;
  const ok = await ask({ local: true, cancelable: true, title: _t(4717, "现在结算？"), html: _t(4718, "<p>按每家的估值（现金 + 服务、升级、架构的价值 − 技术债）排名，估值最高的赢。结算后这一局就结束了，不能接着打。</p>"), buttons: [{ label: _t(4719, "现在结算"), value: true, cls: 'pri' }, { label: _t(4720, "再打会儿"), value: false }] });
  if (ok && S && !S.over) { log(_t(4721, "🏁 大家决定现在结算")); timedOver(_t(4722, "大家决定现在结算")); }
}
export async function quitGame() {
  if (!$('#modal').hidden && !$('#modal').classList.contains('min')) return;
  if (MP.role === 'client') return void MP.leave();   // 远端不存档（save 对远端什么都不做），不能说「已经自动保存」；走「离开房间」，房主那边也知道他走了
  if (S && S.over) return void backToSetup();   // 结束时存档已经删了（gameOver），不能再说「已经自动保存」：和「再来一局」一样直接回开局页
  if (S && !['roll', 'post', 'over'].includes(S.phase) && !S.over) return void toast(_t(4723, "结算中，等这一步做完再退出"));
  if (modalBlocks()) return;   // 收起的查资料窗替玩家关掉再问；先看结算中，收起的是流程窗时提示「结算中」更准
  // 存档写不进去（SAVE_FAIL）时不能再说「已经自动保存」：整段换掉，限时那句（暗示回来还能接着计）也不显示；主按钮换成「取消」
  const ok = await ask({ local: true, cancelable: true, title: _t(4724, "退出这局？"), html: SAVE_FAIL ? _t(4725, "<p>浏览器存储写不进去（存满了或被禁用），这局最近的进度没存上。退出以后回不到现在这一步。</p>") : _tf(4727, "<p>对局已经自动保存。回到开局页后，点「继续上一局」就能接着玩。</p>{$0}", S && S.endAt && !S.over ? _tf(4726, "<p>限时停在 {$0}，回来接着计。</p>", fmtTime(S.endAt - Date.now())) : ''), buttons: SAVE_FAIL ? [{ label: _t(4728, "退出"), value: true, cls: 'danger' }, { label: _t(2465, "取消"), value: false, cls: 'pri' }] : [{ label: _t(4728, "退出"), value: true, cls: 'pri' }, { label: _t(2465, "取消"), value: false }] });
  // 主动退出算暂停：记下还剩多少时间，「继续上一局」时从这里接着计。意外刷新、直接关页面没走这里，照旧按真实时间算
  if (ok) { if (S && S.endAt && !S.over) S.leftMs = Math.max(0, S.endAt - Date.now()); save(); location.href = homeUrl(); }
}
export function backToSetup() { if (!STALE && revNow() === MY_REV) { try { localStorage.removeItem(KEY); } catch (e) { } } againGo(); }   // 存档被别的页面接手了就不删，那是别人还在打的局
// 「再来一局」「新游戏」沿用这一局的开局设置：开局时记下开局页表单的原始值（setupSave），回开局页时填回去（setupRestore）。
// 记在本机 localStorage；只有从这两个按钮回去才填（sessionStorage 里的标记，用一次就删），直接打开页面、刷新开局页还是默认设置。
// 联机座位的名字不记：房主重建房间后，远端按加入先后坐进座位，带的是他们自己的名字
const SETUP_KEY = 'amono-last-setup';
function setupSave() {
  const n = npVal(), val = sel => (document.querySelector(sel) || {}).value, ck = id => !!($('#' + id) || {}).checked, seats = f => Array.from({ length: n }, (_, k) => f(k));
  const v = { np: n, diff: val('input[name=diff]:checked'), cmul: val('#cmul'), dlc: [...document.querySelectorAll('#dlcTiles input:checked')].map(x => x.value), learn: ck('learn'), rolePick: ck('rolePick'), wa: ck('winWA'), winRounds: ck('winRounds'), rounds: $('#rounds').value, timed: ck('winTimed'), minutes: $('#minutes').value,
    names: seats(k => MP.seats[k] ? '' : $('#nm' + k).value), ai: seats(k => !MP.seats[k] && ck('ai' + k)), rs: seats(k => ck('rs' + k)) };
  try { localStorage.setItem(SETUP_KEY, JSON.stringify(v)); } catch (e) { }
}
// 顺序有讲究：先选人数、模式并触发它们自己的 change（重建名字栏，地狱 / 学习模式的自动勾选和锁定，默认轮数、娱乐模式的倍率），
// 再填没被锁住的 DLC、倍率、答题开关、胜利条件，最后填名字和座位。这样 HELL_AUTO、STUDY_AUTO 和手动点出来的一样，切到别的模式能正确还原
export function setupRestore() {
  let v = null;
  try { if (sessionStorage.getItem('amono-again')) { sessionStorage.removeItem('amono-again'); v = JSON.parse(localStorage.getItem(SETUP_KEY)); } } catch (e) { v = null; }
  if (!v || typeof v !== 'object') return;
  const fire = el => el.dispatchEvent(new Event('change', { bubbles: true }));
  const radio = (name, x) => { const el = [...document.querySelectorAll(`input[name=${name}]`)].find(r => r.value === String(x)); if (el && !el.checked) { el.checked = true; fire(el); } return !!el; };
  if (+v.np > 4 && $('#npMany') && !npManyOn()) { $('#npMany').checked = true; renderNames(); }   // 上一局是多人局：先打开「多人」，5 人以上的格子才有
  radio('np', v.np); radio('diff', v.diff);
  if (v.diff !== 'hell' && v.cmul && $('#cmul') && [...$('#cmul').options].some(o => o.value === String(v.cmul))) { $('#cmul').value = String(v.cmul); fire($('#cmul')); }   // 地狱模式固定 2 倍、这一项藏着
  const dlc = Array.isArray(v.dlc) ? v.dlc : [];
  document.querySelectorAll('#dlcTiles input').forEach(x => { if (x.disabled || x.checked === dlc.includes(x.value)) return; x.checked = !x.checked; fire(x); });
  const learn = $('#learn'); if (!learn.disabled && learn.closest('.switch').style.display !== 'none' && learn.checked !== !!v.learn) { learn.checked = !!v.learn; fire(learn); }
  $('#winWA').checked = !!v.wa; $('#winTimed').checked = !!v.timed; if ($('#rolePick')) $('#rolePick').checked = !!v.rolePick; if (v.minutes != null) $('#minutes').value = v.minutes;
  if (!$('#winRounds').disabled) { $('#winRounds').checked = !!v.winRounds; if (v.rounds != null) $('#rounds').value = v.rounds; }
  for (let k = 0; k < npVal(); k++) {
    const nmEl = $('#nm' + k), ai = $('#ai' + k), rs = $('#rs' + k);
    if (nmEl) nmEl.value = String((v.names || [])[k] || '').slice(0, 12);
    if (ai) ai.checked = !!(v.ai || [])[k];
    if (rs) rs.checked = !!(v.rs || [])[k];
  }
  setupSum();
}
// 回开局页并填回上一局的开局设置。自建信令服务器的参数（?peerhost= 等）带上：房主再建房间还连同一个服务器
export function againGo() {
  if (MP.role === 'host' && MP.peer && !MP.peer.destroyed) return void MP.again();
  try { sessionStorage.setItem('amono-again', '1'); } catch (e) { }
  location.href = homeUrl();
}
// 动画速度：「快」把骰子、走棋、飞行、User Group 的过场按同一比例缩短，画面不变。记在 S.cfg 里，联机时只有房主能改、随状态同步，
// 远端重播骰子也按同一档，两边不会一边还在转、一边棋子已经走了。下一局沿用这次的选择
export const animK = () => S && S.cfg && S.cfg.anim === 'fast' ? 0.6 : 1;
export function toggleAnim() {
  if (!S || MP.role === 'client') return;
  S.cfg.anim = S.cfg.anim === 'fast' ? '' : 'fast'; try { localStorage.setItem('amono-anim', S.cfg.anim); } catch (e) { }
  // 结算中途（弹窗收起时也能点菜单）不存档：存下半个回合，读档会跳过剩下的结算，卡牌倍率也会一直留着。这一步结算完自然会存
  if (S.phase === 'roll' || S.phase === 'post') save(); render(); toast(S.cfg.anim ? _t(4729, "动画速度：快（骰子、走棋、飞行都更快，画面不变）") : _t(4730, "动画速度：标准"));
}
// 单机时骰子在转：点一下屏幕或按空格直接出点数。联机不跳：房主跳了远端还在转，两边对不上
addEventListener('pointerdown', () => { if (FX.diceSpin && !MP.role) FX.diceSkip = true; }, true);
// 对局菜单（退出 / 新游戏 / 宣告破产）：重绘时记住开没开，点外面或按 Esc 收起
export const GMENU = { open: false };
document.addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('gmenu')) GMENU.open = e.target.open; }, true);
document.addEventListener('click', e => { const m = document.querySelector('.gmenu[open]'); if (m && (!m.contains(e.target) || e.target.closest('.gm button'))) { m.open = false; GMENU.open = false; } });
document.addEventListener('keydown', e => { const m = document.querySelector('.gmenu[open]'); if (m && e.key === 'Escape') { m.open = false; GMENU.open = false; m.querySelector('summary').focus(); } });
export function reportErr(e) {
  console.error(e);
  if (BOT) { BOTOUT.errors.push(String(e && e.stack || e)); return; }
  try { if (MP.role === 'host' && S && S.players && MP.isRemote(S.cur) && MP.seats[S.cur].online) MP.send(MP.seats[S.cur].conn, { t: 'toast', msg: _t(4731, "房主那边出错了：") + String(e && e.message || e).slice(0, 80) }); } catch (x) { }
  const el = $('#err'), msg = String(e && e.message || e).slice(0, 240);
  reportErr.n = el.classList.contains('on') && reportErr.last === msg ? reportErr.n + 1 : 1; reportErr.last = msg;
  // 存档没写进去时别说「已自动保存」；远端本来就不存档，刷新后是重新加入房间
  const tip = $('#game').hidden ? _t(4732, "可以刷新页面再试一次") : MP.role === 'client' ? _t(4733, "刷新页面后，用同一个房间号和局里的名字重新加入") : SAVE_FAIL ? _t(4734, "浏览器存储写不进去，这局没存上，刷新会丢进度") : _t(4735, "对局已自动保存，刷新页面后点「继续上一局」能接着玩");
  el.innerHTML = `<div class="ei" aria-hidden="true">!</div><div class="eb">${_tf(4736, "<b>出错了{$0}</b><span>{$1}</span><small>{$2}</small>", reportErr.n > 1 ? `<em>×${reportErr.n}</em>` : '', esc(msg), tip)}<button type="button" class="ecp">${_t(4737, "复制错误信息")}</button></div><button type="button" class="ex" aria-label="${_t(2610, "关闭")}">×</button><i class="ebar"></i>`;
  const hide = () => { el.classList.remove('on'); clearTimeout(reportErr.t); };
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  el.querySelector('.ex').onclick = hide;
  el.onkeydown = ev => { if (ev.key === 'Escape') hide(); };
  el.querySelector('.ecp').onclick = ev => { const b = ev.currentTarget; navigator.clipboard.writeText(String(e && e.stack || msg)).then(() => b.textContent = _t(4738, "已复制"), () => b.textContent = _t(4739, "复制失败，请截图")); };
  el.querySelector('.ebar').onanimationend = hide;
  clearTimeout(reportErr.t); if (matchMedia('(prefers-reduced-motion: reduce)').matches) reportErr.t = setTimeout(hide, 10000);
}
window.addEventListener('error', e => reportErr(e.error || e.message));
window.addEventListener('unhandledrejection', e => reportErr(e.reason));

// （从 core/43-boot.js 挪来：开局页的设置摘要；启动文件不该被别的文件引用）
export function setupSum() {
  if (typeof dlcCounts === 'function' && $('#dlcTabs')) dlcCounts();
  const rsOn = !!(document.querySelector('#dlcTiles input[value=reseller]') || {}).checked;
  document.querySelectorAll('.rsopt').forEach(e => { e.hidden = !rsOn; });
  // 代理商模式要至少一个座位勾「代理商」才生效（newGame 会把没座位的代理商模式去掉），摘要照实数，没选座位时提醒一句
  // 代理商不超过一半：勾满了，其余座位的「代理商」变灰；人数改少了、多出来的从后往前取消
  { const bx = [...document.querySelectorAll('#names input[id^=rs]')], max = Math.floor(bx.length / 2); let on = bx.filter(x => x.checked);
    for (let k = on.length - 1; k >= max; k--) on[k].checked = false;
    on = bx.filter(x => x.checked);
    bx.forEach(x => { const full = !x.checked && on.length >= max; x.disabled = full; const l = x.closest('label'); if (l) { l.classList.toggle('off', full); l.title = full ? _tf(5148, "{$0} 人局最多 {$1} 个代理商（不能超过一半）", bx.length, max) : _t(4637, "这个座位当代理商（代理商模式，最多一半）"); } }); }
  const rsSeat = rsOn && [...document.querySelectorAll('#names input[id^=rs]')].some(x => x.checked);
  const diff = document.querySelector('input[name=diff]:checked'), nDlc = [...document.querySelectorAll('#dlcTiles input:checked')].filter(x => x.value !== 'reseller' || rsSeat).length;
  // 学习模式开局时才自动补云从业者题库、勾了题库 DLC 开局时才自动打开答题（startFromSetup），摘要提前照实写出来
  const study = !!diff && diff.value === 'study', qOn = [...document.querySelectorAll('#dlcTiles input:checked')].some(x => DLC[x.value] && DLC[x.value].quiz);
  const win = [$('#winWA').checked && 'Well-Architected', study ? _t(5149, "不限轮数") : $('#winRounds').checked ? _tf(5150, "{$0} 轮", setupRL()) : _tf(5151, "最多 {$0} 轮", MAX_ROUNDS), $('#winTimed').checked && _tf(3773, "{$0} 分钟", setupMin())].filter(Boolean);
  $('#setupSum').innerHTML = `${_tf(5157, "<b>{$0} 人 · {$1}</b>", npVal(), diff ? diff.parentElement.querySelector('b').textContent : '')}${npVal() > 4 ? _t(5399, "<span class=\"warn\">（超过 4 人，不推荐）</span>") : ''}<br>${win.length ? win.join(' / ') : _t(5152, "只看谁没破产")}${nDlc ? _tf(5153, " · {$0} 个 DLC", nDlc) : ''}${rsOn && !rsSeat ? _t(5154, " · 代理商模式没选座位，不生效") : ''}${study && !qOn ? _t(5155, " · 云从业者题库") : ''}${study || qOn || $('#learn').checked ? _t(5156, " · 答题") : ''}`;
}
// （从 core/43-boot.js 挪来：setupSum 要用；分页的按钮和事件仍在启动代码里画、绑）
// 11-08 DLC 分四页：玩法拓展、题库、代理商模式、技能包。没显示的那页照样在表单里，勾了的数写在标签上
export let DLC_TABS = __rv(() => ([['play', _t(5158, "玩法拓展")], ['quiz', _t(5159, "题库")], ['rs', _t(1504, "代理商模式")], ['skill', _t(5160, "技能包")]]), v => { DLC_TABS = v; }, () => DLC_TABS);
export const dlcCat = (k, d) => d.quiz ? 'quiz' : k === 'reseller' ? 'rs' : k === 'speed' ? 'skill' : 'play';
export function dlcCounts() { if (!document.querySelector('#dlcTabs [role=tab]')) return; DLC_TABS.forEach(([c]) => { const n = document.querySelectorAll(`#dlcTiles .tile[data-cat="${c}"] input:checked`).length, el = document.querySelector(`#dlct-${c} .dlcn`); if (el) { el.hidden = !n; el.textContent = n; el.setAttribute('aria-label', _tf(5161, "已选 {$0} 个", n)); } }); }
