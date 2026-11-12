// 生成各模式玩法讲解的网页（单文件，可以直接双击看）：宣传片/玩法讲解_<模式名>.html
// 数据和 three.js 从 index.html 里取（同 build.mjs），时间数据和音轨从 mexp_out/<模式>/ 取（mexp_narrate.mjs、mexp_mix.mjs 生成）。
// 用法：node tools/promo/mexp_build.mjs [party basic std full study hell]，不写就是全部
import fs from 'node:fs';
import path from 'node:path';
import D, { ROOT, GAME_HTML } from '../gamedata.mjs';

const HERE = path.join(ROOT, 'tools', 'promo'), OUT = process.env.PROMO_OUT ? path.resolve(process.env.PROMO_OUT) : path.basename(ROOT) === '宣传片网页' ? ROOT : path.join(ROOT, '宣传片');   // aws_game 仓库里脚本在 宣传片网页/tools/，网页就输出在 宣传片网页/
const NAMES = { party: '娱乐模式', basic: '入门局', std: '标准局', full: '完整局', study: '学习模式', hell: '地狱模式' };
const html = fs.readFileSync(GAME_HTML, 'utf8');
const three = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('build/three'));
if (!three) throw new Error('index.html 里找不到内嵌的 three.js');

const cardAt = (type, k) => {
  const c = (type === 'inc' ? D.INC : D.REI)[k]; if (!c) return null;
  const cat = c.c ? (D.CATS || {})[c.c] : '';
  return { type, n: c.n, e: c.e, im: c.im, tip: c.tip, art: D.AWSI[c.art] ? c.art : (type === 'inc' ? 'health' : 'reinvent'), head: type === 'inc' ? `Health 事件 · ${cat} · #${k}` : `re:Invent 卡 · #${k}` };
};
// 讲解词里按卡名亮卡：全部 Health 和 re:Invent 卡按名字建索引
const cardsByName = {};
['inc', 'rei'].forEach(type => (type === 'inc' ? D.INC : D.REI).forEach((c, k) => { if (c && !cardsByName[c.n]) cardsByName[c.n] = cardAt(type, k); }));
const base = {
  sq: D.SQ.map(s => ({ n: s.n, k: s.k, t: s.t, g: s.g, icon: D.AWSI[s.icon] ? s.icon : 'cloud', p: s.p })),
  groups: D.GROUPS, icons: D.AWSI, cardsByName, cards: {}, quiz: D.QUIZ.storage[0],
  stats: {
    cells: D.SQ.length, svc: Object.keys(D.SVC).length,
    cards: D.INC.filter(Boolean).length + D.REI.filter(Boolean).length, combos: D.COMBOS.length,
    quiz: Object.values(D.QUIZ).flat().length + Object.values(D.QBANK).reduce((n, b) => n + b.qs.length, 0),
  },
};
// 娱乐模式里不常用的服务格是盲盒格（index.html 的 PARTY_HIDE / isHidden：类型是 prop、服务在 PARTY_HIDE 里，按 SQ[i].k 判断）。
// 只给娱乐模式讲解传 blind，engine.js 照网页棋盘把这些格子画成盲盒；别的模式、宣传片都不传
const ph = html.match(/const PARTY_HIDE = new Set\((\[[^\]]*\])\)/);
if (!ph) throw new Error('index.html 里找不到 PARTY_HIDE');
const PARTY_HIDE = JSON.parse(ph[1].replace(/'/g, '"'));
const blind = D.SQ.map((s, i) => s.t === 'prop' && PARTY_HIDE.includes(s.k) ? i : -1).filter(i => i >= 0);
if (blind.length !== PARTY_HIDE.length) throw new Error(`PARTY_HIDE 有 ${PARTY_HIDE.length} 个服务，棋盘上只对上 ${blind.length} 格`);
// 学习模式答题框（cue quiz: 'clf'）出云从业者题库里讲 S3 智能分层的那道题，表头照游戏的 qLabel 写「CLF-C02 · 考点名」，答对后的解析取第一句。
// 只给讲解词里用了 quiz: 'clf' 的模式传 quizBank；别的模式不传，mexp.js 照旧出存储组题
const clf = D.QBANK.clf, qbI = clf.qs.findIndex(q => q.o[0] === 'S3 Intelligent-Tiering');
if (qbI < 0) throw new Error('云从业者题库里找不到 S3 Intelligent-Tiering 那道题');
const qbq = clf.qs[qbI], quizBank = { q: qbq.q, o: qbq.o, a: qbq.a.split('。')[0], head: `${clf.exam} · ${clf.dom[qbq.dom] || ''}`, icon: clf.icon };
const css = fs.readFileSync(path.join(HERE, 'style.css'), 'utf8'), engine = fs.readFileSync(path.join(HERE, 'engine.js'), 'utf8'), js = fs.readFileSync(path.join(HERE, 'mexp.js'), 'utf8');
for (const mode of (process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(NAMES))) {
  const dir = path.join(HERE, 'mexp_out', mode), dataF = path.join(dir, 'data.json');
  if (!fs.existsSync(dataF)) { console.log(`${mode}：还没配音（先跑 mexp_narrate.mjs ${mode}），跳过`); continue; }
  const explain = JSON.parse(fs.readFileSync(dataF, 'utf8')), au = path.join(dir, 'audio.m4a');
  const audio = fs.existsSync(au) ? 'data:audio/mp4;base64,' + fs.readFileSync(au).toString('base64') : '';
  const title = `亚马逊云科技 User Group 云上大亨 · ${NAMES[mode]}玩法讲解`, file = `玩法讲解_${NAMES[mode]}.html`;
  const page = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${css}</style></head>
<body><div class="player"><div class="stage"><div class="ov"></div></div><div class="bar"><i></i></div><div class="hint">点画面暂停 / 继续 · 左右方向键快进快退</div><div class="big"><span>▶</span><b>点击播放（有声音）</b></div></div>
<script>${three}</script>
<script>window.PROMO_DATA = ${JSON.stringify({ ...base, ...(mode === 'party' ? { blind } : {}), ...(explain.segs.some(sg => sg.subs.some(u => u.cue && u.cue.quiz === 'clf')) ? { quizBank } : {}), explain })}; window.PROMO_AUDIO = ${JSON.stringify(audio)}; window.PROMO_MODE = ${JSON.stringify(mode)};</script>
<script>${engine}</script>
<script>${js}</script>
<script>PromoEngine.start((t, E) => PROMO_SCRIPT.run(t, E), PROMO_SCRIPT.duration);</script>
</body></html>`;
  fs.writeFileSync(path.join(OUT, file), page);
  console.log(`${file}  ${(page.length / 1024 / 1024).toFixed(2)} MB  ${explain.duration} 秒${audio ? '' : '（还没有音轨）'}`);
}
