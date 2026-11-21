// 压缩 src/data/icons.js 里的服务图标，base64 改成直接写 SVG 文本（data:image/svg+xml,…）。
// SVGO 只去掉 id、注释、空白、多余属性，路径一个点都不动：
// - convertPathData（转相对坐标、合并成弧、删点）逐像素比对 64/68 个图标边缘明显变了；
// - 路径坐标哪怕只舍到 4 位小数，ssm 的细线也会变（单通道差 46）。所以路径数据原样保留。
// 验证：每个图标按 80px、160px 渲染新旧两版逐像素比，没有单通道差超过 32 的（见 README「改游戏主体」）。
//   node web/tools/optimize-icons.mjs          改写 icons.js（已经压过的跳过，重复跑结果不变）
//   node web/tools/optimize-icons.mjs --dry    只算能省多少
// 图标都用在 <img src="…"> 和 3D 贴图里：SVG 里的双引号换成单引号，% # 和非 ASCII 字符转义，放进双引号属性里也安全。
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { optimize } from 'svgo';

const file = resolve(import.meta.dirname, '../src/data/icons.js');
const text = readFileSync(file, 'utf8'), head = text.slice(0, text.indexOf('{'));
const icons = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
const decode = uri => uri.startsWith('data:image/svg+xml;base64,') ? Buffer.from(uri.slice(26), 'base64').toString('utf8')
  : uri.startsWith('data:image/svg+xml,') ? decodeURIComponent(uri.slice(19)) : null;
const encode = svg => 'data:image/svg+xml,' + svg.replace(/"/g, "'").replace(/[%#\u0080-￿]/g, c => encodeURIComponent(c));
const out = {}; let before = 0, after = 0, skipped = 0;
for (const [k, uri] of Object.entries(icons)) {
  const svg = decode(uri);
  if (svg == null) { out[k] = uri; skipped++; continue; }   // 不是 SVG（位图）：原样留着
  const min = optimize(svg, { multipass: true, plugins: [{ name: 'preset-default', params: { overrides: { convertPathData: false } } }] }).data;
  out[k] = encode(min); before += uri.length; after += out[k].length;
}
console.log(`图标 ${Object.keys(icons).length} 个（${skipped} 个不是 SVG，没动）：${before} → ${after} 字符，省 ${Math.round((1 - after / before) * 100)}%`);
if (!process.argv.includes('--dry')) writeFileSync(file, head + JSON.stringify(out) + ';\n');
