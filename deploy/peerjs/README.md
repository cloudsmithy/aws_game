# 自建部署（游戏网站 + PeerJS 信令 + TURN 中继）

联机默认用 PeerJS 的公共信令服务器（`0.peerjs.com`）和它的公共 TURN 中继。国内常常连不上或者很慢，线下活动网络也常常打不通点对点，这时候可以自己搭一套。这个目录一条 `docker compose up` 起三个容器，游戏网站和信令服务器在同一个域名下：

| 容器 | 做什么 | 对外端口 |
|---|---|---|
| `peerjs` | PeerServer 1.0.2，**只负责牵线**：两台设备交换连接信息（SDP、ICE），游戏数据不经过它 | 不发布，只在 compose 内部网络里 |
| `caddy` | 自动申请、续期 HTTPS 证书；发布游戏网站（仓库的 `code/`），`/peerjs` 转给信令，`/peer-config.json` 告诉游戏「信令就在本站」 | 443/tcp，80/tcp（只用来申请证书） |
| `coturn` | TURN 中继：两边点对点打不通（对称 NAT、公司网络、手机运营商网络）时，数据从这里绕一下 | 3478/udp+tcp，49160–49200/udp |

**信令用哪个**：游戏页面启动时读本站的 `peer-config.json`，读到了就默认连这里的信令；GitHub Pages 上没有这个文件，默认走 PeerJS 公共服务器。页面上（建房、加入房间的表单下面，房主的大厅里，「联机设置和测试」里）都写着现在用的是哪个，每台设备也能在「联机设置和测试」里改成公共或别的自建地址。TURN 在同一个窗口里填。

## 要准备的

- 一台有公网 IP 的 Linux 服务器（1 核 1G 够用；TURN 中继走流量，按同时打不通的人数估带宽，一路对局每秒几 KB）
- 一个域名，A 记录指到服务器（比如 `peer.example.com`）
- Docker 和 Docker Compose 插件（`docker compose version` 能出版本号）
- 云服务器的安全组 / 防火墙放行：`443/tcp`、`80/tcp`、`3478/udp`、`3478/tcp`、`49160-49200/udp`，**别的都不开**

## 部署

```bash
cd deploy/peerjs
cp .env.example .env
# 改 .env：PEER_DOMAIN、ACME_EMAIL、TURN_REALM、TURN_PUBLIC_IP、TURN_USER，TURN_PASS 填随机长密码：
openssl rand -base64 24

# 先只在本机起，看日志没报错（这时候 PUBLIC_BIND=127.0.0.1，外面连不进来）
docker compose up -d
docker compose logs -f
```

确认没问题后，按下面「对外开放前」过一遍，再把 `.env` 里的 `PUBLIC_BIND=127.0.0.1` 改成 `PUBLIC_BIND=0.0.0.0`，`docker compose up -d` 重起。

## 对外开放前

`PUBLIC_BIND=0.0.0.0` 就是把这几个端口开给整个互联网：任何人都能连你的信令（443）、能用你的 TURN（知道账号密码的话）。这是这类服务的正常用法（玩家就在公网上），但要你自己确认：

- **信令（443）**：谁都能连上来注册一个 ID、和知道房间号的人牵线；看不到别人的房间列表（`allow_discovery` 关着），看不到游戏数据（数据走 WebRTC 点对点加密）。`PEER_CONCURRENT_LIMIT` 限每个 IP 同时连几个。
- **TURN（3478 + 中继端口段）**：账号密码要发给所有玩家（填在游戏里），所以等于半公开——拿到的人都能用你的带宽中继。已经限了：总共 60 路、每个账号 12 路、每路 1 Mbps（`.env` 里能调），并且**禁止中继到内网、本机、云厂商元数据地址**（`denied-peer-ip`），不会被拿来当跳板摸你服务器所在的内网。活动结束后可以换密码，或者 `docker compose stop coturn`。
- **证书（80）**：只给 Let's Encrypt 验证域名用，其余请求跳 https。
- 服务器上**别的端口**（SSH 之类）照旧只对你自己开。

只想在一个场地的局域网里用：`PUBLIC_BIND` 写这台机器的内网 IP（比如 `192.168.1.10`），只有同一个网络里的设备连得上。

## 游戏里怎么用

1. **打开游戏**：所有人（房主、玩家、观众）打开 `https://peer.example.com/`，页面默认就连这台的信令服务器，不用加参数。
   - 也可以继续用 GitHub Pages 上的页面：在「联机设置和测试」里把信令服务器选成「自建」、填 `peer.example.com`，或者链接带 `?peerhost=peer.example.com`（网址参数优先级最高）。
   - **大家要连同一个信令服务器**：有人用的是公共服务器就找不到房间。页面上写着现在用的是哪个，对一下。
2. **TURN**：每台设备在开局页第 04 步「联机设置和测试」里填：
   - 地址：`turn:peer.example.com:3478`（UDP 不通的网络再加一行 `turn:peer.example.com:3478?transport=tcp`）
   - 用户名、密码：`.env` 里的 `TURN_USER`、`TURN_PASS`

   填好点「开始检测」，看到「中继候选」就是通了。只存在这台设备的浏览器里，不进存档、不同步给别人。
3. **更新游戏**：网站内容就是仓库的 `code/`（`code/index.html` 是 `web/` 打包的产物）。拉新代码后 `cd web && npm ci && npm run build`，Caddy 直接读目录，不用重启。

## 检查

```bash
curl -s https://peer.example.com/peerjs/id      # 返回一串随机 ID：信令通了
curl -s https://peer.example.com/peer-config.json   # {"host":"peer.example.com",…}：游戏会默认走自建
curl -s -o /dev/null -w '%{http_code}\n' https://peer.example.com/   # 200：游戏首页
curl -s -o /dev/null -w '%{http_code}\n' https://peer.example.com/i18n/en.json   # 404：翻译原表不对外
docker compose ps                                # 三个都是 running
ss -lntup | grep -E ':(443|80|3478)\b'           # PUBLIC_BIND=127.0.0.1 时应该只看到 127.0.0.1
```

## 维护

- 更新：改 `docker-compose.yml` 里的镜像版本，`docker compose pull && docker compose up -d`。PeerServer 的版本最好和游戏内置的 PeerJS 客户端对上（现在都是 1.0.x）。
- 换 TURN 密码：改 `.env`，`docker compose up -d coturn`，再告诉玩家新密码。
- 停掉：`docker compose down`（证书存在 `caddy-data` 卷里，下次起来不用重新申请）。

## 以后可以做的

- **TURN 临时凭证**：现在是一组固定账号密码，发给所有人。更好的做法是 coturn 的 `use-auth-secret`：由一个小接口给每个玩家发几小时就过期的凭证，游戏开局时自动去取。要多写这个接口和游戏里取凭证的代码。
