#!/bin/zsh
# 把宣传片 / 玩法讲解网页导出成 4K 60 帧 mp4：3840×2160、60 帧、H.264 High@5.2、视频 100 Mbps、AAC 256k
#
# 用法：tools/promo/export4k60.sh [名字…]
#   full      full 宣传片（不写名字时默认导这个）
#   promo     宣传片
#   explain   玩法讲解
#   modes     6 个模式的玩法讲解
#   all       上面全部
#   也可以直接写网页名或路径，比如：玩法讲解_入门局、宣传片/玩法讲解_入门局.html
# 例子：tools/promo/export4k60.sh full modes
#
# 可选环境变量：VB=码率（默认 100M）、FPS=帧率（默认 60）、DRY=1（只列出要导的网页、检查音轨，不录）
# 音轨直接从网页里内嵌的那份取，和网页里听到的一模一样（不用管 out/ 里的音频是不是重新混过）。
# 输出：宣传片/<网页名>_4K60.mp4（aws_game 仓库里是 宣传片网页/<网页名>_4K60.mp4）。先录到 .tmp.mp4，录好再替换，中途停掉不会弄坏已有的文件。
# 速度参考：full 宣传片（204 秒）约 1 小时；磁盘剩不到 2 GB 时 record.mjs 会自己暂停等空间。
setopt pipefail
ROOT=${0:A:h:h:h}; cd $ROOT || exit 1
W=宣传片; [[ ${ROOT:t} == 宣传片网页 ]] && W=.   # aws_game 仓库里脚本在 宣传片网页/tools/，网页和导出的 mp4 都在 宣传片网页/（mp4 不收进仓库）
VB=${VB:-100M}; FPS=${FPS:-60}
MODES=(娱乐模式 入门局 标准局 完整局 学习模式 地狱模式)

pages=()
(( $# )) || set -- full
for a in "$@"; do
  case $a in
    full) pages+=($W/full宣传片.html) ;;
    promo) pages+=($W/宣传片.html) ;;
    explain) pages+=($W/玩法讲解.html) ;;
    modes) for m in $MODES; do pages+=($W/玩法讲解_$m.html); done ;;
    all) pages+=($W/full宣传片.html $W/宣传片.html $W/玩法讲解.html); for m in $MODES; do pages+=($W/玩法讲解_$m.html); done ;;
    *) p=${a%.html}.html; [[ $p == */* ]] || p=$W/$p; pages+=($p) ;;
  esac
done

tmpd=$(mktemp -d); trap 'rm -rf $tmpd' EXIT
ok=0; bad=0
for p in $pages; do
  if [[ ! -f $p ]]; then echo "== 找不到 $p，跳过"; (( bad++ )); continue; fi
  name=${p:t:r}; out=${p:h}/${name}_4K60.mp4; au=$tmpd/$name.m4a
  # 从网页里取出内嵌的音轨（window.PROMO_AUDIO = "data:audio/mp4;base64,…"）
  node -e '
    const fs = require("fs"), s = fs.readFileSync(process.argv[1], "utf8"), m = s.match(/window\.PROMO_AUDIO = "data:audio\/[^;]+;base64,([^"]+)"/);
    if (!m) { console.error("网页里没有内嵌音轨"); process.exit(1); } fs.writeFileSync(process.argv[2], Buffer.from(m[1], "base64"));' $p $au || { echo "== $name 取不出音轨，跳过"; (( bad++ )); continue; }
  adur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $au)
  echo "== $(date +%T) $name → $out（音轨 ${adur} 秒）"
  [[ -n $DRY ]] && continue
  if node tools/promo/record.mjs $p ${out%.mp4}.tmp.mp4 $au $FPS --scale 2 --vcodec h264 --vb $VB; then
    mv -f ${out%.mp4}.tmp.mp4 $out
    echo "== $(date +%T) 好了 $out：$(ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate -of compact $out | tr '\n' ' ')"
    (( ok++ ))
  else
    echo "== $(date +%T) $name 录失败了（已有的 $out 没动）"; rm -f ${out%.mp4}.tmp.mp4; (( bad++ ))
  fi
done
echo "== $(date +%T) 完成：成功 $ok 个，失败或跳过 $bad 个"
(( bad == 0 ))
