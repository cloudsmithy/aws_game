import { __rv, _t, _tf } from '../core/01-i18n-runtime.js';
import { $, BOT, PAWN, SIM, awsImg, unesc } from '../core/02-util.js';
import { BAL, BH, BW, CORNERS, GROUPS, SQ, TOKEN, TYPE_N, capU, grpN, haTag, isCorner, lvFull, lvName, sideIdx } from '../rules/03-services.js';
import { COMBOS } from '../rules/04-roles-combos-cards.js';
import { dlcRentMul } from '../rules/05-dlc.js';
import { P, S, hasCombo, isWild } from '../engine/07-state.js';
import { runCost } from '../engine/08c-costs.js';
import { baseRent, shownRent, tokUnit, trafficMul } from '../engine/09-rent.js';
import { lvBadge } from './11-cards-deeds.js';
import { jailMax } from '../engine/13-move.js';
import { showSquare } from './27e-square-gallery.js';
import { isHidden } from '../rules/35-modes.js';
import { MP } from '../net/40-host-sync.js';
import { MPFX } from '../net/41-replay.js';
// ================= 渲染 =================
let CORNER_SUB = __rv(() => ({ get go() { return _tf(3926, "经过领 ${$0} Credits", BAL.salary); }, jail: _t(3927, "停一轮或交 $50"), free: _t(3928, "经过领 $50 · 停下抽奖或抽卡"), gotojail: _t(2870, "进维护窗口") }), v => { CORNER_SUB = v; }, () => CORNER_SUB);
export const sideOf = i => ['b', 'l', 't', 'r'][sideIdx(i)];
function sqPos(i) {
  const [a, b, c] = CORNERS.slice(1);
  if (i <= a) return [BH, BW - i];
  if (i <= b) return [BH - (i - a), 1];
  if (i <= c) return [1, 1 + (i - b)];
  return [1 + (i - c), BW];
}
export function buildBoard() {
  const b = $('#board'); b.innerHTML = '';
  SQ.forEach((s, i) => {
    const d = document.createElement('div');
    const [r, c] = sqPos(i);
    d.id = 'sq' + i; d.style.gridRow = r; d.style.gridColumn = c;
    d.setAttribute('role', 'button'); d.tabIndex = 0;
    d.onclick = () => showSquare(i);
    d.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showSquare(i); } };
    b.appendChild(d);
  });
  const c = document.createElement('div'); c.id = 'center'; b.appendChild(c);
}
export const cellGc = s => s.t === 'prop' ? GROUPS[s.g].color : s.t === 'util' ? '#545b64' : '';
// 正在走的棋子由 3D 棋子代替，只在终点格留一个看不见的占位：3D 棋子落在占位上，落地后换回 DOM 棋子不跳
export let MOVE_TO = null;
// 格子面板正在看哪一格：renderBoard 每次都重写 className，记在这里，重画时把 .sel 带上
export let SQPOP_I = null;
// 远端：房主发来的 S.moving 比远端的动画早到、晚收，按它画会和动画打架。远端按自己正在重播的那颗（MPFX.mv）画，MOVE_TO 也由重播来设，规则和房主一样；
// 演完、等房主收尾的那份状态时，棋子画在落点上（真棋子，不是占位）
const movingId = () => MP.role === 'client' ? (MPFX.mv ? MPFX.mv.id : null) : S.moving;
const toksAt = i => S.players.filter(q => q.alive && (q.id === movingId() ? MOVE_TO === i : q.pos === i));
const tokHtml = q => q.id === movingId() && (MP.role !== 'client' || MPFX.mv.ghost) ? PAWN(q.color).replace('class="pawn"', 'class="pawn ghost"') : PAWN(q.color);
// 过路费标签的悬停说明：联合收费列出是哪几块加起来的
function rentTip(i, sr) {
  // 保护期里格子标的是封顶后的数：先讲第 3 轮起恢复到多少，后面照常解释原数怎么算
  if (sr.cap) return _tf(3931, "新账户保护期：前 {$0} 轮每笔过路费最多 $50，第 {$1} 轮起恢复到 {$2}。", BAL.protect, BAL.protect + 1, sr.fullTxt) + rentTip(i, { ...sr, r: sr.full, txt: sr.fullTxt, cap: false });
  const s = SQ[i], pr = S.props[i], o = P(pr.owner), jr = sr.jr, dm = Math.round(dlcRentMul(i) * 100) / 100;
  if (jr) return _tf(3936, "{$0}{$1}架构联合收费：落在其中任一块都按整套收，{$2}{$3}{$4}{$5}{$6}", jr.cs.map(c => _tf(2766, "「{$0}」", c.n)).join(''), jr.cs.length > 1 ? _t(2767, "串联") : '', jr.parts.map(m => `${SQ[m].n} $${jr.rentOf(m)}`).join(' + '), sr.rn ? _tf(3932, "，{$0}", sr.rn) : '', s.k === 'bedrock' && hasCombo(o, 'rag') ? _t(3933, "，RAG 架构 +$50") : '', (d => d.length ? _tf(3934, "；已含 DLC 加成（{$0}）", d.map(m => `${SQ[m].n} ×${Math.round(dlcRentMul(m) * 100) / 100}`).join(_t(349, "、"))) : '')(jr.parts.filter(m => dlcRentMul(m) > 1)), sr.txt[0] === '≈' ? _t(3935, "；按平均 7 点估，随点数浮动") : '');
  if (!sr.r) return _t(3937, "代理商自己的库存，没组成有效架构时不收过路费");
  // 上下两排不单列 DLC 倍率，写进说明里
  return (s.bill === 'token' ? _tf(3938, "过路费：骰子点数 × {$0}（{$1} 单价 {$2}，已算整组和流量加成）", tokUnit(i), lvName(i, pr.level), TOKEN[pr.level]) : s.bill === 'req' || s.t === 'util' ? _t(3939, "过路费按用量计费：随对方点数浮动，这里按平均 7 点估") : _t(3940, "固定过路费")) + (dm > 1 ? _tf(3941, "；已含 DLC 加成 ×{$0}", dm) : '');
}
export function cellHtml(i) {
  const s = SQ[i], pr = S.props[i];
  if (isHidden(i)) { const toks0 = toksAt(i); return _tf(3942, "<div class=\"art\">{$0}{$1}</div><div class=\"txt\"><span class=\"nm\">盲盒</span><span class=\"bill\">随机抽卡 · 效果翻倍</span></div>", awsImg('reinvent'), toks0.length ? `<div class="toks">${toks0.map(tokHtml).join('')}</div>` : ''); }
  const toks = toksAt(i);
  const tokH = toks.length ? `<div class="toks">${toks.map(tokHtml).join('')}</div>` : '';
  if (isCorner(i)) {
    let sub = CORNER_SUB[s.k];
    if (s.k === 'jail') { const j = S.players.filter(q => q.alive && q.jail !== null).length; if (j) sub = _tf(3943, "{$0} 人在里面", j); }
    return `<div class="art">${awsImg(s.icon)}${tokH}</div><div class="nm">${s.n}</div><div class="pr">${sub}</div>`;
  }
  const owner = pr && pr.owner !== null ? P(pr.owner) : null;
  const ownTag = owner ? `<span class="ownr" style="--oc:${owner.color}"><i></i>${owner.name}${pr.spot ? ' · Spot' : ''}</span>` : '';
  const price = owner ? ownTag : pr && pr.impaired ? '<span class="imp-pill">Impaired</span>' : s.p ? `<span class="pr">$${s.p}</span>` : s.t === 'tax' ? '<span class="pr neg">−$200</span>' : s.t === 'tax2' ? '<span class="pr neg">−$100</span>' : '';
  // 有主的格子标落上来大概要付多少（shownRent）：整套架构联合收费的标橙底；下线、DDoS、Impaired、代理商没成架构的库存写明不收。
  // 「过路费」「· 不收费」放在 .rk 里，格子窄时只留数字或状态（5 位数的连宽屏也放不下，干脆不写）；按 token 收的另备一个按 7 点估的「≈$xx」，上下两排太窄、放不下「点数×单价」时换成它
  const sr = owner && (s.t === 'prop' || s.t === 'util') ? shownRent(i) : null;
  const off = !sr ? '' : pr.offline ? _t(3944, "已下线") : pr.ddos != null ? 'DDoS' : pr.impaired ? 'Impaired' : !sr.r ? _t(3945, "没成架构") : '';
  const rentH = !sr ? '' : off ? _tf(3949, "<span class=\"rent off\" title=\"{$0}\">{$1}<i class=\"rk\"> · 不收费</i></span>", pr.offline ? _t(3946, "已下线，不收过路费") : pr.ddos != null ? _t(3947, "被 DDoS 打到下线，不收过路费") : pr.impaired ? _t(3948, "Impaired，暂停收过路费") : rentTip(i, sr), off)
    : `<span class="rent${sr.jr ? ' jr' : ''}" title="${rentTip(i, sr)}">${sr.txt.startsWith(_t(3930, "点数")) ? `<span class="tk">${sr.txt}</span><span class="tk2">≈$${sr.r}</span>` : `${sr.r < 1e4 ? _t(3950, "<i class=\"rk\">过路费 </i>") : ''}${sr.txt}`}</span>`;
  const dm = (s.t === 'prop' || s.t === 'util') ? dlcRentMul(i) : 1;
  const dlcH = dm > 1 ? _tf(3951, "<span class=\"dlcm\" title=\"DLC 加成：过路费 ×{$0}\">DLC ×{$1}</span>", Math.round(dm * 100) / 100, Math.round(dm * 100) / 100) : '';
  const lv = pr && pr.level ? _tf(3952, "<span class=\"lv\" title=\"{$0}（共 3 级）\">{$1}</span>", lvFull(i, pr.level), lvBadge(pr.level, i)) : '';
  const ht = haTag(i);
  const bill = s.t === 'prop' ? `<span class="bill ha-${ht ? ht.k : ''}" title="${ht ? ht.t + _t(2670, "：") + ht.d : ''}">${s.bill === 'token' ? _t(357, "按 token") : TYPE_N[s.type]}</span>` : s.t === 'util' ? _t(3953, "<span class=\"bill\">按用量</span>") : '';
  const houses = owner && (pr.level || pr.cap) ? `<span class="lvh" style="--oc:${owner.color}" title="${[pr.level ? _tf(2773, "第 {$0} 级", pr.level) : '', pr.cap ? _tf(3954, "加了 {$0} 个{$1}", pr.cap, capU(s.k)) : ''].filter(Boolean).join(_t(2698, "，"))}">${'<i></i>'.repeat(pr.level)}${pr.cap ? `<b class="capn">+${pr.cap}</b>` : ''}</span>` : '';   // 照宣传片：格子上几级就几块玩家颜色的小方块
  return `<div class="art">${awsImg(s.icon)}${tokH}</div><div class="txt"><span class="nm">${s.n.replace(/([a-z])([A-Z])/g, '$1<wbr>$2')}</span>${price}${rentH}${dlcH}${lv}${bill}</div>${houses}`;
}
// 手机上格子太小看不清：棋盘下面放一张「当前所在格」，点开看详情
export function hereHtml(p) {
  const i = p.pos, s = SQ[i], pr = S.props[i], o = pr && pr.owner !== null ? P(pr.owner) : null;
  if (isHidden(i)) return _tf(3955, "<button class=\"here\" data-act=\"showSquare\" data-arg=\"{$0}\">{$1}<span><b>盲盒</b><em>随机抽卡 · 效果翻倍</em></span></button>", i, awsImg('reinvent'));
  const rent = o && (s.t === 'prop' || s.t === 'util') ? (pr.offline ? _t(3956, "已下线 · 不收费") : pr.ddos != null ? _t(3957, "DDoS 下线 · 不收费") : pr.impaired ? _t(3958, "Impaired · 暂停收费") : (sr => !sr.r ? _t(3959, "没组成架构 · 不收费") : _tf(3962, "过路费 {$0}{$1}", sr.txt, sr.cap ? _t(3960, "（新账户保护期封顶）") : sr.jr ? _t(3961, "（整套架构联合收费）") : ''))(shownRent(i))) : '';
  const sub = o ? `<i class="pawn" style="--pc:${o.color}"></i>${o.id === p.id ? ((MP.role === 'client' ? p.id === MP.mySeat : !(MP.role === 'host' && MP.isRemote(p.id) && !MP.hostPlays(p.id))) ? _t(2971, "你自己的") : o.name + _t(3963, " 自己的")) : o.name + _t(3964, " 的")}${rent ? ' · ' + rent : ''}` : s.p ? _tf(3965, "没人买 · 售价 ${$0}", s.p) : s.k === 'jail' && p.jail !== null ? _tf(3966, "关在里面：停{$0}轮或付 $50 出来", jailMax(p) > 1 ? ` ${jailMax(p) - p.jail} ` : _t(2874, "一")) : CORNER_SUB[s.k] || (s.t === 'tax' ? _t(3967, "交 $200") : s.t === 'tax2' ? _t(3968, "交 $100") : '');
  return `<button class="here" data-act="showSquare" data-arg="${i}" title="${_t(3969, "看这一格的现状和历史记录")}">${_tf(3970, "{$0}<span><b>{$1} 在 {$2}</b><em>{$3}</em></span><small>记录</small>", awsImg(s.icon), p.name, s.n, sub)}</button>`;
}
// 鼠标停在格子上看收费情况：服务格看价格、过路费、运行费和主人；角落格和账单格看收多少、给多少
export function sqTip(i) {
  const s = SQ[i], pr = S.props[i], L = [s.t === 'prop' ? `${s.n} · ${grpN(s.g)} · ${TYPE_N[s.type]}` : s.n];
  if (isWild(i)) { const c = pr && pr.wild && COMBOS.find(x => x.id === pr.wild.c); L.push(c ? _tf(3971, "万能服务：已绑到 {$0} 的「{$1}」", P(pr.wild.p).name, c.n) : (SQ[i].k === 'kms' ? _t(3972, "万能服务（只能绑到有存储或数据库的架构）：") : SQ[i].k === 'vpc' ? _t(3973, "万能服务（架构里有一块能接进 VPC 的服务就能绑，只有安全、监控、边缘、应用集成服务的架构不行）：") : _t(3974, "万能服务：")) + _t(3975, "不算进任何架构，主人能把它绑到自己的一个架构上，缺一块就顶上，凑齐了就并进去（只能绑一次）")); }
  if (isHidden(i)) L.push(_t(3976, "盲盒格：落上去随机抽一张 Health 或 re:Invent 卡，效果翻倍"));
  else if (pr && ['prop', 'util'].includes(s.t)) {
    let rent = 0; try { rent = pr.owner === null ? 0 : baseRent(i, 7); } catch (e) { }
    // 没主人时 baseRent 查不到主人，按「刚买下、没升级、没成组」估（公用类按手里只有这 1 块）
    if (pr.owner === null) rent = Math.round((s.t === 'util' ? 7 * 4 : s.bill === 'token' ? 7 * TOKEN[0] : s.p * BAL.rentBase) * trafficMul() * dlcRentMul(i));
    const float = s.bill === 'req' || s.bill === 'token' || s.t === 'util';
    if (pr.owner === null) L.push(_tf(3977, "没人买 · 价格 ${$0}", s.p), _tf(3979, "买下后过路费约 ${$0}{$1}", rent, float ? _t(3978, "（随对方掷的点数浮动）") : ''));
    else {
      const o = P(pr.owner); let run = 0, sr = { r: rent, jr: null, txt: '' }; try { run = runCost(i); sr = shownRent(i); } catch (e) { }
      const jr = sr.jr, off = pr.offline ? _t(3944, "已下线") : pr.ddos != null ? _t(3980, "被 DDoS 打到下线") : pr.impaired ? _t(3981, "现在 Impaired") : '';
      L.push(_tf(3983, "主人：{$0}{$1}{$2}", unesc(o.name), s.upg ? ` · ${lvFull(i, pr.level)}` : '', pr.cap ? _tf(3982, " · 容量 {$0} 个{$1}", pr.cap, capU(s.k)) : ''), off ? _tf(3984, "过路费：{$0}，不收", off) : sr.cap ? _tf(3985, "过路费最多 $50（新账户保护期，前 {$0} 轮每笔封顶）；第 {$1} 轮起约 ${$2}{$3}", BAL.protect, BAL.protect + 1, sr.full, jr ? _t(3961, "（整套架构联合收费）") : '') : _tf(3988, "过路费约 ${$0}{$1}{$2}", sr.r, jr ? _tf(3986, "（{$0}{$1}架构联合收费{$2}）", jr.cs.map(c => _tf(2766, "「{$0}」", c.n)).join(''), jr.cs.length > 1 ? _t(2767, "串联") : '', sr.rn ? ` · ${sr.rn}` : '') : sr.rn ? _tf(2769, "（{$0}）", sr.rn) : '', sr.r && (jr ? sr.txt[0] === '≈' : float) ? _t(3987, "（按掷出 7 点算，随点数浮动）") : ''), _tf(3989, "运行费：每圈 ${$0}", run));
    }
  } else if (s.t === 'jail') L.push(_t(286, "落在这里或被送进来：停一轮，或者交 $50 照常走"));
  else if (s.d) L.push(s.d.replace(/<[^>]+>/g, ''));
  const n = ((S.hist || {})[i] || []).length; L.push(n ? _tf(3990, "点一下看这一格的 {$0} 条记录", n) : _t(3991, "点一下看这一格的详情"));
  return L.join('\n');
}
// 格子上方弹出一句话（照宣传片的标签）：买下、付过路费、升级、Impaired、免疫、DDoS。约 2 秒后淡出，只在自己设备上显示
export function callout(i, html, cls = 'org', ms = 2200) {
  if (BOT || SIM || !$('#game') || $('#game').hidden) return;
  const cell = $('#sq' + i); if (!cell) return;
  const r = cell.getBoundingClientRect(); if (!r.width) return;
  const el = document.createElement('div'); el.className = 'callout ' + cls; el.innerHTML = html; el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  const w = el.offsetWidth, x = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)), y = Math.max(8, r.top - el.offsetHeight - 6);
  el.style.left = x + 'px'; el.style.top = y + 'px';
  setTimeout(() => el.classList.add('out'), ms); setTimeout(() => el.remove(), ms + 400);
}
export const __set_MOVE_TO = v => (MOVE_TO = v);
