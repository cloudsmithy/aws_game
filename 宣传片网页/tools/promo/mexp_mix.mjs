// 各模式玩法讲解的音轨：人声（mexp_narrate.mjs 生成的 narration.m4a）+ 垫乐（mexp_music.mjs），人声出来时垫乐自动压低。
// 写到 mexp_out/<模式>/audio.m4a。做法和 mix.mjs 的 explain 一样。
// 用法：node tools/promo/mexp_mix.mjs [party basic std full study hell]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../gamedata.mjs';

const HERE = path.join(ROOT, 'tools', 'promo'), node = process.execPath;
const ff = args => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
for (const mode of (process.argv.slice(2).length ? process.argv.slice(2) : ['party', 'basic', 'std', 'full', 'study', 'hell'])) {
  const dir = path.join(HERE, 'mexp_out', mode), voice = path.join(dir, 'narration.m4a'), wav = path.join(dir, 'music.wav');
  if (!fs.existsSync(voice)) { console.log(`${mode}：还没配音，跳过`); continue; }
  execFileSync(node, [path.join(HERE, 'mexp_music.mjs'), 'explain', wav], { stdio: 'inherit', env: { ...process.env, MEXP_DATA: path.join(dir, 'data.json') } });
  ff(['-i', voice, '-i', wav, '-filter_complex',
    '[0]aresample=48000,asplit=2[v1][v2];[1]volume=0.22[m];[m][v1]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[md];[v2][md]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5[a]',
    '-map', '[a]', '-ar', '48000', '-c:a', 'aac', '-b:a', '160k', path.join(dir, 'audio.m4a')]);
  fs.rmSync(wav);
  console.log(`${mode} 音轨好了`);
}
