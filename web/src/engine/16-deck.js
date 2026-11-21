import { _t } from '../core/01-i18n-runtime.js';
import { shuffle } from '../core/02-util.js';
import { F, S, log } from './07-state.js';
import { eol } from './19-balance.js';
import { withCardMul } from '../rules/35-modes.js';
// ================= 牌堆 =================
export function ensureInc(n) { if (S.inc.length < n && S.incDisc.length) S.inc.push(...shuffle(S.incDisc.splice(0))); }
export async function drawRei() {
  if (!S.rei.length) { S.rei = shuffle(S.reiDisc.splice(0)); log(_t(3120, "re:Invent 牌堆重新洗牌")); if (F.balance()) await withCardMul(0, eol); }
  return S.rei.shift();
}

