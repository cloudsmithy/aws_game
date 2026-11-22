import { __rv, _t, _tf } from '../core/01-i18n-runtime.js';
import { SIM, SIM_AI } from '../core/02-util.js';
import { UI } from '../core/02b-ui-port.js';
import { IX, SQ } from './03-services.js';
import { REI } from './04-roles-combos-cards.js';
import { askQuestion, pickQuestion } from './06-qbank.js';
import { P, S, log, nm, ownedBy, owns, sqn } from '../engine/07-state.js';
import { cardAmt, credit, pay } from '../engine/08-money.js';
import { runCutSave } from '../engine/08c-costs.js';
import { baseRent } from '../engine/09-rent.js';
import { debtCleared } from '../engine/17-health.js';
import { moneyOrMove } from '../engine/18-reinvent.js';
import { ST } from '../engine/26b-retro.js';
import { isAI } from '../engine/36-ai.js';
// ================= re:Invent 卡（2026）：基础牌 12 张 =================
// 每张卡：真实的技术原因 → 顺理成章的游戏效果。在 rules/06b-register.js 里接在所有已有卡后面（NEW_REI 之后），已有卡编号不变；
// 没有 dlc 字段，开局就在基础牌堆里。效果都写在 run 里（engine/18-reinvent.js reiResolve 调），保留卡走 keep（CARDN.SPOTN）
const r26Bot = p => isAI(p.id) || (SIM && SIM_AI);
const r26Id = card => REI.indexOf(card);
// 挂一个「这一圈」的效果（p.lapFx，见 engine/07-state.js lapFx）：同一张卡再抽到只刷新，不叠加
const r26Lap = (p, x) => { p.lapFx = (p.lapFx || []).filter(y => !(y.c === x.c && y.k === x.k)); p.lapFx.push({ ...x, lap: p.laps || 0 }); };
// 挂一份「下次经过 Startup 扶持时按服务打折」的运行费（p.runCut，见 engine/08c-costs.js runCutOf），返回按现在的用量大约省多少
const r26Cut = (p, x) => { const save = runCutSave(p, x); (p.runCut = p.runCut || []).push(x); return save; };
const r26Names = ks => ks.map(k => SQ[IX[k]].n).join(_t(349, "、"));
export let REI26 = __rv(() => ([
  { n: _t(5592, "用 Kiro 做规格驱动重构"), e: _t(5593, "清掉 1 个技术债（清债要停机：进维护窗口停一轮，名下服务一起下线一轮）；没有技术债就领 $100"), tip: _t(5594, "Kiro 先把需求写成规格和任务清单，再按任务生成代码和测试；重构遗留代码时有测试兜底，不容易引入回归"), art: 'codecatalyst',
    run: async (p, others, card) => {
      if (p.techDebt > 0) { p.techDebt--; p.refactored = true; log(_tf(5595, "{$0} 用 Kiro 先写规格和测试再重构，清掉 1 个技术债", nm(p))); debtCleared(p); return; }
      await moneyOrMove(p, card, 100, got => log(_tf(1645, "{$0} 没有技术债，领 ${$1}", nm(p), got)));
    } },
  { n: _t(5596, "上了 Lambda SnapStart"), e: _t(5597, "这一圈（到你下次经过 Startup 扶持为止）你的 Lambda 过路费 +30%；没有 Lambda 就领 $50"), tip: _t(5598, "SnapStart 在函数初始化完以后给执行环境打快照，冷启动时直接从快照恢复，Java 这类启动慢的函数冷启动从几秒降到亚秒级"), art: 'lambda',
    run: async (p, others, card) => {
      if (!owns(p, IX.lambda)) { log(_tf(5599, "{$0} 没有 {$1}，领 ${$2}", nm(p), SQ[IX.lambda].n, credit(p, 50))); return; }
      r26Lap(p, { k: 'rent', ks: ['lambda'], m: 1.3, c: r26Id(card) }); log(_tf(5600, "⚡ {$0} 的 {$1} 冷启动快了，这一圈过路费 ×{$2}", nm(p), sqn(IX.lambda), 1.3));
    } },
  { n: _t(5601, "换上 Graviton4 实例"), e: _t(5602, "下次经过 Startup 扶持时，你的 EC2、RDS 运行费减半；两块都没有就领 $50"), tip: _t(5603, "Graviton4 同样的性能价格更低：应用和镜像编成 arm64 就能换，RDS 这类托管数据库直接改实例类型"), art: 'ec2',
    run: async (p, others, card) => {
      const ks = ['ec2', 'rds'];
      if (!ks.some(k => owns(p, IX[k]))) { log(_tf(5599, "{$0} 没有 {$1}，领 ${$2}", nm(p), r26Names(ks), credit(p, 50))); return; }
      const save = r26Cut(p, { ks, m: 0.5, c: r26Id(card) });
      log(_tf(5604, "{$0} 换上 Graviton4：下次经过 Startup 扶持时 {$1} 运行费减半，按现在的用量大约少交 ${$2}", nm(p), r26Names(ks.filter(k => owns(p, IX[k]))), save));
    } },
  { n: _t(5605, "用了 S3 Express One Zone"), e: _t(5606, "这一圈你的 SageMaker AI、Bedrock 过路费 ×1.5；代价：这一圈你的 S3 算单 AZ（「一个 AZ 断电了」会打中它）。SageMaker AI、Bedrock 都没有就领 $50"), tip: _t(5607, "S3 Express One Zone 是单 AZ 的高性能存储桶（目录桶），和计算放在同一个 AZ，训练数据读取延迟降到个位数毫秒；代价是数据只存在一个 AZ 里"), art: 's3',
    run: async (p, others, card) => {
      const ks = ['sagemaker', 'bedrock'], c = r26Id(card);
      if (!ks.some(k => owns(p, IX[k]))) { log(_tf(5599, "{$0} 没有 {$1}，领 ${$2}", nm(p), r26Names(ks), credit(p, 50))); return; }
      r26Lap(p, { k: 'rent', ks, m: 1.5, c }); r26Lap(p, { k: 'az', ks: ['s3'], c });
      log(_tf(5608, "{$0} 把训练数据放进 S3 Express One Zone：这一圈 {$1} 过路费 ×{$2}{$3}", nm(p), r26Names(ks.filter(k => owns(p, IX[k]))), 1.5, owns(p, IX.s3) ? _tf(5609, "，{$0} 这一圈算单 AZ", sqn(IX.s3)) : ''));
    } },
  { n: _t(5610, "Aurora Serverless v2 缩到 0"), e: _t(5611, "下次经过 Startup 扶持时，你的 Aurora 只交存储那部分运行费（和下线时一样）；没有 Aurora 就领 $50"), tip: _t(5612, "Aurora Serverless v2 可以把最小容量设成 0：一段时间没有连接就自动暂停，暂停期间只收存储费，来了连接再自动恢复"), art: 'aurora',
    run: async (p, others, card) => {
      if (!owns(p, IX.aurora)) { log(_tf(5599, "{$0} 没有 {$1}，领 ${$2}", nm(p), SQ[IX.aurora].n, credit(p, 50))); return; }
      const save = r26Cut(p, { ks: ['aurora'], store: true, c: r26Id(card) });
      log(_tf(5613, "{$0} 的 {$1} 没连接时缩到 0：下次经过 Startup 扶持时只交存储费，按现在的用量大约少交 ${$2}", nm(p), sqn(IX.aurora), save));
    } },
  { n: _t(5614, "CloudWatch Application Signals 画出调用链"), e: _t(5615, "你名下一块 Impaired 的服务立刻恢复（有几块就恢复过路费最高的那块），再领 1 个可用性类复盘标记；没有 Impaired 的也领标记"), tip: _t(5616, "Application Signals 自动发现服务之间的调用关系，画出服务地图，按延迟、错误率一眼看出是哪个下游拖慢了整条链路"), art: 'cloudwatch',
    run: async p => {
      const imp = ownedBy(p).filter(i => S.props[i].impaired).sort((a, b) => baseRent(b, 7) - baseRent(a, 7));
      if (imp.length) { S.props[imp[0]].impaired = false; log(_tf(5617, "🔎 {$0} 顺着调用链找到拖慢链路的下游，{$1} 恢复正常", nm(p), sqn(imp[0]))); }
      p.coe.push({ cat: 'avail', used: false, text: _t(5618, "Application Signals 找到的慢依赖") }); log(_tf(5619, "📝 {$0} 领到 1 个可用性类复盘标记", nm(p)));
    } },
  { n: _t(5620, "在 Organizations 里共享 Savings Plans"), e: _t(5621, "你和下一位玩家下次经过 Startup 扶持时，运行费都打 75 折"), tip: _t(5622, "同一个组织里的账户默认共享 Savings Plans 和 RI 的折扣：一个账户用不完的承诺额，自动抵扣别的账户的用量"), art: 'savingsplans',
    run: async (p, others, card) => {
      const n = S.players.length, nx = Array.from({ length: n - 1 }, (_, k) => S.players[(p.id + 1 + k) % n]).find(o => o.alive), c = r26Id(card);
      const got = [p, nx].filter(Boolean).map(q => [q, r26Cut(q, { m: 0.75, c })]);
      log(_tf(5623, "🤝 {$0} 下次经过 Startup 扶持时运行费都打 75 折（按现在的用量大约少交：{$1}）", got.map(([q]) => nm(q)).join(_t(349, "、")), got.map(([q, s]) => _tf(3245, "{$0}（{$1}）", nm(q), '$' + s)).join(_t(349, "、"))));
    } },
  { n: _t(5624, "你在 re:Post 的回答被采纳"), e: _t(5625, "每位其他玩家付你 $20"), tip: _t(5626, "你帮别人解决了跨账户 IAM 角色的问题：目标账户角色的信任策略里写对 Principal，调用方再有 sts:AssumeRole 权限；回答被提问的人标成 Accepted"), art: 'support',
    run: async (p, others) => {
      if (!others.length) return;
      others.forEach(o => pay(o, p, 20)); log(_tf(5627, "✅ {$0} 在 re:Post 的回答被采纳，每位其他玩家付他 ${$1}", nm(p), cardAmt(20)));
    } },
  { n: _t(5628, "和对手合办 User Group 技术分享"), e: _t(5629, "选一名对手，你们俩各从亚马逊云科技领 $100"), tip: _t(5630, "两家一起讲迁移踩坑的经验，台下的客户两边都想聊；各地 User Group 都欢迎会员报名上台分享"), art: 'users',
    run: async (p, others) => {
      if (!others.length) { log(_tf(5631, "{$0} 没有能合办的对手", nm(p))); return; }
      // 电脑挑现金最少的对手（拉一把落后的，和真人的直觉一样）
      const t = others.length === 1 ? others[0] : r26Bot(p) ? [...others].sort((a, b) => a.cash - b.cash)[0] : P(+(await UI.ask({ who: p.id, cls: 'pick', title: _t(5632, "和谁合办 User Group 技术分享？"), html: _tf(5633, "<p>你们俩各从亚马逊云科技领 ${$0}。</p>", cardAmt(100)), buttons: others.map(o => ({ label: o.name, value: o.id })) })));
      const a = credit(p, 100); credit(t, 100); log(_tf(5634, "🎤 {$0} 和 {$1} 合办 User Group 技术分享，各领 ${$2}", nm(p), nm(t), a));
    } },
  // 已有 #7「考过了 Solutions Architect 认证」（清技术债）：这张换成 MLE – Associate，效果是答题
  { n: _t(5635, "考过 Machine Learning Engineer – Associate"), e: _t(5636, "抽一道 AI 题：答对领 $150，答错领 $30"), tip: _t(5637, "Machine Learning Engineer – Associate 考的是在 SageMaker AI 上准备数据、训练、部署和监控模型；认证有效期 3 年"), art: 'training',
    run: async p => {
      const x = pickQuestion('ai');
      const ok = await askQuestion(x.q, x.id, _tf(5638, "Machine Learning Engineer – Associate：答对领 ${$0}，答错领 ${$1}", cardAmt(150), cardAmt(30)), { again: x.again, skip: false });
      { const st = ST(p); st.quizN++; if (ok) st.quizOk++; }
      if (ok) log(_tf(5639, "🎓 {$0} 答对了，考过 MLE – Associate，领 ${$1}", nm(p), credit(p, 150))); else log(_tf(5640, "{$0} 没答对，领 ${$1} 参与奖", nm(p), credit(p, 30)));
    } },
  { n: _t(5641, "Activate 给了额外 Credits"), e: _t(5642, "现金低于 $500 领 $300，否则领 $100"), tip: _t(5643, "早期创业公司现金流紧，Activate 按融资阶段追加 Credits，具体以官网为准"), art: 'activate',
    run: async (p, others, card) => {
      const low = p.cash < 500;
      await moneyOrMove(p, card, low ? 300 : 100, got => log(_tf(5644, "{$0} {$1}，领 ${$2} Credits", nm(p), low ? _t(5645, "现金不到 $500") : _t(5646, "现金还宽裕"), got)));
    } },
  { n: _t(5647, "收到 Spot 中断前 2 分钟通知"), keep: 'SPOTN', e: _t(5648, "保留：下次你的 Spot 服务要被别人出价抢走时自动用掉，这次保住；对方照常付过路费"), tip: _t(5649, "用 EventBridge 规则接住 Spot 实例的两分钟中断通知，及时把任务切到别的实例上；Auto Scaling 的容量再平衡还能更早换掉有风险的实例"), art: 'eventbridge' },
]), v => { REI26 = v; }, () => REI26);
