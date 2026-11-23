import { test, expect } from '@playwright/test';

// 电脑玩家：弹窗怎么选（aiDecide）、掷骰子前的事（aiPreRoll，游戏和模拟共用）
test.describe.configure({ timeout: 60_000 });

async function start(page) {
  await page.addInitScript(() => { let s = 20261123; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto('/');
  await page.evaluate(() => {
    newGame({ names: ['A', 'B', 'C'], diff: 'full', wa: true, timed: false, minutes: 90, learn: false, dlc: [] });
    enterGame();
    OWNABLE.forEach(i => { S.props[i] = { owner: null, level: 0, cap: 0, spot: false, spotPaid: 0, impaired: false, offline: 0, offCash: 0 }; });
    S.players.forEach(q => { q.role = 'saas'; q.cash = 3000; q.cards = []; q.coe = []; q.drill = []; q.pos = 5; q.techDebt = 0; q.skip = 0; q.jail = null; });
    S.cur = 0; S.phase = 'roll';
  });
}
// 只看数据调 aiDecide：返回选中按钮的 value
const decide = (page, title, buttons, cash) => page.evaluate(([title, buttons, cash]) => { S.players[0].cash = cash; return aiDecide({ title, text: title, quiz: false, inputs: {} }, [], buttons, 0).v; }, [title, buttons, cash]);

test('别人下线的服务：付完还剩安全线才拉起来，不然不管它', async ({ page }) => {
  await start(page);
  const b = [{ label: '付 $300 拉起来归我', value: 'take', cls: 'pri' }, { label: '不管它', value: 'no' }];
  expect(await decide(page, 'EC2 已经被 B 下线了', b, 1000)).toBe('take');
  expect(await decide(page, 'EC2 已经被 B 下线了', b, 500)).toBe('no');
  expect(await decide(page, 'EC2 已经被 B 下线了', [{ ...b[0], disabled: true }, b[1]], 200)).toBe('no');
});

test('借用 Session Manager：付完还剩安全线才借', async ({ page }) => {
  await start(page);
  const b = [{ label: '付 $50 借用', value: true, cls: 'pri' }, { label: '不借', value: false }];
  expect(await decide(page, '借用 Session Manager？', b, 1000)).toBe(true);
  expect(await decide(page, '借用 Session Manager？', b, 280)).toBe(false);
});

test('User Group 活动：二选一按奖池挑；抽了 3 张 re:Invent 卡的三选一不按奖池', async ({ page }) => {
  await start(page);
  const two = [{ label: '抽奖 $100～$400', value: 'pot', cls: 'pri' }, { label: '抽三张 re:Invent 卡选一张', value: 'rei' }];
  await page.evaluate(() => { S.pot = 400; });
  expect(await decide(page, 'A 参加 User Group 活动', two, 1000)).toBe('pot');
  await page.evaluate(() => { S.pot = 50; });
  expect(await decide(page, 'A 参加 User Group 活动', two, 1000)).toBe('rei');
  // 三选一：随机挑，不是固定的第一张 / 最后一张
  const three = [3, 7, 9].map(x => ({ label: `#${x}「卡」：效果`, value: x }));
  const seen = new Set();
  for (const pot of [0, 50, 400, 400, 0, 50, 400, 0, 50, 400, 0, 50]) { await page.evaluate(p => { S.pot = p; }, pot); seen.add(await decide(page, 'A 在 User Group 活动抽了 3 张 re:Invent 卡，选一张', three, 1000)); }
  expect(seen.size).toBeGreaterThan(1);
});

test('要抵消 Health 卡：先用免费的卡和标记，再用 4 点、7 点部署点数', async ({ page }) => {
  await start(page);
  const no = { label: '不抵消，接受惩罚', value: 'no' };
  expect(await decide(page, '要抵消「X」吗？', [{ label: '花 4 点部署点数：故障转移扛住', value: 'sp4' }, { label: '花 7 点部署点数：蓝绿部署抵消', value: 'sp7' }, no], 1000)).toBe('sp4');
  expect(await decide(page, '要抵消「X」吗？', [{ label: '花 7 点部署点数：蓝绿部署抵消', value: 'sp7' }, no], 1000)).toBe('sp7');
  expect(await decide(page, '要抵消「X」吗？', [{ label: '用 Cost Explorer 抵消', value: 'ce' }, { label: '花 7 点部署点数：蓝绿部署抵消', value: 'sp7' }, no], 1000)).toBe('ce');
  expect(await decide(page, '要抵消「X」吗？', [{ label: '请 B 托管', value: 'h1' }, no], 1000)).toBe('no');
});

test('电脑的回合：没有技能可发动也会先绑万能服务再掷骰子', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(() => {
    const p = S.players[0]; p.skillUsed = true;
    const c = COMBOS.find(c => comboOpen(c) && wildFits(IX.cloudwatch, c) && c.ix.length >= 2);
    c.ix.slice(1).forEach(n => { S.props[Array.isArray(n) ? n[0] : n].owner = 0; });
    S.props[IX.cloudwatch].owner = 0;
    S.cfg.ai = [true, false, false]; S.turnStartAt = 0; render(); aiKick();
    return { c: c.id, skill: canSkill(p) };
  });
  expect(r.skill).toBe(false);
  await expect.poll(() => page.evaluate(() => S.props[IX.cloudwatch].wild && S.props[IX.cloudwatch].wild.c), { timeout: 10_000 }).toBe(r.c);
});

test('电脑掷骰子前就破产：换到下一位，不卡住', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const p = S.players[0]; p.cash = 0; pay(p, 'bank', 99999);
    S.cfg.ai = [true, false, false]; S.turnStartAt = 0; render(); aiKick();
  });
  await expect.poll(() => page.evaluate(() => ({ cur: S.cur, alive: S.players[0].alive, phase: S.phase })), { timeout: 15_000 }).toEqual({ cur: 1, alive: false, phase: 'roll' });
});
