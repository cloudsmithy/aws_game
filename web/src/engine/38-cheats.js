import { _t, _tf } from '../core/01-i18n-runtime.js';
import { rnd, unesc } from '../core/02-util.js';
import { UI } from '../core/02b-ui-port.js';
import { SQ } from '../rules/03-services.js';
import { dlcOn } from '../rules/05-dlc.js';
import { F, S, log, nm, owns, sqn } from './07-state.js';
import { pay } from './08-money.js';
import { shownRent } from './09-rent.js';
import { sendToJail } from './13-move.js';
import { speedLose } from './22-speed.js';
import { isHidden } from '../rules/35-modes.js';
import { MP } from '../net/40-host-sync.js';
// ================= 作弊码 =================
// 命令行里的 :money、:dice、:upgrade、:jail、:free、:grab。现金高于 $1000 不能用；给自己用不写玩家；给别人用写座位号或名字（:money -500 2）。
// 规则：每人每回合只能用一次、一局最多 3 次；每用一次都写进日志（谁给谁做了什么），日志那一行旁边有「举报」，别的玩家在一轮以内点了，作弊的人直接进维护窗口（过了一轮举报无效，作弊得逞）；
// 另外用的当下有 1/3 的概率被 CloudTrail 审计发现（场上有别人买了 CloudTrail 是 2/3）：技术债 +1（没开技术债的模式罚 $100 进奖池），开了高速部署再扣 3 个部署点数。
// 单机随时能用；联机时远端发给房主执行，房主用 :cheats off 关掉（默认开）。只在掷骰子前后能用，结算到一半不行
export const cheatsOn = () => !(S && S.cfg && S.cfg.cheats === false);
const mySeat = () => MP.role === 'client' ? MP.mySeat : S.cur;
function cheatWho(me, ref) {
  if (ref == null || ref === '') return S.players[me];
  const n = +ref; if (Number.isInteger(n) && n >= 1 && n <= S.players.length) return S.players[n - 1];
  const r = String(ref).toLowerCase(); return S.players.find(q => unesc(q.name).toLowerCase().startsWith(r)) || null;
}
export function cheatCmd(name, args) {
  if (!UI.inGame()) return void UI.vimErr(_tf(4846, ":{$0} 要在对局里用", name));
  if (MP.role === 'client') { MP.send(MP.hostConn, { t: 'cheat', c: name, a: args.slice(0, 3).map(String) }); return void UI.toast(_t(4847, "作弊码发给房主了")); }
  const why = applyCheat(mySeat(), name, args); if (why) UI.toast(why);
}
export function applyCheat(me, name, args) {
  if (!S || !S.players || S.over) return _t(4848, "对局里才能用作弊码");
  if (!cheatsOn()) return _t(4849, "房主关掉了作弊码");
  if (!(S.phase === 'roll' || S.phase === 'post')) return _t(4850, "结算中，等这一步做完再用");
  const p = S.players[me]; if (!p || !p.alive) return _t(4627, "没有这个玩家");
  const tk = S.round + ':' + S.cur; if ((S.cheatTurn ||= {})[me] === tk) return _t(4851, "这一回合已经用过作弊码了，下一回合再来");
  const used = Object.values(S.cheats || {}).filter(c => c.by === me).length; if (used >= 3) return _t(4852, "一局最多用 3 次作弊码，你已经用完了");
  if (p.cash > 1000) return _tf(4853, "现金高于 $1000 不能用作弊码（你现在有 ${$0}）", p.cash);
  const to = q => q === p ? _t(4854, "自己") : nm(q);
  let what = '';
  if (name === 'money') {
    const v = Math.round(+(args[0] ?? 300)), q = cheatWho(me, args[1]);
    if (!Number.isFinite(v) || !v) return _t(4855, "金额要是数字，比如 :money 500，扣钱写负数");
    if (Math.abs(v) > 300) return _t(4856, "作弊码一次最多加减 $300");
    if (!q || !q.alive) return _t(4857, "没找到这个玩家：写座位号（1–4）或名字开头");
    // 原来直接 q.cash += v，扣钱能把别人打成负现金还不记欠款：之后每笔支出都整笔变成欠款、被反复逼着变卖，
    // 而且永远填不平；simCheck 只在「phase=roll 且正好轮到他」才查这个，别的阶段查不出来。调试工具就按 0 兜底。
    q.cash = Math.max(0, q.cash + v); what = v > 0 ? _tf(4858, "给{$0}加了 ${$1}", to(q), v) : _tf(4859, "给{$0}扣了 ${$1}", to(q), -v);
  } else if (name === 'dice') {
    const a = +args[0], b = +(args[1] ?? args[0]);
    if (![a, b].every(x => Number.isInteger(x) && x >= 1 && x <= 6)) return _t(4860, "点数要是 1–6，比如 :dice 6 6");
    (S.cheatDice ||= {})[me] = [a, b]; what = _tf(4861, "把自己下一次掷骰子定成 {$0} + {$1}", a, b);
  } else if (name === 'upgrade') {
    const q = cheatWho(me, args[0]); if (!q || !q.alive) return _t(4862, "没找到这个玩家");
    let k = 0; for (const [i, pr] of Object.entries(S.props)) if (pr && pr.owner === q.id && SQ[i].upg && pr.level < 3 && !pr.offline) { pr.level = 3; k++; }
    if (!k) return _tf(4863, "{$0} 名下没有能升级的服务", unesc(q.name));
    what = _tf(4864, "把{$0}名下 {$1} 块服务升满", to(q), k);
  } else if (name === 'jail') {
    const q = cheatWho(me, args[0]); if (!q || !q.alive) return _t(4862, "没找到这个玩家"); if (q.jail !== null) return _tf(4865, "{$0} 已经在维护窗口里了", unesc(q.name));
    sendToJail(q, 'ops', ''); what = _tf(4866, "把{$0}送进了维护窗口", to(q));
  } else if (name === 'grab') {
    // 随机抢一块地：没人买的直接归你；抢到别人的，照掷 7 点的过路费交给他；抢到自己的白抢
    const pool = SQ.map((x, i) => i).filter(i => SQ[i].t === 'prop' && !isHidden(i)), i = pool[rnd(pool.length)], pr = S.props[i];
    if (!pr || pr.owner === null) { S.props[i] = { owner: p.id, level: 0, cap: 0, spot: false, spotPaid: 0, impaired: false, offline: 0, offCash: 0 }; what = _tf(4867, "随机抢地，抢到没人买的 {$0}，直接归自己", sqn(i)); }
    else if (pr.owner === p.id) what = _tf(4868, "随机抢地，抢到的是自己的 {$0}，白抢一次", sqn(i));
    else { const o = S.players[pr.owner], r = shownRent(i).r; pay(p, o, r); what = _tf(4869, "随机抢地，抢到 {$0} 的 {$1}，交过路费 ${$2}", nm(o), sqn(i), r); }
  } else if (name === 'free') {
    if (p.jail === null) return _t(4870, "你不在维护窗口里"); p.jail = null; what = _t(4871, "让自己出了维护窗口");
  } else return _t(4872, "没有这个作弊码");
  S.cheatTurn[me] = tk;
  const id = (S.cheatN = (S.cheatN || 0) + 1);
  (S.cheats ||= {})[id] = { by: me, rep: false, r: S.round, c: S.cur };
  log(_tf(4873, "🕹 {$0} 用作弊码{$1} <button type=\"button\" class=\"sm cheatrep\" data-cheat=\"{$2}\" title=\"别的玩家点这里举报：作弊的人直接进维护窗口；一轮以内有效，过了就作弊得逞\">举报</button>", nm(p), what, id));
  // 用的当下有一定概率被 CloudTrail 审计发现
  const trail = S.players.some(q => q.alive && q.id !== me && SQ.some((x, i) => x.k === 'cloudtrail' && owns(q, i)));
  if (Math.random() < (trail ? 2 / 3 : 1 / 3)) {
    S.cheats[id].caught = true;
    if (F.debt()) { p.techDebt = Math.min(2, (p.techDebt || 0) + 1); log(_tf(4874, "🔍 CloudTrail 审计发现 {$0} 用了作弊码：技术债 +1（共 {$1} 个）", nm(p), p.techDebt)); }
    else { pay(p, 'pot', 100); log(_tf(4875, "🔍 CloudTrail 审计发现 {$0} 用了作弊码：罚 $100 进奖池", nm(p))); }
    if (dlcOn('speed')) speedLose(p, 3, _t(4876, "作弊被抓"));   // 开了高速部署：再扣 3 个部署点数
  }
  UI.save(); UI.render(); return '';
}
// 举报：点日志里那一行旁边的「举报」。作弊的人自己不能举报自己；一条只能举报一次；举报成立直接进维护窗口。
// 只在一轮以内管用：从作弊那一回合起，轮完一圈（作弊的人下一个回合开始）还没人举报，就过期了，作弊得逞
export const cheatExpired = c => (S.round - c.r) * S.players.length + (S.cur - (c.c ?? c.by)) >= S.players.length;
export function reportCheat(id, by) {
  const c = S && S.cheats && S.cheats[id]; if (!c) return _t(4877, "这条记录找不到了");
  if (c.rep) return _t(4878, "这一条已经有人举报过了");
  if (cheatExpired(c)) return _t(4879, "超过 1 轮了，举报无效，作弊得逞");
  const q = S.players[c.by]; if (!q || !q.alive) return _t(4880, "这位玩家已经出局了");
  if (by === c.by) return _t(4881, "不能举报自己");
  c.rep = true;
  const who = by != null && S.players[by] ? nm(S.players[by]) : _t(4882, "有人");
  log(_tf(4883, "🚨 {$0} 举报 {$1} 用了作弊码：直接进维护窗口", who, nm(q)));
  if (q.jail === null) sendToJail(q, 'sec', '');
  UI.save(); UI.render(); return '';
}
