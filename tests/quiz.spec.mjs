import { test, expect } from '@playwright/test';

// issue #32：答完题的结果和题目在同一页：标题、题干不变，选项还是那几个按钮（不能点），正确的标绿、选的标红，最后「继续」
test('答题结果和题目同一页：同一个标题和题干，选项按钮原地标出对错，点继续返回结果', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { const q = Object.values(QUIZ).flat().find(x => !x.dlc); window.__qq = q; window.__r = undefined; askQuestion(q, 'g:x:0', '第 1 / 20 题', { local: true }).then(r => { window.__r = r; }); });
  const box = page.locator('#modal:not([hidden]) .box.quiz');
  await expect(box).toBeVisible();
  const before = await box.evaluate(b => ({ title: b.querySelector('h3').textContent, q: b.querySelector('.q').textContent, opts: [...b.querySelectorAll('.btns button')].map(x => x.textContent).filter(t => !/不答了/.test(t)) }));
  const right = await page.evaluate(() => window.__qq.o[0]);
  const wrong = before.opts.findIndex(t => t !== right);
  await box.locator('.btns button').nth(wrong).click();
  const done = page.locator('#modal:not([hidden]) .box.qdone');
  await expect(done).toBeVisible();
  const after = await done.evaluate(b => ({ title: b.querySelector('h3').textContent, q: b.querySelector('.q').textContent, opts: [...b.querySelectorAll('.btns button.qopt')].map(x => ({ t: x.textContent, d: x.disabled, c: x.className })), verdict: b.querySelector('.qbox.bad') && b.querySelector('.qbox.bad').textContent }));
  expect(after.title).toBe(before.title);
  expect(after.q).toBe(before.q);
  expect(after.opts.map(o => o.t.replace(/(正确答案|你选的)$/, ''))).toEqual(before.opts);
  expect(after.opts.every(o => o.d)).toBe(true);
  expect(after.opts[wrong].c).toContain('bad');
  expect(after.opts.find(o => o.t.startsWith(right)).c).toContain('ok');
  expect(after.verdict).toContain('答错了');
  await done.locator('.btns button.pri', { hasText: '继续' }).click();
  await expect.poll(() => page.evaluate(() => window.__r)).toBe(false);
});
