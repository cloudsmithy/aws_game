import { test, expect } from '@playwright/test';

// 11-22 规则：技术债不管怎么清掉的，马上进维护窗口停一轮，名下所有服务一起下线一轮；不能提前出来，出来不写复盘、不记技术债
test.describe.configure({ timeout: 60_000 });

async function start(page) {
  await page.addInitScript(() => { let s = 20261122; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto('/');
  await page.evaluate(() => {
    newGame({ names: ['A', 'B', 'C'], diff: 'full', wa: true, timed: false, minutes: 90, learn: false, dlc: [] });
    enterGame();
    OWNABLE.forEach(i => { S.props[i].owner = null; S.props[i].level = 0; S.props[i].impaired = false; });
    S.players.forEach(q => { q.role = 'saas'; q.cash = 3000; q.pos = 5; q.techDebt = 0; q.skip = 0; q.jail = null; });
    [IX.ec2, IX.s3, IX.lambda].forEach(i => { S.props[i].owner = 0; });
    S.cur = 0; S.phase = 'roll';
  });
}

test('花钱重构：清掉 1 个技术债，进维护窗口，名下服务全部下线一轮', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(() => {
    const p = S.players[0]; p.techDebt = 2;
    const ok = payRefactor(p);
    return { ok, debt: p.techDebt, jail: p.jail, pos: p.pos === IX.jail, cat: p.jailCat, down: [IX.ec2, IX.s3, IX.lambda].map(i => S.props[i].ddos), act: active(p, IX.ec2), rent: shownRent(IX.ec2).r };
  });
  expect(r).toEqual({ ok: true, debt: 1, jail: 0, pos: true, cat: 'rf', down: [0, 0, 0], act: false, rent: 0 });
});

test('维护窗口：清技术债进来的只能停一轮（付 $50 也不行），出来不写复盘、不加技术债；服务到自己下回合开始恢复', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { const p = S.players[0]; p.techDebt = 1; payRefactor(p); });
  // 别人的回合开始，服务不恢复
  expect(await page.evaluate(() => { downTick(S.players[1]); return S.props[IX.ec2].ddos; })).toBe(0);
  // 轮到自己：回合开始服务恢复；在维护窗口里付 $50 被当成停一轮
  const r = await page.evaluate(async () => {
    const p = S.players[0]; downTick(p); const back = active(p, IX.ec2);
    S.cur = 0; S.phase = 'roll'; S.turnStartAt = 0; const cash = p.cash, coe = p.coe.length;
    await jailAct('pay');
    return { back, jail: p.jail, cash: p.cash - cash, coe: p.coe.length - coe, debt: p.techDebt };
  });
  expect(r).toEqual({ back: true, jail: null, cash: 0, coe: 0, debt: 0 });
});

test('攒满 3 个技术债：大重构交 $300、清掉 3 个，同样进维护窗口、服务下线', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(async () => {
    const p = S.players[0]; p.techDebt = 2; const cash = p.cash;
    await penalize(p);
    return { debt: p.techDebt, paid: cash - p.cash, jail: p.jail, cat: p.jailCat, down: S.props[IX.s3].ddos };
  });
  expect(r).toEqual({ debt: 0, paid: 300, jail: 0, cat: 'rf', down: 0 });
});

test('已经在维护窗口里（被事件送进来）再清技术债：不重进、不改原因，服务照样下线', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(() => {
    const p = S.players[0]; p.techDebt = 1; p.jail = 0; p.jailCat = 'sec'; p.pos = IX.jail;
    payRefactor(p);
    return { jail: p.jail, cat: p.jailCat, down: S.props[IX.lambda].ddos };
  });
  expect(r).toEqual({ jail: 0, cat: 'sec', down: 0 });
});
