import { __rv, _t, _tf } from '../core/01-i18n-runtime.js';
import { IX, SQ } from './03-services.js';
import { INC, QUIZ, REI } from './04-roles-combos-cards.js';
import { DLC, DLC_INC, DLC_QUIZ, DLC_REI, MOVE_INC, MOVE_REI, NEW_REI } from './05-dlc.js';
import { QBANK_DLC } from './06-qbank.js';
import { S, active, effActive, log, nm, owns, sqn } from '../engine/07-state.js';
import { pay } from '../engine/08-money.js';
// ================= 把 DLC 的卡和题挂到主数据上 =================
// 从 rules/06-qbank.js 挪出来：这是加载时就要动 INC、REI、QUIZ、DLC 的注册代码，放在题库文件里会让题库和卡牌数据互相等对方先执行完（改 ES module 时会 TDZ）。
// 只在入口按顺序执行一次，别的文件不用这里的名字（INC_ADD1 这些也只在这里用）
MOVE_INC.forEach(c => INC.push(c));   // 从 rules/05-dlc.js 挪来（原来就在 DLC 卡前面，编号不变）：加载时动 INC、REI，放在卡牌数据之前执行会 TDZ
MOVE_REI.forEach(c => REI.push(c));
Object.assign(DLC, QBANK_DLC);   // 题库 DLC 并进 DLC（开局页的卡片）
DLC_INC.forEach(c => INC.push(c));
DLC_REI.forEach(c => REI.push(c));
NEW_REI.forEach(c => REI.push(c));   // 新卡接在 DLC 卡后面，DLC 卡编号不变
// 11-07 基础牌里成本类只有两张（月底账单、日志），补一张：存储没开分层或省钱存储。同样接在最后，已有卡编号不变
const STORE_FIX = [IX.s3, IX.efs, IX.ebs, IX.opensearch];
const storeHit = o => STORE_FIX.filter(i => active(o, i) && !effActive(i, 'cost'));
let INC_ADD1 = __rv(() => ({ n: _t(2479, "存储账单越滚越大"), c: 'cost', e: _t(2480, "旧数据一直放在最贵的存储里：你名下的 S3、EFS、EBS、OpenSearch，没开数据分层或省钱存储的，每块交 $40 进奖池"), im: _t(2481, "按块算：S3 升了「智能分层」、EFS 升了「生命周期管理」、EBS 升了「gp3 卷」、OpenSearch 升了「UltraWarm」的不用交；名下没有这几块也不受影响"), tip: _t(2482, "S3 智能分层按访问频率自动把对象挪到更便宜的层；EFS 生命周期管理把不常用的文件挪到低频访问；EBS 从 gp2 换成 gp3，每 GB 最多便宜约 20%"), art: 's3',
  imm: o => storeHit(o).length ? '' : _t(2483, "名下的存储都开了分层或省钱存储（或者没有这几块）"),
  run: async p => { const hit = storeHit(p); log(_tf(2484, "{$0} 为 {$1} 交 ${$2} 存储费", nm(p), hit.map(sqn).join(_t(349, "、")), pay(p, 'pot', 40 * hit.length))); } }), v => { INC_ADD1 = v; }, () => INC_ADD1);
INC.push(INC_ADD1);
// 11-08：AgentCore、SageMaker AI 的故事（接在最后，已有卡编号不变）
let INC_ADD2 = __rv(() => ({ n: _t(2485, "智能体陷入死循环，一直调工具"), c: 'cost', e: _t(2486, "你的 AgentCore 智能体反复调用同一个工具停不下来，按调用次数和算力计费，跑一夜账单就上去了：交 $100 进奖池"), im: _t(2487, "CloudWatch 升了「告警与仪表板」（调用量一异常就告警，及时掐掉）；名下没有 AgentCore 不受影响"), tip: _t(2488, "AgentCore Observability 把智能体每一步的调用链、耗时和 token 用量都打进 CloudWatch；给调用次数设告警，再给智能体限定最多走几步"), art: 'agentcore',
  imm: o => !owns(o, IX.agentcore) ? _t(2489, "没有 AgentCore") : active(o, IX.cloudwatch) && S.props[IX.cloudwatch].level >= 2 ? _t(2490, "CloudWatch 告警及时掐掉了") : '',
  run: async p => { log(_tf(2491, "{$0} 的智能体停不下来，交 ${$1} 进奖池", nm(p), pay(p, 'pot', 100))); } }), v => { INC_ADD2 = v; }, () => INC_ADD2);
INC.push(INC_ADD2);
let INC_ADD3 = __rv(() => ({ n: _t(2492, "推理端点没人用还一直开着"), c: 'cost', e: _t(2493, "你的 SageMaker AI 实时推理端点按实例小时计费，没流量也照收：交它价格的 20% 进奖池"), im: _t(2494, "用过 Cost Explorer 卡（开了成本异常检测）；名下没有 SageMaker AI 不受影响"), tip: _t(2495, "实时推理端点按实例小时收费，没流量也照收；流量不稳的用 Serverless Inference，或者让推理组件空闲时缩到 0"), art: 'sagemaker',
  imm: o => !owns(o, IX.sagemaker) ? _t(1538, "没有 SageMaker AI") : o.cards.some(x => x.id === 'CE' && x.used) ? _t(1566, "开了成本异常检测") : '',
  run: async p => { log(_tf(2496, "{$0} 的推理端点空转，交 ${$1} 进奖池", nm(p), pay(p, 'pot', Math.round(SQ[IX.sagemaker].p * 0.2)))); } }), v => { INC_ADD3 = v; }, () => INC_ADD3);
INC.push(INC_ADD3);
// 11-08：Cognito 的 Health 卡（接在最后，已有卡编号不变）。登录页人人都有，撞库谁都可能遇到
const credHalf = o => active(o, IX.waf) && S.props[IX.waf].level >= 2;
let INC_ADD4 = __rv(() => ({ n: _t(2497, "用户账号被撞库"), c: 'sec', e: _t(2498, "黑产拿别处泄露的账号密码，批量来你的登录页试：交 $120 进奖池（重置密码、通知用户）；WAF 升了「限速规则」只交一半"), im: _t(2499, "Cognito 升了「MFA 多因素认证」（光有密码登不进去）"), tip: _t(2500, "登录加上 MFA，泄露的密码就不够用了；Cognito 的威胁防护还能发现用户在用已经泄露的密码、异常登录按风险拦截；登录页前面再挂 WAF 的账户接管防护（ATP）托管规则组"), art: 'cognito',
  imm: o => active(o, IX.cognito) && S.props[IX.cognito].level >= 1 ? _t(2501, "Cognito 开了 MFA") : '',
  run: async p => { const h = credHalf(p); log(_tf(2503, "{$0} 的登录页被撞库，交 ${$1} 进奖池{$2}", nm(p), pay(p, 'pot', h ? 60 : 120), h ? _t(2502, "（WAF 限速规则挡掉了大部分请求，只交一半）") : '')); } }), v => { INC_ADD4 = v; }, () => INC_ADD4);
INC.push(INC_ADD4);
Object.entries(DLC_QUIZ).forEach(([k, list]) => list.forEach(q => { const g = k === 'genai' ? 'ai' : k === 'sec' ? 'sec' : 'general'; QUIZ[g].push(Object.assign(q, { dlc: k })); }));   // 推进去的是同一个对象：切换语言时跟着 DLC_QUIZ 一起换字
// 11-09 DMS 进了数据库组：补两道 DMS 的题（接在最后，已有的题编号不变）
let QUIZ_DB_ADD = __rv(() => ([
  { q: _t(2504, "用 DMS 迁数据库，想让新旧库在割接前一直对得上，要开什么？"), o: [_t(2505, "全量加载完以后接着做 CDC 持续复制"), _t(2506, "每天晚上导出一次全量备份再导入"), _t(2507, "让应用同时往两边的库写"), _t(2508, "开 S3 跨区域复制")], a: _t(2509, "DMS 全量搬完以后持续抓源库的变更（CDC）应用到新库，割接时只要停很短的时间") },
  { q: _t(2510, "把 Oracle 迁到 Aurora PostgreSQL，表结构和存储过程用什么转换？"), o: [_t(2511, "DMS Schema Conversion（以前是 SCT）"), _t(2512, "DMS 复制任务会自动转换"), _t(2513, "Aurora PostgreSQL 能直接跑 PL/SQL"), _t(2514, "Glue 爬虫")], a: _t(2515, "异构迁移先用 DMS Schema Conversion 或 SCT 转换表结构和代码对象，数据再由 DMS 复制任务搬过去") }
]), v => { QUIZ_DB_ADD = v; }, () => QUIZ_DB_ADD);
QUIZ.db.push(...QUIZ_DB_ADD);
// 11-08 Cognito 进了安全组：补三道 Cognito 的题（接在最后，已有的题编号不变）
let QUIZ_SEC_ADD = __rv(() => ([
  { q: _t(2516, "Cognito 用户池和身份池的区别是？"), o: [_t(2517, "用户池管注册登录、发令牌；身份池把登录的用户换成临时的亚马逊云科技凭证"), _t(2518, "用户池存 IAM 用户，身份池存 IAM 角色"), _t(2519, "用户池只能给网页用，身份池只能给手机 App 用"), _t(2520, "两个是同一个功能的新旧名字")], a: _t(2521, "用户池是用户目录，负责注册、登录、MFA，登录后签发 JWT；身份池把用户池或社交账号登录后的身份换成临时凭证，用来直接访问 S3 这类服务") },
  { q: _t(2522, "想让 API Gateway 只放行登录过的用户，最省事的做法是？"), o: [_t(2523, "给 API 配 Cognito 用户池授权方，请求带上登录拿到的令牌"), _t(2524, "在每个 Lambda 里自己解析用户名和密码"), _t(2525, "把 API 放进私有子网，让用户都连 VPN"), _t(2526, "给每个用户建一个 IAM 用户和访问密钥")], a: _t(2527, "API Gateway 的 Cognito 授权方（HTTP API 用 JWT 授权方）先验令牌，没登录或令牌过期的请求在网关就被挡回去，Lambda 里不用写验证逻辑") },
  { q: _t(2528, "有人拿别处泄露的密码来你的 App 撞库，Cognito 里哪个功能最对口？"), o: [_t(2529, "威胁防护：发现在用泄露的密码、异常登录，按风险拦下或要求补一次 MFA"), _t(2530, "Lambda 触发器：每次登录都记一条日志"), _t(2531, "自定义域名：换一个登录页地址"), _t(2532, "用户池分组：把用户分成管理员和普通用户")], a: _t(2533, "威胁防护（以前叫高级安全功能，在 Plus 功能套餐里）会检查泄露的凭证，异常登录按风险等级自动拦截或要求再验一次") }
]), v => { QUIZ_SEC_ADD = v; }, () => QUIZ_SEC_ADD);
QUIZ.sec.push(...QUIZ_SEC_ADD);
