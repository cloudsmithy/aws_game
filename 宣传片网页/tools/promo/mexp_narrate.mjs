// 各模式玩法讲解的配音：node tools/promo/mexp_narrate.mjs <模式> [--tts cosyvoice]（从 narrate.mjs 复制，输出到 mexp_out/<模式>/）
// 讲解视频的配音：逐句合成（默认 macOS 的 say 婷婷，只能做样片；--tts cosyvoice 用开源的 CosyVoice），量出每句时长，
// 拼成一条人声音轨（tools/promo/out/narration.m4a），并写出 explain_data.json 给时间轴和字幕用。
// 每行是 [念的文字, 字幕文字]，字幕省略时和念的一样（念的文字里数字写成汉字，读得更顺）。
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT } from '../gamedata.mjs';

const MODE = process.argv[2];
const HERE = path.join(ROOT, 'tools', 'promo'), OUT = path.join(HERE, 'mexp_out', MODE), SCRIPT = path.join(HERE, 'mexp_scripts', MODE + '.json');
const S = JSON.parse(fs.readFileSync(SCRIPT, 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'narrate-'));
const LEAD = 1.2, GAP = 0.35, SEG_GAP = 0.9, TAIL = 3.5;
const dur = f => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim();

// --tts cosyvoice：先用 CosyVoice 批量合成好每一句（tts_cosyvoice.py），再按同样的方式排时间、拼音轨
const cosy = process.argv.includes('--tts') && process.argv[process.argv.indexOf('--tts') + 1] === 'cosyvoice';
if (cosy) execFileSync(path.join(os.homedir(), 'miniconda3', 'envs', 'cosyvoice', 'bin', 'python'), [path.join(HERE, 'mexp_tts.py'), SCRIPT, tmp], { stdio: 'inherit', cwd: path.join(os.homedir(), 'tts', 'CosyVoice') });

let t = LEAD, n = 0;
const parts = [], segs = [];
for (const s of S.segs) {
  const seg = { id: s.id, chap: s.chap, note: s.note, hero: s.hero, outro: s.outro, start: t - (segs.length ? SEG_GAP / 2 : LEAD), subs: [] };
  for (const [say, sub, cue] of s.lines) {
    const f = path.join(tmp, `${String(n++).padStart(3, '0')}.${cosy ? 'wav' : 'aiff'}`);
    if (!cosy) execFileSync('say', ['-v', S.voice, '-r', String(S.rate), '-o', f, say]);
    const d = dur(f);
    parts.push({ f, at: t }); seg.subs.push({ t0: +t.toFixed(2), t1: +(t + d).toFixed(2), text: (sub || say).replace(/[。！]$/, ''), cue: cue || {} });
    t += d + GAP;
  }
  t += SEG_GAP - GAP; seg.end = +(t - SEG_GAP / 2).toFixed(2); seg.start = +seg.start.toFixed(2); segs.push(seg);
}
const total = +(t + TAIL).toFixed(2);
segs[segs.length - 1].end = total;

// 按时间点把每句放进同一条音轨
const args = ['-y', '-loglevel', 'error'];
parts.forEach(p => args.push('-i', p.f));
const filt = parts.map((p, k) => `[${k}]adelay=${Math.round(p.at * 1000)}|${Math.round(p.at * 1000)},aformat=channel_layouts=stereo[a${k}]`).join(';')
  + ';' + parts.map((_, k) => `[a${k}]`).join('') + `amix=inputs=${parts.length}:normalize=0,apad=whole_dur=${total},loudnorm=I=-16:TP=-1.5[out]`;
fs.mkdirSync(OUT, { recursive: true });
args.push('-filter_complex', filt, '-map', '[out]', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', path.join(OUT, 'narration.m4a'));
execFileSync('ffmpeg', args, { stdio: 'inherit' });
fs.writeFileSync(path.join(OUT, 'data.json'), JSON.stringify({ mode: MODE, name: S.name, badge: S.badge, duration: total, segs }, null, 1));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`配音 ${total} 秒，${n} 句，${segs.length} 段`);
segs.forEach(s => console.log(`${s.chap}  ${s.start}–${s.end}`));
