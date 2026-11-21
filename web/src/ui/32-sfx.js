import { BOT, SIM } from '../core/02-util.js';
import { render } from './27d-side.js';
import { BOSS } from './39-bosskey.js';
// ================= 音效（Web Audio 现场合成，不带音频文件） =================
export const SFX = { on: (() => { try { return localStorage.getItem('amono-sfx') !== 'off'; } catch (e) { return true; } })(), ctx: null, last: {} };
// 第一次 new AudioContext 要把浏览器的音频服务拉起来，刚打开的浏览器上会卡 0.2–0.5 秒；等到点「开始游戏」才建，角色卡要晚半拍才出来。
// 所以页面上第一次按下（鼠标、手指、键盘）就先建好。手机上这时建出来可能是暂停的，点开局时 sfx 里的 resume() 会把它叫起来
const sfxWarm = () => { removeEventListener('pointerdown', sfxWarm, true); removeEventListener('keydown', sfxWarm, true); if (SFX.on && !SFX.ctx && !BOT && !SIM && typeof AudioContext !== 'undefined') try { SFX.ctx = new AudioContext(); } catch (e) { } };
addEventListener('pointerdown', sfxWarm, true); addEventListener('keydown', sfxWarm, true);
export function sfx(kind) {
  if (!SFX.on || BOT || SIM || (BOSS && BOSS.on) || typeof AudioContext === 'undefined') return;   // 老板键开着时不出声
  const now = performance.now(); if (SFX.last[kind] && now - SFX.last[kind] < (kind === 'step' ? 40 : 120)) return; SFX.last[kind] = now;
  try {
    const A = SFX.ctx || (SFX.ctx = new AudioContext()); if (A.state === 'suspended') A.resume();
    const t0 = A.currentTime, out = A.createGain(); out.gain.value = 0.32; out.connect(A.destination);
    const tone = (f, t, d, type = 'sine', v = 0.5, f2) => { const o = A.createOscillator(), g = A.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0 + t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + t + d); g.gain.setValueAtTime(0, t0 + t); g.gain.linearRampToValueAtTime(v, t0 + t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t0 + t + d); o.connect(g); g.connect(out); o.start(t0 + t); o.stop(t0 + t + d + 0.02); };
    const noise = (t, d, f, q = 1, v = 0.4, f2) => { const b = A.createBuffer(1, Math.ceil(A.sampleRate * d), A.sampleRate), x = b.getChannelData(0); for (let k = 0; k < x.length; k++) x[k] = Math.random() * 2 - 1; const s = A.createBufferSource(), bp = A.createBiquadFilter(), g = A.createGain(); s.buffer = b; bp.type = 'bandpass'; bp.frequency.setValueAtTime(f, t0 + t); if (f2) bp.frequency.exponentialRampToValueAtTime(f2, t0 + t + d); bp.Q.value = q; g.gain.setValueAtTime(v, t0 + t); g.gain.exponentialRampToValueAtTime(0.001, t0 + t + d); s.connect(bp); bp.connect(g); g.connect(out); s.start(t0 + t); };
    if (kind === 'dice') for (let k = 0; k < 7; k++) noise(k * 0.09 + Math.random() * 0.04, 0.05, 2000 + Math.random() * 2500, 4, 0.5 - k * 0.05);
    else if (kind === 'step') tone(880, 0, 0.04, 'triangle', 0.18);
    else if (kind === 'card') { noise(0, 0.35, 600, 0.8, 0.35, 4000); }
    else if (kind === 'magic') { [1047, 1319, 1568, 2093, 2637].forEach((f, k) => tone(f, 0.05 + k * 0.07, 0.6, 'sine', 0.22)); noise(0, 0.9, 6000, 3, 0.08, 9000); tone(523, 0, 0.9, 'triangle', 0.12); }
    else if (kind === 'alarm') { tone(740, 0, 0.18, 'square', 0.12); tone(554, 0.2, 0.18, 'square', 0.12); tone(740, 0.4, 0.18, 'square', 0.12); }
    else if (kind === 'coin') { tone(1319, 0, 0.08, 'square', 0.12); tone(1760, 0.07, 0.25, 'square', 0.12); }
    else if (kind === 'pay') { tone(660, 0, 0.12, 'triangle', 0.25, 330); }
    else if (kind === 'buy') { [784, 988, 1175].forEach((f, k) => tone(f, k * 0.06, 0.3, 'triangle', 0.22)); }
    else if (kind === 'fail') { tone(392, 0, 0.3, 'sawtooth', 0.12, 196); tone(311, 0.25, 0.5, 'sawtooth', 0.12, 155); }
    else if (kind === 'fly') { noise(0, 1.0, 300, 0.7, 0.35, 2400); tone(220, 0, 1.0, 'sine', 0.15, 880); }
    else if (kind === 'win') { [523, 659, 784, 1047, 784, 1047].forEach((f, k) => tone(f, k * 0.12, 0.35, 'triangle', 0.25)); }
  } catch (e) { }
}
export function toggleSfx() { SFX.on = !SFX.on; try { localStorage.setItem('amono-sfx', SFX.on ? 'on' : 'off'); } catch (e) { } if (SFX.on) sfx('coin'); render(); }

