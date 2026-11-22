import { __rv, _t, _tf, _tr } from '../core/01-i18n-runtime.js';
import { $, PAWN, awsImg, clean } from '../core/02-util.js';
import { BAL, BILL_N, CAP_MAX, DISC_GENAI, DISC_GENAI_SVC, DISC_PRICE, GENAI_K, GROUPS, IX, SQ, TOKEN, TYPE_N, aliasQ, capU, effLabel, grpN, haTag, lvFull, lvName, qNorm, upCost, upCostsTxt } from '../rules/03-services.js';
import { ARCH_CAT, ARCH_CATS, CATS, COMBOS, INC, REI, ROLES, cAll, cLink, comboOpen, slotOpen } from '../rules/04-roles-combos-cards.js';
import { P, S, WILD_PARTS, __set_S, active, cur, hasCombo, isWild, logBody } from '../engine/07-state.js';
import { baseRent0, capCost, chainTxt, chainWith, jointRent, shownRent, spotMine, trafficMul } from '../engine/09-rent.js';
import { PHONE_MQ, ask, modal, viewOpen } from './10-modal.js';
import { propStatusHtml, trapLine } from './11-cards-deeds.js';
import { rentAt, runAt, runIfMine, useFeeTxt } from '../engine/11b-rent-info.js';
import { propInfoHtml } from './11c-level-table.js';
import { SQPOP_I, sqTip } from './27a-board.js';
import { LB_ICO, archBtns, fitArch, learnDir, needLine, needSquares, svcBtn } from './27b-arch-notes.js';
import { roleAttr } from './27c-center.js';
import { svcState } from './27d-side.js';
import { isHidden } from '../rules/35-modes.js';
import { viewerP } from '../engine/36-ai.js';
// 点格子：弹出这一格的小面板（现状 + 历史记录）。面板只在自己这台设备上，不走游戏弹窗，不会打断别人的回合
// 每块服务的介绍：[是什么, 常用来做什么]。点格子的面板和「看完整介绍」都放在最上面，边玩边认识服务
export let SVC_INTRO = __rv(() => ({
  s3: [_t(4371, "对象存储：文件当成「对象」放进桶里，按存的数据量和请求次数收费，容量不用提前规划。标准存储类会把数据存到一个区域里至少 3 个 AZ。"), _t(4372, "网站图片和静态资源、数据湖、备份归档、日志")],
  efs: [_t(4373, "托管的共享文件系统（NFS）：多台 EC2、容器、Lambda 能同时挂载同一个目录，容量随写随涨，按用了多少收费。"), _t(4374, "多台服务器共用的文件、内容管理、机器学习训练数据")],
  cognito: [_t(4375, "给你的 App 和网站管用户登录：用户池存账号，负责注册、登录、MFA，登录后发 JWT 令牌；身份池把登录的用户换成临时的亚马逊云科技凭证，App 可以直接访问 S3 这类服务。按月活跃用户（MAU）计费。"), _t(4376, "App 和网站的注册登录、给 API 加登录校验（API Gateway、ALB 都能直接认 Cognito 的令牌）、手机 App 直传文件到 S3")],
  agentcore: [_t(4377, "Bedrock AgentCore：把 AI 智能体推上生产的托管平台。Runtime 托管运行智能体（LangGraph、CrewAI、Strands 这些框架都能用），每个会话跑在单独的 microVM 里，按实际用的算力计费；Memory、Gateway、Identity、Observability 这些组件按需组合。"), _t(4378, "客服助手、运维助手、能调业务接口的 AI 助理")],
  ec2: [_t(4379, "云上的虚拟服务器：自己选 CPU、内存和操作系统，按秒计费，可以用按需、Savings Plans、Spot 等方式买。每台实例在一个 AZ 里，要高可用得在多个 AZ 各放几台，配合 ELB 和 Auto Scaling。"), _t(4380, "跑各种应用、需要完全控制操作系统的场景")],
  ebs: [_t(4381, "给 EC2 用的块存储（云硬盘）：一块卷挂在同一个 AZ 的实例上当系统盘或数据盘，可以打快照备份。卷只在一个 AZ 里。"), _t(4382, "系统盘、自建数据库的数据盘")],
  vpc: [_t(4383, "你在云上的私有网络：自己划网段、子网、路由表和安全组，决定哪些资源能访问公网。VPC 本身不收费。"), _t(4384, "把对外的负载均衡放公有子网，应用和数据库放私有子网")],
  elb: [_t(4385, "负载均衡：把流量分给后面多台 EC2、容器或 Lambda，自动绕开不健康的；ALB 处理 HTTP/HTTPS，NLB 处理 TCP/UDP。"), _t(4386, "网站和 API 的统一入口、多 AZ 高可用")],
  route53: [_t(4387, "托管的 DNS：注册和解析域名，能按健康检查做故障切换，按延迟或地理位置把用户引到不同区域。全局服务，可用性 SLA 是 100%。"), _t(4388, "域名解析、跨区域容灾切换")],
  ecr: [_t(4389, "托管的容器镜像仓库：存放 Docker / OCI 镜像，可以扫描漏洞，ECS、EKS 直接从这里拉镜像。"), _t(4390, "CI/CD 构建完镜像推上去，部署时拉下来")],
  ecs: [_t(4391, "亚马逊云科技自己的容器编排服务：告诉它要跑几个任务，它负责调度、替换坏掉的；底层可以用 EC2，也可以用 Fargate（不用管服务器）。"), _t(4392, "微服务、批处理任务")],
  eks: [_t(4393, "托管的 Kubernetes：控制平面由亚马逊云科技在多个 AZ 里运行，每个集群按小时收费；工作节点可以用 EC2、托管节点组、Fargate 或 Auto Mode。"), _t(4394, "已经在用 Kubernetes 的团队上云、多环境统一部署")],
  lambda: [_t(4395, "无服务器函数：上传代码，有事件来才运行，按请求次数和运行时长（毫秒）收费，没请求不收钱；单次最长运行 15 分钟。"), _t(4396, "API 后端、处理 S3 上传的文件、定时任务")],
  apigw: [_t(4397, "托管的 API 入口：创建 REST、HTTP、WebSocket API，负责鉴权、限流和缓存，后面接 Lambda 或其他服务，按调用次数收费。"), _t(4398, "Serverless API、移动应用和小程序后端")],
  dynamodb: [_t(4399, "Serverless 的键值和文档数据库：毫秒级读写，按需模式按请求收费，数据自动存在多个 AZ；全局表可以多区域同时读写。"), _t(4400, "用户会话、购物车、游戏数据、高并发场景")],
  sqs: [_t(4401, "托管的消息队列：生产者把消息放进队列，消费者按自己的速度取。标准队列至少送达一次，FIFO 队列保证顺序。"), _t(4402, "订单削峰填谷、把系统拆开互不拖累、异步任务")],
  eventbridge: [_t(4403, "Serverless 事件总线：把亚马逊云科技服务、自己的应用和 SaaS 发出的事件按规则转给 Lambda、Step Functions 等，也能定时触发。"), _t(4404, "事件驱动架构、跨账户分发事件、定时任务")],
  sfn: [_t(4405, "可视化的工作流编排：把 Lambda、容器任务和各种服务的 API 调用串成状态机，自带重试、分支、并行，还能停下来等人工审批。"), _t(4406, "订单处理流程、数据处理流水线、编排 AI Agent 的步骤")],
  rds: [_t(4407, "托管的关系数据库：支持 MySQL、PostgreSQL、MariaDB、Oracle、SQL Server、Db2，帮你做备份、打补丁和故障切换。多 AZ 部署会在另一个 AZ 放一台备用实例。"), _t(4408, "传统业务系统、电商订单库")],
  aurora: [_t(4409, "亚马逊云科技自研的云原生关系数据库，兼容 MySQL 和 PostgreSQL：数据在 3 个 AZ 里存 6 份，最多 15 个只读副本；Aurora Serverless v2 按负载自动伸缩，Global Database 能跨区域。"), _t(4410, "高并发的核心业务数据库")],
  elasticache: [_t(4411, "托管的内存缓存：Valkey、Redis OSS、Memcached，读写在微秒到毫秒级，挡在数据库前面扛热点读。"), _t(4412, "缓存热点数据、会话、排行榜")],
  kinesis: [_t(4413, "实时数据流：Kinesis Data Streams 接住每秒大量的事件，多个程序同时读；Data Firehose 能把数据直接送进 S3、Redshift、OpenSearch。"), _t(4414, "点击流和日志实时分析、实时大屏、IoT 数据")],
  glue: [_t(4415, "Serverless 的数据集成（ETL）服务：爬取数据源建数据目录，用 Spark 作业清洗、转换数据，按运行时长收费。"), _t(4416, "数据湖入湖、给 Athena 和 Redshift 准备数据")],
  athena: [_t(4417, "Serverless 交互式查询：直接用 SQL 查 S3 里的数据，不用建集群，按扫描的数据量收费。数据存成列式格式、按日期分区，能少扫很多、省钱。"), _t(4418, "日志分析、数据湖临时查询")],
  redshift: [_t(4419, "云数据仓库：列式存储、大规模并行处理，用 SQL 分析海量数据；有预置集群和 Redshift Serverless 两种用法。"), _t(4420, "BI 报表、经营分析")],
  dms: [_t(4421, "数据库迁移服务：把机房或别的云上的数据库搬到亚马逊云科技，同构（MySQL 到 RDS for MySQL）、异构（Oracle 到 Aurora PostgreSQL）都行；全量搬完以后还能持续抓源库的变更（CDC），新旧库一直对得上，割接时停机很短。按复制实例的小时计费，也有按用量的 DMS Serverless。"), _t(4422, "数据库上云、把业务库的改动实时同步到数据湖、搜索或数仓（CDC）")],
  opensearch: [_t(4423, "托管的 OpenSearch（从 Elasticsearch 分出来的开源项目）：全文搜索、日志分析和可视化，也能当向量数据库用。"), _t(4424, "站内搜索、日志检索、RAG 的向量检索")],
  guardduty: [_t(4425, "威胁检测：持续分析 CloudTrail 事件、VPC 流日志和 DNS 日志等，发现挖矿、凭证泄露、异常访问。它只负责发现、不负责拦截，要配合 EventBridge 和 Lambda 自动处置。"), _t(4426, "账户安全监控、自动响应安全事件")],
  inspector: [_t(4427, "自动漏洞扫描：持续扫描 EC2、ECR 里的容器镜像和 Lambda 函数，找出软件漏洞和不该暴露的网络端口，按风险打分。"), _t(4428, "补丁管理、合规检查")],
  kms: [_t(4429, "托管的密钥管理：创建和管理加密密钥，S3、EBS、RDS 等服务用它加密数据，密钥不会以明文离开 KMS，每次使用都有 CloudTrail 记录。"), _t(4430, "静态数据加密、控制谁能解密数据")],
  cloudfront: [_t(4431, "CDN：把网站、视频和 API 缓存到全球各地的边缘站点，用户就近访问，减轻源站压力；自带 Shield Standard 挡常见的 DDoS。"), _t(4432, "网站和静态资源加速、视频分发")],
  waf: [_t(4433, "Web 应用防火墙：挂在 CloudFront、ALB、API Gateway 前面，按规则拦 SQL 注入、跨站脚本和恶意机器人，还能按 IP 限速。"), _t(4434, "防常见 Web 攻击、防刷接口")],
  shield: [_t(4435, "DDoS 防护：所有账户都免费带 Shield Standard，挡常见的网络层攻击；Shield Advanced 是付费订阅，加上应用层防护、DDoS 响应团队支持和攻击期间扩容费用补偿。"), _t(4436, "对 DDoS 敏感的大型网站、游戏、金融业务")],
  sagemaker: [_t(4437, "机器学习平台：在上面准备数据、训练、调参和部署模型，有托管的 Notebook 环境，推理端点按实例时长收费。"), _t(4438, "训练自己的模型、部署推理服务")],
  bedrock: [_t(4439, "用 API 调用多家公司的基础模型（Anthropic Claude、Amazon Nova、Meta Llama、Mistral 等），按输入输出的 token 收费；还有知识库、Agents、Guardrails。你的数据不会被拿去训练模型。"), _t(4440, "聊天机器人、内容生成、AI Agent")],
  cloudwatch: [_t(4441, "监控和可观测性：收集指标、日志和事件，设告警、做仪表板，告警可以通知人，也能触发 Auto Scaling 自动扩容。"), _t(4442, "盯 CPU、错误率和延迟，出事自动告警")],
  config: [_t(4443, "配置记录和合规检查：持续记录账户里每个资源的配置和变更历史，用规则检查合不合规（比如 S3 桶有没有公开、EBS 卷有没有加密），不合规的可以自动修正。"), _t(4444, "合规审计、查清楚是谁把配置改坏了、自动把公开的 S3 桶改回私有")],
  cloudtrail: [_t(4445, "记录账户里的 API 调用：谁在什么时间、从哪里、做了什么操作。控制台默认能查最近 90 天的管理事件；建跟踪可以长期存进 S3。"), _t(4446, "安全审计、查清楚是谁删了资源")],
}), v => { SVC_INTRO = v; }, () => SVC_INTRO);
// 购买前就近说明万能服务的用途；复用介绍框，服务详情和普通服务保持原样。
function wildPurchaseInfo(i) {
  if (!isWild(i)) return '';
  const bound = !!(S.props[i] && S.props[i].wild);
  const use = bound ? _t(4447, "这块万能服务已绑定过；买下后原绑定失效，不能重新绑定。") : _t(4448, "万能服务：能补上架构缺的一块，或并入已齐架构收过路费；需手动绑定，通常不能改绑。");
  const limit = bound ? '' : SQ[i].k === 'kms' ? _t(4449, "只能绑定含存储或数据库服务的架构。") : SQ[i].k === 'vpc' ? _t(4450, "只能绑定含可接入 VPC 的服务的架构。") : '';
  return _tf(4452, "<p><b>游戏中</b>{$0}</p>{$1}", use, limit ? _tf(4451, "<p><b>限制</b>{$0}</p>", limit) : '');
}
export const introHtml = (i, buying = false) => { const x = SVC_INTRO[SQ[i].k]; return x ? `<div class="svc-intro"><p>${_tf(4453, "<b>是什么</b>{$0}", x[0])}</p><p>${_tf(4454, "<b>常用来</b>{$0}", x[1])}</p>${GENAI_K.includes(SQ[i].k) ? `<p class="sv-disc">${DISC_GENAI_SVC}</p>` : ''}${buying ? wildPurchaseInfo(i) : ''}<p class="sv-gal">${_tf(4455, "<a href=\"#\" data-gal=\"{$0}\">在图鉴里看 {$1}：升级路线、过路费、高可用 →</a>", SQ[i].k, SQ[i].n)}</p></div>` : ''; };
// 打开图鉴、跳到服务一览里这一块并闪一下；开着完整介绍窗的话先关掉
async function galleryAt(k) {
  closeSqPop();
  if (viewOpen()) { const b = $('#vmodal .btns button.pri'); if (b) b.click(); await new Promise(r => setTimeout(r, 80)); }
  gallery();
  setTimeout(() => {
    const box = $('#vmodal .box'); if (!box) return;
    const row = box.querySelector(`tr.gsvc[data-k="${k}"]`) || [...box.querySelectorAll('h4')].find(h => _tr(4456, "服务一览", "").test(h.textContent)); if (!row) return;
    const head = [box.querySelector('h3'), box.querySelector('.mtoc')].reduce((a, e) => a + (e ? e.offsetHeight : 0), 0);
    box.scrollTop += row.getBoundingClientRect().top - box.getBoundingClientRect().top - head - 12;
    if (row.tagName === 'TR') { row.classList.add('gflash'); setTimeout(() => row.classList.remove('gflash'), 2000); }
  }, 150);
}
document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('[data-gal]'); if (!a) return; e.preventDefault(); galleryAt(a.dataset.gal); });
// 升级路线：一级一张小卡（面板窄，表格四列会把字挤成一列）。卡头是级别和升级价，下面一行是这一级的过路费、运行费，再下面是效果和现实里是什么
function lvCardsHtml(i) {
  const s = SQ[i], pr = S.props[i], lv = pr ? pr.level : -1, tm = trafficMul();
  const R = l => rentAt(i, l), rt = x => x.pt != null ? _tf(4457, "骰子点数 × {$0}（掷 7 点 ${$1}）", +x.pt.toFixed(1), Math.round(x.pt * 7)) : `$${Math.round(x.v)}`;
  const fees = [0, 1, 2, 3].map(l => useFeeTxt(i, l)), feeSame = fees.every(x => x === fees[0]);
  const item = l => {
    const x = R(l), d = l ? (x.pt != null ? Math.round((x.pt - R(l - 1).pt) * 7) : Math.round(x.v - R(l - 1).v)) : 0, eff = l ? effLabel(i, l) : '';
    return `<li class="${lv === l ? 'cur' : ''}"><div class="lvc-h"><b>${l ? _tf(4458, "第 {$0} 级 · {$1}", l, lvName(i, l)) : _tf(2755, "未升级 · {$0}", lvName(i, 0))}</b>${lv === l ? _t(4459, "<span class=\"lvc-now\">现在</span>") : ''}${l ? _tf(4460, "<span class=\"lvc-p\">升级 ${$0}</span>", upCost(i, l)) : ''}</div>
      <div class="lvc-n">${_tf(4463, "过路费 <b>{$0}</b>{$1} · 运行费 ${$2}/圈", rt(x), d > 0 ? _tf(4462, "<span class=\"lvc-up\">多收 ${$0}{$1}</span>", d, x.pt != null ? _t(4461, "（掷 7 点）") : '') : '', pr ? runIfMine(i, () => runAt(i, l)) : 0)}</div>
      ${eff ? `<div class="lvc-e">${eff}</div>` : ''}${l && s.upg[l - 1][3] ? `<div class="lvc-d">${s.upg[l - 1][3]}</div>` : ''}</li>`;
  };
  const notes = [R(0).pt != null ? _t(4464, "骰子点数：落在这一格的人这次掷出的两颗骰子加起来（2–12，平均 7）") : '', _t(4465, "运行费每走完一圈、经过 Startup 扶持时交一次"),
    fees[0] ? (feeSame ? _tf(2815, "另外每次{$0}", fees[0]) : _tf(2819, "收到过路费另交：{$0}", [0, 1, 2, 3].filter(l => !l || fees[l] !== fees[l - 1]).map(l => `${l ? _tf(2816, "第 {$0} 级起", l) : _t(2817, "未升级")} ${fees[l].replace(_tr(2818, "^收到过路费交 ", ""), '')}`).join(_t(2698, "，")))) : '',
    tm !== 1 ? _tf(2820, "过路费已按现在的流量 ×{$0} 算", tm) : ''].filter(Boolean);
  return _tf(4466, "<ol class=\"lvc\">{$0}</ol><p class=\"sp-n\">{$1}。</p>", [0, 1, 2, 3].map(item).join(''), notes.join(_t(408, "；")));
}
// 服务面板的正文。顺序按玩的时候要看的先后：三个数（价格、现在的过路费、每圈运行费）→ 归谁、在第几级 → 能不能帮你补齐架构
// → 这是什么服务 → 升级路线（各级一览）→ 关联的架构。去掉了以前状态表里和各级一览重复的「升级后」两行
// 过路费明细：组成联合收费的每一块各收多少。数都是 jointRent 已经算好的（以前只写在格子的悬停提示里）
function rentBreakHtml(i) {
  const pr = S.props[i]; if (!pr || pr.owner === null || pr.offline || pr.ddos != null || pr.impaired) return '';
  let sr = null; try { sr = shownRent(i); } catch (e) { return ''; }
  if (!sr || !sr.jr || !sr.r) return '';
  const jr = sr.jr, ce = BAL.chainExtra ?? 1;
  const rows = jr.parts.map(m => `<li${m === i ? ' class="here"' : ''}>${awsImg(SQ[m].icon)}<span>${SQ[m].n}</span>${jr.half.includes(m) && ce !== 1 ? _tf(2939, "<em>×{$0}</em>", ce) : ''}<b>$${jr.rentOf(m)}</b></li>`).join('');
  return `<h5>${_t(2936, "过路费明细")}</h5><p class="sp-n">${_tf(2938, "{$0}整套架构一起收：别人落在其中任意一块，都按下面这些加起来付", jr.cs.map(c => _tf(2766, "「{$0}」", c.n)).join(jr.cs.length > 1 ? _t(2767, "串联") : ''))}</p><ul class="rentbk">${rows}<li class="tot">${_tf(2937, "合计 ${$0}", jr.tot)}</li></ul>`;
}
function sqPanelHtml(i) {
  const s = SQ[i], pr = S.props[i], o = pr && pr.owner != null ? P(pr.owner) : null, util = s.t === 'util';
  const billTxt = { hour: _t(4467, "按小时计费"), req: _t(4468, "按用量计费"), sub: _t(356, "订阅"), token: _t(354, "按 token 计费"), free: _t(358, "免费"), bundle: _t(359, "打包价") }[s.bill] || '';
  const tile = (k, v, n = '') => `<div class="sp-k"><small>${k}</small><b>${v}</b>${n ? `<em>${n}</em>` : ''}</div>`;
  let rent = '', rentN = '';
  if (o) {
    if (pr.offline) { rent = '$0'; rentN = _t(4469, "已下线，不收"); }
    else if (pr.ddos != null) { rent = '$0'; rentN = pr.ddosWhy ? _t(4469, "已下线，不收") : _t(4470, "被 DDoS，不收"); }
    else if (pr.impaired) { rent = '$0'; rentN = _t(4471, "Impaired，暂停"); }
    else { let sr = null; try { sr = shownRent(i); } catch (e) { } if (!sr || !sr.r) { rent = '$0'; rentN = _t(4472, "代理商库存，没成架构不收"); } else { rent = sr.txt.replace(_t(2763, "点数×"), _t(2764, "骰子点数 × ")); rentN = sr.cap ? _tf(4473, "保护期封顶，之后 {$0}", sr.fullTxt.replace(_t(2763, "点数×"), _t(2764, "骰子点数 × "))) : sr.jr ? _t(4474, "整套架构联合收费") : (s.bill === 'req' || s.bill === 'token' || util) ? _t(4475, "随骰子点数浮动") : ''; } }
  } else { const x = rentAt(i, 0); rent = x.pt != null ? _tf(2800, "骰子点数 × {$0}", +x.pt.toFixed(1)) : `$${Math.round(x.v)}`; rentN = x.pt != null ? _tf(4476, "买下后，掷 7 点 ${$0}", Math.round(x.pt * 7)) : _t(2772, "买下后"); }
  const run = runIfMine(i), fee = useFeeTxt(i, pr ? pr.level : 0);
  const kpi = `<div class="sp-kpi">${tile(_t(4477, "价格"), pr && pr.spot && spotMine(i) ? `$${pr.spotPaid}` : `$${s.p}`, pr && pr.spot ? (spotMine(i) ? _t(4478, "你的 Spot 出价") : _t(4479, "Spot 出价看不到")) : '')}${tile(_t(3845, "过路费"), rent, rentN)}${tile(_t(4480, "运行费 / 圈"), `$${run}`, fee ? fee.replace(_t(4481, "收到过路费交 "), _t(4482, "另交收到的 ")) : o ? _t(4483, "经过起点时交") : _t(4484, "买下后，经过起点时交"))}</div>`;
  const chips = o ? svcState(i).map(x => `<span class="sp-chip ${x.k}">${x.head}</span>`).join('') : '';
  const own = o ? `<div class="sp-own"><span class="sp-who"><i style="background:${o.color}"></i>${o.name}</span>${s.upg ? `<span>${lvFull(i, pr.level)}</span>` : ''}${pr.cap ? _tf(4485, "<span>容量 {$0} 个{$1}</span>", pr.cap, capU(s.k)) : ''}${chips}</div>`
    : _t(4486, "<div class=\"sp-own none\">没人买，落上来就能买</div>");
  const nl = needLine(i, needSquares());
  const ha = haTag(i), haBox = ha ? `<div class="hatag ${ha.k}"><b>${ha.t}</b><span>${ha.d}</span></div>` : '';
  const who = o || viewerP() || cur();
  const cbs = COMBOS.filter(c => cAll(c).includes(i) && comboOpen(c)).map(c => {
    const have = c.ix.filter(n => (Array.isArray(n) ? n : [n]).some(k => active(who, k))), miss = c.ix.filter(n => !have.includes(n)), done = !miss.length, opt = !c.ix.flat().includes(i);
    const ch = done && o && o.id === who.id ? chainWith(o, c).filter(x => x.sh.includes(i)) : [];
    return `<li class="${done ? 'done' : ''}" data-arch="${c.id}" data-p="${who.id}"><b>${c.n}${opt ? _t(4487, "<em class=\"sp-opt\">可选</em>") : ''}</b><span class="sp-pg">${have.length}/${c.ix.length}</span><small>${done ? (ch.length ? _tf(4488, "已生效；落在这一块上和{$0}串在一起收", ch.map(x => _tf(2766, "「{$0}」", x.c.n)).join('')) : _t(4489, "已生效，整套联合收费")) : _tf(4490, "还差 {$0}", miss.map(n => slotOpen(n).map(k => SQ[k].n).join(_t(1815, " 或 "))).join(_t(349, "、")))}</small></li>`;
  }).join('');
  const upNote = _tf(4494, "升级基础价 {$0}，落在自己的服务上才能升一级；落地时按你的情况可能加钱或减半，弹窗里会写明{$1}", upCostsTxt(i), s.t === 'prop' ? _tf(4492, "。每个{$0} ${$1}，过路费 +25%，最多 {$2} 个{$3}", capU(s.k), capCost(i), CAP_MAX, pr && pr.cap ? _tf(4491, "（现在 {$0} 个）", pr.cap) : '') : _t(4493, "。这一格没有容量可加"));
  return `<div class="sp-sub">${grpN(s.g)}${s.type !== 'token' && !util ? ` · ${TYPE_N[s.type]}` : ''} · ${billTxt}</div>${kpi}${own}${nl ? `<div class="psneed">${nl}</div>` : ''}${introHtml(i)}${haBox}${rentBreakHtml(i)}
    <h5>${_t(4497, "升级路线")}</h5>${lvCardsHtml(i)}<p class="sp-n">${upNote}</p>
    ${cbs ? _tf(4496, "<h5>关联的有效架构<span class=\"muted\">按{$0}现在持有的算</span></h5><ul class=\"sp-cb\">{$1}</ul>{$2}", o ? ` ${o.name} ` : _t(2456, "你"), cbs, (jr => jr && jr.cs.length > 1 ? _tf(4495, "<p class=\"sp-n chain\">别人落在这一块上：{$0} 串在一起收，共用的服务只算一次，按 7 点约 ${$1}</p>", jr.cs.map(c => _tf(2766, "「{$0}」", c.n)).join(' + '), jr.tot) : '')(o && !pr.offline && !pr.impaired && pr.ddos == null ? jointRent(i, 7) : null)) : ''}`;
}
export function showSquare(i) {
  if (!S) return;
  const s = SQ[i], h = ((S.hist || {})[i] || []).slice().reverse();
  let el = $('#sqpop'); if (!el) { el = document.createElement('div'); el.id = 'sqpop'; el.setAttribute('role', 'dialog'); document.body.appendChild(el); }
  // 服务格：价格和计费方式、现在的状态、各级一览（效果、过路费、每圈运行费）、升级和加容量的价格
  const svc = ['prop', 'util'].includes(s.t) && s.upg && !isHidden(i), pr = S.props[i];
  const status = isHidden(i) ? _t(4498, "<p>娱乐模式里，不常用的服务格变成盲盒：落上去随机抽一张 Health 或 re:Invent 卡，效果翻倍。</p>") : svc ? sqPanelHtml(i) : ['prop', 'util'].includes(s.t) && !isHidden(i) ? introHtml(i) + propStatusHtml(i) : `<p>${sqTip(i).split('\n').slice(1, -1).join('<br>')}</p>`;
  el.setAttribute('aria-label', _tf(4499, "{$0} 的历史记录", s.n));
  el.innerHTML = `<div class="sp-h">${awsImg(isHidden(i) ? 'reinvent' : s.icon)}<b>${isHidden(i) ? _t(4500, "盲盒格") : s.n}</b><button type="button" class="sm" data-act="closeSqPop" aria-label="${_t(2610, "关闭")}">${_t(2610, "关闭")}</button></div>
    <div class="sp-b">${trapLine(i) ? `<p class="sp-trap">${trapLine(i)}</p>` : ''}${status}${h.length ? _tf(4502, "<details class=\"sp-hist\"><summary>这一格的记录（{$0} 条，新的在上面）</summary><ol class=\"sp-l\">{$1}</ol></details>", h.length, h.map(x => _tf(4501, "<li><em>第 {$0} 轮</em>{$1}</li>", x.r, clean(logBody(x.t)))).join('')) : _t(4503, "<p class=\"sp-n\">这一格还没有发生过什么。</p>")}
    ${isHidden(i) ? '' : _tf(4504, "<div class=\"sp-act\"><button type=\"button\" class=\"sm\" data-act=\"showSquareFull\" data-arg=\"{$0}\">看完整介绍</button>{$1}</div>", i, ['prop', 'util'].includes(s.t) ? svcBtn(s) : '')}</div>`;
  el.hidden = false; el.classList.add('on');
  if (SQPOP_I != null) $('#sq' + SQPOP_I)?.classList.remove('sel');
  SQPOP_I = i; $('#sq' + i).classList.add('sel');
  sqPopDrag(el); placeSqPop();
  const from = document.activeElement; el._from = from && from.closest && from.closest('.sq') ? from : null;
  if (el._from) el.querySelector('.sp-h button').focus();   // 用键盘打开的：焦点进面板
  setTimeout(() => { document.addEventListener('pointerdown', sqPopOutside); document.addEventListener('keydown', sqPopKey); }, 0);
}
// 手机竖屏面板贴底，正好压住棋盘下半截和刚点的格子：有地方就把面板顶到棋盘底排下面，整块棋盘都露着，挨着点别的格子不用先关；
// 横屏棋盘在中间，面板放到格子对面那一侧，宽度收到碰不着这一格。地方不够（小屏、棋盘滚出去了）照旧贴底
// 格子面板能拖：按住标题栏拖到别处，之后再点别的格子也开在拖过去的地方（刷新页面前一直记着）；手机布局不拖，照旧贴底
let SQPOP_POS = null;
function sqPopDrag(el) {
  const h = el.querySelector('.sp-h'); if (!h || PHONE_MQ.matches) return;
  h.onpointerdown = e => {
    if (e.button !== 0 || e.target.closest('button')) return;
    const r = el.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    e.preventDefault(); h.setPointerCapture(e.pointerId); el.classList.add('drag');
    const mv = ev => { SQPOP_POS = { x: ev.clientX - dx, y: ev.clientY - dy }; placeSqPop(); };
    const up = () => { el.classList.remove('drag'); h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up); };
    h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
  };
}
export function placeSqPop() {
  const el = $('#sqpop'); if (!el || el.hidden) return;
  el.style.top = el.style.bottom = el.style.maxHeight = el.style.width = ''; el.style.left = el.style.right = ''; el.classList.remove('at-l');
  // 拖过的：放在拖到的地方，不让整块跑出屏幕（标题栏至少留在屏幕里）
  if (SQPOP_POS && !PHONE_MQ.matches) { const w = el.offsetWidth, x = Math.max(8, Math.min(innerWidth - w - 8, SQPOP_POS.x)), y = Math.max(8, Math.min(innerHeight - 48, SQPOP_POS.y)); el.style.left = x + 'px'; el.style.right = 'auto'; el.style.top = y + 'px'; el.style.maxHeight = (innerHeight - y - 16) + 'px'; return; }
  if (!PHONE_MQ.matches || SQPOP_I == null) return;
  const c = $('#sq' + SQPOP_I).getBoundingClientRect(), cs = getComputedStyle(el), bot = parseFloat(cs.bottom) || 0, rgap = parseFloat(cs.right) || 0;
  if (innerWidth > innerHeight) {
    const b = $('#board').getBoundingClientRect(), atL = c.left + c.width / 2 > b.left + b.width / 2;
    const room = atL ? c.left - 16 : innerWidth - rgap - c.right - 8;
    if (room >= 260) { el.classList.toggle('at-l', atL); if (room < el.offsetWidth) el.style.width = room + 'px'; return; }
    // 上下两排靠中间的格子，左右都放不下一个面板（窄于 260 字就挤成一条）：改放到这一格的下面或上面，横着铺开
    el.classList.add('at-l'); el.style.width = innerWidth - rgap - 8 + 'px';
    if (c.top + c.height / 2 < innerHeight / 2) el.style.top = Math.max(8, c.bottom + 8) + 'px'; else el.style.bottom = Math.max(bot, innerHeight - c.top + 8) + 'px';
    return;
  }
  const top = Math.max($('#sq0').getBoundingClientRect().bottom + 8, innerHeight * .4 - bot), room = innerHeight - bot - top;
  if (room >= 200) { el.style.top = top + 'px'; el.style.bottom = 'auto'; el.style.maxHeight = room + 'px'; }
}
addEventListener('resize', placeSqPop);
export function closeSqPop() { const el = $('#sqpop'); if (SQPOP_I != null) { $('#sq' + SQPOP_I)?.classList.remove('sel'); SQPOP_I = null; } if (el) { el.classList.remove('on'); el.hidden = true; if (el._from && el.contains(document.activeElement)) el._from.focus(); el._from = null; } document.removeEventListener('pointerdown', sqPopOutside); document.removeEventListener('keydown', sqPopKey); }
function sqPopOutside(e) { const el = $('#sqpop'); if (el && !el.contains(e.target) && !e.target.closest('.sq, .here')) closeSqPop(); }
function sqPopKey(e) { if (e.key === 'Escape') closeSqPop(); }
export function showSquareFull(i) {
  if (!S) return;
  const s = SQ[i];
  if (isHidden(i)) return void ask({ local: true, cancelable: true, view: true, title: _t(4500, "盲盒格"), html: _t(4505, "<p>娱乐模式里，不常用的服务格变成盲盒：落在这里随机抽一张 Health 事件卡或 re:Invent 卡，效果翻倍。</p>"), buttons: [{ label: _t(2478, "知道了"), value: true, cls: 'pri' }] });
  if (['prop', 'util'].includes(s.t)) ask({ local: true, cancelable: true, view: true, cls: 'svcfull', title: `${s.n} · ${s.t === 'prop' ? grpN(s.g) : _t(2824, "按用量收费")}`, html: `<div class="sp-full">${s.upg ? sqPanelHtml(i) : propInfoHtml(i)}</div>`, buttons: [{ label: _tf(4506, "{$0}服务知识点", LB_ICO.book), value: 'kp' }, { label: _t(2478, "知道了"), value: true, cls: 'pri' }] }).then(v => { if (v === 'kp') window.open(`${learnDir()}svc/${s.k}.html`, '_blank', 'noopener'); });
  else ask({ local: true, cancelable: true, view: true, title: s.n, html: `<p>${s.d || ''}</p>`, buttons: [{ label: _t(2478, "知道了"), value: true, cls: 'pri' }] });
}
// 某块服务现在在谁手上（对局里才有）：玩家写名字（带他的颜色），没人买写「没人买」；下线、Impaired 的另外标出来
function ownerOf(i, me) {
  if (!S || !S.players || !S.props || !S.props[i]) return '';
  const pr = S.props[i], o = pr.owner == null ? null : S.players[pr.owner];
  const st = pr.offline ? _t(4507, "·已下线") : pr.impaired ? '·Impaired' : '';
  if (!o) return _t(4508, "<small class=\"aow none\">没人买</small>");
  return `<small class="aow"><i style="--pc:${o.color}"></i>${me && o.id === me.id ? _t(2456, "你") : o.name}${st}</small>`;
}
// 图鉴里的架构图：每一格一个框，二选一的竖着叠在同一个框里，框之间画箭头；对局里有主的写归谁（没写的就是还没人买），娱乐模式藏起来的格子不画
export function archDiag(c, own = false) {
  const live = own && S && S.props;
  const svc = i => { const pr = live && S.props[i], o = pr && pr.owner != null ? S.players[pr.owner] : null;
    return `<div class="ar-s"${roleAttr(c, i)}>${awsImg(SQ[i].icon)}<span>${SQ[i].n}</span>${o ? `<small class="ownc" style="--pc:${o.color}">${o.name}${pr.offline ? _t(4509, "·下线") : pr.impaired ? '·Impaired' : ''}</small>` : ''}</div>`; };
  return `<div class="arg">${c.seq.map((x, k) => `${k ? `<i class="ar-ar" aria-hidden="true">${cLink(c, k - 1)}</i>` : ''}<div class="ar-slot${x.opt ? ' opt' : ''}">${x.opt ? _t(4510, "<em class=\"ar-optl\">可选</em>") : ''}${(live ? slotOpen(x.n) : Array.isArray(x.n) ? x.n : [x.n]).map(svc).join(_t(4511, "<i class=\"ar-or\">或</i>"))}</div>`).join('')}</div>`;
}
export function archFlow(c, own = false) {
  // 对局里：服务名一行、归谁写在下面一行（小字，前面一个主人颜色的圆点），不再挤在名字后面
  const chip = k => own ? `<span class="af af2">${awsImg(SQ[IX[k]].icon)}<span class="afn"><b>${SQ[IX[k]].n}</b>${ownerOf(IX[k])}</span></span>` : `<span class="af">${awsImg(SQ[IX[k]].icon)}${SQ[IX[k]].n}</span>`;
  // 「或」的几块竖着摞成一组（左边一道竖线），前后的箭头对着整组的中间；横着排的话后一块常被挤到下一行，像是接在箭头后面
  return c.need.map((n0, k) => { const n = n0 && n0.opt ? n0.opt : n0, h = Array.isArray(n) ? `<span class="orv">${n.map(chip).join(_t(4512, "<span class=\"or\">或</span>"))}</span>` : chip(n);
    return (k ? `<span class="arr">${cLink(c, k - 1)}</span>` : '') + (n0 && n0.opt ? _tf(4513, "<span class=\"optw\"><em>可选</em>{$0}</span>", h) : h); }).join('');
}
// 某块服务每一级的过路费（7 点、第 1 轮、不算容量和 DLC，只看服务本身）
function rentLevels(i) {
  if (SQ[i].bill === 'token') return [0, 1, 2, 3].map(l => `×${TOKEN[l]}`).join(' → ') + _t(4514, "（乘点数）");
  // 换一个完全独立的假局面算基准价（没人集齐整组、第 1 轮、不开 DLC），不碰真实状态，也不受 1 号玩家持有情况影响
  const saved = S, props = {}; SQ.forEach((q, k) => { props[k] = { owner: null, level: 0, cap: 0, offline: 0 }; });
  try { return [0, 1, 2, 3].map(l => { props[i] = { owner: 0, level: l, cap: 0, offline: 0 }; __set_S({ props, players: [{ id: 0 }], round: 1, cfg: { dlc: [] } }); return '$' + Math.round(baseRent0(i, 7)); }).join(' → '); }
  finally { __set_S(saved); }
}
const rentLvHtml = i => { const tk = SQ[i].bill === 'token', xs = rentLevels(i).replace(_tr(4515, "（乘点数）$", ""), '').split(' → ');
  return `<div class="rlv">${xs.map((x, l) => `<i>${l ? _tf(4516, "{$0} 级", l) : _t(2817, "未升级")}</i><b>${x}</b>`).join('')}</div>${tk ? _t(4517, "<small class=\"muted\">再乘骰子点数</small>") : ''}`; };
export function gallery() {
  const gord = Object.keys(GROUPS), svcRow = (s, i) => `<tr class="gsvc" data-k="${s.k}" data-q="${aliasQ(s.k)}" data-g="${s.g}" data-type="${s.type}" data-ha="${haTag(i).k}" data-bill="${s.bill}"><td><div class="gsn">${_tf(4518, "{$0}<span><b>{$1}</b><small>售价 ${$2}</small></span>", awsImg(s.icon), s.n, s.p)}</div>${svcBtn(s, 'xs')}</td><td class="gcol"><span class="gdot" style="--gc:${GROUPS[s.g].color}"></span>${grpN(s.g)}</td><td class="nw">${TYPE_N[s.type]}</td><td><span class="hatag-s ${haTag(i).k}">${haTag(i).t}</span></td><td class="nw">${BILL_N[s.bill]}</td><td>${rentLvHtml(i)}</td><td><ol class="gup">${s.upg.map((u, k) => `<li><b>${u[0]}</b>${u[3] ? _tf(2989, "：{$0}", u[3]) : ''}${effLabel(i, k + 1) ? `<small>${effLabel(i, k + 1)}</small>` : ''}</li>`).join('')}</ol></td></tr>`;
  // 11-08 按色组分组排：组名一行（色块、几块、都有谁），组里按棋盘顺序
  const svcRows = gord.filter(g => g !== 'util').map(g => { const xs = SQ.map((s, i) => [s, i]).filter(([s]) => s.t === 'prop' && s.g === g); return xs.length ? `<tr class="ggrp" data-g="${g}"><th colspan="7">${_tf(4519, "<span class=\"gdot\" style=\"--gc:{$0}\"></span>{$1}<small>{$2} 块 · {$3}</small>", GROUPS[g].color, grpN(g), xs.length, xs.map(([s]) => s.n).join(_t(349, "、")))}</th></tr>` + xs.map(([s, i]) => svcRow(s, i)).join('') : ''; }).join('');
  // 服务一览的筛选：色组、类型、高可用、计费，选项后面写有几块
  const props = SQ.map((x, i) => [x, i]).filter(([x]) => x.t === 'prop'), gk = Object.keys(GROUPS);
  const cnt = (fn, ord) => { const m = new Map(); props.forEach(([x, i]) => { const [v, t] = fn(x, i); m.set(v, [v, t, ((m.get(v) || [])[2] || 0) + 1]); }); const out = [...m.values()]; return ord ? out.sort((a, b) => ord(a[0]) - ord(b[0])) : out; };
  const gOpt = (key, lab, vals) => _tf(4521, "<label class=\"gf\"><span>{$0}</span><select data-f=\"{$1}\"><option value=\"\">全部</option>{$2}</select></label>", lab, key, vals.map(([v, t, n]) => _tf(4520, "<option value=\"{$0}\">{$1}（{$2}）</option>", v, t, n)).join(''));
  const gfil = _tf(4526, "<div class=\"gfil\" role=\"group\" aria-label=\"筛选服务\">{$0}{$1}{$2}{$3}<button type=\"button\" class=\"sm gf-clear\" hidden>清除筛选</button><span class=\"gf-n\" aria-live=\"polite\"></span></div>", gOpt('g', _t(4522, "色组"), cnt(x => [x.g, grpN(x.g)], v => gk.indexOf(v))), gOpt('type', _t(4523, "类型"), cnt(x => [x.type, TYPE_N[x.type]])), gOpt('ha', _t(4524, "高可用"), cnt((x, i) => [haTag(i).k, haTag(i).t])), gOpt('bill', _t(4525, "计费"), cnt(x => [x.bill, BILL_N[x.bill]])));
  // 对局中：每块服务下面写现在归谁，另一列写这个架构谁已经凑成了（开局页、演示里没有对局就不写）
  const live = !!(S && S.players && S.props);
  const doneBy = c => live ? S.players.filter(q => q.alive && hasCombo(q, c.id)) : [];
  // 每位玩家现在凑成的架构（画成带图标的小流程，每块下面写归谁），再列只差一块的
  const whoRows = live ? S.players.map(q => { const done = COMBOS.filter(c => hasCombo(q, c.id)), near = COMBOS.filter(comboOpen).filter(c => !hasCombo(q, c.id) && c.ix.filter(n => !(Array.isArray(n) ? n : [n]).some(i => active(q, i))).length === 1);
    return `<tr><td><small class="ownc big" style="--pc:${q.color}">${q.name}</small>${q.alive ? '' : _t(4527, "<div class=\"muted\">已出局</div>")}<div class="muted" style="font-size:12px">${_tf(3811, "{$0} 个", done.length)}</div></td><td>${done.length ? done.map(c => `<div class="who-a" data-arch="${c.id}"><b>${c.n}</b>${(t => t ? _tf(4528, "<small class=\"chain\">{$0}：别人落在共用的那块上，几套串在一起收</small>", t) : '')(chainTxt(q, c))}${archDiag(c, true)}</div>`).join('') : _t(4529, "<span class=\"muted\">还没凑成</span>")}${near.length ? _tf(4530, "<div class=\"muted\" style=\"font-size:12px;margin-top:6px\">只差一块：{$0}</div>", near.map(c => c.n).join(_t(349, "、"))) : ''}</td></tr>`; }).join('') : '';
  const gaList = COMBOS.filter(c => !live || comboOpen(c));
  const gaCard = c => { const by = doneBy(c);
    return `<article class="gitem gacard" data-cat="${ARCH_CAT[c.id] || 'web'}" data-q="${[c.id, ...[...c.ix, ...c.ox].flat().map(i => aliasQ(SQ[i].k))].join('|')}"><div class="gac-h"><div class="gac-t">${_tf(4535, "<b class=\"gac-n\">{$0}</b><span class=\"gac-meta\"><span>必须 {$1} 块{$2}</span>{$3}</span>", c.n, c.ix.length, c.ox.length ? _tf(4531, " · 可选 {$0} 块", c.ox.length) : '', live ? `<span class="gac-who${by.length ? ' on' : ''}">${by.length ? by.map(q => `${PAWN(q.color)}${q.name}`).join('') + _t(4532, " 已凑成") : _t(4533, "还没人凑成")}</span>` : '')}</div><span class="gac-links">${archBtns(c)}</span></div>
      ${c.use ? `<p class="gac-use">${c.use}</p>` : ''}<div class="gac-diag">${archDiag(c, live)}</div>
      <div class="gac-more"><details class="gac-flow"><summary>${_t(4536, "数据怎么走")}</summary><p>${c.flow}</p></details>${c.d && c.d !== '—' ? _tf(4534, "<p class=\"gac-bonus\"><b>加成</b>{$0}</p>", c.d) : ''}</div></article>`; };
  const archs = ARCH_CATS.map(([k, n]) => { const xs = gaList.filter(c => (ARCH_CAT[c.id] || 'web') === k); return xs.length ? _tf(4537, "<section class=\"gacat\" data-cat=\"{$0}\"><h5>{$1}<small>{$2} 个</small></h5><div class=\"gacards\">{$3}</div></section>", k, n, xs.length, xs.map(gaCard).join('')) : ''; }).join('');
  const gaPills = _tf(4538, "<div class=\"gapills\" role=\"group\" aria-label=\"按用途筛选架构\"><button type=\"button\" class=\"gap on\" data-cat=\"\" aria-pressed=\"true\">全部 <i>{$0}</i></button>{$1}</div>", gaList.length, ARCH_CATS.map(([k, n]) => { const m = gaList.filter(c => (ARCH_CAT[c.id] || 'web') === k).length; return m ? `<button type="button" class="gap" data-cat="${k}" aria-pressed="false">${n} <i>${m}</i></button>` : ''; }).join(''));
  const inc = INC.slice(1).map((c, k) => `<tr><td class="no">${k + 1}</td><td class="cat"><span class="ccat k-${c.c}">${CATS[c.c]}</span></td><td><b>${c.n}</b></td><td>${c.e}</td><td>${c.im}</td></tr>`).join('');
  const rei = REI.slice(1).map((c, k) => `<tr><td class="no">${k + 1}</td><td><b>${c.n}</b>${c.keep ? _t(4539, "<span class=\"gkeep\">保留</span>") : ''}</td><td>${c.e.replace(_tr(2747, "^保留：", ""), '')}</td></tr>`).join('');
  const roles = ROLES.map(r => `<tr><td><b>${r.n}</b>${r.rs ? _t(4540, "<span class=\"gkeep\">代理商</span>") : ''}</td><td class="num">$${r.cash}</td><td>${r.ab}</td><td>${r.wk}</td><td>${r.sk ? _tf(4541, "「{$0}」{$1}", r.sk.n, r.sk.d) : ''}</td><td>${r.hell || ''}</td></tr>`).join('');
  // 自己查资料：联机时不推给别人，也不算在当前回合的玩家名下（轮到远端时房主自己的图鉴不会被锁）
  setTimeout(gallerySearch, 0);   // modal 同步把内容和章节标签写进去，下一拍再挂搜索框
  modal({
    local: true, cancelable: true, view: true, title: _t(4114, "图鉴"), cls: 'wide doc gal', buttons: [{ label: _t(2610, "关闭"), value: true, cls: 'pri' }],
    html: `<p class="gintro">${_t(4548, "服务、架构、卡牌、角色和状态标记都在这一页：上面搜关键字，或者点章节跳过去。")}</p><div class="gdisc" role="note"><p>${_tf(4549, "<b>免责声明</b>{$0}", DISC_GENAI.replace(_tr(4542, "^免责声明：", ""), ''))}</p><p>${_tf(4550, "<b>价格</b>{$0}", DISC_PRICE)}</p></div>${live ? _tf(4543, "<h4>谁凑成了哪些架构</h4><p class=\"muted\">每位玩家现在生效的架构；每块服务下面写着归谁。凑成的架构联合收费，下线、被 DDoS 打下线的服务不算。</p><table class=\"gwho\"><tr><th>玩家</th><th>凑成的架构</th></tr>{$0}</table>", whoRows) : ''}<h4 data-n="${COMBOS.filter(c => !live || comboOpen(c)).length}">${_t(4551, "有效架构")}</h4><p class="muted">${_t(4552, "凑齐一个架构后，别人落在其中任意一块上，按整套架构所有服务的过路费加起来收；卡片底下的「加成」是额外效果。鼠标移到架构图的每一块上，看它在这个架构里干什么。")}</p>${gaPills}<div class="glegend" role="note" aria-label="${_t(4553, "架构图图例")}">${_tf(4554, "<span><b>→</b>往下走</span><span><b>⇄</b>去问一下再回来</span><span><b>+</b>一起配合</span><span><b>←</b>从后面流进来</span><span><i class=\"lg-opt\">可选</i>没有也算凑成</span><span><b>或</b>有一块就行，都在手上都收</span>{$0}", live ? _tf(4544, "<span><small class=\"ownc\" style=\"--pc:{$0}\">{$1}</small>框里的名字是这块现在归谁</span>", S.players[0].color, S.players[0].name) : '')}</div><details class="gwild"><summary>${_t(4555, "<b>万能服务（5 个）</b>CloudWatch、CloudTrail、Config、KMS、VPC 能顶上缺的那一块：点开看能绑到哪些架构")}</summary><ul>${WILD_PARTS.map(x => `<li>${x}</li>`).join('')}<li>${_t(4556, "每块能「顶一次」：绑到你的一个架构上，缺一块就顶上那一块，已经凑齐的就并进去、过路费一起收；绑了不能换，卖掉或下线它，靠它顶上的架构就散了。Config 另外还是「S3 公开自动关闭」这几个合规架构的一块。")}</li></ul></details><div class="gaw">${archs}<p class="gitem-empty muted" hidden>${_t(4557, "没有符合的架构，换个词或者换个分类试试")}</p></div>
    <h4 data-n="${props.length}">${_t(4558, "服务一览")}</h4><p class="muted">${_t(4559, "实例型（IaaS、PaaS、EKS）买下时是单 AZ，升到带「多 AZ」的那一级才扛得住 AZ 断电（EC2 是第 2 级跨 AZ Auto Scaling，其余多数是第 1 级；EBS 卷永远单 AZ；ECS 服务默认就跨 AZ 分散任务）；其他服务天生跨多个 AZ，三级都是功能。落在自己的服务上可以升一级。")}</p><div class="ggrps" role="group" aria-label="${_t(4560, "色组和块数")}">${Object.keys(GROUPS).map(g => { const n = SQ.filter(x => x.g === g).length; return g === 'util' ? _tf(4545, "<span class=\"ggc wild\" style=\"--gc:{$0}\" title=\"CloudWatch、CloudTrail、Config：万能服务，能顶替缺的那一块（见上面「有效架构」）\"><i></i>{$1}<b>{$2} 块</b><em>万能</em></span>", GROUPS[g].color, GROUPS[g].name, n) : `<button type="button" class="ggc" data-g="${g}" style="--gc:${GROUPS[g].color}" aria-pressed="false" title="${_tf(4546, "只看{$0}", grpN(g))}">${_tf(4547, "<i></i>{$0}<b>{$1} 块</b>", GROUPS[g].name, n)}</button>`; }).join('')}</div>${gfil}
    <table class="gsvct"><tr><th>${_t(3729, "服务")}</th><th>${_t(4522, "色组")}</th><th>${_t(4523, "类型")}</th><th>${_t(4524, "高可用")}</th><th>${_t(4525, "计费")}</th><th class="nw">${_t(4561, "过路费（7 点）")}</th><th>${_t(4497, "升级路线")}</th></tr>${svcRows}<tr class="gempty" hidden><td colspan="7">${_t(4562, "没有符合筛选条件的服务，换个条件试试")}</td></tr></table><p class="muted">${_t(4563, "过路费按对方掷出 7 点、第 1 轮、没有容量估算；按用量计费的随点数浮动；集齐整组时未升级的过路费翻倍；越往后「流量」越大，过路费会按轮数上涨。")}</p>
    <h4>${_t(4564, "状态说明")}</h4><p class="muted">${_t(4565, "棋盘格子和玩家面板上这些标记是什么意思、怎么来、怎么解除。")}</p><table><tr><th>${_t(4566, "标记")}</th><th>${_t(4567, "什么意思")}</th><th>${_t(4568, "怎么来、怎么解除")}</th></tr><tr><td>${_t(4569, "<b>单 AZ / 多 AZ</b>")}</td><td>${_t(4570, "EC2、RDS、Aurora 这类实例型服务买下时只在一个可用区（AZ），那个 AZ 出事就挂；升到带多 AZ 的那一级就能扛 AZ 断电（RDS、Aurora 是第 1 级「多 AZ」，EC2 是第 2 级「跨 AZ Auto Scaling」）。EBS 永远单 AZ。其他服务天生跨多个 AZ。")}</td><td>${_t(4571, "格子上的「2 AZ」小框、玩家面板服务图标的级数")}</td></tr><tr><td>${_t(4572, "<b>多区域</b>")}</td><td>${_t(4573, "升了跨区域复制、全局表这类功能，扛得住整个 Region 出问题（比如「us-east-1 大面积故障」卡）。可靠性支柱每处算 2 分。")}</td><td>${_t(4574, "格子上的「多区域」小标")}</td></tr><tr><td><b>Impaired</b></td><td>${_t(4575, "被 Health 事件打挂了：这段时间不收过路费，服务还在你手上，运行费照交。")}</td><td>${_t(5731, "停一整轮：所有人各走一回合后，到主人回合开始时自动恢复；Spot 被抢走、破产分给债主、主人把它下线时直接清除")}</td></tr><tr><td>${_t(4577, "<b>已下线</b>")}</td><td>${_t(4578, "暂时停机，相当于抵押。只有 EC2、RDS、Aurora、Redshift、ECS 能下线：先拿回买价的一半周转；下线期间不收过路费，也不算持有（不凑整组、不凑架构、不算支柱），运行费只剩存储费（EC2、RDS、Aurora、Redshift 每圈 $5，ECS 不收）。")}</td><td>${_t(4579, "下线固定 3 轮，满 3 轮在主人回合开始时自动恢复，拿回的钱不用还；没满 3 轮时主人自己落到这一格可以提前免费拉起来。下线期间别人落上来，可以付原价把它买走归自己")}</td></tr><tr><td>${_t(4580, "<b>被 DDoS 下线</b>")}</td><td>${_t(4581, "被对手用 DDoS 打下线：不收过路费、不算持有，运行费照交。")}</td><td>${_t(4582, "到发动的人第 2 个回合开始时恢复；有 Shield Advanced 或 CloudFront 的打不动")}</td></tr><tr><td><b>Spot</b></td><td>${_t(4583, "用自己出的低价买下的空闲容量（只有 EC2、ECS、EKS、SageMaker AI）：不能升级、不能加容量。")}</td><td>${_t(4584, "别人落上来比你多出原价的 10% 就能抢走（抢的人不付这次过路费，你拿回出价的一半）；在资产管理里补差价可以转成按需，就没人能抢了")}</td></tr><tr><td>${_t(4585, "<b>级数、容量</b>")}</td><td>${_t(4586, "服务图标角上的数字是升到第几级；「+1」「+2」是加了几个容量（实例、分片、节点……），每个容量过路费 +25%。")}</td><td>${_t(4587, "升级只能落在自己的服务上做；容量落地时或者在资产管理里随时能加；资产管理里能去掉升级或容量，退一半")}</td></tr><tr><td>${_t(4588, "<b>维护窗口</b>")}</td><td>${_t(4589, "被送进来的（Root 密钥泄露、同一回合连掷 3 次对子、Health 卡）那回合到此为止；关在里面照样收过路费。")}</td><td>${_tf(5686, "下一回合二选一：付 ${$0} 马上出来、照常掷骰子，或者停一轮再出来（传统企业上云要停 2 轮）；Enterprise Support 卡能免费出来。出来写一句根因，领复盘标记", BAL.jailFee)}</td></tr><tr><td>${_t(4591, "<b>停 N 轮</b>")}</td><td>${_t(4592, "接下来 N 个回合不掷骰子（自己走到维护窗口选了停一轮、事件卡罚停）。")}</td><td>${_t(4593, "每轮到你一次减 1")}</td></tr><tr><td>${_t(4594, "<b>技术债</b>")}</td><td>${_t(4595, "被 Health 事件罚了又没抵消时欠 1 个：每个让每圈运行费 +$20；欠 2 个升级每级贵 $50；欠满 3 个要大重构。")}</td><td>${_t(4596, "花钱重构清掉，一次清 1 个")}</td></tr><tr><td>${_t(4597, "<b>复盘标记、演练标记</b>")}</td><td>${_t(4598, "出维护窗口时写复盘、做 GameDay 演练领到的：以后抵消一张同类 Health 事件卡，也算卓越运营、安全性支柱的分。")}</td><td>${_t(4599, "用掉一张就划掉一个")}</td></tr><tr><td>${_t(4600, "<b>万能服务</b>")}</td><td>${_t(4601, "CloudWatch、CloudTrail、Config、KMS、VPC：CloudWatch、CloudTrail、Config 什么架构都能绑；KMS 只能绑有存储或数据库的架构，VPC 只能绑有能接进 VPC 的服务的架构。每块能绑到主人的一个架构上一次：缺一块就顶上，凑齐了就并进去，过路费一起收；一个架构只能并进一块。Config、KMS、VPC 本身也是几个架构里的一块，已经在里面的架构不能再绑。")}</td><td>${_t(4602, "轮到你时点中间的「用万能服务」绑定，绑了不能换（re:Invent「请合作伙伴梳理了一遍架构」能免费改绑一次）；卖回亚马逊云科技后清掉，交易给别人后在他手里不算数")}</td></tr><tr><td>${_t(4603, "<b>新账户保护期</b>")}</td><td>${_t(4604, "开局前 2 轮每笔过路费最多 $50，让还没买几块的人不至于一下被收垮。标准局、完整局、学习模式才有；入门局、娱乐模式、地狱模式没有。")}</td><td>${_t(4605, "第 3 轮起按原价收")}</td></tr></table>
    <h4 data-n="${INC.length - 1}">${_t(4606, "Health 事件卡")}</h4><p class="muted">${_t(4607, "免疫栏标了「不算罚」的卡，抽到不欠技术债，开了高速部署也不扣部署点数。")}</p><table><tr><th>#</th><th>${_t(4608, "类别")}</th><th>${_t(4609, "卡面")}</th><th>${_t(4610, "效果")}</th><th>${_t(3852, "免疫")}</th></tr>${inc}</table>
    <h4 data-n="${REI.length - 1}">${_t(4611, "re:Invent 卡")}</h4><table><tr><th>#</th><th>${_t(4609, "卡面")}</th><th>${_t(4610, "效果")}</th></tr>${rei}</table>
    <h4 data-n="${ROLES.length}">${_t(4116, "角色")}</h4><p class="muted">${_t(4612, "每个角色有一个专属技能：快不行的时候（总资产低于自己开局资金的一半）可以发动，一局一次。发动时先结算下表里角色自己的技能，再「战略并购」：按卖回价买下全场总资产最高的对手的一块服务（连同升级和容量）。代理商角色只在代理商模式里出现。")}</p><table><tr><th>${_t(4116, "角色")}</th><th>${_t(4613, "起始资金")}</th><th>${_t(4614, "能力")}</th><th>${_t(4615, "弱点")}</th><th>${_t(4303, "技能")}</th><th>${_t(4616, "地狱限制")}</th></tr>${roles}</table>`,
  });
}

// 图鉴搜索：在章节标签那一排加一个搜索框，按表格行过滤（服务、架构、卡牌、角色、状态说明都能搜），标签上写每章找到几条
function gallerySearch() {
  const box = $('#vmodal .box'), nav = box && box.querySelector('.mtoc'), mb = box && box.querySelector('.mb');
  if (!nav || !mb || box.querySelector('.gsearch') || !_tr(4617, "图鉴", "").test((box.querySelector('h3') || {}).textContent || '')) return;
  // 把每个 h4 和它后面到下一个 h4 之前的说明、表格包成一节，整节没结果就藏起来
  const secs = []; let cur = null;
  [...mb.childNodes].forEach(n => { if (n.nodeName === 'H4') { cur = document.createElement('section'); cur.className = 'gsec'; n.before(cur); secs.push(cur); } if (cur && n !== cur) cur.appendChild(n); });
  const btns = [...nav.querySelectorAll('button[data-h]')], names = btns.map(b => b.textContent);
  const wrap = document.createElement('div'); wrap.className = 'gsearch';
  wrap.innerHTML = _t(4618, "<input type=\"search\" placeholder=\"搜服务、架构、卡牌、角色，比如 Lambda、加密、下线\" aria-label=\"在图鉴里搜索\" autocomplete=\"off\" spellcheck=\"false\" enterkeyhint=\"search\"><span class=\"gs-n\" aria-live=\"polite\"></span>");
  nav.classList.add('withsearch'); nav.prepend(wrap);
  const inp = wrap.querySelector('input'), out = wrap.querySelector('.gs-n');
  const sels = [...mb.querySelectorAll('.gfil select')], clr = mb.querySelector('.gf-clear'), fn = mb.querySelector('.gf-n'), nSvc = mb.querySelectorAll('tr.gsvc').length;
  const run = () => {
    const q = qNorm(inp.value), fs = sels.filter(x => x.value).map(x => [x.dataset.f, x.value]); let tot = 0;
    const hit = el => (el._nq || (el._nq = qNorm(el.textContent) + '|' + (el.dataset.q || ''))).includes(q);
    secs.forEach((sec, k) => {
      const rows = [...sec.querySelectorAll('tr, .gitem')].filter(r => !r.querySelector('th') && !r.classList.contains('gempty'));
      let n = 0; rows.forEach(r => { const ok = (!q || hit(r)) && (!r.classList.contains('gsvc') || fs.every(([f, v]) => r.dataset[f] === v)); r.hidden = !ok; if (ok) n++; });
      const em = sec.querySelector('tr.gempty'); if (em) em.hidden = !!n;
      const gw = sec.querySelector('.gaw');
      if (gw) { const cat = gw.dataset.cat || ''; n = 0; sec.querySelectorAll('.gacard').forEach(c => { const ok = (!q || hit(c)) && (!cat || c.dataset.cat === cat); c.hidden = !ok; if (ok) n++; }); sec.querySelectorAll('.gacat').forEach(g => { g.hidden = !g.querySelector('.gacard:not([hidden])'); }); }
      const ie = sec.querySelector('.gitem-empty'); if (ie) ie.hidden = !!n;
      sec.querySelectorAll('tr.ggrp').forEach(h => { let r = h.nextElementSibling, any = false; while (r && !r.classList.contains('ggrp') && !r.classList.contains('gempty')) { if (!r.hidden) any = true; r = r.nextElementSibling; } h.hidden = !any; });
      sec.hidden = !!q && !n && !em; tot += n;
      const lab = q || (fs.length && em) ? `${names[k]} ${n}` : names[k];
      if (btns[k]) { btns[k].textContent = lab; btns[k].disabled = !!q && !n && !em; }
      if (em) fn.textContent = fs.length ? _tf(4619, "显示 {$0} / {$1} 块", n, nSvc) : '';
    });
    if (clr) clr.hidden = !fs.length;
    sels.forEach(x => x.closest('.gf').classList.toggle('on', !!x.value));
    { const gv = (mb.querySelector('.gfil select[data-f="g"]') || {}).value || ''; mb.querySelectorAll('.ggrps .ggc[data-g]').forEach(b => { b.classList.toggle('on', b.dataset.g === gv); b.setAttribute('aria-pressed', b.dataset.g === gv); }); }
    out.textContent = q ? (tot ? _tf(4620, "找到 {$0} 条", tot) : _t(4621, "没找到，换个词试试")) : '';
    if (q) box.scrollTop = 0;
  };
  inp.addEventListener('input', run);
  sels.forEach(x => x.addEventListener('change', run));
  mb.querySelectorAll('.ggrps .ggc[data-g]').forEach(b => b.addEventListener('click', () => { const sel = mb.querySelector('.gfil select[data-f="g"]'); if (!sel) return; sel.value = sel.value === b.dataset.g ? '' : b.dataset.g; run(); }));
  mb.querySelectorAll('.gap').forEach(b => b.addEventListener('click', () => { const gw = mb.querySelector('.gaw'); if (!gw) return; gw.dataset.cat = b.dataset.cat; mb.querySelectorAll('.gap').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); run(); fitArch(box); }));
  if (clr) clr.addEventListener('click', () => { sels.forEach(x => { x.value = ''; }); run(); (sels[0] || inp).focus(); });
  // 回车别当成点「关闭」；Esc 先清空搜索词，再按一次才关窗
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } else if (e.key === 'Escape' && inp.value) { e.preventDefault(); e.stopPropagation(); inp.value = ''; run(); } });
  if (!PHONE_MQ.matches) inp.focus({ preventScroll: true });
}

// （从 core/43-boot.js 挪来：开局页标题栏的外观控件，别的文件也用；启动文件不该被别的文件引用）
// 外观控件（跟随系统 / 浅色 / 深色）：文案和别的字一样走对照表（i18n/en.json、ja.json），切换语言时 renderHero 重画
export function themeControl() {
  const text = [_t(5122, "外观"), _t(5123, "跟随系统"), _t(5124, "浅色"), _t(5125, "深色")];
  return `<label class="theme-control"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="M10 3a7 7 0 0 0 0 14Z" fill="currentColor" stroke="none"/></svg><span class="sr-only">${text[0]}</span><select data-theme-select aria-label="${text[0]}">${['auto', 'light', 'dark'].map((value, i) => `<option value="${value}" ${GameTheme.preference === value ? 'selected' : ''}>${text[i + 1]}</option>`).join('')}</select></label>`;
}
