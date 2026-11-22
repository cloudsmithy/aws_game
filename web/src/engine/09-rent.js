import { LANG, _t, _tf } from '../core/01-i18n-runtime.js';
import { BAL, CAP_MAX, IX, OFFLINE_MIN, OFFLINE_OK, OWNABLE, SQ, TOKEN, UTILS, capU, effIn, lvFull, lvName, sideCost, upCost } from '../rules/03-services.js';
import { COMBOS, INC, cAll, rsBuyRate } from '../rules/04-roles-combos-cards.js';
import { dlcRentMul } from '../rules/05-dlc.js';
import { F, P, S, active, effActive, fullRound, hasCombo, log, nm, offDrawn, offSpent, offlineCash, owns, ownsGroup, resetProp, sqn, turnNo, wildOf } from './07-state.js';
import { credit, pay } from './08-money.js';
import { rsAdj } from './15-land.js';
import { ST } from './26b-retro.js';
import { hx } from '../rules/35-modes.js';
import { viewerP } from './36-ai.js';
import { fxAll } from '../net/41-replay.js';
// ================= 过路费与升级 =================
// 用户增长：每过 growthEvery 轮，所有过路费再涨 growth（业务做大了，流量越来越多）
// 流量增长：每 growthEvery 轮过路费涨一档；growthExp 时按复利涨（后期压力更大，残局收得快）
export const trafficMul = () => { const k = Math.floor(((S && S.round) || 1) / BAL.growthEvery); const t = BAL.growthExp ? Math.round(Math.pow(1 + BAL.growth, k) * 100) / 100 : 1 + BAL.growth * k; return BAL.trafficCap ? Math.min(BAL.trafficCap, t) : t; };
export const tokUnit = i => +(baseRent(i, 100) / 100).toFixed(1);   // 按 token 计费：现在每点实收多少（已算整组、容量、过路费再 +20%、流量增长、DLC）
export function baseRent(i, dice) { if (S.props[i] && S.props[i].offline) return 0; return Math.round(baseRent0(i, dice) * trafficMul() * dlcRentMul(i)); }
export function baseRent0(i, dice) {
  const s = SQ[i], pr = S.props[i], o = P(pr.owner);
  if (s.t === 'util') return Math.round(dice * ([0, 4, 10, 20][UTILS.filter(u => active(o, u)).length] + 3 * pr.level) * (effActive(i, 'boost') ? 1.2 : 1));
  if (s.bill === 'token') return Math.round(dice * TOKEN[pr.level] * (ownsGroup(o, s.g) ? 1.5 : 1) * (1 + 0.25 * (pr.cap || 0)) * (effActive(i, 'boost') ? 1.2 : 1));
  const b = s.p * BAL.rentBase;
  const r = (pr.level === 0 ? b * (ownsGroup(o, s.g) ? 2 : 1) : b * [1, 5, 12, 20][pr.level]) * (1 + 0.25 * (pr.cap || 0)) * (effActive(i, 'boost') ? 1.2 : 1);
  return Math.round(s.bill === 'req' ? r * dice / 7 : r);   // 按请求计费：流量随点数浮动，平均和固定价一样
}
// 联合收费：落在完整架构里任一块，按整套架构所有服务的过路费加总
// 联合收费：这块服务所在的所有生效架构串在一起收，架构之间共用的服务只算一次
export function jointRent(i, dice) {
  const o = P(S.props[i].owner);
  const cs = COMBOS.filter(c => (cAll(c).includes(i) || wildOf(o, c.id) === i) && hasCombo(o, c.id));
  if (!cs.length) return null;
  // 每个架构里参与收费的服务：每一环在线的都算（「或」的几块都有就都收，可选的那块有就收），绑在上面的万能服务也算一块
  const ok = m => m != null && active(o, m) && !S.props[m].impaired && !S.props[m].offline;
  const pick = c => [...[...c.ix, ...c.ox].flatMap(n => (Array.isArray(n) ? n : [n]).filter(ok)), wildOf(o, c.id)].filter(ok);   // 11-08：「或」的几块都在手上就都算进来一起收
  const sum = list => list.reduce((a, m) => a + baseRent(m, dice), 0);
  // 串联：收得最多的那个架构全额，其他架构多出来的服务按 BAL.chainExtra 折算。默认 1（全额，模拟里折半和全额都试过，留了全额）；?bal={"chainExtra":0.5} 可以试折半
  const best = cs.map(c => ({ c, ps: pick(c) })).sort((a, b) => sum(b.ps) - sum(a.ps));
  const w = new Map(best[0].ps.map(m => [m, 1]));
  best.slice(1).forEach(b => b.ps.forEach(m => { if (!w.has(m)) w.set(m, BAL.chainExtra ?? 1); }));
  const parts = [...w.keys()], rentOf = m => Math.round(baseRent(m, dice) * w.get(m)), tot = parts.reduce((a, m) => a + rentOf(m), 0);
  return { c: best[0].c, cs: best.map(b => b.c), groups: best.map(b => b.ps), parts, tot, rentOf, half: parts.filter(m => w.get(m) < 1), name: best.map(b => b.c.n).join(' + ') };
}
// 同一个人生效的架构之间共用了哪几块（在线、没 Impaired）：别人落在共用的那块上，这几套串在一起收（算法见 jointRent）
export function chainWith(p, c) {
  const ok = m => active(p, m) && !S.props[m].impaired && !S.props[m].offline;
  return COMBOS.filter(c2 => c2.id !== c.id && hasCombo(p, c2.id)).map(c2 => ({ c: c2, sh: cAll(c).filter(m => cAll(c2).includes(m) && ok(m)) })).filter(x => x.sh.length);
}
export const chainTxt = (p, c) => chainWith(p, c).map(x => _tf(2680, "和「{$0}」共用 {$1}", x.c.n, x.sh.map(m => SQ[m].n).join(_t(349, "、")))).join(_t(408, "；"));
export const capCost = i => sideCost(i) / 2;
// 花钱加的容量有几个：Hackathon 奖品免费加的记在 pr.capFree，卖回、拆掉、估值都不算钱（和卡牌免费升级一样不退钱）。
// 老存档没有 capFree，全部按花钱加的算
const capPaid = i => { const pr = S.props[i], c = pr.cap || 0; return c - Math.min(c, pr.capFree || 0); };
export const capPaidSum = i => capPaid(i) * capCost(i);
// 减 1 个容量退多少：先减花钱加的（退一半），只剩免费的就不退
export const capBack = i => capPaid(i) > 0 ? Math.round(capCost(i) / 2) : 0;
export function capInfo(p, i) {
  const s = SQ[i], pr = S.props[i];
  if (s.t !== 'prop' || pr.owner !== p.id || pr.spot) return { ok: false };
  if (pr.offline) return { ok: false, why: _t(2681, "已下线，重新上线后才能加容量") };
  if ((pr.cap || 0) >= CAP_MAX) return { ok: false, why: _t(2682, "容量已满") };
  return { ok: true, cost: capCost(i) };
}
export function addCap(p, i) {
  const u = capInfo(p, i); if (!u.ok || p.cash < u.cost) return;
  const pr = S.props[i]; if (pr.capFree) pr.capFree = Math.min(pr.capFree, pr.cap || 0);   // 别处把容量清零时没清 capFree，先对齐，免得新加的被当成免费的
  pay(p, 'bank', u.cost); ST(p).spendUpg = (ST(p).spendUpg || 0) + u.cost; pr.cap = (pr.cap || 0) + 1;
  log(_tf(2683, "➕ {$0} 给 {$1} 加了 1 个{$2}（共 {$3} 个，${$4}）", nm(p), sqn(i), capU(SQ[i].k), S.props[i].cap, u.cost));
}
export function sellCap(p, i) {
  const pr = S.props[i]; if (!owns(p, i) || !pr.cap) return;
  const back = capBack(i);
  if (!back) { pr.capFree = Math.min(pr.capFree || 0, pr.cap) - 1; pr.cap--; return void log(_tf(5230, "➖ {$0} 给 {$1} 减了 1 个{$2}（Hackathon 免费加的，不退钱）", nm(p), sqn(i), capU(SQ[i].k))); }
  pr.cap--; credit(p, back, 'sell');
  log(_tf(2684, "➖ {$0} 给 {$1} 减了 1 个{$2}，拿回 ${$3}", nm(p), sqn(i), capU(SQ[i].k), back));
}
// viaLanding：落在自己的服务上升级，不用集齐整组
export function upgradeInfo(p, i, viaLanding = false) {
  const s = SQ[i], pr = S.props[i];
  if (!s.upg || pr.owner !== p.id) return { ok: false, why: '' };
  if (pr.offline) return { ok: false, why: _t(2685, "已下线，重新上线后才能升级") };
  if (pr.level >= 3) return { ok: false, why: _t(2686, "已经升满") };
  if (pr.spot) return { ok: false, why: _t(2687, "Spot 服务要先转成按需才能升级") };
  if (!viaLanding) {
    return { ok: false, why: _t(2688, "只有落在自己这块服务上才能升级") };
  }
  const next = pr.level + 1, eff = s.upg[next - 1][2];
  let cost = upCost(i, next);
  let off = '';
  if (s.g === 'ctr' && hasCombo(p, 'ctr')) { cost /= 2; off = _t(2689, "有「容器平台」架构，升级费减半"); }
  // ELB 本来就跨多个 AZ 的子网，EC2 多 AZ 只差在另一个 AZ 再起一台挂进目标组，所以只给这一级打折；不升照样是单 AZ
  if (s.k === 'ec2' && effIn(eff, 'maz') && hasCombo(p, 'ha')) { cost /= 2; off = _t(2690, "有「高可用入口」架构，这一级升级费减半"); }
  if (s.k === 'waf' && next <= 2 && hasCombo(p, 'ddos')) { cost /= 2; off = _t(2691, "有「DDoS 防护」架构：Shield Advanced 订阅包了 WAF 的标准费用，这一级升级费减半"); }
  cost = Math.round(cost);   // 上面三处减半会出 .5（比如 75 → 37.5）：按钮和日志写 $37.5、pay 实扣 $38、upPaid 记 37.5，之后卖回和估值都按少的那个算
  const fees = [];
  if (F.deps()) {
    if (effIn(eff, 'maz') && !active(p, IX.vpc)) {
      const vo = S.props[IX.vpc].owner;
      fees.push({ to: (vo === null || vo === p.id) ? 'bank' : P(vo), amt: 50, why: _t(2692, "实例要放进 VPC 子网（你没有 VPC）") });
    }
    if (effIn(eff, 'mr')) {
      fees.push({ to: 'bank', amt: 50, why: _t(2693, "跨区域数据传输费") });
    }
    if (s.g === 'ai' && !active(p, IX.s3)) fees.push({ to: 'bank', amt: 50, why: _t(2694, "训练数据存储费（你没有 S3）") });
  }
  // 技术债攒到 2 个每级 +$50（sur）：这是罚款，不是投入，upPaid 只记前面的升级费，卖回、去掉一级、估值都不算它
  let sur = F.debt() && p.techDebt >= 2 ? BAL.debtUpg : 0;
  // re:Invent「迁移到 Graviton」记下的一次免费：升 Graviton 这一级不花钱，技术债加价也免
  if (s.k === 'ec2' && eff === 'cost' && p.gravFree) { cost = 0; sur = 0; off = _t(2695, "用掉「迁移到 Graviton」记下的免费"); }
  cost += sur;
  return { ok: true, cost, sur, fees, off, total: cost + fees.reduce((a, f) => a + f.amt, 0), next };
}
export function doUpgrade(p, i, viaLanding = false) {
  const u = upgradeInfo(p, i, viaLanding); if (!u.ok || p.cash < u.total) return;
  pay(p, 'bank', u.cost); u.fees.forEach(f => { const a = pay(p, f.to, f.amt); if (f.to !== 'bank') ST(p).viaP = (ST(p).viaP || 0) + a; }); if (S.stats) S.stats.upg++; ST(p).upg++; ST(p).spendUpg = (ST(p).spendUpg || 0) + u.total;
  // 升上 Graviton 就用掉记下的免费。别的免费升级（Well-Architected Review、MAP 补贴等）升上去的不清，卖掉这一级再升还能用
  if (i === IX.ec2 && u.next === 3) p.gravFree = 0;
  S.props[i].level++; (S.props[i].upPaid = S.props[i].upPaid || [])[S.props[i].level - 1] = u.cost - u.sur; fxAll({ f: 'block', a: [i, p.color], co: [i, _tf(2696, "升级 <b>{$0}</b>", lvName(i, S.props[i].level)), 'org'] });
  log(_tf(2699, "🔧 {$0} 给 {$1} 升到{$2}（${$3}{$4}{$5}）", nm(p), sqn(i), lvFull(i, S.props[i].level), u.total, u.fees.length ? _t(2697, "，含") + u.fees.map(f => f.why).join(_t(349, "、")) : '', u.off ? _t(2698, "，") + u.off : ''));
}
// 某一级升级实际花了多少（老存档、卡牌免费升的没有记录时按标准价算；免费升的记 0）
export const upPaidOf = (i, l) => { const a = S.props[i].upPaid; return a && a[l - 1] != null ? a[l - 1] : upCost(i, l); };
export const upPaidSum = i => { let t = 0; for (let l = 1; l <= S.props[i].level; l++) t += upPaidOf(i, l); return t; };
export function sellUpgrade(p, i) {
  const pr = S.props[i]; if (!owns(p, i) || pr.level <= 0) return;
  const back = Math.round(upPaidOf(i, pr.level) / 2);
  log(_tf(2700, "🔻 {$0} 去掉 {$1} 的「{$2}」，拿回实付的一半 ${$3}", nm(p), sqn(i), lvName(i, pr.level), back));
  if (pr.upPaid) pr.upPaid.length = pr.level - 1;
  pr.level--; credit(p, back, 'sell');
}
export function takeOffline(p, i) {
  const pr = S.props[i]; if (!owns(p, i) || pr.offline || !OFFLINE_OK.has(SQ[i].k) || offSpent(i)) return;
  while (pr.cap > 0) sellCap(p, i);
  while (pr.level > 0) sellUpgrade(p, i);
  const cash = offlineCash(i);
  pr.offline = 1; pr.offTurn = turnKey(); pr.offCash = cash; pr.offDrawn = offDrawn(i) + cash; pr.offAsked = 0; pr.impaired = false; p.wentOffline = true; credit(p, cash, 'sell');
  log(_tf(2701, "⏹ {$0} 把 {$1} 下线，先拿回 ${$2} 周转：不收过路费，运行费只剩存储费；下线 {$3} 轮后自动恢复，拿回的钱不用还；自己落到这一格可以提前免费拉起来，这期间别人落上来可以付原价 ${$4} 把它买走", nm(p), sqn(i), cash, OFFLINE_MIN, SQ[i].p));
}
// 强制下线（高速部署的 DDoS、Health 卡）：不收过路费、不算持有（active() 认 ddos），运行费照交；by 那位玩家再开始 n 个回合时恢复。
// why = 原因的键：'rf' 清技术债，'inc:卡号' 某张 Health 卡（界面写「因「卡名」下线」，用 downWhy 按当前语言翻）；null 是 DDoS，界面写「被某某 DDoS」。
// 存键不存文字：联机时房主和远端的语言可以不一样，中途切语言也跟着变。和主动下线（offline，相当于抵押）是两回事
// downAt：第几个回合下线的。至少一整轮以后 downTick 才开始倒数（fullRound），哪个回合被打下线都一样
export function forceDown(i, by, n, why = null) { const pr = S.props[i]; pr.ddos = by; pr.ddosLeft = n; pr.ddosWhy = why; pr.downAt = turnNo(); }
// 解除强制下线：三个字段一起清。只清 ddos 的话 ddosLeft、ddosWhy 留着，下次被 DDoS 时界面会把旧原因当成这次的
export function clearDown(i) { const pr = S.props[i]; pr.ddos = null; pr.ddosLeft = 0; pr.ddosWhy = null; pr.downAt = null; }
// 强制下线的原因，显示用；老存档里存的是当时翻好的文字，照原样显示
export function downWhy(pr) {
  const w = pr && pr.ddosWhy; if (!w) return '';
  if (w === 'rf') return _t(4208, "清技术债");
  const m = /^inc:(\d+)$/.exec(w); return m ? (INC[+m[1]] ? INC[+m[1]].n : '') : w;
}
export function downTick(p) {
  OWNABLE.forEach(i => {
    const pr = S.props[i]; if (pr.ddos !== p.id || !fullRound(pr.downAt) || --pr.ddosLeft > 0) return;   // 不满一整轮不倒数：DDoS 2 回合的第一下也要等一整轮
    const why = downWhy(pr); clearDown(i);
    log(why ? _tf(5294, "{$0} 恢复上线（{$1}）", sqn(i), why) : _tf(3409, "{$0} 扛过了 {$1} 的 DDoS，恢复上线", sqn(i), nm(p)));
  });
}
// 这一回合的编号（每回合只能做一次的事记它）：座位号占两位，MAX_PLAYERS 是 12，原来的 round × 10 在第 11、12 个座位会和下一轮撞号。
// 存档里记着的旧编号读档时换算（ui/28-setup-save.js 的 S.tk）
export const turnKey = () => S.round * 100 + S.cur;
export const offRounds = i => Math.max(0, (S.props[i].offline || 1) - 1);   // 已经下线了几轮（下线时是 1，主人每到一个回合开始 +1）
export const canOnline = i => !!S.props[i].offline && S.props[i].offTurn !== turnKey() && offRounds(i) >= OFFLINE_MIN;
// 重新上线不要钱：主人自己落到这一格就拉起来，满 OFFLINE_MIN 轮没人动它就在回合开始自动恢复。
// 下线时拿回的那一半（offCash）不用还，所以这里只清状态、不走 pay
export function bringOnline(p, i) {
  const pr = S.props[i]; if (!owns(p, i) || !pr.offline) return false;
  const n = Math.max(1, pr.offline - 1);   // 「已下线 N 轮」和别处同一个算法，要在清零前记下
  pr.offline = 0; pr.offCash = 0; pr.offTurn = 0; pr.offAsked = 0;
  log(_tf(2702, "▶️ {$0} 把 {$1} 重新上线，不要钱（下线了 {$2} 轮）", nm(p), sqn(i), n));
  return true;
}
// 卖回亚马逊云科技：整块服务（买价 + 升级 + 容量的实付）按 BAL.sell（8 折）回收，升级越多卖得越多；
// 已下线的要扣掉下线时先拿走的那一半。卖完回到亚马逊云科技，谁落上来都能买
// Spot 出价只有主人自己看得到：联机时是自己这台设备的座位，同屏时是当前回合的人
export const spotMine = i => { const pr = S && S.props[i], v = typeof viewerP === 'function' ? viewerP() : null; return !!(pr && pr.owner != null && v && v.id === pr.owner); };
export const spotTxt = i => spotMine(i) ? _tf(2703, "Spot 出价 ${$0}", S.props[i].spotPaid) : _t(2704, "Spot（出价多少看不到）");
export const buyPaid = i => { const pr = S.props[i]; return pr.spot ? pr.spotPaid : (pr.paid ?? SQ[i].p); };
// 只拆升级和容量（服务留着）：各退实付的一半
// 和 takeOffline 一样一份一份、一级一级退，每次各自取整，显示的数和实际到账一致
export const stripValue = i => { const pr = S.props[i]; let v = capPaid(i) * Math.round(capCost(i) / 2); for (let l = 1; l <= pr.level; l++) v += Math.round(upPaidOf(i, l) / 2); return v; };
// 折扣按中文习惯写：0.5 → 5 折，0.45 → 45 折，0.85 → 85 折
export const zhe = x => { const n = Math.round(x * 100); return LANG === 'en' ? `${100 - n}% off` : LANG === 'ja' ? `${100 - n}%オフ` : _tf(2705, "{$0} 折", n % 10 ? n : n / 10); };   // 英文版写成「20% off」，日文版「20%オフ」
export const sellZhe = () => zhe(BAL.sell);
// Trusted Advisor 按实付全额退：买价 + 升级 + 容量，减掉这位主人下线时已经拿到的钱（已经恢复上线的也扣）。按钮上的数和实际到账共用这一个算法
export const fullBack = i => Math.max(0, buyPaid(i) + upPaidSum(i) + capPaidSum(i) - offDrawn(i));
export const sellValue = i => Math.max(0, Math.round((buyPaid(i) + upPaidSum(i) + capPaidSum(i)) * BAL.sell) - offDrawn(i));
// 服务离开主人（卖回、交易、破产分给债主、被战略并购）：他给这块买的 RI 作废、预付不退（规则书 §15「RI 跟着人走」）；
// 落到发动 DDoS 的人手里，DDoS 跟着解除（自己打自己说不通，和战略并购一样）。to 是新主人的 id，回到亚马逊云科技传 null
export function svcLeaves(from, i, to) {
  const pr = S.props[i];
  if (from && from.commits) from.commits = from.commits.filter(c => !(c.type === 'ri' && c.svc === i));
  if (pr) { pr.ri = null; pr.offDrawn = pr.offline ? (pr.offCash || 0) : 0; if (to != null && pr.ddos === to) clearDown(i); }   // offDrawn：原主人下线拿走的钱新主人没拿过，清零；但还在下线的那一半跟着服务走（卖回、估值照扣，恢复前也不能再下线拿钱），不然转手一次就能把那一半再卖一遍
}
// 服务整块换主人（交易、破产分给债主、战略并购、抢 Spot、代理商清仓）：先 svcLeaves，再改主人、断开代理关系。
// 代理商按进货价拿的库存（pr.paid 是 5 折）给了不是代理商的人，买价改按原价：客户的估值本来就按原价算服务（valBreak），卖回、下线不改的话按 5 折，两边对不上
export function handOver(from, i, to) {
  const pr = S.props[i]; svcLeaves(from, i, to.id);
  if (from.reseller && !to.reseller && !pr.spot) pr.paid = SQ[i].p;
  pr.owner = to.id; pr.via = null;
}
export function sellProp(p, i) {
  if (!owns(p, i)) return;
  const v = sellValue(i), lv = S.props[i].level;
  svcLeaves(p, i, null); resetProp(i); p.released = (p.released || 0) + 1; credit(p, v, 'sell');
  log(_tf(2707, "💱 {$0} 把 {$1}{$2}卖回亚马逊云科技，按实付 {$3} 折拿回 ${$4}；以后不用再交它的运行费，这块谁落上来都能买", nm(p), sqn(i), lv ? _tf(2706, "（含「{$0}」）", lvName(i, lv)) : ' ', Math.round(BAL.sell * 10), v));
}
const SAAS_SLS = new Set(['lambda', 'apigw', 'dynamodb']);   // SaaS 创业公司打折的还是原来那几块（Serverless 不再是色组）
export function roleDisc(p, i) {
  if (p.reseller) return rsBuyRate(p);
  if (p.role === 'data' && SQ[i].g === 'ana') return hx('data') ? 0.9 : 0.8;
  if (p.role === 'media' && SQ[i].g === 'storage') return hx('media') ? 0.9 : 0.8;
  if (p.role === 'health' && SQ[i].g === 'db') return 0.8;
  if (p.role === 'legacy' && (i === IX.ec2 || i === IX.rds)) return 0.85;
  if (p.role === 'fin' && SQ[i].g === 'sec') return 0.8;
  if (p.role === 'ai' && SQ[i].g === 'ai' && !hx('ai')) return 0.9;
  if (p.role === 'ecom' && SQ[i].g === 'net') return 0.8;
  if (p.role === 'saas' && (SAAS_SLS.has(SQ[i].k) || SQ[i].g === 'integ')) return 0.8;
  return 1;
}

// （从 ui/27a-board.js 挪来）
// 格子、当前所在格、悬停提示、详情和明细里标的过路费：和 payRent 乘倍率（双倍、技能、爆款上线、答题）之前算的一样，按掷 7 点估。
// 组成有效架构的按整套联合收费；代理商没组成架构的库存不收（地狱模式照收）；下线、DDoS、Impaired 为 0。只标单块会让人低估好几倍
export function shownRent(i) {
  const pr = S.props[i], o = P(pr.owner), s = SQ[i];
  if (pr.offline || pr.ddos != null || pr.impaired) return { r: 0, jr: null, txt: '$0' };
  const jr = jointRent(i, 7);
  let r = jr ? jr.tot : baseRent(i, 7);
  const ra = rsAdj(o, jr, r); r = ra.r;   // 代理商的库存：和 payRent 同一套规则
  if (s.k === 'bedrock' && hasCombo(o, 'rag')) r += 50;
  // 托管服务商自己的服务 9 折是常驻规则（不是临时倍率），和 payRent 一样算进去
  if (o.role === 'rs_msp' && pr.via == null) { r = Math.round(r * 0.9); ra.note = [ra.note, _t(3084, "托管服务商自己的服务 9 折")].filter(Boolean).join(_t(408, "；")); }
  // 架构里只要有一块按用量或 token 收，实际金额就随点数浮动，前面带「≈」；没成架构的 Bedrock 照旧写「点数×单价」
  const fl = m => SQ[m].bill === 'req' || SQ[m].bill === 'token' || SQ[m].t === 'util';
  const txt = !r ? '$0' : s.bill === 'token' && !jr ? _tf(3929, "点数×{$0}", tokUnit(i)) : `${(jr ? jr.parts : [i]).some(fl) ? '≈' : ''}$${r}`;
  // 新账户保护期每笔最多 $50（payRent 最后封顶）：标封顶后的数，随点数浮动的写「≤$50」；full、fullTxt 留着原数，悬停说明和详情里写第 3 轮起收多少
  if (F.balance() && S.round <= BAL.protect && r > 50) return { r: 50, jr, txt: txt[0] === '≈' || txt.startsWith(_t(3930, "点数")) ? '≤$50' : '$50', rn: ra.note, cap: true, full: r, fullTxt: txt };
  return { r, jr, txt, rn: ra.note };
}
