import { test, expect } from '@playwright/test';

// 第三轮修复：下线只拿一次钱、抢 Spot 清掉原主人的东西、大重构算重构、Spot 卡出到全价留着、回合编号座位占两位、
// re:Invent 牌堆抽完、电脑掷骰子前清技术债、全场事件不能甩锅、远端看不到弃牌堆、信令服务器什么时候走 wss。
// 跟 fixes.spec.mjs 一样：在页面里摆好局面，调真实的游戏函数；要弹窗的不等它返回，看 #modal 里的按钮再点。
test.describe.configure({ timeout: 60_000 });

async function start(page, cfg = {}, url = '/') {
  await page.addInitScript(() => { let s = 20261123; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto(url);
  await page.evaluate(cfg => {
    newGame({ names: ['A', 'B', 'C'], diff: 'full', wa: true, timed: false, minutes: 90, learn: false, dlc: [], ...cfg });
    enterGame();
    OWNABLE.forEach(i => { S.props[i] = { owner: null, level: 0, cap: 0, spot: false, spotPaid: 0, impaired: false, offline: 0, offCash: 0 }; });
    S.players.forEach(q => { q.role = 'saas'; q.cash = 3000; q.cards = []; q.coe = []; q.drill = []; q.pos = 5; q.techDebt = 0; q.skip = 0; q.jail = null; });
    S.cur = 0; S.phase = 'roll';
  }, cfg);
}
const modalBox = page => page.locator('#modal:not([hidden]) .box');
const btn = (page, text) => page.locator('#modal:not([hidden]) .btns button', { hasText: text });
const run = (page, fn, arg) => page.evaluate(([src, arg]) => { window.__done = false; window.__r = undefined; (0, eval)(`(${src})`)(arg).then(r => { window.__r = r; window.__done = true; }); }, [fn.toString(), arg]);
const done = page => expect.poll(() => page.evaluate(() => window.__done), { timeout: 15_000 }).toBe(true);

test('下线：同一个主人手里只拿一次钱；恢复上线后不能再下线，卖回、估值照样扣；换了主人才清零', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(() => {
    const p = S.players[0], i = IX.ec2, half = Math.round(SQ[i].p / 2); S.props[i].owner = 0;
    const c0 = p.cash; takeOffline(p, i); const got1 = p.cash - c0;
    bringOnline(p, i);
    const c1 = p.cash; takeOffline(p, i);
    return { got1: got1 === half, spent: offSpent(i), again: S.props[i].offline, got2: p.cash - c1,
      sell: sellValue(i) === Math.round(SQ[i].p * BAL.sell) - half, full: fullBack(i) === SQ[i].p - half, svc: valBreak(p).svc === SQ[i].p - half };
  });
  expect(r).toEqual({ got1: true, spent: true, again: 0, got2: 0, sell: true, full: true, svc: true });
  // 资产管理里「下线」灰掉，写着原因
  await run(page, () => manage(S.players[0]));
  await expect(page.locator('#modal:not([hidden]) button[disabled][title="这块服务在你手里已经下线拿过一次钱了"]')).toBeVisible();
  await btn(page, '关闭').click(); await done(page);
  // 交易给别人：新主人没拿过，能再下线拿一次
  const t = await page.evaluate(() => { handOver(S.players[0], IX.ec2, S.players[1]); return { owner: S.props[IX.ec2].owner, drawn: offDrawn(IX.ec2), spent: offSpent(IX.ec2), cash: offlineCash(IX.ec2) === Math.round(SQ[IX.ec2].p / 2) }; });
  expect(t).toEqual({ owner: 1, drawn: 0, spent: false, cash: true });
});

test('抢 Spot：原主人的 RI 作废；被打下线的 Spot 不能抢', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const pr = S.props[IX.ec2]; Object.assign(pr, { owner: 1, spot: true, spotPaid: 60, paid: 60, ri: { laps: 2 } });
    S.players[1].commits = [{ type: 'ri', svc: IX.ec2, laps: 2 }]; S.players[0].pos = IX.ec2; S.lastDice = [3, 4];
  });
  await run(page, () => spotTakeover(S.players[0], IX.ec2));
  await page.locator('#in_bid').fill(String(await page.evaluate(() => SQ[IX.ec2].p)));
  await btn(page, '出价抢过来').click();
  await done(page);
  const r = await page.evaluate(() => ({ took: window.__r, owner: S.props[IX.ec2].owner, ri: S.props[IX.ec2].ri, commits: S.players[1].commits.length, spot: S.props[IX.ec2].spot }));
  expect(r).toEqual({ took: true, owner: 0, ri: null, commits: 0, spot: false });
  // 被 DDoS 打下线的：不弹出价窗，直接照常结算
  await page.evaluate(() => { Object.assign(S.props[IX.ec2], { owner: 1, spot: true, spotPaid: 60, ddos: 2, ddosLeft: 1 }); });
  await run(page, () => spotTakeover(S.players[0], IX.ec2));
  await done(page);
  expect(await page.evaluate(() => ({ took: window.__r, owner: S.props[IX.ec2].owner }))).toEqual({ took: false, owner: 1 });
});

test('攒满 3 个技术债的大重构也算「重构清过技术债」；技术债加价的 $50 不记进升级实付', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(async () => {
    const p = S.players[0]; p.techDebt = 2; p.refactored = false; await penalize(p);
    const q = S.players[1], i = IX.s3; S.props[i].owner = 1; q.techDebt = 2; q.pos = i; const u = upgradeInfo(q, i, true); doUpgrade(q, i, true);
    return { ref: p.refactored, debt: p.techDebt, sur: u.sur, paid: S.props[i].upPaid[0] === u.cost - 50, back: stripValue(i) === Math.round((u.cost - 50) / 2) };
  });
  expect(r).toEqual({ ref: true, debt: 0, sur: 50, paid: true, back: true });
});

test('Spot 卡：出价出到全价就是按需购买，Spot 卡留着；出得比全价低才用掉', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { S.players[0].cards.push({ id: 'SPOT', used: false }); });
  await run(page, () => offerBuy(S.players[0], IX.ec2));
  await btn(page, 'Spot 购买').click();
  await page.locator('#in_bid').fill(String(await page.evaluate(() => SQ[IX.ec2].p)));
  await btn(page, '出价买下').click();
  await done(page);
  expect(await page.evaluate(() => ({ owner: S.props[IX.ec2].owner, spot: !!S.props[IX.ec2].spot, card: S.players[0].cards[0].used }))).toEqual({ owner: 0, spot: false, card: false });
  await run(page, () => offerBuy(S.players[0], IX.ecs));
  await btn(page, 'Spot 购买').click();
  await page.locator('#in_bid').fill('50');
  await btn(page, '出价买下').click();
  await done(page);
  expect(await page.evaluate(() => ({ spot: !!S.props[IX.ecs].spot, card: S.players[0].cards[0].used }))).toEqual({ spot: true, card: true });
});

test('回合编号：12 个座位也不撞号；老存档里记的 round × 10 + 座位读档时换算', async ({ page }) => {
  await start(page);
  const k = await page.evaluate(() => { const a = []; for (const [r, c] of [[1, 11], [2, 1], [1, 10], [2, 0]]) { S.round = r; S.cur = c; a.push(turnKey()); } return a; });
  expect(new Set(k).size).toBe(4);
  const r = await page.evaluate(async () => {
    S.round = 2; S.cur = 1; delete S.tk;
    Object.assign(S.props[IX.ec2], { owner: 1, offline: 2, offTurn: 13, offTurnSeen: 21, offCash: 50 });
    S.players[1].handWalk = 21; S.players[1].chTurn = 21; S.landAct = { k: 21, i: IX.s3, p: 1, used: false };
    localStorage.setItem(KEY, JSON.stringify(S));
    await resumeGame();
    const pr = S.props[IX.ec2];
    return { tk: S.tk, off: [pr.offTurn, pr.offTurnSeen], hw: S.players[1].handWalk, ch: S.players[1].chTurn, la: S.landAct.k, now: turnKey(), walked: handWalked(S.players[1]), drawn: pr.offDrawn };
  });
  expect(r).toEqual({ tk: 100, off: [103, 201], hw: 201, ch: 201, la: 201, now: 201, walked: true, drawn: 50 });
});

test('re:Invent 牌堆和弃牌堆都空了：抽卡改领 $50；User Group 活动抽 3 张改领 $100，不报错', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(async () => {
    S.rei = []; S.reiDisc = []; const p = S.players[0], c0 = p.cash;
    const x = await drawRei(); await drawReinvent(p);
    return { x, got: p.cash - c0 };
  });
  expect(r).toEqual({ x: null, got: 50 });
  await page.evaluate(() => { S.players[0].pos = IX.free; window.__c0 = S.players[0].cash; });
  await run(page, () => land(S.players[0]));
  await btn(page, 're:Invent 卡选一张').click();
  await done(page);
  expect(await page.evaluate(() => S.players[0].cash - window.__c0)).toBe(100);
});

test('电脑掷骰子前重构清技术债进了维护窗口：和真人一样这回合到此为止，不当场出来', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    S.cfg.ai = [true, false, false]; const p = S.players[0]; p.techDebt = 2; p.cash = 3000; p.pos = 5;
    S.turnStartAt = 0; render(); aiKick();
  });
  await expect.poll(() => page.evaluate(() => S.cur), { timeout: 10_000 }).toBe(1);
  expect(await page.evaluate(() => ({ jail: S.players[0].jail, cat: S.players[0].jailCat, debt: S.players[0].techDebt, pos: S.players[0].pos === IX.jail }))).toEqual({ jail: 0, cat: 'rf', debt: 1, pos: true });
});

test('黑色星期五大促（全场事件）：抽到的人在监管沙盒里也照样全场结算，不能甩锅；沙盒里的人自己不受影响', async ({ page }) => {
  await start(page, { dlc: ['inc26'] });
  const r = await page.evaluate(async () => {
    const id = INC.findIndex(c => c && c.n === '黑色星期五大促'), p = S.players[0];
    p.immuneTill = S.round; p.cards.push({ id: 'BLAME', used: false });
    S.props[IX.ec2].owner = 1; S.props[IX.rds].owner = 0;
    await incident(p, id);
    return { all: !!INC[id].all, other: S.props[IX.ec2].impaired, mine: S.props[IX.rds].impaired, blame: p.cards[0].used, debt: p.techDebt, log: S.log.slice(0, 4).join('').includes('监管沙盒') };
  });
  expect(r).toEqual({ all: true, other: true, mine: false, blame: false, debt: 0, log: true });
});

test('Health #13、#19：CloudWatch 下线时钱进奖池；对方 VPC 被打下线时借不了 Session Manager', async ({ page }) => {
  await start(page);
  const cw = await page.evaluate(async () => {
    const p = S.players[0], o = S.players[1];
    S.props[IX.cloudwatch].owner = 1; S.props[IX.cloudwatch].ddos = 2; S.props[IX.cloudwatch].ddosLeft = 1;
    const oc = o.cash, pot = S.pot; await incident(p, 13);
    return { owner: o.cash - oc, pot: S.pot - pot };
  });
  expect(cw).toEqual({ owner: 0, pot: 100 });
  await page.evaluate(() => { Object.assign(S.props[IX.vpc], { owner: 1, level: 2, ddos: 2, ddosLeft: 1 }); S.props[IX.ec2].owner = 0; window.__oc = S.players[1].cash; });
  await run(page, () => incident(S.players[0], 19));
  // 没有「借用 Session Manager？」，直接到抵消窗（别人没有暴露的实例，可以请他托管）
  await expect(modalBox(page)).toContainText('要抵消');
  await btn(page, '不抵消').click();
  await done(page);
  expect(await page.evaluate(() => S.players[1].cash - window.__oc)).toBe(0);
});

test('代理商的库存换到客户手里买价按原价；咨询合作伙伴的估值按买过的客户算，卖掉了也算', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(() => {
    const rs = S.players[1], c = S.players[0]; rs.reseller = true; rs.role = 'rs_cons';
    S.props[IX.ec2].owner = 1; S.props[IX.ec2].paid = Math.round(SQ[IX.ec2].p / 2);
    handOver(rs, IX.ec2, c);
    const basis = buyPaid(IX.ec2) === SQ[IX.ec2].p;
    const a0 = valBreak(rs).arch; rsSold(rs, c); rsSold(rs, c);
    return { basis, plus: valBreak(rs).arch - a0, ever: rs.rsEver };
  });
  expect(r).toEqual({ basis: true, plus: 100, ever: [0] });
});

test('联机：远端拿到的状态里弃牌堆只有张数；被移出房间的座位手牌放回弃牌堆', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(() => {
    S.reiDisc = [3, 5, 7]; S.players[1].hand = [9, 10];
    const v = MP.stateFor(0);
    return { disc: v.reiDisc, mine: S.reiDisc, hand: v.players[1].hand };
  });
  expect(r).toEqual({ disc: [0, 0, 0], mine: [3, 5, 7], hand: [0, 0] });
  const k = await page.evaluate(() => { S.cfg.ai = S.cfg.ai || []; MP.role = 'host'; MP.seats[1] = { name: 'B', conn: null, online: false }; MP.kick(1); const out = { hand: S.players[1].hand.length, disc: S.reiDisc.length, ai: S.cfg.ai[1] }; MP.role = null; return out; });
  expect(k).toEqual({ hand: 0, disc: 5, ai: true });
});

test('信令服务器：局域网地址在 http 页面走 ws，互联网地址一律 wss；网址参数不合法就不用', async ({ page }) => {
  await page.route('**/peer-config.json', r => r.fulfill({ status: 404, body: '' }));
  await page.goto('/?peerhost=192.168.1.5&peerport=9000');
  let o = await page.evaluate(() => ({ c: sigConf(), opts: MP.peerOpts() }));
  expect(o.c).toMatchObject({ host: '192.168.1.5', port: 9000, src: 'url' });
  expect(o.opts).toMatchObject({ host: '192.168.1.5', port: 9000, secure: false });
  await page.goto('/?peerhost=peer.example.com&peerport=8080');
  o = await page.evaluate(() => ({ c: sigConf(), opts: MP.peerOpts() }));
  expect(o.opts).toMatchObject({ host: 'peer.example.com', port: 8080, secure: true });
  // 网址参数里的域名不合法：当没写，退回默认（这里是公共 PeerJS）
  await page.goto('/?peerhost=' + encodeURIComponent('evil host<x>'));
  expect(await page.evaluate(() => sigConf().src)).toBe('public');
  const lan = await page.evaluate(() => ({
    https: sigSecure('192.168.1.5', 'https:'), http: sigSecure('192.168.1.5', 'http:'), pub: sigSecure('peer.example.com', 'http:'),
    yes: ['localhost', '127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.9.9', '192.168.0.1', '169.254.1.1', 'nas.local', 'pi.lan', 'box.home.arpa', 'gamebox', '::1', 'fd12:3456::1', 'fe80::1', '[::1]'].filter(h => !isLanHost(h)),
    no: ['8.8.8.8', '172.32.0.1', '172.15.0.1', '192.169.0.1', 'peer.example.com', '2001:db8::1', ''].filter(h => isLanHost(h)),
  }));
  expect(lan).toEqual({ https: true, http: false, pub: true, yes: [], no: [] });
  // peer-config.json 没写端口：局域网 http 页面默认 80，互联网地址默认 443
  for (const [host, port] of [['10.0.0.2', 80], ['peer.example.com', 443]]) {
    await page.unroute('**/peer-config.json');
    await page.route('**/peer-config.json', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ host }) }));
    await page.goto('/'); await page.evaluate(() => sigInit());
    expect(await page.evaluate(() => MP.peerOpts())).toMatchObject({ host, port, secure: port === 443 });
  }
});
