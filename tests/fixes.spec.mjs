import { test, expect } from '@playwright/test';

// 一批规则 / 显示修复的回归测试：直接在页面里摆好局面（newGame + enterGame，再改格子主人、等级、现金、卡），
// 调真实的游戏函数；要弹窗的流程不等它返回，看 #modal 里的按钮再点。
test.describe.configure({ timeout: 60_000 });

async function start(page, cfg = {}) {
  // 固定随机数：角色分配、牌堆顺序每次都一样
  await page.addInitScript(() => { let s = 20261121; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto('/');
  await page.evaluate(cfg => {
    newGame({ names: ['A', 'B', 'C'], diff: 'full', wa: true, timed: false, minutes: 90, learn: false, ...cfg });
    enterGame();
    // 去掉独角兽开局送的 Route 53 之类的预设，角色统一成没有特殊折扣的 SaaS
    OWNABLE.forEach(i => { S.props[i].owner = null; S.props[i].level = 0; });
    S.players.forEach(q => { q.role = 'saas'; q.cash = 3000; q.cards = []; q.pos = 0; });
    S.cur = 0; S.phase = 'roll';
  }, cfg);
}
const modalBox = page => page.locator('#modal:not([hidden]) .box');
const btn = (page, text) => page.locator('#modal:not([hidden]) .btns button', { hasText: text });
// 不等异步游戏函数返回：结果放在 window.__r，完成后 window.__done = true
const run = (page, fn, arg) => page.evaluate(([src, arg]) => { window.__done = false; window.__r = undefined; (0, eval)(`(${src})`)(arg).then(r => { window.__r = r; window.__done = true; }); }, [fn.toString(), arg]);
const done = page => expect.poll(() => page.evaluate(() => window.__done), { timeout: 15_000 }).toBe(true);

test('单 AZ：EC2 第 1 级（自动 AMI）仍是单 AZ，第 2 级（跨 AZ Auto Scaling）不是；RDS 第 1 级是多 AZ', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(() => {
    S.props[IX.ec2].owner = 0; S.props[IX.rds].owner = 0; S.props[IX.rds].level = 1;
    const at = l => { S.props[IX.ec2].level = l; return singleAZ(IX.ec2); };
    return { l0: at(0), l1: at(1), l2: at(2), rds1: singleAZ(IX.rds) };
  });
  expect(r).toEqual({ l0: true, l1: true, l2: false, rds1: false });
});

test('娱乐模式：盲盒格不算进组，拿齐看得见的数据库就算整组；全是盲盒的组永远不算拿齐', async ({ page }) => {
  await start(page, { mode: 'party' });
  const r = await page.evaluate(() => {
    const p = S.players[0], db = GRP('db'), ctr = GRP('ctr');
    db.filter(i => !isHidden(i)).forEach(i => { S.props[i].owner = 0; });
    ctr.forEach(i => { S.props[i].owner = 0; });
    return { dbHasHidden: db.some(isHidden), ctrAllHidden: ctr.every(isHidden), db: ownsGroup(p, 'db'), ctr: ownsGroup(p, 'ctr') };
  });
  expect(r).toEqual({ dbHasHidden: true, ctrAllHidden: true, db: true, ctr: false });
});

test('娱乐模式：同色跳的目标不会是盲盒格', async ({ page }) => {
  await start(page, { mode: 'party' });
  const r = await page.evaluate(() => {
    const p = S.players[0]; S.props[IX.aurora].owner = 0; p.pos = IX.aurora;
    const j = jumpInfo(p, IX.aurora);
    return { nextDbHidden: isHidden(IX.dms), t: j && j.t, hidden: j ? isHidden(j.t) : null, want: IX.dynamodb };
  });
  expect(r.nextDbHidden).toBe(true);
  expect(r.hidden).toBe(false);
  expect(r.t).toBe(r.want);
});

test('娱乐模式：re:Invent「上了 Startup Showcase」前进到最近一块没人买、也不是盲盒的服务', async ({ page }) => {
  await start(page, { mode: 'party' });
  await page.evaluate(() => {
    S.players[0].pos = IX.vpc;   // 往前第一格是 ECR（盲盒）
    window.__to = null; moveTo = async (q, t) => { window.__to = t; q.pos = t; }; land = async () => {};
  });
  await run(page, () => drawReinvent(S.players[0], 20));
  // 亮卡窗（发牌动画期间不收点击）：一直点到函数返回
  await expect.poll(async () => {
    if (await page.evaluate(() => window.__done)) return true;
    await page.locator('#modal:not([hidden]) .btns button:not(:disabled)').first().click({ timeout: 1000 }).catch(() => {});
    return page.evaluate(() => window.__done);
  }, { timeout: 15_000 }).toBe(true);
  const r = await page.evaluate(() => ({ firstHidden: isHidden(IX.ecr), to: window.__to, hidden: window.__to == null ? null : isHidden(window.__to), want: IX.lambda }));
  expect(r.firstHidden).toBe(true);
  expect(r.hidden).toBe(false);
  expect(r.to).toBe(r.want);
});

test('Health #18：抽卡的人自己的服务宕机时可以用 Enterprise Support 抵消，只护住自己的', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const p = S.players[0]; p.pos = IX.vpc;   // 往前第一块有主的是 RDS
    S.props[IX.rds].owner = 0; S.props[IX.aurora].owner = 1;
    p.cards.push({ id: 'ES', used: false });
  });
  await run(page, () => incident(S.players[0], 18));
  await expect(modalBox(page)).toBeVisible();
  await expect(modalBox(page).locator('h3')).toContainText('要抵消');
  await btn(page, 'Enterprise Support').click();
  await expect(modalBox(page).locator('h3')).toContainText('宕机');
  await btn(page, '知道了').click();
  await done(page);
  const r = await page.evaluate(() => ({ rds: !!S.props[IX.rds].impaired, aurora: !!S.props[IX.aurora].impaired, esUsed: S.players[0].cards[0].used }));
  expect(r).toEqual({ rds: false, aurora: true, esUsed: true });
});

test('MAP 卡价格叠加 9 折购买券；Spot 出到全价不用掉购买券', async ({ page }) => {
  await start(page);
  const want = await page.evaluate(() => {
    const p = S.players[0]; p.buyCoupon = 0.9; p.cards.push({ id: 'MAP', used: false });
    return Math.round(SQ[IX.ec2].p * roleDisc(p, IX.ec2) * 0.7 * 0.9);
  });
  await run(page, () => offerBuy(S.players[0], IX.ec2));
  await expect(btn(page, '用 MAP 卡')).toHaveText(`用 MAP 卡 $${want}`);
  // 改走 Spot，出价拉到全价：等于按需购买，但没打券，券要留着
  await btn(page, 'Spot 购买').click();
  const full = await page.evaluate(() => SQ[IX.ec2].p);
  await page.locator('#in_bid').fill(String(full));
  await btn(page, '出价买下').click();
  await done(page);
  const r = await page.evaluate(() => ({ owner: S.props[IX.ec2].owner, spot: !!S.props[IX.ec2].spot, coupon: S.players[0].buyCoupon, map: S.players[0].cards[0].used }));
  expect(r).toEqual({ owner: 0, spot: false, coupon: 0.9, map: false });
});

test('落在自己的服务上选 FIS、再点「算了」：这次落地的动作没用掉', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { S.props[IX.s3].owner = 0; S.players[0].pos = IX.s3; });
  await run(page, () => offerLandingUpgrade(S.players[0], IX.s3));
  await btn(page, 'FIS').click();
  await btn(page, '算了').click();
  await done(page);
  expect(await page.evaluate(() => ({ r: window.__r, used: S.landAct.used }))).toEqual({ r: 'did', used: false });
});

test('格子面板里主人的名字按存的（已转义）写，名字叫 <!-- 不会插进一段 HTML 注释', async ({ page }) => {
  await start(page);
  const html = await page.evaluate(() => { S.players[0].name = esc('<!--'); S.props[IX.s3].owner = 0; S.props[IX.ecr].owner = 0; return sqPanelHtml(IX.s3) + sqPanelHtml(IX.ecr); });
  expect(html).not.toContain('<!--');
  expect(html).toContain('&lt;!--');
});

test('托管服务商自己的服务：格子上标的过路费含 9 折（和 payRent 一致）', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(() => {
    const p = S.players[0]; S.props[IX.ec2].owner = 0; S.props[IX.ec2].via = null;
    const base = shownRent(IX.ec2).r;
    p.role = 'rs_msp';
    return { base, msp: shownRent(IX.ec2).r };
  });
  expect(r.base).toBeGreaterThan(0);
  expect(r.msp).toBe(Math.round(r.base * 0.9));
});

test('可持续性支柱建议：有 EC2（没换 Graviton）不会建议升 Lambda 的省钱级；只有 S3 也会建议 S3 的智能分层', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(() => {
    const p = S.players[0];
    S.props[IX.ec2].owner = 0; S.props[IX.lambda].owner = 0;
    const a = pillarItems(p, 5).map(x => x.i);
    S.props[IX.ec2].owner = null; S.props[IX.lambda].owner = null; S.props[IX.s3].owner = 0;
    const b = pillarItems(p, 5).map(x => x.i);
    return { ec2: a.includes(IX.ec2), lambda: a.includes(IX.lambda), s3: b.includes(IX.s3) };
  });
  expect(r).toEqual({ ec2: true, lambda: false, s3: true });
});

test('结算中（不在掷骰子前后）举报作弊不受理，被举报的人不进维护窗口', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(() => {
    S.cheats = { 0: { by: 1, r: S.round, c: S.cur } }; S.phase = 'busy';
    const why = reportCheat(0, 0);
    return { why, jail: S.players[1].jail, rep: !!S.cheats[0].rep };
  });
  expect(r.why).toBeTruthy();
  expect(r.jail).toBeNull();
  expect(r.rep).toBe(false);
});

test('合作伙伴梳理架构：前主人绑过的万能服务不能拿来改绑，改领 $100', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(async () => {
    const p = S.players[0];
    [IX.ecr, IX.ecs, IX.elb, IX.cloudwatch].forEach(i => { S.props[i].owner = 0; });
    S.props[IX.cloudwatch].wild = { p: 1, c: 'ctr' };   // 交易换过手：绑定还记在前主人名下
    const card = REI.find(c => c && c.n === '请合作伙伴梳理了一遍架构');
    const c0 = p.cash;
    const st = await Promise.race([card.run(p, []).then(() => 'done'), new Promise(res => setTimeout(() => res('pending'), 3000))]);
    return { st, modal: !document.querySelector('#modal').hidden, gain: p.cash - c0, wild: S.props[IX.cloudwatch].wild };
  });
  expect(r.st).toBe('done');
  expect(r.modal).toBe(false);
  expect(r.gain).toBeGreaterThan(0);
  expect(r.wild).toEqual({ p: 1, c: 'ctr' });
});

test('技能免费升级的日志：等级名后面没有多出来的「」」', async ({ page }) => {
  await start(page);
  const line = await page.evaluate(async () => {
    const p = S.players[0]; p.role = 'legacy'; S.props[IX.ec2].owner = 0;
    await roleSkill(p);
    return S.log.map(String).find(t => t.includes('免费给'));
  });
  expect(line).toBeTruthy();
  const text = line.replace(/<[^>]+>/g, '');
  expect(text).toContain('EC2');
  expect(text).not.toContain('」」');
  expect((text.match(/「/g) || []).length).toBe((text.match(/」/g) || []).length);
});

test("格子悬停提示里的名字按原样显示：O'Neil 不会写成 O&#39;Neil", async ({ page }) => {
  await start(page);
  const r = await page.evaluate(() => {
    S.players[0].name = esc("O'Neil");
    // 万能服务绑在 O'Neil 的架构上；O'Neil 差一块 ELB 凑成容器平台
    S.props[IX.cloudwatch].owner = 0; S.props[IX.cloudwatch].wild = { p: 0, c: 'thumb' };
    S.props[IX.ecr].owner = 0; S.props[IX.ecs].owner = 0;
    render();
    return { stored: S.players[0].name, wild: sqTip(IX.cloudwatch), elb: document.querySelector('#sq' + IX.elb).title };
  });
  expect(r.stored).toBe('O&#39;Neil');
  expect(r.wild).toContain("已绑到 O'Neil");
  expect(r.elb).toContain("能帮 O'Neil 补齐");
  expect(r.wild + r.elb).not.toContain('&#39;');
});
