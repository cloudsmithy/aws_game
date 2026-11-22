import { test, expect } from '@playwright/test';

// 联机中途加入：开局后新名字带对密码来，房主在弹窗里同意才排到座位最后；起始资金是还活着的各家总资产的平均数（取整到 $10），
// 角色挑没人用的客户角色，站在起点，这一轮不走、下一轮才走；座位上限照旧（没开「多人」是 4 人），局结束了不收；存档读档人还在
test.describe.configure({ timeout: 60_000 });
test.use({ viewport: { width: 1280, height: 860 } });

async function hostGame(page) {
  await page.addInitScript(() => { let s = 20261122; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto('/');
  await page.evaluate(() => {
    newGame({ names: ['房主', '小李', '小王'], diff: 'std', wa: false, timed: false, minutes: 90, learn: false, dlc: [], rs: [] });
    enterGame();
    Object.assign(MP, { role: 'host', room: 'ROOM42', auth: 'secret', seats: {}, viewers: {}, pendingJoins: {}, banned: new Set(), seatMax: 4 });
    S.players[1].cash += 730; S.players[2].cash -= 410;   // 三家总资产不一样，平均数才有意义
    S.round = 3; S.cur = 1; S.phase = 'post';
    window.__conn = name => ({ name, open: true, sent: [], send(m) { this.sent.push(typeof m === 'string' ? JSON.parse(m) : m); }, close() { this.open = false; } });
    window.__join = name => { const c = __conn(name); MP.admit(c, { t: 'hello', name, auth: 'secret' }); return c; };
  });
}
const dialog = page => page.locator('#vmodal');

test('房主拒绝：对方收到拒绝，局里不多人', async ({ page }) => {
  await hostGame(page);
  await page.evaluate(() => { window.__c = __join('小张'); });
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page)).toContainText('小张 想中途加入，同意吗？');
  expect(await page.evaluate(() => __c.sent.map(m => m.t))).toEqual(['pending']);
  await dialog(page).getByRole('button', { name: '拒绝' }).click();
  const r = await page.evaluate(() => ({ sent: __c.sent.map(m => m.t), why: __c.sent.at(-1).why, n: S.players.length, pend: Object.keys(MP.pendingJoins).length, seat: __c._seat }));
  expect(r).toMatchObject({ sent: ['pending', 'reject'], n: 3, pend: 0 });
  expect(r.why).toContain('房主没有同意');
  expect(r.seat).toBeUndefined();
});

test('房主同意：排在最后，平均总资产当起始资金，没人用的角色，从下一轮开始走；之后座位满了不收；存档读档人还在', async ({ page }) => {
  await hostGame(page);
  const before = await page.evaluate(() => ({ avg: Math.round(S.players.reduce((a, q) => a + netWorth(q), 0) / 3 / 10) * 10, roles: S.players.map(q => q.role), log: S.log.length }));
  await page.evaluate(() => { window.__c = __join('小<张>'); });
  await dialog(page).getByRole('button', { name: '同意' }).click();
  await expect(dialog(page)).toBeHidden();
  const p = await page.evaluate(() => ({ n: S.players.length, p: S.players[3], welcome: __c.sent.find(m => m.t === 'welcome'), state: __c.sent.some(m => m.t === 'state'),
    seat: MP.seats[3] && { name: MP.seats[3].name, online: MP.seats[3].online, key: MP.seats[3].key }, mpSeats: S.mpSeats, cust: ROLES.filter(r => !r.rs).map(r => r.id),
    log: S.log[0], st: ST(S.players[3]), color: S.players[3].color === COLORS[3] }));
  expect(p.color).toBe(true);
  expect(p.n).toBe(4);
  expect(p.p).toMatchObject({ id: 3, name: '小&lt;张&gt;', cash: before.avg, startCash: before.avg, pos: 0, alive: true, reseller: false, joinRound: 4, cards: [], hand: [], debt: [], techDebt: 0 });
  expect(await page.evaluate(() => Object.values(S.props).some(pr => pr && pr.owner === 3))).toBe(false);
  expect(before.roles).not.toContain(p.p.role);
  expect(p.cust).toContain(p.p.role);
  expect(p.welcome).toMatchObject({ seat: 3, room: 'ROOM42' });
  expect(p.welcome.key).toBe(p.seat.key);
  expect(p.seat).toMatchObject({ name: '小<张>', online: true });
  expect(p.state).toBe(true);
  expect(p.mpSeats).toContain(3);
  expect(p.log).toContain('中途加入，起始资金 $' + before.avg + '，从第 4 轮开始');
  expect(p.st.low).toMatchObject({ cash: before.avg, r: 4 });
  expect(p.st.gain).toBeTruthy();

  // 这一轮（第 3 轮）不轮到他：1 号位之后是 2 号位，再转回 0 号进第 4 轮；第 4 轮 2 号位之后才轮到他
  const order = await page.evaluate(async () => { const o = []; for (let k = 0; k < 5; k++) { S.phase = 'post'; await nextTurn(); o.push([S.round, S.cur]); } return o; });
  expect(order).toEqual([[3, 2], [4, 0], [4, 1], [4, 2], [4, 3]]);

  // 座位满了（没开「多人」，4 人）：直接拒绝，不弹窗
  const full = await page.evaluate(() => { const c = __join('小赵'); return { sent: c.sent.map(m => m.t), why: c.sent.at(-1).why, n: S.players.length }; });
  expect(full).toMatchObject({ sent: ['reject'], n: 4 });
  expect(full.why).toContain('房间满了');
  await expect(dialog(page)).toBeHidden();

  // 存档、读档：中途加入的人连同 joinRound、战报记录都在
  const sv = await page.evaluate(() => { save(); const s = JSON.parse(localStorage.getItem(KEY)); return { n: s.players.length, p: s.players[3], mp: s.mpSeats }; });
  expect(sv.n).toBe(4);
  expect(sv.p).toMatchObject({ name: '小&lt;张&gt;', joinRound: 4 });
  expect(sv.mp).toContain(3);
  await page.evaluate(() => { MP.role = null; MP.seats = {}; __set_S(null); resumeGame(); });
  await page.getByRole('button', { name: '不联机，在这台上继续' }).click();
  const back = await page.evaluate(() => ({ n: S.players.length, p: S.players[3], st: !!(S.pst && S.pst[3] && S.pst[3].low) }));
  expect(back.n).toBe(4);
  expect(back.p).toMatchObject({ id: 3, name: '小&lt;张&gt;', joinRound: 4, pos: 0 });
  expect(back.st).toBe(true);
});

test('局结束了、最后一轮了都不收；开了「多人」能超过 4 人', async ({ page }) => {
  await hostGame(page);
  const r = await page.evaluate(() => {
    const t = c => ({ sent: c.sent.map(m => m.t).join(), why: (c.sent.at(-1) || {}).why || '' });
    S.cfg.roundLimit = 3; const last = t(__join('小周'));
    S.cfg.roundLimit = 0; S.over = true; const over = t(__join('小吴'));
    S.over = false; const dup = t(__join('小王'));
    return { last, over, dup, n: S.players.length, pend: Object.keys(MP.pendingJoins).length };
  });
  expect(r.last.sent).toBe('reject'); expect(r.last.why).toContain('最后一轮');
  expect(r.over.sent).toBe('reject'); expect(r.over.why).toContain('已经结束');
  expect(r.dup.sent).toBe('reject'); expect(r.dup.why).toContain('已经有人叫 小王');
  expect(r).toMatchObject({ n: 3, pend: 0 });
  // 4 人满了以后开「多人」（seatMax = MAX_PLAYERS）还能再进
  await page.evaluate(() => { window.__c = __join('小郑'); });
  await dialog(page).getByRole('button', { name: '同意' }).click();
  const r2 = await page.evaluate(() => { MP.seatMax = MAX_PLAYERS; window.__c = __join('小钱'); return S.players.length; });
  expect(r2).toBe(4);
  await dialog(page).getByRole('button', { name: '同意' }).click();
  expect(await page.evaluate(() => [S.players.length, S.players[4].joinRound, S.players.map(q => q.role).length === new Set(S.players.map(q => q.role)).size])).toEqual([5, 4, true]);
});
