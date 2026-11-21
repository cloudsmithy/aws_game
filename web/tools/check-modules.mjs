// 模块检查（CI 跑）：web/src/ 下每个模块用到的名字，要么自己定义、要么 import 进来，要么是下面列出的浏览器 / 页面全局。
//   node web/tools/check-modules.mjs
// 漏写 import 时开发版（原生 ES module）会当场 ReferenceError，构建出来的单文件却照常能跑（拼成一个脚本后名字都在），
// 这里提前查出来。还查：import 的名字对方真的 export 了；没有 import 进来却从来不用的名字。
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import * as espree from 'espree';
import { analyze } from 'eslint-scope';

const src = resolve(import.meta.dirname, '../src');
// 允许直接用的全局：JS 内置、浏览器 API；GameTheme 是骨架里外观脚本挂的，Peer 是页面末尾内联的 PeerJS，THREE 是内联的 Three.js
export const GLOBALS = new Set(`Array AudioContext Blob Boolean CSS Date Element Error Event Float32Array Image Infinity IntersectionObserver Intl JSON KeyboardEvent
  Map Math NaN Node NodeFilter Number Object Promise RTCPeerConnection RegExp ResizeObserver Set String TextEncoder URL URLSearchParams Uint8Array Worker
  addEventListener clearInterval clearTimeout console crypto devicePixelRatio document encodeURIComponent fetch getComputedStyle history innerHeight innerWidth
  isFinite localStorage location matchMedia navigator parseFloat parseInt performance removeEventListener requestAnimationFrame requestIdleCallback scrollBy
  scrollTo scrollY sessionStorage setInterval setTimeout undefined window GameTheme Peer THREE`.split(/\s+/).filter(Boolean));

if (import.meta.url === `file://${process.argv[1]}`) main();
function main() {
const files = readdirSync(src, { recursive: true }).filter(f => f.endsWith('.js')).sort();
const parsed = Object.fromEntries(files.map(f => {
  const ast = espree.parse(readFileSync(join(src, f), 'utf8'), { ecmaVersion: 'latest', sourceType: 'module', range: true, loc: true });
  return [f, { ast, scope: analyze(ast, { ecmaVersion: 2026, sourceType: 'module' }) }];
}));
const exportsOf = f => new Set(parsed[f].ast.body.flatMap(s => s.type !== 'ExportNamedDeclaration' ? [] : s.declaration
  ? (s.declaration.declarations ? s.declaration.declarations.map(d => d.id.name) : [s.declaration.id.name]) : s.specifiers.map(x => x.exported.name)));
const problems = [];
for (const f of files) {
  const { ast, scope } = parsed[f];
  for (const r of scope.globalScope.through) if (!GLOBALS.has(r.identifier.name)) problems.push(`${f}:${r.identifier.loc.start.line} 用了 ${r.identifier.name}，没有 import（也不是允许的全局）`);
  for (const s of ast.body.filter(s => s.type === 'ImportDeclaration')) {
    const to = join(dirname(f), s.source.value), ex = parsed[to] ? exportsOf(to) : null;
    if (!ex) { problems.push(`${f} import 的文件不存在：${s.source.value}`); continue; }
    for (const sp of s.specifiers) {
      if (sp.type === 'ImportSpecifier' && !ex.has(sp.imported.name)) problems.push(`${f} 从 ${s.source.value} import 了 ${sp.imported.name}，对方没有 export`);
      const v = scope.globalScope.childScopes[0]?.set.get(sp.local.name) || scope.acquire(ast)?.set.get(sp.local.name);
      if (sp.type === 'ImportSpecifier' && v && !v.references.length) problems.push(`${f} import 了 ${sp.local.name} 却没用`);
    }
  }
}
console.log(problems.length ? problems.join('\n') : `模块检查通过：${files.length} 个文件`);
process.exitCode = problems.length ? 1 : 0;
}
