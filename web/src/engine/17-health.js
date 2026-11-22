import { _t, _tf, _tr } from '../core/01-i18n-runtime.js';
import { SIM, SIM_AI, rnd } from '../core/02-util.js';
import { UI } from '../core/02b-ui-port.js';
import { GRP, IX, N, SQ, effIn, grpN, isInst } from '../rules/03-services.js';
import { CATS, COMBOS, INC } from '../rules/04-roles-combos-cards.js';
import { dlcOn, flyTo } from '../rules/05-dlc.js';
import { F, P, S, active, availCard, cur, effActive, hasCombo, log, nm, ownedBy, owns, singleAZ, sqn } from './07-state.js';
import { cardAmt, credit, pay, withGain } from './08-money.js';
import { baseRent, forceDown } from './09-rent.js';
import { moveSteps, sendToJail } from './13-move.js';
import { land } from './15-land.js';
import { ensureInc } from './16-deck.js';
import { haIncident, spdReady, speedLose, speedSpend } from './22-speed.js';
import { ST } from './26b-retro.js';
import { cardMulBase, hx, withCardMul } from '../rules/35-modes.js';
import { isAI } from './36-ai.js';
import { MP } from '../net/40-host-sync.js';
import { fxAll, sfxAll } from '../net/41-replay.js';
// ================= Health 事件 =================
export const secActive = (o, g) => GRP(g).filter(i => active(o, i)).length;
const exposedInst = o => ownedBy(o).filter(i => SQ[i].t === 'prop' && ((SQ[i].type === 'iaas' && i !== IX.ebs) || ((i === IX.ecs || i === IX.eks) && !effActive(i, 'ssh'))));   // Fargate、EKS Auto Mode 没有 SSH 可登录，不算暴露
function cveProtected(p, i) {
  if (effActive(i, 'scan')) return true;
  if (SQ[i].type === 'iaas') return owns(p, IX.inspector) && effActive(IX.inspector, 'scan');
  return (owns(p, IX.inspector) && effActive(IX.inspector, 'scanimg')) || (owns(p, IX.ecr) && effActive(IX.ecr, 'scanimg'));   // ECR 增强扫描只扫镜像，保护的是容器，和 Inspector 镜像扫描同一个效果码
}
const effWhy = (o, eff) => { const e = ownedBy(o).find(i => effActive(i, eff)); return e !== undefined ? _tf(3121, "{$0} 有「{$1}」", SQ[e].n, SQ[e].upg.find(u => effIn(u[2], eff))[0]) : ''; };
// 返回免疫的原因（空字符串 = 不免疫）
// 一张 Health 卡对某人免不免疫：带 run 的卡看自己的 imm；其余走 immuneByProp
// 带 run 的卡对这个人有没有动静：卡上写了 hits 且返回 false 的，不弹抵消窗、不推迟发牌（run 自己记「不受影响」）
const noHit = (o, id) => { const c = INC[id]; return !!(c.run && c.hits && !c.hits(o)); };
function immuneTo(o, id) { const c = INC[id]; if (!c.run) return immuneByProp(o, id); return c.imm ? c.imm(o) : ''; }
function immuneByProp(o, id) {
  if (INC[id].n === _t(686, "有人手动改了生产配置") && active(o, IX.config) && S.props[IX.config].level >= 2) return _t(3122, "Config 发现配置漂移，自动修正改回来了");
  const has = i => active(o, i) ? SQ[i].n : '';
  switch (id) {
    case 1: return active(o, IX.lambda) && S.props[IX.lambda].level >= 1 ? _t(3123, "Lambda 提高了并发配额") : active(o, IX.cloudwatch) && S.props[IX.cloudwatch].level >= 2 ? _t(3124, "CloudWatch 有配额用量告警") : '';
    case 3: { if (o.role === 'health' && !hx('health')) return _t(3125, "互联网医疗有完善的数据备份制度"); const e = ownedBy(o).find(i => active(o, i) && effActive(i, 'backup')); return e !== undefined ? _tf(3121, "{$0} 有「{$1}」", SQ[e].n, SQ[e].upg.find(u => u[2] === 'backup')[0]) : ''; }   // Backup 要建了备份计划（第 1 级）才会备份，光持有不算；下线、被打下线的不算
    case 4: return hasCombo(o, 'queue') ? _t(3126, "有「订单削峰」架构") : '';
    case 6: return hasCombo(o, 'soar') ? _t(3127, "有「威胁自动响应」架构") : '';
    case 12: { const w = IX.cloudwatch, x = S.props[w] && S.props[w].wild, c = x && x.p === o.id && active(o, w) && hasCombo(o, x.c) && COMBOS.find(y => y.id === x.c), f = c && [IX.lambda, IX.ec2].find(i => c.ix.flat().includes(i) && active(o, i));
      return typeof f === 'number' ? _tf(3130, "CloudWatch 绑在「{$0}」上，告警直接{$1}，自动处理了", c.n, f === IX.lambda ? _t(3128, "调 Lambda") : _t(3129, "重启、恢复 EC2")) : ''; }
    case 7: return effWhy(o, 'dataprot');
    case 21: return hasCombo(o, 'vulnscan') ? _t(3131, "有「漏洞管理」架构，镜像都扫过了") : '';
    case 9: return has(IX.sqs) ? _t(3132, "有 SQS 排队重试") : has(IX.sfn) ? _t(3133, "有 Step Functions 重试") : effWhy(o, 'retry');
    case 10: return owns(o, IX.elb) && effActive(IX.elb, 'tls') ? _t(3134, "ELB 用了 ACM 证书") : owns(o, IX.cloudfront) && effActive(IX.cloudfront, 'tls') ? _t(3135, "CloudFront 用了 ACM 证书") : '';
    case 11: case 16: return '';   // 按每块服务是不是单 AZ 判定，在卡的结算里处理
    case 15: return o.role === 'fin' ? _t(428, "金融合规公司") : hasCombo(o, 'secbase') ? _t(3136, "有「安全防护基线」架构") : secActive(o, 'sec') >= 2 ? _t(3137, "持有 2 个以上安全组服务") : effWhy(o, 'audit');
    case 19: return hasCombo(o, 'soar') ? _t(3127, "有「威胁自动响应」架构") : hasCombo(o, 'sgfix') ? _t(3138, "有「安全组自动收紧」架构") : active(o, IX.vpc) && S.props[IX.vpc].level >= 2 ? _t(3139, "VPC 有私有子网和 Session Manager") : !exposedInst(o).length ? _t(3140, "没有暴露在公网的实例") : '';   // GuardDuty 只发现不拦截，不算免疫，在结算里减损
    case 20: return has(IX.shield) ? _t(1780, "有 Shield Advanced") : has(IX.waf) ? _t(3141, "有 WAF") : has(IX.cloudfront) ? _t(1579, "有 CloudFront") : '';
    default: return '';
  }
}
// 11-22：技术债不管怎么清掉的（花钱重构、卡牌、角色技能、自动修复、攒满 3 个的大重构），清掉的那一刻马上进维护窗口停一轮，
// 名下所有服务一起下线一轮（不收过路费、不算持有，运行费照交，到自己下回合开始恢复）。没有免疫，不能付 $50 或用 Enterprise Support 提前出来。
// 这次进维护窗口不是事件：出来不写复盘、不领复盘标记，也不会再记技术债。已经在维护窗口里的（被事件送进来的）不重进，只让服务下线
export const RF_JAIL = 'rf';   // 维护窗口的原因（p.jailCat）：清技术债；事件进来的是 CATS 里的类别
// 清技术债进来的维护窗口：界面上不写「付 $50 出来」「Enterprise Support」，这次只能停够一轮（中间状态行、右栏待办、玩家卡共用这一句）
export const rfJailed = p => p.jail !== null && p.jailCat === RF_JAIL;
export const rfJailTxt = () => _t(5557, "在维护窗口里（清技术债）：只能停这一轮，不能付 $50 或用 Enterprise Support 提前出来");
export function debtCleared(p) {
  const down = ownedBy(p).filter(i => !S.props[i].offline && S.props[i].ddos == null), go = p.jail === null;
  down.forEach(i => forceDown(i, p.id, 1, RF_JAIL));   // 原因存键，显示时 downWhy 翻成「清技术债」
  if (go) void sendToJail(p, RF_JAIL);   // 不带说明文字：sendToJail 不弹窗、不等待，这里照常同步往下走
  const svc = down.length ? _tf(5404, "，名下 {$0} 块服务一起下线一轮", down.length) : '';
  // 已经在维护窗口里（被事件送进来的）不重进：日志不说「进维护窗口」
  log(go ? _tf(5403, "🧱 {$0} 清完技术债，进维护窗口停一轮{$1}；出来不写复盘、不记技术债", nm(p), svc) : _tf(5558, "🧱 {$0} 清完技术债，本来就在维护窗口里，不再重进{$1}", nm(p), svc));
}
// 重构费按梯度：债越多越贵，越往后越贵（欠得越久，利息越高）——手上有 n 个技术债时清 1 个要 $50 × n，第 10 轮起再 +$30
export const refactorCost = p => 50 * Math.max(1, p.techDebt) + (S.round >= 10 ? 30 : 0);
export function payRefactor(p) { const c = refactorCost(p); if (!p.techDebt || p.cash < c) return false; pay(p, 'bank', c); p.techDebt--; p.refactored = true; sfxAll('buy'); log(_tf(3142, "🛠 {$0} 花 ${$1} 重构，清掉 1 个技术债（还剩 {$2} 个）", nm(p), c, p.techDebt)); debtCleared(p); return true; }
export function refactorDebt() {
  const p = cur(); payRefactor(p);
}
// 「停一轮」都加一个出口：交钱立刻处理、继续走（金额跟着卡牌倍率）；电脑现金宽裕就交钱
export async function skipOrPay(p, what, cost = 80, how = _t(3143, "立刻处理"), bonus = 0) {
  const x = Math.round(cost * (S && S.cardMul ? S.cardMul : 1));
  const v = await UI.ask({ who: p.id, title: _tf(838, "{$0}：{$1}", p.name, what), html: _tf(3145, "<p>二选一：停一轮{$0}；或者交 ${$1} 进奖池、{$2}，下一轮照常走。</p>", bonus ? _tf(3144, "（领 ${$0} 加班费）", cardAmt(bonus)) : '', x, how), buttons: [{ label: _tf(3146, "交 ${$0} {$1}，继续走", x, how), value: 'pay', cls: 'pri', disabled: p.cash < x }, { label: _tf(3148, "停一轮{$0}", bonus ? _tf(3147, "，领 ${$0}", cardAmt(bonus)) : ''), value: 'skip' }] });
  if (v === 'pay') { pay(p, 'pot', cost); log(_tf(3149, "🛠 {$0} 交 ${$1} 进奖池，{$2}，不用停", nm(p), x, how)); return 'paid'; }
  p.skip++; const got = bonus ? credit(p, bonus) : 0; log(_tf(3151, "{$0} {$1}，停一轮{$2}", nm(p), what, got ? _tf(3150, "，领 ${$0} 加班费", got) : '')); return 'skip';
}
// 社交卡（投票、接龙、分享会……）一台设备轮流玩时不再一人一个弹窗：桌长在一个窗里填完。要两位以上真人表态、而且都在这台设备上才合并
// （联机时有人在远端，照旧发到各自的设备上）；电脑的结果先算好，在窗里只读列出来。模拟（SIM）照旧逐人走，平衡数据不变
export const tableOK = list => !SIM && list.filter(o => !isAI(o.id)).length > 1 && !(MP.role === 'host' && list.some(o => MP.isRemote(o.id)));
export const aiName = o => _tr(2721, "电脑", "").test(o.name) ? o.name : o.name + _t(2722, "（电脑）");
// 现场投票，返回投了「是」的人：真人自己点（合并时桌长在一个窗里勾）；电脑按 pYes 的概率投「是」
export async function voteWho(voters, title, html, yesL, noL, pYes = 0.6) {
  const bot = o => isAI(o.id) || (SIM && SIM_AI);
  let got = null;
  if (tableOK(voters)) {
    const hum = voters.filter(o => !bot(o)), pre = new Map(voters.filter(bot).map(o => [o.id, Math.random() < pYes]));
    const r = await UI.modal({ who: hum[0].id, title, html: html + (pre.size ? `<p class="muted">${[...pre].map(([id, v]) => _tf(838, "{$0}：{$1}", aiName(P(id)), v ? yesL : noL)).join(_t(408, "；"))}</p>` : ''),
      inputs: [{ type: 'header', label: _tf(3152, "勾上选「{$0}」的人，没勾的算「{$1}」", yesL, noL) }, ...hum.map(o => ({ id: 'v' + o.id, type: 'checkbox', label: o.name }))], buttons: [{ label: _t(825, "投完了"), value: true, cls: 'pri' }] });
    got = o => pre.has(o.id) ? pre.get(o.id) : !!r.inp['v' + o.id];
  }
  const yes = [];
  for (const o of voters) {
    const v = got ? got(o) : bot(o) ? Math.random() < pYes : await UI.ask({ who: o.id, title: _tf(838, "{$0}：{$1}", o.name, title), html, buttons: [{ label: yesL, value: true, cls: 'pri' }, { label: noL, value: false }] });
    if (v) yes.push(o); log(_tf(3153, "🗳 {$0}：{$1}", nm(o), v ? yesL : noL));
  }
  return yes;
}
export async function vote(...a) { return (await voteWho(...a)).length; }
// 二选一：交钱，或者让一块服务变成 Impaired
async function payOrImpair(p, amt, cands, why) {
  const c = cands.filter(i => active(p, i) && !S.props[i].impaired).sort((a, b) => baseRent(b, 7) - baseRent(a, 7))[0];
  const x = Math.round(amt * (S && S.cardMul ? S.cardMul : 1));
  if (c == null) { pay(p, 'pot', amt); log(_tf(1561, "{$0} 交 ${$1}", nm(p), x)); return; }
  const v = await UI.ask({ who: p.id, title: _tf(838, "{$0}：{$1}", p.name, why), html: _tf(3154, "<p>二选一：交 ${$0} 进奖池；或者让 {$1} 变成 Impaired（暂停收过路费，到你下回合开始自动恢复）。</p>", x, sqn(c)), buttons: [{ label: _tf(3112, "交 ${$0}", x), value: 'pay', cls: 'pri', disabled: p.cash < x }, { label: _tf(3155, "让 {$0} 变成 Impaired", SQ[c].n), value: 'imp' }] });
  if (v === 'pay') { pay(p, 'pot', amt); log(_tf(1561, "{$0} 交 ${$1}", nm(p), x)); } else { impair([c]); log(_tf(3156, "{$0} 的 {$1} 变成 Impaired", nm(p), sqn(c))); }
}
async function penalize(p) {
  ST(p).hit++; speedLose(p, 2, _t(3157, "被事件打中"));
  if (!F.debt()) return;
  p.techDebt++;
  log(_tf(3161, "🧱 {$0} 欠下 1 个技术债（共 {$1} 个）{$2}", nm(p), p.techDebt, p.techDebt === 1 && !S.debtExplained ? _tf(5405, "。技术债：每个让每圈运行费多 $20；攒到 2 个，升级每级贵 $50；攒到 3 个要大重构，交 ${$0}；重构清 1 个：手上有几个就是 $50 × 几个，第 10 轮起再加 $30。不管怎么清掉的，都要进维护窗口停一轮，名下服务一起下线一轮", cardAmt(300)) : ''));
  S.debtExplained = true;
  if (p.techDebt >= 3) {
    // 技术债攒满 3 个必须大重构：交 $300、清掉 3 个，和别的清债一样马上进维护窗口停一轮（以前能多交 $100 不停，现在清债一律要停）
    p.techDebt -= 3; p.refactored = true;   // 大重构也是重构：成本优化支柱的「重构清过技术债」照样算
    log(_tf(5406, "{$0} 技术债到 3 个：大重构，交 ${$1}，清掉 3 个", nm(p), pay(p, 'bank', 300)));
    debtCleared(p);
  }
}
// 抵消、托管的选项：drawIncident0 先用它判断要不要把发牌推迟到抵消窗里，tryCancel 再用它出按钮
function cancelOpts(p, id) {
  const c = INC[id], b = [];
  const es = availCard(p, 'ES');
  if (es) b.push({ label: _t(3168, "用 Enterprise Support 抵消"), value: 'es' });
  const ce = id === 5 && availCard(p, 'CE');
  if (ce) b.push({ label: _t(3169, "用 Cost Explorer 抵消"), value: 'ce' });
  const coe = p.coe.find(t => !t.used && t.cat === c.c);
  if (coe) b.push({ label: _tf(3170, "用复盘标记抵消（{$0}类）", CATS[c.c]), value: 'coe' });
  const dr = p.drill.find(t => !t.used && t.cat === c.c);
  if (dr) b.push({ label: _tf(3171, "用演练标记抵消（{$0}类）", CATS[c.c]), value: 'drill' });
  const hosts = S.players.filter(o => o.alive && o.id !== p.id && immuneTo(o, id)), fine = cardAmt({ 3: 100, 10: 100, 20: p.role === 'media' ? 300 : 150 }[id] || 0);
  hosts.forEach(o => b.push({ label: _tf(3172, "请 {$0} 托管", o.name), value: 'h' + o.id }));
  if (dlcOn('speed') && haIncident(id) && p.speed >= 4 && spdReady(p, 4)) b.push({ label: _t(3173, "花 4 点部署点数：故障转移扛住"), value: 'sp4' });
  if (dlcOn('speed') && p.speed >= 7 && spdReady(p, 7)) b.push({ label: _t(3174, "花 7 点部署点数：蓝绿部署抵消"), value: 'sp7' });
  return { c, b, es, ce, coe, dr, hosts, fine };
}
async function tryCancel(p, id) {
  const { c, b, es, ce, coe, dr, hosts, fine } = cancelOpts(p, id);
  if (!b.length) return false;
  b.push({ label: _t(3175, "不抵消，接受惩罚"), value: 'no' });
  // 卡刚抽到、还没亮出来：发牌动画就放在这个窗里。标题保留「要抵消」，电脑（aiAct）照样认得
  // hold：卡面翻过来之前（约 1 秒）不收点击。焦点落在第一个按钮（多半是「用 Enterprise Support 抵消」）上，以前第一个窗是「执行」，照老习惯按空格会把 ES 花掉
  const dl = UI.CARD_DEAL && UI.CARD_DEAL.id === id && UI.CARD_DEAL.who === p.id;
  if (dl) { UI.__set_CARD_DEAL(null); UI.dealSfx('inc'); setTimeout(() => UI.FX.dealIn(), 0); }
  const r = await UI.modal({ deal: true, hold: dl ? 1000 : 0, title: dl ? _tf(3176, "{$0} 抽到「{$1}」，要抵消吗？", p.name, c.n) : _tf(3177, "要抵消「{$0}」吗？", c.n), html: dl ? UI.dealHtml('inc', UI.cardHtml('inc', id)) : UI.cardHtml('inc', id), inputs: hosts.length ? [{ id: 'fee', label: _tf(3179, "托管费（选托管时才用，至少 $20{$0}）$", fine ? _tf(3178, "，默认是罚款 ${$0} 的一半", fine) : ''), type: 'number', min: 20, max: Math.max(p.cash, 0), step: 10, value: fine ? Math.round(fine / 2) : 50 }] : [], buttons: b });
  const v = r.v;
  if (v === 'no') return false;
  if (v === 'es') { es.used = true; log(_tf(3180, "{$0} 用 Enterprise Support 抵消了「{$1}」", nm(p), c.n)); return true; }
  if (v === 'sp4' || v === 'sp7') { speedSpend(p, v === 'sp4' ? 4 : 7, v === 'sp4' ? _tf(3181, "故障转移，扛住了「{$0}」", c.n) : _tf(3182, "蓝绿部署，把流量切到新环境，抵消了「{$0}」", c.n)); return true; }
  if (v === 'ce') { ce.used = true; log(_tf(3183, "{$0} 用 Cost Explorer 抵消了「{$1}」", nm(p), c.n)); return true; }
  if (v === 'coe') { coe.used = true; log(_tf(3184, "{$0} 用复盘标记抵消了「{$1}」", nm(p), c.n)); return true; }
  if (v === 'drill') { dr.used = true; log(_tf(3185, "{$0} 用演练标记抵消了「{$1}」", nm(p), c.n)); return true; }
  const o = P(+v.slice(1));
  const fee = Math.max(20, Math.min(r.inp.fee || 0, Math.max(p.cash, 0)));
  const ok = await UI.ask({ who: o.id, title: _tf(3186, "{$0} 同意托管吗？", o.name), html: _tf(3187, "<p>{$0} 出 ${$1}，请你替对方承受「{$2}」。你对这张卡免疫，不会受影响。</p>", nm(p), fee, c.n), buttons: [{ label: _t(3188, "同意"), value: true, cls: 'pri' }, { label: _t(3189, "拒绝"), value: false }] });
  if (ok) { await withCardMul(0, async () => pay(p, o, fee)); log(_tf(3190, "{$0} 收了 ${$1}，替 {$2} 托管了「{$3}」", nm(o), fee, nm(p), c.n)); return true; }
  log(_tf(3191, "{$0} 拒绝托管", nm(o)));
  return tryCancel(p, id);
}
// fixed：已经从牌堆里拿出来的那一张（埋下的 Health 卡被踩中，engine/18-reinvent.js 的 springTrap），不再从牌堆抽
export async function drawIncident(p, fixed) { const a0 = MP.actor; MP.actor = p.id; try { return await withCardMul(S.cardMul || cardMulBase(), () => drawIncident0(p, fixed)); } finally { MP.actor = a0; } }
async function drawIncident0(p, fixed) {
  if (fixed == null) ensureInc(1);
  const id = fixed ?? S.inc.shift(); S.incDisc.push(id);
  // 有抵消、托管可选的卡先不亮，留给「要抵消吗」那个窗一起亮，少点一次。会甩锅、在沙盒里、免疫的照旧先亮卡
  const defer = !availCard(p, 'BLAME') && !(p.immuneTill >= S.round) && !immuneTo(p, id) && !noHit(p, id) && cancelOpts(p, id).b.length > 0;
  if (defer) { S.lastCard = { kind: 'inc', id, who: p.id }; UI.render(); UI.__set_CARD_DEAL({ id, who: p.id }); }
  else await UI.showCard('inc', id, p);
  log(_tf(3192, "⚠️ {$0} 抽到 Health 事件 #{$1}「{$2}」", nm(p), id, INC[id].n)); ST(p).inc++;
  // 兜底：incident 里提前结算的分支都会先 dealNow()，这里只防漏掉的、或中途出错时卡一直没亮
  try { await withGain('card', () => incident(p, id)); } finally { await UI.dealNow(); }
}
function spofTargets(p) {
  const mine = ownedBy(p).filter(i => SQ[i].t === 'prop' && isInst(i));
  if (!mine.length) return null;
  const max = Math.max(...mine.map(i => SQ[i].p));
  const top = mine.filter(i => SQ[i].p === max);
  const elbAsg = i => i === IX.ec2 && active(p, IX.elb) && S.props[IX.elb].level >= 3;   // ELB 第 3 级：坏实例自动换掉
  return top.every(i => singleAZ(i) && !effActive(i, 'spof') && !elbAsg(i)) ? top : null;
}
export const impair = list => list.forEach(i => { S.props[i].impaired = true; });
export async function incident(p, id) {
  // 全场事件（卡上写了 all，比如黑色星期五大促）：谁抽到都是全场结算。不能甩锅（甩给谁都一样），抽卡的人在监管沙盒里也不能让全场一起躲过去；
  // 在沙盒里的人由 run 自己跳过。不记技术债
  if (INC[id].all) { await INC[id].run(p, id); return; }
  const bl = availCard(p, 'BLAME'), others0 = S.players.filter(o => o.alive && o.id !== p.id);
  if (bl && others0.length) {
    const auto = isAI(p.id) || (SIM && SIM_AI), t = auto ? others0[rnd(others0.length)] : await UI.ask({ who: p.id, cls: 'pick', title: _tf(3193, "用「根因在上游」把「{$0}」甩给谁？", INC[id].n), buttons: [...others0.map(o => ({ label: o.name, value: o.id })), { label: _t(3194, "不甩，自己扛"), value: 'x' }] });
    const to = auto ? t : t === 'x' ? null : P(+t);
    if (to) { bl.used = true; log(_tf(3195, "🫵 {$0} 用「根因在上游」把「{$1}」甩给 {$2}", nm(p), INC[id].n, nm(to))); const a0 = MP.actor; MP.actor = to.id; try { return await incident(to, id); } finally { MP.actor = a0; } }
  }
  if (p.immuneTill >= S.round) { log(_tf(3196, "🛡️ {$0} 在「监管沙盒」里，免疫「{$1}」", nm(p), INC[id].n)); ST(p).imm++; fxAll({ f: 'shield', a: [p.pos], co: [p.pos, _tf(3197, "<b>免疫</b>「{$0}」", INC[id].n), 'ok'] }); return; }
  const c = INC[id], imm = immuneTo(p, id);
  if (c.run) { if (imm) { log(_tf(3198, "🛡️ {$0} 免疫「{$1}」：{$2}", nm(p), c.n, imm)); ST(p).imm++; fxAll({ f: 'shield', a: [p.pos], co: [p.pos, _tf(3197, "<b>免疫</b>「{$0}」", INC[id].n), 'ok'] }); return; } if (!noHit(p, id) && await tryCancel(p, id)) return; if ((await c.run(p, id)) !== 'nopen') await penalize(p); return; }
  if (imm && id !== 4) { log(_tf(3198, "🛡️ {$0} 免疫「{$1}」：{$2}", nm(p), c.n, imm)); ST(p).imm++; fxAll({ f: 'shield', a: [p.pos], co: [p.pos, _tf(3197, "<b>免疫</b>「{$0}」", INC[id].n), 'ok'] }); return; }
  switch (id) {
    case 20: { if (await tryCancel(p, id)) return; const x = p.role === 'media' ? 300 : 150; if (p.role === 'media') log(_t(3199, "短视频平台入口流量大，清洗费 ×2")); await payOrImpair(p, x, [IX.cloudfront, IX.elb, IX.apigw, IX.route53], _t(734, "DDoS 打满了入口")); break; }
    case 2: {
      const hit = ownedBy(p).filter(i => SQ[i].t === 'prop' && SQ[i].type !== 'glb' && !effActive(i, 'mr') && !S.props[i].impaired);
      if (!hit.length) { await UI.dealNow(); log(_tf(3200, "{$0} 的服务都有多区域功能或是全局服务，没受影响", nm(p))); return; }
      if (await tryCancel(p, id)) return;
      impair(hit); log(_tf(3156, "{$0} 的 {$1} 变成 Impaired", nm(p), hit.map(sqn).join(_t(349, "、")))); break;
    }
    case 1: case 9: if (await tryCancel(p, id)) return; await skipOrPay(p, INC[id].n, 80, id === 1 ? _t(3201, "加急提额") : _t(3202, "临时切到备用供应商")); break;
    case 15: {
      if (await tryCancel(p, id)) return;
      const others = S.players.filter(o => o.alive && o.id !== p.id);
      if (others.length) { const y = await vote(others, _tf(3203, "{$0} 的安全审计过关吗？", p.name), _tf(3204, "<p>你是审计员：问 {$0} 一个安全问题（比如根用户开 MFA 了吗、S3 桶是公开的吗、密钥多久轮换一次），听完判断。</p>", nm(p)), _t(3205, "过关"), _t(3206, "不过关"), 0.5); if (y * 2 > others.length) { log(_tf(3207, "✅ {$0} 的安全审计通过了", nm(p))); return; } }
      await skipOrPay(p, _t(714, "安全审计没过"), 80, _t(3208, "加急整改")); break;
    }
    case 3: {
      if (await tryCancel(p, id)) return;
      const dbs = GRP('db').filter(i => owns(p, i) && S.props[i].level > 0).sort((a, b) => S.props[b].level - S.props[a].level);
      if (dbs.length) { S.props[dbs[0]].level--; log(_tf(3209, "{$0} 的 {$1} 被拆掉 1 级升级", nm(p), sqn(dbs[0]))); }
      else log(_tf(1561, "{$0} 交 ${$1}", nm(p), pay(p, 'pot', 100)));
      break;
    }
    case 4: {
      const mine = ownedBy(p);
      const hit = imm ? [] : mine.filter(i => SQ[i].t === 'prop' && isInst(i) && !effActive(i, 'scale') && !S.props[i].impaired);
      if (!hit.length) { await UI.dealNow(); if (mine.length) log(_tf(3212, "📈 {$0} 扛住了流量暴增{$1}，领 ${$2}", nm(p), imm ? _t(1763, "（") + imm + _t(3210, "）") : _t(3211, "（服务都有弹性扩展或不是实例型）"), credit(p, 100))); return; }
      if (await tryCancel(p, id)) return;
      impair(hit); log(_tf(3213, "{$0} 的 {$1} 被流量打挂，变成 Impaired", nm(p), hit.map(sqn).join(_t(349, "、")))); if (p.role === 'game') log(_tf(3214, "游戏工作室再交 ${$0}", pay(p, 'pot', 30 * hit.length))); break;
    }
    case 5: {
      let cost = 0;
      ownedBy(p).forEach(i => { const l = S.props[i].level; cost += (l === 3 ? 100 : l > 0 ? 25 * l : 0) + (p.role === 'data' ? 20 : 10) * (S.props[i].cap || 0); });
      if (!cost) { await UI.dealNow(); log(_tf(3215, "{$0} 没有升级，账单没爆", nm(p))); return; }
      if (await tryCancel(p, id)) return;
      log(_tf(3216, "{$0} 交账单 ${$1}", nm(p), pay(p, 'pot', cost))); break;
    }
    case 6:
      if (await tryCancel(p, id)) return;
      await sendToJail(p, 'sec', _tf(3217, "Health 事件「{$0}」：Root 用户的访问密钥进了公开仓库，得先删掉密钥、查清楚有没有被人用过。", INC[id].n)); break;
    case 7: {
      if (await tryCancel(p, id)) return;
      // GuardDuty 基础检测从 CloudTrail 管理事件就能发现桶被公开（不用开 S3 保护），但它只告警、不改桶权限：跟 #19 一样减损、不算免疫，发现得早也不记技术债。
      // 下线或被 DDoS 打下线的 GuardDuty 不算（active）。现实里能自动改回私有的是 Config 规则配自动修正，棋盘上没有这一格
      const gd = active(p, IX.guardduty), x = (p.role === 'health' ? 100 : 50) / (gd ? 2 : 1);
      S.players.filter(o => o.alive && o.id !== p.id).forEach(o => pay(p, o, x));
      if (gd) { log(_tf(3219, "{$0} 的 GuardDuty 告警桶被改成了公开，及时改回私有：赔给每位其他玩家 ${$1}（少赔一半{$2}）", nm(p), cardAmt(x), p.role === 'health' ? _t(3218, "，医疗数据按双倍算") : '')); return; }
      log(_tf(3221, "{$0} 赔给每位其他玩家 ${$1}{$2}", nm(p), cardAmt(x), p.role === 'health' ? _t(3220, "（医疗数据泄露，赔双倍）") : '')); break;
    }
    case 8: if (await tryCancel(p, id)) return; await penalize(p); await moveSteps(p, -3); await land(p); return;
    case 10: if (await tryCancel(p, id)) return; await payOrImpair(p, 100, [IX.elb, IX.cloudfront], _t(694, "证书过期，网站打不开")); break;
    case 11: case 17: {
      let i;
      if (id === 11) { const t = spofTargets(p); if (!t) { await UI.dealNow(); log(_tf(3222, "{$0} 不受单点故障影响", nm(p))); return; } i = t[0]; if (t.length > 1) i = await UI.ask({ title: _t(3223, "哪一块挂了？"), buttons: t.map(x => ({ label: SQ[x].n, value: x })) }); }
      else { if (!owns(p, IX.ec2)) { await UI.dealNow(); log(_tf(3224, "{$0} 没有 EC2，不受影响", nm(p))); return; } if (effActive(IX.ec2, 'scale')) { await UI.dealNow(); log(_tf(3225, "🛡️ {$0} 的 EC2 有 Auto Scaling，自动换了一台新实例，不受影响", nm(p))); return; } if (active(p, IX.elb) && S.props[IX.elb].level >= 3) { await UI.dealNow(); log(_tf(3226, "🛡️ {$0} 的 ELB 健康检查发现了要退役的实例，Auto Scaling 换了一台新的，不受影响", nm(p))); return; } if (active(p, IX.eventbridge) && S.props[IX.eventbridge].level >= 2) { await UI.dealNow(); log(_tf(3227, "🛡️ {$0} 的 EventBridge 订阅了 Health 事件，退役通知一来就提前停机再启动、换了硬件，不受影响", nm(p))); return; } i = IX.ec2; }
      if (await tryCancel(p, id)) return;
      const fee = id === 11 ? Math.round(SQ[i].p * 0.1) : 50;
      S.props[i].impaired = true; const paid = pay(p, 'pot', fee);
      log(_tf(3230, "{$0} 的 {$1} 挂了，变成 Impaired，交 ${$2} {$3}", nm(p), sqn(i), paid, id === 11 ? _t(3228, "紧急恢复") : _t(3229, "重新启动到新的硬件上"))); break;
    }
    case 12: {
      const told = await UI.ask({ who: p.id, title: _tf(3231, "{$0}：讲一次半夜被告警叫醒的经历", p.name), html: _t(3232, "<p>你（或者你同事）凌晨被告警叫醒是什么情况？讲出来了大家点头就算。</p>"), buttons: [{ label: _t(3233, "讲出来了"), value: true, cls: 'pri' }, { label: _t(3234, "讲不出来"), value: false }] });
      if (told) { log(_tf(3235, "{$0} 讲了一次半夜被叫醒的经历，领 ${$1} 加班费", nm(p), credit(p, 50))); return; }
      await skipOrPay(p, _t(702, "凌晨 3 点被告警叫醒"), 80, _t(3236, "请值班同事处理")); return;
    }
    case 13: {
      const ow0 = S.props[IX.cloudwatch].owner;
      if (ow0 === p.id) { await UI.dealNow(); log(_tf(3237, "CloudWatch 是 {$0} 自己的，免付", nm(p))); return; }
      if (await tryCancel(p, id)) return;
      // CloudWatch 下线、被打下线时没在收日志（active 不认）：钱进奖池，不给主人
      const ow = ow0 !== null && active(P(ow0), IX.cloudwatch) ? P(ow0) : null;
      log(_tf(3239, "{$0} 付 ${$1} 给 {$2}", nm(p), pay(p, ow || 'pot', 100), ow ? nm(ow) : _t(3238, "奖池"))); break;
    }
    case 14: await UI.dealNow(); if (p.jail === null && p.pos !== IX.go) { await flyTo(p, IX.go, _t(3240, "栈整个回滚，"), { passGo: false, backward: true }); log(_tf(3241, "{$0} 的栈整个回滚，回到起点从头再来，这次不领 Credits、不交运行费", nm(p))); } return;
    case 16: {
      const hit = ownedBy(p).filter(i => SQ[i].t === 'prop' && singleAZ(i) && !S.props[i].impaired);
      if (!hit.length) { await UI.dealNow(); log(_tf(3242, "{$0} 没有单 AZ 的实例型服务，没受影响", nm(p))); return; }
      if (await tryCancel(p, id)) return;
      impair(hit); log(_tf(3156, "{$0} 的 {$1} 变成 Impaired", nm(p), hit.map(sqn).join(_t(349, "、")))); break;
    }
    case 18: {
      let k = (p.pos + 1) % N, guard = 0;
      while (!(SQ[k].t === 'prop' && S.props[k].owner !== null) && guard++ < N) k = (k + 1) % N;
      if (guard >= N) { await UI.dealNow(); log(_t(3243, "棋盘上还没有有主的服务，没人受影响")); return; }
      const g = SQ[k].g;
      let hit = GRP(g).filter(i => S.props[i].owner !== null && SQ[i].type !== 'glb' && !effActive(i, 'mr') && !S.props[i].impaired);   // 全局服务不在任何一个 Region 里
      // 抽卡的人自己的服务也在里面：和别的惩罚卡一样可以抵消（Enterprise Support、标记、故障转移、蓝绿）；抵消只护住自己的，别人的照样宕机
      if (hit.some(i => S.props[i].owner === p.id) && await tryCancel(p, id)) hit = hit.filter(i => S.props[i].owner !== p.id);
      await UI.dealNow();
      impair(hit);
      await UI.info(_t(726, "某个服务在一个 Region 里宕机了"), _tf(3247, "<p>往前数第一块有主的服务是 {$0}，<b>{$1}</b>宕机。</p><p>{$2}</p>", sqn(k), grpN(g), hit.length ? _t(3244, "变成 Impaired：") + hit.map(i => _tf(3245, "{$0}（{$1}）", sqn(i), nm(P(S.props[i].owner)))).join(_t(349, "、")) : _t(3246, "这个组里的服务都有多区域功能或是全局服务，没受影响。")));
      log(_tf(3250, "{$0}宕机{$1}", grpN(g), hit.length ? _t(2670, "：") + hit.map(sqn).join(_t(349, "、")) + _t(3248, " 变成 Impaired") : _t(3249, "，没人受影响")));
      if (hit.some(i => S.props[i].owner === p.id)) await penalize(p);
      return;
    }
    case 19: {
      const vo = S.props[IX.vpc].owner;
      if (vo !== null && vo !== p.id && active(P(vo), IX.vpc) && S.props[IX.vpc].level >= 2 && p.cash >= cardAmt(50)) {   // 对方的 VPC 下线、被打下线时借不了
        const rent = await UI.ask({ title: _t(3251, "借用 Session Manager？"), html: _tf(3252, "<p>{$0} 的 VPC 已经有私有子网和 Session Manager。付 ${$1} 给对方，就能把实例放进私有子网，躲过这次攻击。</p>", nm(P(vo)), cardAmt(50)), buttons: [{ label: _tf(3253, "付 ${$0} 借用", cardAmt(50)), value: true, cls: 'pri' }, { label: _t(3254, "不借"), value: false }] });
        if (rent) { log(_tf(3255, "{$0} 付 ${$1} 借用 {$2} 的 Session Manager，躲过了 SSH 暴力破解", nm(p), pay(p, P(vo), 50), nm(P(vo)))); return; }
      }
      if (await tryCancel(p, id)) return;
      // GuardDuty 基础检测就能从 VPC 流日志里发现 22 端口被暴力破解，但它只告警不拦截：发现得早、自己赶紧收紧安全组，少赔一点
      if (active(p, IX.guardduty)) { log(_tf(3256, "{$0} 的 GuardDuty 发现 22 端口在被暴力破解，及时收紧了安全组：交 ${$1}，实例没被攻破", nm(p), pay(p, 'pot', 50))); return; }
      const paid = pay(p, 'pot', 100);
      const t = exposedInst(p).sort((a, b) => SQ[b].p - SQ[a].p)[0];
      if (t !== undefined) S.props[t].impaired = true;
      log(_tf(1533, "{$0} 交 ${$1}{$2}", nm(p), paid, t !== undefined ? _t(2698, "，") + sqn(t) + _t(3248, " 变成 Impaired") : '')); break;
    }
    case 21: {
      const hit = ownedBy(p).filter(i => SQ[i].t === 'prop' && ((SQ[i].type === 'iaas' && i !== IX.ebs) || [IX.ecs, IX.eks, IX.sagemaker].includes(i)) && !cveProtected(p, i));
      if (!hit.length) { await UI.dealNow(); log(_tf(3257, "{$0} 的服务都有漏洞扫描保护，或由亚马逊云科技打补丁，没受影响", nm(p))); return; }
      if (await tryCancel(p, id)) return;
      impair(hit); const paid = pay(p, 'pot', 30 * hit.length);
      log(_tf(3258, "{$0} 的 {$1} 有高危漏洞：交 ${$2}，变成 Impaired", nm(p), hit.map(sqn).join(_t(349, "、")), paid)); break;
    }
  }
  await penalize(p);
}

