import { test, expect } from '@playwright/test';

// 第四轮复查修的问题：下线中转手、✎ 不顺带折叠、牌堆抽空不收买卡钱、中途加入的起始资金和「还没开始走」
test.describe.configure({ timeout: 60_000 });
async function start(page, cfg = {}) {
  await page.addInitScript(() => { let s = 20261123; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto('/');
  await page.evaluate(cfg => {
    newGame({ names: ['A', 'B', 'C'], diff: 'full', wa: true, timed: false, minutes: 90, learn: false, dlc: [], ...cfg });
    enterGame(); S.cur = 0; S.phase = 'roll';
  }, cfg);
}

test('下线中的服务交易给别人：那一半跟着走，新主人卖回照扣、不能再下线拿钱', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(() => {
    const i = IX.redshift, a = S.players[0], b = S.players[1];
    OWNABLE.forEach(k => { S.props[k].owner = null; });
    S.props[i].owner = 0; S.props[i].level = 0; S.props[i].cap = 0; S.props[i].paid = SQ[i].p;
    takeOffline(a, i); const half = S.props[i].offCash;
    handOver(a, i, b.id);
    return { half, drawn: S.props[i].offDrawn, sell: sellValue(i), full: Math.round(SQ[i].p * 0.8) };
  });
  expect(r.drawn).toBe(r.half);
  expect(r.sell).toBe(r.full - r.half);
});

test('玩家卡上点 ✎ 只打开改名，不顺带收起 / 展开这张卡', async ({ page }) => {
  await start(page, { names: ['A', 'B', 'C', 'D'] });
  await page.evaluate(() => render());
  const before = await page.locator('#side .pl').nth(1).getAttribute('class');
  await page.locator('#side .pren[data-arg="1"]').click();
  await expect(page.locator('#modal:not([hidden]) .box')).toContainText('改名字');
  expect(await page.locator('#side .pl').nth(1).getAttribute('class')).toBe(before);
});

test('re:Invent 牌堆和弃牌堆都空了：买卡不收钱，按钮也不出现', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(async () => {
    const p = S.players[0]; S.rei = []; S.reiDisc = []; S.phase = 'busy'; const c = p.cash;
    await buyReinvent(); return { paid: c - p.cash, bought: !!S.reiBought };
  });
  expect(r).toEqual({ paid: 0, bought: false });
});

test('中途加入：代理商局按客户平均资产算起始资金；排到下一轮前不会被发卡、全场事件指到', async ({ page }) => {
  await start(page, { names: ['A', 'B', 'C'], rs: [false, false, true], dlc: ['reseller'] });
  const r = await page.evaluate(() => {
    const cust = S.players.filter(q => !q.reseller && q.alive), avg = Math.round(cust.reduce((a, q) => a + netWorth(q), 0) / cust.length / 10) * 10;
    const j = joinPlayer('新人');
    return { cash: j.cash, avg, foe: chFoes(S.players[0]).some(o => o.id === j.id), inPlay: inPlay(j), later: (S.round++, inPlay(j)) };
  });
  expect(r.cash).toBe(r.avg);
  expect(r.foe).toBe(false);
  expect(r.inPlay).toBe(false);
  expect(r.later).toBe(true);
});
