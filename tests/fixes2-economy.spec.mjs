import { test, expect } from '@playwright/test';

// 经济规则修复的回归测试：RI 跟着人走、Hackathon 免费容量不算钱、DDoS 跟着转手解除、破产分资产扣下线拿走的钱、
// 联机远端发来的 SP / 主动行动要过模式检查。摆局面的方法和 fixes.spec.mjs 一样：newGame + enterGame，再直接改状态、调真实的游戏函数。
test.describe.configure({ timeout: 60_000 });

async function start(page, cfg = {}) {
  await page.addInitScript(() => { let s = 20261122; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto('/');
  await page.evaluate(cfg => {
    newGame({ names: ['A', 'B', 'C'], diff: 'full', wa: true, timed: false, minutes: 90, learn: false, ...cfg });
    enterGame();
    OWNABLE.forEach(i => { S.props[i].owner = null; S.props[i].level = 0; });
    S.players.forEach(q => { q.role = 'saas'; q.cash = 3000; q.cards = []; q.pos = 0; q.commits = []; });
    S.cur = 0; S.phase = 'roll';
  }, cfg);
}
const modalBox = page => page.locator('#modal:not([hidden]) .box');
const btn = (page, text) => page.locator('#modal:not([hidden]) .btns button', { hasText: text });
const run = (page, fn, arg) => page.evaluate(([src, arg]) => { window.__done = false; window.__r = undefined; (0, eval)(`(${src})`)(arg).then(r => { window.__r = r; window.__done = true; }); }, [fn.toString(), arg]);
const done = page => expect.poll(() => page.evaluate(() => window.__done), { timeout: 15_000 }).toBe(true);
// 一直点能点的按钮，直到函数返回（抽卡亮卡窗、只有一个选项的弹窗）
const clickThrough = page => expect.poll(async () => {
  if (await page.evaluate(() => window.__done)) return true;
  await page.locator('#modal:not([hidden]) .btns button:not(:disabled)').first().click({ timeout: 1000 }).catch(() => {});
  return page.evaluate(() => window.__done);
}, { timeout: 15_000 }).toBe(true);
// A 把服务 i 交给 B，B 付 $10
async function tradeTo(page, i) {
  await run(page, i => trade({ to: 1, want: -1 }), i);
  await expect(modalBox(page)).toBeVisible();
  await page.locator(`#in_ap${i}`).check();
  await page.locator('#in_bcash').fill('10');
  await btn(page, '提交给对方确认').click();
  await btn(page, '同意').click();
  await done(page);
}

test('RI：用弹窗买的 RI，服务卖回亚马逊云科技后作废，再买回来也不复活', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { S.props[IX.ec2].owner = 0; });
  await run(page, () => edpDialog());
  await btn(page, '买 RI').click();
  await btn(page, '1 年（1 圈）').click();
  await done(page);
  const before = await page.evaluate(() => !!riActive(S.players[0], IX.ec2));
  expect(before).toBe(true);
  const r = await page.evaluate(() => {
    const p = S.players[0];
    sellProp(p, IX.ec2);
    const sold = { ri: !!riActive(p, IX.ec2), n: commitsOf(p).length };
    S.props[IX.ec2].owner = 0;   // 落上去重新买下
    return { sold, rebought: !!riActive(p, IX.ec2), n: commitsOf(p).length };
  });
  expect(r).toEqual({ sold: { ri: false, n: 0 }, rebought: false, n: 0 });
});

test('RI：服务交易给别人后作废（老存档没有标记的 RI 也一样），换回来也不复活', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { S.props[IX.ec2].owner = 0; S.players[0].commits = [{ type: 'ri', svc: IX.ec2, laps: 3, amt: runCost(IX.ec2) }]; });
  await tradeTo(page, await page.evaluate(() => IX.ec2));
  const r = await page.evaluate(() => {
    const p = S.players[0], out = { owner: S.props[IX.ec2].owner, ri: !!riActive(p, IX.ec2) };
    S.props[IX.ec2].owner = 0;   // 又换回来
    return { ...out, back: !!riActive(p, IX.ec2) };
  });
  expect(r).toEqual({ owner: 1, ri: false, back: false });
});

test('Hackathon 免费加的容量：卖回价、Trusted Advisor 全额退、拆容量、估值都不算钱；花钱加的照退一半', async ({ page }) => {
  await start(page);
  const before = await page.evaluate(() => {
    const p = S.players[0]; S.props[IX.ec2].owner = 0; addCap(p, IX.ec2);
    return { sv: sellValue(IX.ec2), fb: fullBack(IX.ec2), strip: stripValue(IX.ec2), inv: valBreak(p).inv, half: Math.round(capCost(IX.ec2) / 2) };
  });
  await run(page, () => drawReinvent(S.players[0], 14));
  await clickThrough(page);
  const r = await page.evaluate(() => {
    const p = S.players[0], cap = S.props[IX.ec2].cap;
    const v = { cap, sv: sellValue(IX.ec2), fb: fullBack(IX.ec2), strip: stripValue(IX.ec2), inv: valBreak(p).inv };
    const c0 = p.cash; sellCap(p, IX.ec2); const d1 = p.cash - c0;
    const c1 = p.cash; sellCap(p, IX.ec2); const d2 = p.cash - c1;
    return { ...v, backs: [d1, d2], capLeft: S.props[IX.ec2].cap };
  });
  expect(r).toEqual({ cap: 2, sv: before.sv, fb: before.fb, strip: before.strip, inv: before.inv, backs: [before.half, 0], capLeft: 0 });
});

test('DDoS：服务交易给发动 DDoS 的人后解除', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { const pr = S.props[IX.rds]; pr.owner = 0; pr.ddos = 1; pr.ddosLeft = 2; });
  await tradeTo(page, await page.evaluate(() => IX.rds));
  const r = await page.evaluate(() => ({ owner: S.props[IX.rds].owner, ddos: S.props[IX.rds].ddos, left: S.props[IX.rds].ddosLeft || 0 }));
  expect(r).toEqual({ owner: 1, ddos: null, left: 0 });
});

test('DDoS：破产时服务分给发动 DDoS 的债主后解除', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const p = S.players[0], pr = S.props[IX.rds]; pr.owner = 0; pr.ddos = 1; pr.ddosLeft = 2;
    p.cash = 0; p.debt = [{ to: 1, amt: 9000 }];
  });
  await run(page, () => resolveDebts());
  await btn(page, '宣告破产').click();
  await done(page);
  const r = await page.evaluate(() => ({ alive: S.players[0].alive, owner: S.props[IX.rds].owner, ddos: S.props[IX.rds].ddos }));
  expect(r).toEqual({ alive: false, owner: 1, ddos: null });
});

test('破产分资产：下线的服务按扣掉下线时拿走的钱算价值', async ({ page }) => {
  await start(page);
  // RDS 实付 400、下线时拿走 250：只值 150；S3 实付 300。两个债主各欠一半：价值高的先分给 B，所以 B 该拿 S3
  await page.evaluate(() => {
    const p = S.players[0], x = S.props[IX.rds], y = S.props[IX.s3];
    x.owner = 0; x.paid = 400; x.offline = 2; x.offCash = 250; x.offTurn = 0;
    y.owner = 0; y.paid = 300;
    p.cash = 0; p.debt = [{ to: 1, amt: 5000 }, { to: 2, amt: 5000 }];
  });
  await run(page, () => resolveDebts());
  await btn(page, '宣告破产').click();
  await done(page);
  const r = await page.evaluate(() => ({ s3: S.props[IX.s3].owner, rds: S.props[IX.rds].owner }));
  expect(r).toEqual({ s3: 1, rds: 2 });
});

test('联机远端的 SP / RI、主动行动请求：不在能用的模式里就不执行（和按钮同一个条件）', async ({ page }) => {
  await start(page, { diff: 'std' });
  await page.evaluate(() => { S.props[IX.ec2].owner = 0; });
  // 标准局没开 FinOps：SP / RI 弹窗不该打开
  await run(page, () => edpDialog());
  await done(page);
  await expect(modalBox(page)).toHaveCount(0);
  // 标准局没有主动行动
  await run(page, () => activeAction());
  await done(page);
  await expect(modalBox(page)).toHaveCount(0);
  // 开了 FinOps 的标准局：SP / RI 照常能签
  await page.evaluate(() => { S.cfg.dlc = ['finops']; });
  await run(page, () => edpDialog());
  await expect(btn(page, '买 RI')).toBeVisible();
});
