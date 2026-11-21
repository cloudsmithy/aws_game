import { _t, _tf, _tr } from '../core/01-i18n-runtime.js';
import { awsImg } from '../core/02-util.js';
import { BAL, BILL_N, CAP_MAX, GROUPS, HA_N, OFFLINE_OK, SQ, TYPE_N, capU, effIn, effLabel, grpN, haOf, haTag, labColor, lvName, upCost, upCostsTxt } from '../rules/03-services.js';
import { COMBOS, cAll } from '../rules/04-roles-combos-cards.js';
import { dlcRunMul } from '../rules/05-dlc.js';
import { S, offlineCash } from '../engine/07-state.js';
import { FIXED_FEE, reqRate, runCost } from '../engine/08c-costs.js';
import { capCost, sellZhe, stripValue, trafficMul } from '../engine/09-rent.js';
import { propStatusHtml } from './11-cards-deeds.js';
import { rentAt, rentUpTxt, runAt, runIfMine, useFeeTxt } from '../engine/11b-rent-info.js';
import { introHtml } from './27e-square-gallery.js';
import { isParty } from '../rules/35-modes.js';
// 各级一览：效果、过路费、每圈运行费（点格子的小面板和完整介绍共用）
function lvTableHtml(i) {
  const s = SQ[i], pr = S.props[i], lv = pr ? pr.level : -1, tm = trafficMul();
  // 点数 = 落在这一格的人这次掷出的两颗骰子之和（2–12，平均 7）。按 token、按请求计费的过路费跟着点数走：写「点数 × 单价」，下面再给一个掷 7 点的例子
  const R = l => rentAt(i, l), $r = v => `$${Math.round(v)}`, per = v => `$${+v.toFixed(1)}`;
  const rentCell = l => { const x = R(l); return x.pt != null ? _tf(2808, "骰子点数 × {$0}<br><span class=\"muted\" style=\"font-size:12px\">掷 7 点 {$1}</span>", +x.pt.toFixed(1), $r(x.pt * 7)) : $r(x.v); };
  // 效果一栏：这一级多了什么功能，再写过路费从多少涨到多少（不再只写「过路费提高」）
  const up = l => rentUpTxt(i, l);
  // 收到过路费另交的那一份（15% 请求费 / 25% token 成本）：每一级都一样就写在表下面一次，不一样（某一级开了降成本、减半）才每行写
  const fees = [0, 1, 2, 3].map(l => useFeeTxt(i, l)), feeSame = fees.every(x => x === fees[0]);
  const rows = [0, 1, 2, 3].map(l => `<tr class="${lv === l ? 'hi' : ''}"><td>${l ? _tf(2809, "第 {$0} 级 · ", l) : _t(2810, "未升级 · ")}<b>${lvName(i, l)}</b>${l ? _tf(2811, "<span class=\"lvp\">升级 ${$0}</span>", upCost(i, l)) : ''}${l && s.upg[l - 1][3] ? `<br><span class="muted" style="font-size:12px">${s.upg[l - 1][3]}</span>` : ''}</td><td>${l ? [effLabel(i, l), up(l)].filter(Boolean).join('<br>') : _t(2812, "<span class=\"muted\">刚买下的样子</span>")}</td><td>${rentCell(l)}</td><td>${pr ? `$${runIfMine(i, () => runAt(i, l))}` : ''}</td></tr>`).join('');
  const notes = [R(0).pt != null ? _t(2813, "骰子点数：落在这一格的人这次掷出的两颗骰子加起来（2–12，平均 7），这块服务的过路费跟着它走") : '', _t(2814, "运行费/圈：每走完一圈、经过 Startup 扶持时交一次（同时领 Credits），和骰子点数无关"),
    // 收到过路费另交的那一份写在表下面，不塞进运行费那一栏（塞进去整张表被撑宽，左边的级别挤成一个字一行）
    fees[0] ? (feeSame ? _tf(2815, "另外每次{$0}", fees[0]) : _tf(2819, "收到过路费另交：{$0}", [0, 1, 2, 3].filter(l => !l || fees[l] !== fees[l - 1]).map(l => `${l ? _tf(2816, "第 {$0} 级起", l) : _t(2817, "未升级")} ${fees[l].replace(_tr(2818, "^收到过路费交 ", ""), '')}`).join(_t(2698, "，")))) : '', tm !== 1 ? _tf(2820, "过路费已按现在的流量 ×{$0} 算", tm) : ''].filter(Boolean);
  return _tf(2821, "<table class=\"lvt\"><tr><th>级别</th><th>效果</th><th style=\"text-align:right\">过路费</th><th style=\"text-align:right\">运行费/圈</th></tr>{$0}</table>{$1}", rows, notes.length ? `<div class="muted" style="font-size:12px;margin-top:4px">${notes.join(_t(408, "；"))}</div>` : '');
}
export function propInfoHtml(i, buying = false) {
  const s = SQ[i], pr = S.props[i];
  const head = `<div class="bh">${awsImg(s.icon)}<div>${_tf(2823, "<b>{$0}</b><span>价格 ${$1}{$2}</span>", s.n, s.p, s.t === 'prop' ? ` · ${TYPE_N[s.type]} · ${BILL_N[s.bill]}` : _t(2822, " · 按用量收费"))}</div></div>${introHtml(i, buying)}`;
  if (s.t === 'util') {
    return `<div class="grp bcard" style="--gc:#545b64"><div class="gt t">${_t(2824, "按用量收费")}</div><div class="gb">${head}${propStatusHtml(i)}
      <table><tr><th>${_t(2825, "持有几个按用量收费的格子")}</th><th style="text-align:right">${_t(2826, "基础倍数")}</th></tr><tr><td>${_t(1425, "1 个")}</td><td>${_t(2827, "骰子点数 × 4")}</td></tr><tr><td>${_t(1426, "2 个")}</td><td>${_t(2828, "骰子点数 × 10")}</td></tr><tr><td>${_t(1424, "3 个")}</td><td>${_t(2829, "骰子点数 × 20")}</td></tr></table>
      <table style="margin-top:8px"><tr><th>${_t(2830, "级别")}</th><th style="text-align:right">${_t(2831, "倍数再加")}</th></tr>${[0, 1, 2, 3].map(l => `<tr class="${pr && pr.level === l ? 'hi' : ''}"><td>${l ? _tf(2809, "第 {$0} 级 · ", l) : ''}${lvName(i, l)}</td><td>+${3 * l}</td></tr>`).join('')}</table>
      <div class="df">${_tf(2832, "CloudWatch、CloudTrail、Config 三格算在一起；过路费 = 骰子点数 ×（基础倍数 + 3 × 级别）。按用量计费：收到过路费交 {$0}% 请求费。升级价：{$1}；落在自己这格才能升。", Math.round(BAL.req * 100), upCostsTxt(i))}</div></div></div>`;
  }
  const g = GROUPS[s.g];
  const ha = haOf(i);
  const haLine = s.k === 'ecs' ? _t(2833, "ECS 服务默认就把任务尽量分散到多个 AZ（Fargate 也是），一个 AZ 出问题不受影响") : s.k === 'ebs' ? _t(2834, "EBS 卷只存在于一个 AZ 里，升级了也一样；快照能帮你在别处恢复数据") : ha === 'inst' ? _tf(2836, "买下时是单 AZ，一个 AZ 断电就会受影响{$0}", (m => m ? _tf(2835, "；升到第 {$0} 级「{$1}」才是多 AZ", m, s.upg[m - 1][0]) : '')(s.upg ? s.upg.findIndex(u => effIn(u[2], 'maz')) + 1 : 0)) : ha === 'global' ? _t(2837, "全局服务，不在任何一个 AZ 或 Region 里") : _t(2838, "托管服务，天生跨多个 AZ；想扛住整个 Region 出问题要升多区域");
  const billLine = (s.bill === 'req' ? _t(2839, "过路费按对方掷出的点数浮动（流量越大收得越多），平均和固定价差不多。<br>") : '') + (s.bill === 'hour' ? _tf(2845, "按小时计费：每次经过 Startup 扶持交运行费（{$0}），空着也要交{$1}", pr && pr.owner !== null ? _tf(2840, "现在每圈 ${$0}", runCost(i)) : _tf(2841, "未升级时每圈 ${$0}", pr ? runIfMine(i, () => runAt(i, 0)) : (s.type === 'paas' || s.k === 'eks' ? BAL.hourHigh : BAL.hourLow)[0]), s.k === 'ec2' ? _tf(2844, "；EC2 没放进私有子网还要交公网 IPv4 地址费，这个数已经按{$0}的 VPC 算好了", pr && pr.owner !== null ? _t(2842, "主人") : _t(2843, "当前玩家")) : '') : s.bill === 'req' ? _tf(2851, "按用量计费：每次收到过路费，交 {$0}% 请求费；{$1}{$2}", Math.round(reqRate(i) * 100), FIXED_FEE[s.k] ? _tf(2847, "另外有固定月费（{$0}），{$1}每圈交 ${$2}", FIXED_FEE[s.k][1], s.k === 'kms' ? _t(2846, "升到客户托管密钥（第 1 级）后") : '', Math.round(FIXED_FEE[s.k][0] * dlcRunMul())) : _t(2848, "没人用就不花钱，经过 Startup 扶持不交运行费"), s.k === 'lambda' ? _t(2849, "；升到预置并发后每圈 +$10（预置并发按小时收费）") : s.k === 'apigw' ? _t(2850, "；开了缓存后每圈 +$10（缓存按小时收费）") : '') : s.bill === 'token' ? _t(2852, "按 token 计费：过路费 = 对方掷出的骰子点数 × 模型档位单价，集齐 AI 组再 × 1.5；每次收到过路费交 ") + Math.round(BAL.token * 100) + _t(2853, "% token 成本") : s.bill === 'sub' ? _tf(2854, "订阅：每次经过 Startup 扶持交固定 ${$0}", Math.round(20 * dlcRunMul())) : s.bill === 'bundle' ? _tf(2855, "打包价：实例、存储、流量打成一个固定套餐，每次经过 Startup 扶持交套餐费（{$0}），不随流量浮动；负载均衡（第 1 级）和托管数据库（第 3 级）各另加每圈 ${$1}；用不了 Savings Plans 和 RI", pr && pr.owner !== null ? _tf(2840, "现在每圈 ${$0}", runCost(i)) : _tf(2841, "未升级时每圈 ${$0}", Math.round(5 * dlcRunMul())), Math.round(10 * dlcRunMul())) : _tf(2856, "免费；开了私有子网要交 NAT 网关的钱（每圈 ${$0}，NAT 账单格交双倍）", Math.round(20 * dlcRunMul())));
  const cb = COMBOS.filter(c => cAll(c).includes(i));
  return `<div class="grp bcard" style="--gc:${g.color}"><div class="gt t" style="color:${labColor(s.g)}">${grpN(s.g)}</div><div class="gb">${head}${propStatusHtml(i)}
    ${haTag(i) ? `<div class="hatag ${haTag(i).k}"><b>${haTag(i).t}</b><span>${haTag(i).d}</span></div>` : ''}
    ${lvTableHtml(i)}
    <div class="df">${_tf(838, "{$0}：{$1}", HA_N[ha], haLine)}<br>${billLine}<br>${_tf(2867, "每个{$0} ${$1}：过路费 +25%，最多 {$2} 个{$3}", capU(s.k), capCost(i), CAP_MAX, s.bill === 'hour' ? _t(2857, "，每个每圈运行费 +$") + Math.round((s.type === 'paas' || s.k === 'eks' ? BAL.capHigh : BAL.capLow) * dlcRunMul()) : s.bill === 'bundle' ? _tf(2858, "，每个每圈套餐费 +${$0}", Math.round(5 * dlcRunMul())) : s.bill === 'token' ? _tf(2859, "，每个每圈运行费 +${$0}", Math.round(20 * dlcRunMul())) : _t(2860, "，不增加运行费"))}<br>${_tf(2868, "升级价：{$0}；落在自己的服务上才能升一级；{$1}彻底不要可以按实付 {$2}卖回亚马逊云科技", upCostsTxt(i), OFFLINE_OK.has(s.k) && isParty() ? _t(2861, "娱乐模式不能下线；") : OFFLINE_OK.has(s.k) ? _tf(2865, "缺钱时可以下线，{$0}周转；", pr && pr.owner !== null ? _tf(2863, "先拿回 ${$0}{$1}", offlineCash(i) + stripValue(i), stripValue(i) ? _t(2862, "（含去掉升级和容量退的一半）") : ' ') : _tf(2864, "先拿回买价的一半（原价买下是 ${$0}）", Math.round(s.p / 2))) : _t(2866, "这类服务现实里不能停机，不能下线；"), sellZhe())}</div></div></div>`;
}
