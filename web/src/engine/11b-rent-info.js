import { _t, _tf } from '../core/01-i18n-runtime.js';
import { BAL, SQ, TOKEN, UTILS, effLabel } from '../rules/03-services.js';
import { dlcRentMul } from '../rules/05-dlc.js';
import { P, S, active, cur, effActive, ownsGroup } from './07-state.js';
import { runCost } from './08c-costs.js';
import { trafficMul } from './09-rent.js';
// 某一级的每圈运行费：按这一格现在的容量、主人算（没人买就按刚买下算），下线的按上线算
function atLevel(i, l, f) { const pr = S.props[i], l0 = pr.level, off = pr.offline; pr.level = l; pr.offline = false; try { return f(); } finally { pr.level = l0; pr.offline = off; } }
export const runAt = (i, l) => atLevel(i, l, () => runCost(i));
// 按用量计费的那一份：按请求计费交收到过路费的 15%（开了降成本功能减半），按 token 计费交 25%（token 成本）。各级一览、服务面板都写这一句
export const useFeeTxt = (i, l) => { const s = SQ[i]; if (s.bill !== 'req' && s.bill !== 'token') return ''; const r = s.bill === 'token' ? BAL.token : atLevel(i, l, () => effActive(i, 'cost')) ? BAL.req / 2 : BAL.req; return _tf(2799, "收到过路费交 {$0}%{$1}", +(r * 100).toFixed(1), s.bill === 'token' ? _t(2797, " token 成本") : _t(2798, " 请求费")); };
// 没人买的格子按「当前玩家买下」算（EC2 要看买家的 VPC 开没开私有子网），和买下后第一次交的一致
export function runIfMine(i, f = () => runCost(i)) { const pr = S.props[i]; if (!pr || pr.owner !== null || !S.players) return f(); pr.owner = cur().id; try { return f(); } finally { pr.owner = null; } }
// 某一级的过路费（单块算，不含架构联合收费）：算上流量增长、DLC 加成、容量、整组加倍、「这块过路费再 +20%」（boost）的 ×1.2（有几级 boost 都只乘一次），和实际收的一致
export function rentAt(i, l) {
  const s = SQ[i], pr = S.props[i], b = s.p * BAL.rentBase, full = !!pr && pr.owner !== null && ownsGroup(P(pr.owner), s.g), capM = 1 + 0.25 * ((pr && pr.cap) || 0);
  const mul = pr ? atLevel(i, l, () => trafficMul() * dlcRentMul(i) * (effActive(i, 'boost') ? 1.2 : 1)) : 1;
  if (s.bill === 'token') return { pt: TOKEN[l] * (full ? 1.5 : 1) * capM * mul };
  // 按用量收费的三格：骰子点数 ×（倍数 + 3 × 级别），倍数看主人手上有几块（没人买的按 1 块算）
  if (s.t === 'util') { const o = pr && pr.owner != null ? P(pr.owner) : null, n = o ? Math.max(1, UTILS.filter(u => u === i || active(o, u)).length) : 1; return { pt: ([0, 4, 10, 20][n] + 3 * l) * mul }; }
  const r = (l === 0 ? b * (full ? 2 : 1) : b * [1, 5, 12, 20][l]) * capM * mul;
  return s.bill === 'req' ? { pt: r / 7, v: r } : { v: r };
}
// est：按用量计费的按 7 点估成金额（状态栏用）；不估就写「点数 × 单价」（各级一览用）
export const rentTxt = (i, l, est) => { const x = rentAt(i, l); return x.pt != null && (x.v == null || !est) ? _tf(2800, "骰子点数 × {$0}", +x.pt.toFixed(1)) : x.pt != null ? `≈$${Math.round(x.v)}` : `$${Math.round(x.v)}`; };
// 升一级、加一份容量的说法：各级一览、落地弹窗、资产管理共用一份，几处写的数一样
export const rentUpTxt = (i, l) => { const a = rentAt(i, l - 1), b = rentAt(i, l); return a.pt != null ? _tf(2801, "过路费每点 ${$0} → ${$1}（掷 7 点多收 ${$2}）", +a.pt.toFixed(1), +b.pt.toFixed(1), Math.round((b.pt - a.pt) * 7)) : _tf(2802, "过路费 ${$0} → ${$1}（多收 ${$2}）", Math.round(a.v), Math.round(b.v), Math.round(b.v - a.v)); };
const runUpTxt = (i, l) => { const a = runIfMine(i, () => runAt(i, l - 1)), b = runIfMine(i, () => runAt(i, l)); return a === b ? '' : _tf(2803, "每圈运行费 ${$0} → ${$1}", a, b); };
export function lvUpTxt(i, l, sep = _t(408, "；")) { return [effLabel(i, l), rentUpTxt(i, l), runUpTxt(i, l)].filter(Boolean).join(sep); }
export function capUpTxt(i) {
  const pr = S.props[i], c0 = pr.cap || 0, a = rentAt(i, pr.level), r0 = runCost(i); let b, r1;
  pr.cap = c0 + 1; try { b = rentAt(i, pr.level); r1 = runCost(i); } finally { pr.cap = c0; }
  const rent = a.pt != null ? _tf(2804, "过路费 +25%：每点 ${$0} → ${$1}", +a.pt.toFixed(1), +b.pt.toFixed(1)) : _tf(2805, "过路费 +25%：${$0} → ${$1}", Math.round(a.v), Math.round(b.v));
  return _tf(2807, "{$0}；{$1}", rent, r1 !== r0 ? _tf(2803, "每圈运行费 ${$0} → ${$1}", r0, r1) : _t(2806, "不加运行费"));
}
