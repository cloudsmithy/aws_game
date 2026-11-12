// full 宣传片（约 76 秒）：封面式片头 → 通用版主线 → 6 个模式各自的看点 → 专属技能 → DLC 和学习模式 → 片尾。
// 不重写画面，而是把时间重新映射到 promo.js：主线从 promo.js 的 10.2 秒（棋盘已经摆好）接上；
// 每个模式的看点都是 promo.js 第 06 段（35.2–39.4 秒）换 PROMO_MODE 播一遍。
window.PROMO_FULL = true;
(function () {
  const base = window.PROMO_SCRIPT;
  // 跨章节也不灭字幕条的两处（05 四个角 → 06 娱乐模式、11 → 12 专属技能）：上一段的字幕在这里，capDraw 交叉淡化要用
  const CAPC = 'Startup 扶持、维护窗口、<b>User Group 活动</b>、Root 密钥泄露：四个角各有规则', CAP11 = '地狱模式自带<b>高速部署</b>：攒满 12 点能 <b>DDoS（重）</b>，Damo 有 <b>CloudFront</b>、<br>韩叔有 <b>Shield Advanced</b>，都打不动；虫虫没有，ECS 下线 2 回合';
  const ALT = [['party', '06 娱乐模式'], ['basic', '07 入门局'], ['std', '08 标准局'], ['full', '09 完整局'], ['study', '10 学习模式'], ['all', '11 地狱模式 · 高速部署']];   // 高速部署是开关，不是第六个模式：地狱模式自动打开，别的难度也能勾（画面上写「地狱模式 · 高速部署」，让观众知道还有第六个难度）
  // 插段：在 promo.js 的这些时间点暂停主线，插一段 full 版自己的内容，之后整体往后挪
  //   23.2 秒「03 组架构」后：串联收费（5 秒）；29.8 秒「04 扛事故」后：S3 公开的防护（5.4 秒）；35.2 秒社交卡后：四个角（8.4 秒）
  // 11/05 复核：S3 公开 5.4 → 6.2（S3 卡正面朝前多停 0.8，上面写着规则），四个角 8.4 → 10（每个角 2.1 → 2.5，34–48 字的标签多停 0.4）；music.mjs 的 ZL、CL 同步
  const INTRO = 5.4, SHIFT = 10.2 - INTRO, INS = [[23.2, 5.0, 'chain'], [29.8, 6.2, 's3'], [35.2, 10.0, 'corner']], CK = 2.5;   // CK：四个角每个角多长
  const fb = b => b - SHIFT + INS.filter(([a]) => b >= a).reduce((n, [, l]) => n + l, 0);   // promo.js 主线时间 → full 时间
  const insStart = k => INS[k][0] - SHIFT + INS.slice(0, k).reduce((n, [, l]) => n + l, 0);
  const XS = insStart(0), XL = INS[0][1], ZS = insStart(1), ZL = INS[1][1], CS = insStart(2), CL = INS[2][1], A0 = CS + CL, TS1 = XS - 3.1;   // TS1：轮到虫虫（tt 20.1，先掷骰子再走）（11/12 cardrestore：抽卡段恢复原样，去掉付费抽卡用的 YT）
  // 模式看点：每段 4.2 秒，高速部署那段要演防护，放到 6.6 秒
  const ALEN = [4.2, 4.2, 4.2, 4.2, 4.2, 6.6], ACUM = ALEN.map((_, k) => ALEN.slice(0, k).reduce((a, b) => a + b, 0)), AL = 4.2, SLOW = 1;
  const SKX = 1.12, SK0 = A0 + ALEN.reduce((a, b) => a + b, 0), DL0 = SK0 + 3.8 + SKX, D13 = 4.6, D14 = 10.1, D15 = 3.6, DW = 4.6, DLL = D13 + D14 + D15 + DW, OUT0 = DL0 + DLL, EG0 = OUT0 + 8.8, EGL = 12.45, DUR = EG0 + EGL;   // 11/05 复核：彩蛋黑屏两页各多停 0.4（EGL 11.25 → 12.05），最后全黑再多留 0.4（→ 12.45），网页循环播放时不直接跳回封面   // EG0 起是片尾彩蛋
  // 整体放慢 20%：字幕、标签多停一会儿（配乐在 mix.mjs 里同样拉长）
  const PLAY = 0.8;
  // 序章「韩叔的出师考」：封面停 O0 秒后插进来，演 OPENL 秒；之后从 promo.js 的 10.7 秒（骰子刚扔出来）接正片
  // 11/05 序章拉长（字幕、名牌停得太短，风平浪静也太快）：28.4 → 42.5605（promo_open.js 的 PRO 7.683 + ML 34.8775；11/05 第二轮把太拖的定格压回去，原来拉到 46.35），正片、彩蛋整体往后挪
  // 11/05 第三轮：风平浪静嫌长，PRO 7.683 → 6.083，序章 42.5605 → 40.9605（正片、彩蛋整体提前 1.6，视频 2.0 秒）
  const O0 = 0.8, OPENL = 40.9605, OE = O0 + OPENL, OJ = 0.5, OSH = OE - (INTRO + OJ);
  window.PROMO_FULL_T = { INTRO, SHIFT, INS, XS, XL, ZS, ZL, CS, CL, A0, ALEN, ACUM, SKX, SK0, DL0, D13, D14, D15, DW, OUT0, EG0, EGL, DUR, PLAY, O0, OPENL, OE, OJ, OSH };   // music.mjs 按这些时间点对齐音效

  // ---------- 字幕：每帧最后统一画；同一章里换段时字幕条不灭，新旧两段文字交叉淡化 ----------
  const easeIn = k => k * k, XD = 0.3;   // XD：换段时的交叉淡化用多久（t，约 0.38 秒）
  let CAPF = null, CAPX = null, ARCH = null;   // 这一帧的字幕 { tag, html, a } / 交叉淡化 { tb 换段时刻, old 上一段的字幕 } / 主线 arch 标签的参数
  // promo.js 的字幕 → full 版：编号重排、按模式换标签和文案（原来写在 E.caption 包装里，挪出来和 capProbe 共用）
  function capXf(a, b, tag, mode) {
    const la = a.replace(/^\d+\s*/, ''), lt = tag ? tag.replace(/^\d+\s*/, '') : '', nt = !tag ? a : la === lt ? tag : `${tag} · ${la}`;
    if (/^05 抽卡/.test(a)) b = 're:Invent 卡：<b>Well-Architected Review 通过</b>，选一块能升级的服务免费升一级';   // 标签已经是「04 抽卡 · re:Invent 卡」，正文不再以「re:Invent 卡：」开头（11/11 fix）
    if (/^0?6\b|盲盒格/.test(a) && mode === 'party') b = '盲盒格随机抽 Health 或 re:Invent 卡，<b>好坏都翻倍</b>；<br>掷出对子、经过 Startup 扶持也各送一张 re:Invent 卡';
    // 学习模式这段演的是虫虫落在没人买的 Kinesis 上「答对 8 折买」：字幕先讲买地，再讲过路费（原来只讲过路费，和画面对不上）
    if (mode === 'study' && /边玩边答题/.test(a)) b = '落地先答题：没人买的服务<b>答对 8 折买</b>，落在别人的服务上答对过路费减半';
    if (/^07 专属技能/.test(a)) b = '总资产跌破开局资金一半，发动<b>专属技能</b>起死回生，一局一次；<br>先结算角色技能，再<b>战略并购</b>：按卖回价买下领先对手的一块服务';   // index.html STORM_TXT（11-07）
    if (mode === 'full') b = b.replace(/^完整局：/, '');   // 标签已经是「09 完整局 · 交易」，正文不再重复
    // 两行字幕在句读处断行（原来按宽度折，第二行只剩一两个字）
    if (mode === 'basic') b = b.replace('；每次经过', '；<br>每次经过');
    // 入门局：S3、EFS 这类 Serverless 有固定月费（index.html FIXED_FEE），不是所有 Serverless 空着都不花钱；点名画面上的 API Gateway（11/11 fix）
    if (mode === 'basic') b = b.replace('，Serverless 没人用就不花钱', '，API Gateway 这类 Serverless 没人用就不花钱');
    return [nt.replace(/^0([2-5])(?= (买服务|组架构|扛事故|抽卡|线下))/, (m, d) => '0' + (d - 1)).replace(/^04 抽卡翻盘$/, '04 抽卡 · re:Invent 卡'), b];   // 序章之后从买服务开始，编号顺延成 01 买服务、02 组架构、03 扛事故、04 抽卡；05 起不变
  }
  // 上一段的字幕是什么：拿一个什么都不画的假 E 跑一遍 promo.js（只记下字幕）。结果只跟参数有关（画面仍然是时间的纯函数），缓存起来
  const PROBE = {};
  function capProbe(E, tt, mode, tag) {
    const key = tt + '|' + mode + '|' + tag; if (PROBE[key]) return PROBE[key];
    let got = null; const dummy = { style: {}, position: {}, visible: true }, noop = () => dummy;
    const REAL = { V: E.V, win: E.win, seg: E.seg, ease: E.ease, easeOut: E.easeOut, easeBack: E.easeBack, clamp: E.clamp, lerp: E.lerp, D: E.D, COLORS: E.COLORS, top: E.top, cell: E.cell, SW: E.SW, SH: E.SH, capWin: E.capWin };
    const stub = new Proxy({}, { get: (_, k) => k in REAL ? REAL[k] : k === 'caption' ? (a, b) => { got = capXf(a, b, tag, mode); } : k === 'board' ? dummy : noop });
    const m0 = window.PROMO_MODE; window.PROMO_MODE = mode;
    try { base.run(tt, stub); } finally { window.PROMO_MODE = m0; }
    return (PROBE[key] = got && { tag: got[0], html: got[1] });
  }
  // 画字幕。X 在换段后的 XD 内：量出新旧两段各自的自然尺寸，字幕条的宽高在两者之间过渡；标签列（02 组架构 这种）一样时原地不动，
  //   不一样时原地交叉淡化；正文两段各按自己的排版叠着：旧字先上移淡出，新字随后从下面淡入（不重排、不跳宽）。
  //   过渡完回到普通的单层字幕，和 engine.js 的 caption() 画出来的一样
  function capDraw(E, C, X, t) {
    if (!C) return;
    const H = (g, h) => `<span class="tag">${g}</span><div class="ct">${h}</div>`, k = X && X.old ? (t - X.tb) / XD : 1;
    if (!(k >= 0 && k < 1) || (X.old.tag === C.tag && X.old.html === C.html)) {
      const e = E.el('cap', 'cap', H(C.tag, C.html)); e.style.opacity = C.a; e.style.transform = `translateY(${(1 - C.a) * 24}px)`; e.style.width = e.style.height = ''; return;
    }
    const { seg, ease, easeOut, lerp } = E, O = X.old, same = O.tag === C.tag;
    const m0 = E.el('capm0', 'cap capm', H(O.tag, O.html)), m1 = E.el('capm1', 'cap capm', H(C.tag, C.html)); m0.style.opacity = m1.style.opacity = 0;
    const tw0 = m0.children[0].offsetWidth, tw1 = m1.children[0].offsetWidth, cw0 = m0.children[1].offsetWidth, cw1 = m1.children[1].offsetWidth;
    // 字幕条的宽高：要变大的先在新字淡入（k 0.36）之前撑开，要变小的等旧字淡完（k 0.42）再收，新旧两段字都不会被框裁掉（原来两者之间线性过渡，新字出来时框还没撑开，右边被截掉）
    const grow = ease(seg(k, 0, 0.34)), shrink = ease(seg(k, 0.45, 1)), sz2 = (a0, a1) => lerp(lerp(a0, Math.max(a0, a1), grow), a1, shrink);
    const tagH = same ? `<span class="tag xt" style="width:${tw1}px">${C.tag}</span>` : `<span class="tag xt" style="width:${tw0}px">${O.tag}</span><span class="tag xt" style="width:${tw1}px">${C.tag}</span>`;
    const e = E.el('cap', 'cap xf', `${tagH}<div class="ct xc" style="left:${tw0}px;width:${cw0 + 1}px">${O.html}</div><div class="ct xc" style="left:${tw1}px;width:${cw1 + 1}px">${C.html}</div>`);   // 宽度多留 1px，不会因为取整多折一行
    e.style.opacity = C.a; e.style.transform = 'none'; e.style.width = sz2(m0.offsetWidth, m1.offsetWidth).toFixed(1) + 'px'; e.style.height = sz2(m0.offsetHeight, m1.offsetHeight).toFixed(1) + 'px';
    const o0 = seg(k, 0, 0.42), o1 = easeOut(seg(k, 0.36, 1)), L = e.children, n = same ? 1 : 2;
    if (!same) { L[0].style.opacity = 1 - o0; L[1].style.opacity = o1; }
    L[n].style.opacity = 1 - easeIn(o0); L[n].style.transform = `translateY(${(-10 * ease(o0)).toFixed(1)}px)`;
    L[n + 1].style.opacity = o1; L[n + 1].style.transform = `translateY(${(10 * (1 - o1)).toFixed(1)}px)`;
  }
  // 片尾的连续镜头：16 怎么赢那段慢慢横移 → 推向片尾环绕的起点（engine.js outro() 再从这条镜头往环绕机位过渡），
  //   终点就是 outro 在 tt 46.1（完全接管）时的机位，交接处不跳；原来这里先停 1.5 秒才开始环绕
  const W0F = DL0 + D13 + D14 + D15, OTH = 0.6 + (46.1 - 45.2) * 0.07;
  const CAMW = [[W0F + 0.6, [-1.5, 7.6, 16], [0, 2.3, 0]], [OUT0 - 1.5, [1.4, 7.6, 16], [0, 2.3, 0]], [OUT0 + 0.2, [5.8, 8.15, 14.7], [0, 0, 0]], [OUT0 + 1.9, [15.5 * Math.sin(OTH), 8.5 + Math.sin(0.9 * 0.4) * 0.6, 15.5 * Math.cos(OTH)], [0, 0, 0]]];

  // ---------- 正片的表情头像和道具：设定图「表情设计」「细节元素」切出来的（build.mjs 放进 PROMO_DATA.props），人物头像用立绘的 sprites.<谁>.head ----------
  // 像综艺的反应镜头：点名某个人的标签里带上他这一刻的表情；付钱 / 收钱时棋子上方弹一个小头像；几处贴上设定图里的道具。
  // 图片只注入一次（.xi-<名字> / .xh-<谁> 的 --im），html 里只写 class，不每帧拼 data URI；缺哪张就不画那一处，标签、玩家栏保持原样
  const XPR = PROMO_DATA.props || {}, XSP = PROMO_DATA.sprites || {}, XWHO = ['han', 'chong', 'damo', 'yuki'], XCOL = { han: '#e5484d', chong: '#2f7cf6', damo: '#1f9d55', yuki: '#9b5cf6' };
  const XIM = [];
  // 圆形小头像（玩家栏、部署点数面板）按脸的标注点对准：脸横向居中，眼睛连线在圆圈 47% 的高度，「等效脸宽」（脸宽和 1.9 倍眼距的平均）占直径的 0.86，四个人的脸一样大。
  //   标注是原图像素：[用哪张, 脸左边, 脸右边（眼睛那一高度，不算耳朵）, 眼睛连线中点 y, 眼距]。图换了（重新抠图、尺寸变了）只改这里的数。
  //   韩叔的 head 切到嘴边就断了（下巴在图外），脸放到圆心时圆圈下半截会露出底色，所以韩叔用正面立牌 front 的脸；另外三个的 head 下面都留够了
  const XFACE = { han: ['front', 200, 605, 510, 199], chong: ['head', 195, 600, 420, 220], damo: ['head', 155, 625, 405, 245], yuki: ['head', 262, 572, 378, 173] }, XFK = 0.86, XFY = 0.47;
  const xhSrc = w => { const f = XFACE[w], m = f && XSP[w][f[0]]; return m && m.w && m.h ? m : XSP[w].head; };
  const xhCSS = w => { const f = XFACE[w], m = xhSrc(w); if (!f || m !== XSP[w][f[0]] || !m.w) return `.xh-${w}{--im:url(${m.src})}`;
    const [, x0, x1, ey, ed] = f, s = XFK / ((x1 - x0 + 1.9 * ed) / 2), dw = m.w * s, dh = m.h * s;   // s：每个原图像素占几个圆圈直径
    const px = (0.5 - (x0 + x1) / 2 * s) / (1 - dw) * 100, py = (XFY - ey * s) / (1 - dh) * 100;   // background-position 的百分比 = 偏移 / (框 − 图)
    return `.xav s.xh-${w}{--im:url(${m.src});background-size:auto ${(dh * 100).toFixed(2)}%,100% 100%;background-position:${px.toFixed(2)}% ${py.toFixed(2)}%,0 0}`; };
  { const hs = XWHO.filter(w => XSP[w] && XSP[w].head), css = [...Object.entries(XPR).map(([k, m]) => `.xi-${k}{--im:url(${m.src})}`), ...hs.map(xhCSS)];
    if (css.length) { const st = document.createElement('style'); st.textContent = css.join('\n'); document.head.appendChild(st);
      [...Object.values(XPR).map(m => m.src), ...hs.map(w => xhSrc(w).src)].forEach(src => { const im = new Image(); im.src = src; if (im.decode) im.decode().catch(() => {}); XIM.push(im); }); } }   // 先解码一遍：第一次出现那一帧就有图
  const xsm = k => k * k * (3 - 2 * k);
  // 表情头像：exps 是一串表情（叠着放，帧末 avSet 按进度交叉淡化）；切图里没有的跳过，一张都没有就返回 ''
  const avHTML = (who, exps, cls = '') => { const L = [].concat(exps).filter(e => XPR[`${who}_exp_${e}`]); return L.length ? `<i class="xav ${cls}" style="--c:${XCOL[who]}">${L.map(e => `<s class="xi-${who}_exp_${e}"></s>`).join('')}</i>` : ''; };
  const headHTML = (who, cls = '') => XSP[who] && XSP[who].head ? `<i class="xav ${cls}" style="--c:${XCOL[who]}"><s class="xh xh-${who}"></s></i>` : '';
  const stkHTML = (name, cls) => XPR[name] ? `<i class="xstk ${cls} xi-${name}"></i>` : '';
  // 头像出场：pop 0→1 从 0.35 倍回弹到 1 倍、转正（easeBack）；x 是换表情的进度（0 第一张、1 第二张 …），换的那一下轻轻弹一下
  function avSet(E, root, pop, x = 0) {
    const a = root && root.querySelector('.xav'); if (!a) return;
    const p = E.easeBack(E.clamp(pop)), L = a.children, n = L.length, xi = E.clamp(x, 0, n - 1), fr = xi - Math.floor(xi), bump = n > 1 ? 0.12 * Math.sin(Math.PI * fr) : 0;
    a.style.transform = `scale(${((0.35 + 0.65 * p) * (1 + bump)).toFixed(4)}) rotate(${((1 - p) * -16).toFixed(1)}deg)`;
    for (let i = 1; i < n; i++) L[i].style.opacity = E.clamp(xi - (i - 1)).toFixed(3);
  }
  // 道具贴纸：pop 0→1 从 0.3 倍回弹到 1 倍、转到 rot 度，之后轻轻晃（wob 度）；base 是放在前面的位移
  function stkSet(E, el, pop, t, rot = 0, wob = 2.5, base = '') {
    if (!el) return; const p = E.easeBack(E.clamp(pop));
    el.style.opacity = E.clamp(pop * 1.6).toFixed(3);
    el.style.transform = `${base} rotate(${(rot * p + (p - 1) * 28 + Math.sin(t * 5.2) * wob * E.clamp(pop)).toFixed(2)}deg) scale(${(0.3 + 0.7 * p).toFixed(4)})`;
  }
  // 帧末画 3D 标签时顺手加头像 / 贴纸：X = [谁, 表情, 交叉淡化进度]，S = [道具名, class, 转角]；头像在标签淡入到 30% 以后才长出来，退场时跟着标签一起收
  function labX(E, draw, a, X, S, t) {
    const al = a[3] == null ? 1 : a[3], h = X ? avHTML(X[0], X[1]) : '', s = S ? stkHTML(S[0], S[1]) : '';
    draw(a[0], a[1], h || s ? h + a[2] + s : a[2], al, a[4]);
    if (!h && !s) return; const el = E.el('L' + a[0]);
    if (h) avSet(E, el, E.seg(al, 0.3, 1), X[2] || 0);
    if (s) stkSet(E, el.querySelector('.xstk'), E.seg(al, 0.25, 1), t, S[2]);
  }

  // 多 AZ 升级（EC2、Aurora 共用，参考普通宣传片的升级块从天上落下）：一块升级块（格子主人的颜色，和游戏里、和其他格子的升级块一样）从 hd 高处落下（带影子，越落越快）→ 落地压扁一下、
  //   溅起几颗碎块、格子亮一下 → 沿格子内侧分成两块（中间轻轻蹦一下）→ 两块之间的连线 0.3 内画出来（k 不到 1：只画线、不画跑动的光点，这段线太短，三颗光点挤成一团）。
  //   之后两块一直留着，连线画到 lineEnd。P：落在哪（两块分开以前的中点，格子内侧）；ax：分开的方向；t 和各时刻用同一个时钟（EC2 用 promo.js 时间 tt，Aurora 用 full 时间）
  //   fx(t, tl)：落地时另外加的反馈（WA 卡那块：紫色冲击波、金色碎块）
  //   splash：碎块颜色；big：用 engine.js 的 E.splash（大一圈、飞得高），不传是这里的轻量版（小、低、0.4 内收完，颜色浅，不会看成又多了几块升级块）
  function azDrop(E, arc, t, { key, i, P, ax, t0, hd = 2.2, fall = 0.3, ts, tk, lineEnd, splash = '#dfe5ee', n = 8, big = false, hl = 0.75, fx = null, col = '#7f8ea3', sep = 0.26, ah = 0.66, ae = 0.44, op = 1 }) {   // 11/11 refine：op（不传 = 1）< 1 时两块升级块缩小收掉（14 段换一局用）   // 11/05（refine）：sep 两块分开多远、ah 连线拱顶高度、ae 连线两头的高度（不传 = 原来的 0.26 / 0.66 / 0.44，EC2 不变）
    if (t < t0) return;
    const { V, seg, easeOut } = E, tl = t0 + fall, sp = easeOut(seg(t, ts, ts + 0.32));
    const hk = Math.min(seg(t, tl - 0.03, tl + 0.03), 1 - seg(t, tl + 0.25, tl + 0.7)), lf = 0.03 * hl * Math.max(0, hk);   // 格子亮一下（highlight 会把格子抬一点，块跟着抬，不陷进去）
    if (hk > 0) E.highlight(i, hl * hk);
    const u = seg(t, t0, tl), sq = Math.sin(Math.PI * seg(t, tl, tl + 0.14)), y = 0.32 + hd * (1 - u * u) + lf - 0.03 * sq + 0.06 * Math.sin(Math.PI * sp);   // 越落越快；落地压扁 0.14；分开时蹦一下
    if (op > 0) [-1, 1].forEach(sd => { const b = E.bit(V(P.x + ax[0] * sd * sep * sp, y - 0.1 * (1 - op), P.z + ax[1] * sd * sep * sp), col, 0.2); if (b && sq > 0) b.scale.set(0.2 * (1 + 0.22 * sq), 0.2 * (1 - 0.3 * sq), 0.2 * (1 + 0.22 * sq)); if (b && op < 1) b.scale.multiplyScalar(op); });
    if (big) E.splash(t, tl, V(P.x, 0, P.z), splash, n);
    else { const w = t - tl; if (w >= 0 && w < 0.4) for (let j = 0; j < n; j++) { const a = j / n * Math.PI * 2 + 0.4, r = 0.13 + (1.6 + (j % 3) * 0.4) * w, yy = 0.02 + 2.6 * w - 7 * w * w;   // 从块的底边往外溅
      if (yy > 0) E.bit(V(P.x + Math.cos(a) * r, 0.22 + yy, P.z + Math.sin(a) * r * 0.8), splash, 0.07 * (1 - w / 0.4)); } }
    if (fx) fx(t, tl);
    if (t >= tk && t < lineEnd) arc(t, key, [V(P.x - ax[0] * sep, ae, P.z - ax[1] * sep), V(P.x, ah, P.z), V(P.x + ax[0] * sep, ae, P.z + ax[1] * sep)], 0.999 * seg(t, tk, tk + 0.3), 0xb8c4d4);
  }

  // 11/05（第四轮复查）：06 娱乐模式非娱乐格子变灰是 0.4 秒渐变，可这些格子的归属框、升级块原来在 blindG 过 0.5 那一帧一起消失 / 冒回来；改成跟着变灰一起淡出 / 淡入（升级块同时缩小）
  //   engine.js 的 own()、upgrade() 只管显隐、没有透明度：这里直接调它们的材质（只在 full 里，engine.js 不动）。engine.js 里 board 的子节点按创建顺序是
  //   48 个格子 → 48 个归属框（Group，4 根细条）→ 每格 3 块升级块；对不上就返回 null，退回原来的硬切。
  //   改过的材质、缩放、位置都记在 FADED 里，每帧开头 fadeRestore() 复原（engine.js 的 reset() 不管这些），seek 到哪一帧画面都一样
  let FADED = [], FXO;
  function fadeObj(E) {
    if (FXO !== undefined) return FXO;
    const ch = E.board.children, i0 = ch.indexOf(E.tiles[0]), N = E.tiles.length, fr = ch.slice(i0 + N, i0 + 2 * N), bl = ch.slice(i0 + 2 * N, i0 + 5 * N);
    const ok = i0 >= 0 && fr.length === N && fr.every(g => g.isGroup && g.children.length === 4 && g.children.every(b => b.material && b.material.isMeshBasicMaterial))
      && bl.length === 3 * N && bl.every(b => b.isMesh && b.geometry.parameters && b.geometry.parameters.width === 0.2 && b.geometry.parameters.height === 0.14);
    return (FXO = ok ? { frames: fr, blocks: fr.map((_, i) => bl.slice(3 * i, 3 * i + 3)) } : null);
  }
  function fadeMat(m, op) { const o0 = m.opacity, tr = m.transparent; FADED.push(() => { m.opacity = o0; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } });
    if (!tr) { m.transparent = true; m.needsUpdate = true; } m.opacity = o0 * op; }   // 这版 three.js 的 opaque 是着色器参数：切 transparent 要 needsUpdate
  function fadeRestore() { for (let j = FADED.length - 1; j >= 0; j--) FADED[j](); FADED = []; }
  // 第 i 格的归属框按 op（1 原样 → 0 没有）淡出；只动这一帧已经显示的框
  function fadeFrame(E, i, op) { const o = fadeObj(E); if (!o) { if (op <= 0.5) E.own(i, 0, 0); return; }
    const f = o.frames[i]; if (!f.visible || op >= 1) return; if (op <= 0) { f.visible = false; return; } f.children.forEach(b => fadeMat(b.material, op)); }
  // 第 i 格第 j 块升级块：淡出的同时缩小到 0.2，底面贴着格子往下收（不浮起来）
  function fadeBlock(E, i, j, op) { const o = fadeObj(E); if (!o) return;   // 找不到升级块：调用的地方按原来的硬切（blindG ≥ 0.5 不画）
    const b = o.blocks[i][j]; if (!b.visible || op >= 1) return; if (op <= 0) { b.visible = false; return; }
    const s0 = b.scale.x, y0 = b.position.y, s = 0.2 + 0.8 * op; FADED.push(() => { b.scale.setScalar(s0); });
    fadeMat(b.material, op); b.scale.setScalar(s0 * s); b.position.y = y0 - 0.07 * (1 - s); }
  // 11/05（第四轮复查）：片尾大标题卡里橙色「经典三层 Web」线 EC2 → RDS 那段的拱顶（+2.9）从「亨」字后面竖着穿过：片尾这段把拱顶平滑压低（见 run() 里的 t3h）。
  //   engine.js 的 arc 按 key 缓存几何体（第一次调用的点就定死了），这里在 scene 里按 TubeGeometry 的 path 找到 tier3 那根管子：
  //   拱顶高度和这一帧要的不一样，就原地改 curve 的点、重建管子（跑动的光点也沿这条 curve，跟着走）；还没建出来就不管（第一次 E.arc 直接用这一帧的点建）
  let T3M = null; const T3LO = 0.55;   // 片尾压到多低
  function t3Arc(E, P) {
    const same = (c, j) => c.points[j].distanceTo(P[j]) < 1e-4;
    if (!T3M) T3M = E.scene.children.find(m => m.isMesh && m.geometry && m.geometry.type === 'TubeGeometry' && m.geometry.parameters.tubularSegments === 160 && m.geometry.parameters.path
      && m.geometry.parameters.path.points && m.geometry.parameters.path.points.length === P.length && [0, 1, 2, 4].every(j => same(m.geometry.parameters.path, j))) || null;
    if (!T3M) return;
    const c = T3M.geometry.parameters.path; if (c.points.every((p, j) => p.distanceTo(P[j]) < 1e-6)) return;
    c.points.forEach((p, j) => p.copy(P[j])); c.updateArcLengths();
    const g0 = T3M.geometry, q = g0.parameters; T3M.geometry = new THREE.TubeGeometry(c, q.tubularSegments, q.radius, q.radialSegments, q.closed); g0.dispose();
  }

  window.PROMO_SCRIPT = {
    duration: (DUR + OSH) / PLAY,
    run(t, E) {
      t *= PLAY;
      const { V, win, seg, ease, easeOut, D } = E, I = D.icons, TH = () => 0.22;
      const sm = k => k * k * (3 - 2 * k);   // smoothstep：速度峰值是平均的 1.5 倍（ease 是 3 倍）
      // 卡牌进出场：[a0, a1] 滑入（din = -1 从下面、+1 从上面），[b0, b1] 滑出（dout 同理）；不透明度跟着缓入缓出；[f0, f1] 翻面（时间不变，ease 换成 smoothstep，卡边一帧不再甩 40 多像素）
      const cardSl = (tt, a0, a1, b0, b1, din, dout, f0, f1, d = 2.2) => ({ y: din * d * (1 - sm(seg(tt, a0, a1))) + dout * d * sm(seg(tt, b0, b1)), alpha: Math.min(sm(seg(tt, a0, a0 + 0.45)), 1 - sm(seg(tt, b0, b1))), flip: sm(seg(tt, f0, f1)) });
      // 字幕淡入淡出改成带缓动的：进场 0.3 t（约 0.38 秒）easeOut 带上滑，退场 0.22 t（约 0.28 秒）缓入；只改淡入淡出的宽度，不改各段起止（promo.js 的 cwin 也用这个）
      E.capWin = (t_, a, b, fi = 0.45, fo = 0.45) => Math.min(easeOut(seg(t_, a, a + Math.min(0.3, fi))), 1 - easeIn(seg(t_, b - Math.min(0.22, fo), b)));
      fadeRestore(); eggReset(E); openReset(E); if (window.PROMO_OPEN2) PROMO_OPEN2.reset(E);   // fadeRestore：上一帧淡出过的归属框、升级块先复原
      if (CAST_SHOW) { castShow(t, E); return; }   // ?cast=1：只摆一排 Q 版人物，方便对照照片调形象
      if (t >= O0 && t < OE) { window.PROMO_OPEN2 ? PROMO_OPEN2.run(t - O0, E) : opening(t - O0, E); return; }   // 序章：短剧版在 promo_open.js
      if (t >= OE) t -= OSH;
      if (t >= EG0 + 0.3) { egg(t, E); return; }
      // 3D 标签先排队，等下面各段的 camPath 定下这一帧的最终镜头以后再统一算屏幕位置（不然 promo.js 画的标签用的是换镜头之前的相机）
      const labQ = [], labReal = E.label; E.label = (...a) => { labQ.push(a); };
      let AVL = null, STL = null; const POPQ = [];   // 这一帧标签上的表情头像 / 道具贴纸（按标签 key），棋子上方的反应头像；在下面按时间填，帧末和标签一起画
      const capReal = E.caption; CAPF = null; CAPX = null; ARCH = null;   // 字幕先记下来（最后一次 E.caption 为准），帧末由 capDraw 统一画
      try {
      // full 时间 t → promo.js 时间 tt：插段里主线停在插入点前一点
      let mode = 'all', tt = 10.19, tag = null;
      if (t >= INTRO && t < A0) { let acc = 0; tt = null;
        for (const [a, l, key] of INS) { const st = a - SHIFT + acc; if (t < st) { tt = t + SHIFT - acc; break; } if (t < st + l) { tt = a - 0.01; if (key === 'chain') tag = '02 组架构'; break; } acc += l; }
        if (tt == null) tt = 35.19; }
      const AK = t >= A0 && t < SK0 ? Math.max(0, ACUM.findLastIndex(c => t - A0 >= c)) : -1;
      if (AK >= 0) { const k = AK; mode = ALT[k][0]; tt = 35.2 + (t - A0 - ACUM[k]) * (4.2 / ALEN[k]); tag = ALT[k][1]; }
      else if (t >= SK0 && t < DL0) { tt = Math.min(43.2, 39.4 + (t - SK0)); tag = '12 专属技能'; }   // 11/11 fix：12 段多 SKX（2 拍）演「战略并购」，主线停在 43.2（订阅费标签、技能卡、金币都已经是 0）
      else if (t >= DL0 && t < OUT0) tt = 43.2;   // 正好是 promo.js 07 段结束：订阅费标签、技能卡、金币都已经是 0，不留残影
      else if (t >= OUT0) tt = 44.2 + (t - OUT0);   // 片尾提前 1.0 t 接上（原来 OUT0 之后约 2.2 t 画面上一个字都没有）：promo.js 43.2–44.2 之间 full 什么都不演，直接跳过
      window.PROMO_MODE = mode;

      // 字幕编号按 full 版重新排：06 娱乐模式 · 盲盒格 …
      // （CAPS 是压短的字幕备选，现在不用：用户要保留原字幕）
      const CAPS = { '02': '掷骰子，买下没人要的服务', '03': '凑齐真实架构，<b>按整套收</b>', '04': '做了<b>多 AZ</b> 就扛得住', '05 抽卡翻盘': 'Free Tier：<b>拿走整个奖池</b>', '05 线下更好玩': '社交卡：<b>一桌人边玩边聊</b>',
        '06': '盲盒格<b>送卡</b>，效果翻倍', '07': '实例<b>空着也要交钱</b>', '08': '技术债<b>攒到 3 个要重构</b>', '09': '玩家之间<b>自由交易</b>', '10': '答对了<b>过路费少付</b>', '11': '攒满 12 点，<b>DDoS 对手</b>', '12': '快破产？<b>一局一次翻盘</b>' };
      const cap0 = E.caption;
      E.caption = (a, b, c) => {
        if (t < INTRO) return;
        // 同一章里换段（模式段之间、组架构 → 串联、扛事故 → S3、抽卡 → 线下）：前一段末尾不淡出、后一段开头不淡入，
        //   字幕条一直亮着，换段那一刻只有里面的文字交叉淡化（capDraw）；停留时间不变
        if (AK >= 0 && tt < 35.8) c = 1;   // 06 娱乐模式的开头也接 05 四个角（AK 0）
        if (AK >= 0 && AK < 5 && tt > 39.0) c = 1;
        if (t >= SK0 && t < DL0 && tt < 39.9) c = 1;   // 12 专属技能开头接 11（字幕条不灭）
        if (t >= SK0 && t < DL0 && tt > 42.5) c = 1;   // 11/11 fix：主线 43.2 收字幕，full 多演 SKX，字幕条留着、到 DL0 前再收（下面接着画）
        if (/^04 扛事故/.test(a) && tt < 24.4) c = Math.max(c, easeOut(seg(tt, 23.25, 23.55)));   // 02 → 03：主线这一章原来晚 0.4 才淡入，和串联插段之间空了约 0.45 秒；提早淡入，留一个短短的空档
        //   （11/05 验收：原来只管到 tt 23.6，promo.js 自己的淡入 cwin(23.6, …) 从 0 起，字幕条在 T 74.6 一帧从 1 掉到 0.18 再淡回来；管到 24.4，那时原来的淡入早已到 1）
        if ((/^03 组架构/.test(a) && tt > 22) || (/^04 扛事故/.test(a) && tt > 28) || (/^05 抽卡/.test(a) && tt > 31) || (/^05 线下/.test(a) && tt < 33)) c = 1;
        if (tt < 11.2) c = Math.min(c, easeOut(seg(tt, 10.78, 11.08)));   // 序章在 tt 10.7 交接：玩家栏先进，字幕晚 0.08 t 再淡入，不在第一帧就冒出来
        const [nt, b2] = capXf(a, b, tag, mode); CAPF = { tag: nt, html: b2, a: c };
      };
      // 高速部署那段改成 Yuki 发动 DDoS：promo.js 里那条从韩叔出发的红线先不画，下面另画一条从 Yuki 出发的
      // 11/11 refine：14 代理商模式是「换一局」：上一局用不到的东西（韩叔、虫虫、Damo 的归属框和升级块，经典三层 Web、高可用入口两条线）在 R0 + 0.1 → + 0.6 收掉（和 Yuki、Damo 被拿起来重摆、「换一局」横幅同时），
      //   Q0 镜头起飞去 15 段时（Q0 − 0.6 → Q0 + 0.1）再长回来（15、16 段和片尾还是这一局的棋盘）；Yuki 的框留着（这一局她也在，手上照样有这些服务）
      const oldK = 1 - sm(seg(t, DL0 + D13 + 0.1, DL0 + D13 + 0.6)) + sm(seg(t, DL0 + D13 + D14 - 0.6, DL0 + D13 + D14 + 0.1));
      const arc0 = E.arc, imp0 = E.impaired, lab0 = E.label, yukiDdos = AK === 5, ddosOn = AK === 5 || (t >= SK0 && t < DL0), inS3 = t >= ZS && t < ZS + ZL, up0 = E.upgrade, sh0 = E.shield;
      // 橙色「经典三层 Web」线：第一段压低（不起尖刺），第二段抬高（不穿过骰子）；arc 按 key 缓存几何体，第一次调用就用这组点
      //   ELB → EC2 这一跳两格挨着：中间点只抬一点、不往棋盘内侧拐（原来 +V(0.5, 0.3, 0)，CatmullRom 在两格之间过冲，拐出一个 J 形钩，和蓝线缠在一起）
      //   11/05（第四轮复查）：片尾大标题卡（tt 45.4–46.3 淡入）这段，EC2 → RDS 的拱顶 +2.9 从「亨」字后面竖着穿过：标题卡淡入之前（OUT0 + 0.8 → + 1.4，约 0.75 秒）
      //   平滑压到 +0.55（低过标题下沿，线还在），一直留到黑场接彩蛋（彩蛋不画这条线）；几何体由 t3Arc() 跟着重建
      const t3h = t >= OUT0 ? 2.9 + (T3LO - 2.9) * sm(seg(t, OUT0 + 0.8, OUT0 + 1.4)) : 2.9;
      const T3 = [20, 19, 10].map(i => E.top(i).add(V(0, 0.3, 0))), TIER3 = [T3[0], T3[0].clone().lerp(T3[1], 0.5).add(V(0, 0.15, 0)), T3[1], T3[1].clone().lerp(T3[2], 0.5).add(V(0, t3h, 0)), T3[2]];
      E.arc = (t_, key, pts, ...r) => (yukiDdos && key === 'ddos') ? undefined : key === 'tier3' ? arc0(t_, key, TIER3, r[0] * oldK, ...r.slice(1)) : arc0(t_, key, pts, ...r);   // tier3 跟着 oldK 收放
      E.impaired = (i, k) => (ddosOn && i === 7) ? undefined : imp0(i, k);
      E.label = (key, ...r) => (ddosOn && key === 'ddos') || (t >= ZS && /^(imp|shield)/.test(key)) ? undefined : lab0(key, ...r);   // S3 插段起 promo.js 的 Impaired、多 AZ 免疫标签都不再画（插段之后不闪回）
      if (inS3) { const i1 = E.impaired; E.impaired = (i, k) => [2, 13, 28, 35].includes(i) ? undefined : i1(i, k); }
      E.upgrade = (i, ...r) => i === 19 ? undefined : up0(i, ...r);   // EC2 的升级块换成下面的多 AZ 动画
      E.shield = () => undefined;                                       // 护盾都换成下面带涟漪的 shieldX
      // 按规则核对改的几处（只在 full 版里改，promo.js 不动）：
      //   盲盒格只抽 1 张（只画第一张卡，放中间）；运行费的金币不从 DynamoDB（Serverless 不交运行费）飞，改从 ECS 飞（虫虫的，实例型，空着也交运行费）；
      //   AZ 断电只打抽卡人（韩叔）的单 AZ 服务，别人的不画 Impaired；EC2 第 1 级自动 AMI、第 2 级跨 AZ Auto Scaling（多 AZ 在第 2 级），
      //   两次落回 EC2 升到第 2 级，过路费按代码算是 $338（可选位置 Route 53 $14 + ELB $28 + EC2 第 2 级 $240 + RDS $56）；玩家栏在下面重画
      const card0 = E.card, coin0 = E.coinFly, D40 = E.top(40);
      const coinS = (t_, t0, dur, from, to, n, h) => coin0(t_, t0, dur, from, to, n, h, 0, sm); E.coinFly = coinS;   // full 的金币沿路线用 smoothstep（原来 ease 半路是平均速度的 3 倍）
      if (mode === 'party') E.card = (key, info, o = {}) => key === 'g1' || key === 'g2' ? undefined : card0(key, info, key === 'g0' ? { ...o, x: 1.2, s: 0.92, ...cardSl(tt, 35.7, 36.25, 38.8, 39.3, -1, 1, 36.0, 36.5) } : o);   // 11/11：虫虫走 3 格（35.96 落地）以后再翻卡   // 退场往上滑走（和别的卡一样，不从字幕条后面穿出去）   // 卡往右挪，让开左边「虫虫踩到盲盒格」的标签
      else E.card = (key, info, o) => {
        if (key === 'free') return card0('wa', D.cards.wa, { ...o, x: -2.6, s: 0.8, ...cardSl(tt, 29.8, 30.4, 31.5, 32.1, -1, 1, 30.0, 30.8) });   // 卡放到左边、缩小一点，让出镜头正中的 User Group 角和 Aurora，看得到升级块落下
        if (key === 's1') return;                                   // 字幕没提 Office Hours，只发 3 张
        if (/^s[023]$/.test(key)) { const j = { s0: 0, s2: 1, s3: 2 }[key], a = 32.0 + { s0: 0, s2: 2, s3: 3 }[key] * 0.16, c = cardSl(tt, a, a + 0.55, 34.5 + 0.1 * j, 35.0 + 0.1 * j, -1, -1, a + 0.25, a + 0.75);   // 退场按进场顺序错开 0.1（原来三张在 34.7–35.2 一起落下），最后一张仍在 35.2 落完
          return card0(key, info, { ...o, s: 0.8, x: { s0: -2.7, s2: 0, s3: 2.7 }[key], y: c.y - 0.35, alpha: c.alpha, flip: c.flip }); }
        if (key === 'az') return card0(key, info, { ...o, x: 0, s: 1, ...cardSl(tt, 23.2, 23.9, 25.7, 26.3, -1, 1, 23.5, 24.3) });   // 不再缩在右列，往上滑走淡出
        if (key === 'skill') { const k = sm(seg(tt, 40.55, 41.35));   // 挪到右边提早 0.25 开始、多给 0.3（原来 0.5 内挪 3.6，一帧近 60 像素）
          const c = cardSl(tt, 39.8, 40.4, 42.3, 42.9, 1, 1, 40.0, 40.8); return card0(key, info, { ...o, x: 3.6 * k, s: o.s - 0.4 * k, ...c, y: c.y + 1.2 * k }); }   // 挪到右上空处、再小一点：不挡右列 43 号格上 Yuki 的棋子和他那一路订阅费金币   // 从上面滑下来，金币飞出前挪到右边缩小，让开 Damo
        return card0(key, info, o);
      };
      const burst0 = E.coinBurst; E.coinBurst = (t_, t0, ...r) => (t0 > 30 && t0 < 31.5) ? undefined : burst0(t_, t0, ...r);
      if (mode === 'basic') E.coinFly = (t_, t0, dur, from, ...r) => coinS(t_, t0, dur, from.distanceTo(D40) < 1.5 ? E.top(21).add(V(0, 0.6, 0)) : from, ...r);   // 11-09 起 35 号格是 Cognito（托管型，空着不交运行费），改从虫虫的 ECS（21，实例型）飞
      if (t >= SK0 && t < DL0) E.coinFly = (t_, t0, dur, from, ...r) => coinS(t_, t0, dur, from.distanceTo(E.top(10)) < 1 ? E.top(11).add(V(0, 0.8, 0)) : from, ...r);   // 12 段虫虫站在 Kinesis 上，订阅费从他那儿飞出，不从 RDS 飞
      // promo.js 的标签：有的不画（rent、up2 等由 full 自己画或不演），有的换锚点（按 full 的最终镜头，光点贴近格子）、换文案
      //   arch：串联插段开始以后 promo.js 的那条不再闪回（插段里画的 arch 在 finally 之后调用，不受影响）
      const lab1 = E.label;
      const ARCHP = TIER3[3].clone().add(V(0, 0.1, 0));   // 橙线 EC2 → RDS 那一跳的拱顶（曲线正好经过这个点）：arch 标签的光点落在线上（原来挂在拱顶下方 0.4 的空白处）
      const POS = { arch: () => ARCHP, run: () => V(0, 1.2, 2.0), debt: () => V(E.top(13).x, 0.8, E.top(13).z), sub: () => V(E.top(30).x, 1.0, E.top(30).z), buy: p => V(p.x, 0.95, p.z), up1: p => V(p.x, 0.95, p.z) };
      //   low：Damo 是 SaaS 创业公司，开局资金 $1600（后走补贴只加现金、不算进开局资金），技能门槛 $800；服务 $740 = Redshift $340 + CloudFront $400
      const TXT = { low: '<span>几轮之后：Damo 总资产只剩 $790</span><small>现金 $50 + 服务 $740，跌破开局资金 $1600 的一半（$800）</small>', up1: '<span>绕了两圈，又两次落回 EC2 · 升到<b>跨 AZ Auto Scaling</b>（多 AZ）</span>',   // 11/11 fix：包一层 span（.lbl 是 flex + gap，裸文本和 <b> 之间会多出 14px 空白）；升级要停在自己的服务上，先写明绕了两圈（玩家栏按两圈记账）
        arch: '<span>有效架构 · <b>经典三层 Web</b></span><small>Route 53（可选）→ ELB → EC2 → RDS</small>',
        run: '<span>运行费交给<b>亚马逊云科技</b></span>',
        sub: '<span>每位对手付 Damo <b>$150</b> 订阅费</span><small>接下来 4 个自己的回合开始时收</small>' };   // 11/12 refine2：小字照 index.html「上架 Marketplace」原话（原来「连续 4 个回合」），当场飞的金币读成第一次收   // 入门局 run：去掉「实例按运行时长计费 · Serverless 按用量」，怎么计费交给 drun、s3use 两个例子说（11/11 fix）   // 16:28 版经典三层 Web 带可选的 Route 53（韩叔开场就有），有就一起收
      E.label = (key, pos, html, ...r) => {
        if (key === 'arch') ARCH = [ARCHP, TXT.arch, r[1]];   // 位置用 full 换过的锚点（拱顶），插段开头接着画时不跳   // 记下这条标签：串联插段开头接着画它、在同一位置换成 arch3（不先熄灭再亮一条一样的）
        if (/^imp(2|13|28|35)$/.test(key) || key === 'rent' || key === 'yemr' || key === 'up2' || (key === 'arch' && t >= XS)) return;
        let a = r[0];
        if (key === 'arch' && tt > 21) a = 1;                                           // 一直亮到串联插段
        if (key === 'shield') a = Math.min(a, 1 - easeIn(seg(tt, 29.5, 29.75)));        // 多 AZ 免疫：S3 插段（tt 29.79）之前淡完，不被插段一刀切掉
        if (key === 'run' && mode === 'basic') a = Math.min(a, 1 - easeIn(seg(tt, 38.36, 38.58)));   // 入门局：镜头 tt 38.6 起飞去 08 标准局，之前收完
        if (key === 'low') a = win(tt, 39.5, 41.5, 0.3, 0.25);   // 41 个字的账：promo.js 原来 41.0 就收（全亮约 1.1 秒），full 多停到 41.5，和下面的 sub 在同一锚点上一前一后
        if (key === 'sub') a = win(tt, 41.45, 43.2, 0.3, 0.3);
        if (key === 'debt') { const dp = c => Math.max(0, 1 - Math.abs(tt - c) / 0.2); a *= 1 - 0.3 * ease(Math.max(dp(36.4), dp(37.4))); }   // 换数字时只轻轻收暗一下（原来暗到约 25%，像闪了一下）   // 技术债 ×1→×2→×3：promo.js 在 tt 36.4、37.4 一帧换字（×3 还换成红框），这里在换字前后各 0.2（约 0.25 秒）先收暗缩一点再弹回，不硬切
        if (key === 'debt') html = html.replace('（SaaS 的弱点）', '（别人 $20）');
        if (typeof html === 'string') html = html.replace(/([\u4e00-\u9fa5]) (?=[\u4e00-\u9fa5])/g, '$1');   // 「韩叔 买下」「换下 虫虫 的」：promo.js 的模板按英文名写，中文名两边多了半角空格   // 这时还没交代 Damo 是 SaaS 角色，小字改成和别人比
        lab1(key, POS[key] ? POS[key](pos) : pos, TXT[key] || html, a, ...r.slice(1));
      };
      const imp1 = E.impaired;
      E.impaired = (i, k) => (tt >= 26 && tt < 30.5 && [2, 13, 28, 35].includes(i)) ? undefined : imp1(i, k);
      const dice0 = E.dice;
      // 第一把骰子是序章里 Damo 一拳打出来的（参数见 DICE1，和序章末尾同一组）。11/11 fix：轮到虫虫（tt 20.1）他自己掷一把 1 + 2 = 3（原来没掷就走 3 格，桌上还是韩叔的 3 + 5）：
      //   桌上那两颗贴着桌面缩没（0.15），新的从虫虫那边扔进来，停在同一个位置；之后桌上一直是 1、2
      //   11/11 fix2（11/12 cardrestore 只留这一把）：06 娱乐模式开头虫虫再掷一把 1 + 2（和 RD2 同一组参数，落定以后和原来桌上那两颗一模一样，后面各段的骰子画面不变）；
      //   A0 前先把桌上那两颗贴着桌面缩没（0.15）
      const diceA = (t_, t0, t1, vals, at) => t_ >= RD2.t0 ? dice0(t_, RD2.t0, RD2.t1, [1, 2], at, RD2.from, 1 - sm(seg(t, A0 - 0.15, A0)), RD2.bo) : dice0(t_, DICE1.t0, DICE1.t1, vals, at, DFROM, 1 - sm(seg(t_, RD2.t0 - 0.15, RD2.t0)), DICE1.bo);
      E.dice = (t_, t0, t1, vals, at) => t0 !== 10.7 ? dice0(t_, t0, t1, vals, at) : t < A0 || t < INTRO ? diceA(t_, t0, t1, vals, at)
        : dice0(AK === 0 ? tt : 99, 35.2, 35.2 + RD2.t1 - RD2.t0, [1, 2], at, RD2.from, 1, RD2.bo);
      const show0 = E.show;
      // 学习模式那段虫虫落在没人买的 Kinesis 上：题目照用户要的保留「S3 标准存储几个 9」（D.quiz，存储组），题头只写「答对 8 折买」（没人买的地答对打 8 折，不收过路费）
      // 题头：虫虫的编号圆点换成他的表情头像（先「思考」，tt 37.4 揭晓答对了换成「开心」），题框右上角斜贴他的地图卷轴；没有切图时题框和原来一样
      const qav = avHTML('chong', ['think', 'happy']), qstk = qav ? stkHTML('chong_scroll', 'xqs') : '', QZT = 200;
      E.show = (key, cls, html, ...r) => { if (key === 'hud') return;
        if (key === 'quiz') { html = html.replace('答对过路费少付', '答对 8 折买').replace('虫虫 答题', '虫虫答题'); cls = 'quizbox xq'; }   // xq：底更不透明，揭晓后答错的选项不再淡成和透出来的棋盘字一样（style.css）
        if (key === 'quiz' && qav) html = html.replace(/<i style="[^"]*">2<\/i>/, qav) + qstk;
        const el = show0(key, cls, html, ...r);
        if (key === 'quiz' && el) el.style.top = QZT + 'px';   // 11/12 refine2：答题框往下挪（style.css 是 150px，顶排 30 号格的 Damo 只露出头顶；refine2 时韩叔也站在 31）；只改 full 的这个元素，style.css 不动
        if (key === 'quiz' && qav && el) { avSet(E, el.querySelector('.qh'), seg(r[0], 0.3, 1), xsm(seg(tt, 37.4, 37.62))); stkSet(E, el.querySelector('.xqs'), seg(r[0], 0.35, 1), t, 12); }
        return el; };
      const q0 = D.quiz;
      E.safeM = 56;   // 3D 标签离画面边至少 56px（engine.js 默认 22，贴边的几条在有过扫描、圆角的屏上会被裁掉）
      if (t < CS) { E.safeR = 1500; E.safeRB = 330; }   // 玩家栏（只在四个角之前显示）占右上角：上沿在 330px 以上的标签不进去
      const camP0 = E.camPath; if (t >= W0F + 0.6 && t < OUT0 + 1.9) E.camPath = () => camP0(t, CAMW);   // 片尾：主线那条静止机位换成一条慢推，engine.js 的 outro() 再从这条镜头往环绕机位过渡（没有 1.5 秒的死区）
      // 序章接正片（tt 10.7）：序章最后一帧没有归属框，这里让所有归属框从接缝处起按玩家错开 0.05 依次长出来，不在接缝那一帧一下子全冒出来
      const own0 = E.own, seamK = p => t >= INTRO && tt < 11.4 ? seg(tt, 10.72 + 0.05 * p, 11.3 + 0.05 * p) : 1, ownS = (i, p, a = 1) => own0(i, p, Math.min(a, seamK(p)));
      if (t >= INTRO && tt < 11.4) E.own = ownS;
      t3Arc(E, TIER3);   // 片尾压低拱顶：在 promo.js 画 tier3（设 drawRange、摆光点）之前先把管子换成这一帧的形状
      try { base.run(tt, E); } finally { D.quiz = q0; E.caption = (a, b, c) => { CAPF = { tag: a, html: b, a: c }; }; E.camPath = camP0; E.arc = arc0; E.impaired = imp0; E.label = lab0; E.upgrade = up0; E.shield = sh0; E.card = card0; E.coinFly = coin0; E.show = show0; E.coinBurst = burst0; E.dice = dice0; E.own = own0; }
      const blindG = AK === 0 ? seg(tt, 35.2, 35.6) * (1 - seg(tt, 39.0, 39.4)) : 0;   // 娱乐模式那段：非娱乐服务变成盲盒格（下面灰掉）
      // ---------- 表情头像（像综艺的反应镜头）：点名某个人的标签带上他这一刻的表情，同一个人接连几条换不同表情 ----------
      //   好事（买下、收钱、组成架构、抽到好卡）开心 / 大笑 / 得意；坏事（付钱、被 DDoS、资产缩水、技术债）惊讶 / 生气 / 思考；答题先思考、答对开心；发动攻击调皮
      //   [谁, 表情（一串时按第三项的进度交叉淡化）, 进度]；同一时刻画面上的头像、道具不超过 3 个（所以 DDoS 那段 Damo、韩叔的防护标签不带头像）
      AVL = {
        buy: ['han', 'confident'], rent324: ['chong', 'surprised'], buy53: ['han', 'smug'], rdsimp: ['han', 'angry'],
        s3leak: ['chong', 'serious'], s3gd: ['chong', 'think'], ywa: ['yuki', 'happy'], ysoc: ['yuki', 'cheer'],
        dparty: ['chong', 'amazed'], s3use: ['yuki', 'confident'], drun: ['damo', 'think'],
        debt: ['damo', ['serious', 'surprised', 'fire'], xsm(seg(tt, 36.3, 36.5)) + xsm(seg(tt, 37.3, 37.5))],   // 技术债 ×1 → ×2 → ×3：在标签收暗的那一下（tt 36.4、37.4 前后）换表情
        trade: ['han', 'proud'], yddos: ['yuki', 'playful'], ddos2: ['chong', 'surprised'],
        low: ['damo', ['surprised', 'determined'], xsm(seg(tt, 40.43, 40.48))], sub: ['damo', 'laugh'],   // 资产只剩 $790 先惊讶，技能卡翻过来（tt 40.0–40.8）换成坚定，收订阅费大笑
        acq: ['damo', 'confident'], rs0: ['yuki', 'determined'], rs2: ['damo', 'encourage'], rs3: ['yuki', 'playful'], rs4: ['yuki', 'happy'] };
      // 道具贴纸：Yuki 当代理商「折扣进货」进他的背包；「怎么赢」贴上 User Group 冠军奖杯（序章里说要把它抢回来）；另外两处在下面：WA 卡旁边 Yuki 的小伙伴、答题框上虫虫的地图卷轴
      STL = { rs1: ['yuki_bag', 'xbag', 10], wmulti: ['han_trophy', 'xtro', 12], stm: ['chong_compass', 'xcmp', -12] };   // 学习模式横幅：虫虫（认证大满贯）的指南针
      // 付钱 / 收钱：棋子上方弹一个小头像（收钱的大笑、付钱的心疼），不到 1 秒就退掉；只挑最有戏的几笔
      const popA = (x, a, b) => Math.min(easeOut(seg(x, a, a + 0.22)), 1 - easeIn(seg(x, b - 0.24, b)));
      const pawnP = (p, i, dx = 0) => { const P = E.top(i), o = [[-0.18, -0.18], [0.18, 0.18], [0.18, -0.18], [-0.18, 0.18]][p]; return V(P.x + o[0] + dx, P.y + 0.72, P.z + o[1]); };   // 棋子头顶（和 engine.js pawnAt 的站位一样；dx 往左挪一点，让开旁边的标签）
      if (t >= INTRO && t < XS && tt >= 22.1) POPQ.push(['rent', 'han', 'laugh', pawnP(0, 19, -0.58), popA(tt, 22.12, 23.12)]);   // 虫虫的过路费落到韩叔这边（第一枚 tt 22.3 到）
      if (mode === 'basic' && tt >= 35.6) POPQ.push(['runc', 'han', 'think', pawnP(0, 19, -0.58), popA(tt, 35.62, 36.5)]);   // 运行费：韩叔的 EC2 是实例，第一个交钱
      if (mode === 'full' && tt >= 36.9) POPQ.push(['trade', 'chong', 'playful', pawnP(1, 11, -0.15), popA(tt, 36.95, 37.85)]);           // 韩叔的 $400 飞到虫虫这边
      if (t >= SK0 && t < DL0 && tt >= 41.0) POPQ.push(['subh', 'han', 'surprised', pawnP(0, 19, -0.58), popA(tt, 41.02, 41.95)]);  // Damo 发动技能：韩叔第一个掏订阅费
      // 02 买服务：promo.js 把 11.0、12.6 两帧的 lookAt 往前挪了；序章最后一帧还是按旧的 lookAt 摆的（正片 10.7 秒），
      // 所以接上正片的前 0.7 秒从旧 lookAt 慢慢过渡到新的，接缝处不跳
      if (t >= INTRO && tt >= 10.7 && tt < 11.4) {
        const K = tt < 11.0 ? [[10.0, [0, 0, 0.5]], [11.0, [-3.6, 0, 2.2]]] : [[11.0, [-3.6, 0, 2.2]], [12.6, [-5, 0, 2.6]]];
        const Lo = V(...K[0][1]).lerp(V(...K[1][1]), ease(seg(tt, K[0][0], K[1][0]))), P = E.camera.position;
        const Ln = P.clone().add(E.camera.getWorldDirection(V(0, 0, 0)).multiplyScalar(Lo.distanceTo(P)));
        E.camera.lookAt(Lo.lerp(Ln, ease(seg(tt, 10.7, 11.4))));
      }
      {
        const { top } = E;
        // 韩叔开场就有 ELB 和 RDS，买下 EC2 才凑齐「经典三层 Web」
        if (t >= INTRO) { ownS(20, 0, 1); ownS(10, 0, 1); }
        if (t >= INTRO) ownS(22, 3, seg(tt, 10.2, 10.9));   // API Gateway 归 Yuki（运行费那段拿它当 Serverless 按量收费的例子）
        if (t >= INTRO) { ownS(15, 1, seg(tt, 10.2, 10.9)); if (blindG < 0.5 || fadeObj(E)) E.upgrade(15, 1, 1, Math.min(seg(tt, 10.2, 10.9), seamK(1))); if (blindG > 0) fadeBlock(E, 15, 0, 1 - blindG); }   // GuardDuty 开场就是虫虫的，带一级升级；S3 插段里它只能告警、让虫虫少赔一半（不算免疫）
        if (t >= INTRO) ownS(47, 0, seg(tt, 10.2, 10.9));   // Shield Advanced 归韩叔（DDoS 是 Yuki 发动的，不能自己防自己），盖掉 promo.js OWN 表里的 47:3
        if (t >= INTRO) ownS(37, 0, seg(tt, 10.2, 10.9));   // Route 53 开局就在韩叔手里（他站在 EC2 上，按规则不能在串联插段里「再买下」）
        if (t >= INTRO) [46, 45].forEach(i => ownS(i, 3, seg(tt, 10.2, 10.9)));   // KMS、CloudTrail 开场就是 Yuki 的（万能服务；代理商段拿 CloudTrail 顶上 GenAI 知识库缺的 S3，不再突然变紫）
        if (t >= INTRO) ownS(21, 1, seg(tt, 10.2, 10.9));   // ECS 开场就是虫虫的（实例型，空着也交运行费）：11 段 Yuki 的 DDoS（重）打它（原来打 2 号格 Lightsail，现在 2 号格是 AgentCore）
        if (tt >= 14.45) { const m = E.pawnAt(0, 19), k = easeOut(seg(tt, 14.45, 14.8)); m.position.x -= 0.4 * k; m.position.z += 0.15 * k; }   // z 再挪 0.15：底座整个落在 EC2 格里（原来骑在 ELB 和 EC2 的分界线上）   // 红棋子挪到 EC2 格子外沿，不挡格名和多 AZ 块
        if (AK > 3 || t >= SK0) E.own(7, 0, 1);   // 完整局那段韩叔换下了虫虫的 Lambda，之后一直是韩叔的（交易那段 promo.js 自己演过渡）
        if (t >= SK0 - 0.2) { E.own(32, 0, 0); E.own(44, 0, 0); }   // 专属技能前 Damo 已经卖掉 Bedrock、OpenSearch 周转：只剩 Redshift $340 + CloudFront $400 = $740（和 low 标签的账对上）
        if (tt >= 20.45 && tt < 21.35 && t < XS) lab0('dice2', V(-3.4, 1.5, 2.2), '<b>1 + 2 = 3</b>', win(tt, 20.5, 21.3, 0.2, 0.3), 'big');   // 虫虫掷出 3 点：Route 53 按请求计费，过路费里的 $14 就是按这 3 点算的
        if (tt >= 21.4 && tt < 23.2 && t < XS) lab0('rent324', V(top(10).x, 1.6, top(10).z), '<span><b>虫虫付给韩叔过路费 $338</b></span><small>Route 53 $14 + ELB $28 + EC2 $240 + RDS $56 整套收</small>', win(tt, 21.4, 23.2, 0.25, 0.4), 'warn');
        // AZ 断电：韩叔抽到，他的 RDS 还是单 AZ → Impaired；EC2 做了多 AZ → 护盾
        // 11/11 fix：Impaired 要到韩叔自己的下个回合开始才恢复（index.html startTurn），之后虫虫、Damo、Yuki 的回合里都还是 Impaired：S3 插段前从满亮收到不闪的暗红，留到玩家栏退场（CS − 0.35）再淡掉
        if (tt >= 26.4 && t < CS) { imp0(10, seg(tt, 26.5, 26.9) * (1 - 0.5 * seg(tt, 29.3, 29.79)) * (1 - sm(seg(t, CS - 0.35, CS - 0.08)))); if (t < ZS) lab0('rdsimp', V(top(10).x, 1.4, top(10).z), '<span>韩叔的 <b>RDS 还是单 AZ</b></span><small>Impaired：到韩叔下回合开始前不收过路费</small>', win(tt, 26.6, 29.6, 0.3, 0.3), 'warn'); }
        // 虫虫在盲盒格那段走到 Kinesis（11 号格），之后一直在那儿
        // 11/11 fix：两颗骰子最少走 2 格（原来 RDS → Kinesis 只走 1 格）：桌上是虫虫掷的 1 + 2，走 3 格到 Redshift（13 号，娱乐模式里也是盲盒格）；
        //   换到 07 入门局（盲盒格变回来、镜头拉开）时把他拿回 Kinesis（10 学习模式、12 专属技能都站在那儿）
        if (AK === 0) { const st = (tt - 35.68) / 0.1, k = Math.floor(st), m = E.pawnAt(1, tt < 35.68 ? 10 : 10 + Math.min(3, k + sm(st - k))), kb = sm(seg(tt, 39.05, 39.4));   // 11/11 fix2：先掷 1 + 2（tt 35.2–35.67），每格 0.1 跳 3 格，35.98 落地（原来 35.3 起每格 0.22，35.96 落地）
          if (kb > 0) { const A = E.top(13), B = E.top(11); m.position.x = A.x + 0.18 + (B.x - A.x) * kb; m.position.z = A.z + 0.18 + (B.z - A.z) * kb; m.position.y += Math.sin(Math.PI * kb) * 0.9; } }
        else if (AK > 0 || t >= SK0) E.pawnAt(1, 11);
        // 玩家栏：按规则算的账（韩叔：买 EC2 −100，升两级 −175 = 第 1 级自动 AMI $75 + 第 2 级跨 AZ Auto Scaling $50（有高可用入口减半）+ 没有 VPC 的 $50，
        //   收过路费 +338（经典三层 Web 的可选位置 Route 53 也在韩叔手上，一起收：虫虫走 3 格，按请求计费 $32 × 3 / 7 ≈ $14）；虫虫 −338；Yuki 抽到 Well-Architected Review 免费升级，不花钱）
        //   S3 公开：虫虫只有 GuardDuty，每人少赔一半，赔另外三人各 $25（金币 ZS + 3.2 起飞，ZS + 3.9 前后落到各人身上时扣钱）
        // 11/11 fix：① 韩叔「绕了两圈」才两次落回 EC2：tt 16.8 四个人各按两圈记账（每圈经过 Startup 扶持领 $200 Credits、交运行费，index.html passLaunch / runCost）：
        //   韩叔 +400 − 运行费 50（EC2 0 级）− 55（EC2 1 级）− 升级 175 → 1520；虫虫 +400 − 2 × 10（S3 固定月费 5 + ECS 5）→ 1780；Damo +400 − 2 × 20（Redshift、OpenSearch 各 10）→ 2010；
        //   Yuki +400 − 2 × 20（Aurora、DMS 各 10；KMS 0 级、CloudTrail 不收）→ 1680。
        //   ② 过路费：Route 53 按请求计费，韩叔收 $14 还要交 15% 请求费 $2（payRent），实收 $336。
        //   11/12 cardrestore：抽卡段恢复原样（不再有付费抽卡、落格走格），这几段只有 S3 公开那笔 $25 的账（和原来一样）；①②照留，后面的数按两圈的账顺延
        const s3p = t >= ZS + 3.9 + 0.8 ? 25 : 0;
        const cash = [(tt < 14.6 ? 1500 : tt < 17.1 ? 1400 : tt < 21.6 ? 1520 : 1856) + s3p, (tt < 17.1 ? 1400 : tt < 21.6 ? 1780 : 1442) - 3 * s3p, (tt < 17.1 ? 1650 : 2010) + s3p, (tt < 17.1 ? 1320 : 1680) + s3p];   // 11/11 refine：两圈的账从 16.8 挪到 17.1 才记（up1「绕了两圈」17.0 起淡入，半亮时数字再跳，不比说明早）
        const turn = (t >= ZS && t < ZS + ZL) ? 1 : (t >= ZS + ZL && t < CS) ? 3 : t < TS1 ? 0 : tt < 23.2 ? 1 : 0;   // S3 插段是虫虫；之后抽 WA 卡、开踩坑大会的是 Yuki（11/12 cardrestore：恢复原来的轮次，只把轮到虫虫提早到 TS1，他先掷骰子）
        // 有四个人的立绘头像时：编号圆点换成小头像；轮到谁不再一帧换，0.24 t（0.3 秒）里交叉过渡 —— 他的头像亮一点、略放大，这一行的底色和左边橙条跟着渐变出来
        const hudA = t < CS ? Math.min(easeOut(seg(tt, 10.7, 11.0)), 1 - easeIn(seg(t, CS - 0.35, CS - 0.08))) : 0, hudHd = XWHO.every(w => XSP[w] && XSP[w].head);   // 序章之后从 10.7 秒接上；四个角之前退场：踩坑大会标签先收，玩家栏其次，字幕最后
        const hudE = show0('hud', 'hud', ['韩叔', '虫虫', 'Damo', 'Yuki'].map((n, k) => hudHd ? `<div>${headHTML(XWHO[k], 'xhud')}<span>${n}</span><b>$${cash[k]}</b></div>` : `<div class="${k === turn ? 'on' : ''}"><i style="background:${E.COLORS[k]}">${k + 1}</i><span>${n}</span><b>$${cash[k]}</b></div>`).join(''), hudA);
        if (hudHd && hudA > 0) {
          const TURN = [[[-1e9, TS1], [XS + XL, ZS]], [[TS1, XS + XL], [ZS, ZS + ZL]], [], [[ZS + ZL, 1e9]]];   // 和上面的 turn 一样：tt 20.1（t = TS1，11/11 fix：虫虫先掷骰子，原来 XS − 2.8）轮到虫虫，串联插段之后韩叔，S3 插段虫虫，之后 Yuki（11/12 cardrestore：恢复原来的高亮）
          const onK = p => TURN[p].reduce((m, [a, b]) => Math.max(m, Math.min(sm(seg(t, a - 0.12, a + 0.12)), 1 - sm(seg(t, b - 0.12, b + 0.12)))), 0);
          [...hudE.children].forEach((row, k) => { const q = onK(k), av = row.firstElementChild;
            row.style.background = `rgba(236,114,17,${(0.16 * q).toFixed(3)})`; row.style.boxShadow = `inset ${(4 * q).toFixed(2)}px 0 0 #ec7211`; row.style.color = `rgb(${Math.round(207 + 48 * q)},${Math.round(214 + 41 * q)},${Math.round(223 + 32 * q)})`;
            av.style.transform = `scale(${(1 + 0.14 * q).toFixed(3)})`; av.style.filter = `brightness(${(0.8 + 0.2 * q).toFixed(3)}) saturate(${(0.7 + 0.3 * q).toFixed(3)})`;
            av.style.boxShadow = `0 0 0 2px rgba(255,255,255,${(0.55 + 0.4 * q).toFixed(3)}),0 0 ${(3 + 13 * q).toFixed(1)}px ${E.COLORS[k]}`; });
        }
      }

      // ---------- 防护动画 ----------
      {
        const { top, bit } = E, Q = top(19);
        // 03 升级：EC2 两次落回、升到第 2 级跨 AZ Auto Scaling（多 AZ）—— EC2 一分为二，两块沿格子内侧分开，中间连一条线
        //   用韩叔的红色（EC2 是韩叔的，游戏里升级块就是主人的颜色；原来是灰蓝色，和别的格子对不上）；摆在格子内侧，不压格名和图标
        //   11/05：原来两块一帧整块出现再分开、连线一帧冒出来；改成从 2.2 高处落下（tt 17.1 落地，music.mjs 的 thunk 对在这儿）→ 17.18–17.5 分开 → 17.5–17.8 画出连线，都在 16.8–17.8 里
        azDrop(E, arc0, tt, { key: 'azlink', i: 19, P: V(Q.x + 0.55, 0, Q.z), ax: [0, 1], t0: 16.8, hd: 2.2, fall: 0.3, ts: 17.18, tk: 17.5, lineEnd: 23.2, col: E.COLORS[0], op: oldK });
        // 04 AZ 断电：红色冲击波从棋盘中间扫出去，碰到韩叔 EC2 的多 AZ 护盾泛起涟漪
        if (tt >= 26.2 && tt < 27.4) { const u = seg(tt, 26.2, 27.3); E.shockwave('azwave', 0, 0.3, u * 12, 0.85 * (1 - u)); }
        const shk = seg(tt, 26.45, 26.85) * (1 - seg(tt, 29.6, 29.79));
        if (shk > 0 && !inS3) E.shieldX('ec2', 19, shk, { color: 0x4aa3ff, ripple: seg(tt, 26.72, 27.3) });
      }

      // ---------- 四个人的戏份平均一点：盲盒格、运行费点名 Damo；DDoS 由 Yuki 发动 ----------
      {
        const { top, COLORS } = E;
        // 06 娱乐模式：只留常用服务，其余格子变成盲盒格（灰掉、不显示归属）；虫虫踩到的 Kinesis 也是盲盒格，打个问号
        if (blindG > 0) {
          [5, 21, 39, 8, 23, 41, 26, 43, 13, 28, 44, 15, 29, 46, 11].forEach(i => { fadeFrame(E, i, 1 - blindG); E.tiles[i].userData.top.color.setRGB(1 - 0.4 * blindG, 1 - 0.4 * blindG, 1 - 0.34 * blindG); });   // 11 Kinesis 也是盲盒格（index.html PARTY_HIDE）
          E.highlight(13, blindG * seg(tt, 35.8, 36.0) * (0.5 + 0.3 * Math.sin(t * 7)));   // 虫虫落在 13 号 Redshift（盲盒格）上（11/11：原来是 11 号）
          E.label('blindq', V(top(13).x, 0.6, top(13).z), '<b>?</b>', win(tt, 35.85, 39.2, 0.3, 0.3), 'big');
        }
        if (mode === 'party') E.label('dparty', V(top(13).x, 2.0, top(13).z - 1.3), '<span><b>虫虫</b>踩到盲盒格</span><small>随机抽 1 张，好坏都翻倍</small>', win(tt, 35.9, 39.2, 0.3, 0.3), 'ok title');   // title：横幅式，不画引线和光点（原来光点悬在骰子旁边的空白处）
        if (mode === 'basic') E.label('s3use', V(top(22).x, 1.2, top(22).z), '<span><b>Yuki 的 API Gateway</b> · Serverless 空着不花钱</span>', win(tt, 36.2, 38.5, 0.3, 0.2), 'ok');   // 11/12 refine2：压成一句（原来两段约 1100 宽，右边压在顶排 30 号格 Damo 的棋子底座上）；和 drun「空着也要交运行费」对着看，按量收费字幕里有
        if (mode === 'basic') E.label('drun', V(top(13).x, 0.8, top(13).z), '<span><b>Damo 的 Redshift</b> · 实例按运行时长计费</span><small>空着也要交运行费</small>', win(tt, 35.6, 38.42, 0.3, 0.2), 'warn');
        if (ddosOn) { const off = seg(tt, 37.9, 38.2) * (1 - seg(tt, 38.96, 39.12));   // 11 段结束前淡掉（12 段是「几轮之后」，ECS 早恢复了），和 ddos2 标签同步收；退场顺序：三条防护标签 → ECS → 护盾 → 部署点数面板 → 字幕
          if (off > 0) { imp0(21, off * (0.75 + 0.25 * Math.sin(tt * 30))); lab0('ddos2', V(top(21).x + 0.6, 0.25, top(21).z), '<span><b>虫虫的 ECS 下线 2 回合</b></span><small>不收过路费，运行费照交</small>', win(tt, 38.0, 39.1, 0.25, 0.14), 'warn'); } }   // 光点落在 ECS 格面靠棋盘里的一半（左边一列朝里是 +x）
        if (yukiDdos) {
          const spent = tt >= 37.3, sp = spent ? Math.max(0, 12 - Math.floor(seg(tt, 37.3, 37.6) * 12.99)) : Math.min(12, Math.floor(seg(tt, 35.4, 37.0) * 12.99));   // 红线发出（tt 37.3）就扣掉 12 点（index.html ddos() → speedSpend(p, 12)）：一格一格熄灭，tt 0.3 内扣完，跟红线发出同步
          E.show('speed', 'speed', `<div class="sh">${headHTML('yuki') || `<i style="background:${COLORS[3]}">4</i>`}Yuki · 部署点数 <b>${sp} / 12</b></div><div class="sc">${Array.from({ length: 12 }, (_, k) => `<span class="${k < sp ? 'on' : ''}${k === 11 && sp === 12 ? ' max' : ''}"></span>`).join('')}</div><div class="sk">${spent && sp === 0 ? '花掉 12 点 · <b>DDoS（重）</b>' : spent || sp === 12 ? '12 点 · <b>DDoS（重）</b>' : '每回合 +1，花点数发动技能'}</div>`, Math.min(easeOut(seg(tt, 35.3, 35.55)), 1 - easeIn(seg(tt, 39.18, 39.32)))).style.borderLeftColor = COLORS[3];   // 竖条用 Yuki 的紫色
          const PA = top(43).add(V(0, 0.9, 0)), PB = top(21).add(V(0, 0.3, 0));
          // 红线拱顶压低（原来 +3.4，上升段和拱顶藏在「Yuki 攒满 12 点」后面），走在 Yuki 标签下面；CloudFront、Shield Advanced 两条防护标签在红线出发（tt 37.3）之前收完
          //   目标换成左边一列的 ECS 以后红线要横穿棋盘：拱顶再压到 +0.5，贴着棋盘中间的标题走，不藏到右上的 yddos、左上的 ddos2 两条标签后面
          if (tt >= 37.3) arc0(tt, 'ddosY', [PA, PA.clone().lerp(PB, 0.5).add(V(0, 1.0, -0.6)), PB], seg(tt, 37.3, 37.9) * (1 - seg(tt, 37.95, 38.2)), 0xff3b30);   // 打中 ECS 就收线（11/11 fix：原来留到 38.92–39.2，最后一段藏在 ddos2 标签后面约 1.3 秒）
          E.label('yddos', V(top(43).x, 2.6, top(43).z), '<span><b>Yuki</b> 花 12 点</span><small>对虫虫的 ECS 发动 DDoS（重）</small>', win(tt, 36.85, 38.82, 0.3, 0.14), 'warn');   // 光点落在 Yuki 的棋子头顶（原来 x − 1.0 落在 ElastiCache 格）；点数攒满（tt 37.0）前后出来
        }
      }

      // 封面式片头：右边转着的棋盘 + 漂浮图标，左边大标题
      if (t >= O0 - 0.3 && t < O0) E.show('cvfade', 'later', '', E.ease(E.seg(t, O0 - 0.3, O0)), 'none');   // 封面最后淡到黑场，接序章
      // 有封面图（cover.mjs 生成）就整屏铺封面图，盖住下面的 3D 封面，最后照样淡到黑场
      if (t < O0 && D.cover) { if (!document.getElementById('cvimg-css')) document.head.appendChild(Object.assign(document.createElement('style'), { id: 'cvimg-css', textContent: `.cvimg{inset:0;z-index:6;background:url(${D.cover}) center/cover no-repeat}` }));
        E.show('cvimg', 'cvimg', '', 1, 'none'); }
      if (t < INTRO) E.intro(t, INTRO, `<div class="eyebrow"><img src="${I.reinvent}"> BOARD GAME · 云上创业</div><h1><small>亚马逊云科技 User Group</small><span>云上大亨</span></h1><p class="tagline">在亚马逊云科技上创业：买服务、组架构、扛事故、控账单。棋盘上都是真实的云服务，每个都按真实特性计费。</p><div class="chips">${[['ecs', '2–4 人 · 同屏或联机'], ['wat', '真实架构 · 按整套收'], ['health', 'Health 事件 · 扛事故'], ['activate', '专属技能 · 起死回生'], ['training', '边玩边答题'], ['users', 'User Group 活动局']].map(([k, l]) => `<span><img src="${I[k]}">${l}</span>`).join('')}</div>`);

      // 第 06 段在 promo.js 里每次都从同一个镜头位置开始；串起来时换成一条连续的镜头，免得每 4 秒跳一下
      if (t >= A0 && t < W0F + 0.6) E.camPath(t, [
        [A0, [0, 17.5, 16.5], [0, 0, 1.2]],   // 和四个角插段最后的 Root 全景机位一致
        [A0 + ACUM[1], [1, 18.5, 15.5], [0.6, 0, 3.6]],
        [A0 + ACUM[1] + 3.4, [1, 18.5, 15.5], [0.6, 0, 3.6]],   // 07 → 08：1.0 t（1.25 秒）跨过段落边界、包住 whoosh；入门局的标签在 +3.4 之前收完
        [A0 + ACUM[2] + 0.4, [2, 13.5, 14], [0.5, 0, 0.5]],
        [A0 + ACUM[3], [-2.5, 13, 14], [-2, 0, 1.5]],
        [A0 + ACUM[4], [0, 13, 13.5], [-0.5, 0, 1]],
        [A0 + ACUM[5] + 0.8, [0, 17.5, 16.5], [0, 0, 1.2]],
        [A0 + ACUM[5] + 5.6, [0.5, 17, 16], [0, 0, 1.2]],
        [SK0 + 0.8, [0.5, 17, 16], [0, 0, 1.2]],
        [DL0 - 0.3, [0.9, 16.4, 15.4], [0.3, 0, 1.1]],   // 专属技能这段一直用高机位，到 DLC 前才压低。11/11 fix：原来 [1, 15, 14.5] / [0, 0, 0.3] 底排和虫虫被两行字幕盖住，改成 11 段末尾那组（两行字幕放得下），之后慢慢往右下的 Shield Advanced 推一点
        [DL0 + 0.7, [-1.5, 7.6, 16], [0, 2.3, 0]],
        [DL0 + D13 - 0.8, [1.5, 7.6, 16], [0, 2.3, 0], 'hold'],   // DL0+0.7 到 DL0+D13+3.3 由下面「13 → 14」那条镜头接管（这一帧不上画面，只让 DL0+0.7 两边的速度为 0）；接回来的那一帧是静止的，速度对得上
        [DL0 + D13 + 3.3, [15.5, 7.6, 6.5], [6.2, 0.4, -0.6], 'hold'],
        [DL0 + D13 + 6.1, [15.5, 7.6, 6.0], [6.2, 0.4, -0.8]],
        [DL0 + D13 + 6.9, [16, 8.6, 5.0], [6.0, 0.4, -1.6]],
        [DL0 + D13 + D14 - 1.0, [16, 8.6, 4.4], [6.0, 0.4, -1.8]],   // 14 → 15：标签收完就起飞，先拉高绕到前面再压低，1.6 t 到题库盒子
        [DL0 + D13 + D14 - 0.2, [8.8, 11.4, 12.8], [3, 1, 0]],
        [DL0 + D13 + D14 + 0.6, [0, 7, 15], [0, 2.1, 0.2]],
        [DL0 + D13 + D14 + D15 - 0.3, [0.8, 7.2, 14.5], [0, 2.1, 0.2]],
        [DL0 + D13 + D14 + D15 + 0.6, [-1.5, 7.6, 16], [0, 2.3, 0]],   // 之后是 CAMW：接着慢慢横移，再推进成片尾环绕
      ]);

      // ---------- 03 组架构 · 串联收费：韩叔手上还有 Route 53，「高可用入口」和「经典三层 Web」共用 ELB、EC2，串成一串一起收 ----------
      {
        const { top } = E, b0 = XS, R = [37, 20, 19, 10];
        const P37 = top(37).add(V(0, 0.3, 0)), P20 = top(20).add(V(0, 0.3, 0)), P19 = top(19).add(V(0, 0.3, 0));
        // 蓝色「高可用入口」线：拱顶压低、控制点往棋盘内侧走，比橙线低，两条线分得开；User Group 角的特写和片尾都不画
        //   User Group 角那段先把线收回去、切到 Root 角时再画回来（用进度收放，不硬开关）
        const haK = Math.min(seg(t, b0 + 0.8, b0 + 1.9), 1 - seg(t, CS + 3.9 + 0.8, CS + 4.5 + 0.8) + seg(t, CS + 6.1 + 1.2, CS + 6.8 + 1.2)) * (1 - seg(t, OUT0 - 0.9, OUT0 - 0.3)) * oldK;   // oldK：14 段换一局收掉（11/11 refine）   // 片尾前和「怎么赢」的盒子跳出画面一起收掉（原来 OUT0 一帧整条消失）
        //   ELB → EC2：从 ELB 上方一路往下落到 EC2，不在两格之间先抬再落（原来那个中间点让线拐成尖锐的 Z 字，EC2 近景里像一道蓝色闪电劈进韩叔的棋子）
        if (t >= b0 + 0.8 && t < OUT0 && haK > 0) E.arc(t, 'ha', [P37, P37.clone().lerp(P20, 0.5).add(V(0, 2.4, 0)), P20.clone().add(V(0, 0.6, 0)), P19], haK, 0x2fb6ff);
        if (t >= b0 && t < b0 + XL) {
          E.label('buy53', V(top(37).x, 1.5, top(37).z), `<img src="${I.route53}"><span>韩叔手上还有 <b>Route 53</b><small>刚才过路费里的 $14 就是它：经典三层 Web 的可选位置</small></span>`, win(t, b0 + 0.4, b0 + 1.8, 0.25, 0.3), 'org');   // 和下面「高可用入口」一前一后，两块都在画面顶上，不同时出现
          // 经典三层 Web：主线那条 arch 一直亮到这里，插段开头 0.3 t 内在同一位置换成 arch3 的文字（交叉淡化，不熄灭）
          //   arch3 挪到橙线落到 RDS 那一头（原来在拱顶，高机位里压住左列的 ELB、EC2）：主线那条先淡出，arch3 在新位置晚 0.12 t 淡入，两条字不叠在同一处
          const kx = ease(seg(t, b0, b0 + 0.3)), k3 = ease(seg(t, b0 + 0.12, b0 + 0.42)), A3 = top(10).add(V(0, 0.45, 0));
          if (ARCH && kx < 1) E.label('arch', ARCH[0], ARCH[1], 1 - kx, ARCH[2]);
          E.label('arch3', A3, '<span>经典三层 Web</span><small>Route 53（可选）→ ELB → EC2 → RDS</small>', Math.min(k3, 1 - easeIn(seg(t, b0 + XL - 0.8, b0 + XL - 0.6))), 'org');   // 三条标签按出场顺序错开 0.15 t 退场
          E.label('ha', V(top(37).x * 0.45 + top(20).x * 0.55, 3.0, top(37).z * 0.45 + top(20).z * 0.55), '<span>高可用入口</span><small>Route 53 → ELB → EC2</small>', win(t, b0 + 1.8, b0 + XL - 0.45, 0.3, 0.2), 'ok');
          const pulse = seg(t, b0 + 2.0, b0 + 2.4); R.forEach(i => E.highlight(i, pulse * (0.55 + 0.35 * Math.sin(t * 7))));
          //   chain 改成横幅（不画引线和光点：原来的红点落在顶排 WAF 格上，像在指 WAF），放在棋盘中间印着标题的空处，不压顶排的 Route 53；四块地的金币落到横幅下沿外面
          E.label('chain', V(0, 0, -1.3), '<span><b>串联收费</b> · 共用的服务只算一次<small>Route 53 还和 ELB、EC2 凑成高可用入口：落在这四块哪一块，都按四块加起来收</small></span>', win(t, b0 + 2.1, b0 + XL - 0.3, 0.3, 0.2), 'warn title');
          if (t >= b0 + 3.0) R.forEach((i, n) => coinS(t, b0 + 3.0 + n * 0.15, 0.9, top(i).add(V(0, 0.7, 0)), V(0, 0.3, -0.75), 5, 2.0));
          E.caption('02 组架构 · 串联', '架构里的可选位置<b>有就一起收</b>；<br>几个架构共用服务就<b>串联收费</b>，按整串加起来付，共用的只算一次', 1 - easeIn(seg(t, b0 + XL - 0.22, b0 + XL)));
          if (t < b0 + XD) CAPX = { tb: b0, old: capProbe(E, 23.1, 'all', null) };   // 接主线的「02 组架构」：字幕条不灭，文字交叉淡化
        }
        // 镜头：从主线 23.2 的静止机位抬到高机位，一直留在高处，慢慢漂到主线 26.3 的机位（Health 卡、AZ 断电都在这个高机位里演）
        if (t >= b0 && t < fb(26.3)) E.camPath(t, [[b0, [-5.5, 8.8, 12], [-4, 0, 2.6]], [b0 + 0.9, [-1.5, 17.5, 16.5], [-1, 0, 1.3]], [fb(26.3), [-1.5, 17, 16.5], [-0.8, 0, 0.6]]]);
      }

      // ---------- 05 四个角：Startup 扶持 → 维护窗口 → User Group 活动 → Root 密钥泄露，每个角 CK = 2.5（原来 2.1：落定后多停 0.4 再起飞） ----------
      if (t >= CS && t < CS + CL) {
        const { top } = E, C = [
          [0, 'Startup 扶持', '经过或停下领 <b>$200 Credits</b>', '同时交这一圈的运行费', 'ok'],
          [14, '维护窗口', '落上来<b>停一轮</b>，或交 $50 照常走', '被送进来：交 $50 出来，或停一轮', 'warn'],
          [24, 'User Group 活动', '路过领 <b>$50</b>', '停下抽奖，或 3 张 re:Invent 卡挑 1 张', 'org'],   // 11/09：小字压短（全亮只有约 1.2 秒）；规则见 index.html 的 free 格
          [38, 'Root 密钥泄露', '直接飞到对角的<b>维护窗口</b>', '不经过 Startup 扶持、不领 $200', 'warn']];
        const k = Math.min(3, Math.floor((t - CS) / CK)), u = t - CS - k * CK, [ci, n, l1, l2, cls] = C[k], P = top(ci);
        E.highlight(ci, seg(u, 0.4, 0.8) * (0.6 + 0.3 * Math.sin(t * 7)));
        // Root 角的小字换到第二行（小字放进 span 里，.lbl span small 是块级），标签不再横跨顶排
        E.label('corner', V(ci === 38 ? P.x - 1.2 : P.x, ci === 38 ? 1.4 : 0.9, ci === 38 ? P.z + 0.6 : P.z), ci === 38 ? `<span><b>${n}</b> · ${l1}<small>${l2}</small></span>` : `<span><b>${n}</b> · ${l1}</span><small>${l2}</small>`, win(u, ci === 38 ? 0.82 : 0.72, ci === 38 ? CK : ci === 24 ? 2.14 : 2.2, 0.25, 0.2), cls);   // 镜头 u 0.75 落定（Root 0.85）、2.18 起飞（User Group 2.12）：落定前后淡入，起飞前收完
        if (ci === 0 && u > 0.7) coinS(t, CS + 0.7, 0.7, V(P.x * 0.85, 1.6, P.z * 0.85), P.clone().add(V(0, 0.4, 0)), 10, 0.6);   // 从棋盘内侧上方落下来（原来从 3.2 高、棋盘外的黑底里落）
        if (ci === 38 && u > 0.6) { const A = top(38).add(V(0, 0.4, 0)), B = top(14).add(V(0, 0.4, 0)); E.arc(t, 'rootjail', [A, A.clone().lerp(B, 0.5).add(V(0, 5.5, 0)), B], seg(u, 0.6, 1.3) * (1 - seg(u, CK - 0.4, CK - 0.05)), 0xff3b30); }   // 插段结束前收线，不在换段那一帧整条消失
        if (ci === 14 || ci === 38) E.impaired(ci, seg(u, 0.5, 0.8) * (0.6 + 0.4 * Math.sin(t * 14)) * (1 - seg(u, CK - 0.3, CK)));
        if (ci === 24 && u > 0.7) coinS(t, CS + 2 * CK + 0.7, 0.6, V(P.x + 2.4, 1.0, P.z + 1.6), P.clone().add(V(0.35, 0.3, 0.45)), 5, 0.6);   // 11/09：「路过领 $50」的金币压低弧线、落到格子靠里的一角，不再从标签引线和光点上落过去（引线在格子中心上方）
        if (t >= CS + 2 * CK + 1.2) { const nB = Math.ceil(30 * (1 - seg(t, CS + 3 * CK + 1.1, CS + 3 * CK + 2.0))); if (nB > 0) E.coinBurst(t, CS + 2 * CK + 1.2, top(24).add(V(0.35, 0.6, 0.45)), nB); }   // 抽奖的金币按时间画，切到 Root 角以后接着落地；全落地以后一枚枚收掉，不在半空、也不在换段那一帧一起消失；11/09：喷出点挪到格子靠里的一角（和上面 $50 的落点一样），不从标签引线的光点里喷出来
        E.caption('05 四个角', CAPC, t > CS + CL - 1 ? 1 : E.capWin(t, CS, CS + CL, 0.3, 0.3));   // 结尾不淡出：接 06 娱乐模式时字幕条不灭，文字交叉淡化（原来淡到快没了马上又亮，像眨了一下眼）
      }

      // ---------- 04 扛事故 · S3 公开：虫虫的 S3 桶被设成公开，数据往外漏；虫虫有 GuardDuty，马上告警，但只能少赔一半 ----------
      // 游戏规则（index.html Health #7）：有数据保护类功能（KMS 客户托管密钥、CloudFront 源访问控制、Config 升到自动修正）才免疫；只有 GuardDuty 时每人少赔一半（GuardDuty 只告警），
      //   没防住的赔每位其他玩家 $50。虫虫只有 GuardDuty：金线告警、漏出去的数据收住一部分，没有免疫护盾，每人赔 $25（三笔金币飞向另外三人，玩家栏扣钱）
      if (t >= ZS && t < ZS + ZL + 0.2) {
        // SD：S3 卡正面朝前多停 0.8（插段 5.4 → 6.2），卡往上滑走、数据外泄和之后的一切整体往后挪 SD；镜头仍在 u 1.95 落到 S3 近景（卡后面），卡滑走以后露出 S3
        const { top, bit } = E, u = t - ZS, S3 = top(1), GD = top(15), SD = 0.8;
        if (u < 2.0 + SD) { const inK = sm(seg(u, 0, 0.6)), out = sm(seg(u, 1.4 + SD, 1.9 + SD)); E.card('s3pub', D.cards.s3, { y: -2.2 * (1 - inK) + out * 2.2, alpha: Math.min(sm(seg(u, 0, 0.45)), 1 - out), flip: sm(seg(u, 0.2, 0.9)), s: 0.95 }); }   // 淡入 + 短距离滑入，淡出 + 往上滑走
        E.highlight(15, seg(u, 2.2 + SD, 2.6 + SD) * (1 - seg(u, 3.4 + SD, 3.8 + SD)));   // 金线出发时 GuardDuty 闪一下
        // 数据往外漏：红色碎块从桶里往外飞；GuardDuty 告警到了（u 2.8）以后不再往外冒，已经漏出去的照样飞散、慢慢淡掉（只告警，挡不住，所以没有护盾）
        for (let j = 0; j < 16; j++) { const st = 1.9 + SD + j * 0.05; if (u < st) continue; const a = j * 2.4, d = Math.min(9, (u - st) * 2.4), fade = 1 - seg(u, 3.0 + SD, 3.6 + SD);
          if (fade > 0) bit(V(S3.x + Math.cos(a) * d, 0.3 + d * 0.8, S3.z + Math.sin(a) * d * 0.8), '#ff3b30', 0.12 * fade); }
        if (u >= 2.2 + SD) arc0(t, 'gds3', [GD.clone().add(V(0, 0.4, 0)), GD.clone().lerp(S3, 0.5).add(V(0, 3.2, 0)), S3.clone().add(V(0, 0.5, 0))], seg(u, 2.2 + SD, 2.8 + SD) * (1 - seg(u, ZL - 0.3, ZL)), 0xffb020);
        // 少赔一半：虫虫赔另外三人各 $25（韩叔在 EC2、Damo 在 30 号格、Yuki 在 43 号格），金币从虫虫的 S3 飞出去；玩家栏在 ZS + 3.9 扣钱（见上面的 cash）
        if (u >= 3.2 + SD) [[19, -0.4], [30, 0], [43, 0]].forEach(([i, dx], n) => coinS(t, ZS + 3.2 + SD + n * 0.12, 0.8, S3.clone().add(V(0, 0.6, 0)), top(i).add(V(dx, 0.8, 0)), 3, 1.6));
        E.label('s3leak', V(S3.x, 1.1, S3.z - 0.3), '<span><b>虫虫的 S3</b> 桶被设成公开</span><small>数据往外漏</small>', win(u, 1.95 + SD, 3.0 + SD + 0.15, 0.3, 0.25), 'warn');   // 镜头 u 1.85 落到 S3 近景，跟着警报声出
        E.label('s3gd', V(S3.x, 1.1, S3.z - 0.3), `<img src="${I.guardduty}"><span><b>GuardDuty 马上告警</b> · 每人少赔一半<small>只赔 $25；KMS 客户托管密钥、CloudFront 源访问控制或 Config 自动修正才免疫</small></span>`, win(u, 3.0 + SD + 0.15, ZL - 0.55, 0.3, 0.22), 'org');   // 镜头 ZL-0.6 起飞去 Aurora，起飞时基本收完
        E.caption('03 扛事故 · S3 公开', 'S3 桶被设成公开：有<b>数据保护</b>就免疫，没防住的赔每位其他玩家 $50', 1 - easeIn(seg(t, ZS + ZL - 0.22, ZS + ZL)));
        if (t < ZS + XD) CAPX = { tb: ZS, old: capProbe(E, 29.7, 'all', null) };   // 接主线的「03 扛事故」：字幕条不灭，文字交叉淡化
      }

      // ---------- 11 高速部署 · 防护：Yuki 发动 DDoS 时，场上有 CloudFront、Shield Advanced 的护盾亮起来，标明这些打不动（规则：一回合只能攻击一次，所以不演打过去被挡）；虫虫没有，被打下线 ----------
      if (AK === 5) {
        const { top } = E;
        // 开场先标出三块地：Damo 的 CloudFront、韩叔的 Shield Advanced、虫虫的 ECS
        if (tt < 37.5) [16, 47, 21].forEach(i => E.highlight(i, seg(tt, 35.5, 35.9) * (1 - seg(tt, 37.1, 37.5)) * (0.5 + 0.3 * Math.sin(t * 7))));
        E.shieldX('cf', 16, seg(tt, 35.6, 36.0) * (1 - seg(tt, 39.0, 39.2)), { r: 0.8, color: 0x6cc0ff, ripple: seg(tt, 37.5, 38.1) });   // 和 S3 插段一样收小：只罩住自己这一格，不把旁边虫虫的 GuardDuty、Yuki 的 KMS 也罩进去
        E.shieldX('sa', 47, seg(tt, 35.7, 36.1) * (1 - seg(tt, 39.0, 39.2)), { r: 0.8, color: 0x6cc0ff, ripple: seg(tt, 37.6, 38.2) });   // 两个护盾和标签一起在换到 12 段（tt 39.4）之前收掉，不在换段那一帧一起消失
        E.label('cfdef', V(top(16).x + 0.4, 1.0, top(16).z), '<span><b>Damo 有 CloudFront</b> · 他的服务都打不动</span><small>流量在边缘就被吸收</small>', win(tt, 35.65, 37.3, 0.3, 0.14), 'ok');   // 先标出打不动的两块（这段 tt 走得慢，1 tt ≈ 2 秒），Yuki 的红线出发之前收完，红线不再藏在标签后面
        E.label('sadef', V(top(47).x, 0.7, top(47).z), '<span><b>韩叔的 Shield Advanced</b> · 打不动</span><small>DDoS 防护，打他也是白扣点数</small>', win(tt, 35.75, 37.32, 0.3, 0.14), 'ok');   // 光点落在 Shield Advanced 格靠里的一半（锚点再高就投到上面 KMS 格的位置了）；标签框贴右边，下沿只压到护盾顶上一点
        E.caption(ALT[5][1], CAP11, 1);   // 开头接 10 学习模式、结尾接 12 专属技能，字幕条都不灭、文字交叉淡化   // 开头接 10 学习模式（字幕条不灭、文字交叉淡化），结尾最后一个退场
      }

      // ---------- 12 专属技能 · 战略并购（11/11 fix）：先结算角色技能（订阅费），再按卖回价买下领先对手韩叔的一块服务 ----------
      //   index.html roleSkill0：只要有对手、有候选服务就一定并购（STORM_TXT）。挑韩叔的 Shield Advanced（47 号格）：不拆一直画到片尾的经典三层 Web、高可用入口两条线。
      //   Damo 这时现金 $50（订阅费是之后每回合开始才收），按规则先欠着，标签不写价钱；11/11 refine：小字不提「现金不够」（画面上订阅费金币刚飞向 Damo，观众会以为他够付），改说钱付给谁、服务连同升级归谁（index.html 战略并购弹窗原话）。12 段多出来的 SKX 给这一步：红框缩掉、长出绿框，绿框留到片尾
      if (t >= SK0) {
        const { top } = E, u = t - SK0;
        if (t < DL0) {
          E.highlight(47, seg(u, 3.1, 3.4) * (1 - seg(u, 4.45, 4.8)) * (0.55 + 0.3 * Math.sin(t * 7)));
          const k1 = seg(u, 3.25, 3.5), k2 = seg(u, 3.5, 3.85);
          if (k2 > 0) E.own(47, 2, k2); else E.own(47, 0, 1 - k1);
          E.label('acq', V(top(47).x - 0.5, 0.75, top(47).z), '<span><b>战略并购</b> · Damo 买下韩叔的 <b>Shield Advanced</b><small>按卖回价付给韩叔，连同升级一起归 Damo</small></span>', win(t, SK0 + 3.2, DL0 - 0.2, 0.3, 0.22), 'org', 1560);   // 右边界收窄：标签框往棋盘里挪，不压右列 44–46 格，光点仍落在 47 号格靠里的一半
          if (u >= 3.8) { const [nt, h] = capXf('07 专属技能', '', '12 专属技能', 'all'); E.caption(nt, h, 1 - easeIn(seg(t, DL0 - 0.22, DL0))); }   // 主线 43.2 以后 promo.js 不再画这条字幕：接着画到 DL0 前收
        } else E.own(47, 2, 1);
      }

      // ---------- 多给 Yuki 镜头 ----------
      {
        const { top } = E, f = fb;   // promo.js 主线时间换算成 full 的时间
        // （AZ 断电只打抽卡的韩叔，Yuki 的 28 号格（原来 EMR，现在 DMS）不受影响，所以不再点名 Yuki）
        // 05 抽卡翻盘：Yuki 抽到「领到 Free Tier 额度」，镜头推过去，奖池的钱飞到 Yuki 身上
        if (t >= f(29.8) && t < f(32.2)) {
          E.label('ywa', V(top(25).x, 1.6, top(25).z), '<span><b>Yuki</b> 抽到 WA Review · <b>Aurora 免费升到多 AZ</b></span>', win(t, f(30.6) - 0.15, f(31.55), 0.3, 0.2), 'org title');   // 压到 20 字左右（原来 45 字只全亮约 0.5 秒），提早 0.2 淡入；卡面上有整句   // 镜头 f(30.6)+0.1 落到 Aurora 近景前后淡入，f(31.55) 拉远之前收完
          // 他的小伙伴（棋子伙伴）从 WA 卡右下角的空白处冒出来挥挥手：卡贴在镜头前、停在原位的这一段（tt 30.4–31.5）才出来，卡往下走之前收回去
          if (XPR.yuki_buddy && t >= f(30.5) && t < f(31.5)) stkSet(E, E.el('xbud', 'xstk xfree xbud xi-yuki_buddy', ''), Math.min(xsm(seg(t, f(30.55), f(30.55) + 0.32)), 1 - xsm(seg(t, f(31.45) - 0.26, f(31.45)))), t, 6, 5, 'translate(548px,676px)');   // 缓入缓出（smoothstep），不一帧冒出来
        }
        // Aurora 免费升一级（多 AZ），之后一直留着：和 EC2 的多 AZ 一样画成两块 Yuki 紫色的小块（Aurora 是 Yuki 的）沿格子内侧分开、中间连一条线（原来是一个约 20 像素的紫色升级块，看不出是多 AZ）
        //   11/05：套用 EC2 那套落地（azDrop）：镜头 f(30.7) 落到 Aurora 近景，块 f(30.66) 起从 1.7 高处落下（再高起点就藏在上面「Yuki 抽到 WA Review」横幅后面），
        //   f(30.92) 落地：Aurora 格亮一下、紫色 + 金色碎块、一圈紫色冲击波（WA 卡不给钱，不飞金币）；f(31.0)–f(31.32) 分开，f(31.32)–f(31.62) 画出连线（镜头 f(31.55) 才慢慢拉远）
        // 11/05（refine）：两块和连线原来在 z +0.55、分开 ±0.26、拱顶 0.66，镜头从前上方看，拱从格名「Aurora」和「$280」上面扫过去；改成贴着格子内侧的色条（+0.68）、分到格子两角（±0.33）、连线两头接在块的上沿稍下（0.4）、拱顶压到 0.47，线落在价格下面的空白里
        { const A = top(25), AZ = A.z + 0.68;   // Aurora 在顶排：格子内侧是 +z，两块沿 x 分开
          azDrop(E, arc0, t, { key: 'azlink25', i: 25, P: V(A.x, 0, AZ), ax: [1, 0], sep: 0.33, ah: 0.47, ae: 0.4, t0: f(30.66), hd: 1.7, fall: 0.26, ts: f(31.0), tk: f(31.32), lineEnd: CS, splash: '#9b5cf6', n: 10, big: true, hl: 0.9, col: E.COLORS[3],
            fx: (t_, tl) => { E.splash(t_, tl, V(A.x, 0, AZ), '#ffc94d', 7); const w = seg(t_, tl, tl + 0.5); if (w > 0 && w < 1) E.shockwave('wa25', A.x, AZ, 0.25 + 2.3 * easeOut(w), 0.9 * (1 - w), 0x9b5cf6); } }); }
        // 05 线下更好玩：Yuki 开了踩坑大会
        E.label('ysoc', V(top(43).x, 3.1, top(43).z), '<span><b>Yuki</b> 开了「踩坑大会」</span><small>每人讲一个踩过的坑</small>', win(t, f(32.8), CS - 0.35, 0.3, 0.25), 'ok title');   // title：横幅式标签，引线和光点由 style.css 的 .lbl.title 规则藏掉；锚点抬高，标签底边高过社交卡的卡顶
      }
      // 05 抽卡 → 线下：同一章换段，字幕条不灭，文字交叉淡化
      if (t >= fb(32.0) && t < fb(32.0) + XD) CAPX = { tb: fb(32.0), old: capProbe(E, 31.5, 'all', null) };
      // 05 → 06、11 → 12：跨章节也不灭字幕条，文字和标签列一起交叉淡化
      if (AK === 0 && t < A0 + XD) CAPX = { tb: A0, old: { tag: '05 四个角', html: CAPC } };
      if (t >= SK0 && t < SK0 + XD) CAPX = { tb: SK0, old: { tag: ALT[5][1], html: CAP11 } };
      // 06–11 模式段之间：字幕条不灭，文字交叉淡化
      if (AK > 0 && t < A0 + ACUM[AK] + XD) CAPX = { tb: A0 + ACUM[AK], old: capProbe(E, 37.0, ALT[AK - 1][0], ALT[AK - 1][1]) };
      // ---------- 镜头：EC2 近景 → S3 公开 → Aurora → 社交卡 → 四个角，一条连续的镜头（停留镜头之间缓入缓出，经过中点不停） ----------
      //   S3 卡、WA 卡飞进来时镜头在它们后面移动；四个角每次移动约 1.07 t，转角都在 15° 以内；最后停在 Root 角全景，接 06 娱乐模式
      //   推向 EC2 近景这一程也由这里接管（full 专用，promo.js 主线不动）：主线 29.4 才落到 EC2 近景、停 0.5 秒就掉头去 S3，像刚停又起；
      //   这里推镜头的时长不变（1.8），整体提早 0.55 落定，在近景上有意停约 1.2 秒，看清护盾和「多 AZ · 免疫」、等它收掉，S3 卡飞进来才起飞
      if (t >= fb(27.35) && t < A0) {   // 起飞从 27.05 挪到 27.35：「韩叔的 RDS 还是单 AZ」全亮后多停约 0.35 秒再推（原来刚全亮 0.2 秒镜头就推，标签被推到边上）
        const f = fb, CX = CK - 2.1, C0 = [[5.2, 8.2, 13.2], [5.6, 0.3, 4.2]], C1 = [[-5.2, 8.2, 13.2], [-5.6, 0.3, 4.2]], C2 = [[-4.2, 10, 4.5], [-6.9, 0.3, -4.0]], RT = [[0, 17.5, 16.5], [0, 0, 1.2]];
        E.camPath(t, [
          [f(27.35), [-1.5, 17, 16.5], [-0.8, 0, 0.6]],                       // 主线 26.3–27.6 的高机位（静止，和主线这一刻一样，接得上）：AZ 断电的冲击波扫完就往下推
          [f(28.9), [-11.5, 6.4, 6.2], [-7.2, 0, 0.2]],                       // EC2 近景（原来主线 29.4 才到；推 1.55 t，近景上停约 0.8 t）
          [ZS - 0.12, [-11.5, 6.4, 6.2], [-7.2, 0, 0.2]],                     // 静止停约 1 秒（护盾、「多 AZ · 免疫」在起飞后 0.1 内收完），S3 卡飞进来前起飞
          [ZS + 1.02, [-0.6, 9.4, 12.6], [-0.6, 0.2, 2.8]],                   // 沿棋盘前沿横移，中途抬高、往后退一点（离棋盘远了，同样的横移画面挪得少）；前一程远一点，中点放晚一点
          [ZS + 1.95, [9.8, 5.6, 12.4], [5.4, 0.4, 4.4]],                     // S3 近景（跟着 1.95 的警报落定）
          [ZS + ZL - 0.6, [9.8, 5.6, 12.4], [5.4, 0.4, 4.4]],
          [f(30.0) - 0.05, [3.5, 11.0, 9.5], [0.2, 0.4, 0.4]],                // 抬高的中点（WA 卡从下面飞进来）
          [f(30.6) + 0.1, [-2.5, 9, 4], [-5, 0.6, -3.5]],                     // Aurora 近景：落定，停着看升级块落下，再顺着拉远的方向慢慢退
          [f(31.55), [-2.3, 9.25, 4.35], [-4.9, 0.6, -3.4]],
          [f(32.9), [0.6, 13.0, 13.0], [0, 0, 0.1]],                          // 拉远看社交卡
          [CS - 0.45, [1, 12.5, 12.5], [0, 0, 0]],
          [CS + 0.75, ...C0], [CS + 1.72 + CX, ...C0],                        // Startup 扶持（CX：每个角比原来多停的 0.4，落定时刻跟着往后挪）
          [CS + 2.32 + CX, [0, 9.4, 14.0], [0, 0.3, 4.2]],                    // 横移到对边的半路抬高一点（离格子远了，横移画面挪得少）
          [CS + 2.92 + CX, ...C1], [CS + 3.82 + 2 * CX, ...C1],               // 维护窗口
          [CS + 5.0 + 2 * CX, ...C2], [CS + 5.86 + 3 * CX, ...C2],            // User Group 活动
          [CS + 7.2 + 3 * CX, ...RT], [A0, ...RT]]);                                  // Root 密钥泄露：全景（这一程最远，多给 0.16 t）
      }
      // 13 → 14：镜头先到位，盒子再飞。原来镜头 DL0+D13-0.8 起横移去 Yuki，正好赶上盒子往外飞，两个运动叠在一起；
      //   盒子飞出的时间不动（落在 music.mjs 的 whoosh(R0-0.1) 上），改镜头：13 段末尾从正面慢慢绕到右前方 3/4 机位（四个盒子和旁边的 Yuki 都在画面里），
      //   DL0+D13-0.75 停稳，盒子飞的时候只轻轻推近，盒子出画以后再推到 Yuki 近景（DL0+D13+0.85 落定，shimmer 在 +0.6，标签 rs0 跟着落定再出）
      //   从 DL0+0.7（主线这一帧静止）就接管，正面那段慢慢横移直接加速进 3/4 机位，中间不停
      if (t >= DL0 + 0.7 && t < DL0 + D13 + 3.3) E.camPath(t, [[DL0 + 0.7, [-1.5, 7.6, 16], [0, 2.3, 0]], [DL0 + D13 - 2.0, [0.3, 7.6, 16], [0, 2.3, 0]], [DL0 + D13 - 0.75, [7.6, 6.6, 12.4], [2.4, 1.9, 0], 'hold'], [DL0 + D13 - 0.05, [7.9, 6.35, 11.7], [2.7, 1.8, 0]], [DL0 + D13 + 0.85, [10.8, 3.2, 1.9], [7.3, 0.7, -0.8]], [DL0 + D13 + 2.6, [10.4, 3.0, 1.5], [7.3, 0.7, -0.8]], [DL0 + D13 + 3.3, [15.5, 7.6, 6.5], [6.2, 0.4, -0.6]]]);   // 11/11 fix：近景往 39–42 号格挪一点（Yuki 从 39 号格跳到 42 号格进货）

      // Damo 在 DLC 那段站在 30 号格不动（11/11 refine：原来从 30 一格格走到 39，9 格和桌上的骰子 1 + 2 对不上）；换一局时和 Yuki 一起被拿起来摆到 39 号格（见 14 段）。代理商段之后的买卖结果一直保留到片尾
      if (t >= DL0 && t < DL0 + D13) E.pawnAt(2, 30);
      if (t >= DL0 + D13 + D14) { E.pawnAt(2, 45); E.pawnAt(3, 42); E.own(42, 2, 1); [46, 45, 40, 44, 32].forEach(i => E.own(i, 3, 1)); }   // Yuki 进货以后站在 42 号格（11/11 fix）

      // ---------- 13 玩法 DLC / 14 代理商模式 / 15 学习模式和认证题库 ----------
      const R0 = DL0 + D13, Q0 = R0 + D14, { top } = E, pick = k => D.dlc.find(d => d.k === k);
      const COL = { genai: '#01a88d', sec: '#dd344c', finops: '#7aa116', global: '#3b82f6', qclf: '#ec7211', qsaa: '#ec7211', qaif: '#ec7211' };
      const SHORT = { genai: 'AI 组过路费 ×1.5', sec: '安全组过路费 ×1.3', finops: '所有运行费 ×1.5', global: '多区域服务过路费 +30%', qclf: 'CLF-C02', qsaa: 'SAA-C03', qaif: 'AIF-C01' };   // 11/09：题库只写考试代号，不写题目数（还会随游戏更新变；盒子顶上已经写着「认证题库」）
      // 盒子：从天上掉下来弹两下，落稳后轮流蹦，最后一起跳出画面
      const drop = (d, n, t0, t1, x, z, size, tag, ry) => {
        if (!d || t < t0 - 0.22 || t > t1 + 0.3) return;
        const u = seg(t, t0, t0 + 0.9), b = u < 0.2 ? Math.cos(seg(t, t0 - 0.22, t0 + 0.18) * Math.PI / 2) : 0.45 * Math.abs(Math.cos(u * Math.PI * 2.5)) * Math.pow(1 - u, 1.7);   // 第一下从 t0-0.22 落到 t0+0.18（原来 0.18 内落 7 个单位），弹起来只有原来的 0.45
        let y = b * 7, sq = u < 1 && b < 0.05 ? 0.18 * (1 - u) : 0;
        if (u >= 1) { const ph = ((t - t0 - 0.9 + n * 0.4) % 1.5) / 1.5; if (ph < 0.32) { const h = Math.sin(ph / 0.32 * Math.PI); y = h * 0.6; sq = ph < 0.04 || ph > 0.29 ? 0.1 : -0.07 * h; } }
        const out = sm(seg(t, t1 - 0.6 + n * 0.05, t1 + 0.15 + n * 0.05)); y += out * 9;   // 跳出画面：smoothstep（峰值 1.5 倍，原来 ease 是 3 倍）、少跳 1 个单位
        // 认证题库：名字和 index.html 的题库名一致（云从业者 / 解决方案架构师助理 / AI 从业者，9 个字一行放得下）；图标换开，免得和横幅、旁边的盒子重复
        const info = { ...d, n: d.n.replace('题库：', ''), icon: { qclf: 'cloud', qsaa: 'elb' }[d.k] || d.icon, d: SHORT[d.k], color: COL[d.k], tag };
        E.box('dlc' + d.k, info, { x, y: 0.01 + y, z, size, sq, ry: ry + Math.sin(t * 1.2 + n) * 0.06 });
        E.floorGlow('g' + d.k, COL[d.k], x, z + 0.2, 3.6 * (1 - out), 0.75 * seg(t, t0 + 0.15, t0 + 0.4) * (1 - out));
        E.splash(t, t0 + 0.18, V(x, 0, z - 0.5), COL[d.k], 10);   // 溅射起点挪到盒子后面，小粒子不停在盒子正面那行字上
      };
      if (t >= DL0 - 0.2 && t < R0 + 0.3) {
        ['genai', 'sec', 'finops', 'global'].forEach((k, n) => { const x = -4.2 + n * 3.1; drop(pick(k), n, DL0 + 0.1 + n * 0.18, R0, x, -0.4 + Math.abs(x) * -0.12, [2.5, 3.3, 0.6], '玩法 DLC', -x * 0.06); });
        if (t >= DL0) E.caption('13 玩法 DLC', '开局可以多选：<b>GenAI 浪潮、安全攻防、FinOps 账单大战、全球出海</b>，各带规则和卡牌', E.capWin(t, DL0, R0, 0.4, 0.3));   // FinOps 写全名「FinOps 账单大战」：原来的「开局勾选，」去掉两个字，字幕条还是一行（量过 1661 宽，上限 1700）
      }
      if (t >= R0 - 0.2 && t < Q0 + 0.2) {
        // 代理商（规则书第 29 节）：Yuki 当代理商。各模式进货折扣不同，画面上不写几折。
        // ① 折扣进货 ElastiCache（42 号格，按小时计费的实例型服务；原来用 Athena，Serverless 按查询计费、每圈运行费 $0，没有运行费可分）；② 客户 Damo 落上来按转售价买走；③ 之后运行费交给代理商，代理商赚差价；
        // ④ 代理商的地只在组成有效架构时收过路费，按架构收（画面上不写倍数，各模式不一样），组成架构的库存不卖
        const L = 42, a1 = R0 + 1.8, a2 = R0 + 3.4, a3 = R0 + 5.0, a4 = R0 + 6.5, AR = [45, 44, 32, 25];   // 25 Aurora：RAG 那一环是「OpenSearch 或 Aurora」，两块都在 Yuki 手上就都算进来一起收（jointRent 11-08），也一起闪   // 开头 1.5 秒留给 Yuki 的特写
        // 11/11 fix：代理商要落在空地上才能进货（index.html land0 → offerBuy 只买落点那一格）：原来 Yuki 一直站在 43 号 Athena，进货的却是 42 号 ElastiCache。
        //   换一局：盒子跳走时 Yuki 的棋子被拿起来摆到新一局的 39 号格（和 Damo 同一格，按玩家错开站），之后跳 3 格（桌上的骰子是 1 + 2）落到 42 号格再进货
        const yHop = (st => { const k = Math.floor(st); return 39 + Math.min(L - 39, Math.max(0, k + sm(st - k))); })((t - (a1 - 0.75)) / 0.2);
        { const kp = sm(seg(t, R0 + 0.05, R0 + 0.6)), m = E.pawnAt(3, kp < 1 ? 43 : yHop);
          if (kp > 0 && kp < 1) { const A = top(43), B = top(39); m.position.x = A.x - 0.18 + (B.x - A.x) * kp; m.position.z = A.z + 0.18 + (B.z - A.z) * kp; m.position.y += Math.sin(Math.PI * kp) * 1.1; } }
        [44, 32].forEach(i => E.own(i, 3, seg(t, R0 + 1.1, R0 + 1.5)));   // 这一局 Yuki 手上有 OpenSearch、Bedrock（12 段 Damo 卖掉的那两块，换了一局）：11/11 改成 rs0 标签全亮以后再长紫框（原来盒子跳走时就冒出来）
        const scrP = (X, Y) => { let c = null; const g = () => c || (c = V(X / E.SW * 2 - 1, 1 - Y / E.SH * 2, 0.5).unproject(E.camera)); return { get x() { return g().x; }, get y() { return g().y; }, get z() { return g().z; } }; };   // 屏幕固定位置（同付费抽卡横幅）
        E.label('rs0', scrP(960, 196), `<img src="${I.billing}"><span>换一局：开了代理商模式，<b>Yuki 当代理商</b></span>`, win(t, R0 + 0.1, a1 + 0.4, 0.3, 0.25), 'org title');   // 11/11 refine：改成画面顶上正中的固定横幅，R0 + 0.1 就淡入（原来 R0 + 0.8 才出、钉在 41 号格上跟着推镜头漂，Yuki 被拿起来倒退 4 格那一下没有说明）   // 横幅（Yuki 这时从 39 跳到 42，不用引线钉在一格上）；镜头 R0+0.85 落到近景时再出
        if (t >= a1 && t < a2 + 0.9) { E.own(L, 3, seg(t, a1, a1 + 0.4)); coinS(t, a1, 0.8, top(L).add(V(0, 0.7, 0)), top(L).add(V(-1.4, 2.0, -0.6)), 6, 1.5); }
        E.label('rs1', V(top(L).x, 1.0, top(L).z + 0.4), '<span><b>折扣进货</b></span>', win(t, a1 + 0.3, a2 + 0.1, 0.3, 0.3), 'org');
        // 客户 Damo 从 39 号格一格格跳到 Yuki 的库存上，按转售价买走
        const dpos = t < R0 + 0.6 ? 30 : t < a2 - 0.2 ? 39 : t < a4 ? (() => { const st = (t - a2 + 0.2) / 0.2, k = Math.floor(st); return 39 + Math.min(L - 39, k + sm(st - k)); })() : (() => { const st = (t - a4 - 0.6) / 0.25, k = Math.floor(st); return t < a4 + 0.6 ? L : L + Math.min(45 - L, k + sm(st - k)); })();   // 39 → 42 提早 0.2 起跳、每格 0.2，a2+0.4 跳完；a4 之后接着走到 45
        { const md = E.pawnAt(2, dpos), kp = sm(seg(t, R0 + 0.05, R0 + 0.6));   // 11/11 refine：换一局：Damo 和 Yuki 同时被拿起来，从 30 号格摆到 39 号格（离得远，抬高一点）
          if (kp > 0 && kp < 1) { const A = top(30), B = top(39); md.position.x = A.x + 0.18 + (B.x - A.x) * kp; md.position.z = A.z - 0.18 + (B.z - A.z) * kp; md.position.y += Math.sin(Math.PI * kp) * 1.6; } }
        // 11/12 refine2：这一局只有 Yuki 和 Damo：韩叔、虫虫的棋子原地缩没，Q0 镜头起飞去 15 段时和上一局的归属框一起长回来。
        //   11/12 cardrestore：韩叔回到 EC2（19，照上面「挪到 EC2 格子外沿」的站位），时刻跟 oldK 走（R0 + 0.1 → + 0.6 缩没，和 Yuki、Damo 被拿起来同时；Q0 − 0.6 → + 0.1 长回）
        if (oldK < 1) { const mh = E.pawnAt(0, 19), kh = easeOut(seg(tt, 14.45, 14.8)); mh.position.x -= 0.4 * kh; mh.position.z += 0.15 * kh; [mh, E.pawnAt(1, 11)].forEach(m => m.scale.setScalar(Math.max(0.001, oldK))); }
        if (t >= a2 + 0.65) { E.own(L, 2, seg(t, a2 + 0.65, a2 + 1.3)); if (t < a3) coinS(t, a2 + 0.65, 0.7, top(L).add(V(0.2, 0.6, 0.3)), top(L).add(V(-0.2, 0.6, -0.3)), 8, 0.6); }
        E.label('rs2', V(top(L).x, 1.5, top(L).z + 0.4), '<span>Damo 按<b>转售价</b>买走</span>', win(t, a2 + 0.65, a3 + 0.4, 0.25, 0.25), 'ok');
        // 运行费：客户交给代理商，代理商再按进货价交给亚马逊云科技
        //   Damo 的棋子（42）→ 旁边 Yuki 的棋子（43），Yuki 再交一小份给棋盘中间（亚马逊云科技）；两件事并成一条标签 rs3，停满 a3 → a4（原来「按进货价交给亚马逊云科技」单独一条只亮约 0.4 秒）
        if (t >= a3 && t < a4 + 0.2) { coinS(t, a3, 0.7, top(L).add(V(0.18, 0.8, -0.18)), top(L).add(V(-0.18, 0.8, 0.18)), 8, 0.5); coinS(t, a3 + 0.6, 0.7, top(L).add(V(-0.18, 0.8, 0.18)), V(1.5, 0.8, 0), 4, 1.5); }   // 11/11：Yuki 也站在 42 号格
        // （原来的 rsaws「按进货价交给亚马逊云科技」并进下面的 rs3）
        E.label('rs3', V(top(L).x, 1.9, top(L).z), '<span>运行费交给代理商<small>代理商按<b>进货价</b>交给亚马逊云科技，<b>赚差价</b></small></span>', win(t, a3 + 0.35, a4 + 0.1, 0.3, 0.22), 'org');   // 光点落在 Yuki 的棋子上方（原来 z − 0.6 悬在半空）
        // 有效架构「GenAI 知识库（RAG）」：OpenSearch + Bedrock 是 Yuki 的库存，缺的 S3 由万能服务 CloudTrail 顶上（index.html WILD / hasCombo：万能服务不算进任何架构，
        //   只能绑到一个架构上补一块缺的；原来的「数据加密」KMS + CloudTrail + DynamoDB 已经删了）。Damo 走到 45 号格 CloudTrail 上，按整套架构付过路费
        if (t >= a4 - 0.3) {
          AR.forEach(i => E.highlight(i, (0.55 + 0.25 * Math.sin(t * 6)) * (1 - seg(t, Q0 - 1.05, Q0 - 0.6))));   // 镜头 Q0-1.0 起飞，跟着收   // 三块开场就是 Yuki 的库存，这里只闪
          const P45 = top(45).add(V(0, 0.3, 0)), P44 = top(44).add(V(0, 0.3, 0)), P32 = top(32).add(V(0, 0.3, 0));
          E.arc(t, 'rsarch2', [P45, P45.clone().lerp(P44, 0.5).add(V(0, 0.9, 0)), P44, P44.clone().lerp(P32, 0.5).add(V(0, 1.8, 0)), P32], seg(t, a4, a4 + 0.6) * (1 - seg(t, Q0 - 1.05, Q0 - 0.6)), 0x9b5cf6);   // 镜头起飞时收线
          if (t >= a4 + 1.15) coinS(t, a4 + 1.15, 0.9, top(45).add(V(-0.2, 0.6, 0.2)), top(L).add(V(-0.18, 0.9, 0.18)), 16, 0.9);
        }
        E.label('rs4', top(44).add(V(0, 0.3, 0)).lerp(top(32).add(V(0, 0.3, 0)), 0.5).add(V(0, 1.8, 0)), '<span>组成「<b>GenAI 知识库（RAG）</b>」· 按架构收费<small>万能服务 CloudTrail 顶上缺的 S3；OpenSearch、Aurora 都在手上就都收</small></span>', win(t, a4 + 0.3, Q0 - 1.18, 0.3, 0.22), 'org');   // 锚点在紫线的拱顶
        E.label('rs5', V(top(45).x - 0.3, 1.3, top(45).z), '<span>组成架构的库存<b>不卖</b></span>', win(t, a4 + 1.4, Q0 - 1.04, 0.3, 0.22), 'warn');   // 两条标签错开收完，镜头 Q0-1.0 才起飞   // 光点在 Damo 站的 CloudTrail 上方（绑进架构的万能服务也算组成架构的库存），不挡旁边 43 号格 Yuki 的棋子
        const RA = '开了<b>代理商模式</b>，玩家可以选当代理商：按进货价<b>折扣占地</b>；<br>客户按转售价买走，运行费赚差价', RB = '代理商的地<b>只有组成有效架构才收过路费</b>，按架构收；组成架构的库存不卖';
        // 11/05 验收：14、15、16 的字幕都等到本章起点才调用（13 原来就这样）。这几块代码提前 0.2 t 就开始画盒子，以前字幕也跟着提前调用，
        //   透明度 0 的新字幕成了这一帧最后一次 E.caption，把上一章还没淡完的字幕一帧切掉（T 154.1、166.7、171.2 字幕条从满亮直接没了）；现在上一章先淡完，新一章再淡入
        if (t >= R0) E.caption('14 代理商模式', t < a4 ? RA : RB, E.capWin(t, R0, Q0, 0.3, 0.3));
        if (t >= a4 && t < a4 + XD) CAPX = { tb: a4, old: { tag: '14 代理商模式', html: RA } };   // 换第二句：字幕条不灭，文字交叉淡化
      }
      if (oldK < 1) { [1, 2, 7, 10, 13, 15, 16, 19, 20, 21, 35, 37, 47].forEach(i => fadeFrame(E, i, oldK)); fadeBlock(E, 15, 0, oldK); }   // 11/11 refine：换一局，上一局韩叔、虫虫、Damo 的归属框和 GuardDuty 的升级块收掉（oldK 见上面）
      if (t >= Q0 - 0.2 && t < (DL0 + D13 + D14 + D15) + 0.3) {
        ['qclf', 'qsaa', 'qaif'].forEach((k, n) => { const x = -3.4 + n * 3.4; drop(pick(k), n, Q0 + 0.1 + n * 0.18, (DL0 + D13 + D14 + D15), x, 0.2, [2.2, 2.9, 0.55], '认证题库', -x * 0.05); });
        E.label('stm', V(0, 4.4, 0.2), `<img src="${I.training}"><span><b>认证练习题</b> · 解析 · 错题本</span>`, win(t, Q0 + 0.9, (DL0 + D13 + D14 + D15) - 0.3, 0.3, 0.3), 'org title');
        // 10 段已经讲过学习模式：这段只讲认证题库 DLC（任何难度都能单独勾；学习模式没勾时默认带云从业者题库，规则书第 49 行）
        if (t >= Q0) E.caption('15 认证题库', '<b>CLF、SAA、AIF</b> 认证练习题，任何难度都能勾；<br>学习模式不勾也默认带云从业者题库', E.capWin(t, Q0, (DL0 + D13 + D14 + D15), 0.3, 0.3));
      }
      // ---------- 16 怎么赢：4 种结束方式，可以多选 ----------
      const W0 = DL0 + D13 + D14 + D15;
      if (t >= W0 - 0.2 && t < OUT0 + 0.3) {
        const WIN = [{ k: 'w1', n: '经典', icon: 'users', d: '一直生效 · 只剩一人没破产', color: '#e5484d' }, { k: 'w2', n: '打满轮数', icon: 'sfn', d: '默认 15 轮，按估值排名', color: '#ec7211' },
          { k: 'w3', n: '限时', icon: 'cloudwatch', d: '到点按估值排名', color: '#2f7cf6' }, { k: 'w4', n: '六大支柱', icon: 'wat', d: 'Well-Architected 全达标', color: '#1f9d55' }];
        WIN.forEach((w, n) => {
          const t0 = W0 + 0.1 + n * 0.18, t1 = OUT0, x = -4.7 + n * 3.3; if (t < t0 - 0.22 || t > t1 + 0.3) return;
          const u = seg(t, t0, t0 + 0.9), bb = u < 0.2 ? Math.cos(seg(t, t0 - 0.22, t0 + 0.18) * Math.PI / 2) : 0.45 * Math.abs(Math.cos(u * Math.PI * 2.5)) * Math.pow(1 - u, 1.7);   // 和上面的盒子一样：第一下提早落、弹得低一点
          let y = bb * 7, sq = u < 1 && bb < 0.05 ? 0.18 * (1 - u) : 0;
          if (u >= 1) { const ph = ((t - t0 - 0.9 + n * 0.4) % 1.5) / 1.5; if (ph < 0.32) { const h = Math.sin(ph / 0.32 * Math.PI); y = h * 0.6; sq = ph < 0.04 || ph > 0.29 ? 0.1 : -0.07 * h; } }
          const out = sm(seg(t, t1 - 0.6 + n * 0.05, t1 + 0.15 + n * 0.05)); y += out * 9;
          E.box('win' + w.k, { ...w, tag: '胜利条件' }, { x, y: 0.01 + y, z: -0.4 + Math.abs(x) * -0.12, size: [2.5, 3.3, 0.6], sq, ry: -x * 0.06 + Math.sin(t * 1.2 + n) * 0.06 });
          E.floorGlow('gw' + w.k, w.color, x, -0.2 + Math.abs(x) * -0.12, 3.6 * (1 - out), 0.75 * seg(t, t0 + 0.15, t0 + 0.4) * (1 - out));
          E.splash(t, t0 + 0.18, V(x, 0, -0.9), w.color, 10);
        });
        E.label('wmulti', V(0, 4.6, -0.4), '<span>后三种开局<b>可以多选</b>，哪个先到就按哪个结束</span>', win(t, W0 + 1.2, OUT0 - 0.62, 0.3, 0.22), 'org title');   // 退场顺序：标签 → 盒子跳走 → 字幕
        if (t >= W0) E.caption('16 怎么赢', '只剩一人<b>一直算赢</b>；<br>开局还能多选：<b>打满轮数</b>、<b>限时</b>，或者先凑齐 <b>Well-Architected 六大支柱</b>', E.capWin(t, W0, OUT0, 0.3, 0.3));
      }
      if (t >= EG0 - 0.7) E.show('eggblk', 'eggblk', '', ease(seg(t, EG0 - 0.7, EG0 + 0.3)), 'none');   // 片尾播完先黑屏，接彩蛋
      } finally { E.caption = capReal; capDraw(E, CAPF, CAPX, t); E.label = labReal; labQ.forEach(a => { const sr = E.safeR; if (a[5]) E.safeR = a[5]; labX(E, labReal, a, AVL && AVL[a[0]], STL && STL[a[0]], t); E.safeR = sr; });   // 第 6 个参数：只对这一个标签收窄右边界（标签框往左挪，引线和光点仍指着锚点）；labX 顺手加表情头像、道具贴纸
        POPQ.forEach(([k, who, ex, pos, a]) => { const h = a > 0 && avHTML(who, ex); if (!h) return; labReal('xp' + k, pos, `<span class="xbub" style="--c:${XCOL[who]}">${h}</span>`, a, 'xpop'); avSet(E, E.el('Lxp' + k), seg(a, 0.15, 1)); }); }   // 棋子上方的反应头像：按最终镜头算位置，和标签一样收进安全区
    },
  };

  // ---------- 片尾彩蛋：隐藏 BOSS「作者韩叔」 ----------
  // 片尾播完黑屏 →「等等……还没完」→ 灯一暗，三位挑战者（Damo、虫虫、Yuki）背对镜头站在棋盘前面 →
  // 一道闪电劈在棋盘中间的空地上（不劈人），棋盘上的钱都往那儿飞，金色王座长出来 → 黑化韩叔从天而降坐上王座，一下一下变大 →
  // 王冠落下、顶上出 BOSS 血条、右边出 BOSS 卡 → 过路费都飞向他 → 最后他把墨镜往下一拉，冲大家眨一下眼
  // 有角色设定图时（韩叔、Damo、虫虫）：韩叔站在金币山上，黑化形态 →（紫光一闪）巨大化 BOSS → 拉低墨镜眨眼，都用设定图里的动作；不用 3D 王座和王冠
  // Q 版人物的样子：四个人都有角色设定图，有就用设定图（chibi.js 的 makeSpriteChibi；sprite 指向哪套图）；没有时退回捏的 Q 版（Yuki 按本人照片：蓬松短发、深灰 T 恤、黑色双肩包，鞋子用他的玩家紫色）
  const CAST = {
    han: { shirt: '#1d1d22', hair: 'crop', hairColor: '#111114', eyes: 'calm', browH: 0.034, collar: true, lanyard: '#e5484d' },   // 韩叔：按本人照片，短而密的黑发、齐刘海、黑衬衫（挂一张讲者牌，用他的玩家红色）
    hanDark: { shirt: '#1d1d22', suit: true, tie: '#e5484d', shades: true, chain: true, hair: 'crop', hairColor: '#111114', eyes: 'calm', browH: 0.034 },
    yuki: { shirt: '#3a3a3e', pants: '#1d1d22', shoe: '#9b5cf6', hair: 'quiff', hairColor: '#2a1d16', backpack: '#1c1c1f', sprite: 'yuki' } };
  let BOSS = null;
  function bossMesh(E) {
    if (BOSS) return BOSS;
    const SP = PROMO_DATA.sprites || {}, han = SP.han ? makeSpriteChibi(E, SP.han, 2.1) : makeChibi(E, { ...CAST.hanDark, crown: true });
    const throne = new THREE.Group(); throne.add(makeCoinPile()); throne.visible = false; E.scene.add(throne);
    if (!han.frame) { const th0 = makeThrone(); th0.position.y = 0.28; throne.add(th0); }
    throne.add(han.g); han.g.position.set(0, han.frame ? 0.36 : 0.6, han.frame ? 0.05 : 0.02); han.blob.visible = false;
    // 设定图里切出来的道具和表情头像（PROMO_DATA.props；6 个模式片没有，缺哪张就退回原来的画法）
    const PR = Object.assign({}, PROMO_DATA.props || {}), keep = [], sm = k => k * k * (3 - 2 * k), AVC = { han: '#e5484d', damo: '#1f9d55', chong: '#2f7cf6', yuki: '#9b5cf6' };
    // 黑化以后的韩叔头像（sprites.han.darkhead：序章黑化以后用的那张戴墨镜坏笑的头肩图）：彩蛋里他是黑化形态，第二页「阴险坏笑」和 BOSS 卡上的头像也换成它；没有这张就还用原来的表情头像
    { const D = PROMO_DATA.sprites && PROMO_DATA.sprites.han && PROMO_DATA.sprites.han.darkhead; if (D) PR.han_dark = { w: D.w, h: D.h, src: D.src, label: '黑化', who: 'han', kind: 'exp' }; }
    const HSMUG = PR.han_dark ? 'han_dark' : 'han_exp_smug', HPROUD = PR.han_dark ? 'han_dark' : 'han_exp_proud';
    // 弹出来的缓动：从 0 速度起步，前 70% 长到 1 + o，后 30% 落回 1（带一点回弹，又不像 easeBack 那样第一帧就猛冲，大立牌每帧挪不到 25 像素）
    const pop = (k, o = 0.06) => k <= 0 ? 0 : k >= 1 ? 1 : k < 0.7 ? (1 + o) * sm(k / 0.7) : 1 + o - o * sm((k - 0.7) / 0.3);
    const ptex = n => { const t = new THREE.Texture(), im = new Image(); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; im.onload = () => { t.image = im; t.needsUpdate = true; if (E.renderer && E.renderer.initTexture) E.renderer.initTexture(t); }; im.src = PR[n].src; return t; };
    // 道具立牌：底边中点在原点、高 H，每帧绕竖轴转向镜头（face）。fx：发光特效（不受灯光）；否则和人物立牌一样受光。都写深度：金币能掉进奖杯后面；
    //   紫火要是不写深度，后画的地面红光（半径 13 的大圆）会盖在火上，火身上横着出现一道红光的边
    const pboard = (n, H, fx) => { if (!PR[n]) return null; const f = PR[n], w = H * f.w / f.h, t = ptex(n);
      const mat = fx ? new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.04, side: THREE.DoubleSide })
        : new THREE.MeshStandardMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.5, roughness: 0.95, transparent: true, alphaTest: 0.06, side: THREE.DoubleSide });
      const geo = new THREE.PlaneGeometry(w, H); geo.translate(0, H / 2, 0); const g = new THREE.Group(), m = new THREE.Mesh(geo, mat); g.add(m); g.visible = false; return { g, m, mat, w, h: H }; };
    const face = (o, cam) => { const p = o.getWorldPosition(new THREE.Vector3()); o.rotation.y = Math.atan2(cam.x - p.x, cam.z - p.z); return o.rotation.y; };   // 父节点都没有旋转
    // 叠加层里的表情头像：圆形，角色色描边 + 白色外圈 + 角色色外发光（和名牌头像同一套）。k 进场 0→1（缩放带一点回弹），q 退场 0→1；锚点是头像底边中点
    const avH = (n, s) => `<b class="egface" style="--c:${AVC[PR[n].who] || '#ff9900'};--s:${s}px"><i style="background-image:url(${PR[n].src})"></i></b>`;
    const av = (E, key, n, x, y, s, k, q = 0, cls = '') => { if (!PR[n] || k <= 0 || q >= 1) return null;
      const a = sm(Math.min(1, k * 1.6)) * (1 - sm(q)), z = (0.5 + 0.5 * pop(k, 0.12)) * (1 - 0.4 * q * q);
      return E.show(key, 'egav' + cls, avH(n, s), a, `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%) scale(${z.toFixed(4)})`); };
    ['han_dark', 'han_exp_smug', 'han_exp_proud', 'han_crown', 'han_pawn', 'han_shades', 'han_scepter', 'chong_exp_surprised', 'damo_exp_surprised', 'yuki_exp_surprised', 'chong_exp_serious', 'damo_exp_determined', 'yuki_exp_determined']
      .forEach(n => { if (!PR[n]) return; const im = new Image(); im.src = PR[n].src; if (im.decode) im.decode().catch(() => {}); keep.push(im); });   // 叠加层的图先解码好，第一次出现时不空一帧
    // 金币山旁边的奖杯：有设定图里的 User Group 冠军奖杯就用它（立牌，站在脚边的金币上），没有就用原来的 3D 奖杯
    const cup = pboard('han_trophy', 0.82), trophy = cup ? cup.g : makeTrophy(); throne.add(trophy);
    if (cup) trophy.position.set(-1.05, 0.2, 0.5);
    else if (han.frame) { trophy.position.set(-1.0, 0.24, 0.5); trophy.scale.setScalar(0.85); }   // 设定图版：奖杯摆在脚边的金币上
    else { trophy.position.set(-0.66, 1.21, 0.28); trophy.scale.setScalar(0.7); }   // 奖杯放在左扶手上（放胸前会挡住金链子和脸）
    // 巨大化时身后升起的紫火（魔法特效，左右各两团，放在立牌后面；左边的镜像，火舌都往外飘；最先画，后面的立牌和火星按深度盖在上面）、金币山右边冒出来的暗影小弟
    const flames = han.frame ? [[-1.22, 0.1, -0.42, 1.15, 0], [-1.55, 0.06, -0.7, 0.8, 0.08], [1.22, 0.1, -0.42, 1.15, 0.04], [1.55, 0.06, -0.7, 0.8, 0.12]].map(([x, y, z, H, d]) => {
      const b = pboard('han_flame', H, true); if (!b) return null; b.g.position.set(x, y, z); b.m.scale.x = x < 0 ? -1 : 1; b.d = d; b.m.renderOrder = -1; throne.add(b.g); return b; }).filter(Boolean) : [];
    const minions = han.frame ? [[1.2, 0.08, 0.8, 0.5, 0]].map(([x, y, z, H, d]) => {
      const b = pboard('han_minion', H); if (!b) return null; b.g.position.set(x, y, z); b.d = d; throne.add(b.g); return b; }).filter(Boolean) : [];
    const heroes = [
      makeChibi(E, CHIBI_CHONG),
      SP.damo ? makeSpriteChibi(E, SP.damo, 1.9) : makeChibi(E, { shirt: '#1f9d55', hair: 'bald', eyes: 'dot', cape: '#d42a2a', gloves: '#ffffff' }),
      makeChibi(E, CAST.yuki)];
    heroes.forEach(c => { c.g.visible = false; E.scene.add(c.g); });
    // 闪电：劈在棋盘中间的空地上
    const path = new THREE.CurvePath(), TG = new THREE.Vector3(0, 0.05, -0.6); let prev = new THREE.Vector3(1.8, 16, -3.0), sd = 3;
    for (let k = 1; k <= 15; k++) { sd = (sd * 16807) % 2147483647; const u = k / 15, j = (sd / 2147483647 - 0.5) * 2.4 * (0.35 + 0.65 * (1 - u));
      const p = k === 15 ? TG.clone() : new THREE.Vector3(1.8 * (1 - u) + j, 16 - (16 - TG.y) * u, -3.0 + (TG.z + 3.0) * u + j * 0.5); path.add(new THREE.LineCurve3(prev, p)); prev = p; }
    const bolt = new THREE.Group();
    bolt.add(new THREE.Mesh(new THREE.TubeGeometry(path, 220, 0.08, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })));
    bolt.add(new THREE.Mesh(new THREE.TubeGeometry(path, 220, 0.24, 8), new THREE.MeshBasicMaterial({ color: 0x4d86ff, transparent: true, opacity: 0.55, depthWrite: false })));
    // 身边往上飘的火星
    const embers = new THREE.Group(), emMat = new THREE.MeshBasicMaterial({ color: 0xff8a3a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    for (let k = 0; k < 44; k++) embers.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), emMat));
    // 灯：一直留在场景里（强度 0），免得彩蛋开始时着色器重新编译卡一下
    const redL = new THREE.PointLight(0xff3b30, 0, 0, 1.3), flash = new THREE.PointLight(0xcfe0ff, 0, 0, 1.2), spot = new THREE.SpotLight(0xffe6d6, 0, 0, 0.45, 0.7, 1.0);
    spot.position.set(5, 16, 12); spot.target = throne;
    const base = E.scene.children.filter(o => o.isHemisphereLight || o.isDirectionalLight).map(l => [l, l.intensity]);
    // 设定图版：巨大化时从身后炸开的紫色火星、眨眼时眼睛外侧那颗星光（原来用的 E.splash 只会贴着地面炸，到不了头的高度，画面上看不到）
    const burst = new THREE.Group(), bMat = new THREE.MeshBasicMaterial({ color: 0xb070ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    for (let k = 0; k < 24; k++) burst.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), bMat));
    const twk = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctex(128, 128, (g, w, h) => {
      const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.12, 'rgba(255,255,255,.5)'); r.addColorStop(0.45, 'rgba(255,255,255,.08)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; [0, Math.PI / 2].forEach(a => { g.save(); g.translate(w / 2, h / 2); g.rotate(a); g.beginPath(); g.moveTo(-w * 0.48, 0); g.quadraticCurveTo(0, -w * 0.08, w * 0.48, 0); g.quadraticCurveTo(0, w * 0.08, -w * 0.48, 0); g.fill(); g.restore(); });
    }), color: 0xfff6c8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    burst.visible = twk.visible = false;
    E.scene.add(bolt, embers, redL, flash, spot, burst, twk);
    BOSS = { throne, han, trophy, heroes, bolt, embers, emMat, redL, flash, spot, base, burst, bMat, twk, PR, HSMUG, HPROUD, keep, sm, pop, AVC, pboard, face, avH, av, cup, flames, minions };
    return BOSS;
  }
  function eggReset(E) {
    const B = bossMesh(E);
    B.throne.visible = B.bolt.visible = B.embers.visible = B.burst.visible = B.twk.visible = false; B.heroes.forEach(c => { c.g.visible = false; });
    B.redL.intensity = B.flash.intensity = B.spot.intensity = 0;
    B.base.forEach(([l, i0]) => { l.intensity = i0; });
  }
  function egg(t, E) {
    // 黑屏分两页：先「等等……还没完」，再「讨伐韩叔，还差最后一关」；之后的动画整体往后挪 ES 秒
    //   ES 0.45 → 1.25：两页黑屏字各全亮约 1 秒（原来 0.56 / 0.44 秒）；ELE：动画在 e 时间里的长度（原来是 EGL − ES = 10.8），之后全黑 0.45 t 到片子结束
    const { V, seg, ease, easeOut, easeBack, top, cell } = E, e0 = t - EG0, ES = 1.25, EGs = EG0 + ES, e = e0 - ES, ELE = 10.8, B = bossMesh(E);
    E.show('eggblk', 'eggblk', '', 1 - ease(seg(e0, 2.6, 2.8)), 'none');   // 0.25 秒缓缓揭幕，揭完正好闪电劈下（e 1.55）
    E.show('eggtxt', 'eggtxt', '等等<span style="letter-spacing:0;margin-right:.32em;font-family:\'PingFang SC\',sans-serif;position:relative;top:-.3em">……</span>还没完', seg(e0, 0.3, 0.5) * (1 - seg(e0, 1.3, 1.45)), `translateX(${(Math.sin(e0 * 97) * 4 * seg(e0, 0.6, 0.95)).toFixed(1)}px)`);   // 11/11 refine：省略号按中文排版居中（PingFang SC 的 …… 贴着基线，往上提 0.3em）
    E.show('eggtxt2', 'eggtxt eggtxt2', '讨伐韩叔<br>还差最后一关', seg(e0, 1.45, 1.65) * (1 - seg(e0, 2.45, 2.6)), 'none');
    B.av(E, 'egsmug', B.HSMUG, 954, 498, 164, seg(e0, 1.55, 1.79), seg(e0, 2.4, 2.58), ' on6');   // 第二页字上面：韩叔「阴险坏笑」的头像弹出来，和字一起退（字的框是整行宽，头像放在框外，不叠在一起）
    if (e0 < 2.4) return;   // 还全黑的时候（e0 1.6–1.8）就把机位、暗角、暗光摆好，揭幕时只剩亮度在变
    // 灯一暗：环境光和主光压到很低，只剩打在 BOSS 身上的光
    const dark = seg(e, 1.15, 1.35);
    B.base.forEach(([l, i0]) => { l.intensity = i0 * (1 - 0.72 * dark); });
    E.glow(0.32 - 0.22 * dark, 0.26 - 0.18 * dark);
    E.show('eggvig', 'eggvig', '', 0.7 * dark, 'none');
    const C0 = V(0, -0.04, -0.9);
    // 地面震动：每一下格子从王座往外一圈圈弹起来
    const STOMP = [[2.85, 0.3], [3.25, 0.32], [3.7, 0.45], [4.15, 0.6]];
    const ripple = (x, z) => { const d = Math.hypot(x - C0.x, z - C0.z); return STOMP.reduce((h, [ts, a]) => { if (e < ts) return h; const w = d - (e - ts) * 13; return h + a * Math.exp(-w * w / 1.2) * (1 - seg(e, ts, ts + 1.2)); }, 0); };
    for (let i = 0; i < 48; i++) { const c = cell(i), h = ripple(c.x, c.z); if (h > 0.002) E.lift(i, h); }
    STOMP.forEach(([ts], k) => { const u = seg(e, ts, ts + 0.9); if (u > 0 && u < 1) E.shockwave('bw' + k, C0.x, C0.z, 1 + u * 14, 0.8 * (1 - u)); });
    // 闪电劈在棋盘中间的空地上（闪两下）
    const strike = e >= 1.55 && (e < 1.67 || (e >= 1.73 && e < 1.83));
    B.bolt.visible = strike; B.flash.position.set(0.6, 2.0, 1.0); B.flash.intensity = strike ? 45 : e >= 1.55 ? 30 * (1 - seg(e, 1.83, 2.4)) : 0;
    E.show('eggflash', 'eggflash', '', strike ? 0.1 : 0, 'none');
    if (e >= 1.55) E.splash(t, EGs + 1.55, V(0, 0.2, -0.6), '#4d86ff', 18);
    if (e >= 1.55 && e < 2.6) { const u = seg(e, 1.55, 2.5); E.shockwave('bolt', 0, -0.6, 0.3 + u * 4, 0.9 * (1 - u), 0x9fc7ff); }
    // 棋盘上的钱都往那儿飞，金色王座长出来
    [[2, 0], [30, 0.1], [42, 0.2], [9, 0.3], [35, 0.4], [46, 0.5], [26, 0.6], [5, 0.7]].forEach(([i, d]) => E.coinFly(t, EGs + 1.75 + d, 0.75, top(i).add(V(0, 0.4, 0)), V(0, 0.8, -0.6), 8, 2.0, 0, k => k * k * (3 - 2 * k)));   // 出发时刻不变，飞 0.75（原来 0.6）、沿路线 smoothstep（原来 ease 半路 3 倍速，前排的金币一帧挪 80 多像素）
    E.floorGlow('hgold', 'rgba(255,190,60,1)', 0, -0.6, 4, 0.85 * seg(e, 1.8, 2.3) * (1 - seg(e, 2.9, 3.4)));
    const SC = [2.2, 2.6, 3.0, 3.4]; let sc = SC[0] * easeBack(seg(e, 2.1, 2.55)), sq = 0;
    STOMP.slice(1).forEach(([ts], k) => { sc += (SC[k + 1] - SC[k]) * easeBack(seg(e, ts, ts + 0.3)); sq += 0.1 * Math.sin(Math.PI * seg(e, ts - 0.12, ts + 0.08)); });
    sq += 0.14 * Math.sin(Math.PI * seg(e, 2.85, 3.0));
    B.throne.visible = sc > 0.001; B.throne.position.copy(C0); B.throne.scale.set(Math.max(0.001, sc) * (1 + sq * 0.5), Math.max(0.001, sc) * (1 - sq), Math.max(0.001, sc) * (1 + sq * 0.5));
    // 黑化韩叔从天而降坐上王座
    const h = B.han, drop = seg(e, 2.5, 2.85); h.g.visible = e >= 2.5; h.g.position.set(0, (h.frame ? 0.36 : 0.6) + (1 - drop * drop) * 4, h.frame ? 0.05 : 0.02);
    if (h.frame) h.frame(e < 4.6 ? 'dark' : e < 7.5 ? 'giant' : 'wink');   // 黑化形态 → 巨大化 BOSS（和王冠落下同一拍）→ 拉低墨镜眨眼
    if (h.frame) h.g.scale.setScalar(e >= 4.6 && e < 7.5 ? 0.8 + 0.2 * easeBack(seg(e, 4.6, 4.95)) : 1);   // 换成巨大化那张时先和黑化那张差不多大，在紫光里长到全尺寸（脚底不动）
    const headW = h.frame ? C0.clone().add(V(0, (0.36 + 1.75) * sc, 0.2 * sc)) : null;
    const wink = seg(e, 7.6, 7.9), lift = e >= 7.4 ? easeOut(seg(e, 7.4, 7.7)) : 0;
    h.pose({ t: e, armL: [0.75, 0.85], armR: [0.5 + lift * 1.8, 0.2 + lift * 0.25], mouth: wink > 0.5 ? 'smile' : e > 4.0 ? 'grin' : 'smirk', brow: wink > 0.5 ? 0.05 : 0.32, head: [0, Math.sin(e * 1.3) * 0.05, wink * 0.12], bounce: e > 4.2 && e < 7.4 ? Math.abs(Math.sin(e * 12)) * 0.02 : 0 });
    h.legs.forEach(L => { L.rotation.x = -1.45; });
    if (h.shades) { h.shades.position.y = -0.075 * lift; h.shades.scale.y = 1 - 0.45 * lift; h.shades.rotation.x = 0.35 * lift; }
    h.eyes[1].scale.set(1 + 0.4 * wink, 1 - 0.9 * wink, 1);
    // 王冠从天上落到头上
    if (h.crown) { const cu = seg(e, 4.55, 5.0); h.crown.visible = e >= 4.55; h.crown.position.set(0, 0.5 + (1 - easeBack(cu)) * 1.6, 0); h.crown.rotation.y = (1 - cu) * 3; }
    if (h.frame) { E.show('eggpf', 'oflash boltw', '', e < 4.6 ? seg(e, 4.56, 4.6) : Math.pow(1 - seg(e, 4.6, 5.0), 2), 'none');   // 巨大化：紫光一闪（换图前一帧亮起来，换图那一帧最亮，盖住换图）
      const pb = seg(e, 4.6, 5.3); B.burst.visible = pb > 0 && pb < 1; B.bMat.opacity = 0.95 * (1 - pb);   // 紫色火星从他身后往外炸开：放在立牌后面，叠在人身上的那部分被立牌挡住，只在轮廓外面看得到（叠在脸上像脏块）
      if (B.burst.visible) B.burst.children.forEach((m, k) => { const a = k * 2.399, r = 1.0 + (2.2 + (k % 4) * 0.6) * easeOut(pb);
        m.position.copy(headW).add(V(Math.cos(a) * r, Math.sin(a) * r * 0.9 + 0.4 - 1.2 * pb * pb, -1.1)); m.rotation.set(e * 4 + k, e * 3 + k, 0); m.scale.setScalar(0.32 * (1 - 0.6 * pb)); }); }
    else { if (e >= 4.95) E.splash(t, EGs + 4.98, h.head.getWorldPosition(V(0, 0, 0)).add(V(0, 1.5, 0)), '#ffc23a', 16);
      if (e >= 8.0) E.splash(t, EGs + 8.0, h.head.getWorldPosition(V(0, 0, 0)).add(V(0.9, 0.3, 1.2)), '#fff3a0', 10); }
    // 三位挑战者：背对镜头站在王座前面，被震得往后仰
    [[-2.3, 3.6], [0, 4.2], [2.3, 3.6]].forEach(([x, z], k) => {
      const c = B.heroes[k]; c.g.visible = true; c.g.position.set(x, -0.04 + ripple(x, z), z); c.g.rotation.y = Math.PI + x * 0.08;
      const brace = seg(e, 2.85, 3.1) * (1 - seg(e, 4.6, 5.2));
      c.pose({ t: e + k, armL: [0.3 + brace * 1.2, 0.3], armR: [k === 1 && e > 5.2 ? 0.2 : 0.3 + brace * 1.2, k === 1 && e > 5.2 ? 2.6 : 0.3], lean: -0.25 * brace, mouth: 'o', cape: 0.3 * brace });
    });
    // 灯：落地后红光从下面打上来，顶光照亮 BOSS
    E.floorGlow('bossg', 'rgba(255,59,48,1)', C0.x, C0.z, 13, 0.7 * seg(e, 2.85, 3.5));
    B.redL.position.set(0, 2.0, 2.4); B.redL.intensity = 45 * seg(e, 2.85, 3.5);
    B.spot.intensity = 80 * seg(e, 3.0, 3.8);
    const ea = seg(e, 3.3, 3.9); B.embers.visible = ea > 0; B.emMat.opacity = 0.9 * ea;
    B.embers.children.forEach((m, k) => { const ph = (e * 0.36 + k * 0.137) % 1, a = k * 2.399 + e * 0.35, r = 2.0 + (k % 6) * 0.55;
      m.position.set(Math.cos(a) * r, 0.2 + ph * 8.5, -0.9 + Math.sin(a) * r * 0.8); m.rotation.set(e * 2 + k, e * 3 + k, 0); m.scale.setScalar(Math.sin(Math.PI * ph) * (0.6 + (k % 3) * 0.35)); });
    // 棋盘上的钱一波波飞进他身上：每喂一波大一圈；最后过路费也都飞向他
    [[3.25, 2.6, [4, 30, 44]], [3.7, 3.0, [9, 35, 40]], [4.15, 3.4, [16, 26, 46]]].forEach(([ts, s2, tiles]) => tiles.forEach((i, n) => E.coinFly(t, EGs + ts - 0.54 + n * 0.04, 0.5, top(i).add(V(0, 0.4, 0)), V(0, 1.0 * s2, -0.9 + 0.45 * s2), 10, 1.0, 0, k => k * k * (3 - 2 * k))));   // 落到他身上的时刻不变（大一圈那一下）：早 0.12 出发、飞 0.5（原来 0.38），沿路线 smoothstep（原来一帧挪 100 像素）
    const TT = h.frame ? C0.clone().add(V(-1.0, 0.24 + 0.62, 0.5).multiplyScalar(SC[3])) : V(-2.24, 5.6, 0.05);   // 过路费飞进奖杯（设定图奖杯的落点要等镜头定下来再算，在下面）
    B.trophy.visible = !((h.frame || B.cup) && e >= 7.5);   // 切近景以后奖杯只剩画面左边缘一截把手，收掉（过路费 7.05 就飞完了）
    // 切近景：拉墨镜那一声（e 7.42）起一层金色闪光，换图、切镜、奖杯消失都压在闪光最亮的那几帧（在血条和 BOSS 卡下面，只盖 3D 画面）
    if (h.frame) E.show('eggwk', 'eggwk', '', e < 7.49 ? 0.95 * seg(e, 7.33, 7.49) : e < 7.535 ? 0.95 : 0.95 * Math.pow(1 - seg(e, 7.535, 7.8), 2), 'none');
    const toll = to => [[12, 0.0], [17, 0.25], [26, 0.5], [10, 0.75], [21, 1.0], [14, 1.25]].forEach(([i, d]) => E.coinFly(t, EGs + 5.5 + d * 0.6, 0.8, top(i).add(V(0, 0.4, 0)), to, 8, 0.8));
    if (!B.cup) toll(TT);
    // 镜头：全景 → 推向闪电劈中的地方 → 王座变大时往后拉成仰拍 → 慢慢绕到右前方，给 BOSS 卡让位置
    if (e < 4.3) E.camPath(t, [
      [EGs + 1.15, [0, 15.5, 15.5], [0, 0, 0.6]],
      [EGs + 1.5, [0, 15.5, 15.5], [0, 0, 0.6]],
      [EGs + 2.8, [0, 5.0, 13.5], [0, 1.6, -0.6]],
      [EGs + 4.3, [0, 4.0, 18.5], [0, 4.0, -0.9]],
    ]); else {
      const u = ease(seg(e, 4.3, ELE)), a = 0.3 * u, R = 18.5 - 1.6 * u, off = 3.8 * ease(seg(e, 4.9, 5.7));
      // 设定图版：眨眼那张是半身像，换图时镜头直接切成近景（他站在金币堆里，头和巨大化时一样大）
      const near = h.frame && e >= 7.5, R2 = near ? 9.6 - 0.9 * ease(seg(e, 7.5, ELE)) : R, cy = near ? 4.15 : 4.0, off2 = near ? 2.1 : off;
      E.camera.position.set(Math.sin(a) * R2, cy, -0.9 + Math.cos(a) * (R2 + 0.9)); E.camera.lookAt(V(Math.cos(a) * off2, cy, -0.9 - Math.sin(a) * off2));
    }
    const shake = STOMP.reduce((s2, [ts], k) => s2 + (e >= ts ? (0.08 + 0.05 * k) * (1 - seg(e, ts, ts + 0.45)) : 0), 0);
    if (shake > 0) { E.camera.position.x += Math.sin(e * 61) * shake; E.camera.position.y += Math.cos(e * 47) * shake * 0.8; }
    // ---- 下面这些按这一帧最终的镜头摆：设定图里的道具立牌（转向镜头）、跟着人走的表情头像 ----
    const cam = E.camera.position, sm = B.sm, pop = B.pop;
    if (B.cup) {   // User Group 冠军奖杯：韩叔落地那一震以后从金币里弹出来（不和头上的三个「惊讶」头像同时在场）；过路费从上面落进杯口，落点在立牌后面一点，掉进杯口以下就被杯身挡住
      const tk = seg(e, 2.92, 3.42), ts = pop(tk); B.trophy.visible = B.trophy.visible && tk > 0; B.trophy.scale.set(Math.max(0.001, ts), Math.max(0.001, ts), 1);
      const ph = B.face(B.trophy, cam); toll(C0.clone().add(V(-1.05, 0.2 + 0.86 * 0.82, 0.5).multiplyScalar(sc)).add(V(-Math.sin(ph) * 0.22, 0, -Math.cos(ph) * 0.22)));
    }
    // 巨大化（紫光一闪）：身后、金币山两侧升起几团紫火，烧一会儿往下收；BOSS 卡进来之前收完，不跟卡和头像抢画面
    B.flames.forEach(b => { const k = seg(e, 4.6 + b.d, 5.1 + b.d), q = seg(e, 5.25 + b.d, 5.7 + b.d); b.g.visible = k > 0 && q < 1 && e < 7.5; if (!b.g.visible) return;
      b.g.scale.set((0.55 + 0.45 * sm(k)) * (1 + 0.035 * Math.sin(e * 6.3 + b.d * 55)), Math.max(0.001, pop(k) * (1 - 0.55 * sm(q)) * (1 + 0.05 * Math.sin(e * 8 + b.d * 40))), 1);
      b.mat.opacity = 0.95 * sm(Math.min(1, k * 1.8)) * (1 - sm(q)); B.face(b.g, cam); });
    // 暗影小弟：从金币山右前方冒出来探个头（站在右边紫火前面），又缩回金币里
    B.minions.forEach(b => { const k = seg(e, 4.8 + b.d, 5.12 + b.d), q = seg(e, 5.3 + b.d, 5.62 + b.d), s = pop(k, 0.1) * (1 - sm(q)); b.g.visible = k > 0 && q < 1; if (!b.g.visible) return;
      b.g.scale.set(Math.max(0.001, pop(k, 0.1) * (1 - 0.45 * sm(q))), Math.max(0.001, s), 1); b.g.position.y = 0.08 + 0.012 * Math.sin(e * 11); B.face(b.g, cam); });
    // 闪电劈下、王座长出来：三位挑战者头顶各弹一个「惊讶」头像（反应镜头），韩叔砸下来那一下缩回去（Damo 站在正中间，头像不留到韩叔落地）
    if (e < 3.0) [['chong_exp_surprised', 1.66], ['damo_exp_surprised', 1.84], ['yuki_exp_surprised', 1.75]].forEach(([n, t0], k) => {
      const p = E.screen(B.heroes[k].g.position.clone().add(V(0, 2.12, 0))); B.av(E, 'egsur' + k, n, p.x, p.y, 112, seg(e, t0, t0 + 0.24), seg(e, 2.68 + k * 0.03, 2.88 + k * 0.03)); });
    // 最后拉低墨镜眨眼以后：右下角依次滑进三位挑战者「坚定」的头像（虫虫没有「坚定」，用「认真」），像下集预告；跟着最后的黑场一起暗下去
    if (e >= 8.3) [['chong_exp_serious', 1440], ['damo_exp_determined', 1600], ['yuki_exp_determined', 1760]].forEach(([n, x], k) => {
      const k2 = seg(e, 8.35 + k * 0.14, 8.65 + k * 0.14); B.av(E, 'egnext' + k, n, x + 70 * (1 - easeOut(k2)), 958, 140, k2); });
    // 设定图版眨眼：眨的那只眼睛外侧、脑袋轮廓外面亮一颗星（贴在脸上的话加色混合在浅肤色上看不见）；立牌按镜头角度转，所以按这一帧的镜头算位置；在 wink 图里约 (0.97, 离底 0.66)
    const tw = h.frame ? seg(e, 7.95, 8.27) : 0; B.twk.visible = tw > 0 && tw < 1;
    if (B.twk.visible) { const F = PROMO_DATA.sprites.han, kk = 2.1 / F.front.h, w = F.wink.w * kk * (F.wink.s || 1), hh = F.wink.h * kk * (F.wink.s || 1);
      const Rw = C0.clone().add(V(0, (0.36 + h.R.position.y) * sc, 0.05 * sc)), cp = E.camera.position, ph = Math.atan2(cp.x - Rw.x, cp.z - Rw.z);
      B.twk.position.copy(Rw).add(V(Math.cos(ph) * 0.47 * w + Math.sin(ph) * 0.15, 0.66 * hh, -Math.sin(ph) * 0.47 * w + Math.cos(ph) * 0.15).multiplyScalar(sc));
      B.twk.scale.setScalar(1.0 * Math.sin(Math.PI * tw)); B.twk.material.rotation = tw * 0.8; }
    // 顶上的 BOSS 血条
    // 血条的 html 固定不变（左端一个小王冠图标），长度和 HP 数字每帧直接改，免得每帧重建里面的图
    const hb = seg(e, 4.75, 5.6), PR = B.PR, crn = PR.han_crown;
    const bb = E.show('bossbar', 'bossbar', `${crn ? `<img class="bbcr" src="${crn.src}">` : ''}<div class="bn"><em>FINAL BOSS</em><b>最终大魔王 · 韩叔</b></div><div class="bh"><i></i></div><div class="bs"></div>`, seg(e, 4.65, 4.95), `translateY(${(1 - easeOut(seg(e, 4.65, 5.05))) * -40}px)`);
    bb.querySelector('.bh i').style.width = (ease(hb) * 100).toFixed(1) + '%'; bb.querySelector('.bs').textContent = `HP ${Math.round(ease(hb) * 9999)} / 9999`;
    if (crn) { const ck = seg(e, 5.45, 5.72), ce = bb.querySelector('.bbcr'); ce.style.opacity = sm(Math.min(1, ck * 1.6)).toFixed(3); ce.style.transform = `rotate(${(-12 + 8 * (1 - ck)).toFixed(2)}deg) scale(${(0.5 + 0.5 * pop(ck, 0.14)).toFixed(4)})`; }   // 王冠等镜头往右让开、韩叔的头移到左边以后再弹出来（早了会和他头上的王冠挨在一起，像两顶王冠）
    // 右边的 BOSS 卡：照角色卡的格式。标题右边韩叔「得意」的头像（卡停稳以后再弹出来）；能力 / 弱点 / 专属技能前面各一个小道具图标：棋子（这盘棋是他做的）、墨镜（看到架构画错就要拉下墨镜细看）、权杖（他说了算）
    const ca = seg(e, 5.35, 5.85), ico = n => PR[n] ? `<img class="bi" src="${PR[n].src}">` : '', bx = PR.han_pawn || PR.han_shades || PR.han_scepter;
    const bc = E.show('bosscard', 'bosscard' + (bx ? ' bcx' : ''), `${PR[B.HPROUD] ? `<div class="bcav">${B.avH(B.HPROUD, 150)}</div>` : ''}<div class="bt">隐藏 BOSS · 最终关</div><h2><small>最终大魔王</small>作者 · 韩叔</h2><p class="bd">挡下过天外流星，也写下了这张棋盘。</p>
      <table><tr><td>${ico('han_pawn')}能力</td><td>规则书是他写的，每张卡都是他出的</td></tr><tr><td>${ico('han_shades')}弱点</td><td>看到有人把架构画错，忍不住要上去讲</td></tr><tr><td>${ico('han_scepter')}专属技能</td><td>「以作者解释为准」：有争议，他说了算</td></tr></table>
      <div class="bf">敢来 User Group 活动现场挑战他吗？</div>`, ease(ca), `translateX(${(1 - easeOut(ca)) * 60}px)`);
    if (PR[B.HPROUD]) { const ak = seg(e, 5.8, 6.08), ae = bc.querySelector('.bcav'); ae.style.opacity = sm(Math.min(1, ak * 1.6)).toFixed(3); ae.style.transform = `scale(${(0.5 + 0.5 * pop(ak, 0.12)).toFixed(4)}) rotate(${(8 * (1 - ak)).toFixed(2)}deg)`; }
    E.show('eggend', 'eggblk eggend', '', ease(seg(e, ELE - 0.9, ELE - 0.05)), 'none');   // 最后慢慢黑场（之后全黑到片子结束）
  }

  // ---------- 序章：韩叔的出师考（旧版，promo_open.js 在的时候不用） ----------
  // 封面之后三条横幅（参考经典桌游海报的拼贴版式）依次滑进来：
  //   ① 传说：韩叔站在 Summit 讲台上，身边弹出成就徽章；② 著书：他把规则书、事件卡、题库一张张写进一张棋盘；
  //   ③ 黑化：他坐上棋盘中间的王座，戴墨镜挂金链子、抱着 User Group 冠军奖杯，旁边空地上劈下一道闪电（不劈人）。
  // 然后第三条放大成全屏：虫虫、Yuki 跑上棋盘，Damo（一拳超人）从天而降带队，大标题砸下来；Damo 一拳把骰子打出去，接正片。
  let OP = null;
  const CAST_SHOW = /[?&]cast\b/.test(location.search);
  let CASTO = null;
  function castShow(t, E) {
    const { V } = E;
    const SP = PROMO_DATA.sprites || {}, mk = (o, who, fr) => { if (!who || !SP[who]) return makeChibi(E, o); const c = makeSpriteChibi(E, SP[who], who === 'han' ? 2.1 : 1.9); if (fr) c.frame(fr); return c; };   // 有设定图的人用设定图
    if (!CASTO) { CASTO = [['韩叔', CAST.han, '#e5484d', 'han'], ['黑化韩叔', { ...CAST.hanDark, crown: true }, '#e5484d', 'han', 'dark'], ['Yuki', CAST.yuki, '#9b5cf6'], ['虫虫', CHIBI_CHONG, '#2f7cf6', 'chong'], ['Damo · 绰号「一拳超人」', { shirt: '#1f9d55', hair: 'bald', eyes: 'dot', cape: '#d42a2a', gloves: '#ffffff' }, '#1f9d55', 'damo']]
      .map(([n, o, c, who, fr], k) => { const ch = mk(o, who, fr); E.scene.add(ch.g); ch.g.position.set(-80 + (k - 2) * 1.9, 0, 0.9); return { n, c, ch }; }); }
    const P = openAssets(E); P.A.visible = true; P.hanA.g.visible = false;
    CASTO.forEach(({ n, c, ch }, k) => { ch.g.visible = true; ch.g.rotation.y = k === 2 ? -0.5 : 0.15 * (k - 2) * -1;
      ch.pose({ t, armR: k === 4 ? [1.4, 0.1] : [0, 0.2], armL: [0, 0.2], mouth: k === 1 ? 'grin' : k === 4 ? 'flat' : 'smile', brow: k === 1 ? 0.32 : 0, cape: 0.5 });
      E.label('cs' + k, V(-80 + (k - 2) * 1.9, 2.25, 0.9), `<span>${n}</span>`, 1, 'otag'); });
    E.cam(V(-80, 1.6, 10.2), V(-80, 1.05, 0.9));
    // 每个人脚边摆两件自己的道具（设定图「细节元素」里的），名字上面两排自己的表情头像（韩叔的 8 个表情分给两个韩叔），方便核对
    const B = bossMesh(E), PR = B.PR, EXP = [['han', ['confident', 'laugh', 'think', 'gentle']], ['han', ['proud', 'smug', 'angry', 'surprised']], ['yuki'], ['chong'], ['damo']];
    if (!B.castP) B.castP = [['han_trophy', 'han_pawn'], ['han_flame', 'han_minion'], ['yuki_buddy', 'yuki_dice'], ['chong_compass', 'chong_scroll'], ['damo_cloudpawn', 'damo_dice']].map((ns, k) => ns.map((n, j) => {
      const b = B.pboard(n, n === 'han_flame' ? 0.66 : 0.46, n === 'han_flame'); if (!b) return null; b.g.position.set(-80 + (k - 2) * 1.9 + (j ? (k === 1 ? 0.84 : 0.62) : -0.62), 0, 1.5); E.scene.add(b.g); return b; }).filter(Boolean)).flat();   // 黑化韩叔脚边本来就有一排小弟，右边那件往外放一点
    B.castP.forEach(b => { b.g.visible = true; B.face(b.g, E.camera.position); });
    EXP.forEach(([who, ls], k) => { const ns = (ls ? ls.map(x => `${who}_exp_${x}`) : Object.keys(PR).filter(x => x.startsWith(who + '_exp_'))).filter(x => PR[x]); if (!ns.length) return;
      const p = E.screen(V(-80 + (k - 2) * 1.9, 2.25, 0.9));
      E.show('egcast' + k, 'egcast', ns.map(x => `<figure>${B.avH(x, 76)}<figcaption>${PR[x].label}</figcaption></figure>`).join(''), 1, `translate(${p.x.toFixed(1)}px,${(p.y - 92).toFixed(1)}px) translate(-50%,-100%)`); });
  }
  const DFROM = new THREE.Vector3(-5.2, 1.7, 4.15);   // Damo 一拳打碎的大骰子在这儿：正片第一把两颗骰子从碎块里飞出去
  // 第一把骰子（Damo 一拳打出来，tt 9.6 出发）：先往上冲一点、落下，再弹 3 下（第一下最高），tt 11.2 停稳（原来 |cos| 弹法几乎不弹、慢慢滚到 12.0）
  //   promo_open.js 序章末尾的 E.dice 和下面 E.dice 的覆盖都用这一组参数，接缝（tt 10.7）两边是同一个函数值；落定的点数还是 3、5，「3 + 5 = 8」标签时间不动
  //   music.mjs 正片段的骰子声按这里的落地时刻换算（tt 10.70 / 11.02 / 11.2 落地）
  const DICE1 = { t0: 9.6, t1: 11.2, bo: { up: 0.6, hs: [1.0, 0.35, 0.12], k2: 0.8 } }; window.PROMO_FULL_DICE1 = DICE1;
  const RD2 = { t0: 20.15, t1: 20.62, from: new THREE.Vector3(0.1, 1.15, 4.4), bo: { up: 0.25, hs: [0.32, 0.1], k2: 0.75 } };   // 虫虫的那一把（promo.js 时间 tt；music.mjs 的骰子声对在这儿）
  const BIGD = new THREE.Vector3(-5.2, 0.71, 4.15);
  const SA = [-80, 0, 0], SB = [80, 0, 0];
  function ctex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
  function openAssets(E) {
    if (OP) return OP;
    const { V } = E, I = E.D.icons, add = (o, x, y, z) => { o.position.set(x, y, z); E.scene.add(o); return o; };
    const M = (c, r = 0.5, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    const box = (w, h, d, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = m.receiveShadow = true; return m; };
    const plane = (w, h, map) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, fog: false }));
    const gold = M('#ffc23a', 0.22, 0.85); gold.emissive.set('#7a4a00'); gold.emissiveIntensity = 0.4;
    const all = [];
    const at = (o, p, r) => { o.position.set(...p); if (r) o.rotation.set(...r); return o; };
    const grp = () => { const g = new THREE.Group(); E.scene.add(g); all.push(g); return g; };

    // ① Summit 舞台
    const A = grp(); A.position.set(...SA);
    A.add(at(box(18, 0.4, 7, M('#1b2747', 0.25, 0.3)), [0, -0.2, 0]));
    A.add(at(box(18, 0.06, 0.06, new THREE.MeshBasicMaterial({ color: '#ff9900' })), [0, 0.01, 3.5]));
    const wall = plane(34, 10, ctex(1700, 500, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#0b111c'); gr.addColorStop(0.5, '#1b1e46'); gr.addColorStop(1, '#3b1a6a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.07)'; for (let x = 0; x < w; x += 26) for (let y = 0; y < h; y += 26) g.fillRect(x, y, 3, 3);
      for (let k = 0; k < 9; k++) { g.save(); g.translate(w * 0.28, h * 1.05); g.rotate(-1.2 + k * 0.3); const r = g.createLinearGradient(0, 0, 0, -h * 1.2); r.addColorStop(0, 'rgba(255,153,0,.26)'); r.addColorStop(1, 'rgba(255,153,0,0)'); g.fillStyle = r; g.fillRect(-26, -h * 1.2, 52, h * 1.2); g.restore(); }
      g.font = '900 64px PingFang SC, sans-serif'; g.fillStyle = 'rgba(255,255,255,.92)'; g.textAlign = 'left'; g.fillText('亚马逊云科技 Summit', w * 0.36, h * 0.26);
      g.font = '700 30px PingFang SC, sans-serif'; g.fillStyle = 'rgba(255,214,150,.9)'; g.fillText('云上创业 · 技术分享', w * 0.36, h * 0.35);
    }));
    wall.position.set(0, 4.2, -3.4); A.add(wall);
    const lect = new THREE.Group(); lect.position.set(-6.7, 0, 0.6); A.add(lect);
    lect.add(at(box(0.75, 0.95, 0.5, M('#232f3e', 0.4)), [0, 0.475, 0]));
    lect.add(at(box(0.6, 0.5, 0.02, new THREE.MeshBasicMaterial({ color: '#ec7211' })), [0, 0.55, 0.26]));
    lect.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.35, 8), M('#111', 0.4)), [0.1, 1.12, 0.1], [0.5, 0, 0]));
    lect.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), M('#222', 0.3)), [0.1, 1.27, 0.19]));
    const cone = (col, o) => { const m = new THREE.Mesh(new THREE.ConeGeometry(1.5, 7, 40, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })); return m; };
    const beams = [cone('#ffd9a0', 0.12), cone('#9fc7ff', 0.08)]; beams.forEach((b, k) => { b.position.set(-5.3 + k * 1.2, 3.4, 0.6); A.add(b); });
    const hanA = makeChibi(E, CAST.han); A.add(hanA.g); hanA.g.position.set(-5.3, 0, 0.9);

    // ② 书房：韩叔在桌前把规则书、卡牌写进一张小棋盘
    const B = grp(); B.position.set(...SB);
    B.add(at(box(20, 0.3, 8, M('#3a2a20', 0.5, 0.1)), [0, -0.15, 0]));
    const shelf = plane(34, 10, ctex(1700, 500, (g, w, h) => {
      const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#0e1626'); bg.addColorStop(1, '#1b2740'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
      const lamp = g.createRadialGradient(w * 0.5, h * 0.95, 0, w * 0.5, h * 0.95, w * 0.42); lamp.addColorStop(0, 'rgba(255,170,80,.35)'); lamp.addColorStop(1, 'rgba(255,170,80,0)'); g.fillStyle = lamp; g.fillRect(0, 0, w, h);
      const cols = ['#e5484d', '#2f7cf6', '#1f9d55', '#9b5cf6', '#ec7211', '#ffb020', '#0f9fb8'];
      [[0.08, 0.3], [0.62, 0.92]].forEach(([a, b]) => { for (let r = 0; r < 3; r++) { const y = h * (0.18 + r * 0.24); g.fillStyle = '#4a3324'; g.fillRect(w * a, y + 70, w * (b - a), 12);
        let x = w * a + 6; let k = r * 3; while (x < w * b - 30) { const bw = 18 + (k * 7) % 16, bh = 50 + (k * 13) % 22; g.fillStyle = cols[k % cols.length]; g.fillRect(x, y + 70 - bh, bw, bh); x += bw + 4; k++; } } });
      const sky = g.createLinearGradient(0, h * 0.12, 0, h * 0.54); sky.addColorStop(0, '#0a1430'); sky.addColorStop(1, '#3b1a7a'); g.fillStyle = sky; g.fillRect(w * 0.36, h * 0.12, w * 0.2, h * 0.42);
      g.fillStyle = 'rgba(255,255,255,.85)'; for (let k = 0; k < 26; k++) g.fillRect(w * (0.37 + ((k * 37) % 100) / 100 * 0.18), h * (0.14 + ((k * 53) % 100) / 100 * 0.36), 3, 3);
      g.fillStyle = '#ffd29a'; g.beginPath(); g.arc(w * 0.51, h * 0.22, 22, 0, 7); g.fill(); g.strokeStyle = '#ec7211'; g.lineWidth = 10; g.strokeRect(w * 0.36, h * 0.12, w * 0.2, h * 0.42);
    }));
    shelf.position.set(0, 4.2, -3.4); B.add(shelf);
    const desk = new THREE.Group(); desk.position.set(-0.2, 0, 0.2); B.add(desk);
    desk.add(at(box(4.6, 0.09, 1.5, M('#8a5a35', 0.45)), [0, 0.85, 0]));
    [[-2.1, -0.6], [2.1, -0.6], [-2.1, 0.6], [2.1, 0.6]].forEach(([x, z]) => desk.add(at(box(0.09, 0.85, 0.09, M('#6b4428', 0.5)), [x, 0.42, z])));
    const bookG = new THREE.Group(); bookG.position.set(-1.25, 0.9, 0.1); desk.add(bookG);
    bookG.add(at(box(1.3, 0.04, 0.85, M('#e5484d', 0.5)), [0, 0, 0]));
    [-1, 1].forEach(sd => bookG.add(at(box(0.6, 0.03, 0.8, M('#fffaf0', 0.8)), [sd * 0.31, 0.045, 0], [0, 0, -sd * 0.12])));
    const mini = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 1.45), [M('#1b2433'), M('#1b2433'), new THREE.MeshStandardMaterial({ roughness: 0.6, map: ctex(560, 400, (g, w, h) => {
      g.fillStyle = '#f4f6f8'; g.fillRect(0, 0, w, h); const cols = ['#ec7211', '#2f7cf6', '#9b5cf6', '#1f9d55', '#e5484d', '#0f9fb8', '#d13c8f', '#ffb020'], n = 11, c = w / n, r = h / 8;
      for (let k = 0; k < n; k++) { g.fillStyle = cols[k % 8]; g.fillRect(k * c + 2, 2, c - 4, 14); g.fillRect(k * c + 2, h - 16, c - 4, 14); }
      for (let k = 0; k < 8; k++) { g.fillStyle = cols[(k + 3) % 8]; g.fillRect(2, k * r + 2, 14, r - 4); g.fillRect(w - 16, k * r + 2, 14, r - 4); }
      g.fillStyle = '#16191f'; g.font = '900 64px PingFang SC, sans-serif'; g.textAlign = 'center'; g.fillText('云上大亨', w / 2, h / 2 + 22); g.font = '700 22px PingFang SC'; g.fillStyle = '#ec7211'; g.fillText('亚马逊云科技 User Group', w / 2, h / 2 - 44);
    }) }), M('#1b2433'), M('#1b2433'), M('#1b2433')]);
    mini.castShadow = true; mini.position.set(1.3, 0.95, 0.15); desk.add(mini);
    const cardTex = (col, label) => ctex(140, 200, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = col; g.fillRect(0, 0, w, 46); g.fillStyle = '#fff'; g.font = '800 22px PingFang SC'; g.textAlign = 'center'; g.fillText(label, w / 2, 31);
      g.fillStyle = '#d5dbdb'; for (let k = 0; k < 5; k++) g.fillRect(16, 70 + k * 22, w - 32 - (k % 2) * 30, 9); g.strokeStyle = col; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); });
    const cardTx = [cardTex('#8c4fff', 're:Invent'), cardTex('#d13c8f', 'Health'), cardTex('#2f7cf6', '题库'), cardTex('#ec7211', '规则')];
    const cards = Array.from({ length: 14 }, (_, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.43), new THREE.MeshBasicMaterial({ map: cardTx[k % 4], side: THREE.DoubleSide })); desk.add(m); return m; });
    const hanB = makeChibi(E, CAST.han); B.add(hanB.g); hanB.g.position.set(-2.9, 0, -0.35);

    // ③ 棋盘中间的王座
    const throne = grp(); throne.position.set(0, -0.04, -0.9); const th0 = makeThrone(); th0.position.y = 0.28; throne.add(th0, makeCoinPile());
    const hanC = makeChibi(E, CAST.han), hanD = makeChibi(E, CAST.hanDark);
    [hanC, hanD].forEach(c => { throne.add(c.g); c.g.position.set(0, 0.6, 0.02); c.blob.visible = false; });
    const trophy = makeTrophy(); throne.add(trophy);
    // 闪电（劈在王座旁边的空地上，不劈人）
    const path = new THREE.CurvePath(), TG = V(2.3, 0.05, 0.6); let prev = V(3.6, 15, -2.6), sd = 5;
    for (let k = 1; k <= 11; k++) { sd = (sd * 16807) % 2147483647; const u = k / 11, j = (sd / 2147483647 - 0.5) * 1.1 * (1 - u);
      const p = k === 11 ? TG.clone() : V(3.6 + (TG.x - 3.6) * u + j, 15 - (15 - TG.y) * u, -2.6 + (TG.z + 2.6) * u + j * 0.5); path.add(new THREE.LineCurve3(prev, p)); prev = p; }
    const bolt = grp();
    bolt.add(new THREE.Mesh(new THREE.TubeGeometry(path, 220, 0.045, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })));
    bolt.add(new THREE.Mesh(new THREE.TubeGeometry(path, 220, 0.18, 8), new THREE.MeshBasicMaterial({ color: 0x8fb8ff, transparent: true, opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending })));
    // 三位挑战者
    const chong = makeChibi(E, { shirt: '#2f7cf6', hair: 'spiky', hairColor: '#3b2a20' });
    const yuki = makeChibi(E, CAST.yuki);
    const damo = makeChibi(E, { shirt: '#1f9d55', hair: 'bald', eyes: 'dot', cape: '#d42a2a', gloves: '#ffffff', shoe: '#ffffff' });
    const heroes = [chong, yuki, damo]; heroes.forEach(c => { E.scene.add(c.g); all.push(c.g); });
    // 挑战用的大骰子：Damo 一拳把它打碎，碎块四散，里面飞出正片的两颗骰子
    const dieFace = n => ctex(256, 256, (g, w) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, w); g.strokeStyle = '#d5dbdb'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, w - 10);
      const P = { 1: [[0.5, 0.5]], 2: [[0.28, 0.28], [0.72, 0.72]], 3: [[0.26, 0.26], [0.5, 0.5], [0.74, 0.74]], 4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
        5: [[0.26, 0.26], [0.74, 0.26], [0.5, 0.5], [0.26, 0.74], [0.74, 0.74]], 6: [[0.28, 0.24], [0.72, 0.24], [0.28, 0.5], [0.72, 0.5], [0.28, 0.76], [0.72, 0.76]] }[n];
      P.forEach(([x, y]) => { g.fillStyle = n === 1 ? '#e5484d' : '#16191f'; g.beginPath(); g.arc(x * w, y * w, n === 1 ? 38 : 26, 0, 7); g.fill(); }); });
    const bigDie = grp(); bigDie.add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), [1, 6, 2, 5, 3, 4].map(n => new THREE.MeshStandardMaterial({ map: dieFace(n), roughness: 0.35 }))));
    bigDie.children[0].castShadow = true;
    const shards = grp(), shardM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35 }), dotM = new THREE.MeshStandardMaterial({ color: '#16191f', roughness: 0.4 });
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) { if (!x && !y && !z) continue;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), shardM); m.castShadow = true; m.userData.o = new THREE.Vector3(x, y, z); shards.add(m);
      if ((x + y + z) % 2 === 0) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), dotM); d.position.set(0, 0, 0.235); m.add(d); } }
    const cams = [0, 1, 2].map(() => new THREE.PerspectiveCamera(17, 1920 / 356, 0.1, 300));
    OP = { bigDie, shards, all, A, B, throne, hanA, hanB, hanC, hanD, trophy, bolt, beams, cards, mini, bookG, desk, chong, yuki, damo, cams, stage: document.querySelector('.stage') };
    all.forEach(g => { g.visible = false; });
    return OP;
  }
  function openReset(E) {
    const P = openAssets(E); P.all.forEach(g => { g.visible = false; }); P.stage.style.background = '';
  }
  // 横幅里的描边大字：深棕色粗描边 + 白色外圈（用一圈圈 text-shadow 叠出来）
  const RING = (r, c, n = 16) => Array.from({ length: n }, (_, k) => { const a = k / n * Math.PI * 2; return `${(Math.cos(a) * r).toFixed(1)}px ${(Math.sin(a) * r).toFixed(1)}px 0 ${c}`; }).join(',');
  const SLOG_SH = [RING(3, '#3b1d0e'), RING(6, '#3b1d0e'), RING(8, '#3b1d0e', 24), RING(11, '#ffffff', 28), '0 14px 0 rgba(0,0,0,.28)'].join(',');
  const T0 = { title: 15.6 };
  function opening(o, E) {
    const { V, seg, ease, easeOut, easeBack, win, top, cell } = E, P = openAssets(E), I = E.D.icons;
    const SAv = V(...SA), SBv = V(...SB);
    const show = (k, cls, html, a, x, y, extra = '') => E.show(k, cls, html, a, `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) ${extra}`);
    const scr = (cam, r, p) => { const v = p.clone().project(cam); return { x: r.x + (v.x + 1) / 2 * r.w, y: r.y + (1 - v.y) / 2 * r.h }; };
    const setCam = (cam, r, pos, look, fov) => { cam.aspect = r.w / r.h; cam.fov = fov; cam.position.copy(pos); cam.lookAt(look); cam.updateProjectionMatrix(); cam.updateMatrixWorld(true); };
    const tagHTML = (n, c, pre = '') => `<span style="--c:${c}">${pre ? `<em>${pre}</em>` : ''}${n}</span>`;
    // ---------- 横幅的位置：三条依次滑进来；9.4 秒起上两条滑走，第三条放大成全屏 ----------
    const slide = (a, dir) => (1 - easeOut(seg(o, a, a + 0.5))) * dir * 1960;
    const ex = ease(seg(o, 9.6, 10.4)), outL = ease(seg(o, 9.3, 9.9)) * -1960, outR = ease(seg(o, 9.3, 9.9)) * 1960;
    const R1 = { x: slide(0.15, -1) + outL, y: 0, w: 1920, h: 356 }, R2 = { x: slide(3.2, 1) + outR, y: 362, w: 1920, h: 356 };
    const R3 = { x: slide(6.2, -1), y: 724 * (1 - ex), w: 1920, h: 356 + 724 * ex };
    const full = o >= 10.4;
    P.stage.style.background = full ? '' : 'radial-gradient(1100px 760px at 10% 6%,rgba(236,114,17,.26),transparent 62%),radial-gradient(900px 640px at 80% 96%,rgba(140,79,255,.22),transparent 64%),linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px) 0 0/40px 40px,linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px) 0 0/40px 40px,#0b111c';
    E.show('oflash', 'oflash', '', 1 - seg(o, 0, 0.4), 'none');
    // 「云上危机 · 拯救行动」任务界面：屏幕四角框线 + 扫描线 + 左上角任务名、右上角任务阶段
    const stageName = o < 3.1 ? '情报 01 · 人物档案' : o < 6.1 ? '情报 02 · 起源' : o < 10.4 ? '警报 · 威胁出现' : o < 13.4 ? '集结 · 拯救小队' : o < T0.title ? '出击 · 任务开始' : '任务代号 · 云上大亨';
    E.show('hudf', 'hudf', `<i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c4"></i><b class="tl"><s></s>云上危机 · 拯救行动</b><b class="tr">${stageName}</b>`, seg(o, 0.2, 0.5) * (1 - seg(o, OPENL - 0.5, OPENL - 0.2)), 'none');
    E.show('scan', 'scan', '', 0.55 * (1 - seg(o, OPENL - 0.5, OPENL - 0.2)), 'none');
    const glitch = (t0) => { const u = seg(o, t0, t0 + 0.28); return u > 0 && u < 1 ? `translateX(${(Math.sin(o * 173) * 9 * (1 - u)).toFixed(1)}px)` : ''; };
    if (!full) E.show('bsep', 'bsep', '<i style="top:351px"></i><i style="top:713px"></i>', 1 - seg(o, 9.3, 9.6), 'none');

    // ---------- ① 传说 ----------
    if (o < 10.0) {
      P.A.visible = true; const c = P.cams[0];
      setCam(c, R1, SAv.clone().add(V(-1.2, 1.55, 8.0)), SAv.clone().add(V(-1.2, 1.4, 0)), 19);
      const h = P.hanA; h.g.rotation.y = 0.25;
      const wave = Math.sin(o * 9) * 0.35;
      h.pose({ t: o, armR: [0.3, 2.3 + wave], armL: [0.2, 0.5], mouth: o > 1.0 ? 'grin' : 'smile', head: [0, 0.15, Math.sin(o * 3) * 0.05], bounce: Math.abs(Math.sin(o * 4.5)) * 0.04 });
      P.beams.forEach((b, k) => { b.material.opacity = (k ? 0.08 : 0.13) * (0.8 + 0.2 * Math.sin(o * 3 + k)); b.rotation.z = Math.sin(o * 0.9 + k * 2) * 0.12; });
      const nt = scr(c, R1, SAv.clone().add(V(-6.05, 1.0, 0.9)));
      show('ntA', 'ctag', tagHTML('韩叔', '#e5484d'), seg(o, 0.6, 0.9) * (1 - seg(o, 9.3, 9.5)), nt.x, nt.y, 'translate(-100%,-50%)');
      const rows = [['users', 'User Group 讲师'], ['training', '多年云计算经验'], ['ec2', 'Homelab 发烧友']]
        .map(([ic, tx], k) => `<li style="opacity:${seg(o, 1.0 + k * 0.28, 1.2 + k * 0.28).toFixed(2)};transform:translateX(${((1 - easeOut(seg(o, 1.0 + k * 0.28, 1.3 + k * 0.28))) * -24).toFixed(0)}px)"><img src="${I[ic]}">${tx}</li>`).join('');
      const stamp = easeBack(seg(o, 2.5, 2.8));
      show('dos', 'dossier hudp', `<div class="dh"><b>人物档案</b><em>FILE · 001</em></div><div class="dn">韩叔</div><ul>${rows}</ul><div class="stamp" style="opacity:${seg(o, 2.5, 2.6).toFixed(2)};transform:rotate(-14deg) scale(${(2.2 - 1.2 * stamp).toFixed(3)})">S 级</div>`, seg(o, 0.75, 1.0), R1.x + 500, 26, '');
      show('sl1', 'slog', '<small>传说中的</small><em>韩叔</em>', seg(o, 0.7, 0.9), R1.x + 1270, 150, `scale(${(0.5 + 0.5 * easeBack(seg(o, 0.7, 1.05))).toFixed(3)}) ${glitch(0.7)}`);
    }
    // ---------- ② 著书 ----------
    if (o >= 3.1 && o < 10.0) {
      P.B.visible = true; const c = P.cams[1];
      setCam(c, R2, SBv.clone().add(V(1.2, 2.9, 7.6)), SBv.clone().add(V(1.2, 1.0, 0)), 20);
      const h = P.hanB, wr = Math.sin(o * 14) * 0.12; h.g.rotation.y = 0.35;
      h.pose({ t: o, armR: [1.0 + wr, 0.25], armL: [0.8, 0.15], head: [0.25, 0.2, 0], mouth: 'smile', brow: -0.05 });
      P.cards.forEach((m, k) => { const t0 = 3.8 + k * 0.17, u = seg(o, t0, t0 + 0.6); m.visible = u > 0 && u < 1;
        const a = V(-1.25, 1.0, 0.1), b = V(1.3 + ((k % 5) - 2) * 0.25, 1.02, 0.15 + ((k % 3) - 1) * 0.2), p = a.clone().lerp(b, easeOut(u)); p.y += Math.sin(Math.PI * u) * 1.1;
        m.position.copy(p); m.rotation.set(-Math.PI / 2 * u + Math.sin(u * 9 + k) * 0.6, u * 6 + k, 0); m.scale.setScalar(1 - Math.pow(u, 6)); });
      const nt = scr(c, R2, SBv.clone().add(V(-3.6, 1.3, -0.35)));
      show('ntB', 'ctag', tagHTML('韩叔', '#e5484d'), seg(o, 3.6, 3.9) * (1 - seg(o, 9.3, 9.5)), nt.x, nt.y, 'translate(-100%,-50%)');
      const mp = scr(c, R2, SBv.clone().add(V(1.1, 1.25, 0.35)));
      [['真实', '云服务'], ['两种', '卡牌'], ['认证', '知识题']].forEach(([n, l], k) => { const t0 = 4.3 + k * 0.45, a = easeBack(seg(o, t0, t0 + 0.35));
        show('ct' + k, 'cnt hudp', `<em>情报 0${k + 1}</em><b>${n}</b>${l}`, Math.min(1, seg(o, t0, t0 + 0.2)), mp.x - 420 + k * 230, R2.y + 36 - Math.sin(Math.PI * seg(o, t0, t0 + 0.35)) * 10, `scale(${(0.4 + 0.6 * a).toFixed(3)})`); });
      show('sl2', 'slog', '<div style="font-size:68px">把毕生所学<br>写进了一张棋盘：<br><em>云上大亨</em></div>', seg(o, 3.7, 3.9), R2.x + 1290, R2.y + 70, `scale(${(0.5 + 0.5 * easeBack(seg(o, 3.7, 4.05))).toFixed(3)}) ${glitch(3.7)}`);   // 句子按 promo_open 改成「写进了一张棋盘：云上大亨」以后变长：分三行、字号 84 → 68，第二行不出画、不压左边的情报 03
    }
    // ---------- ③ 黑化：金币山上的王座、墨镜金链子、奖杯；闪电劈在旁边空地上 ----------
    if (o >= 6.1) {
      P.throne.visible = true;
      const dark = o >= 6.95, h = dark ? P.hanD : P.hanC; P.hanC.g.visible = !dark; P.hanD.g.visible = dark;
      const pf = Math.sin(Math.PI * seg(o, 6.8, 7.1));
      h.g.scale.set(1 + pf * 0.25, 1 - pf * 0.2, 1 + pf * 0.25);
      const gloat = o > 8.6 && o < 17.0;
      h.pose({ t: o, armL: [0.95, 0.05], armR: [0.95, 0.05], mouth: dark ? (gloat || full ? 'grin' : 'smirk') : 'o', brow: dark ? 0.32 : -0.1, head: [dark ? -0.08 : 0, 0, dark ? Math.sin(o * 6) * 0.06 : 0], bounce: dark && (gloat || full) ? Math.abs(Math.sin(o * 12)) * 0.025 : 0 });
      h.legs.forEach(L => { L.rotation.x = -1.45; });
      P.trophy.position.set(0, 0.88, 0.62); P.trophy.scale.setScalar(0.95); P.trophy.rotation.y = Math.sin(o * 2) * 0.2;
      if (dark && h.shades) h.shades.position.y = (1 - easeOut(seg(o, 6.95, 7.25))) * 0.7;
      // 黑化那一下冒一团紫烟；纸醉金迷：金币哗哗往金币山上掉
      if (o >= 6.85 && o < 7.6) for (let k = 0; k < 14; k++) { const u = seg(o, 6.85, 7.6), a = k * 2.4; E.bit(V(Math.cos(a) * (0.4 + u * 1.2), 1.4 + Math.sin(k) * 0.5 + u * 0.8, -0.9 + Math.sin(a) * (0.4 + u * 1.0)), '#6b2fb3', 0.22 * (1 - u)); }
      if (o < 10.4) [[-1.4, 0.4], [1.3, 0.9], [-0.6, 1.5], [0.9, 2.1], [-1.1, 2.7]].forEach(([x, d]) => E.coinFly(o, 7.0 + d, 0.9, V(x * 2, 7, -0.9 - x), V(x * 0.8, 0.45, -0.9 + x * 0.3), 6, 0.6));
      const red = (0.35 + 0.25 * Math.sin(o * 11)) * seg(o, 6.95, 7.1) * (1 - seg(o, 10.4, 11.2)); if (red > 0.01) for (let i = 0; i < 48; i++) E.impaired(i, red * 0.6);   // 警报：棋盘一闪一闪泛红
      const strike = o >= 7.6 && (o < 7.72 || (o >= 7.78 && o < 7.86));
      P.bolt.visible = strike;
      if (o >= 7.6 && o < 8.6) { const u = seg(o, 7.6, 8.5); E.shockwave('olt', 2.3, 0.6, 0.3 + u * 3.5, 0.9 * (1 - u), 0x9fc7ff); }
      E.show('ofl2', 'oflash', '', strike ? 0.35 : 0, 'none');
      if (!full) {
        const c = P.cams[2], camP = V(3.2, 1.75, 7.6).lerp(V(-1.2, 4.6, 13.2), ex), look = V(3.2, 1.35, -0.9).lerp(V(-1.0, 1.1, 0.6), ex);
        setCam(c, R3, camP, look, 20 + 15 * ex);
        const hp = scr(c, R3, V(0.5, 2.05, -0.85));
        show('bub', 'bubble hudp', '想拿奖杯？<br>先在我的棋盘上赢我！', seg(o, 7.95, 8.2) * (1 - seg(o, 9.4, 9.7)), hp.x + 70, hp.y, `translate(0,-50%) scale(${(0.5 + 0.5 * easeBack(seg(o, 7.95, 8.3))).toFixed(3)})`);
        show('sl3', 'slog', '<small>第一代云上大亨</small>韩叔<em>黑化</em>了！', seg(o, 7.15, 7.35) * (1 - seg(o, 9.4, 9.7)), R3.x + 1290, R3.y + 70, `scale(${(0.5 + 0.5 * easeBack(seg(o, 7.15, 7.5))).toFixed(3)}) ${glitch(7.15)}`);
        show('thr', 'threat', '<b>警报</b>威胁等级 <i>★★★★★</i>', seg(o, 6.95, 7.1) * (1 - seg(o, 9.4, 9.7)) * (o < 8.0 ? (Math.sin(o * 14) > -0.3 ? 1 : 0.35) : 1), R3.x + 1290, R3.y + 26);
        E.show('alarm3', 'alarm', '', (0.28 + 0.22 * Math.sin(o * 11)) * seg(o, 6.95, 7.1) * (1 - seg(o, 9.4, 9.8)), `translate(${R3.x.toFixed(0)}px,${R3.y.toFixed(0)}px)`);
        show('sl3b', 'slogsub', '纸醉金迷，用钱买走了 User Group 冠军奖杯', seg(o, 7.5, 7.7) * (1 - seg(o, 9.4, 9.7)), R3.x + 1290, R3.y + 240);
      }
    }
    // ---------- 全屏：④ 立志赚钱（云服务行情）→ ⑤ 一拳超人带队 → 大标题 → 一拳打碎大骰子，接正片 ----------
    const C3 = V(-3.4, -0.04, 3.1), Y3 = V(-1.6, -0.04, 3.5), D3 = V(-2.5, -0.04, 4.6), PUNCH = V(-6.2, 0.22, 5.2);
    const T = { run0: 10.5, cheer: 11.5, mkt: 11.2, mktOut: 13.3, fall: 13.5, land: 13.95, sl5: 14.1, sl5Out: 15.4, title: 15.6, titleOut: 17.9, walk: 17.6, walkEnd: 18.7, die: 17.7, jump: 19.0, SH: 19.37, dice: 19.4, poof: 19.45 };
    if (o >= 10.0) {
      const runIn = (c, from, to, t0, t1, face) => { const u = seg(o, t0, t1), p = from.clone().lerp(to, u); c.g.visible = true; c.g.position.copy(p); c.g.rotation.y = u < 1 ? Math.atan2(to.x - from.x, to.z - from.z) : face; return u < 1; };
      const rc = runIn(P.chong, V(-12, -0.04, 2.4), C3, T.run0, T.run0 + 0.9, 0.35), ry = runIn(P.yuki, V(-12.8, -0.04, 3.6), Y3, T.run0 + 0.15, T.run0 + 1.1, 0.15);
      const pump = k => Math.max(0, Math.sin((o - T.cheer) * 7 + k)) * seg(o, T.cheer, T.cheer + 0.2) * (1 - seg(o, 13.2, 13.5));
      const cheer = seg(o, 14.0, 14.2) * (1 - seg(o, 15.4, 15.6));
      P.chong.pose({ t: o, walk: rc ? 1 : 0, speed: 13, armL: [0, 0.2 + cheer * 2.2], armR: [0, 0.2 + Math.max(cheer * 2.4, pump(0) * 2.6)], mouth: pump(0) || cheer ? 'grin' : 'smile', brow: 0.25, bounce: (cheer + pump(0)) * 0.08 });
      P.yuki.pose({ t: o + 0.3, walk: ry ? 1 : 0, speed: 13, armL: [0, 0.2 + cheer * 2.2], armR: [0, 0.2 + Math.max(cheer * 2.6, pump(1.5) * 2.6)], mouth: pump(1.5) || cheer ? 'grin' : 'smile', brow: 0.25, bounce: (cheer + pump(1.5)) * 0.08 });
      // ④ 云服务行情（对应参考图的股票表）：买下 / 卖回
      const rows = [['ec2', 'EC2', '按小时'], ['lambda', 'Lambda', '按量'], ['s3', 'S3', '按量'], ['rds', 'RDS', '按小时']].map(([ic, n, b], k) => { const sq = E.D.sq.find(x => x.n === n), on = o >= 11.7 + k * 0.28;
        return `<tr class="${on ? 'on' : ''}${on && o < 11.98 + k * 0.28 ? ' hit' : ''}"><td><img src="${I[ic]}">${n}</td><td>$${sq ? sq.p : '—'}</td><td>${b}</td><td class="up">${on ? '▲ 收过路费' : ''}</td></tr>`; }).join('');
      const ma = seg(o, T.mkt, T.mkt + 0.35) * (1 - seg(o, T.mktOut, T.mktOut + 0.3));
      E.show('mkt', 'mkt hudp', `<div class="mh"><em>补给站</em><b>云服务行情</b><span class="buy">买下</span><span class="sell">卖回</span></div><table><tr><th>服务</th><th>买价</th><th>计费方式</th><th></th></tr>${rows}</table>`, ma, `translateX(${((1 - easeOut(seg(o, T.mkt, T.mkt + 0.4))) * 120).toFixed(0)}px)`);
      E.show('sl4', 'slog sl4', '立志<em>赚钱</em><br>把奖杯抢回来！', seg(o, T.mkt + 0.1, T.mkt + 0.3) * (1 - seg(o, T.mktOut, T.mktOut + 0.3)), `scale(${(0.5 + 0.5 * easeBack(seg(o, T.mkt + 0.1, T.mkt + 0.45))).toFixed(3)})`);
      if (o >= 12.0 && o < 13.4) [[19, 0], [7, 0.25], [1, 0.5], [10, 0.75]].forEach(([i, d], n) => E.coinFly(o, 12.0 + d, 0.6, top(i).add(V(0, 0.4, 0)), (n % 2 ? Y3 : C3).clone().add(V(0, 1.2, 0)), 6, 1.2));
      // ⑤ Damo：从天而降，落地砸出冲击波；之后走到棋盘左前方，跳起来一拳打碎大骰子
      const d = P.damo; d.g.visible = o >= T.fall;
      const fall = seg(o, T.fall, T.land), land = o >= T.land, walkTo = seg(o, T.walk, T.walkEnd), jump = seg(o, T.jump, T.jump + 0.65);
      const pos = D3.clone(); pos.y += (1 - fall * fall) * 9;
      if (walkTo > 0) pos.lerp(PUNCH, ease(walkTo)); pos.y += Math.sin(Math.PI * jump) * 0.75;
      d.g.position.copy(pos); d.g.rotation.y = walkTo > 0 && walkTo < 1 ? Math.atan2(PUNCH.x - D3.x, PUNCH.z - D3.z) : walkTo >= 1 ? 2.39 : 0.2;
      const sq = Math.sin(Math.PI * seg(o, T.land, T.land + 0.2)) * 0.25, punch = easeOut(seg(o, T.SH - 0.09, T.SH + 0.03)) * (1 - seg(o, T.SH + 0.2, T.SH + 0.4));
      const raise = o > T.land + 0.3 && o < T.walk ? 2.6 : 0;
      d.pose({ t: o, walk: walkTo > 0 && walkTo < 1 ? 1 : 0, speed: 12, squash: sq, armR: [punch * 1.65 + (land && o < T.walk ? 0.2 : 0), 0.15 + raise], armL: [0, 0.25], mouth: 'flat', cape: (1 - fall) * 0.6 + jump * 0.5, lean: punch * 0.3 });
      if (land && o < T.land + 1.1) { const u = seg(o, T.land, T.land + 0.95); E.shockwave('dland', D3.x, D3.z, 0.3 + u * 6, 0.9 * (1 - u), 0xffb020);
        for (let i = 0; i < 48; i++) { const c = cell(i), w = Math.hypot(c.x - D3.x, c.z - D3.z) - (o - T.land) * 12, hh = 0.35 * Math.exp(-w * w / 1.2) * (1 - u); if (hh > 0.003) E.lift(i, hh); } }
      { const cd = o >= 13.2 && o < 13.95 ? 3 - Math.floor((o - 13.2) / 0.25) : 0, cu = ((o - 13.2) % 0.25) / 0.25;
        E.show('cdown', 'cdown', cd > 0 ? `${cd}` : '<small>MISSION START</small>任务开始', o >= 13.2 && o < 14.35 ? (cd > 0 ? 1 - seg(cu, 0.75, 1) * 0.8 : 1 - seg(o, 14.15, 14.35)) : 0, `translate(-50%,-50%) scale(${(cd > 0 ? 1.6 - 0.6 * easeOut(Math.min(1, cu * 2)) : 0.8 + 0.2 * easeBack(seg(o, 13.95, 14.1))).toFixed(3)})`); }
      E.show('sl5', 'slog sl5', '人称「<em>一拳超人</em>」的 Damo 带队讨伐韩叔！', seg(o, T.sl5, T.sl5 + 0.2) * (1 - seg(o, T.sl5Out, T.sl5Out + 0.25)), `translateX(-50%) scale(${(0.5 + 0.5 * easeBack(seg(o, T.sl5, T.sl5 + 0.35))).toFixed(3)})`);
      E.show('sl5b', 'slogsub sl5b', '真实的云服务 · 真实的架构组合 · 认证知识题', seg(o, T.sl5 + 0.35, T.sl5 + 0.55) * (1 - seg(o, T.sl5Out, T.sl5Out + 0.25)), 'translateX(-50%)');
      // 大骰子：Damo 走过去的时候从天上掉下来，弹两下；一拳打碎，碎块四散，里面飞出正片的两颗骰子
      if (o >= T.die && o < T.SH) { const u = seg(o, T.die, T.die + 0.7), bb = Math.abs(Math.cos(u * Math.PI * 2.5)) * Math.pow(1 - u, 1.7);
        P.bigDie.visible = true; P.bigDie.position.set(BIGD.x, BIGD.y + bb * 6, BIGD.z); P.bigDie.rotation.set(0.12 * (1 - u), 0.5 + (1 - u) * 2, 0); const sq2 = u >= 1 ? 0 : (bb < 0.05 ? 0.15 * (1 - u) : 0); P.bigDie.scale.set(1 + sq2, 1 - sq2, 1 + sq2);
        if (o >= T.SH - 0.22) P.bigDie.position.x += Math.sin(o * 90) * 0.03; }
      if (o >= T.SH) { const tau = o - T.SH, k = 1 - seg(o, T.SH + 0.25, T.SH + 0.43); P.shards.visible = k > 0;
        P.shards.children.forEach((m, i) => { const dd = m.userData.o, v = dd.clone().normalize().multiplyScalar(3.5 + (i % 5) * 0.5).add(V(1.6, 2.2, -1.7));
          m.position.set(BIGD.x + dd.x * 0.5 + v.x * tau, BIGD.y + dd.y * 0.5 + v.y * tau - 4.9 * tau * tau, BIGD.z + dd.z * 0.5 + v.z * tau); m.rotation.set(tau * (6 + i), tau * (4 + i % 3), 0); m.scale.setScalar(Math.max(0.001, k)); });
        const u = seg(o, T.SH, T.SH + 0.4); E.shockwave('dsm', BIGD.x, BIGD.z, 0.4 + u * 4, 0.9 * (1 - u), 0xffb020);
        const q = BIGD.clone().add(V(0.4, 1.8, 0)).project(E.camera);
        E.show('pow', 'pow', '一拳！', Math.min(1, seg(o, T.SH, T.SH + 0.05)) * (1 - seg(o, T.SH + 0.33, T.SH + 0.43)), `translate(${((q.x + 1) / 2 * 1920).toFixed(0)}px,${((1 - q.y) / 2 * 1080).toFixed(0)}px) translate(-50%,-50%) rotate(-8deg) scale(${(0.4 + 0.6 * easeBack(seg(o, T.SH, T.SH + 0.18))).toFixed(3)})`); }
      if (o >= T.dice) E.dice(10.3 + (o - T.dice), 10.3, 12.0, [3, 5], V(-3.4, 0, 2.2), DFROM);
      // 进正片前：四个人「噗」地变成四颗棋子，各就各位（和正片 10.7 秒的位置一样）
      if (o >= T.poof) { [P.chong, P.yuki, P.damo, P.hanD].forEach(c => { c.g.scale.setScalar(Math.max(0.001, 1 - easeOut(seg(o, T.poof, T.poof + 0.28)))); });
        [C3, Y3, PUNCH, V(0, 0.6, -0.9)].forEach((p, k) => E.splash(o, T.poof, p.clone().add(V(0, 0.8, 0)), ['#2f7cf6', '#9b5cf6', '#1f9d55', '#e5484d'][k], 14));
        P.throne.scale.setScalar(Math.max(0.001, 1 - easeOut(seg(o, T.poof + 0.08, T.poof + 0.33))));
        [[0, 11], [1, 7], [2, 30], [3, 43]].forEach(([pl, at], k) => { const m = E.pawnAt(pl, at); m.scale.setScalar(Math.max(0.001, easeBack(seg(o, T.poof + 0.1 + k * 0.03, T.poof + 0.3 + k * 0.03)))); E.splash(o, T.poof + 0.1 + k * 0.03, top(at).add(V(0, 0.5, 0)), E.COLORS[pl], 8); }); }
      const tagAt = (k, c, n, a) => { if (!full) return; E.label('ot' + k, c.g.position.clone().add(V(0, 2.2 * c.g.scale.y, 0)), `<span>${n}</span>`, a, 'otag'); };
      tagAt('c', P.chong, '<em>队员</em>虫虫', seg(o, 11.0, 11.3) * (1 - seg(o, T.title - 0.2, T.title)));
      tagAt('y', P.yuki, '<em>队员</em>Yuki', seg(o, 11.2, 11.5) * (1 - seg(o, T.title - 0.2, T.title)));
      tagAt('d', P.damo, '<em>队长</em>Damo · 绰号「一拳超人」', seg(o, T.land + 0.1, T.land + 0.4) * (1 - seg(o, T.title - 0.2, T.title)));
      tagAt('h', P.hanD, '<em>目标</em>黑化韩叔', seg(o, 10.6, 10.9) * (1 - seg(o, T.sl5 - 0.2, T.sl5)));
      // 大标题砸下来
      E.show('otitle', 'otitle', `<div class="opcode">云上危机 · 拯救行动</div><h1><small>亚马逊云科技 User Group</small><span>云上大亨</span></h1><div class="slog osub">令人怀念的经典桌游玩法，<em>搬到云上</em></div>`, seg(o, T.title, T.title + 0.15) * (1 - seg(o, T.titleOut, T.titleOut + 0.4)), `translateX(-50%) scale(${(2.2 - 1.2 * easeBack(seg(o, T.title, T.title + 0.4))).toFixed(3)})`);
      if (full) {
        // 主镜头：最后一帧要和正片 10.7 秒的镜头一模一样
        E.camPath(10.7, [[10.0, [-4, 15, 17], [0, 0, 0.5]], [11.0, [-2.8, 8.2, 11.5], [-3.6, 0, 2.2]]]);
        const endP = E.camera.position.clone(), endL = endP.clone().add(E.camera.getWorldDirection(V(0, 0, 0)).multiplyScalar(10));
        const K = [[10.4, [-1.2, 4.6, 13.2], [-1.0, 1.1, 0.6]], [11.5, [-2.2, 3.9, 11.8], [-0.6, 1.15, 1.6]], [13.3, [-2.3, 4.1, 12.2], [-0.7, 1.2, 1.6]], [14.3, [-2.4, 4.8, 13.4], [-1.8, 1.2, 1.4]], [15.6, [-2.6, 6.2, 14.2], [-1.8, 2.9, 1.0]], [17.6, [-2.8, 6.4, 14.4], [-1.9, 2.9, 1.0]]];
        let k = 0; while (k < K.length - 2 && o > K[k + 1][0]) k++;
        const u = ease(seg(o, K[k][0], K[k + 1][0])), p1 = V(...K[k][1]).lerp(V(...K[k + 1][1]), u), l1 = V(...K[k][2]).lerp(V(...K[k + 1][2]), u), k2 = ease(seg(o, 17.6, OPENL));
        E.camera.position.copy(p1.lerp(endP, k2)); E.camera.lookAt(l1.lerp(endL, k2));
        const shake = (o >= T.land ? 0.14 * (1 - seg(o, T.land, T.land + 0.4)) : 0) + (o >= T.title ? 0.08 * (1 - seg(o, T.title, T.title + 0.35)) : 0) + (o >= T.SH ? 0.1 * (1 - seg(o, T.SH, T.SH + 0.3)) : 0);
        if (shake > 0) { E.camera.position.x += Math.sin(o * 61) * shake; E.camera.position.y += Math.cos(o * 47) * shake; }
      }
    }
    if (!full) E.views = [R1, R2, R3].map((r, k) => ({ ...r, cam: P.cams[k] })).filter((v, k) => (k === 0 && o < 10.0) || (k === 1 && o >= 3.1 && o < 10.0) || (k === 2 && o >= 6.1));
  }
})();
