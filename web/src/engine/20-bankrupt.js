import { _t, _tf } from '../core/01-i18n-runtime.js';
import { UI } from '../core/02b-ui-port.js';
import { BAL, OFFLINE_OK, OWNABLE, SQ } from '../rules/03-services.js';
import { P, S, comboOn, cur, debtOf, log, nm, ownedBy, resetProp, sqn } from './07-state.js';
import { giveTo } from './08-money.js';
import { buyPaid, capPaidSum, sellCap, sellProp, sellUpgrade, sellValue, sellZhe, stripValue, svcLeaves, takeOffline, upPaidSum } from './09-rent.js';
import { dropTraps } from './18-reinvent.js';
import { manage } from './23-manage.js';
import { evt } from './26b-retro.js';
import { isParty } from '../rules/35-modes.js';
import { isAI } from './36-ai.js';
import { MP } from '../net/40-host-sync.js';
import { sfxAll } from '../net/41-replay.js';
// ================= 破产 =================
const canOff = i => OFFLINE_OK.has(SQ[i].k) && !S.props[i].offline && !isParty();
// 不卖服务能凑多少：容量、升级按实付退一半，能下线的再拿买价一半
// 最多能凑多少：全部卖回亚马逊云科技
export const raiseValue = p => ownedBy(p).reduce((a, i) => a + sellValue(i), 0);
function autoLiquidate(p) {
  // 先拆容量、去掉升级、下线（服务还在手上），还不够才整块卖回：先卖「房子」再卖「地」，和玩家的预期一致。
  // 原来是「拆完也不够就直接整块卖」，一块带升级的服务会连地一起卖掉（玩家以为只会去掉升级）。
  // 例外：拆开只退一半、整块连升级能拿 8 折，只有「先拆再卖」凑不够、整块卖才凑得够时才直接整块卖，免得多拆反倒破产
  const stripFirst = ownedBy(p).reduce((a, i) => { const pr = S.props[i]; return a + stripValue(i) + Math.max(0, Math.round(buyPaid(i) * BAL.sell) - (pr.offline ? pr.offCash || 0 : 0)); }, 0) >= debtOf(p);
  if (stripFirst) for (;;) {
    if (!p.debt.length) return;
    const cp = ownedBy(p).filter(i => S.props[i].cap > 0);
    if (cp.length) { sellCap(p, cp[0]); continue; }
    const up = ownedBy(p).filter(i => S.props[i].level > 0).sort((a, b) => S.props[b].level - S.props[a].level);
    if (up.length) { sellUpgrade(p, up[0]); continue; }
    const st = ownedBy(p).filter(canOff).sort((a, b) => SQ[a].p - SQ[b].p);
    if (st.length) { takeOffline(p, st[0]); continue; }
    break;
  }
  // 还不够：整块卖回，先卖不在生效架构里的、卖价低的，凑够就停
  const inArch = i => comboOn(p, i).length > 0;
  for (const i of ownedBy(p).sort((a, b) => inArch(a) - inArch(b) || sellValue(a) - sellValue(b))) { if (!p.debt.length) return; sellProp(p, i); }
}
export async function resolveDebts() { const a0 = MP.actor; try { return await resolveDebts0(); } finally { MP.actor = a0; } }
// 互欠先抵消：甲欠乙 X、乙欠甲 Y，只留差额。不抵的话下面挑人那一句在成环时 find 返回 undefined、
// 退回 ds[0]（正好是对方的债主），两个人都被拉进清算，而净额可能只差几十块。
function netDebts() {
  const alive = S.players.filter(q => q.alive);
  const sumTo = (q, to) => (q.debt || []).filter(d => d.to === to).reduce((t, d) => t + d.amt, 0);
  const cut = (q, to, amt) => {
    let left = amt;
    q.debt = (q.debt || []).map(d => {
      if (d.to !== to || left <= 0) return d;
      const x = Math.min(left, d.amt); left -= x;
      return Object.assign({}, d, { amt: d.amt - x });
    }).filter(d => d.amt > 0);
  };
  for (const a of alive) for (const b of alive) {
    if (a.id >= b.id) continue;
    const x = Math.min(sumTo(a, b.id), sumTo(b, a.id));
    if (x > 0) { cut(a, b.id, x); cut(b, a.id, x); log(_tf(3337, "🤝 {$0} 和 {$1} 互相欠钱，先抵掉 ${$2}", nm(a), nm(b), x)); }
  }
}
async function resolveDebts0() {
  netDebts();
  for (let guard = 0; guard < 50; guard++) {
    // 先处理「别人在等他还钱」的那个：A 欠 B、B 欠亚马逊云科技时先让 A 还，B 拿到钱可能就不用变卖了
    const ds = S.players.filter(q => q.alive && q.debt.length);
    const p = ds.find(q => !ds.some(x => x !== q && x.debt.some(d => d.to === q.id))) || ds[0];
    if (!p) return;
    MP.actor = p.id;
    const canRaise = raiseValue(p);
    const v = await UI.ask({ who: p.id, title: _tf(3338, "{$0} 欠款 ${$1}", p.name, debtOf(p)), html: `<div class="debtsum"><div>${_tf(3342, "<small>欠款</small><b class=\"hi\">${$0}</b>", debtOf(p))}</div><div>${_tf(2599, "<small>现金</small><b>${$0}</b>", p.cash)}</div><div>${_tf(3343, "<small>全卖了最多能凑</small><b class=\"{$0}\">${$1}</b>", canRaise < debtOf(p) ? 'hi' : 'ok', canRaise)}</div></div>${canRaise < debtOf(p) ? _t(3339, "<p class=\"warnline\">全卖了也不够还：选「自动变卖」会直接破产，服务连同升级按欠款比例分给各个债主（欠亚马逊云科技的那份退回亚马逊云科技）。</p>") : ''}<ul class="ways"><li>${_t(3344, "<b>去掉升级、减容量</b>：退这一级实付的一半，钱归你。")}</li>${isParty() ? '' : _t(3340, "<li><b>下线</b>（EC2、RDS、Aurora、Redshift、ECS）：先拿回买价一半周转，这笔钱不用还，服务还是你的；固定 3 轮后自动恢复。</li>")}<li>${_tf(3345, "<b>卖回亚马逊云科技</b>：买价、升级、容量的实付按 {$0}拿回。", sellZhe())}</li></ul><p class="muted">${_tf(3346, "「自动变卖」先拆升级、容量{$0}，不够才整块卖。宣告破产：账户被暂停出局，服务连同升级按欠款比例分给各个债主（欠亚马逊云科技的那份退回亚马逊云科技）。", isParty() ? '' : _t(3341, "、下线"))}</p>`, buttons: [{ label: _t(3347, "管理资产"), value: 'm' }, { label: _t(3348, "自动变卖"), value: 'a', cls: 'pri' }, { label: _t(3349, "宣告破产，直接出局"), value: 'b', cls: 'danger', botW: 0 }] });
    if (v === 'm') { const d0 = debtOf(p), n0 = ownedBy(p).length; await manage(p, true); if (debtOf(p) !== d0 || ownedBy(p).length !== n0) guard--; }
    // 全卖了也不够还：不变卖，服务连同升级按欠款比例分给各个债主（欠亚马逊云科技的那份退回亚马逊云科技）
    else if (v === 'a' && canRaise < debtOf(p)) { await UI.info(_t(3350, "不够还债"), _tf(3351, "{$0} 把服务全部卖回亚马逊云科技也只能凑 ${$1}，不够还 ${$2}，账户被暂停（破产），服务连同升级按欠款比例分给各个债主（欠亚马逊云科技的那份退回亚马逊云科技）。", nm(p), canRaise, debtOf(p))); await bankrupt(p); }
    else if (v === 'a') autoLiquidate(p);
    // 变卖就能还清却点了宣告破产：先确认一次（数字键 3 也会点到它），默认回去凑钱。还不清的时候结果一样，不多问
    else if (canRaise >= debtOf(p) && !(await UI.ask({ who: p.id, title: _tf(3352, "{$0} 确定宣告破产？", p.name), html: _tf(3353, "<p>欠款 ${$0}，全卖了能凑 ${$1}，够还。宣告后账户被暂停、直接出局，服务连同升级按欠款比例分给各个债主。</p>", debtOf(p), canRaise), buttons: [{ label: _t(3354, "回去凑钱"), value: false, cls: 'pri' }, { label: _t(3355, "宣告破产"), value: true, cls: 'danger' }] }))) guard--;
    else await bankrupt(p);
    UI.render();
  }
  // 一直点「管理资产」又什么都不卖：按正常规则收尾（卖了够就自动变卖，不够就破产），不能带着债接着玩
  for (const q of S.players.filter(q => q.alive && q.debt.length)) { if (raiseValue(q) < debtOf(q)) await bankrupt(q); else { autoLiquidate(q); if (q.debt.length) await bankrupt(q); } }
  UI.render();
}
// 主动宣告破产（认输）：资产一律交回亚马逊云科技，不能指定送给谁（免得多人局里帮别人赢）
export async function declareBankrupt() {
  const p = cur(); if (isAI(p.id)) return UI.toast(_t(3356, "电脑的回合不能宣告破产"));
  const ok = await UI.ask({ title: _tf(3357, "{$0} 宣告破产？", p.name), html: _t(3358, "<p>宣告后账户被暂停，你直接出局。名下服务（连同升级和容量）交回亚马逊云科技重新出售，保留卡和标记作废。</p><p class=\"muted\">不能指定把资产送给哪位玩家：多人局里送资产等于帮别人赢。</p>"), buttons: [{ label: _t(3355, "宣告破产"), value: true, cls: 'danger' }, { label: _t(2465, "取消"), value: false, cls: 'pri' }] });
  if (!ok) return;
  p.debt = [];
  log(_tf(3359, "🏳️ {$0} 宣告破产", nm(p)));
  await bankrupt(p);
}
// 破产：按欠款比例分资产。每个债主（欠亚马逊云科技、奖池的合成一份）按欠款占比分到对应价值的服务，
// 服务按价值从高到低一块块分给「还差得最多」的那一份；亚马逊云科技那份的服务退回重新出售；保留卡和标记给欠得最多的玩家
async function bankrupt(p) {
  p.outRound = S.round;   // 战报靠这个认出局轮次，不要再去匹配文案
  sfxAll('fail'); evt(_tf(3360, "{$0} 账户被暂停（破产）", p.name), 99999, 'out');
  const owed = {}; let bankOwed = 0;
  p.debt.forEach(d => { if (typeof d.to === 'number' && P(d.to).alive && d.to !== p.id) owed[d.to] = (owed[d.to] || 0) + d.amt; else bankOwed += d.amt; });
  const ids = Object.keys(owed).map(Number).filter(k => owed[k] > 0).sort((a, b) => owed[b] - owed[a]);
  const total = ids.reduce((a, k) => a + owed[k], 0) + bankOwed;
  const props = ownedBy(p);
  OWNABLE.forEach(i => { if (S.props[i].ddos === p.id) S.props[i].ddos = null; if (S.props[i].via === p.id) S.props[i].via = null; });
  p.alive = false; p.debt = []; p.jail = null; p.skip = 0;
  // 没公开的 re:Invent 手牌不给债主（别人本来就不知道是什么），放进弃牌堆
  if (p.hand && p.hand.length) { S.reiDisc.push(...p.hand); p.hand = []; }
  // 他埋下、还没人踩中的 Health 卡也收回来放进弃牌堆（engine/18-reinvent.js 的 S.traps）
  dropTraps(p);
  // 他自己欠的上面清了，别人欠他的也要注销：留着的话债务人还钱时 giveTo 不入账，那笔钱会消失
  S.players.forEach(q => { if (q !== p && q.debt && q.debt.length) q.debt = q.debt.filter(d => d.to !== p.id); });
  if (!ids.length || total <= 0) {
    log(_tf(3361, "💀 {$0} 账户被暂停，服务回到亚马逊云科技重新出售", nm(p)));
    p.cash = 0; props.forEach(resetProp); p.cards = []; p.coe = []; p.drill = [];
    UI.render(); return;
  }
  const keys = [...ids, ...(bankOwed > 0 ? ['bank'] : [])], share = k => (k === 'bank' ? bankOwed : owed[k]) / total;
  // 和 sellValue、valBreak 一样：Hackathon 免费加的容量不算钱，下线的扣掉下线时已经拿走的那一半
  const val = i => { const pr = S.props[i]; return Math.max(0, buyPaid(i) + upPaidSum(i) + capPaidSum(i) - (pr.offline ? pr.offCash || 0 : 0)); };
  const assets = props.reduce((a, i) => a + val(i), 0) + Math.max(0, p.cash), got = Object.fromEntries(keys.map(k => [k, 0])), gotProps = Object.fromEntries(keys.map(k => [k, []]));
  // 现金也按比例分（破产时现金一般已经扣光）
  if (p.cash > 0) { let left = p.cash; keys.forEach((k, n) => { const x = n === keys.length - 1 ? left : Math.floor(p.cash * share(k)); left -= x; got[k] += x; if (k !== 'bank') giveTo(k, x, 'other'); }); p.cash = 0; }
  [...props].sort((a, b) => val(b) - val(a)).forEach(i => { const k = keys.reduce((best, x) => (share(x) * assets - got[x]) > (share(best) * assets - got[best]) ? x : best, keys[0]); got[k] += val(i); gotProps[k].push(i); });
  keys.forEach(k => gotProps[k].forEach(i => { svcLeaves(p, i, k === 'bank' ? null : k); if (k === 'bank') resetProp(i); else { const pr = S.props[i]; pr.owner = k; pr.impaired = false; pr.via = null; } }));
  const top = P(ids[0]); top.cards.push(...p.cards); top.coe.push(...p.coe); top.drill.push(...p.drill); p.cards = []; p.coe = []; p.drill = [];
  log(_tf(3366, "💀 {$0} 账户被暂停，资产按欠款比例分：{$1}", nm(p), keys.map(k => _tf(3365, "{$0} {$1}（欠款占 {$2}%）", k === 'bank' ? _t(3362, "亚马逊云科技收回") : nm(P(k)) + _t(3363, " 拿到"), gotProps[k].length ? gotProps[k].map(sqn).join(_t(349, "、")) : _t(3364, "（没分到服务）"), Math.round(share(k) * 100))).join(_t(408, "；"))));
  UI.render();
}

