import { _t, _tf } from '../core/01-i18n-runtime.js';
import { SIM, sleep, waitAnim } from '../core/02-util.js';
import { UI } from '../core/02b-ui-port.js';
import { BAL, IX, N, SQ } from '../rules/03-services.js';
import { CATS, REI, roleOf, rsBuyRate, viaOf } from '../rules/04-roles-combos-cards.js';
import { reGoLog } from '../rules/05-dlc.js';
import { F, P, S, availCard, cur, hasCombo, log, nm, ownedBy, owns } from './07-state.js';
import { credit, pay } from './08-money.js';
import { CO_SVCS, coKind, coRightsize, debtFee, opCost, runCost, spActive, svcRunDue } from './08c-costs.js';
import { drawReinvent } from './18-reinvent.js';
import { quarterly } from './19-balance.js';
import { speedLose } from './22-speed.js';
import { ST } from './26b-retro.js';
import { hx, isParty, withCardMul } from '../rules/35-modes.js';
import { aiTurn, isAI } from './36-ai.js';
import { MP } from '../net/40-host-sync.js';
import { fxAll, fxCast } from '../net/41-replay.js';
// ================= 移动 =================
// 展示路径只到下一个结算边界，最多一圈；不掷骰、不修改 S。
function walkSegment(from, remaining, dir) {
  const path = [];
  for (let j = 0; j < Math.min(remaining, N); j++) {
    const to = (from + dir + N) % N; path.push(to); from = to;
    if (dir > 0 && (to === 0 || (SQ[to].t === 'free' && j + 1 < remaining))) break;
    if (dir < 0 && to === N - 1) break;
  }
  return path;
}
export async function moveSteps(p, n) {
  if (p.jail !== null) { log(_tf(1759, "{$0} 在维护窗口里，不移动", nm(p))); return; }   // 被甩来、被逼着抽到移动类的卡：人不动，罚照算
  const dir = n > 0 ? 1 : -1;
  const hop = !SIM && n !== 0 && UI.FX.pawnStart(p), mt0 = UI.MOVE_TO;
  const stepMs = (Math.abs(n) > 10 ? 90 : aiTurn() ? 110 : 150) * UI.animK();   // 3D 棋子每一跳的时长
  const paceMs = hop ? stepMs : Math.max(1, 70);   // 本机没播 3D 时的真实节拍，远端照这个速度走
  // 走棋事件和「本机能不能播 3D」解耦：本机演不演都照发，由每台远端用 MPFX.can() 自己决定演不演。
  // 以前套在 if (hop) 里，房主一台播不了（手机、减少动态效果、WebGL 不可用），整桌就都没棋子（issue #31）。
  if (!SIM && n !== 0) fxCast('ws', { p: p.id, from: p.pos });
  // 开头整页画一次（走之前扣的钱、记的日志、出维护窗口都要显示），等这一页画完两帧再起跳：
  // 不然手机上这一帧的排版和绘制要几十毫秒，第一跳的动画按时间算进度，前半段弧线就被跳过了。切到后台没有帧，最多等 100ms
  if (hop) { S.moving = p.id; UI.__set_MOVE_TO(null); UI.render(); await new Promise(r => { requestAnimationFrame(() => requestAnimationFrame(r)); setTimeout(r, 100); }); }
  let batchEnd = 0;
  try {
  for (let k = 0; k < Math.abs(n); k++) {
    if (k === batchEnd) {
      const path = walkSegment(p.pos, Math.abs(n) - k, dir); batchEnd += path.length;
      fxCast('walk', { p: p.id, seq: MP.walkSeq = (MP.walkSeq || 0) + 1, from: p.pos, path, ms: paceMs, last: batchEnd === Math.abs(n) });
    }
    p.pos = (p.pos + dir + N) % N;
    if (hop && k === Math.abs(n) - 1) { UI.__set_MOVE_TO(p.pos); UI.hopRender(); }   // 最后一跳前才在终点格放占位，3D 棋子落在占位上
    // 老版本客户端只认逐格的 ws/wh，两种分支都要发；本机能不能播只影响下面那行 pawnHop
    if (!SIM) fxCast('wh', { p: p.id, from: (p.pos - dir + N) % N, to: p.pos, ms: paceMs, last: k === Math.abs(n) - 1 });
    if (hop) await waitAnim(UI.FX.pawnHop(p.pos, stepMs), stepMs + 100);
    S.lastSq = p.pos;
    let paid = false;   // 经过起点、UG 领了钱：现金和日志变了，这一格要整页重画
    if (dir > 0 && p.pos === 0) { await passStart(p); paid = true; }
    if (dir < 0 && p.pos === N - 1) { p.reGo = (p.reGo || 0) + 1; reGoLog(p); }   // 一格格往回退过了起点（在起点前几格抽到「发布出问题，回滚」），同 flyTo
    // 经过 UG 活动（没停在上面）领取 $50
    if (dir > 0 && SQ[p.pos].t === 'free' && k < Math.abs(n) - 1) { await passUG(p); paid = true; }
    // 走棋时侧栏和中间区都不变，别的格只重画棋盘。有 3D 棋子的开头和走完（finally）各整页画一次；
    // 没有 3D 棋子的第一格整页画（走之前扣的钱、记的日志马上显示），最后一格也整页画
    if (paid || (!hop && (k === 0 || k === Math.abs(n) - 1))) UI.render(); else UI.hopRender();
    if (!hop) await sleep(SIM ? 0 : 70); if (!SIM) UI.sfx('step');
  }
  } finally { if (!SIM && n !== 0) fxCast('we', { p: p.id }); if (hop) { await waitAnim(UI.FX.pawnEnd(), 300); S.moving = null; UI.__set_MOVE_TO(mt0); UI.render(); } }
}
async function moveTo(p, target) { await moveSteps(p, (target - p.pos + N) % N); }
// 被送进维护窗口、不交钱要停几轮：传统企业上云 2 轮，其他角色 1 轮（11-06 起不再掷对子出狱）
export const jailMax = p => p.role === 'legacy' && p.jailCat !== 'rf' ? 2 : 1;   // 清技术债进来的（jailCat 'rf'，见 engine/17-health.js 的 debtCleared）谁都只停一轮
// 被送进来时棋子是直接瞬移过去的，真人玩家弹一次说明：为什么进来、下回合怎么出来；电脑只在格子上方冒一句，不挡着它跑
export async function sendToJail(p, cat, why = '') {
  p.pos = IX.jail; p.jail = 0; p.jailCat = cat;
  // 被「根因在上游」甩进来、被混沌注入送进来的不是当前玩家：别清掉当前玩家掷对子的再掷，落点高亮也留在他那格
  const mine = p.id === cur().id; if (mine) { S.lastSq = IX.jail; S.again = false; }
  // 高速部署：进维护窗口扣 4 点部署点数，那是出了事故；清技术债（rf）是主动停机维护，不扣
  log(_tf(2869, "🚨 {$0} 进了维护窗口", nm(p))); if (cat !== 'rf') speedLose(p, 4, _t(2870, "进维护窗口"));
  if (SIM || !why) return;
  UI.render();
  if (isAI(p.id)) { fxAll({ co: [IX.jail, _tf(2871, "<b>{$0} 进了维护窗口</b><small>{$1}</small>", p.name, why), 'warn', 2800] }); return; }
  const m = jailMax(p);
  await UI.ask({ who: p.id, title: _tf(2872, "{$0} 进了维护窗口", p.name), html: `<p>${why}</p><p>${_tf(2878, "{$0}轮到你的下一回合二选一：", mine ? _t(2873, "这回合不再往前走。") : '')}</p><ul><li>${_t(2879, "<b>付 $50 开 Support Case</b>：马上出来，当回合照常掷骰子走")}</li><li>${_tf(2880, "<b>停{$0}轮</b>：{$1}", m > 1 ? ` ${m} ` : _t(2874, "一"), m > 1 ? _tf(2875, "接下来 {$0} 个回合都不走（传统企业上云的限制），停完出来", m) : _t(2876, "那一回合不走，停完出来，再下一回合照常掷骰子"))}</li>${availCard(p, 'ES') ? _t(2877, "<li><b>用掉 Enterprise Support 卡</b>：免费出来，照常掷骰子</li>") : ''}</ul><p class="muted">${_tf(2881, "关在里面照样收过路费。出来时用一句话讲清这次的根因，能领 1 个{$0}类复盘标记。", CATS[cat])}</p>`, buttons: [{ label: _t(2478, "知道了"), value: true, cls: 'pri' }] });
}
// debt 是 oc 里的技术债加价：客户自己欠的，直接交亚马逊云科技，不切给代理商。
// 切给代理商的比例按扣掉 RI 之后的单块运行费算（和 runAfterRI 一个口径），RI 全额抵掉的那块不会分走别的服务的钱
// half 是这次的运行费减半卡（'hour' 只减 Compute Optimizer 给降配建议的，'all' 整单减），和 runAfterRI 一样用 svcRunDue 逐块算，比例才和实际交的对得上
function payRun(p, oc, debt = 0, half = '') {
  const via = {}; let all = 0;
  ownedBy(p).forEach(i => { const c = svcRunDue(p, i, half); const v = S.props[i].via; all += c; if (v != null && v !== p.id && P(v).alive && P(v).reseller) via[v] = (via[v] || 0) + c; });
  const run = Math.max(0, oc - debt); let left = run;
  Object.entries(via).forEach(([rid, c]) => {
    const r = P(+rid), share = all ? Math.min(left, Math.round(run * c / all)) : 0; if (share <= 0) return;
    left -= share; const cost = Math.round(share * rsBuyRate(r));
    ST(p).viaP = (ST(p).viaP || 0) + pay(p, r, share); pay(r, 'bank', cost);
    log(_tf(2882, "🤝 {$0} 经 {$1} 买的服务运行费 ${$2} 交给 {$3}；{$4} 按拿货价交亚马逊云科技 ${$5}，赚差价 ${$6}", nm(p), nm(r), share, nm(r), nm(r), cost, share - cost));
  });
  if (left + oc - run > 0) pay(p, 'bank', left + oc - run);
}
// 托管服务商的托管费按经他买的块数每圈收，和这圈有没有运行费无关：只经他买了 Lambda、SQS 这类按用量计费的服务（运行费 $0），或者运行费被技能全免，也照收
export const mspFee = p => S.players.filter(r => r.alive && r.role === 'rs_msp' && r.id !== p.id).map(r => ({ r, n: viaOf(r, p).length })).filter(x => x.n);
function payMspFee(p) { mspFee(p).forEach(({ r, n }) => { pay(p, r, 10 * n); log(_tf(2883, "{$0} 付 {$1} 托管费 ${$2}（{$3} 块）", nm(p), nm(r), 10 * n, n)); }); }
// 经过起点：领 Credits、交运行费，都不乘卡牌倍率（卡牌带着走过去也一样）；
// 娱乐模式送的 re:Invent 卡先记下来，等这一步走完、落点结算完再抽，免得卡里的移动和这一步搅在一起（多走、结算两次）
// 经过 UG 活动（没停在上面）领 $50：走过去、往前飞过去都算，不乘卡牌倍率
export async function passUG(p) { await withCardMul(0, async () => credit(p, 50, 'other')); log(_tf(2884, "👥 {$0} 经过 UG 活动，领取 $50", nm(p))); }
export async function passStart(p) {
  // 前面往回绕过了起点：这次只是走回原来那一圈，不算新的一圈。Credits、运行费、托管费、代理商的运行费分成、渠道维护费都没有，
  // Savings Plans / RI 和技能的「接下来几圈」也不扣这一圈，娱乐模式不送卡；季度财报照常计数，不然第一位玩家抽到这张卡，所有人的财报都往后推
  if (p.reGo > 0) { p.reGo--; log(_tf(2885, "{$0} 经过 Startup 扶持：前面往回绕过了起点，这次不算新的一圈，不领 Credits、不交运行费", nm(p))); await withCardMul(0, () => quarterTick(p)); return; }
  await withCardMul(0, () => passLaunch(p)); if (isParty()) p.goRei = (p.goRei || 0) + 1;
}
export async function goReiCards(p) { while (isParty() && p.alive && p.goRei > 0) { p.goRei--; log(_tf(2886, "🎟 娱乐模式：{$0} 经过 Startup 扶持，送一张 re:Invent 卡", nm(p))); await drawReinvent(p); } }
async function passLaunch(p) {
  const credits = S.round <= (BAL.creditRounds || 999);
  let g = credits ? BAL.salary : (BAL.salaryLate ?? BAL.salary);
  if (p.role === 'garage' && credits && !hx('garage')) g += 50;
  if (hasCombo(p, 'lake')) g += 50;
  credit(p, g, 'salary'); p.laps = (p.laps || 0) + 1;   // 真正走完的圈数（往回绕过起点的不算，见 passStart）：考全场按它算
  // 「这一圈」的效果（re:Invent 卡挂的 p.lapFx，见 engine/07-state.js）到这里结束
  if (p.lapFx && p.lapFx.length) { const end = p.lapFx.filter(x => x.lap < p.laps); p.lapFx = p.lapFx.filter(x => x.lap >= p.laps); [...new Set(end.map(x => x.c))].forEach(c => log(_tf(5551, "{$0} 的「{$1}」这一圈结束了", nm(p), REI[c].n))); }
  // 老存档里的 halfRun 是 true，按整单减半算
  const half = p.halfRun === 'hour' ? 'hour' : p.halfRun ? 'all' : '', cut = p.runCut && p.runCut.length ? p.runCut : null, full = half || cut ? opCost(p) : 0;
  // 降价卡管 2 圈，halfLaps 记还剩几圈；老存档没有这个字段，按 1 圈算
  p.halfRunNow = half; if (half) { p.halfLaps = Math.max(0, (p.halfLaps || 1) - 1); if (!p.halfLaps) p.halfRun = false; }
  const halfOc = cut ? opCost(p) : 0;
  // 按服务打折的运行费（p.runCut，见 engine/08c-costs.js runCutOf）只管这一次：算完就清掉，和减半卡叠着算
  p.runCutNow = cut; if (cut) p.runCut = [];
  let oc = opCost(p); p.halfRunNow = false; p.runCutNow = null;
  if (cut) log(_tf(5552, "{$0} 用上「{$1}」：这次运行费少交 ${$2}", nm(p), [...new Set(cut.map(x => REI[x.c].n))].join(_t(349, "、")), (half ? halfOc : full) - oc));
  if (half) {
    // 把没减的几笔写出来，免得玩家以为名单里的服务全减了
    const keep = [];
    if (half === 'hour' && ownedBy(p).some(i => S.props[i].spot && coKind(i))) keep.push(_t(2887, "Spot 买的服务"));
    if (half === 'hour' && owns(p, IX.ec2) && coRightsize(IX.ec2) && runCost(IX.ec2) > runCost(IX.ec2, true)) keep.push(_t(2888, "EC2 的公网 IPv4 地址费"));
    if (spActive(p)) keep.push(_t(2889, "Savings Plans 承诺额"));
    log(_tf(2894, "{$0} {$1}：这次少交 ${$2}{$3}{$4}", nm(p), half === 'hour' ? _tf(2890, "照 Compute Optimizer 的建议降配，{$0} 运行费减半", CO_SVCS) : _t(2891, "的运行费减半"), full - (cut ? halfOc : oc), keep.length ? _tf(2892, "，{$0}照付", keep.join(_t(349, "、"))) : '', p.halfLaps ? _t(2893, "；下次经过还减半") : ''));
  }
  let debt = F.debt() ? debtFee(p) : 0;   // 技能减半/全免也作用在技术债这份上，所以跟着 runMul 一起乘
  if (p.runLaps > 0) { oc = Math.round(oc * p.runMul); debt = Math.round(debt * p.runMul); p.runLaps--; log(_tf(2897, "{$0} 的「{$1}」：这圈运行费{$2}（还剩 {$3} 圈）", nm(p), roleOf(p).sk.n, p.runMul ? _t(2895, "减半") : _t(2896, "全免"), p.runLaps)); }
  // 「领到亚马逊云科技推广 Credits」：这一圈的运行费拿 Credits 抵掉，技术债加价一起免，Savings Plans 承诺额照付。技能已经免了这一圈的，Credits 留到下一圈，不白用
  else if (p.billFree > 0 && oc > 0) { const sp = spActive(p), keep = sp ? Math.min(oc, sp.amt) : 0, saved = oc - keep; p.billFree--; oc = keep; debt = 0; log(_tf(2900, "💳 {$0} 用亚马逊云科技推广 Credits 抵掉这一圈的运行费，少交 ${$1}{$2}{$3}", nm(p), saved, keep ? _tf(2898, "（Savings Plans 承诺额 ${$0} 照付）", keep) : '', p.billFree ? _tf(2899, "；还记着 {$0} 圈", p.billFree) : '')); }
  { const t = ST(p); t.runTot += oc; t.salary += g; ownedBy(p).forEach(i => { const c = runCost(i); if (c) t.runBy[i] = (t.runBy[i] || 0) + c; }); }
  if (oc) payRun(p, oc, debt, half); payMspFee(p); if (p.role === 'rs_dist' && p.alive) { pay(p, 'bank', 50); log(_tf(2901, "{$0} 交 $50 渠道维护费", nm(p))); } if (S.stats) { S.stats.run += oc; S.stats.salary += g; }
  if (p.commits && p.commits.length) {
    p.commits.forEach(c => { if (c.laps > 0) c.laps--; });
    p.commits.filter(c => c.laps === 0 && !c.done).forEach(c => { c.done = true; log(_tf(2902, "📄 {$0} 的{$1} 到期了", nm(p), c.type === 'sp' ? ' Savings Plans' : ` ${SQ[c.svc].n} RI`)); });
    p.commits = p.commits.filter(c => c.laps > 0);
  }
  log(_tf(2905, "🚀 {$0} 经过 Startup 扶持，领 ${$1} Credits{$2}", nm(p), g, oc ? _tf(2904, "，交运行费 ${$0}{$1}", oc, debt ? _tf(2903, "（含技术债加价 ${$0}）", debt) : '') : ''));
  await quarterTick(p);
}
// 季度财报：按第一位活着的玩家经过起点的次数算，每 3 次一份
async function quarterTick(p) {
  const ref = S.players.find(q => q.alive);
  if (F.balance() && ref && ref.id === p.id) { S.quarterCount++; if (S.quarterCount % 3 === 0) await quarterly(); }
}

