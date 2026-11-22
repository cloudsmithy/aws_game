import { __rv, _t, _tf, _tr } from '../core/01-i18n-runtime.js';
import { $, esc } from '../core/02-util.js';
import { S } from '../engine/07-state.js';
import { ask, modalBlocks } from '../ui/10-modal.js';
import { toast } from '../ui/28-setup-save.js';
import { SIG_PUBLIC, sigHost, sigLabel, sigNormalize, sigSave, sigSaved } from './40a-signal.js';
import { MP } from './40-host-sync.js';
// ---- 联机设置和测试 ----
// 中继服务器（TURN）存在这台设备的 localStorage 里，不进存档、不随状态同步。urls 一行一个，可以写多个（比如 turn:…:3478 和 turns:…:443?transport=tcp）
const MP_STUN = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }];
// PeerJS 库默认带的两个免费中继（2023-12 PeerJS 宣布停掉，2026-11 查它的权威 DNS 是 NXDOMAIN）。用户要求照旧带上：哪天恢复了或者别的网络能解析，就能用上
export const MP_PEERJS_TURN = { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' };
function mpTurn() { try { const t = JSON.parse(localStorage.getItem('amono-turn') || 'null'); return t && t.urls && t.urls.length ? t : null; } catch (e) { return null; } }
// 中继写错了（turn: 没填用户名密码、端口不是数字……）浏览器建连接时直接抛错，PeerJS 不接，建房、加入会卡死：这里先用构造函数验一遍，验不过的不用
export function mpTurnEntry(t = mpTurn()) {
  if (!t) return null;
  const e = { urls: t.urls, username: t.username || undefined, credential: t.credential || undefined };
  try { new RTCPeerConnection({ iceServers: [e] }).close(); return e; } catch (x) { return null; }
}
const mpTurnErr = e => /username|credential/i.test(e.message || '') ? _t(5045, "turn: / turns: 地址要同时填用户名和密码") : _tf(5046, "地址写得不对：{$0}（格式像 turn:turn.example.com:3478）", esc(e.message || String(e)));
const mpMask = ip => /^\d+\.\d+\.\d+\.\d+$/.test(ip || '') ? ip.replace(/\.\d+\.\d+$/, '.x.x') : /:/.test(ip || '') ? ip.split(':').slice(0, 2).join(':') + ':…' : ip || '';
// 收集 ICE 候选：policy 'relay' 时只要中继候选。iceServers 写错（比如地址不是 stun: / turn: 开头）构造时就会抛错
async function mpGather(iceServers, policy = 'all', ms = 8000) {
  const pc = new RTCPeerConnection({ iceServers, iceTransportPolicy: policy }), out = [];
  try {
    pc.createDataChannel('probe');
    const done = new Promise(r => { const t = setTimeout(r, ms); pc.onicecandidate = e => { if (e.candidate && e.candidate.candidate) out.push(e.candidate); else if (!e.candidate) { clearTimeout(t); r(); } }; pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); r(); } }; });
    await pc.setLocalDescription(await pc.createOffer()); await done;
  } finally { try { pc.close(); } catch (e) { } }
  return out.map(c => { const f = c.candidate.split(' '); return { fd: c.foundation || f[0].replace(/^candidate:/, ''), type: c.type || f[7], proto: (c.protocol || f[2] || '').toLowerCase(), addr: c.address || f[4], port: +(c.port || f[5]), rport: +(c.relatedPort || (f.includes('rport') ? f[f.indexOf('rport') + 1] : 0)) }; });
}
// 起一个测试用的 Peer，等它连上信令服务器；返回 [peer, 毫秒]
function mpOpenPeer(ms = 10000) {
  return new Promise((res, rej) => {
    const t0 = performance.now(), peer = new Peer(undefined, MP.peerOpts());
    const tm = setTimeout(() => { try { peer.destroy(); } catch (e) { } rej(Object.assign(new Error('timeout'), { type: 'timeout' })); }, ms);
    peer.on('open', () => { clearTimeout(tm); res([peer, Math.round(performance.now() - t0)]); });
    peer.on('error', e => { clearTimeout(tm); try { peer.destroy(); } catch (x) { } rej(e); });
  });
}
let MP_ERR = __rv(() => ({ network: _t(5047, "连不上信令服务器（网络断了，或者这个网络挡了它）"), 'server-error': _t(5048, "信令服务器出错或满了"), 'socket-error': _t(5049, "和信令服务器的 WebSocket 连接出错"), 'socket-closed': _t(5050, "信令服务器把连接断开了"), 'ssl-unavailable': _t(5051, "信令服务器的 HTTPS 不可用"), 'browser-incompatible': _t(5052, "这个浏览器不支持 WebRTC"), webrtc: _t(5053, "浏览器的 WebRTC 出错"), timeout: _t(5054, "等了 10 秒没回应") }), v => { MP_ERR = v; }, () => MP_ERR);
let MPNET_RUN = 0;
export async function mpNetTest() {
  const run = ++MPNET_RUN, box = $('#mpnet'); if (!box) return;
  const btn = $('#mpnetgo'); if (btn) btn.disabled = true;
  const rows = [['sig', _tf(5055, "信令服务器（{$0}）", esc(sigHost()))], ['loop', _t(5056, "本机点对点（这个浏览器自己连自己）")], ['stun', _t(5057, "公网地址（STUN）")], ['turn', _t(5058, "中继服务器（TURN）")]];
  box.innerHTML = `<table class="mpnet">${rows.map(([k, n]) => _tf(5059, "<tr id=\"mpn_{$0}\"><th>{$1}</th><td class=\"st\">等待</td><td class=\"dt\"></td></tr>", k, n)).join('')}</table><div id="mpnetsum" class="mpnetsum" aria-live="polite"></div>`;
  const set = (k, ok, st, dt) => { const r = $('#mpn_' + k); if (!r || run !== MPNET_RUN) return; r.className = ok == null ? 'run' : ok ? 'ok' : ok === 0 ? 'mid' : 'bad'; r.querySelector('.st').textContent = st; r.querySelector('.dt').innerHTML = dt || ''; };
  const R = {};
  // 1. 信令：连上 PeerJS 服务器，拿到一个临时 ID
  set('sig', null, _t(5060, "检测中…"));
  let A = null, B = null;
  try { const [pa, t] = await mpOpenPeer(); A = pa; R.sig = true; set('sig', true, _t(5061, "通"), _tf(5062, "{$0} 毫秒连上，房间号就是在这里登记的", t)); }
  catch (e) { R.sig = false; set('sig', false, _t(5063, "不通"), _tf(5064, "{$0}。所有人都连不上它的话，创建和加入房间都会失败", MP_ERR[e.type] || esc(e.message || String(e)))); }
  // 2. 本机点对点：同一个页面里再起一个 Peer 连过去，走一遍真实的「加入」流程（信令交换 + 打洞 + 数据通道），回一个 ping
  set('loop', null, R.sig ? _t(5060, "检测中…") : _t(2926, "跳过"));
  if (R.sig) {
    try {
      const [pb] = await mpOpenPeer(); B = pb;
      A.on('connection', c => c.on('data', d => c.send(d)));
      const c = B.connect(A.id, { reliable: true });
      await new Promise((res, rej) => { const tm = setTimeout(() => rej(new Error('timeout')), 12000); c.on('open', () => { clearTimeout(tm); res(); }); c.on('error', e => { clearTimeout(tm); rej(e); }); B.on('error', e => { clearTimeout(tm); rej(e); }); });
      const t0 = performance.now(); c.send({ ping: 1 });
      await new Promise((res, rej) => { const tm = setTimeout(() => rej(new Error('timeout')), 5000); c.on('data', () => { clearTimeout(tm); res(); }); });
      let via = '';
      try { const st = await c.peerConnection.getStats(); let pair = null; st.forEach(x => { if (x.type === 'candidate-pair' && (x.selected || x.nominated) && x.state === 'succeeded') pair = pair || x; }); const lc = pair && st.get(pair.localCandidateId); via = lc ? { host: _t(5065, "走的是本机直连"), srflx: _t(5066, "走的是公网地址"), prflx: _t(5066, "走的是公网地址"), relay: _t(5067, "走的是中继") }[lc.candidateType] || '' : ''; } catch (e) { }
      R.loop = true; set('loop', true, _t(5061, "通"), _tf(5068, "数据通道打开，往返 {$0} 毫秒{$1}", Math.round(performance.now() - t0), via ? _t(2698, "，") + via : ''));
    } catch (e) { R.loop = false; if (e && MP_ERR[e.type] && e.type !== 'webrtc' && e.type !== 'timeout') { R.loopSig = true; set('loop', false, _t(5069, "没测成"), _tf(5070, "第二个测试连接没登记上信令服务器：{$0}。过一会儿再点「开始检测」", MP_ERR[e.type])); } else set('loop', false, _t(5063, "不通"), _t(5071, "信令通了，这台设备自己连自己却打不通。最常见是公司网络或 VPN 挡了局域网发现（mDNS），浏览器拿不到本机地址；也可能是插件或浏览器设置禁了 WebRTC。关掉 VPN、换到手机热点再测；用 Chrome 的话，也可以在 chrome://flags 里把「Anonymize local IPs exposed by WebRTC」改成 Disabled 再试")); }
  }
  [A, B].forEach(x => { try { x && x.destroy(); } catch (e) { } });
  // 3. STUN：拿公网地址；两台 STUN 服务器看到的端口不一样 = 对称型 NAT，跨网络直连基本打不通
  set('stun', null, _t(5060, "检测中…"));
  try {
    // 只看 IPv4：双栈网络的 IPv6 srflx 就是本机地址，混进来会误判。按 foundation 分组（同一个本地端口发出去的），不按 rport：默认开着 mDNS 时 rport 都是 0
    const srf = a => a.filter(x => x.type === 'srflx' && x.proto === 'udp' && !String(x.addr).includes(':'));
    const [all, ...solo] = await Promise.all([mpGather(MP_STUN), ...MP_STUN.map(x => mpGather([x]))]);
    const c = srf(all), heard = solo.filter(a => srf(a).length).length;
    if (!c.length) { R.stun = false; set('stun', false, _t(5072, "拿不到"), _t(5073, "这个网络挡了 UDP 或 STUN（公司网、部分校园网常见）。同一个 Wi-Fi 里的设备还能连，跨网络要靠中继")); }
    else {
      const byBase = {}; c.forEach(x => (byBase[x.fd] = byBase[x.fd] || new Set()).add(x.addr + ':' + x.port));
      R.sym = Object.values(byBase).some(v => v.size > 1); R.stun = true; R.symUnk = !R.sym && heard < MP_STUN.length;
      set('stun', R.sym || R.symUnk ? 0 : true, R.sym ? _t(5074, "能拿到，但是对称型 NAT") : R.symUnk ? _t(5075, "能拿到，只有一台 STUN 回了") : _t(5061, "通"),
        _tf(5079, "公网地址 {$0}{$1}", esc(mpMask(c[0].addr)), R.sym ? _t(5076, "。两台 STUN 服务器看到的公网地址或端口不一样：每连一个对象换一个出口，跨网络直连基本打不通，要靠中继") : R.symUnk ? _t(5077, "。另一台 STUN 服务器没回应，比不了两边看到的地址，判断不了是不是对称型 NAT；跨网络能不能直连要实际试一次") : _t(5078, "。两台 STUN 服务器看到的一样，跨网络直连多半能打通")));
    }
  } catch (e) { R.stun = false; set('stun', false, _t(5080, "出错"), esc(e.message || String(e))); }
  // 4. TURN：只用这台设备填的中继收集 relay 候选。PeerJS 自带的两个免费中继已经下线，不测
  const t = mpTurn();
  if (!t) {
    // 没填自己的中继：测 PeerJS 自带的那两个，看这台设备现在能不能用上
    set('turn', null, _t(5060, "检测中…"));
    let pj = []; try { pj = (await mpGather([MP_PEERJS_TURN], 'relay', 8000)).filter(x => x.type === 'relay'); } catch (e) { }
    R.turn = pj.length ? true : null;
    set('turn', pj.length ? true : 0, pj.length ? _t(5081, "PeerJS 自带的能用") : _t(5082, "没配置"), pj.length ? _tf(5083, "PeerJS 自带的免费中继这台设备能连上，拿到 {$0} 个中继地址，直连不通时会自动走它", pj.length) : _t(5084, "PeerJS 自带的免费中继（eu-0 / us-0.turn.peerjs.com）这台设备连不上：PeerJS 在 2023 年 12 月宣布停掉了，域名现在查不到。跨网络连不上时，在下面填一个自己的中继服务器"));
  }
  else {
    set('turn', null, _t(5060, "检测中…"));
    try { const c = (await mpGather([{ urls: t.urls, username: t.username || undefined, credential: t.credential || undefined }], 'relay', 10000)).filter(x => x.type === 'relay'); R.turn = c.length > 0; set('turn', R.turn, R.turn ? _t(5061, "通") : _t(5063, "不通"), R.turn ? _tf(5085, "拿到 {$0} 个中继地址（{$1}），直连打不通时会自动走中继", c.length, [...new Set(c.map(x => x.proto))].join(' / ')) : _t(5086, "没拿到中继地址：检查地址、用户名、密码，或者这个网络挡了中继的端口（可以加一个 turns:…:443?transport=tcp 的地址）")); }
    catch (e) { R.turn = false; set('turn', false, _t(5087, "设置不对"), mpTurnErr(e)); }
  }
  if (run !== MPNET_RUN || !$('#mpnetsum')) return;
  // 结论：按最先卡住的那一步说怎么办
  const sum = !R.sig ? _t(5088, "<b>卡在信令服务器。</b>这台设备连不上 PeerJS 服务器，房间建不起来也加不进去。换个网络（比如手机热点）再试；公司网络挡了的话，可以自建 PeerServer，开网页时在地址后面加 <code>?peerhost=你的服务器</code>。")
    : !R.loop && R.loopSig ? _t(5089, "<b>没测完。</b>信令服务器一时出错，本机点对点没测成。过一会儿再点「开始检测」。")
    : !R.loop ? _tf(5091, "<b>卡在点对点。</b>这台设备现在连自己都打不通，和别的设备直连也不会通。先关掉 VPN、连手机热点再测一次；还不通就换个浏览器、关掉拦 WebRTC 的插件。{$0}", R.turn ? '' : R.sym || !R.stun ? _t(5090, "这个网络还是对称型 NAT 或挡了 STUN，跨网络直连也打不通，只能靠中继服务器。") : '')
    : R.turn ? _t(5092, "<b>都通了。</b>同一个网络里直接连；跨网络直连打不通时会自动走你配的中继。另一台设备也测一下，最好填同一套中继。")
    : R.symUnk ? _t(5093, "<b>同一个网络能玩，跨网络说不准。</b>只有一台 STUN 服务器有回应，判断不了这个网络是不是对称型 NAT。跨网络先实际连一次，连不上就在下面配一个中继服务器（TURN），每台设备都填上。")
    : R.stun && !R.sym ? _t(5094, "<b>基本没问题。</b>同一个 Wi-Fi 或手机热点里肯定能连；跨网络多半也能直连。真连不上，再在下面配一个中继服务器。")
    : _t(5095, "<b>同一个网络能玩，跨网络大概率不行。</b>让所有设备连同一个 Wi-Fi 或同一个手机热点（公司网络、开着 VPN 的设备最好换热点）。一定要跨网络，就在下面配一个中继服务器（TURN），每台设备都填上。");
  $('#mpnetsum').innerHTML = sum + _t(5096, "<p class=\"muted\">另一台设备也要打开这个窗口测一次：两边各卡在哪一步，决定能不能连上。</p>");
  if (btn) btn.disabled = false;
}
export function mpTurnSave(clear) {
  if (clear) { try { localStorage.removeItem('amono-turn'); } catch (e) { } ['#turnurls', '#turnuser', '#turnpass'].forEach(k => { const el = $(k); if (el) el.value = ''; }); toast(_t(5097, "已清除中继服务器设置")); return; }
  const urls = ($('#turnurls').value || '').split(_tr(5098, "[\\s,，]+", "")).map(x => x.trim()).filter(Boolean);
  const bad = urls.filter(u => !/^(turns?|stuns?):/i.test(u));
  if (bad.length) { $('#turnmsg').innerHTML = _tf(5099, "<span class=\"warn\">{$0} 不对：要以 turn: 或 turns: 开头，比如 turn:turn.example.com:3478</span>", esc(bad[0])); return; }
  if (!urls.length) return mpTurnSave(true);
  const user = $('#turnuser').value.trim(), pass = $('#turnpass').value;
  try { new RTCPeerConnection({ iceServers: [{ urls, username: user || undefined, credential: pass || undefined }] }).close(); }
  catch (e) { $('#turnmsg').innerHTML = `<span class="warn">${mpTurnErr(e)}</span>`; return; }
  try { localStorage.setItem('amono-turn', JSON.stringify({ urls, username: user, credential: pass })); }
  catch (e) { $('#turnmsg').innerHTML = _t(5100, "<span class=\"warn\">没存上：这个浏览器不让网页存数据（无痕模式、存储满了或被禁用）。换个浏览器窗口再填</span>"); return; }
  $('#turnmsg').innerHTML = _tf(5103, "<span class=\"muted\">已保存在这台设备上，{$0}。点上面「开始检测」测一下能不能拿到中继地址。</span>", MP.role ? _t(5101, "下次创建或加入房间时生效") : _t(5102, "创建或加入房间时就会用上"));
}
// 「联机设置和测试」里的信令服务器一节：现在用哪个，加上这台设备的选择（跟着网站 / 公共 / 自建）
function sigFormHtml() {
  const v = sigSaved(), opt = (val, name) => `<option value="${val}"${(v.mode || 'auto') === val ? ' selected' : ''}>${name}</option>`;
  return `<h4>${_t(5304, "信令服务器")}</h4>
    <p class="muted">${_t(5305, "房间号登记在信令服务器上：房主、玩家、观众要用同一个才找得到房间。默认跟着网站走：GitHub Pages 上是 PeerJS 公共服务器，自己用 docker compose 部署的是自建的。只存在这台设备上。")}</p>
    <p id="sigcur"><b>${esc(sigLabel())}</b></p>
    <div class="mpturn"><label><select id="sigmode">${opt('auto', _t(5306, "跟着网站默认"))}${opt('public', _tf(5297, "公共 PeerJS（{$0}）", SIG_PUBLIC))}${opt('custom', _t(5307, "自建"))}</select></label>
    <label>${_t(5308, "域名")}<input id="sighost" autocomplete="off" spellcheck="false" placeholder="peer.example.com" value="${esc(v.host || '')}"></label>
    <label>${_t(5309, "端口")}<input id="sigport" type="number" min="1" max="65535" value="${esc(String(v.port || 443))}"></label>
    <label>${_t(5310, "路径")}<input id="sigpath" autocomplete="off" spellcheck="false" value="${esc(v.path || '/')}"></label>
    <div class="btns"><button type="button" class="sm" data-act="mpSigSave">${_t(5113, "保存")}</button></div><div id="sigmsg"></div></div>`;
}
// 保存这台设备选的信令服务器；联机中改了要下次建房、加入才生效
export function mpSigSave() {
  const mode = $('#sigmode').value, own = mode === 'custom' && sigNormalize($('#sighost').value, $('#sigport').value, $('#sigpath').value);
  if (mode === 'custom' && !own) { $('#sigmsg').innerHTML = `<span class="warn">${_t(5311, "填信令服务器的域名，比如 peer.example.com（不带 https://）")}</span>`; return; }
  sigSave(own ? { mode, ...own } : { mode });
  $('#sigcur').innerHTML = `<b>${esc(sigLabel())}</b>`;
  $('#sigmsg').innerHTML = `<span class="muted">${MP.role ? _t(5101, "下次创建或加入房间时生效") : _t(5102, "创建或加入房间时就会用上")}</span>`;
  document.querySelectorAll('.mpsig').forEach(el => { el.textContent = sigLabel(); });   // 表单下面、大厅里那一行跟着改
}
export function mpNetDialog() {
  if (modalBlocks()) return;
  const t = mpTurn() || {};
  ask({ local: true, cancelable: true, cls: 'wide', title: _t(5104, "联机设置和测试"), html: `<p>${_t(5105, "联机走 PeerJS：先连信令服务器登记房间号，再在两台设备之间直接打通一条点对点的数据通道，之后的画面同步都不经过服务器。直连打不通（不在同一个网络、公司网络、VPN）就要靠中继服务器转一手。")}</p>
    <div class="mpnetbar"><button type="button" id="mpnetgo" class="pri" data-act="mpNetTest">${_t(5106, "开始检测")}</button>${_t(5107, "<span class=\"muted\">大约 20 秒。只测这台设备，不会建房间</span>")}</div>
    <div id="mpnet"></div>
    ${sigFormHtml()}
    <h4>${_t(5108, "中继服务器（TURN，可选）")}</h4>
    <p class="muted">${_t(5109, "PeerJS 原来带的免费中继已经下线。可以用 Cloudflare、Twilio 这类按流量计费的 TURN 服务，或者自己架一台 coturn。只存在这台设备上，不会发给别人；用户名和密码别截图外传。")}</p>
    <div class="mpturn"><label>${_t(5110, "地址（一行一个）")}<textarea id="turnurls" rows="2" spellcheck="false" autocomplete="off" placeholder="turn:turn.example.com:3478&#10;turns:turn.example.com:443?transport=tcp">${esc((t.urls || []).join('\n'))}</textarea></label>
    <label>${_t(5111, "用户名")}<input id="turnuser" autocomplete="off" spellcheck="false" value="${esc(t.username || '')}"></label><label>${_t(5112, "密码")}<input id="turnpass" type="password" autocomplete="off" value="${esc(t.credential || '')}"></label>
    <div class="btns"><button type="button" class="sm" data-act="mpTurnSave">${_t(5113, "保存")}</button><button type="button" class="sm" data-act="mpTurnSave" data-arg="true">${_t(5114, "清除")}</button></div><div id="turnmsg"></div></div>`,
    buttons: [{ label: _t(2610, "关闭"), value: false }] }).then(() => { MPNET_RUN++; });
}
export function mpHostName() {
  const hn = $('#mphname'), n0 = $('#nm0'); if (!hn || !n0) return;
  const v = hn.value.trim(); if (!v || n0.value === v) return;
  n0.value = v; n0.dispatchEvent(new Event('input', { bubbles: true })); n0.dispatchEvent(new Event('change', { bubbles: true }));
}
export function mpUI(kind) {
  const box = $('#mpbox');
  if (kind === 'host') { box.innerHTML = `<div class="mpform"><label>${_t(5115, "房间密码")} <input id="mppwd" type="password" maxlength="32" autocomplete="off" placeholder="${_t(5116, "至少 4 位")}"></label><label>${_t(5117, "你的名字")} <input id="mphname" maxlength="12" autocomplete="off" placeholder="${_t(4999, "玩家 1")}"></label><label class="mp-watch-option" title="允许观众在开赛前进入大厅，观战邀请码与玩家密码分开"><input id="mpallowwatch" type="checkbox">开启受邀观战</label><button class="pri" data-act="mpHostGo">${_t(5118, "创建房间")}</button></div><div id="mpstat"></div>`;
    // 房主的名字就是玩家 1 的名字：两个框填的是同一个，这里改了写回名字栏（照常存进开局设置），大厅名单跟着改
    const hn = $('#mphname'), n0 = $('#nm0'); if (n0 && !_tr(5119, "^玩家 ?1$", "").test(n0.value.trim())) hn.value = n0.value;
    hn.addEventListener('input', () => { mpHostName(); if (MP.role === 'host' && !(S && S.players)) MP.renderLobby(); });
    // 反过来：在上面名字栏里改玩家 1 的名字，这个框也跟着变（#names 每次重画都还是同一个容器，挂一次就行）
    const nb = $('#names'); if (nb && !nb._mpn) { nb._mpn = true; nb.addEventListener('input', e => { const h = $('#mphname'); if (e.target.id === 'nm0' && h && document.activeElement !== h) { h.value = e.target.value; if (MP.role === 'host' && !(S && S.players)) MP.renderLobby(); } }); } }
  else box.innerHTML = `<div class="mpform"><label>${_t(5120, "房间号")} <input id="mproom" maxlength="6" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" style="text-transform:uppercase;width:7.5em"></label><label>${_t(5266, "加入身份")} <select id="mpmode"><option value="player">${_t(3861, "玩家")}</option><option value="spectator">${_t(5236, "受邀观战")}</option></select></label><label>${_t(5267, "房间密码 / 观战邀请码")} <input id="mppwd" type="password" maxlength="32" autocomplete="off"></label><label>${_t(5117, "你的名字")} <input id="mpname" maxlength="12"></label><button class="pri" data-act="mpJoinGo">${_t(5121, "加入")}</button></div><div id="mpstat"></div>`;
  box.insertAdjacentHTML('beforeend', `<p class="muted mpsig">${esc(sigLabel())}</p>`);   // 现在连的是公共还是自建的信令服务器
  if (kind !== 'host') { let lj = null; try { lj = JSON.parse(sessionStorage.getItem('aws-tycoon-lastjoin')); } catch (e) { } if (lj && typeof lj.room === 'string') { $('#mproom').value = lj.room.slice(0, 6); $('#mpname').value = String(lj.name || '').slice(0, 12); $('#mpmode').value = lj.watching ? 'spectator' : 'player'; $('#mppwd').focus(); } }
}

