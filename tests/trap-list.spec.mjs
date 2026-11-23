import { test, expect } from '@playwright/test';

// 「我埋的卡」：只列自己埋的（同一格别人埋的不列），玩家卡和对局菜单都能打开；别人的座位没有入口
test('我埋的卡：只列自己埋的，玩家卡和对局菜单都能打开；轮到别人时看不到入口', async ({ page }) => {
  await page.goto('/');
  const sq = await page.evaluate(() => { newGame({ names: ['A', 'B'], diff: 'std', wa: false, timed: false, minutes: 90, learn: false, dlc: [] }); enterGame();
    const sq = OWNABLE.filter(i => SQ[i].t === 'prop').slice(2, 4); S.traps = [{ by: 0, sq: sq[0], id: 5, round: 1 }, { by: 0, sq: sq[1], id: 6, round: 2 }, { by: 1, sq: sq[1], id: 7, round: 2 }]; S.cur = 0; render(); return sq; });
  await page.locator('#side .ptrap button[data-act="trapList"]').first().click();
  const box = page.locator('#vmodal:not([hidden]) .box');
  await expect(box).toContainText('A 埋下的 Health 卡（2 张）');
  const names = await page.evaluate(() => [5, 6, 7].map(id => INC[id].n));
  await expect(box).toContainText(names[0]); await expect(box).toContainText(names[1]);
  expect(await box.locator('table tr').count()).toBe(3);
  await box.locator('.btns button', { hasText: '关闭' }).click();
  expect(await page.evaluate(() => !!document.querySelector('.gm button[data-act="trapList"]'))).toBe(true);
  await page.evaluate(() => { S.cur = 1; render(); });
  const args = await page.evaluate(() => [...document.querySelectorAll('[data-act="trapList"]')].map(b => b.dataset.arg));
  expect(args.length > 0 && args.every(a => a === '1')).toBe(true);   // 轮到 B：只看得到 B 自己的入口
});
