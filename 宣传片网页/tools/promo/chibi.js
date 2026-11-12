// Q 版小人：大头小身子，用几何体捏出来（发型、眼镜、披风、西装、金链子、王冠这些都是可选配件），给 full 宣传片的序章和片尾彩蛋用。
// makeChibi(E, 选项) 返回 { g, pose(参数) }：g 放进场景、自己摆位置；每帧调一次 pose() 摆动作和表情。
// 高约 1.9（脚底在 y=0），脸朝 +z。
(function () {
  const glowTex = (() => { let t = null; return () => { if (t) return t; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return (t = new THREE.CanvasTexture(c)); }; })();

  // 羊毛毡质感：表面一层细绒（sheen）+ 细小的纤维凹凸
  const feltBump = (() => { let t = null; return () => { if (t) return t; const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
    let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 2600; k++) { const x = r() * 256, y = r() * 256, a = r() * Math.PI, l = 3 + r() * 9; g.strokeStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},.18)`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t; }; })();

  // 虫虫：按她给的羊毛毡 Q 版形象（深棕齐肩发 + 斜刘海 + 侧边低马尾、大眼睛长睫毛、米色高领毛衣 + 橙色笑脸徽章、棕色百褶短裙、米色袜套、棕鞋）
  window.CHIBI_CHONG = { felt: true, shirt: '#f1e2c6', sweater: true, pin: '#f08a24', skirt: '#8a5a32', pants: '#ffdcc4', warmers: '#efe1c4', shoe: '#7a4e2c', hair: 'chong', hairColor: '#3a2418', eyes: 'big', lashes: true, browH: 0.018, openSmile: true, sprite: 'chong' };

  // 几个人的样子（韩叔、Yuki 按本人照片；虫虫用她给的原图；Damo 是一拳超人）
  window.CHIBI_CAST = {
    han: { shirt: '#1d1d22', hair: 'crop', hairColor: '#111114', eyes: 'calm', browH: 0.034, collar: true, lanyard: '#e5484d' },
    hanDark: { shirt: '#1d1d22', suit: true, tie: '#e5484d', shades: true, chain: true, hair: 'crop', hairColor: '#111114', eyes: 'calm', browH: 0.034 },
    yuki: { shirt: '#3a3a3e', pants: '#1d1d22', shoe: '#9b5cf6', hair: 'quiff', hairColor: '#2a1d16', backpack: '#1c1c1f', sprite: 'yuki' },   // 他的红披风被队长 Damo 抢走了
    damo: { shirt: '#1f9d55', hair: 'bald', eyes: 'dot', cape: '#d42a2a', gloves: '#ffffff' },   // 披的是从 Yuki 那儿抢来的红披风
  };
  const SPH = { han: 2.1, damo: 1.9, chong: 1.9, yuki: 2.0 };   // 设定图人物的身高（韩叔算上王冠；Yuki 比虫虫高一点）
  window.makeChibi = function (E, o) {
    // 临时：promo_full.js 里虫虫的三处调用还写着旧的通用形象，这里先换成她的样子（等那边的修改跑完再把调用处改成 CHIBI_CHONG）
    if (o.shirt === '#2f7cf6' && o.hair === 'spiky') o = window.CHIBI_CHONG;
    const SP = window.PROMO_DATA && PROMO_DATA.sprites; if (o.sprite && SP && SP[o.sprite]) return window.makeSpriteChibi(E, SP[o.sprite], SPH[o.sprite]);   // 有角色设定图的人直接用设定图
    o = { felt: true, ...o, eyes: o.eyes === 'calm' || !o.eyes ? 'big' : o.eyes };   // 统一成羊毛毡玩偶风格：毛绒材质、大眼睛（Damo 的豆豆眼是一拳超人的梗，保留）
    const M = (c, r = 0.55, m = 0) => o.felt && !m ? new THREE.MeshPhysicalMaterial({ color: c, roughness: 1, sheen: 1, sheenRoughness: 0.8, sheenColor: new THREE.Color(c).lerp(new THREE.Color('#ffffff'), 0.35), bumpMap: feltBump(), bumpScale: 0.6 })
      : new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    const skin = M(o.skin || '#ffdcc4', o.hair === 'bald' ? 0.32 : 0.6), shirtM = M(o.shirt, 0.55), pants = M(o.pants || '#2b3445', 0.7), shoeM = M(o.shoe || '#ffffff', 0.5);
    const hairM = M(o.hairColor || '#2a1d17', 0.42), black = M('#15171c', 0.35), white = M('#ffffff', 0.4), gold = M('#ffc23a', 0.35, 0.35);
    gold.emissive.set('#a86400'); gold.emissiveIntensity = 0.5;   // 场景里没有环境贴图，金属度太高会发灰发棕，所以降金属度、加一点自发光
    const handM = o.gloves ? M(o.gloves, 0.5) : skin, torsoM = o.suit ? M('#23232b', 0.5) : shirtM;
    const g = new THREE.Group(), R = new THREE.Group(); g.add(R);
    const mesh = (geo, mat, x = 0, y = 0, z = 0, par = R) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; par.add(m); return m; };

    // 脚底的软阴影（离开棋盘、没有实时阴影的地方也站得住）
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: glowTex(), transparent: true, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.012; g.add(blob);

    // 腿和鞋
    const legs = [-1, 1].map(s => { const L = new THREE.Group(); L.position.set(s * 0.13, 0.36, 0); R.add(L);
      mesh(new THREE.CylinderGeometry(0.085, 0.09, 0.3, 20), pants, 0, -0.15, 0, L); mesh(new THREE.SphereGeometry(0.12, 24, 12), shoeM, 0, -0.3, 0.05, L).scale.set(1, 0.65, 1.35);
      if (o.warmers) mesh(new THREE.CylinderGeometry(0.105, 0.11, 0.13, 20), M(o.warmers), 0, -0.21, 0, L);
      return L; });
    // 身体：圆筒 + 圆肩
    const body = new THREE.Group(); body.position.y = 0.36; R.add(body);
    mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.46, 32), torsoM, 0, 0.23, 0, body);
    mesh(new THREE.SphereGeometry(0.24, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), torsoM, 0, 0.46, 0, body).scale.set(1, 0.45, 1);
    if (o.sweater) {   // 高领毛衣：翻领 + 下摆罗纹
      const tn = mesh(new THREE.TorusGeometry(0.17, 0.065, 14, 32), torsoM, 0, 0.5, 0, body); tn.rotation.x = Math.PI / 2;
      const hem = mesh(new THREE.TorusGeometry(0.29, 0.04, 10, 36), torsoM, 0, 0.03, 0, body); hem.rotation.x = Math.PI / 2;
    }
    if (o.pin) {   // 胸前的橙色笑脸徽章
      const pin = new THREE.Group(); pin.position.set(0.11, 0.3, 0.262); pin.rotation.x = -0.15; body.add(pin);
      mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 24), M(o.pin, 0.6), 0, 0, 0, pin).rotation.x = Math.PI / 2;
      [-1, 1].forEach(s2 => mesh(new THREE.SphereGeometry(0.008, 8, 6), black, s2 * 0.018, 0.012, 0.012, pin));
      const sm = mesh(new THREE.TorusGeometry(0.02, 0.005, 6, 12, Math.PI), black, 0, -0.004, 0.012, pin); sm.rotation.z = Math.PI;
    }
    if (o.skirt) {   // 百褶短裙
      const sk = mesh(new THREE.CylinderGeometry(0.27, 0.4, 0.18, 18, 1, true), M(o.skirt), 0, 0.31, 0); sk.material.side = THREE.DoubleSide; sk.material.flatShading = true;
    }
    if (o.suit) {   // 西装：白衬衫领口 + 领带（领带用他的玩家颜色）
      const v = new THREE.Shape(); v.moveTo(-0.11, 0.47); v.lineTo(0.11, 0.47); v.lineTo(0, 0.2); v.lineTo(-0.11, 0.47);
      const sh = mesh(new THREE.ShapeGeometry(v), white, 0, 0, 0.262, body); sh.rotation.x = -0.12;
      mesh(new THREE.BoxGeometry(0.05, 0.22, 0.02), M(o.tie || o.shirt, 0.45), 0, 0.32, 0.285, body).rotation.x = -0.12;
    }
    if (o.collar) [-1, 1].forEach(s => { const c = mesh(new THREE.BoxGeometry(0.14, 0.03, 0.1), torsoM, s * 0.08, 0.47, 0.2, body); c.rotation.set(0.4, s * 0.5, -s * 0.5); });   // 衬衫领子
    if (o.lanyard) {   // 讲者挂牌：一根挂绳 + 胸前一张小牌子
      const lm = M(o.lanyard, 0.5); [-1, 1].forEach(s => { const st = mesh(new THREE.BoxGeometry(0.022, 0.3, 0.01), lm, s * 0.07, 0.34, 0.26, body); st.rotation.set(-0.2, 0, -s * 0.22); });
      mesh(new THREE.BoxGeometry(0.15, 0.1, 0.012), white, 0, 0.19, 0.3, body).rotation.x = -0.2; mesh(new THREE.BoxGeometry(0.15, 0.03, 0.014), lm, 0, 0.225, 0.302, body).rotation.x = -0.2;
    }
    if (o.chain) {  // 大金链子 + 金币吊坠
      const ch = mesh(new THREE.TorusGeometry(0.19, 0.024, 10, 48), gold, 0, 0.44, 0.06, body); ch.rotation.x = 1.15;
      mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.025, 28), gold, 0, 0.3, 0.27, body).rotation.x = Math.PI / 2 - 0.15;
    }
    if (o.backpack) {   // 双肩包：胸前两根肩带 + 背后的包
      const bm = M(o.backpack, 0.6);
      [-1, 1].forEach(s => { const st = mesh(new THREE.BoxGeometry(0.06, 0.44, 0.03), bm, s * 0.15, 0.27, 0.27, body); st.rotation.set(-0.18, 0, s * 0.08); });
      mesh(new THREE.BoxGeometry(0.4, 0.44, 0.18), bm, 0, 0.27, -0.3, body);
    }
    // 胳膊：转轴在肩膀；pose 里 [前后, 向外] 两个角度
    const sleeveM = o.suit ? torsoM : shirtM;
    const arms = [-1, 1].map(s => { const A = new THREE.Group(); A.position.set(s * 0.27, 0.42, 0); body.add(A);
      mesh(new THREE.CapsuleGeometry(o.sweater ? 0.09 : 0.075, 0.2, 6, 16), sleeveM, 0, -0.15, 0, A); mesh(new THREE.SphereGeometry(0.095, 20, 12), handM, 0, -0.33, 0, A);
      if (o.sweater) { const cf = mesh(new THREE.TorusGeometry(0.085, 0.03, 8, 20), sleeveM, 0, -0.27, 0, A); cf.rotation.x = Math.PI / 2; }
      return A; });
    // 披风：挂在肩膀后面，往下飘
    let cape = null;
    if (o.cape) {
      cape = new THREE.Group(); cape.position.set(0, 0.8, o.backpack ? -0.42 : -0.2); R.add(cape);
      const geo = new THREE.PlaneGeometry(0.66, 0.82, 8, 10), p = geo.attributes.position;
      for (let k = 0; k < p.count; k++) { const x = p.getX(k), y = p.getY(k), w = 1 + (0.41 - y) * 0.5; p.setX(k, x * w); p.setZ(k, -Math.abs(x * w) * 0.35 - 0.05); p.setY(k, y - 0.41); }
      geo.computeVertexNormals();
      const cm = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: o.cape, roughness: 0.6, side: THREE.DoubleSide })); cm.castShadow = true; cape.add(cm);
    }

    // 头：大圆脑袋
    const head = new THREE.Group(); head.position.y = 1.25; R.add(head);
    mesh(new THREE.SphereGeometry(0.52, 48, 32), skin, 0, 0, 0, head).scale.set(1, 0.95, 0.95);
    // 眼睛：大黑眼珠 + 高光；dot 是一拳超人那种豆豆眼
    const eyes = [-1, 1].map(s => { const e = new THREE.Group(); e.position.set(s * 0.18, -0.02, 0.45); head.add(e);
      if (o.eyes === 'dot') mesh(new THREE.SphereGeometry(0.032, 16, 10), black, 0, 0, 0.01, e).scale.set(1, 1, 0.5);
      else if (o.eyes === 'big') {   // 大眼睛：深棕外圈 + 浅一点的瞳孔 + 两个高光 + 上睫毛
        const S2 = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.25 });
        mesh(new THREE.SphereGeometry(0.085, 28, 18), S2('#24140c'), 0, 0, 0, e).scale.set(0.9, 1.15, 0.45);
        mesh(new THREE.CircleGeometry(0.05, 24), new THREE.MeshBasicMaterial({ color: '#7a4a2a' }), 0, -0.022, 0.04, e).scale.set(0.9, 0.85, 1);
        mesh(new THREE.SphereGeometry(0.024, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), -s * 0.022, 0.04, 0.042, e);
        mesh(new THREE.SphereGeometry(0.011, 10, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), s * 0.025, -0.035, 0.042, e);
        if (o.lashes) { const lm = S2('#1a0f0a'), arc = mesh(new THREE.TorusGeometry(0.083, 0.011, 6, 20, Math.PI * 0.85), lm, 0, 0.012, 0.03, e); arc.rotation.z = Math.PI * 0.075; arc.scale.set(1.0, 1.15, 1);
          [0, 1, 2].forEach(k => { const t2 = mesh(new THREE.BoxGeometry(0.008, 0.032, 0.008), lm, -s * (0.055 + k * 0.016), 0.075 - k * 0.022, 0.032, e); t2.rotation.z = s * (0.5 + k * 0.35); }); }
      }
      else { mesh(new THREE.SphereGeometry(0.07, 24, 16), black, 0, 0, 0, e).scale.set(0.85, o.eyes === 'calm' ? 1.0 : 1.3, 0.5); mesh(new THREE.SphereGeometry(0.024, 12, 8), white, -s * 0.02, o.eyes === 'calm' ? 0.03 : 0.04, 0.035, e); }
      return e; });
    const brows = [-1, 1].map(s => mesh(new THREE.BoxGeometry(0.14, o.browH || 0.026, 0.03), o.hair === 'bald' ? M('#8a6a55', 0.6) : hairM, s * 0.18, 0.17, 0.44, head));
    // 嘴：几种表情来回切
    const mouthM = M('#7a2a22', 0.6), mouths = {};
    if (o.openSmile) {   // 张嘴笑：粉红色的半圆嘴 + 小舌头
      mouths.smile = new THREE.Group(); mouths.smile.position.set(0, -0.155, 0.462); head.add(mouths.smile);
      mesh(new THREE.CircleGeometry(0.075, 24, Math.PI, Math.PI), new THREE.MeshBasicMaterial({ color: '#b8435a' }), 0, 0, 0, mouths.smile);
      mesh(new THREE.CircleGeometry(0.04, 20), new THREE.MeshBasicMaterial({ color: '#f28c9a' }), 0, -0.05, 0.002, mouths.smile).scale.set(1.1, 0.55, 1);
    } else { mouths.smile = mesh(new THREE.TorusGeometry(0.075, 0.018, 8, 20, Math.PI), mouthM, 0, -0.17, 0.455, head); mouths.smile.rotation.z = Math.PI; }
    mouths.grin = mesh(new THREE.CircleGeometry(0.1, 24, Math.PI, Math.PI), M('#6b1a1a', 0.6), 0, -0.15, 0.462, head);
    mouths.o = mesh(new THREE.TorusGeometry(0.045, 0.017, 8, 20), mouthM, 0, -0.19, 0.452, head);
    mouths.flat = mesh(new THREE.BoxGeometry(0.11, 0.018, 0.02), mouthM, 0, -0.18, 0.455, head);
    mouths.smirk = mesh(new THREE.TorusGeometry(0.06, 0.017, 8, 20, Math.PI * 0.8), mouthM, 0.035, -0.17, 0.455, head); mouths.smirk.rotation.z = Math.PI + 0.35;
    // 腮红
    [-1, 1].forEach(s => { const b = mesh(new THREE.CircleGeometry(o.eyes === 'big' ? 0.088 : 0.075, 20), new THREE.MeshBasicMaterial({ color: o.eyes === 'big' ? '#ff8a96' : '#ff8f8f', transparent: true, opacity: o.eyes === 'big' ? 0.55 : 0.45, depthWrite: false }), s * 0.3, -0.12, 0.392, head); b.rotation.y = s * 0.62; });
    if (o.stubble) [[0, -0.27, 0.43, 0.11, 0.06], [0, -0.115, 0.468, 0.08, 0.02]].forEach(([x, y, z, w, h]) => { const m = mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: '#2a1d17', transparent: true, opacity: 0.09, depthWrite: false }), x, y, z, head); m.scale.set(w, h, 1); m.rotation.x = y < -0.2 ? 0.55 : 0.1; });
    // 墨镜
    let shades = null;
    if (o.shades) { shades = new THREE.Group(); head.add(shades); shades.position.set(0, 0, 0.51);
      [-1, 1].forEach(s => mesh(new THREE.BoxGeometry(0.21, 0.2, 0.03), black, s * 0.18, 0, 0, shades)); mesh(new THREE.BoxGeometry(0.12, 0.025, 0.02), black, 0, 0.03, 0, shades); }

    // 发型
    const capTop = (rx, col = hairM, r = 0.56) => { const c = mesh(new THREE.SphereGeometry(r, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.5), col, 0, 0, 0, head); c.scale.set(1.0, 0.98, 0.98); c.rotation.x = rx; return c; };
    if (o.hair === 'spiky') {
      capTop(-0.32);
      for (let k = 0; k < 7; k++) { const a = -1.2 + k * 0.4, sp = mesh(new THREE.ConeGeometry(0.12, 0.34, 12), hairM, Math.sin(a) * 0.36, 0.38 + Math.cos(a) * 0.05, -0.12 - Math.abs(Math.sin(a)) * 0.05, head); sp.rotation.set(-0.5, 0, -a * 0.9); }
      [-0.16, 0, 0.16].forEach((x, k) => { const f = mesh(new THREE.ConeGeometry(0.08, 0.2, 10), hairM, x, 0.3, 0.42, head); f.rotation.set(Math.PI - 0.5, 0, (k - 1) * 0.3); });
    } else if (o.hair === 'bob') {
      capTop(-0.18);
      const back = mesh(new THREE.CylinderGeometry(0.57, 0.6, 0.5, 40, 1, true, Math.PI * 0.55, Math.PI * 0.9), hairM, 0, -0.18, 0, head); back.material.side = THREE.DoubleSide;
      [-1, 1].forEach(s => mesh(new THREE.CapsuleGeometry(0.1, 0.3, 6, 12), hairM, s * 0.47, -0.2, 0.12, head));
      mesh(new THREE.SphereGeometry(0.22, 24, 12), hairM, 0, 0.3, 0.36, head).scale.set(2.1, 0.55, 0.8);
    } else if (o.hair === 'slick') {   // 往后梳的油头
      capTop(-0.42, M(o.hairColor || '#15120f', 0.2, 0.1));
      mesh(new THREE.SphereGeometry(0.2, 24, 12), M(o.hairColor || '#15120f', 0.2, 0.1), 0.12, 0.42, 0.26, head).scale.set(1.9, 0.6, 1);
    } else if (o.hair === 'chong') {
      capTop(-0.5, hairM, 0.575);
      [[-0.34, 0.25, 0.5], [-0.2, 0.27, 0.46], [-0.06, 0.27, 0.42], [0.08, 0.26, 0.36], [0.22, 0.24, 0.3], [0.35, 0.19, 0.2]].forEach(([x, y, rz], k) => {   // 斜刘海：贴着额头往一边斜下来，长短不齐
        const z = Math.sqrt(Math.max(0, 0.29 - x * x - y * y)) * 0.95 + 0.012, b = mesh(new THREE.CapsuleGeometry(0.058, 0.13 + (k % 2) * 0.04, 6, 12), hairM, x, y - 0.02, z, head);
        b.rotation.set(-Math.asin(Math.min(0.9, y / 0.55)) * 0.9, -x * 1.1, rz); b.scale.set(1, 1, 0.5); });
      [-1, 1].forEach(sd => { [0.08, -0.06].forEach((zz, k) => { const b = mesh(new THREE.CapsuleGeometry(0.1, 0.34, 6, 12), hairM, sd * (0.47 - k * 0.03), -0.2, zz, head); b.rotation.z = sd * 0.08; }); });   // 两边垂到下巴
      const back = mesh(new THREE.CylinderGeometry(0.56, 0.5, 0.5, 40, 1, true, Math.PI * 0.6, Math.PI * 0.8), hairM, 0, -0.16, 0, head); back.material.side = THREE.DoubleSide;
      const pony = new THREE.Group(); pony.position.set(0.4, -0.3, -0.28); head.add(pony);   // 侧边低马尾
      mesh(new THREE.SphereGeometry(0.06, 12, 8), M('#2a180f'), 0, 0.04, 0.02, pony);
      [[0, -0.1, 0, 0.14], [0.06, -0.16, -0.04, 0.11], [-0.05, -0.18, 0.03, 0.1], [0.02, -0.26, -0.02, 0.08]].forEach(([x, y, z, r]) => mesh(new THREE.SphereGeometry(r, 16, 10), hairM, x, y, z, pony).scale.set(1, 1.25, 1));
    } else if (o.hair === 'crop') {
      const mat = M(o.hairColor || '#111114', 0.92);   // 哑光，像又短又密的寸头，不反光
      const c = capTop(-0.44, mat, 0.575); c.scale.set(1.03, 1.0, 1.0);
      [-1, 1].forEach(sd => mesh(new THREE.BoxGeometry(0.06, 0.2, 0.13), mat, sd * 0.5, 0.04, 0.16, head).rotation.y = sd * 0.35);   // 方方的鬓角
    } else if (o.hair === 'quiff') {
      capTop(-0.3);
      const q = mesh(new THREE.SphereGeometry(0.16, 24, 14), hairM, 0.06, 0.4, 0.3, head); q.scale.set(1.7, 0.62, 1.0); q.rotation.set(-0.35, 0, -0.22);   // 前面往上往旁边翘的一撮
      [[-0.2, 0.44, 0.16, 0.09], [0.0, 0.52, 0.06, 0.1], [0.2, 0.46, 0.1, 0.09], [-0.12, 0.5, -0.12, 0.1], [0.14, 0.47, -0.16, 0.09], [0.32, 0.33, 0.2, 0.08], [-0.33, 0.33, 0.18, 0.08]].forEach(([x, y, z, r]) => mesh(new THREE.SphereGeometry(r, 16, 10), hairM, x, y, z, head).scale.set(1.25, 0.6, 1.1));
      [-1, 1].forEach(sd => mesh(new THREE.SphereGeometry(0.13, 16, 10), hairM, sd * 0.45, 0.12, 0.05, head).scale.set(0.5, 1.2, 1.1));
    } else if (o.hair === 'short') {
      capTop(-0.28);
      mesh(new THREE.SphereGeometry(0.22, 24, 12), hairM, 0, 0.3, 0.37, head).scale.set(2.0, 0.55, 0.8);
    }
    // 王冠（可以单独控制落下）
    let crown = null;
    if (o.crown) { crown = new THREE.Group(); head.add(crown); crown.position.y = 0.5;
      const band = mesh(new THREE.CylinderGeometry(0.3, 0.27, 0.16, 48, 1, true), gold, 0, 0, 0, crown); band.material = gold.clone(); band.material.side = THREE.DoubleSide;
      const gem = M('#ff3b30', 0.2); gem.emissive.set('#ff2010'); gem.emissiveIntensity = 0.7;
      for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; mesh(new THREE.ConeGeometry(0.06, 0.2, 12), gold, Math.sin(a) * 0.29, 0.17, Math.cos(a) * 0.29, crown); mesh(new THREE.SphereGeometry(0.035, 12, 8), gem, Math.sin(a) * 0.29, 0.28, Math.cos(a) * 0.29, crown); }
    }

    const api = { g, R, head, body, arms, legs, eyes, cape, shades, crown, torsoM, blob,
      // 动作：t 时间；walk 0..1 走路幅度；bounce 原地蹦；armL/armR = [往前抬, 往外张]（弧度）；brow > 0 皱眉（坏笑/生气），< 0 担心；mouth 表情
      pose({ t = 0, walk = 0, speed = 9, bounce = 0, armL = [0, 0.18], armR = [0, 0.18], head: hd = [0, 0, 0], brow = 0, mouth = 'smile', lean = 0, squash = 0, cape: cp = 0 } = {}) {
        const ph = t * speed, sw = Math.sin(ph) * walk;
        R.position.y = (walk ? Math.abs(Math.sin(ph)) * 0.08 * walk : 0) + bounce; R.rotation.x = lean;
        R.scale.set(1 + squash * 0.5, 1 - squash, 1 + squash * 0.5);
        legs[0].rotation.x = sw * 0.7; legs[1].rotation.x = -sw * 0.7;
        [armL, armR].forEach(([f, out], k) => { const s = k ? 1 : -1, A = arms[k]; A.rotation.set(-(f + (k ? sw : -sw) * 0.6), 0, s * out); });
        head.rotation.set(hd[0], hd[1], hd[2]);
        brows.forEach((b, k) => { b.rotation.z = (k ? 1 : -1) * brow; b.position.y = 0.17 - Math.abs(brow) * 0.03; });
        Object.entries(mouths).forEach(([k, m]) => { m.visible = k === mouth; });
        if (cape) cape.rotation.x = 0.22 + 0.12 * Math.sin(t * 7.3) + 0.35 * walk + cp;
      },
    };
    api.pose();
    return api;
  };

  // 用角色设定图做的 Q 版人物：一张始终朝向镜头的立牌，按镜头在人物身边的角度换正面 / 左右 45° / 侧面 / 背面（朝向不对就镜像）
  // F 里除了五个角度，还有设定图上的动作（throne、dark、lead……）：frame(名字, 朝向) 换成某个动作，frame(null) 回到按角度换图。
  // 每张图带 d（画里人物脸朝屏幕右 1 / 左 -1）和 s（动作那一排画得比四视图小，按 s 放大到同样身高）。
  // 接口和 makeChibi 一样（g、pose()），手脚没有关节，走路、欢呼用蹦跳和摇摆来表现
  window.makeSpriteChibi = function (E, F, H = 1.95) {
    const g = new THREE.Group(), R = new THREE.Group(); g.add(R);
    const k = H / F.front.h, tex = {};
    Object.entries(F).forEach(([v, f]) => { if (v === 'portrait' || v === 'head' || v.startsWith('darkhead')) return;   // 立绘、名牌头像、黑化头像（darkhead、darkhead_sad、darkhead_angry）只给叠加层用，不当立牌加载
      const t = new THREE.Texture(), im = new Image(); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; im.onload = () => { t.image = im; t.needsUpdate = true; if (E.renderer && E.renderer.initTexture) E.renderer.initTexture(t); }; im.src = f.src; tex[v] = { t, w: f.w * k * (f.s || 1), h: f.h * k * (f.s || 1), d: f.d || 0 }; });
    const mat = new THREE.MeshStandardMaterial({ map: tex.front.t, emissive: '#ffffff', emissiveMap: tex.front.t, emissiveIntensity: 0.5, roughness: 0.95, transparent: true, alphaTest: 0.06, side: THREE.DoubleSide });
    const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);
    // 两张立牌叠在一起：plane 是当前这张，plane2 是交叉淡化时的上一张（或镜头绕到两个角度交界处时的相邻角度），画在它下面
    const mat2 = mat.clone(), plane = new THREE.Mesh(geo, mat), plane2 = new THREE.Mesh(geo, mat2); plane.renderOrder = 1; R.add(plane2, plane);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: glowTex(), transparent: true, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.012; g.add(blob);
    const cl = new THREE.Vector3(); let force = null, face = 0, from = null, mixK = 1;
    const B = [0.42, 1.15, 2.25], BW = 0.07, sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
    const viewAt = (a, want) => a < B[0] ? 'front' : a < B[1] ? (tex.q45b && tex.q45b.d === want ? 'q45b' : 'q45') : a < B[2] ? 'side' : 'back';
    // 这一帧两张立牌各画哪张图、各多不透明：交叉淡化时新的一张从 0 到 1、旧的一张从 1 到 0（中间两张都不透明，新的盖在上面，不会透出背景）
    const solve = cam => {
      cl.copy(cam.position); R.worldToLocal(cl); const phi = Math.atan2(cl.x, cl.z), a = Math.abs(phi), want = phi > 0 ? -1 : 1;   // 镜头在人物左手边时，人物在画面上脸朝左
      const mir = (T, f) => f !== 0 && T.d !== 0 && T.d !== f;
      let A, Am, Bt = null, Bm = false, w = 1;
      if (force && tex[force]) { A = tex[force]; Am = mir(A, face);
        if (from !== null && mixK < 1) { const v = from === 'view' ? viewAt(a, want) : from; Bt = tex[v] || tex.front; Bm = from === 'view' ? mir(Bt, want) : mir(Bt, face); w = mixK; } }
      else { const v = viewAt(a, want); A = tex[v] || tex.front; Am = mir(A, want);
        if (from !== null && from !== 'view' && mixK < 1 && tex[from]) { Bt = tex[from]; Bm = mir(Bt, face); w = mixK; }
        else { const j = B.findIndex(b => Math.abs(a - b) < BW);   // 镜头正好绕到两个角度的交界：两张交叉淡化，不是一下子换图
          if (j >= 0) { const v2 = viewAt(a < B[j] ? B[j] + 0.01 : B[j] - 0.01, want); if (v2 !== v) { Bt = tex[v2] || tex.front; Bm = mir(Bt, want); w = 0.5 + Math.abs(a - B[j]) / BW * 0.5; w = sm(w); } } } }
      return { phi, A, Am, Bt, Bm, w };
    };
    const place = (P, M, T, mirror, phi, cam, op) => {
      M.map = M.emissiveMap = T.t; M.opacity = op;
      // zb：把立牌沿着朝镜头的方向往前挪 zb、再按比例缩小，画面上一模一样，只是深度往前了——贴着 3D 物体（骰子）走时，立牌不会被物体的角插进去
      const L = cl.length(), zb = Math.min(api.zb || 0, L * 0.5) - (P === plane2 ? 0.004 : 0), kz = L > 0 ? (L - zb) / L : 1; P.position.copy(cl).multiplyScalar(L > 0 ? zb / L : 0);
      P.rotation.set(0, phi, 0); P.scale.set(T.w * (mirror ? -1 : 1) * Math.max(0.001, api.sx) * kz, T.h * kz, 1); P.updateMatrix(); P.updateMatrixWorld(true);
      P.modelViewMatrix.multiplyMatrices(cam.matrixWorldInverse, P.matrixWorld); P.normalMatrix.getNormalMatrix(P.modelViewMatrix);
    };
    plane.onBeforeRender = (r, sc, cam) => { const S = solve(cam); place(plane, mat, S.A, S.Am, S.phi, cam, S.Bt ? Math.min(1, 2 * S.w) : 1); };
    plane2.onBeforeRender = (r, sc, cam) => { const S = solve(cam); place(plane2, mat2, S.Bt || S.A, S.Bt ? S.Bm : S.Am, S.phi, cam, S.Bt ? Math.min(1, 2 * (1 - S.w)) : 0); mat2.emissiveIntensity = mat.emissiveIntensity; };
    // sx：立牌的横向缩放（1 = 原样）。转身时先压扁到 0 再换图、再展开，像翻牌一样，不经过四视图（四视图是没黑化的打扮）
    const api = { g, R, blob, mat, plane, sx: 1, zb: 0, legs: [], arms: [], eyes: [{ scale: { y: 1, set() {} } }, { scale: { y: 1, set() {} } }], head: R, cape: null, shades: null, crown: null, sprite: true,
      // frame(动作, 朝向, 上一张, k)：换成某个动作；给了「上一张」和 0<k<1 时，从上一张交叉淡化到这一张（k 由时间轴算，往回拖也一致）。
      // 「上一张」写 'view' 表示按镜头角度的那张四视图；frame(null) 回到按角度换图（也可以给 from，从某个动作淡回四视图）
      frame(name = null, f = 0, prev = null, k = 1) { force = name; face = f; from = prev; mixK = k; },
      pose({ t = 0, walk = 0, speed = 9, bounce = 0, armL = [0, 0.18], armR = [0, 0.18], lean = 0, squash = 0 } = {}) {
        const cheer = Math.max(0, Math.max(armL[1], armR[1]) - 1.2) / 1.4, hop = walk ? Math.abs(Math.sin(t * speed)) * 0.13 * walk : 0;
        R.position.y = bounce + hop + cheer * Math.abs(Math.sin(t * 9)) * 0.12;
        R.rotation.set(lean, 0, walk ? Math.sin(t * speed) * 0.07 * walk : Math.sin(t * 2.2) * 0.02);
        R.scale.set(1 + squash * 0.5, 1 - squash, 1 + squash * 0.5);
      } };
    api.pose(); return api;
  };

  // 金色王座（红丝绒坐垫），座面高约 0.6，小人坐上去放在 (0, 0.32, 0.02)
  window.makeThrone = function () {
    const gold = new THREE.MeshStandardMaterial({ color: '#ffc23a', roughness: 0.35, metalness: 0.35, emissive: '#a86400', emissiveIntensity: 0.5 });
    const velvet = new THREE.MeshStandardMaterial({ color: '#b3122a', roughness: 0.7 });
    const g = new THREE.Group(), add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    add(new THREE.BoxGeometry(1.3, 0.5, 1.0), gold, 0, 0.25, 0); add(new THREE.BoxGeometry(1.1, 0.12, 0.85), velvet, 0, 0.56, 0.04);
    add(new THREE.BoxGeometry(1.3, 1.7, 0.2), gold, 0, 1.2, -0.45); add(new THREE.BoxGeometry(1.0, 1.35, 0.06), velvet, 0, 1.18, -0.33);
    [-1, 1].forEach(sd => { add(new THREE.BoxGeometry(0.16, 0.42, 0.95), gold, sd * 0.66, 0.72, 0); add(new THREE.SphereGeometry(0.11, 16, 10), gold, sd * 0.62, 2.12, -0.45); });
    return g;
  };

  // 金币山：一堆随机摆放的金币，中间高四周低（n 枚、半径 R、高 H）
  window.makeCoinPile = function (n = 240, R = 1.6, H = 0.55, seed = 11) {
    const mat = new THREE.MeshStandardMaterial({ color: '#ffb020', metalness: 0.35, roughness: 0.35, emissive: '#8a5200', emissiveIntensity: 0.4 });
    const m = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 20), mat, n); m.castShadow = m.receiveShadow = true;
    const d = new THREE.Object3D(); let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < n; k++) { const rr = R * Math.sqrt(r()), a = r() * Math.PI * 2, y = H * Math.pow(1 - rr / R, 1.1) * (0.55 + 0.45 * r());
      d.position.set(Math.cos(a) * rr, y + 0.02, Math.sin(a) * rr); d.rotation.set((r() - 0.5) * 0.9, r() * 3, (r() - 0.5) * 0.9); d.updateMatrix(); m.setMatrixAt(k, d.matrix); }
    return m;
  };

  // User Group 冠军奖杯：金杯 + 两个把手 + 木底座
  window.makeTrophy = function () {
    const gold = new THREE.MeshStandardMaterial({ color: '#ffc23a', roughness: 0.35, metalness: 0.35, emissive: '#a86400', emissiveIntensity: 0.5, side: THREE.DoubleSide });
    const g = new THREE.Group(), m = (geo, mat, y) => { const x = new THREE.Mesh(geo, mat); x.position.y = y; x.castShadow = true; g.add(x); return x; };
    m(new THREE.BoxGeometry(0.34, 0.12, 0.34), new THREE.MeshStandardMaterial({ color: '#5a3a22', roughness: 0.6 }), 0.06);
    m(new THREE.CylinderGeometry(0.05, 0.08, 0.2, 20), gold, 0.22);
    m(new THREE.LatheGeometry([[0.04, 0], [0.12, 0.04], [0.2, 0.15], [0.24, 0.32], [0.26, 0.42]].map(([x, y]) => new THREE.Vector2(x, y)), 40), gold, 0.32);
    [-1, 1].forEach(s => { const h = m(new THREE.TorusGeometry(0.1, 0.022, 10, 24, Math.PI * 1.2), gold, 0.58); h.position.x = s * 0.27; h.rotation.z = s > 0 ? -Math.PI * 0.6 : Math.PI * 1.6; });
    return g;
  };
})();
