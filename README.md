# 亚马逊云科技大富翁

在亚马逊云科技上创业的大富翁桌游：买服务、做高可用、扛住 Health 事件、控制账单、把服务组成有效架构。每个服务都按它的真实特性计费和升级，比如实例要自己做多 AZ，Serverless 没人用就不花钱，Bedrock 按 token 收费。

- 2–4 人，60–120 分钟（默认打满 30 轮按估值排名）
- 48 格棋盘：35 个服务 + 3 个按用量收费的格子
- 21 张 Health 事件卡（机会）、21 张 re:Invent 卡（命运）、5 个角色、12 种有效架构、54 道题

## 文件

| 文件 | 是什么 |
|---|---|
| `index.html` | 网页版，单文件，双击就能玩。同一台电脑 2–4 人轮流操作 |
| `玩法手册.md` / `玩法手册.pdf` | 给玩家：怎么上手、常见问题，附全部服务、卡牌和题库答案。网页里点「玩法」看到的也是这份 |
| `规则书.md` / `主持人规则书.pdf` | 给主持人：完整规则和全部数字（升级费、运行费、Spot、Savings Plans / RI、估值公式等） |
| `卡牌.pdf` | 全部卡牌的打印裁切版：Health、re:Invent、服务卡、角色、架构、ABCD 题卡，每页正面后跟背面 |
| `tools/` | 生成 PDF 和卡牌的脚本 |

## 怎么玩

**网页版**：用 Chrome 或 Safari 打开 `index.html`，选好人数、难度、胜利条件，点「开始游戏」。

- 进度自动存在浏览器里（localStorage），关掉再打开可以「继续上一局」。
- 第一次玩建议选入门局，胜利条件保持默认（经典 + 30 轮上限）。
- 打开「学习模式」后，付过路费、买服务时会出亚马逊云科技的题目。

**实体版**：用 A4 纸打印 `卡牌.pdf`，选「实际大小 / 100%」、双面、长边翻转，沿虚线裁开。单张卡 63 × 88 mm，可以直接套标准卡套。棋盘可以用网页截图打印，规则查 `主持人规则书.pdf`。

## 改了规则之后

规则和数据只有一个来源：`index.html` 里的数据表，包括 `SVC`、`UPGRADES`、`INC`、`REI`、`COMBOS`、`ROLES`、`QUIZ`、`BAL`。改完按下面的顺序同步：

1. **跑机器人自测**，确认改动没有引入错误：

   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
     --virtual-time-budget=600000 --dump-dom "file://$PWD/index.html?bot=1&games=9" | grep -o 'BOTRESULT {.*' | head -c 600
   ```

   结果里 `"errors":[]` 表示没出错。

2. **改两份 md**：`规则书.md`、`玩法手册.md`。里面的大表可以用 `node tools/gen_rules.mjs` 从网页数据重新生成，生成到 `tools/out/tables.json`，再贴回去。
3. **把玩法手册写回网页**：`python3 tools/build_manual.py`，会更新 `index.html` 里的 `MANUAL_HTML`。
4. **出 PDF**：`python3 tools/build_pdfs.py`，一次生成三份：先截棋盘图当封面，再把 md 套上 `tools/pdf.css` 打成两本手册，最后用 `tools/build_cards.mjs` 和 `tools/cards.css` 生成卡牌。

## 测试和调试用的网址参数

| 参数 | 作用 |
|---|---|
| `?bot=1&games=N` | 机器人自对弈 N 局，检查状态是否合法，结果写在页面里的 `BOTRESULT` |
| `?sim=N&players=4&diff=std&reserve=150` | 经济模拟（不渲染），看破产率、轮数、钱的流向，结果是 `SIMRESULT` |
| `?bal={"rentBase":0.2}` | 临时覆盖平衡参数 `BAL`（工资、运行费、请求费、过路费基数等） |
| `?demo=board` | 摆好一个对局中盘，用来截图。还有 `inc`、`rei`、`deed`、`deed2`、`gallery`、`manual`、`cw`、`land`、`flip`、`es`、`pay` |

## 内容约定

- 只用亚马逊云科技对外公开的说法，不用内部术语。品牌写「亚马逊云科技」，服务保留官方名称（如 Amazon S3、AWS Backup）。
- 服务行为要符合真实情况：托管服务天生跨多个 AZ，只有实例型服务买下时是单 AZ，Region 级的故障要靠多区域功能来扛。拿不准的以官网文档为准。
- 美术用标准架构图风格：白底、细线分组框、官方 AWS Architecture Icons 加文字标签。不放 AWS logo，不用 emoji 当图标。
