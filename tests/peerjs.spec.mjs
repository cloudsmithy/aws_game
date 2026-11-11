import { test, expect } from '@playwright/test';
import { peerWorld, playingRoom, rollTurn } from './support/peerjs.mjs';
import { sameState } from './support/rtc.mjs';

test.use({ launchOptions: { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] } });

// 读档会给旧存档补零值字段；比较所有业务字段前，只归一化这三个已有迁移默认值。
const businessState = page => page.evaluate(() => ({
  players: S.players.map(p => ({ ...p, buyCoupon: p.buyCoupon || 0, rsCoupon: p.rsCoupon || 0, commits: p.commits || [] })),
  props: S.props, cur: S.cur, phase: S.phase
}));

test('生产 PeerJS 与本地 PeerServer：真实建房/入房、观战、正常轮转与数据连接自动重连', async ({ browser, request }) => {
  test.setTimeout(60_000);
  await peerWorld(browser, async page => {
    const { host, player, viewers: [viewer] } = await playingRoom(page);
    await expect(viewer.locator('.mpme')).toHaveText('受邀观战 · 只读');
    const rtc = await viewer.evaluate(async () => [...(await MP.hostConn.peerConnection.getStats()).values()].filter(r => r.type === 'data-channel').map(r => ({ state: r.state, received: r.messagesReceived })));
    expect(rtc.some(r => r.state === 'open' && r.received > 0)).toBe(true);
    await rollTurn(host, player, 0); await rollTurn(host, player, 1); await sameState(host, [player, viewer]);
    const before = await viewer.evaluate(() => MP.hostConn.connectionId);
    await viewer.evaluate(() => MP.hostConn.close());
    await expect.poll(() => viewer.evaluate(() => MP.gone)).toBe(true);
    await expect.poll(() => viewer.evaluate(old => !MP.gone && MP.hostConn.connectionId !== old, before), { timeout: 15000 }).toBe(true);
    expect(await viewer.evaluate(() => MP.hostConn.connectionId)).not.toBe(before);
    await sameState(host, [player, viewer]);
    const signal = await (await request.get('/__test/signal')).json();
    expect(signal.counts.OFFER).toBeGreaterThanOrEqual(3); expect(signal.counts.ANSWER).toBeGreaterThanOrEqual(3);
  });
});

test('真实信令 WebSocket 中断：已有 P2P 继续走棋，房主自动重连后新观众可入场', async ({ browser, request }) => {
  test.setTimeout(45_000);
  await peerWorld(browser, async page => {
    const { host, player, viewers: [viewer], room, invite } = await playingRoom(page);
    const peer = await host.evaluate(() => MP.peer.id);
    try {
      await request.post('/__test/signal?peer=' + peer + '&block=1');
      await expect.poll(() => host.evaluate(() => MP.peer.disconnected)).toBe(true);
      expect(await viewer.evaluate(() => MP.hostConn.open && !MP.gone)).toBe(true);
      await rollTurn(host, player, 0); await sameState(host, [player, viewer]);
    } finally { await request.post('/__test/signal?peer=' + peer + '&block=0'); }
    await expect.poll(() => host.evaluate(() => !MP.peer.disconnected), { timeout: 15000 }).toBe(true);
    const newcomer = await page();
    const { joinRoom } = await import('./support/peerjs.mjs');
    await joinRoom(newcomer, room, invite, true, '信令恢复后加入'); await sameState(host, [newcomer]);
  });
});

test('应用层排队延迟：观众延后收到真实 PeerJS 消息，玩家照常同步，FIFO 释放后收敛', async ({ browser }) => {
  test.setTimeout(45_000);
  await peerWorld(browser, async page => {
    const { host, player, viewers: [viewer] } = await playingRoom(page);
    await host.evaluate(() => {
      const target = Object.keys(MP.viewers)[0], original = MP.send;
      window.flow = { held: [], original };
      MP.send = function (conn, msg) {
        if (conn._viewer === target) flow.held.push([conn, structuredClone(msg)]);
        else original.call(this, conn, msg);
      };
    });
    try {
      for (let i = 0; i < 5; i++) {
        await host.evaluate(i => { log('排队消息 ' + i); render(); }, i);
        await host.waitForTimeout(100);
      }
      await sameState(host, [player]);
      expect(await host.evaluate(() => flow.held.length)).toBeGreaterThan(0);
      expect(await viewer.evaluate(() => S.log.some(m => m.includes('排队消息')))).toBe(false);
    } finally {
      await host.evaluate(async () => {
        MP.send = flow.original;
        for (const [conn, msg] of flow.held) { flow.original.call(MP, conn, msg); await new Promise(r => setTimeout(r, 80)); }
      });
    }
    await sameState(host, [viewer]);
    expect(await viewer.evaluate(() => S.log.filter(m => m.includes('排队消息')).length)).toBe(5);
    console.log('PEERJS_QUEUE', JSON.stringify({ updates: 5, releaseSpacingMs: 80, converged: true }));
  });
});

test('真实 JS 暂停恢复（模拟无法执行）：房主继续推进，观众恢复后无残留动画且状态一致', async ({ browser }) => {
  test.setTimeout(45_000);
  await peerWorld(browser, async page => {
    const { host, player, viewers: [viewer] } = await playingRoom(page), cdp = await viewer.context().newCDPSession(viewer);
    await viewer.evaluate(() => { window.freezeTicks = 0; window.freezeTimer = setInterval(() => freezeTicks++, 50); });
    const ticks = await viewer.evaluate(() => freezeTicks);
    try {
      await cdp.send('Debugger.enable');
      const paused = new Promise(resolve => cdp.once('Debugger.paused', resolve));
      await cdp.send('Debugger.pause'); await paused;
      await host.evaluate(async () => { S.phase = 'busy'; for (let i = 0; i < 3; i++) { await moveSteps(S.players[0], 6); log('冻结期间推进 ' + i); render(); } S.phase = 'roll'; save(); MP.pushState(true); });
      await sameState(host, [player]);
    } finally { await cdp.send('Debugger.resume'); await cdp.detach(); }
    const after = await viewer.evaluate(() => { clearInterval(freezeTimer); return freezeTicks; });
    expect(after - ticks).toBeLessThan(5);
    await sameState(host, [viewer]);
    await expect.poll(() => viewer.evaluate(() => !MPFX.busy && !MPFX.mv), { timeout: 15000 }).toBe(true);
    expect(await viewer.evaluate(() => MP.watching && MP.mySeat === null)).toBe(true);
  });
});

test('真实刷新与存档恢复：房主重建房间、玩家重新鉴权、观众旧邀请失效并用新邀请加入', async ({ browser }) => {
  test.setTimeout(60_000);
  await peerWorld(browser, async page => {
    const { host, player, viewers: [viewer], room, invite } = await playingRoom(page);
    await rollTurn(host, player, 0); await sameState(host, [player, viewer]);
    await host.evaluate(() => save()); const business = await businessState(host);
    const { configureLocalPeer, createRoom, joinRoom, enableWatching } = await import('./support/peerjs.mjs');
    await host.reload(); await configureLocalPeer(host);
    await expect.poll(() => player.evaluate(() => MP.gone)).toBe(true);
    const next = await createRoom(page, host); expect(next.room).not.toBe(room);
    await host.locator('#resume button').click(); await expect(host.locator('#game')).toBeVisible();
    expect(await businessState(host)).toEqual(business);
    await player.reload(); await configureLocalPeer(player);
    await joinRoom(player, next.room, 'test-room', false, '玩家', false);
    await expect.poll(() => player.evaluate(() => netTrace.some(m => m.t === 'pending'))).toBe(true);
    expect(await host.evaluate(() => MP.seats[1].online)).toBe(false);
    await host.locator('.gmenu').evaluate(e => { e.open = true; });
    await expect(host.locator('#game [data-mp-members]').getByRole('button', { name: '确认入座：玩家', exact: true })).toBeVisible();
    await host.getByRole('button', { name: '确认入座：玩家', exact: true }).click();
    await host.getByRole('button', { name: '已确认本人，允许入座', exact: true }).click();
    await expect.poll(() => player.evaluate(() => MP.mySeat)).toBe(1); await sameState(host, [player]);
    await viewer.reload(); await configureLocalPeer(viewer);
    await joinRoom(viewer, next.room, invite, true, '旧邀请尝试', false);
    await expect.poll(() => viewer.evaluate(() => netTrace.some(m => m.t === 'reject'))).toBe(true);
    expect(await host.evaluate(() => Object.keys(MP.viewers).length)).toBe(0);
    const newInvite = await enableWatching(host); expect(newInvite).not.toBe(invite);
    await joinRoom(viewer, next.room, newInvite, true, '恢复观战'); await sameState(host, [viewer, player]);
  });
});

test('file:// 单 index：生产 PeerJS 建房、观战与观众刷新后重入，无网页服务器依赖', async ({ browser }) => {
  test.setTimeout(45_000);
  await peerWorld(browser, async page => {
    const { host, player, viewers: [viewer], room, invite } = await playingRoom(page);
    const { configureLocalPeer, joinRoom } = await import('./support/peerjs.mjs');
    await viewer.reload(); await configureLocalPeer(viewer);
    await joinRoom(viewer, room, invite, true, '刷新后的解说'); await sameState(host, [player, viewer]);
    expect(await viewer.evaluate(() => location.protocol)).toBe('file:');
    expect(await viewer.evaluate(() => MP.watching && MP.mySeat === null)).toBe(true);
  }, new URL('../code/index.html', import.meta.url).href);
});

test('四观众持续同步与周期性断线：实际 PeerJS 重连后状态一致、权限及连接数量不漂移', async ({ browser }, testInfo) => {
  const durationMs = Math.max(15000, Number(process.env.PEERJS_SOAK_MS) || 30000);
  test.setTimeout(durationMs + 60_000);
  await peerWorld(browser, async page => {
    const { host, player, viewers } = await playingRoom(page, 4);
    const started = Date.now(); let updates = 0, disconnects = 0;
    const hostSession = await host.context().newCDPSession(host); await hostSession.send('Performance.enable');
    const heap = async () => (await hostSession.send('Performance.getMetrics')).metrics.find(m => m.name === 'JSHeapUsedSize')?.value;
    const heapBefore = await heap();
    while (Date.now() - started < durationMs) {
      await host.evaluate(n => { log('持续同步 #' + n); render(); }, ++updates);
      if (updates % 40 === 0) {
        const v = viewers[disconnects++ % 4]; await v.evaluate(() => { if (MP.hostConn?.open) MP.hostConn.close(); });
      }
      await host.waitForTimeout(180);
    }
    await host.evaluate(() => MP.pushState(true));
    for (const v of viewers) await expect.poll(() => v.evaluate(() => !MP.gone && MP.watching && MP.mySeat === null), { timeout: 15000 }).toBe(true);
    await sameState(host, [player, ...viewers]);
    const membership = await host.evaluate(() => ({ viewers: Object.keys(MP.viewers).length, seats: Object.keys(MP.seats).length, active: Object.values(MP.peer.connections).flat().filter(c => c.open).length, pending: Object.keys(MP.pendingJoins).length }));
    expect(membership).toEqual({ viewers: 4, seats: 1, active: 5, pending: 0 });
    const metrics = { durationMs: Date.now() - started, updates, disconnects, heapBefore, heapAfter: await heap(), ...membership };
    await hostSession.detach();
    console.log('PEERJS_SOAK', JSON.stringify(metrics)); await testInfo.attach('peerjs-soak.json', { body: JSON.stringify(metrics, null, 2), contentType: 'application/json' });
  });
});

test('真实身份生命周期：玩家改名后自动认回原座位，撤销观众邀请不会触发自动重连', async ({ browser }) => {
  test.setTimeout(45_000);
  await peerWorld(browser, async page => {
    const { host, player, viewers: [viewer] } = await playingRoom(page);
    const oldKey = await player.evaluate(() => MP.seatKeys(MP.room)[0]);
    await player.locator('.gmenu').evaluate(e => { e.open = true; });
    await player.getByRole('button', { name: '改名字', exact: true }).click();
    await player.locator('#in_nm').fill('改名玩家');
    await player.getByRole('button', { name: '改好了', exact: true }).click();
    await expect.poll(() => host.evaluate(() => S.players[1].name)).toBe('改名玩家'); await sameState(host, [player, viewer]);
    await player.evaluate(() => MP.hostConn.close());
    await expect.poll(() => player.evaluate(() => MP.gone)).toBe(true);
    await expect.poll(() => player.evaluate(() => !MP.gone && MP.hostConn?._ok), { timeout: 15000 }).toBe(true);
    expect(await player.evaluate(() => MP.mySeat)).toBe(1);
    expect(await player.evaluate(() => MP.seatKeys(MP.room)[0])).not.toBe(oldKey); await sameState(host, [player, viewer]);
    await host.locator('.gmenu').evaluate(e => { e.open = true; });
    await host.getByRole('button', { name: /^受邀观战（/ }).click();
    await host.getByRole('button', { name: '更新邀请并断开观众', exact: true }).click();
    await host.getByRole('button', { name: '关闭窗口', exact: true }).click();
    await expect.poll(() => viewer.evaluate(() => MP.kicked && MP.gone)).toBe(true);
    const welcomes = await viewer.evaluate(() => netTrace.filter(m => m.t === 'welcome').length);
    await viewer.waitForTimeout(2500); // 跨过首次 2 秒重连间隔，确认主动撤销不会重试。
    expect(await viewer.evaluate(() => netTrace.filter(m => m.t === 'welcome').length)).toBe(welcomes);
    expect(await host.evaluate(() => Object.keys(MP.viewers).length)).toBe(0);
    expect(await viewer.evaluate(() => MP.role)).toBe('client');
  });
});
