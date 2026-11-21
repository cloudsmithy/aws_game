// 按代码重新生成每个模块的 import，并补上 / 去掉 export：挪代码、拆文件以后跑一次，依赖关系不用手改。
//   node web/tools/fix-imports.mjs           改写 src/ 下的文件
//   node web/tools/fix-imports.mjs --dry     只报会改哪些文件
// 规则：
// - 一个模块用到、自己没定义的名字（不在 check-modules.mjs 的浏览器全局里）→ 从定义它的模块 import；
// - 被别的模块 import 的顶层声明 → 前面加 export；没人 import 的 → 去掉 export（__set_ 开头的 setter 例外，保留）；
// - import 语句按 src/main.js 里的加载顺序排（前面的文件先 import），每个来源一行，名字按字母排。
// 名字在两个模块里都有顶层定义时直接报错（拆成模块以前它们在同一个作用域里，不可能重名）。
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, relative, join } from 'node:path';
import * as espree from 'espree';
import { analyze } from 'eslint-scope';
import { GLOBALS } from './check-modules.mjs';

const src = resolve(import.meta.dirname, '../src'), dry = process.argv.includes('--dry');
const order = [...readFileSync(join(src, 'main.js'), 'utf8').matchAll(/^import \* as m\d+ from '\.\/(\S+)';$/gm)].map(m => m[1]);
const IMPORT_LINE = /^import \{[^}]*\} from '[^']+';\n/gm;
const parse = t => { const ast = espree.parse(t, { ecmaVersion: 'latest', sourceType: 'module', range: true }); return { ast, scope: analyze(ast, { ecmaVersion: 2026, sourceType: 'module' }) }; };
const declNames = p => p.type === 'Identifier' ? [p.name] : p.type === 'ObjectPattern' ? p.properties.flatMap(x => declNames(x.value || x.argument)) : p.type === 'ArrayPattern' ? p.elements.filter(Boolean).flatMap(declNames) : p.type === 'AssignmentPattern' ? declNames(p.left) : p.type === 'RestElement' ? declNames(p.argument) : [];
const topNames = st => { const d = st.type === 'ExportNamedDeclaration' ? st.declaration : st; if (!d) return []; return d.type === 'VariableDeclaration' ? d.declarations.flatMap(x => declNames(x.id)) : d.id ? [d.id.name] : []; };

// 1. 去掉旧 import，收集每个文件的顶层定义和用到的外部名字
const body = {}, defs = new Map(), uses = {};
for (const f of order) {
  body[f] = readFileSync(join(src, f), 'utf8').replace(IMPORT_LINE, '');
  const { ast, scope } = parse(body[f]);
  for (const st of ast.body) for (const n of topNames(st)) {
    if (defs.has(n) && defs.get(n) !== f) throw new Error(`${n} 在 ${defs.get(n)} 和 ${f} 里都有顶层定义`);
    defs.set(n, f);
  }
  uses[f] = new Set(scope.globalScope.through.map(r => r.identifier.name).filter(n => !GLOBALS.has(n)));
}
// 2. 算 import、export
const imports = {}, wanted = new Set(), problems = [];
for (const f of order) {
  imports[f] = new Map();
  for (const n of uses[f]) {
    const from = defs.get(n);
    if (!from) { problems.push(`${f} 用了 ${n}，哪个模块都没定义`); continue; }
    if (!imports[f].has(from)) imports[f].set(from, new Set());
    imports[f].get(from).add(n); wanted.add(n);
  }
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
// 3. 改写：顶层声明前的 export 按需加减；文件头写新的 import
let changed = 0;
for (const f of order) {
  const { ast } = parse(body[f]); const edits = [];
  for (const st of ast.body) {
    const names = topNames(st); if (!names.length) continue;
    const want = names.some(n => wanted.has(n) || n.startsWith('__set_')), has = st.type === 'ExportNamedDeclaration';
    if (want && !has) edits.push([st.range[0], st.range[0], 'export ']);
    if (!want && has) edits.push([st.range[0], st.declaration.range[0], '']);
  }
  let t = body[f]; for (const [s, e, x] of edits.sort((a, b) => b[0] - a[0])) t = t.slice(0, s) + x + t.slice(e);
  const rel = to => { const r = relative(dirname(join(src, f)), join(src, to)); return r.startsWith('.') ? r : './' + r; };
  const head = [...imports[f]].sort(([a], [b]) => order.indexOf(a) - order.indexOf(b)).map(([to, ns]) => `import { ${[...ns].sort().join(', ')} } from '${rel(to)}';\n`).join('');
  const out = head + t;
  if (out !== readFileSync(join(src, f), 'utf8')) { changed++; if (dry) console.log('会改：' + f); else writeFileSync(join(src, f), out); }
}
console.log(`${dry ? '（试运行）' : ''}改了 ${changed} 个文件`);
