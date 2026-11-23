import { test, expect } from '@playwright/test';

// 第六轮复查：旧版本停止支持扣下线拿过的钱、破产只给没用过的卡、中途加入的人不被出题、技能免运行费不免 SP 承诺额、
// 各种清技术债都记重构、财报全员并列不发钱、别人的 Spot 出价不发给远端、远端提议结算和暂停电脑限流、快捷键不认自动重复、
// 远端重连被临时拒绝时接着重连、移出玩家时只给他看的窗不揭开
test.describe.configure({ timeout: 60_000 });
async function start(page, names = ['A', 'B', 'C']) {
  await page.addInitScript(() => { let s = 20261122; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto('/');
  await page.evaluate(n => { newGame({ names: n, diff: 'full', wa: true, timed: false, minutes: 90, learn: false, dlc: [] }); enterGame(); S.cur = 0; S.phase = 'roll'; UI.info = async () => {}; }, names);
}
// 房主这边假装连着一位远端玩家（座位 1）：发给他的消息记在 window.sent
const fakeHost = page => page.evaluate(() => {
  window.sent = []; const conn = { _seat: 1, open: true, send: m => sent.push(typeof m === 'string' ? JSON.parse(m) : m), close() {} };
  MP.role = 'host'; MP.seats = { 1: { name: 'B', conn, online: true } }; window.conn1 = conn;
});

test('旧版本停止支持：退回的一半扣掉这位主人下线时拿过的钱，他给这块买的 RI 作废', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(async () => {
    S.players[1].alive = S.players[2].alive = false;
    const p = S.players[0], i = IX.rds; S.props[i].owner = 0; S.props[i].paid = SQ[i].p; S.props[i].offDrawn = Math.round(SQ[i].p / 2) - 20; S.props[i].ri = 0;
    p.commits = [{ type: 'ri', svc: i, amt: 10, laps: 2, mark: true }];
    const c0 = p.cash; await eol();
    return { got: p.cash - c0, owner: S.props[i].owner, commits: p.commits.length };
  });
  expect(r).toEqual({ got: 20, owner: null, commits: 0 });
});

test('破产分给债主：只给没用过的保留卡和标记，用过的作废', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(async () => {
    const p = S.players[0], q = S.players[1];
    p.cards = [{ id: 'CE', used: true }, { id: 'ES', used: false }]; p.coe = [{ cat: 'sec', used: true }, { cat: 'avail', used: false }]; p.drill = [{ cat: 'sec', used: true }];
    q.cards = []; q.coe = []; q.drill = []; p.cash = 0; p.debt = [{ to: 1, amt: 500 }];
    await bankrupt(p);
    return { cards: q.cards.map(c => c.id), coe: q.coe.map(c => c.cat), drill: q.drill.length, ceImm: q.cards.some(x => x.id === 'CE' && x.used) };
  });
  expect(r).toEqual({ cards: ['ES'], coe: ['avail'], drill: 0, ceImm: false });
});

test('考全场、选对手：中途加入还没开始走的人不在名单里', async ({ page }) => {
  await start(page, ['A', 'B', 'C', 'D']);
  const r = await page.evaluate(async () => {
    S.players[3].joinRound = S.round + 1; const asked = [];
    window.askQuestion = async () => { asked.push(MP.actor); return true; };
    await quizAll();
    const pk = pickPartner('x'); await new Promise(r => setTimeout(r, 50));
    const labels = [...document.querySelectorAll('#modal .btns button')].map(b => b.textContent);
    document.querySelector('#modal .btns button:last-child').click(); await pk;
    return { asked, labels };
  });
  expect(r.asked).toEqual([1, 2]);
  expect(r.labels.some(t => t.includes('D'))).toBe(false);
});

test('角色技能免运行费：Savings Plans 承诺额照付，和 Credits 一样；预估账单也这么算', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(async () => {
    const p = S.players[0]; [IX.ec2, IX.ecs, IX.eks, IX.rds, IX.aurora, IX.sagemaker].forEach(i => { S.props[i].owner = 0; }); p.techDebt = 0;
    const raw = opCost(p), amt = Math.round(raw / 2);   // 承诺额签成用量的一半：照付这份，其余技能全免
    p.commits = [{ type: 'sp', amt, d: 0.25, laps: 3, scope: 'all' }];
    p.runMul = 0; p.runLaps = 2; const full = opCost(p), est = billAt(p, 0, ''), t0 = ST(p).runTot;
    await passLaunch(p);
    return { amt, full, est, paid: ST(p).runTot - t0, left: p.runLaps };
  });
  expect(r.amt).toBeGreaterThan(0);
  expect(r.full).toBeGreaterThan(r.amt);
  expect(r).toMatchObject({ est: r.amt, paid: r.amt, left: 1 });
});

test('各种清技术债的路都记「重构清过技术债」：高速部署的自动修复、金融合规的监管沙盒', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(async () => {
    const p = S.players[0], q = S.players[1]; p.techDebt = 1; p.refactored = false; q.techDebt = 2; q.refactored = false;
    await SPEED.find(c => c.c === 9).run(p);
    debtCleared(q);
    return [p.refactored, p.techDebt, q.refactored];
  });
  expect(r).toEqual([true, 0, true]);
});

test('季度财报：大家总资产一样时不融资也不审查', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(async () => {
    S.players.forEach(q => { q.cash = 1000; q.coe = []; q.techDebt = 0; }); OWNABLE.forEach(i => resetProp(i)); S.quarterCount = 3;
    const pot = S.pot; await quarterly(); return { cash: S.players.map(q => q.cash), pot: S.pot === pot };
  });
  expect(r).toEqual({ cash: [1000, 1000, 1000], pot: true });
});

test('发给远端的状态：别人的 Spot 出价看不到，观众都看不到，结束以后全亮', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(() => {
    const i = IX.ec2; Object.assign(S.props[i], { owner: 1, spot: true, spotPaid: 70, paid: 70 });
    const own = MP.stateFor(1).props[i], other = MP.stateFor(2).props[i], viewer = MP.stateFor('v').props[i], host = S.props[i].spotPaid;
    S.phase = 'over'; const over = MP.stateFor(2).props[i].spotPaid; S.phase = 'roll';
    return { own: own.spotPaid, other: [other.spotPaid, other.paid], viewer: viewer.spotPaid, host, over };
  });
  expect(r).toEqual({ own: 70, other: [0, 0], viewer: 0, host: 70, over: 70 });
});

test('远端提议结算：同时只挂一个，答复后 10 秒内不能再提；暂停电脑只在电脑的回合认', async ({ page }) => {
  await start(page);
  await fakeHost(page);
  const r = await page.evaluate(async () => {
    MP.onHostMsg(conn1, { t: 'endask' }); await new Promise(r => setTimeout(r, 30));
    const t1 = document.querySelector('#modal .box h3 span').textContent;
    MP.onHostMsg(conn1, { t: 'endask' }); MP.onHostMsg(conn1, { t: 'endask' });
    const spam = sent.filter(m => m.t === 'toast').length;
    document.querySelector('#modal .btns button:last-child').click(); await new Promise(r => setTimeout(r, 30));
    MP.onHostMsg(conn1, { t: 'endask' }); await new Promise(r => setTimeout(r, 30));
    const reopened = !document.querySelector('#modal').hidden;
    const p0 = AI_PAUSE; MP.onHostMsg(conn1, { t: 'aipause' }); const humanTurn = AI_PAUSE === p0;
    return { t1, spam, reopened, humanTurn };
  });
  expect(r.t1).toContain('提议现在结算');
  expect(r).toMatchObject({ spam: 2, reopened: false, humanTurn: true });
});

test('本机能取消的窗被流程弹窗顶掉时按取消结掉，等它的人收到答复', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(async () => {
    const a = UI.ask({ local: true, cancelable: true, title: 'a', buttons: [{ label: 'ok', value: true, cls: 'pri' }, { label: '取消', value: 'x' }] });
    await new Promise(r => setTimeout(r, 20));
    const b = UI.ask({ local: true, title: 'b', buttons: [{ label: 'ok', value: 1, cls: 'pri' }] });
    const v = await Promise.race([a, new Promise(r => setTimeout(() => r('hang'), 500))]);
    document.querySelector('#modal .btns button').click(); await b; return v;
  });
  expect(r).toBe('x');
});

test('快捷键：按住不放的自动重复不替玩家点弹窗按钮', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(async () => {
    const a = UI.ask({ title: 't', buttons: [{ label: 'one', value: 1, cls: 'pri' }, { label: 'two', value: 2 }] });
    await new Promise(r => setTimeout(r, 30)); document.activeElement.blur();
    for (const key of ['1', 'Enter', ' ']) document.body.dispatchEvent(new KeyboardEvent('keydown', { key, repeat: true, bubbles: true }));
    await new Promise(r => setTimeout(r, 30)); const open = !document.querySelector('#modal').hidden;
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }));
    return { open, v: await a };
  });
  expect(r).toEqual({ open: true, v: 2 });
});

test('远端重连被临时拒绝（带 retry）：不算被踢，接着自动重连；密码不对这类照旧停下', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(() => {
    let n = 0; MP.retryLater = () => { n++; }; if (!document.querySelector('#mpstat')) document.body.insertAdjacentHTML('beforeend', '<div id="mpstat"></div>');
    Object.assign(MP, { role: 'client', gone: true, kicked: false, mySeat: 1, hostConn: {} });
    MP.onClientMsg({ t: 'reject', why: '该玩家仍在线', retry: 1 });
    const a = { kicked: MP.kicked, retried: n, role: MP.role };
    MP.hostConn = {}; MP.onClientMsg({ t: 'reject', why: '密码不对' });
    return { a, final: MP.kicked, retried: n };
  });
  expect(r).toEqual({ a: { kicked: false, retried: 1, role: 'client' }, final: true, retried: 1 });
});

test('移出正在看只给他看的窗的玩家：房主这边不揭开，按放弃那一项结掉', async ({ page }) => {
  await start(page);
  await fakeHost(page);
  const r = await page.evaluate(async () => {
    const a = UI.ask({ who: 1, title: '秘密卡面', html: '<p>秘密正文</p>', priv: { title: 'B 在看卡', html: '<p>看不到</p>' }, buttons: [{ label: '收进手牌', value: 'keep' }, { label: '取消', value: -1 }] });
    await new Promise(r => setTimeout(r, 30));
    let leaked = false; const ob = new MutationObserver(() => { if (/秘密/.test(document.querySelector('#modal').textContent)) leaked = true; }); ob.observe(document.querySelector('#modal'), { subtree: true, childList: true, characterData: true });
    const veiled = !/秘密/.test(document.querySelector('#modal').textContent);
    S.cfg.ai = S.cfg.ai || []; MP.kick(1); const v = await a; ob.disconnect();
    return { veiled, leaked, v, ai: S.cfg.ai[1] };
  });
  expect(r).toEqual({ veiled: true, leaked: false, v: -1, ai: true });
});

// 一整轮：Impaired、强制下线不管在谁的回合被打中，都要所有人各走一回合后才在主人（by）回合开始恢复
test('Impaired 停一整轮：主人上家回合里被打中，主人下回合开始还没好，再过一轮才恢复；自己回合里被打中照旧下回合恢复', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(async () => {
    const a = IX.elb, b = IX.waf, c = IX.cognito; [a, b, c].forEach(i => { S.props[i].owner = 0; });
    const st = () => [S.props[a].impaired, S.props[b].impaired, S.props[c].ddos != null];
    S.cur = 0; impair([b]);                                   // 主人自己回合里打中
    await nextTurn(); await nextTurn();                       // 轮到主人的上家
    impair([a]); forceDown(c, 0, 1, 'rf');                    // 主人上家回合里打中（比如他踩中埋卡）
    const left = downLeft(c);
    await nextTurn(); const t1 = [S.cur, ...st()];
    await nextTurn(); await nextTurn(); await nextTurn(); const t2 = [S.cur, ...st()];
    return { left, t1, t2 };
  });
  expect(r.left).toBe(2);
  expect(r.t1).toEqual([0, true, false, true]);
  expect(r.t2).toEqual([0, false, false, false]);
});

test('老存档里没记打中时间的 Impaired、强制下线：照旧到主人下回合开始恢复', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(async () => {
    const a = IX.elb, c = IX.cognito; [a, c].forEach(i => { S.props[i].owner = 0; });
    S.cur = 2; Object.assign(S.props[a], { impaired: true }); Object.assign(S.props[c], { ddos: 0, ddosLeft: 1, ddosWhy: 'rf' });
    await nextTurn(); return [S.cur, S.props[a].impaired, S.props[c].ddos];
  });
  expect(r).toEqual([0, false, null]);
});

test('埋卡的人自己看得到埋在哪：棋盘角上一张小 Health 卡背、玩家卡上一行、格子详情一行；别的座位（远端收到的是删过的状态）看不到', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(() => {
    const i = OWNABLE[5], ids = Object.keys(INC).map(Number).filter(k => INC[k]).slice(0, 2);
    S.traps = [{ by: 0, sq: i, id: ids[0], round: 1 }, { by: 0, sq: i, id: ids[1], round: 1 }];
    S.cur = 0; render();
    const own = { cell: cellHtml(i), side: document.querySelector('#side').textContent, line: trapLine(i) };
    S.cur = 1; render();
    const other = { cell: cellHtml(i), side: document.querySelector('#side').textContent, line: trapLine(i) };
    // 联机远端：座位 1 收到的状态里别人埋的只剩 by；座位 0 收到自己的全份
    const view = seat => { __set_S(JSON.parse(JSON.stringify(MP.stateFor(seat)))); Object.assign(MP, { role: 'client', mySeat: seat, watching: false }); return { cell: cellHtml(i), line: trapLine(i) }; };
    const full = S, c1 = view(1); __set_S(full); const c0 = view(0); __set_S(full); MP.role = null;
    return { names: ids.map(k => INC[k].n), own, other, c1, c0 };
  });
  expect(r.own.cell).toContain('trapb many');
  for (const n of r.names) { expect(r.own.cell).toContain(n); expect(r.own.side).toContain(n); expect(r.own.line).toContain(n); }
  expect(r.other.cell).not.toContain('trapb');
  expect(r.other.line).toBe('');
  for (const n of r.names) expect(r.other.side).not.toContain(n);
  expect(r.c1.cell).not.toContain('trapb');
  expect(r.c1.line).toBe('');
  expect(r.c0.cell).toContain('trapb');
});
