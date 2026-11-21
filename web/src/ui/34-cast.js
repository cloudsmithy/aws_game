import { CAST_ART } from '../data/cast-art.js';
import { _t, _tf, _tr } from '../core/01-i18n-runtime.js';
import { $, COLORS, esc, rnd, shuffle, unesc } from '../core/02-util.js';
import { SQ } from '../rules/03-services.js';
import { S } from '../engine/07-state.js';
import { animK } from './28-setup-save.js';
import { sfx } from './32-sfx.js';
import { FX } from './33-fx3d.js';
// ================= 角色立牌：飞行、User Group 活动里的四个人（韩叔、虫虫、Damo、Yuki，每局随机分给座位） =================
// 图是宣传片角色设定图（tools/promo/assets/sprites）里挑的几张，缩到人物身高 320 像素；半透明的边换成旁边不透明处的颜色、透明处也铺上邻近颜色，
// 深色夜空和白棋盘上都不出白边黑边，贴图缩小（mipmap）时也不会把底色拉进来；压成 webp 内嵌。
// 每张：[图, 宽, 高（都按人物身高算 1）, 号码牌的水平位置（相对图宽，-0.5..0.5，对准头顶）, 画里人物脸朝哪（1 右、-1 左、0 正面或图上有字，不镜像）]
// 人物身高（世界单位，原来几何体小人约 1.9）：韩叔算上王冠，Yuki 比虫虫高一点
const CAST_H = { han: 2.1, chong: 1.9, damo: 1.9, yuki: 2.0 };
// 每局开局把四个人随机分给座位（S.cast，跟着存档和联机状态走，整局不变）；老存档没有就按 1 号韩叔、2 号虫虫、3 号 Damo、4 号 Yuki
const CAST_WHO = ['han', 'chong', 'damo', 'yuki'];
const castOf = seat => (S && Array.isArray(S.cast) && CAST_WHO.includes(S.cast[seat]) ? S.cast[seat] : CAST_WHO[seat]) || 'han';
export function dealCast(n) { const a = shuffle([...CAST_WHO]); return a.slice(0, Math.max(1, Math.min(4, n))); }

// ---------- 宣传片同款特效：角色立牌、法阵、光柱、流星尾巴、星火（飞行、User Group 活动用） ----------
const EZ = { back: k => 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2), sine: k => (1 - Math.cos(Math.PI * k)) / 2, smooth: k => k * k * (3 - 2 * k), out3: k => 1 - Math.pow(1 - k, 3), in2: k => k * k };
const clamp01 = k => Math.max(0, Math.min(1, k));
Object.assign(FX, {
  // 每个座位一个人物（开局随机分，见 dealCast；老存档按 1 号韩叔、2 号虫虫、3 号 Damo、4 号 Yuki）：一张面朝镜头的立牌，每段动画随机挑一张图，头顶挂写着玩家名字的名牌。
  // holder 放进场景、摆位置和大小（原点在脚底）；frame(场合, 朝向) 换图，要朝的方向和画里相反就左右镜像；pose() 每帧调，管蹦跳、压扁、摇摆
  // 每个人的贴图只解码、上传一次（按人物存，不按座位）：开局随机分人物后换了座位也不用重新传 GPU
  castTex(who) {
    this._ct = this._ct || {};
    if (this._ct[who]) return this._ct[who];
    const A = CAST_ART[who], tex = {};
    // 图片异步解码，解码完才标记上传；ready 等这个人的图全部解码完（预热时等它，再一起传 GPU）。解码失败的就等 onload，还不行就是透明的，不报错
    const ready = Promise.all(Object.keys(A).map(n => {
      const im = new Image(), t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; tex[n] = t; im.src = A[n][0];
      const ok = () => { if (im.naturalWidth) t.needsUpdate = true; else im.onload = () => { t.needsUpdate = true; }; };
      return (im.decode ? im.decode() : new Promise(r => { im.onload = im.onerror = r; })).then(ok, ok);
    }));
    return (this._ct[who] = { tex, ready });
  },
  // 头顶的名牌：玩家颜色的圆角条、白字写名字（名字长就缩字号，最多 12 个字）。每次播动画前按当前名字重画（中途改过名也对得上）
  nameTex(seat) {
    const q = S && S.players && S.players[seat], name = q ? unesc(q.name) : _tf(4634, "玩家 {$0}", seat + 1), col = (q && q.color) || COLORS[seat] || '#232f3e';
    const c = document.createElement('canvas'), g = c.getContext('2d'), H = 128, F = '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    let fs = 64; g.font = `bold ${fs}px ${F}`; while (g.measureText(name).width > 520 && fs > 36) { fs -= 4; g.font = `bold ${fs}px ${F}`; }
    const W = Math.min(600, Math.max(H, Math.ceil(g.measureText(name).width) + 72)); c.width = W; c.height = H;
    g.font = `bold ${fs}px ${F}`; g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 10;
    g.beginPath(); g.roundRect ? g.roundRect(5, 5, W - 10, H - 10, (H - 10) / 2) : g.rect(5, 5, W - 10, H - 10); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, W / 2, H / 2 + 3, W - 48);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { t, a: W / H };
  },
  chibi(seat) {
    this.cast = this.cast || [];
    const who = castOf(seat);
    if (this.cast[seat] && this.cast[seat].who === who) return this.cast[seat];
    if (this.cast[seat]) { const o = this.cast[seat]; if (o.holder.parent) o.holder.parent.remove(o.holder); o.card.geometry.dispose(); o.card.material.dispose(); if (o.badge.material.map) o.badge.material.map.dispose(); o.badge.material.dispose(); }
    const A = CAST_ART[who], names = Object.keys(A), Hh = CAST_H[who], { tex, ready } = this.castTex(who);
    const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);   // 原点在脚底
    // 不受光照，颜色和设定图一样；半透明的边走混合，alphaTest 把全透明的地方丢掉，不挡后面的人
    const mat = new THREE.MeshBasicMaterial({ map: tex[names[0]], transparent: true, alphaTest: 0.02 });
    const card = new THREE.Mesh(geo, mat), R = new THREE.Group(), holder = new THREE.Group(); R.add(card); holder.add(R);   // R 管蹦跳压扁，号码牌不跟着压扁
    const col = COLORS[seat] || '#232f3e';
    const badge = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })); badge.renderOrder = 5; holder.add(badge);
    const setName = () => { const m = badge.material; if (m.map) m.map.dispose(); const n = this.nameTex(seat); m.map = n.t; m.needsUpdate = true; badge.scale.set(0.34 * n.a, 0.34, 1); };
    setName();
    let cur = '', bx = 0, by = 0, popAt = 0, pick = names[0], last = '';
    const api = { holder, badge, card, tex, ready, who,
      // 每段动画开头调一次：从这个人的几张图里随机挑一张（尽量不和上一段一样），这段动画里一直用它；顺便按现在的名字重画名牌
      shuffle() { const pool = names.filter(n => n !== last); pick = pool[rnd(pool.length)] || names[0]; last = pick; setName(); },
      // kind 是场合（起飞、飞行、落地、UG），现在只用来区分调用处，用哪张图由 shuffle 定；f：要朝哪边（1 右、-1 左、0 不管）。同一张图不重复换
      frame(kind, f = 0) {
        const n = pick, a = A[n], m = f && a[4] && a[4] !== f ? -1 : 1, key = n + m;
        if (key === cur) return; if (cur) popAt = performance.now(); cur = key;
        mat.map = tex[n]; card.scale.set(a[1] * Hh * m, a[2] * Hh, 1);
        bx = a[3] * a[1] * Hh * m; by = a[2] * Hh + 0.28;   // 号码牌挂在这张图的头顶上
      },
      // bounce 往上蹦（世界单位）、squash 落地压扁（正数扁、负数拉长）、sway 以脚底为轴左右摇（弧度）。换图后 0.2 秒里鼓一下，盖住换图那一下
      pose({ bounce = 0, squash = 0, sway = 0 } = {}) {
        const pk = popAt ? Math.max(0, 1 - (performance.now() - popAt) / 200) : 0, pp = Math.sin(pk * Math.PI) * 0.08;
        R.position.y = bounce; R.rotation.z = sway; R.scale.set(1 + squash * 0.5 - pp * 0.5, 1 - squash + pp, 1);
        badge.position.set(bx, by * (1 - squash + pp) + bounce, 0.01);
      } };
    api.frame('joy'); api.pose();
    return (this.cast[seat] = api);
  },
  dotTex() { return this._dot || (this._dot = this.tex((g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.22, 'rgba(255,255,255,.8)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); }, 64, 64)); },
  // 法阵：两圈金线中间写一圈 Well-Architected 六大支柱，内圈刻度 + 六芒星，中心一团光
  magicTex() {
    return this._magic || (this._magic = this.tex((g, w) => {
      const c = w / 2; g.translate(c, c); g.strokeStyle = g.fillStyle = '#ffe2a8'; g.shadowColor = '#ffb347'; g.shadowBlur = 22;
      const ring = (r, lw) => { g.lineWidth = lw; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); };
      ring(c * 0.95, 7); ring(c * 0.84, 3); ring(c * 0.6, 5); ring(c * 0.53, 2); ring(c * 0.2, 4);
      const words = [..._t(4788, "卓越运营 ✦ 安全性 ✦ 可靠性 ✦ 性能效率 ✦ 成本优化 ✦ 可持续性 ✦ ")];
      g.font = `bold ${Math.round(c * 0.085)}px "PingFang SC", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      words.forEach((ch, k) => { g.save(); g.rotate(k / words.length * Math.PI * 2); g.fillText(ch, 0, -c * 0.72); g.restore(); });
      for (let k = 0; k < 72; k++) { g.save(); g.rotate(k / 72 * Math.PI * 2); g.lineWidth = k % 6 ? 2 : 5; g.beginPath(); g.moveTo(0, -c * 0.53); g.lineTo(0, -c * (k % 6 ? 0.48 : 0.43)); g.stroke(); g.restore(); }
      [0, Math.PI / 3].forEach(a0 => { g.lineWidth = 4; g.beginPath(); for (let k = 0; k <= 3; k++) { const a = a0 + k * Math.PI * 2 / 3 - Math.PI / 2; g[k ? 'lineTo' : 'moveTo'](Math.cos(a) * c * 0.53, Math.sin(a) * c * 0.53); } g.stroke(); });
      g.shadowBlur = 0; const gr = g.createRadialGradient(0, 0, 0, 0, 0, c * 0.55); gr.addColorStop(0, 'rgba(255,214,140,.6)'); gr.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, c * 0.55, 0, Math.PI * 2); g.fill();
    }, 1024, 1024));
  },
  ringTex() { return this._ring || (this._ring = this.tex((g, w) => { const r = g.createRadialGradient(w / 2, w / 2, w * 0.3, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.75, 'rgba(255,255,255,.95)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); }, 256, 256)); },
  beamTex() { return this._beam || (this._beam = this.tex((g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, 32, 256)); },
  streakTex() { return this._streak || (this._streak = this.tex((g, w, h) => { const gx = g.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, 'rgba(255,255,255,0)'); gx.addColorStop(0.75, 'rgba(255,255,255,.85)'); gx.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = gx; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'destination-in'; const gy = g.createLinearGradient(0, 0, 0, h); gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(0.5, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gy; g.fillRect(0, 0, w, h); }, 256, 64)); },
  glowMat(map, color) { return new THREE.MeshBasicMaterial({ map, color: new THREE.Color(color), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }); },
  // 法阵平躺在「桌面」上（绕 x 倒下去，看上去是个椭圆），m 是里面会转的那层
  magic(x, y, r, color = 0xffc861) { const g = new THREE.Group(), m = new THREE.Mesh(new THREE.PlaneGeometry(2 * r, 2 * r), this.glowMat(this.magicTex(), color)); g.add(m); g.rotation.x = -1.1; g.position.set(x, y, 0.05); g.renderOrder = 2; this.scene.add(g); return { g, m }; },
  shockRing(x, y, r, color = 0xffd27a) { const g = new THREE.Group(), m = new THREE.Mesh(new THREE.PlaneGeometry(2 * r, 2 * r), this.glowMat(this.ringTex(), color)); g.add(m); g.rotation.x = -1.1; g.position.set(x, y, 0.08); this.scene.add(g); return { g, m }; },
  pillar(x, y, r, h, color = 0xffd9a0) { const geo = new THREE.CylinderGeometry(r, r * 1.15, h, 40, 1, true); geo.translate(0, h / 2, 0); const m = new THREE.Mesh(geo, this.glowMat(this.beamTex(), color)); m.rotation.x = 0.32; m.position.set(x, y, 0.1); this.scene.add(m); return m; },
  streak(color = 0xffc46b) { const geo = new THREE.PlaneGeometry(1, 1); geo.translate(-0.5, 0, 0); const m = new THREE.Mesh(geo, this.glowMat(this.streakTex(), color)); this.scene.add(m); return m; },
  // 删掉特效物体：几何体和材质释放掉，共用的贴图留着下次用
  drop(objs) { objs.forEach(o => { if (!o) return; this.scene.remove(o); o.traverse(m => { if (m.geometry) m.geometry.dispose(); if (m.material && !m.isSprite) [].concat(m.material).forEach(x => x.dispose()); }); }); },
  // 星火：一个 Points 池子，按生命周期淡掉。顶点颜色带第 4 个分量 alpha，跟着一起淡：fx3d 是叠在网页上的透明画布，
  // 叠加混合连 alpha 也累加，只把颜色调暗的话 alpha 还留着，合成到白底上就是一颗颗灰黑点，之后每次重画都还在。
  // 没在用的星火（池子刚建好时的全部、死掉的）都挪到远平面外面，根本不画
  sparks() {
    if (this._sp) return this._sp;
    const n = 900, geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pos[i * 3 + 2] = -1e4;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.13, map: this.dotTex(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false; pts.renderOrder = 4; this.scene.add(pts);
    return (this._sp = { pts, P: Array.from({ length: n }, () => ({ life: 0 })), k: 0, live: 0 });
  },
  spark(x, y, z, vx, vy, vz, life, color, grav = -1.5) {
    const S = this.sparks(), q = S.P[S.k = (S.k + 1) % S.P.length];
    Object.assign(q, { x, y, z, vx, vy, vz, life, max: life, c: new THREE.Color(color), grav }); S.live = 1; this.loop();
  },
  // 推进星火（loop() 每帧调一次），返回还活着几颗；全死光、挪走以后就不再每帧改缓冲区
  sparkStep(dt) {
    const S = this._sp; if (!S || !S.live) return 0; let alive = 0;
    const pa = S.pts.geometry.attributes.position, ca = S.pts.geometry.attributes.color;
    S.P.forEach((q, i) => {
      if (q.life > 0) { q.life -= dt; q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; pa.setXYZ(i, q.x, q.y, q.z); ca.setXYZW(i, q.c.r, q.c.g, q.c.b, Math.max(0, q.life / q.max)); alive++; }
      else { pa.setXYZ(i, 0, 0, -1e4); ca.setXYZW(i, 0, 0, 0, 0); }
    });
    pa.needsUpdate = ca.needsUpdate = true; S.live = alive; return alive;
  },
  // 背景压暗成夜空（宣传片那种深蓝 + 星点），金色的法阵和流星在白底上看不见，压暗了才亮得起来
  dim(on) {
    let d = $('#fxdim'); if (!d) { d = document.createElement('div'); d.id = 'fxdim'; document.body.appendChild(d); void d.offsetWidth; }
    d.classList.toggle('on', on);
  },
  // 宣传片那样的大字标题：压暗时在画面上方浮出来，hi 那段用金色
  // atY：动画在屏幕上的高度（像素），在上半屏就把标题放到下面，别压住小人
  title(main, hi = '', sub = '', atY = innerHeight) {
    let t = $('#fxtitle'); if (!t) { t = document.createElement('div'); t.id = 'fxtitle'; document.body.appendChild(t); }
    t.innerHTML = `<b>${esc(main)}<em>${esc(hi)}</em></b>${sub ? `<span>${sub}</span>` : ''}`; t.classList.remove('on'); t.classList.toggle('low', atY < innerHeight * 0.42); void t.offsetWidth; t.classList.add('on');
    return () => t.classList.remove('on');
  },
  // 天外流星：从右上往左下划过几颗，拖着尾巴、掉一路星火；快档整体快一截（活得短、飞得快，路线不变）。
  // 返回收尾函数：飞行收尾时调一下，还没出场的不再出场，还在划的按真实时间 0.15 秒淡掉，不会拖到夜空撤掉以后的白棋盘上
  meteors(n = 6, spread = 900) {
    const K = animK(), u = this.unit(), ang = Math.PI + 0.62, v = 1500 * u / K, len = 260 * u; let stopAt = 0;
    for (let k = 0; k < n; k++) setTimeout(() => {
      if (stopAt) return;
      const p0 = this.world(innerWidth * (0.35 + Math.random() * 0.75), -innerHeight * 0.08 + Math.random() * innerHeight * 0.3), m = this.streak(0xffd7a0);
      let x = p0.x, y = p0.y, life = (0.9 + Math.random() * 0.4) * K; const L0 = life, s = 0.7 + Math.random() * 0.6;
      m.rotation.z = ang; m.scale.set(len * s, 26 * u * s, 1); m.position.set(x, y, -0.5);
      this.tickers = this.tickers || []; this.tickers.push(dt => {
        life -= dt; x += Math.cos(ang) * v * s * dt; y += Math.sin(ang) * v * s * dt; m.position.set(x, y, -0.5);
        // 收尾淡出按真实时间算：每帧的 dt 最多记 0.05 秒，掉帧时按 life 扣会拖长
        const f = stopAt ? 1 - (performance.now() - stopAt) / 150 : 1;
        m.material.opacity = 0.9 * Math.min(1, (L0 - life) * 6 / K) * Math.min(1, life * 3 / K) * Math.max(0, f);
        if (!stopAt && Math.random() < 0.6) this.spark(x, y, -0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, 0, 0.35, 0xffe2b0, 0);
        if (life <= 0 || f <= 0) { this.drop([m]); return false; }
      }); this.loop();
    }, k * spread / n + Math.random() * 120 * K);
    return () => { stopAt = stopAt || performance.now(); };
  },
  sparkBurst(x, y, n, colors, { speed = 2.6, up = 1.6, life = 0.9, grav = -3.2, z = 0.6 } = {}) {
    for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, s = speed * (0.35 + Math.random() * 0.65); this.spark(x, y, z, Math.cos(a) * s, Math.sin(a) * s * 0.45 + up * Math.random(), (Math.random() - 0.3) * 1.2, life * (0.6 + Math.random() * 0.6), colors[k % colors.length], grav); }
  },
  // 开局后空闲时把小人和特效先建好、着色器先编译、几何体和贴图先传 GPU，第一次飞的时候不卡。
  // 一口气做完桌面上要卡一两百毫秒、手机上三四百，所以拆成小片，一片只做一件事（画一张贴图、建一个人物、传一个人物的图……），
  // 片与片之间让出主线程；有 3D 动画在播就等它播完再接着做，别跟它抢帧
  warm() {
    if (this.warmed || !this.ok()) return; this.warmed = true;
    let ws, fx, k = 0; const vp = new THREE.Vector4(), sc = new THREE.Vector4(), NF = Math.max(...Object.values(CAST_ART).map(a => Object.keys(a).length));   // NF：一个人最多几张图
    // 用和正式场景一样的灯光编译，正式画的时候直接用；有 KHR_parallel_shader_compile 时在后台编，编好了才往下走
    const comp = o => this.r.compileAsync ? this.r.compileAsync(o, this.cam, ws) : this.r.compile(o, this.cam, ws);
    // 几何体和贴图第一次画的时候才上传 GPU（第一次画要卡一下），所以先偷偷画一遍：放进灯光一样的临时场景，
    // 只画进画布左下角 1 个像素，再把正式场景整个重画一遍盖掉。不画到离屏 RenderTarget：那样要按线性颜色输出再同步编一套着色器，反而更卡。
    // 平时藏着的部件也临时打开一起传；已经在正式场景里的（正在飞的人物）跳过
    const up = (o, place) => {
      if (o.parent) return; const R = this.r, st = R.getScissorTest(), hid = [];
      o.traverse(m => { if (!m.visible) { hid.push(m); m.visible = true; } }); if (place) place(o); ws.add(o); R.getViewport(vp); R.getScissor(sc);
      try { R.setViewport(0, 0, 1, 1); R.setScissor(0, 0, 1, 1); R.setScissorTest(true); R.render(ws, this.cam); }
      finally { R.setScissorTest(st); R.setScissor(sc); R.setViewport(vp); ws.remove(o); hid.forEach(m => { m.visible = false; }); R.render(this.scene, this.cam); }
    };
    const steps = [
      () => { if (!this.init()) return false; ws = new THREE.Scene(); const dl = new THREE.DirectionalLight(0xffffff, 0.9); dl.position.set(3, 5, 8); ws.add(new THREE.AmbientLight(0xffffff, 0.75), dl); },
      // 3D 骰子也先建好、编好着色器、传好贴图、画一遍，第一次掷不卡；已经掷过（或建不起来）就跳过。
      // 用一台单独的镜头，不动 dice() 的：它每掷只设一次镜头。建失败照 dice() 的做法收拾，以后用 CSS 骰子；这里自己 catch，不然后面小人和特效的预热也会停掉
      () => { if (this.dz || this.diceDead) return; let z; try { z = this.diceInit(); } catch (e) { if (this.dz) { try { this.dz.R.dispose(); } catch (_) { } } document.querySelectorAll('canvas#dice3d').forEach(el => el.remove()); this.dz = null; this.diceDead = true; return; }
        const cam = new THREE.PerspectiveCamera(30, 1.5, 0.1, 100), g0 = this.diceGen; cam.position.set(0, 8, 6); cam.lookAt(0, 0, 0);
        return Promise.resolve(z.R.compileAsync ? z.R.compileAsync(z.sc, cam) : z.R.compile(z.sc, cam)).then(() => { if (!this.diceOn && this.diceGen === g0) z.R.render(z.sc, cam); }); },   // 编译途中掷过骰子就不画，免得盖掉正在淡出的那一帧
      () => { this.magicTex(); },
      () => { this.ringTex(); this.beamTex(); this.streakTex(); this.sparks(); },
      // 人物立牌：等这个人的几张图解码完 → 编着色器 → 一片传一张图上 GPU（飞到一半换图时不用现传；手机上一张十来毫秒，一起传会卡一下）→ 偷画一遍
      ...[0, 1, 2, 3].flatMap(s => [() => this.chibi(s).ready, () => comp(this.chibi(s).holder),
        ...Array.from({ length: NF }, (_, j) => () => { const t = Object.values(this.chibi(s).tex)[j]; if (t && t.version && this.r.initTexture) this.r.initTexture(t); }),
        () => up(this.chibi(s).holder, H => { H.position.set(0, 0, 0); H.scale.setScalar(0.3); })]),
      () => { fx = new THREE.Group(); fx.add(this.magic(0, 0, 1).g, this.shockRing(0, 0, 1).g, this.pillar(0, 0, 1, 2), this.streak());
        // 升级方块和买下碎块（半透明 Standard）、光柱、护盾罩和彩带（半透明双面 Basic）、抽卡光点（不带贴图的 Points）每播完一次就释放材质，three 跟着删掉着色器，
        // 下次播又得现编（每次卡一下）。各留一块同样设置的小网格占住着色器：transparent、side、有没有贴图要对上，颜色、透明度、混合方式不影响。
        // 半透明单面 Basic 是护盾网格线、方块地圈、架构光管、冲击波共用的，不透明 Standard 是 3D 棋子和金币用的（每走一步、每付一次钱都新建再释放），
        // 这两种原来靠几何体小人的腮红和身体撑着，换成立牌以后各留一块
        const tiny = new THREE.PlaneGeometry(0.01, 0.01), pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
        fx.add(new THREE.Mesh(tiny, new THREE.MeshStandardMaterial({ transparent: true })), new THREE.Mesh(tiny, new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide })), new THREE.Points(pg, new THREE.PointsMaterial({ transparent: true })), new THREE.Mesh(tiny, new THREE.MeshBasicMaterial({ transparent: true })), new THREE.Mesh(tiny, new THREE.MeshStandardMaterial()));
        return Promise.all([comp(fx), comp(this._sp.pts)]); },
      // 这几个特效和占位材质留着不释放：同一种材质全释放了，three 会把编好的着色器一起删掉，第一次飞又得现编（以后每次飞完、每次升级买下也一样）
      () => { up(fx); this._warmFx = fx; },
    ];
    const idle = window.requestIdleCallback ? f => requestIdleCallback(f, { timeout: 1000 }) : f => setTimeout(f, 16);   // iOS Safari 没有 requestIdleCallback
    const next = () => k < steps.length && idle(() => {
      if (this.looping || this.diceOn) return void setTimeout(next, 300);
      let r; try { r = steps[k++](); } catch (e) { return; }   // 预热失败不要紧，第一次飞的时候现建
      if (r !== false) Promise.resolve(r).then(next, next);
    });
    next();
  },
  // 飞行第 1 步（render 把棋子从起点格拿掉之前调用）：记下圆点的位置和格子大小
  flyStart(p) {
    if (!this.ok() || !this.init()) return null;
    const cell = $('#sq' + p.pos); if (!cell) return null;
    const tok = [...cell.querySelectorAll('.toks .pawn')].find(e => e.style.getPropertyValue('--pc').trim() === p.color);
    const r = this.rectOf(tok || cell), cr = this.rectOf(cell), seat = Math.max(0, COLORS.indexOf(p.color));
    try { return { p, seat, ch: this.chibi(seat), from: { x: r.x, y: r.y }, cellPx: Math.min(cr.w, cr.h), fx: [] }; } catch (e) { this.dead = true; return null; }
  },
  // 飞行第 2 步（照宣传片「天外流星」那段）：脚下法阵展开、光柱冲天，人物立牌从圆点里长出来浮起；
  // 拖着流星尾巴沿弧线飞过去（按弧长匀速取点，越到半空越大），终点法阵提前亮起；落地一圈冲击波 + 星火，光柱闪一下，小人欢呼
  async flyGo(F, target, why = '', backward = false) {
    const u = this.unit(), cz = this.cam.position.z, ch = F.ch, H = ch.holder;
    const gh = document.querySelector(`#sq${target} .toks .pawn.ghost`), tr = this.rectOf(gh || $('#sq' + target));
    const Hs = Math.max(90, Math.min(170, F.cellPx * 2.1)), k1 = Hs * u / 1.9, R = Hs * 0.6 * u, hover = Hs * 0.3 * u;
    // 靠屏幕边的格子：法阵和人物往里挪一点，别被屏幕边切掉；最后缩回圆点时再回到圆点上
    const inX = x => Math.max(Hs * 0.62, Math.min(innerWidth - Hs * 0.62, x)), inY = y => Math.max(Hs * 1.25, Math.min(innerHeight - Hs * 0.3, y));
    const A = this.world(inX(F.from.x), inY(F.from.y)), B = this.world(inX(tr.x), inY(tr.y)), Bt = this.world(tr.x, tr.y);
    Object.assign(F, { H, B, Bt, k1 });
    // 出事故被送走的（DNS 配错退回、流量被劫持、紧急切到灾备）不另配图，飞的时候来回晃、落地不蹦；脸朝要飞的方向
    const bad = backward || _tr(4789, "劫持|灾备", "").test(why), dir = Math.sign(B.x - A.x) || 1;
    this.scene.add(H); H.position.set(A.x, A.y, 0.3); H.rotation.set(0, 0, 0); H.scale.setScalar(0.0001); ch.shuffle(); ch.frame('up', dir);
    const src = this.magic(A.x, A.y, R), pil = this.pillar(A.x, A.y, R * 0.5, Hs * 2.6 * u); F.fx.push(src.g, pil);
    const dist = Math.hypot(tr.x - F.from.x, tr.y - F.from.y), K = animK(), T1 = 560 * K, T2 = Math.min(1500, Math.max(900, 700 + dist * 0.55)) * K, T3 = 480 * K;
    const gold = [0xffd27a, 0xffffff, 0xff9900, new THREE.Color(COLORS[F.seat]).getHex()];
    sfx('magic'); this.dim(true); F.stopMeteors = this.meteors(7, T1 + T2);
    // 金色那段：有空格就用最后一个词（「切到灾备 Region」→ Region），没有就用最后两个字，三个字以内整句金色
    const w0 = String(why).replace(_tr(4790, "[，,。\\s]+$", ""), '') || (backward ? _t(4791, "紧急回退") : _t(4792, "跨区飞行")), sp = w0.lastIndexOf(' '), cut = sp > 0 ? sp + 1 : w0.length <= 3 ? 0 : w0.length - 2;
    F.untitle = this.title(w0.slice(0, cut), w0.slice(cut), `${F.p.name} ${backward ? _t(1760, "退回") : _t(4793, "飞往")} <em>${esc(SQ[target].n)}</em>`, Math.min(F.from.y, tr.y));
    await this.run(T1, k => {
      const t = k * T1 / 1000;
      src.m.rotation.z = t * 1.8; src.g.scale.setScalar(Math.max(0.0001, EZ.back(clamp01(k / 0.45)))); src.m.material.opacity = clamp01(k * 2.5);
      pil.scale.set(1, Math.max(0.0001, EZ.out3(clamp01((k - 0.1) / 0.4))), 1); pil.material.opacity = 0.5 * clamp01(k * 3) * (0.85 + 0.15 * Math.sin(t * 30));
      H.scale.setScalar(Math.max(0.0001, k1 * EZ.back(clamp01((k - 0.18) / 0.45))));
      H.position.y = A.y + hover * EZ.smooth(clamp01((k - 0.45) / 0.55));
      ch.pose({ sway: Math.sin(t * 7) * 0.04 });
      if (Math.random() < 0.8) this.spark(A.x + (Math.random() - 0.5) * R * 1.2, A.y, 0.4, 0, 1.2 + Math.random() * 1.8, 0, 0.7, gold[k * 7 % 4 | 0], 0);
    });
    // 弧线：两端在法阵上方，弧顶往上拱
    const P0 = { x: A.x, y: A.y + hover }, P2 = { x: B.x, y: B.y + hover }, dx = P2.x - P0.x, L = Math.hypot(dx, P2.y - P0.y) || 1;
    const C = { x: (P0.x + P2.x) / 2, y: (P0.y + P2.y) / 2 + Math.max(L * 0.28, Hs * 0.5 * u) };
    const bz = (a, b, c, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c, LUT = [0];
    for (let j = 1, px = P0.x, py = P0.y; j <= 64; j++) { const t = j / 64, x = bz(P0.x, C.x, P2.x, t), y = bz(P0.y, C.y, P2.y, t); LUT.push(LUT[j - 1] + Math.hypot(x - px, y - py)); px = x; py = y; }
    const atLen = s => { const want = s * LUT[64]; let j = 1; while (j < 64 && LUT[j] < want) j++; return (j - 1 + (want - LUT[j - 1]) / ((LUT[j] - LUT[j - 1]) || 1)) / 64; };
    const dst = this.magic(B.x, B.y, R), tail = this.streak(); dst.g.scale.setScalar(0.0001); F.fx.push(dst.g, tail); F.dst = dst;
    let lx = P0.x, ly = P0.y, roll = 0; ch.frame('fly', dir);   // 被送走的（bad）不换图，身子来回晃，像被甩过去
    await this.run(T2, k => {
      const t = (T1 + k * T2) / 1000, bt = atLen(EZ.sine(k)), x = bz(P0.x, C.x, P2.x, bt), y = bz(P0.y, C.y, P2.y, bt), up = Math.sin(Math.PI * k), z = 2.2 * up, f = (cz - z) / cz;
      const vx = x - lx, vy = y - ly; lx = x; ly = y;
      // 身子朝飞的方向倾（立牌是平的，最多倾 25°，再多像躺着），起飞、落地时慢慢回正
      const w = EZ.smooth(clamp01(k / 0.18)) * EZ.smooth(clamp01((1 - k) / 0.22));
      let phi = Math.atan2(-vx, vy); if (Math.abs(phi) > 0.44) phi = -dir * 0.44;
      if (bad) phi += Math.sin(t * 11) * 0.3;
      roll += (phi * w - roll) * 0.25;
      H.position.set(x * f, y * f, 0.3 + z); H.rotation.z = roll; H.scale.setScalar(k1);
      ch.pose({ bounce: Math.sin(t * 9) * 0.05 * w });
      // 流星尾巴：跟在身后、顺着速度方向，越快越长
      const cx = H.position.x - Math.sin(roll) * k1 * 0.9, cy = H.position.y + Math.cos(roll) * k1 * 0.9;
      tail.position.set(cx, cy, H.position.z - 0.2); tail.rotation.z = Math.atan2(vy, vx); tail.scale.set(Math.max(0.001, Hs * 1.7 * u * up), Hs * 0.42 * u, 1); tail.material.opacity = 0.85 * up;
      for (let n = 0; n < 4; n++) this.spark(cx + (Math.random() - 0.5) * k1 * 0.6, cy + (Math.random() - 0.5) * k1 * 0.6, H.position.z - 0.1, -vx * 6 + (Math.random() - 0.5) * 0.8, -vy * 6 + (Math.random() - 0.5) * 0.8, 0, 0.45 + Math.random() * 0.4, gold[n], -0.8);
      // 起点法阵、光柱收掉；终点法阵提前亮起
      const fo = 1 - clamp01(k / 0.3); src.m.material.opacity = fo; pil.material.opacity = 0.5 * fo; src.m.rotation.z = t * 1.8;
      dst.g.scale.setScalar(Math.max(0.0001, EZ.back(clamp01((k - 0.35) / 0.3)))); dst.m.material.opacity = clamp01((k - 0.35) / 0.2); dst.m.rotation.z = -t * 1.8;
    });
    tail.material.opacity = 0;
    const ring = this.shockRing(B.x, B.y, R), pil2 = this.pillar(B.x, B.y, R * 0.5, Hs * 2.6 * u); F.fx.push(ring.g, pil2);
    let hit = false;
    await this.run(T3, k => {
      const t = (T1 + T2 + k * T3) / 1000, d = clamp01(k / 0.3), a = clamp01((k - 0.3) / 0.7);
      H.position.set(B.x, B.y + hover * (1 - d * d), 0.3); H.rotation.z *= 0.75;
      if (!hit && d >= 1) { hit = true; ch.frame('joy', dir); this.sparkBurst(B.x, B.y, 70, gold, { speed: 3, up: 2.2 }); sfx('buy'); }
      ring.g.scale.setScalar(0.35 + 2.1 * EZ.out3(a)); ring.m.material.opacity = d >= 1 ? 0.9 * (1 - a) : 0;
      pil2.scale.set(1, Math.max(0.0001, clamp01(a / 0.25)), 1); pil2.material.opacity = d >= 1 ? 0.6 * (1 - a) : 0;
      dst.m.rotation.z = -t * 1.8; dst.m.material.opacity = 1;
      const sq = d >= 1 ? 0.3 * Math.exp(-a * 5) * Math.cos(a * 16) : 0;
      // 开心的落地后蹦两下；沮丧的不蹦，左右晃一晃
      ch.pose({ squash: sq, bounce: d >= 1 && !bad ? Math.abs(Math.sin(a * 9)) * 0.1 * (1 - a) : 0, sway: d >= 1 && bad ? Math.sin(a * 18) * 0.06 * (1 - a) : 0 });
    });
  },
  // 飞行第 3 步：人物缩回圆点、法阵收起，换回 DOM 棋子
  async flyEnd(F) {
    if (!F || !F.H) { if (F) { this.drop(F.fx); if (F.untitle) F.untitle(); } this.dim(false); return; }
    const H = F.H, k0 = H.scale.x; if (F.stopMeteors) F.stopMeteors();
    await this.run(240 * animK(), k => { const e = EZ.in2(k); H.scale.setScalar(Math.max(0.0001, k0 * (1 - e))); H.position.x = F.B.x + (F.Bt.x - F.B.x) * e; H.position.y = F.B.y + (F.Bt.y - F.B.y) * e; if (F.dst) { F.dst.g.scale.setScalar(Math.max(0.0001, 1 - 0.7 * e)); F.dst.m.material.opacity = 1 - e; } });
    this.sparkBurst(F.Bt.x, F.Bt.y, 16, [0xffffff, 0xffd27a], { speed: 1.2, up: 0.6, life: 0.5, grav: -1 }); this.dim(false); if (F.untitle) F.untitle();
    this.scene.remove(H); this.drop(F.fx); F.fx = []; this.redraw();
  },
  // User Group 活动：格子上亮起法阵，自己和三个伙伴从法阵里冒出来围成一圈欢呼，彩纸往上喷
  async ug(p, i) {
    if (!this.ok() || !this.init()) return;
    const cell = $('#sq' + i); if (!cell) return;
    try {
      const cr = this.rectOf(cell), u = this.unit(), cell0 = Math.min(cr.w, cr.h);
      const Hs = Math.max(80, Math.min(150, cell0 * 1.5)), k1 = Hs * u / 1.9, R = Hs * 0.95 * u;
      // User Group 在角上：一圈人往棋盘里面挪，别被屏幕边切掉
      const c = this.world(Math.max(Hs * 1.9, Math.min(innerWidth - Hs * 1.9, cr.x)), Math.max(Hs * 1.75, Math.min(innerHeight - Hs * 0.5, cr.y + cr.h * 0.15)));
      const seat = Math.max(0, COLORS.indexOf(p.color)), others = [0, 1, 2, 3].filter(k => k !== seat), crew = [seat, ...others];
      // 四个人站成一道弧：主角在中间偏前、个子大一点，三个伙伴在两边（x、y 是法阵半径的倍数，最后是大小）
      // 立牌比原来的几何体小人宽，往两边拉开一点
      const spots = [[-0.32, -0.1, 1], [-1.16, 0.12, 0.82], [0.47, 0.02, 0.86], [1.24, 0.14, 0.82]];
      const mc = this.magic(c.x, c.y, R, 0x9fd0ff), fx = [mc.g], conf = [...COLORS.map(x => new THREE.Color(x).getHex()), 0xffd27a, 0xffffff];
      const cs = crew.map((k, n) => { const ch = this.chibi(k), H = ch.holder; this.scene.add(H); H.position.set(c.x + spots[n][0] * R, c.y + spots[n][1] * R, 0.3 - n * 0.02); H.rotation.set(0, 0, 0); ch.shuffle(); ch.frame(n ? 'pal' : 'ug', spots[n][0] < 0 ? 1 : -1); H.scale.setScalar(0.0001); return { ch, H, s: spots[n][2], d: n * 0.07 }; });
      sfx('magic'); this.dim(true); let popped = false; const untitle = this.title('User Group ', _t(4794, "活动"), _tf(4795, "{$0} 来参加线下分享", p.name), cr.y);
      await this.run(1500 * animK(), k => {
        const t = k * 1.5; mc.m.rotation.z = t * 1.4; mc.g.scale.setScalar(Math.max(0.0001, EZ.back(clamp01(k / 0.25)))); mc.m.material.opacity = Math.min(1, k * 4) * (k > 0.85 ? (1 - k) / 0.15 : 1);
        cs.forEach(({ ch, H, s, d }, n) => {
          const g = clamp01((k - 0.1 - d) / 0.22); H.scale.setScalar(Math.max(0.0001, k1 * s * EZ.back(g)));
          const ph = t * 8 + n * 1.3, cheer = g >= 1 ? 1 : 0;
          ch.pose({ bounce: cheer * Math.abs(Math.sin(ph)) * 0.14, sway: cheer * Math.sin(ph * 0.5) * 0.04 });
        });
        if (!popped && k > 0.32) { popped = true; for (let n = 0; n < 3; n++) setTimeout(() => this.sparkBurst(c.x, c.y + R * 0.2, 45, conf, { speed: 2.4, up: 4.2, life: 1.3, grav: -4.5, z: 0.9 }), n * 160); }
      });
      this.dim(false); untitle();
      await this.run(260 * animK(), k => { const e = EZ.in2(k); cs.forEach(({ H, s }) => H.scale.setScalar(Math.max(0.0001, k1 * s * (1 - e)))); mc.g.scale.setScalar(Math.max(0.0001, 1 - e)); });
      cs.forEach(({ H }) => this.scene.remove(H)); this.drop(fx); this.redraw();
    } catch (e) { }
    this.dim(false); const tt = $('#fxtitle'); if (tt) tt.classList.remove('on');
  },
});

