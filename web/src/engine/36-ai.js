import { __rv, _t, _tr } from '../core/01-i18n-runtime.js';
import { BOT, SIM, rnd } from '../core/02-util.js';
import { UI } from '../core/02b-ui-port.js';
import { BAL, SQ } from '../rules/03-services.js';
import { dlcOn, dlcRentMul } from '../rules/05-dlc.js';
import { F, S, availCard, cur } from './07-state.js';
import { doUpgrade, trafficMul, upgradeInfo } from './09-rent.js';
import { rentAt } from './11b-rent-info.js';
import { doRoll, endTurn, jailAct, nextTurn } from './14-turn.js';
import { landHere } from './15-land.js';
import { payRefactor, refactorCost } from './17-health.js';
import { resolveDebts } from './20-bankrupt.js';
import { aiRoleSkill, canSkill } from './21-skills.js';
import { aiSpeed } from './22-speed.js';
import { checkOver } from './26a-pillars-win.js';
import { MP } from '../net/40-host-sync.js';
// ================= 电脑玩家 =================
export const isAI = id => !!(S && S.cfg && S.cfg.ai && S.cfg.ai[id] && S.players[id] && S.players[id].alive);
// 现在是不是电脑的回合：电脑的骰子、走棋快一档（真人回合不变），房主和远端都按 S.cur 判断，节奏一致
export const aiTurn = () => !!(S && S.players && isAI(S.cur));
// 电脑写的复盘要对上进维护窗口的原因：只有 Root 密钥泄露（sec）和连掷 3 次对子被限流（avail）两种；每类两句，按写过几次轮换
let AI_COE = __rv(() => ({
  sec: [_t(4798, "Root 用户建了长期访问密钥，还跟着代码提交进了仓库"), _t(4799, "日常操作直接用 Root 用户的访问密钥，没换成 IAM 角色的临时凭证")],
  avail: [_t(4800, "客户端重试没做指数退避和抖动，失败的请求一起重发，把 API 打到了限流"), _t(4801, "批处理脚本没看服务配额，一下子把并发开满，撞上了 API 限流")],
}), v => { AI_COE = v; }, () => AI_COE);
// 弹窗怎么选：留够安全线（$250）再花钱，答题六成答对，买服务能答题就先答，别人的地盘不跳；别人的 Spot 按最低价抢（出价后还剩安全线两倍才抢）
// 电脑替座位做选择。只看数据、不碰页面：view 是界面层（ui/10-modal.js 的 aiAct）从弹窗里读出来的
//   { title: 标题文字, text: 整个弹窗的文字, quiz: 是不是答题窗, inputs: { 输入框 id: { type, min, max, nOpt: 下拉选项数 } } }（页面上没有的输入框不在里面）
// 返回 { v: 选中的值, set: { 输入框 id: 要填的值（下拉框是 { selectedIndex }） } }：界面层先把 set 写进输入框，再按 v 关窗。
// 随机数的取用顺序和以前直接改页面时一样（先给下拉框挑选项，再按标题分支），模拟对照逐局一致
export function aiDecide(view, inputs, buttons, who) {
  let out; const set = {}, done = v => { out = v; return { v, set }; };   // 每条 return go(…) / return done(…) 都把结果带出去
  const p = S.players[who] || cur(), RES = 250;
  const en = buttons.map((b, k) => ({ ...b, k, l: String(b.label) })).filter(b => !b.disabled);
  const money = l => +((l.match(/\$(\d+)/) || [0, 0])[1]);
  const pick = f => en.find(b => f(b.l));
  const go = b => done(b.value);
  const title = view.title;
  // 输入框：竞价出原价的一半、抢 Spot 出最低价、托管费最低
  inputs.forEach(inp => { const el = view.inputs[inp.id]; if (el && inp.type === 'select') set[inp.id] = { selectedIndex: rnd(el.nOpt) }; if (!el || inp.type !== 'number') return; set[inp.id] = inp.min ?? 0; });
  // 别人的 Spot 服务：按最低价（上面已经填进出价框）抢过来以后现金还剩安全线两倍就抢，不然照常付过路费。
  // 原来一律照付，对着电脑用最低价 Spot 买下完全不会被抢，模拟里这样打的人胜率高 3–4 个点
  if (_tr(4802, "^出价抢 .* 的 Spot 服务", "").test(title)) { const el = view.inputs.bid; let g = Infinity; if (el) { g = Math.min(+el.max, Math.max(+el.min, Math.round(+el.max * (0.4 + Math.random() * 0.4) / 10) * 10)); set.bid = g; } return go(p.cash - g >= RES * 2 && pick(l => l.startsWith(_t(3058, "出价抢过来"))) || pick(l => l.startsWith(_t(4747, "照常付"))) || en[en.length - 1]); }
  // 免费升一级 / 免费加容量（Well-Architected Review、Hackathon、流水线自动化）：挑过路费涨得最多的那块。原来落到最后一行点第一个按钮，
  // 也就是棋盘上最靠前、最便宜的那块，涨幅不到最优的一半
  if (_tr(4803, "^(选一块免费升一级|Hackathon 拿了奖|流水线自动化：免费升哪一块)", "").test(title)) {
    const cap = /^Hackathon/.test(title), cand = en.filter(x => typeof x.value === 'number' && SQ[x.value]);
    if (cand.length > 1) return done(cand.reduce((a, x) => aiUpGain(x.value, cap) > aiUpGain(a.value, cap) ? x : a).value);
  }
  // 答题：按钮带 qok（对 / 错），value 是选项下标
  if (view.quiz && en.some(b => b.qok === true) && en.some(b => b.qok === false)) { const right = en.find(b => b.qok === true), wrong = en.filter(b => b.qok === false); return go(Math.random() < (SIM ? (S.acc ? S.acc[p.id] : BAL.aiQuiz ?? 1) : 0.6) || !wrong.length ? right : wrong[rnd(wrong.length)]); }
  let b;
  // 买地窗、代理商窗里有「答题争取」：按最大的 7 折算还买得起（留够安全线）就先答，答错照原价买，没有损失。
  // 原来电脑从不答：独立开发者的答题折扣、边玩边答题的 8 折一次都没拿过，学习、地狱模式的模拟数字也都是按原价买测的
  const lowest = Math.min(...buttons.map(x => String(x.label)).filter(l => _tr(4804, "^(按需购买|用 MAP 卡|从 .+手里买下) \\$", "").test(l)).map(money));
  if ((b = pick(l => l.startsWith(_t(4805, "答题争取")))) && p.cash - lowest * 0.7 >= RES) return go(b);
  // 手上有 MAP 卡、这块能用（IaaS、PaaS、容器服务）就按 MAP 价买；原来总是先点「按需购买」，MAP 卡拿到手从来不用
  if ((b = pick(l => l.startsWith(_t(4806, "用 MAP 卡")))) && p.cash - money(b.l) >= RES) return go(b);
  if ((b = pick(l => l.startsWith(_t(4807, "从 ")) && l.includes(_t(4808, "手里买下")))) && p.cash - money(b.l) >= RES) return go(b);
  if ((b = pick(l => l.startsWith(_t(4745, "按需购买")))) && p.cash - money(b.l) >= RES) return go(b);
  if ((b = pick(l => l.startsWith(_t(2474, "答对")) && l.includes(_t(4809, "折")))) && p.cash - money(b.l) >= RES) return go(b);
  if ((b = pick(l => l.startsWith(_t(4810, "Spot 购买")))) && p.cash - money(b.l) * 2 >= RES) return go(b);
  if (pick(l => l.startsWith(_t(1599, "不买")))) return go(pick(l => l.startsWith(_t(1599, "不买"))));
  if (_tr(4811, "^Spot 出价", "").test(title)) return done('ok');
  if ((b = pick(l => _tr(4812, "^升到第 \\d 级「", "").test(l) || l.startsWith(_t(4813, "加「")))) && p.cash - money(b.l) >= RES * 1.5) return go(b);   // 落在自己的服务上：钱够就先升级（按钮字是「升到第 N 级「功能」$X」）
  if ((b = pick(l => _tr(4814, "^加 1 个", "").test(l))) && p.cash - money(b.l) >= RES * 2) return go(b);
  // 落在自己的服务上什么都不做：顺路同色跳，跳去别人那格要付过路费就不跳（和下面单独的同色跳窗一个标准）
  if ((b = pick(l => l.startsWith(_t(4749, "什么都不做，同色跳到"))))) return go(_tr(4815, "要付过路费", "").test(b.desc || '') ? pick(l => l === _t(2999, "什么都不做，也不跳")) || b : b);
  if (pick(l => l.startsWith(_t(4750, "先不加")))) return go(pick(l => l.startsWith(_t(4750, "先不加"))));
  if (_tr(4816, "^同色跳", "").test(title)) return go(_tr(4817, "的，要付过路费", "").test(view.text) ? pick(l => l === _t(2979, "不跳")) : en[0]);
  if (_tr(4818, "重新上线|已经下线 \\d+ 轮", "").test(title)) { const on = en.find(x => x.value === 'on') || en[0], keep = en.find(x => x.value === 'keep') || pick(l => l === _t(2940, "继续下线")); return go(p.cash > 600 || !keep ? on : keep); }
  if (_tr(4819, "欠款", "").test(title)) return go(pick(l => l === _t(3348, "自动变卖")) || en[0]);
  // 高速部署：掷完骰子照走；被 DDoS 有点数就抵消
  if (_tr(4756, "部署点数", "").test(title) && pick(l => l.startsWith(_t(4820, "照走")))) return go(pick(l => l.startsWith(_t(4820, "照走"))));
  if (_tr(4821, "被 DDoS 了", "").test(title)) return go(en[0]);
  if (_tr(4822, "要抵消", "").test(title)) return go(pick(l => _tr(4823, "Enterprise Support|复盘|演练|故障转移", "").test(l)) || pick(l => l.startsWith(_t(4753, "不抵消"))) || en[en.length - 1]);
  if (_tr(4824, "写复盘", "").test(title)) { const t = view.inputs.t; if (t) { const l = AI_COE[p.jailCat] || [_t(4825, "变更没有经过评审和自动化测试")]; set.t = l[(p.coe || []).length % l.length]; } return go(en[0]); }
  if (_tr(4826, "同意|讲一个", "").test(title)) return go(en[0]);
  if (/User Group/.test(title)) return go(S.pot >= 150 ? en[0] : en[en.length - 1]);
  if (_tr(4827, "抽了(两|三|\\d+) ?张", "").test(title)) return go(en[rnd(en.length)]);
  if ((b = pick(l => _tr(4828, "^交 \\$\\d+ .*继续走$", "").test(l)))) return go(p.cash - money(b.l) >= RES + 150 ? b : pick(l => l.startsWith(_t(4829, "停一轮"))) || b);
  if ((b = pick(l => l.startsWith(_t(4830, "让 ")) && l.endsWith('Impaired')))) { const pb = pick(l => _tr(4831, "^交 \\$\\d+$", "").test(l)); return go(pb && p.cash - money(pb.l) >= RES + 100 ? pb : b); }
  for (const key of [_t(2754, "执行"), _t(2478, "知道了"), _t(2461, "继续"), _t(4652, "开始"), _t(3233, "讲出来了"), _t(2610, "关闭"), _t(2926, "跳过")]) { const x = pick(l => l.startsWith(key)); if (x) return go(x); }
  go(en.find(x => (x.cls || '').includes('pri')) || en[0] || { value: buttons[0].value });
  return { v: out, set };
}
// 电脑估一块服务升一级（cap：加 1 份容量）以后，每次落地多收多少过路费，按 7 点算。只用来排先后：不算联合收费、多 AZ 这些效果，也不算升级后运行费涨多少。
// CloudWatch、CloudTrail、Config 按「点数 ×（倍数 + 3 × 级别）」收，rentAt 没按这个算（第 6 轮会把 CloudWatch 升一级估成 +$158，实际只多 $37），单独按 7 点估
function aiUpGain(i, cap = false) {
  const l = S.props[i].level, est = x => x.v ?? x.pt * 7;
  if (cap) return est(rentAt(i, l)) * 0.25 / (1 + 0.25 * (S.props[i].cap || 0));
  return SQ[i].t === 'util' ? 21 * trafficMul() * dlcRentMul(i) : est(rentAt(i, l + 1)) - est(rentAt(i, l));
}
// 电脑在资产管理里建设：技术债攒到 2 个（升级每级贵 $50）先重构；升级只能落在自己的服务上做，这一回合停在自己的服务上、落地窗里还没用掉那一次的话，升完现金还剩安全线两倍就升
export function aiBuild(p, res = 250) {
  if (!p || !p.alive || p.jail !== null || p.debt.length) return;
  let n = 0;
  if (F.debt() && p.techDebt >= 2 && p.cash - refactorCost(p) >= res * 2 && payRefactor(p)) n++;
  { const i = landHere(p); if (i != null) { const u = upgradeInfo(p, i, true); if (u.ok && p.cash - u.total >= res * 2) { doUpgrade(p, i, true); S.landAct.used = true; n++; } } }
  if (n && !SIM) { UI.save(); UI.render(); clearTimeout(aiTimer); aiTimer = 0; }   // render() 会顺手再排一次 aiKick；调用方（aiKick 的回调）接着往下走，不能留第二个定时器，不然会跨过换人，把下一位电脑的掷骰子挡掉
}
// 轮到电脑：掷骰子 / 在维护窗口里选怎么出来
export let aiTimer = 0;
// 电脑在玩的时候可以暂停（电脑在房主那台跑，只有房主那边有这个按钮：电脑的回合和电脑答弹窗都会停在原地，点「继续」接着跑）
export let AI_PAUSE = false;
// 现在是不是暂停着：房主和单机看本机的开关，远端看房主推过来的 S.aiPause（pushState 每次按 AI_PAUSE 重写）
export function aiPaused() { return MP.role === 'client' ? !!(S && S.aiPause) : AI_PAUSE; }
// 收起弹窗看棋盘时底栏、中间的「暂停」也点得到：点哪个都刷新弹窗里的提示和「暂停 / 继续」，不然两边对不上
export function toggleAiPause() { AI_PAUSE = !AI_PAUSE; UI.render(); UI.aipBtnUpd(); if (!AI_PAUSE) aiKick(); }
export const aiWhenRunning = fn => { const t = () => AI_PAUSE || UI.tourOpen() ? setTimeout(t, 300) : fn(); t(); };   // 新手引导开着（顶栏按钮随时能打开）也先等着
export function aiKick() {
  if (BOT || SIM || !S || S.over || !isAI(S.cur) || aiTimer || MP.role === 'client') return;
  aiTimer = setTimeout(() => {
    aiTimer = 0;
    // 电脑结算完（post）：停一下让人看清，再自动轮到下一位；弹窗、新手引导开着或暂停时接着等
    if (S && !S.over && isAI(S.cur) && S.phase === 'post' && UI.modalHidden() && !UI.viewOpen() && !UI.tourOpen() && !AI_PAUSE) { aiBuild(cur()); return endTurn(); }
    if (!S || S.over || !isAI(S.cur) || S.phase !== 'roll' || !UI.modalHidden() || UI.viewOpen() || UI.tourOpen() || AI_PAUSE) return aiKick();
    const p = cur();
    aiBuild(p);   // 掷骰子前先看看要不要升级（在维护窗口里、有欠款时不升）
    const jailK = () => jailAct(p.cash > 500 ? 'pay' : availCard(p, 'ES') ? 'es' : 'stay');
    if (p.jail !== null && !canSkill(p)) return jailK();
    if (p.jail === null && !dlcOn('speed') && !canSkill(p) && !(p.reseller && !p.rsSet)) return doRoll();
    (async () => {
      S.phase = 'busy'; S.uiPrev = 'roll'; S.nextPhase = null;
      try { if (p.reseller && !p.rsSet) { p.rsSet = true; p.rsRate = 0.9; } await aiRoleSkill(p); if (p.jail === null) await aiSpeed(p); } catch (e) { UI.reportErr(e); }
      await resolveDebts(); if (checkOver()) return; if (!cur().alive) return nextTurn();
      S.phase = S.nextPhase || 'roll'; S.nextPhase = null; UI.save(); UI.render();
      if (S.phase === 'roll' && cur() === p) { S.turnStartAt = 0; if (p.jail !== null) jailK(); else doRoll(); }
    })();
    // 停一下让人看清：掷骰子前 0.5 秒（刚换到它，看得出轮到谁了）；结算完 0.7 秒（落在哪、买了什么，格子上的气泡交棒后还会再留一会儿）
  }, S && S.phase === 'post' ? 700 : 500);
}


// 别的文件要改这些变量（import 进来是只读的），走这里
export const __set_aiTimer = v => (aiTimer = v);
// （从 ui/27b-arch-notes.js 挪来）
// 这台设备上自己操作的真人：同屏是所有真人，联机远端是自己的座位，房主是没交给远端的座位
export const localHuman = q => !!q && !isAI(q.id) && (MP.role === 'client' ? q.id === MP.mySeat : !(MP.role === 'host' && MP.isRemote(q.id)));
// （从 ui/27b-arch-notes.js 挪来）
// 轮到你时，能补齐你某个架构的格子：差一块的架构缺的那一环（二选一的两块都算）。
// 「你」= 联机远端是自己的座位、房主和同屏是本机操作的真人；轮到电脑或别的设备上的人时不标
export function viewerP() {
  if (!S || !S.players) return null;
  if (MP.role === 'client') { const q = S.players[MP.mySeat]; return q && q.alive ? q : null; }
  const loc = q => q && q.alive && !isAI(q.id) && !(MP.role === 'host' && MP.isRemote(q.id) && !MP.hostPlays(q.id)), n = S.players.length;
  for (let k = 0; k < n; k++) { const q = S.players[(S.cur + k) % n]; if (loc(q)) return q; }
  return null;
}
