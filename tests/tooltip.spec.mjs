import { test, expect } from '@playwright/test';

test('滚动面板不应把整块内容变成提示，现有说明保持有效', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto('/?demo=board');
  const brief = page.locator('.cright');
  expect(await brief.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
  await brief.hover({ position: { x: 4, y: 4 } });
  await expect(brief).not.toHaveAttribute('title');
  // 覆盖实际页面里所有溢出元素，包括侧栏、日志、弹窗布局；事件走真实页面的委托处理。
  const unexpected = await page.evaluate(() => {
    const failures = [];
    for (const el of document.querySelectorAll('#game *')) {
      const s = getComputedStyle(el);
      if (!el.clientWidth || !el.clientHeight || el.closest('[title], .sq')) continue;
      if (el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1) continue;
      el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      if (el.hasAttribute('title') && s.textOverflow !== 'ellipsis' && !(parseInt(s.webkitLineClamp, 10) > 0)) failures.push(el.className);
      el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    }
    return failures;
  });
  expect(unexpected).toEqual([]);
  await expect(page.locator('#board .nm[title]')).toHaveCount(0);
  const square = page.locator('#board .sq[title]').first();
  const original = await square.getAttribute('title');
  await square.hover();
  await expect(square).toHaveAttribute('title', original);
});

test('只补全显式省略的文字，并清理过期提示', async ({ page }) => {
  await page.goto('/?demo=board');
  await page.evaluate(() => {
    const box = document.createElement('div');
    box.id = 'tip-fixtures';
    box.style.cssText = 'position:fixed;inset:0;z-index:99999;background:white;';
    box.innerHTML = `
      <div id="ellipsis" style="width:90px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">一段需要省略显示的完整文字</div>
      <div id="nested" style="width:90px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis"><b>嵌套加粗而被省略的文字</b></div>
      <div id="clamp" style="width:90px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden">多行文字需要省略，多行文字需要省略，多行文字需要省略，多行文字需要省略</div>
      <div id="short" style="width:90px;overflow:hidden;text-overflow:ellipsis">短文字</div>
      <div id="clipped" style="width:90px;overflow:hidden;white-space:nowrap">只有裁切但没有声明省略的容器文字</div>
      <div id="scroll" style="width:90px;height:20px;overflow:auto">有滚动条的容器，应该滚动查看，不应弹整块内容</div>
      <div id="manual" title="解释含义，不重复文字"><span id="manual-child" style="display:block;width:90px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">已经有补充说明的省略文字</span></div>
      <div id="compound" style="width:90px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis"><button>按钮</button><span>多个操作不能拼接成全文</span></div>`;
    document.body.appendChild(box);
  });
  for (const id of ['ellipsis', 'nested', 'clamp']) {
    const el = page.locator(`#${id}`);
    await el.hover();
    await expect(el).toHaveAttribute('title', await el.innerText());
    await page.mouse.move(600, 500);
    await expect(el).not.toHaveAttribute('title');
  }
  // 命中内层文字时也能找到真正应用省略的父元素。
  await page.locator('#nested b').hover();
  await expect(page.locator('#nested')).toHaveAttribute('title');
  for (const id of ['short', 'clipped', 'scroll', 'manual-child', 'compound']) {
    await page.locator(`#${id}`).hover();
    await expect(page.locator(`#${id}`)).not.toHaveAttribute('title');
  }
  await expect(page.locator('#manual')).toHaveAttribute('title', '解释含义，不重复文字');
  await page.locator('#ellipsis').hover();
  await page.setViewportSize({ width: 1400, height: 900 });
  await expect(page.locator('#ellipsis')).not.toHaveAttribute('title');
  await page.locator('#ellipsis').evaluate(el => { el.style.width = '600px'; });
  await page.mouse.move(600, 500);
  await page.locator('#ellipsis').hover();
  await expect(page.locator('#ellipsis')).not.toHaveAttribute('title');
  await page.locator('#ellipsis').evaluate(el => { el.style.width = '90px'; el.textContent = '修改后的完整文字也要正确补全'; });
  await page.mouse.move(600, 500);
  await page.locator('#ellipsis').hover();
  await expect(page.locator('#ellipsis')).toHaveAttribute('title', '修改后的完整文字也要正确补全');
});

test.describe('触屏', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test('点击产生的兼容鼠标事件不应添加重复全文提示', async ({ page }) => {
    await page.goto('/?demo=board');
    const title = await page.evaluate(() => {
      const el = document.createElement('div');
      el.textContent = '被省略的完整文字不应在触屏点击时重复播报';
      el.style.cssText = 'width:30px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis';
      document.body.appendChild(el);
      el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      return el.getAttribute('title');
    });
    expect(title).toBe(null);
  });
});
