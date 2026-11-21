import { AWSI } from '../data/icons.js';
import { _t, _tf, _tr } from '../core/01-i18n-runtime.js';
import { esc } from '../core/02-util.js';
import { UI } from '../core/02b-ui-port.js';
import { IX, OFFLINE_MIN, OFFLINE_OK, SQ, capU, lvName } from '../rules/03-services.js';
import { F, S, debtOf, offlineCash, ownedBy, owns, ownsGroup } from './07-state.js';
import { CO_SVCS, opCost, runCost } from './08c-costs.js';
import { addCap, bringOnline, capCost, capInfo, doUpgrade, offRounds, sellCap, sellProp, sellUpgrade, sellValue, sellZhe, stripValue, takeOffline, upPaidOf, upgradeInfo } from './09-rent.js';
import { lvUpTxt } from './11b-rent-info.js';
import { convertSpot, landHere, spotConvCost } from './15-land.js';
import { payRefactor, refactorCost } from './17-health.js';
import { isParty } from '../rules/35-modes.js';
// ================= 资产管理 =================
export async function manage(p, debtMode = false) {
  let again = 0;   // 第一次打开不挡；之后每做一件事重画时挡 0.35 秒（hold），触屏上不一定有双击计数，靠这个兜底
  for (;;) {
    const own = ownedBy(p);
    const rows = own.map(i => {
      const s = SQ[i], pr = S.props[i], acts = [];
      if (s.upg && !debtMode) {
        const u = upgradeInfo(p, i, i === landHere(p));
        if (u.ok) acts.push(`<button class="sm pri" data-v="up:${i}" data-bw="0.6" title="${esc(lvUpTxt(i, u.next))}" ${p.cash < u.total ? 'disabled' : ''}>${_tf(2987, "升到第 {$0} 级「{$1}」${$2}", u.next, s.upg[u.next - 1][0], u.total)}</button>`);
        else if (u.why && pr.level < 3) acts.push(`<span class="tagm" title="${u.why}">${_tr(3505, "集齐整组", "").test(u.why) ? _t(3506, "没集齐整组") : u.why}</span>`);
      }
      if (s.t === 'prop' && !debtMode && ownsGroup(p, s.g)) { const c = capInfo(p, i); if (c.ok) acts.push(_tf(3507, "<button class=\"sm\" data-v=\"cap:{$0}\" data-bw=\"0.4\" {$1}>加 1 个{$2} ${$3}</button>", i, p.cash < c.cost ? 'disabled' : '', capU(s.k), c.cost)); }
      if (pr.spot && !debtMode) { const c = spotConvCost(i); acts.push(_tf(3508, "<button class=\"sm pri\" data-v=\"conv:{$0}\" data-bw=\"0.4\" {$1}>补 ${$2} 转成按需</button>", i, p.cash < c ? 'disabled' : '', c)); }
      if (s.t === 'prop' && pr.cap > 0) acts.push(_tf(3509, "<button class=\"sm\" data-v=\"uncap:{$0}\" data-bw=\"0.2\">减 1 个{$1} +${$2}</button>", i, capU(s.k), Math.round(capCost(i) / 2)));
      if (s.upg && pr.level > 0 && !pr.cap) acts.push(_tf(3510, "<button class=\"sm\" data-v=\"sell:{$0}\" data-bw=\"0.2\">去掉一级 +${$1}</button>", i, Math.round(upPaidOf(i, pr.level) / 2)));
      if (OFFLINE_OK.has(s.k) && !pr.offline && !isParty()) acts.push(`<button class="sm" data-v="off:${i}" data-bw="0.2" title="${_tf(3512, "{$0}不收过路费，运行费只剩存储费；下线 {$1} 轮后自动恢复，拿回的钱不用还，自己落到这一格可以提前免费拉起来；期间别人落上来可以付原价 ${$2} 把它买走", pr.level || pr.cap ? _t(3511, "会先自动去掉升级和容量（各退一半）；") : '', OFFLINE_MIN, s.p)}">${_tf(3513, "下线 +${$0}", offlineCash(i) + stripValue(i))}</button>`);
      if (pr.offline) acts.push(_tf(3515, "<span class=\"muted\" style=\"font-size:12px\">下线第 {$0} 轮，满 {$1} 轮自动恢复；落到这一格可以免费提前拉起来</span>", offRounds(i), OFFLINE_MIN));
      acts.push(`<button class="sm danger-lite" data-v="sell2:${i}" data-bw="0.1" title="${_tf(3518, "买价{$0}的实付按 {$1}拿回{$2}；以后不用再交它的运行费，这块回到亚马逊云科技，谁落上来都能买", pr.level || pr.cap ? _t(3516, "、升级和容量") : '', sellZhe(), pr.offline ? _t(3517, "（扣掉下线时已经拿走的 $") + (pr.offCash || 0) + _t(3210, "）") : '')}">${_tf(3519, "卖回亚马逊云科技 +${$0}", sellValue(i))}</button>`);
      return `<tr><td><img src="${AWSI[s.icon]}" alt="" style="width:18px;height:18px;vertical-align:-4px;margin-right:6px">${s.n}</td><td>${s.upg ? lvName(i, pr.level) + (pr.cap ? _tf(2588, " · {$0} 个{$1}", pr.cap, capU(s.k)) : '') : '—'}${pr.impaired ? ' · Impaired' : ''}${pr.offline ? _tf(3520, " · 已下线（{$0} 轮）", pr.offline - 1) : ''}</td><td>${_tf(3523, "${$0}/圈", runCost(i))}</td><td><div class="acts">${acts.join('')}</div>${OFFLINE_OK.has(s.k) && !pr.offline && !isParty() ? _tf(3522, "<div class=\"muted\" style=\"font-size:12px;margin-top:6px\">下线 {$0} 轮后自动恢复，不用还钱{$1}</div>", OFFLINE_MIN, pr.level || pr.cap ? _t(3521, "<br>会先去掉升级和容量（各退一半）") : '') : ''}</td></tr>`;
    });
    let extra = '';
    if (F.debt() && !debtMode && p.techDebt > 0) extra += _tf(3524, "<p>技术债 {$0} 个 <button class=\"sm\" data-v=\"refactor\" data-bw=\"0.3\" {$1}>重构 ${$2}（清掉 1 个）</button></p>", p.techDebt, p.cash < refactorCost(p) ? 'disabled' : '', refactorCost(p));
    const html = `${own.length ? _tf(3525, "<table class=\"mgt\"><tr><th>服务</th><th>当前级别</th><th>运行费</th><th>操作</th></tr>{$0}</table>", rows.join('')) : _t(3526, "<p class=\"muted\">还没有服务</p>")}${extra}
      <ul class="ways muted"><li>${_tf(3532, "每次经过 Startup 扶持一共交运行费 <b>${$0}</b>{$1}。", opCost(p), p.halfRun ? _tf(3528, "（{$0}{$1}减半）", p.halfLaps > 1 ? _tf(1834, "接下来 {$0} 次", p.halfLaps) : _t(1835, "下次"), p.halfRun === 'hour' ? _tf(3527, " {$0} 这几块", CO_SVCS) : '') : '')}</li>${p.reGo > 0 ? _tf(3529, "<li>前面往回绕过了起点：{$0}经过 Startup 扶持不算新的一圈，不领 Credits、不交运行费。</li>", p.reGo > 1 ? _tf(1834, "接下来 {$0} 次", p.reGo) : _t(1835, "下次")) : ''}${p.gravFree && !(owns(p, IX.ec2) && S.props[IX.ec2].level >= 3) ? _t(3530, "<li>还记着一次免费换 Graviton：EC2 升 Graviton 这一级时不花钱。</li>") : ''}<li>${_t(3533, "升级只能在落到自己那块服务上时升；容量随时都能在这里加。")}</li>${isParty() ? '' : _t(3531, "<li>缺钱时 EC2、RDS、Aurora、Redshift、ECS 可以<b>下线</b>：拿回买价一半（不用还），不收过路费，运行费只剩存储费；固定 3 轮后自动恢复，自己落到这一格可以提前免费拉起来，期间别人可以付原价买走。</li>")}<li>${_tf(3534, "<b>卖回亚马逊云科技</b>：买价、升级、容量的实付按 {$0}拿回，不能反悔；只去掉升级或容量（服务留着）退一半。", sellZhe())}</li></ul>`;
    const v = await UI.ask({ title: _tf(3536, "{$0} 的资产 · 现金 ${$1}{$2}", p.name, p.cash, p.debt.length ? _tf(3535, " · 欠款 ${$0}", debtOf(p)) : ''), html, buttons: [{ label: _t(2610, "关闭"), value: 'close', botW: 3 }], cls: 'wide', hold: again++ ? 350 : 0 });
    if (v === 'close') return;
    const [k, a] = String(v).split(':'); const i = +a;
    if (k === 'up') { const here = i === landHere(p); doUpgrade(p, i, here); if (here) S.landAct.used = true; }
    else if (k === 'sell') sellUpgrade(p, i);
    else if (k === 'cap') addCap(p, i);
    else if (k === 'conv') convertSpot(p, i);
    else if (k === 'uncap') sellCap(p, i);
    else if (k === 'sell2') {
      // 卖回不能反悔，又和「去掉一级」「下线」挨着：先问一句，免得手指偏一点把整块连升级卖掉
      // hold：双击「卖回亚马逊云科技」时，第二下别直接点在确认框的「卖回 +$X」上
      const ok = await UI.ask({ hold: 350, title: _tf(3537, "把 {$0} 卖回亚马逊云科技？", SQ[i].n), html: _tf(3540, "<p>按实付 {$0}拿回 ${$1}{$2}{$3}。卖完这块回到亚马逊云科技，谁落上来都能买，包括你自己。</p>", sellZhe(), sellValue(i), S.props[i].offline ? _tf(3538, "（已扣掉下线时拿走的 ${$0}）", S.props[i].offCash || 0) : '', S.props[i].level || S.props[i].cap ? _t(3539, "，升级和容量一起没了") : ''), buttons: [{ label: _tf(3541, "卖回 +${$0}", sellValue(i)), value: true, cls: 'danger' }, { label: _t(3542, "先不卖"), value: false, cls: 'pri' }] });
      if (ok) sellProp(p, i);
    }
    else if (k === 'off') takeOffline(p, i);
    else if (k === 'on') bringOnline(p, i);
    else if (k === 'refactor') payRefactor(p);
    UI.render();
    if (debtMode && !p.debt.length) return;
  }
}

