import { _t, _tf } from '../core/01-i18n-runtime.js';
import { $, esc, homeUrl, unesc } from '../core/02-util.js';
import { S, __set_S, cur, log, nm } from '../engine/07-state.js';
import { MODAL_CUR, VIEW_CUR, ask } from '../ui/10-modal.js';
import { render } from '../ui/27d-side.js';
import { renderNames, toast } from '../ui/28-setup-save.js';
import { aiKick } from '../engine/36-ai.js';
import { sigConf } from './40a-signal.js';
import { MP } from './40-host-sync.js';
import { MP_PEERJS_TURN, mpTurnEntry } from './42-setup.js';
Object.assign(MP, {
  closed(conn) {
    conn._closed = true;
    if (conn._pending) { const x = this.pendingJoins[conn._pending]; if (x) clearTimeout(x.timer); delete this.pendingJoins[conn._pending]; this.refreshMembers(); }
    const id = conn._viewer;
    if (id && this.viewers[id] && this.viewers[id].conn === conn) { delete this.viewers[id]; this.refreshMembers(); }
  },
  cur: null, mid: 0, closeLocal: null,
  dirty: false, pushIv: 0, pushGen: 0,   // 房主：状态脏标记 + 推送心跳（和渲染频率解耦，见 afterRender）。pushGen 每起一次心跳 +1：回开局页时上一拍还在路上，新一局起的心跳和它会并着跑，靠这个让旧的那拍认出自己过期、不再续
  full: false,      // 房主：这次合并的 60ms 里有没有整页重画（没有的话远端也只重画棋盘）
  resync: 0,        // 远端：增量接不上，正在等房主补发整份
  isRemote(seat) { return this.role === 'host' && seat != null && !!this.seats[seat]; },
  // 房主移出联机玩家：大厅里直接空出座位；开局后座位交给电脑接着打。这个名字在这个房间里不能再进（换个名字进来的，可以再移出）
  kick(k) {
    const x = this.seats[k]; if (this.role !== 'host' || !x) return;
    const ban = this.banned = this.banned || new Set(), key = t => String(t || '').replace(/\s+/g, ' ').trim(), name = S && S.players && S.players[k] ? unesc(S.players[k].name) : x.name;
    ban.add(key(x.name)); ban.add(key(name));
    if (x.conn) { const c = x.conn; c._seat = null; this.send(c, { t: 'removed' }); try { c.close({ flush: true }); } catch (e) { } setTimeout(() => { try { c.close(); } catch (e) { } }, 5000); }
    delete this.seats[k];
    if (S && S.players) {
      S.cfg.ai[k] = true; if (S.mpSeats) S.mpSeats = S.mpSeats.filter(q => q !== k);
      log(_tf(4957, "🚪 房主把 {$0} 移出了房间，他的座位交给电脑接着打", nm(S.players[k])));
      // 正等着他选的那个弹窗：这一次放开给房主选，之后的弹窗电脑自己选
      const tk = this.cur && this.cur.who === k && this.cur.box && this.cur.box.querySelector('[data-mptake]'); if (tk && tk.onclick) tk.onclick();
      render(); this.pushState(true); aiKick();
    } else {
      const el = $('#nm' + k), ai = $('#ai' + k); if (el) { el.readOnly = false; el.value = ''; el.title = ''; } if (ai) { ai.disabled = false; ai.title = ''; }
      this.renderLobby();
    }
    toast(_tf(4958, "已把 {$0} 移出房间", name));
  },
  async kickDialog() {
    const ks = Object.keys(this.seats).map(Number).filter(k => this.seats[k]); if (!ks.length) return void toast(_t(4959, "现在没有联机玩家"));
    const nmOf = k => S && S.players && S.players[k] ? unesc(S.players[k].name) : this.seats[k].name;
    const k = await ask({ local: true, cancelable: true, title: _t(4960, "移出哪位联机玩家？"), html: _t(4961, "<p>移出后连接断开，他的座位交给电脑接着打；用这个名字不能再进这个房间。</p>"), buttons: [...ks.map(k => ({ label: _tf(4963, "移出 {$0}{$1}", esc(nmOf(k)), this.seats[k].online ? '' : _t(4962, "（已断开）")), value: k })), { label: _t(2465, "取消"), value: -1 }] });
    if (Number.isInteger(k) && k >= 0) this.kick(k);
  },
  // 房主点了「他回来之前都由我来选」、人也确实没连着：这个座位的弹窗在房主这台直接选。不改 isRemote：错题本记给谁、能不能合成一个窗还按远端座位算
  hostPlays(seat) { const x = this.role === 'host' && seat != null && this.seats[seat]; return !!(x && x.hp && !x.online); },
  // 远端：这个浏览器在各个房间里拿过的座位钥匙，[[房间号, [钥匙…]], …]，最近的在前，只留 10 个房间。add：收到 welcome 时记一把新的。
  // 按房间存、不按名字：开局后改过名、用新名字重进的也带得上。禁用存储、写满时照样能玩，重连时由房主核实身份
  seatKeys(room, add) {
    let a = []; try { a = JSON.parse(localStorage.getItem('aws-tycoon-seatkeys')) || []; } catch (e) { }
    if (!Array.isArray(a)) a = [];
    const hit = a.find(x => Array.isArray(x) && x[0] === room), ks = hit && Array.isArray(hit[1]) ? hit[1].filter(k => typeof k === 'string') : [];
    if (add) { a = [[room, [add, ...ks.filter(k => k !== add)].slice(0, 4)], ...a.filter(x => x !== hit)].slice(0, 10); try { localStorage.setItem('aws-tycoon-seatkeys', JSON.stringify(a)); } catch (e) { } }
    return ks;
  },
  // 远端掉线后：用原来的房间号、密码哈希和局里现在的名字重新加入（座位钥匙让房主马上认回这个座位）。auto 重试 2、4、8、16、30 秒
  rejoin() { if (this.role !== 'client' || !this.gone || this.kicked || !S || S.over) return; clearTimeout(this.rjT); const me = S.players[this.mySeat]; this.join(this.room, '', me ? unesc(me.name) : this.myName, this.auth); },
  retryLater() { clearTimeout(this.rjT); if (!this.gone || this.kicked || !S || S.over) return; this.reN = (this.reN || 0) + 1; if (this.reN === 4) ask({ local: true, title: _t(4964, "和房主断开了"), html: _tf(4965, "<p>已经自动重连了几次还没连上，会接着每 30 秒试一次。房主那边刷新过的话房间号会变：房主重新创建房间、点「继续上一局」，你拿新的房间号用「{$0}」加入。</p>", S.players[this.mySeat] ? S.players[this.mySeat].name : ''), buttons: [{ label: _t(4966, "现在重新连接"), value: true, cls: 'pri' }, { label: _t(2478, "知道了"), value: false }] }).then(v => { if (v) { this.reN = 0; this.rejoin(); } }); this.rjT = setTimeout(() => this.rejoin(), Math.min(30000, 1000 * 2 ** this.reN)); },
  // 座位钥匙：不用 crypto.randomUUID，局域网 http 打开的页面不是安全上下文，没有这个函数
  newKey() { const a = new Uint8Array(16); crypto.getRandomValues(a); return [...a].map(x => x.toString(16).padStart(2, '0')).join(''); },
  peerOpts() {
    const sig = sigConf();   // 公共 / 自建，见 net/40a-signal.js
    // 没填自己的中继：完全用 PeerJS 的默认配置（和之前能连上的版本一模一样，不传 config）。
    // 填了：PeerJS 默认的那几条再加上自己的中继；传了 config 就会整个替换掉默认值，所以 sdpSemantics 也照默认写上
    const t = mpTurnEntry();
    const cfg = t ? { config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, MP_PEERJS_TURN, t], sdpSemantics: 'unified-plan' } } : {};
    return sig.host ? { ...cfg, host: sig.host, port: sig.port, path: sig.path, secure: sig.port !== 80 } : cfg;
  },
  send(conn, msg) { if (this.role === 'client' && this.watching && conn === this.hostConn && !['hello', 'resync'].includes(msg.t)) return; try { if (conn && conn.open) conn.send(msg); } catch (e) { } },
  // 房主接手连着却不动的远端这一个回合（只管这一回合；他自己再点照样算）
  again() {
    this.pushIv = 0; this.dirty = false;   // 回开局页：停掉推送心跳
    for (const k of Object.keys(this.seats)) {
      const x = this.seats[k];
      if (!x.online) { delete this.seats[k]; const el = $('#nm' + k), ai = $('#ai' + k); if (el) { el.readOnly = false; el.value = ''; } if (ai) { ai.disabled = false; ai.title = ''; } continue; }
      delete x.hp; delete x.idleTake; x.base = null; if (S && S.players[k]) x.name = unesc(S.players[k].name);   // 局里改过名的按新名字坐回去
      this.send(x.conn, { t: 'again' });
    }
    Object.values(this.viewers).forEach(x => { x.base = null; this.send(x.conn, { t: 'again' }); });
    this.cur = null; __set_S(null);
    if (MODAL_CUR && !$('#modal').hidden) { try { MODAL_CUR.cancel(); } catch (e) { } } try { if (VIEW_CUR) VIEW_CUR.cancel(); } catch (e) { }
    const ef = $('#endfx'); if (ef) ef.remove();
    $('#game').hidden = true; $('#setup').hidden = false; $('#setup').style.display = '';
    renderNames(); this.renderLobby(); scrollTo(0, 0);
  },
  // 远端：离开房间；提议现在结算（房主确认）
  leave() { ask({ local: true, cancelable: true, title: _t(4967, "离开房间？"), html: this.watching ? _t(5252, "<p>离开观战不会影响玩家和对局；邀请有效时可以再次加入。</p>") : _t(4968, "<p>房主会把你的座位标成掉线，可以替你操作。你用同一个房间号和局里的名字还能加回来。</p>"), buttons: [{ label: _t(4969, "离开"), value: true, cls: 'pri' }, { label: _t(2465, "取消"), value: false }] }).then(v => { if (!v) return; this.kicked = true; try { this.hostConn && this.hostConn.close(); } catch (e) { } location.href = homeUrl(); }); },
  proposeEnd() { if (!S || S.over) return; this.send(this.hostConn, { t: 'endask' }); toast(_t(4970, "已经请房主现在结算")); },
  idleTake() { const x = S && this.seats[S.cur]; if (!x || !this.isRemote(S.cur)) return; x.idleTake = S.turnStartAt; log(_tf(4971, "{$0} 半天没动，房主替他操作这一回合", nm(cur()))); this.send(x.conn, { t: 'toast', msg: _t(4972, "你半天没动，房主替你操作了这一回合") }); render(); },
  broadcast(msg) { this.recipients().forEach(x => this.send(x.conn, msg)); },
});
