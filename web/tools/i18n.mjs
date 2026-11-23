// 游戏主体的多语言工具：直接读写 web/src/（替代开发目录里只认 code/index.html 的那版 tools/i18n.mjs）。
//
//   node web/tools/i18n.mjs ids        给新写的 _t(-1, "…") / _tf(-1, "…") / _tr(-1, "…", "") 分配编号（同样的中文复用老编号）
//   node web/tools/i18n.mjs build      用 code/i18n/en.json、ja.json 重新生成 web/src/data/i18n-table.js
//   node web/tools/i18n.mjs check      检查：编号冲突、占位符对不上、没翻译的、翻译表里过期的
//   node web/tools/i18n.mjs missing en > todo.json     导出还没翻译的中文（{ "中文": "" }），交给翻译
//   node web/tools/i18n.mjs merge en todo.json         把翻好的并进 en.json（空的跳过），再 build
//
// 规则（和老工具生成的表一致）：
// - 翻译表 __I18N[lang][编号] = lang.json[中文]；_tr 的键是 "re:/原式/标志"，值也写成 "re:/…/标志"；
// - 页面里写死的字在 core/01-i18n-runtime.js 的 __STATIC：[编号, 'h'|'a', 中文, …]，规则一样；
// - lang.json 里查不到的（中文改过、正则只在表里有）保留表里原来的译文，check 会列出来，免得一改中文译文就没了。
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const web = resolve(import.meta.dirname, '..');
const SRC = join(web, 'src'), TABLE = join(SRC, 'data/i18n-table.js'), JSONS = join(web, '../code/i18n');
const LANGS = ['en', 'ja'];
const STR = String.raw`"(?:[^"\\]|\\.)*"`;
const CALL = new RegExp(String.raw`\b_t([fr]?)\((-1|\d+),\s*(${STR})(?:,\s*(${STR}))?`, 'g');

const srcFiles = () => readdirSync(SRC, { recursive: true }).filter(f => f.endsWith('.js') && !f.startsWith('data')).sort().map(f => join(SRC, f));
const readJson = l => JSON.parse(readFileSync(join(JSONS, `${l}.json`), 'utf8'));
const readTable = () => { const t = readFileSync(TABLE, 'utf8'); return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)); };
const keyOf = e => e.k === 'r' ? `re:/${e.zh}/${e.fl}` : e.zh;
const holes = s => [...new Set(s.match(/\{\$\d+\}/g) || [])].sort().join();

// 源码里所有带编号的字：id → { k: ''|'f'|'r', zh, fl, at }
function scan() {
  const ids = new Map(), errs = [];
  const add = (id, e) => { const o = ids.get(id); if (o && keyOf(o) !== keyOf(e)) errs.push(`编号 ${id} 用在两段不同的字上：${o.at}「${o.zh.slice(0, 30)}」和 ${e.at}「${e.zh.slice(0, 30)}」`); else if (!o) ids.set(id, e); };
  for (const f of srcFiles()) {
    const text = readFileSync(f, 'utf8'), rel = f.slice(SRC.length + 1);
    for (const m of text.matchAll(CALL)) {
      if (m[2] === '-1') continue;   // 还没分配编号的（-1：运行时查不到译文，先显示中文），ids 子命令处理
      const at = `${rel}:${text.slice(0, m.index).split('\n').length}`;
      add(+m[2], { k: m[1], zh: JSON.parse(m[3]), fl: m[4] ? JSON.parse(m[4]) : '', at });
    }
    const st = text.match(/^const __STATIC = (.*);$/m);
    if (st) for (const [id, , zh] of JSON.parse(st[1])) add(id, { k: '', zh, fl: '', at: `${rel} __STATIC` });
  }
  return { ids, errs };
}

function build() {
  const { ids, errs } = scan(); if (errs.length) throw new Error(errs.join('\n'));
  const old = readTable(), out = {};
  for (const l of LANGS) {
    const J = readJson(l), arr = [];
    const n = Math.max(old[l].length, ...ids.keys()) + 1;
    for (let i = 0; i < n; i++) { const e = ids.get(i), v = e ? J[keyOf(e)] : undefined; arr[i] = v ?? old[l][i] ?? null; }
    while (arr.length && arr[arr.length - 1] == null) arr.pop();
    out[l] = arr;
  }
  const text = readFileSync(TABLE, 'utf8'), head = text.slice(0, text.indexOf('{'));
  writeFileSync(TABLE, head + JSON.stringify(out) + ';\n');
  console.log(`已生成 ${TABLE.slice(web.length + 1)}：${ids.size} 条`);
}

function check() {
  const { ids, errs } = scan(), table = readTable(), problems = [...errs];
  const todo = srcFiles().flatMap(f => [...readFileSync(f, 'utf8').matchAll(CALL)].filter(m => m[2] === '-1').map(() => f.slice(SRC.length + 1)));
  if (todo.length) problems.push(`有 ${todo.length} 处还没分配编号（先跑 ids）：${[...new Set(todo)].join('、')}`);
  for (const l of LANGS) {
    const J = readJson(l), miss = [], stale = [], hole = [];
    for (const [id, e] of ids) {
      const v = J[keyOf(e)] ?? null, t = table[l][id] ?? null;
      if (v == null) (t == null ? miss : stale).push(`${id} ${e.at}「${e.zh.slice(0, 40)}」`);
      const tr = v ?? t; if (tr != null && e.k !== 'r' && holes(tr) !== holes(e.zh)) hole.push(`${id} ${e.at}：中文 ${holes(e.zh) || '无'}，${l} ${holes(tr) || '无'}`);
      if (v != null && t !== v) stale.push(`${id} 翻译表没重新生成（跑 build）`);
    }
    const dead = table[l].map((v, i) => v != null && !ids.has(i) ? i : null).filter(i => i != null);
    console.log(`[${l}] 没翻译 ${miss.length}，${l}.json 里查不到、沿用表里旧译文的 ${stale.length}，占位符对不上 ${hole.length}，源码里已经不用的编号 ${dead.length}`);
    for (const [name, list] of [['没翻译', miss], ['沿用旧译文', stale], ['占位符对不上', hole]]) list.slice(0, 20).forEach(s => console.log(`  ${name}：${s}`));
    const unbuilt = stale.filter(x => x.includes('翻译表没重新生成')).length;   // 对照表里有了、表还是旧的：打包出来照旧显示中文，算错
    if (miss.length || hole.length || unbuilt) problems.push(`[${l}] 没翻译 ${miss.length}、占位符对不上 ${hole.length}、翻译表没重新生成 ${unbuilt}（跑 node web/tools/i18n.mjs build）`);
  }
  if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; } else console.log('多语言检查通过');
}

function ids() {
  const { ids: have, errs } = scan(); if (errs.length) throw new Error(errs.join('\n'));
  const byKey = new Map(); for (const [id, e] of have) byKey.set(e.k + '\u0000' + keyOf(e), id);
  let next = Math.max(...have.keys(), readTable().en.length - 1) + 1, added = 0, reused = 0;
  for (const f of srcFiles()) {
    const text = readFileSync(f, 'utf8');
    const out = text.replace(CALL, (all, k, id, zh, fl) => {
      if (id !== '-1') return all;
      const e = { k, zh: JSON.parse(zh), fl: fl ? JSON.parse(fl) : '' }, key = k + '\u0000' + keyOf(e);
      let n = byKey.get(key); if (n == null) { n = next++; byKey.set(key, n); added++; } else reused++;
      return all.replace(`_t${k}(-1,`, `_t${k}(${n},`);
    });
    if (out !== text) writeFileSync(f, out);
  }
  console.log(`新编号 ${added} 个，复用老编号 ${reused} 个${added ? '；记得把新字翻好（missing / merge）再 build' : ''}`);
}

function missing(l) {
  const { ids } = scan(), J = readJson(l), table = readTable(), out = {};
  for (const e of ids.values()) if (J[keyOf(e)] == null && out[keyOf(e)] === undefined) out[keyOf(e)] = table[l][[...ids].find(([, x]) => x === e)[0]] ?? '';
  console.log(JSON.stringify(out, null, 1));
}

function merge(l, file) {
  const J = readJson(l), add = JSON.parse(readFileSync(file, 'utf8')); let n = 0;
  for (const [k, v] of Object.entries(add)) if (typeof v === 'string' && v.trim()) { J[k] = v; n++; }
  writeFileSync(join(JSONS, `${l}.json`), JSON.stringify(J, null, 1));
  console.log(`并进 ${l}.json ${n} 条`);
  build();   // 并完马上重新生成翻译表：以前要再手动跑 build，忘了的话页面里新字照旧显示中文（第二十三轮的版本标题、「我埋的卡」就是这样漏的）
}

const [cmd, a, b] = process.argv.slice(2);
({ build, check, ids, missing: () => missing(a || 'en'), merge: () => merge(a, b) }[cmd] || (() => { console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(0, 8).join('\n')); process.exitCode = 1; }))();
