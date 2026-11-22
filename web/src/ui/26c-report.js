import { _t, _tf, _tr } from '../core/01-i18n-runtime.js';
import { BOT, COLORS, PAWN, SIM, awsImg, clean, esc, unesc, usd } from '../core/02-util.js';
import { SQ } from '../rules/03-services.js';
import { COMBOS, INC, roleOf } from '../rules/04-roles-combos-cards.js';
import { DLC } from '../rules/05-dlc.js';
import { P, S, hasCombo, logBody, logTime, ownedBy, winParts, winWA } from '../engine/07-state.js';
import { netWorth, valBreak, valTip, valuation } from '../engine/08c-costs.js';
import { pillars } from '../engine/26a-pillars-win.js';
import { ST, finEdge, repExtra, reportEventIs, reportOutRound, retroOf, retroTxt } from '../engine/26b-retro.js';
import { finKind, finalRank, statTxt } from '../engine/26d-gameover.js';
import { modeName } from '../rules/35-modes.js';
const finTitle = (w, why) => ({ none: _t(3749, "这一局没有赢家"), wa: _tf(3750, "{$0} 达成六大支柱，提前胜出", w && w.name), last: _tf(3751, "{$0} 撑到最后，赢下这一局", w && w.name), val: _tf(3752, "{$0} 获胜", w && w.name) })[finKind(w, why)];
// 标题前面是赢家的棋子（和泳道、棋盘上的对得上），名字本身不上座位色；棋子上的座位号不念
export const finTitleHtml = (w, why) => `${w ? `<span class="pawn" aria-hidden="true" style="--pc:${w.color}">${COLORS.indexOf(w.color) + 1}</span>` : ''}<span>${finTitle(w, why)}</span>`;
// 标题下面那一句：怎么结束的 + 领先第 2 名多少、拉开最多的是哪一项。估值另外写在泳道里，原因里的「（$4030）」去掉，不说两遍
export function finSub(w, why) {
  const k = finKind(w, why), e = finEdge(w), base = String(why || '').replace(_tr(3756, "（[−-]?\\$-?\\d+）$", ""), '');
  const lead = e => e.lead > 0 ? _tf(3757, "领先第 2 名 {$0} {$1}{$2}", e.r2.name, usd(e.lead), e.by ? _tf(3682, "，拉开最多的是{$0}（{$1} {$2}）", e.by[0], e.by[2], usd(e.by[1])) : '') : e.lead === 0 ? _tf(3758, "和第 2 名 {$0} 估值持平", e.r2.name) : _tf(3759, "估值上 {$0} 高 {$1}", e.r2.name, usd(-e.lead));
  if (k === 'none') return _tr(3760, "暂停了账[号户]", "").test(base) ? _t(3761, "所有玩家的账户都被暂停了") : base || _t(3762, "没有玩家留在场上");
  if (k === 'last') return _tf(3763, "第 {$0} 轮，其他玩家的账户都被暂停了", S.round);
  // 六大支柱赢的人估值不一定最高：比他高的写出来，说明这一局不比估值
  if (k === 'wa') { const h = _tf(3764, "第 {$0} 轮六大支柱 6/6 达成，按胜利条件直接结束", S.round); return !e ? h : e.lead < 0 ? _tf(3765, "{$0}，不比估值（{$1} 估值多 {$2}）", h, e.r2.name, usd(-e.lead)) : e.lead === 0 ? _tf(3766, "{$0}；和第 2 名 {$1} 估值持平", h, e.r2.name) : _tf(3767, "{$0}；估值也{$1}", h, lead(e)); }
  return base + (e ? _tf(3768, "。{$0}", lead(e)) : '');
}
// 战报导语：只写这一局的事实和数字（结束方式、领先多少、过路费谁收得最多、单笔最大的一笔在第几轮、谁第几轮出局），没有的项不写
function finLede(w, why) {
  const s = [finSub(w, why)], ev = S.events || [], topR = Math.max(0, ...S.players.map(q => ST(q).rentIn));
  if (topR > 0) s.push(_tf(3769, "过路费 {$0} 收得最多（${$1}）", S.players.filter(q => ST(q).rentIn === topR).map(q => q.name).join(_t(349, "、")), topR));
  const big = ev.filter(e => reportEventIs(e, 'rent')).sort((a, b) => b.w - a.w)[0];
  if (big) s.push(_tf(3770, "单笔最大的一笔 ${$0} 出在第 {$1} 轮", big.w, big.r));
  const gone = finalRank(w).filter(q => !q.alive).map(q => { const r = reportOutRound(q); return r != null ? _tf(3771, "{$0} 第 {$1} 轮出局", q.name, r) : _tf(3772, "{$0} 出局", q.name); });
  if (gone.length) s.push(gone.join(_t(2698, "，")));
  return s.filter(Boolean).join(_t(408, "；")) + _t(2988, "。");
}
// 关键时刻：估值走势和大事放在同一根轮次轴上。第 r 轮占 [r, r+1) 一格：每轮开始记的估值画在格子左沿，终局值画在最后一格右沿，
// 事件立在那一轮的正中，过路费越大越高越亮，出局的是红色、顶到最高；编号对应下面的列表。编号、刻度、出局棋子要按实际像素躲开彼此，在 repLayout 里排。
// 图只给眼睛看，读屏念一句走势和列表
function repTimeline(w, rank, X) {
  const R = Math.max(1, S.round), x1 = R + 1, px = x => ((Math.min(x1, Math.max(1, x)) - 1) / R * 100).toFixed(2), isOut = e => reportEventIs(e, 'out'), num = y => typeof y === 'number' && isFinite(y);
  // 取分量最重的 8 件事（和正式版同一个口径），再按轮次排；同一轮里按发生的先后（S.events 里的下标），压垮人的那笔过路费排在破产前面
  const ev = (S.events || []).map((e, i) => ({ ...e, i })).sort((a, b) => b.w - a.w).slice(0, 8).sort((a, b) => a.r - b.r || a.i - b.i);   // 整个展开：只挑 r/t/w 会把 kind 丢掉，isOut 就退回匹配文案了
  const outR = reportOutRound;
  let chart = '', sr = '';
  if (X.vh.length >= 2) {
    // 每人一条线。出局以后记的是空值：线从最后一个有数的点落到出局那一轮正中（和事件条上的红竖线同一处）的 $0，红叉打在那里
    const lines = rank.map((q, k) => { const o = outR(q), a = [];
      X.vh.forEach((e, j) => { const y = e[1 + q.id], x = j === X.vh.length - 1 && S.over ? x1 : e[0]; if (num(y) && (o == null || x <= o)) a.push([x, y]); });
      if (o != null && a.length) a.push([o + .5, 0]);
      return { q, k, a, out: !q.alive }; }).filter(l => l.a.length >= 2);
    if (lines.length) {
      // 纵轴：最低的也有最高的 35% 以上（短局里大家都在开局资金附近）时不从 $0 画起，下限取比最低值小的整刻度，几百块的差距才看得出；
      // 有人掉到 0 附近、欠钱或出局时从 $0（或负数）画起。顶上留 6% 的空，刻度取不少于四分之一跨度的整数，最多四五条横线
      const all = lines.flatMap(l => l.a.map(p => p[1])), mn = Math.min(...all), mx = Math.max(100, ...all);
      const lo = mn > mx * .35 ? mn - (mx - mn) * .08 : Math.min(0, mn), hi = mx + (mx - lo) * .06;
      const step = [100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 50000].find(s => s >= (hi - lo) / 4) || 1e5;
      const y0 = Math.floor(lo / step) * step, y1 = hi, py = y => ((1 - (y - y0) / (y1 - y0)) * 100).toFixed(2);
      const gy = []; for (let y = y0; y <= y1; y += step) gy.push(y);
      const isW = q => !!w && q.id === w.id;
      // 线的颜色：赢家橙色，其余按名次由浅到深三级灰（交叉的地方也分得清谁是谁；最深的一级在深底上也有 3:1）
      const GR = ['#c9d1db', '#8d99a8', '#5f6b7a'], col = l => isW(l.q) ? '#ec7211' : GR[Math.min(GR.length - 1, Math.max(0, l.k - (w ? 1 : 0)))];
      // 赢家那条最后画（压在最上面），其余名次靠后的先画
      const order = [...lines].sort((a, b) => isW(a.q) - isW(b.q) || b.k - a.k);
      const svg = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${gy.map(y => `<line class="${y === 0 && y0 < 0 ? 'z' : ''}" x1="0" x2="100" y1="${py(y)}" y2="${py(y)}" vector-effect="non-scaling-stroke"/>`).join('')}`
        + ev.map(e => `<line class="gd${isOut(e) ? ' out' : ''}" x1="${px(e.r + .5)}" x2="${px(e.r + .5)}" y1="0" y2="100" vector-effect="non-scaling-stroke"/>`).join('')
        + order.map(l => `<polyline class="${isW(l.q) ? 'w' : ''}" stroke="${col(l)}" points="${l.a.map(p => `${px(p[0])},${py(p[1])}`).join(' ')}" vector-effect="non-scaling-stroke"/>`).join('') + '</svg>';
      // 线尾：走到终局的在右边写「棋子 + 终局估值」（离得太近的上下错开一个标签高）；出局的人在红叉旁边标棋子，几个人叠在一处时 repLayout 把棋子挪开
      const ends = lines.filter(l => !l.out).map(l => ({ q: l.q, v: l.a[l.a.length - 1][1], t0: +py(l.a[l.a.length - 1][1]) })).map(e => ({ ...e, t: e.t0 })).sort((a, b) => a.t - b.t);
      for (let i = 1; i < ends.length; i++) ends[i].t = Math.max(ends[i].t, ends[i - 1].t + 14);
      for (let i = ends.length - 1, lim = 104; i >= 0; i--, lim -= 14) ends[i].t = Math.min(ends[i].t, lim);
      const tags = ends.map(e => `<span class="te${isW(e.q) ? ' w' : ''}" data-t="${e.t0}" style="top:${e.t}%">${PAWN(e.q.color)}<b>${usd(e.v)}</b></span>`).join('')
        + lines.filter(l => l.out).map(l => { const p = l.a[l.a.length - 1]; return `<span class="tx" style="left:${px(p[0])}%;top:${py(p[1])}%"><i></i>${PAWN(l.q.color)}</span>`; }).join('');
      const yl = gy.map(y => `<span class="ty" style="top:${py(y)}%">${usd(y)}</span>`).join('');
      chart = _tf(3776, "<p class=\"tr-cap\">估值走势<span>每轮开始时记一次，最右边是终局</span></p><div class=\"tr-c\" aria-hidden=\"true\">{$0}{$1}{$2}</div>", svg, yl, tags);
      // 读屏：每人一句「起点 → 最高 → 终局」
      sr = _tf(3780, "<p class=\"sr-only\">估值走势：{$0}。</p>", lines.map(l => { const a = l.a, m = a.reduce((b, p) => p[1] > b[1] ? p : b, a[0]); return _tf(3779, "{$0} 从 {$1} 到{$2}，最高 {$3}", l.q.name, usd(a[0][1]), l.out ? _t(3777, "出局") : _tf(3778, "终局 {$0}", usd(a[a.length - 1][1])), usd(m[1])); }).join(_t(408, "；")));
    }
  }
  if (!chart && !ev.length) return '';
  // 事件条：每件事一根竖线，过路费越大越高越亮，出局的红色；编号排成一行，挨得近的左右推开、用细线连回自己的竖线（repLayout 里按像素排）
  const wTop = Math.max(1, ...ev.filter(e => !isOut(e)).map(e => e.w)), f = e => isOut(e) ? 1 : Math.min(1, e.w / wTop);
  const pins = ev.map(e => `<i class="pin${isOut(e) ? ' out' : ''}" data-r="${e.r}" data-x="${px(e.r + .5)}" style="left:${px(e.r + .5)}%;--h:${Math.round(8 + 20 * f(e))}px;--o:${(0.5 + 0.5 * f(e)).toFixed(2)}"></i>`).join('')
    + ev.map((e, k) => `<b class="pl${isOut(e) ? ' out' : ''}" style="left:${px(e.r + .5)}%">${k + 1}</b>`).join('');
  // 刻度：每 2 轮一个时写单数（1、3、5…），5、10 轮一个时写整数倍（1、5、10…）；压到右端「第 N 轮」的那个在 repLayout 里藏掉
  const step = R <= 6 ? 1 : R <= 12 ? 2 : R <= 30 ? 5 : R <= 60 ? 10 : 20, marks = [1];
  for (let r = step === 2 ? 3 : step; r < R; r += step) if (r > 1) marks.push(r);
  const ticks = marks.map(r => `<span class="tk" style="left:${px(r + .5)}%">${r}</span>`).join('') + (R > 1 ? _tf(3781, "<span class=\"tk end\">第 {$0} 轮</span>", R) : '');
  const axis = `<div class="tr-a${ev.length ? '' : ' bare'}" aria-hidden="true">${ev.length ? '<svg class="lk"></svg>' : ''}${pins}</div><div class="tr-t" aria-hidden="true">${ticks}</div>`;
  const list = ev.length ? `<ol class="tl">${ev.map((e, k) => _tf(3782, "<li class=\"{$0}\"><b class=\"no\" aria-hidden=\"true\">{$1}</b><span class=\"r\">第 {$2} 轮</span><span class=\"t\">{$3}</span></li>", isOut(e) ? 'out' : '', k + 1, e.r, esc(e.t))).join('')}</ol>` : '';
  return `<section class="sx tr"><div class="sx-h"><h4>${_t(3783, "关键时刻")}</h4>${_t(3784, "<span class=\"tag\">按轮次</span>")}</div><div class="tr-f${chart ? '' : ' nc'}">${chart}${axis}</div>${sr}${list}</section>`;
}
// 关键时刻里要按实际像素排的几样（宽度跟着窗口变，窗口一变重排一次）：
// 1. 同一轮、相邻几轮的竖线至少隔 3 像素，不重成一根；2. 编号排成一行，挨得近的左右推开（保持先后顺序、尽量靠近自己的竖线），细线连回竖线顶；
// 3. 压到右端「第 N 轮」或前一个刻度的刻度藏掉；4. 出局的红叉旁边的棋子：右边被别的棋子、红叉、线尾标签占了，就换到右上、左边、更高的地方
function repLayout(r) {
  const ov = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
  const a = r.querySelector('.tr-a:not(.bare)');
  if (a && a.offsetWidth) {
    const W = a.clientWidth, H = a.clientHeight, pins = [...a.querySelectorAll('.pin')], labs = [...a.querySelectorAll('.pl')];
    // 一维排开：x 是理想的中心，w 是宽度，相邻两个至少隔 g。从左往右放，和前一组挤在一起就并成一组，
    // 整组放在组里各项理想位置的平均处（先后顺序不变，不出两头）
    const spread = (x, w, g) => { const B = [];
      x.forEach((xi, i) => { let k = { s: i, m: 1, t: xi - w[i] / 2, len: w[i] };
        for (;;) { k.L = Math.max(0, Math.min(k.t / k.m, W - k.len)); const p = B[B.length - 1]; if (!p || p.L + p.len + g <= k.L) break;
          B.pop(); k = { s: p.s, m: p.m + k.m, t: p.t + k.t - k.m * (p.len + g), len: p.len + g + k.len }; }
        B.push(k); });
      const c = []; B.forEach(k => { let at = k.L; for (let i = k.s; i < k.s + k.m; i++) { c[i] = at + w[i] / 2; at += w[i] + g; } }); return c; };
    // 竖线 2px 宽、至少隔 3px：同一轮、相邻几轮的几件事各有各的竖线，不重成一根
    const xs = spread(pins.map(p => +p.dataset.x / 100 * W), pins.map(() => 2), 3);
    pins.forEach((p, k) => { p.style.left = xs[k].toFixed(1) + 'px'; });
    const cx = spread(xs, labs.map(b => b.offsetWidth), 4);
    labs.forEach((b, i) => { b.style.left = cx[i].toFixed(1) + 'px'; });
    // 连线：竖线顶 → 编号底边正中
    const svg = a.querySelector('svg.lk');
    if (svg) { svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.innerHTML = pins.map((p, i) => labs[i] ? `<line class="${p.classList.contains('out') ? 'out' : ''}" x1="${xs[i].toFixed(1)}" y1="${H - p.offsetHeight}" x2="${cx[i].toFixed(1)}" y2="${labs[i].offsetTop + labs[i].offsetHeight}"/>` : '').join(''); }
  }
  const t = r.querySelector('.tr-t');
  if (t && t.offsetWidth) {
    const ks = [...t.querySelectorAll('.tk:not(.end)')], end = t.querySelector('.tk.end'), er = end && end.getBoundingClientRect(); let last = -Infinity;
    ks.forEach(k => { k.style.visibility = ''; const b = k.getBoundingClientRect(), hide = b.left < last + 8 || (er && b.right > er.left - 8); k.style.visibility = hide ? 'hidden' : ''; if (!hide) last = b.right; });
  }
  const c = r.querySelector('.tr-c');
  if (c && c.offsetWidth) {
    // 线尾标签按像素错开：上下至少隔 19px（标签 18px 高），最低的不低于图底 8px
    const CH = c.clientHeight, te = [...c.querySelectorAll('.te')].map(e => ({ e, y: parseFloat(e.dataset.t) / 100 * CH })).sort((x, y) => x.y - y.y);
    te.forEach((t, i) => { if (i) t.y = Math.max(t.y, te[i - 1].y + 19); });
    for (let i = te.length - 1, lim = CH + 8; i >= 0; i--) { te[i].y = Math.min(te[i].y, lim); lim = te[i].y - 19; }
    te.forEach(t => { t.e.style.top = t.y.toFixed(1) + 'px'; });
    const txs = [...c.querySelectorAll('.tx')].sort((x, y) => parseFloat(x.style.left) - parseFloat(y.style.left) || parseFloat(y.style.top) - parseFloat(x.style.top));
    const taken = [...c.querySelectorAll('.te')].map(e => e.getBoundingClientRect()).concat(txs.map(x => x.querySelector('i').getBoundingClientRect()));
    // 棋子 18px：右边（默认）→ 右上 → 左边 → 再往上；都占了就留在最后一个候选位置
    const CAND = [[8, -9], [8, -29], [-26, -9], [-26, -29], [8, -49], [-26, -49]];
    txs.forEach(x => { const pw = x.querySelector('.pawn'); if (!pw) return;
      for (const [dx, dy] of CAND) { pw.style.left = dx + 'px'; pw.style.top = dy + 'px'; if (!taken.some(b => ov(b, pw.getBoundingClientRect()))) break; }
      taken.push(pw.getBoundingClientRect()); });
  }
}
// 战报的查看状态：看到谁的档案（k）、详细数据开没开（open）、滚到哪儿（top）。点「导出对局记录」时 showReport 会关掉再重画一遍战报，
// 这时 keep 记着点导出的时刻，重画出来接着看原来那一份、停在原来的位置；其余时候（结束后第一次弹、台面上「查看战报」再开）都从头看。
// 只认 3 秒以内的：导出按钮被 modal 的防误触挡掉、没真的重画时，过一会儿再开战报不会被当成重画
let REP_ST = null, REP_RO = null;
export const repSt = () => REP_ST || (REP_ST = { k: 0, open: false, top: 0, keep: 0, rid: 0 });
const repKeep = st => !!st.keep && performance.now() - st.keep < 3000;
function repMount(rid) {
  const r = document.querySelector(`#modal .report[data-rid="${rid}"]`), box = r && r.closest('.box'), st = repSt(); if (!box) return;
  const xs = [...box.querySelectorAll('.btns button')].filter(b => _tr(3785, "导出", "").test(b.textContent)), x = xs[st.kx || 0] || xs[0];
  // 关键时刻按像素排：窗口大小变了（转屏、收起再展开）重排；战报关掉以后观察器自己断开
  if (REP_RO) REP_RO.disconnect();
  const f = r.querySelector('.tr-f');
  if (f && window.ResizeObserver) { const ro = REP_RO = new ResizeObserver(() => { if (r.isConnected) repLayout(r); else ro.disconnect(); }); ro.observe(f); } else repLayout(r);
  if (repKeep(st)) {
    box.scrollTop = st.top; st.keep = 0;
    // 导出以后重画的这一窗：焦点放回导出按钮（modal 默认放在「知道了」上，顺手再按一次回车会把战报关掉）。modal 的默认焦点也是 setTimeout 0 放的，这里排在它后面
    if (x) setTimeout(() => { if (x.isConnected) x.focus({ preventScroll: true }); }, 0);
  } else st.top = 0;
  // modal 每开一个窗都会把 onscroll 清掉，所以挂在这里不会带到别的窗口；导出按钮是这一窗新建的，监听跟着它一起没
  box.onscroll = () => { if (r.isConnected) st.top = box.scrollTop; };
  // 捕获阶段挂：真的鼠标点击、回车时，modal 自己的 onclick 一返回，微任务里 showReport 就已经在重画了，挂在冒泡阶段会晚一步
  xs.forEach((b, k) => b.addEventListener('click', () => { st.keep = performance.now(); st.kx = k; }, true));
}
// 战报（深色，和结束画面「最终架构总览」同一套画法：深色网格底、1px 细线框、框左上角贴标签、官方服务图标）。
// 上半是总览：结果和结束原因、估值横条排名（带与第 1 名的差距）、本局之最（外号 ……… 谁 · 多少）、关键时刻（估值走势 + 事件时间轴）；
// 下半是玩家档案：一排棋子切换（默认赢家，点谁看谁，左右键也能切），一次只看一个人的完整复盘。估值拆分和详细数据折在最后
export function reportHtml(w, why) {
  const rank = finalRank(w), n = rank.length, outN = S.players.filter(q => !q.alive).length, dlc = (S.cfg.dlc || []).map(k => DLC[k].n).join(_t(349, "、"));
  const archs = q => COMBOS.filter(c => hasCombo(q, c.id)), isW = q => !!w && q.id === w.id, kind = finKind(w, why), wa = winWA(), X = repExtra();
  const top = n ? valuation(rank[0]) : 0, vmax = Math.max(1, ...rank.map(valuation));
  const who = q => `<span>${PAWN(q.color)}<b>${q.name}</b></span>`;
  // 抬头：标签写第几轮、什么模式；标题和结束原因跟结束画面同一句；下面一行是用时（新指标）、人数和胜利条件
  const facts = [X.minTxt && _tf(3786, "用时 <b>{$0}</b>", X.minTxt), _tf(3788, "<b>{$0}</b> 人{$1}", n, outN ? _tf(3787, "，<b>{$0}</b> 人出局", outN) : ''), _tf(3789, "胜利条件 <b>{$0}</b>", winParts().map(x => x[0]).join(' + ')), dlc && `DLC <b>${dlc}</b>`].filter(Boolean);
  // 估值横条：条长按估值（最高的占满），赢家橙色、出局的淡；右边是估值和与第 1 名差多少，下面一行是过路费收付和数量
  const gapOf = (q, k) => k ? _tf(3790, "<small>与第 1 名</small><b>{$0}</b>", valuation(q) === top ? _t(3716, "持平") : usd(valuation(q) - top, true)) : kind === 'wa' && isW(q) ? _t(3791, "<small>六大支柱</small><b>6/6</b>") : '';
  // 一行里的各块都是 li 的直接格子（名次、棋子、名字、角色、条、估值、差距、小字），宽屏和窄屏各摆一种；小字按「 · 」分段，只在段之间折行
  const row = (q, k) => { const t = ST(q), v = valuation(q), seg = [_tf(3792, "过路费 收 <b>${$0}</b> / 付 <b>${$1}</b>", t.rentIn, t.rentOut), _tf(3793, "<b>{$0}</b> 块服务", ownedBy(q).length), _tf(3794, "<b>{$0}</b> 个架构", archs(q).length), _tf(3795, "升级 <b>{$0}</b> 次", t.upg), wa && _tf(3796, "支柱 <b>{$0}/6</b>", pillars(q).filter(Boolean).length)].filter(Boolean);
    // 角色 · 代理商 · 在线/已出局：每段一个 span，放不下就在段之间折行；只有角色名本身比一整行还长时才出省略号，在线/已出局一直看得到
    const gap = gapOf(q, k);
    return `<li class="${isW(q) ? 'win' : ''}${q.alive ? '' : ' out'}${gap ? '' : ' ng'}" style="--d:${k * 70}ms"><span class="no">${k + 1}</span>${PAWN(q.color, '')}<b class="rkn" title="${q.name}">${q.name}</b><small class="rkr"><span class="ro">${roleOf(q).n}</span>${q.reseller ? _t(3797, "<span>代理商</span>") : ''}<span>${q.alive ? _t(3725, "在线") : _t(3726, "已出局")}</span></small>
      <div class="bar" aria-hidden="true"><i style="--w:${Math.max(1.5, Math.max(0, v) / vmax * 100).toFixed(1)}%"></i></div>
      <div class="v" title="${valTip(q)}">${_tf(3798, "<b>{$0}</b><small>估值</small>", usd(v))}</div><div class="g">${gap}</div>
      <p class="s">${seg.map(x => `<span>${x}</span>`).join(' · ')}</p></li>`; };
  const note = kind === 'wa' ? _t(3799, "<p class=\"rk-note\">这局按六大支柱判胜：达成六大支柱的人排第一，不比估值；其余在线的按估值排，出局的排最后。</p>") : kind === 'none' ? _t(3800, "<p class=\"rk-note\">没有赢家：在线的按估值排，出局的排最后。</p>") : '';
  // 本局之最：外号照旧，后面一句写比的是什么，点线拉到右边写是谁、多少；并列的都写上，全是 0 的项不列
  const best = f => { const v = S.players.map(f), mx = Math.max(...v); return mx > 0 ? { mx, ps: S.players.filter((q, k) => v[k] === mx) } : null; };
  const item = (nick, what, f, unit) => { const b = best(f); return b ? `<li><span class="nk"><b>${nick}</b>${what ? `<small>${what}</small>` : ''}</span><i class="ld" aria-hidden="true"></i><span class="rt"><span class="wh">${b.ps.map(who).join('')}</span><span class="vv">${unit(b.mx)}</span></span></li>` : ''; };
  const leads = [
    item(_t(3801, "收租王"), _t(3802, "过路费收得最多"), q => ST(q).rentIn, x => `$${x}`),
    item(_t(3803, "单笔最大过路费"), '', q => ST(q).maxRent, x => `$${x}`),
    item(_t(3804, "最惨运维"), _t(3805, "被 Health 事件罚得最多"), q => ST(q).hit, x => _tf(3806, "{$0} 次", x)),
    item(_t(3807, "最稳架构"), _t(3808, "免疫事件次数最多"), q => ST(q).imm, x => _tf(3806, "{$0} 次", x)),
    item(_t(3809, "架构师"), _t(3810, "组成的有效架构最多"), q => archs(q).length, x => _tf(3811, "{$0} 个", x)),
    item(_t(3812, "学霸"), _t(3813, "答对题最多"), q => ST(q).quizOk, x => _tf(3814, "{$0} 题", x)),
    item(_t(3815, "混沌工程师"), _t(3816, "FIS 攻击最多"), q => ST(q).fis, x => _tf(3806, "{$0} 次", x)),
  ].join('');
  // 新加的两项另起一小段：手气最好（平均点数，掷满 3 次才比）、全场最赚钱的格子（所有人的 earnBy 按格子加起来）
  const extra = [item(_t(3817, "手气最好"), _t(3818, "平均点数最高"), q => { const d = X.dice(q); return d && d.n >= 3 ? Math.round(d.avg * 10) / 10 : 0; }, x => _tf(3819, "{$0} 点", x.toFixed(1))),
    // 最赚钱的格子：「[图标] DynamoDB · 虫虫」是一整块，放不下就整块换到下一行，不在服务名和人名中间拆开
    X.hot ? `<li>${_tf(3820, "<span class=\"nk\"><b>最赚钱的格子</b><small>一局收得最多的服务</small></span><i class=\"ld\" aria-hidden=\"true\"></i><span class=\"rt\"><span class=\"wh\"><span class=\"hs\">{$0}<b>{$1}</b><em>· {$2}</em></span></span><span class=\"vv\">${$3}</span></span>", awsImg(SQ[X.hot.i].icon), SQ[X.hot.i].n, X.hot.q.name, X.hot.t)}</li>` : ''].join('');
  const leadSec = leads || extra ? _tf(3821, "<section class=\"sx ld\"><div class=\"sx-h\"><h4>本局之最</h4><span class=\"tag\">{$0} 项</span></div>{$1}{$2}</section>", (leads + extra).split('<li').length - 1, leads ? `<ul class="lead">${leads}</ul>` : '', extra ? `<ul class="lead nw">${extra}</ul>` : '') : '';
  const moments = repTimeline(w, rank, X);
  // 埋下没人踩中的 Health 卡（engine/18-reinvent.js）：结束以后大家都看得到埋在哪、是哪张
  const traps = (S.traps || []).filter(t => SQ[t.sq] && INC[t.id] && P(t.by));
  const trapSec = traps.length ? `<section class="sx trp"><div class="sx-h"><h4>${_t(5650, "没人踩中的 Health 卡")}</h4><span class="tag">${_tf(3850, "{$0} 张", traps.length)}</span></div><ul class="trp-l">${traps.map(t => `<li>${_tf(5651, "{$0} 在 {$1} 埋的「{$2}」没人踩中", P(t.by).name, SQ[t.sq].n, INC[t.id].n)}</li>`).join('')}</ul></section>` : '';
  // 玩家档案：棋子切换条（role=tablist，左右键 / Home / End 切，焦点跟着走），默认第 1 名；点「导出对局记录」后重画时接着看原来那一份（repSt）
  const hov = matchMedia('(hover: hover)').matches, st = repSt();
  const keep = repKeep(st);
  if (!keep) Object.assign(st, { k: 0, open: false, keep: 0 });
  const cur = Math.max(0, Math.min(st.k, n - 1));
  const tabs = rank.map((q, k) => `<button type="button" role="tab" id="rpt${k}" aria-controls="rpp${k}" aria-selected="${k === cur}" tabindex="${k === cur ? 0 : -1}" aria-label="${_tf(3824, "第 {$0} 名 {$1}{$2}", k + 1, q.name, isW(q) ? _t(3822, "，获胜") : q.alive ? '' : _t(3823, "，已出局"))}" class="${isW(q) ? 'win' : ''}${q.alive ? '' : ' out'}" data-act="repTab" data-arg="${k}">${_tf(3825, "<span class=\"n\" aria-hidden=\"true\">第 {$0} 名</span>{$1}<b>{$2}</b>", k + 1, PAWN(q.color, ''), q.name)}</button>`).join('');
  const dossier = _tf(3828, "<section class=\"sx dsr\"><div class=\"sx-h\"><h4>玩家档案</h4><span class=\"tag\">{$0}</span></div>\n    <div class=\"dtabs\" role=\"tablist\" aria-label=\"看谁的复盘\">{$1}</div>{$2}</section>", hov ? _t(3826, "点棋子切换，← → 也能切") : _t(3827, "点棋子切换"), tabs, rank.map((q, k) => `<div class="dp" role="tabpanel" id="rpp${k}" aria-labelledby="rpt${k}" tabindex="0" data-ttl="第 ${k + 1} 名 · ${esc(q.name)}"${k === cur ? '' : ' hidden'}>${retroOf(q, k, X, rank)}</div>`).join(''));
  // 详细数据：估值拆分（一列一个玩家，一行一项，最后一行合计）+ 每人一行的明细，深色表、数字右对齐
  const vb = rank.map(valBreak), vline = (nm, f, how, tip) => `<tr><th scope="row" class="pn">${nm}</th>${vb.map((v, k) => `<td class="n${isW(rank[k]) ? ' w' : ''}"${tip ? ` title="${valTip(rank[k])}"` : ''}>${f(v)}</td>`).join('')}<td class="how">${how}</td></tr>`;
  const split = _tf(3829, "<table class=\"dt vb\" style=\"--n:{$0}\"><caption class=\"sr-only\">估值拆分</caption><thead><tr><th scope=\"col\" class=\"pn\">项目</th>{$1}<th scope=\"col\" class=\"how\">怎么算</th></tr></thead><tbody>", n, rank.map(q => `<th scope="col" class="n${isW(q) ? ' w' : ''}"><span class="vh" title="${q.name}">${PAWN(q.color)}<span>${q.name}</span></span></th>`).join(''))
    + vline(_t(3753, "现金"), v => usd(v.cash), _t(3830, "手上的现金，扣掉没还的欠款")) + vline(_t(3729, "服务"), v => usd(v.svc), _t(3831, "持有服务的买价，下线的扣掉拿回的一半")) + vline(_t(3832, "升级和容量 ×2"), v => usd(v.inv * 2), _t(3833, "升级和加容量花的钱，估值里算两遍"))
    + vline(_t(2607, "架构"), v => usd(v.arch), _t(3834, "每个生效的架构 $200")) + vline(_t(3754, "复盘"), v => usd(v.coe), _t(3835, "每个没用掉的复盘标记 $50")) + vline(_t(3755, "技术债"), v => usd(-v.debt), _t(3836, "每个技术债 −$100"))
    + `</tbody><tfoot>${vline(_t(3714, "估值"), v => usd(v.val), _t(3837, "以上相加"), true)}</tfoot></table>`;
  // 架构名每个都不拆开，只在顿号后面折行（「私有网络」不会折成「私有网 / 络」）
  const anm = c => c.map(x => `<span class="nw">${x.n}</span>`).join(_t(3838, "、<wbr>"));
  const drow = q => { const t = ST(q), c = archs(q); return `<tr><th scope="row" class="pn"><span class="vh">${PAWN(q.color)}${q.name}</span></th><td class="n" title="${valTip(q)}">${_tf(3839, "<b>{$0}</b><small>总资产 {$1} · {$2}</small>", usd(valuation(q)), usd(netWorth(q)), q.alive ? _t(3725, "在线") : _t(3726, "已出局"))}</td><td class="n">\$${t.rentIn} / \$${t.rentOut}</td><td>${_tf(3840, "{$0} 块 · 升级 {$1} 次", ownedBy(q).length, t.upg)}</td><td class="wr">${c.length ? anm(c) : '—'}</td><td>${_tf(3841, "{$0} 张 · 罚 {$1} · 免疫 {$2}", t.inc, t.hit, t.imm)}</td><td class="n">${t.quizN ? `${t.quizOk}/${t.quizN}` : '—'}</td><td class="n">${pillars(q).filter(Boolean).length}/6</td></tr>`; };
  // 手机上的明细：一列一个玩家（和估值拆分一样），一行一项，按过路费 / 服务和架构 / Health 事件 / 答题和支柱分组；架构名那一行折行
  // 架构名一列放不下（360 宽一列只有 50 来像素，「高可用入口」会拆成两行）：格子里写个数，名字在下面一整行按人写
  const archN = rank.filter(q => archs(q).length).map(q => `<span><b>${q.name}</b> ${anm(archs(q))}</span>`).join('');
  const pc = (f, cls = '') => rank.map(q => `<td class="n${cls}${isW(q) ? ' w' : ''}">${f(q, ST(q))}</td>`).join('');
  const tl = (nm, f, cls = '', tc = '') => `<tr${cls ? ` class="${cls}"` : ''}><th scope="row" class="pn">${nm}</th>${pc(f, tc)}</tr>`, tg = nm => `<tr class="gh"><th scope="rowgroup" colspan="${n + 1}">${nm}</th></tr>`;
  const tp = _tf(3842, "<table class=\"dt tp\" style=\"--n:{$0}\"><caption class=\"sr-only\">每人明细</caption><thead><tr><th scope=\"col\" class=\"pn\"><span class=\"sr-only\">项目</span></th>{$1}</tr></thead>", n, rank.map(q => `<th scope="col" class="n${isW(q) ? ' w' : ''}"><span class="vh" title="${q.name}">${PAWN(q.color)}<span>${q.name}</span></span></th>`).join(''))
    + `<tbody>${tl(_t(3714, "估值"), q => `<b>${usd(valuation(q))}</b>`)}${tl(_t(3843, "总资产"), q => usd(netWorth(q)))}${tl(_t(3844, "状态"), q => q.alive ? _t(3725, "在线") : _t(3726, "已出局"))}</tbody>`
    + `<tbody>${tg(_t(3845, "过路费"))}${tl(_t(2542, "收"), (q, t) => `$${t.rentIn}`)}${tl(_t(2554, "付"), (q, t) => `$${t.rentOut}`)}</tbody>`
    + `<tbody>${tg(_t(3846, "服务和架构"))}${tl(_t(3729, "服务"), q => _tf(3847, "{$0} 块", ownedBy(q).length))}${tl(_t(3848, "升级"), (q, t) => _tf(3806, "{$0} 次", t.upg))}${tl(_t(2607, "架构"), q => _tf(3811, "{$0} 个", archs(q).length))}${archN ? `<tr class="wr"><td colspan="${n + 1}">${archN}</td></tr>` : ''}</tbody>`
    + `<tbody>${tg(_t(291, "Health 事件"))}${tl(_t(3849, "抽到"), (q, t) => _tf(3850, "{$0} 张", t.inc))}${tl(_t(3851, "被罚"), (q, t) => _tf(3806, "{$0} 次", t.hit))}${tl(_t(3852, "免疫"), (q, t) => _tf(3806, "{$0} 次", t.imm))}</tbody>`
    + `<tbody>${tg(_t(3853, "答题和支柱"))}${tl(_t(3854, "答题"), (q, t) => t.quizN ? `${t.quizOk}/${t.quizN}` : '—')}${tl(_t(3855, "支柱"), q => `${pillars(q).filter(Boolean).length}/6`)}</tbody></table>`;
  const more = `<details class="more"${st.open ? ' open' : ''} data-act-toggle="repOpen"><summary>${_t(3857, "详细数据<small>（估值拆分、Health 事件、答题、支柱）</small>")}</summary>
    <p class="dt-note">${_tf(3858, "排名按<b>估值</b>：总资产 + 升级和容量再算一倍 + 每个架构 $200 + 每个没用掉的复盘 $50 − 每个技术债 $100。{$0}", hov ? _t(3856, "鼠标停在估值上也能看拆分。") : '')}</p>
    <h5>${_t(3859, "估值拆分")}</h5><div class="dt-x">${split}</div>
    <h5>${_t(3860, "每人明细")}</h5><div class="dt-x">${tp}<table class="dt pp"><caption class="sr-only">${_t(3860, "每人明细")}</caption><thead><tr><th scope="col" class="pn">${_t(3861, "玩家")}</th><th scope="col" class="n">${_t(3714, "估值")}</th><th scope="col" class="n">${_t(3862, "过路费 收 / 付")}</th><th scope="col">${_t(3729, "服务")}</th><th scope="col">${_t(2607, "架构")}</th><th scope="col">${_t(291, "Health 事件")}</th><th scope="col" class="n">${_t(3854, "答题")}</th><th scope="col" class="n">${_t(3855, "支柱")}</th></tr></thead><tbody>${rank.map(drow).join('')}</tbody></table></div></details>`;
  // 读屏打开就念导语（data-desc）：结束原因、领先多少、过路费谁收得最多、单笔最大在第几轮、谁第几轮出局，再加上用时
  const rid = st.rid = (st.rid || 0) + 1; setTimeout(() => repMount(rid), 0);
  return `<div class="report dk${keep ? ' again' : ''}" data-rid="${rid}" data-act-keydown="repKey"><p class="sr-only" data-desc>${finLede(w, why)}${X.minTxt ? _tf(3863, "用时 {$0}。", X.minTxt) : ''}</p>
    <div class="rp-top"><div class="gt">${_tf(3864, "{$0}<span>最终排名 · 第 {$1} 轮 · {$2}</span>", awsImg('cloud'), S.round, modeName())}</div>
      <h2>${finTitleHtml(w, why)}</h2><p class="rp-sub">${finSub(w, why)}</p><p class="rp-facts">${facts.map(x => `<span>${x}</span>`).join('')}</p>
      <ol class="rk" aria-label="${_t(3865, "最终排名")}">${rank.map(row).join('')}</ol>${note}</div>
    ${leadSec || moments ? `<div class="ov${leadSec && moments ? '' : ' one'}">${leadSec}${moments}</div>` : ''}
    ${trapSec}${dossier}${more}
    <p class="rp-foot">${_t(3866, "点「导出 PDF 战报」存成 PDF（打印窗口里目标选「另存为 PDF」），所有人的档案都在里面；「导出对局记录」存下带完整日志的文字版。")}</p></div>`;
}
// 玩家档案切换：一次只露一份。切换时档案开头要是已经滚到吸顶的切换条下面去了，就滚回开头，不用从别人档案的中间读起
export function repTab(k, focus) {
  const r = document.querySelector('#modal .report'); if (!r) return;
  const tabs = [...r.querySelectorAll('[role=tab]')]; if (!tabs[k]) return;
  repSt().k = k;
  let panel = null;
  tabs.forEach((t, j) => { const on = j === k, p = r.querySelector('#' + t.getAttribute('aria-controls')); t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (p) { p.hidden = !on; if (on) panel = p; } });
  if (focus === 'tab') tabs[k].focus({ preventScroll: true }); else if (focus === 'panel' && panel) panel.focus({ preventScroll: true });
  // 切换条吸顶时：档案开头不能藏在切换条底下；手机横屏切换条不吸顶：切换条本身滚出去了就滚回来，停在标题栏下面
  const box = r.closest('.box'), bar = r.querySelector('.dtabs');
  if (box && bar && panel) {
    const stuck = getComputedStyle(bar).position === 'sticky', h = box.querySelector(':scope>h3');
    const gap = stuck ? bar.getBoundingClientRect().bottom - panel.getBoundingClientRect().top : box.getBoundingClientRect().top + (h ? h.offsetHeight : 0) - bar.getBoundingClientRect().top;
    if (gap > 1) box.scrollTop -= gap;
  }
}
// 左右键：焦点在切换条或档案里时切人；Home / End 只在切换条上用（别处留给滚动）；详细数据的表能横着滚，那里的左右键不抢
export function repKey(e, r = e.currentTarget) {   // r：挂着键盘监听的 .report（委托时 currentTarget 是 document，由 ACTS 传进来）
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key) || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const onTab = !!e.target.closest('[role=tablist]');
  if (!onTab && (!e.target.closest('.dsr') || e.key === 'Home' || e.key === 'End')) return;
  const tabs = [...r.querySelectorAll('[role=tab]')], n = tabs.length, cur = Math.max(0, tabs.findIndex(t => t.getAttribute('aria-selected') === 'true'));
  if (n < 2) return;
  e.preventDefault();
  repTab(e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : (cur + (e.key === 'ArrowRight' ? 1 : -1) + n) % n, onTab ? 'tab' : 'panel');
}
// 结束后台面中间：骰子换成最终排名（名次、座位、估值），赢家那行标橙；「再来一局」「查看战报」照旧在下面（手机在底栏）
export function finHtml(w) {
  return _tf(3868, "<div class=\"fin\" role=\"group\" aria-label=\"最终排名\"><div class=\"fin-h\"><b>{$0}</b><small>第 {$1} 轮 · 最终排名</small></div><ol>{$2}</ol></div>", finTitleHtml(w, S.overWhy || ''), S.round, finalRank(w).map((q, k) => `<li class="${w && q.id === w.id ? 'win' : ''}${q.alive ? '' : ' out'}"><span class="r">${k + 1}</span>${PAWN(q.color)}<b>${q.name}</b>${q.alive ? '' : _t(3867, "<small>已出局</small>")}<span class="v" title="${valTip(q)}">${usd(valuation(q))}</span></li>`).join(''));
}
// 导出 PDF 战报：走浏览器的打印（目标选「另存为 PDF」）。打印时只留战报：所有人的档案都摊开（前面写名次和名字）、详细数据展开、切换条和按钮不印，
// 深色底照屏幕上的印。宽度定成屏幕上现在的宽度：关键时刻的标签是按像素排开的，换了宽度会叠在一起，浏览器会整页缩到纸宽
function printPrep() {
  const r = document.querySelector('#modal .report'); if (!r) return null;
  const t0 = document.title, hid = [...r.querySelectorAll('.dp[hidden]')], dets = [...r.querySelectorAll('details:not([open])')];
  r.style.width = Math.round(r.getBoundingClientRect().width) + 'px';
  hid.forEach(e => { e.hidden = false; }); dets.forEach(e => { e.open = true; });
  document.documentElement.classList.add('prt');
  document.title = _tf(3869, "云上大亨战报-第{$0}轮-{$1}", S.round, new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'));
  return () => { document.documentElement.classList.remove('prt'); r.style.width = ''; hid.forEach(e => { e.hidden = true; }); dets.forEach(e => { e.open = false; }); document.title = t0; };
}
export function printReport() {
  if (BOT || SIM || navigator.webdriver || /HeadlessChrome/.test(navigator.userAgent)) return;   // 自动化测试里不弹打印窗（测试直接调 printPrep 再用浏览器接口出 PDF）
  const undo = printPrep(); if (!undo) return;
  addEventListener('afterprint', undo, { once: true });
  window.print();
}
// 导出对局记录：战报 + 完整日志，存成文本文件
export function downloadLog(w, why) {
  if (BOT || SIM || navigator.webdriver || /HeadlessChrome/.test(navigator.userAgent)) return;   // 机器人自测、模拟和无头浏览器跑的自动化测试不写文件：不然每跑一局「下载」里就多一份对局记录
  const strip = h => String(h).replace(/<[^>]+>/g, '');   // 只去标签；实体（名字存的是转义后的）在写文件前统一 unesc
  const lines = [_t(3870, "亚马逊云科技 User Group 云上大亨 · 对局记录"), _tf(3871, "结果：{$0}；{$1}", finTitle(w, why), why), _tf(3872, "轮数：{$0}　难度：{$1}　DLC：{$2}", S.round, modeName(), (S.cfg.dlc || []).map(k => DLC[k].n).join(_t(349, "、")) || _t(708, "无")), '',
    _t(3873, "排名："), ...finalRank(w).map((q, k) => _tf(3874, "{$0}. {$1}（{$2}）{$3}；收过路费 ${$4}，付 ${$5}，答对 {$6}/{$7}", k + 1, q.name, roleOf(q).n, valTip(q), ST(q).rentIn, ST(q).rentOut, ST(q).quizOk, ST(q).quizN)), '',
    // 复盘直接用 retroTxt 写成纯文本（和战报是同一份数据），不再从战报的 HTML 里剥标签
    _t(3875, "复盘："), ...finalRank(w).map(q => retroTxt(q)),
    ...((S.events || []).length ? [_t(3876, "关键时刻："), ...S.events.map(e => _tf(3877, "第 {$0} 轮　{$1}", e.r, e.t)), ''] : []), ...statTxt(w), _tf(3878, "完整日志（从早到晚，时间是本机时区 {$0}）：", Intl.DateTimeFormat().resolvedOptions().timeZone), ...[...S.log].reverse().map(l => _tf(3879, "{$0}　{$1}", logTime(l), strip(clean(logBody(l)))))];
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.map(unesc).join('\n')], { type: 'text/plain;charset=utf-8' }));
  a.download = _tf(3880, "云上大亨对局记录-{$0}.txt", new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')); document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);   // 下载已经开始，放掉这块 Blob；不放的话每存一次就在页面里多占一份日志的内存，直到关页面
}
