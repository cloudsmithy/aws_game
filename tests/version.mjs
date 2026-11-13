// 三段版本沿用 v<主版本>.<更新轮次>.<仓库累计提交数>；不执行网页脚本。
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const declaration = /^let GAME_VERSION = .*$/m;
export function readVersion(html) {
  const line = html.match(declaration)?.[0];
  if (!line) throw new Error('缺少 GAME_VERSION');
  const value = {};
  for (const field of ['major', 'round', 'commits']) {
    const token = line.match(new RegExp(`\\b${field}:\\s*([^,}]+)`))?.[1].trim();
    if (!/^[1-9]\d*$/.test(token || '') || !Number.isSafeInteger(Number(token))) {
      throw new Error(`${field} 必须为正整数`);
    }
    value[field] = Number(token);
  }
  value.build = line.match(/\bbuild:\s*'([0-9a-f]{7,40})'/)?.[1];
  value.time = line.match(/\btime:\s*'(\d{4}-\d{2}-\d{2} \d{2}:\d{2})'/)?.[1];
  if (!value.build || !value.time) throw new Error('build 或 time 格式不正确');
  return value;
}
export const withoutVersion = html => html.replace(declaration, 'GAME_VERSION');
export function validateVersion(current, base, changed) {
  // 更新轮次和累计提交数均为累计值；升主版本或换轮也不能清零。
  for (const key of ['major', 'round', 'commits']) {
    if (current[key] < base[key]) throw new Error(`${key} 不得倒退或清零`);
  }
  if (changed && current.commits <= base.commits) {
    throw new Error('网页有改动但累计提交数未增加；提交内容后运行 npm run version:stamp');
  }
}
function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trimEnd();
}
export function check(cwd, baseRef) {
  const html = readFileSync(resolve(cwd, 'code/index.html'), 'utf8');
  const current = readVersion(html);
  const log = readFileSync(resolve(cwd, 'docs/更新说明.html'), 'utf8');
  const rounds = [...log.matchAll(/<section\s+id="r(\d+)"/g)].map(match => Number(match[1]));
  if (!rounds.length || current.round !== Math.max(...rounds)) {
    throw new Error('round 必须与更新说明最新轮次一致');
  }
  const source = git(cwd, 'rev-parse', '--verify', `${current.build}^{commit}`);
  git(cwd, 'merge-base', '--is-ancestor', source, 'HEAD');
  if (Number(git(cwd, 'rev-list', '--count', source)) !== current.commits) {
    throw new Error('commits 必须等于 build 对应提交的仓库累计提交数');
  }
  // 构建号可指向盖章前的内容提交，避免将提交自己的 SHA 写进自身。
  const oldHtml = git(cwd, 'show', `${source}:code/index.html`);
  const otherChanges = git(cwd, 'diff', source, '--', 'code', ':(exclude)code/index.html');
  const untracked = git(cwd, 'ls-files', '--others', '--exclude-standard', '--', 'code');
  if (withoutVersion(oldHtml).trimEnd() !== withoutVersion(html).trimEnd() || otherChanges || untracked) {
    throw new Error('构建号未覆盖当前网页内容；提交内容后运行 npm run version:stamp');
  }
  if (baseRef) {
    const base = readVersion(git(cwd, 'show', `${baseRef}:code/index.html`));
    const changed = Boolean(git(cwd, 'diff', baseRef, '--', 'code', ':(exclude)code/index.html')) ||
      withoutVersion(git(cwd, 'show', `${baseRef}:code/index.html`)).trimEnd() !== withoutVersion(html).trimEnd();
    validateVersion(current, base, changed);
  }
  console.log(`版本检查通过：v${current.major}.${current.round}.${current.commits} (${current.build})`);
}
export function stamp(cwd) {
  if (git(cwd, 'status', '--porcelain', '--', 'code')) {
    throw new Error('请先提交 code/ 的内容，再盖章；盖章后另行提交版本元数据');
  }
  const file = resolve(cwd, 'code/index.html');
  const html = readFileSync(file, 'utf8');
  readVersion(html);
  const build = git(cwd, 'rev-parse', '--short=7', 'HEAD');
  const count = git(cwd, 'rev-list', '--count', 'HEAD');
  // 使用内容提交时间（UTC），同一提交重复盖章结果不变。
  const time = new Date(Number(git(cwd, 'show', '-s', '--format=%ct', 'HEAD')) * 1000)
    .toISOString().slice(0, 16).replace('T', ' ');
  const next = html.replace(declaration, line => line
    .replace(/\bcommits:\s*\d+/, `commits: ${count}`)
    .replace(/\bbuild:\s*'[^']*'/, `build: '${build}'`)
    .replace(/\btime:\s*'[^']*'/, `time: '${time}'`));
  writeFileSync(file, next);
  console.log(`已填写累计提交数 ${count}、构建号 ${build}、提交时间 ${time} UTC`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] === 'stamp') stamp(root);
    else {
      let base = process.env.VERSION_BASE_REF || process.argv[2];
      if (!base) {
        for (const ref of ['upstream/master', 'origin/master']) {
          try { base = git(root, 'merge-base', 'HEAD', ref); break; } catch { /* 尝试另一个远端 */ }
        }
        if (!base) throw new Error('缺少比较基线；请传入 VERSION_BASE_REF 或 git ref');
      }
      check(root, base);
    }
  } catch (error) {
    console.error(`版本检查失败：${error.message}`);
    process.exitCode = 1;
  }
}
