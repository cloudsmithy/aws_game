import { __rv, _t, _tf } from '../core/01-i18n-runtime.js';
import { rnd } from '../core/02-util.js';
import { UI } from '../core/02b-ui-port.js';
import { IX, SQ, isInst } from './03-services.js';
import { F, S, active, effActive, inPlay, log, nm, ownedBy, owns, sqn } from '../engine/07-state.js';
import { credit, pay } from '../engine/08-money.js';
import { baseRent, forceDown } from '../engine/09-rent.js';
import { impair, skipOrPay } from '../engine/17-health.js';
// ================= DLC「Health 事件扩展包（2026）」：10 张 Health 卡 =================
// 每张卡：真实的技术原因 → 顺理成章的游戏效果；免疫 = 现实里对口的做法（升级或持有的服务）。
// 在 rules/06b-register.js 里接在所有已有卡后面（INC_ADD4 之后），已有卡编号不变；开局没勾这个 DLC 时牌堆里没有这些卡（ui/28-setup-save.js 按 dlc 过滤）
const live = (p, i) => active(p, i) && !S.props[i].impaired;
// 二选一：交钱，或者让一块服务变成 Impaired。和 engine/17-health.js 的 payOrImpair 同一套文字（电脑按按钮文字认，见 engine/36-ai.js）
async function payOrImp(p, amt, cands, why) {
  const c = cands.filter(i => live(p, i)).sort((a, b) => baseRent(b, 7) - baseRent(a, 7))[0];
  const x = Math.round(amt * (S && S.cardMul ? S.cardMul : 1));
  if (c == null) { log(_tf(1561, "{$0} 交 ${$1}", nm(p), pay(p, 'pot', amt))); return; }
  const v = await UI.ask({ who: p.id, title: _tf(838, "{$0}：{$1}", p.name, why), html: _tf(5717, "<p>二选一：交 ${$0} 进奖池；或者让 {$1} 变成 Impaired（暂停收过路费一整轮：所有人各走一回合后，到你回合开始自动恢复）。</p>", x, sqn(c)), buttons: [{ label: _tf(3112, "交 ${$0}", x), value: 'pay', cls: 'pri', disabled: p.cash < x }, { label: _tf(3155, "让 {$0} 变成 Impaired", SQ[c].n), value: 'imp' }] });
  if (v === 'pay') log(_tf(1561, "{$0} 交 ${$1}", nm(p), pay(p, 'pot', amt))); else { impair([c]); log(_tf(3156, "{$0} 的 {$1} 变成 Impaired", nm(p), sqn(c))); }
}
// H2：VPC 开了私有子网（第 1 级）、还没到 Session Manager（第 2 级，私有子网里配好了终端节点）时，名下的实例型服务出网都走 NAT 网关
const natInst = p => active(p, IX.vpc) && S.props[IX.vpc].level === 1 ? ownedBy(p).filter(i => SQ[i].t === 'prop' && isInst(i) && active(p, i)) : [];
// H3：只有客户托管密钥（KMS 第 1 级）才能被计划删除；亚马逊云科技托管的密钥删不掉
const cmk = p => active(p, IX.kms) && S.props[IX.kms].level >= 1;
// H5：手动快照、AMI 没人清理；用 DLM 管理（EBS「自动快照（DLM）」、EC2「自动 AMI」，效果码 backup）的按保留规则自动删旧的
const snapHit = p => [IX.ebs, IX.ec2].filter(i => active(p, i) && !effActive(i, 'backup'));
// H6：随机压垮一块在收费的服务
const stormC = p => ownedBy(p).filter(i => SQ[i].t === 'prop' && live(p, i));
// H9：要拉镜像起新任务的容器服务
const ctrHit = p => [IX.ecs, IX.eks].filter(i => live(p, i));
// H10：实例型服务按有没有弹性扩展分两拨
const bfHit = o => ownedBy(o).filter(i => SQ[i].t === 'prop' && isInst(i) && live(o, i) && !effActive(i, 'scale'));
const bfOk = o => ownedBy(o).filter(i => SQ[i].t === 'prop' && isInst(i) && live(o, i) && effActive(i, 'scale'));
export let INC26 = __rv(() => ([
  { dlc: 'inc26', n: _t(5314, "Lambda 并发被打满"), c: 'avail', e: _t(5724, "一个批处理任务把账户的 Lambda 并发全占了，你别的函数都收到 429 限流：二选一，交 $60 进奖池；或者让你的 Lambda 变成 Impaired（暂停收过路费一整轮：所有人各走一回合后，到你回合开始自动恢复）"), im: _t(5316, "Lambda 升了「预置并发」（关键函数有预先分好的执行环境，别的函数抢不走）；或者持有 SQS（批处理从队列取消息，事件源映射设了最大并发）；名下没有 Lambda 不受影响"), tip: _t(5317, "同一个 Region 里账户下所有函数共用一个并发池（默认 1000），一个函数打满，别的函数都会被限流。给批处理函数设预留并发封顶，给关键函数配预留或预置并发保底；SQS 触发时用事件源映射的最大并发控制同时跑几个"), art: 'lambda',
    imm: o => !owns(o, IX.lambda) ? _t(5318, "没有 Lambda") : S.props[IX.lambda].level >= 2 ? _t(5319, "Lambda 有预置并发") : active(o, IX.sqs) ? _t(5320, "有 SQS，批处理按最大并发慢慢消费") : '',
    hits: p => live(p, IX.lambda), run: async p => {
      if (!live(p, IX.lambda)) { log(_tf(5321, "{$0} 的 Lambda 没在收费，不受影响", nm(p))); return 'nopen'; }
      await payOrImp(p, 60, [IX.lambda], _t(5314, "Lambda 并发被打满"));
    } },
  { dlc: 'inc26', n: _t(5322, "NAT 网关处理费超支"), c: 'cost', e: _t(5323, "私有子网里的实例拉镜像、读写 S3 都绕道 NAT 网关，每 GB 都收处理费：你的 VPC 开了私有子网的话，名下每块实例型服务（IaaS、PaaS、容器）交 $30 进奖池"), im: _t(5324, "VPC 没开私有子网（没有 NAT 网关）；或者 VPC 升到了「Session Manager」（私有子网里已经建好 VPC 终端节点，S3 走网关终端节点、ECR 走接口终端节点，不经过 NAT）"), tip: _t(5325, "NAT 网关除了按小时收费，每处理 1 GB 数据还要再收一笔。访问 S3、DynamoDB 用免费的网关终端节点；ECR、CloudWatch 这类用接口终端节点，流量留在 VPC 里，不经过 NAT 网关"), art: 'vpc',
    imm: o => !active(o, IX.vpc) || S.props[IX.vpc].level < 1 ? _t(5326, "没开私有子网，没有 NAT 网关") : S.props[IX.vpc].level >= 2 ? _t(5327, "VPC 建好了终端节点，流量不经过 NAT 网关") : '',
    hits: p => natInst(p).length > 0, run: async p => {
      const hit = natInst(p);
      if (!hit.length) { log(_tf(5328, "{$0} 私有子网里没有实例，不受影响", nm(p))); return 'nopen'; }
      log(_tf(5329, "{$0} 为 {$1} 交 NAT 网关处理费 ${$2}", nm(p), hit.map(sqn).join(_t(349, "、")), pay(p, 'pot', 30 * hit.length)));
    } },
  { dlc: 'inc26', n: _t(5330, "KMS 密钥被误设成待删除"), c: 'ops', e: _t(5331, "有人把一把客户托管密钥计划删除了，等待期里用它加密的数据都解不开：停一轮，或者交 $100 进奖池赶紧取消删除、继续走"), im: _t(5332, "KMS 没升「客户托管密钥」（亚马逊云科技托管的密钥删不掉）；或者持有 CloudTrail，并且 CloudWatch 升了「告警与仪表板」（一调 ScheduleKeyDeletion 就告警，当场取消）"), tip: _t(5333, "KMS 密钥不能马上删，要先等 7–30 天（默认 30 天）；等待期里密钥不能用，随时可以取消。用 CloudTrail 加 CloudWatch 告警盯住 ScheduleKeyDeletion 和对待删除密钥的调用，再用密钥策略限制谁能计划删除。真删掉了，用它加密的数据就再也解不开"), art: 'kms',
    imm: o => !cmk(o) ? _t(5334, "没有客户托管密钥") : active(o, IX.cloudtrail) && active(o, IX.cloudwatch) && S.props[IX.cloudwatch].level >= 2 ? _t(5335, "CloudTrail 加 CloudWatch 告警，当场取消了删除") : '',
    hits: p => cmk(p), run: async p => {
      if (!cmk(p)) { log(_tf(5336, "{$0} 没有客户托管密钥，不受影响", nm(p))); return 'nopen'; }
      await skipOrPay(p, _t(5330, "KMS 密钥被误设成待删除"), 100, _t(5337, "取消删除、重新启用密钥"));
    } },
  { dlc: 'inc26', n: _t(5338, "IAM 权限给成了 *:*"), c: 'sec', e: _t(5339, "审计发现一个角色挂着 Action 和 Resource 都是 * 的策略：记 1 个技术债（没开技术债的模式改交 $100 进奖池）"), im: _t(5340, "Config 升了「托管规则」（iam-policy-no-statements-with-admin-access 一上线就报不合规）；或者持有 CloudTrail（IAM Access Analyzer 按实际调用记录生成了最小权限策略）"), tip: _t(5341, "按最小权限给权限：IAM Access Analyzer 能根据 CloudTrail 里实际的调用记录生成策略，还能找出没用过的权限；Config 托管规则 iam-policy-no-statements-with-admin-access 专门查 *:* 的策略"), art: 'iam',
    imm: o => active(o, IX.config) && S.props[IX.config].level >= 1 ? _t(5342, "Config 托管规则查出了 *:* 的策略") : active(o, IX.cloudtrail) ? _t(5343, "按 CloudTrail 记录收紧成了最小权限") : '',
    // 开了技术债：run 只记一笔，返回后 penalize 记 1 个技术债；没开技术债的模式 penalize 不罚钱，这里交 $100
    run: async p => {
      if (F.debt()) { log(_tf(5344, "{$0} 的角色权限给成了 *:*，要回头收紧", nm(p))); return; }
      log(_tf(5345, "{$0} 的角色权限给成了 *:*，交 ${$1} 进奖池整改", nm(p), pay(p, 'pot', 100)));
    } },
  { dlc: 'inc26', n: _t(5346, "EBS 快照越积越多"), c: 'cost', e: _t(5347, "手动拍的快照和 AMI 从来不删，按存的数据量每月收费：你名下的 EBS、EC2 没用 DLM 自动管理快照的，每块交 $40 进奖池"), im: _t(5348, "按块算：EBS 升了「自动快照（DLM）」、EC2 升了「自动 AMI」（DLM 策略按保留份数自动删旧的）；名下没有 EBS、EC2 不受影响"), tip: _t(5349, "EBS 快照按实际存的数据量每月收费，实例和卷删掉以后快照还在。用 Data Lifecycle Manager 按计划拍快照、只保留最近几份；很久才用一次的快照可以转到归档层，存储费便宜约 75%"), art: 'ebs',
    imm: o => snapHit(o).length ? '' : _t(5350, "快照都由 DLM 管着（或者没有 EBS、EC2）"),
    hits: p => snapHit(p).length > 0, run: async p => {
      const hit = snapHit(p);
      if (!hit.length) { log(_tf(5351, "{$0} 的快照都由 DLM 管着，不受影响", nm(p))); return 'nopen'; }
      log(_tf(2484, "{$0} 为 {$1} 交 ${$2} 存储费", nm(p), hit.map(sqn).join(_t(349, "、")), pay(p, 'pot', 40 * hit.length)));
    } },
  { dlc: 'inc26', n: _t(5352, "重试风暴"), c: 'avail', e: _t(5353, "下游一慢，所有客户端立刻重试、不加退避，流量翻了几倍把服务压垮：你名下随机一块服务变成 Impaired"), im: _t(5354, "持有 SQS（请求先进队列，下游按自己的速度消费）；或者 API Gateway 升了「使用计划限流」（多出来的重试在网关就被 429 挡回去）"), tip: _t(5355, "重试要加指数退避和随机抖动，并限制重试次数，SDK 默认的重试模式就带退避；下游扛不住时用队列削峰、在入口限流，熔断器让失败的调用快速返回，别把下游越压越死"), art: 'sqs',
    imm: o => active(o, IX.sqs) ? _t(5356, "有 SQS，请求排队慢慢处理") : active(o, IX.apigw) && S.props[IX.apigw].level >= 1 ? _t(5357, "API Gateway 限流挡住了重试") : '',
    hits: p => stormC(p).length > 0, run: async p => {
      const c = stormC(p);
      if (!c.length) { log(_tf(5358, "{$0} 没有在收费的服务，不受影响", nm(p))); return 'nopen'; }
      const i = c[rnd(c.length)]; impair([i]); log(_tf(5359, "{$0} 的 {$1} 被重试风暴压垮，变成 Impaired", nm(p), sqn(i)));
    } },
  { dlc: 'inc26', n: _t(5360, "定时任务时区配错了"), c: 'ops', e: _t(5361, "cron 表达式按 UTC 算，本该北京时间凌晨 2 点跑的对账任务，上午 10 点才跑：停一轮补数据，或者交 $80 进奖池手动补跑、继续走"), im: _t(5362, "EventBridge 升了「定时启停 EC2」（用 EventBridge Scheduler，每个计划都写明了时区 Asia/Shanghai）"), tip: _t(5363, "EventBridge 规则里的 cron 只按 UTC 算；EventBridge Scheduler 可以给每个计划指定时区，夏令时也自动处理，不指定时默认还是 UTC"), art: 'eventbridge',
    imm: o => active(o, IX.eventbridge) && S.props[IX.eventbridge].level >= 1 ? _t(5364, "EventBridge Scheduler 写明了时区") : '',
    run: async p => { await skipOrPay(p, _t(5360, "定时任务时区配错了"), 80, _t(5365, "手动补跑")); } },
  { dlc: 'inc26', n: _t(5366, "唯一懂 Kubernetes 的人离职了"), c: 'ops', e: _t(5725, "集群升级、节点打补丁没人会做：二选一，交 $150 进奖池请外部顾问；或者 EKS 下线 1 轮（不收过路费、不算持有，运行费照交，停一整轮：所有人各走一回合后，到你回合开始恢复）"), im: _t(5368, "EKS 升到了「EKS Auto Mode」（节点、核心插件和打补丁交给亚马逊云科技管）；名下没有 EKS 不受影响"), tip: _t(5369, "EKS 每个 Kubernetes 版本标准支持 14 个月，过期进入延长支持要多收费；Auto Mode 把节点扩缩、打补丁和核心插件都托管了，团队不用人人精通 Kubernetes。关键的运维步骤写进 Runbook，别只在一个人脑子里"), art: 'eks',
    imm: o => !owns(o, IX.eks) ? _t(5370, "没有 EKS") : effActive(IX.eks, 'ssh') ? _t(5371, "EKS 有 Auto Mode") : '',
    hits: p => live(p, IX.eks), run: async (p, id) => {
      if (!live(p, IX.eks)) { log(_tf(5372, "{$0} 的 EKS 没在收费，不受影响", nm(p))); return 'nopen'; }
      const why = _t(5366, "唯一懂 Kubernetes 的人离职了"), x = Math.round(150 * (S.cardMul || 1));
      const v = await UI.ask({ who: p.id, title: _tf(838, "{$0}：{$1}", p.name, why), html: _tf(5726, "<p>二选一：交 ${$0} 进奖池请外部顾问；或者 EKS 下线 1 轮：不收过路费、不算持有（不凑整组、架构和支柱），运行费照交，停一整轮：所有人各走一回合后，到你回合开始恢复。</p>", x),
        buttons: [{ label: _tf(3112, "交 ${$0}", x), value: 'pay', cls: 'pri', disabled: p.cash < x }, { label: _t(5374, "让 EKS 下线 1 轮"), value: 'down' }] });
      if (v === 'pay') log(_tf(1561, "{$0} 交 ${$1}", nm(p), pay(p, 'pot', 150)));
      else { forceDown(IX.eks, p.id, 1, 'inc:' + id); log(_tf(5727, "{$0} 的 {$1} 下线一整轮：所有人各走一回合后，到 {$2} 回合开始恢复", nm(p), sqn(IX.eks), nm(p))); }
    } },
  { dlc: 'inc26', n: _t(5376, "Docker Hub 拉镜像被限流"), c: 'avail', e: _t(5377, "扩容时每个新任务都匿名去 Docker Hub 拉镜像，超了拉取次数上限，新任务起不来：你的 ECS、EKS 变成 Impaired"), im: _t(5378, "持有 ECR（拉取缓存把公共镜像缓存在自己的仓库里）；名下没有 ECS、EKS 不受影响"), tip: _t(5379, "Docker Hub 对匿名和免费账号按 IP 限制拉取次数，NAT 网关后面的一大批节点共用一个出口 IP，很快就用完。用 ECR 拉取缓存规则同步 Docker Hub、ECR Public 上的镜像，节点只从自己的 ECR 拉"), art: 'ecr',
    imm: o => !owns(o, IX.ecs) && !owns(o, IX.eks) ? _t(5380, "没有 ECS、EKS") : active(o, IX.ecr) ? _t(5381, "有 ECR 拉取缓存") : '',
    hits: p => ctrHit(p).length > 0, run: async p => {
      const hit = ctrHit(p);
      if (!hit.length) { log(_tf(5382, "{$0} 的容器服务没在收费，不受影响", nm(p))); return 'nopen'; }
      impair(hit); log(_tf(3156, "{$0} 的 {$1} 变成 Impaired", nm(p), hit.map(sqn).join(_t(349, "、"))));
    } },
  // 全场事件（all）：engine/17-health.js 的 incident 直接调 run，不弹抵消窗、不能甩锅，抽卡的人在监管沙盒里也照样全场结算；不给抽卡的人记技术债。
  // Impaired 和奖励按每个人名下的服务算，在监管沙盒里的人（immuneTill）这次不受影响，也不领奖励
  { dlc: 'inc26', n: _t(5383, "黑色星期五大促"), c: 'avail', e: _t(5384, "全场：流量一下子翻了几倍，Auto Scaling 来不及从零开始加机器。所有人名下没有弹性扩展功能的实例型服务变成 Impaired；有弹性扩展的每块从亚马逊云科技领 $50（每人最多领 $200）。全场事件，不能抵消"), im: _t(5385, "按块算：升了弹性扩展（EC2 跨 AZ Auto Scaling、ECS 服务自动扩缩、EKS Karpenter、RDS 只读副本、Aurora Auto Scaling……）的服务扛住了，还多赚一笔"), tip: _t(5386, "可以预期的大促别等指标涨了才扩容：用定时扩缩或预测性扩缩提前加机器，提前压测、确认服务配额够用；新机器起来要几分钟，突发流量先靠队列和限流挡一挡"), art: 'ec2',
    all: true, imm: o => '', hits: p => false, run: async p => {
      const all = S.players.filter(inPlay);
      let any = false;
      for (const o of all) {
        if (o.immuneTill >= S.round) { log(_tf(3196, "🛡️ {$0} 在「监管沙盒」里，免疫「{$1}」", nm(o), _t(5383, "黑色星期五大促"))); continue; }
        const hit = bfHit(o), ok = bfOk(o);
        if (hit.length) { any = true; impair(hit); log(_tf(5387, "{$0} 的 {$1} 被大促流量打挂，变成 Impaired", nm(o), hit.map(sqn).join(_t(349, "、")))); }
        if (ok.length) { any = true; log(_tf(5388, "📈 {$0} 的 {$1} 自动扩容接住了大促流量，领 ${$2}", nm(o), ok.map(sqn).join(_t(349, "、")), credit(o, 50 * Math.min(4, ok.length)))); }
      }
      if (!any) log(_t(5389, "场上还没有实例型服务，大促没打挂谁"));
      return 'nopen';
    } },
]), v => { INC26 = v; }, () => INC26);
