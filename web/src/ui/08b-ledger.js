import { _t, _tf } from '../core/01-i18n-runtime.js';
import { PAWN, awsImg } from '../core/02-util.js';
import { IX, OWNABLE, SQ, capU, effIn, lvFull, upCost } from '../rules/03-services.js';
import { COMBOS, comboOpen, slotOpen } from '../rules/04-roles-combos-cards.js';
import { dlcOn } from '../rules/05-dlc.js';
import { F, INK, S, active, comboMiss, hasCombo, logRow, nm, ownedBy, owns, wildFree, wildOf, winWA } from '../engine/07-state.js';
import { runCost, valBreak, valTip } from '../engine/08c-costs.js';
import { capCost, chainTxt, shownRent, spotMine, upPaidSum } from '../engine/09-rent.js';
import { ask } from './10-modal.js';
import { refactorCost } from '../engine/17-health.js';
import { PILLARS, SEC_PILLAR, pillarNeed, pillarParts, pillarTotal, pillars, waRuleText, waTotalNeed } from '../engine/26a-pillars-win.js';
import { ST } from '../engine/26b-retro.js';
import { PILLAR_SHORT, pillarItems, ppRow } from './27c-center.js';
import { archFlow } from './27e-square-gallery.js';
import { isHidden } from '../rules/35-modes.js';
import { isAI } from '../engine/36-ai.js';
import { MP } from '../net/40-host-sync.js';
// 总资产和估值用同一套拆分，界面上、战报里、导出的记录都按这个算
// 每个玩家的明细：每块服务的投入、收的过路费、交的运行费，加上和他有关的日志
export function showLedger(id) {
  const p = S.players[id]; if (!p) return;   // 明细、玩法、图鉴、格子介绍、快捷键是查资料窗（view），开在流程弹窗上面一层，不用先等下面的弹窗关掉
  const t = ST(p), v = valBreak(p);
  const rows = ownedBy(p).map(i => { const pr = S.props[i], s = SQ[i]; return `<tr><td>${awsImg(s.icon)}${s.n}</td><td>${pr.spot ? (spotMine(i) ? `Spot $${pr.spotPaid}` : _t(2587, "Spot（出价看不到）")) : `$${pr.paid ?? s.p}`}</td><td>${s.upg ? lvFull(i, pr.level) : '—'}${pr.cap ? _tf(2588, " · {$0} 个{$1}", pr.cap, capU(s.k)) : ''}${pr.offline ? _t(2589, " · 已下线") : ''}${pr.impaired ? ' · Impaired' : ''}</td><td>\$${upPaidSum(i) + (pr.cap || 0) * capCost(i)}</td><td><b>\$${t.earnBy[i] || 0}</b>${t.hitsBy[i] ? _tf(2590, "<small>（{$0} 次）</small>", t.hitsBy[i]) : ''}</td><td>${_tf(2593, "${$0}/圈 · 累计 ${$1}", runCost(i), t.runBy[i] || 0)}</td><td>${(sr => sr.txt + (sr.cap ? _tf(2591, "（保护期封顶，之后 {$0}）", sr.fullTxt) : '') + (sr.jr ? _t(2592, "（架构联合）") : ''))(shownRent(i))}</td></tr>`; }).join('');
  const sold = Object.keys(t.earnBy).map(Number).filter(i => !owns(p, i) && t.earnBy[i]);
  const logs = S.log.filter(l => l.includes(nm(p)) || l.includes(`<b style="color:${p.color}">${p.name}</b>`) || l.includes(`<b style="color:${INK[p.color]}">${p.name}</b>`)).slice(0, 120).map(logRow).join('');
  ask({ local: true, cancelable: true, view: true, cls: 'wide', title: _tf(2594, "{$0} 的明细", p.name), html: `<div class="ledger">
    <div class="lsum"><div>${_tf(2599, "<small>现金</small><b>${$0}</b>", p.cash)}</div><div>${_tf(2600, "<small>总资产</small><b>${$0}</b>", v.net)}</div><div title="${valTip(p)}">${_tf(2601, "<small>估值</small><b>${$0}</b>", v.val)}</div><div>${_tf(2602, "<small>收过路费</small><b>${$0}</b>", t.rentIn)}</div><div>${_tf(2603, "<small>付过路费</small><b>${$0}</b>", t.rentOut)}</div><div>${_tf(2604, "<small>领 Credits</small><b>${$0}</b>", t.salary)}</div><div>${_tf(2605, "<small>交运行费</small><b>${$0}</b>", t.runTot)}</div></div>
    <h4>${_t(2606, "每块服务的收费明细")}</h4>
    ${rows ? _tf(2595, "<table><tr><th>服务</th><th>买价</th><th>级别</th><th>升级和容量投入</th><th>本局收过路费</th><th>运行费</th><th>现在的过路费（7 点）</th></tr>{$0}</table>", rows) : _t(2596, "<p class=\"muted\">还没有服务。</p>")}
    ${sold.length ? _tf(2597, "<p class=\"muted\">已经不在手上的服务也收过：{$0}</p>", sold.map(i => `${SQ[i].n} $${t.earnBy[i]}`).join(_t(349, "、"))) : ''}
    <p class="muted">${valTip(p)}</p>
    <h4>${_t(2607, "架构")}</h4>${archLedger(p)}
    <h4>${_t(2608, "六大支柱")}</h4>${pillarGuide(p)}
    <h4>${_tf(2609, "和 {$0} 有关的动态（最近 120 条，时间是你电脑的时区）", p.name)}</h4><div class="log llog">${logs || _t(2598, "<span class=\"muted\">还没有</span>")}</div></div>`, buttons: [{ label: _t(2610, "关闭"), value: true, cls: 'pri' }] });
}
// 明细里的「架构」一节：这个人凑成的、只差几块的（缺的那块现在在谁手上：在别人手上要靠交易，没人买的落上去就能买），再列全场谁凑成了什么
// 每条支柱「怎么拿分」：按这个人手上的服务和这局的设置给具体做法（明细和支柱悬停共用）
function pillarTips(p) {
  const x = pillarParts(p);
  const owned = ownedBy(p).filter(i => active(p, i) && SQ[i].upg);
  // 手上的服务往上升能拿到某种效果的那一级：写「EC2 升到第 1 级「多 AZ」（还要升 1 级，每级 $100）」
  const upTo = eff => owned.map(i => { const pr = S.props[i], k = SQ[i].upg.findIndex((u, l) => l >= pr.level && effIn(u[2], eff)); return k < 0 ? null : _tf(2611, "{$0} 升到第 {$1} 级「{$2}」（还要升 {$3} 级，一共 ${$4}）", SQ[i].n, k + 1, SQ[i].upg[k][0], k + 1 - pr.level, Array.from({ length: k + 1 - pr.level }, (_, n) => upCost(i, pr.level + 1 + n)).reduce((a, b) => a + b, 0)); }).filter(Boolean);
  const buy = list => list.filter(i => S.props[i].owner == null && !isHidden(i)).map(i => `${SQ[i].n} $${SQ[i].p}`);
  const others = list => list.filter(i => S.props[i].owner != null && S.props[i].owner !== p.id).map(i => _tf(2612, "{$0}（在 {$1} 手上）", SQ[i].n, S.players[S.props[i].owner].name));
  const near = COMBOS.filter(comboOpen).filter(c => !hasCombo(p, c.id)).map(c => ({ c, miss: c.ix.filter(n => !(Array.isArray(n) ? n : [n]).some(i => active(p, i))) })).filter(y => y.miss.length === 1).map(y => _tf(2613, "「{$0}」再买 {$1}", y.c.n, slotOpen(y.miss[0]).map(i => SQ[i].n).join(_t(1815, " 或 "))));
  const canSP = (F.full() || dlcOn('finops')) && p.role !== 'indie';
  const lim = (a, n = 4) => a.length > n ? a.slice(0, n).join(_t(349, "、")) + _tf(2614, " 等 {$0} 处", a.length) : a.join(_t(349, "、"));
  const tips = [
    [buy([IX.cloudwatch, IX.cloudtrail, IX.sfn, IX.eventbridge]).length && _tf(2615, "买 {$0}（每块 +1）", lim(buy([IX.cloudwatch, IX.cloudtrail, IX.sfn, IX.eventbridge]))), others([IX.cloudwatch, IX.cloudtrail, IX.sfn, IX.eventbridge]).length && _tf(2616, "交易 {$0}", lim(others([IX.cloudwatch, IX.cloudtrail, IX.sfn, IX.eventbridge]))), !p.coe.length && _t(2617, "进一次维护窗口、出来时写复盘（+1）")],
    [buy(SEC_PILLAR()).length && _tf(2618, "买安全组的服务或 CloudFront：{$0}（每块 +1）", lim(buy(SEC_PILLAR()))), F.actions() && _t(2619, "主动行动里做 GameDay 演练，每个演练标记 +1")],
    [upTo('maz').length && _tf(2620, "{$0}（每处 +1）", lim(upTo('maz'))), upTo('mr').length && _tf(2621, "{$0}（每处 +2）", lim(upTo('mr'))), !owned.some(i => SQ[i].upg.some(u => effIn(u[2], 'maz') || effIn(u[2], 'mr'))) && _t(2622, "手上没有能升多 AZ 或多区域的服务：买 EC2、RDS、Aurora 这类实例型服务再升第 1 级")],
    [upTo('scale').length && _tf(2620, "{$0}（每处 +1）", lim(upTo('scale'))), near.length && _tf(2623, "凑成一个有效架构也算 1 分：{$0}", lim(near, 3))],
    [upTo('cost').length && _tf(2620, "{$0}（每处 +1）", lim(upTo('cost'))), !x.commit && (canSP ? _t(2624, "签一次 Savings Plans / RI，或者用掉 Cost Explorer 卡（+1）") : _t(2625, "用掉 Cost Explorer 卡（+1）")), F.debt() && !p.refactored && (p.techDebt ? _tf(2626, "花 ${$0} 重构清掉 1 个技术债（+1）", refactorCost(p)) : _t(2627, "以后欠了技术债就重构清掉（+1）"))],
    [buy(OWNABLE.filter(i => SQ[i].type === 'sls')).length && _tf(2628, "买 Serverless 服务：{$0}（每块 +1）", lim(buy(OWNABLE.filter(i => SQ[i].type === 'sls')))), !x.grav && owns(p, IX.ec2) && _t(2629, "EC2 升到 Graviton（+1）"), upTo('ssh').length && _tf(2630, "{$0}（交给亚马逊云科技管底层机器，+1）", lim(upTo('ssh')))],
  ];
  return tips;
}
// 每条支柱的分是从哪来的：一项一行，带图标和几分。和 pillarParts 的算法一一对应（多区域一块 2 分，演练标记有几个算几分）
function pillarSrc(p, k, x = pillarParts(p)) {
  const one = (list, t = i => SQ[i].n, g = 1) => list.map(i => ({ i, t: t(i), g: `+${g}` }));
  return [
    [...one(x.ops), ...(p.coe.length ? [{ t: _t(2631, "写过复盘"), g: '+1' }] : [])],
    [...one(x.secs), ...(p.drill.length ? [{ t: _tf(2632, "演练标记 ×{$0}", p.drill.length), g: `+${p.drill.length}` }] : [])],
    [...one(x.nat, i => _tf(2633, "{$0} 天生跨 AZ", SQ[i].n)), ...one(x.maz, i => _tf(2634, "{$0} 升了多 AZ", SQ[i].n)), ...one(x.mr, i => _tf(2635, "{$0} 多区域", SQ[i].n), 2)],
    [...one(x.sc, i => _tf(2636, "{$0} 弹性扩展", SQ[i].n)), ...x.combos.map(c => ({ t: _tf(2637, "架构「{$0}」生效", c.n), g: '+1' }))],
    [...(p.refactored ? [{ t: _t(2638, "重构过技术债"), g: '+1' }] : []), ...(x.commit ? [{ t: _t(2639, "签过 SP/RI 或用过 Cost Explorer"), g: '+1' }] : []), ...one(x.co, i => _tf(2640, "{$0} 降成本", SQ[i].n))],
    [...one(x.sls, i => `${SQ[i].n} Serverless`), ...(x.grav ? [{ i: IX.ec2, t: 'EC2 Graviton', g: '+1' }] : []), ...one(x.lifecycle, i => _tf(2641, "{$0} 数据分层", SQ[i].n)), ...one(x.managedCompute, i => _tf(2642, "{$0} 托管底层机器", SQ[i].n))],
  ][k];
}
function pillarGuide(p) {
  const x = pillarParts(p), need = pillarNeed(), tot = pillarTotal(p), totNeed = waTotalNeed(), ok = pillars(p), tips = pillarTips(p);
  const src = k => { const l = pillarSrc(p, k, x); return l.length ? `<ul class="ppl have">${l.map(ppRow).join('')}</ul>` : _t(2643, "<span class=\"muted\">还没有分</span>"); };
  const rows = PILLARS.map((n, k) => { const it = ok[k] ? [] : pillarItems(p, k); return `<tr class="${ok[k] ? 'done' : ''}"><td><b>${n}</b></td><td>${_tf(2647, "{$0} 分{$1}", x.score[k], ok[k] ? _t(2644, " <span class=\"ok\">已达成</span>") : _tf(2645, " <span class=\"warn\">还差 {$0} 分</span>", need - x.score[k]))}</td><td>${src(k)}</td><td>${ok[k] ? `<span class="muted">${PILLAR_SHORT[k]}</span>` : it.length ? `<ul class="ppl">${it.slice(0, 6).map(ppRow).join('')}</ul>${it.length > 6 ? _tf(2646, "<p class=\"ppmore\">还有 {$0} 种做法</p>", it.length - 6) : ''}` : `<span class="muted">${PILLAR_SHORT[k]}</span>`}</td></tr>`; }).join('');
  const head = `<p>${_tf(2651, "{$0}要求{$1}。{$2} 现在 {$3}/6 条达标，总分 {$4}{$5}{$6}。", winWA() ? _t(2648, "这局开了六大支柱胜利：") : _t(2649, "这局没开六大支柱胜利，支柱分只算进复盘和估值参考："), waRuleText(), p.name, ok.filter(Boolean).length, tot, totNeed ? `/${totNeed}` : '', ok.every(Boolean) && tot >= totNeed ? _t(2650, "，<b class=\"ok\">已经达成</b>") : '')}</p>`;
  return head + _tf(2652, "<table class=\"archl pg\"><tr><th>支柱</th><th>分数</th><th>分是怎么来的</th><th>怎么拿分</th></tr>{$0}</table>", rows);
}
function archLedger(p) {
  // 只有轮到这个人、他是真人、在这台设备上操作、不在结算中时才放「找他交易」按钮（交易本来就只能在自己回合里发起）
  const canTrade = !S.over && p.id === S.cur && !isAI(p.id) && (S.phase === 'roll' || S.phase === 'post') && (MP.role === 'client' ? p.id === MP.mySeat && !MP.gone : !(MP.role === 'host' && MP.isRemote(p.id) && !MP.hostPlays(p.id)));
  const slotTxt = n => slotOpen(n).map(i => { const o = S.props[i].owner == null ? null : S.players[S.props[i].owner]; return _tf(2658, "<b>{$0}</b>（{$1}）", SQ[i].n, !o ? _t(2653, "没人买，落上去就能买") : o.id === p.id ? _t(2654, "在你手上") : _tf(2657, "在 <span style=\"color:{$0}\">{$1}</span> 手上，要靠交易{$2}", o.color, o.name, canTrade && o.alive ? (S.props[i].level || S.props[i].cap ? _t(2655, "；这块有升级或容量，要他先去掉才能交易") : _tf(2656, " <button class=\"sm\" data-act=\"tradeFor\" data-arg=\"{$0},{$1}\">找 {$2} 交易</button>", o.id, i, o.name)) : '')); }).join(_t(1815, " 或 "));
  const rows = COMBOS.filter(comboOpen).map(c => {
    const have = c.ix.filter(n => (Array.isArray(n) ? n : [n]).some(i => active(p, i)));
    return { c, have: have.length, t: c.ix.length, done: hasCombo(p, c.id), miss: c.ix.filter(n => !have.includes(n)) };
  }).filter(x => x.have).sort((a, b) => b.done - a.done || b.have / b.t - a.have / a.t);
  // 只列凑成的和只差一块的；都没有时列进度最高的 5 个，免得一长串 1/3
  const near = rows.filter(x => x.done || x.have >= x.t - 1), show = near.length ? near : rows.slice(0, 5);
  // 有没绑的万能服务：缺的那块也能用它顶上
  const wf = wildFree(p).map(w => SQ[w].n);   // 「缺的那块也能用万能服务顶上」：下面按架构再看对不对得上（KMS、VPC 有限制）
  const mine = show.length ? _tf(2667, "<table class=\"archl\"><tr><th>架构</th><th>组成（每块下面写现在归谁）</th><th>还缺</th></tr>{$0}</table>", show.map(x => `<tr class="${x.done ? 'done' : ''}"><td><b>${x.c.n}</b><br>${x.done ? _tf(2663, "<span class=\"ok\">已生效，联合收费</span>{$0}{$1}", (t => t ? _tf(2659, "<br><small class=\"chain\">{$0}：别人落在共用的那块上，几套串在一起收</small>", t) : '')(chainTxt(p, x.c)), wildOf(p, x.c.id) != null ? _tf(2662, "<br><small class=\"muted\">{$0} 万能服务{$1}</small>", SQ[wildOf(p, x.c.id)].n, x.have < x.t ? _t(2660, "顶上了缺的那块") : _t(2661, "并进来一起收")) : '') : `<small class="muted">${x.have}/${x.t}</small>`}</td><td><div class="flow">${archFlow(x.c, true)}${(() => { const w = wildOf(p, x.c.id); if (w == null) return ''; const m = comboMiss(p, x.c); return `<span class="arr">+</span><span class="af wildc">${awsImg(SQ[w].icon)}${SQ[w].n}<small>${m.length === 1 ? _tf(2664, "万能服务，顶替 {$0}", slotOpen(m[0]).map(i => SQ[i].n).join(_t(1815, " 或 "))) : _t(2665, "万能服务，并进来一起收")}</small></span>`; })()}</div></td><td>${x.done ? '—' : x.miss.map(slotTxt).join(_t(408, "；")) + (x.miss.length === 1 && wf.length ? _tf(2666, "<br><small class=\"muted\">也可以用万能服务 {$0} 顶上（中间「用万能服务」）</small>", wf.join(_t(1815, " 或 "))) : '')}</td></tr>`).join('')) : _t(2668, "<p class=\"muted\">手上的服务还不属于任何有效架构。</p>");
  const all = S.players.filter(q => q.alive).map(q => { const cs = COMBOS.filter(c => hasCombo(q, c.id)); return cs.length ? _tf(2669, "<li>{$0}<b>{$1}</b>：{$2}</li>", PAWN(q.color), q.name, cs.map(c => c.n).join(_t(349, "、"))) : ''; }).join('');
  return mine + _tf(2672, "<p class=\"muted\" style=\"margin-top:8px\">全场已经生效的架构{$0}</p>{$1}<p class=\"muted\">每个架构由哪几块组成、每块现在归谁，看「图鉴」的有效架构表。</p>", all ? _t(2670, "：") : _t(2671, "：还没有人凑成"), all ? `<ul class="archall">${all}</ul>` : '');
}
