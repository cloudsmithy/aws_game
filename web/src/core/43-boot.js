import { LANG, __setLangHook, _t, _tf, _tr } from './01-i18n-runtime.js';
import { $, ACTS, BOT, DEMO, KEY, MY_REV, REV_KEY, SIM, awsImg, esc, homeUrl } from './02-util.js';
import { DISC_GENAI, DISC_PLAY, DISC_PRICE, GROUPS, IX, N, SQ } from '../rules/03-services.js';
import { langBtn, langMenu } from '../ui/03b-lang-menu.js';
import { COMBOS, INC, QUIZ, REI } from '../rules/04-roles-combos-cards.js';
import { DLC } from '../rules/05-dlc.js';
import { QBANK, practice } from '../rules/06-qbank.js';
import { S, cur } from '../engine/07-state.js';
import { showLedger } from '../ui/08b-ledger.js';
import { canFocus, mainBtn, viewOpen } from '../ui/10-modal.js';
import { doRoll, endTurn, jailAct, uiAction } from '../engine/14-turn.js';
import { capHere, upHere } from '../engine/15-land.js';
import { refactorDebt } from '../engine/17-health.js';
import { buyReinvent, incAll, incOne, incRand, reiHand } from '../engine/18-reinvent.js';
import { declareBankrupt } from '../engine/20-bankrupt.js';
import { setRsRate, useRoleSkill, wildDialog } from '../engine/21-skills.js';
import { speedMenu } from '../engine/22-speed.js';
import { manage } from '../engine/23-manage.js';
import { activeAction } from '../engine/24-actions.js';
import { edpDialog, quizAll, quizChallenge, trade, tradeFor } from '../engine/25-trade.js';
import { repKey, repSt, repTab } from '../ui/26c-report.js';
import { showReport } from '../ui/26f-over-screens.js';
import { showManual } from '../ui/26e-manual.js';
import { toggleArchTip } from '../ui/27b-arch-notes.js';
import { fmtTime } from '../ui/27c-center.js';
import { jumpPl, render, togglePl, toggleRole } from '../ui/27d-side.js';
import { closeSqPop, gallery, showSquare, showSquareFull, themeControl } from '../ui/27e-square-gallery.js';
import { DLC_TABS, backToSetup, confirmNew, dlcCat, dlcCounts, endNow, maybeTour, playerGallery, quitGame, renameDialog, renderNames, resumeGame, setupRestore, setupSum, staleTab, startFromSetup, toast, toggleAnim } from '../ui/28-setup-save.js';
import { botMain } from '../dev/29-bot.js';
import { simMain } from '../dev/30-sim.js';
import { demo } from '../dev/31-demo.js';
import { toggleSfx } from '../ui/32-sfx.js';
import { hellDlc } from '../rules/35-modes.js';
import { toggleAiPause } from '../engine/36-ai.js';
import { BOSS, toggleBoss } from '../ui/39-bosskey.js';
import { sigInit } from '../net/40a-signal.js';
import { MP } from '../net/40-host-sync.js';
import { mpHostName, mpNetDialog, mpNetTest, mpSigSave, mpTurnSave, mpUI } from '../net/42-setup.js';
// ================= data-act 动作表（机制见 core/02-util.js 的 ACTS / actRun）=================
// 动作名就用原来行内 onclick 调的函数名，actKey 能拼回原文；函数在各个文件里，点的时候才查，所以表放在最后一个文件、开头先填好（启动代码和机器人要点按钮）
// data-act="uiAction" 的 data-arg：回合里的操作，交给 uiAction 包一层（锁住按钮、结算欠款、存档）
const UI_ACTS = Object.assign(Object.create(null), {
  manage: () => manage(cur()), trade: () => trade(), edpDialog: () => edpDialog(), activeAction: () => activeAction(), declareBankrupt: () => declareBankrupt(),
  buyReinvent: () => buyReinvent(), reiHand: () => reiHand(), refactorDebt: () => refactorDebt(), useRoleSkill: () => useRoleSkill(), wildDialog: () => wildDialog(), quizChallenge: () => quizChallenge(),
  quizAll: () => quizAll(), incOne: () => incOne(), incRand: () => incRand(), incAll: () => incAll(), upHere: () => upHere(), capHere: () => capHere(), speedMenu: () => speedMenu(), setRsRate: () => setRsRate(),
});
Object.assign(ACTS, {
  // 开局页
  startFromSetup: () => startFromSetup(), showManual: () => showManual(), playerGallery: () => playerGallery(), practice: () => practice(), ugPreset: () => ugPreset(),
  renderNames: () => renderNames(), resumeGame: () => resumeGame(), mpNetDialog: () => mpNetDialog(), mpUI: (el, e, a) => mpUI(a),
  scrollToSetup: () => document.querySelector('.setup-box').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }),
  showLetter: el => showLetter(el), closeLetter: () => closeLetter(),
  // 跳到操作按钮 / 玩家栏（读屏和键盘用的跳转链接）
  skipToMain: () => { const t = mainBtn() || [...document.querySelectorAll('#center .stage button, #mbar button')].find(canFocus); if (t) t.focus(); },
  skipToSide: () => { const t = [...document.querySelectorAll('#side .plt, #side .svc, #side button')].find(canFocus); if (t) t.focus(); },
  // 对局：主按钮、更多操作、菜单
  doRoll: () => doRoll(), endTurn: () => endTurn(), jailAct: (el, e, a) => jailAct(a), toggleAiPause: () => toggleAiPause(), 'MP.aipause': () => MP.send(MP.hostConn, { t: 'aipause' }),
  uiAction: (el, e, a) => { const f = UI_ACTS[a]; if (f) uiAction(f); else console.error('unknown uiAction', a); },
  backToSetup: () => backToSetup(), toHome: () => { location.href = homeUrl(); }, showReport: () => showReport(), endNow: () => endNow(),
  gallery: () => gallery(), maybeTour: (el, e, a) => maybeTour(a === 'true'), keysHelp: () => document.dispatchEvent(new KeyboardEvent('keydown', { key: '?' })),
  toggleSfx: () => toggleSfx(), renameDialog: (el, e, a) => renameDialog(a), toggleBoss: () => toggleBoss(), toggleArchTip: () => toggleArchTip(), toggleAnim: () => toggleAnim(),
  quitGame: () => quitGame(), confirmNew: () => confirmNew(), langMenu: el => langMenu(el),
  // 灰按钮：有 data-arg 念它，没有就念 data-why
  toast: (el, e, a) => toast(a ?? el.dataset.why), dlcToast: (el, e, a) => toast((a ?? '') + el.title, 5000),   // data-arg 是前缀（「这局开了：」，跟着翻译串走）
  // role=button 的非按钮元素：回车、空格当成点一下
  clickOnKey: (el, e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } },
  // 棋盘、玩家栏、格子面板
  showSquare: (el, e, a) => showSquare(+a), showSquareFull: (el, e, a) => { closeSqPop(); showSquareFull(+a); }, closeSqPop: () => closeSqPop(),
  togglePl: (el, e, a) => togglePl(+a), toggleRole: (el, e, a) => toggleRole(+a), showLedger: (el, e, a) => showLedger(+a), jumpPl: (el, e, a) => jumpPl(+a),
  tradeFor: (el, e, a) => { const [to, want] = a.split(',').map(Number); tradeFor(to, want); },
  // 战报
  repTab: (el, e, a) => repTab(+a), repKey: (el, e) => repKey(e, el), repOpen: el => { repSt().open = el.open; },
  // 联机
  'MP.leave': () => MP.leave(), 'MP.proposeEnd': () => MP.proposeEnd(), 'MP.kickDialog': () => MP.kickDialog(), 'MP.kick': (el, e, a) => MP.kick(+a), 'MP.lobbyRenameAsk': () => MP.lobbyRenameAsk(),
  'MP.idleTake': () => MP.idleTake(), 'MP.watchDialog': () => MP.watchDialog(), 'MP.reviewJoin': (el, e, a) => MP.reviewJoin(a), 'MP.copyWatchInvite': () => MP.copyWatchInvite(),
  'MP.rejoin': () => { MP.reN = 0; MP.rejoin(); }, mpNetTest: () => mpNetTest(), mpSigSave: () => mpSigSave(), mpTurnSave: (el, e, a) => mpTurnSave(a === 'true' || undefined),
  mpHostGo: el => { if ($('#mppwd').value.length < 4) { $('#mpstat').innerHTML = '<span class=warn>密码至少 4 位</span>'; } else { mpHostName(); MP.host($('#mppwd').value, $('#mpallowwatch').checked); el.disabled = true; } },
  mpJoinGo: el => { MP.join($('#mproom').value, $('#mppwd').value, $('#mpname').value, undefined, $('#mpmode').value === 'spectator'); el.disabled = true; },
});
// ================= 启动 =================
// 开局页：封面（hero）、「新建一局」右边的语言按钮、棋盘左上角的标签，都是按当前语言画的；切换语言时 rerenderLang 再调一次
function renderHero() {
  document.querySelectorAll('.setup-head .hctl, .setup-head .theme-control, .setup-head .langsw').forEach(el => el.remove());
  // 语言、外观两个按钮包成一组，一起靠右；放不下时整组换到下一行，不会只把「外观」挤到左边
  document.querySelector('.setup-head')?.insertAdjacentHTML('beforeend', `<span class="hctl">${langBtn('sm')}${themeControl()}</span>`);
  const fgt = document.querySelector('.frame > .gt'); if (fgt) fgt.remove();
  document.querySelector('.frame').insertAdjacentHTML('afterbegin', _tf(5126, "<div class=\"gt\">{$0}亚马逊云科技</div>", awsImg('cloud')));
  const flow = ['route53', 'cloudfront', 'elb', 'ec2', 'rds'].map(k => `<div class="node">${awsImg(k)}<span>${SQ[IX[k]].n}</span></div>`).join('<div class="link"></div>');
  const REP = { storage: 's3', iaas: 'ec2', net: 'vpc', ctr: 'ecs', integ: 'sqs', db: 'rds', ana: 'athena', sec: 'guardduty', ai: 'bedrock', util: 'cloudwatch' };
  const cats = Object.entries(GROUPS).map(([g, v]) => { const n = SQ.filter(x => x.g === g).length; return `<div class="cat${g === 'util' ? ' wild' : ''}" style="--gc:${v.color}" title="${esc(SQ.filter(x => x.g === g).map(x => x.n).join(_t(349, "、")) + (g === 'util' ? _t(5127, "：万能服务，能顶替任何一块组成架构（另外 KMS、VPC 也是万能服务，有绑定限制）") : ''))}">${awsImg(REP[g] || SQ.find(x => x.g === g).k)}<span>${v.name}</span></div>`; }).join('');
  const nSvc = SQ.filter(x => x.t === 'prop').length, nQ = Object.values(QUIZ).flat().length + Object.values(QBANK).reduce((t, b) => t + b.qs.length, 0);
  const pips = n => ({ 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] })[n];
  const die = (n, cls = '') => `<div class="hdie ${cls}">${[...Array(9)].map((_, i) => `<i class="${pips(n).includes(i) ? 'on' : ''}"></i>`).join('')}</div>`;
  $('#hero').innerHTML = `<div class="top"><div class="htab">${_tf(5128, "{$0}BOARD GAME · 云上创业", awsImg('reinvent'))}</div><div class="dice" aria-hidden="true">${die(5)}${die(1, 'red')}</div></div>
    <h1>${_t(5129, "<small>亚马逊云科技 User Group</small><span>云上大亨</span>")}</h1>
    <p class="lead">${_t(5130, "在亚马逊云科技上创业：买服务、做高可用、扛住 Health 事件、控账单，把服务组成真实的架构收联合过路费。2–4 人同屏轮流玩，也可以各用各的设备联机。")}</p>
    <div class="stats"><div>${_tf(5131, "<b>{$0}</b><span>格棋盘</span>", N)}</div><div>${_tf(5132, "<b>{$0}</b><span>个服务</span>", nSvc)}</div><div>${_tf(5133, "<b>{$0}</b><span>张卡牌</span>", INC.length - 1 + REI.length - 1)}</div><div>${_tf(5134, "<b>{$0}</b><span>种有效架构</span>", COMBOS.length)}</div><div>${_tf(5135, "<b>{$0}</b><span>道知识题</span>", nQ)}</div></div>
    <div class="diag"><div class="gt">${_tf(5136, "{$0}一局里你会搭出来的架构 · 高可用入口 + 经典三层 Web", awsImg('region'))}</div><div class="flow">${flow}</div>
      <div class="cats">${cats}</div></div>
    <div class="cta"><button class="pri twin" data-act="startFromSetup" title="${_t(5137, "按下面表单当前的设置直接开局")}">${_t(5138, "开始游戏")}</button><button class="ondark" data-act="scrollToSetup">${_t(5139, "自定义设置")}</button><button class="ondark twin" data-act="showManual">${_t(5140, "先看玩法")}</button><button class="ondark" data-act="playerGallery" title="${_t(5141, "所有角色卡：起始资金、能力、弱点、专属技能")}">${_t(4694, "玩家图鉴")}</button></div>
    <div class="credit"><div class="cr-h">${_t(5142, "<span class=\"cr-k\">关于</span>")}<button type="button" class="cr-letter" data-act="showLetter"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="4.5" width="15" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m3 5.5 7 5.5 7-5.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>${_t(5143, "作者寄语")}</button></div><div class="cr-h cr-repo">${_t(5144, "<span class=\"cr-k\">项目地址</span><a href=\"https://github.com/cloudsmithy/aws_game\" target=\"_blank\" rel=\"noopener noreferrer\">github.com/cloudsmithy/aws_game")}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3h7v7M13 3 4 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a></div><div class="cr-h cr-fb">${_t(5145, "<span class=\"cr-k\">反馈</span><span>规则有疑问、游戏有 bug，都可以在这里反馈给我们：<a class=\"cr-url\" href=\"https://github.com/cloudsmithy/aws_game/issues\" target=\"_blank\" rel=\"noopener noreferrer\">github.com/cloudsmithy/aws_game/issues")}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3h7v7M13 3 4 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a></span></div><div class="cr-disc" role="note"><div class="cr-h">${_t(5146, "<span class=\"cr-k\">免责声明</span>")}<div class="cr-ps"><p>${DISC_GENAI.replace(_tr(4542, "^免责声明：", ""), '')}</p><p>${_tf(5147, "备注：{$0}{$1}", DISC_PRICE, DISC_PLAY)}</p></div></div></div></div>`;
}
renderHero();
renderNames();
sigInit();   // 读网站给的默认信令服务器（docker compose 自建部署有 peer-config.json；GitHub Pages 没有，走公共）
// UG 活动局：线下活动一键开——娱乐模式 + 边玩边答题，12 轮或 30 分钟先到为准，4 人一桌，不开 DLC；网址加 ?ug=1 打开就直接开局
function ugPreset(start = true) {
  const pick = sel => { const el = document.querySelector(sel); if (el) { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); } };
  pick('input[name=np][value="4"]'); pick('input[name=diff][value=party]'); { const cm = $('#cmul'); if (cm) { cm.value = '1.5'; cm.dispatchEvent(new Event('change', { bubbles: true })); } }
  document.querySelectorAll('#dlcTiles input:checked').forEach(x => { x.checked = false; x.dispatchEvent(new Event('change', { bubbles: true })); });
  $('#learn').checked = true; $('#winWA').checked = false; $('#winRounds').checked = true; $('#rounds').value = 12; $('#winTimed').checked = true; $('#minutes').value = 30;
  if (typeof setupSum === 'function') setupSum();
  if (start) startFromSetup();
}
// 选地狱模式：规则里必开的玩法 DLC、高速部署和全部题库勾上并锁住，代理商默认也勾上（可以取消）；
// 地狱模式必须答题、卡牌固定 2 倍，「边玩边答题」开关和卡牌倍率这两行藏起来。换回别的模式时，把自动勾上的取消、解锁，两行恢复原样
let HELL_AUTO = null;
function hellTiles(on) {
  const tiles = [...document.querySelectorAll('#dlcTiles input')], fire = x => x.dispatchEvent(new Event('change', { bubbles: true })), must = hellDlc(), learn = $('#learn');
  if (on && !HELL_AUTO) {
    const cm = $('#cmul'), row = document.querySelector('.mulrow');
    HELL_AUTO = { dlc: [], learn: learn.checked, cmul: cm ? cm.value : '1' };
    if (cm) cm.value = '2'; if (row) row.style.display = 'none';
    tiles.forEach(x => {
      if (![...must, 'reseller'].includes(x.value)) return;
      if (!x.checked) { x.checked = true; HELL_AUTO.dlc.push(x.value); fire(x); }
      if (must.includes(x.value)) { x.disabled = true; x.parentElement.classList.add('lock'); }
    });
    learn.checked = true; learn.closest('.switch').style.display = 'none';
  } else if (!on && HELL_AUTO) {
    tiles.forEach(x => {
      if (must.includes(x.value)) { x.disabled = false; x.parentElement.classList.remove('lock'); }
      if (HELL_AUTO.dlc.includes(x.value)) { x.checked = false; fire(x); }
    });
    learn.checked = HELL_AUTO.learn; learn.closest('.switch').style.display = ''; fire(learn);
    const c0 = $('#cmul'), row = document.querySelector('.mulrow'); if (c0) c0.value = HELL_AUTO.cmul || '1'; if (row) row.style.display = '';
    HELL_AUTO = null;
  }
}
document.querySelectorAll('input[name=diff]').forEach(r => r.addEventListener('change', () => { const v = r.value; if (!r.checked) return; if (v !== 'study') studyTiles(false); hellTiles(v === 'hell'); if (v === 'hell' && matchMedia('(hover:none)').matches) toast(r.closest('label').title, 8000); if (v === 'study') studyTiles(true); $('#rounds').value = v === 'party' ? 10 : 15; if (v === 'party' && $('#cmul')) $('#cmul').value = '1.5'; }));
// 学习模式必答题、不限轮数：「边玩边答题」勾上锁住、轮数上限灰掉，开局页看到的就是实际生效的设置；换走时恢复原来的勾选。
// 先退出旧模式再进新模式（地狱模式那边也会动这个开关），所以 change 里是先 studyTiles(false) 再 hellTiles，最后才 studyTiles(true)
let STUDY_AUTO = null;
function studyTiles(on) {
  const learn = $('#learn');
  if (on && !STUDY_AUTO) { STUDY_AUTO = { learn: learn.checked }; learn.checked = true; }
  else if (!on && STUDY_AUTO) { learn.checked = STUDY_AUTO.learn; STUDY_AUTO = null; }
  learn.disabled = $('#winRounds').disabled = $('#rounds').disabled = on;
}
function renderDlcTiles() {
  const box = $('#dlcTiles'), keep = new Map([...box.querySelectorAll('input')].map(x => [x.value, [x.checked, x.disabled, x.parentElement.classList.contains('lock')]])), cat = box.dataset.cat;
  $('#dlcTiles').innerHTML = Object.entries(DLC).map(([k, d]) => `<label class="tile ck ${d.quiz ? 'qdlc' : ''}" data-cat="${dlcCat(k, d)}"><input type="checkbox" value="${k}"><b>${awsImg(d.icon)}${d.n}</b><span>${d.d}</span></label>`).join('');
$('#dlcTabs').innerHTML = DLC_TABS.map(([c, t], k) => `<button type="button" role="tab" id="dlct-${c}" data-cat="${c}" aria-controls="dlcTiles" aria-selected="${!k}" tabindex="${k ? -1 : 0}">${t}<span class="dlcn" hidden></span></button>`).join('');
  box.querySelectorAll('input').forEach(x => { const k = keep.get(x.value); if (k) { x.checked = k[0]; x.disabled = k[1]; x.parentElement.classList.toggle('lock', k[2]); } });   // 地狱模式锁住的格子（hellTiles 加的 lock）切换语言重画后照样显示锁
  if (cat) dlcTab(cat); if (typeof dlcCounts === 'function') dlcCounts();
}
function dlcTab(c, focus) {
  const t = $('#dlcTiles'); t.dataset.cat = c; t.setAttribute('aria-labelledby', 'dlct-' + c);
  document.querySelectorAll('#dlcTabs [role=tab]').forEach(b => { const on = b.dataset.cat === c; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
}
renderDlcTiles();
$('#dlcTabs').addEventListener('click', e => { const b = e.target.closest('[role=tab]'); if (b) dlcTab(b.dataset.cat); });
$('#dlcTabs').addEventListener('keydown', e => { const bs = [...document.querySelectorAll('#dlcTabs [role=tab]')], k = bs.indexOf(document.activeElement), d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (k < 0 || !d) return; e.preventDefault(); dlcTab(bs[(k + d + bs.length) % bs.length].dataset.cat, true); });
$('#dlcTiles').addEventListener('change', dlcCounts);
$('#setup').addEventListener('input', setupSum); $('#setup').addEventListener('change', setupSum); setupSum();
// 底栏的「开始游戏」露出一半以上就给 hero 加 dup：手机上两组按钮常在同一屏；平板和矮屏手机首屏看不到底栏，hero 的按钮照常显示
if (window.IntersectionObserver) new IntersectionObserver(([e]) => $('#hero').classList.toggle('dup', e.intersectionRatio > .5), { threshold: [0, .5, 1] }).observe($('#startBtn'));
// 开局页的「继续上一局」：照存档写第几轮、谁在玩，限时局再写还剩多少；别的页面改了存档时也按这个重画
function resumeBtn() {
  let s = null;
  try { const raw = localStorage.getItem(KEY); if (raw) { s = JSON.parse(raw); if (s.layoutVer !== 2) { localStorage.removeItem(KEY); s = null; } } } catch (e) { s = null; }
  const left = s && s.endAt ? (s.leftMs != null ? s.leftMs : s.endAt - Date.now()) : null;
  $('#resume').innerHTML = s && Array.isArray(s.players) ? _tf(5165, "<div class=\"btns\" style=\"margin:0 0 10px\"><button class=\"pri\" data-act=\"resumeGame\">继续上一局（第 {$0} 轮 · {$1}{$2}）</button></div>{$3}", s.round, s.players.map(p => p.name).join(_t(349, "、")), left == null ? '' : left > 0 ? _tf(5162, " · 限时还剩 {$0}", fmtTime(left)) : _t(5163, " · 限时已到"), mpNames(s) ? _tf(5164, "<p class=\"muted\" style=\"margin:8px 0 0;font-size:13px\">上一局里 {$0} 是用自己的设备玩的。要他们接着来，先在下面「04 联机」创建房间，再点继续；他们拿新房间号、用局里的名字加入。</p>", mpNames(s)) : '') : '';
}
// 切换语言以后重画（__setLang 先把数据换成新语言的字，再调这里）：开局页的封面、DLC 卡片、「继续上一局」、设置摘要、玩家名字框；
// 对局里的棋盘、中间、侧栏；开着的查资料窗（图鉴、玩法这些）关掉，重新打开就是新语言。正在等你选的流程弹窗不动，选完以后就是新语言
// 作者寄语：封面「关于」那一行点开，一封航空信（红蓝斜纹边、邮票、邮戳）；Esc、点信外面、右上角的叉都能收起
const letterHtml = () => `<div class="lt-card"><button type="button" class="lt-x" data-act="closeLetter" aria-label="${_t(4286, "收起")}">×</button><div class="lt-stamp" aria-hidden="true">${awsImg('reinvent')}<span>UG</span></div><div class="lt-mark" aria-hidden="true">CLOUD TYCOON</div><h2 class="lt-h" id="ltT">${_t(5143, "作者寄语")}</h2><p>${_t(5166, "我曾经是个爱玩的孩子。儿时和小伙伴围在一起玩经典地产类桌游：大家去买地、收租金，最后按照资产的高低分出输赢，简单又热闹。从那以后，便一直念念不忘。")}</p><p>${_t(5167, "后来在亚马逊云科技的生态里，我也玩过不少有趣的作品，比如 BuildCards，但玩过之后总觉得少了点什么：作为专业的云从业者，我们需要更有深度的玩法，也需要更好、更复杂的规则。")}</p><p>${_t(5168, "二十年后的某个夜晚，我忽然有了这样的灵感：参考一部分经典地产类桌游的规则，再做一些延伸，把自己对亚马逊云科技的了解和架构知识，通过游戏的方式传播出去，让大家在玩的同时，轻松学到云架构知识；而且要本土化，做一款我们自己的游戏。于是便有了「云上大亨」。")}</p><p>${_t(5169, "云上大亨借鉴了经典地产类桌游的那份轻松；我又用自己所学的知识和积累，加进了云服务、架构、账单和故障这些真实的元素，做了很多技术方面的升级和创新，让它不只是一个游戏，更是一个能在玩中学的地方。在游戏里，你可以尽快熟悉、学习云服务的能力边界和典型用法，也可以把服务组成亚马逊云科技的架构，联合收取租金；如果想和 BuildCards 联动，还可以用 BuildCards 的卡片，把手上服务组成的架构摆出来。")}</p><p>${_t(5170, "也许在每一次和小伙伴的交锋中，在缅怀童年玩乐的同时，我们就不知不觉掌握了使用亚马逊云科技的能力。")}</p><p>${_t(5171, "一路走来，要感谢 UG 的各位小伙伴帮忙测试、做美工设计和修 bug：很多个夜晚，虫虫在线陪我一起测试游戏功能，找出里面的 bug、提需求，还承担了一部分美工；辣条提交了一大堆修复代码的 PR；Damo 架设了国内的服务器，降低了访问延迟；还有 Yuki，在开发前期就提出了很多优化建议。没有你们的帮助，这款游戏不可能这么快地上线和大家见面。")}</p><p>${_t(5172, "希望 User Group 能帮助更多的小伙伴快速上手亚马逊云科技，也希望你在这里，能找回小时候和小伙伴围在一起掷骰子的那份快乐。我的水平有限，难免有不周之处，还请多多包涵。")}</p><p class="lt-sign">${_t(5173, "—— User Group 云上大亨小组")}</p></div>`;
let LETTER_FROM = null;
function showLetter(from) {
  closeLetter(); LETTER_FROM = from || document.activeElement;
  const d = document.createElement('div'); d.id = 'letter'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'ltT');
  d.innerHTML = letterHtml(); document.body.appendChild(d);
  d.addEventListener('click', e => { if (e.target === d) closeLetter(); });
  d.querySelector('.lt-x').focus();
}
function closeLetter() { const d = document.getElementById('letter'); if (!d) return; d.remove(); if (LETTER_FROM && LETTER_FROM.focus) LETTER_FROM.focus(); LETTER_FROM = null; }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('letter')) { e.stopPropagation(); closeLetter(); } }, true);
function rerenderLang() {
  if (document.getElementById('letter')) showLetter(LETTER_FROM);   // 信开着的话换成新语言
  try { renderHero(); renderDlcTiles(); renderNames(); resumeBtn(); setupSum(); } catch (e) { console.warn(e); }
  if (viewOpen()) { const b = $('#vmodal .btns button.pri') || $('#vmodal .btns button'); if (b) b.click(); }
  if (BOSS.on) { toggleBoss(false); toggleBoss(true); }
  if (S && S.players) render();
  toast({ zh: _t(5174, "已切换到简体中文"), en: 'Switched to English', ja: _t(5175, "日本語に切り替えました") }[LANG] || LANG);
}
__setLangHook(rerenderLang);   // 多语言运行时切换语言后调它
// 上一局里用自己设备玩的人（存档里的名字已经转义过）：继续上一局前提醒房主先建房间
const mpNames = s => (s.mpSeats || []).filter(k => s.players[k]).map(k => s.players[k].name).join(_t(349, "、"));
if (SIM) simMain();
else if (BOT) botMain();
else if (DEMO) demo(DEMO);
else {
  resumeBtn();
  setupRestore();   // 从「再来一局」「新游戏」回来的：填回上一局的开局设置（?ug=1 的一键开局在后面，照样盖过它）
  // ?ug=1：活动现场打开就开局。开完把 ug 从地址栏去掉（别的参数留着）：误按刷新、手机回收标签页再加载时回到开局页点「继续上一局」，不会又自动开一局把存档盖掉
  if (new URLSearchParams(location.search).get('ug')) { ugPreset(); try { const u = new URL(location.href); u.searchParams.delete('ug'); history.replaceState(null, '', u); } catch (e) { } }
}
// 别的页面存了档：这边正在打的停下、不再存（staleTab），停在开局页的把「继续上一局」改成最新的。
// storage 事件只发给别的页面；被冻结、从往返缓存恢复的页面可能收不到，save() 里还会再对一次版本号
addEventListener('storage', e => {
  if (BOT || DEMO || (e.key !== REV_KEY && e.key !== KEY && e.key !== null)) return;
  if ($('#game').hidden) resumeBtn();
  else if (e.key === REV_KEY && e.newValue && S && S.players && !S.over && MP.role !== 'client' && +e.newValue !== MY_REV) staleTab();
});
