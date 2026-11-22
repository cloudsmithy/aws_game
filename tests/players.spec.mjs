import { test, expect } from '@playwright/test';

// 人数：默认 2–4 人；开局页「多人（超过 4 人）」打开后能选到 MAX_PLAYERS 人（不推荐）。多人局能开局、画得下，联机房主能收 3 位以上远端玩家
test.describe.configure({ timeout: 60_000 });
test.use({ viewport: { width: 1280, height: 860 } });

const npValues = page => page.locator('input[name=np]').evaluateAll(xs => xs.map(x => +x.value));

async function seeded(page) {
  // 固定随机数：角色分配每次都一样
  await page.addInitScript(() => { let s = 20261122; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto('/');
}

test('默认只有 2–4 人，「多人」开关关着、旁边写着不推荐', async ({ page }) => {
  await seeded(page);
  expect(await npValues(page)).toEqual([2, 3, 4]);
  await expect(page.locator('#npMany')).not.toBeChecked();
  await expect(page.locator('#npMore .npwarn')).toBeVisible();
  await expect(page.locator('#npMore .npwarn')).toContainText('不推荐');
  await expect(page.locator('#npMore')).toContainText('多人（超过 4 人）');
  expect(await page.evaluate(() => [npVal(), npMax(), MAX_PLAYERS])).toEqual([3, 4, 12]);
  await expect(page.locator('#names .nrow')).toHaveCount(3);
});

test('打开「多人」多出 5–12 人，选 8 人有 8 个座位；关掉退回 4 人', async ({ page }) => {
  await seeded(page);
  await page.locator('#npMany').check({ force: true });
  expect(await npValues(page)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  expect(await page.evaluate(() => npMax())).toBe(12);
  await page.locator('input[name=np][value="8"]').check({ force: true });
  await expect(page.locator('#names .nrow')).toHaveCount(8);
  await expect(page.locator('#setupSum')).toContainText('8 人');
  await expect(page.locator('#setupSum')).toContainText('不推荐');
  // 每个座位颜色不同，5 号以后的棋子也有号码
  const pawns = await page.locator('#names .nrow .pawn').evaluateAll(xs => xs.map(x => [x.textContent, x.style.getPropertyValue('--pc')]));
  expect(pawns.map(x => x[0])).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
  expect(new Set(pawns.map(x => x[1])).size).toBe(8);
  // 代理商不超过一半：8 人局最多 4 个
  await page.evaluate(() => { const t = document.querySelector('#dlcTiles input[value=reseller]'); t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); });
  for (let k = 0; k < 6; k++) await page.evaluate(k => { const x = document.querySelector('#rs' + k); if (!x.disabled) { x.checked = true; setupSum(); } }, k);
  expect(await page.locator('#names input[id^=rs]:checked').count()).toBe(4);
  await page.locator('#npMany').uncheck({ force: true });
  expect(await npValues(page)).toEqual([2, 3, 4]);
  expect(await page.evaluate(() => npVal())).toBe(4);
  await expect(page.locator('#names .nrow')).toHaveCount(4);
});

for (const n of [6, 8]) {
  test(`${n} 人局从开局页开始：角色、颜色、起点上的棋子都在，侧栏不超出窗口`, async ({ page }) => {
    await seeded(page);
    await page.locator('#npMany').check({ force: true });
    await page.locator(`input[name=np][value="${n}"]`).check({ force: true });
    await page.evaluate(() => startFromSetup(true));
    await expect(page.locator('#modal .rcards .rcard')).toHaveCount(n);
    await page.locator('#modal .btns button.pri').click();
    await expect(page.locator('#modal')).toBeHidden();
    const r = await page.evaluate(() => ({
      n: S.players.length, colors: new Set(S.players.map(p => p.color)).size, roles: new Set(S.players.map(p => p.role)).size,
      bonus: S.players.map(p => p.seatBonus), cards: document.querySelectorAll('#side .plist .pl').length, turn: document.querySelectorAll('#center .turnbar .tb').length,
    }));
    expect(r).toMatchObject({ n, colors: n, roles: n, cards: n, turn: n });
    expect(r.bonus).toEqual(Array.from({ length: n }, (_, k) => 50 * k));
    // 侧栏在窗口里，页面本身不出滚动条；玩家列表自己滚
    const lay = await page.evaluate(() => { const s = document.querySelector('#side').getBoundingClientRect(), pl = document.querySelector('#side .plist'); return { bottom: s.bottom, right: s.right, docH: document.documentElement.scrollHeight, docW: document.documentElement.scrollWidth, scrolls: pl.scrollHeight > pl.clientHeight, oy: getComputedStyle(pl).overflowY }; });
    expect(lay.bottom).toBeLessThanOrEqual(860);
    expect(lay.right).toBeLessThanOrEqual(1280);
    expect(lay.docH).toBeLessThanOrEqual(860);
    expect(lay.docW).toBeLessThanOrEqual(1280);
    expect(lay.oy).toBe('auto');
    // 起点上 n 颗棋子都看得见、都在起点格里面
    const toks = await page.evaluate(() => { const cell = document.querySelector('#sq0').getBoundingClientRect(); return [...document.querySelectorAll('#sq0 .toks .pawn')].map(e => { const b = e.getBoundingClientRect(); return { w: b.width, in: b.left >= cell.left - 1 && b.right <= cell.right + 1 && b.top >= cell.top - 1 && b.bottom <= cell.bottom + 1, vis: getComputedStyle(e).visibility }; }); });
    expect(toks).toHaveLength(n);
    for (const t of toks) { expect(t.in).toBe(true); expect(t.vis).toBe('visible'); expect(t.w).toBeGreaterThan(6); }
    // 最后一位的回合也能画：换到他、重画不报错，他的卡滚得到
    await page.evaluate(n => { S.cur = n - 1; render(); }, n);
    await expect(page.locator('#side .pl.cur')).toBeInViewport();
  });
}

test('联机大厅：开了「多人」能列出 3 位以上远端玩家，没开时第 4 位远端被拒', async ({ page }) => {
  await seeded(page);
  const r = await page.evaluate(async () => {
    mpUI('host');
    Object.assign(MP, { role: 'host', room: 'ROOM42', auth: 'secret', seats: {}, viewers: {}, banned: new Set() });
    const conn = name => ({ name, open: true, sent: [], send(m) { this.sent.push(m); }, close() { this.open = false; } });
    const join = async name => { const c = conn(name); await MP.admit(c, { t: 'hello', name, auth: 'secret' }); return c; };
    const off = [];
    for (const nm of ['R1', 'R2', 'R3', 'R4']) off.push(await join(nm));
    const offRes = off.map(c => c.sent.map(m => m.t === 'welcome' ? 'w' + m.seat : m.t).join());
    MP.seats = {};
    document.querySelector('#npMany').checked = true; renderNames();
    const on = [];
    for (const nm of ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']) on.push(await join(nm));
    const onRes = on.map(c => c.sent.map(m => m.t === 'welcome' ? 'w' + m.seat : m.t).join());
    // 「多人」关不掉：已经坐了 4 位以上远端玩家
    document.querySelector('#npMany').checked = false; renderNames();
    const li = [...document.querySelectorAll('#mpstat .mpseats li')].map(x => x.textContent);
    const res = { offRes, onRes, np: npVal(), many: document.querySelector('#npMany').checked, li: li.length, s6: li[6] || '', names: [...document.querySelectorAll('#names input[id^=nm]')].map(x => x.value) };
    MP.role = null; MP.seats = {};
    return res;
  });
  expect(r.offRes).toEqual(['w1', 'w2', 'w3', 'reject']);
  expect(r.onRes).toEqual(['w1', 'w2', 'w3', 'w4', 'w5', 'w6']);
  expect(r.np).toBe(7);
  expect(r.many).toBe(true);
  expect(r.li).toBe(7);
  expect(r.s6).toContain('S6');
  expect(r.names.slice(1)).toEqual(['S1', 'S2', 'S3', 'S4', 'S5', 'S6']);
});

test('多人局角色：12 人局客户角色各不相同；6 个代理商座位把 3 张代理商角色各发两遍', async ({ page }) => {
  await seeded(page);
  const r = await page.evaluate(() => {
    const go = (n, rs) => { newGame({ names: Array.from({ length: n }, (_, k) => 'P' + k), diff: 'std', wa: false, timed: false, minutes: 90, learn: false, dlc: rs ? ['reseller'] : [], rs: rs ? Array.from({ length: n }, (_, k) => k < rs) : [] }); return S.players.map(p => p.role); };
    const twelve = go(12), rs6 = go(12, 6);
    return { twelve: new Set(twelve).size, rsRoles: rs6.slice(0, 6), cust: new Set(rs6.slice(6)).size };
  });
  expect(r.twelve).toBe(12);
  expect(r.cust).toBe(6);
  // 6 个代理商座位：3 张代理商角色各发两遍
  expect(new Set(r.rsRoles).size).toBe(3);
  expect(r.rsRoles.every(x => x.startsWith('rs_'))).toBe(true);
});
