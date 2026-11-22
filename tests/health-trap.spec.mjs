import { test, expect } from '@playwright/test';

// 埋 Health 卡（engine/18-reinvent.js）：和发 Health 卡同价、每回合能埋一张（不占发卡的每圈一次），从牌堆顶 3 张里挑一张扣着埋在自己停过的服务上（经过不算），场上埋几张不限、一格一张。
// 谁停上去（埋的人自己也算）、结算完那一格以后翻开照常结算。日志埋的时候不写格子和卡，踩中才写；联机时别人的 S.traps 只留 by、牌堆顺序换成 0。
// 跟 rei-hand.spec.mjs 一样：在页面里摆好局面，调真实的游戏函数；要弹窗的流程不等它返回，看 #modal 里的按钮再点。
test.describe.configure({ timeout: 60_000 });

async function start(page) {
  await page.addInitScript(() => { let s = 20261122; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto('/');
  await page.evaluate(() => {
    newGame({ names: ['A', 'B', 'C'], diff: 'full', wa: true, timed: false, minutes: 90, learn: false });
    enterGame();
    OWNABLE.forEach(i => { S.props[i].owner = null; S.props[i].level = 0; });
    S.players.forEach(q => { q.role = 'saas'; q.cash = 3000; q.cards = []; q.hand = []; q.stops = []; q.pos = 0; q.techDebt = 0; });
    S.cur = 0; S.phase = 'busy';
    // 站在一格上：后面第 3 格、第 6 格都是普通服务
    const ok = k => SQ[k] && SQ[k].t === 'prop' && !isHidden(k);
    const k = SQ.findIndex((_, i) => i > 3 && i + 6 < N && ok(i + 3) && ok(i + 6));
    S.players[0].pos = k; window.__k = k;
    UI.showCard = async () => {};   // 跳过亮卡窗
  });
}
const modalBox = page => page.locator('#modal:not([hidden]) .box');
const btn = (page, text) => page.locator('#modal:not([hidden]) .btns button', { hasText: text });
const run = (page, fn, arg) => page.evaluate(([src, arg]) => { window.__done = false; window.__r = undefined; (0, eval)(`(${src})`)(arg).then(r => { window.__r = r; window.__done = true; }); }, [fn.toString(), arg]);
const done = page => expect.poll(() => page.evaluate(() => window.__done), { timeout: 15_000 }).toBe(true);
const strip = l => (typeof l === 'string' ? l : (l.t ?? l.m ?? '')).replace(/<time[^>]*><\/time>/g, '').replace(/<[^>]+>/g, '');
const logTxt = page => page.evaluate(() => S.log.map(l => (typeof l === 'string' ? l : (l.t ?? l.m ?? '')).replace(/<[^>]+>/g, '')).join('\n'));
// 在某一格放一张埋好的卡（跳过选格子的窗）
const plant = (page, by, sq, id) => page.evaluate(([by, sq, id]) => { (S.traps = S.traps || []).push({ by, sq, id, round: S.round }); }, [by, sq, id]);

test('只能埋在停过的服务上：经过的不算；埋下扣钱、从牌堆拿走，日志不写格子和卡', async ({ page }) => {
  await start(page);
  // 走 3 格停在自己的服务上（落地只问升级，选什么都不做）
  await page.evaluate(() => { S.props[window.__k + 3].owner = 0; });
  await run(page, () => moveSteps(S.players[0], 3).then(() => land(S.players[0])));
  await btn(page, '什么都不做，也不跳').click();
  await done(page);
  const k = await page.evaluate(() => window.__k);
  expect(await page.evaluate(() => ({ stops: S.players[0].stops, cands: trapCands(S.players[0]), ok: buryOk(S.players[0]) }))).toEqual({ stops: [k + 3], cands: [k + 3], ok: true });
  await page.evaluate(() => { S.phase = 'post'; UI.render(); });
  await expect(page.locator('.todo', { hasText: '埋一张 Health 卡' }).locator('button', { hasText: '埋卡' })).toBeEnabled();
  const before = await page.evaluate(() => ({ cash: S.players[0].cash, cost: incSendCost(S.players[0]), top: S.inc[0], n: S.inc.length, name: SQ[window.__k + 3].n }));
  await page.evaluate(() => { S.phase = 'busy'; });
  await run(page, () => buryIncident());
  await expect(modalBox(page)).toContainText('只有你看得到');
  expect(await page.locator('#modal:not([hidden]) .btns button').allTextContents()).toEqual([before.name, '取消']);
  await btn(page, before.name).click();
  // 第二个窗：牌堆顶 3 张挑一张，挑第二张；另外两张放回牌堆底
  const top3 = await page.evaluate(() => S.inc.slice(0, 3));
  await expect(modalBox(page)).toContainText('埋哪一张');
  expect(await page.locator('#modal:not([hidden]) .btns button').count()).toBe(4);
  await page.locator('#modal:not([hidden]) .btns button').nth(1).click();
  await done(page);
  const r = await page.evaluate(() => ({ bottom: S.inc.slice(-2), traps: S.traps, cash: S.players[0].cash, n: S.inc.length, disc: S.incDisc.slice(), last: S.log[0], hist: JSON.stringify(S.hist || {}), cardName: INC[S.traps[0].id].n }));
  expect(r.traps).toEqual([{ by: 0, sq: k + 3, id: top3[1], round: await page.evaluate(() => S.round) }]);
  expect(r.bottom).toEqual([top3[0], top3[2]]);
  expect(r.cash).toBe(before.cash - before.cost);
  expect(r.n).toBe(before.n - 1);
  expect(r.disc).not.toContain(top3[1]);
  expect(strip(r.last)).toBe(`💣 A 花 $${before.cost} 埋了一张 Health 卡`);
  expect(r.hist).not.toContain('埋了一张');   // 不记进任何一格的历史
  // 主人（同一台轮流玩的当前回合真人）看得到埋在哪、是哪张
  await page.evaluate(() => { S.phase = 'post'; UI.render(); });
  const tip = await page.evaluate(() => document.querySelector('[data-fk="r0-trap"]').title);
  expect(tip).toBe(`埋在 ${before.name}：${r.cardName}`);
  // 换成 B 的回合：A 那条只写张数
  await page.evaluate(() => { S.cur = 1; UI.render(); });
  const tip2 = await page.evaluate(() => document.querySelector('[data-fk="r0-trap"]').title);
  expect(tip2).not.toContain(before.name);
  expect(tip2).not.toContain(r.cardName);
  expect(tip2).toContain('只有 A 自己知道');
});

test('每回合埋一张，不占发 Health 卡的每圈一次；场上埋几张不限；电脑不埋', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(() => {
    const p = S.players[0], k = window.__k; p.stops = [k + 3, k + 6];
    const a = buryOk(p);
    p.incLap = p.laps || 0;   // 这一圈已经发过 Health 卡：照样能埋
    const sent = buryOk(p);
    p.buryTurn = turnKey();   // 这回合已经埋过
    const turn = buryOk(p);
    p.buryTurn = undefined; p.incLap = undefined;
    S.traps = [{ by: 0, sq: k + 3, id: 1 }, { by: 1, sq: k + 9, id: 2 }, { by: 0, sq: k + 12, id: 3 }];
    const many = { ok: buryOk(p), cands: trapCands(p) };   // 已经埋了 2 张也能再埋；埋了卡的格子不能再埋
    return { a, sent, turn, many, k };
  });
  expect(r).toMatchObject({ a: true, sent: true, turn: false, many: { ok: true, cands: [r.k + 6] } });
  // 第 3 张照样能埋；埋完这回合不能再埋，发 Health 卡不受影响
  await page.evaluate(() => { S.phase = 'busy'; });
  await run(page, () => buryIncident());
  await page.locator('#modal:not([hidden]) .btns button').first().click();
  await expect(modalBox(page)).toContainText('埋哪一张');
  await page.locator('#modal:not([hidden]) .btns button').first().click();
  await done(page);
  expect(await page.evaluate(() => ({ n: S.traps.filter(t => t.by === 0).length, bury: buryOk(S.players[0]), send: incSendOk(S.players[0]) }))).toEqual({ n: 3, bury: false, send: true });
  // 这回合再点只弹提示，不开窗
  await page.evaluate(() => { S.phase = 'busy'; });
  await run(page, () => buryIncident());
  await done(page);
  await expect(page.locator('#modal:not([hidden])')).toHaveCount(0);
  // 电脑：不开窗、不埋
  await page.evaluate(() => { S.traps = []; S.players[0].buryTurn = undefined; S.cfg.ai = { 0: true }; });
  await run(page, () => buryIncident());
  await done(page);
  expect(await page.evaluate(() => S.traps.length)).toBe(0);
});

test('对手停上去：先付过路费，再翻开照常结算；埋的人自己停上去也翻开', async ({ page }) => {
  await start(page);
  const j = await page.evaluate(() => window.__k + 3);
  await page.evaluate(j => { S.props[j].owner = 2; S.players[1].pos = j; S.players[0].pos = j; S.players[0].immuneTill = S.round; S.players[1].immuneTill = S.round; }, j);
  // 埋的人 A 自己停上去：一样翻开，日志写「自己埋的」
  const own = await page.evaluate(() => S.inc.shift());
  await plant(page, 0, j, own);
  await run(page, () => land(S.players[0]));
  await done(page);
  const a = await page.evaluate(own => ({ traps: S.traps.length, disc: S.incDisc.includes(own), name: INC[own].n, sq: SQ[S.players[0].pos].n, log: S.log.slice(0, 8).map(l => l.replace(/<[^>]+>/g, '')) }), own);
  expect(a.traps).toBe(0);
  expect(a.disc).toBe(true);
  expect(a.log.some(l => l.includes(`💣 A 踩中了自己埋在 ${a.sq} 的 Health 卡「${a.name}」`))).toBe(true);
  const id = await page.evaluate(() => S.inc.shift());
  await plant(page, 0, j, id);
  // 对手 B 停上去：翻开，免疫照旧生效（监管沙盒）
  const inc0 = await page.evaluate(() => ST(S.players[1]).inc);
  await page.evaluate(() => { S.cur = 1; });
  await run(page, () => land(S.players[1]));
  await done(page);
  const r = await page.evaluate(id => ({ traps: S.traps.length, disc: S.incDisc.includes(id), inc: ST(S.players[1]).inc, name: INC[id].n, sq: SQ[S.players[1].pos].n, log: S.log.slice(0, 8).map(l => l.replace(/<[^>]+>/g, '')) }), id);
  expect(r.traps).toBe(0);
  expect(r.disc).toBe(true);
  expect(r.inc).toBe(inc0 + 1);
  const hit = r.log.findIndex(l => l.includes(`💣 B 踩中了 A 埋在 ${r.sq} 的 Health 卡「${r.name}」`));
  const drew = r.log.findIndex(l => l.includes(`B 抽到 Health 事件 #${id}`));
  const imm = r.log.findIndex(l => l.includes('免疫'));
  const rent = r.log.findIndex(l => l.includes('B') && l.includes('过路费'));
  expect(hit).toBeGreaterThanOrEqual(0);
  expect(drew).toBeGreaterThanOrEqual(0);
  expect(imm).toBeLessThan(drew);   // 日志新的在前：免疫在抽卡之后
  expect(drew).toBeLessThan(hit);
  expect(hit).toBeLessThan(rent);   // 过路费先结算
});

test('主人破产：他埋的卡收回弃牌堆', async ({ page }) => {
  await start(page);
  await plant(page, 1, await page.evaluate(() => window.__k + 3), 5);
  await plant(page, 0, await page.evaluate(() => window.__k + 6), 6);
  await run(page, () => { const p = S.players[1]; p.cash = 0; p.debt = [{ to: 0, amt: 500 }]; return resolveDebts(); });
  await btn(page, '宣告破产').click();
  await done(page);
  expect(await page.evaluate(() => ({ traps: S.traps.map(t => t.by), disc: S.incDisc.includes(5) && !S.incDisc.includes(6) }))).toEqual({ traps: [0], disc: true });
});

test('存档带着埋的卡和停过的格子；老存档按名下服务和站的格补上', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(async () => {
    S.traps = [{ by: 0, sq: 6, id: 3, round: 2 }]; S.players[0].stops = [6, 8]; S.phase = 'post';
    localStorage.setItem(KEY, JSON.stringify(S)); __set_S(null); await resumeGame();
    const a = { traps: S.traps, stops: S.players[0].stops };
    // 老存档没记停过的格：按名下的服务和现在站的格补上（起点这种不是服务的格不算）
    const [j, m] = OWNABLE, old = JSON.parse(localStorage.getItem(KEY)); delete old.traps; old.players.forEach(q => { delete q.stops; q.pos = 0; });
    old.props[j].owner = 1; old.players[2].pos = m;
    localStorage.setItem(KEY, JSON.stringify(old)); __set_S(null); await resumeGame();
    return { a, b: { traps: S.traps, stops: S.players.map(q => q.stops) }, j, m };
  });
  expect(r).toEqual({ a: { traps: [{ by: 0, sq: 6, id: 3, round: 2 }], stops: [6, 8] }, b: { traps: [], stops: [[], [r.j], [r.m]] }, j: r.j, m: r.m });
});

async function fakeRoom(page) {
  await page.evaluate(() => {
    window.__sent = [];
    const conn = (o) => ({ open: true, ...o });
    MP.role = 'host'; MP.send = (c, m) => window.__sent.push({ to: c._viewer ? 'v' : c._seat, m: typeof m === 'string' ? JSON.parse(m) : JSON.parse(JSON.stringify(m)) });
    MP.seats = { 1: { name: 'B', conn: conn({ _seat: 1 }), online: true, delta: true }, 2: { name: 'C', conn: conn({ _seat: 2 }), online: true, delta: true } };
    MP.viewers = { w: { name: 'W', conn: conn({ _viewer: 'w' }), online: true, delta: true } };
  });
}
test('联机推状态：别人埋的卡只留 by，观众全遮；Health 牌堆顺序换成 0；结束以后全亮', async ({ page }) => {
  await start(page);
  await fakeRoom(page);
  const r = await page.evaluate(() => {
    S.traps = [{ by: 0, sq: 6, id: 3, round: 1 }, { by: 1, sq: 8, id: 4, round: 1 }];
    MP.pushState(true);
    const got = Object.fromEntries(window.__sent.filter(x => x.m.t === 'state').map(x => [x.to, x.m.S]));
    const over = (S.phase = 'over', MP.stateFor(2).traps);
    return { b: got[1].traps, c: got[2].traps, v: got.v.traps, deck: got.v.inc.every(x => x === 0) && got[1].inc.length === S.inc.length && got[1].inc.every(x => x === 0), host: S.traps.length === 2 && S.traps[0].id === 3 && S.inc.some(x => x !== 0), over };
  });
  expect(r.b).toEqual([{ by: 0 }, { by: 1, sq: 8, id: 4, round: 1 }]);
  expect(r.c).toEqual([{ by: 0 }, { by: 1 }]);
  expect(r.v).toEqual([{ by: 0 }, { by: 1 }]);
  expect(r.deck).toBe(true);
  expect(r.host).toBe(true);
  expect(r.over).toEqual([{ by: 0, sq: 6, id: 3, round: 1 }, { by: 1, sq: 8, id: 4, round: 1 }]);
});

test('联机：选格子的窗只有主人收到格子名，别人和观众的按钮是「？」，房主这边也遮着', async ({ page }) => {
  await start(page);
  await fakeRoom(page);
  const j = await page.evaluate(() => window.__k + 3);
  await page.evaluate(j => { S.cur = 1; S.players[1].stops = [j]; S.phase = 'busy'; buryIncident(); }, j);
  await expect(modalBox(page).filter({ hasText: 'B 在决定埋不埋 Health 卡' })).toBeVisible({ timeout: 15_000 });
  const r = await page.evaluate(j => {
    const ms = window.__sent.filter(x => x.m.t === 'modal'), by = Object.fromEntries(ms.map(x => [x.to, x.m.spec])), n = SQ[j].n;
    return { owner: by[1].buttons.map(b => b.label), c: by[2].buttons.map(b => b.label), v: by.v.buttons.map(b => b.label), ct: by[2].title + by[2].html, host: document.querySelector('#modal .box').textContent.includes(n), n };
  }, j);
  expect(r.owner).toEqual([r.n, '取消']);
  expect(r.c).toEqual(['?', '取消']);
  expect(r.v).toEqual(['?', '取消']);
  expect(r.ct).not.toContain(r.n);
  expect(r.host).toBe(false);
});

test('结束时没人踩中的：日志和战报里亮出来', async ({ page }) => {
  await start(page);
  const j = await page.evaluate(() => window.__k + 3);
  await plant(page, 0, j, 3);
  const r = await page.evaluate(j => { gameOver(S.players[0], '测试'); return { log: S.log.map(l => l.replace(/<[^>]+>/g, '')).join('\n'), rep: reportHtml(S.players[0], '测试').replace(/<[^>]+>/g, ''), line: `A 在 ${SQ[j].n} 埋的「${INC[3].n}」没人踩中` }; }, j);
  expect(r.log).toContain('💣 ' + r.line);
  expect(r.rep).toContain('没人踩中的 Health 卡');
  expect(r.rep).toContain(r.line);
});
