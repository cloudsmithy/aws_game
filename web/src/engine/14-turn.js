import { _t, _tf } from '../core/01-i18n-runtime.js';
import { BOT, COLORS, STALE, esc, rnd, sleep, waitAnim } from '../core/02-util.js';
import { UI } from '../core/02b-ui-port.js';
import { BAL, OFFLINE_MIN, SQ } from '../rules/03-services.js';
import { CATS, ROLES, roleOf } from '../rules/04-roles-combos-cards.js';
import { dlcOn } from '../rules/05-dlc.js';
import { askQuestion, pickQuestion, qPoolS } from '../rules/06-qbank.js';
import { P, S, availCard, cur, inPlay, log, nm, ownedBy, sqn, winTimed } from './07-state.js';
import { GAIN0, credit, pay } from './08-money.js';
import { netWorth } from './08c-costs.js';
import { bringOnline, canOnline, downTick, offRounds, turnKey } from './09-rent.js';
import { goReiCards, jailMax, moveSteps, sendToJail } from './13-move.js';
import { land } from './15-land.js';
import { RF_JAIL } from './17-health.js';
import { drawReinvent } from './18-reinvent.js';
import { resolveDebts } from './20-bankrupt.js';
import { speedRoll, speedTurnStart } from './22-speed.js';
import { checkOver, pillarLog, waWinner } from './26a-pillars-win.js';
import { ST } from './26b-retro.js';
import { gameOver, valSnap } from './26d-gameover.js';
import { isHell, isParty, rollRoundMul, withCardMul } from '../rules/35-modes.js';
// ================= 回合 =================
export function rollDice(p) {
  const cd = S.cheatDice && S.cheatDice[p.id]; if (cd) { delete S.cheatDice[p.id]; if (S.diceQ) S.diceQ.shift(); }   // 作弊码 :dice 定下的点数用一次
  const d = cd || (S.diceQ && S.diceQ.shift()) || [1 + rnd(6), 1 + rnd(6)];   // 先从掷骰前存好的点数里取（见 lockDice）
  S.lastDice = d; S.rollId = (S.rollId || 0) + 1;
  { const t = ST(p), x = t.dice || (t.dice = { n: 0, pips: 0, dbl: 0 }); x.n++; x.pips += d[0] + d[1]; if (d[0] === d[1]) x.dbl++; }   // 战报的手气：维护窗口里掷的、回滚重发重掷的都算一次
  log(_tf(2907, "🎲 {$0} 掷出 {$1} + {$2} = {$3}{$4}", nm(p), d[0], d[1], d[0] + d[1], d[0] === d[1] ? _t(2906, "（对子）") : ''));
  return d;
}
// 掷骰前把这一把点数（连同高速部署「回滚重发」可能要用的几把，最多 6 次）先定下来存进存档：
// 结算中途刷新、点「继续上一局」，回到掷骰前也还是这几个数，不能靠刷新挑落点、躲过路费和 Health 卡。这一步结算完（afterAction）、下一位开始时清掉
function lockDice() { if (S.diceQ) return true; S.diceQ = Array.from({ length: 7 }, () => [1 + rnd(6), 1 + rnd(6)]); UI.save(); return !STALE; }
export async function doRoll() {
  // modalBlocks 放在最后：前面的条件不让掷时，不能先把窗关了
  if (!S || S.phase !== 'roll' || (!BOT && Date.now() - (S.turnStartAt || 0) < 300) || UI.modalBlocks()) return;
  const p = cur(); if (p.jail !== null) return;
  if (!lockDice()) return;   // 这局已经在别的标签页接着打了：不再掷
  S.phase = 'busy'; UI.render();
  try {
    let d = rollDice(p), adj = 0;
    UI.render(); await waitAnim(UI.FX.dice(d), 1700);
    if (dlcOn('speed')) ({ d, adj } = await speedRoll(p, d));
    const dbl = d[0] === d[1];
    if (dbl) S.doubles++;
    if (dbl && S.doubles >= 3) { log(_t(2911, "连掷 3 次对子：API 被限流")); await sendToJail(p, 'avail', _t(2912, "同一回合连掷 3 次对子：请求发得太猛，API 被限流（Throttling）了。")); }
    else { S.again = true; await moveSteps(p, d[0] + d[1] + adj); await land(p); S.again = S.again !== false && dbl && p.jail === null && p.alive && !p.skip; if (dbl && isParty() && p.alive && p.jail === null) { log(_tf(2913, "🎟 娱乐模式：{$0} 掷出对子，送一张 re:Invent 卡", nm(p))); await drawReinvent(p); } }
    await hellPopQuiz(p);
  } catch (e) { UI.reportErr(e); }
  await afterAction();
}
// 地狱模式随机掉题：每次掷完骰子、这一步结算完，有 1/3 的概率给这位玩家掉一道题；答对领 $50，答错扣 $50 进奖池（不能跳过）
async function hellPopQuiz(p) {
  if (!isHell() || !p.alive || S.over || Math.random() >= (BAL.popQuiz ?? 1 / 3)) return;
  const g = qPoolS(SQ[p.pos]), x = pickQuestion(g);
  const ok = await askQuestion(x.q, x.id, _t(2914, "地狱模式随机掉题：答对领 $50，答错扣 $50"), { again: x.again, skip: false });
  { const t = ST(p); t.quizN++; if (ok) t.quizOk++; }
  await withCardMul(0, async () => { if (ok) { credit(p, 50, 'other'); log(_tf(2915, "{$0} 答对随机掉的题，领 $50", nm(p))); } else { pay(p, 'pot', 50); log(_tf(2916, "{$0} 答错随机掉的题，扣 $50 进奖池", nm(p))); } });
  UI.render();
}
export async function jailAct(kind) {
  if (!S || S.phase !== 'roll' || (!BOT && Date.now() - (S.turnStartAt || 0) < 300) || UI.modalBlocks()) return;
  const p = cur(); if (p.jail === null) return;
  if (p.jailCat === RF_JAIL) kind = 'stay';   // 清技术债进来的只能停够一轮，不能付钱、用卡提前出来
  S.phase = 'busy'; UI.render();
  try {
    if (kind === 'pay') { pay(p, 'pot', BAL.jailFee); await leaveJail(p, _tf(5669, "付 ${$0} 开 Support Case", BAL.jailFee)); await resolveDebts(); if (checkOver()) return; if (!cur().alive) return nextTurn(); S.phase = 'roll'; UI.save(); UI.render(); return; }
    if (kind === 'es') { const c = availCard(p, 'ES'); if (c) { c.used = true; await leaveJail(p, _t(2918, "用掉 Enterprise Support")); } S.phase = 'roll'; UI.save(); UI.render(); return; }
    // 停一轮：这回合不走；停够了（传统企业上云要 2 轮）就出来，下回合照常掷骰子
    p.jail++;
    const max = jailMax(p);
    if (p.jail >= max) await leaveJail(p, _tf(2919, "停了 {$0} 轮", max));
    else log(_tf(5670, "{$0} 在维护窗口里停一轮（{$1}/{$2}），下回合再停一轮或交 ${$3} 出来", nm(p), p.jail, max, BAL.jailFee));
    S.again = false;
  } catch (e) { UI.reportErr(e); }
  await afterAction();
}
async function leaveJail(p, why) {
  p.jail = null;
  log(_tf(2921, "🔓 {$0} 离开维护窗口：{$1}", nm(p), why));
  if (p.jailCat === RF_JAIL) return;   // 清技术债不是事件，没有根因可复盘
  const r = await UI.modal({
    title: _t(2922, "写复盘"),
    html: _tf(2923, "<p>{$0} 离开维护窗口。用一句话讲清这次事件（{$1}）的根因，可以领 1 个复盘标记，以后抵消一张同类 Health 事件卡。</p>", nm(p), CATS[p.jailCat]),
    inputs: [{ id: 't', label: _t(2924, "根因（必填，至少 4 个字）"), type: 'textarea' }],
    buttons: [{ label: _t(2925, "讲完了，领复盘标记"), value: true, cls: 'pri' }, { label: _t(2926, "跳过"), value: false }],
  });
  if (r.v && (r.inp.t || '').trim().length < 4 && !BOT) { log(_tf(2927, "{$0} 没写根因，这次不领复盘标记", nm(p))); return; }
  if (r.v) { p.coe.push({ cat: p.jailCat, used: false, text: r.inp.t || '' }); log(_tf(2928, "📝 {$0} 写了复盘{$1}，领到 1 个{$2}类复盘标记", nm(p), r.inp.t ? _t(2670, "：") + esc(r.inp.t) : '', CATS[p.jailCat])); }
}
async function afterAction() {
  S.diceQ = null;   // 这一把的点数用完了；对子再掷时重新定
  for (const q of S.players) await goReiCards(q);
  await resolveDebts();
  if (checkOver()) return;
  if (!cur().alive) return nextTurn();
  if (S.extraTurn && !S.again && cur().jail === null && !cur().skip) { S.extraTurn = false; S.again = true; S.doubles = 0; log(_tf(2929, "⚡ {$0} 加开一班，再走一次", nm(cur()))); }
  // 真人玩家掷完骰子不自动跳到下一位：还要资产管理、交易、抽卡的，点「轮到下一位」才结束回合（电脑玩家由 aiKick 在 post 阶段自动结束）
  if (!S.again && !BOT) { S.phase = 'post'; UI.save(); UI.render(); return; }
  S.phase = S.again ? 'roll' : 'post';
  UI.save(); UI.render();
}
export async function endTurn() {
  if (!S || S.phase !== 'post') return;
  // 收起的查资料窗留着不关的话，下一位是电脑时 aiKick 会一直等它关掉，主按钮却写着「电脑在玩」，看着像卡住
  if (!BOT && UI.MODAL_CUR && UI.MODAL_CUR.cancelable && UI.modalMin()) UI.MODAL_CUR.cancel();
  S.phase = 'busy'; await nextTurn();
}
export async function nextTurn() {
  pillarLog();
  const p = cur(), wa = waWinner();
  if (wa) return gameOver(wa, _t(2930, "六大支柱全部达成"), 'wa');
  if (winTimed() && Date.now() >= S.endAt) return UI.timedOver();
  if (S.cfg.roundLimit && S.round >= S.cfg.roundLimit && S.cur >= S.players.length - 1 - [...S.players].reverse().findIndex(q => q.alive && !(q.joinRound > S.round))) return UI.timedOver(_tf(2931, "打满 {$0} 轮", S.cfg.roundLimit));
  let n = S.cur;
  // 中途加入的（joinPlayer）从 joinRound 那一轮才开始走：转回 0 号之前的座位还在这一轮，之后的是下一轮
  do { n = (n + 1) % S.players.length; } while (!P(n).alive || P(n).joinRound > S.round + (n <= S.cur ? 1 : 0));
  if (n <= S.cur) { S.round++; rollRoundMul(); valSnap(); }
  S.cur = n;
  await startTurn();
}
// 一位玩家开局时的全部字段：开局（ui/28-setup-save.js 的 newGame）和联机中途加入（joinPlayer）共用。name 是原文，这里转义
export const makePlayer = (id, name, r, cash, reseller = false) => ({ id, name: esc(name), color: COLORS[id], role: r.id, cash, startCash: cash, pos: 0, jail: null, jailCat: 'sec', skip: 0, debt: [], techDebt: 0, coe: [], drill: [], cards: [], hand: [], alive: true, speed: 0, reseller, rsRate: 0.9 });
// 联机中途加入（房主同意后由 net/40d-host-msgs.js 的 admit 调）：排在座位最后，站在起点，没有服务和卡牌。
// 角色从还没人用的客户角色里随机挑（都用过了就随便一个客户角色）；起始资金是还活着的各家总资产的平均数，取整到 $10；
// 这一轮已经排好了，从下一轮开始走（nextTurn 按 joinRound 跳过）
export function joinPlayer(name) {
  const id = S.players.length, alive = S.players.filter(q => q.alive), cust = ROLES.filter(r => !r.rs), used = new Set(S.players.map(q => q.role));
  const free = cust.filter(r => !used.has(r.id)), pool = free.length ? free : cust, r = pool[rnd(pool.length)];
  const base = alive.some(q => !q.reseller) ? alive.filter(q => !q.reseller) : alive;   // 代理商开局资金是客户的总和，算进来会把平均数抬得很高：只按客户算
  const cash = Math.round(base.reduce((a, q) => a + netWorth(q), 0) / Math.max(1, base.length) / 10) * 10;
  const p = makePlayer(id, name, r, cash); p.joinRound = S.round + 1;
  S.players.push(p);
  Object.assign(ST(p), { gain: GAIN0(), dice: { n: 0, pips: 0, dbl: 0 }, low: { cash, r: p.joinRound } });
  log(_tf(5553, "🔌 {$0} 中途加入，起始资金 ${$1}，从第 {$2} 轮开始", nm(p), cash, p.joinRound));
  return p;
}
async function startTurn() {
  const p = cur();
  S.diceQ = null;   // 上一位没走到 afterAction 就结束（三连对子进维护窗口等）时剩下的点数不留给下一位
  S.actionUsed = false; S.doubles = 0; S.again = false; S.lastCard = null; S.reiBought = false; S.aucFx = null;
  downTick(p);   // 强制下线到期恢复（DDoS、Health 卡），不管开没开高速部署
  if (dlcOn('speed')) speedTurnStart(p);
  if (p.rentBoost && --p.rentBoostTurns <= 0) { p.rentBoost = 0; log(_tf(2932, "{$0} 的「{$1}」结束了", nm(p), roleOf(p).sk.n)); }
  if (p.subsTurns > 0) { p.subsTurns--; S.players.filter(o => inPlay(o) && o.id !== p.id).forEach(o => pay(o, p, p.subsAmt, 'card')); log(_tf(2933, "{$0} 的「{$1}」：每位对手付订阅费 ${$2}（还剩 {$3} 次）", nm(p), roleOf(p).sk.n, p.subsAmt, p.subsTurns)); await resolveDebts(); if (checkOver()) return; }
  ownedBy(p).forEach(i => { if (S.props[i].impaired) { S.props[i].impaired = false; log(_tf(2934, "{$0} 恢复正常", sqn(i))); } });
  for (const i of ownedBy(p)) {
    const pr = S.props[i]; if (!pr.offline || pr.offTurn === turnKey()) continue;
    if (pr.offTurnSeen !== turnKey()) { pr.offline++; pr.offTurnSeen = turnKey(); }
    // 下线固定 OFFLINE_MIN 轮：满了就在回合开始自动、免费恢复，不再问要不要花钱上线。
    // 这几轮里主人自己落到这一格可以提前免费拉起来（land 里处理），别人落上来可以付原价买走
    if (!canOnline(i)) { log(_tf(2935, "⏹ {$0} 下线第 {$1} 轮，满 {$2} 轮自动恢复；主人落到这一格可以提前免费拉起来，别人落上来可以付原价买走", sqn(i), offRounds(i), OFFLINE_MIN)); continue; }
    bringOnline(p, i);
  }
  if (p.skip > 0) { p.skip--; log(_tf(2941, "⏸ {$0} 停一轮", nm(p))); S.phase = 'busy'; UI.render(); await sleep(400); return nextTurn(); }
  S.phase = 'roll'; S.turnStartAt = Date.now(); UI.save(); UI.render();
}
export async function uiAction(fn) {
  if (!S || (S.phase !== 'roll' && S.phase !== 'post') || UI.modalBlocks()) return;
  // 先把点数定下来存进存档（lockDice）：卡里的「再掷一次骰子」（engine/18-reinvent.js 的 rollNoBuy）也从这里取，结算中途刷新回到这一步前，再来一次掷出的还是同一个数
  if (!lockDice()) return;
  const prev = S.phase, wasIn = cur().jail !== null; S.uiPrev = prev; S.nextPhase = null; S.phase = 'busy'; UI.render();
  try { await fn(); } catch (e) { UI.reportErr(e); }
  await resolveDebts();
  if (checkOver()) return;
  if (!cur().alive) return nextTurn();
  if (prev === 'roll' && !wasIn && cur().jail !== null) S.nextPhase = 'post';   // 掷骰子前抽卡之类的被送进维护窗口：这回合到此为止
  S.phase = S.nextPhase || prev; S.nextPhase = null; UI.save(); UI.render();
}

