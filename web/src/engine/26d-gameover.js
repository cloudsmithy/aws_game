import { __rv, _t, _tf, _tr } from '../core/01-i18n-runtime.js';
import { BOT, DEMO, KEY, MY_REV, STALE, revNow, usd } from '../core/02-util.js';
import { UI } from '../core/02b-ui-port.js';
import { SQ } from '../rules/03-services.js';
import { P, S, log, nm } from './07-state.js';
import { valuation } from './08c-costs.js';
import { reportOutRound } from './26b-retro.js';
// 估值走势：每轮开始记一次 [轮次, 0 号玩家估值, 1 号, …]（按玩家 id，出局的人记 null），结束时 gameOver 再记一次终局值
export function valSnap() { if (!S || !S.players) return; (S.valHist = S.valHist || []).push([S.round, ...S.players.map(q => q.alive ? valuation(q) : null)]); }
// 导出对局记录里的「数据」一段：估值走势、钱从哪来、手气、现金最少的时候、用时、全场最赚钱的格子（只读，和战报用同一份埋点）
let GAIN_N = __rv(() => ({ rent: _t(3845, "过路费"), salary: _t(3689, "起点 Credits"), card: _t(3690, "卡牌和技能"), sell: _t(3691, "卖回和下线"), other: _t(3692, "其他") }), v => { GAIN_N = v; }, () => GAIN_N);
function reportStats(w) {
  const rank = finalRank(w), pst = S.pst || {}, T = q => pst[q.id] || {}, full = !(S.mFrom > 1), r1 = v => Math.round(v * 10) / 10;
  const outAt = reportOutRound;
  const minutes = S.t0 && S.t1 ? Math.max(1, Math.round((S.t1 - S.t0 - (S.tOff || 0)) / 60000)) : null;
  // 估值走势：至少两个点才画；最后一项是 gameOver 记的终局值
  const H = (Array.isArray(S.valHist) ? S.valHist : []).filter(h => Array.isArray(h) && h.length > 1);
  let trend = null;
  if (H.length >= 2) {
    const fin = !!S.over && !!S.t1, L = H.length - 1;
    const pts = H.map((h, k) => ({ r: h[0], x: fin && k === L ? h[0] + 1 : h[0], end: fin && k === L }));
    const lines = rank.map(q => ({ q, win: !!w && q.id === w.id, out: outAt(q), v: H.map(h => typeof h[q.id + 1] === 'number' ? h[q.id + 1] : null) }));
    const all = lines.flatMap(l => l.v).filter(v => v != null);
    if (all.length) trend = { pts, lines, min: Math.min(...all), max: Math.max(...all) };
  }
  const has = k => full && rank.every(q => T(q)[k]);
  const gain = has('gain') ? rank.map(q => { const g = T(q).gain, o = { q }; let total = 0; Object.keys(GAIN_N).forEach(k => { o[k] = Math.round(g[k] || 0); total += o[k]; });
    return { ...o, total, parts: Object.keys(GAIN_N).filter(k => o[k] > 0).map(k => [GAIN_N[k], o[k]]) }; }) : null;
  const dice = has('dice') ? rank.map(q => { const d = T(q).dice, n = d.n || 0, pips = d.pips || 0; return { q, n, pips, dbl: d.dbl || 0, avg: n ? pips / n : 0 }; }) : null;
  let luck = null;
  if (dice) { const c = dice.filter(d => d.n >= 3), mx = Math.max(0, ...c.map(d => r1(d.avg))); if (mx > 0) luck = { qs: c.filter(d => r1(d.avg) === mx).map(d => d.q), avg: mx }; }
  const low = has('low') ? rank.map(q => ({ q, cash: Math.round(T(q).low.cash || 0), r: T(q).low.r || 1 })) : null;
  const al = low ? low.filter(x => x.q.alive) : [], brink = al.length ? al.reduce((a, x) => x.cash < a.cash ? x : a) : null;
  // 全场最赚钱的格子：把所有人的 earnBy 按格子加起来（服务换过主人的，几个人收的都算），收得最多的那个人另外记下
  const sum = {}, hit = {}, by = {};
  S.players.forEach(q => { const t = T(q); Object.entries(t.earnBy || {}).forEach(([i, v]) => { if (!(v > 0)) return; sum[i] = (sum[i] || 0) + v; hit[i] = (hit[i] || 0) + ((t.hitsBy || {})[i] || 0); if (!by[i] || v > by[i][1]) by[i] = [q, v]; }); });
  const ti = Object.keys(sum).sort((a, b) => sum[b] - sum[a])[0], own = ti != null && S.props[ti] ? S.props[ti].owner : null;
  const topSq = ti == null ? null : { i: +ti, amt: sum[ti], hits: hit[ti] || 0, q: by[ti][0], owner: own != null ? P(own) : null };
  return { from: S.mFrom || 1, minutes, trend, gain, dice, luck, low, brink, topSq };
}
// 导出对局记录里的「数据」：和战报同一份 reportStats，缺的项不写
export function statTxt(w) {
  const x = reportStats(w), m = v => usd(v), out = [];
  if (x.from > 1) out.push(_tf(3881, "（这局是从老版本的存档接着打的，下面的数从第 {$0} 轮才开始记）", x.from));
  if (x.minutes) out.push(_tf(3882, "用时：{$0} 分钟", x.minutes));
  if (x.topSq) { const t = x.topSq; out.push(_tf(3885, "全场最赚钱的格子：{$0}，一共收了 {$1}{$2}，{$3} 收得最多{$4}", SQ[t.i].n, m(t.amt), t.hits ? _tf(3883, "（{$0} 次）", t.hits) : '', t.q.name, t.owner && t.owner !== t.q ? _tf(3884, "，现在归 {$0}", t.owner.name) : '')); }
  if (x.gain) out.push(_t(3886, "钱从哪来："), ...x.gain.map(g => _tf(3887, "　{$0}：共 {$1}{$2}", g.q.name, m(g.total), g.parts.length ? _t(2698, "，") + g.parts.map(([n, v]) => `${n} ${m(v)}`).join(_t(349, "、")) : '')));
  if (x.dice) out.push(_tf(3889, "手气{$0}：", x.luck ? _tf(3888, "（最好的是 {$0}，平均 {$1} 点）", x.luck.qs.map(q => q.name).join(_t(349, "、")), x.luck.avg.toFixed(1)) : ''), ...x.dice.map(d => _tf(3891, "　{$0}：掷了 {$1} 次{$2}", d.q.name, d.n, d.n ? _tf(3890, "，平均 {$0} 点，对子 {$1} 次", d.avg.toFixed(1), d.dbl) : '')));
  if (x.low) out.push(_t(3892, "现金最少的时候（现金减欠款）："), ...x.low.map(l => _tf(3893, "　{$0}：第 {$1} 轮，{$2}", l.q.name, l.r, m(l.cash))));
  if (x.trend) out.push(_t(3894, "估值走势（每轮开始时，最后一行是终局；出局以后写「—」）："), ...x.trend.pts.map((p, k) => _tf(3897, "　{$0}　{$1}", p.end ? _t(3895, "终局") : _tf(3896, "第 {$0} 轮", p.r), x.trend.lines.map(l => `${l.q.name} ${l.v[k] == null ? '—' : m(l.v[k])}`).join(_t(3335, "　")))));
  return out.length ? [_t(3898, "数据："), ...out, ''] : [];
}
export function gameOver(w, why, kind) {
  S.over = true; S.phase = 'over'; S.winner = w ? w.id : null; S.overWhy = why; if (kind) S.overKind = kind;   // 结束原因跟着状态同步，远端拿它出战报
  if (!S.t1) { S.t1 = Date.now(); valSnap(); }   // 战报：对局用时、估值走势的终局值
  if (w) log(_tf(3899, "🏆 {$0} 获胜：{$1}", nm(w), why));
  // 只删自己存的那份：演示局、机器人局、被别的标签页接手了的旧页面，删掉的是别人还在打的局
  if (!BOT && !DEMO && !STALE && revNow() === MY_REV) { try { localStorage.removeItem(KEY); } catch (e) { } }
  UI.render();
  UI.overScreens(w, why);
}
// （从 ui/26c-report.js 挪来）
export const finalRank = w => [...S.players].sort((a, b) => (w ? (b.id === w.id) - (a.id === w.id) : 0) || (b.alive - a.alive) || valuation(b) - valuation(a));
// （从 ui/26c-report.js 挪来）
// 结束方式：none 没有赢家 / wa 六大支柱 / last 撑到最后 / val 按估值。结束画面、战报、台面中央、导出记录用同一套说法
export const finKind = (w, why) => !w ? 'none' : S.overKind || (_tr(3747, "六大支柱|six pillars|6 つの柱", "i").test(why) ? 'wa' : _tr(3748, "暂停了账[号户]|suspended|アカウント(が|を)?停止", "i").test(why) ? 'last' : 'val');
