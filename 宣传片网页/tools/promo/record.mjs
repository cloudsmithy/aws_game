// 把宣传片 / 讲解视频网页逐帧录成 mp4：headless Chrome 打开页面，逐帧 seek(t) 截图，再交给 ffmpeg。
// 用法：node tools/promo/record.mjs 页面.html 输出.mp4 [音频文件] [帧率，默认 30] [--scale 4]
// --scale 4 导出 8K（7680×4320）：每帧截图直接流给 ffmpeg（不落盘，8K 帧太大），用 VideoToolbox 硬件 HEVC 编码
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

const argv = process.argv.slice(2), si = argv.indexOf('--scale'), SCALE = si >= 0 ? +argv[si + 1] : 1;
if (si >= 0) argv.splice(si, 2);
// 可选：--vcodec h264（大分辨率默认 HEVC）、--vb 码率（默认 160M）；不传和原来一样
const opt = k => { const i = argv.indexOf(k); if (i < 0) return null; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const VCODEC = opt('--vcodec'), VB = opt('--vb') || '160M';
// 可选：--from 帧号：从这一帧录到结尾（续录用，先顺着往前 2 秒 seek 一遍再开始截，和整条连着录的状态一致）；不传从 0 开始，和原来一样
const FROM = +(opt('--from') || 0);
// 可选：--to 帧号：只录到这一帧之前（不含），补录开头一段用；不传录到结尾
const TO = opt('--to');
const [page, out, audio, fpsArg] = argv, FPS = +(fpsArg || 30);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'promo-frames-'));
// 端口让 Chrome 自己挑（0），再从 DevToolsActivePort 读出来，免得和别的会话开的 Chrome 撞端口
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--no-first-run', `--user-data-dir=${dir}/profile`, '--remote-debugging-port=0', '--window-size=1920,1080', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
// 录到一半 Chrome 被别的程序杀掉时直接报错退出（原来会一直卡着等它回话），打出录到第几帧，好用 --from 接着录
let lastF = -1, finished = false;
chrome.on('exit', () => { if (!finished) { console.log(`Chrome 中途退出了（已截到第 ${lastF} 帧），停止录制`); process.exit(3); } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let PORT = 0;
for (let k = 0; k < 80 && !PORT; k++) { try { PORT = +fs.readFileSync(path.join(dir, 'profile', 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch { await sleep(250); } }
if (!PORT) throw new Error('Chrome 没起来');
for (let k = 0; k < 60; k++) { try { await fetch(`http://127.0.0.1:${PORT}/json/version`); break; } catch { await sleep(250); } }
const url = pathToFileURL(path.resolve(page)).href + '?record=1' + (SCALE > 1 ? `&scale=${SCALE}` : '');
const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const wait = {}; ws.onmessage = m => { const d = JSON.parse(m.data); if (wait[d.id]) { wait[d.id](d); delete wait[d.id]; } };
// 11-11：Chrome 没退出、但一直不回话（夜里出过一次，卡在第 0 帧 3 小时）时，等 3 分钟就报错退出，好让导出脚本重试
const call = (method, params = {}) => new Promise(r => { const i = ++id; const to = setTimeout(() => { console.log(`Chrome ${method} 3 分钟没回话（已截到第 ${lastF} 帧），停止录制`); try { chrome.kill('SIGKILL'); } catch {} process.exit(4); }, 180000); wait[i] = d => { clearTimeout(to); r(d.result || d); }; ws.send(JSON.stringify({ id: i, method, params })); });
await call('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: SCALE, mobile: false });
let dur = 0;
for (let k = 0; k < 120 && !dur; k++) { const r = await call('Runtime.evaluate', { expression: 'window.PROMO && PROMO.ready ? PROMO.duration : 0', returnByValue: true }); dur = r.result ? r.result.value : 0; if (!dur) await sleep(250); }
if (!dur) throw new Error('页面没准备好');
await sleep(3000);   // PROMO.ready 出来时人物立牌、道具这些贴图偶尔还没解码完（机器负载高时更明显），先等 3 秒再开录，免得前几秒录成没贴图的画面
const N = TO ? Math.min(Math.round(dur * FPS), +TO) : Math.round(dur * FPS), t0 = Date.now(), BIG = SCALE > 1;
// 8K：截图直接写进 ffmpeg 的标准输入，边录边编码
const enc = BIG ? spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  ...(audio ? ['-i', audio, '-c:a', 'aac', '-b:a', '256k', '-shortest'] : []),
  ...(VCODEC === 'h264' ? ['-c:v', 'h264_videotoolbox', '-profile:v', 'high', '-level', '5.2', '-b:v', VB] : ['-c:v', 'hevc_videotoolbox', '-b:v', VB, '-tag:v', 'hvc1']), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] }) : null;
const write = buf => new Promise(r => enc.stdin.write(buf) ? r() : enc.stdin.once('drain', r));
for (let f = Math.max(0, FROM - 2 * FPS); f < FROM; f++) await call('Runtime.evaluate', { expression: `PROMO.seek(${f / FPS}); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`, awaitPromise: true });
for (let f = FROM; f < N; f++) {
  await call('Runtime.evaluate', { expression: `PROMO.seek(${f / FPS}); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`, awaitPromise: true });
  const s = await call('Page.captureScreenshot', { format: 'jpeg', quality: BIG ? 95 : 93 });
  if (BIG) await write(Buffer.from(s.data, 'base64'));
  else fs.writeFileSync(path.join(dir, String(f).padStart(5, '0') + '.jpg'), Buffer.from(s.data, 'base64'));
  lastF = f;
  if (f % 150 === 0) console.log(`帧 ${f}/${N}，已用 ${Math.round((Date.now() - t0) / 1000)} 秒`);
  // 磁盘快满时先停下来等（别的程序在写盘时，8K 输出写满磁盘会让 ffmpeg 直接退出、整条白录）：剩不到 2 GB 就暂停，等腾出 3 GB 再接着录
  if (f % 30 === 0) { const free = () => { const st = fs.statfsSync(path.dirname(path.resolve(out))); return st.bavail * st.bsize; };
    if (free() < 2e9) { console.log(`磁盘只剩 ${(free() / 1e9).toFixed(1)} GB，暂停录制，等腾出空间…`); while (free() < 3e9) await new Promise(r => setTimeout(r, 10000)); console.log('空间够了，继续录'); } }
}
finished = true; chrome.kill();
if (BIG) {
  enc.stdin.end(); await new Promise(r => enc.on('close', r));
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`写好了 ${out}（${N} 帧，${dur} 秒，${1920 * SCALE}×${1080 * SCALE}）`);
  process.exit(0);
}
const args = ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, '%05d.jpg')];
if (audio) args.push('-i', audio, '-c:a', 'aac', '-b:a', '192k', '-shortest');
args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out);
execFileSync('ffmpeg', args, { stdio: 'inherit' });
fs.rmSync(dir, { recursive: true, force: true });
console.log(`写好了 ${out}（${N} 帧，${dur} 秒）`);
process.exit(0);
