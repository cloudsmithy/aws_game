import { __rv, _t, _tf } from '../core/01-i18n-runtime.js';
import { SIM, SIM_AI, rnd, waitAnim } from '../core/02-util.js';
import { UI } from '../core/02b-ui-port.js';
import { IX, N, OWNABLE, SQ, isInst, lvFull, lvName } from './03-services.js';
import { COMBOS, comboOpen, rsBuyRate, rsCustomers, rsRate, rsSold, slotOpen, viaOf } from './04-roles-combos-cards.js';
import { askQuestion, pickQuestion, qPoolS } from './06-qbank.js';
import { P, S, active, comboMiss, comboOn, effActive, hasCombo, isWild, log, nm, ownedBy, owns, sqn, wildFits, wildOf } from '../engine/07-state.js';
import { cardAmt, credit, pay } from '../engine/08-money.js';
import { CO_SVCS, halfSave } from '../engine/08c-costs.js';
import { baseRent, handOver, sellProp, sellValue, upgradeInfo, zhe } from '../engine/09-rent.js';
import { moveSteps, passStart, passUG } from '../engine/13-move.js';
import { land } from '../engine/15-land.js';
import { debtCleared, impair, secActive, skipOrPay } from '../engine/17-health.js';
import { moneyOrMove } from '../engine/18-reinvent.js';
import { wildBind } from '../engine/21-skills.js';
import { ST } from '../engine/26b-retro.js';
import { isHidden, withCardMul } from './35-modes.js';
import { isAI } from '../engine/36-ai.js';
import { MP } from '../net/40-host-sync.js';
import { fxCast } from '../net/41-replay.js';
// ================= DLC 扩展包（开局页勾选，每个包带自己的规则、卡牌和题目） =================
export let DLC = __rv(() => ({
  genai: { n: _t(1496, "GenAI 浪潮"), d: _t(1497, "AI 组过路费 ×1.5；多 2 张 Health 卡、3 张 re:Invent 卡、6 道 AI 题"), icon: 'bedrock' },
  sec: { n: _t(1498, "安全攻防"), d: _t(1499, "FIS 攻击打 8 折；安全组过路费 ×1.3；多 3 张 Health 卡、2 张 re:Invent 卡、4 道安全题"), icon: 'guardduty' },
  finops: { n: _t(1500, "FinOps 账单大战"), d: _t(1501, "所有运行费 ×1.5；任何难度都能签 Savings Plans / RI；多 2 张 Health 卡、2 张 re:Invent 卡、4 道成本题"), icon: 'costexplorer' },
  global: { n: _t(1502, "全球出海"), d: _t(1503, "有多区域功能的服务过路费再 +30%；多 2 张 Health 卡、2 张 re:Invent 卡、4 道全球化题"), icon: 'region' },
  inc26: { n: _t(5312, "Health 事件扩展包（2026）"), d: _t(5313, "多 10 张 Health 卡：Lambda 并发被打满、NAT 网关处理费、KMS 密钥待删除、IAM 权限 *:*、EBS 快照越积越多、重试风暴、定时任务时区、唯一懂 Kubernetes 的人离职、Docker Hub 限流，还有全场的黑色星期五大促；每张都写了真实的技术原因，对口的升级或服务能免疫"), icon: 'health' },
  reseller: { n: _t(1504, "代理商模式"), d: _t(1505, "开局可以把座位设成代理商（最多一半）：代理商落在空地上按进货价 5 折（地狱 7 折）占地，自己的地只在组成有效架构时收过路费、架构 ×2（地狱模式正常收）；客户落在代理商的地上可以按转售价从他手里买走，组成架构、集齐整组、升过级的不卖；买走后运行费交给代理商，代理商赚差价。代理商开局资金 = 所有客户的总和，有轮数上限时是角色卡加每位客户 $300（娱乐、地狱模式只按角色卡）"), icon: 'billing' },
  speed: { n: _t(1506, "高速部署"), d: _t(1507, "部署点数 0–12：每回合 +1，被事件打中 −2、进维护窗口 −4；花 1–12 点发动 12 种技能：6 点 DDoS 让对手一块服务 Impaired，12 点直接打下线 2 回合；也能逼对手抽 Health 卡、扛住没做高可用的故障"), icon: 'codedeploy' },
}), v => { DLC = v; }, () => DLC);
export const dlcOn = k => !!(S && S.cfg && (S.cfg.dlc || []).includes(k));
// DLC 对过路费和运行费的加成
export function dlcRentMul(i) {
  const s = SQ[i]; let m = 1;
  if (dlcOn('genai') && s.g === 'ai') m *= 1.5;
  if (dlcOn('sec') && s.g === 'sec') m *= 1.3;
  if (dlcOn('global') && effActive(i, 'mr')) m *= 1.3;
  return m;
}
export const dlcRunMul = () => dlcOn('finops') ? 1.5 : 1;
export const fisCost = x => Math.round(x.cost * (dlcOn('sec') ? 0.8 : 1));
// hits：这张卡对这个人会不会真的有动静（不写 = 会）。返回 false 的，incident 不弹「要抵消吗」、发牌也不推迟到抵消窗，直接走 run（run 自己记一笔「不受影响」、返回 'nopen'）
const rsVia = p => ownedBy(p).filter(i => S.props[i].via != null && P(S.props[i].via).alive);
const auditN = p => p.reseller ? S.players.reduce((a, q) => a + (q.id === p.id ? 0 : viaOf(p, q).length), 0) : ownedBy(p).filter(i => S.props[i].via != null).length;
const idleInst = p => ownedBy(p).filter(i => isInst(i) && !S.props[i].level && !S.props[i].offline);   // 下线的已经不跑了，不收钱
const topMr = p => ownedBy(p).filter(i => effActive(i, 'mr') && SQ[i].upg[S.props[i].level - 1] && SQ[i].upg[S.props[i].level - 1][2] === 'mr');
// 「前进到某一格」：已经站在那一格上（技能抽卡、经过起点送的卡）就往前绕一整圈，经过起点、UG 照常结算；moveTo 走 0 步会原地再结算一次落点
export const advanceTo = (p, t) => moveSteps(p, ((t - p.pos + N) % N) || N);
const hijackTo = p => S.players.filter(q => q.alive && q.id !== p.id && q.jail === null);
// 只给 DLC 的卡挂 run：Health 卡 run 返回 'nopen' 表示这次不算罚；imm 返回免疫原因
export let DLC_INC = __rv(() => ([
  { dlc: 'reseller', n: _t(1508, "代理商涨价"), c: 'cost', e: _t(1509, "所有代理商的转售价上调一档（最多到原价）；你从代理商手里买的服务，每块补交 $20 差价给对应的代理商"), im: _t(1510, "你自己就是代理商"), tip: _t(1511, "经代理商采购的价格写在合同里，续约时可能调价；多比几家、签长期合同能锁住价格"), art: 'billing',
    imm: o => o.reseller ? _t(1510, "你自己就是代理商") : '', hits: p => rsVia(p).length > 0, run: async p => {
      const steps = [0.45, 0.5, 0.55, 0.6, 0.7, 0.8, 0.9, 1];
      S.players.filter(r => r.alive && r.reseller).forEach(r => { const cur0 = rsRate(r), nx = steps.find(x => x > cur0 + 1e-9) || 1; r.rsRate = nx; log(_tf(1513, "{$0} 的转售价涨到 {$1}", nm(r), nx === 1 ? _t(1512, "原价") : zhe(nx))); });
      const mine = rsVia(p);
      if (!mine.length) { log(_tf(1514, "{$0} 没有从代理商手里买的服务，不用补差价", nm(p))); return 'nopen'; }
      mine.forEach(i => pay(p, P(S.props[i].via), 20)); log(_tf(1515, "{$0} 为 {$1} 块从代理商手里买的服务补交差价 ${$2}", nm(p), mine.length, cardAmt(20) * mine.length));
    } },
  { dlc: 'reseller', n: _t(1516, "渠道合规审计"), c: 'cost', e: _t(1517, "代理商：客户从你手里买的服务每块交 $40；客户：你从代理商手里买的服务每块交 $20；都交进奖池。跟代理商没有往来的不受影响"), im: _t(708, "无"), tip: _t(1518, "代理商可以用 Billing Conductor 按客户分组出账，每一笔转售都对得上，审计时说得清"), art: 'cloudtrail',
    imm: o => '', hits: p => auditN(p) > 0, run: async p => {
      const n = auditN(p);
      if (!n) { log(_tf(1519, "{$0} 跟代理商没有往来，不受影响", nm(p))); return 'nopen'; }
      const x = (p.reseller ? 40 : 20) * n; log(_tf(1520, "{$0} 为 {$1} 块从代理商手里买的服务交审计费 ${$2}", nm(p), n, pay(p, 'pot', x)));
    } },
  { dlc: 'reseller', n: _t(1521, "代理合同到期没续"), c: 'ops', e: _t(1522, "客户：你从代理商手里买的服务都改成直接向亚马逊云科技付费；代理商：从你手里买得最多的那位客户和你断开代理关系"), im: _t(708, "无"), tip: _t(1523, "代理合同到期前要提前续签，不然账单会直接回到亚马逊云科技"), art: 'billing',
    hits: p => p.reseller ? rsCustomers(p).length > 0 : ownedBy(p).some(i => S.props[i].via != null), run: async p => {
      if (p.reseller) {
        const cs = rsCustomers(p).sort((a, b) => viaOf(p, b).length - viaOf(p, a).length);
        if (!cs.length) { log(_tf(1524, "{$0} 还没有客户", nm(p))); return 'nopen'; }
        viaOf(p, cs[0]).forEach(i => { S.props[i].via = null; }); log(_tf(1525, "{$0} 不再经 {$1} 付费，改成直接交给亚马逊云科技", nm(cs[0]), nm(p))); return;
      }
      const mine = ownedBy(p).filter(i => S.props[i].via != null);
      if (!mine.length) { log(_tf(1526, "{$0} 没有从代理商手里买的服务", nm(p))); return 'nopen'; }
      mine.forEach(i => { S.props[i].via = null; }); log(_tf(1527, "{$0} 的 {$1} 改成直接向亚马逊云科技付费", nm(p), mine.map(sqn).join(_t(349, "、")))); return 'nopen';
    } },
  { dlc: 'genai', n: _t(1528, "提示词注入攻击"), c: 'sec', e: _t(1529, "有人用恶意提示词让你的 AI 应用泄露数据：交 $120 进奖池；有 WAF 的减半，交 $60"), im: _t(1530, "没有 Bedrock"), tip: _t(1531, "WAF 按规则匹配请求，能限速、拦已知的恶意来源，挡不住换个说法的提示词；对口的是 Bedrock Guardrails 的提示词攻击过滤，再配敏感信息过滤防泄露"), art: 'bedrock',
    imm: o => !owns(o, IX.bedrock) ? _t(1530, "没有 Bedrock") : '', run: async p => { const w = active(p, IX.waf); log(_tf(1533, "{$0} 交 ${$1}{$2}", nm(p), pay(p, 'pot', w ? 60 : 120), w ? _t(1532, "（WAF 拦掉了一部分恶意请求，减半）") : '')); } },
  { dlc: 'genai', n: _t(1534, "GPU 容量不够用"), c: 'avail', e: _t(1535, "训练任务排不上队：你的 SageMaker AI 变成 Impaired"), im: _t(1536, "SageMaker AI 升了多卡训练（GPU 已用训练计划预留好）"), tip: _t(1537, "大模型训练要提前用 SageMaker 训练计划预留 GPU，训练任务和 HyperPod 集群都能用；Bedrock 的跨区域推理只分流推理请求，管不到训练"), art: 'sagemaker',
    imm: o => !owns(o, IX.sagemaker) ? _t(1538, "没有 SageMaker AI") : S.props[IX.sagemaker].level >= 2 ? _t(1539, "SageMaker AI 有多卡训练（GPU 已预留）") : '', run: async p => { impair([IX.sagemaker]); log(_tf(1540, "{$0} 变成 Impaired", sqn(IX.sagemaker))); } },
  { dlc: 'sec', n: _t(1541, "勒索软件加密了数据"), c: 'sec', e: _t(1542, "交 $200 进奖池恢复数据"), im: _t(1543, "持有「防勒索备份」架构（快照和对象都锁着，攻击者删不掉）"), tip: _t(1544, "EBS 快照锁定、S3 对象锁定的合规模式，到期前连 root 用户都删不掉；再把快照复制到另一个账户，主账户被攻破也不怕"), art: 'ebs',
    imm: o => hasCombo(o, 'cleanbak') ? _t(1545, "有「防勒索备份」架构") : '', run: async p => { log(_tf(1546, "{$0} 交 ${$1} 恢复数据", nm(p), pay(p, 'pot', 200))); } },
  { dlc: 'sec', n: _t(1547, "员工的访问密钥被盗用"), c: 'sec', e: _t(1548, "攻击者用泄露的密钥开机挖矿：停一轮清理，或者交 $80 立刻吊销密钥、继续走"), im: _t(1549, "持有「威胁自动响应」架构；只有 GuardDuty 时改为交 $50 进奖池，不用停"), tip: _t(1550, "用 IAM Identity Center 发临时凭证，别用长期访问密钥；GuardDuty 能发现被盗用的凭证，吊销密钥还得人或自动化来做；CloudTrail 只负责记录调用"), art: 'iam',
    // GuardDuty 只发现、CloudTrail 只记录，都不会吊销密钥，不算免疫；吊销靠自动响应（「威胁自动响应」架构）。
    // 只有 GuardDuty 时跟 #6、#19 一样减损：交 $50、不停、不记技术债（返回 'nopen'）；放在抵消窗之后，有抵消卡的人照样先问
    imm: o => hasCombo(o, 'soar') ? _t(1551, "有「威胁自动响应」架构，自动吊销了密钥") : '', run: async p => { if (active(p, IX.guardduty)) { log(_tf(1552, "{$0} 的 GuardDuty 发现异常 API 调用，及时吊销了密钥：交 ${$1}，不用停", nm(p), pay(p, 'pot', 50))); return 'nopen'; } await skipOrPay(p, _t(1553, "访问密钥被盗用"), 80, _t(1554, "立刻吊销密钥")); } },
  { dlc: 'sec', n: _t(1555, "接口被恶意刷爆"), c: 'sec', e: _t(1556, "交 $100 进奖池"), im: _t(1557, "WAF 升了限速规则，或 API Gateway 升了使用计划限流"), tip: _t(1558, "WAF 限速规则按来源 IP（也可以按请求头等）统计请求数，超了就拦；API Gateway 使用计划按 API 密钥限流"), art: 'waf',
    // 刷接口要靠限速规则按 IP 拦，WAF 只开托管规则挡不住
    imm: o => active(o, IX.waf) && effActive(IX.waf, 'ddos') ? _t(1559, "WAF 有限速规则") : owns(o, IX.apigw) && S.props[IX.apigw].level >= 1 ? _t(1560, "API Gateway 有限流") : '', run: async p => { log(_tf(1561, "{$0} 交 ${$1}", nm(p), pay(p, 'pot', 100))); } },
  { dlc: 'finops', n: _t(1562, "测试环境忘了删"), c: 'cost', e: _t(1563, "你名下每块没升级的实例型服务交 $30 进奖池"), im: _t(5269, "用过 Cost Explorer 卡（开了成本异常检测），或者 EventBridge 升了「定时启停 EC2」"), tip: _t(1565, "给测试资源打标签，用 Budgets 和成本异常检测发现没人管的资源；Savings Plans 只是承诺用量换折扣，忘了删的实例照样计费"), art: 'budgets',
    // Savings Plans 按承诺额给折扣，不会发现也不会关掉没人管的资源，不算免疫；只认开了成本异常检测（用过 CE 卡），和「跨区流量费暴涨」一样
    imm: o => o.cards.some(x => x.id === 'CE' && x.used) ? _t(1566, "开了成本异常检测") : active(o, IX.eventbridge) && S.props[IX.eventbridge].level >= 1 ? _t(1567, "EventBridge 定时把测试环境关了") : '', hits: p => idleInst(p).length > 0, run: async p => { const hit = idleInst(p); if (!hit.length) { log(_tf(1568, "{$0} 没有闲置的实例", nm(p))); return 'nopen'; } log(_tf(1569, "{$0} 为 {$1} 交 ${$2}", nm(p), hit.map(sqn).join(_t(349, "、")), pay(p, 'pot', 30 * hit.length))); } },
  { dlc: 'finops', n: _t(1570, "跨区流量费暴涨"), c: 'cost', e: _t(1571, "你名下每块有多区域功能的服务交 $40 进奖池"), im: _t(1572, "用过 Cost Explorer 卡（开了成本异常检测，流量费一涨就收到提醒）"), tip: _t(1573, "跨 Region 复制、跨 AZ 访问都按 GB 收费；VPC 终端节点省的是 NAT 网关的处理费，跨 Region 的流量照样收，规划架构时要算进去"), art: 'billing',
    imm: o => o.cards.some(x => x.id === 'CE' && x.used) ? _t(1566, "开了成本异常检测") : '', hits: p => ownedBy(p).some(i => effActive(i, 'mr')), run: async p => { const hit = ownedBy(p).filter(i => effActive(i, 'mr')); if (!hit.length) { log(_tf(1574, "{$0} 没有多区域服务", nm(p))); return 'nopen'; } log(_tf(1561, "{$0} 交 ${$1}", nm(p), pay(p, 'pot', 40 * hit.length))); } },
  { dlc: 'global', n: _t(1575, "海外用户访问太慢"), c: 'avail', e: _t(1576, "用户流失：交 $100 进奖池"), im: _t(1577, "持有 CloudFront"), tip: _t(1578, "CloudFront 把内容缓存到全球边缘节点，Global Accelerator 走亚马逊云科技骨干网"), art: 'cloudfront',
    imm: o => active(o, IX.cloudfront) ? _t(1579, "有 CloudFront") : '', run: async p => { log(_tf(1561, "{$0} 交 ${$1}", nm(p), pay(p, 'pot', 100))); } },
  { dlc: 'global', n: _t(1580, "当地要求数据本地存储"), c: 'ops', e: _t(1581, "你名下最高一级是「多区域」的服务，各降一级重新规划（不退钱）"), im: _t(1582, "持有 KMS，且没升到「多区域密钥」"), tip: _t(1583, "出海前先确认当地的数据合规要求，再决定数据放哪个 Region；单区域密钥加密的数据只能在本 Region 解密，多区域密钥会把密钥材料复制到别的 Region"), art: 'region',
    // 官方说用单区域密钥能守住数据驻留，多区域密钥会把密钥材料复制出本 Region、让驻留合规更复杂：升到第 3 级就不再免疫，会和别的多区域功能一起去掉一级，降回第 2 级以后再抽到又免疫
    imm: o => active(o, IX.kms) && !effActive(IX.kms, 'mr') ? _t(1584, "KMS 只用单区域密钥") : '', hits: p => topMr(p).length > 0, run: async p => { const h2 = topMr(p); if (!h2.length) { log(_tf(1585, "{$0} 没受影响", nm(p))); return 'nopen'; } h2.forEach(i => { S.props[i].level--; if (S.props[i].upPaid) S.props[i].upPaid.length = S.props[i].level; }); log(_tf(1586, "{$0} 去掉了多区域那一级", h2.map(sqn).join(_t(349, "、")))); } },
]), v => { DLC_INC = v; }, () => DLC_INC);
export let DLC_REI = __rv(() => ([
  { dlc: 'reseller', n: _t(1587, "Startup 拿到代理商折扣"), e: _t(1588, "保留到下一次买服务：从代理商手里买再打 8 折；场上没有代理商的话，下一次按需购买打 9 折"), tip: _t(1589, "很多代理商给初创公司额外折扣和 Credits，换长期合作"), art: 'activate',
    run: async p => { if (!p.reseller && S.players.some(r => r.alive && r.reseller && r.id !== p.id)) { p.rsCoupon = 0.8; log(_tf(1590, "{$0} 拿到代理商折扣：下一次从代理商手里买服务再打 8 折", nm(p))); } else { p.buyCoupon = 0.9; log(_tf(1591, "{$0} 拿到购买折扣：下一次按需买服务打 9 折", nm(p))); } } },
  { dlc: 'reseller', n: _t(1592, "代理商批量拿地"), e: _t(1593, "代理商：可以按进货价买下任意一块没人买的服务（钱不够就不买）；客户：领 $100"), tip: _t(1594, "代理商批量采购拿到更低的进货价，再转售给客户"), art: 'billing',
    run: async p => {
      if (!p.reseller) { log(_tf(1595, "{$0} 是客户，领 ${$1}", nm(p), credit(p, 100))); return; }
      const c = OWNABLE.filter(i => S.props[i].owner === null && SQ[i].t === 'prop' && !isHidden(i)).map(i => ({ i, x: Math.round(SQ[i].p * rsBuyRate(p)) })).filter(o => o.x <= p.cash).sort((a, b) => SQ[b.i].p - SQ[a.i].p);
      if (!c.length) { log(_tf(1596, "{$0} 现金不够，这次没拿地", nm(p))); return; }
      const v = await UI.ask({ who: p.id, cls: 'pick', title: _t(1597, "代理商批量拿地：按进货价买哪一块？"), buttons: [...c.slice(0, 12).map(o => ({ label: _tf(1598, "{$0}（原价 ${$1}，进货价 ${$2}）", SQ[o.i].n, SQ[o.i].p, o.x), value: o.i })), { label: _t(1599, "不买"), value: 'x' }] });
      if (v === 'x') return;
      const o = c.find(z => z.i === +v); await withCardMul(0, async () => pay(p, 'bank', o.x)); S.props[o.i].owner = p.id; S.props[o.i].paid = o.x; ST(p).spendBuy = (ST(p).spendBuy || 0) + o.x;
      log(_tf(1600, "🏷️ {$0} 按进货价 ${$1} 拿下 {$2}", nm(p), o.x, sqn(o.i)));
    } },
  { dlc: 'reseller', n: _t(1601, "代理商清仓"), e: _t(1602, "代理商：把你没组成有效架构的服务里最便宜的一块卖回亚马逊云科技（按卖回价）；客户：可以按原价 7 折从代理商手里买下一块他没组成架构的服务（连同升级），钱付给代理商，代理商手上没有这样的服务就改领 $100"), tip: _t(1603, "代理商手上积压的资源会打折转给客户，客户能捡便宜"), art: 'trustedadvisor',
    run: async p => {
      const loose = r => ownedBy(r).filter(i => ['prop', 'util'].includes(SQ[i].t) && !comboOn(r, i).length && !S.props[i].offline);
      if (p.reseller) {
        const c = loose(p).sort((a, b) => sellValue(a) - sellValue(b));
        if (!c.length) { log(_tf(1604, "{$0} 手上没有积压的服务", nm(p))); return; }
        await withCardMul(0, async () => sellProp(p, c[0])); return;
      }
      const offer = S.players.filter(r => r.alive && r.reseller && r.id !== p.id).flatMap(r => loose(r).map(i => ({ r, i, x: Math.round(SQ[i].p * 0.7) })));
      if (!offer.length) { log(_tf(1605, "代理商手上没有积压的服务，{$0} 改领 ${$1}", nm(p), credit(p, 100))); return; }
      const v = await UI.ask({ who: p.id, cls: 'pick', title: _t(1606, "代理商清仓：按原价 7 折买哪一块？"), buttons: [...offer.slice(0, 12).map((o, k) => ({ label: _tf(1607, "{$0} 的 {$1}（${$2}）", o.r.name, SQ[o.i].n, o.x), value: k, disabled: p.cash < o.x })), { label: _t(1599, "不买"), value: 'x', cls: 'pri' }] });
      if (v === 'x') return;
      const o = offer[+v], pr = S.props[o.i]; await withCardMul(0, async () => pay(p, o.r, o.x)); handOver(o.r, o.i, p); rsSold(o.r, p); pr.paid = o.x; pr.spot = false; pr.spotPaid = 0;
      log(_tf(1608, "{$0} 按 7 折 ${$1} 从代理商 {$2} 手里买下 {$3}（连同升级）", nm(p), o.x, nm(o.r), sqn(o.i)));
    } },
  { dlc: 'reseller', n: _t(1609, "升级为高级合作伙伴"), e: _t(1610, "代理商：每有一位客户领 $150（没有客户也领 $150）；客户：领 $100"), tip: _t(1611, "合作伙伴等级越高，拿到的折扣、市场资金和技术支持越多"), art: 'wat',
    run: async (p, others, card) => { if (p.reseller) { const n = Math.max(1, rsCustomers(p).length); await moneyOrMove(p, card, 150 * n, got => log(_tf(1612, "{$0} 升级为高级合作伙伴，领 ${$1}", nm(p), got))); } else await moneyOrMove(p, card, 100, got => log(_tf(1595, "{$0} 是客户，领 ${$1}", nm(p), got))); } },
  { dlc: 'reseller', n: _t(1613, "Marketplace 联合销售"), e: _t(1614, "代理商：免费拿下没人买、原价不超过 $300 的服务里最贵的一块；没有的话领 $200。客户：领 $100"), tip: _t(1615, "通过亚马逊云科技 Marketplace 的渠道合作伙伴私有报价，代理商可以替客户采购第三方软件"), art: 'activate',
    run: async p => {
      if (!p.reseller) { log(_tf(1595, "{$0} 是客户，领 ${$1}", nm(p), credit(p, 100))); return; }
      const c = OWNABLE.filter(i => S.props[i].owner === null && SQ[i].t === 'prop' && SQ[i].p <= 300 && !isHidden(i)).sort((a, b) => SQ[b].p - SQ[a].p);
      if (!c.length) { log(_tf(1616, "没有原价 $300 以内没人买的服务，{$0} 改领 ${$1}", nm(p), credit(p, 200))); return; }
      S.props[c[0]].owner = p.id; S.props[c[0]].paid = 0; log(_tf(1617, "{$0} 通过 Marketplace 联合销售拿下 {$1}", nm(p), sqn(c[0])));
    } },
  { dlc: 'reseller', n: _t(1618, "渠道激励计划"), e: _t(1619, "每位代理商从亚马逊云科技领 $200；抽到的人是客户的话，自己领 $100"), tip: _t(1620, "亚马逊云科技会给渠道伙伴发激励，鼓励他们帮客户上云"), art: 'costexplorer',
    run: async p => { const rs = S.players.filter(q => q.alive && q.reseller); rs.forEach(q => credit(q, 200)); if (rs.length) log(_tf(1621, "每位代理商领到 ${$0} 渠道激励", cardAmt(200))); if (!p.reseller) log(_tf(1595, "{$0} 是客户，领 ${$1}", nm(p), credit(p, 100))); } },
  // Bedrock 第 3 级是跨区域推理，不是新模型，所以只在 Nova Lite、Nova Pro 这两档里换
  { dlc: 'genai', n: _t(1622, "Bedrock 上了新模型"), e: _t(1623, "你的 Bedrock 还没用上 Nova Pro 的，免费换下一档模型；已经用上或没有 Bedrock 的，领 $100"), tip: _t(1624, "Bedrock 上的模型会持续更新，换模型只要改模型 ID"), art: 'bedrock',
    run: async p => { const pr = S.props[IX.bedrock], mine = owns(p, IX.bedrock); if (mine && pr.level < 2 && upgradeInfo(p, IX.bedrock, true).ok) { pr.level++; (pr.upPaid = pr.upPaid || [])[pr.level - 1] = 0; log(_tf(1625, "🔧 {$0} 免费给 {$1} 换上「{$2}」", nm(p), sqn(IX.bedrock), lvName(IX.bedrock, pr.level))); } else log(_tf(1628, "{$0} {$1}，领 ${$2}", nm(p), mine && pr.level >= 2 ? _tf(1626, "的 {$0} 已经用上 Nova Pro", sqn(IX.bedrock)) : _t(1627, "没有能换模型的 Bedrock"), credit(p, 100))); } },
  { dlc: 'genai', n: _t(1629, "拿到生成式 AI 创新中心支持"), e: _t(1630, "从亚马逊云科技领 $100；你名下每块 AI 组的服务（Bedrock、SageMaker AI 等），再领 $50"), tip: _t(1631, "亚马逊云科技生成式 AI 创新中心会派专家帮客户做 GenAI 落地"), art: 'activate', run: async (p, others, card) => { const ai = ownedBy(p).filter(i => SQ[i].g === 'ai' && active(p, i)); await moneyOrMove(p, card, 100 + 50 * ai.length, got => log(_tf(1633, "{$0} {$1}领 ${$2}", nm(p), ai.length ? _tf(1632, "有 {$0}，", ai.map(sqn).join(_t(349, "、"))) : '', got))); } },
  { dlc: 'genai', n: _t(1634, "AI Agent 上线"), e: _t(1635, "前进到 Lambda；没人买可以打 8 折买"), tip: _t(1636, "Agent 常把 Lambda 函数当工具，让模型调用你的业务接口；Bedrock AgentCore Gateway 能把现有的 API 和 Lambda 函数转成 Agent 可调用的 MCP 工具"), art: 'lambda', run: async p => { await advanceTo(p, IX.lambda); await land(p, { discount: 0.8 }); } },
  { dlc: 'sec', n: _t(1637, "通过了安全合规审计"), e: _t(1638, "持有 2 块以上安全组服务领 $150，否则领 $50"), tip: _t(1639, "Artifact 里可以下载亚马逊云科技的合规报告"), art: 'securityhub', run: async (p, others, card) => { await moneyOrMove(p, card, secActive(p, 'sec') >= 2 ? 150 : 50, got => log(_tf(1640, "{$0} 领 ${$1}", nm(p), got))); } },
  { dlc: 'sec', n: _t(1641, "Security Hub CSPM 全绿"), e: _t(1642, "清掉 1 个技术债；没有技术债就领 $80"), tip: _t(1643, "Security Hub CSPM 按安全标准持续检查配置"), art: 'securityhub', run: async p => { if (p.techDebt > 0) { p.techDebt--; p.refactored = true; log(_tf(1644, "{$0} 清掉 1 个技术债", nm(p))); debtCleared(p); } else log(_tf(1645, "{$0} 没有技术债，领 ${$1}", nm(p), credit(p, 80))); } },
  { dlc: 'finops', n: _t(1646, "成本异常检测发现一笔浪费"), e: _t(1647, "从亚马逊云科技领 $50；你名下每块实例型服务（IaaS、PaaS、容器），再领 $25（最多再领 $150）"), tip: _t(1648, "成本异常检测免费，用机器学习发现异常支出"), art: 'costexplorer', run: async (p, others, card) => { const n = Math.min(6, ownedBy(p).filter(i => isInst(i) && active(p, i)).length); await moneyOrMove(p, card, 50 + 25 * n, got => log(_tf(1633, "{$0} {$1}领 ${$2}", nm(p), n ? _tf(1649, "有 {$0} 块实例型服务，", n) : '', got))); } },
  { dlc: 'finops', n: _t(1650, "Compute Optimizer 建议降配"), e: _t(1651, "下次经过 Startup 扶持时，EC2、EBS、Lambda、RDS、Aurora 和跑在 Fargate 上的 ECS 运行费减半（Spot 买的、下线的、其他服务、EC2 的公网 IPv4 地址费和 Savings Plans 承诺额照付）；手上已经有一张没用上的运行费减半，或者一分钱都省不下的，改领 $50"), tip: _t(1652, "Compute Optimizer 按实际利用率推荐更合适的实例规格"), art: 'trustedadvisor',
    // 减半卡不叠加：手上已经有一张没用上的，或者按现在的用量省不下钱（名下没有它能降配的服务、技能让下一圈本来就全免），就改领 $50
    run: async p => { const s = p.halfRun ? 0 : halfSave(p, 'hour'); if (!s) { log(_tf(1655, "{$0} {$1}，改领 ${$2}", nm(p), p.halfRun ? _t(1653, "已经有一张运行费减半还没用上") : _t(1654, "按现在的用量，降配也省不下钱"), credit(p, 50))); return; }
      p.halfRun = 'hour'; p.halfLaps = 1; log(_tf(1656, "{$0} 下次经过 Startup 扶持时，{$1} 运行费减半：按现在的用量大约少交 ${$2}", nm(p), CO_SVCS, s)); } },
  { dlc: 'global', n: _t(1657, "新 Region 开服"), e: _t(1658, "你有多区域功能的服务每块领 $60；一块都没有就领 $50"), tip: _t(1659, "2019 年 3 月 20 日以后上线的 Region 默认是关着的（选择加入区域），要先在账户里启用，才能在里面建资源"), art: 'region', run: async (p, others, card) => { const n = ownedBy(p).filter(i => effActive(i, 'mr')).length; await moneyOrMove(p, card, n ? 60 * n : 50, got => log(_tf(1633, "{$0} {$1}领 ${$2}", nm(p), n ? _tf(1660, "有 {$0} 块多区域服务，", n) : '', got))); } },
  { dlc: 'global', n: _t(1661, "入选海外市场加速计划"), e: _t(1662, "前进到 CloudFront；没人买可以打 8 折买"), tip: _t(1663, "CloudFront 的价格等级（Price Class）可以只用一部分地区的边缘站点来省钱，被排除地区的用户访问会变慢；出海前先看目标市场在不在里面"), art: 'cloudfront', run: async p => { await advanceTo(p, IX.cloudfront); await land(p, { discount: 0.8 }); } },
]), v => { DLC_REI = v; }, () => DLC_REI);
export let DLC_QUIZ = __rv(() => ({
  genai: [
    { q: _t(1664, "Bedrock Knowledge Bases 用户上传的资料存在哪里检索？"), o: [_t(1665, "向量数据库，比如 OpenSearch Serverless"), _t(1666, "写进模型参数，相当于做了一次微调"), _t(1667, "每次调用都把整份资料塞进提示词"), _t(1668, "存在 DynamoDB 表里，提问时按关键词匹配")], a: _t(1669, "资料切块后转成向量存起来，提问时先检索再生成") },
    { q: _t(1670, "有几十万条商品描述要让模型改写，几天内出结果就行。Bedrock 用哪种方式最合适？"), o: [_t(1671, "批量推理：提交作业，结果写进 S3"), _t(1672, "买预置吞吐，按小时包下整个模型单元"), _t(1673, "一条条按需调用，失败了就自动重试"), _t(1674, "开多个账户同时并发调用，赶快跑完")], a: _t(1675, "比按需便宜 50%，但不保证完成时间；作业默认 24 小时超时，最长可设 168 小时") },
    { q: _t(1676, "每次调用都带着同一大段系统提示词和参考文档，Bedrock 用什么功能能省输入费、又能降延迟？"), o: [_t(1677, "提示缓存（Prompt caching）"), _t(1678, "调低温度参数（Temperature）"), _t(1679, "提高最大输出 token 数"), _t(1680, "每次调用换一个 Region")], a: _t(1681, "重复的长上下文缓存起来，后面的请求不用重新处理；支持哪些模型要看文档") },
    { q: _t(1682, "想让一个更小、更便宜的模型在自己的业务场景里接近大模型的效果，Bedrock 用什么？"), o: [_t(1683, "模型蒸馏：大模型当老师教小模型"), _t(1684, "把小模型的温度调到 0"), _t(1685, "给小模型加长上下文窗口"), _t(1686, "每次同时调大小两个模型取平均")], a: _t(1687, "大模型生成合成数据，再拿来微调小模型；之后调用小模型，更快也更便宜") },
    { q: _t(1688, "SageMaker HyperPod 主要用来做什么？"), o: [_t(1689, "大规模分布式训练，节点坏了自动换"), _t(1690, "用 API 调用现成的基础模型"), _t(1691, "给模型输入输出加安全护栏"), _t(1692, "托管 Jupyter 笔记本，给数据科学家用")], a: _t(1693, "训练基础模型动辄几周，节点故障自动恢复很重要") },
    { q: _t(1694, "用 LangGraph、CrewAI 这类开源框架写好了智能体，想不管服务器直接部署上线，用什么？"), o: ['Bedrock AgentCore Runtime', _t(1695, "在 EC2 上自己装框架、配扩缩"), _t(1696, "SageMaker HyperPod 训练集群"), _t(1697, "Amazon Lightsail 虚拟服务器")], a: _t(1698, "无服务器运行环境，不挑框架和模型，每个用户会话跑在单独的 microVM 里") },
  ],
  sec: [
    { q: _t(1699, "想让备份连 root 用户都删不掉，用什么？"), o: ['Backup Vault Lock', _t(1700, "S3 版本控制加 MFA Delete"), _t(1701, "IAM 权限边界（Permissions boundary）"), _t(1702, "CloudTrail 日志文件完整性验证")], a: _t(1703, "合规模式锁定后谁都不能提前删") },
    { q: _t(1704, "应用要用数据库密码，最好放在哪？"), o: [_t(1705, "Secrets Manager，开启自动轮换"), _t(1706, "写进代码，编译后别人看不到"), _t(1707, "放进环境变量，再跟代码一起提交到 Git 仓库"), _t(1708, "存在 S3 桶里，设成公开读方便取")], a: _t(1709, "应用运行时去取，泄露面最小") },
    { q: _t(1710, "GuardDuty 发现异常后，想自动隔离实例，常见做法是？"), o: [_t(1711, "EventBridge 规则触发 Lambda 处置"), _t(1712, "GuardDuty 默认就会自动隔离，不用管"), _t(1713, "每天导出发现结果，人工逐条看"), _t(1714, "在 CloudWatch 设告警，等值班的人处理")], a: _t(1715, "也可以触发 Step Functions 编排多步处置，这就是「威胁自动响应」架构") },
    { q: _t(1716, "多账户环境下统一限制「谁都不能关 CloudTrail」，用什么？"), o: [_t(1717, "Organizations 的服务控制策略（SCP）"), _t(1718, "每个账户各写一份 IAM 策略，挂给所有用户"), _t(1719, "给存日志的 S3 桶加存储桶策略"), _t(1720, "IAM 权限边界，挂在每个角色上")], a: _t(1721, "SCP 在组织层面兜底，账户管理员也绕不过") },
  ],
  finops: [
    { q: _t(1722, "想按部门分摊云账单，第一步通常是？"), o: [_t(1723, "给资源打成本分配标签"), _t(1724, "每个部门各用一个 Region"), _t(1725, "先给所有部门统一买 RI"), _t(1726, "按部门人数平摊总账单")], a: _t(1727, "标签在账单里激活后，Cost Explorer 就能按标签分组") },
    { q: _t(1728, "哪个工具会按实际利用率推荐更合适的实例规格？"), o: ['Compute Optimizer', 'Cost Anomaly Detection', 'Budgets', 'Amazon CloudFront'], a: _t(1729, "也覆盖 EBS、Lambda 和 ECS on Fargate") },
    { q: _t(1730, "S3 里很少访问、但要保留多年的归档数据，放哪个存储类最便宜？"), o: ['S3 Glacier Deep Archive', 'S3 Glacier Instant Retrieval', 'S3 Express One Zone', 'S3 Standard-IA'], a: _t(1731, "标准取回 12 小时内、批量 48 小时内，比 Flexible Retrieval 慢得多；最少存 180 天") },
    { q: _t(1732, "Budgets 能做什么？"), o: [_t(1733, "超出预算时发提醒，还能自动执行动作"), _t(1734, "超出预算后自动删掉最贵的资源"), _t(1735, "按预算额度自动给你打折"), _t(1736, "到月底自动替你签 Savings Plans")], a: _t(1737, "能按花费或用量设预算；预算动作可以套 IAM 策略、SCP，或停掉指定的 EC2、RDS 实例") },
  ],
  global: [
    { q: _t(1738, "全球用户访问静态资源慢，第一选择通常是？"), o: ['CloudFront', _t(1739, "把实例换大一号"), _t(1740, "多开几个 RDS 只读副本"), _t(1741, "关掉 HTTPS 省握手时间")], a: _t(1742, "边缘节点就近缓存，回源走骨干网") },
    { q: _t(1743, "Route 53 的地理位置路由能做什么？"), o: [_t(1744, "按用户所在国家或地区，导到指定 Region"), _t(1745, "按延迟最低的 Region 导流，不看用户在哪国"), _t(1746, "把请求平均分到所有 Region"), _t(1747, "把网页自动翻译成用户的语言")], a: _t(1748, "常用于数据合规和本地化；按延迟挑 Region 的是另一种：基于延迟的路由") },
    { q: _t(1749, "DynamoDB 全局表的特点是？"), o: [_t(1750, "多个 Region 都能读写，自动同步"), _t(1751, "一个 Region 写，其他 Region 只读"), _t(1752, "要自己写 Lambda 在 Region 之间同步"), _t(1753, "只能存日志，不支持备份")], a: _t(1754, "适合全球多活的业务") },
    { q: _t(1755, "Aurora 全球数据库跨 Region 复制的延迟通常是？"), o: [_t(1756, "1 秒以内"), _t(931, "1 小时"), _t(1104, "1 天"), _t(1757, "不能跨 Region")], a: _t(1758, "主 Region 出问题时，可以把备用 Region 提升为主") },
  ],
}), v => { DLC_QUIZ = v; }, () => DLC_QUIZ);

// ---------- 飞行：不按骰子走，直接飞到某一格 ----------
// lap：目标就是脚下这一格时往前绕一整圈（「走 Global Accelerator 快线」名下只有脚下这一块），不然原地不动又结算一次落点
export async function flyTo(p, target, why = '', { passGo = true, backward = false, lap = false } = {}) {
  if (p.jail !== null) { log(_tf(1759, "{$0} 在维护窗口里，不移动", nm(p))); return; }
  const from = p.pos, fwd = ((target - from + N) % N) || (lap && !backward ? N : 0);
  const fl = !SIM && UI.FX.flyStart(p), mt0 = UI.MOVE_TO;
  if (!SIM) fxCast('fs', { p: p.id, from, to: target, why: String(why), back: !!backward });   // 联机：远端照着飞（见 MPFX）；本机能不能播由远端自己判断
  if (fl) { S.moving = p.id; UI.__set_MOVE_TO(target); UI.render(); }
  UI.sfx('fly');
  try {
    if (fl) await waitAnim(UI.FX.flyGo(fl, target, why, backward), 1400);
    p.pos = target; S.lastSq = target;
    // 往回飞绕过了起点（「DNS 解析配错了」从第 12、31 格退到第 37 格）：等于退回上一圈，下次往前经过起点不算新的一圈（见 passStart）。
    // 不记这一笔的话，退回去反而离起点更近（从第 12 格要走 36 格，退到第 37 格只要 11 格），还照常领钱，罚卡变成了快进卡
    if (backward && target > from) p.reGo = (p.reGo || 0) + 1;
    // 往前飞和一格格走一样：路上的起点、UG 活动照常结算，按先后顺序；落点就是 UG 的交给 land，不算经过；退回、和别人换位置都不算经过
    if (passGo && !backward && fwd > 0) {
      const dU = (IX.free - from + N) % N, viaUG = dU > 0 && dU < fwd, viaGo = from + fwd >= N, ugFirst = viaUG && dU < N - from;
      if (ugFirst) await passUG(p);
      if (viaGo) await passStart(p);
      if (viaUG && !ugFirst) await passUG(p);
    }
  } finally { if (!SIM) fxCast('fe', { p: p.id }); if (fl) { await waitAnim(UI.FX.flyEnd(fl), 400); S.moving = null; UI.__set_MOVE_TO(mt0); } UI.render(); }
  log(`🛰 ${nm(p)} ${why}${backward ? _t(1760, "退回") : _t(1761, "飞到")} ${sqn(target)}`);
  if (backward && target > from) reGoLog(p);
}
// 往回绕过了起点：记账那一刻就写清楚，不然几回合后经过起点突然不领钱，像是出了 bug
export const reGoLog = p => log(_tf(1762, "{$0} 往回绕过了起点，算退回上一圈：下次经过 Startup 扶持不领 Credits、不交运行费", nm(p)));
// 选一格飞过去（列出候选）
async function flyChoose(p, list, title, why) {
  list = list.filter(i => i !== p.pos && !isHidden(i));
  if (!list.length) return false;
  const t = list.length === 1 ? list[0] : await UI.ask({ who: p.id, title, cls: 'quiz', buttons: list.map(i => ({ label: `${SQ[i].n}${S.props[i] && S.props[i].owner !== null && S.props[i].owner !== undefined ? _t(1763, "（") + P(S.props[i].owner).name + _t(1764, " 的）") : SQ[i].p ? _t(1765, "（没人买）") : ''}`, value: i })) });
  await flyTo(p, t, why); await land(p); return true;
}
export let MOVE_INC = __rv(() => ([
  { n: _t(1766, "DNS 解析配错了"), c: 'ops', e: _t(1767, "用户全被导到了别处：退回 Route 53 那一格，结算落点。往回绕过了起点的，算退回上一圈：下次经过起点不领 Credits、也不交运行费"), im: _t(1768, "Route 53 升了健康检查（不算罚）"), tip: _t(1769, "改 DNS 前先把 TTL 调小；Route 53 健康检查能在后端出问题时自动摘掉坏记录"), art: 'route53',
    imm: o => owns(o, IX.route53) && S.props[IX.route53].level >= 1 ? _t(1770, "Route 53 有健康检查") : '', run: async p => { await flyTo(p, IX.route53, _t(1771, "DNS 配错，"), { passGo: false, backward: true }); await land(p); return 'nopen'; } },
  { n: _t(1772, "发布出问题，回滚"), c: 'ops', e: _t(1773, "掷一颗骰子，后退相应格数，结算落点"), im: _t(712, "无（不算罚）"), tip: _t(1774, "用 CodeDeploy 蓝绿或金丝雀部署，出问题自动回滚"), art: 'codedeploy',
    run: async p => { const d = 1 + rnd(6); log(_tf(1775, "{$0} 掷出 {$1}，后退 {$2} 格", nm(p), d, d)); await moveSteps(p, -d); await land(p); return 'nopen'; } },
  { n: _t(1776, "流量被劫持到别人那里"), c: 'sec', e: _t(1777, "和随机一位不在维护窗口里的玩家交换位置（双方都不结算落点）"), im: _t(1778, "持有 Shield Advanced 或 CloudFront"), tip: _t(1779, "给 Route 53 公有托管区开 DNSSEC 签名，开了验证的解析器能识别被篡改的应答；入口放在 CloudFront 后面，源站地址不直接暴露"), art: 'shield',
    imm: o => active(o, IX.shield) ? _t(1780, "有 Shield Advanced") : active(o, IX.cloudfront) ? _t(1579, "有 CloudFront") : '', hits: p => p.jail === null && hijackTo(p).length > 0, run: async p => { const os = hijackTo(p); if (!os.length || p.jail !== null) return 'nopen'; const q = os[rnd(os.length)]; const a = p.pos; await flyTo(p, q.pos, _t(1781, "流量被劫持，"), { passGo: false }); q.pos = a; UI.render(); log(_tf(1782, "{$0} 被换到 {$1}", nm(q), sqn(a))); } },
  { n: _t(1783, "主 Region 出问题，紧急切到灾备"), c: 'avail', e: _t(1784, "飞到棋盘正对面那一格，先交 $80 切换费进奖池，再结算落点（经过起点、User Group 活动照常领钱）"), im: _t(1785, "Route 53 升了健康检查：自动故障转移，照样飞过去，不交切换费（都不算罚）"), tip: _t(1786, "灾备切换要提前演练；可以用 Route 53 故障转移路由或 Application Recovery Controller 做切换"), art: 'region',
    run: async p => { if (p.jail !== null) { log(_tf(1759, "{$0} 在维护窗口里，不移动", nm(p))); return 'nopen'; } await flyTo(p, (p.pos + Math.floor(N / 2)) % N, _t(1787, "切到灾备 Region，"));
      if (active(p, IX.route53) && S.props[IX.route53].level >= 1) log(_tf(1788, "{$0} 的 Route 53 健康检查自动故障转移，不交切换费", nm(p))); else log(_tf(1789, "{$0} 交 ${$1} 切换费", nm(p), pay(p, 'pot', 80)));
      await land(p); return 'nopen'; } },
]), v => { MOVE_INC = v; }, () => MOVE_INC);
export let MOVE_REI = __rv(() => ([
  { n: _t(1790, "搭上 Ground Station 卫星链路"), e: _t(1791, "飞到 Startup 扶持或 User Group 活动（二选一），路上经过起点、User Group 活动照常领钱"), tip: _t(1792, "Ground Station 是卫星地面站服务，按分钟租用天线收发卫星数据"), art: 'cloud',
    run: async p => { await flyChoose(p, [IX.go, IX.free], _t(1793, "卫星链路：飞到哪？"), _t(1794, "搭卫星链路，")); } },
  { n: _t(1795, "用 DataSync 把数据迁上云"), e: _t(1796, "飞到 S3 或 EFS（自己选），结算落点"), tip: _t(1797, "DataSync 在线把本地 NFS/SMB 共享里的数据自动迁到 S3、EFS、FSx，传完自动校验；Snowball 已经不再向新客户提供"), art: 's3',
    run: async p => { await flyChoose(p, [IX.s3, IX.efs], _t(1798, "DataSync 把你送到哪？"), _t(1799, "跟着 DataSync，")); } },
  { n: _t(1800, "跨 Region 业务扩张"), e: _t(1801, "飞到棋盘正对面那一格，结算落点，经过起点、User Group 活动照常领钱"), tip: _t(1802, "跨 Region 扩张先想清楚数据怎么跟过去：S3 跨区域复制要求源桶和目标桶都开版本控制，DynamoDB 全局表、Aurora 全球数据库能让多个 Region 就近读写"), art: 'region',
    run: async p => { await flyTo(p, (p.pos + Math.floor(N / 2)) % N, _t(1803, "跨 Region 扩张，")); await land(p); } },
  { n: _t(1804, "走 Global Accelerator 快线"), e: _t(1805, "前进到下一块你自己的服务（经过起点、User Group 活动照常领钱）；你还没有服务就前进 6 格"), tip: _t(1806, "Global Accelerator 给应用两个固定的任播 IP，用户就近接入亚马逊云科技骨干网"), art: 'datatransfer',
    run: async p => { const mine = ownedBy(p); if (!mine.length) { await moveSteps(p, 6); await land(p); return; } let k = (p.pos + 1) % N; while (!mine.includes(k)) k = (k + 1) % N; await flyTo(p, k, _t(1807, "走快线，"), { lap: true }); await land(p); } },
]), v => { MOVE_REI = v; }, () => MOVE_REI);
// 11-07 新加：万能服务改绑、免费出题。在 DLC 卡后面才挂上去（见下面 DLC_REI.forEach），已有卡的编号都不变，存档里的牌堆照旧对得上
export let NEW_REI = __rv(() => ([
  { n: _t(1808, "请合作伙伴梳理了一遍架构"), e: _t(1809, "你的一块万能服务免费改绑一次：已经绑了的可以换到另一个架构上，还没绑的现在就绑；没有能绑的，或者不想改，领 $100"), tip: _t(1810, "Well-Architected 合作伙伴可以按六大支柱帮你评审工作负载，找出缺的那一环、给出改进方案"), art: 'wat',
    run: async p => {
      // 交易换过手的万能服务还留着前主人的绑定：在别人手里不算数、也不能再绑（规则书万能服务一节，和 wildFree 一致），只有没绑的和自己绑的能改
      const opts = ownedBy(p).filter(w => isWild(w) && active(p, w) && (!S.props[w].wild || S.props[w].wild.p === p.id)).flatMap(w => { const b = S.props[w].wild, mine = b && b.p === p.id ? b.c : null;
        return COMBOS.filter(c => comboOpen(c) && c.id !== mine && wildFits(w, c) && !wildOf(p, c.id)).map(c => ({ w, c, miss: comboMiss(p, c), from: mine })).filter(x => x.miss.length <= 1); });
      if (!opts.length) { log(_tf(1811, "{$0} 没有能绑的万能服务，改领 ${$1}", nm(p), credit(p, 100))); return; }
      const lose = x => x.from == null ? 0 : (() => { const c0 = COMBOS.find(c => c.id === x.from); return comboMiss(p, c0).length === 1 ? 1e4 + c0.ix.flat().reduce((a, i) => a + (active(p, i) ? baseRent(i, 7) : 0), 0) : 0; })();
      const val = x => (x.miss.length ? 1e4 : 0) + x.c.ix.flat().reduce((a, i) => a + (active(p, i) ? baseRent(i, 7) : 0), 0) - lose(x);
      const fromN = x => x.from == null ? '' : _tf(1812, "（从「{$0}」改过来）", COMBOS.find(c => c.id === x.from).n);
      let k;
      if (isAI(p.id) || (SIM && SIM_AI)) { const b = opts.map((x, n) => [val(x), n]).sort((a, z) => z[0] - a[0])[0]; k = b[0] > 0 ? b[1] : -1; }
      else k = +(await UI.ask({ who: p.id, cls: 'pick', title: _t(1813, "合作伙伴梳理架构：万能服务绑到哪？"), html: _t(1814, "<p>这次改绑不算它那一次。改走的话，原来靠它补缺的架构会散。</p>"), buttons: [...opts.slice(0, 10).map((x, n) => ({ label: `${SQ[x.w].n} → ${x.miss.length ? _tf(1816, "补上「{$0}」缺的 {$1}", x.c.n, slotOpen(x.miss[0]).map(i => SQ[i].n).join(_t(1815, " 或 "))) : _tf(1817, "并进「{$0}」", x.c.n)}${fromN(x)}`, value: n })), { label: _tf(1818, "不改，领 ${$0}", cardAmt(100)), value: -1 }] }));
      if (!(k >= 0)) { log(_tf(1819, "{$0} 没有改绑，领 ${$1}", nm(p), credit(p, 100))); return; }
      const o = opts[k]; wildBind(p, o.w, o.c.id); if (o.from != null) log(_tf(1820, "{$0} 的 {$1} {$2}", nm(p), sqn(o.w), fromN(o)));
    } },
  { n: _t(1821, "当了一回认证考官"), e: _t(1822, "马上免费出一题考一位对手（不占这回合的出题次数）：他答错了赔你 $200，答对了谁也不用给钱"), tip: _t(1823, "亚马逊云科技认证的题目由各领域的专家出题、反复审核；考试指南会列出每个考点的占比"), art: 'training',
    run: async (p, others) => {
      if (!others.length) { log(_tf(1824, "{$0} 没有能考的对手", nm(p))); return; }
      const t = others.length === 1 ? others[0] : (isAI(p.id) || (SIM && SIM_AI)) ? others[rnd(others.length)] : P(+(await UI.ask({ who: p.id, cls: 'pick', title: _t(1825, "认证考官：免费出题考谁？"), html: _tf(1826, "<p>他答错了赔你 ${$0}，答对了谁也不用给钱。</p>", cardAmt(200)), buttons: others.map(o => ({ label: o.name, value: o.id })) })));
      const x = pickQuestion(qPoolS(SQ[t.pos]));
      log(_tf(1827, "❓ {$0} 当考官，免费出题考 {$1}", nm(p), nm(t)));
      const a0 = MP.actor; MP.actor = t.id; let ok = false;
      try { ok = await askQuestion(x.q, x.id, _tf(1828, "{$0} 当考官免费出题考你：答错了赔他 ${$1}，答对了不用给钱", p.name, cardAmt(200)), { again: x.again, skip: false }); } finally { MP.actor = a0; }
      { const st = ST(t); st.quizN++; if (ok) st.quizOk++; }
      if (ok) log(_tf(1829, "{$0} 答对了，谁也不用给钱", nm(t))); else log(_tf(1830, "{$0} 答错了，赔给 {$1} ${$2}", nm(t), nm(p), pay(t, p, 200)));
    } },
  // 11-07：免一圈账单（运行费）。现实里推广 Credits 自动抵扣符合条件的服务费用；Savings Plans 承诺额不让抵，照付
  { n: _t(1831, "领到亚马逊云科技推广 Credits"), e: _t(1832, "下次经过 Startup 扶持时，这一圈的运行费用 Credits 抵掉，技术债加价一起免（Savings Plans 承诺额照付）；已经记着一圈的，再多记一圈"), tip: _t(1833, "亚马逊云科技会通过活动、Activate 和合作项目发推广 Credits，自动抵扣符合条件的服务费用；Credits 有有效期，过期作废，具体以官网为准"), art: 'billing',
    run: async p => { p.billFree = (p.billFree || 0) + 1; log(_tf(1836, "💳 {$0} 领到亚马逊云科技推广 Credits：{$1}经过 Startup 扶持时，运行费用 Credits 抵掉", nm(p), p.billFree > 1 ? _tf(1834, "接下来 {$0} 次", p.billFree) : _t(1835, "下次"))); } },
  // 11-08：AgentCore、SageMaker AI 的故事
  { n: _t(1837, "Bedrock AgentCore 正式发布"), e: _t(1838, "前进到 AgentCore；没人买的话可以打 8 折买，有主正常付过路费"), tip: _t(1839, "AgentCore 在 2025 年 10 月正式发布：Runtime、Memory、Gateway、Identity、Observability 这些组件可以单独用，也可以组合着用，具体以官网为准"), art: 'agentcore',
    run: async p => { await advanceTo(p, IX.agentcore); await land(p, { discount: 0.8 }); } },
  { n: _t(1840, "用 AgentCore Gateway 把老接口接成 MCP 工具"), e: _t(1841, "你的 AgentCore 免费升一级（已经升满的领 $100）；没有 AgentCore 的领 $50"), tip: _t(1842, "AgentCore Gateway 能把现有的 REST API（OpenAPI 描述）和 Lambda 函数接成 MCP 工具，智能体不用改业务代码就能调用"), art: 'agentcore',
    run: async p => { const i = IX.agentcore; if (!owns(p, i)) { log(_tf(1843, "{$0} 没有 AgentCore，领 ${$1}", nm(p), credit(p, 50))); return; } if (upgradeInfo(p, i, true).ok) { const pr = S.props[i]; pr.level++; (pr.upPaid = pr.upPaid || [])[pr.level - 1] = 0; log(_tf(1844, "🔧 {$0} 免费给 {$1} 升到{$2}", nm(p), sqn(i), lvFull(i, pr.level))); } else log(_tf(1845, "{$0} 的 {$1} 升不了了，领 ${$2}", nm(p), sqn(i), credit(p, 100))); } },
  { n: _t(1846, "SageMaker Unified Studio 打通数据和 AI"), e: _t(1847, "你名下分析组、AI 组的服务，每块领 $30（最多领 $180）"), tip: _t(1848, "SageMaker Unified Studio 把数据目录、SQL 查询、Spark 作业、模型开发和 Bedrock 应用放进同一个工作台，数据和 AI 团队在一处协作"), art: 'sagemaker',
    run: async (p, others, card) => { const n = Math.min(6, ownedBy(p).filter(i => ['ana', 'ai'].includes(SQ[i].g) && active(p, i)).length); await moneyOrMove(p, card, 30 * n, got => log(_tf(1633, "{$0} {$1}领 ${$2}", nm(p), n ? _tf(1849, "有 {$0} 块分析、AI 服务，", n) : _t(1850, "还没有分析、AI 服务，"), got))); } },
  // 11-08：Cognito 的故事
  { n: _t(1851, "Cognito 支持通行密钥，用户不用记密码"), e: _t(1852, "你的 Cognito 免费升一级（已经升满的领 $100）；没有 Cognito 的领 $50"), tip: _t(1853, "Cognito 用户池支持无密码登录：通行密钥（passkey，用指纹或面容解锁）和邮件、短信一次性验证码，钓鱼网站骗不走"), art: 'cognito',
    run: async p => { const i = IX.cognito; if (!owns(p, i)) { log(_tf(1854, "{$0} 没有 Cognito，领 ${$1}", nm(p), credit(p, 50))); return; } if (upgradeInfo(p, i, true).ok) { const pr = S.props[i]; pr.level++; (pr.upPaid = pr.upPaid || [])[pr.level - 1] = 0; log(_tf(1844, "🔧 {$0} 免费给 {$1} 升到{$2}", nm(p), sqn(i), lvFull(i, pr.level))); } else log(_tf(1845, "{$0} 的 {$1} 升不了了，领 ${$2}", nm(p), sqn(i), credit(p, 100))); } },
  // 11-09：DMS 的故事
  { n: _t(1855, "DMS Schema Conversion 用生成式 AI 转换存储过程"), e: _t(1856, "你的 DMS 免费升一级（已经升满的领 $100）；没有 DMS 的领 $50"), tip: _t(1857, "DMS Schema Conversion 把 Oracle、SQL Server 的表结构和存储过程转换成 PostgreSQL、MySQL 能用的；规则转不了的代码可以交给生成式 AI 辅助转换，转完要人复核"), art: 'dms',
    run: async p => { const i = IX.dms; if (!owns(p, i)) { log(_tf(1858, "{$0} 没有 DMS，领 ${$1}", nm(p), credit(p, 50))); return; } if (upgradeInfo(p, i, true).ok) { const pr = S.props[i]; pr.level++; (pr.upPaid = pr.upPaid || [])[pr.level - 1] = 0; log(_tf(1844, "🔧 {$0} 免费给 {$1} 升到{$2}", nm(p), sqn(i), lvFull(i, pr.level))); } else log(_tf(1845, "{$0} 的 {$1} 升不了了，领 ${$2}", nm(p), sqn(i), credit(p, 100))); } },
]), v => { NEW_REI = v; }, () => NEW_REI);


