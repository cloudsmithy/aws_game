import { __rv, _t, _tf } from '../core/01-i18n-runtime.js';
import { UI } from '../core/02b-ui-port.js';
import { BAL, OWNABLE, SQ, isInst, lvFull } from '../rules/03-services.js';
import { COMBOS, roleOf, rsBuyRate, rsCustomers, rsRate, slotOpen, viaOf } from '../rules/04-roles-combos-cards.js';
import { S, active, comboMiss, combosBrokenBy, cur, log, nm, ownedBy, sqn, wildFits, wildFree, wildTargets } from './07-state.js';
import { giveTo, pay, withGain } from './08-money.js';
import { netWorth } from './08c-costs.js';
import { baseRent, buyPaid, sellValue, shownRent, trafficMul, upgradeInfo, zhe } from './09-rent.js';
import { evt } from './26b-retro.js';
import { hx, isHell, isHidden } from '../rules/35-modes.js';
import { fxCast, sfxAll } from '../net/41-replay.js';
// ================= 角色技能：触底反弹时先「战略并购」 =================
// 公司快撑不下去（总资产掉到开局资金的一半以下）时，才能发动一次翻身的技能。
// 这里的「血量」是总资产（现金 + 服务 + 升级），不是手上的现金：现金花到很低是正常的（模拟里平均第 11 轮人人都会），
// 总资产跌到开局资金的一半以下才是真的快不行了（模拟里每局约 1.7 人，中位第 23 轮，不开技能时这些人 0% 能赢）
// 开局资金：地狱模式有几个角色另算；娱乐模式代理商可以再减 BAL.rsCash（模拟用的开关，BAL 里默认没有，等于不减）
const HELL_CASH = { legacy: 1500, unicorn: 1400, indie: 1400 };   // 独立开发者在地狱模式靠必答题本来就最强，角色卡涨到 $1500 时地狱不跟着涨
export const roleCash = (r, cfg) => Math.round(((cfg.mode === 'hell' && HELL_CASH[r.id]) || r.cash) * BAL.cashMul) - (r.rs && cfg.mode === 'party' ? (BAL.rsCash || 0) : 0) + (r.rs ? (BAL.rsBonus || 0) : 0);
export const startCashOf = p => p.startCash || roleCash(roleOf(p), S.cfg);
export let STORM_TXT = __rv(() => (_t(3367, "先结算角色自己的技能，再「战略并购」：按卖回价买下全场总资产最高的对手的一块服务（连同升级和容量）")), v => { STORM_TXT = v; }, () => STORM_TXT);
export const skillLine = p => Math.round(startCashOf(p) / 2);
// 技能金额跟着流量涨一半，最多 2.5 倍；地狱模式不涨（卡牌已经全额涨了，免得一个技能定胜负）
// 完整局规则多、对手强，再 ×BAL.skillFull（1.2），最多 3 倍：不乘时用过技能的人比标准局少赢一截；
// 乘 1.5 又太多，15 轮局里第 10–14 轮发动就是 2.6 倍，用过技能的人 32% 赢下来，比没用过的还高
const skillMul = () => isHell() ? 1 : Math.min(2.5, 1 + (trafficMul() - 1) * 0.5) * (S.cfg.diff === 'full' ? (BAL.skillFull ?? 1) : 1);
// 技能说明写的是基础金额，提示里补上现在的倍数，免得卡上写「领 $1200」、完整局开头实际领 $1440（×1.2）对不上；独角兽、总代理按实际数字算，不涨
export const skillMulTxt = p => { const m = skillMul(); return m > 1 && !['unicorn', 'rs_dist'].includes(p.role) ? _tf(3370, "（{$0}金额 ×{$1}）", S.cfg.diff === 'full' && trafficMul() <= 1 ? _t(3368, "完整局") : _t(3369, "现在"), Math.round(m * 100) / 100) : ''; };
export const skillWhy = p => {
  if (!roleOf(p).sk) return _t(3371, "这个角色没有技能");
  if (p.skillUsed) return _t(3372, "这局已经用过了");
  return netWorth(p) < skillLine(p) ? '' : _tf(3373, "还没到触底反弹的时候：总资产低于 ${$0}（开局资金的一半）才能发动，现在 ${$1}", skillLine(p), netWorth(p));
};
export const canSkill = p => p.alive && !BAL.noSkill && !skillWhy(p);
export async function useRoleSkill() { const p = cur(); if (!canSkill(p)) return; await roleSkill(p); }
// 角色技能里收的钱（领融资、对手付的钱）在「钱从哪来」里算卡牌和技能；战略并购被收购的那一方拿的是卖回价，在调用处另写
async function roleSkill(p) { return withGain('card', () => roleSkill0(p)); }
async function roleSkill0(p) {
  // 金额倍数见 skillMul()：跟着流量涨，完整局再 ×1.2，地狱模式不涨
  const r = roleOf(p), m = skillMul(), $m = x => Math.round(x * m), others = S.players.filter(o => o.alive && o.id !== p.id);
  const freeUp = i => { S.props[i].level++; (S.props[i].upPaid = S.props[i].upPaid || [])[S.props[i].level - 1] = 0; log(_tf(3374, "🔧 {$0} 免费给 {$1} 升到{$2}", nm(p), sqn(i), lvFull(i, S.props[i].level))); };
  const unowned = OWNABLE.filter(i => S.props[i].owner === null && SQ[i].t === 'prop' && !isHidden(i));
  const take = i => { S.props[i].owner = p.id; S.props[i].paid = 0; log(_tf(3375, "📈 {$0} 靠技能拿下 {$1}", nm(p), sqn(i))); };
  p.skillUsed = true; sfxAll('magic'); evt(_tf(3376, "{$0} 发动角色技能「{$1}」", p.name, r.sk.n), 300);
  log(_tf(3378, "📈 触底反弹！{$0} 发动「{$1}」{$2}", nm(p), r.sk.n, m > 1 ? _tf(3377, "（金额 ×{$0}）", Math.round(m * 100) / 100) : ''));
  // 战略并购会改总资产、断开代理关系，角色技能要用的数字先算好
  const nw0 = netWorth(p), rsCust0 = p.reseller ? rsCustomers(p) : [], rsTot0 = p.reseller ? S.players.reduce((a, q) => a + (q.id === p.id ? 0 : viaOf(p, q).reduce((x, i) => x + (S.props[i].paid || 0), 0)), 0) : 0;
  const grant = x => { giveTo(p.id, x); log(_tf(3379, "💰 {$0} 的「{$1}」领 ${$2}", nm(p), r.sk.n, x)); };
  const pick2 = async (list, title) => { const got = []; for (let k = 0; k < 2 && list.length; k++) { const c = list.filter(i => !got.includes(i)).sort((x, y) => SQ[y].p - SQ[x].p); if (!c.length) break; const i = c.length === 1 ? c[0] : +(await UI.ask({ who: p.id, cls: 'pick', title: _tf(3380, "{$0}（第 {$1} 块，共 2 块）", title, k + 1), buttons: c.slice(0, 14).map(x => ({ label: _tf(3381, "{$0}（原价 ${$1}）", SQ[x].n, SQ[x].p), value: x })) })); got.push(i); take(i); } return got.length; };
  switch (p.role) {
    case 'garage': grant($m(1200)); p.runMul = 0; p.runLaps = 3; break;
    case 'legacy': { const ups = ownedBy(p).filter(i => SQ[i].t === 'prop' && isInst(i) && upgradeInfo(p, i, true).ok); ups.forEach(freeUp); grant($m(ups.length ? 300 : 800)); p.runMul = 0.5; p.runLaps = 3; break; }
    case 'unicorn': grant(Math.max(1000, Math.min(2000, Math.round(skillLine(p) * 2 - nw0 + 500)))); break;
    case 'fin': p.techDebt = 0; p.immuneTill = S.round + (hx('fin') ? 1 : 2); grant($m(800)); log(_tf(3382, "🛡️ {$0} 进了监管沙盒：到第 {$1} 轮结束都免疫 Health 事件", nm(p), p.immuneTill)); break;
    case 'ai': { const ups = ownedBy(p).filter(i => SQ[i].g === 'ai' && upgradeInfo(p, i, true).ok); ups.forEach(freeUp); grant($m(ups.length ? 400 : 1000)); p.aiBoostTill = S.round + 2; log(_tf(3383, "{$0} 的 AI 组过路费 ×2，到第 {$1} 轮结束", nm(p), p.aiBoostTill)); break; }
    case 'ecom': p.rentBoost = 2; p.rentBoostTurns = hx('ecom') ? 2 : 3; grant($m(500)); log(_tf(3384, "{$0} 接下来 {$1} 个回合过路费 ×2", nm(p), p.rentBoostTurns)); break;
    case 'saas': p.subsTurns = hx('saas') ? 3 : 4; p.subsAmt = $m(150); log(_tf(3385, "{$0} 接下来 {$1} 个回合开始时，每位对手付订阅费 ${$2}", nm(p), p.subsTurns, p.subsAmt)); break;
    case 'game': p.rent3Left = 4; grant($m(400)); break;
    case 'indie': grant($m(400)); if (!(await pick2(unowned, _t(3386, "开源走红：白拿哪一块？")))) grant($m(600)); break;
    case 'data': grant($m(hx('data') ? 120 : 200) * Math.max(4, ownedBy(p).length)); break;
    case 'media': others.forEach(o => pay(o, p, $m(hx('media') ? 200 : 300))); break;
    case 'health': ownedBy(p).forEach(i => { S.props[i].impaired = false; S.props[i].ddos = null; }); p.techDebt = 0; grant($m(1000)); break;
    case 'rs_dist': grant(Math.max(800, Math.round(rsTot0 * 0.5))); break;
    case 'rs_msp': { const cs = rsCust0.filter(o => o.alive); if (!cs.length) { grant($m(800)); break; } cs.forEach(o => pay(o, p, $m(400))); grant($m(300)); break; }
    case 'rs_cons': grant($m(400)); if (!(await pick2(unowned.filter(i => SQ[i].p <= 400), _t(3387, "解决方案打包：拿下哪一块？")))) grant($m(600)); break;
  }  // 战略并购放在角色效果之后（11-07）：先领到技能给的钱再收购，不会刚发动就欠债；收购的钱和原来一样自己出。
  // 战略并购（所有角色都有：落后的公司收购领先对手的一条业务线）：按卖回价，强行买下总资产最高的对手的一块服务（连同升级和容量），
  // 钱付给对方。亚马逊云科技出钱时快不行的人翻盘率约 18%，自己出钱约 12%，按要求定在 12% 左右。模拟里试过只补钱（补到对手平均的 90% 也只有 9% 能翻盘，钱撑几轮就花完了）、过路费翻倍（6%），
  // 收购一块能持续收钱的服务才真的翻得了身：快不行的人翻盘率从 0–1% 提到约 16%
  if (others.length) {
    const rich = others.reduce((a, o) => netWorth(o) > netWorth(a) ? o : a);
    // 按格子上标的过路费排（组成架构的按整套联合收费，Impaired、被 DDoS 的是 $0）；代理商没成架构的库存现在不收，按归你以后的单块过路费排
    const er = x => S.props[x].impaired || S.props[x].ddos != null ? 0 : shownRent(x).r || baseRent(x, 7);
    // 收走这块后对手哪些架构会散：这一环有备用服务顶上的不算（同时有 RDS 和 Aurora，收走一块经典三层 Web 还在）
    const stag = x => { const pr = S.props[x], sr = shownRent(x), cs = combosBrokenBy(rich, x).map(c => _tf(2766, "「{$0}」", c.n)).join(''); return pr.impaired ? '≈$0 · Impaired' : pr.ddos != null ? _t(3388, "≈$0 · 被 DDoS") : !sr.r ? _tf(3389, "代理商库存现在不收，归你后单块 ≈${$0}", er(x)) : `≈$${sr.r}${!sr.jr ? '' : cs ? _tf(3390, " · 拆散{$0}", cs) : _t(3391, " · 这一环有备用，收走架构不散")}`; };
    const cand = ownedBy(rich).filter(i => ['prop', 'util'].includes(SQ[i].t) && !S.props[i].offline).sort((a, b) => er(b) - er(a) || baseRent(b, 7) - baseRent(a, 7));
    if (cand.length) {
      const i = cand.length === 1 ? cand[0] : +(await UI.ask({ who: p.id, cls: 'pick', title: _tf(3392, "战略并购：收购 {$0} 的哪一块服务？", rich.name), html: _tf(3393, "<p>{$0} 是全场总资产最高的对手。你按卖回价付钱给 {$1}，这块服务连同升级和容量都归你；现金不够就先欠着，按欠款规则处理。按格子上标的过路费从高到低排（组成架构的按整套联合收费；标了「拆散」的，收过来对手那套架构就散了）。</p>", nm(rich), nm(rich)), buttons: cand.slice(0, 14).map(x => ({ label: _tf(3394, "{$0}（{$1}，收购价 ${$2}）", SQ[x].n, stag(x), sellValue(x)), value: x })) }));
      const comp = sellValue(i), pr = S.props[i];
      pr.paid = buyPaid(i); pr.spot = false; pr.spotPaid = 0; pr.owner = p.id; pr.via = null; if (pr.ddos === p.id) pr.ddos = null;
      pay(p, rich, comp, 'sell');   // 按卖回价自己出钱；现金不够就欠着，按欠款规则处理
      log(_tf(3395, "📈 战略并购：{$0} 按卖回价 ${$1} 收购了 {$2} 的 {$3}", nm(p), comp, nm(rich), sqn(i)));
    }
  }

}
// 代理商自己定转售价：不低于拿货价，不高于原价
export async function setRsRate() {
  const p = cur(); if (!p.reseller) return;
  const opts = [0.45, 0.5, 0.55, 0.6, 0.7, 0.8, 0.9, 1].filter(x => x >= rsBuyRate(p));
  const v = await UI.ask({ who: p.id, title: _tf(3396, "{$0} 的转售价", p.name), html: _tf(3397, "<p>客户落在你的库存上，可以按这个价从你手里买走（你当初按 {$0}进的货，差价归你）；组成架构、集齐整组、升过级的不卖。之后这些服务每圈的运行费交给你，你按 {$1}交给亚马逊云科技。定得越低客户越愿意买，可地也就被买走了。</p>", zhe(rsBuyRate(p)), zhe(rsBuyRate(p))), buttons: opts.map(x => ({ label: x === 1 ? _t(1512, "原价") : zhe(x), value: x, cls: x === rsRate(p) ? 'pri' : '' })) });
  p.rsRate = v; log(_tf(3398, "{$0} 把转售价定为 {$1}", nm(p), v === 1 ? _t(1512, "原价") : zhe(v)));
}
// 电脑：能发动就发动
export async function aiRoleSkill(p) { aiWild(p); if (canSkill(p)) await roleSkill(p); }
export function wildBind(p, w, id) {
  const c = COMBOS.find(x => x.id === id), miss = comboMiss(p, c);
  S.props[w].wild = { p: p.id, c: id };
  log(_tf(3401, "🧩 {$0} 把万能服务 {$1} 绑到「{$2}」上：{$3}（绑了不能换）", nm(p), sqn(w), c.n, miss.length ? _tf(3399, "顶上缺的 {$0}，架构凑成了", slotOpen(miss[0]).map(i => SQ[i].n).join(_t(1815, " 或 "))) : _t(3400, "并进这个架构，过路费一起收")));
  UI.SQFX[w] = ['fx-combo', Date.now() + 1200]; fxCast('sm', { sq: [w, 'fx-combo', 1200] });
}
// 电脑：先拿万能服务补缺（凑成架构收得最多的那个），没有可补的再并进过路费最高的已凑成架构
function aiWild(p) {
  for (const w of wildFree(p)) {
    const t = wildTargets(p).filter(x => wildFits(w, x.c)).map(x => ({ ...x, v: x.c.ix.flat().reduce((a, i) => a + (active(p, i) ? baseRent(i, 7) : 0), 0) + (x.miss.length ? 1e4 : 0) })).sort((a, b) => b.v - a.v)[0];
    if (t) wildBind(p, w, t.c.id);
  }
}
export async function wildDialog() {
  const p = cur(), ws = wildFree(p), ts = wildTargets(p);
  if (!ws.length || !ts.length) return void UI.info(_t(3402, "万能服务"), _t(3403, "<p>现在没有能绑的：要有一块没绑过的万能服务（CloudWatch、CloudTrail、Config、KMS、VPC），再有一个只差一块或已经凑齐、而且对得上的架构（KMS 要有存储或数据库；VPC 要有一块能接进 VPC 的服务，只有安全、监控、边缘、应用集成服务的架构不行）。</p>"));
  const opts = ws.flatMap(w => ts.filter(x => wildFits(w, x.c)).map(x => ({ w, x })));   // 自己就在这个架构里的不算；KMS、VPC 只能绑到对得上的架构
  const v = await UI.ask({ title: _tf(3404, "{$0} 用万能服务", p.name), html: _t(3405, "<p>万能服务不算进任何架构，但每块能「顶一次」：绑到你的一个架构上，缺一块就补上那一块，已经凑齐的就并进去，别人落在这个架构的任意一块上，它的过路费一起收。</p><p class=\"muted\">绑了不能换。之后把它卖掉、下线或被打下线：补缺的那个架构跟着散；只是并进去的，架构还在。交易给别人以后，它在别人手里不算数，也不能再绑。</p>"),
    buttons: [...opts.slice(0, 8).map(({ w, x }, k) => ({ label: `${SQ[w].n} → ${x.miss.length ? _tf(1816, "补上「{$0}」缺的 {$1}", x.c.n, slotOpen(x.miss[0]).map(i => SQ[i].n).join(_t(1815, " 或 "))) : _tf(1817, "并进「{$0}」", x.c.n)}`, value: k })), { label: _t(3406, "先不用"), value: -1 }] });
  if (v == null || v < 0) return;
  const o = opts[v]; wildBind(p, o.w, o.x.c.id); UI.render();
}

