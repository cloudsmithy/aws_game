import { __I18N } from '../data/i18n-table.js';

// ================= 多语言运行时（翻译表在 data/i18n-table.js，由 web/tools/i18n.mjs build 按 code/i18n/*.json 生成） =================
const __I18N_LANGS = ["zh","en","ja"];
export let __LANG = (() => { let v = null; try { v = localStorage.getItem('aws-tycoon-lang'); } catch (e) { } return __I18N_LANGS.includes(v) ? v : 'zh'; })();   // 上次选的语言（/en/、/zh/ 入口会先记下）
document.documentElement.lang = __LANG === 'zh' ? 'zh-CN' : __LANG;
// 界面语言（zh / en / ja）：切换时 __setLang 当场换字、重画，进行中的这一局接着玩；存档、联机房间不分语言
export let LANG = __LANG;   // 从 rules/03-services.js 挪来：__setLang 要改它，放在这里底层文件就不用依赖后面的文件
// _t：第 i 条在当前语言的写法，没有就用中文原文；_tf：带占位符的；_tr：正则
export function _t(i, zh) { if (__LANG === 'zh') return zh; const v = __I18N[__LANG] && __I18N[__LANG][i]; return v == null ? zh : v; }
export function _tf(i, zh, ...a) { return _t(i, zh).replace(/\{\$(\d+)\}/g, (_, k) => String(a[+k])); }
export function _tr(i, src, fl) { const v = __LANG !== 'zh' && __I18N[__LANG] && __I18N[__LANG][i], m = v && v.match(/^re:\/([\s\S]*)\/([a-z]*)$/); return m ? new RegExp(m[1], m[2]) : new RegExp(src, fl); }
// 启动时建好的数据：记下「怎么算出来的」，切换语言时重新算，把新字并进原来的对象（引用不变，别处拿着的照样能用）
// 切换语言后重画开局页等：启动代码（core/43-boot.js）注册进来，这个文件不直接引用后面文件的函数
let __onLang = null;
export function __setLangHook(f) { __onLang = f; }
const __RV = [];
export function __rv(f, set, get) { const v = f(); __RV.push([f, set, get]); return v; }
function __merge(o, n) {
  if (Array.isArray(o) && Array.isArray(n)) { for (let i = 0; i < Math.min(o.length, n.length); i++) { if (typeof o[i] === 'string' && typeof n[i] === 'string') o[i] = n[i]; else if (o[i] && n[i] && typeof o[i] === 'object' && typeof n[i] === 'object') __merge(o[i], n[i]); } return; }
  if (!o || !n || typeof o !== 'object' || typeof n !== 'object' || o instanceof RegExp || o instanceof Set || o instanceof Map) return;
  const kn = Object.keys(n);
  if (!kn.every(k => Object.prototype.hasOwnProperty.call(o, k))) {   // 键本身就是要翻译的字（按名字查颜色的那种表）：整张换掉
    for (const k of Object.keys(o)) { const d = Object.getOwnPropertyDescriptor(o, k); if (d && d.configurable) delete o[k]; }
    for (const k of kn) { const d = Object.getOwnPropertyDescriptor(n, k); try { Object.defineProperty(o, k, d); } catch (e) { } }
    return;
  }
  for (const k of kn) { const d = Object.getOwnPropertyDescriptor(o, k); if (!d || d.get || d.set || !d.writable) continue; const a = o[k], b = n[k]; if (typeof a === 'string' && typeof b === 'string') o[k] = b; else if (a && b && typeof a === 'object' && typeof b === 'object') __merge(a, b); }
}
// 页面里写死的字（开局页的表单、网页标题）：找到这些文字节点和属性，按当前语言换
const __STATIC = [[5176,"h","亚马逊云科技 User Group 云上大亨",0],[5177,"h","UG 活动局",0],[5178,"h","线下活动用：娱乐模式 + 边玩边答题，打 12 轮或 30 分钟（先到为准），4 人一桌",0],[5179,"h","一键开局",0],[5180,"h","新建一局",0],[5181,"h","五步设置，随时可以点「先看玩法」",0],[3861,"h","玩家",0],[5182,"a","开局每人发 3 张角色卡，自己挑一张；挑走的别人拿不到。不勾就随机分","title"],[5183,"h","三选一挑角色",0],[5184,"h","不开就随机分",0],[5141,"a","所有角色卡：起始资金、能力、弱点、专属技能","title"],[4694,"h","玩家图鉴",0],[5185,"h","2 人",0],[5186,"h","3 人",0],[5187,"h","4 人",0],[5188,"h","难度",0],[5189,"a","付过路费、买服务时先答一道亚马逊云科技的题，答对就打折；难度选「学习模式」会自动打开","title"],[4085,"h","边玩边答题",0],[5190,"a","Health 卡和 re:Invent 卡上的金额（领钱、罚款）都乘这个倍率；每轮随机是每一轮在 0.5–2 倍之间换一次","title"],[5191,"h","卡牌倍率",0],[5191,"a","卡牌倍率","aria-label"],[5192,"h","1 倍",0],[5193,"h","1.5 倍",0],[5194,"h","2 倍",0],[5195,"h","每轮随机",0],[5196,"a","只留 20 个常用服务，其余变成盲盒格；经过起点、掷出对子都送卡；没有技术债和下线；默认 10 轮","title"],[3742,"h","娱乐模式",0],[5197,"h","20 个常用服务，其余是盲盒格；默认 10 轮，节奏最快",0],[5198,"a","基础规则、卖回亚马逊云科技、运行费与请求费、维护窗口与复盘、Spot 购买","title"],[3745,"h","入门局",0],[5199,"h","只有基础规则：买服务、收过路费、运行费、维护窗口",0],[5200,"a","再加升级附加费、技术债、新账户保护期（前 2 轮过路费最多 $50）、季度财报、旧版本停止支持","title"],[3746,"h","标准局",0],[5201,"h","再加技术债、新账户保护期、季度财报",0],[5202,"a","再加主动行动、完整交易、Savings Plans / RI","title"],[3368,"h","完整局",0],[5202,"h","再加主动行动、完整交易、Savings Plans / RI",0],[5203,"a","标准局规则 + 必答题、错题本；没勾题库 DLC 时自动用云从业者题库；不限轮数","title"],[3743,"h","学习模式",0],[5204,"h","标准局 + 必答题、错题本，不限轮数",0],[5205,"a","完整局规则，4 个玩法 DLC、高速部署和全部题库都开，必须边玩边答题，卡牌 ×2；过路费每 5 轮 +1.5 倍、卡牌金额跟着全额涨，答对只减 30% 过路费；没有新账户保护期，起点只领 $150，卖回亚马逊云科技只有 6 折；Well-Architected 每条 2 分且共 18 分；每个角色多一条地狱限制","title"],[3744,"h","地狱模式",0],[5206,"h","完整局 + 全部 DLC，必答题，卡牌 ×2",0],[5207,"h","胜利条件",0],[5208,"a","经典胜利（只剩一个人没破产）一直生效；不勾轮数上限也最多打 50 轮，打满按估值排名（学习模式不限轮数）","title"],[5209,"h","可以多选，谁先达成谁赢；只剩一人没破产也直接赢",0],[5210,"h","谁先凑齐六大支柱谁赢；难度越高每条要的分越多",0],[5211,"h","轮数上限",0],[5212,"h","打满",0],[5213,"a","轮数","aria-label"],[5214,"h","轮按估值排名",0],[2537,"h","限时",0],[5215,"a","分钟数","aria-label"],[5216,"h","分钟到了按估值算分",0],[5217,"h","联机",0],[5218,"h","可选：各用各的电脑或手机，画面实时同步",0],[5219,"a","连不上时先在两台设备上各测一次：信令服务器、点对点、公网地址、中继","title"],[5104,"h","联机设置和测试",0],[5118,"h","创建房间",0],[5220,"h","加入房间",0],[5221,"h","DLC 扩展包",0],[5222,"h","可选，可以多选；每个包加一套规则、卡牌和题目",0],[5223,"a","DLC 分类","aria-label"],[5224,"a","不玩棋盘，只刷题；答错的进错题本","title"],[2466,"h","刷题模式",0],[5140,"h","先看玩法",0],[5138,"h","开始游戏",0],[5225,"h","跳到操作按钮（掷骰子、轮到下一位）",0],[5226,"h","跳到玩家栏",0],[5227,"a","主操作","aria-label"]];
let __SN = null;
function __applyStatic() {
  if (!__SN) { __SN = []; const want = new Map(__STATIC.filter(x => x[1] === 'h').map(x => [x[2], x[0]])), wantA = __STATIC.filter(x => x[1] === 'a');
    const w = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT); let t;
    while ((t = w.nextNode())) { if (t.parentElement && t.parentElement.closest('script,style')) continue; const v = t.nodeValue, k = v.trim(); if (want.has(k)) __SN.push([t, want.get(k), v.slice(0, v.indexOf(k)), v.slice(v.indexOf(k) + k.length), k]); }
    for (const [i, , zh, attr] of wantA) document.querySelectorAll('[' + attr + ']').forEach(el => { if (el.getAttribute(attr) === zh) __SN.push([el, i, attr, null, zh]); }); }
  for (const [nd, i, a, b, zh] of __SN) { if (!nd.isConnected) continue; const v = _t(i, zh); if (b === null) nd.setAttribute(a, v); else nd.nodeValue = a + v + b; }
}
// 切换语言：数据换字 → 写死的字换 → 重画；不换页面、不换网址，进行中的这一局接着玩
export function __setLang(code) {
  if (code === __LANG || !__I18N_LANGS.includes(code)) return;
  __LANG = code; LANG = code; try { localStorage.setItem('aws-tycoon-lang', code); } catch (e) { }
  document.documentElement.lang = code === 'zh' ? 'zh-CN' : code;
  for (const [f, set, get] of __RV) { try { const o = get(), v = f(); if (o && v && typeof o === 'object' && typeof v === 'object') __merge(o, v); else set(v); } catch (e) { console.warn('i18n', e); } }
  __applyStatic();
  if (__onLang) __onLang();
}
__applyStatic();
// 亚马逊云科技架构图标（官方图标包 07/31/2026，https://aws.amazon.com/architecture/icons/）
const AWSBG = {"dms":"#C925D1","cognito":"#DD344C","config":"#E7157B","agentcore":"#01A88D","s3":"#7AA116","vpc":"#8C4FFF","route53":"#8C4FFF","elb":"#8C4FFF","ec2":"#ED7100","cloudwatch":"#E7157B","ecs":"#ED7100","eks":"#ED7100","lambda":"#ED7100","apigw":"#8C4FFF","sfn":"#E7157B","rds":"#C925D1","dynamodb":"#C925D1","aurora":"#C925D1","kinesis":"#8C4FFF","glue":"#8C4FFF","datatransfer":"#01A88D","redshift":"#8C4FFF","guardduty":"#DD344C","waf":"#DD344C","shield":"#DD344C","sagemaker":"#01A88D","bedrock":"#01A88D","region":"#00A4A6","iam":"#DD344C","ssm":"#E7157B","costexplorer":"#7AA116","savingsplans":"#7AA116","activate":"#C925D1","trustedadvisor":"#E7157B","cloudformation":"#E7157B","support":"#C925D1","budgets":"#7AA116","securityhub":"#DD344C","codedeploy":"#C925D1","wat":"#E7157B","mgn":"#01A88D","training":"#C925D1","health":"#E7157B","codecatalyst":"#C925D1","chime":"#DD344C","billing":"#7AA116","efs":"#7AA116","backup":"#7AA116","ebs":"#7AA116","ecr":"#ED7100","sqs":"#E7157B","eventbridge":"#E7157B","elasticache":"#C925D1","athena":"#8C4FFF","emr":"#8C4FFF","opensearch":"#8C4FFF","inspector":"#DD344C","kms":"#DD344C","cloudfront":"#8C4FFF","fargate":"#ED7100","cloudtrail":"#E7157B","asg":"#ED7100","cloudlogo":"#242F3E","account":"#E7157B","cloud":"#242F3E"};
