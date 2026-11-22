import { test, expect } from '@playwright/test';

// 改名字：玩家卡名字旁边的 ✎（这台设备能改的真人才有），大厅里远端玩家改自己的名字（房主查重、改座位表）
test.describe.configure({ timeout: 60_000 });

test('玩家卡上的 ✎：真人座位有、电脑没有；点了直接改这一位', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    newGame({ names: ['A', 'B', 'C'], ai: [false, false, true], diff: 'std', wa: false, timed: false, minutes: 90, learn: false, dlc: [] });
    enterGame(); render();
  });
  const pens = await page.evaluate(() => [...document.querySelectorAll('#side .pren')].map(b => +b.dataset.arg));
  expect(pens).toEqual([0, 1]);
  await page.locator('#side .pren[data-arg="1"]').click();
  const box = page.locator('#modal:not([hidden]) .box');
  await expect(box).toContainText('给 B 改名字');
  await box.locator('input').fill('小王');
  await box.locator('.btns button', { hasText: '改好了' }).click();
  await expect.poll(() => page.evaluate(() => S.players[1].name)).toBe('小王');
});

test('大厅改名：去空格、不能空、不能和别的座位或房主重名、被移出过的名字不能用；改好刷新座位表', async ({ page }) => {
  await page.goto('/');
  const r = await page.evaluate(() => {
    const nm0 = document.querySelector('#nm0'); if (nm0) nm0.value = '房主';
    if (!document.querySelector('#mpstat')) document.body.insertAdjacentHTML('beforeend', '<div id="mpstat"></div>');   // 联机面板没展开时没有这一块
    Object.assign(MP, { role: 'host', room: 'ROOM42', seats: { 1: { name: 'B', online: true }, 2: { name: 'C', online: true } }, viewers: {}, banned: new Set(['坏人']) });
    const out = [MP.lobbyRename(1, 'C'), MP.lobbyRename(1, '房主'), MP.lobbyRename(1, '   '), MP.lobbyRename(1, '坏人'), MP.lobbyRename(5, 'X'), MP.lobbyRename(1, '  小  李  ')];
    return { out: out.map(x => !!x), name: MP.seats[1].name, lobby: document.querySelector('#mpstat').textContent.includes('小 李') };
  });
  expect(r).toEqual({ out: [true, true, true, true, true, false], name: '小 李', lobby: true });
});

test('远端收到 renamed：记下新名字（掉线重连按新名字认座位）', async ({ page }) => {
  await page.goto('/');
  const r = await page.evaluate(() => { Object.assign(MP, { role: 'client', room: 'ROOM42', myName: 'B' }); MP.onClientMsg({ t: 'renamed', name: '小李' }); return [MP.myName, JSON.parse(sessionStorage.getItem('aws-tycoon-lastjoin')).name]; });
  expect(r).toEqual(['小李', '小李']);
});
