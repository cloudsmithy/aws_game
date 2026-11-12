// full 宣传片序章的旁白：按 full_vo.json 用 VoxCPM2 逐句合成（tts_voxcpm.py，有缓存），量每句时长、塞进它的时段，
// 拼成一条和视频等长的人声轨 tools/promo/out/full_vo.flac，再写出 out/full_vo_segs.json（每句实际起止，mix.mjs 按它压低配乐）。
// 用法：node tools/promo/full_vo.mjs   然后 node tools/promo/mix.mjs full 把旁白混进 full_audio.m4a
// full_vo.json：时间都是视频秒（网页进度条上的秒数）。每句 at = 开口时刻，win = [字幕出现, 最晚说完]；
//   说不完就加速（最多 1.15 倍），还不够就报错，要改短这句。avoid 是不许有旁白的时段（台词气泡，留给画面）。
//   level = 每句统一调到的响度（LUFS，单声道），个别句子可以单独写；voice（音色描述）、seed 全片统一；anchor 是「定音句」：先用声音设计合成它，其余每句都拿它当参考音色，保证是同一个人。
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT } from '../gamedata.mjs';

const HERE = path.join(ROOT, 'tools', 'promo'), OUT = path.join(HERE, 'out'), WORK = path.join(OUT, 'full_vo_work');
const S = JSON.parse(fs.readFileSync(path.join(HERE, 'full_vo.json'), 'utf8'));
const PY = process.env.VOXCPM_PY || path.join(os.homedir(), 'voxcpm-src', 'VoxCPM', '.venv', 'bin', 'python');
const SR = 48000, MAXT = 1.15, GAP = 0.2, R = 0.15;   // R：配乐在人声前后缓起缓落的时长（和 mix.mjs 一致），GAP：句与句之间至少空这么多
const ff = (args, o = {}) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-nostats', ...args], { maxBuffer: 1 << 28, ...o });
fs.rmSync(WORK, { recursive: true, force: true }); fs.mkdirSync(WORK, { recursive: true });

// 1. 合成：定音句排第一个，其余每句拿它当参考音色（tts_voxcpm.py 按顺序做，缓存命中就直接拷贝）
const anchor = path.join(WORK, 'anchor.wav');
const jobs = [{ text: S.anchor, voice: S.voice, seed: S.seed, out: anchor },
  ...S.lines.map((l, k) => ({ text: l.say, voice: S.voice, seed: l.seed ?? S.seed, ref: anchor, out: path.join(WORK, `raw${k}.wav`) }))];
fs.writeFileSync(path.join(WORK, 'jobs.json'), JSON.stringify(jobs));
execFileSync(PY, [path.join(HERE, 'tts_voxcpm.py'), path.join(WORK, 'jobs.json')], { stdio: ['ignore', 'inherit', 'ignore'], env: { ...process.env, PYTHONWARNINGS: 'ignore' } });

// 2. 量每句：去掉首尾静音（10ms 一帧，比最响帧低 45dB 以下算静音），得到真正开口到说完的长度
const speech = f => {
  const raw = ff(['-v', 'error', '-i', f, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-']);
  const x = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4), W = SR / 100, rms = [];
  for (let i = 0; i + W <= x.length; i += W) { let s = 0; for (let j = i; j < i + W; j++) s += x[j] * x[j]; rms.push(Math.sqrt(s / W)); }
  const thr = Math.max(...rms) * Math.pow(10, -45 / 20), a = rms.findIndex(v => v > thr), b = rms.length - 1 - [...rms].reverse().findIndex(v => v > thr);
  return { a: a / 100, b: (b + 1) / 100 };
};
const lufs = f => +/Summary:[\s\S]*?I:\s+(-?[\d.]+) LUFS/.exec(spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', f, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' }).stderr)[1];   // 整句的响度（取最后 Summary 里的 I，前面逐帧日志里的 I 是累计值）

// 3. 每句：裁掉首尾静音（前后各留 30ms）→ 去低频隆隆 → 轻压缩 → 需要的话加速 → 统一响度
const segs = [];
S.lines.forEach((l, k) => {
  const raw = path.join(WORK, `raw${k}.wav`), { a, b } = speech(raw), d = b - a;
  const room = l.win[1] - l.at;
  let tempo = l.tempo || 1;
  if (d / tempo > room) tempo = d / room;
  if (tempo > MAXT + 1e-6) throw new Error(`第 ${k + 1} 句「${l.say}」说完要 ${d.toFixed(2)} 秒，时段只有 ${room.toFixed(2)} 秒，加速到 ${MAXT} 倍也塞不下，改短这句`);
  tempo = Math.max(1, +tempo.toFixed(3));
  const s0 = Math.max(0, a - 0.03), s1 = b + 0.03, f = path.join(WORK, `seg${k}.wav`);
  ff(['-v', 'error', '-i', raw, '-af', `atrim=start=${s0}:end=${s1},asetpts=PTS-STARTPTS,highpass=f=60,acompressor=threshold=0.125:ratio=2.5:attack=5:release=120:makeup=1${tempo > 1 ? `,atempo=${tempo}` : ''},afade=t=in:d=0.02,areverse,afade=t=in:d=0.06,areverse`, '-ar', String(SR), '-ac', '1', f]);
  const t0 = +(l.at - 0.03 / tempo).toFixed(3), dur = (s1 - s0) / tempo;
  const gain = (l.level ?? S.level) - lufs(f);   // 个别句子底下配乐特别满，可以单独写 level 调响一点
  if (!(gain > -30 && gain < 30)) throw new Error(`第 ${k + 1} 句响度量出来不对（要调 ${gain} dB）`);
  segs.push({ k, f, gain, at: l.at, t0: l.at, t1: +(l.at + d / tempo).toFixed(3), place: t0, dur, tempo, say: l.say, cap: l.cap, capT: l.capT, win: l.win });
});

// 4. 检查：句与句不重叠（中间至少空 GAP 秒），不进 avoid（台词气泡）时段，连配乐压低的缓起缓落也不进去
segs.forEach((s, k) => {
  if (s.t0 < s.win[0] - 1e-6) throw new Error(`第 ${k + 1} 句开口 ${s.t0} 早于时段 ${s.win[0]}`);
  if (k && s.t0 < segs[k - 1].t1 + GAP) throw new Error(`第 ${k} 句和第 ${k + 1} 句挨得太近 / 重叠（${segs[k - 1].t1} → ${s.t0}）`);
  for (const [x0, x1] of S.avoid || []) if (s.t0 - R < x1 && s.t1 + R > x0) throw new Error(`第 ${k + 1} 句（${s.t0}–${s.t1}）碰到了不许旁白的时段 ${x0}–${x1}`);
});

// 5. 按时间点拼成一条和视频等长的人声轨（单声道，混音时放正中间）
const args = ['-v', 'error'];
segs.forEach(s => args.push('-i', s.f));
const ms = s => Math.round(s.place * 1000);
// 每句调到统一响度后过一道限幅（-2dBFS，2ms 起控），免得个别字的峰值顶到满幅削波
const filt = segs.map((s, k) => `[${k}]volume=${s.gain.toFixed(2)}dB,alimiter=limit=0.794:attack=2:release=40:level=0:latency=1,adelay=${ms(s)}[a${k}]`).join(';')
  + ';' + segs.map((_, k) => `[a${k}]`).join('') + `amix=inputs=${segs.length}:normalize=0,apad=whole_dur=${S.duration},atrim=end=${S.duration}[out]`;
args.push('-filter_complex', filt, '-map', '[out]', '-ar', String(SR), '-ac', '1', '-c:a', 'flac', path.join(OUT, 'full_vo.flac'));
ff(args);
fs.writeFileSync(path.join(OUT, 'full_vo_segs.json'), JSON.stringify({ duration: S.duration, voice: S.voice, seed: S.seed, segs: segs.map(s => ({ t0: s.t0, t1: s.t1, tempo: s.tempo, gain: +s.gain.toFixed(2), say: s.say, cap: s.cap, capT: s.capT })) }, null, 1));
fs.rmSync(WORK, { recursive: true, force: true });
console.log(`旁白 ${segs.length} 句 → out/full_vo.flac（${S.duration} 秒）`);
segs.forEach((s, k) => console.log(`${String(k + 1).padStart(2)}  ${s.t0.toFixed(2)}–${s.t1.toFixed(2)}  ${s.tempo > 1 ? `×${s.tempo}` : '    '}  ${s.say}`));
