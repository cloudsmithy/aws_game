import { _t } from '../core/01-i18n-runtime.js';
import { $, rnd } from '../core/02-util.js';
import { CAP_MAX, N, OWNABLE, SQ } from '../rules/03-services.js';
import { DLC, dlcOn } from '../rules/05-dlc.js';
import { F, P, S, availCard, cur, ownedBy } from '../engine/07-state.js';
import { doRoll, endTurn, jailAct, uiAction } from '../engine/14-turn.js';
import { canSkill, setRsRate, useRoleSkill } from '../engine/21-skills.js';
import { SPEED_MAX, speedMenu } from '../engine/22-speed.js';
import { manage } from '../engine/23-manage.js';
import { activeAction } from '../engine/24-actions.js';
import { edpDialog, trade } from '../engine/25-trade.js';
import { enterGame, newGame } from '../ui/28-setup-save.js';
import { hellCfg } from '../rules/35-modes.js';
// ================= 自动对局（?bot=1，用来测试） =================
export const BOTOUT = { errors: [], games: [] };
export function botAct(box, inputs, buttons, done) {
  inputs.forEach(inp => {
    if (!inp.id) return;
    const el = box.querySelector('#in_' + inp.id); if (!el || el.disabled) return;
    if (inp.type === 'checkbox') el.checked = Math.random() < 0.3;
    else if (inp.type === 'textarea') el.value = _t(4740, "配置没有用代码管理");
    else if (inp.type === 'select') el.selectedIndex = rnd(el.options.length);
    else { const mx = inp.max ?? 300; el.value = Math.random() < 0.4 ? 0 : rnd(Math.min(mx, 400) + 1); }
  });
  const opts = [];
  buttons.forEach(b => { if (!b.disabled) opts.push({ v: b.value, w: (b.cls || '').includes('danger') ? 0.05 : (b.botW ?? 1) }); });
  box.querySelectorAll('[data-v]').forEach(el => { if (!el.disabled) opts.push({ v: el.dataset.v, w: el.dataset.bw ? +el.dataset.bw : 0.3 }); });
  let t = Math.random() * opts.reduce((a, o) => a + o.w, 0);
  for (const o of opts) { t -= o.w; if (t <= 0) return done(o.v); }
  done(opts[opts.length - 1].v);
}
function invariants() {
  const errs = [];
  S.players.forEach(p => {
    if (!Number.isFinite(p.cash) || p.cash < 0) errs.push(`${p.name} cash=${p.cash}`);
    if (p.techDebt < 0 || p.techDebt > 2) errs.push(`${p.name} techDebt=${p.techDebt}`);
    if (!p.alive && ownedBy(p).length) errs.push(`${p.name} dead but owns`);
    if (p.pos < 0 || p.pos >= N) errs.push(`${p.name} pos=${p.pos}`);
    if (!Number.isInteger(p.speed || 0) || (p.speed || 0) < 0 || (p.speed || 0) > SPEED_MAX) errs.push(`${p.name} speed=${p.speed}`);
  });
  OWNABLE.forEach(i => {
    const pr = S.props[i];
    if (pr.level < 0 || pr.level > 3) errs.push(`level ${i}`);
    if (pr.owner === null && (pr.level || pr.cap || pr.impaired || pr.ddos != null)) errs.push(`unowned dirty ${i}`);
    if (pr.ddos != null && !(P(pr.ddos) && P(pr.ddos).alive)) errs.push(`ddos by dead ${i}`);
    if (!SQ[i].upg && pr.level) errs.push(`nonupg level ${i}`);
    if ((pr.cap || 0) < 0 || (pr.cap || 0) > CAP_MAX) errs.push(`cap ${i}`);
  });
  if (!Number.isFinite(S.pot) || S.pot < 0) errs.push('pot');
  return errs;
}
async function botGame(cfg) {
  newGame(cfg); enterGame();
  let steps = 0, stall = 0;
  while (!S.over && steps < 6000) {
    steps++;
    await new Promise(r => setTimeout(r, 0));
    const bad = invariants(); if (bad.length) { BOTOUT.errors.push(`[${cfg.diff}/${cfg.win}] step ${steps}: ${bad.join('; ')}`); break; }
    if (S.phase === 'roll') {
      stall = 0;
      const p = cur();
      if (p.jail !== null) { const k = ['stay', 'stay', 'pay', 'es'][rnd(4)]; await jailAct(k === 'es' && !availCard(p, 'ES') ? 'stay' : k); }
      else if (dlcOn('speed') && Math.random() < 0.2) await uiAction(speedMenu);
      else await doRoll();
    } else if (S.phase === 'post') {
      stall = 0;
      const r = Math.random();
      if (r < 0.05 && canSkill(cur())) await uiAction(useRoleSkill);
      else if (r < 0.08 && cur().reseller) await uiAction(setRsRate);
      else if (r < 0.15 && dlcOn('speed')) await uiAction(speedMenu);
      else if (r < 0.25) await uiAction(() => manage(cur()));
      else if (r < 0.3) await uiAction(trade);
      else if (r < 0.33 && F.full()) await uiAction(edpDialog);
      else if (r < 0.45 && F.actions() && !S.actionUsed) await uiAction(activeAction);
      else await endTurn();
    } else if (S.phase === 'busy') { if (++stall > 500) { BOTOUT.errors.push(`[${cfg.diff}/${cfg.win}] stalled at step ${steps}`); break; } }
  }
  BOTOUT.games.push({ diff: cfg.diff, win: cfg.win, learn: cfg.learn, steps, over: S.over, round: S.round, winner: S.winner, alive: S.players.filter(p => p.alive).length });
}
export async function botMain() {
  const n = +(new URLSearchParams(location.search).get('games') || 12);
  const diffs = ['basic', 'std', 'full'], wins = ['classic', 'wa', 'timed'];
  for (let g = 0; g < n; g++) {
    const cfg = { names: [_t(4741, "甲"), _t(4742, "乙"), _t(4743, "丙"), _t(4744, "丁")].slice(0, 2 + (g % 3)), diff: diffs[g % 3], win: wins[Math.floor(g / 3) % 3], minutes: 5, learn: g % 2 === 0 };
    cfg.wa = cfg.win === 'wa'; cfg.timed = cfg.win === 'timed';
    if (cfg.timed) cfg.minutes = 0.02;
    cfg.dlc = g % 2 ? Object.keys(DLC) : [];   // 一半的局把 DLC 全开
    cfg.rs = [true];   // 开了代理商模式时 0 号座位当代理商
    cfg.mode = ['normal', 'party', 'normal', 'study'][g % 4]; cfg.cardMul = g % 4 === 1 ? 'rand' : g % 3 === 2 ? '2' : '1';
    if (cfg.mode === 'party') cfg.diff = 'basic'; if (cfg.mode === 'study') { cfg.diff = 'std'; cfg.learn = true; }
    if (g % 6 === 5) hellCfg(cfg);
    try { await botGame(cfg); } catch (e) { BOTOUT.errors.push(String(e.stack || e)); }
  }
  $('#botout').textContent = 'BOTRESULT ' + JSON.stringify(BOTOUT);
  $('#botout').hidden = false;
  document.title = 'BOTDONE';
}

