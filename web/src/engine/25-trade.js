import { _t, _tf } from '../core/01-i18n-runtime.js';
import { unesc } from '../core/02-util.js';
import { UI } from '../core/02b-ui-port.js';
import { GRP, SQ } from '../rules/03-services.js';
import { CARDN, CATS } from '../rules/04-roles-combos-cards.js';
import { dlcOn } from '../rules/05-dlc.js';
import { askQuestion, pickQuestion, qPoolS } from '../rules/06-qbank.js';
import { F, P, S, cur, log, nm, ownedBy, ownsGroup, sqn } from './07-state.js';
import { pay } from './08-money.js';
import { RI_OK, RI_PLANS, SP_PLANS, commitsOf, riActive, runAfterRI, runCost, spActive, spScope } from './08c-costs.js';
import { buyPaid, handOver, turnKey } from './09-rent.js';
import { uiAction } from './14-turn.js';
import { aiName } from './17-health.js';
import { ST } from './26b-retro.js';
import { withCardMul } from '../rules/35-modes.js';
import { isAI } from './36-ai.js';
import { MP } from '../net/40-host-sync.js';
// ================= 交易 =================
// 出题挑战：花 $100 从题库给一位对手出题，答对他拿走这 $100，答错他赔你 $200。11-08 起每局只能用一次（p.chUsed）
export const CH_COST = 100, CH_WIN = 200;
export const canChallenge = p => !!p && p.alive && p.chTurn !== turnKey() && !p.chUsed && p.cash >= CH_COST && S.players.some(o => o.alive && o.id !== p.id);
// 考全场：每 3 圈一次（CHA_LAPS，按这位玩家自己经过 Startup 扶持的次数 p.laps 算，开局就能用一次，用过记下 p.chaLap）；同一回合和考一个人只能发动一个（共用 p.chTurn）。每位对手各出一道（热座时后答的人看不到前一个人的题和答案），每人 $50：答对的拿走你 $50，答错的赔你 $100。至少两位对手才有
export const CHA_COST = 50, CHA_WIN = 100, CHA_LAPS = 3;
export const chaWait = p => Math.max(0, CHA_LAPS - ((p.laps || 0) - (p.chaLap ?? -CHA_LAPS)));   // 还要再经过几次 Startup 扶持才能考全场
export const chFoes = p => S.players.filter(o => o.alive && o.id !== p.id);
export const canChallengeAll = p => !!p && p.alive && p.chTurn !== turnKey() && !chaWait(p) && chFoes(p).length >= 2 && p.cash >= CHA_COST * chFoes(p).length;
export async function quizAll() {
  const p = cur(); if (!canChallengeAll(p)) return void UI.toast(!p ? '' : p.chTurn === turnKey() ? _t(3566, "这回合已经出过题了") : chaWait(p) ? _tf(3567, "考全场每 3 圈一次：还要再经过 {$0} 次 Startup 扶持", chaWait(p)) : _tf(2981, "现金不够 ${$0}", CHA_COST * chFoes(p).length));
  const n = S.players.length, foes = Array.from({ length: n - 1 }, (_, k) => S.players[(p.id + 1 + k) % n]).filter(o => o.alive); p.chTurn = turnKey(); p.chaLap = p.laps || 0;   // 从出题人的下一位开始，按座位顺序轮流答
  log(_tf(3568, "❓ {$0} 出题考全场：每人一道，答对的拿走 ${$1}，答错的赔 ${$2}", nm(p), CHA_COST, CHA_WIN));
  let win = 0, lose = 0;
  for (const t of foes) {
    if (!t.alive || !p.alive) continue;
    const x = pickQuestion(qPoolS(SQ[t.pos]));
    const a0 = MP.actor; MP.actor = t.id; let ok = false;
    try { ok = await askQuestion(x.q, x.id, _tf(3569, "{$0} 出题考全场：你答对拿走他 ${$1}，答错赔他 ${$2}", p.name, CHA_COST, CHA_WIN), { again: x.again, skip: false }); } finally { MP.actor = a0; }
    { const st = ST(t); st.quizN++; if (ok) st.quizOk++; }
    await withCardMul(0, async () => { if (ok) { pay(p, t, CHA_COST); lose++; log(_tf(3570, "{$0} 答对了，拿走 {$1} 的 ${$2}", nm(t), nm(p), CHA_COST)); } else { pay(t, p, CHA_WIN); win++; log(_tf(1830, "{$0} 答错了，赔给 {$1} ${$2}", nm(t), nm(p), CHA_WIN)); } });
    UI.render();
  }
  log(_tf(3571, "{$0} 考全场：{$1} 人里 {$2} 人答对、{$3} 人答错，合计{$4} ${$5}", nm(p), foes.length, lose, win, win * CHA_WIN - lose * CHA_COST >= 0 ? _t(2545, "赚") : _t(2560, "亏"), Math.abs(win * CHA_WIN - lose * CHA_COST)));
}
export async function quizChallenge() {
  const p = cur(); if (!canChallenge(p)) return void UI.toast(!p ? '' : p.chTurn === turnKey() ? _t(3566, "这回合已经出过题了") : p.chUsed ? _t(3572, "考一个人每局只能用一次，已经用过了") : _tf(2981, "现金不够 ${$0}", CH_COST));
  const others = S.players.filter(o => o.alive && o.id !== p.id);
  const t = others.length === 1 ? others[0] : await pickPartner(_tf(3573, "出题考谁？（花 ${$0}：答对他拿走这 ${$1}，答错他赔你 ${$2}）", CH_COST, CH_COST, CH_WIN));
  if (!t) return;
  p.chTurn = turnKey(); p.chUsed = true;
  const x = pickQuestion(qPoolS(SQ[t.pos]));
  log(_tf(3574, "❓ {$0} 花 ${$1} 出题考 {$2}", nm(p), CH_COST, nm(t)));
  const a0 = MP.actor; MP.actor = t.id; let ok = false;
  try { ok = await askQuestion(x.q, x.id, _tf(3575, "{$0} 花 ${$1} 出题考你：答对拿走这 ${$2}，答错赔他 ${$3}", p.name, CH_COST, CH_COST, CH_WIN), { again: x.again, skip: false }); } finally { MP.actor = a0; }
  { const st = ST(t); st.quizN++; if (ok) st.quizOk++; }
  await withCardMul(0, async () => { if (ok) { pay(p, t, CH_COST); log(_tf(3570, "{$0} 答对了，拿走 {$1} 的 ${$2}", nm(t), nm(p), CH_COST)); } else { pay(t, p, CH_WIN); log(_tf(1830, "{$0} 答错了，赔给 {$1} ${$2}", nm(t), nm(p), CH_WIN)); } });
  UI.render();
}
export async function pickPartner(title) {
  const a = cur(), others = S.players.filter(q => q.alive && q.id !== a.id);
  if (!others.length) return null;
  const id = await UI.ask({ title, buttons: [...others.map(q => ({ label: q.name, value: q.id })), { label: _t(2465, "取消"), value: -1, botW: 2 }] });
  return id === -1 ? null : P(id);
}
// 明细里点「找他交易」：关掉明细，直接打开和他的交易窗，把想要的那块先勾上
export function tradeFor(to, want) {
  if (UI.VIEW_CUR) UI.VIEW_CUR.cancel();
  if (UI.MODAL_CUR && UI.MODAL_CUR.cancelable) UI.MODAL_CUR.cancel();
  if (MP.role === 'client') return void MP.send(MP.hostConn, { t: 'act', a: 'tradefor', to, want });   // 远端：交给房主开交易窗（窗口照常发回远端来选）
  setTimeout(() => uiAction(() => trade({ to, want })), 0);
}
export async function trade(pre) {
  const a = cur(), b = pre && S.players[pre.to] && S.players[pre.to].alive && pre.to !== a.id ? S.players[pre.to] : await pickPartner(_t(3576, "和谁交易？"));
  if (!b) return;
  const full = F.full();
  const side = (q, x) => {
    const inps = [{ type: 'header', label: _tf(3577, "{$0} 交出", q.name) }];
    ownedBy(q).forEach(i => { const pr = S.props[i]; inps.push({ id: `${x}p${i}`, type: 'checkbox', label: `${SQ[i].n}${pr.level || pr.cap ? _t(3578, "（有升级或容量，要先去掉）") : ''}`, disabled: pr.level > 0 || pr.cap > 0, value: x === 'b' && pre && pre.want === i && !pr.level && !pr.cap }); });
    inps.push({ id: x + 'cash', type: 'number', label: _tf(3579, "现金 $（最多 {$0}）", Math.max(q.cash, 0)), min: 0, max: Math.max(q.cash, 0), step: 10, value: 0 });
    if (full) {
      q.cards.forEach((c, k) => { if (!c.used) inps.push({ id: `${x}c${k}`, type: 'checkbox', label: _tf(3580, "保留卡：{$0}", CARDN[c.id]) }); });
      q.coe.forEach((t, k) => { if (!t.used) inps.push({ id: `${x}o${k}`, type: 'checkbox', label: _tf(3581, "复盘标记（{$0}类）", CATS[t.cat]) }); });
      q.drill.forEach((t, k) => { if (!t.used) inps.push({ id: `${x}d${k}`, type: 'checkbox', label: _tf(3582, "演练标记（{$0}类）", CATS[t.cat]) }); });
    }
    return inps;
  };
  const r = await UI.modal({ title: _tf(3583, "{$0} 和 {$1} 交易", a.name, b.name), cls: 'wide', html: _tf(3585, "<p class=\"muted\">勾选双方各自交出去的东西。{$0}技术债不能转让。</p>", full ? '' : _t(3584, "入门局、标准局只能交易服务和现金。")), inputs: [...side(a, 'a'), ...side(b, 'b')], buttons: [{ label: _t(3586, "提交给对方确认"), value: 'ok', cls: 'pri' }, { label: _t(2465, "取消"), value: 'x' }] });
  if (r.v !== 'ok') return;
  const pick = (q, x) => ({
    props: ownedBy(q).filter(i => r.inp[`${x}p${i}`] && S.props[i].level === 0 && !S.props[i].cap),
    cash: Math.max(0, Math.min(r.inp[x + 'cash'] || 0, Math.max(q.cash, 0))),
    cards: q.cards.map((c, k) => r.inp[`${x}c${k}`] ? k : -1).filter(k => k >= 0),
    coe: q.coe.map((c, k) => r.inp[`${x}o${k}`] ? k : -1).filter(k => k >= 0),
    drill: q.drill.map((c, k) => r.inp[`${x}d${k}`] ? k : -1).filter(k => k >= 0),
  });
  const A = pick(a, 'a'), B = pick(b, 'b');
  const empty = X => !X.props.length && !X.cash && !X.cards.length && !X.coe.length && !X.drill.length;
  if (empty(A) || empty(B)) { if (!(empty(A) && empty(B))) await UI.info(_t(3587, "交易不成立"), _t(3588, "<p>交易双方都要拿出东西来，不能单方面白送。</p>")); return; }
  const desc = (q, X) => { const parts = X.props.map(i => SQ[i].n); if (X.cash) parts.push(`$${X.cash}`); X.cards.forEach(k => parts.push(CARDN[q.cards[k].id])); if (X.coe.length) parts.push(_tf(3589, "复盘标记 ×{$0}", X.coe.length)); if (X.drill.length) parts.push(_tf(2632, "演练标记 ×{$0}", X.drill.length)); return parts.join(_t(349, "、")) || _t(3590, "（什么都不给）"); };
  const summary = _tf(3591, "<p>{$0} 交出：{$1}</p><p>{$2} 交出：{$3}</p>", nm(a), desc(a, A), nm(b), desc(b, B));
  const ok = isAI(b.id) ? aiTradeOk(a, b, A, B) : await UI.ask({ who: b.id, title: _tf(3592, "{$0} 同意这笔交易吗？", b.name), html: summary, buttons: [{ label: _t(3188, "同意"), value: true, cls: 'pri' }, { label: _t(3189, "拒绝"), value: false }] });
  // 远端发起的交易：电脑同不同意给发起的人看（掉线了就留在房主这边）。toast 写的是 textContent，名字是转义过的，先还原
  if (isAI(b.id)) { const msg = unesc(`${aiName(b)} ${ok ? _t(3593, "同意了这笔交易") : _t(3594, "觉得不划算，拒绝了")}`); if (MP.isRemote(a.id) && MP.seats[a.id].online) MP.send(MP.seats[a.id].conn, { t: 'toast', msg }); else UI.toast(msg); }
  if (!ok) { log(_tf(3595, "{$0} 拒绝了 {$1} 的交易", nm(b), nm(a))); return; }
  const move = (from, to, X) => {
    X.props.forEach(i => handOver(from, i, to));
    if (X.cash) pay(from, to, X.cash);
    ['cards', 'coe', 'drill'].forEach(key => { [...X[key]].sort((m, n) => n - m).forEach(k => to[key].push(from[key].splice(k, 1)[0])); });
  };
  move(a, b, A); move(b, a, B);
  log(_tf(3596, "🤝 交易达成：{$0}", summary.replace(/<\/?p>/g, ' ')));
}
// 电脑接不接交易：收到的要比交出去的值钱两成以上，交易后现金不低于 $250；
// 交出去的服务会让对方集齐整组、或者拆掉电脑自己集齐的整组，都按 3 倍算（等于基本不卖）
function aiTradeOk(a, b, A, B) {
  const card = X => (X.cards.length + X.coe.length + X.drill.length) * 80;
  const completes = (to, i, gets) => GRP(SQ[i].g).every(k => k === i || S.props[k].owner === to.id || gets.includes(k));
  const give = B.cash + card(B) + B.props.reduce((t, i) => t + buyPaid(i) * (completes(a, i, B.props) || ownsGroup(b, SQ[i].g) ? 3 : 1), 0);
  const get = A.cash + card(A) + A.props.reduce((t, i) => t + buyPaid(i) * (completes(b, i, A.props) ? 1.5 : 1), 0);
  return get >= give * 1.2 && b.cash - B.cash + A.cash >= 250;
}
// Savings Plans / RI：跟亚马逊云科技承诺用量换折扣，期限按圈算（运行费每圈交一次）
// 弹窗里哪几项能选、按钮灰不灰都从 edpOpts 算，改条件只改这一处。SP 两项都要「没签过 SP、计算类 + 数据库类有运行费」（3 年只算计算类，包含在里面）
function edpOpts(p) {
  const r = runAfterRI(p), sp = spActive(p);
  return { r, sp, riCand: ownedBy(p).filter(i => RI_OK.has(SQ[i].k) && runCost(i) > 0 && !riActive(p, i)) };
}
export const edpWhy = p => { const { r, sp, riCand } = edpOpts(p); return riCand.length || (!sp && spScope(r, 1)) ? '' : sp ? _tf(3597, "已经签了 Savings Plans（还剩 {$0} 圈），手上也没有还能买 RI 的服务", sp.laps) : _t(3598, "手上没有要交运行费的计算类、数据库类服务（已经买了 RI 的不算），签不了 Savings Plans 也买不了 RI"); };
export async function edpDialog() {
  const p = cur();
  if (!(F.full() || dlcOn('finops'))) return;   // 和按钮（ui/27c-center.js）同一个条件：联机远端发来的 'sp' 也直接调这里
  if (p.role === 'indie') return;   // 按钮对独立开发者已经藏了，这里再拦一次：电脑玩家和联机的 'sp' 动作都直接调这个函数
  const { r, sp, riCand } = edpOpts(p);
  const spAmt = n => Math.round(spScope(r, n) * (1 - SP_PLANS[n]));
  const rows = `<tr><td>${_t(3600, "<b>Savings Plans 1 年</b>（1 圈）")}</td><td>${_tf(3601, "每圈 ${$0}，不预付", spAmt(1))}</td><td>${_tf(3602, "计算类 + 数据库类运行费打 75 折：每圈 ${$0} → ${$1}", spScope(r, 1), spAmt(1))}</td></tr>
    <tr><td>${_t(3603, "<b>Savings Plans 3 年</b>（3 圈）")}</td><td>${_tf(3601, "每圈 ${$0}，不预付", spAmt(3))}</td><td>${_tf(3604, "只有计算类能签，打 55 折：每圈 ${$0} → ${$1}{$2}", spScope(r, 3), spAmt(3), r.db ? _tf(3599, "；数据库的 ${$0} 照原价", r.db) : '')}</td></tr>`
    + [1, 3].map(n => `<tr><td>${_tf(3605, "<b>预留实例 RI {$0} 年</b>（{$1} 圈）", n, n)}</td><td>${_tf(3606, "全额预付这块 {$0} 圈运行费的 {$1}%", n, Math.round((1 - RI_PLANS[n]) * 100))}</td><td>${_tf(3607, "挑一块服务，{$0} 圈内它现有的运行费全免", n)}</td></tr>`).join('');
  const v = await UI.ask({ title: _t(3608, "Savings Plans / 预留实例（RI）"), html: `${sp ? _tf(3609, "<p><b>已经签了 {$0} 年 Savings Plans</b>：每圈承诺 ${$1}，还剩 {$2} 圈，到期前不能再签，只能买 RI。</p>", sp.scope === 'compute' ? 3 : 1, sp.amt, sp.laps) : ''}<p>${_t(3610, "跟亚马逊云科技承诺用量，换运行费折扣。<b>1 圈算 1 年</b>（每经过一次 Startup 扶持算一圈）；期内服务卖回亚马逊云科技，承诺也照付、预付不退。")}</p>
    <table><tr><th>${_t(3611, "方案")}</th><th>${_t(3612, "怎么付")}</th><th>${_t(3613, "换来什么")}</th></tr>${rows}</table>
    <p class="muted">${_t(3614, "计算类：EC2、ECS、EKS、Lambda（Compute Savings Plans）、SageMaker AI（SageMaker AI Savings Plans），有 1 年和 3 年期。数据库类：RDS、Aurora、ElastiCache、OpenSearch（Database Savings Plans），只有 1 年期、最多约省 35%。承诺额按现在的用量算，之后用多了超出部分按原价，用少了承诺额照付。")}<br>${_t(3615, "RI 能买：EC2、RDS、Aurora、ElastiCache、Redshift、OpenSearch、DMS，有 1 年和 3 年期。RI 只覆盖买的时候的规模，之后加的容量按原价。")}<br>${_t(3616, "ELB、EBS 两种都用不了。")}</p>`,
    buttons: [{ label: _t(3617, "Savings Plans 1 年"), value: 'sp1', cls: 'pri', disabled: !spScope(r, 1) || !!sp }, { label: _t(3618, "Savings Plans 3 年"), value: 'sp3', disabled: !spScope(r, 3) || !!sp }, { label: _t(3619, "买 RI"), value: 'ri', disabled: !riCand.length }, { label: _t(2465, "取消"), value: 'x', botW: 2 }] });
  if (v === 'x') return;
  p.commits = commitsOf(p);
  if (v === 'sp1' || v === 'sp3') {
    const n = v === 'sp1' ? 1 : 3, amt = spAmt(n);
    p.commits.push({ type: 'sp', laps: n, d: SP_PLANS[n], amt, scope: n === 3 ? 'compute' : 'all' }); p.usedCommit = true;
    log(_tf(3620, "📄 {$0} 签了 {$1} 年（{$2} 圈）Savings Plans：每圈承诺 ${$3}，抵扣原价 ${$4} 的运行费", nm(p), n, n, amt, spScope(r, n)));
    return;
  }
  const i = riCand.length === 1 ? riCand[0] : await UI.ask({ title: _t(3621, "给哪块服务买 RI？"), buttons: riCand.map(x => ({ label: _tf(3622, "{$0}（每圈 ${$1}）", SQ[x].n, runCost(x)), value: x })) });
  const rc = runCost(i);
  const n = await UI.ask({ title: _tf(3623, "{$0} 的 RI 买几年？", SQ[i].n), html: _tf(3624, "<p>这块现在每圈运行费 ${$0}，1 圈算 1 年。</p>", rc), buttons: [1, 3].map((k, m) => { const c = Math.round(rc * k * (1 - RI_PLANS[k])); return { label: _tf(3625, "{$0} 年（{$1} 圈），预付 ${$2}（省 {$3}%）", k, k, c, Math.round(RI_PLANS[k] * 100)), value: k, cls: m ? '' : 'pri', disabled: p.cash < c }; }).concat([{ label: _t(2465, "取消"), value: 0 }]) });
  if (!n) return;
  const cost = Math.round(rc * n * (1 - RI_PLANS[n])); if (p.cash < cost) return;
  ST(p).spendMisc = (ST(p).spendMisc || 0) + pay(p, 'bank', cost); p.commits.push({ type: 'ri', svc: i, laps: n, amt: rc, mark: 1 }); S.props[i].ri = p.id; p.usedCommit = true;
  log(_tf(3626, "📄 {$0} 预付 ${$1} 给 {$2} 买了 {$3} 年（{$4} 圈）RI：每圈 ${$5} 的运行费全免", nm(p), cost, sqn(i), n, n, rc));
}

