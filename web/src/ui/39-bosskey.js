import { __rv, _t, _tf } from '../core/01-i18n-runtime.js';
import { $, SAVE_FAIL, esc } from '../core/02-util.js';
import { DOCS, GAME_VERSION, IX, LANGS, N, SQ } from '../rules/03-services.js';
import { langMenu, switchLang } from './03b-lang-menu.js';
import { COMBOS, INC, QUIZ, REI, comboOpen } from '../rules/04-roles-combos-cards.js';
import { QBANK } from '../rules/06-qbank.js';
import { S, hasCombo, log, owns } from '../engine/07-state.js';
import { MODAL_CUR, ask, greyWhy, mainBtn, viewOpen } from './10-modal.js';
import { LEARN_LINKS, MANUAL_WEB, showManual } from './26e-manual.js';
import { archTipOff, toggleArchTip } from './27b-arch-notes.js';
import { render } from './27d-side.js';
import { SVC_INTRO, gallery } from './27e-square-gallery.js';
import { confirmNew, maybeTour, playerGallery, quitGame, save, startFromSetup, toast, toggleAnim } from './28-setup-save.js';
import { SFX, toggleSfx } from './32-sfx.js';
import { FX } from './33-fx3d.js';
import { keyHelp } from './37-keys.js';
import { cheatCmd, cheatsOn } from '../engine/38-cheats.js';
import { MP } from '../net/40-host-sync.js';
// ================= 老板键、:version =================
// 老板键：按 `（反引号，Esc 下面、1 左边那个键）整页换成一个代码编辑器，标签页的标题和图标一起换掉，音效先停；
// 再按一次 `、或者双击最上面的文件名，回到游戏。编辑器开着时别的键都不传给游戏（空格、数字不会替你掷骰子、选按钮），方向键在代码里挪光标。
// 用 var：sfx() 里要读 BOSS，var 没有暂时性死区，脚本前面的代码先跑到也不会报错
export var BOSS = { on: false, title: '', icons: [], r: 6, c: 9, tap: 0, n: 0 };
// 老板键：整页换成一个浅色的代码编辑器，打开的是一份「云架构学习笔记」：按你现在凑成的架构（还没凑成就用经典三层 Web）一块一块写成像 IaC 的代码，
// 每块上面一行注释讲它是干什么的（取服务介绍），看着像在写代码，其实也是在复习
const BOSS_ICON = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" rx="3" fill="#1f6feb"/><path d="M6 5 3.5 8 6 11M10 5l2.5 3L10 11" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>');
const BOSS_SNIP = {
  route53: ["const zone = new HostedZone(this, 'Zone', { zoneName: 'shop.example.com' });", "new ARecord(this, 'Apex', { zone, target: RecordTarget.fromAlias(new CloudFrontTarget(cdn)) });"],
  cloudfront: ["const cdn = new Distribution(this, 'Cdn', {", "  defaultBehavior: { origin: new LoadBalancerV2Origin(alb), viewerProtocolPolicy: 'redirect-to-https' },", "  priceClass: 'PriceClass_100',", "});"],
  elb: ["const alb = new ApplicationLoadBalancer(this, 'Alb', { vpc, internetFacing: true });", "alb.addListener('Https', { port: 443, certificates: [cert] }).addTargets('Web', { port: 8080, targets: [web] });"],
  ec2: ["const web = new AutoScalingGroup(this, 'Web', {", "  vpc, instanceType: new InstanceType('t3.medium'), minCapacity: 2, maxCapacity: 6,", "});", "web.scaleOnCpuUtilization('Cpu', { targetUtilizationPercent: 60 });"],
  rds: ["const db = new DatabaseInstance(this, 'Db', {", "  vpc, engine: DatabaseInstanceEngine.POSTGRES, multiAz: true, backupRetention: Duration.days(7),", "});"],
  aurora: ["const aurora = new DatabaseCluster(this, 'Aurora', { vpc, engine: DatabaseClusterEngine.AURORA_POSTGRESQL, readers: [ClusterInstance.serverlessV2('r1')] });"],
  s3: ["const bucket = new Bucket(this, 'Assets', { versioned: true, blockPublicAccess: BlockPublicAccess.BLOCK_ALL, encryption: BucketEncryption.KMS });"],
  lambda: ["const fn = new Function(this, 'Api', {", "  runtime: Runtime.NODEJS_20_X, handler: 'index.handler', memorySize: 512, timeout: Duration.seconds(10),", "});"],
  apigw: ["const api = new RestApi(this, 'Rest', { deployOptions: { throttlingRateLimit: 1000, throttlingBurstLimit: 200 } });", "api.root.addResource('orders').addMethod('POST', new LambdaIntegration(fn));"],
  dynamodb: ["const table = new TableV2(this, 'Orders', {", "  partitionKey: { name: 'pk', type: AttributeType.STRING }, billing: Billing.onDemand(), pointInTimeRecovery: true,", "});", "table.grantReadWriteData(fn);"],
  sqs: ["const dlq = new Queue(this, 'JobsDlq', { retentionPeriod: Duration.days(14) });", "const queue = new Queue(this, 'Jobs', { visibilityTimeout: Duration.seconds(60), deadLetterQueue: { queue: dlq, maxReceiveCount: 5 } });"],
  eventbridge: ["new Rule(this, 'OnUpload', {", "  eventPattern: { source: ['s3'], detailType: ['Object Created'] }, targets: [new LambdaFunction(fn)],", "});"],
  sfn: ["const flow = new StateMachine(this, 'OrderFlow', { definitionBody: DefinitionBody.fromChainable(reserve.next(pay).next(ship)), timeout: Duration.minutes(5) });"],
  ecs: ["const svc = new FargateService(this, 'Svc', { cluster, taskDefinition: task, desiredCount: 2, circuitBreaker: { rollback: true } });"],
  eks: ["const k8s = new Cluster(this, 'Eks', { vpc, version: KubernetesVersion.V1_31, defaultCapacity: 3 });"],
  ecr: ["const repo = new Repository(this, 'Images', { imageScanOnPush: true, lifecycleRules: [{ maxImageCount: 30 }] });"],
  efs: ["const shared = new FileSystem(this, 'Shared', { vpc, lifecyclePolicy: LifecyclePolicy.AFTER_30_DAYS, encrypted: true });"],
  ebs: ["const data = new Volume(this, 'Data', { availabilityZone: vpc.availabilityZones[0], size: Size.gibibytes(100), encrypted: true });"],
  vpc: ["const vpc = new Vpc(this, 'Vpc', { maxAzs: 2, natGateways: 1 });"],
  elasticache: ["const cache = new CfnReplicationGroup(this, 'Cache', { engine: 'valkey', replicasPerNodeGroup: 1, automaticFailoverEnabled: true, multiAzEnabled: true });"],
  kinesis: ["const stream = new Stream(this, 'Clicks', { streamMode: StreamMode.ON_DEMAND, retentionPeriod: Duration.hours(24) });"],
  glue: ["new CfnCrawler(this, 'Crawler', { role: crawlerRole.roleArn, databaseName: 'lake', targets: { s3Targets: [{ path: bucket.s3UrlForObject('raw/') }] } });"],
  athena: ["new CfnWorkGroup(this, 'Adhoc', { name: 'adhoc', workGroupConfiguration: { bytesScannedCutoffPerQuery: 10 * 1024 ** 3 } });"],
  redshift: ["new CfnWorkgroup(this, 'Dw', { workgroupName: 'dw', namespaceName: 'analytics', baseCapacity: 8 });"],
  dms: ["new CfnReplicationTask(this, 'Cdc', { migrationType: 'full-load-and-cdc', replicationInstanceArn: ri.ref, sourceEndpointArn: src.ref, targetEndpointArn: dst.ref, tableMappings: TABLES });"],
  opensearch: ["const search = new Domain(this, 'Search', { version: EngineVersion.OPENSEARCH_2_17, capacity: { dataNodes: 2 }, zoneAwareness: { enabled: true } });"],
  guardduty: ["new CfnDetector(this, 'Detector', { enable: true, findingPublishingFrequency: 'FIFTEEN_MINUTES' });"],
  inspector: ["new CfnFilter(this, 'Critical', { filterAction: 'NONE', filterCriteria: { severity: [{ comparison: 'EQUALS', value: 'CRITICAL' }] } });"],
  kms: ["const key = new Key(this, 'DataKey', { enableKeyRotation: true, removalPolicy: RemovalPolicy.RETAIN });"],
  waf: ["new CfnWebACL(this, 'Acl', { scope: 'CLOUDFRONT', defaultAction: { allow: {} }, rules: [rateLimit('PerIp', 2000)], visibilityConfig: VIS });"],
  shield: ["new CfnProtection(this, 'Shield', { name: 'edge', resourceArn: cdn.distributionArn });"],
  sagemaker: ["new CfnEndpoint(this, 'Model', { endpointConfigName: endpointConfig.attrEndpointConfigName });"],
  bedrock: ["const answer = await runtime.send(new ConverseCommand({", "  modelId: MODEL_ID, messages: [{ role: 'user', content: [{ text: question }] }], inferenceConfig: { maxTokens: 512 },", "}));"],
  agentcore: ["const agent = new AgentRuntime(this, 'Agent', { entrypoint: 'agent.py', memory: { shortTerm: true }, gateway: tools });"],
  cognito: ["const pool = new UserPool(this, 'Users', { selfSignUpEnabled: true, mfa: Mfa.OPTIONAL, passwordPolicy: { minLength: 12 } });"],
  cloudwatch: ["new Alarm(this, 'High5xx', { metric: alb.metrics.httpCodeTarget(HttpCodeTarget.TARGET_5XX_COUNT), threshold: 10, evaluationPeriods: 3 });"],
  config: ["new ManagedRule(this, 'S3Public', { identifier: ManagedRuleIdentifiers.S3_BUCKET_PUBLIC_READ_PROHIBITED });"],
  cloudtrail: ["new Trail(this, 'Audit', { isMultiRegionTrail: true, enableFileValidation: true, sendToCloudWatchLogs: true });"],
};
// 用哪个架构：自己（联机时是本机的座位）凑成的第一个，没有就挑只差一块的，再没有就经典三层 Web
function bossCombo() {
  const me = S && S.players ? S.players[MP.role === 'client' ? MP.mySeat : S.cur] : null;
  return (me && (COMBOS.find(c => hasCombo(me, c.id)) || COMBOS.find(c => comboOpen(c) && c.ix.filter(n => !(Array.isArray(n) ? n : [n]).some(i => owns(me, i))).length === 1))) || COMBOS.find(c => c.id === 'tier3') || COMBOS[0];
}
// 代码一行一行拼出来（每行是 [类型, 文字]：c 注释、k 代码），再上色
function bossLines() {
  const c = bossCombo(), cls = c.id.replace(/(^|[-_])(\w)/g, (_, a, b) => b.toUpperCase()) + 'Stack';
  const keys = [...new Set([...c.ix, ...(c.ox || [])].flat().map(i => SQ[i].k))];
  const L = [['c', _tf(4885, "// 学习笔记：{$0}", c.n)], ['c', `// ${c.use || ''}`], ['c', _tf(4886, "// 数据怎么走：{$0}", String(c.flow || '').replace(/<[^>]+>/g, ''))], ['k', ''],
    ['k', "import { Stack, StackProps, Duration, RemovalPolicy, Size } from './lib/core';"], ['k', "import type { Construct } from './lib/constructs';"], ['k', "import * as svc from './lib/services';"], ['k', ''],
    ['k', `export class ${cls} extends Stack {`], ['k', '  constructor(scope: Construct, id: string, props?: StackProps) {'], ['k', '    super(scope, id, props);'], ['k', '']];
  for (const k of keys) {
    const s = SQ[IX[k]], intro = SVC_INTRO[k];
    L.push(['c', _tf(4887, "    // {$0}：{$1}", s.n, intro ? intro[0] : '')]);
    for (const line of BOSS_SNIP[k] || [`new ${s.n.replace(/\W/g, '')}(this, '${s.n.replace(/\W/g, '')}');`]) L.push(['k', '    ' + line]);
    L.push(['k', '']);
  }
  L.push(['k', '  }'], ['k', '}'], ['k', '']);
  return { c, cls, L };
}
const BOSS_KW = /\b(import|from|type|export|class|extends|constructor|super|this|const|let|new|await|return|true|false)\b/g;
function bossHl(t, kind) {
  if (kind === 'c') return `<span class="cm">${esc(t)}</span>`;
  // 先把字符串挖出来，剩下的再标关键字、类型（大写开头）、数字
  return t.split(/('(?:[^'\\]|\\.)*')/).map((x, j) => j % 2 ? `<span class="st">${esc(x)}</span>` : esc(x).replace(BOSS_KW, '<span class="kw">$1</span>').replace(/\b([A-Z][A-Za-z0-9_]*)\b/g, '<span class="ty">$1</span>').replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="nu">$1</span>')).join('');
}
function bossHtml() {
  const { c, cls, L } = bossLines(), file = `${c.id}.ts`; BOSS.n = L.length; BOSS.file = file;
  const others = COMBOS.filter(x => x.id !== c.id).slice(0, 6).map(x => x.id + '.ts');
  const tree = [['d', 'cloud-notes', 0], ['d', 'src', 1], ['d', 'stacks', 2], ['f', file, 3, 'on'], ...others.map(f => ['f', f, 3]), ['d', 'lib', 2], ['f', 'core.ts', 3], ['f', 'services.ts', 3], ['d', 'notes', 1], ...[...new Set([...c.ix].flat().map(i => SQ[i].k))].slice(0, 5).map(k => ['f', k + '.md', 2]), ['f', 'package.json', 1], ['f', 'tsconfig.json', 1], ['f', 'README.md', 1]];
  const code = L.map(([k, t], j) => `<div class="ln${j + 1 === BOSS.r ? ' cur' : ''}" data-r="${j + 1}"><i>${j + 1}</i><code>${bossHl(t, k) || ' '}</code></div>`).join('');
  return `<div class="bs-top">${_tf(4888, "<span class=\"bs-dots\" aria-hidden=\"true\"><i></i><i></i><i></i></span><b class=\"bs-file\" title=\"双击回到游戏\">{$0} — cloud-notes</b><span class=\"bs-saved\"></span>", esc(file))}</div>
  <div class="bs-main"><div class="bs-act" aria-hidden="true"><i class="on"></i><i></i><i></i><i></i></div>
    <div class="bs-side"><div class="bs-sh">${_t(4889, "资源管理器")}</div>${tree.map(([t, n, d, on]) => `<div class="bs-ti ${t}${on ? ' on' : ''}" style="--d:${d}">${t === 'd' ? '▾ ' : ''}${esc(n)}</div>`).join('')}</div>
    <div class="bs-ed"><div class="bs-tabs2"><span class="on">${esc(file)}<i>×</i></span><span>README.md<i>×</i></span></div><div class="bs-crumb">src › stacks › ${esc(file)} › ${esc(cls)}</div>
      <div class="bs-code">${code}</div>
      <div class="bs-term"><div class="bs-th">${_t(4890, "<span>问题</span><span>输出</span><span class=\"on\">终端</span>")}</div><pre>${_tf(4891, "$ npm run synth\n\n> cloud-notes@1.0.0 synth\n> node bin/app.js\n\n✔ {$0} 合成完成，{$1} 个资源\n$", esc(cls), L.filter(x => x[0] === 'k' && / new /.test(x[1])).length)} </pre></div></div></div>
  <div class="bs-status">${_t(4892, "<span>⎇ main</span><span>⊗ 0  ⚠ 0</span><span class=\"bs-agg\"></span><span class=\"bs-pos\"></span><span>空格: 2</span><span>UTF-8</span><span>TypeScript</span>")}</div>`;
}
function bossSel(r) {
  const el = $('#boss'); if (!el) return;
  r = Math.max(1, Math.min(BOSS.n || 1, r)); el.querySelector('.ln.cur')?.classList.remove('cur');
  const row = el.querySelector(`.ln[data-r="${r}"]`); if (!row) return;
  row.classList.add('cur'); BOSS.r = r; row.scrollIntoView({ block: 'nearest' });
  el.querySelector('.bs-pos').textContent = _tf(4893, "行 {$0}，列 {$1}", r, BOSS.c);
}
export function toggleBoss(force) {
  const on = force ?? !BOSS.on; if (on === BOSS.on) return; BOSS.on = on;
  let el = $('#boss');
  if (on) {
    if (!el) { el = document.createElement('div'); el.id = 'boss'; document.body.appendChild(el); }
    el.innerHTML = bossHtml(); el.hidden = false;
    const f = el.querySelector('.bs-file');
    f.ondblclick = () => toggleBoss(false);
    f.onpointerup = e => { if (e.pointerType === 'mouse') return; const now = Date.now(); if (now - BOSS.tap < 400) toggleBoss(false); BOSS.tap = now; };   // 触屏没有双击：两下点得够快也算
    el.querySelector('.bs-code').onclick = e => { const c = e.target.closest('.ln'); if (c) bossSel(+c.dataset.r); };
    bossSel(BOSS.r);
    BOSS.title = document.title; document.title = `${BOSS.file} — cloud-notes`;
    BOSS.icons = [...document.querySelectorAll('link[rel~="icon"]')]; BOSS.icons.forEach(l => l.remove());
    const ic = document.createElement('link'); ic.rel = 'icon'; ic.href = BOSS_ICON; ic.id = 'bossicon'; document.head.appendChild(ic);
    document.documentElement.classList.add('bossing');
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  } else {
    if (el) { el.hidden = true; el.innerHTML = ''; }
    document.title = BOSS.title || document.title; $('#bossicon')?.remove(); BOSS.icons.forEach(l => document.head.appendChild(l)); BOSS.icons = [];
    document.documentElement.classList.remove('bossing');
  }
}
// :version 这类命令：不在输入框里时按 :（中文输入法打出来的 ：也算）屏幕最下面出一条命令行，像 vim；回车执行，Esc 取消，退格删到空就关掉
var VIM = { on: false, s: '', t: 0, hist: [], hi: -1, tab: null };
// 命令行（不在输入框里时按 :）能用的命令。n 主名，a 别名，arg 参数提示，d 一句说明，game: true 的只在对局里能用；以后加命令往这里加一项
export const inGame = () => !!(S && S.players && !$('#game').hidden);
const clickCenter = t => { const b = [...document.querySelectorAll('#center button')].find(x => x.textContent.includes(t) && !x.disabled); if (b) b.click(); else toast(t + _t(4894, "现在用不了")); };
let VIM_CMDS = __rv(() => ([
  { n: 'help', a: ['h', '?'], d: _t(4895, "列出全部命令"), run: () => vimHelp() },
  { n: 'version', a: ['v', 'ver'], d: _t(4896, "版本号、构建号和内容规模"), run: () => showVersion() },
  { n: 'lang', arg: 'zh | en | ja', d: _t(4897, "切换语言；不带参数打开语言菜单"), run: a => { const c = (a[0] || '').toLowerCase(); if (LANGS.some(l => l.code === c)) return switchLang(c); const b = [...document.querySelectorAll('.langsw')].find(x => x.getClientRects().length); if (b) langMenu(b); } },
  { n: 'boss', d: _t(4898, "老板键：整页换成代码编辑器（云架构学习笔记），再按 ` 回来"), run: () => toggleBoss(true) },
  { n: 'sound', a: ['mute'], arg: 'on | off', d: _t(4838, "音效开关"), run: (a, nm) => { const want = nm === 'mute' ? false : a[0] === 'on' ? true : a[0] === 'off' ? false : !SFX.on; if (want !== SFX.on) toggleSfx(); else toast(SFX.on ? _t(4899, "音效已经是开着的") : _t(4900, "音效已经是关着的")); } },
  { n: 'speed', arg: 'fast | normal', d: _t(4901, "动画速度（联机时由房主设）"), game: true, run: a => { const want = a[0] === 'fast' ? 'fast' : a[0] === 'normal' ? 'normal' : S.cfg.anim === 'fast' ? 'normal' : 'fast'; if (MP.role === 'client') return toast(_t(4902, "动画速度由房主设置")); if ((S.cfg.anim === 'fast' ? 'fast' : 'normal') !== want) toggleAnim(); } },
  { n: 'arch', arg: 'on | off', d: _t(4903, "凑成有效架构时问要不要看讲解"), run: a => { const on = !archTipOff(), want = a[0] === 'on' ? true : a[0] === 'off' ? false : !on; if (want !== on) toggleArchTip(); else toast(on ? _t(4904, "架构提示已经是开着的") : _t(4905, "架构提示已经是关着的")); } },
  { n: 'rules', a: ['manual', 'm'], d: _t(4837, "玩法手册"), run: () => showManual() },
  { n: 'gallery', a: ['g'], d: _t(4906, "图鉴：服务、架构、卡牌、角色"), run: () => gallery() },
  { n: 'roles', d: _t(4907, "角色图鉴"), run: () => playerGallery() },
  { n: 'keys', d: _t(4118, "键盘快捷键"), run: () => keyHelp() },
  { n: 'tour', d: _t(4117, "新手引导"), game: true, run: () => maybeTour(true) },
  { n: 'assets', a: ['b'], d: _t(4054, "资产管理"), game: true, run: () => clickCenter(_t(4054, "资产管理")) },
  { n: 'trade', a: ['t'], d: _t(4056, "交易"), game: true, run: () => clickCenter(_t(4056, "交易")) },
  { n: 'w', a: ['save'], d: _t(4908, "存档（对局本来就是自动保存的）"), game: true, run: () => { save(); toast(SAVE_FAIL ? _t(4909, "没存上：浏览器存储写不进去") : _t(4910, "已保存")); } },
  { n: 'q', a: ['quit'], d: _t(4911, "退出到开局页（能「继续上一局」）"), game: true, run: () => quitGame() },
  { n: 'wq', a: ['x'], d: _t(4912, "保存并退出到开局页"), game: true, run: () => { save(); quitGame(); } },
  { n: 'new', d: _t(4913, "开一局新游戏"), run: () => inGame() ? confirmNew() : startFromSetup() },
  { n: 'money', arg: _t(4914, "[金额] [玩家]"), d: _t(4915, "作弊：加钱（最多 $300），负数是扣钱；不写玩家给自己，写座位号或名字给别人"), game: true, cheat: true, run: a => cheatCmd('money', a) },
  { n: 'dice', arg: _t(4916, "点数 [点数]"), d: _t(4917, "作弊：定下自己下一次掷骰子的点数"), game: true, cheat: true, run: a => cheatCmd('dice', a) },
  { n: 'upgrade', arg: _t(4918, "[玩家]"), d: _t(4919, "作弊：名下服务全部升满"), game: true, cheat: true, run: a => cheatCmd('upgrade', a) },
  { n: 'jail', arg: _t(4918, "[玩家]"), d: _t(4920, "作弊：把人送进维护窗口"), game: true, cheat: true, run: a => cheatCmd('jail', a) },
  { n: 'free', d: _t(4921, "作弊：自己马上出维护窗口"), game: true, cheat: true, run: a => cheatCmd('free', a) },
  { n: 'grab', d: _t(4922, "作弊：随机抢一块地；抢到没人买的归你，抢到别人的照付过路费"), game: true, cheat: true, run: a => cheatCmd('grab', a) },
  { n: 'cheats', arg: 'on | off', d: _t(4923, "作弊码开关（联机时只有房主能改）"), game: true, run: a => { if (MP.role === 'client') return toast(_t(4924, "只有房主能开关作弊码")); const want = a[0] === 'on' ? true : a[0] === 'off' ? false : !cheatsOn(); S.cfg.cheats = want; log(want ? _t(4925, "🕹 作弊码打开了：用了会写进日志，可以被举报") : _t(4926, "🕹 作弊码关掉了")); save(); render(); } },
  { n: 'manuals', a: ['docs'], d: _t(5400, "手册网页版（新标签页）"), run: () => window.open(MANUAL_WEB, '_blank', 'noopener') },
  { n: 'learn', a: ['arch'], d: _t(5694, "架构讲解目录（新标签页）"), run: () => window.open(LEARN_LINKS()[1][0], '_blank', 'noopener') },
  { n: 'changelog', a: ['log'], d: _t(4927, "更新说明（新标签页）"), run: () => window.open(DOCS + _t(4928, "更新说明.html"), '_blank', 'noopener') },
  { n: 'issue', d: _t(4929, "到 GitHub 提 issue（新标签页）"), run: () => window.open('https://github.com/cloudsmithy/aws_game/issues', '_blank', 'noopener') },
  { n: 'repo', d: _t(4930, "项目地址（新标签页）"), run: () => window.open('https://github.com/cloudsmithy/aws_game', '_blank', 'noopener') },
]), v => { VIM_CMDS = v; }, () => VIM_CMDS);
const vimFind = nm => VIM_CMDS.find(c => c.n === nm || (c.a || []).includes(nm));
// 输到一半：灰字提示能补成哪个命令（Tab 或 → 补上）
const vimGuess = t => { if (!t || /\s/.test(t)) return null; const hit = VIM_CMDS.map(c => [c.n, ...(c.a || [])].find(x => x.startsWith(t) && x.length > t.length && x.length > 1)).filter(Boolean); return hit[0] || null; };
function vimBar(txt, err) {
  let el = $('#vimcmd'); if (!el) { el = document.createElement('div'); el.id = 'vimcmd'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  const g = err ? null : vimGuess(txt.toLowerCase()), c = !err && vimFind((txt.trim().split(/\s+/)[0] || '').toLowerCase());
  el.className = err ? 'err' : '';
  el.innerHTML = err ? esc(txt) : ':' + esc(txt) + '<i class="cur" aria-hidden="true"></i>' + (g ? `<span class="gh">${esc(g.slice(txt.length))}</span>` : '') + (c ? `<span class="hint">${c.arg ? `<code>${esc(c.arg)}</code> ` : ''}${esc(c.d)}</span>` : txt ? '' : _t(4931, "<span class=\"hint\">输入命令，比如 version、help；Tab 补全，↑ ↓ 翻历史，Esc 取消</span>"));
  el.hidden = false;
}
function vimClose() { VIM.on = false; VIM.s = ''; VIM.hi = -1; clearTimeout(VIM.t); const el = $('#vimcmd'); if (el) el.hidden = true; }
export function vimErr(msg) { VIM.on = false; vimBar(msg, true); clearTimeout(VIM.t); VIM.t = setTimeout(vimClose, 2600); }
function vimRun(cmd) {
  const parts = cmd.trim().split(/\s+/), nm = (parts[0] || '').toLowerCase(), args = parts.slice(1);
  if (!nm) return vimClose();
  if (VIM.hist[VIM.hist.length - 1] !== cmd.trim()) VIM.hist.push(cmd.trim());
  const c = vimFind(nm);
  if (!c) return vimErr(_t(4932, "E492: 不是编辑器的命令: ") + cmd.trim() + _t(4933, "（:help 看全部命令）"));
  if (c.game && !inGame()) return vimErr(_tf(4846, ":{$0} 要在对局里用", c.n));
  vimClose(); c.run(args, nm);
}
// :help——和版本窗一个风格，列出全部命令
function vimHelp() {
  const rows = VIM_CMDS.map(c => `<dt><code>:${c.n}</code>${(c.a || []).map(x => ` <code class="al">:${esc(x)}</code>`).join('')}${c.arg ? ` <small>${esc(c.arg)}</small>` : ''}</dt><dd>${esc(c.d)}${c.cheat ? _t(4934, " <small class=\"ch\">作弊码</small>") : c.game ? _t(4935, " <small class=\"gm\">对局里</small>") : ''}</dd>`).join('');
  ask({ local: true, cancelable: true, view: true, cls: 'verbox cmds', title: _t(4936, "命令"), html: `<div class="ver"><p class="ver-tip">${_t(4937, "不在输入框里时按 <code>:</code> 打开命令行，输完回车；Tab 补全，↑ ↓ 翻之前输过的命令，Esc 取消。")}</p><div class="ver-term"><div class="ver-cmd"><span>$</span>:help</div><dl class="cmdl">${rows}</dl></div></div>`, buttons: [{ label: _t(2478, "知道了"), value: true, cls: 'pri' }] });
}
// 版本号：v1.<第几轮>.<第几次提交>，见 tests/version.mjs（npm run version:stamp）
const verNo = (V = GAME_VERSION) => `v${V.major || 1}.${V.round}${V.commits ? '.' + V.commits : ''}`;
function showVersion() {
  const V = GAME_VERSION, nSvc = SQ.filter(x => x.t === 'prop').length, nCard = INC.length - 1 + REI.length - 1, nQ = Object.values(QUIZ).flat().length + Object.values(QBANK).reduce((t, b) => t + b.qs.length, 0);
  const ext = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M6 3h7v7M13 3 4 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const stats = [[N, _t(4938, "格棋盘")], [nSvc, _t(4939, "个服务")], [nCard, _t(4940, "张卡牌")], [COMBOS.length, _t(4941, "个有效架构")], [nQ, _t(4942, "道题")]];
  const info = _tf(4943, "亚马逊云科技 User Group 云上大亨 {$0}（{$1}）build {$2}{$3}", verNo(), V.name, V.build, V.time ? ' · ' + V.time : '');
  // 和封面一个风格：深色网格底、左上一团橙光、等宽字的小标；中间像终端一样几行（这一版、构建号、生成时间、线上部署），下面一排内容规模和几个链接
  const html = `<div class="ver">
    <div class="ver-h"><div class="ver-t"><p class="ver-eb">${_t(4948, "<span>BUILD</span>亚马逊云科技 User Group")}</p>${_t(4949, "<b>云上大亨</b>")}</div><div class="ver-no"><small>RELEASE</small><b>${verNo()}</b></div></div>
    <div class="ver-term"><div class="ver-cmd"><span>$</span>:version</div>
      <dl><dt>${_t(4950, "这一版")}</dt><dd>${esc(V.name)} · ${esc(V.title)}</dd>${V.changes ? _tf(4946, "<dt>累计</dt><dd>{$0} 轮更新、{$1} 项改动{$2}{$3}</dd>", V.round, V.changes, V.commits ? _tf(4944, "、{$0} 次提交", V.commits) : '', V.since ? _tf(4945, "（{$0} 起）", V.since) : '') : ''}<dt>${_t(4951, "构建号")}</dt><dd><code>${esc(V.build)}</code></dd>${V.time ? _tf(4947, "<dt>生成时间</dt><dd>{$0}</dd>", esc(V.time)) : ''}<dt class="vdep" hidden>${_t(4952, "线上部署")}</dt><dd class="vdep" hidden><code></code></dd></dl></div>
    <ul class="ver-stats">${stats.map(([n, t]) => `<li><b>${n}</b><span>${t}</span></li>`).join('')}</ul>
    <div class="ver-links">${_tf(4953, "<a href=\"{$0}更新说明.html\" target=\"_blank\" rel=\"noopener\">更新说明{$1}</a><a href=\"https://github.com/cloudsmithy/aws_game\" target=\"_blank\" rel=\"noopener noreferrer\">项目地址{$2}</a><a href=\"https://github.com/cloudsmithy/aws_game/issues\" target=\"_blank\" rel=\"noopener noreferrer\">提 issue{$3}</a>", DOCS, ext, ext, ext)}${LEARN_LINKS().map(([u, n]) => `<a href="${u}" target="_blank" rel="noopener">${n}${ext}</a>`).join('')}</div>
  </div>`;
  ask({ local: true, cancelable: true, view: true, cls: 'verbox', title: _t(364, "版本"), html, buttons: [{ label: _t(4954, "复制版本信息"), value: 'copy', title: _t(4955, "提 issue 时贴上，方便对上是哪一版") }, { label: _t(2478, "知道了"), value: true, cls: 'pri' }] })
    .then(v => { if (v !== 'copy') return; const done = () => toast(_t(4956, "版本信息已复制")); try { navigator.clipboard.writeText(info).then(done, () => toast(info, 6000)); } catch (e) { toast(info, 6000); } });
  // 自动部署的服务器根目录有 _deployment.json（里面是提交号），能读到就加一行；本地打开、GitHub Pages 上没有，不显示
  if (/^https?:$/.test(location.protocol)) fetch(location.href.replace(/code\/.*$/, '') + '_deployment.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => { const els = document.querySelectorAll('.ver .vdep'); if (d && d.revision && els.length) { els[1].querySelector('code').textContent = String(d.revision).slice(0, 7); els.forEach(e => { e.hidden = false; }); } }).catch(() => { });
}
// 捕获阶段先拿到按键：老板键、表格里的方向键、命令行都在游戏自己的快捷键之前处理，处理完就不往下传
addEventListener('keydown', e => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || '') || e.target.isContentEditable;
  if (e.code === 'Backquote' && !e.metaKey && !e.ctrlKey && !e.altKey && !VIM.on) { e.preventDefault(); e.stopImmediatePropagation(); toggleBoss(); return; }
  if (BOSS.on) {
    e.stopImmediatePropagation();
    if (e.metaKey || e.ctrlKey) return;   // 浏览器自己的快捷键（关标签页、切标签页）照常
    e.preventDefault();
    const d = { ArrowUp: -1, ArrowDown: 1, Enter: 1, PageUp: -20, PageDown: 20 }[e.key];
    if (d) bossSel(BOSS.r + d); else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { BOSS.c = Math.max(1, BOSS.c + (e.key === 'ArrowLeft' ? -1 : 1)); bossSel(BOSS.r); }
    return;
  }
  if (VIM.on) {
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.key === 'Escape') vimClose();
    else if (e.key === 'Enter') vimRun(VIM.s);
    else if (e.key === 'Backspace') { if (!VIM.s) vimClose(); else { VIM.s = VIM.s.slice(0, -1); VIM.tab = null; vimBar(VIM.s); } }
    else if (e.key === 'Tab' || (e.key === 'ArrowRight' && vimGuess(VIM.s.toLowerCase()))) {
      // Tab：只有一个能补的就补全；好几个就挨个换（像 vim 的 wildmenu）
      const t = VIM.tab ? VIM.tab.base : VIM.s.toLowerCase(), all = VIM_CMDS.map(c => c.n).filter(x => x.startsWith(t));
      if (all.length) { const k = VIM.tab ? (VIM.tab.k + (e.shiftKey ? all.length - 1 : 1)) % all.length : 0; VIM.tab = { base: t, k }; VIM.s = all[k]; vimBar(VIM.s); }
    }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (!VIM.hist.length) return;
      VIM.hi = e.key === 'ArrowUp' ? (VIM.hi < 0 ? VIM.hist.length - 1 : Math.max(0, VIM.hi - 1)) : (VIM.hi < 0 ? -1 : VIM.hi + 1 >= VIM.hist.length ? -1 : VIM.hi + 1);
      VIM.s = VIM.hi < 0 ? '' : VIM.hist[VIM.hi]; VIM.tab = null; vimBar(VIM.s);
    }
    else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) { VIM.s = (VIM.s + e.key).slice(0, 40); VIM.tab = null; vimBar(VIM.s); }
    return;
  }
  if ((e.key === ':' || e.key === String.fromCharCode(0xFF1A)) && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); e.stopImmediatePropagation(); clearTimeout(VIM.t); VIM.on = true; VIM.s = ''; vimBar(''); }
}, true);
// 空格 / 回车：主按钮（掷骰子、轮到下一位、弹窗里的主选项）；1–9：弹窗里第几个按钮；B 资产管理；T 交易；M 玩法；G 图鉴；S 音效开关；? 快捷键说明
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey || !S || $('#game').hidden) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || ''))) return;
  if (document.querySelector('#tour')) return;
  if ($('#sqpop') && !$('#sqpop').hidden) return;   // 格子面板开着：按键归面板（Esc 关掉）
  if (viewOpen()) { if (/^[gm?]$/i.test(e.key)) { e.preventDefault(); const k = e.key.toLowerCase(); if (k === 'g') gallery(); else if (k === 'm') showManual(); else keyHelp(); } return; }   // 查资料窗开着：空格、数字键不替下面的弹窗选，也不掷骰子
  const box = $('#modal').hidden ? null : $('#modal .box');
  const click = b => { if (b && !b.disabled) { e.preventDefault(); b.click(); return true; } return false; };
  const idle = [document, document.body, document.documentElement].includes(e.target);   // 焦点没停在任何东西上：这时回车 / 空格才算快捷键
  if (box || $('#modal').classList.contains('min')) {
    if (e.key.toLowerCase() === 'h' && $('#modal').toggleMin) { e.preventDefault(); $('#modal').toggleMin(); return; }
    // 别人（或电脑）在选的只读窗：G / M / ? 照样能查资料（远端走 peek 先收起只读窗，房主这边 modalBlocks 提示等他选完）
    if (MODAL_CUR && MODAL_CUR.ro && /^[gm?]$/i.test(e.key)) { e.preventDefault(); const k = e.key.toLowerCase(); if (k === 'g') gallery(); else if (k === 'm') showManual(); else keyHelp(); return; }
    // 收起时别的键都不管；焦点没停在任何东西上时空格 / 回车照样点主按钮，收起的查资料窗由掷骰子、轮到下一位替玩家关掉（收起的是流程窗时主按钮是灰的，mainBtn 找不到）
    if ($('#modal').classList.contains('min')) { if ((e.key === ' ' || e.key === 'Enter') && idle && MODAL_CUR && MODAL_CUR.cancelable) click(mainBtn()); return; }
    if (box.classList.contains('mpwait')) return;   // 别人（或电脑）在选：只能看，按键不替他选
    const all = [...box.querySelectorAll('.btns button')], bs = all.filter(b => !b.disabled), pri = box.querySelector('.btns button.pri:not(:disabled)') || bs[0];
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('#modal .box') && e.target.closest('button, a[href], [data-v], summary')) return;   // 焦点在弹窗里的按钮、链接上：回车空格点它自己，别抢成主按钮（会误买、答错题）
    // 焦点跑到了弹窗外（背后已经 inert，正常到不了）：只把焦点拉回弹窗，不替玩家点主按钮
    if ((e.key === 'Enter' || e.key === ' ') && !idle && !box.contains(e.target)) { e.preventDefault(); (pri || box.querySelector('.minbtn')).focus(); return; }
    // 战报是一页长内容：焦点停在战报里（不在按钮上）时空格 / 回车留给浏览器滚动，不替玩家点「知道了」
    if ((e.key === 'Enter' || e.key === ' ') && box.classList.contains('rep') && box.contains(e.target)) return;
    if ((e.key === 'Enter' || e.key === ' ') && click(pri)) return;
    // 1–9 按看得见的位置数，灰的也占一个位置；按到灰的提示为什么不能选，不顺延到后面的按钮（以前按 2 会选成「不买」）
    if (/^[1-9]$/.test(e.key)) { const b = all[+e.key - 1]; if (b && b.disabled) { e.preventDefault(); toast(greyWhy(b, box)); } else click(b); }
    return;
  }
  const btnBy = t => [...document.querySelectorAll('#center button')].find(b => b.textContent.includes(t));
  // 单机时骰子在转、焦点没停在任何按钮上：空格 / 回车直接出点数。按住不放的自动重复不算，免得掷骰子那一下按久了就把动画跳没了
  if ((e.key === ' ' || e.key === 'Enter') && idle && !e.repeat && FX.diceSpin && !MP.role) { e.preventDefault(); FX.diceSkip = true; return; }
  // 焦点停在任何东西上（按钮、格子、「对局」菜单、能滚动的面板）时，回车 / 空格交给它自己：点按钮、展开菜单、翻页，不能顺带掷骰子或结束回合
  if (e.key === ' ' || e.key === 'Enter') { if (!idle) return; return void click(document.querySelector('#center .stage .row:not(.more) button.pri')); }
  const k = e.key.toLowerCase();
  if (k === 'b') click(btnBy(_t(4054, "资产管理")));
  else if (k === 't') click(btnBy(_t(4056, "交易")));
  else if (k === 'm') { e.preventDefault(); showManual(); }
  else if (k === 'g') { e.preventDefault(); gallery(); }
  else if (k === 's') { e.preventDefault(); toggleSfx(); }
  else if (e.key === '?') { e.preventDefault(); keyHelp(); }
});

