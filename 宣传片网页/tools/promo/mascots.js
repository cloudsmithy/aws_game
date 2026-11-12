// 云上世界的「服务卡通」：full 宣传片序章开头在棋盘、云朵上玩的那群小家伙（EC2 小方块、S3 小桶、Lambda 小圆胖、DynamoDB 三层连在一起的数据库……）。
// window.makeMascot(E, 服务 key, 选项) 返回 { g, R, pose(参数), look(镜头位置), ... }：g 放进场景、自己摆位置和朝向（脸朝 +z，脚底在 y = 0）；每帧先 pose() 摆动作和表情，再 look(镜头) 把转到背面的五官藏起来。
// 身体按服务的样子程序化捏出来，颜色用服务架构图标的颜色，肚子上贴那个服务的架构图标（PROMO_DATA.icons，圆角方块 + 白边贴纸），背后也贴一张小的（从背后看也认得出是谁）；
// 大眼睛（深色描边 + 白眼球 + 黑瞳 + 两个高光，会眨眼，可以看向任意方向）、腮红、小手小脚；蹦跳时整个身子以脚底为支点挤压拉伸（squash & stretch）。
// 卡通渲染：身体一圈深色描边（背面外扩，按屏幕像素算粗细），所有卡通共用一组轮廓光（MASCOT_RIM：颜色、强度、方向，序章每帧按天色改）。
// 只拼进 full 宣传片（build.mjs 的 PAGES.full，放在 promo_open.js 前面）。
(function () {
  const SPEC = {
    ec2: { shape: 'cube', color: '#ED7100' },
    s3: { shape: 'bucket', color: '#7AA116' },
    lambda: { shape: 'ball', color: '#FFB21A' },      // 比 EC2 的橙偏黄，远景里分得开；头顶一个凸起的大「λ」
    dynamodb: { shape: 'stack', color: '#3E86DE' },   // 数据库的蓝（和 RDS 的洋红拉开）
    rds: { shape: 'can', color: '#C925D1' },
    cloudfront: { shape: 'globe', color: '#8C4FFF' },
    sqs: { shape: 'env', color: '#E7157B' },          // 信封：顶上搭一块三角翻盖、封口一颗小火漆
    bedrock: { shape: 'rock', color: '#01A88D' },
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const SPH = new THREE.SphereGeometry(1, 24, 16), SPHL = new THREE.SphereGeometry(1, 12, 8), CIR = new THREE.CircleGeometry(1, 24);
  const basic = c => new THREE.MeshBasicMaterial({ color: c });
  const DARK = basic('#24131c'), WHITE = basic('#ffffff'), MOUTH = basic('#4a1020'), TONGUE = basic('#ff7088');
  const CHEEK = new THREE.MeshBasicMaterial({ color: '#ff7f9f', transparent: true, opacity: 0.55, depthWrite: false });
  const SWEAT = new THREE.MeshBasicMaterial({ color: '#9fd8ff', transparent: true, opacity: 0.92 });
  const STAR = new THREE.MeshBasicMaterial({ color: '#ffe066' });
  // 共用的轮廓光：col 颜色、k 强度、dir 主方向（世界坐标，指向光源；序章每帧算成镜头坐标填进 vdir）
  // self：额外的自发光（按各自的底色），序章末日那一拍灯光压暗时用，卡通原来的颜色不被暗红的环境光吃掉（默认 0）
  const RIM = window.MASCOT_RIM = { col: { value: new THREE.Color('#ffd27a') }, k: { value: 0 }, self: { value: 0 }, vdir: { value: V(0, 1, 0) }, dir: V(0, 1, 0),
    // 每帧调一次：把世界方向换到镜头坐标
    update(cam) { cam.updateMatrixWorld(); this.vdir.value.copy(this.dir).transformDirection(cam.matrixWorldInverse); } };
  const withRim = m => { m.onBeforeCompile = sh => { sh.uniforms.rimCol = RIM.col; sh.uniforms.rimK = RIM.k; sh.uniforms.rimDir = RIM.vdir; sh.uniforms.rimSelf = RIM.self;
      sh.fragmentShader = 'uniform vec3 rimCol; uniform float rimK; uniform vec3 rimDir; uniform float rimSelf;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { float fr = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.4); float dw = 0.25 + 0.75 * clamp(dot(normal, rimDir) * 0.8 + 0.35, 0.0, 1.0); totalEmissiveRadiance += rimCol * rimK * fr * dw + diffuseColor.rgb * rimSelf; }`); };
    m.customProgramCacheKey = () => 'mascotRim'; return m; };
  // 描边：背面画、顶点沿法线往外推（按离镜头的距离换算成固定像素宽，近处最多 0.022）
  const OUTLINE = new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { px: { value: 2.6 }, mx: { value: 0.022 } },
    vertexShader: 'uniform float px, mx; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vec3 n = normalize(normalMatrix * normal); float w = min(px * 0.000584 * -mv.z, mx); mv.xyz += n * w; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'void main(){ gl_FragColor = vec4(0.11, 0.06, 0.09, 1.0); }' });
  window.MASCOT_OUTLINE = OUTLINE;
  let blobT = null;
  const blobTex = () => blobT || (blobT = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(18,28,58,.5)'); gr.addColorStop(0.55, 'rgba(18,28,58,.22)'); gr.addColorStop(1, 'rgba(18,28,58,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })());
  // 服务图标贴纸：圆角方块的架构图标 + 一圈白边（图标是 svg，异步画进画布，画好再传到显卡）
  const badgeTex = {};
  const badgeOf = (E, key) => { if (badgeTex[key]) return badgeTex[key];
    const c = document.createElement('canvas'); c.width = c.height = 256; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; badgeTex[key] = t;
    const I = (window.PROMO_DATA && PROMO_DATA.icons) || {}, im = new Image();
    im.onload = () => { const g = c.getContext('2d'); g.clearRect(0, 0, 256, 256); g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(6, 6, 244, 244, 62); g.fill();
      g.save(); g.beginPath(); g.roundRect(22, 22, 212, 212, 46); g.clip(); g.drawImage(im, 22, 22, 212, 212); g.restore(); t.needsUpdate = true; if (E.renderer && E.renderer.initTexture) E.renderer.initTexture(t); };
    im.src = I[key] || I.cloud; return t; };

  // 圆角方块：在 2×2×2 的细分方块上，每根轴的前一半格子铺在平面部分、后一半铺在圆角上，再把每个点推到「内框 + 半径」的位置；法线直接用推出去的方向（面和面的接缝没有折痕）
  function rbox(w, h, d, r, n = 12) {
    const g = new THREE.BoxGeometry(2, 2, 2, n, n, n), p = g.attributes.position, nr = g.attributes.normal, H = [w / 2 - r, h / 2 - r, d / 2 - r], v = [0, 0, 0], c = [0, 0, 0];
    for (let i = 0; i < p.count; i++) { const s0 = [p.getX(i), p.getY(i), p.getZ(i)];
      for (let a = 0; a < 3; a++) { const s = s0[a], k = Math.abs(s), x = k <= 0.5 ? k / 0.5 * H[a] : H[a] + (k - 0.5) / 0.5 * r; v[a] = Math.sign(s) * x; c[a] = Math.sign(s) * Math.min(x, H[a]); }
      let dx = v[0] - c[0], dy = v[1] - c[1], dz = v[2] - c[2]; const L = Math.hypot(dx, dy, dz) || 1; dx /= L; dy /= L; dz /= L;
      p.setXYZ(i, c[0] + dx * r, c[1] + dy * r, c[2] + dz * r); nr.setXYZ(i, dx, dy, dz); }
    return g; }
  // 圆角圆柱（转出来的）：半径 R、高 h（y 0..h）、倒角 r
  function rcyl(R, h, r, seg = 40) {
    const pts = [], arc = (cx, cy, a0, a1) => { for (let k = 0; k <= 7; k++) { const a = a0 + (a1 - a0) * k / 7; pts.push(new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r)); } };
    pts.push(new THREE.Vector2(0, 0)); arc(R - r, r, -Math.PI / 2, 0); arc(R - r, h - r, 0, Math.PI / 2); pts.push(new THREE.Vector2(0, h));
    return new THREE.LatheGeometry(pts, seg); }
  // 贴纸弯成一段圆柱面（贴在圆滚滚的肚子上不翘边）
  const bent = (s, R) => { const g = new THREE.PlaneGeometry(s, s, 10, 1); if (!R) return g; const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), a = x / R; p.setX(i, R * Math.sin(a)); p.setZ(i, R * Math.cos(a) - R); } g.computeVertexNormals(); return g; };

  window.MASCOT_SPEC = SPEC;
  // 一次蹦跳：u 0→1（0–0.16 下蹲蓄力、0.16 起跳拉长、腾空、0.84 落地压扁、回弹），返回 [离地高度, 挤压量（>0 压扁，<0 拉长）]
  window.mascotHop = (u, H = 0.3) => { if (u <= 0 || u >= 1) return [0, 0];
    if (u < 0.16) return [0, 0.16 * Math.sin(Math.PI * u / 0.16)];
    if (u > 0.86) return [0, 0.2 * Math.sin(Math.PI * (u - 0.86) / 0.14)];
    const a = (u - 0.16) / 0.7; return [H * 4 * a * (1 - a), -0.13 * (1 - 4 * a * (1 - a)) * (a < 0.5 ? 1 : 0.7)]; };

  window.makeMascot = function (E, key, o = {}) {
    const S = SPEC[key] || SPEC.ec2, col = new THREE.Color(o.color || S.color), sc = o.scale || 1;
    const M = (c, k = 0.14) => withRim(new THREE.MeshStandardMaterial({ color: c, roughness: 0.46, emissive: c, emissiveIntensity: k }));   // 软胶玩具的质感
    const bodyM = M(col), lightM = M(col.clone().lerp(new THREE.Color('#ffffff'), 0.34), 0.16), darkM = M(col.clone().lerp(new THREE.Color('#1a0f22'), 0.38), 0.08), innerM = M(col.clone().lerp(new THREE.Color('#0b0610'), 0.55), 0.04);
    innerM.side = THREE.DoubleSide;
    const g = new THREE.Group(), R = new THREE.Group(); g.add(R); R.scale.setScalar(sc);
    const head = new THREE.Group(); R.add(head);   // 五官、贴纸都挂在 head 上（DynamoDB 拆开躲的时候脸跟着最上面那片走）
    const mesh = (geo, mat, x = 0, y = 0, z = 0, par = R, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; par.add(m); return m; };
    const outl = (m) => { const q = new THREE.Mesh(m.geometry, OUTLINE); q.position.copy(m.position); q.rotation.copy(m.rotation); q.scale.copy(m.scale); q.renderOrder = -1; m.parent.add(q); m.userData.ol = q; return q; };
    // 每种身体：front(x, y) 给出正面的表面（z 和法线），face / badge / arm 给出五官、贴纸、胳膊的位置
    let front, faceY, badgeY, badgeS = 0.3, badgeR = 0, armY, armX, top, eyeK = 1, back = null;
    const B0 = 0.07;   // 身体底边离地（下面露出小脚）
    const rev = (rOf) => (x, y) => { const r = rOf(y), z = Math.sqrt(Math.max(0.0001, r * r - x * x)); return { z, n: V(x / r, 0, z / r) }; };
    const ell = (a, b, c, cy) => (x, y) => { const q = 1 - (x / a) ** 2 - ((y - cy) / b) ** 2, z = c * Math.sqrt(Math.max(0.0004, q)); return { z, n: V(x / (a * a), (y - cy) / (b * b), z / (c * c)).normalize() }; };
    const ex = { };
    if (S.shape === 'cube') {   // EC2：圆角小方块 + 头顶一根小天线（转轴在根部，能被吹倒、竖直、挂金币）
      const w = 0.78, h = 0.72, d = 0.7; outl(mesh(rbox(w, h, d, 0.17), bodyM, 0, B0 + h / 2, 0)); top = B0 + h;
      front = () => ({ z: d / 2, n: V(0, 0, 1) }); faceY = B0 + h * 0.64; badgeY = B0 + h * 0.26; badgeS = 0.3; armY = B0 + h * 0.42; armX = w / 2 - 0.02;
      const ant = new THREE.Group(); ant.position.set(0.12, top - 0.01, -0.05); R.add(ant); ex.ant = ant;
      mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.2, 8), darkM, 0, 0.1, 0, ant); mesh(SPHL, lightM, 0, 0.21, 0, ant).scale.setScalar(0.05);
    } else if (S.shape === 'bucket') {   // S3：上宽下窄的小桶，桶口一圈翻边，里面深色，背后搭一根提手
      const rb = 0.27, rt = 0.36, h = 0.7, y0 = B0, y1 = B0 + h;
      const pts = [[0, y0], [rb - 0.07, y0], [rb - 0.02, y0 + 0.015], [rb, y0 + 0.06], [rt, y1 - 0.03], [rt + 0.035, y1 - 0.01], [rt + 0.045, y1 + 0.02], [rt + 0.02, y1 + 0.045], [rt - 0.02, y1 + 0.04]].map(([x, y]) => new THREE.Vector2(x, y));
      outl(mesh(new THREE.LatheGeometry(pts, 44), bodyM)); mesh(new THREE.LatheGeometry([[rt - 0.02, y1 + 0.04], [rt - 0.05, y1], [rb + 0.02, y1 - 0.3], [0, y1 - 0.3]].map(([x, y]) => new THREE.Vector2(x, y)), 44), innerM, 0, 0, 0, R, false);
      const hd = mesh(new THREE.TorusGeometry(rt * 0.96, 0.016, 6, 28, Math.PI), M('#dfe6ee', 0.2), 0, y1, 0); hd.rotation.x = -1.25; ex.handle = hd;
      top = y1 + 0.04; const rOf = y => rb + (rt - rb) * Math.max(0, Math.min(1, (y - y0 - 0.06) / (h - 0.09)));
      front = rev(rOf); faceY = y0 + h * 0.66; badgeY = y0 + h * 0.3; badgeS = 0.3; badgeR = rOf(badgeY); armY = y0 + h * 0.45; armX = rOf(armY) - 0.02;
      ex.rimY = y1; ex.rt = rt; ex.h = h;
    } else if (S.shape === 'ball' || S.shape === 'globe') {   // Lambda：小圆胖，头顶一个凸起的大「λ」；CloudFront：圆球外面绕一圈轨道环（环上有颗小卫星）
      const a = 0.4, b = 0.37, c = 0.37, cy = B0 + b; const m = mesh(new THREE.SphereGeometry(1, 40, 28), bodyM, 0, cy, 0); m.scale.set(a, b, c); outl(m);
      top = cy + b; front = ell(a, b, c, cy); faceY = cy + 0.08; badgeY = cy - 0.15; badgeS = 0.27; badgeR = 0.34; armY = cy - 0.02; armX = a - 0.04;
      if (S.shape === 'globe') { const ring = new THREE.Group(); ring.position.y = cy; ring.rotation.set(1.18, 0, 0.32); R.add(ring);
        mesh(new THREE.TorusGeometry(0.56, 0.02, 8, 64), M('#e6dcff', 0.35), 0, 0, 0, ring); const sat = mesh(SPHL, M('#ffffff', 0.5), 0.56, 0, 0, ring); sat.scale.setScalar(0.055); g.userData.ring = ring; ex.ring = ring; ex.cy = cy; }
      else {   // 「λ」：两笔圆头粗线（长的一笔从左上带个小钩到右下，短的一笔从中间到左下），奶白色，立在头顶稍微往后仰
        const lam = new THREE.Group(); lam.position.set(0, top - 0.06, 0.0); lam.rotation.x = -0.08; lam.scale.setScalar(1.35); head.add(lam); ex.lam = lam;
        const LM = withRim(new THREE.MeshStandardMaterial({ color: '#fff3d6', roughness: 0.4, emissive: '#fff3d6', emissiveIntensity: 0.25 }));
        const tube = pts => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y]) => V(x, y, 0))), 24, 0.04, 8), LM, 0, 0, 0, lam);
        tube([[-0.13, 0.25], [-0.085, 0.27], [-0.05, 0.22], [0.03, 0.08], [0.11, -0.02]]); tube([[-0.015, 0.155], [-0.07, 0.06], [-0.115, -0.02]]);
        [[-0.13, 0.25], [0.11, -0.02], [-0.115, -0.02]].forEach(([x, y]) => mesh(SPHL, LM, x, y, 0, lam).scale.setScalar(0.04)); }
    } else if (S.shape === 'stack') {   // DynamoDB：三层叠起来的数据库（最上面那层厚一点，脸在上面；中间那层浅色、贴图标）
      // 11/09：连成一整个身子（原来是三片分开的圆盘，片与片之间留缝，蹦起来、受惊时一片片错开，看着像裂开了）。现在是一条转出来的轮廓：
      //   三层各自鼓一点，层与层之间收一道浅浅的腰线（最细处半径 RN），整个身子一圈描边；三层分开做网格只是为了中间那层换浅色，接缝正好在腰线最细处、上下严丝合缝
      const R1 = 0.34, R2 = 0.36, R3 = 0.34, RN = 0.318, rc = 0.075, gw = 0.04, yb1 = B0 + 0.206, yb2 = B0 + 0.418, yt = B0 + 0.744;   // 三层半径、腰线、圆角、腰线半高、两道腰线和顶面的高度（和原来三片的分界一样）
      const arc = (pts, cx, cy, a0, a1) => { for (let k = 0; k <= 8; k++) { const a = a0 + (a1 - a0) * k / 8; pts.push([cx + Math.cos(a) * rc, cy + Math.sin(a) * rc]); } };
      const groove = (pts, yb, ra, rb, from, to) => { for (let k = 0; k <= 10; k++) { const s = from + (to - from) * k / 10, b = ra + (rb - ra) * s * s * (3 - 2 * s); pts.push([b - (b - RN) * Math.pow(Math.sin(Math.PI * s), 1.5), yb - gw + 2 * gw * s]); } };   // 两头切线竖直，接得上上下两层的侧面
      const P1 = [[0, B0]]; arc(P1, R1 - rc, B0 + rc, -Math.PI / 2, 0); groove(P1, yb1, R1, R2, 0, 0.5);
      const P2 = []; groove(P2, yb1, R1, R2, 0.5, 1); groove(P2, yb2, R2, R3, 0, 0.5);
      const P3 = []; groove(P3, yb2, R2, R3, 0.5, 1); arc(P3, R3 - rc, yt - rc, 0, Math.PI / 2); P3.push([0, yt]);
      const lathe = pts => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 44);
      [[P1, bodyM], [P2, lightM], [P3, bodyM]].forEach(([pts, mat]) => mesh(lathe(pts), mat));
      const all = [...P1, ...P2.slice(1), ...P3.slice(1)], ol = new THREE.Mesh(lathe(all), OUTLINE); ol.renderOrder = -1; R.add(ol);   // 描边按整个身子的轮廓画一圈
      top = yt + 0.012; const prof = all.filter(([x]) => x > 0);
      const rOf = yy => { if (yy <= prof[0][1]) return prof[0][0]; for (let k = 1; k < prof.length; k++) { const [x0, y0] = prof[k - 1], [x1, y1] = prof[k]; if (yy <= y1) return y1 > y0 ? x0 + (x1 - x0) * (yy - y0) / (y1 - y0) : x1; } return prof[prof.length - 1][0]; };
      front = rev(rOf); faceY = B0 + 0.424 + 0.16; badgeY = B0 + 0.212 + 0.1; badgeS = 0.17; badgeR = R2; armY = B0 + 0.424 + 0.07; armX = 0.33; eyeK = 0.86;
    } else if (S.shape === 'can') {   // RDS：数据库圆罐，罐身两道浅色箍
      const r = 0.33, h = 0.76; outl(mesh(rcyl(r, h, 0.09), bodyM, 0, B0, 0));
      [0.27, 0.56].forEach(f => { const t = mesh(new THREE.TorusGeometry(r + 0.004, 0.016, 6, 48), lightM, 0, B0 + h * f, 0); t.rotation.x = Math.PI / 2; });
      const lid = mesh(CIR, lightM, 0, B0 + h + 0.001, 0); lid.rotation.x = -Math.PI / 2; lid.scale.setScalar(r - 0.08);
      top = B0 + h; front = rev(() => r); faceY = B0 + h * 0.74; badgeY = B0 + h * 0.415 - 0.005; badgeS = 0.16; badgeR = r; armY = B0 + h * 0.48; armX = r - 0.02;
    } else if (S.shape === 'env') {   // SQS：小一号的圆角方块（排队的消息），顶上一块浅色三角翻盖（信封口），翻盖尖儿搭过前沿，封口一颗心形火漆
      const w = 0.6, h = 0.46, d = 0.42; outl(mesh(rbox(w, h, d, 0.13), bodyM, 0, B0 + h / 2, 0)); top = B0 + h;
      const tri = new THREE.Shape(); tri.moveTo(-w / 2 + 0.05, 0); tri.lineTo(w / 2 - 0.05, 0); tri.lineTo(0, -(d + 0.05)); tri.closePath();
      const flap = mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.012, bevelSegments: 2 }), lightM, 0, top - 0.012, -d / 2 + 0.02); flap.rotation.x = -Math.PI / 2 + 0.05;
      const seal = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 18), M('#ffd23f', 0.3), 0, top + 0.005, d / 2 + 0.005); seal.rotation.x = 0.55;
      front = () => ({ z: d / 2, n: V(0, 0, 1) }); faceY = B0 + h * 0.56; badgeY = B0 + h * 0.2; badgeS = 0.15; armY = B0 + h * 0.36; armX = w / 2 - 0.02; eyeK = 0.8;
    } else {   // Bedrock：圆圆的小石头，头顶长一颗发光的晶体
      const a = 0.38, b = 0.36, c = 0.35, cy = B0 + b; const geo = new THREE.SphereGeometry(1, 40, 28), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.045 * Math.sin(x * 5.1 + 1.3) * Math.sin(y * 4.3 + 0.4) + 0.03 * Math.sin(z * 6.7 + x * 2.1); p.setXYZ(i, x * k, y * k, z * k); }
      geo.computeVertexNormals(); const m = mesh(geo, bodyM, 0, cy, 0); m.scale.set(a, b, c); outl(m);
      const crM = new THREE.MeshStandardMaterial({ color: '#b8fff0', emissive: '#4fe6c8', emissiveIntensity: 0.6, roughness: 0.15, flatShading: true }); ex.crM = crM;
      const cr = mesh(new THREE.OctahedronGeometry(0.11, 0), crM, 0.05, cy + b + 0.05, -0.02); cr.scale.set(0.8, 1.4, 0.8); cr.rotation.z = -0.25;
      top = cy + b + 0.12; front = ell(a, b, c, cy); faceY = cy + 0.08; badgeY = cy - 0.16; badgeS = 0.25; badgeR = 0.33; armY = cy - 0.03; armX = a - 0.04;
    }
    // 放到正面表面上：位置贴着表面往外 out，+z 朝法线；记下局部法线（look() 按它判断转没转到背面）
    const faceEls = [];
    const onSurf = (obj, x, y, out = 0.004, par = head, mirror = false) => { const s = front(x, y), n = mirror ? V(s.n.x, s.n.y, -s.n.z) : s.n; obj.position.set(x + n.x * out, y + n.y * out, (mirror ? -s.z : s.z) + n.z * out); obj.lookAt(obj.position.clone().add(n)); par.add(obj); obj.userData.n = n.clone(); faceEls.push(obj); return obj; };
    // 眼睛：深色描边 + 白眼球 + 瞳孔（两个高光）；还有「开心眯眼 ∩」「紧闭 > <」两种换着用（眼球压得比较扁，侧过来不会翘出身体轮廓）
    const ew = 0.086 * eyeK, eh = 0.108 * eyeK, ed = 0.024 * eyeK, pw = 0.058 * eyeK, ph = 0.072 * eyeK, exx = 0.13 * eyeK;
    const eyes = [-1, 1].map(s => { const e = onSurf(new THREE.Group(), s * exx, faceY), open = new THREE.Group(); e.add(open);
      mesh(SPH, DARK, 0, 0, -0.004, open, false).scale.set(ew + 0.014, eh + 0.014, 0.014); mesh(SPH, WHITE, 0, 0, 0, open, false).scale.set(ew, eh, ed);
      const pup = new THREE.Group(); open.add(pup); mesh(SPH, DARK, 0, 0, 0, pup, false).scale.set(pw, ph, 0.01);
      mesh(SPHL, WHITE, -pw * 0.3, ph * 0.36, 0.01, pup, false).scale.setScalar(0.023 * eyeK); mesh(SPHL, WHITE, pw * 0.34, -ph * 0.36, 0.01, pup, false).scale.setScalar(0.011 * eyeK);
      const happy = mesh(new THREE.TorusGeometry(ew * 0.82, 0.016, 6, 16, Math.PI), DARK, 0, -eh * 0.25, 0.004, e, false);
      const shut = new THREE.Group(); e.add(shut); [-1, 1].forEach(k => { const b = mesh(new THREE.BoxGeometry(ew * 1.05, 0.018, 0.008), DARK, 0, k * 0.022 * eyeK, 0.004, shut, false); b.rotation.z = -s * k * 0.42; });
      // 晕乎乎的「@」：一圈螺旋
      const pts = []; for (let k = 0; k <= 40; k++) { const a = k / 40 * Math.PI * 4, r = ew * 0.8 * k / 40; pts.push(V(Math.cos(a) * r, Math.sin(a) * r * 1.15, 0)); }
      const dizzy = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.01, 4), DARK, 0, 0, ed + 0.006, e, false); const dwhite = mesh(SPH, WHITE, 0, 0, 0, e, false); dwhite.scale.set(ew, eh, ed); dizzy.userData.w = dwhite;
      return { e, open, pup, happy, shut, dizzy, s }; });
    const brows = [-1, 1].map(s => { const b = onSurf(new THREE.Group(), s * exx, faceY + eh + 0.045); const m = mesh(new THREE.BoxGeometry(0.08 * eyeK, 0.018, 0.01), DARK, 0, 0, 0, b, false); return { b, m, s }; });
    [-1, 1].forEach(s => onSurf(new THREE.Mesh(CIR, CHEEK), s * (exx + 0.088 * eyeK), faceY - 0.09 * eyeK, 0.006).scale.set(0.052 * eyeK, 0.035 * eyeK, 1));
    // 嘴：微笑 ∪、张嘴笑 D、尖叫（大椭圆）、o、一字、波浪（害怕）
    const mo = onSurf(new THREE.Group(), 0, faceY - 0.102 * eyeK, 0.005), mouths = {};
    mouths.smile = mesh(new THREE.TorusGeometry(0.046 * eyeK, 0.013, 6, 18, Math.PI), MOUTH, 0, 0.01, 0, mo, false); mouths.smile.rotation.z = Math.PI;
    mouths.open = new THREE.Group(); mo.add(mouths.open); mesh(new THREE.CircleGeometry(0.062 * eyeK, 24, Math.PI, Math.PI), MOUTH, 0, 0.012, 0, mouths.open, false); mesh(CIR, TONGUE, 0, -0.027 * eyeK, 0.001, mouths.open, false).scale.set(0.027 * eyeK, 0.016 * eyeK, 1);
    mouths.scream = new THREE.Group(); mo.add(mouths.scream); mesh(CIR, MOUTH, 0, -0.012, 0, mouths.scream, false).scale.set(0.047 * eyeK, 0.07 * eyeK, 1); mesh(CIR, TONGUE, 0, -0.052 * eyeK, 0.001, mouths.scream, false).scale.set(0.027 * eyeK, 0.016 * eyeK, 1);
    mouths.o = mesh(CIR, MOUTH, 0, -0.005, 0, mo, false); mouths.o.scale.set(0.027 * eyeK, 0.033 * eyeK, 1);
    mouths.flat = mesh(new THREE.BoxGeometry(0.062 * eyeK, 0.013, 0.004), MOUTH, 0, 0, 0, mo, false);
    { const pts = []; for (let k = 0; k <= 16; k++) pts.push(V((k / 16 - 0.5) * 0.11 * eyeK, Math.sin(k / 16 * Math.PI * 4) * 0.008, 0)); mouths.wavy = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.006, 5), MOUTH, 0, 0, 0, mo, false); }
    // 肚子上的服务图标贴纸（背后再贴一张小一点的）
    const bmat = new THREE.MeshStandardMaterial({ map: badgeOf(E, key), emissive: '#ffffff', emissiveMap: badgeOf(E, key), emissiveIntensity: 0.36, roughness: 0.5, transparent: true, alphaTest: 0.35 });
    const bdgPar = head;
    // 贴纸按身体表面两个方向的弧度逐点贴上去（12×12 的网格，每个点放到 front(x, y) 的表面外面一点）：球、上宽下窄的桶也不会有哪个角陷进身体里被切掉
    const conf = (s, cy, out, par, mirror = false) => { const N = 12, geo = new THREE.PlaneGeometry(s, s, N, N), p = geo.attributes.position, zs = mirror ? -1 : 1, c0 = front(0, cy), C = V(0, cy, zs * c0.z);
      for (let i = 0; i < p.count; i++) { const lx = p.getX(i), ly = p.getY(i), x = mirror ? -lx : lx, y = cy + ly, f = front(x, y); p.setXYZ(i, x + f.n.x * out, y + f.n.y * out - cy, zs * (f.z + f.n.z * out) - C.z); }
      geo.computeVertexNormals(); const m = new THREE.Mesh(geo, bmat); m.position.copy(C); m.renderOrder = 1; par.add(m); m.userData.n = V(c0.n.x, c0.n.y, zs * c0.n.z); faceEls.push(m); return m; };
    const bdg = conf(badgeS, badgeY, 0.008, bdgPar);
    const bdgB = conf(badgeS * 0.85, S.shape === 'stack' ? faceY - 0.02 : (badgeY + faceY) / 2, 0.008, head, true);
    // 小手（转轴在肩膀）、小脚
    const arms = [-1, 1].map(s => { const A = new THREE.Group(); A.position.set(s * armX, armY, 0); (S.shape === 'stack' ? head : R).add(A); const L = new THREE.Group(); A.add(L);
      mesh(new THREE.CapsuleGeometry(0.042, 0.08, 4, 10), bodyM, 0, -0.07, 0, L); mesh(SPH, bodyM, 0, -0.14, 0, L).scale.setScalar(0.056); return { A, L, s }; });
    const feet = [-1, 1].map(s => { const f = mesh(SPH, darkM, s * 0.12, 0.045, 0.03); f.scale.set(0.085, 0.05, 0.105); return f; });
    // 汗珠（慌的时候）
    const sweat = new THREE.Group(); sweat.position.set(armX + 0.02, top - 0.12, 0.12); R.add(sweat); mesh(SPHL, SWEAT, 0, 0, 0, sweat, false).scale.setScalar(0.036); mesh(new THREE.ConeGeometry(0.032, 0.06, 10), SWEAT, 0, 0.04, 0, sweat, false);
    // 被球砸晕：头顶转圈的三颗小星星
    const stars = new THREE.Group(); stars.position.y = top + 0.08; R.add(stars); const starGeo = new THREE.OctahedronGeometry(0.05, 0);
    for (let k = 0; k < 3; k++) { const s = mesh(starGeo, STAR, 0, 0, 0, stars, false); s.scale.set(1, 1, 0.4); }
    // S3 躲进桶里：整个桶扣过来，桶沿底下露出一双眼睛
    let peek = null; if (S.shape === 'bucket') { peek = new THREE.Group(); R.add(peek);
      [-1, 1].forEach(s => { const e = new THREE.Group(); e.position.set(s * 0.085, 0, 0); peek.add(e); mesh(SPH, DARK, 0, 0, -0.003, e, false).scale.set(0.058, 0.05, 0.012); mesh(SPH, WHITE, 0, 0, 0, e, false).scale.set(0.048, 0.04, 0.016);
        const p = mesh(SPH, DARK, 0, -0.006, 0.012, e, false); p.scale.set(0.026, 0.028, 0.008); mesh(SPHL, WHITE, -0.008, 0.004, 0.02, e, false).scale.setScalar(0.009); }); }
    // 脚底的软影子（不在 R 里：跳起来时影子留在地上、缩小变淡）
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: 1 })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.014; blob.scale.setScalar(0.95 * sc); blob.renderOrder = 0; g.add(blob);
    const seed = o.seed != null ? o.seed : (key.length * 0.37) % 1;
    const wp = V(0, 0, 0), wn = V(0, 0, 0), tc = V(0, 0, 0), q = new THREE.Quaternion();
    const api = { g, R, head, key, top: top * sc, eyes, arms, feet, blob, badge: bdg, bodyM, ex, sc,
      // t 时间（眨眼、发抖、汗珠用）；hop 离地高度；squash >0 压扁 <0 拉长；lean 前后倾、tilt 左右歪、spin 绕竖轴转（都是弧度）；
      // armL / armR = [往前抬, 往外张]（弧度），armK 胳膊伸长倍数（抱头时手要够到头顶）；walk 迈腿幅度、step 步子相位；
      // eyes 'open' | 'wide'（瞪大、瞳孔缩小）| 'happy'（∩）| 'shut'（> <）| 'dizzy'（@）；look = [左右, 上下]（-1..1，看向哪儿）；blink false 不自动眨眼；
      // mouth 见上；brow >0 担心（眉头往中间抬）<0 生气；tremble 发抖；sweat 0..1 汗珠；stars 0..1 头顶转圈的小星星；
      // ant 天线往后倒的角度（EC2）；discs 不再用（DynamoDB 11/09 起是连在一起的一整个身子，给了也不拆开）；cover 0..1 扣进桶里（S3），peek 0..1 桶沿掀起来露出眼睛；
      // hug 0..1 抱着自己缩成一团（CloudFront 的轨道环收紧）；pivot 'c' = 绕身体中心转（翻跟头、侧翻用），默认绕脚底
      pose({ t = 0, hop = 0, squash = 0, lean = 0, tilt = 0, spin = 0, armL = [0, 0.32], armR = [0, 0.32], armK = 1, walk = 0, step = 0, eyes: em = 'open', look = [0, 0], blink = true, mouth = 'smile', brow = 0, tremble = 0, sweat: sw = 0,
        stars: st = 0, ant = 0, discs = null, cover = 0, peek: pk = 0, hug = 0, pivot = null, scale: s2 = 1 } = {}) {
        const S2 = sc * s2, cy = pivot === 'c' ? top * 0.5 * S2 : 0;
        R.position.set(tremble ? Math.sin(t * 97 + seed * 9) * 0.014 * tremble : 0, hop, 0);
        R.rotation.set(lean, spin, tilt); R.scale.set(S2 * (1 + squash * 0.55), S2 * (1 - squash), S2 * (1 + squash * 0.55));
        if (cy) { R.updateMatrix(); const c0 = V(0, cy / S2, 0).applyMatrix4(R.matrix).sub(R.position); R.position.add(V(0, cy, 0).sub(c0)); }
        // 扣进桶里：绕桶身中间翻 180°，桶口朝下贴地；peek 把一边掀起来，桶沿底下露出一双眼睛
        if (peek) { peek.visible = cover > 0.85 && pk > 0.02; if (cover > 0) { const hm = (ex.rimY + 0.045) / 2, a = Math.PI * cover + (cover > 0.85 ? 0.24 * pk : 0);
            R.rotation.x = lean + a; R.updateMatrix(); const c0 = V(0, hm, 0).applyMatrix4(R.matrix).sub(R.position); R.position.add(V(0, hm * S2, 0).sub(c0)); R.position.y += 0.05 * pk * S2;
            peek.position.set(0, ex.rimY - 0.035, -(ex.rt + 0.035)); peek.rotation.set(Math.PI, 0, 0); peek.scale.setScalar(Math.max(0.001, pk)); }
          const hid = cover < 0.6; arms.forEach(A => { A.A.visible = hid; }); feet.forEach(f => { f.visible = hid; }); }
        blob.scale.setScalar(0.95 * S2 * Math.max(0.35, 1 - hop * 0.35)); blob.material.opacity = Math.max(0.15, 1 - hop * 0.5);
        [armL, armR].forEach(([f, out], k) => { const A = arms[k]; A.A.rotation.set(-f, 0, A.s * out); A.L.scale.set(1, armK, 1); });
        feet.forEach((f, k) => { const ph = step + k * Math.PI; f.position.set(f.position.x, 0.045 + Math.max(0, Math.sin(ph)) * 0.07 * walk, 0.03 + Math.cos(ph) * 0.07 * walk); });
        let bk = 1; if (blink && em !== 'happy' && em !== 'shut' && em !== 'dizzy') { const q2 = ((((t * 0.62 + seed) % 1) + 1) % 1) * 1.6; if (q2 < 0.11) bk = 0.12 + 0.88 * Math.abs(q2 - 0.055) / 0.055; }
        const wide = em === 'wide' ? 1 : 0, lx = Math.max(-1, Math.min(1, look[0])), ly = Math.max(-1, Math.min(1, look[1]));
        eyes.forEach(E2 => { E2.open.visible = em === 'open' || em === 'wide'; E2.happy.visible = em === 'happy'; E2.shut.visible = em === 'shut'; E2.dizzy.visible = E2.dizzy.userData.w.visible = em === 'dizzy';
          if (em === 'dizzy') E2.dizzy.rotation.z = t * 9 * E2.s;
          E2.e.scale.set(1 + 0.12 * wide, bk * (1 + 0.16 * wide), 1); const pk2 = 1 - 0.42 * wide, px = lx * (ew - pw * pk2) * 0.85, py = ly * (eh - ph * pk2) * 0.85;
          E2.pup.position.set(px, py, ed * Math.sqrt(Math.max(0, 1 - (px / ew) ** 2 - (py / eh) ** 2)) + 0.003); E2.pup.scale.setScalar(pk2); });
        faceEls.forEach(el => { el.visible = true; });
        brows.forEach(b => { b.b.visible = brow !== 0; b.m.rotation.z = -b.s * 0.42 * brow; b.m.position.y = 0.012 * Math.abs(brow); });
        Object.entries(mouths).forEach(([k, m]) => { m.visible = k === mouth; });
        sweat.visible = sw > 0.02; if (sweat.visible) { const u = (((t * 1.6 + seed) % 1) + 1) % 1; sweat.position.y = top - 0.1 - 0.08 * u; sweat.scale.setScalar(sw * (u < 0.85 ? 1 : (1 - u) / 0.15)); }
        stars.visible = st > 0.02; if (stars.visible) stars.children.forEach((s, k) => { const a = t * 7 + k * 2.094; s.position.set(Math.cos(a) * 0.22, Math.sin(t * 9 + k) * 0.02, Math.sin(a) * 0.16); s.rotation.set(0, a * 2, 0); s.scale.set(st, st, 0.4 * st); });
        if (ex.ant) ex.ant.rotation.set(-ant, 0, 0);
        if (ex.ring) { const k = hug; ex.ring.scale.setScalar(1 - 0.3 * k); ex.ring.rotation.set(1.18 + 0.38 * k, 0, 0.32 - 0.5 * k); }
        head.visible = true; if (peek) head.visible = cover < 0.5;
        if (g.userData.ring) g.userData.ring.children[1].position.set(Math.cos(t * 2.4) * 0.56, Math.sin(t * 2.4) * 0.56, 0);
      },
      // 每帧 pose 之后调：转到离镜头太远（法线和视线夹角 > 约 78°）的五官、贴纸藏起来（侧过身时不会贴在身体轮廓外面）
      look(cam) { g.updateMatrixWorld(true); faceEls.forEach(el => { if (!el.parent || !el.parent.visible) return; el.getWorldPosition(wp); el.parent.getWorldQuaternion(q); wn.copy(el.userData.n).applyQuaternion(q); tc.copy(cam).sub(wp).normalize(); el.visible = el.visible && wn.dot(tc) > 0.2; }); },
    };
    api.pose(); return api;
  };
})();
