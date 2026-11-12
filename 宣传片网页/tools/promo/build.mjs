// 生成宣传片 / 讲解视频的网页（单文件，可以直接双击看）。
// 数据（棋盘、图标、卡牌、数量）和 three.js 都从 index.html 里取，网页改了重新跑一遍就同步。
// 用法：node tools/promo/build.mjs [promo|explain|modes|promo_party ...]，默认 promo；modes = 6 个模式各一条
import fs from 'node:fs';
import path from 'node:path';
import D, { ROOT, GAME_HTML } from '../gamedata.mjs';

const HERE = path.join(ROOT, 'tools', 'promo'), OUT = process.env.PROMO_OUT ? path.resolve(process.env.PROMO_OUT) : path.basename(ROOT) === '宣传片网页' ? ROOT : path.join(ROOT, '宣传片');   // aws_game 仓库里脚本在 宣传片网页/tools/，网页就输出在 宣传片网页/
const html = fs.readFileSync(GAME_HTML, 'utf8');
const three = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('build/three'));
if (!three) throw new Error('index.html 里找不到内嵌的 three.js');

const cardOf = (type, name) => {
  const list = type === 'inc' ? D.INC : D.REI, k = list.findIndex(x => x && x.n === name);
  if (k < 0) return null;
  const c = list[k], cat = c.c ? (D.CATS || {})[c.c] : '';
  return { type, n: c.n, e: c.e, im: c.im, tip: c.tip, art: D.AWSI[c.art] ? c.art : (type === 'inc' ? 'health' : 'reinvent'), head: type === 'inc' ? `Health 事件 · ${cat} · #${k}` : `re:Invent 卡 · #${k}` };
};
const social = ['踩坑大会', 'Office Hours', '白板画架构', '服务名接龙', '技术分享会', 'Keynote 现场演示成功'].map(n => cardOf('rei', n)).filter(Boolean).slice(0, 4);
const data = {
  sq: D.SQ.map(s => ({ n: s.n, k: s.k, t: s.t, g: s.g, icon: D.AWSI[s.icon] ? s.icon : 'cloud', p: s.p })),
  groups: D.GROUPS, icons: D.AWSI,
  cards: { az: cardOf('inc', '一个 AZ 断电了'), s3: cardOf('inc', 'S3 桶被设成了公开'), free: cardOf('rei', '领到 Free Tier 额度'), wa: cardOf('rei', 'Well-Architected Review 通过'), social, good: ['拿到 Activate 创业扶持 Credits', '考过了 Solutions Architect 认证', 'Hackathon 拿了奖'].map(n => cardOf('rei', n)).filter(Boolean) },
  // 讲解视频「专属技能」和「边玩边答题」两章用到的数据
  skill: (r => r && { type: 'skill', n: r.sk.n, e: r.sk.d, role: r.n, art: 'billing', stat: '$150 × 4', statSub: '接下来 4 个回合，每位对手付你订阅费', e2: '每回合开始，对手各付你 $150' })(D.ROLES.find(r => r.n === 'SaaS 创业公司')),
  quiz: D.QUIZ.storage[0],
  quizDb: D.QUIZ.db.find(q => q.q.includes('RDS 多 AZ')) || D.QUIZ.db[0],
  // full 宣传片「10 学习模式」：虫虫落在没人买的 Kinesis 上，换成分析组的 Kinesis 题（promo_full.js 有 quizAna 才换题头和题目）
  quizAna: D.QUIZ.ana.find(q => q.q.includes('Kinesis')) || D.QUIZ.ana[0],
  dlc: Object.entries(D.DLC).map(([k, v]) => ({ k, n: v.n, d: v.d, icon: D.AWSI[v.icon] ? v.icon : 'cloud', quiz: !!v.quiz })),
  stats: {
    cells: D.SQ.length, svc: Object.keys(D.SVC).length,
    cards: D.INC.filter(Boolean).length + D.REI.filter(Boolean).length, combos: D.COMBOS.length,
    quiz: Object.values(D.QUIZ).flat().length + Object.values(D.QBANK).reduce((n, b) => n + b.qs.length, 0),
  },
};
// Q 版人物贴图：用户给的角色设定图抠好底，切成五个角度 + 几个动作 + 立绘（assets/sprites/<谁>_<名字>.webp + <谁>.json），只放进 full 宣传片
const SPR = path.join(HERE, 'assets', 'sprites'), sprites = {};
if (fs.existsSync(SPR)) for (const f of fs.readdirSync(SPR).filter(f => f.endsWith('.json'))) { const who = f.slice(0, -5), meta = JSON.parse(fs.readFileSync(path.join(SPR, f), 'utf8'));
  sprites[who] = Object.fromEntries(Object.entries(meta).map(([v, m]) => { const ext = m.f || 'png'; return [v, { ...m, src: `data:image/${ext};base64,` + fs.readFileSync(path.join(SPR, `${who}_${v}.${ext}`)).toString('base64') }]; })); }
// 道具和表情头像：设定图「细节元素」「表情设计」里切出来的（assets/props/<谁>_<名字>.webp + props.json），也只放进 full 宣传片
// PROMO_DATA.props = { han_crown: { w, h, src, label: '王冠', who: 'han', kind: 'prop' | 'fx' | 'exp' }, … }
const PRP = path.join(HERE, 'assets', 'props'), props = {};
if (fs.existsSync(path.join(PRP, 'props.json'))) for (const [k, m] of Object.entries(JSON.parse(fs.readFileSync(path.join(PRP, 'props.json'), 'utf8')))) {
  const ext = m.f || 'webp';
  props[k] = { w: m.w, h: m.h, src: `data:image/${ext};base64,` + fs.readFileSync(path.join(PRP, `${k}.${ext}`)).toString('base64'), label: m.label, who: m.who, kind: m.kind };
}
// 封面（tools/promo/cover.mjs 生成的横版）：full 宣传片开头那 0.8 秒、网页打开时的第一屏都用它
const COVER = path.join(OUT, 'full宣传片封面.jpg'), cover = fs.existsSync(COVER) ? 'data:image/jpeg;base64,' + fs.readFileSync(COVER).toString('base64') : '';
const extra = fs.existsSync(path.join(HERE, 'explain_data.json')) ? JSON.parse(fs.readFileSync(path.join(HERE, 'explain_data.json'), 'utf8')) : null;
// 讲解视频里要跟着 index.html 走的几个数：角色卡开局资金、后走补贴、升级费 / 加容量费（按色组）、卖回折扣。只放进讲解网页，别的网页的数据一字不变
const xc = { roleCash: Object.fromEntries(D.ROLES.map(r => [r.n, r.cash])), seat: D.BAL.seatBonus || 0, sell: D.BAL.sell,
  up: Object.fromEntries(D.SQ.map((s, i) => [i, s.t === 'prop' ? D.sideCost(i) : 0])), cap: Object.fromEntries(D.SQ.map((s, i) => [i, s.t === 'prop' ? D.capCost(i) : 0])) };

const css = fs.readFileSync(path.join(HERE, 'style.css'), 'utf8') + '\n' + fs.readFileSync(path.join(HERE, 'style_open.css'), 'utf8'), engine = fs.readFileSync(path.join(HERE, 'engine.js'), 'utf8');
const PAGES = { promo: ['promo.js', '宣传片.html', '亚马逊云科技 User Group 云上大亨 · 宣传片'], explain: ['explain.js', '玩法讲解.html', '亚马逊云科技 User Group 云上大亨 · 玩法讲解'] };
// 每个模式一条宣传片：promo_party → 宣传片_娱乐模式.html（画面主线、配乐和 promo 共用，promo.js 按 PROMO_MODE 换片头、字幕、第 06 段和片尾）
// full 宣传片：promo.js 的主线 + promo_full.js 把 6 个模式的看点、专属技能、DLC 串成一条长片
PAGES.full = ['promo.js|chibi.js|promo_full.js|mascots.js|promo_open.js', 'full宣传片.html', '亚马逊云科技 User Group 云上大亨 · full 宣传片'];   // mascots.js：序章开头的服务卡通（只拼进 full）
const MODE_N = { party: '娱乐模式', basic: '入门局', std: '标准局', full: '完整局', study: '学习模式', hell: '地狱模式' };
for (const [k, n] of Object.entries(MODE_N)) PAGES['promo_' + k] = ['promo.js', `宣传片_${n}.html`, `亚马逊云科技 User Group 云上大亨 · ${n}宣传片`];
const ALL = process.argv.slice(2).includes('modes') ? Object.keys(MODE_N).map(k => 'promo_' + k) : null;
fs.mkdirSync(OUT, { recursive: true });
for (const name of (ALL || (process.argv.slice(2).length ? process.argv.slice(2) : ['promo']))) {
  const [src, file, title] = PAGES[name];
  const js = src.split('|').map(f => fs.readFileSync(path.join(HERE, f), 'utf8')).join('\n');
  // 音轨（mix.mjs 生成）直接嵌进网页，单文件也能放出声音
  const au = path.join(HERE, 'out', (name.startsWith('promo') ? 'promo' : name) + '_audio.m4a'), audio = fs.existsSync(au) ? 'data:audio/mp4;base64,' + fs.readFileSync(au).toString('base64') : '';
  const page = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${css}</style></head>
<body><div class="player"><div class="stage"><div class="ov"></div></div><div class="bar"><i></i></div><div class="hint">点画面暂停 / 继续 · 左右方向键快进快退</div><div class="big"><span>▶</span><b>点击播放（有声音）</b></div></div>
<script>${three}</script>
<script>window.PROMO_DATA = ${JSON.stringify(name === 'explain' && extra ? { ...data, explain: extra, xc } : name === 'full' ? { ...data, sprites, props, cover } : data)}; window.PROMO_AUDIO = ${JSON.stringify(audio)}; window.PROMO_MODE = ${JSON.stringify(name.startsWith('promo_') ? name.slice(6) : '')};</script>
<script>${engine}</script>
<script>${js}</script>
<script>PromoEngine.start((t, E) => PROMO_SCRIPT.run(t, E), PROMO_SCRIPT.duration);</script>
</body></html>`;
  fs.writeFileSync(path.join(OUT, file), page);
  console.log(`${file}  ${(page.length / 1024 / 1024).toFixed(2)} MB`);
}
