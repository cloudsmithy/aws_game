import { _t, _tf } from '../core/01-i18n-runtime.js';
import { BOT, PAWN, SIM, awsImg, homeUrl, usd } from '../core/02-util.js';
import { COMBOS, roleOf } from '../rules/04-roles-combos-cards.js';
import { P, S, active, hasCombo, ownedBy, winWA } from '../engine/07-state.js';
import { valTip, valuation } from '../engine/08c-costs.js';
import { ask } from './10-modal.js';
import { pillars } from '../engine/26a-pillars-win.js';
import { ST, comboNodes, svcNode } from '../engine/26b-retro.js';
import { downloadLog, finSub, finTitleHtml, printReport, reportHtml } from './26c-report.js';
import { finKind, finalRank } from '../engine/26d-gameover.js';
import { againGo } from './28-setup-save.js';
import { sfx } from './32-sfx.js';
import { modeName } from '../rules/35-modes.js';
import { MP } from '../net/40-host-sync.js';
// 结束动画 + 战报。联机的远端收到「已结束」的状态时也在自己设备上播一遍（战报只读 S）；
// 远端的按钮是「回开局页」：再来一局得等房主重新建房间
export async function overScreens(w, why) {
  await endFx(w, why);
  await showReport();
}
// 战报：结束动画之后自动弹一次；点「知道了」关掉后，台面中央的「查看战报」能再打开，导出对局记录也在里面。
// 赢家和结束原因从 S 里读（远端同步来的 S 也有），远端点这个按钮只在自己设备上开，不发给房主
export async function showReport() {
  if (!S || !S.over) return;
  const w = S.winner != null ? P(S.winner) : null, why = S.overWhy || '';
  for (;;) { const v = await ask({ local: true, cls: 'wide rep', title: _t(3900, "战报"), html: reportHtml(w, why), buttons: [{ label: _t(3901, "<span>导出 PDF<span class=\"xl\"> 战报</span></span>"), value: 'pdf', botW: 0 }, { label: _t(3902, "<span>导出<span class=\"xl\">对局</span>记录</span>"), value: 'x', botW: 0 }, { label: MP.role === 'client' ? _t(3903, "回开局页") : _t(3904, "再来一局"), value: 'n', botW: 0 }, { label: _t(2478, "知道了"), value: true, cls: 'pri' }] }); if (v === 'n') { if (MP.role === 'client') location.href = homeUrl(); else againGo(); return; }
    // 点按钮弹窗就关了：重画一遍战报（接着原来的位置），排好版再打印
    if (v === 'pdf') { setTimeout(printReport, 200); continue; }
    if (v !== 'x') break; downloadLog(w, why); }
}
// 结束画面：一张「最终架构总览」。和开局页、棋盘用同一套架构图画法（深色网格底、细线分组框、官方服务图标、连线），
// 每个玩家一条泳道：泳道头写名次、座位、估值和与第 1 名差多少，里面画他凑成的架构（一条链一个框）和其余的服务，顶上那条带子写过路费收付和数量。
// 泳道从最后一名往上依次出现（一条 0.2 秒），出到赢家前停 0.3 秒；标题、赢家的橙框和音效同一拍出来。点任意处或按键跳过；减少动效时直接摆好；自动化测试和模拟里不放
const EF_SMALL = '(max-width:640px),(max-height:520px) and (orientation:landscape)';
// 手机横屏一直是两列紧凑排法；竖屏手机放不下时才收紧（.tight），和 CSS 里那两段媒体查询对应
const EF_LAND = '(max-height:520px) and (orientation:landscape)', EF_PHONE = '(max-width:640px) and (orientation:portrait)';
function endFx(w, why) {
  if (BOT || SIM || new URLSearchParams(location.search).get('demo') === 'report') return Promise.resolve();
  const rank = finalRank(w), n = rank.length, still = matchMedia('(prefers-reduced-motion: reduce)').matches, kind = finKind(w, why), wa = winWA();
  const at = k => 250 + (n - 1 - k) * 200 + (k ? 0 : 300), win0 = at(0) + 350;   // 第 k 名（0 起）的泳道出现的时刻（毫秒）；win0 是赢家亮起来、标题出来的那一拍
  // 估值的拆分只在有鼠标悬停的设备上挂 title：触屏上点一下是「继续」，挂着 title 会顺带弹一条拆分的 toast
  const hov = matchMedia('(hover: hover)').matches;
  // 每条泳道最多画一排架构框（手机 2 个、其他 3 个），多的写「另有 N 个架构」，全部在战报里：服务很多的局不会把后面几名挤出屏幕
  const maxA = matchMedia(EF_SMALL).matches ? 2 : 3, top = n ? valuation(rank[0]) : 0;
  const lane = (q, k) => {
    const cs = COMBOS.filter(c => hasCombo(q, c.id)), used = new Set(), t = ST(q), v = valuation(q), win = !!w && q.id === w.id;
    cs.forEach(c => comboNodes(q, c).forEach(i => used.add(i)));   // 没画出来的架构里的服务也不算「其他服务」
    const grp = cs.slice(0, maxA).map(c => `<div class="ag"><b>${c.n}</b><div class="ach">${comboNodes(q, c).map(i => svcNode(i)).join('<i class="ln"></i>')}</div></div>`).join('');
    const rest = ownedBy(q).filter(i => !used.has(i));   // 不在任何凑成的架构里的服务；下线了的灰着
    const body = grp + (rest.length ? `<div class="ag loose"><b>${cs.length ? _t(3905, "其他服务") : _t(3729, "服务")}</b><div class="ach">${rest.map(i => svcNode(i, active(q, i) ? '' : 'off')).join('')}</div></div>` : '')
      + (cs.length > maxA ? _tf(3906, "<span class=\"mo\" data-a=\"{$0}\">另有 {$1} 个架构</span>", cs.length - maxA, cs.length - maxA) : '');
    // 与第 1 名差多少（真减号）；打平写「持平」。六大支柱赢的人估值不一定最高，他那一格写支柱得分，比他高的人写「+$630」
    const gap = k ? _tf(3907, "<small>与第 1 名</small>{$0}", v === top ? _t(3716, "持平") : usd(v - top, true)) : kind === 'wa' ? _t(3908, "<small>六大支柱</small>6/6") : '';
    const pil = wa && !(win && kind === 'wa') ? _tf(3909, "<span class=\"pil\"><span class=\"sep\"> · </span>支柱 <b>{$0}/6</b></span>", pillars(q).filter(Boolean).length) : '';
    return `<li class="lane${win ? ' win' : ''}${q.alive ? '' : ' out'}" style="--d:${at(k)}ms">${_tf(3728, "<span class=\"lt\">第 {$0} 名{$1}</span>", k + 1, win ? _t(3693, " · 获胜") : q.alive ? '' : _t(3694, " · 已出局"))}
      <p class="lsm">${_tf(3912, "<span class=\"lrn\">过路费 收 <b>${$0}</b> / 付 <b>${$1}</b></span><span class=\"x2\"> · <b>{$2}</b> 块服务 · <b>{$3}</b> 个架构</span>{$4}", t.rentIn, t.rentOut, ownedBy(q).length, cs.length, pil)}</p>
      <div class="lh">${PAWN(q.color)}<b>${q.name}</b><small>${roleOf(q).n}${q.reseller ? _t(3724, " · 代理商") : ''}</small><div class="lval"${hov ? ` title="${valTip(q)}"` : ''}>${_tf(3913, "<span class=\"lvl\"><b>{$0}</b><small>估值</small></span>{$1}", usd(v), gap ? `<span class="lg">${gap}</span>` : '')}</div></div>
      <div class="lb">${body || `<p class="none">${q.alive ? _t(3910, "手上没有服务") : _t(3911, "服务都交回亚马逊云科技了")}</p>`}</div></li>`;
  };
  const el = document.createElement('div'); el.id = 'endfx'; el.className = kind === 'wa' ? 'wa' : ''; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'eft efg'); el.setAttribute('aria-describedby', 'efwhy');   // 读屏念标题（谁赢了）+ 第几轮，再念标题下面那一句
  el.style.setProperty('--wd', (still ? 0 : win0) + 'ms');
  el.style.setProperty('--fd', (still ? 0 : at(0) + 600) + 'ms');   // 「查看战报」等赢家亮了再出来
  const tap = matchMedia('(hover: none)').matches ? _t(3914, "点任意处继续") : _t(3915, "点任意处或按任意键继续");
  el.innerHTML = `<div class="ef"><div class="efr"><div class="gt">${_tf(3916, "{$0}<span id=\"efg\">最终架构总览 · 第 {$1} 轮 · {$2}</span>", awsImg('cloud'), S.round, modeName())}</div>
    <div class="efh"><h2 id="eft">${finTitleHtml(w, why)}</h2><p id="efwhy">${finSub(w, why)}</p></div>
    <ol class="lanes" aria-label="${_t(3865, "最终排名")}">${rank.map(lane).join('')}</ol></div>
    <div class="eff"><span>${tap}</span><button class="pri" type="button" title="${tap}">${_t(3917, "查看战报")}</button></div></div>`;
  document.body.appendChild(el);
  el.querySelector('.eff button').focus({ preventScroll: true });   // 焦点放进来：读屏念到这一屏，回车也能继续
  // 矮屏上服务排成一行：排不下的从后往前收（先收「其他服务」的单块，再整框收架构），末尾写「+N」。转屏、改窗口大小时先全放回来再量
  const clip = () => {
    el.querySelectorAll('.lb .cut').forEach(x => x.remove());
    el.querySelectorAll('.lb [data-cut]').forEach(x => { x.hidden = false; delete x.dataset.cut; });
    if (!matchMedia(EF_LAND).matches && !el.classList.contains('tight')) return;
    el.querySelectorAll('.lane:not(.win) .lb').forEach(lb => {
      if (lb.scrollWidth <= lb.clientWidth + 1) return;
      const items = [...lb.querySelectorAll('.ag:not(.loose)'), ...lb.querySelectorAll('.ag.loose .nd')], mo = lb.querySelector('.mo'), loose = lb.querySelector('.ag.loose');
      let nA = mo ? +mo.dataset.a : 0, nS = 0;
      if (mo) { mo.hidden = true; mo.dataset.cut = 1; }
      const tag = document.createElement('span'); tag.className = 'mo cut'; lb.appendChild(tag);
      const say = () => { tag.textContent = [nA && _tf(3918, "+{$0} 个架构", nA), nS && _tf(3919, "+{$0} 块", nS)].filter(Boolean).join(' '); };
      say();
      while (items.length && lb.scrollWidth > lb.clientWidth + 1) {
        const x = items.pop(); x.hidden = true; x.dataset.cut = 1;
        if (x.classList.contains('nd')) nS++; else nA++;
        if (loose && !loose.querySelector('.nd:not([hidden])')) { loose.hidden = true; loose.dataset.cut = 1; }
        say();
      }
      if (!nA && !nS) tag.remove();
    });
  };
  // 放不下（要滚）时给吸底的按钮栏垫实底；泳道都出来以后再量一次（字体晚到时高度会变），转屏、改窗口大小也重量。
  // 量的是 .ef 的布局高度（不受开场位移动画影响），不然开场那一下泳道还往下偏着，会误判成放不下。
  // 竖屏手机放不下就加 .tight（收紧、服务排一行）；桌面上放不下（服务特别多的局）就加 .dense：服务只露图标、名字留给读屏，每条泳道的架构框排成一排
  const ef = el.querySelector('.ef'), pad = getComputedStyle(el), tall = () => ef.offsetHeight + parseFloat(pad.paddingTop) + parseFloat(pad.paddingBottom) > el.clientHeight + 1;
  const fit = () => {
    el.classList.remove('dense', 'tight'); clip();
    if (tall()) { if (matchMedia(EF_PHONE).matches) { el.classList.add('tight'); clip(); } else if (!matchMedia(EF_SMALL).matches) el.classList.add('dense'); }
    el.classList.toggle('ovf', tall());
  }, refit = setTimeout(fit, still ? 0 : at(0) + 1100);
  fit(); addEventListener('resize', fit);
  const fx = setTimeout(() => sfx('win'), still ? 0 : win0);
  // 只按了 Shift、Cmd 这些修饰键不算：Mac 截图要按 Shift+Cmd+4，以前一按 Shift 结束画面就没了。
  // 点击和按键都等 0.6 秒（减少动效时 0.3 秒）才认：最后一下「轮到下一位」连点或双击，第二下不会把整个结束画面跳掉
  return new Promise(res => {
    let done = false, armed = false;
    const end = () => { if (done || !armed) return; done = true; clearTimeout(fx); clearTimeout(refit); removeEventListener('keydown', key); removeEventListener('resize', fit); el.remove(); res(); },
      key = e => { if (['Shift', 'Meta', 'Control', 'Alt', 'CapsLock', 'Fn'].includes(e.key) || !armed) return; if (e.key === ' ' || e.key === 'Enter') e.preventDefault(); end(); };   // 空格、回车不再触发按钮默认的点击：不然松手那一下会点到战报里刚拿到焦点的「知道了」
    el.addEventListener('click', end); addEventListener('keydown', key); setTimeout(() => { armed = true; }, still ? 300 : 600);
  });
}
