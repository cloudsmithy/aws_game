import { test, expect } from '@playwright/test';

// re:Invent 手牌：真人自己抽的卡先只给自己看，四选一（现在用 / 收进手牌 / 卖掉 / 丢掉再掷一次）；手牌在自己的回合打出、卖掉或弃牌走 1–3 格。
// 电脑、模拟照旧马上用。联机推状态时别人的手牌、牌堆顺序都换成 0；只给主人看的弹窗别人收到的是占位。
// 跟 cards-choice.spec.mjs 一样：在页面里摆好局面，调真实的游戏函数；要弹窗的流程不等它返回，看 #modal 里的按钮再点。
test.describe.configure({ timeout: 60_000 });

async function start(page, cfg = {}) {
  await page.addInitScript(() => { let s = 20261122; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto('/');
  await page.evaluate(cfg => {
    newGame({ names: ['A', 'B', 'C'], diff: 'full', wa: true, timed: false, minutes: 90, learn: false, ...cfg });
    enterGame();
    OWNABLE.forEach(i => { S.props[i].owner = null; S.props[i].level = 0; });
    S.players.forEach(q => { q.role = 'saas'; q.cash = 3000; q.cards = []; q.hand = []; q.pos = 0; q.techDebt = 0; });
    S.cur = 0; S.phase = 'busy';
    // 站在一格上：后面第 3 格是没人买的普通服务
    const ok = k => SQ[k] && SQ[k].t === 'prop' && !isHidden(k);
    const k = SQ.findIndex((_, i) => i > 3 && i + 3 < N && ok(i + 3));
    S.players[0].pos = k; window.__k = k;
  }, cfg);
}
const modalBox = page => page.locator('#modal:not([hidden]) .box');
const btn = (page, text) => page.locator('#modal:not([hidden]) .btns button', { hasText: text });
const run = (page, fn, arg) => page.evaluate(([src, arg]) => { window.__done = false; window.__r = undefined; (0, eval)(`(${src})`)(arg).then(r => { window.__r = r; window.__done = true; }); }, [fn.toString(), arg]);
const done = page => expect.poll(() => page.evaluate(() => window.__done), { timeout: 15_000 }).toBe(true);
const logTxt = page => page.evaluate(() => S.log.map(l => (typeof l === 'string' ? l : (l.t ?? l.m ?? '')).replace(/<[^>]+>/g, '')).join('\n'));
const PEEK = '只有你看得到';
// 把 id 放到牌堆顶，让 A 正常抽一张（不是 User Group 选中的、也不是盲盒），停在四选一的窗上
async function drawPeek(page, id) {
  await run(page, id => { S.rei.unshift(id); return drawReinvent(S.players[0]); }, id);
  await expect(modalBox(page).filter({ hasText: PEEK })).toBeVisible({ timeout: 15_000 });
}
// 手牌窗：在自己的回合点「手牌」（uiAction 里阶段是 busy）
const openHand = page => run(page, () => reiHand());
const sellAmt = page => page.evaluate(() => withCardMul(S.cardMul || cardMulBase(), async () => cardAmt(50)));

test('真人自己抽的卡：只给自己看的四选一，卡面在窗里，「最近抽到」不写是哪张', async ({ page }) => {
  await start(page);
  await drawPeek(page, 8);
  await expect(modalBox(page)).toContainText(await page.evaluate(() => REI[8].n));
  const labels = await page.locator('#modal:not([hidden]) .btns button').allTextContents();
  expect(labels).toEqual(['现在用（公开）', '收进手牌（不公开，0/3）', `卖掉，领 $${await sellAmt(page)}`, '丢掉，再掷一次骰子（这次落地不能买）']);
  expect(await page.evaluate(() => S.lastCard)).toEqual({ kind: 'rei', id: null, who: 0 });
  await expect(page.locator('.lastcard')).toContainText('没公开');
});

test('现在用：和以前一样亮卡结算（#8 没有能升级的服务，改领 $100）', async ({ page }) => {
  await start(page);
  const c0 = await page.evaluate(() => S.players[0].cash);
  await drawPeek(page, 8);
  await btn(page, '现在用').click();
  await btn(page, '执行').click();
  await done(page);
  const r = await page.evaluate(() => ({ cash: S.players[0].cash, hand: S.players[0].hand, last: S.lastCard, disc: S.reiDisc.includes(8) }));
  expect(r.hand).toEqual([]);
  expect(r.last.id).toBe(8);
  expect(r.disc).toBe(true);
  expect(r.cash).toBeGreaterThan(c0);
  expect(await logTxt(page)).toContain('抽到 re:Invent #8');
});

test('收进手牌：进 p.hand，不进弃牌堆，日志不写卡名', async ({ page }) => {
  await start(page);
  const c0 = await page.evaluate(() => S.players[0].cash);
  await drawPeek(page, 8);
  await btn(page, '收进手牌').click();
  await done(page);
  const r = await page.evaluate(() => ({ cash: S.players[0].cash, hand: S.players[0].hand, disc: S.reiDisc.includes(8), name: REI[8].n }));
  expect(r).toMatchObject({ cash: c0, hand: [8], disc: false });
  const log = await logTxt(page);
  expect(log).toContain('A 抽了一张 re:Invent 卡');
  expect(log).toContain('收进了手牌');
  expect(log).not.toContain(r.name);
  expect(log).not.toContain('#8');
  await expect(page.locator('#side')).toContainText('手牌 1');
});

test('手牌满 3 张：收进手牌那项灰掉，写明原因', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { S.players[0].hand = [3, 11, 14]; });
  await drawPeek(page, 8);
  await expect(btn(page, '收进手牌')).toBeDisabled();
  await expect(btn(page, '收进手牌')).toContainText('手牌满了，最多 3 张');
});

test('卖掉：进弃牌堆，领 $50（按卡牌倍率）', async ({ page }) => {
  await start(page);
  const c0 = await page.evaluate(() => S.players[0].cash), amt = await sellAmt(page);
  await drawPeek(page, 8);
  await btn(page, '卖掉').click();
  await done(page);
  const r = await page.evaluate(() => ({ cash: S.players[0].cash, hand: S.players[0].hand, disc: S.reiDisc.includes(8) }));
  expect(r).toEqual({ cash: c0 + amt, hand: [], disc: true });
  expect(await logTxt(page)).toContain('卖掉了这张卡');
});

test('丢掉再掷一次：按点数走，落在没人买的服务上不能买；在维护窗口里这项灰掉', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { S.cheatDice = { 0: [1, 2] }; });
  const c0 = await page.evaluate(() => S.players[0].cash);
  await drawPeek(page, 8);
  await btn(page, '丢掉，再掷一次').click();
  await done(page);
  const r = await page.evaluate(() => ({ pos: S.players[0].pos, k: window.__k, owner: S.props[window.__k + 3].owner, cash: S.players[0].cash, disc: S.reiDisc.includes(8) }));
  expect(r).toMatchObject({ pos: r.k + 3, owner: null, cash: c0, disc: true });
  const log = await logTxt(page);
  expect(log).toContain('丢掉这张卡，再掷一次骰子');
  expect(log).toContain('落地不能买');
  await page.evaluate(() => { S.players[0].jail = 1; });
  await drawPeek(page, 14);
  await expect(btn(page, '丢掉，再掷一次')).toBeDisabled();
  await expect(btn(page, '收进手牌')).toBeEnabled();
});

test('打出手牌：亮卡、照常结算（#7 清掉 1 个技术债），日志写卡名', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { S.players[0].hand = [7]; S.players[0].techDebt = 2; });
  await openHand(page);
  await expect(modalBox(page).filter({ hasText: PEEK })).toBeVisible();
  await btn(page, '打出').click();
  await btn(page, '执行').click();
  await done(page);
  const r = await page.evaluate(() => ({ debt: S.players[0].techDebt, hand: S.players[0].hand, disc: S.reiDisc.includes(7), last: S.lastCard.id }));
  expect(r).toEqual({ debt: 1, hand: [], disc: true, last: 7 });
  expect(await logTxt(page)).toContain('A 打出手牌 re:Invent #7');
});

test('手牌卖掉；弃牌走格子每回合一次', async ({ page }) => {
  await start(page);
  const amt = await sellAmt(page);
  await page.evaluate(() => { S.players[0].hand = [7, 8, 14]; S.props[window.__k + 3].owner = 0; });   // 走到自己的服务上
  const c0 = await page.evaluate(() => S.players[0].cash);
  // 多张：先挑第几张
  await openHand(page);
  await btn(page, '第 2 张').click();
  await btn(page, '卖掉').click();
  await done(page);
  expect(await page.evaluate(() => ({ hand: S.players[0].hand, cash: S.players[0].cash, disc: S.reiDisc.includes(8) }))).toEqual({ hand: [7, 14], cash: c0 + amt, disc: true });
  await openHand(page);
  await btn(page, '第 1 张').click();
  await btn(page, '往前走 3 格').click();
  await btn(page, '什么都不做，也不跳').click();   // 走到自己的服务上：落地照常结算
  await done(page);
  expect(await page.evaluate(() => ({ hand: S.players[0].hand, pos: S.players[0].pos - window.__k, disc: S.reiDisc.includes(7) }))).toEqual({ hand: [14], pos: 3, disc: true });
  expect(await logTxt(page)).toContain('丢掉一张手牌，往前走 3 格');
  // 同一回合第二次：走格子的选项灰掉
  await openHand(page);
  await expect(btn(page, '弃牌走 1 格（这回合已经走过了）')).toBeDisabled();
  await btn(page, '取消').click();
  await done(page);
  expect(await page.evaluate(() => S.players[0].hand)).toEqual([14]);
});

test('电脑、盲盒、User Group 选中的卡：不弹四选一，马上用', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(async () => {
    const p = S.players[0]; UI.showCard = async () => {};   // 跳过亮卡窗
    let asked = 0; const ask0 = UI.ask; UI.ask = o => { asked++; return ask0(o); };
    S.cfg.ai = { 0: true }; p.techDebt = 1; S.rei.unshift(7); await drawReinvent(p);
    const ai = { asked, debt: p.techDebt, hand: p.hand.length };
    S.cfg.ai = {}; p.techDebt = 1; S.rei.unshift(7); await drawReinvent(p, null, true);   // 盲盒：效果是外面定的
    const blind = { asked, debt: p.techDebt };
    p.techDebt = 1; await drawReinvent(p, 7);   // User Group 三选一选中的
    UI.ask = ask0;
    return { ai, blind, ug: { asked, debt: p.techDebt, hand: p.hand.length } };
  });
  expect(r).toEqual({ ai: { asked: 0, debt: 0, hand: 0 }, blind: { asked: 0, debt: 0 }, ug: { asked: 0, debt: 0, hand: 0 } });
});

test('存档带着手牌；老存档没有 hand 读进来是空的', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(async () => {
    S.players[0].hand = [3, 11]; S.phase = 'post';
    localStorage.setItem(KEY, JSON.stringify(S)); __set_S(null); await resumeGame();
    const a = S.players[0].hand;
    const old = JSON.parse(localStorage.getItem(KEY)); old.players.forEach(q => delete q.hand);
    localStorage.setItem(KEY, JSON.stringify(old)); __set_S(null); await resumeGame();
    return { a, b: S.players.map(q => q.hand) };
  });
  expect(r).toEqual({ a: [3, 11], b: [[], [], []] });
});

test('破产：手牌不给债主，回到弃牌堆', async ({ page }) => {
  await start(page);
  await run(page, () => { const p = S.players[1]; p.hand = [3, 11]; p.cash = 0; p.debt = [{ to: 0, amt: 500 }]; return resolveDebts(); });
  await btn(page, '宣告破产').click();   // 还不上：破产，资产按欠款给债主 A
  await done(page);
  const r = await page.evaluate(() => ({ hand: S.players[1].hand, top: S.players[0].hand, disc: [3, 11].every(id => S.reiDisc.includes(id)) }));
  expect(r).toEqual({ hand: [], top: [], disc: true });
});

// 联机：在页面里摆两位远端和一位观众（假连接，send 记下发出去的东西），直接调房主的推送和弹窗
async function fakeRoom(page) {
  await page.evaluate(() => {
    window.__sent = [];
    const conn = (o) => ({ open: true, ...o });
    MP.role = 'host'; MP.send = (c, m) => window.__sent.push({ to: c._viewer ? 'v' : c._seat, m: typeof m === 'string' ? JSON.parse(m) : JSON.parse(JSON.stringify(m)) });
    MP.seats = { 1: { name: 'B', conn: conn({ _seat: 1 }), online: true, delta: true }, 2: { name: 'C', conn: conn({ _seat: 2 }), online: true, delta: true } };
    MP.viewers = { w: { name: 'W', conn: conn({ _viewer: 'w' }), online: true, delta: true } };
  });
}
test('联机推状态：别人的手牌换成同样张数的 0，观众全是 0，牌堆顺序也不发', async ({ page }) => {
  await start(page);
  await fakeRoom(page);
  const r = await page.evaluate(() => {
    S.players[0].hand = [3, 11]; S.players[1].hand = [14];
    MP.pushState(true);
    const got = Object.fromEntries(window.__sent.filter(x => x.m.t === 'state').map(x => [x.to, x.m.S]));
    const unit = MP.stateFor(2);
    return {
      b: got[1].players.map(q => q.hand), c: got[2].players.map(q => q.hand), v: got.v.players.map(q => q.hand),
      deck: got.v.rei.every(x => x === 0) && got.v.rei.length === S.rei.length,
      unit: unit.players.map(q => q.hand), host: S.players.map(q => q.hand),
    };
  });
  expect(r.b).toEqual([[0, 0], [14], []]);
  expect(r.c).toEqual([[0, 0], [0], []]);
  expect(r.v).toEqual([[0, 0], [0], []]);
  expect(r.unit).toEqual([[0, 0], [0], []]);
  expect(r.host).toEqual([[3, 11], [14], []]);   // 房主自己的状态不动
  expect(r.deck).toBe(true);
});

test('联机推状态：没人有手牌时大家收到同一份', async ({ page }) => {
  await start(page);
  await fakeRoom(page);
  const r = await page.evaluate(() => {
    MP.pushState(true);
    const s = window.__sent.filter(x => x.m.t === 'state').map(x => JSON.stringify({ ...x.m, now: 0 }));
    return { n: s.length, same: new Set(s).size };
  });
  expect(r).toEqual({ n: 3, same: 1 });
});

test('只给主人看的弹窗：主人收到卡面，别的座位、观众收到占位；房主这边也是占位', async ({ page }) => {
  await start(page);
  await fakeRoom(page);
  await page.evaluate(() => { S.cur = 1; S.players[1].hand = []; S.rei.unshift(8); drawReinvent(S.players[1]); });
  await expect(modalBox(page).filter({ hasText: 'B 在看抽到的 re:Invent 卡' })).toBeVisible({ timeout: 15_000 });
  const r = await page.evaluate(() => {
    const ms = window.__sent.filter(x => x.m.t === 'modal'), by = Object.fromEntries(ms.map(x => [x.to, x.m.spec]));
    return { owner: by[1].html.includes(REI[8].n), c: by[2].html.includes(REI[8].n) || by[2].title.includes(REI[8].n), v: by.v.html.includes(REI[8].n), ct: by[2].title, n: by[2].buttons.length, host: document.querySelector('#modal .box').textContent.includes(REI[8].n), last: S.lastCard.id };
  });
  expect(r).toEqual({ owner: true, c: false, v: false, ct: 'B 在看抽到的 re:Invent 卡', n: 4, host: false, last: null });
});
