import { _t, _tf } from '../core/01-i18n-runtime.js';
import { UI } from '../core/02b-ui-port.js';
import { GRP, SQ, lvName } from '../rules/03-services.js';
import { CATS, INC } from '../rules/04-roles-combos-cards.js';
import { F, S, cur, log, nm, ownedBy, sqn } from './07-state.js';
import { pay } from './08-money.js';
import { upPaidOf, upgradeInfo } from './09-rent.js';
import { ensureInc } from './16-deck.js';
import { payRefactor, refactorCost } from './17-health.js';
import { ST } from './26b-retro.js';
// ================= 主动行动（完整局） =================
function migrations(p) {
  const out = [];
  ownedBy(p).forEach(src => {
    if (SQ[src].t !== 'prop' || S.props[src].level === 0) return;
    GRP(SQ[src].g).forEach(dst => { if (dst !== src && upgradeInfo(p, dst, true).ok) out.push([src, dst]); });   // 迁移是挪升级，不是新升，不受「落在上面才能升」限制
  });
  return out;
}
// 「主动行动」按钮灰不灰：四项里最便宜的是自查 $50（重构最少也要 $50，GameDay 和迁移 $100），现金不到 $50 一项都做不了。
// 改了这几项的价格，这里要跟着改
export const actionWhy = p => S.actionUsed ? _t(3543, "本回合已经行动过了") : p.cash < 50 ? _t(3544, "现金不够 $50") : '';
export async function activeAction() {
  if (!F.actions() || S.actionUsed) return;   // 和按钮（ui/27c-center.js）同一个条件：联机远端发来的 'action' 也直接调这里
  const p = cur(), mg = migrations(p);
  const v = await UI.ask({
    title: _t(3545, "主动行动（每回合 1 个）"),
    html: _t(3546, "<p>每回合可以做下面其中一件事：</p>"),
    buttons: [
      { label: _t(3547, "GameDay 演练 $100"), desc: _t(3548, "翻开 Health 事件牌堆顶 2 张，选一张的类别领演练标记；2 张都放回牌堆底"), value: 'gd', disabled: p.cash < 100 },
      { label: _t(3549, "Well-Architected 自查 $50"), desc: _t(3550, "查看 Health 事件牌堆顶 3 张，按你想要的顺序放回"), value: 'wa', disabled: p.cash < 50 },
      { label: _tf(3551, "重构 ${$0}", refactorCost(p)), desc: _tf(3553, "清掉 1 个技术债（$50 × 手上个数，第 10 轮起 +$30）{$0}", p.techDebt ? '' : _t(3552, "。你现在没有技术债")), value: 'rf', disabled: p.cash < refactorCost(p) || !p.techDebt },
      { label: _t(3554, "迁移 $100"), desc: _tf(3556, "把一块服务最高的 1 级升级挪到同组另一块{$0}", mg.length ? '' : _t(3555, "。你现在没有能迁移的升级")), value: 'mg', disabled: p.cash < 100 || !mg.length },
      { label: _t(2465, "取消"), value: 'x', botW: 2 },
    ],
  });
  if (v === 'x') return;
  if (v === 'gd') {
    ensureInc(2);
    const top = S.inc.slice(0, 2);
    const pick = await UI.ask({ title: _t(3557, "GameDay：选一张来演练"), html: `<div class="pcards">${top.map(id => UI.cardHtml('inc', id)).join('')}</div>`, buttons: top.map(id => ({ label: _tf(3558, "演练 #{$0}（{$1}类）", id, CATS[INC[id].c]), value: id })) });
    ST(p).spendMisc = (ST(p).spendMisc || 0) + pay(p, 'bank', 100); p.drill.push({ cat: INC[pick].c, used: false });
    S.inc.splice(0, top.length); S.inc.push(...top);
    log(_tf(3559, "🎯 {$0} 做了 GameDay，领到{$1}类演练标记", nm(p), CATS[INC[pick].c]));
  } else if (v === 'wa') {
    ensureInc(3);
    const top = S.inc.slice(0, 3); let rest = [...top]; const order = [];
    ST(p).spendMisc = (ST(p).spendMisc || 0) + pay(p, 'bank', 50);
    while (rest.length > 1) {
      const pick = await UI.ask({ title: _tf(3560, "自查：选第 {$0} 张放最上面", order.length + 1), html: rest.map(id => _tf(3561, "<p>#{$0} {$1} <b>{$2}</b>：{$3}</p>", id, CATS[INC[id].c], INC[id].n, INC[id].e)).join(''), buttons: rest.map(id => ({ label: `#${id} ${INC[id].n}`, value: id })) });
      order.push(pick); rest = rest.filter(x => x !== pick);
    }
    order.push(...rest); S.inc.splice(0, top.length, ...order);
    log(_tf(3562, "{$0} 做了 Well-Architected 自查，调整了 Health 事件牌堆顺序", nm(p)));
  } else if (v === 'rf') payRefactor(p);
  else if (v === 'mg') {
    const k = await UI.ask({ title: _t(3563, "迁移哪一级？"), buttons: mg.map((m, idx) => ({ label: _tf(3564, "{$0}（{$1}）→ {$2}", SQ[m[0]].n, lvName(m[0], S.props[m[0]].level), SQ[m[1]].n), value: idx })) });
    const [src, dst] = mg[k];
    ST(p).spendMisc = (ST(p).spendMisc || 0) + pay(p, 'bank', 100); const mv = upPaidOf(src, S.props[src].level); if (S.props[src].upPaid) S.props[src].upPaid.length = S.props[src].level - 1; S.props[src].level--; S.props[dst].level++; (S.props[dst].upPaid = S.props[dst].upPaid || [])[S.props[dst].level - 1] = mv;
    log(_tf(3565, "🚚 {$0} 把 {$1} 的 1 级升级迁到 {$2}", nm(p), sqn(src), sqn(dst)));
  }
  S.actionUsed = true;
}

