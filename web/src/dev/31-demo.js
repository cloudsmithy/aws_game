import { _t } from '../core/01-i18n-runtime.js';
import { BAL, IX, SQ } from '../rules/03-services.js';
import { P, S, cur, log } from '../engine/07-state.js';
import { valuation } from '../engine/08c-costs.js';
import { info } from '../ui/10-modal.js';
import { showCard } from '../ui/11-cards-deeds.js';
import { propInfoHtml } from '../ui/11c-level-table.js';
import { offerLandingUpgrade } from '../engine/15-land.js';
import { ST } from '../engine/26b-retro.js';
import { showManual, timedOver } from '../ui/26e-manual.js';
import { render } from '../ui/27d-side.js';
import { gallery } from '../ui/27e-square-gallery.js';
import { enterGame, newGame } from '../ui/28-setup-save.js';
// ================= 演示（?demo=board|inc|rei|deed|quiz，用来截图） =================
// ?demo=over / ?demo=report 的新指标：估值走势从每人开局的估值走到现在的估值（第 6 轮 EC2 $480、第 21 轮 DynamoDB $1260 两笔过路费在线上看得出来，
// Damo 开局领先，韩叔第 10–21 轮压过他，付完那笔 $1260 又落回第 2；Yuki 第 14 轮出局）。钱从哪来里的过路费等于 rentIn，起点 Credits 按点数走过几圈算；用时 47 分钟
function demoStats() {
  const R = S.round, s0 = S.valHist[0] || [1], now = S.players.map(q => valuation(q));
  // 每人从开局到现在走了几成（t 是 0–1 的进度），再加上那两笔大额过路费
  const ease = [t => t, t => Math.pow(t, 1.5), t => 1 - Math.pow(1 - t, 2.2)], jump = [{ 7: 480, 22: -1260 }, { 7: -480, 22: 1260 }, {}, {}];
  S.valHist = [];
  for (let r = 1; r <= R; r++) S.valHist.push([r, ...S.players.map((q, k) => {
    const s = s0[k + 1] ?? q.startCash, t = (r - 1) / R, wig = r === 1 ? 0 : Math.round(45 * Math.sin(r * 1.9 + k * 2.1));
    // Yuki：前 7 轮涨 $470，之后一路掉到第 14 轮开始时的 $160，这一轮里破产，往后是 null
    if (k === 3) { if (r > 14) return null; const v = r <= 7 ? s + 470 * (r - 1) / 6 : s + 470 + (160 - s - 470) * (r - 7) / 7; return Math.round((v + (r === 1 || r === 14 ? 0 : wig)) / 10) * 10; }
    const J = jump[k], jt = Object.values(J).reduce((a, v) => a + v, 0), done = Object.entries(J).reduce((a, [rr, v]) => a + (r >= +rr ? v : 0), 0);
    return Math.round((s + (now[k] - s - jt) * ease[k](t) + done + wig) / 10) * 10;
  })]);
  const dice = [[27, 196, 5], [26, 183, 4], [24, 171, 3], [15, 101, 2]];
  S.players.forEach((q, k) => {
    const t = ST(q), [n, pips, dbl] = dice[k], salary = Math.floor(pips / SQ.length) * BAL.salary;
    Object.assign(t, { salary, dice: { n, pips, dbl }, gain: { rent: t.rentIn, salary, card: [350, 200, 450, 300][k], sell: [0, 0, 180, 620][k], other: [100, 150, 50, 50][k] },
      low: [{ cash: 140, r: 9 }, { cash: 60, r: 6 }, { cash: 230, r: 15 }, { cash: -340, r: 14 }][k], hitsBy: Object.fromEntries(Object.entries(t.earnBy).map(([i, v]) => [i, Math.max(1, Math.round(v / 200))])) });
  });
  S.t0 = Date.now() - 47 * 60000;
}
export function demo(kind) {
  newGame({ names: [_t(4775, "韩叔"), _t(4776, "虫虫"), 'Damo', 'Yuki'], diff: 'full', wa: true, timed: false, minutes: 90, learn: false });
  const own = { 0: ['s3', 'efs', 'ec2', 'ebs', 'vpc', 'elb', 'route53'], 1: ['lambda', 'apigw', 'dynamodb', 'sqs', 'cloudwatch'], 2: ['rds', 'aurora', 'elasticache', 'guardduty', 'inspector'], 3: ['sagemaker', 'bedrock', 'kinesis', 'config'] };
  S.props[IX.route53].owner = null;
  Object.entries(own).forEach(([pid, list]) => list.forEach(k => { S.props[IX[k]].owner = +pid; }));
  [['ec2', 2], ['vpc', 1], ['elb', 1], ['lambda', 1], ['dynamodb', 3], ['rds', 1], ['aurora', 1], ['bedrock', 1]].forEach(([k, l]) => S.props[IX[k]].level = l);
  S.props[IX.elasticache].impaired = true;
  S.players[0].pos = IX.elb; S.players[1].pos = IX.sfn; S.players[2].pos = IX.aurora; S.players[3].pos = IX.jail; S.players[3].jail = 1;
  S.players[0].cash = 1640; S.players[1].cash = 1180; S.players[2].cash = 2010; S.players[3].cash = 420;
  S.players[1].cards.push({ id: 'CE', used: false }, { id: 'ES', used: true }); S.players[0].coe.push({ cat: 'sec', used: false });
  S.players[2].techDebt = 2; S.pot = 150; S.round = 6; S.lastDice = [3, 5]; S.lastSq = IX.elb; S.phase = 'post';
  [_t(4777, "🎲 <b style=\"color:#e5484d\">韩叔</b> 掷出 3 + 5 = 8"), _t(4778, "💰 <b style=\"color:#e5484d\">韩叔</b> 付给 <b style=\"color:#2f7cf6\">虫虫</b> 过路费 $96（<b>Lambda</b>）"), _t(4779, "<b style=\"color:#2f7cf6\">虫虫</b> 的 <b>Lambda</b> 按用量计费，交请求费 $19"), _t(4780, "🔧 <b style=\"color:#1f9d55\">Damo</b> 给 <b>RDS</b> 加上「多 AZ」（$150）")].forEach(log);
  enterGame();
  if (kind === 'inc') showCard('inc', 21, cur());
  if (kind === 'flip') { document.querySelector('style').insertAdjacentHTML('beforeend', '.flip .face{animation-play-state:paused!important}.flip .face.back{animation-delay:-.29s,.45s!important}'); showCard('inc', 4, cur()); }
  if (kind === 'rei') showCard('rei', 17, cur());
  if (kind === 'deed') info(_t(4781, "EC2 · 计算组"), propInfoHtml(IX.ec2));
  if (kind === 'deed2') info(_t(4782, "Bedrock · AI 组"), propInfoHtml(IX.bedrock));
  if (kind === 'gallery') gallery();
  if (kind === 'manual') showManual();
  // 战报演示：赢家和标题走真实结算 timedOver（按估值排）；虫虫多给 $150 估值才压过 Damo，留住「收租王也是赢家」；
  // earnBy 按各自手上的服务拆、加起来等于 rentIn，复盘才不会写「没收到过路费」
  if (kind === 'over' || kind === 'report') { S.players.forEach((q, k) => Object.assign(ST(q), { rentIn: [2140, 3880, 960, 410][k], rentOut: [1320, 900, 2410, 1900][k], maxRent: [480, 1260, 220, 150][k], hit: [2, 1, 4, 3][k], imm: [3, 2, 0, 1][k], upg: [5, 8, 2, 1][k], quizOk: [6, 9, 3, 2][k], quizN: 10, spendBuy: 1400, runTot: [300, 520, 800, 410][k], earnBy: [{ [IX.ec2]: 1300, [IX.s3]: 840 }, { [IX.dynamodb]: 2400, [IX.lambda]: 1480 }, { [IX.rds]: 620, [IX.aurora]: 340 }, { [IX.bedrock]: 260, [IX.sagemaker]: 150 }][k] })); S.players[3].alive = false; S.round = 23; S.events = [{ r: 6, t: _t(4783, "虫虫 付给 韩叔 过路费 $480（EC2）"), w: 480 }, { r: 14, t: _t(4784, "Yuki 账户被暂停"), w: 900 }, { r: 21, t: _t(4785, "韩叔 付给 虫虫 过路费 $1260（DynamoDB 架构联合收费）"), w: 1260 }]; S.players[1].cash += 150; demoStats(); timedOver(_t(4786, "打满 23 轮")); }
  if (kind === 'cw') info(_t(4787, "CloudWatch · 按用量收费"), propInfoHtml(IX.cloudwatch));
  if (kind === 'land') { S.props[IX.lambda].cap = 2; S.players[1].pos = IX.lambda; S.cur = 1; render(); offerLandingUpgrade(P(1), IX.lambda); }
}



