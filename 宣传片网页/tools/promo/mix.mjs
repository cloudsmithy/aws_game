// 生成两条音轨，放在 tools/promo/out/：
//   promo_audio.m4a   宣传片：配乐 + 音效（full_audio.m4a 同理，给 full 宣传片）
//   explain_audio.m4a 讲解：人声（narrate.mjs 生成的 narration.m4a）+ 垫乐，人声出来时垫乐自动压低
// build.mjs 会把它们嵌进网页，record.mjs 录完 mp4 时也用它们。
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../gamedata.mjs';

const OUT = path.join(ROOT, 'tools', 'promo', 'out'), node = process.execPath, music = path.join(ROOT, 'tools', 'promo', 'music.mjs');
fs.mkdirSync(OUT, { recursive: true });
const ff = args => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
for (const name of (process.argv.slice(2).length ? process.argv.slice(2) : ['promo', 'explain'])) {
  const wav = path.join(OUT, name + '_music.wav');
  execFileSync(node, [music, name, wav], { stdio: 'inherit' });
  // full 宣传片整体放慢到 0.8 倍速（和 promo_full.js 的 PLAY 一致），配乐跟着拉长
  // full 还有序章旁白（full_vo.mjs 生成的 out/full_vo.flac + full_vo_segs.json）：配乐先照旧拉长、标准化响度，
  // 人声出来时压低 DUCK dB（每句前后各 R 秒缓起缓落），再叠上人声，最后限幅防削波；没有旁白文件就和原来一样
  // full：响度标准化（loudnorm 单遍、动态）的增益跟着「到这一刻为止整体有多响」走。11/05 序章从 28.4 拉长到 42.56 秒，多出来的风平浪静、定格那几拍比较安静，
  // 直接标准化的话正片会被整体多推高 0.3–0.9 dB。序章（到大骰子落下之前；最后 4 秒慢慢收回 0）先抬 LIFT dB 再标准化：序章自己出来的响度几乎不变，
  // 正片、彩蛋的响度和拉长以前一样（校准：每 2 秒的响度差中位 0.00 dB、九成在 −0.05–+0.06 dB）。序章再改长短要重新校准 LIFT（46.35 秒那一版是 1.1，42.56 秒那一版是 0.7，现在 40.96 秒（风平浪静再短 1.6）是 0.55：每 2 秒的响度差中位 −0.00 dB、九成在 −0.04–+0.07 dB，和 42.56 秒那一版逐 2 秒比中位 −0.00 dB；按 out/full_audio.m4a 解码后和拉长以前的版本逐 2 秒比响度来定）
  const LIFT = 0.55, OPN = (() => { const m = fs.readFileSync(path.join(ROOT, 'tools', 'promo', 'promo_full.js'), 'utf8').match(/const O0 = ([\d.]+), OPENL = ([\d.]+)/); return m ? +m[1] + +m[2] : 0; })();
  const lift = name === 'full' && OPN ? `volume=volume='pow(10,${LIFT}*if(lt(t,${(OPN - 7.4).toFixed(3)}),1,if(lt(t,${(OPN - 3.4).toFixed(3)}),(${(OPN - 3.4).toFixed(3)}-t)/4,0))/20)':eval=frame,` : '';   // 配乐时间（拉长以前）；OPN = 序章结束
  const VO = path.join(OUT, 'full_vo.flac'), VOS = path.join(OUT, 'full_vo_segs.json');
  const VO_ON = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'promo', 'full_vo.json'), 'utf8')).enabled !== false; } catch { return false; } })();   // full_vo.json 里 enabled: false 就不混旁白
  if (name === 'full' && VO_ON && fs.existsSync(VO) && fs.existsSync(VOS)) {
    const DUCK = 9, R = 0.15, G = Math.pow(10, -DUCK / 20), segs = JSON.parse(fs.readFileSync(VOS, 'utf8')).segs;
    const w = segs.map(s => `clip((t-${(s.t0 - R).toFixed(3)})/${R}\\,0\\,1)*clip((${(s.t1 + R).toFixed(3)}-t)/${R}\\,0\\,1)`).reduce((a, b) => `max(${a}\\,${b})`);
    ff(['-i', wav, '-i', VO, '-filter_complex',
      `[0]${lift}atempo=0.8,loudnorm=I=-15:TP=-1.5,aresample=48000,asetnsamples=n=64:p=0,volume=eval=frame:volume=1-${(1 - G).toFixed(4)}*${w}[m];`
      + '[1]aresample=48000,aformat=channel_layouts=stereo[v];[m][v]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.84:level=0:latency=1[a]',
      '-map', '[a]', '-ar', '48000', '-c:a', 'aac', '-b:a', '160k', path.join(OUT, 'full_audio.m4a')]);
  // full 的最后再过一道限幅（11/05 复核：成品真峰值 −0.9 dBTP，超过 loudnorm 设的 −1.5，是 AAC 编码的过冲）：先在 48 kHz 上压到 0.68（约 −3.3 dBFS；采样之间的峰和 AAC 编码还会再冒约 1.5 dB），编码以后约 −1.6 dBTP；只动超过 0.68 的少数瞬态峰，整体响度不变，别的样本不变
  } else if (name !== 'explain') ff(['-i', wav, '-af', (name === 'full' ? lift + 'atempo=0.8,' : '') + 'loudnorm=I=-15:TP=-1.5' + (name === 'full' ? ',aresample=48000,alimiter=limit=0.68:level=0' : ''), '-ar', '48000', '-c:a', 'aac', '-b:a', '160k', path.join(OUT, name + '_audio.m4a')]);
  else ff(['-i', path.join(OUT, 'narration.m4a'), '-i', wav, '-filter_complex',
    '[0]aresample=48000,asplit=2[v1][v2];[1]volume=0.22[m];[m][v1]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[md];[v2][md]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5[a]',
    '-map', '[a]', '-ar', '48000', '-c:a', 'aac', '-b:a', '160k', path.join(OUT, 'explain_audio.m4a')]);
  fs.rmSync(wav);
  console.log(`${name}_audio.m4a 好了`);
}
