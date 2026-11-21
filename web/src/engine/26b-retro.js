import { __rv, _t, _tf, _tr } from '../core/01-i18n-runtime.js';
import { PAWN, awsImg, usd } from '../core/02-util.js';
import { SQ } from '../rules/03-services.js';
import { COMBOS, comboOpen, roleOf, slotOpen } from '../rules/04-roles-combos-cards.js';
import { dlcOn } from '../rules/05-dlc.js';
import { F, P, S, active, hasCombo, ownedBy, owns, wildOf } from './07-state.js';
import { valBreak, valTip, valuation } from './08c-costs.js';
import { startCashOf } from './21-skills.js';
import { PILLARS, pillars } from './26a-pillars-win.js';
import { finKind, finalRank } from './26d-gameover.js';
import { isParty } from '../rules/35-modes.js';
// 每位玩家的战报数据
// 关键事件：战报里的时间线
export const evt = (t, w = 0, kind) => { if (!S) return; (S.events = S.events || []).push({ r: S.round, t, w, ...(kind ? { kind } : {}) }); };
// 战报别再靠匹配文案认事件：evt 存的是当前语言的译文，英文/日文版下 /账[号户]被暂停/ 永远匹配不上，
// 「谁第几轮出局」「单笔最大的过路费」就全没了（实测 zh 命中 1、en 和 ja 命中 0）。
// 新存档看 e.kind；旧存档退回多语言正则兜一下。
export const reportEventIs = (e, kind) => e.kind ? e.kind === kind
  : kind === 'out' ? _tr(3649, "账[号户]被暂停|account (was )?suspended|アカウント(が|を)?停止", "i").test(e.t)
  : kind === 'rent' ? _tr(3650, " 付给 .+ 过路费 | paid .+ rent|通行料", "i").test(e.t)
  : false;
// 出局轮次：优先用破产时写下的 p.outRound，没有再去事件里找（旧存档）
export const reportOutRound = q => {
  if (q.alive) return null;
  if (Number.isInteger(q.outRound) && q.outRound > 0) return q.outRound;
  // 名字后面必须紧跟空格或 's，否则「Yu」会匹配到「Yuki 账户被暂停」那条（tests/report-i18n.spec.mjs 盯着这条）
  const e = (S.events || []).find(x => x.t.startsWith(q.name) && /^(?:\s|'s\b)/.test(x.t.slice(q.name.length)) && reportEventIs({ ...x, t: x.t.slice(q.name.length) }, 'out'));
  return e ? e.r : null;
};
export const ST = p => { S.pst = S.pst || {}; return S.pst[p.id] || (S.pst[p.id] = { rentIn: 0, rentOut: 0, inc: 0, hit: 0, imm: 0, quizOk: 0, quizN: 0, buy: 0, upg: 0, fis: 0, maxRent: 0, earnBy: {}, hitsBy: {}, runBy: {}, runTot: 0, salary: 0 }); };
// 结束复盘：每个人钱花在哪、最赚和最烧钱的服务、凑成的和差一块就能凑成的架构、想赢可以怎么改。
// 算数（retroData）和排版分开：战报用 retroOf 排成 HTML，导出的对局记录用 retroTxt 写成纯文本，不用再从 HTML 里剥字（以前改一次版式就要改一次剥字的正则）
function retroData(q) {
  const t = ST(q), money = x => usd(x);
  const buy = t.spendBuy || 0, upg = t.spendUpg || 0, run = t.runTot || 0, rent = t.rentOut || 0, pot = t.toPot || 0, req = t.spendReq || 0, misc = t.spendMisc || 0;
  // 交给亚马逊云科技的钱扣掉已经分了类的，剩下的才是账单格、卡上的罚款、重构技术债这些。分了类的钱里有一部分付给了别的玩家
  // （经代理商买的服务和运行费、交给代理商的请求费、升级时付给 VPC 主人的费用），不在 toBank 里，先加回来再扣
  const other = Math.max(0, (t.toBank || 0) + (t.viaP || 0) - buy - upg - run - req - misc);
  // 按钱的去向排：买服务和升级（钱换成了服务）→ 经营开销 → 付给别人的和罚掉的。成本流向线、小账都按这个顺序，颜色也按这三类分（SPEND_C）
  const cats = [[_t(3651, "买服务"), buy], [_t(3652, "升级和容量"), upg], [_t(3653, "运行费"), run], [_t(3104, "请求费"), req], [_t(3654, "抽卡和其他"), misc], [_t(3655, "付过路费"), rent], [_t(3656, "罚款和账单"), pot + other]].filter(x => x[1] > 0);
  const total = cats.reduce((a, x) => a + x[1], 0);   // 写真实合计；一分钱没花的写「几乎没花钱」，不显示「共 $0」
  const earn = Object.entries(t.earnBy || {}).sort((a, b) => b[1] - a[1])[0], burn = Object.entries(t.runBy || {}).sort((a, b) => b[1] - a[1])[0];
  // 差一块：缺的那一环要是都在别人手上（买不到，只能交易），写明在谁手上，免得建议去「再买」一块根本买不到的服务
  const near = COMBOS.filter(comboOpen).map(c => ({ c, miss: c.ix.filter(n => !(Array.isArray(n) ? n : [n]).some(i => owns(q, i))) })).filter(x => x.miss.length === 1).slice(0, 3)
    .map(x => { const cand = slotOpen(x.miss[0]), held = cand.map(i => { const o = S.props[i] && S.props[i].owner; return o != null && o !== q.id ? P(o) : null; });
      const buyN = cand.map(i => SQ[i].n).join(_t(1815, " 或 ")), one = held.every(h => h && h === held[0]);
      const who = !held.every(Boolean) ? '' : _tf(3660, "（{$0}，要靠交易）", one ? _tf(3658, "{$0}在 {$1} 手上", cand.length > 1 ? _t(3657, "都") : '', held[0].name) : cand.map((i, j) => _tf(3659, "{$0} 在 {$1} 手上", SQ[i].n, held[j].name)).join(_t(2698, "，")));
      const act = who ? _t(3661, "还差") : _t(3662, "再买");
      return { ...x, buyN, who, how: `${act} ${buyN}${who}`, txt: _tf(3663, "「{$0}」{$1} {$2}{$3}", x.c.n, act, buyN, who) }; });
  const tips = [], combos = COMBOS.filter(c => hasCombo(q, c.id));
  // 只建议这局真能用的办法：SP / RI 按钮的条件和操作栏一样（独立开发者不能签），娱乐模式不能下线
  const canSP = (F.full() || dlcOn('finops')) && q.role !== 'indie', canOffl = !isParty();
  // 和上一名差多少（finalRank 里的前一名）：在线的非赢家第一条就写具体的数，知道差的是一个架构还是好几个
  const w = S.winner != null ? P(S.winner) : null, rank = finalRank(w), prev = rank[rank.indexOf(q) - 1];
  if (prev && q.alive && S.winner !== q.id) {
    const d = valuation(prev) - valuation(q), lack = PILLARS.filter((_, k) => !pillars(q)[k]);
    tips.push(d < 0 ? _tf(3665, "估值比 {$0} 还高 {$1}，输在对方先达成了六大支柱{$2}", prev.name, money(-d), lack.length ? _tf(3664, "：你还差{$0}", lack.join(_t(349, "、"))) : '')
      : d === 0 ? _tf(3666, "和上一名 {$0} 估值持平：多凑一个架构（估值 +$200）就能排到前面", prev.name)
      : d <= 400 ? _tf(3667, "和上一名 {$0} 只差 {$1}：多凑一个架构（估值 +$200）或者少被罚一次，名次就可能换过来", prev.name, money(d))
      : _tf(3668, "和上一名 {$0} 差 {$1}：每凑成一个架构估值 +$200，还能联合收费", prev.name, money(d)));
  }
  if (run > (t.rentIn || 0) && run > 200) tips.push(_tf(3671, "运行费交了 {$0}，比收到的过路费 {$1} 还多：少买空着也收钱的实例型服务{$2}{$3}", money(run), money(t.rentIn), canSP ? _t(3669, "，或者签 Savings Plans") : '', canOffl ? _t(3670, "、把用不上的下线") : ''));
  if (rent > (t.rentIn || 0) * 1.5 && rent > 300) tips.push(_tf(3672, "付出去的过路费 {$0} 是收进来的 {$1} 倍：边玩边答题能减过路费，多凑整组和架构才收得回来", money(rent), ((rent) / Math.max(1, t.rentIn || 0)).toFixed(1)));
  if (!combos.length) tips.push(near.length ? _tf(3673, "一个有效架构都没凑成，其实{$0}，凑齐就能联合收费", near[0].txt) : _t(3674, "一个有效架构都没凑成：联合收费是收得最多的方式，买服务时先看能凑哪个架构"));
  if ((t.hit || 0) >= 3 && (t.imm || 0) < t.hit) tips.push(_tf(3675, "被 Health 事件罚了 {$0} 次、只免疫 {$1} 次：先做多 AZ、买一块安全服务，最便宜的防护最值", t.hit, t.imm || 0));
  if (pot + other > total * 0.25 && pot + other > 300) tips.push(_tf(3677, "罚款和账单花了 {$0}，占总支出的 {$1}%：{$2}Cost Explorer 卡能免交一次 NAT Gateway 这类账单格", money(pot + other), Math.round((pot + other) / total * 100), F.debt() ? _t(3676, "技术债早点重构；") : ''));
  if (q.techDebt > 0) tips.push(_tf(3678, "结束时还背着 {$0} 个技术债，每个让估值少 $100", q.techDebt));
  if (t.quizN >= 3 && t.quizOk / t.quizN < 0.6) tips.push(_tf(3679, "答题 {$0}/{$1}，正确率 {$2}%：模拟里全答对的人胜率接近一半，多看解析", t.quizOk, t.quizN, Math.round(t.quizOk / t.quizN * 100)));
  if (q.alive && q.cash > 1200 && ownedBy(q).length < 6) tips.push(_tf(3680, "手里囤着 {$0} 现金、只有 {$1} 块服务：钱放着不生钱，早点买服务、升级", money(q.cash), ownedBy(q).length));
  if (!q.skillUsed && roleOf(q).sk && !q.alive) tips.push(_tf(3681, "专属技能「{$0}」一直没用上：总资产跌破开局资金一半时就能发动，别等到破产", roleOf(q).sk.n));
  // 兜底也写这一局的事实，不写「打得很稳」这种空话
  if (!tips.length) {
    const e = S.winner === q.id ? finEdge(q) : null;
    tips.push(S.winner === q.id ? (e && e.lead > 0 ? _tf(3683, "领先第 2 名 {$0} {$1}{$2}，各项都没有明显短板", e.r2.name, money(e.lead), e.by ? _tf(3682, "，拉开最多的是{$0}（{$1} {$2}）", e.by[0], e.by[2], money(e.by[1])) : '') : _t(3684, "各项都没有明显短板"))
      : q.alive ? _t(3685, "多凑一个架构（估值 +$200）或者少被罚一次，名次就可能往前")
      : canOffl ? _t(3686, "缺钱时先把用不上的服务下线（拿回一半现金），能多撑几轮") : _t(3687, "缺钱时先把用不上的服务卖回亚马逊云科技换现金，能多撑几轮"));
  }
  return { money, cats, total, earn, burn, near, combos, tips: tips.slice(0, 4) };
}
// 成本流向线和小账的颜色（深色战报）：钱花在哪只分三类——浅 = 投进去的（买服务、升级），灰 = 经营开销，红 = 流走的（付给别人的过路费、罚款和账单）
let SPEND_C = __rv(() => ({ [_t(3651, "买服务")]: '#e9edf2', [_t(3652, "升级和容量")]: '#e9edf2', [_t(3653, "运行费")]: '#8d99a8', [_t(3104, "请求费")]: '#8d99a8', [_t(3654, "抽卡和其他")]: '#8d99a8', [_t(3655, "付过路费")]: '#f0614f', [_t(3656, "罚款和账单")]: '#f0614f' }), v => { SPEND_C = v; }, () => SPEND_C);   // 键写成字符串：英文版翻译时和 cats 里的名字一起换
let SPEND_OUT = __rv(() => ([_t(3655, "付过路费"), _t(3656, "罚款和账单")]), v => { SPEND_OUT = v; }, () => SPEND_OUT);   // 小账里这两行的金额写红字
// 钱从哪来：一种来源一级灰，由浅到深（过路费最浅，最显眼）；深底上最深的一级也有 3:1 的对比度
let GAIN_C = __rv(() => ({ [_t(3688, "实收过路费")]: '#e9edf2', [_t(3689, "起点 Credits")]: '#b7c0cb', [_t(3690, "卡牌和技能")]: '#8f9bab', [_t(3691, "卖回和下线")]: '#717d8c', [_t(3692, "其他")]: '#5d6876' }), v => { GAIN_C = v; }, () => GAIN_C);
const outTag = q => S.winner === q.id ? _t(3693, " · 获胜") : q.alive ? '' : _t(3694, " · 已出局");
// 战报里的状态：「获胜」「已出局」包成一块不折行（不改 outTag，导出的纯文本还在用它）
// 架构图里的一块服务：官方图标 + 名字。窄屏只露图标，名字留给读屏（.nd em 用 sr-only 的办法藏，不用 display:none）；
// tip 才挂 title：战报里悬停、手机上点一下能看名字，结束画面点一下是「继续」，不能顺带弹提示
export const svcNode = (i, cls = '', tip = false) => `<span class="nd${cls ? ' ' + cls : ''}"${tip ? ` title="${SQ[i].n}"` : ''}>${awsImg(SQ[i].icon)}<em>${SQ[i].n}</em></span>`;
// 凑成的架构画成一条链：有备选的那一环画玩家手上在线的那块（hasCombo 认的就是在线的）
// 用万能服务顶上的那一环画万能服务；并进去的万能服务接在最后
export const comboNodes = (q, c) => { const w = wildOf(q, c.id), ns = c.ix.map(n => (Array.isArray(n) ? n : [n]).find(i => active(q, i)) ?? w).filter(i => i != null); return w != null && !ns.includes(w) ? [...ns, w] : ns; };
// 一个人的复盘档案（战报下半，一次只露一份）：框左上角贴名次标签（赢家橙框），抬头是名字、估值和几个关键数，
// 下面第一排是钱花在哪、钱从哪来（两条线同一个比例尺，长短能直接比）和服务，第二排是架构小图（凑成的、差一块的接着往右排，放不下再换行），最后是想赢可以怎么改。
// 不管架构多少，每一排的高矮都差不多，左右不会一边长出一大截、一边空着
// X 是 repExtra() 读出来的新指标，没有的项那一块不画
export function retroOf(q, k, X = repExtra(), rank = finalRank(S.winner != null ? P(S.winner) : null)) {
  const d = retroData(q), m = d.money, win = S.winner === q.id, v = valuation(q), top = rank.length ? valuation(rank[0]) : 0;
  const g = X.gain(q), lo = X.low(q), dc = X.dice(q);
  // 两条线同一个比例尺：进得多还是出得多，看线的长短就知道
  const scale = Math.max(d.total, g ? g.total : 0) || 1;
  const line = (cats, total, C) => `<div class="ml" style="--w:${(total / scale * 100).toFixed(1)}%" aria-hidden="true">${cats.map(([n, x]) => `<i style="flex-grow:${x};background:${C[n]}"></i>`).join('')}</div>`;
  // 占比：不到 1% 的写「<1%」，不写成 0%
  const pct = (x, t) => { const r = x / (t || 1) * 100; return r > 0 && r < 1 ? '&lt;1%' : `${Math.round(r)}%`; };
  const ledger = (cap, cats, total, C, red = []) => `<table class="lgr"><caption class="sr-only">${q.name} ${cap}</caption><tbody>${cats.map(([n, x]) => `<tr${red.includes(n) ? ' class="rd"' : ''}><th scope="row"><i style="--c:${C[n]}" aria-hidden="true"></i>${n}</th><td>${m(x)}</td><td class="pc">${pct(x, total)}</td></tr>`).join('')}</tbody>${cats.length > 1 ? _tf(3695, "<tfoot><tr><th scope=\"row\">合计</th><td>{$0}</td><td class=\"pc\"></td></tr></tfoot>", m(total)) : ''}</table>`;
  const spend = _tf(3699, "<section class=\"mf\"><h5>钱花在哪{$0}</h5>{$1}</section>", d.total ? _tf(3696, "<span>共 <b>{$0}</b></span>", m(d.total)) : '', d.total ? line(d.cats, d.total, SPEND_C) + ledger(_t(3697, "钱花在哪"), d.cats, d.total, SPEND_C, SPEND_OUT) : _t(3698, "<p class=\"mu\">几乎没花钱</p>"));
  // 钱从哪来里的过路费是到手的现金；排名里写的是应收的，对方没付上的那部分在下面说一句，两个数对得上
  // 三段各自不折行，只在段之间换行（括号那段不会从中间断开）
  const unpaid = g && g.unpaid ? _tf(3700, "<p class=\"mf-n\"><span>过路费应收 <b>{$0}</b>，</span><span>其中 <b>{$1}</b> 对方没付上现钱</span><span>（欠着没还，或者破产时拿服务抵了）</span></p>", m(g.rentIn), m(g.unpaid)) : '';
  const earn = g ? _tf(3703, "<section class=\"mf\"><h5>钱从哪来{$0}</h5>{$1}{$2}</section>", g.total ? _tf(3696, "<span>共 <b>{$0}</b></span>", m(g.total)) : '', g.total ? line(g.cats, g.total, GAIN_C) + ledger(_t(3701, "钱从哪来"), g.cats, g.total, GAIN_C) : _t(3702, "<p class=\"mu\">这一局没进过钱</p>"), unpaid) : '';
  // 服务：最赚钱、最烧钱各一行，前面是官方图标；运行费是流走的钱，金额红字
  const srow = (i, lab, amt) => `<li>${awsImg(SQ[i].icon)}<small>${lab}</small><span><b>${SQ[i].n}</b> ${amt}</span></li>`;
  const svc = `<ul class="sv">${d.earn ? srow(d.earn[0], _t(3704, "最赚钱"), _tf(3705, "收了 <b>{$0}</b>", m(d.earn[1]))) : _t(3706, "<li class=\"no\"><span>没收到过路费</span></li>")}${d.burn ? srow(d.burn[0], _t(3707, "最烧钱"), _tf(3708, "运行费 <b class=\"rd\">{$0}</b>", m(d.burn[1]))) : ''}</ul>`;
  // 架构小图：凑成的是实线框、图标之间实线连；差一块的是虚线框，缺的那一环是个虚线空位，里面灰着放能补上的服务。虚线只用在这里
  const LN = '<i class="ln" aria-hidden="true"></i>', node = i => `<span class="nd" title="${SQ[i].n}">${awsImg(SQ[i].icon)}<em>${SQ[i].n}</em></span>`;
  const made = d.combos.map(c => `<div class="ag"><b>${c.n}</b><div class="ach">${comboNodes(q, c).map(node).join(LN)}</div></div>`).join('');
  const slot = x => `<span class="nd gap" title="${x.how}"><span class="slot">${slotOpen(x.miss[0]).slice(0, 2).map(i => awsImg(SQ[i].icon)).join('')}</span><em>${x.buyN}</em></span>`;
  // 框底只在缺的那块都在别人手上（买不到，要靠交易）时补一句「都在 X 手上，要靠交易」：空位下面已经写了缺哪块，不再写第二遍。按逗号分段，每段不折行
  const held = x => x.who ? `<p>${x.who.replace(_tr(3709, "^（|）$", "g"), '').split(_t(2698, "，")).map(t => `<span>${t}</span>`).join(_t(2698, "，"))}</p>` : '';
  const near = d.near.map(x => _tf(3710, "<div class=\"ag near\"><b>{$0}<small>差一块</small></b><div class=\"ach\">{$1}</div>{$2}</div>", x.c.n, x.c.ix.map(n => n === x.miss[0] ? slot(x) : node((Array.isArray(n) ? n : [n]).find(i => owns(q, i)))).join(LN), held(x))).join('');
  const arch = (made ? _tf(3711, "<section class=\"dz-a1\"><h5 class=\"il\">凑成的架构<span>{$0} 个</span></h5><div class=\"acs\">{$1}</div></section>", d.combos.length, made) : '')
    + (near ? _tf(3712, "<section class=\"dz-a2\"><h5>差一块就能凑成</h5><div class=\"acs\">{$0}</div></section>", near) : '')
    || _t(3713, "<section><h5>架构</h5><p class=\"mu\">一个都没凑成，也没有只差一块的</p></section>");
  // 抬头右边的大数：估值、与第 1 名（六大支柱赢的写 6/6）
  const kv = [[_t(3714, "估值"), `<b title="${valTip(q)}">${usd(v)}</b>`],
    k ? [_t(3715, "与第 1 名"), `<b>${v === top ? _t(3716, "持平") : usd(v - top, true)}</b>`] : win && finKind(P(S.winner), S.overWhy || '') === 'wa' ? [_t(2608, "六大支柱"), '<b>6/6</b>'] : null].filter(Boolean);
  // 抬头下面一行小字（新指标，没有就不写）：现金最低的那一刻、手气。还在场、现金掉到开局资金四分之一以下（或欠钱）的才叫「离破产最近」；
  // 一直很宽裕的、已经出局的写「现金最低」。欠钱时写「欠到 −$X」，红字
  const brink = lo && q.alive && lo.cash < startCashOf(q) * .25;
  const sub = [lo && `<span><em>${brink ? _t(3717, "离破产最近") : _t(3718, "现金最低")}</em>${lo.r ? _tf(3719, "第 {$0} 轮，", lo.r) : ''}${lo.cash < 0 ? _tf(3720, "欠到 <b class=\"rd\">{$0}</b>", usd(lo.cash)) : `${brink ? _t(3721, "现金最低到") : _t(3722, "剩")} <b>${usd(lo.cash)}</b>`}</span>`,
    dc && _tf(3723, "<span><em>手气</em>掷了 <b>{$0}</b> 次，平均 <b>{$1}</b> 点，对子 <b>{$2}</b> 次</span>", dc.n, dc.avg.toFixed(1), dc.dbl)].filter(Boolean);
  const st = `${roleOf(q).n}${q.reseller ? _t(3724, " · 代理商") : ''} · ${q.alive ? _t(3725, "在线") : _t(3726, "已出局")}`;
  return `<article class="dz${win ? ' win' : ''}${q.alive ? '' : ' out'}" aria-label="${_tf(3727, "{$0} 的复盘", q.name)}">${_tf(3728, "<span class=\"lt\">第 {$0} 名{$1}</span>", k + 1, win ? _t(3693, " · 获胜") : q.alive ? '' : _t(3694, " · 已出局"))}
    <header class="dz-h"><div class="dz-id">${PAWN(q.color)}<b>${q.name}</b><small>${st}</small></div><dl class="dz-k">${kv.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('')}</dl>${sub.length ? `<p class="dz-x">${sub.join('')}</p>` : ''}</header>
    <div class="dz-r1${earn ? '' : ' n2'}">${spend}${earn}<section class="dz-s"><h5>${_t(3729, "服务")}</h5>${svc}</section></div>
    <div class="dz-ar">${arch}</div>
    <section class="dz-t"><h5>${_t(3730, "想赢可以怎么改")}</h5><ol class="tips">${d.tips.map(x => `<li>${x}</li>`).join('')}</ol></section></article>`;
}
// 导出对局记录里的复盘：和战报同一份数据，一项一行
export function retroTxt(q) {
  const d = retroData(q), m = d.money;
  return [_tf(3731, "{$0}（{$1}{$2}）", q.name, roleOf(q).n, outTag(q)),
    d.total ? _tf(3732, "钱花在哪（共 {$0}）：{$1}", m(d.total), [...d.cats].sort((a, b) => b[1] - a[1]).map(([n, v]) => `${n} ${m(v)}`).join(_t(349, "、"))) : _t(3733, "钱花在哪：几乎没花钱"),
    _tf(3737, "服务：{$0}{$1}", d.earn ? _tf(3734, "最赚钱 {$0} 收了 {$1}", SQ[d.earn[0]].n, m(d.earn[1])) : _t(3735, "没收到过路费"), d.burn ? _tf(3736, "；最烧钱 {$0} 运行费 {$1}", SQ[d.burn[0]].n, m(d.burn[1])) : ''),
    ...(d.combos.length ? [_tf(3738, "凑成的架构：{$0}", d.combos.map(c => c.n).join(_t(349, "、")))] : []),
    ...(d.near.length ? [_tf(3739, "差一块就能凑成：{$0}", d.near.map(x => x.txt).join(_t(408, "；")))] : []),
    S.winner === q.id ? _t(3740, "还能更稳：") : _t(3741, "想赢可以怎么改："), ...d.tips.map(x => `- ${x}`)].join('\n') + '\n';
}
// （从 ui/26c-report.js 挪来）
// 赢在哪：赢家和第 2 名的估值按项比，拉开最多的那一项（升级和容量在估值里算两次，这里也按两倍比；技术债是少的一方占便宜）
export function finEdge(w) {
  const r2 = w ? finalRank(w)[1] : null; if (!r2) return null;
  const a = valBreak(w), b = valBreak(r2);
  const by = [[_t(3753, "现金"), a.cash - b.cash, _t(3417, "多")], [_t(3729, "服务"), a.svc - b.svc, _t(3417, "多")], [_t(3652, "升级和容量"), (a.inv - b.inv) * 2, _t(3417, "多")], [_t(2607, "架构"), a.arch - b.arch, _t(3417, "多")], [_t(3754, "复盘"), a.coe - b.coe, _t(3417, "多")], [_t(3755, "技术债"), b.debt - a.debt, _t(3416, "少")]].sort((x, y) => y[1] - x[1])[0];
  return { r2, lead: a.val - b.val, by: by[1] > 0 ? by : null };
}
// （从 ui/26c-report.js 挪来）
// 战报里的新指标（埋点在掷骰、收钱、回合推进、开局、结束那几处写，这里只读）。老存档、联机老版本可能一项都没有：全部判空，没有的返回 null，那一块就不画
export function repExtra() {
  const num = x => typeof x === 'number' && isFinite(x), pst = S.pst || {}, T = q => pst[q.id] || {};   // 只读 S.pst，不顺手给远端补空记录
  // 对局用时：开局到结束的分钟数，关掉页面到读档那段（S.tOff）不算，和导出记录里的「用时」一致；没记、记反了、超过一天都不写
  const dt = num(S.t0) && num(S.t1) ? S.t1 - S.t0 - (num(S.tOff) ? S.tOff : 0) : NaN, mins = dt > 0 && dt < 864e5 ? Math.max(1, Math.round(dt / 6e4)) : null;
  const minTxt = mins == null ? '' : mins < 60 ? _tf(3773, "{$0} 分钟", mins) : _tf(3775, "{$0} 小时{$1}", Math.floor(mins / 60), mins % 60 ? _tf(3774, " {$0} 分钟", mins % 60) : '');
  // 估值走势：每项 [轮次, 0 号估值, 1 号, …]，坏掉的项丢掉
  const vh = Array.isArray(S.valHist) ? S.valHist.filter(e => Array.isArray(e) && num(e[0])) : [];
  // 老存档读档后才开始记的（S.mFrom 大于 1）：钱从哪来、手气、最低现金只有后半局，不全就不画
  const full = !(S.mFrom > 1);
  // 钱从哪来：五个来源，名字和 GAIN_C 对上；负数和缺项按 0。过路费这一项是真正到手的现金（gain.rent），
  // 排名里的「过路费 收」是落地时按应收记的（rentIn）：对方欠着没还、破产时拿服务抵掉的那部分不在这里，差多少另外写一句（unpaid）
  const gain = q => { const x = T(q).gain; if (!full || !x || typeof x !== 'object') return null;
    const cats = [[_t(3688, "实收过路费"), x.rent], [_t(3689, "起点 Credits"), x.salary], [_t(3690, "卡牌和技能"), x.card], [_t(3691, "卖回和下线"), x.sell], [_t(3692, "其他"), x.other]].map(([n, y]) => [n, num(y) ? Math.max(0, Math.round(y)) : 0]).filter(c => c[1] > 0);
    const rin = num(T(q).rentIn) ? T(q).rentIn : 0, got = num(x.rent) ? Math.round(x.rent) : 0;
    return { cats, total: cats.reduce((a, c) => a + c[1], 0), rentIn: rin, unpaid: Math.max(0, Math.round(rin - got)) }; };
  const dice = q => { const x = T(q).dice; return full && x && num(x.n) && x.n > 0 && num(x.pips) ? { n: x.n, avg: x.pips / x.n, dbl: num(x.dbl) ? x.dbl : 0 } : null; };
  const low = q => { const x = T(q).low; return full && x && num(x.cash) ? { cash: Math.round(x.cash), r: num(x.r) && x.r > 0 ? x.r : null } : null; };
  // 全场最赚钱的格子：所有人的 earnBy 按格子加起来（转过手的格子，前后几个主人收的都算），归收得最多的那个人
  const by = {};
  S.players.forEach(q => Object.entries(T(q).earnBy || {}).forEach(([i, y]) => { if (!num(y) || y <= 0 || !SQ[+i]) return; const b = by[i] = by[i] || { i: +i, t: 0, who: {} }; b.t += y; b.who[q.id] = (b.who[q.id] || 0) + y; }));
  const h = Object.values(by).sort((a, b) => b.t - a.t)[0], hq = h && P(+Object.entries(h.who).sort((a, b) => b[1] - a[1])[0][0]);
  return { mins, minTxt, vh, gain, dice, low, hot: h && hq ? { i: h.i, t: Math.round(h.t), q: hq } : null };
}
