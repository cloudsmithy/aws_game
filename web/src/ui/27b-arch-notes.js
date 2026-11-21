import { LANG, _t, _tf } from '../core/01-i18n-runtime.js';
import { $, BOT, PAWN, SIM } from '../core/02-util.js';
import { SQ } from '../rules/03-services.js';
import { COMBOS, cAll, cLink, comboOpen, slotOpen } from '../rules/04-roles-combos-cards.js';
import { P, S, active, comboMiss, hasCombo, isWild, owns, wildFits, wildOf } from '../engine/07-state.js';
import { modal, viewOpen } from './10-modal.js';
import { callout } from './27a-board.js';
import { render } from './27d-side.js';
import { archDiag } from './27e-square-gallery.js';
import { toast } from './28-setup-save.js';
import { sfx } from './32-sfx.js';
import { FX } from './33-fx3d.js';
import { localHuman, viewerP } from '../engine/36-ai.js';
import { MP } from '../net/40-host-sync.js';
// 付过路费：音效、架构连线、格子上的气泡、金币飞向收钱的人。联机时房主把同一份发给远端照着播（state 里只看得到现金变了）
export function rentFx(m) {
  if (MP.role === 'host') MP.broadcast({ t: 'fx', k: 'rent', ...m });
  sfx('pay'); m.arcs.forEach((g, k) => setTimeout(() => FX.arcs(g, ['#ff9900', '#4aa3ff', '#2fbf71', '#c48bff'][k % 4]), k * 220));
  const o = P(m.to); callout(m.i, m.html, 'warn'); FX.coins($('#sq' + m.from), fxChip(o), m.n).then(() => fxGain(o));
}
// 金币的落点：中间玩家条上这个人的那一格（手机上也看得到），找不到就用侧栏的玩家卡
export const fxChip = q => document.querySelectorAll('#center .turnbar .tb')[q.id] || document.querySelectorAll('#side .pl')[q.id];
export const GAIN = {};
export function fxGain(q) { GAIN[q.id] = Date.now() + 700; const el = fxChip(q); if (el) { el.classList.remove('gain'); void el.offsetWidth; el.classList.add('gain'); } }
// 格子的小动画（CSS）：买下时边框弹一下玩家颜色，变 Impaired 时闪红、往下沉一下。每次重画棋盘时对比主人和状态，变了就播，不管是怎么变的
export const SQPREV = {}, SQFX = {};
// 刚凑成一个有效架构：那几格脚下亮一圈金光，光管把它们连起来，弹出架构名（照宣传片）
// 架构图一行放不下时整体缩小（最多缩到 0.6 倍），整张图一眼看全；缩到底还放不下才在格子里左右滑
export function fitArch(root) {
  if (!root) return;
  root.querySelectorAll('.arg').forEach(g => { g.style.zoom = ''; const w = g.parentElement.clientWidth - 2, sw = g.scrollWidth; if (w > 0 && sw > w) g.style.zoom = Math.max(0.5, w / sw).toFixed(3); });
}
addEventListener('resize', () => { fitArch($('#vmodal .box')); fitArch($('#modal .box')); });
// learn/arch/<id>.html 图文讲解、learn/arch/<id>-video.html 讲解视频；p 给了就带上他手上在线的那几块和名字
// 讲解页按当前语言打开：中文在 learn/ 下，英文、日文在 learn/en/、learn/ja/ 下
export const learnDir = () => LANG === 'zh' ? 'learn/' : `learn/${LANG}/`;
const archUrl = (c, p, video) => `${learnDir()}arch/${c.id}${video ? '-video' : ''}.html` + (p && S && S.props ? `?have=${cAll(c).filter(i => active(p, i)).map(i => SQ[i].k).join(',')}&who=${encodeURIComponent(p.name)}` : '');
// 讲解和知识点的按钮（新标签页打开）：架构的讲解视频、图文讲解在 learn/arch/，每块服务的知识点在 learn/svc/（都在 code/learn/ 下）
export const LB_ICO = { play: '<svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.8v8.4L10 6z" fill="currentColor"/></svg>',
  doc: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2" y="1" width="8" height="10" rx="1"/><path d="M4 4h4M4 6h4M4 8h2.5"/></svg>',
  book: '<svg width="13" height="12" viewBox="0 0 13 12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M6.5 2.5C5 1.5 3 1.3 1 1.6v8.2c2-.3 4-.1 5.5.9 1.5-1 3.5-1.2 5.5-.9V1.6c-2-.3-4-.1-5.5.9zM6.5 2.5v8.2"/></svg>' };
export const archBtns = (c, p) => _tf(3992, "<span class=\"abtns\"><a class=\"lbtn pri\" href=\"{$0}\" target=\"_blank\" rel=\"noopener\" title=\"新标签页打开：三维动画，一块一块讲\">{$1}讲解视频</a><a class=\"lbtn\" href=\"{$2}\" target=\"_blank\" rel=\"noopener\" title=\"新标签页打开：架构图、每一块干什么、在游戏里怎么算\">{$3}图文讲解</a></span>", archUrl(c, p, true), LB_ICO.play, archUrl(c, p), LB_ICO.doc);
export const svcBtn = (s, cls = '') => _tf(3995, "<a class=\"lbtn{$0}\" href=\"{$1}svc/{$2}.html\" target=\"_blank\" rel=\"noopener\" title=\"新标签页打开：{$3} 的核心知识点、关键功能、练习题\">{$4}{$5}</a>", cls ? ' ' + cls : '', learnDir(), s.k, s.n, LB_ICO.book, cls.includes('xs') ? _t(3993, "知识点") : _t(3994, "服务知识点"));
let COMBOPREV = null, ARCH_POP_Q = [];
const ARCH_POP_KEY = 'aws-tycoon-archpop';
const archPopOff = () => { try { return localStorage.getItem(ARCH_POP_KEY) === 'off'; } catch (e) { return false; } };
async function archCongrats() {
  if (!ARCH_POP_Q.length || BOT || SIM || archPopOff()) { ARCH_POP_Q = []; return; }
  if (viewOpen()) return void setTimeout(archCongrats, 1500);   // 正开着别的查资料窗：等它关了再弹
  const q = ARCH_POP_Q[0].q, cs = ARCH_POP_Q.filter(x => x.q === q).map(x => x.c); ARCH_POP_Q = ARCH_POP_Q.filter(x => x.q !== q);
  const r = await modal({ local: true, view: true, cancelable: true, cls: 'congrats', title: _tf(3997, "{$0} 凑成了{$1}有效架构", q.name, cs.length > 1 ? _tf(3996, " {$0} 个", cs.length) : ''),
    html: _tf(3999, "<p>恭喜！{$0}生效了：别人落在这套架构里你的任意一块，按整套联合收费。</p>{$1}<p>要看看这个架构是干什么的吗？讲解在新标签页打开，游戏不受影响：视频是三维动画加朗读，一块一块讲；图文版有架构图、每一块干什么，还会对比你现在这套和最优架构差在哪。</p>", cs.map(c => _tf(3998, "「<b>{$0}</b>」", c.n)).join(''), cs.map(c => `<div class="acong">${archDiag(c, true)}${c.use ? `<p class="muted">${c.use}</p>` : ''}</div>`).join('')),
    inputs: [{ id: 'off', type: 'checkbox', label: _t(4000, "以后凑成架构不再弹这个窗（棋盘上的动画照常有）") }],
    buttons: [...cs.slice(0, 2).flatMap(c => [{ label: cs.length > 1 ? _tf(4001, "「{$0}」讲解视频", c.n) : _t(4002, "看讲解视频"), value: 'v:' + c.id, cls: 'pri' }, { label: cs.length > 1 ? _tf(4003, "「{$0}」图文", c.n) : _t(4004, "看图文讲解"), value: 'p:' + c.id }]), { label: _t(4005, "继续游戏"), value: false }] });
  if (r && r.inp && r.inp.off) try { localStorage.setItem(ARCH_POP_KEY, 'off'); } catch (e) { }
  if (r && typeof r.v === 'string' && /^[vp]:/.test(r.v)) { const c = COMBOS.find(x => x.id === r.v.slice(2)); if (c) window.open(archUrl(c, q, r.v[0] === 'v'), '_blank', 'noopener'); }
  if (ARCH_POP_Q.length) setTimeout(archCongrats, 600);
}
// 别人（电脑、或联机时别的设备上的玩家）凑成有效架构：右下角提示一下要不要看讲解。不挡游戏，15 秒后自己收起，鼠标停在上面不收；一次显示一位，后面的排队
const ARCH_NOTE_KEY = 'aws-tycoon-archnote';
const archNoteOff = () => { try { return localStorage.getItem(ARCH_NOTE_KEY) === 'off'; } catch (e) { return false; } };
export function archTipOff() { try { return localStorage.getItem('aws-tycoon-archpop') === 'off' && localStorage.getItem('aws-tycoon-archnote') === 'off'; } catch (e) { return false; } }
export function toggleArchTip() {
  const on = archTipOff(); try { ['aws-tycoon-archpop', 'aws-tycoon-archnote'].forEach(k => on ? localStorage.removeItem(k) : localStorage.setItem(k, 'off')); } catch (e) { }
  toast(on ? _t(4006, "凑成有效架构时会问要不要看讲解：自己凑成弹窗，别人凑成在右下角提示") : _t(4007, "凑成有效架构时不再提示（棋盘上的动画照常有）")); render();
}
let ARCH_NOTE_Q = [], ARCH_NOTE_T = 0;
// 最小化：收成右下角一条（不自己消失），后面别人凑成的也先收在这条里，条上写「还有几条」；点开再看。记在本机，下次也是收着的
const ARCH_NOTE_MIN = 'aws-tycoon-archnote-min';
const archNoteMin = () => { try { return localStorage.getItem(ARCH_NOTE_MIN) === '1'; } catch (e) { return false; } };
// 这一位手上的那几块按架构顺序连起来：API Gateway → Lambda → DynamoDB（没有的可选块跳过）
const archHas = (c, q) => { let out = '', prev = null; c.seq.forEach((sl, k) => { const ns = (Array.isArray(sl.n) ? sl.n : [sl.n]).filter(i => owns(q, i)); if (!ns.length) return; out += (prev == null ? '' : ` <i>${cLink(c, k - 1)}</i> `) + ns.map(i => SQ[i].n).join(' / '); prev = k; }); return out; };
const AN_ICO = { min: '<path d="M3.5 8h9"/>', max: '<path d="M4 10l4-4 4 4"/>', x: '<path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/>' };
const anIco = k => `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${AN_ICO[k]}</svg>`;
function archNoteMore(el) { const m = el.querySelector('.an-more'), n = ARCH_NOTE_Q.length; if (m) { m.textContent = n ? _tf(4008, "还有 {$0} 条", n) : ''; m.hidden = !n; } }
function archNote() {
  if (BOT || SIM || archNoteOff()) { ARCH_NOTE_Q = []; return; }
  let el = $('#archnote');
  if (el && !el.hidden) { archNoteMore(el); if (el.classList.contains('min') && ARCH_NOTE_Q.length) { el.classList.remove('ping'); void el.offsetWidth; el.classList.add('ping'); } return; }   // 正显示着：只更新「还有几条」
  if (!ARCH_NOTE_Q.length) return;
  const q = ARCH_NOTE_Q[0].q, cs = ARCH_NOTE_Q.filter(x => x.q === q).map(x => x.c).slice(0, 3); ARCH_NOTE_Q = ARCH_NOTE_Q.filter(x => x.q !== q);
  if (!el) {
    el = document.createElement('aside'); el.id = 'archnote'; el.hidden = true; el.setAttribute('aria-label', _t(4009, "有玩家凑成了有效架构")); document.body.appendChild(el);
    const close = () => { clearTimeout(ARCH_NOTE_T); el.classList.remove('on'); setTimeout(() => { el.hidden = true; archNote(); }, 200); };
    const arm = ms => { clearTimeout(ARCH_NOTE_T); if (el.classList.contains('min')) return; ARCH_NOTE_T = setTimeout(close, ms); const t = el.querySelector('.an-t'); if (t) { t.style.animation = 'none'; void t.offsetWidth; t.style.animation = `anT ${ms / 1000}s linear forwards`; } };   // 底下那条跟着倒计时；收起来的不倒计时
    const setMin = on => { try { on ? localStorage.setItem(ARCH_NOTE_MIN, '1') : localStorage.removeItem(ARCH_NOTE_MIN); } catch (e) { } clearTimeout(ARCH_NOTE_T); el.classList.toggle('min', on); el.classList.remove('ping'); archNoteMore(el); const b = el.querySelector(on ? '[data-v="max"]' : '[data-v="min"]'); if (b) b.focus({ preventScroll: true }); };
    el._arm = arm;
    el.addEventListener('mouseenter', () => { clearTimeout(ARCH_NOTE_T); el.classList.add('hold'); });
    el.addEventListener('mouseleave', () => { el.classList.remove('hold'); if (!el.classList.contains('min') && el.dataset.auto) arm(6000); });
    el.addEventListener('focusin', () => { clearTimeout(ARCH_NOTE_T); el.classList.add('hold'); });
    el.addEventListener('click', e => {
      const b = e.target.closest('button'), min = el.classList.contains('min');
      if (!b) { if (min && e.target.closest('.an-top')) { delete el.dataset.auto; setMin(false); } return; }   // 收着的时候点条上任意地方展开
      const v = b.dataset.v || '';
      if (v === 'min') return setMin(true);
      if (v === 'max') { delete el.dataset.auto; return setMin(false); }   // 自己点开的不再自动消失
      if (/^[vp]:/.test(v)) { const c = COMBOS.find(x => x.id === v.slice(2)); if (c) window.open(archUrl(c, el._q, v[0] === 'v'), '_blank', 'noopener'); return; }
      if (v === 'off') { try { localStorage.setItem(ARCH_NOTE_KEY, 'off'); } catch (e) { } ARCH_NOTE_Q = []; toast(_t(4010, "别人凑成架构不再提示；「对局」菜单里的「架构提示」能重新打开")); }
      close();
    });
  }
  el._q = q;
  el.innerHTML = `<div class="an-top"><div class="an-h">${_tf(4012, "{$0}<b>{$1}</b><span>组成了{$2}有效架构</span><span class=\"an-nm\">{$3}</span><em class=\"an-more\" hidden></em>", PAWN(q.color), q.name, cs.length > 1 ? _tf(3996, " {$0} 个", cs.length) : '', cs.map(c => _tf(2766, "「{$0}」", c.n)).join(''))}</div>
    <span class="an-tools"><button class="an-i" data-v="min" aria-label="${_t(4013, "最小化")}" title="${_t(4014, "最小化：收成右下角一条，后面的提示也先收着")}">${anIco('min')}</button><button class="an-i" data-v="max" aria-label="${_t(4015, "展开")}" title="${_t(4015, "展开")}">${anIco('max')}</button><button class="an-i" data-v="x" aria-label="${_t(4016, "关闭这条提示")}" title="${_t(2610, "关闭")}">${anIco('x')}</button></span></div>
    <div class="an-body">${cs.map(c => { const h = archHas(c, q); return _tf(4011, "<div class=\"an-c\"><b>「{$0}」</b>{$1}<span class=\"an-b\"><button class=\"sm pri\" data-v=\"v:{$2}\">看讲解视频</button><button class=\"sm\" data-v=\"p:{$3}\">看图文讲解</button></span></div>", c.n, h ? `<span class="an-f">${h}</span>` : '', c.id, c.id); }).join('')}
    <p class="an-m">${_t(4017, "要看看这套架构是干什么的吗？讲解在新标签页打开，游戏不停。落在这套里任意一块的人，按整套付过路费。")}</p>
    <button class="an-off" data-v="off">${_t(4018, "别人凑成架构不再提示")}</button></div><i class="an-t" aria-hidden="true"></i>`;
  const min = archNoteMin(); el.classList.toggle('min', min); el.classList.remove('hold', 'ping'); el.dataset.auto = '1'; archNoteMore(el);
  el.hidden = false; void el.offsetWidth; el.classList.add('on'); if (!min) el._arm(15000);
}
export function comboCheck() {
  if (!S || !S.players || BOT || SIM) return;
  const now = new Set(); S.players.forEach(q => { if (q.alive) COMBOS.forEach(c => { if (hasCombo(q, c.id)) now.add(q.id + ':' + c.id); }); });
  if (COMBOPREV) now.forEach(k => { if (COMBOPREV.has(k)) return;
    const [pid, cid] = k.split(':'), q = P(+pid), c = COMBOS.find(x => String(x.id) === cid); if (!c) return;
    const parts = c.ix.map(n => (Array.isArray(n) ? n : [n]).find(i => owns(q, i))).filter(i => i != null);
    parts.forEach(i => { SQFX[i] = ['fx-combo', Date.now() + 2200]; });
    FX.arcs(parts, '#ffb020'); callout(parts[Math.floor(parts.length / 2)], _tf(4019, "{$0} 组成有效架构<b>「{$1}」</b><small>别人落在里面任意一块，按整套收</small>", q.name, c.n), 'org', 2800);
    if (localHuman(q)) { if (!archPopOff()) { ARCH_POP_Q.push({ q, c }); if (ARCH_POP_Q.length === 1) setTimeout(archCongrats, 2400); } }   // 等棋盘上的动画放完
    else if (!archNoteOff()) { ARCH_NOTE_Q.push({ q, c }); setTimeout(archNote, 1600); }   // 别人凑成：右下角提示（正显示着就排队，条上写还有几条）
  });
  COMBOPREV = now;
}
// 哪些格子能帮看棋盘的人补齐架构（缺的正好就是这一块）：棋盘上标「补齐」、悬停和格子面板里写是哪套。以前只在自己的回合里算，别人回合里看不到
export function needSquares() {
  const me = viewerP(), out = {};
  if (!me || S.over) return out;
  COMBOS.filter(comboOpen).filter(c => !hasCombo(me, c.id)).forEach(c => { const miss = c.ix.filter(n => !(Array.isArray(n) ? n : [n]).some(i => active(me, i))); if (miss.length === 1) slotOpen(miss[0]).forEach(i => { if (!owns(me, i)) (out[i] = out[i] || []).push(c.n); }); });
  return out;
}
// 万能服务格：买下后能绑到看棋盘的人哪几套只差一块的架构上（自己就在里面的不算）
function needWild(i) {
  const me = viewerP(); if (!me || !isWild(i) || owns(me, i) || S.over) return [];
  return COMBOS.filter(c => comboOpen(c) && !hasCombo(me, c.id) && wildFits(i, c) && comboMiss(me, c).length === 1 && !wildOf(me, c.id)).map(c => c.n);
}
// 悬停、格子面板里的那一句：能帮谁补齐哪套、现在怎么拿到这块
export function needLine(i, need) {
  const me = viewerP(), pr = S.props[i]; if (!me) return '';
  const o = pr && pr.owner != null ? P(pr.owner) : null, how = !o ? _t(4020, "没人买，落上去买下就凑成") : pr.offline ? _tf(4021, "{$0} 的这块已下线，落上去付原价就能拉走", o.name) : _tf(4022, "在 {$0} 手上，换过来就凑成", o.name);
  const names = (need && need[i]) || [], wild = names.length ? [] : needWild(i);
  if (names.length) return _tf(4023, "能帮 {$0} 补齐架构「{$1}」：{$2}", me.name, names.join(_t(3645, "」「")), how);
  if (wild.length) return _tf(4024, "万能服务：{$0} 拿到后能绑到「{$1}」上，顶上缺的那块", me.name, wild.join(_t(3645, "」「")));
  return '';
}
export const __set_COMBOPREV = v => (COMBOPREV = v);
