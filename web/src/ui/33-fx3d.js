import { AWSI } from '../data/icons.js';
import { _t, _tf } from '../core/01-i18n-runtime.js';
import { $, BOT, CLK, SIM, rnd, shuffle } from '../core/02-util.js';
import { S } from '../engine/07-state.js';
import { PHONE_MQ } from './10-modal.js';
import { CARD_COL } from './11-cards-deeds.js';
import { PIPS } from './27c-center.js';
import { animK } from './28-setup-save.js';
import { sfx } from './32-sfx.js';
import { aiTurn, isAI } from '../engine/36-ai.js';
import { MP } from '../net/40-host-sync.js';
// ================= 3D 动画（Three.js）：掷骰子、抽卡 =================
export const FX = {
  jobs: [], tickers: [],   // 正在播的 run 动画、每帧函数，都由 loop() 推进
  ok() { return !this.dead && !BOT && !SIM && typeof THREE !== 'undefined' && !matchMedia('(prefers-reduced-motion: reduce)').matches; },
  init() {
    if (this.r) return true;
    try {
      const c = document.createElement('canvas'); c.id = 'fx3d'; document.body.appendChild(c);
      this.r = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: true }); this.r.setPixelRatio(Math.min(2, devicePixelRatio));
      this.scene = new THREE.Scene(); this.cam = new THREE.PerspectiveCamera(40, 1, 0.1, 100); this.cam.position.set(0, 0, 12);
      this.scene.add(new THREE.AmbientLight(0xffffff, 0.75)); const dl = new THREE.DirectionalLight(0xffffff, 0.9); dl.position.set(3, 5, 8); this.scene.add(dl);
      // 改画布尺寸会把画面清空：循环停着的时候（比如领奖台停在最后一帧）要补画一遍，不然转屏、拖窗口以后 3D 柱子就没了
      const fit = () => { this.r.setSize(innerWidth, innerHeight, false); c.style.width = innerWidth + 'px'; c.style.height = innerHeight + 'px'; this.cam.aspect = innerWidth / innerHeight; this.cam.updateProjectionMatrix(); this.redraw(); };
      fit(); addEventListener('resize', fit);
      return true;
    } catch (e) { this.dead = true; return false; }
  },
  // 屏幕坐标 → z=0 平面上的世界坐标
  world(x, y) { this.cam.updateMatrixWorld(); const v = new THREE.Vector3(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1, 0.5).unproject(this.cam).sub(this.cam.position).normalize(); return this.cam.position.clone().add(v.multiplyScalar(-this.cam.position.z / v.z)); },
  // 一段 dur 毫秒的动画：每帧调一次 step(k)，k 从 0 走到 1。所有 run 和星火、tickers 共用 loop() 一个渲染循环，每帧都推进完了只画一遍；
  // 以前每段 run 各开一个 requestAnimationFrame、各画各的，架构联合收费这种几段一起播的，同一帧要整屏重画好几遍
  // 切到后台时 requestAnimationFrame 停了，靠 setTimeout 兜底收尾，免得游戏（联机时是整桌）卡在等动画
  // 动画某一帧出错也要收尾（只吞这一帧的错），不然 await 永远不返回，整局卡住
  // 页面在后台时 rAF 不跑：直接当成「已经播完」，别再等 dur+400ms 的兜底。
  // 以前房主切到后台，每一跳都白等 400ms，而 moveSteps 在 await 它，全桌跟着慢：10 格从 1.5s 变成 5.5s。
  // 走棋逻辑只用动画的起点和终点，跳过中间帧是安全的；状态、事件照常推进。
  run(dur, step) {
    if (document.hidden) { this.jobStep({ step }, 1); return Promise.resolve(); }   // 这一帧出错照旧记一笔（jobStep 里会 console.error），别悄悄吞掉
    return new Promise(res => { const j = { t0: performance.now(), dur, step, res }; this.jobs.push(j); this.jobStep(j, 0); CLK.set(dur + 400).then(() => { if (this.jobs.includes(j)) { this.jobEnd(j); this.redraw(); } }); this.loop(); });
  },
  jobStep(j, k) { try { j.step(k); } catch (e) { if (!this.runErr) { this.runErr = 1; console.error(e); } } },
  jobEnd(j) { const i = this.jobs.indexOf(j); if (i < 0) return; this.jobs.splice(i, 1); this.jobStep(j, 1); j.res(); },
  // 删了物体、换了棋子这种一次性的改动马上补画一遍，和同一时刻网页上的改动（DOM 棋子藏起来、露出来）同一帧上屏；每帧都要画的交给 loop()
  redraw() { try { this.r.render(this.scene, this.cam); } catch (e) { } },
  // 共用的渲染循环：推进各段 run、星火和 tickers（每帧函数，返回 false 就移除），然后整屏画一遍；全都播完就停，最后这一帧已经把收掉的东西擦干净了
  loop() {
    if (this.looping) return; this.looping = true; let last = performance.now();
    const frame = now => {
      const dt = Math.min(0.05, Math.max(0, now - last) / 1000); last = now; let alive = 0;
      this.jobs.slice().forEach(j => { const k = (now - j.t0) / j.dur; if (k >= 1) this.jobEnd(j); else this.jobStep(j, Math.max(0, k)); });
      try { alive = this.sparkStep(dt); } catch (e) { }
      const ts = this.tickers; this.tickers = [];   // 先换成新数组：每帧函数里再登记的新函数不会丢
      ts.forEach(f => { let keep = false; try { keep = f(dt) !== false; } catch (e) { if (!this.runErr) { this.runErr = 1; console.error(e); } } if (keep) this.tickers.push(f); });
      try { this.r.render(this.scene, this.cam); } catch (e) { }
      if (this.jobs.length || alive || this.tickers.length) requestAnimationFrame(frame); else this.looping = false;
    };
    requestAnimationFrame(frame);
  },
  clear(objs) { objs.forEach(o => { this.scene.remove(o); o.traverse && o.traverse(m => { if (m.geometry) m.geometry.dispose(); if (m.material) [].concat(m.material).forEach(x => { if (x.map) x.map.dispose(); x.dispose(); }); }); }); this.redraw(); },
  tex(draw, w = 256, h = 256) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; },
  pipTex(n) {
    return this.tex((g, w) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, w); g.strokeStyle = '#16191f'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, w - 10);
      const P = { 1: [[.5, .5]], 2: [[.25, .25], [.75, .75]], 3: [[.25, .25], [.5, .5], [.75, .75]], 4: [[.25, .25], [.75, .25], [.25, .75], [.75, .75]], 5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]], 6: [[.25, .22], [.75, .22], [.25, .5], [.75, .5], [.25, .78], [.75, .78]] }[n];
      g.fillStyle = n === 1 ? '#ec7211' : '#16191f'; P.forEach(([x, y]) => { g.beginPath(); g.arc(x * w, y * w, w * 0.085, 0, Math.PI * 2); g.fill(); });
    });
  },
  // 掷骰子：模拟人从自己这边（屏幕下方）把两颗骰子扔上桌。从正上方看桌面，骰子朝上那面就是我们看到的正面：
  // 出手后在空中翻，落桌弹一下、再轻轻弹两下（每下更低），离桌面越高看起来越大、影子越远越淡；
  // 落桌后贴着桌面往前滚，滚多远翻多少面（不打滑），被摩擦拖着越滚越慢，最后在一个面上晃一晃停稳，歪的角度慢慢回正。
  // 落定后换回平面骰子，正面就是掷出的点数
  // 掷骰子（照宣传片 mp4 里的骰子）：在棋盘中间骰子那块叠一个小的 three.js 画面，镜头从斜上方往下看桌面，
  // 两颗有光照和阴影的骰子从你这边扔出去，弹三下、一下比一下低，三个方向一直翻、越翻越慢，停下时带一点歪；
  // 落定后淡出，换回平面骰子显示点数。跑不了 WebGL 就用下面的 CSS 版（diceCss）
  // 3D 骰子的画布、渲染器、灯光、贴图和两颗骰子：第一次掷的时候建，开局预热（warm）也会提前建好。
  // 画布一建出来就放到屏幕外：#dice3d 没有别的样式，提前建又不设的话，会以 300×150 待在页面末尾把页面撑高
  diceInit() {
    if (this.dz) return this.dz;
    const c = document.createElement('canvas'); c.id = 'dice3d'; c.style.cssText = 'position:fixed;left:-9999px;top:0;pointer-events:none'; document.body.appendChild(c);
    const R = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: true }); R.setPixelRatio(Math.min(2, devicePixelRatio)); R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    sc.add(new THREE.HemisphereLight(0xffffff, 0x8a96a8, 1.7));
    const sun = new THREE.DirectionalLight(0xffffff, 1.7); sun.position.set(-3, 9, 5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 }); sun.shadow.bias = -0.0008; sc.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.22 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; sc.add(ground);
    // 骰子贴图：白底圆角面，一点是红色（和宣传片一样）
    const face = v => { const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'); g.fillStyle = '#d9dde3'; g.fillRect(0, 0, S, S); g.fillStyle = '#fff'; g.beginPath(); g.roundRect(6, 6, S - 12, S - 12, 44); g.fill();
      const P = { 1: [[.5, .5]], 2: [[.27, .27], [.73, .73]], 3: [[.25, .25], [.5, .5], [.75, .75]], 4: [[.27, .27], [.73, .27], [.27, .73], [.73, .73]], 5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]], 6: [[.27, .23], [.73, .23], [.27, .5], [.73, .5], [.27, .77], [.73, .77]] }[v];
      g.fillStyle = v === 1 ? '#d13212' : '#16191f'; P.forEach(([x, y]) => { g.beginPath(); g.arc(x * S, y * S, v === 1 ? 30 : 22, 0, Math.PI * 2); g.fill(); });
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
    const mats = [1, 6, 2, 5, 3, 4].map(v => new THREE.MeshStandardMaterial({ map: face(v), roughness: 0.35 }));   // +x -x +y -y +z -z
    // 先转出朝上的面、最后绕竖轴歪一点（YXZ）；默认的 XYZ 会让 3、4 点那一面斜着插进桌面
    const dice = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mats); m.rotation.order = 'YXZ'; m.castShadow = true; sc.add(m); return m; });
    return (this.dz = { c, R, sc, cam, dice });
  },
  async dice(d) {
    if (BOT || SIM) return;
    // 后台标签页 rAF 不跑，3D 骰子也画不出来：直接跳过，别让 doRoll 卡在这里等动画
    if (document.hidden) return;
    // 手机布局的主按钮固定在屏幕底部，玩家常是滚到下面看完玩家卡再点掷骰子，骰子和走棋都画在屏幕外，只看到「结算中…」。
    // 轮到本机真人掷时先把棋盘顶部滚进来：必须瞬间滚，下面只量一次骰子的位置，滚动途中量会画歪；电脑和别人掷不拉，免得打断正在往下看的人
    if (PHONE_MQ.matches && S && S.players && !isAI(S.cur) && (MP.role === 'client' ? S.cur === MP.mySeat : !MP.isRemote(S.cur))) {
      const b = $('#board').getBoundingClientRect();
      if (b.top < 0 || b.top > innerHeight * 0.5) scrollTo(0, scrollY + b.top - 8);
    }
    sfx('dice');
    const host = document.querySelector('#center .dice');
    if (!host || !this.ok() || typeof THREE === 'undefined' || this.diceDead) return this.diceCss(d);
    const r = host.getBoundingClientRect(); if (!r.width) return this.diceCss(d);
    try {
      const W = Math.round(Math.max(300, r.width * 3)), H = Math.round(Math.max(200, r.height * 3));
      this.diceInit();
      const { c, R, sc, cam, dice } = this.dz, gen = this.diceGen = (this.diceGen || 0) + 1;   // 上一次还没收尾就又掷了（联机收到新一掷），旧的收尾不能把这次的画面藏掉
      c.style.cssText = `position:fixed;left:${Math.round(r.left + r.width / 2 - W / 2)}px;top:${Math.round(r.top + r.height / 2 - H / 2)}px;width:${W}px;height:${H}px;z-index:9;pointer-events:none;opacity:1;transition:none`;
      R.setSize(W, H, false); cam.aspect = W / H;
      // 镜头距离按骰子在屏幕上的大小算：落定时一颗骰子大约和平面骰子一样大
      const dieH = r.height, dist = (H / dieH) / (2 * Math.tan(cam.fov * Math.PI / 360)) * 1.32;   // 斜着看，顶面加侧面比正面看大，镜头拉远一点，落定时和平面骰子一样大
      cam.position.set(0, dist * 0.8, dist * 0.6); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      // 落定的位置照平面骰子的实际位置算：pj 把世界坐标投到画布像素，pxU 是骰子那个高度上 1 个世界单位多少像素（约 dieH / 1.26，不是 dieH）
      const pj = v => { const p = new THREE.Vector3(...v).project(cam); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; }, c0 = pj([0, 0.5, 0]), pxU = pj([1, 0.5, 0])[0] - c0[0];
      c.style.top = Math.round(r.top + r.height / 2 - c0[1]) + 'px';
      const FACE = { 1: [0, 0, Math.PI / 2], 6: [0, 0, -Math.PI / 2], 2: [0, 0, 0], 5: [Math.PI, 0, 0], 3: [-Math.PI / 2, 0, 0], 4: [Math.PI / 2, 0, 0] };
      // gapWide 是原来的固定间距（转起来两颗碰不到），gapEnd 是两颗平面骰子中心距的一半；翻得快时用宽的，越翻越慢越收拢，停下落在平面骰子上。
      // gapEnd 至少 0.7：再窄的话两颗快停时还在晃，会互相穿过去（现在的版面量出来是 0.73～0.77）
      const dr = [...host.querySelectorAll('.die')].map(e => e.getBoundingClientRect()), gapWide = (r.width / dieH) * 0.5 - 0.5 + 0.55;
      const gapEnd = Math.max(0.7, dr.length === 2 ? ((dr[1].left + dr[1].width / 2) - (dr[0].left + dr[0].width / 2)) / 2 / pxU : ((r.width / dieH) * 0.5 - 0.5) * dieH / pxU), spin = [[9, 7, 11], [12, 5, 13]], yaw = [-0.14 - Math.random() * 0.1, 0.12 + Math.random() * 0.12];
      // 3D 骰子播的时候，中间区域可能被重画好几次（棋子开始走、日志更新），每次重画出来的平面骰子都要藏着，播完再露出来
      this.diceOn = true; host.classList.add('hid3d'); this.diceSkip = false; this.diceSpin = true;
      const T = (aiTurn() ? 900 : 1300) * animK(), t0 = performance.now(), easeOut = k => 1 - Math.pow(1 - k, 3);
      // 切到后台时 requestAnimationFrame 会停，游戏不能卡在这里等动画：最多等 T + 0.5 秒
      await new Promise(res => {
        let done = false; const fin = () => { if (!done) { done = true; res(); } };
        CLK.set(T + 500).then(fin);
        const tick = now => {
          if (done) return;
          const u = this.diceSkip ? 1 : Math.min(1, (now - t0) / T);   // 点了跳过：直接画落定的样子
          dice.forEach((m, n) => {
            const g = gapEnd + (gapWide - gapEnd) * (1 - u), fx = n ? g : -g, fz = n ? 0.15 : -0.12, e = easeOut(u);
            m.position.x = fx - (4 - n) * (1 - e); m.position.z = (fz + 3.2) * (1 - e);
            m.position.y = 0.5 + Math.abs(Math.cos(u * Math.PI * 2.5)) * Math.pow(1 - u, 1.6) * 2.6;
            const f = FACE[d[n] || 1], sp = Math.pow(1 - u, 2.2);
            m.rotation.set(f[0] + sp * spin[n][0], f[1] + yaw[n] + sp * spin[n][1], f[2] + sp * spin[n][2]);
          });
          R.render(sc, cam);
          if (u < 1) requestAnimationFrame(tick); else fin();
        };
        requestAnimationFrame(tick);
      });
      await new Promise(res => setTimeout(res, this.diceSkip ? 80 : (aiTurn() ? 180 : 260) * animK()));
      this.diceSpin = false; if (gen !== this.diceGen) return;
      this.diceOn = false; document.querySelectorAll('#center .dice.hid3d').forEach(e => e.classList.remove('hid3d')); c.style.transition = 'opacity .22s'; c.style.opacity = '0';
      setTimeout(() => { if (gen === this.diceGen) c.style.left = '-9999px'; }, 260);
    } catch (e) {   // WebGL 建不起来：把建了一半的画布删掉，以后都用 CSS 骰子，不然每掷一次页面底部多一个空 canvas
      this.diceOn = false; this.diceSpin = false; document.querySelectorAll('#center .dice.hid3d').forEach(el => el.classList.remove('hid3d'));
      if (this.dz) { try { this.dz.R.dispose(); } catch (_) { } } document.querySelectorAll('canvas#dice3d').forEach(el => el.remove()); this.dz = null; this.diceDead = true; return this.diceCss(d);
    }
  },
  async diceCss(d) {
    if (BOT || SIM) return;
    const els = [...document.querySelectorAll('#center .dice .die')];
    if (els.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    els[0].parentNode.classList.remove('rolling');   // 落定后换回的平面骰子不要再播旧的转圈动画
    const pips = n => Array.from({ length: 9 }, (_, k) => `<i class="${PIPS[n].includes(k) ? 'on' : ''}"></i>`).join('');
    const T = (aiTurn() ? 1000 : 1400) * animK(), AIR = 0.26, STOP = 0.86, N = 120;
    this.diceSkip = false; this.diceSpin = true;
    // 速度曲线：空中匀速飞，落桌后被摩擦拖慢，STOP 时停住；积分得到「已经走了多少」（0→1）
    const prog = (() => { const sp = Array.from({ length: N + 1 }, (_, j) => { const t = j / N; return t < AIR ? 1 : t < STOP ? 0.62 * Math.pow(1 - (t - AIR) / (STOP - AIR), 1.7) : 0; }); const acc = [0]; for (let j = 1; j <= N; j++) acc.push(acc[j - 1] + (sp[j - 1] + sp[j]) / 2); return t => acc[Math.round(Math.min(1, t) * N)] / acc[N]; })();
    // 离桌面的高度（以骰子边长为单位）：出手时在手的高度，抛物线落桌，再弹两下
    const hgt = t => t < AIR ? 0.55 + 1.1 * (t / AIR) - 1.65 * Math.pow(t / AIR, 2) : t < 0.42 ? 0.3 * Math.sin((t - AIR) / (0.42 - AIR) * Math.PI) : t < 0.52 ? 0.08 * Math.sin((t - 0.42) / 0.1 * Math.PI) : t < 0.58 ? 0.02 * Math.sin((t - 0.52) / 0.06 * Math.PI) : 0;
    const list = els.map((el, k) => {
      const n = d[k] || 1, rest = shuffle([1, 2, 3, 4, 5, 6].filter(x => x !== n)), sz = el.getBoundingClientRect().width;
      const w = document.createElement('div'); w.className = 'dwrap rolling3d'; w.style.setProperty('--ds', sz + 'px');
      w.innerHTML = `<div class="dshadow"></div><div class="dcube">${['fr', 'bk', 'rt', 'lf', 'tp', 'bt'].map((pos, j) => `<div class="die ${pos}">${pips([n, ...rest][j])}</div>`).join('')}</div>`;
      el.replaceWith(w);
      // 从下方偏左 / 偏右扔出：往上走的距离决定往前翻几个面，横向的偏移带一点侧翻
      const sy = sz * (2.6 + Math.random() * 0.9), sx = (k ? 1 : -1) * sz * (0.25 + Math.random() * 0.45);
      const faces = Math.max(2, Math.round(sy / sz)) + rnd(2), side = Math.abs(sx) > sz * 0.5 ? (sx > 0 ? -90 : 90) : 0;
      return { w, el, n, cube: w.querySelector('.dcube'), sh: w.querySelector('.dshadow'), sz, sx, sy, roll: 90 * faces, side, yaw: (k ? 1 : -1) * (14 + Math.random() * 22), delay: k * 55, rock: (Math.random() < 0.5 ? 1 : -1) * (6 + Math.random() * 5) };
    });
    const t0 = performance.now();
    await new Promise(res => {
      const tick = now => {
        let all = true;
        list.forEach(x => {
          const t = this.diceSkip ? 1 : Math.min(1, Math.max(0, (now - t0 - x.delay) / T)); if (t < 1) all = false;
          const left = 1 - prog(t), h = hgt(t);
          // 停下前在一个面上晃一晃（阻尼摆动），落定时回到 0
          const u = t > STOP - 0.06 ? Math.min(1, (t - STOP + 0.06) / (1 - STOP + 0.06)) : 0, rock = u ? x.rock * Math.sin(u * Math.PI * 2.5) * Math.pow(1 - u, 1.6) : 0;
          x.cube.style.transform = `translate(${x.sx * left}px, ${x.sy * left}px) scale(${1 + h * 0.22}) rotateZ(${x.yaw * Math.pow(left, 0.8)}deg) rotateX(${-x.roll * left + rock}deg) rotateY(${x.side * left}deg)`;
          x.sh.style.transform = `translate(${x.sx * left + 3 + h * x.sz * 0.28}px, ${x.sy * left + 4 + h * x.sz * 0.34}px) scale(${1 + h * 0.18}) rotate(${x.yaw * Math.pow(left, 0.8)}deg)`;
          x.sh.style.opacity = String(Math.max(0.06, 0.26 - h * 0.2)); x.sh.style.filter = `blur(${3 + h * 7}px)`;
        });
        if (!all && list[0].w.isConnected) requestAnimationFrame(tick); else res();
      };
      requestAnimationFrame(tick);
      CLK.set(T + 900).then(res);   // 切到后台时 requestAnimationFrame 停了，也要收尾
    });
    this.diceSpin = false;
    list.forEach(x => { x.el.innerHTML = pips(x.n); x.el.setAttribute('aria-label', _tf(3819, "{$0} 点", x.n)); if (x.w.isConnected) x.w.replaceWith(x.el); });
  },
};

// ---------- 3D 棋子跳格、金币飞过去、升级光柱、获胜彩带 ----------
Object.assign(FX, {
  rectOf(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; },
  unit() { const a = this.world(0, 0), b = this.world(100, 0); return (b.x - a.x) / 100; },   // 每个屏幕像素是多少世界单位
  // 棋子：开始移动时生成，每走一格跳一下，走完消失，DOM 棋子再出现。
  // 起点和终点都对准 DOM 棋子（格子左上角那颗圆点）的位置：起步时从圆点大小长出来，落地后缩回圆点大小再换回去，两头都不跳
  pawnStart(p) {
    if (!this.ok() || !this.init()) return false;
    if (this.pawn) { this.clear([this.pawn.g]); this.pawn = null; }
    const cell = $('#sq' + p.pos); if (!cell) return false;
    const u = this.unit(), r = this.rectOf(cell), h = Math.min(r.w, r.h) * 0.55 * u;
    const tokEl = [...cell.querySelectorAll('.toks .pawn')].find(e => e.style.getPropertyValue('--pc').trim() === p.color), tk = tokEl ? this.rectOf(tokEl) : r;
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(p.color), roughness: 0.35, metalness: 0.1 });
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.32, h * 0.38, h * 0.16, 24), mat); base.position.y = h * 0.08;
    const body = new THREE.Mesh(new THREE.ConeGeometry(h * 0.26, h * 0.62, 24), mat); body.position.y = h * 0.47;
    const head = new THREE.Mesh(new THREE.SphereGeometry(h * 0.19, 20, 16), mat); head.position.y = h * 0.86;
    g.add(base, body, head); g.rotation.x = 0.5; this.scene.add(g);
    const s0 = tokEl ? Math.max(0.25, Math.min(1, tk.h * u / (h * 0.95))) : 1;   // 圆点相对 3D 棋子的大小
    const w = this.world(tk.x, tk.y); g.position.set(w.x, w.y - h * 0.3 * s0, 0); g.scale.setScalar(s0);   // 棋子的原点在底座，缩小时也要让中心对准圆点
    // 路过的格子落在哪：圆点是贴着格子左上角竖着排的，取格子里第一颗圆点离左上角多远（上下排、左右列格子长宽不一样，不能用离中心的偏移）
    const f0 = cell.querySelector('.toks .pawn'), fr = f0 ? this.rectOf(f0) : r;
    this.pawn = { g, h, s0, grow: true, vis: s0, off: { x: fr.x - (r.x - r.w / 2), y: fr.y - (r.y - r.h / 2) } }; this.redraw(); return true;
  },
  // 棋子要落的屏幕位置：终点格里有占位圆点就落在占位上，路过的格子落在左上角第一颗圆点的位置
  slot(pos) {
    const cell = $('#sq' + pos); if (!cell) return null;
    const gh = cell.querySelector('.toks .pawn.ghost'); if (gh) return this.rectOf(gh);
    const r = this.rectOf(cell), o = this.pawn ? this.pawn.off : { x: r.w / 2, y: r.h / 2 };
    return { ...r, x: r.x - r.w / 2 + Math.min(o.x, r.w / 2), y: r.y - r.h / 2 + Math.min(o.y, r.h / 2) };
  },
  async pawnHop(pos, ms, lift = 0.9) {
    if (!this.pawn) return;
    const sl = this.slot(pos); if (!sl) return;
    const P = this.pawn, to = this.world(sl.x, sl.y), g = P.g, h = P.h, grow = P.grow; P.grow = false;
    const fx = g.position.x, fy = g.position.y, ty = to.y - h * 0.3;
    await this.run(ms, k => {
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, sc = grow ? P.s0 + (1 - P.s0) * Math.min(1, k * 1.6) : 1; P.vis = sc;
      g.position.set(fx + (to.x - fx) * e, fy + (ty - fy) * e + Math.sin(k * Math.PI) * h * lift, 0);
      g.scale.set(sc * (1 + Math.sin(k * Math.PI) * 0.08), sc * (1 - Math.sin(k * Math.PI) * 0.05 + (k > 0.9 ? -0.12 * (1 - k) * 10 : 0)), sc);
    });
  },
  async pawnEnd() {
    const P = this.pawn; if (!P) return; this.pawn = null;
    const s1 = P.g.scale.x, cy = P.g.position.y + P.h * 0.3 * s1;
    if (s1 > P.s0 + 0.01) await this.run(130, k => { const e = k * k * (3 - 2 * k), sc = s1 + (P.s0 - s1) * e; P.g.scale.set(sc, sc, sc); P.g.position.y = cy - P.h * 0.3 * sc; });   // 缩回圆点大小再换成 DOM 棋子
    this.clear([P.g]);
  },
  // 金币：从付钱的人飞到收钱的人（玩家卡片或棋盘中间）
  // 付钱（照宣传片的金币）：一枚接一枚从付钱的一方飞到收钱的一方，走一道弧线、边飞边翻；距离越远弧越高
  coins(fromEl, toEl, n = 6, spread = 0) {
    if (!this.ok() || !this.init() || !fromEl || !toEl) return Promise.resolve();
    const a = this.rectOf(fromEl), b = this.rectOf(toEl), u = this.unit(), s = 13 * u;
    const wa = this.world(a.x, a.y), wb = this.world(b.x, b.y), dist = Math.hypot(b.x - a.x, b.y - a.y), lift = Math.min(170, 40 + dist * 0.32) * u;
    const geo = new THREE.CylinderGeometry(s, s, s * 0.26, 28), mat = new THREE.MeshStandardMaterial({ color: 0xffc23d, metalness: 0.2, roughness: 0.35, emissive: 0xb86a00, emissiveIntensity: 0.55 });   // 没有环境贴图，金属感太强会发黑
    const cs = Array.from({ length: n }, (_, k) => { const m = new THREE.Mesh(geo, mat); m.userData = { d: k * 65, jx: (Math.random() - 0.5) * (24 + spread) * u, jy: (Math.random() - 0.5) * (24 + spread) * u, sp: 8 + Math.random() * 6 }; m.visible = false; this.scene.add(m); return m; });
    const fly = 620, total = fly + n * 65;
    return this.run(total, K => cs.forEach(m => {
      const k = Math.max(0, Math.min(1, (K * total - m.userData.d) / fly)); m.visible = k > 0 && k < 1;
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, arc = Math.sin(k * Math.PI);
      m.position.set(wa.x + (wb.x - wa.x) * e + m.userData.jx * arc, wa.y + (wb.y - wa.y) * e + arc * lift + m.userData.jy * arc, 1 + arc * 1.2);
      m.rotation.set(Math.PI / 2 + k * m.userData.sp, k * 3, 0);
    })).then(() => { cs.forEach(m => this.scene.remove(m)); geo.dispose(); mat.dispose(); this.redraw(); });
  },
  // 升级（照宣传片）：一块玩家颜色的小方块从上方落到格子上，弹一下，地上一圈尘
  block(i, color = '#ec7211') {
    if (!this.ok() || !this.init()) return;
    const cell = $('#sq' + i); if (!cell) return;
    const r = this.rectOf(cell), u = this.unit(), w = this.world(r.x, r.y), sz = Math.min(r.w, r.h) * 0.4 * u;
    const m = new THREE.Mesh(new THREE.BoxGeometry(sz, sz, sz), new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.45, metalness: 0.05, emissive: new THREE.Color(color), emissiveIntensity: 0.35, transparent: true }));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(sz * 0.8, sz * 0.06, 8, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0, depthWrite: false }));
    m.position.set(w.x, w.y, 6); ring.position.set(w.x, w.y, 0.3); this.scene.add(m, ring); sfx('buy');
    const hz = k => k < 0.55 ? 6 * (1 - Math.pow(k / 0.55, 2)) : k < 0.8 ? 1.1 * Math.sin((k - 0.55) / 0.25 * Math.PI) : 0;
    this.run(1150, k => {
      const fall = Math.min(1, k / 0.75); m.position.z = 0.4 + hz(fall); m.rotation.set(0.6 * (1 - fall), 0.8 * (1 - fall), 0.3 * (1 - fall));
      const q = Math.max(0, (k - 0.4) / 0.4); ring.scale.setScalar(0.6 + q * 1.1); ring.material.opacity = q > 0 && q < 1 ? 0.6 * (1 - q) : 0;
      m.material.opacity = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
    }).then(() => this.clear([m, ring]));
  },
  // 免疫（照宣传片）：玩家站的那一格上罩一个半透明蓝色护盾，弹出来、亮一下、淡掉
  shield(i) {
    if (!this.ok() || !this.init()) return;
    const cell = $('#sq' + i); if (!cell) return;
    const r = this.rectOf(cell), u = this.unit(), w = this.world(r.x, r.y), rad = Math.max(r.w, r.h) * 0.52 * u, g = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(rad, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
    const wire = new THREE.Mesh(new THREE.SphereGeometry(rad * 1.002, 18, 7, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x8cc8ff, transparent: true, opacity: 0.55, wireframe: true, depthWrite: false }));
    g.add(dome, wire); g.rotation.x = Math.PI / 2; g.position.set(w.x, w.y, 0.2); this.scene.add(g); sfx('magic');
    const back = k => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
    this.run(1400, k => { g.scale.setScalar(Math.max(0.001, back(Math.min(1, k / 0.25)))); g.rotation.z = k * 0.8; const o = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1; dome.material.opacity = 0.18 * o + (k < 0.35 ? 0.15 * Math.sin(k / 0.35 * Math.PI) : 0); wire.material.opacity = 0.55 * o; }).then(() => this.clear([g]));
  },
  // 架构联合收费（照宣传片）：一条橙色光管把架构里的服务依次连起来，上面跑着光点，收完淡掉
  arcs(parts, color = '#ff9900') {
    if (!this.ok() || !this.init() || !parts || parts.length < 2) return;
    const u = this.unit(), pts = parts.map(i => $('#sq' + i)).filter(Boolean).map(el => { const r = this.rectOf(el), w = this.world(r.x, r.y); return new THREE.Vector3(w.x, w.y, 0.4); });
    if (pts.length < 2) return;
    const path = [pts[0]];
    for (let k = 1; k < pts.length; k++) { const a = pts[k - 1], b = pts[k], m = a.clone().lerp(b, 0.5), d = b.clone().sub(a); m.add(new THREE.Vector3(-d.y, d.x, 0).multiplyScalar(0.18)); m.z = 1.2 + d.length() * 0.08; path.push(m, b); }
    const curve = new THREE.CatmullRomCurve3(path), geo = new THREE.TubeGeometry(curve, 200, 3.2 * u, 10, false);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    const tube = new THREE.Mesh(geo, mat), dots = [0, 1, 2].map(() => new THREE.Mesh(new THREE.SphereGeometry(6 * u, 16, 10), new THREE.MeshBasicMaterial({ color: 0xfff1d6, transparent: true, depthWrite: false })));
    this.scene.add(tube, ...dots); const cnt = geo.index.count;
    this.run(1700, k => {
      geo.setDrawRange(0, Math.floor(cnt * Math.min(1, k / 0.35) / 60) * 60);
      dots.forEach((d, n) => { d.visible = k > 0.35; if (!d.visible) return; const at = ((((k - 0.35) * 1.4 + n / 3) % 1) + 1) % 1; d.position.copy(curve.getPointAt(at)); d.material.opacity = k > 0.8 ? (1 - k) / 0.2 : 1; });
      mat.opacity = k > 0.8 ? 0.9 * (1 - k) / 0.2 : 0.9;
    }).then(() => this.clear([tube, ...dots]));
  },
  // 买下（照宣传片的 splash）：格子上溅起一小撮玩家颜色的碎块，落回去
  splash(i, color = '#ec7211') {
    if (!this.ok() || !this.init()) return;
    const cell = $('#sq' + i); if (!cell) return;
    const r = this.rectOf(cell), u = this.unit(), w = this.world(r.x, r.y), sz = Math.min(r.w, r.h) * 0.11 * u;
    const geo = new THREE.BoxGeometry(sz, sz, sz), mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.4, emissive: new THREE.Color(color), emissiveIntensity: 0.3, transparent: true });
    const ps = Array.from({ length: 12 }, (_, k) => { const m = new THREE.Mesh(geo, mat); const a = k / 12 * Math.PI * 2 + Math.random() * 0.4, sp = (0.5 + Math.random() * 0.6) * Math.min(r.w, r.h) * u; m.userData = { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 3 + Math.random() * 2, rs: Math.random() * 10 }; m.position.set(w.x, w.y, 0.5); this.scene.add(m); return m; });
    this.run(700, k => { ps.forEach(m => { const d = m.userData; m.position.set(w.x + d.vx * k, w.y + d.vy * k, 0.5 + d.vz * k - 5 * k * k); m.rotation.set(k * d.rs, k * d.rs * 0.7, 0); }); mat.opacity = k > 0.6 ? (1 - k) / 0.4 : 1; }).then(() => { ps.forEach(m => this.scene.remove(m)); geo.dispose(); mat.dispose(); this.redraw(); });
  },
  // 攻击被挡下（照宣传片的 shockwave）：一圈红色冲击波撞到护盾上散开
  shock(i, color = '#ff3b30') {
    if (!this.ok() || !this.init()) return;
    const cell = $('#sq' + i); if (!cell) return;
    const r = this.rectOf(cell), u = this.unit(), w = this.world(r.x, r.y), rad = Math.max(r.w, r.h) * 0.5 * u;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rad, rad * 0.06, 8, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    ring.position.set(w.x, w.y, 0.6); this.scene.add(ring);
    this.run(650, k => { ring.scale.setScalar(0.4 + k * 1.6); ring.material.opacity = 0.9 * (1 - k); }).then(() => this.clear([ring]));
  },
  // 拿走奖池（照宣传片）：金币先从奖池里炸开，再一枚枚飞到拿钱的人那里
  burst(fromEl, toEl, n = 20) { return this.coins(fromEl, toEl, n, 140); },
  // 升级：格子上升起一道光柱和几圈光环
  rise(i, color = '#ec7211') {
    if (!this.ok() || !this.init()) return;
    const cell = $('#sq' + i); if (!cell) return;
    const r = this.rectOf(cell), u = this.unit(), w = this.world(r.x, r.y), rad = Math.min(r.w, r.h) * 0.35 * u;
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.5, rad, r.h * 1.4 * u, 32, 1, true), mat); beam.position.set(w.x, w.y, 0.5); beam.rotation.x = 0.35;
    const rings = [0, 1, 2].map(k => { const m = new THREE.Mesh(new THREE.TorusGeometry(rad, rad * 0.06, 8, 48), mat.clone()); m.position.set(w.x, w.y, 0.6); m.userData.k = k; this.scene.add(m); return m; });
    this.scene.add(beam); sfx('buy');
    this.run(900, k => { beam.scale.set(1, Math.min(1, k * 3), 1); mat.opacity = 0.55 * (1 - k); rings.forEach(m => { const q = Math.max(0, k * 1.6 - m.userData.k * 0.25); m.scale.setScalar(0.6 + q); m.material.opacity = Math.max(0, 0.7 * (1 - q)); }); }).then(() => this.clear([beam, ...rings]));
  },
  // 抽卡（three.js）：读出窗口里那张卡的文字和图标画成贴图，卡背从牌堆飞到那张卡的位置、翻面、迸光点，落定后换成网页里的真卡
  async dealIn() {
    const d = document.querySelector('#modal .deal.fx'); if (!d) return;
    const done = () => { d.classList.remove('fx'); d.classList.add('fxin'); };
    if (!this.ok() || !this.init()) { d.classList.remove('fx'); return; }   // 跑不了 WebGL：退回 CSS 发牌动画
    try {
      // 照宣传片的竖卡画：圆角、彩色边框和标题栏、大图标、大标题、效果、免疫框、知识点；卡背是深色网格 + 彩色边框 + 大图标
      const kind = ['inc', 'rei', 'fis'].find(k => d.classList.contains(k)) || 'inc', fr = d.querySelector('.face.front .pcard') || d.querySelector('.face.front'), rect = fr.getBoundingClientRect();
      if (!rect.width) return done();
      if (rect.width > rect.height) { d.classList.remove('fx'); return; }   // 手机横屏的横卡：贴图是按竖卡排版画的，横着会叠字，退回 CSS 发牌动画
      const col = CARD_COL[kind];
      const load = src => new Promise(res => { if (!src) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
      const [hero, head, backIcon] = await Promise.all([load((fr.querySelector('img.hero') || {}).src), load((fr.querySelector('.ph img') || {}).src), load(AWSI[kind === 'rei' ? 'reinvent' : 'health'])]);
      if (!d.isConnected) return;
      const W = 756, H = Math.round(W * rect.height / rect.width), F = '-apple-system,"PingFang SC","Hiragino Sans GB",sans-serif';
      const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
      // 正面照网页卡面的实际排版画：各块的位置、底色、边框取自 getBoundingClientRect / getComputedStyle，每个字用 Range 量出它在网页卡上的位置，
      // 用网页同样的字体、字号、颜色画在同一处。断行（英文单词不拆开、中文标点不放行首）、保留卡的换行和灰字都和网页一样，免疫、知识点再长也不截；
      // 翻完换成网页卡的那 0.2 秒淡出两层字对得上，不出双影。以前按固定字号、固定行数自己逐字断行，和网页排版对不上。
      // dealIn 运行时 .deal 还带着 .fx（visibility:hidden、transform:none），量到的就是卡落定后的位置
      const k = W / rect.width, at = r => [(r.left - rect.left) * k, (r.top - rect.top) * k, r.width * k, r.height * k];
      const fcs = getComputedStyle(fr), fb = parseFloat(fcs.borderTopWidth) * k || 12, frr = parseFloat(fcs.borderTopLeftRadius) * k || 34;
      const front = this.tex((g, w, h) => {
        g.fillStyle = fcs.backgroundColor; rr(g, 0, 0, w, h, frr); g.fill(); g.save(); rr(g, 0, 0, w, h, frr); g.clip();
        for (const el of fr.querySelectorAll('*')) {
          const cs = getComputedStyle(el), [x, y, bw, bh] = at(el.getBoundingClientRect()), b = parseFloat(cs.borderTopWidth) * k;
          if (!bw || !bh) continue;
          if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') { g.fillStyle = cs.backgroundColor; g.fillRect(x, y, bw, bh); }
          if (b) { g.strokeStyle = cs.borderTopColor; g.lineWidth = b; g.strokeRect(x + b / 2, y + b / 2, bw - b, bh - b); }
          const im = el.classList.contains('hero') ? hero : el.tagName === 'IMG' && el.closest('.ph') ? head : null; if (im) g.drawImage(im, x, y, bw, bh);
        }
        const rg = document.createRange(), tw = document.createTreeWalker(fr, NodeFilter.SHOW_TEXT);
        for (let n; (n = tw.nextNode());) {
          const cs = getComputedStyle(n.parentElement), s = n.data; g.font = `${cs.fontStyle} ${cs.fontWeight} ${parseFloat(cs.fontSize) * k}px ${cs.fontFamily}`; g.fillStyle = cs.color;
          // 竖直方向按基线放：网页里一个字的框是字体的上沿到下沿，基线在框中线往下 (ascent - descent) / 2；用 canvas 的 middle 会整体高出一两个像素
          const fm = g.measureText(s), bl = (fm.fontBoundingBoxAscent - fm.fontBoundingBoxDescent) / 2;
          for (let i = 0; i < s.length;) {
            const L = s.codePointAt(i) > 0xffff ? 2 : 1, ch = s.substr(i, L); rg.setStart(n, i); rg.setEnd(n, i + L); i += L;
            const q = ch.trim() && rg.getClientRects()[0]; if (!q || !q.width) continue;   // 空白和折叠掉的空格不画
            let x = (q.left - rect.left) * k;
            // 网页把行首、相邻的全角标点压成半个字宽时，canvas 画出来还是整字宽：把字形居中放进网页给的那半格，不然括号会压到后面的字上
            if (/[\u2018-\u201f\u3000-\u303f\uff00-\uffef]/.test(ch)) { const m = g.measureText(ch), dw = q.width * k; if (m.width > dw + 1) x += dw / 2 - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2; }
            g.fillText(ch, x, ((q.top + q.bottom) / 2 - rect.top) * k + bl);
          }
        }
        g.restore(); g.strokeStyle = col; g.lineWidth = fb; rr(g, fb / 2, fb / 2, w - fb, h - fb, Math.max(0, frr - fb / 2)); g.stroke();
      }, W, H);
      const back = this.tex((g, w, h) => {
        g.fillStyle = '#0b111c'; rr(g, 0, 0, w, h, 34); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 2; for (let x = 0; x < w; x += 36) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 36) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
        g.strokeStyle = col; g.lineWidth = 12; rr(g, 6, 6, w - 12, h - 12, 30); g.stroke();
        if (backIcon) g.drawImage(backIcon, w / 2 - 120, h / 2 - 200, 240, 240);
        g.fillStyle = '#fff'; g.font = `800 62px ${F}`; g.textAlign = 'center'; g.fillText(kind === 'inc' ? _t(291, "Health 事件") : kind === 'fis' ? _t(2749, "FIS 故障注入") : 're:Invent', w / 2, h / 2 + 140);
      }, W, H);
      const u = this.unit(), geo = new THREE.PlaneGeometry(rect.width * u, rect.height * u), card = new THREE.Group();
      const bm = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: back, transparent: true })), fm = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: front, transparent: true }));
      fm.rotation.y = Math.PI; card.add(bm, fm); this.scene.add(card);
      const c = $('#fx3d'); c.style.zIndex = 11;
      const deck = $(kind === 'rei' ? '#center .stack.rei' : '#center .stack.inc'), dr = deck ? deck.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight, width: 0, height: 0 };
      const from = this.world(dr.left + dr.width / 2, dr.top + dr.height / 2), to = this.world(rect.left + rect.width / 2, rect.top + rect.height / 2);
      await this.run(460, k => { const e = 1 - Math.pow(1 - k, 3); card.position.set(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e + Math.sin(k * Math.PI) * 0.8, e * 0.6); card.rotation.set(-0.25 * (1 - e), 0, (1 - e) * 0.5); card.scale.setScalar(0.3 + e * 0.7); });
      const N = 110, pg = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), vel = [], pc = { inc: '#e7157b', rei: '#ffb02e', fis: '#ff5b45' }[kind];
      for (let k = 0; k < N; k++) { pos.set([to.x, to.y, 1], k * 3); const a = Math.random() * Math.PI * 2, sp = 2.5 + Math.random() * 4.5; vel.push([Math.cos(a) * sp, Math.sin(a) * sp, (Math.random() - 0.5) * 2]); }
      pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: new THREE.Color(pc), size: 0.16, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      this.scene.add(pts);
      await this.run(560, k => {
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        card.rotation.y = Math.PI * e; card.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.07); card.position.z = 0.6 * (1 - k) + Math.sin(k * Math.PI) * 0.6;
        if (k > 0.45) { const t = (k - 0.45) / 0.55; pts.material.opacity = 1 - t * 0.6; for (let j = 0; j < N; j++) { pos[j * 3] = to.x + vel[j][0] * t * 0.9; pos[j * 3 + 1] = to.y + vel[j][1] * t * 0.9 - t * t * 0.8; pos[j * 3 + 2] = 1 + vel[j][2] * t; } pg.attributes.position.needsUpdate = true; }
      });
      if (!d.isConnected) { this.clear([card, pts]); c.style.zIndex = ''; return; }
      done();
      await this.run(200, k => { [bm, fm].forEach(m => { m.material.opacity = 1 - k; }); pts.material.opacity = 0.4 * (1 - k); });
      this.clear([card, pts]); c.style.zIndex = '';
    } catch (e) { done(); $('#fx3d') && ($('#fx3d').style.zIndex = ''); }
  },
});



