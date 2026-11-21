import { P, S, debtOf } from './07-state.js';
import { ST } from './26b-retro.js';
import { sfxAll } from '../net/41-replay.js';
// ================= 金钱 =================
// 战报「钱从哪来」：每笔进到玩家手上的钱记一个来源，加到 ST(q).gain 上（rent 过路费 / salary 经过起点领的 Credits / card 卡牌和技能 /
// sell 卖回、下线、减容量拿回的 / other 其他：UG 活动、交易、代理商的分成和托管费、财报融资、地狱模式答题这些）。
// 过路费、Credits、卖回这几类在调用处写明（credit、pay、giveTo 的最后一个参数）；卡牌和技能整段用 withGain 包一层（和 withCardMul 一个做法），
// 没写明的钱按外层算，外层也没有就算「其他」。写明的优先：卡牌让你飞过起点领的还是 Credits，落到别人格子上付的还是过路费。
// 这些只在房主（单机）这边跑，联机远端只读同步来的 S
let GAIN_SRC = null;
export async function withGain(src, fn) { const g0 = GAIN_SRC; GAIN_SRC = src; try { return await fn(); } finally { GAIN_SRC = g0; } }
export const GAIN0 = () => ({ rent: 0, salary: 0, card: 0, sell: 0, other: 0 });
function gainAdd(q, amt, src) {
  if (!(amt > 0) || !S || !S.players || !S.players.includes(q)) return;
  const t = ST(q), g = t.gain || (t.gain = GAIN0()), k = src || GAIN_SRC || 'other';
  g[k] = (g[k] || 0) + amt;
}
// 离破产最近的一刻：现金减欠款的最低点和那一轮（ST(p).low，可以是负的）。钱只在付出去时往下掉，所以只在 pay 里看
function lowMark(p) {
  if (!S || !S.players || !S.players.includes(p) || !p.alive) return;
  const t = ST(p), c = p.cash - debtOf(p);
  if (!t.low || c < t.low.cash) t.low = { cash: c, r: S.round };
}
// 已经在 pay 里乘过卡牌倍率，这里按原数到账，不能再乘一次
export function giveTo(to, amt, src) { if (amt <= 0) return; if (to === 'pot') S.pot += amt; else if (to !== 'bank' && P(to).alive) { const q = P(to); q.cash += amt; gainAdd(q, amt, src); settle(q); if (amt >= 50) sfxAll('coin'); } }
// 卡牌效果里收付的钱都乘卡牌倍率；日志、按钮上的金额也用 cardAmt 算，和实际变动对上（credit/pay 也返回乘过的金额）
export const cardAmt = v => Math.round(v * (S && S.cardMul ? S.cardMul : 1));
export function credit(p, amt, src) { amt = cardAmt(amt); if (amt <= 0) return 0; p.cash += amt; gainAdd(p, amt, src); settle(p); if (amt >= 50) sfxAll('coin'); return amt; }
export function pay(p, to, amt, src) {
  amt = cardAmt(amt); if (amt <= 0) return 0;
  const tgt = (to === 'bank' || to === 'pot') ? to : to.id;
  const paid = Math.min(Math.max(p.cash, 0), amt);
  p.cash -= paid; giveTo(tgt, paid, src);
  // 欠玩家的钱记下来源：过路费欠着、过两回合还上，对方记的还是过路费，不会变成「其他」
  if (paid < amt) { const k = typeof tgt === 'number' && (src || GAIN_SRC); p.debt.push(k ? { to: tgt, amt: amt - paid, src: k } : { to: tgt, amt: amt - paid }); }
  if (S && S.players && S.players.includes(p)) { const t = ST(p); if (tgt === 'pot') t.toPot = (t.toPot || 0) + amt; else if (tgt === 'bank') t.toBank = (t.toBank || 0) + amt; }   // 结束复盘用：钱花在哪
  lowMark(p);
  return amt;   // 应付的总数（钱不够的部分记成欠款，也算在里面）
}
function settle(p) {
  while (p.debt.length && p.cash > 0) {
    const d = p.debt[0];
    // 收款人已经出局：这笔债作废。原来会照常 p.cash -= x，但 giveTo 对出局的人不入账（见上面那行的 .alive 判断），
    // 钱就凭空消失了，债主还会被 resolveDebts 一路逼着拆升级、下线、卖服务去填这个黑洞。
    if (typeof d.to === 'number' && !(P(d.to) && P(d.to).alive)) { p.debt.shift(); continue; }
    const x = Math.min(p.cash, d.amt);
    p.cash -= x; d.amt -= x;
    if (d.amt <= 0) p.debt.shift();
    giveTo(d.to, x, d.src || 'other');   // 老存档里的欠款没有来源，算「其他」；不跟着还钱那一刻外层的卡牌走
  }
}
