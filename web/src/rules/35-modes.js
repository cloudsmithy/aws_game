import { _t, _tf } from '../core/01-i18n-runtime.js';
import { rnd } from '../core/02-util.js';
import { BAL, BAL0, SPECIAL, SQ } from './03-services.js';
import { ROLES } from './04-roles-combos-cards.js';
import { DLC } from './05-dlc.js';
import { S, log, nm } from '../engine/07-state.js';
import { trafficMul } from '../engine/09-rent.js';
import { drawIncident } from '../engine/17-health.js';
import { drawReinvent } from '../engine/18-reinvent.js';
import { sfxAll } from '../net/41-replay.js';
// ================= 模式：娱乐 / 入门 / 标准 / 完整 / 学习 =================
// 娱乐模式只留常用服务（20 个），其余服务格变成「盲盒格」，抽卡抽到爽
const PARTY_HIDE = new Set(['ecr', 'ecs', 'eks', 'sqs', 'eventbridge', 'sfn', 'kinesis', 'glue', 'athena', 'redshift', 'dms', 'opensearch', 'guardduty', 'inspector', 'kms']);
export const isParty = () => !!(S && S.cfg && S.cfg.mode === 'party');
export const isStudy = () => !!(S && S.cfg && S.cfg.mode === 'study');
export const isHell = () => !!(S && S.cfg && S.cfg.mode === 'hell');
export const isHidden = i => isParty() && SQ[i] && SQ[i].t === 'prop' && PARTY_HIDE.has(SQ[i].k);
// 卡牌倍率：开局选 1 / 1.5 / 2 倍，或者「每轮随机」（每轮开始时在 0.5、1、1.5、2 倍里随机）；盲盒格再翻倍
const ROUND_MULS = [0.5, 1, 1.5, 2];
// 卡上的金额跟着流量涨（涨幅是过路费的 BAL.cardGrow 倍），不然后期抽卡几乎没影响
export const cardGrowMul = () => !S || !BAL.cardGrow ? 1 : Math.round((1 + (trafficMul() - 1) * BAL.cardGrow) * 100) / 100;
export const cardMulBase = () => (!S || !S.cfg ? 1 : S.cfg.cardMul === 'rand' ? (S.roundMul || 1) : (+S.cfg.cardMul || 1)) * cardGrowMul();
export const fmtMul = m => `×${Math.round(m * 100) / 100}`;
export function rollRoundMul() { if (!S || S.cfg.cardMul !== 'rand') return; S.roundMul = ROUND_MULS[rnd(ROUND_MULS.length)]; log(_tf(4796, "🎲 第 {$0} 轮卡牌倍率：{$1}", S.round, fmtMul(S.roundMul))); }
// 卡牌效果里的收钱付钱乘倍率；卡里再落地结算（付过路费、买服务）不乘
export async function withCardMul(m, fn) { const m0 = S.cardMul; S.cardMul = m; try { return await fn(); } finally { S.cardMul = m0; } }
// 盲盒格：随机抽一张 Health 或 re:Invent，效果再翻倍
export async function blindBox(p) {
  const rei = Math.random() < 0.55;
  log(_tf(4797, "🎁 {$0} 打开盲盒：{$1}卡，效果翻倍", nm(p), rei ? 're:Invent' : _t(291, "Health 事件")));
  sfxAll('magic');
  await withCardMul(cardMulBase() * 2, () => rei ? drawReinvent(p) : drawIncident(p));
}

// （以下从 rules/03-services.js 挪来：用到 S、isParty、isHell、ROLES、DLC，放在服务数据里会让底层文件依赖后面的文件）
// 起点、User Group 活动的说明跟着模式变（地狱模式起点只领 $150，娱乐模式 UG 抽三张）；用的时候才读，这时 BAL、S 都有了
{ const go = SQ.find(q => q.k === 'go'), ug = SQ.find(q => q.k === 'free');
  if (go) Object.defineProperty(go, 'd', { configurable: true, enumerable: true, get: () => SPECIAL.go.d.replace('$200', '$' + BAL.salary) });
  if (ug) Object.defineProperty(ug, 'd', { configurable: true, enumerable: true, get: () => S && S.cfg && isParty() ? SPECIAL.free.d.replace(_t(346, "抽两张"), _t(347, "抽三张")) : SPECIAL.free.d }); }
const HELL_BAL = { growth: 1.5, protect: 0, salary: 150, sell: 0.6, cardGrow: 1, quizRent: 0.7, rsSolo: 1, rsComboMul: 0, rsCashSum: 0 };
const HELL_DLC = ['genai', 'sec', 'finops', 'global', 'speed'];
export const hellDlc = () => [...HELL_DLC, ...Object.keys(DLC).filter(k => DLC[k].quiz)];   // 再加上全部题库 DLC（题库在后面才注册进 DLC，所以用函数现取）
// 地狱模式不禁角色，每个角色多一条限制，削掉它在地狱模式里最占便宜的那一点（ROLES 里的 hell 字段）；
// 先试过禁角色：禁掉最强的两个，下一个又冒出来，打地鼠
export const hx = id => isHell() && !!(ROLES.find(r => r.id === id) || {}).hell;
const HBAL_Q = (() => { try { return JSON.parse(new URLSearchParams(location.search).get('hbal') || '{}'); } catch (e) { return {}; } })();   // 模拟用：?hbal={} 覆盖地狱模式参数
export const applyBal = () => { for (const k in BAL) delete BAL[k]; Object.assign(BAL, BAL0, S && S.cfg && S.cfg.mode === 'hell' ? { ...HELL_BAL, ...HBAL_Q } : {}); };
// 地狱模式：完整局 + 4 个玩法 DLC + 高速部署 + 全部题库，卡牌 ×2，必须边玩边答题
export const hellCfg = cfg => Object.assign(cfg, { mode: 'hell', diff: 'full', cardMul: '2', learn: true, dlc: [...new Set([...(cfg.dlc || []), ...hellDlc()])] });
// （从 ui/26c-report.js 挪来）
export const modeName = () => isParty() ? _t(3742, "娱乐模式") : isStudy() ? _t(3743, "学习模式") : isHell() ? _t(3744, "地狱模式") : { basic: _t(3745, "入门局"), std: _t(3746, "标准局"), full: _t(3368, "完整局") }[S.cfg.diff] || '';
