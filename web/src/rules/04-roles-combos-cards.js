import { __rv, _t, _tf } from '../core/01-i18n-runtime.js';
import { SIM, SIM_AI, rnd } from '../core/02-util.js';
import { UI } from '../core/02b-ui-port.js';
import { BAL, IX, MAX_ROUNDS, SQ } from './03-services.js';
import { askQuestion, pickQuestion, qPoolS } from './06-qbank.js';
import { P, S, hasCombo, inPlay, log, nm, ownedBy } from '../engine/07-state.js';
import { cardAmt, credit, pay } from '../engine/08-money.js';
import { aiName, tableOK, vote } from '../engine/17-health.js';
import { ST } from '../engine/26b-retro.js';
import { isHell, isHidden, isParty } from './35-modes.js';
import { isAI } from '../engine/36-ai.js';
// ================= 角色 / 架构 / 卡牌 =================
// 开局资金 2026-11 第二次按 15 轮调：15 轮按估值排名时估值大头就是开局资金，传统企业上云、跨境电商、短视频平台（$1700）和独角兽（$1600 + 白送 Route 53）
// 合起来比别的角色多赢 4–7 个点，各减 $100。地狱模式按角色卡走（传统企业上云、独角兽、独立开发者另见 HELL_CASH）
export let ROLES = __rv(() => ([
  { id: 'garage', hell: _t(409, "起点不再多领 $50"), n: _t(410, "车库创业公司"), cash: 1500, ab: _t(411, "每次经过或停在 Startup 扶持多领 $50"), wk: _t(412, "钱比较少"), sk: { n: _t(413, "Activate 加码"), d: _t(414, "领 $1200，接下来 3 圈经过 Startup 扶持时运行费全免") } },
  { id: 'legacy', hell: _t(415, "开局资金按 $1500 算"), n: _t(416, "传统企业上云"), cash: 1600, ab: _t(417, "买 EC2、RDS 打 85 折"), wk: _t(418, "被送进维护窗口，不交钱要停 2 轮"), sk: { n: _t(419, "MAP 迁移补贴"), d: _t(420, "名下所有实例型服务各免费升一级，再领 $300（一块都升不了就领 $800）；接下来 3 圈运行费减半") } },
  { id: 'unicorn', hell: _t(421, "开局不送 Route 53，开局资金按 $1400 算"), n: _t(422, "独角兽"), cash: 1500, ab: _t(423, "开局免费拿到 Route 53"), wk: _t(424, "账单格交双倍"), sk: { n: _t(425, "新一轮融资"), d: _t(426, "领一笔融资：开局资金减现在的总资产再加 $500（最少 $1000，最多 $2000）") } },
  { id: 'fin', hell: _t(427, "「监管沙盒」只免疫这一轮和下一轮"), n: _t(428, "金融合规公司"), cash: 1600, ab: _t(429, "买安全组服务打 8 折；免疫「安全审计没过」"), wk: _t(430, "Spot 最低出价要原价的 40%（别人 20%）；抽到「抢到便宜的 Spot 容量」放回牌堆底"), sk: { n: _t(431, "监管沙盒"), d: _t(432, "技术债清零，这一轮和接下来 2 轮免疫所有 Health 事件，领 $800") } },
  { id: 'ai', hell: _t(433, "AI 组折扣取消"), n: _t(434, "AI 原生公司"), cash: 1600, ab: _t(435, "买 AI 组服务打 9 折"), wk: _t(436, "付 S3 过路费时交双倍（训练数据读写量大）"), sk: { n: _t(437, "生成式 AI 加速器"), d: _t(438, "AI 组所有服务各免费升一级，再领 $400（一块都升不了就领 $1000）；这一轮和接下来 2 轮 AI 组过路费 ×2") } },
  { id: 'ecom', hell: _t(439, "「黑五网一」只持续 2 个回合"), n: _t(440, "跨境电商"), cash: 1600, ab: _t(441, "买网络组服务打 8 折"), wk: _t(442, "踩到 NAT Gateway 账单格交双倍"), sk: { n: _t(443, "黑五网一"), d: _t(444, "领 $500；接下来 3 个回合，你所有服务的过路费 ×2") } },
  { id: 'saas', hell: _t(445, "「上架 Marketplace」只收 3 次"), n: _t(446, "SaaS 创业公司"), cash: 1600, ab: _t(447, "买 Lambda、API Gateway、DynamoDB 和应用集成组服务打 8 折"), wk: _t(448, "每个技术债让运行费多 $30（别人是 $20）"), sk: { n: _t(449, "上架 Marketplace"), d: _t(450, "接下来 4 个自己的回合开始时，每位对手付你 $150 订阅费") } },
  { id: 'game', hell: _t(451, "Spot 最低出价回到原价的 20%"), n: _t(452, "游戏工作室"), cash: 1600, ab: _t(453, "Spot 最低出价只要原价的 10%"), wk: _t(454, "「流量暴增」没扛住时，每块 Impaired 的服务再交 $30"), sk: { n: _t(455, "爆款上线"), d: _t(456, "领 $400；接下来 4 笔别人付你的过路费 ×3") } },
  { id: 'indie', hell: _t(457, "开局资金按 $1400 算；付过路费答对只付 50%（别人 70%）"), n: _t(458, "独立开发者"), cash: 1500, ab: _t(459, "不开「边玩边答题」也能答：买服务答对打 9 折，付过路费答对付八成；开了边玩边答题，买服务答对打 7 折（别人 8 折），付过路费答对只付 35%（别人一半）"), wk: _t(460, "钱比较少；不能签 Savings Plans / RI"), sk: { n: _t(461, "开源走红"), d: _t(462, "领 $400，再从没人买的服务里自己挑 2 块白拿（没有可拿的再领 $600）") } },
  { id: 'data', hell: _t(463, "分析组只打 9 折，「数据变现」每块只领 $120"), n: _t(464, "数据智能公司"), cash: 1600, ab: _t(465, "买分析组服务打 8 折"), wk: _t(466, "「月底账单爆了」每份容量交 $20（别人 $10）"), sk: { n: _t(467, "数据变现"), d: _t(468, "每持有一块服务领 $200（不到 4 块按 4 块算）") } },
  { id: 'media', hell: _t(469, "存储组只打 9 折，「现象级爆款」每人只付 $200"), n: _t(470, "短视频平台"), cash: 1600, ab: _t(471, "买存储组服务打 8 折"), wk: _t(472, "「DDoS 打满了入口」交双倍"), sk: { n: _t(473, "现象级爆款"), d: _t(474, "每位对手付你 $300") } },
  { id: 'health', hell: _t(475, "不再免疫「实习生误删了生产数据」"), n: _t(476, "互联网医疗"), cash: 1600, ab: _t(477, "买数据库组服务打 8 折；免疫「实习生误删了生产数据」"), wk: _t(478, "「S3 桶被设成了公开」赔双倍"), sk: { n: _t(479, "紧急救治"), d: _t(480, "所有 Impaired 和被 DDoS 打下线的服务马上恢复，技术债清零，领 $1000") } },
  // 代理商（代理商模式才有）：打折进货占地，客户落在代理商的地上可以从他手里买，之后客户的运行费交给代理商，代理商按进货价交给亚马逊云科技赚差价
  { id: 'rs_dist', hell: _t(481, "进货价 65 折"), rs: true, n: _t(482, "总代理"), cash: 1500, ab: _t(483, "按进货价从亚马逊云科技拿货：45 折（别的代理商 5 折），客户运行费的差价也按 45 折算"), wk: _t(484, "每圈交 $50 渠道维护费"), sk: { n: _t(485, "年度返点"), d: _t(486, "领「客户从你手里买的服务总价」的一半（最少 $800）") } },
  { id: 'rs_msp', hell: _t(487, "进货价 7 折"), rs: true, n: _t(488, "托管服务商（MSP）"), cash: 1400, ab: _t(489, "进货价 5 折；客户从你手里买的服务，每块每圈再收客户 $10 托管费"), wk: _t(490, "你自己名下服务的过路费打 9 折（精力都放在客户身上）"), sk: { n: _t(491, "托管续约"), d: _t(492, "每位客户付你 $400，你再领 $300（没有客户就领 $800）") } },
  { id: 'rs_cons', hell: _t(487, "进货价 7 折"), rs: true, n: _t(493, "咨询合作伙伴"), cash: 1300, ab: _t(494, "进货价 5 折；每有一位客户从你手里买过服务，你的估值 +$100"), wk: _t(495, "角色卡上的开局资金最少（娱乐、地狱模式和有轮数上限时都从角色卡算起）"), sk: { n: _t(496, "解决方案打包"), d: _t(497, "领 $400，再从没人买、原价不超过 $400 的服务里挑 2 块白拿（没有可拿的再领 $600）") } },
]), v => { ROLES = v; }, () => ROLES);
export const roleOf = p => ROLES.find(r => r.id === p.role);
// 代理商按进货价从亚马逊云科技拿货：5 折（总代理 45 折）；地狱模式必须答题、答对还能折上折，各贵 20%（7 折 / 总代理 65 折）
// 代理商规则（BAL）：rsKeepCombo / rsKeepGroup 在组架构、整组、升过级的库存不卖；rsComboMul 代理商的架构过路费 ×2；rsCashSum 起始资金按客户总和（有轮数上限时是角色卡 + 每位客户 rsLimitPer）
// rsParty / rsCash / rsBonus / rsReqFee / rsCut 是模拟用的开关，默认不生效
// 代理商本钱按哪种算：开局页不勾轮数上限时 roundLimit 填的是 MAX_ROUNDS（50），学习模式填 0，都按不限轮数（客户总和）算
export const rsShort = c => c.roundLimit > 0 && c.roundLimit < MAX_ROUNDS;
export const rsBuyRate = r => Math.round(((r.role === 'rs_dist' ? 0.45 : 0.5) + (isHell() ? (BAL.rsHell ?? 0.05) : 0) + (isParty() ? (BAL.rsParty ?? 0) : 0)) * 100) / 100;
export const rsRate = r => Math.max(rsBuyRate(r), Math.min(1, r.rsRate || 0.9));
export const viaOf = (r, owner) => ownedBy(owner).filter(i => S.props[i].via === r.id);
export const rsCustomers = r => S.players.filter(q => q.alive && q.id !== r.id && viaOf(r, q).length);
// 从代理商手里买过服务的客户（r.rsEver，座位号）：咨询合作伙伴的估值按这个加（规则书第 29 节「每有一位客户从你手里买过服务」），
// 客户后来卖掉、交易掉、合同到期断开、破产了也照样算；rsCustomers 是现在还经他付费的，管托管费、渠道这些
export const rsSold = (r, q) => { const a = r.rsEver || (r.rsEver = []); if (!a.includes(q.id)) a.push(q.id); };
export const rsEverN = r => (r.rsEver || []).filter(id => id !== r.id).length;
export let COMBOS = __rv(() => ([
  { id: 'sls', n: 'Serverless API', need: [{ opt: 'cloudfront' }, { opt: 's3' }, { opt: 'cognito' }, 'apigw', 'lambda', ['dynamodb', 'aurora']], link: ['→', '+', '⇄', '→', '→'], use: _t(498, "最常见的无服务器后端：App、小程序、网站的接口。按请求计费，流量忽高忽低也不用管服务器"), flow: _t(499, "（可选）CloudFront 分发前端页面 +（可选）页面放在 S3 里 +（可选）用户用 Cognito 登录，API Gateway 先验令牌（⇄）→ API Gateway 接请求 → Lambda 处理 → DynamoDB 或 Aurora（Serverless v2）存数据；前后端都配上就是一个没有服务器要管的完整网站"), d: '—' },
  { id: 'tier3', n: _t(500, "经典三层 Web"), need: [{ opt: 'route53' }, { opt: 'cloudfront' }, 'elb', { opt: 'cognito' }, ['ec2', 'ecs'], ['rds', 'aurora'], { opt: 'opensearch' }], link: ['→', '→', '⇄', '→', '→', '+'], use: _t(501, "传统网站和企业系统的标准搭法：负载均衡、应用服务器、数据库各一层，各层可以单独扩容"), flow: _t(502, "（可选）Route 53 解析域名 →（可选）CloudFront 就近缓存静态内容、在边缘挡掉一部分攻击 → ELB 把请求分到多个 AZ →（可选）ALB 先让没登录的用户去 Cognito 登录（⇄）→ EC2 或 ECS 跑应用 → RDS 或 Aurora 存数据 +（可选）应用写库的同时把要搜的内容也写进 OpenSearch，站内搜索走它，不压数据库"), d: '—' },
  { id: 'ctr', n: _t(503, "容器平台"), need: ['ecr', ['ecs', 'eks'], 'elb'], link: ['→', '←'], use: _t(504, "把应用打包成容器镜像统一部署，微服务、要频繁发布的团队常用"), flow: _t(505, "镜像放 ECR，ECS 或 EKS 拉镜像跑起来 ← ELB 把外面的请求分给这些容器"), d: _t(506, "容器组升级费减半") },
  { id: 'event', n: _t(507, "事件驱动"), need: ['eventbridge', 'sfn', 'lambda'], use: _t(508, "多个步骤要按顺序、带重试地跑完的业务，比如注册后发券、审批流、数据处理流水线"), flow: _t(509, "EventBridge 收事件 → Step Functions 编排 → Lambda 执行每一步"), d: '—' },
  { id: 'queue', n: _t(510, "订单削峰"), need: [['ec2', 'ecs'], 'sqs', 'lambda', { opt: ['dynamodb', 'rds', 'aurora'] }], use: _t(511, "秒杀、大促这类突发流量：先把请求排进队列，后端按自己的节奏处理，网站不被压垮"), flow: _t(512, "EC2 或 ECS 上的网站收订单 → SQS 排队削峰 → Lambda 按自己的节奏处理 →（可选）订单写进 DynamoDB、RDS 或 Aurora；大促时网站不被压垮"), d: _t(513, "免疫「流量暴增」，扛住了还能领钱") },
  { id: 'thumb', n: _t(514, "图片缩略图"), need: ['s3', { opt: 'eventbridge' }, 'lambda', 'cloudfront'], use: _t(515, "图片、视频上传后自动处理：缩略图、转码、加水印，处理完马上能就近访问"), flow: _t(516, "图片上传到 S3 →（可选）EventBridge 先收到 S3 事件并按规则过滤（只要图片、只要某个目录）再分发 → Lambda 生成缩略图，写回 S3 → CloudFront 从 S3 取图就近分发"), d: '—' },
  { id: 'bot', n: _t(517, "GenAI 聊天机器人"), need: [{ opt: 'cognito' }, 'apigw', 'lambda', { opt: 'agentcore' }, ['bedrock', 'sagemaker']], link: ['⇄', '→', '→', '→'], use: _t(518, "对话机器人、写作助手这类生成式 AI 应用，接口和模型分开，换模型不用改前端"), flow: _t(519, "（可选）用户先用 Cognito 登录（⇄）→ API Gateway 收消息 → Lambda 组装提示词和上下文 →（可选）交给 AgentCore 上跑的智能体，记住对话、按需调工具 → Bedrock 或 SageMaker AI 上部署的模型生成回答"), d: '—' },
  { id: 'etl', n: _t(520, "数仓 ETL"), need: ['s3', 'glue', 'redshift'], use: _t(521, "把业务数据整理好放进数仓，给报表和 BI 用"), flow: _t(522, "原始数据落 S3 → Glue 作业清洗转换 → 加载进 Redshift 做报表和 BI 分析"), d: '—' },
  { id: 'accesslog', n: _t(523, "访问日志分析"), need: ['elb', 's3', { opt: 'glue' }, 'athena'], use: _t(524, "不用自己搭日志系统，就能按需查网站的访问日志：排查慢请求、5xx，看流量从哪来"), flow: _t(525, "ALB 把每个请求的访问日志投递到 S3 →（可选）Glue 爬虫建好表结构和分区 → Athena 直接用 SQL 查慢请求、5xx 和来源 IP，按扫描量计费"), d: '—' },   // 替换「审计与合规」（CloudTrail 是万能服务）
  { id: 's3queue', n: _t(526, "文件排队处理"), need: ['s3', { opt: 'eventbridge' }, 'sqs', 'lambda', { opt: 'dynamodb' }], use: _t(527, "用户上传的文件要排队一个个处理，比如解析 Excel、识别票据、批量导入"), flow: _t(528, "文件上传到 S3 →（可选）事件先进 EventBridge，按规则过滤、转发 → SQS 排队 → Lambda 一批批取出来处理，失败的会重试 →（可选）处理结果记进 DynamoDB"), d: '—' },   // 替换「告警自愈」（CloudWatch 是万能服务）
  { id: 'soar', n: _t(529, "威胁自动响应"), need: ['guardduty', 'eventbridge', 'sfn', { opt: 'lambda' }], use: _t(530, "安全团队不用半夜盯告警：发现威胁后按剧本自动隔离、吊销、通知"), flow: _t(531, "GuardDuty 发现异常 → EventBridge 路由 → Step Functions 按剧本自动处置 →（可选）Lambda 执行隔离实例、吊销密钥这些动作"), d: _t(532, "免疫「暴露在公网的实例被 SSH 暴力破解」和「Root 密钥被推到了 GitHub」") },
  { id: 'stream', n: _t(533, "实时日志分析"), need: ['kinesis', 'lambda', ['opensearch', 'redshift']], use: _t(534, "日志、指标实时进来实时能搜，故障排查和运营监控用"), flow: _t(535, "Kinesis 收数据流 → Lambda 处理后写进 OpenSearch 检索；Redshift 也能直接从 Kinesis 流式摄取，用 SQL 分析"), d: '—' },
  { id: 'lake', n: _t(536, "Serverless 数据湖"), need: [{ opt: 'kinesis' }, 's3', 'glue', 'athena'], use: _t(537, "各种原始数据先统一放进 S3，想分析时直接用 SQL 查，不用先建数仓"), flow: _t(538, "（可选）Kinesis 把网站和 App 的点击流实时写进来，Data Firehose 按分钟落盘 → S3 按小时分区存原始数据 → Glue 爬虫识别表结构、建好数据目录 → Athena 直接用 SQL 查，按扫描量计费"), d: _t(411, "每次经过或停在 Startup 扶持多领 $50") },
  { id: 'web', n: _t(539, "静态网站"), need: ['route53', 'cloudfront', { opt: 'waf' }, 's3'], link: ['→', '+', '→'], use: _t(540, "官网、文档站、活动页这类静态网站：没有服务器，全球访问都快"), flow: _t(541, "Route 53 解析域名 → CloudFront 全球缓存 +（可选）WAF 挡掉恶意请求 → S3 存网页文件"), d: '—' },
  { id: 'rag', n: _t(542, "GenAI 知识库（RAG）"), need: ['s3', { opt: 'lambda' }, ['opensearch', 'aurora'], 'bedrock'], use: _t(543, "让大模型按公司自己的资料回答，减少胡编：客服知识库、内部问答、文档助手"), flow: _t(544, "资料放 S3 →（可选）Lambda 自定义怎么切分、清洗文档 → Bedrock 知识库把文档切块、算向量，存进 OpenSearch 或 Aurora PostgreSQL（pgvector）→ Bedrock 检索相关片段后生成回答，回答里带着出处；前面接 API Gateway、Lambda 就是企业知识问答（见 GenAI 聊天机器人）"), d: _t(545, "别人落在你的 Bedrock 上，额外付你 $50") },
  { id: 'ml', n: _t(546, "ML 训练与部署"), need: [['s3', 'efs'], 'ecr', 'sagemaker'], link: ['+', '→'], use: _t(547, "自己训练、部署机器学习模型：数据、训练镜像、训练和推理放在一处管"), flow: _t(548, "训练数据放 S3 或 EFS → 自己的训练镜像放 ECR → SageMaker AI 拉镜像、读数据，训练并部署"), d: '—' },   // S3 和 EFS 都是放训练数据的，二选一；镜像只能放 ECR
  { id: 'ha', n: _t(549, "高可用入口"), need: ['route53', { opt: 'cloudfront' }, { opt: 'waf' }, 'elb', 'ec2', { opt: 'vpc' }], link: ['→', '+', '→', '→', '+'], use: _t(550, "对外入口做高可用：DNS 健康检查加跨 AZ 负载均衡，一台机器或一个 AZ 坏了自动切走"), flow: _t(551, "Route 53 健康检查 →（可选）CloudFront 在边缘接住请求 +（可选）WAF 过滤恶意流量 → ELB 跨 AZ 分发 → EC2 跑应用，一台坏了 ELB 自动不再往它上面转 +（可选）自己的 VPC 划好跨 AZ 的公有、私有子网，EC2 放私有子网"), d: _t(552, "EC2 升「跨 AZ Auto Scaling」（多 AZ 那一级）半价：ELB 本来就跨多个 AZ，在另一个 AZ 再起一台实例挂进目标组就行") },
  { id: 'cache', n: _t(553, "缓存加速"), need: [{ opt: 'cognito' }, 'elb', ['ec2', 'ecs'], 'elasticache', ['rds', 'aurora', 'dynamodb']], link: ['⇄', '→', '→', '→'], use: _t(554, "读多写少的业务（商品详情、排行榜、配置）把热点数据放缓存，数据库只扛少量请求"), flow: _t(555, "（可选）ALB 先让没登录的用户去 Cognito 登录（⇄）→ ELB 分发流量 → EC2 或 ECS 跑应用 → 先查 ElastiCache 里的热点数据，没命中再去查 RDS、Aurora 或 DynamoDB，查到的写回缓存 → 数据库压力小、响应快"), d: '—' },
  { id: 'cleanbak', n: _t(556, "防勒索备份"), need: ['ebs', 's3', 'guardduty', { opt: 'kms' }], link: ['+', '+', '+'], use: _t(557, "防勒索：备份锁住谁都删不掉，恢复前先查毒，出事能从干净的点恢复"), flow: _t(558, "EBS 快照开快照锁定（合规模式下到期前谁都删不掉，root 用户也不行） + 重要文件放进开了对象锁定的 S3 桶 + GuardDuty 恶意软件防护扫描 EBS 卷和新传进 S3 的文件 +（可选）KMS 客户托管密钥加密快照和对象，密钥权限单独管；中了勒索，从扫过、没发现威胁的快照恢复"), d: _t(559, "免疫「勒索软件加密了数据」（安全攻防 DLC）：快照和对象都锁着，攻击者删不掉，直接从干净的快照恢复") },   // 11-08 Backup 换成 Cognito 以后重配：EBS 快照锁定、S3 对象锁定都是真功能
  // 原来是「数据加密」：任意数据服务 + KMS + CloudTrail。KMS 几乎能给所有服务加密、CloudTrail 记所有 API 调用，这两个和谁都能凑，是万金油，算不上一个架构。
  // 换成一条有具体数据流向的：私有 S3 桶只让 CloudFront 用 OAC 读，对象用 KMS 客户托管密钥加密，密钥策略只允许这个分发解密
  { id: 'agentcore', n: _t(560, "托管智能体"), need: ['bedrock', 'agentcore', 'lambda'], link: ['⇄', '→'], use: _t(561, "把能自己规划、调工具办事的智能体放到生产环境里跑，不用自己管运行环境"), flow: _t(562, "AgentCore Runtime 托管运行智能体，一轮轮调 Bedrock 上的模型推理、决定下一步（⇄ 是来回调用）→ 通过 AgentCore Gateway 把 Lambda 函数接成 MCP 工具，去调业务接口"), d: '—' },
  // 11-08：AgentCore 的几种典型用法（AgentCore 不挑模型，智能体调哪家模型都行）
  { id: 'acsupport', n: _t(563, "智能客服"), need: [{ opt: 'cognito' }, 'apigw', 'agentcore', 'lambda', 'dynamodb'], link: ['⇄', '→', '→', '→'], use: _t(564, "能查订单、办退款的智能客服，不只是回答常见问题"), flow: _t(565, "（可选）用户先用 Cognito 登录（⇄）→ API Gateway 收用户消息 → AgentCore Runtime 跑客服智能体，Memory 记住这位用户聊过什么 → 通过 AgentCore Gateway 调 Lambda 工具 → Lambda 查 DynamoDB 里的订单、工单，智能体给出回答或直接办好"), d: '—' },
  { id: 'acops', n: _t(566, "运维助手智能体"), need: ['eventbridge', 'agentcore', 'lambda'], use: _t(567, "告警来了先让智能体查日志、找根因、执行修复，值班的人看结论就行"), flow: _t(568, "EventBridge 收到告警和 Health 事件 → AgentCore 智能体读日志、查指标找根因 → 通过 Gateway 调 Lambda 执行修复（重启、扩容、回滚）"), d: '—' },
  { id: 'acdata', n: _t(569, "数据分析智能体"), need: ['agentcore', 'athena', 's3'], use: _t(570, "业务同事用大白话提数据问题，智能体自己写 SQL 查、画图"), flow: _t(571, "用户用大白话提问 → AgentCore 智能体写 SQL，用 Code Interpreter 跑分析、画图 → Athena 直接查 S3 里的数据"), d: '—' },
  // 11-08：用户提的几种常见用法，和 Cognito、Zero-ETL 的典型架构
  { id: 'apiq', n: _t(572, "API 查询服务"), need: ['apigw', 'lambda', ['rds', 'aurora'], 'dms', 'opensearch'], link: ['→', '→', '→', '→'], use: _t(573, "查询多、还要全文搜索的业务：写操作走关系库保证事务，查询和全文搜索走 OpenSearch，不压主库"), flow: _t(574, "API Gateway 接请求 → Lambda 处理：写操作进 RDS 或 Aurora（SQL Server、MySQL 这类关系库，经 RDS Proxy 复用连接）→ DMS 持续把库里的改动同步进 OpenSearch（CDC，RDS 自己没法把数据推给 OpenSearch，同步就靠它）→ OpenSearch 负责查询和全文检索（不压主库）"), d: '—' },
  { id: 'ec2sched', n: _t(63, "定时启停 EC2"), need: ['eventbridge', 'lambda', 'ec2'], use: _t(575, "开发测试环境只在上班时间开着，晚上和周末自动停，能省一大半实例费"), flow: _t(576, "EventBridge Scheduler 按时间表触发（比如工作日 9 点开、20 点关）→ Lambda 调 StartInstances、StopInstances（也可以用 Scheduler 的通用目标直接调 EC2 API，不写 Lambda）→ 开发测试用的 EC2 只在上班时间开着；停着的实例不收实例小时费，EBS 卷照收"), d: '—' },
  { id: 'elblog', n: _t(577, "ELB 日志检索"), need: ['elb', 's3', { opt: 'eventbridge' }, 'lambda', 'opensearch'], use: _t(578, "访问日志实时可搜：在 Dashboards 上随时查 5xx、慢请求和可疑 IP"), flow: _t(579, "ELB 每 5 分钟把访问日志写进 S3 →（可选）新文件事件先进 EventBridge 再分发 → Lambda 逐行解析 → 写进 OpenSearch，在 Dashboards 上实时搜 5xx、慢请求和可疑 IP"), d: '—' },
  { id: 'zetldw', n: _t(580, "Zero-ETL 实时数仓"), need: [['aurora', 'rds', 'dynamodb'], 'redshift', 'sagemaker'], use: _t(581, "交易库里的数据几秒内就能在数仓里分析，不用维护 ETL 管道，还能直接用 SQL 训练预测模型"), flow: _t(582, "Aurora、RDS for MySQL 或 DynamoDB 里的业务数据，通过 Zero-ETL 集成几秒内自动同步进 Redshift，不用自己写 ETL 管道 → Redshift 里直接跑报表 → 用 Redshift ML 写一句 SQL，后台交给 SageMaker AI 训练预测模型（比如预测哪些用户要流失）"), d: '—' },
  { id: 'zetlsearch', n: _t(583, "Zero-ETL 商品搜索"), need: ['dynamodb', 'opensearch', 'lambda', { opt: 'apigw' }], link: ['→', '⇄', '←'], use: _t(584, "商品、订单要支持全文和模糊搜索，又不想自己写同步代码"), flow: _t(585, "DynamoDB 存商品和订单 → 通过 Zero-ETL 集成（OpenSearch Ingestion 管道）自动把改动同步进 OpenSearch，不用自己写同步代码；Lambda 接搜索请求，去 OpenSearch 里做全文、模糊和按距离搜索（⇄）←（可选）请求从 API Gateway 进来"), d: '—' },
  { id: 'authapi', n: _t(586, "带登录的 API"), need: ['cognito', 'apigw', 'lambda', { opt: ['dynamodb', 'aurora'] }], link: ['⇄', '→', '→'], use: _t(587, "只给登录用户用的接口：令牌在网关就验掉，后端代码不用管登录"), flow: _t(588, "用户先在 Cognito 用户池登录，拿到 JWT 令牌 → 请求带着令牌打到 API Gateway，Cognito 授权方先验令牌（⇄），没登录的直接挡回去 → 验过的请求才转给 Lambda，从令牌里就知道是谁 →（可选）读写 DynamoDB 或 Aurora"), d: '—' },
  { id: 'albauth', n: _t(589, "ALB 登录认证"), need: ['cognito', 'elb', ['ec2', 'ecs']], link: ['⇄', '→'], use: _t(590, "老的 Web 应用不改代码就加上登录，比如内部管理后台"), flow: _t(591, "用户访问 ALB，监听器规则里有一步认证：没登录的先跳到 Cognito 托管登录页，登录完回到 ALB（⇄）→ ALB 把用户信息放进请求头转给 EC2 或 ECS，老应用不用自己写登录"), d: '—' },
  { id: 's3direct', n: _t(592, "App 直传 S3"), need: ['cognito', 's3', 'cloudfront'], link: ['+', '→'], use: _t(593, "用户上传头像、照片、视频：文件不经过自己的服务器，省带宽、扛得住并发"), flow: _t(594, "App 先找 Cognito 身份池换一份临时凭证（权限只够写这位用户自己的目录），拿着凭证直接把照片、视频传进 S3，不经过自己的服务器 → CloudFront 把这些文件就近分发出去"), d: '—' },
  { id: 'acauth', n: _t(595, "带登录的智能体"), need: ['cognito', 'agentcore', 'lambda'], link: ['⇄', '→'], use: _t(596, "每个用户只能让智能体办自己权限内的事，比如查自己的订单、改自己的资料"), flow: _t(597, "用户先用 Cognito 登录拿到令牌 → AgentCore Runtime 只接带有效令牌的请求（入站认证，⇄），AgentCore Identity 知道这一次是谁在用 → 智能体通过 Gateway 调 Lambda 办事，按这位用户自己的权限来"), d: '—' },
  { id: 'edgeauth', n: _t(598, "边缘登录校验"), need: ['cognito', 'cloudfront', 'lambda', { opt: 's3' }], link: ['⇄', '+', '→'], use: _t(599, "私有文档、付费课程、会员视频：在 CDN 边缘就挡掉没登录的请求"), flow: _t(600, "用户先在 Cognito 登录拿到令牌 → 每个请求到了 CloudFront 边缘节点，Lambda@Edge 先验令牌，没登录的直接跳去登录页（⇄）→ 验过的才回源取内容（可选：源站是 S3）；私有文档、付费视频不会被人拿着链接直接下载"), d: '—' },
  // 11-08：Config 的合规自动修正
  { id: 's3guard', n: _t(601, "S3 公开自动关闭"), need: ['s3', 'config', 'eventbridge'], link: ['⇄', '→'], use: _t(602, "防止桶被误设成公开导致数据泄露，发现了几分钟内自动关掉"), flow: _t(603, "S3 桶被人设成公开 → Config 托管规则（s3-bucket-public-read-prohibited 这类）马上发现，自动修正调 Systems Manager 自动化文档，把这个桶的「阻止公共访问」打开（⇄）→ 合规状态变化的事件发到 EventBridge，转给安全团队（邮件、聊天群）"), d: '—' },
  { id: 'sgfix', n: _t(604, "安全组自动收紧"), need: ['ec2', 'config', 'eventbridge'], link: ['⇄', '→'], use: _t(605, "防止有人图方便把 SSH、RDP 端口开给整个互联网"), flow: _t(606, "EC2 的安全组被人改成对 0.0.0.0/0 开 22 端口 → Config 规则 restricted-ssh 发现了，自动修正调 Systems Manager 自动化文档 AWS-DisablePublicAccessForSecurityGroup 删掉这条规则（⇄）→ EventBridge 把这件事通知到安全团队"), d: _t(607, "免疫「暴露在公网的实例被 SSH 暴力破解」：对整个互联网开着的 22 端口几分钟内就被关掉") },
  // 11-08：四块以上的整套架构（凑齐难，收得也多）
  { id: 'orderflow', n: _t(608, "电商下单流程"), need: ['apigw', 'sfn', 'lambda', 'dynamodb', { opt: 'sqs' }], link: ['→', '→', '→', '+'], use: _t(609, "下单、支付、发货这种跨好几个系统的流程，中间哪一步失败都能自动撤回前面的"), flow: _t(610, "API Gateway 接下单请求 → Step Functions 按步骤编排：扣库存、扣款、建发货单，哪一步失败就把前面做过的撤回 → 每一步由 Lambda 执行 → 订单状态记在 DynamoDB +（可选）发货任务放进 SQS，仓库系统按自己的节奏取"), d: '—' },
  { id: 'secbase', n: _t(611, "安全防护基线"), need: [{ opt: 'waf' }, 'guardduty', 'inspector', 'config', { opt: 'kms' }], link: ['+', '+', '+', '+'], use: _t(612, "账户的安全基本盘：入口过滤、威胁检测、漏洞扫描、合规检查都有"), flow: _t(613, "（可选）WAF 挡在入口过滤恶意请求 + GuardDuty 盯着账户和网络里的异常行为 + Inspector 持续扫 EC2、容器镜像和 Lambda 的漏洞 + Config 检查配置合不合规，不合规的自动改回来 +（可选）KMS 统一管加密密钥、自动轮换"), d: _t(614, "免疫「安全审计没过」：检测、扫描、合规检查都有记录") },
  // 11-08：CDC（变更数据捕获）
  { id: 'cdcevt', n: _t(615, "DynamoDB 变更事件"), need: ['dynamodb', 'lambda', 'eventbridge'], use: _t(616, "数据一变就通知下游：下单后加积分、发通知、做风控，各系统互不耦合"), flow: _t(617, "订单表一有新增、修改，DynamoDB Streams 按顺序记下每条变更（CDC）→ Lambda 读变更流（也可以用 EventBridge Pipes 直接接，不写代码）→ EventBridge 收到 Lambda 转好的业务事件，积分、通知、风控这些下游系统各自订阅"), d: '—' },
  { id: 'cdclake', n: _t(618, "数据库变更入湖"), need: [['rds', 'aurora'], 'dms', 'kinesis', ['s3', 'redshift', 'opensearch'], { opt: 'eventbridge' }], link: ['→', '→', '→', '+'], use: _t(619, "业务库的每一次改动近实时同步到数据湖、搜索或数仓，分析拿到的总是新数据"), flow: _t(620, "DMS 持续抓 RDS 或 Aurora 的变更日志（CDC：MySQL 的 binlog、PostgreSQL 的 WAL）→ 写进 Kinesis Data Streams → Data Firehose 落进 S3 数据湖或写进 OpenSearch 做实时检索，或者 Redshift 流式摄取直接从 Kinesis 读，几秒内就能查到 +（可选）DMS 任务的状态变化发到 EventBridge，同步断了马上告警"), d: '—' },
  { id: 'cdccache', n: _t(621, "缓存自动刷新"), need: ['dynamodb', { opt: 'eventbridge' }, 'lambda', 'elasticache'], use: _t(622, "缓存和数据库总是一致：数据一改，对应的缓存马上刷新"), flow: _t(623, "DynamoDB 里的数据一改，Streams 按顺序记下变更 →（可选）用 EventBridge Pipes 过滤、转发，不用自己写轮询 → Lambda 去 ElastiCache 删掉或刷新对应的缓存 → 读到的总是新数据，不用等缓存过期"), d: '—' },
  { id: 'dbmig', n: _t(624, "数据库迁上云"), need: ['dms', ['rds', 'aurora'], 'ec2'], link: ['→', '←'], use: _t(625, "机房里的老系统上云：数据库先迁过来一直保持同步，选个时间切过去，停机只要几分钟"), flow: _t(626, "DMS 把机房的数据库全量搬到 RDS 或 Aurora（换引擎的先用 Schema Conversion 转表结构和存储过程），之后持续同步变更，新旧库一直对得上 ← 割接那一刻应用切到云上的 EC2 连新库，停机只要几分钟"), d: '—' },
  { id: 'dlq', n: _t(627, "死信队列兜底"), need: ['eventbridge', 'lambda', 'sqs'], use: _t(628, "处理失败的消息不会丢：先存进死信队列，修好以后再重新处理"), flow: _t(629, "EventBridge 把事件投给 Lambda → Lambda 处理失败、重试次数用完的事件，转进 SQS 死信队列（DLQ）存着，不会丢 → CloudWatch 告警盯着死信队列里的消息数；修好 bug 以后用 DLQ 重驱把消息送回去重新处理"), d: '—' },
  { id: 'vulnscan', n: _t(630, "漏洞管理"), need: ['ecr', 'inspector', ['ecs', 'eks', 'ec2'], { opt: 'eventbridge' }], link: ['⇄', '→', '+'], use: _t(631, "上线前把有高危漏洞的镜像挡住，上线后新爆出的 CVE 也能马上知道"), flow: _t(632, "镜像推进 ECR，Inspector 马上扫一遍漏洞（⇄）→ 没有高危漏洞的镜像才部署到 ECS、EKS 或 EC2；跑起来以后 Inspector 继续盯着，新爆出的 CVE 也能发现 +（可选）Inspector 的发现发到 EventBridge，自动通知负责人、开工单"), d: _t(633, "免疫「高危 CVE 爆出」") },
  { id: 'sharedfs', n: _t(634, "多机共享文件"), need: ['elb', ['ec2', 'ecs', 'eks'], 'efs', { opt: 'vpc' }], link: ['→', '→', '+'], use: _t(635, "多台机器要读写同一批文件，比如 CMS 的媒体库、机器学习的训练数据"), flow: _t(636, "ELB 把请求分到多台机器 → EC2、ECS 或 EKS 上的应用都挂同一个 EFS 文件系统 → 用户上传的文件写一次，哪台接请求都读得到，加机器不用同步文件 +（可选）VPC 每个 AZ 的子网里都有 EFS 挂载点"), d: '—' },   // 替换「私有网络」（VPC 是万能服务）
  { id: 'agent', n: _t(637, "AI Agent 工作流"), need: ['sfn', 'lambda', 'bedrock'], use: _t(638, "多步骤的 AI 工作流：每一步可审计、可重试，比如合同审核、报告生成"), flow: _t(639, "Step Functions 编排多步任务 → Lambda 调用工具和接口 → Bedrock 推理决定下一步"), d: '—' },
  { id: 'recsys', n: _t(640, "实时推荐"), need: ['kinesis', 'lambda', 'sagemaker', ['dynamodb', 'elasticache']], link: ['→', '⇄', '→'], use: _t(641, "根据用户刚刚的点击实时推荐商品、内容"), flow: _t(642, "Kinesis 收用户的点击、浏览行为 → Lambda 读流，调 SageMaker AI 的推理端点算推荐（⇄）→ 推荐结果写进 DynamoDB 或 ElastiCache，前端打开页面直接读"), d: '—' },
  { id: 'edgeapi', n: _t(643, "全球 API 加速"), need: ['cloudfront', 'waf', 'apigw', { opt: 'lambda' }], link: ['+', '→', '→'], use: _t(644, "全球用户访问接口：边缘接入加速，恶意流量在边缘就过滤掉"), flow: _t(645, "CloudFront 在边缘接住请求 + WAF 过滤恶意流量 → API Gateway 处理 →（可选）Lambda 跑后端逻辑"), d: '—' },
  { id: 'ddos', n: _t(646, "DDoS 防护"), need: [['cloudfront', 'elb'], 'shield', 'waf'], link: ['+', '+'], use: _t(647, "扛大流量 DDoS：网络层和应用层攻击都有人兜底，被打期间的扩容费用也能申请抵扣"), flow: _t(648, "CloudFront 分发或 ALB 加进 Shield Advanced 保护 → 防应用层攻击要给这个入口关联 WAF Web ACL，至少放一条限速规则；订阅里含 Anti-DDoS 托管规则组，HTTP 洪水几秒内就认出来、拦掉或质询 → 网络层的攻击由 Shield Advanced 直接挡"), d: _t(649, "WAF 不交每圈的固定费用，升「托管规则」「限速规则」半价：Shield Advanced 订阅包了受保护资源上 WAF 的标准费用（Bot Control 不在里面，照原价）") },   // 替换「纵深防御」：原来三块之间没有数据流，加成免疫全部安全卡也太宽
]), v => { COMBOS = v; }, () => COMBOS);
// 图鉴里架构按用途分 5 类：分段显示，上面一排按钮按类筛
export let ARCH_CATS = __rv(() => ([['web', _t(650, "网站与 API")], ['flow', _t(651, "事件与流程")], ['data', _t(652, "数据与分析")], ['ai', _t(653, "AI 与智能体")], ['sec', _t(654, "安全与合规")]]), v => { ARCH_CATS = v; }, () => ARCH_CATS);
export const ARCH_CAT = {
  sls: 'web', tier3: 'web', ctr: 'web', web: 'web', ha: 'web', cache: 'web', apiq: 'web', zetlsearch: 'web', authapi: 'web', albauth: 'web', s3direct: 'web', edgeauth: 'web', sharedfs: 'web', edgeapi: 'web',
  event: 'flow', queue: 'flow', thumb: 'flow', s3queue: 'flow', ec2sched: 'flow', orderflow: 'flow', cdcevt: 'flow', cdccache: 'flow', dlq: 'flow',
  etl: 'data', accesslog: 'data', stream: 'data', lake: 'data', elblog: 'data', zetldw: 'data', cdclake: 'data', dbmig: 'data',
  bot: 'ai', rag: 'ai', ml: 'ai', agentcore: 'ai', acsupport: 'ai', acops: 'ai', acdata: 'ai', acauth: 'ai', agent: 'ai', recsys: 'ai',
  soar: 'sec', cleanbak: 'sec', s3guard: 'sec', sgfix: 'sec', secbase: 'sec', vulnscan: 'sec', ddos: 'sec',
};
// need 里：'x' 必须有；['x', 'y'] 几选一；{ opt: 'x' } 可选（没有也算凑成，有的话在线就并进这套一起收）。
// c.seq 按画图顺序记每一环，c.ix 只放必须的几环（凑没凑成看它），c.ox 放可选的几环
COMBOS.forEach(c => { const toIx = n => Array.isArray(n) ? n.map(k => IX[k]) : IX[n];
  c.seq = c.need.map(n => n && n.opt ? { opt: true, n: toIx(n.opt) } : { opt: false, n: toIx(n) });
  c.ix = c.seq.filter(x => !x.opt).map(x => x.n); c.ox = c.seq.filter(x => x.opt).map(x => x.n); });
export const cAll = c => [...c.ix.flat(), ...c.ox.flat()];   // 这套架构里出现的所有服务（含可选）
export const cLink = (c, k) => (c.link && c.link[k]) || '→';   // 第 k 环和第 k+1 环之间的连接符
// 娱乐模式里盲盒格买不到：提示「还差 / 只差 / 再买」时只列买得到的备选，有一环全是盲盒格的架构整条不提（别的模式 isHidden 恒为 false，不受影响）
export const slotOpen = n => (Array.isArray(n) ? n : [n]).filter(k => !isHidden(k));
export const comboOpen = c => c.ix.every(n => slotOpen(n).length);
export let CATS = __rv(() => ({ sec: _t(7, "安全"), avail: _t(655, "可用性"), cost: _t(656, "成本"), ops: _t(657, "运维") }), v => { CATS = v; }, () => CATS);
export let INC = __rv(() => ([null,
  { n: _t(658, "服务配额用完了"), c: 'avail', e: _t(659, "新请求全被拒绝：停一轮，或者交 $80 加急提额、继续走"), im: _t(660, "Lambda 升了「提高并发配额」，或者 CloudWatch 开了「告警与仪表板」（配额用量快满就告警）"), tip: _t(661, "自动扩缩也会撞上配额；用 Service Quotas 提前申请提高，并给配额用量设 CloudWatch 告警"), art: 'cloudwatch' },
  { n: _t(662, "us-east-1 大面积故障"), c: 'avail', e: _t(663, "你名下没有多区域功能的服务都变成 Impaired（暂停收过路费）"), im: _t(664, "有多区域功能的服务和全局服务（Route 53、CloudFront、Shield Advanced）不受影响"), tip: _t(665, "用 Route 53 健康检查 + 故障转移路由切到另一个 Region；切换要靠数据面自动完成，别指望故障时再去改控制面配置；要提前演练"), art: 'region' },
  { n: _t(666, "实习生误删了生产数据"), c: 'ops', e: _t(667, "拆掉你数据库组的 1 级升级（不退钱）；没有可拆的就交 $100 进奖池"), im: _t(668, "你有带备份功能的升级（S3 版本控制、DynamoDB 时间点恢复、EBS 自动快照、EC2 自动 AMI、EFS 自动备份）；互联网医疗公司免疫（地狱模式不算）"), tip: _t(669, "删除保护只防删掉整个实例或整张表，误删数据要靠时间点恢复和备份；备份要定期演练恢复"), art: 'rds' },
  { n: _t(670, "流量暴增"), c: 'avail', e: _t(671, "你名下没有弹性扩展功能的实例型服务变成 Impaired；要是全都扛住了（而且你有服务），从亚马逊云科技领 $100"), im: _t(672, "持有「订单削峰」架构：直接领 $100"), tip: _t(673, "Auto Scaling 按负载加减实例；可预期的高峰用预测性扩缩或定时扩缩提前加机器；队列能削峰"), art: 'ec2' },
  { n: _t(674, "月底账单爆了"), c: 'cost', e: _t(675, "你每块服务按升级级别交：1 级 $25、2 级 $50、3 级 $100；每份容量再交 $10，全部进奖池"), im: _t(676, "用掉 Cost Explorer 卡（开了成本异常检测，早发现早处理）"), tip: _t(677, "用 Budgets 设账单告警，用 Cost Anomaly Detection 发现异常支出"), art: 'budgets' },
  { n: _t(678, "Root 密钥被推到了 GitHub"), c: 'sec', e: _t(679, "直接进维护窗口，不经过 Startup 扶持"), im: _t(680, "持有「威胁自动响应」架构"), tip: _t(681, "别给 root 用户创建访问密钥，并给它开 MFA；亚马逊云科技会扫描公开的 GitHub 仓库，发现泄露的访问密钥会通知你，IAM 用户的密钥还会被自动加上隔离策略"), art: 'iam' },
  { n: _t(682, "S3 桶被设成了公开"), c: 'sec', e: _t(683, "赔给每位其他玩家 $50"), im: _t(684, "有数据保护类升级：KMS「客户托管密钥」（没有密钥权限读不出来）、CloudFront「源访问控制」、Config「自动修正」（自动改回私有）；只有 GuardDuty 时每人少赔一半"), tip: _t(685, "账户级开启 S3 Block Public Access；Config 规则 s3-bucket-public-read-prohibited 发现公开的桶，配自动修正（自动化文档 AWS-DisableS3BucketPublicReadWrite）改回私有；GuardDuty 只告警"), art: 's3' },
  { n: _t(686, "有人手动改了生产配置"), c: 'ops', e: _t(687, "后退 3 格，结算落点"), im: _t(688, "Config 升了「自动修正」"), tip: _t(689, "用 CloudFormation 或 CDK 管理基础设施，用 Config 或 CloudFormation 漂移检测发现手工改动"), art: 'cloudformation' },
  { n: _t(690, "依赖的第三方 API 挂了"), c: 'avail', e: _t(691, "停一轮，或者交 $80 临时切到备用供应商、继续走"), im: _t(692, "持有 SQS 或 Step Functions（排队 + 重试）"), tip: _t(693, "调用外部 API 要设超时，重试加指数退避和随机抖动；处理不了的消息转进 SQS 死信队列，对方恢复后再放回原队列重新处理"), art: 'sqs' },
  { n: _t(694, "证书过期，网站打不开"), c: 'ops', e: _t(5722, "二选一：交 $100 进奖池紧急换证书；或者让你的 ELB 或 CloudFront（两块都有时是过路费高的那块）变成 Impaired，暂停收过路费一整轮：所有人各走一回合后，到你回合开始自动恢复。两块都没有（或者都已经 Impaired）就只能交钱"), im: _t(696, "你的 ELB 或 CloudFront 升到了 HTTPS（ACM 自动续期）"), tip: _t(697, "用在 ELB、CloudFront 上的 ACM 公有证书免费，用 DNS 验证就能自动续期"), art: 'elb' },
  { n: _t(698, "单点故障"), c: 'avail', e: _t(699, "你名下最贵的实例型服务如果还是单 AZ（EBS 卷永远算单 AZ）：变成 Impaired，再交它价格的 10% 进奖池做紧急恢复"), im: _t(700, "最贵的那块已经升了多 AZ；ECS 本来就跨 AZ 分散任务。只在单 AZ 的 EC2 前面挂 ELB 不算"), tip: _t(701, "生产环境至少跨两个 AZ；ELB 和 Auto Scaling 组都要配多个 AZ 的子网"), art: 'ec2' },
  { n: _t(702, "凌晨 3 点被告警叫醒"), c: 'ops', e: _t(703, "现场讲一次你（或者你同事）半夜被告警叫醒的经历：讲出来了，领 $50 加班费、照常走；讲不出来，停一轮，或者交 $80 请值班同事处理"), im: _t(704, "你的 CloudWatch（万能服务）绑在了含 Lambda 或 EC2 的架构上，而且那块 Lambda 或 EC2 是你的、在线：告警直接调 Lambda，或者重启、恢复 EC2（不算罚）"), tip: _t(705, "告警要配好运行手册（Runbook），能自动处理的用 Systems Manager 自动化文档或 Lambda 自动处理"), art: 'cloudwatch' },
  { n: _t(706, "日志打太多了"), c: 'cost', e: _t(5588, "付 $100 给 CloudWatch 的主人；没人买，或者它下线了、被打下线了，就进奖池；主人是你自己就免付"), im: _t(708, "无"), tip: _t(709, "日志的钱主要花在摄取上：控制日志级别、用低频访问日志类；保留期只省存储那部分"), art: 'cloudwatch' },
  { n: _t(710, "CloudFormation 栈创建失败，整栈回滚"), c: 'ops', e: _t(711, "已经建好的资源全删掉、从头再来：退回 Startup 扶持，这次不算经过起点，不领 Credits、也不交运行费"), im: _t(712, "无（不算罚）"), tip: _t(713, "栈创建失败默认整栈回滚：已经建好的资源全删掉，栈停在 ROLLBACK_COMPLETE，只能删掉再建；排查时可以关掉失败回滚，保留已经建成功的资源，改好模板再接着部署"), art: 'cloudformation' },
  { n: _t(714, "安全审计没过"), c: 'sec', e: _t(715, "其他玩家当审计员，每人问你一个安全问题（比如根用户开 MFA 了吗、S3 桶是公开的吗）；过半的人觉得你答得过关就通过。没通过：停一轮整改，或者交 $80 加急整改"), im: _t(716, "持有「安全防护基线」架构，或者 2 块以上安全组服务，或者有审计类升级（WAF 或 Config 的「托管规则」、CloudTrail「日志文件完整性验证」、KMS「自动轮换」等）；金融合规公司免疫"), tip: _t(717, "用 Security Hub CSPM 持续检查安全标准和合规"), art: 'securityhub' },
  { n: _t(718, "一个 AZ 断电了"), c: 'avail', e: _t(719, "你名下还是单 AZ 的实例型服务（IaaS、PaaS、EKS；EBS 卷永远是单 AZ）变成 Impaired"), im: _t(720, "大多数托管服务和全局服务本来就跨多个 AZ，不受影响；EC2 这类实例型服务要升了多 AZ 才扛得住，前面只挂 ELB 不够"), tip: _t(721, "多 AZ 部署让一个 AZ 出问题时服务照常运行；可以用 FIS 的「AZ 断电」场景提前演练"), art: 'region' },
  { n: _t(722, "EC2 实例硬件退役"), c: 'ops', e: _t(723, "你的 EC2 没升到 Auto Scaling：变成 Impaired，再交 $50 进奖池，把实例停止再启动，换到新的硬件上"), im: _t(5268, "EC2 升了 Auto Scaling（自动换掉要退役的实例），或者 ELB 升了「负载均衡 + Auto Scaling」、EventBridge 升了「Health 事件通知」；多 AZ 挡不住某一台实例被退役"), tip: _t(725, "亚马逊云科技会提前通知计划内的实例退役；Auto Scaling 会自动换掉不健康的实例"), art: 'ec2' },
  { n: _t(726, "某个服务在一个 Region 里宕机了"), c: 'avail', e: _t(727, "从你现在的位置往前数，第一块有主的服务所在的色组宕机：组里没有多区域功能的服务都变成 Impaired，不管是谁的"), im: _t(728, "有多区域功能的服务和全局服务（Route 53、CloudFront、Shield Advanced）不受影响；多 AZ 挡不住整个服务出问题"), tip: _t(729, "Health Dashboard 会显示影响你账户的服务事件，也可以用 EventBridge 订阅 Health 事件自动通知"), art: 'health' },
  { n: _t(730, "暴露在公网的实例被 SSH 暴力破解"), c: 'sec', e: _t(5589, "你暴露在公网的实例（EC2，没升到 Fargate 的 ECS，没升到 Auto Mode 的 EKS）：交 $100 进奖池，最贵的一块变成 Impaired；有 GuardDuty 的只交 $50，实例不受影响。别人的 VPC 升到了 Session Manager（而且在线），可以付他 $50 借用，躲过去"), im: _t(732, "持有「威胁自动响应」或「安全组自动收紧」架构；或者你的 VPC 升到了 Session Manager；没有暴露在公网的实例也不受影响"), tip: _t(733, "实例放私有子网，用 Session Manager 或 EC2 Instance Connect 端点登录，安全组不对公网开 22 端口"), art: 'vpc' },
  { n: _t(734, "DDoS 打满了入口"), c: 'sec', e: _t(5723, "二选一：交 $150 进奖池买清洗服务；或者让你过路费最高的一块入口服务（CloudFront、ELB、API Gateway、Route 53）变成 Impaired，暂停收过路费一整轮：所有人各走一回合后，到你回合开始自动恢复。没有入口服务就只能交钱"), im: _t(736, "持有 Shield Advanced、WAF 或 CloudFront"), tip: _t(737, "所有账户默认免费开着 Shield Standard，挡常见的网络层攻击；更大的攻击要靠 CloudFront、WAF 和 Shield Advanced"), art: 'shield' },
  { n: _t(738, "高危 CVE 爆出"), c: 'sec', e: _t(739, "你名下每块没被漏洞扫描保护的 EC2、ECS、EKS、SageMaker AI：交 $30，并变成 Impaired"), im: _t(740, "持有「漏洞管理」架构；或者按块算：Inspector「EC2 扫描」保护 EC2，ECR「增强扫描」或 Inspector「ECR 镜像扫描」保护 ECS、EKS、SageMaker AI。RDS 这类托管数据库和 Serverless 由亚马逊云科技打补丁，不受影响"), tip: _t(741, "Amazon Inspector 会持续扫描 EC2、ECR 镜像和 Lambda 里的已知漏洞"), art: 'inspector' },
  { n: _t(742, "这次事故谁背锅"), c: 'ops', e: _t(743, "开复盘会找背锅的：指一位其他玩家，说出他的服务怎么连累了你；其他人（不算你们俩）投票，过半同意他就交 $100 进奖池，不然你自己交 $100。只有两个人玩时掷骰子，4–6 甩锅成功"), im: _t(708, "无"), tip: _t(744, "好的事故复盘对事不对人（Blameless Postmortem）：找的是流程和系统的漏洞，不是找人背锅"), art: 'cloudwatch',
    run: async p => {
      const others = S.players.filter(o => inPlay(o) && o.id !== p.id); if (!others.length) return 'nopen';
      const t = others.length === 1 ? others[0] : (isAI(p.id) || (SIM && SIM_AI)) ? others[rnd(others.length)] : P(+(await UI.ask({ who: p.id, cls: 'pick', title: _t(745, "这次事故甩给谁？"), html: _tf(746, "<p>指一位其他玩家，说清他的服务怎么连累了你。其他人投票，过半同意他就交 ${$0} 进奖池，不然你自己交。</p>", cardAmt(100)), buttons: others.map(o => ({ label: o.name, value: o.id })) })));
      const voters = others.filter(o => o.id !== t.id);
      let ok;
      if (voters.length) { const y = await vote(voters, _tf(747, "{$0} 说 {$1} 该背锅，你同意吗？", p.name, t.name), _tf(748, "<p>{$0} 说这次事故是 {$1} 的服务连累的。听完理由，你同意吗？</p>", nm(p), nm(t)), _t(749, "同意，他背锅"), _t(750, "不同意"), 0.5); ok = y * 2 > voters.length; }
      else { const d = 1 + rnd(6); ok = d >= 4; log(_tf(751, "🎲 只有两个人，{$0} 掷出 {$1}", nm(p), d)); }
      if (ok) { log(_tf(752, "🫵 {$0} 背锅，交 ${$1} 进奖池", nm(t), pay(t, 'pot', 100))); return 'nopen'; }
      log(_tf(753, "{$0} 甩锅没甩成，自己交 ${$1} 进奖池", nm(p), pay(p, 'pot', 100)));
    } },
]), v => { INC = v; }, () => INC);
export let REI = __rv(() => ([null,
  { n: _t(754, "拿到 Activate 创业扶持 Credits"), e: _t(755, "从亚马逊云科技领 $100；你每有一个生效的架构，再领 $50（最多再领 $200）"), tip: _t(756, "初创公司可以申请亚马逊云科技 Activate 抵扣额度，通过合作的孵化器、投资机构申请额度更高，具体以官网为准"), art: 'activate' },
  { n: _t(757, "买了 Enterprise Support"), keep: 'ES', e: _t(758, "保留：免费离开维护窗口，或抵消一张任意 Health 事件卡"), tip: _t(759, "Enterprise Support：指定技术客户经理（TAM），关键业务故障 15 分钟内响应，还含 Security Incident Response；2027 年起 Business 和 Enterprise On-Ramp 停用，改成 Business Support+ 和 Enterprise Support"), art: 'support' },
  { n: _t(760, "按 Cost Explorer 推荐签了 Savings Plans"), e: _t(761, "立即签一份 1 年（1 圈）Savings Plans：承诺额按你现在的用量自动算，EC2、ECS、EKS、Lambda、SageMaker AI、RDS、Aurora、ElastiCache、OpenSearch 的运行费打 75 折。已经有一份、没有这些运行费，或者按下次的账单算签了也省不下钱的，改领 $50；独立开发者不能签，这张卡没有效果"), tip: _t(762, "Cost Explorer 会按你过去的用量推荐 Savings Plans 的承诺额"), art: 'savingsplans' },
  { n: _t(763, "抢到便宜的 Spot 容量"), keep: 'SPOT', e: _t(764, "保留：下次 Spot 购买时自动用掉，最低出价降到原价的 10%；金融合规公司抽到放回牌堆底"), tip: _t(765, "Spot 用的是空闲容量，最多比按需便宜约 90%，被收回前只提前 2 分钟通知；现在的 Spot 不用竞价，游戏用出价模拟被抢"), art: 'ec2' },
  { n: _t(766, "新服务正式 GA"), e: _t(767, "前进到 Bedrock；没人买的话可以打 8 折买，有主正常付过路费"), tip: _t(768, "标着 Preview 的服务不在 SLA 范围内，功能也可能随时改；等它正式 GA 了再放生产流量"), art: 'bedrock' },
  { n: _t(769, "Keynote 现场演示成功"), e: _t(770, "用 30 秒介绍你的公司和架构（用了哪些服务、组成了什么架构）；其他玩家投票，觉得精彩的每人付你 $50"), tip: _t(771, "re:Invent 每年年底在拉斯维加斯举办"), art: 'chime' },
  { n: _t(772, "考过了 Solutions Architect 认证"), e: _t(773, "清掉 1 个技术债；没有技术债就领 $100"), tip: _t(774, "Solutions Architect – Associate 是最常见的亚马逊云科技认证之一，认证有效期 3 年"), art: 'training' },
  { n: _t(775, "Well-Architected Review 通过"), e: _t(776, "选一块能升级的服务免费升一级；没有可升的就领 $100"), tip: _t(777, "控制台里的 Well-Architected Tool 免费，按六大支柱逐项自查：卓越运营、安全性、可靠性、性能效率、成本优化、可持续性"), art: 'wat' },
  { n: _t(778, "Trusted Advisor 找到闲置资源"), e: _t(779, "可以选一块服务按实付全额卖回亚马逊云科技（买价、升级、容量都退，不打折）；不卖就领 $50"), tip: _t(780, "定期检查闲置的 EBS 卷和弹性 IP；完整的成本优化检查要 Business Support+ 及以上的支持计划"), art: 'trustedadvisor' },
  { n: _t(781, "用上了 Cost Explorer"), keep: 'CE', e: _t(782, "保留：踩到账单格时用掉，免交一次；或者用来抵消一次「月底账单爆了」"), tip: _t(783, "按标签做成本分析；成本异常检测（Cost Anomaly Detection）免费，开了就能收到异常支出提醒"), art: 'costexplorer' },
  { n: _t(784, "亚马逊云科技宣布降价"), e: _t(785, "接下来 2 次经过 Startup 扶持时，运行费都减半（已经签的 Savings Plans 承诺额照付），手上原有的减半卡换成这张；按现在的用量多省不下钱的，改领 $50"), tip: _t(786, "降价之外还有阶梯价：S3 存储和 EC2 出网流量用得越多每 GB 越便宜；传进亚马逊云科技的流量一直免费"), art: 'billing' },
  { n: _t(787, "领到 Free Tier 额度"), e: _t(788, "直接拿走奖池里所有的钱"), tip: _t(789, "2025 年 7 月起，新账户的 Free Tier 改成抵扣额度：注册送 $100，完成入门任务最多再送 $100，具体以官网为准"), art: 'activate' },
  { n: _t(790, "加入迁移加速计划 MAP"), keep: 'MAP', e: _t(791, "保留：下次买 IaaS、PaaS 或容器服务时用掉，打 7 折"), tip: _t(792, "MAP 分评估、动员、迁移与现代化三个阶段：评估时按云采用框架（CAF）的六个维度找能力差距；计划里还有资金，抵掉一部分前期迁移成本"), art: 'mgn' },
  { n: _t(793, "Hackathon 拿了奖"), e: _t(794, "选一块服务免费加 1 份容量（不用集齐整组）；没有能加的就领 $100"), tip: _t(795, "比赛环境用 CloudFormation 搭：比完删掉栈，栈里的资源一起删除，不会漏下实例接着扣费；DeletionPolicy 设成 Retain 的会留下，CDK 给 S3 桶、DynamoDB 表这类存数据的资源默认就设成保留"), art: 'codecatalyst' },
  { n: _t(796, "业务扩张"), e: _t(797, "掷一颗骰子，前进相应的格数"), tip: _t(798, "选 Region 看延迟、合规和价格；同一个服务在不同 Region 价格可能不一样"), art: 'region' },
  { n: _t(799, "技术分享会"), e: _t(800, "每位其他玩家讲一个亚马逊云科技知识点，讲不出来的付你 $20"), tip: _t(801, "各地 User Group 和 Community Day 定期有技术分享，讲出来比只看文档记得牢"), art: 'chime' },
  { n: _t(802, "解决方案架构师的建议"), e: _t(803, "前进到你某个架构里还缺、还没人买的服务（有几块就去最近的那块）；没有的话前进到最近一块没人买的服务；都没有就领 $100"), tip: _t(804, "亚马逊云科技架构中心（Architecture Center）有大量参考架构，照着搭比从零摸索快"), art: 'wat' },
  { n: _t(805, "去上了一节 Workshop"), keep: 'WS', e: _t(806, "保留：下一次答题答错了，算你答对（落地答题、被对手出题考、抽查都算）"), tip: _t(807, "workshops.aws 上有大量公开的动手实验，用自己的账户就能跟着做，做完记得删掉资源"), art: 'training' },
  { n: _t(808, "入选亚马逊云科技 Community Builders"), e: _t(809, "领 1 个复盘标记（自己选类别），以后抵消一张同类 Health 事件卡"), tip: _t(810, "Community Builders 是亚马逊云科技面向技术分享者的公开项目"), art: 'training' },
  { n: _t(811, "上了 Startup Showcase"), e: _t(812, "前进到前面最近一块没人买的服务，可以打 8 折买；不买，或者前面没有没人买的服务，领 $100"), tip: _t(813, "初创公司可以把软件上架亚马逊云科技 Marketplace：客户买了由亚马逊云科技统一出账，费用记在客户自己的亚马逊云科技账单上"), art: 'activate' },
  { n: _t(814, "迁移到 Graviton"), e: _t(815, "EC2 已经升到 Auto Scaling 的，免费换成 Graviton；还没到这一级的，记一次免费，以后升 Graviton 这一级不花钱；没有 EC2、已经是 Graviton 或已经记过的，领 $50"), tip: _t(816, "Graviton 是亚马逊云科技自研的 Arm 处理器，通常比同级 x86 实例性价比更高、也更省电"), art: 'ec2' },
  { n: _t(817, "踩坑大会"), e: _t(818, "每位玩家（包括你）讲一个在云上踩过的坑，然后大家投票选最惨的那个（不能投自己）：得票最多的人从亚马逊云科技领 $100，再领 1 个运维类复盘标记；平票的都领"), tip: _t(819, "亚马逊云科技公开过它的复盘写法 COE（Correction of Error）：写清影响和时间线，用「5 个为什么」追到根因，再列改进项；只找原因，不找人背锅"), art: 'chime',
    run: async p => {
      const all = S.players.filter(o => o.alive), cnt = new Map(), bot = o => isAI(o.id) || (SIM && SIM_AI);
      let pre = null;
      if (tableOK(all)) {
        const hum = all.filter(o => !bot(o)), byAI = new Map(all.filter(bot).map(o => { const c = all.filter(x => x.id !== o.id); return [o.id, c[rnd(c.length)]]; }));
        // 下拉框默认「（没投）」，没填就点「投完了」那一行不算票（跟 Office Hours 默认「不问」一样）。
        // 以前默认投座位上的下一位，全是真人时连成一个环、全桌平票，人人领钱和标记；只有两个人时票是定的，直接选上
        // 下拉框默认「没投」：桌长没改就点「投完了」，这一票不算。以前默认填座位上的下一位，票首尾连成一圈，全桌平票、每人都领钱
        const r = await UI.modal({ who: hum[0].id, title: _t(820, "踩坑大会：谁的坑最惨？"), html: _tf(822, "<p>每人先讲一个在云上踩过的坑（抽到这张卡的 {$0} 也讲），都讲完再投。不能投自己；得票最多的人从亚马逊云科技领 ${$1} 和 1 个运维类复盘标记，平票的都领。留着「（没投）」的那一行不算票。</p>{$2}", nm(p), cardAmt(100), byAI.size ? `<p class="muted">${[...byAI].map(([id, q]) => _tf(821, "{$0} 投给 {$1}", aiName(P(id)), q.name)).join(_t(408, "；"))}</p>` : ''),
          inputs: hum.map(o => { const k = all.indexOf(o); return { id: 'p' + o.id, type: 'select', label: _tf(823, "{$0} 投给", o.name), options: [{ label: _t(824, "（没投）"), value: '' }, ...all.filter(x => x !== o).map(x => ({ label: x.name, value: x.id }))], value: all.length === 2 ? all[1 - k].id : '' }; }), buttons: [{ label: _t(825, "投完了"), value: true, cls: 'pri' }] });
        pre = o => byAI.get(o.id) || (r.inp['p' + o.id] ? P(+r.inp['p' + o.id]) : null);   // 空串是「（没投）」，不能走 P(+'')：那是 0 号玩家
      }
      for (const o of all) {
        const cand = all.filter(x => x.id !== o.id); if (!cand.length) continue;
        if (pre && !pre(o)) { log(_tf(826, "{$0} 没投", nm(o))); continue; }
        const pick = pre ? pre(o) : bot(o) ? cand[rnd(cand.length)] : P(+(await UI.ask({ who: o.id, cls: 'pick', title: _tf(827, "{$0}：谁的坑最惨？", o.name), html: _tf(828, "<p>每人先讲一个在云上踩过的坑（抽到这张卡的 {$0} 也讲），都讲完再投。不能投自己；得票最多的人从亚马逊云科技领 ${$1} 和 1 个运维类复盘标记，平票的都领。</p>", nm(p), cardAmt(100)), buttons: cand.map(x => ({ label: x.name, value: x.id })) })));
        if (!cand.includes(pick)) { log(_tf(826, "{$0} 没投", nm(o))); continue; }
        cnt.set(pick, (cnt.get(pick) || 0) + 1); log(_tf(829, "🗳 {$0} 投给 {$1}", nm(o), nm(pick)));
      }
      const top = Math.max(0, ...cnt.values()); if (!top) log(_t(830, "踩坑大会谁都没投，这次没人领")); [...cnt].filter(([, n]) => n === top && top > 0).forEach(([q]) => { const got = credit(q, 100); q.coe.push({ cat: 'ops', used: false }); log(_tf(831, "🏆 {$0} 的坑最惨，领 ${$1} 和 1 个运维类复盘标记", nm(q), got)); });
    } },
  { n: 'Office Hours', e: _t(832, "你开 Office Hours：每位其他玩家可以问你一个亚马逊云科技问题（也可以不问）。你答上来了，他付你 $30 咨询费；没答上来，你付他 $20"), tip: _t(833, "平时卡住了先搜亚马逊云科技 re:Post：除了社区问答，里面的 Knowledge Center 是亚马逊云科技整理的常见问题排查步骤"), art: 'support',
    run: async (p, others) => {
      const bot = o => isAI(o.id) || (SIM && SIM_AI), OH = { y: _t(834, "问了，答上来了"), n: _t(835, "问了，没答上来"), x: _t(836, "不问") };
      let pre = null;
      if (tableOK(others)) {
        const hum = others.filter(o => !bot(o)), byAI = new Map(others.filter(bot).map(o => [o.id, Math.random() < 0.6 ? 'y' : 'n']));
        const r = await UI.modal({ who: hum[0].id, title: _tf(837, "{$0} 开 Office Hours", p.name), html: `<p>${_tf(839, "每人可以问 {$0} 一个亚马逊云科技问题，也可以不问。答上来了，提问的人付 ${$1} 咨询费；没答上来，{$2} 付提问的人 ${$3}。", nm(p), cardAmt(30), nm(p), cardAmt(20))}</p>${byAI.size ? `<p class="muted">${[...byAI].map(([id, v]) => _tf(838, "{$0}：{$1}", aiName(P(id)), OH[v])).join(_t(408, "；"))}</p>` : ''}`,
          inputs: hum.map(o => ({ id: 'q' + o.id, type: 'select', label: o.name, options: Object.entries(OH).map(([value, label]) => ({ label, value })), value: 'x' })), buttons: [{ label: _t(840, "都问完了"), value: true, cls: 'pri' }] });
        pre = o => byAI.get(o.id) || (OH[r.inp['q' + o.id]] ? r.inp['q' + o.id] : 'x');
      }
      for (const o of others) {
        const v = pre ? pre(o) : bot(o) ? (Math.random() < 0.6 ? 'y' : 'n') : await UI.ask({ who: o.id, title: _tf(841, "{$0}：向 {$1} 请教一个问题", o.name, p.name), html: _tf(842, "<p>问一个亚马逊云科技问题，听 {$0} 怎么答。</p>", nm(p)), buttons: [{ label: _t(834, "问了，答上来了"), value: 'y', cls: 'pri' }, { label: _t(835, "问了，没答上来"), value: 'n' }, { label: _t(836, "不问"), value: 'x' }] });
        if (v === 'y') log(_tf(843, "{$0} 答上了 {$1} 的问题，收咨询费 ${$2}", nm(p), nm(o), pay(o, p, 30))); else if (v === 'n') log(_tf(844, "{$0} 没答上 {$1} 的问题，付他 ${$2}", nm(p), nm(o), pay(p, o, 20)));
      }
    } },
  { n: _t(845, "白板画架构"), e: _t(846, "随机抽一套你还没凑成的架构（图鉴里的有效架构），用一分钟在纸上画出来，讲清每块服务干什么；其他玩家对照图鉴投票：过半觉得讲清楚了，每位其他玩家付你 $30；没过半，你付每人 $10"), tip: _t(847, "官方亚马逊云科技架构图标里有 Region、VPC、可用区、子网这些分组框：按这个顺序一层套一层画（VPC 横跨几个可用区，子网只在一个可用区里），哪些资源只放在一个可用区里一眼就能看出来"), art: 'wat',
    run: async (p, others) => {
      if (!others.length) return;
      // 和「Keynote 现场演示成功」（讲自己的公司和架构）分开：这张考的是参考架构，从自己还没凑成的里随机抽一套，画完别人对照着判
      const pool = COMBOS.filter(c => comboOpen(c) && !hasCombo(p, c.id)), c = (pool.length ? pool : COMBOS.filter(comboOpen))[rnd((pool.length ? pool : COMBOS.filter(comboOpen)).length)];
      log(_tf(848, "🖊 {$0} 上白板画「{$1}」", nm(p), c.n));
      if (!(isAI(p.id) || (SIM && SIM_AI))) await UI.ask({ who: p.id, title: _tf(849, "白板画架构：画「{$0}」", c.n), html: _tf(850, "<p>用一分钟在纸上画出「{$0}」这套架构，讲清每块服务干什么、数据怎么走。画完点「画完了」，大家对照图鉴投票。</p>", c.n), buttons: [{ label: _t(851, "画完了"), value: true, cls: 'pri' }] });
      const y = await vote(others, _tf(852, "{$0} 把「{$1}」讲清楚了吗？", p.name, c.n), _tf(853, "<p>{$0} 画的是「{$1}」。对照一下：{$2}</p>", nm(p), c.n, c.flow), _t(854, "讲清楚了"), _t(855, "没讲清楚"), 0.6);
      if (y * 2 > others.length) { others.forEach(o => pay(o, p, 30)); log(_tf(856, "{$0} 把「{$1}」讲清楚了，每位其他玩家付 ${$2}", nm(p), c.n, cardAmt(30))); } else { others.forEach(o => pay(p, o, 10)); log(_tf(857, "{$0} 没把「{$1}」讲清楚，付每位其他玩家 ${$2}", nm(p), c.n, cardAmt(10))); }
    } },
  // 11-07 换掉「服务名接龙」：说没说对全靠嘴，电脑也只是掷概率，还会提前写出哪个电脑要断。改成从题库出题，对错由游戏判
  { n: _t(858, "亚马逊云科技 Jam 闯关"), e: _t(859, "连闯三关：按你名下服务的色组出三道题（还没有服务就出通用题），每答对一道，从亚马逊云科技领 $40；三道全对，再领 1 个复盘标记（自己选类别）"), tip: _t(860, "亚马逊云科技 Jam 是 re:Invent 和峰会上常见的闯关活动：几个人一组，在准备好的亚马逊云科技账户里排查、修复给定的场景，做对一关拿一关的分"), art: 'training',
    run: async p => {
      const gs = [...new Set(ownedBy(p).map(i => qPoolS(SQ[i])))];
      let n = 0;
      for (let k = 0; k < 3 && p.alive; k++) {
        const x = pickQuestion(gs.length ? gs[rnd(gs.length)] : 'general');
        const ok = await askQuestion(x.q, x.id, _tf(862, "亚马逊云科技 Jam 第 {$0} / 3 关：答对领 ${$1}{$2}", k + 1, cardAmt(40), k === 2 && n === 2 ? _t(861, "，三关全过再领 1 个复盘标记") : ''), { again: x.again, skip: false });
        { const st = ST(p); st.quizN++; if (ok) st.quizOk++; }
        if (ok) { n++; log(_tf(863, "{$0} 亚马逊云科技 Jam 第 {$1} 关答对，领 ${$2}", nm(p), k + 1, credit(p, 40))); } else log(_tf(864, "{$0} 亚马逊云科技 Jam 第 {$1} 关没答对", nm(p), k + 1));
      }
      if (n < 3) return;
      const cat = (isAI(p.id) || (SIM && SIM_AI)) ? Object.keys(CATS)[rnd(Object.keys(CATS).length)] : await UI.ask({ who: p.id, title: _t(865, "亚马逊云科技 Jam 三关全过：领哪一类复盘标记？"), html: _t(866, "<p>复盘标记以后可以抵消一张同类的 Health 事件卡。</p>"), buttons: Object.entries(CATS).map(([k, v]) => ({ label: v, value: k })) });
      p.coe.push({ cat, used: false, text: _t(867, "亚马逊云科技 Jam 闯关的经验") }); log(_tf(868, "🏆 {$0} 亚马逊云科技 Jam 三关全过，领 1 个{$1}类复盘标记", nm(p), CATS[cat]));
    } },
  { n: _t(869, "根因在上游"), keep: 'BLAME', e: _t(870, "保留：抽到 Health 事件卡时，可以用它把那张卡甩给另一位玩家承受（他对那张卡免疫的话就作废）"), tip: _t(871, "CloudWatch 里的 X-Ray 追踪地图按调用关系把服务连成图，出问题的节点会描色：红色是 5xx 故障，黄色是 4xx 客户端错误，紫色是 429 限流；顺着连线就能看出是哪个依赖在报错"), art: 'cloudwatch' },
]), v => { REI = v; }, () => REI);
// 手牌：真人自己抽到、先不公开的 re:Invent 卡最多留几张（engine/18-reinvent.js）。满了就只能现在用、卖掉或丢掉
export const REI_HAND_MAX = 3;
export let CARDN = __rv(() => ({ BLAME: _t(869, "根因在上游"), ES: 'Enterprise Support', SP: 'Savings Plans', SPOT: _t(872, "Spot 实例"), CE: 'Cost Explorer', MAP: _t(873, "MAP 迁移加速"), WS: _t(874, "Workshop 动手实验"), SPOTN: _t(5590, "Spot 中断通知") }), v => { CARDN = v; }, () => CARDN);
export let CARDE = __rv(() => ({ BLAME: _t(875, "下次抽到 Health 事件时，可以把它甩给另一位玩家承受"), ES: _t(876, "免费离开维护窗口，或抵消一张任意 Health 事件卡"), SP: _t(877, "付过路费时用掉，这次减半（旧存档里的卡）"), SPOT: _t(878, "下次 Spot 购买时自动用掉，最低出价降到原价的 10%"), CE: _t(879, "踩到账单格时用掉免交一次，或抵消一次「月底账单爆了」"), MAP: _t(880, "下次买 IaaS、PaaS 或容器服务时用掉，打 7 折"), WS: _t(881, "下一次答题答错了，算你答对"), SPOTN: _t(5591, "下次你的 Spot 服务要被别人抢走时自动保住一次") }), v => { CARDE = v; }, () => CARDE);

// 题卡：o[0] 是正确答案。干扰项要和正确项差不多长、说法确实是错的，不然玩家挑最长的那个就能蒙对
export let QUIZ = __rv(() => ({
  storage: [
    { q: _t(882, "S3 标准存储的设计耐久性是多少？"), o: [_t(883, "99.999999999%（11 个 9）"), _t(884, "99.99%（4 个 9）"), _t(885, "99.9999999%（9 个 9）"), _t(886, "99.99999999999%（13 个 9）")], a: _t(887, "耐久性 11 个 9；可用性是另一回事") },
    { q: _t(888, "单个 S3 对象最大可以多大？"), o: ['50 TB', '5 GB', '500 GB', _t(889, "没有上限")], a: _t(890, "2025 年 12 月从 5 TB 提到 50 TB；单次 PUT 最大 5 GB，更大要用分段上传") },
    { q: _t(891, "EFS 是什么类型的存储？"), o: [_t(892, "共享文件系统，多台实例能同时挂载"), _t(893, "块存储，同一时间只能挂一台实例"), _t(894, "对象存储，用 HTTP 接口按键存取"), _t(895, "实例自带的临时盘，停机就清空")], a: _t(896, "EFS 用 NFS 协议，按用量自动伸缩") },
    { q: _t(897, "Backup 主要用来做什么？"), o: [_t(898, "集中管理多个服务的备份策略"), _t(899, "把本地服务器整机迁到亚马逊云科技"), _t(900, "缓存静态内容，加速网站访问"), _t(901, "扫描实例和镜像里的软件漏洞")], a: _t(902, "能统一管 EBS、RDS、DynamoDB、EFS 等的备份") },
    { q:  _t(903, "2023 年 4 月起，新建的 S3 桶默认是什么状态？"), "o": [_t(904, "开启 Block Public Access、禁用 ACL"), _t(905, "关闭 Block Public Access、启用 ACL"), _t(906, "开启 Block Public Access，ACL 照常可用"), _t(907, "默认公开读，对象也不加密")], "a": _t(908, "想公开要自己显式关掉 Block Public Access") },
    { q:  _t(909, "S3、EFS 这类服务要不要自己做多 AZ？"), "o": [_t(910, "不用，默认就跨多个 AZ 存数据"), _t(911, "要自己在两个 AZ 各建一个桶互相复制"), _t(912, "要买 Multi-AZ 附加功能"), _t(913, "只有付费版才跨 AZ")], "a": _t(914, "S3 标准存储类至少在 3 个 AZ 里存数据；单区类型如 S3 One Zone-IA、EFS One Zone 例外") },
    { q: _t(915, "S3 智能分层（Intelligent-Tiering）的特点是？"), o: [_t(916, "按访问频率自动换存储层，不收取回费"), _t(917, "要自己写生命周期规则，到了天数才搬"), _t(918, "每次读取都按 GB 收取回费"), _t(919, "只适合每天都要读的热数据")], a: _t(920, "适合访问规律说不准的数据，按对象收一点监控费") },
    { q: _t(921, "EFS 和 EBS 最大的区别是？"), o: [_t(922, "EFS 能被多台实例同时挂载，EBS 卷一般只挂一台"), _t(923, "EBS 卷能跨 AZ 挂载，EFS 只能在一个 AZ 里用"), _t(924, "EFS 是对象存储，EBS 是文件存储"), _t(925, "EFS 按预置容量收费，EBS 按用量收费")], a: _t(926, "EBS 有多重挂载，但只限部分卷类型和同一个 AZ") }
  ],
  iaas: [
    { q: _t(927, "EC2 Spot 实例被中断前会提前多久通知？"), o: [_t(928, "2 分钟"), _t(929, "30 秒"), _t(930, "10 分钟"), _t(931, "1 小时")], a: _t(932, "可以通过实例元数据或 EventBridge 收到中断通知") },
    { q: _t(933, "Graviton 处理器是什么架构？"), o: ['Arm', 'x86', 'RISC-V', 'PowerPC'], a: _t(934, "Graviton 是亚马逊云科技自研的 Arm 处理器，性价比更高") },
    { q: _t(935, "Linux EC2 按秒计费，最低按多久算？"), o: [_t(936, "60 秒"), _t(937, "1 秒"), _t(931, "1 小时"), _t(930, "10 分钟")], a: _t(938, "按秒计费，最低 60 秒") },
    { q: _t(939, "一块 EBS 卷存在于什么范围内？"), o: [_t(940, "单个 AZ"), _t(941, "整个 Region"), _t(942, "全球"), _t(943, "单台物理机")], a: _t(944, "所以要靠快照才能在别的 AZ 恢复") },
    { q:  _t(945, "2024 年 2 月起，公网 IPv4 地址怎么收费？"), "o": [_t(946, "每个地址按小时收费，不管有没有在用"), _t(947, "只有没绑定实例的弹性 IP 才收费"), _t(948, "绑在运行中实例上的第一个地址免费"), _t(949, "按出站流量收费，不用就不花钱")], "a": _t(950, "所以私有子网 + NAT、IPv6 越来越常见") },
    { q:  _t(951, "EC2 实例 Stop 之后还收什么钱？"), "o": [_t(952, "EBS 卷存储费和弹性 IP 费"), _t(953, "照常收实例费，只免流量费"), _t(954, "只收一半实例费，EBS 免费"), _t(955, "什么都不收，EBS 也停止计费")], "a": _t(956, "停机只停算力费用，存储照收") },
    { q: _t(957, "EC2 Auto Scaling 组想跨 AZ 高可用，要怎么配？"), o: [_t(958, "选多个 AZ 的子网"), _t(959, "只选一个子网，多开几台实例"), _t(960, "给每台实例绑一个弹性 IP"), _t(961, "开 Shield Advanced 防故障")], a: _t(962, "实例会自动在这些 AZ 之间平衡") },
    { q: _t(963, "EBS gp3 相比 gp2 的主要优势是？"), o: [_t(964, "IOPS 和吞吐能单独配，还更便宜"), _t(965, "能同时挂到不同 AZ 的实例上"), _t(966, "只能挂在 Graviton 实例上"), _t(967, "靠突发积分短时间冲高 IOPS")], a: _t(968, "gp2 的性能跟容量绑定，还靠突发积分冲高；gp3 不用突发积分") }
  ],
  net: [
    { q: _t(969, "一个子网能跨多个 AZ 吗？"), o: [_t(970, "不能，一个子网只在一个 AZ"), _t(971, "可以跨同 Region 所有 AZ"), _t(972, "可以跨两个 AZ"), _t(973, "可以跨 Region")], a: _t(974, "VPC 跨 AZ，子网不跨") },
    { q: _t(975, "Route 53 这个名字从哪来？"), o: [_t(976, "DNS 服务使用 53 端口"), _t(977, "它是第 53 个发布的服务"), _t(978, "纪念美国的 53 号公路"), _t(979, "全球有 53 个边缘节点")], a: _t(980, "DNS 默认端口是 53") },
    { q: _t(981, "ALB 工作在哪一层？"), o: [_t(982, "第 7 层（HTTP/HTTPS）"), _t(983, "第 4 层（TCP/UDP/TLS）"), _t(984, "第 3 层（IP 包）"), _t(985, "第 2 层（以太网帧）")], a: _t(986, "ALB 是 7 层，NLB 是 4 层") },
    { q: _t(987, "私有子网里的实例要访问公网（只出不进），通常用？"), o: [_t(988, "NAT 网关"), _t(989, "把互联网网关挂到私有子网"), _t(990, "VPC 对等连接"), 'Route 53'], a: _t(991, "NAT 网关按小时加流量收费，私有子网的路由指向它") },
    { q:  _t(992, "私有子网里的实例访问 S3，怎么做不走 NAT 网关、不付流量处理费？"), "o": [_t(993, "建 S3 网关终端节点"), _t(994, "开公网 IP"), _t(995, "用 Direct Connect"), _t(996, "用 CloudFront")], "a": _t(997, "S3 和 DynamoDB 的网关终端节点不收费") },
    { q:  _t(998, "NAT 网关怎么收费？"), "o": [_t(999, "按小时 + 按处理的数据量"), _t(1000, "只按小时收，流量不另算"), _t(1001, "只按处理的数据量，空着不花钱"), _t(1002, "免费，只收公网 IP 的钱")], "a": _t(1003, "是很多账单里的隐形大头") },
    { q: _t(1004, "安全组和网络 ACL 的区别之一是？"), o: [_t(1005, "安全组有状态，网络 ACL 无状态"), _t(1006, "安全组作用在子网上，网络 ACL 挂在网卡上"), _t(1007, "网络 ACL 只能允许、不能写拒绝规则"), _t(1008, "两者都有状态，回程流量自动放行")], a: _t(1009, "安全组挂在网卡上，回程流量自动放行") },
    { q: _t(1010, "Transit Gateway 用来解决什么问题？"), o: [_t(1011, "很多 VPC 和本地网络互联，不用两两对等"), _t(1012, "让私有子网的实例只出不进地访问公网"), _t(1013, "把一个 VPC 扩展到多个 Region"), _t(1014, "给 VPC 里的服务做 DNS 解析")], a: _t(1015, "中心辐射式连接，路由集中管理") }
  ],
  ctr: [
    { q: _t(1016, "ECR 是什么？"), o: [_t(1017, "托管的容器镜像仓库"), _t(1018, "托管的容器编排服务"), _t(1019, "容器之间的负载均衡"), _t(1020, "收集容器日志的服务")], a: _t(1021, "存放 Docker / OCI 镜像，可以做漏洞扫描") },
    { q: _t(1022, "ECR 的增强扫描借助了哪个服务？"), o: ['Amazon Inspector', 'Amazon GuardDuty', 'Amazon Macie', 'Security Hub'], a: _t(1023, "增强扫描会持续扫描镜像里的操作系统和编程语言包漏洞") },
    { q: _t(1024, "EKS 帮你托管的是什么？"), o: [_t(1025, "Kubernetes 控制平面"), _t(1026, "Kubernetes 镜像仓库"), _t(1027, "只托管工作节点，控制平面自己装"), _t(1028, "底层的虚拟机管理程序")], a: _t(1029, "工作节点可以用 EC2、托管节点组、Fargate，或者交给 EKS Auto Mode 管") },
    { q: _t(1030, "在 ECS 上想不管服务器直接跑容器，选什么？"), o: ['Fargate', 'Lightsail', 'Outposts', 'Snowball'], a: _t(1031, "Fargate 按 vCPU 和内存按秒计费") },
    { q:  _t(1032, "ECS 服务（包括 Fargate）默认怎么在 AZ 之间放任务？"), "o": [_t(1033, "尽量分散到多个 AZ"), _t(1034, "都放在第一个 AZ"), _t(1035, "随机放在一个 AZ"), _t(1036, "要手动给每个任务指定 AZ")], "a": _t(1037, "子网覆盖多个 AZ 时，默认按 AZ 分散") },
    { q:  _t(1038, "EKS Auto Mode 的节点最长运行多久就会被自动替换？"), "o": [_t(1039, "21 天"), _t(1040, "7 天"), _t(1041, "90 天"), _t(1042, "永远不换")], "a": _t(1043, "定期换新节点，保证补丁和组件是新的") },
    { q: _t(1044, "ECR 生命周期策略能做什么？"), o: [_t(1045, "自动清理旧镜像，省存储费"), _t(1046, "把镜像缓存到边缘，加速拉取"), _t(1047, "推送镜像时自动扫描漏洞"), _t(1048, "把镜像自动复制到别的 Region")], a: _t(1049, "比如只保留最近 30 个版本；扫描和跨 Region 复制是另外的设置") },
    { q: _t(1050, "Fargate Spot 适合跑什么？"), o: [_t(1051, "能容忍中断的任务，比如批处理"), _t(1052, "数据库主库，要求一直在线"), _t(1053, "支付核心链路，一秒都不能断"), _t(1054, "要固定 IP、长期不重启的服务")], a: _t(1055, "可能被收回，中断前有 2 分钟通知") }
  ],
  sls: [
    { q: _t(1056, "标准 Lambda 函数单次执行最长能跑多久？"), o: [_t(1057, "15 分钟"), _t(1058, "5 分钟"), _t(1059, "60 分钟"), _t(1060, "没有限制")], a: _t(1061, "更长的任务考虑 Step Functions、ECS 或 Batch") },
    { q: _t(1062, "Lambda 函数最多能配置多少内存？"), o: ['10,240 MB', '3,008 MB', '1,024 MB', '20,480 MB'], a: _t(1063, "CPU 按内存大小成比例分配") },
    { q: _t(1064, "API Gateway 支持哪几类 API？"), o: [_t(1065, "REST、HTTP、WebSocket"), _t(1066, "REST、gRPC、GraphQL"), _t(1067, "HTTP、MQTT、WebSocket"), _t(1068, "只有 REST，别的要用 ALB")], a: _t(1069, "HTTP API 更便宜、更轻量；GraphQL 要用 AppSync") },
    { q: _t(1070, "DynamoDB 单个项目最大是多少？"), o: ['400 KB', '4 MB', '640 KB', '16 MB'], a: _t(1071, "大对象通常放 S3，表里存指针") },
    { q:  _t(1072, "Lambda、DynamoDB 这类 Serverless 服务，高可用要自己做多 AZ 吗？"), "o": [_t(1073, "不用，默认就在多个 AZ 里运行"), _t(1074, "要自己在两个 AZ 各部署一份"), _t(1075, "要另外开多 AZ 选项，按小时收费"), _t(1076, "只有开了预置并发才跨 AZ")], "a": _t(1077, "Serverless 自带跨 AZ 高可用；要扛整个 Region 出问题，才需要自己做多区域") },
    { q:  _t(1078, "Lambda 主要按什么收费？"), "o": [_t(1079, "请求次数和运行时长"), _t(1080, "函数部署后按小时收开机费"), _t(1081, "按函数个数包月"), _t(1082, "按代码包大小和存放天数")], "a": _t(1083, "时长按配置的内存折算，没有请求就不花钱；预置并发另外按时长收费") },
    { q: _t(1084, "Lambda 冷启动是什么？"), o: [_t(1085, "新执行环境初始化多花的时间"), _t(1086, "函数超过 15 分钟被强制停止"), _t(1087, "函数报错后自动重试的过程"), _t(1088, "内存不够用被系统杀掉进程")], a: _t(1089, "预置并发可以提前准备好执行环境") },
    { q: _t(1090, "DynamoDB 的分区键选得不好会怎样？"), o: [_t(1091, "请求集中到少数分区，形成热点被限流"), _t(1092, "没有影响，DynamoDB 会自动打散"), _t(1093, "查询会变慢，但不会被限流"), _t(1094, "数据会丢失，要从备份恢复")], a: _t(1095, "分区键要选取值分散的字段") }
  ],
  integ: [
    { q: _t(1096, "SQS 有哪两种队列？"), o: [_t(1097, "标准队列和 FIFO 队列"), _t(1098, "普通队列和 LIFO 队列"), _t(1099, "公有队列和私有队列"), _t(1100, "标准队列和优先级队列")], a: _t(1101, "FIFO 按消息组保证顺序，5 分钟窗口内去重") },
    { q: _t(1102, "SQS 消息最长能在队列里保留多久？"), o: [_t(1103, "14 天"), _t(1104, "1 天"), _t(1105, "30 天"), _t(1106, "永久")], a: _t(1107, "默认 4 天，最长 14 天") },
    { q: _t(1108, "Step Functions 有哪两种工作流类型？"), o: [_t(1109, "Standard 和 Express"), _t(1110, "Sync 和 Async"), _t(1111, "Basic 和 Pro"), _t(1112, "Batch 和 Stream")], a: _t(1113, "Standard 最长跑 1 年；Express 适合高频短流程") },
    { q: _t(1114, "EventBridge 主要用来做什么？"), o: [_t(1115, "接收事件并按规则路由给目标"), _t(1116, "把消息存进队列，等消费者来拉"), _t(1117, "按顺序编排多个 Lambda 步骤"), _t(1118, "收集和查询应用日志")], a: _t(1119, "能接亚马逊云科技服务、SaaS 和自己应用发出的事件") },
    { q:  _t(1120, "SQS 标准队列的投递保证是什么？"), "o": [_t(1121, "至少一次，可能重复、乱序"), _t(1122, "恰好一次，严格按发送顺序"), _t(1123, "最多一次，丢了不会重发"), _t(1124, "至少一次，严格按顺序")], "a": _t(1125, "要严格顺序和去重用 FIFO 队列，消费端也要做幂等") },
    { q:  _t(1126, "EventBridge 全局端点（Global Endpoints）用来做什么？"), "o": [_t(1127, "主 Region 故障时，事件切到备用 Region"), _t(1128, "把事件同时投递到全球所有 Region 的总线"), _t(1129, "给事件总线一个全球加速入口，降低延迟"), _t(1130, "多个账户共用一条事件总线，省钱")], "a": _t(1131, "配合 Route 53 健康检查自动故障转移") },
    { q: _t(1132, "SNS 和 SQS 的区别？"), o: [_t(1133, "SNS 一对多推送，SQS 等消费者来拉"), _t(1134, "SQS 一对多推送，SNS 等消费者来拉"), _t(1135, "SNS 只能发短信，SQS 只能发邮件"), _t(1136, "两者完全一样，只是名字不同")], a: _t(1137, "SNS 是发布订阅，SQS 是队列；常见组合是 SNS 扇出到多个 SQS 队列") },
    { q: _t(1138, "Step Functions Standard 工作流最长能跑多久？"), o: [_t(1139, "1 年"), _t(1058, "5 分钟"), _t(1057, "15 分钟"), _t(1104, "1 天")], a: _t(1140, "Express 工作流最长 5 分钟") }
  ],
  db: [
    { q: _t(1141, "Aurora 的存储默认怎么保存数据？"), o: [_t(1142, "跨 3 个 AZ 存 6 份"), _t(1143, "单 AZ 存 2 份"), _t(1144, "跨 2 个 Region 存 4 份"), _t(1145, "只存 1 份，靠快照")], a: _t(1146, "存储层自动复制，和计算分离") },
    { q: _t(1147, "RDS 多 AZ 部署主要解决什么问题？"), o: [_t(1148, "高可用，主库故障自动切换"), _t(1149, "跨 Region 容灾，Region 挂了也能切"), _t(1150, "降低成本，备库不收钱"), _t(1151, "自动分库分表，扩展写入能力")], a: _t(1152, "读扩展用只读副本") },
    { q: _t(1153, "RDS 自动备份最长能保留多久？"), o: [_t(1154, "35 天"), _t(1040, "7 天"), _t(1041, "90 天"), _t(1139, "1 年")], a: _t(1155, "更长的保留可以用手动快照或 Backup") },
    { q: _t(1156, "ElastiCache 支持哪些引擎？"), o: [_t(1157, "Valkey、Redis OSS、Memcached"), _t(1158, "MySQL、PostgreSQL、SQL Server"), _t(1159, "MongoDB、Cassandra、Neo4j"), _t(1160, "Elasticsearch、OpenSearch、Solr")], a: _t(1161, "常用来做缓存和会话存储") },
    { q:  _t(1162, "RDS 实例最多能停机多久？"), "o": [_t(1163, "7 天，之后会自动启动"), _t(1164, "想停多久停多久，不收任何钱"), _t(1165, "30 天，之后自动删除"), _t(1166, "1 天，第二天自动启动")], "a": _t(1167, "停机期间存储照收") },
    { q:  _t(1168, "Database Savings Plans 有几种期限？"), "o": [_t(1169, "只有 1 年期"), _t(1170, "1 年和 3 年"), _t(1171, "只有 3 年"), _t(1172, "按月")], "a": _t(1173, "最多约省 35%，覆盖 RDS、Aurora、DynamoDB、ElastiCache 等") },
    { q: _t(1174, "Aurora Serverless v2 的特点是？"), o: [_t(1175, "按负载自动增减容量（ACU）"), _t(1176, "只能部署在单个 AZ 里"), _t(1177, "只支持 PostgreSQL，不支持 MySQL"), _t(1178, "容量固定，要手动改实例规格")], a: _t(1179, "适合负载波动大的业务") },
    { q: _t(1180, "ElastiCache 常见用途不包括？"), o: [_t(1181, "长期存放唯一一份业务数据"), _t(1182, "缓存数据库查询的热点结果"), _t(1183, "保存登录会话，多台服务器共享"), _t(1184, "用有序集合做实时排行榜")], a: _t(1185, "缓存要能接受数据丢失，重要数据要有持久化的数据库兜底") }
  ],
  ana: [
    { q: _t(1186, "Kinesis Data Streams 默认保留数据多久？"), o: [_t(1187, "24 小时"), _t(1040, "7 天"), _t(1188, "12 小时"), _t(1189, "永久保存")], a: _t(1190, "默认 24 小时，可以延长到 365 天") },
    { q: _t(1191, "Kinesis Data Streams 单个分片的写入上限是？"), o: [_t(1192, "每秒 1 MB 或 1000 条"), _t(1193, "每秒 2 MB 或 2000 条"), _t(1194, "每秒 10 MB 或 1 万条"), _t(1195, "每秒 100 条，不限大小")], a: _t(1196, "每秒 2 MB 是读取上限；吞吐不够就加分片，或用按需模式") },
    { q: _t(1197, "Glue 主要用来做什么？"), o: [_t(1198, "无服务器的 ETL 和数据目录"), _t(1199, "托管的 Kafka 流数据集群"), _t(1200, "无服务器的 BI 报表和看板"), _t(1201, "托管的关系型数据库")], a: _t(1202, "Glue Data Catalog 是很多分析服务共用的元数据目录") },
    { q: _t(1203, "Athena 默认（按需）模式下按什么收费？"), o: [_t(1204, "按每次查询扫描的数据量"), _t(1205, "按查询返回的结果行数"), _t(1206, "按集群节点数和运行小时"), _t(1207, "按查询的用户数包月")], a: _t(1208, "用列式格式和分区能大幅减少扫描量") },
    { q:  _t(1209, "用 Athena 查询 S3 上的数据，怎么最省钱？"), "o": [_t(1210, "用 Parquet 这类列式格式并分区"), _t(1211, "转成 CSV，再合并成一个大文件"), _t(1212, "转成 JSON，一行一条记录"), _t(1213, "每次都查全表，免得漏数据")], "a": _t(1214, "Athena 按扫描的数据量收费，扫得越少越便宜") },
    { q:  _t(1215, "Kinesis Data Streams 空着没数据时要付钱吗？"), "o": [_t(1216, "要，按小时或账户保底收费"), _t(1217, "不要，只按写入的数据量收费"), _t(1218, "只在有消费者读取时才收费"), _t(1219, "不要，空着的流会自动暂停")], "a": _t(1220, "预置模式按分片小时、按需标准模式按数据流小时收费，空着也照算；账户开了 On-demand Advantage 就不收每条流的小时费，但这个 Region 的按需流合计每秒至少按写入、读取各 25 MiB 收费。所以它不算「没人用就不花钱」的 Serverless") },
    { q: _t(1221, "Glue 爬网程序（Crawler）做什么？"), o: [_t(1222, "扫描数据源，推断表结构写进数据目录"), _t(1223, "抓取网页内容，存进 S3 备用"), _t(1224, "把小文件压缩合并成大文件"), _t(1225, "定时把 S3 的数据搬进 Redshift")], a: _t(1226, "之后 Athena、Redshift Spectrum 就能直接查") },
    { q: _t(1227, "Kinesis Data Firehose（现名 Amazon Data Firehose）主要用来？"), o: [_t(1228, "把流数据自动投递到 S3 等目的地"), _t(1229, "托管的 Kafka 集群，要自己选分区数"), _t(1230, "存流数据，消费者按分片自己来读"), _t(1231, "对流数据跑 SQL，实时出报表")], a: _t(1232, "目的地有 S3、Redshift、OpenSearch 等；不用写消费者代码，自动攒批写入") }
  ],
  dw: [
    { q: _t(1233, "Redshift 是行式存储还是列式存储？"), o: [_t(1234, "列式"), _t(1235, "行式"), _t(1236, "键值"), _t(1237, "图")], a: _t(1238, "列式存储适合分析型查询") },
    { q: _t(1239, "Redshift Spectrum 可以做什么？"), o: [_t(1240, "直接查询 S3 上的数据"), _t(1241, "把数据同步到 DynamoDB"), _t(1242, "给 Redshift 加 GPU"), _t(1243, "画报表")], a: _t(1244, "不用先把数据导入 Redshift") },
    { q: _t(1245, "EMR 是什么？"), o: [_t(1246, "托管的 Spark、Hadoop 等大数据框架"), _t(1247, "托管的 PostgreSQL、MySQL 数据库"), _t(1248, "把本地数据库迁上云的迁移工具"), _t(1249, "托管的 Elasticsearch 搜索集群")], a: _t(1250, "可以用 EC2、EKS 或 Serverless 方式运行") },
    { q: _t(1251, "OpenSearch Service 常用来做什么？"), o: [_t(1252, "全文搜索和日志分析"), _t(1253, "对象存储和静态网站托管"), _t(1254, "消息队列和事件路由"), _t(1255, "关系数据库和事务处理")], a: _t(1256, "也可以当向量数据库，给 RAG 用") },
    { q:  _t(1257, "OpenSearch Service 的域能像 EC2 一样 Stop 吗？"), "o": [_t(1258, "不能，只能删除"), _t(1259, "可以随时 Stop"), _t(1260, "可以暂停 7 天"), _t(1261, "可以降到 0 个节点")], "a": _t(1262, "不用了就删域，删之前先拍快照") },
    { q:  _t(1263, "EMR 集群能跨多个 AZ 部署吗？"), "o": [_t(1264, "不能，一个集群只在一个 AZ"), _t(1265, "能，默认自动跨 3 个 AZ"), _t(1266, "能，开多 AZ 选项另外收费"), _t(1267, "只有多主节点版能跨 AZ")], "a": _t(1268, "多主节点只防主节点故障，挡不住整个 AZ 出问题") },
    { q: _t(1269, "Redshift Serverless 怎么收费？"), o: [_t(1270, "按用到的 RPU 小时"), _t(1271, "按集群节点数包月"), _t(1272, "按查询扫描的数据量"), _t(1273, "按查询返回的行数")], a: _t(1274, "RPU 是计算容量单位；没有查询时不收计算费，存储另算") },
    { q: _t(1275, "OpenSearch 的 UltraWarm 适合放什么数据？"), o: [_t(1276, "很少查询的旧日志"), _t(1277, "正在实时写入的热数据"), _t(141, "密钥"), _t(1278, "容器镜像")], a: _t(1279, "比热节点便宜很多，查询稍慢") }
  ],
  sec: [
    { q: _t(1280, "GuardDuty 主要分析哪些数据？"), o: [_t(1281, "CloudTrail、VPC 流日志、DNS 日志等"), _t(1282, "只看 S3 服务器访问日志和账单"), _t(1283, "实例的 CPU 和内存监控指标"), _t(1284, "实例上杀毒软件的扫描结果")], a: _t(1285, "基础检测开启即可，不用自己部署采集；运行时监控要装代理，可以自动管理") },
    { q: _t(1286, "Amazon Inspector 做什么？"), o: [_t(1287, "扫描软件漏洞和网络暴露"), _t(1288, "分析日志，发现可疑的登录和调用"), _t(1289, "找出 S3 里的个人敏感信息"), _t(1290, "检查资源配置合不合规")], a: _t(1291, "自动扫描 EC2、ECR 镜像和 Lambda 里的已知漏洞（CVE）") },
    { q: _t(1292, "KMS 用来做什么？"), o: [_t(1293, "创建和管理加密密钥"), _t(1294, "存放数据库密码并自动轮换"), _t(1295, "签发和续期 TLS 证书"), _t(1296, "管理用户的登录和权限")], a: _t(1297, "很多服务的静态加密都靠 KMS 密钥；存密码用 Secrets Manager，证书用 ACM") },
    { q: _t(1298, "root 用户的最佳实践是？"), o: [_t(1299, "开启 MFA，日常不用 root"), _t(1300, "给 root 生成访问密钥写进代码"), _t(1301, "和团队共享 root 密码"), _t(1302, "root 只用来部署 Lambda")], a: _t(1303, "日常操作用 IAM Identity Center 或 IAM 角色") },
    { q:  _t(1304, "KMS 客户托管密钥的自动轮换周期可以设多久？"), "o": [_t(1305, "90 到 2560 天，默认 1 年"), _t(1306, "30 到 365 天，默认 90 天"), _t(1307, "固定 1 年，不能改"), _t(1308, "只能手动轮换，没有自动")], "a": _t(1309, "轮换后旧数据照样能解密") },
    { q:  _t(1310, "给员工统一登录多个亚马逊云科技账户，推荐用什么？"), "o": ["IAM Identity Center", _t(1311, "每个账户各建一套 IAM 用户和密码"), _t(1312, "大家共用一个 root 用户的密码"), _t(1313, "共享一组长期访问密钥")], "a": _t(1314, "配合 Organizations 统一管权限") },
    { q: _t(1315, "IAM 最小权限原则是指？"), o: [_t(1316, "只给完成工作所需的最少权限"), _t(1317, "先给管理员权限，出了事再收"), _t(1318, "所有人共用一个 IAM 用户，方便审计"), _t(1319, "每人一个 IAM 用户，权限都给全")], a: _t(1320, "可以用 IAM Access Analyzer 找出没用到的权限") },
    { q: _t(1321, "Macie 主要做什么？"), o: [_t(1322, "发现 S3 里的敏感数据，比如个人信息"), _t(1323, "扫描 EC2 和容器镜像里的软件漏洞"), _t(1324, "分析 CloudTrail 日志，发现异常登录"), _t(1325, "集中管理加密 S3 用的密钥")], a: _t(1326, "用机器学习和规则识别敏感数据") }
  ],
  edge: [
    { q: _t(1327, "CloudFront 是什么？"), o: [_t(1328, "CDN，把内容缓存到离用户近的边缘节点"), _t(1329, "托管的 DNS 服务，按用户位置解析域名"), _t(1330, "对象存储，专门存放网站的静态文件"), _t(1331, "负载均衡器，把请求分给多台实例")], a: _t(1332, "还能和 WAF、Shield 一起挡攻击") },
    { q: _t(1333, "Shield Standard 收费吗？"), o: [_t(1334, "不收费，默认开启"), _t(1335, "按请求收费，被攻击时更贵"), _t(1336, "每月 $3,000，一年起签"), _t(1337, "只给企业支持计划的客户")], a: _t(1338, "每月 $3,000、一年起签的是 Shield Advanced") },
    { q: _t(1339, "Shield Advanced 比 Standard 多了什么？"), o: [_t(1340, "7×24 的 DDoS 响应团队和成本保护"), _t(1341, "自动修补实例上的系统漏洞"), _t(1342, "把 S3 桶自动复制到别的 Region"), _t(1343, "免费送 Enterprise Support 支持计划")], a: _t(1344, "遭到 DDoS 导致的扩容费用可以申请补偿") },
    { q: _t(1345, "WAF 可以挂在哪些服务前面？"), o: [_t(1346, "CloudFront、ALB、API Gateway"), _t(1347, "NLB、NAT 网关、Transit Gateway"), _t(1348, "EC2 实例、EBS 卷"), _t(1349, "IAM 角色、KMS 密钥")], a: _t(1350, "WAF 管第 7 层；API Gateway 只能挂 REST API，另外还能挂 AppSync、Cognito 用户池等") },
    { q:  _t(1351, "用 Shield Advanced 的 Shield 响应团队（SRT），要订阅哪类支持计划？"), "o": [_t(1352, "Business Support+ 或 Enterprise Support"), _t(1353, "Basic 就行，订了 Shield Advanced 就自带"), _t(1354, "Developer Support 就够了"), _t(1355, "不用订支持计划，按次另付咨询费")], "a": _t(1356, "2027 年起 Developer、Business 支持计划停用，改成 Business Support+") },
    { q:  _t(1357, "CloudFront 的源访问控制（OAC）解决什么问题？"), "o": [_t(1358, "只让 CloudFront 读 S3 桶，桶不用公开"), _t(1359, "给 S3 桶开公开读，CloudFront 才能取"), _t(1360, "把上传的文件自动加速传到 S3"), _t(1361, "把源站的图片自动压缩成 WebP")], "a": _t(1362, "比旧的源访问身份（OAI）支持更多功能") },
    { q: _t(1363, "CloudFront 缓存命中率低，常见原因是？"), o: [_t(1364, "缓存键里带了多余的请求头或查询参数"), _t(1365, "开了 HTTPS，加密内容没法缓存"), _t(1366, "源站是 S3，S3 的内容不能缓存"), _t(1367, "前面挂了 WAF，请求都被转回源站")], a: _t(1368, "用缓存策略只保留必要的键") },
    { q: _t(1369, "WAF 的托管规则组是什么？"), o: [_t(1370, "亚马逊云科技或合作伙伴维护的现成规则"), _t(1371, "自己写 Lambda 逐条检查请求"), _t(1372, "一组挂在实例上的安全组规则"), _t(1373, "按 IP 自动限速的固定开关，不能改")], a: _t(1374, "比如常见漏洞防护、已知恶意 IP 列表") }
  ],
  ai: [
    { q: _t(1375, "Amazon Bedrock 是做什么的？"), o: [_t(1376, "用 API 调用多家基础模型的托管服务"), _t(1377, "按小时租用的 GPU 实例类型"), _t(1378, "托管的向量数据库，专门存嵌入"), _t(1379, "从零训练大模型的笔记本平台")], a: _t(1380, "按输入和输出的 token 数收费，也可以买按小时计费的预置吞吐") },
    { q: _t(1381, "Amazon Nova 是什么？"), o: [_t(1382, "亚马逊云科技自己的基础模型系列"), _t(1383, "一种搭载自研芯片的 EC2 实例"), _t(1384, "开源社区的大模型，只能本地跑"), _t(1385, "新开的一个 Region 的名字")], a: _t(1386, "有 Micro、Lite、Pro 等档位，新一代是 Nova 2") },
    { q: _t(1387, "Bedrock Knowledge Bases 主要用于？"), o: [_t(1388, "检索增强生成（RAG）"), _t(1389, "微调模型（Fine-tuning）"), _t(1390, "给模型的输出打水印"), _t(1391, "统计 token 用量和费用")], a: _t(1392, "把你的资料接到模型上做检索增强") },
    { q: _t(1393, "SageMaker AI 把模型部署成实时推理服务，叫什么？"), o: [_t(1394, "终端节点（Endpoint）"), _t(1395, "训练作业（Training job）"), _t(1396, "流水线（Pipeline）"), _t(1397, "笔记本实例（Notebook）")], a: _t(1398, "也支持异步推理和批量转换") },
    { q:  _t(1399, "Bedrock 的跨区域推理是做什么的？"), "o": [_t(1400, "把请求分到多个 Region 处理，扛住突发流量"), _t(1401, "把模型权重复制一份到你自己的账户里"), _t(1402, "调用前先过滤输入输出里的有害内容"), _t(1403, "本 Region 整体故障时，自动把调用切到别的 Region")], "a": _t(1404, "地理跨区域推理只在美国、欧盟这类范围内分流，全球跨区域推理分到全球、约省 10%；本 Region 出问题照样调不通") },
    { q:  _t(1405, "Bedrock Guardrails 用来做什么？"), "o": [_t(1406, "过滤有害内容、屏蔽敏感信息"), _t(1407, "自动挑最便宜的模型来回答"), _t(1408, "把模型的上下文窗口加长"), _t(1409, "记录每次调用用了多少 token")], "a": _t(1410, "可以挂在不同模型前面统一使用") },
    { q: _t(1411, "用自己的数据让模型更懂行业术语，比 RAG 更进一步的做法是？"), o: [_t(1412, "微调（Fine-tuning）"), _t(1413, "调高温度（Temperature）"), _t(1414, "把提示词写得更长一些"), _t(1415, "换到离用户近的 Region")], a: _t(1416, "微调成本更高，资料常变时 RAG 更合适") },
    { q: _t(1417, "默认配置下，SageMaker AI 实时推理端点没流量时也收钱吗？"), o: [_t(1418, "收，实例一直开着"), _t(1419, "不收，没请求就不计费"), _t(1420, "只收模型存储的钱"), _t(1421, "只按请求次数收费")], a: _t(1422, "按实例小时计费。流量少可以用 Serverless 或异步推理；托管推理组件的端点也能缩到 0 个实例") }
  ],
  general: [
    { q: _t(1423, "一个亚马逊云科技 Region 至少有几个 AZ？"), o: [_t(1424, "3 个"), _t(1425, "1 个"), _t(1426, "2 个"), _t(1427, "10 个")], a: _t(1428, "每个 Region 由至少 3 个物理隔离的 AZ 组成") },
    { q: _t(1429, "数据从公网传入亚马逊云科技收费吗？"), o: [_t(1430, "通常免费"), _t(1431, "和传出一样贵"), _t(1432, "按包数收费"), _t(1433, "只有 us-east-1 免费")], a: _t(1434, "贵的通常是传出和跨区") },
    { q: _t(1435, "CloudWatch Logs 日志组默认保留多久？"), o: [_t(1436, "永不过期"), _t(1437, "7 天后自动删除"), _t(1438, "30 天后自动删除"), _t(1439, "1 年后自动归档到 S3")], a: _t(1440, "所以要记得自己设保留期") },
    { q: _t(1441, "CloudTrail 记录的是什么？"), o: [_t(1442, "账户里的 API 调用"), _t(1443, "实例的 CPU 和内存指标"), _t(1444, "网站的访问日志和 PV"), _t(1445, "VPC 里的网络流量记录")], a: _t(1446, "谁在什么时候调了什么 API") },
    { q: _t(1447, "同一个 AZ 内的 EC2 用私有 IP 互传数据，收费吗？"), o: [_t(358, "免费"), _t(1448, "按 GB 收费"), _t(1449, "按小时收费"), _t(1450, "需要买 Direct Connect")], a: _t(1451, "跨 AZ 才开始收数据传输费；走公网 IP 或弹性 IP 互传也要收费") },
    { q: _t(1452, "Well-Architected 框架有几大支柱？"), o: ['6', '4', '5', '7'], a: _t(1453, "卓越运营、安全性、可靠性、性能效率、成本优化、可持续性") },
    { q:  _t(1454, "2025 年 7 月起，新注册账户的 Free Tier 变成了什么？"), "o": [_t(1455, "注册送 $100 额度，做任务最多再送 $100"), _t(1456, "注册送 $300 额度，12 个月内用完"), _t(1457, "12 个月免费试用，每月 750 小时，跟以前一样"), _t(1458, "取消了，新账户一律按量付费")], "a": _t(1459, "具体以官网为准") },
    { q:  _t(1460, "亚马逊云科技支持计划 2027 年起有哪几档？"), "o": [_t(1461, "Basic、Business Support+、Enterprise Support、Unified Operations"), _t(1462, "Basic、Developer、Business、Enterprise On-Ramp、Enterprise"), _t(1463, "Basic、Developer、Business Support+、Enterprise Support、Unified Operations"), _t(1464, "免费和付费两档")], "a": _t(1465, "Developer、Business、Enterprise On-Ramp 2027 年 1 月 1 日停用") },
    { q:  _t(1466, "「托管服务天生跨多个 AZ」，那 Region 级故障呢？"), "o": [_t(1467, "要自己做多区域部署"), _t(1468, "托管服务也会自动切到别的 Region"), _t(1469, "买了 Enterprise Support 就有人帮你扛"), _t(1470, "换成 Serverless 就自动扛住")], "a": _t(1471, "托管服务不会自动帮你跨 Region；多 AZ 扛 AZ 故障，多区域才扛 Region 故障") },
    { q: _t(1472, "责任共担模型里，客户负责什么？"), o: [_t(1473, "自己的数据和权限，用 EC2 时的系统补丁"), _t(1474, "机房的物理安全和门禁"), _t(1475, "虚拟化层（Hypervisor）的安全补丁"), _t(1476, "全球骨干网和海底光缆")], a: _t(1477, "服务越托管，客户要管的越少") },
    { q: _t(1478, "一个账户里资源的默认配额（Service Quotas）可以调吗？"), o: [_t(1479, "大多数可以申请提高"), _t(1480, "都不能调"), _t(1481, "只有企业支持才能调"), _t(1482, "要换账户")], a: _t(1483, "可以设 CloudWatch 告警，快到上限时提醒") },
    { q: _t(1484, "Well-Architected Tool 是什么？"), o: [_t(1485, "对照六大支柱自查架构的工具"), _t(1486, "按小时收费的架构咨询服务"), _t(1487, "自动修好架构问题的托管服务"), _t(1488, "实时监控资源健康的仪表板")], a: _t(1489, "免费，会列出高风险问题和改进建议") },
    { q: _t(1490, "用 CloudFormation 的好处不包括？"), o: [_t(1491, "自动让应用代码没有 bug"), _t(1492, "基础设施可以版本管理"), _t(1493, "可以重复部署多套环境"), _t(1494, "改动可以先预览变更集")], a: _t(1495, "基础设施即代码管的是资源，不管业务逻辑") }
  ],
}), v => { QUIZ = v; }, () => QUIZ);


