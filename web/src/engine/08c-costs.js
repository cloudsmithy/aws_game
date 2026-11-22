import { __rv, _t, _tf } from '../core/01-i18n-runtime.js';
import { BAL, IX, OFFLINE_FEE, SQ } from '../rules/03-services.js';
import { COMBOS, rsCustomers } from '../rules/04-roles-combos-cards.js';
import { dlcRunMul } from '../rules/05-dlc.js';
import { F, P, S, active, debtOf, effActive, hasCombo, ownedBy, owns } from './07-state.js';
import { buyPaid, capPaidSum, upPaidSum } from './09-rent.js';
import { fmtMul } from '../rules/35-modes.js';
export function valBreak(p) {
  let svc = 0, inv = 0;
  ownedBy(p).forEach(i => { const pr = S.props[i]; svc += (p.reseller ? buyPaid(i) : pr.spot ? pr.spotPaid : SQ[i].p) - (pr.offline ? pr.offCash || 0 : 0); inv += upPaidSum(i) + capPaidSum(i); });
  const cash = p.cash - debtOf(p), arch = COMBOS.filter(c => hasCombo(p, c.id)).length * 200 + (p.role === 'rs_cons' && S.players ? rsCustomers(p).length * 100 : 0), debt = p.techDebt * 100, coe = p.coe.filter(t => !t.used).length * 50;
  const net = Math.round(cash + svc + inv);
  return { cash: Math.round(cash), svc: Math.round(svc), inv: Math.round(inv), arch, debt, coe, net, val: Math.round(net + inv + arch - debt + coe) };
}
// 总资产 = 现金 − 欠款 + 服务买价（Spot 按出价，代理商按进货价，下线的扣掉拿走的一半）+ 升级和容量的实际投入
export const netWorth = p => valBreak(p).net;
// 估值（按轮数或时间结束时排名用）= 总资产 + 升级和容量再算一倍 + 每个生效架构 $200 + 每个没用掉的复盘标记 $50 − 每个技术债 $100
export const valuation = p => valBreak(p).val;
export const valTip = p => { const v = valBreak(p); return _tf(2673, "估值 ${$0} = 总资产 ${$1}（现金 ${$2} + 服务 ${$3} + 升级和容量 ${$4}）+ 升级和容量再算一倍 ${$5} + 架构 ${$6} + 复盘 ${$7} − 技术债 ${$8}", v.val, v.net, v.cash, v.svc, v.inv, v.inv, v.arch, v.coe, v.debt); };
// 运行费：按小时计费的服务空着也要交；订阅按圈交；VPC 开了私有子网要交 NAT 网关的钱
// 按用量计费里也有固定月费：存储按 GB 每月收、密钥和托管区域按个每月收、Web ACL 按月收
export let FIXED_FEE = __rv(() => ({ s3: [5, _t(2674, "存储按 GB 每月收费")], efs: [5, _t(2674, "存储按 GB 每月收费")], ecr: [5, _t(2675, "镜像存储按 GB 每月收费")],
  kms: [5, _t(2676, "每把客户托管密钥每月 $1")], route53: [5, _t(2677, "每个托管区域每月收费")], waf: [5, _t(2678, "每个 Web ACL 和规则每月收费")] }), v => { FIXED_FEE = v; }, () => FIXED_FEE);
export function runCost(i, noIp) {
  const s = SQ[i], pr = S.props[i];
  if (s.t !== 'prop') return 0;
  if (pr.offline) return OFFLINE_FEE[s.k] || 0;
  let c = 0;
  if (s.bill === 'hour') c = (s.type === 'paas' || s.k === 'eks' ? BAL.hourHigh : BAL.hourLow)[pr.level];
  else if (s.bill === 'sub') c = 20;   // Shield Advanced 订阅。原来 $40：没升级时收的过路费基本全交了订阅费，15 轮局里买它要 100 多轮才回本
  else if (s.bill === 'bundle') c = 5 + (pr.level >= 1 ? 10 : 0) + (pr.level >= 3 ? 10 : 0);   // Lightsail 套餐按月固定价；负载均衡、托管数据库另外按月收费
  const cap = pr.cap || 0;
  if (s.bill === 'hour') c += cap * (s.type === 'paas' || s.k === 'eks' ? BAL.capHigh : BAL.capLow);
  if (s.bill === 'token') c += cap * 20;   // 预置吞吐量按小时计费
  if (s.bill === 'bundle') c += cap * 5;   // 每多一台实例多一份套餐
  if (s.k === 'vpc' && pr.level >= 1) c += 20;
  // 2024 年 2 月起公网 IPv4 地址按小时收费：EC2 没放进私有子网（主人的 VPC 没开私有子网）就要交；
  // noIp 用来单独算出这笔：Compute Optimizer 降配只改实例规格，IP 费照收
  if (effActive(i, 'cost') && s.bill === 'hour') c = Math.round(c / 2);
  // EventBridge 第 1 级「定时启停 EC2」：主人的 EC2 晚上、周末自动停机，每圈运行费减半（已经用上 Graviton 减过半的不再减）
  else if (s.k === 'ec2' && pr.owner != null && S.props[IX.eventbridge] && S.props[IX.eventbridge].owner === pr.owner && S.players && active(P(pr.owner), IX.eventbridge) && S.props[IX.eventbridge].level >= 1) c = Math.round(c / 2);
  // 公网 IPv4 费在减半之后加：降成本（Graviton、gp3）只让实例本身便宜，IP 照收
  if (!noIp && s.k === 'ec2' && !(pr.owner != null && S.props[IX.vpc] && S.props[IX.vpc].owner === pr.owner && S.props[IX.vpc].level >= 1)) c += 5;
  if (FIXED_FEE[s.k] && !(s.k === 'kms' && pr.level < 1) && !(s.k === 'waf' && pr.owner != null && S.players && hasCombo(P(pr.owner), 'ddos'))) c += FIXED_FEE[s.k][0];   // 「DDoS 防护」：WAF 的标准费用由 Shield Advanced 订阅包了   // KMS：亚马逊云科技托管密钥不收月费，升到客户托管密钥（第 1 级）才收
  c = Math.round(c * dlcRunMul());
  if ((s.k === 'lambda' && pr.level >= 2) || (s.k === 'apigw' && pr.level >= 3)) c += 10;   // Lambda 预置并发、API Gateway 缓存都按小时收费
  return c;
}
// 现实里能用 Savings Plans / 预留实例的服务（ELB、EBS 都不行）
// 现实里有 Spot 的：EC2、Fargate Spot（ECS）、EKS 节点、SageMaker AI 托管 Spot 训练（EMR 也有，11-09 换成了 DMS）
export const SPOT_OK = new Set(['ec2', 'ecs', 'eks', 'sagemaker']);
const SP_OK = new Set(['ec2', 'ecs', 'eks', 'lambda', 'sagemaker', 'rds', 'aurora', 'elasticache', 'opensearch']);   // Compute / SageMaker AI / Database Savings Plans（含 OpenSearch）
export const RI_OK = new Set(['ec2', 'rds', 'aurora', 'elasticache', 'redshift', 'opensearch', 'dms']);   // DMS 复制实例也有预留实例
// 1 圈 = 1 年。Compute / SageMaker AI Savings Plans 有 1 年和 3 年期；Database Savings Plans 只有 1 年期
export const SP_PLANS = { 1: 0.25, 3: 0.45 }, RI_PLANS = { 1: 0.35, 3: 0.55 };
const SP_DB = new Set(['rds', 'aurora', 'elasticache', 'opensearch']);
// RI 跟着人走：服务不在他手上了（卖回、交易、破产分走、被并购、下线时被别人买走）RI 就作废。
// 新买的 RI 在格子上记 pr.ri = 买的人；格子被 resetProp 重置或换过主人就对不上，再买回来也不会复活。老存档的 RI 没有 mark，只看还持不持有
const riValid = (p, c) => owns(p, c.svc) && (!c.mark || S.props[c.svc].ri === p.id);
export const commitsOf = p => (p.commits || []).filter(c => c.laps > 0 && (c.type !== 'ri' || riValid(p, c)));
export const spActive = p => commitsOf(p).find(c => c.type === 'sp');
export const riActive = (p, i) => commitsOf(p).find(c => c.type === 'ri' && c.svc === i);
// Compute Optimizer 真正给降配建议的只有 EC2 实例、EBS 卷、Lambda 内存、RDS / Aurora 实例、跑在 Fargate 上的 ECS 服务；
// ElastiCache、SageMaker AI 端点它只标闲置；跑 ECS 或 EKS 的 Auto Scaling 组拿不到降配建议；ELB、Kinesis、Redshift、OpenSearch 不在支持范围
export let CO_SVCS = __rv(() => (_t(2679, "EC2、EBS、Lambda、RDS、Aurora 和跑在 Fargate 上的 ECS")), v => { CO_SVCS = v; }, () => CO_SVCS);
export const coKind = i => ['ec2', 'ebs', 'lambda', 'rds', 'aurora'].includes(SQ[i].k) || (i === IX.ecs && effActive(i, 'ssh'));
// 下线（停机）的实例没有利用率数据，拿不到建议，存储费照付；Spot 实例它不给降配建议（跑 Spot 的 Auto Scaling 组也一样），照付
export const coRightsize = i => !S.props[i].offline && !S.props[i].spot && coKind(i);
// 一块服务扣掉 RI、再按减半卡打折后要交的运行费；runAfterRI 和 payRun 共用，切给代理商的比例才和实际交的对得上。
// h：'all' 整单减（降价）；'hour' 只减 Compute Optimizer 给降配建议的，公网 IPv4 地址费照付
export function svcRunDue(p, i, h) {
  const ri = riActive(p, i), c = Math.max(0, runCost(i) - (ri ? ri.amt : 0));
  if (h === 'all') return c / 2;
  if (h === 'hour' && coRightsize(i)) { const ip = runCost(i) - runCost(i, true); return Math.max(0, c - ip) / 2 + Math.min(c, ip); }
  return c;
}
// 扣掉 RI 之后每块服务还要交多少：comp = 计算类（EC2、ECS、EKS、Lambda、SageMaker AI），db = 数据库类，other = 用不了 Savings Plans 的
export function runAfterRI(p) {
  let other = 0, comp = 0, db = 0;
  // 运行费减半卡逐块减（扣掉预付的 RI 之后，见 svcRunDue）；Savings Plans 承诺额在 opCost 里照付
  const h = p.halfRunNow;
  ownedBy(p).forEach(i => { const c = svcRunDue(p, i, h); const k = SQ[i].k; if (SP_DB.has(k)) db += c; else if (SP_OK.has(k)) comp += c; else other += c; });
  return { other, comp, db, spBase: comp + db };
}
// 签 n 圈的 Savings Plans 能抵扣的部分：3 圈只有计算类能签（数据库没有 3 年期）
export const spScope = (r, n) => n === 3 ? r.comp : r.comp + r.db;
// Savings Plans：每圈固定付承诺额，按折扣价抵扣符合条件的运行费；用不完不退，超出部分按原价
// 每圈的技术债加价：每个技术债 $20（SaaS $30），开了技术债机制（F.debt()）才收。
// opCost 把它加进总账；交运行费时 passLaunch 单独拿出这份，不分给代理商
export const debtFee = p => p.techDebt * (p.role === 'saas' ? 30 : 20);
export const opCost = p => {
  const r = runAfterRI(p), sp = spActive(p);
  const base = sp ? (sp.scope === 'compute' ? r.comp : r.comp + r.db) : r.spBase;
  const spPart = sp ? sp.amt + Math.max(0, Math.round(base - sp.amt / (1 - sp.d))) : base;
  return Math.round(r.other + (r.spBase - base) + spPart) + (F.debt() ? debtFee(p) : 0);
};
// 抽到省运行费的卡（#3、#11、#43）时按现在的用量估账：写进日志让玩家当场看到这张卡值多少，省不下钱就改领保底。
// billAt：第 k 次（从 0 数）经过 Startup 扶持要交多少，和 passLaunch 同一套算法。h 是那次用的减半卡；
// 到那时已经到期的 Savings Plans / RI 不算（1 年期的 SP 只管下一次），角色技能的减半/全免照乘
export function billAt(p, k, h) {
  const c0 = p.commits, h0 = p.halfRunNow;
  p.commits = (c0 || []).filter(c => c.laps > k); p.halfRunNow = h;
  const v = opCost(p); p.commits = c0; p.halfRunNow = h0;
  return Math.round(v * (p.runLaps > k ? p.runMul : 1));
}
// 手上的减半卡第 k 次经过时还管不管；老存档的 halfRun 是 true、没有 halfLaps，按整单减 1 圈
export const halfAt = (p, k) => !p.halfRun || k >= (p.halfLaps || 1) ? '' : p.halfRun === 'hour' ? 'hour' : 'all';
// 减半卡 h 管接下来 laps 圈，一共少交多少（Savings Plans 承诺额照付、技术债加价不减）
export function halfSave(p, h, laps = 1) {
  if (!h) return 0;
  h = h === 'hour' ? 'hour' : 'all';
  let s = 0; for (let k = 0; k < laps; k++) s += billAt(p, k, '') - billAt(p, k, h);
  return s;
}
export const reqRate = i => SQ[i].bill === 'token' ? BAL.token : SQ[i].bill === 'req' ? (effActive(i, 'cost') ? BAL.req / 2 : BAL.req) : 0;

// （从 ui/11-cards-deeds.js 挪来）
// 卡牌倍率不是 1 时的一句说明。抽卡窗、日志里不再写：卡面上的金额已经按倍率换算好（cardMulTxt），日志里的钱数也是实际金额；只剩技术债大重构的弹窗还用
export const mulNote = () => S && S.cardMul && Math.abs(S.cardMul - 1) > 0.004 ? _tf(2750, "（卡牌金额 {$0}）", fmtMul(S.cardMul)) : '';
