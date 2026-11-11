// 提醒而不阻断：与本次 PR / push 基线比较，未提供基线时只输出当前值。
import { readFileSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { chromium } from '@playwright/test';

const root = new URL('../', import.meta.url);
const current = readFileSync(new URL('code/index.html', root), 'utf8');
const ref = process.env.SIZE_BASE_REF || process.argv[2];
const warn = text => console.log(process.env.GITHUB_ACTIONS ? `::warning title=体积提醒::${text}` : `WARNING: ${text}`);
let baseline;
if (ref && !/^0+$/.test(ref)) {
  try { baseline = execFileSync('git', ['show', `${ref}:code/index.html`], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }); }
  catch { warn(`无法读取基线 ${ref}，本次只报告当前体积。`); }
} else warn('未指定 SIZE_BASE_REF，本次只报告当前体积。');

// 使用相同随机种子、语言和时钟，测量实际生成的四人中盘与终局 JSON；不访问外网。
async function saveSizes(browser, html) {
  const context = await browser.newContext();
  try {
    await context.route('**/*', route => route.request().isNavigationRequest()
      ? route.fulfill({ contentType: 'text/html', body: html }) : route.abort());
    await context.addInitScript(() => {
      let seed = 42; Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
      Date.now = () => 1700000000000;
      localStorage.clear(); localStorage.setItem('aws-tycoon-lang', 'zh');
    });
    const page = await context.newPage(), sizes = {};
    for (const demo of ['board', 'report']) {
      await page.goto(`http://127.0.0.1:18884/?demo=${demo}`);
      await page.waitForFunction(() => typeof S !== 'undefined' && S?.players?.length === 4);
      sizes[`save-${demo}`] = await page.evaluate(() => new TextEncoder().encode(JSON.stringify(S)).length);
    }
    return sizes;
  } finally { await context.close(); }
}

const sizes = html => ({ html: Buffer.byteLength(html), gzip: gzipSync(html).length });
const before = baseline ? sizes(baseline) : {}, after = sizes(current);
let browser;
try {
  browser = await chromium.launch();
  if (baseline) Object.assign(before, await saveSizes(browser, baseline));
  Object.assign(after, await saveSizes(browser, current));
} catch (error) { warn(`代表性存档未测量：${String(error.message).split('\n')[0]}`); }
finally { if (browser) await browser.close(); }

const rows = ['| 指标 | 基线 bytes | 当前 bytes | 增长 |', '|---|---:|---:|---:|'];
for (const [key, value] of Object.entries(after)) {
  const base = before[key], delta = value - base, ratio = base ? delta / base : 0;
  // 5% 且达到最小增量才提醒，避免微小变化；无论是否告警均输出所有指标。
  const floor = key.startsWith('save-') ? 2048 : key === 'gzip' ? 20 * 1024 : 50 * 1024;
  if (base && ratio > 0.05 && delta > floor) warn(`${key} 增长 ${(ratio * 100).toFixed(1)}%（+${delta} bytes），请核对是否必要。`);
  rows.push(`| ${key} | ${base ?? '未测量'} | ${value} | ${base ? `${delta >= 0 ? '+' : ''}${delta} / ${(ratio * 100).toFixed(2)}%` : '—'} |`);
}
const report = rows.join('\n');
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n### 体积检查（仅提醒）\n\n${report}\n`);
