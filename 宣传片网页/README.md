# 宣传片网页

宣传片和玩法讲解视频的网页版。每个网页都是单文件，音轨、图标、贴图、字体都打包在里面，用浏览器打开就能播放，拷到别的电脑也能用。

| 网页 | 内容 | 时长 |
|---|---|---|
| full宣传片.html | 完整宣传片：序章故事 + 各模式看点 | 205 秒 |
| 宣传片.html | 短宣传片 | 52 秒 |
| 玩法讲解.html | 总的玩法讲解（有配音） | 329 秒 |
| 玩法讲解_娱乐模式.html | 娱乐模式讲解 | 113 秒 |
| 玩法讲解_入门局.html | 入门局讲解 | 114 秒 |
| 玩法讲解_标准局.html | 标准局讲解 | 88 秒 |
| 玩法讲解_完整局.html | 完整局讲解 | 83 秒 |
| 玩法讲解_学习模式.html | 学习模式讲解 | 84 秒 |
| 玩法讲解_地狱模式.html | 地狱模式讲解 | 88 秒 |

`full宣传片封面.jpg`、`full宣传片封面_竖版.jpg` 是 full 宣传片的封面图（横版 16:9、竖版 3:4）。

## 重新生成

生成和导出脚本在本文件夹的 `tools/promo/`。网页里的棋盘、服务、卡牌都取自游戏的中文原文件；仓库里的 `code/index.html` 是生成好的多语言页面，脚本读不了，要用 `GAME_HTML` 指向开发目录里的 `code/index.html`。在本文件夹（`宣传片网页/`）里运行：

```sh
export GAME_HTML=<开发目录>/code/index.html
node tools/promo/build.mjs full promo explain   # full宣传片、宣传片、玩法讲解
node tools/promo/mexp_build.mjs                  # 6 个模式讲解
node tools/promo/cover.mjs                       # 封面图
```

输出都在本文件夹。配乐和音效用 `node tools/promo/mix.mjs full`（或 `promo`、`explain`）重新混。配音要用本机的 CosyVoice 模型，配音缓存没有收进仓库。

## 导出视频

```sh
zsh tools/promo/export4k60.sh all     # 全部 9 条；也可以写 full / promo / explain / modes / 网页名
```

导出 3840×2160、60 帧的 mp4，放在本文件夹，文件名是 `<网页名>_4K60.mp4`。mp4 不收进仓库。需要本机装了 Google Chrome 和 ffmpeg。
