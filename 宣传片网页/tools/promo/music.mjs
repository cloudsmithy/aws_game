// 给宣传片 / 讲解视频合成配乐和音效（纯代码合成，不用任何外部音频素材，没有版权问题）。
// 用法：node tools/promo/music.mjs promo 输出.wav    —— 52 秒，配乐 + 跟画面对齐的音效
//       node tools/promo/music.mjs explain 输出.wav  —— 跟配音一样长的轻配乐，垫在人声下面
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../gamedata.mjs';

const [, , mode = 'promo', out = 'music.wav'] = process.argv;
const SR = 48000;
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

const X = mode === 'explain' ? JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'promo', 'explain_data.json'), 'utf8')) : null;
let DUR = X ? X.duration : mode === 'full' ? 128.27 : 52;   // full：= promo_full.js 的 DUR（EG0 + EGL；11/05 复核：S3 插段 +0.8、四个角 +1.6、彩蛋 +1.2；11/11 专属技能 +1.12），序章最后再拼进去
let L = new Float32Array(Math.ceil(DUR * SR) + SR), R = new Float32Array(L.length);
const put = (i, v, pan) => { if (i >= 0 && i < L.length) { L[i] += v * (1 - Math.max(0, pan)); R[i] += v * (1 + Math.min(0, pan)); } };
const env = (x, dur, a, r) => x < a ? x / a : x > dur - r ? Math.max(0, (dur - x) / r) : 1;

// 振荡器：sine / saw / square，可以滑音
function tone(t0, dur, f, { amp = 0.2, type = 'sine', a = 0.005, r = 0.1, pan = 0, f1 = null, decay = 0, lp = 1 } = {}) {
  let ph = 0, y = 0; const n = Math.floor(dur * SR), i0 = Math.floor(t0 * SR);
  for (let k = 0; k < n; k++) {
    const x = k / SR, ff = f1 ? f * Math.pow(f1 / f, x / dur) : f; ph += ff / SR; ph -= Math.floor(ph);
    let s = type === 'sine' ? Math.sin(2 * Math.PI * ph) : type === 'saw' ? 2 * ph - 1 : (ph < 0.5 ? 1 : -1);
    y += lp * (s - y); s = y;
    put(i0 + k, s * amp * env(x, dur, a, r) * (decay ? Math.exp(-x / decay) : 1), pan);
  }
}
// 噪声：可以扫低通（lp0 → lp1），也可以只留高频
function noise(t0, dur, { amp = 0.2, a = 0.002, r = 0.05, lp0 = 0.5, lp1 = null, hp = false, pan = 0, decay = 0 } = {}) {
  let y = 0; const n = Math.floor(dur * SR), i0 = Math.floor(t0 * SR);
  for (let k = 0; k < n; k++) {
    const x = k / SR, c = lp1 == null ? lp0 : lp0 + (lp1 - lp0) * (x / dur), w = rnd() * 2 - 1;
    y += c * (w - y); const s = hp ? w - y : y;
    put(i0 + k, s * amp * env(x, dur, a, r) * (decay ? Math.exp(-x / decay) : 1), pan);
  }
}

// ---------- 乐器 ----------
const pad = (t0, dur, notes, amp = 0.05, lp = 0.04) => notes.forEach((m, j) => [-0.06, 0.06].forEach(dt => tone(t0, dur, mtof(m + dt), { type: 'saw', amp, a: 1.0, r: 1.4, pan: dt * 5 * (j % 2 ? 1 : -1), lp })));
const kick = (t, amp = 0.55) => { noise(t, 0.09, { amp: amp * 0.35, lp0: 0.5, decay: 0.03, pan: 0.1 }); noise(t + 0.012, 0.07, { amp: amp * 0.25, lp0: 0.6, decay: 0.025, pan: -0.1 }); };   // 原来是低沉的底鼓（听着心慌），换成轻拍手
const hat = (t, amp = 0.05) => noise(t, 0.06, { amp, hp: true, lp0: 0.35, decay: 0.018, pan: 0.2 });
const bass = (t, m, dur = 0.26, amp = 0.11) => tone(t, dur, mtof(m + 12), { amp: amp * 0.8, a: 0.004, r: 0.08, decay: 0.18 });
const bell = (t, m, amp = 0.05) => { tone(t, 0.6, mtof(m), { amp, a: 0.002, r: 0.2, decay: 0.16 }); tone(t, 0.4, mtof(m + 12), { amp: amp * 0.35, a: 0.002, r: 0.15, decay: 0.08 }); };
const ping = (t, amp = 0.12, pan = 0) => { tone(t, 0.45, 1568, { amp, decay: 0.12, pan }); tone(t + 0.035, 0.45, 2093, { amp: amp * 0.8, decay: 0.14, pan }); };
const blip = (t, m, amp = 0.12) => tone(t, 0.12, mtof(m), { type: 'square', amp, a: 0.002, r: 0.05, lp: 0.2, decay: 0.05 });
const whoosh = (t, dur = 0.55, amp = 0.16) => { noise(t, dur * 0.6, { amp, lp0: 0.01, lp1: 0.35, a: 0.1, r: 0.05 }); noise(t + dur * 0.6, dur * 0.4, { amp, lp0: 0.35, lp1: 0.02, a: 0.01, r: 0.2 }); };
const thunk = (t, amp = 0.3) => { tone(t, 0.25, 220, { f1: 90, amp, decay: 0.06 }); noise(t, 0.05, { amp: amp * 0.4, lp0: 0.2, decay: 0.015 }); };
const tick = (t, amp = 0.05) => { noise(t, 0.03, { amp, lp0: 0.5, decay: 0.006, pan: rnd() - 0.5 }); tone(t, 0.06, 900 + rnd() * 500, { amp: amp * 0.6, decay: 0.015 }); };
const rattle = (t0, t1) => { let t = t0; while (t < t1) { const u = (t - t0) / (t1 - t0); noise(t, 0.012, { amp: 0.22 * (1 - u * 0.6), lp0: 0.6, decay: 0.004, pan: rnd() * 0.6 - 0.3 }); t += 0.025 + u * u * 0.18 + rnd() * 0.03; } };
const riser = (t0, dur) => { noise(t0, dur, { amp: 0.14, lp0: 0.005, lp1: 0.5, a: dur * 0.9, r: 0.02 }); tone(t0, dur, 220, { f1: 880, amp: 0.04, type: 'saw', lp: 0.08, a: dur * 0.8, r: 0.02 }); };
const impact = (t, amp = 0.6) => { [72, 76, 79, 84, 88].forEach((m, k) => tone(t + k * 0.03, 1.2, mtof(m), { amp: amp * 0.09, a: 0.003, r: 0.5, decay: 0.4, pan: (k % 2 ? 0.3 : -0.3) })); noise(t, 0.5, { amp: amp * 0.12, hp: true, lp0: 0.3, decay: 0.15 }); };   // 原来是低沉的轰，换成亮的闪光
const shimmer = t => [84, 88, 91, 96, 91, 88].forEach((m, k) => tone(t + k * 0.07, 0.9, mtof(m), { amp: 0.05, decay: 0.3, pan: k % 2 ? 0.4 : -0.4 }));
const alarm = t => [0, 0.32].forEach(d => tone(t + d, 0.26, 330, { f1: 260, type: 'square', amp: 0.06, lp: 0.12, a: 0.005, r: 0.05 }));
const chime = t => [76, 79, 84].forEach((m, k) => tone(t + k * 0.08, 0.8, mtof(m), { amp: 0.09, decay: 0.25 }));

// 和弦进行：Am – F – C – G，每个和弦 2 小节
const BEAT = 0.56, CH = [[60, 64, 67, 72], [55, 59, 62, 67], [57, 60, 64, 69], [53, 57, 60, 65]], ROOTS = [36, 31, 33, 29];   // C 大调：C – G – Am – F
const ARP = [0, 1, 2, 3, 2, 1, 2, 3];   // 琶音：在和弦里上下走

if (mode === 'promo') {
  const G0 = 4.6, G1 = 45.2;
  pad(0, 4.9, [60, 64, 67, 74], 0.06, 0.025);
  riser(3.1, 1.5); impact(4.6);
  for (let c = 0; ; c++) { const t0 = G0 + c * 8 * BEAT * 0.5 * 2; if (t0 >= G1) break; pad(t0, Math.min(4.8, G1 - t0) + 0.6, CH[c % 4], 0.045, 0.035); }
  for (let b = 0; G0 + b * BEAT < G1; b++) {
    const t = G0 + b * BEAT, ch = Math.floor(b / 8) % 4;
    if (t >= 5.0 && b % 2) kick(t, 0.2);
    if (t >= 7.0) { hat(t + BEAT / 2, 0.035); bell(t, CH[ch][ARP[b % 8]] + 12, 0.04); bell(t + BEAT / 2, CH[ch][ARP[(b * 2 + 1) % 8]] + 12, 0.028); }
    if (t >= 7.0 && b % 2 === 0) bass(t, ROOTS[ch], 0.3, 0.12);
  }
  for (let i = 0; i < 48; i++) tick(5.6 + i * 0.055, 0.06);                     // 格子落下
  rattle(10.75, 12.0); thunk(12.0, 0.18);                                     // 骰子
  for (let k = 0; k < 8; k++) blip(12.45 + k * 0.25, 69 + [0, 2, 4, 5, 7, 9, 11, 12][k], 0.07);   // 棋子一格格跳
  chime(14.5);                                                                // 买下 EC2
  thunk(17.0); thunk(17.6);                                                   // 升级块落下
  tone(18.6, 1.4, 330, { f1: 990, amp: 0.05, type: 'saw', lp: 0.06, a: 0.2, r: 0.3 });   // 架构连线
  shimmer(19.9);
  for (let k = 0; k < 3; k++) blip(20.65 + k * 0.25, 64 - k * 2, 0.06);       // 虫虫跳到 RDS
  for (let k = 0; k < 16; k++) ping(21.6 + k * 0.06, 0.06, (k % 3 - 1) * 0.4);   // 过路费金币
  whoosh(23.15); noise(23.55, 0.08, { amp: 0.2, lp0: 0.3, decay: 0.03 });     // Health 卡飞进、翻面
  alarm(26.4); alarm(26.9);                                                   // Impaired
  shimmer(26.85);                                                             // 多 AZ 护盾
  whoosh(29.75); noise(30.0, 0.08, { amp: 0.2, lp0: 0.3, decay: 0.03 });
  for (let k = 0; k < 40; k++) ping(30.95 + rnd() * 1.4, 0.05, rnd() - 0.5);  // 金币炸开
  for (let n = 0; n < 4; n++) whoosh(32.0 + n * 0.16, 0.4, 0.09);             // 社交卡
  for (let k = 0; k < 12; k++) blip(35.45 + k * 0.13, 64 + k, 0.06);          // 部署点数一格格攒满
  riser(36.6, 0.75); tone(37.3, 0.6, 1200, { f1: 90, type: 'saw', amp: 0.09, lp: 0.15, a: 0.005, r: 0.1 });   // DDoS 打出去
  impact(37.95, 0.45); alarm(38.1); alarm(38.6);                              // 服务下线
  whoosh(39.75); noise(40.0, 0.08, { amp: 0.2, lp0: 0.3, decay: 0.03 }); chime(40.7);   // 专属技能卡
  for (let k = 0; k < 18; k++) ping(41.05 + k * 0.07, 0.06, (k % 3 - 1) * 0.4);   // 订阅费
  whoosh(45.0, 0.9, 0.12);
  pad(45.2, 6.8, [48, 60, 64, 67, 71, 74], 0.05, 0.03);                       // 片尾长和弦
  impact(46.2, 0.4); chime(46.4);
} else if (mode === 'full') {
  // full 宣传片：时间点和 promo_full.js 的 PROMO_FULL_T 一致；主线音效从 promo 平移 −4.8 秒，模式看点每段 4.2 秒
  // 插段：23.2 秒后串联收费 5 秒、29.8 秒后 S3 公开 6.2 秒、35.2 秒后四个角 10 秒（每个角 CK = 2.5）；模式看点前 5 段各 4.2 秒，高速部署 6.6 秒（和 promo_full.js 的 INS 一致）
  const INTRO = 5.4, SH = 4.8, XS = 23.2 - SH, XL = 5.0, ZS = 29.8 - SH + XL, ZL = 6.2, SD = 0.8, CS = 35.2 - SH + XL + ZL, CL = 10.0, CK = 2.5, A0 = CS + CL, AL = 4.2;   // SD：S3 卡多停的 0.8，卡滑走以后的音效整体往后挪
  const ALEN = [4.2, 4.2, 4.2, 4.2, 4.2, 6.6], ACUM = ALEN.map((_, k) => ALEN.slice(0, k).reduce((a, b) => a + b, 0)), at = (k, off) => A0 + ACUM[k] + off * ALEN[k] / 4.2;
  const SKX = 1.12, SK0 = A0 + ALEN.reduce((a, b) => a + b, 0), DL0 = SK0 + 3.8 + SKX, R0 = DL0 + 4.6, R1 = R0 + 1.5, Q0 = R0 + 10.1, W0 = Q0 + 3.6, OUT0 = W0 + 4.6;   // SKX：11/11 专属技能多 2 拍演「战略并购」（= promo_full.js 的 SKX），之后整体往后挪
  // 正片的节拍网格（11/05 复核）：原点从 INTRO 改成 CUT − 4 拍（接口处正好是网格的第 4 拍、Am 小节的后半），接在序章第 28 拍上：
  //   原来原点 5.4、切点 5.9 不在拍上，接口处跳半拍、拍手从 2、4 拍跑到 1、3 拍；和弦序号 +2（Am – F – C – G），接口两边是同一个 Am；
  //   铺底每个和弦 8 拍（原来写成 4.8 秒，琶音、低音是 8 拍 = 4.48 秒，越往后差得越多，后半段铺底整整差一个和弦）
  //   G1：节拍停在最靠近 OUT0 + 1.0（片尾接上、盒子跳走以后）的小节线上（4 拍一小节），那一拍落一个 C 和弦重音，片尾长和弦从这里开始
  //   11/11：专属技能多了 SKX（2 拍），G1 按原来的 OUT0 取小节线再跟着挪 SKX（和片尾画面的距离不变，落在小节的第 3 拍上，还在拍子上）
  const MG0 = 5.4 + 0.5 - 4 * BEAT, G1 = MG0 + Math.round((OUT0 - SKX + 1.0 - MG0) / (4 * BEAT)) * 4 * BEAT + SKX;
  const m = b => b - SH + (b >= 23.1 ? XL : 0) + (b >= 29.7 ? ZL : 0);
  // 封面（0–0.8）只用到这里最前面一段：只留铺底和弦（原来还有一串 shimmer，封面掐断以后序章开头又响一遍一样的，听着像音乐重启）
  pad(0, INTRO + 0.4, [60, 64, 67, 74], 0.06, 0.025); riser(INTRO - 1.5, 1.5); impact(INTRO);
  for (let c = 0; ; c++) { const t0 = MG0 + c * 8 * BEAT; if (t0 >= G1) break; pad(t0, Math.min(8 * BEAT, G1 - t0) + 0.6, CH[(c + 2) % 4], 0.045, 0.035); }
  for (let b = 0; MG0 + b * BEAT < G1 - 1e-6; b++) {
    const t = MG0 + b * BEAT, ch = (Math.floor(b / 8) + 2) % 4;
    if (b % 2) kick(t, 0.2); hat(t + BEAT / 2, 0.035);
    bell(t, CH[ch][ARP[b % 8]] + 12, 0.04); bell(t + BEAT / 2, CH[ch][ARP[(b * 2 + 1) % 8]] + 12, 0.028);
    if (b % 2 === 0) bass(t, ROOTS[ch], 0.3, 0.12);
  }
  // 换掉 / 挪动的音效（11/05）：quiet(f) 把原来的照样跑一遍但不出声（随机数照样消耗），iso(f) 新加的跑完把随机数复位 ——
  //   后面所有带随机数的音效（噪声、金币声的时刻）一个样本都不变
  const quiet = f => { const l = L, r = R; L = R = new Float32Array(0); try { f(); } finally { L = l; R = r; } }, iso = f => { const s0 = seed; f(); seed = s0; };
  // 第一把骰子（promo_full.js 的 DICE1）：Damo 一拳打出来以后弹得高、停得快 —— 正片里 tt 10.70、11.02 两次落地，11.2 停稳（原来一路滚到 12.0 才落定）
  quiet(() => { rattle(m(10.75), m(12.0)); thunk(m(12.0), 0.18); });
  iso(() => { thunk(m(10.7), 0.16); thunk(m(11.02), 0.1); rattle(m(11.03), m(11.2)); thunk(m(11.2), 0.07); });
  for (let k = 0; k < 8; k++) blip(m(12.45) + k * 0.25, 69 + [0, 2, 4, 5, 7, 9, 11, 12][k], 0.07);
  // 03 升级多 AZ（promo_full.js 的 azDrop）：一块升级块 tt 17.1 落地（原来 17.0、17.6 两声是普通版两块升级块的），17.5–17.8 两块之间画出连线：一声很轻的往上滑
  chime(m(14.5)); quiet(() => { thunk(m(17.0)); thunk(m(17.6)); });
  iso(() => { thunk(m(17.1)); tone(m(17.5), 0.32, 660, { f1: 1320, amp: 0.03, a: 0.02, r: 0.12 }); });
  tone(m(18.6), 1.4, 330, { f1: 990, amp: 0.05, type: 'saw', lp: 0.06, a: 0.2, r: 0.3 }); shimmer(m(19.9));
  for (let k = 0; k < 3; k++) blip(m(20.65) + k * 0.25, 64 - k * 2, 0.06);
  // 11/11：虫虫自己掷 1 + 2（promo_full.js 的 RD2：tt 20.15 扔出，20.36、20.53 落地弹起，20.62 停稳）
  iso(() => { thunk(m(20.36), 0.12); thunk(m(20.53), 0.07); rattle(m(20.535), m(20.61)); thunk(m(20.62), 0.04); });
  for (let k = 0; k < 16; k++) ping(m(21.6) + k * 0.06, 0.06, (k % 3 - 1) * 0.4);
  whoosh(m(23.15)); noise(m(23.55), 0.08, { amp: 0.2, lp0: 0.3, decay: 0.03 });
  alarm(m(26.4)); alarm(m(26.9)); shimmer(m(26.85));
  whoosh(m(29.75)); noise(m(30.0), 0.08, { amp: 0.2, lp0: 0.3, decay: 0.03 });
  // 抽到 WA Review：full 不演 Free Tier 的金币炸开（WA 卡不给钱），原来这 40 声金币（1.4 秒）换成 Aurora 升级块落地（tt 30.92）：落地 + 冲击波的闪光 + 一串亮晶晶，31.32 画连线
  //   亮晶晶跟着紫色、金色碎块（0.5 秒内溅完）：30 声更密、短一点（0.8 秒），总能量和原来那串金币差不多 —— mix.mjs 的 loudnorm 是动态的，这段一下子轻很多，后面整段会被推高约 0.15 dB
  quiet(() => { for (let k = 0; k < 40; k++) ping(m(30.95) + rnd() * 1.4, 0.05, rnd() - 0.5); });
  iso(() => { thunk(m(30.92), 0.24); impact(m(30.92), 0.3); shimmer(m(30.98)); for (let k = 0; k < 30; k++) ping(m(30.94) + Math.pow(rnd(), 1.6) * 0.8, 0.055, rnd() - 0.5);
    tone(m(31.32), 0.32, 660, { f1: 1320, amp: 0.03, a: 0.02, r: 0.12 }); });
  for (let n = 0; n < 4; n++) whoosh(m(32.0) + n * 0.16, 0.4, 0.09);
  // 03 串联收费（插段）
  chime(XS + 0.45); tone(XS + 0.8, 1.1, 330, { f1: 990, amp: 0.05, type: 'saw', lp: 0.06, a: 0.2, r: 0.3 }); shimmer(XS + 2.0);
  for (let k = 0; k < 20; k++) ping(XS + 3.0 + k * 0.06, 0.05, (k % 3 - 1) * 0.4);
  // 04 S3 公开（插段）：卡飞进、数据外泄警报、GuardDuty 告警连线；只有 GuardDuty 不算免疫（没有护盾，不再配闪光和「免疫」的铃），每人少赔一半：三笔金币飞向另外三人
  whoosh(ZS); noise(ZS + 0.3, 0.08, { amp: 0.2, lp0: 0.3, decay: 0.03 }); alarm(ZS + SD + 1.95); alarm(ZS + SD + 2.4);
  tone(ZS + SD + 2.2, 0.7, 330, { f1: 990, amp: 0.05, type: 'saw', lp: 0.06, a: 0.1, r: 0.2 }); blip(ZS + SD + 2.8, 81, 0.06); blip(ZS + SD + 2.88, 76, 0.05);   // 金线到了 S3：两声往下走的提示音（告警到了，只能少赔）
  for (let n = 0; n < 3; n++) for (let k = 0; k < 3; k++) ping(ZS + SD + 3.4 + n * 0.12 + k * 0.06, 0.045, [-0.5, 0.1, 0.4][n]);   // 韩叔、Damo、Yuki 各 $25
  // 11/11 fix2（11/12 cardrestore 只留这一把）：06 娱乐模式开头虫虫再掷一把 1 + 2、跳 3 格（promo_full.js 的 diceA / 06 虫虫跳格）。骰子声照 RD2 那一把（扔出 0.21、0.38 落地弹起，0.47 停稳）；
  //   用 iso 包着，后面带随机数的音效一个样本都不变
  const PD0 = A0, diceS = t0 => { thunk(t0 + 0.21, 0.12); thunk(t0 + 0.38, 0.07); rattle(t0 + 0.385, t0 + 0.46); thunk(t0 + 0.47, 0.04); };
  iso(() => { diceS(PD0); for (let k = 0; k < 3; k++) blip(PD0 + 0.48 + k * 0.1 + 0.03, 64 + k * 2, 0.05); });
  // 05 四个角：每个角一声转场 + 各自的音效
  for (let j = 0; j < 4; j++) whoosh(CS + j * CK + 0.05, 0.5, 0.08);
  for (let k = 0; k < 10; k++) ping(CS + 0.75 + k * 0.06, 0.05, 0.2);          // Startup 扶持：领钱
  alarm(CS + CK + 0.6);                                                       // 维护窗口
  for (let k = 0; k < 5; k++) ping(CS + 2 * CK + 0.75 + k * 0.08, 0.05, -0.2); for (let k = 0; k < 24; k++) ping(CS + 2 * CK + 1.25 + rnd() * 0.8, 0.04, rnd() - 0.5);   // User Group 活动
  alarm(CS + 3 * CK + 0.4); tone(CS + 3 * CK + 0.6, 0.8, 900, { f1: 300, type: 'saw', amp: 0.06, lp: 0.12, a: 0.01, r: 0.2 }); thunk(CS + 3 * CK + 1.35, 0.25);                                // Root 密钥泄露
  // 6 个模式看点：每段开头一声转场，再配各自的音效
  for (let k = 0; k < 6; k++) whoosh(A0 + k * AL - 0.2, 0.5, 0.1);
  for (let n = 0; n < 3; n++) whoosh(at(0, 0.2 + n * 0.2), 0.4, 0.08);                    // 娱乐：盲盒卡
  for (let k = 0; k < 12; k++) ping(at(1, 0.5 + k * 0.1), 0.05, (k % 3 - 1) * 0.4);   // 入门：运行费
  alarm(at(2, 1.2)); alarm(at(2, 2.2));                                     // 标准：技术债
  for (let k = 0; k < 12; k++) ping(at(3, 0.8 + k * 0.06), 0.05, 0); chime(at(3, 2.0));   // 完整：交易
  chime(at(4, 2.2));                                                               // 学习：答对
  const S6 = b => at(5, b - 35.2); shimmer(S6(35.7)); shimmer(S6(37.6));   // 两个护盾提早到 tt 35.6–36.1 亮起来（防护标签在红线出发前收完）                                                        // 高速部署：DDoS
  for (let k = 0; k < 12; k++) blip(S6(35.45 + k * 0.13), 64 + k, 0.06);
  riser(S6(36.6), 0.9); tone(S6(37.3), 0.7, 1200, { f1: 90, type: 'saw', amp: 0.09, lp: 0.15, a: 0.005, r: 0.1 });
  impact(S6(37.95), 0.45); alarm(S6(38.1)); alarm(S6(38.6));
  const S7 = SK0 - 39.4;                                                                  // 专属技能
  whoosh(S7 + 39.75); noise(S7 + 40.0, 0.08, { amp: 0.2, lp0: 0.3, decay: 0.03 }); chime(S7 + 40.7);
  for (let k = 0; k < 18; k++) ping(S7 + 41.05 + k * 0.07, 0.06, (k % 3 - 1) * 0.4);
  // 11/11：战略并购（promo_full.js：SK0 + 3.25 韩叔的红框缩掉，+3.5 长出 Damo 的绿框）
  iso(() => { tone(SK0 + 3.25, 0.25, 520, { f1: 300, amp: 0.035, a: 0.01, r: 0.1 }); chime(SK0 + 3.55); });
  // 13 玩法 DLC：4 个盒子落地，每个弹两下
  // 盒子落地的 thunk 原来是正片最响的声音（比一拳、大标题还响，低音区十来下连成一串，把节拍糊掉），第一下降到 0.15，弹跳 0.06 / 0.03
  whoosh(DL0 - 0.1); for (let n = 0; n < 4; n++) { const t0 = DL0 + 0.1 + n * 0.18; thunk(t0 + 0.18, 0.15); thunk(t0 + 0.55, 0.06); thunk(t0 + 0.78, 0.03); } chime(DL0 + 1.4);
  // 14 代理商：进货、客户跳过来买走、运行费分成
  for (let k = 0; k < 3; k++) blip(R0 + 1.25 + k * 0.2, 64 + k * 2, 0.06);   // 11/11：Yuki 从 39 号格跳 3 格到 42 号格再进货（promo_full.js yHop）
  whoosh(R0 - 0.1); shimmer(R0 + 0.6); chime(R1 + 0.3); for (let k = 0; k < 6; k++) ping(R1 + 0.8 + k * 0.06, 0.05, 0.3); thunk(R1 + 1.3, 0.2);   // 11/11 refine：进货（R1 + 0.3 长紫框）原来是两声 blip，紧跟在 Yuki 跳格的三声 blip 后面，五声连成一串像跳了 5 格；换成 chime（只用 tone，不动 rnd 的随机序列）
  for (let k = 0; k < 3; k++) blip(R1 + 1.9 + k * 0.22, 64 + k * 2, 0.06); for (let k = 0; k < 8; k++) ping(R1 + 2.8 + k * 0.06, 0.05, 0); chime(R1 + 3.1); for (let k = 0; k < 3; k++) blip(R1 + 5.6 + k * 0.25, 69 + k * 2, 0.06);   // 客户从 42 号格走到 45（库存换成 42 号 ElastiCache 以后多一格）
  for (let k = 0; k < 8; k++) ping(R1 + 3.5 + k * 0.06, 0.05, 0.3); for (let k = 0; k < 4; k++) ping(R1 + 4.1 + k * 0.08, 0.04, -0.3);
  tone(R1 + 5.0, 0.6, 330, { f1: 990, amp: 0.05, type: 'saw', lp: 0.06, a: 0.1, r: 0.2 }); shimmer(R1 + 5.5); for (let k = 0; k < 16; k++) ping(R1 + 6.2 + k * 0.06, 0.06, (k % 3 - 1) * 0.4); alarm(R1 + 6.5);
  // 15 学习模式：3 个题库盒子
  whoosh(Q0 - 0.1); for (let n = 0; n < 3; n++) { const t0 = Q0 + 0.1 + n * 0.18; thunk(t0 + 0.18, 0.17); thunk(t0 + 0.55, 0.07); } chime(Q0 + 1.0);
  whoosh(W0 - 0.1); for (let n = 0; n < 4; n++) { const t0 = W0 + 0.1 + n * 0.18; thunk(t0 + 0.18, 0.15); thunk(t0 + 0.55, 0.06); } chime(W0 + 1.3);   // 16 怎么赢
  // 片尾（promo_full.js 11/05 复核：片尾提前 1.0 t 接上，大标题 OUT0 + 1.2 起淡入、OUT0 + 2.1 落定）：
  //   节拍停在小节线 G1 上，那一拍落一个 C 和弦重音；撞击和铃对在 G1 后第 2 拍（大标题落定那一下，仍在拍子上）；
  //   长和弦拆成 C → F → G → C（4、4、2 拍，最后的 C 一直响到黑场），上面每拍垫一声很轻的铃，原来 9 秒只有一个不动的和弦
  const EG0 = OUT0 + 8.8, OCH = [[48, 60, 64, 67, 71, 74], [41, 57, 60, 65, 69, 72], [43, 59, 62, 67, 71, 74], [48, 60, 64, 67, 72, 76]], OB = [0, 4, 8, 10];
  whoosh(G1 - 0.55, 0.9, 0.12);
  [48, 55, 60, 64, 67, 72].forEach((m, k) => tone(G1, 1.4, mtof(m), { type: 'saw', amp: 0.03, lp: 0.1, a: 0.008, r: 0.6, decay: 0.9, pan: k % 2 ? 0.3 : -0.3 }));
  const opad = (t0, dur, notes, amp) => notes.forEach((m, j) => [-0.06, 0.06].forEach(dt => tone(t0, dur, mtof(m + dt), { type: 'saw', amp, a: 0.45, r: 0.9, pan: dt * 5 * (j % 2 ? 1 : -1), lp: 0.03 })));   // 和 pad 一样的音色，起音快一点（2 拍的和弦也能长满）
  OCH.forEach((ch, k) => { const t0 = G1 + OB[k] * BEAT, t1 = k < 3 ? G1 + OB[k + 1] * BEAT + 0.6 : EG0 + 0.3; opad(t0, t1 - t0, ch, k === 0 || k === 3 ? 0.05 : 0.042); });
  impact(G1 + 2 * BEAT, 0.4); chime(G1 + 2 * BEAT + 0.2);
  for (let b = 4; G1 + b * BEAT < EG0 - 0.8; b++) { const k = OB.findLastIndex(x => b >= x); bell(G1 + b * BEAT, OCH[k][2 + (b % 4)] + 12, 0.02); }
  // 片尾彩蛋：隐藏 BOSS「作者韩叔」（时间点和 promo_full.js 的 egg() 一致）
  const e = d => EG0 + d + (d >= 1.2 ? 1.25 : 0);   // 黑屏分两页（11/05 复核：两页各多停 0.4），1.2 秒以后的音效整体往后挪 1.25 秒（= promo_full.js egg() 的 ES）
  bell(EG0 + 1.47, 72, 0.045); bell(EG0 + 1.55, 79, 0.035);   // 第二页「讨伐韩叔，还差最后一关」（e0 1.45 起）
  tone(e(0.4), 0.16, 880, { amp: 0.06, decay: 0.08 }); tone(e(0.57), 0.22, 659, { amp: 0.06, decay: 0.1 }); bell(e(0.75), 76, 0.04);        // 「等等……还没完」
  noise(e(1.55), 0.25, { amp: 0.4, hp: true, lp0: 0.5, decay: 0.06 }); noise(e(1.57), 1.6, { amp: 0.26, lp0: 0.03, lp1: 0.008, decay: 0.7 });   // 闪电劈在空地上
  noise(e(1.73), 0.18, { amp: 0.25, hp: true, lp0: 0.5, decay: 0.05 });
  for (let k = 0; k < 24; k++) ping(e(2.15) + k * 0.03 + rnd() * 0.2, 0.04, rnd() - 0.5);                          // 钱往中间飞
  riser(e(1.9), 0.6); shimmer(e(2.5));                                                                               // 王座长出来
  tone(e(2.5), 0.35, 1400, { f1: 300, amp: 0.05, type: 'square', lp: 0.15, a: 0.01, r: 0.05 });                      // 韩叔从天而降
  thunk(e(2.85), 0.32); impact(e(2.85), 0.5);
  [48, 51, 55, 60, 63].forEach((m, k) => tone(e(2.95), 1.4, mtof(m), { type: 'saw', amp: 0.042, lp: 0.07, a: 0.01, r: 0.6, decay: 0.9, pan: (k % 2 ? 0.25 : -0.25) }));   // BOSS 登场
  [3.25, 3.7, 4.15].forEach((d, k) => { for (let n = 0; n < 8; n++) ping(e(d - 0.42) + n * 0.04, 0.035, (n % 3 - 1) * 0.4); thunk(e(d), 0.26 + k * 0.04); impact(e(d), 0.3 + k * 0.06); });   // 喂一波钱，大一圈
  pad(e(1.3), 4.4, [48, 55, 60, 63], 0.04, 0.03);
  whoosh(e(4.5), 0.45, 0.08); chime(e(4.98)); shimmer(e(5.0));                                                        // 王冠落下
  for (let k = 0; k < 14; k++) blip(e(4.8) + k * 0.06, 60 + k * 2, 0.05);                                            // 血条加满
  whoosh(e(5.3), 0.5, 0.09);                                                                                         // BOSS 卡
  pad(e(5.6), 5.2, [48, 60, 64, 67, 72], 0.04, 0.03); [72, 76, 79, 84].forEach((m, k) => bell(e(5.6) + k * 0.09, m, 0.06));   // 其实是作者
  [0, 0.25, 0.5, 0.75, 1.0, 1.25].forEach(d => { for (let k = 0; k < 4; k++) ping(e(6.3 + d * 0.6) + k * 0.05, 0.04, (k % 2 ? 0.3 : -0.3)); });   // 过路费都飞向他
  tone(e(7.42), 0.3, 500, { f1: 1300, amp: 0.05, a: 0.02, r: 0.08 }); ping(e(7.95), 0.09); shimmer(e(8.0));           // 拉下墨镜、眨眼

  // ---------- 序章（短剧版）：单独合成，最后拼到 O0 秒处（时间点和 promo_open.js 一致） ----------
  // 前半段大片感（紧张的弦乐颤音 → 光柱和声 → 撞击），「三年后」一声锣，黑化段滑稽小调，挑战者登场换回正片的节拍和音色
  // 11/05 序章拉长（字幕、名牌停得太短）：主体 25.2 → 34.8775 秒，开头「风平浪静」3.2 → 7.683 → 6.083 秒（第二轮把太拖的定格压回去，原来 38.43 / 7.92；第三轮风平浪静嫌长，再短 1.6）。MM 和 promo_open.js 的 MAP_MAIN 是同一张表（[旧时刻, 新时刻]），
  // mm(旧时刻) = 新时刻。音效只挪起点、声音本身不拉长；铺底的长音按新段落延长；循环（颤音 0.07、滑稽贝斯 0.42、挑战者节拍 0.56）间隔不变、多续几下
  const O0 = 0.8, CUT = 5.4 + 0.5, OPR = 6.083; let OPENL = 34.8775; const mainL = L, mainR = R;
  const MM = [[0, 0], [1.9, 1.9], [3, 3.165], [3.18, 3.345], [3.9, 4.497], [4.8, 6.297], [5, 6.497], [5.36, 6.857], [5.9, 8.693], [7, 9.793], [9.1, 11.893], [9.3, 12.393], [9.6, 12.843],
    [10.3, 13.753], [10.65, 14.278], [10.98, 15.433], [11.72, 16.173], [12.4, 17.737], [13.3, 19.627], [13.46, 19.787], [13.95, 20.4975], [15.66, 22.2075], [15.66, 22.8075], [17.15, 24.8935],
    [17.2, 25.2435], [17.2, 26.1935], [18.16, 27.1535], [19.3, 28.9775], [21.8, 31.4775], [25.2, 34.8775]];
  const mm = (x, late = true) => { if (x <= 0) return x; const ks = MM.map((_, k) => k).slice(1); if (late) ks.reverse();   // late：正好落在定格点上时取定格之后
    for (const k of ks) { const a = MM[k - 1], b = MM[k]; if (x >= a[0] && x <= b[0]) return b[0] > a[0] ? a[1] + (x - a[0]) * (b[1] - a[1]) / (b[0] - a[0]) : (late ? b[1] : a[1]); }
    return MM[MM.length - 1][1] + x - MM[MM.length - 1][0]; };
  const nmC = mm(14.5), nmY = nmC + 2.2, nmD = mm(18.0);   // 三块名牌的新时刻（虫虫那块停 2.2、Yuki 停 1.95，见 promo_open.js）
  const B1 = mm(11.0) + 1.3, c6n = mm(17.15, false) + 0.3, tL = mm(17.75);   // 台词气泡①、「又一颗流星？！」、Damo 落地（和 promo_open.js 一样算）
  L = new Float32Array(Math.ceil(OPENL * SR) + SR); R = new Float32Array(L.length);
  const gong = (t, amp = 0.12) => [1, 1.48, 2.03, 2.71, 3.6].forEach((h, k) => tone(t, 3.2, 110 * h, { amp: amp / (k + 1), a: 0.004, r: 1.5, decay: 1.4 - k * 0.2, pan: (k % 2 ? 0.2 : -0.2) }));
  const trem = (t0, dur, notes, amp, s0 = 0.6) => { for (let t = t0; t < t0 + dur; t += 0.07) notes.forEach((m, k) => tone(t, 0.08, mtof(m), { type: 'saw', amp: amp * (s0 + (1 - s0) * (t - t0) / dur), lp: 0.08, a: 0.005, r: 0.03, pan: k % 2 ? 0.3 : -0.3 })); };   // s0：起步音量（相对）
  // ① 天外流星：紧张的弦乐颤音一路往上，流星呼啸，棋盘抖
  impact(0.0, 0.7); noise(0.0, 0.5, { amp: 0.22, lp0: 0.05, lp1: 0.5, a: 0.02, r: 0.3 }); tone(0.0, 0.5, 900, { f1: 200, type: 'saw', amp: 0.05, lp: 0.12, a: 0.01, r: 0.2 });   // 转折：流星雨猛地砸下来
  // 11/05 复核：「天外流星坠落 / 危在旦夕」这段原来是序章最空的一段（第一颗砸下去以后掉到 −29 dB，比风平浪静还轻 10 dB）：第一段颤音起步更响、
  //   底下垫两条很低的长音（A），「棋盘在抖」的低频噪声提前到 0.3 起、更响一点，光柱升起的 riser 到顶时落一下轻的撞击
  trem(0.3, mm(2.6) - 0.3, [57, 64], 0.027, 0.7); trem(mm(2.6), mm(3.5) - mm(2.6), [60, 67], 0.022); trem(mm(3.5), mm(4.9) - mm(3.5), [62, 69], 0.018);   // 三段起止跟着画面走，颤音还是每 0.07 一下
  //   （11/05 验收：上一轮插入下面这行时把第三段颤音 trem(mm(3.5)…) 误挤进了行尾注释，甩书 → 法阵 → 名牌这段往上推的颤音没了，这里补回）
  [[33, 0.036], [45, 0.024]].forEach(([m, a]) => tone(0.3, mm(2.6) - 0.3 + 0.35, mtof(m), { type: 'saw', amp: a, lp: 0.035, a: 1.2, r: 0.45 }));   // 起音拉长到 1.2：越来越响，一路往上推
  { const HIT = mm(5.0); noise(0.5, HIT - 0.5, { amp: 0.12, lp0: 0.01, lp1: 0.4, a: 3.8 * (HIT - 0.5) / 4.5, r: 0.3 }); }   // 流星越来越近的呼啸：收在撞上法阵那一帧
  noise(0.3, mm(3.2) - 0.3, { amp: 0.11, lp0: 0.02, lp1: 0.03, a: 1.6, r: 0.5 });                           // 棋盘在抖（原来 1.2 才开始、0.08）
  riser(mm(2.1), mm(2.6) - mm(2.1)); impact(mm(2.6), 0.28); pad(mm(2.4), mm(5.2) - mm(2.4), [60, 64, 67, 72, 76], 0.04, 0.04); whoosh(mm(3.05), 0.8, 0.1); noise(mm(3.45), 0.3, { amp: 0.08, lp0: 0.3, decay: 0.08 }); shimmer(mm(3.55)); chime(mm(3.6));   // 光柱升起、甩书（书飞得慢了，呼的一声长一点）、书页散开成阵、法阵撑开
  impact(mm(3.9), 0.45); noise(mm(3.9) - 0.14, 0.18, { amp: 0.1, lp0: 0.02, lp1: 0.5, a: 0.16, r: 0.01 });     // 定格名牌
  impact(mm(5.0), 0.8); thunk(mm(5.0), 0.3); noise(mm(5.0), 1.2, { amp: 0.22, hp: true, lp0: 0.3, decay: 0.35 }); shimmer(mm(5.1));   // 撞上法阵
  for (let k = 0; k < 40; k++) ping(mm(5.2) + rnd() * 1.6, 0.045, rnd() - 0.5);                            // 漫天金币（金币按真实时间飞，闪光跟着金币，不拉长）
  for (let k = 0; k < 12; k++) ping(mm(5.2) + 1.0 + rnd() * 1.5, 0.03, rnd() - 0.5);                        // 欢呼变长了：后面再撒几声稀一点、轻一点的
  pad(mm(5.2), mm(9.6) - mm(5.2), [60, 64, 67, 72], 0.045, 0.035); [72, 76, 79, 84].forEach((m, k) => bell(mm(5.4) + 0.2 + k * 0.12, m, 0.06));   // 拯救了云上世界（字幕出来以后 0.2）
  for (let k = 0; k < 6; k++) noise(mm(6.9) + k * 0.32, 0.12, { amp: 0.05, lp0: 0.2, lp1: 0.5, a: 0.02, r: 0.06 });   // 一页页翻
  for (let k = 0; k < 16; k++) bell(mm(7.0) + k * 0.13, [72, 74, 76, 79, 81, 84, 86, 88][k % 8], 0.035);     // 格子一圈圈亮起来
  // ③ 三年后：一声锣，黑化段滑稽小调
  const CH0 = OPENL - 28 * BEAT;   // 挑战者登场换回正片节拍的起点：从序章结尾倒推 28 拍（22.75），一拳那一刻、接正片时的拍子和原来一样
  gong(mm(9.62), 0.1);
  for (let b = 0; mm(10.4) + b * 0.42 < mm(12.4) - 0.15; b++) { const t = mm(10.4) + b * 0.42, m = [45, 48, 52, 48][b % 4]; tone(t, 0.3, mtof(m), { type: 'saw', amp: 0.05, lp: 0.07, a: 0.01, r: 0.1, decay: 0.25 }); if (b % 2) hat(t + 0.21, 0.03); }   // 滑稽小调按原速续写，到「孤零零」停（那一段只留四声铃，挑战者登场时节拍再进来）
  noise(mm(10.6), 0.3, { amp: 0.08, lp0: 0.05, lp1: 0.5, a: 0.02, r: 0.2 });                                // 黑化的紫气
  [55, 54, 53, 51].forEach((m, k) => tone(mm(10.98) - 0.08 + k * 0.16, 0.2, mtof(m), { type: 'saw', amp: 0.05, lp: 0.08, a: 0.01, r: 0.08 }));   // 「哇哇哇」：跟着墨镜金链一起落，最后一声收在闪电前
  for (let k = 0; k < 30; k++) ping(mm(10.3) + 0.2 + rnd() * (mm(12.4) - mm(10.3) - 0.4), 0.03, rnd() - 0.5);   // 金币山（天上一直在落金币；孤零零那一段不再有）
  noise(mm(11.4), 0.25, { amp: 0.35, hp: true, lp0: 0.5, decay: 0.06 }); noise(mm(11.42), 1.3, { amp: 0.2, lp0: 0.03, lp1: 0.008, decay: 0.6 }); noise(mm(11.58), 0.15, { amp: 0.2, hp: true, lp0: 0.5, decay: 0.05 });   // 闪电劈在空地上
  blip(B1 + 0.05, 76, 0.06); blip(B1 + 0.13, 81, 0.05);                                                   // 对话气泡①（「黑化了」先读 1.3 秒再弹出）
  [72, 69, 67, 64].forEach((m, k) => bell(mm(12.55) - 0.05 + k * 0.5, m, 0.04)); blip(mm(13.45), 76, 0.06); blip(mm(13.45) + 0.08, 81, 0.05);   // 没人陪他玩（只剩这四声铃，放慢成 0.5 一声）；抬头发出挑战
  // ④ 挑战者登场：换回正片的节拍和音色（和弦序号 +3：倒推出来多的第一句是 F，后面和原来一样 C – G – Am）
  const CHS = CH0 + 2 * BEAT;   // 节拍从第 3 拍（镜头开始往挑战者俯冲、气泡②还在）进来：前两拍落在「孤零零」里，空着
  for (let c = 0; CH0 + c * 4.48 < OPENL; c++) { const t = Math.max(CHS, CH0 + c * 4.48); pad(t, CH0 + c * 4.48 + 4.9 - t, CH[(c + 3) % 4], 0.04, 0.035); }
  for (let b = 2; CH0 + b * BEAT < OPENL - 0.2; b++) {
    const t = CH0 + b * BEAT, ch = (Math.floor(b / 8) + 3) % 4;
    if (b % 2) kick(t, 0.2); hat(t + BEAT / 2, 0.035);
    bell(t, CH[ch][ARP[b % 8]] + 12, 0.04); bell(t + BEAT / 2, CH[ch][ARP[(b * 2 + 1) % 8]] + 12, 0.028);
    if (b % 2 === 0) bass(t, ROOTS[ch], 0.3, 0.12);
    if (t >= mm(19.5) && b % 2 === 0) CH[ch].forEach((m, k) => tone(t, 0.3, mtof(m), { type: 'saw', amp: 0.024, lp: 0.12, a: 0.005, r: 0.12, pan: k % 2 ? 0.3 : -0.3 }));   // 大标题之后加铜管
  }
  for (let k = 0; k < 6; k++) blip(mm(14.05) + k * 0.15, 67 + (k % 2) * 5, 0.04);                           // 虫虫走进来
  // 11/11（fixC）：Yuki 晚到（promo_open.js 的 YA = YL − 0.32 起跑、yu 0.66 起跳、YL = nmY − 0.02 落地，约 T 37.38 才从画面下沿冒头）：脚步跟着挪到 YA 起，冲刺步子快一倍（0.07 一步），4 步，最后一步落在起跳那一下；落地那一下有名牌的 impact(nmY)
  { const YL = nmY - 0.02, YA = YL - 0.32; for (let k = 0; k < 4; k++) blip(YA + 0.01 + k * 0.07, 69 + (k % 2) * 5, 0.035); }   // Yuki 跟着跑进来
  [nmC, nmY, nmD].forEach(t => { impact(t, 0.3); noise(t - 0.12, 0.12, { amp: 0.08, lp0: 0.02, lp1: 0.5, a: 0.1, r: 0.01 }); });   // 名牌
  chime(mm(15.9));
  tone(c6n, tL - c6n, 1600, { f1: 300, amp: 0.05, type: 'square', lp: 0.15, a: 0.01, r: 0.05 }); noise(c6n + 0.05, tL - c6n - 0.05, { amp: 0.1, lp0: 0.008, lp1: 0.4, a: tL - c6n - 0.15, r: 0.05 });   // 又一颗流星：坠落哨和字幕一起出来，呼啸跟着火球从天边一路压到落地
  impact(mm(17.75), 0.6); thunk(mm(17.75), 0.32); for (let k = 0; k < 14; k++) noise(mm(17.75) + 0.03 + rnd() * 0.3, 0.03, { amp: 0.1, lp0: 0.5, decay: 0.01, pan: rnd() - 0.5 });   // 是 Damo
  thunk(mm(18.1) + 0.1, 0.14);                                                                              // 换「指挥带队」立牌
  impact(mm(19.5), 0.6); chime(mm(19.5) + 0.05); shimmer(mm(19.5) + 0.1); [60, 64, 67, 72, 76].forEach((m, k) => tone(mm(19.5), 1.2, mtof(m), { type: 'saw', amp: 0.035, lp: 0.1, a: 0.01, r: 0.5, decay: 0.8, pan: k % 2 ? 0.3 : -0.3 }));   // 大标题
  const SHT = OPENL - 1.1;   // 一拳打碎大骰子的时刻（骰子从这里飞出去，正片接着滚）
  chime(mm(21.2)); for (let k = 0; k < 6; k++) blip(mm(21.95) + k * 0.17, 64 + (k % 2) * 3, 0.035);          // Damo 举拳、走过去
  noise(mm(21.8), 0.05, { amp: 0.06, lp0: 0.3, decay: 0.02 }); [mm(22.14), mm(22.42)].forEach((t, k) => thunk(t, 0.22 - k * 0.08));   // 大骰子掉下来：对在画面上两次着地（21.8 起落、22.14 / 22.42 着地；原来 22.32 / 22.56 落在弹起的半空）
  whoosh(SHT - 0.37, 0.4, 0.08); noise(SHT, 0.12, { amp: 0.32, lp0: 0.35, decay: 0.03 }); thunk(SHT, 0.32); impact(SHT, 0.55);   // 一拳
  for (let k = 0; k < 12; k++) noise(SHT + 0.02 + rnd() * 0.25, 0.03, { amp: 0.1, lp0: 0.5, decay: 0.01, pan: rnd() - 0.5 });
  noise(SHT + 0.3, 0.6, { amp: 0.08, lp0: 0.05, lp1: 0.4, a: 0.05, r: 0.4 }); [0, 1, 2, 3].forEach(k => blip(SHT + 0.5 + k * 0.05, 79 + k * 2, 0.035));   // 「噗」一团白烟，四颗棋子冒出来
  // 序章最前面「云上世界风平浪静」（OPR = 6.083 秒，原来 3.2，上一版 7.683）：轻轻的和弦 + 铃声，铃声还是每 0.32 一声（对着 EC2 跳绳、Bedrock 蹦床、抛球），后面整段往后挪
  // 第三轮整段提前 1.6（= 5 声铃）：铃声、滑梯、「直到那一天」都是上一版 − 1.6，还在画面那几样循环的同一个网格上；1.28 一小节的小节线落在 1.56 / 2.84 / 4.12，前面三声当弱起
  { const PR = OPR, oL = L, oR = R, n0 = Math.round(PR * SR);
    L = new Float32Array(Math.ceil((OPENL + PR) * SR) + SR); R = new Float32Array(L.length);
    // 第一个和弦从 0 起、起音 0.3（原来 0.1 起、起音 1.0）：和封面淡出的那条和弦叠上，接口处不留静音
    [60, 64, 67, 72, 76].forEach((m, j) => [-0.06, 0.06].forEach(dt => tone(0, 3.4, mtof(m + dt), { type: 'saw', amp: 0.04, a: 0.3, r: 1.4, pan: dt * 5 * (j % 2 ? 1 : -1), lp: 0.03 })));
    pad(2.05, 2.75, [57, 60, 64, 67, 72], 0.04, 0.03); shimmer(0.3);   // C → Am7 两个和弦接起来铺满（Am7 在切 S3a 那一刀前一点进来，收在「直到那一天」后 0.1，和上一版一样）
    [81, 79, 76, 72, 76, 79, 81, 76, 79, 84, 88, 91].forEach((m, k) => bell(0.6 + k * 0.32, m, 0.035));   // 12 声（0.6–4.12）：三声弱起 + 一小节 + 原来那一句（最后 5 声）
    whoosh(1.15, 0.25, 0.035); whoosh(2.05, 0.25, 0.035);                                                  // 云朵擦过镜头（1.3 / 2.2 切镜头），很轻
    whoosh(3.74, 0.8, 0.06); tone(3.79, 0.7, 1800, { f1: 700, amp: 0.025, a: 0.05, r: 0.3 });              // S3 滑梯
    tone(4.7, PR - 4.7, mtof(40), { type: 'saw', amp: 0.04, lp: 0.05, a: 0.3, r: 0.3 }); noise(4.76, PR - 4.76 - 1e-9, { amp: 0.12, lp0: 0.01, lp1: 0.45, a: PR - 4.76 - 0.11, r: 0.02 });   // 「直到那一天——」：一声低音 + 倒吸气似的呼啸，收在第一颗砸下去那一帧（PR）。
    // 呼啸的长度减 1e-9：上一版 7.683 − 6.36 的浮点结果取整是 63503 个样本，6.083 − 4.76 会多取一个，后面道具音效的随机噪声就整串错开一位；减一点点，样本数和随机序列和上一版一样
    for (let i = 0; i < oL.length && n0 + i < L.length; i++) { L[n0 + i] += oL[i]; R[n0 + i] += oR[i]; }
    OPENL += PR; }
  // 拼接：封面 → 序章 → 正片从 promo.js 的 10.7 秒（full 时间 5.9 秒）接上
  //   11/05 复核：封面跟着画面（cvfade 0.3 t）慢慢淡出、再往序章里多叠 0.15（原来满音量响到最后 20 毫秒硬切成静音，序章再从零淡入）；
  //   序章接正片改成接口前 40 毫秒的等功率交叉淡化（原来两边各自淡到 0，接口处有一个约 15 毫秒、掉 20 dB 的小坑）；正片的网格第 4 拍正好落在接口上
  const opL = L, opR = R, n0 = Math.round(O0 * SR), nO = Math.round(OPENL * SR), nC = Math.round(CUT * SR), fd = Math.round(0.02 * SR);
  const XF = Math.round(0.04 * SR), nCF = Math.round(0.3 * SR), nCX = Math.round(0.15 * SR);
  DUR = DUR + OPENL - (CUT - O0);
  L = new Float32Array(Math.ceil(DUR * SR) + SR); R = new Float32Array(L.length);
  for (let i = 0; i < nO; i++) { const f = Math.min(1, i / fd) * (i >= nO - XF ? Math.cos(Math.PI / 2 * (i - (nO - XF)) / XF) : 1); L[n0 + i] = opL[i] * f; R[n0 + i] = opR[i] * f; }
  for (let i = nC - XF, j = n0 + nO - XF; i < mainL.length && j < L.length; i++, j++) { const f = i < nC ? Math.sin(Math.PI / 2 * (i - (nC - XF)) / XF) : 1; L[j] += mainL[i] * f; R[j] += mainR[i] * f; }
  for (let i = 0; i < n0 + nCX; i++) { const f = i < n0 - nCF ? 1 : Math.cos(Math.PI / 2 * Math.min(1, (i - (n0 - nCF)) / (nCF + nCX))); L[i] += mainL[i] * f; R[i] += mainR[i] * f; }

  // ---------- 设定图道具 / 表情头像的音效：拼好以后直接按 full 脚本时间叠上去（画面秒 = 这里的秒 / 0.8；时间点和 promo_open.js、promo_full.js 一致） ----------
  // 都比主音效轻：头像弹出一声轻「啵」、名牌徽章一点闪光、墨镜金链「叮铃」、紫火低沉的「呼」、火球呼啸、变棋子「噗」+ 小铃。
  // 和撞击、闪电、一拳、大标题、铃声挤在同一刻的不加：序章的「坏笑」（对话气泡已经有两声）、「加油」（叮的那三声）、「惊讶」（火球）、大标题四周的头像，
  // 彩蛋的暗影小弟（血条那串声里）、BOSS 卡的头像和王冠（「其实是作者」那串铃）。放在最后：前面的音效一个样本都不变
  // 正片、彩蛋的这几声按拼接前的样本位置算（SHF0 = 原来序章 28.4 秒时的写法，再整体平移 nSh 个样本），和原来逐样本一样，不会因为浮点取整前后差一个样本
  { const SHF = OPENL - (CUT - O0), SHF0 = (25.2 + 3.2) - (CUT - O0), nSh = Math.round(OPENL * SR) - Math.round((25.2 + 3.2) * SR), at0 = t => (Math.floor(t * SR) + nSh + 0.5) / SR;
    const OP = o => O0 + OPR + o, MN = b => at0(b + SHF0), EGT = d => at0(EG0 + 1.25 + d + SHF0);   // 序章 runMain 的 o、正片（拼接前）的时间、彩蛋的 e → 拼好以后的时间
    let s2 = 11; const r2 = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
    const syn = (t0, dur, f, pan = 0) => { const i0 = Math.floor(t0 * SR), n = Math.floor(dur * SR); for (let k = 0; k < n; k++) { const x = k / SR, u = k / n; put(i0 + k, f(x, u), typeof pan === 'function' ? pan(u) : pan); } };
    // 头像弹出：轻轻一声「啵」（正弦往上一滑就收掉，前面带一点点咔）
    const boop = (t, f0 = 520, amp = 0.05, pan = 0) => { tone(t, 0.075, f0, { f1: f0 * 2.3, amp, a: 0.002, r: 0.03, decay: 0.03, pan }); tone(t, 0.018, f0 * 3.2, { amp: amp * 0.22, a: 0.001, r: 0.01, pan }); };
    // 名牌徽章：很轻的闪光（两个很高的音 + 一点气声）
    const glint = (t, pan = 0, amp = 0.018) => { tone(t, 0.3, 2637, { amp, a: 0.002, r: 0.12, decay: 0.07, pan }); tone(t + 0.05, 0.36, 3951, { amp: amp * 0.7, a: 0.002, r: 0.14, decay: 0.08, pan: -pan * 0.5 }); noise(t, 0.1, { amp: amp * 0.5, hp: true, lp0: 0.6, decay: 0.025, pan }); };
    // 金属「叮」：几个不成整数倍的泛音（小金属片）；太高的泛音不要
    const metal = (t, f, amp, dec = 0.15, pan = 0) => [[1, 1], [2.76, 0.45], [5.4, 0.22], [8.93, 0.1]].forEach(([h, g]) => { if (f * h < 16000) tone(t, dec * 4, f * h, { amp: amp * g, a: 0.001, r: dec, decay: dec / Math.sqrt(h), pan }); });
    // 低沉的「呼」：两级低通的噪声鼓起来再散掉，带火苗似的抖动，底下垫一点很低的正弦
    const whump = (t0, dur, amp, pan = 0) => { let y1 = 0, y2 = 0; syn(t0, dur, (x, u) => { const c = 0.03 + 0.07 * Math.sin(Math.PI * Math.min(1, u * 1.3)); y1 += c * (r2() * 2 - 1 - y1); y2 += c * (y1 - y2);
        return y2 * amp * 5 * Math.min(1, x / 0.22) * Math.pow(1 - u, 1.6) * (1 + 0.3 * Math.sin(2 * Math.PI * (7 * x + 0.4 * Math.sin(2 * Math.PI * 2.3 * x)))); }, pan);
      tone(t0, dur * 0.8, 62, { f1: 84, amp: amp * 0.3, a: 0.15, r: dur * 0.4 }); };
    // 火球呼啸：带通的噪声越来越近（火苗一样快速抖动）+ 噼啪的火星，声像跟着火球从画面中间偏右往左一点落
    const roar = (t0, dur, amp, p0, p1) => { let a1 = 0, a2 = 0; syn(t0, dur, (x, u) => { const w = r2() * 2 - 1; a1 += 0.35 * (w - a1); a2 += 0.04 * (w - a2);
        return (a1 - a2) * amp * Math.pow(Math.min(1, u / 0.85), 1.8) * Math.min(1, (1 - u) / 0.06) * (0.65 + 0.35 * Math.sin(2 * Math.PI * (31 * x + 0.5 * Math.sin(2 * Math.PI * 4.7 * x)))); }, u => p0 + (p1 - p0) * u);
      for (let k = 0; k < 16; k++) { const u = Math.pow(r2(), 0.6); noise(t0 + u * dur * 0.95, 0.006, { amp: 0.05 * (0.5 + 0.8 * u), lp0: 0.7, decay: 0.0015, pan: p0 + (p1 - p0) * u }); } };
    // 变棋子：「噗」一团烟（低一点的噪声一下炸开 + 往下掉的闷音）
    const puffS = (t, amp) => { noise(t, 0.18, { amp, lp0: 0.2, lp1: 0.03, a: 0.004, r: 0.1, decay: 0.05 }); tone(t, 0.12, 230, { f1: 85, amp: amp * 0.6, a: 0.002, r: 0.05, decay: 0.04 }); };
    // 序章（o 是新的 runMain 时刻：头像、名牌按 promo_open.js 的新时间表，别的跟着 mm() 平移；时长、个数都不变，r2 的随机序列和原来一样，彩蛋那声紫火不变）
    boop(OP(mm(2.8) + 0.09), 560, 0.05, -0.3);                                                                  // 「他把规则书一甩」：字幕左边弹出「得意」头像
    glint(OP(mm(3.9) + 0.16), -0.4);                                                                            // 韩叔名牌：王冠徽章
    boop(OP(mm(10.53) + 0.07), 520, 0.045, -0.3);                                                                // 金币堆成了山：「大笑」头像
    metal(OP(mm(10.99)), 2350, 0.03, 0.2, -0.15);                                                         // 墨镜从天上落下来，一亮「叮」
    for (let k = 0; k < 8; k++) { const u = k / 7; metal(OP(mm(11.03) + 0.31 * Math.pow(u, 0.7)), 2900 + r2() * 1400, 0.012 + 0.006 * u, 0.05, 0.1 + r2() * 0.25); }   // 金链子一路落一路「铃铃」响，越落越快（11.38 落到身上时闪电正好劈下来，落地那一下不另加）
    whump(OP(mm(11.5)), 0.95, 0.1);                                                                       // 王座周围的紫火燃起来：低沉的「呼」
    boop(OP(mm(12.62) + 0.01), 440, 0.035, -0.3);                                                                // 没人陪他玩：「温柔微笑」头像，轻一点、低一点（那颗红棋子是在画面外弹出来的，镜头拉远才滑进画面，不配声）
    glint(OP(nmC + 0.16), -0.4); glint(OP(nmY + 0.16), -0.4);                                                   // 虫虫、Yuki 名牌的徽章
    roar(OP(tL - 0.53), 0.54, 0.3, 0.15, -0.1);                                                           // Damo 的火球最后那一冲（17.75 落地是原来的撞击；时长不变，r2 的随机序列不变）
    glint(OP(nmD + 0.16), -0.4); boop(OP(mm(18.3) + 0.01), 820, 0.055, 0.3);                                         // Damo 名牌的徽章；字幕右边「热血」头像
    boop(OP(mm(18.55) + 0.01), 400, 0.055, 0.2); boop(OP(mm(18.55) + 0.07), 340, 0.045, 0.2);                               // 王座上的韩叔被挑衅：「生气」头像抖两下
    puffS(OP(mm(24.4)), 0.1); bell(OP(mm(24.49)), 93, 0.026); bell(OP(mm(24.55)), 98, 0.022);                     // 「噗」地变成棋子，烟里闪出道具棋子：两声小铃（后面原来的四声是棋子落到格子上）
    // 11/11（fixB，promo_open.js 的 OPA / POPT；视频秒 T 换成这里的 o：0.8T − 6.883）：光盾挡住以后韩叔收盾，T 17.6 细光打到穹顶最高点、一口气碎开——
    //   「拯救」那四声铃（T 17.595–18.045）正好落在碎开那 0.5 秒上，这里只垫一串很轻、很高的碎光声（往两边散开）（11/11 shfade 换成下面柔和的一声）；卡通们随后一个个从云里弹出来，每个一声很轻的「啵」
    //   （光点落下那一刻，近的先；左边的偏左、右边的偏右，越往外音高一点点）。只用 tone，不动 rnd / r2 的随机序列，别的音效一个样本都不变
    const TV = T => OP(0.8 * T - (O0 + OPR));
    // 11/11（shfade）：光盾不碎了，改成韩叔收盾时整面柔和地淡掉（promo_open.js 的 SHF，T 17.42–18.45）——原来那串碎光声（六个很高、起音很脆的音 C7–C8，听着像玻璃碎）换成柔和的一声：
    //   shimmer 那几个音（C6、E6、G6）放慢起音（0.22，画面上约 0.27 秒）、一个个慢慢鼓起来再慢慢散掉，像光晕化开（T 17.45 起，约 T 18.64 散完）；同样只用 tone
    // 11/11（shfade/refine，评审：「三个 shimmer 音完全被『拯救』那四声铃盖住，光盾淡出实际上没有一声自己的声音」）：铃是 C5/E5/G5/C6、泛音高一个八度，
    //   原来的 C6/E6/G6 正好叠在泛音上——换成同一个调里铃没有的 A5、D6、A6（五声音阶，和铺底的 C 大三和弦不打架），响一点（0.011 → 0.02），还是慢起音；
    //   第一个音约 T 17.72 鼓到最响，正对光环推到罩边、光盾整面轻轻亮一下那一刻
    [[81, 0, -0.3], [86, 0.06, 0.3], [93, 0.12, 0]].forEach(([m, d, pn], k) => tone(TV(17.45) + d, 0.95 - d, mtof(m), { amp: 0.02 - k * 0.003, a: 0.22, r: 0.55, pan: pn }));
    // 11/11（refine）：光点落下晚 0.08（promo_open.js 的 POPT），「啵」跟着挪
    [[18.22, -1, 0], [18.26, 1, 0], [18.33, -1, 1], [18.37, 1, 1], [18.44, -1, 2], [18.48, 1, 2], [18.55, -1, 3], [18.59, 1, 3], [18.66, -1, 4], [18.70, 1, 4]].forEach(([T, sd, r]) => boop(TV(T), 600 + r * 45 + (sd > 0 ? 20 : 0), 0.026, 0.35 * sd));
    // 正片：棋子上方的反应头像、几张道具贴纸
    boop(MN(m(22.12)), 560, 0.055);                                                                   // 过路费落到韩叔这边：「大笑」
    boop(MN(m(30.6)), 640, 0.04, -0.25);                                                              // WA 卡角上冒出 Yuki 的小伙伴
    boop(MN(at(1, 0.43)), 480, 0.05);                                                                 // 入门局运行费：韩叔「思考」
    boop(MN(at(3, 1.76)), 560, 0.045);                                                                // 完整局交易：虫虫「调皮」
    boop(MN(at(4, 0.27)), 600, 0.04);                                                                 // 学习模式答题框贴上虫虫的地图卷轴
    boop(MN(S7 + 41.03), 420, 0.045);                                                                 // 专属技能：韩叔第一个掏订阅费，「惊讶」
    boop(MN(R1 + 0.71), 620, 0.04, 0.2);                                                              // 代理商折扣进货：背包贴纸
    // 片尾彩蛋
    boop(at0(EG0 + SHF0 + 1.59), 380, 0.035);                                                               // 第二页（头像 e0 1.55 起）：韩叔「阴险坏笑」
    boop(EGT(1.68), 520, 0.04, -0.2); boop(EGT(1.79), 600, 0.04, 0.2); boop(EGT(1.86), 690, 0.04);    // 闪电劈下：三位挑战者头顶的「惊讶」（第二道闪电 1.73 让开）
    whump(EGT(4.6), 1.1, 0.15);                                                                       // 巨大化：身后升起紫火
    boop(EGT(8.37), 640, 0.045, 0.3); boop(EGT(8.51), 740, 0.045, 0.45); boop(EGT(8.65), 860, 0.045, 0.6);   // 下集预告：右下角依次滑进三位挑战者的头像
  }
} else {
  // 讲解视频：很轻的和弦垫底，加一点点节奏，每章开头一声转场
  for (let c = 0; ; c++) { const t0 = c * 4.8; if (t0 >= DUR) break; pad(t0, Math.min(4.8, DUR - t0) + 0.6, CH[c % 4], 0.03, 0.025); }
  for (let b = 0; b * BEAT < DUR - 3; b++) { const t = b * BEAT, ch = Math.floor(b / 8) % 4; hat(t + BEAT / 2, 0.012); if (b % 2 === 0) bell(t, CH[ch][ARP[b % 8]] + 12, 0.018); }
  X.segs.forEach((s, k) => { if (k) whoosh(s.start - 0.15, 0.5, 0.07); });
  pad(DUR - 7, 7, [48, 60, 64, 67, 71], 0.035, 0.03);
}

// 收尾：软削波 + 归一化，最后 2 秒淡出
let peak = 0; for (let i = 0; i < L.length; i++) { L[i] = Math.tanh(L[i] * 1.2); R[i] = Math.tanh(R[i] * 1.2); peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
// full：增益固定成序章拉长以前（11/05）的全片峰值 —— 那时全片最响的是序章的一拳，序章一改峰值就变，正片、彩蛋的音量会跟着变；固定以后正片、彩蛋的样本和原来一样
const FULL_PEAK = 0.5763797163963318, g = 0.89 / (mode === 'full' ? FULL_PEAK : (peak || 1)), n = mode === 'full' ? Math.round(DUR * SR) : Math.ceil(DUR * SR), fade = 2 * SR;   // full 用 round：序章变长以后 DUR × SR 的浮点误差会让 ceil 多出一个样本，片尾淡出跟着错开一个样本
if (mode === 'full' && peak > FULL_PEAK / 0.89) console.log(`注意：全片峰值 ${peak.toFixed(4)} 超过固定增益能放下的 ${(FULL_PEAK / 0.89).toFixed(4)}，会削波`);
const buf = Buffer.alloc(44 + n * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
const nE = n - (mode === 'full' ? Math.round(0.4 * SR) : 0);   // full：最后 0.4 秒是彩蛋黑场后多留的静音（promo_full.js EGL 加长 0.4），淡出照旧收在原来的位置
for (let i = 0; i < n; i++) { const f = i >= nE ? 0 : i > nE - fade ? (nE - i) / fade : 1; buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g * f)) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g * f)) * 32767), 46 + i * 4); }
fs.writeFileSync(out, buf);
console.log(`${out}  ${DUR} 秒`);
