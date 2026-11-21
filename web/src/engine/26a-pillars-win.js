import { __rv, _t, _tf } from '../core/01-i18n-runtime.js';
import { GRP, IX, SQ, haTag } from '../rules/03-services.js';
import { COMBOS } from '../rules/04-roles-combos-cards.js';
import { S, active, cur, effActive, hasCombo, log, nm, ownedBy, winWA } from './07-state.js';
import { gameOver } from './26d-gameover.js';
import { isHell } from '../rules/35-modes.js';
// ================= 胜利 =================
export let PILLARS = __rv(() => ([_t(3627, "卓越运营"), _t(1906, "安全性"), _t(1899, "可靠性"), _t(1905, "性能效率"), _t(1900, "成本优化"), _t(1901, "可持续性")]), v => { PILLARS = v; }, () => PILLARS);
// 六大支柱按「有几处」计分，难度越高要求越高（每一档都用得上这个难度新开的工具）：
// 入门局 / 娱乐模式：每条 1 分；标准局 / 学习模式：每条 1 分，六条加起来 12 分；完整局：每条 2 分；地狱模式：每条 2 分，六条加起来 18 分
const WA_RULE = () => isHell() ? { each: 2, total: 18 } : ({ basic: { each: 1, total: 0 }, std: { each: 1, total: 12 }, full: { each: 2, total: 0 } })[S.cfg.diff] || { each: 1, total: 0 };
export const pillarNeed = () => WA_RULE().each;
export const waTotalNeed = () => WA_RULE().total;
export const SEC_PILLAR = () => [...GRP('sec'), IX.cloudfront];   // 安全支柱算哪些服务：安全组 + CloudFront（边缘挡 DDoS）
export function pillarParts(p) {
  const has = list => list.filter(i => active(p, i));
  const live = ownedBy(p).filter(i => active(p, i));   // 只算在运行的：下线、被 DDoS 打下线的不算持有
  const effList = eff => live.filter(i => effActive(i, eff));
  const ops = has([IX.cloudwatch, IX.cloudtrail, IX.sfn, IX.eventbridge]);
  const secs = has(SEC_PILLAR());
  const maz = effList('maz'), mr = effList('mr'), sc = effList('scale'), co = effList('cost');
  // 天生跨 AZ 的（托管服务、Serverless、全局服务、ECS 默认跨 AZ）每块也算 1 分；实例型要自己升多 AZ，EBS 永远单 AZ 不算
  const nat = live.filter(i => { const h = haTag(i); return h && (h.k === 'auto' || h.k === 'glb'); });
  const combos = COMBOS.filter(c => hasCombo(p, c.id));
  const sls = live.filter(i => SQ[i].type === 'sls');
  const grav = active(p, IX.ec2) && effActive(IX.ec2, 'cost');
  // 可持续性（Well-Architected 第六支柱）：按需扩缩、数据分层、交给托管服务都算；Spot 只是买得便宜，不算
  const lifecycle = [IX.s3, IX.efs, IX.opensearch, IX.ebs].filter(i => active(p, i) && effActive(i, 'cost'));
  const managedCompute = [IX.ecs, IX.eks].filter(i => active(p, i) && effActive(i, 'ssh'));
  const commit = p.usedCommit || p.cards.some(x => x.used && (x.id === 'SP' || x.id === 'CE'));
  const score = [
    ops.length + (p.coe.length ? 1 : 0),
    secs.length + p.drill.length,
    nat.length + maz.length + mr.length * 2,
    sc.length + combos.length,
    (p.refactored ? 1 : 0) + (commit ? 1 : 0) + co.length,
    sls.length + (grav ? 1 : 0) + lifecycle.length + managedCompute.length,
  ];
  return { ops, secs, nat, maz, mr, sc, co, combos, sls, grav, commit, lifecycle, managedCompute, score };
}
export const pillarScore = p => pillarParts(p).score;
export function pillars(p) { const need = pillarNeed(); return pillarScore(p).map(v => v >= need); }
export const pillarTotal = p => pillarScore(p).reduce((a, v) => a + v, 0);
export const waDone = p => pillars(p).every(Boolean) && pillarTotal(p) >= waTotalNeed();
export const waRuleText = () => { const r = WA_RULE(); return _tf(3629, "每条至少 {$0} 分{$1}", r.each, r.total ? _tf(3628, "，六条加起来 {$0} 分", r.total) : ''); };
export function pillarWhy(p) {
  const names = list => list.map(i => SQ[i].n).join(_t(349, "、"));
  const x = pillarParts(p), need = pillarNeed();
  const got = [
    [x.ops.length && names(x.ops), p.coe.length && _tf(3630, "写过 {$0} 次复盘", p.coe.length)],
    [x.secs.length && names(x.secs), p.drill.length && _tf(3631, "{$0} 个演练标记", p.drill.length)],
    [x.nat.length && _tf(2633, "{$0} 天生跨 AZ", names(x.nat)), x.maz.length && _tf(2634, "{$0} 升了多 AZ", names(x.maz)), x.mr.length && _tf(3632, "{$0} 有多区域功能（每处 2 分）", names(x.mr))],
    [x.sc.length && _tf(3633, "{$0} 有弹性扩展功能", names(x.sc)), x.combos.length && _tf(3634, "生效的架构：{$0}", x.combos.map(c => c.n).join(_t(349, "、")))],
    [p.refactored && _t(3635, "重构清过技术债"), x.commit && _t(3636, "签过 Savings Plans / RI 或用过 Cost Explorer"), x.co.length && _tf(3637, "{$0} 有降成本功能", names(x.co))],
    [x.sls.length && _tf(3638, "Serverless：{$0}", names(x.sls)), x.grav && _t(3639, "EC2 用上了 Graviton"), x.lifecycle.length && _tf(3640, "{$0} 开了数据分层或省资源的存储", names(x.lifecycle)), x.managedCompute.length && _tf(3641, "{$0} 交给亚马逊云科技管底层机器", names(x.managedCompute))],
  ];
  return x.score.map((v, k) => _tf(3644, "{$0}/{$1} 分{$2}{$3}", v, need, v >= need ? _t(3642, "，已达成") : _tf(3643, "，还差 {$0} 分", need - v), got[k].some(Boolean) ? _t(2670, "：") + got[k].filter(Boolean).join(_t(408, "；")) : ''));
}
// 六大支柱胜利：谁先做到谁直接赢，不等他自己的回合结束。以前只在「轮到下一位」时查当前玩家，
// 别人回合里靠交易、卡牌凑齐的（尤其是掉线、由房主代打的座位）要等到他自己的回合打完才算，回合没人打完就一直不出赢家。同时达成的先算当前玩家
// 六大支柱哪条刚达标、哪条掉回去了：写进日志（开了支柱胜利才写）。每做完一步（checkOver）和轮到下一位时比一次。
// 老存档第一次比、又不在第 1 轮的，先只记下现在的样子，不把早就达标的一口气全写出来
export function pillarLog() {
  if (!winWA() || !S || !S.players || S.over) return;
  const fresh = !S.pillarSeen, seen = S.pillarSeen = S.pillarSeen || {}, need = pillarNeed(), tn = waTotalNeed();
  S.players.forEach(q => {
    if (!q.alive) return;
    const sc = pillarScore(q), ok = sc.map(v => v >= need), prev = seen[q.id] || (fresh && S.round > 1 ? ok : ok.map(() => false));
    const n = ok.filter(Boolean).length, rest = PILLARS.filter((_, k) => !ok[k]), tot = pillarTotal(q);
    const up = PILLARS.filter((_, k) => ok[k] && !prev[k]), down = PILLARS.filter((_, k) => !ok[k] && prev[k]);
    if (up.length) log(_tf(3646, "🏛 {$0} 的六大支柱「{$1}」达标了：{$2}/6 条，总分 {$3}{$4}", nm(q), up.join(_t(3645, "」「")), n, tot, tn ? `/${tn}` : ''));
    if (down.length) log(_tf(3647, "{$0} 的六大支柱「{$1}」掉回去了：{$2}/6 条", nm(q), down.join(_t(3645, "」「")), n));
    seen[q.id] = ok;
  });
}
export const waWinner = () => { if (!winWA()) return null; const c = cur(); return [c, ...S.players.filter(q => q !== c)].find(q => q && q.alive && waDone(q)) || null; };
export function checkOver() {
  if (S.over) return true;
  const alive = S.players.filter(q => q.alive);
  if (alive.length <= 1) { gameOver(alive[0], _t(3648, "其他玩家都被暂停了账户"), 'last'); return true; }
  pillarLog();
  const wa = waWinner(); if (wa) { gameOver(wa, _t(2930, "六大支柱全部达成"), 'wa'); return true; }
  return false;
}
