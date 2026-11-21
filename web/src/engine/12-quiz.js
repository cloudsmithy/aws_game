import { askQuestion, pickQuestion } from '../rules/06-qbank.js';
import { S } from './07-state.js';
import { ST } from './26b-retro.js';
import { MP } from '../net/40-host-sync.js';
// ================= 答题 =================
// inline：返回 { ok, html }，结果由调用方放进下一个窗（见 askQuestion）
export async function quiz(g, why, { inline = false } = {}) {
  const x = pickQuestion(g);
  const r = await askQuestion(x.q, x.id, why, { again: x.again, inline });
  if (r === 'skip') return inline ? { ok: false, html: '' } : false;
  const ok = inline ? r.ok : r;
  { const qp = S.players[MP.actor ?? S.cur]; if (qp) { ST(qp).quizN++; if (ok) ST(qp).quizOk++; } }
  return inline ? r : ok;
}

