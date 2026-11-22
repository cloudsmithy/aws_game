import { AWSI } from '../data/icons.js';
// ================= 基础工具 =================
export const BOT = /[?&](bot|sim)=/.test(location.search);
export const SIM = new URLSearchParams(location.search).get('sim');
export const DEMO = new URLSearchParams(location.search).get('demo');   // 演示截图（?demo=…）；和 BOT、SIM 一样是网址参数，从 core/43-boot.js 挪来
export const SIM_AI = new URLSearchParams(location.search).get('act') === 'ai';
export const KEY = 'aws-tycoon-save-v2';
// 存档只有一份，同一个浏览器里的几个标签页共用（file:// 下别的目录里的 index.html 也共用）。旁边记一个版本号，每存一次加 1；
// MY_REV 是这个页面最后写进去（或接手时读到）的号，对不上就说明别处动过存档，这边再写就把那边的进度盖掉了
export const REV_KEY = KEY + '-rev';
export let MY_REV = -1, STALE = false;
// 存档最近一次没写进去（存储满了、浏览器禁止网站存数据）：退出窗、出错条、「退出到开局页」的悬停文字都改口。只放在页面里，不进 S（S 会存进存档、发给远端）
export let SAVE_FAIL = false;
export const revNow = () => { try { return +localStorage.getItem(REV_KEY) || 0; } catch (e) { return 0; } };
export const $ = s => document.querySelector(s);
// 回开局页的网址：只留自建信令服务器的参数（?peerhost= 等），房主再建房间、玩家再加入还连同一个服务器；别的参数（?bot、?demo、?ug…）都去掉
export const homeUrl = () => { const q = new URLSearchParams(location.search), keep = new URLSearchParams(); ['peerhost', 'peerport', 'peerpath'].forEach(k => { if (q.get(k)) keep.set(k, q.get(k)); }); return location.pathname + (String(keep) ? '?' + keep : ''); };
// 后台标签页里 setTimeout / setInterval 会被节流到 1s（藏 5 分钟后更狠），而对局的节奏全靠定时器，
// 房主一切走整桌就跟着卡。用一个专用 Worker 的定时器当钟：Worker 里的定时器不受页面隐藏的节流影响。
// Worker 建不起来（file:// 打开、策略禁止 blob）就退回普通 setTimeout，行为不变。
export const CLK = (() => {
  let w = null, seq = 0; const wait = new Map();
  try {
    const src = 'const t=new Map();onmessage=e=>{const d=e.data;if(d.set){t.set(d.id,setTimeout(()=>{t.delete(d.id);postMessage(d.id)},d.ms));}else{clearTimeout(t.get(d.id));t.delete(d.id);}};';
    w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    w.onmessage = e => { const f = wait.get(e.data); if (f) { wait.delete(e.data); f(); } };
  } catch (e) { w = null; }
  return {
    ok: !!w,
    set(ms) { if (!w) return new Promise(r => setTimeout(r, ms)); return new Promise(r => { const id = ++seq; wait.set(id, r); w.postMessage({ set: 1, id, ms }); }); },
  };
})();
// 机器人自测和模拟还是走 setTimeout(0)：等条件的循环（MPFX 里等骰子停那种）靠它把事件循环让出去，换成微任务会把主线程占死
export const sleep = ms => BOT ? new Promise(r => setTimeout(r, 0)) : CLK.set(ms);
// 动画最多等 dur：房主机器慢、掉帧时逻辑不跟着等，宁可让动画追帧，全桌节奏不再被房主显卡拖住
export const waitAnim = (p, dur) => Promise.race([p, CLK.set(dur)]);
export const rnd = n => Math.floor(Math.random() * n);
export const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// 座位颜色：前 4 个是 1–4 号位（4 人以内的局和存档只用这 4 个），后 8 个给「多人（超过 4 人）」的 5–12 号位（engine/07-state.js 的 MAX_PLAYERS）
export const COLORS = ['#e5484d', '#2f7cf6', '#1f9d55', '#9b5cf6', '#f97316', '#14b8a6', '#ec4899', '#84cc16', '#38bdf8', '#facc15', '#94a3b8', '#c8a27a'];
export const clean = s => String(s).replace(/^(?:\p{Extended_Pictographic}|\uFE0F|\u200D|\s)+/u, '');
export const awsImg = (k, cls = '') => AWSI[k] ? `<img class="awsi ${cls}" data-icon="${k}" src="${AWSI[k]}" alt="" draggable="false">` : '';
// 座位号圆点；t 可以换掉里面的字：战报抬头和结束动画的冠军大圆写「3号」，免得皇冠下面一个大「3」被看成第 3 名
export const PAWN = (c, t = COLORS.indexOf(c) + 1) => `<span class="pawn" style="--pc:${c};--pawn-ink:${COLORS.includes(c) ? '#0b111c' : '#fff'}">${t}</span>`;

// ================= 事件委托：data-act 代替行内 onclick =================
// HTML（含模板字符串）里不写 onclick="fn()"：元素带 data-act="动作名"、可选 data-arg="参数"（字符串，处理函数自己转数字），
// 这里一个 document 级监听按名字查 ACTS 调用。别的事件同理：data-act-keydown / data-act-change / data-act-toggle。
// 处理函数拿到 (el, e, arg)：el 就是原来行内写法里的 this，e 是 event。动作名就用原来调的函数名（MP 的方法带 MP. 前缀），
// actKey 按它拼回原来 onclick 的原文，联机的 MP.ONCLICK、焦点还原（focusKey）照旧按原文认按钮。
// 这几个监听是最早挂在 document 上的，所以先于别的 document 监听跑，和原来元素上的 onclick 一样；处理函数里 stopPropagation
// 了就补一个 stopImmediatePropagation，后面的 document 监听也挡住。联机远端截按钮的监听在捕获阶段，照样先于这里。
// 还没改的翻译串里仍是行内 onclick，照常有效；它们要用的动作也已经登记在 ACTS 里，翻译串改成 data-act 就能用。
export const ACTS = Object.create(null);   // 动作名 → (el, e, arg) => …；表在 core/43-boot.js 里填（这里不引用后面文件里的函数）
// 按钮的「身份」：还是行内 onclick 的用原文；data-act 的拼成原来的写法 fn(参数)，数字、true/false、uiAction 的函数名不加引号
export const actKey = el => {
  const on = el.getAttribute('onclick'); if (on != null) return on;
  const act = el.dataset.act; if (act == null) return null;
  const a = el.dataset.arg;
  return `${act}(${a == null ? '' : /^-?\d+$|^(true|false)$/.test(a) || act === 'uiAction' ? a : `'${a}'`})`;
};
// 按钮（含行内 onclick 还没改的）：联机代码按这个选，键用 actKey
const ACT_BTN = 'button:is([onclick], [data-act])';
function actRun(e, attr) {
  for (let el = e.target instanceof Element ? e.target.closest(`[${attr}]`) : null; el; el = el.parentElement && el.parentElement.closest(`[${attr}]`)) {
    if (el.matches(':disabled')) continue;   // 灰掉（disabled）的按钮原来行内 onclick 也不会跑
    const name = el.getAttribute(attr), f = ACTS[name];
    if (!f) { console.error('unknown data-act', name); continue; }
    f(el, e, el.dataset.arg);
    if (e.cancelBubble) { e.stopImmediatePropagation(); return; }   // 行内处理函数里 stopPropagation 会挡住所有 document 监听，这里补上
  }
}
document.addEventListener('click', e => actRun(e, 'data-act'));
document.addEventListener('keydown', e => actRun(e, 'data-act-keydown'));
document.addEventListener('change', e => actRun(e, 'data-act-change'));
// toggle 不冒泡：捕获阶段接住，只认 <details> 自己的
document.addEventListener('toggle', e => { const el = e.target; if (el instanceof Element && el.hasAttribute('data-act-toggle')) { const f = ACTS[el.getAttribute('data-act-toggle')]; if (f) f(el, e, el.dataset.arg); else console.error('unknown data-act-toggle', el.getAttribute('data-act-toggle')); } }, true);
// 别的文件要改这些变量（import 进来是只读的），走这里
export const __set_MY_REV = v => (MY_REV = v);
export const __set_STALE = v => (STALE = v);
export const __set_SAVE_FAIL = v => (SAVE_FAIL = v);
// （从 ui/28-setup-save.js 挪来）
// ================= 开局 / 存档 =================
// 局里改名字：同一台电脑上谁都能改；联机时只能改自己的（房主能改本机上的座位），客户端发给房主改
export const unesc = h => String(h).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
// （从 ui/26c-report.js 挪来）
// 金额：负数用真正的减号（U+2212），和加号、数字等宽，列里右对齐不会错位；sign 时正数也带 +（「与第 1 名」那一列）
export const usd = (v, sign = false) => { v = Math.round(v || 0); return (v < 0 ? '−' : sign && v > 0 ? '+' : '') + '$' + Math.abs(v); };
