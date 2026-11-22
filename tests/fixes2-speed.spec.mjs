import { test, expect } from '@playwright/test';

// 高速部署：一圈之内只能用一次技能（所有技能合计，掷骰子、被打中时自动问的也算）；经过起点（p.laps 加一）以后才能再用
test.describe.configure({ timeout: 60_000 });

async function start(page) {
  await page.addInitScript(() => { let s = 20261122; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto('/');
  await page.evaluate(() => {
    newGame({ names: ['A', 'B', 'C'], diff: 'full', wa: true, timed: false, minutes: 90, learn: false, dlc: ['speed'] });
    enterGame();
    OWNABLE.forEach(i => { S.props[i].owner = null; S.props[i].level = 0; });
    S.players.forEach(q => { q.role = 'saas'; q.cash = 3000; q.cards = []; q.pos = 0; q.speed = 12; q.laps = 0; });
    S.cur = 0; S.phase = 'roll';
  });
}
// 技能菜单里各点数的格子能不能点
const tiles = page => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#modal:not([hidden]) .sk')].map(b => [b.querySelector('.skc').textContent, !b.disabled])));
const openMenu = async page => { await page.evaluate(() => { window.__m = speedMenu(); }); await expect(page.locator('#modal:not([hidden]) .sk').first()).toBeVisible(); };
const closeMenu = page => page.locator('#modal:not([hidden]) .btns button', { hasText: '关闭' }).click();

test('一圈只能用一次技能：用过一个，所有主动技能都灰了；经过起点后恢复', async ({ page }) => {
  await start(page);
  await openMenu(page);
  const before = await tiles(page);   // 有的技能本来就有条件（升级要有服务、修复要有坏的），以「用之前能点的那些」为准
  expect(Object.values(before).some(Boolean)).toBe(true);
  await closeMenu(page);
  await page.evaluate(() => { speedSpend(S.players[0], 10, '测试'); S.players[0].speed = 12; });   // 点数补满：只看「一圈一次」这条
  await openMenu(page);
  const used = await tiles(page);
  expect(Object.entries(used).filter(([, on]) => on)).toEqual([]);   // 一个都不能点
  expect(await page.locator('#modal:not([hidden])').innerText()).toContain('这一圈已经用过技能了');
  await closeMenu(page);
  await page.evaluate(() => { S.players[0].laps = 1; });   // 走完一圈
  await openMenu(page);
  expect(await tiles(page)).toEqual(before);
});

test('被动技能也算：这一圈用过任何技能，被事件打中时不再问故障转移、蓝绿部署；过了起点又能用', async ({ page }) => {
  await start(page);
  const opts = () => page.evaluate(() => cancelOpts(S.players[0], 1).b.map(x => x.value));
  expect(await opts()).toContain('sp7');
  await page.evaluate(() => { speedSpend(S.players[0], 8, '测试'); S.players[0].speed = 12; });   // 用的是别的技能；点数补满
  expect(await opts()).not.toContain('sp7');
  await page.evaluate(() => { S.players[0].laps = 1; });
  expect(await opts()).toContain('sp7');
});

test('掷完骰子：这一圈用过技能，就不再问灰度发布和回滚重发', async ({ page }) => {
  await start(page);
  const ask = () => page.evaluate(async () => {
    const p = S.players[0]; let seen = null;
    const ask0 = UI.ask; UI.ask = async spec => { seen = spec.buttons.map(b => b.label); return 'go'; };
    try { await speedRoll(p, [3, 4]); } finally { UI.ask = ask0; }
    return seen;
  });
  const fresh = await ask();
  expect(fresh.some(l => l.includes('灰度发布'))).toBe(true);
  await page.evaluate(() => { speedSpend(S.players[0], 9, '测试'); S.players[0].speed = 12; });
  expect(await ask()).toBe(null);   // 直接照走，不开窗
});
