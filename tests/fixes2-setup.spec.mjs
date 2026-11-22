import { test, expect } from '@playwright/test';

// 开局、读档、退出这一批修复的回归测试：直接在页面里调真实的游戏函数（newGame、resumeGame、quitGame…），看状态和网址
test.describe.configure({ timeout: 60_000 });

const CFG = { names: ['A', 'B', 'C'], diff: 'full', wa: true, timed: false, minutes: 90, learn: false };
async function start(page, cfg = {}, url = '/') {
  await page.goto(url);
  await page.evaluate(cfg => { newGame(cfg); enterGame(); S.cur = 0; S.phase = 'roll'; }, { ...CFG, ...cfg });
}
const btn = (page, text) => page.locator('#modal:not([hidden]) .btns button', { hasText: text });

test('卡牌倍率「每轮随机」：开局第 1 轮就掷好倍率并写进日志', async ({ page }) => {
  await start(page, { cardMul: 'rand' });
  const r = await page.evaluate(() => ({ mul: S.roundMul, log: S.log.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join('\n') }));
  expect([0.5, 1, 1.5, 2]).toContain(r.mul);
  expect(r.log).toContain('第 1 轮卡牌倍率');
});

test('独角兽开局送的 Route 53 实付是 $0（开局分配和三选一挑角色后都是），Trusted Advisor 不会按标价退钱', async ({ page }) => {
  await page.goto('/');
  const r = await page.evaluate(cfg => {
    let viaNew = null, viaDraft = null;
    for (let t = 0; t < 200 && (viaNew == null || viaDraft == null); t++) {
      newGame({ ...cfg, names: ['A', 'B', 'C', 'D'] });
      const u = S.players.find(q => q.role === 'unicorn');
      if (u && viaNew == null) viaNew = { owner: S.props[IX.route53].owner === u.id, paid: buyPaid(IX.route53) };
      if (viaDraft == null) {
        // 三选一挑角色：换完角色重算（rolesRecalc），独角兽的 Route 53 跟着人走
        S.players.forEach(q => { q.role = 'saas'; }); S.players[1].role = 'unicorn';
        rolesRecalc();
        viaDraft = { owner: S.props[IX.route53].owner === 1, paid: buyPaid(IX.route53) };
      }
    }
    return { viaNew, viaDraft };
  }, CFG);
  expect(r.viaNew).toEqual({ owner: true, paid: 0 });
  expect(r.viaDraft).toEqual({ owner: true, paid: 0 });
});

test('回开局页（toHome、退出这局、别处接着打了、离开房间）都保留自建信令服务器的网址参数', async ({ page }) => {
  const url = '/?peerhost=127.0.0.1&peerport=9&peerpath=%2Fsig';
  const ways = [
    ['toHome', async () => page.evaluate(() => { ACTS.toHome(); })],
    ['quitGame', async () => { page.evaluate(() => { quitGame(); }); await btn(page, '退出').click(); }],
    ['staleTab', async () => { page.evaluate(() => { staleTab(); }); await btn(page, '回开局页').click(); }],
    ['MP.leave', async () => { page.evaluate(() => { MP.leave(); }); await btn(page, '离开').click(); }],
  ];
  for (const [name, go] of ways) {
    await start(page, {}, url);
    const nav = page.waitForNavigation();
    await go(); await nav;
    const q = new URL(page.url()).searchParams;
    expect([name, q.get('peerhost'), q.get('peerport'), q.get('peerpath')]).toEqual([name, '127.0.0.1', '9', '/sig']);
  }
});

test('远端玩家点「退出到开局页」：不说「已经自动保存」，改走「离开房间」', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { MP.role = 'client'; MP.mySeat = 1; quitGame(); });
  await expect(page.locator('#modal:not([hidden]) .box')).toBeVisible();
  const txt = await page.locator('#modal:not([hidden]) .box').innerText();
  expect(txt).not.toContain('已经自动保存');
  expect(txt).toContain('离开房间');
});

test('上一局暂停了电脑：开新局（联机「再来一局」不刷新页面）不再暂停', async ({ page }) => {
  await start(page);
  await page.evaluate(() => toggleAiPause());
  expect(await page.evaluate(() => aiPaused())).toBe(true);
  const r = await page.evaluate(cfg => { newGame(cfg); return aiPaused(); }, CFG);
  expect(r).toBe(false);
});

test('继续上一局：回合开始时间从读档这一刻算，不沿用存档里很久以前的时刻', async ({ page }) => {
  await start(page);
  const age = await page.evaluate(() => {
    S.turnStartAt = Date.now() - 10 * 60000; localStorage.setItem(KEY, JSON.stringify(S)); __set_S(null);
    return resumeGame().then(() => Date.now() - S.turnStartAt);
  });
  expect(age).toBeGreaterThanOrEqual(0);
  expect(age).toBeLessThan(10_000);
});

test('开局页限时分钟数夹到 600（和输入框的 max 一致）', async ({ page }) => {
  await page.goto('/');
  const r = await page.evaluate(() => { $('#minutes').value = '99999'; $('#winTimed').checked = true; setupSum(); return { min: setupMin(), sum: $('#setupSum').textContent }; });
  expect(r.min).toBe(600);
  expect(r.sum).toContain('600 分钟');
});

test('地狱模式锁住的 DLC 格子：切换语言重画后还显示锁', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => { const r = document.querySelector('input[name=diff][value=hell]'); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); return [...document.querySelectorAll('#dlcTiles input:disabled')].map(x => [x.value, x.parentElement.classList.contains('lock')]); });
  expect(before.length).toBeGreaterThan(0);
  expect(before.every(x => x[1])).toBe(true);
  const after = await page.evaluate(() => { switchLang('en'); return [...document.querySelectorAll('#dlcTiles input:disabled')].map(x => [x.value, x.parentElement.classList.contains('lock')]); });
  expect(after).toEqual(before);
});
