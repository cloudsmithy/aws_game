// 把一段 HTML 渲染成图片（封面、人物一览这类静态图共用）：起一个 headless Chrome，用 CDP 按 2 倍像素截图，再缩回原尺寸，边缘更干净
// （chrome --screenshot 在机器忙的时候常常直接退出或卡住，所以走 CDP）
// 用法：const P = await openPoster(); await P.shot(html, 宽, 高, 输出.jpg); P.close();
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawn } from 'node:child_process';

export async function openPoster() {
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-p-')), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-'));
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--no-first-run', `--user-data-dir=${prof}`, '--remote-debugging-port=0', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let PORT = 0; for (let k = 0; k < 160 && !PORT; k++) { try { PORT = +fs.readFileSync(path.join(prof, 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch { await sleep(250); } }
  if (!PORT) throw new Error('Chrome 没起来');
  for (let k = 0; k < 60; k++) { try { await fetch(`http://127.0.0.1:${PORT}/json/version`); break; } catch { await sleep(250); } }
  const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const wait = {}; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && wait[d.id]) { wait[d.id](d); delete wait[d.id]; } };
  const call = (method, params = {}) => new Promise(r => { const i = ++id; wait[i] = d => r(d.result || d); ws.send(JSON.stringify({ id: i, method, params })); });
  let n = 0;
  return {
    async shot(html, w, h, out) {
      const f = path.join(tmp, `p${n++}.html`); fs.writeFileSync(f, html);
      await call('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: false });
      await call('Page.navigate', { url: 'file://' + f });
      for (let k = 0; k < 120; k++) { const r = await call('Runtime.evaluate', { expression: "document.readyState === 'complete' && [...document.images].every(i => i.complete) && document.fonts.status === 'loaded'", returnByValue: true }); if (r.result && r.result.value) break; await sleep(250); }
      await sleep(300);
      const s = await call('Page.captureScreenshot', { format: 'png' }), png = f.replace(/\.html$/, '.png'); fs.writeFileSync(png, Buffer.from(s.data, 'base64'));
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-vf', `scale=${w}:${h}:flags=lanczos`, '-q:v', '2', out]);
    },
    close() { chrome.kill(); fs.rmSync(tmp, { recursive: true, force: true }); setTimeout(() => fs.rmSync(prof, { recursive: true, force: true }), 300); },
  };
}
