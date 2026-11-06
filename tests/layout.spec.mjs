import { test, expect } from '@playwright/test';

const sizes = [
  [1920, 1080], [1440, 900], [1366, 768], [1366, 600], [1280, 600],
  [1201, 600], [1200, 800], [1024, 768], [901, 600], [900, 600],
  [1440, 500], [1201, 500], [844, 390], [390, 844], [320, 568]
];

for (const [width, height] of sizes) {
  test(`棋盘和操作可达 ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?demo=board');
    await expect(page.locator('#board .sq')).toHaveCount(48);

    const layout = await page.evaluate(() => {
      const main = document.querySelector('.cmain');
      const style = getComputedStyle(main);
      return {
        pageOverflow: document.documentElement.scrollWidth - innerWidth,
        mainClips: style.display !== 'contents' && ['hidden', 'clip'].includes(style.overflowY)
          && main.scrollHeight > main.clientHeight + 1,
        cellsOutside: [...document.querySelectorAll('#board .sq')].filter(cell => {
          const rect = cell.getBoundingClientRect();
          return rect.left < -1 || rect.right > innerWidth + 1;
        }).map(cell => cell.id)
      };
    });
    expect(layout.pageOverflow, '页面不应横向溢出').toBeLessThanOrEqual(1);
    expect(layout.mainClips, '中央内容应完整显示或提供滚动，不能裁切').toBe(false);
    expect(layout.cellsOutside, '棋盘格不应超出左右边界').toEqual([]);

    // 检查真实按钮而不只看 document 宽度：overflow:hidden 可能把错误藏起来。
    const buttons = page.locator('#board button');
    for (const button of await buttons.all()) {
      if (!await button.isVisible()) continue;
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeInViewport({ ratio: 0.95 });
      if (await button.isEnabled()) await button.click({ trial: true });
    }
    expect(errors).toEqual([]);
  });
}
