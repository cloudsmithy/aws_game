// 手册网页版：docs/ 下的 Markdown 和 PDF → code/manual/*.html（跟着 code/ 一起发布，游戏里「手册（网页版）」链到这里）。
//
//   node web/tools/build-manuals.mjs           全部重新生成（PDF 那几本要装 poppler：pdftotext）
//   node web/tools/build-manuals.mjs --check   只核对 Markdown 生成的几页和目录页是不是最新的（CI 跑，不用 poppler）
//
// 有 Markdown 源的（规则书、玩法手册、玩法速览，以及从规则书摘章节的两本图鉴）直接渲染；
// 其余 PDF 的源头不在仓库里，用 pdftotext -bbox-layout 拿到每个词的坐标，按位置认出标题、段落、列表和表格。
// 纯打印的（卡牌、棋盘）留 PDF，目录页链到 GitHub。
// 共用样式 code/manual/manual.css 是手写的（照 docs/更新说明.html 的样子），这里不生成。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { Marked } from 'marked';

const ROOT = resolve(import.meta.dirname, '../..'), DOCS = join(ROOT, 'docs'), OUT = join(ROOT, 'code/manual');
const GH = 'https://github.com/cloudsmithy/aws_game/blob/master/docs/';
const CHECK = process.argv.includes('--check');

// 目录照 docs/手册 分组。md：有源文件；only：只取规则书里这几节（图鉴就是规则书的摘录）；print：留 PDF
const md = (name, src, lead, only) => ({ name, src, lead, only });
const pdf = name => ({ name });
const print = name => ({ name, print: true });
const MODES = ['入门局', '标准局', '完整局', '地狱模式', '娱乐模式', '学习模式'];
const GROUPS = [
  ['0-组织者', '组织者', [pdf('UG 活动流程单'), pdf('组织者包')]],
  ['1-玩家', '玩家', [md('玩法速览', '玩法速览.md'), md('玩法手册', '玩法手册.md'), pdf('速查卡'), pdf('术语对照')]],
  ['2-主持人', '主持人', [md('主持人规则书', '规则书.md'), pdf('主持人规则书简版'), pdf('分级规则手册')]],
  ['3-模式', '模式', [...MODES.map(pdf), ...MODES.map(n => pdf(`简版/${n}简版`))]],
  ['4-专题', '专题', ['代理商模式', '高速部署与技能'].flatMap(n => [pdf(n), pdf(`简版/${n}简版`)])],
  ['5-图鉴', '图鉴', [
    md('服务图鉴', '规则书.md', '从「主持人规则书」摘出的服务详情：服务类型、每个服务的特性和升级、运行费与请求费。', ['5.', '8.', '9.']),
    pdf('有效架构图鉴'),
    md('题库与答案', '规则书.md', '从「主持人规则书」摘出的题库：边玩边答题的规则、全部题目、答案和解析。', ['25.', '附录']),
  ]],
  ['6-打印', '打印', [print('卡牌'), print('棋盘与配件')]],
];
for (const [dir, group, items] of GROUPS) for (const m of items) {
  m.group = group;
  m.pdf = `手册/${dir}/${m.name}.pdf`;
  m.title = m.name.split('/').pop();
  m.page = m.title.replace(/\s+/g, '-') + '.html';
}
const ALL = GROUPS.flatMap(g => g[2]);
const byTitle = t => ALL.find(m => m.title === t);
// docs/常用手册 是从 docs/手册 拷过来的同一批文件：目录页指到同一页，不再生成一份
const COMMON = [['1-玩法速览', '玩法速览'], ['2-玩法手册', '玩法手册'], ['3-速查卡', '速查卡'], ['4-主持人规则书', '主持人规则书'],
  ['5-UG 活动流程单', 'UG 活动流程单'], ['6-卡牌（实体版打印）', '卡牌'], ['7-棋盘与配件（实体版打印）', '棋盘与配件']];

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ghLink = p => GH + p.split('/').map(encodeURIComponent).join('/');
const href = p => p.split('/').map(encodeURIComponent).join('/');

// ---------- 页面骨架 ----------
function page({ title, kicker, lead, pdfPath, toc, body, note, back = '<a href="index.html">← 全部手册</a>' }) {
  const links = [back, pdfPath && `<a href="${ghLink(pdfPath)}">原版 PDF（GitHub）</a>`].filter(Boolean).join('');
  const nav = toc && toc.length ? `\n<nav class="toc">${toc.map(([id, t]) => `<a href="#${id}">${t}</a>`).join('')}</nav>` : '';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · 亚马逊云科技 User Group 云上大亨</title>
<link rel="stylesheet" href="manual.css">
</head>
<body>
<div class="wrap">
<header>
<div class="k">${kicker}</div>
<h1>${esc(title)}</h1>${lead ? `\n<p>${lead}</p>` : ''}
<nav class="links">${links}</nav>${nav}
</header>
${body}
<footer>${note}</footer>
</div>
</body>
</html>
`;
}

// 正文按 h2 切成一段段卡片（和更新说明一个样子），目录就是这些 h2
function sections(html) {
  const parts = html.split(/(?=<h2 )/);
  const head = parts[0].trim() ? [`<section>\n${parts.shift().trim()}\n</section>`] : (parts.shift(), []);
  return head.concat(parts.map(p => `<section>\n${p.trim()}\n</section>`)).join('\n');
}
const tocOf = html => [...html.matchAll(/<h2 id="([^"]+)">(.*?)<\/h2>/g)].map(m => [m[1], m[2].replace(/<[^>]+>/g, '')]);

// ---------- Markdown ----------
function fromMarkdown(m) {
  let src = readFileSync(join(DOCS, m.src), 'utf8');
  src = src.replace(/^# .+\n/m, '');   // 书名放在页头
  let lead = m.lead;
  if (m.only) {   // 只留指定的几节：按「## 」切开，挑标题开头对得上的
    src = src.split(/^(?=## )/m).filter(s => m.only.some(p => s.startsWith('## ' + p))).join('');
  } else {        // 第一节之前的第一段当导语
    const intro = src.split(/^## /m)[0].trim().split(/\n\n/)[0];
    if (intro && !intro.startsWith('>') && !intro.startsWith('-')) { lead = intro; src = src.replace(intro, ''); }
  }
  let n = 0;
  const marked = new Marked({ gfm: true });
  marked.use({ renderer: { heading({ tokens, depth }) { return `<h${depth} id="s${++n}">${this.parser.parseInline(tokens)}</h${depth}>\n`; } } });
  const html = marked.parse(src).replace(/<table>/g, '<div class="tw"><table>').replace(/<\/table>/g, '</table></div>');
  return page({
    title: m.title, kicker: `MANUAL · ${m.group}`, lead: lead && marked.parseInline(lead), pdfPath: m.pdf,
    toc: tocOf(html), body: sections(html),
    note: `本页由 <code>web/tools/build-manuals.mjs</code> 从 <code>docs/${m.src}</code> 生成：改内容请改源文件再重新生成。`,
  });
}

// ---------- PDF ----------
// pdftotext -bbox-layout：每个词带坐标。拼成「视觉行」（同一高度的词），行里大空隙切成「片段」（表格的格子、两栏排版的左右栏）
function pdfWords(file) {
  const xml = execFileSync('pdftotext', ['-bbox-layout', file, '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  const num = s => +s;
  const unesc = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  return xml.split('<page ').slice(1).map(p => ({
    w: num(p.match(/width="([\d.]+)"/)[1]), h: num(p.match(/height="([\d.]+)"/)[1]),
    words: [...p.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)]
      .map(m => ({ x0: num(m[1]), y0: num(m[2]), x1: num(m[3]), y1: num(m[4]), t: unesc(m[5]) })),
  }));
}

// 坐标里的高度是字框高（约 1.7 倍字号），下面的阈值都按它算
function rows(words) {
  const out = [];
  for (const w of [...words].sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0)) {
    const r = out.find(r => Math.abs((r.y0 + r.y1) / 2 - (w.y0 + w.y1) / 2) < (w.y1 - w.y0) * 0.35);
    if (r) { r.words.push(w); r.y0 = Math.min(r.y0, w.y0); r.y1 = Math.max(r.y1, w.y1); } else out.push({ y0: w.y0, y1: w.y1, words: [w] });
  }
  for (const r of out) {
    r.words.sort((a, b) => a.x0 - b.x0);
    r.h = r.words.map(w => w.y1 - w.y0).sort((a, b) => a - b)[r.words.length >> 1];   // 中位数：行内代码之类的小字不带偏
    r.frags = [];
    for (const w of r.words) {   // 词距差不多一个字宽就算新的一格；紧挨着的（标点）不补空格
      const f = r.frags.at(-1), gap = f ? w.x0 - f.x1 : Infinity;
      if (gap < r.h * 0.3) { f.t += (gap < r.h * 0.06 ? '' : ' ') + w.t; f.x1 = w.x1; } else r.frags.push({ x0: w.x0, x1: w.x1, t: w.t });
    }
    r.x0 = r.frags[0].x0; r.x1 = r.frags.at(-1).x1; r.t = r.frags.map(f => f.t).join(' ');
  }
  return out.sort((a, b) => a.y0 - b.y0);
}

// 段落换行处：中文接中文、挨着中文标点不补空格；英文、数字和中文之间照仓库写法留一个空格
const CJK = /[⺀-鿿　-〿＀-￯]/, PUNCT = /[　-〿＀-￯]/;
const join2 = (a, b) => !a ? b : (CJK.test(a.at(-1)) && CJK.test(b[0])) || PUNCT.test(a.at(-1)) || PUNCT.test(b[0]) ? a + b : a + ' ' + b;
const reflow = (r, frags) => ({ ...r, frags, x0: frags[0].x0, x1: frags.at(-1).x1, t: frags.map(f => f.t).join(' ') });

// 两栏排版（速查卡）：正中间有一条竖缝（只有页顶最多两行跨过去，比如页眉），左栏的字大多写到缝边上，就拆成左栏、右栏先后读。
// 表格的列缝不算：表格第一列都很短，写不到缝边
function columns(rs, w) {
  const cuts = [...new Set(rs.flatMap(r => r.frags).map(f => Math.round(f.x0)).filter(x => Math.abs(x - w / 2) < w * 0.06))].sort((a, b) => a - b);
  for (const cut of cuts) {
    const across = r => r.frags.some(f => f.x0 < cut - 2 && f.x1 > cut - 2);
    const left = rs.filter(r => !across(r) && r.x0 < cut - 2).map(r => r.frags.filter(f => f.x0 < cut - 2).at(-1).x1);
    if (rs.slice(2).some(across) || left.filter(x => x > cut - w * 0.1).length < Math.max(8, left.length * 0.3)) continue;
    const side = right => rs.map(r => across(r) ? (right ? [] : r.frags) : r.frags.filter(f => (f.x0 >= cut - 2) === right))
      .map((f, i) => f.length && reflow(rs[i], f)).filter(Boolean);
    return [side(false), side(true)];
  }
  return [rs];
}

const NUMERAL = /^([一二三四五六七八九十]+|\d{1,2}|附)$/;
const isFooter = r => /^亚马逊云科技 User Group 云上大亨 · .*提 issue/.test(r.t) || /^\d+$/.test(r.t) || /^github\.com\/\S+$/.test(r.t);
const COVER = /^[A-Z][A-Z ·]*( · 云上创业)?$|^亚马逊云科技 User Group$|^云上大亨$|^作者：|^规则有问题|提 issue/;

// 一页页的视觉行 → 块：h2 / h3 / p / ul / ol / table
function structure(pages, title) {
  const blocks = [], lead = [];
  const hs = pages.flatMap(p => p.rows).map(r => Math.round(r.h));
  const left = Math.min(...pages.slice(1).flatMap(p => p.rows).filter(r => !isFooter(r)).map(r => r.x0));   // 正文左边距：整本统一，页首全是列表时也认得出缩进
  const body = +Object.entries(hs.reduce((m, h) => (m[h] = (m[h] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1])[0][0];   // 最常见的字高 = 正文
  let cur = null, table = null;
  pages.forEach((pg, pi) => {
    let rs = pg.rows.filter(r => !isFooter(r) && !/^2–4 人 · |^云上大亨 · /.test(r.t))
      .map(r => r.frags.length > 1 && r.frags[0].t === title ? reflow(r, r.frags.slice(1)) : r);   // 页眉上的书名不要
    const toc = rs.findIndex(r => r.t === '目录');   // 原 PDF 的目录页不要：网页自己有目录
    if (toc >= 0) rs = rs.slice(0, toc);
    if (pi === 0) {   // 封面：大字标题、英文角标、作者和 issue 行不要，剩下的正文大小的句子当导语
      const end = rs.findIndex(r => /提 issue/.test(r.t));
      for (const r of rs.slice(0, end + 1)) {
        const t = r.t.replace(/^[A-Z][A-Z ]+ · /, '');
        if (!COVER.test(r.t) && r.h < body * 1.15 && t.replace(/\s/g, '') !== title.replace(/\s/g, '')) lead.push(t);
      }
      rs = rs.slice(end + 1);
      // 免责声明（每本都一样）：标签在色块里、正文另起，按格子认会认成表格，直接按字拼到「游戏币单位。」为止
      const d = rs.findIndex(r => r.t.startsWith('免责声明')), e = rs.findIndex(r => /单?位。$/.test(r.t));
      if (d >= 0 && e >= d) { blocks.push({ t: 'p', items: [rs.slice(d, e + 1).map(r => r.t).reduce(join2)] }); rs.splice(d, e - d + 1); }
    }
    const cols = columns(rs, pg.w);
    for (const col of cols) {
      // 右边界取单片段行的第 90 百分位：不被跨栏的页眉、偶尔超出的长行带偏
      const L = cols.length > 1 || pages.length === 1 ? Math.min(...col.map(r => r.x0)) : left, ends = col.filter(r => r.frags.length === 1).map(r => r.x1).sort((a, b) => a - b);
      const R = ends.length ? ends[Math.floor(ends.length * 0.9)] : Math.max(...col.map(r => r.x1));
      let prev = null;
      for (const r of col) {
        const tight = prev && r.y0 - prev.y0 < r.h * 0.72;          // 行距和段内换行一样
        const full = prev && prev.x1 > R - prev.h * 2.5;           // 上一行写满到右边：这一行是接着的
        const big = Math.max(...r.words.map(w => w.y1 - w.y0)) > body * 1.2;
        if (big && r.words.length > 1 && NUMERAL.test(r.words[0].t)) {
          cur = table = null; blocks.push({ t: 'h2', text: r.words.map(w => w.t).join(' ') });
        } else if (big && r.h > body * 1.2 && r.frags.length === 1 && r.t.length < 40) {
          cur = table = null; blocks.push({ t: 'h3', text: r.t });
        } else if (r.frags.length > 1 || (table && r.x0 > table.cols[0] - 2 && (!prev || r.y0 - prev.y0 < r.h))) {
          // 表格：第一行（表头）各格的起点定列；落在第一列的片段开新行，其余接到当前行对应的格子
          if (!table) { cur = null; table = { t: 'table', cols: r.frags.map(f => f.x0), rows: [] }; blocks.push(table); }
          for (const f of r.frags) {
            if (f.x0 < table.cols[0] - 4) { table.cols.unshift(f.x0); table.rows.forEach(row => row.unshift('')); }   // 表头第一格是空的：补出第一列
            const c = Math.max(0, table.cols.findLastIndex(x => x <= f.x0 + 4));
            if (c === 0 || !table.rows.length) table.rows.push(table.cols.map(() => ''));
            const row = table.rows.at(-1);
            row[c] = join2(row[c], f.t);
          }
        } else {
          table = null;
          const ol = r.t.match(/^(\d+)\.\s*(.*)$/), kind = ol ? 'ol' : r.x0 - L > body * 0.3 ? 'ul' : 'p';
          if (cur && tight && full && !ol && (kind === cur.t || cur.t === 'ol')) cur.items[cur.items.length - 1] = join2(cur.items.at(-1), r.t);
          else if (cur && cur.t === kind && kind !== 'p') cur.items.push(ol ? ol[2] : r.t);
          else { cur = { t: kind, items: [ol ? ol[2] : r.t] }; blocks.push(cur); }
        }
        prev = r;
      }
    }
  });
  return { blocks, lead: lead.join(' ') };
}

const inline = s => esc(s).replace(/(github\.com\/cloudsmithy\/aws_game\/issues)/g, '<a href="https://$1">$1</a>')
  .replace(/^(免责声明)[：:]?\s*/, '<b>$1</b>：');
function renderBlocks(blocks) {
  let n = 0;
  // 加粗的小标题在 PDF 里和正文一样大：一行短句、不带标点，后面紧跟列表或表格，就当小标题
  blocks.forEach((b, i) => { if (b.t === 'p' && b.items[0].length <= 24 && !/[。；，：]$/.test(b.items[0]) && /ul|ol|table/.test(blocks[i + 1]?.t)) Object.assign(b, { t: 'h3', text: b.items[0] }); });
  return blocks.map(b => {
    if (b.t === 'h2' || b.t === 'h3') return `<${b.t} id="s${++n}">${esc(b.text)}</${b.t}>`;
    if (b.t === 'p') return `<p${/^免责声明/.test(b.items[0]) ? ' class="muted"' : ''}>${inline(b.items[0])}</p>`;
    if (b.t === 'table' && b.rows.flat().some(c => /^[→⇄←+]$/.test(c)))   // 架构图（方框加箭头）：拼成一行「A → B」，价格行不要
      return `<p class="flow">${inline(b.rows.flat().filter(c => c && !/ · \$\d/.test(c)).join(' '))}</p>`;
    if (b.t === 'table') {
      const [head, ...rest] = b.rows, cell = (tag, c) => `<${tag}>${inline(c)}</${tag}>`;
      return `<div class="tw"><table>\n<thead><tr>${head.map(c => cell('th', c)).join('')}</tr></thead>\n<tbody>\n${rest.map(r => `<tr>${r.map(c => cell('td', c)).join('')}</tr>`).join('\n')}\n</tbody></table></div>`;
    }
    return `<${b.t}>\n${b.items.map(i => `<li>${inline(i)}</li>`).join('\n')}\n</${b.t}>`;
  }).join('\n');
}

function fromPdf(m) {
  const pages = pdfWords(join(DOCS, m.pdf)).map(p => ({ ...p, rows: rows(p.words) }));
  const { blocks, lead } = structure(pages, m.title);
  const html = renderBlocks(blocks);
  return page({
    title: m.title, kicker: `MANUAL · ${m.group}`, lead: lead && inline(lead), pdfPath: m.pdf, toc: tocOf(html), body: sections(html),
    note: `本页由 <code>web/tools/build-manuals.mjs</code> 从 PDF 抽取文字自动排版，版式和图片以<a href="${ghLink(m.pdf)}">原版 PDF</a> 为准。`,
  });
}

// ---------- 目录页 ----------
function index() {
  const item = m => m.print
    ? `<li><a href="${ghLink(m.pdf)}">${esc(m.title)}</a><span class="tag print">打印用 PDF</span></li>`
    : `<li><a href="${href(m.page)}">${esc(m.title)}</a><a class="pdf" href="${ghLink(m.pdf)}">PDF</a></li>`;
  const groups = GROUPS.map(([dir, label, items]) => `<section>\n<h2><i>${dir[0]}</i>${label}</h2>\n<ul class="list">\n${items.map(item).join('\n')}\n</ul>\n</section>`);
  const common = COMMON.map(([file, t]) => {
    const m = byTitle(t);
    return `<li><a href="${m.print ? ghLink(`常用手册/${file}.pdf`) : href(m.page)}">${esc(file)}</a>${m.print ? '<span class="tag print">打印用 PDF</span>' : ''}</li>`;
  });
  return page({
    title: '手册（网页版）', kicker: 'MANUALS', pdfPath: null, back: '<a href="../index.html">← 回到游戏</a>',
    lead: '亚马逊云科技 User Group 云上大亨的全部手册，手机上也能直接看。卡牌和棋盘是打印用的，仍是 PDF。',
    body: groups.join('\n') + `\n<section>\n<h2><i>★</i>常用手册</h2>\n<p class="muted">仓库里 <code>docs/常用手册/</code> 是从上面挑出来按使用先后编号的 7 份，内容相同。</p>\n<ul class="list">\n${common.join('\n')}\n</ul>\n</section>`,
    note: '本页由 <code>web/tools/build-manuals.mjs</code> 生成。规则有问题、发现 bug 或有建议：<a href="https://github.com/cloudsmithy/aws_game/issues">github.com/cloudsmithy/aws_game/issues</a>',
  });
}

// ---------- 入口 ----------
const outputs = [['index.html', index]];
for (const m of ALL) if (!m.print) outputs.push([m.page, () => (m.src ? fromMarkdown : fromPdf)(m), !m.src]);

if (CHECK) {   // 只核对不依赖 PDF 的页（Markdown 生成的和目录页）
  const stale = outputs.filter(([f, gen, isPdf]) => !isPdf && (!existsSync(join(OUT, f)) || readFileSync(join(OUT, f), 'utf8') !== gen())).map(([f]) => f);
  if (stale.length) { console.error(`code/manual/ 不是最新的：${stale.join('、')}\n改了 docs/*.md 之后跑 node web/tools/build-manuals.mjs，再一起提交`); process.exit(1); }
  console.log('code/manual/ 是最新的');
} else {
  // 常用手册核对：每份都得和对应的那本文字一样，不一样就说明拷的时候漏了，不能共用一页
  const text = p => execFileSync('pdftotext', [join(DOCS, p), '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  for (const [file, t] of COMMON) if (text(`常用手册/${file}.pdf`) !== text(byTitle(t).pdf)) throw new Error(`docs/常用手册/${file}.pdf 和 ${byTitle(t).pdf} 内容不同`);
  mkdirSync(OUT, { recursive: true });
  for (const [f, gen] of outputs) writeFileSync(join(OUT, f), gen());
  console.log(`写好 ${outputs.length} 页到 code/manual/`);
}
