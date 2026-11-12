// 玩法讲解视频时间轴：跟着配音（explain_data.json）走，每段一章：
// 开场 → 开局 → 一回合 → 过路费 → 有效架构 → 运行费 → Health 事件 → re:Invent 卡 → 缺钱和破产 → 标准局 → 开玩
window.PROMO_SCRIPT = {
  duration: window.PROMO_DATA.explain.duration,
  run(t, E) {
    const { V, seg, ease, easeOut, D, top, COLORS } = E;
    // 叠加层的进退场窗口：和 E.win 一样的起止时间，但进场缓出、退场缓入（二次曲线：第一帧不超过 0.3，不一帧冒出来），不再是线性淡入淡出
    const win = (t, a, b, fi = 0.45, fo = 0.45) => { const i = seg(t, a, a + fi), o = seg(t, b - fo, b); return Math.min(1 - (1 - i) * (1 - i), 1 - o * o); };
    const I = D.icons, X = D.explain, SG = {};
    // 片尾的特点标签：原来是格数 / 服务数 / 卡牌数 / 架构数 / 题数的数字条，游戏还会更新，改成不带数字的说法（promo.js、mexp.js 同一组）
    // 11/10：这里片尾上面还有一排小标签（「真实架构 · 按整套收」「边玩边答题 · 学习模式」），后两格换成上面没说过的（模式讲解片尾没有小标签，mexp.js 保留原来那组）
    const TAGS = [['真实云服务', ''], ['事件卡', ''], ['多种模式', ''], ['电脑玩家', '']];
    X.segs.forEach(s => { SG[s.id] = s; });
    const NAMES = ['韩叔', '虫虫', 'Damo', 'Yuki'];
    // A(段, 第几句, 句内进度)：这句话念到哪里的时间点
    const A = (id, k, f = 0) => { const s = SG[id].subs[k]; return s.t0 + (s.t1 - s.t0) * f; };
    const S0 = id => SG[id].start, S1 = id => SG[id].end;
    // 12 标准局第 3 句（11-09 改成先讲新账户保护期「前两轮过路费最多五十美元」，再讲季度财报）：念到「季度财报」在这句的 58%（whisper 量的；11-09 复核换了一条音高和前后句一致的配音，5.60 秒），财报标签、要点卡第 4 条、两笔钱从这里起
    const QF = 0.58;
    const on = id => t >= S0(id) && t < S1(id);
    const cur = X.segs.find(s => t >= s.start && t < s.end) || X.segs[X.segs.length - 1];
    const hop = (p, from, n, t0, step = 0.22) => { const s = (t - t0) / step, k = Math.floor(s); return from + (t < t0 ? 0 : Math.min(n, k + ease(s - k))); };
    const P = n => D.sq[n].p;
    // 跟着 index.html 走的数（build.mjs 的 xc）：四个角色卡上的开局资金、后走补贴（第 k 位多领 seat × k，只加现金）、按色组的升级费和加容量费
    const XC = D.xc, UPC = i => XC.up[i], CAPC = i => XC.cap[i];
    // 升到第 l 级的价钱：index.html 的 upCost = round(基础价 × UP_MUL[l − 1] / 5) × 5，UP_MUL = [0.75, 1, 1.25]（11-08：数据库组 RDS 多 AZ $115，第 2 级 $150）。
    // build.mjs 的 xc 只带了基础价（XC.up），这里按同一个公式算；以后 xc 带上每级价（XC.upl[i] = [第 1, 2, 3 级]）就直接用那个
    const UPL = (i, l) => XC.upl ? XC.upl[i][l - 1] : Math.round(UPC(i) * [0.75, 1, 1.25][l - 1] / 5) * 5;
    const ROLE = ['车库创业公司', '传统企业上云', 'SaaS 创业公司', 'AI 原生公司'], RC = ROLE.map(n => XC.roleCash[n]);
    // 09 边玩边答题：虫虫掷 4 点落到韩叔的 RDS。这时韩叔已经有 Route 53（三层 Web 的可选一块，按请求计费：$32 × 4 ÷ 7 = $18），一起收：
    // ELB $28 + EC2 $20 + RDS $350 + Route 53 $18 = $416，答对减半 $208；韩叔为 Route 53 那一份交 15% 请求费（$208 × 18 / 416 × 0.15 ≈ $1），净收 $207（index.html 的 jointRent / payRent）
    const R53Q = Math.round(P(37) * 0.2 * 4 / 7), QRENT = 398 + R53Q, QHALF = Math.round(QRENT / 2), QFEE = Math.round(QHALF * R53Q / QRENT * 0.15), CH_WIN = 200;
    // 08 re:Invent 卡：韩叔花总资产的 4% 自己抽一张 re:Invent 卡，再花它的 1.5 倍让 Damo 抽一张 Health 卡（index.html 的 reiBuyCost / incSendCost，都取整到 $10）。
    // 韩叔这时的总资产 = 开局资金 + Damo 付的三层 Web 过路费 $398 + S3 公开时虫虫赔的 $25（买服务、升级、加容量只是现金换成资产，总资产不变）= $1923
    const HAN_NET = RC[0] + 398 + 25, REI_BUY = Math.max(50, Math.round(HAN_NET * 0.04 / 10) * 10), INC_SEND = Math.round(REI_BUY * 1.5 / 10) * 10;
    const DAMO_LOW = 115;   // 专属技能一章 Damo「几轮之后」的现金：加上 DMS、Redshift 刚好低于发动线（现在 $795 < $800）；战略并购付完 ELB 的卖回价（$112）还剩 $3，不会变负
    const nm = (k) => `<b style="color:${COLORS[k]}">${NAMES[k]}</b>`;
    // 标签换字时的小顿点：换字前 0.2 秒透明度沉到 0.2（标签跟着缩一点），在最低点换字，0.3 秒带着回弹起来
    const dip = (t, tcs) => Math.min(1, ...tcs.map(tc => 1 - 0.8 * (t < tc ? ease(seg(t, tc - 0.2, tc)) : 1 - easeOut(seg(t, tc, tc + 0.3)))));

    // ---------- 摄像机 ----------
    const c = (id, k, f) => A(id, k, f);
    // 片头：念完前两句（T1）前 DIVE 秒，镜头从封面的环绕机位（engine.intro 的公式）飞进棋盘。终点放在棋盘右前方，和环绕、开局机位在同一侧，
    // 只转二十几度，不先往左甩再转回来；俯冲一结束就顺着同一条曲线慢慢推到开局机位，中间不停
    const T1 = A('intro', 2, 0) + 0.2, DIVE = 2.0;
    const orb = tq => { const th = 0.6 + tq * 0.07; return [15.5 * Math.sin(th), 8.5 + Math.sin(tq * 0.4) * 0.6, 15.5 * Math.cos(th)]; };
    const CAM = [
      [T1 - DIVE, orb(T1 - DIVE), [0, 0.8, 0]],
      [T1 + 0.3, [13.5, 13.5, 14.5], [2.4, 0, 1.2]],
      [S0('setup') + 0.4, [11, 7, 13], [6.6, 0, 4.4]],
      [A('setup', 3, 0.8), [9.6, 5.6, 11.6], [6.9, 0, 4.8], 'hold'],   // 开局 4 句话里镜头慢慢推近；'hold'：第 3 句收尾时交给「结束方式」那段的覆盖镜头，交出去时是静止的
      [S1('setup'), [0.6, 7.8, 16.5], [-0.6, 2.2, 0], 'hold'],               // 和「结束方式」那段覆盖镜头的终点对上，进一回合时接着运镜，不硬切
      [S0('turn') + 1.2, [3, 10, 15], [0.6, 0, 3.4]],
      [c('turn', 2, 0.2), [0.5, 8, 13.5], [-1.0, 0, 4.0], 'hold'],   // 这一段两头 'hold'：保持原来的缓动，四个角那段的起点 camAt 按原来的插值算，要对得上
      [S0('rent') + 0.8, [0, 19, 17], [0, 0, 0.5], 'hold'],
      [S1('rent') - 0.75, [0, 19, 17], [0, 0, 0.5]],   // 第 2 句收尾就起步，1.55 秒飞到三层 Web
      [S0('arch') + 0.8, [-11.6, 9, 10], [-5.9, 0, 1.4]],   // 三层 Web 三块落在画面中左
      [c('arch', 3, 0) - 0.35, [-11.6, 9, 10], [-5.9, 0, 1.4]],   // 第 2 句念完就起步，1.55 秒拉到全景
      [c('arch', 3, 0) + 1.2, [0, 21, 15], [0, 0, 0]],      // 可选的 Route 53（在右上角，左边的近景拍不到）、「还有很多种架构」和串联收费都在静止的全景里讲
      [S1('arch') - 0.5, [0, 21, 15], [0, 0, 0]],
      [S0('bill') + 0.8, [0, 19, 17], [0, 0, 0.5]],      // 全景：左列虫虫的 ECS、下排的 S3 / Lambda、右下角的起点和 VPC 都在画面里（以前的右前方近景拍不全 21 号格）
      [S1('bill') - 0.4, [0.2, 18.4, 16.8], [0.1, 0, 0.55]],   // 这一章里慢慢推近一点
      [S0('inc') + 0.6, [0, 17, 17], [0, 0, 0.6]],
      [S1('inc') - 0.4, [0, 17, 17], [0, 0, 0.6]],
      [S0('rei') + 0.6, [-0.8, 15.5, 14.5], [-0.6, 0, 0.9]],   // re:Invent 卡这一章镜头不动，底排不掉进字幕；稍微拉远、往左挪，左上的 User Group 角（Yuki 抽 Hackathon 卡的地方）进画面
      [S1('rei') - 0.4, [-0.8, 15.5, 14.5], [-0.6, 0, 0.9]],
      [S0('quiz') + 0.8, [1.5, 8, 13.5], [-1, 0, 4.2]],
      [S1('quiz') - 0.5, [1.5, 8, 13.5], [-1, 0, 4.2]],
      [S0('skill') + 0.8, [-3.6, 18.5, 17.5], [-3.4, 0, 0.6]],
      [S1('skill') - 0.4, [-3.6, 18.5, 17.5], [-3.4, 0, 0.6]],
      [S0('broke') + 0.8, [3, 12, 15], [1.8, 0, 0]],   // 右列（Yuki 的服务）放在要点卡下方，不再留一大片空地板
      [S1('broke') - 0.4, [3.5, 12, 15], [1.8, 0, 0]],
      [S0('std') + 0.8, [-1.5, 16, 16.5], [0, 0, 1], 'hold'],   // 拉远一点，左列不被切；这一段两头 'hold' 保持原来的缓动：片尾 E.outro 从 S0('end') - 0.8 起直接看向 (0,0,0)，这时看的点要已经几乎到位，不然接片尾那一帧画面会跳一下
      [S0('end') + 0.6, [-2, 18, 17], [0, 0, 0], 'hold'],
    ];
    E.camPath(t, CAM);
    // 主镜头在某个时刻的机位（和 camPath 同样的插值），给中途接管镜头的段落当起点，接管那一帧不跳
    const camAt = tq => { let k = 0; while (k < CAM.length - 2 && tq > CAM[k + 1][0]) k++; const [t0, p0, l0] = CAM[k], [t1, p1, l1] = CAM[Math.min(k + 1, CAM.length - 1)], u = t1 > t0 ? ease(seg(tq, t0, t1)) : 1;
      return [p0.map((v, i) => v + (p1[i] - v) * u), l0.map((v, i) => v + (l1[i] - v) * u)]; };
    // 06 Health 事件最后是 S3 那段的近景；进 07 re:Invent 卡时从近景飞回全景（大章节标题盖在中间），不硬切
    // 提前 0.45 秒起步、经过一个抬高往后拉的中点走弧线，1.65 秒飞回全景，速度峰值落在换章的 whoosh 附近
    if (t >= S1('inc') - 0.45 && t < S0('rei') + 1.2) E.camPath(t, [[S1('inc') - 0.45, [9.8, 6.8, 13.4], [3.2, 0.4, 4.2]], [S0('rei') + 0.35, [5, 12.5, 15.5], [1.6, 0.2, 2.6]], [S0('rei') + 1.2, [-0.8, 15.5, 14.5], [-0.6, 0, 0.9]]]);
    if (!on('end')) E.view(300);   // 右边留给要点卡，棋盘往左挪
    if (cur.id !== 'intro' && cur.id !== 'end') { E.safeR = 1160; E.safeT = 140; }   // 标签不压到右边的要点卡、顶上的章节牌和资金条

    // ---------- 片头：和宣传片一样的封面构图（右边转着的棋盘 + 漂浮图标，左边大标题），念完前两句再俯冲进棋盘（T1、DIVE 见摄像机） ----------

    // ---------- 归属：随着剧情慢慢有人买 ----------
    const owners = {};
    const own = (i, p, t0) => { if (t >= t0) owners[i] = [p, seg(t, t0, t0 + 0.5)]; };
    // 一回合开始时只有虫虫的 Lambda；其余的地在「几轮之后」的过路费一章一次买齐（钱也在那时一起扣）
    own(7, 1, S0('turn'));
    own(10, 0, A('turn', 1, 0.45));   // 韩叔的棋子落到 RDS 以后才买下
    // 虫虫集齐存储组 S3 / EFS / EBS（11-09 起 34 号是 EBS、35 号是安全组的 Cognito），再加 ECS、GuardDuty（不再买 ElastiCache：按现在的价格他会买到现金变负数）；顺带凑成「防勒索备份」（EBS + S3 + GuardDuty），片里不演；12 块地按棋盘顺序每隔 0.045 秒依次弹出来（大号章节标题已经在场），不在换章那一帧一起冒
    // 11-08 棋盘 2 号格 Lightsail 换成了 AgentCore（按用量计费的 AI 组），原来演 Lightsail 的过路费、「空着也交运行费」都换成 21 号格 ECS（容器组 $180，按小时计费）
    const RENT_OWN = [[1, 1], [13, 2], [15, 1], [18, 1], [21, 1], [25, 3], [28, 2], [34, 1], [40, 3], [44, 3], [46, 3]], rOwn = i => S0('rent') + 0.25 + RENT_OWN.findIndex(([j]) => j === i) * 0.045;
    RENT_OWN.forEach(([i, p]) => own(i, p, rOwn(i)));
    own(20, 0, A('arch', 1, 0.1)); own(19, 0, A('arch', 1, 0.1));
    // 05 第 3 句「三层 Web 再加一块 Route 53」：韩叔买下 Route 53（三层 Web 的可选一块）；第 5 句串联收费：再买 Config、EventBridge，和 EC2 凑成「安全组自动收紧」
    const b53 = Math.max(A('arch', 3, 0) + 1.3, A('arch', 3, 0.3)), bCE = A('arch', 5, 0) + 0.2;
    own(37, 0, b53); own(33, 0, bCE); own(23, 0, bCE + 0.15);
    const storm = A('skill', 2, 0.5);   // 「再按卖回价，买下……」：战略并购在角色技能之后（index.html 的 STORM_TXT）
    own(20, 2, storm);
    // 破产：Yuki 剩下的服务按剩下的欠款比例分给韩叔和虫虫（index.html 的 bankrupt：服务按价值从高到低，一块块分给「还差得最多」的那一份）
    // unUp：去掉升级（升级块沉进格子、退一半入账）；sold：OpenSearch 卖回（金币飞进来，紫框 0.35 秒缩掉）；split：破产分配
    const UNUP = Math.round(UPL(44, 2) / 2) + Math.round(UPL(44, 1) / 2), SOLD = Math.round((P(44) + CAPC(44)) * XC.sell);   // 去掉两级升级，每级退实付的一半（index.html 的 sellUpgrade：$150 → $75，$115 → $58）；卖回价 = (买价 + 升级 + 容量 × 加容量费) × 8 折，升级已经去掉
    const split = A('broke', 2, 0.5), sold = A('broke', 1, 0.3), unUp = Math.max(A('broke', 0, 0.3), S0('broke') + 2.45);   // 欠款标签 S0 + 1.75 出来，隔 0.7 秒再去掉升级
    // 现金和变卖的钱先进先出还第一笔欠款（韩叔），还剩欠韩叔 $829、虫虫 $800：KMS（$400）归韩叔，Aurora（$280）、DynamoDB（$240）归虫虫
    // 分给债主：旧的紫框先 0.2 秒缩掉，新主人的框再 0.4 秒弹出来；46 → 40 → 25 依次错开 0.15 秒，不一帧变色
    [[46, 0, split], [40, 1, split + 0.15], [25, 1, split + 0.3]].forEach(([i, p, t0]) => { if (t >= t0) owners[i] = t < t0 + 0.2 ? [3, 1 - seg(t, t0, t0 + 0.2)] : [p, seg(t, t0 + 0.2, t0 + 0.6)]; });
    if (t >= sold) { if (t < sold + 0.35) owners[44] = [3, 1 - seg(t, sold, sold + 0.35)]; else delete owners[44]; }
    for (const [i, [p, k]] of Object.entries(owners)) E.own(+i, p, k);

    // ---------- 棋子 ----------
    // 角格上的棋子：间距 ±0.3 摆成 2×2，整体往 −z 挪 0.3（角格贴图上半是图标、下半是格名）
    const cornerSpread = (m, k, pos) => {
      const a = Math.floor(pos), f = pos - a, w = j => ((j % 48) + 48) % 48, cn = j => E.cell(w(j)).side === 'corner';
      if (!cn(a) && !cn(a + 1)) return;
      const P = top(w(a)).lerp(top(w(a + 1)), f), off = [[-1, -1], [1, 1], [1, -1], [-1, 1]][k];
      const sp = E.lerp(cn(a) ? 0.3 : 0.18, cn(a + 1) ? 0.3 : 0.18, f), dz = E.lerp(cn(a) ? -0.3 : 0, cn(a + 1) ? -0.3 : 0, f);
      m.position.x = P.x + off[0] * sp; m.position.z = P.z + off[1] * sp + dz;
    };
    const ps = [0, 0, 0, 0];
    if (t >= S0('setup') + 0.3) {
      ps[0] = hop(0, 0, 10, A('turn', 0, 0.9));
      ps[1] = t < S0('turn') ? 0 : hop(1, 6, 4, A('quiz', 1, 0.0));
      ps[2] = t < S0('turn') ? 0 : t < S0('arch') ? hop(2, 3, 4, A('turn', 1, 0.55)) : hop(2, 7, 3, A('arch', 2, 0.05));   // 有效架构一章落在韩叔的 RDS
      ps[3] = t < S0('turn') ? 0 : hop(3, 17, 7, A('corner', 3, 0.05), 0.2);   // 四个角一章走到 User Group 活动（24 号格）
      if (t >= S0('bill')) ps[2] = hop(2, 47, 5, A('bill', 3, 0.05));   // 从没人买的 Shield Advanced 出发，经过起点，停在没人买的 VPC
      if (t >= S0('rei')) ps[3] = hop(3, 24, 3, S0('rei') + 0.35);   // 08 re:Invent 卡：Yuki 从 User Group 角走 3 格，停在 27 号 re:Invent 格抽卡
      if (t >= S0('broke')) ps[3] = 43;
      // 换位缩放：剧情跳到「几轮之后」、棋子要换格子的那一刻，先缩没再在新格子长出来，不凭空瞬移
      const swaps = [[], [S0('turn')], [S0('turn'), S0('bill')], [S0('turn'), S0('broke')]];
      [0, 1, 2, 3].forEach(k => {
        const appear = easeOut(seg(t, S0('setup') + 0.3 + k * 0.35, S0('setup') + 0.8 + k * 0.35)) * Math.min(1, ...swaps[k].map(ts => { const q = Math.min(1, Math.abs(t - ts) / 0.3); return q * q * (3 - 2 * q); }));   // 换位缩放走 smoothstep：缩没前减速、在最低点停一下再长出来
        const gone = k === 3 ? seg(t, A('broke', 2, 0.2), A('broke', 2, 0.6)) : 0;
        const bye = seg(t, S0('end') - 0.6, S0('end') + 0.2);   // 进片尾前收起棋子，免得透过数据栏
        if (appear > 0 && gone < 1 && bye < 1) { const m = E.pawnAt(k, ps[k]); m.scale.setScalar(appear * (1 - gone) * (1 - bye)); cornerSpread(m, k, ps[k]); }
      });
    }

    // ---------- 右侧要点卡 ----------
    const note = (title, ic, body, alpha) => E.show('note', 'note', `<h3>${ic ? `<img src="${I[ic]}">` : ''}<span>${title}</span></h3>${body}`, alpha, `translateX(${(1 - alpha) * 40}px)`);
    // 还没念到的条目调暗，里面的加粗字也跟着变暗（不然橙色加粗反而比念到的条目更显眼）；不用 class="dim"，全局 .dim 是整屏背景
    const li = (items, t0s) => '<ul>' + items.map((x, k) => { const d = t0s && t < t0s[k]; return `<li style="opacity:${d ? 0.25 : 1}">${d ? x.replace(/<b>/g, '<b style="color:inherit">') : x}</li>`; }).join('') + '</ul>';
    const nA = cur.id === 'intro' ? win(t, T1, cur.end, 0.4, 0.3) : win(t, cur.start + 0.2, cur.end, 0.4, 0.3);
    const nt = { intro: () => note('一句话玩法', 'cloud', li(['买亚马逊云科技服务，别人落上来<b>付你过路费</b>', '升级、扩容、<b>组成有效架构</b>，收得更多', '扛住 <b>Health 事件</b>，控制好账单', '最后没破产的人赢，或打满轮数按估值排名']), nA),
      // 第 3 句「第一次玩建议选入门局」：入门局那一行底下亮一道橙色，念完淡掉（镜头这几秒不动，给画面一点动静）
      setup: () => { const hl = win(t, A('setup', 3, 0.05), A('setup', 3, 1), 0.3, 0.4) * 0.22;
        return note('开局：每人一张角色卡', 'users', `<table class="tbl">${[[0, '经过或停在起点多领 $50'], [1, '买 EC2、RDS 打 85 折'], [2, 'Lambda、API Gateway、DynamoDB 和<span style="white-space:nowrap">应用集成组 8 折</span>'], [3, '买 AI 组服务打 9 折']].map(([k, a]) => `<tr style="opacity:${(t >= S0('setup') + 0.5 + k * 0.35 ? 1 : 0.2) * (k && t >= A('setup', 2, 0) && t < A('setup', 2, 1) ? 0.35 : 1)}"><td>${nm(k)}</td><td>${ROLE[k]} · $${RC[k]}<br><small style="color:#545b64">${a}</small></td></tr>`).join('')}</table><p class="np" style="color:#8d96a3">后走补贴：2 / 3 / 4 号位开局多领 $${XC.seat} / $${XC.seat * 2} / $${XC.seat * 3}</p><p class="np" style="border-radius:8px;background:rgba(255,153,0,${hl.toFixed(3)})">第一次玩：<b>入门局</b> · 默认 15 轮 · 按估值排名</p><p class="np" style="opacity:${t >= A('setup', 4) ? 1 : 0.25}">结束方式：只剩一人 · 打满轮数 · 限时 · <b>六大支柱</b></p>`, nA); },
      turn: () => note('一回合', 'chime', li(['掷两颗骰子往前走', '没人买的服务：<b>可以买下</b>', '别人的服务：<b>付过路费</b>', '自己的服务：升级，或<b>加容量</b>（加节点）', 'Health / re:Invent 格：抽卡；对子再掷一次'], [A('turn', 0), A('turn', 1), A('turn', 1, 0.5), A('turn', 2), A('turn', 3)]), nA),
      corner: () => note('四个角', 'activate', `<table class="tbl">${[['Startup 扶持', '经过或停下领 $200 Credits，交这一圈运行费', 1], ['维护窗口', '停一轮，或交 $50 照常走；被送进来的下回合再选', 2], ['User Group 活动', '路过领 $50；停下抽奖，或抽三张 re:Invent 卡选一张', 3], ['Root 密钥泄露', '直接飞到对角的维护窗口，不经过起点，不领 Credits', 4]].map(([n, d, k]) => `<tr style="opacity:${t >= A('corner', k) ? 1 : 0.25}"><td>${n}</td><td>${d}</td></tr>`).join('')}</table>`, nA),
      rent: () => note('过路费怎么算', 'billing', li(['价格越高、升级越多、容量越大，收得越多', '按小时计费的<b>固定</b>；按请求计费的<b>跟着点数走</b>，平均和固定价一样', '集齐<b>同色一整组</b>：没升级的也 ×2', '第 5 / 10 / 15 轮起 ×1.75 / ×2.5 / ×3.25'], [A('rent', 0), A('rent', 1), A('rent', 2), A('rent', 3)]) + `<p class="np" style="color:#8d96a3;opacity:${t >= A('rent', 1) ? 1 : 0.25}">Bedrock 按 token、监控组按用量：也是点数 × 单价</p>`, nA),   // 脚注：index.html 的 baseRent0 里 token、util 两类也按点数算
      arch: () => note('有效架构：按整套收', 'wat', li(['经典三层 Web：<b>ELB + EC2 + RDS</b>', '别人落在任意一块，整套的过路费加起来付', '可选的服务<b>有就一起收</b>，没有也成立', 'Serverless API、静态网站……还有很多种', '共用服务的架构<b>串联收费</b>，共用的只算一次'], [A('arch', 1), A('arch', 2), A('arch', 3), A('arch', 4), A('arch', 5)]) + `<div style="overflow:hidden;max-height:${(90 * ease(seg(t, A('arch', 5, 0), A('arch', 5, 0) + 0.5))).toFixed(1)}px;opacity:${ease(seg(t, A('arch', 5, 0) + 0.1, A('arch', 5, 0) + 0.6)).toFixed(3)}"><p class="np" style="color:#8d96a3">万能服务（CloudWatch、Config 等）：<br>绑到自己的一个架构上，能顶缺的那一块</p></div>`, nA),   // 脚注：11-09 的万能服务（index.html 的 WILD / WILD_NEED），旁白不念；第 5 句开头才从卡底展开（0.5 秒），前面 Damo 付过路费的标签在卡下沿附近，不多压一截
      bill: () => note('运行费：按真实计费', 'costexplorer', `<table class="tbl"><tr><td>实例</td><td>EC2、ECS、RDS：空着也交运行费，过路费全归你</td></tr><tr style="opacity:${t >= A('bill', 2) ? 1 : 0.25}"><td>Serverless</td><td>Lambda、API Gateway 按请求计费，空着不花钱；收过路费交 15% 请求费</td></tr><tr style="opacity:${t >= A('bill', 3) ? 1 : 0.25}"><td>经过起点</td><td>领 $200 Credits，交这一圈运行费</td></tr></table>`, nA),
      inc: () => note('Health 事件和防护', 'health', li(['一个 AZ 断电：<b>多 AZ 免疫</b>', '没防住：Impaired，暂停收过路费', '停一轮的卡：可以<b>交钱照常走</b>', '或用 Enterprise Support、复盘标记抵消', '或付托管费，请免疫的玩家托管'], [A('inc', 0), A('inc', 1, 0.4), A('inc', 2, 0.1), A('inc', 2, 0.45), A('inc', 2, 0.7)]), nA),
      // 后两条（11-08 新的回合动作，index.html 的 reiBuyCost / incSendCost / incSendReady）：花总资产的 4%（取整到 $10，最少 $50）自己抽 re:Invent 卡；花它的 1.5 倍让对手抽 Health 卡，每走一圈一次
      rei: () => note('re:Invent 卡和社交卡', 'reinvent', li(['大多是好事：Credits、认证、Hackathon', '社交卡：踩坑大会、白板画架构、技术分享会', '线下一桌人<b>边玩边聊</b>', '花总资产的 <b>4%</b>：自己抽一张', '花它的 1.5 倍：让对手抽一张 <b>Health 卡</b><br>指定、随机，或付两倍全场；每圈一次'], [A('rei', 0), A('rei', 1), A('rei', 2), A('rei', 3), A('rei', 4)]), nA),
      quiz: () => note('边玩边答题', 'training', li(['开局页打开「边玩边答题」', '付过路费、买服务时出一道题', '答对：<b>过路费减半</b>，买服务 <b>8 折</b>', '学习模式：全程必答题', '认证题库：CLF-C02 · SAA-C03 · AIF-C01', '出题考一位对手（每局一次）：$100，<br>答对他拿走，答错赔你 $200', '考全场：每 3 圈一次，每人 $50'], [A('quiz', 0), A('quiz', 1), A('quiz', 1, 0.5), A('quiz', 2), A('quiz', 2, 0.45), A('quiz', 3), A('quiz', 3, 0.85)]), nA),   // 后两条：出题挑战（index.html 的 CH_COST / CH_WIN，11-08 起考一个人每局一次；考全场 CHA_COST / CHA_WIN / CHA_LAPS），同一回合只能发动一个
      skill: () => note('专属技能：起死回生', 'activate', li(['总资产 &lt; 开局资金一半时能发动', '一局只能用一次', '先结算角色技能，比如 SaaS<span style="white-space:nowrap">「上架 Marketplace」</span>', '再「战略并购」：按卖回价<br>买下<b>总资产最高的对手</b>的一块服务'], [A('skill', 0), A('skill', 1, 0.5), A('skill', 2), A('skill', 2, 0.45)]), nA),
      broke: () => note('缺钱了怎么办', 'trustedadvisor', li(['去掉升级、减容量：退一半', '下线（抵押）：先拿回买价一半', '整块<b>按实付 8 折</b>卖回亚马逊云科技', '全卖了也不够才破产，<br>服务按欠款比例分给债主'], [A('broke', 0), A('broke', 0, 0.5), A('broke', 1), A('broke', 2)]), nA),
      std: () => note('标准局多了什么', 'securityhub', li(['技术债：每个让每圈运行费 +$20', '攒到 3 个大重构：<br>停一轮 $300，或不停 $400', '新账户保护期：前 2 轮过路费最多 $50', '季度财报：<br>总资产最低的领 $150，最高的交 $100'], [A('std', 1), A('std', 1, 0.6), A('std', 2), A('std', 2, QF + 0.07)]), nA),
    }[cur.id];
    if (nt) { nt(); const ne = E.el('note'); ne.style.top = '134px'; E.safeRB = ne.offsetTop + ne.offsetHeight + 12; }   // 要点卡比共用样式（top 120）往下挪 14px，资金条四位数时右端不压到卡的橙色顶边（只改讲解，不动 style.css）   // 只有上沿高过要点卡下沿的标签才要躲开要点卡

    // ---------- 各段动作 ----------
    // 开场标题
    if (t < T1) {
      const H0 = `<div class="eyebrow"><img src="${I.reinvent}"> 玩法讲解</div><h1><small>亚马逊云科技 User Group</small><span>云上大亨</span></h1><p class="tagline">在亚马逊云科技上创业：买服务、组架构、扛事故、控账单。</p><div class="chips">${[['ecs', '2–4 人 · 同屏或联机'], ['wat', '真实架构 · 按整套收'], ['health', 'Health 事件 · 扛事故'], ['activate', '专属技能 · 起死回生'], ['training', '边玩边答题'], ['chime', 'User Group 活动局']].map(([k, l]) => `<span><img src="${I[k]}">${l}</span>`).join('')}</div>`;
      E.intro(t, T1, H0, 300);
      // engine.intro 的俯冲写死 1.4 秒（30 个单位的话太急），这里按 DIVE 秒重算：镜头 = 时间轴机位和环绕机位按 k 混合，看的点、棋盘偏移、暗角、漂浮图标、大标题都跟着同一个 k
      const k = 1 - ease(seg(t, T1 - DIVE, T1)), cm = E.camera;
      E.camPath(t, CAM.map(q => [q[0], q[2], q[2], q[3]])); const lk = cm.position.clone();   // 看的点那条曲线（camPath 按同样的关键帧插值）
      E.camPath(t, CAM); cm.position.lerp(V(...orb(t)), k); cm.lookAt(lk.lerp(V(0, 0.8, 0), k));
      E.view(300 - 740 * k || 1e-3);
      E.show('dim2', 'dim2', '', k, 'none'); E.glow(0.32 + 0.25 * k, 0.26 + 0.25 * k);
      E.scene.children.forEach(o => { if (!o.isSprite) return; const d = o.position.distanceTo(cm.position), q = E.screen(o.position);
        o.visible = k > 0.01; o.scale.setScalar(1.25 * k); o.material.opacity = k * E.clamp((d - 8) / 3) * E.clamp((q.x - 1050) / 200) * E.clamp((940 - q.y) / 140); });
      const a2 = ease(1 - seg(t, T1 - DIVE - 0.2, T1 - DIVE + 0.6)); E.show('end2', 'end2', H0, a2, `translateX(${(1 - a2) * -50}px)`);   // 大标题在镜头起步前后退场，棋盘滑到左边时已经不在了
    }

    // 01 开局第 3 句「车库创业公司每次经过起点多领 $50」：起点格亮起来
    if (on('setup')) { const s0 = A('setup', 2, 0), s1 = A('setup', 2, 1); E.highlight(0, win(t, s0, s1, 0.3, 0.3) * (0.6 + 0.3 * Math.sin(t * 7))); E.label('start', V(top(0).x, 1.25, top(0).z - 0.2), '<span><b>起点</b> · Startup 扶持</span><small>车库创业公司每次经过多领 $50</small>', win(t, s0 + 0.2, s1, 0.3, 0.3), 'org sm'); }

    // 02 一回合：韩叔掷 4 + 6 落到 RDS 买下；Damo 落到虫虫的 Lambda 付过路费；对子再掷
    // 第二次掷骰（d0）前，停着的第一把骰子先在原位缩没；第二把在远端起手位置从 0 长出来再扔进来，不从要点卡左边一下瞬移过去
    // 第一把骰子等大号章节标题开始退场（S0 + 1.45）才扔出来，翻滚不藏在标题框后面；落定时间不变
    const d0 = A('turn', 3, 0.45), dT0 = S0('turn') + 1.45;
    if (t < d0) E.dice(t, dT0, A('turn', 0, 0.8), [4, 6], V(3.2, 0, 2.6), null, 1 - ease(seg(t, d0 - 0.3, d0)));
    // 常驻的骰子：一回合以后停在中央面板右上角的空白处（「云上大亨」大字右边、VPC 框上面），不压中央示意图的 EC2、RDS 图标，四个角的近景里也不再顶到镜头前
    const DPARK = V(4.3, 0, -2.5);   // 往中央面板里挪一点：09 边玩边答题的低机位里不再压上排 EBS、NAT Gateway 的图标
    // 05 有效架构的近景（镜头从左前方贴近三层 Web）里 DPARK 顶到画面上沿、压着上排的 WAF、Health 事件、Bedrock：镜头开走前在原地缩没，近景里停到中央面板左下的空白处（Route 53 图标左下、三层 Web 橙线下面），
    // 拉回全景时再缩没、回 DPARK 长出来（和模式讲解的 dpark 一样：换停放点时先缩没、镜头到位再长出来，不在画面上滑过去）
    const PA = V(-5.4, 0, 3.85), PAS = 0.62, pa0 = S1('rent') - 0.75, pa1 = S0('arch') + 0.8, pa2 = c('arch', 3, 0) - 0.35, pa3 = c('arch', 3, 0) + 1.2;
    const dPos = t >= pa0 && t < (pa2 + pa3) / 2 ? PA : DPARK;
    const dPk = t < pa0 - 0.3 ? 1 : t < pa0 ? 1 - ease(seg(t, pa0 - 0.3, pa0)) : t < pa1 ? 0 : t < pa2 - 0.3 ? easeOut(seg(t, pa1, pa1 + 0.35)) * PAS : t < pa2 ? (1 - ease(seg(t, pa2 - 0.3, pa2))) * PAS : t < pa3 ? 0 : easeOut(seg(t, pa3, pa3 + 0.35));
    // 04 第 1 句：标签依次写「掷 4 / 10 / 7 点」（RLD），停着的骰子在原地跟着重掷三次：1 + 3、4 + 6、3 + 4。每次先在原地 0.15 秒缩没（这时换朝上的面，看不出跳），
    // 再从上方 1.3 个单位掉下来、边转边长回原大小，落定的那一刻正好是标签换字的时刻；第三次以后一直停在 3 + 4
    const RLD = [0.6, 0.72, 0.84].map(f => A('rent', 1, f)), RLF = [[1, 3], [4, 6], [3, 4]], rl = RLD.filter(x => t >= x - 0.6).length;
    if (t >= S1('turn') && dPk > 0) {
      const k0 = easeOut(seg(t, S1('turn') + 0.05, S1('turn') + 0.4)) * dPk;
      if (!rl) E.dice(t, dT0, A('turn', 0, 0.8), [4, 6], dPos, null, k0 * (1 - ease(seg(t, RLD[0] - 0.75, RLD[0] - 0.6))));
      else { const tc = RLD[rl - 1], nx = RLD[rl], out = nx ? 1 - ease(seg(t, nx - 0.75, nx - 0.6)) : 1;
        E.dice(t, tc - 0.6, tc, RLF[rl - 1], dPos, V(dPos.x, 1.75, dPos.z), k0 * easeOut(seg(t, tc - 0.6, tc - 0.45)) * out); }
    }
    if (t >= d0 && t < S1('turn')) E.dice(t, d0, A('turn', 3, 0.8), [5, 5], V(1.2, 0, 2.6), V(-1, 3.6, -1.5), easeOut(seg(t, d0, d0 + 0.3)) * (1 - seg(t, S1('turn') - 0.35, S1('turn'))));   // 从棋盘远端扔进来，不从镜头前飞过；章末缩没，进四个角时第一把在原位长出来，不在换章那一帧跳回去
    E.label('d1', V(3.2, 1.5, 2.6), '<b>4 + 6 = 10</b>', win(t, A('turn', 0, 0.8), A('turn', 1, 0.2), 0.2, 0.3), 'big');
    E.label('d2', V(1.2, 1.5, 2.6), '<b>5 + 5 对子！</b><small>再掷一次</small>', win(t, A('turn', 3, 0.8), S1('turn') - 0.5, 0.2, 0.25), 'big');   // 镜头 S1 - 0.5 拉向全景，起步前收完
    // 第 3 句「re:Invent 格要抽卡」：抽一张卡给大家看，再掷对子
    // 退场：往上挪一点并淡出（0.28 秒缓入），不再 0.4 秒里冲出画面
    // 卡放大到 0.8（正文看得清），从下面升上来（和 Health 事件卡一样），停在画面中间偏上，不经过顶上的资金条；第二次掷骰（d0）前原地缩一点淡掉
    if (t >= A('turn', 3, 0.02) && t < A('turn', 3, 0.45)) { const c0 = A('turn', 3, 0.02), co = ease(seg(t, A('turn', 3, 0.39), A('turn', 3, 0.45))); E.card('tr', D.cards.good[0], { x: 1.2, y: -0.15 - 6 * (1 - easeOut(seg(t, c0, c0 + 0.5))) + co * 0.5, flip: ease(seg(t, c0 + 0.1, c0 + 0.5)), s: 0.8 * (1 - 0.12 * co), alpha: 1 - co }); }
    E.label('rcell', V(top(3).x, 1.0, top(3).z), '<span>Health / re:Invent 格：抽一张卡</span>', win(t, A('turn', 3, 0.05), A('turn', 3, 0.45) + 0.1, 0.3, 0.25), 'org sm');   // 比卡晚一点收，不同一帧走
    E.label('buy', V(top(10).x, 1.4, top(10).z), `<img src="${I.rds}"><span>${NAMES[0]} 买下 <b>RDS</b> · $${P(10)}</span>`, win(t, A('turn', 1, 0.45), A('turn', 1, 0.78), 0.3, 0.3), 'org');
    if (on('turn')) E.coinFly(t, A('turn', 1, 0.82), 0.8, top(7).add(V(0.25, 0.6, 0.25)), top(6).add(V(0.18, 0.6, 0.18)), 8, 0.8);   // Damo 的过路费飞到虫虫的棋子上
    E.label('pay', V(top(7).x, 1.4, top(7).z), `<span>${NAMES[2]} 付给${NAMES[1]}过路费</span>`, win(t, A('turn', 1, 0.8), A('turn', 2, 0.1), 0.3, 0.3), 'warn');
    const up1 = A('turn', 2, 0.15), up2 = A('turn', 2, 0.6);
    if (t >= up1) {   // 多 AZ：RDS 一分为二，两个 AZ 之间连蓝线；加容量：冒出 1 个只读节点
      const Q = top(10), sp = easeOut(seg(t, up1, up1 + 0.5));
      [-1, 1].forEach(sd => E.bit(V(Q.x + sd * 0.26 * sp, 0.33, Q.z - 0.5), '#2f7cf6', 0.24));
      if (t >= up1 + 0.4) E.arc(t, 'azlinkR', [V(Q.x - 0.26, 0.5, Q.z - 0.5), V(Q.x, 0.9, Q.z - 0.5), V(Q.x + 0.26, 0.5, Q.z - 0.5)], ease(seg(t, up1 + 0.4, up1 + 0.75)) * (1 - seg(t, S1('turn') - 0.4, S1('turn'))), 0x6cc0ff);   // 两半快分开时从一头画到另一头，不满长度一帧冒出来；一回合结束前倒着收掉，之后只留两块蓝方块当多 AZ 的记号（近景里不再像一根白骨头粘在棋子头上）
      if (t >= up2) { const k = E.easeBack(seg(t, up2, up2 + 0.3)); if (k > 0) E.bit(V(Q.x, 0.27, Q.z + 0.55), '#ec7211', 0.17 * k); }
    }
    E.label('u1', V(top(10).x + 0.15, 1.0, top(10).z - 0.2), `下次落到自己的 RDS：升级 <b>多 AZ</b> · $${UPL(10, 1)}`, win(t, up1 + 0.2, up2 + 0.1, 0.3, 0.3), 'org sm');
    E.label('u2', V(top(10).x, 1.25, top(10).z + 0.3), `再下一次：加容量 多 1 个只读节点 <b>+25%</b> · $${CAPC(10)}`, win(t, up2 + 0.2, A('turn', 3, 0.3), 0.3, 0.3), 'org sm');   // 两个升级标签的光点都收回到 RDS 正上方，不飘到中央面板（u2 抬到 1.25，标签不压住韩叔棋子的头）

    // 03 四个角：镜头依次飞到四个角，每个角配一点特效
    // cIn(j)：镜头到位，cOut(j)：镜头离开第 j 个角。标签在镜头到位前一点才出、离开前收完；高亮、Impaired 跟着离开一起淡掉，不在句末一帧断掉
    const cIn = j => A('corner', j + 1, 0.05) + 0.5, cOut = j => A('corner', j + 1, 0.92);
    const ugLand = A('corner', 3, 0.05) + 7 * 0.2;   // Yuki 跳 7 格落在 User Group 活动的那一刻：金币炸开、抽奖标签、资金 +280 都踩在这一拍上
    if (t >= S0('corner') - 0.5 && t < S1('corner')) {
      const keys = [0, 14, 24, 38].map((i, j) => { const Q = top(i), sx = Math.sign(Q.x), sz = Math.sign(Q.z);
        // Startup 角：机位和看的点一起往 +x 挪 1、机位抬高一点，角格不贴着要点卡（常驻的骰子停在中央面板右上角，不进这个近景）；Root 角用全景，看得到飞去对角的维护窗口
        return i === 0 ? [[Q.x - 0.8 + 1, 7.2, Q.z + 5.5], [Q.x - 0.2, 0, Q.z - 0.6]] : i === 38 ? [[0, 21, 15], [0, 0, 0]] : sz > 0 ? [[Q.x - sx * 0.8, 6.5, Q.z + 5.5], [Q.x - sx * 1.2, 0, Q.z - 0.6]] : [[Q.x * 0.5, 6.6, Q.z + 8.2], [Q.x, 0.4, Q.z]]; });
      // 两个角之间要绕过中央面板的（左下 → 左上、左上 → 全景），中间插一帧抬高的中点，先拉高再落下，不贴着「云上大亨」大字低空扫过去
      // 左下 → 左上：中点再往棋盘外侧（−x）挪，镜头顺着左边一列走，中央面板留在画面右边；中点的时刻按两半的路程分，前后两半速度差不多，不先急后缓
      const mid = j => { const p0 = keys[j][0], p1 = keys[j + 1][0], m = p0.map((v, i) => (v + p1[i]) / 2 + [j === 1 ? -1.5 : 0, j === 1 ? 3.5 : 2.5, 0][i]), d = (a, b) => Math.hypot(...a.map((v, i) => v - b[i])), f = d(p0, m) / (d(p0, m) + d(m, p1));
        return [cOut(j) + (cIn(j + 1) - cOut(j)) * f, m, keys[j][1].map((v, i) => (v + keys[j + 1][1][i]) / 2 + (i === 0 && j === 1 ? -1 : 0))]; };
      // 第 0 句「棋盘四个角」：上一章末尾提前 0.5 秒起步，1.4 秒拉到全景（速度峰值落在换章的 whoosh 上）；四个角依次亮一下，最后一个角淡出时就起飞去 Startup 扶持
      E.camPath(t, [[S0('corner') - 0.5, ...camAt(S0('corner') - 0.5)], [S0('corner') + 0.9, [0, 21, 16], [-1.2, 0, 0.3]], [A('corner', 0, 1) - 0.25, [0, 21, 16], [-1.2, 0, 0.3]],
        ...keys.flatMap(([kp, kl], j) => [[cIn(j), kp, kl], [cOut(j), kp, kl], ...(j === 1 || j === 2 ? [mid(j)] : [])]), [S1('corner'), [0, 19, 17], [0, 0, 0.5]]]);
    }
    if (on('corner')) {
      const C = [[0, 'Startup 扶持', 'ok'], [14, '维护窗口', 'warn'], [24, 'User Group 活动', 'org'], [38, 'Root 密钥泄露', 'warn']];
      [0, 14, 24, 38].forEach((ci, j) => { if (t < A('corner', 1, 0)) E.highlight(ci, seg(t, A('corner', 0, 0.1 + j * 0.2), A('corner', 0, 0.2 + j * 0.2)) * (1 - seg(t, A('corner', 0, 0.3 + j * 0.2), A('corner', 0, 0.4 + j * 0.2)))); });
      C.forEach(([ci, n, cls], j) => {
        const a0 = A('corner', j + 1, 0), a1 = A('corner', j + 1, 1) + 0.2, P = top(ci), kL = cOut(j), fadeL = 1 - seg(t, kL - 0.3, kL + 0.1);
        if (t < a0 || t > a1) return;
        const u = t - a0;
        E.highlight(ci, seg(u, 0.4, 0.8) * (0.6 + 0.3 * Math.sin(t * 7)) * fadeL);
        E.label('corner' + j, V(P.x, 0.3, P.z - 0.15), `<b>${n}</b>`, win(t, Math.max(a0 + 0.4, cIn(j) - 0.15), ci === 24 ? ugLand : kL, 0.25, 0.25), cls);   // 光点落在角格图标上；User Group 角在 Yuki 落地时让给她的抽奖标签
        if (ci === 0 && u > 0.7) E.coinFly(t, a0 + 0.7, 0.7, V(P.x, 3.2, P.z), P.clone().add(V(0, 0.4, 0)), 10, 0.6);
        // Root 角：红线飞到对角的维护窗口；离开前先熄掉维护窗口的 Impaired，红线再倒着收回去
        if (ci === 38 && u > 0.6) { const A1 = top(38).add(V(0, 0.4, 0)), B1 = top(14).add(V(0, 0.4, 0)); E.arc(t, 'rootjail', [A1, A1.clone().lerp(B1, 0.5).add(V(0, 3.0, 0)), B1], seg(u, 0.6, 1.4) * (1 - seg(t, kL, kL + 0.5)), 0xff3b30); }
        if (ci === 38 && u > 1.4) E.impaired(14, (0.6 + 0.4 * Math.sin(t * 14)) * (1 - seg(t, kL - 0.1, kL + 0.3)));   // 飞到对角的维护窗口
        if (ci === 38) E.label('nogo', V(top(14).x + 0.2, 0.9, top(14).z - 0.3), '<span>不经过起点 · 不领 Credits</span>', win(t, a0 + 1.6, kL + 0.1, 0.25, 0.25), 'warn sm');   // 红线落进维护窗口以后，在维护窗口上补一句
        if (ci === 14 || ci === 38) E.impaired(ci, seg(u, 0.5, 0.8) * (0.6 + 0.4 * Math.sin(t * 14)) * fadeL);
        if (ci === 24) E.label('yug', V(P.x - 0.3, 1.1, P.z), `<span><b>${NAMES[3]}</b> 停在这里抽奖</span><small>抽中 $280（$100～奖池全部，随机）</small>`, win(t, ugLand, kL, 0.3, 0.25), 'org');
        // 奖池的金币在 Yuki 落地前飞进角格，落地那一拍炸开；镜头离开前金币缩小收掉
        if (ci === 24 && t >= ugLand - 0.84) { E.coinFly(t, ugLand - 0.84, 0.6, V(P.x + 2.4, 1.4, P.z + 1.6), P.clone().add(V(0, 0.4, 0)), 5, 1.0); if (t >= ugLand) E.coinBurst(t, ugLand, P.clone().add(V(0, 0.8, 0)), 30, 0.45, 1 - seg(t, kL - 0.5, kL)); }
      });
    }

    // 04 过路费：按小时固定、按请求跟着点数走；整组翻倍、越往后越贵
    if (on('rent')) {
      const g = [1, 18, 34];   // 虫虫集齐的存储组 S3 / EFS / EBS
      g.forEach((i, n) => { E.highlight(i, seg(t, A('rent', 2, 0.1), A('rent', 2, 0.3)) * (0.6 + 0.4 * Math.sin(t * 6))); E.label('g' + i, V(top(i).x, 0.6, top(i).z), `<img src="${I[D.sq[i].icon]}"><span>${D.sq[i].n} <b>×2</b></span>`, win(t, A('rent', 2, 0.3) + n * 0.12, A('rent', 3, 0.05) + n * 0.1, 0.3, 0.25), 'org sm'); });   // 三个 ×2 错开进、错开退
      const g0 = A('rent', 3, 0.2), g1 = A('rent', 3, 0.95), gk = Math.min(2, Math.floor(seg(t, g0, g1) * 3));   // 第 5 / 10 / 15 轮
      // 换轮数时标签先轻轻一沉、在最低点换字，再带着回弹起来，不一帧硬换
      E.label('grow', V(0, 0.4, 1.2), `<span style="font:700 52px 'SF Mono',Menlo,monospace">第 ${[5, 10, 15][gk]} 轮 · 过路费 ×${['1.75', '2.5', '3.25'][gk]}</span>`, win(t, A('rent', 3, 0.15), S1('rent') - 0.75, 0.3, 0.25) * dip(t, [1, 2].map(k => g0 + (g1 - g0) * k / 3)), 'org');   // 主镜头 S1 - 0.75 开走，起步前收完
      // 第 0 句举例：同样一块地，价格、升级、容量不同，过路费差很多（按 index.html 的 baseRent0：买价 × 0.2（BAL.rentBase），1 级 ×5，每份容量 +25%；ECS 按小时计费，没升级就是 $180 × 0.2 = $36）
      const RB = 0.2, r0 = win(t, A('rent', 0, 0.15), A('rent', 1, 0), 0.3, 0.3), r1 = win(t, A('rent', 0, 0.15) + 0.12, A('rent', 1, 0) + 0.12, 0.3, 0.3);   // 两个标签错开 0.12 秒
      E.label('rr', V(top(10).x, 1.0, top(10).z), '<span>RDS $280 · 多 AZ + 1 个只读节点<small>过路费 $56 × 5 × 1.25 = <b>$350</b></small></span>', r0, 'org sm');
      E.label('rl2', V(top(21).x, 1.0, top(21).z), `<span>ECS $${P(21)} · 没升级<small>过路费 <b>$${Math.round(P(21) * RB)}</b></small></span>`, r1, 'ok sm');
      // 第 1 句：同一把骰子，同样 $100 的两块服务：EC2 按小时计费，过路费固定；AgentCore 按请求计费，过路费 = 买价 × 0.2 × 点数 ÷ 7（baseRent0 里 bill 'req' 才乘点数），掷 7 点（平均）和固定的一样
      // 点数依次换成 4、10、7：两个标签同时轻轻一沉、在最低点换字，左边的数不变，右边的跟着变，最后停在平均的 7 点；游戏里格子详情也写「骰子点数 × 单价」
      const hr = 19, rq = 2, dv = [4, 10, 7], dts = RLD, dk = dts.filter(x => t >= x).length, nd = dk ? dv[dk - 1] : 0;
      const hR = Math.round(P(hr) * RB), qB = P(rq) * RB, ptxt = n => `掷 ${n} 点${n === 7 ? '（平均）' : ''}`;
      const b0 = A('rent', 1, 0.05), b1 = A('rent', 2, 0) + 0.1;
      E.label('rfix', V(top(hr).x, 1.0, top(hr).z), `<span>${D.sq[hr].n} $${P(hr)} · 按小时计费 · <b>固定 $${hR}</b><small>${nd ? `${ptxt(nd)}：$${hR}` : '和掷几点无关'}</small></span>`, win(t, b0 + 0.1, b1, 0.3, 0.25) * dip(t, dts), 'ok sm');
      E.label('rreq', V(top(rq).x, 1.0, top(rq).z), `<span>${D.sq[rq].n} $${P(rq)} · 按请求计费 · <b>点数 × $${(qB / 7).toFixed(1)}</b><small>${nd ? `${ptxt(nd)}：$${Math.round(qB * nd / 7)}` : '跟着骰子点数走'}</small></span>`, win(t, A('rent', 1, 0.4), b1 + 0.1, 0.3, 0.25) * dip(t, dts), 'org sm');
    }

    // 04 有效架构：ELB → EC2 → RDS，Yuki 落到 ELB 按整套付
    const P20 = top(20).add(V(0, 0.3, 0)), P19 = top(19).add(V(0, 0.3, 0)), P10 = top(10).add(V(0, 0.3, -0.5));   // 终点落在 RDS 两块蓝色 AZ 方块中间，不从韩叔的棋子身上穿过去
    // 橙色三层 Web 线画出来以后一直留在棋盘上（常驻），片尾跟着镜头拉远倒着收回去，不在换章那一帧消失
    // S3 那段近景里这条线会从画面左上角大弧度扫过、和 GuardDuty 那条琥珀色线混在一起：推近时倒着收起来，飞回全景时再画回去
    const t3h = seg(t, A('inc', 3, 0) - 0.75, A('inc', 3, 0) - 0.15) * (1 - seg(t, S1('inc') - 0.2, S0('rei') + 1.0));
    const t3s = 1 - seg(t, storm + 0.3, storm + 1.0);   // 战略并购买走 ELB 以后韩叔的三层 Web、高可用入口都散了：橙线倒着收回去
    if (t >= S0('arch')) E.arc(t, 'tier3', [P20, P20.clone().lerp(P19, 0.5).add(V(0, 0.45, 0)), P19, P19.clone().lerp(P10, 0.5).add(V(0, 1.6, 0)), P10], seg(t, A('arch', 1, 0.3), A('arch', 1, 0.95)) * (1 - seg(t, S0('end') - 0.8, S0('end'))) * (1 - t3h) * t3s);
    // 三层 Web 标签只在近景里出：镜头拉到全景前（和 apay 一起）收掉。全景里标签会被挤到画面左边、盖住左列的 ELB、EC2；可选的 Route 53 由 opt53 标签讲
    E.label('arch', P19.clone().lerp(P10, 0.5).add(V(0, 1.6, 0)), '<span>有效架构 · <b>经典三层 Web</b></span><small>ELB → EC2 → RDS</small>', win(t, A('arch', 1, 0.6), c('arch', 3, 0) - 0.35, 0.3, 0.25), 'org');
    // 可选的 Route 53 接进三层 Web：橙线从 Route 53 拉到 ELB（和三层 Web 同色，常驻到片尾，S3 近景时一起收起来）
    if (t >= b53 + 0.3) { const P37 = top(37).add(V(0, 0.3, 0)); E.arc(t, 'tier3o', [P37, P37.clone().lerp(P20, 0.5).add(V(0, 2.4, 0)), P20], seg(t, b53 + 0.3, b53 + 1.1) * (1 - seg(t, S0('end') - 0.8, S0('end'))) * (1 - t3h) * t3s); }
    E.label('opt53', V(top(37).x, 1.0, top(37).z), '<span>可选：<b>Route 53</b> · 有就一起收</span><small>没有它，ELB + EC2 + RDS 也照样成立</small>', win(t, b53 + 1.75, A('arch', 4, 0) + 0.1, 0.3, 0.25), 'ok sm');   // 买下 Route 53 的标签退完再在原地出来   // 锚在橙线 EC2 → RDS 那段抬高的控制点上（CatmullRom 经过控制点）：光点落在线上，镜头拉到全景时跟着线走
    if (t >= A('arch', 2, 0.45) && t < S1('arch')) E.coinFly(t, A('arch', 2, 0.45), 1.4, top(10).add(V(0.2, 0.6, 0.3)), top(19).add(V(0, 0.9, 0)), 14, 1.0);
    // 标签右端收在虫虫棋子底座左边（按底座一圈投影到屏幕的最左点算，镜头拉远时跟着走），不压住他的下半身；光点（--dx）仍落在 Damo 的绿棋子上，标签仍在要点卡下方
    { const sr = E.safeR, sb = E.safeRB, Q = top(ps[1] % 48); E.camera.updateMatrixWorld(true); let px = E.SW;
      for (let j = 0; j < 12; j++) { const a = j * Math.PI / 6; px = Math.min(px, (V(Q.x + 0.18 + 0.26 * Math.cos(a), Q.y + 0.05, Q.z + 0.18 + 0.26 * Math.sin(a)).project(E.camera).x + 1) / 2 * E.SW); }
      E.safeR = Math.min(E.SW, px - 6); E.safeRB = E.SH;
      E.label('apay', V(top(10).x + 0.18, 0.6, top(10).z + 0.05),   // 比原来低 40 px 左右：上沿落到要点卡下沿下面，下沿还在近景骰子上面
         `<span>${NAMES[2]} 落在 RDS</span><small>ELB + EC2 + RDS 三块加起来付给${NAMES[0]}</small>`, win(t, A('arch', 2, 0.3), c('arch', 3, 0) - 0.35, 0.3, 0.25), 'warn'); E.safeR = sr; E.safeRB = sb; }   // 镜头起步前收完，不跟着锚点一边淡出一边滑
    const more = seg(t, A('arch', 4, 0) - 0.1, A('arch', 4, 1)) * (1 - seg(t, A('arch', 5, 0) - 0.2, A('arch', 5, 0) + 0.4));   // 「还有很多种架构」这句才画（可选 Route 53 那句的标签先收掉），讲串联收费前收掉
    if (t >= A('arch', 4, 0) - 0.1 && t < A('arch', 5, 0) + 0.4) {
      const a1 = [top(22), top(7), top(40)].map(p => p.add(V(0, 0.3, 0))), a2 = [top(37), top(16), top(1)].map(p => p.add(V(0, 0.3, 0)));
      E.arc(t, 'sls', [a1[0], a1[0].clone().lerp(a1[1], 0.5).add(V(0, 3, 0)), a1[1], a1[1].clone().lerp(a1[2], 0.5).add(V(0, 3.5, 0)), a1[2]], more, 0x00a6a6);   // 避开玩家色和橙色的三层 Web
      E.arc(t, 'web', [a2[0], a2[0].clone().lerp(a2[1], 0.5).add(V(0, 3.5, 0)), a2[1], a2[1].clone().lerp(a2[2], 0.5).add(V(0, 3.5, 0)), a2[2]], more, 0xe7157b);
      // 两条线从尾巴往回收：Serverless 的标签在后半段，先收；静态网站的标签在前半段，后收；三层 Web 的标签再晚 0.2 秒；进场也错开 0.12 秒
      E.label('sls', a1[1].clone().lerp(a1[2], 0.5).add(V(0, 3.5, 0)), 'Serverless API', win(t, A('arch', 4, 0.4), A('arch', 5, 0) - 0.05, 0.3, 0.25), 'org sm');
      E.label('webl', a2[0].clone().lerp(a2[1], 0.5).add(V(0, 3.5, 0)), '静态网站', win(t, A('arch', 4, 0.4) + 0.12, A('arch', 5, 0) + 0.1, 0.3, 0.25), 'org sm');   // 两个标签锚在各自曲线的抬高控制点上（CatmullRom 经过控制点），光点落在自己那条线上
    }

    // 05 第 0 句「最赚钱的玩法，是组成有效架构」：镜头到位、大号章节标题退场后，ELB、EC2、RDS 三格依次亮一下，接着第 1 句韩叔买下 ELB、EC2
    if (on('arch') && t < A('arch', 1, 0.2)) [20, 19, 10].forEach((i, n) => E.highlight(i, win(t, A('arch', 0, 0.45) + n * 0.25, A('arch', 1, 0.15), 0.3, 0.3) * (0.55 + 0.3 * Math.sin(t * 7))));
    E.label('buyEE', V(top(20).x, 1.0, top(20).z + 0.5), `<span>${NAMES[0]} 买下 <b>ELB + EC2</b> · $${P(20) + P(19)}</span>`, win(t, A('arch', 1, 0.1), A('arch', 1, 0.6), 0.3, 0.3), 'org sm');
    E.label('buy53', V(top(37).x, 1.0, top(37).z), `<span>${NAMES[0]} 买下 <b>Route 53</b> · $${P(37)}</span>`, win(t, b53, b53 + 1.6, 0.3, 0.3), 'org sm');
    E.label('buyCE', V(top(33).x, 1.0, top(33).z), `<span>${NAMES[0]} 买下 <b>Config + EventBridge</b> · $${P(33) + P(23)}</span>`, win(t, bCE, bCE + 1.0, 0.3, 0.3), 'org sm');

    // 05 有效架构 · 串联收费：韩叔再买下 Config、EventBridge，「安全组自动收紧」（EC2 ⇄ Config → EventBridge）和「经典三层 Web」共用 EC2
    // 落在 EC2 上：三层 Web 4 块（Route 53、ELB、EC2、RDS）+ Config + EventBridge = 6 块，EC2 只算一次（index.html 的 jointRent：收得最多的那套全额，其他几套只补多出来的服务）；
    // 「高可用入口」（Route 53 → ELB → EC2）整个包在三层 Web 里，串上也不多收。落在 RDS 只按三层 Web 收 4 块，落在 Config 或 EventBridge 按 3 块收
    if (t >= A('arch', 5, 0)) {
      const c0 = A('arch', 5, 0), Q19 = top(19).add(V(0, 0.3, 0)), Q33 = top(33).add(V(0, 0.3, 0)), Q23 = top(23).add(V(0, 0.3, 0)), HM = Q19.clone().lerp(Q33, 0.5).add(V(0, 2.6, 0));
      const hk = seg(t, c0 + 0.3, c0 + 1.3) * (1 - seg(t, S1('arch') - 0.5, S1('arch') + 0.3));   // 蓝线：讲完串联收费、镜头开走时倒着收回去，后面几章不再从画面上方扫过
      if (hk > 0) E.arc(t, 'ha', [Q19, HM, Q33, Q33.clone().lerp(Q23, 0.5).add(V(0, 1.6, 0)), Q23], hk, 0x2fb6ff);
      if (on('arch')) {
        [37, 20, 19, 10, 33, 23].forEach(i => E.highlight(i, seg(t, c0 + 1.2, c0 + 1.6) * (1 - seg(t, S1('arch') - 0.6, S1('arch') - 0.2)) * (0.55 + 0.35 * Math.sin(t * 7))));   // 章末镜头开走前淡掉
        E.label('chain', V(top(19).x, 0.9, top(19).z), '<span><b>串联收费</b> · 共用的 EC2 只算一次</span><small>落在 EC2 上，按 6 块加起来付</small>', win(t, c0 + 1.2, S1('arch') - 0.5, 0.3, 0.25), 'warn');
        E.label('hal', HM, '<span>安全组自动收紧</span><small>EC2 ⇄ Config → EventBridge</small>', win(t, c0 + 1.35, S1('arch') - 0.6, 0.3, 0.25), 'ok');   // 锚在蓝线 EC2 → Config 那段抬高的控制点上；等「买下 Config + EventBridge」标签（c0 + 1.2 收完）走了再出来，和串联收费错开 0.15 秒进、0.1 秒退
      }
    }

    // 05 运行费：EC2 空着烧钱、Lambda 没人用不花钱、Damo 经过起点
    // 第 0 句「按真实的计费方式持续花钱」：镜头静止的这几秒，虫虫名下画面里的 S3、ECS、Lambda 依次亮一下（三种计费方式，后面几句逐个讲）
    if (on('bill') && t < A('bill', 1, 0.2)) [1, 21, 7].forEach((i, n) => E.highlight(i, win(t, S0('bill') + 1.75 + n * 0.3, A('bill', 1, 0.1), 0.3, 0.3) * (0.55 + 0.3 * Math.sin(t * 7))));
    E.label('run', V(top(21).x, 0.6, top(21).z), `<span><b>实例（EC2、ECS 这类）：空着也交运行费</b><small>${NAMES[1]}的 ECS 每圈 $5</small></span>`, win(t, A('bill', 1, 0.1), A('bill', 3, 0.1), 0.3, 0.3), 'warn');
    const pass = A('bill', 3, 0.05) + 1 * 0.22;
    // 一行的短标签、锚低一点：落在中央示意图那排字和底排格子之间，不横穿 Route 53 … RDS 的字；15% 请求费写在要点卡里。Damo 经过起点的标签（pass）出来前 0.3 秒收完
    E.label('sls0', V(top(7).x, 0.45, top(7).z - 0.2), '<b>Lambda 没人用 $0</b><small>有人调用才计费</small>', win(t, A('bill', 2, 0.1), pass - 0.3, 0.3, 0.3), 'ok sm');
    if (on('bill') && t >= pass) { E.coinFly(t, pass, 0.7, V(top(0).x, 2.5, top(0).z + 1.5), top(0).add(V(0, 0.2, 0)), 10, 1.0); E.coinFly(t, pass + 1.3, 0.7, top(0).add(V(0, 0.6, 0)), V(top(0).x - 2, 2.5, top(0).z - 2.5), 6, 1.0); }
    E.label('cred', V(top(0).x - 0.6, 0.9, top(0).z + 0.6), `<span>${NAMES[2]} 经过起点 <b>+$200</b></span><small>交这一圈运行费</small>`, win(t, pass, S1('bill') - 0.4, 0.3, 0.25), 'ok');   // 主镜头 S1 - 0.4 开走，起步前收完

    // 06 Health 事件：一个 AZ 断电了（卡牌等大号章节标题 cur.start + 1.7 退场了再飞进来，re:Invent 卡同理）
    if (on('inc')) {
      const inK = easeOut(seg(t, S0('inc') + 1.5, S0('inc') + 2.2)), out = ease(seg(t, A('inc', 1, 0.05), A('inc', 1, 0.3)));
      E.card('az', D.cards.az, { x: -0.35, y: -6 * (1 - inK) + out * 8, flip: ease(seg(t, S0('inc') + 1.7, S0('inc') + 2.5)), s: 0.95, alpha: 1 - out });   // 往上退并淡出，不穿过字幕
      // 虫虫名下单 AZ 的实例只有 EBS（EBS 卷永远单 AZ）：变成 Impaired，一直到第 3 句换成 S3 的例子；推近 S3 的镜头 A(inc, 3) - 0.75 起步，起步前收完
      // 他的 ECS 不受影响：index.html 的 singleAZ 把 ECS 排除在外（ECS 服务默认把任务分散到多个 AZ），旁边标一句做对比
      [34].forEach((i, n) => { const k = seg(t, A('inc', 1, 0.35), A('inc', 1, 0.5)) * (1 - seg(t, A('inc', 3, 0) - 1.15 + n * 0.1, A('inc', 3, 0) - 0.9 + n * 0.1)); if (k > 0) { E.impaired(i, k); E.label('imp' + i, V(top(i).x, 0.95, top(i).z), `${D.sq[i].n.replace('Amazon ', '')} · <b>Impaired</b>`, win(t, A('inc', 1, 0.4) + n * 0.1, A('inc', 3, 0) - 0.95 + n * 0.1, 0.3, 0.25), 'warn sm'); } });
      E.label('ecsok', V(top(21).x, 0.45, top(21).z), '<span>ECS 不受影响</span><small>默认跨 AZ 分散任务</small>', win(t, A('inc', 1, 0.55), A('inc', 2, 0.05) - 0.1, 0.3, 0.3), 'ok sm');
      // 两张 Health 卡都是从 12 号「Health 事件」格抽的（虫虫的棋子这时停在 6 号「忘关的 EC2」，账单格不抽卡）：标签锚在 Health 事件格上，格子跟着亮
      const dA = win(t, A('inc', 1, 0.3), A('inc', 2, 0.05), 0.3, 0.25), qA = win(t, A('inc', 2, 0.05) + 0.05, A('inc', 2, 0.5), 0.3, 0.3);
      E.highlight(12, Math.max(win(t, S0('inc') + 1.7, A('inc', 2, 0.05), 0.4, 0.25), qA) * (0.55 + 0.3 * Math.sin(t * 7)));
      E.label('drawer', V(top(12).x, 2.4, top(12).z), `<span>${NAMES[1]} 抽到「一个 AZ 断电了」</span><small>他名下单 AZ 的实例变成 Impaired</small>`, dA, 'warn');   // 在原地换成下一张卡的标签：先退完、隔 0.05 秒再进，不叠成双层字
      { const w0 = A('inc', 1, 0.2), u = seg(t, w0, w0 + 1.1); if (u > 0 && u < 1) E.shockwave('azwave', 0, 0.3, u * 12, 0.85 * (1 - u)); }
      E.shieldX('rds', 10, seg(t, A('inc', 1, 0.25), A('inc', 1, 0.45)), { color: 0x4aa3ff, ripple: seg(t, A('inc', 1, 0.42), A('inc', 1, 0.62)), r: 0.8 });   // 只罩住 RDS
      E.label('sh', V(top(10).x, 1.0, top(10).z + 0.3), `<img src="${I.region}"><span>对比：${NAMES[0]}的 RDS 做了<b>多 AZ</b>，抽到也免疫</span>`, win(t, A('inc', 1, 0.45), A('inc', 2, 0.05) - 0.1, 0.3, 0.3), 'ok');
      // 停一轮的卡交钱照常走（「服务配额用完了」这张卡没有托管选项，所以这里不演托管）
      E.label('quota', V(top(12).x, 2.4, top(12).z), `<span>${NAMES[1]} 又抽到「服务配额用完了」</span><small>停一轮，或交 <b>$80</b> 加急提额照常走</small>`, qA, 'org');   // 交的钱从他的棋子飞出去
      if (t >= A('inc', 2, 0.5)) E.coinFly(t, A('inc', 2, 0.5), 0.9, top(6).add(V(0, 0.8, 0)), V(0, 0.6, 0), 8, 1.4);
    }

    // 07 re:Invent：好事卡，再换成社交卡
    if (on('rei')) {
      const sw = A('rei', 1, 0);
      D.cards.good.forEach((cd, n) => { const a = S0('rei') + 1.4 + n * 0.18, k = easeOut(seg(t, a, a + 0.55)), out = ease(seg(t, sw - 0.3, sw + 0.2));
        E.card('g' + n, cd, { x: (n - 1) * 2.0 - 0.3, y: -6.5 * (1 - k) + out * 7 - 0.2, flip: ease(seg(t, a + 0.2, a + 0.7)), rot: (n - 1) * -0.06, s: 0.66, z: -9, alpha: 1 - out }); });   // 和 Health 事件卡、技能卡一样往上退并淡出，不从字幕条后面穿过
      // 字幕只念了三张社交卡：踩坑大会、白板画架构、技术分享会（「服务名接龙」11-07 换成了 Jam 闯关，build.mjs 的 filter(Boolean) 把它滤掉，第三张就是技术分享会；promo.js 还要用 4 张，所以在这里过滤 Office Hours，不改 build.mjs）
      // 第 3 句之前和好事卡一样往上退并淡出（错开 0.06 秒），让出棋盘给后两句的抽卡价钱
      D.cards.social.filter(c => c.n !== 'Office Hours').forEach((cd, n) => { const a = sw + n * 0.16, k = easeOut(seg(t, a, a + 0.55)), out = ease(seg(t, A('rei', 3, 0) - 0.55 + n * 0.06, A('rei', 3, 0) - 0.05 + n * 0.06));
        if (t >= a && out < 1) E.card('s' + n, cd, { x: (n - 1) * 2.0 - 0.3, y: -6.5 * (1 - k) + out * 7 - 0.2, flip: ease(seg(t, a + 0.25, a + 0.75)), rot: (n - 1) * -0.06, s: 0.62, z: -9, alpha: 1 - out }); });
      // 第 3、4 句：没停在卡牌格也能花钱抽卡。只演价钱（index.html 的 reiBuyCost / incSendCost），不真的扣钱：真扣了韩叔的总资产会变，第二个价就不是 $80 × 1.5 了
      // 韩叔的总资产 HAN_NET = 现金 $663 + 服务和升级 $1260 = $1923（资金条上这时是 $663）；Damo 的棋子停在 4 号 VPC
      const r3 = A('rei', 3, 0.1), r4 = A('rei', 4, 0.1), rEnd = S1('rei') - 0.5, PD = top(ps[2] % 48);
      E.highlight(10, win(t, r3, r4, 0.3, 0.3) * (0.55 + 0.3 * Math.sin(t * 7)));
      E.label('rbuy', V(top(10).x, 1.3, top(10).z), `<img src="${I.reinvent}"><span>${NAMES[0]} 总资产 $${HAN_NET}<small>自己抽一张 re:Invent 卡：4% → <b>$${REI_BUY}</b></small></span>`, win(t, r3, rEnd, 0.3, 0.25), 'org');
      E.label('rsend', V(PD.x, 1.3, PD.z), `<img src="${I.health}"><span>让 ${NAMES[2]} 抽一张 Health 卡<small>$${REI_BUY} × 1.5 → <b>$${INC_SEND}</b> · 每走一圈一次</small></span>`, win(t, r4, rEnd + 0.1, 0.3, 0.25), 'warn');
    }

    // 08 边玩边答题：虫虫落到韩叔的 RDS，先答题，答对过路费减半
    if (on('quiz')) {
      // 答题框挪到 RDS 和要点卡之间（left 460、宽 700），不盖住左下的 RDS 和落地的棋子
      const box = (key, html, a, w = 700) => { const e = E.show(key, 'xquiz', html, a, `translateY(${(1 - a) * 30}px)`); e.style.left = '460px'; e.style.width = w + 'px'; return e; };
      // 第 0 句：开局页打开「边玩边答题」
      const sa = win(t, S0('quiz') + 1.75, A('quiz', 1, 0.05), 0.35, 0.3), sw1 = t >= A('quiz', 0, 0.7);   // 等中间的大章节标题退场再出来
      box('qset', `<div class="qh"><img src="${I.training}">开局设置<span>开局页</span></div>${[['人数', '4 人'], ['难度', '入门局'], ['边玩边答题', sw1 ? '开' : '关']].map(([a, b], n) => `<div class="qo${n === 2 && sw1 ? ' ok' : ''}"><b>${n + 1}</b>${a}<span style="margin-left:auto">${b}</span></div>`).join('')}`, sa, 520);
      // 第 1 句：虫虫跳 4 格落到韩叔的 RDS（约 0.9 秒），落地以后再出题
      const sr = E.safeR; E.safeR = 450;   // 这个标签收在答题框左边（引线仍指着 RDS）
      E.label('qland', V(top(10).x, 1.2, top(10).z), `<span>${NAMES[1]} 落到${NAMES[0]}的 RDS<small>三层 Web 带上 Route 53：$${QRENT}<br>答对减半 → <b>$${QHALF}</b></small></span>`, win(t, A('quiz', 1, 0) + 0.9, A('quiz', 1, 0.75) + 0.6, 0.3, 0.3), 'warn'); E.safeR = sr;
      const q = D.quizDb || D.quiz, order = [2, 0, 3, 1], ok = t >= A('quiz', 1, 0.55), qa = win(t, A('quiz', 1, 0) + 1.0, A('quiz', 2, 0.1), 0.35, 0.3);
      // 错的选项只调暗（不用 class="dim"，全局 .dim 是整屏背景，会把选项画成渐变条）
      box('quiz', `<div class="qh"><img src="${I.rds}">边玩边答题 · 数据库组<span>${NAMES[1]} 付过路费前</span></div><p>${q.q}</p>${order.map((k, n) => `<div class="qo${ok && k === 0 ? ' ok' : ''}" style="opacity:${ok && k !== 0 ? 0.4 : 1}"><b>${'ABCD'[n]}</b>${q.o[k]}</div>`).join('')}<div class="qa" style="opacity:${ok ? 1 : 0}">答对了！过路费减半 · ${q.a}</div>`, qa);
      // 第 2 句：学习模式全程必答题，认证练习题库依次亮起
      const ba = win(t, A('quiz', 2, 0.1), A('quiz', 3, 0) + 0.1, 0.35, 0.3);   // 第 3 句换成出题挑战的框
      box('qbank', `<div class="qh"><img src="${I.training}">学习模式 · 全程必答题<span>另有认证练习题库</span></div>${[['CLF-C02', '云从业者', 0.37], ['SAA-C03', '解决方案架构师助理', 0.5], ['AIF-C01', 'AI 从业者', 0.68]].map(([c, n, f], j) => `<div class="qo${t >= A('quiz', 2, f) ? ' ok' : ''}" style="opacity:${t >= A('quiz', 2, f) ? 1 : 0.4}"><b>${j + 1}</b>${n}<span style="margin-left:auto;font:700 24px 'SF Mono',Menlo,monospace">${c}</span></div>`).join('')}`, ba);
      if (t >= A('quiz', 1, 0.75)) E.coinFly(t, A('quiz', 1, 0.75), 0.8, top(10).add(V(0.3, 0.6, 0.3)), top(10).add(V(-0.2, 0.6, -0.4)), 5, 1.2);
      // 第 3 句：出题挑战。韩叔花 $100 出题考 Damo（index.html 的 quizChallenge：按 Damo 所在格的色组出题），Damo 答错，赔韩叔 $200（答对的话韩叔那 $100 归他）
      const ca = win(t, A('quiz', 3, 0) + 0.25, S1('quiz'), 0.35, 0.3), cw = A('quiz', 3, 0.78), wrong = t >= cw;
      box('qch', `<div class="qh"><img src="${I.training}">出题挑战 · ${NAMES[0]} 考 ${NAMES[2]}<span>考一位对手 · 每局一次</span></div>${[['花 $100 出一道题', 0], ['答对：这 $100 归他', 1], ['答错：他赔你 $200', 2]].map(([a, n]) => `<div class="qo${wrong && n === 2 ? ' ok' : ''}" style="opacity:${t >= A('quiz', 3, [0.25, 0.5, 0.62][n]) && !(wrong && n === 1) ? 1 : 0.4}"><b>${n + 1}</b>${a}</div>`).join('')}<div class="qa" style="opacity:${wrong ? 1 : 0}">${NAMES[2]} 答错了，赔${NAMES[0]} $${CH_WIN}</div>`, ca);
      if (wrong) E.coinFly(t, cw, 0.9, top(ps[2] % 48).add(V(0, 0.8, 0)), top(10).add(V(0, 0.6, 0)), 8, 1.4);
    }

    // 专属技能卡底部的两步：engine.js 的 skillTexture 写死了「1 风暴接入 → 2 角色技能」和卡底一行 S T O R M   A C C E S S（宣传片还在用，共用代码不动）。
    // 现在是先结算角色自己的技能、再「战略并购」（index.html 的 STORM_TXT），这个叫法也已经不用了：卡第一次建好时，在讲解里按原来的底色、网格把这一块重画成
    // 「1 角色技能 → 2 战略并购」，卡底那行字去掉。框、圆点、字号、颜色、换行规则都照 skillTexture / wrap 抄（卡面 756 × 1056，8K 导出时画布已经按 TEX 放大、上下文已经 scale 过）
    const skillSteps = grp => {
      const tex = grp.children[0].material.map, g = tex.image.getContext('2d'), w = 756, h = 1056;
      const FONT = `'Amazon Ember',-apple-system,BlinkMacSystemFont,'Helvetica Neue','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif`, NOHEAD = /^[，。、；：！？）」』…,.;:!?)\]%]/;
      const wrap = (s, maxW) => { const toks = String(s).match(/[A-Za-z0-9$%+.\-–'’:/&#]+|\s+|./gu) || [], lines = []; let cur = ''; const push = () => { if (cur.trim()) lines.push(cur.trimEnd()); cur = ''; };
        for (const tk of toks) { if (!cur && !tk.trim()) continue; if (!cur || g.measureText(cur + tk).width <= maxW) { cur += tk; continue; }
          if (NOHEAD.test(tk)) { if (cur.length > 1 && /[㐀-鿿]$/.test(cur)) { const ch = cur.slice(-1); cur = cur.slice(0, -1); push(); cur = ch + tk; } else cur += tk; continue; }
          if (g.measureText(tk).width > maxW) { for (const ch of tk) { if (cur && g.measureText(cur + ch).width > maxW) push(); cur += ch; } continue; }
          push(); if (tk.trim()) cur = tk; }
        push(); return lines; };
      const text = (s, x, y, { size = 28, wt = 400, color = '#fff', align = 'left', lh = 1.4, max = 0 } = {}) => { g.font = `${wt} ${size}px ${FONT}`; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'alphabetic'; (max ? wrap(s, max) : [s]).forEach((l, k) => g.fillText(l, x, y + k * size * lh)); };
      const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#2a1606'); bg.addColorStop(0.45, '#121826'); bg.addColorStop(1, '#0b111c');
      const wipe = (x, y, rw, rh) => { g.save(); g.beginPath(); g.rect(x, y, rw, rh); g.clip(); g.fillStyle = bg; g.fillRect(x, y, rw, rh); g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 2;
        for (let gx = 0; gx < w; gx += 42) { g.beginPath(); g.moveTo(gx, 0); g.lineTo(gx, h); g.stroke(); } for (let gy = 0; gy < h; gy += 42) { g.beginPath(); g.moveTo(0, gy); g.lineTo(w, gy); g.stroke(); } g.restore(); };   // 这一块在发光圈（半径 420）外面，只有渐变底和网格
      wipe(40, 812, w - 80, 166); wipe(120, 996, w - 240, 36);
      const step = (x, n, a, b2) => { g.fillStyle = 'rgba(255,255,255,.06)'; g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 2; g.beginPath(); g.roundRect(x, 820, 300, 150, 12); g.fill(); g.stroke();
        g.fillStyle = '#ec7211'; g.beginPath(); g.arc(x + 34, 856, 20, 0, 7); g.fill(); text(n, x + 34, 866, { size: 26, wt: 800, align: 'center' });
        text(a, x + 66, 866, { size: 28, wt: 800 }); text(b2, x + 22, 912, { size: 23, color: '#cfd6df', max: 260, lh: 1.35 }); };
      step(46, '1', '角色技能', D.skill.e2 || D.skill.e); step(w - 346, '2', '战略并购', '按卖回价买下总资产最高的对手的一块服务');
      g.fillStyle = '#ffb36b'; g.beginPath(); g.moveTo(w / 2 - 12, 880); g.lineTo(w / 2 + 14, 895); g.lineTo(w / 2 - 12, 910); g.fill();
      tex.needsUpdate = true;
    };

    // 09 专属技能：Damo 快不行了，发动「上架 Marketplace」
    if (on('skill')) {
      // 发动线 = 角色卡开局资金的一半（后走补贴不算）；Damo 的总资产 = 现金 DAMO_LOW + DMS、Redshift 的买价。第 4 轮发动：技能金额还是基础金额（第 5 轮起跟着流量涨）
      E.label('low', V(top(ps[2] % 48).x, 1.5, top(ps[2] % 48).z), `<span>几轮之后（第 4 轮）：${NAMES[2]} 总资产只剩 $${DAMO_LOW + P(28) + P(13)}</span><small>低于开局 $${RC[2]} 的一半（$${Math.round(RC[2] / 2)}）</small>`, win(t, S0('skill') + 1.7, A('skill', 2, 0.03), 0.3, 0.3), 'warn');
      // 第 2 句前半「先结算角色自己的技能」：同一个位置换成第一步的标签（SaaS 的「上架 Marketplace」当下只记下 4 次订阅费），念到「再按卖回价」时让给战略并购
      E.label('sk1', V(top(ps[2] % 48).x, 1.5, top(ps[2] % 48).z), `<span>先结算角色技能：<b>上架 Marketplace</b></span><small>订阅费从下一回合开始收</small>`, win(t, A('skill', 2, 0.08), storm + 0.05, 0.3, 0.25), 'org');
      // 第 2 句「先结算角色自己的技能，再按卖回价，买下……」：念到「再按卖回价」（storm）时演战略并购：ELB 亮起、金币从 Damo 飞到韩叔的 ELB、ELB 换成 Damo 的
      // 游戏里先结算角色技能、再战略并购（index.html 的 roleSkill0）：第 2 句前半先标出第一步，后半演收购；SaaS 的订阅费下一回合才收，第 3 句再出技能卡和订阅费
      E.highlight(20, seg(t, storm - 0.1, storm) * (1 - seg(t, A('skill', 3, 0), A('skill', 3, 0.3))));
      if (t >= storm - 0.05) E.coinFly(t, storm - 0.05, 1.1, top(ps[2] % 48).add(V(0, 0.8, 0)), top(20).add(V(0, 0.6, 0)), 10, 3.5);
      E.label('storm', V(top(20).x, 0.5, top(20).z), `<span>再战略并购：买下总资产最高的${NAMES[0]}的 <b>ELB</b></span><small>按卖回价 $${Math.round(P(20) * XC.sell)}，钱付给${NAMES[0]}</small>`, win(t, storm, A('skill', 3, 0), 0.3, 0.3), 'org');   // 技能卡落下之前收掉
      // 技能卡从上面落下；对手付订阅费前缩小、往上让开，露出付钱的人；退场往上走，不穿过字幕
      const ck = A('skill', 3, 0.05), inK = easeOut(seg(t, ck, ck + 0.6)), out = ease(seg(t, S1('skill') - 0.8, S1('skill') - 0.3)), sh = ease(seg(t, A('skill', 3, 0.35), A('skill', 3, 0.5)));
      if (t >= ck) { const n0 = E.camera.children.length; E.card('skill', D.skill, { x: -0.35, y: 6 * (1 - inK) + 0.9 * sh + out * 3.5, flip: ease(seg(t, ck + 0.2, ck + 0.9)), s: 0.8 - 0.25 * sh, alpha: 1 - out });
        const cg = E.camera.children[n0]; if (cg && !cg.userData.steps) { skillSteps(cg); cg.userData.steps = 1; } }   // 这一帧刚建好的卡（engine 把卡挂在镜头下面）：重画一次底部两步
      E.label('sub1', V(top(ps[2] % 48).x, 1.4, top(ps[2] % 48).z), `<span>${NAMES[2]} 的下一回合开始</span><small>第 1 / 4 次订阅费，每位对手 $150</small>`, win(t, A('skill', 3, 0.5), S1('skill') - 0.5, 0.3, 0.25), 'org sm');   // 订阅费从下一回合开始收，不是发动当下
      if (t >= A('skill', 3, 0.5)) [0, 1, 3].forEach((k, n) => E.coinFly(t, A('skill', 3, 0.5) + n * 0.25, 0.9, top(ps[k] % 48).add(V(0, 0.8, 0)), top(ps[2] % 48).add(V(0, 0.6, 0)), 6, 2.6));
    }

    // 06 Health 事件第 3 句：S3 桶被设成公开 —— 虫虫有 GuardDuty，发现得早，只赔一半（每位其他玩家 $25）；没防住的赔 $50。
    // 按 index.html：免疫要 KMS 客户托管密钥、CloudFront 源访问控制、Config 自动修正这类数据保护（虫虫都没有）；只有 GuardDuty 是减损、不算免疫，也不用开 S3 保护。所以这里不罩护盾，S3 格亮一下琥珀色表示「发现了」，再演赔钱
    if (on('inc') && SG.inc.subs.length > 3 && t >= A('inc', 3, 0) - 0.75) {
      const u = t - A('inc', 3, 0), S3 = top(1), GD = top(15), up = seg(u, 1.4, 1.8), uEnd = S1('inc') - 0.45 - A('inc', 3, 0), pay = A('inc', 3, 0.55);
      // 推近虫虫的 S3：第 2 句念完前一点起步，1.35 秒推近；S1 - 0.45 起交给飞回全景的那段（见摄像机），这里不再管
      if (t < S1('inc') - 0.45) E.camPath(t, [[A('inc', 3, 0) - 0.75, [0, 17, 17], [0, 0, 0.6]], [A('inc', 3, 0) + 0.6, [9.6, 6.6, 13.2], [3.2, 0.4, 4.2]], [S1('inc') - 0.45, [9.8, 6.8, 13.4], [3.2, 0.4, 4.2]]]);
      // 数据往外漏的红点：GuardDuty 发现以后（up）不再往外飞，原地淡掉
      for (let j = 0; j < 16; j++) { const st = 0.7 + j * 0.05; if (u < st) continue; const a = j * 2.4, d = Math.min(up > 0 ? 1.0 : 9, (u - st) * 2.4), fade = up > 0 ? 1 - seg(u, 1.8, 2.2) : 1;
        if (fade > 0) E.bit(V(S3.x + Math.cos(a) * d, 0.3 + d * 0.8, S3.z + Math.sin(a) * d * 0.8), '#ff3b30', 0.12 * fade); }
      if (u >= 1.0) E.arc(t, 'gds3', [GD.clone().add(V(0, 0.4, 0)), GD.clone().lerp(S3, 0.5).add(V(0, 3.2, 0)), S3.clone().add(V(0, 0.5, 0))], seg(u, 1.0, 1.6) * (1 - seg(t, S1('inc') - 0.85, S1('inc') - 0.45)), 0xffb020);   // GuardDuty 那条线：章末收线，镜头飞回全景前收完
      E.highlight(1, win(u, 1.6, uEnd, 0.3, 0.4) * (0.45 + 0.25 * Math.sin(t * 7)));
      // 赔钱：虫虫的棋子飞出三笔金币，各 $25，落到另外三人的棋子上（Yuki 在画外的 User Group 角，金币往左上飞出画面）
      if (t >= pay) [0, 2, 3].forEach((k, n) => E.coinFly(t, pay + n * 0.2, 0.9, top(ps[1] % 48).add(V(0, 0.8, 0)), top(ps[k] % 48).add(V(0, 0.6, 0)), 5, 1.6));
      // 两个标签都是两行、锚在 S3 右上方的空地上，不压棋子的头
      E.label('s3leak', V(S3.x + 0.9, 1.2, S3.z), '<span><b>虫虫的 S3</b> 桶被设成公开<small>数据往外漏</small></span>', win(u, 0.7, 1.8, 0.25, 0.25), 'warn');
      E.label('s3gd', V(S3.x + 0.9, 1.3, S3.z), `<img src="${I.guardduty}"><span><b>GuardDuty 发现得早</b> · 只赔一半<small>赔每位其他玩家 $25（没防住的赔 $50）</small></span>`, win(u, 1.8, uEnd, 0.3, 0.25), 'org');
    }

    // 08 re:Invent 卡：Yuki 停在 27 号 re:Invent 格，抽到「Hackathon 拿了奖」，给 OpenSearch 免费加 1 个数据节点（容量块一直留到她变卖为止）
    // 这个机位里上排格子紧贴着顶上的资金条，标签锚在格子上会被顶到上排、盖住 24–27 号格和 Yuki：改成不带引线的横幅（title），放在上排和三张卡之间的空白里，
    // 27 号格跟着亮起来指出是哪一格（Yuki 站在上面）
    if (on('rei')) { const ya = win(t, S0('rei') + 1.2, A('rei', 1, 0) - 0.2, 0.3, 0.3);
      E.highlight(27, ya * (0.55 + 0.3 * Math.sin(t * 7)));
      E.label('yhack', V(top(27).x + 0.3, 0.9, -0.95), `<span><b>${NAMES[3]}</b> 停在 re:Invent 格，抽到「Hackathon 拿了奖」<small>免费给 OpenSearch 加 1 个数据节点，过路费 +25%</small></span>`, ya, 'ok sm title'); }
    if (t >= S0('rei') + 1.6 && t < sold + 0.3) { const k = E.easeBack(seg(t, S0('rei') + 1.6, S0('rei') + 2.0)) * (1 - seg(t, sold, sold + 0.3)), Q = top(44); E.bit(V(Q.x - 0.69, 0.27, Q.z + 0.24), '#9b5cf6', 0.18 * k); }   // 和升级块排成一列；卖回时跟着紫框一起缩掉

    // 10 缺钱和破产：Yuki 的服务一步步变卖
    if (on('broke')) {
      E.label('debt3', V(top(43).x, 1.9, top(43).z), `<span>${NAMES[3]} 现金只有 $150，欠了 <b>$2400</b><small>几轮之后：先欠${NAMES[0]} $1600，又欠${NAMES[1]} $800</small></span>`, win(t, S0('broke') + 1.75, A('broke', 0, 0.6), 0.3, 0.3), 'warn');   // 等大号章节标题（S0 + 1.7）退场了再出，不和它挤在一起
      // 去掉升级：和「退一半」标签一起，上面一块先、下面一块后沉进格子里（E.upgrade 的进度大于 1 时块往下沉，到 1.5 整块没进格子）
      { const q1 = seg(t, unUp, unUp + 0.3), q0 = seg(t, unUp + 0.15, unUp + 0.45); if (q1 < 1) E.upgrade(44, 3, 2, 1 + 0.5 * q1); if (q0 < 1) E.upgrade(44, 3, 1, 1 + 0.5 * q0); }
      E.highlight(44, win(t, A('broke', 0, 0.15), A('broke', 1, 0.9), 0.3, 0.3) * (0.6 + 0.3 * Math.sin(t * 7)));
      E.label('b1', V(top(44).x + 0.5, 0.5, top(44).z), '去掉升级 <b>退一半</b>', win(t, unUp, A('broke', 0, 0.6), 0.3, 0.3), 'org sm');   // 等大号章节标题退场再弹出来
      E.label('b2', V(top(25).x, 1.3, top(25).z), 'Aurora 下线 <b>拿回买价一半</b>', win(t, A('broke', 0, 0.6), A('broke', 1, 0.2), 0.3, 0.3), 'org sm');
      if (t >= A('broke', 1, 0.3)) E.coinFly(t, A('broke', 1, 0.3), 0.8, V(top(44).x, 1.5, top(44).z - 2), top(44).add(V(0, 0.6, 0)), 10, 1.0);
      E.label('b3', V(top(44).x + 0.5, 0.5, top(44).z), '卖回亚马逊云科技 <b>8 折</b>', win(t, A('broke', 1, 0.3), A('broke', 2, 0.1), 0.3, 0.3), 'org sm');
      E.label('b4', V(top(40).x, 0.5, top(40).z), `<span>还不上：${NAMES[3]} 破产</span><small>剩下的服务分给${NAMES[0]}、${NAMES[1]}</small>`, win(t, split, S1('broke') - 0.4, 0.3, 0.25), 'warn');   // 主镜头 S1 - 0.4 开走，起步前收完
    }
    // Aurora 下线（抵押）：格子变灰、往下沉一点，和红色的 Impaired 区分开。破产分给虫虫以后还是下线状态（index.html 的 bankrupt 只改主人，不清 offline），
    // 标准局一章里也一直灰着；进片尾时跟着棋子一起收（S0(end) − 0.6 起 0.8 秒淡回原色）
    if (t >= A('broke', 0, 0.55) && t < S0('end') + 0.2) { const k = seg(t, A('broke', 0, 0.55), A('broke', 0, 0.75)) * (1 - seg(t, S0('end') - 0.6, S0('end') + 0.2)), m = E.tiles[25], tp = m.userData.top;
      tp.color.setRGB(1 - 0.55 * k, 1 - 0.55 * k, 1 - 0.55 * k); tp.emissive.setHex(0); m.position.y -= 0.06 * k; }
    // OpenSearch 的两级升级块：归属框弹出来以后一块接一块落下（E.upgrade 只摆最后一块的进度，所以先摆两块、再单独摆第一块）
    if (t >= S0('rent') && t < S0('broke')) { const u0 = rOwn(44) + 0.1; E.upgrade(44, 3, 2, seg(t, u0 + 0.15, u0 + 0.55)); E.upgrade(44, 3, 1, seg(t, u0, u0 + 0.4)); }

    // 09 标准局：虫虫攒技术债
    if (on('std')) {
      const pp = top(10).add(V(0.22, 0, -0.22));   // 放在 RDS 空着的右后角，不插进虫虫的蓝棋子
      // 技术债方块叠在虫虫的棋子旁边（不压到隔壁的 CloudWatch）；攒到 3 个时大重构，三块一起消失
      const rf = A('std', 1, 0.85), gone = E.easeBack(seg(t, rf, rf + 0.3));
      [0, 1, 2].forEach(j => { const k = seg(t, A('std', 1, 0.05 + j * 0.15), A('std', 1, 0.15 + j * 0.15)); if (k > 0 && gone < 1) E.bit(V(pp.x + 0.15, 0.35 + j * 0.3 + (1 - easeOut(k)) * 1.5, pp.z), '#d13212', 0.24 * (1 - seg(t, rf, rf + 0.3))); });
      // 计数跟着方块落地走；换数字时标签轻轻一沉、在最低点换字再回弹（×3 那句变长，宽度也在最低点换），技术债退完再进大重构，不在同一个锚点上叠成双层字
      const lands = [0, 1, 2].map(j => A('std', 1, 0.15 + j * 0.15)), n = Math.max(1, lands.filter(x => t >= x).length);
      E.label('debt', V(pp.x + 0.15, 1.6, pp.z), `<span>${NAMES[1]} 技术债 ×${n}</span><small>${n < 3 ? '每个让每圈运行费 +$20' : '攒到 3 个：大重构 停一轮交 $300，或不停交 $400'}</small>`, win(t, A('std', 1, 0.1), rf, 0.3, 0.3) * dip(t, lands.slice(1)), 'warn');
      E.label('refac', V(pp.x + 0.15, 1.6, pp.z), `<span>${NAMES[1]} 大重构 · 不停一轮，交 <b>$400</b></span><small>3 个技术债清零</small>`, win(t, rf + 0.05, A('std', 2, 0.21), 0.3, 0.3), 'warn');   // 这句 5.60 秒，0.21 ≈ 句首后 1.2 秒收起（和改句前一样）
      E.label('fin1', V(top(ps[2] % 48).x, 2.2, top(ps[2] % 48).z), `<span>季度财报：${NAMES[2]} 总资产最低</span><small>领 $150 融资</small>`, win(t, A('std', 2, QF), S0('end') - 0.9, 0.3, 0.25), 'ok');   // 片尾镜头 S0(end) - 0.8 拉远，起步前收完，和 fin2 错开 0.1 秒
      E.label('fin2', V(top(10).x, 1.4, top(10).z), `<span>${NAMES[0]} 总资产最高</span><small>交 $100 合规审查费</small>`, win(t, A('std', 2, QF + 0.07), S0('end') - 0.8, 0.3, 0.25), 'warn');
    }

    // 片尾
    if (t >= S0('end') - 0.8) E.outro(t, S0('end'), `<div class="eyebrow"><img src="${I.reinvent}"> BOARD GAME · 云上创业</div><h1><small>亚马逊云科技 User Group</small><span>云上大亨</span></h1><div class="chips">${[['ecs', '2–4 人 · 同屏或联机'], ['training', '边玩边答题 · 学习模式'], ['wat', '真实架构 · 按整套收'], ['health', 'Health 事件 · 扛事故'], ['activate', '专属技能 · 起死回生'], ['chime', 'User Group 活动局']].map(([k, l]) => `<span><img src="${I[k]}">${l}</span>`).join('')}</div><p class="foot">玩法灵感来自经典桌游<br>作者：亚马逊云科技 User Group · 云上大亨开发小组<br>项目地址：github.com/cloudsmithy/aws_game<br>问题和建议：github.com/cloudsmithy/aws_game/issues</p>`, 300, 0.03, 0.1);   // 片尾十几秒，转慢一点，免得转到侧面
    if (t >= S0('end') - 0.8) E.show('discbar', 'discbar', '免责声明：游戏里特定亚马逊云科技生成式人工智能相关的服务仅在亚马逊云科技海外区域可用，亚马逊云科技 User Group 仅为帮助您了解行业前沿技术和发展海外业务选择推介该服务。<br>亚马逊云科技中国区域相关云服务由西云数据和光环新网运营，具体信息以中国区域官网为准。游戏内价格为虚构，不代表实际定价；$ 是游戏币单位。', E.ease(E.seg(t, S0('end') + 0.2, S0('end') + 0.9)), 'none');   // 11-10 合规：片尾底部免责声明（文字同 code/index.html 的 DISC_GENAI、DISC_PRICE）

    // 01 开局最后一句「结束方式」：4 个胜利条件盒子从天上掉下来、蹦蹦跳跳
    if (t >= A('setup', 3, 0.8) && t < S1('setup') + 0.4) {   // 盒子往上飞走要到 w1 + 0.35 才出画，画到那时候；覆盖镜头只管开局这一章
      const w0 = A('setup', 4, 0), w1 = S1('setup'), ws = A('setup', 3, 0.8);
      // 镜头在第 3 句收尾（要点卡上已经是「入门局」那行）就提前起步，经过一个抬高、往前拉的中点走弧线，1.7 秒横到棋盘正前方，盒子落下时镜头已经在减速
      if (on('setup')) E.camPath(t, [[ws, [9.6, 5.6, 11.6], [6.9, 0, 4.8]], [(ws + w0 + 0.5) / 2, [4.5, 7.4, 14.6], [3, 1.2, 2.2]], [w0 + 0.5, [-1, 7.8, 16.5], [-0.6, 2.2, 0]], [w1, [0.6, 7.8, 16.5], [-0.6, 2.2, 0]]]);
      [{ k: 'w1', n: '经典', icon: 'users', d: '只剩一人没破产', color: '#e5484d' }, { k: 'w2', n: '打满轮数', icon: 'sfn', d: '默认 15 轮，按估值排名', color: '#ec7211' },
       { k: 'w3', n: '限时', icon: 'cloudwatch', d: '到点按估值排名', color: '#2f7cf6' }, { k: 'w4', n: '六大支柱', icon: 'wat', d: 'Well-Architected 全达标', color: '#1f9d55' }].forEach((w, n) => {
        const t0 = w0 + 0.25 + n * 0.18, x = -5.4 + n * 3.0; if (t < t0) return;
        const u = seg(t, t0, t0 + 0.9), bb = Math.abs(Math.cos(u * Math.PI * 2.5)) * Math.pow(1 - u, 1.7);
        let y = bb * 7, sq = u < 1 && bb < 0.05 ? 0.18 * (1 - u) : 0;
        if (u >= 1) { const ph = ((t - t0 - 0.9 + n * 0.4) % 1.5) / 1.5; if (ph < 0.32) { const h = Math.sin(ph / 0.32 * Math.PI); y = h * 0.6; sq = ph < 0.04 || ph > 0.29 ? 0.1 : -0.07 * h; } }
        const out = ease(seg(t, w1 - 0.5 + n * 0.05, w1 + 0.2 + n * 0.05)); y += out * 10;
        E.box('win' + w.k, { ...w, tag: w.k === 'w1' ? '一直生效' : '可选' }, { x, y: 0.01 + y, z: -0.4 + Math.abs(x) * -0.1, size: [2.3, 3.0, 0.55], sq, ry: -x * 0.06 + Math.sin(t * 1.2 + n) * 0.06 });
        E.floorGlow('gw' + w.k, w.color, x, -0.2 + Math.abs(x) * -0.1, 3.4 * (1 - out), 0.75 * seg(t, t0 + 0.15, t0 + 0.4) * (1 - out));
        E.splash(t, t0 + 0.18, V(x, 0, -0.4), w.color, 10);
      });
    }

    // 每章开头：大号章节标题从中间飞入，再交给左上角的小章节标签
    if (cur.id !== 'intro' && cur.id !== 'end') {
      const [num, ...nm2] = cur.chap.split(' '), ca = win(t, cur.start + 0.05, cur.start + 1.7, 0.25, 0.45), sc = 0.8 + 0.2 * E.easeBack(seg(t, cur.start + 0.05, cur.start + 0.5));
      E.show('chapbig', 'chapbig', `<em>${num}</em><b>${nm2.join(' ')}</b>`, ca, `translate(-50%,-50%) scale(${sc})`);
    }

    // ---------- 章节、玩家栏、字幕 ----------
    if (!on('end') && t >= T1) E.show('chap', 'chap', cur.chap, win(t, cur.id === 'intro' ? T1 + 0.15 : cur.start + 1.4, cur.end, 0.3, 0.2), 'none');   // 开场那一章从片头结束（T1）才开始淡入，不在 T1 那一帧突然冒出来；比右边的要点卡晚 0.15 秒，不一起冒
    if (t >= S0('setup') && t < S0('end') + 0.2) {   // 淡出（S0('end') + 0.2 收完）以后再停画
      // 现金按剧情逐笔记账：[时间, 谁, 金额, 过渡秒数?]，金额写成 ['set', 数, 过渡秒数?] 表示直接设成某个数（几轮之后的状态）；有过渡秒数的那笔按 ease 滚过去
      const EV = [
        // 一回合：韩叔买 RDS；Damo 掷 4 点落在虫虫的 Lambda（按用量：$44 × 4 ÷ 7 = $25，虫虫交 15% 请求费后净收 $21）
        [S0('turn'), 1, -P(7)],                                             // 虫虫之前买下的 Lambda
        [A('turn', 1, 0.45), 0, -P(10)], [A('turn', 1, 0.82), 1, 21], [A('turn', 1, 0.82), 2, -25],
        [A('turn', 2, 0.15), 0, -UPL(10, 1)],                               // RDS 升级多 AZ（升级费按色组、按级：数据库组第 1 级 $115）
        [A('turn', 2, 0.6), 0, -CAPC(10)],                                  // 加容量：1 个只读节点（基础升级费的一半，$75）
        // 过路费一章：几轮之后大家买下的地（Yuki 的 OpenSearch 两级，数仓与搜索组第 1 级 $115、第 2 级 $150）
        // 第四项是过渡秒数：大号章节标题在场时，三个人的现金错开 0.1 秒、各用 0.8 秒滚到新值，不在换章那一帧一起跳
        [S0('rent') + 0.3, 1, -(P(21) + P(34) + P(15) + P(1) + P(18)), 0.8],
        [S0('rent') + 0.4, 2, -(P(28) + P(13)), 0.8],
        [S0('rent') + 0.5, 3, -(P(25) + P(40) + P(44) + P(46) + UPL(44, 1) + UPL(44, 2)), 0.8],
        [A('arch', 1, 0.1), 0, -(P(20) + P(19))],                           // 买下 ELB、EC2 凑齐经典三层 Web
        [ugLand, 3, 280],                                                   // Yuki 停在 User Group 活动，抽奖抽中 $280
        [A('arch', 2, 0.45), 2, -398], [A('arch', 2, 0.45), 0, 398],         // Damo 落在韩叔的 RDS，三块加起来付：ELB $28 + EC2 $20 + RDS $350
        [b53, 0, -P(37)],                                                   // 可选的 Route 53：买下标签出来时扣钱
        [bCE, 0, -(P(33) + P(23))],                                         // 串联收费：再买下 Config、EventBridge（$150 + $240）
        [A('bill', 3, 0.05) + 0.22, 2, 200], [A('bill', 3, 0.05) + 1.52, 2, -20],   // 经过起点领 $200，交这一圈运行费（Damo 只有 DMS、Redshift，每圈 $20）
        [A('inc', 2, 0.5), 1, -80],                                         // 交 $80 加急提额，照常走
        [A('inc', 3, 0.55), 1, -75, 0.5], [A('inc', 3, 0.55) + 0.6, 0, 25, 0.4], [A('inc', 3, 0.55) + 0.8, 2, 25, 0.4], [A('inc', 3, 0.55) + 1.0, 3, 25, 0.4],   // S3 桶公开：有 GuardDuty 只赔一半，每位其他玩家 $25（金币落到谁就给谁加）
        [A('quiz', 1, 0.75), 1, -QHALF], [A('quiz', 1, 0.75), 0, QHALF - QFEE],   // 答对，过路费减半：虫虫付 $208，韩叔为 Route 53 那份交 $1 请求费，净收 $207
        [A('quiz', 3, 0.78), 2, -CH_WIN], [A('quiz', 3, 0.78), 0, CH_WIN],   // 出题挑战：Damo 答错，赔韩叔 $200（答错时出题人那 $100 不用付）
        // 专属技能：几轮之后的状态（韩叔现金最多、总资产最高；Damo 现金 DAMO_LOW + 服务 $680 低于发动线，战略并购扣 $112）
        // 第三项是过渡秒数：「几轮之后」标签出来时，现金从旧值滚到新值，不是一下全跳
        [S0('skill') + 1.7, 0, ['set', 2600, 0.8]], [S0('skill') + 1.7, 1, ['set', 1500, 0.8]], [S0('skill') + 1.7, 2, ['set', DAMO_LOW, 0.8]], [S0('skill') + 1.7, 3, ['set', 300, 0.8]],
        [storm, 2, -Math.round(P(20) * XC.sell)], [storm, 0, Math.round(P(20) * XC.sell)],
        [A('skill', 3, 0.5), 0, -150], [A('skill', 3, 0.5), 1, -150], [A('skill', 3, 0.5), 3, -150], [A('skill', 3, 0.5), 2, 450],
        // 破产：Yuki 付完订阅费只剩 $150，先欠韩叔 $1600、又欠虫虫 $800。index.html 的 pay()：现金当场付给第一笔（韩叔 $150），不够的记成欠款；
        // settle()：之后进来的钱先进先出，先还韩叔那笔：去掉 OpenSearch 两级升级、每级退实付的一半 $75 + $58 = $133，Aurora 下线拿回 $140，
        // OpenSearch 8 折卖回 $348（买价 $360 + Hackathon 送的那份容量也按加容量费 $75 算），都进了韩叔手里；还剩欠韩叔 $829、虫虫 $800 → 破产，现金清零
        // 欠款在 debt3 标签出来时 0.6 秒滚过去；之后每笔变卖的钱 0.5 秒滚进来，韩叔同时收到同样的数
        [S0('broke') + 1.75, 3, ['set', -2250, 0.6]], [S0('broke') + 1.75, 0, 150, 0.6],
        [unUp, 3, UNUP, 0.5], [unUp, 0, UNUP, 0.5], [A('broke', 0, 0.65), 3, 140, 0.5], [A('broke', 0, 0.65), 0, 140, 0.5], [sold, 3, SOLD, 0.5], [sold, 0, SOLD, 0.5],
        [split, 3, ['set', 0, 0.4]],                                        // 破产出局：现金清零（剩下的欠款不再显示成负数）
        [A('std', 1, 0.85), 1, -400],                                       // 虫虫大重构，不停一轮交 $400
        [A('std', 2, QF), 2, 150], [A('std', 2, QF + 0.07), 0, -100],
      ];
      const cash = RC.map((c, k) => c + XC.seat * k);                       // 开局现金 = 角色卡资金 + 后走补贴（2、3、4 号位多领 $50 / $100 / $150）
      for (const [at, k, v, d] of EV) if (t >= at) cash[k] = Array.isArray(v) ? (v[2] ? Math.round(cash[k] + (v[1] - cash[k]) * ease(seg(t, at, at + v[2]))) : v[1]) : cash[k] + (d ? Math.round(v * ease(seg(t, at, at + d))) : v);
      // 开局一章只有名字；进「一回合」时 4 个金额在 0.45 秒里从 0 宽度长出来、淡入（资金条左边不动往右长），不在一帧里变宽 300 多 px
      // 宽度按字符数 × ch（等宽字体）收放；margin-left 抵掉 flex 的 10px 间距，0 宽时整条和开局时一样宽
      const hg = ease(seg(t, S0('turn'), S0('turn') + 0.45));
      const amt = k => { const s = cash[k] < 0 ? '−$' + (-cash[k]) : '$' + cash[k]; return `<b style="${cash[k] < 0 ? 'color:#ff7a6b;' : ''}${hg < 1 ? `overflow:hidden;white-space:nowrap;max-width:${(hg * s.length).toFixed(3)}ch;margin-left:${(-10 * (1 - hg)).toFixed(2)}px;opacity:${hg.toFixed(3)}` : ''}">${s}</b>`; };
      E.show('hud', 'hudh', NAMES.map((n, k) => `<div style="opacity:${k === 3 ? (1 - 0.65 * ease(seg(t, split, split + 0.4))).toFixed(3) : 1}"><i style="background:${COLORS[k]}">${k + 1}</i><span>${n}</span>${on('setup') || hg <= 0 ? '' : amt(k)}</div>`).join(''), win(t, S0('setup') + 0.3, S0('end') + 0.2, 0.5, 0.3), 'none');
    }
    // 字幕：章内相邻两句只隔 0.35 秒，直接换字；前后有空档（章首、章尾）时才淡入淡出，不一帧冒出来、一帧消失（进场 0.27 秒缓出，退场 0.25 秒缓入）
    const SUBS = X.segs.flatMap(s => s.subs);
    let si = SUBS.findIndex(s => t >= s.t0 - 0.05 && t < s.t1 + 0.3);
    // 11/12：相邻两句正好隔 0.35 秒时，浮点误差偶尔让中间空出一帧（字幕闪一下），这一帧接着显示上一句
    if (si < 0) si = SUBS.findIndex((s, k) => SUBS[k + 1] && SUBS[k + 1].t0 - s.t1 < 0.7 && t >= s.t1 + 0.3 && t < SUBS[k + 1].t0 - 0.05 + 1e-6 && t < s.t1 + 0.34);
    { const e2 = document.querySelector('.ov .end2') || document.querySelector('.end2'); if (e2) e2.style.top = (t >= S0('end') - 0.8) ? '60px' : ''; }
    if (si >= 0) { const s = SUBS[si], sp = SUBS[si - 1], sn = SUBS[si + 1];
      const fin = sp && s.t0 - sp.t1 < 0.7 ? 1 : 1 - Math.pow(1 - seg(t, s.t0 - 0.05, s.t0 + 0.22), 2), fout = sn && sn.t0 - s.t1 < 0.7 ? 1 : 1 - Math.pow(seg(t, s.t1 + 0.05, s.t1 + 0.3), 2), a = Math.min(fin, fout);
      // 11/12：片尾那两句和底部免责声明条叠在一起（用户截图「这里的字重合了」）——片尾的字幕还是居中，抬到免责声明条上面；左边那块片尾标题和署名整体上移 50px，免得和抬高的字幕碰上
      const endSub = s.t0 >= S0('end') - 0.8;
      if (endSub && !document.getElementById('subend-css')) document.head.appendChild(Object.assign(document.createElement('style'), { id: 'subend-css', textContent: '.sub2.subend{bottom:140px}' }));
      E.show('sub', endSub ? 'sub2 subend' : 'sub2', s.text, a, `translate(-50%,${((1 - a) * 12).toFixed(2)}px)`); }
  },
};
