import { test, expect } from '@playwright/test';

// DLC「Health 事件扩展包（2026）」10 张卡：每张看免疫和打中两边、打中时的金额 / Impaired / 停一轮。
// 跟 fixes.spec.mjs 一样：在页面里摆好局面，调真实的游戏函数；要弹窗的不等它返回，看 #modal 里的按钮再点。
test.describe.configure({ timeout: 60_000 });

async function start(page, cfg = {}) {
  await page.addInitScript(() => { let s = 20261121; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto('/');
  await page.evaluate(cfg => {
    newGame({ names: ['A', 'B', 'C'], diff: 'full', wa: true, timed: false, minutes: 90, learn: false, dlc: ['inc26'], ...cfg });
    enterGame();
    OWNABLE.forEach(i => { S.props[i].owner = null; S.props[i].level = 0; S.props[i].impaired = false; });
    S.players.forEach(q => { q.role = 'saas'; q.cash = 3000; q.cards = []; q.pos = 0; q.techDebt = 0; q.skip = 0; });
    S.cur = 0; S.phase = 'roll';
  }, cfg);
}
const modalBox = page => page.locator('#modal:not([hidden]) .box');
const btn = (page, text) => page.locator('#modal:not([hidden]) .btns button', { hasText: text });
const run = (page, fn, arg) => page.evaluate(([src, arg]) => { window.__done = false; window.__r = undefined; (0, eval)(`(${src})`)(arg).then(r => { window.__r = r; window.__done = true; }); }, [fn.toString(), arg]);
const done = page => expect.poll(() => page.evaluate(() => window.__done), { timeout: 15_000 }).toBe(true);
// 摆局面（setup 在页面里跑），返回卡的免疫原因
const imm = (page, name, setup) => page.evaluate(([name, src]) => { (0, eval)(`(${src})`)(); return INC.find(c => c && c.n === name).imm(S.players[0]); }, [name, setup.toString()]);
// 直接跑卡的 run（不走抵消窗），可选点一个按钮
async function hit(page, name, click) {
  await run(page, name => INC.find(c => c && c.n === name).run(S.players[0]), name);
  if (click) { await expect(modalBox(page)).toBeVisible(); await btn(page, click).click(); }
  await done(page);
  return page.evaluate(() => ({ cash: S.players[0].cash, skip: S.players[0].skip, debt: S.players[0].techDebt, r: window.__r }));
}

test('扩展包 2026：开局勾上 inc26，10 张卡进牌堆，编号接在所有已有卡后面；不勾就没有', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(() => {
    const ids = INC.map((c, k) => c && c.dlc === 'inc26' ? k : 0).filter(Boolean);
    const firstNon = INC.findIndex((c, k) => k > 0 && c.dlc === 'inc26');
    return { n: ids.length, last: ids[ids.length - 1] === INC.length - 1, tail: ids.every((k, j) => k === firstNon + j), inDeck: ids.every(k => S.inc.includes(k)), tile: !!DLC.inc26 };
  });
  expect(r).toEqual({ n: 10, last: true, tail: true, inDeck: true, tile: true });
  await start(page, { dlc: [] });
  expect(await page.evaluate(() => S.inc.some(k => INC[k].dlc === 'inc26'))).toBe(false);
});

test('Lambda 并发被打满：预置并发或 SQS 免疫；打中时二选一，交 $60 或 Lambda 变 Impaired', async ({ page }) => {
  await start(page);
  expect(await imm(page, 'Lambda 并发被打满', () => {})).toBe('没有 Lambda');
  expect(await imm(page, 'Lambda 并发被打满', () => { S.props[IX.lambda].owner = 0; S.props[IX.lambda].level = 1; })).toBe('');   // 只提高账户配额挡不住一个函数吃光
  expect(await imm(page, 'Lambda 并发被打满', () => { S.props[IX.lambda].level = 2; })).toContain('预置并发');
  expect(await imm(page, 'Lambda 并发被打满', () => { S.props[IX.lambda].level = 0; S.props[IX.sqs].owner = 0; })).toContain('SQS');
  await page.evaluate(() => { S.props[IX.sqs].owner = null; });
  const r = await hit(page, 'Lambda 并发被打满', '交 $60');
  expect(r.cash).toBe(2940);
  await hit(page, 'Lambda 并发被打满', '让 Lambda 变成 Impaired');
  expect(await page.evaluate(() => S.props[IX.lambda].impaired)).toBe(true);
});

test('NAT 网关处理费超支：私有子网里每块实例型服务交 $30；没开私有子网或有终端节点免疫', async ({ page }) => {
  await start(page);
  expect(await imm(page, 'NAT 网关处理费超支', () => { S.props[IX.ec2].owner = 0; S.props[IX.rds].owner = 0; S.props[IX.lambda].owner = 0; })).toContain('没开私有子网');
  expect(await imm(page, 'NAT 网关处理费超支', () => { S.props[IX.vpc].owner = 0; })).toContain('没开私有子网');
  expect(await imm(page, 'NAT 网关处理费超支', () => { S.props[IX.vpc].level = 2; })).toContain('终端节点');
  expect(await imm(page, 'NAT 网关处理费超支', () => { S.props[IX.vpc].level = 1; })).toBe('');
  const r = await hit(page, 'NAT 网关处理费超支');
  expect(r.cash).toBe(3000 - 60);   // EC2、RDS 两块；Lambda 不是实例型、VPC 不是实例
});

test('KMS 密钥被误设成待删除：没有客户托管密钥、或 CloudTrail + CloudWatch 告警免疫；打中停一轮或交 $100', async ({ page }) => {
  await start(page);
  expect(await imm(page, 'KMS 密钥被误设成待删除', () => { S.props[IX.kms].owner = 0; })).toContain('没有客户托管密钥');
  expect(await imm(page, 'KMS 密钥被误设成待删除', () => { S.props[IX.kms].level = 1; S.props[IX.cloudtrail].owner = 0; })).toBe('');   // 光有 CloudTrail 只记录
  expect(await imm(page, 'KMS 密钥被误设成待删除', () => { S.props[IX.cloudwatch].owner = 0; S.props[IX.cloudwatch].level = 2; })).toContain('告警');
  await page.evaluate(() => { S.props[IX.cloudwatch].owner = null; });
  let r = await hit(page, 'KMS 密钥被误设成待删除', '交 $100');
  expect([r.cash, r.skip]).toEqual([2900, 0]);
  r = await hit(page, 'KMS 密钥被误设成待删除', '停一轮');
  expect([r.cash, r.skip]).toEqual([2900, 1]);
});

test('IAM 权限给成了 *:*：Config 托管规则或 CloudTrail 免疫；完整局记 1 个技术债，入门局改交 $100', async ({ page }) => {
  await start(page);
  expect(await imm(page, 'IAM 权限给成了 *:*', () => {})).toBe('');
  expect(await imm(page, 'IAM 权限给成了 *:*', () => { S.props[IX.config].owner = 0; })).toBe('');   // Config 没建规则不查
  expect(await imm(page, 'IAM 权限给成了 *:*', () => { S.props[IX.config].level = 1; })).toContain('Config');
  expect(await imm(page, 'IAM 权限给成了 *:*', () => { S.props[IX.config].owner = null; S.props[IX.cloudtrail].owner = 0; })).toContain('CloudTrail');
  await page.evaluate(() => { S.props[IX.cloudtrail].owner = null; window.__id = INC.findIndex(c => c && c.n === 'IAM 权限给成了 *:*'); });
  await run(page, () => incident(S.players[0], window.__id));
  await done(page);
  expect(await page.evaluate(() => [S.players[0].techDebt, S.players[0].cash])).toEqual([1, 3000]);
  await start(page, { diff: 'basic' });
  await page.evaluate(() => { window.__id = INC.findIndex(c => c && c.n === 'IAM 权限给成了 *:*'); });
  await run(page, () => incident(S.players[0], window.__id));
  await done(page);
  expect(await page.evaluate(() => [S.players[0].techDebt, S.players[0].cash])).toEqual([0, 2900]);
});

test('EBS 快照越积越多：按块算，没用 DLM 管快照的 EBS、EC2 每块交 $40', async ({ page }) => {
  await start(page);
  expect(await imm(page, 'EBS 快照越积越多', () => { S.props[IX.s3].owner = 0; })).toContain('DLM');
  expect(await imm(page, 'EBS 快照越积越多', () => { S.props[IX.ebs].owner = 0; S.props[IX.ec2].owner = 0; S.props[IX.ec2].level = 1; })).toBe('');
  let r = await hit(page, 'EBS 快照越积越多');
  expect(r.cash).toBe(2960);   // EC2 有自动 AMI，只算 EBS
  await page.evaluate(() => { S.props[IX.ec2].level = 0; });
  r = await hit(page, 'EBS 快照越积越多');
  expect(r.cash).toBe(2960 - 80);
  expect(await imm(page, 'EBS 快照越积越多', () => { S.props[IX.ebs].level = 1; S.props[IX.ec2].level = 1; })).toContain('DLM');
});

test('重试风暴：SQS 或 API Gateway 限流免疫；打中时随机一块服务变成 Impaired', async ({ page }) => {
  await start(page);
  expect(await imm(page, '重试风暴', () => { S.props[IX.ec2].owner = 0; S.props[IX.dynamodb].owner = 0; S.props[IX.apigw].owner = 0; })).toBe('');
  expect(await imm(page, '重试风暴', () => { S.props[IX.apigw].level = 1; })).toContain('API Gateway');
  expect(await imm(page, '重试风暴', () => { S.props[IX.apigw].level = 0; S.props[IX.sqs].owner = 0; })).toContain('SQS');
  await page.evaluate(() => { S.props[IX.sqs].owner = null; });
  await hit(page, '重试风暴');
  const n = await page.evaluate(() => [IX.ec2, IX.dynamodb, IX.apigw].filter(i => S.props[i].impaired).length);
  expect(n).toBe(1);
});

test('定时任务时区配错了：EventBridge Scheduler 写明时区免疫；打中停一轮或交 $80', async ({ page }) => {
  await start(page);
  expect(await imm(page, '定时任务时区配错了', () => { S.props[IX.eventbridge].owner = 0; })).toBe('');
  expect(await imm(page, '定时任务时区配错了', () => { S.props[IX.eventbridge].level = 1; })).toContain('时区');
  let r = await hit(page, '定时任务时区配错了', '交 $80');
  expect([r.cash, r.skip]).toEqual([2920, 0]);
  r = await hit(page, '定时任务时区配错了', '停一轮');
  expect([r.cash, r.skip]).toEqual([2920, 1]);
});

test('唯一懂 Kubernetes 的人离职了：EKS Auto Mode 免疫；打中交 $150 或 EKS 下线 1 轮（不收费、不算持有，自己下回合开始恢复）', async ({ page }) => {
  await start(page);
  expect(await imm(page, '唯一懂 Kubernetes 的人离职了', () => {})).toBe('没有 EKS');
  expect(await imm(page, '唯一懂 Kubernetes 的人离职了', () => { S.props[IX.eks].owner = 0; S.props[IX.eks].level = 2; })).toBe('');
  expect(await imm(page, '唯一懂 Kubernetes 的人离职了', () => { S.props[IX.eks].level = 3; })).toContain('Auto Mode');
  await page.evaluate(() => { S.props[IX.eks].level = 0; });
  const r = await hit(page, '唯一懂 Kubernetes 的人离职了', '交 $150');
  expect(r.cash).toBe(2850);
  await hit(page, '唯一懂 Kubernetes 的人离职了', '让 EKS 下线 1 轮');
  expect(await page.evaluate(() => ({ down: S.props[IX.eks].ddos, why: S.props[IX.eks].ddosWhy, act: active(S.players[0], IX.eks), rent: shownRent(IX.eks).r }))).toEqual({ down: 0, why: '唯一懂 Kubernetes 的人离职了', act: false, rent: 0 });
  // 别人的回合开始不恢复，自己的回合开始恢复；没开高速部署也一样
  const back = await page.evaluate(() => { downTick(S.players[1]); const mid = S.props[IX.eks].ddos; downTick(S.players[0]); return [mid, S.props[IX.eks].ddos, active(S.players[0], IX.eks)]; });
  expect(back).toEqual([0, null, true]);
});

test('Docker Hub 拉镜像被限流：有 ECR 免疫；打中 ECS、EKS 都变 Impaired', async ({ page }) => {
  await start(page);
  expect(await imm(page, 'Docker Hub 拉镜像被限流', () => {})).toContain('没有 ECS');
  expect(await imm(page, 'Docker Hub 拉镜像被限流', () => { S.props[IX.ecs].owner = 0; S.props[IX.eks].owner = 0; })).toBe('');
  expect(await imm(page, 'Docker Hub 拉镜像被限流', () => { S.props[IX.ecr].owner = 0; })).toContain('ECR');
  await page.evaluate(() => { S.props[IX.ecr].owner = null; });
  const r = await hit(page, 'Docker Hub 拉镜像被限流');
  expect(r.cash).toBe(3000);
  expect(await page.evaluate(() => [S.props[IX.ecs].impaired, S.props[IX.eks].impaired])).toEqual([true, true]);
});

test('黑色星期五大促：全场，没弹性扩展的实例型服务 Impaired，有弹性扩展的每块领 $50；不问抵消、不记技术债', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    S.props[IX.ec2].owner = 0; S.props[IX.ec2].level = 2;   // 跨 AZ Auto Scaling
    S.props[IX.rds].owner = 0;                              // 没扩展
    S.props[IX.ecs].owner = 1; S.props[IX.ecs].level = 3;   // 服务自动扩缩
    S.props[IX.aurora].owner = 1; S.props[IX.aurora].level = 2;
    S.props[IX.eks].owner = 2;
    S.props[IX.lambda].owner = 2;                           // 不是实例型，不受影响
    S.players[0].cards.push({ id: 'ES', used: false });
    window.__id = INC.findIndex(c => c && c.n === '黑色星期五大促');
  });
  await run(page, () => incident(S.players[0], window.__id));
  await done(page);
  const r = await page.evaluate(() => ({
    cash: S.players.map(q => q.cash), debt: S.players[0].techDebt, es: S.players[0].cards[0].used,
    imp: [IX.ec2, IX.rds, IX.ecs, IX.aurora, IX.eks, IX.lambda].map(i => !!S.props[i].impaired),
  }));
  expect(r).toEqual({ cash: [3050, 3100, 3000], debt: 0, es: false, imp: [false, true, false, false, true, false] });
});
