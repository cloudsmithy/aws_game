# 宣传片网页

![云上大亨 full 宣传片封面](full宣传片封面.jpg)

「亚马逊云科技 User Group 云上大亨」的宣传片和玩法讲解，一共 9 个网页。每个网页都是一个单独的 HTML 文件，音轨、图标、贴图、字体都打包在里面，不联网也能放。

## 怎么看

GitHub 页面上不能直接播放网页。把文件下载到本机（点开文件，右上角 Download raw file），再用 Chrome、Edge 或 Safari 打开就行。

| 网页 | 内容 | 时长 | 旁白 |
|---|---|---|---|
| [full宣传片.html](full宣传片.html) | 完整宣传片：序章故事 + 玩法和各模式看点 | 3 分 25 秒 | 无，配乐 + 字幕 |
| [宣传片.html](宣传片.html) | 短宣传片 | 52 秒 | 无，配乐 + 字幕 |
| [玩法讲解.html](玩法讲解.html) | 总的玩法讲解 | 5 分 29 秒 | 有 |
| [玩法讲解_娱乐模式.html](玩法讲解_娱乐模式.html) | 娱乐模式 | 1 分 53 秒 | 有 |
| [玩法讲解_入门局.html](玩法讲解_入门局.html) | 入门局 | 1 分 54 秒 | 有 |
| [玩法讲解_标准局.html](玩法讲解_标准局.html) | 标准局 | 1 分 28 秒 | 有 |
| [玩法讲解_完整局.html](玩法讲解_完整局.html) | 完整局 | 1 分 23 秒 | 有 |
| [玩法讲解_学习模式.html](玩法讲解_学习模式.html) | 学习模式 | 1 分 24 秒 | 有 |
| [玩法讲解_地狱模式.html](玩法讲解_地狱模式.html) | 地狱模式 | 1 分 28 秒 | 有 |

## 封面

| 文件 | 尺寸 | 语言 |
|---|---|---|
| [full宣传片封面.jpg](full宣传片封面.jpg) | 1920×1080 | 中文 |
| [full宣传片封面_竖版.jpg](full宣传片封面_竖版.jpg) | 1080×1440 | 中文 |
| [full宣传片封面_en.jpg](full宣传片封面_en.jpg) | 1920×1080 | 英文 |
| [full宣传片封面_ja.jpg](full宣传片封面_ja.jpg) | 1920×1080 | 日文 |

英文、日文里的名字照游戏的术语表：云上大亨是 Cloud Tycoon / クラウドタイクーン，亚马逊云科技 User Group 是 Amazon Web Services User Group。

## 重新生成

需要 Node.js 18 以上、Google Chrome、ffmpeg。脚本和素材在本文件夹的 `tools/`：

```
tools/
├── gamedata.mjs        从游戏页面里读棋盘、服务、卡牌、题库
└── promo/
    ├── build.mjs       生成 full宣传片、宣传片、玩法讲解的网页
    ├── mexp_build.mjs  生成 6 个模式讲解的网页
    ├── cover.mjs       生成封面
    ├── mix.mjs         混配乐和音效（mexp_mix.mjs 是模式讲解的）
    ├── record.mjs      把网页逐帧录成 mp4
    ├── export4k60.sh   批量导出 4K60
    ├── promo*.js、explain*.js、mexp*.js、engine.js、style*.css   画面和动画
    ├── assets/         人物、道具、封面底图、字体
    └── out/、mexp_out/ 配乐和配音的成品
```

网页里的棋盘、服务、卡牌都取自游戏的中文原文件。仓库里的 `code/index.html` 是已经打包好的多语言页面，脚本读不了，要用 `GAME_HTML` 指向开发目录里的 `code/index.html`。在本文件夹（`宣传片网页/`）里运行：

```sh
export GAME_HTML=<开发目录>/code/index.html
node tools/promo/build.mjs full promo explain   # full宣传片、宣传片、玩法讲解
node tools/promo/mexp_build.mjs                  # 6 个模式讲解（也可以只写 party basic std full study hell 里的几个）
node tools/promo/cover.mjs                       # 中文封面，横版和竖版
node tools/promo/cover.mjs en                    # 英文封面（ja 是日文）
```

生成的文件直接放在本文件夹，覆盖原来的。改了配乐或音效，先跑 `node tools/promo/mix.mjs full`（或 `promo`、`explain`），再重新生成网页。

## 导出视频

```sh
zsh tools/promo/export4k60.sh all     # 全部 9 条；也可以写 full / promo / explain / modes，或者网页名
```

导出 3840×2160、60 帧、H.264 的 mp4，放在本文件夹，文件名是 `<网页名>_4K60.mp4`。full 宣传片大约要 1 小时，机器忙的时候更久。

## 仓库里没有的

- 导出的 mp4：每条 0.7–4 GB，太大，不进仓库（`.gitignore` 里排除了）。
- 配音缓存和配音模型：旁白是本机的 CosyVoice 合成的，配音成品在 `out/`、`mexp_out/` 里，重新生成网页用不到模型；只有改了旁白文字、要重新配音时才需要。
