// 人物一览图（宣传片/Q版人物预览.jpg，1920×1080）：五个形象（韩叔、黑化韩叔、虫虫、Yuki、Damo），每人配名牌上的身份、三个表情头像、两件道具
// 人物用角色设定图切出来的立牌（assets/sprites，身高按 chibi.js 的 SPH 比例），表情和道具来自 assets/props
// 用法：node tools/promo/cast_sheet.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../gamedata.mjs';
import { openPoster } from './poster.mjs';

const A = path.join(ROOT, 'tools', 'promo', 'assets'), OUT = path.join(ROOT, '宣传片', 'Q版人物预览.jpg');
const uri = f => `data:image/${path.extname(f).slice(1).replace('jpg', 'jpeg')};base64,` + fs.readFileSync(f).toString('base64');
const SPH = { han: 2.1, damo: 1.9, chong: 1.9, yuki: 2.0 }, PX = 205;   // 和片子里一样的身高比例；1 个单位 = 205px
const meta = who => JSON.parse(fs.readFileSync(path.join(A, 'sprites', who + '.json'), 'utf8'));
const prop = n => uri(path.join(A, 'props', n + '.webp'));
const CAST = [
  { who: 'han', fr: 'front', n: '韩叔', c: '#e5484d', lines: ['User Group 讲师', '多年云计算经验 · Homelab 发烧友'], exp: ['confident', 'laugh', 'gentle'], props: ['scepter', 'trophy'] },
  { who: 'han', fr: 'dark', n: '黑化韩叔', c: '#a3243b', lines: ['第一代云上大亨', '纸醉金迷，用钱买走了奖杯', '片尾隐藏 BOSS'], exp: ['smug', 'proud', 'angry'], props: ['shades', 'flame'] },
  { who: 'chong', fr: 'front', n: '虫虫', c: '#2f7cf6', lines: ['亚马逊云科技认证大满贯', '拯救小队 · 队员'], exp: ['happy', 'cheer', 'surprised'], props: ['compass', 'scroll'] },
  { who: 'yuki', fr: 'front', n: 'Yuki', c: '#9b5cf6', lines: ['被队长抢了披风的探险家', '拯救小队 · 队员'], exp: ['confident', 'cheer', 'surprised'], props: ['buddy', 'dice'] },
  { who: 'damo', fr: 'front', n: 'Damo', c: '#1f9d55', lines: ['绰号「一拳超人」', '拯救小队 · 队长'], exp: ['fire', 'laugh', 'determined'], props: ['fireball', 'badge'] },
];
const W = 1920, H = 1080, COL = 352, X0 = (W - COL * CAST.length) / 2, FLOOR = 640;
const cols = CAST.map((p, k) => {
  const m = meta(p.who), f = m[p.fr], h = PX * SPH[p.who] * (f.h * (f.s || 1)) / m.front.h, w = h * f.w / f.h, cx = X0 + COL * (k + 0.5);
  const exps = p.exp.map(e => `<div class="ex" style="--c:${p.c}"><img src="${prop(`${p.who}_exp_${e}`)}"></div>`).join('');
  const props = p.props.map(q => `<div class="pr"><img src="${prop(`${p.who}_${q}`)}"></div>`).join('');
  return `<div class="spot" style="left:${cx - 230}px"></div>
  <div class="sh" style="left:${cx - 120}px;top:${FLOOR - 22}px"></div>
  <img class="ch" src="${uri(path.join(A, 'sprites', `${p.who}_${p.fr}.webp`))}" style="left:${cx - w / 2}px;top:${FLOOR - h}px;width:${w}px;height:${h}px">
  <div class="tag" style="left:${cx}px;top:${FLOOR - h - 58}px;--c:${p.c}">${p.n}</div>
  <div class="info" style="left:${cx - COL / 2 + 10}px;width:${COL - 20}px">${p.lines.map((l, j) => `<p class="${j ? '' : 'l0'}">${l}</p>`).join('')}
    <div class="row">${exps}</div><div class="row props">${props}</div></div>`;
}).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;overflow:hidden;font-family:'PingFang SC','Hiragino Sans GB',sans-serif;color:#fff;
  background:radial-gradient(120% 80% at 50% 0%,#2a1f5c 0%,#141a3a 45%,#0a0e1f 100%)}
.grid{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.08) 1.5px,transparent 1.6px);background-size:44px 44px;-webkit-mask-image:linear-gradient(#000,transparent 70%)}
.floor{position:absolute;left:0;right:0;top:${FLOOR}px;bottom:0;background:linear-gradient(#18203f,#0b1024)}
.floor::before{content:'';position:absolute;left:0;right:0;top:0;height:5px;background:linear-gradient(90deg,transparent,#ec7211 15%,#ffb340 50%,#ec7211 85%,transparent)}
.spot{position:absolute;top:0;width:460px;height:${FLOOR + 30}px;background:radial-gradient(60% 100% at 50% 100%,rgba(255,230,180,.13),transparent 70%);clip-path:polygon(38% 0,62% 0,100% 100%,0 100%)}
.sh{position:absolute;width:240px;height:44px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.6),transparent)}
.ch{position:absolute;filter:drop-shadow(0 10px 18px rgba(0,0,0,.45))}
.tag{position:absolute;transform:translateX(-50%);padding:8px 22px;border-radius:999px;font-size:28px;font-weight:900;letter-spacing:.04em;white-space:nowrap;
  background:linear-gradient(180deg,var(--c),color-mix(in srgb,var(--c) 70%,#000));border:2px solid rgba(255,255,255,.85);box-shadow:0 6px 20px rgba(0,0,0,.45),0 0 24px color-mix(in srgb,var(--c) 60%,transparent)}
.info{position:absolute;top:${FLOOR + 26}px;text-align:center}
.info p{font-size:19px;line-height:1.55;color:#c9d2ee;font-weight:600}
.info p.l0{font-size:22px;color:#fff;font-weight:800}
.row{display:flex;justify-content:center;gap:14px;margin-top:16px}
.ex{width:78px;height:78px;border-radius:18px;background:#fff;border:3px solid var(--c);box-shadow:0 0 0 2px #fff,0 6px 16px rgba(0,0,0,.4);overflow:hidden;display:flex;align-items:flex-end;justify-content:center}
.ex img{width:100%;height:100%;object-fit:cover;object-position:50% 20%}
.props{gap:22px;margin-top:14px}
.pr{width:84px;height:84px;display:flex;align-items:center;justify-content:center;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12)}
.pr img{max-width:72px;max-height:72px;filter:drop-shadow(0 4px 8px rgba(0,0,0,.5))}
.head{position:absolute;left:80px;top:54px}
.head small{display:block;font-size:22px;font-weight:700;color:#ffb340;letter-spacing:.18em}
.head b{display:block;font-size:46px;font-weight:900;letter-spacing:.06em;margin-top:6px}
</style></head><body><div class="grid"></div><div class="floor"></div>
<div class="head"><small>亚马逊云科技 User Group 云上大亨</small><b>人物一览</b></div>
${cols}</body></html>`;

const P = await openPoster();
await P.shot(html, W, H, OUT);
P.close();
console.log(path.relative(ROOT, OUT));
setTimeout(() => process.exit(0), 400);
