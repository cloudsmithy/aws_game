import { _t } from '../core/01-i18n-runtime.js';
import { shuffle } from '../core/02-util.js';
import { F, S, log } from './07-state.js';
import { eol } from './19-balance.js';
import { withCardMul } from '../rules/35-modes.js';
// ================= 牌堆 =================
export function ensureInc(n) { if (S.inc.length < n && S.incDisc.length) S.inc.push(...shuffle(S.incDisc.splice(0))); }
// 牌堆和弃牌堆都空了（多人局里卡都被收进了各家手牌）返回 null：调用的地方按「牌堆抽完了」处理，不洗空牌堆
export async function drawRei() {
  if (!S.rei.length && !S.reiDisc.length) return null;
  if (!S.rei.length) { S.rei = shuffle(S.reiDisc.splice(0)); log(_t(3120, "re:Invent 牌堆重新洗牌")); if (F.balance()) await withCardMul(0, eol); }
  return S.rei.shift();
}

// 没公开的手牌回弃牌堆（破产、座位交给电脑时）：别人本来就不知道是什么，不给接手的人，也不写卡名
export function discardHand(p) { const n = p.hand ? p.hand.length : 0; if (n) { S.reiDisc.push(...p.hand); p.hand = []; } return n; }
