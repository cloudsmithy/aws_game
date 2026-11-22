import { _t, _tf } from '../core/01-i18n-runtime.js';
// ================= 联机：信令服务器（公共 PeerJS 还是自建的） =================
// 用哪个，按顺序看：
//   1. 网址参数 ?peerhost=域名（&peerport= &peerpath=），给链接的人定死；
//   2. 这台设备上「联机设置和测试」里选的（localStorage，只管这台设备）；
//   3. 部署给的默认：网站根目录有 peer-config.json（deploy/peerjs 的 docker compose 会提供）就走自建；
//   4. 都没有（GitHub Pages、直接打开 index.html）：PeerJS 公共服务器 0.peerjs.com。
// 房主和所有玩家、观众要连同一个信令服务器才找得到房间，联机面板上会写出现在用的是哪个。
const SIG_KEY = 'aws-tycoon-signal';
export const SIG_PUBLIC = '0.peerjs.com';
const PUBLIC = { host: null, port: 443, path: '/' };
const isHost = h => typeof h === 'string' && /^[A-Za-z0-9.-]+$/.test(h);
let SIG_DEPLOY = null;   // peer-config.json 里读到的 { host, port, path }
// 启动时读一次部署给的默认；读不到（GitHub Pages 没有这个文件、file:// 打开）就当没有，不报错
export async function sigInit() {
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
  try {
    const r = await fetch('peer-config.json', { cache: 'no-store' });
    if (!r.ok) return;
    const c = await r.json();
    if (!c || !isHost(c.host)) return;
    // 没写端口、信令又和网站同一个域名（docker compose 的默认）：用网站自己的端口，部署在非 443 端口上也连得对
    const port = +c.port || (c.host === location.hostname && +location.port) || 443;
    SIG_DEPLOY = { host: c.host, port, path: typeof c.path === 'string' ? c.path : '/' };
  } catch (e) { }
}
// 用户在「联机设置和测试」里填的地址整理成 { host, port, path }：去掉 https:// 和路径以外的部分，端口、路径兜底；域名不对返回 null
export function sigNormalize(host, port, path) {
  const h = String(host || '').trim().replace(/^(wss?|https?):\/\//, '').replace(/\/.*$/, '');
  if (!isHost(h)) return null;
  const p = String(path || '/').trim() || '/';
  return { host: h, port: Math.min(65535, Math.max(1, Math.round(+port) || 443)), path: p.startsWith('/') ? p : '/' + p };
}
// 这台设备上选的：{ mode: 'auto' | 'public' | 'custom', host, port, path }；auto = 跟着网站的默认走
export const sigSaved = () => { try { const v = JSON.parse(localStorage.getItem(SIG_KEY) || 'null'); return v && typeof v === 'object' ? v : { mode: 'auto' }; } catch (e) { return { mode: 'auto' }; } };
export function sigSave(v) { try { if (!v || v.mode === 'auto') localStorage.removeItem(SIG_KEY); else localStorage.setItem(SIG_KEY, JSON.stringify(v)); } catch (e) { } }
// 现在实际用哪个：{ host（null = 公共）, port, path, src: 'url' | 'device' | 'deploy' | 'public' }
export function sigConf() {
  const q = new URLSearchParams(location.search), h = q.get('peerhost');
  if (h) return { host: h, port: +(q.get('peerport') || 443), path: q.get('peerpath') || '/', src: 'url' };
  const s = sigSaved();
  if (s.mode === 'public') return { ...PUBLIC, src: 'device' };
  const own = s.mode === 'custom' && sigNormalize(s.host, s.port, s.path);
  if (own) return { ...own, src: 'device' };
  if (SIG_DEPLOY) return { ...SIG_DEPLOY, src: 'deploy' };
  return { ...PUBLIC, src: 'public' };
}
export const sigHost = () => sigConf().host || SIG_PUBLIC;
// 给联机面板、检测窗看的一句话
export function sigLabel() {
  const c = sigConf();
  const where = c.host ? _tf(5296, "自建 · {$0}", c.host + (c.port !== 443 ? ':' + c.port : '')) : _tf(5297, "公共 PeerJS（{$0}）", SIG_PUBLIC);
  const why = { url: _t(5298, "网址里指定的"), device: _t(5299, "这台设备上选的"), deploy: _t(5300, "网站默认"), public: _t(5301, "默认") }[c.src];
  return _tf(5302, "信令服务器：{$0}（{$1}）", where, why);
}
