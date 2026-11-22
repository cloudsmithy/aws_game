import { _t, _tf } from '../core/01-i18n-runtime.js';
import { $, actKey, esc } from '../core/02-util.js';
import { S } from '../engine/07-state.js';
import { ask } from '../ui/10-modal.js';
import { toast } from '../ui/28-setup-save.js';
// ================= 联机（房主权威：游戏只在房主那台跑，其他设备看同步画面、轮到自己时操作） =================
// 连接：PeerJS（WebRTC 数据通道，点对点加密传输）；配对用 PeerJS 公共信令服务器，也可以用 ?peerhost=域名 指定自建的 PeerServer
export const MP = {
  role: null, peer: null, room: '', auth: '', mySeat: null, actor: null,
  seats: {},        // 房主：座位号 → { name, conn, online }
  seatMax: 4,       // 房主：房间最多几人（含房主）。开局页「多人（超过 4 人）」开关改它（ui/28-setup-save.js 的 renderNpMore），开了是 MAX_PLAYERS
  viewers: {}, pendingJoins: {}, watching: false, watchToken: '', watchLimit: 4,
  // 观众与座位完全分开；邀请是独立随机凭证，不包含玩家房间密码或座位钥匙。
  recipients() { return [...Object.values(this.seats), ...Object.values(this.viewers)]; },
  reject(conn, why) { conn._closed = true; this.send(conn, { t: 'reject', why }); setTimeout(() => conn.close(), 300); },
  viewerUI() {
    if (this.role !== 'host') return '';
    return `<button type="button" class="sm" data-act="MP.watchDialog">${_tf(5231, "受邀观战（{$0}/{$1}）", Object.keys(this.viewers).length, this.watchLimit)}</button>` + Object.entries(this.pendingJoins).map(([id, x]) => `<button type="button" class="sm" data-act="MP.reviewJoin" data-arg="${id}">${_tf(5232, "确认入座：{$0}", esc(x.m.name))}</button>`).join('');
  },
  refreshMembers() {
    if (S && S.players) {
      // 开局后大厅只是隐藏，两处成员区都要更新，不能把审批请求留在隐藏大厅。
      document.querySelectorAll('[data-mp-members]').forEach(box => { box.innerHTML = this.viewerUI(); });
    } else if (this.role === 'host') this.renderLobby();
  },
  dropViewer(id) {
    const x = this.viewers[id]; if (!x) return;
    delete this.viewers[id]; x.conn._closed = true;
    this.send(x.conn, { t: 'removed' }); try { x.conn.close({ flush: true }); } catch (e) { }
    setTimeout(() => { try { x.conn.close(); } catch (e) { } }, 300);
    this.refreshMembers();
  },
  setWatching(on) {
    if (this.role !== 'host') return;
    this.watchToken = on ? this.newKey() : '';
    Object.keys(this.viewers).forEach(id => this.dropViewer(id));
    this.refreshMembers();
  },
  async copyWatchInvite() {
    if (this.role !== 'host' || !this.watchToken) return;
    const text = _tf(5233, "房间号：{$0}\n观战邀请码：{$1}\n在「加入房间」选择「受邀观战」加入。", this.room, this.watchToken);
    try { await navigator.clipboard.writeText(text); toast(_t(5234, "已复制观战邀请")); }
    catch (e) { toast(_t(5235, "无法自动复制，请手动选择上面的房间号和观战邀请码")); }
  },
  async watchDialog() {
    if (this.role !== 'host') return;
    const token = this.watchToken;
    const v = await ask({ local: true, view: true, cancelable: true, title: _t(5236, "受邀观战"),
      html: _tf(5237, "<p>最多 {$0} 位解说，不占玩家座位。观众能看完整当前局面和决策弹窗，不能操作对局。请只把邀请发给受信任的人。</p>", this.watchLimit) + (token ? _tf(5238, "<p>房间号：<b>{$0}</b><br>观战邀请码：<code style=\"overflow-wrap:anywhere;user-select:all\">{$1}</code></p><p>对方选择「受邀观战」，填写房间号和邀请码。关闭或更新邀请会断开所有观众，旧邀请立即失效。单独移出只断开当前连接；要撤销已有邀请，请更新邀请。</p>", esc(this.room), esc(token)) : _t(5239, "<p>观战尚未开启。</p>")),
      buttons: [{ label: token ? _t(5240, "更新邀请并断开观众") : _t(5241, "开启受邀观战"), value: 'on', cls: 'pri' }, ...(token ? [{ label: _t(5242, "关闭观战"), value: 'off' }] : []), ...Object.entries(this.viewers).map(([id, x]) => ({ label: _tf(5243, "移出观众：{$0}", esc(x.name)), value: id })), { label: _t(5244, "关闭窗口"), value: false }] });
    if (this.role !== 'host' || this.watchToken !== token) return;
    if (v === 'on' || v === 'off') { this.setWatching(v === 'on'); if (v === 'on') this.watchDialog(); }
    else if (typeof v === 'string' && this.viewers[v]) this.dropViewer(v);
  },
  // 等房主点头的入座请求：认领没有钥匙的座位（previous 是那个座位原来的记录，大厅里按存档排的是 null），
  // 或者开局后新名字中途加入（join，座位号是请求时的下一个空位，真正排第几位等同意后 admit 再定）
  requestSeat(conn, m, seat, previous, join = false) {
    if (Object.keys(this.pendingJoins).length >= 4) return this.reject(conn, _t(5245, "待确认请求已满，请稍后再试"));
    const id = this.newKey(), x = { conn, m, seat, previous, join, game: S };
    this.pendingJoins[id] = x; conn._pending = id;
    this.send(conn, { t: 'pending', why: join ? _t(5572, "游戏已经开始，等房主同意你中途加入。") : _t(5246, "没有该座位的钥匙，等待房主确认身份。请联系房主确认入座请求。") });
    x.timer = setTimeout(() => { if (this.pendingJoins[id] === x) { delete this.pendingJoins[id]; this.reject(conn, _t(5247, "入座确认超时，请重试")); this.refreshMembers(); } }, 60000);
    this.refreshMembers();
    // 中途加入直接弹窗问房主（查资料那一层，不打断对局里的弹窗）；房主正开着别的查资料窗就不顶掉，留在成员栏的「确认入座」按钮上
    if (join) { if ($('#vmodal').hidden) this.reviewJoin(id); else toast(_tf(5573, "{$0} 想中途加入，点「确认入座」处理", m.name)); }
  },
  async reviewJoin(id) {
    const x = this.pendingJoins[id]; if (this.role !== 'host' || !x) return;
    const ok = await ask(x.join
      ? { local: true, view: true, cancelable: true, title: _t(5574, "中途加入"), html: _tf(5575, "<p>{$0} 想中途加入，同意吗？</p><p class=\"muted\">同意后排在最后一位，从下一轮开始走：站在起点，没有服务和卡牌，起始资金是还在场各家总资产的平均数。</p>", esc(x.m.name)), buttons: [{ label: _t(3188, "同意"), value: true, cls: 'pri' }, { label: _t(3189, "拒绝"), value: false }] }
      : { local: true, view: true, cancelable: true, title: _t(5248, "确认玩家身份"), html: _tf(5249, "<p>{$0} 请求接管玩家 {$1}，但没有原座位钥匙。请通过语音或其他已知渠道确认是本人；仅名字相同不能证明身份。</p>", esc(x.m.name), x.seat + 1), buttons: [{ label: _t(5250, "已确认本人，允许入座"), value: true, cls: 'pri' }, { label: _t(3189, "拒绝"), value: false }] });
    if (this.pendingJoins[id] !== x) return;
    clearTimeout(x.timer); delete this.pendingJoins[id]; delete x.conn._pending;
    // 中途加入不看座位号有没有变：同意时 admit 重新查一遍局有没有结束、座位满没满，排到那时的最后一位
    const moved = !x.join && ((this.seats[x.seat] || null) !== x.previous || (x.previous && x.previous.online));
    if (!ok || this.role !== 'host' || !x.conn.open || x.conn._closed || S !== x.game || moved) this.reject(x.conn, x.join && !ok ? _t(5576, "房主没有同意你中途加入") : _t(5251, "入座未获批准或座位已变化，请重试"));
    else this.admit(x.conn, x.m, x);
    this.refreshMembers();
  },};
// 远端：截住游戏操作按钮，改成发给房主
document.addEventListener('click', e => {
  if (MP.role !== 'client') return;
  const b = e.target.closest && e.target.closest('#center button:is([onclick], [data-act]), #mbar button:is([onclick], [data-act])');
  if (!b) return;
  const a = MP.ONCLICK[actKey(b)];
  if (!a) return;
  e.preventDefault(); e.stopImmediatePropagation();
  // 发出去后先灰 1 秒免得连点；房主执行了会推新状态、把按钮整块重画，没执行就恢复
  if (S && S.cur === MP.mySeat) { MP.send(MP.hostConn, { t: 'act', a }); b.disabled = true; setTimeout(() => { if (b.isConnected && S && S.cur === MP.mySeat && !MP.gone) b.disabled = false; }, 1000); }
}, true);
