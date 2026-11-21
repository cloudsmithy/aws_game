import { _t } from '../core/01-i18n-runtime.js';
import { UI } from '../core/02b-ui-port.js';
import { S } from '../engine/07-state.js';
import { localHuman } from '../engine/36-ai.js';
import { cheatExpired, mySeat, reportCheat } from '../engine/38-cheats.js';
import { MP } from '../net/40-host-sync.js';
document.addEventListener('click', e => {
  const b = e.target instanceof Element && e.target.closest('[data-cheat]'); if (!b || !S || !S.players) return;
  e.preventDefault();
  const id = +b.dataset.cheat;
  if (MP.role === 'client') { MP.send(MP.hostConn, { t: 'report', id }); return void UI.toast(_t(4884, "举报发给房主了")); }
  // 举报人是这台设备上的「我」（房主联机时是房主自己的座位，不是 MP.mySeat——那只有远端才有）。
  // 同屏轮流玩：作弊的就是「我」、本机还有别的真人时，按「别人举报」算（同一台电脑上谁都能点）；本机只有他一个真人就是举报自己
  const c = S.cheats && S.cheats[id], me = mySeat();
  const by = c && me === c.by && S.players.some(q => q.alive && q.id !== c.by && localHuman(q)) ? null : me;
  const why = reportCheat(id, by); if (why) UI.toast(why);
});
// 举报过的、自己用的那一条不显示「举报」（日志是 HTML 存的，按存档里的记录在画完以后藏掉）
export function cheatBtns() {
  if (!S || !S.cheats) return;
  const me = MP.role === 'client' ? MP.mySeat : null;
  document.querySelectorAll('[data-cheat]').forEach(b => { const c = S.cheats[+b.dataset.cheat]; b.hidden = !c || c.rep || cheatExpired(c) || (me != null && c.by === me); });
}
