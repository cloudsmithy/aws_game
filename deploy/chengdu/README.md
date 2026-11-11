# chengdu 自动部署（管理员一次性配置）

配置完成后：合并/推送到本仓库 `master` → Actions 校验、对比服务器文件 → 只获取并上传变化内容 → 整体切换 → 公网检查；失败尝试恢复上一版。

生产地址：<https://aws-game.usergroup.cn/>。现有域名、TLS 证书及 DNS 继续使用。PR 验证不接触服务器；部署默认关闭，设置 `CHENGDU_DEPLOY_ENABLED=true` 后才启用。配置 Secrets 和服务器需要管理员权限，提交 PR 的贡献者不需要拿到服务器凭证。

## 已有服务器升级到增量部署（先升级接收程序，再合并/启用工作流）

已有的密钥、Secrets、Nginx 挂载和 `current` 全部沿用。只需把本 PR 中审查后的 `receive.py` 安装一次；不要重新生成密钥，不要重新复制 bootstrap，不需要重启 Nginx。

如果服务器已有包含本次更新的项目源码，在项目目录执行：

```sh
sudo cp -a /usr/local/lib/aws-game/receive.py /usr/local/lib/aws-game/receive.py.before-incremental
sudo install -m 0755 deploy/chengdu/receive.py /usr/local/lib/aws-game/receive.py
sudo -u aws-game-deploy env SSH_ORIGINAL_COMMAND=status /usr/bin/python3 /usr/local/lib/aws-game/receive.py </dev/null > /tmp/aws-game-status.json
python3 -c 'import json; x=json.load(open("/tmp/aws-game-status.json")); print(x["protocol"], len(x["files"]), "existing files")'
```

应显示 `incremental-v1` 和现有文件数量。没有最新源码时，只需下载/审查本 PR 对应**固定 commit SHA**的 `deploy/chengdu/receive.py`，不必 clone 整个仓库或下载音频。例如将下面 `REVIEWED_COMMIT_SHA` 替换成审查后的完整 SHA 后下载，再按上面方式安装该文件：

```sh
curl --fail --show-error --location https://raw.githubusercontent.com/cloudsmithy/aws_game/REVIEWED_COMMIT_SHA/deploy/chengdu/receive.py -o /tmp/aws-game-receive.py
# 审查 /tmp/aws-game-receive.py 后，使用它作为 install 的源文件。
```

接收程序兼容旧的完整发布包，故可先升级服务器，再合并工作流。若尚未升级，新工作流会在 `status` 步骤停止，不会切换线上版本。需要恢复旧接收程序时，将 `.before-incremental` 备份安装回原路径，并恢复旧工作流。

## 增量传输如何工作

- 两个任务仅检出 `deploy/chengdu/` 脚本和少量根文件；通过 `--filter=blob:none` 获取 Git 提交/目录树，测试使用临时小仓库，不会为了验证下载全站音频。
- 服务器 `status` 实际读取当前版本文件，生成内容哈希与大小清单。首次启用也可复用已有内容，不依赖旧的版本标记。若还在改名/转码的旧 bootstrap，原始 M4A 等无法匹配的内容第一次仍需传输。
- Actions 对比目标 Git 树，只批量下载服务器缺少的 Git blob，压缩包仅包含变化文件与完整目标清单。未变化的音频不从 GitHub 下载，也不向服务器上传。改名而内容相同的文件也能复用。
- 服务器校验基线没有变化后，复制已有文件并应用变化，组装独立新目录；完整校验后原子切换。上游删除的路径不进入新版本。保持完整旧版本以支持回滚；这是网络增量，服务器磁盘仍存完整版本。
- 无变化部署只发送清单。没有可复用内容时，首次需传输全部部署文件；真正修改过的音频仍会下载和上传。Git 仓库本身不缓存到下一台 runner。
- 日志显示 `uploaded_files`、`reused_files`、上传内容字节、压缩包大小及传输进度；成功后在 Actions Summary 保留统计。基线并发变化会明确失败，重新运行即可重新计算，绝不盲目复用。

## 1. 在管理员电脑生成专用密钥

```sh
ssh-keygen -t ed25519 -f ./aws-game-actions -N '' -C github-actions-aws-game
```

私钥只用于 GitHub Environment Secret，公钥交给服务器初始化脚本。不要提交任何密钥进仓库。部署账号不能使用 root 密钥。

## 2. 在 chengdu 安装接收程序

审查并使用本 PR 合并后的脚本（系统需 Python 3.10+、OpenSSH）：

```sh
sudo sh deploy/chengdu/setup-server.sh /absolute/path/aws-game-actions.pub
```

安装位置：`/usr/local/lib/aws-game/receive.py`（root 管理）；文件存储：`/srv/aws-game`；账号：`aws-game-deploy`。公钥被限制为固定接收程序，禁用转发和终端，只接受 `status`、`deploy <40位SHA>` 与 `rollback <40位SHA>`，不能运行任意 shell。此脚本不会修改 Nginx、线上目录或当前 MCP 服务。若已有同名账号，先确认它专用于本部署。确认 SSH 服务允许该账号使用公钥登录，密码登录应保持禁用。

首次切换前保留当前线上内容作为 bootstrap。以下是当前 chengdu 已知静态文件位置；如果管理员调整过挂载，请先核实：

```sh
sudo install -d -o aws-game-deploy -g aws-game-deploy -m 0755 /srv/aws-game/releases/bootstrap
sudo cp -a /var/www/zhugdamo_cn/game/aws-game/. /srv/aws-game/releases/bootstrap/
sudo chown -R aws-game-deploy:aws-game-deploy /srv/aws-game/releases/bootstrap
sudo -u aws-game-deploy ln -s releases/bootstrap /srv/aws-game/current
```

上面的 `ln` 只用于尚无 `current` 的首次初始化；已有版本不要覆盖它。原站点目录保留，方便首次接入失败时恢复 Nginx 配置。

## 3. 让现有 Nginx 读取 current

chengdu 当前使用 Nginx 容器。在现有网关 Compose 的 Nginx 服务增加只读挂载（保留其他挂载和配置）：

```yaml
volumes:
  - /srv/aws-game:/srv/aws-game:ro
```

由管理员按现有管理流程重新创建 Nginx 容器以加载新挂载。在独立域名 `aws-game.usergroup.cn` 的 HTTPS `server` 中，将站点根目录指向 `current`（保留现有 TLS 证书设置）：

```nginx
server_name aws-game.usergroup.cn;
root /srv/aws-game/current;
index index.html;

location / {
    try_files $uri $uri/ =404;
    autoindex off;
    add_header Cache-Control "no-cache" always;
    add_header X-Content-Type-Options nosniff always;
}
```

该域名从 `/` 提供游戏：打包时仓库的 `code/` 放在网站根上（游戏就是 `/index.html`），`docs/` 放在 `/docs/` 下，和 GitHub Pages 一样。以前的 `/code/…` 地址由网站根上的 `404.html` 跳到新位置，Nginx 要配 `error_page 404 /404.html;` 才会用它。确认 DNS 与 TLS 证书覆盖 `aws-game.usergroup.cn`；旧域名和旧路径如需保留，由管理员另行配置重定向。

Nginx 的 `http` 保留标准 `mime.types`，确保 HTML、JS、PDF 和 M4A 使用正常的 MIME 类型。核实网关可读取挂载后的 `current/index.html`，运行配置检查再重载。现有 URL 应继续打开原游戏，不能仍然落到旧 MCP 发布目录。

新流程支持中文文件名及 `.m4a`，直接发布上游静态内容，不再需要旧 MCP 发布时的改名或音频转换。之后新域名的站点内容由 Actions 管理，避免同时通过 MCP 写旧目录。

## 4. GitHub 中配置并启用

在 **Settings → Environments** 创建 `chengdu`，将部署分支限制为 `master`。若希望完全自动部署，不设置 Required reviewers；需要人工发布审核时可以设置。添加下列 Environment Secrets：

| 名称 | 内容 |
| --- | --- |
| `CHENGDU_HOST` | chengdu 的公网 IPv4 或 SSH 主机名；仅主机名，不含用户名/端口；工作流使用 SSH 22 端口 |
| `CHENGDU_SSH_KEY` | 第 1 步专用私钥的完整内容 |
| `CHENGDU_KNOWN_HOSTS` | 经管理员核验的服务器 SSH host key 行，主机名与 `CHENGDU_HOST` 相同 |

Host key 应从管理员可信渠道取指纹并核验，再保存对应 known_hosts 行；不要在工作流中临时 `ssh-keyscan` 后直接信任。防火墙需允许 Actions 托管 runner 连接 SSH；若已有入口限制，管理员按组织策略配置受控 runner/网络入口，不要直接关闭防火墙。

在 **Settings → Secrets and variables → Actions → Variables** 添加仓库变量：

```text
CHENGDU_DEPLOY_ENABLED = true
```

工作流刻意仅在 `cloudsmithy/aws_game` 的 `master` 发布，Fork 只运行校验。如迁移仓库，管理员应更新工作流中的仓库条件。

## 5. 首次验收（合并 PR 后）

在 Actions 选择 **Validate and deploy chengdu → Run workflow → master**。第一次也可以由合并 PR 的 push 自动触发。

- `validate`：完整发布/增量发布测试及 Git 树部署路径检查通过；不下载全站资产。
- `deploy`：上传后检查公网 `_deployment.json` 中的 revision 与提交一致，游戏页面返回成功；工作流 Summary 显示提交、网址及增量传输统计。
- 人工打开首页并开一局，抽查讲解音频、文档页面和两台设备联机。

Actions 的 chengdu concurrency 串行发布，已经开始的部署不会被新 push 取消。服务器另有文件锁；每次整包校验后只切换一次。程序拒绝符号链接、路径穿越、非静态后缀、重复路径、哈希不符及超限包。上限：压缩包 256 MiB、展开 512 MiB、5000 文件；保留最多 3 个版本（当前、上一版和一个额外版本），避免旧 MCP 分批备份累积。需要为完整候选包和保留版本预留磁盘空间。

## 回滚与停用

公网检查失败时工作流自动请求回滚，只有线上仍是该失败 revision 才会执行。若 SSH 已中断导致自动回滚无法完成，管理员在服务器运行下面命令（替换为**当前失败版本的完整 SHA**）：

```sh
sudo -u aws-game-deploy env SSH_ORIGINAL_COMMAND='rollback FULL_40_CHARACTER_SHA' /usr/bin/python3 /usr/local/lib/aws-game/receive.py </dev/null
```

程序会恢复 `previous`。首次接入时它是 bootstrap。可将仓库变量 `CHENGDU_DEPLOY_ENABLED` 改为 `false` 暂停后续自动发布。更新接收程序/初始化脚本需要管理员重新审查安装；普通网页更新不需要。

## 本地验证

```sh
python3 -m unittest discover -s deploy/chengdu -p 'test_*.py' -v
python3 deploy/chengdu/incremental.py --revision "$(git rev-parse HEAD)" --plan
# 可选：完整 checkout 时仍可用 package.py 生成旧格式整包，用于诊断。
```

仓库根目录的 `Dockerfile` 继续用于原有 Docker 部署方式，本工作流不改动它，也不在生产服务器运行仓库脚本或构建代码。
