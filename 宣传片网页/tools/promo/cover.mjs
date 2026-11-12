// 生成 full 宣传片的封面图：横版 16:9（宣传片/full宣传片封面.jpg）和竖版 3:4（宣传片/full宣传片封面_竖版.jpg）
// 底图是片子里封面那一刻去掉字幕的棋盘（assets/cover/board.jpg）：full 宣传片 T=0.5、藏掉叠加层 .ov、4K（?scale=2、2 倍像素）截 3840×2160。
//   截的时候另做了两处：左上那个漂浮图标（SQS）这一刻正在淡入（不透明度约 0.34，看着像没加载完），把它的不透明度固定成 1；
//   棋盘中间面板的大标题三行（「亚马逊云科技 User Group」「云上大亨」和下面一行说明）、架构图上的两个小标注「全球 · 边缘」「VPC · 多 AZ」用面板底色盖掉——
//   封面上它们被奖杯和人物挡掉大半，只露零碎笔画，像残字（大标题左边已经写了）。左上角小标签、架构图 Route 53 → CloudFront → ELB → EC2 → RDS 和 VPC 虚线框保留。
// 人物用角色设定图的立牌（assets/sprites；虫虫用 assets/cover/chong_poster.webp 重新抠的大立绘），奖杯是韩叔设定图里写着 User Group 的冠军奖杯（assets/props/han_trophy.webp，杯身的字已改正）
// 封面不剧透：黑化、巨大化的韩叔和「讨伐韩叔」都留给片子
// 用法：node tools/promo/cover.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPoster } from './poster.mjs';

// 只要项目根目录，不 import gamedata.mjs（它一 import 就解析整份 code/index.html，游戏网页出问题封面也生成不了）
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const HERE = path.join(ROOT, 'tools', 'promo'), A = path.join(HERE, 'assets'), OUT = process.env.PROMO_OUT ? path.resolve(process.env.PROMO_OUT) : path.basename(ROOT) === '宣传片网页' ? ROOT : path.join(ROOT, '宣传片');
const uri = f => `data:image/${path.extname(f).slice(1).replace('jpg', 'jpeg')};base64,` + fs.readFileSync(f).toString('base64');
const spr = n => uri(path.join(A, 'sprites', n + '.webp'));
const FONT = 'data:font/otf;base64,' + fs.readFileSync(path.join(A, 'fonts', 'SourceHanSansCN-Heavy-subset.otf')).toString('base64');
const CLOUD = 'data:image/svg+xml;base64,' + Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 120"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".65" stop-color="#eaf3ff"/><stop offset="1" stop-color="#9cc3f2"/></linearGradient></defs><path d="M38 108 C14 108 4 92 10 78 C14 66 28 60 40 63 C40 40 62 26 84 34 C94 12 128 6 146 28 C164 20 190 32 190 56 C210 58 218 76 212 90 C206 104 192 108 180 108 Z" fill="url(#g)" stroke="#5b8fd6" stroke-width="5" stroke-linejoin="round"/><path d="M52 52 C60 42 74 40 84 46" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".9"/></svg>`).toString('base64');
const IMG = { crown: uri(path.join(A, 'props', 'han_crown.webp')), board: uri(path.join(A, 'cover', 'board.jpg')), trophy: uri(path.join(A, 'props', 'han_trophy.webp')),
  han: spr('han_front'), damo: spr('damo_lead'), chong: uri(path.join(A, 'cover', 'chong_poster.webp')), yuki: spr('yuki_go') };
// 虫虫用角色设定图最左边那张大立绘（张开双臂往前跑、左手卷轴、腰上罗盘），从原图 PNG 重新抠的（assets/cover/chong_poster.webp，只给封面用，不放 sprites/ 免得嵌进所有 full 网页）。
//   头的大小和其他三个人差不多。横版她的头要躲开标语「搬到云上」（头发离「上」字约 13px），所以人往右挪；Damo 跟着挪到奖杯下面（奖杯连光晕、影子上提 18，别顶在 Damo 头上），
//   位置按「要么明确分开、要么明确前后叠压，别刚好碰上」量过：虫虫指尖离 Damo 耳朵约 27px、她的披风尾巴离 Damo 的披风约 13px、鞋底离画框底边 10px；
//   Damo 伸出的手套离 Yuki 的拳头约 20px，他的披风尖压在 Yuki 膝盖前面约 9px（Damo 本来就画在 Yuki 前面）。
//   奖杯连光晕、影子再往左挪 36（原来杯耳刚好碰着韩叔头发）：离韩叔约 18px、离虫虫 43px、离 Damo 32px，杯身上的「User Group」整行露出来；虫虫的马尾离「控账单」标签约 35px。
//   竖版 Damo 往右挪 35、高度 412：鞋底离画框底边约 10px，离韩叔 26px、离虫虫 25px、离 Yuki 35px；虫虫 left 为负，马尾出画框约 10px，不贴着左边框；
//   竖版 Yuki 的背包有意出右边框约 37px（原来 55px，切掉一截像被裁）
const logo = size => `<div class="logo" style="font-size:${size}px"><span class="ext">云上大亨</span><span class="fill">云上大亨</span><span class="shine">云上大亨</span>
  <img class="deco" src="${CLOUD}" style="left:-.06em;top:-.3em;width:.82em"><img class="deco" src="${IMG.crown}" style="left:3.3em;top:-.3em;width:.56em;transform:rotate(14deg)"></div>`;

const css = `
*{margin:0;padding:0;box-sizing:border-box}
body{width:var(--w);height:var(--h);overflow:hidden;background:#070b16;font-family:'PingFang SC','Hiragino Sans GB',sans-serif}
.c{position:relative;width:100%;height:100%;overflow:hidden}
.bg{position:absolute;inset:0;background:url(${IMG.board}) var(--bgpos)/cover no-repeat}
.shade{position:absolute;inset:0;background:var(--shade)}
.glow{position:absolute;border-radius:50%;filter:blur(30px)}
img{position:absolute;display:block}
.sh{position:absolute;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.55),rgba(0,0,0,0));}
.t{position:absolute;color:#fff}
.t .ug{font-weight:800;letter-spacing:.02em;text-shadow:0 4px 18px rgba(0,0,0,.6)}
@font-face{font-family:'SHS Heavy';src:url(${FONT}) format('opentype')}
/* 海报大字：思源黑体特粗（开源 OFL，可商用）。三层叠起来：底层深棕描边 + 往下挤出的立体厚度，中层金色渐变，顶层上半截高光；云字头上一朵卡通云，亨字头上韩叔的王冠 */
.logo{position:relative;display:inline-block;font-family:'SHS Heavy',sans-serif;line-height:1.08;letter-spacing:.01em;white-space:nowrap}
.logo span{display:block}
.logo .ext{color:#a54600;-webkit-text-stroke:.09em #4a1800;text-shadow:${Array.from({ length: 14 }, (_, i) => `0 ${(i + 1) * 1.5}px 0 ${['#c25a00', '#b55200', '#a84a00', '#9a4300', '#8c3c00', '#7f3500', '#722f00', '#662900', '#5b2400', '#521f00', '#4a1b00', '#431800', '#3c1500', '#2e1000'][i]}`).join(',')},0 30px 36px rgba(0,0,0,.65)}
.logo .fill{position:absolute;left:0;top:0;background:linear-gradient(180deg,#fff8c8 0%,#ffe066 26%,#ffb52a 52%,#f58212 80%,#d65f00 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.logo .fill{-webkit-text-stroke:.012em rgba(255,246,200,.7)}
.logo .shine{position:absolute;left:0;top:0;background:linear-gradient(180deg,rgba(255,255,255,.95) 0%,rgba(255,255,255,.35) 30%,rgba(255,255,255,0) 46%);-webkit-background-clip:text;background-clip:text;color:transparent}
.logo .deco{position:absolute;filter:drop-shadow(0 6px 10px rgba(0,0,0,.45))}
.t h1{font-weight:900;line-height:1;letter-spacing:.06em;background:linear-gradient(180deg,#ffe6a8 0%,#ffb340 45%,#ec7211 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 6px 0 #6b2a00) drop-shadow(0 14px 30px rgba(236,114,17,.45))}
.t .slog{font-weight:800;text-shadow:0 3px 14px rgba(0,0,0,.7)}
.t .slog em{font-style:normal;color:#ffd23f}
.rib{display:inline-block;font-weight:900;color:#fff;background:linear-gradient(90deg,#d6282e,#ff5a3c);transform:skewX(-12deg);box-shadow:0 8px 24px rgba(214,40,46,.45)}
.rib span{display:inline-block;transform:skewX(12deg)}
.tags{display:flex;flex-wrap:wrap}
.tags b{font-weight:700;color:#ffe9c4;border:2px solid rgba(255,190,90,.55);background:rgba(10,14,26,.6)}
`;
// 不剧透：只放四个人平常的样子（不放黑化、巨大化的韩叔，也不提「讨伐」），棋盘中间立着大家要抢的 User Group 冠军奖杯
// 横版：左边大标题，右边棋盘上四个人围着奖杯
const wide = `
<div class="c">
  <div class="bg"></div><div class="shade"></div>
  <div class="glow" style="left:924px;top:222px;width:560px;height:520px;background:radial-gradient(closest-side,rgba(255,196,64,.6),rgba(255,196,64,0))"></div>
  <div class="sh" style="left:1064px;top:630px;width:280px;height:50px"></div>
  <img src="${IMG.trophy}" style="left:1076px;top:312px;height:340px;filter:drop-shadow(0 0 30px rgba(255,200,80,.8))">
  <div class="sh" style="left:1330px;top:742px;width:300px;height:54px"></div>
  <img src="${IMG.han}" style="left:1330px;top:330px;height:440px">
  <div class="sh" style="left:828px;top:1035px;width:293px;height:50px"></div>
  <img src="${IMG.chong}" style="left:816px;top:606px;height:468px">
  <div class="sh" style="left:1510px;top:986px;width:330px;height:56px"></div>
  <img src="${IMG.yuki}" style="left:1500px;top:590px;height:425px">
  <div class="sh" style="left:1123px;top:1042px;width:420px;height:60px"></div>
  <img src="${IMG.damo}" style="left:1103px;top:674px;height:400px">
  <!-- 标签行 margin-top 84：人群右移以后左下角空得多，把标签往下撑一点，画面重心别全压在右上。
       角标 48px、标签 40px（手机上全宽看横版，原来的 40 / 30 太小）；角标变高 11px，整块 top 从 108 提到 97，标语还在原来的位置（离虫虫头发约 13px） -->
  <div class="t" style="left:110px;top:97px;width:900px">
    <div class="rib" style="font-size:48px;padding:10px 34px;margin-bottom:26px"><span>谁能捧走冠军奖杯？</span></div>
    <div class="ug" style="font-size:60px">亚马逊云科技 User Group</div>
    <div style="margin:62px 0 34px -6px">${logo(190)}</div>
    <div class="slog" style="font-size:46px">令人怀念的经典桌游玩法，<em>搬到云上</em></div>
    <div class="tags" style="gap:12px;margin-top:84px;width:760px">${['买服务', '组架构', '扛事故', '控账单'].map(s => `<b style="font-size:40px;padding:8px 18px">${s}</b>`).join('')}</div>
  </div>
</div>`;
// 竖版 3:4：上面标题，中间奖杯，下面四个人
const tall = `
<div class="c">
  <div class="bg"></div><div class="shade"></div>
  <div class="glow" style="left:200px;top:600px;width:480px;height:460px;background:radial-gradient(closest-side,rgba(255,196,64,.6),rgba(255,196,64,0))"></div>
  <img src="${IMG.trophy}" style="left:300px;top:650px;height:320px;filter:drop-shadow(0 0 28px rgba(255,200,80,.8))">
  <div class="sh" style="left:640px;top:1100px;width:290px;height:52px"></div>
  <img src="${IMG.han}" style="left:640px;top:690px;height:430px">
  <div class="sh" style="left:0;top:1384px;width:300px;height:52px"></div>
  <img src="${IMG.chong}" style="left:-14px;top:946px;height:480px">
  <div class="sh" style="left:760px;top:1392px;width:320px;height:56px"></div>
  <img src="${IMG.yuki}" style="left:750px;top:1012px;height:405px">
  <div class="sh" style="left:305px;top:1402px;width:440px;height:60px"></div>
  <img src="${IMG.damo}" style="left:290px;top:1022px;height:412px">
  <div class="t" style="left:0;top:70px;width:1080px;text-align:center">
    <div class="rib" style="font-size:40px;padding:10px 34px;margin-bottom:24px"><span>谁能捧走冠军奖杯？</span></div>
    <div class="ug" style="font-size:56px">亚马逊云科技 User Group</div>
    <div style="margin:58px 0 30px">${logo(200)}</div>
    <div class="slog" style="font-size:42px">令人怀念的经典桌游玩法，<em>搬到云上</em></div>
  </div>
</div>`;

// 截图走 poster.mjs（和人物一览图共用）：headless Chrome 按 2 倍像素截整页，再缩回原尺寸
const P = await openPoster();
const shot = async (html, w, h, vars, out) => {
  await P.shot(`<!doctype html><html><head><meta charset="utf-8"><style>:root{--w:${w}px;--h:${h}px;${vars}}${css}</style></head><body>${html}</body></html>`, w, h, out);
  console.log(path.relative(ROOT, out));
};
await shot(wide, 1920, 1080, '--bgpos:62% 50%;--shade:linear-gradient(90deg,rgba(5,8,18,.92) 0%,rgba(5,8,18,.72) 34%,rgba(5,8,18,.15) 60%,rgba(5,8,18,0) 80%),linear-gradient(0deg,rgba(5,8,18,.55),rgba(5,8,18,0) 30%)', path.join(OUT, 'full宣传片封面.jpg'));
// 竖版底图 13%（原来 18%）：标语整行落在深色底上；18% 时「搬到云上」的「云上」压在棋盘左上角 EFS、EC2 那几个白格上，看不清
await shot(tall, 1080, 1440, '--bgpos:13% 50%;--shade:linear-gradient(180deg,rgba(5,8,18,.92) 0%,rgba(5,8,18,.7) 30%,rgba(5,8,18,.12) 52%,rgba(5,8,18,.35) 100%)', path.join(OUT, 'full宣传片封面_竖版.jpg'));
P.close(); setTimeout(() => process.exit(0), 400);
