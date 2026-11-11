import { test, expect } from '@playwright/test';
import { connectRTC, state, sameState, world, hostGame, observerHello } from './support/rtc.mjs';

test.use({ launchOptions: { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] } });

test('真实 WebRTC：房主、玩家与两位观众中途加入、走棋、增量、弹窗及恶意操作隔离', async ({ browser }) => {
  await world(browser, async page => {
    const host = await hostGame(page), player = await page(), a = await page(), b = await page();
    const name = await host.evaluate(() => unesc(S.players[1].name));
    await connectRTC(host, player, { t: 'hello', name, auth: 'player-secret', keys: ['seat-key'], delta: 1, walk: 1 });
    await expect.poll(() => player.evaluate(() => MP.mySeat)).toBe(1);
    const before = await state(host);
    for (const c of [a, b]) await connectRTC(host, c, await observerHello(host));
    await sameState(host, [player, a, b]); expect(await state(host)).toEqual(before);
    for (const c of [a, b]) expect(await c.evaluate(() => ({ role: MP.role, watching: MP.watching, seat: MP.mySeat }))).toEqual({ role: 'client', watching: true, seat: null });
    await host.evaluate(async () => { S.phase = 'busy'; S.players[0].pos = 22; MP.pushState(true); await moveSteps(S.players[0], 6); S.phase = 'roll'; MP.pushState(true); });
    await sameState(host, [player, a, b]);
    for (const c of [a, b]) {
      await expect.poll(() => c.evaluate(() => !MPFX.busy && MPFX.mv === null)).toBe(true);
      expect(await c.evaluate(() => received.some(m => m.t === 'fx' && m.k === 'walk'))).toBe(true);
    }
    // 决策属于玩家 1：玩家可回答、观众只能看。先绕过 UI 直接从通道发送恶意消息。
    await host.evaluate(() => { window.chosen = null; modal({ title: '权限隔离测试', who: 1, inputs: [{ id: 'n', value: 5 }], buttons: [{ label: '确认选择', value: 'yes', cls: 'pri' }] }).then(v => { window.chosen = v.v; }); });
    for (const c of [a, b]) { await expect(c.locator('#modal')).toBeVisible(); await expect(c.locator('#modal .btns button')).toBeDisabled(); await expect(c.locator('#in_n')).toBeDisabled(); }
    await expect(player.locator('#modal .btns button')).toBeEnabled();
    const held = await state(host), mid = await host.evaluate(() => MP.cur.id);
    await a.evaluate(mid => {
      const msgs = [...Object.keys(MP.ACTS).map(a => ({ t: 'act', a })), { t: 'ans', id: mid, k: 0 }, { t: 'rename', name: '冒名' }, { t: 'aipause' }, { t: 'endask' }, { t: 'cheat', c: 'cash', a: ['99999'] }, { t: 'report', id: 1 }, { t: 'hello', mode: 'player', name: '冒名', auth: 'player-secret' }];
      for (const m of msgs) rtcChannel.send(JSON.stringify({ ...m, seat: 1, who: 1 }));
      // 补发请求作为同一有序通道上的屏障，确认前面的恶意消息已被处理。
      received.length = 0; rtcChannel.send(JSON.stringify({ t: 'resync' }));
    }, mid);
    await expect.poll(() => a.evaluate(() => received.some(m => m.t === 'state' && !m.delta))).toBe(true);
    expect(await state(host)).toEqual(held); expect(await host.evaluate(() => chosen)).toBe(null);
    await player.locator('#modal .btns button').click(); await expect.poll(() => host.evaluate(() => chosen)).toBe('yes');
    await sameState(host, [player, a, b]);
  });
});

test('观众重连、丢失增量补发与邀请轮换：玩家/座位/回合不受影响', async ({ browser }) => {
  await world(browser, async page => {
    const host = await hostGame(page), a = await page(); const hello = await observerHello(host);
    const index = await connectRTC(host, a, hello); await sameState(host, [a]); const before = await state(host);
    await a.evaluate(() => { MP.onClientMsg({ t: 'state', S: JSON.parse(JSON.stringify(S)), delta: { from: -1 } }); });
    await expect.poll(() => a.evaluate(() => MP.resync)).toBe(0); await sameState(host, [a]);
    await host.evaluate(i => rtcLinks[i].channel.close(), index);
    await expect.poll(() => host.evaluate(() => Object.keys(MP.viewers).length)).toBe(0);
    await connectRTC(host, a, hello); await sameState(host, [a]); expect(await state(host)).toEqual(before);
    await host.evaluate(() => MP.setWatching(true));
    await expect.poll(() => a.evaluate(() => MP.kicked && MP.gone)).toBe(true);
    expect(await a.evaluate(() => MP.role)).toBe('client'); expect(await state(host)).toEqual(before);
    const stale = await page(); await connectRTC(host, stale, hello);
    await expect.poll(() => stale.evaluate(() => received.some(m => m.t === 'reject'))).toBe(true);
    expect(await host.evaluate(() => Object.keys(MP.viewers).length)).toBe(0);
    const fresh = await page(); await connectRTC(host, fresh, await observerHello(host)); await sameState(host, [fresh]);
  });
});

test('真实玩家鉴权：缺钥匙待审批、房主确认、钥匙轮换、旧连接和重复 hello 隔离', async ({ browser }) => {
  await world(browser, async page => {
    const host = await hostGame(page), client = await page(); const name = await host.evaluate(() => unesc(S.players[1].name));
    await connectRTC(host, client, { t: 'hello', auth: 'player-secret', name });
    await expect.poll(() => client.evaluate(() => received.some(m => m.t === 'pending'))).toBe(true);
    expect(await host.evaluate(() => MP.seats[1].online)).toBe(false);
    await host.locator('.gmenu').evaluate(e => { e.open = true; });
    await host.getByRole('button', { name: `确认入座：${name}`, exact: true }).click();
    await expect(host.getByRole('dialog', { name: '确认玩家身份', exact: true })).toBeVisible();
    await host.getByRole('button', { name: '已确认本人，允许入座', exact: true }).click();
    await expect.poll(() => client.evaluate(() => MP.mySeat)).toBe(1); await sameState(host, [client]);
    const key = await client.evaluate(() => MP.seatKeys('ABCDEF')[0]); expect(key).toHaveLength(32);
    const newer = await page(); await connectRTC(host, newer, { t: 'hello', auth: 'player-secret', name, keys: [key] });
    await expect.poll(() => newer.evaluate(() => MP.mySeat)).toBe(1);
    const before = await state(host);
    await host.evaluate(() => { const old = rtcLinks[0].conn; MP.onHostMsg(old, { t: 'rename', name: '旧连接越权' }); MP.onHostMsg(old, { t: 'aipause' }); });
    await newer.evaluate(() => rtcChannel.send(JSON.stringify({ t: 'hello', name: '第二座位', auth: 'player-secret' })));
    await expect.poll(() => host.evaluate(() => Object.keys(MP.seats).length)).toBe(1); expect(await state(host)).toEqual(before);
  });
});

test('观战界面：独立邀请、手机只读操作、资料和外观可用，游戏与本地存档不变', async ({ browser }) => {
  await world(browser, async page => {
    const host = await hostGame(page), a = await page(false, { width: 390, height: 844 });
    await host.locator('.gmenu').evaluate(e => { e.open = true; });
    await host.getByRole('button', { name: '受邀观战（0/4）', exact: true }).click();
    await expect(host.getByRole('dialog', { name: '受邀观战', exact: true })).toBeVisible();
    await expect(host.locator('#vmodal code')).toHaveText(await host.evaluate(() => MP.watchToken));
    await host.getByRole('button', { name: '关闭窗口', exact: true }).click();
    await a.evaluate(() => localStorage.setItem(KEY, '本机原有存档'));
    await connectRTC(host, a, await observerHello(host)); await sameState(host, [a]); const before = await state(host);
    await expect(a.locator('.mpme')).toHaveText('受邀观战 · 只读');
    await a.locator('#center .gmenu').evaluate(e => { e.open = true; });
    await expect(a.locator('button[onclick="renameDialog()"]')).toBeHidden();
    await expect(a.locator('button[onclick="MP.proposeEnd()"]')).toBeHidden();
    await a.locator('[data-theme-select]:visible').selectOption('dark');
    await a.evaluate(() => { showManual(); }); await expect(a.locator('#vmodal')).toBeVisible();
    await a.evaluate(() => { if (VIEW_CUR) VIEW_CUR.cancel(); save(); });
    expect(await a.evaluate(() => localStorage.getItem(KEY))).toBe('本机原有存档'); expect(await state(host)).toEqual(before);
    // 观众客户端自身也拒绝发送操作；服务端隔离已在第一个测试绕过此保护验证。
    expect(await a.evaluate(() => { const n = sent.length; MP.send(MP.hostConn, { t: 'aipause' }); return sent.length - n; })).toBe(0);
  });
});

test('观众可在大厅等待下一局，重新开局后的角色始终只读，存档仍不被覆盖', async ({ browser }) => {
  await world(browser, async page => {
    const host = await hostGame(page), a = await page(); await connectRTC(host, a, await observerHello(host)); await sameState(host, [a]);
    await host.evaluate(() => MP.again());
    await expect(a.locator('#setup')).toBeVisible(); expect(await a.evaluate(() => ({ seat: MP.mySeat, watching: MP.watching, role: MP.role, S }))).toEqual({ seat: null, watching: true, role: 'client', S: null });
    await expect(a.locator('#startBtn')).toBeDisabled();
    // 从同一发布页取新的演示局，注入房主以避免测试依赖开局的角色抽签随机流程。
    const sample = await page(true); const next = await state(sample);
    await host.evaluate(next => { S = next; S.cur = 0; S.phase = 'roll'; MP.pushState(true); }, next);
    await sameState(host, [a]); expect(await a.evaluate(() => MP.watching && MP.mySeat === null)).toBe(true);
  });
});

test('单 index 本地文件：移动中加入与补发收敛，观众动画不写状态，禁用存储仍可观看', async ({ browser }) => {
  await world(browser, async page => {
    const host = await hostGame(page), a = await page();
    await a.evaluate(() => { Storage.prototype.getItem = () => { throw new Error('blocked'); }; Storage.prototype.setItem = () => { throw new Error('blocked'); }; });
    await host.evaluate(() => { S.phase = 'busy'; S.cfg.anim = 'std'; S.players[0].pos = 30; window.running = moveSteps(S.players[0], 12); });
    await connectRTC(host, a, await observerHello(host));
    await expect.poll(() => a.evaluate(() => received.some(m => m.t === 'state'))).toBe(true);
    await host.evaluate(async () => { await running; S.phase = 'roll'; MP.pushState(true); }); await sameState(host, [a]);
    await expect.poll(() => a.evaluate(() => !MPFX.busy && MPFX.mv === null)).toBe(true);
    const before = await state(a);
    await host.evaluate(() => fxCast('walk', { seq: (MP.walkSeq || 0) + 1, p: 0, from: S.players[0].pos, path: [(S.players[0].pos + 1) % N], ms: 50, last: true }));
    await expect.poll(() => a.evaluate(() => received.some(m => m.t === 'fx' && m.k === 'walk'))).toBe(true);
    expect(await state(a)).toEqual(before);
  }, new URL('../code/index.html', import.meta.url).href);
});

test('受邀观众昵称按文本显示；决策期间加入只读，邀请与审批窗口不会广播给其他人', async ({ browser }) => {
  await world(browser, async page => {
    const host = await hostGame(page), a = await page();
    await host.evaluate(() => { modal({ title: '正在进行的决策', who: 0, buttons: [{ label: '房主确认', value: true }] }); });
    await connectRTC(host, a, await observerHello(host, '<b>解说</b>'));
    await expect(a.locator('#modal h3')).toContainText('正在进行的决策'); await expect(a.locator('#modal .btns button')).toBeDisabled();
    await host.evaluate(() => { MP.watchDialog(); });
    await expect(host.getByRole('button', { name: '移出观众：<b>解说</b>', exact: true })).toBeVisible();
    expect(await host.locator('#vmodal .btns button b').count()).toBe(0);
    expect(await a.evaluate(() => received.filter(m => m.t === 'modal').map(m => m.spec.title))).toEqual(['正在进行的决策']);
    await host.getByRole('button', { name: '关闭窗口', exact: true }).click();
    await host.locator('#modal .btns button').click();
    await expect(a.locator('#modal')).toBeHidden();
  });
});
