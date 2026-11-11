// 从发布 HTML 提取实际函数，避免用另一份实现自证正确。
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const html = readFileSync(new URL('../../code/index.html', import.meta.url), 'utf8');
const segment = html.slice(html.indexOf('function walkSegment('), html.indexOf('async function moveSteps('));
const movement = html.slice(html.indexOf('async function moveSteps('), html.indexOf('async function moveTo('));
const fx = html.slice(html.indexOf('const okSq ='), html.indexOf('// 房主：小特效'));
const replay = html.slice(html.indexOf('const MPFX = {'), html.indexOf("document.addEventListener('visibilitychange', () => { if (document.hidden && MP.role === 'client')"));
const layout = vm.runInNewContext(html.match(/const LAYOUT = (\[[\s\S]*?\]);/)[1]);
const N = layout.length, SQ = layout.map(t => ({ t }));
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
function harness() {
  let now = 0, nextId = 0;
  const timers = new Map(), hops = [], messages = [];
  const ctx = vm.createContext({ N, SQ, console,
    S: { players: [{ id: 0, pos: 1, cash: 1000, jail: null }], props: {}, log: [], moving: 0 },
    MP: { role: 'client', seats: {}, send: (conn, m) => messages.push({ conn, m, at: now }) },
    MOVE_TO: null, document: { hidden: false }, $: () => ({ hidden: false }),
    FX: { ok: () => true, pawn: null, diceSpin: false,
      pawnStart: () => { ctx.FX.pawn = {}; return true; },
      pawnHop: async (pos, ms) => { const hop = { pos, start: now }; hops.push(hop); await ctx.sleep(ms); hop.end = now; },
      pawnEnd: async () => { ctx.FX.pawn = null; }
    },
    setTimeout: (fn, ms) => { const id = ++nextId; timers.set(id, { fn, at: now + ms }); return id; },
    clearTimeout: id => timers.delete(id), setInterval: () => 1, clearInterval: () => {},
    renderBoard: () => {}, sfx: () => {}, rentFx: () => {},
    requestAnimationFrame: fn => ctx.setTimeout(fn, 16),
    SIM: false, aiTurn: () => false, animK: () => 1, render: () => {}, hopRender: () => {},
    passStart: async p => { p.cash += 200; ctx.S.log.push('start'); },
    passUG: async p => { p.cash += 50; ctx.S.log.push('ug'); },
    reGoLog: () => ctx.S.log.push('back'), log: () => {}, nm: () => '', _tf: () => ''
  });
  ctx.sleep = ms => new Promise(r => ctx.setTimeout(r, ms));
  vm.runInContext(`${segment}\n${fx}\n${replay}\n${movement}\n globalThis.R = MPFX; globalThis.segment = walkSegment; globalThis.cast = fxCast; globalThis.move = moveSteps;`, ctx);
  async function advance(to) {
    await flush();
    for (;;) {
      const due = [...timers].filter(([, t]) => t.at <= to).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!due) break;
      const [id, t] = due; timers.delete(id); now = t.at; t.fn(); await flush();
    }
    now = to; await flush();
  }
  return { ctx, R: ctx.R, hops, messages, advance, now: () => now };
}
const batch = (seq = 1, from = 1, path = [2, 3, 4, 5, 6, 7]) => ({ t: 'fx', k: 'walk', seq, p: 0, from, path, ms: 150, last: true });
const plain = x => JSON.parse(JSON.stringify(x));

test('有界穷举：48 起点 × 0..96 步 × 正反方向，路径和结算边界等价', () => {
  const h = harness(); let cases = 0;
  for (let from = 0; from < N; from++) for (let count = 0; count <= 96; count++) for (const dir of [-1, 1]) {
    const got = []; let at = from;
    while (got.length < count) {
      const part = plain(h.ctx.segment(at, count - got.length, dir));
      assert.ok(part.length > 0 && part.length <= N);
      part.slice(0, -1).forEach(to => {
        assert.ok(dir > 0 ? to !== 0 && SQ[to].t !== 'free' : to !== N - 1);
      });
      got.push(...part); at = part.at(-1);
    }
    assert.deepEqual(got, Array.from({ length: count }, (_, i) => (from + dir * (i + 1) + N * 3) % N));
    cases++;
  }
  assert.equal(cases, 9312);
});

test('房主实际移动：新旧消息路径、起点/UG 收支、反向计数一致；兼容协商有效', async () => {
  for (const [from, n] of [[1, 6], [46, 5], [22, 6], [23, 1], [1, -4], [47, 55], [25, -55], [1, 0]]) {
    const h = harness(), { ctx } = h;
    ctx.MP.role = 'host'; ctx.MP.seats = { 1: { conn: 'new', walk: true }, 2: { conn: 'old' } };
    const p = ctx.S.players[0]; p.pos = from;
    const done = ctx.move(p, n); await h.advance(20000); await done;
    const newMsgs = h.messages.filter(x => x.conn === 'new').map(x => x.m);
    const oldMsgs = h.messages.filter(x => x.conn === 'old').map(x => x.m);
    assert.ok(!newMsgs.some(m => ['ws', 'wh'].includes(m.k)));
    assert.ok(!oldMsgs.some(m => m.k === 'walk'));
    const route = oldMsgs.filter(m => m.k === 'wh').map(m => m.to);
    assert.deepEqual(plain(newMsgs.filter(m => m.k === 'walk').flatMap(m => m.path)), plain(route));
    const dir = Math.sign(n); let cash = 1000, back = 0;
    route.forEach((to, k) => { if (dir > 0 && to === 0) cash += 200; if (dir > 0 && to === 24 && k < route.length - 1) cash += 50; if (dir < 0 && to === 47) back++; });
    assert.equal(p.cash, cash); assert.equal(p.reGo || 0, back);
    assert.equal(p.pos, (from + n + N * 3) % N);
    assert.equal(ctx.S.moving, n ? null : 0);
  }
});

test('弱网 A/B：相同逐格事件延迟，实际回放器的消息数、总时长和跳间空闲', async () => {
  const metrics = [];
  for (const mode of ['legacy', 'batch']) {
    const h = harness(), snapshot = JSON.stringify(h.ctx.S);
    // 固定延迟 200ms；第 2 跳起发生拥塞，后续包额外延后 600ms，保持可靠有序。
    const events = mode === 'legacy'
      ? [{ at: 200, m: { k: 'ws', p: 0, from: 1 } }, ...[2, 3, 4, 5, 6, 7].map((to, i) => ({ at: 200 + i * 150 + (i ? 600 : 0), m: { k: 'wh', p: 0, from: to - 1, to, ms: 150, last: i === 5 } })), { at: 1700, m: { k: 'we', p: 0 } }]
      : [{ at: 200, m: batch() }, { at: 1700, m: { k: 'we', p: 0 } }];
    for (const e of events) { await h.advance(e.at); h.R.push(e.m); }
    await h.advance(2500);
    assert.equal(JSON.stringify(h.ctx.S), snapshot, '任何展示事件都不允许修改 S');
    assert.deepEqual(h.hops.map(x => x.pos), [2, 3, 4, 5, 6, 7]);
    const gaps = h.hops.slice(1).map((x, i) => x.start - h.hops[i].end);
    metrics.push({ mode, messages: events.length, motionMs: h.hops.at(-1).end - h.hops[0].start, idleMs: gaps.reduce((a, b) => a + b, 0), maxGapMs: Math.max(...gaps) });
  }
  assert.equal(metrics[0].idleMs, 600); assert.equal(metrics[1].idleMs, 0);
  assert.equal(metrics[0].messages, 8); assert.equal(metrics[1].messages, 2);
  console.log('MOVEMENT_METRICS', JSON.stringify(metrics));
});

test('有界交错：每跳中断 / 状态前后抵达 / 重复与过期序号，展示不可修改 S，最终收敛', async () => {
  let cases = 0;
  for (const cancelAt of [0, 75, 225, 450, 825, 1000]) for (const stateAt of [0, 300, 1200]) for (const reason of ['none', 'disconnect', 'hidden', 'resync', 'restart']) {
    const h = harness(); h.R.push(batch()); h.R.push(batch()); h.R.push(batch(0));
    const timeline = [{ at: cancelAt, kind: 'cancel' }, { at: stateAt, kind: 'state' }].sort((a, b) => a.at - b.at);
    for (const e of timeline) {
      await h.advance(e.at);
      if (e.kind === 'state') { h.ctx.S = { ...plain(h.ctx.S), moving: null, players: [{ id: 0, pos: 7, cash: 777, jail: null }] }; h.R.stateN++; h.R.settle(true); }
      else if (reason !== 'none') { if (reason === 'disconnect') h.ctx.MP.gone = true; if (reason === 'hidden') h.ctx.document.hidden = true; if (reason === 'resync') h.ctx.MP.resync = true; h.R.cancel(); }
    }
    h.R.push({ k: 'we', p: 0 }); await h.advance(2500);
    assert.equal(h.ctx.S.players[0].pos, 7); assert.equal(h.ctx.S.players[0].cash, 777);
    // 收到收尾之后的权威状态，解除最后的展示占位。
    h.R.stateN++; h.R.settle(true);
    assert.equal(h.R.mv, null); assert.equal(h.ctx.MOVE_TO, null);
    assert.ok(h.hops.length <= 6, '重复包不得重复播放'); cases++;
  }
  assert.equal(cases, 90);
});

test('畸形路径、关闭动态效果均安全回退；取消旧任务不影响新任务', async () => {
  const h = harness(), before = JSON.stringify(h.ctx.S);
  for (const patch of [{ path: [] }, { path: [3] }, { path: [2, 1] }, { path: [NaN] }, { path: Array(49).fill(2) }, { p: 9 }, { seq: Infinity }, { ms: 0 }, { last: 1 }]) h.R.push({ ...batch(), ...patch });
  await h.advance(10); assert.equal(h.hops.length, 0);
  h.R.push(batch()); await h.advance(75); h.R.cancel();
  h.R.push(batch(2, 10, [11, 12])); await h.advance(1000);
  assert.deepEqual(h.hops.map(x => x.pos), [2, 11, 12]);
  assert.equal(JSON.stringify(h.ctx.S), before);
  h.R.cancel(); h.ctx.FX.ok = () => false; h.R.push(batch(3)); await h.advance(1500); assert.equal(h.hops.length, 3);
});

test('取消会隔离旧弹窗回调，超时和积压不能复活旧路径', async () => {
  const h = harness(); let opened = 0;
  h.R.push(batch()); h.R.after(() => opened++); await h.advance(75); h.R.cancel();
  await h.advance(3000); assert.equal(opened, 0);
  // 单跳永不完成，回放超时必须终止，后续跳不能偷偷继续。
  h.ctx.FX.pawnHop = () => new Promise(() => {});
  h.R.push(batch(2)); await h.advance(12000);
  assert.equal(h.R.busy, false); assert.equal(h.R.mv, null);
  h.R.push(batch(3)); await h.advance(12050);
  for (let i = 0; i < 43; i++) h.R.push({ k: 'sm' });
  assert.equal(h.R.mv, null); assert.ok(h.R.q.length < 3);
  h.R.cancel(); await h.advance(21000); assert.equal(h.R.busy, false);
});

// 抽象协议的显式状态模型：一段三步，任意网络投递、房主推进、
// 本地播放、一次取消、一次重复包的全部可达交错；独立于具体时间。
test('显式状态模型穷举：权威隔离、重复幂等、可靠有序投递后的最终收敛', () => {
  const initial = { host: 0, client: 0, lastState: 0, wire: ['walk'], left: 0, seen: false, cancelled: false, duplicated: false, endRx: -1, rx: 0, ghost: false };
  const key = s => JSON.stringify(s), pending = [initial], visited = new Set([key(initial)]);
  let transitions = 0, terminals = 0;
  for (let cursor = 0; cursor < pending.length; cursor++) {
    const s = pending[cursor], next = [];
    assert.equal(s.client, s.lastState, '权威位置等于最后接收的 state，不能等于动画位置');
    assert.ok(s.client <= s.host);
    if (s.host < 3) {
      const n = structuredClone(s); n.host++;
      if (n.host === 3) n.wire.push('end');
      n.wire.push(n.host); next.push(['host', n]);
    }
    if (s.wire.length) {
      const n = structuredClone(s), m = n.wire.shift();
      if (m === 'walk') { if (!n.seen) { n.seen = true; if (!n.cancelled) { n.left = 3; n.ghost = true; } } }
      else if (m === 'end') n.endRx = n.rx;
      else { n.client = m; n.lastState = m; n.rx++; }
      next.push(['receive', n]);
    }
    if (s.left) { const n = structuredClone(s); n.left--; next.push(['animate', n]); }
    if (!s.cancelled) { const n = structuredClone(s); n.cancelled = true; n.left = 0; n.ghost = false; next.push(['cancel', n]); }
    if (s.seen && !s.duplicated) {
      const n = structuredClone(s); n.duplicated = true;
      // 同一个 seq 被重复收到，展示和权威状态都必须保持原样。
      next.push(['duplicate', n]);
    }
    if (s.ghost && !s.left && s.endRx >= 0 && s.rx > s.endRx) { const n = structuredClone(s); n.ghost = false; next.push(['settle', n]); }
    if (s.host === 3 && !s.wire.length && !s.left && !next.some(([kind]) => kind === 'settle')) {
      terminals++; assert.equal(s.client, s.host); assert.equal(s.ghost, false);
    }
    for (const [kind, n] of next) {
      if (['animate', 'cancel', 'duplicate', 'settle'].includes(kind)) {
        assert.equal(n.client, s.client); assert.equal(n.host, s.host); assert.deepEqual(n.wire, s.wire);
      }
      transitions++; const k = key(n); if (!visited.has(k)) { visited.add(k); pending.push(n); }
    }
  }
  assert.ok(terminals > 0);
  console.log('MOVEMENT_MODEL', JSON.stringify({ states: visited.size, transitions, terminals, invariantViolations: 0 }));
});
