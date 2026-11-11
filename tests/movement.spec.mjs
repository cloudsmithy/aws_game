import { test, expect } from '@playwright/test';

// 仅本机互连测试禁用 mDNS 地址隐藏，避免依赖测试机的组播解析。
test.use({ launchOptions: { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] } });

test('房主和两个客户端：真实 WebRTC、3D 回放、UG 结算与状态补发一致', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'no-preference', viewport: { width: 1440, height: 900 } });
  try {
    const host = await context.newPage(), clients = [await context.newPage(), await context.newPage()], errors = [];
    for (const page of [host, ...clients]) { page.on('pageerror', e => errors.push(e.message)); await page.goto('http://127.0.0.1:8878/?demo=board'); }
    await host.evaluate(() => { window.links = []; });
    for (const [index, client] of clients.entries()) {
      // 本机交换 SDP，跳过公网信令 / STUN；DataChannel 和游戏收发处理器是真实的。
      const offer = await host.evaluate(async () => {
        const pc = new RTCPeerConnection({ iceServers: [] }), channel = pc.createDataChannel('movement', { ordered: true });
        links.push({ pc, channel });
        const gathered = new Promise(r => { pc.onicecandidate = e => { if (!e.candidate) r(); }; });
        await pc.setLocalDescription(await pc.createOffer()); await gathered; return pc.localDescription.toJSON();
      });
      const answer = await client.evaluate(async ({ offer, index }) => {
        window.received = []; window.played = [];
        window.pc = new RTCPeerConnection({ iceServers: [] });
        pc.ondatachannel = e => { window.channel = e.channel; channel.onmessage = e => { const m = JSON.parse(e.data); received.push(m); MP.onClientMsg(m); }; };
        MP.role = 'client'; MP.mySeat = index + 1; MP.gone = false;
        MP.hostConn = { open: true, send: m => channel.send(typeof m === 'string' ? m : JSON.stringify(m)) };
        const hop = FX.pawnHop.bind(FX);
        FX.pawnHop = async (...args) => { played.push(args[0]); return hop(...args); };
        await pc.setRemoteDescription(offer);
        const gathered = new Promise(r => { pc.onicecandidate = e => { if (!e.candidate) r(); }; });
        await pc.setLocalDescription(await pc.createAnswer()); await gathered; return pc.localDescription.toJSON();
      }, { offer, index });
      await host.evaluate(({ answer, index }) => links[index].pc.setRemoteDescription(answer), { answer, index });
      await expect.poll(() => host.evaluate(index => links[index].channel.readyState, index)).toBe('open');
    }
    await host.evaluate(() => {
      MP.role = 'host'; S.cur = 0; S.phase = 'busy'; S.players[0].pos = 1;
      MP.seats = Object.fromEntries(links.map(({ channel }, i) => {
        const conn = { _seat: i + 1, open: true, send: m => channel.send(typeof m === 'string' ? m : JSON.stringify(m)) };
        channel.onmessage = e => MP.onHostMsg(conn, JSON.parse(e.data));
        return [i + 1, { conn, walk: true, delta: true, online: true }];
      }));
      MP.pushState(true);
    });
    for (const client of clients) await expect.poll(() => client.evaluate(() => received.some(m => m.t === 'state'))).toBe(true);
    const canonical = page => page.evaluate(() => JSON.parse(JSON.stringify({ ...S, diceQ: undefined })));
    const before = await Promise.all(clients.map(canonical));
    // 仅发路径，不发状态，确认本地动画不会替房主改变任何状态。
    await host.evaluate(() => fxCast('walk', { p: 0, seq: 1, from: 1, path: [2, 3, 4, 5, 6, 7], ms: 90, last: true }));
    for (const [i, client] of clients.entries()) {
      await expect.poll(() => client.evaluate(() => played.length)).toBe(6);
      expect(await canonical(client)).toEqual(before[i]);
    }
    await host.evaluate(() => { MP.walkSeq = 1; });
    for (const [from, n] of [[1, 6], [22, 6], [1, -4]]) {
      await host.evaluate(async ({ from, n }) => { S.players[0].pos = from; MP.pushState(true); await moveSteps(S.players[0], n); MP.pushState(true); }, { from, n });
      for (const client of clients) {
        await expect.poll(() => client.evaluate(() => ({ pos: S.players[0].pos, moving: S.moving, held: MPFX.mv !== null, busy: MPFX.busy }))).toEqual({ pos: (from + n + 48) % 48, moving: null, held: false, busy: false });
        expect(await canonical(client)).toEqual(await canonical(host));
      }
    }
    // 增量序号接不上：真实客户端发 resync，房主补全量；旧动画必须取消。
    await clients[0].evaluate(() => {
      MPFX.push({ k: 'walk', p: 0, seq: 999, from: 45, path: [46, 47], ms: 150, last: true });
      MP.onClientMsg({ t: 'state', S: JSON.parse(JSON.stringify(S)), delta: { from: -1 } });
    });
    await expect.poll(() => clients[0].evaluate(() => ({ resync: !!MP.resync, held: !!MPFX.mv, busy: MPFX.busy }))).toEqual({ resync: false, held: false, busy: false });
    for (const client of clients) {
      expect(await canonical(client)).toEqual(await canonical(host));
      expect(await client.evaluate(() => received.some(m => m.t === 'fx' && (m.k === 'ws' || m.k === 'wh')))).toBe(false);
    }
    expect(errors).toEqual([]);
    await host.evaluate(() => links.forEach(({ channel, pc }) => { channel.close(); pc.close(); }));
    for (const client of clients) await client.evaluate(() => { channel.close(); pc.close(); });
  } finally { await context.close(); }
});
