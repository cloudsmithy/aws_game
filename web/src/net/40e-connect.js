import { _t, _tf } from '../core/01-i18n-runtime.js';
import { $, esc } from '../core/02-util.js';
import { wbLoad } from '../rules/06-qbank.js';
import { S } from '../engine/07-state.js';
import { info } from '../ui/10-modal.js';
import { render } from '../ui/27d-side.js';
import { toast } from '../ui/28-setup-save.js';
import { MP } from './40-host-sync.js';
import { MPFX } from './41-replay.js';
Object.assign(MP, {
  async host(pwd, allowWatching = false) {
    if (!this.ready()) return;
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    this.room = Array.from({ length: 6 }, () => A[Math.floor(Math.random() * A.length)]).join('');
    this.auth = await this.hash(this.room + ':' + pwd);
    this.viewers = {}; this.pendingJoins = {}; this.watchToken = ''; this.watching = false;
    $('#mpstat').innerHTML = _t(5006, "<span class=\"muted\">正在创建房间…</span>");
    this.hosting = true;   // resumeGame 用它分清「房间还在创建」和「正在加入」
    if (this.peer && !this.role) { try { this.peer.destroy(); } catch (e) { } }   // 上次没建成（连不上信令服务器）又点了一次：旧的 Peer 关掉，免得留着好几个
    // opened 挂在这一个 Peer 上：重试时新建的 Peer 有自己的第一次 open，旧 Peer 迟到的重连计时器也认得出不是自己
    const peer = this.peer = new Peer('amono-' + this.room.toLowerCase(), this.peerOpts()); let opened = false, idLost = false;
    peer.on('open', () => {
      if (peer !== this.peer) return;
      // 断开后重连成功会再来一次 open：只在第一次排座位，不然对局中会把座位重新排一遍
      if (opened) { this.reN = 0; if (!(S && S.players)) this.renderLobby(); else toast(_t(5007, "联机服务器连回来了，掉线的人可以重新加入")); return; }
      opened = true; this.reN = 0; this.role = 'host'; this.watchToken = allowWatching === true ? this.newKey() : ''; this.renderLobby(); if (S && S.players && !S.over) this.reseat();   // 读档比房间建好早：这时再按存档排联机座位
    });
    this.peer.on('connection', conn => {
      if (peer !== this.peer || this.role !== 'host') { conn.close(); return; }
      this.watch(conn);
      conn.on('data', m => this.onHostMsg(conn, m));
      // 掉线时正开着等他选的弹窗：把「对方掉线了，我来替他选」露出来
      conn.on('close', () => this.onHostClose(conn));
    });
    // 和信令服务器断开（Wi-Fi 抖动、换网络、服务器重启）：已经连着的人照常玩，可这之后掉线的人就连不回来了（「找不到这个房间」），所以自己重连，间隔 2、4、8、16、30 秒。
    // 每次重连失败都会再来一对 error(network) + disconnected：只在第一次断开时提示，连回来再说一声
    peer.on('disconnected', () => {
      if (peer !== this.peer || peer.destroyed || !opened) return;   // 房间还没建成就断了：PeerJS 自己会销毁这个 Peer，提示走下面的 error
      this.reN = (this.reN || 0) + 1;
      if (this.reN === 1) { if (S && S.players) toast(_t(5010, "和联机服务器断开了，正在重连；这期间掉线的人暂时进不来"), 5000); else { this.renderLobby(); $('#mpstat').insertAdjacentHTML('beforeend', _t(5011, "<p class=\"warn\">和联机服务器断开了，正在重连；这期间新来的人进不了房间</p>")); } }
      clearTimeout(this.reT); this.reT = setTimeout(() => { if (peer === this.peer && !peer.destroyed && peer.disconnected) { try { peer.reconnect(); } catch (e) { } } }, Math.min(30000, 1000 * 2 ** this.reN));
    });
    peer.on('error', e => {
      if (peer !== this.peer) return;
      if (opened && ['network', 'server-error', 'socket-error', 'socket-closed'].includes(e.type)) return;   // 建好房间以后的断线：上面 disconnected 在重连、也提示过了
      // 断开的空档里房间号恰好被别人占了：重连也回不来，只能换个房间（对局中写进 #mpstat 看不到，弹一次 toast）
      if (opened && e.type === 'unavailable-id' && S && S.players) { if (!idLost) { idLost = true; toast(_t(5012, "房间号失效了，掉线的人进不来：刷新页面、重新创建房间，再点「继续上一局」，把新房间号发给大家"), 8000); } return; }
      $('#mpstat').innerHTML = _tf(5014, "<span class=\"warn\">联机出错：{$0}{$1}</span>", esc(e.type || e.message || String(e)), e.type === 'network' || e.type === 'server-error' ? _t(5013, "。公司网络可能拦了连接，换个网络或用 ?peerhost= 指定自建服务器") : '');
      // 房间没建成：「创建房间」能再点。建成以后别恢复，再点会在原房间上又建一个，把 this.peer 换掉
      if (this.role !== 'host') { const hb = $('#mpbox .mpform button'); if (hb) hb.disabled = false; }
    });
  },
  async join(room, pwd, name, auth, watching = this.watching) {
    if (!this.ready()) return;
    room = room.trim().toUpperCase();
    // 上一次没连上又点了「加入」：旧连接先解绑（它迟到的 close 不再算数），旧 Peer 关掉，免得重试时留下好几个
    if (this.peer && (!this.role || this.gone)) { this.hostConn = null; try { this.peer.destroy(); } catch (e) { } }
    this.watching = !!watching; if (this.watching && !this.gone) this.invite = pwd.trim();
    this.room = room; this.auth = this.watching ? '' : auth || await this.hash(room + ':' + pwd); this.myName = name.trim().slice(0, 12) || _t(3861, "玩家");
    if (!this.gone) $('#mpstat').innerHTML = _t(5015, "<span class=\"muted\">正在连接房间…</span>");
    this.hosting = false;
    // 还没被房主收下就失败了（房间号错、点对点打不通、信令服务器连不上）：写原因，「加入」能再点。已经在局里的不管：信令断了不影响数据通道
    const fail = html => { if (this.role === 'client') { if (this.gone && !this.kicked) this.retryLater(); return; } $('#mpstat').innerHTML = `<span class="warn">${html}</span>`; const jb = $('#mpbox .mpform button'); if (jb) jb.disabled = false; };
    const P2P = _t(5016, "连不上房主：两台设备之间的点对点连接没打通。换个网络（比如都连同一个手机热点）再点「加入」，或者 <button type=\"button\" class=\"sm\" data-act=\"mpNetDialog\">检测网络</button> 看看卡在哪一步、要不要配中继服务器");
    const peer = this.peer = new Peer(undefined, this.peerOpts());
    peer.on('open', () => {
      if (peer !== this.peer) return;   // 等 open 的时候又点了一次「加入」：这个 Peer 已经换掉了
      let conn; try { conn = peer.connect('amono-' + room.toLowerCase(), { reliable: true }); } catch (e) { fail(_t(5017, "联机出错：") + esc(e.message || String(e)) + _t(5018, "。点「联机设置和测试」检查中继服务器设置")); return; }
      this.hostConn = conn;
      // 兜底：25 秒还没连上（不支持 connectionState 的浏览器、一直卡在 checking）
      const tm = setTimeout(() => { if (this.hostConn === conn && !conn.open) { this.hostConn = null; try { conn.close(); } catch (e) { } fail(P2P); } }, 25000);
      // 打洞失败时 PeerJS 什么都不发（没 open 过的连接关掉不发 close；watch 先关了连接，negotiation-failed 也发不出来），自己盯着 failed。
      // 要排在 watch 前面：watch 一关连接，状态就成了 closed，排在后面看不到 failed
      const pc0 = conn.peerConnection; if (pc0) pc0.addEventListener('connectionstatechange', () => { if (pc0.connectionState === 'failed' && this.hostConn === conn && this.role !== 'client') { clearTimeout(tm); this.hostConn = null; fail(P2P); } });
      this.watch(conn);
      conn.on('error', () => { if (this.hostConn === conn && !this.role) { clearTimeout(tm); this.hostConn = null; fail(P2P); } });
      // 带上自己的错题本：局里给你出「再练一次」的题按你自己的来。keys：这个浏览器在这个房间里拿过的座位钥匙，开局后用同一个名字顶替还挂着在线的座位，房主只认这个
      conn.on('open', () => { clearTimeout(tm); this.send(conn, { t: 'hello', name: this.myName, mode: this.watching ? 'spectator' : 'player', ...(this.watching ? { invite: this.invite } : { auth: this.auth, wb: wbLoad(), keys: this.seatKeys(room) }), delta: 1, walk: 1 }); });
      conn.on('data', m => { if (this.hostConn === conn) this.onClientMsg(m); });
      // 局已结束、远端还开着战报或结束动画时只发 toast：modal() 会先关掉当前弹窗，正在看的战报会被打断（关了能点「查看战报」再开，但别替人关掉）
      // 断线提示是远端自己开的窗口（local）：不带的话正轮到电脑时会被当成电脑的弹窗，按钮灰掉、0.9 秒就被点掉，回原座位的说明一闪就没了
      // 被同一个浏览器的另一个页面接手了（kicked）：说清楚，不写成「房主关掉了页面」。连上了、还没被收下就断了：提示再点「加入」
      conn.on('close', () => { if (this.hostConn !== conn) return; if (this.gone && this.role === 'client' && !conn._ok) { clearTimeout(tm); this.hostConn = null; this.retryLater(); return; } if (!this.role) { clearTimeout(tm); this.hostConn = null; fail(_t(5019, "和房主的连接断开了，还没进房间。再点「加入」试试")); return; } if (this.role === 'client' && S && S.over && (!$('#modal').hidden || $('#endfx'))) toast(_t(5020, "房主已经离开。想再来一局，等房主建好新房间，拿新的房间号加入")); else if (this.role === 'client' && this.kicked && !this.removed) info(_t(5021, "这个页面不再连着房间"), _t(5022, "<p>你在这台设备的另一个页面里用同一个名字重新加入了，接着在那边玩就行。</p>"), true); else if (this.role === 'client' && this.removed) { /* 保留 removed 消息里的原因。 */ } else if (this.role === 'client' && S && S.players && !S.over) toast(_t(5023, "和房主断开了，正在自动重连…"), 4000); else if (this.role === 'client') info(_t(4964, "和房主断开了"), S && S.over ? _t(5024, "<p>这一局已经结束了。想再来一局，等房主建好新房间，拿新的房间号加入。</p>") : _tf(5025, "<p>房主关掉了页面或者网络断了。重新打开页面，用你在局里的名字{$0}加入，就能回到原来的座位。</p><p>房主那边刷新过的话房间号会变：房主重新创建房间、点「继续上一局」，你拿新的房间号用这个名字加入，谁先谁后都行。</p>", S && S.players[this.mySeat] ? _tf(2766, "「{$0}」", S.players[this.mySeat].name) : ''), true); if (this.role === 'client') { if (S && S.players) { this.gone = true; MPFX.cancel(); if (!$('#game').hidden) render(); if (!S.over && !this.kicked) { this.reN = 0; this.retryLater(); } } else this.role = null; } });   // 开局后 role 留着 'client'：清掉的话存档、结算、「再来一局」都按单机走，会改写甚至删掉这台设备自己的存档；gone 让自己的回合也锁住。还在大厅、没收到房主的局时没什么要护着的，照旧清掉身份：不然在这台设备上点「继续上一局」打自己的局，会被当成远端整个锁住，也不存档
    });
    // 已经进了房间、或者数据通道已经通了：信令服务器断开只发 network，数据通道还好好的，不管它（以前会把提示写进对局里看不到的 #mpstat）。换掉了的旧 Peer 也不管
    peer.on('error', e => { if (peer !== this.peer || (this.role === 'client' && !this.gone) || (this.hostConn && this.hostConn.open)) return; this.hostConn = null; fail(`${e.type === 'peer-unavailable' ? _t(5026, "找不到这个房间。检查一下房间号；房间号没错的话，可能是房主那边网络断了，过一会儿再试，或者请房主刷新后重新创建房间、点「继续上一局」") : _t(5017, "联机出错：") + esc(e.type || String(e))}${e.type === 'network' || e.type === 'server-error' ? _t(5027, "。公司网络可能拦了连接，换个网络试试") : ''}`); });
  },
});
