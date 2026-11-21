import { __rv, _t, _tf, _tr } from '../core/01-i18n-runtime.js';
import { BOT, SIM, rnd } from '../core/02-util.js';
import { UI } from '../core/02b-ui-port.js';
import { BAL, CAP_MAX, GRP, IX, N, SQ, TOKEN, capU, grpGap, grpN, isInst, lvName, upCost } from '../rules/03-services.js';
import { INC, REI, roleOf, rsBuyRate, rsRate } from '../rules/04-roles-combos-cards.js';
import { dlcOn, fisCost, flyTo } from '../rules/05-dlc.js';
import { qPoolS } from '../rules/06-qbank.js';
import { F, P, S, active, availCard, cur, hasCombo, log, nm, ownedBy, owns, ownsGroup, singleAZ, sqn } from './07-state.js';
import { credit, pay, withGain } from './08-money.js';
import { SPOT_OK, netWorth, reqRate } from './08c-costs.js';
import { addCap, baseRent, bringOnline, buyPaid, capCost, capInfo, doUpgrade, jointRent, roleDisc, tokUnit, turnKey, upPaidSum, upgradeInfo, zhe } from './09-rent.js';
import { capUpTxt, lvUpTxt } from './11b-rent-info.js';
import { quiz } from './12-quiz.js';
import { goReiCards, sendToJail } from './13-move.js';
import { drawRei } from './16-deck.js';
import { drawIncident, incident, skipOrPay } from './17-health.js';
import { drawReinvent } from './18-reinvent.js';
import { raiseValue } from './20-bankrupt.js';
import { manage } from './23-manage.js';
import { ST, evt } from './26b-retro.js';
import { blindBox, hx, isHidden, withCardMul } from '../rules/35-modes.js';
import { isAI } from './36-ai.js';
import { MP } from '../net/40-host-sync.js';
import { fxAll, fxCast, fxPot, sfxAll } from '../net/41-replay.js';
// ================= 落点 =================
export async function land(p, opts = {}) { const prev = S.histSq; S.histSq = p.pos; let r; try { r = await withCardMul(0, () => land0(p, opts)); } finally { S.histSq = prev; } await goReiCards(p); return r; }
async function land0(p, opts = {}) {
  const i = p.pos, s = SQ[i];
  S.lastSq = i; if (!BOT && !SIM) fxAll({ sq: [i, 'fx-land', 900] });
  switch (s.t) {
    case 'prop': case 'util': {
      if (isHidden(i)) { await blindBox(p); break; }
      const pr = S.props[i];
      if (pr.owner === null) { if (opts.noBuy) log(_tf(2942, "{$0} 同色跳到 {$1}，跳过去不能买", nm(p), sqn(i))); else await offerBuy(p, i, opts); }
      else if (pr.owner !== p.id) { if (pr.offline) await offlineTakeover(p, i); else if (!(await spotTakeover(p, i)) && !(await buyFromReseller(p, i))) await payRent(p, i); }
      // 自己落到自己下线的那一格：免费拉起来（不用等满 3 轮），这一格这回合就不再升级、不同色跳
      else if (pr.offline) { bringOnline(p, i); UI.render(); }
      else { const r = await offerLandingUpgrade(p, i, !opts.noJump), j = r === 'jump' && jumpInfo(p, i); if (j) await doJump(p, j.t); else if (r === 'did' && !opts.noJump) await colorJump(p, i); }
      break;
    }
    case 'jail': if (p.jail === null) await skipOrPay(p, _t(2943, "赶上维护窗口"), 50, _t(2944, "换个时间窗口维护")); break;
    case 'tax': await tax(p, 200, true); break;
    case 'tax2': { let a = active(p, IX.vpc) && S.props[IX.vpc].level >= 1 ? 200 : 100; if (p.role === 'ecom') { a *= 2; log(_t(2945, "跨境电商：NAT 账单交双倍")); } await tax(p, a, false); break; }
    case 'inc': await drawIncident(p); break;
    case 'rei': await drawReinvent(p); break;
    case 'free': {
      // 停在上面二选一：抽奖池（最少 $100，奖池不够亚马逊云科技补齐），或抽 3 张 re:Invent 卡选一张（11-08 起各模式都是三选一）；经过只领 $50
      if (!BOT && !SIM) { fxCast('ug', { p: p.id, i }); await UI.FX.ug(p, i); }   // FX.ug 自己判能不能播，事件照样发
      const hi = Math.max(100, S.pot);
      const nz = _t(2946, "三");
      const v = await UI.ask({ title: _tf(2947, "{$0} 参加 User Group 活动", p.name), html: _tf(2951, "<p>二选一：</p><p>· <b>抽奖</b>：{$0}<br>· <b>抽{$1}张 re:Invent 卡，选一张用</b></p><p class=\"muted\">经过 UG 活动（没停在上面）的领取 $50。</p>", hi > 100 ? _tf(2948, "随机拿 $100～${$0}。奖池现在 ${$1}，运气好整个拿走", hi, S.pot) : _tf(2950, "拿 $100（奖池现在 ${$0}{$1}）。奖池超过 $100 以后，抽奖改成随机拿 $100～整个奖池", S.pot, S.pot < 100 ? _t(2949, "，不够的部分亚马逊云科技补上") : ''), nz),
        buttons: [{ label: hi > 100 ? _tf(2952, "抽奖 $100～${$0}", hi) : _t(2953, "抽奖拿 $100"), value: 'pot', cls: 'pri' }, { label: _tf(2954, "抽{$0}张 re:Invent 卡选一张", nz), value: 'rei' }] });
      if (v === 'pot') {
        sfxAll('magic');
        const a = 100 + rnd(hi - 100 + 1), fromPot = Math.min(a, S.pot);
        if (fromPot) fxPot(p, Math.min(22, 6 + Math.round(fromPot / 40)));
        S.pot -= fromPot; credit(p, a, 'other');
        log(_tf(2958, "👥 {$0} 在 User Group 活动抽奖，拿到 ${$1}{$2}{$3}", nm(p), a, a > fromPot ? _tf(2955, "（奖池出 ${$0}，亚马逊云科技补 ${$1}）", fromPot, a - fromPot) : '', S.pot ? _tf(2956, "，奖池还剩 ${$0}", S.pot) : _t(2957, "，奖池被拿空了")));
      } else {
        const draws = []; for (let k = 0; k < 3; k++) draws.push(await drawRei());
        const pickId = await UI.ask({ who: p.id, title: _tf(2959, "{$0} 在 User Group 活动抽了 {$1} 张 re:Invent 卡，选一张", p.name, draws.length), html: _t(2960, "<p>选一张用，其余放回牌堆底。</p>"), cls: 'quiz', buttons: draws.map(x => ({ label: _tf(2961, "#{$0}「{$1}」：{$2}", x, REI[x].n, REI[x].e.replace(_tr(2747, "^保留：", ""), '')), value: x, disabled: x === 4 && p.role === 'fin' && draws.some(y => y !== 4) })) });
        draws.filter(x => x !== pickId).forEach(x => S.rei.push(x));
        log(_tf(2962, "👥 {$0} 在 User Group 活动抽 {$1} 张 re:Invent 卡，选了「{$2}」", nm(p), draws.length, REI[pickId].n));
        await drawReinvent(p, pickId);
      }
      break;
    }
    case 'gotojail':
      log(_tf(2963, "🔑 {$0} 的 Root 密钥泄露了", nm(p))); await sendToJail(p, 'sec', _t(2964, "Root 密钥泄露：Root 用户的访问密钥落到了别人手里，得先停下来删掉密钥、查 CloudTrail 看它被拿去做了什么。"));
      break;
  }
}
// FIS 能注入的故障：价钱按难扛程度定
let FIS = __rv(() => ([
  { n: _t(2965, "注入 API 限流错误"), cost: 40, inc: 1 },
  { n: _t(2966, "断开依赖服务的网络"), cost: 40, inc: 9 },
  { n: _t(2967, "停止 EC2 实例"), cost: 60, inc: 17 },
  { n: _t(2968, "终止实例"), cost: 60, inc: 11 },
  { n: _t(2969, "模拟 AZ 断电"), cost: 100, inc: 16 },
]), v => { FIS = v; }, () => FIS);
// 同色跳（像飞行棋）：落在自己的服务上，可以飞到下一块同色服务，结算那一格；只跳一次，不连跳
// 同色跳的目标：下一块同色服务，没有能跳的返回 null（colorJump 和落地窗里的「什么都不做，同色跳」共用）
function jumpInfo(p, i) {
  const g = SQ[i].g; if (!g || !p.alive || p.jail !== null) return null;
  const list = GRP(g).filter(k => k !== i && !isHidden(k)); if (!list.length) return null;
  const t = list.map(k => [k, (k - i + N) % N]).sort((a, b) => a[1] - b[1])[0][0], dist = (t - i + N) % N;
  const pr = S.props[t], whose = pr.owner === null ? _t(2970, "没人买，但跳过去不能买") : pr.owner === p.id ? _t(2971, "你自己的") : _tf(2972, "{$0} 的，要付过路费", P(pr.owner).name);
  return { t, g, dist, whose, note: `${i + dist >= N ? _t(2973, "，会经过 Startup 扶持") : ''}${(IX.free - i + N) % N < dist ? _t(2974, "，路过 User Group 活动领 $50") : ''}` };
}
const doJump = async (p, t) => { await flyTo(p, t, _t(2975, "同色跳，")); await land(p, { noJump: true, noBuy: true }); };
async function colorJump(p, i) {
  const j = jumpInfo(p, i); if (!j) return;
  const v = await UI.ask({ who: p.id, title: _tf(2976, "同色跳：飞到下一块{$0}{$1}服务？", grpGap(j.g), grpN(j.g)), html: _tf(2977, "<p>下一块同色服务是 <b>{$0}</b>（{$1}），往前 {$2} 格{$3}。跳过去就结算那一格：别人的要付过路费，自己的可以再升级，没人买的不能买。</p>", SQ[j.t].n, j.whose, j.dist, j.note), buttons: [{ label: _tf(2978, "跳到 {$0}", SQ[j.t].n), value: true, cls: 'pri' }, { label: _t(2979, "不跳"), value: false }] });
  if (v) await doJump(p, j.t);
}
// canJump：这次还能同色跳。「什么都不做」拆成「同色跳过去」和「也不跳」两个按钮，省一个窗；返回 'jump' / 'no'，做了升级、加容量、FIS 返回 'did'
//（这时现金变了，再单独问跳不跳，免得提前定下要去别人那格付过路费）
// 落在自己的服务上能做一件事（升一级 / 加容量 / FIS）：落地弹窗里没做，这一回合还停在这块上时，中间右栏的「升级」「加容量」照样能做这一件
export const landHere = p => { const a = S && S.landAct; return a && !a.used && a.k === turnKey() && a.p === p.id && p.pos === a.i && owns(p, a.i) ? a.i : null; };   // 阶段不在这里查：uiAction 执行时已经把阶段改成 busy 了，右栏那一行自己只在 post 时显示
export function upHere() {
  const p = cur(), i = landHere(p); if (i == null) return void UI.toast(_t(2980, "要停在自己的服务上，才能升级这一块"));
  const u = upgradeInfo(p, i, true); if (!u.ok || p.cash < u.total) return void UI.toast(u.ok ? _tf(2981, "现金不够 ${$0}", u.total) : u.why || _t(2982, "这块不能再升了"));
  doUpgrade(p, i, true); S.landAct.used = true; UI.render();
}
export function capHere() {
  const p = cur(), i = landHere(p); if (i == null) return void UI.toast(_t(2983, "要停在自己的服务上，才能给这一块加容量"));
  const c = capInfo(p, i); if (!c.ok || p.cash < c.cost) return void UI.toast(c.ok ? _tf(2981, "现金不够 ${$0}", c.cost) : c.why || _t(2984, "这块不能再加容量"));
  addCap(p, i); S.landAct.used = true; UI.render();
}
export async function offerLandingUpgrade(p, i, canJump = false) {
  S.landAct = { k: turnKey(), i, p: p.id, used: false };
  const u = upgradeInfo(p, i, true), c = capInfo(p, i);
  const foes = S.players.filter(q => q.alive && q.id !== p.id);
  const s = SQ[i], b = [];
  let html = _t(2985, "<p>落在自己的服务上，可以做一件事：</p>");
  if (u.ok) {
    const next = s.upg[u.next - 1];
    const base = upCost(i, u.next), why = [...u.fees.map(f => `${f.why} +$${f.amt}`), F.debt() && p.techDebt >= 2 && !(s.k === 'ec2' && s.upg[u.next - 1][2] === 'cost' && p.gravFree) ? _t(2986, "技术债攒到 2 个 +$50") : '', u.off].filter(Boolean);
    b.push({ label: _tf(2987, "升到第 {$0} 级「{$1}」${$2}", u.next, next[0], u.total), desc: `${next[3] ? next[3] + _t(2988, "。") : ''}${lvUpTxt(i, u.next)}${u.total !== base ? _tf(2991, "。基础价 ${$0}，这次{$1}", base, why.length ? _tf(2989, "：{$0}", why.join(_t(408, "；"))) : _t(2990, "价格不同")) : ''}`, value: 'up', cls: 'pri', disabled: p.cash < u.total });
  } else if (u.why) html += _tf(2992, "<p class=\"muted\">不能加功能：{$0}</p>", u.why);
  if (c.ok) {
    b.push({ label: _tf(2993, "加 1 个{$0} ${$1}", capU(s.k), c.cost), desc: _tf(2994, "这是容量，不是升级：{$0}（现在 {$1}/{$2} 个）", capUpTxt(i), S.props[i].cap || 0, CAP_MAX), value: 'cap', disabled: p.cash < c.cost });
  }
  if (foes.length) {
    b.push({ label: _tf(2995, "用 FIS 抽故障牌攻击对手（${$0}～${$1}）", Math.min(...FIS.map(fisCost)), Math.max(...FIS.map(fisCost))), desc: _tf(2996, "选一位对手，从 FIS 故障牌里随机抽一张，抽到哪张付哪张的钱；要先有 ${$0} 现金", Math.max(...FIS.map(fisCost))), value: 'fis', disabled: p.cash < Math.max(...FIS.map(fisCost)) });
  }
  const j = canJump ? jumpInfo(p, i) : null;
  if (j) {
    b.push({ label: _tf(2997, "什么都不做，同色跳到 {$0}", SQ[j.t].n), desc: _tf(2998, "{$0}，往前 {$1} 格{$2}", j.whose, j.dist, j.note), value: 'jump' }, { label: _t(2999, "什么都不做，也不跳"), value: 'no' });
    html += _tf(3000, "<p class=\"muted\">同色跳：飞到下一块{$0}{$1}服务，结算那一格（别人的要付过路费，自己的可以再升级，没人买的不能买）。先升级、加容量或用 FIS 的话，做完再问一次跳不跳。</p>", grpGap(j.g), grpN(j.g));
  } else b.push({ label: _t(3001, "先不加，什么都不做"), value: 'no' });
  const v = await UI.ask({ title: _tf(3002, "{$0} 落在自己的 {$1} 上（现金 ${$2}）", p.name, s.n, p.cash), html, buttons: b, cls: 'quiz' });
  if (v === 'jump' || v === 'no') return v;
  S.landAct.used = true;
  if (v === 'up') doUpgrade(p, i, true);
  else if (v === 'cap') addCap(p, i);
  else if (v === 'fis') {
    const t = foes.length === 1 ? foes[0].id : await UI.ask({ title: _t(3003, "用 FIS 给谁注入故障？"), html: _tf(3004, "<p>先选对手，再从 FIS 故障牌里抽一张：{$0}。抽到哪张就付哪张的钱，对手当场承受。</p>", FIS.map(x => `${x.n} $${fisCost(x)}`).join(_t(349, "、"))), buttons: foes.map(q => ({ label: q.name, value: q.id })).concat([{ label: _t(3005, "算了"), value: -1 }]) });
    if (t < 0) { S.landAct.used = false; return 'did'; }   // 算了：这次落地的动作还没用掉，升级、加容量照样能做
    const f = rnd(FIS.length);
    UI.dealSfx('fis'); setTimeout(() => UI.FX.dealIn(), 0);
    await UI.ask({ title: _tf(3006, "{$0} 抽到 FIS 故障牌", p.name), html: UI.dealHtml('fis', UI.pcardHtml('fis', _tf(3007, "FIS 故障注入 · ${$0}", fisCost(FIS[f])), 'cloudwatch', FIS[f].n, _tf(3008, "{$0} 承受「{$1}」", nm(P(t)), INC[FIS[f].inc].n), '', _t(3009, "混沌工程：主动注入故障，提前发现系统哪里扛不住"))), buttons: [{ label: _tf(3010, "付 ${$0}，注入", fisCost(FIS[f])), value: true, cls: 'pri' }] });
    ST(p).spendMisc = (ST(p).spendMisc || 0) + pay(p, 'bank', fisCost(FIS[f])); ST(p).fis++;
    log(_tf(3011, "🧪 {$0} 花 ${$1} 用 FIS 给 {$2} 注入「{$3}」", nm(p), fisCost(FIS[f]), nm(P(t)), FIS[f].n));
    const a0 = MP.actor; MP.actor = t;
    try { await UI.showCard('inc', FIS[f].inc, P(t)); await withGain('card', () => incident(P(t), FIS[f].inc)); } finally { MP.actor = a0; }
  }
  return 'did';
}
async function offerBuy(p, i, opts = {}) {
  const s = SQ[i], rd = roleDisc(p, i);
  let quizTried = false, quizOk = false, qres = '';   // qres：刚答完的题的结果，放在买地窗顶上
  for (;;) {
    // 答题折扣和所有折扣相乘（折上折）：角色折扣、卡牌折扣、购买券、MAP 卡。
    // 独立开发者开了边玩边答题 7 折（别人 8 折）；没开时只有他能答，而且什么服务都能打折，7 折太强（电脑真去答以后 15 轮局胜率 46%），所以是 9 折
    const qd = p.role === 'indie' ? (S.cfg.learn ? 0.7 : 0.9) : 0.8, canQ = S.cfg.learn || p.role === 'indie', qm = quizOk ? qd : 1;
    const base = Math.round(s.p * rd * (opts.discount || 1) * (p.buyCoupon || 1) * qm);
    // Spot 最低出价比例：按钮和下面的说明共用这一个数（游戏工作室非地狱局、手上有 Spot 卡都是 10%）；放在循环里，凑钱回来再算一次
    const spotR = p.role === 'fin' ? 0.4 : availCard(p, 'SPOT') || (p.role === 'game' && !hx('game')) ? 0.1 : 0.2;
    const b = [{ label: quizOk ? _tf(3012, "答对 {$0} 按需购买 ${$1}", zhe(qd), base) : _tf(3013, "按需购买 ${$0}", base), value: { k: quizOk ? 'q' : 'buy', price: base }, cls: 'pri', disabled: p.cash < base }];
    if (canQ && !quizTried) b.push({ label: _tf(3014, "答题争取 {$0}（和其他折扣叠加）", zhe(qd)), value: { k: 'quiz' } });
    if (!opts.discount) {
      if (SPOT_OK.has(s.k)) { const mn = Math.round(s.p * spotR); b.push({ label: _tf(3015, "Spot 购买（自己出价，最低 ${$0}）", mn), value: { k: 'spot', min: mn }, disabled: p.cash < mn }); }
      if (availCard(p, 'MAP') && s.t === 'prop' && isInst(i)) { const x = Math.round(s.p * rd * 0.7 * (p.buyCoupon || 1) * qm); b.push({ label: _tf(3016, "用 MAP 卡 ${$0}", x), value: { k: 'map', price: x }, disabled: p.cash < x }); }
    }
    if (p.cash < base && ownedBy(p).length) b.push({ label: _t(3017, "先去资产管理凑钱"), value: { k: 'raise' } });
    b.push({ label: _t(1599, "不买"), value: { k: 'no' } });
    const notes = [];
    if (rd < 1) notes.push(_tf(3018, "角色折扣 {$0}已计入", zhe(rd)));
    if (opts.discount) notes.push(_tf(3019, "卡牌折扣 {$0}已计入", zhe(opts.discount)));
    if (!opts.discount && SPOT_OK.has(s.k)) notes.push(_tf(3021, "Spot 购买自己出价（最低原价的 {$0}%{$1}），出得越低越容易被抢：别人比你多出原价的 10% 就能抢走；以后在资产管理里补差价就能转成按需", Math.round(spotR * 100), p.role === 'fin' ? _t(3020, "，金融合规公司风控要求更高") : ''));
    const v = await UI.ask({ aiMin: true, hold: qres ? 300 : 0, title: _tf(3022, "{$0} 落在 {$1}（现金 ${$2}）", p.name, s.n, p.cash), html: qres + UI.propInfoHtml(i, true) + (notes.length ? `<p class="muted">${notes.join(_t(408, "；"))}</p>` : ''), buttons: b });
    if (v.k === 'raise') { await manage(p); UI.render(); continue; }
    // 后面紧接着就是买地窗：答题结果放在它顶上，省一个只有「继续」的窗
    if (v.k === 'quiz') { quizTried = true; ({ ok: quizOk, html: qres } = await quiz(qPoolS(s), _tf(3023, "答对可以打 {$0}买", zhe(qd)), { inline: true })); continue; }
    if (v.k === 'no') { log(_tf(3024, "{$0} 没买 {$1}", nm(p), sqn(i))); return; }   // 不买就是不买：不再拿出来让别人竞价（11-06 起）
    const coupon = v.k !== 'spot';   // Spot 出价不打券；出到全价转成按需时也没打，券要留着
    if (v.k === 'spot') {
      const r = await UI.modal({ title: _tf(3025, "Spot 出价：{$0}（原价 ${$1}）", s.n, s.p), html: `<p>${_tf(3026, "出价越低越便宜。<b>别人看不到你出了多少</b>：落到这里的人只能自己猜，猜的价比你多出原价的 10%（${$0}）以上才抢得走，猜低了就照常付你过路费。出到全价就等于按需购买，没人能抢。", Math.round(s.p * 0.1))}</p><p class="muted">${_t(3027, "同一台电脑上轮流玩的话，出价时请别人先别看屏幕。")}</p><p class="muted">${_t(3028, "被抢时退回你出价的一半。现实里 Spot 已经不用竞价，被收回前只提前 2 分钟通知；游戏用出价模拟「可能被收回」。")}</p>`, inputs: [{ id: 'bid', label: _tf(3029, "出价 $（${$0}–${$1}）", v.min, Math.min(s.p, p.cash)), type: 'number', min: v.min, max: Math.min(s.p, p.cash), step: 10, value: Math.min(Math.max(v.min, Math.round(s.p * 0.5)), p.cash), af: true }], buttons: [{ label: _t(3030, "出价买下"), value: 'ok', cls: 'pri' }, { label: _t(3031, "返回"), value: 'x' }] });
      if (r.v !== 'ok') continue;
      const bid = Math.max(v.min, Math.min(r.inp.bid || v.min, s.p, p.cash));
      if (availCard(p, 'SPOT')) availCard(p, 'SPOT').used = true;
      v.price = bid;
      if (bid >= s.p) v.k = 'buy';
    }
    if (v.k === 'map') availCard(p, 'MAP').used = true;
    pay(p, 'bank', v.price); sfxAll('buy'); ST(p).buy++; ST(p).spendBuy = (ST(p).spendBuy || 0) + v.price; if (p.buyCoupon && coupon) { p.buyCoupon = 0; log(_tf(3032, "{$0} 用掉了 9 折购买券", nm(p))); }
    S.props[i].owner = p.id; S.props[i].paid = v.price;
    if (v.k === 'spot') { S.props[i].spot = true; S.props[i].spotPaid = v.price; }
    log(`🏷️ ${nm(p)} ${v.k === 'spot' ? _t(3033, "用 Spot 出价买下") : _tf(3034, "花 ${$0} 买下", v.price)} ${sqn(i)}${s.t === 'prop' && singleAZ(i) ? _t(3035, "（单 AZ）") : ''}`);
    return;
  }
}
async function offlineTakeover(p, i) {
  const s = SQ[i], pr = S.props[i], o = P(pr.owner);
  const v = await UI.ask({ title: _tf(3036, "{$0} 已经被 {$1} 下线了", s.n, o.name), html: _tf(3037, "<p>下线期间不收过路费。你可以付原价 ${$0} 给亚马逊云科技，把它重新拉起来、归你（{$1} 下线时已经拿回过一半，这次不再给钱）。</p>", s.p, nm(o)),
    buttons: [{ label: _tf(3038, "付 ${$0} 拉起来归我", s.p), value: 'take', cls: 'pri', disabled: p.cash < s.p }, { label: _t(3039, "不管它"), value: 'no' }] });
  if (v !== 'take' || p.cash < s.p) { log(_tf(3040, "{$0} 已下线，{$1} 不用付过路费", sqn(i), nm(p))); return; }
  ST(p).spendBuy = (ST(p).spendBuy || 0) + pay(p, 'bank', s.p);   // 复盘里算「买服务」
  S.props[i] = { owner: p.id, level: 0, cap: 0, spot: false, spotPaid: 0, impaired: false, offline: 0, offCash: 0 };
  log(_tf(3041, "🔁 {$0} 付 ${$1} 把 {$2} 下线的 {$3} 重新拉起来，归自己", nm(p), s.p, nm(o), sqn(i)));
}
// 代理商模式：客户落在代理商的库存（代理商自己占的地）上，可以按代理商定的转售价从他手里买下，升级和容量按代理商实付另算；
// 之后这块每圈的运行费交给代理商，代理商按进货价交亚马逊云科技赚差价。不买就照常结算：代理商的地只在组成有效架构时收过路费
async function buyFromReseller(p, i) {
  const pr = S.props[i], s = SQ[i], r = P(pr.owner);
  if (!dlcOn('reseller') || !r.reseller || p.reseller || pr.via != null || pr.offline || pr.ddos != null || !['prop', 'util'].includes(s.t)) return false;
  if (BAL.rsKeepCombo && jointRent(i, 7)) return false;
  if (BAL.rsKeepGroup && (ownsGroup(r, s.g) || pr.level > 0)) return false;   // 整组和升过级的也是代理商在用的，不卖
  const extra = upPaidSum(i) + (pr.cap || 0) * capCost(i), base = Math.round(s.p * rsRate(r) * (p.rsCoupon || 1)), x = base + extra, cost = buyPaid(i);
  // 答题照样折上折：答对在转售价上再打 8 折（独立开发者开了边玩边答题 7 折、没开 9 折），少收的是代理商让的利
  const qd = p.role === 'indie' ? (S.cfg.learn ? 0.7 : 0.9) : 0.8, canQ = S.cfg.learn || p.role === 'indie';
  let tried = false, ok = false, v, qres = '';
  for (;;) {
    const px = ok ? Math.round(base * qd) + extra : x;
    v = await UI.ask({ who: p.id, aiMin: true, hold: qres ? 300 : 0, title: _tf(3042, "{$0} 落在 {$1} 的 {$2}（现金 ${$3}）", p.name, r.name, s.n, p.cash), html: qres + UI.propInfoHtml(i, true) + `<p>${_tf(3044, "这块是代理商 {$0} 的库存。可以按 {$1} 定的转售价（{$2}）从他手里买下{$3}；以后这块每圈的运行费交给 {$4}。不买就照常结算：代理商的地只在组成有效架构时收过路费。", nm(r), nm(r), rsRate(r) === 1 ? _t(1512, "原价") : zhe(rsRate(r)), extra ? _tf(3043, "，升级和容量按他实付的 ${$0} 另算", extra) : '', nm(r))}</p>`, buttons: [{ label: _tf(3047, "从 {$0} 手里买下 ${$1}{$2}{$3}", r.name, px, ok ? _tf(3045, "（答对 {$0}）", zhe(qd)) : '', p.rsCoupon ? _t(3046, "（含 Startup 折扣）") : ''), value: px, cls: 'pri', disabled: p.cash < px }, ...(canQ && !tried ? [{ label: _tf(3048, "答题争取 {$0}（和转售价叠加）", zhe(qd)), value: 'quiz' }] : []), { label: _t(3049, "不买，照常结算"), value: false }] });
    if (v === 'quiz') { tried = true; ({ ok, html: qres } = await quiz(qPoolS(s), _tf(3050, "答对从代理商手里买再打 {$0}", zhe(qd)), { inline: true })); continue; }
    break;
  }
  if (!v) return false;
  const paidBase = v - extra;
  pay(p, r, v); sfxAll('buy'); ST(p).buy++; ST(p).spendBuy = (ST(p).spendBuy || 0) + v; ST(p).viaP = (ST(p).viaP || 0) + v;
  Object.assign(pr, { owner: p.id, paid: paidBase, via: r.id, spot: false, spotPaid: 0 });
  if (p.rsCoupon) { p.rsCoupon = 0; log(_tf(3051, "{$0} 用掉了 Startup 代理商折扣", nm(p))); }
  log(_tf(3052, "🤝 {$0} 从代理商 {$1} 手里花 ${$2} 买下 {$3}；{$4} 当初按进货价拿货花了 ${$5}，赚差价 ${$6}。以后这块的运行费交给 {$7}", nm(p), nm(r), v, sqn(i), nm(r), cost, paidBase - cost, nm(r)));
  return true;
}
async function spotTakeover(p, i) {
  const s = SQ[i], pr = S.props[i], o = P(pr.owner);
  if (!pr.spot) return false;
  // 主人出了多少不给看，落上来的人靠猜：猜的价比主人的出价多出原价的 10% 以上才抢得走（金融合规公司风控要求最低原价的 40%），猜低了照常付过路费，出价不扣钱
  const finMin = p.role === 'fin' ? Math.round(s.p * 0.4) : 0;
  const need = Math.min(s.p, Math.max(finMin, (pr.spotPaid || 0) + Math.max(10, Math.round(s.p * 0.1))));
  const floor = Math.min(s.p, Math.max(finMin, Math.round(s.p * 0.2)));
  if (p.cash < floor) return false;   // 连最低价都出不起：照常付过路费
  const dice = S.lastDice[0] + S.lastDice[1], jr = jointRent(i, dice), rent = rsAdj(o, jr, jr ? jr.tot : baseRent(i, dice)).r;   // 组成架构时按联合收费算、代理商的库存按 rsAdj 调，和实际付的一致（角色技能、卡牌加成另算）
  const top = Math.min(s.p, p.cash);
  const r = await UI.modal({ title: _tf(3053, "出价抢 {$0} 的 Spot 服务 {$1}？", o.name, s.n), html: `<p>${_tf(3055, "{$0} 当时出了多少，<b>只有他自己知道</b>。你猜一个价：比他的出价多出原价的 10%（${$1}）以上就抢过来，按你出的价付钱；猜低了抢不到，这次照常付过路费（约 ${$2}{$3}），出价不扣钱。出到全价 ${$4} 一定抢得到，变成你的按需服务，没人能再抢。", nm(o), Math.round(s.p * 0.1), rent, jr ? _tf(3054, "，{$0}架构联合收费", jr.cs.map(c => _tf(2766, "「{$0}」", c.n)).join('')) : '', s.p)}</p><p class="muted">${_tf(3056, "被抢的 {$0} 拿回他出价的一半。", nm(o))}</p>`,
    inputs: [{ id: 'bid', label: _tf(3057, "你的出价 $（${$0}–${$1}）", floor, top), type: 'number', min: floor, max: top, step: 10, value: Math.min(top, Math.max(floor, Math.round(s.p * 0.5 / 10) * 10)) }],
    buttons: [{ label: _t(3058, "出价抢过来"), value: 'take', cls: 'pri' }, { label: _t(3059, "照常付过路费"), value: 'rent' }] });
  if (r.v !== 'take') return false;
  const bid = Math.max(floor, Math.min(r.inp.bid || floor, s.p, p.cash));
  if (bid < need) { log(_tf(3060, "{$0} 出价想抢 {$1} 的 Spot 服务 {$2}，没压过他的出价，照常付过路费", nm(p), nm(o), sqn(i))); if (!isAI(p.id)) UI.toast(_t(3061, "猜低了，没抢到：照常付过路费")); return false; }
  ST(p).spendBuy = (ST(p).spendBuy || 0) + pay(p, 'bank', bid);   // 复盘里算「买服务」
  const comp = Math.round((pr.spotPaid || 0) / 2); credit(o, comp, 'sell');
  pr.owner = p.id; pr.cap = 0; pr.impaired = false;
  pr.paid = bid; if (bid >= s.p) { pr.spot = false; pr.spotPaid = 0; } else { pr.spot = true; pr.spotPaid = bid; }
  log(_tf(3064, "⚡ {$0} 出更高的价抢走了 {$1} 的 Spot 服务 {$2}{$3}；{$4} 拿回出价的一半", nm(p), nm(o), sqn(i), pr.spot ? _t(3062, "（还是 Spot，别人还能接着抢）") : _t(3063, "，变成按需"), nm(o)));
  return true;
}
export const spotConvCost = i => Math.max(0, SQ[i].p - (S.props[i].spotPaid || 0)) + Math.round(SQ[i].p * 0.1);
export function convertSpot(p, i) {
  const pr = S.props[i]; if (!owns(p, i) || !pr.spot) return;
  const cost = spotConvCost(i);
  if (p.cash < cost) return;
  ST(p).spendBuy = (ST(p).spendBuy || 0) + pay(p, 'bank', cost); pr.spot = false; pr.spotPaid = 0; pr.paid = SQ[i].p;
  log(_tf(3065, "🔒 {$0} 补 ${$1} 把 {$2} 从 Spot 转成按需", nm(p), cost, sqn(i)));
}
// 代理商自己库存的过路费：没组成架构按 BAL.rsSolo 收（默认没设 = 不收，地狱模式 1 = 照常收），组成架构 ×BAL.rsComboMul（地狱模式 0 = 不翻倍）。
// 实际收费、悬停提示、服务面板、Spot 抢购弹窗都走这里，几处给出的数才一致
export function rsAdj(o, jr, r) {
  if (!o || !o.reseller) return { r, note: '' };
  if (jr) return BAL.rsComboMul ? { r: Math.round(r * BAL.rsComboMul), note: _tf(3066, "代理商的解决方案 ×{$0}", BAL.rsComboMul) } : { r, note: '' };
  if (!BAL.rsSolo) return { r: 0, note: _t(3067, "代理商的库存，没组成架构不收") };
  return BAL.rsSolo < 1 ? { r: Math.round(r * BAL.rsSolo), note: _tf(3068, "代理商的库存没组成架构，只收 {$0}%", Math.round(BAL.rsSolo * 100)) } : { r, note: '' };
}
// 服务面板「升级后 / 各级单块」那排单块数后面的说明：拿 $100 过一遍 rsAdj 看倍数，不再单写一遍规则
export function rsLvTag(o, jr) {
  const f = rsAdj(o, jr, 100).r / 100;
  return f === 1 ? '' : jr ? _tf(3069, "（联合收费再 ×{$0}）", f) : f ? _tf(3070, "（没组成架构只收 {$0}%）", Math.round(f * 100)) : _t(3071, "（组成架构后才收）");
}
async function payRent(p, i, opts = {}) {
  const pr = S.props[i], o = P(pr.owner), s = SQ[i];
  if (pr.impaired) { log(_tf(3072, "{$0} 是 Impaired 状态，这次不收过路费", sqn(i))); return 0; }
  if (pr.offline) { log(_tf(3073, "{$0} 已下线，这次不收过路费", sqn(i))); return 0; }
  if (pr.ddos != null) { log(_tf(3074, "{$0} 正被 DDoS 打到下线，这次不收过路费", sqn(i))); return 0; }
  const dice = S.lastDice[0] + S.lastDice[1];
  const jr = jointRent(i, dice);
  if (o.reseller && !jr && !BAL.rsSolo) { log(_tf(3075, "{$0} 是代理商 {$1} 自己的服务，没组成有效架构，这次不收过路费", sqn(i), nm(o))); return 0; }
  const ra = rsAdj(o, jr, jr ? jr.tot : baseRent(i, dice));
  let r = ra.r;
  const notes = ra.note ? [ra.note] : [];
  if (jr) notes.push(_tf(3078, "{$0}联合收费（{$1}）：{$2}", jr.cs.length > 1 ? _tf(3076, "{$0} 个架构串联", jr.cs.length) : _t(2607, "架构"), jr.cs.map(c => _tf(2766, "「{$0}」", c.n)).join(''), jr.parts.map(m => `${SQ[m].n} $${jr.rentOf(m)}${jr.half.includes(m) ? _t(3077, "（串联折半）") : ''}`).join(' + ')));
  if (s.bill === 'token' && !jr) notes.push(_tf(3079, "{$0} 点 × 每点 ${$1}（{$2} 单价 {$3}，已算整组和流量加成）", dice, tokUnit(i), lvName(i, pr.level), TOKEN[pr.level]));
  if (s.k === 'bedrock' && hasCombo(o, 'rag')) { r += 50; notes.push(_t(3080, "RAG 架构 +$50")); }
  if (opts.double) { r *= 2; notes.push(_t(3081, "双倍")); }
  if (o.rentBoost) { r *= o.rentBoost; notes.push(`${roleOf(o).sk.n} ×${o.rentBoost}`); }
  if (o.aiBoostTill >= S.round && s.g === 'ai') { r *= 2; notes.push(_t(3082, "生成式 AI 加速器 ×2")); }
  if (o.rent3Left > 0 && r > 0) { r *= 3; o.rent3Left--; notes.push(_tf(3083, "爆款上线 ×3（还剩 {$0} 笔）", o.rent3Left)); }
  if (o.role === 'rs_msp' && pr.via == null) { r = Math.round(r * 0.9); notes.push(_t(3084, "托管服务商自己的服务 9 折")); }
  if (i === IX.s3 && p.role === 'ai') { r *= 2; notes.push(_t(3085, "AI 原生双倍")); }
  // 新账户保护期每笔最多 $50：答对后的数也不低于 $50 时，答不答都一样，就不出这道题
  const protCap = F.balance() && S.round <= BAL.protect ? 50 : Infinity, qRate = p.role === 'indie' ? (!S.cfg.learn ? 0.8 : hx('indie') ? 0.5 : 0.35) : (BAL.quizRent ?? 0.5);
  if (r > 0 && (S.cfg.learn || p.role === 'indie') && Math.min(Math.round(r * qRate), protCap) < Math.min(r, protCap)) {
    if (await quiz(qPoolS(s), _tf(3090, "{$0} 考你一题：{$1}{$2}", o.name, r > protCap ? _tf(3086, "答对付 ${$0}，不答或答错付 ${$1}（新账户保护期每笔最多 $50）", Math.round(r * qRate), protCap) : _t(3087, "答对过路费"), r > protCap ? '' : _tf(3089, "{$0}（当前 ${$1}）", p.role === 'indie' ? _tf(3088, "只付 {$0}%", !S.cfg.learn ? 80 : hx('indie') ? 50 : 35) : (BAL.quizRent ?? 0.5) === 0.5 ? _t(2895, "减半") : _tf(3088, "只付 {$0}%", Math.round(BAL.quizRent * 100)), r)))) { const qr = BAL.quizRent ?? 0.5, ir = p.role === 'indie' ? (!S.cfg.learn ? 0.8 : hx('indie') ? 0.5 : 0.35) : 0; r = Math.round(r * (ir || qr)); notes.push(ir ? _tf(3091, "独立开发者答对只付 {$0}%", ir * 100) : qr === 0.5 ? _t(3092, "答对减半") : _tf(3093, "答对只付 {$0}%", Math.round(qr * 100))); }
  }
  if (F.balance() && S.round <= BAL.protect && r > 50) { r = 50; notes.push(_t(3094, "新账户保护期封顶 $50")); }
  if (r > 0) { ST(p).rentOut += r; ST(o).rentIn += r; ST(o).maxRent = Math.max(ST(o).maxRent, r); const eb = ST(o).earnBy, hb = ST(o).hitsBy; eb[i] = (eb[i] || 0) + r; hb[i] = (hb[i] || 0) + 1; }
  if (r >= 100) evt(_tf(3096, "{$0} 付给 {$1} 过路费 ${$2}（{$3}{$4}）", p.name, o.name, r, SQ[i].n, jr ? _tf(3095, " · {$0}{$1}联合收费", jr.cs.map(c => _tf(2766, "「{$0}」", c.n)).join(''), jr.cs.length > 1 ? _t(2767, "串联") : '') : ''), r);
  // 请求费按实际能收到的算：对方全卖了也付不起，就只按他付得起的部分交，免得收过路费的人反倒被请求费拖破产
  const canPay = Math.max(0, p.cash) + raiseValue(p), got = Math.min(r, canPay);
  if (got < r) notes.push(_tf(3097, "对方全卖了最多付 ${$0}，请求费按这个算", got));
  UI.rentFx({ i, from: p.pos, to: o.id, n: Math.min(14, 4 + Math.round(r / 80)), arcs: jr ? jr.groups : [], html: _tf(3100, "{$0} 付给 {$1} <b>${$2}</b>{$3}", p.name, o.name, r, jr ? `<small>${jr.cs.length > 1 ? _tf(3098, "{$0} 个架构串联收费：", jr.cs.length) : _t(3099, "架构联合收费：")}${jr.cs.map(c => c.n).join(' + ')}</small>` : '') }); pay(p, o, r, 'rent'); if (S.stats) { S.stats.rent += r; S.stats.rentN++; if (jr) S.stats.joint++; }
  const parts = jr ? jr.parts : [i];
  const rOf = m => jr ? jr.rentOf(m) : baseRent(m, dice), raw = parts.reduce((a, m) => a + rOf(m), 0) || 1;
  const feeOf = m => got * rOf(m) / raw * reqRate(m), fee = Math.round(parts.reduce((a, m) => a + feeOf(m), 0));
  if (fee > 0) {
    // 从代理商手里买的服务：请求费（这块服务的用量账单）和运行费一样交给代理商，代理商按进货价交亚马逊云科技，差价归他
    const viaR = m => { const v = S.props[m].via; return BAL.rsReqFee && v != null && v !== o.id && P(v).alive && P(v).reseller ? P(v) : null; };
    let left = fee; const toR = new Map();
    parts.forEach(m => { const rr = viaR(m); if (rr) toR.set(rr, (toR.get(rr) || 0) + feeOf(m)); });
    toR.forEach((x, rr) => { x = Math.min(left, Math.round(x)); if (x <= 0) return; left -= x; const c = Math.round(x * rsBuyRate(rr)), t = ST(o), a = pay(o, rr, x); t.spendReq = (t.spendReq || 0) + a; t.viaP = (t.viaP || 0) + a; pay(rr, 'bank', c); notes.push(_tf(3101, "其中请求费 ${$0} 交给代理商 {$1}（他按进货价交亚马逊云科技 ${$2}）", x, nm(rr), c)); });
    if (left > 0) ST(o).spendReq = (ST(o).spendReq || 0) + pay(o, 'bank', left);
  }
  // 渠道分成：从代理商手里买的服务每收一笔过路费，按 BAL.rsCut 分给当初卖它的代理商
  if (BAL.rsCut && got > 0) {
    const cut = new Map();
    parts.forEach(m => { const v = S.props[m].via; if (v != null && v !== o.id && P(v).alive && P(v).reseller) cut.set(P(v), (cut.get(P(v)) || 0) + got * rOf(m) / raw * BAL.rsCut); });
    cut.forEach((x, rr) => { x = Math.round(x); if (x > 0) { pay(o, rr, x); notes.push(_tf(3102, "渠道分成 ${$0} 给代理商 {$1}", x, nm(rr))); } });
  }
  log(_tf(3106, "💰 {$0} 付给 {$1} 过路费 ${$2}（{$3}{$4}）{$5}", nm(p), nm(o), r, sqn(i), notes.length ? _t(2698, "，") + notes.join(_t(2698, "，")) : '', fee > 0 ? _tf(3105, "；{$0} 付亚马逊云科技{$1} ${$2}，净赚 ${$3}", nm(o), s.bill === 'token' && !jr ? _t(3103, "token 成本") : _t(3104, "请求费"), fee, got - fee) : ''));
  return r;
}
async function tax(p, base, pctOpt) {
  let amt = base;
  const ce = availCard(p, 'CE'), ai = isAI(p.id);   // 只判断一次：中途换成电脑接管，前后不会一个说是真人、一个说是电脑，又多问一遍
  if (pctOpt) {
    const ten = Math.max(0, Math.round(netWorth(p) * 0.1));
    const mul = p.role === 'unicorn' ? 2 : 1;   // 独角兽账单格交双倍：按钮上直接写翻倍后的数
    // 手上有 Cost Explorer：免交和交多少放进同一个窗，不用先选完金额再问一次。10% 是 $0 时不放，免了也白免。
    // 按钮文字以「用掉」开头：模拟（simAct）按开头的关键词挑按钮，「用掉」排在「交 10%」前面
    const ceOpt = ce && ten > 0;
    amt = ai ? Math.min(200, ten) * mul : await UI.ask({ title: _tf(3107, "{$0}：忘关的 EC2", p.name), html: _tf(3110, "选择交 ${$0}，或交总资产的 10%{$1}{$2}。", 200 * mul, mul > 1 ? _t(3108, "（独角兽双倍）") : '', ceOpt ? _t(3109, "；也可以用掉 Cost Explorer 卡，这次不交") : ''), buttons: [...(ceOpt ? [{ label: _t(3111, "用掉 Cost Explorer，这次不交"), value: 'ce', cls: 'pri' }] : []), { label: _tf(3112, "交 ${$0}", 200 * mul), value: 200 * mul }, { label: _tf(3113, "交 10%（${$0}）", ten * mul), value: ten * mul }] });
    if (amt === 'ce') { ce.used = true; log(_tf(3114, "{$0} 用 Cost Explorer 免掉了 {$1}", nm(p), SQ[p.pos].n)); return; }
  }
  if (!pctOpt && p.role === 'unicorn') amt *= 2;
  if (ce && amt > 0 && (ai || !pctOpt)) {   // 电脑、没有 10% 选项的账单格（NAT Gateway 账单）照旧单独问
    const use = await UI.ask({ title: _tf(3115, "用 Cost Explorer 免掉这次 ${$0} 吗？", amt), buttons: [{ label: _t(3116, "用掉，免掉"), value: true, cls: 'pri' }, { label: _tf(3117, "不用，交 ${$0}", amt), value: false }] });
    if (use) { ce.used = true; log(_tf(3114, "{$0} 用 Cost Explorer 免掉了 {$1}", nm(p), SQ[p.pos].n)); return; }
  }
  pay(p, 'pot', amt);
  log(_tf(3119, "💸 {$0} 交 ${$1} 进奖池（{$2}{$3}）", nm(p), amt, SQ[p.pos].n, p.role === 'unicorn' ? _t(3118, "，独角兽双倍") : ''));
}

