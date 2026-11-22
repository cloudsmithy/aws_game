import { test, expect } from '@playwright/test';

// 只给钱的 re:Invent 卡（领 $X）：真人玩家四选一（领钱 / 前进 3 格 / 后退 3 格 / 再掷一次骰子、落地不能买），电脑玩家直接领钱不弹窗。
// 跟 fixes.spec.mjs 一样：在页面里摆好局面，调真实的游戏函数；要弹窗的流程不等它返回，看 #modal 里的按钮再点。
test.describe.configure({ timeout: 60_000 });

async function start(page, cfg = {}) {
  await page.addInitScript(() => { let s = 20261121; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto('/');
  await page.evaluate(cfg => {
    newGame({ names: ['A', 'B', 'C'], diff: 'full', wa: true, timed: false, minutes: 90, learn: false, ...cfg });
    enterGame();
    OWNABLE.forEach(i => { S.props[i].owner = null; S.props[i].level = 0; });
    S.players.forEach(q => { q.role = 'saas'; q.cash = 3000; q.cards = []; q.pos = 0; });
    S.cur = 0; S.phase = 'busy';
    // 站在一格上：前后 3 格都是没人买的普通服务，往回退也不会绕过起点
    const ok = k => SQ[k] && SQ[k].t === 'prop' && !isHidden(k);
    const k = SQ.findIndex((_, i) => i > 3 && i + 3 < N && ok(i + 3) && ok(i - 3));
    S.players[0].pos = k; window.__k = k;
  }, cfg);
}
const modalBox = page => page.locator('#modal:not([hidden]) .box');
const btn = (page, text) => page.locator('#modal:not([hidden]) .btns button', { hasText: text });
const run = (page, fn, arg) => page.evaluate(([src, arg]) => { window.__done = false; window.__r = undefined; (0, eval)(`(${src})`)(arg).then(r => { window.__r = r; window.__done = true; }); }, [fn.toString(), arg]);
const done = page => expect.poll(() => page.evaluate(() => window.__done), { timeout: 15_000 }).toBe(true);
const CHOICE = '领钱，还是走一步';
// 抽「拿到 Activate 创业扶持 Credits」（#1）：先点掉亮卡窗，停在四选一的弹窗上
async function drawActivate(page) {
  await run(page, () => drawReinvent(S.players[0], 1));
  await expect.poll(async () => {
    if (await modalBox(page).filter({ hasText: CHOICE }).count()) return true;
    await btn(page, '执行').click({ timeout: 1000 }).catch(() => {});
    return false;
  }, { timeout: 15_000 }).toBe(true);
}
// 这张卡按当时的卡牌倍率该给多少
const want = page => page.evaluate(() => withCardMul(S.cardMul || cardMulBase(), async () => cardAmt(100)));

test('真人抽到只给钱的卡：弹窗标题带卡名，四个选项', async ({ page }) => {
  await start(page);
  await drawActivate(page);
  await expect(modalBox(page)).toContainText('拿到 Activate 创业扶持 Credits');
  const labels = await page.locator('#modal:not([hidden]) .btns button').allTextContents();
  const names = await page.evaluate(() => [SQ[window.__k + 3].n, SQ[window.__k - 3].n]);
  expect(labels.length).toBe(4);
  expect(labels[0]).toBe(`领 $${await want(page)}`);
  expect(labels[1]).toBe(`前进 3 格（到 ${names[0]}）`);
  expect(labels[2]).toBe(`后退 3 格（到 ${names[1]}）`);
  expect(labels[3]).toBe('再掷一次骰子（这次落地不能买）');
});

test('选领钱：金额和以前一样，人不动', async ({ page }) => {
  await start(page);
  const c0 = await page.evaluate(() => S.players[0].cash), amt = await want(page);
  await drawActivate(page);
  await btn(page, '领 $').click();
  await done(page);
  const r = await page.evaluate(() => ({ cash: S.players[0].cash, pos: S.players[0].pos, k: window.__k }));
  expect(r.cash - c0).toBe(amt);
  expect(r.pos).toBe(r.k);
});

test('选前进 3 格：走到前面第 3 格，照常结算（没人买的弹出购买）', async ({ page }) => {
  await start(page);
  const c0 = await page.evaluate(() => S.players[0].cash);
  await drawActivate(page);
  await btn(page, '前进 3 格').click();
  const name = await page.evaluate(() => SQ[window.__k + 3].n);
  await expect.poll(() => page.evaluate(() => S.players[0].pos === window.__k + 3 && S.lastSq === window.__k + 3), { timeout: 15_000 }).toBe(true);
  await expect(modalBox(page).filter({ hasText: name })).toBeVisible({ timeout: 15_000 });
  await expect(btn(page, '买')).not.toHaveCount(0);
  expect(await page.evaluate(() => S.players[0].cash)).toBe(c0);   // 没领钱
});

test('选后退 3 格：退到后面第 3 格，照常结算（没人买的弹出购买）', async ({ page }) => {
  await start(page);
  const c0 = await page.evaluate(() => S.players[0].cash);
  await drawActivate(page);
  await btn(page, '后退 3 格').click();
  const name = await page.evaluate(() => SQ[window.__k - 3].n);
  await expect.poll(() => page.evaluate(() => S.players[0].pos === window.__k - 3 && S.lastSq === window.__k - 3), { timeout: 15_000 }).toBe(true);
  await expect(modalBox(page).filter({ hasText: name })).toBeVisible({ timeout: 15_000 });
  expect(await page.evaluate(() => S.players[0].cash)).toBe(c0);
});

test('选再掷一次：按骰子点数走，落在没人买的服务上不能买', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { S.cheatDice = { 0: [1, 2] }; });   // 定下点数：前进 3 格
  const c0 = await page.evaluate(() => S.players[0].cash);
  await drawActivate(page);
  await btn(page, '再掷一次骰子').click();
  await done(page);
  const r = await page.evaluate(() => ({ pos: S.players[0].pos, k: window.__k, owner: S.props[window.__k + 3].owner, cash: S.players[0].cash, log: S.log.map(l => typeof l === 'string' ? l : (l.t ?? l.m ?? '')).join('\n') }));
  expect(r.pos).toBe(r.k + 3);
  expect(r.owner).toBe(null);
  expect(r.cash).toBe(c0);
  expect(r.log).toContain('落地不能买');
});

test('DLC 卡「通过了安全合规审计」也给四选一，领钱照卡上算', async ({ page }) => {
  await start(page, { dlc: ['sec'] });
  const c0 = await page.evaluate(() => S.players[0].cash);
  await run(page, () => { const c = REI.find(c => c && c.n === '通过了安全合规审计'); return c.run(S.players[0], S.players.slice(1), c); });   // 和 drawReinvent0 一样：run(抽卡的人, 其他人, 这张卡)
  await expect(modalBox(page).filter({ hasText: CHOICE })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('#modal:not([hidden]) .btns button')).toHaveCount(4);
  await btn(page, '领 $50').click();
  await done(page);
  expect(await page.evaluate(() => S.players[0].cash) - c0).toBe(50);
});

test('电脑玩家抽到只给钱的卡：不弹窗，直接领钱，人不动', async ({ page }) => {
  await start(page);
  const amt = await want(page);
  const r = await page.evaluate(async () => {
    S.cfg.ai = { 0: true }; const p = S.players[0], c0 = p.cash;
    UI.showCard = async () => {};   // 跳过亮卡窗
    let asked = 0; const ask0 = UI.ask; UI.ask = o => { asked++; return ask0(o); };
    await drawReinvent(p, 1);
    UI.ask = ask0;
    return { got: p.cash - c0, pos: p.pos, k: window.__k, asked };
  });
  expect(r).toEqual({ got: amt, pos: r.k, k: r.k, asked: 0 });
});
