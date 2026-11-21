// 不开浏览器、不画界面，在 Node 里让电脑把整局打完：验证游戏逻辑（engine/、rules/）只经界面接口 UI 和界面打交道。
// 页面相关的全局用一个「什么都接得住」的替身顶上（界面模块加载时会碰 document，但这里不用它们画东西）；
// UI.ask / UI.modal 直接把弹窗的数据交给电脑的决策函数 aiDecide（engine/36-ai.js），不经过页面。
// 日志不会和浏览器里逐条一样：界面也在用 Math.random（开局给角色立牌洗牌这类），这里没有界面就少取几次，骰子从第一掷就不同。
// 行为一致由浏览器里的整局对照保证；这里验证的是「游戏逻辑能脱开界面把一局打完」。
import test from 'node:test';
import assert from 'node:assert/strict';

const SRC = new URL('../../web/src/', import.meta.url);
const any = new Proxy(function () { }, {
  // 会让代码一直循环的几样：遍历器走到头、查一批元素是空的
  get: (t, k) => k === Symbol.toPrimitive ? () => '' : k === 'then' || k === Symbol.iterator ? undefined : k === 'length' ? 0
    : k === 'createTreeWalker' ? () => ({ nextNode: () => null }) : k === 'querySelectorAll' || k === 'getElementsByTagName' ? () => [] : any,
  apply: () => any, construct: () => any, set: () => true, has: () => false,
});
function seeded(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// 模块加载后会留下计时器（电脑轮询、动画兜底）：记下来，测完统一清掉，进程才退得出
const timers = new Set(), { setTimeout: st, setInterval: si, clearTimeout: ct, clearInterval: ci } = globalThis;
globalThis.setTimeout = (f, ms, ...a) => { const h = st(() => { timers.delete(h); f(...a); }, ms); timers.add(h); return h; };
globalThis.setInterval = (f, ms, ...a) => { const h = si(f, ms, ...a); timers.add(h); return h; };
globalThis.clearTimeout = h => { timers.delete(h); ct(h); }; globalThis.clearInterval = h => { timers.delete(h); ci(h); };
test.after(() => { for (const h of timers) { ct(h); ci(h); } });
function browserish(search) {
  const store = new Map();
  const set = o => { for (const [k, v] of Object.entries(o)) Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); };   // navigator 这类 Node 自带的是只读 getter
  set({
    window: globalThis, document: any, navigator: { userAgent: 'node', webdriver: true, clipboard: any }, location: { search, pathname: '/', hash: '', href: 'http://x/' + search },
    localStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), key: () => null, length: 0 },
    sessionStorage: { getItem: () => null, setItem() { }, removeItem() { } },
    matchMedia: () => ({ matches: false, addEventListener() { }, removeEventListener() { } }),
    addEventListener() { }, removeEventListener() { }, requestAnimationFrame: f => setTimeout(f, 0), requestIdleCallback: f => setTimeout(f, 0),
    getComputedStyle: () => any, innerWidth: 1280, innerHeight: 860, devicePixelRatio: 1, scrollY: 0, scrollTo() { }, scrollBy() { },
    Image: any, AudioContext: any, IntersectionObserver: any, ResizeObserver: any, Worker: any, RTCPeerConnection: any, Peer: any, THREE: any, GameTheme: any,
    Element: function Element() { }, Node: function Node() { }, NodeFilter: any, KeyboardEvent: function () { }, CSS: { escape: s => s },
  });
}
const strip = h => String(h ?? '').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

test('无界面整局：电脑只看弹窗数据做决定，游戏逻辑不碰页面也能打完', async () => {
  browserish('?sim=1&players=4&diff=std&act=ai');   // 和浏览器里跑 ?sim=1 一样：一局、4 人、标准局、电脑走游戏里的决策
  Math.random = seeded(1);
  const { UI } = await import(new URL('core/02b-ui-port.js', SRC));
  const { aiDecide } = await import(new URL('engine/36-ai.js', SRC));
  const state = await import(new URL('engine/07-state.js', SRC));   // S 是 let：要从模块命名空间读实时值
  const sim = await import(new URL('dev/30-sim.js', SRC));
  const asked = { n: 0, titles: new Set() };
  // 弹窗：按 spec 里的数据交给电脑选；输入框按 spec 的默认值，再叠上电脑要填的
  const decide = spec => {
    const { title = '', html = '', inputs = [], buttons = [{ value: true, cls: 'pri', label: 'OK' }], cls = '', who } = spec;
    const view = { title: strip(title), text: strip(title) + strip(html), quiz: /\bquiz\b/.test(cls), inputs: {} };
    for (const inp of inputs) view.inputs[inp.id] = { type: inp.type, min: inp.min ?? '', max: inp.max ?? '', nOpt: (inp.options || []).length };
    const p = who ?? state.S.cur;
    const { v, set } = aiDecide(view, inputs, buttons, p);
    const inp = Object.fromEntries(inputs.map(x => [x.id, x.value ?? '']));
    for (const [k, val] of Object.entries(set)) inp[k] = val && typeof val === 'object' ? (inputs.find(x => x.id === k).options || [])[val.selectedIndex]?.value : val;
    asked.n++; asked.titles.add(view.title.slice(0, 12));
    return { v, inp };
  };
  const noop = () => { }, asyncNoop = async () => { };
  Object.assign(UI, {
    ask: async spec => decide(spec).v, modal: async spec => decide(spec), info: async () => true,
    render: noop, hopRender: noop, rentFx: noop, sfx: noop, dealSfx: noop, toast: noop, save: noop, reportErr: noop, aipBtnUpd: noop,
    showCard: asyncNoop, dealNow: asyncNoop, overScreens: asyncNoop, timedOver: asyncNoop,
    cardHtml: () => '', dealHtml: () => '', pcardHtml: () => '', propInfoHtml: () => '',
    FX: new Proxy({}, { get: (t, k) => k === 'ok' ? () => false : asyncNoop }), SQFX: {}, animK: () => 0,
    modalBlocks: () => false, modalHidden: () => true, modalMin: () => false, tourOpen: () => false, viewOpen: () => false, inGame: () => true, vimErr: noop,
    __set_CARD_DEAL: noop, __set_MODAL_CUR: noop, __set_MOVE_TO: noop, CARD_DEAL: null, MODAL_CUR: null, MOVE_TO: null, VIEW_CUR: null,
  });
  await sim.simMain();
  const s = state.S;
  assert.ok(s.over, '一局要打完');
  assert.ok(s.round >= 5, `至少打 5 轮（实际 ${s.round}）`);
  assert.ok(asked.n > 50, `电脑要做过很多次选择（实际 ${asked.n}）`);
  console.log(`HEADLESS ${JSON.stringify({ round: s.round, winner: s.winner, asked: asked.n, kinds: asked.titles.size, log: s.log.length })}`);
});
