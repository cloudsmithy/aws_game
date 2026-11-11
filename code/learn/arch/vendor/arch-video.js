// 架构讲解小短片：three.js 深色科技风。星点和发光网格做背景，每块服务是一张发光的玻璃卡（官方架构图标 + 名字），
// 连线是发光的光轨，数据包拖着尾巴跑；镜头一块一块推过去，左边一张卡写「这是什么服务、在这里干什么」，底下字幕逐字打出来，浏览器朗读配音。
// 普通 <script> 加载（双击 file:// 也能看），数据在 window.ARCH，three.js 是游戏里内嵌的那份 r160（全局 THREE）。
// 网址带 ?have=s3,lambda&who=玩家1（从游戏里点进来）：这位玩家有的块亮着，没有的暗着标「还没有」，最后讲他这套和最优架构差在哪
(function () {
  'use strict';
  const D = window.ARCH, $ = s => document.querySelector(s);
  const qs = new URLSearchParams(location.search);
  const HAVE = qs.get('have') != null ? new Set(qs.get('have').split(',').filter(Boolean)) : null;
  const WHO = (qs.get('who') || '').slice(0, 20) || '你';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const has = k => !HAVE || HAVE.has(k);

  // ---------- 讲稿 ----------
  const nm = s => s.items.map(it => it.n).join(' 或 ');
  const steps = [{ kind: 'intro', title: D.n, text: D.use, say: `${D.n}。${D.use}` }];
  D.slots.forEach((s, k) => {
    const roles = [...new Set(s.items.map(it => it.role).filter(Boolean))].join('；') || '在这个架构里一起配合';
    const link = k ? { '⇄': '它和上一块是来回调用。', '+': '它和上一块一起配合。', '←': '数据从它这里流回上一块。' }[s.link] || '' : '';
    let note = (s.opt ? '这一块是可选的：没有也算凑成，有的话一起收。' : s.items.length > 1 ? '几块里有一块就行，都在手上就都一起收。' : '');
    if (HAVE) { const mine = s.items.filter(it => HAVE.has(it.k)).map(it => it.n); note += mine.length ? `${WHO}手上有 ${mine.join('、')}。` : s.opt ? `${WHO}还没有这一块。` : ''; }
    steps.push({ kind: 'slot', k, title: nm(s) + (s.opt ? '（可选）' : ''), text: roles, note: link + note, say: `第 ${k + 1} 块，${nm(s)}。${s.items[0].intro ? s.items[0].intro + '。' : ''}在这个架构里，${roles}。${link}${note}` });
  });
  const req = D.slots.filter(s => !s.opt), opt = D.slots.filter(s => s.opt);
  const andJoin = a => document.documentElement.lang === 'en' && a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : a.join('、');
  const outro = `必须的 ${req.length} 块凑齐就算成了${opt.length ? `，${andJoin(opt.map(nm))} 是可选的，有就一起收` : ''}。凑成以后，别人落在这套里你的任意一块，按整套架构所有服务的过路费加起来收。${D.d ? '额外加成：' + D.d : ''}`;
  steps.push({ kind: 'outro', title: '整套跑起来', text: outro, say: '整套跑起来。' + outro });
  if (HAVE) {
    const miss = D.slots.flatMap(s => s.items.filter(it => !HAVE.has(it.k)).map(it => ({ it, s }))), add = miss.reduce((a, x) => a + (x.it.rent0 || 0), 0);
    const t = miss.length ? `和最优架构比，还可以加：${miss.map(x => x.it.n + (x.s.opt ? '（可选）' : x.s.items.some(it => HAVE.has(it.k)) ? '（或的另一块）' : '（必须）')).join('、')}。都配上以后，这套每次大约多收 ${add} 美元（按没升级、骰子 7 点估）。` : '这已经是最全的版本：可选的、或的几块都在手上，联合收费拿到最多。';
    steps.push({ kind: 'compare', title: `${WHO}的架构 vs 最优架构`, text: t, say: t });
  }

  // ---------- 三维场景 ----------
  const stage = $('.stage'), cv = $('#c'), cap = $('#cap'), card = $('#card'), tip = $('#tip'), ttl = $('#ttl');
  // 手机竖屏（窄于 700px）：画面里放不下说明卡，挪到播放按钮下面
  const MQ = matchMedia('(max-width: 700px)');
  const placeCard = () => { const ctrl = $('.ctrl'); if (MQ.matches) { if (ctrl && card.previousElementSibling !== ctrl) ctrl.after(card); card.classList.add('m'); } else { if (card.parentElement !== stage) stage.insertBefore(card, cap); card.classList.remove('m'); } };
  placeCard(); MQ.addEventListener('change', () => { placeCard(); if (typeof show === 'function') show(cur); });
  $('.prog').innerHTML = steps.map((s, i) => `<i title="${s.title}" data-i="${i}"><b></b></i>`).join('');
  const fallback = () => { cv.hidden = true; $('#fallback').hidden = false; };
  if (!window.THREE) return fallback();
  let R; try { R = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { return fallback(); }
  R.setPixelRatio(Math.min(2, devicePixelRatio || 1)); R.setClearColor(0x060a14);
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x060a14, 18, 60);
  const cam = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 400), world = new THREE.Group(); scene.add(world);
  const GAP = 3.2, VG = 2.35, n = D.slots.length, maxM = Math.max(...D.slots.map(s => s.items.length)), x0 = -(n - 1) * GAP / 2;
  const slotX = k => x0 + k * GAP, itemY = (m, j) => (m - 1) * VG / 2 - j * VG;
  const FONT = '-apple-system,"SF Pro Display","Helvetica Neue","PingFang SC","Microsoft YaHei",sans-serif';
  const loadImg = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; });
  const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const cvs = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  const glowTex = (() => { const cache = {}; return col => { if (cache[col]) return cache[col]; const [c, g] = cvs(128, 128), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, col + 'ff'); gr.addColorStop(0.25, col + '88'); gr.addColorStop(1, col + '00'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return (cache[col] = tex(c)); }; })();
  const sprite = (col, s, op = 1) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(col), color: 0xffffff, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false })); m.scale.set(s, s, 1); return m; };
  const plane = (t, w, h, add) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending }));
  function panelTex(col, opt, miss) {
    const [c, g] = cvs(420, 460);
    const gr = g.createLinearGradient(0, 0, 0, 460); gr.addColorStop(0, 'rgba(22,34,56,.92)'); gr.addColorStop(1, 'rgba(10,16,30,.92)');
    g.fillStyle = gr; rr(g, 10, 10, 400, 440, 28); g.fill();
    g.lineWidth = 5; g.strokeStyle = miss ? 'rgba(255,107,107,.55)' : col; g.shadowColor = col; g.shadowBlur = miss ? 0 : 22; if (opt) g.setLineDash([20, 14]); rr(g, 10, 10, 400, 440, 28); g.stroke(); g.setLineDash([]); g.shadowBlur = 0;
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2; rr(g, 26, 26, 368, 408, 20); g.stroke();
    return tex(c);
  }
  function textTex(lines, { w = 640, h = 160, size = 50, color = '#e8f0f8', sub = '#7f97b2', weight = 650, align = 'center', font = FONT } = {}) {
    const [c, g] = cvs(w, h); g.textAlign = align; g.textBaseline = 'middle';
    lines.forEach((l, i) => { g.font = `${i ? 500 : weight} ${i ? Math.round(size * 0.64) : size}px ${font}`; g.fillStyle = i ? sub : color; g.fillText(l, align === 'left' ? 8 : w / 2, h / (lines.length + 1) * (i + 1)); });
    return tex(c);
  }
  function chipTex(t, col) { const [c, g] = cvs(220, 80); g.fillStyle = 'rgba(6,10,20,.9)'; rr(g, 4, 4, 212, 72, 36); g.fill(); g.strokeStyle = col; g.lineWidth = 4; rr(g, 4, 4, 212, 72, 36); g.stroke(); g.fillStyle = col; g.font = `700 38px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 110, 42); return tex(c); }

  // 背景：星点、地面发光网格
  { const N = 900, pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 120; pos[i * 3 + 1] = (Math.random() - 0.3) * 60; pos[i * 3 + 2] = -10 - Math.random() * 50; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x5fa8ff, size: 0.12, transparent: true, opacity: 0.55, depthWrite: false }))); }
  const grid = new THREE.GridHelper(140, 70, 0x1f6fb2, 0x10305a); grid.position.y = -(maxM * VG) / 2 - 1.9; grid.material.transparent = true; grid.material.opacity = 0.55; scene.add(grid);

  const nodes = [], orMarks = [], edges = [], dots = [];
  (async () => {
    const W = (n - 1) * GAP + 3.0, H = maxM * VG + 1.6;
    // 外框：一块很淡的全息面板，左上角标题（不放标志）
    const [fc, fg] = cvs(1024, 640); fg.strokeStyle = 'rgba(80,170,255,.55)'; fg.lineWidth = 3; rr(fg, 4, 4, 1016, 632, 24); fg.stroke();
    fg.strokeStyle = 'rgba(80,170,255,.08)'; fg.lineWidth = 1; for (let x = 40; x < 1024; x += 40) { fg.beginPath(); fg.moveTo(x, 8); fg.lineTo(x, 632); fg.stroke(); } for (let y = 40; y < 640; y += 40) { fg.beginPath(); fg.moveTo(8, y); fg.lineTo(1016, y); fg.stroke(); }
    const frame = plane(tex(fc), W, H); frame.position.set(0, -0.2, -0.3); world.add(frame);
    // 架构名只在 HTML 层的开场标题和左上角 HUD 里写，场景里不再画，免得和开场标题叠字
    for (let k = 0; k < n; k++) {
      const s = D.slots[k], m = s.items.length;
      for (let j = 0; j < m; j++) {
        const it = s.items[j], miss = HAVE && !HAVE.has(it.k), col = it.c || '#3ad1ff', g = new THREE.Group(); g.position.set(slotX(k), itemY(m, j), 0);
        const halo = sprite(col, 3.4, 0); g.add(halo);
        const panel = plane(panelTex(miss ? '#ff6b6b' : col, s.opt, miss), 1.84, 2.02); panel.position.y = -0.22; g.add(panel);
        const im = await loadImg(D.icons[it.k]); let icon;
        if (im) { const [c, gg] = cvs(256, 256); gg.drawImage(im, 0, 0, 256, 256); icon = plane(tex(c), 0.92, 0.92); } else icon = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.92), new THREE.MeshBasicMaterial({ color: 0x334, transparent: true }));
        icon.position.set(0, 0.2, 0.02); icon.userData = { it, opt: s.opt }; g.add(icon);
        const lab = plane(textTex([it.n, it.g + '组'], { w: 640, h: 200, size: 66 }), 1.8, 0.56); lab.position.set(0, -0.7, 0.02); g.add(lab);
        if (s.opt) { const c2 = plane(chipTex('可选', '#ffb84d'), 0.56, 0.2); c2.position.set(0.56, 0.86, 0.03); g.add(c2); }
        if (miss) { const c3 = plane(chipTex('还没有', '#ff6b6b'), 0.56, 0.2); c3.position.set(-0.56, 0.86, 0.03); g.add(c3); icon.material.opacity = 0.35; lab.material.opacity = 0.5; }
        // 半透明的几层按固定顺序画：光晕 → 卡片 → 图标和名字 → 小标，不然图标会被卡片盖暗
        halo.renderOrder = 0; panel.renderOrder = 1; icon.renderOrder = 2; lab.renderOrder = 2; g.children.forEach(o => { if (o !== halo && o !== panel && o !== icon && o !== lab) o.renderOrder = 3; });
        g.scale.setScalar(0.001); world.add(g); nodes.push({ g, halo, icon, k, it, miss });
        if (j < m - 1) { const o = plane(textTex(['或'], { w: 160, h: 120, size: 64, weight: 800, color: '#7fb6e6' }), 0.4, 0.3); o.position.set(slotX(k), itemY(m, j) - VG / 2 - 0.12, 0); o.material.opacity = 0; o.userData.slot = k; world.add(o); orMarks.push(o); }
      }
    }
    for (let k = 1; k < n; k++) edges.push(makeEdge(k - 1, k, D.slots[k].link || '→'));
    resize(); show(0); requestAnimationFrame(loop); setTimeout(play, RM ? 0 : 500);   // 打开就播
  })();
  // 光轨：两环之间一条发光的线（「或」的几块旁边竖一条总线接上），→ ⇄ ← 上面有拖尾的光点跑，+ 是虚的、不跑
  function makeEdge(a, b, kind) {
    const ma = D.slots[a].items.length, mb = D.slots[b].items.length, xa = slotX(a) + 0.96, xb = slotX(b) - 0.96, busA = xa + 0.22, busB = xb - 0.22;
    const group = new THREE.Group(); world.add(group); const colA = 0x48c8ff;
    const segs = [];
    const seg = (p, q) => segs.push([new THREE.Vector3(p[0], p[1], 0), new THREE.Vector3(q[0], q[1], 0)]);
    if (ma > 1) { for (let j = 0; j < ma; j++) seg([xa, itemY(ma, j)], [busA, itemY(ma, j)]); seg([busA, itemY(ma, 0)], [busA, itemY(ma, ma - 1)]); }
    if (mb > 1) { for (let j = 0; j < mb; j++) seg([busB, itemY(mb, j)], [xb, itemY(mb, j)]); seg([busB, itemY(mb, 0)], [busB, itemY(mb, mb - 1)]); }
    const sx = ma > 1 ? busA : xa, ex = mb > 1 ? busB : xb; seg([sx, 0], [ex, 0]);
    segs.forEach(([p, q]) => {
      const mat = kind === '+' ? new THREE.LineDashedMaterial({ color: 0x7f97b2, dashSize: 0.14, gapSize: 0.1, transparent: true }) : new THREE.LineBasicMaterial({ color: colA, transparent: true });
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([p, q]), mat); if (kind === '+') l.computeLineDistances(); group.add(l);
      if (kind !== '+') { const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(p, q), 8, 0.03, 8, false), new THREE.MeshBasicMaterial({ color: colA, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); group.add(tube); }
    });
    const chev = (x, dir) => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(-0.22 * dir, 0.12); sh.lineTo(-0.15 * dir, 0); sh.lineTo(-0.22 * dir, -0.12); sh.closePath(); const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: 0x9fe3ff, transparent: true })); m.position.set(x, 0, 0.01); group.add(m); };
    if (kind === '→' || kind === '⇄') chev(ex, 1);
    if (kind === '←' || kind === '⇄') chev(sx, -1);
    if (kind === '+') { const p = plane(textTex(['+'], { w: 120, h: 120, size: 90, weight: 800, color: '#9fd3ff' }), 0.34, 0.34); p.position.set((sx + ex) / 2, 0.3, 0); group.add(p); }
    (kind === '⇄' ? [1, -1] : kind === '←' ? [-1] : kind === '→' ? [1] : []).forEach((d, i) => [0, 0.5].forEach(t0 => {
      const col = d > 0 ? '#ffb84d' : '#5fd0ff', head = sprite(col, 0.42, 1), trail = [0.06, 0.12, 0.18].map((dt, k) => { const t = sprite(col, 0.32 - k * 0.07, 0.6 - k * 0.17); group.add(t); return { t, dt }; });
      group.add(head); dots.push({ head, trail, d, t: (t0 + i * 0.25) % 1, sx, ex });
    }));
    group.userData = { b }; group.traverse(o => { if (o.material) { o.userData.op = o.material.opacity; o.material.opacity = 0; } });
    return group;
  }

  // ---------- 时间线、字幕、配音 ----------
  let cur = 0, t0 = performance.now(), playing = false, started = false, muted = false, speaking = false, waitT = 0, typeT = 0, blocked = false;
  const camT = new THREE.Vector3(0, 0, 30), camP = new THREE.Vector3(0, -6, 46), look = new THREE.Vector3(), lookT = new THREE.Vector3();
  const fit = (w, h) => { const f = cam.fov * Math.PI / 180; return Math.max(h / 2 / Math.tan(f / 2), w / 2 / Math.tan(f / 2) / cam.aspect) * 1.1; };
  const AUD = new Audio(); AUD.preload = 'auto';
  const clipsOf = i => { if (!D.clips) return null; const s = steps[i]; return D.clips[s.kind === 'intro' ? 0 : s.kind === 'slot' ? 1 + s.k : s.kind === 'outro' ? 1 + n : 2 + n] || null; };
  const dur = s => Math.max(4.5, s.say.length * (/[\u3040-\u9fff]/.test(s.say) ? 0.21 : 0.07));
  function typeIn(el, text) { clearInterval(typeT); if (RM) { el.textContent = text; return; } let i = 0; el.textContent = ''; typeT = setInterval(() => { i += 2; el.textContent = text.slice(0, i); if (i >= text.length) clearInterval(typeT); }, 28); }
  let pick = null;   // 用户点开的那一块（停在这里看说明）
  // 说明卡：一块服务写全（它是什么、常见用法、为什么用它、在这里干什么）；几选一的那一环每块只写「为什么用它」（它是什么在字幕和配音里讲），「在这里干什么」只写一次，最后是「这一环怎么选」
  const cut = (s, n) => { if (!s) return s; if (!/[\u3040-\u9fff]/.test(s)) n = Math.round(n * 2.6); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };
  function cardHtml(slot, k, items) {
    const multi = items.length > 1, same = multi && items.every(it => it.role === items[0].role);
    const svc = it => `<div class="sc${HAVE && !HAVE.has(it.k) ? ' no' : ''}"><img src="${D.icons[it.k]}" alt=""><div><b>${it.n}</b><span class="gp">${it.g}组${HAVE ? (HAVE.has(it.k) ? ' · <i class="y">你有</i>' : ' · <i class="n">还没有</i>') : ''}</span>`
      + (!multi && it.what ? `<p><small>它是什么</small>${cut(it.what, 110)}</p>` : '') + (!multi && it.uses ? `<p><small>常见用法</small>${it.uses}</p>` : '')
      + (it.why ? `<p><small>为什么用它</small>${it.why}</p>` : '') + (same ? '' : `<p class="here"><small>在这个架构里</small>${it.role || '在这个架构里一起配合'}</p>`) + `<a class="svk" href="../svc/${it.k}.html" target="_blank" rel="noopener">${it.n} 的知识点 ↗</a></div></div>`;
    return `<div class="cw${multi ? ' multi' : ''}"><div class="kick">第 ${k + 1} 块 · ${slot.opt ? '可选' : multi ? '几选一' : '必须'}</div>`
      + (slot.choose && multi ? `<div class="chs"><small>这一环怎么选</small>${slot.choose}</div>` : '') + items.map(svc).join('<div class="or">或</div>')
      + (same ? `<p class="here sh"><small>在这个架构里</small>${items[0].role || '在这个架构里一起配合'}</p>` : '') + '</div>';
  }
  function show(i) {
    cur = Math.max(0, Math.min(steps.length - 1, i)); t0 = performance.now(); clearTimeout(waitT); pick = null;
    const s = steps[cur], slot = s.kind === 'slot' ? D.slots[s.k] : null;
    cap.innerHTML = `<b>${s.title}</b><span class="tx"></span>${s.note ? `<em>${s.note}</em>` : ''}`; typeIn(cap.querySelector('.tx'), s.text);
    ttl.classList.toggle('on', s.kind === 'intro');
    card.classList.toggle('on', !!slot); if (slot) card.innerHTML = cardHtml(slot, s.k, slot.items);
    document.querySelectorAll('.prog i').forEach((e, k) => { e.classList.toggle('done', k < cur); e.classList.toggle('on', k === cur); e.firstChild.style.width = k < cur ? '100%' : '0'; });
    $('#stepn').textContent = `${String(cur + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`;
    const hud = $('#hud'); if (hud) hud.innerHTML = `<span>${D.n}</span><i></i><span>STEP ${String(cur + 1).padStart(2, '0')}</span><i></i><span>${s.kind === 'intro' ? '开场' : s.kind === 'outro' ? '整套跑起来' : s.kind === 'compare' ? '和最优架构对比' : s.title}</span>`;
    const allW = (n - 1) * GAP + 3.6, allH = maxM * VG + 2.6;
    if (slot) { const x = slotX(s.k) - (MQ.matches ? 0 : GAP * 0.55); camT.set(x, 0.4, fit(GAP * 3.8, slot.items.length * VG + 2.6)); lookT.set(x, -0.1, 0); }   // 讲到的那一块放在画面右半边，左边留给说明卡
    else if (s.kind === 'intro') { const t = Math.tan(cam.fov * Math.PI / 360), z = Math.max(allW / 2 / t / cam.aspect / 0.86, allH / 2 / t / 0.46); camT.set(0, 1.4, z); lookT.set(0, z * 0.075, 0); }   // 图最多占八成多的宽、不到一半的高，落在下半屏；上半屏留给开场标题
    else { camT.set(0, 0.6, fit(allW, allH)); lookT.set(0, -0.2, 0); }
    if (playing) speak(s);
  }
  function speak(s) {
    clearTimeout(waitT); AUD.pause(); speaking = false;
    const list = clipsOf(cur);
    if (muted || !list || !list.length) { waitT = setTimeout(next, dur(s) * 1000); return; }
    let j = 0; const me = cur;
    const run = () => { if (!playing || cur !== me) return; if (j >= list.length) { speaking = false; waitT = setTimeout(next, 600); return; } AUD.src = list[j++]; speaking = true; AUD.play().catch(err => { speaking = false; if (err && err.name === 'NotAllowedError' && unmute) { blocked = true; unmute.hidden = false; } waitT = setTimeout(next, dur(s) * 1000); }); };
    AUD.onended = run; AUD.onerror = run; run();
  }
  function next() { if (!playing) return; if (cur < steps.length - 1) show(cur + 1); else { playing = false; sync(); } }
  function play() { started = true; const restart = cur >= steps.length - 1 && !playing; playing = true; sync(); show(restart ? 0 : cur); }
  function pause() { playing = false; clearTimeout(waitT); AUD.pause(); speaking = false; sync(); }
  const pb = $('#play'); function sync() { pb.textContent = playing ? '暂停' : cur >= steps.length - 1 && started ? '重播' : '播放'; pb.setAttribute('aria-pressed', playing); }
  pb.onclick = () => (playing ? pause() : play());
  $('#prev').onclick = () => show(cur - 1); $('#next').onclick = () => show(cur + 1);
  const mb = $('#mute'); mb.onclick = () => { muted = !muted; mb.textContent = muted ? '声音 关' : '声音 开'; if (muted) AUD.pause(); if (playing) show(cur); };
  if (!D.clips) { mb.hidden = true; muted = true; }
  const unmute = $('#unmute');
  if (unmute) unmute.onclick = () => { blocked = false; unmute.hidden = true; muted = false; mb.textContent = '声音 开'; if (playing) show(cur); else play(); };
  $('.prog').onclick = e => { const i = e.target.closest('i'); if (i) show(+i.dataset.i); };
  addEventListener('keydown', e => { if (e.key === ' ') { e.preventDefault(); playing ? pause() : play(); } if (e.key === 'ArrowRight') show(cur + 1); if (e.key === 'ArrowLeft') show(cur - 1); });
  sync();
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) pause(); });

  const ease = (a, b, k) => a + (b - a) * k;
  function frame(now) {
    const s = steps[cur], el = (now - t0) / 1000, T = now / 1000;
    nodes.forEach(nd => {
      const vis = s.kind === 'intro' ? (el * 1.3 > nd.k * 0.45 + 0.6 ? 1 : 0) : s.kind === 'slot' ? (cur >= 1 + nd.k ? 1 : 0) : 1;
      const sc = ease(nd.g.scale.x, Math.max(0.001, vis), 0.14); nd.g.scale.setScalar(sc);
      const hot = pick ? pick === nd : s.kind === 'slot' && s.k === nd.k, done = s.kind === 'outro' || s.kind === 'compare';
      nd.halo.material.opacity = ease(nd.halo.material.opacity, nd.miss ? (s.kind === 'compare' ? 0.45 + 0.35 * Math.sin(T * 5) : 0) : hot ? 0.75 + 0.25 * Math.sin(T * 4) : done ? 0.35 : vis ? 0.12 : 0, 0.12);
      nd.g.position.z = ease(nd.g.position.z, hot ? 0.6 : 0, 0.12);
      if (!RM) nd.g.position.y += Math.sin(T * 1.3 + nd.k) * 0.0009;
    });
    orMarks.forEach(o => { o.material.opacity = ease(o.material.opacity, (s.kind !== 'slot' || cur >= 1 + o.userData.slot) ? 1 : 0, 0.12); });
    edges.forEach(e => { const on = s.kind === 'intro' ? (el > 2.4 ? 1 : 0) : s.kind === 'slot' ? (cur >= 1 + e.userData.b ? 1 : 0) : 1; e.traverse(o => { if (o.material && o.userData.op != null) o.material.opacity = ease(o.material.opacity, on * o.userData.op, 0.12); }); });
    if (!RM) dots.forEach(o => { o.t = (o.t + 0.006) % 1; const at = t => o.sx + (o.ex - o.sx) * (o.d > 0 ? t : 1 - t); o.head.position.set(at(o.t), 0, 0.05); o.trail.forEach(({ t, dt }) => t.position.set(at((o.t - dt + 1) % 1), 0, 0.04)); });
    camP.lerp(camT, RM ? 1 : 0.045); look.lerp(lookT, RM ? 1 : 0.06);
    cam.position.set(camP.x + drag.ry * 5 + (RM ? 0 : Math.sin(T * 0.3) * 0.25), camP.y - 1.6 + drag.rx * 4, camP.z * zoom); cam.lookAt(look);
    grid.position.z = RM ? 0 : (T * 0.6) % 2;
    const bar = document.querySelector('.prog i.on b'); if (bar && playing) bar.style.width = Math.min(100, el / dur(s) * 100).toFixed(1) + '%';
  }
  function loop(now) { frame(now); R.render(scene, cam); requestAnimationFrame(loop); }
  function resize() { const w = stage.clientWidth, h = stage.clientHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  addEventListener('resize', () => { resize(); show(cur); });

  // 拖动换角度、滚轮缩放、悬停看这一块干什么
  const drag = { on: false, x: 0, y: 0, ry: 0, rx: 0 }; let zoom = 1;
  const ray = new THREE.Raycaster(), mp = new THREE.Vector2();
  cv.addEventListener('pointerdown', e => { drag.on = true; drag.x = e.clientX; drag.y = e.clientY; drag.sry = drag.ry; drag.srx = drag.rx; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointerup', e => {
    const moved = Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 6; drag.on = false; if (moved) return;
    const r = cv.getBoundingClientRect(); mp.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(mp, cam);
    const hit = ray.intersectObjects(nodes.map(nd => nd.icon))[0]; if (!hit || hit.object.parent.scale.x < 0.5) return;
    const nd = nodes.find(x => x.icon === hit.object); if (!nd) return;
    pause(); pick = nd; card.innerHTML = cardHtml(D.slots[nd.k], nd.k, [nd.it]); card.classList.add('on'); tip.hidden = true;
  });
  cv.addEventListener('pointermove', e => {
    const r = cv.getBoundingClientRect();
    if (drag.on) { drag.ry = Math.max(-1, Math.min(1, drag.sry - (e.clientX - drag.x) / 300)); drag.rx = Math.max(-0.6, Math.min(0.6, drag.srx + (e.clientY - drag.y) / 300)); tip.hidden = true; return; }
    mp.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(mp, cam);
    const hit = ray.intersectObjects(nodes.map(nd => nd.icon))[0], m = hit && hit.object;
    if (m && m.parent.scale.x > 0.5) { const it = m.userData.it; tip.innerHTML = `<b>${it.n}${m.userData.opt ? '（可选）' : ''}</b>${it.role || '在这个架构里一起配合'}${it.intro ? `<small>${it.intro}</small>` : ''}`; tip.hidden = false; tip.style.left = Math.min(r.width - 310, e.clientX - r.left + 16) + 'px'; tip.style.top = Math.min(r.height - tip.offsetHeight - 8, e.clientY - r.top + 16) + 'px'; }
    else tip.hidden = true;
  });
  cv.addEventListener('pointerleave', () => { tip.hidden = true; });
  cv.addEventListener('wheel', e => { e.preventDefault(); zoom = Math.max(0.6, Math.min(1.5, zoom + e.deltaY / 1200)); }, { passive: false });
})();
