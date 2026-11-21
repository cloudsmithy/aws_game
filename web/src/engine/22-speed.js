import { __rv, _t, _tf } from '../core/01-i18n-runtime.js';
import { BOT, waitAnim } from '../core/02-util.js';
import { UI } from '../core/02b-ui-port.js';
import { IX, N, OWNABLE, SQ, lvName } from '../rules/03-services.js';
import { INC } from '../rules/04-roles-combos-cards.js';
import { dlcOn } from '../rules/05-dlc.js';
import { P, S, active, combosBrokenBy, cur, log, nm, ownedBy, sqn } from './07-state.js';
import { netWorth } from './08c-costs.js';
import { baseRent, shownRent, upgradeInfo } from './09-rent.js';
import { moveSteps } from './13-move.js';
import { rollDice } from './14-turn.js';
import { land } from './15-land.js';
import { drawIncident } from './17-health.js';
import { drawReinvent } from './18-reinvent.js';
import { evt } from './26b-retro.js';
import { isAI } from './36-ai.js';
import { fxAll } from '../net/41-replay.js';
// ================= 高速部署 DLC：部署点数 =================
// 借鉴游戏王 5D's 的 Speed Counter：每回合 +1（最多 12），被事件打中 −2、进维护窗口 −4；花 1–12 点各发动一个技能
export const SPEED_MAX = 12;
export function speedLose(p, n, why) {
  if (!dlcOn('speed') || !p.speed) return;
  const x = Math.min(n, p.speed); p.speed -= x;
  log(_tf(3407, "🐢 {$0} {$1}，部署点数 −{$2}（剩 {$3}）", nm(p), why, x, p.speed));
}
export function speedSpend(p, n, what) { p.speed -= n; log(_tf(3408, "⚡ {$0} 花 {$1} 点部署点数：{$2}（剩 {$3}）", nm(p), n, what, p.speed)); }
// 没做高可用被打成 Impaired 的可用性事件，可以用 4 点「故障转移」扛住
export const haIncident = id => INC[id] && INC[id].c === 'avail' && /Impaired/.test(INC[id].e);
export function speedTurnStart(p) {
  S.attackUsed = false; S.extraTurn = false;
  OWNABLE.forEach(i => { const pr = S.props[i]; if (pr.ddos === p.id && --pr.ddosLeft <= 0) { pr.ddos = null; pr.ddosLeft = 0; log(_tf(3409, "{$0} 扛过了 {$1} 的 DDoS，恢复上线", sqn(i), nm(p))); } });
  if (p.speed < SPEED_MAX) p.speed++;
}
// 掷完骰子：1 点多走或少走一步，2 点重掷
export async function speedRoll(p, d) {
  // 电脑掷完一律照走（aiAct 只点「照走」，点数留给 aiSpeed 发 DDoS 这类主动技能）：开窗只会压暗棋盘、让大家干等 0.9 秒。
  // 机器人回归（BOT）照样开窗，好随机测到灰度发布、回滚重发
  if (!BOT && isAI(p.id)) return { d, adj: 0 };
  for (;;) {
    if (p.speed < 1) return { d, adj: 0 };
    const n = d[0] + d[1], at = k => SQ[(p.pos + k + N) % N].n;
    const b = [{ label: _tf(3410, "照走 {$0} 步（{$1}）", n, at(n)), value: 'go', cls: 'pri', botW: 3 }, { label: _tf(3411, "灰度发布：少走 1 步（{$0}，1 点）", at(n - 1)), value: 'm' }, { label: _tf(3412, "灰度发布：多走 1 步（{$0}，1 点）", at(n + 1)), value: 'p' }];
    if (p.speed >= 2) b.push({ label: _t(3413, "回滚重发：重掷（2 点）"), value: 'r' });
    const v = await UI.ask({ who: p.id, title: _tf(3414, "{$0} 掷出 {$1}：部署点数 {$2}/{$3}", p.name, n, p.speed, SPEED_MAX), html: _t(3415, "<p>可以花点数调整这一步。对子只看骰子本身，多走少走不影响。</p>"), buttons: b });
    if (v === 'go') return { d, adj: 0 };
    if (v === 'm' || v === 'p') { speedSpend(p, 1, _tf(3418, "灰度发布，{$0}走 1 步", v === 'm' ? _t(3416, "少") : _t(3417, "多"))); return { d, adj: v === 'm' ? -1 : 1 }; }
    speedSpend(p, 2, _t(3419, "回滚重发，重掷一次")); d = rollDice(p); UI.render(); await waitAnim(UI.FX.dice(d), 1700);
  }
}
// 能打的服务：对手已上线的服务，不能连着两次打同一个人；轻 DDoS 还要求现在没 Impaired
const ddosShield = o => active(o, IX.shield) ? 'Shield Advanced' : active(o, IX.cloudfront) ? 'CloudFront' : '';
const ddosTargets = (p, light) => S.players.filter((o, _, a) => o.alive && o.id !== p.id && (o.id !== p.lastDdos || a.filter(q => q.alive && q.id !== p.id).length === 1)).flatMap(o => ownedBy(o).filter(i => active(o, i) && ['prop', 'util'].includes(SQ[i].t) && !(light && S.props[i].impaired)).map(i => ({ o, i })));
const freeUps = p => ownedBy(p).filter(i => upgradeInfo(p, i, true).ok);
const pickOpp = (p, title, list) => UI.ask({ who: p.id, cls: 'pick', title, buttons: [...list.map(o => ({ label: _tf(3420, "{$0}（${$1}）", o.name, o.cash), value: o.id })), { label: _t(3005, "算了"), value: 'x' }] });
// 选目标列表上的数和格子上标的一样（shownRent）。12 点版打下线：这一环没有备用服务顶上，整套架构就失效；
// 6 点版（Impaired）不拆架构，只停收这一块，同一环有备用的由备用顶上。少收多少不好手算（备用块的过路费、串联架构共用的块），先临时标成 Impaired，按格子上的数重算同套其他格
const ddosTag = (x, light) => {
  const sr = shownRent(x.i), pr = S.props[x.i], cs = combosBrokenBy(x.o, x.i).map(c => _tf(2766, "「{$0}」", c.n)).join('');
  if (pr.impaired) return _tf(3422, "已经 Impaired，现在不收{$0}", !light && cs ? _tf(3421, "，打下线就拆散{$0}", cs) : '');
  if (!sr.r) return _t(3423, "没成架构，现在不收");
  if (!sr.jr) return `≈$${sr.r}`;
  if (!light) return _tf(3426, "≈${$0}，{$1}", sr.r, cs ? _tf(3424, "打掉就拆散{$0}", cs) : _t(3425, "这一环有备用服务，架构不散"));
  const js = sr.jr.parts.filter(m => m !== x.i), r0 = js.map(m => shownRent(m).r);
  let loss = 0;
  try { pr.impaired = true; loss = Math.max(0, ...js.map((m, k) => r0[k] - shownRent(m).r)); } finally { pr.impaired = false; }
  return _tf(3430, "≈${$0} 联合收费，打完同套其他格{$1}", sr.r, loss ? _tf(3427, "少收 ≈${$0}", loss) : sr.cap ? _t(3428, "照收") : _t(3429, "照收，这一环有备用顶上"));
};
// DDoS：light 是 6 点版（Impaired 到对手下回合开始），否则是 12 点版（下线 2 回合）
// 按格子上标的过路费排；同一套架构几块一样高时，单块过路费高的排前面
async function ddos(p, light) {
  const c = light ? 6 : 12, list = ddosTargets(p, light).sort((a, b) => !!ddosShield(a.o) - !!ddosShield(b.o) || shownRent(b.i).r - shownRent(a.i).r || baseRent(b.i, 7) - baseRent(a.i, 7));
  const v = await UI.ask({ who: p.id, cls: 'pick', title: _tf(3431, "DDoS（{$0} 点）：打哪一块？", c), html: _tf(3434, "<p>{$0}。按格子上标的过路费从高到低排（组成架构的按整套联合收费）；对手有 Shield Advanced 或 CloudFront 的打不动，点数照扣。</p>", light ? _t(3432, "打成 Impaired，到对手下回合开始恢复") : _t(3433, "直接打下线 2 回合（到你第 2 个回合开始恢复）")), buttons: [...list.slice(0, 12).map(x => ({ label: _tf(3436, "{$0} 的 {$1}（{$2}）{$3}", x.o.name, SQ[x.i].n, ddosTag(x, light), ddosShield(x.o) ? _tf(3435, "· 有 {$0} 打不动", ddosShield(x.o)) : ''), value: x.i })), { label: _t(3005, "算了"), value: 'x' }] });
  if (v === 'x') return;
  const i = +v, o = P(S.props[i].owner);
  S.attackUsed = true; p.lastDdos = o.id; speedSpend(p, c, _tf(3437, "对 {$0} 的 {$1} 发起 DDoS", nm(o), sqn(i))); fxAll({ s: 'fail', f: 'arcs', a: [[p.pos, i], '#ff3b30'] });
  const imm = ddosShield(o);
  if (imm) { fxAll({ f: 'shield', a: [i] }); fxAll({ f: 'shock', a: [i], d: 350 }); fxAll({ co: [i, _tf(3438, "<b>打不动</b><small>{$0}</small>", imm), 'ok'] }); log(_tf(3439, "🛡️ {$0} 有 {$1}，DDoS 流量在边缘就被吸收了，{$2} 照常运行", nm(o), imm, sqn(i))); return; }
  if (o.speed >= 7) {
    const ok = await UI.ask({ who: o.id, title: _tf(3440, "{$0} 的 {$1} 被 DDoS 了", o.name, SQ[i].n), html: _tf(3443, "<p>不处理的话，这块服务{$0}。可以花 7 点部署点数蓝绿部署，把流量切到新环境。</p>", light ? _t(3441, "变成 Impaired，到你下回合开始恢复") : _tf(3442, "下线 2 回合（到 {$0} 第 2 个回合开始恢复）", nm(p))), buttons: [{ label: _t(3444, "花 7 点蓝绿部署抵消"), value: true, cls: 'pri' }, { label: _t(3445, "扛着"), value: false }] });
    if (ok) { speedSpend(o, 7, _tf(3446, "蓝绿部署，{$0} 扛住了 DDoS", sqn(i))); return; }
  }
  if (light) { S.props[i].impaired = true; fxAll({ co: [i, _tf(3447, "<b>{$0}</b> 被 DDoS 打成 Impaired", SQ[i].n), 'warn'] }); log(_tf(3448, "💥 {$0} 的 {$1} 被 DDoS 打成 Impaired，到 {$2} 下回合开始恢复", nm(o), sqn(i), nm(o))); return; }
  S.props[i].ddos = p.id; S.props[i].ddosLeft = 2; evt(_tf(3449, "{$0} DDoS 了 {$1} 的 {$2}", p.name, o.name, SQ[i].n), 500); fxAll({ co: [i, _tf(3450, "<b>{$0} 的 {$1} 下线 2 回合</b><small>不收过路费，运行费照交</small>", o.name, SQ[i].n), 'warn'] });
  log(_tf(3451, "💥 {$0} 的 {$1} 被 DDoS 打到下线：不收过路费、不算持有，到 {$2} 第 2 个回合开始恢复", nm(o), sqn(i), nm(p)));
}
// 每个技能：c 点数，n 名字，d 效果，ok 返回不能用的原因（空字符串就是能用），run 发动；react 是被动时机才弹出的
export let SPEED = __rv(() => ([
  { c: 1, n: _t(3452, "灰度发布"), d: _t(3453, "掷完骰子后多走或少走 1 步"), react: _t(3454, "掷完骰子时自动问") },
  { c: 2, n: _t(3455, "回滚重发"), d: _t(3456, "掷完骰子后重掷一次"), react: _t(3454, "掷完骰子时自动问") },
  // 抽卡每局最多 2 次（p.spd3n 记用了几次）：3 点白抽一张 re:Invent 卡比别的技能都划算，不限次数时每 3 回合抽一张，模拟里 1 号位这么打胜率 26% → 39%
  { c: 3, n: _t(3457, "抽卡"), d: _t(3458, "免费抽一张 re:Invent 卡，掷骰子前后都能用（和花钱抽卡共用每回合一次，每局最多 2 次）"), ok: (p, ph) => (p.spd3n || 0) >= 2 ? _t(3459, "这局已经抽过 2 次了") : S.reiBought ? _t(3460, "这回合已经抽过卡") : p.jail !== null ? _t(3461, "在维护窗口里不能抽") : '', run: async p => { S.reiBought = true; p.spd3n = (p.spd3n || 0) + 1; speedSpend(p, 3, _tf(3462, "抽一张 re:Invent 卡（这局第 {$0} 次，最多 2 次）", p.spd3n)); await drawReinvent(p); } },
  { c: 4, n: _t(38, "故障转移"), d: _t(3463, "没做高可用、要被可用性事件打成 Impaired 时（AZ 断电、单点故障、Region 故障、流量暴增…），这次扛住"), react: _t(3464, "被可用性事件打中时自动问") },
  { c: 5, n: _t(3465, "混沌注入"), d: _t(3466, "逼一位对手抽一张 Health 事件卡（每回合最多发动一次攻击）"), ok: p => S.attackUsed ? _t(3467, "这回合已经攻击过了") : '', run: async p => {
    const v = await pickOpp(p, _t(3468, "混沌注入：让谁抽一张 Health 事件卡？"), S.players.filter(o => o.alive && o.id !== p.id).sort((a, b) => netWorth(b) - netWorth(a)));
    if (v === 'x') return; const o = P(v);
    S.attackUsed = true; speedSpend(p, 5, _tf(3469, "对 {$0} 混沌注入，逼他抽一张 Health 事件卡", nm(o))); await drawIncident(o);
  } },
  { c: 6, n: _t(3470, "DDoS（轻）"), d: _t(3471, "让一位对手的一块服务变成 Impaired，到对手下回合开始恢复。对手有 Shield Advanced 或 CloudFront 免疫，也可以花 7 点蓝绿部署抵消；每回合最多攻击一次，不能连着两次打同一个人"), ok: p => S.attackUsed ? _t(3467, "这回合已经攻击过了") : ddosTargets(p, true).length ? '' : _t(3472, "没有能打的服务（不能连着两次打同一个人）"), run: p => ddos(p, true) },
  { c: 7, n: _t(3473, "蓝绿部署"), d: _t(3474, "抵消一张打到自己的 Health 事件卡，或者一次 DDoS"), react: _t(3475, "被打中时自动问") },
  { c: 8, n: _t(3476, "流水线自动化"), d: _t(3477, "选一块能升级的服务免费升一级（不用落在那块服务上）"), ok: p => freeUps(p).length ? '' : _t(3478, "没有能升级的服务"), run: async p => {
    const ups = freeUps(p);
    const i = await UI.ask({ who: p.id, cls: 'pick', title: _t(3479, "流水线自动化：免费升哪一块？"), buttons: [...ups.map(x => ({ label: `${SQ[x].n} → ${lvName(x, S.props[x].level + 1)}`, value: x })), { label: _t(3005, "算了"), value: 'x' }] });
    if (i === 'x') return;
    speedSpend(p, 8, _tf(3480, "流水线自动化，免费给 {$0} 加上「{$1}」", sqn(i), lvName(i, S.props[i].level + 1)));
    S.props[i].level++; (S.props[i].upPaid = S.props[i].upPaid || [])[S.props[i].level - 1] = 0;
  } },
  { c: 9, n: _t(3481, "自动修复"), d: _t(3482, "自己所有 Impaired 的服务马上恢复，再清掉 1 个技术债"), ok: p => ownedBy(p).some(i => S.props[i].impaired) || p.techDebt > 0 ? '' : _t(3483, "没有 Impaired 的服务，也没有技术债"), run: async p => {
    const imp = ownedBy(p).filter(i => S.props[i].impaired); imp.forEach(i => { S.props[i].impaired = false; });
    const td = p.techDebt > 0; if (td) p.techDebt--;
    speedSpend(p, 9, _tf(3486, "自动修复{$0}{$1}", imp.length ? _tf(3484, "，{$0} 恢复正常", imp.map(sqn).join(_t(349, "、"))) : '', td ? _t(3485, "，清掉 1 个技术债") : ''));
  } },
  { c: 10, n: 'Global Accelerator', d: _t(3487, "不掷骰子，直接前进 1–12 中任意步数并结算落点（代替这回合的掷骰子）"), ok: (p, ph) => ph !== 'roll' ? _t(3488, "要在掷骰子之前用") : p.jail !== null ? _t(3489, "在维护窗口里不能用") : '', run: async p => {
    const r = await UI.modal({ who: p.id, title: _t(3490, "Global Accelerator：前进几步？"), inputs: [{ id: 'n', label: _t(3491, "步数（1–12）"), type: 'number', min: 1, max: 12, step: 1, value: 7 }], buttons: [{ label: _t(3492, "出发"), value: true, cls: 'pri' }, { label: _t(3005, "算了"), value: false }] });
    if (!r.v) return;
    const n = Math.max(1, Math.min(12, Math.round(+r.inp.n || 7)));
    speedSpend(p, 10, _tf(3493, "Global Accelerator，直接前进 {$0} 步", n));
    S.lastDice = [Math.ceil(n / 2), Math.floor(n / 2)]; S.again = false;
    await moveSteps(p, n); await land(p);
    if (S.extraTurn && p.alive && p.jail === null && !p.skip) { S.extraTurn = false; S.doubles = 0; S.nextPhase = 'roll'; log(_tf(2929, "⚡ {$0} 加开一班，再走一次", nm(p))); }
    else S.nextPhase = 'post';
  } },
  { c: 11, n: _t(3494, "加开一班"), d: _t(3495, "这回合走完再走一次（像掷出对子）"), ok: p => S.extraTurn ? _t(3496, "已经加开过了") : p.jail !== null ? _t(3489, "在维护窗口里不能用") : p.skip ? _t(3497, "下一轮要停，不能加开") : '', run: async (p, ph) => {
    speedSpend(p, 11, _t(3498, "加开一班，这回合再走一次"));
    if (ph === 'post') { S.doubles = 0; S.nextPhase = 'roll'; } else S.extraTurn = true;
  } },
  { c: 12, n: _t(3499, "DDoS（重）"), d: _t(3500, "让一位对手的一块服务下线 2 回合（到你第 2 个回合开始恢复）：不收过路费、不算持有（不凑整组、架构和支柱）。防御同 DDoS（轻）"), ok: p => S.attackUsed ? _t(3467, "这回合已经攻击过了") : ddosTargets(p).length ? '' : _t(3472, "没有能打的服务（不能连着两次打同一个人）"), run: p => ddos(p, false) },
]), v => { SPEED = v; }, () => SPEED);
export async function speedMenu() {
  const p = cur(), ph = S.uiPrev;
  const why = s => s.react ? s.react : p.speed < s.c ? _tf(3501, "还差 {$0} 点", s.c - p.speed) : s.ok(p, ph);
  const tile = s => { const w = why(s), can = !w, atk = [5, 6, 12].includes(s.c);
    const left = s.c === 3 && can ? _tf(3502, "<span class=\"skw\">这局还能抽 {$0} 次</span>", 2 - (p.spd3n || 0)) : '';
    return `<button class="sk ${can ? 'on' : ''} ${s.react ? 'react' : ''} ${atk ? 'atk' : ''}" ${can ? `data-v="${s.c}" data-bw="1"` : 'disabled'} title="${s.d}"><span class="skc">${s.c}</span><b>${s.n}</b><span class="skd">${s.d}</span>${w ? `<span class="skw">${w}</span>` : left}</button>`; };
  const v = await UI.ask({ who: p.id, cls: 'wide', title: _tf(3503, "{$0} 的部署点数 {$1}/{$2}", p.name, p.speed, SPEED_MAX), html: _tf(3504, "<div class=\"skbar\"><span style=\"--w:{$0}%\"></span></div><p class=\"muted\" style=\"margin:6px 0 10px\">每回合开始 +1，最多 {$1}；被事件打中 −2，进维护窗口 −4。点亮的卡片点一下就发动，点数花掉就没了；灰色的写着为什么现在不能用。</p><div class=\"skgrid\">{$2}</div>", p.speed / SPEED_MAX * 100, SPEED_MAX, SPEED.map(tile).join('')),
    buttons: [{ label: _t(2610, "关闭"), value: 'x', cls: 'pri', botW: 2 }] });
  if (v === 'x') return;
  const s = SPEED.find(x => x.c === +v); if (!s || why(s)) return;
  await s.run(p, ph);
}
// 电脑玩家怎么花点数：攒满 12 点就 DDoS 最赚钱的那块；不然有 3 点先免费抽卡（每局 2 次）；服务坏了先修，偶尔免费升级
export async function aiSpeed(p) {
  if (!dlcOn('speed') || p.jail !== null || !p.alive) return;
  const use = async c => { const s = SPEED.find(x => x.c === c); if (p.speed >= c && !s.ok(p, 'roll')) await s.run(p, 'roll'); };
  if (p.speed >= 12 && ddosTargets(p).some(x => !ddosShield(x.o))) return use(12);
  // 3 点抽卡最划算（每局限 2 次）：有就先用掉。原来电脑从来不用它，真人对着电脑每 3 回合白抽一张
  if (p.speed >= 3 && !SPEED.find(x => x.c === 3).ok(p, 'roll')) return use(3);
  if (p.speed >= 6 && p.speed < 10 && Math.random() < 0.15 && ddosTargets(p, true).some(x => !ddosShield(x.o))) return use(6);
  if (p.speed >= 9 && (ownedBy(p).filter(i => S.props[i].impaired).length >= 2 || p.techDebt >= 2)) return use(9);
  if (p.speed >= 8 && freeUps(p).length && Math.random() < 0.3) return use(8);
}

