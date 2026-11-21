// 游戏主体的构建。源码 web/src/ 是 ES module（入口 src/main.js）：
// - 开发（npm run dev）：浏览器直接按模块加载，import 写漏了当场报错；
// - 构建（npm run build）：按 main.js 里的顺序把各模块拼回一个普通 <script>，只去掉 import 行和 export 关键字，
//   注释、格式、执行顺序和拆模块以前一样（打包器会把代码整个重新生成、注释全丢，产物没法对照，所以不用它打包）。
// 产物写回 code/index.html；TYCOON_OUT / TYCOON_DIST：写到别处（并行开发、不想动 code/index.html 时）
import { defineConfig } from 'vite';
import { readFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = import.meta.dirname, src = resolve(root, 'src');
const ENTRY = '<script type="module" src="./src/main.js"></script>';
// main.js 里 import * as mN from './x.js' 的顺序就是执行顺序
const order = () => [...readFileSync(resolve(src, 'main.js'), 'utf8').matchAll(/^import \* as m\d+ from '\.\/(\S+)';$/gm)].map(m => m[1]);
function classic(f) {
  const t = readFileSync(resolve(src, f), 'utf8');
  const out = t.replace(/^import \{[^}]*\} from '[^']+';\n/gm, '').replace(/^export (?=(?:const|let|var|function|async function|class) )/gm, '');
  const left = out.match(/^\s*(?:import|export)\b.*$/m);
  if (left) throw new Error(`${f} 里有拼接时去不掉的 import/export：${left[0].slice(0, 80)}`);
  return out;
}
const concat = () => ({
  name: 'concat-classic',
  apply: 'build',
  transformIndexHtml: {
    order: 'pre',
    handler: html => {
      if (!html.includes(ENTRY)) throw new Error('页面里找不到入口：' + ENTRY);
      return html.replace(ENTRY, () => `<script>\n'use strict';\n${order().map(classic).join('')}</script>`);
    },
  },
  closeBundle() {
    copyFileSync(resolve(root, process.env.TYCOON_DIST || 'dist', 'index.html'), process.env.TYCOON_OUT ? resolve(process.env.TYCOON_OUT) : resolve(root, '../code/index.html'));
  },
});

export default defineConfig({
  root, base: './',
  publicDir: resolve(root, '../code'),   // 开发时 code/ 当静态目录，learn/、i18n/ 照常能访问；构建时不复制
  plugins: [concat()],
  build: { outDir: process.env.TYCOON_DIST || 'dist', emptyOutDir: true, copyPublicDir: false, minify: false, modulePreload: false },
});
