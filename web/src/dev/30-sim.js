import { _t, _tf, _tr } from '../core/01-i18n-runtime.js';
import { $, SIM_AI, shuffle } from '../core/02-util.js';
import { N, OWNABLE, SQ } from '../rules/03-services.js';
import { DLC } from '../rules/05-dlc.js';
import { S, cur, logBody, ownedBy } from '../engine/07-state.js';
import { netWorth, valBreak, valuation } from '../engine/08c-costs.js';
import { doUpgrade, upgradeInfo } from '../engine/09-rent.js';
import { doRoll, endTurn, jailAct } from '../engine/14-turn.js';
import { landHere } from '../engine/15-land.js';
import { resolveDebts } from '../engine/20-bankrupt.js';
import { aiRoleSkill } from '../engine/21-skills.js';
import { aiSpeed } from '../engine/22-speed.js';
import { pillarScore } from '../engine/26a-pillars-win.js';
import { ST } from '../engine/26b-retro.js';
import { enterGame, newGame } from '../ui/28-setup-save.js';
import { hellCfg } from '../rules/35-modes.js';
import { aiBuild } from '../engine/36-ai.js';
// ================= 经济模拟（?sim=N&players=4&diff=std） =================

const SIMOUT = { games: [] };
let simReserve = 150;
export function simAct(box, inputs, buttons, done) {
  const p = cur(), en = buttons.map((b, k) => ({ ...b, k })).filter(b => !b.disabled);
  const money = lbl => +((String(lbl).match(/\$(\d+)/) || [0, 0])[1]);
  const pick = f => en.find(b => f(String(b.label)));
  inputs.forEach(inp => { const el = box.querySelector('#in_' + inp.id); if (el && inp.type === 'number') el.value = 0; if (el && inp.type === 'checkbox') el.checked = false; });
  const title = (box.querySelector('h3') || {}).textContent || '';
  let b = pick(l => l.startsWith(_t(4745, "按需购买")));
  if (b && p.cash - money(b.label) >= simReserve) return done(b.value);
  b = pick(l => l.includes(_t(4746, "拉起来归我")));
  if (b && p.cash - money(b.label) >= simReserve) return done(b.value);
  if (pick(l => l.startsWith(_t(1599, "不买")))) return done(pick(l => l.startsWith(_t(1599, "不买"))).value);
  if (pick(l => l.startsWith(_t(4747, "照常付")))) return done(pick(l => l.startsWith(_t(4747, "照常付"))).value);
  b = pick(l => l.startsWith(_t(4748, "加")));
  if (b && p.cash - money(b.label) >= simReserve * 2) return done(b.value);
  b = pick(l => l.startsWith(_t(4749, "什么都不做，同色跳到")) || l.startsWith(_t(4750, "先不加"))); if (b) return done(b.value);
  for (const key of [_t(3039, "不管它"), _t(3348, "自动变卖"), _t(4751, "用掉"), _t(4752, "交 10%"), _t(4753, "不抵消"), _t(2754, "执行"), _t(2478, "知道了"), _t(2461, "继续"), _t(4754, "开标"), _t(3233, "讲出来了"), _t(3188, "同意"), _t(2926, "跳过"), _t(2610, "关闭"), _t(4755, "先付 10%")]) { const x = pick(l => l.startsWith(key)); if (x) return done(x.value); }
  done((en.find(x => (x.cls || '').includes('pri')) || en[0] || buttons[0]).value);
}
async function simGame(n, diff) {
  const q = new URLSearchParams(location.search), cfg = { names: [_t(4741, "甲"), _t(4742, "乙"), _t(4743, "丙"), _t(4744, "丁")].slice(0, n), diff, wa: false, timed: false, minutes: 90, learn: false, dlc: (q.get('dlc') || '').split(',').filter(Boolean), rs: q.get('rs') ? [true] : [] };
  if (q.get('learn')) cfg.learn = true;
  // 和开局页一样映射模式：娱乐 = 入门规则 + 10 轮 + 卡牌 1.5 倍；学习 = 标准规则 + 必答题 + 题库 DLC、不限轮数
  if (diff === 'party') Object.assign(cfg, { mode: 'party', diff: 'basic', cardMul: '1.5', roundLimit: 10 });
  if (diff === 'study') Object.assign(cfg, { mode: 'study', diff: 'std', learn: true, roundLimit: 0, dlc: cfg.dlc.some(k => DLC[k] && DLC[k].quiz) ? cfg.dlc : [...cfg.dlc, 'qclf'] });
  if (diff === 'hell') hellCfg(cfg);
  if (q.get('rl') && cfg.mode !== 'party' && cfg.mode !== 'study') cfg.roundLimit = +q.get('rl');   // ?rl=50：按开局页默认的轮数上限打
  newGame(cfg);
  // ?acc=1,0.75,0.5,0.25：每局把这几个答题正确率随机分给各个座位，看正确率和胜率的关系
  if (q.get('acc')) S.acc = shuffle(q.get('acc').split(',').map(Number));
  enterGame();
  S.stats = { rent: 0, rentN: 0, joint: 0, run: 0, salary: 0, upg: 0, stops: 0 };
  const g = { rounds: 0, firstBust: null, cashByRound: {}, ownedByRound: {}, rentPaid: 0, runPaid: 0, salary: 0 };
  let lastRound = 0, steps = 0;
  while (!S.over && steps++ < 20000 && S.round <= 120) {
    await new Promise(r => setTimeout(r, 0));
    if (S.round !== lastRound) {
      lastRound = S.round;
      const alive = S.players.filter(q => q.alive);
      g.cashByRound[S.round] = Math.round(alive.reduce((a, q) => a + q.cash, 0) / alive.length);
      g.ownedByRound[S.round] = Math.round(alive.reduce((a, q) => a + ownedBy(q).length, 0) / alive.length * 10) / 10;
      g.netByRound = g.netByRound || {}; g.netByRound[S.round] = Math.round(alive.reduce((a, q) => a + netWorth(q), 0) / alive.length);
      g.low = g.low || {}; alive.forEach(q => { if (g.low[q.id] == null && q.cash < (q.startCash || 1600) / 4) g.low[q.id] = S.round; });
      { const mx = Math.max(...alive.map(q => netWorth(q))); g.lowA = g.lowA || {}; g.lowB = g.lowB || {}; alive.forEach(q => { if (g.lowA[q.id] == null && netWorth(q) < (q.startCash || 1600) / 2) g.lowA[q.id] = S.round; if (g.lowB[q.id] == null && alive.length > 1 && netWorth(q) < mx / 4) g.lowB[q.id] = S.round; }); }
      if ([10, 15, 20, 30].includes(S.round)) { g.pil = g.pil || {}; g.pil[S.round] = alive.map(q => pillarScore(q)); }
    }
    if (g.firstBust === null && S.players.some(q => !q.alive)) g.firstBust = S.round;
    simCheck(g);
    if (S.phase === 'roll') {
      const p = cur();
      // 像真人一样：停在自己的服务上、钱够就升级；act=ai 时走游戏里电脑的同一份代码
      if (SIM_AI) aiBuild(p); else { const i = landHere(p); if (i != null) { const u = upgradeInfo(p, i, true); if (u.ok && p.cash - u.total >= simReserve * 2) { doUpgrade(p, i, true); S.landAct.used = true; } } }
      if (p.jail !== null) { if (SIM_AI) { await aiRoleSkill(p); await resolveDebts(); } if (p.alive && cur() === p) await jailAct(p.cash > 600 ? 'pay' : 'stay'); }
      else { if (SIM_AI) { S.phase = 'busy'; S.uiPrev = 'roll'; S.nextPhase = null; await aiRoleSkill(p); await aiSpeed(p); await resolveDebts(); S.phase = S.nextPhase || 'roll'; S.nextPhase = null; } if (S.phase === 'roll' && cur() === p && p.alive) await doRoll(); }
    }
    else if (S.phase === 'post') { if (SIM_AI) aiBuild(cur()); await endTurn(); }
  }
  g.stats = S.stats; g.released = S.players.reduce((a, q) => a + (q.released || 0), 0); g.levels = OWNABLE.reduce((a, i) => a + S.props[i].level, 0);
  g.speedLog = S.log.filter(l => _tr(4756, "部署点数", "").test(l) && _tr(4757, "花 \\d+ 点", "").test(l)).length;
  g.viaBuys = S.log.filter(l => _tr(4758, "从代理商", "").test(l)).length; g.skills = S.log.filter(l => _tr(4759, "触底反弹！", "").test(l)).length;
  { const rank = [...S.players].sort((a, b) => (b.alive - a.alive) || valuation(b) - valuation(a)); g.win = rank[0].role; g.roles = S.players.map(q => q.role); g.winId = rank[0].id; g.acc = S.acc || null; g.skillUsers = S.players.filter(q => q.skillUsed).map(q => q.id); g.rsRank = S.players.filter(q => q.reseller).map(q => rank.indexOf(q) + 1); }
  g.rounds = S.round; g.over = S.over; g.alive = S.players.filter(q => q.alive).length; g.mode = S.cfg.mode; g.rl = S.cfg.roundLimit; g.steps = steps; g.maxRent = Math.max(...S.players.map(q => ST(q).maxRent || 0)); { const sum = re => S.log.reduce((t, l) => { const m = re.exec(logBody(l).replace(/<[^>]+>/g, '')); return t + (m ? +m[1] : 0); }, 0); g.rsInc = { buy: sum(_tr(4760, "花 \\$\\d+ 买下.*赚差价 \\$(\\d+)", "")), run: sum(_tr(4761, "运行费 \\$\\d+ 交给.*赚差价 \\$(\\d+)", "")), msp: sum(_tr(4762, "托管费 \\$(\\d+)", "")), skill: sum(_tr(4763, "触底反弹！.*?\\$(\\d+)", "")) }; } g.vals = S.players.map(q => Object.assign({ rs: !!q.reseller, role: q.role, alive: q.alive, own: ownedBy(q).length, rentIn: ST(q).rentIn || 0, rentOut: ST(q).rentOut || 0 }, valBreak(q))); if (!g.alive) g.tail = S.log.slice(0, 40).map(l => logBody(l).replace(/<[^>]+>/g, '').slice(0, 140));
  g.endWhy = S.over ? (S.log.find(l => _tr(4764, "打满|估值|Well-Architected|只剩|赢了|获胜", "").test(l)) || '').slice(0, 60) : _t(4765, "没结束");
  SIMOUT.games.push(g);
}
// 每一步查一遍状态有没有坏：钱是不是数、服务的主人还在不在、破产的人手里还有没有东西
function simCheck(g) {
  const bad = m => { g.err = g.err || []; if (g.err.length < 8 && !g.err.includes(m)) g.err.push(m); };
  S.players.forEach(p => {
    if (!Number.isFinite(p.cash)) bad(_tf(4766, "{$0} 现金 {$1}", p.name, p.cash));
    if (!Number.isInteger(p.pos) || p.pos < 0 || p.pos >= N) bad(_tf(4767, "{$0} 位置 {$1}", p.name, p.pos));
    if (!p.alive && ownedBy(p).length) bad(_tf(4768, "{$0} 破产了还有 {$1} 个服务", p.name, ownedBy(p).length));
    if (p.alive && S.phase === 'roll' && cur() === p && p.cash < 0 && !(p.debt || []).length) bad(_tf(4769, "{$0} 回合开始现金为负 {$1}", p.name, p.cash));
  });
  OWNABLE.forEach(i => { const pr = S.props[i];
    if (pr.owner != null && !(S.players[pr.owner] && S.players[pr.owner].alive)) bad(_tf(4770, "{$0} 的主人 {$1} 不在了", SQ[i].n, pr.owner));
    if (!Number.isInteger(pr.level) || pr.level < 0) bad(_tf(4771, "{$0} 等级 {$1}", SQ[i].n, pr.level));
    if (pr.owner == null && (pr.level || pr.cap)) bad(_tf(4772, "{$0} 没主人却有等级/容量", SQ[i].n));
  });
  if (!Number.isFinite(S.pot) || S.pot < 0) bad(_tf(4773, "奖池 {$0}", S.pot));
}
window.addEventListener('error', e => { (SIMOUT.errors = SIMOUT.errors || []).push(String(e.message).slice(0, 200)); });
window.addEventListener('unhandledrejection', e => { (SIMOUT.errors = SIMOUT.errors || []).push('reject: ' + String(e.reason && (e.reason.stack || e.reason)).slice(0, 300)); });
export async function simMain() {
  const q = new URLSearchParams(location.search);
  const n = +q.get('sim') || 10, pl = +q.get('players') || 4, diff = q.get('diff') || 'std';
  simReserve = +(q.get('reserve') || 150);
  for (let k = 0; k < n; k++) { try { await simGame(pl, diff); } catch (e) { (SIMOUT.errors = SIMOUT.errors || []).push(_tf(4774, "第 {$0} 局抛错：", k + 1) + String(e.stack || e).slice(0, 400)); } }
  $('#botout').textContent = 'SIMRESULT ' + JSON.stringify(SIMOUT); $('#botout').hidden = false;
}

