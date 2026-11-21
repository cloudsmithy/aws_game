// 模块之间的依赖（按 import 语句统计）。
//   node web/tools/deps.mjs                 每个文件：export 几个名字、import 几个文件、被几个文件 import；再列循环依赖
//   node web/tools/deps.mjs --file ui/27-render.js   一个文件从哪些文件 import 了什么
//   node web/tools/deps.mjs --json          机器可读：{ files, edges: [{ from, to, names }] }
// 文件顺序就是 src/main.js 里的加载顺序。
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import * as espree from 'espree';

const src = resolve(import.meta.dirname, '../src');
const files = [...readFileSync(join(src, 'main.js'), 'utf8').matchAll(/^import \* as m\d+ from '\.\/(\S+)';$/gm)].map(m => m[1]);
const edges = [], nExp = {};
for (const f of files) {
  const ast = espree.parse(readFileSync(join(src, f), 'utf8'), { ecmaVersion: 'latest', sourceType: 'module' });
  nExp[f] = ast.body.filter(s => s.type === 'ExportNamedDeclaration').reduce((t, s) => t + (s.declaration?.declarations?.length || (s.declaration ? 1 : s.specifiers.length)), 0);
  for (const s of ast.body.filter(s => s.type === 'ImportDeclaration')) edges.push({ from: f, to: join(dirname(f), s.source.value), names: s.specifiers.map(x => x.local.name) });
}
// 文件级循环依赖（强连通分量，Tarjan）
function sccs() {
  const idx = new Map(), low = new Map(), on = new Set(), st = [], out = []; let n = 0;
  const go = v => { idx.set(v, n); low.set(v, n++); st.push(v); on.add(v);
    for (const w of edges.filter(e => e.from === v).map(e => e.to)) { if (!idx.has(w)) { go(w); low.set(v, Math.min(low.get(v), low.get(w))); } else if (on.has(w)) low.set(v, Math.min(low.get(v), idx.get(w))); }
    if (low.get(v) === idx.get(v)) { const c = []; let w; do { w = st.pop(); on.delete(w); c.push(w); } while (w !== v); if (c.length > 1) out.push(c); } };
  files.forEach(f => idx.has(f) || go(f)); return out;
}
const arg = process.argv[2];
if (arg === '--json') console.log(JSON.stringify({ files, edges }, null, 1));
else if (arg === '--file') for (const e of edges.filter(e => e.from === process.argv[3]).sort((a, b) => b.names.length - a.names.length)) console.log(`${e.to}（${e.names.length}）：${e.names.join(' ')}`);
else {
  console.log('文件 | export | import 几个文件 | 被几个文件 import');
  for (const f of files) console.log(`${f} | ${nExp[f]} | ${edges.filter(e => e.from === f).length} | ${edges.filter(e => e.to === f).length}`);
  const c = sccs();
  console.log(`\n循环依赖：${c.length ? c.map(x => `${x.length} 个文件互相 import`).join('；') : '没有'}（ES module 允许循环；加载时就要用的名字只来自前面的底层文件，见 README）`);
}
