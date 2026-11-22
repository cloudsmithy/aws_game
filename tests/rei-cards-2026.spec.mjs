import { test, expect } from '@playwright/test';

// 2026 年的 12 张基础 re:Invent 卡（web/src/rules/05d-rei26.js）：每张看效果、做不到时的保底，「这一圈」和「下次经过 Startup 扶持」的效果到点失效。
// 跟 cards-choice.spec.mjs 一样：在页面里摆好局面，调真实的游戏函数；要弹窗的不等它返回，看 #modal 里的按钮再点。
test.describe.configure({ timeout: 60_000 });

async function start(page, cfg = {}) {
  await page.addInitScript(() => { let s = 20261123; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto('/');
  await page.evaluate(cfg => {
    newGame({ names: ['A', 'B', 'C'], diff: 'full', wa: true, timed: false, minutes: 90, learn: false, dlc: [], ...cfg });
    enterGame();
    OWNABLE.forEach(i => { S.props[i].owner = null; S.props[i].level = 0; S.props[i].impaired = false; });
    S.players.forEach(q => { q.role = 'saas'; q.cash = 3000; q.cards = []; q.hand = []; q.coe = []; q.pos = 5; q.techDebt = 0; q.skip = 0; q.jail = null; q.runCut = []; q.lapFx = []; });
    S.cur = 0; S.phase = 'busy'; S.round = 10;   // 过了新账户保护期，过路费不封顶
  }, cfg);
}
const modalBox = page => page.locator('#modal:not([hidden]) .box');
const btn = (page, text) => page.locator('#modal:not([hidden]) .btns button', { hasText: text });
const run = (page, fn, arg) => page.evaluate(([src, arg]) => { window.__done = false; window.__r = undefined; (0, eval)(`(${src})`)(arg).then(r => { window.__r = r; window.__done = true; }); }, [fn.toString(), arg]);
const isDone = page => page.evaluate(() => window.__done);
const done = page => expect.poll(() => isDone(page), { timeout: 15_000 }).toBe(true);
// 答完题还有一个结果窗（「继续」），点掉它等结算完
const finish = page => expect.poll(async () => { if (await isDone(page)) return true; await page.getByRole('button', { name: '继续', exact: true }).click({ timeout: 300 }).catch(() => {}); return false; }, { timeout: 15_000 }).toBe(true);
// 亮出一张指定的卡（User Group 三选一那条路：forced，不进手牌），点掉亮卡窗；停在 stopAt 的弹窗上，或者一直到结算完
async function play(page, name, stopAt) {
  await run(page, name => drawReinvent(S.players[0], REI.findIndex(c => c && c.n === name)), name);
  await expect.poll(async () => {
    if (stopAt && await modalBox(page).filter({ hasText: stopAt }).count()) return true;
    if (!stopAt && await isDone(page)) return true;
    await btn(page, '执行').click({ timeout: 500 }).catch(() => {});
    await page.getByRole('button', { name: '继续', exact: true }).click({ timeout: 200 }).catch(() => {});   // 答完题的结果窗
    return false;
  }, { timeout: 15_000 }).toBe(true);
}
// 按当时的卡牌倍率，卡上的 $x 实际是多少
const amt = (page, x) => page.evaluate(x => withCardMul(S.cardMul || cardMulBase(), async () => cardAmt(x)), x);
const cash = (page, k = 0) => page.evaluate(k => S.players[k].cash, k);
// B 落到 i 上付过路费（骰子固定 7），返回 B 付了多少（A 收到的还要扣请求费，不好比）
const rentTo = (page, k) => page.evaluate(async k => { S.lastDice = [3, 4]; const c0 = S.players[1].cash; await payRent(S.players[1], IX[k]); return c0 - S.players[1].cash; }, k);

const NAMES = ['用 Kiro 做规格驱动重构', '上了 Lambda SnapStart', '换上 Graviton4 实例', '用了 S3 Express One Zone', 'Aurora Serverless v2 缩到 0', 'CloudWatch Application Signals 画出调用链',
  '在 Organizations 里共享 Savings Plans', '你在 re:Post 的回答被采纳', '和对手合办 User Group 技术分享', '考过 Machine Learning Engineer – Associate', 'Activate 给了额外 Credits', '收到 Spot 中断前 2 分钟通知'];

test('12 张新卡接在 re:Invent 牌最后，不带 DLC，开局就在基础牌堆里；#7 还是 Solutions Architect', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(names => ({ ids: names.map(n => REI.findIndex(c => c && c.n === n)), len: REI.length, dlc: names.some(n => REI.find(c => c && c.n === n).dlc), deck: names.every(n => S.rei.includes(REI.findIndex(c => c && c.n === n))), n7: REI[7].n, art: names.every(n => !!AWSI[REI.find(c => c && c.n === n).art]) }), NAMES);
  expect(r.ids).toEqual(Array.from({ length: 12 }, (_, k) => r.len - 12 + k));
  expect(r).toMatchObject({ dlc: false, deck: true, n7: '考过了 Solutions Architect 认证', art: true });
});

test('Kiro 规格驱动重构：有技术债清 1 个，进维护窗口、名下服务下线一轮；没有就四选一领 $100', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { const p = S.players[0]; p.techDebt = 2; [IX.ec2, IX.s3].forEach(i => { S.props[i].owner = 0; }); });
  await play(page, NAMES[0]);
  expect(await page.evaluate(() => { const p = S.players[0]; return { debt: p.techDebt, jail: p.jail, down: [IX.ec2, IX.s3].map(i => S.props[i].ddos) }; })).toEqual({ debt: 1, jail: 0, down: [0, 0] });
  await start(page);
  const c0 = await cash(page), want = await amt(page, 100);
  await play(page, NAMES[0], '领钱，还是走一步');
  await btn(page, '领 $').click(); await done(page);
  expect(await cash(page) - c0).toBe(want);
});

test('Lambda SnapStart：这一圈 Lambda 过路费 ×1.3，经过 Startup 扶持后恢复；没有 Lambda 领 $50', async ({ page }) => {
  await start(page);
  const c0 = await cash(page), want = await amt(page, 50);
  await play(page, NAMES[1]);
  expect(await cash(page) - c0).toBe(want);
  await page.evaluate(() => { S.props[IX.lambda].owner = 0; });
  const base = await rentTo(page, 'lambda');
  await play(page, NAMES[1]);
  expect(await rentTo(page, 'lambda')).toBe(Math.round(base * 1.3));
  await page.evaluate(() => passStart(S.players[0]));
  expect(await rentTo(page, 'lambda')).toBe(base);
  expect(await page.evaluate(() => S.players[0].lapFx.length)).toBe(0);
});

test('Graviton4：下次经过 Startup 扶持时 EC2、RDS 运行费减半，只管一次；两块都没有领 $50', async ({ page }) => {
  await start(page);
  const c0 = await cash(page), want = await amt(page, 50);
  await play(page, NAMES[2]);
  expect(await cash(page) - c0).toBe(want);
  await page.evaluate(() => { [IX.ec2, IX.rds, IX.s3].forEach(i => { S.props[i].owner = 0; }); });
  const r = await page.evaluate(() => ({ full: billAt(S.players[0], 0, ''), half: Math.round((runCost(IX.ec2) + runCost(IX.rds)) / 2) }));
  await play(page, NAMES[2]);
  Object.assign(r, await page.evaluate(() => ({ cut: S.players[0].runCut.length, next: billAt(S.players[0], 0, '') })));
  expect(r.cut).toBe(1);
  expect(Math.abs(r.full - r.next - r.half)).toBeLessThanOrEqual(1);
  const paid = await page.evaluate(async () => { const p = S.players[0], t0 = ST(p).runTot; await passStart(p); return { run: ST(p).runTot - t0, left: p.runCut.length, again: opCost(p) }; });
  expect(paid.run).toBe(r.next);
  expect(paid.left).toBe(0);
  expect(paid.again).toBe(r.full);
});

test('S3 Express One Zone：这一圈 SageMaker AI 过路费 ×1.5、S3 算单 AZ（AZ 断电打得中），过了起点都恢复', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { [IX.sagemaker, IX.s3].forEach(i => { S.props[i].owner = 0; }); });
  const base = await rentTo(page, 'sagemaker');
  expect(await page.evaluate(() => singleAZ(IX.s3))).toBe(false);
  await play(page, NAMES[3]);
  expect(await rentTo(page, 'sagemaker')).toBe(Math.round(base * 1.5));
  expect(await page.evaluate(() => singleAZ(IX.s3))).toBe(true);
  await run(page, () => incident(S.players[0], INC.findIndex(c => c && c.n === '一个 AZ 断电了')));
  await done(page);
  expect(await page.evaluate(() => S.props[IX.s3].impaired)).toBe(true);
  await page.evaluate(() => { S.props[IX.s3].impaired = false; S.props[IX.sagemaker].impaired = false; return passStart(S.players[0]); });
  expect(await page.evaluate(() => singleAZ(IX.s3))).toBe(false);
  expect(await rentTo(page, 'sagemaker')).toBe(base);
});

test('Aurora 缩到 0：下次经过 Startup 扶持时 Aurora 只交存储费；没有 Aurora 领 $50', async ({ page }) => {
  await start(page);
  const c0 = await cash(page), want = await amt(page, 50);
  await play(page, NAMES[4]);
  expect(await cash(page) - c0).toBe(want);
  await page.evaluate(() => { S.props[IX.aurora].owner = 0; S.props[IX.aurora].level = 2; });
  const full = await page.evaluate(() => billAt(S.players[0], 0, ''));
  await play(page, NAMES[4]);
  const r = await page.evaluate(() => ({ next: billAt(S.players[0], 0, ''), run: runCost(IX.aurora), store: OFFLINE_FEE.aurora }));
  expect(full - r.next).toBe(r.run - r.store);
});

test('Application Signals：恢复过路费最高的那块 Impaired 服务，领 1 个可用性类复盘标记；没有 Impaired 的也领', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { [IX.ec2, IX.lambda].forEach(i => { S.props[i].owner = 0; S.props[i].impaired = true; }); });
  const top = await page.evaluate(() => baseRent(IX.ec2, 7) >= baseRent(IX.lambda, 7) ? IX.ec2 : IX.lambda);
  await play(page, NAMES[5]);
  const r = await page.evaluate(top => ({ top: S.props[top].impaired, n: [IX.ec2, IX.lambda].filter(i => S.props[i].impaired).length, coe: S.players[0].coe.map(c => c.cat) }), top);
  expect(r).toEqual({ top: false, n: 1, coe: ['avail'] });
  await page.evaluate(() => { [IX.ec2, IX.lambda].forEach(i => { S.props[i].impaired = false; }); });
  await play(page, NAMES[5]);
  expect(await page.evaluate(() => S.players[0].coe.length)).toBe(2);
});

test('共享 Savings Plans：你和下一位玩家下次经过 Startup 扶持时运行费都打 75 折', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { S.props[IX.ec2].owner = 0; S.props[IX.rds].owner = 1; });
  const f = await page.evaluate(() => [0, 1, 2].map(k => billAt(S.players[k], 0, '')));
  await play(page, NAMES[6]);
  const r = await page.evaluate(() => ({ cut: S.players.map(q => (q.runCut || []).length), bill: [0, 1, 2].map(k => billAt(S.players[k], 0, '')) }));
  expect(r.cut).toEqual([1, 1, 0]);
  expect(Math.abs(r.bill[0] - Math.round(f[0] * 0.75))).toBeLessThanOrEqual(1);
  expect(Math.abs(r.bill[1] - Math.round(f[1] * 0.75))).toBeLessThanOrEqual(1);
});

test('re:Post 回答被采纳：每位其他玩家付你 $20', async ({ page }) => {
  await start(page);
  const want = await amt(page, 20);
  await play(page, NAMES[7]);
  expect(await page.evaluate(() => S.players.map(q => q.cash))).toEqual([3000 + 2 * want, 3000 - want, 3000 - want]);
});

test('合办 User Group：真人选一名对手、两人各领 $100；电脑选现金最少的对手', async ({ page }) => {
  await start(page);
  const want = await amt(page, 100);
  await play(page, NAMES[8], '和谁合办');
  await btn(page, 'C').click(); await done(page);
  expect(await page.evaluate(() => S.players.map(q => q.cash))).toEqual([3000 + want, 3000, 3000 + want]);
  await start(page);
  await page.evaluate(() => { S.cfg.ai = [true, false, false]; S.players[1].cash = 800; });
  await play(page, NAMES[8]);
  expect(await page.evaluate(() => S.players.map(q => q.cash))).toEqual([3000 + want, 800 + want, 3000]);
});

test('MLE – Associate：出一道 AI 题，答对领 $150、答错领 $30（电脑按题库规则自己答）', async ({ page }) => {
  await start(page);
  const [w1, w0] = [await amt(page, 150), await amt(page, 30)];
  await play(page, NAMES[9], 'Machine Learning Engineer – Associate：答对领');
  await page.locator('#modal:not([hidden]) .btns button').first().click(); await finish(page);
  const r = await page.evaluate(() => ({ cash: S.players[0].cash, n: ST(S.players[0]).quizN }));
  expect([3000 + w1, 3000 + w0]).toContain(r.cash);
  expect(r.n).toBe(1);
  await start(page);
  await page.evaluate(() => { S.cfg.ai = [true, false, false]; });
  await play(page, NAMES[9]);
  expect([3000 + w1, 3000 + w0]).toContain(await cash(page));
});

test('Activate 额外 Credits：现金低于 $500 领 $300，否则 $100；电脑直接领钱', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { S.players[0].cash = 400; });
  const w3 = await amt(page, 300), w1 = await amt(page, 100);
  await play(page, NAMES[10], '领钱，还是走一步');
  await btn(page, '领 $').click(); await done(page);
  expect(await cash(page)).toBe(400 + w3);
  await page.evaluate(() => { S.cfg.ai = [true, false, false]; S.players[0].cash = 3000; });
  await play(page, NAMES[10]);
  expect(await cash(page)).toBe(3000 + w1);
});

test('Spot 中断通知（保留卡）：别人出价抢你的 Spot 服务时自动用掉，服务保住，对方照常付过路费', async ({ page }) => {
  await start(page);
  await play(page, NAMES[11]);
  expect(await page.evaluate(() => S.players[0].cards.map(c => c.id))).toEqual(['SPOTN']);
  await page.evaluate(() => { const pr = S.props[IX.ec2]; pr.owner = 0; pr.spot = true; pr.spotPaid = 40; S.lastDice = [3, 4]; });
  await run(page, () => spotTakeover(S.players[1], IX.ec2));
  await expect(modalBox(page)).toBeVisible();
  await page.locator('#modal:not([hidden]) input').first().fill(String(await page.evaluate(() => SQ[IX.ec2].p)));
  await btn(page, '出价抢过来').click(); await done(page);
  const r = await page.evaluate(() => ({ took: window.__r, owner: S.props[IX.ec2].owner, used: S.players[0].cards[0].used, b: S.players[1].cash }));
  expect(r).toEqual({ took: false, owner: 0, used: true, b: 3000 });
  // 卡用掉了，下次照常能抢
  await run(page, () => spotTakeover(S.players[1], IX.ec2));
  await expect(modalBox(page)).toBeVisible();
  await page.locator('#modal:not([hidden]) input').first().fill(String(await page.evaluate(() => SQ[IX.ec2].p)));
  await btn(page, '出价抢过来').click(); await done(page);
  expect(await page.evaluate(() => S.props[IX.ec2].owner)).toBe(1);
});
