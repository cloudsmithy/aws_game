// 按文件内用例轮流分片，避免慢的联机 spec 全落在同一台机器；不修改测试内容。
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('.', import.meta.url));
const cli = fileURLToPath(new URL('node_modules/playwright/cli.js', import.meta.url));
const [index, total] = (process.argv[2] || '').split('/').map(Number);
if (!Number.isInteger(index) || !Number.isInteger(total) || index < 1 || index > total) {
  throw new Error('用法：npm run test:ci -- 1/3 [--list]');
}
const report = JSON.parse(execFileSync(process.execPath, [cli, 'test', '--list', '--reporter=json'], {
  cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024
}));
if (report.errors?.length) throw new Error(JSON.stringify(report.errors));
const selected = [], seen = new Set();
let count = 0;
function walk(suite, parents) {
  for (const spec of suite.specs || []) {
    for (const test of spec.tests) {
      const entry = [test.projectName ? `[${test.projectName}]` : null, spec.file, ...parents, spec.title]
        .filter(Boolean).join(' › ');
      if (seen.has(entry)) throw new Error(`重复测试名：${entry}`);
      seen.add(entry);
      if (count++ % total === index - 1) selected.push(entry);
    }
  }
  for (const child of suite.suites || []) walk(child, [...parents, child.title]);
}
for (const file of report.suites) walk(file, []);
if (!selected.length) throw new Error('分片没有测试，请检查分片数量');
console.log(`分片 ${index}/${total}：${selected.length}/${count} 项测试`);
const temp = mkdtempSync(join(tmpdir(), 'aws-game-ci-shard-'));
try {
  const list = join(temp, 'tests.txt');
  writeFileSync(list, selected.join('\n'));
  const result = spawnSync(process.execPath, [cli, 'test', '--test-list', list, '--workers=1', ...process.argv.slice(3)], {
    cwd, stdio: 'inherit'
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(temp, { recursive: true, force: true });
}
