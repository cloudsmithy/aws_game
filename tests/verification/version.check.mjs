import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { readVersion, validateVersion, check, stamp } from '../version.mjs';

const version = (major = 1, round = 16, commits = 133) => ({ major, round, commits });
test('三段各自不倒退；换轮和升主版本不清零累计提交数', () => {
  const base = version();
  validateVersion(version(1, 16, 134), base, true);
  validateVersion(version(1, 17, 140), base, true);
  validateVersion(version(2, 17, 140), base, true);
  validateVersion(base, base, false);
  for (const current of [version(1, 17, 1), version(2, 1, 134), version(1, 15, 134)]) {
    assert.throws(() => validateVersion(current, base, true), /倒退或清零/);
  }
  assert.throws(() => validateVersion(base, base, true), /未增加/);
});
test('不执行网页代码，拒绝坏格式', () => {
  for (const value of ['0', '-1', '1.2', 'NaN', '1+2', '9007199254740992']) {
    assert.throws(() => readVersion(`let GAME_VERSION = { major: ${value}, round: 16, commits: 133 };`), /正整数/);
  }
  assert.throws(() => readVersion(''), /缺少/);
});
test('真实 Git 仓库：盖章、累计数、漏更新、构建来源和轮次', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'aws-version-'));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  const file = join(cwd, 'code/index.html');
  const commit = message => { git('add', '.'); git('commit', '-qm', message); };
  try {
    git('init', '-q'); git('config', 'user.name', 'test'); git('config', 'user.email', 'test@example.com');
    mkdirSync(join(cwd, 'code')); mkdirSync(join(cwd, 'docs'));
    writeFileSync(join(cwd, 'docs/更新说明.html'), '<section id="r16">');
    writeFileSync(file, "let GAME_VERSION = { major: 1, round: 16, commits: 1, build: 'abcdef0', time: '2026-11-13 10:00' };\n<p>游戏</p>\n");
    commit('content'); stamp(cwd); commit('stamp');
    const base = git('rev-parse', 'HEAD');
    check(cwd, base);
    writeFileSync(file, readFileSync(file, 'utf8').replace('游戏', '新游戏'));
    assert.throws(() => stamp(cwd), /先提交/);
    assert.throws(() => check(cwd, base), /未覆盖/);
    commit('new content');
    assert.throws(() => check(cwd, base), /未覆盖/);
    stamp(cwd); commit('new stamp'); check(cwd, base);
    const good = readFileSync(file, 'utf8');
    writeFileSync(file, good.replace(/commits: \d+/, 'commits: 999'));
    assert.throws(() => check(cwd, base), /累计提交数/);
    writeFileSync(file, good);
    writeFileSync(join(cwd, 'code/extra.html'), '新页面');
    assert.throws(() => check(cwd, base), /未覆盖/);
    commit('new page');
    assert.throws(() => check(cwd, base), /未覆盖/);
    stamp(cwd); commit('page stamp'); check(cwd, base);
    writeFileSync(join(cwd, 'docs/更新说明.html'), '<section id="r17">');
    assert.throws(() => check(cwd, base), /最新轮次/);
    writeFileSync(join(cwd, 'docs/更新说明.html'), '<section id="r16">');
    assert.throws(() => check(cwd, 'missing-ref'));
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});
