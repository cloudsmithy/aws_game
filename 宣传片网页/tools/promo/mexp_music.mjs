// 各模式玩法讲解的垫乐：MEXP_DATA=mexp_out/<模式>/data.json node tools/promo/mexp_music.mjs explain 输出.wav（从 music.mjs 复制）
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

const X = mode === 'explain' ? JSON.parse(fs.readFileSync(process.env.MEXP_DATA, 'utf8')) : null;   // 各模式讲解：时间数据从 MEXP_DATA 读
const DUR = X ? X.duration : mode === 'full' ? 90.0 : 52;
const L = new Float32Array(Math.ceil(DUR * SR) + SR), R = new Float32Array(L.length);
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
  const INTRO = 5.4, SH = 4.8, XS = 23.2 - SH, XL = 5.0, A0 = 30.4 + XL, AL = 4.2, SL = AL / 4.2, at = (k, off) => A0 + k * AL + off * SL, SK0 = A0 + 6 * AL, DL0 = SK0 + 3.8, R0 = DL0 + 4.6, Q0 = R0 + 8.6, OUT0 = Q0 + 3.6, G1 = OUT0 + 2.0, m = b => b < 23.2 ? b - SH : b - SH + XL;
  pad(0, INTRO + 0.4, [60, 64, 67, 74], 0.06, 0.025); shimmer(0.3); riser(INTRO - 1.5, 1.5); impact(INTRO);
  for (let c = 0; ; c++) { const t0 = INTRO + c * 4.8; if (t0 >= G1) break; pad(t0, Math.min(4.8, G1 - t0) + 0.6, CH[c % 4], 0.045, 0.035); }
  for (let b = 0; INTRO + b * BEAT < G1; b++) {
    const t = INTRO + b * BEAT, ch = Math.floor(b / 8) % 4;
    if (b % 2) kick(t, 0.2); hat(t + BEAT / 2, 0.035);
    bell(t, CH[ch][ARP[b % 8]] + 12, 0.04); bell(t + BEAT / 2, CH[ch][ARP[(b * 2 + 1) % 8]] + 12, 0.028);
    if (b % 2 === 0) bass(t, ROOTS[ch], 0.3, 0.12);
  }
  rattle(m(10.75), m(12.0)); thunk(m(12.0), 0.18);
  for (let k = 0; k < 8; k++) blip(m(12.45) + k * 0.25, 69 + [0, 2, 4, 5, 7, 9, 11, 12][k], 0.07);
  chime(m(14.5)); thunk(m(17.0)); thunk(m(17.6));
  tone(m(18.6), 1.4, 330, { f1: 990, amp: 0.05, type: 'saw', lp: 0.06, a: 0.2, r: 0.3 }); shimmer(m(19.9));
  for (let k = 0; k < 3; k++) blip(m(20.65) + k * 0.25, 64 - k * 2, 0.06);
  for (let k = 0; k < 16; k++) ping(m(21.6) + k * 0.06, 0.06, (k % 3 - 1) * 0.4);
  whoosh(m(23.15)); noise(m(23.55), 0.08, { amp: 0.2, lp0: 0.3, decay: 0.03 });
  alarm(m(26.4)); alarm(m(26.9)); shimmer(m(26.85));
  whoosh(m(29.75)); noise(m(30.0), 0.08, { amp: 0.2, lp0: 0.3, decay: 0.03 });
  for (let k = 0; k < 40; k++) ping(m(30.95) + rnd() * 1.4, 0.05, rnd() - 0.5);
  for (let n = 0; n < 4; n++) whoosh(m(32.0) + n * 0.16, 0.4, 0.09);
  // 03 串联收费（插段）
  chime(XS + 0.45); tone(XS + 0.8, 1.1, 330, { f1: 990, amp: 0.05, type: 'saw', lp: 0.06, a: 0.2, r: 0.3 }); shimmer(XS + 2.0);
  for (let k = 0; k < 20; k++) ping(XS + 3.0 + k * 0.06, 0.05, (k % 3 - 1) * 0.4);
  // 6 个模式看点：每段开头一声转场，再配各自的音效
  for (let k = 0; k < 6; k++) whoosh(A0 + k * AL - 0.2, 0.5, 0.1);
  for (let n = 0; n < 3; n++) whoosh(at(0, 0.2 + n * 0.2), 0.4, 0.08);                    // 娱乐：盲盒卡
  for (let k = 0; k < 12; k++) ping(at(1, 0.5 + k * 0.1), 0.05, (k % 3 - 1) * 0.4);   // 入门：运行费
  alarm(at(2, 1.2)); alarm(at(2, 2.2));                                     // 标准：技术债
  for (let k = 0; k < 12; k++) ping(at(3, 0.8 + k * 0.06), 0.05, 0); chime(at(3, 2.0));   // 完整：交易
  chime(at(4, 2.2));                                                               // 学习：答对
  const S6 = b => at(5, b - 35.2);                                                        // 高速部署：DDoS
  for (let k = 0; k < 12; k++) blip(S6(35.45 + k * 0.13), 64 + k, 0.06);
  riser(S6(36.6), 0.9); tone(S6(37.3), 0.7, 1200, { f1: 90, type: 'saw', amp: 0.09, lp: 0.15, a: 0.005, r: 0.1 });
  impact(S6(37.95), 0.45); alarm(S6(38.1)); alarm(S6(38.6));
  const S7 = SK0 - 39.4;                                                                  // 专属技能
  whoosh(S7 + 39.75); noise(S7 + 40.0, 0.08, { amp: 0.2, lp0: 0.3, decay: 0.03 }); chime(S7 + 40.7);
  for (let k = 0; k < 18; k++) ping(S7 + 41.05 + k * 0.07, 0.06, (k % 3 - 1) * 0.4);
  // 13 玩法 DLC：4 个盒子落地，每个弹两下
  whoosh(DL0 - 0.1); for (let n = 0; n < 4; n++) { const t0 = DL0 + 0.1 + n * 0.18; thunk(t0 + 0.18, 0.32); thunk(t0 + 0.55, 0.16); thunk(t0 + 0.78, 0.08); } chime(DL0 + 1.4);
  // 14 代理商：进货、客户跳过来买走、运行费分成
  whoosh(R0 - 0.1); for (let k = 0; k < 2; k++) blip(R0 + 0.3 + k * 0.25, 67 + k * 2, 0.06); for (let k = 0; k < 6; k++) ping(R0 + 0.8 + k * 0.06, 0.05, 0.3); thunk(R0 + 1.3, 0.2);
  for (let k = 0; k < 4; k++) blip(R0 + 1.9 + k * 0.22, 64 + k * 2, 0.06); for (let k = 0; k < 8; k++) ping(R0 + 2.8 + k * 0.06, 0.05, 0); chime(R0 + 3.1); for (let k = 0; k < 2; k++) blip(R0 + 5.6 + k * 0.25, 69 + k * 2, 0.06);
  for (let k = 0; k < 8; k++) ping(R0 + 3.5 + k * 0.06, 0.05, 0.3); for (let k = 0; k < 4; k++) ping(R0 + 4.1 + k * 0.08, 0.04, -0.3);
  tone(R0 + 5.0, 0.6, 330, { f1: 990, amp: 0.05, type: 'saw', lp: 0.06, a: 0.1, r: 0.2 }); shimmer(R0 + 5.5); for (let k = 0; k < 16; k++) ping(R0 + 6.2 + k * 0.06, 0.06, (k % 3 - 1) * 0.4); alarm(R0 + 6.5);
  // 15 学习模式：3 个题库盒子
  whoosh(Q0 - 0.1); for (let n = 0; n < 3; n++) { const t0 = Q0 + 0.1 + n * 0.18; thunk(t0 + 0.18, 0.28); thunk(t0 + 0.55, 0.14); } chime(Q0 + 1.0);
  const S8 = OUT0 - 43.2;                                                                 // 片尾
  whoosh(S8 + 45.0, 0.9, 0.12); pad(S8 + 45.2, DUR - (S8 + 45.2), [48, 60, 64, 67, 71, 74], 0.05, 0.03); impact(S8 + 46.2, 0.4); chime(S8 + 46.4);
} else {
  // 讲解视频：很轻的和弦垫底，加一点点节奏，每章开头一声转场
  for (let c = 0; ; c++) { const t0 = c * 4.8; if (t0 >= DUR) break; pad(t0, Math.min(4.8, DUR - t0) + 0.6, CH[c % 4], 0.03, 0.025); }
  for (let b = 0; b * BEAT < DUR - 3; b++) { const t = b * BEAT, ch = Math.floor(b / 8) % 4; hat(t + BEAT / 2, 0.012); if (b % 2 === 0) bell(t, CH[ch][ARP[b % 8]] + 12, 0.018); }
  X.segs.forEach((s, k) => { if (k) whoosh(s.start - 0.15, 0.5, 0.07); });
  pad(DUR - 7, 7, [48, 60, 64, 67, 71], 0.035, 0.03);
}

// 收尾：软削波 + 归一化，最后 2 秒淡出
let peak = 0; for (let i = 0; i < L.length; i++) { L[i] = Math.tanh(L[i] * 1.2); R[i] = Math.tanh(R[i] * 1.2); peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
const g = 0.89 / (peak || 1), n = Math.ceil(DUR * SR), fade = 2 * SR;
const buf = Buffer.alloc(44 + n * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
for (let i = 0; i < n; i++) { const f = i > n - fade ? (n - i) / fade : 1; buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g * f)) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g * f)) * 32767), 46 + i * 4); }
fs.writeFileSync(out, buf);
console.log(`${out}  ${DUR} 秒`);
