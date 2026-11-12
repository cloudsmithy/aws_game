// full 宣传片序章（短剧版）「韩叔的出师考」：整段都是 3D 镜头，用短剧的路数讲——
//   暖阳蓝天、棋盘浮在云海上，一群服务卡通（mascots.js）在棋盘和云朵上玩 →「直到那一天」天一暗、卡通们抬头看天边一点红光 → 末日流星雨砸进云海、卡通们四散奔逃躲起来 →
//   天外流星坠落、云上世界危在旦夕 → 韩叔从棋盘中央升起，甩出规则书、撑开一面光盾挡下流星（角色定格 + 名牌）→ 流星炸成漫天金币，他把毕生所学写进了一张棋盘：云上大亨 →
//   「三年后……」→ 他坐在金币山上的王座里黑化了（墨镜金链子、抱着 User Group 冠军奖杯，闪电劈在旁边空地上）→
//   虫虫、Yuki 登场立志赚钱 →「又一颗流星？」其实是 Damo（一拳超人）从天而降 → 大标题 → Damo 一拳打碎大骰子，接正片第一把骰子
// 时间 o 从 0 到 OPENL（和 promo_full.js 的 OPENL 一致）；最后一帧的镜头和正片 10.7 秒一样。
(function () {
  const PRO = 6.083, ML = 34.8775, OPENL = PRO + ML;   // PRO：开头先交代「云上世界风平浪静」；ML：之后的主体（新时间，画面按它 seek；和 promo_full.js 的 OPENL 40.9605 一致）
  // ---------- 11/05 序章拉长（字幕、名牌停得太短，风平浪静也太快）：新时间 → 脚本进度 ----------
  // 第二轮（46.35 → 42.56）：低信息量的定格压回去——书和法阵 2.4 → 1.6、名牌 2.35 → 2.0、黑场 2.0 → 1.3、金币山 4.5 → 3.5（加了一直往下落的金币）、挑战气泡② 2.8 → 1.45、
  // 两人站定的定格 1.11 → 0.6、「又一颗流星」的纯定格 1.25 → 0.35（后面 0.95 是火球从天边一路压过来，脚本停在 17.2、火球按新时间飞）；「拯救」「著书」末尾各多 0.3 o
  // 下面原来写死的时刻都还是按旧时间写的（run 的 o 0–PRO0、runMain 的 o 0–ML0）。run / runMain 一进来先按 MAP_RUN / MAP_MAIN（[旧, 新] 分段线性，
  // 同一个旧时刻出现两次 = 定格）把新时间换回旧时间交给原来的脚本；循环动作、闪烁、抖动、粒子、弹出的时长按真实时间（CK.Ar，见各处），
  // 字幕、名牌、头像、气泡按 mm() 换成新时间以后用新时间算（淡入淡出、回弹都是原来的真实时长）。music.mjs 的 MM 是同一张表
  // 11/05 第三轮：风平浪静嫌长，往前补的 DP 3.84 → 2.24（= 7 × 0.32），「直到那一天」从 6.3 提前到 4.7（封面结束后约 5.9 秒视频），这之后整段只是平移 −1.6、逐帧和原来一样。
  // 卡通们的循环、铃声都按旧时间 A（= An − DP）走，DP 改了相位照样接得上（配乐的铃声跟着平移 −1.6，还在 A 的 0.32 网格上；1.28 一轮的小节线落在新时间 1.56 / 2.84 / 4.12，配乐用三声弱起接上）
  const PRO0 = 3.2, ML0 = 25.2, DP = 2.24;   // 旧的 PRO、ML；DP：风平浪静往前补了多长（7 × 0.32；原来 3.84）
  const MAP_RUN = [[-2.24, 0], [1.46, 3.70], [2.34, 4.58], [2.56, 4.855], [2.98, 5.863], [3.2, 6.083]];   // 风平浪静纯平移；「直到那一天」慢慢摇上天（斜率 2.4，原来 2.96 最后半秒几乎不动），反打砸下来斜率 1
  const MAP_CAST = [[2.34, 4.58], [2.56, 4.855], [2.94, 5.33], [2.98, 5.863], [3.2, 6.083]];             // 只给 cast()：卡通们的反应 1.25 倍慢演完，然后站着抬头发抖到反打
  const MAP_MAIN = [[0, 0], [1.9, 1.9], [3, 3.165], [3.18, 3.345], [3.9, 4.497], [4.8, 6.297], [5, 6.497], [5.36, 6.857], [5.9, 8.693], [7, 9.793], [9.1, 11.893], [9.3, 12.393], [9.6, 12.843],
    [10.3, 13.753], [10.65, 14.278], [10.98, 15.433], [11.72, 16.173], [12.4, 17.737], [13.3, 19.627], [13.46, 19.787], [13.95, 20.4975], [15.66, 22.2075], [15.66, 22.8075], [17.15, 24.8935],
    [17.2, 25.2435], [17.2, 26.1935], [18.16, 27.1535], [19.3, 28.9775], [21.8, 31.4775], [25.2, 34.8775]];   // 最后 21.8–25.2（大骰子 → 一拳 → 接正片）斜率必须是 1
  const pwl = (P, x, i, j) => { if (x <= P[0][i]) return P[0][j] + x - P[0][i];   // 分段线性：按第 i 列查第 j 列（两头外推斜率 1）
    for (let k = 1; k < P.length; k++) { const a = P[k - 1], b = P[k]; if (x <= b[i]) return b[i] > a[i] ? a[j] + (x - a[i]) * (b[j] - a[j]) / (b[i] - a[i]) : b[j]; }
    return P[P.length - 1][j] + x - P[P.length - 1][i]; };
  const AO = An => pwl(MAP_RUN, An, 1, 0), MO = on => pwl(MAP_MAIN, on, 1, 0);   // 新 → 旧：run 的绝对时间、runMain 的 o
  const AC = An => An < 4.58 ? An - DP : pwl(MAP_CAST, An, 1, 0);                // cast() 的表演时钟
  const mm = (x, late = true) => { if (x <= 0) return x; const ks = MAP_MAIN.map((_, k) => k).slice(1); if (late) ks.reverse();   // 旧 → 新（runMain）；late：正好在定格点上取定格之后
    for (const k of ks) { const a = MAP_MAIN[k - 1], b = MAP_MAIN[k]; if (x >= a[0] && x <= b[0]) return b[0] > a[0] ? a[1] + (x - a[0]) * (b[1] - a[1]) / (b[0] - a[0]) : (late ? b[1] : a[1]); }
    return MAP_MAIN[MAP_MAIN.length - 1][1] + x - MAP_MAIN[MAP_MAIN.length - 1][0]; };
  // 这一帧的时钟：An 新的序章绝对时间（擦镜头这些按新分镜排的用它）；Ar 真实时间钟（循环、闪烁、抖动；run 里 = An − DP，风平浪静那段就是原来的 A，runMain 里 = PRO0 + o，
  // 流星雨那段和原来逐帧一样——两边在第一颗砸下去的白闪那一帧差 0.88，看不出来）；rm runMain 的 o 按真实时间（run 里是负的）；mr 欢呼段从撞击起按真实时间数的 o
  const CK = { An: 0, Ar: 0, rm: 0, mr: 0 };
  const DFROM = new THREE.Vector3(-5.2, 1.7, 4.15), BIGD = new THREE.Vector3(-5.2, 0.71, 4.15);
  const C3 = new THREE.Vector3(-3.4, -0.04, 3.1), Y3 = new THREE.Vector3(-1.6, -0.04, 3.5), D3 = new THREE.Vector3(-2.5, -0.04, 4.6), PUNCH = new THREE.Vector3(-6.2, 0.22, 5.2);
  const CB = C3.clone().add(new THREE.Vector3(-0.36, 0, -0.2)), YB = Y3.clone().add(new THREE.Vector3(0.5, 0, 0.4));   // Damo 落地后虫虫、Yuki 被震开到的位置
  const THR = new THREE.Vector3(0, -0.04, -0.9), IMP = new THREE.Vector3(0, 7.2, -0.6);   // 王座的位置；主流星原来的终点（11/10 起 T 12.4 以前的路线还朝着它，之后改撞光盾上的 MHIT）
  const ctex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const radial = (stops) => ctex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); stops.forEach(([k, c]) => gr.addColorStop(k, c)); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
  const add = (m, mat) => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, ...mat });
  let A = null, DHIM = null;   // DHIM：先解码好的黑化头像（留个引用，不被回收）

  function assets(E) {
    if (A) return A;
    const V = E.V, all = [];
    // 「人称「一拳超人」的 Damo 带队」这一条字多：只给它加一个修饰类 dlong（主行 88 → 72px、副行 48 → 42px、整体往下 10px：字顶不压 Damo 的嘴和下巴，副行底边离画面底边留出 50px 多）。
    // 写在这里而不是 style_open.css：style_open.css 会拼进所有页面，放这儿只进 full 宣传片，6 个模式宣传片、普通宣传片、玩法讲解一个字节都不变
    if (!document.getElementById('dlong-css')) document.head.appendChild(Object.assign(document.createElement('style'), { id: 'dlong-css', textContent: '.dcap.dlong{bottom:74px}.dcap.dlong b{font-size:72px}.dcap.dlong i{font-size:42px;margin-top:6px}.oflash.whw{background:#fff}.oflash.hww{inset:-700px;background:radial-gradient(circle at 50% 50%,rgba(255,252,240,1) 0,rgba(255,240,200,.85) 140px,rgba(255,216,150,.45) 380px,rgba(255,196,120,.13) 740px,rgba(255,190,110,0) 1080px)}.oflash.hwx{inset:-700px;background:radial-gradient(circle at 50% 50%,rgba(255,252,240,1) 0,rgba(255,240,200,.8) 90px,rgba(255,216,150,.38) 240px,rgba(255,196,120,.1) 460px,rgba(255,190,110,0) 680px)}.oflash.bhw{background:radial-gradient(circle at 50% 50%,rgba(255,250,236,1) 0,rgba(255,228,160,.55) 120px,rgba(255,200,110,.16) 260px,rgba(255,180,80,0) 420px)}.bxf{left:0;top:0;z-index:5;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgba(250,242,255,1) 0,rgba(196,150,255,.96) 13%,rgba(140,72,240,.78) 31%,rgba(140,72,240,.3) 52%,rgba(140,72,240,0) 70%)}' }));   // 11/05（L12）：whw 闪电劈下那一下的全白闪光；11/10（refine2）：hww 主陨石撞上光盾那一下的暖白闪光（以撞击点为中心往外退，不是整屏一层灰白；层放大一圈，平移到撞击点时边不露出来）；11/10：bhw 书撞上陨石、光爆那一下的白金闪光（只在撞击点周围一团，整个层平移到撞击点在画面上的位置）；11/05（refine）：bxf Yuki 小伙伴飞出右边缘时的紫色闪光
    const grp = () => { const g = new THREE.Group(); E.scene.add(g); all.push(g); return g; };
    // 星空：一个大球内壁贴深蓝紫的夜空，再撒一层星星
    const sky = grp();
    const skyM = new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, depthWrite: false });
    sky.add(new THREE.Mesh(new THREE.SphereGeometry(160, 48, 24), skyM)); sky.children[0].renderOrder = -10;   // 进正片前夜空球改成半透明淡出时，要排在云海前面先画，不然会把远处的云盖掉（19.3 那一帧云海突然消失）
    skyM.map = (ctex(1024, 512, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#02030a'); gr.addColorStop(0.42, '#0b0f2e'); gr.addColorStop(0.55, '#26164a'); gr.addColorStop(0.62, '#4a2346'); gr.addColorStop(0.7, '#0b111c'); gr.addColorStop(1, '#05070d'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 7; k++) { const x = (k * 173) % w, y = h * (0.25 + (k % 3) * 0.08), r = 120 + (k % 4) * 50, n = g.createRadialGradient(x, y, 0, x, y, r); n.addColorStop(0, k % 2 ? 'rgba(140,79,255,.16)' : 'rgba(236,114,17,.12)'); n.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = n; g.fillRect(0, 0, w, h); }
    }));
    const sp = [], sc = []; let sd = 9; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 1600; k++) { const th = r() * Math.PI * 2, ph = Math.acos(1 - r() * 1.1), R = 140; sp.push(R * Math.sin(ph) * Math.cos(th), R * Math.cos(ph) * 0.9 + 6, R * Math.sin(ph) * Math.sin(th)); const b = 0.5 + r() * 0.5; sc.push(b, b, b * (0.9 + r() * 0.2)); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sg.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
    sky.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.55, vertexColors: true, fog: false, transparent: true, depthWrite: false })));
    // 云海：棋盘浮在一片云上
    const cloudTex = radial([[0, 'rgba(255,255,255,.75)'], [0.45, 'rgba(220,226,255,.35)'], [1, 'rgba(255,255,255,0)']]);
    const clouds = grp(), cpv = new THREE.Vector3();
    for (let k = 0; k < 90; k++) { const a = r() * Math.PI * 2, d = 9 + r() * 34, s2 = 6 + r() * 10;
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: new THREE.Color().setHSL(0.68 + r() * 0.08, 0.35, 0.6 + r() * 0.2), transparent: true, opacity: 0.32 + r() * 0.25, depthWrite: false, fog: false }));
      m.position.set(Math.cos(a) * d, -1.6 - r() * 2.2, Math.sin(a) * d * 0.8); m.scale.set(s2 * 1.8, s2 * 0.7, 1); m.userData = { a, d, v: 0.01 + r() * 0.02, c0: m.material.color.clone() }; clouds.add(m);
      // 11/10（refine）：飘到镜头身边的云（中心快到镜头平面上了）先慢慢淡掉：原来一越过近裁剪面就整朵一帧没了（T 15.07→15.1 那一朵，下半屏一下子暗 7/255）
      m.onBeforeRender = (rr, sc, cam) => { cpv.setFromMatrixPosition(m.matrixWorld).applyMatrix4(cam.matrixWorldInverse); const kz = Math.min(1, Math.max(0, (-cpv.z - 0.12) / 1.2)); m.userData.op = m.material.opacity; m.material.opacity *= kz * kz * (3 - 2 * kz); };
      m.onAfterRender = () => { m.material.opacity = m.userData.op; }; }
    // 光晕贴图（Damo 的火球、书、奖杯等的光也用它）
    const glowTex = radial([[0, 'rgba(255,255,255,1)'], [0.2, 'rgba(255,214,140,.95)'], [0.5, 'rgba(255,120,40,.45)'], [1, 'rgba(255,60,0,0)']]);
    const trailGeo = new THREE.CylinderGeometry(1.1, 0.0, 22, 24, 1, true); trailGeo.translate(0, -11, 0); trailGeo.rotateX(-Math.PI / 2);   // 尾巴沿 -z（局部），用 lookAt 对准飞行方向的反方向
    const trailTex = ctex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,230,160,.95)'); gr.addColorStop(0.3, 'rgba(255,120,40,.6)'); gr.addColorStop(1, 'rgba(255,60,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    // 流星雨：几十颗大大小小的流星噼里啪啦往下砸（同一个方向斜着落，速度、大小、出现时间各不一样）。只留数据：和末日流星、主流星一样画成燃烧的石头（meteors() 里的 rock()），
    // 不再是白热头 + 锥形拖尾的贴片（随机数的取法和原来一样，每颗的时刻、路线不变）
    const minis = Array.from({ length: 150 }, (_, k) => { const sz = 0.5 + r() * r() * 2.6;
      const dir = new THREE.Vector3(-0.62 + (r() - 0.5) * 0.2, -0.72 + (r() - 0.5) * 0.15, 0.3 + (r() - 0.5) * 0.2).normalize();
      return { sz, t0: -0.35 + Math.pow(k / 150, 0.8) * 5.8 + (r() - 0.5) * 0.3, dur: 0.6 + r() * 0.9, start: new THREE.Vector3(-30 + r() * 95, 26 + r() * 34, -75 + r() * 60), dir, len: 40 + r() * 30, k }; });
    // 规则书：红色硬皮 + 白色书页（两半封面能翻开），带一圈金光；甩出去时散开的书页
    const book = grp(); const pageM = new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: 0.8 }), coverM = new THREE.MeshStandardMaterial({ color: '#c8312a', roughness: 0.5 });
    book.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.42), coverM));
    [-1, 1].forEach(sd => { const half = new THREE.Group(); half.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.42), coverM), { castShadow: true })); half.add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.39), pageM)); half.children.forEach(m => { m.position.x = sd * 0.15; }); half.children[1].position.y = 0.03; book.add(half); });
    // 11/10（refine）：光爆时书页上发光的金色符文（每半边一张，平时不显示，见 runMain 的 BHIT）；书页、书边那时也跟着泛金光（pageM / coverM 的 emissive，reset() 每帧还原）
    const runeTex = ctex(256, 352, (g, w, h) => { g.strokeStyle = g.fillStyle = 'rgba(255,178,40,1)'; g.shadowColor = 'rgba(255,128,10,1)'; g.shadowBlur = 14; g.lineCap = 'round'; g.lineJoin = 'round';
      g.lineWidth = 9; g.strokeRect(20, 20, w - 40, h - 40);
      g.lineWidth = 8; g.beginPath(); g.arc(w / 2, 108, 54, 0, 7); g.stroke();
      g.lineWidth = 6; g.beginPath(); [[-30, 18], [-30, -14], [-16, 2], [0, -24], [16, 2], [30, -14], [30, 18]].forEach(([x, y]) => g.lineTo(w / 2 + x, 108 + y)); g.closePath(); g.stroke();   // 圆里一顶小王冠（韩叔的规则书）
      [[-30, -20], [0, -31], [30, -20]].forEach(([x, y]) => { g.beginPath(); g.arc(w / 2 + x, 108 + y, 5, 0, 7); g.fill(); });
      for (let row = 0; row < 4; row++) { let x = 52; const y = 206 + row * 34; while (x < w - 64) { const gw = 14 + ((row * 7 + x * 3) % 16); g.lineWidth = 7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + gw, y);
        if ((x + row) % 3 === 0) { g.moveTo(x + gw * 0.5, y - 9); g.lineTo(x + gw * 0.5, y + 9); } g.stroke(); x += gw + 14; } } });
    const runes = [1, 2].map(j => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.37), new THREE.MeshBasicMaterial({ map: runeTex, transparent: true, opacity: 0, depthWrite: false, fog: false }));
      m.rotation.x = -Math.PI / 2; m.position.set((j === 1 ? -1 : 1) * 0.15, 0.0515, 0); m.visible = false; book.children[j].add(m); return m; });
    const flips = [0, 1, 2, 3, 4, 5].map(k => { const f = new THREE.Group(); f.position.y = 0.06 + k * 0.002; const pg = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.38), new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: 0.8, side: THREE.DoubleSide })); pg.rotation.x = -Math.PI / 2; pg.position.x = 0.14; f.add(pg); f.visible = false; book.add(f); return f; });
    const bookGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffd27a', transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); bookGlow.scale.setScalar(1.2); book.add(bookGlow);
    const pageTex = ctex(64, 84, (g, w, h) => { g.fillStyle = '#fff6dc'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(120,80,30,.45)'; for (let k = 0; k < 6; k++) g.fillRect(8, 12 + k * 11, w - 16 - (k % 2) * 12, 3); });
    const pages = Array.from({ length: 22 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.66), new THREE.MeshBasicMaterial({ map: pageTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false })); E.scene.add(m); all.push(m); return m; });   // 现在只在「著书」那段飞向格子
    // 11/10（救世主）：书往天上一扔、撞上落下来的陨石的那一下，不再「噗」地炸开一团卡通云团（11/09 版；用户：像一团爆米花压在法阵中间，要体现救世主的感觉），
    //   改成一次庄严、明亮的金色光爆：白金闪光（白热核 + 一道横的、一短截竖的光芒，十字星）→ 三圈金色冲击波从撞击点往外推开 → 十二长十二短的放射光芒照亮夜空 →
    //   陨石碎成金币往外四散（往他、字幕、名牌那边不放）→（11/10 光盾：原来这里法阵平面上推开光环、法阵展开，现在是书翻开、光盾从书里展开）（11/10 refine：撞击点在他右上方一侧，法阵从那里生出来、飘到他头顶上方）；
    //   书停在光芒中心像被托住（11/10 光盾：不再化进法阵，翻开后放出光盾，挡下主陨石后飞回他手里）；韩叔背后亮起一圈金光、光柱跟着亮（逆光照亮）。见 runMain 的 BHIT
    // 光芒、冲击波、天光画在一块正对镜头的大平面上（一个着色器，叠加混合），放在书后面：书、韩叔照样挡在它前面（他的脸不被光盖住）；往正下方（他、字幕那边）那一块压暗
    // 11/10（refine）：光芒不再是 24 根一样宽、一样长的辐条：8 根主光 + 16 根细弱的，每根的角度、宽窄、长短、亮度按 hash 抖开，径向衰减快（到画面边缘基本没了）；
    //   冲击波只留一圈细的主环（亮在外沿、往里软软地衰减）+ 一圈很淡的，0.2–0.3 秒推出画面；天光只是撞击点周围一团暖金色（高斯衰减，离中心约半屏就没了），四角、下半屏的深蓝夜空不动
    const bxRayM = new THREE.ShaderMaterial({ uniforms: { S: { value: 11 }, tm: { value: 0 }, tw: { value: 0 }, reach: { value: 0.3 }, rays: { value: 0 }, core: { value: 0 }, sky: { value: 0 },
        rg: { value: [new THREE.Vector3(1, 0.3, 0), new THREE.Vector3(1, 0.3, 0)] } }, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, fog: false,
      vertexShader: 'uniform float S; varying vec2 vP; void main(){ vP = position.xy * S; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float S, tm, tw, reach, rays, core, sky; uniform vec3 rg[2]; varying vec2 vP;
        float hs(float n){ return fract(sin(n * 91.345) * 47453.5453); }
        float ray(float a, float r, float ang, float w, float L){ float d = abs(mod(a - ang + 3.14159265, 6.2831853) - 3.14159265), x = d * r / (w * r + 0.035); return exp(-x * x) * exp(-r / L); }
        void main(){ float r = length(vP) + 1e-4, a = atan(vP.y, vP.x), dn = vP.y / r, att = 1.0 - 0.82 * (1.0 - smoothstep(-0.8, -0.15, dn)) * smoothstep(0.7, 2.2, r);
          float ry = 0.0;
          for (int i = 0; i < 8; i++) { float f = float(i); ry += (0.62 + 0.38 * hs(f + 11.0)) * (0.9 + 0.1 * sin(tw * 7.0 + f * 2.3)) * ray(a, r, f * 0.785398 + 0.3927 + tm + (hs(f) - 0.5) * 0.22, 0.045 + 0.04 * hs(f + 7.0), 1.8 + 1.1 * hs(f + 3.0)); }
          for (int i = 0; i < 16; i++) { float f = float(i) + 20.0; ry += (0.2 + 0.3 * hs(f + 11.0)) * ray(a, r, (f - 20.0) * 0.392699 + 0.196 - tm * 1.35 + (hs(f) - 0.5) * 0.3, 0.01 + 0.016 * hs(f + 7.0), 0.9 + 1.1 * hs(f + 3.0)); }
          ry *= (1.0 - smoothstep(reach * 0.55, reach, r)) * smoothstep(0.25, 0.9, r);
          // 11/10（refine2，评审：「一圈细的冲击波光环 + 一圈金币 + 四角星光，有零点几秒像法阵」）：冲击波不再是一条细线圆环，改成一圈软的、不太规整的光雾往外推（宽、边是虚的，亮度沿一圈忽明忽暗）
          float rn = 0.0; for (int j = 0; j < 2; j++) { vec3 q = rg[j]; float e = r - q.x, nz = 0.6 + 0.4 * sin(a * 3.0 + q.x * 3.7 + float(j) * 2.0) * sin(a * 5.0 - 1.3 + q.x * 2.1); rn += q.z * nz * (0.55 * exp(-e * e / 0.09) + 0.3 * exp(min(e, 0.0) / (q.y + 0.25)) * (1.0 - smoothstep(-0.1, 0.25, e))); }
          float gl = core * exp(-r * r / 0.8), sk = sky * exp(-r * r / 5.0);
          vec3 cw = vec3(1.0, 0.95, 0.84), cg = vec3(1.0, 0.7, 0.28), cs = vec3(1.0, 0.74, 0.32);
          vec3 c = cw * gl + mix(cw, cg, smoothstep(0.3, 2.6, r)) * rays * ry * att + mix(cw, cg, 0.35) * rn * (0.55 + 0.45 * att) + cs * sk * (0.5 + 0.5 * att);
          gl_FragColor = vec4(c * (1.0 - smoothstep(S * 0.75, S, r)), 1.0);
          #include <colorspace_fragment>
        }` });
    const bxRay = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bxRayM); bxRay.renderOrder = 2; bxRay.frustumCulled = false; E.scene.add(bxRay); all.push(bxRay);
    const bxSpr = (map, color, ro, dt, blend = THREE.AdditiveBlending) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, depthWrite: false, depthTest: dt, blending: blend, fog: false })); m.renderOrder = ro; E.scene.add(m); all.push(m); return m; };
    const streakTex = ctex(256, 32, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); [[0, 'rgba(255,196,100,0)'], [0.3, 'rgba(255,210,130,.45)'], [0.5, 'rgba(255,253,244,1)'], [0.7, 'rgba(255,210,130,.45)'], [1, 'rgba(255,196,100,0)']].forEach(([k, c]) => gr.addColorStop(k, c)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-in'; const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.5, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = v; g.fillRect(0, 0, w, h); });
    const glintTex = ctex(128, 128, (g) => { g.translate(64, 64); const gr = g.createRadialGradient(0, 0, 0, 0, 0, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,242,196,.9)'); gr.addColorStop(0.55, 'rgba(255,204,110,.35)'); gr.addColorStop(1, 'rgba(255,180,60,0)');
      g.fillStyle = gr; g.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, rr = k % 2 ? 7 : 63; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); });
    const coinTex = ctex(128, 128, (g) => { const gr = g.createRadialGradient(52, 48, 4, 64, 64, 62); gr.addColorStop(0, '#fff7cc'); gr.addColorStop(0.55, '#ffd23f'); gr.addColorStop(1, '#d99a12'); g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill();
      g.lineWidth = 7; g.strokeStyle = '#b97a0a'; g.beginPath(); g.arc(64, 64, 50, 0, 7); g.stroke(); g.lineWidth = 3; g.strokeStyle = '#fff2b8'; g.beginPath(); g.arc(64, 64, 55, 0, 7); g.stroke();
      g.fillStyle = '#c4850c'; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k / 10 * Math.PI * 2, rr = k % 2 ? 13 : 30; g.lineTo(64 + Math.cos(a) * rr, 66 + Math.sin(a) * rr); } g.closePath(); g.fill(); });
    const ringTex = ctex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); [[0, 'rgba(255,220,150,0)'], [0.7, 'rgba(255,214,130,0)'], [0.86, 'rgba(255,214,130,.3)'], [0.94, 'rgba(255,250,232,1)'], [1, 'rgba(255,230,170,0)']].forEach(([k, c]) => gr.addColorStop(k, c)); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
    // 金币：撞击点在他右上方，金币从那里往上、往右、往右下扇形散开（画面上的角度，0° 朝右、90° 朝上）：外圈 12 枚一路飞出画面、不淡出；里圈 6 枚飞近一点，最后星光一闪、缩成 0。
    //   往左下（韩叔、字幕那边）、往左（名牌那边）一枚都不放。每枚大小 0.7–1.3 倍，大的离镜头近一点（都在书后面）；飞的快慢也不完全一样
    //   [方向角, 0 外圈 / 1 里圈, 大小, 在书后面多远, 翻转相位, 快慢]
    const hq = k => { const v = Math.sin(k * 12.9898 + 4.1) * 43758.5453; return v - Math.floor(v); };
    const BXC = [...[162, 140, 118, 97, 76, 55, 34, 13, -8, -29, -48, -66].map(t => [t, 0]), ...[150, 108, 66, 24, -18, -55].map(t => [t, 1])]
      .map(([t, tier], k) => { const sf = 0.7 + 0.6 * hq(k); return [t * Math.PI / 180, tier, sf, 0.3 + 0.8 * (1.3 - sf), k * 2.39, 0.92 + 0.16 * hq(k + 40)]; });
    const bx = { ray: bxRay, core: bxSpr(glowTex, '#fff6dc', 3, true), sH: bxSpr(streakTex, '#fff0c8', 8, false), sV: bxSpr(streakTex, '#fff0c8', 8, false), star: bxSpr(glintTex, '#ffe9b0', 8, false), halo: bxSpr(glowTex, '#ffc870', 0, true),
      coins: BXC.map(() => bxSpr(coinTex, '#ffffff', 3, true, THREE.NormalBlending)), glints: BXC.map(() => bxSpr(glintTex, '#ffe6a0', 4, true)), BXC,
      flat: [0, 1].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), add(null, { map: ringTex, side: THREE.DoubleSide, color: '#ffe2a0' })); m.rotation.x = -Math.PI / 2; m.renderOrder = 2; E.scene.add(m); all.push(m); return m; }) };
    // 11/10（光盾）：金色法阵整个拿掉（用户看了说「总有一种黑莲封印的感觉」：五角星 / 多角星连线、一圈符文字、一圈圈同心圆配上深紫夜空，像反派开封印）。
    //   换成一面护住大家的光盾：一大片罩在棋盘和卡通们上方的半透明暖白金色光幕——椭球穹顶的上半截（中心 SHC、横向半径 SHA、竖向半径 SHB），底边柔柔地淡掉、没有硬边；
    //   平时很淡很干净，越往边上（视线擦着表面的地方）越亮，看得出是一层有体积的罩子；表面有一层很慢的流光。不画任何阵法、宗教、神秘学的图形。
    //   从书里展开（op / grow / org：离起点 org 的角距离小于 grow 的地方亮起来，前沿一圈更亮、带出淡淡的蜂窝格）；
    //   主陨石撞上来（hitP / hitT）：撞击点那一块亮起来，现出淡淡的六边形蜂窝格，三道波纹顺着罩面往外荡开，然后慢慢退回平静。见 runMain 的 SHIELD
    // 11/10（refine2，评审：近景里光盾只是一层暖雾、刚展开就出了上沿和右沿、像土星环）：几何体改成整个球（SphereGeometry 全球面），底边在着色器里按 cut / cutW 柔柔地切掉；
    //   近景先是一个罩住韩叔和书的泡（整泡都在画面里），主陨石撞上以后再撑大成罩住大家的穹顶（见 runMain 的 SHIELD）。
    //   近景看得见的东西：边缘（视线擦着表面）一圈亮边；一条很淡的高光带慢慢滑过朝镜头那面；很淡的蜂窝格一明一暗地流过；几颗沿罩面漂的小光点（cv 控制，撑大以后减弱）；
    //   主陨石快撞上时（pre）撞击点那块先被压亮、往里凹一点（dent，顶点往球心收），HIT 再炸开
    const shieldM = new THREE.ShaderMaterial({ uniforms: { op: { value: 0 }, grow: { value: 0 }, org: { value: new THREE.Vector3(0, 1, 0) }, hitP: { value: new THREE.Vector3(0, 1, 0) }, hitT: { value: -1 }, tm: { value: 0 }, flash: { value: 0 },
        cut: { value: 0.111 }, cutW: { value: 0.4 }, cv: { value: 0 }, pre: { value: 0 }, dent: { value: 0 }, pA: { value: 0 }, pB: { value: 0 }, pK: { value: 0 }, pF: { value: 0 }, chg: { value: 0 },
        opn: { value: -99 }, opg: { value: 0 }, odr: { value: 1 }, rs: { value: new THREE.Vector2(1920, 1080) }, fm: { value: Array.from({ length: 11 }, () => new THREE.Vector3(0, 0, 0)) },
        bn: { value: 0 }, nmR: { value: new THREE.Vector4(0, 0, 0, 0) }, nmK: { value: 0 } },   // 11/11（refine）：bn 刚长出来那一下；nmR / nmK 名牌那一块（画面像素 x0、y0、x1、y1）和压暗多少
      transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      // 11/10（迎击）：pA、pB 往外推（罩面沿法线鼓出 pA·max(0, u·hitP)^2.5 + pB 倍，迎向陨石那一侧鼓得最多），法线跟着鼓出来的形状算（边缘那圈亮边贴着推开以后的轮廓）；pA = pB = 0 时和原来一样
      vertexShader: `uniform vec3 hitP; uniform float dent, pA, pB; varying vec3 vP; varying vec3 vN; varying vec3 vV;
        void main(){ vP = position; float dA = acos(clamp(dot(normalize(position), hitP), -1.0, 1.0)); vec3 p = position * (1.0 - dent * exp(-dA * dA / 0.06)); vec3 n = normal;
          if (pA > 0.0 || pB != 0.0) { float cd = max(dot(normal, hitP), 0.0), f = pA * pow(cd, 2.5) + pB; p *= 1.0 + f; n = normalize(normal - pA * 2.5 * pow(cd, 1.5) * (hitP - cd * normal) / (1.0 + f)); }
          vec4 mv = modelViewMatrix * vec4(p, 1.0); vN = normalize(normalMatrix * n); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float op, grow, tm, hitT, flash, cut, cutW, cv, pre, opn, opg, odr, pK, pF, chg, bn, nmK; uniform vec3 org, hitP; uniform vec2 rs; uniform vec4 nmR; uniform vec3 fm[11]; varying vec3 vP; varying vec3 vN; varying vec3 vV;
        float hexE(vec2 p){ vec2 s = vec2(1.0, 1.7320508); vec4 hc = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
          vec4 h = vec4(p - hc.xy * s, p - (hc.zw + 0.5) * s); vec2 g = dot(h.xy, h.xy) < dot(h.zw, h.zw) ? h.xy : h.zw; vec2 q = abs(g); return 0.5 - max(dot(q, s * 0.5), q.x); }
        vec2 tang(vec3 c, vec3 p){ vec3 t1 = normalize(cross(c, abs(c.y) > 0.95 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0))), t2 = cross(c, t1); return vec2(dot(p - c, t1), dot(p - c, t2)); }
        float h31(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        void main(){ vec3 P = normalize(vP); float low = smoothstep(cut, cut + cutW, P.y); if (low < 0.002) discard;
          float fr = 1.0 - abs(dot(normalize(vN), normalize(vV))), edge = pow(fr, 2.6), front = gl_FrontFacing ? 1.0 : 0.0, inner = 1.0 - front;
          float sheen = 0.8 + 0.2 * sin(dot(P, vec3(4.1, 2.3, 3.3)) * 2.2 + tm * 0.5) * sin(dot(P, vec3(-2.7, 3.1, 1.9)) * 1.6 - tm * 0.37);
          float dA = acos(clamp(dot(P, org), -1.0, 1.0)), rev = 1.0 - smoothstep(grow - 0.16, grow, dA), fw = exp(-pow((dA - grow) / 0.09, 2.0)) * (1.0 - smoothstep(2.3, 3.1, grow));
          float on = step(0.0, hitT), ht = max(hitT, 0.0), dH = acos(clamp(dot(P, hitP), -1.0, 1.0)) * 7.0;
          float he = hexE(tang(hitP, P) * 7.0 / 0.42), line = 1.0 - smoothstep(0.02, 0.09, he);
          float spot = on * exp(-dH * dH / 0.5) * (0.2 + 1.3 * exp(-ht * 3.2));
          float near = on * exp(-dH * dH / 4.0) * (0.2 + 0.8 * exp(-ht * 2.6)) * (1.0 - smoothstep(0.22, 0.6, ht));   // 11/10（迎击）：0.3–0.85 → 0.22–0.6 淡完：撞击点挪到了轮廓上，撑成穹顶以后那块蜂窝格在右边沿着轮廓竖成一条，早点淡掉
          float rip = 0.0; for (int k = 0; k < 3; k++) { float r = (ht - float(k) * 0.17) * 6.0; if (r > 0.0) rip += exp(-pow((dH - r) / 0.6, 2.0)) * exp(-r * 0.13) * (1.0 - float(k) * 0.28); }
          rip *= on * (1.0 - smoothstep(0.35, 0.9, ht));
          float prs = pre * exp(-dH * dH / 2.2);   // 快撞上时撞击点那一块先被压亮
          float l2 = 1.0 - smoothstep(0.02, 0.09, hexE(tang(org, P) * 7.0 / 0.42));
          // 近景看得见的面：高光带（朝镜头那面，约 7 秒滑过一趟）、流过的淡蜂窝格（三向投影，免得球面上拉扯变形）、沿罩面漂的小光点
          float bp = dot(P, normalize(vec3(-0.5, 0.82, 0.28))), band = exp(-pow((bp - (-1.1 + mod(tm * 0.3 + 1.2, 2.4))) / 0.16, 2.0)) * front;
          vec3 aw = abs(P); aw = aw / (aw.x + aw.y + aw.z);
          float hx = aw.x * (1.0 - smoothstep(0.02, 0.08, hexE(P.zy * 5.2))) + aw.y * (1.0 - smoothstep(0.02, 0.08, hexE(P.xz * 5.2))) + aw.z * (1.0 - smoothstep(0.02, 0.08, hexE(P.xy * 5.2)));
          float wave = pow(0.5 + 0.5 * sin(dot(P, vec3(2.1, 3.3, 1.2)) * 2.6 - tm * 1.3), 3.0);
          vec3 q = P * 6.0 + vec3(0.0, tm * 0.12, tm * 0.05), qi = floor(q), qf = fract(q) - 0.5; float hh = h31(qi), mt = step(0.82, hh) * smoothstep(0.075, 0.0, length(qf - (vec3(h31(qi + 1.7), h31(qi + 4.1), h31(qi + 8.3)) - 0.5) * 0.6)) * (0.55 + 0.45 * sin(tm * 2.1 + hh * 40.0));
          float base = (0.008 + inner * (0.012 + 0.035 * smoothstep(0.55, 0.97, P.y)) * (1.0 - 0.5 * bn) + (0.34 + 0.06 * inner) * edge) * sheen + 0.14 * flash;
          vec3 cB = mix(vec3(1.0, 0.88, 0.58), vec3(1.0, 0.95, 0.84), 0.75 * bn), cH = vec3(1.0, 0.82, 0.45), cS = vec3(1.0, 0.97, 0.9);   // 11/11（refine）：刚长出来那一下（bn）偏金白、里面的填充减半
          vec3 c = cB * (base * rev + fw * 0.3) + cH * (line * (near * 0.34 + rip * 0.45 + prs * 0.3) + l2 * fw * 0.3 + smoothstep(0.42, 0.0, he) * (near * 0.16 + rip * 0.1 + prs * 0.12) + rip * 0.1) + cS * (spot + prs * 0.5)
            + rev * cv * (cS * band * 0.075 + cH * hx * wave * 0.05 * (0.4 + 0.6 * front) + cS * mt * 0.55);
          // 11/11（refine，评审：「光盾刚长出来那 0.3 秒是一团偏橙的发光球，乍一看像爆炸火球」）：一出来就带金白色的边沿高光、看得见的六边形纹（bn 0.35 秒里退回平常的样子）
          if (bn > 0.0) c += rev * bn * (cS * edge * 0.3 + mix(cH, cS, 0.5) * hx * (0.045 + 0.06 * front));
          // 11/10（迎击，见 runMain 的 SHIELD）：chg 蓄力（边缘一圈、淡淡的蜂窝格亮起来）；pK 往外推（边缘那圈亮边越往迎向陨石那一侧越亮）；
          //   pF：一圈亮带（画面上从泡心量的半径，0 中心 – 1 轮廓），蓄力时从边上往里收、推的时候从里往外扫到边上，亮带里的蜂窝格跟着亮（中间他那一块不亮）
          if (pK > 0.0 || chg > 0.0) { float cdF = max(dot(P, hitP), 0.0), sF = sqrt(max(0.0, 1.0 - (1.0 - fr) * (1.0 - fr))), bnd = exp(-pow((sF - pF) / 0.07, 2.0)) * smoothstep(0.3, 0.5, sF), pw = pK + 0.45 * chg;
            float hf = aw.x * (1.0 - smoothstep(0.015, 0.05, hexE(P.zy * 9.0))) + aw.y * (1.0 - smoothstep(0.015, 0.05, hexE(P.xz * 9.0))) + aw.z * (1.0 - smoothstep(0.015, 0.05, hexE(P.xy * 9.0))), sd = cdF * cdF;
            c += rev * (cB * (edge * ((0.12 + 0.5 * sd) * pK + 0.1 * chg) + bnd * pw * (0.012 + 0.05 * sd)) + cH * hf * front * (bnd * pw * (0.03 + 0.26 * sd) + 0.012 * chg * (0.3 + sd))); }
          // 11/11（shfade）：下面这一段（opn / opg / odr / fm）不再用了——光盾改成整面淡出（见 runMain 的 SHF），opn 一直是 -99、opg 一直是 0，这一段不起作用；
          //   为了前面的画面逐像素不变（改着色器会让编译出来的舍入差一点），着色器的代码一个字没动，只改了注释。原来的说明：
          // 11/10（打开，见 runMain 的 OPEN）：危险过去以后光盾从最高点打开。罩面按一张贴着穹顶摊开的六边形格子（从顶点量的弧长，20 格 = 一个横半径，一格约 0.45）一格一格地亮起来、化掉：
          //   opn 口子的半径（格），每一格按自己的随机数早晚一点（rT）；口子前沿外面 2 格以内的格子先亮（越近越亮；正对镜头那面暗一点，最边上擦着看的地方一层层叠在一起，也压一点），前沿扫过以后 0.13 秒内往格子中心缩小、淡掉
          //   （同一刻 runMain 从一部分格子放出一片六边形光片往上飘，见 opCells）；odr 口子每秒扩多少格（算一格化了多久）；opg 打开以前最高点那几格先亮起来；
          //   fm 小精灵、韩叔脸的位置（画面像素 x、y、半径）：前沿扫过脸的时候那一格的光压暗，不糊在脸上。opn = -99、opg = 0 的时候这一段不起作用（打开以前逐像素和原来一样）
          if (opn > -50.0 || opg > 0.0) {
            float th = acos(clamp(P.y, -1.0, 1.0)); vec2 mp = P.xz / max(length(P.xz), 1e-5) * (th - 0.1698 * th * th) * 20.0;
            vec2 sA = vec2(1.0, 1.7320508), ca = (floor(mp / sA) + 0.5) * sA, cb = floor(mp / sA + 0.5) * sA, cc = dot(mp - ca, mp - ca) < dot(mp - cb, mp - cb) ? ca : cb;
            vec2 qa = abs(mp - cc); float hd = max(qa.x, dot(qa, vec2(0.5, 0.8660254)));
            vec2 id = floor(vec2(cc.x * 2.0, cc.y / 0.8660254) + 0.5); vec3 p3 = fract(vec3(id.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); float rr = fract((p3.x + p3.y) * p3.z);
            float d = length(cc) + (rr - 0.5) * 1.6 - opn, g = 0.0, sh = 1.0, fr2 = (0.5 + 0.5 * smoothstep(0.2, 0.75, fr)) * (1.0 - 0.55 * smoothstep(0.8, 0.98, fr));
            if (opn > -50.0) { if (d < 0.0) { sh = 1.0 - (-d / max(odr, 1.0)) / 0.13; if (sh <= 0.0 || hd > 0.5 * sh) discard; g = 1.0; } else g = pow(1.0 - smoothstep(0.0, 2.0, d), 2.0); }
            float h2 = hd / max(sh, 0.01), ln = smoothstep(0.33, 0.47, h2), ap = opg * exp(-dot(mp, mp) / 5.0);
            vec2 fc = vec2(gl_FragCoord.x, rs.y - gl_FragCoord.y) * (1920.0 / rs.x); float fmk = 1.0;
            for (int i = 0; i < 11; i++) { if (fm[i].z > 0.0) fmk *= mix(0.12, 1.0, smoothstep(0.7 * fm[i].z, 1.15 * fm[i].z, length(fc - fm[i].xy))); }
            c += (cH * ((0.05 + 0.38 * ln) * g * sh * fr2 + (0.06 + 0.3 * ln) * ap) + cS * (g * g * g * sh * 0.1 * max(0.0, 1.0 - 1.4 * h2) + ap * 0.15 * max(0.0, 1.0 - 1.6 * hd))) * fmk;
          }
          // 11/11（refine，评审：「光盾左沿一直压在韩叔名牌小字上」）：名牌那一块（软边）里罩面压到四成，亮边不从字上穿过去
          if (nmK > 0.0) { vec2 fq = vec2(gl_FragCoord.x, rs.y - gl_FragCoord.y) * (1920.0 / rs.x); float nm = smoothstep(nmR.x - 26.0, nmR.x + 4.0, fq.x) * (1.0 - smoothstep(nmR.z - 4.0, nmR.z + 26.0, fq.x)) * smoothstep(nmR.y - 22.0, nmR.y + 4.0, fq.y) * (1.0 - smoothstep(nmR.w - 4.0, nmR.w + 22.0, fq.y)); c *= 1.0 - 0.6 * nmK * nm * smoothstep(0.3, 0.75, fr); }   // 只压亮边（视线擦着罩面的那一圈），罩面中间不压，看不出一个方块
          gl_FragColor = vec4(c * low * op, 1.0);   // 不过 colorspace_fragment：叠加的亮度按画面上的 0–1 给（过了 sRGB 编码，0.02 的底光在画面上就是 +38，一层罩子糊成一片奶白）
        }` });
    const shield = grp(), shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 64), shieldM); shieldMesh.renderOrder = 1.8; shieldMesh.frustumCulled = false; shield.add(shieldMesh);
    // 11/11（fixB）：收盾（韩叔权杖顶端亮起的星光）和光盾淡掉时落到云上的十颗金色光点（每颗一个亮核 + 星光 + 三个拖尾，落地那一下一团金光）。
    //   都是叠加混合的贴片，每帧由 runMain 摆（见 DSM、POPT）；杖尖的光画在最前面（不被立牌挡住），光点按深度被前面的卡通、韩叔挡住。11/11（shfade）：从杖尖打到穹顶最高点的那道细光拿掉
    const moteTex = radial([[0, 'rgba(255,255,250,1)'], [0.16, 'rgba(255,242,196,.92)'], [0.45, 'rgba(255,218,130,.34)'], [1, 'rgba(255,205,100,0)']]);   // 暖白到浅金的柔光（不带 glowTex 外圈那层橙红，免得光点看着像小火球、小流星）
    const fxs = (map, color, dt = true, ro = 2.05) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, opacity: 0, depthWrite: false, depthTest: dt, blending: THREE.AdditiveBlending, fog: false }));
      m.renderOrder = ro; E.scene.add(m); all.push(m); return m; };
    const dsm = { core: fxs(moteTex, '#fff4d8', false, 2.2), star: fxs(glintTex, '#fff6dc', false, 2.25) };
    // 11/11（refine，评审：「收盾的提示偏弱：杖尖星光约 20 像素，那道光很细」）：杖尖亮起来那一下从杖尖往外推开金光环（ring、ring2，正对镜头的圆环贴片）
    const dsRingTex = radial([[0, 'rgba(255,236,190,0)'], [0.62, 'rgba(255,236,190,0)'], [0.8, 'rgba(255,246,222,.9)'], [0.88, 'rgba(255,226,160,.5)'], [1, 'rgba(255,210,130,0)']]);
    // 11/11（shfade/refine，评审：「光环只在他身边、一直没碰到罩面，光盾是自己整面淡掉的」「第一圈刚推出来从韩叔脸上扫过去」「第二圈下沿从字幕后面穿过」）：
    //   两圈光环都放到韩叔立牌后面一点、按深度测（被他自己挡住，不从脸上、身上扫过去）；第二圈换成往外推到罩子轮廓上的那一圈（ring2Tex：细一点、下半圈淡掉，让开字幕和棋盘），
    //   画面上推成和穹顶轮廓差不多的扁圆（见 runMain 的 DSM.w0 / w1）
    const ring2Tex = ctex(512, 512, (g, W, H) => { const im = g.createImageData(W, H), sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const u = (x + 0.5) / W * 2 - 1, v = 1 - (y + 0.5) / H * 2, r = Math.sqrt(u * u + v * v);
        const band = sm(0.66, 0.86, r) * (1 - sm(0.86, 0.99, r)), vk = 0.1 + 0.9 * sm(-0.6, 0.2, v), i = (y * W + x) * 4;   // vk：下半圈（v < 0）淡到一成
        im.data[i] = 255; im.data[i + 1] = 240 - 22 * sm(0.8, 0.99, r); im.data[i + 2] = 206 - 60 * sm(0.8, 0.99, r); im.data[i + 3] = Math.round(255 * 0.9 * band * vk); }
      g.putImageData(im, 0, 0); });
    dsm.ring = fxs(dsRingTex, '#fff0c8', true, 2.16); dsm.ring2 = fxs(ring2Tex, '#ffe2a8', true, 2.16);
    // 11/11（refine，评审：「书化进光里时，书页先没了，封面的两条边还剩一个亮的 L 形细框」）：书化掉的后半段前面盖一层暖白柔光（veil，画在书前面），缩没那一刻闪一颗星（star）
    //   veil 是普通混合（盖住书，不是往上叠亮）：中间一大片几乎不透明的暖白，边上柔柔地淡掉
    const rbVeilTex = radial([[0, 'rgba(255,249,236,1)'], [0.42, 'rgba(255,246,228,.97)'], [0.7, 'rgba(255,238,204,.5)'], [1, 'rgba(255,230,190,0)']]);
    const rbVeil = new THREE.Sprite(new THREE.SpriteMaterial({ map: rbVeilTex, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, depthTest: false, fog: false })); rbVeil.renderOrder = 2.06; E.scene.add(rbVeil); all.push(rbVeil);
    const rbStar = fxs(glintTex, '#fffaf0', false, 2.07);
    const motes = Array.from({ length: 10 }, () => ({ core: fxs(moteTex, '#ffd77a'), star: fxs(glintTex, '#fff6dc'), tr: Array.from({ length: 6 }, () => fxs(moteTex, '#ffc960')), land: fxs(moteTex, '#fff0cc'), ring: fxs(glintTex, '#fff4d8') }));   // 光点比光片饱和、亮一截（金色的一团 + 白色星光），在碎片里一眼看得出来
    // 11/10（光盾）：主角规则书（甩出去、截住陨石、翻开放出光盾的那一本；著书那段还是原来那本）：红色硬皮、烫金封面「规则书」、书口烫金、有厚度，
    //   封面连着书脊能翻开（RB.cover 绕书脊转），翻开后首页发光。局部坐标：x 宽（书脊在 -x）、y 高、z 厚（封面朝 +z）。0.5 × 0.68 × 0.13
    const RBW = 0.5, RBH = 0.68, RBD = 0.13, RBC = 0.022;
    const gold = (g, x0, y0, x1, y1) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, '#fff3c4'); gr.addColorStop(0.45, '#f4c04a'); gr.addColorStop(0.75, '#c88a1c'); gr.addColorStop(1, '#ffe08a'); return gr; };
    const leatherBg = (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#c4332b'); gr.addColorStop(0.55, '#a5221d'); gr.addColorStop(1, '#7e1714'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      let sd2 = 5; const rr = () => (sd2 = (sd2 * 16807) % 2147483647) / 2147483647; for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(${rr() > 0.5 ? '255,200,180' : '40,0,0'},${0.04 + rr() * 0.05})`; g.fillRect(rr() * w, rr() * h, 2 + rr() * 3, 2 + rr() * 3); } };
    const cloudPath = new Path2D('M28.993,27.9952689 L11.487,27.9762689 C9.121,27.9742689 7.154,26.1292689 7.012,23.7752689 C7.004,23.6522689 7,23.5262689 7,23.3972689 C7,20.2992689 9.091,19.2872689 10.337,18.9592689 C10.577,18.8962689 10.735,18.6662689 10.707,18.4192689 C10.676,18.1492689 10.659,17.8752689 10.659,17.5962689 C10.659,15.1322689 12.308,12.4822689 14.415,11.5632689 C15.359,11.1502689 16.232,10.9862689 17.023,10.9862689 C19.276,10.9862689 20.867,12.3152689 21.561,13.0332689 C22.329,13.8262689 22.927,14.8382689 23.34,16.0422689 C23.4,16.2192689 23.555,16.3472689 23.74,16.3742689 C23.918,16.4012689 24.109,16.3232689 24.219,16.1712689 C24.807,15.3502689 25.766,14.9822689 26.659,15.2392689 C27.782,15.5602689 28.516,16.7272689 28.62,18.3072689 C28.578,18.5762689 28.759,18.8292689 29.027,18.8772689 C30.222,19.0892689 33,19.9572689 33,23.4402689 C33,27.5892689 29.114,27.9822689 28.993,27.9952689 M29.594,17.9742689 C29.379,16.0672689 28.4,14.6962689 26.934,14.2782689 C25.899,13.9822689 24.811,14.2452689 23.989,14.9502689 C23.553,13.9362689 22.979,13.0602689 22.28,12.3382689 C20.023,10.0052689 16.933,9.37226889 14.014,10.6462689 C11.531,11.7302689 9.659,14.7182689 9.659,17.5962689 C9.659,17.7702689 9.665,17.9432689 9.676,18.1142689 C8.319,18.5732689 6,19.8752689 6,23.3972689 C6,23.5492689 6.004,23.6962689 6.014,23.8382689 C6.188,26.7162689 8.593,28.9732689 11.486,28.9762689 L29.034,28.9932689 C29.084,28.9892689 34,28.5192689 34,23.4402689 C34,19.5022689 31.003,18.3142689 29.594,17.9742689');
    // 亚马逊云科技架构图标里那个「云」（AWS Cloud 分组图标的云朵轮廓，不是公司 logo），烫金、在书名上面
    const cloudAt = (g, cx, cy, sc) => { g.save(); g.translate(cx, cy); g.scale(sc, sc); g.translate(-20, -19.5); g.fill(cloudPath, 'evenodd'); g.restore(); };
    const rbCoverTex = ctex(512, 704, (g, w, h) => { leatherBg(g, w, h);
      g.strokeStyle = gold(g, 0, 0, w, h); g.lineWidth = 10; g.strokeRect(26, 26, w - 52, h - 52); g.lineWidth = 3; g.strokeRect(46, 46, w - 92, h - 92);
      g.fillStyle = gold(g, 0, 0, w, h); [[26, 26, 1, 1], [w - 26, 26, -1, 1], [26, h - 26, 1, -1], [w - 26, h - 26, -1, -1]].forEach(([x, y, sx, sy]) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x + sx * 70, y); g.lineTo(x + sx * 70, y + sy * 14); g.lineTo(x + sx * 14, y + sy * 14); g.lineTo(x + sx * 14, y + sy * 70); g.lineTo(x, y + sy * 70); g.closePath(); g.fill(); });   // 四角包金
      g.shadowColor = 'rgba(40,0,0,.9)'; g.shadowBlur = 0; g.shadowOffsetX = 3; g.shadowOffsetY = 4;
      g.fillStyle = gold(g, 0, 120, 0, 230); cloudAt(g, w / 2, 178, 4.4);
      g.font = '900 128px "PingFang SC", "Hiragino Sans GB", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = gold(g, 0, 300, 0, 430); g.fillText('规则书', w / 2, 368);
      g.shadowOffsetX = 2; g.shadowOffsetY = 3; g.fillRect(118, 452, w - 236, 5);
      g.font = '800 54px "PingFang SC", "Hiragino Sans GB", sans-serif'; g.fillStyle = gold(g, 0, 480, 0, 560); g.fillText('云上大亨', w / 2, 516);
      g.font = '700 26px "PingFang SC", sans-serif'; g.fillText('User Group', w / 2, 600); });
    const rbBackTex = ctex(256, 352, (g, w, h) => { leatherBg(g, w, h); g.strokeStyle = gold(g, 0, 0, w, h); g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h - 28); });
    const rbSpineTex = ctex(64, 704, (g, w, h) => { leatherBg(g, w, h); g.fillStyle = gold(g, 0, 0, w, 0); [60, 84, 620, 644].forEach(y => g.fillRect(0, y, w, 9)); });
    // 11/10（refine2，评审：「翻开以后大半是灰白两片，左边那片像灰色纸板盖子，红皮不见了」）：封面里侧是红色书皮（包边）+ 一道烫金细线；左右两边都是一叠暖白的书页（左边那叠贴在封面里侧，翻开时才长出厚度），
    //   书页上的线和小云朵是烫金色，书页自己发光（emissive 跟着翻开调高）
    const rbEndTex = ctex(256, 352, (g, w, h) => { leatherBg(g, w, h); g.strokeStyle = gold(g, 0, 0, w, h); g.lineWidth = 4; g.strokeRect(8, 8, w - 16, h - 16); });
    const rbPageLTex = ctex(256, 352, (g, w, h) => { g.fillStyle = '#fff7e2'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(214,160,60,.9)'; g.lineWidth = 4; g.strokeRect(22, 22, w - 44, h - 44);
      g.fillStyle = 'rgba(214,160,60,.95)'; cloudAt(g, w / 2, 120, 2.6); g.fillStyle = 'rgba(205,150,50,.7)'; for (let k = 0; k < 6; k++) g.fillRect(52, 196 + k * 20, w - 104 - (k % 3 === 2 ? 40 : 0), 5); });
    const rbPageTex = ctex(256, 352, (g, w, h) => { g.fillStyle = '#fff7e2'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(200,146,52,.62)'; for (let k = 0; k < 13; k++) g.fillRect(30, 70 + k * 20, w - 60 - (k % 4 === 3 ? 60 : 0), 5); g.fillStyle = 'rgba(214,160,60,.9)'; g.fillRect(30, 34, 120, 12); });
    const rbEdgeTex = (vert) => ctex(vert ? 128 : 16, vert ? 16 : 128, (g, w, h) => { g.fillStyle = '#f7d77a'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(170,110,20,.45)'; for (let k = 0; k < 24; k++) { if (vert) g.fillRect(k * w / 24, 0, 1.5, h); else g.fillRect(0, k * h / 24, w, 1.5); } });   // 书口烫金（一页页的细线）
    const rbM = (map, ei = 0.32, extra = {}) => new THREE.MeshStandardMaterial({ map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: ei, roughness: 0.55, metalness: 0.05, ...extra });
    const rbLeather = rbM(rbBackTex, 0.28), rbCov = rbM(rbCoverTex, 0.34), rbEnd = rbM(rbEndTex, 0.3), rbPage = rbM(rbPageTex, 0.35), rbPageL = rbM(rbPageLTex, 0.35), rbEdgeS = rbM(rbEdgeTex(true), 0.4), rbEdgeT = rbM(rbEdgeTex(false), 0.4), rbSp = rbM(rbSpineTex, 0.3);
    const RB = grp(), RBi = new THREE.Group(); RB.add(RBi);
    // 封面、封底比书页大一圈（宽 +0.036、高 +0.05，书皮包边），翻开时书页四周露出一圈红皮
    const RBX = 0.036, RBY = 0.05;
    { const back = new THREE.Mesh(new THREE.BoxGeometry(RBW + RBX, RBH + RBY, RBC), [rbLeather, rbLeather, rbLeather, rbLeather, rbLeather, rbLeather]); back.position.set(RBX / 2 - 0.006, 0, -RBD / 2 + RBC / 2); RBi.add(back);
      const pg = new THREE.Mesh(new THREE.BoxGeometry(RBW - 0.012, RBH - 0.004, RBD - 2 * RBC), [rbEdgeS, rbEdgeS, rbEdgeT, rbEdgeT, rbPage, rbPage]); pg.position.set(0.006, 0, 0); RBi.add(pg);
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.022, RBH + RBY, RBD), [rbSp, rbSp, rbSp, rbSp, rbSp, rbSp]); sp.position.set(-RBW / 2 - 0.006, 0, 0); RBi.add(sp); }
    const RBcov = new THREE.Group(); RBcov.position.set(-RBW / 2, 0, RBD / 2 - RBC / 2); RBi.add(RBcov);
    { const cv = new THREE.Mesh(new THREE.BoxGeometry(RBW + RBX, RBH + RBY, RBC), [rbLeather, rbLeather, rbLeather, rbLeather, rbCov, rbEnd]); cv.position.set((RBW + RBX) / 2 - 0.006, 0, 0); RBcov.add(cv); }
    // 左边那叠书页：贴在封面里侧（RBL.scale.z 跟着翻开从 0.02 长到 1），关着的时候夹在封面和书页之间、看不见
    const RBL = new THREE.Mesh(new THREE.BoxGeometry(RBW - 0.012, RBH - 0.004, 0.034), [rbEdgeS, rbEdgeS, rbEdgeT, rbEdgeT, rbPageL, rbPageL]); RBL.geometry.translate(0, 0, -0.017);
    RBL.position.set(RBW / 2 + 0.006, 0, -RBC / 2); RBL.scale.z = 0.02; RBcov.add(RBL);
    // 翻开以后轻轻翻动的两页（绕书脊转，翻到左边就看不出来了）
    const RBF = [0, 1].map(() => { const f = new THREE.Group(), pgm = new THREE.Mesh(new THREE.PlaneGeometry(RBW - 0.02, RBH - 0.012), rbM(rbPageTex, 0.35, { side: THREE.DoubleSide })); pgm.position.x = (RBW - 0.02) / 2;
      f.add(pgm); f.position.set(-RBW / 2 + 0.008, 0, RBD / 2 - RBC + 0.0015); f.visible = false; RBi.add(f); return f; });
    // 翻开以后首页上的光：一层叠加的暖金光（书页中间最亮，往外柔柔地退），外面一团光晕
    const rbLightTex = ctex(256, 352, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, h * 0.62); gr.addColorStop(0, 'rgba(255,250,232,1)'); gr.addColorStop(0.45, 'rgba(255,214,140,.75)'); gr.addColorStop(1, 'rgba(255,170,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,240,.55)'; for (let k = 0; k < 13; k++) g.fillRect(30, 70 + k * 20, w - 60 - (k % 4 === 3 ? 60 : 0), 5); });
    const RBlit = new THREE.Mesh(new THREE.PlaneGeometry(RBW - 0.03, RBH - 0.03), add(null, { map: rbLightTex, opacity: 0, color: '#ffe2a8' })); RBlit.position.set(0.006, 0, RBD / 2 - RBC + 0.003); RBi.add(RBlit);
    const RBlit2 = new THREE.Mesh(new THREE.PlaneGeometry(RBW - 0.03, RBH - 0.03), add(null, { map: rbLightTex, opacity: 0, color: '#ffe2a8', side: THREE.DoubleSide })); RBlit2.position.set(RBW / 2 + 0.006, 0, -RBC / 2 - 0.036); RBcov.add(RBlit2);
    const RBglow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffd28a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); RB.add(RBglow);
    // 甩书的拖尾：沿着书走过的路线拉一条朝镜头的带子（头宽尾细、暖金色，叠加混合），每帧按书最近 0.07 秒走过的位置重算。
    //   11/10（refine2，评审：「拖尾是一条发白、硬边、半透明的扁带，像塑料条」）：横向贴一张两边羽化的贴图（中间亮、两边柔柔地淡到 0），颜色压在金色（不发白）；
    //   出手那一下带子更宽（挥出去的弧形残影），另外沿路线撒几颗一闪就灭的小火星（rbSpk）
    const RTN = 32, rtGeo = new THREE.BufferGeometry(); rtGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(RTN * 2 * 3), 3)); rtGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(RTN * 2 * 3), 3));
    { const uv = new Float32Array(RTN * 4); for (let i = 0; i < RTN; i++) { uv[i * 4] = uv[i * 4 + 2] = i / (RTN - 1); uv[i * 4 + 1] = 0; uv[i * 4 + 3] = 1; } rtGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); }
    { const ix = []; for (let i = 0; i < RTN - 1; i++) { const a = i * 2; ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } rtGeo.setIndex(ix); }
    const featherTex = ctex(4, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); [[0, 0], [0.18, 0.12], [0.36, 0.55], [0.5, 1], [0.64, 0.55], [0.82, 0.12], [1, 0]].forEach(([k, a]) => gr.addColorStop(k, `rgba(255,255,255,${a})`)); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const rbTrail = new THREE.Mesh(rtGeo, new THREE.MeshBasicMaterial({ map: featherTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })); rbTrail.frustumCulled = false; rbTrail.renderOrder = 2.5; E.scene.add(rbTrail); all.push(rbTrail);
    const rbSpk = Array.from({ length: 9 }, () => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffc45a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); m.renderOrder = 2.6; E.scene.add(m); all.push(m); return m; });
    // 11/10（光盾）：挡下流星以后「天亮了」：一层叠加在夜空上的晨光（地平线、棋盘那一带透出暖金 / 桃色，往上很快退掉，头顶还是深蓝），k 每帧由 runMain 给
    //   11/10（refine2，评审：「上半部分一直是深紫偏品红的夜空，晨光只在地平线一窄条，像黑夜里一个暖色泡泡」）：暖金 / 桃色那一带抬到画面中部（往上退得慢一些），
    //   往上是一层很淡的蓝（夜空从紫往深蓝推、亮一点），地平线后面（棋盘背后、太阳快出来的方向）散出几道很淡的晨光光束
    const dawnM = new THREE.ShaderMaterial({ uniforms: { k: { value: 0 }, lt: { value: 0 } }, transparent: true, depthWrite: false, depthTest: true, blending: THREE.NormalBlending, side: THREE.BackSide,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float k, lt; varying vec3 vD;
        void main(){ float el = vD.y; vec2 hz = normalize(vD.xz + 1e-5); float az = 0.45 + 0.55 * pow(max(0.0, dot(hz, normalize(vec2(-0.12, -1.0)))), 1.3);
          float band = exp(-pow((el + 0.07) / 0.17, 2.0)), up = exp(-max(0.0, el + 0.02) / 0.2) * smoothstep(-0.45, -0.1, el), hi = smoothstep(-0.02, 0.45, el);
          vec3 S = normalize(vec3(-0.12, -0.16, -1.0)), tA = normalize(cross(S, vec3(0.0, 1.0, 0.0))), tB = cross(tA, S); float ds = acos(clamp(dot(vD, S), -1.0, 1.0)), ang = atan(dot(vD, tA), dot(vD, tB));
          float ray = pow(0.5 + 0.5 * sin(ang * 11.0 + 1.3) * sin(ang * 7.0 - 0.4), 3.0) * smoothstep(0.12, 0.45, ds) * (1.0 - smoothstep(0.55, 1.25, ds)) * smoothstep(-0.12, 0.02, el);
          float wW = clamp((band * 0.62 + up * 0.3 + ray * 0.1) * az, 0.0, 0.85), wB = hi * 0.32 * (1.0 - wW);
          vec3 cW = mix(vec3(1.0, 0.72, 0.52), vec3(1.0, 0.84, 0.56), smoothstep(-0.15, 0.1, el)), cB = vec3(0.1, 0.15, 0.33);
          gl_FragColor = vec4((cW * wW + cB * wB) / max(wW + wB, 1e-4), (wW + wB) * k);   // 普通混合：晨光盖住原来的紫色（叠加的话紫 + 金是一片粉紫）；同上，颜色按画面上的值给
          // 11/10（打开）：光盾打开的时候天更亮（lt，runMain 给）：地平线那一带的暖金往上铺开一些、光束亮一点，头顶从深蓝推成清一点的晨蓝；lt = 0 时不走这里（和原来逐像素一样）
          if (lt > 0.0) { float wW2 = clamp((band * 0.62 * (1.0 + 0.3 * lt) + up * 0.3 * (1.0 + 0.9 * lt) + ray * 0.1 * (1.0 + 2.0 * lt)) * az, 0.0, 0.85 + 0.08 * lt), wB2 = hi * (0.32 + 0.3 * lt) * (1.0 - wW2);
            vec3 cW2 = mix(cW, vec3(1.0, 0.9, 0.7), 0.35 * lt), cB2 = mix(cB, vec3(0.22, 0.36, 0.62), lt); gl_FragColor = vec4((cW2 * wW2 + cB2 * wB2) / max(wW2 + wB2, 1e-4), (wW2 + wB2) * k); }
        }` });
    const dawn = new THREE.Mesh(new THREE.SphereGeometry(150, 48, 24), dawnM); dawn.renderOrder = -9; dawn.frustumCulled = false; E.scene.add(dawn); all.push(dawn);
    // 金色光柱：韩叔从棋盘中央升起
    const pillarTex = ctex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,214,120,0)'); gr.addColorStop(0.4, 'rgba(255,214,120,.55)'); gr.addColorStop(1, 'rgba(255,240,200,.9)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    // 光束着色器（原来是一张不透明似的米色长方形、左右边缘很硬，挡掉了后面的星星）：横向按视线和表面的夹角衰减（中间亮、两边透明，看起来是圆柱形的一束光），
    // 底下贴着棋盘淡进来、往上渐渐淡掉；一层往上滚的光纹 + 往上飘的光尘；叠加混合，最亮处不超过约 0.5，后面的星星透得过来。op 每帧由 runMain 给
    const pillarM = new THREE.ShaderMaterial({ uniforms: { op: { value: 0 }, tm: { value: 0 }, col: { value: new THREE.Color('#ffd590') } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
      vertexShader: 'varying vec2 vU; varying float vF; void main(){ vU = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vec3 n = normalize(normalMatrix * normal); vF = abs(dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }',
      fragmentShader: `uniform float op, tm; uniform vec3 col; varying vec2 vU; varying float vF;
        float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main(){ float y = vU.y, core = pow(vF, 3.2), edge = pow(vF, 1.3), ends = smoothstep(0.0, 0.012, y) * (1.0 - smoothstep(0.12, 0.7, y));
          float n = 0.8 + 0.2 * sin(y * 90.0 - tm * 7.0 + vU.x * 37.7) * sin(y * 37.0 - tm * 4.0 - vU.x * 75.4);
          vec2 g = vec2(vU.x * 40.0, y * 160.0 - tm * 9.0), id = floor(g), f = fract(g); float hh = h2(id);
          float dust = step(0.9, hh) * smoothstep(0.3, 0.0, length(f - 0.5 - (vec2(h2(id + 3.1), h2(id + 7.7)) - 0.5) * 0.5)) * (0.55 + 0.45 * sin(tm * 9.0 + hh * 40.0));
          gl_FragColor = vec4((col * (core * 0.95 + edge * 0.22) * n + vec3(1.0, 0.93, 0.72) * dust * edge * 1.3) * ends * op, 1.0);
          #include <colorspace_fragment>
        }` });
    const pillar = grp(); pillar.add(new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 30, 40, 1, true), pillarM));
    pillar.children[0].position.y = 15;
    // 空中的冲击波光环
    const ring = grp(); ring.add(new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 128), add(null, { color: '#ffd27a', side: THREE.DoubleSide })));
    // 人物
    // 四个人都用他们给的角色设定图（五视图 + 动作）；哪个人没有设定图就退回捏的 Q 版
    const C = window.CHIBI_CAST, SP = (window.PROMO_DATA && PROMO_DATA.sprites) || {};
    // 黑化头像不是立牌、也不在 props 里（promo_full.js 只预先解码 props 和名牌头像）：这里先解码一遍，第一次弹出来那一帧不会是空的
    if (SP.han) DHIM = ['darkhead', 'darkhead_sad', 'darkhead_angry'].filter(k => SP.han[k]).map(k => { const im = new Image(); im.src = SP.han[k].src; if (im.decode) im.decode().catch(() => {}); return im; });
    const spr = (who, o, h) => SP[who] ? makeSpriteChibi(E, SP[who], h) : makeChibi(E, o);
    const han = spr('han', C.han, 2.1), hanD = spr('han', C.hanDark, 2.1), chong = spr('chong', window.CHIBI_CHONG, 1.9), yuki = spr('yuki', C.yuki, 2.0), damo = spr('damo', C.damo, 1.9);
    [han, chong, yuki, damo].forEach(c => { E.scene.add(c.g); all.push(c.g); });
    // 11/10（refine）：光爆时韩叔的逆光轮廓光：用他当前那张立牌的透明度（不取颜色，黑头发也亮）、放大 1.06、往后挪 0.02，金色叠加；
    //   前面的立牌写深度，把中间挡掉，只剩轮廓外面柔柔的一圈（片元里沿一圈取 12 个点平均，边是软的）。立牌换图、镜像、压扁都跟着 plane 走（排在它后面画）
    const hanRim = han.plane ? (() => { const m = new THREE.Mesh(han.plane.geometry, new THREE.ShaderMaterial({ uniforms: { map: { value: han.mat.map }, color: { value: new THREE.Color('#ffc65c') }, op: { value: 0 }, dir: { value: new THREE.Vector2(0.7, 0.7) }, mir: { value: 1 } },
        transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform sampler2D map; uniform vec3 color; uniform float op, mir; uniform vec2 dir; varying vec2 vUv;
          void main(){ vec2 d = vec2(dir.x * mir, dir.y), c = vUv - d * vec2(0.022, 0.016); float a = 0.0; for (int i = 0; i < 12; i++) { float t = float(i) * 0.5236; a += texture2D(map, c + vec2(cos(t) * 0.012, sin(t) * 0.009)).a; } a = a / 12.0;
            a *= 0.25 + 0.75 * smoothstep(-0.35, 0.55, dot(normalize(vUv - vec2(0.5, 0.45) + 1e-4), d));   // 侧逆光：光从哪边来（dir，画面方向），轮廓光就亮在哪边
            gl_FragColor = vec4(color, a * op * (0.45 + 0.55 * smoothstep(0.2, 0.8, vUv.y)));
            #include <colorspace_fragment>
          }` }));
      m.renderOrder = 1.5; m.matrixAutoUpdate = false; m.frustumCulled = false; m.visible = false;
      const L = new THREE.Matrix4().makeTranslation(0, 0.5, -0.02).multiply(new THREE.Matrix4().makeScale(1.06, 1.06, 1)).multiply(new THREE.Matrix4().makeTranslation(0, -0.5, 0));
      m.onBeforeRender = (r, sc, cam) => { m.material.uniforms.map.value = han.plane.material.map; m.material.uniforms.mir.value = han.plane.scale.x < 0 ? -1 : 1; m.matrixWorld.multiplyMatrices(han.plane.matrixWorld, L); };
      han.R.add(m); return m; })() : null;
    // 11/09（refine）：韩叔的两张立牌不做视锥剔除。立牌的大小是画的时候（onBeforeRender）才设的，没画过以前包围球还是 1×1 的默认大小：
    //   他从棋盘面底下钻出来时（runMain o 2.3–2.4），那个小包围球在画面外，被剔掉、皇冠已经露出棋盘了也不画（晚一帧才一下子冒出半个人）
    if (han.sprite) han.R.children.forEach(m => { m.frustumCulled = false; });
    // 三年后：他站在金币山上，买来的奖杯摆在脚边
    const throne = grp(); throne.position.copy(THR); throne.add(makeCoinPile());
    throne.add(hanD.g); hanD.g.position.set(0, hanD.frame ? 0.36 : 0.5, 0.05); hanD.blob.visible = false;
    const trophy = makeTrophy(); throne.add(trophy); trophy.position.set(-2.35, 0.1, 0.45); trophy.scale.setScalar(0.85);
    // Damo 打在大骰子上的那一拳（设定图里的「一拳出击」特效）
    let fist = null;
    if (SP.damo && SP.damo.punch) { const t = new THREE.TextureLoader().load(SP.damo.punch.src, tt => { if (E.renderer && E.renderer.initTexture) E.renderer.initTexture(tt); }); t.colorSpace = THREE.SRGBColorSpace;
      fist = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, fog: false })); fist.renderOrder = 5; fist.userData.ar = SP.damo.punch.w / SP.damo.punch.h; E.scene.add(fist); all.push(fist); }
    // 闪电（劈在王座旁边的空地上，不劈人）
    const path = new THREE.CurvePath(), TG = V(2.4, 0.05, 0.4); let prev = V(4.0, 16, -3.0), s3 = 5;
    for (let k = 1; k <= 11; k++) { s3 = (s3 * 16807) % 2147483647; const u = k / 11, j = (s3 / 2147483647 - 0.5) * 1.2 * (1 - u);
      const p = k === 11 ? TG.clone() : V(4.0 + (TG.x - 4.0) * u + j, 16 - (16 - TG.y) * u, -3.0 + (TG.z + 3.0) * u + j * 0.5); path.add(new THREE.LineCurve3(prev, p)); prev = p; }
    const bolt = grp();
    bolt.add(new THREE.Mesh(new THREE.TubeGeometry(path, 220, 0.05, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false })));
    bolt.add(new THREE.Mesh(new THREE.TubeGeometry(path, 220, 0.2, 8), add(null, { color: '#b48cff', opacity: 0.45 })));
    // 黑化的紫色魔气
    const auraTex = radial([[0, 'rgba(170,90,255,.7)'], [0.5, 'rgba(110,40,200,.3)'], [1, 'rgba(60,0,120,0)']]);
    const aura = grp(); for (let k = 0; k < 26; k++) aura.add(new THREE.Sprite(new THREE.SpriteMaterial({ map: auraTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
    // 一拳打碎的大骰子
    const dieFace = n => ctex(256, 256, (g, w) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, w); g.strokeStyle = '#d5dbdb'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, w - 10);
      const P = { 1: [[0.5, 0.5]], 2: [[0.28, 0.28], [0.72, 0.72]], 3: [[0.26, 0.26], [0.5, 0.5], [0.74, 0.74]], 4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
        5: [[0.26, 0.26], [0.74, 0.26], [0.5, 0.5], [0.26, 0.74], [0.74, 0.74]], 6: [[0.28, 0.24], [0.72, 0.24], [0.28, 0.5], [0.72, 0.5], [0.28, 0.76], [0.72, 0.76]] }[n];
      P.forEach(([x, y]) => { g.fillStyle = n === 1 ? '#e5484d' : '#16191f'; g.beginPath(); g.arc(x * w, y * w, n === 1 ? 38 : 26, 0, 7); g.fill(); }); });
    const bigDie = grp(); bigDie.add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), [1, 6, 2, 5, 3, 4].map(n => new THREE.MeshStandardMaterial({ map: dieFace(n), roughness: 0.35 })))); bigDie.children[0].castShadow = true;
    const shards = grp(), shardM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35 }), dotM = new THREE.MeshStandardMaterial({ color: '#16191f', roughness: 0.4 });
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) { if (!x && !y && !z) continue;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), shardM); m.castShadow = true; m.userData.o = new THREE.Vector3(x, y, z); shards.add(m);
      if ((x + y + z) % 2 === 0) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), dotM); d.position.set(0, 0, 0.235); m.add(d); } }
    // Damo 的「流星」：一团火光
    const fire = grp(); fire.add(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); fire.children[0].scale.setScalar(4);
    const ftr = new THREE.Mesh(trailGeo, add(null, { map: trailTex, side: THREE.DoubleSide })); ftr.scale.setScalar(0.45); fire.add(ftr);
    // 封神那段摆在棋盘中间的 User Group 冠军奖杯（三年后被他用钱买走）：底座 + 奖杯 + 一圈光
    const cup = grp(); const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.5, 32), new THREE.MeshStandardMaterial({ color: '#2b3445', roughness: 0.5 })); ped.position.y = 0.25; ped.castShadow = true;
    const cupT = makeTrophy(); cupT.position.y = 0.5; cupT.scale.setScalar(1.3); const cupG = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffd27a', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); cupG.position.y = 0.95; cupG.scale.setScalar(2.4);
    cup.add(ped, cupT, cupG);
    const chairs = grp(); [['#2f7cf6', [0.8, -0.1, -7.0], 0], ['#1f9d55', [-8.8, -0.1, -0.4], -Math.PI / 2], ['#9b5cf6', [8.8, -0.1, -0.4], Math.PI / 2]].forEach(([col, p, ry]) => {
      const c = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.55 }), leg = new THREE.MeshStandardMaterial({ color: '#2b3445', roughness: 0.6 });
      const bx = (w, h, d, mat, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); b.position.set(x, y, z); b.castShadow = true; c.add(b); };
      bx(0.9, 0.12, 0.85, m, 0, 0.62, 0); bx(0.9, 0.9, 0.1, m, 0, 1.1, -0.38); [[-0.38, -0.35], [0.38, -0.35], [-0.38, 0.35], [0.38, 0.35]].forEach(([x, z]) => bx(0.08, 0.6, 0.08, leg, x, 0.3, z));
      c.position.set(...p); c.rotation.y = ry; chairs.add(c); });
    const puffs = [0, 1, 2, 3].map(() => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false })); E.scene.add(m); all.push(m); return m; });   // 人物化成的一团白烟
    // 11/05（L12 闪电换图）：韩叔黑化那一下脚边炸开的黑紫色烟（同一张 cloudTex 染成深紫，正常混合；renderOrder 3 排在立牌后面画，位置往镜头这边挪，盖得住小弟）
    const dsmk = Array.from({ length: 8 }, (_, k) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: [0x1e0e2c, 0x3a1a5e, 0x2a1442, 0x55298a][k % 4], transparent: true, depthWrite: false, fog: false })); m.renderOrder = 3; E.scene.add(m); all.push(m); return m; });
    // ---------- 道具 / 表情：设定图「细节元素」「表情设计」切出来的图（PROMO_DATA.props）。哪张没有就退回原来的样子（6 个模式宣传片没有 props） ----------
    const PR = (window.PROMO_DATA && PROMO_DATA.props) || {}, ptx = {}, cv = new THREE.Vector3();
    const ptex = n => { if (!PR[n]) return null; if (!ptx[n]) { const t = ptx[n] = new THREE.Texture(), im = new Image(); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; im.onload = () => { t.image = im; t.needsUpdate = true; if (E.renderer && E.renderer.initTexture) E.renderer.initTexture(t); }; im.src = PR[n].src; } return ptx[n]; };
    // 立在地上的道具：和人物立牌一样只绕竖轴转向镜头（底边 = 脚底）、一样的受光 + 自发光；userData.roll 让它绕底边歪一歪
    const stand = (n, h, par = E.scene) => { const T = ptex(n); if (!T) return null; const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: T, emissive: '#ffffff', emissiveMap: T, emissiveIntensity: 0.5, roughness: 0.95, transparent: true, alphaTest: 0.06, side: THREE.DoubleSide }));
      m.userData = { w: h * PR[n].w / PR[n].h, h, roll: 0 }; m.scale.set(m.userData.w, h, 1);
      m.onBeforeRender = (r, s, cam) => { cv.copy(cam.position); m.parent.worldToLocal(cv); m.rotation.set(0, Math.atan2(cv.x - m.position.x, cv.z - m.position.z), m.userData.roll); m.updateMatrix(); m.updateMatrixWorld(true); };
      par.add(m); all.push(m); return m; };
    // 飘在空中的道具：始终正对镜头的小贴片。不写深度，renderOrder 2 排在人物立牌（1）后面画，挡没挡住按深度判断
    const sprt = (n, par = E.scene, ro = 2) => { const T = ptex(n); if (!T) return null; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T, transparent: true, depthWrite: false, fog: false }));
      s.renderOrder = ro; s.userData.ar = PR[n].w / PR[n].h; par.add(s); all.push(s); return s; };
    const pp = {
      cupT: stand('han_trophy', 1.0, cup),                                   // ② 著书：棋盘上展示的冠军奖杯（杯身写着 User Group），底座留着
      scrolls: [],   // 飞向格子的全是普通书页（虫虫、Yuki 那时还没登场，不混他们的地图卷轴）
      trophy: stand('han_trophy', 0.8, throne),                              // ③ 黑化后脚边的奖杯
      shades: sprt('han_shades'), chain: sprt('han_chain'),                  // 黑化前从天上落到他身上的墨镜、金链
      flames: PR.han_flame ? Array.from({ length: 8 }, () => sprt('han_flame', throne, 0)) : [],   // 王座周围的紫火（在他身后，排在立牌前面先画）
      pawn: stand('han_pawn', 1.15),                                         // 没人陪他玩：空棋盘上孤零零的一颗红棋子
      buddy: stand('yuki_buddy', 0.74),                                      // ④ 跟着 Yuki 跑进来的小伙伴
      fball: sprt('damo_fireball'),                                          // Damo 的「流星」：一拳特效火球
      pf: { chong: sprt('chong_scroll'), damo: sprt('damo_cloudpawn'), han: sprt('han_pawn') },   // ⑤ 变棋子时烟里先闪出来的道具棋子（Yuki 的是小伙伴本身）
    };
    pp.flames.forEach(f => f.center.set(0.5, 0.06));
    if (pp.fball) pp.fball.center.set(0.5, 0.4);   // 火球的球心在图里 (0.5, 0.6)（从上往下量），转角度绕球心转
    if (pp.cupT) { cupT.visible = false; pp.cupT.position.y = 0.5; }
    if (pp.trophy) { trophy.visible = false; pp.trophy.position.set(-2.35, 0.02, 0.45); }   // 摆在金币山外面的棋盘上（x -2.35）：Yuki 在王座前跳起来振臂时不会叠在他头顶
    const grid = E.scene.children.find(o => o.type === 'GridHelper');
    const base = E.scene.children.filter(o => o.isHemisphereLight || o.isDirectionalLight).map(l => [l, l.intensity]);
    // 灯光颜色、雾也记下原样：开头两拍（白天 → 暗下来 → 末日）改了它们，每帧 reset 时还原
    const baseC = base.map(([l]) => [l, l.color.clone(), l.groundColor ? l.groundColor.clone() : null]), fog0 = E.scene.fog ? [E.scene.fog.color.clone(), E.scene.fog.near, E.scene.fog.far] : null;
    clouds.children.forEach(m => { m.userData.o0 = m.material.opacity; });   // 夜里的云原来的不透明度先记下（白天把它们藏起来，19.3 以后的淡出也按这个算）
    const W = buildWorld(E, all, { glowTex, cloudTex, trailGeo, trailTex });
    const sunL = E.scene.children.find(o => o.isDirectionalLight);   // 开头两拍把主光挪到太阳那边，每帧 reset 时放回原处
    A = { SP, PR, pp, fist, puffs, dsmk, skyM, flips, chairs, base, baseC, fog0, W, sunL, sun0: sunL.position.clone(), book, bookGlow, pageM, coverM, runes, hanRim, pages, bx, cup, all, sky, clouds, minis, shield, dsm, motes, rbVeil, rbStar, RB, RBi, RBcov, RBlit, RBlit2, RBL, RBF, RBpage: rbPage, RBpageL: rbPageL, RBglow, rbTrail, rbSpk, dawn, pillar, ring, han, hanD, chong, yuki, damo, throne, trophy: pp.trophy || trophy, bolt, aura, bigDie, shards, fire, grid, stage: document.querySelector('.stage') };
    all.forEach(g => { g.visible = false; });
    return A;
  }
  // 11/11（refine）：序章 T 13.9–15.1 韩叔换成侧 45° 立牌、翻牌（frame / sx），每帧先复原
  function reset(E) { const P = assets(E); P.all.forEach(g => { g.visible = false; });
    if (window.MASCOT_RIM && MASCOT_RIM.self) MASCOT_RIM.self.value = 0;
    // 网页播放前会把整条片子预跑一遍（预热着色器），结尾「变成棋子」会把人物缩到 0.001；每帧先恢复原大小，往回拖、重播时人物才不会消失
    [P.han, P.hanD, P.chong, P.yuki, P.damo].forEach(c => c.g.scale.setScalar(1)); if (P.han.frame) { P.han.frame(null); P.han.sx = 1; } if (P.han.mat) P.han.mat.emissiveIntensity = 0.5; if (P.hanRim) P.hanRim.visible = false; P.runes.forEach(m => { m.visible = false; }); P.pageM.color.set('#fffaf0'); P.pageM.emissive.setRGB(0, 0, 0); P.coverM.emissive.setRGB(0, 0, 0); P.throne.scale.setScalar(1); if (P.grid) { P.grid.visible = true; P.grid.material.opacity = 0.55; P.grid.material.depthWrite = true; } P.stage.style.background = ''; P.base.forEach(([l, i0]) => { l.intensity = i0; }); P.skyM.color.setRGB(1, 1, 1);
    P.baseC.forEach(([l, c, g]) => { l.color.copy(c); if (g) l.groundColor.copy(g); }); P.clouds.children.forEach(m => { if (m.userData.c0) m.material.color.copy(m.userData.c0); }); P.sunL.position.copy(P.sun0); if (P.fog0) { E.scene.fog.color.copy(P.fog0[0]); E.scene.fog.near = P.fog0[1]; E.scene.fog.far = P.fog0[2]; } }

  // ---------- 开头两拍的云上世界（只在 o 0 到 runMain 的 7.3 之间用）：天空穹顶、太阳、卡通云海、远处的积云、服务卡通和它们的玩具、末日流星雨 ----------
  // 时间一律用「序章绝对时间」A（旧时间：run 的 o 0–3.2，风平浪静往前补的那段是负的；runMain 的 o + PRO0，下面 mo = A - PRO0）；循环、闪烁按真实时间 CK.Ar，开头几刀的镜头、擦镜头按新时间 CK.An
  // 分镜（下面是原来的旧时间 A；新分镜见 SHOTS）：S1 0–0.95 建立镜头（太阳在画面里，镜头慢慢推；CloudFront 从前景冲浪掠过，Bedrock 在中景蹦床上翻跟头）→ 云朵擦过镜头 →
  //   S2 0.95–1.45 EC2 跳绳特写（SQS 在后面排队蹦过去，Lambda 从后面跑过）→ 云朵擦过镜头 →
  //   S3 1.45–2.98 抛球（接球落在 1.88 的铃声上）、S3 坐彩虹滑梯朝镜头滑下来（对准滑哨）、慢慢横移；2.34 一道影子从远处扫过来，大家一个接一个停下、SQS 撞成一串、
  //      RDS 被自己顶上去的球砸了头；转过身去看天，镜头越过它们的头顶摇上天：太阳被暗红的雾吞掉，旁边亮起一点红光，越来越大 →
  //   S5 2.98–mo 0.62 反打：一排脸被红光照亮，大流星从镜头上方呼啸而过、砸进它们身后的云海（mo 0 对重击）：白闪 → 火球 → 冲击波贴着云海推过来，把它们吹扁；
  //      各自吓一跳，末日的天压下来，流星雨四处砸，大家四散奔逃 → S6 mo 0.62–1.25 跟着被冲击波掀飞的 Lambda：拍在一朵白云上压扁、停一下、弹回来脸朝下拍在棋盘上 →
  //   S7 mo 1.25–1.9 低机位：各自躲好（S3 扣进桶里、SQS 叠罗汉发抖、DynamoDB 拆成三片分头藏、CloudFront 抱着地球缩成一团、EC2 躲在翘起来的格子后面探头），
  //      巨大的主流星压在头顶，把它们越照越亮 → 1.9 切回原来的镜头（天上的大流星、韩叔升起）
  const SUN = new THREE.Vector3(0.55, 0.1, -0.83).normalize();    // 太阳：右后方、低低的暖阳
  const KEY = new THREE.Vector3(0.48, 0.62, -0.62).normalize();   // 主光：和太阳同一个方位、高一点（影子不拖太长）
  const SWEEP = new THREE.Vector3(-0.55, 0, 0.83).normalize();    // 「直到那一天」影子扫过来的方向（从太阳那边往前扫）
  const SPOT = { ec2: [-3.6, 4.15], dyn: [-0.4, 2.6], rds: [1.7, 2.9], s3l: [3.4, 3.72], s3fly: [4.42, 3.92], isl: [4.7, 2.0, -1.7], bed: [-5.6, 1.35, 4.0], lam: [-0.8, 2.3] };
  const SLIDE = [[4.55, 2.62, -1.35], [4.62, 1.72, 0.05], [3.85, 0.72, 1.25], [3.6, 0.17, 2.3], [3.95, 0.075, 3.0]];   // 彩虹滑梯：从云朵小岛顶上 S 形弯下来，最后一段是平的出口（往右前方甩出去，S3 从这儿飞出去落在棋盘上）
  const BELL = [0.6, 0.92, 1.24, 1.56, 1.88];                      // 原配乐的五声铃
  // SQS 小队领头那只的路线（旧时间 τ → [x, z, 朝向]）：τ ≥ 0.6 是原来那条直线（z 3.5，x = −5.2 + 1.77τ）；0.6 以前（风平浪静补长的部分）在棋盘左边绕跑道形的圈：
  // 前边就是这条直线（x −5.4 → −3.9），右头半圆拐到后边（z 2.4，S2 里从 EC2 后面蹦过去、在左头拐回前边），左头半圆拐回来接上直线。后面两只照旧晚 0.62 / 1.77 一个身位
  // （第三轮风平浪静往前补的短了 1.6，左头从 −6.2 收到 −5.4：一圈 3.65 秒，S2 那 0.9 秒正好是它们在 EC2 后面掉头）
  const SQL = (() => { const z1 = 3.5, z0 = 2.4, r = (z1 - z0) / 2, zc = (z1 + z0) / 2, xa = -5.4, xb = -3.9, Ls = xb - xa, Lc = Math.PI * r, PER = 2 * Ls + 2 * Lc, v = 1.77, s06 = -5.2 + v * 0.6 - xa;
    const at = s => { s = ((s % PER) + PER) % PER;
      if (s < Ls) return [xa + s, z1, Math.PI / 2];
      s -= Ls; if (s < Lc) { const a = s / r; return [xb + r * Math.sin(a), zc + r * Math.cos(a), Math.PI / 2 + a]; }
      s -= Lc; if (s < Ls) return [xb - s, z0, -Math.PI / 2];
      s -= Ls; { const a = s / r; return [xa - r * Math.sin(a), zc - r * Math.cos(a), -Math.PI / 2 + a]; } };
    return tau => tau >= 0.6 ? [-5.2 + v * tau, z1, Math.PI / 2] : at(s06 + v * (tau - 0.6)); })();
  const S3P = -0.68;   // S3 在小岛上蹦着玩到这儿（旧时间；铃声网格上一轮的起点），之后站定冲镜头挥手（原来的戏）
  // 末日流星：[撞击时刻（mo）, x, z, 大小]。第一颗就是「直到那一天」天边那点红光，砸在卡通们身后（棋盘左前方的云海）
  const IMPS = [[0.0, -9.6, 11.0, 2.1], [0.16, 10.5, -8.5, 1.1], [0.24, -15.5, -3, 1.2], [0.3, 4.5, 15.5, 1.15], [0.36, -4.2, -15.5, 1.3], [0.45, -6.8, 5.6, 0.75],
    [0.5, 14.5, 4.5, 1.15], [0.58, -20, 9, 1.3], [0.64, 18, -14, 1.2], [0.7, -1.5, 17.5, 1.1], [0.76, 9.5, 11.5, 1.0], [0.82, -12.5, 14.5, 1.15], [0.9, 2.0, -21, 1.4],
    [0.97, 21.5, 0.5, 1.2], [1.04, -9.5, -9.5, 1.0], [1.1, 9.4, -0.6, 0.9], [1.16, -18.5, -12, 1.3], [1.22, 13.5, 16.5, 1.2], [1.28, -3.5, 22, 1.3], [1.34, 7.5, -16, 1.15],
    [1.4, -24, 2.5, 1.4], [1.46, 17, 8.5, 1.2], [1.52, -13, -21, 1.5], [1.58, 4.5, -28, 1.6], [1.64, 25, -7, 1.4], [1.7, -8, 26, 1.4], [1.76, -26, -16, 1.5], [1.82, 15, -24, 1.6], [1.88, 0.5, -34, 1.8]];
  const FIRST = { from: new THREE.Vector3(76, 37, -118), at: new THREE.Vector3(-9.6, -0.55, 11.0), t0: 2.6 - PRO0 };   // 第一颗：从太阳左上方的远天冲过来（mo -0.6 起）
  const cloudTop = (x, z) => { const d = Math.hypot(x, z / 0.9); return -0.45 - Math.min(1.6, Math.max(0, d - 10) * 0.032); };   // 云海表面大概的高度（流星砸在这儿）
  const smo = k => k * k * (3 - 2 * k);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  function buildWorld(E, all, T) {
    const V = E.V, W = {}; let sd = 23; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const put = o => { E.scene.add(o); all.push(o); return o; };
    // 天空穹顶（着色器）：上中下三段渐变 + 太阳（日轮、光晕、太阳那边的天偏暖）+ 吞掉太阳的暗红雾 + 地平线一圈末日火光（带噪声、慢慢流动）；op 淡掉露出原来的夜空
    const U = { cTop: { value: new THREE.Color() }, cMid: { value: new THREE.Color() }, cHor: { value: new THREE.Color() }, cLow: { value: new THREE.Color() }, sunDir: { value: SUN.clone() },
      sunCol: { value: new THREE.Color('#ffd9a0') }, sunK: { value: 1 }, warm: { value: 1 }, mist: { value: 0 }, fireCol: { value: new THREE.Color('#ff3c0e') }, fireK: { value: 0 }, fireW: { value: 7 }, haze: { value: 0 }, op: { value: 1 }, tm: { value: 0 } };
    W.U = U;
    W.dome = put(new THREE.Mesh(new THREE.SphereGeometry(150, 64, 32), new THREE.ShaderMaterial({ uniforms: U, side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 cTop, cMid, cHor, cLow, sunCol, fireCol, sunDir; uniform float sunK, warm, mist, fireK, fireW, haze, op, tm; varying vec3 vD;
        float h1(float n){ return fract(sin(n) * 43758.5453); }
        float n1(float x){ float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h1(i), h1(i + 1.0), f); }
        void main(){ vec3 d = normalize(vD); float h = d.y;
          vec3 c = h > 0.0 ? mix(cHor, cMid, smoothstep(0.0, 0.12, h)) : mix(cHor, cLow, smoothstep(0.0, 0.1, -h));
          c = mix(c, cTop, smoothstep(0.12, 0.7, h));
          float s = max(dot(d, normalize(sunDir)), 0.0);
          c = mix(c, c * vec3(1.12, 0.98, 0.82) + vec3(0.12, 0.06, 0.0), warm * pow(s, 4.0) * 0.85);
          float az = atan(d.z, d.x), nz = n1(az * 5.0 + tm * 0.3) * n1(az * 13.0 - tm * 0.7 + 3.0);
          float mk = mist * smoothstep(0.55, 0.995, s + 0.12 * nz);
          c = mix(c, mix(vec3(0.16, 0.025, 0.035), vec3(0.03, 0.01, 0.045), smoothstep(0.06, 0.5, h)), mk * 0.85);   // 吞掉太阳的暗红雾：贴着地平线暗红，往上渐渐变成紫黑（原来整片一样的暗砖红）
          c += sunCol * sunK * (smoothstep(0.99955, 0.99975, s) * 1.6 + pow(s, 140.0) * 0.7 + pow(s, 14.0) * 0.32 + pow(s, 3.0) * 0.08);
          float fb = exp(-abs(h - 0.012) * fireW) * (0.4 + 0.6 * n1(az * 6.0 + 2.0) * n1(az * 15.0 - tm * 0.9 + 5.0));
          c += fireCol * fireK * fb;
          c += vec3(0.16, 0.012, 0.012) * haze * exp(-max(h, 0.0) * 10.0) * (0.7 + 0.3 * n1(az * 4.0 - tm * 0.4));   // 末日：地平线上方一层暗红的烟霾（往上很快暗下去，天顶留紫黑）
          gl_FragColor = vec4(c, op);
          #include <colorspace_fragment>
        }` })));
    W.dome.renderOrder = -9; W.dome.frustumCulled = false;
    // 太阳的光芒（一圈柔和的放射光，慢慢转）和镜头光斑（顺着太阳到画面中心那条线排开的几个光圈）
    const rayTex = ctex(512, 512, (g, w) => { g.translate(w / 2, w / 2); for (let k = 0; k < 18; k++) { g.save(); g.rotate(k / 18 * Math.PI * 2 + (k % 3) * 0.05); const len = w * (0.32 + 0.18 * ((k * 7) % 5) / 4), wd = 0.05 + 0.04 * (k % 2);
        const gr = g.createLinearGradient(0, 0, len, 0); gr.addColorStop(0, 'rgba(255,240,205,.55)'); gr.addColorStop(1, 'rgba(255,220,160,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(len, -len * wd); g.lineTo(len, len * wd); g.closePath(); g.fill(); g.restore(); }
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, w / 2); gr.addColorStop(0, 'rgba(255,250,235,1)'); gr.addColorStop(0.08, 'rgba(255,236,200,.7)'); gr.addColorStop(0.3, 'rgba(255,210,150,.16)'); gr.addColorStop(1, 'rgba(255,200,140,0)'); g.fillStyle = gr; g.fillRect(-w / 2, -w / 2, w, w); });
    W.rays = put(new THREE.Sprite(new THREE.SpriteMaterial({ map: rayTex, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false }))); W.rays.renderOrder = -7;
    const ghostTex = radial([[0, 'rgba(255,255,255,0)'], [0.62, 'rgba(255,255,255,.05)'], [0.86, 'rgba(255,255,255,.4)'], [0.93, 'rgba(255,255,255,.12)'], [1, 'rgba(255,255,255,0)']]);
    W.flare = [[0.62, 0.05, '#ffe8b0'], [0.3, 0.09, '#b8ffd0'], [-0.18, 0.05, '#ffc890'], [-0.5, 0.14, '#9fc8ff'], [-0.95, 0.24, '#e0b0ff']].map(([f, s, c]) => {
      const m = put(new THREE.Sprite(new THREE.SpriteMaterial({ map: f > 0.5 ? T.glowTex : ghostTex, color: c, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false }))); m.renderOrder = 8; m.userData = { f, s }; return m; });
    // 卡通云海：几百团圆滚滚的云（一个 InstancedMesh），棋盘底下、四周一圈密一点，越远越低越大；流星砸下来时附近的云被炸开（见 world()）
    const puffGeo = new THREE.IcosahedronGeometry(1, 2);
    W.cloudM = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#a8bfe0', emissiveIntensity: 0.3 });
    W.CP = [];
    for (let k = 0; k < 340; k++) { const a = r() * Math.PI * 2, d = 1 + Math.pow(r(), 0.8) * 66, x = Math.cos(a) * d * 1.05, z = Math.sin(a) * d * 0.9;
      const inB = Math.abs(x) < 8.4 && Math.abs(z) < 6.4, far = Math.max(0, Math.hypot(x, z / 0.9) - 10);
      const s = inB ? 1.5 + r() * 0.5 : (1.15 + r() * 1.5) * (1 + far / 20), fy = 0.55 + r() * 0.18, top = inB ? -0.6 : cloudTop(x, z) + (r() - 0.5) * 0.4;
      W.CP.push({ x, z, y: top - s * fy, s, fy, a: r() * 6.28, w: 0.6 + r() * 0.8 }); }
    W.carpet = put(new THREE.InstancedMesh(puffGeo, W.cloudM, W.CP.length)); W.carpet.frustumCulled = false; W.carpet.receiveShadow = true;
    // 小朵的云（同一套材质，另一个 InstancedMesh）：S3 的云朵小岛、Bedrock 的蹦床云、CloudFront 的冲浪云、Lambda 拍上去的那朵、擦过镜头的云、天上飘的装饰云、欢呼时站的两朵。每朵云 = 几团球
    const blob = (n, R0, flat = 0.74) => Array.from({ length: n }, (_, k) => { const a = k / n * Math.PI * 2 + r() * 0.5, d = k === 0 ? 0 : R0 * (0.42 + r() * 0.38); return [Math.cos(a) * d, (k === 0 ? 0.1 : r() * 0.2) * R0, Math.sin(a) * d * 0.8, R0 * (k === 0 ? 0.62 : 0.34 + r() * 0.22), flat]; });
    W.CL = { isl: blob(9, 1.05), tramp: blob(7, 0.85, 0.62), surf: blob(6, 0.55, 0.66), bnc: blob(8, 0.95, 0.8), wipe: blob(7, 1.0, 0.95), cheer: blob(7, 0.9, 0.7), deco: Array.from({ length: 7 }, () => blob(6 + Math.floor(r() * 3), 0.9 + r() * 0.7)) };
    W.DECO = [[-15, 3.8, -9], [13, 4.6, -12], [-6, 6.2, -20], [19, 2.6, 1], [-19, 2.2, 6], [5, 5.6, -26], [-24, 6.4, -14]];
    // 道具云（小岛、蹦床、冲浪云、Lambda 拍上去那朵、欢呼时站的云……）单独一套材质：颜色跟着云海走；末日里底色压暗、朝下（朝着火）那面一圈橙红的菲涅尔边光（W.DR），像被火烧红了边的云块（原来是平平的暗褐、暗紫一块，像土豆）
    W.DR = { value: 0 }; W.DU = { value: V(0, 1, 0) };
    const doomRim = m => { m.onBeforeCompile = sh => { sh.uniforms.uDR = W.DR; sh.uniforms.uDU = W.DU; sh.fragmentShader = 'uniform float uDR; uniform vec3 uDU;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { float fr = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 1.8), dn = clamp(-dot(normal, uDU) * 0.8 + 0.3, 0.0, 1.0); totalEmissiveRadiance += vec3(1.0, 0.353, 0.165) * uDR * (fr * dn * 1.5 + 0.06); }`); }; m.customProgramCacheKey = () => 'doomRim'; return m; };
    W.fluffM = doomRim(new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#a8bfe0', emissiveIntensity: 0.3 }));
    W.fluff = put(new THREE.InstancedMesh(puffGeo, W.fluffM, 160)); W.fluff.count0 = 160; W.fluff.frustumCulled = false;
    // Lambda 拍上去的那朵云单独一套亮白的材质（末日里也是白的，看得清它凹下去）
    W.bncM = doomRim(new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.55 })); W.bnc = put(new THREE.InstancedMesh(puffGeo, W.bncM, 8)); W.bnc.frustumCulled = false;
    // 擦过镜头的云（白天两刀）单独一套：离镜头只有 1 个单位，低面数的球会露出一块块平面的棱角、背光面发灰，所以用细分高的球 + 亮白的材质
    W.wipeM = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#f3f0ff', emissiveIntensity: 0.6 }); W.wipeC = put(new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 12), W.wipeM, 8)); W.wipeC.frustumCulled = false;
    // 远处的积云：一圈大贴片（画布上画一堆圆、模糊一点；底下往下渐隐、偏淡紫，沉进云海里，不切直边）
    const cuTex = ctex(512, 320, (g, w, h) => { let s2 = 5; const rr = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647; g.filter = 'blur(3px)'; g.fillStyle = '#ffffff';
      for (let k = 0; k < 38; k++) { const u = rr(), m = Math.sin(Math.PI * u), rad = 22 + m * 64 * (0.55 + 0.45 * rr()), x = 70 + u * (w - 140), y = h - 70 - m * 52 * rr() - rad * 0.3; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); }
      g.filter = 'none'; g.globalCompositeOperation = 'source-atop'; const gr = g.createLinearGradient(0, 30, 0, h); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#fbf3ff'); gr.addColorStop(0.85, '#c9c3ec'); gr.addColorStop(1, '#b4b6e6'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-in'; const fd = g.createLinearGradient(0, 0, 0, h); fd.addColorStop(0, 'rgba(0,0,0,1)'); fd.addColorStop(0.62, 'rgba(0,0,0,1)'); fd.addColorStop(0.92, 'rgba(0,0,0,0)'); g.fillStyle = fd; g.fillRect(0, 0, w, h); });
    W.cumulus = Array.from({ length: 18 }, (_, k) => { const s = put(new THREE.Sprite(new THREE.SpriteMaterial({ map: cuTex, transparent: true, depthWrite: false, fog: false })));
      const a = -Math.PI / 2 + (k / 18 - 0.5) * Math.PI * 1.9 + (r() - 0.5) * 0.2, d = 92 + r() * 34, w = 26 + r() * 34; s.scale.set(w, w * 0.625, 1); s.position.set(Math.cos(a) * d, -6.5 + w * 0.17 + (r() - 0.5) * 2, Math.sin(a) * d); s.renderOrder = -8; return s; });
    // 「直到那一天」从太阳那边扫过来的影子：一块看不见、只投影子的大板（挡在主光前面，慢慢滑过去）
    W.occ = put(new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide }))); W.occ.castShadow = true;
    // 末日的火星：空中飘着往上走的小火点（顶点颜色带透明度 RGBA：画布是透明的，淡出时透明度跟着归零，不会在透明处留下黑点）
    { const n = 520, pos = new Float32Array(n * 3), colA = new Float32Array(n * 4); W.EM = Array.from({ length: n }, () => [(r() - 0.5) * 70, r() * 22 - 1, -40 + r() * 70, r(), 0.4 + r() * 1.2]);
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(colA, 4));
      W.embers = put(new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.16, map: T.glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); W.embers.frustumCulled = false; }
    // 撞击点的火光（3 盏会闪的橙色点光源，分给这一帧最亮的三处）、天色暗下来时的冷紫补光
    W.pl = [0, 1, 2].map(() => { const l = put(new THREE.PointLight('#ff7a2e', 0, 0, 2)); return l; });
    // ---- 服务卡通 ----
    const mk = (k, o) => { const m = makeMascot(E, k, o); put(m.g); return m; };
    W.ms = { ec2: mk('ec2'), s3: mk('s3'), lam: mk('lambda'), dyn: mk('dynamodb'), rds: mk('rds'), cf: mk('cloudfront'), bed: mk('bedrock'), q: [0, 1, 2].map(k => mk('sqs', { seed: 0.2 + k * 0.31 })) };
    W.list = [W.ms.ec2, W.ms.s3, W.ms.lam, W.ms.dyn, W.ms.rds, W.ms.cf, W.ms.bed, ...W.ms.q];
    // ---- 玩具 ----
    // 跳绳（半个椭圆环，绕两只手的连线转；粗一点，两头带把手）
    W.rope = put(new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 56, Math.PI), new THREE.MeshStandardMaterial({ color: '#ff4f8b', roughness: 0.5, emissive: '#ff4f8b', emissiveIntensity: 0.25 }))); W.rope.castShadow = true;
    // 沙滩球（六瓣彩色）
    const ballT = ctex(256, 128, (g, w, h) => { ['#ff4d4d', '#ffffff', '#3b8bff', '#ffd43b', '#ffffff', '#3ccf6e'].forEach((c, k) => { g.fillStyle = c; g.fillRect(k * w / 6, 0, w / 6 + 1, h); }); g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14); });
    W.ball = put(new THREE.Mesh(new THREE.SphereGeometry(0.17, 28, 18), new THREE.MeshStandardMaterial({ map: ballT, roughness: 0.35, emissive: '#ffffff', emissiveMap: ballT, emissiveIntensity: 0.18 }))); W.ball.castShadow = true;
    // 彩虹滑梯：S 形弯着的 U 形槽（两边带护栏），宽度方向贴彩虹条；底下几根白柱子撑着
    { const cv = new THREE.CatmullRomCurve3(SLIDE.map(p => V(...p))), CS = [[-0.36, 0.2], [-0.34, 0.06], [-0.27, 0], [0.27, 0], [0.34, 0.06], [0.36, 0.2]], N = 64, pos = [], uv = [], idx = [];
      for (let i = 0; i <= N; i++) { const u = i / N, p = cv.getPoint(u), tg = cv.getTangent(u), sdv = new THREE.Vector3().crossVectors(tg, V(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(sdv, tg).normalize();
        CS.forEach(([a, b], j) => { const q = p.clone().addScaledVector(sdv, a).addScaledVector(up, b); pos.push(q.x, q.y, q.z); uv.push(j / (CS.length - 1), u); }); }
      for (let i = 0; i < N; i++) for (let j = 0; j < CS.length - 1; j++) { const a = i * CS.length + j, b = a + CS.length; idx.push(a, b, a + 1, a + 1, b, b + 1); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
      const rb = ctex(128, 8, (g, w, h) => { ['#ffffff', '#ff5a5a', '#ff9f43', '#ffd93d', '#5ed36a', '#4aa8ff', '#9d7bff', '#ffffff'].forEach((c, k) => { g.fillStyle = c; g.fillRect(k * w / 8, 0, w / 8 + 1, h); }); });
      W.slide = put(new THREE.Group()); const sm = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: rb, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: rb, emissiveIntensity: 0.3 })); sm.castShadow = true; W.slide.add(sm);
      const railM = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.25 });
      [-1, 1].forEach(s => { const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24, p = cv.getPoint(u), tg = cv.getTangent(u), sdv = new THREE.Vector3().crossVectors(tg, V(0, 1, 0)).normalize(); pts.push(p.clone().addScaledVector(sdv, s * 0.37).add(V(0, 0.21, 0))); }
        W.slide.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.035, 6), railM)); });
      [0.38, 0.62, 0.82].forEach(u => { const p = cv.getPoint(u), hh = p.y + 0.04; if (hh < 0.15) return; const c = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, hh, 10), railM); c.position.set(p.x, p.y - hh / 2, p.z); c.castShadow = true; W.slide.add(c); });
      W.slideCurve = cv; }
    // 冲浪板（CloudFront 踩着）：两头尖的长圆板，有厚度、板头翘起来，三道彩色条纹
    W.board = put(new THREE.Group()); { const sh = new THREE.Shape(); sh.moveTo(0, -0.62); sh.bezierCurveTo(0.24, -0.4, 0.24, 0.35, 0, 0.66); sh.bezierCurveTo(-0.24, 0.35, -0.24, -0.4, 0, -0.62);
      const bg = new THREE.ExtrudeGeometry(sh, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.025, bevelSegments: 3, curveSegments: 18 }); bg.rotateX(-Math.PI / 2);
      const p = bg.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); if (z < -0.3) p.setY(i, p.getY(i) + Math.pow((-z - 0.3) / 0.36, 2) * 0.13); } bg.computeVertexNormals();
      const stT = ctex(64, 256, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); [['#ff9900', 0.42], ['#8c4fff', 0.5], ['#2fb8ff', 0.58]].forEach(([c, y]) => { g.fillStyle = c; g.fillRect(0, h * y, w, h * 0.05); }); });
      bg.computeBoundingBox(); const bb = bg.boundingBox, uv = []; for (let i = 0; i < p.count; i++) uv.push((p.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), (p.getZ(i) - bb.min.z) / (bb.max.z - bb.min.z)); bg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      const b = new THREE.Mesh(bg, new THREE.MeshStandardMaterial({ map: stT, roughness: 0.35, emissive: '#ffffff', emissiveMap: stT, emissiveIntensity: 0.18 })); b.castShadow = true; W.board.add(b); }
    // 冲浪溅起的小云团、Lambda 跑起来的烟（贴片）
    W.spray = Array.from({ length: 14 }, () => put(new THREE.Sprite(new THREE.SpriteMaterial({ map: T.cloudTex, color: '#ffffff', transparent: true, depthWrite: false, fog: false }))));
    // 金币（欢呼时 SQS 互相抛、S3 用桶接、挂在 EC2 天线上）
    W.coinM = new THREE.MeshStandardMaterial({ color: '#ffcf3a', metalness: 0.6, roughness: 0.3, emissive: '#b8860b', emissiveIntensity: 0.5 });
    // 正反两面贴一张币面（亮金色、外圈一道凸边、中间一颗星），正对镜头时一看就是金币（原来是一块平的暗金圆片，挂在 EC2 天线上像个天线球）
    const coinT = ctex(128, 128, (g) => { const gr = g.createRadialGradient(52, 48, 4, 64, 64, 64); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.55, '#ffd23f'); gr.addColorStop(1, '#d99a12'); g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 63, 0, 7); g.fill();
      g.lineWidth = 7; g.strokeStyle = '#b97a0a'; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.stroke(); g.lineWidth = 3; g.strokeStyle = '#fff2b8'; g.beginPath(); g.arc(64, 64, 57, 0, 7); g.stroke();
      g.fillStyle = '#c4850c'; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k / 10 * Math.PI * 2, rr = k % 2 ? 13 : 31; g.lineTo(64 + Math.cos(a) * rr, 66 + Math.sin(a) * rr); } g.closePath(); g.fill(); });
    const coinF = new THREE.MeshStandardMaterial({ map: coinT, metalness: 0.35, roughness: 0.4, emissive: '#ffffff', emissiveMap: coinT, emissiveIntensity: 0.45 });
    W.coins = Array.from({ length: 7 }, () => { const c = put(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.022, 24), [W.coinM, coinF, coinF])); return c; });
    // 欢呼退场的「噗」：柔边小白烟团（几个软圆叠成一团，普通混合）+ 四角金色星光（叠加混合）
    const poofTex = ctex(256, 256, (g) => { [[128, 128, 92, 0.95], [86, 140, 58, 0.8], [172, 136, 60, 0.8], [118, 92, 56, 0.75], [150, 170, 52, 0.7]].forEach(([x, y, R, a]) => { const gr = g.createRadialGradient(x, y, 0, x, y, R);
      gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(0.55, `rgba(250,246,255,${a * 0.6})`); gr.addColorStop(1, 'rgba(240,236,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }); });
    const starTex = ctex(128, 128, (g) => { g.translate(64, 64); const gr = g.createRadialGradient(0, 0, 0, 0, 0, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,240,190,.95)'); gr.addColorStop(0.5, 'rgba(255,205,100,.5)'); gr.addColorStop(1, 'rgba(255,180,60,0)');
      g.fillStyle = gr; g.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, rr = k % 2 ? 9 : 63; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); });
    W.poof = Array.from({ length: 30 }, () => put(new THREE.Sprite(new THREE.SpriteMaterial({ map: poofTex, color: '#ffffff', transparent: true, depthWrite: false, fog: false }))));
    W.twk = Array.from({ length: 80 }, () => put(new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: '#ffe08a', transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }))));

    // ---- 末日流星（一套实例化的特效：石头一个 InstancedMesh，光晕 / 火团 / 烟 / 碎云 / 光环都是正对镜头的贴片，一个 draw call 画几百个；火尾、外焰、烟尾是侧对镜头、头宽尾细、会抖的长条）----
    // 图集 4×2：0 光晕 1 白热核 2 火团 3 烟 4 云团 5 环（冲击波） 6 余烬 7 尘
    const AT = ctex(1024, 512, (g) => { const cell = (k, f) => { g.save(); g.translate((k % 4) * 256, (k >> 2) * 256); f(g); g.restore(); };
      const rad = (stops, R = 128) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, R); stops.forEach(([k, c]) => gr.addColorStop(k, c)); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); };
      cell(0, () => rad([[0, 'rgba(255,255,255,1)'], [0.18, 'rgba(255,214,140,.9)'], [0.5, 'rgba(255,120,40,.4)'], [1, 'rgba(255,60,0,0)']]));
      cell(1, () => rad([[0, 'rgba(255,255,250,1)'], [0.32, 'rgba(255,246,200,.95)'], [0.6, 'rgba(255,190,90,.4)'], [1, 'rgba(255,120,30,0)']]));
      cell(2, () => { let s2 = 3; const rr = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647; for (let k = 0; k < 30; k++) { const a = rr() * 6.28, d = 14 + rr() * 60, x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d, R = 22 + rr() * 34, gr = g.createRadialGradient(x, y, 0, x, y, R);
          gr.addColorStop(0, 'rgba(255,190,90,.8)'); gr.addColorStop(0.6, 'rgba(230,80,24,.45)'); gr.addColorStop(1, 'rgba(120,20,10,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }
        const gr = g.createRadialGradient(128, 128, 0, 128, 128, 84); gr.addColorStop(0, 'rgba(255,250,220,.9)'); gr.addColorStop(0.4, 'rgba(255,200,110,.6)'); gr.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
      cell(3, () => { let s2 = 7; const rr = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647; for (let k = 0; k < 16; k++) { const a = rr() * 6.28, d = rr() * 50, x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d * 0.8, R = 36 + rr() * 40, gr = g.createRadialGradient(x, y, 0, x, y, R);
          gr.addColorStop(0, 'rgba(255,255,255,.5)'); gr.addColorStop(0.6, 'rgba(235,235,235,.25)'); gr.addColorStop(1, 'rgba(220,220,220,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); } });
      cell(4, () => rad([[0, 'rgba(255,255,255,.9)'], [0.5, 'rgba(240,244,255,.55)'], [1, 'rgba(255,255,255,0)']]));
      cell(5, () => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.55, 'rgba(255,255,255,.08)'); gr.addColorStop(0.8, 'rgba(255,255,255,.55)'); gr.addColorStop(0.9, 'rgba(255,255,255,.9)'); gr.addColorStop(0.97, 'rgba(255,255,255,.2)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
      cell(6, () => { rad([[0, 'rgba(255,160,60,.75)'], [0.45, 'rgba(230,70,20,.4)'], [1, 'rgba(120,20,0,0)']]); let s2 = 11; const rr = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647; for (let k = 0; k < 40; k++) { const a = rr() * 6.28, d = 30 + rr() * 80; g.fillStyle = `rgba(255,${180 + rr() * 60 | 0},90,${0.5 + rr() * 0.5})`; g.beginPath(); g.arc(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 2 + rr() * 4, 0, 7); g.fill(); } });
      cell(7, () => rad([[0, 'rgba(255,255,255,.6)'], [0.7, 'rgba(255,255,255,.25)'], [1, 'rgba(255,255,255,0)']])); });
    const billMat = (additive) => new THREE.ShaderMaterial({ uniforms: { map: { value: AT } }, transparent: true, depthWrite: false, depthTest: true, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: `attribute vec4 iP; attribute vec4 iC; attribute vec2 iR; varying vec2 vU; varying vec4 vC;
        void main(){ vec4 mv = modelViewMatrix * vec4(iP.xyz, 1.0); float c = cos(iR.x), s = sin(iR.x); vec2 q = vec2(position.x * c - position.y * s, position.x * s + position.y * c);
          mv.xy += q * iP.w; gl_Position = projectionMatrix * mv; float cl = iR.y; vU = (vec2(mod(cl, 4.0), 1.0 - floor(cl / 4.0)) + position.xy + 0.5) / vec2(4.0, 2.0);
          vC = iC; vC.a *= smoothstep(0.35, 1.6, -mv.z); }`,
      fragmentShader: `uniform sampler2D map; varying vec2 vU; varying vec4 vC; void main(){ vec4 t = texture2D(map, vU); gl_FragColor = vec4(vC.rgb * t.rgb, vC.a * t.a);
        #include <colorspace_fragment>
      }` });
    const bills = (additive, max) => { const geo = new THREE.InstancedBufferGeometry(); geo.setIndex([0, 1, 2, 0, 2, 3]); geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
      const mkA = (n) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(max * n), n); a.setUsage(THREE.DynamicDrawUsage); return a; };
      geo.setAttribute('iP', mkA(4)); geo.setAttribute('iC', mkA(4)); geo.setAttribute('iR', mkA(2)); geo.instanceCount = 0;
      const m = put(new THREE.Mesh(geo, billMat(additive))); m.frustumCulled = false; m.userData = { n: 0, max };
      m.add2 = (x, y, z, size, cell, cr, cg, cb, a, rot = 0) => { const k = m.userData.n; if (k >= max || a < 0.004 || size <= 0) return; const P = geo.attributes.iP.array, C = geo.attributes.iC.array, R = geo.attributes.iR.array;
        P[k * 4] = x; P[k * 4 + 1] = y; P[k * 4 + 2] = z; P[k * 4 + 3] = size; C[k * 4] = cr; C[k * 4 + 1] = cg; C[k * 4 + 2] = cb; C[k * 4 + 3] = a; R[k * 2] = rot; R[k * 2 + 1] = cell; m.userData.n = k + 1; };
      m.begin = () => { m.userData.n = 0; }; m.end = () => { geo.instanceCount = m.userData.n; m.visible = m.userData.n > 0; ['iP', 'iC', 'iR'].forEach(k => { geo.attributes[k].needsUpdate = true; }); };
      return m; };
    W.bA = bills(true, 900); W.bN = bills(false, 400); W.bN.renderOrder = 1; W.bA.renderOrder = 2;
    // 长条（火尾、外焰、烟尾）：头在 iH，沿 iA（指向尾巴的单位向量）伸出 len；宽度从头往尾巴收细；贴图沿长度方向滚动的噪声，火苗一抖一抖、断断续续
    // 三列：0 火尾芯（叠加）、1 外焰（叠加，宽、暗一点）、2 烟尾（普通混合，深色）。行 = 从头（第 0 行，石头那头）到尾。
    // 颜色沿长度走：白黄 → 橙 → 暗红 → 透明（原来颜色是横着分的、透明度反了——头上几乎透明、快到尾巴才最亮，看起来是一条条细线）
    const RT = ctex(192, 256, (g, w, h) => { const im = g.createImageData(w, h);
      const ramp = (st, y) => { let k = 0; while (k < st.length - 2 && y > st[k + 1][0]) k++; const [y0, c0] = st[k], [y1, c1] = st[k + 1], f = Math.max(0, Math.min(1, (y - y0) / (y1 - y0))); return c0.map((v, i) => v + (c1[i] - v) * f); };
      const COL = [[[0, [255, 250, 230]], [0.16, [255, 222, 140]], [0.4, [255, 146, 50]], [0.68, [196, 56, 16]], [1, [96, 18, 6]]],
        [[0, [255, 176, 84]], [0.35, [240, 104, 34]], [0.7, [168, 40, 12]], [1, [80, 14, 6]]],
        [[0, [92, 70, 74]], [0.5, [66, 52, 60]], [1, [48, 40, 50]]]];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const col = Math.floor(x / 64), lx = (x % 64) / 63, v = y / (h - 1), cx = Math.abs(lx - 0.5) * 2;
        const pw = [0.5, 0.62, 0.72][col] * (col === 2 ? 1 : 1 - 0.35 * v), f = Math.exp(-Math.pow(cx / pw, 2));
        const a = col === 0 ? Math.pow(1 - v, 1.25) : col === 1 ? Math.pow(1 - v, 1.6) * Math.min(1, v * 14 + 0.3) : Math.min(1, v * 8) * Math.pow(1 - v, 1.1);
        const cc = ramp(COL[col], v), i = (y * w + x) * 4; im.data[i] = cc[0]; im.data[i + 1] = cc[1]; im.data[i + 2] = cc[2]; im.data[i + 3] = 255 * a * f; }
      g.putImageData(im, 0, 0); });
    const ribMat = (additive) => new THREE.ShaderMaterial({ uniforms: { map: { value: RT }, tm: { value: 0 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: `attribute vec4 iH; attribute vec4 iA; attribute vec4 iC; attribute vec2 iS; uniform float tm; varying vec2 vU; varying vec4 vC; varying float vY, vS;
        void main(){ float y = position.y; vec3 ax = iA.xyz, hd = iH.xyz; vec3 sd = cross(cameraPosition - hd, ax); float L2 = dot(sd, sd); sd = L2 > 1e-8 ? sd * inversesqrt(L2) : vec3(1.0, 0.0, 0.0);
          float wob = 1.0 + 0.16 * sin(iS.x * 7.0 + y * 13.0 - tm * 34.0) * y;
          float tp = iS.y < 1.5 ? pow(max(0.0, 1.0 - y), 0.55) * (0.85 + 0.15 * smoothstep(0.0, 0.08, y)) : mix(0.6, 1.4, y);   // 火尾往后收尖到 0；烟尾越往后越散开
          vec3 p = hd + ax * (y * iA.w) + sd * position.x * iH.w * tp * wob;
          vec4 mv = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; vU = vec2((iS.y + position.x + 0.5) / 3.0, 1.0 - y); vC = iC; vC.a *= smoothstep(1.2, 5.0, -mv.z); vY = y; vS = iS.x; }`,
      fragmentShader: `uniform sampler2D map; uniform float tm; varying vec2 vU; varying vec4 vC; varying float vY, vS;
        void main(){ vec4 t = texture2D(map, vU); float n = 0.62 + 0.38 * sin(vY * 31.0 - tm * 47.0 + vS * 13.0) * sin(vY * 9.0 + tm * 19.0 + vS * 5.0); n = mix(1.0, n, smoothstep(0.05, 0.4, vY));
          gl_FragColor = vec4(vC.rgb * t.rgb, vC.a * t.a * n);
          #include <colorspace_fragment>
        }` });
    const ribs = (additive, max) => { const geo = new THREE.InstancedBufferGeometry(), pos = [], idx = [], N = 12; for (let j = 0; j <= N; j++) pos.push(-0.5, j / N, 0, 0.5, j / N, 0); for (let j = 0; j < N; j++) idx.push(j * 2, j * 2 + 1, j * 2 + 2, j * 2 + 1, j * 2 + 3, j * 2 + 2);
      geo.setIndex(idx); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); const mkA = (n) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(max * n), n); a.setUsage(THREE.DynamicDrawUsage); return a; };
      geo.setAttribute('iH', mkA(4)); geo.setAttribute('iA', mkA(4)); geo.setAttribute('iC', mkA(4)); geo.setAttribute('iS', mkA(2)); geo.instanceCount = 0;
      const m = put(new THREE.Mesh(geo, ribMat(additive))); m.frustumCulled = false; m.userData = { n: 0, max };
      m.add2 = (h, ax, w, len, cell, cr, cg, cb, a, seed) => { const k = m.userData.n; if (k >= max || a < 0.004 || len < 0.01) return; const H = geo.attributes.iH.array, A2 = geo.attributes.iA.array, C = geo.attributes.iC.array, S2 = geo.attributes.iS.array;
        H[k * 4] = h.x; H[k * 4 + 1] = h.y; H[k * 4 + 2] = h.z; H[k * 4 + 3] = w; A2[k * 4] = ax.x; A2[k * 4 + 1] = ax.y; A2[k * 4 + 2] = ax.z; A2[k * 4 + 3] = len; C[k * 4] = cr; C[k * 4 + 1] = cg; C[k * 4 + 2] = cb; C[k * 4 + 3] = a; S2[k * 2] = seed; S2[k * 2 + 1] = cell; m.userData.n = k + 1; };
      m.begin = () => { m.userData.n = 0; }; m.end = (tm) => { geo.instanceCount = m.userData.n; m.visible = m.userData.n > 0; m.material.uniforms.tm.value = tm; ['iH', 'iA', 'iC', 'iS'].forEach(k => { geo.attributes[k].needsUpdate = true; }); };
      return m; };
    W.rA = ribs(true, 420); W.rN = ribs(false, 200); W.rN.renderOrder = 0; W.rA.renderOrder = 1;
    // 石头：烧焦的暗色外壳 + 发光的裂纹（自发光贴图），细分够、平滑着色；一个 InstancedMesh
    const crackT = ctex(256, 128, (g, w, h) => { g.fillStyle = '#000000'; g.fillRect(0, 0, w, h); let s2 = 13; const rr = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
      for (let k = 0; k < 26; k++) { let x = rr() * w, y = rr() * h; g.strokeStyle = `rgba(255,${150 + rr() * 80 | 0},60,${0.6 + rr() * 0.4})`; g.lineWidth = 1.5 + rr() * 3; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += (rr() - 0.5) * 40; y += (rr() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); }
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,170,70,.0)'); gr.addColorStop(1, 'rgba(255,170,70,.0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const rockGeo = (() => { const geo = new THREE.IcosahedronGeometry(1, 3), p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 0.86 + 0.12 * Math.sin(x * 3.1 + y * 2.3) * Math.cos(z * 2.7 - x) + 0.06 * Math.sin(x * 7 + z * 5); p.setXYZ(i, x * k, y * k, z * k); } geo.computeVertexNormals();
      // 二十面体是不共用顶点的，computeVertexNormals 出来是每个面一个法线（一块块平面的棱角，自发光按法线算时很显眼）：同一个位置的顶点把法线加起来再归一，变成平滑的
      { const nr = geo.attributes.normal, acc = new Map(), key = i => `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
        for (let i = 0; i < p.count; i++) { const kk = key(i), a = acc.get(kk) || [0, 0, 0]; a[0] += nr.getX(i); a[1] += nr.getY(i); a[2] += nr.getZ(i); acc.set(kk, a); }
        for (let i = 0; i < p.count; i++) { const a = acc.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1; nr.setXYZ(i, a[0] / l, a[1] / l, a[2] / l); } }
      const uv = []; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); uv.push(0.5 + Math.atan2(z, x) / (2 * Math.PI), 0.5 + Math.asin(Math.max(-1, Math.min(1, y / Math.hypot(x, y, z)))) / Math.PI); } geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return geo; })();
    // 自发光：裂纹（贴图）+ 整块石头暗红地烧着 + 轮廓一圈橙色菲涅尔边光（朝着飞行方向（iDir，每颗一个）的那半边更亮）——近看不再是光晕里一块死黑的石头
    W.rockM = new THREE.MeshStandardMaterial({ color: '#25150f', roughness: 0.95, emissive: '#ff7a2a', emissiveMap: crackT, emissiveIntensity: 2.2, fog: false });
    W.rockM.onBeforeCompile = sh => { sh.vertexShader = 'attribute vec3 iDir; varying vec3 vDirV;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vDirV = normalize(mat3(viewMatrix) * iDir + vec3(0.0, 0.0, 1e-4));');
      sh.fragmentShader = 'varying vec3 vDirV;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { float fr = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.2), ld = clamp(dot(normal, vDirV) * 0.7 + 0.3, 0.0, 1.0);
          totalEmissiveRadiance += vec3(0.07, 0.014, 0.004) + vec3(1.0, 0.42, 0.12) * fr * (0.25 + 1.05 * ld) + vec3(1.0, 0.45, 0.15) * pow(ld, 4.0) * 0.09; }`); };   // 线性值（输出时转 sRGB 会提亮不少）
    W.rockM.customProgramCacheKey = () => 'meteorRock';
    rockGeo.setAttribute('iDir', new THREE.InstancedBufferAttribute(new Float32Array(200 * 3), 3)); rockGeo.attributes.iDir.setUsage(THREE.DynamicDrawUsage);
    W.rocks = put(new THREE.InstancedMesh(rockGeo, W.rockM, 200)); W.rocks.frustumCulled = false; W.rocks.castShadow = false;   // 流星的石头 + 撞击崩出来的烧着的碎石块
    // 有体积的烟（原来一团团是平的灰贴片，像土豆、飞碟）：烟团贴图存的是「法线 + 厚度 + 不透明度」（几团半球叠成菜花状的高度场，边缘加噪声），
    // 着色器里按法线打光——朝下那面被底下的火光照暖（每团的火光颜色、强度由 meteors() 按离火多远、火还烧多久算好给进来），朝上那面一点冷的天光，中间厚的地方暗；
    // 贴图坐标随时间轻轻扭动（边缘一直在变形），贴片自己慢慢转、法线跟着转，暖的那面始终朝下。4 种烟团（4×1 图集）
    W.smokeT = (() => { const N = 256, CW = 4 * N, data = new Uint8Array(CW * N * 4), H = new Float32Array(N * N); let s2 = 29; const rr = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
      const hs = (x, y) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };
      const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return (hs(xi, yi) * (1 - u) + hs(xi + 1, yi) * u) * (1 - v) + (hs(xi, yi + 1) * (1 - u) + hs(xi + 1, yi + 1) * u) * v; };
      for (let c = 0; c < 4; c++) { const B = Array.from({ length: 13 }, (_, i) => { const a = rr() * 6.283, d = (i === 0 ? 0 : 0.06 + rr() * 0.2), R = (i === 0 ? 0.24 : 0.1 + rr() * 0.11) * (1 - d * 0.6); return [0.5 + Math.cos(a) * d, 0.48 + Math.sin(a) * d * 0.85, R]; });
        let hm = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const px = (x + 0.5) / N, py = (y + 0.5) / N; let h = 0;
          for (const [bx, by, R] of B) { const d2 = (px - bx) ** 2 + (py - by) ** 2; if (d2 < R * R) h = Math.max(h, Math.sqrt(R * R - d2)); }
          h += (vn(px * 9 + c * 7, py * 9) - 0.5) * 0.05 + (vn(px * 23 + c * 3, py * 23 + 5) - 0.5) * 0.022 - 0.012; h *= Math.min(1, Math.max(0, (0.5 - Math.hypot(px - 0.5, py - 0.5)) / 0.08)); H[y * N + x] = h; hm = Math.max(hm, h); }
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const h = H[y * N + x], i = (y * CW + c * N + x) * 4, hx = (H[y * N + Math.min(N - 1, x + 1)] - H[y * N + Math.max(0, x - 1)]) * N / 2, hy = (H[Math.min(N - 1, y + 1) * N + x] - H[Math.max(0, y - 1) * N + x]) * N / 2;
          const nx = -hx, ny = -hy, nl = Math.hypot(nx, ny, 1), a = Math.min(1, Math.max(0, h / 0.075));   // 第 0 行在贴图底下（DataTexture 不翻转），y 往上：法线 = (-∂h/∂x, -∂h/∂y, 1)
          data[i] = a > 0 ? Math.round((nx / nl * 0.5 + 0.5) * 255) : 128; data[i + 1] = a > 0 ? Math.round((ny / nl * 0.5 + 0.5) * 255) : 128; data[i + 2] = Math.round(Math.min(1, h / hm) * 255); data[i + 3] = Math.round(a * a * (3 - 2 * a) * 255); } }
      const t = new THREE.DataTexture(data, CW, N, THREE.RGBAFormat); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t; })();
    W.smokeU = { map: { value: W.smokeT }, tm: { value: 0 }, cDark: { value: new THREE.Color('#2a1f2e') }, cSky: { value: new THREE.Color('#3a3168') } };   // 朝上那面的冷天光偏紫（和末日紫黑的天顶一个调子）
    { const max = 480, geo = new THREE.InstancedBufferGeometry(); geo.setIndex([0, 1, 2, 0, 2, 3]); geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
      const mkA = (n) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(max * n), n); a.setUsage(THREE.DynamicDrawUsage); return a; };
      geo.setAttribute('iP', mkA(4)); geo.setAttribute('iC', mkA(4)); geo.setAttribute('iR', mkA(2)); geo.instanceCount = 0;
      const mat = new THREE.ShaderMaterial({ uniforms: W.smokeU, transparent: true, depthWrite: false, depthTest: true,
        vertexShader: `attribute vec4 iP; attribute vec4 iC; attribute vec2 iR; varying vec2 vL; varying vec4 vC; varying float vRot, vCell, vSd;
          void main(){ vec4 mv = modelViewMatrix * vec4(iP.xyz, 1.0); float c = cos(iR.x), s = sin(iR.x); vec2 q = vec2(position.x * c - position.y * s, position.x * s + position.y * c);
            mv.xy += q * iP.w; gl_Position = projectionMatrix * mv; vL = position.xy; vRot = iR.x; vCell = iR.y; vSd = fract(iP.x * 0.173 + iP.z * 0.291 + iP.w * 0.07) * 6.2831;
            vC = iC; vC.a *= smoothstep(0.35, 1.6, -mv.z); }`,
        fragmentShader: `uniform sampler2D map; uniform float tm; uniform vec3 cDark, cSky; varying vec2 vL; varying vec4 vC; varying float vRot, vCell, vSd;
          void main(){ vec2 p = vL;
            p += 0.032 * vec2(sin(p.y * 10.0 + tm * 1.7 + vSd), sin(p.x * 9.0 - tm * 1.3 + vSd * 1.7)) + 0.014 * vec2(sin(p.y * 23.0 - tm * 2.9 + vSd * 2.3), sin(p.x * 21.0 + tm * 2.3 + vSd));
            p = clamp(p, -0.49, 0.49); vec4 t = texture2D(map, vec2((vCell + p.x + 0.5) / 4.0, p.y + 0.5));
            vec3 n = vec3(t.rg * 2.0 - 1.0, 0.0); n.z = sqrt(max(0.0, 1.0 - dot(n.xy, n.xy))); float c = cos(vRot), s = sin(vRot); n.xy = vec2(n.x * c - n.y * s, n.x * s + n.y * c);
            float sy = vL.x * s + vL.y * c, fire = max(0.0, dot(n, vec3(0.12, -0.8, 0.59))), sky = max(0.0, dot(n, vec3(-0.25, 0.76, 0.6))), low = smoothstep(0.3, -0.45, sy);
            vec3 col = cDark * (0.7 + 0.6 * (1.0 - t.b)) + cSky * sky * 0.55 + vC.rgb * (fire * 0.85 + 0.12) * (0.2 + 0.8 * low);
            gl_FragColor = vec4(col, vC.a * t.a);
            #include <colorspace_fragment>
          }` });
      const m = W.bS = put(new THREE.Mesh(geo, mat)); m.frustumCulled = false; m.renderOrder = 1; m.userData = { n: 0, max };
      m.add2 = (x, y, z, size, cell, cr, cg, cb, a, rot = 0) => { const k = m.userData.n; if (k >= max || a < 0.004 || size <= 0) return; const P = geo.attributes.iP.array, C = geo.attributes.iC.array, R = geo.attributes.iR.array;
        P[k * 4] = x; P[k * 4 + 1] = y; P[k * 4 + 2] = z; P[k * 4 + 3] = size; C[k * 4] = cr; C[k * 4 + 1] = cg; C[k * 4 + 2] = cb; C[k * 4 + 3] = a; R[k * 2] = rot; R[k * 2 + 1] = cell; m.userData.n = k + 1; };
      m.begin = () => { m.userData.n = 0; }; m.end = (tm) => { geo.instanceCount = m.userData.n; m.visible = m.userData.n > 0; W.smokeU.tm.value = tm; ['iP', 'iC', 'iR'].forEach(k => { geo.attributes[k].needsUpdate = true; }); }; }
    // 冲击波：贴着云海扩散的一圈光环（亮度随半径变暗，内沿柔和），底下一圈尘（贴片）
    W.shockM = new THREE.MeshBasicMaterial({ map: (() => { const t = ctex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,.05)'); gr.addColorStop(0.78, 'rgba(255,255,255,.45)'); gr.addColorStop(0.9, 'rgba(255,255,255,1)'); gr.addColorStop(0.96, 'rgba(255,255,255,.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }); return t; })(),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
    { const pg = new THREE.PlaneGeometry(2, 2); pg.rotateX(-Math.PI / 2); W.shock = put(new THREE.InstancedMesh(pg, W.shockM, 40)); W.shock.frustumCulled = false; W.shock.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(40 * 3), 3); }
    // 火星（Points）
    { const n = 600, geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 4), 4));   // RGBA，同上
      W.sparks = put(new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.42, map: T.glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); W.sparks.frustumCulled = false; }
    // 每颗撞击流星的随机量
    W.imps = IMPS.map(([ti, x, z, s], k) => { const at = V(x, cloudTop(x, z) + 0.15, z), dir = V(-0.36 + (r() - 0.5) * 0.5, -0.84, 0.3 + (r() - 0.5) * 0.5).normalize(), L = 46 + r() * 18, fall = 0.55 + r() * 0.25;
      return { ti, at, s, dir, L, fall, ph: r() * 6.28, rk: k, spin: [r() * 3 + 1, r() * 3 + 1], deb: Array.from({ length: 6 }, (_, j) => [j / 6 * Math.PI * 2 + r() * 0.6, 0.7 + r() * 0.6, 0.6 + r() * 0.8]), sp: Array.from({ length: 9 }, () => [r() * Math.PI * 2, 0.5 + r(), 0.6 + r() * 0.9]) }; });
    { const g0 = W.imps[0]; g0.at.copy(FIRST.at); g0.dir = FIRST.at.clone().sub(FIRST.from).normalize(); g0.L = FIRST.at.distanceTo(FIRST.from); g0.fall = -FIRST.t0; }
    // 不砸下来的流星（远远地划过天、落到地平线后面），和几颗擦着镜头飞过去的大火球
    W.streaks = Array.from({ length: 26 }, (_, k) => { const t0 = 0.05 + k / 26 * 1.75 + (r() - 0.5) * 0.08, a = r() * Math.PI * 2, d = 40 + r() * 50;
      return { t0, dur: 0.5 + r() * 0.5, from: V(Math.cos(a) * d * 0.6 + (r() - 0.5) * 20, 28 + r() * 26, Math.sin(a) * d - 20), dir: V(-0.4 + (r() - 0.5) * 0.7, -0.75 - r() * 0.2, 0.25 + (r() - 0.5) * 0.7).normalize(), len: 60 + r() * 30, s: 0.5 + r() * 0.6, ph: r() * 6.28 }; });
    W.glint = spr0(T.glowTex, '#ff6a3a', put); W.glint2 = spr0(T.glowTex, '#ffe0c0', put);
    // S7 的主流星替身（和末日流星一个画法，只是大得多）：在镜头里占三分之一以上；1.9 切回原来的镜头时交给 P.meteor
    W.giant = { from: V(40, 28, -66), to: V(15, 10.2, -30) };   // 从右上角进画面，停在画面右上方、整颗在画面以内（S7 镜头压低以后跟着放低）
    return W;
  }
  const spr0 = (map, color, put) => put(new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })));

  // 三套天色：白天（蓝天白云暖阳）/ 暗下来（「直到那一天」）/ 末日（暗红紫黑，红只留在地平线一圈和撞击点附近）
  // 字段：天顶、中段、地平线、地平线以下；太阳、火光；半球光（天、地、强度）；主光（颜色、强度）；雾（颜色、近、远）；云海（颜色、自发光颜色、强度）；积云颜色；轮廓光（颜色、强度）
  const PAL = (() => { const C = c => new THREE.Color(c);
    const mk = (top, mid, hor, low, sunK, fireK, hs, hg, hi, sc, si, fog, fn, ff, cc, ce, ci, cu, rc, rk) => ({ top: C(top), mid: C(mid), hor: C(hor), low: C(low), sunK, fireK, hs: C(hs), hg: C(hg), hi, sc: C(sc), si, fog: C(fog), fn, ff, cc: C(cc), ce: C(ce), ci, cu: C(cu), rc: C(rc), rk });
    return [mk('#2a74dc', '#6fb2f2', '#fff0dc', '#f4eee8', 1, 0, '#cfe3ff', '#e2d6f2', 1.25, '#ffdcae', 2.5, '#d8ecff', 80, 260, '#ffffff', '#9aa8e6', 0.16, '#ffffff', '#ffd27a', 0.85),
      mk('#0c0f26', '#1c1c40', '#4a2030', '#1c1424', 0.15, 0.1, '#5a5a9a', '#2a2040', 0.95, '#c06048', 0.35, '#1e1a36', 40, 140, '#8a88b0', '#2a2850', 0.3, '#5e5a88', '#ff5a3a', 0.45),
      mk('#07030f', '#120717', '#2c070c', '#0a0408', 0, 0.4, '#5660a0', '#140a12', 0.55, '#ff5a2a', 0.3, '#0e0610', 26, 110, '#2b2033', '#2a0605', 0.22, '#170a14', '#8ab8ff', 0.95)]; })();   // 末日：天顶紫黑、地平线一圈暗红火光，灯光压暗偏冷（画面里有真正的暗部，流星、爆炸的光才显眼），卡通一圈冷色轮廓光
  // 这一帧天色的三个权重（白天、暗、末日）和「淡回原样」的进度：灯光、雾、云海 2.0–2.3 收好（韩叔升起时和原来一样），天顶的红和火星留到光柱亮起来（2.42）
  const sky3 = (A, seg) => { const dk = smo(seg(A, 2.34, 2.62)), ap = smo(seg(A, PRO0, PRO0 + 0.22)), nt = smo(seg(A, PRO0 + 2.0, PRO0 + 2.3)), ns = smo(seg(A, PRO0 + 2.1, PRO0 + 2.42)); return { w: [1 - dk, dk * (1 - ap), dk * ap], nt, ns, dk, ap }; };
  // 末日流星的闪光强度（给灯光、云海一起闪）
  const flashAt = A => { let f = 0; for (const [ti, , , s] of IMPS) { const u = A - PRO0 - ti; if (u > -0.02 && u < 0.5) f += s * Math.max(0, Math.min(1, (u + 0.02) / 0.04)) * Math.pow(1 - Math.max(0, u) / 0.5, 2); } return Math.min(2, f); };
  function world(A, E, P) {   // A：脚本进度（旧的序章绝对时间）；闪烁、飘动这些循环用真实时间 Ar，擦镜头按新分镜 An；mr：runMain 的 o 按真实时间（火星往上飘、云海被砸凹）
    const W = P.W, { seg, V } = E, U = W.U, { w, nt, ns, ap, dk } = sky3(A, seg), fl = A > PRO0 ? flashAt(A) : 0, cam = E.camera.position, mo = A - PRO0, Ar = CK.Ar, An = CK.An, mr = CK.rm;
    const b3 = (out, k) => out.setRGB(PAL[0][k].r * w[0] + PAL[1][k].r * w[1] + PAL[2][k].r * w[2], PAL[0][k].g * w[0] + PAL[1][k].g * w[1] + PAL[2][k].g * w[2], PAL[0][k].b * w[0] + PAL[1][k].b * w[1] + PAL[2][k].b * w[2]);
    const n3 = k => PAL[0][k] * w[0] + PAL[1][k] * w[1] + PAL[2][k] * w[2], tc = new THREE.Color();
    b3(U.cTop.value, 'top'); b3(U.cMid.value, 'mid'); b3(U.cHor.value, 'hor'); b3(U.cLow.value, 'low');
    // 太阳：「直到那一天」先被暗红的雾吞掉（2.4–2.75），不会剩一个灰白的圆盘
    const mist = smo(seg(A, 2.38, 2.78)); U.mist.value = mist * (1 - ap); U.sunK.value = (1 - mist) * (1 - dk * 0.4) + 0.0; U.warm.value = w[0];   // 末日里不再留吞掉太阳的那片暗红雾（不然半边天都是红的），天顶回到紫黑
    U.sunCol.value.setRGB(1, 0.85 - 0.45 * mist, 0.63 - 0.5 * mist);
    U.fireK.value = n3('fireK') * (1 + 0.2 * fl); U.fireW.value = 7 + 15 * w[2]; U.haze.value = w[2] * (0.6 + 0.2 * fl); U.op.value = 1 - ns; U.tm.value = Ar; W.dome.visible = ns < 1;   // 末日的火光收成地平线上窄窄一圈
    // 灯光、雾：三套颜色混好，再按 nt 淡回原来的；主光换到太阳那边（韩叔那段之前还原）
    P.baseC.forEach(([l, c0, g0]) => { const i0 = P.base.find(([x]) => x === l)[1];
      if (l.isHemisphereLight) { b3(tc, 'hs'); l.color.copy(tc).lerp(c0, nt); b3(tc, 'hg'); l.groundColor.copy(tc).lerp(g0, nt); l.intensity = (n3('hi') * (1 + 0.28 * fl * ap)) * (1 - nt) + i0 * nt; }
      else { b3(tc, 'sc'); l.color.copy(tc).lerp(c0, nt); l.intensity = (n3('si') * (1 + 0.5 * fl * ap)) * (1 - nt) + i0 * nt; if (nt < 1) l.position.copy(KEY).multiplyScalar(25).lerp(P.sun0, nt); } });
    if (P.fog0) { b3(tc, 'fog'); E.scene.fog.color.copy(tc).lerp(P.fog0[0], nt); E.scene.fog.near = n3('fn') * (1 - nt) + P.fog0[1] * nt; E.scene.fog.far = n3('ff') * (1 - nt) + P.fog0[2] * nt; }
    // 轮廓光（卡通们共用）
    b3(MASCOT_RIM.col.value, 'rc'); MASCOT_RIM.k.value = n3('rk') * (1 + 0.3 * fl * ap); MASCOT_RIM.dir.copy(ap > 0.5 ? V(0, 1, 0) : KEY); MASCOT_RIM.update(E.camera);
    if (MASCOT_RIM.self) MASCOT_RIM.self.value = 0.3 * w[2] * (1 - nt);
    // S6b 俯拍（mo 1.0–1.25）：原来整片棋盘是一样的中等亮度灰紫褐色，没有暗部。环境光压暗，主光换成从左边低低打过来的一束会闪的火光（拉出长影子），四角再压暗一层（runMain 的 dvig2）
    if (mo >= 1.0 && mo < 1.25) P.base.forEach(([l]) => { if (l.isHemisphereLight) l.intensity *= 0.32; else { const fk = 0.85 + 0.15 * Math.sin(Ar * 11) * Math.sin(Ar * 7 + 1); l.position.set(-22, 7, 6); l.color.set('#ff6a30'); l.intensity = 0.75 * fk; } });   // 再加一盏贴着棋盘左边的火光（meteors() 里），从左往右暗下去   // 末日灯光压暗了：卡通自己的颜色提亮一点（不被暗红的环境光吃掉）
    // 云海：颜色跟着天色走，末日时被火光照亮一闪一闪；淡回夜空时整片淡掉（这时才切成半透明，切的时候要 needsUpdate）
    b3(W.cloudM.color, 'cc'); b3(W.cloudM.emissive, 'ce'); W.cloudM.emissiveIntensity = n3('ci') + 0.35 * fl * ap;
    const tr = nt > 0; if (W.cloudM.transparent !== tr) { W.cloudM.transparent = tr; W.cloudM.needsUpdate = true; } W.cloudM.opacity = 1 - nt;
    W.carpet.visible = W.fluff.visible = nt < 1;
    { const dm = w[2] * (1 - nt), fm = W.fluffM; fm.color.copy(W.cloudM.color).multiplyScalar(1 - 0.65 * dm); fm.emissive.copy(W.cloudM.emissive); fm.emissiveIntensity = W.cloudM.emissiveIntensity * (1 - 0.6 * dm);   // 道具云：末日里底色乘 0.35，加烧红的边
      if (fm.transparent !== tr) { fm.transparent = tr; fm.needsUpdate = true; } fm.opacity = 1 - nt; W.DR.value = 0.85 * dm * (1 + 0.25 * Math.min(1, fl));
      W.bncM.color.setScalar(1 - 0.88 * dm); W.bncM.emissiveIntensity = 0.55 * (1 - 0.9 * dm);
      E.camera.updateMatrixWorld(); W.DU.value.set(0, 1, 0).transformDirection(E.camera.matrixWorldInverse); }   // Lambda 拍上去那朵（滑梯顶上）：原来末日里还是亮白粉色，是画面里最亮的东西；压到和别的道具云差不多（线性 0.12），被火照着的那面才亮
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), pv = V(0, 0, 0), sv = V(1, 1, 1);
    W.CP.forEach((c, k) => { let x = c.x, y = c.y + Math.sin(Ar * c.w + c.a) * 0.035, z = c.z, s = c.s;
      if (mo > 0) for (const im of W.imps) { const dt = mr - im.ti; if (dt <= 0) continue; const dx = x - im.at.x, dz = z - im.at.z, d = Math.hypot(dx, dz), Rb = 4 * im.s + 1.6; if (d > Rb) continue;
        const kk = Math.pow(1 - d / Rb, 1.4) * E.easeOut(Math.min(1, dt / 0.32)); x += dx / (d + 0.01) * kk * Rb * 0.12; z += dz / (d + 0.01) * kk * Rb * 0.12; y -= kk * 0.8 * im.s; s *= 1 - 0.22 * kk; }
      pv.set(x, y, z); eu.set(0, c.a, 0); q.setFromEuler(eu); sv.set(s, s * c.fy, s); m4.compose(pv, q, sv); W.carpet.setMatrixAt(k, m4); });
    W.carpet.instanceMatrix.needsUpdate = true;
    b3(tc, 'cu'); W.cumulus.forEach(s => { s.visible = nt < 1; s.material.color.copy(tc); s.material.opacity = 1 - nt; });
    // 天上的星星、原来的夜云：白天藏起来，淡回夜空时一起淡出来
    P.sky.children.forEach(m => { if (m.isPoints) m.material.opacity = ns; }); P.clouds.children.forEach(m => { m.material.opacity = m.userData.o0 * ns; }); P.clouds.visible = ns > 0;
    // 太阳的光芒、镜头光斑（太阳在画面里、没被吞掉时）
    { const sp = SUN.clone().multiplyScalar(140); E.camera.updateMatrixWorld(); const nd = sp.clone().project(E.camera);
      // 擦过镜头的云（cast() 里，镜头前 1 个单位、横着飘过去，中心在画面上 x ≈ -4.64u）挡住太阳时，光芒和光斑（都不做深度测试）跟着收掉，不会画在云上面
      let wc = 0; if (nd.z < 1) WIPES.forEach(tc => { const u = (An - tc) / 0.11; if (Math.abs(u) < 1) wc = Math.max(wc, 1 - smo(Math.min(1, Math.max(0, (Math.abs(nd.x + 4.64 * u) - 1.6) / 0.9)))); });
      const rk = (1 - mist) * w[0] * (1 - wc); W.rays.visible = rk > 0.01; if (W.rays.visible) { W.rays.position.copy(sp); W.rays.scale.setScalar(78); W.rays.material.rotation = Ar * 0.05; W.rays.material.opacity = 0.42 * rk; }
      const on = nd.z < 1 && Math.abs(nd.x) < 1.15 && Math.abs(nd.y) < 1.15 ? 1 - smo(Math.max(0, Math.max(Math.abs(nd.x), Math.abs(nd.y)) - 0.85) / 0.3) : 0;
      W.flare.forEach(m => { const { f, s } = m.userData; m.visible = on * rk > 0.01; if (!m.visible) return; const p = V(nd.x * f, nd.y * f, 0.5).unproject(E.camera).sub(cam).normalize().multiplyScalar(3).add(cam); m.position.copy(p); m.scale.setScalar(s * 3 * (f > 0.5 ? 1.6 : 1)); m.material.opacity = 0.55 * on * rk; }); }
    // 「直到那一天」的影子：看不见的大板从太阳那边滑过来，影子边从棋盘后面扫到前面（2.32–2.56）
    { const sw = seg(A, 2.33, 2.56); W.occ.visible = sw > 0 && mo < 0.3; if (W.occ.visible) { const sP = SWEEP.clone().sub(KEY.clone().multiplyScalar(SWEEP.dot(KEY))).normalize(), e = -8 + 18 * smo(sw);
        W.occ.position.copy(KEY).multiplyScalar(12).addScaledVector(sP, e - 45); W.occ.lookAt(W.occ.position.clone().add(KEY)); } }
    // 末日的火星
    W.embers.visible = ap > 0 && ns < 1; if (W.embers.visible) { const pa = W.embers.geometry.attributes.position, ca = W.embers.geometry.attributes.color;
      W.EM.forEach(([x0, y0, z0, ph, v], k) => { const y = ((((y0 + 1 + mr * v * 1.6) % 23) + 23) % 23) - 1; pa.setXYZ(k, x0 + Math.sin(mr * 0.8 + ph * 9) * 0.8, y, z0 + Math.cos(mr * 0.6 + ph * 7) * 0.6); const b = ap * (1 - ns) * (0.45 + 0.55 * Math.abs(Math.sin(mr * (4 + v * 3) + ph * 20))); ca.setXYZW(k, 1, 0.42, 0.12, Math.min(1, b)); });
      pa.needsUpdate = ca.needsUpdate = true; }
    E.glow((0.05 * w[0] + 0.1 * w[1] + 0.07 * w[2]) * (1 - nt) + 0.22 * nt, (0.04 * w[0] + 0.12 * w[1] + 0.06 * w[2]) * (1 - nt) + 0.2 * nt);
    return { w, nt, ap, fl, dk, mist };
  }
  // 小朵云（同一个 InstancedMesh）：L = [[云的定义（几团球）, 位置, 缩放 [x, y, z], 绕竖轴转角, 凹进去 [方向 x, z, 深度]（拍上去时）], ...]
  function clouds2(W, L, mesh = W.fluff) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), pv = new THREE.Vector3(), sv = new THREE.Vector3(); let n = 0; const cap = mesh.count0 || mesh.instanceMatrix.count;
    L.forEach(([def, p, s, ry = 0, dent]) => { if (!(s[0] > 0.01)) return; const c = Math.cos(ry), si = Math.sin(ry);
      def.forEach(([x, y, z, R0, fl]) => { if (n >= cap) return; let X = (x * c + z * si) * s[0], Z = (-x * si + z * c) * s[2], Y = y * s[1];
        if (dent) { const [dx, dy, dz, dd] = dent, dot = (X * dx + Y * dy + Z * dz) / (R0 * s[0] + 0.3); if (dot > -0.2) { const k = dd * Math.max(0, 1 - Math.abs(dot - 0.6)); X -= dx * k; Y -= dy * k; Z -= dz * k; } }
        pv.set(p.x + X, p.y + Y, p.z + Z); eu.set(0, ry + x, 0); q.setFromEuler(eu); sv.set(R0 * s[0], R0 * fl * s[1], R0 * s[2]); m4.compose(pv, q, sv); mesh.setMatrixAt(n++, m4); }); });
    mesh.count = n; mesh.instanceMatrix.needsUpdate = true; mesh.visible = n > 0; }

  // 关键帧路线：K = [[时刻, x, z], ...]，Catmull-Rom 穿过各点；返回 [x, z, vx, vz]（速度按每单位时间）
  function route(K, t) { const at = tt => { let k = 0; while (k < K.length - 2 && tt > K[k + 1][0]) k++;
      const a = K[Math.max(0, k - 1)], b = K[k], c = K[k + 1], d = K[Math.min(K.length - 1, k + 2)], u = Math.max(0, Math.min(1, (tt - b[0]) / (c[0] - b[0]))), u2 = u * u, u3 = u2 * u;
      const cr = j => 0.5 * (2 * b[j] + (-a[j] + c[j]) * u + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * u2 + (-a[j] + 3 * b[j] - 3 * c[j] + d[j]) * u3); return b.slice(1).map((_, j) => cr(j + 1)); };
    const p = at(t), p1 = at(t + 0.01), p0 = at(t - 0.01); return [...p, ...p.map((v, j) => (p1[j] - p0[j]) / 0.02)]; }
  const angLerp = (a, b, k) => { let d = ((b - a) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI; return a + d * k; };
  // 站的高度：棋盘内圈面板 -0.04、外圈格子顶面 0.19（交界处 0.12 内平滑过渡，像迈上一个台阶），棋盘外面是云
  const gY = (x, z) => { const ox = Math.abs(x) - 8.1, oz = Math.abs(z) - 6.1; if (ox > 0 || oz > 0) return cloudTop(x, z) + 0.3; const k = Math.max(0, Math.min(1, (Math.max(Math.abs(x) - 6.44, Math.abs(z) - 4.44)) / 0.12)); return -0.04 + 0.23 * smo(k); };

  // ---------- 镜头（A）：[起, 止, 关键帧 [[A, 位置, 看点, 速度?], ...]]。镜头内按时间三次 Hermite（spline），镜头之间切；白天两刀用云朵擦过镜头遮住 ----------
  const lin = (a, b, t0, t1) => b.map((v, i) => (v - a[i]) / (t1 - t0));
  // 11/05：开头这几刀按新时间 An 排（风平浪静从 2.9 秒拉到约 7 秒；第三轮嫌长，压到约 5.3 秒）：S1 0–1.3、S2 1.3–2.2、S3a + S3 2.2–4.16（新加的一段沿棋盘前沿往右横移，接上原来的 S3），
  // 之后的 S3b、S3c、S5… 是原来的分镜（原来 1.92 以后的时刻 + 2.24；S3c 上摇天空那一段放慢成 4.855–5.863）
  const V3S = [lin([-1.75, 0.86, 7.95], [-1.41, 0.84, 7.76], 1.45, 1.92), lin([1.35, 0.95, 1.5], [1.67, 0.95, 1.47], 1.45, 1.92)];   // 原来 S3 的匀速横移
  const SHOTS = [
    // S1 建立镜头：慢慢往前推、往下降一点（约 1.2 单位/秒，和原来一样；第三轮只留上一版这条路线的后 1.3 秒），太阳在画面上方，光芒和镜头光斑；CloudFront 从前景冲浪掠过，Bedrock 在中景蹦床上翻跟头
    [0, 1.3, [[0, [-9.045, 2.766, 11.304], [2, 1.099, -3]], [1.3, [-8.02, 2.38, 9.87], [2, 0.95, -3]]]],
    // S2 EC2 跳绳特写（约 3 下）：机位稍微往下倾，EC2 整个在画面中上部，绳子扫过脚下那一下在字幕上面；SQS 小队在它后面那条边上蹦过去、绕到前边，Lambda 从后面跑过
    [1.3, 2.2, [[1.3, [-3.02, 0.92, 7.1], [-3.62, 0.36, 4.1]], [2.2, [-2.6, 0.84, 6.68], [-3.48, 0.36, 4.1]]]],
    // S3a + S3：从棋盘左前方高一点的地方往右横移、一路往下降、越移越慢（俯角大一点：EC2 跳绳、DynamoDB、RDS 落在画面中段，不压在字幕后面）→ 抛球、S3 在云朵小岛上挥手；
    // 2.2–3.69 一整段三次曲线，终点速度写死成原来 S3 的匀速，每个分量都单调（速度不过零、不往回走）。第三轮把上一版 2.8–5.29 那条曲线的前 1.0 秒剪掉：
    // 起点就是那条曲线 3.8 秒处的位置和速度（同一条三次曲线截一段，路线、减速和上一版后 1.49 秒逐点一样，只是从更靠右、更低一点的地方切进来）。
    // 3.69 以后就是原来的 S3（匀速），往下和原来逐帧一样
    [2.2, 4.16, [[2.2, [-4.1678, 2.0701, 9.3136], [-1.3242, 0.7278, 2.4929], [[2.3453, -1.1276, -1.3249], [2.665, 0.2551, -1.102]]], [3.69, [-1.75, 0.86, 7.95], [1.35, 0.95, 1.5], V3S], [4.16, [-1.41, 0.84, 7.76], [1.67, 0.95, 1.47], V3S]]],
    // S3b 滑梯（3/4 正面，跟着 S3 往下摇）：S3 坐在槽里越滑越快，从平出口飞出去，落在棋盘上压扁、弹一下，冲镜头张开双手
    [4.16, 4.56, [[4.16, [7.0, 1.15, 6.6], [4.0, 1.05, 1.1]], [4.56, [6.9, 1.0, 6.9], [4.2, 0.45, 3.3]]]],
    // S3c 回到大家：影子扫过来、一个接一个停下转过身 → 越过它们头顶慢慢摇上天（约 1.3 秒，看太阳被吞、红点一点点变大）
    //   11/09（refine）：最后一帧机位 y 1.05 → 1.75（边摇边升，看点不动）：去掉遮幅后 DynamoDB、RDS、S3 桶口那一排头顶贴在画面下沿停了 0.7 秒；现在 T≈7.7 前平滑出画，天边红点稍往上、离「直到那一天」远一点
    [4.56, 5.863, [[4.56, [-1.12, 0.82, 7.6], [1.95, 0.95, 1.45]], [4.855, [-1.05, 0.86, 7.62], [2.2, 1.4, 0.6]], [5.863, [-1.15, 1.75, 7.95], [8.5, 7.2, -14]]]],
    // S5 反打：卡通们脸朝太阳那边（朝镜头），身后（画面左边远处）的云海被第一颗砸中
    [5.863, PRO + 0.62, [[5.863, [3.55, 0.62, -0.35], [-0.6, 0.95, 5.0]], [PRO, [3.45, 0.64, -0.25], [-0.75, 0.95, 5.1]], [PRO + 0.62, [3.9, 0.95, -0.85], [-0.6, 1.1, 4.9]]]],
    // S6 跟着 Lambda：从前面看它侧翻着横穿、拍在右边那朵白云上；弹回来时镜头升高、往下看它脸朝下拍在棋盘上
    [PRO + 0.62, PRO + 1.0, [[PRO + 0.62, [0.6, 2.0, 9.0], [0.6, 2.2, 1.4]], [PRO + 0.86, [1.4, 2.05, 8.6], [2.1, 2.05, 1.5]], [PRO + 1.0, [1.42, 2.1, 8.45], [2.05, 1.85, 1.6]]]],
    // S6b 一刀切到高处往下看：它从画面上方掉下来、脸朝下拍在棋盘上（画面中上部；躲在前排的几个在画面下面，挡不着）
    [PRO + 1.0, PRO + 1.25, [[PRO + 1.0, [1.3, 4.1, 6.5], [1.28, 0.32, 3.42]], [PRO + 1.25, [1.3, 4.3, 6.3], [1.27, 0.25, 3.5]]]],
    // S7 低机位：前排各自躲好，巨大的主流星压在头顶；镜头慢慢往后缩、往上仰一点。机位压到快贴着格子（0.36），仰得少：前排一直在画面中间那一条，
    // 脚底在字幕以上（加遮幅时是 y < 740；11/09 去掉遮幅后看点抬高一点、整排落到画面中间偏下，脚底约 y 790、字幕顶约 840），关键表演都不压在「天外流星坠落」字幕底下
    [PRO + 1.25, PRO + 1.9, [[PRO + 1.25, [0.3, 0.36, 10.3], [1.6, 1.9, -6]], [PRO + 1.9, [0.4, 0.34, 11.0], [2.8, 2.55, -8]]]],
  ];
  SHOTS.forEach(([t0, t1, K]) => { if (K.length === 2) { const [a, b] = K, v = [lin(a[1], b[1], t0, t1), lin(a[2], b[2], t0, t1)]; a[3] = v; b[3] = v; } else if (!K[0][3]) { K[0][3] = [lin(K[0][1], K[1][1], K[0][0], K[1][0]), lin(K[0][2], K[1][2], K[0][0], K[1][0])]; } });   // 第一帧写了速度的（S3a）照写的
  // 这一帧的镜头（A：新的序章绝对时间 An，< PRO + 1.9）；返回 [位置, 看点, 第几个镜头]
  function camOpen(A, V) { let j = 0; while (j < SHOTS.length - 1 && A >= SHOTS[j][1]) j++; const [p, l] = spline(A, SHOTS[j][2], V); return [p, l, j]; }
  // 云朵擦过镜头（白天两刀：S1→S2 1.3、S2→S3a 2.2，新时间 An）：一团云从画面右边飘到左边，正中那一刻完全挡住，这时切镜头
  const WIPES = [1.3, 2.2];

  // ---------- 服务卡通（A = 序章绝对时间） ----------
  // 吓一跳以后各自的逃跑、躲藏位置（棋盘前排，S7 的低机位从前面看）：x, z
  const HIDE = { ec2: [-2.1, 4.95], q: [-0.9, 5.15], dyn: [1.3, 4.25], rds: [0.95, 5.0], s3: [1.85, 5.25], cf: [2.75, 5.05], bed: [-3.1, 5.25], lam: [-0.35, 5.45] };
  const TILT = 9;   // EC2 躲在翘起来的 9 号格后面（x -2）

  // A：表演时钟（旧时间；run 里是 AC(An)，runMain 里是 PRO0 + 脚本 o）。循环（蹦、走路步子、挥手、扭、抖、眨眼）用真实时间 Ar，擦镜头用新时间 An
  function cast(A, E, P) {
    const { seg, easeOut } = E, W = P.W, M = W.ms, mo = A - PRO0, cam = E.camera.position, Ar = CK.Ar, An = CK.An;
    const put = (m, x, y, z, yaw, p) => { m.g.visible = true; m.g.position.set(x, y, z); m.g.rotation.y = yaw; m.pose({ t: Ar, ...p }); m.look(cam); };
    const toCam = (x, z) => Math.atan2(cam.x - x, cam.z - z), YS = Math.atan2(SUN.x, SUN.z);
    const wav = (a, b, k) => a + (b - a) * k;
    // 「直到那一天」：一个接一个停下（d 是各自的延迟），抬头 → 转过身去看太阳那边的天
    const stopK = d => smo(seg(A, 2.36 + d, 2.5 + d)), turnK = d => smo(seg(A, 2.5 + d, 2.72 + d));
    const lookUp = (d, base = {}) => { const k = stopK(d), u = turnK(d); return { ...base, lean: (base.lean || 0) * (1 - k) - 0.16 * k, look: [(base.look ? base.look[0] : 0) * (1 - k), (base.look ? base.look[1] : 0) * (1 - k) + 0.95 * k], mouth: k > 0.4 ? 'o' : base.mouth, eyes: k > 0.4 ? (A > 2.85 ? 'wide' : 'open') : base.eyes,
      brow: k * smo(seg(A, 2.8, 3.0)) * 0.9, armL: k > 0.3 ? [0, 0.3] : base.armL, armR: k > 0.3 ? [0, 0.3] : base.armR, tremble: smo(seg(A, 2.95, 3.15)) * 0.35, hop: (base.hop || 0) * (1 - k), squash: (base.squash || 0) * (1 - k), walk: (base.walk || 0) * (1 - k) }; };
    // 冲击波：第一颗砸下去以后 0.06–0.16 扫到大家（离撞击点越近越早），身子被吹得压扁、往镜头这边歪
    const IM0 = FIRST.at, shockAt = (x, z) => 0.05 + Math.hypot(x - IM0.x, z - IM0.z) * 0.009, blast = (x, z) => { const u = mo - shockAt(x, z); return u < 0 ? 0 : Math.sin(Math.PI * Math.min(1, u / 0.16)) * Math.exp(-u * 2); };
    const panic = (sp, ph = 0) => { const w = Math.min(1, sp / 2.5); return { walk: w, step: Ar * 34 + ph, hop: Math.abs(Math.sin(Ar * 17 + ph)) * 0.1 * w, eyes: 'wide', mouth: 'scream', brow: 1, sweat: 1, armL: [0.3 + 0.5 * Math.sin(Ar * 31 + ph), 2.2 + 0.45 * Math.sin(Ar * 27)], armR: [0.3 + 0.5 * Math.sin(Ar * 29 + 1 + ph), 2.2 + 0.45 * Math.sin(Ar * 25 + 2)], lean: 0.18 * w }; };
    const crouch = (k = 1) => ({ squash: 0.2 * k, armK: 1 + 0.7 * k, armL: [0.3 * k, 0.3 + 2.45 * k], armR: [0.3 * k, 0.3 + 2.45 * k], eyes: 'shut', mouth: 'wavy', brow: 1, tremble: k, sweat: 0.8 * k });
    // 跑一条路线：返回 [x, z, 朝向, 速度]；停下来以后朝向 rest（默认朝镜头）
    const run = (K, t, rest) => { const [x, z, vx, vz] = route(K, t), sp = Math.hypot(vx, vz), r0 = rest != null ? rest : toCam(x, z); return [x, z, sp > 0.3 ? angLerp(r0, Math.atan2(vx, vz), Math.min(1, sp / 1.2)) : r0, sp]; };
    const hideAfter = 1.9;   // 1.9 切回原来的镜头以后，卡通们藏起来（原来那几段镜头里不出现），HIT 以后在云上冒出来欢呼
    const gone = mo >= hideAfter && mo < 5.0;
    if (gone) { W.list.forEach(m => { m.g.visible = false; }); }

    // ======== EC2：跳绳（每 0.32 跳一下，跳到最高时绳子从脚下过，和铃声对齐） ========
    if (!gone && mo < 5.0) { const m = M.ec2, [x, z] = SPOT.ec2, y = gY(x, z), ph = (A - 0.6) / 0.32, yaw0 = 0.22;
      if (A < 2.36) { const u = ((ph + 0.51) % 1 + 1) % 1, [h, s] = mascotHop(u, 0.3), c = 2 * Math.PI * ph, arm = [0.45 + 0.42 * Math.sin(c + 1.2), 0.8 + 0.2 * Math.cos(c + 1.2)];
        put(m, x, y + h, z, yaw0, { squash: s, eyes: (Math.floor(ph + 0.5) % 3 === 0) ? 'happy' : 'open', mouth: 'open', armL: arm, armR: arm, look: [0, -0.25], ant: -0.3 * Math.sin(Math.PI * u) }); }
      else if (mo < 0.05) { const k = stopK(0.06), u = turnK(0.06); put(m, x, y, z, angLerp(yaw0, YS, u), lookUp(0.06, { ant: 0.15 * Math.sin(Ar * 20) * (1 - k) })); }
      else if (mo < 0.42) { // 冲击波吹得天线往前倒 → 天线「嘣」地竖直、整个僵住（不眨眼）→ 一蹦老高
        const b = blast(x, z), st = seg(mo, 0.14, 0.2), jp = seg(mo, 0.3, 0.42), [h, s] = mascotHop(jp, 0.7);
        put(m, x - 0.25 * smo(seg(mo, 0.06, 0.14)), y + h, z + 0.2 * smo(seg(mo, 0.06, 0.14)), YS, { squash: 0.35 * b + s, lean: 0.3 * b, ant: 1.1 * b - 0.05 * st + 0.08 * Math.sin(Ar * 60) * st * (1 - jp), eyes: 'wide', mouth: st > 0 ? 'flat' : 'o', blink: false, brow: 1, armL: [0, 0.15], armR: [0, 0.15], look: [0, 0.3] }); }
      else { const K = [[0.42, x - 0.25, z + 0.2], [0.62, -3.3, 4.9], [0.85, HIDE.ec2[0] - 0.2, HIDE.ec2[1] + 0.25], [1.0, HIDE.ec2[0], HIDE.ec2[1]]], arrive = 1.0;
        if (mo < arrive) { const [xx, zz, yaw, sp] = run(K, mo); put(m, xx, gY(xx, zz), zz, yaw, { ...panic(sp), ant: 0.5 }); }
        else { // 躲在翘起来的格子后面：探头（1.3、1.6）又缩回去
          const pk = Math.max(Math.sin(Math.PI * seg(mo, 1.28, 1.48)), Math.sin(Math.PI * seg(mo, 1.6, 1.82))), xx = HIDE.ec2[0], zz = HIDE.ec2[1], c = crouch(1 - pk);
          put(m, xx, gY(xx, zz) - 0.06 * (1 - pk), zz, toCam(xx, zz), { ...c, squash: 0.28 * (1 - pk), eyes: pk > 0.3 ? 'wide' : 'shut', mouth: pk > 0.3 ? 'wavy' : 'wavy', look: [0.2, 0.9 * pk], armL: [0.3, 0.6 + 2.0 * (1 - pk)], armR: [0.3, 0.6 + 2.0 * (1 - pk)], ant: -0.2 + 0.4 * pk }); } } }
    // 绳子：绕两只手的连线转（跳到最高时从脚下过），停下来以后搭在脚前的地上
    { const m = M.ec2, rp = W.rope, [x, z] = SPOT.ec2, ph = (A - 0.6) / 0.32, live = A < 2.36;
      rp.visible = mo < 0.42 && !gone; const u = ((ph + 0.51) % 1 + 1) % 1, h = live ? mascotHop(u, 0.3)[0] : 0, phi = Math.PI - 2 * Math.PI * ph;
      rp.rotation.order = 'YXZ'; rp.scale.set(0.5, 0.62, 0.5);
      if (live) { rp.position.set(x, gY(x, z) + h + 0.33, z); rp.rotation.set(phi, 0.22, 0); } else { rp.position.set(x - 0.02, gY(x, z) + 0.03, z + 0.15); rp.rotation.set(-Math.PI * 0.5, 0.22, 0); rp.scale.set(0.5, 0.42, 0.5); } }

    // ======== SQS 三个排成一队，一个接一个蹦着往前走（每 0.32 蹦一下）；天一暗领头的一停，后面两个撞上来 ========
    // 风平浪静补长以后（A < 0.6）先在棋盘左边绕一个跑道形的圈（SQL，前边就是原来那条直线），0.6 以后走原来的直线
    if (!gone && mo < 5.0) M.q.forEach((m, k) => { const z = 3.5, xs = -5.2 + 1.77 * Math.min(A, 2.38) - 0.62 * k;
      if (A < 2.38) { const [h, s] = mascotHop(((A / 0.32 - k * 0.33) % 1 + 1) % 1, 0.17), [qx, qz, qy] = SQL(A - k * 0.62 / 1.77); put(m, qx, gY(qx, qz) + h, qz, qy - 0.2, { squash: s, eyes: 'happy', mouth: 'smile', walk: 0.6, step: Ar * 20 - k, armL: [0.4, 0.4], armR: [-0.3, 0.4] }); return; }
      if (mo < 0.05) { const hit = k ? Math.sin(Math.PI * seg(A, 2.4 + 0.06 * (k - 1), 2.54 + 0.06 * (k - 1))) : 0, x = xs + 0.13 * k * smo(seg(A, 2.38, 2.44 + 0.06 * k)) * (1 - 0.6 * smo(seg(A, 2.5 + 0.06 * k, 2.66 + 0.06 * k)));
        put(m, x, gY(x, z), z, angLerp(Math.PI / 2 - 0.2, YS, turnK(0.1 + 0.06 * k)), lookUp(0.1 + 0.06 * k, { squash: 0.3 * hit, eyes: hit > 0.2 ? 'shut' : 'happy', mouth: hit > 0.2 ? 'o' : 'smile', tilt: -0.25 * hit })); return; }
      const x0 = xs + 0.13 * k * 0.4;
      // 像多米诺一样一个推一个倒下去（往镜头这边倒）→ 弹起来 → 往前排跑 → 叠罗汉发抖
      const fall = smo(seg(mo, 0.08 + k * 0.05, 0.2 + k * 0.05)) * (1 - smo(seg(mo, 0.34 + k * 0.03, 0.44 + k * 0.03)));
      if (mo < 0.46) { put(m, x0, gY(x0, z), z, YS, { lean: 1.25 * fall, eyes: fall > 0.3 ? 'shut' : 'wide', mouth: 'scream', brow: 1, armL: [0, 2.4 * fall], armR: [0, 2.4 * fall], pivot: null }); return; }
      const hx = HIDE.q[0], hz = HIDE.q[1], K = [[0.46, x0, z], [0.7, x0 + 0.2, 4.4], [0.95, hx - 0.1 * k, hz + 0.2]], arrive = 0.95 + 0.06 * k, tt = Math.min(mo, arrive);
      const [x, zz, yaw, sp] = run(K, Math.min(tt, 0.95));
      const st = seg(mo, arrive, arrive + 0.14), lift = k * 0.47 * smo(st), hp = Math.sin(Math.PI * st) * 0.3 * (k ? 1 : 0), ck = smo(seg(mo, arrive + 0.1, arrive + 0.22));
      put(m, mo < arrive ? x : hx, gY(hx, hz) + (mo < arrive ? 0 : lift + hp), mo < arrive ? zz : hz, mo < arrive ? yaw : toCam(hx, hz), mo < arrive ? panic(sp, k) : { ...crouch(ck), squash: 0.12 * ck, armK: 1 + 0.4 * ck, tremble: 1.4 * ck, eyes: (Math.floor(Ar * 3 + k) % 4 === 0) ? 'wide' : 'shut' }); });

    // ======== DynamoDB 和 RDS 抛沙滩球（0.38 飞到，接球落在 0.6 / 1.24 / 1.88 的铃声上）；RDS 2.06 把球顶上天，天一暗抬头看天，球砸在它头上 ========
    // 风平浪静补长以后，每 0.64 一抛、两人轮流，往前补到 −2.98（风平浪静从 −2.24 开始；接球都在每两声铃的那一声上）
    { const D = M.dyn, Rr = M.rds, [dx, dz] = SPOT.dyn, [rx, rz] = SPOT.rds, dy = gY(dx, dz), ry = gY(rx, rz), TH = [[-2.98, 1], [-2.34, 0], [-1.7, 1], [-1.06, 0], [-0.42, 1], [0.22, 0], [0.86, 1], [1.5, 0]], FL = 0.38;
      const yD = Math.atan2(rx - dx, rz - dz) * 0.6 + 0.35, yR = Math.atan2(dx - rx, dz - rz) * 0.6 - 0.45;
      let j = -1; TH.forEach(([t0], i) => { if (A >= t0) j = i; });
      const hand = (m, x, y, z) => V3(x, y + m.top + 0.12, z), pD = hand(D, dx, dy, dz), pR = hand(Rr, rx, ry, rz), [t0, who] = TH[Math.max(0, j)], fly = A < t0 + FL;
      const holder = A >= 2.06 ? -1 : fly ? -1 : (who === 0 ? 1 : 0);
      if (!gone && mo < 5.0) {
        if (mo < 0.05) {
          const pre = (i) => { const nx = TH.find(([tt, w]) => tt > A && w === i); return nx ? smo(seg(A, nx[0] - 0.2, nx[0])) : 0; };
          const armsFor = (i) => { const thr = TH.find(([tt, w]) => w === i && A >= tt && A < tt + 0.16); if (thr) { const u = seg(A, thr[0], thr[0] + 0.16); return [1.1 * u, 2.6 * (1 - u) + 0.5 * u]; }
            const cat = TH.find(([tt, w]) => w !== i && A >= tt + 0.2 && A < tt + FL + 0.06); if (cat || holder === i) return [0.15, 2.5]; const k = pre(i); return [0.15 * k, 0.32 + 2.2 * k]; };
          const catchSq = (i) => { const c = TH.find(([tt, w]) => w !== i && A >= tt + FL && A < tt + FL + 0.16); return c ? Math.sin(Math.PI * seg(A, c[0] + FL, c[0] + FL + 0.16)) * 0.18 : 0; };
          const hopOf = (i) => { const c = TH.find(([tt, w]) => w !== i && A >= tt + FL + 0.02 && A < tt + FL + 0.28); return c ? mascotHop(seg(A, c[0] + FL + 0.02, c[0] + FL + 0.28), 0.16) : [0, 0]; };
          const aD = armsFor(0), [hD, sD] = hopOf(0), [hR, sR] = hopOf(1);
          // RDS 2.0–2.1 把球往上一顶（头一点），2.36 停下来抬头看天，2.56 球砸在头上：压扁、眼冒金星
          const head = Math.sin(Math.PI * seg(A, 1.98, 2.12)), bonk = seg(A, 2.56, 2.7), dz2 = A > 2.56 ? 1 : 0, aR = A >= 1.92 && A < 2.06 ? [0.15, 2.5 - 2.0 * seg(A, 1.92, 2.0)] : armsFor(1);
          put(D, dx, dy + hD, dz, angLerp(yD, YS, turnK(0.0)), lookUp(0.0, { squash: sD + catchSq(0), armL: aD, armR: aD, eyes: holder === 0 || fly ? 'open' : 'happy', mouth: 'open', look: [0.6, fly ? 0.5 : 0.2] }));
          const rP = lookUp(0.16, { squash: sR + catchSq(1) - 0.1 * head, lean: -0.25 * head, armL: aR, armR: aR, eyes: holder === 1 || fly ? 'open' : 'happy', mouth: 'open', look: [-0.6, fly || A > 2.0 ? 0.6 : 0.2] });
          if (dz2) Object.assign(rP, { squash: 0.42 * Math.sin(Math.PI * Math.min(1, bonk * 1.4)) * (1 - bonk * 0.5), eyes: 'dizzy', mouth: 'wavy', stars: smo(seg(A, 2.58, 2.7)), tilt: 0.12 * Math.sin(Ar * 6), look: [0, 0] });
          put(Rr, rx, ry + hR, rz, angLerp(yR, YS, turnK(0.16)), rP);
        } else {
          // 冲击波扫到：DynamoDB 整个身子被惊得往上一窜、左右一抖 → 往前排跑 → 缩成一团躲在 RDS 后面探头
          // （11/09：身子连成一整个。原来三片盘子被惊得错开、躲的时候拆成三片分头藏，看着像裂开了）
          // 11/10：原来一直缩在 RDS 左边（0.3, 5.0），那正是 Lambda 跑去躲的那条路（1.54 正好穿过它，胳膊从 DDB 身上过去）。现在先照旧跑到 RDS 左边缩着（Lambda 落地那个俯拍镜头里看不见它），
          //   1.24–1.44 从 RDS 背后绕到它右后方（HIDE.dyn）整个藏起来，Lambda 1.36 起从 RDS 背后左边跑过去时它已经躲好了（两个都在 RDS 身后，挡住了）；
          //   1.56 起（Lambda 已经跑到前排）才从 RDS 右肩后面往上、往右探出头（原来 1.42–1.72 往上伸，正撞上 Lambda 跑过来）
          const b = blast(dx, dz), sp = seg(mo, 0.1, 0.36), off = Math.sin(Math.PI * sp) * (1 - sp * 0.3);
          if (mo < 0.46) put(D, dx, dy + 0.08 * off, dz, YS, { squash: 0.3 * b - 0.16 * off, lean: 0.25 * b, tilt: 0.14 * off * Math.sin(Ar * 55), eyes: 'wide', mouth: 'scream', brow: 1, armL: [0, 2.2 * off], armR: [0, 2.2 * off], sweat: 1 });
          else { const K = [[0.46, dx, dz], [0.7, -0.1, 4.0], [0.95, 0.25, 5.3]], arrive = 0.95, K2 = [[1.24, 0.3, 5.0], [1.33, 0.2, 4.45], [1.44, HIDE.dyn[0], HIDE.dyn[1]]];
            if (mo < arrive) { const [x, z, yaw, s2] = run(K, mo); put(D, x, gY(x, z), z, yaw, panic(s2, 1)); }
            else if (mo < 1.24) { const sk = smo(seg(mo, arrive, arrive + 0.22)), x = 0.25 + 0.05 * sk + Math.sin(Ar * 70) * 0.012, z = 5.3 - 0.3 * sk;   // 先缩在 RDS 左边（和原来一样）
              put(D, x, gY(x, z), z, toCam(0.25, 5.3), { squash: 0.3 * sk, lean: -0.1 * sk, eyes: 'shut', mouth: 'wavy', brow: 1, tremble: 1, sweat: 1, armL: [0.2, 1.2], armR: [0.2, 1.2] }); }
            else if (mo < 1.44) { const [x, z, , s2] = run(K2, mo), u = seg(mo, 1.24, 1.44), q = route(K2, mo), yaw = angLerp(toCam(x, z), Math.atan2(q[2], q[3]), 0.35);   // 缩着身子、侧着从 RDS 背后溜过去（脸大半还朝着镜头）
              put(D, x, gY(x, z) + Math.abs(Math.sin(u * Math.PI * 3)) * 0.05, z, yaw, { squash: 0.3, walk: Math.min(1, s2 / 2.5), step: Ar * 40, lean: -0.1, eyes: 'shut', mouth: 'wavy', brow: 1, tremble: 1, sweat: 1, armL: [0.2, 1.2], armR: [0.2, 1.2] }); }
            else { const [hx, hz] = HIDE.dyn, tb = Math.sin(Ar * 70) * 0.012;
              const pk = Math.sin(Math.PI * seg(mo, 1.56, 1.92)), x = hx + 0.2 * pk + tb, z = hz;   // 缩在 RDS 后面；探头时往右挪一点、身子往上伸，从 RDS 右肩后面露出眼睛
              put(D, x, gY(x, z), z, toCam(hx, hz), { squash: 0.3 - 0.6 * pk, lean: -0.1 + 0.22 * pk, tilt: -0.2 * pk, eyes: pk > 0.3 ? 'wide' : 'shut', mouth: 'wavy', brow: 1, tremble: 1, sweat: 1, armL: [0.2, 1.2], armR: [0.2, 1.2], look: [0, 0.6 * pk] }); } }
          // RDS：球掉下来砸了自己一下（已经晕了），被吹得往后一坐 → 抱头往前排跑 → 蹲下抱头，头上的星星还在转
          const br = blast(rx, rz);
          if (mo < 0.46) put(Rr, rx, ry, rz, YS, { squash: 0.38 * br + 0.1, lean: 0.35 * br, eyes: mo < 0.2 ? 'dizzy' : 'wide', mouth: 'scream', stars: 1 - seg(mo, 0.2, 0.4) * 0.5, brow: 1, armL: [0.3, 2.5], armR: [0.3, 2.5], armK: 1.6, sweat: 1 });
          else { const K = [[0.46, rx, rz], [0.72, 1.5, 4.0], [0.98, HIDE.rds[0], HIDE.rds[1]]], arrive = 0.98;
            if (mo < arrive) { const [x, z, yaw, s2] = run(K, mo); put(Rr, x, gY(x, z), z, yaw, { ...panic(s2, 2), armL: [0.3, 2.6], armR: [0.3, 2.6], armK: 1.6, stars: 0.5 }); }
            else { const [hx, hz] = HIDE.rds; put(Rr, hx, gY(hx, hz), hz, toCam(hx, hz), { ...crouch(smo(seg(mo, arrive, arrive + 0.12))), stars: 0.5 * (1 - seg(mo, 1.4, 1.7)) }); } }
        } }
      // 球
      const b = W.ball; b.visible = mo < 0.8 && !gone;
      if (A < 1.98) { if (fly && j >= 0) { const [a, c] = who === 0 ? [pD, pR] : [pR, pD], u = seg(A, t0, t0 + FL); b.position.copy(a).lerp(c, u); b.position.y += Math.sin(Math.PI * u) * 1.0; b.rotation.set(u * 9, u * 4, 0); }
        else { b.position.copy(holder === 0 ? pD : pR); b.rotation.set(0, Ar, 0); } }
      else if (A < 2.56) { const u = seg(A, 1.98, 2.56), top = pR.clone(); top.y += 0.08 + 4 * 1.55 * u * (1 - u) - 0.18 * u; b.position.copy(top); b.rotation.set(Ar * 6, 0, Ar * 3); }   // 顶上去、落回来正好砸在头顶
      else { const u = An - 4.855, bx = pR.x - 0.55 * Math.min(u, 1.0) - (mo > 0.08 ? (mo - 0.08) * 2.6 : 0), bz = pR.z + 0.4 * Math.min(u, 1.0) + (mo > 0.08 ? (mo - 0.08) * 1.4 : 0);
        const by = ry + 0.17 + Math.abs(Math.sin(u * 7 + 0.6)) * 0.7 * Math.exp(-u * 3.5); b.position.set(bx, by, bz); b.rotation.set(u * 6, 0, -u * 8); } }

    // ======== Lambda 绕着 DynamoDB 一圈圈飞跑（快！）；天一暗一个急刹 ========
    if (!gone && mo < 5.0) { const m = M.lam, [cx, cz] = SPOT.lam, RX = 2.55, RZ = 1.05, om = 2 * Math.PI / 1.02, tq = Math.min(A - 2.3, 0.14), th = 0.9 + om * Math.min(A, 2.3) + (A > 2.3 ? om * (tq - tq * tq / 0.28) : 0);
      const x0 = cx + RX * Math.cos(th), z0 = cz + RZ * Math.sin(th), mv = A < 2.42 ? Math.max(0, 1 - Math.max(0, A - 2.3) / 0.14) : 0, mvYaw = Math.atan2(-RX * Math.sin(th), RZ * Math.cos(th));
      if (mo < 0.05) { const sk = Math.sin(Math.PI * seg(A, 2.3, 2.5)); put(m, x0, gY(x0, z0) + Math.abs(Math.sin(Ar * 21)) * 0.1 * mv, z0, angLerp(mvYaw, YS, turnK(0.04)), lookUp(0.04, { walk: mv, step: Ar * 46, tilt: 0.28 * mv, lean: 0.25 * mv - 0.4 * sk, eyes: 'happy', mouth: 'open', armL: [-0.9 * mv, 0.5], armR: [-0.9 * mv, 0.5] }));
        W.spray.slice(0, 6).forEach((s, k) => { const back = (((A * 1.6 + k / 6) % 1) + 1) % 1, tb = th - back * 0.9; s.visible = mv > 0.1 || A < 2.6; const a2 = Math.min(1, (A < 2.42 ? 1 : 1 - (A - 2.42) / 0.2)); s.position.set(cx + RX * Math.cos(tb), gY(x0, z0) + 0.08 + back * 0.25, cz + RZ * Math.sin(tb)); s.scale.setScalar(0.25 + back * 0.45); s.material.opacity = 0.55 * (1 - back) * Math.max(0, a2); }); }
      else { // 冲击波一扫转了个圈 → 慌得原地乱转 → 0.45 旁边那颗砸下来把它掀上天（S5 里往上飞出画面）→ S6 侧翻着横穿、拍在右边那朵白云上压扁、停一下（0.8–0.92）、弹回来脸朝下拍在棋盘上（1.12）→ 爬起来晕乎乎地跑去躲
        const P0 = V3(x0, gY(x0, z0), z0), A1 = V3(-1.4, 3.7, 1.6), BC = V3(3.35, 2.25, 1.75), LD = V3(1.25, -0.04, 2.9);
        if (mo < 0.45) { const sp = seg(mo, 0.12, 0.45); put(m, P0.x + 0.25 * Math.sin(sp * 12), P0.y, P0.z + 0.2 * Math.cos(sp * 12) - 0.2, YS + sp * 14, { eyes: 'wide', mouth: 'scream', brow: 1, sweat: 1, walk: 1, step: Ar * 50, armL: [0, 2.5], armR: [0, 2.5], tilt: 0.3 * blast(x0, z0) }); }
        else if (mo < 0.62) { const u = seg(mo, 0.45, 0.62), p = P0.clone().lerp(A1, u); p.y = P0.y + 5.5 * Math.sin(Math.PI * 0.5 * u); put(m, p.x, p.y, p.z, toCam(p.x, p.z), { eyes: 'wide', mouth: 'scream', tilt: -u * 5, armL: [0, 2.7], armR: [0, 2.7], sweat: 1, brow: 1, pivot: 'c', scale: 1.15 }); }
        else if (mo < 0.8) { const u = seg(mo, 0.62, 0.8), p = A1.clone().lerp(BC, u); p.y += Math.sin(Math.PI * u) * 0.5; put(m, p.x, p.y, p.z, toCam(p.x, p.z), { eyes: 'wide', mouth: 'scream', tilt: -5 - u * 7.0, armL: [0, 2.7], armR: [0, 2.7], sweat: 1, brow: 1, pivot: 'c', scale: 1.15 }); }   // 脸一直朝着镜头侧翻着飞
        else if (mo < 0.92) { const u = seg(mo, 0.8, 0.92), sq = Math.min(1, u * 6) * (1 - smo(seg(u, 0.75, 1))); put(m, BC.x + 0.12 * sq, BC.y, BC.z, toCam(BC.x, BC.z), { eyes: 'shut', mouth: 'o', armL: [0, 2.9], armR: [0, 2.9], pivot: 'c', scale: 1.15 }); m.R.rotation.set(0, 0, Math.PI / 2); m.R.scale.multiply(V3(1 + sq * 0.5, 1 - sq * 0.55, 1 + sq * 0.4)); m.R.position.x += 0.0; }   // 侧着「嘭」地拍扁在云上，停 3–4 帧
        else if (mo < 1.12) { const u = seg(mo, 0.92, 1.12), p = BC.clone().lerp(LD, u); p.y = BC.y + (LD.y - BC.y) * u + Math.sin(Math.PI * u) * 0.9; put(m, p.x, p.y, p.z, toCam(p.x, p.z), { eyes: 'wide', mouth: 'scream', tilt: Math.PI / 2 + Math.PI * 1.5 * smo(u), lean: Math.PI / 2 * smo(seg(u, 0.6, 1)), armL: [0, 2.7], armR: [0, 2.7], sweat: 1, pivot: 'c', scale: 1.15 }); }   // 弹回来再侧翻一圈半，最后往前扑倒
        else if (mo < 1.36) { const u = seg(mo, 1.12, 1.36), sq = 0.45 * Math.sin(Math.PI * Math.min(1, u * 3)); put(m, LD.x, LD.y, LD.z, toCam(LD.x, LD.z) + 0.3, { lean: Math.PI / 2 * (1 - smo(seg(mo, 1.3, 1.4))), squash: sq, eyes: 'dizzy', mouth: 'wavy', armL: [0, 1.6], armR: [0, 1.6], stars: smo(seg(mo, 1.14, 1.22)), scale: 1.15, tremble: 0.3 }); }
        else { const K = [[1.36, LD.x, LD.z], [1.5, 0.6, 4.6], [1.62, HIDE.lam[0], HIDE.lam[1]]], [x, z, yaw, sp] = run(K, Math.min(mo, 1.62)), k = smo(seg(mo, 1.62, 1.72));
          put(m, x, gY(x, z), z, mo < 1.62 ? yaw : toCam(x, z), mo < 1.62 ? { ...panic(sp, 3), tilt: Math.sin(Ar * 20) * 0.15, eyes: 'dizzy', stars: 0.6 } : { ...crouch(k), stars: 0.6 * (1 - k) }); } } }

    // ======== S3 小桶：站在云朵小岛上冲镜头挥手 → 坐上彩虹滑梯「嗖」地朝镜头滑下来（1.62–2.15，越滑越快，和滑哨声对齐）→ 落地压扁再回弹 ========
    if (!gone && mo < 5.0) { const m = M.s3, cv = W.slideCurve;
      if (mo < 0.05) {
        // 坐进槽里：身子垂直于槽底（脚底贴着槽底，往后靠一点），速度 u' 越来越快、到出口最快（1.6k² - 0.6k³）
        const onSl = (u, back = 0.12) => { const p = cv.getPoint(u), tg = cv.getTangent(u), th = Math.asin(Math.max(-1, Math.min(1, -tg.y))), hz = Math.hypot(tg.x, tg.z) || 1;
          const sd = V3(tg.z / hz, 0, -tg.x / hz), up = new THREE.Vector3().crossVectors(sd, tg).normalize(); if (up.y < 0) up.negate(); const ln = th * 0.45 - back * 0.6, d = Math.max(0, th - ln); return { p: p.addScaledVector(up, 0.012 + 0.27 * m.sc * Math.sin(d)), yaw: Math.atan2(tg.x, tg.z), lean: ln }; };   // 往后靠着坐（比垂直于槽底往后仰 d），脚翘起来；往上抬 r·sin d，桶底后沿刚好贴着槽底
        const T0 = 1.62, T1 = 2.08, TF = 2.2, [fx, fz] = SPOT.s3fly;
        if (A < S3P) { // 风平浪静补长的那几拍：在小岛上跟着铃声蹦两下小的、再蹦一下大的转一圈（每 1.28 一轮，落地都在铃声上），之后才站定挥手
          const c = (((A - 0.6) / 1.28) % 1 + 1) % 1, p = cv.getPoint(0), big = c >= 0.5, [h, sq] = mascotHop(big ? (c - 0.5) / 0.5 : (c % 0.25) / 0.25, big ? 0.42 : 0.14), sp2 = big ? Math.PI * 2 * smo(seg((c - 0.5) / 0.5, 0.2, 0.8)) : 0;
          put(m, p.x, p.y + 0.012 + h, p.z, -0.75, { squash: sq, spin: sp2, eyes: 'happy', mouth: 'open', armL: [0.15, big ? 2.6 : 1.1], armR: [0.15, big ? 2.6 : 1.1], tilt: big ? 0 : 0.08 * Math.sin(Math.PI * c * 8) }); }
        else if (A < T0) { const p = cv.getPoint(0), wv = Math.sin(Ar * 15), sit = smo(seg(A, 1.46, T0)), q = onSl(0, 0.12 + 0.2 * (1 - sit)), ak = smo(seg(A, S3P, S3P + 0.18)); put(m, p.x, p.y + 0.012, p.z, angLerp(-0.75, q.yaw, sit), { hop: Math.abs(Math.sin(Ar * 7.5)) * 0.08 * (1 - sit) * ak, lean: q.lean * sit, squash: 0.1 * sit, eyes: 'happy', mouth: 'open', armR: [0.2 * ak + 0.15 * (1 - ak), (2.5 + 0.35 * wv) * ak + 1.1 * (1 - ak)], armL: [0.15 * (1 - ak), (0.5 + 2.0 * sit) * ak + 1.1 * (1 - ak)], tilt: 0.06 * wv * (1 - sit) * ak }); }
        else if (A < T1) { const k = seg(A, T0, T1), u = 1.6 * k * k - 0.6 * k * k * k, q = onSl(u); put(m, q.p.x, q.p.y, q.p.z, q.yaw, { lean: q.lean, squash: 0.1, eyes: k < 0.35 ? 'happy' : 'open', mouth: k < 0.35 ? 'open' : 'scream', armL: [0.25, 2.75], armR: [0.25, 2.75], tilt: 0.06 * Math.sin(Ar * 26), look: [0, -0.2] }); }
        else if (A < TF) { // 从平出口飞出去：抛物线，身子往后仰、双手举高「哇——」
          const k = seg(A, T1, TF), q = onSl(1), x = q.p.x + (fx - q.p.x) * k, z = q.p.z + (fz - q.p.z) * k, y = q.p.y + (gY(fx, fz) - q.p.y) * k + 0.34 * 4 * k * (1 - k);
          put(m, x, y, z, angLerp(q.yaw, toCam(fx, fz), smo(k)), { lean: q.lean * (1 - k) - 0.22 * Math.sin(Math.PI * k), squash: -0.12 * Math.sin(Math.PI * k), eyes: 'wide', mouth: 'scream', armL: [0.3, 2.9], armR: [0.3, 2.9], look: [0, 0.2] }); }
        else { // 落地压扁 → 弹一下 → 冲镜头张开双手（耶）→ 两小蹦回到大家旁边（2.36–2.56）→ 天一暗停下来、转身看天
          const ld = Math.sin(Math.PI * seg(A, TF, TF + 0.09)), [lx, lz] = SPOT.s3l, hp = seg(A, 2.36, 2.56), k2 = smo(hp), x = fx + (lx - fx) * k2, z = fz + (lz - fz) * k2;
          const [h1, s1] = A < TF + 0.09 ? [0, 0.38 * ld] : A < 2.36 ? mascotHop(seg(A, TF + 0.09, 2.36), 0.12) : mascotHop((hp * 2) % 1, 0.1), yes = smo(seg(A, TF + 0.1, TF + 0.18));
          put(m, x, gY(x, z) + h1, z, angLerp(A < 2.36 ? toCam(x, z) : Math.atan2(lx - fx, lz - fz), YS, turnK(0.22)), lookUp(0.22, { squash: s1, eyes: 'happy', mouth: 'open', armL: [0.15, 0.4 + 2.2 * yes * (1 - k2)], armR: [0.15, 0.4 + 2.2 * yes * (1 - k2)], walk: hp > 0 && hp < 1 ? 0.5 : 0, step: Ar * 20 })); } }
      else { const [lx, lz] = SPOT.s3l, b = blast(lx, lz), cv2 = smo(seg(mo, 0.1, 0.24));
        // 吓得缩进桶里（整个桶扣过来，只在桶沿底下露出一双眼睛）→ 扣着桶一路小碎步挪到前排 → 发抖，偶尔掀起来偷看
        if (mo < 0.5) put(m, lx, gY(lx, lz), lz, YS, { squash: 0.3 * b, lean: 0.25 * b * (1 - cv2), cover: cv2, peek: smo(seg(mo, 0.28, 0.38)), eyes: 'wide', mouth: 'scream', brow: 1, tremble: cv2 * 0.6 });
        else { const K = [[0.5, lx, lz], [0.75, 2.4, 4.4], [1.0, HIDE.s3[0], HIDE.s3[1]]], arrive = 1.0, [x, z, , sp] = run(K, Math.min(mo, arrive)), pk = mo < arrive ? 0.7 : 0.25 + 0.75 * Math.max(0, Math.sin(Math.PI * seg(mo, 1.35, 1.7)));
          put(m, x, gY(x, z) + (mo < arrive ? Math.abs(Math.sin(Ar * 26)) * 0.05 : 0), z, toCam(x, z), { cover: 1, peek: pk, tremble: mo < arrive ? 0.3 : 1 }); } } }

    // ======== CloudFront 踩着冲浪板在小云上飞（S1 从镜头前掠过，再绕到棋盘右后方）；天一暗停在半空；冲击波把它从冲浪板上掀下来 ========
    // 风平浪静补长以后：S1 从镜头前掠过（−1.99 → −1.04，和原来 0 → 0.95 一样的路线，低一点：这时镜头已经往前推得更近），再在棋盘左边的云上兜一个圈（往后 → 左后 → 左 → 左前 → 镜头左边），0.65 起回到原来的路线
    // （第三轮风平浪静短了 1.6：原来绕棋盘一大圈要 3.3 秒放不下，换成左边这个小圈，S2、S3a 里都在画面外；0.65 以后的关键帧不动，S3 以后和原来逐帧一样）
    const CFK = [[-2.54, 6.2, 2.5, 12.9], [-1.99, 0.6, 2.2, 10.2], [-1.49, -4.4, 1.75, 7.6], [-1.04, -8.6, 1.95, 4.2], [-0.68, -8.2, 2.3, -1.4], [-0.46, -11.2, 2.45, -3.0], [-0.17, -13.6, 2.6, 0.8],
      [0.18, -13.2, 2.7, 6.2], [0.48, -10.6, 2.75, 10.2], [0.65, -8.2, 2.7, 9.2], [0.95, -8.6, 2.6, 4.2], [1.3, -7.0, 2.4, -2.5], [1.75, 0.5, 2.3, -3.6], [2.2, 4.4, 1.95, -0.2], [2.5, 4.1, 1.75, 0.9], [3.2, 4.0, 1.7, 1.0]];
    if (!gone && mo < 5.0) { const m = M.cf, bd = W.board, tt = Math.min(A, 3.2), p = route(CFK, tt), sp = Math.hypot(p[3], p[5]), bob = Math.sin(Ar * 6.5) * 0.07, yawM = sp > 0.5 ? Math.atan2(p[3], p[5]) : YS;
      const yawR = angLerp(yawM, YS, smo(seg(A, 2.42, 2.7))), CY = p[1] + bob, p2 = route(CFK, tt + 0.06), bank = Math.max(-0.45, Math.min(0.45, (p2[3] * p[5] - p2[5] * p[3]) * 0.04));
      if (mo < 0.06) { bd.visible = true; bd.position.set(p[0], CY + 0.02, p[2]); bd.rotation.set(0, yawR, bank * 0.6);
        put(m, p[0], CY + 0.07, p[2], yawR, lookUp(0.08, { eyes: 'happy', mouth: 'open', tilt: -bank * 0.5, lean: 0.12 * Math.min(1, sp / 6), armL: [0.15, 1.25 + 0.15 * Math.sin(Ar * 5)], armR: [-0.15, 1.2 - 0.15 * Math.sin(Ar * 5)], squash: 0.06 })); }
      else { const P0 = V3(p[0], CY + 0.07, p[2]), u = seg(mo, 0.06, 0.4), dr = seg(mo, 0.06, 0.5);
        bd.visible = dr < 1; bd.position.set(p[0] + dr * 3.5, CY + 0.02 + 1.4 * Math.sin(Math.PI * dr) - 3.2 * dr * dr, p[2] - dr * 2.6); bd.rotation.set(dr * 9, yawR + dr * 5, bank + dr * 4);   // 冲浪板翻着飞走
        if (mo < 0.4) { const P1 = V3(3.1, gY(3.1, 2.0), 2.0), q = P0.clone().lerp(P1, smo(u)); q.y = P0.y + (P1.y - P0.y) * u * u + Math.sin(Math.PI * u) * 0.4; put(m, q.x, q.y, q.z, YS, { eyes: u < 0.6 ? 'wide' : 'shut', mouth: 'scream', armL: [0, 2.7], armR: [0, 2.7], sweat: 1, brow: 1, lean: -0.6 * Math.sin(Math.PI * u), tilt: 3.0 * u, pivot: 'c', squash: u > 0.9 ? 0.4 * Math.sin(Math.PI * (u - 0.9) / 0.1) : 0 }); }   // 从板上摔下来、在棋盘上「啪」地一扁
        else { const K = [[0.4, 3.1, 2.0], [0.65, 3.2, 4.0], [0.9, HIDE.cf[0], HIDE.cf[1]]], arrive = 0.9;
          if (mo < arrive) { const [x, z, yaw, s2] = run(K, mo); put(m, x, gY(x, z), z, yaw, panic(s2, 4)); }
          else { const k = smo(seg(mo, arrive, arrive + 0.16)), [hx, hz] = HIDE.cf; put(m, hx, gY(hx, hz), hz, toCam(hx, hz), { ...crouch(k), hug: k, armL: [0.9 * k, 0.4], armR: [0.9 * k, 0.4], armK: 1, squash: 0.28 * k }); } } }
      W._cf = { x: p[0], y: CY, z: p[2], ry: yawR, drop: mo > 0.06 ? seg(mo, 0.06, 0.9) : 0 };
      W.spray.slice(6).forEach((s, k) => { const back = (((A * 2.2 + k / 8) % 1) + 1) % 1, q2 = route(CFK, Math.max(CFK[0][0], tt - back * 0.25)); s.visible = A < 2.7 && !gone; s.position.set(q2[0], q2[1] - 0.12 + back * 0.15, q2[2]); s.scale.setScalar(0.3 + back * 0.6); s.material.opacity = 0.7 * (1 - back) * Math.min(1, sp / 3) * (A < 2.5 ? 1 : 0); }); }
    else W._cf = { x: 0, y: 0, z: 0, ry: 0, drop: 1 };

    // 风平浪静往前补的 S1 机位近、头顶空间少：n ≤ −1 那几下（新时间 1.96 以前起跳，S1 / S2 里的都是；S3a 里它在画面外）跳低一点（0.5 倍），跳到最高也不顶到画面上沿；落地时刻、翻跟头不变，S3 以后和原来一样高
    // ======== Bedrock 在蹦床云上蹦（落在铃声上），隔一下翻一个跟头；冲击波把它从蹦床上掀下来 → 装成一块普通的石头（闭眼、晶体暗下去、一动不动），偷偷睁一只眼 ========
    if (!gone && mo < 5.0) { const m = M.bed, [x, y0, z] = SPOT.bed, n = Math.floor((A - 0.6 + 0.32) / 0.64), u = ((A - 0.6 + 0.32) / 0.64) - n, last = A >= 2.52;
      W._tramp = 0; m.ex.crM.emissiveIntensity = 0.6;
      if (mo < 0.05) { let h = 0, s = 0, fl = 0; if (!last) { if (u < 0.12) { s = 0.3 * Math.sin(Math.PI * u / 0.12); W._tramp = Math.sin(Math.PI * u / 0.12); } else { const a = (u - 0.12) / 0.88; h = (n <= -1 ? 0.5 : 1) * 1.3 * 4 * a * (1 - a); s = -0.12 * (1 - 4 * a * (1 - a)); if (n % 2) fl = -2 * Math.PI * smo(a); } }
        else { const k = seg(A, 2.52, 2.64); s = 0.25 * Math.sin(Math.PI * k); W._tramp = Math.sin(Math.PI * k) * 0.8; }
        put(m, x, y0 + 0.37 + h, z, angLerp(0.75, YS, turnK(0.2)), lookUp(0.2, { squash: s, lean: fl, pivot: fl ? 'c' : null, eyes: h > 0.3 ? 'happy' : 'open', mouth: 'open', armL: [0, 1.4 + h], armR: [0, 1.4 + h], scale: 1.1 })); }
      else if (mo < 0.62) { const u2 = seg(mo, shockAt(x, z), 0.62), P0 = V3(x, y0 + 0.37, z), P1 = V3(HIDE.bed[0] - 0.4, gY(HIDE.bed[0], HIDE.bed[1]), HIDE.bed[1] - 0.6), q = P0.clone().lerp(P1, u2); q.y += Math.sin(Math.PI * u2) * 1.6;
        if (u2 <= 0) put(m, x, y0 + 0.37, z, YS, { eyes: 'wide', mouth: 'o', scale: 1.1 }); else put(m, q.x, q.y, q.z, YS + u2 * 3, { eyes: 'wide', mouth: 'scream', armL: [0, 2.6], armR: [0, 2.6], sweat: 1, brow: 1, lean: -u2 * Math.PI * 2, pivot: 'c', scale: 1.1 }); }
      else { const K = [[0.62, HIDE.bed[0] - 0.4, HIDE.bed[1] - 0.6], [0.8, HIDE.bed[0], HIDE.bed[1]]], [xx, zz, yaw, sp] = run(K, Math.min(mo, 0.8)), k = smo(seg(mo, 0.8, 0.95)), pk = Math.sin(Math.PI * seg(mo, 1.5, 1.8));
        m.ex.crM.emissiveIntensity = 0.6 * (1 - 0.8 * k);
        put(m, xx, gY(xx, zz), zz, mo < 0.8 ? yaw : toCam(xx, zz) + 0.4 * k, mo < 0.8 ? panic(sp, 5) : { squash: 0.28 * k, eyes: pk > 0.3 ? 'open' : 'shut', look: [-0.8, 0.2], mouth: 'flat', armL: [0, 0.05], armR: [0, 0.05], brow: 0.6 * pk, scale: 1.1, blink: false }); } }

    // 小朵云：S3 的小岛（1.04 那颗把它连同滑梯一起炸掉）、Bedrock 的蹦床（被冲击波吹散）、CloudFront 的冲浪云（没人踩以后往下掉）、天上飘的装饰云、白天擦过镜头的云
    if (mo < 1.9) { const L = [], isl = SPOT.isl, kI = mo > 0.97 ? smo(seg(mo, 0.97, 1.3)) : 0, kT = mo > 0.1 ? smo(seg(mo, 0.1, 0.5)) : 0, cf = W._cf;
      L.push([W.CL.isl, V3(isl[0] + kI * 2.4, isl[1] - kI * 3.2, isl[2] - kI * 1.2), [1.25 * (1 - 0.8 * kI), 1.05 * (1 - 0.8 * kI), 1.15 * (1 - 0.8 * kI)], 0.4]);
      L.push([W.CL.tramp, V3(SPOT.bed[0] - kT * 1.6, SPOT.bed[1] - 0.12 * W._tramp - kT * 2.2, SPOT.bed[2] - kT * 1.2), [1.15 * (1 + 0.12 * W._tramp) * (1 - 0.75 * kT), (1 - 0.35 * W._tramp) * (1 - 0.75 * kT), 1.15 * (1 - 0.75 * kT)], 0.2]);
      if (cf.drop < 1) L.push([W.CL.surf, V3(cf.x + cf.drop * 1.2, cf.y - 0.32 - 2.2 * cf.drop * cf.drop, cf.z + cf.drop * 0.6), [1.15 * (1 - 0.6 * cf.drop), 0.85 * (1 - 0.6 * cf.drop), 1.15 * (1 - 0.6 * cf.drop)], cf.ry]);
      if (mo < 0) W.DECO.forEach((p, k) => L.push([W.CL.deco[k], V3(p[0] + Math.sin(Ar * 0.35 + k) * 0.8, p[1] + Math.sin(Ar * 0.7 + k * 2) * 0.12, p[2]), [1.6, 1.25, 1.6], k]));   // 天上飘的装饰云：末日里被火光照成棕色的扁团，看着像土豆、飞碟——第一颗砸下去的白闪里收掉
      // 擦过镜头的云：在镜头前 0.9 处从右往左飘过，切镜头那一刻正好挡满
      const Lw = []; WIPES.forEach(tc => { const u = (An - tc) / 0.11; if (Math.abs(u) > 1) return; const fw = E.camera.getWorldDirection(V3(0, 0, 0)), rt = fw.clone().cross(V3(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
        Lw.push([W.CL.wipe, cam.clone().addScaledVector(fw, 1.0).addScaledVector(rt, -u * 2.6).addScaledVector(up, -0.15 - 0.1 * u * u), [1.05, 0.9, 1.05], 0.5]); });
      clouds2(W, L); clouds2(W, Lw, W.wipeC);
      W.slide.visible = kI < 1 && !gone; W.slide.position.set(kI * 2.2, -kI * 3.6, -kI * 1.0); W.slide.rotation.set(kI * 1.4, kI * 0.6, -kI * 0.9); }
    else if (!(mo >= 5.0 && mo < 7.0)) clouds2(W, []);   // 11/09（去遮幅）：1.9–5.0 没人写小朵云，world() 又把它设成可见，留着上一帧的（或者一次都没写过的：160 个单位球全叠在棋盘中心）——切回原镜头以后画面正下方棋盘中间冒出一个深色半球（原来压在下黑边底下）。这一段清空
    // Lambda 拍上去的那朵白云（S6）：拍上去时朝它飞来的方向凹下去、再弹回来
    { const show = mo > 0.5 && mo < 1.25; W.bnc.visible = show; if (show) { const dk = Math.sin(Math.PI * seg(mo, 0.8, 1.0)) * (mo < 0.92 ? 1 : 1 - seg(mo, 0.92, 1.0)) * 0.42, wob = mo > 0.92 ? Math.sin((mo - 0.92) * 40) * 0.05 * Math.exp(-(mo - 0.92) * 8) : 0;
        clouds2(W, [[W.CL.bnc, V3(4.15 + 0.1 * dk, 2.25, 1.85), [1.0 + wob, 1.0 - wob, 1.0], 0.3, [-1, 0, 0, dk]]], W.bnc); } }

    // ======== HIT 以后：每个卡通在韩叔两边自己的一小朵云上冒出来 → 在金币雨里欢呼，各有各的小动作（S3 用桶接金币、SQS 一个传一个抛金币、EC2 天线上挂一枚、DynamoDB 盘子轮流弹、Lambda 后空翻、RDS 转圈、Bedrock 晶体闪、CloudFront 扭着跳）→ 一起回头冲镜头挥手 → 一个接一个跳下去 ========
    W.coins.forEach(c => { c.visible = false; });
    if (mo >= 5.0 && mo < 7.0) cheer(A, E, P, put);
    // S6b 俯拍（mo 1.0–1.25）：前排已经躲好的几个在画面最下面只露个头顶，压在字幕底下，像一堆杂物——这一刀里不画它们（下一刀 S7 是另一个机位）
    // 11/09（去遮幅）：S6 跟着 Lambda 那一刀（mo 0.62–1.0）同理——前排四个在画面最下沿只露半个脑袋、贴在「天外流星坠落」底下（原来整个压在下黑边底下），这一刀也不画。
    // 按不带震屏偏移的镜头算（setViewOffset 抖的那几十像素不算进去），身子 80% 高那一点落在画面下面 15%（y > 918）以下的不画；S5、S7 是别的机位，照常画
    if (mo >= 0.62 && mo < 1.0) { const c2 = E.camera.clone(); c2.clearViewOffset(); c2.updateMatrixWorld(true); W.list.forEach(m => { if (m === W.ms.lam || !m.g.visible) return; const p = m.g.position.clone().add(V3(0, m.top * 0.8, 0)).project(c2); if (p.y < -0.7) m.g.visible = false; }); }
    if (mo >= 1.0 && mo < 1.25) { E.camera.updateMatrixWorld(); W.list.forEach(m => { if (m === W.ms.lam || !m.g.visible) return; const p = m.g.position.clone().add(V3(0, m.top * 0.8, 0)).project(E.camera); if (p.y < -0.4) m.g.visible = false; }); }
  }

  // A：脚本进度（冒出来、回头挥手、蹦走这些时刻按它）；欢呼的蹦、后空翻、转圈、抛金币按真实时间 mr（撞击以后按真实时间数的 o），晃动、闪烁按 Ar——欢呼段拉长了，不变成慢动作
  function cheer(A, E, P, put) {
    const { seg } = E, W = P.W, M = W.ms, mo = A - PRO0, cam = E.camera.position, SC = 1.8, Ar = CK.Ar, mr = CK.mr;   // SC：卡通放大到 1.8 倍（原来 1.45，五个挤在一朵云上看不清）
    W.cloudM.color.set('#ffffff'); W.cloudM.emissive.set('#c9b8ff'); W.cloudM.emissiveIntensity = 0.55; if (W.cloudM.transparent) { W.cloudM.transparent = false; W.cloudM.needsUpdate = true; } W.cloudM.opacity = 1;
    W.fluffM.color.set('#ffffff'); W.fluffM.emissive.set('#c9b8ff'); W.fluffM.emissiveIntensity = 0.55; if (W.fluffM.transparent) { W.fluffM.transparent = false; W.fluffM.needsUpdate = true; } W.fluffM.opacity = 1; W.DR.value = 0;
    MASCOT_RIM.col.value.set('#ffd27a'); MASCOT_RIM.k.value = 0.9; MASCOT_RIM.dir.set(0, 1, 0); MASCOT_RIM.update(E.camera); if (MASCOT_RIM.self) MASCOT_RIM.self.value = 0;
    const list = { ec2: M.ec2, s3: M.s3, dyn: M.dyn, lam: M.lam, bed: M.bed, rds: M.rds, q0: M.q[0], q1: M.q[1], q2: M.q[2], cf: M.cf };
    // 每个卡通的时刻表：弹出来 pop（撞上法阵的白闪里，近的先）、一起回头冲镜头挥手（5.9–6.15，手摆两下）、一个接一个往外侧一蹦 jT（隔 0.04），
    // 蹦到最高点「噗」地散成一团小白烟和几颗金色星光（JU 蹦上去、PF 压一下缩没）：最后一个 6.51 起跳、6.70 消失、烟和星光 6.85 散完，「他把毕生所学」6.9 才淡进来。
    // 不再跳到棋盘上（原来落点朝着镜头，最后几个落在前景、压在字幕和下黑边上）
    const T = {}, JU = 0.13, PF = 0.06;
    // 11/11（fixB）：不再在撞上的白闪里冒出来——光盾收掉时，落到它脚下那朵云上的金色光点（POPT）落下的那一刻才弹出来（pm：按 mr 算的那一刻；POPD 弹多久）。挥手 wv、蹦走 jT 不变
    Object.entries(CHEER).forEach(([key, [x, y, z, rank]]) => { const J = CHEERJ.indexOf(key); T[key] = { pop: MO(TNo(POPT[key][1])), pm: popMr(key), wv: 5.9, jT: 6.15 + J * 0.04 }; });
    const s3S = T.s3.pm + POPD + 0.06, qS = Math.max(T.q0.pm, T.q1.pm, T.q2.pm) + POPD + 0.06;   // S3 接金币、三只 SQS 抛金币：都弹出来以后才开始（原来 mr 5.4 / 5.45）   // 后排晚一点（5.2）冒出来：白闪里镜头还在往后拉，早冒出来头顶会被画面上沿切掉
    // 云：每个卡通脚下一小朵，撞上法阵的白闪里长出来；上面的卡通蹦走以后缩小、往下沉，散掉。后排的云小一号（不从前排身子中间冒出来）
    //   11/11（fixB）：云在光点落下的那一刻（pm）从一小团鼓起来（0.2 内胀过一点再回原样），不早长出来
    const cl = [], cloudAt = (x, y, z, s0, t0, t1, k) => { const cu = seg(mr, t0 - 0.02, t0 + 0.2), ck = smo(cu) * (1 + 0.16 * Math.sin(Math.PI * cu)), gone = smo(seg(mo, t1 + 0.04, t1 + 0.3)), s = ck * (1 - gone) * s0;
      if (s > 0.01) cl.push([W.CL.cheer, V3(x, y - 0.44 * 0.7 * s0 - 0.5 * gone + Math.sin(Ar * 1.6 + k) * 0.04, z), [0.92 * s, 0.7 * s, 0.78 * s], k * 1.3]); };
    Object.entries(CHEER).forEach(([key, [x, y, z, rank]], k) => cloudAt(x, y, z, rank >= 3 ? 0.82 : 1, T[key].pm, T[key].jT, k));
    clouds2(W, cl);
    const POS = {}, PS = {};   // 「噗」的位置（身子中间）；PS：弹出来的大小（0.2 → 1，EC2 天线上那枚金币跟着）
    Object.entries(list).forEach(([key, m]) => { const [x, top, z] = CHEER[key], { pop: p0, wv, jT } = T[key], sd = x > 0 ? 1 : -1;
      const toC = Math.atan2(cam.x - x, cam.z - z), toH = Math.atan2(-x, -0.6 - z), ju = mo - jT, px = x + sd * 1.3, py = top - 0.85, pz = z - 0.2, pm = T[key].pm, pe = pm + POPD;
      POS[key] = V3(px, py + 0.42 * SC, pz); PS[key] = 1;
      if (mr < pm || ju >= JU + PF) { m.g.visible = false; return; }
      if (key === 'bed') m.ex.crM.emissiveIntensity = 0.6;
      // 11/11（fixB）：从云里弹出来——0.2 倍从云中间往上冒，胀过一点（约 1.08 倍）再回原样，先闭着眼、睁大眼，举起手（原来原大从云后面一下冒出来）
      if (mr < pe) { const pp = seg(mr, pm, pe), r1 = pp - 1, ps = 0.2 + 0.8 * (1 + 2.70158 * r1 * r1 * r1 + 1.70158 * r1 * r1); PS[key] = ps;
        put(m, x, top - 0.32 * (1 - smo(pp)), z, toC, { scale: SC * ps, squash: -0.12 * Math.sin(Math.PI * pp), eyes: pp > 0.45 ? 'wide' : 'shut', mouth: 'o', look: [0, 0.8], brow: 0.5, armL: [0, 0.6 + 1.6 * pp], armR: [0, 0.6 + 1.6 * pp] }); return; }
      if (mo < wv) { // 欢呼：一边蹦一边举手，身子朝着韩叔和镜头中间；各自的小动作（11/11 fixB：都从自己弹出来以后 pe 起算）
        const ph = (mr - pe) / 0.3 + (key.charCodeAt(0) % 3) * 0.33, [h, s] = mascotHop(ph % 1, 0.3), w2 = Math.sin(Ar * 22 + key.length), yaw = angLerp(toC, toH, 0.3 + 0.2 * Math.sin(Ar * 2 + x));
        const pz2 = { scale: SC, hop: h, squash: s, eyes: 'happy', mouth: 'open', armL: [0, 2.4 + 0.35 * w2], armR: [0, 2.4 - 0.35 * w2] };
        if (key === 's3') Object.assign(pz2, { hop: h * 0.4, squash: s + 0.12 * S3catch(mr, mm(wv) - mm(5.0) + 5.0, s3S), armL: [0.25, 2.85], armR: [0.25, 2.85], look: [0, 0.6] });   // S3 举着双手、桶口朝上接金币，接住一枚压一下
        if (key === 'ec2') Object.assign(pz2, { ant: 0.25 * Math.sin(Ar * 9), hop: h * 0.5 });   // 天线尖下面挂着一枚金币，跟着晃
        if (key === 'dyn') { const w = Math.sin(Ar * 13); Object.assign(pz2, { hop: h * 0.5, squash: s - 0.12 * Math.max(0, w) + 0.06 * Math.max(0, -w), tilt: 0.09 * Math.sin(Ar * 13 + 1) }); }   // DynamoDB 整个身子一伸一缩地蹦、左右晃（11/09：原来三片盘子轮流往上弹，片与片之间裂开缝）
        if (key === 'lam') { const fp = ((mr - pe) / 0.5) % 1, fk = smo(seg(fp, 0.15, 0.75)); Object.assign(pz2, { hop: 0.75 * Math.sin(Math.PI * Math.min(1, fp / 0.9)), squash: fp > 0.9 ? 0.2 * Math.sin(Math.PI * (fp - 0.9) / 0.1) : -0.08, lean: -Math.PI * 2 * fk, pivot: 'c', armL: [0, 2.9], armR: [0, 2.9] }); }   // Lambda 一个接一个后空翻
        if (key === 'bed') { m.ex.crM.emissiveIntensity = 0.6 + 1.5 * Math.max(0, Math.sin(Ar * 9)); pz2.spin = Ar * 7; }   // Bedrock 原地转圈，晶体一闪一闪
        if (key === 'rds') { const tp = ((mr - pe) / 0.6) % 1; pz2.spin = Math.PI * 2 * smo(seg(tp, 0.1, 0.7)); pz2.armL = [0, 1.6]; pz2.armR = [0, 1.6]; pz2.hop = h * 0.6; }   // RDS 张开双手转圈
        if (key[0] === 'q') { const qi = +key[1], c = SQSc(mr, qi, qS); Object.assign(pz2, { armL: [0.2, 1.9 + 0.9 * c], armR: [0.2, 1.9 + 0.9 * c], squash: s + 0.14 * c, hop: h * 0.6 }); }   // SQS 一个传一个地抛金币，接住的那个压一下
        if (key === 'cf') { Object.assign(pz2, { tilt: 0.28 * Math.sin(Ar * 9), armL: [0, 1.4 + 1.2 * Math.max(0, Math.sin(Ar * 9))], armR: [0, 1.4 + 1.2 * Math.max(0, -Math.sin(Ar * 9))], hop: h * 0.5 }); }   // CloudFront 左右扭着跳舞
        put(m, x, top, z, yaw, pz2); return; }
      if (mo < jT) { const k = smo(seg(mo, wv, wv + 0.06)), crch = smo(seg(mo, jT - 0.05, jT)), wa = Math.sin((mo - wv) / 0.125 * Math.PI * 2);   // 一起回过头来冲镜头挥手（一只手左右摆，0.25 摆两下），蹦之前蹲一下
        put(m, x, top, z, angLerp(toH, toC, k), { scale: SC, eyes: 'happy', mouth: 'open', armR: [0.2, 2.45 + 0.6 * wa * (1 - crch)], armL: [0, 0.4 + 0.3 * crch], squash: 0.22 * crch, tilt: 0.1 * wa * (1 - crch) }); return; }
      if (ju < JU) { const j = ju / JU;   // 从云边上往外侧一蹦、往下跳（先往上拱一点再落下去：镜头这时正跟着韩叔往下摇，往下跳的卡通在画面里差不多停在原处，不会被甩出画面上沿）
        put(m, x + (px - x) * j, top + 0.45 * Math.sin(Math.PI * j) + (py - top) * j * j, z + (pz - z) * j, toC - sd * 0.5 * j, { scale: SC, eyes: 'happy', mouth: 'open', armL: [0, 2.7], armR: [0, 2.7], lean: 0.25 * j, squash: -0.15 * Math.sin(Math.PI * Math.min(1, j * 1.5)) }); return; }
      // 「噗」：先横着胀开压一下，再缩没（烟团最大的时候正好没了）
      const pf = (ju - JU) / PF, sq = Math.sin(Math.PI * Math.min(1, pf * 1.6)) * 0.45, sh = 1 - smo(seg(pf, 0.35, 1));
      put(m, px, py, pz, toC - sd * 0.5, { scale: SC * Math.max(0.001, sh), eyes: 'happy', mouth: 'open', armL: [0, 2.7], armR: [0, 2.7], squash: sq, lean: 0.25 }); });
    // 「噗」：三团柔边小白烟（0.15 里从 0.5 胀到 1.6、淡掉）+ 八颗往外迸开、一闪一闪的金色星光（叠加混合）；原来是撒一把黄色小方块
    //   11/11（fixB）：弹出来那一下（pm 起 0.3）也用这几团烟和星光：云边上冒一小团白烟往外散，八颗小星光从云上迸开（小一号）；和蹦走时的「噗」隔着一秒多，不会同时用
    CHEERJ.forEach((key, J) => { const t0 = T[key].jT + JU + 0.01, c = POS[key], pm = T[key].pm, [cx, ct, cz] = CHEER[key];
      if (mr >= pm && mr < pm + 0.32) { const pc = V3(cx, ct - 0.05, cz + 0.15);
        for (let i = 0; i < 3; i++) { const sp = W.poof[J * 3 + i]; if (!sp) continue; const u = seg(mr, pm + i * 0.015, pm + i * 0.015 + 0.28); sp.visible = u > 0 && u < 1; if (!sp.visible) continue;
          const a = J * 1.7 + i * 2.1 + 0.6, e = 1 - (1 - u) * (1 - u); sp.position.set(pc.x + Math.cos(a) * 0.5 * e, pc.y + Math.abs(Math.sin(a)) * 0.22 * e + 0.2 * u, pc.z); sp.scale.setScalar(SC * 0.55 * (0.4 + 1.0 * e) * (i ? 0.8 : 1)); sp.material.opacity = 0.7 * (1 - u * u); sp.material.rotation = a + u; }
        for (let i = 0; i < 8; i++) { const st = W.twk[J * 8 + i]; if (!st) continue; const u = seg(mr, pm + i * 0.008, pm + i * 0.008 + 0.26); st.visible = u > 0 && u < 1; if (!st.visible) continue;
          const a = i / 8 * Math.PI * 2 + J * 0.7 + 0.2, r = SC * (0.25 + 0.6 * (1 - Math.pow(1 - u, 2.2))), tw = 0.6 + 0.4 * Math.sin(Ar * 90 + i * 2.3);
          st.position.set(pc.x + Math.cos(a) * r, pc.y + 0.35 + Math.sin(a) * r * 0.7, pc.z + 0.05); st.scale.setScalar(0.32 * SC * (i % 2 ? 0.7 : 1) * tw * Math.sin(Math.PI * Math.min(1, u * 1.4))); st.material.opacity = 1 - u * u; st.material.rotation = i * 0.4 + u * 1.5; }
        return; }
      for (let i = 0; i < 3; i++) { const sp = W.poof[J * 3 + i]; if (!sp) continue; const u = seg(mo, t0 + i * 0.012, t0 + i * 0.012 + 0.15); sp.visible = u > 0 && u < 1; if (!sp.visible) continue;
        const a = J * 1.7 + i * 2.1, e = 1 - (1 - u) * (1 - u); sp.position.set(c.x + Math.cos(a) * 0.32 * e, c.y + Math.sin(a) * 0.24 * e + 0.15 * u, c.z); sp.scale.setScalar(SC * 0.9 * (0.5 + 1.1 * e) * (i ? 0.8 : 1)); sp.material.opacity = 0.95 * (1 - u * u); sp.material.rotation = a + u; }
      for (let i = 0; i < 8; i++) { const st = W.twk[J * 8 + i]; if (!st) continue; const u = seg(mo, t0 + i * 0.006, t0 + i * 0.006 + 0.2); st.visible = u > 0 && u < 1; if (!st.visible) continue;
        const a = i / 8 * Math.PI * 2 + J * 0.7, r = SC * (0.35 + 0.75 * (1 - Math.pow(1 - u, 2.2))), tw = 0.6 + 0.4 * Math.sin(Ar * 90 + i * 2.3);
        st.position.set(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.85, c.z + 0.05); st.scale.setScalar(0.42 * SC * (i % 2 ? 0.7 : 1) * tw * Math.sin(Math.PI * Math.min(1, u * 1.4))); st.material.opacity = 1 - u * u; st.material.rotation = i * 0.4 + u * 1.5; } });
    // 金币（放大到看得清，正面朝着镜头，边飞边翻、露出正面）：S3 桶里接住的几枚（从法阵那边一枚接一枚掉进桶口）、三只 SQS 之间一个传一个抛的一枚（拱得低一点）、EC2 天线尖下面挂着晃的一枚
    const coin = (k, p, flip, s = 2.4) => { const c = W.coins[k]; if (!c) return; c.visible = true; c.position.copy(p); c.lookAt(cam); c.rotateX(Math.PI / 2 + 0.85 * Math.sin(flip)); c.scale.setScalar(s); };
    // 11/09（去遮幅）：原来从桶口上方 2.6 处冒出来，镜头往后拉以后（T 18.1 起）那一点落在画面最上沿以内（原来被上黑边盖着），金币在半空凭空出现；挥手前（wv − 0.05）一刀收掉时
    // 正在半空的几枚也是凭空消失。改成从 3.4 处落（起点在画面上沿外面，还是 0.6 落完），收的时候只落赶得上在挥手（wv）以前落进桶口的那几枚，赶不上的就不放出来（它们出发时还在画外）
    { const s3 = M.s3, H = 3.4, mrLand = mm(T.s3.wv) - mm(5.0) + 5.0, uIn = Math.sqrt(1 - 0.4 / H); if (s3.g.visible && mo < T.s3.jT) for (let k = 0; k < 3; k++) { const t0 = s3S + k * 0.2, u = ((mr - t0) / 0.6) % 1, n = Math.floor((mr - t0) / 0.6); if (mr < t0 || t0 + (n + uIn) * 0.6 > mrLand) continue;
      const tp = s3.g.position.clone(), yT = tp.y + s3.top * SC * 0.95, hh = (1 - u * u) * H; coin(k, V3(tp.x + 0.12 * (k - 1), yT + hh, tp.z), u * 9 + n); if (hh < 0.4) W.coins[k].visible = false; } }   // 掉到桶口（离桶口 0.4，和原来一样）就进去了
    { const q = M.q, qi = Math.floor((mr - qS) / 0.3), u = ((mr - qS) / 0.3) % 1; if (mr > qS && mo < T.q0.wv && q.every(m => m.g.visible)) { const a = q[((qi % 3) + 3) % 3].g.position, b = q[((qi + 1) % 3 + 3) % 3].g.position;
      const p = a.clone().lerp(b, u); p.y += 0.62 * SC + Math.sin(Math.PI * u) * 0.5; coin(3, p, u * Math.PI * 2); } }
    { const ec = M.ec2; if (ec.g.visible && ec.ex.ant && mo < T.ec2.jT) { ec.ex.ant.updateWorldMatrix(true, false); const tip = V3(0, 0.29, 0.03).applyMatrix4(ec.ex.ant.matrixWorld), sw = Math.sin(Ar * 9);
      coin(4, tip.add(V3(0.1 * sw, -0.16 - 0.03 * Math.abs(sw), 0.06)), 0.25 * sw, 2.6 * PS.ec2); } }   // 11/11（fixB）：跟着 EC2 一起从小弹到原大
  }
  // 欢呼时每个卡通站的地方：[x, 脚底高度, z, 第几个冒出来]。韩叔两边各五个，像合影一样站两排：前排三个隔 1.9；后排两个站在前排的空当上、高 1.75、往后 0.8，
  // 后排脚下那朵（小一号）露在前排头顶上，不像踩在前排头上。左边 EC2、DynamoDB、Bedrock（前排）+ S3、Lambda（后排），右边 RDS、SQS、CloudFront（前排）+ 两只 SQS（后排，三只 SQS 一个传一个抛金币）；
  // 离韩叔近的先冒出来。整组（连同韩叔）都在字幕上面（镜头见 CAM_A 5.9 / 6.5）
  const CHEER = { ec2: [-2.3, 3.5, 1.1, 0], dyn: [-4.2, 3.5, 1.1, 1], bed: [-6.1, 3.5, 1.1, 2], s3: [-3.25, 5.25, 0.3, 3], lam: [-5.15, 5.25, 0.3, 4],
    rds: [2.3, 3.5, 1.1, 0], q0: [4.2, 3.5, 1.1, 1], cf: [6.1, 3.5, 1.1, 2], q1: [3.25, 5.25, 0.3, 3], q2: [5.15, 5.25, 0.3, 4] };
  // 蹦走的先后：左右轮流、先后排再前排
  const CHEERJ = ['q2', 'lam', 'q1', 's3', 'cf', 'bed', 'q0', 'dyn', 'rds', 'ec2'];
  // 11/11（fixB）：光盾收掉时光点落到云上才弹出来（POPT：[光点从罩面上凝出来, 落到云上] 的视频秒；11/11 shfade：光盾改成整面淡出，这张表不变，离韩叔近的先：|x| 2.3 → 3.25 → 4.2 → 5.15 → 6.1，同一档右边晚一点）；
  //   popMr：落下那一刻按 mr（撞上以后的真实时间）算；POPD：从 0.2 倍弹到原大用多久
  // 11/11（refine）：光点飞慢一点、让人跟得上：落下的时刻都晚 0.08（最后一个 18.70，弹完 18.98，离挥手 19.47 还有半秒）
  const POPT = { ec2: [17.70, 18.22], rds: [17.72, 18.26], s3: [17.76, 18.33], q1: [17.78, 18.37], dyn: [17.82, 18.44], q0: [17.84, 18.48], lam: [17.88, 18.55], q2: [17.90, 18.59], bed: [17.94, 18.66], cf: [17.96, 18.70] };
  // 11/11（shfade）：光点从罩面上哪一点凝出来——和那个卡通同一个 x，z 往前（+，前面那层罩面，画面上偏高）或往后（−，后面那层，画面上偏低）挪多少。
  //   T 17.85 的镜头下起点约：Bedrock (202,265)、Lambda (294,214)、DynamoDB (582,294)、EC2 (691,169)、S3 (715,355) | RDS (1208,157)、SQS① (1260,347)、SQS (1399,234)、SQS② (1560,209)、CloudFront (1562,342)，
  //   散在整面罩子上、高低错开；他（约 x 940）头顶左右两百多像素里没有
  // 11/11（shfade/refine，评审：「最先出现的两颗（EC2、RDS）在 y 157–185、韩叔左右各约 260 像素，是这几帧里最亮的东西，17.83 上方是对称的两颗大亮星」）：
  //   前两颗挪到后面那层罩面（画面上低一些，T 17.72 约 (782,312)、(1188,305)），S3 / SQS① 换上去（约 (649,251)、(1295,237)），DynamoDB / SQS 往下（约 (619,348)、(1361,336)），
  //   Lambda、Bedrock、SQS②、CloudFront 不动；刚亮起来的鼓包减半、光点都小一点，前两颗再小一点（见 runMain 的光点）。画面上方 y 230 以上只有外侧后出来的几颗
  const MDZ = { ec2: -5.5, rds: -5.5, s3: -2.5, q1: -2.5, dyn: -5.5, q0: -5.5, lam: 1.5, q2: 0.35, bed: 0.35, cf: -4 };
  const POPD = 0.22, popMr = key => 5.0 + TNo(POPT[key][1]) - mm(5.0);
  const S3catch = (mo, land = Infinity, s0 = 5.4) => { let c = 0; for (let k = 0; k < 3; k++) { const t0 = s0 + k * 0.2; if (mo < t0) continue; const u = ((mo - t0) / 0.6) % 1, n = Math.floor((mo - t0) / 0.6); if (t0 + (n + Math.sqrt(1 - 0.4 / 3.4)) * 0.6 > land) continue; if (u > 0.9) c = Math.max(c, Math.sin(Math.PI * (u - 0.9) / 0.1)); } return c; };   // 金币掉进桶里那一下   // 11/09（refine）：land 和放金币用同一个判断（mrLand、桶口离 0.4 的 uIn），没放出来的那几拍不压（原来空接）
  const SQSc = (mo, i, s0 = 5.45) => { if (mo < s0) return 0; const n = Math.floor((mo - s0) / 0.3), u = ((mo - s0) / 0.3) % 1, catcher = ((n + 1) % 3 + 3) % 3; return catcher === i ? smo(seg2(u, 0.75, 1)) : (((n % 3) + 3) % 3 === i ? 1 - smo(seg2(u, 0, 0.2)) : 0); };   // 正在接 / 刚抛出去的那只举手
  const seg2 = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a)));


  // ---------- 末日流星（A 绝对时间）：落下来（烧焦的石头 + 白热核 + 光晕 + 头宽尾细的火尾、外焰、烟尾）→ 撞上云海（白闪 → 翻滚的火球 → 黑烟往上冒成小蘑菇云、贴着云海扩散的冲击波和尘、碎云、火星、留在云上烧着的余烬） ----------
  // A：脚本进度（旧时间：第一颗怎么落、什么时候砸、主流星压过来的进度按它）；砸下去以后的火球、烟柱、碎石、火星（物理）和自转、闪烁、火舌按真实时间
  // （mr：runMain 的 o 按真实时间，Ar：真实时间钟）；切回原镜头以后的小流星每颗按映射后的时刻出发、按真实时间飞（拉长的那几段里流星变稀，速度不变）
  // 11/10（refine）：流星雨躲开韩叔用的参照镜头（固定取 BHIT 后 1.0 秒那一帧的镜头，结果不随镜头每帧晃动而变：一颗流星要么整条不放、要么照常）。
  //   info(流星)：han = 它的路线在画面上是否穿过韩叔立牌（外扩 60 像素）；dist = 光爆那一刻它离撞击点多远（像素，近的先被烧掉）
  let RREF = null;
  function rainRef(E, RN) { if (RREF) return RREF; const cam = new THREE.PerspectiveCamera(E.camera.fov, E.camera.aspect, 0.1, 200), on = RN.bt + 1.0, [p, l] = spline(WA(on), CAM_A, RN.V);
    cam.position.copy(p); cam.lookAt(l); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    const pj = v => { const q = v.clone().project(cam); return [(q.x + 1) * 960, (1 - q.y) * 540]; }, hy = hanUp(MO(on), 1), box = [[-0.9, hy], [0.9, hy], [-0.9, hy + 2.25], [0.9, hy + 2.25]].map(([x, y]) => pj(V3(x, y, -0.6)));
    const X0 = Math.min(...box.map(b => b[0])) - 60, X1 = Math.max(...box.map(b => b[0])) + 60, Y0 = Math.min(...box.map(b => b[1])) - 60, Y1 = Math.max(...box.map(b => b[1])) + 60, cS = pj(RN.C), memo = new Map();
    const segHit = (a, b) => { for (let i = 0; i <= 40; i++) { const t = i / 40, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t; if (x > X0 && x < X1 && y > Y0 && y < Y1) return true; } return false; };
    RREF = { info(d, zb, dur, t0n) { if (memo.has(d.k)) return memo.get(d.k); const at = u => { const h = d.start.clone().addScaledVector(d.dir, d.len * u); h.z += zb; return h; };
      const ub = Math.max(0, Math.min(1, (RN.bt - t0n) / dur)), pb = pj(at(ub)), r = { han: segHit(pj(at(0)), pj(at(1))), dist: Math.hypot(pb[0] - cS[0], pb[1] - cS[1]) }; memo.set(d.k, r); return r; } };
    return RREF; }
  function meteors(A, E, P, RN) {
    const { seg, easeOut } = E, W = P.W, mo = A - PRO0, cam = E.camera.position, Ar = CK.Ar, mr = CK.rm, fr = x => ((x % 1) + 1) % 1;
    const bA = W.bA, bN = W.bN, rA = W.rA, rN = W.rN, sa = W.sparks.geometry.attributes.position, sc = W.sparks.geometry.attributes.color, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), sv = V3(1, 1, 1);
    const RMAX = W.rocks.instanceMatrix.count, SMAX = sa.count;
    bA.begin(); bN.begin(); rA.begin(); rN.begin(); W.bS.begin(); let nR = 0, nS = 0, nK = 0; for (let i = 1; i < sa.array.length; i += 3) sa.array[i] = -999;
    const L = [];   // 这一帧的光源候选 [强度, 位置, 颜色（不给就是火光的橙色）]
    const SM = [];   // 这一帧的烟团：先收起来，按离镜头从远到近排好再画（半透明叠在一起，近的要盖住远的）
    const smoke = (x, y, z, size, cell, wr, wg, wb, a, rot) => { if (a > 0.004 && size > 0) SM.push([(x - cam.x) ** 2 + (y - cam.y) ** 2 + (z - cam.z) ** 2, x, y, z, size, cell, wr, wg, wb, a, rot]); };
    const dA = W.rocks.geometry.attributes.iDir.array, setDir = (n, x, y, z) => { const l = Math.hypot(x, y, z) || 1; dA[n * 3] = x / l; dA[n * 3 + 1] = y / l; dA[n * 3 + 2] = z / l; };
    // 烧着的碎石块（原来是一团团受光的碎云，近处看像悬在半空的棕色土豆）：和流星一样的烧焦石壳 + 发光裂纹 + 迎风那面烧白，外面一小圈火光，往后拖一小截收尖的火苗
    const chunk = (x, y, z, s, kk, vx, vy, vz, rot = 0) => { if (nR >= RMAX || kk < 0.01 || s <= 0) return; eu.set(x * 3 + Ar * 5 + rot, y + Ar * 4 + rot * 2, z + rot); q.setFromEuler(eu); sv.set(s, s * 0.8, s); m4.compose(V3(x, y, z), q, sv); setDir(nR, vx, vy, vz); W.rocks.setMatrixAt(nR++, m4);
      bA.add2(x, y, z, s * 4.5, 0, 1, 0.5, 0.2, 0.6 * kk); const vl = Math.hypot(vx, vy, vz); if (vl > 0.5) { const bk = V3(-vx / vl, -vy / vl, -vz / vl); rA.add2(V3(x, y, z), bk, s * 2.4, s * (4 + 0.25 * vl), 0, 1, 1, 1, 0.8 * kk, x * 7 + z); rN.add2(V3(x, y, z).addScaledVector(bk, s), bk, s * 2.6, s * (8 + 0.3 * vl), 2, 1, 1, 1, 0.3 * kk, z * 5 + x); } };
    // 一颗正在飞的流星：头在 h，飞行方向 d，大小 s（石头半径 R = 0.42 s），k 进度用来淡入（远处先是一点）。
    // 火尾：朝着镜头的带子，头宽约一块石头、往后收尖，长约 7.5 个半径（外焰更宽更暗、10 个半径），白黄 → 橙 → 暗红 → 透明，叠加混合；
    // 外面再拖一条更长（18 个半径）、往一边错开一点、普通混合的深色烟尾。原来火尾有 30–60 个半径长、只有头宽的五分之一亮，远远看是一条条激光似的细线
    const rock = (h, d, s, k, seed, big = 1, rs = 1, far = true) => { const back = d.clone().negate(), R = 0.42 * s;
      if (far) rs *= 0.3 + 0.7 * smo(Math.max(0, Math.min(1, (62 - h.distanceTo(cam)) / 30)));   // 远处的只露一点石头（藏在白热核里），看起来是一颗发光的火球，不是一个个黑点；近了才看得清烧着的石头和裂纹
      const side = V3(back.z, 0, -back.x).normalize().multiplyScalar(0.35 * R * Math.sin(seed));
      rN.add2(h.clone().addScaledVector(back, 1.4 * R).add(side), back, 2.8 * R, 18 * R * big, 2, 1, 1, 1, 0.4 * k, seed);   // 烟尾
      rA.add2(h, back, 3.2 * R, 10 * R * big, 1, 1, 1, 1, 0.7 * k, seed + 1); rA.add2(h, back, 2.1 * R, 7.5 * R * big, 0, 1, 1, 1, k, seed + 2);   // 外焰、火尾
      if (nR < RMAX) { const sp = s > 1.5 ? 0.35 : 1; eu.set(Ar * (2 + seed % 3) * sp, (Ar * 1.7 + seed) * sp, 0); q.setFromEuler(eu); sv.setScalar(R * rs); if (rs > 0.02) { m4.compose(h, q, sv); setDir(nR, d.x, d.y, d.z); W.rocks.setMatrixAt(nR++, m4); } }   // 大石头转得慢一点
      const lead = h.clone().addScaledVector(d, 0.18 * s); if (far && rs < 0.9) lead.addScaledVector(cam.clone().sub(h).normalize(), 0.6 * s * rs * (1 - smo(Math.max(0, (rs - 0.55) / 0.35))));   // 远的：热核挪到石头前面盖住它（远远看是一颗发光的火球）
      const near = far ? smo(Math.max(0, (rs - 0.6) / 0.35)) : 1;   // 近处看得清石头的：热核小一点、暗一点（石头自己烧着，不再靠一圈光把它围住）
      bA.add2(lead.x, lead.y, lead.z, s * (1.25 - 0.4 * near), 1, 1, 1, 1, 0.95 * k * (1 - 0.35 * near));   // 迎着风那面的白热核
      const hb = s > 3 ? 0.75 : 1; bA.add2(h.x, h.y, h.z, s * (2.6 - 0.6 * near) * hb * (1 + 0.08 * Math.sin(Ar * 40 + seed)), 0, 1, 0.78, 0.55, 0.6 * k * hb);   // 光晕（原来 4.2 s，石头像停在一轮光里；主流星、替身这种巨石再小一点）
      // 沿尾巴往外甩的火星
      for (let j = 0; j < 3 && nS < SMAX; j++) { const u = fr(Ar * 3 + seed * 0.37 + j / 3), p = h.clone().addScaledVector(back, 10 * R * big * u), i3 = nS * 3; sa.array[i3] = p.x + Math.sin(seed + j * 7 + Ar * 9) * 1.2 * R * u; sa.array[i3 + 1] = p.y + Math.cos(seed * 3 + j) * R * u - u * u; sa.array[i3 + 2] = p.z + Math.sin(seed * 2 + j * 3) * 1.2 * R * u;
        const b = Math.min(1, (1 - u) * k), i4 = nS * 4; sc.array[i4] = 1; sc.array[i4 + 1] = 0.6; sc.array[i4 + 2] = 0.2; sc.array[i4 + 3] = b; nS++; } };
    // 正对镜头压过来的大石头（主流星、S7 的替身）：飞行方向几乎对着镜头，火尾藏在石头后面。按它在画面上往哪儿走，反方向在轮廓外加一圈会闪的火舌，后面一直撒火星
    // tl：往后拖的那股火、火星的长度倍数（11/11 fixA：主陨石 1.8）
    const tongues = (h, h2, R, k, seed, tl = 1) => { E.camera.updateMatrixWorld(); const a = h.clone().project(E.camera), b = h2.clone().project(E.camera); let dx = b.x - a.x, dy = (b.y - a.y) / (16 / 9); const dl = Math.hypot(dx, dy);
      if (dl < 1e-5) { dx = 0; dy = -1; } else { dx /= dl; dy /= dl; }
      const ex = V3(1, 0, 0).applyQuaternion(E.camera.quaternion), ey = V3(0, 1, 0).applyQuaternion(E.camera.quaternion), bw = ex.clone().multiplyScalar(-dx).addScaledVector(ey, -dy), pw = ex.clone().multiplyScalar(-dy).addScaledVector(ey, dx);
      for (let j = 0; j < 9; j++) { const ph = Ar * (11 + j * 1.7) + seed + j * 2.3, fk = 0.75 + 0.25 * Math.sin(ph) * Math.sin(ph * 1.7 + 1), off = (j - 4) / 4;
        const p = h.clone().addScaledVector(bw, R * (0.75 + 0.55 * (1 - off * off) + 0.18 * Math.sin(ph * 0.7))).addScaledVector(pw, R * off * 0.95);
        bA.add2(p.x, p.y, p.z, R * (1.5 - 0.45 * Math.abs(off)) * fk, 2, 1, 0.82 - 0.2 * Math.abs(off), 0.5 - 0.2 * Math.abs(off), 0.85 * k * fk, ph * 0.3 + Math.atan2(dy, dx)); }
      for (let j = 0; j < 7; j++) { const u = fr(Ar * 2.6 + j / 7 + seed * 0.13), p = h.clone().addScaledVector(bw, R * (1.0 + 2.4 * tl * u)).addScaledVector(pw, R * 0.32 * Math.sin(j * 2.1 + seed + Ar * 5));   // 往后拖的一串火（挨得密、越往后越小越暗，连成一股火苗）
        bA.add2(p.x, p.y, p.z, R * (1.45 - 0.95 * u) * (1 + 0.2 * (tl - 1) * u), 2, 1, 0.6 - 0.25 * u - 0.12 * (tl - 1) * u, 0.26 - 0.12 * u - 0.06 * (tl - 1) * u, 0.62 * k * Math.pow(1 - u, 1.3), j + u * 2); }
      for (let j = 0; j < 14 && nS < SMAX; j++) { const u = fr(Ar * 1.6 + j / 14 + seed * 0.07), p = h.clone().addScaledVector(bw, R * (1.1 + 6 * tl * u)).addScaledVector(pw, R * 1.6 * Math.sin(j * 3.7 + seed) * (0.3 + u)), i3 = nS * 3;
        sa.array[i3] = p.x; sa.array[i3 + 1] = p.y - 0.6 * u * u; sa.array[i3 + 2] = p.z; const i4 = nS * 4; sc.array[i4] = 1; sc.array[i4 + 1] = 0.62; sc.array[i4 + 2] = 0.22; sc.array[i4 + 3] = Math.min(1, (1 - u) * 1.3 * k); nS++; } };
    const fl0 = mo > 0 ? flashAt(A) : 0, ik = 1 - smo(seg(mo, 2.0, 2.42));   // ik：切回原镜头以后云海淡掉（2.0–2.3），砸在云海上的火、烟一起淡掉（原来 2.45 那一帧一下子没了）
    // ---- 会砸下来的 ----
    if (mo < 2.42) W.imps.forEach((im, k) => { const t = mo - im.ti, s = im.s;
      const fu = t < 0 ? 1 + t / im.fall : 1;
      if (fu > 0 && t < 0) { let h; if (k === 0) { const e = Math.pow(fu, 1.5); h = FIRST.from.clone().lerp(FIRST.at, e); h.y = FIRST.at.y + (FIRST.from.y - FIRST.at.y) * Math.pow(1 - e, 0.55); }
        else h = im.at.clone().addScaledVector(im.dir, -im.L * (1 - fu));
        const d = k === 0 ? (() => { const e = Math.pow(Math.min(1, fu + 0.01), 1.5), h2 = FIRST.from.clone().lerp(FIRST.at, e); h2.y = FIRST.at.y + (FIRST.from.y - FIRST.at.y) * Math.pow(1 - e, 0.55); return h2.sub(h).normalize(); })() : im.dir;
        const near = k === 0 ? smo(seg(fu, 0.25, 0.7)) : 1;
        rock(h, d, s * (k === 0 ? 0.6 + 0.6 * near : 1), Math.min(1, fu * 5) * (k === 0 ? 0.55 + 0.45 * near : 1), im.ph * 10, 1, k === 0 ? smo(seg(fu, 0.64, 0.8)) : 1);   // 第一颗在天边时（S3c 摇上天那段）只是一点越来越亮的红光，石头藏起来；反打（S5）从头顶飞过时才露出来——不然远远看是个黑点
        if (k === 0) L.push([60 + 900 * Math.pow(fu, 6), h]); }
      if (t < -0.02) return;
      const tq = t < 0 ? t : mr - im.ti; if (tq > 2.6) return;   // 砸下去以后按真实时间（runMain 0–1.9 两个一样；1.9 以后斜率 1.15，烟、火不跟着变慢）
      { const t = tq;
      // 砸下去
      const at = im.at, a0 = Math.min(1, (t + 0.02) / 0.04) * ik, big = k === 0 ? 1.8 : 1, u0 = Math.max(0, t), S = s * big;
      const wd = k === 0 ? 0.12 : 0.3; if (t < wd) { const u = u0 / wd; bA.add2(at.x, at.y + 0.6 * s, at.z, S * (k === 0 ? 2.4 + 5 * easeOut(Math.min(1, u0 / 0.06)) : 3 + 9 * easeOut(Math.min(1, u0 / 0.08))), 1, 1, 1, 1, a0 * Math.pow(1 - u, 2.2)); }   // 白闪（第一颗只留 0.12，约 0.15 秒；原来 0.3、半边天发白）
      // 翻滚的火球：一团团往上翻、从白黄变橙变暗红。第一颗（离镜头近、在画面正上方）0.2 以内收成一个紧凑的火团：大小收到四成、翻得低一点、暗一点，天顶很快回到紫黑
      const fbk = k === 0 ? 1 - 0.68 * smo(seg(t, 0.04, 0.22)) : 1, fbh = k === 0 ? 0.35 : 1, fba = k === 0 ? 1 - 0.45 * smo(seg(t, 0.06, 0.26)) : 1;
      for (let j = 0; j < 4; j++) { const u = Math.max(0, t - j * 0.04) / (0.85 * (k === 0 ? 1.4 : 1)); if (u >= 1 || t < j * 0.04) continue; const ang = j * 1.9 + im.ph;
        bA.add2(at.x + Math.cos(ang) * 0.7 * s * u, at.y + (S * (0.4 + 2.2 * easeOut(u)) + j * 0.3 * S) * fbh, at.z + Math.sin(ang) * 0.6 * s * u, S * (1.2 + 3.6 * easeOut(Math.min(1, u * 1.6))) * (1 - 0.15 * j) * fbk, 2, 1, 1 - 0.4 * u, 1 - 0.75 * u, 0.95 * a0 * fba * Math.pow(1 - u, 1.5), im.ph + j + u * 1.5); }
      // 烟柱：一团接一团从火球里冒出来，边升边胀、绕着烟柱打转（翻滚）、被风往一边带；火还烧着的时候下沿被照得发红，越往上、火越小越暗
      const heat = Math.pow(Math.max(0, 1 - t / 1.5), 1.2), NP = k === 0 ? 10 : s >= 1.3 ? 7 : 5;
      for (let j = 0; j < NP; j++) { const life = 1.75 + 0.3 * ((j * 3) % 4) / 3, u = (t - 0.05 - j * 0.07) / life; if (u <= 0 || u >= 1) continue;
        const e = easeOut(u), a = im.ph * 3 + j * 2.39 + u * (2.2 + 0.9 * (j % 2)), rr = S * (0.22 + 0.7 * e) * (0.7 + 0.3 * ((j * 7) % 3) / 2), wf = 0.9 * S * u * u;
        const w = (heat * (1 - 0.7 * e) * 2.4 + fl0 * 0.15) * (1 - 0.55 * e) * (k === 0 ? 0.55 : 1);   // 被火照的暖色：越往上越暗（远处、上层的烟不再一片橙红；别处的闪光只照亮一点点）。第一颗就在画面正上方，烟柱暗一点、矮一点
        smoke(at.x + Math.cos(a) * rr + wf, at.y + S * (0.45 + 4.4 * e) * (k === 0 ? 0.8 : 1) + 0.22 * S * Math.sin(a), at.z + Math.sin(a) * rr * 0.7 - wf * 0.4, S * (1.3 + 3.3 * e) * (0.85 + 0.3 * ((j * 5) % 4) / 3), (j + k) % 4,
          w, w * 0.36, w * 0.08, 0.92 * Math.min(1, u * 7) * Math.pow(1 - u, 0.9) * ik, im.ph * 5 + j * 1.3 + u * (j % 2 ? 1.1 : -1.1)); }
      if (k === 0 || s >= 1.3) { const u = (t - 0.3) / 2.0; if (u > 0 && u < 1) { const e = easeOut(u), w = heat * 0.4 + fl0 * 0.08;   // 大的几颗：顶上一圈往外散开（小蘑菇云，在最上面，只被火照到一点）
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + im.ph + u * 0.6; smoke(at.x + Math.cos(a) * S * (0.3 + 1.7 * e) + 0.9 * S * u * u, at.y + S * (1.6 + 4.6 * e), at.z + Math.sin(a) * S * (0.3 + 1.7 * e) * 0.7, S * (1.2 + 2.6 * e), (i + k + 1) % 4,
          w, w * 0.36, w * 0.08, 0.85 * Math.sin(Math.PI * Math.min(1, u * 1.4)) * Math.pow(1 - u, 0.5) * ik, a * 2 + u); } } }
      { const u = u0 / (k === 0 ? 0.55 : 0.6); if (u < 1 && nK < 40) { const R2 = s * (k === 0 ? 1.2 + 15 * easeOut(u) : 0.8 + 8 * easeOut(u)), br = a0 * Math.pow(1 - u, 1.2); m4.compose(V3(at.x, at.y + 0.1, at.z), q.identity(), sv.set(R2, 1, R2)); W.shock.setMatrixAt(nK, m4); W.shock.instanceColor.setXYZ(nK, br, br * 0.72, br * 0.45); nK++;   // 冲击波：粗一点、亮度随半径变暗
          for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + im.ph; bN.add2(at.x + Math.cos(a) * R2 * 0.9, at.y + 0.25 * s, at.z + Math.sin(a) * R2 * 0.9, s * (1.4 + 1.6 * u) * big, 7, 0.3, 0.16, 0.13, 0.5 * br, a); } } }   // 冲击波底下贴着云海的一圈尘（暗的，被火照着一点）
      { const k2 = Math.min(1, u0 / 0.15 + 0.3) * (1 - seg(u0, 1.6, 2.6)); bA.add2(at.x, at.y + 0.2 * s, at.z, s * (3.4 + 0.4 * Math.sin(Ar * 13 + k)), 6, 1, 0.75, 0.5, a0 * (0.55 + 0.15 * Math.sin(Ar * 17 + k * 3)) * k2, k); }   // 坑边一圈烧着的余烬（不是纯黑的坑）
      im.deb.forEach(([a, v, sz], j) => { const u = (t - j * 0.03) / 1.0; if (u <= 0 || u >= 1) return; const f1 = (sz * 3.7 + a) % 1, f2 = (v * 5.3 + a * 1.9) % 1, vy = 0.6 + 0.8 * f1;   // 碎石块：起点在 0.3 s 的半径里散开、往上抛的快慢、大小、转角各不一样，出来的时刻错开 0.03（原来一样大的几块排成一条横线）
        const ox = s * 0.3 * Math.cos(a * 3.1 + 1), oy = s * 0.3 * (f2 - 0.5), oz = s * 0.3 * Math.sin(a * 2.3);
        const pos = uu => [at.x + ox + Math.cos(a) * s * 5.5 * v * easeOut(uu), at.y + oy + s * (5 * vy * uu - 5.5 * uu * uu) * 0.9 + 0.3, at.z + oz + Math.sin(a) * s * 5.5 * v * easeOut(uu)], p0 = pos(u), p1 = pos(Math.min(1, u + 0.02));
        chunk(p0[0], p0[1], p0[2], s * (0.05 + 0.13 * f2 * sz / 1.4) * (1 - 0.4 * u), (1 - seg(u, 0.75, 1)) * ik, (p1[0] - p0[0]) * 50, (p1[1] - p0[1]) * 50, (p1[2] - p0[2]) * 50, j * 1.7 + f1 * 6); });   // 抛物线飞出去，越飞越小、最后淡掉
      im.sp.forEach(([a, v, h]) => { const u = t / 1.1; if (u <= 0 || u >= 1 || nS >= SMAX) return; const i3 = nS * 3; sa.array[i3] = at.x + Math.cos(a) * s * 4 * v * u; sa.array[i3 + 1] = at.y + s * (9 * h * u - 10 * u * u); sa.array[i3 + 2] = at.z + Math.sin(a) * s * 4 * v * u;
        const b = Math.pow(1 - u, 1.2) * ik, i4 = nS * 4; sc.array[i4] = 1; sc.array[i4 + 1] = 0.55; sc.array[i4 + 2] = 0.18; sc.array[i4 + 3] = b; nS++; });
      L.push([(k === 0 ? 1700 : 480) * s * (t < 0.35 ? Math.pow(1 - u0 / 0.35, 1.5) + 0.12 : 0.12 * (1 - seg(u0, 0.35, 2.0))) * ik, at.clone().add(V3(0, 1.2 * s, 0))]); } });   // 撞上的那一下很亮，之后只留一点余火（原来一直有四分之一，整片棋盘、卡通都被染成橙红）
    if (mo >= 1.0 && mo < 1.25) L.push([34 * (0.87 + 0.13 * Math.sin(Ar * 12) * Math.sin(Ar * 8 + 2)), V3(-6.2, 1.6, 3.0)]);   // S6b 俯拍：左边画外一处烧着的火，从一侧照过来
    // 第一颗砸下去时朝镜头飞过来的碎块（S5 里从镜头前飞过去）：小块烧着的碎石，飞得快，从镜头两边擦过去
    if (mo > 0.02 && mo < 0.5) for (let i = 0; i < 9; i++) { const a = -0.5 + i * 0.13, pAt = uu => { const p = FIRST.at.clone().lerp(cam.clone().add(V3(Math.sin(a * 7) * 2.6, -0.4 + (i % 3) * 0.9, Math.cos(a * 5) * 2.2)), uu * 1.25); p.y += Math.sin(Math.PI * uu) * 1.6; return p; };
      const u = seg(mo, 0.05 + i * 0.012, 0.25 + i * 0.012); if (u <= 0 || u >= 1) continue; const p = pAt(u), p1 = pAt(Math.min(1, u + 0.02)); chunk(p.x, p.y, p.z, 0.06 + 0.03 * (i % 3), 1, (p1.x - p.x) * 10, (p1.y - p.y) * 10, (p1.z - p.z) * 10); }
    // ---- 不砸下来、远远划过天的 ----
    if (mo > 0 && mo < 1.95) W.streaks.forEach((st, k) => { const u = seg(mo, st.t0, st.t0 + st.dur); if (u <= 0 || u >= 1) return; const h = st.from.clone().addScaledVector(st.dir, st.len * u); rock(h, st.dir, st.s, Math.min(1, u * 6) * (1 - seg(u, 0.85, 1)), st.ph * 10 + k, 1.4); });
    // ---- S7 主流星替身：巨大的一颗压在头顶（mo 1.2–1.9），把卡通们越照越亮 ----
    if (mo > 1.15 && mo < 1.9) { const u = seg(mo, 1.15, 1.9), h = W.giant.from.clone().lerp(W.giant.to, u), d = W.giant.to.clone().sub(W.giant.from).normalize(), k = smo(seg(mo, 1.15, 1.3));
      rock(h, d, 7.2, k, 77, 1.1, 1, false); tongues(h, h.clone().addScaledVector(d, 0.5), 0.42 * 7.2, k, 77); bA.add2(h.x, h.y, h.z, 23 * (1 + 0.05 * Math.sin(Ar * 30)), 0, 1, 0.6, 0.35, 0.25 * k);   // 外面一圈大光晕缩到一半、淡一半（原来 46、半透明，整个上半画面都被它染成棕红）
      L.push([3200 * k * (0.4 + 0.6 * u), h.clone().lerp(cam, 0.55), GIANTC, 30]); }   // 光偏暖白：照亮它们，但不把卡通原来的颜色吃掉；照到 30 就没了（远处的云海、烟不被照亮）
    // ---- 切回原镜头以后（mo 1.9 起）：流星雨和主流星。和前面的末日流星一个画法（燃烧的石头 + 白热核 + 收尖的火尾），远处的只露热核和火尾 ----
    if (RN && mo >= 1.9) { const o = mo, { HIT } = RN, fadeAll = 1 - seg(o, HIT + 0.05, HIT + 0.35);   // 跟着撞击的白闪在 HIT+0.05–0.35 淡掉
      // 11/10（refine）：书撞上陨石的光爆一出来，流星雨就被压下去：那一刻还在飞的流星，七成被光烧掉（离撞击点近的先烧：火尾、石头缩掉，原地一闪金色的光点），
      //   之后出发的只放三成，光爆退掉（1.6–2.4）以后慢慢回到原来的密度；13.3–15.6 这段，路线在画面上穿过韩叔立牌的（按 14.3 的镜头量）一颗都不放（还在飞的也烧掉）
      const bt = RN.bt, pu = mr - bt, hanEnd = 0.8 * 15.6 - 0.8 - PRO, rk = rainRef(E, RN); let RX = null;
      P.minis.forEach(d => { if (d.k === P.minis.length - 2) return;   // 原来借去做贴着镜头的大火球的那颗，一直藏着
        const dur = d.dur * 1.3, t0n = mm(d.t0), uu = seg(mr, t0n, t0n + dur), zb = Math.min(0, -4 - (d.start.z + d.dir.z * d.len));   // 出发时刻按映射、按真实时间飞   // 每颗慢三成；终点离镜头太近的整条往后挪（落点不近于 z -4）
        let keep = 1, burn = -1; if (bt != null && t0n + dur > bt && t0n < hanEnd + 2.5) { const hk = fr(d.k * 0.618034 + 0.137), info = rk.info(d, zb, dur, t0n);
          if (t0n >= bt) { if (hk > 0.3 + 0.7 * smo(seg(t0n - bt, 1.6, 2.4)) || (info.han && t0n < hanEnd)) keep = 0; }
          else if (hk > 0.3 || info.han) { const tb = 0.03 + 0.3 * Math.min(1, info.dist / 1000); burn = seg(pu, tb, tb + 0.24); keep = 1 - smo(seg(pu, tb, tb + 0.18)); } }
        // 11/11（refine）：光盾在的时候碰到罩子轮廓就在那里灭掉（tS，见 rainShT）：0.1 内在罩子边上缩掉、火尾收短，同时闪一下金白光（0.16 淡完）、溅几颗火星；后面的落地闪光、火星都没有
        const tS = bt != null && keep > 0.001 && burn < 0 ? rainShT(d, zb, dur, t0n) : Infinity;
        if (mr >= tS) { const e = (mr - tS) / 0.16; if (e < 1 && tS > t0n + 1e-6) { const uS = (tS - t0n) / dur, hS = d.start.clone().addScaledVector(d.dir, d.len * uS); hS.z += zb;
            const s0 = 0.3 + d.sz * 0.3, kf = Math.min(1, uS * 6) * (1 - seg(uS, 0.8, 1)) * fadeAll * keep, e6 = Math.min(1, e / 0.62);
            if (e6 < 1) rock(hS, d.dir, s0, kf * (1 - smo(e6)), d.k * 3.7 + 11, 1.4 * (1 - 0.75 * e6), keep * (1 - e6));
            bA.add2(hS.x, hS.y, hS.z, s0 * (1.3 + 2.4 * easeOut(Math.min(1, e * 1.6))), 0, 1, 0.93, 0.68, 0.95 * kf * Math.min(1, e * 8 + 0.4) * Math.pow(1 - e, 1.5));
            if (!RX) RX = [V3(1, 0, 0).applyQuaternion(E.camera.quaternion), V3(0, 1, 0).applyQuaternion(E.camera.quaternion)];
            for (let j = 0; j < 7 && nS < SMAX; j++) { const a = j / 7 * 6.283 + d.k * 1.3, v = 0.7 + 0.3 * ((j * 5 + d.k) % 3) / 2, r = s0 * 2.6 * v * easeOut(e), i3 = nS * 3;
              sa.array[i3] = hS.x + (RX[0].x * Math.cos(a) + RX[1].x * Math.sin(a)) * r; sa.array[i3 + 1] = hS.y + (RX[0].y * Math.cos(a) + RX[1].y * Math.sin(a)) * r - 0.8 * s0 * e * e; sa.array[i3 + 2] = hS.z + (RX[0].z * Math.cos(a) + RX[1].z * Math.sin(a)) * r;
              const i4 = nS * 4; sc.array[i4] = 1; sc.array[i4 + 1] = 0.82; sc.array[i4 + 2] = 0.42; sc.array[i4 + 3] = kf * Math.pow(1 - e, 1.3); nS++; } }
          return; }
        if (uu > 0 && uu < 1 && keep > 0.001) { const h = d.start.clone().addScaledVector(d.dir, d.len * uu); h.z += zb; rock(h, d.dir, 0.3 + d.sz * 0.3, Math.min(1, uu * 6) * (1 - seg(uu, 0.8, 1)) * fadeAll * keep, d.k * 3.7 + 11, 1.4, keep); }
        if (uu > 0 && uu < 1 && burn > 0 && burn < 1) { const h = d.start.clone().addScaledVector(d.dir, d.len * uu); h.z += zb; const s0 = 0.3 + d.sz * 0.3; bA.add2(h.x, h.y, h.z, s0 * (1.8 + 2.6 * burn), 0, 1, 0.86, 0.5, 0.85 * Math.sin(Math.PI * burn) * fadeAll); }
        if (keep < 1 && burn < 0) return;   // 不放的：落地的闪光、溅起的火星也不要
        if (burn >= 0) return;   // 烧掉的：后面落地的闪光也没有
        // 11/09（refine）：一路扎进棋盘面（y −0.04、棋盘范围以内）的那几颗，在扎进去的那一点炸一下：白黄闪光 + 一圈余烬 + 往上溅的火星（0.3–0.45 秒，按真实时间）。
        //   原来不炸，石头一帧就没进棋盘里；那一颗（T≈11.55，韩叔升起前、他右后方）原来压在下黑边底下，去掉遮幅以后露出来了
        { const ub = (-0.04 - d.start.y) / (d.dir.y * d.len); if (ub > 0 && ub < 1) { const hp = d.start.clone().addScaledVector(d.dir, d.len * ub); hp.z += zb;
          if (Math.abs(hp.x) < 8.1 && Math.abs(hp.z) < 6.1) { const th = t0n + dur * ub, e3 = seg(mr, th, th + 0.3), s0 = 0.3 + d.sz * 0.3, kf = Math.min(1, ub * 6) * fadeAll;   // 不跟着火尾在最后两成淡掉：石头本身一直是满大小的
            if (e3 > 0 && e3 < 1) { bA.add2(hp.x, hp.y + 0.2 * s0, hp.z, s0 * (1.6 + 2.8 * easeOut(e3)), 0, 1, 0.82, 0.55, kf * Math.pow(1 - e3, 1.6)); bA.add2(hp.x, hp.y + 0.05, hp.z, s0 * (1.3 + 1.6 * e3), 6, 1, 0.6, 0.3, 0.8 * kf * (1 - e3), d.k); }
            const e4 = (mr - th) / 0.45; if (e4 > 0 && e4 < 1) for (let j = 0; j < 9 && nS < SMAX; j++) { const a = j / 9 * Math.PI * 2 + d.k, v = 0.7 + 0.3 * ((j * 5) % 3) / 2, i3 = nS * 3;
              sa.array[i3] = hp.x + Math.cos(a) * s0 * 2.2 * v * e4; sa.array[i3 + 1] = hp.y + s0 * (3.4 * v * e4 - 3.6 * e4 * e4) + 0.05; sa.array[i3 + 2] = hp.z + Math.sin(a) * s0 * 1.6 * v * e4;
              const i4 = nS * 4; sc.array[i4] = 1; sc.array[i4 + 1] = 0.62; sc.array[i4 + 2] = 0.22; sc.array[i4 + 3] = kf * Math.pow(1 - e4, 1.2); nS++; } } } }
        if (d.k < 24) { const e2 = seg(mr, t0n + dur, t0n + dur + 0.35), end = d.start.clone().addScaledVector(d.dir, d.len); end.z += zb;   // 落下去的小闪光
          if (e2 > 0 && e2 < 1 && end.y < 4) { bA.add2(end.x, end.y, end.z, 3 + e2 * 5, 0, 1, 0.8, 0.55, (1 - e2) * fadeAll); bA.add2(end.x, end.y, end.z, 2 + e2 * 3, 6, 1, 0.6, 0.3, 0.8 * (1 - e2) * fadeAll, d.k); } } });
      // 11/09：撞书的那颗流星：和流星雨一个画法，从画面右上方斜着落下来，BHIT 那一刻正好撞上往上飞的书；按真实时间飞，越近越快。
      //   11/10（refine）：撞击点挪到高空以后，方向改成从右上方的深空里扑下来（BMD 带朝镜头的分量：远处小、越近越大，画面上走得比原来长）
      //   11/10：整条路线往来的方向退 BOFF（书在 BMD 方向上的半长约 0.95 + 石头半径约 0.5），石头正好在 BHIT 那一刻碰到书（原来是石头中心在 BHIT 到书中心，提前约 0.13 秒就扎进书里）
      // 11/10（refine2，评审：「13.300 石头还隔着一段，13.333 一帧就没了，看不出是书挡住了它」）：撞上那一帧（BHIT 后第一帧，tb 在 0 到 −0.018 之间）石头停在贴着封面的地方、火尾压短，
      //   之后 0.3 内裂成七块烧着的碎石、带一把火星，从撞击点往外（画面上背着书的那一边，150° 的扇面）迸开、往镜头这边飞一点，越飞越小、往下坠一点；
      //   起点挪到书前面 0.9（离镜头近），碎石、火星都画在书和光芒前面，不藏在书后
      { const tb = mm(BHIT) - mr, RR = rbRef();
        if (tb > -0.018 && tb < 0.75) { const t0 = Math.max(0, tb), h = bhitP().clone().addScaledVector(BMD, -t0 * (11 - 3 * t0) - RR.boff); const kb = Math.min(1, (0.75 - tb) / 0.1) * fadeAll; rock(h, BMD, BMS, kb, 41.3, tb > 0 ? 1.15 : 0.45, tb > 0 ? 1 : 0.9);
          bA.add2(h.x, h.y, h.z, BMS * 3.4 * (1 + 0.06 * Math.sin(Ar * 23)), 0, 1, 0.62, 0.2, 0.5 * kb); }   // 11/11（fixA）：截书那颗改小一号（1.15 → BMS 0.85）、偏橙（外面多一圈橙光），和后面压过来的那颗大红的分得清
        const pd = -tb; if (pd > 0 && pd < 0.34) { const tw = cam.clone().sub(RR.hit).normalize(), c0 = RR.hit.clone().addScaledVector(tw, 0.9), ou = RR.hit.clone().sub(BT), e1 = ou.addScaledVector(tw, -ou.dot(tw)).normalize(), e2 = tw.clone().cross(e1).normalize();
          for (let j = 0; j < 7; j++) { const a = (j / 6 - 0.5) * 2.6 + 0.15 * Math.sin(j * 3.1), v = 3.4 + 2.6 * ((j * 0.618) % 1), dv = e1.clone().multiplyScalar(Math.cos(a)).addScaledVector(e2, Math.sin(a)).addScaledVector(tw, 0.45).normalize();
            const e = 1 - Math.exp(-3.2 * pd), p = c0.clone().addScaledVector(dv, v * e / 3.2); p.y -= 2.2 * pd * pd; const vv = v * Math.exp(-3.2 * pd);
            chunk(p.x, p.y, p.z, (0.1 + 0.07 * ((j * 0.37) % 1)) * (BMS / 1.15) * (1 - 0.55 * seg(pd, 0.05, 0.34)), (1 - seg(pd, 0.2, 0.34)) * fadeAll, dv.x * vv, dv.y * vv - 4.4 * pd, dv.z * vv, j * 1.3); }
          for (let j = 0; j < 16 && nS < SMAX; j++) { const a = (j / 15 - 0.5) * 3.0 + 0.3 * Math.sin(j * 1.7), v = 5 + 4 * ((j * 0.414) % 1), dv = e1.clone().multiplyScalar(Math.cos(a)).addScaledVector(e2, Math.sin(a)).addScaledVector(tw, 0.3).normalize(), u = pd / 0.26; if (u >= 1) continue;
            const p = c0.clone().addScaledVector(dv, v * pd * (1 - 0.45 * u)), i3 = nS * 3; sa.array[i3] = p.x; sa.array[i3 + 1] = p.y - 1.6 * pd * pd; sa.array[i3 + 2] = p.z;
            const i4 = nS * 4; sc.array[i4] = 1; sc.array[i4 + 1] = 0.78; sc.array[i4 + 2] = 0.35; sc.array[i4 + 3] = Math.pow(1 - u, 1.2) * fadeAll; nS++; }
          if (pd < 0.12) bA.add2(c0.x, c0.y, c0.z, 1.5 * (0.8 + 1.4 * pd / 0.12), 1, 1, 0.92, 0.7, Math.pow(1 - pd / 0.12, 1.6) * fadeAll); } }   // 撞上那一下石头和封面之间迸出的一团白热
      // 主流星：同一套燃烧的石头，放大成一块巨石（和 S7 的替身一个样子：烧焦的石壳、发光裂纹、迎风的白热核、头宽尾细的火尾和烟尾）
      // 它差不多是正对着镜头压过来的，火尾藏在石头后面：按画面上往哪儿走，反方向加一圈火舌、一路撒火星；外面那圈光晕收到原来的六成
      // 11/10（refine2）：在画外（T 12.6–15.3）缩成 2.3（原来 3.4），回到画面里时比截住的那颗（1.15）大一倍、更红：外面一圈光晕偏暗红，石头周围再裹一团一涨一缩的红光
      // 11/10（迎击）：石头在画外（T 14.35–15.1，离画面右上角很远）从 2.3 再缩到 MR / 0.42 = 1.524，外面那圈大光晕跟着按比例缩（回到画面里时和原来一样大）；
      //   撞上以后被顶住 0.065（不再当帧缩没），0.065–0.13 碎掉（见 runMain 的 rs、dim）
      if (o < HIT + 0.16) { const h = RN.mp(0), d = RN.aim(h), dm = RN.dim != null ? RN.dim : 1, rd = smo(seg(mr, 3.5, 4.9)), r2 = smo(seg(mr, 4.6, 5.2)), sz = 3.4 - 1.1 * rd - (2.3 - MR / 0.42) * r2, gk = 1 - (1 - MR / 0.42 / 2.3) * r2;
        // 11/11（fixA）：和截住的那颗（小、偏橙）分得清：更红（外圈光晕、裹着的那团红光都压红、亮一点），往后拖的火长 1.8 倍
        rock(h, d, sz, dm, 77, RN.big != null ? RN.big : 1.1, RN.rs != null ? RN.rs : 1, false); tongues(h, h.clone().addScaledVector(d, 0.5), 0.42 * sz, dm, 77, 1 + 0.8 * rd);
        bA.add2(h.x, h.y, h.z, (13 - 6.5 * rd) * gk * (1 + 0.05 * Math.sin(Ar * 30)), 0, 1, 0.6 - 0.32 * rd, 0.35 - 0.25 * rd, (0.42 + 0.08 * rd) * dm);
        if (rd > 0.01) bA.add2(h.x, h.y, h.z, sz * (2.2 + 0.15 * Math.sin(Ar * 7.3)), 0, 1, 0.22, 0.07, 0.68 * rd * dm * (0.8 + 0.2 * Math.sin(Ar * 11))); }
      // 11/10（迎击）：石头被光盾的前沿顶住的那一下（pd：从 HIT 起按真实时间）：
      //   快碰上时（HIT 前 0.07）石头和罩子之间先烧白；撞上那一刻贴着撞击点炸开一团白热（0.16 内退掉），
      //   一大把火星贴着罩面往四周擦出去、一小把往石头来的方向（外面、朝镜头）溅回去（0.42 内）；九块烧着的碎石往外迸开、往下坠、越飞越小（0.55 内），飞得够远，白光退下去的时候还看得见。都放在撞击点往镜头挪一点的地方，不藏在石头和罩子后面
      { const pd = mr - mm(HIT), tw = cam.clone().sub(MHIT).normalize(), t1 = tw.clone().cross(NH).normalize(), t2 = NH.clone().cross(t1).normalize(), c0 = MHIT.clone().addScaledVector(tw, 0.45);
        if (pd > -0.07 && pd < 0.16) { const k = pd < 0 ? Math.pow(smo(1 + pd / 0.07), 2) * 0.55 : Math.pow(1 - pd / 0.16, 1.4);
          bA.add2(c0.x, c0.y, c0.z, (pd < 0 ? 0.9 + 0.6 * (1 + pd / 0.07) : 1.5 + 2.2 * easeOut(Math.min(1, pd / 0.06))), 1, 1, 0.95, 0.82, k);
          if (pd > 0) bA.add2(c0.x, c0.y, c0.z, 2.6 + 2.4 * easeOut(Math.min(1, pd / 0.1)), 0, 1, 0.78, 0.45, 0.7 * k); }
        if (pd > 0 && pd < 0.42) { const u = pd / 0.42;
          for (let j = 0; j < 44 && nS < SMAX; j++) { const back = j >= 32, a = back ? (j - 32) * 0.52 + 0.3 : j * 2.399 + 0.4, v = back ? 4 + 3.2 * ((j * 0.618) % 1) : 6.5 + 7.5 * ((j * 0.618) % 1);
            const dv = back ? NH.clone().addScaledVector(t1, 0.7 * Math.cos(a)).addScaledVector(t2, 0.7 * Math.sin(a)).addScaledVector(tw, 0.4).normalize() : t1.clone().multiplyScalar(Math.cos(a)).addScaledVector(t2, Math.sin(a)).addScaledVector(NH, 0.18).normalize();
            const p = c0.clone().addScaledVector(dv, v * pd * (1 - 0.45 * u)), i3 = nS * 3; sa.array[i3] = p.x; sa.array[i3 + 1] = p.y - 2.6 * pd * pd; sa.array[i3 + 2] = p.z;
            const i4 = nS * 4; sc.array[i4] = 1; sc.array[i4 + 1] = back ? 0.7 : 0.84; sc.array[i4 + 2] = back ? 0.3 : 0.45; sc.array[i4 + 3] = Math.pow(1 - u, 1.2) * Math.min(1, pd / 0.015); nS++; } }
        if (pd > 0.01 && pd < 0.56) for (let j = 0; j < 9; j++) { const t = pd - 0.01, a = j * 0.698 + 0.35 * Math.sin(j * 2.3), v = 3.6 + 2.6 * ((j * 0.414) % 1);
          const dv = NH.clone().multiplyScalar(0.75).addScaledVector(t1, Math.cos(a)).addScaledVector(t2, Math.sin(a) * 0.85).addScaledVector(tw, 0.35).normalize(), e = (1 - Math.exp(-2.6 * t)) / 2.6, vv = v * Math.exp(-2.6 * t);
          const p = c0.clone().addScaledVector(NH, 0.25).addScaledVector(dv, v * e); p.y -= 2.4 * t * t;
          chunk(p.x, p.y, p.z, (0.13 + 0.1 * ((j * 0.37) % 1)) * (1 - 0.6 * seg(t, 0.05, 0.55)), 1 - seg(t, 0.38, 0.55), dv.x * vv, dv.y * vv - 4.8 * t, dv.z * vv, j * 1.7); } } }
    SM.sort((a, b) => b[0] - a[0]); SM.forEach(([, x, y, z, size, cell, r, g, b, a, rot]) => W.bS.add2(x, y, z, size, cell, r, g, b, a, rot));
    W.rocks.count = nR; W.rocks.instanceMatrix.needsUpdate = true; W.rocks.geometry.attributes.iDir.needsUpdate = true; W.rocks.visible = nR > 0;
    W.shock.count = nK; W.shock.instanceMatrix.needsUpdate = true; if (W.shock.instanceColor) W.shock.instanceColor.needsUpdate = true; W.shock.visible = nK > 0;
    W.sparks.visible = nS > 0; sa.needsUpdate = sc.needsUpdate = true; W.sparks.geometry.setDrawRange(0, nS);
    bA.end(); bN.end(); rA.end(Ar); rN.end(Ar); W.bS.end(Ar);
    // 三盏点光源：分给离镜头近、最亮的三处（按 强度 / 距离² 排）
    L.sort((a, b) => b[0] / (1 + b[1].distanceToSquared(cam) * 0.02) - a[0] / (1 + a[1].distanceToSquared(cam) * 0.02));
    W.pl.forEach((l, i) => { l.visible = mo > -0.6 && mo < 2.1; const c = L[i]; if (!c) { l.intensity = 0; return; } l.position.copy(c[1]); l.color.copy(c[2] || FIREC); l.distance = c[3] || 0; l.intensity = c[0] * (1 - smo(seg(mo, 1.9, 2.1))); });
    // 「直到那一天——」：太阳旁边亮起一点红光（就是第一颗流星，远远地一闪一闪变大）
    // 摇上天那段放慢以后红点要看得见：早一点亮（2.56）、光晕大一圈、一路按新时间长大（4.9–5.8）
    const gk = smo(seg(A, 2.56, 2.7)) * (1 - seg(mo, -0.235, -0.215));   // 一直亮到切反打（A 2.98）那一刻，不在最后先缩回一个小点 W.glint.visible = W.glint2.visible = gk > 0;
    if (gk > 0) { const p = FIRST.from.clone().normalize().multiplyScalar(140), pul = 0.75 + 0.25 * Math.sin(Ar * 26), gr = 1.3 + 4.2 * smo(seg(CK.An, 4.9, 5.8)); W.glint.position.copy(p); W.glint2.position.copy(p);
      W.glint.scale.setScalar(140 * 0.034 * gk * pul * gr); W.glint.material.opacity = gk; W.glint2.scale.setScalar(140 * 0.011 * gk * gr); W.glint2.material.opacity = gk; }
  }
  const FIREC = new THREE.Color('#ffa05a'), GIANTC = new THREE.Color('#ffc890');   // 撞击点的火光；主流星替身的光（偏暖白）

  // 短剧字幕：底部大字（白字粗黑描边，关键词金色）；name 是角色出场的定格名牌
  // 开头先交代世界（run）：暖阳蓝天，棋盘浮在云海上，服务卡通们在玩（见 cast()）；天色一下子暗下来、「直到那一天——」，卡通们抬头看天边的一点红光；
  // 那点红光砸进云海（runMain 0），流星雨猛地砸下来（转折）
  // 11/09：序章不再加电影遮幅（用户定：和正片一样用完整的 16:9）。字幕底边和正片字幕条对齐（style_open.css .dcap bottom 84），名牌、头像回到加遮幅以前的位置
  // 标点排版（只套 span、不改字，样式在 style_open.css 的 .tpe / .tpd / .tpq）：省略号「……」抬到字身中间、两个字符之间不加字距；破折号「——」不加字距连成一条；
  // 行尾的「！」「？」、连用的「？！」取半角宽。字幕、过场字、台词气泡都过一遍
  const tp = s => s.replace(/……/g, '<span class="tpe">……</span>').replace(/——/g, '<span class="tpd">——</span>').replace(/[？！]+(?=$|<)/g, m => `<span class="tpq">${m}</span>`);
  const FY = 921;   // FY：字幕两边表情头像的中心高度（字幕 bottom 84；加遮幅时字幕在 bottom 168、头像在 837，一起往下 84）
  function run(o, E) {   // o：新的序章绝对时间（0–OPENL）
    const { V, seg, ease } = E, P = assets(E);
    E.show('oflash', 'later', '', 1 - smo(seg(o, 0.02, 0.42)), 'none');   // 封面接序章：从黑场里淡出来（比原来早一点淡完，建立镜头多露出来一些）
    // 序章标题卡（左上角，和名牌的字左对齐）：黑场还没淡完就先淡进来（T 1.1–1.6），细金线从左往右画出来、字距慢慢收拢；「很久很久以前」还在的时候（T 3.13–3.56，S2 里、切 S3a 那一刀之前）先淡掉，不抢那条字幕
    if (o < 2.1) { const a = (1 - Math.pow(1 - seg(o, 0.08, 0.5), 2)) * (1 - Math.pow(seg(o, 1.7, 2.05), 2)), e = E.show('dchap', 'dchap', '<s></s><b><em>序章</em><i> · </i>韩叔的出师考</b>', a, 'none');
      e.children[0].style.transform = `scaleX(${(1 - Math.pow(1 - seg(o, 0.08, 0.62), 3)).toFixed(3)})`; e.children[1].style.letterSpacing = `${(0.5 - 0.12 * (1 - Math.pow(1 - seg(o, 0.08, 2.05), 2))).toFixed(4)}em`; }
    P.base.forEach(([l, i0]) => { l.intensity = i0; });
    if (o >= PRO) { runMain(o - PRO, E); return; }
    const Ao = AO(o); CK.An = o; CK.Ar = o - DP; CK.rm = o - PRO;   // 脚本进度（旧时间，风平浪静那一段是负的：新补的戏）；真实时间钟
    P.stage.style.background = '#03050c'; if (P.grid) P.grid.visible = false;
    P.sky.visible = P.clouds.visible = true; P.sky.rotation.y = (o - PRO) * 0.01; P.skyM.color.setRGB(1, 1, 1);
    P.sky.children.forEach(m => { m.material.opacity = 1; if (m.material === P.skyM && m.material.transparent) { m.material.transparent = false; m.material.needsUpdate = true; } }); P.clouds.children.forEach(m => { if (m.userData.o0 != null) m.material.opacity = m.userData.o0; });
    P.clouds.children.forEach(m => { const a = m.userData.a + (o - PRO) * m.userData.v; m.position.x = Math.cos(a) * m.userData.d; m.position.z = Math.sin(a) * m.userData.d * 0.8; });
    // 风平浪静：暖阳、蓝天白云，棋盘浮在云海上，一群服务卡通在棋盘和云朵上玩（分镜见上面 SHOTS）；「直到那一天——」一道影子从太阳那边扫过来，天色暗下去，卡通们一个接一个停下来转身看天，太阳被暗红的雾吞掉，旁边亮起一点红光
    const [cp, cl] = camOpen(o, V); E.camera.position.copy(cp); E.camera.lookAt(cl);
    world(Ao, E, P);
    E.show('dvig', 'dvig', '', 0.4 + 0.6 * smo(seg(o, 4.58, 4.94)), 'none');   // 白天暗角淡一点，天一暗再压回来
    cast(AC(o), E, P); meteors(Ao, E, P);
    E.show('dc0', 'dcap', tp('<small>很久很久以前……</small><b>云上世界 <em>风平浪静</em></b>'), seg(o, 0.75, 0.95) * (1 - seg(o, 3.25, 3.45)), 'translateX(-50%)');   // 完全不透明停约 2.9 秒（T 1.94–5.06；上一版 3.7 秒）
    E.show('dc00', 'dturn', tp('直到那一天——'), seg(o, 4.7, 4.9) * (1 - seg(o, 5.70, 5.86)), 'translateX(-50%)');   // 11/05 复核：在切反打（5.863）之前收完，不压到反打镜头里 RDS 卡通的头顶   // 天一暗（4.58）就出来，留到第一颗砸下去
  }

  // 一条连续的镜头：按时间的三次 Hermite 曲线穿过关键帧（位置、看的点各一条）。中间关键帧的速度取前后两帧的平均，镜头不会在每个关键帧停一下；
  // 开头、结尾和「停住」的关键帧（和相邻帧位置一样）速度为 0，自然地起步、停下。
  // 第 4 个元素可选：'hold' = 这一帧速度为 0（停稳了再走）；[位置速度, 看点速度] = 指定这一帧的速度（写 null 的那条照常算；序章最后一帧按正片 10.7 秒的速度接过去）
  function spline(o, K, V) {
    let k = 0; while (k < K.length - 2 && o > K[k + 1][0]) k++;
    const t0 = K[k][0], h = K[k + 1][0] - t0, u = Math.max(0, Math.min(1, (o - t0) / h)), u2 = u * u, u3 = u2 * u;
    const P = (j, w) => V(...K[j][w]);
    const tan = (j, w) => { const x = K[j][3]; if (x === 'hold') return V(0, 0, 0); if (Array.isArray(x) && x[w - 1]) return V(...x[w - 1]);
      if (j <= 0 || j >= K.length - 1) return V(0, 0, 0); const p = P(j, w);
      if (p.distanceTo(P(j - 1, w)) < 1e-6 || p.distanceTo(P(j + 1, w)) < 1e-6) return V(0, 0, 0);
      return P(j + 1, w).sub(P(j - 1, w)).multiplyScalar(1 / (K[j + 1][0] - K[j - 1][0])); };
    const herm = w => P(k, w).multiplyScalar(2 * u3 - 3 * u2 + 1).add(tan(k, w).multiplyScalar(h * (u3 - 2 * u2 + u))).add(P(k + 1, w).multiplyScalar(-2 * u3 + 3 * u2)).add(tan(k + 1, w).multiplyScalar(h * (u3 - u2)));
    return [herm(1), herm(2)];
  }
  // 韩叔的高度（runMain 的 o）：2.4–3.0 从光柱里升起 2.6；挡下流星（HIT）以后比原来高 0.3，和两边云上欢呼的卡通站成一排（整组都在字幕上面，原来 5.4 起就往下落、整个人压在字幕底下）；
  // 卡通们挥完手、一个个蹦走时（6.15–6.75）落回棋盘中央（著书那段从 6.4 接着往下落，6.75 落定；字幕 6.7 才收完，落到下面四分之一时字幕已经在淡出）
  // 甩书时（3.05–3.6）被光托着再往上浮 0.8（原来停在 2.56，「他把规则书一甩——」那几秒他的脸压在字幕底下、脚出了画面下沿）；挡下流星那一下被压回 0.5
  const hanUp = (o, rise) => -0.04 + rise * 2.6 + 0.8 * smo(seg2(o, 3.05, 3.6)) - (o > 5.0 ? 0.5 * smo(seg2(o, 5.0, 5.45)) + 2.9 * smo(seg2(o, 6.15, 6.75)) : 0);
  // 11/09：甩书那一镜改成书撞上一颗落下来的流星（原来书飞到半空翻开、书页四散）；11/10 云团改成金色光爆，撞击点挪到他右上方一侧；11/10（光盾）法阵换成光盾，见下面。
  //   BHIT：撞上的时刻（脚本 o）——对着 music.mjs 里的 noise(mm(3.45))；shimmer(mm(3.55)) 光盾从书里展开
  // 11/10（光盾，用户：「不怪么」「总有一种黑莲封印的感觉？」）：金色法阵换成一面护住大家的光盾，书换成一本从头到尾认得出的红色烫金规则书（见 runMain 的 P.RB / P.shield）。
  //   BT：书截住陨石的地方（他右上方一侧，撞上那一刻在画面约 (1320,330)，离上沿、右沿、名牌、字幕都有余量；原来 (2.9,6.7) 在画面 y≈210，光爆上半截被上沿切掉）。
  //   BMD：截书那颗陨石飞的方向：从画面右上方（画面里面）扑下来，撞上前约 0.45 秒都看得见它拖着尾巴扑向书；rbRef().boff：石头碰到封面时离书中心多远（书在 BMD 上的支撑长度 + 石头半径）
  const BHIT = 3.45, BT = V3(2.4, 6.0, -0.6), BMD = V3(-0.66, -0.42, 0.62).normalize(), BMS = 0.85;   // BMS：截书那颗陨石的大小（11/11 fixA：1.15 → 0.85）
  const rbS = o => 1 - Math.pow(1 - seg2(o, 3.05, 3.47), 2.2);   // 书飞出去的进度（越飞越慢，3.47 停在 BT）
  const RBM4 = new THREE.Matrix4(), rbBasis = (N, U) => { const z = N.clone().normalize(), y = U.clone().addScaledVector(z, -U.dot(z)).normalize(), x = y.clone().cross(z); return new THREE.Quaternion().setFromRotationMatrix(RBM4.makeBasis(x, y, z)); };
  // 光盾（11/10 refine2，评审：近景里光盾不成形、刚展开就出了上沿和右沿）：分两个样子，都是椭球（中心 c、横向半径 a、竖向半径 b），底边从 cut 往上 cutW 柔柔地淡进来——
  //   SB1 近景的泡：罩住韩叔和书，整个泡在画面里（T 14.0–16.7 上沿离画面上沿 ≥ 115 像素、右边 ≤ 1500）；SB2 全景的穹顶：罩住两排卡通的头顶（顶在 y 7.8，T 17.2 以后顶上那段弧都在画面里）。
  //   主陨石撞上来（HIT）以后从 SB1 慢慢撑大成 SB2（HIT+0.06–1.2，镜头往后拉、卡通们冒出来的时候，罩子跟着罩过去）；镜头一直在它外面，不会穿过罩面。
  //   SHO：书在泡上的方向（展开时从这里亮开）；BT2：光盾撑开以后书升到泡顶偏右（T 16.2 在画面约 (1100,280)，在他皇冠右上方、不压脸）
  // 11/10（迎击，用户看了 T 16.6 那一帧（泡罩着韩叔和书、主陨石从右边压过来、撞在泡的右后方）：「这里保护罩应该向外扩散。。然后和陨石撞一起 才是后面的动画」）：
  //   原来 MHIT 在泡的右后方，镜头隔着罩面看过去像石头撞在泡后面。改成主陨石压过来时光盾主动往外推、迎上去，在半路正面撞上：
  //   PC0–PC1 蓄力（T 16.03–16.33：泡微微一收 6%、罩面和边缘一圈亮起来、蜂窝格往里收）→ PC1–HIT 往外推开（T 16.33–16.73：罩面沿法线鼓出 A·max(0, u·SHH)^2.5 + B 倍，
  //   迎向陨石那一侧推得最快、背面几乎不动；前沿一圈亮、一圈蜂窝格从里往外扫到边上）→ HIT 鼓出来的前沿正好碰上石头：撞击点 MHIT 就在推开以后的泡的轮廓上
  //   （画面约 (1569,340)，法线和视线垂直，看得清是罩子的边缘和石头相碰；离右沿、上沿、名牌、他的脸都远）。撞上以后被顶住的那一下罩面往里压一点（dent），随后从这个形状撑成 SB2（鼓出来的那块跟着收平）。
  //   SHH：撞击点在单位球上的方向（也是往外推的方向）；NH：撞击点的罩面法线（世界坐标）；MR：主陨石的石头半径（2.3 → 1.524：撞上时离镜头近，原来那么大会顶到画面右沿；
  //   画外的时候缩的，回到画面里的路线按镜头往近处收了同样的比例，画面上的位置、大小和原来一样）；MC：撞上那一刻石头的中心（MHIT 沿 NH 往外一个半径，画面约 (1696,283)）
  const SB1 = { c: V3(0, 4.05, -0.6), a: 2.85, b: 2.65, cut: -0.72, w: 0.47 }, SB2 = { c: V3(0, 3.6, -0.6), a: 9, b: 4.2, cut: 0.111, w: 0.4 };
  const shDir = p => V3((p.x - SB1.c.x) / SB1.a, (p.y - SB1.c.y) / SB1.b, (p.z - SB1.c.z) / SB1.a).normalize();
  // 11/11（fixA，评审：「陨石在画面上几乎不动、像光盾伸过去贴上它，没有冲劲」）：光盾只往外迎一点（A 0.24 → 0.12，蓄力时也不再先收 6%：C 0），撞击点往下挪到右边沿偏上（画面约 (1518,410)，石头中心约 (1645,366)），
  //   让主陨石自己扑过来走完这段路（见 MK：T 16.2 起从右上角约 (1805,143) 加速扑下来，0.53 秒里画面上走约 257 像素、变大约 1.58 倍）
  const SHP = { A: 0.12, B: 0.02, C: 0 }, SHH = V3(0.973, 0.1871, 0.1349), MHIT = V3(3.1614, 4.6151, -0.1618), NH = V3(0.9704, 0.2006, 0.1345), MR = 0.64, MC = MHIT.clone().addScaledVector(NH, MR);
  const MVE = V3(-6.047, -13.762, 24.039), MV6 = V3(-5.841, -14.108, 23.99), MDIR = MVE.clone().normalize();   // 主陨石最后一冲的速度（HIT）、开始冲的速度（6.177）
  // 推开的进度（新时间）：shPush(on) → [A, B]（撞上以后不再往外推，HIT 以后的收平见 runMain 的 SHIELD）；shDent(ht)：撞上以后被石头压进去的那一下（0.035 内压到 3%、0.07–0.2 弹回）
  const shPC = HN => [HN - 0.56, HN - 0.32], shE = u => 0.5 * u + 0.5 * (1 - Math.exp(-3 * u)) / (1 - Math.exp(-3));   // 起步最猛、撞上时还有速度
  const shPush = (on, HN) => { const [p0, p1] = shPC(HN), ch = smo(seg2(on, p0, p1)); if (on <= p1) return [0, SHP.C * ch]; const e = shE(Math.min(1, (on - p1) / (HN - p1))); return [SHP.A * e, SHP.C + (SHP.B - SHP.C) * e]; };
  const shDent = ht => ht > 0 ? 0.03 * smo(seg2(ht, 0, 0.035)) * (1 - smo(seg2(ht, 0.07, 0.2))) : 0, SHR = 3.24;   // SHR：撞击点离泡心多远（按罩面的缩放量），压进去的距离 = SHR × dent
  // 11/11（fixA）：光盾长大（pu：BHIT 起的新时间；puH：HIT 那一刻的 pu）。g0 起始大小，g1·(1 − e^(−u/τ)) 先快后慢，再加一段匀速 kS·u（kS 让 HIT 那一刻正好是 1）
  // 11/11（refine，评审：「15.6–16.35 画面上几乎不长，看着像停了」）：g1 0.82 → 0.6、τ 0.22 → 0.33，匀速那段占得多：T 14.35 约 0.67 倍（14.3 前后罩住他），之后每 0.3 秒左沿往外走约 40 像素、一直到 HIT
  const SHG = { t0: 0.14, g0: 0.05, g1: 0.6, tau: 0.33 }, shG = (pu, puH) => { if (pu >= puH) return 1; const u = Math.max(0, pu - SHG.t0), uH = puH - SHG.t0, kS = (1 - SHG.g0 - SHG.g1 * (1 - Math.exp(-uH / SHG.tau))) / uH;
    return SHG.g0 + SHG.g1 * (1 - Math.exp(-u / SHG.tau)) + kS * u; };
  // LKT（新时间）：他转头 T 13.85–14.2、回正一半 15.0–15.5；右上角火光 13.75–15.2 亮起、15.65–16.25 让给入画的主陨石自己的光
  const LKT = [13.85, 14.2, 15.0, 15.5, 13.75, 15.2, 15.65, 16.25].map(T => 0.8 * T - (PRO + 0.8));
  const SHO = shDir(BT), BDZ = [0.2, 0.52], DAWNC = new THREE.Color('#ffd8a6');
  // ---------- 11/10（打开）：用户看了 19.6 那一帧（穹顶还罩着大家）说「最后保护罩也要打开的」——危险过去以后光盾收掉，放大家出来 ----------
  //   这段脚本 o 是慢放（MAP_MAIN 5.36–5.9），一律按新时间 on 算
  // 11/11（fixB，用户：「保护罩不断的去放大，然后再去抵挡另外一个陨石，最后去碎开出后面的那些，大家都出来」；主会话：挡住以后别马上碎，稳住、亮一拍，由韩叔主动收盾，
  //   金光往下飘，落到哪朵云上哪个小精灵就从那里弹出来）：撞上以后（HIT，T 16.725）光盾挡住、继续撑成穹顶（SHE：HIT+0.03–0.78，T 17.65 撑满 SB2），
  //   GLB（T 16.92–17.42）整面亮一拍 → DSM 韩叔收盾：T 17.26–17.40 往上一挺、权杖顶端亮起一颗星光 → 光盾收掉 → 十颗金色光点各自落到一个卡通脚下那朵云上（POPT），落下那一刻那个卡通才从云里弹出来（见 cheer）
  // 11/11（shfade，用户看了 T 17.83 穹顶从最高点碎开、顶上一闪、光片往外散：「这个不应该从头顶碎吧？感觉不吉利」「应该是整体淡入淡出的消失」）：
  //   不碎了——从杖尖打到最高点的细光、顶上那一闪、开口子、六边形光片都拿掉。杖尖亮满（T 17.40）起两圈金光环从杖尖慢慢往外推开（到 17.94 散完），光盾跟着整面一起柔和地淡掉（SHF）：
  //   T 17.42–17.98 整面轻轻亮一下（lf），17.50–18.15 边缘亮边、蜂窝纹、高光带先退（fdk），17.55–18.45 整体降到 0、融进晨光（lt 照旧 T 17.68–18.48 亮起来）；
  //   光点从罩面上各自那个卡通正上方的那一点（不是最高点，也不在他头顶上）凝出来，往下飘到云上（POPT 不变，十声「啵」不用挪）
  const TNo = T => 0.8 * T - (PRO + 0.8);   // 视频秒 → 新时间 on
  // 11/11（shfade/refine，评审：「是韩叔收的主要靠时间先后才看得出来，光环和罩子没有接上」）：第二圈光环（DSM.w0–w1）推到罩边约 T 17.72，整面轻轻亮一下的峰值对准它（SHF.l 17.48–18.0，峰 17.74）；
  //   罩边的亮边、纹路等光环到了才退（SHF.d 17.62–18.2），整体从 17.6 起降、18.45 降到 0（f1 不变）
  const SHE = [0.03, 0.78], GLB = [TNo(16.92), TNo(17.42)], DSM = { s0: TNo(17.26), s1: TNo(17.4), b1: TNo(17.6), f1: TNo(17.95), w0: TNo(17.45), w1: TNo(17.92) };   // DSM.b1–f1：杖尖的光淡掉
  const SHF = { l0: TNo(17.48), l1: TNo(18.0), d0: TNo(17.62), d1: TNo(18.2), f0: TNo(17.6), f1: TNo(18.45) };   // 11/11（shfade）：光盾整面淡出（见上）
  const OPA = TNo(17.6), OPB = TNo(18.1);   // 流星雨躲光盾躲到 OPA（和原来一样）；晨光 lt 在 OPA+0.06 到 OPB+0.3 亮起来
  // 撑成穹顶的进度和那一刻的形状（中心、横向、竖向半径）：光盾、光片的起点、光点的起点都按它算
  const shEk = on => smo(seg2(on - mm(5.0), SHE[0], SHE[1])), shDim = ek => ({ c: SB1.c.clone().lerp(SB2.c, ek), a: SB1.a + (SB2.a - SB1.a) * ek, b: SB1.b + (SB2.b - SB1.b) * ek });
  // 11/11（refine）：这一刻光盾在世界里的样子（泡心 c、横向 a / 竖向 b 半径、底边 cut；不算往外推、压进去的那一点）——还没长出来、已经淡完返回 null。流星雨躲光盾按它算（只问到 OPA）
  const shNow = on => { const pu = on - mm(BHIT); if (pu < SHG.t0 || on >= SHF.f1) return null; const sc = shG(pu, mm(5.0) - mm(BHIT)), ek = shEk(on), D = shDim(ek);
    return { c: BT.clone().addScaledVector(D.c.clone().sub(BT), sc), a: D.a * sc, b: D.b * sc, cut: SB1.cut + (SB2.cut - SB1.cut) * ek }; };
  // 11/11（refine，评审：「流星雨里的小流星在光盾轮廓里面飞……画面上看就是石头进了罩子」）：光盾在的时候（BHIT+SHG.t0 到 OPA，光盾开始淡掉），每颗流星在画面上一碰到罩子的轮廓就在那里灭掉
  //   （rainShT：它的头第一次落进光盾投影的时刻——按那一刻的镜头（不算震屏）从镜头往它的头打一条线，碰到罩子（底边 cut 以上）就算落进去；每颗算一次记下来，和 seek 先后无关）。
  //   一出发就在轮廓里的不放；之后在罩子边上缩掉、闪一下金白光、溅几颗火星（见 meteors()）
  const RSH = new Map(), rainShT = (d, zb, dur, t0n) => { if (RSH.has(d.k)) return RSH.get(d.k);
    const tA = Math.max(t0n, mm(BHIT) + SHG.t0), tB = Math.min(t0n + dur, OPA); let res = Infinity;
    const inside = t => { const S = shNow(t); if (!S) return false; const h = d.start.clone().addScaledVector(d.dir, d.len * (t - t0n) / dur); h.z += zb;
      const [cp] = spline(WA(t), CAM_A, V3), k = V3(1 / S.a, 1 / S.b, 1 / S.a), o = cp.clone().sub(S.c).multiply(k), dv = h.clone().sub(cp).multiply(k);
      const A = dv.dot(dv), B = 2 * o.dot(dv), C = o.dot(o) - 1, Dq = B * B - 4 * A * C; if (Dq <= 0) return false; const q = Math.sqrt(Dq), s1 = (-B - q) / (2 * A), s2 = (-B + q) / (2 * A);
      if (s2 <= 0) return false; return o.y + dv.y * Math.max(0, s1) > S.cut || o.y + dv.y * s2 > S.cut; };
    if (tB > tA) { if (inside(tA)) res = tA; else for (let t = tA + 1 / 120, pv = tA; t < tB + 1 / 120; pv = t, t += 1 / 120) { const tt = Math.min(t, tB); if (inside(tt)) { let lo = pv, hi = tt; for (let i = 0; i < 7; i++) { const m = (lo + hi) / 2; if (inside(m)) hi = m; else lo = m; } res = hi; break; } } }
    RSH.set(d.k, res); return res; };
  // 11/11（fixB）：韩叔权杖顶端（正面立牌 han_front 上杖头那一点：从左量 0.934、从下量 0.6）在世界里的位置——立牌正对镜头（见 chibi.js makeSpriteChibi 的 place），跟着 R 的晃、挺、转
  const hanTip = (h, cam, P) => { const f = P.SP.han && P.SP.han.front, w = f ? f.w * 2.1 / f.h : 1.5; h.g.updateMatrixWorld(true); const cl = h.R.worldToLocal(cam.position.clone()), phi = Math.atan2(cl.x, cl.z);
    return h.R.localToWorld(V3(Math.cos(phi) * 0.434 * w, 0.6 * 2.1, -Math.sin(phi) * 0.434 * w)); };
  // 书的几个固定朝向（按 BHIT 那一刻的镜头算，不跟着每帧的震屏变）：qf 关着、封面迎着扑来的陨石（还看得到书名）；qo 翻开、书页朝着镜头稍微朝上，往一边侧一点（露出红色书皮的厚度）
  //   boff：石头碰到封面时离书中心多远（书在 BMD 上的支撑长度 + 石头半径）；hit：碰上的那一点（封面右上角那一带）
  let RBR = null; const rbRef = () => RBR || (RBR = (() => { const [cp] = spline(WA(mm(BHIT)), CAM_A, V3), nC = cp.clone().sub(BT).normalize(), Nf = nC.clone().multiplyScalar(0.8).addScaledVector(BMD, -0.6).normalize();
    const qf = rbBasis(Nf, V3(0, 1, 0)), qo = rbBasis(nC.clone().add(V3(0, 0.3, 0)).normalize(), V3(0, 1, 0)).multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), 0.32)).multiply(new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), -0.12));
    const S = 1.75, hx = [0.268 * S, 0.365 * S, 0.065 * S], ax = [V3(1, 0, 0), V3(0, 1, 0), V3(0, 0, 1)].map(a => a.applyQuaternion(qf)), sup = ax.reduce((n, a, i) => n + Math.abs(a.dot(BMD)) * hx[i], 0);
    return { Nf, qf, qo, boff: sup + 0.42 * BMS * 0.82, hit: BT.clone().addScaledVector(BMD, -sup * 0.92) }; })());
  const bhitP = () => BT;
  // 主流星（11/10 refine2，评审：「12.9–13.3 它和截住的那颗长得一样，分不清书挡的是哪颗」「半个月牙贴着右沿长大」）：T 12.4 以前照原来的路线（M0 → IMP，进度 mainU）；
  //   之后一路往右滑出画面（12.6 出画，书截陨石那几秒画面里只留截住的那一颗），在画外绕到右上方；15.35 起从右上角一口气整颗压进来（15.6 整颗在画里、离右沿留出余量），
  //   在右上方往下压、越压越近（画面上一路往左下走，火尾朝后上方），16.35 起顺着 MDIR 直直地扑向光盾（最后 0.3 匀速 MVS，三个点的速度都给定），HIT 中心正好到 MC（石头的前沿贴上 MHIT）。三次 Hermite 连起来，速度连续
  // 11/10（迎击）：石头缩到 MR（画外 T 13–14.7 缩的），5.237 起的几个关键帧按那一刻的镜头沿视线往近处收 MR / 0.966（画面上的位置、大小和原来一样，T 15.35 照样从右上角压进来）；
  //   光盾蓄力那 0.3 秒（T 16.03–16.33）石头在右上方越压越近（画面约 (1752,192) → (1760,215)，越来越大），6.177（T 16.33）起往左下扑向迎上来的光盾，越冲越快（6.177、HIT 两点的速度给定：MV6、MVE），
  //   HIT 中心正好到 MC：石头的前沿贴上推开以后的罩子轮廓上的 MHIT。之前离罩面一直留着空（T 16.6 还隔约 0.54，16.68 约 0.15），不穿进罩子
  const mainU = x => { const tA = 1.9, tD = mm(5.0) - 0.2, uA = 0.72 * Math.pow(1.7 / 3.4, 1.6), vA = (0.84 - uA) / (tD - tA); return x < tA ? 0.72 * Math.pow(seg2(MO(x), 0.2, 3.6), 1.6) : uA + vA * (x - tA); };
  const MOLD = x => V3(18, 19, -70).lerp(IMP, mainU(x));
  // 11/11（fixA）：T 15.42 以后的关键点按画面上的路线排（设计脚本 shstory/fixA/des.py、gen2.py、path_final.json）：T 15.5 从右上角压进来，16.0 整颗在画里（约 (1802,93)），
  //   越压越近、越来越慢（16.1 前后每帧约 4–5 像素，一直在动），16.2 起加速扑向光盾右边沿（0.53 秒里走约 257 像素、变大约 1.58 倍），撞上前一帧每帧约 33 像素
  // 11/11（refine，评审：「15.55–16.3 它贴在右上角几乎不动，上半截和火焰被画面上沿切掉，像卡住了」）：改成从画面右边沿横着压进来（设计脚本 shstory/refine/d/gen4.py、des.py，k3.json）：
  //   T 15.3 前后火光先照亮右边沿，15.57 石头从右边沿（y 约 180）露头，一路往左、稍往下走（每帧 6–15 像素，不停），16.0 整颗在画里，16.2 在约 (1796,212)、上沿离画面上沿约 130 像素，
  //   16.3 起加速扑向光盾右边沿（越来越快，撞上前一帧每帧约 32 像素），HIT 中心正好到 MC。T 14.3 以前的路线和原来一样（4.557 那一点、它的速度不变）
  const MK = [[3.037], [3.293, 18.627, 15.282, -37.931], [3.757, 26.585, 18.762, -31.143], [4.557, 26.851, 20.067, -25.962], [4.917, 14.875, 12.012, -15.753], [5.077, 12.189, 11.223, -13.202], [5.237, 10.026, 10.498, -10.988],
    [5.357, 8.726, 10.033, -9.635], [5.453, 7.880, 9.749, -8.831], [5.533, 7.287, 9.542, -8.262], [5.613, 6.775, 9.334, -7.713], [5.693, 6.336, 9.128, -7.204], [5.773, 5.970, 8.954, -6.785], [5.853, 5.660, 8.775, -6.393],
    [5.933, 5.397, 8.580, -6.006], [6.013, 5.177, 8.377, -5.639], [6.093, 4.990, 8.137, -5.244], [6.173, 4.844, 7.786, -4.743], [6.245, 4.703, 7.376, -4.166], [6.301, 4.576, 6.978, -3.596], [6.349, 4.451, 6.572, -3.009],
    [6.397, 4.300, 6.081, -2.286], [6.433, 4.156, 5.646, -1.611], [6.469, 3.952, 5.129, -0.749], [6.497]];   // 最后一点是 MC
  const mainAt = x => { const n = MK.length - 1, t = j => MK[j][0], Pk = j => j === 0 ? MOLD(t(0)) : j === n ? MC.clone() : V3(MK[j][1], MK[j][2], MK[j][3]); if (x <= t(0)) return MOLD(x); if (x >= t(n)) return MC.clone();
    let k = 0; while (x > t(k + 1)) k++;
    // 4.557 那一点的速度写死成原来的（原来 5.237 那一点还没往近处收时的中心差分）：T 14.3 以前的路线和原来一模一样
    const tg = j => j === 0 ? MOLD(t(0) + 0.01).sub(MOLD(t(0) - 0.01)).multiplyScalar(50) : j === n ? MVE.clone() : j === n - 1 ? MV6.clone() : j === 3 ? V3(-7.88784, 1.31216, 9.32297) : Pk(j + 1).sub(Pk(j - 1)).multiplyScalar(1 / (t(j + 1) - t(j - 1)));
    const h = t(k + 1) - t(k), u = (x - t(k)) / h, u2 = u * u, u3 = u2 * u;
    return Pk(k).multiplyScalar(2 * u3 - 3 * u2 + 1).add(tg(k).multiplyScalar(h * (u3 - 2 * u2 + u))).add(Pk(k + 1).multiplyScalar(-2 * u3 + 3 * u2)).add(tg(k + 1).multiplyScalar(h * (u3 - u2))); };
  const CAM_A = [   // ① 流星 → 韩叔升起 → 甩书成阵（跟着书往上摇）→ 定格名牌（仰拍）→ 撞击时急拉 → 金币雨里升高 → 著书时环绕（1.9 以前是开头两拍的分镜 SHOTS，1.9 切到这里）
    // 3.0 这一帧给定原来的速度（韩叔升起那一段不变）；3.7 往后退、跟着书往上摇（书在半空翻开、法阵展开都在画面里，不贴着画面上沿；韩叔脚底仍在字幕上面）；3.7 给一个往左下飘的速度，退完转去推近名牌时不停顿
    // 11/05（第三轮复查）：插一帧 3.3——书往上飞的那 0.4（T 12.8–13.6）镜头早一点往后退、往上摇，书整本留在画面上沿以下（原来书的上半截被切掉）；韩叔脚底仍在字幕上面。3.0 以前一点不变
    [1.9, [0.35, 2.33, 16.0], [0, 6.6, -10.2], [[0.75, -0.05, -2.9], [0, -0.35, 1.6]]], [3.0, [3.0, 1.9, 8.6], [0, 2.7, -0.6], [[1.2499, 0.039, -4.3332], [0, -0.3328, 5.3332]]], [3.3, [3.8, 2.2, 10.2], [0, 4.4, -0.3]], [3.7, [3.6, 2.6, 9.9], [0, 4.7, -0.6], [[-0.6, -0.3, -0.6], [0, 0, 0]]],
    // 撞上法阵（HIT）以后的欢呼：4.9、6.9 两帧给定原来的速度，5.0 这一帧是原来那条曲线上的点和速度——撞击以前（≤ 5.0）、著书（≥ 6.9）的镜头和原来一模一样；
    // 只改 5.0–6.9：拉远、升高，看点压低（原来看点 5.0、韩叔整个人在画面底部中间、压在「韩叔一人挡下天外流星」底下），韩叔和两边云上的卡通整组在字幕上面；6.5 以后跟着韩叔往下落
    // 11/05（第三轮复查）：插一帧 5.36——撞击后那一下急拉退得更远一点（T 17–18 后排冒出来时，左上 Lambda 的后空翻、S3 的桶口原来被上黑边切掉）；5.9 以后的构图不变
    // 著书（6.9 / 8.1 / 9.55）三帧的看点压低 1.05（速度照旧）：棋盘、韩叔、奖杯整体往上挪约 150 像素，「他把毕生所学」上面那行小字不再压在韩叔腿上和奖杯底座上
    [4.9, [3.0, 1.1, 8.0], [0, 4.4, -0.6], [[-1.4091, 0.5, 3.2277], [0, -0.4545, -0.591]]], [5.0, [2.8239, 1.1883, 8.4546], [0, 4.3935, -0.6856], [[-2.0977, 1.2455, 5.7627], [0, 0.2926, -1.0998]]],
    [5.36, [1.9, 2.5, 13.3], [0, 4.45, -1.2]], [5.9, [-0.4, 5.4, 17.8], [0, 4.1, -1.9]], [6.5, [-2.4, 5.3, 15.4], [0, 3.0, -1.3]],
    [6.9, [-5.0, 5.4, 10.5], [0, 0.35, -0.3], [[0.2271, 0.5, -2.5913], [0, -1.682, 0.7274]]], [8.1, [0, 4.6, 9.6], [0, 0.25, -0.3]], [9.55, [5.0, 5.0, 10.0], [0, 0.15, -0.3]]];   // 1.9 这一帧给定速度：前一段一路往前推，不先往后退
  // 近景先停稳（12.45 停住）让他翻身转过去（12.3–12.62），再拉远：翻身、拉远、换字幕错开，不挤在同一个 0.2 秒里
  // 王座那两帧往后拉、看点压低：金币山整个露在字幕上面（原来金币堆、他的脚都压在「金币堆成了山」底下）。孤零零拉到最高处（13.35）就往下俯冲到挑战者（不再在高处漂 0.6），
  // 气泡②还在的时候镜头已经在往下走；到了挑战者那里不停住，一直慢慢往前推（14.9 → 19.3 推近约 10%、往右绕约 3°），接大标题拉高
  const CPC = [-2.6, 4.1, 11.8], CLC = [-1.4, 1.2, 1.4], CPC2 = CPC.map((v, i) => v + 0.1 * (CLC[i] - v) + (i === 0 ? 0.5 : 0)), CLC2 = [CLC[0], CLC[1] - 0.22, CLC[2]];   // 推近 10%，同时往右绕约 3°（前排三个人和后面的王座有一点视差）；看点跟着压低一点，Damo 的脸不往下掉进字幕里
  const CAM_B = [   // ③ 王座近景 → 拉远成孤零零的全景 → 滑到挑战者 → 慢慢推近
    [10.45, [4.0, 2.6, 9.0], [0.4, 1.3, -0.9]], [12.45, [1.6, 3.1, 9.6], [0.35, 1.3, -0.9]], [13.35, [0.5, 9.8, 16.5], [0, 0.4, -0.6], [[-1.2, 0, 0], [-0.4, 0, 0]]],
    [14.9, CPC, CLC], [19.3, CPC2, CLC2]];
  // 序章拉长以后：A 段（流星 → 韩叔 → 甩书 → 名牌定格 → 撞击 → 欢呼 → 著书）镜头一直跟着书、韩叔、卡通走，路线不变，按脚本进度走（WA：新 → 旧，
  // 折点前后 ±0.1 取滑动平均，镜头速度跟着各段的快慢连续地变，不会一帧突然变速）；B 段（王座 → 孤零零 → 挑战者）关键帧挪到新时间，整段匀匀地走
  const WA = on => { let a = 0; for (let i = 0; i < 8; i++) a += MO(on - 0.1 + 0.2 * (i + 0.5) / 8); return a / 8; };
  const CAM_BN = CAM_B.map(([t, ...r]) => [mm(t), ...r]), VPUSH = [0, 1].map(w => CAM_BN[4][w + 1].map((v, i) => (v - CAM_BN[3][w + 1][i]) / (CAM_BN[4][0] - CAM_BN[3][0])));   // 推近是匀速的：14.9、19.3 两帧给同一个速度
  CAM_BN[3][3] = VPUSH; CAM_BN[4][3] = VPUSH;
  { const v = CAM_BN[1][1].map((x, i) => (x - CAM_BN[0][1][i]) / (CAM_BN[1][0] - CAM_BN[0][0])); CAM_BN[0][3] = CAM_BN[1][3] = [v, [0, 0, 0]]; }   // 王座那段从黑场淡出起就匀速地绕着他慢慢移（原来 12.45 停住，黑化坏笑那两秒是静帧）；最高处（13.35）也不停，横着接着走、转去俯冲

  // on：新时间（0–ML，画面按它 seek）；o = MO(on)：脚本进度（旧时间，下面写死的时刻都按它）。字幕、名牌、头像、气泡、大标题的起止换成新时间（mm()）用 on 算，
  // 淡入淡出、回弹是原来的真实时长；循环、抖动、闪烁用 on；粒子、冲击波、震屏这些从 mm(起点) 按真实时间演（rt()）
  function runMain(on, E) {
    const { V, seg, ease, easeOut, easeBack, top, cell } = E, P = assets(E);
    const o = MO(on), rt = t0 => on - mm(t0), HITn = mm(5.0);   // rt：从旧时刻 t0（换成新时间）起按真实时间过了多久
    const tc = on - (ML - ML0);   // 循环、抖动、闪烁、人物 pose 的真实时间钟：按真实时间走，在最后一段（大骰子 → 一拳，斜率 1）和旧时间重合，那几秒和原来逐帧一样
    CK.An = PRO + on; CK.Ar = PRO0 + on; CK.rm = on; CK.mr = on - (HITn - 5.0);
    // 叠加层：进场 0.25（约 0.31 秒）缓出、退场 0.2（0.25 秒）缓入，每帧变化不超过 0.27，不会一帧冒出来或一帧消失；名牌的不透明度和横向滑入一起走完，不先闪出来再滑
    // （t0、t1 都是新时间）
    const fin = k => 1 - (1 - k) * (1 - k), fout = k => k * k;
    const cap = (k, a, b, t0, t1, small = '', cls = '') => E.show('dc' + k, 'dcap' + (cls ? ' ' + cls : ''), `${small ? `<small>${tp(small)}</small>` : ''}<b>${tp(a)}</b>${b ? `<i>${tp(b)}</i>` : ''}`, fin(seg(on, t0, t0 + 0.25)) * (1 - fout(seg(on, t1 - 0.2, t1))), `translateX(-50%) scale(${(0.86 + 0.14 * easeBack(seg(on, t0, t0 + 0.3))).toFixed(3)})`);
    // 名牌：bd = 名字条右边的小徽章（道具图名），跟着名牌一起滑进来，滑到位前 0.1 起弹一下（缓出 + 回弹、转正）；cmp = 再加一个转一圈的指南针
    const name = (k, n, lines, col, t0, t1, who, bd, cmp) => { const hd = who && P.SP[who] && P.SP[who].head, b = bd && P.PR[bd], c = cmp && P.PR[cmp];
      const e = E.show('nm' + k, 'dname' + (hd ? ' pic' : ''), `${hd ? `<div class="npic" data-who="${who}" style="--c:${col};background-image:url(${hd.src})"></div>` : ''}<div class="nbar" style="--c:${col}"><b>${n}</b></div>${b ? `<i class="nbdg" style="--c:${col};background-image:url(${b.src})"></i>` : ''}${c ? `<i class="nbdg ncmp" style="--c:${col};background-image:url(${c.src})"></i>` : ''}${lines.map(l => `<p>${l}</p>`).join('')}`, fin(seg(on, t0, t0 + 0.25)) * (1 - fout(seg(on, t1 - 0.2, t1))), `translateX(${((1 - easeOut(seg(on, t0, t0 + 0.3))) * -120).toFixed(0)}px)`);
      if (on >= t0 && on <= t1) {
        if (b) { const q = e.querySelector('.nbdg'), kk = seg(on, t0 + 0.1, t0 + 0.44); q.style.opacity = fin(seg(on, t0 + 0.1, t0 + 0.26)).toFixed(3); q.style.transform = `rotate(${(-26 * (1 - easeBack(kk)) + Math.sin((on - t0) * 3.4) * 3 * seg(on, t0 + 0.4, t0 + 0.6)).toFixed(2)}deg) scale(${(0.4 + 0.6 * easeBack(kk)).toFixed(3)})`; }
        if (c) { const q = e.querySelector('.ncmp'), kk = seg(on, t0 + 0.3, t0 + 0.6); q.style.opacity = (fin(seg(on, t0 + 0.3, t0 + 0.46)) * (1 - fout(seg(on, t1 - 0.42, t1 - 0.24)))).toFixed(3);
          q.style.transform = `rotate(${(360 * easeOut(seg(on, t0 + 0.3, t0 + 0.95)) - 360).toFixed(1)}deg) scale(${(0.4 + 0.6 * easeBack(kk)).toFixed(3)})`; } }
      return e; };
    // 表情小头像（叠加层）：圆角方块，白边 + 角色色描边和外发光（和名牌头像一个路数）。t0 起弹出来：0.2 缓出淡入、0.34 从 0.55 回弹放大到 1、带一点转角回正，
    // 停稳以后轻轻浮动；t1 前 0.2 缓入淡出、缩小一点。x、y 是头像中心（舞台像素；可以给函数，到了时间才算，比如按这一帧字幕的宽度）
    // o2：cls 尺寸（'' 150px、'lg' 172px、'sm' 128px），r 弹出来时的起始转角（度），jolt 吓一跳时先抖几下，ph 浮动相位
    const FC = { han: '#e5484d', chong: '#2f7cf6', yuki: '#9b5cf6', damo: '#1f9d55' };
    // 黑化以后的韩叔头像（han_darkhead）：从设定图「黑化形态」裁的戴墨镜头肩图（sprites.han.darkhead），不在 props 里
    // 另有两张同一套裁法的变体：han_darkhead_sad（落寞：嘴角往下撇、去饱和偏冷、头歪一点）、han_darkhead_angry（被挑衅：叠上设定图「生气」那格的怒气符号、脸颊泛红、头往另一边歪）
    const pic = nm => P.PR[nm] || (nm.startsWith('han_darkhead') && P.SP.han && P.SP.han[nm.slice(4)] ? { src: P.SP.han[nm.slice(4)].src, who: 'han' } : null);
    const face = (key, nm, t0, t1, x, y, o2 = {}) => { const p = pic(nm); if (!p || on < t0 || on > t1) return null;   // t0、t1：新时间
      const X = typeof x === 'function' ? x() : x, Y = typeof y === 'function' ? y() : y, ph = o2.ph || 0;
      const a = fin(seg(on, t0, t0 + 0.2)) * (1 - fout(seg(on, t1 - 0.2, t1))), k = seg(on, t0, t0 + 0.34), live = seg(on, t0 + 0.3, t0 + 0.5);
      const s = (0.55 + 0.45 * easeBack(k)) * (1 - 0.18 * fout(seg(on, t1 - 0.2, t1)));
      const r = (o2.r || 0) * (1 - easeBack(k)) + live * Math.sin((on - t0) * 4.2 + ph) * 2.2 + (o2.jolt ? Math.sin((on - t0) * 34) * 8 * (1 - seg(on, t0 + 0.05, t0 + 0.42)) * Math.min(1, k * 3) : 0);
      const dy = live * Math.sin((on - t0) * 3.1 + ph) * 5;
      return E.show('fc' + key, 'oface' + (o2.cls ? ' ' + o2.cls : ''), `<i style="--c:${FC[p.who] || '#ff9900'}"><b style="background-image:url(${p.src})"></b></i>`, a, `translate(${X.toFixed(0)}px,${(Y + dy).toFixed(1)}px) translate(-50%,-50%) rotate(${r.toFixed(2)}deg) scale(${s.toFixed(3)})`); };
    const capL = c => 960 - c.offsetWidth / 2 - 118, capR = c => 960 + c.offsetWidth / 2 + 118;   // 字幕左右两边的头像中心（离字幕框 40px）
    // 设定图人物换动作：S = [[起点, 动作（null = 按镜头角度的四视图）, 朝向, 淡化时长 = 0.1], ...]（按时间排好）。每次换图从起点开始交叉淡化
    // （0.1 约 4 帧；时长写 0 = 直接换，给翻牌压扁到 0 的那一帧用）；k 由时间算，往回拖也一致。换成四视图时淡出的那张保持它自己的朝向
    const frameSeq = (c, S) => { let j = 0; while (j < S.length - 1 && o >= S[j + 1][0]) j++;
      // 不同外形的两张图交叉淡化会叠出重影（两顶王冠、半透明透出棋盘字），所以一律在起点那一帧硬切（起点都对在落地、起跳、受惊那一拍上）；淡化时长那一项留着不用
      const [t0, nm, f] = S[j], pv = S[j - 1], k = 1;
      if (k >= 1) c.frame(nm, f); else c.frame(nm, nm ? f : pv[2], pv[1] === null ? 'view' : pv[1], k); };
    // 震屏的频率按真实时间走；每一次震（流星雨、撞上法阵、闪电、Damo 落地、大标题、一拳）开始那一刻的相位和原来一样（两次之间没在震，换相位看不出来）
    const ts = on - (o < 4.9 ? 0 : o < 9.6 ? mm(5.0) - 5.0 : o < 15 ? mm(11.4) - 11.4 : o < 19.4 ? mm(17.75) - 17.75 : o < 22 ? mm(19.5) - 19.5 : ML - ML0), shakeCam = amp => { if (amp > 0) { E.camera.position.x += Math.sin(ts * 43) * amp * 0.8; E.camera.position.y += Math.cos(ts * 33) * amp * 0.8; } };   // 原来 61 / 47、满幅：每帧最多挪 0.8×幅度，60 帧下一帧一跳；现在约 0.46×幅度
    P.stage.style.background = '#03050c'; if (P.grid) P.grid.visible = false;
    P.sky.visible = P.clouds.visible = true; P.sky.rotation.y = o * 0.01;   // 夜空自转、夜云飘得极慢（0.01 弧度/秒），按脚本进度走：大骰子那段和原来逐帧一样
    // 每帧先把夜空、云海恢复成不透明的原样（19.3 以后的淡出再改），往回跳着 seek 时不会带着上一次的淡出状态
    P.sky.children.forEach(m => { m.material.opacity = 1; if (m.material === P.skyM && m.material.transparent) { m.material.transparent = false; m.material.needsUpdate = true; } }); P.clouds.children.forEach(m => { if (m.userData.o0 != null) m.material.opacity = m.userData.o0; });
    P.clouds.children.forEach(m => { const a = m.userData.a + o * m.userData.v; m.position.x = Math.cos(a) * m.userData.d; m.position.z = Math.sin(a) * m.userData.d * 0.8; });
    E.glow(0.22, 0.2);
    E.show('dvig', 'dvig', '', 1 - ease(seg(o, ML0 - 0.6, ML0)), 'none');
    E.show('dvig2', 'dvig', '', o >= 1.0 && o < 1.25 ? 1 : 0, 'none');   // S6b 俯拍那一刀四角再压暗一层   // 暗角在最后 0.6（0.75 秒）淡掉，正片没有暗角（原来 36.5 那一帧一下子没了）
    // 转折：画面一闪红、天空泛红，镜头一震，流星雨猛地砸下来；危机解除后天色慢慢恢复
    const red = seg(o, 0, 0.25) * (1 - seg(o, 5.2, 6.4));
    P.skyM.color.setRGB(1, 1 - 0.38 * red, 1 - 0.45 * red);
    E.show('imfl', 'oflash hitw', '', 0.9 * (1 - seg(o, 0, 0.07)), 'none');   // 第一颗砸下去：先白热一闪（两帧）
    E.show('redfl', 'oflash redw', '', 0.26 * (1 - seg(o, 0.03, 0.16)), 'none');   // 再一层很淡的红（约 0.15 秒），卡通们的明暗对比留着
    // 镜头（连续的）：A 段 0–9.55，B 段 10.45–19.3；中间是「三年后」黑屏
    if (o < 9.6) { const [p, l] = o < 1.9 ? camOpen(PRO + on, V) : spline(WA(on), CAM_A, V); E.camera.position.copy(p); E.camera.lookAt(l); }   // A 段：路线和原来一样，速度跟着拉长（WA）
    else if (o >= 9.6 && o < 19.3) { const [p, l] = spline(on, CAM_BN, V); E.camera.position.copy(p); E.camera.lookAt(l); }   // B 段：关键帧挪到新时间   // 「三年后」全黑时（9.6 起）就切到 B 段的起点，免得黑场淡出时还能看到镜头一跳
    // 末日（0–2.4）：天色、云海、火星接着开头那一拍算；镜头剧烈震动用画面平移（setViewOffset）+ 一点点滚转——每颗流星砸下来震一下、近的震得狠，底下一直有地震似的抖；
    // 镜头本身的位置、朝向还是那条连续的曲线（每帧 reset 会 clearViewOffset）
    if (o < 2.42) world(PRO0 + o, E, P);
    if (o < 2.45) { let amp = 7 * smo(seg(o, 0.0, 0.08)) * (1 - smo(seg(o, 1.9, 2.4)));
      IMPS.forEach(([ti, x, z, sz]) => { const u = o - ti; if (u >= 0 && u < 0.9) { const d = Math.hypot(x - E.camera.position.x, z - E.camera.position.z); amp += sz * Math.min(1, 26 / d) * 34 * Math.min(1, u / 0.04 + 0.4) * Math.exp(-u * 6.5); } });
      if (amp > 0.05) { const dx = amp * (Math.sin(on * 61.3) * 0.7 + Math.sin(on * 97.1 + 1) * 0.3), dy = amp * (Math.cos(on * 53.7) * 0.7 + Math.sin(on * 83.3 + 2) * 0.3) * 0.8;
        const calm = o > 0.62 && o < 1.25 ? 0.45 : o >= 1.25 && o < 1.9 ? 0.55 : 1;   // 跟着 Lambda 的那个镜头震得轻一点，看得清它；S7 躲好的那一拍也轻一点（画面上下跳得太多，前排会掉进字幕区）
        E.camera.setViewOffset(1920, 1080, dx * calm, dy * calm, 1920, 1080); E.camera.rotateZ(amp * calm * 0.00045 * Math.sin(on * 41.7)); } }
    if (o < 7.3) cast(PRO0 + o, E, P);

    // ---------- ① 天外流星 0–5.6 ----------
    const M0 = V(18, 19, -70), HIT = 5.0;   // 主流星的起点：切回原镜头以后一路都在画面右边（原来在画面上沿外面，看不见），从远处一路压过来砸在法阵上
    if (o < HIT + 0.35) {   // 流星雨跟着撞击的白闪在 HIT+0.05–0.35 淡掉（原来 HIT+0.1 那一帧全部消失）；大流星照旧 HIT+0.1 收掉
      // 主流星的进度按新时间：切回原镜头（1.9）起匀速逼近（越近画面上长得越快，名牌那几秒也一直在压过来，不再悬停），最后 0.2 加速撞上法阵（终点速度和原来最后一冲差不多）
      const tA = 1.9, tD = HITn - 0.2, uA = 0.72 * Math.pow(1.7 / 3.4, 1.6), uD = 0.84, vA = (uD - uA) / (tD - tA), hz = Math.min(1, Math.max(0, (on - tD) / 0.2)), h3 = hz * hz * hz, h2 = hz * hz;
      const u = on < tA ? 0.72 * Math.pow(seg(o, 0.2, 3.6), 1.6) : on < tD ? uA + vA * (on - tA) : uD * (2 * h3 - 3 * h2 + 1) + 0.2 * vA * (h3 - 2 * h2 + hz) + (-2 * h3 + 3 * h2) + 0.2 * 1.3 * (h3 - h2);
      // 末日流星、流星雨、主流星（1.9 以前是开头两拍的分镜，大流星用 S7 里的替身）都在 meteors() 里画成同一套燃烧的石头。
      //   11/10（refine2）：主流星 T 12.4 以后的路线见 MK（先滑出画面、15.35 从右上角压回来）；朝向 2.85 起转到跟着飞的方向（火尾在身后）；撞上光盾那一刻（HITn）0.06 内缩没、0.08 内暗掉，
      //   石头被一团金光盖住、炸成金币（见下面 HIT）
      const vd0 = mainAt(on + 0.01).sub(mainAt(on - 0.01)), vdir = vd0.lengthSq() > 1e-8 ? vd0.normalize() : MDIR.clone();
      // 11/10（迎击）：撞上以后石头被顶在罩子上 0.065（跟着罩面被压进去的那一下往里挪一点），0.065–0.13 在白光里碎掉（原来 0.06 内就缩没）
      meteors(PRO0 + o, E, P, { M0, HIT, mp: dt => mainAt(on + dt).addScaledVector(NH, -SHR * shDent(on + dt - HITn)), big: 1.1 - 0.2 * smo(seg2(on, 5.3, 6.2)), aim: hh => IMP.clone().sub(M0).normalize().lerp(vdir, smo(seg2(on, 2.85, 3.05))).normalize(), rs: 1 - smo(seg2(on - HITn, 0.065, 0.13)), dim: 1 - smo(seg2(on - HITn, 0.07, 0.14)), bt: mm(BHIT), C: bhitP(), V });
    }
    const quake = seg(o, 1.2, 3.0) * (1 - seg(o, 3.0, 3.4)) * 0.6;
    if (o < 5.6) for (let i = 0; i < 48; i++) E.lift(i, Math.abs(Math.sin(on * 23 + i * 1.7)) * 0.06 * quake);
    shakeCam(quake * 0.12 + (rt(HIT) > 0 && rt(HIT) < 0.6 ? 0.25 * (1 - rt(HIT) / 0.6) : 0) + (rt(BHIT) >= 0 && rt(BHIT) < 0.3 ? 0.08 * (1 - rt(BHIT) / 0.3) : 0));   // 书撞上陨石、光爆那一下轻轻一震
    // 韩叔从光柱里升起；捧着规则书 → 往上一甩 → 书撞上落下来的陨石，炸开一团金色光爆（书停在光芒中心）→ 书翻开、光盾从书里展开（11/10 光盾）
    const rise = easeOut(seg(o, 2.4, 3.0));
    // 11/09（refine）：去掉遮幅以后 2.3 那一帧他整个人直接站在棋盘中央（原来只露出头肩、像从下黑边外面升进来）。2.3–2.4 先从棋盘面底下钻出来：
    //   起点低 2.2（他连皇冠高 2.11，整个藏在棋盘面下面，镜头在棋盘上方，被棋盘挡住），二次曲线减速，到 2.4 正好接上原来那段升起（位置 0、速度 13 都对上，不顿一下）；2.4 以后和原来一样
    const emerge = o < 2.4 ? (s => -2.2 + 31 * s - 90 * s * s)(Math.max(0, o - 2.3)) : 0;
    if (o >= 2.3 && o < 6.6) {
      const h = P.han, rbP = BT.clone(); h.g.visible = true; h.g.position.set(0, hanUp(o, rise) + emerge, -0.6); h.g.rotation.y = 0;
      const throwK = seg(o, 3.0, 3.18), up = seg(o, 3.05, 3.3) * (1 - seg(o, 5.6, 6.0)), hold = 1 - throwK;
      // 11/10（refine）：甩书给立牌一个蓄力。11/10（refine2，评审：「立牌的手臂不动、挥的动作读不出来」）：蓄力更明显——2.86–3.03 往书那边（画面左）歪 0.13、往下压到 0.92；
      //   书离手（3.03–3.09）那一下往右上方（书飞去的那边）探身 0.17、往前倾一点、拉长、往上抬 0.12，3.12–3.36 回原样
      const thC = smo(seg2(o, 2.86, 3.03)), thR = smo(seg2(o, 3.03, 3.09)), thB = smo(seg2(o, 3.12, 3.36));
      // 11/10（迎击）：光盾蓄力的时候他跟着往下一沉（压到 0.95），往外推的那一下往上一挺（0.3 内回原样）
      const [pc0, pc1] = shPC(HITn), shC = smo(seg2(on, pc0, pc1)) * (1 - smo(seg2(on, pc1, pc1 + 0.06))), shR = Math.sin(Math.PI * seg2(on, pc1, pc1 + 0.3)) * (on < pc1 + 0.3 ? 1 : 0);
      // 11/11（fixB）：收盾（DSM）——杖尖亮起来的时候他往上一挺（拉长 5%、抬高 0.09），光环推开、光盾淡掉的时候回原样
      const dsT = smo(seg2(on, DSM.s0 - 0.04, DSM.s1)) * (1 - smo(seg2(on, DSM.b1 + 0.05, DSM.f1 + 0.12)));
      h.pose({ t: tc, armL: [0.9 * hold + throwK * 0.4, 0.12 + up * 2.6], armR: [0.9 * hold + throwK * 0.4, 0.12 + up * 2.6], mouth: o > 5.2 ? 'smile' : 'flat', brow: o > 5.2 ? 0 : 0.18, cape: 0.3,
        squash: 0.08 * thC * (1 - thR) - 0.06 * thR * (1 - thB) + 0.05 * shC - 0.04 * shR - 0.08 * dsT, bounce: 0.12 * thR * (1 - thB) + 0.05 * shR + 0.17 * dsT });   // 11/11（refine）：收盾那一挺大一点（拉长 5% → 8%、抬高 0.09 → 0.17）
      if (h.R) { h.R.rotation.z += 0.13 * thC * (1 - thR) - 0.17 * thR * (1 - thB); h.R.rotation.x += 0.1 * thR * (1 - thB); }
      // 11/11（fixA）：光爆以后半拍（T 13.85–14.2），右上角画外主陨石的火光亮起来（mfire），他朝那边一转、往右上歪一下——还有一颗大的在压过来；T 15.0–15.5 回正一半
      // 11/11（refine，评审：「平面立牌转 0.42 弧度只窄了约 9%，看不出他在看」）：改成翻牌换成侧 45° 的立牌（han_q45，脸朝画面右边）——T 13.93 前后 0.15 秒压扁、换图、展开，
      //   15.08 同样翻回正面（主陨石 15.57 入画以前）；往右上歪一下照旧（回正跟着 15.0–15.5），不再绕竖轴转
      { const lk = smo(seg2(on, LKT[0], LKT[1])) * (1 - smo(seg2(on, LKT[2], LKT[3])));
        if (h.R && lk > 0) h.R.rotation.z -= 0.1 * lk;
        if (h.frame) { const FQ = [TNo(13.93), TNo(15.08)], fw = 0.06; h.sx = Math.abs(Math.cos(Math.PI * seg2(on, FQ[0] - fw, FQ[0] + fw))) * Math.abs(Math.cos(Math.PI * seg2(on, FQ[1] - fw, FQ[1] + fw)));
          h.frame(on >= FQ[0] && on < FQ[1] ? 'q45' : null, 1); }
        const mf = smo(seg2(on, LKT[4], LKT[5])) * (1 - smo(seg2(on, LKT[6], LKT[7])));
        if (mf > 0.002) E.show('mfire', 'oflash mfire', '', Math.min(1, mf * (0.9 + 0.1 * Math.sin(tc * 23) * Math.sin(tc * 7.1))), 'none'); }
      // 光爆照着他（pu：从书撞上陨石起按真实时间；bLit：跟着光芒在 0.05–0.25 亮起（对着 shimmer、chime 两声），0.45–1.4 退到一半多，1.4–2.35 淡完）：
      //   身后偏光爆那边一团金光，立牌外面一圈金色轮廓光、亮在光爆那一边（侧逆光）；立牌自己的自发光不提
      const pu = rt(BHIT), bLit = pu > 0 ? smo(seg2(pu, 0.02, 0.25)) * (1 - 0.45 * smo(seg(pu, 0.45, 1.4))) * (1 - smo(seg(pu, 1.4, 2.35))) : 0;
      if (P.hanRim && bLit > 0.002) { P.hanRim.visible = true; P.hanRim.material.uniforms.op.value = 0.9 * bLit;
        const a2 = bhitP().clone().project(E.camera), b2 = h.g.position.clone().add(V(0, 1.2, 0)).project(E.camera); P.hanRim.material.uniforms.dir.value.set((a2.x - b2.x) * 16, (a2.y - b2.y) * 9).normalize(); }
      // 光柱：11/10（光盾）光爆那一下跟着暗下去（0–0.3 压到三成，光源让给右上方的光爆），光盾一展开就淡完（3.55–3.95）：之后主光是光盾和晨光
      const pk = 0.42 * seg(o, 2.3, 2.6) * (1 - 0.72 * smo(seg2(pu, 0, 0.3))) * (1 - smo(seg2(o, 3.55, 3.95)));
      P.pillar.visible = pk > 0.001; P.pillar.position.set(0, -0.04, -0.6); P.pillar.scale.set(0.3 + easeOut(seg(o, 2.3, 2.7)) * 0.7, 1, 0.3 + easeOut(seg(o, 2.3, 2.7)) * 0.7);
      { const u = P.pillar.children[0].material.uniforms; u.op.value = pk; u.tm.value = tc; }
      // ---------- 主角规则书（P.RB）：11/10（光盾）——用户：书「像扛着一块红木板」「变成一个白盒子」「又变成竖着打开的书」，前后三个样子 ----------
      //   从他手里到天上一直是同一本红色烫金硬皮书（封面「规则书」朝着镜头）：右手（画面左边）拎在腰边 → 2.86–3.04 往左下方一收（蓄力）→ 3.05 甩出去。
      //   11/10（refine2，评审：「书在 2 帧里从他胸腹前横扫过去」）：改成过肩一甩——三次贝塞尔，先顺着他身子左边（立牌外面）往上抡、过左肩、从皇冠上方划过去，再往右上方飞到 BT，
      //   不挡躯干、不从脸前过；一路在画面里转一整圈、中间侧过来露出书脊和书口，后面拖一小段羽化的金色拖尾、撒几颗小火星。
      //   越飞越大（魔法书）、越飞越慢，快到 BT 时封面转去迎着扑下来的陨石（rbRef().Nf）→ BHIT 陨石砸在封面上：书被撞得往后一顿、歪一下、挡住了它（石头碎开，见 meteors()）→
      //   0.03–0.26 封面「啪」地翻开、书页亮起来，书转正对着镜头 → 3.55 起光盾从书里展开，书一边升到泡顶偏右（BT2）。主陨石撞上光盾（HIT）以后书合上、飞回他手里
      const cq = E.camera.quaternion, exC = V(1, 0, 0).applyQuaternion(cq), eyC = V(0, 1, 0).applyQuaternion(cq), ezC = V(0, 0, 1).applyQuaternion(cq), RR = rbRef();
      const rbFeet = oo => V(0, hanUp(oo, easeOut(seg(oo, 2.4, 3.0))) + (oo < 2.4 ? (s => -2.2 + 31 * s - 90 * s * s)(Math.max(0, oo - 2.3)) : 0), -0.6);
      const rbPos = (oo, out = V(0, 0, 0)) => { const f = rbFeet(oo), wu = smo(seg2(oo, 2.86, 3.04)), s = rbS(oo);
        const p0 = f.clone().addScaledVector(exC, -0.52 - 0.3 * wu).add(V(0, 0.98 - 0.34 * wu + 0.03 * Math.sin(oo * 5.1) * (1 - wu), 0)).addScaledVector(ezC, 0.42 - 0.1 * wu);
        if (s <= 0) return out.copy(p0); const r = 1 - s;
        const c1 = f.clone().addScaledVector(exC, -1.4).add(V(0, 2.1, 0)).addScaledVector(ezC, 0.3), c2 = f.clone().addScaledVector(exC, -0.2).add(V(0, 3.9, 0)).addScaledVector(ezC, 0.22);
        return out.copy(p0).multiplyScalar(r * r * r).addScaledVector(c1, 3 * r * r * s).addScaledVector(c2, 3 * r * s * s).addScaledVector(BT, s * s * s); };
      // 11/11（fixA，用户：「书碰到了陨石，不应该当场出防护罩，也不应该往回返」）：书撞上陨石、翻开以后不再升到泡顶、也不飞回他手里——
      //   在光爆里化成光（dz：BHIT 后 0.2–0.52 新时间，T 13.58–13.98：一边缩小、一边书页和外面那团光亮成一团白金光，缩没的那一刻光也退完），光盾就从这一团光里长出来（见下面 SHIELD）。
      //   之后他手里不再拿书；著书那段（6.3–6.52）在他胸前只亮一团光（原来是这本书送到那里），那本书照原样从那里长出来
      const RB = P.RB, s = rbS(o), rbOut = smo(seg2(o, 6.3, 6.52)), dz = pu > 0 ? smo(seg2(pu, BDZ[0], BDZ[1])) : 0;
      if (pu <= 0 || dz < 0.999) {
        RB.visible = true; P.RBi.visible = true; const bp = rbPos(o), rec = pu > 0 ? Math.sin(Math.PI * seg2(pu, 0, 0.32)) * (1 - seg2(pu, 0, 0.32) * 0.4) : 0;
        if (pu > 0) bp.addScaledVector(BMD, 0.34 * rec);   // 被撞得往后一顿（0.32 内回到 BT），就在那里化掉
        RB.position.copy(bp); rbP.copy(bp);
        const sc = (1 + 0.75 * smo(s)) * (1 - 0.88 * dz - 0.1 * dz * dz); RB.scale.setScalar(Math.max(0.001, sc));   // 11/11（refine）：化掉的最后缩到一个点（原来停在 0.12 倍）
        // 11/11（refine）：化掉的后半段书前面盖一层暖白柔光（书边、封面的细框也化进光里，不再剩一个 L 形细框），缩没以前淡掉
        if (dz > 0.002) { const vk = smo(seg2(dz, 0.08, 0.45)) * (1 - smo(seg2(dz, 0.82, 1))); if (vk > 0.002) { const Vv = P.rbVeil; Vv.visible = true; Vv.position.copy(bp).addScaledVector(E.camera.position.clone().sub(bp).normalize(), 0.4);
          Vv.scale.setScalar(1.5 + 0.9 * sc); Vv.material.opacity = 0.97 * vk; } }
        // 朝向：封面法线 N（局部 +z）、书的「上」U。飞的时候 N 从朝镜头慢慢转到迎着陨石（Nf），U 绕 N 转一整圈（画面里顺时针），中间绕书脊方向侧过来一点（露出书脊、书口的厚度）
        const fk = smo(seg2(s, 0.5, 1)), N = ezC.clone().lerp(RR.Nf, fk).normalize(), th = 0.2 * smo(seg2(o, 2.86, 3.04)) * (1 - s) - 0.12 * (1 - s) - Math.PI * 2 * smo(s);
        const U = eyC.clone().applyAxisAngle(N, th).lerp(V(0, 1, 0), fk).normalize(), q = rbBasis(N, U).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), 0.2 * (1 - s) + 0.55 * Math.sin(Math.PI * s)));
        if (pu > 0) q.copy(RR.qf).slerp(RR.qo, smo(seg2(pu, 0.04, 0.3))).multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -0.32 * rec));   // 撞上以后先被打得往后仰一下，再转正到「翻开、书页朝着镜头稍微朝上」
        RB.quaternion.copy(q);
        const op = easeOut(seg2(pu, 0.03, 0.26));   // 撞上以后翻开（之后在光里化掉，不再合上）
        P.RBcov.rotation.y = -2.75 * op; P.RBi.position.x = 0.25 * op; P.RBL.scale.z = 0.02 + 0.98 * op;   // 翻开以后书脊挪到中间，左边那叠书页长出厚度
        const tw = 0.85 + 0.15 * Math.sin(tc * 7.3), glo = op * (0.75 + 0.5 * (1 - smo(seg2(pu, 0.25, 1.2))));
        P.RBpage.emissiveIntensity = P.RBpageL.emissiveIntensity = 0.35 + 0.75 * glo * tw + 1.6 * dz;   // 书页自己发光（化掉的时候越来越亮）
        // 翻开的时候两页轻轻翻动（1.6 秒一轮、0.6 翻过去，两页错开半轮）：只在翻起来以后显示（贴着书页的那一刻和下面那页一模一样，看不出出现、消失）
        P.RBF.forEach((f, k) => { const ph = ((tc / 1.6 + k * 0.5) % 1 + 1) % 1, u = seg2(ph, 0.1, 0.48), a = 2.66 * (u * u * (3 - 2 * u)); f.visible = op > 0.98 && a > 0.04 && a < 2.62; f.rotation.y = -a; });
        P.RBlit.material.opacity = Math.min(1, glo * tw + 0.6 * dz); P.RBlit2.material.opacity = Math.min(1, glo * tw * 0.85 + 0.5 * dz);
        // 外面那团光：化掉的时候亮起来、变大（画面上从一本书那么大涨到约 2.4 倍），缩没的那一刻退完
        P.RBglow.material.opacity = Math.min(1, (0.18 + 0.12 * smo(s) + 0.5 * op * tw) * (1 - dz) + 0.85 * Math.sin(Math.PI * dz)); P.RBglow.scale.setScalar((1 + 0.75 * smo(s)) * (0.9 + 0.9 * op) * (1 + 1.4 * Math.sin(Math.PI * 0.5 * Math.min(1, dz * 1.4))) / Math.max(0.12, sc));
        // 拖尾：最近 0.07（脚本时间）走过的路线，头宽尾细、两边羽化（featherTex），叠加的金色；出手那 0.1 带子宽一些（挥出去的弧形残影）；书刚离手、走过的路还很短时带子跟着收窄（不然一堆点挤在一处，张成一把白扇子）；书停下来以后自己缩没
        const tr = P.rbTrail, TN = 32, pa = tr.geometry.attributes.position.array, ca = tr.geometry.attributes.color.array;
        const tk = s > 0 && s < 1 ? smo(seg2(o, 3.05, 3.075)) * (1 - smo(seg2(o, 3.28, 3.44))) : 0, smear = 1 - smo(seg2(o, 3.07, 3.16)); tr.visible = tk > 0.002;
        if (tr.visible) { const pts = []; for (let i = 0; i < TN; i++) pts.push(rbPos(Math.max(3.05, o - 0.07 * (1 - i / (TN - 1))))); let pl = 0; for (let i = 1; i < TN; i++) pl += pts[i].distanceTo(pts[i - 1]); const wl = smo(Math.min(1, pl / 0.9));
          for (let i = 0; i < TN; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(TN - 1, i + 1)], tg = b.clone().sub(a); if (tg.lengthSq() < 1e-10) tg.copy(exC);
            const sd = tg.cross(ezC).normalize(), k = i / (TN - 1), w = 0.16 * wl * (0.2 + 0.8 * k) * (1 + 0.5 * smo(s)) * (1 + 0.6 * smear), al = Math.pow(k, 1.2) * tk * wl * 0.85;
            pts[i].clone().addScaledVector(sd, w).toArray(pa, i * 6); pts[i].clone().addScaledVector(sd, -w).toArray(pa, i * 6 + 3);
            [1, 0.52, 0.13, 1, 0.52, 0.13].forEach((c, j) => { ca[i * 6 + j] = c * al; }); }
          tr.geometry.attributes.position.needsUpdate = tr.geometry.attributes.color.needsUpdate = true; }
        // 拖尾上的小火星：3.07 起每隔 0.035 从书走过的地方冒一颗，往外飘一点、往下坠，0.16 内一闪就灭
        P.rbSpk.forEach((m, j) => { const te = 3.07 + j * 0.035, u = (o - te) / 0.16; if (u <= 0 || u >= 1) return; const p0 = rbPos(te), a = j * 2.4 + 0.7;
          m.visible = true; m.position.copy(p0).addScaledVector(exC, Math.cos(a) * 0.35 * u).addScaledVector(eyC, Math.sin(a) * 0.35 * u - 0.25 * u * u); m.scale.setScalar(0.2 * (1 - 0.6 * u) * (0.8 + 0.2 * Math.sin(tc * 40 + j)));
          m.material.opacity = Math.pow(1 - u, 1.4) * Math.min(1, u * 6); });
      }
      // 11/11（refine）：书缩没那一刻（BDZ[1] 前后）在那里闪一颗星，再消失——书化成了光，光盾就从这团光里长出来
      if (pu > BDZ[1] - 0.09 && pu < BDZ[1] + 0.13) { const k = Math.sin(Math.PI * seg2(pu, BDZ[1] - 0.09, BDZ[1] + 0.13)), St = P.rbStar; if (k > 0.002) { St.visible = true; St.position.copy(BT).addScaledVector(E.camera.position.clone().sub(BT).normalize(), 0.45);
        St.scale.setScalar(0.3 + 1.25 * k); St.material.opacity = Math.min(1, 1.1 * k); St.material.rotation = 0.5 + pu * 2.2; } }
      if (!(pu <= 0 || dz < 0.999) && rbOut > 0 && rbOut < 0.999) {   // 著书：他胸前亮一团光（和原来书送到这里时那团光一样大、一样亮，只是没有书），原来那本书在这里长出来
        RB.visible = true; P.RBi.visible = false; RB.position.set(0, 0.82 + rbFeet(o).y, 0.22); RB.scale.setScalar(Math.max(0.001, 1 - rbOut));
        P.RBglow.material.opacity = Math.min(1, 0.51 * Math.sin(Math.PI * rbOut)); P.RBglow.scale.setScalar((0.9 + 1.6 * Math.sin(Math.PI * rbOut)) / Math.max(0.3, 1 - rbOut));
      }
      // 光爆（从撞上那一刻起按真实时间 pu）：11/10（光盾）：光芒、冲击波、天光都收在书周围约 300 像素以内；画面上 1 个单位约 145 像素（镜头离它约 11.5）。
      //   11/10（refine2，评审：「光从书后面中间透出来，不在被撞的那一侧」）：光的中心 C 一开始在石头砸中的那一点（封面右上角那一带，rbRef().hit），0.15–0.7 里跟到书上（书翻开、升到 BT2）。
      //   撞上那一下：贴着被砸的那条边迸出一道火花线（横在来的方向上），一小团白热核，画面在撞击点周围轻轻白一下；冲击波推开以后（0.09–0.23）光芒才升到最亮，
      //   对着 shimmer（pu 0.16，光盾这时从书里展开）和 chime（pu 0.24）——「叮——光开了」
      if (pu >= 0 && pu < 2.4) { const B = P.bx, C = RR.hit.clone().lerp(rbP, smo(seg2(pu, 0.15, 0.7))), cq = E.camera.quaternion, cp = E.camera.position, toC = C.clone().sub(cp), dC = toC.length(); toC.normalize();
        const ex = V(1, 0, 0).applyQuaternion(cq), ey = V(0, 1, 0).applyQuaternion(cq), fwd = V(0, 0, -1).applyQuaternion(cq);
        // 大平面：放在书后面 1.2（按远近放大，画面上大小不变）
        const kz = (dC + 1.2) / dC; B.ray.visible = true; B.ray.position.copy(C).addScaledVector(toC, 1.2); B.ray.quaternion.copy(cq); B.ray.scale.setScalar(11 * kz);
        const U = B.ray.material.uniforms, tail = 1 - smo(seg(pu, 0.85, 1.8)), lit = smo(seg2(pu, 0.09, 0.23)); U.tm.value = 0.6 + pu * 0.2; U.tw.value = pu; U.reach.value = 0.5 + 1.4 * easeOut(seg2(pu, 0, 0.26));
        U.rays.value = (0.38 + 0.62 * lit) * smo(Math.min(1, pu / 0.05)) * (1 - 0.5 * smo(seg(pu, 0.5, 1.3))) * tail;
        U.core.value = (0.5 * Math.pow(1 - seg2(pu, 0, 0.3), 2) + 0.5 * lit * (1 - 0.55 * smo(seg(pu, 0.35, 1.2)))) * tail;
        U.sky.value = (0.08 + 0.24 * lit * (1 - 0.5 * smo(seg(pu, 0.4, 1.2)))) * Math.min(1, pu / 0.04) * tail;
        // 冲击波：两圈软的光雾（着色器里是宽、虚边、沿一圈忽明忽暗的一圈），0.3 内从中心推出去、越推越淡
        [[0, 0.26, 1.9, 0.2], [0.07, 0.3, 2.15, 0.05]].forEach(([t0, du, R, a0], j) => { const u = seg2(pu, t0, t0 + du); U.rg.value[j].set(0.4 + R * (1 - Math.pow(1 - u, 1.5)), 0.12 + 0.3 * u, u > 0 && u < 1 ? a0 * Math.pow(1 - u, 1.6) * Math.min(1, u / 0.05) : 0); });
        { const k = Math.pow(1 - seg2(pu, 0, 0.22), 2) + 0.55 * lit * (1 - smo(seg(pu, 0.3, 1.0))); if (k > 0.003) { B.core.visible = true; B.core.position.copy(C).addScaledVector(toC, 0.35); B.core.scale.setScalar(3.2 * (0.7 + 0.3 * easeOut(Math.min(1, pu / 0.05)))); B.core.material.opacity = Math.min(1, k) * tail; } }
        // 火花线：贴着被砸的那条边（石头和封面之间、离镜头近一点），横在石头来的方向上；0.2 内退掉。原来一横一竖两道光芒（十字星）不要了
        if (pu < 0.2) { const hp = RR.hit.clone().addScaledVector(toC, -0.3), a1 = hp.clone().project(E.camera), a2 = hp.clone().add(BMD).project(E.camera), k = Math.pow(1 - pu / 0.2, 1.5);
          B.sH.visible = true; B.sH.position.copy(hp); B.sH.scale.set(2.3 * (0.75 + 0.25 * easeOut(Math.min(1, pu / 0.06))), 0.2, 1); B.sH.material.rotation = Math.atan2((a2.y - a1.y) * 9, (a2.x - a1.x) * 16) + Math.PI / 2; B.sH.material.opacity = 0.95 * k; }
        if (pu < 0.2) { const sc = RR.hit.clone().project(E.camera); E.show('bhfl', 'oflash bhw', '', 0.22 * Math.pow(1 - pu / 0.2, 2), `translate(${((sc.x * 0.5) * 1920).toFixed(0)}px,${((-sc.y * 0.5) * 1080).toFixed(0)}px)`); }
        // 陨石碎成几枚金币：11/10（refine2，评审：「金币排成一个整圆，像法阵」）：只放 10 枚，从撞击点往回弹（朝石头来的右上方、往上、往右，画面上 −30°–125° 的扇面里随机），
        //   远近、快慢各不一样，带阻尼、往下坠、翻着转；画在书和光芒前面（离镜头近 0.3），不藏在书后；其中 3 枚飞到头时星光一闪、缩没，别的一路飞出画面或慢慢淡掉
        const C0 = RR.hit.clone().addScaledVector(toC, -0.3);
        for (let k = 0; k < 10; k++) { const t = pu - 0.02; if (t <= 0) break; const cn = B.coins[k], gn = B.glints[k], r1 = (Math.sin(k * 12.9898 + 4.1) * 43758.5453) % 1, r2 = (Math.sin(k * 78.233 + 1.7) * 43758.5453) % 1;
          const a = (-30 + 155 * Math.abs(r1)) * Math.PI / 180, v = 4.2 + 5 * Math.abs(r2), dmp = 1.0 + 0.6 * Math.abs(r1), d = v / dmp * (1 - Math.exp(-dmp * t)), life = 1.0 + 0.5 * Math.abs(r2), sh = 1 - smo(seg2(t, life, life + 0.25)); if (sh <= 0.001) continue;
          const p = C0.clone().addScaledVector(ex, Math.cos(a) * d).addScaledVector(ey, Math.sin(a) * d).addScaledVector(toC, -0.15 * Math.abs(r2) * d); p.y -= 0.55 * t * t;
          const sz = 0.3 * (0.75 + 0.5 * Math.abs(r2)) * (0.4 + 0.6 * easeOut(Math.min(1, t / 0.1))) * sh, fl = Math.abs(Math.cos(k * 2.39 + t * (8 + 3 * Math.sin(k))));
          cn.visible = true; cn.position.copy(p); cn.scale.set(sz * Math.max(0.16, fl), sz, 1); cn.material.opacity = Math.min(1, t / 0.04);
          if (k % 3 === 0) { const fls = Math.sin(Math.PI * seg2(t, life - 0.06, life + 0.2)); gn.visible = fls > 0.01; gn.position.copy(p).addScaledVector(toC, -0.05); gn.scale.setScalar(0.5 * fls + 0.05); gn.material.opacity = Math.min(1, fls); gn.material.rotation = t * 1.5 + k; } }
        // 韩叔侧逆光：他身后偏右上（光爆那一侧）亮起一团金光（放在他后面 0.45，他自己挡住中间），立牌外面一圈金色轮廓光、亮在光来的那一边（见上），光柱跟着亮
        B.halo.visible = bLit > 0.002; B.halo.position.copy(h.g.position).add(V(0, 1.2, 0)).addScaledVector(ex, 0.55).addScaledVector(ey, 0.35).addScaledVector(fwd, 0.45); B.halo.scale.setScalar(3.4); B.halo.material.opacity = 0.55 * bLit; }
      // ---------- 光盾（P.shield）：11/10（光盾）替掉原来的金色法阵；11/10（refine2）近景是一个泡、撞上以后撑大成穹顶（见 SB1 / SB2） ----------
      //   3.55（shimmer）起从翻开的书里吹出来：泡以书为中心从 0.06 倍长到 SB1（像吹泡泡，3.97 长满，T 14.2），同时从书那一点往外「亮开」（grow，前沿一圈亮、带出淡淡的蜂窝格）；
      //   展开那 1 秒多亮一点，然后退回淡淡的、但边缘一圈亮边、高光带、流过的淡蜂窝格、漂着的小光点都看得见（cv）。主陨石快撞上时（HIT 前 0.38）撞击点那块先被压亮、往里凹（pre、dent）；
      //   HIT：撞击点亮起来、现出六边形蜂窝格、三道波纹往外荡开（hitT），整面轻轻亮一下（flash）；随后 HIT+0.06–1.2 从 SB1 撑大成 SB2（罩住冒出来的卡通们）；
      //   11/10（打开）：原来 6.0–6.4（卡通们挥手、蹦走）直接淡掉。11/11（shfade）：韩叔收盾时整面一起淡掉（SHF：lf 轻轻亮一下、fdk 亮边和纹路先退、fo 整体降到 0），淡完就不画了
      // 11/11（fixA，用户：「当场出防护罩……然后出爆炸的那种特效，然后出那个保护罩，然后保护罩不断的去放大，然后再去抵挡另外一个陨石」）：
      //   撞上那一刻（BHIT）只有光爆，没有光盾；BHIT 后 SHG.t0（T 13.5，对着 shimmer）光盾才从书那一点（BT，书正在光里化掉）长出来，一直长大：
      //   shG 先快后慢（T 14.35 罩住他，约 0.87 倍 SB1），之后一直慢慢长（不停、不缩），HIT 那一刻正好长到 SB1；泡心从 BT 跟着长大挪到 SB1.c。HIT 以后照原来的样子从 SB1 撑成 SB2
      { const sc = shG(pu, HITn - mm(BHIT)), S = P.shield;
        S.visible = pu >= SHG.t0 && on < SHF.f1;
        if (S.visible) { const M = S.children[0], U = M.material.uniforms, ek = shEk(on), L = (x, y) => x + (y - x) * ek,   // 11/11（fixB）：HIT+0.06–1.2 → SHE（T 17.65 撑满，收掉以前罩住整个棋盘）
            c = SB1.c.clone().lerp(SB2.c, ek), Aa = L(SB1.a, SB2.a);
          S.position.copy(BT).addScaledVector(c.clone().sub(BT), sc); S.scale.setScalar(sc); M.scale.set(Aa, L(SB1.b, SB2.b), Aa);
          // 11/10（迎击）：原来 HIT 前 0.38 撞击点那块先被压亮、往里凹；改成往外推迎上去（shPush），快碰上的最后 0.2 撞击点那块先亮起来，撞上以后才被压进去一点（shDent）。
          //   HIT 以后鼓出来的那块跟着撑大（ek）在 ek 0–0.6 里收平（每一点都一直往外走，不往回缩），之后和原来一样从 SB1 撑成 SB2
          const ht = o >= HIT ? on - HITn : -1, pr = smo(seg2(on, HITn - 0.2, HITn)) * (1 - smo(seg2(on - HITn, 0, 0.14))), [pc0, pc1] = shPC(HITn);
          const [pA, pB] = on < HITn ? shPush(on, HITn) : [SHP.A, SHP.B], fl = 1 - smo(seg2(ek, 0, 0.6)), fdk = smo(seg2(on, SHF.d0, SHF.d1));   // fdk：11/11（shfade）收盾时亮边、纹路先退
          U.cut.value = L(SB1.cut, SB2.cut); U.cutW.value = L(SB1.w, SB2.w); U.cv.value = smo(seg2(pu, 0.35, 1.0)) * (1 - 0.6 * ek) * (1 - fdk); U.pre.value = pr; U.dent.value = shDent(on - HITn);
          U.pA.value = pA * fl; U.pB.value = pB * fl; U.pK.value = smo(seg2(on, pc1 - 0.03, pc1 + 0.05)) * (1 - smo(seg2(on - HITn, 0.02, 0.4)));
          U.chg.value = smo(seg2(on, pc0, pc1)) * (1 - smo(seg2(on, pc1, pc1 + 0.12))); U.pF.value = on < pc1 ? 1 - 0.65 * smo(seg2(on, pc0, pc1)) : 0.35 + 0.67 * shE(Math.min(1, (on - pc1) / (HITn - pc1)));
          const gb = Math.sin(Math.PI * seg2(on, GLB[0], GLB[1])), lf = on > SHF.l0 ? Math.pow(Math.sin(Math.PI * seg2(on, SHF.l0, SHF.l1)), 2) : 0, fo = 1 - smo(seg2(on, SHF.f0, SHF.f1));   // 11/11（fixB）：挡住以后亮一拍（gb）；11/11（shfade）：收盾时整面轻轻亮一下（lf）、整体淡掉（fo）
          U.op.value = smo(seg2(pu, SHG.t0, SHG.t0 + 0.12)) * (0.7 + 0.2 * smo(seg2(pu, 0.62, 0.82)) + 0.35 * smo(seg2(pu, 0.62, 0.82)) * (1 - smo(seg2(pu, 0.82, 1.6)))) * (1 + 0.3 * gb) * (1 + 0.22 * lf) * fo; U.grow.value = 3.4; U.org.value.copy(SHO);
          // op：长过他脸的那几帧淡一点（0.7），罩住他以后亮一拍（1.25），再退到 0.9；grow 3.4：整个泡一出来就是完整的（不再从书那一侧一点点亮开）。
          //   11/11（refine）：长得慢了，泡边扫过他脸挪到 pu 约 0.4–0.6（T 13.85–14.05），亮一拍挪到 0.62–0.82（T 14.1–14.35，整个人罩进去那一刻）
          U.tm.value = tc; U.hitT.value = ht; U.hitP.value.copy(SHH); U.flash.value = (ht >= 0 ? Math.pow(Math.max(0, 1 - ht / 0.45), 1.5) : 0) + 0.3 * gb + 0.22 * lf;
          // 11/11（refine）：刚长出来那一下偏金白、带纹（bn：pu 0.4–0.68 退掉，T 13.9–14.25）；名牌在的时候（mm(3.9) 到 mm(4.95)+0.25，和 name(1) 一样淡进淡出）名牌那一块压暗
          U.bn.value = 1 - smo(seg2(pu, 0.4, 0.68)); { const t0 = mm(3.9), t1 = mm(4.95, false) + 0.25; U.nmK.value = on > t0 && on < t1 ? fin(seg(on, t0, t0 + 0.25)) * (1 - fout(seg(on, t1 - 0.2, t1))) : 0; }
          if (U.nmK.value > 0) { U.nmR.value.set(60, 318, 616, 584); E.renderer.getDrawingBufferSize(U.rs.value); }
          // 11/11（shfade）：收盾时边缘的亮边、流过的蜂窝纹、高光带、漂着的小光点先退（fdk）：纹路那几样跟着 cv 退掉（见上）；亮边借名牌压暗那一段（只压视线擦着罩面的那一圈）——
          //   nmR 设成整个画面（四边往外多留 400），nmK 跟着 fdk 到 1（亮边压到四成）。着色器的代码没改、只改了注释（改代码会让编译出来的舍入差一点，前面的画面就不是逐像素一样了）
          if (fdk > 0) { U.nmK.value = fdk; U.nmR.value.set(-400, -400, 2320, 1480); E.renderer.getDrawingBufferSize(U.rs.value); } } }
      // ---------- 收盾（DSM，11/11 fixB）：韩叔权杖顶端亮起一颗星光（T 17.26–17.40），杖尖亮满那一下推开两圈金光环，光盾跟着整面淡掉（SHF）；T 17.625–17.95 杖尖的光淡掉 ----------
      //   11/11（shfade）：从杖尖往上打到穹顶最高点的那道细光（光头、拖尾）拿掉——用户觉得是头顶那一点出事
      if (on > DSM.s0 - 0.01 && on < DSM.f1) { const cam = E.camera, Dm = P.dsm, tip = hanTip(h, cam, P);
        const sk = smo(seg2(on, DSM.s0, DSM.s1)), gone = smo(seg2(on, DSM.b1 + 0.02, DSM.f1)), tw = 0.88 + 0.12 * Math.sin(tc * 31) * Math.sin(tc * 13.7);
        const ta = sk * (1 - gone), fl2 = Math.sin(Math.PI * seg2(on, DSM.s1 - 0.03, DSM.s1 + 0.1)), tp2 = tip.clone().addScaledVector(cam.position.clone().sub(tip).normalize(), 0.25);
        if (ta > 0.002) { Dm.core.visible = true; Dm.core.position.copy(tp2); Dm.core.scale.setScalar(0.6 + 0.5 * sk + 0.6 * fl2); Dm.core.material.opacity = 0.8 * ta;
          Dm.star.visible = true; Dm.star.position.copy(tp2); Dm.star.scale.setScalar((0.45 + 0.75 * sk + 0.75 * fl2) * tw); Dm.star.material.opacity = 0.95 * ta; Dm.star.material.rotation = 0.3 + 1.2 * seg2(on, DSM.s0, DSM.f1); }
        // 11/11（refine）：杖尖亮满那一下（DSM.s1）从杖尖往外推开两圈金光环（第二圈晚一点、更大更淡）：他在放力气。
        //   11/11（shfade）：推得慢一点、远一点（0.15 → 约 0.47 秒，T 17.38–17.85 / 17.46–17.94），光盾就在这时候整面淡掉，看得出是他收的
        //   11/11（shfade/refine，评审：「光环和罩子在画面上没有接上」「第一圈从韩叔右脸和头发上扫过去」）：两圈都放在他立牌后面 0.3（tpB，按深度测，被他自己挡住）。
        //   第一圈小一点、从 0.8 起推（淡入），只在他身边；第二圈（DSM.w0–w1）从杖尖推成和穹顶轮廓一样的扁圆（画面上横 1140、竖 480 像素，圆心往左挪约 60 像素对准穹顶），
        //   越推越慢、约 T 17.72 贴到罩边，那时还有约 0.17 的亮度，光盾在那一刻整面轻轻亮一下（SHF.l 的峰值）、随后化掉；下半圈淡（ring2Tex），不从字幕后面穿过
        const cR = V(1, 0, 0).applyQuaternion(cam.quaternion), tpB = tip.clone().addScaledVector(cam.position.clone().sub(tip).normalize(), -0.3), pxw = 0.43 * 109;   // pxw：第二圈贴图亮带（半径 0.86）在他这个深度上每单位缩放多少像素
        { const m = Dm.ring, rk = seg2(on, DSM.s1 - 0.02, DSM.s1 + 0.3); if (rk > 0 && rk < 1) { m.visible = true; m.position.copy(tpB); m.scale.setScalar(0.8 + 4.6 * easeOut(rk));
          m.material.opacity = 0.7 * smo(seg2(rk, 0, 0.16)) * Math.pow(1 - rk, 1.7); m.material.rotation = 0; } }
        { const m = Dm.ring2, rk = seg2(on, DSM.w0, DSM.w1); if (rk > 0 && rk < 1) { const e = easeOut(rk), Bp = 70 + 410 * e, Ap = Bp * (1 + 1.375 * e * e * e);   // 先是圆的，快到罩边才撑扁、贴上穹顶轮廓
          m.visible = true; m.position.copy(tpB).addScaledVector(cR, -0.55 * e); m.scale.set(Ap / pxw, Bp / pxw, 1); m.material.rotation = 0;
          m.material.opacity = 0.36 * smo(seg2(rk, 0, 0.14)) * Math.pow(1 - rk, 0.8); } } }
      // ---------- 光盾淡掉时落到云上的金色光点（POPT，11/11 fixB）：各自飘下来落到一个卡通脚下那朵云上，落下那一刻一团金光、一圈星光，那个卡通从云里弹出来（见 cheer）。光头 + 星光 + 三个越来越淡的拖尾 ----------
      //   11/11（shfade）：不再从碎开的前沿上（最高点附近、他头顶上方）放出来——从罩面上一点凝出来（MDZ：散在整面罩子上、高低错开，他头顶上方那一块没有）：
      //   0.24 内从小、从暗亮起来，先往罩子里面慢慢离开罩面（0.4），再越落越快地落到云上（ue；落下的时刻不变）
      if (on > TNo(17.68) && on < TNo(19.1)) { const cam = E.camera; Object.keys(POPT).forEach((key, k) => { const mt = P.motes[k], [x, top, z] = CHEER[key], t0 = TNo(POPT[key][0]), t1 = TNo(POPT[key][1]);
          const D0 = shDim(shEk(t0)), hx = (x - D0.c.x) / D0.a, hz = (z + MDZ[key] - D0.c.z) / D0.a, Pu = V(hx, Math.sqrt(Math.max(0, 1 - hx * hx - hz * hz)), hz), S0 = V(D0.a * Pu.x, D0.b * Pu.y, D0.a * Pu.z).add(D0.c), nr = V(Pu.x / D0.a, Pu.y / D0.b, Pu.z / D0.a).normalize();
          const Lp = V(x, top - 0.12, z), c1 = S0.clone().addScaledVector(nr, -0.4), c2 = Lp.clone().add(V(0, 1.3, 0)), ue = w => 0.3 * w + 0.7 * w * w;
          const bz = u => { const r = 1 - u; return S0.clone().multiplyScalar(r * r * r).addScaledVector(c1, 3 * r * r * u).addScaledVector(c2, 3 * r * u * u).addScaledVector(Lp, u * u * u); };
          const u = (on - t0) / (t1 - t0);
          if (u > 0 && u < 1) { const p = bz(ue(u)), a = smo(Math.min(1, u / 0.24)), tw = 0.85 + 0.15 * Math.sin(tc * 37 + k * 2.1), fz = (0.5 + 0.5 * a) * (1 + 0.15 * Math.sin(Math.PI * Math.min(1, u / 0.32))) * (k < 2 ? 0.8 : 0.88);   // fz：从罩面上凝出来、离开那一下亮一点、大一点（11/11 shfade/refine：鼓包减半，都小一点，前两颗再小一点）
            // 11/11（refine，评审：「光点是金白色的水滴形、带拖尾往下落，样子接近前面的火流星」）：改成一颗圆的星光点——亮核小一点，拖尾只留三颗、挨得近（0.04 → 0.022 一颗），飞得慢一点（POPT 落下晚 0.08）
            mt.core.visible = true; mt.core.position.copy(p); mt.core.scale.setScalar(0.88 * fz * (1 - 0.15 * u)); mt.core.material.opacity = Math.min(1, 0.95 * a * fz);
            mt.star.visible = true; mt.star.position.copy(p); mt.star.scale.setScalar(0.62 * tw * fz); mt.star.material.opacity = a; mt.star.material.rotation = k + u * 1.2;
            mt.tr.forEach((sp, j) => { const uj = u - 0.022 * (j + 1); if (j > 2 || uj <= 0) return; sp.visible = true; sp.position.copy(bz(ue(uj))); sp.scale.setScalar(0.62 * (1 - j / 4)); sp.material.opacity = 0.42 * a * (1 - j / 3.5); }); }
          const v = on - t1;   // 落到云上：一团金光（0.07 内亮到最大、0.32 淡完）、一圈星光，放在云朝镜头那一面
          if (v > -0.02 && v < 0.26) { const k1 = smo(seg2(v, -0.02, 0.04)) * Math.pow(1 - seg2(v, 0.04, 0.26), 1.6), k2 = smo(seg2(v, -0.02, 0.03)) * Math.pow(1 - seg2(v, 0.03, 0.16), 1.4), tw2 = cam.position.clone().sub(Lp).normalize();
            mt.land.visible = true; mt.land.position.copy(Lp).add(V(0, 0.1, 0)).addScaledVector(tw2, 0.5); mt.land.scale.setScalar(0.9 + 1.4 * easeOut(seg2(v, -0.02, 0.18))); mt.land.material.opacity = 0.55 * k1;
            mt.ring.visible = true; mt.ring.position.copy(Lp).add(V(0, 0.08, 0)).addScaledVector(tw2, 0.5); mt.ring.scale.setScalar(0.5 + 0.7 * easeOut(seg2(v, 0, 0.16))); mt.ring.material.opacity = 0.8 * k2; mt.ring.material.rotation = 0.4 + v * 2; } }); }
    }
    // 主陨石撞上光盾（HIT）。11/10（refine2，评审：「白闪是整屏叠 0.6 的白，深紫底上出来一片灰紫，像起雾」「陨石缩成一小团黑色石块，像个黑洞」「金币要到 16.9 以后才从别处冒出来」）：
    //   白闪改成以撞击点为中心往外退的暖白（hww，最亮的 2–3 帧，之后 0.15 内退掉，每帧最多变 0.25）；石头撞上那一帧被一团金光盖住（白金色的核 + 一圈暖金光），0.06 内在金光里缩没，
    //   当帧就炸开一把金币（bx 的 18 枚）先顺着罩面往外溅、再往下落，同时撒一把火星（meteors()）；金币雨（下面）也从撞击那一帧起飞。
    //   这一把金币放在镜头到撞击点连线的半路上（画面上还是从撞击点炸出来，大小按远近缩过）：撞上那一刻 RDS 正好在撞击点前面冒出来，放在后面会被它挡住
    // 11/10（迎击）：撞击点挪到推开以后的罩子轮廓上（MHIT，石头中心 MC 在它外面）。撞上那一帧不再整片白掉：白闪换成小一圈的 hwx（半径约原来的六成），从撞击点起来，
    //   先 0.3（看得见罩子边缘顶住石头、贴着撞击点烧白），0.055 内亮到 0.72，0.08–0.22 退掉——外面一圈压不白，擦出去的火星、迸开的碎石看得见；
    //   白金色的核、暖金光放在撞击点和石头中间（缩到原来的七成），石头在里面碎掉（0.065–0.13）；那一把金币、金币雨从石头碎掉的那一刻（HIT+0.06）从石头那儿炸出来
    if (rt(HIT) >= 0 && rt(HIT) < 1.4) { const ht = on - HITn, B = P.bx;
      if (ht < 0.4) { const sc = MHIT.clone().project(E.camera); E.show('hitfl', 'oflash hwx', '', Math.min(1, (0.28 + 0.44 * smo(seg2(ht, 0.005, 0.055))) * (1 - smo(seg2(ht, 0.08, 0.22))) + 0.06 * Math.pow(1 - seg2(ht, 0, 0.3), 2)), `translate(${((sc.x * 0.5) * 1920).toFixed(0)}px,${((-sc.y * 0.5) * 1080).toFixed(0)}px)`); }
      if (ht < 0.45) { const cp = E.camera.position, hc = MHIT.clone().lerp(MC, 0.5), tw = cp.clone().sub(hc).normalize(), ki = smo(seg2(ht, 0.005, 0.055)), k1 = (0.22 + 0.78 * ki) * Math.pow(1 - seg2(ht, 0.05, 0.26), 1.5), k2 = (0.3 + 0.7 * ki) * Math.pow(1 - seg2(ht, 0.05, 0.36), 2.0);
        B.core.visible = true; B.core.position.copy(hc).addScaledVector(tw, 1.4); B.core.scale.setScalar(2.9 * (0.6 + 0.4 * ki + 0.55 * easeOut(seg2(ht, 0.04, 0.12)))); B.core.material.opacity = k1;
        B.halo.visible = true; B.halo.position.copy(hc).addScaledVector(tw, 0.8); B.halo.scale.setScalar(5 * (0.7 + 0.3 * ki + 0.4 * easeOut(seg2(ht, 0.03, 0.23)))); B.halo.material.opacity = 0.7 * k2; }
      { const Nn = NH, t1 = V(0, 1, 0).cross(Nn).normalize(), t2 = Nn.clone().cross(t1).normalize(), tw = E.camera.position.clone().sub(MC).normalize(), toG = SB1.c.clone().add(V(0, -1.2, 0)).sub(MC).normalize();
        for (let k = 0; k < 18; k++) { const cn = B.coins[k], gn = B.glints[k], r1 = Math.abs((Math.sin(k * 12.9898 + 9.1) * 43758.5453) % 1), r2 = Math.abs((Math.sin(k * 78.233 + 3.3) * 43758.5453) % 1), t = ht - 0.06; if (t <= 0 || t > 1.3) continue;
          // 11/11（fixA）：往大家那边（撞击点往泡心、往下）溅：在罩面切平面里的随机方向上再加一个朝 toG 的分量（扇面朝左下）
          // 11/11（refine，评审：「金币贴着罩子右沿往下流成一竖条……在韩叔右边的半空悬了约 0.7 秒」）：从撞点往四面溅开——画面上横着（罩面法线 NH 里外两边）、顺着罩子轮廓（t2 上下）都有，
          //   一半再带一点朝大家那边（toG）的分量；溅得快、阻尼大一点、往下坠得快（0.85 → 2.0），T 17.5 前后落出去、淡掉，不在半空悬着
          const a = k * 2.399 + r1, v = 4.4 + 4.0 * r2, d = v / 2.3 * (1 - Math.exp(-2.3 * t)), dv = Nn.clone().multiplyScalar(Math.cos(a) * 1.05).addScaledVector(t2, Math.sin(a) * 0.95).addScaledVector(t1, 0.25 * Math.sin(a * 1.7)).addScaledVector(toG, k % 2 ? 0.45 : 0).normalize();
          const p = MC.clone().lerp(E.camera.position, 0.45).addScaledVector(dv, d * 0.55); p.y -= 2.0 * t * t; const sh = 1 - smo(seg2(t, 0.55 + 0.2 * r1, 0.82 + 0.06 * r1)); if (sh < 0.002) continue;
          const sz = 0.24 * (0.7 + 0.6 * r2) * (0.35 + 0.65 * easeOut(Math.min(1, t / 0.08))) * sh, fl = Math.abs(Math.cos(k * 1.7 + t * (9 + 3 * Math.sin(k))));
          cn.visible = true; cn.position.copy(p); cn.scale.set(sz * Math.max(0.16, fl), sz, 1); cn.material.opacity = Math.min(1, 0.3 + t / 0.03);
          if (k % 4 === 0) { const g2 = Math.max(0, 1 - t / 0.25); gn.visible = g2 > 0.01; gn.position.copy(p).addScaledVector(tw, 0.05); gn.scale.setScalar(0.6 * g2 + 0.05); gn.material.opacity = g2; gn.material.rotation = t * 2 + k; } } }
    }
    // 金币雨：十路、每路八枚（每路隔 0.06 出发），每一枚的起点、落点、飞的快慢、拱的高低各错开一点。11/10（光盾）：从光盾上陨石碎开的那一片（MHIT 周围）落下来；
    //   11/10（refine2）：第一路从撞击那一帧起飞（原来 HIT+0.1）。11/10（迎击）：从石头碎掉的那一刻（HIT+0.06）、石头那一团（MC 往撞击点挪一点，散开的大小和原来一样）飞出来
    const hr = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };
    [[2, 0], [7, 0.08], [12, 0.16], [19, 0.24], [25, 0.32], [31, 0.4], [37, 0.48], [44, 0.56], [16, 0.64], [40, 0.72]].forEach(([i, d]) => { for (let j = 0; j < 8; j++) { const r1 = hr(i, j), r2 = hr(j + 3, i), r3 = hr(i + j, 7);
      E.coinFly(on, HITn + 0.06 + d + j * 0.06, 1.35 * (0.85 + 0.3 * r3), MC.clone().lerp(MHIT, 0.35).add(V((i % 5 - 2) * 0.45 + (r1 - 0.5) * 1.2, (r2 - 0.5) * 0.6, (r2 - 0.5) * 1.4 + 0.3)), top(i).add(V((r2 - 0.5) * 0.7, 0.3, (r1 - 0.5) * 0.7)), 1, 2.3 * (0.85 + 0.35 * r1), 0, k => k); } });   // 飞约 1.35
    // 11/11（refine，评审：「这团金币在韩叔右边的半空悬了约 0.7 秒才往下落，有点像浮在罩子里」）：原来沿路线 smoothstep（刚出发那一段横着几乎不动）、再往上拱约 2.2，
    //   一团金币在撞点上方慢下来、悬着 → 沿路线匀速走（k），拱 2.3 ×（0.85–1.2）：一出来就横着飞、划一道弧落到格子上，不在半空停；往左边格子去的那几路从他头顶上方过去。落点、落下的时刻不变
    // 天亮了（11/10 光盾）：挡下流星以后，地平线、棋盘那一带慢慢透出暖金 / 桃色的晨光（HIT+0.05 起 0.8 秒亮起来），云海被照暖、星星淡一点；
    //   著书那段留着（稍弱一点），「三年后」黑场前淡完
    //   11/10（打开）：光盾收掉的时候天再亮一层（lt，著书那段跟着晨光一起退一半，「三年后」黑场前淡完）——
    //   头顶的深蓝推成清一点的晨蓝、暖金往上铺开、星星淡完、云海再亮一点，灯光亮 8%。11/11（fixB）：lt 提前、变快（T 17.68–18.48）；11/11（shfade）：光盾整面淡出（SHF，T 17.5–18.4）也在这一段，lt 不变
    { const dk = o < 9.6 ? smo(seg2(o, HIT + 0.05, HIT + 0.85)) * (1 - 0.3 * smo(seg2(o, 6.6, 7.2))) * (1 - smo(seg2(o, 9.2, 9.55))) : 0;
      const lt = o < 9.6 ? smo(seg2(on, OPA + 0.06, OPB + 0.3)) * (1 - 0.5 * smo(seg2(o, 6.6, 7.2))) * (1 - smo(seg2(o, 9.2, 9.55))) : 0;
      P.dawn.visible = dk > 0.001; P.dawn.material.uniforms.k.value = dk; P.dawn.material.uniforms.lt.value = lt;
      // 11/10（refine2）：夜空跟着从紫红往深蓝推（先把转折时染上的红退掉，再压一点红、提一点蓝），云海染成暖金、亮一点，星星淡掉大半
      if (dk > 0.001) { P.clouds.children.forEach(m => { if (m.userData.c0) m.material.color.copy(m.userData.c0).lerp(DAWNC, 0.75 * dk).multiplyScalar(1 + 0.22 * dk); });
        const rr = red * (1 - 0.75 * dk); P.skyM.color.setRGB((1 - 0.3 * dk), (1 - 0.38 * rr) * (1 - 0.05 * dk), (1 - 0.45 * rr) * (1 + 0.22 * dk));
        P.sky.children.forEach(m => { if (m.isPoints) m.material.opacity = 1 - 0.8 * dk; });
        if (lt > 0) { P.clouds.children.forEach(m => { if (m.userData.c0) m.material.color.multiplyScalar(1 + 0.1 * lt); }); P.skyM.color.multiplyScalar(1 + 0.12 * lt);
          P.sky.children.forEach(m => { if (m.isPoints) m.material.opacity = (1 - 0.8 * dk) * (1 - 0.85 * lt); }); P.base.forEach(([l]) => { l.intensity *= 1 + 0.08 * lt; }); } } }
    // 11/09（refine）：撞击那一下不再 E.splash —— engine 的 splash 不管 at.y，碎块永远落在棋盘面上，和天上的撞击点对不上，在画面下沿光柱脚下跳出一圈黄色小方块（原来压在下黑边底下）。撞击有光环、白闪、金币雨
    cap(1, '天外流星<em>坠落</em>', '云上世界 危在旦夕', 0.63, mm(2.4, false) - 0.1);   // 起点对齐切镜头，不叠在上一个镜头上；早 0.1 收
    const c10 = cap(10, '他把规则书<em>一甩</em>——', '', mm(2.8), mm(3.9) + 0.15);   // 提前到他快升到顶、要甩之前（旧 2.8）就出来，名牌滑进来以后再退（C2 不再拉那么长，字要多留一会儿）
    face('proud', 'han_exp_proud', mm(2.8) + 0.08, mm(3.9) + 0.15, () => capL(c10), FY, { r: -14 });   // 字幕旁弹出他「得意」的头像
    name(1, '韩叔', ['User Group 讲师', '多年云计算经验 · Homelab 发烧友'], '#e5484d', mm(3.9), mm(4.95, false) + 0.25, 'han', 'han_crown');   // 11/09：去掉原来的第一行，和虫虫、Yuki、Damo 一样两行；停的时长不变（原来三行时多停的 0.45 留着），仍在 cap(2) 出来之前收完
    // 11/05（refine）：+0.45 → +0.25：撞上法阵（HIT）那一刻开始淡、在白闪里淡完；原来白闪过后镜头拉远，左边 Lambda、S3、蓝色卡通弹出来时正好压在还没淡完的三行小字底下（T 16.8–17.2）
    cap(2, '韩叔一人挡下<em>天外流星</em>', '流星碎成了满天金币……', mm(HIT + 0.4), mm(6.7, false), '拯救了云上世界');

    // ---------- ② 著书 6.6–9.6：规则书在他面前展开、一页页翻过去，一张张书页飞到格子上，格子一圈圈亮起来 ----------
    if (o >= 6.4 && o < 9.8) {
      const h = P.han, hy = o < 6.75 ? hanUp(o, 1) : -0.04; h.g.visible = true; h.g.position.set(0, hy, -0.6); h.g.rotation.y = Math.atan2(E.camera.position.x, E.camera.position.z - 0.6) * 0.5;
      h.pose({ t: tc, armL: [1.2, 0.35], armR: [1.2 + Math.sin(tc * 9) * 0.2, 0.35], mouth: 'smile', head: [0.12, 0, 0] });
      const bk = P.book, ba = easeBack(seg(o, 6.5, 6.9)); bk.visible = true; bk.scale.setScalar(Math.max(0.01, 1.8 * ba)); bk.position.set(0, 0.82 + hy + Math.sin(tc * 2.2) * 0.04, 0.22); bk.rotation.set(-0.55, 0, 0);
      bk.children[1].rotation.z = 1.45; bk.children[2].rotation.z = -1.45; P.bookGlow.material.opacity = 0.7 + 0.3 * Math.sin(tc * 8); P.bookGlow.scale.setScalar(2.6); P.bookGlow.position.set(0, 0, 0);
      P.runes.forEach(m => { m.visible = false; }); P.pageM.color.set('#fffaf0'); P.pageM.emissive.setRGB(0, 0, 0); P.coverM.emissive.setRGB(0, 0, 0);   // 著书那段（6.4 起和上面那段叠着跑）书照原样：不带光爆时的符文、金光
      P.flips.forEach((f, k) => { const u = seg(o, 6.9 + k * 0.32, 7.2 + k * 0.32); f.visible = o > 6.9 && o < 9.5; f.rotation.z = -Math.PI * easeOut(u) * 0.98; });   // 一页页翻过去
      for (let i = 0; i < 48; i++) { const hl = seg(o, 6.95 + i * 0.045, 7.15 + i * 0.045) * (1 - seg(o, 9.1, 9.6)); if (hl > 0) E.highlight(i, hl * 0.9); }
      // 11/05：书页落到格子上的那一刻（= 那一格亮起来），格子跟着弹一下（0.3 内正弦弹起 0.3，格子不拿走），按顺序绕棋盘一圈 ——
      //   接近普通宣传片棋盘一块块落成的节奏；不飞书页的几格（PSKIP、卷轴格）也照样按顺序弹，一圈不断（这段新旧时间斜率是 1）
      for (let i = 0; i < 48; i++) { const b = seg(o, 6.95 + i * 0.045, 7.25 + i * 0.045); if (b > 0 && b < 1) E.lift(i, 0.3 * Math.sin(Math.PI * b)); }
      // 这几格飞过去的是地图卷轴（虫虫、Yuki 的，轮流），挑离镜头远的几格（左右两边靠里、上边一排；近处的格子在画面上飞得太快）：正对镜头的小贴片，一路晃着转，落到格子上时缩小一点、淡掉。
      // 卷轴图比书页显眼，飞得慢一点：早 0.35 出发、0.7 飞完（smoothstep），和那一格亮起来的时刻（书页本来落下的时刻）一起落下
      const SCR = P.pp.scrolls.length ? [21, 26, 30, 34, 38, 41] : [], PSKIP = [0, 1, 2, 13, 14, 15, 16];
      SCR.forEach((i, j) => { const sc = P.pp.scrolls[j]; if (!sc) return; const t1 = 6.95 + i * 0.045, u = seg(o, t1 - 0.7, t1); if (!(u > 0 && u < 1)) return; const e = u * u * (3 - 2 * u);
        const p = bk.position.clone().lerp(top(i).add(V(0, 0.2, 0)), e); p.y += Math.sin(Math.PI * u) * 1.2; sc.visible = true; sc.position.copy(p); sc.material.rotation = (j % 2 ? 1 : -1) * (0.55 - 1.1 * e);
        const sh = 0.78 * (1 - 0.3 * u); sc.scale.set(sh * sc.userData.ar, sh, 1); sc.material.opacity = fin(seg(u, 0, 0.15)) * (1 - Math.pow(u, 4)); });
      P.pages.forEach((pg, k) => [k, k + 22].forEach(i => { if (i >= 48 || SCR.includes(i) || PSKIP.includes(i)) return; const t1 = 6.95 + i * 0.045, t0 = Math.max(6.5, t1 - 0.95), u = seg(o, t0, t1); if (!(u > 0 && u < 1)) return;   // 书页飞到格子上
        // 落下的时刻（= 那一格亮起来）不变：提早出发、飞 0.95（开头几页从书弹出来的 6.5 起飞），沿路线 smoothstep（原来 0.35 内 easeOut，近处格子一帧挪 100 多像素）；转得少一点、拱得低一点，出书时淡入。
        // 同一张书页先后飞 k、k + 22 两格，两程相隔 0.99，飞 0.95 不重叠。PSKIP：落点远在画面外（右边 0–2、左下角 13–16）的几格不飞——飞出画面的那一段在画面边上还是一帧 45–60 像素
        const a = bk.position.clone(), b = top(i).add(V(0, 0.15, 0)), p = a.lerp(b, u * u * (3 - 2 * u)); p.y += Math.sin(Math.PI * u) * 1.0;
        pg.visible = true; pg.position.copy(p); pg.rotation.set(-Math.PI / 2 * u, u * 3 + i, 0); pg.scale.setScalar(0.8); pg.material.opacity = Math.min(1, u * 10) * (1 - Math.pow(u, 4)); }));
      P.cup.visible = true; P.cup.position.set(2.3, -0.04, 0.6); P.cup.rotation.y = tc * 0.6; if (P.pp.cupT) { P.pp.cupT.visible = true; P.pp.cupT.userData.roll = Math.sin(tc * 1.8) * 0.035; }   // 设定图的奖杯是立牌：不跟着底座转，轻轻晃
      P.cup.scale.setScalar(Math.max(0.001, easeBack(seg(o, 6.4, 6.75)))); E.splash(o, 6.4, P.cup.position, '#ffd27a', 12);   // 奖杯从棋盘上弹出来（约 0.44 秒），脚下溅起一圈金色碎光，不是一帧冒出来
      E.label('cup', V(2.3, 1.85, 0.6), '<span>User Group 冠军奖杯</span>', seg(on, mm(7.2), mm(7.2) + 0.3) * (1 - seg(on, mm(9.5, false) - 0.3, mm(9.5, false))), 'otag');
      // 11/05 复核：收在黑场开始（mm(9.3)）之前，不和「三年后……」叠在一起；83 张是 Health 事件卡 + re:Invent 卡，叫「卡牌」；主行「一张」原来修饰的是游戏名，读着拗口
      cap(3, '他把毕生所学', '写进了一张棋盘：<em>云上大亨</em>', mm(6.9), mm(9.3), '真实的云服务 · 事件卡 · 认证知识题');   // 11/09：不写具体数（服务、卡牌、题目还会随游戏更新变），只说是什么
    }

    // ---------- ③ 三年后 9.6–14.0：金币山上的王座，黑化；偌大一张棋盘只剩他一个人 ----------
    // 黑场「三年后……」（黑场本身的进出时间不变）：字从黑里慢慢浮上来——淡入、由虚到实、往上浮 22px，字距一路慢慢拉开（.2em → .3em）；
    // 底下一道细金线从中间向两边展开。字和线先退（10.2–10.38，这时黑场还有九成五），黑场再淡掉露出王座。子元素每帧都按时间重设，往回拖、预热以后都一样
    const lt = E.show('later', 'later', tp('<b>三年后……</b>') + '<i></i>', ease(seg(o, 9.3, 9.6)) * (1 - ease(seg(o, 10.3, 10.65))), 'none');
    { const ta = Math.pow(seg(o, 9.32, 9.66), 3) * (1 - fout(seg(o, 10.2, 10.38))), bl = 1 - easeOut(seg(o, 9.32, 9.72)), [lb, ll] = lt.children;   // 先慢后快地浮上来（原来先快后慢，黑场才压到一半字就清楚地压在韩叔脸上）
      lb.style.opacity = ta.toFixed(3); lb.style.transform = `translateY(${(22 * (1 - easeOut(seg(o, 9.32, 10.0)))).toFixed(2)}px)`; lb.style.filter = bl > 0.001 ? `blur(${(8 * bl).toFixed(2)}px)` : 'none';
      lb.style.letterSpacing = `${(0.2 + 0.1 * seg(o, 9.32, 10.38)).toFixed(4)}em`; ll.style.opacity = (0.9 * ta).toFixed(3); ll.style.transform = `scaleX(${(1 - Math.pow(1 - seg(o, 9.45, 10.0), 3)).toFixed(4)})`; }
    if (o >= 10.3) {
      P.throne.visible = o < ML0 - 0.05;
      const h = P.hanD, dark = seg(o, 10.6, 10.9), alone = seg(o, 12.35, 12.6) * (1 - seg(o, 13.25, 13.45));
      // 孤零零：灯暗下来，偌大一张棋盘只有他一个；他托着下巴低头。然后抬头坏笑，发出挑战
      const gk = ease(seg(o, 22.6, ML0));   // 夜空淡掉的同时，棋盘下的两团背景光升到正片的亮度（promo.js 是 0.32 / 0.26）
      P.base.forEach(([l, i0]) => { l.intensity = i0 * (1 - 0.45 * alone); }); E.glow(0.22 - 0.12 * alone + (0.32 - 0.22) * gk, 0.2 + 0.1 * alone + (0.26 - 0.2) * gk);
      h.pose({ t: tc, armL: [0.75, 0.85], armR: alone > 0.5 ? [1.75, 0.55] : [0.5, 0.2], mouth: alone > 0.5 ? 'flat' : o > 11.8 ? 'grin' : 'smirk', brow: alone > 0.5 ? -0.2 : 0.32, head: [alone * 0.28 - 0.06 * (1 - alone), 0, alone > 0.5 ? 0.1 : Math.sin(tc * 6) * 0.05], bounce: o > 13.45 ? Math.abs(Math.sin(tc * 12)) * 0.025 : 0, lean: 0.07 * alone, squash: 0.04 * alone });
      h.legs.forEach(L => { L.rotation.x = -1.45; }); if (h.shades) h.shades.position.y = (1 - easeOut(dark)) * 0.7;
      // 设定图版：先抱着买来的奖杯大笑 → 闪电一闪变成黑化形态（墨镜金链子、暗影小弟）→ 孤零零时转过身去只剩背影 → 转回来指着画面发出挑战 → 看着挑战者
      // 黑化以后不转身（四视图、背影都是没黑化的红披风）：孤零零时就用黑化那张立牌演落寞（灯暗下来、身子往前塌一点）；
      // 抬头发出挑战（13.45 那两声「嘀」）像翻牌一样换成指着画面的那张（压扁到 0 → 换图 → 展开），墨镜、金链道具贴在他脸上、脖子上；发完挑战（14.45）同样翻回黑化那张
      const flip = o < 14 ? seg(o, 13.3, 13.46) : seg(o, 14.38, 14.52), chal = o >= 13.38 && o < 14.45;
      // 设定图的四视图是没黑化的打扮（红披风、没墨镜），所以转身不按角度换四视图，而是像翻牌一样：压扁 → 换成背影 → 展开；转回来时同样翻成挑战
      // 抱奖杯 → 黑化：闪电劈下、画面闪白（11.4–11.52）的时候交叉淡化过去；发完挑战（14.45）交叉淡化回墨镜坏笑（他在远处、镜头正往挑战者那边走，淡化给 0.15）
      // 11/05 复核：挑战那张（指着画面）是没黑化的红披风、紫权杖，暗影小弟也不在，前后都是黑外套加小弟，一秒里换了一身衣服：挑战时继续用黑化那张，只做一下往前探、放大（不翻牌）
      const chalK = h.frame ? 0.05 * easeOut(seg(o, 13.38, 13.55)) * (1 - seg(o, 14.3, 14.45)) + 0.05 * Math.sin(Math.PI * seg(o, 13.38, 13.62)) : 0;
      if (h.frame) { h.g.rotation.y = 0; h.sx = 1; if (chalK > 0) h.g.scale.setScalar(1 + chalK);
        // 抱奖杯 → 黑化：两张外形不一样，不交叉淡化（会叠出两顶王冠、两副墨镜），闪电劈下、立牌一下子亮白的那一帧（11.42）硬切
        h.frame(o < 11.42 ? 'trophy' : 'dark', 0);
        // 闪电照亮他：两下劈下来时立牌一下子亮白再暗下去（第一下正好盖住换图的那 3 帧，看不出两张图叠着）
        const zap = o >= 11.4 && o < 11.56 ? 1.5 * (1 - seg(o, 11.4, 11.56)) : o >= 11.58 && o < 11.72 ? 0.7 * (1 - seg(o, 11.58, 11.72)) : 0;
        h.mat.emissiveIntensity = 0.5 * (1 - 0.5 * alone) + zap;
        // 墨镜、金链从天上落下来（10.98 / 11.0 起，越落越快，11.38 落到他脸上、脖子上——落点按抱奖杯那张图量的），落地压一下；
        // 闪电一闪、立牌换成黑化那张（11.42–11.5）的同时滑到黑化那张图里墨镜、金链的位置并淡掉（那张本来就戴着），跟着立牌一起被闪电照亮
        if ((P.pp.shades || P.pp.chain) && o >= 10.98 && o < 11.5) {
          h.g.updateWorldMatrix(true, true); const cl = E.camera.position.clone(); h.R.worldToLocal(cl); const phi = Math.atan2(cl.x, cl.z), cp = Math.cos(phi), sp = Math.sin(phi), tw = V(sp, 0, cp);
          const fsz = nm => { const f = P.SP.han[nm], kk = 2.1 / P.SP.han.front.h * (f.s || 1); return [f.w * kk, f.h * kk]; }, [tW, tH] = fsz('trophy'), [dW, dH] = fsz('dark');
          const at = (fx, fy, W, H) => h.R.localToWorld(V(cp * (fx - 0.5) * W, (1 - fy) * H, -sp * (fx - 0.5) * W).addScaledVector(tw, 0.12));
          const slide = 0, squ = Math.sin(Math.PI * seg(o, 11.38, 11.46)) * 0.16;   // 落在抱奖杯那张的脸上、脖子上压一下；11.42 硬切成黑化那张（本来就戴着）时一起消失   // 落地就开始往黑化那张的位置滑（0.12，smoothstep），跟换图的交叉淡化一起收尾
          // [道具, 起落时刻, 抱奖杯那张的落点 [x, y（从上往下）, 宽, 转角], 黑化那张的位置, 从哪儿落下来（相对落点）, 起始转角, 落定后的高宽比]
          [[P.pp.shades, 10.98, [0.415, 0.36, 0.7, 0.28], [0.575, 0.42, 0.75, 0.2], V(-0.45, 1.75, 0), -0.9, 0], [P.pp.chain, 11.0, [0.36, 0.57, 0.52, 0.05], [0.67, 0.62, 0.84, 0.06], V(0.45, 1.8, 0), 0.9, 0.5]].forEach(([s, t0, A0, B0, from, r0, flat]) => { if (!s) return;
            const u = seg(o, t0, 11.38), fall = Math.pow(u, 1.6), p = at(A0[0], A0[1], tW, tH).add(from.multiplyScalar(1 - fall)).lerp(at(B0[0], B0[1], dW, dH), slide);
            const w = A0[2] + (B0[2] - A0[2]) * slide, ar = flat ? 1 / s.userData.ar + (flat - 1 / s.userData.ar) * easeOut(seg(o, 11.34, 11.44)) : 1 / s.userData.ar;
            s.visible = true; s.position.copy(p); s.scale.set(w * (1 + squ * 0.5), w * ar * (1 - squ), 1);
            s.material.rotation = r0 + (A0[3] - r0) * easeOut(u) + (B0[3] - A0[3]) * slide; s.material.opacity = fin(seg(o, t0, t0 + 0.08)) * (o < 11.42 ? 1 : 0); s.material.color.setScalar(1 + 0.8 * zap); }); }
        // 发挑战那张（指着画面）是没黑化的打扮：墨镜、金链道具贴在他脸上、脖子上（位置按那张图量的），跟着翻牌一起压扁、展开
        if ((P.pp.shades || P.pp.chain) && chal && false) {   // 挑战时不再换成没黑化的那张，不用另贴墨镜、金链
          h.g.updateWorldMatrix(true, true); const cl = E.camera.position.clone(); h.R.worldToLocal(cl); const phi = Math.atan2(cl.x, cl.z), cp = Math.cos(phi), sp = Math.sin(phi), tw = V(sp, 0, cp);
          const f = P.SP.han.challenge, kk = 2.1 / P.SP.han.front.h * (f.s || 1), cW = f.w * kk, cH = f.h * kk, sx = h.sx;
          [[P.pp.shades, 0.562, 0.392, 0.33, -0.17, 0], [P.pp.chain, 0.575, 0.6, 0.3, -0.1, 0.55]].forEach(([s, fx, fy, wk, rot, flat]) => { if (!s) return;
            const w = wk * cW; s.visible = true; s.position.copy(h.R.localToWorld(V(cp * (fx - 0.5) * cW * sx, (1 - fy) * cH, -sp * (fx - 0.5) * cW * sx).addScaledVector(tw, 0.12)));
            s.scale.set(Math.max(0.001, w * sx), w * (flat || 1 / s.userData.ar), 1); s.material.rotation = rot; s.material.opacity = 1; s.material.color.setScalar(1); }); } }
      // 怀里的奖杯换成摆在脚边的奖杯道具（设定图的冠军奖杯立牌）：跟着闪光弹出来，之后轻轻晃
      // 11/05（L12 闪电换图）：原来只闪一层 0.35 的淡紫，换图那一帧看得出奖杯从怀里跳到脚边、暗影小弟凭空冒出来（黑化那张图把小弟画死在图里，不抠图）。改成：
      // ① 闪电劈下（11.40）画面全白，一直白到换图（11.42）之后约 0.06 秒（11.468）再按平方衰减淡掉（0.1）；
      // ② 闪光淡掉时他脚边（小弟那一块，按黑化那张图量的）炸开一团黑紫色烟（8 团烟 + 深紫碎块 + 一圈紫色冲击波），浓烟盖住约 0.25 秒（到 11.64）再往外、往上散开（11.82 散完）：黑烟里冒出小弟；
      // ③ 脚边那座奖杯不再原地凭空弹出来：从他怀里（抱奖杯那张图里奖杯的位置）被甩出去，划一道弧线落到金币山外面的老位置（11.42–11.66），落地压一下、溅几颗金色碎块
      const SW = 11.42, WH = SW + 0.048, TF1 = 11.66;
      E.show('ofl2w', 'oflash whw', '', o >= 11.4 && o < WH + 0.1 ? (o < WH ? 1 : Math.pow(1 - seg(o, WH, WH + 0.1), 2)) : 0, 'none');
      let tq = null;   // 甩出去的奖杯这一帧的位置（王座本地坐标）
      if (h.frame && o >= SW && o < 11.84) {
        h.g.updateWorldMatrix(true, true); const cl = E.camera.position.clone(); h.R.worldToLocal(cl); const phi = Math.atan2(cl.x, cl.z), cp = Math.cos(phi), sp = Math.sin(phi), tw = V(sp, 0, cp);
        const fz = nm => { const f = P.SP.han[nm], kk = 2.1 / P.SP.han.front.h * (f.s || 1); return [f.w * kk, f.h * kk]; }, [dW, dH] = fz('dark'), [tW, tH] = fz('trophy');
        const at = (fx, fy, W, H, f) => h.R.localToWorld(V(cp * (fx - 0.5) * W, (1 - fy) * H, -sp * (fx - 0.5) * W).addScaledVector(tw, f));
        // [fx, fy（黑化那张图里，从上往下）, 大小, 往外飘的方向（图里的左右）]
        [[0.18, 0.8, 1.5, -1], [0.34, 0.84, 1.65, -0.3], [0.5, 0.8, 1.4, 0.6], [0.24, 0.64, 1.3, -0.6], [0.42, 0.62, 1.3, 0.3], [0.08, 0.92, 1.3, -1.2], [0.56, 0.94, 1.3, 1], [0.3, 0.97, 1.5, 0]].forEach(([fx, fy, sz, dx], k) => {
          const m = P.dsmk[k], d = k * 0.008, g = easeOut(seg(o, SW + 0.02 + d, SW + 0.09 + d)), dis = seg(o, 11.64 + d, 11.82), a = fin(seg(o, SW + 0.02 + d, SW + 0.06 + d)) * Math.pow(1 - dis, 1.5);
          if (a <= 0.003) { m.visible = false; return; }
          const p = at(fx + dx * 0.12 * easeOut(dis), fy - 0.06 * g - 0.2 * dis, dW, dH, 0.42); m.visible = true; m.position.copy(p); m.scale.setScalar(sz * (0.45 + 0.55 * g) * (1 + 0.4 * dis));
          m.material.opacity = 0.97 * a; m.material.rotation = k * 1.3 + tc * (k % 2 ? 1.2 : -1.2); });
        const ft = at(0.33, 0.97, dW, dH, 0.3), u = seg(o, SW + 0.03, SW + 0.4);
        E.splash(o, SW + 0.03, ft, '#3b1466', 12); E.shockwave('dks', ft.x, ft.z, 0.3 + 2.4 * u, u < 1 ? 0.75 * (1 - u) : 0, 0x7a3cff);
        if (o < TF1 + 0.12) { const s0 = P.throne.worldToLocal(at(0.68, 0.86, tW, tH, 0.2)), s1 = V(-2.35, 0.02, 0.45), w = seg(o, WH, TF1), q = s0.clone().lerp(s1, w); q.y += 1.1 * 4 * w * (1 - w); tq = [q, w];   // 11/05（refine）：全白（到 WH）时还抱在怀里，白光退了才甩出去（原来 SW 就起飞，第一眼看到时已在头顶高度的半空）；顶点 1.5 → 1.1，落地 TF1 不变
          if (o >= TF1) E.splash(o, TF1, P.throne.localToWorld(s1.clone()), '#ffb020', 8); } }
      const tk = !h.frame ? 1 : tq ? 1.25 - 0.25 * smo(tq[1]) : 1, tsq = h.frame ? Math.sin(Math.PI * seg(o, TF1, TF1 + 0.12)) * 0.2 : 0; P.trophy.visible = !h.frame || o >= SW;   // 怀里那座比脚边这座大一点，边飞边缩回 1；落地压一下
      if (P.trophy.userData.w) { if (tq && tq[1] < 1) P.trophy.position.copy(tq[0]); else P.trophy.position.set(-2.35, 0.02, 0.45);
        P.trophy.scale.set(P.trophy.userData.w * tk * (1 + tsq * 0.6), P.trophy.userData.h * tk * (1 - tsq), 1); P.trophy.userData.roll = tq && tq[1] < 1 ? 0.9 * Math.sin(Math.PI * tq[1]) : Math.sin(tc * 2) * 0.05; } else { P.trophy.scale.setScalar(0.85 * tk); P.trophy.rotation.y = 0.4 + Math.sin(tc * 2) * 0.15; }
      // 金币堆成了山：天上一直往王座四周落金币（三股，每股一枚接一枚，按真实时间落、越落越快），黑场淡出时就在落，劈闪电那一下停（最后一批落完）
      if (on < mm(11.4) + 0.5) [[-0.9, -0.6, 0], [0.85, -0.65, 0.37], [0.3, -0.15, 0.71]].forEach(([x, z, ph]) => { for (let k = 0; ; k++) { const t0 = mm(10.3) + ph + k * 1.08; if (t0 > mm(11.4) - 1.0) break;
        E.coinFly(on, t0, 0.62, V(x + 0.3, 5.6, z - 0.2), V(x, 0.2, z), 14, 0.15, 0, u => u * u); } });
      const hasFl = P.pp.flames.length > 0;
      P.aura.visible = o < 14.2; P.aura.children.forEach((m, k) => { const ph = (tc * 0.5 + k * 0.137) % 1, a = k * 2.399 + tc * 0.6, rr = 0.6 + (k % 5) * 0.25; m.position.set(THR.x + Math.cos(a) * rr, 0.6 + ph * 2.4, THR.z + Math.sin(a) * rr * 0.8); m.scale.setScalar((0.8 + (k % 3) * 0.4) * Math.sin(Math.PI * ph)); m.material.opacity = (hasFl ? 0.55 : 0.8) * dark * (1 - 0.7 * alone) * (1 - seg(o, 13.6, 14.2)); });   // 有紫火时光点淡一点，当作火光的底
      // 魔法特效（紫火）：王座两边、身后四处，每处两团错开半拍轮流升起——从底下小小一团长大、往上飘、摇曳、到顶淡掉（不会一下冒出来或消失）；闪电劈下（变身）那一刻燃起来
      const FL = [[-1.32, 0.24, -0.2, 1.0], [1.34, 0.24, -0.3, 0.95], [-0.92, 0.38, -0.86, 1.15], [0.96, 0.38, -0.9, 1.1]], fk = seg(o, 11.42, 11.95) * (1 - 0.6 * alone) * (1 - seg(o, 13.6, 14.2));
      P.pp.flames.forEach((f, j) => { const [x, y, z, hh] = FL[j % 4], ph = (tc * 0.42 + (j >> 2) * 0.5 + (j % 4) * 0.23) % 1, sc = hh * (0.55 + 0.45 * Math.sin(Math.PI * ph)); f.visible = fk > 0;
        f.position.set(x + Math.sin(tc * 1.7 + j) * 0.05, y + ph * 0.5, z); f.scale.set(sc * f.userData.ar, sc, 1); f.material.rotation = Math.sin(tc * 2.3 + j * 1.3) * 0.12; f.material.opacity = 0.92 * Math.pow(Math.sin(Math.PI * ph), 0.7) * fk; });
      // 没人陪他玩：空荡荡的棋盘上只有他的一颗红棋子，孤零零立在右边的格子上（镜头拉远时露出来）；他转回来发挑战时，棋子跳一下缩没了
      if (P.pp.pawn && on >= mm(12.6) && on < mm(13.55) + 0.3) { const m = P.pp.pawn, ko = seg(on, mm(13.55), mm(13.55) + 0.3), kk = Math.max(0.001, easeBack(seg(on, mm(12.62), mm(12.62) + 0.33)) * (1 - ko * ko));   // 弹出来、跳一下缩没：真实时长
        m.visible = true; m.position.set(7.3, 0.22 + Math.sin(Math.PI * Math.min(1, ko * 1.6)) * 0.22, 2.0); m.scale.set(m.userData.w * kk, m.userData.h * kk, 1); m.userData.roll = Math.sin(tc * 1.3) * 0.03; }
      const strike = o >= 11.4 && (o < 11.52 || (o >= 11.58 && o < 11.66)); P.bolt.visible = strike;
      E.show('ofl2', 'oflash boltw', '', strike && o >= WH ? 0.35 : 0, 'none');   // 11/05（L12）：全白那几帧不再叠这层淡紫（纯白） shakeCam(strike ? 0.08 : 0);
      if (rt(11.4) >= 0 && rt(11.4) < 1.0) { const u = seg(on, mm(11.4), mm(11.4) + 0.9); E.shockwave('olt', 2.4, 0.4, 0.3 + u * 3.5, 0.9 * (1 - u), 0xb48cff); }
      const c8 = cap(8, '金币堆成了<em>山</em>……', '', mm(10.53), mm(11.0, false));   // 黑场快淡完（还剩约三成）再出，不比画面先到
      const c4 = cap(4, '韩叔<em>黑化</em>了！', '纸醉金迷，用钱买走了 User Group 冠军奖杯', mm(11.0), mm(12.4, false), '第一代云上大亨');   // 称号用游戏名「云上大亨」
      const c9 = cap(9, '可这么大一张棋盘', '再也<em>没人</em>陪他玩……', mm(12.55), mm(13.5, false));   // 上一条 12.4 退完、他转过身去以后再出（错开 0.15），镜头这时刚开始拉远
      face('laugh', 'han_exp_laugh', mm(10.53) + 0.06, mm(11.0, false), () => capL(c8), FY, { r: -12 });       // 金币堆成了山：「大笑」
      face('smug', 'han_darkhead', mm(11.68), mm(12.4, false), () => capR(c4), FY, { r: 12 });         // 黑化了：戴墨镜坏笑的黑化头像（两道闪电劈完、闪光过去再出）；黑化以后的韩叔头像都用这张
      face('think', 'han_darkhead_sad', mm(12.62), mm(13.5, false), () => capL(c9), FY, { r: -10 });    // 没人陪他玩：落寞（黑化以后，头像也是戴墨镜的；落寞那张嘴角往下、颜色发灰，不再是咧嘴举拳的坏笑）
      E.camera.updateMatrixWorld(true); const hp = V(0.6, 2.4, -0.85).project(E.camera);   // 先更新镜头矩阵：不然投影用的是上一帧渲染时的镜头，跳着 seek 时气泡会错位（8K 截图里出现在字幕上），逐帧录也会晚一帧
      // 两个台词气泡（新时间）：① 黑化后坏笑 B1–B1e，② 抬头发出挑战（带黑化头像）B2–B2e（约 0.9 秒，镜头这时已经开始往挑战者那边俯冲）；弹出的回弹 0.35、头像晃按真实时长
      const B1 = mm(11.0) + 1.3, B1e = B1 + 1.55, B2 = mm(13.45), B2e = mm(14.3, false), sec = on > (B1e + B2) / 2;   // ① 等「黑化了」先单独读 1.3 秒再弹出，留到孤零零拉远的开头
      const bf = sec && pic('han_darkhead'), bub = E.show('bub', 'dbub' + (bf ? ' wf' : ''), bf ? `<i class="bfc" style="--c:#e5484d"><b style="background-image:url(${bf.src})"></b></i><span>${tp('想拿奖杯？<br>先在我的棋盘上赢我！')}</span>` : tp(sec ? '想拿奖杯？<br>先在我的棋盘上赢我！' : '这座金山，<br>谁敢来拿？'), on < B2e ? (seg(on, B1, B1 + 0.2) * (1 - seg(on, B1e - 0.15, B1e)) + seg(on, B2, B2 + 0.15) * (1 - seg(on, B2e - 0.2, B2e))) : 0, `translate(${((hp.x + 1) / 2 * 1920 + 40).toFixed(0)}px,${((1 - hp.y) / 2 * 1080).toFixed(0)}px) translate(0,-50%) scale(${(0.5 + 0.5 * easeBack(seg(on, sec ? B2 : B1, (sec ? B2 : B1) + 0.35))).toFixed(3)})`);
      if (bf && on >= B2 && on < B2e) bub.firstChild.style.transform = `rotate(${(Math.sin((on - B2) * 5) * 4 * seg(on, B2 + 0.15, B2 + 0.4)).toFixed(2)}deg)`;   // 头像跟着他的坏笑轻轻晃
    }
    // ---------- ④ 挑战者 14.0–19.4：虫虫走进来、Yuki 披着红披风飞进来；「又一颗流星？」其实是 Damo ----------
    if (o >= 13.9) {
      // Damo 落地的冲击波把两人往两边震开一小步（给他的「指挥带队」让出位置，不然他的披风和手正好挡住两人）
      const blow = easeOut(seg(o, 17.78, 18.16)), blowH = Math.sin(Math.PI * seg(o, 17.78, 18.16)) * 0.26;
      // 「又一颗流星？！」（新时间 c6n）：字幕、坠落哨、两边的「惊讶」头像同一刻出来，两人吓一跳（0.22 往上一窜、拉长）然后往后仰、歪头看天，火球 0.05 以后在天边亮起来
      const c6n = mm(17.15, false) + 0.3, oc6 = MO(c6n), jk = seg(on, c6n, c6n + 0.22), jolt = Math.sin(Math.PI * jk), look = easeOut(seg(on, c6n + 0.06, c6n + 0.4)) * (1 - seg(o, 17.75, 17.95));
      const idle = ph => Math.sin(tc * 2.5 + ph), shiv = ph => 0.012 * Math.sin(tc * 31 + ph) * look;   // shiv：盯着火球的时候有点发抖   // 站着的时候轻轻呼吸（立牌一伸一缩、左右晃一点），按真实时间
      // 跑进来：匀速跑，最后 0.16（0.2 秒）减速停进站位（原来匀速跑到 14.9 那一帧一下子停住）
      const c = P.chong, cu = seg(o, 14.0, 14.9), c0 = 0.82, cv = 2 / (1 + c0), cuE = cu < c0 ? cv * cu : cv * c0 + cv * (cu - c0) - cv * (cu - c0) * (cu - c0) / (2 * (1 - c0));
      c.g.visible = true; c.g.position.copy(cu < 1 ? V(-9.5, -0.04, 3.4).lerp(C3, cuE) : C3.clone().lerp(CB, blow)); c.g.position.y += blowH; c.g.rotation.y = cu < 1 ? Math.PI / 2 : 0.35;
      const pump = kk => Math.max(0, Math.sin(rt(15.9) * 7 + kk)) * seg(o, 15.9, 16.1) * (1 - seg(on, mm(17.15, false) - 0.2, mm(17.15, false) + 0.28));   // 振臂按真实时间（立志赚钱那段拉长了，不变成慢动作），一直挥到「又一颗流星？！」吓一跳之前
      const landC = c.frame ? 0.07 * Math.sin(Math.PI * seg(o, 14.9, 15.02)) - 0.03 * Math.sin(Math.PI * seg(o, 15.02, 15.16)) : 0;   // 跑到位：落地压扁一下再弹起来，跟换图一起
      const st = cu < 1 ? 0 : seg(o, 14.9, 15.1);   // 站定以后才呼吸
      c.pose({ t: tc, walk: cu < 1 ? 1 - seg(o, 14.78, 14.9) : 0, speed: 12, armR: [0, 0.2 + pump(0) * 2.4], bounce: pump(0) * 0.08 + 0.13 * jolt, squash: landC - 0.022 * st * idle(0) - 0.07 * jolt, lean: -0.13 * look });
      c.R.rotation.z += st * 0.022 * Math.sin(tc * 1.6 + 0.5) - 0.07 * look + shiv(0);
      // 跑进来 → 站定（交叉淡化）→「立志赚钱」时指向王座上的韩叔（15.85 起淡，15.9 叮的那一下正好换完）→ 抬头看流星（淡化 0.12，17.32 落在拍点上）
      // 「立志赚钱」换成「胜利」那张（双手举拳）：「出发」那张她左胳膊被挡住，背包上的云朵小玩偶看起来像一只变形的胳膊
      // 11/05（第三轮复查）：「又一颗流星？！」那一刻从「胜利」（双手举拳、跳在半空）换回站姿，原来一帧硬切；改成像翻牌一样：0.06 内压扁到 0 → 换图 → 0.06 内展开（中点就是换图的 c6n，正好是吓一跳的起点）
      if (c.frame) { c.sx = Math.abs(Math.cos(Math.PI * seg(on, c6n - 0.06, c6n + 0.06))); frameSeq(c, [[0, 'run', 1], [14.9, null, 1], [15.85, 'win', 1], [oc6, null, 1, 0.12]]); }   // oc6 = 「又一颗流星？！」出来那一刻，和 Yuki 一起站好、吓一跳抬头
      // 11/10（名牌，用户：「yuki出来了名字不对」——原来 T 34.9–36.0 Yuki 就跟着虫虫跑进来、站在她旁边，左上角却一直是虫虫的名牌，到 nmY（T 37.66）才换成 Yuki）：
      //   虫虫名牌那 2.2 秒里画面上只有她；Yuki 晚到：YA–YL（按新时间，T 37.04–37.64）沿原来那条路从左下角冲进来（比原来快 1.9 倍，T 37.22 左右才进画面，0.2 秒后虫虫名牌开始淡），
      //   最后 0.3 段一跃（拱起 0.55，脚离开字幕那一带）落到自己的位置，落地压扁一下正好赶上 Yuki 的名牌出来（YL = nmY − 0.02）；转向镜头、站定、振臂都按落地的时刻顺下来
      // 11/11（fixC，评审：「37.23–37.53 虫虫名牌还满着，Yuki 大块在前景跑、37.4–37.5 从虫虫身上压过去」「落地以后 0.3 秒里换三次图」「鞋和小跟班压到『立志赚钱』」）：
      //   再晚一点、短一点：YA = YL − 0.32（T 37.24 起跑，还在画外），约 T 37.39 才从画面下沿冒头（虫虫名牌 37.41 开始淡），37.64 落地不变（YL = nmY − 0.02）。
      //   路线改成从镜头右前下方（画面下沿、虫虫右边）冲上来：头先从下沿露出来，往右上、往里跑，最后 0.34 段一跃落到站位，一路在虫虫右边（不从她身上、身前横穿过去）。
      //   站位往后挪 0.6、往右 0.1（Y3s）：脚底、跳起来振臂最低的时候都在「立志赚钱」那行字上面；「又一颗流星？！」吓一跳那一下（c6n+0.05–0.27）往镜头这边跳回原来的站位 Y3，之后和原来一样。
      //   落地那一刻直接换「出发」那张（不再先换站姿、0.28 秒后再换），到吓一跳才翻牌换回站姿
      const nmC = mm(14.5), nmY = nmC + 2.2, YL = nmY - 0.02, YA = YL - 0.32, oYL = MO(YL);   // nmC、nmY 和 music.mjs 同步，不动
      const y = P.yuki, yu = seg(on, YA, YL), yh = seg(yu, 0.66, 1);   // Yuki 晚一点冲进来（披风被队长抢走了，飞不起来，只能跑、最后一跃）
      // 走一条弯一点的路：从左下角（离镜头近的地方）跑进来，从虫虫面前（隔 1.4）绕过去再走到自己的位置（直线会从虫虫的立牌里穿过去）。
      // 11/05（第三轮复查）：原来从虫虫身后绕（YS (-10.5, 2.0)、YQ 在她身后 1.9），离镜头远、头在画面上偏高，T 35.2–35.6 从左上角虫虫名牌那两行小字底下穿过去；
      // 改走前面：画面左边那一段他的头一直在名牌小字（y 528–571）下面，跑到名牌右边（x 474）以后才升到原来的高度
      // 11/11（fixC）：上面两条是老路线的说明。新路线 YS → YQ → Y3s：YS 在镜头跟前偏左下（z 11.2，整个人在画面下沿以下，看不见），z 小于约 8.3 头才进画面
      // 11/11（refine，评审：「0.2 秒里在画面上几乎竖直往上冲……用的却是朝右跑的侧面立牌，像被吸到站位上」）：起点往左挪（YS x −3.6 → −4.6、z 11.2 → 10.8），中间点往右（YQ x −1.5 → −1.0、z 6.9）：
      //   画面上先往右上斜着冲（和朝右跑的立牌一个方向）、再往上一跃落到站位；仍从虫虫脚前、下沿过去，不碰她上半身（shstory/fixC/d/path2.py 模拟过）
      const YS = V(-4.6, -0.04, 10.8), YQ = V(-1.0, -0.04, 6.9), Y3s = V(-1.5, -0.04, 2.9), ybk = smo(seg(on, c6n + 0.05, c6n + 0.27)), bz = (a, b, c2, u) => a.clone().multiplyScalar((1 - u) * (1 - u)).addScaledVector(b, 2 * u * (1 - u)).addScaledVector(c2, u * u);
      y.g.visible = on >= YA - 0.02; y.g.position.copy(yu < 1 ? bz(YS, YQ, Y3s, yu) : ybk < 1 ? Y3s.clone().lerp(Y3, ybk) : Y3.clone().lerp(YB, blow)); y.g.position.y += yu < 1 ? 0.5 * 4 * yh * (1 - yh) : blowH * 0.9;   // 出发前藏在画外；ybk：吓一跳时跳回 Y3（那时 blow 还是 0）
      const yEnd = Math.atan2(Y3s.x - YQ.x, Y3s.z - YQ.z);   // 走到位时的朝向：之后 0.25 慢慢转向镜头，走路的摆动也在最后 0.15 收住（原来 15.4 那一帧一下子弹回去）
      y.g.rotation.y = yu < 1 ? Math.atan2((1 - yu) * (YQ.x - YS.x) + yu * (Y3s.x - YQ.x), (1 - yu) * (YQ.z - YS.z) + yu * (Y3s.z - YQ.z)) : yEnd + (0.15 - yEnd) * ease(seg(on, YL, YL + 0.25));
      const landY = y.frame ? 0.1 * Math.sin(Math.PI * seg(on, YL, YL + 0.12)) - 0.035 * Math.sin(Math.PI * seg(on, YL + 0.12, YL + 0.27)) : 0;   // 一跃落地压扁一下再弹起（比虫虫跑到位那下重一点）
      const sty = yu < 1 ? 0 : seg(on, YL, YL + 0.2), jy = Math.sin(Math.PI * seg(on, c6n + 0.05, c6n + 0.27)), pY = pump(1.5) * smo(seg(on, YL + 0.05, YL + 0.2));   // Yuki 晚半拍吓一跳；振臂等落地站稳再起
      y.pose({ t: tc + 0.4, walk: yu < 1 ? 1 - seg(yu, 0.6, 0.68) : 0, speed: 24, armR: [0, 0.2 + pY * 2.4], armL: [0, 0.2], mouth: 'smile', brow: 0.2, bounce: pY * 0.08 + 0.12 * jy, squash: landY - 0.022 * sty * idle(1.9) - 0.065 * jy, lean: -0.12 * look });
      y.R.rotation.z += sty * 0.02 * Math.sin(tc * 1.4 + 2.1) - 0.045 * look + shiv(1.3);
      // 设定图版：跑步（朝向跟着移动方向）→ 站定 →「立志赚钱」时比虫虫晚半拍跳起来振臂（「出发」那张，朝着王座）→ 流星来时回到站姿
      // 「出发」→ 站姿同样翻牌换，比虫虫晚 0.05（跟着他晚半拍的吓一跳）
      // 11/05（refine）：从虫虫面前跑过去那一段，两张立牌各自朝着镜头竖着、离得近，会在深度上互相插进去（T 35.8–35.95 他头发被她的脸挡住、半个人像从她身体里穿过去）。
      // 跑动的这一段把 Yuki 的立牌沿视线往镜头挪 1.6（zb：画面上大小位置不变，只改深度），整张都画在虫虫前面；站定（yu = 1）以后两人隔开了，收回 0
      if (y.frame) y.zb = yu > 0 && yu < 1 ? 1.6 : 0;
      // 11/11（fixC）：跑进来这一段（YA–YL）Yuki 的立牌不做视锥剔除，和上面韩叔一样：他从画面下沿冲上来（离镜头很近、立牌很大），没画过以前那个 1×1 包围球还在画面外，头露出来 0.02 秒都不画，再一下子冒出半个人。
      //   只在这一段关：别的时候照原来剔除（一直关的话，后面变棋子时缩到 0.001 的立牌也会画出一个小点，T 48 大标题那里差一个像素）
      if (y.frame) { const fc = !(on >= YA - 0.02 && yu < 1); y.R.children.forEach(m => { m.frustumCulled = fc; }); }
      // 11/10（名牌）：落地（oYL）换站姿；「出发」从 16.05 挪到 16.12（T 37.92，落地后 0.28 秒，原来落地以后站了两秒多）
      // 11/11（fixC）：落地那一刻直接换「出发」（跑 → 出发 → 吓一跳翻牌回站姿，一共两次，隔 2.5 秒）
      if (y.frame) { y.sx = Math.abs(Math.cos(Math.PI * seg(on, c6n - 0.01, c6n + 0.11))); frameSeq(y, [[0, 'run', 1], [oYL, 'go', 1], [MO(c6n + 0.05), null, 1, 0.12]]); }
      // nmC、nmY（见上）：虫虫那块停 2.2（11/05 复核多给 0.25），Yuki 紧接着停 1.95（再长就压到「又一颗流星？！」）；music.mjs 同步
      name(2, '虫虫', ['亚马逊云科技认证大满贯', '拯救小队 · 队员'], '#2f7cf6', nmC, nmY, 'chong', 'chong_scroll');   // 徽章只留地图卷轴（11/05 复核：笑脸徽章、笑脸小花发饰乍看像表情符号，指南针和 Yuki 那张重复；卷轴在学习模式也用到），和另外三张一样一枚
      name(3, 'Yuki', ['被队长抢了披风的探险家', '拯救小队 · 队员'], '#9b5cf6', nmY, nmY + 1.95, 'yuki', 'yuki_compass');
      const c5 = cap(5, '立志<em>赚钱</em>', '把奖杯抢回来！', mm(15.9), mm(17.15, false));   // 退完再出下一条
      face('ccheer', 'chong_exp_cheer', mm(15.98), mm(17.15, false), () => capL(c5), FY, { r: -14 }); face('ycheer', 'yuki_exp_cheer', mm(16.08), mm(17.15, false), () => capR(c5), FY, { r: 14, ph: 1.7 });   // 字幕两边：两人「加油」
      // 又一颗流星？——是 Damo
      // 又一颗流星：火球从 c6n + 0.05 起就在天边亮成一个小火点（棋盘后面远处的天上，画面上半部），按新时间一路压过来、越来越大、往左下落到 Damo 的落点（17.75 落地不变）。
      // 路线是一条直线（远处 FF → 落点 E1），沿线的进度 g = a·x + (1 − a)·x²（x 从 1 走到 0）：起步快（远处，画面上几乎只是变大），落地前的速度和原来最后 0.55 那一冲一样（约 12.7 单位/o）
      const land = o >= 17.75, fz = seg(o, 17.75, 17.93), FB = !!P.pp.fball, E1 = D3.clone().add(V(0, 0.6, 0)), fa0 = c6n + 0.05, tL = mm(17.75), FD = tL - fa0;
      if (!P.FF) { const cc = E.camera.clone(); cc.clearViewOffset(); const [pp, ll] = spline(fa0, CAM_BN, V); cc.position.copy(pp); cc.lookAt(ll); cc.updateMatrixWorld(true); cc.updateProjectionMatrix();
        const q = V(0.05, 1 - 2 * 205 / 1080, 0.5).unproject(cc).sub(pp).normalize(); P.FF = pp.clone().addScaledVector(q, 58); }
      const FF = P.FF, LF = FF.distanceTo(E1), fa = Math.min(0.9, 12.7 * FD / LF), gx = x => fa * x + (1 - fa) * x * x, fAt = t => E1.clone().lerp(FF, gx(Math.min(1, Math.max(0, (tL - t) / FD))));
      const fu = seg(on, fa0, tL), fp = fAt(on); P.fire.visible = on >= fa0 && fz < 1; P.fire.position.copy(fp); P.fire.lookAt(fAt(Math.min(on, tL - 0.02) - 0.08));
      const fi = fin(seg(on, fa0, fa0 + 0.15)), far = 1 - smo(seg(fu, 0.35, 0.85)), pul = 1 + 0.18 * far * Math.sin(tc * 23) * Math.sin(tc * 9.1 + 1);   // 远的时候一闪一闪（真实时间）
      P.fire.children[0].scale.setScalar((FB ? 2.6 : 4) * (1 + 0.6 * fz) * (1 + 1.6 * far) * pul); P.fire.children[0].material.opacity = fi * (1 - fz); P.fire.children[1].material.opacity = fi * (1 - seg(fu, 0.85, 1));   // 远处光晕放大一点，免得只是一个像素
      // 火光换成设定图的「一拳特效」火球：按这一帧画面上的飞行方向转好角度（图里火球朝左下飞、火舌往右上拖），拖尾留着；后面那团光当火光的底；落地时一样放大淡掉
      if (FB) { const fb = P.pp.fball; fb.visible = P.fire.visible;
        if (fb.visible) { E.camera.updateMatrixWorld(true); const q0 = fAt(Math.min(on, tL - 0.02)).project(E.camera), q1 = fAt(Math.min(on, tL - 0.02) + 0.02).project(E.camera), hh = 1.6 * (1 + 0.5 * fz);
          fb.position.copy(fp); fb.material.rotation = Math.atan2((q1.y - q0.y) * 540, (q1.x - q0.x) * 960) + 2.03; fb.scale.set(hh * fb.userData.ar, hh, 1); fb.material.opacity = fi * (1 - fz); } }
      const c6 = cap(6, '又一颗<em>流星</em>？！', '', c6n, mm(17.75));   // 11/05 复核：Damo 落地那一刻收完，不压在他头上   // 立志赚钱退完空半拍再出（火球 0.05 以后就在天边亮起来），落地后收掉
      face('csur', 'chong_exp_surprised', c6n + 0.04, mm(17.9, false), () => capL(c6), FY, { jolt: 1 }); face('ysur', 'yuki_exp_surprised', c6n + 0.1, mm(17.9, false), () => capR(c6), FY, { jolt: 1, ph: 1.3 });   // 反应镜头：两人「惊讶」，和字幕一起出来
      const d = P.damo; d.g.visible = land;
      const SH = ML0 - 1.1, walkTo = seg(o, 21.9, 22.9), jump = seg(o, SH - 0.37, SH + 0.28);   // SH、PF：脚本时间（新时间是 ML − 1.1 = 33.78、34.08）
      // 冲过去时走一条往镜头这边弯的弧线：大骰子正好落在直线路线上，直着走立牌会从骰子里穿过去
      const DQ = D3.clone().lerp(PUNCH, 0.5).add(V(-0.25, 0, 1.9)), wk = ease(walkTo);
      const pos = walkTo > 0 ? D3.clone().multiplyScalar((1 - wk) * (1 - wk)).addScaledVector(DQ, 2 * wk * (1 - wk)).addScaledVector(PUNCH, wk * wk) : D3.clone(); pos.y += Math.sin(Math.PI * jump) * 0.75;
      d.g.position.copy(pos); d.g.rotation.y = walkTo > 0 && walkTo < 1 ? Math.atan2((1 - wk) * (DQ.x - D3.x) + wk * (PUNCH.x - DQ.x), (1 - wk) * (DQ.z - D3.z) + wk * (PUNCH.z - DQ.z)) : walkTo >= 1 ? 2.39 : 0.2;
      const punch = easeOut(seg(o, SH - 0.09, SH + 0.03)) * (1 - seg(o, SH + 0.2, SH + 0.4)), sq = Math.sin(Math.PI * seg(o, 17.75, 17.95)) * 0.25;
      // 落地 → 指挥带队（18.1 起淡，18.2 咚的那一下换完）→ 站定（19.45 起淡，盖在 19.5 大标题砸下那一拍里）→ 冲过去（21.9，换完正好是 21.95 的第一声）
      // → 冲到骰子旁边，像翻牌一样压扁、换成面朝骰子的站姿、再展开（22.8–23.0，22.9 压到 0 的那一帧换图）→ 跳起来出拳（23.73，跟着呼的一声淡过去）
      // 出拳落地（24.38）以后不再换回站姿：24.4 就「噗」地变成棋子了，原来是在烟雾前一帧硬换
      if (d.frame) { d.sx = Math.abs(Math.cos(Math.PI * seg(o, 22.84, 22.96)));   // 翻牌 0.2 → 0.12（11/05 复核：压成细竖线的那一两帧太显眼），中点仍在换图的 22.9
        frameSeq(d, [[0, 'enter', 1], [18.1, 'lead', 1, 0.12], [19.45, null, 1, 0.12], [21.9, 'charge', -1], [22.9, null, -1, 0], [23.73, 'charge', 1]]); }
      if (d.frame) d.zb = o >= 21.9 ? 1.4 : 0;   // 冲到骰子旁边以后，立牌的深度往镜头这边挪一点，免得骰子的角插进立牌里
      const wkK = seg(o, 21.9, 22.0) * (1 - seg(o, 22.78, 22.9)), up = d.frame ? 0.05 * Math.sin(Math.PI * seg(on, mm(18.1), mm(18.1) + 0.2)) : 0;   // 走路的蹦跳从 0 渐起、到站前收住（原来 21.9、22.9 两帧各跳 0.12）；蹲着落地 → 站起来指挥时往上伸一下
      const dbr = land && o < 21.9 ? 0.015 * seg(on, mm(17.95), mm(17.95) + 0.3) * Math.sin(tc * 2.3 + 1) : 0;   // 站着指挥的时候也轻轻呼吸（真实时间）
      d.pose({ t: tc, walk: walkTo > 0 && walkTo < 1 ? wkK : 0, speed: 12, squash: (d.frame ? sq * 0.3 - up : sq) - dbr, armR: [punch * 1.65 + (land && o < 21.9 ? 0.2 : 0), 0.15 + (o > 18.1 && o < 19.3 ? 2.6 : 0) + (o > 21.1 && o < 21.9 ? 2.4 * Math.sin(Math.PI * seg(o, 21.1, 21.9)) : 0)], armL: [0, 0.25], mouth: 'flat', cape: jump * 0.5, lean: punch * 0.3 });
      if (land && rt(17.75) < 1.15) { const u = seg(on, mm(17.75), mm(17.75) + 0.95); E.shockwave('dland', D3.x, D3.z, 0.3 + u * 6, 0.9 * (1 - u), 0xffb020);   // 落地的冲击波、格子波、震屏：真实时长
        for (let i = 0; i < 48; i++) { const cc = cell(i), w = Math.hypot(cc.x - D3.x, cc.z - D3.z) - rt(17.75) * 12, hh = 0.35 * Math.exp(-w * w / 1.2) * (1 - u); if (hh > 0.003) E.lift(i, hh); }
        E.splash(on, mm(17.75), D3.clone().add(V(0, 0.6, 0)), '#ffb020', 20); }
      if (rt(17.75) >= 0 && rt(17.75) < 0.65) shakeCam(0.18 * (1 - seg(on, mm(17.75), mm(17.75) + 0.55)));
      name(4, 'Damo', ['绰号「一拳超人」', '拯救小队 · 队长'], '#1f9d55', mm(18.0), mm(19.3, false), 'damo', 'damo_glove');   // 拳套（贴合「一拳超人」）；原来的领队徽章是一顶金王冠，浮在虫虫头顶、和韩叔的王冠撞
      const c7 = cap(7, '人称「<em>一拳超人</em>」的 Damo 带队', '讨伐韩叔！', mm(18.2), mm(19.5, false), '', 'dlong');   // 这条字长：dlong 主行小一号、整体往下一点，露出 Damo 的脸
      face('dfire', 'damo_exp_fire', mm(18.3), mm(19.45, false), () => capR(c7), FY, { r: 12 });   // Damo「热血」
      // 王座上的韩叔被挑衅了：他头的右边「生气」头像一闪（吓一跳似的抖几下）
      const hq = () => { E.camera.updateMatrixWorld(true); const q = V(THR.x, 2.45, THR.z).project(E.camera); return [(q.x + 1) / 2 * 1920, (1 - q.y) / 2 * 1080]; };
      face('hang', 'han_darkhead_angry', mm(18.55), mm(19.15, false), () => hq()[0] + 165, () => hq()[1] - 30, { cls: 'sm', jolt: 1 });
      // 王座上的韩叔：看着挑战者坏笑
      P.hanD.pose({ t: tc, armL: [0.75, 0.85], armR: [0.5, 0.2], mouth: 'grin', brow: 0.32, bounce: Math.abs(Math.sin(tc * 12)) * 0.02 }); P.hanD.legs.forEach(L => { L.rotation.x = -1.45; });
      // 镜头：大标题时拉高，最后一帧和正片 10.7 秒一样（先摆好镜头，下面拳头特效、「一拳！」的位置都按这一帧的镜头算）
      if (o >= 19.3) {
        // 正片 10.0–11.0 秒这段镜头（promo.js 两头 'hold'，按原来的 ease；promo_full.js 接上正片的前 0.7 秒也按这组看点过渡）：
        // 序章最后一帧的位置、看点取它在 10.7 秒的值，速度也取它在 10.7 秒的速度 —— 正片接过去时镜头正往下压，序章最后不再先停住再被拽下去
        const KE = [[10.0, [-4, 15, 17], [0, 0, 0.5]], [11.0, [-2.8, 8.2, 11.5], [-3.6, 0, 2.2]]], dd = 0.004;
        const camAt = tt => { E.camPath(tt, KE); return E.camera.position.clone(); }, lookAt = tt => V(...KE[0][2]).lerp(V(...KE[1][2]), ease(seg(tt, KE[0][0], KE[1][0])));
        const vP = camAt(10.7 + dd).sub(camAt(10.7 - dd)).multiplyScalar(0.5 / dd), vL = lookAt(10.7 + dd).sub(lookAt(10.7 - dd)).multiplyScalar(0.5 / dd);
        const endP = camAt(10.7), endL = lookAt(10.7);
        // 大标题时拉高 → 跟着 Damo 走过去 → 出拳时推近看清这一拳 → 骰子飞出去以后边升高边往后拉（24.82 那一帧还在往上走），
        // 在半空划一道弧、往前往下落进正片的镜头：升 → 落的掉头是一条弧线，不会在最高点停住（转角速度最大约 41°/秒）
        const K = [[19.3, CPC2, CLC2, VPUSH], [21.0, [-2.6, 6.2, 14.2], [-1.8, 2.9, 1.0]], [22.3, [-2.0, 4.8, 12.6], [-3.0, 1.6, 2.4]],
          [23.5, [-2.4, 3.1, 10.4], [-5.0, 1.1, 4.3]], [SH + 0.15, [-2.5, 3.0, 10.2], [-5.0, 1.1, 4.3]],
          [24.82, [-2.6, 8.0, 12.75], V(-5.0, 1.1, 4.3).lerp(endL, 0.6).toArray(), [[-1.3, 10.6, 3.4], null]], [ML0, endP.toArray(), endL.toArray(), [vP.toArray(), vL.toArray()]]];
        // 关键帧挪到新时间；22.3 这一帧的切线写死成原来的（前后两帧在旧时间里的中心差分），从这里到结尾和原来逐帧一样
        K[2][3] = [1, 2].map(w => K[3][w].map((v, i) => (v - K[1][w][i]) / (K[3][0] - K[1][0])));
        K.forEach(k => { k[0] = mm(k[0]); });
        const [cp, cl] = spline(on, K, V); E.camera.position.copy(cp); E.camera.lookAt(cl);
        shakeCam((rt(19.5) >= 0 ? 0.08 * (1 - seg(on, mm(19.5), mm(19.5) + 0.35)) : 0) + (o >= SH ? 0.1 * (1 - seg(o, SH, SH + 0.3)) : 0));
      }
      // ⑤ 大标题；Damo 一拳打碎大骰子；四个人「噗」地变成四颗棋子，接正片
      const TT0 = mm(19.5), TT1 = mm(22.2, false);   // 大标题（新时间）：砸下来的回弹 0.4、淡入 0.15 按真实时长
      const ttl = E.show('otitle', 'otitle dtl', `<h1><small>亚马逊云科技 User Group</small><span>云上大亨</span></h1><div class="slog osub">令人怀念的经典桌游玩法，<em>搬到云上</em></div>`, seg(on, TT0, TT0 + 0.15) * (1 - seg(on, TT1 - 0.6, TT1 - 0.2)), `translateX(-50%) scale(${(1.4 - 0.4 * easeBack(seg(on, TT0, TT0 + 0.4))).toFixed(3)})`);   // 从 1.4 倍砸下来（原来 2.2 倍半透明铺满全屏，上面一行落进上黑边、大字横压在三个人脸上）
      { const sb = ttl.querySelector('.osub'); if (sb) sb.style.opacity = seg(on, TT0 + 0.45, TT0 + 0.75).toFixed(3); }   // 副标题晚约 0.5 秒淡入：等镜头升过金币山上韩叔的头顶，不横穿他的墨镜
      ttl.style.top = '70px';   // 11/09 去掉遮幅：大标题一直在原来的 70（加遮幅时黑边还在的那 0.9 秒整体往下 64、跟着上黑边往上收）
      // 海报：标题两边各两个「大笑 / 开心」头像，紧跟着标题一个接一个砸下来（从 1.45 倍、往上 70px 回弹落定，错开 0.03–0.08），停住后轻轻浮动，和标题一起退场。
      // 摆在标题框（465–1455）外面：标题砸下来、缩到 1 倍（19.65）以后头像才出来，不和标题叠在一起。
      // 左边两个早一点退（21.6 / 21.68 起）：大骰子 21.8 起从左上角落下来，正好从这两个头像的位置经过，先让开
      [['han_darkhead', 338, 190, -9, 0, 21.6], ['chong_exp_happy', 150, 396, 8, 0.08, 21.68], ['damo_exp_laugh', 1582, 190, 9, 0.04, 21.8], ['yuki_exp_happy', 1770, 396, -8, 0.12, 21.8]].forEach(([nm, x, y, r, d, e00], j) => { const p = pic(nm), t0 = mm(19.62 + d), e0 = mm(e00), e1 = e0 + (e00 < 21.8 ? 0.3 : 0.4); if (!p || on < t0 || on > e1) return;   // 时刻换成新时间，弹出、退场按真实时长
        const k = seg(on, t0, t0 + 0.36), a = seg(on, t0, t0 + 0.12) * (1 - seg(on, e0, e1)), s = (1.45 - 0.45 * easeBack(k)) * (1 - 0.15 * seg(on, e0, e1)), live = seg(on, t0 + 0.36, t0 + 0.6);
        const rr = r * (0.6 + 0.4 * easeBack(k)) + Math.sin((on - t0) * 3.3 + j * 1.6) * 2.5 * live, dy = -70 * (1 - easeBack(k)) + Math.sin((on - t0) * 2.7 + j * 1.1) * 6 * live;
        E.show('ttl' + j, 'oface lg', `<i style="--c:${FC[p.who]}"><b style="background-image:url(${p.src})"></b></i>`, a, `translate(${x}px,${(y + dy).toFixed(1)}px) translate(-50%,-50%) rotate(${rr.toFixed(2)}deg) scale(${s.toFixed(3)})`); });
      if (o >= 21.8 && o < SH) { const u = seg(o, 22.0, 22.7), bb = u < 0.2 ? Math.cos(seg(o, 21.8, 22.14) * Math.PI / 2) : 0.5 * Math.abs(Math.cos(u * Math.PI * 2.5)) * Math.pow(1 - u, 1.7);   // 第一下 21.8 起落、22.14 着地（原来 22.0 起、0.14 内落 6）；弹起只有原来的一半
        P.bigDie.visible = true; P.bigDie.position.set(BIGD.x, BIGD.y + bb * 6, BIGD.z); P.bigDie.rotation.set(0.12 * (1 - u), 0.5 + (1 - u) * 1.2, 0); const sq2 = u >= 1 ? 0 : (bb < 0.05 ? 0.15 * (1 - u) : 0); P.bigDie.scale.set(1 + sq2, 1 - sq2, 1 + sq2);
        if (o >= SH - 0.22) P.bigDie.position.x += Math.sin(o * 90) * 0.03; }
      if (o >= SH) { const tau = o - SH, kk = 1 - seg(o, SH + 0.12, SH + 0.4); P.shards.visible = kk > 0;
        P.shards.children.forEach((m, i) => { const dd = m.userData.o, v = dd.clone().normalize().multiplyScalar(2.4 + (i % 5) * 0.35).add(V(0.8, 1.6, -0.8));
          m.position.set(BIGD.x + dd.x * 0.5 + v.x * tau, BIGD.y + dd.y * 0.5 + v.y * tau - 4.9 * tau * tau, BIGD.z + dd.z * 0.5 + v.z * tau); m.rotation.set(tau * (6 + i), tau * (4 + i % 3), 0); m.scale.setScalar(Math.max(0.001, kk)); });
        const u = seg(o, SH, SH + 0.4); E.shockwave('dsm', BIGD.x, BIGD.z, 0.4 + u * 4, 0.9 * (1 - u), 0xffb020);
        if (P.fist) { const fu = seg(o, SH, SH + 0.34); P.fist.visible = fu < 1; const fs = (0.45 + 0.6 * easeOut(seg(o, SH, SH + 0.1))) * (1 + 0.12 * fu);   // 拳头特效从骰子里冲出来（不要大过骰子、挡住 Damo 的脸）
          P.fist.position.copy(BIGD).add(V(0.3, 0.4, 0)).lerp(E.camera.position, 0.12); P.fist.scale.set(fs * P.fist.userData.ar, fs, 1); P.fist.material.opacity = 1 - seg(o, SH + 0.2, SH + 0.34); }
        E.camera.updateMatrixWorld(true); const q = BIGD.clone().add(V(0.4, 1.8, 0)).project(E.camera);
        E.show('pow', 'pow', '一拳！', Math.min(1, seg(o, SH, SH + 0.05)) * (1 - seg(o, SH + 0.33, SH + 0.43)), `translate(${((q.x + 1) / 2 * 1920).toFixed(0)}px,${((1 - q.y) / 2 * 1080).toFixed(0)}px) translate(-50%,-50%) rotate(-8deg) scale(${(0.4 + 0.6 * easeBack(seg(o, SH, SH + 0.18))).toFixed(3)})`); }
      if (o >= SH) { const D1 = window.PROMO_FULL_DICE1; E.dice(D1.t0 + (o - SH), D1.t0, D1.t1, [3, 5], V(-3.4, 0, 2.2), DFROM, 1, D1.bo); }   // 参数和 promo_full.js 的 E.dice 覆盖是同一组（DICE1）：接缝 tt 10.7 两边一样
      const PF = SH + 0.3;
      // 11/05（L13 变棋子）：原来四个道具在烟里亮一下就地缩没，正片棋子在别处弹出来，看不出谁变成哪颗（王座上那颗大红棋子还和 Kinesis 格上的红棋子同时在画面里）。
      // 改成每个道具亮起来以后沿一道弧线飞到自己那颗正片棋子的站位（和 engine.js pawnAt 的站位一样），飞到了缩没、正片棋子在落点同时弹出来（溅一圈本色碎块 + 一圈本色冲击波）；
      // 韩叔的红棋子就是从王座飞到 Kinesis 变成正片红棋子的那一颗（同一颗，不再两颗同时在）。按玩家顺序（0 韩叔 1 虫虫 2 Damo 3 Yuki）错开 0.04 起飞，
      // 最后一颗 PF + 0.55 落地、弹出 PF + 0.73 弹完、碎块 PF + 0.79 落完：序章最后一帧（PF + 0.8）和正片 10.7 秒一样，只有四颗棋子
      const FLY = pl => { const f0 = PF + 0.15 + pl * 0.04; return [f0, f0 + 0.28]; };
      const PTO = [[0, 11], [1, 7], [2, 30], [3, 43]].map(([pl, at]) => { const c = top(at), off = [[-0.18, -0.18], [0.18, 0.18], [0.18, -0.18], [-0.18, 0.18]][pl]; return V(c.x + off[0], c.y, c.z + off[1]); });
      const ARC = (a, b, u, hk = 1) => { const w = smo(u), h = (1.1 + 0.13 * Math.hypot(b.x - a.x, b.z - a.z)) * hk; return a.clone().lerp(b, w).add(V(0, h * 4 * w * (1 - w), 0)); };   // 弧线：两头慢、中间快，拱起的高度跟飞的距离走
      const TRAIL = (a, b, u, col, s0, n = 3, gap = 0.06, hk = 1) => { if (u <= 0 || u >= 1) return; for (let j = 1; j <= n; j++) { const v = u - j * gap; if (v > 0) E.bit(ARC(a, b, v, hk), col, s0 * (1 - j * 0.66 / n)); } };   // 拖在后面的三颗本色小块（11/05（refine）：n 颗数、gap 间隔、hk 拱高倍数可调，不传和原来一样）
      // Yuki 的小伙伴：跟在他后面一颠一颠地跑进来（晚 0.16 出发，最后 0.2 减速停下），站到他脚边右前方；「立志赚钱」时跟着蹦，Damo 落地时一起被震开。
      // 走虫虫前面那条路（Yuki 是从虫虫身后绕过去的，小伙伴要是跟着走，一路都被虫虫和 Yuki 挡着看不见）。
      // 「噗」的时候在 Yuki 那团烟里蹦一下、亮一下、弹大，当 Yuki 的道具棋子，再缩没了（正片里 Yuki 的紫棋子同时弹出来）
      const bdy = P.pp.buddy, BO = V(0.86, 0, 0.2);
      // 11/10（名牌）：跟着 Yuki 晚到（BA–BL 按新时间）：和他一起出发、在他旁边一颠一颠地跑，「立志赚钱」出来那一刻（mm(15.9)）就站定——它走的那条路贴着画面下面，
      //   最后一段从字幕那一带上面经过，要在字幕淡入以前跑完；Yuki 还在半空、晚它 0.06 落地。颠的节奏跟着快 2 倍；站定、蹦、晃都从它停下的那一刻（BL）顺下来
      // 11/11（fixC）：跟着 Yuki 改成从画面右下角冲上来（起点在下沿以下，z 小于约 6.8 才露头，约 T 37.38 和 Yuki 一起冒出来），往左上一颠一颠地跑到他右前方；站位跟着往后挪（Y3s + BO2，脚底在「立志赚钱」那行字和右边头像上面），
      //   「又一颗流星？！」时它那一蹦（c6n+0.08–0.3）跳回原来的站位 Y3 + BO，之后和原来一样
      // 11/11（refine，评审：「蓝斗篷小跟班站定后压在 Yuki 右脚的靴子上」）：站位再往右 0.2（BO2 x 0.85 → 1.05）
      const BA = YA + 0.03, BL = mm(15.9) + 0.02, bph = (on - BA) * 30, BO2 = V(1.05, 0, 0.1), bbk = smo(seg(on, c6n + 0.08, c6n + 0.3));
      if (bdy && on >= BA && o < PF + 0.66) { const bu = seg(on, BA, BL), c0 = 0.8, bv = 2 / (1 + c0), buE = bu < c0 ? bv * bu : bv * c0 + bv * (bu - c0) - bv * (bu - c0) * (bu - c0) / (2 * (1 - c0));
        const runK = bu < 1 ? 1 - seg(bu, 0.84, 1) : 0, home = bbk < 1 ? Y3s.clone().add(BO2).lerp(Y3.clone().add(BO), bbk) : Y3.clone().lerp(YB, blow).add(BO);
        const p = bu < 1 ? bz(V(0.1, -0.04, 10.0), V(-0.3, -0.04, 5.6), Y3s.clone().add(BO2), buE) : home.clone().add(V(0, blowH * 0.8, 0));
        const bi = bu < 1 ? 0 : seg(on, BL, BL + 0.18) * (1 - seg(o, PF - 0.1, PF));   // 站定以后的小动作：隔一会儿原地颠一下、左右晃（真实时间）
        p.y += Math.abs(Math.sin(bph)) * 0.2 * runK + pump(2.1) * smo(seg(on, BL, BL + 0.15)) * 0.12 + bi * 0.07 * Math.pow(Math.max(0, Math.sin(tc * 4.6)), 4) + 0.1 * Math.sin(Math.PI * seg(on, c6n + 0.08, c6n + 0.3));
        const land = Math.sin(Math.PI * seg(on, BL - 0.02, BL + 0.14)) * 0.14, j = seg(o, PF, PF + 0.16), kin = seg(o, PF + 0.03, PF + 0.18);
        const [f0, f1] = FLY(3), fu = seg(o, f0, f1), kout = seg(o, f1 - 0.03, f1 + 0.08);   // 11/05（L13）：蹦一下、亮起来，再沿弧线飞到 Yuki 那颗紫棋子（43 格）的站位缩没
        if (o >= PF) { p.copy(home); p.y += Math.sin(Math.PI * j) * 0.25; if (fu > 0) { p.copy(ARC(home, PTO[3], fu)); TRAIL(home.clone().add(V(0, 0.3, 0)), PTO[3].clone().add(V(0, 0.3, 0)), fu, E.COLORS[3], 0.13, 7, 0.035); } }   // 11/05（refine）：拖尾 3 颗 → 7 颗、大一点（43 格在镜头外，要让人看出它是往右边飞走的）   // 原地蹦一下（它本来就站在 Yuki 那团烟里）
        const kEd = smo(seg(fu, 0.28, 0.42)), kk = Math.max(0.001, (1 + 0.25 * easeBack(kin)) * (1 - 0.55 * smo(fu)) * (1 - kout * kout) * (1 - kEd));   // 11/05（refine）：飞到画面右边缘（fu 约 0.35 越过边缘）就缩没，在边缘闪一下（见下面 bxf）
        bdy.visible = true; bdy.position.copy(p); bdy.userData.roll = Math.sin(bph) * 0.13 * runK + (o >= PF ? Math.sin((o - PF) * 9) * 0.08 : 0) + bi * 0.07 * Math.sin(tc * 2.3);
        bdy.scale.set(bdy.userData.w * kk * (1 + land * 0.5), bdy.userData.h * kk * (1 - land), 1);
        if (bu < 1) { const dv = E.camera.position.clone().sub(bdy.position), L = dv.length(), z = Math.min(2.0, L * 0.5), kz = (L - z) / L; bdy.position.addScaledVector(dv, z / L); bdy.scale.x *= kz; bdy.scale.y *= kz; }   // 11/05（refine）：Yuki 跑动时立牌往镜头挪了 1.6，小伙伴跟着挪 2.0（同样画面不变、只改深度），还是画在他腿前面，不被他挡住
        bdy.material.opacity = 1 - kout;
        // 11/05（refine）：43 格在镜头外，小伙伴是往右飞出画面的：飞到右边缘那一下，边缘亮一团紫光（白芯、fu 0.17–0.44 亮起、0.44–0.95 淡掉），位置取弧线上越过边缘那一点（fu 0.35）这一帧的投影，x 钉在画面右边
        const fa = seg(fu, 0.17, 0.44) * (1 - smo(seg(fu, 0.44, 0.95)));   // fu 每帧约走 0.1：亮起来约 2.5 帧，淡掉约 5 帧
        if (fa > 0.002) { E.camera.updateMatrixWorld(true); const pr = ARC(home, PTO[3], 0.35).project(E.camera), fy = Math.min(Math.max((1 - pr.y) / 2 * 1080, 70), 1010);   // 11/09：钳在画面上下各留 70 以内（原来钳在遮幅以内 160–920）
          E.show('bxf', 'bxf', '', fa, `translate(${(1920 - 30).toFixed(0)}px,${fy.toFixed(0)}px) translate(-50%,-50%) scale(${(0.6 + 0.6 * easeOut(seg(fu, 0.27, 0.7))).toFixed(3)})`); } bdy.material.emissiveIntensity = 0.5 + 1.1 * kin * (1 - seg(o, PF + 0.1, PF + 0.3)); }
      if (o >= PF) { [P.chong, P.yuki, P.damo, P.hanD].forEach(c2 => { c2.g.scale.setScalar(Math.max(0.001, 1 - easeOut(seg(o, PF, PF + 0.28)))); });
        [CB, YB, PUNCH, V(0, 0.6, -0.9)].forEach((p, kk) => { const pf = P.puffs[kk], u = seg(o, PF, PF + 0.6); pf.visible = u > 0 && u < 1; pf.position.copy(p).add(V(0, 0.9 + u * 0.6, 0)); pf.scale.setScalar((kk === 3 ? 4 : 2.4) * (0.6 + u)); pf.material.opacity = 0.9 * (1 - u); });
        P.throne.scale.setScalar(Math.max(0.001, 1 - easeOut(seg(o, PF + 0.08, PF + 0.33))));
        [[0, 11], [1, 7], [2, 30], [3, 43]].forEach(([pl, at]) => { const m = E.pawnAt(pl, at), f1 = FLY(pl)[1]; m.scale.setScalar(Math.max(0.001, easeBack(seg(o, f1 - 0.04, f1 + 0.18))));   // 11/05（L13）：道具飞到了才弹出来
          E.splash(f1 + (o - f1) * 2, f1, PTO[pl], E.COLORS[pl], 7); const u = seg(o, f1, f1 + 0.2); E.shockwave('pfw' + pl, PTO[pl].x, PTO[pl].z, 0.2 + 1.1 * u, u > 0 && u < 1 ? 0.85 * (1 - u) : 0, E.COLORS[pl]); });   // 碎块两倍速（0.24 落完），冲击波 0.2
        // 烟里先闪出各自的道具棋子（虫虫的笑脸徽章、Damo 的云朵棋子、韩叔的红棋子；Yuki 的小伙伴自己跳进烟里，见上面；虫虫站的地方正好在骰子落点前面，骰子从左后方滚过去，笑脸徽章放在她那团烟靠镜头的一侧、低一点，画面上在骰子下面，不挡骰子）：白光一亮、回弹放大，再缩没了，正片里同一个人的 3D 棋子（红 韩叔、蓝 虫虫、绿 Damo、紫 Yuki，依次晚 0.05 弹出来）同时在格子上弹出来
        // 11/05（L13）：亮起来以后沿弧线飞到自己那颗正片棋子上（kk = 玩家号），边飞边缩到和正片棋子差不多大，到了缩没；韩叔的红棋子 1.15 → 0.9（原来王座上那颗太大）
        [[P.pp.pf.chong, CB.clone().add(V(0.55, 0, 1.0)), 0.6, 1, 0.62, 0.75], [P.pp.pf.damo, PUNCH, 0.68, 2, 0.95, 0], [P.pp.pf.han, V(0, 0.6, -0.9), 0.9, 0, 0.95, 0]].forEach(([s, p0, hh, kk, up, sx]) => { if (!s) return;   // sx：往镜头右边挪（虫虫的笑脸徽章挪到骰子右下角外面，不压在滚过去的骰子上）
          const kin = seg(o, PF + 0.03, PF + 0.18), [f0, f1] = FLY(kk), fu = seg(o, f0, f1), kout = seg(o, f1 - 0.03, f1 + 0.08); if (kout >= 1) return;
          const tw = E.camera.position.clone().sub(p0).setY(0).normalize(), sc = hh * Math.max(0.001, (0.3 + 0.7 * easeBack(kin)) * (1 - (1 - 0.5 / hh) * smo(fu)) * (1 - kout * kout));
          const a = p0.clone().add(V(0, up + 0.25 * easeOut(kin), 0)).addScaledVector(tw, 0.45).add(V(tw.z * sx, 0, -tw.x * sx)), b = PTO[kk].clone().add(V(0, 0.45, 0));   // 落到棋子的身子上
          const hk = kk === 2 ? 0.3 : 1;   // 11/05（refine）：Damo 的云朵飞到 30 格（画面顶边），原来拱高 2.5 左右，51.65–51.8 飞出上边缘；压到三成，一路在画面里
          s.visible = true; s.position.copy(ARC(a, b, fu, hk)); s.scale.set(sc * s.userData.ar, sc, 1); TRAIL(a, b, fu, E.COLORS[kk], 0.1, 3, 0.06, hk);
          s.material.opacity = fin(seg(o, PF + 0.03, PF + 0.12)) * (1 - kout); s.material.color.setScalar(1 + 1.3 * (1 - seg(o, PF + 0.06, PF + 0.26)) + 1.2 * seg(o, f1 - 0.08, f1)); s.material.rotation = Math.sin((o - PF) * 9 + kk) * 0.08; }); }
      else P.throne.scale.setScalar(1);
      if (o >= 19.3) {
        // 进正片前星空和云海慢慢淡掉，背景回到正片的深蓝
        const fade = seg(o, 22.6, ML0);
        // three.js 按 transparent 编译着色器（不透明时 alpha 固定为 1），改了 transparent 要 needsUpdate：不然 19.3 之前已经按不透明画过的夜空球淡不掉，
        // 逐帧录的时候一直是满的，到 36.44 那一帧突然消失（只有直接跳到 19.3 以后才看得到淡出）；回到 19.3 之前再改回不透明，跳着 seek 和逐帧结果一样
        P.sky.visible = fade < 0.98; P.sky.children.forEach(m => { if (!m.material.transparent) { m.material.transparent = true; m.material.needsUpdate = true; } m.material.opacity = 1 - fade; });
        P.clouds.children.forEach(m => { m.material.opacity = (m.userData.o0 ??= m.material.opacity) * (1 - fade); });
        // 背景色和网格也跟着淡：原来在 fade 过半那一帧，背景从夜空的深色一下换成正片的深蓝 + 两团光、地面网格一下冒出来
        const mix = (a, b) => Math.round(a + (b - a) * fade);
        P.stage.style.background = fade >= 1 ? '' : `radial-gradient(1100px 760px at 10% 6%,rgba(236,114,17,${(0.22 * fade).toFixed(3)}),transparent 62%),radial-gradient(900px 640px at 40% 96%,rgba(140,79,255,${(0.16 * fade).toFixed(3)}),transparent 64%) rgb(${mix(3, 11)},${mix(5, 17)},${mix(12, 28)})`;
        // 淡入期间网格不写深度（11/05 复核）：它 renderOrder −1 最先画，opacity 只有 0.003 时看不见，却已经写了深度，把后面的星云和星星按网格线的形状挖穿，背景一帧之内冒出一张深色网格；淡完再写深度，和正片一样
        if (P.grid) { P.grid.visible = fade > 0; P.grid.material.opacity = 0.55 * fade; P.grid.material.depthWrite = fade > 0.98; }
      } else { P.sky.children.forEach(m => { m.material.opacity = 1; if (m.material === P.skyM && m.material.transparent) { m.material.transparent = false; m.material.needsUpdate = true; } }); P.clouds.children.forEach(m => { if (m.userData.o0 != null) m.material.opacity = m.userData.o0; }); }
    }
  }
  window.PROMO_OPEN2 = { run, reset };
  // 开播前额外预跑的时刻（engine.js 的预热只按 0.5 秒一格跑）：云海淡回夜空（mo 2.0–2.3）时云的材质切成半透明，三盏撞击点光源 mo 2.1 才关，
  // 这两种组合正好夹在 7.5 和 8.0 两格中间，没预跑过，播放到 T≈7.52、7.63 现编译 4 个着色器，实时播放卡 0.1–0.18 秒。换成视频秒：T = (mo + PRO + 0.8) / 0.8（promo_full 的 O0、PLAY 都是 0.8）
  if (window.PROMO_SCRIPT) PROMO_SCRIPT.warm = [2.06, 2.2].map(mo => +((mm(mo) + PRO + 0.8) / 0.8).toFixed(4));   // mo 是旧时间，先换成新时间
})();
