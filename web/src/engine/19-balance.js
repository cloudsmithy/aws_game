import { _t, _tf } from '../core/01-i18n-runtime.js';
import { rnd } from '../core/02-util.js';
import { UI } from '../core/02b-ui-port.js';
import { EOL_VER, SQ } from '../rules/03-services.js';
import { S, log, nm, ownedBy, resetProp, sqn } from './07-state.js';
import { credit, pay } from './08-money.js';
import { netWorth } from './08c-costs.js';
// ================= 平衡机制 =================
export async function quarterly() {
  const alive = S.players.filter(q => q.alive);
  if (alive.length < 2) return;
  const nw = alive.map(q => ({ q, v: netWorth(q) }));
  const min = Math.min(...nw.map(x => x.v)), max = Math.max(...nw.map(x => x.v));
  nw.filter(x => x.v === min).forEach(x => credit(x.q, 150, 'other'));
  nw.filter(x => x.v === max).forEach(x => pay(x.q, 'pot', 100));
  const q = Math.floor(S.quarterCount / 3);
  // 每 3 圈才结一次，又有「1 圈 = 1 年」，写「第 N 季度」说不通，所以写第几次
  log(_tf(3326, "📊 第 {$0} 次财报：总资产最低的拿 $150 融资，最高的交 $100 合规审查费", q));
  await UI.info(_tf(3327, "第 {$0} 次财报", q), _tf(3330, "<table><tr><th>玩家</th><th>总资产</th><th>结果</th></tr>{$0}</table>", nw.map(x => `<tr><td>${nm(x.q)}</td><td>$${x.v}</td><td>${x.v === min ? _t(3328, "+$150 融资") : ''}${x.v === max ? _t(3329, " −$100 合规审查") : ''}</td></tr>`).join('')));
}
export async function eol() {
  const rolls = S.players.filter(q => q.alive).map(q => ({ q, d: 1 + rnd(6) }));
  const min = Math.min(...rolls.map(r => r.d)), lines = [];
  for (const r of rolls.filter(r => r.d === min)) {
    const c = ownedBy(r.q).filter(i => EOL_VER[SQ[i].k] && S.props[i].level === 0 && !S.props[i].cap && !S.props[i].offline).sort((a, b) => SQ[a].p - SQ[b].p);   // 只看带版本的服务（EOL_VER）
    // Lambda 叫弃用、Bedrock 叫 EOL，不都叫「标准支持结束」，统一写「支持结束日期」；「Kubernetes 版本」这种英文开头的前面留空格
    if (c.length) { const i = c[0], v = EOL_VER[SQ[i].k], back = Math.round((S.props[i].spot ? S.props[i].spotPaid : (S.props[i].paid ?? SQ[i].p)) / 2); resetProp(i); credit(r.q, back, 'sell'); lines.push(_tf(3331, "{$0} 的 {$1} 还在用旧的{$2}{$3}，到了支持结束日期没来得及升级，先退回亚马逊云科技，拿 ${$4}", nm(r.q), sqn(i), /^[A-Za-z]/.test(v) ? ' ' : '', v, back)); }
    else lines.push(_tf(3332, "{$0} 手上没有会版本到期的空服务，不受影响", nm(r.q)));
  }
  lines.forEach(l => log('📉 ' + l));
  await UI.info(_t(3333, "旧版本停止支持"), `<p>${rolls.map(r => _tf(3334, "{$0} 掷出 {$1}", nm(r.q), r.d)).join(_t(3335, "　"))}</p><p>${lines.join('<br>')}</p><p class="muted">${_t(3336, "只有带版本的服务会中：RDS、Aurora 的数据库引擎大版本，ElastiCache、OpenSearch 的引擎版本，EKS 的 Kubernetes 版本，Lambda 运行时，Glue 版本，DMS 复制引擎版本，Bedrock 的模型；DynamoDB、S3、SQS 这类没有版本，不受影响。现实里到期的是版本，服务本身还在：RDS 过了标准支持结束日期会自动转入收费的延长支持，Lambda 运行时弃用后不再打安全补丁。日期都会提前公布，留够时间升级。")}</p>`);
}

