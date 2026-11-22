import { _t, _tf } from '../core/01-i18n-runtime.js';
import { BOT, SIM, rnd, waitAnim } from '../core/02-util.js';
import { UI } from '../core/02b-ui-port.js';
import { IX, N, OWNABLE, SQ, capU, lvFull, lvName } from '../rules/03-services.js';
import { CARDN, CATS, COMBOS, REI, REI_HAND_MAX, comboOpen } from '../rules/04-roles-combos-cards.js';
import { advanceTo } from '../rules/05-dlc.js';
import { S, cur, hasCombo, log, nm, ownedBy, owns, resetProp, sqn } from './07-state.js';
import { cardAmt, credit, giveTo, pay, withGain } from './08-money.js';
import { SP_PLANS, billAt, commitsOf, halfAt, halfSave, netWorth, runAfterRI, spActive } from './08c-costs.js';
import { capInfo, fullBack, svcLeaves, turnKey, upgradeInfo } from './09-rent.js';
import { moveSteps } from './13-move.js';
import { rollDice } from './14-turn.js';
import { land } from './15-land.js';
import { drawRei } from './16-deck.js';
import { aiName, debtCleared, drawIncident, tableOK, voteWho } from './17-health.js';
import { chFoes, pickPartner } from './25-trade.js';
import { ST } from './26b-retro.js';
import { cardMulBase, isHidden, withCardMul } from '../rules/35-modes.js';
import { isAI } from './36-ai.js';
import { MP } from '../net/40-host-sync.js';
import { fxPot } from '../net/41-replay.js';
// ================= re:Invent =================
function saTarget(p) {
  const cands = [];
  COMBOS.forEach(c => {
    if (!c.ix.flat().some(i => owns(p, i))) return;
    c.ix.forEach(n => (Array.isArray(n) ? n : [n]).forEach(i => { if (S.props[i].owner === null && !isHidden(i)) cands.push(i); }));
  });
  const dist = i => (i - p.pos + N) % N || N;
  if (cands.length) return cands.sort((a, b) => dist(a) - dist(b))[0];
  const free = OWNABLE.filter(i => S.props[i].owner === null && !isHidden(i)).sort((a, b) => dist(a) - dist(b));
  return free.length ? free[0] : null;
}
// 花钱抽 re:Invent 卡：总资产的 4%（取整到 $10），最低 $50，越有钱越贵
export const reiBuyCost = p => Math.max(50, Math.round(netWorth(p) * 0.04 / 10) * 10);
export async function buyReinvent() {
  const p = cur(), cost = reiBuyCost(p); if (S.reiBought || p.cash < cost || p.jail !== null || S.phase !== 'busy') return;
  S.reiBought = true; ST(p).spendMisc = (ST(p).spendMisc || 0) + pay(p, 'bank', cost);
  log(_tf(3259, "🎟 {$0} 花 ${$1} Credits 抽一张 re:Invent 卡（总资产的 4%）", nm(p), cost));
  await drawReinvent(p);
}
// 11-08：花钱让对手抽一张 Health 卡。价钱是自己抽 re:Invent 卡的 1.5 倍（随总资产涨）；可以指定一位、随机一位，或者付两倍让每位对手各抽一张。
// 每走一圈（经过一次 Startup 扶持）只能发一次：用过记下当时的圈数 p.incLap，过了起点 p.laps 变大才能再发。不受卡牌倍率影响（抽到的卡照常按倍率结算）
export const incSendCost = p => Math.round(reiBuyCost(p) * 1.5 / 10) * 10;
const incSendReady = p => (p.incLap ?? -1) < (p.laps || 0);
export const incSendOk = p => !!p && p.alive && p.jail === null && incSendReady(p) && chFoes(p).length > 0;
async function sendIncident(kind) {
  const p = cur(); if (!incSendOk(p)) return void UI.toast(p && !incSendReady(p) ? _t(3260, "这一圈已经发过 Health 卡了：经过 Startup 扶持以后才能再发") : _t(3261, "现在不能发 Health 卡"));
  const foes = chFoes(p), one = incSendCost(p), cost = kind === 'all' ? one * 2 : one;
  if (p.cash < cost) return void UI.toast(_tf(2981, "现金不够 ${$0}", cost));
  let ts;
  if (kind === 'all') { const n = S.players.length; ts = Array.from({ length: n - 1 }, (_, k) => S.players[(p.id + 1 + k) % n]).filter(o => o.alive); }   // 从下一位开始按座位顺序
  else if (kind === 'rand') ts = [foes[rnd(foes.length)]];
  else { const t = foes.length === 1 ? foes[0] : await pickPartner(_tf(3262, "让谁抽一张 Health 卡？（花 ${$0}）", one)); if (!t) return; ts = [t]; }
  p.incLap = p.laps || 0;
  await withCardMul(0, async () => { ST(p).spendMisc = (ST(p).spendMisc || 0) + pay(p, 'bank', cost); });
  log(_tf(3265, "🃏 {$0} 花 ${$1} 让{$2}抽一张 Health 卡", nm(p), cost, kind === 'all' ? _t(3263, "每位对手各") : kind === 'rand' ? _tf(3264, "随机挑中的 {$0} ", nm(ts[0])) : ` ${nm(ts[0])} `));
  for (const t of ts) { if (!t.alive || !p.alive || S.over) continue; await drawIncident(t); UI.render(); }
}
export function incOne() { return sendIncident('one'); }
export function incRand() { return sendIncident('rand'); }
export function incAll() { return sendIncident('all'); }
// 卡牌效果都在这层里结算：卡牌倍率（盲盒翻倍时外面已经设好）、收支记在「卡牌」名下、联机弹窗归抽卡的人选。抽卡和打出手牌共用
function asCard(p, fn) { const a0 = MP.actor; MP.actor = p.id; return withCardMul(S.cardMul || cardMulBase(), () => withGain('card', fn)).finally(() => { MP.actor = a0; }); }
// forced：已经定好是哪一张（User Group 活动三选一选中的）；fixed：效果是外面定的、不能挑（盲盒翻倍）。这两种照旧直接亮卡结算
export function drawReinvent(p, forced, fixed) { return asCard(p, () => drawReinvent0(p, forced, fixed)); }
// 只有真人在自己的画面上选：电脑、模拟和挂机测试（SIM、BOT）不弹窗，全电脑的模拟和以前一模一样
const humanPick = p => !(SIM || BOT || isAI(p.id) || !p.alive);
// 再掷一次骰子走，这次落地不能买（卡里的「再掷一次」都走这里）。只给真人，所以一定有画面。
// 点数和 doRoll 一样从 lockDice 定好的 S.diceQ 里取（掷骰子、uiAction 开始时已经定好存档），结算中途刷新不能换一个点数
async function rollNoBuy(p) { const d = rollDice(p); UI.render(); await waitAnim(UI.FX.dice(d), 1700); await moveSteps(p, d[0] + d[1]); await land(p, { noBuy: 'card' }); }
// 11-22：只给抽卡的人钱的 re:Invent 卡（领 $X），真人玩家可以四选一：领钱、前进 3 格、后退 3 格、再掷一次骰子走（这次落地不能买）。
// 电脑玩家、模拟和挂机测试一律领钱、不弹窗（humanPick）。在维护窗口里的人走不了，也直接领钱。
// done(实际到手的钱) 记日志：领钱那条和以前一样，在 credit 之后写（卡牌倍率照常由 credit 算）
// card：抽到的那张卡（弹窗标题写卡名）。DLC 卡的 run 第三个参数就是自己
export async function moneyOrMove(p, card, amt, done) {
  if (!humanPick(p) || p.jail !== null) { done(credit(p, amt)); return; }
  const at = k => { const i = (p.pos + k + N) % N; return isHidden(i) ? _t(5275, "盲盒") : SQ[i].n; };
  const v = await UI.ask({ who: p.id, title: _tf(5276, "「{$0}」：领钱，还是走一步？", card.n), html: _t(5277, "<p>这张卡只给钱。也可以不要钱，改成移动：走到的格子照常结算（经过 Startup 扶持、User Group 活动照常领钱）。</p>"),
    buttons: [{ label: _tf(5278, "领 ${$0}", cardAmt(amt)), value: 'cash', cls: 'pri', botW: 1 }, { label: _tf(5279, "前进 3 格（到 {$0}）", at(3)), value: 'fwd' }, { label: _tf(5280, "后退 3 格（到 {$0}）", at(-3)), value: 'back' }, { label: _t(5281, "再掷一次骰子（这次落地不能买）"), value: 'roll' }] });
  if (v === 'fwd' || v === 'back') { log(_tf(5282, "{$0} 不领钱，{$1} 3 格", nm(p), v === 'fwd' ? _t(5283, "前进") : _t(5284, "后退"))); await moveSteps(p, v === 'fwd' ? 3 : -3); await land(p); return; }
  if (v === 'roll') { log(_tf(5285, "{$0} 不领钱，再掷一次骰子（这次落地不能买）", nm(p))); await rollNoBuy(p); return; }
  done(credit(p, amt));
}
async function drawReinvent0(p, forced, fixed) {
  const id = forced ?? await drawRei();
  // 牌堆抽完了（卡都在各家手里）：不亮卡，改领一笔小钱（和卖掉一张卡一样 $50）
  if (id == null) { log(_tf(5472, "🎁 {$0} 想抽 re:Invent 卡，可牌堆抽完了（卡都在各家手里），改领 ${$1}", nm(p), credit(p, 50))); return; }
  // 真人自己抽的（不是保留卡）先只给自己看，四选一；只有选「现在用」才亮给大家、照旧结算
  if (forced == null && !fixed && !REI[id].keep && humanPick(p) && await reiPick(p, id) !== 'now') return;
  await UI.showCard('rei', id, p);
  log(_tf(3266, "🎁 {$0} 抽到 re:Invent #{$1}「{$2}」", nm(p), id, REI[id].n));
  await reiResolve(p, id);
}
// ---- 手牌：自己抽到、先不公开的 re:Invent 卡 ----
// 时机不对的卡（没有能升级的服务、没地方可飞、省不下钱……只能「改领 $X」）先收着，等自己的回合再打出来。
// 卡面只有主人看得到：抽卡窗、手牌窗对别人显示成「X 在看……」（UI.ask 的 priv），联机推状态时别人的手牌换成 0（net/40c-sync.js 的 stateFor）。
// 日志不写卡名，打出来的时候才写
export const handOf = p => p.hand || (p.hand = []);
const sellAmt = () => cardAmt(50);   // 卖一张卡领的钱（卡牌倍率照常算，credit 里乘）
const peekHide = p => ({ title: _tf(5407, "{$0} 在看抽到的 re:Invent 卡", p.name) });
async function reiPick(p, id) {
  const full = handOf(p).length >= REI_HAND_MAX, jail = p.jail !== null;
  log(_tf(5408, "🎁 {$0} 抽了一张 re:Invent 卡", nm(p)));
  const v = await UI.peekCard(id, p, { priv: peekHide(p), title: _tf(5409, "{$0} 抽到一张 re:Invent 卡（只有你看得到）", p.name),
    html: _tf(5410, "<p class=\"muted\">现在用就亮给大家、马上结算；收进手牌不公开，以后自己的回合再打（最多 {$0} 张）。</p>", REI_HAND_MAX),
    buttons: [{ label: _t(5411, "现在用（公开）"), value: 'now', cls: 'pri' },
      { label: full ? _tf(5412, "收进手牌（手牌满了，最多 {$0} 张）", REI_HAND_MAX) : _tf(5413, "收进手牌（不公开，{$0}/{$1}）", handOf(p).length, REI_HAND_MAX), value: 'keep', disabled: full },
      { label: _tf(5414, "卖掉，领 ${$0}", sellAmt()), value: 'sell' },
      { label: jail ? _t(5415, "丢掉，再掷一次骰子（在维护窗口里不能走）") : _t(5416, "丢掉，再掷一次骰子（这次落地不能买）"), value: 'roll', disabled: jail }] });
  if (v === 'keep') { handOf(p).push(id); log(_tf(5417, "{$0} 把这张卡收进了手牌（不公开）", nm(p))); }
  else if (v === 'sell') { S.reiDisc.push(id); log(_tf(5418, "{$0} 卖掉了这张卡，领 ${$1}", nm(p), credit(p, 50))); }
  else if (v === 'roll') { S.reiDisc.push(id); log(_tf(5419, "{$0} 丢掉这张卡，再掷一次骰子（这次落地不能买）", nm(p))); await rollNoBuy(p); }
  if (v !== 'now') UI.render();   // 玩家卡上的手牌张数、现金马上跟着变
  return v;
}
// 自己的回合里能不能动手牌：和花钱抽 re:Invent 卡一样（掷骰子前后都行，在维护窗口里不行）。uiAction 里调，那时阶段是 busy
export const handOk = p => !!p && p.alive && p.jail === null && handOf(p).length > 0;
export const handWalked = p => p.handWalk === turnKey();   // 弃牌走几格：每回合一次
export async function reiHand() { const p = cur(); if (handOk(p) && S.phase === 'busy') await asCard(p, () => handMenu(p)); }
// 手牌窗：只有一张就直接看那张；多张先挑一张。按钮上只写第几张，卡面在正文里（别人那边正文换成「X 在看手牌」）
async function handMenu(p) {
  const hide = { title: _tf(5420, "{$0} 在看手牌", p.name) };
  for (;;) {
    const hand = handOf(p); if (!hand.length) return;
    const k = hand.length === 1 ? 0 : await UI.ask({ who: p.id, priv: hide, title: _tf(5421, "{$0} 的手牌（{$1}/{$2}，只有你看得到）", p.name, hand.length, REI_HAND_MAX),
      html: `<div class="pcards">${hand.map(id => UI.cardHtml('rei', id)).join('')}</div>`, buttons: [...hand.map((_, j) => ({ label: _tf(5422, "第 {$0} 张", j + 1), value: j })), { label: _t(2465, "取消"), value: -1 }] });
    if (!(k >= 0 && k < hand.length)) return;
    const v = await handCard(p, k, hide, hand.length > 1);
    if (v !== 'back') return;
  }
}
async function handCard(p, k, hide, back) {
  const id = handOf(p)[k], walk = !handWalked(p);
  const v = await UI.ask({ who: p.id, priv: hide, title: _tf(5423, "手牌「{$0}」（只有你看得到）", REI[id].n), html: `<div class="pcards">${UI.cardHtml('rei', id)}</div>`,
    buttons: [{ label: _t(5424, "打出（亮给大家，马上结算）"), value: 'play', cls: 'pri' }, { label: _tf(5414, "卖掉，领 ${$0}", sellAmt()), value: 'sell' },
      ...[1, 2, 3].map(n => ({ label: walk ? _tf(5425, "弃牌，往前走 {$0} 格", n) : _tf(5426, "弃牌走 {$0} 格（这回合已经走过了）", n), value: 'w' + n, disabled: !walk })),
      { label: back ? _t(3031, "返回") : _t(2465, "取消"), value: back ? 'back' : 'x' }] });
  if (v === 'back' || v === 'x' || handOf(p)[k] !== id) return v;
  handOf(p).splice(k, 1);
  if (v === 'play') { await UI.showCard('rei', id, p); log(_tf(5427, "🎁 {$0} 打出手牌 re:Invent #{$1}「{$2}」", nm(p), id, REI[id].n)); await reiResolve(p, id); return v; }
  S.reiDisc.push(id);
  if (v === 'sell') { log(_tf(5428, "{$0} 卖掉一张手牌，领 ${$1}", nm(p), credit(p, 50))); return v; }
  const n = +String(v).slice(1); p.handWalk = turnKey();
  log(_tf(5429, "{$0} 丢掉一张手牌，往前走 {$1} 格", nm(p), n)); await moveSteps(p, n); await land(p);
  return v;
}
// 结算一张亮出来的 re:Invent 卡：抽到马上用的、从手牌打出来的都走这里（外面已经套好 asCard）
async function reiResolve(p, id) {
  const c = REI[id];
  if (c.keep) {
    if (id === 4 && p.role === 'fin') { S.rei.push(4); log(_t(3267, "金融合规公司不能用 Spot 卡，放回牌堆底")); return; }
    p.cards.push({ id: c.keep, used: false }); log(_tf(3268, "{$0} 获得保留卡「{$1}」", nm(p), CARDN[c.keep])); return;
  }
  S.reiDisc.push(id);
  const others = S.players.filter(o => o.alive && o.id !== p.id);
  if (c.run) { await c.run(p, others, c); return; }
  switch (id) {
    case 1: { const n = Math.min(4, COMBOS.filter(c => comboOpen(c) && hasCombo(p, c.id)).length); await moneyOrMove(p, c, 100 + 50 * n, got => log(_tf(3270, "{$0} {$1}领 ${$2} Credits", nm(p), n ? _tf(3269, "有 {$0} 个生效的架构，", n) : '', got))); break; }
    // 独立开发者的弱点就是不能签 Savings Plans / RI，这张卡也不能绕过去：没有效果、也不给保底，卡照常进弃牌堆。
    // 别人签不了（已经有一份、没有能抵扣的运行费）就改领 $50。签之前还要按下次经过时的实际账单比一比：手上的减半卡让下一圈用量
    // 掉到承诺额以下、或者技能让下一圈全免的，1 年期的承诺额等于白付，也不签、改领 $50，和减半卡「省不下钱就改领」是同一条规则
    case 3: { if (p.role === 'indie') { log(_tf(3271, "{$0} 是独立开发者，不能签 Savings Plans，这张卡没有效果", nm(p))); break; } const b = runAfterRI(p).spBase; if (!b || spActive(p)) { log(_tf(1655, "{$0} {$1}，改领 ${$2}", nm(p), b ? _t(3272, "已经有 Savings Plans 了") : _t(3273, "没有能用 Savings Plans、又要交运行费的服务"), credit(p, 50))); break; } const d = SP_PLANS[1], amt = Math.round(b * (1 - d)), h = halfAt(p, 0), before = billAt(p, 0, h), uc = p.usedCommit;
      p.commits = commitsOf(p); p.commits.push({ type: 'sp', laps: 1, d, amt, scope: 'all' }); p.usedCommit = true;
      const save = before - billAt(p, 0, h);
      if (save <= 0) { p.commits.pop(); p.usedCommit = uc; log(_tf(3279, "{$0} {$1}，签了{$2}，所以没签，改领 ${$3}", nm(p), p.runLaps > 0 && !p.runMul ? _t(3274, "下一圈运行费本来就全免") : h ? _t(3275, "手上的减半卡让下一圈用量不到承诺额") : _t(3276, "能抵扣的运行费太少"), save < 0 ? _tf(3277, "反而多交 ${$0}", -save) : _t(3278, "也省不下钱"), credit(p, 50))); break; }
      log(_tf(3280, "{$0} 签了 1 圈（1 年）Savings Plans：每圈承诺 ${$1}，抵扣原价 ${$2} 的运行费；按现在的用量，下次经过 Startup 扶持少交 ${$3}（之后新买的按原价，卖掉了承诺额照付）", nm(p), amt, b, save)); break; }
    case 5: await advanceTo(p, IX.bedrock); await land(p, { discount: 0.8 }); break;
    case 6: { const fans = await voteWho(others, _tf(3281, "{$0} 的 Keynote 精彩吗？", p.name), _tf(3282, "<p>{$0} 用 30 秒介绍了自己的公司和架构。觉得精彩就付 ${$1}。</p>", nm(p), cardAmt(50)), _tf(3283, "精彩，付 ${$0}", cardAmt(50)), _t(3284, "一般"), 0.7); fans.forEach(o => pay(o, p, 50)); log(fans.length ? _tf(3285, "{$0} 觉得精彩，各付 {$1} ${$2}", fans.map(nm).join(_t(349, "、")), nm(p), cardAmt(50)) : _tf(3286, "没人觉得精彩，{$0} 没收到钱", nm(p))); break; }
    case 7:
      if (p.techDebt > 0) { p.techDebt--; p.refactored = true; log(_tf(3287, "{$0} 考过认证，按最佳实践重构，清掉 1 个技术债", nm(p))); debtCleared(p); } else log(_tf(1645, "{$0} 没有技术债，领 ${$1}", nm(p), credit(p, 100)));
      break;
    case 9: {
      const own = ownedBy(p);
      const v = own.length ? await UI.ask({ title: _t(778, "Trusted Advisor 找到闲置资源"), html: _tf(3288, "<p>可以选一块服务按实付全额卖回亚马逊云科技（买价、升级、容量都退，不打折）；不卖就领 ${$0}。</p>", cardAmt(50)), buttons: [...own.map(i => ({ label: _tf(3289, "卖 {$0} 拿 ${$1}", SQ[i].n, fullBack(i)), value: i, botW: 0.3 })), { label: _tf(3290, "不卖，领 ${$0}", cardAmt(50)), value: 'x', cls: 'pri' }] }) : 'x';
      if (v === 'x') { log(_tf(1640, "{$0} 领 ${$1}", nm(p), credit(p, 50))); break; }
      const i = +v, full = fullBack(i);
      svcLeaves(p, i, null); resetProp(i); p.released = (p.released || 0) + 1; giveTo(p.id, full, 'sell');
      log(_tf(3291, "💱 {$0} 按 Trusted Advisor 的建议，把闲置的 {$1} 按实付全额 ${$2} 卖回亚马逊云科技", nm(p), sqn(i), full));
      break;
    }
    case 8: {
      const ups = ownedBy(p).filter(i => upgradeInfo(p, i, true).ok);
      if (!ups.length) { log(_tf(3292, "{$0} 没有能升级的服务，改领 ${$1}", nm(p), credit(p, 100))); break; }
      const i = ups.length === 1 ? ups[0] : await UI.ask({ title: _t(3293, "选一块免费升一级"), buttons: ups.map(x => ({ label: `${SQ[x].n} → ${lvName(x, S.props[x].level + 1)}`, value: x })) });
      S.props[i].level++; (S.props[i].upPaid = S.props[i].upPaid || [])[S.props[i].level - 1] = 0; log(_tf(1844, "🔧 {$0} 免费给 {$1} 升到{$2}", nm(p), sqn(i), lvFull(i, S.props[i].level))); break;
    }
    // 降价在现实里是长期的，所以管 2 圈。按现在的用量一分钱都省不下（全是 Serverless、技能让这两圈本来就全免、手上的减半卡已经管着这两圈），就改领 $50
    // 手上已经有减半卡的，新卡换掉旧卡，日志只算多省的那部分，免得把旧卡本来就管着的那圈再算一遍
    case 11: { const save = halfSave(p, 'all', 2), prev = halfSave(p, p.halfRun, p.halfLaps); if (save <= prev) { log(_tf(3294, "{$0} 按现在的用量，运行费减半也省不下钱，改领 ${$1}", nm(p), credit(p, 50))); break; }
      p.halfRun = 'all'; p.halfLaps = 2; log(_tf(3296, "{$0} 接下来 2 次经过 Startup 扶持时运行费减半（Savings Plans 承诺额照付）：按现在的用量一共大约少交 ${$1}{$2}", nm(p), save, prev ? _tf(3295, "（手上那张减半卡本来就能省 ${$0}，换成这张多省 ${$1}）", prev, save - prev) : '')); break; }
    case 12: { const x = S.pot; if (x) fxPot(p, 20); S.pot = 0; if (x) giveTo(p.id, x); log(_tf(3297, "{$0} 拿走奖池 ${$1}", nm(p), x)); break; }
    case 14: {
      const cs = ownedBy(p).filter(i => capInfo(p, i).ok);
      if (!cs.length) { log(_tf(3298, "{$0} 没有能加容量的服务，改领 ${$1}", nm(p), credit(p, 100))); break; }
      const i = cs.length === 1 ? cs[0] : +(await UI.ask({ title: _t(3299, "Hackathon 拿了奖：免费给哪块加 1 份容量？"), buttons: cs.map(x => ({ label: _tf(3300, "{$0}（现在 {$1} 个{$2}）", SQ[x].n, S.props[x].cap || 0, capU(SQ[x].k)), value: x })) }));
      { const pr = S.props[i]; pr.capFree = Math.min(pr.capFree || 0, pr.cap || 0) + 1; pr.cap = (pr.cap || 0) + 1; }   // 免费的容量记下来：卖回、拆掉、估值都不算钱（规则书 §7.2）
      log(_tf(3301, "➕ {$0} 用 Hackathon 奖品给 {$1} 免费加了 1 个{$2}（这是容量，不是升级：每个让过路费 +25%，现在 {$3} 个；级别还是{$4}）", nm(p), sqn(i), capU(SQ[i].k), S.props[i].cap, lvFull(i, S.props[i].level)));
      break;
    }
    case 15: { const d = 1 + rnd(6); log(_tf(3302, "{$0} 掷出 {$1}，前进 {$2} 格", nm(p), d, d)); await moveSteps(p, d); await land(p); break; }
    case 16: {
      let miss = null;
      if (tableOK(others)) {
        const hum = others.filter(o => !isAI(o.id)), bots = others.filter(o => isAI(o.id));
        const r = await UI.modal({ who: hum[0].id, title: _t(3303, "技术分享会：每人讲一个亚马逊云科技知识点"), html: _tf(3305, "<p>{$0} 轮流讲，大家一起判断讲没讲出来。</p>{$1}", hum.map(o => o.name).join(_t(349, "、")), bots.length ? _tf(3304, "<p class=\"muted\">{$0} 讲出来了。</p>", bots.map(aiName).join(_t(349, "、"))) : ''),
          inputs: [{ type: 'header', label: _tf(3306, "讲不出来的勾上（每人付 {$0} ${$1}）", p.name, cardAmt(20)) }, ...hum.map(o => ({ id: 'm' + o.id, type: 'checkbox', label: o.name }))], buttons: [{ label: _t(3307, "都判完了"), value: true, cls: 'pri' }] });
        miss = o => !isAI(o.id) && !!r.inp['m' + o.id];
      }
      for (const o of others) {
        const ok = miss ? !miss(o) : isAI(o.id) ? true : await UI.ask({ who: o.id, title: _tf(3308, "{$0} 讲一个亚马逊云科技知识点", o.name), html: _t(3309, "<p>讲出来了吗？大家一起判断。</p>"), buttons: [{ label: _t(3233, "讲出来了"), value: true, cls: 'pri' }, { label: _tf(3310, "讲不出来（付 ${$0}）", cardAmt(20)), value: false }] });
        if (!ok) log(_tf(3311, "{$0} 没讲出来，付给 {$1} ${$2}", nm(o), nm(p), pay(o, p, 20)));
      }
      break;
    }
    case 17: { const t = saTarget(p); if (t === null) { log(_tf(3312, "{$0} 没有可以飞的地方，改领 ${$1}", nm(p), credit(p, 100))); break; } log(_tf(3313, "{$0} 飞向 {$1}", nm(p), sqn(t))); await advanceTo(p, t); await land(p); break; }
    case 19: {
      const cat = await UI.ask({ title: _t(3314, "入选亚马逊云科技 Community Builders：领哪一类复盘标记？"), html: _t(866, "<p>复盘标记以后可以抵消一张同类的 Health 事件卡。</p>"), buttons: Object.entries(CATS).map(([k, n]) => ({ label: n, value: k })) });
      p.coe.push({ cat, used: false, text: _t(3315, "Community Builders 分享的经验") }); log(_tf(3316, "📝 {$0} 入选 Community Builders，领到 1 个{$1}类复盘标记", nm(p), CATS[cat]));
      break;
    }
    case 20: {
      const dist = i => (i - p.pos + N) % N || N;
      const t = OWNABLE.filter(i => S.props[i].owner === null && !isHidden(i)).sort((a, b) => dist(a) - dist(b))[0];
      if (t === undefined) { log(_tf(3317, "{$0} 没有可以去的地方，改领 ${$1}", nm(p), credit(p, 100))); break; }
      await advanceTo(p, t); await land(p, { discount: 0.8 });
      // 不买（或者买不起）也不白跑：领卡上写的钱（按这次的卡牌倍率）
      if (p.alive && S.props[t].owner !== p.id) log(_tf(3318, "{$0} 没买 {$1}，领 ${$2}", nm(p), sqn(t), credit(p, 100)));
      break;
    }
    case 21: {
      // 升级按顺序叠，Graviton 是 EC2 第 3 级：只有已经升到 Auto Scaling 才能当场换。还没到的不能顺手送「多 AZ」（和换芯片无关），
      // 改成记一次免费（p.gravFree），等升 Graviton 这一级时在 upgradeInfo 里用掉。
      // 已经记过一次的不再当场换：那样会把记下的那次一起清掉，两张卡只换来一次。改领 $50，记下的那次留着
      const ec = S.props[IX.ec2], mine = owns(p, IX.ec2);
      if (mine && ec.level === 2 && !p.gravFree && upgradeInfo(p, IX.ec2, true).ok) { ec.level = 3; (ec.upPaid = ec.upPaid || [])[2] = 0; log(_tf(3319, "🔧 {$0} 免费给 {$1} 换上「Graviton」", nm(p), sqn(IX.ec2))); }
      else if (mine && ec.level < 3 && !p.gravFree) { p.gravFree = 1; log(_tf(3322, "{$0} 的 {$1} {$2}，先记一次免费：以后升 Graviton 这一级不花钱", nm(p), sqn(IX.ec2), ec.level < 2 ? _t(3320, "还没升到 Auto Scaling") : _t(3321, "现在升不了"))); }
      else log(_tf(1628, "{$0} {$1}，领 ${$2}", nm(p), !mine ? _t(3323, "没有 EC2") : ec.level >= 3 ? _tf(3324, "的 {$0} 已经是 Graviton", sqn(IX.ec2)) : _t(3325, "已经记过一次免费换 Graviton（那次还留着）"), credit(p, 50)));
      break;
    }
  }
}

