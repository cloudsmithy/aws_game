import { expect } from '@playwright/test';

// 只替换公网信令及 PeerJS 传输适配；实际 WebRTC DataChannel、入房、鉴权、状态与 UI 处理器均来自发布页。
export async function connectRTC(host, client, hello) {
  const { offer, index } = await host.evaluate(async () => {
    window.rtcLinks ||= [];
    const pc = new RTCPeerConnection({ iceServers: [] }), channel = pc.createDataChannel('game', { ordered: true });
    const conn = { open: false, send: m => channel.send(typeof m === 'string' ? m : JSON.stringify(m)), close: () => channel.close() };
    channel.onopen = () => { conn.open = true; };
    channel.onmessage = e => MP.onHostMsg(conn, JSON.parse(e.data));
    channel.onclose = () => { conn.open = false; MP.onHostClose(conn); };
    const index = rtcLinks.push({ pc, channel, conn }) - 1;
    const gathered = new Promise(r => { pc.onicecandidate = e => { if (!e.candidate) r(); }; });
    await pc.setLocalDescription(await pc.createOffer()); await gathered;
    return { offer: pc.localDescription.toJSON(), index };
  });
  const answer = await client.evaluate(async offer => {
    window.received ||= []; window.sent ||= []; window.rtcPeers ||= [];
    const pc = new RTCPeerConnection({ iceServers: [] }); rtcPeers.push(pc);
    pc.ondatachannel = e => {
      const channel = window.rtcChannel = e.channel;
      const conn = { open: true, send: m => { sent.push(m); channel.send(typeof m === 'string' ? m : JSON.stringify(m)); }, close: () => channel.close() };
      MP.hostConn = conn;
      channel.onmessage = e => { if (MP.hostConn !== conn) return; const m = JSON.parse(e.data); received.push(m); MP.onClientMsg(m); };
      channel.onclose = () => { if (MP.hostConn !== conn) return; conn.open = false; MP.gone = true; MPFX.cancel(); if (S && S.players) render(); };
    };
    await pc.setRemoteDescription(offer);
    const gathered = new Promise(r => { pc.onicecandidate = e => { if (!e.candidate) r(); }; });
    await pc.setLocalDescription(await pc.createAnswer()); await gathered; return pc.localDescription.toJSON();
  }, offer);
  await host.evaluate(({ index, answer }) => rtcLinks[index].pc.setRemoteDescription(answer), { index, answer });
  await expect.poll(() => host.evaluate(i => rtcLinks[i].conn.open, index)).toBe(true);
  await expect.poll(() => client.evaluate(() => rtcChannel?.readyState)).toBe('open');
  await client.evaluate(hello => { MP.myName = hello.name; MP.room = 'ABCDEF'; MP.watching = hello.mode === 'spectator'; MP.send(MP.hostConn, hello); }, hello);
  return index;
}

export const state = page => page.evaluate(() => JSON.parse(JSON.stringify({ ...S, diceQ: undefined })));
export async function sameState(host, clients) {
  const expected = await state(host);
  for (const client of clients) await expect.poll(() => state(client)).toEqual(expected);
}

export async function world(browser, run, base = `http://127.0.0.1:${process.env.AWS_GAME_TEST_PORT || 8878}/`) {
  const contexts = [], errors = [];
  async function page(demo = false, viewport = { width: 1440, height: 900 }) {
    const context = await browser.newContext({ reducedMotion: 'no-preference', viewport }); contexts.push(context);
    const p = await context.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.goto(base + (demo ? '?demo=board' : ''));
    if (!demo) await p.evaluate(() => mpUI('join'));
    return p;
  }
  try { await run(page); expect(errors).toEqual([]); }
  finally { await Promise.all(contexts.map(c => c.close())); }
}

export async function hostGame(page) {
  const host = await page(true);
  await host.evaluate(() => {
    MP.role = 'host'; MP.room = 'ABCDEF'; MP.auth = 'player-secret'; mpUI('host');
    S.cur = 0; S.phase = 'roll'; S.cfg.ai = S.players.map(() => false); S.mpSeats = [1]; S.turnStartAt = 0;
    MP.seats[1] = { name: unesc(S.players[1].name), online: false, conn: null, key: 'seat-key' };
    MP.setWatching(true); render(); MP.pushState(true);
  });
  return host;
}
export async function observerHello(host, name = '受邀解说') {
  return { t: 'hello', mode: 'spectator', invite: await host.evaluate(() => MP.watchToken), name, delta: 1, walk: 1 };
}
