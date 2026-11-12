// 宣传片 / 讲解视频共用的 3D 引擎：棋盘、骰子、棋子、卡牌、金币、字幕和 3D 标签。
// 画面是时间 t 的纯函数：每一帧先 reset() 回到默认状态，再由时间轴脚本按 t 摆好所有东西，
// 所以可以随意跳到任意时间点，录制时逐帧 seek(t) 截图，结果每次都一样。
(function () {
  'use strict';
  const D = window.PROMO_DATA;
  const SW = 1920, SH = 1080;                       // 舞台尺寸，录制就按这个分辨率
  const BW = 16.2, BD = 12.2, C = 1.6, TH = 0.22;   // 棋盘宽、深、角格边长、格子厚度（13 × 9 格 + 4 个角）
  const COLORS = ['#e5484d', '#2f7cf6', '#1f9d55', '#9b5cf6'];
  const INK = '#232f3e', MUT = '#545b64', LINE = '#d5dbdb';
  const FONT = `'Amazon Ember',-apple-system,BlinkMacSystemFont,'Helvetica Neue','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif`;

  // ---------- 小工具 ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const easeOut = k => 1 - Math.pow(1 - k, 3);
  const easeBack = k => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
  // 一个时间窗内的淡入淡出：a 开始淡入，b 结束淡出
  const win = (t, a, b, fi = 0.45, fo = 0.45) => Math.min(seg(t, a, a + fi), 1 - seg(t, b - fo, b));
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---------- 图标预加载 ----------
  const IMG = {};
  const loadIcons = () => Promise.all(Object.entries(D.icons).map(([k, src]) => new Promise(r => { const im = new Image(); im.onload = () => { IMG[k] = im; r(); }; im.onerror = r; im.src = src; })));
  const icon = k => IMG[k] || IMG.cloud;

  // ---------- canvas 文字 ----------
  // 英文服务名按单词换行，单词本身放不下就缩小字号（不在单词中间断开，比如 OpenSearch、Step Functions）
  window.__overflow = window.__overflow || [];
  function fitName(g, name, maxW, size, maxLines = 2, minSize = 20) {
    for (let sz = size; sz >= minSize; sz -= 2) {
      g.font = `700 ${sz}px ${FONT}`;
      const words = String(name).split(' '), lines = []; let cur = '';
      for (const w of words) { const tryL = cur ? cur + ' ' + w : w; if (g.measureText(tryL).width <= maxW || !cur) cur = tryL; else { lines.push(cur); cur = w; } }
      if (cur) lines.push(cur);
      if (lines.length <= maxLines && lines.every(l => g.measureText(l).width <= maxW)) return { sz, lines };
    }
    window.__overflow.push('格子名放不下：' + name);
    g.font = `700 ${minSize}px ${FONT}`; return { sz: minSize, lines: wrap(g, name, maxW).slice(0, maxLines) };
  }
  // 换行：英文单词、数字整体不拆；逗号、句号这类标点不放行首（碰到时把上一行最后一个汉字一起带下去，不会超宽）；
  // 只有单个英文词比整行还长时才逐字拆
  const NOHEAD = /^[，。、；：！？）」』…,.;:!?)\]%]/;
  function wrap(g, text, maxW) {
    const toks = String(text).match(/[A-Za-z0-9$%+.\-–'’:/&#]+|\s+|./gu) || [], lines = []; let cur = '';
    const push = () => { if (cur.trim()) lines.push(cur.trimEnd()); cur = ''; };
    for (const tk of toks) {
      if (!cur && !tk.trim()) continue;
      if (!cur || g.measureText(cur + tk).width <= maxW) { cur += tk; continue; }
      if (NOHEAD.test(tk)) { if (cur.length > 1 && /[㐀-鿿]$/.test(cur)) { const ch = cur.slice(-1); cur = cur.slice(0, -1); push(); cur = ch + tk; } else cur += tk; continue; }
      if (g.measureText(tk).width > maxW) { for (const ch of tk) { if (cur && g.measureText(cur + ch).width > maxW) push(); cur += ch; } continue; }
      push(); if (tk.trim()) cur = tk;
    }
    push(); return lines;
  }
  function text(g, s, x, y, { size = 28, w = 400, color = INK, align = 'left', base = 'alphabetic', lh = 1.4, max = 0, family = FONT } = {}) {
    g.font = `${w} ${size}px ${family}`; g.fillStyle = color; g.textAlign = align; g.textBaseline = base;
    let lines = max ? wrap(g, s, max) : [String(s)];
    lines.forEach((l, k) => g.fillText(l, x, y + k * size * lh));
    return lines.length * size * lh;
  }
  function rrect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
  // 导出 8K 时（网址带 ?scale=4）画面按 4 倍像素渲染；贴图同时放大 2 倍，免得棋盘和卡牌发糊。
  // 画布按放大后的尺寸建，但第一次取 2d 上下文时先 scale 好，所以下面画图的代码都还按原来的尺寸写。
  const SCALE = Math.max(1, +(new URLSearchParams(location.search).get('scale') || 1)), TEX = SCALE >= 2 ? 2 : 1;
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w * TEX; c.height = h * TEX; const gc = c.getContext.bind(c);
    c.getContext = (...a) => { const g = gc(...a); if (g && !g._scaled) { g.scale(TEX, TEX); g._scaled = true; } return g; }; return c; };
  const texOf = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

  // ---------- 棋盘格位置 ----------
  // 0 在右下角，沿底边往左 1–13，左下角 14，左边往上 15–23，左上角 24，上边往右 25–37，右上角 38，右边往下 39–47
  function cell(i) {
    if (i === 0) return { x: BW / 2 - C / 2, z: BD / 2 - C / 2, w: C, d: C, side: 'corner' };
    if (i < 14) return { x: BW / 2 - C - (i - 0.5), z: BD / 2 - C / 2, w: 1, d: C, side: 'bottom' };
    if (i === 14) return { x: -BW / 2 + C / 2, z: BD / 2 - C / 2, w: C, d: C, side: 'corner' };
    if (i < 24) return { x: -BW / 2 + C / 2, z: BD / 2 - C - (i - 14 - 0.5), w: C, d: 1, side: 'left' };
    if (i === 24) return { x: -BW / 2 + C / 2, z: -BD / 2 + C / 2, w: C, d: C, side: 'corner' };
    if (i < 38) return { x: -BW / 2 + C + (i - 24 - 0.5), z: -BD / 2 + C / 2, w: 1, d: C, side: 'top' };
    if (i === 38) return { x: BW / 2 - C / 2, z: -BD / 2 + C / 2, w: C, d: C, side: 'corner' };
    return { x: BW / 2 - C / 2, z: -BD / 2 + C + (i - 38 - 0.5), w: C, d: 1, side: 'right' };
  }
  const grpColor = g => (D.groups[g] || {}).color || '#545b64';

  // 一块格子的顶面贴图，白底细线，照网页棋盘的样子
  // 可选：D.blind 里列出的格子画成娱乐模式的盲盒格（reinvent 图标、「盲盒」、两行「随机抽卡 / 效果翻倍」、#ff9900 色条，照网页棋盘）。
  // 只有 mexp_build.mjs 给娱乐模式讲解传这个字段；宣传片、full 宣传片不传，画法一点不变（不能按 PROMO_MODE 判断：full 宣传片的娱乐模式段也会设成 party）
  function tileTexture(i) {
    const bl = Array.isArray(D.blind) && D.blind.includes(i);
    const s = bl ? { ...D.sq[i], n: '盲盒', icon: 'reinvent' } : D.sq[i], c = cell(i), PX = 256, w = Math.round(c.w * PX), h = Math.round(c.d * PX);
    const cv = canvas(w, h), g = cv.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.strokeStyle = LINE; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
    const prop = s.t === 'prop' || s.t === 'util';
    if (prop) {   // 色组条贴在朝棋盘中间的那条边上
      g.fillStyle = bl ? '#ff9900' : grpColor(s.g); const T = 16;
      if (c.side === 'bottom') g.fillRect(0, 0, w, T); else if (c.side === 'top') g.fillRect(0, h - T, w, T);
      else if (c.side === 'left') g.fillRect(w - T, 0, T, h); else if (c.side === 'right') g.fillRect(0, 0, T, h);
    }
    // 监控组三格（CloudWatch、Config、CloudTrail）照网页棋盘：标价格，再标「按用量」
    const sub = bl ? '随机抽卡' : s.t === 'prop' ? `$${s.p}` : s.t === 'util' ? `$${s.p} · 按用量` : '', sub2 = bl ? '效果翻倍' : '';
    if (c.side === 'corner') {
      g.drawImage(icon(s.icon), w / 2 - 85, 70, 170, 170);
      text(g, s.n, w / 2, 300, { size: 44, w: 700, align: 'center', max: w - 40, lh: 1.15 });
    } else if (c.side === 'bottom' || c.side === 'top') {
      const y0 = c.side === 'bottom' ? 46 : 30;
      g.drawImage(icon(s.icon), w / 2 - 66, y0, 132, 132);
      const n = s.n.replace('Amazon ', ''), fit = fitName(g, n, w - 24, 36);
      fit.lines.forEach((l, k) => text(g, l, w / 2, y0 + 190 + k * fit.sz * 1.12, { size: fit.sz, w: 700, align: 'center' }));
      if (sub) text(g, sub, w / 2, y0 + 190 + fit.lines.length * fit.sz * 1.12 + 6, { size: 30, w: 500, color: MUT, align: 'center' });
      if (sub2) text(g, sub2, w / 2, y0 + 190 + fit.lines.length * fit.sz * 1.12 + 42, { size: 30, w: 500, color: MUT, align: 'center' });
    } else {
      const x0 = c.side === 'right' ? 40 : 24;
      g.drawImage(icon(s.icon), x0, h / 2 - 62, 124, 124);
      const n = s.n.replace('Amazon ', '');
      const tw = w - x0 - 124 - 40, fit = fitName(g, n, tw, 36), lh = fit.sz * 1.1;
      const y = h / 2 - (fit.lines.length * lh + (sub ? 36 : 0) + (sub2 ? 36 : 0)) / 2 + 30;
      fit.lines.forEach((l, k) => text(g, l, x0 + 144, y + k * lh, { size: fit.sz, w: 700 }));
      if (sub) text(g, sub, x0 + 144, y + fit.lines.length * lh + 4, { size: 30, color: MUT });
      if (sub2) text(g, sub2, x0 + 144, y + fit.lines.length * lh + 40, { size: 30, color: MUT });
    }
    return texOf(cv);
  }

  // 棋盘中间：架构图风格的白底面板
  function centerTexture() {
    const w = 2600, h = 1800, cv = canvas(w, h), g = cv.getContext('2d');
    g.fillStyle = '#f7f8f8'; g.fillRect(0, 0, w, h);
    g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(60, 60, w - 120, h - 120);
    g.fillStyle = INK; g.fillRect(60, 60, 600, 90);
    g.drawImage(icon('cloud'), 74, 66, 78, 78);
    text(g, '亚马逊云科技 User Group', 170, 122, { size: 40, w: 700, color: '#fff' });
    text(g, '亚马逊云科技 User Group', w / 2, 470, { size: 110, w: 800, color: MUT, align: 'center' });
    text(g, '云上大亨', w / 2, 760, { size: 260, w: 900, align: 'center' });
    text(g, '买服务 · 做高可用 · 扛住 Health 事件 · 控制账单 · 组成有效架构', w / 2, 900, { size: 64, color: MUT, align: 'center' });
    // 一条示意架构：Route 53 → CloudFront → ELB → EC2 → RDS
    const flow = ['route53', 'cloudfront', 'elb', 'ec2', 'rds'], names = ['Route 53', 'CloudFront', 'ELB', 'EC2', 'RDS'];
    const gx = 420, gy = 1060, gw = w - 840, gh = 470;
    const fx = gx + 180 + 2 * (gw - 360) / 4 - 170;   // 从 ELB 左边开始框；Route 53、CloudFront 是全球 / 边缘服务，不在 VPC 里
    g.setLineDash([22, 14]); g.strokeStyle = '#8c4fff'; g.lineWidth = 4; g.strokeRect(fx, gy, gx + gw - fx, gh); g.setLineDash([]);
    text(g, 'VPC · 多 AZ', fx + 30, gy + 64, { size: 46, w: 700, color: '#8c4fff' });
    text(g, '全球 · 边缘', gx + 180 + (gw - 360) / 8, gy + 64, { size: 40, w: 700, color: MUT, align: 'center' });
    flow.forEach((k, n) => {
      const cx = gx + 180 + n * (gw - 360) / 4;
      g.drawImage(icon(k), cx - 90, gy + 130, 180, 180);
      text(g, names[n], cx, gy + 380, { size: 48, w: 600, align: 'center' });
      if (n < 4) { g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(cx + 120, gy + 220); g.lineTo(cx + (gw - 360) / 4 - 130, gy + 220); g.stroke();
        const ax = cx + (gw - 360) / 4 - 120; g.fillStyle = INK; g.beginPath(); g.moveTo(ax, gy + 220); g.lineTo(ax - 26, gy + 204); g.lineTo(ax - 26, gy + 236); g.fill(); }
    });
    return texOf(cv);
  }

  // 骰子每一面：白底圆角，黑点，1 点是红点
  function dieFace(v) {
    const S = 256, cv = canvas(S, S), g = cv.getContext('2d');
    g.fillStyle = '#d9dde3'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#ffffff'; rrect(g, 6, 6, S - 12, S - 12, 44); g.fill();
    const P = { 1: [[.5, .5]], 2: [[.27, .27], [.73, .73]], 3: [[.25, .25], [.5, .5], [.75, .75]], 4: [[.27, .27], [.73, .27], [.27, .73], [.73, .73]], 5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]], 6: [[.27, .23], [.73, .23], [.27, .5], [.73, .5], [.27, .77], [.73, .77]] }[v];
    g.fillStyle = v === 1 ? '#d13212' : '#16191f';
    for (const [x, y] of P) { g.beginPath(); g.arc(x * S, y * S, v === 1 ? 30 : 22, 0, Math.PI * 2); g.fill(); }
    return texOf(cv);
  }

  // 卡牌正面：照网页卡牌的样子，Health 粉色、re:Invent 紫色
  function cardTexture(card) {
    const w = 756, h = 1056, cv = canvas(w, h), g = cv.getContext('2d');
    const inc = card.type === 'inc', col = inc ? '#e7157b' : card.type === 'skill' ? '#ec7211' : '#8c4fff';
    g.fillStyle = '#ffffff'; rrect(g, 0, 0, w, h, 34); g.fill();
    g.strokeStyle = col; g.lineWidth = 10; rrect(g, 5, 5, w - 10, h - 10, 30); g.stroke();
    g.fillStyle = col; g.fillRect(5, 5, w - 10, 92);
    g.drawImage(icon(inc ? 'health' : card.type === 'skill' ? 'activate' : 'reinvent'), 30, 18, 64, 64);
    text(g, card.head, 112, 66, { size: 34, w: 700, color: '#fff' });
    g.drawImage(icon(card.art), 44, 140, 150, 150);
    text(g, card.n, 220, 210, { size: card.n.length > 8 ? 46 : 56, w: 800, max: w - 260, lh: 1.15 });
    let y = 360;
    y += text(g, card.e, 44, y, { size: 33, max: w - 88, lh: 1.5 }) + 20;
    if (card.im && card.im !== '—') {
      g.font = `400 29px ${FONT}`; const lines = wrap(g, card.im, w - 128), bh = 70 + lines.length * 42;
      g.strokeStyle = '#879196'; g.lineWidth = 2; g.strokeRect(44, y, w - 88, bh);
      text(g, '免疫', 64, y + 46, { size: 30, w: 700, color: '#1d8102' });
      text(g, card.im, 64, y + 92, { size: 29, max: w - 128, lh: 1.45 });
      y += bh + 30;
    }
    // 知识点框紧跟在正文后面（不再固定在卡牌底部，免得中间空一大块），字号和正文差不多大
    if (card.tip) {
      const TS = 32, TL = TS * 1.45, y0 = y + 20; g.font = `400 ${TS}px ${FONT}`;
      const tl = wrap(g, '知识点：' + card.tip, w - 128), bh = 34 + tl.length * TL;
      if (y0 + bh > h - 40) window.__overflow.push(`卡牌知识点放不下：${card.n}（知识点到 ${Math.round(y0 + bh)}，卡高 ${h}）`);
      g.fillStyle = '#f2f3f3'; g.fillRect(44, y0, w - 88, bh); text(g, '知识点：' + card.tip, 64, y0 + 16 + TS, { size: TS, color: MUT, max: w - 128, lh: 1.45 });
    } else if (y > h - 40) window.__overflow.push(`卡牌正文放不下：${card.n}（正文到 ${Math.round(y)}，卡高 ${h}）`);
    return texOf(cv);
  }
  // DLC 扩展包盒子的正面：白底细线，顶部色带写分类，中间大图标，下面名字和一句话（和棋盘、卡牌同一套风格）
  function boxFace(info, w, h) {
    const cv = canvas(w, h), g = cv.getContext('2d'), col = info.color || '#ec7211';
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    const hb = Math.round(h * 0.13); g.fillStyle = col; g.fillRect(0, 0, w, hb);
    text(g, info.tag || 'DLC', w * 0.07, hb * 0.68, { size: hb * 0.48, w: 800, color: '#fff' });
    g.fillStyle = '#f2f3f3'; g.fillRect(0, h * 0.84, w, h * 0.16);
    const ic = w * 0.42, cy = h * 0.38;
    g.save(); g.shadowColor = col + '88'; g.shadowBlur = 40; g.fillStyle = col; rrect(g, w / 2 - ic * 0.62, cy - ic * 0.62, ic * 1.24, ic * 1.24, ic * 0.2); g.fill(); g.restore();
    g.drawImage(icon(info.icon), w / 2 - ic / 2, cy - ic / 2, ic, ic);
    const ns = info.n.length > 7 ? w * 0.085 : w * 0.105;
    text(g, info.n, w / 2, h * 0.68, { size: ns, w: 900, color: INK, align: 'center', max: w * 0.9, lh: 1.1 });
    if (info.d) text(g, info.d, w / 2, h * 0.925, { size: w * 0.058, w: 600, color: MUT, align: 'center', max: w * 0.92 });
    g.strokeStyle = col; g.lineWidth = w * 0.018; g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth);
    const t = texOf(cv); return t;
  }
  function boxTexture(info) {
    const w = 512, h = 680, cv = canvas(w, h), g = cv.getContext('2d'), col = info.color || '#ec7211';
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#1b2433'); bg.addColorStop(1, '#0b111c'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 2; for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    g.fillStyle = col; g.fillRect(0, 0, w, 86);
    text(g, info.tag || 'DLC', 28, 58, { size: 34, w: 800, color: '#fff' });
    const glow = g.createRadialGradient(w / 2, 250, 10, w / 2, 250, 220); glow.addColorStop(0, col + 'aa'); glow.addColorStop(1, col + '00'); g.fillStyle = glow; g.fillRect(0, 90, w, 340);
    g.fillStyle = '#fff'; rrect(g, w / 2 - 105, 145, 210, 210, 28); g.fill();
    g.drawImage(icon(info.icon), w / 2 - 80, 170, 160, 160);
    text(g, info.n, w / 2, 450, { size: info.n.length > 7 ? 44 : 54, w: 900, color: '#fff', align: 'center', max: w - 50, lh: 1.15 });
    if (info.d) text(g, info.d, w / 2, info.n.length > 9 ? 580 : 540, { size: 30, color: '#cfd6df', align: 'center', max: w - 70, lh: 1.35 });
    g.strokeStyle = col; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
    return texOf(cv);
  }
  // 专属技能卡：深色底、橙色渐变边，像一张"大招"卡
  function skillTexture(card) {
    const w = 756, h = 1056, cv = canvas(w, h), g = cv.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#2a1606'); bg.addColorStop(0.45, '#121826'); bg.addColorStop(1, '#0b111c');
    g.fillStyle = bg; rrect(g, 0, 0, w, h, 36); g.fill();
    g.save(); rrect(g, 0, 0, w, h, 36); g.clip();
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 2;
    for (let x = 0; x < w; x += 42) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y < h; y += 42) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const glow = g.createRadialGradient(w / 2, 300, 10, w / 2, 300, 420); glow.addColorStop(0, 'rgba(255,153,0,.55)'); glow.addColorStop(1, 'rgba(255,153,0,0)');
    g.fillStyle = glow; g.fillRect(0, 0, w, h);
    // 电路线装饰
    g.strokeStyle = 'rgba(255,179,107,.35)'; g.lineWidth = 3;
    [[60, 220, 200, 220, 240, 260], [w - 60, 220, w - 200, 220, w - 240, 260], [60, 400, 170, 400], [w - 60, 400, w - 170, 400]].forEach(p => { g.beginPath(); g.moveTo(p[0], p[1]); for (let k = 2; k < p.length; k += 2) g.lineTo(p[k], p[k + 1]); g.stroke(); g.fillStyle = '#ffb36b'; g.beginPath(); g.arc(p[0], p[1], 6, 0, 7); g.fill(); });
    g.restore();
    const edge = g.createLinearGradient(0, 0, w, h); edge.addColorStop(0, '#ffd29a'); edge.addColorStop(0.45, '#ff9900'); edge.addColorStop(0.75, '#ec7211'); edge.addColorStop(1, '#ff5f3d');
    g.strokeStyle = edge; g.lineWidth = 12; rrect(g, 6, 6, w - 12, h - 12, 32); g.stroke();
    text(g, '专属技能', 46, 74, { size: 30, w: 800, color: '#ffb36b' });
    text(g, card.role || '', w - 46, 74, { size: 28, w: 600, color: '#e9edf2', align: 'right' });
    g.strokeStyle = 'rgba(255,179,107,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(46, 100); g.lineTo(w - 46, 100); g.stroke();
    // 大图标：发光的圆环
    const cx = w / 2, cy = 290;
    g.save(); g.shadowColor = 'rgba(255,153,0,.9)'; g.shadowBlur = 40; g.strokeStyle = edge; g.lineWidth = 10; g.beginPath(); g.arc(cx, cy, 128, 0, 7); g.stroke(); g.restore();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx, cy, 112, 0, 7); g.fill();
    g.drawImage(icon(card.art), cx - 80, cy - 80, 160, 160);
    g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 16; text(g, card.n, cx, 500, { size: 64, w: 900, color: '#ffffff', align: 'center' }); g.restore();
    if (card.stat) {
      const sg = g.createLinearGradient(cx - 260, 0, cx + 260, 0); sg.addColorStop(0, '#ffd29a'); sg.addColorStop(0.5, '#ff9900'); sg.addColorStop(1, '#ff5f3d');
      g.font = `800 78px 'SF Mono',Menlo,monospace`; g.fillStyle = sg; g.textAlign = 'center'; g.fillText(card.stat, cx, 610);
      text(g, card.statSub || '', cx, 660, { size: 30, color: '#cfd6df', align: 'center' });
    }
    // 发动条件
    g.fillStyle = 'rgba(255,153,0,.12)'; g.strokeStyle = 'rgba(255,153,0,.7)'; g.lineWidth = 2; rrect(g, 46, 700, w - 92, 92, 12); g.fill(); g.stroke();
    text(g, '发动条件', 70, 742, { size: 24, w: 800, color: '#ffb36b' });
    text(g, '总资产低于开局资金一半 · 一局一次', 70, 778, { size: 28, w: 600, color: '#ffffff' });
    // 两步：风暴接入 → 角色技能
    const step = (x, n, a, b2) => { g.fillStyle = 'rgba(255,255,255,.06)'; g.strokeStyle = 'rgba(255,255,255,.22)'; rrect(g, x, 820, 300, 150, 12); g.fill(); g.stroke();
      g.fillStyle = '#ec7211'; g.beginPath(); g.arc(x + 34, 856, 20, 0, 7); g.fill(); text(g, n, x + 34, 866, { size: 26, w: 800, color: '#fff', align: 'center' });
      text(g, a, x + 66, 866, { size: 28, w: 800, color: '#fff' }); text(g, b2, x + 22, 912, { size: 23, color: '#cfd6df', max: 260, lh: 1.35 }); };
    step(46, '1', '风暴接入', card.s1 || '按卖回价买下最富对手的一块服务');   // s1：可选，换第 1 步的说明（讲解视频传「总资产最高的对手」）；不传 = 原来的字，宣传片不变
    step(w - 346, '2', '角色技能', card.e2 || card.e);
    g.fillStyle = '#ffb36b'; g.beginPath(); g.moveTo(w / 2 - 12, 880); g.lineTo(w / 2 + 14, 895); g.lineTo(w / 2 - 12, 910); g.fill();
    text(g, 'S T O R M   A C C E S S', cx, 1022, { size: 22, w: 700, color: 'rgba(255,179,107,.55)', align: 'center' });
    return texOf(cv);
  }
  function cardBack(type) {
    const w = 756, h = 1056, cv = canvas(w, h), g = cv.getContext('2d');
    const col = type === 'inc' ? '#e7157b' : type === 'skill' ? '#ec7211' : '#8c4fff';
    g.fillStyle = '#0b111c'; rrect(g, 0, 0, w, h, 34); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 2;
    for (let x = 0; x < w; x += 36) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y < h; y += 36) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.strokeStyle = col; g.lineWidth = 10; rrect(g, 5, 5, w - 10, h - 10, 30); g.stroke();
    g.drawImage(icon(type === 'inc' ? 'health' : type === 'skill' ? 'activate' : 'reinvent'), w / 2 - 120, h / 2 - 200, 240, 240);
    text(g, type === 'inc' ? 'Health 事件' : type === 'skill' ? '专属技能' : 're:Invent', w / 2, h / 2 + 140, { size: 64, w: 800, color: '#fff', align: 'center' });
    return texOf(cv);
  }

  // ---------- 场景 ----------
  async function create(root) {
    await loadIcons();
    const stage = root.querySelector('.stage');
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(SCALE); renderer.setSize(SW, SH, false);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    stage.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0b111c, 30, 80);
    const camera = new THREE.PerspectiveCamera(35, SW / SH, 0.1, 200); scene.add(camera);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x3a4252, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 2.0); sun.position.set(-8, 18, 10); sun.castShadow = true;
    sun.shadow.mapSize.set(SCALE >= 2 ? 4096 : 2048, SCALE >= 2 ? 4096 : 2048); Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 12, bottom: -12, near: 1, far: 50 }); sun.shadow.bias = -0.0006;
    scene.add(sun);
    const grid = new THREE.GridHelper(240, 240, 0x3a4a63, 0x22304a); grid.position.y = -0.36; grid.material.transparent = true; grid.material.opacity = 0.55; grid.renderOrder = -1; scene.add(grid);   // 先画网格，免得画在漂浮图标上面
    // 棋盘下面的橙、紫两团光，和开局页背景一致
    const glow = (color, x, z, r, o) => { const cv = canvas(256, 256), g = cv.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(r, r), new THREE.MeshBasicMaterial({ map: texOf(cv), transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending })); m.rotation.x = -Math.PI / 2; m.position.set(x, -0.34, z); scene.add(m); return m; };
    const glows = [glow('rgba(236,114,17,1)', -14, -10, 46, 0.32), glow('rgba(140,79,255,1)', 14, 12, 40, 0.26)];

    const board = new THREE.Group(); scene.add(board);
    const base = new THREE.Mesh(new THREE.BoxGeometry(BW + 0.3, 0.3, BD + 0.3), new THREE.MeshStandardMaterial({ color: 0x1b2433, roughness: 0.6 }));
    base.position.y = -0.2; base.receiveShadow = true; base.castShadow = true; board.add(base);
    const center = new THREE.Mesh(new THREE.PlaneGeometry(BW - 2 * C - 0.08, BD - 2 * C - 0.08), new THREE.MeshLambertMaterial({ map: centerTexture() }));
    center.rotation.x = -Math.PI / 2; center.position.y = -0.04; center.receiveShadow = true; board.add(center);

    const sideMat = new THREE.MeshLambertMaterial({ color: 0xe3e7ec });
    const tiles = D.sq.map((s, i) => {
      const c = cell(i), top = new THREE.MeshLambertMaterial({ map: tileTexture(i), emissive: 0x000000 });
      const m = new THREE.Mesh(new THREE.BoxGeometry(c.w - 0.035, TH, c.d - 0.035), [sideMat, sideMat, top, sideMat, sideMat, sideMat]);
      m.castShadow = true; m.receiveShadow = true; m.userData = { c, top }; board.add(m); return m;
    });

    // 归属框：四根细条围住格子，颜色是玩家色
    const frames = tiles.map(t => { const { c } = t.userData, g = new THREE.Group(), w = 0.07;
      const mk = (sx, sz, x, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.05, sz), new THREE.MeshBasicMaterial({ color: 0xffffff })); b.position.set(x, 0, z); g.add(b); };
      mk(c.w - 0.04, w, 0, -c.d / 2 + w / 2 + 0.02); mk(c.w - 0.04, w, 0, c.d / 2 - w / 2 - 0.02); mk(w, c.d - 0.04, -c.w / 2 + w / 2 + 0.02, 0); mk(w, c.d - 0.04, c.w / 2 - w / 2 - 0.02, 0);
      board.add(g); return g; });
    // 升级块：每级一块小方块，叠在格子上
    const blocks = tiles.map(() => [0, 1, 2].map(k => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })); b.castShadow = true; board.add(b); return b; }));

    const dieMats = [1, 6, 2, 5, 3, 4].map(v => new THREE.MeshStandardMaterial({ map: dieFace(v), roughness: 0.35 }));   // +x -x +y -y +z -z
    const dice = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), dieMats); m.castShadow = true; scene.add(m); return m; });
    const FACE = { 1: [0, 0, Math.PI / 2], 6: [0, 0, -Math.PI / 2], 2: [0, 0, 0], 5: [Math.PI, 0, 0], 3: [-Math.PI / 2, 0, 0], 4: [Math.PI / 2, 0, 0] };

    const pawns = COLORS.map(col => {
      const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.1 });
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.1, 32), mat), b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.15, 0.42, 32), mat), h = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 16), mat);
      a.position.y = 0.05; b.position.y = 0.31; h.position.y = 0.6; [a, b, h].forEach(x => { x.castShadow = true; g.add(x); }); scene.add(g); return g; });

    const shieldMat = new THREE.MeshBasicMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
    const shieldWire = new THREE.MeshBasicMaterial({ color: 0x8cc8ff, transparent: true, opacity: 0.5, wireframe: true, depthWrite: false });
    const shield = new THREE.Group(); shield.add(new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), shieldMat), new THREE.Mesh(new THREE.SphereGeometry(1.002, 18, 7, 0, Math.PI * 2, 0, Math.PI / 2), shieldWire)); scene.add(shield);

    const coinGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.045, 24), coinMat = new THREE.MeshStandardMaterial({ color: 0xffb020, metalness: 0.25, roughness: 0.35, emissive: 0xffa000, emissiveIntensity: 0.35 });
    // InstancedMesh 的包围球只在第一帧（count = 0）算一次，之后不更新；近景里世界原点出了画面，整批金币会被视锥剔掉，所以关掉剔除
    const coins = new THREE.InstancedMesh(coinGeo, coinMat, 160); coins.castShadow = false; coins.frustumCulled = false; scene.add(coins);

    // 架构连线：橙色管子 + 跑动的光点
    const arcs = [];
    function arc(key, pts, color = 0xff9900) {
      let a = arcs.find(x => x.key === key);
      if (!a) {
        const curve = new THREE.CatmullRomCurve3(pts), geo = new THREE.TubeGeometry(curve, 160, 0.055, 10, false);
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color })); scene.add(m);
        const dots = [0, 1, 2].map(() => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 8), new THREE.MeshBasicMaterial({ color: 0xfff1d6 })); scene.add(d); return d; });
        m.visible = false; dots.forEach(d => { d.visible = false; });   // 新建时先藏起来（这一帧 k 可能还是 0），由 api.arc 在 k > 0 时打开
        a = { key, curve, m, dots }; arcs.push(a);
      }
      return a;
    }

    // 片尾漂浮的服务图标：白底圆角小方块，带一圈橙色光
    const FLOAT = ['ec2', 'lambda', 's3', 'rds', 'bedrock', 'cloudfront', 'dynamodb', 'sqs', 'eks', 'route53', 'sagemaker', 'apigw'].filter(k => IMG[k]);
    const sprites = FLOAT.map(k => { const S = 256, cv = canvas(S, S), g = cv.getContext('2d');
      g.shadowColor = 'rgba(255,153,0,.85)'; g.shadowBlur = 34; g.fillStyle = '#ffffff'; rrect(g, 40, 40, S - 80, S - 80, 30); g.fill(); g.shadowBlur = 0;
      g.drawImage(icon(k), 64, 64, S - 128, S - 128);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texOf(cv), transparent: true, depthWrite: false })); sp.visible = false; scene.add(sp); return sp; });
    // 漂浮图标离镜头太近（会被放大、切边）、飘到左边标题面板后面、或者沉到画面底部时淡掉（要在摆好镜头和图标位置之后调用）
    const floatFade = sp => { const d = sp.position.distanceTo(camera.position), q = screen(sp.position); return clamp((d - 8) / 3) * clamp((q.x - 1050) / 200) * clamp((940 - q.y) / 140); };

    // 通用小方块：技术债标记之类
    const bits = Array.from({ length: 96 }, () => { const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })); b.castShadow = true; scene.add(b); return b; });
    let bitN = 0;

    // 多个护盾（六边形网格的半球，可以换颜色），key 区分；ripple 0→1 时护盾表面泛起一圈亮光
    const shields = {};
    function shieldOf(key) {
      if (!shields[key]) {
        const g = new THREE.Group(), fill = new THREE.MeshBasicMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
        const wire = new THREE.MeshBasicMaterial({ color: 0x8cc8ff, transparent: true, opacity: 0.55, wireframe: true, depthWrite: false });
        g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), fill), new THREE.Mesh(new THREE.IcosahedronGeometry(1.005, 2), wire));
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
        ring.rotation.x = Math.PI / 2; g.add(ring); scene.add(g); shields[key] = g;
      }
      return shields[key];
    }
    // 平铺在棋盘上的冲击波光环
    const rings = {};
    function ringOf(key) {
      if (!rings[key]) { const m = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 96), new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); m.rotation.x = -Math.PI / 2; scene.add(m); rings[key] = m; }
      return rings[key];
    }
    // 盒子底下的彩色地面光
    const discs = {};
    function disc(key, color) {
      if (!discs[key]) { const cv = canvas(256, 256), g = cv.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: texOf(cv), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); m.rotation.x = -Math.PI / 2; scene.add(m); discs[key] = m; }
      return discs[key];
    }
    const boxes = {};
    // 圆角扩展包盒子：圆角矩形挤出 + 倒角，正面贴白底图，侧面是分类色
    function box(key, info, size) {
      if (!boxes[key]) {
        const [w, h, d] = size, r = Math.min(w, h) * 0.08, bev = Math.min(0.06, d * 0.2), sh = new THREE.Shape();
        sh.moveTo(-w / 2 + r, -h / 2); sh.lineTo(w / 2 - r, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); sh.lineTo(w / 2, h / 2 - r); sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
        sh.lineTo(-w / 2 + r, h / 2); sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); sh.lineTo(-w / 2, -h / 2 + r); sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
        const geo = new THREE.ExtrudeGeometry(sh, { depth: d - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 10 });
        geo.translate(0, h / 2 + bev, -(d - 2 * bev) / 2);
        const map = boxFace(info, 600, Math.round(600 * h / w)); map.repeat.set(1 / w, 1 / h); map.offset.set(0.5, 0.5);
        const front = new THREE.MeshStandardMaterial({ map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.45, roughness: 0.35 });
        const side = new THREE.MeshStandardMaterial({ color: new THREE.Color(info.color || '#ec7211'), roughness: 0.3, metalness: 0.1 });
        const m = new THREE.Mesh(geo, [front, side]); m.castShadow = true;
        const g = new THREE.Group(); g.add(m); scene.add(g); boxes[key] = g;
      }
      return boxes[key];
    }
    const cards = {};
    function card(key, info) {
      if (!cards[key]) {
        const g = new THREE.Group(), geo = new THREE.PlaneGeometry(2.52, 3.52);
        // 卡牌放在镜头前面，不做深度测试：近处的棋盘、护盾、骰子都不会把卡牌切掉一块
        const f = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: info.type === 'skill' ? skillTexture(info) : cardTexture(info), transparent: true, depthTest: false, depthWrite: false })), b = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: cardBack(info.type), transparent: true, depthTest: false, depthWrite: false }));
        f.renderOrder = b.renderOrder = 10;
        b.rotation.y = Math.PI; g.add(f, b); camera.add(g); cards[key] = g;
      }
      return cards[key];
    }

    // ---------- HTML 叠加层 ----------
    const ov = root.querySelector('.ov');
    const els = {};
    function el(key, cls, html) {
      let e = els[key];
      if (!e) { e = els[key] = document.createElement('div'); e.className = cls; ov.appendChild(e); } else if (cls && e.className !== cls) e.className = cls;   // 同一个 key 换了样式（比如 warn → ok）也跟着换
      if (html != null && e._h !== html) { e.innerHTML = html; e._h = html; }
      e._used = true; return e;
    }
    const proj = new THREE.Vector3();
    function screen(p) { camera.updateMatrixWorld(true); proj.copy(p).project(camera); return { x: (proj.x + 1) / 2 * SW, y: (1 - proj.y) / 2 * SH, behind: proj.z > 1 }; }
    // 3D 标签：浮在格子上方，底下引线指过去。标签一律收进画面安全区：
    //   safeT 顶部留白（讲解视频的章节牌、资金条）；safeR 右边界，只管上沿高过 safeRB 的标签（讲解的要点卡、full 的玩家栏都只占右上角）。
    // 被夹到边上时，引线和光点跟着锚点走（--dx），不再固定在标签正中。指的东西已经出了画面就淡出，不钉在边上
    function label(key, pos, html, alpha = 1, cls = '') {
      const e = el('L' + key, 'lbl ' + cls, html), s = screen(pos), w = e.offsetWidth, h = e.offsetHeight, M = api.safeM || 22;   // safeM：标签离画面边的最小距离（默认 22；full 宣传片设得大一点）
      const off = Math.max(0, -s.x, s.x - SW, -s.y, s.y - SH), a = s.behind ? 0 : alpha * (1 - clamp((off - 40) / 160));
      const cy = Math.min(Math.max(s.y - 34, h + (api.safeT || M)), SH - M);
      const R = cy - h < (api.safeRB == null ? SH : api.safeRB) ? (api.safeR || SW) : SW;
      const cx = Math.min(Math.max(s.x, w / 2 + M), R - w / 2 - M);
      e.style.setProperty('--dx', clamp(s.x - cx, 20 - w / 2, w / 2 - 20).toFixed(1) + 'px');
      e.style.opacity = a; e.dataset.want = alpha; e.dataset.off = off > 40 ? 1 : 0; e.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-100%) scale(${0.72 + 0.28 * easeBack(clamp(alpha))})`;
    }
    function caption(tag, html, alpha) {
      const e = el('cap', 'cap', `<span class="tag">${tag}</span><div class="ct">${html}</div>`);
      e.style.opacity = alpha; e.style.transform = `translateY(${(1 - alpha) * 24}px)`;
    }
    function show(key, cls, html, alpha, extra = '') { const e = el(key, cls, html); e.style.opacity = alpha; e.style.transform = extra || `translateY(${(1 - alpha) * 30}px)`; return e; }

    // ---------- 每帧复位 ----------
    function reset() {
      tiles.forEach((m, i) => { const { c, top } = m.userData; m.position.set(c.x, TH / 2 - 0.03, c.z); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1); m.visible = true; top.emissive.setHex(0); top.color.setHex(0xffffff); });
      frames.forEach((f, i) => { f.visible = false; const c = cell(i); f.position.set(c.x, TH + 0.005, c.z); });
      blocks.forEach(bs => bs.forEach(b => { b.visible = false; }));
      dice.forEach(d => { d.visible = false; });
      pawns.forEach(p => { p.visible = false; p.scale.setScalar(1); });
      shield.visible = false; coins.count = 0; Object.values(shields).forEach(g => { g.visible = false; }); Object.values(rings).forEach(m => { m.visible = false; });
      arcs.forEach(a => { a.m.visible = false; a.dots.forEach(d => { d.visible = false; }); });
      Object.values(cards).forEach(c => { c.visible = false; }); Object.values(boxes).forEach(b => { b.visible = false; }); Object.values(discs).forEach(d => { d.visible = false; });
      camera.clearViewOffset(); bits.forEach(b => { b.visible = false; }); bitN = 0; sprites.forEach(sp => { sp.visible = false; });
      board.visible = true; board.position.y = 0; center.material.opacity = 1; center.material.transparent = false;
      Object.values(els).forEach(e => { e._used = false; }); api.safeR = SW; api.safeRB = SH; api.safeT = 0; api.safeM = 0; api.views = null;
      glows[0].material.opacity = 0.32; glows[1].material.opacity = 0.26;
    }
    // api.views 有值时分屏渲染：每个 view 是 { x, y, w, h（舞台像素，左上角为原点）, cam（自己的相机）}，用来做序章那种几条横幅拼在一起的画面
    function finish() {
      Object.values(els).forEach(e => { if (!e._used) e.style.opacity = 0; });
      if (!api.views || !api.views.length) { renderer.render(scene, camera); return; }
      renderer.setScissorTest(true); renderer.setViewport(0, 0, SW, SH); renderer.setScissor(0, 0, SW, SH); renderer.clear();
      for (const v of api.views) {
        const x0 = Math.max(0, v.x), x1 = Math.min(SW, v.x + v.w), y0 = Math.max(0, v.y), y1 = Math.min(SH, v.y + v.h); if (x1 <= x0 || y1 <= y0) continue;
        renderer.setViewport(v.x, SH - v.y - v.h, v.w, v.h); renderer.setScissor(x0, SH - y1, x1 - x0, y1 - y0); renderer.render(scene, v.cam);
      }
      renderer.setScissorTest(false); renderer.setViewport(0, 0, SW, SH);
    }

    // ---------- 给时间轴用的操作 ----------
    const top = i => V(cell(i).x, TH, cell(i).z);
    const api = {
      SW, SH, clamp, lerp, seg, ease, easeOut, easeBack, win, V, D, COLORS, tiles, top, cell,
      camera, scene, board, center,
      renderer,   // 给 full 的人物 / 道具贴图用：图一加载完就 initTexture 先传到显卡（不用的页面不受影响）
      cam(pos, look) { camera.position.copy(pos); camera.lookAt(look); },
      // 摄像机关键帧：[[t, [x,y,z], [lx,ly,lz], 'hold'?], ...]
      // 一条连续的镜头：位置、看的点各走一条按时间参数化的三次 Hermite 曲线，穿过所有关键帧。中间关键帧的速度取前后两帧的差分
      // （按两侧时间间隔算），镜头不会每到一个关键帧就停一下；第一帧、最后一帧、和相邻帧一样的「停留」帧速度为 0，自然起步、停稳。
      // 防过冲：每个坐标分量单独限幅 —— 在这一帧掉头（或一侧不动）的分量速度取 0，其余分量不超过两侧较慢那段平均速度的 2 倍，
      // 所以每一段都不会越过两端关键帧（不会钻到棋盘下面，也不会冲过头再拉回来）。
      // 第 4 个元素写 'hold'：这一帧速度强制为 0（故意停一下 / 交给别的镜头接管）；两头都是 'hold' 的那一段、以及只有两个关键帧的调用，
      // 保持原来的缓动曲线（ease）不变 —— 别处有按原来的插值算好的接管机位（序章最后一帧、插段的第一帧、讲解的 camAt），要对得上。
      camPath(t, keys) {
        const n = keys.length; if (!n) return;
        let k = 0; while (k < n - 2 && t > keys[k + 1][0]) k++;
        const A = keys[k], B = keys[Math.min(k + 1, n - 1)], h = B[0] - A[0];
        if (!(h > 0)) { camera.position.set(...B[1]); camera.lookAt(V(...B[2])); return; }
        const u = clamp((t - A[0]) / h);
        if (n === 2 || (A[3] === 'hold' && B[3] === 'hold')) {
          const e = ease(u); camera.position.copy(V(...A[1]).lerp(V(...B[1]), e)); camera.lookAt(V(...A[2]).lerp(V(...B[2]), e)); return;
        }
        // 关键帧 j 在第 w 条曲线（1 位置、2 看的点）上的速度（单位 / 秒）
        const tan = (j, w) => {
          if (j <= 0 || j >= n - 1 || keys[j][3] === 'hold') return [0, 0, 0];
          const h0 = keys[j][0] - keys[j - 1][0], h1 = keys[j + 1][0] - keys[j][0]; if (!(h0 > 0 && h1 > 0)) return [0, 0, 0];
          const a = keys[j - 1][w], b = keys[j][w], c = keys[j + 1][w];
          return [0, 1, 2].map(i => { const d0 = (b[i] - a[i]) / h0, d1 = (c[i] - b[i]) / h1; if (d0 * d1 <= 0) return 0;
            const m = (c[i] - a[i]) / (h0 + h1); return Math.sign(m) * Math.min(Math.abs(m), 2 * Math.min(Math.abs(d0), Math.abs(d1))); });
        };
        const u2 = u * u, u3 = u2 * u, H00 = 2 * u3 - 3 * u2 + 1, H10 = (u3 - 2 * u2 + u) * h, H01 = 3 * u2 - 2 * u3, H11 = (u3 - u2) * h;
        const herm = w => { const m0 = tan(k, w), m1 = tan(k + 1, w), a = A[w], b = B[w]; return V(...[0, 1, 2].map(i => H00 * a[i] + H10 * m0[i] + H01 * b[i] + H11 * m1[i])); };
        camera.position.copy(herm(1)); camera.lookAt(herm(2));
      },
      // 格子从天上落下来：k 0→1
      dropTile(i, k) { const m = tiles[i], e = easeOut(k); m.position.y = TH / 2 - 0.03 + (1 - e) * 7; m.rotation.z = (1 - e) * 0.8 * (i % 2 ? 1 : -1); m.rotation.x = (1 - e) * 0.5; m.visible = k > 0; },
      lift(i, h) { tiles[i].position.y += h; frames[i].position.y += h; blocks[i].forEach(b => { b.position.y += h; }); },
      own(i, p, alpha = 1) { const f = frames[i]; f.visible = alpha > 0; f.children.forEach(b => { b.material.color.set(COLORS[p]); }); f.scale.setScalar(lerp(0.6, 1, easeBack(alpha))); },
      upgrade(i, p, n, k = 1) {   // n 级升级块，k 是最后一块的落下进度
        const c = cell(i), inward = { bottom: [0, -1], top: [0, 1], left: [1, 0], right: [-1, 0], corner: [0, 0] }[c.side];
        const along = c.side === 'left' || c.side === 'right' ? [0, 1] : [1, 0];
        for (let j = 0; j < n; j++) {
          const b = blocks[i][j], kk = j === n - 1 ? k : 1; b.visible = kk > 0; b.material.color.set(COLORS[p]);
          // 贴着最内侧的色组条摆一列，不压格子上的服务图标
          const off = (j - 1) * 0.24, edge = (c.side === 'left' || c.side === 'right' ? c.w : c.d) / 2 - 0.11;
          b.position.set(c.x + inward[0] * edge + along[0] * off, tiles[i].position.y + TH / 2 + 0.07 + (1 - easeOut(kk)) * 2, c.z + inward[1] * edge + along[1] * off);
        }
      },
      impaired(i, k) { const { top } = tiles[i].userData; top.emissive.setRGB(0.55 * k, 0.02 * k, 0.02 * k); top.color.setRGB(1, 1 - 0.45 * k, 1 - 0.45 * k); tiles[i].position.y -= 0.08 * k; },
      // 高亮：格子染成暖黄并浮起一点（白底上只加 emissive 会饱和，看不出来）；只浮 0.03，不埋住站在格子上的棋子底座
      highlight(i, k) { const { top } = tiles[i].userData; top.color.setRGB(1, 1 - 0.18 * k, 1 - 0.6 * k); top.emissive.setRGB(0.28 * k, 0.16 * k, 0); api.lift(i, 0.03 * k); },
      pawnAt(p, pos, k = 0) {   // pos 可以是小数：在两个格子之间跳
        const a = Math.floor(pos), f = pos - a, A = top(((a % 48) + 48) % 48), B = top((((a + 1) % 48) + 48) % 48);
        const P = A.clone().lerp(B, f), off = [[-0.18, -0.18], [0.18, 0.18], [0.18, -0.18], [-0.18, 0.18]][p];
        const m = pawns[p]; m.visible = true; m.position.set(P.x + off[0], TH + Math.sin(Math.PI * f) * 0.7, P.z + off[1]);
        m.rotation.y = f * Math.PI * 2 * 0; return m;
      },
      // 两颗骰子：t0 扔出，t1 停稳，停下时朝上的是 vals
      // bo：可选，按抛体算的弹跳 { up, hs, k2 }（不传 = 原来的 |cos| 弹法，一点不变）：从起点先往上冲 up、落下，再按 hs 一次次弹起（每次弹多高），
      //   t1 正好落定；重力按总时长反算。k2：第二颗的弹起高度乘多少（两颗不一起落地）
      dice(t, t0, t1, vals, at = V(0, 0, 1.4), from = null, k = 1, bo = null) {   // from：可选，骰子从哪儿飞出来（默认从左前方扔进来）；k：缩放（换位置时先缩没再长出来，贴着桌面缩）
        if (t < t0 || k <= 0) return;
        const u = seg(t, t0, t1);
        const hop = (s, h0, up, hs) => {   // s 0→1；按 g = 1 的时间走：第一程（上冲 + 落下）、之后每次弹起各是一段抛物线
          const D = [Math.sqrt(2 * up) + Math.sqrt(2 * (h0 + up)), ...hs.map(h => 2 * Math.sqrt(2 * h))]; let x = s * D.reduce((a, c) => a + c, 0);
          if (x < D[0]) return Math.max(0, h0 + Math.sqrt(2 * up) * x - x * x / 2);
          x -= D[0]; for (let j = 0; j < hs.length; j++) { if (x < D[j + 1]) return Math.max(0, Math.sqrt(2 * hs[j]) * x - x * x / 2); x -= D[j + 1]; }
          return 0; };
        dice.forEach((d, n) => {
          d.visible = true; d.scale.setScalar(k);
          const sx = n ? 0.75 : -0.75, fx = at.x + sx, fz = at.z + (n ? 0.25 : -0.2);
          const x0 = from ? from.x + (n ? 0.25 : -0.25) : fx - 5 + n, z0 = from ? from.z + (n ? 0.2 : -0.2) : fz + 3.5, h0 = from ? from.y - 0.45 : 3.2;
          d.position.x = lerp(x0, fx, easeOut(u)); d.position.z = lerp(z0, fz, easeOut(u));
          const b = bo ? hop(u, h0, bo.up || 0, bo.hs.map(h => h * (n && bo.k2 ? bo.k2 : 1))) : Math.abs(Math.cos(u * Math.PI * 2.5)) * Math.pow(1 - u, 1.6) * h0; d.position.y = 0.45 * k + b;
          const f = FACE[vals[n]], sp = Math.pow(1 - u, 2.2), s = [9 + n * 3, 7 - n * 2, 11 + n * 2];
          d.rotation.set(f[0] + sp * s[0], f[1] + (n ? 0.35 : -0.25) + sp * s[1], f[2] + sp * s[2]);
        });
      },
      // 带颜色的护盾：k 是出现进度，ripple 0→1 时从底部往上泛一圈亮光（被攻击打到时用）
      shieldX(key, i, k, { r = 1.15, color = 0x4aa3ff, ripple = 0, h = 1 } = {}) {
        const g = shieldOf(key), c = cell(i), kk = clamp(k); g.visible = kk > 0; g.position.set(c.x, TH, c.z); g.scale.set(r * easeBack(kk), r * easeBack(kk) * h, r * easeBack(kk));
        const [fill, wire, ring] = g.children; fill.material.color.set(color); wire.material.color.set(color).offsetHSL(0, 0, 0.18);
        fill.material.opacity = 0.16 * clamp(kk * 1.5) + 0.35 * Math.sin(Math.PI * clamp(ripple)); wire.material.opacity = 0.5 * clamp(kk * 1.5) + 0.4 * Math.sin(Math.PI * clamp(ripple));
        ring.material.opacity = ripple > 0 && ripple < 1 ? 0.9 * (1 - ripple) : 0; const y = Math.sin(clamp(ripple) * Math.PI / 2); ring.position.y = y * 0.98; ring.scale.setScalar(Math.cos(Math.asin(Math.min(0.999, y))));
      },
      // 冲击波：从 (x, z) 以半径 r 扩散
      shockwave(key, x, z, r, o, color = 0xff3b30) { const m = ringOf(key); m.visible = o > 0; m.position.set(x, TH + 0.05, z); m.scale.setScalar(Math.max(0.01, r)); m.material.opacity = o; m.material.color.set(color); },
      shield(i, k, r = 1.15) { const c = cell(i); shield.visible = k > 0; shield.position.set(c.x, TH, c.z); shield.scale.setScalar(r * easeBack(clamp(k))); shield.children[0].material.opacity = 0.16 * clamp(k * 1.5); },
      // 金币：从 from 飞到 to，n 个依次出发
      coinFly(t, t0, dur, from, to, n = 18, h = 2.2, start = 0, ez = ease) {   // ez：可选，沿路线走的缓动（不传 = 原来的 ease）
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = V(1, 1, 1);
        for (let j = 0; j < n; j++) {
          const u = seg(t, t0 + j * 0.06, t0 + j * 0.06 + dur); if (u <= 0 || u >= 1) continue;
          const P = from.clone().lerp(to, ez(u)); P.y += Math.sin(Math.PI * u) * h + (j % 3) * 0.05;
          P.x += Math.sin(j * 1.7) * 0.15 * Math.sin(Math.PI * u); P.z += Math.cos(j * 2.3) * 0.15 * Math.sin(Math.PI * u);
          e.set(u * 9 + j, 0, u * 5); q.setFromEuler(e); m.compose(P, q, s); coins.setMatrixAt(coins.count, m); coins.count++;
        }
        coins.instanceMatrix.needsUpdate = true;
      },
      // 金币从一点炸开再落到棋盘上：spread 控制散开多远；落点夹在棋盘内，落在外圈的停在格子顶面，落在中间的停在面板上
      // k：金币缩放（默认 1），离场前从 1 收到 0，免得一帧内全部消失
      coinBurst(t, t0, at, n = 70, spread = 1, k = 1) {
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = V(k, k, k), u = t - t0; if (u < 0 || k <= 0) return;
        for (let j = 0; j < n; j++) {
          const a = j * 2.399, sp = (1.6 + (j * 37 % 17) / 7) * spread, vy = 5 + (j * 13 % 11) / 2.5, tl0 = (vy + Math.sqrt(vy * vy + 24 * at.y)) / 12;
          const xL = clamp(at.x + Math.cos(a) * sp * tl0, -BW / 2 + 0.2, BW / 2 - 0.2), zL = clamp(at.z + Math.sin(a) * sp * tl0, -BD / 2 + 0.2, BD / 2 - 0.2);
          const fl = Math.abs(xL) > BW / 2 - C || Math.abs(zL) > BD / 2 - C ? 0.215 : 0, tl = (vy + Math.sqrt(vy * vy + 24 * Math.max(0, at.y - fl))) / 12;
          const tt = Math.min(u, tl), land = u >= tl, P = V(lerp(at.x, xL, tt / tl), land ? fl : at.y + vy * tt - 6 * tt * tt, lerp(at.z, zL, tt / tl));
          e.set(land ? 0 : tt * 8 + j, j, land ? 0 : tt * 6); q.setFromEuler(e); m.compose(P, q, s); coins.setMatrixAt(coins.count, m); coins.count++;
        }
        coins.instanceMatrix.needsUpdate = true;
      },
      arc(t, key, pts, k, color) {
        const a = arc(key, pts, color); if (k <= 0) return;
        a.m.visible = true; const cnt = a.m.geometry.index.count; a.m.geometry.setDrawRange(0, Math.floor(cnt * clamp(k) / 60) * 60);
        if (k >= 1) a.dots.forEach((d, n) => { d.visible = true; d.position.copy(a.curve.getPointAt((t * 0.45 + n / 3) % 1)); });
      },
      // 卡牌：放在镜头前面。flip 0 = 背面，1 = 正面
      card(key, info, { x = 0, y = 0, z = -8.5, flip = 1, rot = 0, s = 1, alpha = 1 } = {}) {
        const g = card(key, info); g.visible = alpha > 0; g.children.forEach(m => { m.material.opacity = clamp(alpha); }); g.position.set(x, y, z); g.rotation.set(0, Math.PI * (1 - flip), rot); g.scale.setScalar(s);
      },
      // 立在棋盘上的 3D 盒子（DLC 扩展包）：size = [宽, 高, 厚]，sq 是压扁程度（落地时 >0）
      box(key, info, { x = 0, y = 0, z = 0, size = [2, 2.6, 0.5], ry = 0, rz = 0, sq = 0, s = 1 } = {}) {
        const g = box(key, info, size); g.visible = s > 0.001; g.position.set(x, y, z); g.rotation.set(0, ry, rz);
        g.children[0].castShadow = y < 3.5;   // 还在高处（没进画面）时不投影，免得棋盘上先出现一块方形影子
        g.scale.set(s * (1 + sq * 0.5), s * (1 - sq), s);
      },
      floorGlow(key, color, x, z, r, o) { const d = disc(key, color); d.visible = o > 0; d.position.set(x, TH + 0.02, z); d.scale.setScalar(r); d.material.opacity = o; },
      // 落地时溅起的小碎块：t0 落地时刻
      splash(t, t0, at, color, n = 10) { const u = t - t0; if (u < 0 || u > 0.7) return;
        for (let j = 0; j < n; j++) { const a = j / n * Math.PI * 2 + t0, sp = 2.2 + (j % 3) * 0.6, y = 0.15 + 4 * u - 9 * u * u; if (y < 0) continue;
          this.bit(V(at.x + Math.cos(a) * sp * u, y + TH, at.z + Math.sin(a) * sp * u * 0.7), color, 0.12 * (1 - u / 0.7)); } },
      label, caption, show, el, screen,
      view(px) { if (px) camera.setViewOffset(SW, SH, px, 0, SW, SH); },
      // 片尾：镜头绕着棋盘慢慢转，棋盘挪到右边，上面漂一圈服务图标；左边放大标题面板
      // 片头：和片尾同一个构图（第一帧就是封面），t1 之前 1.4 秒镜头从环绕俯冲回时间轴里的机位
      intro(t, t1, html, base = 0) {
        const k = 1 - ease(seg(t, t1 - 1.4, t1)), th = 0.6 + t * 0.07;
        const P = V(15.5 * Math.sin(th), 8.5 + Math.sin(t * 0.4) * 0.6, 15.5 * Math.cos(th));
        camera.position.lerp(P, k); camera.lookAt(V(0, 0, 0).lerp(V(0, 0.8, 0), k));
        this.view(base + (-440 - base) * k);
        sprites.forEach((sp, n) => { const a = n / sprites.length * Math.PI * 2 + t * 0.22, r = 9.4 + (n % 3) * 0.9;
          sp.visible = k > 0.01; sp.position.set(Math.cos(a) * r, 2.0 + (n % 2) * 1.1 + Math.sin(t * 1.4 + n) * 0.35, Math.sin(a) * r * 0.82);
          sp.scale.setScalar(1.25 * k); sp.material.opacity = k * floatFade(sp); });
        glows[0].material.opacity = 0.32 + 0.25 * k; glows[1].material.opacity = 0.26 + 0.25 * k;
        show('dim2', 'dim2', '', k, 'none');
        const a2 = 1 - seg(t, t1 - 1.6, t1 - 0.7); show('end2', 'end2', html, ease(a2), `translateX(${(1 - ease(a2)) * -50}px)`);
      },
      // spin：镜头绕棋盘转的速度（弧度 / 秒），th0：起始角度。片尾长的视频（讲解）传小一点，免得转到侧面
      outro(t, t0, html, base = 0, spin = 0.07, th0 = 0.6) {
        const k = ease(seg(t, t0 - 0.8, t0 + 0.9)), th = th0 + (t - t0) * spin;
        const P = V(15.5 * Math.sin(th), 8.5 + Math.sin((t - t0) * 0.4) * 0.6, 15.5 * Math.cos(th));
        camera.position.lerp(P, k); camera.lookAt(V(0, 0, 0).lerp(V(0, 0.8, 0), k));
        this.view(base + (-440 - base) * k);
        sprites.forEach((sp, n) => { const a = n / sprites.length * Math.PI * 2 + (t - t0) * 0.22, r = 9.4 + (n % 3) * 0.9;
          sp.visible = k > 0.01; sp.position.set(Math.cos(a) * r, 2.0 + (n % 2) * 1.1 + Math.sin(t * 1.4 + n) * 0.35, Math.sin(a) * r * 0.82);
          sp.scale.setScalar(1.25 * k); sp.material.opacity = k * floatFade(sp); });
        glows[0].material.opacity = 0.32 + 0.25 * k; glows[1].material.opacity = 0.26 + 0.25 * k;
        show('dim2', 'dim2', '', k, 'none');
        const a2 = seg(t, t0 + 0.2, t0 + 1.1); show('end2', 'end2', html, ease(a2), `translateX(${(1 - ease(a2)) * -50}px)`);
      },
      bit(pos, color, s = 0.22) { const b = bits[bitN++]; if (!b) return; b.visible = true; b.position.copy(pos); b.scale.setScalar(s); b.material.color.set(color); return b; },
      glow(o1, o2) { glows[0].material.opacity = o1; glows[1].material.opacity = o2; },
    };

    let script = () => {}, duration = 10;
    function seek(t) { reset(); script(t, api); finish(); }
    function fit() { const k = Math.min(innerWidth / SW, innerHeight / SH); stage.style.transform = `translate(-50%,-50%) scale(${k})`; }
    addEventListener('resize', fit); fit();
    return { api, seek, setScript(fn, dur) { script = fn; duration = dur; }, get duration() { return duration; } };
  }

  // ---------- 播放器：浏览器里直接看；?record=1 时不自动播放，等录制脚本逐帧 seek ----------
  window.PromoEngine = {
    async start(script, duration) {
      const root = document.querySelector('.player'), E = await create(root);
      E.setScript(script, duration);
      const q = new URLSearchParams(location.search), rec = q.has('record');
      const bar = root.querySelector('.bar i'), hint = root.querySelector('.hint');
      // 有音轨时以音频时间为准（画面跟着声音走）；浏览器不让带声音自动播放，所以先停在第一帧等点击
      const au = !rec && window.PROMO_AUDIO ? new Audio(window.PROMO_AUDIO) : null;
      let t = +(q.get('t') || 0), playing = !rec && !au, last = performance.now();
      const big = root.querySelector(':scope > .big');   // 播放遮罩；标签里也有 .lbl.big，别取错
      const setPlay = on => {
        if (t >= duration) t = 0;
        playing = on; if (au) { if (on) { au.currentTime = t; au.play(); } else au.pause(); }
        hint.textContent = on ? '' : '已暂停，点一下继续'; hint.style.opacity = on ? 0 : 1; if (big) big.style.display = 'none';
      };
      const loop = now => {
        // 有音轨时画面不直接用 au.currentTime：浏览器更新它是一跳一跳的（Safari、Firefox 一次跳十几到几百毫秒），骰子这种快动作会一顿一顿。
        // 改成自己的时钟按帧均匀往前走，再每帧往音频位置拉一点（差 0.25 秒以上才直接跳过去），画面顺滑、声画也对得上
        if (playing) { if (au) { const step = t + (now - last) / 1000 * (au.playbackRate || 1), d = au.currentTime - step; t = Math.abs(d) > 0.25 ? au.currentTime : step + d * 0.08; } else t = t + (now - last) / 1000; if (t >= duration || (au && au.ended)) { t = duration; playing = false; hint.textContent = '点一下重新播放'; hint.style.opacity = 1; } }
        last = now; E.seek(t); if (bar) bar.style.width = (t / duration * 100) + '%'; if (!rec) requestAnimationFrame(loop);
      };
      if (rec) root.classList.add('rec'); else if (au && big) big.style.display = 'flex';
      root.addEventListener('click', () => setPlay(!playing));
      const jump = d => { t = Math.max(0, Math.min(duration, t + d)); if (au) au.currentTime = t; };
      addEventListener('keydown', e => { if (e.key === 'ArrowRight') jump(2); if (e.key === 'ArrowLeft') jump(-2); if (e.key === ' ') { setPlay(!playing); e.preventDefault(); } });
      if (!rec) { for (let x = 0; x < duration; x += 0.5) E.seek(x); for (const x of (window.PROMO_SCRIPT && PROMO_SCRIPT.warm) || []) E.seek(x); E.seek(t); }   // 预热：着色器编译、贴图上传都在开播前做完，播放时不会卡一下；PROMO_SCRIPT.warm 是脚本另外要预跑的时刻（只有 full 有，别的页面没有这一项，什么也不多做）
      window.PROMO = { duration, seek: x => { t = x; E.seek(x); }, ready: true, cam: E.api.camera };   // cam：给检查工具读镜头位置
      requestAnimationFrame(loop);
    },
  };
})();
