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
// 局域网、本机的地址：localhost、127/8、10/8、172.16/12、192.168/16、169.254/16、IPv6 的 ::1、fc00::/7、fe80::/10，
// .local / .lan / .home.arpa 结尾的名字和不带点的单段主机名。只有这些可以走 http / ws（局域网里自建的 PeerServer 多半没有证书）
export function isLanHost(host) {
  const h = String(host || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!h) return false;
  const v4 = /^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(h);
  if (v4) { const a = +v4[1], b = +v4[2]; return a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254); }
  if (h.includes(':')) return h === '::1' || /^f[cd][0-9a-f]{2}:/.test(h) || /^fe[89ab][0-9a-f]:/.test(h);
  return h === 'localhost' || /\.(localhost|local|lan|home\.arpa)$/.test(h) || (/^[a-z0-9-]+$/.test(h) && !/^\d+$/.test(h));
}
// 走不走 TLS（wss）：互联网上的信令服务器一律走，端口填的是 80、8080 也一样；局域网地址只有页面本身是 https 时才走（https 页面连不了 ws）
export const sigSecure = (host, proto = typeof location !== 'undefined' ? location.protocol : '') => !isLanHost(host) || proto === 'https:';   // proto 默认是这个页面的，测试可以传
const defPort = host => sigSecure(host) ? 443 : 80;   // 没写端口时：走 TLS 的 443，局域网 http 的 80
let SIG_DEPLOY = null;   // peer-config.json 里读到的 { host, port, path }
// 启动时读一次部署给的默认；读不到（GitHub Pages 没有这个文件、file:// 打开）就当没有，不报错
export async function sigInit() {
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
  try {
    const r = await fetch('peer-config.json', { cache: 'no-store' });
    if (!r.ok) return;
    const c = await r.json();
    if (!c || !isHost(c.host)) return;
    // 没写端口、信令又和网站同一个域名（docker compose 的默认）：用网站自己的端口，部署在非 443 端口上也连得对；
    // 网址里也没写端口（默认端口）时按走不走 TLS 定：局域网 http 页面是 80，别的 443
    const port = +c.port || (c.host === location.hostname && +location.port) || defPort(c.host);
    SIG_DEPLOY = { host: c.host, port, path: typeof c.path === 'string' ? c.path : '/' };
  } catch (e) { }
}
// 用户在「联机设置和测试」里填的地址整理成 { host, port, path }：去掉 https:// 和路径以外的部分，端口、路径兜底；域名不对返回 null
export function sigNormalize(host, port, path) {
  const h = String(host || '').trim().replace(/^(wss?|https?):\/\//, '').replace(/\/.*$/, '');
  if (!isHost(h)) return null;
  const p = String(path || '/').trim() || '/';
  return { host: h, port: Math.min(65535, Math.max(1, Math.round(+port) || defPort(h))), path: p.startsWith('/') ? p : '/' + p };
}
// 这台设备上选的：{ mode: 'auto' | 'public' | 'custom', host, port, path }；auto = 跟着网站的默认走
export const sigSaved = () => { try { const v = JSON.parse(localStorage.getItem(SIG_KEY) || 'null'); return v && typeof v === 'object' ? v : { mode: 'auto' }; } catch (e) { return { mode: 'auto' }; } };
export function sigSave(v) { try { if (!v || v.mode === 'auto') localStorage.removeItem(SIG_KEY); else localStorage.setItem(SIG_KEY, JSON.stringify(v)); } catch (e) { } }
// 现在实际用哪个：{ host（null = 公共）, port, path, src: 'url' | 'device' | 'deploy' | 'public' }
export function sigConf() {
  // 网址参数和设置里填的一样过一遍 sigNormalize：域名不对（带了别的字符、空的）就当没写，接着看下面几项
  const q = new URLSearchParams(location.search), url = q.get('peerhost') && sigNormalize(q.get('peerhost'), q.get('peerport'), q.get('peerpath'));
  if (url) return { ...url, src: 'url' };
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
