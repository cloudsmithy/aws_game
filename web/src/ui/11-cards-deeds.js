import { LANG, _t, _tf, _tr } from '../core/01-i18n-runtime.js';
import { PAWN, awsImg } from '../core/02-util.js';
import { BAL, SQ, capU, lvFull, lvName } from '../rules/03-services.js';
import { CATS, COMBOS, INC, REI, cAll, comboOpen, slotOpen } from '../rules/04-roles-combos-cards.js';
import { P, S, active, cur, nm } from '../engine/07-state.js';
import { jointRent, shownRent, spotTxt } from '../engine/09-rent.js';
import { ask } from './10-modal.js';
import { rentTxt, runAt, runIfMine, useFeeTxt } from '../engine/11b-rent-info.js';
import { rsLvTag } from '../engine/15-land.js';
import { needLine, needSquares } from './27b-arch-notes.js';
import { render, svcState, zhs } from './27d-side.js';
import { sfx } from './32-sfx.js';
import { FX } from './33-fx3d.js';
import { fmtMul } from '../rules/35-modes.js';
import { isAI, viewerP } from '../engine/36-ai.js';
import { MP } from '../net/40-host-sync.js';
// ================= 卡牌与地契 =================
export const lvBadge = (l, i) => {
  if (!l) return '';
  const sh = SQ[i].upg[l - 1][1];
  if (sh === '2 AZ') return '<span class="lvb az">2 AZ</span>';
  if (sh === 'ASG') return `<span class="lvb asg">${awsImg('asg')}<span>ASG</span></span>`;
  if (sh === 'Region') return _tf(2739, "<span class=\"lvb reg\">{$0}<span>多区域</span></span>", awsImg('region'));
  return `<span class="lvb tx">${sh}</span>`;
};
// 卡面：竖卡，默认 63 × 88（和宣传片、打印的实体卡一样），只当最小高度，免疫和知识点长的卡往下长、不裁字：彩色标题栏、大图标和标题、效果、免疫框、知识点
export const CARD_COL = { inc: '#e7157b', rei: '#8c4fff', fis: '#d13212' };
export const pcardHtml = (kind, head, art, title, eff, im, tip) => `<div class="pcard ${kind}" style="--cc:${CARD_COL[kind]}"><div class="ph">${awsImg(kind === 'rei' ? 'reinvent' : 'health')}<span>${head}</span></div><div class="pa">${awsImg(art, 'hero')}<b class="ett">${title}</b></div><div class="pe ed">${eff}</div>${im ? _tf(2740, "<div class=\"pim imm\"><b>免疫条件</b><span class=\"gb\">{$0}</span></div>", im) : ''}${tip ? _tf(2741, "<div class=\"pt tip\"><b>知识点：</b>{$0}</div>", tip) : ''}</div>`;
// 抽卡时卡上的金额按这次的卡牌倍率换算好再显示（收钱、付钱、罚款都乘倍率；「原价不超过 $300」这种门槛不乘），卡面上写一句倍率
function cardMulTxt(t) {
  const m = S && S.players && S.cardMul; if (!t || !m || Math.abs(m - 1) < 0.001) return t;
  return String(t).replace(/\$(\d+)/g, (x, n, off, str) => _tr(2742, "(不超过|低于|超过|原价|价格|以内|以上|最多|最少|高于|满)\\s*$", "").test(str.slice(Math.max(0, off - 6), off)) || LANG === 'ja' && _tr(2743, "^\\s*(未満|以下|以上|を超え|以内|まで)", "").test(str.slice(off + x.length, off + x.length + 8)) ? x : `$${Math.round(+n * m)}`);
}
const cardMulNote = () => { const m = S && S.players && S.cardMul; return m && Math.abs(m - 1) >= 0.001 ? _tf(2744, "<br><span class=\"muted\">卡牌倍率 {$0}：上面的金额已经按倍率算好</span>", fmtMul(m)) : ''; };
export function cardHtml(kind, id) {
  if (kind === 'inc') { const c = INC[id]; return pcardHtml('inc', _tf(2745, "Health 事件 · {$0} · #{$1}", CATS[c.c], id), c.art, c.n, cardMulTxt(c.e) + cardMulNote(), cardMulTxt(c.im), c.tip); }
  const c = REI[id];
  return pcardHtml('rei', `re:Invent${c.keep ? _t(2746, " · 保留卡") : ''} · #${id}`, c.art, c.n, cardMulTxt(c.e.replace(_tr(2747, "^保留：", ""), '')) + (c.keep ? _t(2748, "<br><span class=\"muted\">保留卡，用掉后翻面留在面前。</span>") : '') + cardMulNote(), '', c.tip);
}
const cardBack = kind => `<div class="face back ${kind}" style="--cc:${CARD_COL[kind]}">${awsImg(kind === 'rei' ? 'reinvent' : 'health')}<span>${kind === 'inc' ? _t(291, "Health 事件") : kind === 'fis' ? _t(2749, "FIS 故障注入") : 're:Invent'}</span></div>`;
// 只给主人看的东西（re:Invent 手牌、埋下的 Health 卡）这台设备能不能看：远端只看自己的座位（观众谁的都看不到）；
// 房主和同屏：这台只有一位真人时看他的，另外当前回合的本机真人也看得到（远端座位、电脑的房主看不到）。玩家卡、棋盘、格子详情共用这一条
export function seesPrivate(p) {
  if (!p || !S || !S.players) return false;
  if (MP.role === 'client') return !MP.watching && p.id === MP.mySeat;
  const loc = MP.role === 'host' ? S.players.filter(q => q.alive && !isAI(q.id) && !MP.isRemote(q.id)) : [];
  return (loc.length === 1 && loc[0].id === p.id) || (p.id === S.cur && !isAI(p.id) && !MP.isRemote(p.id));
}
// 「我埋的卡」：p 埋在场上、还没被踩中的 Health 卡一览（只有 p 自己看得到，seesPrivate）。按格子顺序列：格子、卡名、效果、第几轮埋的，
// 每行一个「看格子」打开那一格的详情。玩家卡上的「你埋的卡」那一行和右栏埋卡那一条都能点开
export async function trapList(id) {
  const p = S && S.players && S.players[+id]; if (!p || !seesPrivate(p)) return;
  const ts = (S.traps || []).filter(t => t.by === p.id && SQ[t.sq] && INC[t.id]).sort((a, b) => a.sq - b.sq || a.round - b.round);
  const rows = ts.map(t => `<tr><td><button type="button" class="sm lnk" data-act="showSquare" data-arg="${t.sq}">${SQ[t.sq].n}</button></td><td><b>${INC[t.id].n}</b><div class="muted">${INC[t.id].e || ''}</div></td><td>${_tf(3896, "第 {$0} 轮", t.round)}</td></tr>`).join('');
  await ask({ local: true, cancelable: true, view: true, cls: 'wide', title: _tf(5737, "{$0} 埋下的 Health 卡（{$1} 张）", p.name, ts.length),
    html: ts.length ? `<p class="muted">${_t(5738, "只有你自己看得到。谁停在这些格子上（路过不算）就翻开照常结算，你自己停上去也一样；同一格埋了几张就全部翻开。")}</p><table><tr><th>${_t(5739, "格子")}</th><th>${_t(5740, "卡")}</th><th>${_t(5741, "埋下")}</th></tr>${rows}</table>` : `<p>${_t(5742, "你现在没有埋着的 Health 卡。")}</p>`,
    buttons: [{ label: _t(2610, "关闭"), value: true, cls: 'pri' }] });
}
// 这台设备看得到的、埋在 i 格上的 Health 卡（埋的人自己看）：棋盘角标、格子详情用
const myTrapsAt = i => (S.traps || []).filter(t => t.sq === i && INC[t.id] && seesPrivate(P(t.by)));
const trapNames = ts => ts.map(t => INC[t.id].n).join(_t(349, "、"));
// 棋盘格右上角：一张扣着的小 Health 卡（卡背和发牌时一样），叠埋几张画成一摞、写张数；悬停写是哪几张
export function trapBadge(i) {
  const ts = myTrapsAt(i); if (!ts.length) return '';
  const t = _tf(5732, "你埋的：{$0}", trapNames(ts));
  return `<span class="trapb${ts.length > 1 ? ' many' : ''}" role="img" aria-label="${t}" title="${t}"><i class="tcb">${awsImg('health')}</i>${ts.length > 1 ? `<b>${ts.length}</b>` : ''}</span>`;
}
export const trapLine = i => { const ts = myTrapsAt(i); return ts.length ? _tf(5733, "你在这里埋了：{$0}", trapNames(ts)) : ''; };
// 发牌动画的起点：从牌堆的位置飞到窗口中间（偏移限制在 ±260px，窗口外的部分会被裁掉）
const dealFrom = kind => { const d = document.querySelector(kind === 'rei' ? '#center .stack.rei' : '#center .stack.inc'); if (!d) return ''; const r = d.getBoundingClientRect(), c = v => Math.max(-260, Math.min(260, Math.round(v))); return `--fx:${c(r.left + r.width / 2 - innerWidth / 2)}px;--fy:${c(r.top + r.height / 2 - innerHeight / 2)}px`; };
export const dealHtml = (kind, front) => `<div class="deal ${kind}${FX.ok() ? ' fx' : ''}" style="${dealFrom(kind)}"><div class="glow"></div><div class="mv"><div class="c3">${cardBack(kind)}<div class="face front">${front}</div></div></div></div>`;
export const dealSfx = kind => { sfx('card'); setTimeout(() => sfx(kind === 'rei' ? 'magic' : 'alarm'), 820); };
export const showCard = async (kind, id, p) => (S.lastCard = { kind, id, who: p.id }, render(), dealSfx(kind), setTimeout(() => FX.dealIn(), 0), ask({ title: _tf(2753, "{$0} 抽到一张{$1}", p.name, kind === 'inc' ? _t(2751, " Health 事件卡") : _t(2752, " re:Invent 卡")), html: dealHtml(kind, cardHtml(kind, id)), buttons: [{ label: _t(2754, "执行"), value: true, cls: 'pri' }] }));
// 只给抽卡的人看的抽卡窗（re:Invent 手牌，engine/18-reinvent.js）：卡面和 spec 的说明、按钮放在一起，别人只看到 spec.priv（见 modal 的 priv）。
// 「最近抽到」那里只写谁抽了一张、不写哪张（S.lastCard 会推给所有人），选了现在用再由 showCard 亮出来
export const peekCard = async (id, p, spec) => (S.lastCard = { kind: 'rei', id: null, who: p.id }, render(), dealSfx('rei'), setTimeout(() => FX.dealIn(), 0),
  ask({ ...spec, who: p.id, html: dealHtml('rei', cardHtml('rei', id)) + (spec.html || ''), priv: { html: _tf(5431, "<p>{$0} 抽到一张 re:Invent 卡，正在决定怎么用。卡面只有他自己看得到。</p>", p.name), ...spec.priv } }));
// 服务详情顶部的「现在的状态」：谁拥有、在哪一级、现在的过路费、每圈运行费、关联的有效架构
export function propStatusHtml(i) {
  const s = SQ[i], pr = S && S.props && S.props[i];
  if (!pr || !S.players) return '';
  const o = pr.owner === null ? null : P(pr.owner), who = o || viewerP() || cur();   // 没人买的格子：按看棋盘的人算架构进度（电脑在玩时不按电脑算）
  const lvTxt = s.upg ? _tf(2756, "{$0}（共 3 级）", pr.level ? lvFull(i, pr.level) : _tf(2755, "未升级 · {$0}", lvName(i, 0))) : '—';
  const sx = o ? svcState(i) : [], sxl = k => { const x = sx.find(y => y.k === k); return x ? _tf(2757, "<b class=\"warn\">{$0}</b>：{$1}", x.head, x.t) : ''; };
  const st = [pr.cap ? _tf(2758, "{$0} 个{$1}", pr.cap, capU(s.k)) : '', pr.spot ? _tf(2759, "{$0}，别人出得够高可以抢走", spotTxt(i)) : '', sxl('imp'), sxl('off'), sxl('ddos'), pr.via != null ? _tf(2760, "从代理商 {$0} 手里买的", P(pr.via).name) : ''].filter(Boolean).join(' · ');
  let rent = '—', rs0 = false, rsLv = '';   // rs0：代理商的库存没组成架构，这次不收；rsLv：代理商的地在「升级后」那排单块数后面补的说明
  if (o) {
    if (pr.offline || pr.ddos != null || pr.impaired) rent = _t(2761, "$0（暂停收费）");
    else { const { r, jr, txt, rn, cap, fullTxt } = shownRent(i); rs0 = !r; rsLv = rsLvTag(o, jr); rent = !r ? _t(2762, "$0（代理商的库存，没组成架构不收）") : `${txt.replace(_t(2763, "点数×"), _t(2764, "骰子点数 × "))}${cap ? _tf(2765, "（新账户保护期封顶，第 {$0} 轮起 {$1}）", BAL.protect + 1, fullTxt.replace(_t(2763, "点数×"), _t(2764, "骰子点数 × "))) : ''}${jr ? _tf(2768, "（{$0}{$1}联合收费{$2}）", jr.cs.map(c => _tf(2766, "「{$0}」", c.n)).join(''), jr.cs.length > 1 ? _t(2767, "串联") : '', rn ? ` · ${rn}` : '') : rn ? _tf(2769, "（{$0}）", rn) : ''}`; }
  }
  const lvs = s.t === 'prop' && s.upg;
  const joint = o && !pr.offline && pr.ddos == null && !pr.impaired && !!jointRent(i, 7);   // 正在收架构联合收费时，下面列的是单块的数
  const rentUp = !lvs ? '' : _tf(2774, "<br><span class=\"muted\">{$0}：</span>{$1}", o ? (joint ? _t(2770, "各级单块") : _t(2771, "升级后")) + rsLv : _t(2772, "买下后"), (o ? [1, 2, 3] : [0, 1, 2, 3]).map(l => `<span class="lvr${o && pr.level === l ? ' cur' : ''}">${l ? _tf(2773, "第 {$0} 级", l) : lvName(i, 0)} ${rentTxt(i, l, true)}</span>`).join('<span class="muted"> · </span>'));
  const run = runIfMine(i), runs = lvs ? [0, 1, 2, 3].map(l => runIfMine(i, () => runAt(i, l))) : null;
  const runUp = !runs ? '' : runs.every(x => x === runs[0]) ? _t(2775, "<br><span class=\"muted\">升级不加运行费</span>")
    : _tf(2777, "<br><span class=\"muted\">升级后：</span>{$0}", [1, 2, 3].map(l => _tf(2776, "<span class=\"lvr{$0}\">第 {$1} 级 ${$2}</span>", pr.level === l ? ' cur' : '', l, runs[l])).join('<span class="muted"> · </span>'));
  const cbs = COMBOS.filter(c => cAll(c).includes(i) && comboOpen(c)).map(c => {
    const have = c.ix.filter(n => (Array.isArray(n) ? n : [n]).some(k => active(who, k))), miss = c.ix.filter(n => !have.includes(n));
    const done = !miss.length, opt = !c.ix.flat().includes(i);
    return `<div class="pscb ${done ? 'done' : ''}" data-arch="${c.id}" data-p="${who.id}"><b>${c.n}</b> ${have.length}/${c.ix.length}${done ? _t(2778, " 已生效") : _tf(2779, " · 还差 {$0}", miss.map(n => slotOpen(n).map(k => SQ[k].n).join(_t(1815, " 或 "))).join(_t(349, "、")))}${opt ? _t(2780, " · 这一块是可选的，有它一起收") : ''}</div>`;
  }).join('');
  return zhs(`<table class="pstat">
    <tr><th>${_t(2793, "谁拥有")}</th><td>${o ? `${PAWN(o.color)}${nm(o)}` : _t(2781, "<span class=\"muted\">没人买，落上来可以买</span>")}</td></tr>
    ${s.upg ? _tf(2782, "<tr><th>当前级别</th><td>{$0}{$1}</td></tr>", lvTxt, st ? `<br><span class="muted">${st}</span>` : '') : (st ? _tf(2783, "<tr><th>状态</th><td>{$0}</td></tr>", st) : '')}
    <tr><th>${_t(2794, "现在的过路费")}</th><td class="runc">${o ? rent : _t(2784, "<span class=\"muted\">没人买，不收</span>")}${o && !rs0 && (s.bill === 'req' || s.t === 'util') ? _t(2785, " <span class=\"muted\">（按 7 点估，随点数浮动）</span>") : ''}${rentUp}</td></tr>
    <tr><th>${_t(2795, "每圈运行费")}<br>${_t(2796, "<span class=\"muted\" style=\"font-weight:400;font-size:12px\">经过 Startup 扶持时交</span>")}</th><td class="runc">${run ? `$${run}` : '$0'}${o ? (pr.offline ? _t(2786, " <span class=\"muted\">（下线期间）</span>") : pr.level ? _t(2787, " <span class=\"muted\">（现在）</span>") : '') : _t(2788, " <span class=\"muted\">（买下后，没升级时）</span>")}${useFeeTxt(i, pr.level) && !pr.offline ? _tf(2790, "<br><span class=\"muted\">另外每次{$0}（{$1}：每圈不交固定运行费，用多少交多少）</span>", useFeeTxt(i, pr.level), SQ[i].bill === 'token' ? _t(354, "按 token 计费") : _t(2789, "按请求计费")) : ''}${runUp}</td></tr>
    ${cbs || needLine(i, needSquares()) ? _tf(2792, "<tr><th>关联的有效架构</th><td>{$0}{$1}{$2}</td></tr>", needLine(i, needSquares()) ? `<div class="psneed">${needLine(i, needSquares())}</div>` : '', cbs, cbs ? _tf(2791, "<span class=\"muted\" style=\"font-size:12px\">按{$0}现在持有的算</span>", o ? ` ${o.name} ` : _t(2456, "你")) : '') : ''}
  </table>`);
}
