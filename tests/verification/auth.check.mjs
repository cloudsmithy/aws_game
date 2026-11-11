// 直接执行发布 HTML 中的房主协议处理器，恶意消息绕过客户端 UI。
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const html = readFileSync(new URL('../../code/index.html', import.meta.url), 'utf8');
const source = html.slice(html.indexOf('const MP = {'), html.indexOf('// 远端：截住游戏操作按钮'));
const plain = x => JSON.parse(JSON.stringify(x));
function harness(game = true) {
  const effects = [], timers = new Map(); let nextTimer = 0;
  const el = { hidden: true, innerHTML: '', querySelector: () => null };
  const ctx = vm.createContext({ crypto, console, Date,
    S: game ? { players: [{ id: 0, name: '房主', pos: 1, cash: 1000, jail: null }, { id: 1, name: '小李', pos: 2, cash: 900, jail: null }], cfg: { ai: [false, false] }, cur: 1, phase: 'roll', log: [], logSeq: 0, hist: {}, diceQ: [6, 6] } : null,
    AI_PAUSE: false, MODAL_CUR: null, MPFX: { cancel: () => effects.push('cancel') },
    $: () => el, esc: x => String(x).replaceAll('<', '&lt;'), unesc: x => x,
    _t: (id, text) => text, _tf: (id, text, ...args) => text.replace(/\{\$(\d+)\}/g, (_, i) => args[i]),
    setTimeout: (fn, ms) => { const id = ++nextTimer; timers.set(id, { fn, ms }); return id; }, clearTimeout: id => timers.delete(id),
    log: text => { ctx.S.log.unshift(text); ctx.S.logSeq++; }, nm: x => x.name,
    render: () => effects.push('render'), toggleAiPause: () => effects.push('pause'), toast: () => {},
    applyRename: (...a) => effects.push(['rename', ...a]), applyCheat: (...a) => effects.push(['cheat', ...a]), reportCheat: (...a) => effects.push(['report', ...a]),
    cur: () => ctx.S.players[ctx.S.cur], doRoll: () => effects.push('roll'), endTurn: () => effects.push('end'),
    uiAction: fn => fn(), isAI: () => false, wbValid: () => false,
    localStorage: { getItem: () => null }, ask: async () => false
  });
  vm.runInContext(source + '; globalThis.mp = MP;', ctx);
  const mp = ctx.mp; mp.role = 'host'; mp.room = 'ABCDEF'; mp.auth = 'player-secret';
  mp.renderLobby = () => {}; mp.refreshMembers = () => {};
  const conn = () => ({ open: true, messages: [], send(m) { this.messages.push(typeof m === 'string' ? JSON.parse(m) : plain(m)); }, close() { this.open = false; mp.closed(this); } });
  const hello = (extra = {}) => ({ t: 'hello', name: '解说', mode: 'spectator', invite: mp.watchToken, delta: 1, walk: 1, ...extra });
  function player(online = true) { const c = conn(); c._seat = 1; c._admitted = true; mp.seats[1] = { name: '小李', conn: c, online, key: 'seat-secret', delta: true, walk: true }; return c; }
  return { ctx, mp, conn, hello, player, effects, timers };
}

test('观战默认关闭；错误邀请/玩家密码不能进入；拒绝后不能重复 hello', async () => {
  const h = harness();
  for (const invite of ['', 'player-secret', undefined]) { const c = h.conn(); await h.mp.onHostMsg(c, h.hello({ invite })); assert.equal(c.messages[0].t, 'reject'); }
  h.mp.setWatching(true); const c = h.conn(); await h.mp.onHostMsg(c, h.hello({ invite: 'wrong' })); await h.mp.onHostMsg(c, h.hello());
  assert.equal(Object.keys(h.mp.viewers).length, 0); assert.equal(c._admitted, undefined);
});

test('观众不占座、不获得密码或座位钥匙；快照不泄露预设骰点或邀请', async () => {
  const h = harness(); const p = h.player(); h.mp.pushState(true); const before = plain(h.ctx.S), seats = h.mp.seats[1];
  h.mp.setWatching(true); const c = h.conn(); await h.mp.onHostMsg(c, h.hello());
  assert.equal(c._seat, undefined); assert.equal(h.mp.seats[1], seats); assert.deepEqual(plain(h.ctx.S), before);
  assert.equal(c.messages[0].key, undefined); assert.equal(c.messages[0].seat, null);
  const snapshot = c.messages.find(m => m.t === 'state'); assert.equal(snapshot.S.diceQ, undefined);
  assert.ok(!JSON.stringify(snapshot).includes(h.mp.watchToken)); assert.ok(!JSON.stringify(snapshot).includes('seat-secret'));
  assert.equal(p.open, true);
});

test('恶意观众：所有操作白名单、答题/改名/暂停/结算/作弊/举报及伪造身份均被拒绝', async () => {
  const h = harness(); h.player(); h.mp.setWatching(true); const c = h.conn(); await h.mp.onHostMsg(c, h.hello());
  h.mp.cur = { id: 8, who: 1, onAnswer: () => h.effects.push('answer') };
  const before = plain(h.ctx.S), seat = h.mp.seats[1];
  const messages = [...Object.keys(h.mp.ACTS).map(a => ({ t: 'act', a })), { t: 'ans', id: 8, k: 0 }, { t: 'rename', name: '冒名' }, { t: 'aipause' }, { t: 'endask' }, { t: 'cheat', c: 'cash', a: ['999'] }, { t: 'report', id: 0 }, h.hello({ mode: 'player', auth: 'player-secret', name: '小李', keys: ['seat-secret'] }), { t: 'state', S: { cur: 0 } }];
  for (const m of messages) await h.mp.onHostMsg(c, { ...m, seat: 1, who: 1, role: 'host' });
  assert.deepEqual(h.effects, []); assert.deepEqual(plain(h.ctx.S), before); assert.equal(h.mp.seats[1], seat);
});

test('独立邀请不能作为玩家密码；未鉴权连接与残留座位号旧连接不能操作或补发', async () => {
  const h = harness(); const live = h.player(); h.mp.setWatching(true);
  const attacker = h.conn(); await h.mp.onHostMsg(attacker, { t: 'hello', name: '小李', auth: h.mp.watchToken }); assert.equal(attacker.messages[0].t, 'reject');
  for (const c of [h.conn(), Object.assign(h.conn(), { _seat: 1 }), Object.assign(h.conn(), { _seat: '__proto__' })]) for (const t of ['aipause', 'resync', 'ans']) h.mp.onHostMsg(c, { t, id: 1, k: 0 });
  assert.deepEqual(h.effects, []); h.mp.onHostMsg(live, { t: 'aipause' }); assert.deepEqual(h.effects, ['pause']);
});

test('人数上限、观众离开、移出和邀请轮换均不改变对局或玩家座位', async () => {
  const h = harness(); h.player(); h.mp.pushState(true); const before = plain(h.ctx.S); h.mp.setWatching(true); const oldToken = h.mp.watchToken;
  const all = []; for (let i = 0; i < 5; i++) { const c = h.conn(); all.push(c); await h.mp.onHostMsg(c, h.hello()); }
  assert.equal(Object.keys(h.mp.viewers).length, 4); assert.equal(all[4].messages[0].t, 'reject');
  all[0].close(); assert.equal(Object.keys(h.mp.viewers).length, 3);
  h.mp.dropViewer(all[1]._viewer); assert.equal(Object.keys(h.mp.viewers).length, 2);
  h.mp.setWatching(true); assert.notEqual(h.mp.watchToken, oldToken); assert.equal(Object.keys(h.mp.viewers).length, 0);
  const stale = h.conn(); await h.mp.onHostMsg(stale, h.hello({ invite: oldToken })); assert.equal(stale.messages[0].t, 'reject');
  h.mp.setWatching(false); assert.deepEqual(plain(h.ctx.S), before); assert.equal(h.mp.seats[1].online, true);
});

test('观众可补发整份状态；增量基线独立于玩家及其他观众', async () => {
  const h = harness(); const p = h.player(); h.mp.setWatching(true); const a = h.conn(), b = h.conn(); await h.mp.onHostMsg(a, h.hello()); await h.mp.onHostMsg(b, h.hello());
  h.ctx.S.players[0].cash--; h.ctx.S.log.unshift('新日志'); h.ctx.S.logSeq++; h.mp.pushState();
  const v = h.mp.viewers[a._viewer], other = h.mp.viewers[b._viewer].base, player = h.mp.seats[1].base;
  assert.ok(a.messages.at(-1).delta); const before = plain(h.ctx.S); h.mp.onHostMsg(a, { t: 'resync' });
  assert.equal(a.messages.at(-1).delta, undefined); assert.ok(v.base); assert.equal(h.mp.viewers[b._viewer].base, other); assert.equal(h.mp.seats[1].base, player); assert.deepEqual(plain(h.ctx.S), before); assert.ok(p.messages.length);
});

test('离线同名无钥匙必须经房主确认；重复 hello 不新增请求；拒绝不入座', async () => {
  const h = harness(); h.player(false); const c = h.conn(), m = { t: 'hello', name: '小李', auth: 'player-secret' };
  await h.mp.onHostMsg(c, m); assert.equal(c.messages[0].t, 'pending'); assert.equal(c._seat, undefined);
  await h.mp.onHostMsg(c, m); assert.equal(Object.keys(h.mp.pendingJoins).length, 1);
  h.ctx.ask = async () => false; await h.mp.reviewJoin(c._pending); assert.equal(c._seat, undefined); assert.equal(c.messages.at(-1).t, 'reject');
});

test('房主确认后入原座位并生成新钥匙；正确钥匙在线/离线重连均可用，旧钥匙失效', async () => {
  for (const online of [true, false]) {
    const h = harness(); const old = h.player(online), c = h.conn();
    await h.mp.onHostMsg(c, { t: 'hello', name: '小李', auth: 'player-secret', keys: ['seat-secret'] });
    assert.equal(c._seat, 1); assert.equal(old._closed, true); assert.notEqual(h.mp.seats[1].key, 'seat-secret');
    const next = h.conn(); await h.mp.onHostMsg(next, { t: 'hello', name: '小李', auth: 'player-secret', keys: ['seat-secret'] }); assert.equal(next.messages[0].t, 'reject');
  }
  const h = harness(); h.player(false); const c = h.conn(); await h.mp.onHostMsg(c, { t: 'hello', name: '小李', auth: 'player-secret' });
  h.ctx.ask = async () => true; await h.mp.reviewJoin(c._pending); assert.equal(c._seat, 1); assert.ok(h.mp.seats[1].key);
});

test('审批中的座位/对局变化、请求超时、关闭连接均不能获得旧审批权限', async () => {
  for (const change of ['seat', 'game', 'close', 'timeout']) {
    const h = harness(); h.player(false); const c = h.conn(); await h.mp.onHostMsg(c, { t: 'hello', name: '小李', auth: 'player-secret' });
    const id = c._pending; let resolve; h.ctx.ask = () => new Promise(r => { resolve = r; }); const reviewing = h.mp.reviewJoin(id);
    if (change === 'seat') h.mp.seats[1] = { ...h.mp.seats[1] };
    if (change === 'game') h.ctx.S = plain(h.ctx.S);
    if (change === 'close') c.close();
    if (change === 'timeout') [...h.timers.values()].find(t => t.ms === 60000).fn();
    resolve(true); await reviewing; assert.equal(c._seat, undefined, change);
  }
});

test('读档前大厅的已存玩家名字也需要房主确认，不能靠抢先加入认领', async () => {
  const h = harness(false); h.mp.savedSeat = () => 2; const c = h.conn();
  await h.mp.onHostMsg(c, { t: 'hello', name: '小李', auth: 'player-secret' }); assert.equal(c.messages[0].t, 'pending'); assert.equal(c._seat, undefined);
  h.ctx.ask = async () => true; await h.mp.reviewJoin(c._pending); assert.equal(c._seat, 2);
});

test('重复 hello 不能为同一玩家连接分配第二座位或转成观众', async () => {
  const h = harness(false); const c = h.conn(); await h.mp.onHostMsg(c, { t: 'hello', name: '小李', auth: 'player-secret' }); assert.equal(c._seat, 1);
  h.mp.setWatching(true); await h.mp.onHostMsg(c, { t: 'hello', name: '新名字', auth: 'player-secret' }); await h.mp.onHostMsg(c, h.hello());
  assert.equal(Object.keys(h.mp.seats).length, 1); assert.equal(Object.keys(h.mp.viewers).length, 0);
});

test('有界消息序列：观众/未认证/旧连接的任意两条操作均不改变权威状态', async () => {
  const kinds = ['act', 'ans', 'rename', 'aipause', 'endask', 'cheat', 'report']; let traces = 0;
  for (const role of ['viewer', 'unknown', 'stale']) for (const a of kinds) for (const b of kinds) {
    const h = harness(); h.player(); h.mp.pushState(true); const before = plain(h.ctx.S), c = h.conn();
    if (role === 'viewer') { h.mp.setWatching(true); await h.mp.onHostMsg(c, h.hello()); }
    if (role === 'stale') c._seat = 1;
    for (const t of [a, b]) await h.mp.onHostMsg(c, { t, a: t === 'cheat' ? ['999'] : 'roll', id: 1, k: 0, name: '冒名', c: 'cash', seat: 1 });
    assert.deepEqual(plain(h.ctx.S), before); assert.deepEqual(h.effects, []); traces++;
  }
  assert.equal(traces, 147); console.log('AUTH_METRICS', JSON.stringify({ traces, unauthorizedEffects: 0 }));
});

// 传输桩只用于覆盖生产 PeerJS 生命周期分支；真实数据通道另见 spectator.spec.mjs。
function fakePeer(h) {
  class Events {
    handlers = {};
    on(k, fn) { (this.handlers[k] ||= []).push(fn); return this; }
    emit(k, ...a) { for (const fn of this.handlers[k] || []) fn(...a); }
  }
  class Peer extends Events {
    static instances = [];
    constructor() { super(); Peer.instances.push(this); }
    connect() { this.conn = Object.assign(new Events(), h.conn()); return this.conn; }
    destroy() { this.destroyed = true; }
  }
  h.ctx.Peer = Peer; h.mp.peerOpts = () => ({}); h.ctx.wbLoad = () => ({});
  h.ctx.document = { querySelectorAll: () => [] }; h.ctx.sessionStorage = { setItem: () => {} };
  return Peer;
}

test('生产加入/自动重连：观众 hello 不携带玩家密码、错题本或座位钥匙，重连保留观战身份', async () => {
  const h = harness(), Peer = fakePeer(h); h.mp.role = null;
  h.mp.seatKeys = () => { throw new Error('观众不得读取玩家钥匙'); };
  await h.mp.join('abcdef', 'invitation', '解说', undefined, true);
  const peer = Peer.instances.at(-1); peer.emit('open'); peer.conn.emit('open');
  const first = peer.conn.messages[0]; assert.equal(first.mode, 'spectator'); assert.equal(first.invite, 'invitation');
  for (const key of ['auth', 'wb', 'keys']) assert.equal(first[key], undefined);
  h.mp.onClientMsg({ t: 'welcome', mode: 'spectator', seat: null, room: 'ABCDEF' });
  assert.equal(h.mp.role, 'client'); assert.equal(h.mp.watching, true); assert.equal(h.mp.mySeat, null);
  h.mp.gone = true; h.mp.rejoin(); await new Promise(r => setImmediate(r));
  const newer = Peer.instances.at(-1); assert.notEqual(newer, peer); newer.emit('open'); newer.conn.emit('open');
  assert.deepEqual(newer.conn.messages[0], first);
  // 旧连接的 data/close 迟到，不能清掉新连接或把观众变成单机玩家。
  peer.conn.emit('data', { t: 'reject', why: '旧连接消息' }); peer.conn.emit('close'); assert.equal(h.mp.hostConn, newer.conn); assert.equal(h.mp.role, 'client');
});

test('生产房主：旧 Peer 的迟到 connection 被关闭，不可进入新房间', async () => {
  const h = harness(false), Peer = fakePeer(h); h.mp.role = null;
  await h.mp.host('password'); const first = Peer.instances.at(-1); first.emit('open');
  const second = {}; h.mp.peer = second;
  const c = h.conn(); first.emit('connection', c); assert.equal(c.open, false); assert.equal(c._admitted, undefined);
  h.mp.role = null; first.emit('open'); assert.equal(h.mp.role, null);
});

test('重连被拒绝后仍是锁定客户端，不能退化为本地玩家覆盖存档', () => {
  const h = harness(); h.mp.role = 'client'; h.mp.watching = true; h.ctx.info = () => {};
  h.mp.onClientMsg({ t: 'reject', why: '邀请失效' }); assert.equal(h.mp.role, 'client'); assert.equal(h.mp.gone, true); assert.equal(h.mp.kicked, true);
});
