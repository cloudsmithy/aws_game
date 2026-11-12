// 各模式玩法讲解的时间轴：数据驱动。讲解词（mexp_scripts/<模式>.json）每一句可以带一个 cue，写这句话念到时要出的画面；
// mexp_narrate.mjs 量出每句的起止时间，连同 cue 写进 data.json（这里是 D.explain）。这个文件只负责把 cue 摆到时间轴上。
// cue 里能写的：cam 镜头 · own 谁买下哪格（own0：开场就归他，和默认归属一起出现）· pawn 棋子走几步（同一句里的 upg、coin、lbl 等棋子走到再出）· dice 掷骰子（这句念完挪到中央面板右边停着；整片没有 dice 的模式也停在那里；diceAt [x, z, 大小] 可选，骰子落在哪儿，不写落在中央示意图前面；大小不写是 1）· coin 金币飞 · arc 架构光管 · imp 变 Impaired
// · shield 护盾（shieldLbl 可选，护盾上的标签文字，不写就是「免疫」）· lbl 格子上的标签（lblShort：这句念完就收） · upg 升级块 · card / cards 亮卡 · quiz / quizok 答题框 · speed 部署点数条 · ddos · row 右边要点卡加一行
// · dpark [x, z, 大小] 可选：从这句起骰子停到这里（离镜头近时可以缩小一点），到下一个写了 dpark 的句子为止（镜头转到别处、原来的停放点拍不到时用），不写一直停在 DPARK
window.PROMO_SCRIPT = {
  duration: window.PROMO_DATA.explain.duration,
  run(t, E) {
    const { V, win, seg, ease, easeOut, D, top, COLORS } = E;
    const I = D.icons, X = D.explain;
    // 片尾的特点标签：原来是格数 / 服务数 / 卡牌数 / 架构数 / 题数的数字条，游戏还会更新，改成不带数字的说法（promo.js、explain.js 同一组）
    const TAGS = [['真实云服务', ''], ['事件卡', ''], ['有效架构', ''], ['认证知识题', '']];
    const NAMES = ['韩叔', '虫虫', 'Damo', 'Yuki'];
    const segs = X.segs, last = segs[segs.length - 1];
    const cur = segs.find(s => t >= s.start && t < s.end) || last;
    // 每句的结束时间（下一句开始前）和所在段的结束时间
    const lines = segs.flatMap((s, si) => s.subs.map((u, k) => ({ ...u, si, k, sEnd: s.end, next: s.subs[k + 1] ? s.subs[k + 1].t0 : s.end })));
    const L = lines.filter(x => x.cue && Object.keys(x.cue).length);
    // 片尾的暗角（dim2）每帧先建好：从头顺着播时它要排在字幕前面，不然片尾两句字幕的左半边会被它压暗（explain.js 开场的 E.intro 也是先建 dim2）
    E.show('dim2', 'dim2', '', 0, 'none');

    // ---------- 镜头 ----------
    const PRE = {
      overview: [[0, 19, 17], [0, 0, 0.5]], left: [[-12.5, 9, 11], [-6.8, 0, 2.4]], right: [[12.5, 9, 6], [6.4, 0, -1]],
      bottom: [[1.5, 8, 13.5], [0, 0, 4.2]], center: [[0, 14, 14], [0, 0, 0]],
    };
    // 11/12：娱乐模式「02 一回合」的底边近景，顶上玩家栏压在中央「亚马逊云科技 User Group」那行字上。只给娱乐模式把看的点往里挪 0.7，
    // 整个画面往下沉一点，那行字落到玩家栏下面（玩家栏后面换成最上面一排格子）。完整局、地狱模式的 bottom 也有这个情况，没动，免得重录
    if (['party', 'full', 'hell'].includes(X.mode)) PRE.bottom = [[1.5, 8, 13.5], [0, 0, 3.5]];
    const pose = n => { if (PRE[n]) return PRE[n]; const m = /^tile:(\d+)$/.exec(n || ''); if (m) { const p = top(+m[1]); return [[p.x * 0.8, 7.5, p.z + 9], [p.x, 0, p.z]]; } return PRE.overview; };
    const kOv = Math.max(6.8, segs[0].end + 1.6);   // 片头的下降镜头落到全景
    const keys = [[0, [0, 30, 32], [0, 0, 0]], [Math.max(3.4, segs[0].end - 1.4), [0, 26, 28], [0, 0, 0]], [kOv, ...PRE.overview]];
    let lastPose = PRE.overview;
    const go = (at, p) => { const k0 = keys[keys.length - 1][0]; if (at - 0.9 > k0) keys.push([at - 0.9, ...lastPose]); keys.push([Math.max(at, k0 + 0.2), ...p]); lastPose = p; };
    segs.forEach((s, si) => {
      if (si === 0 || s.outro) return;
      const first = s.subs.find(u => u.cue && u.cue.cam);
      go(s.start + 0.9, pose(first ? first.cue.cam : 'overview'));
      s.subs.forEach(u => { if (u !== first && u.cue && u.cue.cam) go(u.t0 + 0.9, pose(u.cue.cam)); });
    });
    // 片尾 E.outro 从 outroAt − 0.8 起直接看向 (0, 0, 0)：前 0.9 秒先把看的点从当时机位（overview 是 (0, 0, 0.5)）慢慢挪过去，接片尾那一帧镜头不跳
    if (last.outro) go(last.start + 0.3 - 0.8, [lastPose[0], [0, 0, 0]]);
    E.camPath(t, keys.sort((a, b) => a[0] - b[0]));
    // 11/12：第一段一开场就换近景（只有标准局：「01 升级附加费」第一句是 bottom）。片头的下降镜头要到 segs[0].end + 1.6 才落到全景，
    // 上面的 go 只挤得出 0.2 秒，字幕出来一秒多以后才猛推过去。这种情况：关键帧不动，片头镜头照原样走到这段第一句字幕出来（PUSH.t0），
    // 从那一刻的位置和速度接一条 0.9 秒的曲线推到近景（和别的换机位一样长；PUSH.t0 以前一帧不变），一直停到原来那个近景关键帧（PUSH.tB，之后和原来一样）。
    // 看的点取视线和桌面（y = 0）的交点：所有机位看的点都在桌面上，算出来就是 camPath 里插出来的那个点。棋盘也提前落完，见下面「棋盘落成」
    const s1 = segs[1], c1 = s1 && !s1.outro ? s1.subs.find(u => u.cue && u.cue.cam) : null;
    const PUSH = c1 && c1.cue.cam !== 'overview' ? { t0: s1.subs[0].t0 - 0.05, t1: s1.subs[0].t0 + 0.85, tB: Math.max(s1.start + 0.9, kOv + 0.2), p: pose(c1.cue.cam) } : null;
    if (PUSH && t > PUSH.t0 && t < PUSH.tB) {
      const at = tt => { E.camPath(tt, keys); const c = E.camera, d = c.getWorldDirection(V(0, 0, 0)); return [c.position.clone(), c.position.clone().addScaledVector(d, -c.position.y / d.y)]; };
      const [p0, l0] = at(PUSH.t0), [pm, lm] = at(PUSH.t0 - 0.01), h = PUSH.t1 - PUSH.t0, u = Math.min(1, (t - PUSH.t0) / h);
      // 三次 Hermite：起点速度 = 原镜头在 PUSH.t0 的速度（和 0.01 秒前的位置差分），终点停稳
      const H01 = 3 * u * u - 2 * u * u * u, H10 = (u * u * u - 2 * u * u + u) * h / 0.01;
      const hm = (a, am, b) => a.clone().multiplyScalar(1 - H01).add(V(...b).multiplyScalar(H01)).add(a.clone().sub(am).multiplyScalar(H10));
      E.cam(hm(p0, pm, PUSH.p[0]), hm(l0, lm, PUSH.p[1]));
    }

    // ---------- 右边要点卡：这一段念到哪一句，就加到哪一行 ----------
    // 要先摆好（连同 E.view 把棋盘往左挪），下面的 3D 标签才按挪过以后的画面算位置、指得准；标签也躲开要点卡和顶上的章节牌、玩家栏
    if (!cur.hero && !cur.outro) E.safeT = 140;
    // 棋盘偏移：有要点卡的章节往左挪 300 px。前后两章一章有卡、一章没有时，在换章的 0.9 秒里（和镜头换机位同时）慢慢挪过去，不在一帧里横跳；
    // 前后两章都有卡就一直不动。片尾 E.outro 从当时的偏移接着挪（传 base）
    const VN = s => s && s.note && !s.outro ? 300 : 0;
    const vOff = tt => { const i = segs.findIndex(s => tt >= s.start && tt < s.end), s = segs[i < 0 ? segs.length - 1 : i], p = segs[segs.indexOf(s) - 1];
      return p && VN(p) !== VN(s) ? VN(p) + (VN(s) - VN(p)) * ease(seg(tt, s.start, s.start + 0.9)) : VN(s); };
    const outroV = last.outro ? last.start + 0.3 - 0.8 : Infinity, vo = vOff(t);
    if (vo && t < outroV) E.view(vo);
    if (cur.note && !cur.outro) {
      const rows = cur.subs.filter(u => u.cue && u.cue.row && t >= u.t0 - 0.1).map(u => `<li>${u.cue.row}</li>`).join('');
      const al = win(t, cur.start + 0.2, cur.end, 0.35, 0.3);
      const ne = E.show('note', 'note', `<h3>${cur.note.ic ? `<img src="${I[cur.note.ic] || I.reinvent}">` : ''}<span>${cur.note.title}</span></h3><ul>${rows}</ul>`, al, `translateX(${(1 - al) * 40}px)`);
      if (al > 0) { E.safeR = ne.offsetLeft - 12; E.safeRB = ne.offsetTop + ne.offsetHeight + 12; }
    }

    // ---------- 棋盘落成 ----------
    // 片头标题淡出以后棋盘才落下，免得字和棋盘叠在一起
    const B0 = segs[0].hero ? Math.max(3.4, segs[0].end - 1.4) : 3.4;
    // 第 i 格从 dropA(i) 落到 dropB(i)（48 格一共 3.05 秒）。有 PUSH 时整个落下按比例加快，在推镜头开始后 0.2 秒内全部落定：
    // 近景里看得到右边那排（39–47，最后落），推过去时还在往下掉就穿帮（标准局原来 11.5–11.9 秒近景里还有格子在掉）
    const DK = PUSH ? Math.min(1, (PUSH.t0 + 0.2 - (B0 + 0.5)) / 3.05) : 1;
    const dropA = i => B0 + 0.5 + i * 0.05 * DK, dropB = i => DK === 1 ? B0 + 1.2 + i * 0.05 : dropA(i) + 0.7 * DK;
    for (let i = 0; i < 48; i++) E.dropTile(i, seg(t, dropA(i), dropB(i)));
    if (t < B0) E.board.visible = false;
    E.board.position.y = -2 * (1 - easeOut(seg(t, B0, B0 + 0.9)));
    const outroAt = last.outro ? last.start + 0.3 : Infinity;

    // ---------- 归属：开局后场上先有几块有主的，再按 cue 慢慢变 ----------
    // 娱乐模式里 28 DMS、44 OpenSearch 是盲盒格，不会有主人，换成娱乐模式里还在的 30 WAF、42 ElastiCache；别的模式照旧
    const owners = {}, base = segs[1] ? segs[1].start : 5;
    const own0 = X.mode === 'party' ? { 2: 1, 35: 1, 30: 2, 16: 2, 25: 3, 40: 3, 42: 3, 32: 2 } : { 2: 1, 35: 1, 28: 2, 16: 2, 25: 3, 40: 3, 44: 3, 32: 2 };
    // 开场就有主的格子：等这一格落定（B0 + 1.2 + i × 0.05）再亮归属框，免得右边那排格子还没落下来，框先浮在半空
    const ob = i => Math.max(base, dropB(i));
    if (t >= base) for (const [i, p] of Object.entries(own0)) owners[i] = [p, seg(t, ob(+i), ob(+i) + 0.5)];
    L.forEach(x => { if (x.cue.own0 && t >= base) for (const [i, p] of Object.entries(x.cue.own0)) owners[i] = [p, seg(t, ob(+i), ob(+i) + 0.5)]; });
    L.forEach(x => { if (x.cue.own && t >= x.t0) for (const [i, p] of Object.entries(x.cue.own)) owners[i] = [p, seg(t, x.t0 + 0.2, x.t0 + 0.7)]; });
    if (t < outroAt) for (const [i, [p, k]] of Object.entries(owners)) E.own(+i, p, k);

    // ---------- 棋子 ----------
    // Yuki 默认站 27 号 re:Invent 格（站 17 号会压住 SageMaker AI 的名字）
    const pos = [0, 6, 3, 27];
    // 谁有 pawn cue，开场就站在他第一条 pawn 的起点（免得念到那句时从默认位置瞬移过去）
    const pf = {}; L.forEach(x => { if (x.cue.pawn && pf[x.cue.pawn[0]] == null) pf[x.cue.pawn[0]] = x.cue.pawn[1]; });
    for (const [p, f] of Object.entries(pf)) pos[p] = f;
    L.forEach(x => { if (x.cue.pawn && t >= x.t0) { const [p, from, n] = x.cue.pawn, s0 = (t - x.t0 - 0.4) / 0.22, k = Math.floor(s0); pos[p] = from + (s0 < 0 ? 0 : Math.min(n, k + ease(s0 - k))); } });
    if (t >= base && t < outroAt) pos.forEach((v, p) => E.pawnAt(p, v));

    // ---------- 每句的画面 ----------
    let speedHtml = '', quizHtml = '', quizA = 0;
    // 骰子常驻：掷完这一句停在原位，念完缩没，挪到中央面板右边的空白处停着（「亚马逊云科技 User Group」那行字右边、VPC 框上面，
    // 不压中央示意图的图标，也离顶上那排格子远一点）；整片没有掷骰子的模式，棋盘落好以后就停在那里。片尾前收起
    const DPARK = V(4.9, 0, -1.9), dOut = Number.isFinite(outroAt) ? 1 - seg(t, outroAt - 0.3, outroAt) : 1;
    // 停放点：写了 dpark 的句子开始前 0.5 秒在旧位置缩没，镜头转好（开始后 0.5 秒）在新位置长出来；没写 dpark 的模式一直是 DPARK、系数 1
    const parks = [[-Infinity, DPARK, 1], ...L.filter(x => x.cue.dpark).map(x => [x.t0, V(x.cue.dpark[0], 0, x.cue.dpark[1]), x.cue.dpark[2] || 1])];
    const parkAt = tt => { let k = 0; while (k + 1 < parks.length && tt >= parks[k + 1][0]) k++; const [tc, p, sc] = parks[k], nx = parks[k + 1];
      return [p, (Number.isFinite(tc) ? easeOut(seg(tt, tc + 0.5, tc + 0.85)) : 1) * (nx ? 1 - ease(seg(tt, nx[0] - 0.5, nx[0] - 0.2)) : 1) * sc, sc]; };
    const [dP, dK] = parkAt(t);
    const dIn = Math.max(base, B0 + 3.6);   // 没掷骰子的模式：等 48 格都落定再出来
    if (!L.some(x => x.cue.dice) && t >= dIn) E.dice(t, dIn - 1, dIn - 0.5, [4, 6], dP, null, easeOut(seg(t, dIn, dIn + 0.35)) * dOut * dK);
    // 11/12：变 Impaired 的格子上站着棋子时（入门局：虫虫付完过路费一直站在 10 号 RDS 上），棋子挡住格子的图标和名字，标签又正好指在棋子头上：
    // 标签写上服务名，锚点挪到格子上没站棋子的那一半（棋子站在格子右半边就往左挪，PX 是 pawnAt 里每人的 x 偏移）。格子上没棋子的照旧
    const PX = [-0.18, 0.18, 0.18, -0.18], onIt = i => pos.findIndex(v => Number.isInteger(v) && ((v % 48) + 48) % 48 === i);
    L.forEach((x, n) => {
      const c = x.cue, t0 = x.t0, end = x.sEnd, a = win(t, t0, end, 0.3, 0.3);
      // 这句有棋子走：升级、金币、标签等棋子走到（ta）再出
      const ta = c.pawn ? t0 + 0.4 + c.pawn[2] * 0.22 + 0.1 : t0;
      if (c.dice) {
        // 落点就是念完以后的停放点（diceAt 和 dpark 写成一样）：原地停着，不缩没再长出来
        const dA = c.diceAt ? V(c.diceAt[0], 0, c.diceAt[1]) : V(0.3, 0, 2.2), dS = c.diceAt && c.diceAt[2] || 1, pn = parkAt(x.next), stay = dA.distanceTo(pn[0]) < 0.01 && dS === pn[2];
        if (t < x.next) E.dice(t, t0 + 0.1, t0 + 1.4, c.dice, dA, null, (stay ? 1 : 1 - ease(seg(t, x.next - 0.3, x.next))) * dS);
        else E.dice(t, t0 + 0.1, t0 + 1.4, c.dice, dP, null, (stay ? 1 : easeOut(seg(t, x.next, x.next + 0.35))) * dOut * dK);
      }
      if (c.upg && t >= ta) E.upgrade(c.upg[0], c.upg[1], c.upg[2], seg(t, ta + 0.3, ta + 0.7));
      if (c.coin && t >= ta && t < ta + 2.4) E.coinFly(t, ta + 0.3, 0.9, top(c.coin[0]).add(V(0, 0.6, 0)), top(c.coin[1]).add(V(0, 0.6, 0)), c.coin[2] || 10, 2.4);
      if (c.burst != null && t >= t0 && t < t0 + 3) E.coinBurst(t, t0 + 0.2, top(c.burst).add(V(0, 1.2, 0)), 60);
      if (c.arc && t >= t0 && t < end) {
        const P = c.arc.map(i => top(i).add(V(0, 0.3, 0))), pts = [P[0]];
        for (let k = 1; k < P.length; k++) pts.push(P[k - 1].clone().lerp(P[k], 0.5).add(V(0, 1.2 + k * 0.4, 0)), P[k]);
        E.arc(t, 'arc' + n, pts, seg(t, t0 + 0.2, t0 + 1.6));
      }
      if (c.imp && t >= t0 && t < end) c.imp.forEach(i => { E.impaired(i, seg(t, t0 + 0.3, t0 + 0.8) * (1 - seg(t, end - 0.4, end))); const pw = onIt(i);
        E.label('imp' + n + i, V(top(i).x - (pw < 0 ? 0 : Math.sign(PX[pw]) * 0.26), 0.95, top(i).z), pw < 0 ? 'Impaired' : `<b>${D.sq[i].n.replace('Amazon ', '')}</b> Impaired`, a, 'warn sm'); });
      if (c.shield != null && t >= t0 && t < end) { E.shield(c.shield, seg(t, t0 + 0.3, t0 + 0.9) * (1 - seg(t, end - 0.4, end))); E.label('sh' + n, V(top(c.shield).x, 2.0, top(c.shield).z), `<img src="${I.region}"><span>${c.shieldLbl || '<b>免疫</b>'}</span>`, win(t, c.cam ? t0 + 0.9 : t0 + 0.5, end, 0.3, 0.3), 'ok'); }   // 这句换了机位：标签等镜头到位（t0 + 0.9）再出，不在镜头移动时从别的东西上滑过
      if (c.lbl && t >= ta) {
        // 同一段里同一格的下一个标签出来时，这个就收起来
        // lblShort：这句念完就收起（下一句要在旁边出别的标签时用）
        const nx = L.find(y => y.si === x.si && y.t0 > t0 && y.cue.lbl && y.cue.lbl[0] === c.lbl[0]), e2 = c.lblShort ? x.next : nx ? nx.t0 : end;
        // 11/12：同一段里这一格还挂着「Impaired」标签（标准局技术债：28 号 DMS）：锚点从 1.5 抬到 1.9，引线和光点落在 Impaired 标签上面，不压它的字
        const hy = L.some(y => y.si === x.si && y.cue.imp && y.cue.imp.includes(c.lbl[0])) ? 1.9 : 1.5;
        E.label('l' + n, V(top(c.lbl[0]).x, hy, top(c.lbl[0]).z), `<span>${c.lbl[1]}</span>`, win(t, ta + 0.3, e2, 0.3, 0.25), c.lbl[2] || 'org');
      }
      if (c.card && t >= t0 && t < x.next + 0.8) {
        const info = D.cardsByName[c.card]; if (info) { const inK = easeOut(seg(t, t0, t0 + 0.6)), out = ease(seg(t, x.next + 0.2, x.next + 0.8)); E.card('c' + n, info, { y: -6 * (1 - inK) + out * 7, flip: ease(seg(t, t0 + 0.2, t0 + 1.0)), rot: (1 - inK) * 0.25, s: 0.95 }); }
      }
      if (c.cards && t >= t0 && t < end) c.cards.forEach((nmc, j) => {
        const info = D.cardsByName[nmc]; if (!info) return;
        const N = c.cards.length, aa = t0 + j * 0.18, k = easeOut(seg(t, aa, aa + 0.55)), out = ease(seg(t, end - 0.6, end));
        if (t >= aa) E.card('cs' + n + '_' + j, info, { x: (j - (N - 1) / 2) * 2.1, y: -6.5 * (1 - k) - 0.35 - out * 6, flip: ease(seg(t, aa + 0.25, aa + 0.75)), rot: (j - (N - 1) / 2) * -0.07, s: N > 3 ? 0.62 : 0.72, z: -9 });
      });
      if (c.speed && t >= t0 && t < end) {
        // 同一段里发动了 ddos：红线打到目标那一刻（t0 + 0.8）点数花掉，归零
        const dx = L.find(y => y.si === x.si && y.cue.ddos), spent = dx && t >= dx.t0 + 0.8;
        const sp = spent ? 0 : Math.min(c.speed, Math.floor(seg(t, t0 + 0.2, Math.min(x.next, t0 + 1.8)) * (c.speed + 0.99)));
        speedHtml = `<div class="sh"><i style="background:${COLORS[0]}">1</i>${NAMES[0]} · 部署点数 <b>${sp} / 12</b></div><div class="sc">${Array.from({ length: 12 }, (_, k) => `<span class="${k < sp ? 'on' : ''}${k === 11 && sp === 12 ? ' max' : ''}"></span>`).join('')}</div><div class="sk">${spent ? '花掉 12 点：DDoS（重）' : sp >= 12 ? '<b>12 点：DDoS（重）</b>' : sp >= 6 ? '6 点：DDoS（轻）' : '每回合 +1'}</div>`;
        quizA = Math.max(quizA, a);
      }
      if (c.ddos && t >= t0 && t < end) {
        const PA = top(c.ddos[0]).add(V(0, 0.9, 0)), PB = top(c.ddos[1]).add(V(0, 0.3, 0));
        // 红线打到以后，下一句开始时收回去（目标照样下线到段末）
        E.arc(t, 'ddos' + n, [PA, PA.clone().lerp(PB, 0.5).add(V(0, 3.2, 0)), PB], seg(t, t0 + 0.2, t0 + 0.8) * (1 - seg(t, x.next - 0.1, x.next + 0.3)), 0xff3b30);
        const off = seg(t, t0 + 0.8, t0 + 1.1) * (1 - seg(t, end - 0.4, end)); if (off > 0) E.impaired(c.ddos[1], off * (0.75 + 0.25 * Math.sin(t * 30)));
      }
      if (c.quiz && t >= t0 && t < end) {
        // quiz: 'clf' 时出云从业者题库里的题（mexp_build.mjs 传 D.quizBank，表头照游戏写「CLF-C02 · 考点」）；写 1 照旧出存储组题
        const qb = c.quiz === 'clf' && D.quizBank, q = qb || D.quiz, order = [2, 0, 3, 1].filter(j => q.o[j] != null), okL = L.find(y => y.si === x.si && y.cue.quizok), ok = t >= (okL ? okL.t0 : x.next);
        quizHtml = `<div class="qh"><img src="${qb ? I[qb.icon] || I.s3 : I.s3}">${qb ? qb.head : '边玩边答题 · 存储组'}<span>${NAMES[0]} 付过路费前</span></div><p>${q.q}</p>${order.map((j, k) => `<div class="qo${ok && j === 0 ? ' ok' : ''}${ok && j !== 0 ? ' dim' : ''}"><b>${'ABCD'[k]}</b>${q.o[j]}</div>`).join('')}${ok ? `<div class="qa">答对了 · ${q.a || ''}</div>` : ''}`;
      }
    });
    if (speedHtml) E.show('speed', 'speed', speedHtml, win(t, L.find(x => x.cue.speed).t0, L.find(x => x.cue.speed).sEnd, 0.3, 0.3), 'translateY(80px)');   // 往下挪，让开左上角的章节标签和玩家栏
    // 答题框：答对那一句念完（下一句开始）就收起，下一句讲的是别的情况
    if (quizHtml) { const qx = L.find(x => x.cue.quiz), okL = L.find(y => y.si === qx.si && y.cue.quizok), qEnd = okL ? okL.next : qx.sEnd; E.show('quiz', 'xquiz', quizHtml, win(t, qx.t0, qEnd, 0.35, 0.35), `translateY(0)`); }

    // ---------- 片头 ----------
    const s0 = segs[0];
    if (s0.hero) E.show('hero', 'hero', `<div class="eyebrow"><img src="${I.reinvent}"> ${X.badge || 'BOARD GAME · 云上创业'}</div><h1><small>亚马逊云科技 User Group</small><span>云上大亨</span></h1><div class="mtag">${X.name} · 玩法讲解</div>`, win(t, 0.2, B0, 0.8, 0.5));   // 棋盘出现（B0）之前淡完，不和棋盘叠在一起

    // ---------- 片尾 ----------
    if (last.outro && t >= outroAt - 0.8) E.outro(t, outroAt, `<div class="eyebrow"><img src="${I.reinvent}"> ${X.badge || 'BOARD GAME'}</div><h1><small>亚马逊云科技 User Group</small><span>云上大亨</span></h1><div class="mtag">${X.name}</div><p class="msub">网页版、实体版规则一样，选好「${X.name}」就可以开玩</p><p class="foot">作者：亚马逊云科技 User Group · 云上大亨开发小组<br>项目地址：github.com/cloudsmithy/aws_game<br>问题和建议：github.com/cloudsmithy/aws_game/issues</p>`, vOff(outroV));
    if (last.outro && t >= outroAt - 0.8) E.show('discbar', 'discbar', '免责声明：游戏里特定亚马逊云科技生成式人工智能相关的服务仅在亚马逊云科技海外区域可用，亚马逊云科技 User Group 仅为帮助您了解行业前沿技术和发展海外业务选择推介该服务。<br>亚马逊云科技中国区域相关云服务由西云数据和光环新网运营，具体信息以中国区域官网为准。游戏内价格为虚构，不代表实际定价；$ 是游戏币单位。', E.ease(E.seg(t, outroAt + 0.2, outroAt + 0.9)), 'none');   // 11-10 合规：片尾底部免责声明（文字同 code/index.html 的 DISC_GENAI、DISC_PRICE）

    // ---------- 章节、玩家栏、字幕 ----------
    if (!cur.outro && !cur.hero && t > 1) E.show('chap', 'chap', cur.chap, win(t, cur.start + 0.1, cur.end, 0.3, 0.2), 'none');
    if (t >= base && t < outroAt - 0.5) E.show('hud', 'hudh', NAMES.map((nn, k) => `<div><i style="background:${COLORS[k]}">${k + 1}</i><span>${nn}</span></div>`).join(''), win(t, base, outroAt - 0.5, 0.5, 0.4));
    { const e2 = document.querySelector('.ov .end2') || document.querySelector('.end2'); if (e2) e2.style.top = (last.outro && t >= outroAt - 0.8) ? '60px' : ''; }
    const sub = lines.find(s => t >= s.t0 - 0.05 && t < s.t1 + 0.3);
    // 11/12：片尾的字幕和底部免责声明条叠在一起——片尾的字幕还是居中，抬到免责声明条上面；左边那块片尾标题和署名整体上移 50px
    const endSub = sub && last.outro && sub.t0 >= outroAt - 0.8;
    if (endSub && !document.getElementById('subend-css')) document.head.appendChild(Object.assign(document.createElement('style'), { id: 'subend-css', textContent: '.sub2.subend{bottom:140px}' }));
    if (sub) E.show('sub', endSub ? 'sub2 subend' : 'sub2', sub.text, 1, 'translateX(-50%)');
  },
};
