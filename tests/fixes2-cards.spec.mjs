import { test, expect } from '@playwright/test';

// 卡牌修复的回归测试（Startup 代理商折扣、二选一 Impaired、没动静的卡不问抵消、快线绕圈、测试环境不收下线实例、免疫文字）。
// 跟 fixes.spec.mjs 一样：在页面里摆好局面，调真实的游戏函数。
test.describe.configure({ timeout: 60_000 });

async function start(page, cfg = {}) {
  await page.addInitScript(() => { let s = 20261121; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto('/');
  await page.evaluate(cfg => {
    newGame({ names: ['A', 'B', 'C'], diff: 'full', wa: true, timed: false, minutes: 90, learn: false, ...cfg });
    enterGame();
    OWNABLE.forEach(i => { S.props[i].owner = null; S.props[i].level = 0; });
    S.players.forEach(q => { q.role = 'saas'; q.cash = 3000; q.cards = []; q.pos = 0; });
    S.cur = 0; S.phase = 'roll';
  }, cfg);
}
// 跑一段异步游戏代码，最多等 3 秒：返回 'done'（没卡在弹窗上）或 'pending'，再带上当时有没有弹窗、弹窗标题
const settle = (page, src) => page.evaluate(async src => {
  const st = await Promise.race([(0, eval)(`(${src})`)().then(() => 'done'), new Promise(res => setTimeout(() => res('pending'), 3000))]);
  const m = document.querySelector('#modal');
  return { st, modal: !!m && !m.hidden, title: m && !m.hidden ? (m.querySelector('h3') || {}).textContent || '' : '' };
}, src.toString());

test('Startup 拿到代理商折扣：代理商抽到改拿 9 折购买券（代理商不能从代理商手里买）', async ({ page }) => {
  await start(page, { dlc: ['reseller'] });
  const r = await page.evaluate(async () => {
    const p = S.players[0]; p.reseller = true; S.players[1].reseller = true; p.rsCoupon = 0; p.buyCoupon = 0;
    await REI.find(c => c && c.n === 'Startup 拿到代理商折扣').run(p);
    const q = S.players[2]; q.rsCoupon = 0; q.buyCoupon = 0;
    await REI.find(c => c && c.n === 'Startup 拿到代理商折扣').run(q);
    return { rs: p.rsCoupon || 0, buy: p.buyCoupon || 0, cRs: q.rsCoupon || 0, cBuy: q.buyCoupon || 0 };
  });
  expect(r).toEqual({ rs: 0, buy: 0.9, cRs: 0.8, cBuy: 0 });
});

test('Health #20 DDoS：下线的 CloudFront 不能拿来顶 Impaired，只能交钱', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { S.props[IX.cloudfront].owner = 0; S.props[IX.cloudfront].offline = 2; });
  const c0 = await page.evaluate(() => S.players[0].cash);
  const r = await settle(page, () => incident(S.players[0], 20));
  expect(r.st).toBe('done');
  expect(r.modal).toBe(false);
  const after = await page.evaluate(() => ({ cash: S.players[0].cash, imp: !!S.props[IX.cloudfront].impaired }));
  expect(after.imp).toBe(false);
  expect(after.cash).toBeLessThan(c0);
});

test('Health #10 证书过期：被 DDoS 打下线的 ELB 不能拿来顶 Impaired，只能交钱', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { S.props[IX.elb].owner = 0; S.props[IX.elb].ddos = 1; });
  const c0 = await page.evaluate(() => S.players[0].cash);
  const r = await settle(page, () => incident(S.players[0], 10));
  expect(r.st).toBe('done');
  expect(r.modal).toBe(false);
  const after = await page.evaluate(() => ({ cash: S.players[0].cash, imp: !!S.props[IX.elb].impaired }));
  expect(after.imp).toBe(false);
  expect(after.cash).toBe(c0 - 100);
});

// 抽到对自己没动静的卡：不该先问「要抵消吗」，Enterprise Support 留着
const NOOP = [
  ['渠道合规审计', () => {}],
  ['代理合同到期没续', () => {}],
  ['代理商涨价', () => { S.players[1].reseller = true; }],
  ['测试环境忘了删', () => { S.props[IX.ec2].owner = 0; S.props[IX.ec2].level = 1; }],
  ['跨区流量费暴涨', () => {}],
  ['当地要求数据本地存储', () => {}],
  ['流量被劫持到别人那里', () => { S.players[0].pos = IX.jail; S.players[0].jail = 0; }],
];
for (const [name, setup] of NOOP) {
  test(`Health「${name}」对你没动静时不问要不要抵消，Enterprise Support 不会白花`, async ({ page }) => {
    await start(page, { dlc: ['reseller', 'finops', 'global'] });
    await page.evaluate(([name, src]) => {
      (0, eval)(`(${src})`)();
      S.players[0].cards.push({ id: 'ES', used: false });
      window.__id = INC.findIndex(c => c && c.n === name);
    }, [name, setup.toString()]);
    expect(await page.evaluate(() => window.__id)).toBeGreaterThan(0);
    const r = await settle(page, () => incident(S.players[0], window.__id));
    expect(r.title).not.toContain('抵消');
    expect(r).toMatchObject({ st: 'done', modal: false });
    expect(await page.evaluate(() => S.players[0].cards[0].used)).toBe(false);
  });
}

test('Health「测试环境忘了删」真打中时照样先问要不要抵消', async ({ page }) => {
  await start(page, { dlc: ['finops'] });
  await page.evaluate(() => { S.props[IX.ec2].owner = 0; S.players[0].cards.push({ id: 'ES', used: false }); window.__id = INC.findIndex(c => c && c.n === '测试环境忘了删'); });
  const r = await settle(page, () => incident(S.players[0], window.__id));
  expect(r.st).toBe('pending');
  expect(r.title).toContain('抵消');
});

test('Health「测试环境忘了删」：下线的实例不收钱', async ({ page }) => {
  await start(page, { dlc: ['finops'] });
  const r = await page.evaluate(async () => {
    const p = S.players[0]; S.props[IX.ec2].owner = 0; S.props[IX.ec2].offline = 2;
    const c0 = p.cash, v = await INC.find(c => c && c.n === '测试环境忘了删').run(p);
    return { v, paid: c0 - p.cash };
  });
  expect(r).toEqual({ v: 'nopen', paid: 0 });
});

// 前进类的卡：已经站在目标格上时要往前绕一整圈（经过起点），不能原地再结算一次落点
const LAP = [
  ['走 Global Accelerator 快线', 's3', () => { S.props[IX.s3].owner = 0; }],
  ['AI Agent 上线', 'lambda', () => {}],
  ['入选海外市场加速计划', 'cloudfront', () => {}],
  ['Bedrock AgentCore 正式发布', 'agentcore', () => {}],
];
for (const [name, sq, setup] of LAP) {
  test(`re:Invent「${name}」：已经站在目标格上就绕一整圈，经过起点`, async ({ page }) => {
    await start(page);
    const r = await page.evaluate(async ([name, sq, src]) => {
      (0, eval)(`(${src})`)();
      const p = S.players[0]; p.pos = IX[sq];
      let go = 0; passStart = async () => { go++; }; passUG = async () => {}; land = async () => {};
      await REI.find(c => c && c.n === name).run(p);
      return { pos: p.pos, want: IX[sq], go };
    }, [name, sq, setup.toString()]);
    expect(r.pos).toBe(r.want);
    expect(r.go).toBe(1);
  });
}

test('免疫说明写全：「测试环境忘了删」有 EventBridge，「EC2 实例硬件退役」有 ELB 和 EventBridge', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(() => ({ test: INC.find(c => c && c.n === '测试环境忘了删').im, ec2: INC.find(c => c && c.n === 'EC2 实例硬件退役').im }));
  expect(r.test).toContain('EventBridge');
  expect(r.ec2).toContain('ELB');
  expect(r.ec2).toContain('EventBridge');
});
