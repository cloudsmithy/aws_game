import { expect } from '@playwright/test';
import { sameState } from './rtc.mjs';

// 保留发布页的 Peer 类及 host/join/rejoin；仅配置本机信令、关闭本机测试用不到的公网 ICE。
export async function peerWorld(browser, run, base = `http://127.0.0.1:${process.env.AWS_GAME_TEST_PORT || 8878}/`) {
  const contexts = [], errors = [], external = [];
  async function page() {
    const context = await browser.newContext({ reducedMotion: 'no-preference', viewport: { width: 1440, height: 900 } }); contexts.push(context);
    await context.addInitScript(() => { try { localStorage.setItem('amono-tour-off', '1'); } catch {} });
    const p = await context.newPage(); p.on('pageerror', e => errors.push(e.stack || e.message));
    p.on('request', r => { const u = new URL(r.url()); if (u.protocol.startsWith('http') && !['127.0.0.1', 'localhost'].includes(u.hostname)) external.push(r.url()); });
    await p.goto(base);
    await configureLocalPeer(p);
    return p;
  }
  try { await run(page); expect(errors).toEqual([]); expect(external).toEqual([]); }
  finally { await Promise.all(contexts.map(c => c.close())); }
}

export async function configureLocalPeer(p) {
    await p.evaluate(port => {
      const opts = MP.peerOpts.bind(MP);
      MP.peerOpts = () => ({ ...opts(), host: '127.0.0.1', port, path: '/', secure: false, config: { iceServers: [] } });
      // 只观察，不替换消息处理器和发送函数。
      window.netTrace = [];
      const receive = MP.onClientMsg;
      MP.onClientMsg = function (m) { const data = typeof m === 'string' ? JSON.parse(m) : m; netTrace.push({ t: data.t, k: data.k, at: performance.now() }); return receive.call(this, m); };
    }, Number(process.env.AWS_GAME_SIGNAL_PORT || 8879));
}

export async function createRoom(page, existingHost) {
  const host = existingHost || await page();
  await host.locator('input[name=np][value="2"]').locator('..').click();
  await host.locator('input[name=diff][value="basic"]').locator('..').click();
  await host.locator('#ai0').uncheck(); await host.locator('#ai1').uncheck();
  await host.evaluate(() => mpUI('host'));
  await host.locator('#mphname').fill('房主'); await host.locator('#mppwd').fill('test-room');
  await host.locator('#mpbox .mpform button').click();
  await expect.poll(() => host.evaluate(() => MP.role)).toBe('host');
  expect(await host.evaluate(() => MP.peer instanceof peerjs.Peer)).toBe(true);
  return { host, room: await host.evaluate(() => MP.room) };
}

export async function joinRoom(page, room, credential, watching, name, wait = true) {
  await page.evaluate(() => mpUI('join'));
  await page.locator('#mproom').fill(room); await page.locator('#mpmode').selectOption(watching ? 'spectator' : 'player');
  await page.locator('#mppwd').fill(credential); await page.locator('#mpname').fill(name);
  await page.locator('#mpbox .mpform button').click();
  if (!wait) return;
  await expect.poll(() => page.evaluate(() => MP.role === 'client' && !MP.gone && !!MP.hostConn?._ok)).toBe(true);
  expect(await page.evaluate(() => MP.peer instanceof peerjs.Peer)).toBe(true);
  expect(await page.evaluate(() => MP.watching)).toBe(watching);
}

export async function startRoom(host) {
  await host.locator('#startBtn').click();
  await expect(host.locator('#modal .box')).toHaveAttribute('aria-label', '角色分配');
  await host.locator('#modal .btns button').click();
  await expect(host.locator('#modal')).toBeHidden();
}

export async function enableWatching(host) {
  // 大厅和对局都走真实用户入口，邀请码来自仅房主可见的窗口。
  if (await host.locator('#game').isVisible()) await host.locator('.gmenu').evaluate(e => { e.open = true; });
  await host.getByRole('button', { name: /^受邀观战（/ }).click();
  await host.getByRole('button', { name: '开启受邀观战', exact: true }).click();
  const token = await host.locator('#vmodal code').innerText();
  await host.getByRole('button', { name: '关闭窗口', exact: true }).click();
  return token;
}

export async function playingRoom(page, spectators = 1) {
  const { host, room } = await createRoom(page), player = await page();
  await joinRoom(player, room, 'test-room', false, '玩家'); await startRoom(host);
  const invite = await enableWatching(host), viewers = [];
  for (let i = 0; i < spectators; i++) { const v = await page(); await joinRoom(v, room, invite, true, '解说' + (i + 1)); viewers.push(v); }
  await sameState(host, [player, ...viewers]);
  return { host, player, viewers, room, invite };
}

// 固定测试骰点只用于稳定业务路径；掷骰、结算、弹窗作答与回合提交仍走真实界面和协议。
export async function rollTurn(host, player, who) {
  const actor = who === 0 ? host : player;
  await host.evaluate(() => { S.diceQ = [[1, 2]]; S.rei = [1, ...S.rei.filter(id => id !== 1)]; });
  const before = await host.evaluate(() => S.rollId || 0);
  // 生产逻辑拒绝回合开始后 300ms 内的连点，等实际可操作后再点击。
  await expect.poll(() => host.evaluate(() => Date.now() - (S.turnStartAt || 0) >= 300)).toBe(true);
  await actor.locator('#center button[onclick="doRoll()"]').click();
  await expect.poll(() => host.evaluate(() => S.phase)).toBe('busy');
  const until = Date.now() + 15000;
  while (Date.now() < until) {
    if (await host.evaluate(() => S.phase === 'post' && !MP.cur)) break;
    const owner = await host.evaluate(() => MP.cur?.who ?? S.cur), controller = owner === 0 ? host : player;
    const button = controller.locator('#modal .btns button:enabled').first();
    if (await button.isVisible()) await button.click();
    else await actor.waitForTimeout(50);
  }
  expect(await host.evaluate(() => S.phase)).toBe('post');
  expect(await host.evaluate(() => S.rollId)).toBeGreaterThan(before);
  await actor.locator('#center button[onclick="endTurn()"]').click();
  await expect.poll(() => host.evaluate(() => S.cur)).toBe((who + 1) % 2);
}
