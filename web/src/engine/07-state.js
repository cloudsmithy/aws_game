import { LANG, __rv, _t, _tf, _tr } from '../core/01-i18n-runtime.js';
import { COLORS, SIM, clean } from '../core/02-util.js';
import { GRP, OWNABLE, SQ, effIn, isInst } from '../rules/03-services.js';
import { COMBOS, cAll, comboOpen } from '../rules/04-roles-combos-cards.js';
import { isHidden } from '../rules/35-modes.js';
// ================= 状态 =================
export let S = null;
export const P = id => S.players[id];
export const cur = () => S.players[S.cur];
export const F = {
  deps: () => S.cfg.diff !== 'basic',
  debt: () => S.cfg.diff !== 'basic',
  balance: () => S.cfg.diff !== 'basic',
  actions: () => S.cfg.diff === 'full',
  full: () => S.cfg.diff === 'full',
};
export const winWA = () => !!(S.cfg.wa || S.cfg.win === 'wa');
export const winTimed = () => !!(S.cfg.timed || S.cfg.win === 'timed');
// 这局怎么赢：[标题行上的名字, 一句话说明]；标题行悬停和新手引导用同一套说法
export const winParts = () => [[_t(2534, "经典"), _t(2535, "别人都破产（账户被暂停），只剩你一家就赢")], winWA() && ['Well-Architected', _t(2536, "谁先把六大支柱都做到本局要求，直接赢")], winTimed() && [_t(2537, "限时"), _tf(2538, "{$0} 分钟到了按估值排名", S.cfg.minutes)], S.cfg.roundLimit && [_tf(2539, "{$0} 轮上限", S.cfg.roundLimit), _tf(2540, "打满 {$0} 轮按估值排名", S.cfg.roundLimit)]].filter(Boolean);
// 玩家名的字色：棋子颜色在白底上只有 3.5–4:1，名字用同色系深一档的（都在 5:1 以上）；棋子、色条还用原色；暗色主题的 --player-0…11 在 index.html 里
export const INK = { '#e5484d': '#c62a2f', '#2f7cf6': '#1a62d6', '#1f9d55': '#15763f', '#9b5cf6': '#7c3aed', '#f97316': '#b44708', '#14b8a6': '#0f766e', '#ec4899': '#be185d', '#84cc16': '#477309', '#38bdf8': '#0369a1', '#facc15': '#8a6200', '#94a3b8': '#475569', '#c8a27a': '#87592a' };
// 多人局（开局页「多人（超过 4 人）」）最多几个座位。用户要的是不设上限，这里给一个够用的实际上限，只在这一处改：
// 12 = 不当代理商的角色正好 12 个（再多就有两家同一个角色）；棋盘 48 格、一圈 12 人时每人每轮只走一回，再多一局要打好几个小时；
// 起点格里 12 颗棋子缩小后 3×4 排得下，侧栏玩家卡收成一行一张也还能滚着看。想再放开就改这个数，再在 core/02-util.js 的 COLORS 和上面的 INK 补颜色
export const MAX_PLAYERS = 12;
const playerInk = color => {
  const seat = COLORS.findIndex(c => c === color || INK[c] === color);
  return seat < 0 ? color : `var(--player-${seat},${INK[COLORS[seat]]})`;
};
export const nm = p => `<b style="color:${playerInk(p.color)}">${p.name}</b>`;
export const sqn = i => `<b>${SQ[i].n}</b>`;
export function log(html) {
  S.log.unshift(`${html}<time data-t="${Date.now()}"></time>`); if (S.log.length > 1500) S.log.length = 1500;
  S.logSeq = (S.logSeq || 0) + 1;   // 第几条日志：联机时房主按它只把远端还没有的日志发过去
  // 每一格的历史：落在这一格时结算的日志都记进这一格；别处提到这一格名字的（买卖、升级、被事件打中）也记进去
  if (SIM || !S.players) return;
  const H = S.hist = S.hist || {}, add = i => { const a = H[i] = H[i] || []; if (a.length && a[a.length - 1].t === html) return; a.push({ r: S.round, t: html }); if (a.length > 40) a.shift(); (S.histAt = S.histAt || {})[i] = S.logSeq; };   // histAt：这一格的历史最后在第几条日志时改过
  const at = S.histSq; if (at != null) add(at);
  SQ.forEach((q, i) => { if (i !== at && html.includes(`<b>${q.n}</b>`)) add(i); });
}
// 日志时间按看的人自己电脑的时区显示（联机时每个人看到的是自己的本地时间）
// 格式化器只建一次：toLocaleTimeString 带了参数，每调一次都要新建一个格式化器，侧栏每次重画要格式化 80 条
const LT_FMT = new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
export const logTime = l => { const m = /<time data-t="(\d+)"><\/time>/.exec(l); return m ? LT_FMT.format(+m[1]) : ''; };
// 侧栏动态和明细弹窗里的一行日志，时间只算一次
// 日志上色：人名最显眼（主人颜色的底色小块，在 CSS 里给，旧存档的日志也一样）；钱数按这一句里离它最近的动作上色：
// 领、收、拿回是绿的，交、付、花、赔是红的，看不出来的深色；前面直接写「+」「−」的照符号。获胜、破产、支柱达标整行带一点底色
let LG_UP = __rv(() => ([_t(2541, "领"), _t(2542, "收"), _t(2543, "拿回"), _t(2544, "拿走"), _t(2545, "赚"), _t(2546, "退"), _t(2547, "补贴"), _t(2548, "获得"), _t(2549, "奖"), _t(2550, "少交"), _t(2551, "少付"), _t(2552, "省")]), v => { LG_UP = v; }, () => LG_UP), LG_DN = __rv(() => ([_t(2553, "交"), _t(2554, "付"), _t(2555, "赔"), _t(2556, "扣"), _t(2557, "花"), _t(2558, "罚"), _t(2559, "欠"), _t(2560, "亏")]), v => { LG_DN = v; }, () => LG_DN), LG_JA = __rv(() => ([[_t(2561, "受け取"), _t(2562, "受取"), _t(2563, "獲得"), _t(2564, "稼"), _t(2565, "返金"), _t(2566, "補助"), _t(2567, "報酬"), _t(2568, "節約"), _t(2569, "取り戻"), _t(2570, "戻ってく"), 'もらう', 'もらっ'], [_t(2571, "支払"), _t(2572, "払う"), _t(2573, "払っ"), _t(2574, "払い"), _t(2575, "賠償"), _t(2576, "差し引"), _t(2577, "罰金"), _t(2578, "借金"), _t(2579, "損"), _t(2580, "費や"), _t(2581, "使って")]]), v => { LG_JA = v; }, () => LG_JA);   // LG_JA：日文版用（动词在金额后面）
function logMoney(h) {
  return h.replace(/(<[^>]+>)|(\$-?\d[\d,]*)/g, (m, tag, amt, off, str) => {
    if (tag) return tag;
    const ch = str[off - 1], pre = str.slice(Math.max(0, off - 120), off).replace(/<[^>]+>/g, ''), cl = pre.split(_tr(2582, "[，；。（(]", "")).pop();
    // 按动作词最后出现的位置比，词尾越靠后越近；同一处取长的（「少交」比「交」优先）
    const last = list => Math.max(-1, ...list.map(v => { const x = cl.lastIndexOf(v); return x < 0 ? -1 : (x + v.length) * 10 + v.length; })), g = last(LG_UP), d = last(LG_DN);
    const po = LANG === 'ja' ? str.slice(off + amt.length, off + amt.length + 60).replace(/<[^>]+>/g, '').split(_tr(2583, "[、。（(]", ""))[0] : '', fst = list => Math.min(Infinity, ...list.map(v => { const x = po.indexOf(v); return x < 0 ? Infinity : x * 10 - v.length; })), gu = po ? fst(LG_JA[0]) : Infinity, du = po ? fst(LG_JA[1]) : Infinity;
    const k = ch === '+' ? 'up' : ch === '-' || ch === '−' ? 'dn' : gu !== du ? (gu < du ? 'up' : 'dn') : g > d ? 'up' : d > g ? 'dn' : '';
    return `<span class="lm${k ? ' ' + k : ''}">${amt}</span>`;
  });
}
export const logRow = l => { const t = logTime(l), b = clean(logBody(l)); return `<div>${t ? `<span class="lt">${t}</span>` : ''}${logMoney(b)}</div>`; };
// 旧存档、演示局里的日志名字还是棋子原色，显示时换成深一档的
export const logBody = l => String(l).replace(/<time data-t="\d+"><\/time>/, '').replace(/color:(#[0-9a-f]{6})/g, (m, c) => 'color:' + playerInk(c));
export const owns = (p, i) => S.props[i] && S.props[i].owner === p.id;
export const active = (p, i) => owns(p, i) && !S.props[i].offline && S.props[i].ddos == null;
export const ownedBy = p => OWNABLE.filter(i => owns(p, i));
// 娱乐模式的盲盒格买不到，整组只看买得到的那几块（数据库组少 DMS、安全组少 GuardDuty/Inspector/KMS），不然这两组永远凑不齐；
// 容器、集成、分析组整组都是盲盒，空集不能算「凑齐」
export const ownsGroup = (p, g) => { const a = GRP(g).filter(i => !isHidden(i)); return a.length > 0 && a.every(i => active(p, i)); };
export const availCard = (p, k) => p.cards.find(c => c.id === k && !c.used);
export const debtOf = p => p.debt.reduce((a, d) => a + d.amt, 0);
// 某块服务当前生效的功能
export const effActive = (i, eff) => { const pr = S.props[i]; return !!SQ[i].upg && pr && SQ[i].upg.slice(0, pr.level).some(u => effIn(u[2], eff)); };
// 万能服务：CloudWatch、CloudTrail、Config（监控组）和 KMS、VPC，这几块横向服务跟谁都能配（KMS、VPC 有绑定限制，见 WILD_NEED）。
// 每块万能服务能「顶一次」：绑到主人的一个架构上，缺一块就补上那一块，已经凑齐的就并进去、过路费一起收。绑了不能换；
// 绑定记在格子上（S.props[w].wild = { p: 绑的人, c: 架构 id }），只对绑的人有效：交易换了主人就不再算，也不能再绑；卖回亚马逊云科技清掉（resetProp）
const WILD = new Set(['cloudwatch', 'cloudtrail', 'config', 'kms', 'vpc']);   // 11-09 万能服务 5 个：监控组三格什么架构都能绑；KMS、VPC 有绑定限制（WILD_NEED）
// 绑定限制：KMS 是存数据服务的静态加密，只能绑到有存储或数据库的架构。
// VPC（11-09 放宽）：架构里有一块能接进 VPC 的服务就能绑——计算、容器、数据库、存储、分析、AI 组，加 ELB、API Gateway。纯 Serverless 也行：Lambda 能接入 VPC，API Gateway 能做私有 API，S3、DynamoDB 走 VPC 终端节点。
// 安全、监控、Route 53、CloudFront 不算；应用集成组（SQS、EventBridge、Step Functions）单独不算，要和上面这些在一起。可选的、几选一的块都算。自己已经在里面（必须或可选）的架构也不能绑
const WILD_NEED = {
  vpc: new Set(['ec2', 'lambda', 'ecr', 'ecs', 'eks', 's3', 'efs', 'ebs', 'dynamodb', 'rds', 'aurora', 'elasticache', 'dms', 'kinesis', 'glue', 'athena', 'redshift', 'opensearch', 'sagemaker', 'bedrock', 'agentcore', 'elb', 'apigw']),
  kms: new Set(['s3', 'ebs', 'efs', 'rds', 'aurora', 'dynamodb', 'elasticache', 'redshift', 'opensearch']),
};
export const wildFits = (w, c) => !cAll(c).includes(w) && (!WILD_NEED[SQ[w].k] || cAll(c).some(i => WILD_NEED[SQ[w].k].has(SQ[i].k)));
export let WILD_PARTS = __rv(() => ([_t(2584, "CloudWatch、CloudTrail、Config（监控组）什么架构都能绑"), _t(2585, "KMS 只能绑到有存储或数据库的架构（S3、EBS、EFS、RDS、Aurora、DynamoDB、ElastiCache、Redshift、OpenSearch）"), _t(2586, "VPC 只要架构里有一块能接进 VPC 的服务就能绑：计算、容器、数据库、存储、分析、AI 组的任意一块，或者 ELB、API Gateway（Lambda 能接入 VPC，API Gateway 能做私有 API，S3、DynamoDB 走 VPC 终端节点），可选的、几选一的块都算；只由安全、监控、Route 53、CloudFront 和应用集成组（SQS、EventBridge、Step Functions）组成的架构，VPC 绑不了")]), v => { WILD_PARTS = v; }, () => WILD_PARTS);
export const isWild = i => SQ[i] && WILD.has(SQ[i].k);
export const wildOf = (p, id) => ownedBy(p).find(w => { const x = S.props[w].wild; return x && x.c === id && x.p === p.id && active(p, w); });
export const wildFree = p => ownedBy(p).filter(w => isWild(w) && !S.props[w].wild && active(p, w));
export const comboMiss = (p, c) => c.ix.filter(n => !(Array.isArray(n) ? n : [n]).some(i => active(p, i)));
export function hasCombo(p, id) {
  const c = COMBOS.find(x => x.id === id); if (!c) return false;
  const miss = comboMiss(p, c).length;
  return miss === 0 || (miss === 1 && wildOf(p, id) != null);
}
// 万能服务能绑的架构：只差一块的（补上）和已经凑齐、还没并进万能服务的（并进去，一个架构只并一块）
export const wildTargets = p => COMBOS.filter(comboOpen).map(c => ({ c, miss: comboMiss(p, c) })).filter(x => x.miss.length <= 1 && !wildOf(p, x.c.id));
export const comboOn = (p, i) => COMBOS.filter(c => (cAll(c).includes(i) || wildOf(p, c.id) === i) && hasCombo(p, c.id));
// 打掉或收走 i 以后真正失效的架构：i 所在那一环没有别的在线服务顶上（同时有 RDS 和 Aurora，打掉一块，经典三层 Web 还在）
export const combosBrokenBy = (o, i) => comboOn(o, i).filter(c => wildOf(o, c.id) === i ? comboMiss(o, c).length > 0 : c.ix.some(n => Array.isArray(n) ? n.includes(i) && !n.some(m => m !== i && active(o, m)) : n === i));   // 万能服务顶着缺的那块时，打掉它架构就散；只是并进去的，打掉它架构还在
export function resetProp(i) { S.props[i] = { owner: null, level: 0, cap: 0, spot: false, spotPaid: 0, impaired: false, offline: 0, offCash: 0 }; }

// （以下从 rules/03-services.js 挪来：用到 S、effActive）
// ECS 服务默认就把任务尽量分散到多个 AZ（Fargate 也是），不算单 AZ；EBS 卷升了也只在一个 AZ。
// 其他实例型看「多 AZ」那一级有没有升到，不能只看 level>0：EC2 第 1 级是自动 AMI，第 2 级跨 AZ Auto Scaling 才是多 AZ
export const singleAZ = i => isInst(i) && SQ[i].k !== 'ecs' && (SQ[i].k === 'ebs' || !effActive(i, 'maz'));
// 下线：拿回买价的一半先周转（Spot 按出价算），这笔钱不用还；重新上线不要钱
export const offlineCash = i => Math.round((S.props[i].spot ? S.props[i].spotPaid : (S.props[i].paid ?? SQ[i].p)) / 2);
// 别的文件要改这些变量（import 进来是只读的），走这里
export const __set_S = v => (S = v);
