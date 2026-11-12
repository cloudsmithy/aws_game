// 每个模式一条宣传片：画面主线和配乐共用，片头、字幕、第 06 段和片尾按模式换（build.mjs 通过 window.PROMO_MODE 选）
window.PROMO_MODES = {
  all: { alt: 'speed' },
  party: { name: '娱乐模式', badge: 'PARTY MODE · 娱乐模式', sub: '规则最少、抽卡最多：一局 10 轮约 15 分钟。线下 User Group 活动一键开局，一桌人边玩边聊。', alt: 'blind',
    caps: { '01': '只留<b>常用服务</b>，其余格子变成<b>盲盒格</b>，落上去抽卡、效果翻倍' },
    end: '娱乐模式 · 2–4 人 · 10 轮约 15 分钟 · 盲盒格 · 社交卡 · User Group 活动局一键开局' },
  basic: { name: '入门局', badge: 'BASIC · 入门局', sub: '第一次认真玩：买服务、收过路费、交运行费，一局 15 轮约 20 分钟。', alt: 'runcost',
    end: '入门局 · 2–4 人 · 15 轮约 20 分钟 · 基础规则 · 第一次玩就选它' },
  std: { name: '标准局', badge: 'STANDARD · 标准局', sub: '在入门局上再加升级附加费、技术债、新账户保护期和季度财报，每一笔账都要算。', alt: 'debt',
    end: '标准局 · 2–4 人 · 默认 15 轮 · 技术债 · 季度财报 · 新账户保护期' },
  full: { name: '完整局', badge: 'FULL · 完整局', sub: '在标准局上再加主动行动、完整交易、Savings Plans / RI，<br>每一步都要算账。', alt: 'trade',
    end: '完整局 · 2–4 人 · 默认 15 轮 · 主动行动 · 交易 · Savings Plans / RI' },
  study: { name: '学习模式', badge: 'STUDY · 学习模式', sub: '边玩边学：必答题、解析，备考云从业者、解决方案架构师助理、AI 从业者认证。', alt: 'quiz',
    end: '学习模式 · 2–4 人 · 必答题 · 解析 · 认证题库 DLC' },
  hell: { name: '地狱模式', badge: 'HELL MODE · 地狱模式', sub: '全部玩法 DLC 加高速部署，必须答题，卡牌 ×2，过路费涨得最快，没有新账户保护期。', alt: 'speed',
    caps: { '06': '攒满 12 点部署点数，<b>DDoS（重）</b>：对手一块服务下线 2 回合；地狱模式里每个角色还多一条限制' },
    end: '地狱模式 · 2–4 人 · 全部 DLC · 高速部署 · 必须答题 · 卡牌 ×2' },
};
// 专属技能卡底部的两步：engine.js 的 skillTexture 写死了「1 风暴接入 → 2 角色技能」和卡底一行 S T O R M   A C C E S S（engine.js 讲解也在用，这里不改它）。
// 现在是先结算角色自己的技能、再「战略并购」（index.html STORM_TXT）：卡第一次建好时按原来的底色、网格把这一块重画成「1 角色技能 → 2 战略并购」，卡底那行字去掉。
// 照搬 explain.js 的 skillSteps（框、圆点、字号、颜色、换行规则都照 skillTexture / wrap 抄；卡面 756 × 1056，画布按 TEX 放大过、上下文已经 scale 过）。full 和普通宣传片共用
window.PROMO_SKILL_STEPS = function (grp, sk) {
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
  step(46, '1', '角色技能', sk.e2 || sk.e); step(w - 346, '2', '战略并购', '按卖回价买下总资产最高的对手的一块服务');
  g.fillStyle = '#ffb36b'; g.beginPath(); g.moveTo(w / 2 - 12, 880); g.lineTo(w / 2 + 14, 895); g.lineTo(w / 2 - 12, 910); g.fill();
  tex.needsUpdate = true;
};
// 宣传片时间轴（约 52 秒）：片头 → 棋盘落成 → 掷骰子买服务 → 升级、组架构收过路费 → Health 事件 → 抽卡和社交卡 → 高速部署 DDoS、专属技能 → 片尾
window.PROMO_SCRIPT = {
  duration: 52,
  run(t, E) {
    const { V, win, seg, ease, easeOut, D, top } = E;
    const I = D.icons;
    // 片尾的特点标签：原来是格数 / 服务数 / 卡牌数 / 架构数 / 题数的数字条，游戏还会更新，改成不带数字的说法（explain.js、mexp.js 同一组）
    // 11/10：这里片尾上面还有一排小标签（「真实架构 · 按整套收」「边玩边答题 · 学习模式」），后两格换成上面没说过的（模式讲解片尾没有小标签，mexp.js 保留原来那组）
    const TAGS = [['真实云服务', ''], ['事件卡', ''], ['多种模式', ''], ['电脑玩家', '']];
    const NAMES = ['韩叔', '虫虫', 'Damo', 'Yuki'], M = PROMO_MODES[window.PROMO_MODE] || PROMO_MODES.all;
    const cwin = E.capWin || win;   // 字幕的淡入淡出：full 宣传片由 promo_full.js 换成带缓动的（E.capWin），6 个模式的宣传片没有 E.capWin，还是原来的线性 win

    // ---------- 摄像机 ----------
    E.camPath(t, [
      [0, [0, 30, 34], [0, 0, -3]],
      [4.6, [0, 22, 25], [0, 0, 0]],
      [7.0, [-15, 13, 15], [0, 0, 0]],
      [10.0, [-4, 15, 17], [0, 0, 0.5], 'hold'],   // 'hold'（engine.js camPath）：10.0–11.0 两头静止、保持原来的缓动 —— 序章最后一帧按这段原来的插值（10.7 秒）摆好
      [11.0, [-2.8, 8.2, 11.5], [-3.6, 0, 3.6], 'hold'],   // 02 买服务：镜头往前看一点，底排的维护窗口、Redshift 不掉进字幕条
      [12.6, [-5, 7.4, 11], [-5, 0, 3.8]],
      [14.6, [-12, 5.2, 4.6], [-7.3, 0, 0.3]],
      [16.6, [-12.6, 5.6, 3.6], [-7.0, 0, 0.2]],
      [18.6, [-11, 9.5, 11], [-5.2, 0, 2.6]],
      [21.0, [-6.5, 8.5, 11.5], [-4.2, 0, 3.0]],
      [23.2, [-5.5, 8.8, 12], [-4, 0, 2.6], 'hold'],   // full 的串联插段从这一帧接管、再交回来，停稳了交接
      [26.3, [-1.5, 17, 16.5], [-0.8, 0, 0.6]],
      [27.6, [-1.5, 17, 16.5], [-0.8, 0, 0.6]],
      [29.4, [-11.5, 6.4, 6.2], [-7.2, 0, 0.2], 'hold'],   // 29.4–30.4、30.4–35.0 保持原来的缓动：S3 插段第一帧（29.79 秒）、Yuki 那段的终点（32.2 秒）按原来的插值摆好
      [30.4, [0, 14, 14], [0, 0, 0], 'hold'],
      [35.0, [1, 12.5, 12.5], [0, 0, 0], 'hold'],
      [37.2, [-3.5, 13, 14.5], [-3.2, 0, 2.2]],
      [39.3, [-3.5, 13, 14.5], [-3.2, 0, 2.2]],
      [40.4, [1, 15, 14.5], [0, 0, 0.3]],
      [43.2, [1, 13.5, 13.5], [0, 0, 0]],
      [52, [1, 13.5, 13.5], [0, 0, 0]],
    ]);
    // 11/12 普通版：虫虫的蓝棋子从 21.4 秒起一直站在 10 号格（底边 RDS），05（30.4–35.2）、07、08（40.4–45.2）被底部字幕条盖住，07 他付订阅费的金币从字幕后面冒出来。
    //   镜头整体平移一段（朝向不变，等于往后拉远一点）：05 棋盘缩到约 87%，虫虫的棋子和 10 号格抬到一行字幕上面（再往上抬，奖池 30.9 起飞起来的金币会出画顶）；
    //   07、08 缩到约 85%，底边那排整排落在两行字幕上面，顶上 Damo 的两个标签不出画；再往左挪一点，虫虫的棋子和他飞出的金币不躲在中间那张专属技能卡后面（片尾 outro 接管前那一帧对得上，见 E.outro 后面那句）。
    //   跟着原来的运镜加上、收掉：05 在 29.4–30.4 推远时加上、35.0–36.4 换到 06 时收掉；07 在 39.3–40.4 拉远时加上、片尾 44.6–45.8 收掉。窗口外一点不动；full 自己管镜头
    const CAM_D = window.PROMO_FULL ? null : (() => { const s = k => k * k * (3 - 2 * k);
      if (t > 29.4 && t < 36.4) return V(0.1, 0.78, 2.05).multiplyScalar(t < 30.4 ? ease(seg(t, 29.4, 30.4)) : 1 - s(seg(t, 35.0, 36.4)));
      if (t > 39.3 && t < 45.8) return V(0.7, 1.08, 2.84).multiplyScalar(s(seg(t, 39.3, 40.4)) * (1 - s(seg(t, 44.6, 45.8))));
      return null; })();
    if (CAM_D) E.camera.position.add(CAM_D);

    // ---------- 棋盘 ----------
    if (t < 4.6) E.board.visible = false;
    // 11/12 普通版：底座和中间那块原来 4.6 秒一帧整块冒出来（还压着没淡完的片头标题）：4.6–5.2 淡入，和片头标题 4.1–4.7 的淡出交叉过渡（格子 5.0 起才落）。
    //   这版 three.js 的 opaque 是着色器参数，切 transparent 要 needsUpdate；engine 每帧把中间那块复位成不透明但不 needsUpdate，所以用 userData.pf 记着上一次编进去的是哪种，淡完切回一次。
    //   淡入时 renderOrder 记 1：排在两团底光后面画，底光不会被还没显出来的底座先写的深度挡掉一块。淡完全部还原（不透明、renderOrder 0），之后每一帧和原来一样。full 自己管棋盘
    if (!window.PROMO_FULL) { const bk = (k => k * k * (3 - 2 * k))(seg(t, 4.6, 5.2)), tr = bk < 1;
      [E.board.children[0], E.center].forEach(o => { const m = o.material; o.renderOrder = tr ? 1 : 0; if (m.transparent !== tr || m.userData.pf !== tr) { m.transparent = tr; m.needsUpdate = true; m.userData.pf = tr; } m.opacity = tr ? bk : 1; }); }   // children[0]：底座（engine 第一个加进 board）
    E.board.position.y = -2 * (1 - easeOut(seg(t, 4.6, 5.6)));
    for (let i = 0; i < 48; i++) E.dropTile(i, seg(t, 5.0 + i * 0.055, 5.75 + i * 0.055));
    E.glow(0.32 * (0.5 + 0.5 * seg(t, 4, 7)), 0.26);

    // 场上已经有主的服务，让盘面看起来是打到中盘
    // 普通宣传片里 ELB、RDS 开场就是韩叔的（和 full 一样），买下 EC2 正好凑齐经典三层 Web（原来 18.0 秒白拿两块）
    const OWN = { 1: 1, 2: 1, 7: 1, 13: 2, 16: 2, 25: 3, 28: 3, 32: 2, 35: 1, 40: 3, 44: 2, 47: 3, 22: 2 };
    const ownK = seg(t, 10.2, 10.9);
    if (ownK > 0) for (const [i, p] of Object.entries(OWN)) E.own(+i, p, ownK);

    // ---------- 片头 ----------
    E.show('hero', 'hero', `<div class="eyebrow"><img src="${I.reinvent}"> ${M.badge || 'BOARD GAME · 云上创业'}</div><h1><small>亚马逊云科技 User Group</small><span>云上大亨</span></h1>${M.name ? `<div class="mtag">${M.name}</div>` : ''}<p>${M.sub || '在亚马逊云科技上创业：买服务、做高可用、扛住 Health 事件、控制账单，把服务组成真实的架构收过路费。'}</p>`, win(t, 0.25, 4.7, 0.9, 0.6));

    // ---------- 01 棋盘 ----------
    let cap = null;
    if (t >= 5.2 && t < 10.4) cap = ['01 棋盘', '棋盘上是<b>亚马逊云科技的服务</b>，每个都按真实特性计费和升级', cwin(t, 5.2, 10.4)];   // 服务数、格数不写具体数（游戏还会加服务）

    // ---------- 02 买服务 ----------
    const hop = window.PROMO_FULL ? k => k * k * (3 - 2 * k) : ease;   // 棋子每一跳的缓动：full 用 smoothstep（半路速度是平均的 1.5 倍，ease 是 3 倍），6 个模式宣传片不变
    const redPos = t < 12.4 ? 11 : (() => { const s = (t - 12.4) / 0.25, n = Math.floor(s); return 11 + Math.min(8, n + hop(s - n)); })();
    if (t >= 10.2) {
      const pw = [E.pawnAt(0, redPos),
        E.pawnAt(1, t < 20.6 ? 7 : (() => { const s = (t - 20.6) / 0.25, n = Math.floor(s); return 7 + Math.min(3, n + hop(s - n)); })()),
        E.pawnAt(2, 30), E.pawnAt(3, 43)];
      // 11/12 普通版：四枚棋子原来 10.2 秒一帧冒出来：各自从 0.9 高处边长大边落下，0.3 秒落稳，前后错开 0.05 秒（10.65 全部落稳）
      if (!window.PROMO_FULL && t < 10.65) pw.forEach((m, n) => { const k = seg(t, 10.2 + n * 0.05, 10.5 + n * 0.05); m.scale.setScalar(Math.max(1e-3, easeOut(Math.min(1, k * 1.6)))); m.position.y += 0.9 * (1 - k * k); });
    }
    E.dice(t, 10.7, 12.0, [3, 5], V(-3.4, 0, 2.2));
    if (t >= 10.4 && t < 16.6) cap = ['02 买服务', '掷骰子走格子，落到没人买的服务就能买下；别人落上来付你过路费', cwin(t, 10.4, 16.6)];
    E.label('dice', V(-3.4, 1.5, 2.2), '<b>3 + 5 = 8</b>', window.PROMO_FULL ? win(t, 12.0, 13.4, 0.25, 0.4) : win(t, 12.0, 13.15, 0.25, 0.35), 'big');   // 11/12 普通版：镜头 12.6 起往右摇，标签淡出时滑到右上角玩家栏底下：12.8–13.15 收完（原来 13.0–13.4）
    const buy = seg(t, 14.45, 15.0);
    if (buy > 0) { E.own(19, 0, buy); E.highlight(19, 1 - seg(t, 15.4, 16.4)); E.lift(19, 0.12 * Math.sin(Math.PI * buy)); }
    E.label('buy', V(top(19).x, 1.4, top(19).z), `<img src="${I.ec2}"><span>${NAMES[0]}买下 <b>EC2</b> · $${D.sq[19].p}</span>`, win(t, 14.6, 16.7, 0.3, 0.4), 'org');

    // ---------- 03 组架构 ----------
    if (t >= 16.6 && t < 23.2) cap = ['03 组架构', '每次落回自己的服务升一级、凑齐真实架构，别人落在架构里任意一块，<b>按整套收</b>', cwin(t, 16.6, 23.2)];
    if (t >= 16.8) E.upgrade(19, 0, t < 17.4 ? 1 : 2, t < 17.4 ? seg(t, 16.8, 17.2) : seg(t, 17.4, 17.8));
    E.label('up1', V(top(19).x + 0.6, 1.25, top(19).z - (window.PROMO_FULL ? 0.4 : 0.75)), '又落回 EC2 · 第 1 级 <b>自动 AMI</b>', win(t, 17.0, 18.5, 0.25, 0.3), 'org sm');
    //   普通版 up1 加了「又落回」变长、和下面的 up2 叠住：锚点往上挪（full 的 POS.up1 用这个锚点的 x、z，保持原来的 −0.4）
    E.label('up2', V(top(19).x + 0.6, 1.25, top(19).z + 0.5), '再落回一次 · 第 2 级 <b>跨 AZ Auto Scaling</b>', win(t, 17.6, 18.8, 0.25, 0.3), 'org sm');
    const own2 = window.PROMO_FULL ? seg(t, 18.0, 18.5) : ownK; if (own2 > 0) { E.own(20, 0, own2); E.own(10, 0, own2); }
    const P20 = top(20).add(V(0, 0.3, 0)), P19 = top(19).add(V(0, 0.3, 0)), P10 = top(10).add(V(0, 0.3, 0));
    const M1 = P20.clone().lerp(P19, 0.5).add(V(0.4, 0.9, 0)), M2 = P19.clone().lerp(P10, 0.5).add(V(0, 2.0, 0));
    // 11/09：普通版片尾大标题卡（45.4 起淡入）里 EC2 → RDS 那段拱顶（+2.0）从「亨」字右下角后面竖着穿过，光点一直贴着「亨」字跑：
    //   照 full 的做法（promo_full.js 的 t3h / t3Arc），45.2 → 45.8 把拱顶平滑压到 +0.55，线留着（三层 Web 连线常驻）；full 的 tier3 由 promo_full.js 换点、重建，这里不管
    //   engine.js 的 arc 按 key 缓存几何体（第一次调用的点就定死了）：每一帧找到 tier3 那根管子，形状和这一帧要的不一样就原地改 curve 的点、重建管子（光点沿同一条 curve 跑）；
    //   还没建出来就由下面的 E.arc 用这一帧的点建。每一帧都比，往回 seek 时拱顶也跟着回去
    const T3P = window.PROMO_FULL ? [P20, M1, P19, M2, P10] : [P20, M1, P19, P19.clone().lerp(P10, 0.5).add(V(0, 2.0 + (0.55 - 2.0) * (k => k * k * (3 - 2 * k))(seg(t, 45.2, 45.8)), 0)), P10];
    if (!window.PROMO_FULL) {
      const same = (c, j) => c.points[j].distanceTo(T3P[j]) < 1e-4;
      const m = window.PROMO_T3M || (window.PROMO_T3M = E.scene.children.find(o => o.isMesh && o.geometry && o.geometry.type === 'TubeGeometry' && o.geometry.parameters.tubularSegments === 160 && o.geometry.parameters.path
        && o.geometry.parameters.path.points && o.geometry.parameters.path.points.length === 5 && [0, 1, 2, 4].every(j => same(o.geometry.parameters.path, j))) || null), c = m && m.geometry.parameters.path;
      if (c && !c.points.every((p, j) => p.distanceTo(T3P[j]) < 1e-6)) {
        c.points.forEach((p, j) => p.copy(T3P[j])); c.updateArcLengths();
        const g0 = m.geometry, q = g0.parameters; m.geometry = new THREE.TubeGeometry(c, q.tubularSegments, q.radius, q.radialSegments, q.closed); g0.dispose();
      }
    }
    E.arc(t, 'tier3', T3P, seg(t, 18.6, 20.0));
    E.label('arch', M2.clone().add(V(0, 0.5, 0)), `<span>有效架构 · <b>经典三层 Web</b></span><small>ELB → EC2 → RDS</small>`, win(t, 19.4, 23.4, 0.35, 0.4), 'org');
    if (t >= 21.4) E.coinFly(t, 21.4, 0.9, top(10).add(V(0.2, 0.6, 0.2)), top(19).add(V(0, 0.6, 0)), 16, 2.4);
    E.label('rent', V(top(10).x, 1.6, top(10).z), `<span><b>${NAMES[1]}付给${NAMES[0]}过路费 $324</b><small>ELB $28 + EC2 $240 + RDS $56 整套收</small></span>`, win(t, 21.4, 23.2, 0.25, 0.4), 'warn');

    // ---------- 04 扛事故 ----------
    if (t >= 23.2 && t < 29.8) cap = ['04 扛事故', 'Health 事件来了：<b>做了多 AZ 的扛住</b>，单 AZ 的实例型服务暂停收过路费', cwin(t, 23.6, 29.8)];
    if (t >= 23.2 && t < 29.6) {
      const inK = easeOut(seg(t, 23.2, 23.9)), out = ease(seg(t, 25.7, 26.3));
      E.card('az', D.cards.az, { y: -6 * (1 - inK) - out * 0.3, x: out * 3.7, flip: ease(seg(t, 23.5, 24.3)), rot: (1 - inK) * 0.3 - out * 0.05, s: 1 - out * 0.42, alpha: 1 - seg(t, 29.2, 29.6) });
    }
    // 卡面写的是「你名下」：只打抽卡的韩叔（turn 0）名下还是单 AZ 的实例型服务 —— 他的 RDS（0 级）；EC2 升到第 2 级跨 AZ Auto Scaling 扛住，ELB 是托管服务本来就跨 AZ
    //   （原来把虫虫、Damo、Yuki 的 AgentCore、Redshift、EMR、EBS 也打成 Impaired；AgentCore 是托管服务，也不受 AZ 断电影响）。full 版自己画 10 号格和 rdsimp，这里只在 6 个模式的宣传片里画
    if (!window.PROMO_FULL) {
      const k = seg(t, 26.5, 26.9) * (1 - seg(t, 29.8, 30.4));
      if (k > 0 && t < 30.4) { E.impaired(10, k); E.label('rdsimp', V(top(10).x, 1.4, top(10).z), `<span>${NAMES[0]}的 <b>RDS 还是单 AZ</b></span><small>Impaired，暂停收过路费</small>`, win(t, 26.6, 28.7, 0.3, 0.4), 'warn'); }   // 镜头 27.6 起推向 EC2，RDS 往画面下沿走：28.7 前收完，不跟到右边压住 AZ 断电卡
    }
    E.shield(19, seg(t, 26.8, 27.5) * (1 - seg(t, 29.9, 30.4)));
    E.label('shield', V(top(19).x, 2.0, top(19).z), `<img src="${I.region}"><span><b>多 AZ</b> · 免疫</span>`, win(t, 27.3, 29.9, 0.3, 0.4), 'ok');

    // ---------- 05 抽卡 ----------
    if (t >= 29.8 && t < 32.0) cap = ['05 抽卡翻盘', 're:Invent 卡：领到 Free Tier 额度，<b>拿走奖池里所有的钱</b>', cwin(t, 30.0, 32.0, 0.45, 0.25)];
    if (t >= 32.0 && t < 35.2) cap = ['05 线下更好玩', 're:Invent 卡：踩坑大会、白板画架构、技术分享会，<b>User Group 一桌人边玩边聊</b>', cwin(t, 32.0, 35.2, 0.25, 0.45)];   // 11/11：游戏里没有「社交卡」这个牌名，这几张都在 re:Invent 牌堆里（卡头写的是 re:Invent 卡）
    if (t >= 29.8 && t < 32.2) {
      const inK = easeOut(seg(t, 29.8, 30.4)), out = ease(seg(t, 31.5, 32.1));
      E.card('free', D.cards.free, { y: -6 * (1 - inK) + out * 7, flip: ease(seg(t, 30.0, 30.8)), rot: (1 - inK) * -0.25, s: 0.95 });
    }
    if (t >= 30.9 && t < 34.6) E.coinBurst(t, 30.9, V(0, 1.6, 0.6), 80);
    D.cards.social.forEach((c, n) => {
      const a = 32.0 + n * 0.16, k = easeOut(seg(t, a, a + 0.55)), out = ease(seg(t, 34.7, 35.2));
      if (t >= a && t < 35.2) E.card('s' + n, c, { x: (n - 1.5) * 2.0, y: -6.5 * (1 - k) - 0.35 - out * 6, flip: ease(seg(t, a + 0.25, a + 0.75)), rot: (n - 1.5) * -0.07, s: 0.66, z: -9 });
    });

    // ---------- 06 高速部署：攒满 12 点，DDoS（重）打虫虫的 Lambda ----------
    // 虫虫手上没有 Shield Advanced 和 CloudFront，打得动（Damo 有 CloudFront、Yuki 有 Shield Advanced，打不动）
    if (M.alt === 'speed') {
      if (t >= 35.2 && t < 39.4) cap = ['06 高速部署', (window.PROMO_MODE === 'hell' ? '地狱模式自带<b>高速部署</b>' : '开局勾选<b>高速部署</b>') + '：攒满 12 点部署点数，<br><b>DDoS（重）</b>让对手一块服务下线 2 回合，不收过路费', cwin(t, 35.3, 39.4, 0.4, 0.25)];
      const spent = t >= 37.3, sp = spent ? Math.max(0, 12 - Math.floor(seg(t, 37.3, 37.6) * 12.99)) : Math.min(12, Math.floor(seg(t, 35.4, 37.0) * 12.99));   // 红线发出（37.3）就扣掉 12 点（index.html ddos() → speedSpend(p, 12)）：和攒点数一样一格一格熄灭，0.3 秒扣完，跟红线发出同步
      E.show('speed', 'speed', `<div class="sh"><i style="background:${E.COLORS[0]}">1</i>${NAMES[0]} · 部署点数 <b>${sp} / 12</b></div><div class="sc">${Array.from({ length: 12 }, (_, k) => `<span class="${k < sp ? 'on' : ''}${k === 11 && sp === 12 ? ' max' : ''}"></span>`).join('')}</div><div class="sk">${spent && sp === 0 ? '花掉 12 点 · <b>DDoS（重）</b>' : spent || sp === 12 ? '12 点 · <b>DDoS（重）</b>' : '每回合 +1，花点数发动技能'}</div>`, win(t, 35.3, 39.3, 0.4, 0.3));
      const PA = top(19).add(V(0, 0.9, 0)), PB = top(7).add(V(0, 0.3, 0));
      if (t >= 37.3 && t < 39.4) E.arc(t, 'ddos', [PA, PA.clone().lerp(PB, 0.5).add(V(0, 3.2, 0)), PB], seg(t, 37.3, 37.9), 0xff3b30);
      const off = seg(t, 37.9, 38.2) * (1 - (window.PROMO_FULL ? seg(t, 42.6, 43.2) : seg(t, 39.3, 39.7)));   // 普通版 07 段是「几轮之后」，下线 2 回合早过了：换段时（39.3–39.7，和 Damo 归属框缩掉同一个窗口）收掉；full 11 段自己管 7 号格
      if (off > 0) { E.impaired(7, off * (0.75 + 0.25 * Math.sin(t * 30))); E.label('ddos', V(top(7).x, 1.5, top(7).z), `<span><b>${NAMES[1]}的 Lambda 下线 2 回合</b><small>不收过路费、不算持有（不凑整组、不算架构）</small></span>`, win(t, 38.0, 39.6, 0.25, 0.3), 'warn'); }
    } else if (t >= 35.2 && t < 39.4) {
      const k6 = win(t, 35.3, 39.4, 0.4, 0.25), c6 = cwin(t, 35.3, 39.4, 0.4, 0.25);   // k6 给题框，c6 给字幕
      if (M.alt === 'blind') {
        cap = ['06 盲盒格', '盲盒格随机抽 Health 或 re:Invent 卡，<b>好坏都翻倍</b>；<br>掷出对子、经过 Startup 扶持也各送一张 re:Invent 卡', c6];   // 只有盲盒格翻倍（index.html goReiCards；掷对子直接 drawReinvent），和 promo_full.js capXf 的娱乐模式字幕同一句
        D.cards.good.forEach((c, n) => { const a = 35.4 + n * 0.2, k = easeOut(seg(t, a, a + 0.55)), out = ease(seg(t, 38.8, 39.3)); if (t >= a) E.card('g' + n, c, { x: (n - 1) * 2.4, y: -6.5 * (1 - k) - out * 6, flip: ease(seg(t, a + 0.3, a + 0.8)), rot: (n - 1) * -0.08, s: 0.72, z: -9 }); });
      } else if (M.alt === 'runcost') {
        cap = ['06 交运行费', '实例型服务<b>空着也要交运行费</b>，Serverless 没人用就不花钱；每次经过 Startup 扶持结一次账', c6];
        [[19, 0], [13, 1], [25, 2], [40, 3]].forEach(([at], n) => { if (t >= 35.6 + n * 0.3) E.coinFly(t, 35.6 + n * 0.3, 1.0, top(at).add(V(0, 0.6, 0)), V(0, 0.6, 0), 5, 2.2); });
        E.label('run', V(0, 1.5, 0), '<span>运行费交给<b>亚马逊云科技</b></span><small>实例按运行时长计费 · Serverless 按用量</small>', win(t, 36.4, 39.3, 0.3, 0.3), 'org');
      } else if (M.alt === 'debt') {
        cap = ['06 技术债', '被罚又没防护就欠 1 个技术债：运行费变贵、升级变贵，<b>攒到 3 个要大重构</b>', c6];
        const n = t < 36.4 ? 1 : t < 37.4 ? 2 : 3; E.impaired(13, 0.5 + 0.5 * Math.sin(t * 9) * (n === 3 ? 1 : 0.4));
        E.label('debt', V(top(13).x, 1.5, top(13).z), `<span>${NAMES[2]} 的技术债 <b>× ${n}</b></span><small>${n < 3 ? '每个让运行费每圈多 $30（SaaS 的弱点）' : '停一轮交 $300，或者不停交 $400'}</small>`, win(t, 35.6, 39.3, 0.3, 0.3), n === 3 ? 'warn' : 'org');
      } else if (M.alt === 'trade') {
        cap = ['06 交易', '完整局：每回合一次<b>主动行动</b>，玩家之间可以拿现金、服务、保留卡做交易', c6];
        // 换离镜头近的那一格（虫虫的 Lambda），标签才不会出画
        if (t >= 36.0) E.coinFly(t, 36.0, 1.0, top(19).add(V(0, 0.6, 0)), top(7).add(V(0, 0.6, 0)), 12, 2.4);
        const sw = seg(t, 37.2, 37.6); if (sw > 0) E.own(7, 0, sw);
        E.label('trade', V(top(7).x, 1.5, top(7).z), `<span>${NAMES[0]} 用 <b>$400</b> 换下 ${NAMES[1]} 的 <b>${D.sq[7].n}</b></span><small>两边都同意才成交</small>`, win(t, 36.2, 39.3, 0.3, 0.3), 'org');
      } else if (M.alt === 'quiz') {
        cap = ['06 边玩边答题', '落在别人的服务上先答题：<b>答对过路费少付</b>，买服务也打折', c6];
        const q = D.quiz, order = [2, 0, 3, 1].filter(j => q.o[j] != null), ok = t >= 37.4;
        E.show('quiz', 'quizbox', `<div class="qh"><i style="display:inline-flex;width:28px;height:28px;border-radius:50%;align-items:center;justify-content:center;vertical-align:middle;font-style:normal;color:#fff;margin-right:10px;font-size:16px;letter-spacing:0;background:${E.COLORS[1]}">2</i>${NAMES[1]} 答题 · 答对过路费少付</div><div class="qq">${q.q}</div>${order.map((j, n) => `<div class="qo ${ok && j === 0 ? 'ok' : ''} ${ok && j !== 0 ? 'no' : ''}"><i>${'ABCD'[n]}</i>${q.o[j]}</div>`).join('')}${ok ? `<div class="qa">答对了 · ${q.a || ''}</div>` : ''}`, k6);
      }
    }
    // ---------- 07 专属技能：Damo 快破产，发动「上架 Marketplace」 ----------
    // index.html STORM_TXT：先结算角色自己的技能，再「战略并购」，按卖回价买下全场总资产最高的对手的一块服务（技能卡上的两步 engine.js 画的还是旧的「风暴接入」，卡建好时由上面的 PROMO_SKILL_STEPS 重画）
    if (t >= 39.4 && t < 43.2) cap = ['07 专属技能', '总资产跌破开局资金一半，发动<b>专属技能</b>，一局一次；<br>再<b>战略并购</b>：按卖回价买下领先对手的一块服务', cwin(t, 39.4, 43.2, 0.25, 0.45)];
    // 几轮之后 Damo 卖掉 API Gateway、Bedrock、OpenSearch 周转，只剩 Redshift $340 + CloudFront $400 = $740，现金 $50：总资产 $790，低于 SaaS 创业公司开局 $1600 的一半（和 full 一样）。
    //   full 自己清 32、44（22 号格在 full 里是 Yuki 的 API Gateway），这里只在普通宣传片里清；换段时（39.3–39.7）缩掉归属框
    if (!window.PROMO_FULL && t >= 39.3) { const k = 1 - seg(t, 39.3, 39.7); [22, 32, 44].forEach(i => E.own(i, 2, k)); }
    E.label('low', V(top(30).x, 1.5, top(30).z), `<span>几轮之后：${NAMES[2]} 总资产只剩 $790</span><small>跌破开局资金 $1600 的一半</small>`, win(t, 39.5, 41.0, 0.3, 0.3), 'warn');
    if (t >= 39.8 && t < 43.0) { const inK = easeOut(seg(t, 39.8, 40.4)), out = ease(seg(t, 42.3, 42.9)), cam = E.camera, n0 = cam && cam.children ? cam.children.length : -1;   // capProbe 的假 E 没有 camera
      E.card('skill', D.skill, { y: -6 * (1 - inK) + out * 7, flip: ease(seg(t, 40.0, 40.8)), s: 0.92, ...(window.PROMO_FULL ? {} : { alpha: 1 - seg(t, 42.2, 42.52) }) });   // 普通版：卡往上飞走时一起淡掉，不从顶上的 sub 标签上扫过去（full 把卡挪到右上，自己管淡出）
      const cg = n0 >= 0 && cam.children[n0]; if (cg && cg.userData && !cg.userData.steps) { window.PROMO_SKILL_STEPS(cg, D.skill); cg.userData.steps = 1; } }   // 这一帧刚建好的卡（engine 把卡挂在镜头下面）：重画一次底部两步
    if (t >= 41.0 && t < 43.2) [[0, 19], [1, 10], [3, 43]].forEach(([k, at], n) => E.coinFly(t, 41.0 + n * 0.2, 0.9, top(at).add(V(0, 0.8, 0)), top(30).add(V(0, 0.6, 0)), 6, 2.8));
    E.label('sub', V(top(30).x, 1.5, top(30).z), `<span>每位对手付 ${NAMES[2]} <b>$150</b> 订阅费</span><small>连续 4 个回合</small>`, win(t, 41.2, 43.2, 0.3, 0.3), 'org');

    // 右上角玩家栏：名字和现金跟着剧情变
    //   韩叔：买 EC2 −$100；第 1 级自动 AMI −$75；第 2 级跨 AZ Auto Scaling −$100，没有 VPC 另交 $50（没有 Route 53，凑不成高可用入口，不减半）；收过路费 +$324；Free Tier 拿走奖池 +$150
    const cash = [t < 14.6 ? 1500 : t < 16.8 ? 1500 - D.sq[19].p : t < 17.4 ? 1425 - D.sq[19].p : t < 22.2 ? 1275 - D.sq[19].p : t < 31.0 ? 1599 - D.sq[19].p : 1749 - D.sq[19].p, t < 22.2 ? 1400 : 1076, 1650, 1320];
    const turn = t < 20.4 ? 0 : t < 23.2 ? 1 : 0;
    E.show('hud', 'hud', NAMES.map((n, k) => `<div class="${k === turn ? 'on' : ''}"><i style="background:${E.COLORS[k]}">${k + 1}</i><span>${n}</span><b>$${cash[k]}</b></div>`).join(''), win(t, 10.3, 35.2, 0.5, 0.4));

    // ---------- 片尾 ----------
    // 「User Group 活动局」配棋盘角上 User Group 活动那个人群图标（原来是 Chime 在线会议，和「线下」意思相反）：原图是深色线条，放在深色卡片上看不见，换成紫底白线
    const UGI = window.PROMO_UGI || (window.PROMO_UGI = I.users ? 'data:image/svg+xml;base64,' + btoa(atob(I.users.split(',')[1]).replace(/#242F3E/gi, '#FFFFFF').replace('<g id=', '<rect width="48" height="48" fill="#8C4FFF"/><g id=')) : I.chime);   // 只算一次
    if (t >= 44.4) E.outro(t, 45.2, `<div class="eyebrow"><img src="${I.reinvent}"> ${M.badge || 'BOARD GAME · 云上创业'}</div><h1><small>亚马逊云科技 User Group</small><span>云上大亨</span></h1>${M.end ? `<div class="mtag">${M.name}</div><p class="msub">${M.end}</p>` : ''}<div class="chips">${[['ecs', '2–4 人 · 同屏或联机'], ['training', '边玩边答题 · 学习模式'], ['wat', '真实架构 · 按整套收'], ['health', 'Health 事件 · 扛事故'], ['activate', '专属技能 · 起死回生'], ['users', 'User Group 活动局']].map(([k, l]) => `<span><img src="${k === 'users' ? UGI : I[k]}">${l}</span>`).join('')}</div><p class="foot">玩法灵感来自经典桌游<br>作者：亚马逊云科技 User Group · 云上大亨开发小组<br>项目地址：github.com/cloudsmithy/aws_game<br>问题和建议：github.com/cloudsmithy/aws_game/issues</p>`);
    // 11/12 普通版：片尾 44.4 起 outro 按镜头当前位置往环绕机位插、但看的点直接改成原点 → 上面 CAM_D 那段平移还没收完（45.8 前）时把它补进看的点，不然 44.4 那一帧镜头会转一下
    if (CAM_D && t >= 44.4) { const k = ease(seg(t, 45.2 - 0.8, 45.2 + 0.9)); E.camera.lookAt(V(0, 0, 0).lerp(V(0, 0.8, 0), k).add(CAM_D.clone().multiplyScalar(1 - k))); }
    if (t >= 44.4) E.show('discbar', 'discbar', '免责声明：游戏里特定亚马逊云科技生成式人工智能相关的服务仅在亚马逊云科技海外区域可用，亚马逊云科技 User Group 仅为帮助您了解行业前沿技术和发展海外业务选择推介该服务。<br>亚马逊云科技中国区域相关云服务由西云数据和光环新网运营，具体信息以中国区域官网为准。游戏内价格为虚构，不代表实际定价；$ 是游戏币单位。', E.ease(E.seg(t, 45.2 + 0.2, 45.2 + 0.9)), 'none');   // 11-10 合规：片尾底部免责声明（文字同 code/index.html 的 DISC_GENAI、DISC_PRICE）

    // 通用版：片尾前提一句学习模式和 DLC（片头片尾本身不提 DLC）；full 宣传片有单独一段，不用这句
    if (!window.PROMO_FULL && !M.end && t >= 43.2 && t < 45.4) cap = ['08 更多玩法', '还有<b>学习模式</b>（必答题），开局能加<b>玩法 DLC</b>、高速部署、代理商模式和认证题库', win(t, 43.2, 45.4, 0.3, 0.3)];   // 补上代理商模式：「全程必答题」改「必答题」才放得下一行（量过 1690 宽，上限 1700）；两行会盖住底边虫虫的棋子

    if (cap) E.caption(cap[0], cap[1], cap[2]);
  },
};
